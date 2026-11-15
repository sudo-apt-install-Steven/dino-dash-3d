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
  resolveActor
} from '../_shared/security.ts';

const ALLOWED_CATEGORIES = new Set(['ofensa', 'trapaca', 'bug_seguranca', 'privacidade', 'outro']);

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

  const rl = await enforceRateLimit(admin, 'submit-report', actor.actorKey, 5, 60);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, error: 'Limite de denúncias por minuto atingido. Aguarde antes de enviar outra.' }, 429, originCheck.origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Payload inválido.' }, 400, originCheck.origin);
  }

  const rawCategory = cleanText(body.category, 'outro', 24).toLowerCase();
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'outro';
  const targetPlayerName = body.targetPlayerName ? cleanText(body.targetPlayerName, '', 24) : null;
  const rawCode = String(body.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const roomCode = /^[A-Z0-9]{4}$/.test(rawCode) ? rawCode : null;
  const description = cleanText(body.description, '', 1000);

  if (description.length < 8) {
    return jsonResponse({ ok: false, error: 'Descreva o ocorrido com pelo menos 8 caracteres.' }, 400, originCheck.origin);
  }

  const ipHash = await hashIp(req);
  const { data: inserted, error } = await admin
    .from('abuse_reports')
    .insert({
      reporter_actor_key: actor.actorKey,
      reporter_auth_uid: actor.authUid,
      target_player_name: targetPlayerName,
      room_code: roomCode,
      category,
      description,
      status: 'aberto',
      ip_hash: ipHash
    })
    .select('id, created_at')
    .single();

  if (error || !inserted) {
    return jsonResponse({ ok: false, error: 'Não foi possível registrar a denúncia agora.' }, 500, originCheck.origin);
  }

  await logSecurityEvent(admin, {
    actorKey: actor.actorKey,
    authUid: actor.authUid,
    eventType: 'abuse_report_created',
    severity: 'info',
    details: { reportId: inserted.id, category, roomCode },
    ipHash,
    origin: originCheck.origin
  });

  return jsonResponse({
    ok: true,
    reportId: inserted.id,
    createdAt: inserted.created_at
  }, 200, originCheck.origin);
});
