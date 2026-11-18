import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildCorsHeaders,
  enforceRateLimit,
  getAdminClient,
  hashIp,
  isOriginAllowed,
  jsonResponse,
  logSecurityEvent,
  resolveActor
} from '../_shared/security.ts';

const BLOCKED_NICK_PATTERNS = [
  /p[u\*]t[ao]/i, /c[a@]r[a@]lh/i, /f[o0]d[ae]/i, /p[o0]rr[a@]/i,
  /b[u\*]c[e3]t/i, /m[e3]rd[a@]/i, /v[i1][a@]d[o0]/i, /f[u\*]ck/i,
  /sh[i1]t/i, /b[i1]tch/i, /n[i1]gg/i, /r[a@]p[e3]/i,
  /p[e3]nd[e3]j[o0]/i, /c[a@]br[o0]n/i, /gilipoll/i
];

const NICK_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isValidNickname(nick: string): { ok: boolean; error?: string } {
  const trimmed = nick.trim();
  if (trimmed.length < 3 || trimmed.length > 16) {
    return { ok: false, error: 'Apelido deve ter entre 3 e 16 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { ok: false, error: 'Apelido pode conter apenas letras, números, "_" e "-".' };
  }
  if (BLOCKED_NICK_PATTERNS.some((rx) => rx.test(trimmed))) {
    return { ok: false, error: 'Escolha um apelido apropriado.' };
  }
  return { ok: true };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 160;
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

function getAnonClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function resolveEmailFromIdentifier(admin: ReturnType<typeof getAdminClient>, identifier: string): Promise<string | null> {
  const clean = identifier.trim();
  if (!clean) return null;
  if (clean.includes('@')) {
    return isValidEmail(clean) ? clean.toLowerCase() : null;
  }
  const { data: profile } = await admin
    .from('player_profiles')
    .select('id')
    .eq('nickname_lower', clean.toLowerCase())
    .maybeSingle();
  if (!profile?.id) return null;
  const { data: userRes } = await admin.auth.admin.getUserById(profile.id);
  return userRes?.user?.email || null;
}

Deno.serve(async (req: Request) => {
  const originCheck = isOriginAllowed(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: originCheck.ok ? 204 : 403, headers: buildCorsHeaders(originCheck.origin) });
  }
  if (!originCheck.ok) {
    return jsonResponse({ ok: false, error: 'Origem não autorizada.' }, 403, originCheck.origin);
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Método não permitido.' }, 405, originCheck.origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Corpo JSON inválido.' }, 400, originCheck.origin);
  }

  const action = String(body.action || 'login');
  const admin = getAdminClient();
  const ipHash = await hashIp(req);

  if (action === 'register') {
    const rl = await enforceRateLimit(admin, 'nick-register', `ip:${ipHash}`, 6, 300);
    if (!rl.allowed) {
      return jsonResponse({ ok: false, error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429, originCheck.origin);
    }

    const nickname = String(body.nickname || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const isMinorConsent = !!body.isMinorConsent;

    const nickCheck = isValidNickname(nickname);
    if (!nickCheck.ok) {
      return jsonResponse({ ok: false, error: nickCheck.error }, 400, originCheck.origin);
    }
    if (!isValidEmail(email)) {
      return jsonResponse({ ok: false, error: 'Informe um e-mail válido.' }, 400, originCheck.origin);
    }
    if (!isStrongPassword(password)) {
      return jsonResponse({ ok: false, error: 'Senha fraca: use pelo menos 8 caracteres com letras e números.' }, 400, originCheck.origin);
    }

    const { data: existingNick } = await admin
      .from('player_profiles')
      .select('id')
      .eq('nickname_lower', nickname.toLowerCase())
      .maybeSingle();
    if (existingNick) {
      return jsonResponse({ ok: false, error: 'Este apelido já está em uso. Escolha outro.' }, 409, originCheck.origin);
    }

    const anon = getAnonClient();
    const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
      email,
      password,
      options: {
        data: { nickname }
      }
    });

    if (signUpErr) {
      // Mensagem genérica quando e-mail já existe ou falha de cadastro (evita enumeração detalhada)
      return jsonResponse({
        ok: false,
        error: 'Não foi possível concluir o cadastro com esses dados. Verifique e tente novamente.'
      }, 400, originCheck.origin);
    }

    const userId = signUpData?.user?.id;
    if (userId) {
      await admin.from('player_profiles').upsert({
        id: userId,
        nickname,
        nickname_lower: nickname.toLowerCase(),
        is_minor_consent: isMinorConsent
      });
    }

    await logSecurityEvent(admin, {
      actorKey: userId ? `uid:${userId}` : `ip:${ipHash}`,
      authUid: userId || null,
      eventType: 'account_registered',
      severity: 'info',
      ipHash,
      origin: originCheck.origin
    });

    return jsonResponse({
      ok: true,
      needsEmailConfirmation: !signUpData?.session,
      session: signUpData?.session || null,
      user: signUpData?.user ? { id: signUpData.user.id } : null,
      message: signUpData?.session
        ? 'Conta criada e conectada com sucesso!'
        : 'Conta criada! Verifique seu e-mail para confirmar o cadastro.'
    }, 200, originCheck.origin);
  }

  if (action === 'login') {
    const rl = await enforceRateLimit(admin, 'nick-login', `ip:${ipHash}`, 12, 60);
    if (!rl.allowed) {
      return jsonResponse({ ok: false, error: 'Muitas tentativas de login. Aguarde 1 minuto.' }, 429, originCheck.origin);
    }

    const identifier = String(body.identifier || '').trim();
    const password = String(body.password || '');
    if (!identifier || !password) {
      return jsonResponse({ ok: false, error: 'Informe apelido/e-mail e senha.' }, 400, originCheck.origin);
    }

    const email = await resolveEmailFromIdentifier(admin, identifier);
    if (!email) {
      await logSecurityEvent(admin, {
        actorKey: `ip:${ipHash}`,
        authUid: null,
        eventType: 'login_failed',
        severity: 'warn',
        ipHash,
        origin: originCheck.origin
      });
      return jsonResponse({
        ok: false,
        error: 'Credenciais inválidas ou e-mail ainda não confirmado.'
      }, 401, originCheck.origin);
    }

    const anon = getAnonClient();
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      await logSecurityEvent(admin, {
        actorKey: `ip:${ipHash}`,
        authUid: null,
        eventType: 'login_failed',
        severity: 'warn',
        ipHash,
        origin: originCheck.origin
      });
      return jsonResponse({
        ok: false,
        error: 'Credenciais inválidas ou e-mail ainda não confirmado.'
      }, 401, originCheck.origin);
    }

    // Garante que player_profiles exista mesmo para contas antigas/OAuth
    const { data: existingProfile } = await admin
      .from('player_profiles')
      .select('nickname')
      .eq('id', data.user.id)
      .maybeSingle();

    return jsonResponse({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      },
      nickname: existingProfile?.nickname || data.user.user_metadata?.nickname || 'Dino'
    }, 200, originCheck.origin);
  }

  if (action === 'recover_password') {
    const rl = await enforceRateLimit(admin, 'nick-recover', `ip:${ipHash}`, 5, 300);
    if (!rl.allowed) {
      return jsonResponse({ ok: false, error: 'Aguarde alguns minutos antes de solicitar novamente.' }, 429, originCheck.origin);
    }

    const identifier = String(body.identifier || '').trim();
    const email = await resolveEmailFromIdentifier(admin, identifier);
    if (email) {
      const anon = getAnonClient();
      const redirectTo = typeof body.redirectTo === 'string' && body.redirectTo.startsWith('http')
        ? body.redirectTo
        : undefined;
      await anon.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined).catch(() => {});
    }

    // Resposta sempre genérica para impedir enumeração de usuários
    return jsonResponse({
      ok: true,
      message: 'Se a conta existir, enviaremos instruções de recuperação para o e-mail cadastrado.'
    }, 200, originCheck.origin);
  }

  if (action === 'change_nickname') {
    const actor = await resolveActor(req, admin);
    if (!actor.ok || !actor.authUid) {
      return jsonResponse({ ok: false, error: 'Faça login para alterar o apelido.' }, 401, originCheck.origin);
    }
    const nickname = String(body.nickname || '').trim();
    const nickCheck = isValidNickname(nickname);
    if (!nickCheck.ok) {
      return jsonResponse({ ok: false, error: nickCheck.error }, 400, originCheck.origin);
    }

    const { data: current } = await admin
      .from('player_profiles')
      .select('nickname_changed_at')
      .eq('id', actor.authUid)
      .maybeSingle();

    if (current?.nickname_changed_at) {
      const elapsed = Date.now() - new Date(current.nickname_changed_at).getTime();
      if (elapsed < NICK_COOLDOWN_MS) {
        const daysLeft = Math.ceil((NICK_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
        return jsonResponse({
          ok: false,
          error: `Você poderá alterar seu apelido novamente em ${daysLeft} dia(s).`
        }, 429, originCheck.origin);
      }
    }

    const { data: clash } = await admin
      .from('player_profiles')
      .select('id')
      .eq('nickname_lower', nickname.toLowerCase())
      .neq('id', actor.authUid)
      .maybeSingle();
    if (clash) {
      return jsonResponse({ ok: false, error: 'Este apelido já está em uso.' }, 409, originCheck.origin);
    }

    const { error } = await admin
      .from('player_profiles')
      .upsert({
        id: actor.authUid,
        nickname,
        nickname_lower: nickname.toLowerCase(),
        nickname_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    if (error) {
      return jsonResponse({ ok: false, error: 'Não foi possível atualizar o apelido.' }, 500, originCheck.origin);
    }
    return jsonResponse({ ok: true, nickname }, 200, originCheck.origin);
  }

  if (action === 'delete_account') {
    const actor = await resolveActor(req, admin);
    if (!actor.ok || !actor.authUid) {
      return jsonResponse({ ok: false, error: 'Sessão autenticada necessária para excluir a conta.' }, 401, originCheck.origin);
    }
    await admin.from('player_cloud_saves').delete().eq('user_id', actor.authUid);
    await admin.from('player_achievements').delete().eq('user_id', actor.authUid);
    await admin.from('player_profiles').delete().eq('id', actor.authUid);
    await admin.from('dino_leaderboard').delete().eq('user_id', actor.authUid);
    const { error: delErr } = await admin.auth.admin.deleteUser(actor.authUid);
    if (delErr) {
      return jsonResponse({ ok: false, error: 'Dados limpos, mas não foi possível remover a identidade Auth.' }, 500, originCheck.origin);
    }
    await logSecurityEvent(admin, {
      actorKey: 'lgpd:account_deleted',
      authUid: null,
      eventType: 'account_deleted_lgpd',
      severity: 'info',
      ipHash,
      origin: originCheck.origin
    });
    return jsonResponse({ ok: true }, 200, originCheck.origin);
  }

  return jsonResponse({ ok: false, error: 'Ação desconhecida.' }, 400, originCheck.origin);
});
