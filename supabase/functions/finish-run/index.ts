import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  buildCorsHeaders,
  cleanText,
  enforceRateLimit,
  getAdminClient,
  hashIp,
  isOriginAllowed,
  jsonResponse,
  logSecurityEvent,
  resolveActor,
  verifySignature
} from '../_shared/security.ts';

const DIFF_MULT: Record<string, number> = {
  easy: 0.9,
  normal: 1.0,
  hard: 1.5,
  insane: 2.5,
  supreme: 3.4,
  custom: 1.5
};

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

  const rl = await enforceRateLimit(admin, 'finish-run', actor.actorKey, 20, 60);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, error: 'Muitos envios em sequência. Aguarde um instante.' }, 429, originCheck.origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Payload inválido.' }, 400, originCheck.origin);
  }

  const runId = String(body.runId || '').trim();
  const nonce = String(body.nonce || '').trim();
  const sig = String(body.sig || '').trim();
  const playerName = cleanText(body.playerName, 'Dino', 24);
  const dinoId = cleanText(body.dinoId, 'trex', 28);
  const modeId = cleanText(body.modeId, 'solo', 28);
  const difficulty = cleanText(body.difficulty, 'normal', 20);
  const score = Math.floor(Number(body.score || 0));
  const distance = Math.max(0, Math.floor(Number(body.distance || 0)));
  const eggs = Math.max(0, Math.min(25000, Math.floor(Number(body.eggs || 0))));
  const ipHash = await hashIp(req);

  if (!runId || !nonce || !sig) {
    return jsonResponse({ ok: false, error: 'Token de corrida ausente.' }, 400, originCheck.origin);
  }

  const { data: session } = await admin
    .from('run_sessions')
    .select('*')
    .eq('id', runId)
    .maybeSingle();

  if (!session || session.actor_key !== actor.actorKey || session.nonce !== nonce) {
    await logSecurityEvent(admin, {
      actorKey: actor.actorKey,
      authUid: actor.authUid,
      eventType: 'invalid_run_session',
      severity: 'high',
      details: { runId, reason: 'session_mismatch' },
      ipHash,
      origin: originCheck.origin
    });
    return jsonResponse({ ok: false, error: 'Sessão de corrida inválida.' }, 403, originCheck.origin);
  }

  const validSig = await verifySignature(`${session.id}:${session.actor_key}:${session.nonce}:${session.mode_id}:${session.difficulty}`, sig);
  if (!validSig) {
    await logSecurityEvent(admin, {
      actorKey: actor.actorKey,
      authUid: actor.authUid,
      eventType: 'hmac_tamper',
      severity: 'critical',
      details: { runId },
      ipHash,
      origin: originCheck.origin
    });
    return jsonResponse({ ok: false, error: 'Assinatura de corrida inválida.' }, 403, originCheck.origin);
  }

  if (session.status !== 'active') {
    return jsonResponse({ ok: false, error: 'Partida já contabilizada (idempotência anti-replay).' }, 409, originCheck.origin);
  }

  const startedMs = new Date(session.started_at).getTime();
  const elapsedSec = Math.max(1, (Date.now() - startedMs) / 1000);
  const diffFactor = DIFF_MULT[difficulty] ?? 1.5;
  const modeFactor = modeId === 'hardcore' ? 5.0 : 2.0;
  const plausibleMaxScore = Math.min(250000, Math.floor(Math.max(450, elapsedSec * 185 * diffFactor * modeFactor)));

  if (!Number.isFinite(score) || score < 0 || score > 250000 || score > plausibleMaxScore) {
    await admin.from('run_sessions').update({ status: 'rejected', finished_at: new Date().toISOString(), final_score: Math.min(250000, Math.max(0, score)) }).eq('id', runId);
    await logSecurityEvent(admin, {
      actorKey: actor.actorKey,
      authUid: actor.authUid,
      eventType: 'implausible_score_rejected',
      severity: 'high',
      details: { runId, score, plausibleMaxScore, elapsedSec, modeId, difficulty },
      ipHash,
      origin: originCheck.origin
    });
    return jsonResponse({ ok: false, error: 'Pontuação rejeitada por verificação de plausibilidade do servidor.' }, 422, originCheck.origin);
  }

  await admin.from('run_sessions').update({
    status: 'completed',
    finished_at: new Date().toISOString(),
    final_score: score
  }).eq('id', runId);

  if (score > 100) {
    await admin.from('dino_leaderboard').insert({
      user_id: actor.authUid,
      player_name: playerName,
      dino_id: dinoId,
      mode_id: modeId,
      score,
      distance,
      eggs
    });
  }

  const { data: wallet } = await admin
    .from('player_wallets')
    .select('high_score, total_runs')
    .eq('actor_key', actor.actorKey)
    .maybeSingle();

  await admin.from('player_wallets').upsert({
    actor_key: actor.actorKey,
    auth_uid: actor.authUid,
    nickname: playerName,
    high_score: Math.max(Number(wallet?.high_score || 0), score),
    total_runs: Number(wallet?.total_runs || 0) + 1,
    updated_at: new Date().toISOString()
  });

  return jsonResponse({
    ok: true,
    verifiedScore: score,
    elapsedSec: Math.round(elapsedSec * 10) / 10
  }, 200, originCheck.origin);
});
