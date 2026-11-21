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

const RESERVED_NICK_WORDS = new Set([
  'admin', 'administrator', 'root', 'moderator', 'mod', 'system',
  'null', 'undefined', 'select', 'union', 'drop', 'insert',
  'delete', 'script', 'alert', 'eval', 'staff', 'support',
  'owner', 'superuser', 'dinodash', 'guest', 'convidado'
]);

const MALICIOUS_PAYLOAD_PATTERNS = [
  /['";<>`]/,
  /--/,
  /\/\*/,
  /\*\//,
  /\bunion\s+select\b/i,
  /\bor\s+1\s*=\s*1\b/i,
  /\band\s+1\s*=\s*1\b/i,
  /\bdrop\s+table\b/i,
  /\binsert\s+into\b/i,
  /\bdelete\s+from\b/i,
  /javascript:/i,
  /\bon(error|load|click|mouseover)\s*=/i,
  /<\s*script/i
];

const NICK_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const DEVICE_ID_REGEX = /^[a-zA-Z0-9_-]{12,128}$/;
const GENERIC_LOGIN_ERROR = 'Apelido ou senha inválidos.';

function hasMaliciousPayload(raw: string): boolean {
  if (!raw) return false;
  return MALICIOUS_PAYLOAD_PATTERNS.some((rx) => rx.test(raw));
}

function isValidNickname(nick: string): { ok: boolean; error?: string; malicious?: boolean } {
  const trimmed = nick.trim();
  if (hasMaliciousPayload(trimmed)) {
    return { ok: false, error: 'Apelido contém caracteres ou termos não permitidos.', malicious: true };
  }
  if (trimmed.length < 3 || trimmed.length > 16) {
    return { ok: false, error: 'Apelido deve ter entre 3 e 16 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { ok: false, error: 'Apelido pode conter apenas letras, números, "_" e "-".' };
  }
  const lower = trimmed.toLowerCase();
  if (RESERVED_NICK_WORDS.has(lower)) {
    return { ok: false, error: 'Este apelido é reservado pelo sistema. Escolha outro.' };
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

async function computeDeviceHash(deviceId: string): Promise<string> {
  const secret = Deno.env.get('DINO_RUN_HMAC_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const data = new TextEncoder().encode(`dino-dev:${deviceId}:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
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

  if (action === 'check_nick') {
    const rl = await enforceRateLimit(admin, 'nick-check', `ip:${ipHash}`, 30, 60);
    if (!rl.allowed) {
      return jsonResponse({ ok: false, error: 'Muitas verificações. Aguarde um instante.' }, 429, originCheck.origin);
    }

    const nickname = String(body.nickname || '').trim();
    const nickCheck = isValidNickname(nickname);
    if (!nickCheck.ok) {
      if (nickCheck.malicious) {
        await logSecurityEvent(admin, {
          actorKey: `ip:${ipHash}`,
          authUid: null,
          eventType: 'auth_malicious_payload',
          severity: 'high',
          details: { action: 'check_nick', sample: nickname.slice(0, 48) },
          ipHash,
          origin: originCheck.origin
        });
      }
      return jsonResponse({
        ok: true,
        valid: false,
        available: false,
        error: nickCheck.error
      }, 200, originCheck.origin);
    }

    const { data: existingNick } = await admin
      .from('player_profiles')
      .select('id')
      .eq('nickname_lower', nickname.toLowerCase())
      .maybeSingle();

    return jsonResponse({
      ok: true,
      valid: true,
      available: !existingNick,
      message: existingNick ? 'Este apelido já está em uso.' : 'Apelido disponível!'
    }, 200, originCheck.origin);
  }

  if (action === 'register') {
    const burstRl = await enforceRateLimit(admin, 'nick-register-burst', `ip:${ipHash}`, 5, 300);
    if (!burstRl.allowed) {
      return jsonResponse({ ok: false, error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429, originCheck.origin);
    }

    const nickname = String(body.nickname || '').trim();
    const rawEmail = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const deviceId = String(body.deviceId || '').trim();
    const isMinorConsent = !!body.isMinorConsent;

    const nickCheck = isValidNickname(nickname);
    if (!nickCheck.ok) {
      if (nickCheck.malicious) {
        await logSecurityEvent(admin, {
          actorKey: `ip:${ipHash}`,
          authUid: null,
          eventType: 'auth_malicious_payload',
          severity: 'high',
          details: { action: 'register', field: 'nickname', sample: nickname.slice(0, 48) },
          ipHash,
          origin: originCheck.origin
        });
      }
      return jsonResponse({ ok: false, error: nickCheck.error }, 400, originCheck.origin);
    }

    if (rawEmail) {
      if (hasMaliciousPayload(rawEmail)) {
        await logSecurityEvent(admin, {
          actorKey: `ip:${ipHash}`,
          authUid: null,
          eventType: 'auth_malicious_payload',
          severity: 'high',
          details: { action: 'register', field: 'email' },
          ipHash,
          origin: originCheck.origin
        });
        return jsonResponse({ ok: false, error: 'Informe um e-mail válido.' }, 400, originCheck.origin);
      }
      if (!isValidEmail(rawEmail)) {
        return jsonResponse({ ok: false, error: 'Informe um e-mail válido.' }, 400, originCheck.origin);
      }
    }

    if (!isStrongPassword(password)) {
      return jsonResponse({ ok: false, error: 'Senha fraca: use pelo menos 8 caracteres com letras e números.' }, 400, originCheck.origin);
    }

    if (!DEVICE_ID_REGEX.test(deviceId)) {
      if (hasMaliciousPayload(deviceId)) {
        await logSecurityEvent(admin, {
          actorKey: `ip:${ipHash}`,
          authUid: null,
          eventType: 'auth_malicious_payload',
          severity: 'high',
          details: { action: 'register', field: 'deviceId' },
          ipHash,
          origin: originCheck.origin
        });
      }
      return jsonResponse({ ok: false, error: 'Identificador de dispositivo inválido. Recarregue a página e tente novamente.' }, 400, originCheck.origin);
    }

    const deviceHash = await computeDeviceHash(deviceId);

    // 1 conta por PC/navegador: consulta device_account_registry
    const { data: existingDevice } = await admin
      .from('device_account_registry')
      .select('device_hash')
      .eq('device_hash', deviceHash)
      .maybeSingle();

    if (existingDevice) {
      await logSecurityEvent(admin, {
        actorKey: `ip:${ipHash}`,
        authUid: null,
        eventType: 'account_limit_blocked',
        severity: 'warn',
        details: { reason: 'device_already_registered', deviceHashPrefix: deviceHash.slice(0, 12) },
        ipHash,
        origin: originCheck.origin
      });
      return jsonResponse({
        ok: false,
        error: 'Este navegador/PC já possui uma conta criada. Faça login na sua conta existente.'
      }, 403, originCheck.origin);
    }

    const { data: existingNick } = await admin
      .from('player_profiles')
      .select('id')
      .eq('nickname_lower', nickname.toLowerCase())
      .maybeSingle();
    if (existingNick) {
      return jsonResponse({ ok: false, error: 'Este apelido já está em uso. Escolha outro.' }, 409, originCheck.origin);
    }

    // Rate-limit temporal por IP: máximo 1 conta criada por IP a cada 24h
    const dailyRl = await enforceRateLimit(admin, 'nick-register-daily', `ip:${ipHash}`, 1, 86400);
    if (!dailyRl.allowed) {
      await logSecurityEvent(admin, {
        actorKey: `ip:${ipHash}`,
        authUid: null,
        eventType: 'account_limit_blocked',
        severity: 'warn',
        details: { reason: 'ip_daily_limit' },
        ipHash,
        origin: originCheck.origin
      });
      return jsonResponse({
        ok: false,
        error: 'Limite de segurança atingido: apenas 1 conta por rede/dispositivo a cada 24 horas.'
      }, 429, originCheck.origin);
    }

    const internalEmail = rawEmail || `${crypto.randomUUID()}@player.dinodash.internal`;

    const { data: createdData, error: createErr } = await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        nickname,
        no_email_account: !rawEmail
      }
    });

    const userId = createdData?.user?.id;
    if (createErr || !userId) {
      return jsonResponse({
        ok: false,
        error: 'Não foi possível concluir o cadastro com esses dados. Verifique e tente novamente.'
      }, 400, originCheck.origin);
    }

    const { error: profErr } = await admin.from('player_profiles').upsert({
      id: userId,
      nickname,
      nickname_lower: nickname.toLowerCase(),
      is_minor_consent: isMinorConsent
    });

    if (profErr) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return jsonResponse({
        ok: false,
        error: 'Este apelido acabou de ser ocupado ou é inválido. Tente outro.'
      }, 409, originCheck.origin);
    }

    await admin.from('device_account_registry').insert({
      device_hash: deviceHash,
      user_id: userId,
      ip_hash: ipHash
    });

    const anon = getAnonClient();
    const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
      email: internalEmail,
      password
    });

    await logSecurityEvent(admin, {
      actorKey: `uid:${userId}`,
      authUid: userId,
      eventType: 'account_registered',
      severity: 'info',
      details: { noEmail: !rawEmail, deviceHashPrefix: deviceHash.slice(0, 12) },
      ipHash,
      origin: originCheck.origin
    });

    if (signInErr || !signInData?.session) {
      return jsonResponse({
        ok: true,
        needsEmailConfirmation: false,
        session: null,
        user: { id: userId },
        nickname,
        message: 'Conta criada com sucesso! Faça login com seu apelido e senha.'
      }, 200, originCheck.origin);
    }

    return jsonResponse({
      ok: true,
      needsEmailConfirmation: false,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token
      },
      user: { id: userId },
      nickname,
      message: 'Conta criada e conectada com sucesso!'
    }, 200, originCheck.origin);
  }

  if (action === 'login') {
    const rl = await enforceRateLimit(admin, 'nick-login', `ip:${ipHash}`, 8, 300);
    if (!rl.allowed) {
      return jsonResponse({ ok: false, error: 'Muitas tentativas de login. Aguarde alguns minutos.' }, 429, originCheck.origin);
    }

    const identifier = String(body.identifier || '').trim();
    const password = String(body.password || '');
    if (!identifier || !password) {
      return jsonResponse({ ok: false, error: 'Informe seu apelido e senha.' }, 400, originCheck.origin);
    }

    if (hasMaliciousPayload(identifier)) {
      await logSecurityEvent(admin, {
        actorKey: `ip:${ipHash}`,
        authUid: null,
        eventType: 'auth_malicious_payload',
        severity: 'high',
        details: { action: 'login', sample: identifier.slice(0, 48) },
        ipHash,
        origin: originCheck.origin
      });
      return jsonResponse({ ok: false, error: GENERIC_LOGIN_ERROR }, 401, originCheck.origin);
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
        error: GENERIC_LOGIN_ERROR
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
        error: GENERIC_LOGIN_ERROR
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
    if (hasMaliciousPayload(identifier)) {
      await logSecurityEvent(admin, {
        actorKey: `ip:${ipHash}`,
        authUid: null,
        eventType: 'auth_malicious_payload',
        severity: 'high',
        details: { action: 'recover_password', sample: identifier.slice(0, 48) },
        ipHash,
        origin: originCheck.origin
      });
    } else {
      const email = await resolveEmailFromIdentifier(admin, identifier);
      if (email && !email.endsWith('@player.dinodash.internal')) {
        const anon = getAnonClient();
        const redirectTo = typeof body.redirectTo === 'string' && body.redirectTo.startsWith('http')
          ? body.redirectTo
          : undefined;
        await anon.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined).catch(() => {});
      }
    }

    // Resposta sempre genérica para impedir enumeração de usuários
    return jsonResponse({
      ok: true,
      message: 'Se a conta possuir e-mail vinculado, enviaremos instruções de recuperação.'
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
      if (nickCheck.malicious) {
        await logSecurityEvent(admin, {
          actorKey: actor.actorKey,
          authUid: actor.authUid,
          eventType: 'auth_malicious_payload',
          severity: 'high',
          details: { action: 'change_nickname', sample: nickname.slice(0, 48) },
          ipHash,
          origin: originCheck.origin
        });
      }
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
    try {
      await admin.from('device_account_registry').delete().eq('user_id', actor.authUid);
    } catch {
      // Best-effort cleanup se tabela ainda não existir no ambiente
    }
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
