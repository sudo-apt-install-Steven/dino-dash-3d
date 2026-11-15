// Cliente para Supabase Edge Functions autoritativas (start-run, finish-run, gacha-roll, wallet-sync, room-sync, wipe-data, submit-report).
import { Save } from '../systems/Save.js';

export const LOOTBOX_REAL_MONEY_ENABLED = import.meta.env?.VITE_LOOTBOX_REAL_MONEY === 'true';

let activeRunToken = null;
let lastAuthCheckAttempted = false;

function generateUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'dd3d-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

/**
 * Identificador pseudônimo local persistido no Save (sem coleta de PII ou IP).
 */
export function getLocalActorId() {
  if (!Save.data.playerActorId || !/^[a-zA-Z0-9_-]{8,64}$/.test(Save.data.playerActorId)) {
    Save.data.playerActorId = generateUuidV4();
    Save.save();
  }
  return Save.data.playerActorId;
}

/**
 * Tenta obter sessão autenticada ou anônima do Supabase sem quebrar se Anonymous Sign-Ins estiver desativado no projeto.
 */
export async function ensureSupabaseSession(client) {
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    if (data?.session?.user) return data.session;
    if (import.meta.env?.VITE_ENABLE_ANON_AUTH !== 'true') return null;
    if (lastAuthCheckAttempted) return null;
    lastAuthCheckAttempted = true;
    const anon = await client.auth.signInAnonymously();
    return anon?.data?.session || null;
  } catch {
    return null;
  }
}

async function invokeEdgeFunction(client, fnName, body = {}) {
  if (!client) return { ok: false, offline: true, error: 'Supabase offline.' };
  try {
    await ensureSupabaseSession(client);
    const actorId = getLocalActorId();
    const { data, error } = await client.functions.invoke(fnName, {
      body,
      headers: {
        'x-dino-player-id': actorId
      }
    });
    if (error) {
      return { ok: false, error: error.message || `Falha em ${fnName}` };
    }
    if (!data || data.ok === false) {
      return { ok: false, error: data?.error || `Rejeitado por ${fnName}`, data };
    }
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: err?.message || `Erro de rede em ${fnName}` };
  }
}

export async function startAuthoritativeRun(client, { modeId, difficulty, dinoId, seed }) {
  activeRunToken = null;
  if (!client) return null;
  const res = await invokeEdgeFunction(client, 'start-run', {
    modeId: modeId || 'solo',
    difficulty: difficulty || 'normal',
    dinoId: dinoId || 'trex',
    seed: seed ? String(seed).slice(0, 32) : null
  });
  if (res.ok && res.runId && res.nonce && res.sig) {
    activeRunToken = {
      runId: res.runId,
      nonce: res.nonce,
      sig: res.sig,
      startedAtMs: Date.now()
    };
    return activeRunToken;
  }
  return null;
}

export async function finishAuthoritativeRun(client, payload) {
  if (!client) return { ok: false, offline: true };
  if (!activeRunToken) {
    return { ok: false, error: 'Sessão de corrida sem token do servidor (offline/local).' };
  }
  const token = activeRunToken;
  activeRunToken = null;
  return await invokeEdgeFunction(client, 'finish-run', {
    runId: token.runId,
    nonce: token.nonce,
    sig: token.sig,
    playerName: payload.playerName,
    dinoId: payload.dinoId,
    modeId: payload.modeId,
    difficulty: payload.difficulty,
    score: Math.floor(payload.score || 0),
    distance: Math.floor(payload.distance || 0),
    eggs: Math.floor(payload.eggs || 0),
    runTimeSec: Number(payload.runTimeSec || 0),
    maxCombo: Math.floor(payload.maxCombo || 1)
  });
}

export async function requestAuthoritativeGachaRoll(client, {
  useEggs,
  crateCount,
  eggs,
  crystals = 0,
  pity,
  pityEpic,
  pityShiny,
  useCrystalCatalyst = false,
  ownedRewards
}) {
  if (!client) return { ok: false, offline: true };
  const epicCount = Math.max(0, Math.floor(pityEpic ?? pity ?? 0));
  const shinyCount = Math.max(0, Math.floor(pityShiny ?? pity ?? 0));
  return await invokeEdgeFunction(client, 'gacha-roll', {
    useEggs: !!useEggs,
    useCrystalCatalyst: !!useCrystalCatalyst,
    lootboxRealMoney: LOOTBOX_REAL_MONEY_ENABLED,
    clientCrateCount: Math.max(0, Math.floor(crateCount || 0)),
    clientEggs: Math.max(0, Math.floor(eggs || 0)),
    clientCrystals: Math.max(0, Math.floor(crystals || 0)),
    clientPity: epicCount,
    clientPityEpic: epicCount,
    clientPityShiny: shinyCount,
    ownedRewards: Array.isArray(ownedRewards) ? ownedRewards.slice(0, 200) : []
  });
}

export async function syncAuthoritativeWallet(client, summary) {
  if (!client) return { ok: false, offline: true };
  return await invokeEdgeFunction(client, 'wallet-sync', summary);
}

export async function syncAuthoritativeRoom(client, payload) {
  if (!client) return { ok: false, offline: true };
  return await invokeEdgeFunction(client, 'room-sync', payload);
}

export async function submitAbuseReport(client, payload) {
  if (!client) return { ok: false, offline: true, error: 'Supabase offline.' };
  return await invokeEdgeFunction(client, 'submit-report', payload);
}

export async function requestCloudDataWipe(client) {
  if (!client) return { ok: true, offline: true };
  return await invokeEdgeFunction(client, 'wipe-user-data', {});
}
