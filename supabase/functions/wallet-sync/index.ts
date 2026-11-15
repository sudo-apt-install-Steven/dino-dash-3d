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

  const rl = await enforceRateLimit(admin, 'wallet-sync', actor.actorKey, 15, 60);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, error: 'Limite de sincronização atingido.' }, 429, originCheck.origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const nickname = cleanText(body.nickname, 'Dino', 24);
  const eggs = Math.max(0, Math.min(100000, Math.floor(Number(body.eggs || 0))));
  const crates = Math.max(0, Math.min(200, Math.floor(Number(body.fossilCrates || 0))));
  const crystals = Math.max(0, Math.min(50000, Math.floor(Number(body.crystals || 0))));
  const pityEpic = Math.max(0, Math.min(8, Math.floor(Number(body.gachaPityEpic ?? body.gachaPity ?? 0))));
  const pityShiny = Math.max(0, Math.min(14, Math.floor(Number(body.gachaPityShiny ?? body.gachaPity ?? 0))));

  const { data: existing } = await admin
    .from('player_wallets')
    .select('*')
    .eq('actor_key', actor.actorKey)
    .maybeSingle();

  const mergedEggs = existing ? Math.min(5000000, Math.max(Number(existing.eggs || 0), eggs)) : eggs;
  const mergedCrates = existing ? Math.min(5000, Math.max(Number(existing.fossil_crates || 0), crates)) : crates;
  const mergedCrystals = existing ? Math.min(50000, Math.max(Number(existing.crystals || 0), crystals)) : crystals;
  const mergedPityEpic = existing ? Math.min(8, Math.max(Number(existing.gacha_pity_epic ?? existing.gacha_pity ?? 0), pityEpic)) : pityEpic;
  const mergedPityShiny = existing ? Math.min(14, Math.max(Number(existing.gacha_pity_shiny ?? existing.gacha_pity ?? 0), pityShiny)) : pityShiny;

  await admin.from('player_wallets').upsert({
    actor_key: actor.actorKey,
    auth_uid: actor.authUid,
    nickname,
    eggs: mergedEggs,
    fossil_crates: mergedCrates,
    crystals: mergedCrystals,
    gacha_pity: mergedPityEpic,
    gacha_pity_epic: mergedPityEpic,
    gacha_pity_shiny: mergedPityShiny,
    updated_at: new Date().toISOString()
  });

  return jsonResponse({
    ok: true,
    eggs: mergedEggs,
    fossilCrates: mergedCrates,
    crystals: mergedCrystals,
    gachaPityEpic: mergedPityEpic,
    gachaPityShiny: mergedPityShiny
  }, 200, originCheck.origin);
});
