import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  buildCorsHeaders,
  cleanText,
  enforceRateLimit,
  getAdminClient,
  hashIp,
  isOriginAllowed,
  jsonResponse,
  resolveActor,
  signPayload
} from '../_shared/security.ts';

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

  const admin = getAdminClient();
  const actor = await resolveActor(req, admin);
  if (!actor.ok) {
    return jsonResponse({ ok: false, error: actor.error || 'Não autorizado.' }, 401, originCheck.origin);
  }

  const rl = await enforceRateLimit(admin, 'start-run', actor.actorKey, 30, 60);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, error: 'Limite de início de partidas excedido. Aguarde alguns segundos.' }, 429, originCheck.origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const modeId = cleanText(body.modeId, 'solo', 28);
  const difficulty = cleanText(body.difficulty, 'normal', 20);
  const dinoId = cleanText(body.dinoId, 'trex', 28);
  const seed = body.seed ? cleanText(body.seed, '', 32) : null;

  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  const { data: session, error } = await admin
    .from('run_sessions')
    .insert({
      actor_key: actor.actorKey,
      auth_uid: actor.authUid,
      nonce,
      mode_id: modeId,
      difficulty,
      dino_id: dinoId,
      seed
    })
    .select('id, started_at')
    .single();

  if (error || !session) {
    return jsonResponse({ ok: false, error: 'Falha ao iniciar sessão verificada.' }, 500, originCheck.origin);
  }

  const sig = await signPayload(`${session.id}:${actor.actorKey}:${nonce}:${modeId}:${difficulty}`);
  const ipHash = await hashIp(req);
  await admin.from('player_wallets').upsert({
    actor_key: actor.actorKey,
    auth_uid: actor.authUid,
    updated_at: new Date().toISOString()
  }, { onConflict: 'actor_key', ignoreDuplicates: true });

  return jsonResponse({
    ok: true,
    runId: session.id,
    nonce,
    sig,
    startedAt: session.started_at,
    auditIp: ipHash.slice(0, 6)
  }, 200, originCheck.origin);
});
