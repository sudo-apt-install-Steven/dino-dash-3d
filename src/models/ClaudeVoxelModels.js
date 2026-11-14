// Modelos 3D Voxel de Alta Fidelidade integrados com compilação em lote (Vertex Colors + BufferGeometry Cache).
// Transforma centenas de micro-voxels individuais em apenas 2 a 5 draw calls compartilhados por pool para travar 60 FPS!
import * as THREE from 'three';

const U = 0.1;
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const TEMPLATE_CACHE = new Map();
const MAT_CACHE = new Map();

function hash3(x, y, z) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  h = (h ^ (h >>> 13)) >>> 0;
  return h % 7;
}

function shadeHex(c, k) {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * k)));
  return (r << 16) | (g << 8) | b;
}

function getCachedMaterial(key, cfg) {
  if (!MAT_CACHE.has(key)) {
    const mat = cfg.isBasicEmissive
      ? new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true })
      : new THREE.MeshStandardMaterial(cfg);
    MAT_CACHE.set(key, mat);
  }
  return MAT_CACHE.get(key);
}

/**
 * Compila uma lista de caixas voxel ({x, y, z, w, h, d, c, o}) em um array de { geometry, material }
 * compartilhável em memória entre todas as instâncias de ObjectPool.
 */
function compileBoxes(boxes, extras = []) {
  const posAttr = UNIT_BOX.attributes.position;
  const normAttr = UNIT_BOX.attributes.normal;
  const idxAttr = UNIT_BOX.index;
  const vCount = posAttr.count;
  const iCount = idxAttr.count;

  // 1) Remove voxels opacos 1x1x1 totalmente soterrados no interior do sólido (-70% triângulos!)
  const solidGrid = new Set();
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.w === 1 && b.h === 1 && b.d === 1 && (b.o?.a == null || b.o.a >= 1)) {
      solidGrid.add(`${b.x},${b.y},${b.z}`);
    }
  }
  const visibleBoxes = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.w === 1 && b.h === 1 && b.d === 1 && (b.o?.a == null || b.o.a >= 1)) {
      const buried =
        solidGrid.has(`${b.x + 1},${b.y},${b.z}`) &&
        solidGrid.has(`${b.x - 1},${b.y},${b.z}`) &&
        solidGrid.has(`${b.x},${b.y + 1},${b.z}`) &&
        solidGrid.has(`${b.x},${b.y - 1},${b.z}`) &&
        solidGrid.has(`${b.x},${b.y},${b.z + 1}`) &&
        solidGrid.has(`${b.x},${b.y},${b.z - 1}`);
      if (buried) continue;
    }
    visibleBoxes.push(b);
  }

  // 2) Agrupamento de draw calls:
  // - Alto brilho opaco (e >= 0.35): 1 único MeshBasicMaterial(vertexColors) para TODAS as cores brilhantes!
  // - Não-emissivos opacos: 1 único MeshStandardMaterial(vertexColors) por metalness!
  // - Semi-emissivos/translúcidos: agrupados por aparência
  const buckets = new Map();
  const tmpColor = new THREE.Color();

  for (let i = 0; i < visibleBoxes.length; i++) {
    const b = visibleBoxes[i];
    const e = b.o?.e || 0;
    const m = b.o?.m || 0;
    const a = b.o?.a == null ? 1 : b.o.a;
    let key;
    let matCfg;
    let usesVC = true;
    if (e >= 0.35 && a >= 1) {
      key = 'em_basic_vc';
      matCfg = { isBasicEmissive: true };
    } else if (e > 0) {
      key = `em|${b.c.toString(16)}|${e}|${m}|${a}`;
      usesVC = false;
      matCfg = {
        color: b.c,
        emissive: b.c,
        emissiveIntensity: e,
        roughness: m ? 0.28 : 0.65,
        metalness: m,
        transparent: a < 1,
        opacity: a,
        depthWrite: a >= 1
      };
    } else if (a < 1) {
      key = `tr|${b.c.toString(16)}|${m}|${a}`;
      usesVC = false;
      matCfg = {
        color: b.c,
        roughness: 0.22,
        metalness: m,
        transparent: true,
        opacity: a,
        depthWrite: false
      };
    } else {
      key = `vc|${m}`;
      matCfg = {
        color: 0xffffff,
        vertexColors: true,
        roughness: m ? 0.3 : 0.76,
        metalness: m
      };
    }

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, matCfg, usesVC, items: [] };
      buckets.set(key, bucket);
    }
    bucket.items.push(b);
  }

  const parts = [];
  for (const bucket of buckets.values()) {
    const n = bucket.items.length;
    const positions = new Float32Array(n * vCount * 3);
    const normals = new Float32Array(n * vCount * 3);
    const colors = bucket.usesVC ? new Float32Array(n * vCount * 3) : null;
    const indices = new Uint32Array(n * iCount);

    for (let bi = 0; bi < n; bi++) {
      const b = bucket.items[bi];
      const sx = b.w * U;
      const sy = b.h * U;
      const sz = b.d * U;
      const cx = (b.x + b.w * 0.5) * U;
      const cy = (b.y + b.h * 0.5) * U;
      const cz = (b.z + b.d * 0.5) * U;

      if (colors) tmpColor.setHex(b.c);

      const vBase = bi * vCount;
      for (let v = 0; v < vCount; v++) {
        const vi = (vBase + v) * 3;
        positions[vi] = posAttr.array[v * 3] * sx + cx;
        positions[vi + 1] = posAttr.array[v * 3 + 1] * sy + cy;
        positions[vi + 2] = posAttr.array[v * 3 + 2] * sz + cz;

        normals[vi] = normAttr.array[v * 3];
        normals[vi + 1] = normAttr.array[v * 3 + 1];
        normals[vi + 2] = normAttr.array[v * 3 + 2];

        if (colors) {
          colors[vi] = tmpColor.r;
          colors[vi + 1] = tmpColor.g;
          colors[vi + 2] = tmpColor.b;
        }
      }

      const iBase = bi * iCount;
      for (let ii = 0; ii < iCount; ii++) {
        indices[iBase + ii] = idxAttr.array[ii] + vBase;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingSphere();

    const material = getCachedMaterial(bucket.key, bucket.matCfg);
    parts.push({ geometry: geo, material });
  }

  for (const ex of extras) {
    parts.push(ex);
  }
  return parts;
}

function getOrBuildTemplate(cacheKey, buildFn) {
  if (!TEMPLATE_CACHE.has(cacheKey)) {
    const collector = createCollector();
    buildFn(collector);
    const compiled = compileBoxes(collector.boxes, collector.extras);
    TEMPLATE_CACHE.set(cacheKey, compiled);
  }
  const tpl = TEMPLATE_CACHE.get(cacheKey);
  const group = new THREE.Group();
  for (let i = 0; i < tpl.length; i++) {
    const p = tpl[i];
    const mesh = new THREE.Mesh(p.geometry, p.material);
    if (p.position) mesh.position.copy(p.position);
    if (p.rotation) mesh.rotation.copy(p.rotation);
    if (p.castShadow !== false && !p.material.transparent) {
      mesh.castShadow = true;
    }
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function createCollector() {
  const boxes = [];
  const extras = [];
  const api = {
    boxes,
    extras,
    B(x, y, z, w, h, d, c, o = null) {
      boxes.push({ x, y, z, w, h, d, c, o });
    },
    V(x, y, z, c, o = null) {
      const col = (o?.e && o.e < 0.35) ? c : shadeHex(c, 1 + (hash3(x, y, z) - 3) * 0.03);
      api.B(x, y, z, 1, 1, 1, col, o);
    },
    disc(cx, cz, y, r, c, o = null) {
      const R = Math.ceil(r);
      for (let x = -R; x <= R; x++) {
        for (let z = -R; z <= R; z++) {
          if (x * x + z * z <= r * r) api.V(cx + x, y, cz + z, c, o);
        }
      }
    },
    warn(rx, rz, y = 0) {
      for (let i = 0; i < 48; i += 2) {
        const a = (i / 48) * Math.PI * 2;
        api.V(Math.round(rx * Math.cos(a)), y, Math.round(rz * Math.sin(a)), 0xff5a4d, { e: 0.85 });
      }
    },
    cone(cx, cz, h, r, c1, c2, inv, y0) {
      for (let i = 0; i < h; i++) {
        const f = inv ? (i + 1) / h : 1 - i / h;
        const rr = Math.max(0.8, r * f);
        const R = Math.ceil(rr);
        for (let x = -R; x <= R; x++) {
          for (let z = -R; z <= R; z++) {
            if (x * x + z * z <= rr * rr) {
              api.V(cx + x, y0 + i, cz + z, (inv ? i < h * 0.3 : i > h * 0.7) ? c2 : c1);
            }
          }
        }
      }
    },
    addExtra(geometry, material, pos = null, rot = null) {
      extras.push({
        geometry,
        material,
        position: pos ? new THREE.Vector3(...pos) : null,
        rotation: rot ? new THREE.Euler(...rot) : null,
        castShadow: false
      });
    }
  };
  return api;
}

// ================================
// 1. OVOS VOXEL (8 VARIANTES)
// ================================
const EGG_SYMBOLS = {
  fogo: ['....#....', '...##....', '...###...', '..####...', '.#####.#.', '.###*###.', '.##***##.', '..#***#..', '...###...'],
  gelo: ['....#....', '.#..#..#.', '..#.#.#..', '...###...', '#########', '...###...', '..#.#.#..', '.#..#..#.', '....#....'],
  raio: ['......##.', '.....##..', '....##...', '...######', '.....##..', '....##...', '...##....', '..##.....', '..#......'],
  veneno: ['..#####..', '.#######.', '#########', '##..#..##', '##..#..##', '#########', '.###.###.', '..#####..', '..#.#.#..'],
  misterioso: ['..#####..', '.##...##.', '.##...##.', '.....##..', '....##...', '...##....', '...##....', '.........', '...##....']
};

const EGG_PALETTES = {
  comum: { b: 0xeadbb8, d: 0xb8965a },
  dourado: { b: 0xf5c518, d: 0xd9a400, m: 0.8 },
  raro: { b: 0x7f77dd, d: 0x534ab7, l: 0xafa9ec },
  fogo: { b: 0xe85d2a, d: 0xb8401a, s: 0xffc53d, s2: 0xfff3a3 },
  gelo: { b: 0xa9d9f2, d: 0x7fb8dc, s: 0xffffff },
  raio: { b: 0x5b6cff, d: 0x3a47c8, s: 0xffe45c },
  veneno: { b: 0x6bbf3a, d: 0x3f8a1e, s: 0xefffd0 },
  misterioso: { b: 0x3c3489, d: 0x26215c, s: 0xcecbf6 }
};

function eggRadius(y) {
  const t = (y + 0.5) / 14;
  return 5.5 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.45) / 0.55, 2)));
}

export function buildClaudeEggGroup(type = 'comum') {
  const alias = { gold: 'dourado', colossal: 'raro', fire: 'fogo', ice: 'gelo', lightning: 'raio', poison: 'veneno', mystery: 'misterioso', surpresa: 'misterioso' };
  const t = alias[type] || (EGG_PALETTES[type] ? type : 'comum');
  const raw = getOrBuildTemplate(`egg:${t}`, (c) => {
    const p = EGG_PALETTES[t];
    for (let y = 0; y < 14; y++) {
      const r = eggRadius(y);
      for (let x = -5; x <= 5; x++) {
        for (let z = -5; z <= 5; z++) {
          if (x * x + z * z > r * r) continue;
          let col = p.b;
          if (y < 3) col = p.d;
          if (t === 'comum' && hash3(x, y, z) === 0) col = p.d;
          if (t === 'raro') {
            if (((x + y + z) & 3) === 0) col = p.l;
            else if (((x - z) & 3) === 1) col = p.d;
          }
          if (t === 'misterioso' && hash3(x, y, z) === 1) col = 0xeeedfe;
          c.V(x, y, z, col, { m: p.m || 0, e: t === 'raro' ? 0.25 : 0 });
        }
      }
    }
    // Runa visível tanto na frente (+Z) quanto atrás (-Z) durante rotação!
    const sym = EGG_SYMBOLS[t];
    if (sym) {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          const ch = sym[row][col];
          if (ch === '.') continue;
          const x = col - 4;
          const y = 11 - row;
          const r = eggRadius(y);
          const q = r * r - x * x;
          if (q < 0) continue;
          const zSurface = Math.floor(Math.sqrt(q)) + 1;
          const runeCol = ch === '*' ? (p.s2 || p.s) : p.s;
          c.V(x, y, zSurface, runeCol, { e: 0.65 });
          c.V(-x, y, -zSurface, runeCol, { e: 0.65 });
        }
      }
    }
    if (t === 'dourado') {
      for (let y = 6; y <= 10; y++) {
        const r = eggRadius(y);
        const q = r * r - 9;
        if (q > 0) {
          const zs = Math.floor(Math.sqrt(q)) + 1;
          c.V(-3, y, zs, 0xfff3a3, { e: 0.5 });
          c.V(3, y, -zs, 0xfff3a3, { e: 0.5 });
        }
      }
    }
  });
  // Centraliza eixo de rotação exatamente no meio (x=-0.05, z=-0.05) e escala para ~0.88m
  const wrap = new THREE.Group();
  raw.position.set(-0.05, 0, -0.05);
  wrap.add(raw);
  wrap.scale.setScalar(0.64);
  return wrap;
}

// =======================================
// 2. PLATAFORMAS DE BUFF (6 VARIANTES)
// =======================================
const PLAT_PATTERNS = {
  turbo: ['.....##.....', '....####....', '...##..##...', '..##....##..', '.....##.....', '....####....', '...##..##...', '..##....##..'],
  pulo: ['.....##.....', '....####....', '...######...', '..########..', '.....##.....', '.....##.....', '...######...', '.....##.....'],
  escudo: ['.##########.', '.##########.', '.##########.', '..########..', '..########..', '...######...', '....####....', '.....##.....'],
  cura: ['..##....##..', '.####..####.', '############', '############', '.##########.', '..########..', '...######...', '....####....'],
  ima: ['.###....###.', '.###....###.', '.###....###.', '.###....###.', '.###....###.', '.####..####.', '..########..', '...######...'],
  tempo: ['.##########.', '..########..', '...######...', '....####....', '....####....', '...######...', '..########..', '.##########.']
};

const PLAT_COLORS = {
  turbo: { b: 0xf28c28, d: 0x7a3e00, s: 0xfff3a3 },
  pulo: { b: 0x3fa34d, d: 0x14501e, s: 0xffffff },
  escudo: { b: 0x378add, d: 0x042c53, s: 0xe6f1fb },
  cura: { b: 0x6cc24a, d: 0x27500a, s: 0xe24b4a },
  ima: { b: 0x7f77dd, d: 0x26215c, s: 0xe24b4a },
  tempo: { b: 0x1d9e75, d: 0x04342c, s: 0xfac775 }
};

export function buildClaudeBuffPlatform(type = 'turbo') {
  const alias = { speed_pad: 'turbo', trampoline: 'pulo', shield: 'escudo', heal: 'cura', magnet: 'ima', clock: 'tempo', bullet: 'tempo', mega_stamina: 'turbo', rocket: 'turbo' };
  const t = alias[type] || (PLAT_COLORS[type] ? type : 'turbo');
  const raw = getOrBuildTemplate(`plat:${t}`, (c) => {
    const col = PLAT_COLORS[t];
    const pat = PLAT_PATTERNS[t];
    for (let x = 0; x < 14; x++) {
      for (let z = 0; z < 10; z++) c.V(x, 0, z, col.d);
    }
    for (let x = 1; x < 13; x++) {
      for (let z = 1; z < 9; z++) c.V(x, 1, z, col.b, { e: 0.16 });
    }
    [[0, 0], [13, 0], [0, 9], [13, 9]].forEach(([cx, cz]) => c.V(cx, 1, cz, 0xffffff, { e: 0.6 }));
    for (let r = 0; r < 8; r++) {
      for (let k = 0; k < 12; k++) {
        if (pat[r][k] === '#') {
          c.V(1 + k, 2, 1 + r, col.s, { e: 0.55 });
          c.V(1 + k, 3, 1 + r, col.s, { e: 0.55 });
        }
      }
    }
  });
  // Centraliza placa 14x10 voxels (-0.70 em X, -0.50 em Z)
  const wrap = new THREE.Group();
  raw.position.set(-0.7, 0, -0.5);
  wrap.add(raw);
  return wrap;
}

// ===================================================
// 3. OBSTÁCULOS DE PISTA E ATAQUES DE BOSS (10 TIPOS)
// ===================================================
export function buildClaudeBossObstacle(type = 'tronco', opts = {}) {
  const withWarn = opts.withWarn !== false;
  const centeredBody = !!opts.centeredBody;
  const cacheKey = `obs:${type}:${withWarn ? 1 : 0}:${centeredBody ? 1 : 0}`;
  const raw = getOrBuildTemplate(cacheKey, (c) => {
    switch (type) {
      case 'tronco': {
        const yOff = centeredBody ? 0 : 3;
        for (let x = -6; x <= 5; x++) {
          for (let y = -3; y <= 3; y++) {
            for (let z = -3; z <= 3; z++) {
              const d = y * y + z * z;
              if (d > 9) continue;
              let col = d >= 6 ? 0x5c3517 : 0x7a4b24;
              if (x === -6 || x === 5) col = (d >= 2 && d < 6) ? 0xa9773f : 0xc79a5e;
              if ((x === -3 || x === 2) && d >= 5) col = 0xc0392b;
              c.V(x, y + yOff, z, col);
            }
          }
        }
        if (withWarn) c.warn(8, 6, 0);
        break;
      }
      case 'rocha': {
        for (let x = -5; x <= 5; x++) {
          for (let y = 0; y <= 13; y++) {
            for (let z = -5; z <= 5; z++) {
              const dx = x / 4.8;
              const dy = (y - 6.5) / 7;
              const dz = z / 4.8;
              if (dx * dx + dy * dy + dz * dz > 1) continue;
              let col = y > 9 ? 0xb4b2a9 : (y < 3 ? 0x5f5e5a : 0x888780);
              if (((x * 3 + y * 2 + z) % 11) === 0) col = 0x444441;
              c.V(x, y, z, col);
            }
          }
        }
        for (let i = -2; i <= 2; i++) {
          for (const s of [1, -1]) {
            const x = i;
            const y = 7 + i * s;
            const q = 1 - (x / 4.8) * (x / 4.8) - ((y - 6.5) / 7) * ((y - 6.5) / 7);
            if (q > 0) {
              const zCr = Math.floor(4.8 * Math.sqrt(q)) + 1;
              c.V(x, y, zCr, 0xff5a4d, { e: 0.85 });
              c.V(x, y, -zCr, 0xff5a4d, { e: 0.85 });
            }
          }
        }
        if (withWarn) c.warn(8, 8, 0);
        break;
      }
      case 'onda': {
        for (let x = -11; x <= 11; x++) {
          for (let z = -11; z <= 11; z++) {
            const d = Math.hypot(x, z);
            if (d > 11.5) continue;
            c.V(x, 0, z, d < 3 ? 0x6b4f2a : 0xc9a56a);
            let h = 0;
            if (Math.abs(d - 4) < 0.8) h = 4;
            else if (Math.abs(d - 7) < 0.8) h = 3;
            else if (Math.abs(d - 10) < 0.8) h = 2;
            for (let y = 1; y <= h; y++) c.V(x, y, z, 0xe3c28a);
          }
        }
        [[3, 5, -2], [-4, 7, 3], [1, 9, 5], [-2, 6, -5]].forEach(([bx, by, bz]) => c.B(bx, by, bz, 2, 2, 2, 0xa8895b));
        if (withWarn) c.warn(13, 13, 0);
        break;
      }
      case 'espinhos': {
        c.disc(0, 0, 0, 9, 0xc9a56a);
        [[0, 0, 13], [-5, 2, 9], [5, -1, 11], [-2, -6, 8], [3, 5, 9]].forEach(([sx, sz, sh]) => {
          c.cone(sx, sz, sh, 2.6, 0xe3c28a, 0xfff0c8, false, 1);
        });
        if (withWarn) c.warn(11, 11, 0);
        break;
      }
      case 'raio': {
        c.disc(0, 0, 0, 6, 0x444441);
        c.disc(0, 0, 0, 3, 0x2c2c2a);
        for (let y = 2; y <= 22; y++) {
          const x = Math.round(2.2 * Math.sin(y * 0.6));
          c.V(x, y, 0, 0xffe45c, { e: 0.92 });
          c.V(x + 1, y, 0, 0xffe45c, { e: 0.92 });
        }
        [[-5, 3, 3], [4, 5, -4], [5, 2, 3]].forEach(([sx, sy, sz]) => c.B(sx, sy, sz, 1, 1, 1, 0xfff3a3, { e: 1 }));
        if (withWarn) c.warn(9, 9, 0);
        break;
      }
      case 'feixe': {
        c.disc(0, 0, 22, 4, 0xb8bcc4, { m: 0.5 });
        c.disc(0, 0, 23, 7, 0xb8bcc4, { m: 0.5 });
        c.disc(0, 0, 24, 5, 0x8e929a, { m: 0.5 });
        c.disc(0, 0, 25, 3, 0x7fd3e8, { a: 0.8 });
        c.disc(0, 0, 26, 2, 0x7fd3e8, { a: 0.8 });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          c.V(Math.round(7 * Math.cos(a)), 23, Math.round(7 * Math.sin(a)), 0xffe45c, { e: 1 });
        }
        c.addExtra(
          new THREE.CylinderGeometry(0.3, 0.9, 2.2, 24, 1, true),
          getCachedMaterial('feixe_beam', {
            color: 0xfff3a3,
            emissive: 0xfff3a3,
            emissiveIntensity: 0.65,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
            depthWrite: false
          }),
          [0.05, 1.1, 0.05]
        );
        c.disc(0, 0, 0, 8, 0xe8e3b0, { a: 0.6 });
        if (withWarn) c.warn(10, 10, 0);
        break;
      }
      case 'poca': {
        c.disc(0, 0, 0, 8, 0x6bbf3a);
        c.disc(0, 0, 1, 5, 0x3f8a1e);
        [[-3, 2, 2], [2, -3, 2], [3, 3, 1.6], [-1, -1, 2]].forEach(([bx, bz, bs]) => c.B(bx, 1.6, bz, bs, bs, bs, 0xd6f5a0, { e: 0.45 }));
        if (withWarn) c.warn(10, 10, 0);
        break;
      }
      case 'magma': {
        c.disc(0, 0, 0, 6, 0x4a2a1a);
        for (let y = 1; y <= 13; y++) {
          for (let x = -3; x <= 3; x++) {
            for (let z = -3; z <= 3; z++) {
              if (x * x + z * z <= 10) {
                c.V(x, y, z, hash3(x, y, z) === 0 ? 0x8a2d0e : 0xe8622a, { e: 0.35 });
              }
            }
          }
        }
        c.disc(0, 0, 14, 4, 0xffc53d, { e: 0.9 });
        c.disc(0, 0, 15, 2, 0xfff3a3, { e: 1 });
        [[4, 3], [-4, 6], [3, -4]].forEach(([sx, sz]) => c.B(sx, 8, sz, 1, 3, 1, 0xffc53d, { e: 0.8 }));
        if (withWarn) c.warn(9, 9, 0);
        break;
      }
      case 'gelo': {
        const S = [[-4, -2, 12, 8], [3, 2, 15, 6], [0, -6, 10, 9], [5, -5, 9, 10]];
        S.forEach(([sx, sz, sh, sy]) => {
          c.disc(sx, sz, 0, 2, 0x444441);
          c.cone(sx, sz, sh, 3, 0xa9d9f2, 0xe6f1fb, true, sy);
        });
        if (withWarn) c.warn(10, 10, 0);
        break;
      }
      case 'teia': {
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          for (let d = 0; d <= 9; d++) c.V(Math.round(d * Math.cos(a)), 10 + Math.round(d * Math.sin(a)), 0, 0xd3d1c7);
        }
        [3, 6, 9].forEach((d) => {
          for (let i = 0; i < 48; i++) {
            const t = (i / 48) * Math.PI * 2;
            c.V(Math.round(d * Math.cos(t)), 10 + Math.round(d * Math.sin(t)), 0, 0xd3d1c7);
          }
        });
        for (let x = -2; x <= 2; x++) {
          for (let y = -2; y <= 2; y++) {
            for (let z = -1; z <= 1; z++) {
              if (x * x + y * y + z * z * 2 <= 5) c.V(x, 10 + y, z, 0xeaf3de);
            }
          }
        }
        c.B(-10, 0, 0, 1, 20, 1, 0x5f5e5a);
        c.B(9, 0, 0, 1, 20, 1, 0x5f5e5a);
        if (withWarn) c.warn(8, 6, 0);
        break;
      }
      default:
        break;
    }
  });
  const wrap = new THREE.Group();
  raw.position.set(-0.05, 0, -0.05);
  wrap.add(raw);
  return wrap;
}

// ===================================================
// 4. ACESSÓRIOS VOXEL PARA O DINO (7 VARIANTES)
// Emissor centrado relativo ao sistema local do jogador (-Z frente!)
// ===================================================
export function buildClaudeAccessoryGroup(id) {
  const alias = {
    tophat: 'cartola',
    crown: 'coroa',
    glasses: 'oculos',
    helmet: 'capacete',
    pirate_hat: 'pirata',
    cape: 'capa',
    jetpack: 'foguete'
  };
  const t = alias[id] || id;
  if (!['cartola', 'coroa', 'oculos', 'capacete', 'pirata', 'capa', 'foguete'].includes(t)) return null;

  // Cada acessório é construído relativo à sua âncora no modelo Claude e então espelhado (rotY = Math.PI) para frente = -Z!
  const raw = getOrBuildTemplate(`acc:${t}`, (c) => {
    if (t === 'cartola') {
      // Âncora base y=13U, centro z=4.5U -> offset local (0, 0, 0) no topo da cabeça
      c.B(-4, 0, -3.5, 8, 1, 7, 0x1a1a1a);
      c.B(-2.5, 1, -2, 5, 6, 4, 0x1a1a1a);
      c.B(-2.6, 1, -2.1, 5.2, 1.5, 4.2, 0xc0392b);
      c.B(-0.8, 1.1, 2.0, 1.6, 1.2, 0.3, 0xf5c518, { m: 0.8 });
    } else if (t === 'coroa') {
      c.B(-3, 0, -2.5, 6, 1.2, 5, 0xf5c518, { m: 0.8 });
      [[-3, -2.5], [1.8, -2.5], [-3, 1.5], [1.8, 1.5], [-0.6, -0.5]].forEach(([px, pz]) => c.B(px, 1.2, pz, 1.2, 2, 1, 0xf5c518, { m: 0.8 }));
      c.B(-0.6, 0.2, 2.4, 1.2, 0.8, 0.3, 0xe24b4a, { e: 0.6 });
      c.B(-3.1, 0.2, -0.5, 0.3, 0.8, 1, 0x378add, { e: 0.6 });
    } else if (t === 'oculos') {
      // Âncora nos olhos (y=11.2U, z=7.6U no ref -> local (0, 0, 0))
      c.B(-2.6, -0.9, 0, 2.3, 1.8, 0.6, 0x111111, { m: 0.6 });
      c.B(0.3, -0.9, 0, 2.3, 1.8, 0.6, 0x111111, { m: 0.6 });
      c.B(-2.8, 0.9, -0.1, 5.6, 0.3, 0.6, 0xf5c518, { m: 0.8 });
      c.B(-0.3, 0, 0, 0.6, 0.4, 0.5, 0xf5c518, { m: 0.8 });
      c.B(-3.2, 0.2, -4.6, 0.4, 0.4, 4.6, 0xf5c518);
      c.B(2.8, 0.2, -4.6, 0.4, 0.4, 4.6, 0xf5c518);
      c.B(-2.2, 0.2, 0.6, 0.6, 0.4, 0.1, 0x9a9a9a, { e: 0.35 });
      c.B(0.7, 0.2, 0.6, 0.6, 0.4, 0.1, 0x9a9a9a, { e: 0.35 });
    } else if (t === 'capacete') {
      // Âncora no centro da cabeça (0, 10.5U, 4.5U -> (0, 0, 0))
      for (let x = -6; x <= 6; x++) {
        for (let y = -6; y <= 7; y++) {
          for (let z = -6; z <= 6; z++) {
            const d = Math.hypot(x, y, z);
            if (d > 4.9 && d < 5.7 && y >= -4) c.V(x, y, z, 0xb5d4f4, { a: 0.34 });
          }
        }
      }
      for (let x = -5; x <= 5; x++) {
        for (let z = -5; z <= 5; z++) {
          const d = Math.hypot(x, z);
          if (d > 4.0 && d < 5.4) c.B(x, -4.8, z, 1, 1.2, 1, 0xf1efe8);
        }
      }
      c.B(-0.25, 5.5, -0.25, 0.5, 3, 0.5, 0x888780);
      c.B(-0.6, 8.5, -0.6, 1.2, 1.2, 1.2, 0xe24b4a, { e: 0.85 });
    } else if (t === 'pirata') {
      // Chapéu no topo + tapa-olho estendendo até o olho (-2.3, -2.9, 3.05 relativos ao topo-centro!)
      c.B(-4.5, 0, -3.5, 9, 1, 7, 0x1a1a1a);
      c.B(-4.5, 1, -3.5, 1.5, 1.5, 7, 0x1a1a1a);
      c.B(3, 1, -3.5, 1.5, 1.5, 7, 0x1a1a1a);
      c.B(-4.5, 1, -3.5, 9, 1.5, 1.5, 0x1a1a1a);
      c.B(-2.5, 1, -2, 5, 3, 4, 0x1a1a1a);
      c.B(-4.6, 1, -3.5, 0.3, 0.4, 7, 0xf5c518, { m: 0.8 });
      c.B(-0.8, 1.6, 2.05, 1.6, 1.4, 0.3, 0xf1efe8);
      c.B(-0.6, 2.1, 2.35, 0.4, 0.4, 0.1, 0x111111);
      c.B(0.2, 2.1, 2.35, 0.4, 0.4, 0.1, 0x111111);
      c.B(-1.6, 1.2, 2.05, 3.2, 0.3, 0.3, 0xf1efe8);
      // Tapa-olho
      c.B(-2.3, -2.6, 2.8, 1.6, 1.6, 0.3, 0x111111);
    } else if (t === 'capa') {
      // Âncora nas costas do torso (0, 6U, -4.5U -> local (0, 0, 0))
      c.B(-3.5, -1, -0.5, 7, 5, 0.8, 0xc0392b);
      c.B(-4, -3, -1.3, 8, 2.2, 0.8, 0xa32d2d);
      c.B(-3.6, 3, -0.5, 7.2, 1, 1, 0xf1efe8);
      c.B(-3.2, 3, 0.1, 6.4, 1, 0.6, 0xf5c518, { m: 0.8 });
      c.B(-0.7, 1.6, -0.7, 1.4, 1.4, 0.4, 0xf5c518, { m: 0.8 });
    } else if (t === 'foguete') {
      // Âncora nas costas do torso (0, 6U, -4.5U -> local (0, 0, 0))
      [-2.8, 0.6].forEach((x) => {
        c.B(x, -2, -2, 2.2, 5, 2.2, 0xd3d1c7, { m: 0.4 });
        c.B(x, 3, -2, 2.2, 1.2, 2.2, 0xe24b4a);
        c.B(x + 0.5, 4.2, -1.5, 1.2, 1, 1.2, 0xe24b4a);
        c.B(x + 0.4, -4.4, -1.6, 1.4, 2.4, 1.4, 0xffc53d, { e: 0.9 });
        c.B(x + 0.7, -5.6, -1.3, 0.8, 1.4, 0.8, 0xfff3a3, { e: 1 });
      });
      c.B(-3, 0, 0.1, 6, 0.8, 0.5, 0x5f5e5a);
      c.B(-3, -2, 0.1, 6, 0.8, 0.5, 0x5f5e5a);
    }
  });

  // Rotaciona 180º no eixo Y para alinhar frente (+Z de Claude) com frente (-Z do DinoFactory)!
  const wrap = new THREE.Group();
  raw.rotation.y = Math.PI;
  wrap.add(raw);
  return wrap;
}

// ================================================================
// 4. SINALIZAÇÃO VISUAL DE PERIGO (FÁCIL / NORMAL) & ESTRUTURAS NOVAS
// ================================================================
export function buildHazardFloorSign() {
  const g = getOrBuildTemplate('hazard_floor_x_v1', (c) => {
    // Contorno quadrado vermelho luminoso + X central de proibição + setas laterais
    c.B(-9, 0.3, -9, 18, 0.8, 1.4, 0xff3b30, { e: 0.9 });
    c.B(-9, 0.3, 7.6, 18, 0.8, 1.4, 0xff3b30, { e: 0.9 });
    c.B(-9, 0.3, -7.6, 1.4, 0.8, 15.2, 0xff3b30, { e: 0.9 });
    c.B(7.6, 0.3, -7.6, 1.4, 0.8, 15.2, 0xff3b30, { e: 0.9 });
    for (let i = -5; i <= 5; i++) {
      c.B(i - 0.6, 0.45, i - 0.6, 1.4, 0.6, 1.4, 0xff4757, { e: 0.95 });
      c.B(i - 0.6, 0.45, -i - 0.6, 1.4, 0.6, 1.4, 0xff4757, { e: 0.95 });
    }
    // Setas laterais vermelhas nas bordas externas
    c.B(-11.5, 0.5, -1, 2, 0.8, 2, 0xff6b6b, { e: 0.85 });
    c.B(9.5, 0.5, -1, 2, 0.8, 2, 0xff6b6b, { e: 0.85 });
  });
  return g;
}

export function buildTallProhibitionBarrier(withWarn = true) {
  const key = withWarn ? 'tall_prohibit_warn_v1' : 'tall_prohibit_raw_v1';
  const g = getOrBuildTemplate(key, (c) => {
    // Barreira alta >= 2.5m (impossível de pular — exige troca de faixa!)
    c.B(-9, 0, -3, 2, 26, 6, 0x334155, { m: 0.35 });
    c.B(7, 0, -3, 2, 26, 6, 0x334155, { m: 0.35 });
    c.B(-8, 12, -2.5, 16, 13, 5, 0x475569, { m: 0.25 });
    c.B(-8, 1, -2.5, 16, 10, 5, 0x1e293b, { m: 0.25 });
    if (withWarn) {
      // Placa vermelha de impedimento vertical + X + setas laterais brilhantes
      c.B(-7.5, 11.5, 2.7, 15, 1.6, 1.0, 0xff3b30, { e: 0.95 });
      c.B(-7.5, 22.8, 2.7, 15, 1.6, 1.0, 0xff3b30, { e: 0.95 });
      c.B(-7.5, 13, 2.7, 1.6, 9.8, 1.0, 0xff3b30, { e: 0.95 });
      c.B(5.9, 13, 2.7, 1.6, 9.8, 1.0, 0xff3b30, { e: 0.95 });
      for (let i = -3; i <= 3; i++) {
        c.B(i - 0.6, 17.2 + i, 3.0, 1.5, 1.5, 0.9, 0xff4757, { e: 0.95 });
        c.B(i - 0.6, 17.2 - i, 3.0, 1.5, 1.5, 0.9, 0xff4757, { e: 0.95 });
      }
      c.warn(11, 7, 0);
    }
  });
  return g;
}

export function buildDuckSignOverlay() {
  return getOrBuildTemplate('duck_arrow_overlay_v1', (c) => {
    // Seta dupla vermelha/ciano apontando PARA BAIXO na placa suspensa
    for (let y = 0; y <= 5; y++) {
      c.B(-0.8, 1 + y, 0, 1.6, 1.2, 1.2, 0xff5a4d, { e: 0.95 });
    }
    c.B(-3.5, 1.5, 0, 7, 1.4, 1.2, 0xff5a4d, { e: 0.95 });
    c.B(-2.2, 0.2, 0, 4.4, 1.4, 1.2, 0xff5a4d, { e: 0.95 });
    c.B(-1.0, -1.0, 0, 2.0, 1.4, 1.2, 0xff5a4d, { e: 0.95 });
  });
}

export function buildHollowEarthPortalGroup() {
  return getOrBuildTemplate('hollow_earth_portal_v1', (c) => {
    c.disc(0, 0, 0.2, 9.5, 0x312e81);
    c.disc(0, 0, 0.4, 7.2, 0x7c3aed, { e: 0.55 });
    c.disc(0, 0, 0.6, 4.8, 0x2dd4bf, { e: 0.95 });
    // Arco de cristais ao redor do portal
    for (let a = 0; a <= Math.PI; a += Math.PI / 8) {
      const px = Math.round(Math.cos(a) * 9.5);
      const py = Math.round(Math.sin(a) * 14 + 2);
      c.B(px - 1, py, -1.5, 2.4, 3.2, 3, a % 2 === 0 ? 0x2dd4bf : 0xa855f7, { e: 0.85 });
    }
    // Fissuras luminosas no chão
    c.B(-11, 0.3, -4, 4, 0.6, 1.2, 0x2dd4bf, { e: 0.9 });
    c.B(7, 0.3, 3, 4.5, 0.6, 1.2, 0xa855f7, { e: 0.9 });
  });
}

export function buildEarthquakeCrackGroup() {
  return getOrBuildTemplate('quake_crack_v1', (c) => {
    c.B(-8, 0.1, -6, 16, 0.4, 3, 0x1c1917);
    c.B(-6, 0.18, -5.2, 12, 0.35, 1.4, 0xf97316, { e: 0.85 });
    c.B(-3, 0.18, -3, 2, 0.35, 8, 0x2dd4bf, { e: 0.85 });
    c.B(2, 0.18, -7, 2, 0.35, 6, 0xf97316, { e: 0.85 });
  });
}

export function buildShopLaneGateGroup() {
  return getOrBuildTemplate('shop_lane_gate_v1', (c) => {
    // Quiosque pré-histórico dourado da Lojinha da 4ª Pista
    c.B(-11, 0, -6, 2.5, 22, 3, 0x78350f);
    c.B(8.5, 0, -6, 2.5, 22, 3, 0x78350f);
    c.B(-12, 20, -7.5, 24, 5, 6, 0xd97706, { m: 0.25 });
    c.B(-10, 21, -7.8, 20, 3, 6.6, 0xfacc15, { e: 0.85 });
    c.B(-9.5, 0.2, -5, 19, 1.2, 10, 0x22c55e, { e: 0.45 });
    c.B(-3, 25, -6, 6, 4, 3, 0x38bdf8, { e: 0.9 });
  });
}

export function buildMutationCapsuleGroup(hexColor = 0x2dd4bf) {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.72, roughness: 0.24 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.32, roughness: 0.15 });
  const helixMat = new THREE.MeshStandardMaterial({ color: hexColor, emissive: hexColor, emissiveIntensity: 0.85, roughness: 0.2 });
  const capGeo = new THREE.BoxGeometry(0.95, 0.18, 0.95);
  const topCap = new THREE.Mesh(capGeo, frameMat);
  topCap.position.y = 0.72;
  const botCap = new THREE.Mesh(capGeo, frameMat);
  botCap.position.y = -0.68;
  const tube = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.28, 0.76), glassMat);
  g.add(topCap, botCap, tube);
  for (let i = 0; i < 6; i++) {
    const a = i * 0.95;
    const node = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.24), helixMat);
    node.position.set(Math.cos(a) * 0.2, -0.45 + i * 0.18, Math.sin(a) * 0.2);
    const node2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.24), helixMat);
    node2.position.set(-Math.cos(a) * 0.2, -0.45 + i * 0.18, -Math.sin(a) * 0.2);
    g.add(node, node2);
  }
  return g;
}
