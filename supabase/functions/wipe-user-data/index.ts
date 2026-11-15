import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
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

  const rl = await enforceRateLimit(admin, 'wipe-user-data', actor.actorKey, 5, 60);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, error: 'Aguarde um minuto antes de repetir a solicitação.' }, 429, originCheck.origin);
  }

  const ipHash = await hashIp(req);
  const wiped = [];

  await admin.from('gacha_audit_logs').delete().eq('actor_key', actor.actorKey);
  wiped.push('gacha_audit_logs');

  await admin.from('run_sessions').delete().eq('actor_key', actor.actorKey);
  wiped.push('run_sessions');

  await admin.from('player_wallets').delete().eq('actor_key', actor.actorKey);
  wiped.push('player_wallets');

  await admin.from('abuse_reports').delete().eq('reporter_actor_key', actor.actorKey);
  wiped.push('abuse_reports');

  await admin.from('dino_room_secrets').delete().eq('host_actor_key', actor.actorKey);
  wiped.push('dino_room_secrets');

  if (actor.authUid) {
    await admin.from('dino_leaderboard').delete().eq('user_id', actor.authUid);
    wiped.push('dino_leaderboard');
  }

  await logSecurityEvent(admin, {
    actorKey: 'lgpd:anonymized',
    authUid: null,
    eventType: 'gdpr_lgpd_wipe',
    severity: 'info',
    details: { tableCount: wiped.length },
    ipHash,
    origin: originCheck.origin
  });

  return jsonResponse({
    ok: true,
    wipedTables: wiped
  }, 200, originCheck.origin);
});
