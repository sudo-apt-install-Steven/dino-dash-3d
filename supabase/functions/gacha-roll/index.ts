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

const RARITIES = [
  { id: 'comum', weight: 46 },
  { id: 'rara', weight: 27 },
  { id: 'épica', weight: 14 },
  { id: 'lendária', weight: 7 },
  { id: 'mítica', weight: 4 },
  { id: 'secreta', weight: 2 }
];

const GACHA_EGG_ROLL_COST = 240;

function csprngFloat(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

function rollAuthoritativeTier(pity: number): string {
  if (pity >= 14) return 'lendária';
  const minIdx = pity >= 8 ? 2 : 0;
  const eligible = RARITIES.slice(minIdx);
  const total = eligible.reduce((sum, item) => sum + item.weight, 0);
  let r = csprngFloat() * total;
  for (const tier of eligible) {
    r -= tier.weight;
    if (r <= 0) return tier.id;
  }
  return eligible[0].id;
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

  if (Deno.env.get('LOOTBOX_REAL_MONEY') === 'true') {
    return jsonResponse({ ok: false, error: 'Lootbox paga bloqueada nesta etapa.' }, 403, originCheck.origin);
  }

  const admin = getAdminClient();
  const actor = await resolveActor(req, admin);
  if (!actor.ok) {
    return jsonResponse({ ok: false, error: actor.error || 'Não autorizado.' }, 401, originCheck.origin);
  }

  const rl = await enforceRateLimit(admin, 'gacha-roll', actor.actorKey, 35, 60);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, error: 'Limite de aberturas de gacha por minuto atingido. Aguarde alguns segundos.' }, 429, originCheck.origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const useEggs = !!body.useEggs;
  const clientCrates = Math.max(0, Math.min(5000, Math.floor(Number(body.clientCrateCount || 0))));
  const clientEggs = Math.max(0, Math.min(5000000, Math.floor(Number(body.clientEggs || 0))));
  const clientPity = Math.max(0, Math.min(30, Math.floor(Number(body.clientPity || 0))));
  const ipHash = await hashIp(req);

  const { data: wallet } = await admin
    .from('player_wallets')
    .select('*')
    .eq('actor_key', actor.actorKey)
    .maybeSingle();

  let curCrates = wallet ? Number(wallet.fossil_crates || 0) : clientCrates;
  let curEggs = wallet ? Number(wallet.eggs || 0) : clientEggs;
  const pityBefore = wallet ? Math.max(Number(wallet.gacha_pity || 0), 0) : clientPity;

  // Sincronizacao inicial se usuario jogou offline antes de conectar.
  if (wallet && useEggs && curEggs < GACHA_EGG_ROLL_COST && clientEggs >= GACHA_EGG_ROLL_COST && Number(wallet.total_runs || 0) === 0) {
    curEggs = Math.min(25000, clientEggs);
  }
  if (wallet && !useEggs && curCrates <= 0 && clientCrates > 0 && Number(wallet.total_runs || 0) === 0) {
    curCrates = Math.min(50, clientCrates);
  }

  if (useEggs && curEggs < GACHA_EGG_ROLL_COST) {
    return jsonResponse({ ok: false, error: `Precisa de ${GACHA_EGG_ROLL_COST} ovos para chocar.` }, 400, originCheck.origin);
  }
  if (!useEggs && curCrates <= 0) {
    return jsonResponse({ ok: false, error: 'Sem Caixas Fósseis disponíveis.' }, 400, originCheck.origin);
  }

  const tierId = rollAuthoritativeTier(pityBefore);
  const pityAfter = (tierId === 'épica' || tierId === 'lendária' || tierId === 'mítica' || tierId === 'secreta')
    ? 0
    : pityBefore + 1;

  const nextCrates = useEggs ? curCrates : Math.max(0, curCrates - 1);
  const nextEggs = useEggs ? Math.max(0, curEggs - GACHA_EGG_ROLL_COST) : curEggs;

  await admin.from('player_wallets').upsert({
    actor_key: actor.actorKey,
    auth_uid: actor.authUid,
    fossil_crates: nextCrates,
    eggs: nextEggs,
    gacha_pity: pityAfter,
    updated_at: new Date().toISOString()
  });

  await admin.from('gacha_audit_logs').insert({
    actor_key: actor.actorKey,
    auth_uid: actor.authUid,
    spend_type: useEggs ? 'eggs' : 'crate',
    tier_id: tierId,
    pity_before: pityBefore,
    pity_after: pityAfter,
    loot_real_money: false
  });

  if (tierId === 'secreta') {
    await logSecurityEvent(admin, {
      actorKey: actor.actorKey,
      authUid: actor.authUid,
      eventType: 'gacha_secret_drop',
      severity: 'info',
      details: { pityBefore, tierId },
      ipHash,
      origin: originCheck.origin
    });
  }

  return jsonResponse({
    ok: true,
    tierId,
    pityAfter,
    remainingCrates: nextCrates,
    remainingEggs: nextEggs
  }, 200, originCheck.origin);
});
