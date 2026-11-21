// Acessórios voxel esculpidos (1 design único por ID) com compilação em lote.
// Cada acessório vira <= 4 draw calls: standard(vc) / standard metálico(vc) / basic emissivo(vc) / translúcido(vc).
// Convenção de eixos (igual ao DinoFactory): o dino olha para -Z, costas/cauda em +Z, Y para cima. 1 voxel = 0.1 unidade.
import * as THREE from 'three';

export const U = 0.1;
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const TEMPLATES = new Map();
const MATS = {};

function mats() {
  if (!MATS.std) {
    MATS.std = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.75, metalness: 0.05 });
    MATS.metal = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.32, metalness: 0.6 });
    MATS.glow = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
    MATS.glass = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false });
  }
  return MATS;
}

// ---------------------------------------------------------------- compilador em lote
export function compileVoxelBoxes(boxes) {
  const pos = UNIT_BOX.attributes.position, nor = UNIT_BOX.attributes.normal, idx = UNIT_BOX.index;
  const vC = pos.count, iC = idx.count;
  const buckets = { std: [], metal: [], glow: [], glass: [] };
  for (const b of boxes) {
    const o = b.o || {};
    const a = o.a == null ? 1 : o.a, e = o.e || 0, m = o.m || 0;
    (a < 1 ? buckets.glass : e >= 0.35 ? buckets.glow : m >= 0.4 ? buckets.metal : buckets.std).push(b);
  }
  const M = mats(), parts = [], tmp = new THREE.Color();
  for (const key of Object.keys(buckets)) {
    const items = buckets[key];
    if (!items.length) continue;
    const n = items.length;
    const P = new Float32Array(n * vC * 3), N = new Float32Array(n * vC * 3), C = new Float32Array(n * vC * 3);
    const I = new Uint32Array(n * iC);
    items.forEach((b, bi) => {
      tmp.setHex(b.c);
      const sx = b.w * U, sy = b.h * U, sz = b.d * U;
      const cx = (b.x + b.w / 2) * U, cy = (b.y + b.h / 2) * U, cz = (b.z + b.d / 2) * U;
      for (let v = 0; v < vC; v++) {
        const k = (bi * vC + v) * 3;
        P[k] = pos.array[v * 3] * sx + cx; P[k + 1] = pos.array[v * 3 + 1] * sy + cy; P[k + 2] = pos.array[v * 3 + 2] * sz + cz;
        N[k] = nor.array[v * 3]; N[k + 1] = nor.array[v * 3 + 1]; N[k + 2] = nor.array[v * 3 + 2];
        C[k] = tmp.r; C[k + 1] = tmp.g; C[k + 2] = tmp.b;
      }
      for (let i = 0; i < iC; i++) I[bi * iC + i] = idx.array[i] + bi * vC;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.setIndex(new THREE.BufferAttribute(I, 1));
    g.computeBoundingSphere();
    parts.push({ geometry: g, material: M[key] });
  }
  return parts;
}

function lerpHex(a, b, t) {
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return (r << 16) | (g << 8) | bl;
}

function makeCollector(finish) {
  const boxes = [];
  const hsl = new THREE.Color();
  const add = (x, y, z, w, h, d, c, o) => {
    let col = c, oo = o ? { ...o } : {};
    if (finish === 'gilded') {
      if ((oo.e || 0) < 0.35) { col = lerpHex(c, 0xfacc15, 0.55); oo.m = 0.9; }
    } else if (finish === 'prism') {
      hsl.setHSL((((x + w / 2) * 0.045 + (y + h / 2) * 0.07 + (z + d / 2) * 0.035) % 1 + 1) % 1, 0.85, 0.62);
      col = hsl.getHex(); oo.e = Math.max(oo.e || 0, 0.5); oo.a = 0.82;
    }
    boxes.push({ x, y, z, w, h, d, c: col, o: oo });
  };
  const c = {
    boxes,
    box: add,
    // box + espelho em X (simetria)
    m(x, y, z, w, h, d, col, o) { add(x, y, z, w, h, d, col, o); if (Math.abs(x + w / 2) > 1e-6) add(-(x + w), y, z, w, h, d, col, o); }
  };
  return c;
}

/** Cria um Group a partir de um template compilado e cacheado. buildFn(c) usa c.box/c.m em unidades de voxel. */
export function buildBatchedGroup(cacheKey, buildFn, finish = 'base') {
  const key = `${cacheKey}|${finish}`;
  if (!TEMPLATES.has(key)) {
    const c = makeCollector(finish);
    buildFn(c);
    TEMPLATES.set(key, compileVoxelBoxes(c.boxes));
  }
  const g = new THREE.Group();
  for (const p of TEMPLATES.get(key)) {
    const mesh = new THREE.Mesh(p.geometry, p.material);
    mesh.castShadow = p.material !== mats().glass;
    g.add(mesh);
  }
  return g;
}

// ---------------------------------------------------------------- primitivas de escultura
const R = Math.round;
function pts2(r, th = 0.55, ry = r) {
  const out = [], n = Math.ceil(Math.max(r, ry)) + 1;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const d = Math.hypot(i / r, j / ry) * Math.min(r, ry);
    if (Math.abs(d - Math.min(r, ry)) <= th) out.push([i, j]);
  }
  return out;
}
function put(c, plane, cx, cy, cz, i, j, col, o, s = 1, t = 1) {
  if (plane === 'xy') c.box(cx + i, cy + j, cz, 1, 1, s, col, o);
  else if (plane === 'xz') c.box(cx + i, cy, cz + j, 1, s, 1, col, o);
  else c.box(cx, cy + i, cz + j, s, 1, 1, col, o);
}
/** anel (ou elipse) oco de voxels no plano xy | xz | yz */
function ring(c, cx, cy, cz, r, col, plane = 'xy', o, th = 0.55, s = 1, ry = r) {
  for (const [i, j] of pts2(r, th, ry)) put(c, plane, cx, cy, cz, i, j, col, o, s);
}
function disc(c, cx, cy, cz, r, col, plane = 'xy', o, s = 1) {
  const n = Math.ceil(r);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) if (Math.hypot(i, j) <= r + 0.2) put(c, plane, cx, cy, cz, i, j, col, o, s);
}
/** arco elíptico parcial (graus) */
function arc(c, cx, cy, cz, rx, ry, a0, a1, col, o, s = 1, th = 1, plane = 'xy') {
  const steps = Math.ceil(Math.abs(a1 - a0) / 6);
  const seen = new Set();
  for (let k = 0; k <= steps; k++) {
    const a = ((a0 + (a1 - a0) * k / steps) * Math.PI) / 180;
    const i = R(Math.cos(a) * rx), j = R(Math.sin(a) * ry), key = i + ',' + j;
    if (seen.has(key)) continue; seen.add(key);
    if (plane === 'xy') c.box(cx + i, cy + j, cz, th, th, s, col, o);
    else if (plane === 'xz') c.box(cx + i, cy, cz + j, th, s, th, col, o);
    else c.box(cx, cy + i, cz + j, s, th, th, col, o);
  }
}
/** linha 3D de voxels */
function line(c, x0, y0, z0, x1, y1, z1, col, o, th = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    c.box(R(x0 + (x1 - x0) * t), R(y0 + (y1 - y0) * t), R(z0 + (z1 - z0) * t), th, th, th, col, o);
  }
}
/** bitmap (linhas de cima para baixo). map: char->cor ou [cor,opts]. plano xy (z fixo) */
function bmp(c, rows, x0, yTop, z, map, d = 1, plane = 'xy') {
  rows.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) {
      const v = map[row[i]];
      if (!v) continue;
      const [col, o] = Array.isArray(v) ? v : [v];
      if (plane === 'xy') c.box(x0 + i, yTop - r - 1, z, 1, 1, d, col, o);
      else c.box(z, yTop - r - 1, x0 + i, d, 1, 1, col, o); // plano zy: i -> z
    }
  });
}
function stack(c, layers, x0, y0, z0, col, o) { // layers: [w,d,h?] centrados
  let y = y0;
  for (const L of layers) {
    const [w, d, h = 1, cc = col, oo = o] = L;
    c.box(x0 - w / 2, y, z0 - d / 2, w, h, d, cc, oo);
    y += h;
  }
  return y;
}
function sphere(c, cx, cy, cz, r, col, o, col2) {
  const n = Math.ceil(r);
  for (let x = -n; x <= n; x++) for (let y = -n; y <= n; y++) for (let z = -n; z <= n; z++) {
    if (x * x + y * y + z * z <= r * r + 0.3) c.box(cx + x, cy + y, cz + z, 1, 1, 1, col2 && (x + y + z) % 3 === 0 ? col2 : col, o);
  }
}
function pointyRadial(c, cx, cy, cz, r, n, len, col, o, tip) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let l = 0; l < len; l++) {
      const rr = r + l;
      const w = l === len - 1 ? 0.6 : 1;
      c.box(R(cx + ca * rr) - 0.0, cy, R(cz + sa * rr), w + 0.4 * (len - l > 1 ? 1 : 0), 1, w + 0.4 * (len - l > 1 ? 1 : 0), l === len - 1 ? (tip || col) : col, l === len - 1 ? o : o);
    }
  }
}

// paleta
const GOLD = 0xfacc15, GOLD2 = 0xd4a017, DGOLD = 0xa16207, STEEL = 0x94a3b8, DSTEEL = 0x475569, DARK = 0x1e1b2e, BLACK = 0x0f172a, WHITE = 0xffffff;
const RED = 0xe63946, DRED = 0x9f1239, BLUE = 0x3a86ff, DBLUE = 0x1e3a8a, CYAN = 0x22d3ee, ICE = 0xa5f3fc, TEAL = 0x14b8a6, GREEN = 0x22c55e, DGREEN = 0x166534;
const BROWN = 0x7c4a21, TAN = 0xd4a373, CREAM = 0xf5ecd0, PURPLE = 0x7e22ce, VIOLET = 0xa78bfa, PINK = 0xf472b6, ORANGE = 0xf97316, YELLOW = 0xfde047;
const GLOW = (e = 0.9) => ({ e });
const TR = (e = 0.5, a = 0.55) => ({ e, a });
const MET = { m: 0.9 };

// ---------------------------------------------------------------- CABEÇA  (x∈[-3.5,3.5], topo y=0, z: frente -3.5, trás +3.5)
const HEAD = {
  cap(c) {
    c.box(-3.5, 0, -3.2, 7, 1, 6.7, DBLUE); c.box(-3.1, 1, -2.8, 6.2, 1, 6, BLUE); c.box(-2.3, 2, -2.2, 4.6, 0.8, 4.8, BLUE); c.box(-1.2, 2.8, -1.2, 2.4, 0.5, 2.4, 0x2563eb);
    c.box(-0.5, 3.3, -0.5, 1, 0.6, 1, RED);
    c.box(-3.1, 0, -4.4, 6.2, 0.7, 1.3, DBLUE); c.box(-2.6, 0, -5.4, 5.2, 0.7, 1, 0x1d4ed8); c.box(-1.7, 0, -6.1, 3.4, 0.7, 0.8, 0x1d4ed8); c.box(-2, -0.15, -5, 4, 0.3, 1.5, GOLD, MET);
    bmp(c, ['.##.', '####', '####', '.##.'], -2, 2.8, -3.3, { '#': RED });
    for (const [x, y] of [[-1.6, 0.6], [1.6, 0.6], [-1.6, 2.4], [1.6, 2.4], [0, 2.7]]) c.box(x - 0.2, y, -3.5, 0.4, 0.4, 0.2, GOLD);
  },
  cowboy_hat(c) {
    c.box(-4.5, 0, -4.5, 9, 0.6, 9, 0xb7791f);
    c.m(-5.6, 0.6, -3.2, 1.1, 0.9, 6.4, 0xb7791f); c.m(-6.4, 1.5, -2.6, 0.9, 0.8, 5.2, 0xc58a2b);
    c.box(-3, 0.6, -5.4, 6, 0.8, 1, 0xb7791f); c.box(-3, 0.6, 4.4, 6, 0.8, 1, 0xb7791f);
    c.box(-2.5, 0.6, -2.5, 5, 3, 5, 0xc58a2b);
    c.box(-2.5, 3.6, -2.5, 1.7, 0.9, 5, 0xc58a2b); c.box(0.8, 3.6, -2.5, 1.7, 0.9, 5, 0xc58a2b); c.box(-0.8, 3.3, -2.3, 1.6, 0.4, 4.6, 0x8a5a14);
    c.box(-2.65, 0.6, -2.65, 5.3, 1, 5.3, 0x4a2c0e);
    c.box(-0.9, 0.5, -2.95, 1.8, 1.2, 0.35, GOLD, MET); c.box(-0.4, 0.8, -3.05, 0.8, 0.6, 0.2, BLACK);
  },
  explorer_hat(c) {
    c.box(-4.8, 0, -4.8, 9.6, 0.6, 9.6, 0xd6c28a);
    stack(c, [[7.4, 7.4, 0.9, 0xe6d6a0], [6.6, 6.6, 0.9, 0xe6d6a0], [5.4, 5.4, 0.9, 0xe6d6a0], [3.8, 3.8, 0.8, 0xe6d6a0], [1.4, 1.4, 0.6, 0xc9b676]], 0, 0.6, 0);
    c.box(-3.8, 0.6, -3.8, 7.6, 0.7, 7.6, 0x9a3412);
    c.box(-0.5, 0.3, -4, 1, 0.9, 0.3, GOLD, MET);
    line(c, 3.6, 1, -0.5, 5.2, 5, 1, GREEN); line(c, 3.9, 1, -0.5, 5.7, 4.5, 1.3, 0x4ade80);
    c.box(5.1, 5, 0.9, 0.9, 0.9, 0.9, ORANGE); c.box(4.5, 3, -0.4, 0.7, 0.7, 0.7, 0x4ade80); c.box(5.7, 3.6, 0.5, 0.7, 0.7, 0.7, 0x4ade80);
  },
  wizard_hat(c) {
    c.box(-5, 0, -5, 10, 0.6, 10, 0x5b21b6);
    c.box(-3.2, 0.6, -3.2, 6.4, 0.7, 6.4, GOLD, MET);
    for (let i = 0; i < 7; i++) {
      const w = 6.4 - i * 0.85, off = i * i * 0.1;
      c.box(-w / 2, 1.3 + i * 0.95, -w / 2 + off, w, 0.95, w, i % 2 ? 0x6d28d9 : 0x5b21b6);
    }
    c.box(-0.4, 7.9, 1.9, 0.8, 0.9, 0.8, 0x7c3aed); c.box(-0.3, 8.7, 2.5, 0.6, 0.8, 0.6, VIOLET);
    for (const [x, y, z] of [[-1, 2.2, -3.4], [1.5, 3.9, -2.6], [-2, 4.2, -2.4], [0.2, 5.8, -1.7]]) { c.box(x, y, z, 0.7, 0.7, 0.25, YELLOW, GLOW(1)); c.box(x + 0.2, y - 0.3, z, 0.3, 1.3, 0.2, YELLOW, GLOW(1)); }
    c.box(-0.4, 5.8, -1.9, 0.5, 0.5, 0.2, WHITE, GLOW(1));
  },
  chef_hat(c) {
    c.box(-3.1, 0, -3.1, 6.2, 1.3, 6.2, 0xf1f5f9);
    for (let i = 0; i < 7; i++) c.box(-3.5 + i, 1.3, -3.5, 1, 3.2, 7, i % 2 ? 0xffffff : 0xe2e8f0);
    for (let i = 0; i < 9; i++) c.box(-4.5 + i, 4.5, -4.5, 1, 1.7, 9, i % 2 ? 0xffffff : 0xe2e8f0);
    c.box(-3.5, 6.2, -3.5, 7, 0.8, 7, 0xffffff); c.box(-2, 7, -2, 4, 0.6, 4, 0xf8fafc);
    c.box(-3.2, 0.2, -3.25, 6.4, 0.3, 0.2, RED);
  },
  beanie(c) {
    c.box(-3.7, 0, -3.7, 7.4, 1.3, 7.4, 0x0ea5e9);
    for (let i = 0; i < 7; i++) { c.box(-3.5 + i + 0.2, 0, -3.85, 0.5, 1.3, 0.2, 0x0369a1); c.box(-3.5 + i + 0.2, 0, 3.65, 0.5, 1.3, 0.2, 0x0369a1); c.box(-3.85, 0, -3.5 + i + 0.2, 0.2, 1.3, 0.5, 0x0369a1); c.box(3.65, 0, -3.5 + i + 0.2, 0.2, 1.3, 0.5, 0x0369a1); }
    c.box(-3.3, 1.3, -3.3, 6.6, 0.4, 6.6, 0xe0f2fe);
    c.box(-3.1, 1.7, -3.1, 6.2, 1, 6.2, 0xf8fafc); c.box(-2.5, 2.7, -2.5, 5, 0.9, 5, 0xe2e8f0); c.box(-1.7, 3.6, -1.7, 3.4, 0.8, 3.4, 0xf8fafc);
    c.box(-1.3, 4.4, -1.3, 2.6, 2.6, 2.6, WHITE); c.box(-0.8, 7, -0.8, 1.6, 0.6, 1.6, 0xe2e8f0); c.box(-1.6, 5, -0.6, 0.5, 1.2, 1.2, 0xf1f5f9); c.box(1.1, 5, -0.6, 0.5, 1.2, 1.2, 0xf1f5f9);
  },
  bandana(c) {
    c.box(-3.7, -1.3, -3.7, 7.4, 1.6, 7.4, RED);
    bmp(c, ['.#####.', '..###..', '...#...'], -2.5, -0.9, -3.9, { '#': RED }); // ponta frontal
    for (let i = 0; i < 6; i++) { c.box(-3.2 + i * 1.3, -0.6, -3.85, 0.5, 0.5, 0.2, WHITE); c.box(-2.5 + i * 1.3, 0, 3.55, 0.5, 0.5, 0.35, WHITE); }
    c.box(3.6, -1.1, 0, 1.4, 1.4, 1.4, DRED);
    c.box(4.5, -2.4, 0.7, 0.9, 2.2, 0.8, RED); c.box(5.1, -3.6, 1.4, 0.8, 2, 0.8, 0xdc2626); c.box(4.1, -2.9, -0.4, 0.8, 1.7, 0.8, RED); c.box(3.8, -4.3, -0.9, 0.8, 1.7, 0.8, 0xdc2626);
  },
  flower_crown(c) {
    ring(c, 0, 0.1, 0, 3.8, DGREEN, 'xz', null, 0.7, 1);
    const cols = [PINK, WHITE, VIOLET, ORANGE, 0xfb7185, YELLOW, 0x93c5fd, PINK];
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, x = R(Math.cos(a) * 3.8), z = R(Math.sin(a) * 3.8), pc = cols[k];
      c.box(x, 1.1, z, 1, 1, 1, YELLOW);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.box(x + dx, 1.1, z + dz, 1, 1, 1, pc);
      c.box(x + (k % 2 ? 1 : -1), 0.5, z + (k % 2 ? 1 : -1), 1, 0.6, 1, GREEN);
    }
  },
  halo(c) {
    const e = GLOW(0.95);
    ring(c, 0, 3.5, 0, 4.4, YELLOW, 'xz', e, 0.5, 1); ring(c, 0, 3.5, 0, 3.5, GOLD, 'xz', e, 0.5, 1); ring(c, 0, 3, 0, 3.9, 0xfff7c2, 'xz', TR(0.8, 0.4), 0.5, 0.6);
  },
  viking_horn(c) {
    stack(c, [[7, 7, 1.3, 0x64748b], [6, 6, 1, 0x64748b], [4.2, 4.2, 0.8, 0x94a3b8]], 0, 0, 0, 0x64748b, MET);
    c.box(-3.6, 0.5, -3.6, 7.2, 0.5, 7.2, GOLD2, MET); c.box(-0.5, -1.2, -3.8, 1, 2.2, 0.4, 0x94a3b8, MET);
    for (let i = -3; i <= 3; i += 1.5) c.box(i - 0.3, 0.6, -3.9, 0.6, 0.6, 0.3, GOLD);
    c.m(3.5, 0.4, -0.7, 1.7, 1.5, 1.5, 0xeadfc2); c.m(5.1, 1.2, -0.6, 1.5, 1.4, 1.3, 0xf3ead2); c.m(6.3, 2.2, -0.5, 1.2, 1.5, 1.1, 0xeadfc2); c.m(6.9, 3.5, -0.4, 0.9, 1.5, 0.9, 0xfff7e0);
    c.m(3.4, 0.3, -0.8, 0.5, 1.7, 1.7, GOLD2, MET);
  },
  antenna(c) {
    c.box(-1.2, 0, -1.2, 2.4, 0.7, 2.4, DSTEEL, MET);
    for (let i = 0; i < 6; i++) c.box(i % 2 ? -0.9 : -0.3, 0.7 + i * 0.7, i % 2 ? -0.3 : -0.9, 1.2, 0.6, 1.2, i % 2 ? 0xb45309 : 0xea580c, MET);
    c.box(-0.3, 5, -0.3, 0.6, 3, 0.6, STEEL, MET);
    ring(c, 0, 8, -0.4, 2.2, STEEL, 'xy', MET, 0.55, 0.7); disc(c, 0, 8, 0.1, 1.4, 0xcbd5e1, 'xy', MET, 0.5); c.box(-0.4, 7.6, -1.6, 0.8, 0.8, 1.4, DSTEEL);
    c.box(-0.5, 10.4, -0.5, 1, 1, 1, RED, GLOW(1)); c.box(-0.25, 9.8, -0.25, 0.5, 0.7, 0.5, DSTEEL);
  },
  tophat(c) {
    c.box(-4.5, 0, -4.5, 9, 0.7, 9, 0x111827);
    c.box(-3, 0.7, -3, 6, 5.2, 6, 0x1f2937); c.box(-3.25, 5.4, -3.25, 6.5, 0.6, 6.5, 0x111827);
    c.box(-3.1, 0.7, -3.1, 6.2, 1.1, 6.2, RED); c.box(-1, 0.8, -3.3, 2, 0.9, 0.3, GOLD, MET); c.box(-0.5, 1, -3.4, 1, 0.5, 0.2, 0x111827);
    c.box(-2.4, 2.5, -3.05, 0.5, 3, 0.2, 0x374151);
  },
  crown(c) {
    c.box(-3.5, 0, -3.5, 7, 1.5, 7, GOLD, MET); c.box(-3.7, 0, -3.7, 7.4, 0.4, 7.4, GOLD2, MET);
    for (let k = -3; k <= 3; k++) for (const s of [-3.5, 2.5]) {
      const tall = (k % 2 === 0) ? 3.4 : 2.2;
      c.box(k - 0.5, 1.5, s, 1, tall, 1, GOLD, MET); c.box(s, 1.5, k - 0.5, 1, tall, 1, GOLD, MET);
    }
    c.box(-0.5, 5, -3.5, 1, 1, 1, WHITE, GLOW(0.8)); c.box(-3.5, 5, -0.5, 1, 1, 1, RED, GLOW(0.8)); c.box(2.5, 5, -0.5, 1, 1, 1, CYAN, GLOW(0.8)); c.box(-0.5, 5, 2.5, 1, 1, 1, 0x4ade80, GLOW(0.8));
    c.box(-0.7, 0.4, -3.7, 1.4, 0.8, 0.3, RED, GLOW(0.6)); c.box(-2.4, 0.5, -3.7, 0.6, 0.6, 0.3, BLUE, GLOW(0.6)); c.box(1.8, 0.5, -3.7, 0.6, 0.6, 0.3, BLUE, GLOW(0.6));
  },
  helmet(c) {
    stack(c, [[7.4, 7.4, 1.4, 0x64748b], [7, 7, 1.2, 0x7b8aa0], [5.6, 5.6, 1, 0x7b8aa0], [3.6, 3.6, 0.7, 0x94a3b8]], 0, -1.4, 0, 0x64748b, MET);
    c.box(-3, -1.1, -3.9, 6, 1.2, 0.5, 0x0f172a); c.box(-0.5, 0, -0.5, 1, 3.4, 5, 0xb91c1c, MET); c.box(-0.4, 3.3, 0.5, 0.8, 0.6, 3, 0xdc2626);
    c.m(3.6, -3, -1.5, 0.7, 2.6, 3, 0x64748b, MET); for (const x of [-3, -1, 1, 3]) c.box(x - 0.3, 0.1, -3.7, 0.6, 0.6, 0.3, GOLD);
    c.box(-3.7, -1.6, -3.7, 7.4, 0.35, 7.4, GOLD2, MET);
  },
  pirate_hat(c) {
    c.box(-3, 0, -3, 6, 2.2, 6, 0x111827); c.box(-3.1, 0, -3.1, 6.2, 0.5, 6.2, GOLD2);
    c.box(-5.2, 0.7, -2.5, 2.2, 1.4, 5, 0x1f2937); c.box(3, 0.7, -2.5, 2.2, 1.4, 5, 0x1f2937);
    c.box(-4.2, 2.1, -2, 1.2, 1, 4, 0x1f2937); c.box(3, 2.1, -2, 1.2, 1, 4, 0x1f2937);
    c.box(-3.4, 0.6, -5.8, 6.8, 1.5, 2.8, 0x1f2937); c.box(-2.6, 2.1, -5.3, 5.2, 1.2, 2.3, 0x1f2937); c.box(-3.4, 0.6, -5.9, 6.8, 0.3, 0.3, GOLD); c.box(-3.4, 2.0, -5.5, 6.8, 0.3, 0.3, GOLD);
    bmp(c, ['.###.', '#.#.#', '.###.', '.#.#.'], -2.5, 3.4, -3.15, { '#': WHITE }); c.box(-0.4, 1.5, -3.2, 0.2, 0.2, 0.2, BLACK);
    line(c, -3.5, 2.8, 1, -5.2, 5.8, 3, RED); c.box(-5.6, 5.8, 2.8, 0.8, 0.8, 0.8, 0xf87171);
  },
  samurai_kabuto(c) {
    stack(c, [[7.2, 7.2, 1.2, 0x312e81], [6.4, 6.4, 1.1, 0x3730a3], [4.6, 4.6, 0.9, 0x3730a3], [2.4, 2.4, 0.6, 0x1e1b4b]], 0, -0.8, 0, 0x312e81, MET);
    for (let i = 0; i < 7; i++) c.box(-3.4 + i, -0.8, -3.65, 0.2, 3.4, 0.2, 0x4f46e5); c.box(-3.8, -1.3, -3.8, 7.6, 0.5, 7.6, GOLD2, MET);
    c.box(-4.8, -1.8, 2.3, 9.6, 0.9, 2.4, 0x3730a3, MET); c.box(-5.2, -2.7, 2.7, 10.4, 0.9, 2.2, 0x312e81, MET); c.box(-5.6, -3.6, 3.1, 11.2, 0.9, 2, 0x3730a3, MET);
    c.m(3.8, -1.9, -2.8, 1.2, 2, 3, 0x312e81, MET);
    bmp(c, ['#.....#', '##...##', '.##.##.', '..###..', '...#...'], -3, 7, -3.7, { '#': [GOLD, MET] }); c.box(-0.4, 0.8, -3.75, 0.8, 4, 0.3, GOLD, MET);
  },
  lunar_helmet(c) {
    const e = TR(0.15, 0.5);
    [[4, 4], [5.4, 5.4], [6.4, 6.4], [7, 7], [7.2, 7.2], [7.2, 7.2], [7.2, 7.2], [7, 7], [6.4, 6.4], [5.6, 5.6]].forEach(([w, d], i) => c.box(-w / 2, -8.2 + i * 1, -d / 2, w, 1, d, 0xbae6fd, e));
    c.box(-4, -9.2, -4, 8, 1, 8, 0xe2e8f0, MET); c.box(-4.2, -9.8, -4.2, 8.4, 0.6, 8.4, 0x94a3b8, MET);
    c.box(-3.4, -4.8, -4.15, 6.8, 3.6, 0.5, GOLD2, TR(0.35, 0.7)); c.box(-3, -2.2, -4.05, 2.6, 0.5, 0.3, 0xfff7c2, GLOW(0.8));
    c.box(-0.4, 1.8, 0, 0.8, 2, 0.8, 0xcbd5e1, MET); c.box(-0.6, 3.8, -0.6, 1.2, 1.2, 1.2, RED, GLOW(1));
    c.m(4.1, -6.3, -0.5, 0.9, 1.4, 1.4, 0xcbd5e1, MET); c.box(-1.5, -9.6, -4.4, 1, 0.6, 0.4, 0x4ade80, GLOW(1)); c.box(0.5, -9.6, -4.4, 1, 0.6, 0.4, RED, GLOW(1));
  },
  aztec_headdress(c) {
    c.box(-3.7, -0.5, -3.7, 7.4, 1.5, 7.4, GOLD2, MET);
    for (let i = 0; i < 7; i++) c.box(-3.4 + i + 0.1, -0.2, -3.85, 0.6, 0.9, 0.25, i % 2 ? TEAL : 0x34d399, GLOW(0.35));
    const cols = [0x16a34a, 0x0d9488, 0x22c55e, 0x14b8a6, 0x16a34a, 0x0d9488, 0x22c55e];
    for (let k = 0; k < 9; k++) {
      const a = (-70 + k * 17.5) * Math.PI / 180, L = 6.5 - Math.abs(k - 4) * 0.45;
      for (let l = 1; l <= L; l++) c.box(R(Math.sin(a) * (l + 1.5)) - 0.5, 1 + R(Math.cos(a) * (l + 1.5)), 0.6, 1, 1, 0.9, l > L - 1.5 ? (k % 2 ? RED : 0xfbbf24) : cols[k % 7]);
    }
    disc(c, 0, 2.2, -3.9, 1.7, GOLD, 'xy', { ...MET, e: 0 }, 0.4); disc(c, 0, 2.2, -4.2, 0.7, RED, 'xy', GLOW(0.5), 0.3);
    c.box(-3, -3.5, 3.6, 6, 3.5, 0.6, 0x16a34a); for (let i = 0; i < 6; i++) c.box(-3 + i, -4.5, 3.6, 0.7, 1, 0.5, i % 2 ? 0xfbbf24 : 0xdc2626);
  },
  spore_crown(c) {
    c.box(-3.4, -0.4, -3.4, 6.8, 1, 6.8, 0x44403c);
    const cols = [[RED, WHITE], [ORANGE, YELLOW], [VIOLET, 0xf5d0fe], [0xfb7185, WHITE], [CYAN, WHITE]];
    [[-2.5, -2.5, 3.2], [2.4, -2.4, 4.4], [0, 0, 5.6], [-2.4, 2.4, 4], [2.5, 2.5, 3]].forEach(([x, z, h], i) => {
      c.box(x - 0.5, 0.6, z - 0.5, 1, h - 1, 1, 0xf5ecd0);
      const w = 2 + (i % 2) + 1.5; c.box(x - w / 2, h - 0.4, z - w / 2, w, 0.9, w, cols[i][0]); c.box(x - w / 2 + 0.7, h + 0.5, z - w / 2 + 0.7, w - 1.4, 0.6, w - 1.4, cols[i][0]);
      c.box(x - 0.5, h + 0.55, z - 0.5, 0.7, 0.4, 0.7, cols[i][1]); c.box(x + w / 2 - 0.4, h - 0.3, z, 0.5, 0.5, 0.5, cols[i][1]);
    });
    for (const [x, y, z] of [[-1, 8, 1], [2, 9, -1], [0, 10.5, 0], [-2.5, 7.4, -1.5], [3, 7.7, 1.5]]) c.box(x, y, z, 0.5, 0.5, 0.5, 0xd9f99d, TR(0.8, 0.6));
  },
  thunder_crest(c) {
    c.box(-3.4, -0.2, -3.4, 6.8, 1, 6.8, DSTEEL, MET);
    const rows = ['.##', '##.', '.##', '.#.', '##.'];
    [[-3, 5], [-1.2, 7], [0.6, 8], [2, 6]].forEach(([z, h], i) => {
      for (let y = 0; y < h; y++) c.box(((y + i) % 2 ? 0.2 : -0.6), 0.8 + y, z, 1.2, 1, 1.2, y > h - 3 ? WHITE : YELLOW, GLOW(1));
    });
    c.m(2.5, 1.5, -1, 0.8, 2.5, 0.8, CYAN, GLOW(0.9)); c.m(3.2, 3, 0, 0.6, 1.5, 0.6, WHITE, GLOW(1)); c.box(-0.3, -0.3, -3.7, 0.6, 0.6, 0.3, YELLOW, GLOW(1));
  },
  feather_plume(c) {
    c.box(-3.4, -0.4, -3.4, 6.8, 1, 6.8, 0x1e3a8a); c.box(-1, 0, -3.6, 2, 1.2, 0.3, GOLD, MET); c.box(-0.5, 0.2, -3.7, 1, 0.8, 0.2, RED, GLOW(0.6));
    const g = [CYAN, 0x38bdf8, VIOLET, 0xc084fc, PINK, 0xf472b6];
    for (let t = 0; t < 12; t++) {
      const y = 1 + Math.sin(t / 11 * 1.9) * 7, z = -1 + t * 0.9, col = g[Math.min(5, (t / 2) | 0)];
      c.box(2.5 + t * 0.15, R(y), R(z), 1, 1, 1, WHITE);
      c.box(3.4 + t * 0.15, R(y) - (t > 6 ? 1 : 0), R(z), 1.4 - t * 0.05, 1, 1, col); c.box(1.2 + t * 0.15 - 0.6, R(y), R(z), 1.4, 1, 1, col);
    }
  },
  cosmic_horns(c) {
    const col = [0x4c1d95, 0x6d28d9, 0x7c3aed, 0xa78bfa];
    for (let i = 0; i < 5; i++) c.m(2.2 + i * 1.1 + (i > 2 ? i * 0.3 : 0), 0.2 + i * 1.6 - (i === 4 ? 0 : 0), -0.8, 1.9 - i * 0.28, 1.8, 1.9 - i * 0.28, col[Math.min(3, i)]);
    c.m(7.8, 7, -0.3, 0.8, 1, 0.8, CYAN, GLOW(1)); c.m(3, 1.6, -0.5, 0.4, 0.4, 0.4, WHITE, GLOW(1)); c.m(5, 3.5, -0.3, 0.4, 0.4, 0.4, WHITE, GLOW(1)); c.m(6.3, 5.3, -0.2, 0.4, 0.4, 0.4, PINK, GLOW(1));
    c.box(-3.3, -0.3, -3.3, 6.6, 0.8, 6.6, 0x1e1b4b); disc(c, 0, 1.4, -3.5, 1, CYAN, 'xy', GLOW(0.9), 0.4);
  },
  void_horns(c) {
    const K = 0x050510, V = { e: 0.9 };
    c.m(2.5, 0.3, -1, 1.7, 2, 1.7, K); c.m(3.4, 2.2, -0.9, 1.4, 2.4, 1.4, K); c.m(4.4, 4.4, -0.8, 1, 2.6, 1, K); c.m(5.1, 6.6, -0.6, 0.6, 1.6, 0.6, K);
    c.m(0.8, 0.3, 1.6, 1.2, 3, 1.2, K); c.m(1.2, 3.2, 2.2, 0.8, 2.2, 0.8, K); c.m(1.8, 0.3, -2.8, 0.9, 2.4, 0.9, K);
    c.m(3, 1.3, -0.3, 0.4, 2.3, 0.4, 0xd946ef, V); c.m(4.9, 4.8, -0.2, 0.4, 1.7, 0.4, 0xd946ef, V); c.box(-0.5, 0.2, -3.6, 1, 1.5, 0.3, 0xd946ef, V);
    c.box(-3.3, -0.3, -3.3, 6.6, 0.8, 6.6, 0x1a0b2e);
  }
};

// ---------------------------------------------------------------- ROSTO (frente em z=0, afasta para -z; y=0 linha dos olhos; olhos em x=±2.2)
const FACE = {
  monocle(c) {
    ring(c, 2.2, 0, -0.5, 2.1, GOLD, 'xy', MET, 0.6, 0.8); disc(c, 2.2, 0, -0.35, 1.6, 0xbae6fd, 'xy', TR(0.25, 0.4), 0.3);
    c.box(1.5, 0.6, -0.3, 0.6, 0.6, 0.2, WHITE, GLOW(0.9));
    c.box(2.1, -2.7, -0.5, 0.7, 0.7, 0.7, GOLD, MET);
    for (let i = 0; i < 7; i++) c.box(2.8 + i * 0.4, -3.4 - i * 0.9, -0.5 + i * 0.5, 0.6, 0.6, 0.6, i % 2 ? GOLD : GOLD2, MET);
  },
  snorkel(c) {
    ring(c, 0, -0.2, -0.6, 4.3, 0x0ea5e9, 'xy', null, 0.6, 1, 2.6); ring(c, 0, -0.2, -0.6, 3.4, 0x075985, 'xy', null, 0.5, 1, 1.8);
    c.box(-3.3, -1.6, -0.4, 6.6, 3.4, 0.3, 0xbae6fd, TR(0.2, 0.4)); c.box(-3, 1, -0.5, 1.8, 0.4, 0.2, WHITE, GLOW(0.9));
    c.box(-1, -2.8, -1, 2, 0.8, 1, 0x075985);
    c.box(4.5, -2, 0.3, 1, 8.6, 1.1, 0xfb923c); c.box(4.5, 6.6, 0.3, 1, 1.2, 1.1, YELLOW); c.box(3.5, -3, -0.7, 1.1, 1, 1.4, 0xfb923c); c.box(2.4, -3.8, -1.6, 1.6, 1.1, 1.6, 0xea580c); c.box(2.4, -4.4, -1.8, 1.6, 0.7, 1.9, 0x1f2937);
    c.box(-4.6, -1, 0.4, 1, 1.6, 4, 0x075985);
  },
  headphones(c) {
    arc(c, 0, -2.4, 3.4, 4.4, 4.7, 0, 180, 0x334155, null, 1.6, 1.2, 'xy'); arc(c, 0, -2.6, 3.4, 4.4, 4.2, 20, 160, 0xef4444, null, 1.2, 0.6, 'xy');
    c.m(3.7, -4.8, 2, 1.8, 4.2, 3.4, 0x1f2937); c.m(3.5, -4.4, 2.3, 0.4, 3.4, 2.8, 0xfb7185); c.m(4.5, -3.8, 2.7, 0.4, 2.2, 1.6, 0xef4444, GLOW(0.6));
    line(c, -4.4, -7, 2.4, -3.2, -8.4, -0.5, 0x1f2937); c.box(-3.6, -8.8, -1.4, 1.2, 1, 1.2, 0x0f172a); c.box(-3.4, -8.7, -1.6, 0.8, 0.7, 0.3, RED, GLOW(1));
  },
  visor_neon(c) {
    c.box(-4, -1.4, -0.9, 8, 2.8, 0.9, 0x0f172a); c.box(-3.2, 1.4, -0.8, 6.4, 0.5, 0.7, 0x0f172a); c.box(-3.2, -1.9, -0.8, 6.4, 0.5, 0.7, 0x0f172a);
    c.box(-3.6, -1, -1.1, 7.2, 2, 0.3, CYAN, GLOW(0.95)); c.box(-3, 0, -1.3, 6, 0.4, 0.2, WHITE, GLOW(1)); c.box(-1.5, 0.9, -1.3, 3, 0.25, 0.2, 0xe879f9, GLOW(1));
    c.m(4, -1.4, 0, 0.9, 2.8, 3.8, 0x0f172a); c.m(4.1, -0.6, 1, 0.3, 0.5, 1.5, 0xe879f9, GLOW(1));
  },
  star_shades(c) {
    const S = ['..#..', '..#..', '#####', '.###.', '.#.#.'];
    for (const x of [-4.7, 0.3]) { bmp(c, S.map(r => r), x, 2.6, -0.9, { '#': 0x1f2937 }); }
    for (const x of [-4.1, 0.9]) bmp(c, ['.#.', '###', '.#.'], x, 1.8, -1.1, { '#': [PINK, TR(0.8, 0.7)] });
    for (const x of [-4.7, 0.3]) { c.box(x + 2, 2.6, -1, 1, 1, 0.6, GOLD, MET); }
    c.box(-0.6, 0.5, -0.9, 1.2, 0.7, 0.6, GOLD, MET); c.m(4.3, 0.5, -0.6, 0.6, 0.6, 3.6, GOLD, MET);
  },
  vr_visor(c) {
    c.box(-4.3, -2.2, -2.3, 8.6, 4.4, 2.5, 0x111827); c.box(-3.9, -1.8, -2.5, 7.8, 3.6, 0.4, 0x1e293b);
    c.box(-3.5, -1.4, -2.7, 7.2, 2.8, 0.3, 0x0ea5e9, GLOW(0.7)); c.box(-3, 0.2, -2.9, 6, 0.25, 0.2, WHITE, GLOW(1)); c.box(-3.3, -1.1, -2.9, 2, 0.3, 0.2, CYAN, GLOW(1));
    c.box(-1.2, -2.8, -1.8, 2.4, 1, 1.4, 0x111827); c.m(4.3, -1.5, -1.2, 0.5, 3, 4.2, 0x1f2937); c.box(3, 2.2, -2.2, 0.6, 0.4, 0.5, 0x4ade80, GLOW(1)); c.box(3.8, 2.2, -2.2, 0.6, 0.4, 0.5, RED, GLOW(1));
  },
  glasses(c) {
    for (const x of [-4.6, 0.6]) { c.box(x, -1.7, -0.9, 4, 3.4, 0.7, 0x0f172a); c.box(x + 0.4, -2.1, -0.8, 3.2, 0.5, 0.6, 0x0f172a); c.box(x + 0.4, 1.5, -0.8, 3.2, 0.5, 0.6, 0x0f172a); c.box(x + 0.6, 0.3, -1, 1.2, 0.9, 0.2, 0x38bdf8, GLOW(0.4)); }
    c.box(-0.7, 0.3, -0.9, 1.4, 0.7, 0.6, 0x1f2937); c.m(4.6, 0.6, -0.4, 0.5, 0.7, 3.6, 0x1f2937);
  },
  diving_mask(c) {
    c.box(-4.6, -3.4, -1.1, 9.2, 6, 1.2, 0x0e7490); c.box(-3.8, -2.7, -1.4, 7.6, 4.6, 0.4, 0xbae6fd, TR(0.2, 0.4)); c.box(-3.5, 1.2, -1.6, 2.5, 0.4, 0.2, WHITE, GLOW(0.9));
    c.box(-1.4, -4.6, -1.6, 2.8, 1.6, 1.4, 0x0e7490); c.box(-0.8, -5.2, -1.5, 1.6, 0.8, 1.2, 0x0891b2); c.box(-3.9, -3.7, -1.2, 7.8, 0.5, 0.4, 0x164e63);
    c.m(4.6, -2.4, 0.2, 0.9, 3.6, 3.6, 0x164e63); c.box(-0.5, 2.6, -1.1, 1, 0.5, 0.4, 0xfacc15);
  },
  steam_goggles(c) {
    for (const x of [-2.4, 2.4]) {
      ring(c, x, 0, -1, 2.4, 0xb45309, 'xy', MET, 0.6, 1.2); ring(c, x, 0, -1.4, 1.7, GOLD2, 'xy', MET, 0.5, 0.5); disc(c, x, 0, -1.2, 1.5, 0x4ade80, 'xy', TR(0.7, 0.55), 0.4);
      for (let k = 0; k < 4; k++) c.box(x + R(Math.cos(k * 1.57 + 0.78) * 2.4) - 0.2, R(Math.sin(k * 1.57 + 0.78) * 2.4) - 0.2, -1.9, 0.4, 0.4, 0.3, GOLD);
    }
    c.box(-0.5, -0.4, -1.1, 1, 0.8, 0.8, 0xb45309, MET); c.m(4.8, -0.8, -0.2, 0.7, 1.6, 4.2, 0x451a03);
    ring(c, 5.5, 2.4, 0.2, 1.4, GOLD2, 'yz', MET, 0.6, 0.6); c.box(5.3, 2.2, 0.0, 0.6, 0.6, 0.6, GOLD);
  },
  crystal_visor(c) {
    c.box(-3.7, -1.5, -1.2, 7.4, 3, 0.5, 0x22d3ee, TR(0.6, 0.55)); c.box(-3, 1.5, -1, 6, 0.8, 0.5, 0x67e8f9, TR(0.6, 0.55)); c.box(-2.2, 2.3, -0.9, 4.4, 0.6, 0.4, 0xa5f3fc, TR(0.7, 0.55));
    c.box(-3.2, -2.3, -1, 6.4, 0.8, 0.5, 0x0891b2, TR(0.6, 0.55)); c.box(-4.2, -0.6, -0.5, 0.8, 2.2, 1.4, 0x67e8f9, TR(0.6, 0.55)); c.box(3.4, -0.6, -0.5, 0.8, 2.2, 1.4, 0x67e8f9, TR(0.6, 0.55));
    c.box(-1, 0, -1.6, 2, 0.4, 0.3, WHITE, GLOW(1)); c.box(-3.2, 0.6, -1.5, 0.5, 1.6, 0.3, WHITE, GLOW(1)); c.m(2.7, -1.2, -1.5, 0.4, 1.4, 0.3, WHITE, GLOW(1));
  }
};

// ---------------------------------------------------------------- PESCOÇO (frente = -z; centro no pescoço, raio ~3.5)
const NECK = {
  bowtie(c) {
    ring(c, 0, 0, 0, 3.5, 0xf8fafc, 'xz', null, 0.7, 1);
    c.m(1, -1, -4.2, 1.2, 1.8, 1, RED); c.m(2.2, -1.5, -4.2, 1.2, 2.8, 1, RED); c.m(3.4, -2, -4.2, 1.2, 3.8, 1, 0xdc2626);
    for (const x of [2.4, 3.6]) c.m(x, -0.5, -4.35, 0.4, 0.4, 0.2, WHITE);
    c.box(-0.9, -1.2, -4.5, 1.8, 2.4, 1.6, DRED); c.box(-0.4, -0.7, -4.65, 0.8, 1.4, 0.2, RED);
  },
  gold_chain(c) {
    ring(c, 0, 0, 0, 3.5, GOLD2, 'xz', MET, 0.5, 0.7);
    for (let i = 0; i <= 6; i++) { const x = 3.4 - i * 0.55, y = -i * 1.1; c.m(x, y, -4 + (i > 3 ? -0.4 : 0), 0.9, 0.9, 0.9, i % 2 ? GOLD : GOLD2, MET); }
    bmp(c, ['..#..', '.###.', '#####', '.###.', '..#..'], -2.5, -6.2, -4.6, { '#': [RED, GLOW(0.5)] }, 0.8); c.box(-1.4, -6.4, -4.4, 2.8, 0.4, 0.3, GOLD, MET); c.box(-0.4, -4.9, -4.5, 0.8, 0.8, 0.5, GOLD, MET);
  },
  bell_collar(c) {
    ring(c, 0, 0, 0, 3.6, RED, 'xz', null, 0.7, 1.4);
    c.box(-0.6, -1.6, -4.3, 1.2, 1, 0.9, GOLD, MET);
    sphere(c, 0, -4, -4.9, 1.8, GOLD, MET, GOLD2); c.box(-1.4, -4.2, -6.5, 2.8, 0.35, 0.3, BLACK); c.box(-0.3, -4.8, -6.5, 0.6, 1.4, 0.3, BLACK);
    c.box(-0.5, -2.3, -4.6, 1, 0.8, 1, GOLD2, MET); c.box(-0.4, -6.2, -4.7, 0.8, 0.5, 0.8, DGOLD, MET);
  },
  spike_collar(c) {
    ring(c, 0, 0, 0, 3.7, 0x1f2937, 'xz', null, 0.7, 1.5);
    pointyRadial(c, 0, 0.3, 0, 4, 8, 2, 0x94a3b8, MET, WHITE);
    c.box(-0.7, -1.4, -4, 1.4, 1, 0.8, GOLD, MET);
  },
  lantern_neck(c) {
    ring(c, 0, 0, 0, 3.6, DSTEEL, 'xz', MET, 0.6, 1.2); line(c, -3, -0.5, -3, 0, -3.5, -4.4, DSTEEL, MET); line(c, 3, -0.5, -3, 0, -3.5, -4.4, DSTEEL, MET);
    c.box(-1.7, -4.2, -6.2, 3.4, 0.7, 3.4, 0x334155, MET); c.box(-1.7, -8.6, -6.2, 3.4, 0.7, 3.4, 0x334155, MET); c.box(-0.7, -3.6, -5.2, 1.4, 0.6, 1.4, DSTEEL, MET);
    for (const [x, z] of [[-1.7, -6.2], [1.1, -6.2], [-1.7, -3.4], [1.1, -3.4]]) c.box(x, -8.5, z, 0.6, 4.3, 0.6, 0x475569, MET);
    c.box(-0.9, -7.6, -5.4, 1.8, 2.6, 1.8, ORANGE, GLOW(0.9)); c.box(-0.45, -7, -4.95, 0.9, 1.6, 0.9, YELLOW, GLOW(1)); c.box(-0.2, -5, -4.7, 0.4, 0.5, 0.4, 0xfff7c2, GLOW(1));
  },
  amber_medallion(c) {
    ring(c, 0, 0, 0, 3.5, BROWN, 'xz', null, 0.5, 0.8); line(c, 3, 0, -2.5, 0, -3, -4.6, GOLD2, MET); line(c, -3, 0, -2.5, 0, -3, -4.6, GOLD2, MET);
    const hexf = [['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'], ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..']];
    bmp(c, hexf[0], -3.5, -3.4, -4.9, { '#': [0xf59e0b, TR(0.55, 0.75)] }, 0.7);
    bmp(c, hexf[1], -3.5, -3.4, -5.3, { '#': [GOLD2, MET] }, 0.5);
    c.box(-1, -6.2, -5.0, 2, 0.5, 0.4, 0x1c1917); c.box(-0.4, -5.9, -5.1, 0.8, 1.2, 0.4, 0x1c1917); c.m(0.4, -5.8, -5.1, 1.1, 0.6, 0.3, 0xfde68a, TR(0.4, 0.6)); c.box(-1.4, -6.1, -5.1, 0.6, 0.6, 0.3, 0x44403c);
  },
  scarf(c) {
    ring(c, 0, 0, 0, 3.6, RED, 'xz', null, 0.7, 1.4); ring(c, 0, -0.5, 0, 3.7, 0xf1f5f9, 'xz', null, 0.7, 0.4); ring(c, 0, 0.9, 0, 3.6, DRED, 'xz', null, 0.7, 0.5);
    c.box(3.2, -2, -2, 1.8, 2.2, 1.8, DRED);
    c.box(3.6, -1.6, 0, 1.6, 0.9, 7, RED); c.box(3.6, -2.5, 0.5, 1.6, 0.9, 7, 0xdc2626); c.box(3.6, -3.4, 1, 1.6, 0.9, 6, RED);
    for (let i = 0; i < 4; i++) c.box(3.6 + (i % 2) * 0.8, -4.3, 1.3 + i * 1.4, 0.7, 1.6, 0.4, GOLD);
    c.box(3.8, -1.7, 2, 1.4, 0.2, 0.7, WHITE); c.box(3.8, -1.7, 4.2, 1.4, 0.2, 0.7, WHITE);
  },
  jade_amulet(c) {
    ring(c, 0, 0, 0, 3.5, 0x14532d, 'xz', null, 0.5, 0.7); line(c, 3, 0, -2.5, 0, -3.4, -4.6, GOLD2, MET); line(c, -3, 0, -2.5, 0, -3.4, -4.6, GOLD2, MET);
    ring(c, 0, -6, -4.8, 2.7, GOLD2, 'xy', MET, 0.6, 0.6); disc(c, 0, -6, -4.6, 2.2, 0x10b981, 'xy', TR(0.4, 0.8), 0.6);
    c.box(-0.4, -7.7, -5.4, 0.8, 3.4, 0.4, 0xd1fae5, GLOW(0.6)); c.box(-1.7, -6.2, -5.4, 3.4, 0.7, 0.4, 0xd1fae5, GLOW(0.6));
    c.box(-0.3, -9.2, -4.8, 0.6, 1.2, 0.6, RED); c.box(-0.7, -10.2, -4.8, 1.4, 1, 0.6, RED); c.box(-0.5, -11.2, -4.8, 1, 0.7, 0.6, DRED);
  }
};

// ---------------------------------------------------------------- COSTAS (monta em y=0 no topo das costas, z>0 = trás, x = ±)
function featherWing(c, tiers, cols, spread = 1.5, base = 2, archH = 7, o) {
  for (let t = 0; t < tiers; t++) for (let i = 0; i < 7; i++) {
    const x = base + i * spread, y = 3 + Math.sin((i / 6) * 2.6) * archH * (1 - t * 0.12) - t * 1.8;
    const len = 3 + t * 2.2 + i * 0.35;
    c.m(x, y - len, 1 + t * 0.35, spread * 0.9, len, 0.6, cols[t % cols.length], o);
  }
}
function mkLeaf(c, x, y, z, col, dk) {
  bmp(c, ['..#..', '.###.', '#####', '#####', '.###.', '..#..'], x, y, z, { '#': col }, 0.7); c.box(x + 2, y - 5.5, z, 0.5, 5, 0.9, dk);
}
const BACK = {
  leaf_cape(c) {
    c.box(-3, -0.5, 0.6, 6, 1, 1, DGREEN);
    const gs = [0x15803d, 0x22c55e, 0x4ade80, 0x16a34a];
    for (let L = 0; L < 3; L++) for (let i = 0; i < 4 - L; i++) {
      mkLeaf(c, -2.6 - (3 - L) * 0.6 + i * (5.6 / (3 - L + 1)) * 1.2 - (3 - L) * 0.5, -0.5 - L * 3.2, 1.2 + L * 0.7, gs[(i + L) % 4], DGREEN);
    }
    mkLeaf(c, -2.5, -7, 3.4, 0x86efac, 0x16a34a);
  },
  quiver(c) {
    for (let y = 0; y < 8; y++) { const xo = 1 + y * 0.35; c.box(xo, -y - 0.5, 1, 2.8, 1, 2.8, y % 3 === 0 ? 0x6b3a1a : BROWN); c.box(xo + 0.5, -y - 0.5, 1.5, 1.8, 1, 1.8, 0x1c1917); }
    c.box(0.6, -9, 0.8, 3.4, 1, 3.4, 0x451a03); c.box(0.7, 0.4, 0.8, 3.6, 0.6, 3.6, 0x451a03);
    line(c, -2.5, 1.6, 0.5, 4, -6, 0.5, 0xd4a373, null, 1); line(c, -2.5, 2.1, 0.5, 4, -5.5, 0.5, 0x92400e); c.box(-0.9, -1.4, 0.2, 1, 1, 0.5, GOLD, MET);
    [[1.4, 5.5, 1.5, RED], [2.4, 6.5, 2.4, WHITE], [3.2, 5.2, 3.2, RED], [2.2, 4.5, 3.6, WHITE]].forEach(([x, h, z, col], i) => {
      c.box(x + 0.4, 0.5, z + 0.1, 0.5, h, 0.5, TAN); c.box(x, h - 2, z, 1.3, 2.6, 0.3, col); c.box(x + 0.1, h + 0.1, z - 0.1, 0.7, 0.7, 0.8, DSTEEL, MET);
    });
  },
  turtle_shell(c) {
    const L = [[9, 10, 1.2], [8, 9, 1.2], [6.4, 7.4, 1.1], [4.4, 5.2, 1]];
    let y = -0.5;
    L.forEach(([w, d, h], i) => {
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) c.box(-w / 2 + (w / 3) * a, y, 0.5 + (d / 3) * b, w / 3, h, d / 3, (a + b + i) % 2 ? 0x4d7c0f : 0x65a30d);
      y += h;
    });
    c.box(-4.8, -1.3, 0.2, 9.6, 0.9, 10.6, 0xd6c28a); c.box(-0.4, y, 2.4, 0.8, 0.5, 0.8, 0xa3e635);
    for (let i = 0; i < 4; i++) c.box(-3.5 + i * 2.4, -1.1, 0.0, 1, 0.5, 0.3, 0x92400e);
  },
  bat_wings(c) {
    const MEM = 0x3b0764, MEM2 = 0x581c87, BONE = 0xd6d3d1;
    for (let x = 2; x < 13; x++) {
      const top = 2 + Math.min(x - 2, 6) * 0.65 - Math.max(0, x - 9) * 0.9;
      const bot = -5 + 2.6 * Math.abs(Math.cos(((x - 2) / 3.3) * Math.PI));
      c.m(x, R(bot), 1, 1, R(top) - R(bot), 0.4, x % 2 ? MEM : MEM2);
    }
    line(c, 2, 2, 1, 8, 6, 1, BONE); c.m(8, 6, 1, 1.4, 1.4, 1.2, BONE); c.m(8.6, 7.4, 1, 0.8, 1.6, 0.8, 0xf5f5f4);
    for (const [tx, ty] of [[12, 2], [12, -2], [9, -5]]) line(c, 2, 2, 1.3, tx, ty, 1.3, 0x78716c);
    c.m(1.2, -1, 1, 1.6, 4, 1.4, 0x44403c);
  },
  angel_wings(c) {
    featherWing(c, 3, [WHITE, 0xf1f5f9, 0xe0f2fe]);
    c.m(1.4, -0.5, 1, 1.4, 4, 1.4, 0xf8fafc); c.m(7, 8, 1.2, 1.2, 1, 0.9, GOLD, GLOW(0.4));
  },
  crystal_wings(c) {
    const t = TR(0.7, 0.55);
    [[2, 2, 5, 9], [4.5, 3, 4, 8], [7, 3.5, 3.4, 7], [9.4, 3, 3, 5.5], [11.4, 2, 2.4, 4]].forEach(([x, y, w, h], i) => {
      for (let s = 0; s < h; s++) c.m(x + s * 0.12, y - s * 0.55 + (i === 0 ? 0 : 0), 1 + i * 0.1, Math.max(0.6, w * (1 - s / h) * 0.8), 0.7, 0.7, s % 2 ? 0x67e8f9 : 0x22d3ee, t);
    });
    c.m(2, -2, 1, 1, 6, 0.6, WHITE, GLOW(1)); c.m(5, -1, 1, 0.6, 4, 0.6, WHITE, GLOW(1)); c.m(8, 0, 1, 0.6, 3, 0.6, 0xa5f3fc, GLOW(1));
  },
  wings(c) {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) c.m(1.8 + i * (2.6 - r * 0.3) + r * 0.6, 3 - r * 2 - i * 0.2 + (r === 2 ? 0 : 0), 1 + r * 0.3, 2.6, 1.6, 0.7, r === 2 ? RED : (i % 2 ? GOLD : GOLD2), MET);
    for (let i = 0; i < 5; i++) c.m(2 + i * 2, -3.5 - (i % 2) * 0.8, 1.2, 1.4, 2, 0.6, i > 2 ? RED : GOLD, MET);
    c.m(1.2, 0, 1, 1.4, 4, 1.4, GOLD2, MET);
  },
  mecha_wings(c) {
    const S = 0x64748b;
    for (let i = 0; i < 5; i++) c.m(2 + i * 1.9, 4 - i * 0.9, 1, 2.2, 1, 1.4 + i * 0.1, i % 2 ? 0x94a3b8 : S, MET);
    for (let i = 0; i < 4; i++) { c.m(2.6 + i * 1.9, 3 - i * 0.9, 1.2, 1.5, 0.5, 1.2, 0x1e293b); c.m(3 + i * 1.9, 2.4 - i * 0.9, 1, 0.9, 3 - i * 0.6, 1.1, S, MET); }
    for (let i = 0; i < 3; i++) { c.m(3.5 + i * 2.4, -1.4 - i * 0.6, 1, 1.4, 1, 1.4, 0x0f172a, MET); c.m(3.7 + i * 2.4, -2.6 - i * 0.6, 1.1, 1, 1.7, 1, 0x38bdf8, GLOW(1)); }
    c.m(1, 0, 1, 1.4, 3.4, 1.6, 0x1e293b, MET);
  },
  chrono_wings(c) {
    for (const [cx, cy, r] of [[6, 3, 4], [10, -1.5, 2.6]]) {
      c.m(cx, cy, 1.4, 0.1, 0.1, 0.1, GOLD);
      const mirror = (x) => x;
      for (const s of [1, -1]) {
        ring(c, s * cx, cy, 1.4, r, GOLD, 'xy', GLOW(0.8), 0.55, 0.9);
        for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; c.box(s * cx + R(Math.cos(a) * (r + 1)) - 0.5, cy + R(Math.sin(a) * (r + 1)) - 0.5, 1.4, 1, 1, 0.9, GOLD2, MET); }
        c.box(s * cx - 0.4, cy, 1.5, 0.8, r - 0.8, 0.5, WHITE, GLOW(0.9)); c.box(s * cx, cy - 0.4, 1.5, r - 1.5, 0.8, 0.5, 0xfbbf24, GLOW(0.9));
        disc(c, s * cx, cy, 1.0, r - 1, 0x38bdf8, 'xy', TR(0.4, 0.3), 0.4);
      }
    }
    c.m(1.2, -0.5, 1, 1.4, 4, 1.4, GOLD2, MET);
  },
  backpack(c) {
    c.box(-3, -6, 1, 6, 6.4, 3.6, BLUE); c.box(-2.4, -5.4, 4.6, 4.8, 3.2, 1.2, TAN); c.box(-2.6, -2.2, 4.6, 5.2, 0.5, 1.3, GOLD, MET); c.box(-0.6, -2.6, 5.8, 1.2, 1.2, 0.4, GOLD, MET);
    c.box(-3.3, 0.4, 1.2, 6.6, 1.6, 2.8, 0x1d4ed8); c.box(-3.4, -0.5, 1, 6.8, 1, 3.6, 0x1e40af);
    c.box(-3.2, 2, 1.5, 6.4, 1.8, 1.8, 0x7c2d12); c.box(-3.3, 2.1, 1.3, 0.6, 1.6, 2.2, 0x451a03); c.box(2.7, 2.1, 1.3, 0.6, 1.6, 2.2, 0x451a03);
    c.m(2.6, -5, 0.4, 0.8, 5.6, 1, 0x1f2937);
  },
  dino_backpack_plush(c) {
    const G = 0x4ade80, D = 0x16a34a;
    c.box(-3, -7, 1, 6, 6.6, 4, G); c.box(-2.4, -6, 5, 4.8, 3.8, 0.8, 0xbbf7d0);
    c.box(-2.6, -1.2, 1.4, 5.2, 3.4, 4, G); c.box(-2.6, -0.2, 4.4, 5.2, 2.2, 2.6, G); c.box(-1.9, -0.6, 6.9, 3.8, 1.5, 1, 0xbbf7d0);
    c.m(1, 1.4, 4.9, 0.9, 0.9, 0.9, WHITE); c.m(1.2, 1.6, 5.2, 0.4, 0.4, 0.9, BLACK);
    c.m(-1.7, -0.3, 7.6, 0.5, 0.7, 0.4, WHITE); c.box(-0.4, 0.3, 7.4, 0.8, 0.6, 0.5, D);
    c.m(3, -4, 3, 1, 1.8, 1.2, D); c.box(-1.4, -9.4, 1.4, 2.8, 2.6, 2.6, G); c.box(-0.9, -11, 1.8, 1.8, 1.8, 1.8, D);
    for (let i = 0; i < 4; i++) c.box(-0.4, 1.6 - i * 0.2, 1.6 + i * 1.2, 0.8, 0.9 + (i % 2) * 0.4, 0.8, 0xf97316);
    c.m(2.7, -5.4, 0.4, 0.8, 4, 1, 0x166534);
  },
  cape(c) {
    c.box(-3.3, 0.3, 0.8, 6.6, 1, 1.6, GOLD, MET);
    for (let i = 0; i < 10; i++) { const w = 6.6 + i * 0.75, z = 1 + i * 0.35 + (i > 6 ? 0.4 : 0); c.box(-w / 2, -i, z, w, 1, 0.8, i % 3 === 2 ? 0xdc2626 : RED); c.box(-w / 2 + 0.4, -i, z - 0.3, w - 0.8, 1, 0.4, DRED); }
    c.box(-3.5, -9.4, 4.8, 7, 0.4, 0.9, GOLD2); c.box(-1.7, -1.5, 0.2, 3.4, 1, 0.7, DRED); c.box(-0.6, 0.4, 0.2, 1.2, 1.2, 0.9, GOLD, MET);
  },
  star_cape(c) {
    c.box(-3.3, 0.3, 0.8, 6.6, 1, 1.6, GOLD, MET);
    for (let i = 0; i < 11; i++) { const w = 6.6 + i * 0.8, z = 1 + i * 0.32; c.box(-w / 2, -i, z, w, 1, 0.8, i % 2 ? 0x312e81 : 0x1e1b4b); }
    for (const [x, y, z] of [[-3, -2, 1.9], [2, -3, 2.2], [-1, -5, 2.7], [4, -6, 3], [-4, -8, 3.4], [1, -9, 3.6], [0, -2, 2]]) { c.box(x, y, z - 0.2, 0.8, 0.8, 0.5, YELLOW, GLOW(1)); c.box(x + 0.2, y - 0.4, z - 0.2, 0.4, 1.6, 0.4, WHITE, GLOW(1)); }
    c.box(-4, -10.5, 4, 8, 0.4, 0.9, GOLD, MET); bmp(c, ['.##', '#..', '#..', '.##'], -1, 1, 0.2, { '#': [0xfef08a, GLOW(1)] }, 0.8);
  },
  solar_mantle(c) {
    ring(c, 0, 4, 4.5, 7, 0xf59e0b, 'xy', GLOW(0.9), 0.55, 1); ring(c, 0, 4, 4.3, 5.4, YELLOW, 'xy', GLOW(0.9), 0.5, 1);
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; c.box(R(Math.cos(a) * 9) - 0.5, 4 + R(Math.sin(a) * 9) - 0.5, 4.5, 1, 1, 1, k % 2 ? ORANGE : YELLOW, GLOW(1)); }
    for (let i = 0; i < 6; i++) { const w = 7 + i * 0.7; c.box(-w / 2, -i, 1 + i * 0.25, w, 1, 0.8, i % 2 ? 0xd97706 : 0xb45309, MET); }
    c.box(-0.7, 0.2, 0.3, 1.4, 1.4, 1, YELLOW, GLOW(1));
  },
  jetpack(c) {
    for (const s of [-1, 1]) { const x = s > 0 ? 0.6 : -3.6; c.box(x, -7, 1.2, 3, 7.6, 3, 0xcbd5e1, MET); c.box(x, -3.2, 1.1, 3, 0.9, 3.2, RED); c.box(x + 0.5, 0.6, 1.7, 2, 0.6, 2, 0x64748b, MET); c.box(x + 0.4, -8.2, 1.6, 2.2, 1.2, 2.2, 0x1f2937, MET); c.box(x + 0.7, -10, 2, 1.6, 2, 1.6, ORANGE, GLOW(1)); c.box(x + 1, -12, 2.3, 1, 2, 1, YELLOW, GLOW(1)); }
    c.box(-0.6, -5, 2, 1.2, 3, 2, 0x475569, MET); c.box(-3.6, -1.6, 4, 7.2, 0.8, 0.5, 0x1f2937); c.m(3.4, -4, 0.4, 0.7, 4, 1, 0x1f2937);
  },
  sub_jetpack(c) {
    for (const s of [-1, 1]) { const x = s > 0 ? 0.5 : -3.5; c.box(x, -6, 1.2, 3, 6.4, 3, 0xfbbf24); c.box(x, -3, 1.1, 3, 0.8, 3.2, TEAL); c.box(x + 0.6, 0.4, 1.8, 1.8, 0.6, 1.8, 0x0f766e, MET); }
    c.box(-0.5, -5, 4.2, 1, 1, 1.4, 0x1f2937, MET);
    c.box(-3.2, -5.6, 5.4, 6.4, 0.8, 0.5, 0x0f172a, MET); c.box(-0.4, -8.8, 5.4, 0.8, 6.4, 0.5, 0x0f172a, MET); c.box(-1, -5.6, 5.0, 2, 1, 0.8, 0xfbbf24);
    for (const [x, y, z] of [[-4, -9, 6], [3, -10, 7], [-1, -12, 8], [4, -13, 6.5], [-3, -14, 7.5]]) { ring(c, x, y, z, 1, 0xbae6fd, 'xy', TR(0.4, 0.4), 0.6, 0.5); }
  },
  magma_core_pack(c) {
    c.box(-3.4, -7, 1, 6.8, 7.4, 4.2, 0x1c1917); c.box(-2.6, -8, 1.6, 5.2, 1.4, 3.2, 0x292524);
    for (const [x, y] of [[-2, -2], [1, -4], [-1, -6], [2, 0]]) { c.box(x, y, 5.1, 0.7, 2, 0.3, ORANGE, GLOW(1)); c.box(x + 0.3, y - 0.6, 5.1, 1.6, 0.6, 0.3, 0xf97316, GLOW(1)); }
    sphere(c, 0, -3.4, 5.4, 1.6, 0xea580c, GLOW(1), 0xfde047);
    c.m(2.2, 0.4, 1.8, 0.9, 2, 0.9, 0x44403c); c.m(2.4, 2.4, 1.8, 0.5, 1.2, 0.5, 0xd6d3d1, TR(0.1, 0.4)); c.m(2.9, 3.8, 2, 0.8, 1, 0.8, 0xa8a29e, TR(0.1, 0.4));
  },
  orbital_thruster(c) {
    ring(c, 0, -2, 4.5, 6, 0x475569, 'xy', MET, 0.6, 1.4); ring(c, 0, -2, 4.5, 4.5, CYAN, 'xy', GLOW(0.8), 0.45, 0.8);
    for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + k * 2.094, x = R(Math.cos(a) * 6), y = -2 + R(Math.sin(a) * 6); c.box(x - 0.9, y - 0.9, 5.3, 1.8, 1.8, 1.8, 0x1e293b, MET); c.box(x - 0.5, y - 0.5, 7, 1, 1, 2, 0x38bdf8, GLOW(1)); }
    c.box(-1.2, -3.2, 1, 2.4, 2.4, 3.8, 0x334155, MET); c.box(-3, 0.2, 1, 6, 0.8, 2.4, 0x1f2937, MET);
  },
  comet_tail_rig(c) {
    c.box(-2.4, -5, 1, 4.8, 5, 2.4, 0x334155, MET); sphere(c, 0, -2.6, 4, 2, 0xe0f2fe, GLOW(1), CYAN);
    for (let i = 0; i < 12; i++) { const w = Math.max(1, 5 - i * 0.4), y = -2.6 + i * 0.35; c.box(-w / 2, y - w / 2, 5.8 + i * 1.2, w, w, 1.2, i < 4 ? 0xbae6fd : i < 8 ? 0x38bdf8 : 0x818cf8, i < 8 ? GLOW(0.9) : TR(0.8, 0.6)); }
    for (const [x, y, z] of [[-2, 1, 10], [2, -4, 12], [0, 2, 15], [-3, -3, 17], [3, 1, 19]]) c.box(x, y, z, 0.6, 0.6, 0.6, WHITE, GLOW(1));
  },
  fossil_shield(c) {
    ring(c, 0, -4, 1.6, 5.6, 0xd6c8a0, 'xy', null, 0.65, 1.2); ring(c, 0, -4, 1.8, 4.4, 0xb8a878, 'xy', null, 0.5, 0.8);
    disc(c, 0, -4, 1.2, 4, 0xe7dcc0, 'xy', null, 0.6);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.box(R(Math.cos(a) * 6.4) - 0.5, -4 + R(Math.sin(a) * 6.4) - 0.5, 1.6, 1, 1, 1.2, 0xfffbeb); }
    const sp = []; for (let t = 0; t < 40; t++) { const a = t * 0.45, r = 0.4 + t * 0.085; sp.push([R(Math.cos(a) * r), R(Math.sin(a) * r)]); }
    for (const [i, j] of sp) c.box(i - 0.4, -4 + j - 0.4, 2.3, 0.9, 0.9, 0.5, 0x8b7355);
    c.m(0.8, 1.6, 0.6, 0.8, 2, 1, 0x7c4a21);
  },
  royal_trident(c) {
    line(c, -4, -9, 2, 4, 9, 2, 0x92400e, null, 1.2); line(c, -4, -9.9, 2, 4, 8.1, 2, 0xb45309);
    for (let k = 0; k < 4; k++) c.box(-1 + k * 1.9 - 0.8, -3.8 + k * 2.2, 1.7, 1.2, 1.2, 1.2, GOLD, MET);
    c.box(3.4, 8.6, 1.6, 2.6, 0.9, 1.0, GOLD, MET); c.box(4.4, 9.2, 1.7, 0.9, 2.6, 0.9, GOLD, MET);
    c.box(3.0, 9.4, 1.6, 0.7, 2.6, 0.9, GOLD, MET); c.box(5.6, 9.4, 1.6, 0.7, 2.6, 0.9, GOLD, MET);
    c.box(3.0, 11.9, 1.7, 0.7, 0.7, 0.7, 0xfef9c3, MET); c.box(5.6, 11.9, 1.7, 0.7, 0.7, 0.7, 0xfef9c3, MET); c.box(4.4, 11.9, 1.7, 0.9, 0.9, 0.9, 0xfef9c3, MET);
    c.box(4.1, 9.4, 1.3, 1.4, 1.4, 0.5, TEAL, GLOW(0.9)); c.box(4.5, 9, 2.4, 0.5, 0.5, 0.7, GOLD, MET);
  },
  abyss_fins(c) {
    const T = 0x0d9488;
    for (let i = 0; i < 5; i++) { const h = 5 - Math.abs(i - 2) * 0.9; c.box(-0.5, 0.6 + (i === 2 ? 1 : 0) - 0, 0.6 + i * 1.5, 1, h, 1, T); c.box(-0.2, 0.6 + h, 0.6 + i * 1.5, 0.4, 1, 0.6, 0x5eead4, GLOW(0.8)); }
    for (let k = 0; k < 7; k++) { const x = 2 + k * 1.2, y = 2 - k * 0.6; c.m(x, y - 5 + k * 0.4, 1, 0.9, 5 - k * 0.4, 0.4, k % 2 ? 0x2dd4bf : 0x14b8a6, TR(0.5, 0.6)); c.m(x, y, 1, 0.9, 0.9, 0.7, 0x99f6e4, GLOW(0.8)); }
    c.m(1, 0, 0.8, 1.2, 3, 1.4, 0x115e59);
    for (const [x, y] of [[4, -1], [6, -2], [8, -3]]) c.m(x, y, 1.3, 0.5, 0.5, 0.3, 0xa5f3fc, GLOW(1));
  }
};

// ---------------------------------------------------------------- OMBROS (par: x=±4.2 do centro, y=0 topo do ombro)
const SHOULDERS = {
  spikes(c) {
    c.m(2.6, -1, -2, 3.4, 1.2, 4, 0x475569, MET);
    c.m(3, 0.2, -1.2, 2.2, 1.2, 2.4, 0x64748b, MET); c.m(3.6, 1.4, -0.8, 1.4, 1.6, 1.6, 0x94a3b8, MET); c.m(4.4, 3, -0.5, 0.9, 1.6, 1, 0xe2e8f0, MET); c.m(5.1, 4.6, -0.3, 0.5, 1.2, 0.6, WHITE, MET);
    c.m(4, -0.2, 1.4, 1.8, 1.2, 1.8, 0x64748b, MET); c.m(4.8, 1, 1.7, 1, 1.4, 1.2, 0x94a3b8, MET); c.m(5.5, 2.4, 1.9, 0.6, 1.4, 0.6, 0xe2e8f0, MET);
  },
  cyber_armor(c) {
    c.m(2.6, -1.4, -2.4, 4.4, 1.6, 4.8, 0x334155, MET); c.m(3, 0.2, -2, 3.6, 1, 4, 0x475569, MET); c.m(3.4, 1.2, -1.5, 2.6, 0.8, 3, 0x64748b, MET);
    c.m(3.2, 0.1, -2.1, 3.2, 0.35, 0.3, CYAN, GLOW(1)); c.m(5.4, -1, -1.5, 0.35, 0.35, 3, CYAN, GLOW(1)); c.m(4, 2, -0.5, 1, 0.5, 1, 0x0f172a, MET); c.m(4.3, 2.4, -0.2, 0.4, 0.4, 0.4, RED, GLOW(1));
  },
  obsidian_pauldrons(c) {
    const K = 0x0b0b16, V = { e: 0.9 };
    c.m(2.6, -1.4, -2.2, 4, 1.6, 4.4, K, MET); c.m(3, 0.2, -1.8, 3.2, 1.2, 3.6, 0x14142a, MET); c.m(3.4, 1.4, -1.3, 2.2, 1.2, 2.6, K, MET);
    c.m(4, 2.6, -0.8, 1.2, 2.6, 1.6, K, MET); c.m(4.4, 5.2, -0.4, 0.6, 1.6, 0.8, K, MET); c.m(5.2, 0.4, 0.2, 1.2, 2, 1, K, MET);
    c.m(2.9, 0.2, -2, 3.4, 0.3, 0.3, 0xa855f7, V); c.m(4.1, 2.6, -0.9, 0.3, 2.6, 0.3, 0xa855f7, V);
  },
  bone_pauldrons(c) {
    const B = 0xf1e9d2, D = 0xd6c8a0;
    c.m(2.6, -1.2, -2.2, 4, 2.6, 4.4, B); c.m(3, 1.4, -1.8, 3.2, 1, 3.6, D); c.m(3.6, 2.4, -1.2, 2, 1, 2.4, B);
    for (let i = 0; i < 4; i++) c.m(3.2 + i * 0.7, -2.6 - i * 0.2, -1.4, 0.6, 1.4 + i * 0.3, 0.8, i % 2 ? D : B);
    c.m(4.6, 3.4, -0.6, 1, 2, 1.2, B); c.m(5, 5.2, -0.4, 0.6, 1.4, 0.8, 0xfffdf4);
    c.m(3.8, 0.4, -2.35, 0.8, 0.8, 0.3, 0x292524); c.m(4.9, 0.4, -2.35, 0.8, 0.8, 0.3, 0x292524);
  },
  cyber_turret(c) {
    c.m(2.8, -1, -1.5, 3.4, 1.4, 3.4, 0x334155, MET); c.m(3.2, 0.4, -1.1, 2.6, 1.2, 2.6, 0x475569, MET);
    ring(c, 4.5, 1.8, 0.2, 1.8, 0x64748b, 'xz', MET, 0.7, 1);
    c.m(4, 1.4, -3, 0.9, 0.9, 3.2, 0x1e293b, MET); c.m(4.9, 1.4, -3, 0.9, 0.9, 3.2, 0x1e293b, MET); c.m(4, 1.4, -3.4, 0.9, 0.9, 0.5, 0x0f172a); c.m(4.9, 1.4, -3.4, 0.9, 0.9, 0.5, 0x0f172a);
    c.m(4.3, 2.7, 0.4, 1, 0.6, 1, RED, GLOW(1));
    c.m(3.2, 0.2, -1.2, 2.6, 0.25, 0.25, 0xef4444, GLOW(1));
  }
};

// ---------------------------------------------------------------- AURAS / ORBITAIS (centro no torso, raio ~8-10)
const AURA = {
  aura_fire(c) {
    const cols = [0xdc2626, 0xef4444, 0xf97316, 0xfb923c, 0xfbbf24, 0xfde047];
    for (let s = 0; s < 3; s++) for (let i = 0; i < 20; i++) {
      const a = i * 0.55 + s * 2.094, r = 7.6 - i * 0.1, y = -5 + i * 0.7, w = Math.max(0.5, 1.7 - i * 0.07);
      c.box(R(Math.cos(a) * r) - w / 2, R(y), R(Math.sin(a) * r) - w / 2, w, w, w, cols[Math.min(5, (i / 3.4) | 0)], GLOW(1));
    }
    c.box(-0.3, 10, -0.3, 0.6, 0.6, 0.6, 0xfde047, GLOW(1));
  },
  aura_ice(c) {
    const col = [0xa5f3fc, 0x67e8f9, 0xe0f2fe];
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, x = R(Math.cos(a) * 8), z = R(Math.sin(a) * 8), y = -2 + (k % 3) * 2.4;
      [[1, 1], [2, 2], [3, 3], [2, 4], [1, 4]].forEach(([w, h], i) => c.box(x - w / 2, y + [0, 1, 2, 4, 6][i], z - w / 2, w, i < 3 ? 1 : 1.6 + (i === 4 ? 0.6 : 0), w, col[(k + i) % 3], TR(0.6, 0.6)));
      c.box(x - 0.2, y + 1, z - 0.2, 0.4, 5, 0.4, WHITE, GLOW(1));
    }
  },
  aura_lightning(c) {
    const Z = [[1, 0], [-1, 0], [1, 0], [-1, 0], [1, 0], [-1, 0], [1, 0]];
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.4, bx = Math.cos(a) * 8, bz = Math.sin(a) * 8;
      for (let i = 0; i < 12; i++) {
        const off = (i % 4 < 2 ? 1 : -1) * (1 + (i % 3) * 0.5);
        c.box(R(bx + Math.cos(a + Math.PI / 2) * off) - 0.5, -6 + i * 1.2, R(bz + Math.sin(a + Math.PI / 2) * off) - 0.5, 1, 1.3, 1, i % 5 === 0 ? WHITE : YELLOW, GLOW(1));
      }
      c.box(R(bx) - 1, -7, R(bz) - 1, 2, 0.4, 2, 0x60a5fa, GLOW(0.9));
    }
  },
  aura_galaxy(c) {
    sphere(c, 0, 9, 0, 2.6, 0x7c3aed, null, 0xa78bfa);
    for (let i = -6; i <= 6; i++) { const y = 9 + R(i * 0.35); const r = Math.hypot(i, 0); if (Math.abs(i) >= 4) { c.box(i - 0.5, y, -1.5 + (i > 0 ? 1 : 0) * 0, 1, 1, 1, 0xfbcfe8, GLOW(0.8)); c.box(i - 0.5, y, 1.5, 1, 1, 1, 0xfbcfe8, GLOW(0.8)); } }
    ring(c, 0, 9, 0, 5.6, 0xf9a8d4, 'xz', GLOW(0.8), 0.5, 0.7); ring(c, 0, 9, 0, 4.7, 0xc084fc, 'xz', GLOW(0.8), 0.4, 0.5);
    c.box(6.5, 11, 0, 1.2, 1.2, 1.2, CYAN, GLOW(1)); c.box(-5, 7.6, 3.6, 1, 1, 1, YELLOW, GLOW(1)); c.box(-2, 12, -6, 0.9, 0.9, 0.9, WHITE, GLOW(1));
    for (const [x, y, z] of [[7, 4, 5], [-7, 3, -4], [3, 14, 2], [-6, 12, 5]]) c.box(x, y, z, 0.4, 0.4, 0.4, WHITE, GLOW(1));
  },
  orbital_eggs(c) {
    const specs = [[0xfef3c7, 0xf59e0b], [0xbae6fd, 0x38bdf8], [0xfbcfe8, 0xec4899]];
    specs.forEach(([base, spot], k) => {
      const a = k * 2.094 + 0.5, cx = R(Math.cos(a) * 8), cz = R(Math.sin(a) * 8), cy = k % 2 ? 3 : 1;
      [[2, 0], [3, 1], [4, 2], [4, 3], [4, 4], [3, 5], [2, 6]].forEach(([w, y], i) => c.box(cx - w / 2, cy + y, cz - w / 2, w, 1, w, (i + k) % 3 === 0 ? spot : base, i === 3 ? { e: 0.3 } : null));
      c.box(cx - 0.4, cy + 7, cz - 0.4, 0.8, 0.6, 0.8, base);
      c.box(cx + 0.6, cy + 3, cz + 1.6, 0.6, 0.6, 0.6, spot); c.box(cx - 1.5, cy + 2, cz - 1.8, 0.5, 0.5, 0.5, spot);
    });
  },
  plasma_halo(c) {
    ring(c, 0, 1, 5, 9, 0x22d3ee, 'xy', GLOW(1), 0.55, 1); ring(c, 0, 1, 5, 7.6, 0xe879f9, 'xy', GLOW(0.9), 0.5, 1); ring(c, 0, 1, 5, 8.3, 0xffffff, 'xy', TR(0.9, 0.35), 0.4, 0.5);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; c.box(R(Math.cos(a) * 9) - 1, 1 + R(Math.sin(a) * 9) - 1, 4.5, 2, 2, 2, k % 2 ? 0xe879f9 : 0x22d3ee, GLOW(1)); }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; line(c, R(Math.cos(a) * 3), 1 + R(Math.sin(a) * 3), 5, R(Math.cos(a + 0.5) * 7), 1 + R(Math.sin(a + 0.5) * 7), 5, WHITE, TR(0.9, 0.5)); }
  },
  floating_crystal(c) {
    const t = TR(0.65, 0.65);
    [[2, 0], [4, 1], [6, 2], [6, 3], [6, 4], [4, 5], [2, 6], [1, 7]].forEach(([w, y], i) => c.box(-w / 2, 8 + y * 1.1, -w / 2, w, 1.1, w, i % 2 ? 0x5eead4 : 0x2dd4bf, t));
    c.box(-0.3, 9, -0.3, 0.6, 6, 0.6, WHITE, GLOW(1));
    for (const [x, y, z] of [[7, 10, 0], [-7, 12, 2], [2, 15, -6], [-3, 8, 6]]) { c.box(x - 1, y, z - 1, 2, 3, 2, 0x99f6e4, t); c.box(x - 0.4, y + 3, z - 0.4, 0.8, 1, 0.8, WHITE, GLOW(1)); }
  },
  nebula_ring(c) {
    const cs = [0x7c3aed, 0xc026d3, 0xec4899, 0x22d3ee, 0x6366f1, 0xa855f7];
    for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2, r = 8 + Math.sin(i * 1.7) * 1.2, w = 1 + (i % 3) * 0.5; c.box(R(Math.cos(a) * r) - w / 2, R(Math.cos(a * 2) * 1.4) - w / 2, R(Math.sin(a) * r) - w / 2, w, w, w, cs[i % 6], i % 4 === 0 ? GLOW(1) : TR(0.7, 0.55)); }
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 6 + (i % 5) * 1.1; c.box(R(Math.cos(a) * r), R(Math.sin(i) * 3), R(Math.sin(a) * r), 0.5, 0.5, 0.5, WHITE, GLOW(1)); }
  }
};

// ---------------------------------------------------------------- tabelas / API pública
export const ACCESSORY_SLOTS = ['head', 'face', 'neck', 'back', 'shoulders', 'aura'];
export const ACCESSORY_SLOT_META = {
  head: { id: 'head', label: 'Cabeça', icon: '🎩' },
  face: { id: 'face', label: 'Rosto', icon: '🕶️' },
  neck: { id: 'neck', label: 'Pescoço', icon: '📿' },
  back: { id: 'back', label: 'Costas / Asas', icon: '🪽' },
  shoulders: { id: 'shoulders', label: 'Ombros', icon: '🛡️' },
  aura: { id: 'aura', label: 'Aura / Orbital', icon: '✨' }
};
const TABLES = { head: HEAD, face: FACE, neck: NECK, back: BACK, shoulders: SHOULDERS, aura: AURA };
const ID_SLOT = {};
for (const s of ACCESSORY_SLOTS) for (const id of Object.keys(TABLES[s])) ID_SLOT[id] = s;
export const SCULPTED_ACCESSORY_IDS = Object.keys(ID_SLOT);

/** Separa 'col_acc_<base>_<base|gilded|prism>' em { base, finish } (ids simples retornam finish 'base'). */
export function parseAccessoryId(accId) {
  const id = String(accId || '');
  const m = /^col_acc_(.+)_(base|gilded|prism)$/.exec(id);
  if (m) return { base: m[1], finish: m[2] === 'base' ? 'base' : m[2] };
  const m2 = /^col_acc_(.+)$/.exec(id);
  if (m2) return { base: m2[1], finish: 'base' };
  return { base: id, finish: 'base' };
}

export function getAccessorySlot(accId) {
  return ID_SLOT[parseAccessoryId(accId).base] || null;
}

function buildGroup(accId) {
  const { base, finish } = parseAccessoryId(accId);
  const slot = ID_SLOT[base];
  if (!slot) return null;
  const g = buildBatchedGroup(`acc:${base}`, TABLES[slot][base], finish);
  g.name = `acc_${base}`;
  g.userData.accessoryId = base; g.userData.finish = finish; g.userData.slot = slot;
  if (slot === 'aura') {
    g.userData.animate = (t) => { g.rotation.y = t * (base === 'plasma_halo' ? 0.0 : 0.6); g.position.y = (g.userData.baseY || 0) + Math.sin(t * 2) * 0.03; };
  } else if (base === 'halo') {
    g.userData.animate = (t) => { g.position.y = (g.userData.baseY || 0) + Math.sin(t * 2.2) * 0.02; };
  }
  return g;
}

function detectHeadFrill(headGroup) {
  if (!headGroup) return null;
  if (headGroup.userData?.hasFrill) {
    return { topY: headGroup.userData.frillTopY ?? 0.87, frontZ: headGroup.userData.frillFrontZ ?? 0.06 };
  }
  let maxTopY = 0;
  let minFrontZ = Infinity;
  let found = false;
  for (const ch of headGroup.children || []) {
    if (!ch || !ch.isMesh) continue;
    const sx = Math.abs(ch.scale?.x || 0);
    const sy = Math.abs(ch.scale?.y || 0);
    const sz = Math.abs(ch.scale?.z || 0);
    const topY = (ch.position?.y || 0) + sy * 0.5;
    if (sx >= 0.75 && sy >= 0.55 && sz <= 0.32 && topY >= 0.55 && (ch.position?.z || 0) >= -0.05) {
      const frontZ = (ch.position?.z || 0) - sz * 0.5;
      if (topY > maxTopY) maxTopY = topY;
      if (frontZ < minFrontZ) minFrontZ = frontZ;
      found = true;
    }
  }
  return found ? { topY: maxTopY, frontZ: minFrontZ } : null;
}

/** Monta e anexa o acessório (único por ID). Retorna o Group (ou null se desconhecido). */
export function attachSculptedAccessory(accId, headGroup, torso, torsoW = 0.78, torsoH = 0.72, torsoD = 1.08) {
  if (!accId || accId === 'none') return null;
  const g = buildGroup(accId);
  if (!g) return null;
  const slot = g.userData.slot;
  const base = g.userData.accessoryId;
  let parent = torso;
  if (slot === 'head') {
    parent = headGroup;
    const frill = detectHeadFrill(headGroup);
    if (frill) {
      if (base === 'halo') {
        g.position.set(0, Math.max(0.62, frill.topY - 0.2), -0.24);
      } else {
        const box = new THREE.Box3().setFromObject(g);
        const rawMaxZ = Number.isFinite(box.max.z) ? box.max.z : 0.4;
        const scale = rawMaxZ > 0.42 ? 0.82 : 0.92;
        g.scale.setScalar(scale);
        const targetZ = Math.min(-0.34, frill.frontZ - 0.03 - rawMaxZ * scale);
        g.position.set(0, 0.46, targetZ);
      }
    } else {
      g.position.set(0, 0.42, -0.18);
    }
  }
  else if (slot === 'face') { parent = headGroup; g.position.set(0, 0.25, -0.59); }
  else if (slot === 'neck') g.position.set(0, torsoH * 0.4, -torsoD * 0.38);
  else if (slot === 'back') {
    if (base === 'turtle_shell') {
      g.position.set(0, torsoH * 0.6, -torsoD * 0.36);
    } else {
      g.position.set(0, torsoH * 0.74, torsoD * 0.1);
    }
  }
  else if (slot === 'shoulders') { g.position.set(0, torsoH * 0.82, 0); g.scale.x = Math.max(0.6, torsoW / 0.78); }
  else if (slot === 'aura') g.position.set(0, torsoH * 0.5, 0);
  g.userData.baseY = g.position.y;
  (parent || torso)?.add(g);
  return g;
}

/** Versão independente (galeria/loja/preview). Retorna { root, slot }. */
export function buildSculptedAccessoryStandalone(accId) {
  const g = buildGroup(accId);
  const root = new THREE.Group();
  if (!g) return { root, slot: null };
  g.userData.baseY = 0;
  root.add(g);
  root.userData = { ...g.userData };
  return { root, slot: g.userData.slot };
}

export function countAccessoryDrawCalls(accId) {
  const g = buildGroup(accId);
  return g ? g.children.length : 0;
}
