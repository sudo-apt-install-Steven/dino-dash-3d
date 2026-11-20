// Dungeon rooms, arena props and enemy models (voxel, batched => very few draw calls).
// Units: 1 voxel = 0.1 world. Rooms are built in voxel coords then offset so the room is centred on origin.
import * as THREE from 'three';
import { buildBatchedGroup } from './VoxelAccessories.js';

const V = 0.1;

export const DUNGEON_THEMES = {
  crypt: { id: 'crypt', name: 'Cripta Esquecida', palette: { floor: 0x4a4650, wall: 0x2f2c36, accent: 0x8a7fa0, glow: 0x9cffc8, fog: 0x0d0b12 }, propSet: ['sarcophagus', 'torch', 'bones', 'urn'], enemy: 'skeleton_raptor' },
  volcano_temple: { id: 'volcano_temple', name: 'Templo Vulcânico', palette: { floor: 0x3a2a26, wall: 0x241a18, accent: 0xc2411c, glow: 0xff6a1a, fog: 0x1a0a06 }, propSet: ['lava_vent', 'torch', 'obsidian', 'brazier'], enemy: 'rune_golem' },
  ice_cavern: { id: 'ice_cavern', name: 'Caverna Gélida', palette: { floor: 0x9ec7dd, wall: 0x5d8fb0, accent: 0xd8f3ff, glow: 0x7fe0ff, fog: 0x0a1822 }, propSet: ['ice_stalagmite', 'frost_crystal', 'snow_pile'], enemy: 'fossil_knight' },
  aztec_ruins: { id: 'aztec_ruins', name: 'Ruínas Astecas', palette: { floor: 0x7a6a4a, wall: 0x4e5a3c, accent: 0xd9a441, glow: 0x3ef0b0, fog: 0x0e140a }, propSet: ['stone_idol', 'torch', 'step_altar', 'vine_pillar'], enemy: 'rune_golem' },
  cyber_vault: { id: 'cyber_vault', name: 'Cofre Cibernético', palette: { floor: 0x1c2230, wall: 0x11151f, accent: 0x00e5ff, glow: 0xff2bd6, fog: 0x04060c }, propSet: ['server_rack', 'neon_pylon', 'terminal'], enemy: 'cyber_sentinel' },
  void_rift: { id: 'void_rift', name: 'Fenda do Vazio', palette: { floor: 0x1a1030, wall: 0x0d0820, accent: 0x7c3aed, glow: 0xc084fc, fog: 0x05020c }, propSet: ['rift_crystal', 'floating_shard', 'void_orb'], enemy: 'void_shade' },
  biolum_grotto: { id: 'biolum_grotto', name: 'Gruta Bioluminescente', palette: { floor: 0x1d3a3a, wall: 0x0f2426, accent: 0x34d399, glow: 0x5eead4, fog: 0x03100f }, propSet: ['glow_mushroom', 'spore_pod', 'root_arch'], enemy: 'acid_slime' },
  amber_mine: { id: 'amber_mine', name: 'Mina de Âmbar', palette: { floor: 0x5a4328, wall: 0x3a2a18, accent: 0xf59e0b, glow: 0xffc247, fog: 0x120b04 }, propSet: ['amber_crystal', 'mine_cart', 'support_beam', 'torch'], enemy: 'fossil_knight' },
};

// ---------- helpers ----------
function rngFrom(seed) {
  let s = (typeof seed === 'number' ? seed : hashStr(String(seed ?? 'x'))) >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shade(c, k) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}
function themeOf(id) { return DUNGEON_THEMES[id] || DUNGEON_THEMES.crypt; }
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''); }
const R = Math.round;

// ---------- prop generators: local voxel coords, origin at base corner (footprint ~ w x d) ----------
// each: {w,d,fn(c,P,rng)}
const PROPS = {
  sarcophagus: { w: 8, d: 18, fn: (c, P) => { c.box(0, 0, 0, 8, 2, 18, shade(P.wall, 1.3)); c.box(1, 2, 1, 6, 4, 16, P.floor); c.box(2, 6, 2, 4, 1, 14, shade(P.accent, 0.9)); c.box(3, 7, 3, 2, 1, 3, P.accent); c.box(3, 7, 12, 2, 1, 3, P.glow, { e: 0.6 }); } },
  torch: { w: 3, d: 3, fn: (c, P) => { c.box(1, 0, 1, 1, 12, 1, 0x5a3a1c); c.box(0, 12, 0, 3, 2, 3, 0x3a3a3a); c.box(0, 14, 0, 3, 3, 3, P.glow, { e: 1 }); c.box(1, 17, 1, 1, 2, 1, 0xfff1a8, { e: 1 }); } },
  brazier: { w: 6, d: 6, fn: (c, P) => { c.box(2, 0, 2, 2, 5, 2, 0x2a2a2a); c.box(0, 5, 0, 6, 2, 6, 0x3a3a3a); c.box(1, 7, 1, 4, 3, 4, P.glow, { e: 1 }); c.box(2, 10, 2, 2, 3, 2, 0xfff1a8, { e: 1 }); } },
  bones: { w: 8, d: 6, fn: (c, P, r) => { for (let i = 0; i < 5; i++) c.box(R(r() * 6), 0, R(r() * 4), 2, 1, 1, 0xe8e2d0); c.box(3, 0, 2, 3, 3, 3, 0xf1ecdc); c.box(3, 1, 2, 1, 1, 1, 0x111111); } },
  urn: { w: 4, d: 4, fn: (c, P) => { c.box(1, 0, 1, 2, 1, 2, P.accent); c.box(0, 1, 0, 4, 4, 4, shade(P.accent, 0.8)); c.box(1, 5, 1, 2, 2, 2, P.accent); } },
  lava_vent: { w: 8, d: 8, fn: (c, P, r) => { c.box(0, 0, 0, 8, 2, 8, 0x1a1210); c.box(1, 2, 1, 6, 1, 6, 0x2a1a14); c.box(2, 0, 2, 4, 3, 4, P.glow, { e: 1 }); c.box(3, 3, 3, 2, R(2 + r() * 4), 2, 0xffb347, { e: 1, a: 0.8 }); } },
  obsidian: { w: 6, d: 6, fn: (c, P) => { c.box(0, 0, 0, 6, 3, 6, 0x15101a, { m: 0.5 }); c.box(1, 3, 1, 4, 4, 4, 0x1d1626, { m: 0.5 }); c.box(2, 7, 2, 2, 4, 2, P.accent, { e: 0.4 }); } },
  ice_stalagmite: { w: 6, d: 6, fn: (c, P, r) => { c.box(0, 0, 0, 6, 2, 6, P.wall, { a: 0.9 }); c.box(1, 2, 1, 4, 3, 4, P.floor, { a: 0.9 }); c.box(2, 5, 2, 2, R(4 + r() * 6), 2, P.accent, { e: 0.2, a: 0.85 }); } },
  frost_crystal: { w: 4, d: 4, fn: (c, P) => { c.box(1, 0, 1, 2, 8, 2, P.glow, { e: 0.7, a: 0.85 }); c.box(0, 0, 1, 1, 4, 2, P.accent, { e: 0.4, a: 0.85 }); c.box(3, 0, 1, 1, 5, 2, P.accent, { e: 0.4, a: 0.85 }); } },
  snow_pile: { w: 8, d: 8, fn: (c) => { c.box(0, 0, 1, 8, 1, 6, 0xf4fbff); c.box(1, 1, 2, 6, 1, 4, 0xffffff); c.box(3, 2, 3, 2, 1, 2, 0xffffff); } },
  stone_idol: { w: 6, d: 6, fn: (c, P) => { c.box(0, 0, 0, 6, 2, 6, shade(P.floor, 0.9)); c.box(1, 2, 1, 4, 6, 4, P.wall); c.box(0, 8, 0, 6, 4, 6, shade(P.wall, 1.15)); c.box(1, 10, 6, 1, 1, 1, P.glow, { e: 1 }); c.box(4, 10, 6, 1, 1, 1, P.glow, { e: 1 }); c.box(1, 12, 1, 4, 1, 4, P.accent, { m: 0.4 }); } },
  step_altar: { w: 10, d: 10, fn: (c, P) => { c.box(0, 0, 0, 10, 2, 10, P.floor); c.box(1, 2, 1, 8, 2, 8, shade(P.floor, 1.1)); c.box(2, 4, 2, 6, 2, 6, shade(P.floor, 1.2)); c.box(4, 6, 4, 2, 2, 2, P.accent, { m: 0.6, e: 0.3 }); } },
  vine_pillar: { w: 4, d: 4, fn: (c, P, r) => { c.box(0, 0, 0, 4, 18, 4, P.wall); for (let i = 0; i < 5; i++) c.box(R(r() * 3), R(r() * 16), R(r() * 3), 1, 3, 2, 0x2f7d3a); } },
  server_rack: { w: 6, d: 4, fn: (c, P, r) => { c.box(0, 0, 0, 6, 16, 4, 0x151a26, { m: 0.6 }); for (let y = 1; y < 15; y += 2) { c.box(1, y, 4, 4, 1, 1, 0x0a0e18); c.box(R(1 + r() * 3), y, 4, 1, 1, 1, r() > 0.5 ? P.accent : P.glow, { e: 1 }); } } },
  neon_pylon: { w: 3, d: 3, fn: (c, P) => { c.box(0, 0, 0, 3, 2, 3, 0x0a0e18, { m: 0.7 }); c.box(1, 2, 1, 1, 14, 1, P.glow, { e: 1 }); c.box(0, 16, 0, 3, 1, 3, P.accent, { e: 1 }); } },
  terminal: { w: 6, d: 4, fn: (c, P) => { c.box(0, 0, 0, 6, 6, 4, 0x151a26, { m: 0.6 }); c.box(1, 6, 1, 4, 4, 1, 0x0a0e18); c.box(1, 6, 0, 4, 4, 1, P.accent, { e: 0.9 }); } },
  rift_crystal: { w: 6, d: 6, fn: (c, P, r) => { c.box(2, 0, 2, 2, 12, 2, P.accent, { e: 0.8, a: 0.9 }); c.box(0, 0, 3, 2, R(5 + r() * 4), 2, P.glow, { e: 0.7, a: 0.9 }); c.box(4, 0, 1, 2, R(6 + r() * 4), 2, P.glow, { e: 0.7, a: 0.9 }); c.box(2, 12, 2, 2, 2, 2, 0xffffff, { e: 1 }); } },
  floating_shard: { w: 3, d: 3, fn: (c, P, r) => { const y = R(8 + r() * 6); c.box(1, y, 1, 1, 4, 1, P.glow, { e: 0.9 }); c.box(0, y + 1, 0, 3, 2, 3, P.accent, { e: 0.6, a: 0.85 }); } },
  void_orb: { w: 4, d: 4, fn: (c, P) => { c.box(0, 0, 0, 4, 1, 4, 0x0a0614); c.box(1, 3, 1, 2, 2, 2, 0x000000); c.box(0, 4, 1, 4, 1, 2, P.glow, { e: 1, a: 0.7 }); c.box(1, 4, 0, 2, 1, 4, P.glow, { e: 1, a: 0.7 }); } },
  glow_mushroom: { w: 6, d: 6, fn: (c, P, r) => { c.box(2, 0, 2, 2, 5, 2, 0xd9f0e6); c.box(0, 5, 0, 6, 2, 6, P.glow, { e: 0.9 }); c.box(1, 7, 1, 4, 1, 4, P.accent, { e: 0.9 }); if (r() > 0.4) { c.box(5, 0, 5, 1, 3, 1, 0xd9f0e6); c.box(4, 3, 4, 3, 1, 3, P.glow, { e: 0.9 }); } } },
  spore_pod: { w: 4, d: 4, fn: (c, P) => { c.box(1, 0, 1, 2, 1, 2, 0x1d5a3a); c.box(0, 1, 0, 4, 4, 4, P.accent, { e: 0.5, a: 0.85 }); c.box(1, 2, 1, 2, 2, 2, P.glow, { e: 1 }); } },
  root_arch: { w: 12, d: 3, fn: (c) => { c.box(0, 0, 0, 2, 14, 3, 0x3a2a1a); c.box(10, 0, 0, 2, 14, 3, 0x3a2a1a); c.box(0, 14, 0, 12, 2, 3, 0x4a3520); c.box(3, 12, 1, 1, 2, 1, 0x2f7d3a); c.box(8, 11, 1, 1, 3, 1, 0x2f7d3a); } },
  amber_crystal: { w: 6, d: 6, fn: (c, P, r) => { c.box(1, 0, 1, 4, 5, 4, P.accent, { e: 0.5, a: 0.9 }); c.box(2, 5, 2, 2, R(3 + r() * 3), 2, P.glow, { e: 0.8, a: 0.9 }); c.box(0, 0, 3, 2, 3, 2, P.accent, { e: 0.4, a: 0.9 }); } },
  mine_cart: { w: 10, d: 7, fn: (c, P) => { c.box(0, 0, 0, 10, 1, 7, 0x2a2a2a); c.box(0, 1, 0, 10, 4, 1, 0x6a4a2a, { m: 0.3 }); c.box(0, 1, 6, 10, 4, 1, 0x6a4a2a, { m: 0.3 }); c.box(0, 1, 1, 1, 4, 5, 0x6a4a2a); c.box(9, 1, 1, 1, 4, 5, 0x6a4a2a); c.box(1, 1, 1, 8, 2, 5, P.accent, { e: 0.4 }); } },
  support_beam: { w: 12, d: 3, fn: (c) => { c.box(0, 0, 0, 2, 16, 3, 0x6a4a2a); c.box(10, 0, 0, 2, 16, 3, 0x6a4a2a); c.box(0, 16, 0, 12, 2, 3, 0x7a5a32); } },
};

function makeInteractable(type, P) {
  return {
    type,
    key: `dp:inter:${type}:${P.glow}`,
    build: (c) => {
      if (type === 'chest') { c.box(0, 0, 0, 8, 5, 5, 0x6a4420); c.box(0, 5, 0, 8, 2, 5, 0x7a5228); c.box(0, 3, 0, 8, 1, 5, 0x3a3a3a, { m: 0.6 }); c.box(3, 2, 5, 2, 2, 1, P.glow, { e: 1, m: 0.8 }); }
      else { c.box(0, 0, 0, 6, 2, 6, shade(P.wall, 1.4)); c.box(1, 2, 1, 4, 3, 4, P.accent, { m: 0.5 }); c.box(2, 5, 2, 2, 3, 2, P.glow, { e: 1 }); }
    },
    w: type === 'chest' ? 8 : 6, d: type === 'chest' ? 5 : 6,
  };
}

// ---------- room ----------
function parseDoors(doors, W, H) {
  const out = [];
  const list = Array.isArray(doors) ? doors : [];
  for (const d of list) {
    let dir = typeof d === 'string' ? d : (d && (d.dir || d.side || d.direction));
    dir = String(dir || '').toLowerCase();
    const map = { n: 'n', north: 'n', up: 'n', s: 's', south: 's', down: 's', e: 'e', east: 'e', right: 'e', w: 'w', west: 'w', left: 'w' };
    dir = map[dir];
    if (!dir) continue;
    if (!out.find((o) => o.dir === dir)) out.push({ dir, off: d && typeof d.offset === 'number' ? d.offset : 0 });
  }
  return out;
}

export function buildDungeonRoomMeshes(roomData, themeId) {
  const rd = roomData || {};
  const theme = themeOf(themeId || rd.theme);
  const P = theme.palette;
  const w = Math.max(6, Math.min(40, Number(rd.w) || 16));
  const h = Math.max(6, Math.min(40, Number(rd.h || rd.d) || 12));
  const seed = rd.seed != null ? rd.seed : hashStr(`${theme.id}${w}${h}`);
  const rng = rngFrom(seed);
  const doors = parseDoors(rd.doors, w, h);
  const doorKey = doors.map((d) => d.dir + d.off).join('');
  const WV = w * 10, HV = h * 10, WALL_T = 4, WALL_H = 18, GAP = 18;
  const ox = -w / 2, oz = -h / 2;

  const group = new THREE.Group();
  group.name = 'dungeon_room';
  const wallColliders = [];
  const doorAnchors = [];

  // wall segments (voxel units) per side, split by door gaps
  const segs = []; // {x,z,w,d} voxel, origin corner
  const sides = {
    n: { len: WV, mk: (a, l) => ({ x: a, z: 0, w: l, d: WALL_T }) },
    s: { len: WV, mk: (a, l) => ({ x: a, z: HV - WALL_T, w: l, d: WALL_T }) },
    w: { len: HV, mk: (a, l) => ({ x: 0, z: a, w: WALL_T, d: l }) },
    e: { len: HV, mk: (a, l) => ({ x: WV - WALL_T, z: a, w: WALL_T, d: l }) },
  };
  for (const k of Object.keys(sides)) {
    const sd = sides[k];
    const door = doors.find((d) => d.dir === k);
    const minMid = WALL_T + GAP / 2 + 2;
    const maxMid = sd.len - WALL_T - GAP / 2 - 2;
    const mid = Math.max(minMid, Math.min(maxMid, Math.round(sd.len / 2 + (door ? door.off * 10 : 0))));
    const ranges = door ? [[0, mid - GAP / 2], [mid + GAP / 2, sd.len]] : [[0, sd.len]];
    for (const [a, b] of ranges) if (b - a > 0) segs.push({ side: k, ...sd.mk(a, b - a) });
    if (door) {
      const t = (mid / 10);
      const pos = { n: [ox + t, oz + 0.6], s: [ox + t, oz + h - 0.6], w: [ox + 0.6, oz + t], e: [ox + w - 0.6, oz + t] }[k];
      doorAnchors.push({ x: pos[0], z: pos[1], dir: k });
    }
  }
  for (const s of segs) {
    wallColliders.push({ x: ox + (s.x + s.w / 2) * V, z: oz + (s.z + s.d / 2) * V, w: s.w * V, d: s.d * V });
  }

  // floor + walls: one batched group
  const shell = buildBatchedGroup(`dp:shell:${theme.id}:${w}x${h}:${doorKey}:${seed}`, (c) => {
    const r = rngFrom(seed + 1);
    for (let tx = 0; tx < w; tx++) for (let tz = 0; tz < h; tz++) {
      const k = 0.88 + r() * 0.2 + ((tx + tz) & 1 ? 0.06 : 0);
      c.box(tx * 10, -1, tz * 10, 10, 1, 10, shade(P.floor, k));
    }
    for (const s of segs) {
      c.box(s.x, 0, s.z, s.w, WALL_H, s.d, shade(P.wall, 0.95));
      c.box(s.x, WALL_H, s.z, s.w, 2, s.d, shade(P.wall, 1.25));
      // wall trim
      if (s.side === 'n' || s.side === 's') c.box(s.x, 1, s.side === 'n' ? s.z + s.d : s.z - 1, s.w, 1, 1, P.accent);
      else c.box(s.side === 'w' ? s.x + s.d : s.x - 1, 1, s.z, 1, 1, s.w, P.accent);
    }
    // corner pillars
    for (const [px, pz] of [[0, 0], [WV - 6, 0], [0, HV - 6], [WV - 6, HV - 6]]) {
      c.box(px, 0, pz, 6, WALL_H + 4, 6, shade(P.wall, 1.15));
      c.box(px + 1, WALL_H + 4, pz + 1, 4, 1, 4, P.glow, { e: 0.7 });
    }
    // door frames
    for (const d of doors) {
      const sideLen = d.dir === 'n' || d.dir === 's' ? WV : HV;
      const minMid = WALL_T + GAP / 2 + 2;
      const maxMid = sideLen - WALL_T - GAP / 2 - 2;
      const mid = Math.max(minMid, Math.min(maxMid, Math.round(sideLen / 2 + d.off * 10)));
      if (d.dir === 'n' || d.dir === 's') {
        const z = d.dir === 'n' ? 0 : HV - WALL_T;
        c.box(mid - GAP / 2 - 1, 0, z, 1, WALL_H, WALL_T, P.accent); c.box(mid + GAP / 2, 0, z, 1, WALL_H, WALL_T, P.accent);
        c.box(mid - GAP / 2, 14, z, GAP, 4, WALL_T, shade(P.wall, 1.1)); c.box(mid - 1, 18, z + 1, 2, 1, 2, P.glow, { e: 1 });
      } else {
        const x = d.dir === 'w' ? 0 : WV - WALL_T;
        c.box(x, 0, mid - GAP / 2 - 1, WALL_T, WALL_H, 1, P.accent); c.box(x, 0, mid + GAP / 2, WALL_T, WALL_H, 1, P.accent);
        c.box(x, 14, mid - GAP / 2, WALL_T, 4, GAP, shade(P.wall, 1.1)); c.box(x + 1, 18, mid - 1, 2, 1, 2, P.glow, { e: 1 });
      }
    }
  });
  shell.position.set(ox, 0, oz);
  group.add(shell);

  // props: scattered along walls/corners, away from door lanes and the room centre
  const count = Math.max(4, Math.min(16, Math.round(w * h / 14)));
  const placed = [];
  const nearDoor = (x, z) => doorAnchors.some((d) => Math.hypot(d.x - x, d.z - z) < 2.2);
  let guard = 0;
  while (placed.length < count && guard++ < count * 12) {
    const type = theme.propSet[Math.floor(rng() * theme.propSet.length)];
    const def = PROPS[type];
    if (!def) continue;
    const ring = rng() < 0.6;
    let x, z;
    if (ring) { // along walls
      const side = Math.floor(rng() * 4);
      const a = rng();
      if (side === 0) { x = ox + 0.6 + a * (w - 1.2); z = oz + 0.5 + def.d * V / 2; }
      else if (side === 1) { x = ox + 0.6 + a * (w - 1.2); z = oz + h - 0.5 - def.d * V / 2; }
      else if (side === 2) { x = ox + 0.5 + def.w * V / 2; z = oz + 0.6 + a * (h - 1.2); }
      else { x = ox + w - 0.5 - def.w * V / 2; z = oz + 0.6 + a * (h - 1.2); }
    } else {
      x = ox + 1.5 + rng() * (w - 3); z = oz + 1.5 + rng() * (h - 3);
      if (Math.hypot(x, z) < 1.8) continue;
    }
    if (nearDoor(x, z)) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 1.1)) continue;
    const variant = Math.floor(rng() * 4);
    const g = buildBatchedGroup(`dp:prop:${theme.id}:${type}:${variant}`, (c) => def.fn(c, P, rngFrom(variant * 977 + hashStr(type))));
    g.position.set(x - def.w * V / 2, 0, z - def.d * V / 2);
    g.rotation.y = 0;
    group.add(g);
    placed.push({ x, z });
    // solid footprint for bulky props
    if (def.w * def.d >= 36 && ['sarcophagus', 'stone_idol', 'step_altar', 'server_rack', 'mine_cart', 'lava_vent', 'obsidian'].includes(type)) {
      wallColliders.push({ x, z, w: def.w * V, d: def.d * V });
    }
  }

  // interactables: chest + shrine
  const interactables = [];
  const addInter = (type, x, z, radius) => {
    const it = makeInteractable(type, P);
    const m = buildBatchedGroup(it.key, it.build);
    m.position.set(x - it.w * V / 2, 0, z - it.d * V / 2);
    group.add(m);
    interactables.push({ type, x, z, radius, mesh: m });
  };
  const cx = ox + 1.5 + rng() * (w - 3), cz = oz + 1.2 + rng() * 1.2;
  addInter('chest', cx, cz, 1.0);
  if (rd.type === 'shrine' || rd.type === 'boss' || rng() > 0.5) addInter('shrine', -(cx), -(cz) * 0.5, 1.2);

  return {
    group, wallColliders, doorAnchors, interactables, theme,
    dispose() { if (group.parent) group.parent.remove(group); },
  };
}

// ---------- arena ----------
export function buildArenaProps(arenaThemeId) {
  const theme = themeOf(arenaThemeId);
  const P = theme.palette;
  const radius = 9;
  const group = new THREE.Group();
  group.name = 'arena_props';
  const pillars = [];
  const N = 6, pr = 5.2;
  const pillar = buildBatchedGroup(`dp:arena:pillar:${theme.id}`, (c) => {
    c.box(0, 0, 0, 8, 2, 8, shade(P.wall, 1.2));
    c.box(1, 2, 1, 6, 22, 6, P.wall);
    c.box(0, 24, 0, 8, 2, 8, shade(P.wall, 1.2));
    c.box(2, 26, 2, 4, 2, 4, P.glow, { e: 0.9 });
    c.box(1, 8, 1, 6, 1, 6, P.accent);
  });
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * pr, z = Math.sin(a) * pr;
    const g = i === 0 ? pillar : pillar.clone();
    g.position.set(x - 0.4, 0, z - 0.4);
    group.add(g);
    pillars.push({ x, z, r: 0.45 });
  }
  // outer decor ring
  const rng = rngFrom(hashStr(theme.id));
  for (let i = 0; i < 10; i++) {
    const type = theme.propSet[i % theme.propSet.length];
    const def = PROPS[type]; if (!def) continue;
    const a = (i / 10) * Math.PI * 2 + rng() * 0.3;
    const g = buildBatchedGroup(`dp:prop:${theme.id}:${type}:0`, (c) => def.fn(c, P, rngFrom(hashStr(type))));
    g.position.set(Math.cos(a) * (radius - 0.6) - def.w * V / 2, 0, Math.sin(a) * (radius - 0.6) - def.d * V / 2);
    group.add(g);
  }
  return { group, pillars, radius, theme, dispose() { if (group.parent) group.parent.remove(group); } };
}

// ---------- enemies ----------
// part spec: {name, pivot:[x,y,z] (voxel), fn(c,P)}; parts built about their own pivot.
const ENEMIES = {
  skeleton_raptor: {
    hit: 0.7, c: [0xe8e2d0, 0x9a927a, 0xff3030],
    parts: (B) => [
      { n: 'body', p: [0, 10, 0], fn: (c) => { c.box(-3, 0, -8, 6, 5, 14, B[0]); for (let i = 0; i < 4; i++) c.box(-4, 1, -7 + i * 3, 8, 1, 1, B[1]); c.box(-1, 5, -8, 2, 2, 14, B[1]); } },
      { n: 'head', p: [0, 16, 6], fn: (c) => { c.box(-2, -1, 0, 4, 4, 5, B[0]); c.box(-2, -2, 5, 4, 1, 4, B[0]); c.box(-1, 0, 2, 1, 1, 1, B[2], { e: 1 }); c.box(1, 0, 2, 1, 1, 1, B[2], { e: 1 }); c.box(-1, -2, 5, 2, 1, 1, 0x111111); } },
      { n: 'tail', p: [0, 13, -8], fn: (c) => { c.box(-1, 0, -10, 2, 2, 10, B[0]); c.box(-1, 1, -14, 1, 1, 4, B[1]); } },
      { n: 'legL', p: [-3, 10, -1], fn: (c) => { c.box(-1, -10, -1, 2, 10, 2, B[1]); c.box(-1, -10, -1, 2, 1, 5, B[0]); } },
      { n: 'legR', p: [3, 10, -1], fn: (c) => { c.box(-1, -10, -1, 2, 10, 2, B[1]); c.box(-1, -10, -1, 2, 1, 5, B[0]); } },
    ],
  },
  rune_golem: {
    hit: 1.0, c: [0x6a6258, 0x4a443c, 0x4df0c0],
    parts: (B) => [
      { n: 'body', p: [0, 12, 0], fn: (c) => { c.box(-6, 0, -4, 12, 12, 8, B[0]); c.box(-5, 3, 4, 3, 3, 1, B[2], { e: 1 }); c.box(1, 6, 4, 3, 1, 1, B[2], { e: 1 }); c.box(-1, 8, 4, 1, 3, 1, B[2], { e: 1 }); c.box(-7, 10, -4, 14, 3, 8, B[1]); } },
      { n: 'head', p: [0, 25, 0], fn: (c) => { c.box(-3, -1, -3, 6, 5, 6, B[1]); c.box(-2, 1, 3, 1, 1, 1, B[2], { e: 1 }); c.box(1, 1, 3, 1, 1, 1, B[2], { e: 1 }); } },
      { n: 'armL', p: [-9, 22, 0], fn: (c) => { c.box(-2, -12, -2, 4, 12, 4, B[0]); c.box(-3, -16, -3, 6, 4, 6, B[1]); } },
      { n: 'armR', p: [9, 22, 0], fn: (c) => { c.box(-2, -12, -2, 4, 12, 4, B[0]); c.box(-3, -16, -3, 6, 4, 6, B[1]); } },
      { n: 'legL', p: [-3, 12, 0], fn: (c) => { c.box(-2, -12, -2, 4, 12, 4, B[1]); } },
      { n: 'legR', p: [3, 12, 0], fn: (c) => { c.box(-2, -12, -2, 4, 12, 4, B[1]); } },
    ],
  },
  acid_slime: {
    hit: 0.6, c: [0x6fe04a, 0xb8ff7a, 0x153a10],
    parts: (B) => [
      { n: 'body', p: [0, 0, 0], fn: (c) => { c.box(-6, 0, -6, 12, 4, 12, B[0], { a: 0.8, e: 0.25 }); c.box(-5, 4, -5, 10, 3, 10, B[0], { a: 0.8, e: 0.25 }); c.box(-3, 7, -3, 6, 2, 6, B[1], { a: 0.8, e: 0.4 }); c.box(-2, 3, -2, 3, 3, 3, B[2], { a: 0.9 }); c.box(-3, 5, 5, 2, 2, 1, 0x000000); c.box(1, 5, 5, 2, 2, 1, 0x000000); } },
      { n: 'drip', p: [4, 4, 4], fn: (c) => { c.box(0, -4, 0, 2, 4, 2, B[1], { a: 0.8, e: 0.5 }); } },
      { n: 'bubble', p: [-3, 9, 0], fn: (c) => { c.box(0, 0, 0, 2, 2, 2, B[1], { a: 0.6, e: 0.7 }); } },
    ],
  },
  cyber_sentinel: {
    hit: 0.8, c: [0x2a3042, 0x00e5ff, 0xff2bd6],
    parts: (B) => [
      { n: 'body', p: [0, 14, 0], fn: (c) => { c.box(-4, 0, -3, 8, 10, 6, B[0], { m: 0.7 }); c.box(-2, 4, 3, 4, 2, 1, B[1], { e: 1 }); c.box(-5, 8, -3, 10, 2, 6, 0x1a1e2c, { m: 0.8 }); } },
      { n: 'head', p: [0, 25, 0], fn: (c) => { c.box(-3, 0, -3, 6, 4, 6, 0x1a1e2c, { m: 0.8 }); c.box(-3, 1, 3, 6, 1, 1, B[2], { e: 1 }); } },
      { n: 'orbL', p: [-9, 20, 0], fn: (c) => { c.box(-2, -2, -2, 4, 4, 4, B[0], { m: 0.7 }); c.box(-1, -1, 2, 2, 2, 1, B[1], { e: 1 }); } },
      { n: 'orbR', p: [9, 20, 0], fn: (c) => { c.box(-2, -2, -2, 4, 4, 4, B[0], { m: 0.7 }); c.box(-1, -1, 2, 2, 2, 1, B[1], { e: 1 }); } },
      { n: 'thruster', p: [0, 8, 0], fn: (c) => { c.box(-3, -3, -3, 6, 3, 6, 0x1a1e2c, { m: 0.8 }); c.box(-2, -7, -2, 4, 4, 4, B[1], { e: 1, a: 0.7 }); } },
    ],
  },
  void_shade: {
    hit: 0.7, c: [0x1b0f33, 0xc084fc, 0x7c3aed],
    parts: (B) => [
      { n: 'body', p: [0, 10, 0], fn: (c) => { c.box(-4, 0, -3, 8, 8, 6, B[0], { a: 0.85 }); c.box(-3, -4, -2, 6, 4, 4, B[0], { a: 0.7 }); c.box(-2, -7, -1, 4, 3, 2, B[2], { a: 0.6, e: 0.4 }); } },
      { n: 'head', p: [0, 19, 0], fn: (c) => { c.box(-3, 0, -3, 6, 5, 6, B[0], { a: 0.9 }); c.box(-2, 2, 3, 1, 2, 1, B[1], { e: 1 }); c.box(1, 2, 3, 1, 2, 1, B[1], { e: 1 }); c.box(-4, 5, -1, 1, 3, 2, B[2], { e: 0.6 }); c.box(3, 5, -1, 1, 3, 2, B[2], { e: 0.6 }); } },
      { n: 'wispL', p: [-6, 14, 0], fn: (c) => { c.box(-4, -3, -1, 4, 6, 2, B[2], { a: 0.7, e: 0.5 }); } },
      { n: 'wispR', p: [6, 14, 0], fn: (c) => { c.box(0, -3, -1, 4, 6, 2, B[2], { a: 0.7, e: 0.5 }); } },
    ],
  },
  fossil_knight: {
    hit: 0.9, c: [0xcdbf9a, 0x8a7c58, 0x5af0ff],
    parts: (B) => [
      { n: 'body', p: [0, 12, 0], fn: (c) => { c.box(-5, 0, -3, 10, 10, 6, B[0]); for (let i = 0; i < 4; i++) c.box(-6, 1 + i * 2, -4, 12, 1, 1, B[1]); c.box(-1, 4, 3, 2, 2, 1, B[2], { e: 1 }); } },
      { n: 'head', p: [0, 22, 0], fn: (c) => { c.box(-3, 0, -3, 6, 5, 6, B[0]); c.box(-4, 5, -3, 8, 1, 6, B[1]); c.box(-1, 5, -3, 2, 3, 6, B[2], { e: 0.5 }); c.box(-2, 2, 3, 4, 1, 1, B[2], { e: 1 }); } },
      { n: 'armL', p: [-7, 21, 0], fn: (c) => { c.box(-2, -10, -2, 4, 10, 4, B[0]); c.box(-5, -9, -3, 3, 8, 6, B[1], { m: 0.3 }); } },
      { n: 'armR', p: [7, 21, 0], fn: (c) => { c.box(-1, -10, -1, 2, 10, 2, B[0]); c.box(-1, -10, 0, 2, 18, 1, B[2], { m: 0.6, e: 0.4 }); } },
      { n: 'legL', p: [-3, 12, 0], fn: (c) => { c.box(-2, -12, -2, 4, 12, 4, B[1]); } },
      { n: 'legR', p: [3, 12, 0], fn: (c) => { c.box(-2, -12, -2, 4, 12, 4, B[1]); } },
    ],
  },
};
const ALIASES = { skeleton: 'skeleton_raptor', raptor: 'skeleton_raptor', golem: 'rune_golem', slime: 'acid_slime', sentinel: 'cyber_sentinel', shade: 'void_shade', knight: 'fossil_knight' };

export function buildDungeonEnemyModel(archetypeId, themeId) {
  let key = norm(archetypeId);
  if (!ENEMIES[key]) key = ALIASES[key] || Object.keys(ALIASES).map((a) => (key.includes(a) ? ALIASES[a] : null)).find(Boolean) || themeOf(themeId).enemy || 'skeleton_raptor';
  const E = ENEMIES[key];
  const root = new THREE.Group();
  root.name = `enemy_${key}`;
  const inner = new THREE.Group();
  root.add(inner);
  const parts = {};
  const base = {};
  for (const sp of E.parts(E.c)) {
    const g = buildBatchedGroup(`dp:enemy:${key}:${sp.n}`, (c) => sp.fn(c));
    const pivot = new THREE.Group();
    pivot.position.set(sp.p[0] * V, sp.p[1] * V, sp.p[2] * V);
    pivot.add(g);
    inner.add(pivot);
    parts[sp.n] = pivot;
    base[sp.n] = pivot.position.clone();
  }
  function animate(t, state) {
    state = state || 'idle';
    const p = parts;
    inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0); inner.scale.set(1, 1, 1);
    for (const n in p) { p[n].position.copy(base[n]); p[n].rotation.set(0, 0, 0); p[n].scale.set(1, 1, 1); }
    const s = Math.sin(t * 3), s2 = Math.sin(t * 6);
    if (state === 'dead') {
      inner.rotation.z = 1.4; inner.position.y = 0.1; inner.scale.setScalar(0.95);
      return;
    }
    if (key === 'acid_slime') {
      const sq = 1 + s * 0.08;
      p.body.scale.set(1 / sq, sq, 1 / sq);
      p.drip.position.y = base.drip.y + Math.sin(t * 2) * 0.05;
      p.bubble.position.y = base.bubble.y + (t * 0.3 % 0.5);
      if (state === 'attack') p.body.scale.set(1.3, 0.7, 1.3);
    } else if (key === 'void_shade') {
      inner.position.y = 0.15 + s * 0.06;
      p.wispL.rotation.z = s2 * 0.3; p.wispR.rotation.z = -s2 * 0.3;
      p.head.rotation.y = Math.sin(t * 1.5) * 0.3;
    } else if (key === 'cyber_sentinel') {
      inner.position.y = 0.15 + s * 0.05;
      p.orbL.position.y = base.orbL.y + Math.sin(t * 4) * 0.06; p.orbR.position.y = base.orbR.y - Math.sin(t * 4) * 0.06;
      p.head.rotation.y = Math.sin(t) * 0.5;
      p.thruster.scale.y = 1 + Math.abs(s2) * 0.3;
    } else {
      const sw = Math.sin(t * 5) * 0.5;
      if (p.legL) { p.legL.rotation.x = sw; p.legR.rotation.x = -sw; }
      inner.position.y = Math.abs(Math.sin(t * 5)) * 0.03;
      if (p.head) p.head.rotation.y = Math.sin(t * 1.2) * 0.25;
      if (p.tail) p.tail.rotation.y = Math.sin(t * 4) * 0.5;
      if (p.armL) { p.armL.rotation.x = -sw * 0.6; p.armR.rotation.x = sw * 0.6; }
    }
    if (state === 'attack') {
      const a = Math.sin(t * 14);
      inner.rotation.x = 0.25 + a * 0.15;
      if (p.armR) p.armR.rotation.x = -1.8 + a * 0.4;
      if (p.head && key === 'skeleton_raptor') p.head.rotation.x = 0.5 + a * 0.3;
    } else if (state === 'hurt') {
      inner.position.x = Math.sin(t * 50) * 0.04;
      inner.rotation.x = -0.2;
    }
  }
  return {
    root, hitBoxRadius: E.hit, archetype: key, animate,
    dispose() { if (root.parent) root.parent.remove(root); },
  };
}
