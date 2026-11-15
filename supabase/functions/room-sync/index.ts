import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  buildCorsHeaders,
  cleanText,
  enforceRateLimit,
  getAdminClient,
  isOriginAllowed,
  jsonResponse,
  resolveActor
} from '../_shared/security.ts';

async function sha256Hex(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSecretHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
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

  const admin = getAdminClient();
  const actor = await resolveActor(req, admin);
  if (!actor.ok) {
    return jsonResponse({ ok: false, error: actor.error || 'Não autorizado.' }, 401, originCheck.origin);
  }

  const rl = await enforceRateLimit(admin, 'room-sync', actor.actorKey, 35, 60);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, error: 'Muitas operações de sala em sequência.' }, 429, originCheck.origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Payload inválido.' }, 400, originCheck.origin);
  }

  const action = cleanText(body.action, 'upsert', 16);
  const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (!/^[A-Z0-9]{4}$/.test(code)) {
    return jsonResponse({ ok: false, error: 'Código de sala inválido (use 4 caracteres alfanuméricos).' }, 400, originCheck.origin);
  }

  // Limpeza periódica de salas expiradas (> 20 minutos)
  try {
    await admin.rpc('cleanup_expired_dino_rooms');
  } catch {
    // Ignora falha não-crítica de limpeza periódica.
  }

  if (action === 'lookup') {
    const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const { data: room } = await admin
      .from('dino_rooms')
      .select('code, host_name, mode_id, player_count, status')
      .eq('code', code)
      .gte('updated_at', cutoff)
      .maybeSingle();

    return jsonResponse({
      ok: true,
      exists: Boolean(room),
      room: room
        ? {
            code: room.code,
            hostName: room.host_name,
            modeId: room.mode_id,
            playerCount: room.player_count,
            status: room.status
          }
        : null
    }, 200, originCheck.origin);
  }

  const providedSecret = String(body.hostSecret || '').trim();
  const { data: secretRow } = await admin
    .from('dino_room_secrets')
    .select('host_actor_key, host_secret_hash, updated_at')
    .eq('code', code)
    .maybeSingle();

  const { data: existingRoom } = await admin
    .from('dino_rooms')
    .select('code, updated_at')
    .eq('code', code)
    .maybeSingle();

  if (action === 'delete') {
    if (!existingRoom || !secretRow) {
      return jsonResponse({ ok: true, deleted: false }, 200, originCheck.origin);
    }
    const providedHash = providedSecret ? await sha256Hex(providedSecret) : '';
    const authorized = secretRow.host_actor_key === actor.actorKey ||
      (providedHash && providedHash === secretRow.host_secret_hash);
    if (!authorized) {
      return jsonResponse({ ok: false, error: 'Apenas o host criador pode encerrar esta sala.' }, 403, originCheck.origin);
    }
    await admin.from('dino_rooms').delete().eq('code', code);
    return jsonResponse({ ok: true, deleted: true }, 200, originCheck.origin);
  }

  // action === 'upsert'
  const hostName = cleanText(body.hostName, 'Host', 24);
  const modeId = cleanText(body.modeId, 'lan_party', 24);
  const isPublic = body.isPublic !== false;
  const playerCount = Math.max(1, Math.min(8, Math.floor(Number(body.playerCount || 1))));
  const rawStatus = cleanText(body.status, 'lobby', 16);
  const status = rawStatus === 'playing' || rawStatus === 'finished' ? rawStatus : 'lobby';

  const isExpired = existingRoom
    ? new Date(existingRoom.updated_at).getTime() < Date.now() - 20 * 60 * 1000
    : true;

  let returnedSecret = providedSecret;
  if (!existingRoom || isExpired || !secretRow) {
    returnedSecret = randomSecretHex();
  } else {
    const providedHash = providedSecret ? await sha256Hex(providedSecret) : '';
    const authorized = secretRow.host_actor_key === actor.actorKey ||
      (providedHash && providedHash === secretRow.host_secret_hash);
    if (!authorized) {
      return jsonResponse({ ok: false, error: 'Código de sala já em uso por outro host.' }, 403, originCheck.origin);
    }
    if (!returnedSecret) {
      returnedSecret = randomSecretHex();
    }
  }

  const secretHash = await sha256Hex(returnedSecret);
  const nowIso = new Date().toISOString();

  const { error: upsertErr } = await admin.from('dino_rooms').upsert({
    code,
    host_name: hostName,
    mode_id: modeId,
    is_public: isPublic,
    player_count: playerCount,
    status,
    updated_at: nowIso
  });

  if (upsertErr) {
    return jsonResponse({ ok: false, error: 'Falha ao sincronizar sala no servidor.' }, 500, originCheck.origin);
  }

  await admin.from('dino_room_secrets').upsert({
    code,
    host_actor_key: actor.actorKey,
    host_secret_hash: secretHash,
    updated_at: nowIso
  });

  return jsonResponse({
    ok: true,
    code,
    hostSecret: returnedSecret
  }, 200, originCheck.origin);
});
