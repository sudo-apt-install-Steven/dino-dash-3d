// Gerador procedural determinístico de andares da Masmorra RPG (7–11 salas conectadas).
// Garante caminho conectado de 'start' até 'boss', ligações bidirecionais N/S/E/W,
// 8 temas, coordenadas de minimapa e encontros/armadilhas/relíquias/eventos via ultra_catalog.js
// (com fallback local seguro para testes isolados antes da integração das branches).

export const DUNGEON_THEME_IDS = [
  'crypt',
  'volcano_temple',
  'ice_cavern',
  'aztec_ruins',
  'cyber_vault',
  'void_rift',
  'biolum_grotto',
  'amber_mine'
];

export const ROOM_TYPES = ['start', 'combat', 'trap', 'treasure', 'shrine', 'puzzle', 'merchant', 'npc', 'boss'];

export const DUNGEON_NPC_IDS = [
  'fossil_smith',
  'jurassic_oracle',
  'wandering_merchant',
  'wounded_hunter',
  'rune_guardian'
];

const WEAPON_IDS_BY_TIER = [
  ['obsidian_claw', 'amber_fang'],
  ['solar_fang', 'frost_halberd', 'venom_tailblade'],
  ['scary_fossil_blade', 'seismic_hammer', 'cyber_plasma_spear'],
  ['runic_staff', 'void_rex_greatsword']
];

const DIRS = [
  { dir: 'N', opp: 'S', dx: 0, dy: -1 },
  { dir: 'S', opp: 'N', dx: 0, dy: 1 },
  { dir: 'E', opp: 'W', dx: 1, dy: 0 },
  { dir: 'W', opp: 'E', dx: -1, dy: 0 }
];

function hashSeed(input) {
  const s = String(input ?? 'dino-dungeon');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  if (a === 0) a = 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

// Fallbacks determinísticos caso o chamador não passe rollers de ultra_catalog.js
const FALLBACK_ARCHETYPES = ['skeleton_raptor', 'rune_golem', 'acid_slime', 'cyber_sentinel', 'void_shade', 'fossil_knight'];

function fallbackEncounter(rng, floor, themeId, isBoss = false) {
  const archetype = pick(rng, FALLBACK_ARCHETYPES);
  const hp = (isBoss ? 14 : 6) + floor * (isBoss ? 5 : 2);
  return {
    id: `fb_enc_${floor}_${archetype}_${Math.floor(rng() * 9999)}`,
    name: isBoss ? `Guardião do Andar ${floor}` : `${archetype.replace('_', ' ')}`,
    archetype,
    theme: themeId,
    hp,
    maxHp: hp,
    atk: (isBoss ? 3 : 1) + Math.floor(floor / 2),
    dcBase: (isBoss ? 13 : 10) + Math.min(6, floor),
    diceHint: isBoss ? 'd20' : 'd12',
    weakness: pick(rng, ['fogo', 'gelo', 'impacto', 'furtividade', 'rugido']),
    rewardEggs: (isBoss ? 45 : 15) + floor * 8
  };
}

function fallbackTrap(rng, floor) {
  return {
    id: `fb_trap_${floor}_${Math.floor(rng() * 9999)}`,
    name: pick(rng, ['Lâminas Ocultas', 'Fosso de Espinhos', 'Gás Venenoso', 'Runa Explosiva']),
    dcBase: 10 + Math.min(6, floor),
    diceHint: 'd20',
    damage: 1 + Math.floor(floor / 3),
    counterplay: 'Esquiva acrobática ou desarmar com cuidado'
  };
}

function fallbackRelic(rng, floor) {
  return {
    id: `fb_relic_${floor}_${Math.floor(rng() * 9999)}`,
    name: pick(rng, ['Garra de Âmbar', 'Escama Rúnica', 'Amuleto Fóssil', 'Olho do Predador']),
    rarity: floor >= 4 ? 'epic' : 'rare',
    bonus: '+2 em testes de ataque',
    penalty: '-1 em furtividade'
  };
}

function fallbackRoomEvent(rng, floor, roomType) {
  return {
    id: `fb_room_${roomType}_${Math.floor(rng() * 9999)}`,
    roomType,
    name: roomType === 'shrine' ? 'Altar Ancestral' : roomType === 'puzzle' ? 'Enigma das Runas' : 'Câmara Misteriosa',
    prompts: ['Investigar as inscrições', 'Tocar o núcleo brilhante', 'Testar com cautela', 'Avançar em alerta'],
    riskLevel: Math.min(5, 1 + Math.floor(floor / 2))
  };
}

/**
 * Gera um andar completo e conectado da masmorra.
 * @param {number} floor - Número do andar (>= 1)
 * @param {string|number} seed - Seed base para geração determinística
 * @param {string} [themeId] - Tema opcional (um dos 8 de DUNGEON_THEME_IDS)
 * @param {object} [catalogRollers] - Rollers opcionais de ultra_catalog.js
 */
export function generateFloor(floor = 1, seed = 1337, themeId = null, catalogRollers = null) {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  const rng = createSeededRng(`${seed}:floor:${safeFloor}`);
  const resolvedTheme = (themeId && DUNGEON_THEME_IDS.includes(themeId))
    ? themeId
    : DUNGEON_THEME_IDS[(safeFloor - 1 + Math.floor(rng() * DUNGEON_THEME_IDS.length)) % DUNGEON_THEME_IDS.length];

  const targetCount = 7 + Math.floor(rng() * 5); // 7..11 salas
  const grid = new Map();
  const keyOf = (x, y) => `${x},${y}`;

  const nodes = [];
  const addNode = (x, y) => {
    const id = `r_${nodes.length}`;
    const node = {
      id,
      x,
      y,
      w: 18,
      h: 18,
      type: 'combat',
      doors: {}, // { N?: roomId, S?: roomId, E?: roomId, W?: roomId }
      doorList: [],
      seed: Math.floor(rng() * 1e9),
      cleared: false,
      visited: false,
      encounter: null,
      trap: null,
      relic: null,
      roomEvent: null,
      merchantOffers: null,
      npcId: null,
      hasMapScroll: false,
      weaponId: null,
      npcInteracted: false
    };
    grid.set(keyOf(x, y), node);
    nodes.push(node);
    return node;
  };

  const start = addNode(0, 0);
  start.type = 'start';
  start.cleared = true;
  start.visited = true;

  // Crescimento em árvore + pequenos ciclos para formar um mapa de masmorra orgânico
  let safety = 0;
  while (nodes.length < targetCount && safety < 200) {
    safety += 1;
    // Prefere expandir de nós recentes para criar profundidade até o chefe
    const baseIdx = rng() < 0.65 ? nodes.length - 1 : Math.floor(rng() * nodes.length);
    const base = nodes[baseIdx];
    const d = pick(rng, DIRS);
    const nx = base.x + d.dx;
    const ny = base.y + d.dy;
    if (Math.abs(nx) > 4 || Math.abs(ny) > 4) continue;
    const existing = grid.get(keyOf(nx, ny));
    if (!existing) {
      const next = addNode(nx, ny);
      base.doors[d.dir] = next.id;
      next.doors[d.opp] = base.id;
    } else if (rng() < 0.22 && !base.doors[d.dir]) {
      base.doors[d.dir] = existing.id;
      existing.doors[d.opp] = base.id;
    }
  }

  // BFS a partir de start para calcular distâncias e escolher a sala mais distante como 'boss'
  const distMap = new Map([[start.id, 0]]);
  const parentMap = new Map();
  const queue = [start];
  let farthest = start;
  while (queue.length) {
    const cur = queue.shift();
    const cd = distMap.get(cur.id);
    if (cd > (distMap.get(farthest.id) ?? 0)) farthest = cur;
    for (const targetId of Object.values(cur.doors)) {
      if (!distMap.has(targetId)) {
        distMap.set(targetId, cd + 1);
        parentMap.set(targetId, cur.id);
        const nxt = nodes.find((n) => n.id === targetId);
        if (nxt) queue.push(nxt);
      }
    }
  }

  farthest.type = 'boss';
  farthest.w = 22;
  farthest.h = 22;

  // Caminho garantido start -> boss
  const pathToBoss = [];
  let walk = farthest.id;
  while (walk) {
    pathToBoss.unshift(walk);
    walk = parentMap.get(walk);
  }

  // Distribui tipos ricos nas salas intermediárias (garante NPC, Tesouro, Combate, Armadilha e Enigma em todo andar)
  const midRooms = nodes.filter((n) => n.id !== start.id && n.id !== farthest.id);
  const poolTypes = ['combat', 'npc', 'treasure', 'trap', 'puzzle', 'combat', 'shrine', 'merchant', 'combat'];
  midRooms.forEach((room, idx) => {
    room.type = poolTypes[idx % poolTypes.length];
    if (room.type === 'merchant' || room.type === 'treasure') room.cleared = false;
    if (room.type === 'npc') room.cleared = true; // Salas de NPC são seguras e não trancam as portas
  });

  // Escolhe NPC determinístico para a sala de NPC (garante variedade entre andares)
  const primaryNpcId = DUNGEON_NPC_IDS[(safeFloor - 1 + Math.floor(rng() * DUNGEON_NPC_IDS.length)) % DUNGEON_NPC_IDS.length];
  const weaponTierIdx = Math.min(WEAPON_IDS_BY_TIER.length - 1, Math.floor((safeFloor - 1) / 2));
  const pickWeaponId = (boost = 0) => {
    const tier = WEAPON_IDS_BY_TIER[Math.min(WEAPON_IDS_BY_TIER.length - 1, weaponTierIdx + boost)];
    return pick(rng, tier);
  };

  // Preenche dados via ultra_catalog.js (ou fallbacks locais)
  const rollEnc = catalogRollers?.rollDungeonEncounter;
  const rollTrap = catalogRollers?.rollDungeonTrap;
  const rollRelic = catalogRollers?.rollDungeonRelic;
  const rollEvt = catalogRollers?.rollDungeonRoomEvent;

  const npcRoomIds = [];
  let mapScrollRoomId = null;

  for (const room of nodes) {
    room.doorList = Object.keys(room.doors);
    room.distance = distMap.get(room.id) ?? 0;

    if (room.type === 'combat' || room.type === 'boss') {
      const enc = rollEnc ? rollEnc(rng, safeFloor, resolvedTheme) : fallbackEncounter(rng, safeFloor, resolvedTheme, room.type === 'boss');
      const hpScale = room.type === 'boss' ? 1.85 : 1;
      const baseHp = Math.max(4, Math.round((enc?.hp || (6 + safeFloor * 2)) * hpScale));
      room.encounter = {
        ...enc,
        isBoss: room.type === 'boss',
        hp: baseHp,
        maxHp: baseHp,
        archetype: enc?.archetype || pick(rng, FALLBACK_ARCHETYPES)
      };
    } else if (room.type === 'trap') {
      room.trap = rollTrap ? rollTrap(rng, safeFloor, resolvedTheme) : fallbackTrap(rng, safeFloor);
    } else if (room.type === 'treasure') {
      room.relic = rollRelic ? rollRelic(rng, safeFloor) : fallbackRelic(rng, safeFloor);
      room.weaponId = pickWeaponId(rng() < 0.35 ? 1 : 0);
    } else if (room.type === 'shrine' || room.type === 'puzzle') {
      room.roomEvent = rollEvt ? rollEvt(rng, safeFloor, resolvedTheme) : fallbackRoomEvent(rng, safeFloor, room.type);
    } else if (room.type === 'npc') {
      room.npcId = primaryNpcId;
      room.weaponId = pickWeaponId(primaryNpcId === 'rune_guardian' || primaryNpcId === 'fossil_smith' ? 1 : 0);
      room.relic = rollRelic ? rollRelic(rng, safeFloor) : fallbackRelic(rng, safeFloor);
      if (primaryNpcId === 'jurassic_oracle' || primaryNpcId === 'wandering_merchant') {
        room.hasMapScroll = true;
        if (!mapScrollRoomId) mapScrollRoomId = room.id;
      }
      npcRoomIds.push(room.id);
    } else if (room.type === 'merchant') {
      room.npcId = 'wandering_merchant';
      room.weaponId = pickWeaponId(0);
      room.hasMapScroll = true;
      if (!mapScrollRoomId) mapScrollRoomId = room.id;
      room.merchantOffers = [
        { kind: 'heal', label: 'Poção de Âmbar (+3 HP)', cost: 20, heal: 3 },
        { kind: 'relic', label: (rollRelic ? rollRelic(rng, safeFloor) : fallbackRelic(rng, safeFloor)), cost: 35 }
      ];
      npcRoomIds.push(room.id);
    }
  }

  // Garante 100% que todo andar tenha pelo menos 1 Pergaminho do Mapa da Masmorra (no baú se não estiver com Oráculo/Mercador)
  if (!mapScrollRoomId) {
    const treasureRoom = nodes.find((r) => r.type === 'treasure') || midRooms[0];
    if (treasureRoom) {
      treasureRoom.hasMapScroll = true;
      mapScrollRoomId = treasureRoom.id;
    }
  }

  return {
    floor: safeFloor,
    seed: String(seed),
    themeId: resolvedTheme,
    rooms: nodes,
    roomsById: Object.fromEntries(nodes.map((r) => [r.id, r])),
    startRoomId: start.id,
    bossRoomId: farthest.id,
    pathToBoss,
    npcRoomIds,
    mapScrollRoomId
  };
}
