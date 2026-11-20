// Catálogo Ultra data-driven: masmorra RPG, armadilhas, salas, golpes X1 e relíquias.
// Matriz arquétipo × tema × tier. IDs únicos globais (prefixos dng_ / x1_).
import data from './dungeon_catalog.json' with { type: 'json' };

const r2 = (n) => Math.round(n * 100) / 100;

function buildEncounters() {
  const out = [];
  for (const a of data.encounterArchetypes) for (const th of data.themes) for (const t of data.encounterTiers) {
    out.push({
      id: `dng_enc_${a.id}_${th.id}_${t.id}`, kind: 'threat', category: 'dungeon_encounter',
      name: `${a.name} ${th.label} (${t.label})`, archetype: a.id, theme: th.id, tier: t.id,
      floorMin: a.floor + t.floorAdd, hp: Math.round(a.hp * t.hpMult), atk: Math.round(a.atk * t.atkMult),
      dcBase: a.dc + Math.floor(t.floorAdd / 2), diceHint: `d20 vs DC ${a.dc + Math.floor(t.floorAdd / 2)}`,
      trait: a.trait, weakness: a.weakness, element: th.element, rewardEggs: t.eggs + Math.floor(a.floor / 2)
    });
  }
  return out;
}

function buildTraps() {
  const out = [];
  for (const a of data.trapArchetypes) for (const th of data.themes) for (const t of data.trapTiers) {
    const dc = a.dc + t.dcAdd;
    out.push({
      id: `dng_trap_${a.id}_${th.id}_${t.id}`, kind: 'threat', category: 'dungeon_trap',
      name: `${a.name} ${th.label} (${t.label})`, archetype: a.id, theme: th.id, tier: t.id,
      floorMin: t.floor, dcBase: dc, diceHint: `d20 vs DC ${dc}`, damage: Math.round(a.dmg * t.dmgMult),
      element: th.element, debuffId: a.debuff, counterplay: a.counter
    });
  }
  return out;
}

function buildRooms() {
  const out = [];
  for (const a of data.roomArchetypes) for (const th of data.themes) for (const t of data.roomTiers) {
    out.push({
      id: `dng_room_${a.id}_${th.id}_${t.id}`, kind: a.kind, category: 'dungeon_room',
      name: `${a.name} ${th.label} (${t.label})`, archetype: a.id, theme: th.id, tier: t.id,
      floorMin: t.floor, roomType: a.type, prompts: a.prompts.slice(),
      riskLevel: a.kind === 'neutral' ? a.risk : Math.min(7, a.risk + t.riskAdd)
    });
  }
  return out;
}

function buildMoves() {
  const out = [];
  for (const a of data.moveArchetypes) for (const el of data.moveElements) for (const g of data.moveGrades) {
    out.push({
      id: `x1_move_${a.id}_${el}_${g.id}`, kind: a.kind, category: 'combat_move',
      name: `${a.name} ${el} (${g.label})`, archetype: a.id, grade: g.id, element: el,
      damageMult: r2(a.dmg * g.dmgMult * (el === 'physical' ? 1 : 1.1)), staminaCost: Math.round(a.stam * g.stamMult),
      range: a.range, cooldown: r2(a.cd * g.cdMult)
    });
  }
  return out;
}

function buildRelics() {
  const out = [];
  for (const a of data.relicArchetypes) for (const ra of data.relicRarities) for (const m of data.relicModes) {
    out.push({
      id: `dng_relic_${a.id}_${ra.id}_${m.id}`, kind: 'help', category: 'dungeon_relic',
      name: `${a.name} ${ra.label} (${m.label})`, archetype: a.id, mode: m.id, rarity: ra.id,
      floorMin: a.floor + ra.floorAdd,
      bonus: { stat: a.stat, value: r2(a.bonus * ra.mult * m.bonusMult) },
      penalty: { stat: a.penaltyStat, value: r2(a.penalty * ra.mult * m.penaltyMult) }
    });
  }
  return out;
}

export const DUNGEON_THEMES = data.themes;
export const DUNGEON_ENCOUNTERS = buildEncounters();
export const DUNGEON_TRAPS = buildTraps();
export const DUNGEON_ROOMS = buildRooms();
export const X1_COMBAT_MOVES = buildMoves();
export const DUNGEON_RELICS = buildRelics();

export function getAllUltraEntries() {
  return [...DUNGEON_ENCOUNTERS, ...DUNGEON_TRAPS, ...DUNGEON_ROOMS, ...X1_COMBAT_MOVES, ...DUNGEON_RELICS];
}

const _all = getAllUltraEntries();
const _threats = _all.filter((e) => e.kind === 'threat').length;
export const ULTRA_CATALOG_SUMMARY = {
  encounters: DUNGEON_ENCOUNTERS.length, traps: DUNGEON_TRAPS.length, rooms: DUNGEON_ROOMS.length,
  moves: X1_COMBAT_MOVES.length, relics: DUNGEON_RELICS.length,
  threatTotal: _threats, helpTotal: _all.filter((e) => e.kind === 'help').length,
  total: _all.length, threatRatio: r2(_threats / _all.length)
};

function pick(rng, pool) {
  if (!pool.length) return null;
  const f = typeof rng === 'function' ? rng : Math.random;
  return pool[Math.min(pool.length - 1, Math.floor(f() * pool.length))];
}
function pool(list, floor, themeId) {
  let p = list.filter((e) => e.floorMin <= floor && (!themeId || e.theme === themeId));
  if (!p.length) p = list.filter((e) => e.floorMin <= floor);
  if (!p.length) p = list.filter((e) => !themeId || e.theme === themeId);
  return p.length ? p : list;
}
export function rollDungeonEncounter(rng, floor = 1, themeId = null) { return pick(rng, pool(DUNGEON_ENCOUNTERS, floor, themeId)); }
export function rollDungeonTrap(rng, floor = 1, themeId = null) { return pick(rng, pool(DUNGEON_TRAPS, floor, themeId)); }
export function rollDungeonRoomEvent(rng, floor = 1, themeId = null) { return pick(rng, pool(DUNGEON_ROOMS, floor, themeId)); }
export function rollDungeonRelic(rng, floor = 1) { return pick(rng, pool(DUNGEON_RELICS, floor, null)); }
