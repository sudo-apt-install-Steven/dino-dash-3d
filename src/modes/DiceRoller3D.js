import * as THREE from 'three';

/**
 * Supported polyhedral dice types.
 */
export const SUPPORTED_DICE = [
  'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd10', 'd12', 'd14', 'd16', 'd20', 'd24', 'd30', 'd100'
];

export const DICE_SIDES = Object.freeze({
  d2: 2,
  d3: 3,
  d4: 4,
  d5: 5,
  d6: 6,
  d7: 7,
  d8: 8,
  d10: 10,
  d12: 12,
  d14: 14,
  d16: 16,
  d20: 20,
  d24: 24,
  d30: 30,
  d100: 100,
});

export const DICE_MATERIALS = Object.freeze({
  resina: { id: 'resina', label: 'Resina Polida', roughness: 0.2, metalness: 0.1, clearcoat: 0.8 },
  osso_dino: { id: 'osso_dino', label: 'Osso de Dinossauro', roughness: 0.65, metalness: 0.05 },
  pedra_vulcanica: { id: 'pedra_vulcanica', label: 'Pedra Vulcânica', roughness: 0.85, metalness: 0.2, emissive: '#e11d48', emissiveIntensity: 0.2 },
  ambar: { id: 'ambar', label: 'Âmbar com Inseto', roughness: 0.15, metalness: 0.1, opacity: 0.92 },
  jade: { id: 'jade', label: 'Jade Ancestral', roughness: 0.3, metalness: 0.15 },
  madeira_petrificada: { id: 'madeira_petrificada', label: 'Madeira Petrificada', roughness: 0.7, metalness: 0.08 },
  ouro_jurassico: { id: 'ouro_jurassico', label: 'Ouro Jurássico', roughness: 0.25, metalness: 0.9 },
  cristal_meteoro: { id: 'cristal_meteoro', label: 'Cristal de Meteoro', roughness: 0.1, metalness: 0.4, emissive: '#818cf8', emissiveIntensity: 0.3 },
  neon: { id: 'neon', label: 'Néon Pré-Histórico', roughness: 0.18, metalness: 0.3, emissive: '#22d3ee', emissiveIntensity: 0.5 }
});

const DICE_PALETTE = Object.freeze({
  d2: { bg: '#27200f', bg2: '#5c4312', border: '#fbbf24', text: '#fef3c7', metalness: 0.55, roughness: 0.28 },
  d3: { bg: '#27131a', bg2: '#4c1d2e', border: '#fb7185', text: '#ffe4e6', metalness: 0.25, roughness: 0.35 },
  d4: { bg: '#0c2427', bg2: '#134e4a', border: '#2dd4bf', text: '#ccfbf1', metalness: 0.25, roughness: 0.35 },
  d5: { bg: '#1c1917', bg2: '#44403c', border: '#f97316', text: '#ffedd5', metalness: 0.3, roughness: 0.3 },
  d6: { bg: '#18181b', bg2: '#27272a', border: '#a1a1aa', text: '#fafafa', metalness: 0.22, roughness: 0.32 },
  d7: { bg: '#1e1b4b', bg2: '#3730a3', border: '#818cf8', text: '#e0e7ff', metalness: 0.32, roughness: 0.28 },
  d8: { bg: '#0f1c2e', bg2: '#1e3a5f', border: '#38bdf8', text: '#e0f2fe', metalness: 0.28, roughness: 0.32 },
  d10: { bg: '#1f1635', bg2: '#3b2069', border: '#c084fc', text: '#f3e8ff', metalness: 0.3, roughness: 0.3 },
  d10Tens: { bg: '#23170b', bg2: '#4d2c0f', border: '#f59e0b', text: '#fef3c7', metalness: 0.35, roughness: 0.28 },
  d10Units: { bg: '#111827', bg2: '#1e293b', border: '#38bdf8', text: '#f0f9ff', metalness: 0.35, roughness: 0.28 },
  d12: { bg: '#0d2318', bg2: '#14532d', border: '#34d399', text: '#d1fae5', metalness: 0.28, roughness: 0.32 },
  d14: { bg: '#14532d', bg2: '#166534', border: '#4ade80', text: '#dcfce7', metalness: 0.35, roughness: 0.28 },
  d16: { bg: '#4c0519', bg2: '#881337', border: '#fb7185', text: '#ffe4e6', metalness: 0.35, roughness: 0.25 },
  d20: { bg: '#13112b', bg2: '#2e1d6b', border: '#818cf8', text: '#eef2ff', metalness: 0.32, roughness: 0.28 },
  d24: { bg: '#451a03', bg2: '#78350f', border: '#fbbf24', text: '#fef3c7', metalness: 0.45, roughness: 0.25 },
  d30: { bg: '#3b0764', bg2: '#6b21a8', border: '#c084fc', text: '#f3e8ff', metalness: 0.4, roughness: 0.25 },
  d100: { bg: '#23170b', bg2: '#4d2c0f', border: '#f59e0b', text: '#fef3c7', metalness: 0.35, roughness: 0.28 },
});

function normalizeDiceType(diceType) {
  if (typeof diceType === 'string') {
    const lower = diceType.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(DICE_SIDES, lower)) {
      return lower;
    }
  }
  return 'd20';
}

function clampCount(count) {
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 20) return 20;
  return n;
}

export function cryptoRngUnit() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / (0xffffffff + 1);
  }
  return Math.random();
}

function safeRngUnit(rng) {
  let u = typeof rng === 'function' ? Number(rng()) : cryptoRngUnit();
  if (!Number.isFinite(u) || u < 0) u = 0;
  if (u >= 1) u = 0.999999999999;
  return u;
}

function clampInt(val, min, max) {
  const n = Math.round(Number(val));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export const DICE_BAG_PRESETS = Object.freeze([
  { id: 'ataque', label: '⚔️ Teste de Ataque', formula: '1d20+3', desc: '1d20 + Bônus de Arma/Força' },
  { id: 'dano_adaga', label: '🗡️ Dano Leve (Adaga/Garra)', formula: '1d4+2', desc: '1d4 + Bônus' },
  { id: 'dano_espada', label: '⚔️ Dano Médio (Espada/Mordida)', formula: '1d8+3', desc: '1d8 + Bônus' },
  { id: 'dano_machado', label: '🪓 Dano Pesado (Machado/Cauda)', formula: '1d12+4', desc: '1d12 + Bônus' },
  { id: 'dano_duas_maos', label: '💥 Dano Brutal (2 Mãos)', formula: '2d6+4', desc: '2d6 + Bônus' },
  { id: 'salvaguarda', label: '🛡️ Teste de Salvaguarda', formula: '1d20+2', desc: '1d20 + Vigor/Instinto' },
  { id: 'iniciativa', label: '⚡ Iniciativa', formula: '1d20+2', desc: '1d20 + Agilidade' },
  { id: 'vantagem', label: '✨ Vantagem (2d20)', formula: '1d20adv', desc: 'Rola 2d20, mantém o maior' },
  { id: 'desvantagem', label: '⚠️ Desvantagem (2d20)', formula: '1d20dis', desc: 'Rola 2d20, mantém o menor' },
  { id: 'atributos', label: '🎲 4d6 descartando o menor', formula: '4d6kh3', desc: 'Rola 4d6, mantém os 3 maiores' },
  { id: 'percentil', label: '💯 Percentil (D100)', formula: '1d100', desc: 'Rolagem D100 (1 a 100)' }
]);

/**
 * Parses and evaluates tabletop dice notation (Parte 2).
 * Supports:
 * - NdX + M / NdX - M
 * - NdXkhY (keep highest Y)
 * - NdXklY (keep lowest Y)
 * - 1d20adv (advantage)
 * - 1d20dis (disadvantage)
 * - NdX! (exploding dice)
 * - Multi-die sums: '1d20 + 2d6 + 4'
 */
export function rollTabletopFormula(formula = '1d20', rng = cryptoRngUnit) {
  const clean = String(formula).toLowerCase().replace(/\s+/g, '');
  const tokenRegex = /([+-]?)(?:(\d*)d(\d+|100)(kh\d+|kl\d+|adv|dis|!)?|(\d+))/gi;
  let match;
  const diceGroups = [];
  let flatModifier = 0;
  let totalSum = 0;
  let isCrit = false;
  let isFumble = false;

  while ((match = tokenRegex.exec(clean)) !== null) {
    const sign = match[1] === '-' ? -1 : 1;
    if (match[5] !== undefined) {
      const num = parseInt(match[5], 10) * sign;
      flatModifier += num;
      totalSum += num;
    } else {
      const countRaw = match[2] ? parseInt(match[2], 10) : 1;
      let count = Math.min(20, Math.max(1, countRaw));
      const sides = Math.max(2, parseInt(match[3], 10) || 20);
      const mod = match[4] || '';
      const diceType = `d${sides}`;

      let rolls = [];
      if (mod === 'adv') {
        const r1 = Math.floor(safeRngUnit(rng) * sides) + 1;
        const r2 = Math.floor(safeRngUnit(rng) * sides) + 1;
        rolls = [r1, r2];
        const kept = [Math.max(r1, r2)];
        const dropped = [Math.min(r1, r2)];
        const subTotal = kept[0] * sign;
        totalSum += subTotal;
        if (sides === 20 && kept[0] === 20) isCrit = true;
        if (sides === 20 && kept[0] === 1) isFumble = true;
        diceGroups.push({ type: diceType, mode: 'adv', rolls, kept, dropped, sum: kept[0] });
      } else if (mod === 'dis') {
        const r1 = Math.floor(safeRngUnit(rng) * sides) + 1;
        const r2 = Math.floor(safeRngUnit(rng) * sides) + 1;
        rolls = [r1, r2];
        const kept = [Math.min(r1, r2)];
        const dropped = [Math.max(r1, r2)];
        const subTotal = kept[0] * sign;
        totalSum += subTotal;
        if (sides === 20 && kept[0] === 20) isCrit = true;
        if (sides === 20 && kept[0] === 1) isFumble = true;
        diceGroups.push({ type: diceType, mode: 'dis', rolls, kept, dropped, sum: kept[0] });
      } else if (mod.startsWith('kh')) {
        const k = Math.min(count, Math.max(1, parseInt(mod.slice(2), 10) || 1));
        for (let i = 0; i < count; i++) {
          rolls.push(Math.floor(safeRngUnit(rng) * sides) + 1);
        }
        const sorted = [...rolls].sort((a, b) => b - a);
        const kept = sorted.slice(0, k);
        const dropped = sorted.slice(k);
        const sum = kept.reduce((a, b) => a + b, 0);
        totalSum += sum * sign;
        diceGroups.push({ type: diceType, mode: `kh${k}`, rolls, kept, dropped, sum });
      } else if (mod.startsWith('kl')) {
        const k = Math.min(count, Math.max(1, parseInt(mod.slice(2), 10) || 1));
        for (let i = 0; i < count; i++) {
          rolls.push(Math.floor(safeRngUnit(rng) * sides) + 1);
        }
        const sorted = [...rolls].sort((a, b) => a - b);
        const kept = sorted.slice(0, k);
        const dropped = sorted.slice(k);
        const sum = kept.reduce((a, b) => a + b, 0);
        totalSum += sum * sign;
        diceGroups.push({ type: diceType, mode: `kl${k}`, rolls, kept, dropped, sum });
      } else if (mod === '!') {
        for (let i = 0; i < count; i++) {
          let r = Math.floor(safeRngUnit(rng) * sides) + 1;
          rolls.push(r);
          let depth = 0;
          while (r === sides && depth < 10) {
            depth++;
            r = Math.floor(safeRngUnit(rng) * sides) + 1;
            rolls.push(r);
          }
        }
        const sum = rolls.reduce((a, b) => a + b, 0);
        totalSum += sum * sign;
        diceGroups.push({ type: diceType, mode: 'explode', rolls, kept: rolls, dropped: [], sum });
      } else {
        for (let i = 0; i < count; i++) {
          const r = Math.floor(safeRngUnit(rng) * sides) + 1;
          rolls.push(r);
        }
        const sum = rolls.reduce((a, b) => a + b, 0);
        totalSum += sum * sign;
        if (sides === 20 && count === 1 && rolls[0] === 20) isCrit = true;
        if (sides === 20 && count === 1 && rolls[0] === 1) isFumble = true;
        diceGroups.push({ type: diceType, mode: 'normal', rolls, kept: rolls, dropped: [], sum });
      }
    }
  }

  return { formula, diceGroups, flatModifier, total: totalSum, isCrit, isFumble };
}

/**
 * Exact probability calculator for DC reachability and player preview (Regra 2.1).
 */
export function calculateSuccessProbability(diceType = 'd20', diceCount = 1, statBonus = 0, dc = 10, mode = 'normal') {
  const norm = normalizeDiceType(diceType);
  const sides = DICE_SIDES[norm] || 20;
  const count = Math.min(5, Math.max(1, Math.floor(diceCount)));
  const bonus = Number.isFinite(Number(statBonus)) ? Number(statBonus) : 0;
  const target = Number.isFinite(Number(dc)) ? Number(dc) : 10;

  if (mode === 'adv' && count === 1) {
    let success = 0;
    for (let r1 = 1; r1 <= sides; r1++) {
      for (let r2 = 1; r2 <= sides; r2++) {
        if (Math.max(r1, r2) + bonus >= target) success++;
      }
    }
    return success / (sides * sides);
  }

  if (mode === 'dis' && count === 1) {
    let success = 0;
    for (let r1 = 1; r1 <= sides; r1++) {
      for (let r2 = 1; r2 <= sides; r2++) {
        if (Math.min(r1, r2) + bonus >= target) success++;
      }
    }
    return success / (sides * sides);
  }

  if (count === 1) {
    const needed = target - bonus;
    if (needed <= 1) return 1.0;
    if (needed > sides) return 0.0;
    return (sides - needed + 1) / sides;
  }

  let successes = 0;
  const totalPossibilities = Math.pow(sides, count);
  const recurse = (left, sum) => {
    if (left === 0) {
      if (sum + bonus >= target) successes++;
      return;
    }
    for (let s = 1; s <= sides; s++) {
      recurse(left - 1, sum + s);
    }
  };
  recurse(count, 0);
  return successes / totalPossibilities;
}

/**
 * Pure mathematical dice roller. Safe in Node and browser environments.
 *
 * @param {string} [diceType='d20']
 * @param {number} [count=1]
 * @param {() => number} [rng=Math.random]
 * @returns {{ diceType: string, count: number, rolls: number[], total: number, isCrit: boolean, isFumble: boolean }}
 */
export function rollMathDice(diceType = 'd20', count = 1, rng = Math.random) {
  const normalizedType = normalizeDiceType(diceType);
  const safeCount = clampCount(count);
  const sides = DICE_SIDES[normalizedType];
  const rolls = [];
  let total = 0;

  for (let i = 0; i < safeCount; i++) {
    const val = Math.floor(safeRngUnit(rng) * sides) + 1;
    rolls.push(val);
    total += val;
  }

  const isCrit = normalizedType === 'd20' && safeCount === 1 && rolls[0] === 20;
  const isFumble = normalizedType === 'd20' && safeCount === 1 && rolls[0] === 1;

  return {
    diceType: normalizedType,
    count: safeCount,
    rolls,
    total,
    isCrit,
    isFumble,
  };
}

/**
 * Resolves authoritative targetResult (number or array) into valid per-die rolls.
 */
function resolveAuthoritativeRolls(diceType, count, targetResult, rng = Math.random) {
  const sides = DICE_SIDES[diceType];

  if (Array.isArray(targetResult) && targetResult.length > 0) {
    const rolls = [];
    for (let i = 0; i < count; i++) {
      if (i < targetResult.length && Number.isFinite(Number(targetResult[i]))) {
        rolls.push(clampInt(targetResult[i], 1, sides));
      } else {
        rolls.push(Math.floor(safeRngUnit(rng) * sides) + 1);
      }
    }
    return rolls;
  }

  if (typeof targetResult === 'number' && Number.isFinite(targetResult)) {
    if (count === 1) {
      return [clampInt(targetResult, 1, sides)];
    }
    // Distribute target sum across `count` dice, each clamped to [1, sides]
    const targetSum = clampInt(targetResult, count, count * sides);
    const rolls = new Array(count).fill(1);
    let remaining = targetSum - count;
    for (let i = 0; i < count; i++) {
      const slotsLeft = count - 1 - i;
      const maxForOthers = slotsLeft * (sides - 1);
      const minHere = Math.max(0, remaining - maxForOthers);
      const maxHere = Math.min(sides - 1, remaining);
      const pick = minHere + Math.floor(safeRngUnit(rng) * (maxHere - minHere + 1));
      rolls[i] += pick;
      remaining -= pick;
    }
    return rolls;
  }

  return null;
}

function hasDOM() {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

/* ============================================================================
 * Procedural Polyhedral Geometry & Face-Basis Builders
 * ========================================================================== */

function createFaceCanvasTexture(label, palette, shapeHint = 'poly') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Rich radial background
  const grad = ctx.createRadialGradient(size * 0.5, size * 0.42, size * 0.08, size * 0.5, size * 0.5, size * 0.72);
  grad.addColorStop(0, palette.bg2);
  grad.addColorStop(1, palette.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle decorative facet ring
  ctx.strokeStyle = palette.border;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 6;
  if (shapeHint === 'circle') {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.43, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.37, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shapeHint === 'square') {
    ctx.strokeRect(18, 18, size - 36, size - 36);
  } else {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Crisp numeral
  const text = String(label);
  const fontSize = text.length >= 2 ? 96 : 116;
  ctx.font = `800 ${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Soft drop shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = palette.text;
  ctx.fillText(text, size / 2, size / 2 + 2);

  // Disambiguation bar under 6 and 9
  if (text === '6' || text === '9') {
    ctx.shadowBlur = 4;
    ctx.fillStyle = palette.border;
    ctx.fillRect(size / 2 - 22, size / 2 + 54, 44, 7);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Computes a right-handed orthonormal basis (uAxis, vAxis, normal) for a face
 * where uAxis x vAxis = normal.
 */
function buildFaceBasis(normal, preferredUp = null) {
  const n = normal.clone().normalize();
  let refUp = preferredUp ? preferredUp.clone().normalize() : new THREE.Vector3(0, 1, 0);
  if (Math.abs(n.dot(refUp)) > 0.96) {
    refUp = new THREE.Vector3(0, 0, -1);
  }
  // uAxis = refUp x n -> wait: if n = +Z, refUp = +Y, (+Y) x (+Z) = +X!
  const uAxis = new THREE.Vector3().crossVectors(refUp, n).normalize();
  // vAxis = n x uAxis -> (+Z) x (+X) = +Y! And uAxis x vAxis = (+X) x (+Y) = +Z = n!
  const vAxis = new THREE.Vector3().crossVectors(n, uAxis).normalize();
  return { uAxis, vAxis, normal: n };
}

/**
 * Given a non-indexed BufferGeometry whose triangles form planar polygonal faces,
 * groups coplanar adjacent triangles into N logical faces, assigns material groups
 * 0..N-1, projects planar UVs centered on each face, and returns { geometry, faces }.
 */
function preparePolyhedronFromNonIndexed(baseGeometry, expectedFaceCount, uvRadiusScale = 1.0) {
  const geom = baseGeometry.index ? baseGeometry.toNonIndexed() : baseGeometry.clone();
  const posAttr = geom.getAttribute('position');
  const triCount = posAttr.count / 3;

  // Group triangles by face normal
  const groups = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    a.fromBufferAttribute(posAttr, i0);
    b.fromBufferAttribute(posAttr, i0 + 1);
    c.fromBufferAttribute(posAttr, i0 + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    const n = new THREE.Vector3().crossVectors(ab, ac).normalize();

    let found = null;
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].normal.dot(n) > 0.995) {
        found = groups[g];
        break;
      }
    }
    if (!found) {
      found = { normal: n, triangles: [] };
      groups.push(found);
    }
    found.triangles.push([a.clone(), b.clone(), c.clone()]);
  }

  // Rebuild geometry ordered by logical face so each face is a single contiguous material group
  const positions = [];
  const normals = [];
  const uvs = [];
  const faces = [];

  const finalGeom = new THREE.BufferGeometry();
  let vertexCursor = 0;

  for (let f = 0; f < groups.length; f++) {
    const grp = groups[f];
    const centroid = new THREE.Vector3();
    let vCount = 0;
    for (const tri of grp.triangles) {
      for (const v of tri) {
        centroid.add(v);
        vCount++;
      }
    }
    centroid.divideScalar(vCount);

    // Ensure normal points outward from origin
    const outward = grp.normal.clone();
    if (outward.dot(centroid) < 0) {
      outward.negate();
    }

    const { uAxis, vAxis, normal } = buildFaceBasis(outward);

    // Find max planar extent for uniform UV scaling
    let maxExtent = 0.001;
    for (const tri of grp.triangles) {
      for (const v of tri) {
        const rel = v.clone().sub(centroid);
        const dist = Math.hypot(rel.dot(uAxis), rel.dot(vAxis));
        if (dist > maxExtent) maxExtent = dist;
      }
    }
    const uvScale = (0.44 * uvRadiusScale) / maxExtent;

    const groupStart = vertexCursor;
    for (const tri of grp.triangles) {
      for (const v of tri) {
        positions.push(v.x, v.y, v.z);
        normals.push(normal.x, normal.y, normal.z);
        const rel = v.clone().sub(centroid);
        uvs.push(0.5 + rel.dot(uAxis) * uvScale, 0.5 + rel.dot(vAxis) * uvScale);
        vertexCursor++;
      }
    }
    finalGeom.addGroup(groupStart, vertexCursor - groupStart, f);
    faces.push({
      index: f,
      value: f + 1,
      normal,
      uAxis,
      vAxis,
    });
  }

  finalGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  finalGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  finalGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  geom.dispose();
  if (baseGeometry !== geom) {
    baseGeometry.dispose();
  }

  return { geometry: finalGeom, faces, expectedFaceCount };
}

/**
 * D2 Coin Cylinder with explicit planar UV caps (top = 1, bottom = 2, rim = group 2).
 */
function buildD2Geometry() {
  const radius = 1.02;
  const halfH = 0.13;
  const segs = 36;
  const positions = [];
  const normals = [];
  const uvs = [];
  const geom = new THREE.BufferGeometry();
  let cursor = 0;

  // Group 0: Top cap (+Y), value 1
  const topStart = cursor;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    // CCW when viewed from +Y: (0,0), (x1,z1), (x0,z0)
    const verts = [
      [0, halfH, 0],
      [x1, halfH, z1],
      [x0, halfH, z0],
    ];
    for (const [x, y, z] of verts) {
      positions.push(x, y, z);
      normals.push(0, 1, 0);
      uvs.push(0.5 + x / (2 * radius), 0.5 - z / (2 * radius));
      cursor++;
    }
  }
  geom.addGroup(topStart, cursor - topStart, 0);

  // Group 1: Bottom cap (-Y), value 2
  const botStart = cursor;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    // CCW when viewed from -Y: (0,0), (x0,z0), (x1,z1)
    const verts = [
      [0, -halfH, 0],
      [x0, -halfH, z0],
      [x1, -halfH, z1],
    ];
    for (const [x, y, z] of verts) {
      positions.push(x, y, z);
      normals.push(0, -1, 0);
      uvs.push(0.5 + x / (2 * radius), 0.5 + z / (2 * radius));
      cursor++;
    }
  }
  geom.addGroup(botStart, cursor - botStart, 1);

  // Group 2: Rim
  const rimStart = cursor;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const x0 = c0 * radius;
    const z0 = s0 * radius;
    const x1 = c1 * radius;
    const z1 = s1 * radius;

    const quad = [
      [x0, halfH, z0, c0, 0, s0, i / segs, 1],
      [x1, halfH, z1, c1, 0, s1, (i + 1) / segs, 1],
      [x0, -halfH, z0, c0, 0, s0, i / segs, 0],
      [x1, halfH, z1, c1, 0, s1, (i + 1) / segs, 1],
      [x1, -halfH, z1, c1, 0, s1, (i + 1) / segs, 0],
      [x0, -halfH, z0, c0, 0, s0, i / segs, 0],
    ];
    for (const [x, y, z, nx, ny, nz, u, v] of quad) {
      positions.push(x, y, z);
      normals.push(nx, ny, nz);
      uvs.push(u, v);
      cursor++;
    }
  }
  geom.addGroup(rimStart, cursor - rimStart, 2);

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  const faces = [
    { index: 0, value: 1, normal: new THREE.Vector3(0, 1, 0), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 0, -1) },
    { index: 1, value: 2, normal: new THREE.Vector3(0, -1, 0), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 0, 1) },
  ];

  return { geometry: geom, faces, extraRimMaterial: true };
}

/**
 * D3 Triangular Prism: 3 rectangular numbered faces (1, 2, 3) + 2 blank triangular caps.
 */
function buildD3Geometry() {
  const radius = 0.92;
  const halfH = 0.85;
  const ring = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    ring.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const faces = [];
  const geom = new THREE.BufferGeometry();
  let cursor = 0;

  // 3 rectangular side faces (groups 0, 1, 2)
  for (let i = 0; i < 3; i++) {
    const [x0, z0] = ring[i];
    const [x1, z1] = ring[(i + 1) % 3];
    const p00 = new THREE.Vector3(x0, -halfH, z0);
    const p10 = new THREE.Vector3(x1, -halfH, z1);
    const p11 = new THREE.Vector3(x1, halfH, z1);
    const p01 = new THREE.Vector3(x0, halfH, z0);

    const edge = new THREE.Vector3().subVectors(p10, p00);
    const up = new THREE.Vector3(0, 1, 0);
    // Outward normal: check against midpoint
    const mid = new THREE.Vector3().addVectors(p00, p10).multiplyScalar(0.5);
    let n = new THREE.Vector3().crossVectors(edge, up).normalize();
    let v00 = p00;
    let v10 = p10;
    let v11 = p11;
    let v01 = p01;
    if (n.dot(mid) < 0) {
      n.negate();
      // Swap horizontal order so winding is CCW outward and uAxis x vAxis = n
      v00 = p10;
      v10 = p00;
      v11 = p01;
      v01 = p11;
    }
    const uAxis = new THREE.Vector3().subVectors(v10, v00).normalize();
    const vAxis = new THREE.Vector3(0, 1, 0);

    const start = cursor;
    const tris = [
      [v00, 0, 0],
      [v10, 1, 0],
      [v11, 1, 1],
      [v00, 0, 0],
      [v11, 1, 1],
      [v01, 0, 1],
    ];
    for (const [pt, u, v] of tris) {
      positions.push(pt.x, pt.y, pt.z);
      normals.push(n.x, n.y, n.z);
      uvs.push(u, v);
      cursor++;
    }
    geom.addGroup(start, cursor - start, i);
    faces.push({ index: i, value: i + 1, normal: n, uAxis, vAxis });
  }

  // Group 3: Top and bottom triangular caps
  const capStart = cursor;
  // Top cap (+Y)
  const topVerts = [
    new THREE.Vector3(ring[0][0], halfH, ring[0][1]),
    new THREE.Vector3(ring[2][0], halfH, ring[2][1]),
    new THREE.Vector3(ring[1][0], halfH, ring[1][1]),
  ];
  for (const pt of topVerts) {
    positions.push(pt.x, pt.y, pt.z);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);
    cursor++;
  }
  // Bottom cap (-Y)
  const botVerts = [
    new THREE.Vector3(ring[0][0], -halfH, ring[0][1]),
    new THREE.Vector3(ring[1][0], -halfH, ring[1][1]),
    new THREE.Vector3(ring[2][0], -halfH, ring[2][1]),
  ];
  for (const pt of botVerts) {
    positions.push(pt.x, pt.y, pt.z);
    normals.push(0, -1, 0);
    uvs.push(0.5, 0.5);
    cursor++;
  }
  geom.addGroup(capStart, cursor - capStart, 3);

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return { geometry: geom, faces, extraRimMaterial: true };
}

/**
 * D6 Box with opposite faces summing to 7 and exact UV bases.
 */
function buildD6Geometry() {
  const geom = new THREE.BoxGeometry(1.32, 1.32, 1.32);
  // BoxGeometry material group order: 0:+X, 1:-X, 2:+Y, 3:-Y, 4:+Z, 5:-Z
  const faces = [
    { index: 0, value: 1, normal: new THREE.Vector3(1, 0, 0), uAxis: new THREE.Vector3(0, 0, -1), vAxis: new THREE.Vector3(0, 1, 0) },
    { index: 1, value: 6, normal: new THREE.Vector3(-1, 0, 0), uAxis: new THREE.Vector3(0, 0, 1), vAxis: new THREE.Vector3(0, 1, 0) },
    { index: 2, value: 2, normal: new THREE.Vector3(0, 1, 0), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 0, -1) },
    { index: 3, value: 5, normal: new THREE.Vector3(0, -1, 0), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 0, 1) },
    { index: 4, value: 3, normal: new THREE.Vector3(0, 0, 1), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 1, 0) },
    { index: 5, value: 4, normal: new THREE.Vector3(0, 0, -1), uAxis: new THREE.Vector3(-1, 0, 0), vAxis: new THREE.Vector3(0, 1, 0) },
  ];
  return { geometry: geom, faces };
}

/**
 * D10 Pentagonal Trapezohedron — mathematically exact planar kite faces.
 * Faces 0..4 are upper kites (odd values or tens/units), faces 5..9 are lower kites.
 */
function buildD10Geometry(customLabels = null) {
  const H = 1.15;
  const R = 1.06;
  const cos36 = Math.cos(Math.PI / 5);
  const h = H * ((1 - cos36) / (1 + cos36)); // exact planarity ratio tan^2(18 deg)

  const topApex = new THREE.Vector3(0, H, 0);
  const botApex = new THREE.Vector3(0, -H, 0);
  const upper = [];
  const lower = [];

  for (let k = 0; k < 5; k++) {
    const aU = (k * Math.PI * 2) / 5;
    const aL = ((k + 0.5) * Math.PI * 2) / 5;
    upper.push(new THREE.Vector3(Math.cos(aU) * R, h, Math.sin(aU) * R));
    lower.push(new THREE.Vector3(Math.cos(aL) * R, -h, Math.sin(aL) * R));
  }

  const kites = [];
  // 5 upper kites: topApex -> upper[k] -> lower[k] -> upper[(k+1)%5]
  for (let k = 0; k < 5; k++) {
    kites.push([topApex, upper[k], lower[k], upper[(k + 1) % 5]]);
  }
  // 5 lower kites: botApex -> lower[k] -> upper[(k+1)%5] -> lower[(k+1)%5]
  for (let k = 0; k < 5; k++) {
    kites.push([botApex, lower[(k + 1) % 5], upper[(k + 1) % 5], lower[k]]);
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const faces = [];
  const geom = new THREE.BufferGeometry();
  let cursor = 0;

  for (let f = 0; f < 10; f++) {
    const [pApex, pLeft, pTip, pRight] = kites[f];
    const centroid = new THREE.Vector3()
      .add(pApex)
      .add(pLeft)
      .add(pTip)
      .add(pRight)
      .multiplyScalar(0.25);

    const e1 = new THREE.Vector3().subVectors(pLeft, pApex);
    const e2 = new THREE.Vector3().subVectors(pRight, pApex);
    const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
    let vA = pApex;
    let vB = pLeft;
    let vC = pTip;
    let vD = pRight;
    if (n.dot(centroid) < 0) {
      n.negate();
      vB = pRight;
      vD = pLeft;
    }

    // Align vAxis from tip toward apex so numeral sits naturally upright in the kite
    const prefUp = new THREE.Vector3().subVectors(vA, vC).normalize();
    const { uAxis, vAxis, normal } = buildFaceBasis(n, prefUp);

    let maxExtent = 0.001;
    for (const pt of [vA, vB, vC, vD]) {
      const rel = pt.clone().sub(centroid);
      const dist = Math.hypot(rel.dot(uAxis), rel.dot(vAxis));
      if (dist > maxExtent) maxExtent = dist;
    }
    const uvScale = 0.43 / maxExtent;

    const start = cursor;
    const tris = [vA, vB, vC, vA, vC, vD];
    for (const pt of tris) {
      positions.push(pt.x, pt.y, pt.z);
      normals.push(normal.x, normal.y, normal.z);
      const rel = pt.clone().sub(centroid);
      uvs.push(0.5 + rel.dot(uAxis) * uvScale, 0.5 + rel.dot(vAxis) * uvScale);
      cursor++;
    }
    geom.addGroup(start, cursor - start, f);

    const value = customLabels ? customLabels[f].value : f + 1;
    const label = customLabels ? customLabels[f].label : String(f + 1);
    faces.push({ index: f, value, label, normal, uAxis, vAxis });
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return { geometry: geom, faces };
}

/**
 * D5 Triangular Prism with numbered end caps:
 * Faces 0..2: 3 rectangular side faces (values 1, 2, 3)
 * Face 3: top triangular cap (+Y, value 4)
 * Face 4: bottom triangular cap (-Y, value 5)
 */
function buildD5Geometry() {
  const radius = 0.95;
  const halfH = 0.8;
  const ring = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    ring.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const faces = [];
  const geom = new THREE.BufferGeometry();
  let cursor = 0;

  for (let i = 0; i < 3; i++) {
    const [x0, z0] = ring[i];
    const [x1, z1] = ring[(i + 1) % 3];
    const p00 = new THREE.Vector3(x0, -halfH, z0);
    const p10 = new THREE.Vector3(x1, -halfH, z1);
    const p11 = new THREE.Vector3(x1, halfH, z1);
    const p01 = new THREE.Vector3(x0, halfH, z0);

    const edge = new THREE.Vector3().subVectors(p10, p00);
    const up = new THREE.Vector3(0, 1, 0);
    const mid = new THREE.Vector3().addVectors(p00, p10).multiplyScalar(0.5);
    let n = new THREE.Vector3().crossVectors(edge, up).normalize();
    let v00 = p00, v10 = p10, v11 = p11, v01 = p01;
    if (n.dot(mid) < 0) {
      n.negate();
      v00 = p10; v10 = p00; v11 = p01; v01 = p11;
    }
    const uAxis = new THREE.Vector3().subVectors(v10, v00).normalize();
    const vAxis = new THREE.Vector3(0, 1, 0);

    const start = cursor;
    const tris = [
      [v00, 0, 0], [v10, 1, 0], [v11, 1, 1],
      [v00, 0, 0], [v11, 1, 1], [v01, 0, 1]
    ];
    for (const [pt, u, v] of tris) {
      positions.push(pt.x, pt.y, pt.z);
      normals.push(n.x, n.y, n.z);
      uvs.push(u, v);
      cursor++;
    }
    geom.addGroup(start, cursor - start, i);
    faces.push({ index: i, value: i + 1, normal: n, uAxis, vAxis });
  }

  // Top triangular cap (value 4)
  const topStart = cursor;
  const topTris = [
    [new THREE.Vector3(ring[0][0], halfH, ring[0][1]), 0.5 + ring[0][0] / (2 * radius), 0.5 - ring[0][1] / (2 * radius)],
    [new THREE.Vector3(ring[2][0], halfH, ring[2][1]), 0.5 + ring[2][0] / (2 * radius), 0.5 - ring[2][1] / (2 * radius)],
    [new THREE.Vector3(ring[1][0], halfH, ring[1][1]), 0.5 + ring[1][0] / (2 * radius), 0.5 - ring[1][1] / (2 * radius)]
  ];
  for (const [pt, u, v] of topTris) {
    positions.push(pt.x, pt.y, pt.z);
    normals.push(0, 1, 0);
    uvs.push(u, v);
    cursor++;
  }
  geom.addGroup(topStart, cursor - topStart, 3);
  faces.push({ index: 3, value: 4, normal: new THREE.Vector3(0, 1, 0), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 0, -1) });

  // Bottom triangular cap (value 5)
  const botStart = cursor;
  const botTris = [
    [new THREE.Vector3(ring[0][0], -halfH, ring[0][1]), 0.5 + ring[0][0] / (2 * radius), 0.5 + ring[0][1] / (2 * radius)],
    [new THREE.Vector3(ring[1][0], -halfH, ring[1][1]), 0.5 + ring[1][0] / (2 * radius), 0.5 + ring[1][1] / (2 * radius)],
    [new THREE.Vector3(ring[2][0], -halfH, ring[2][1]), 0.5 + ring[2][0] / (2 * radius), 0.5 + ring[2][1] / (2 * radius)]
  ];
  for (const [pt, u, v] of botTris) {
    positions.push(pt.x, pt.y, pt.z);
    normals.push(0, -1, 0);
    uvs.push(u, v);
    cursor++;
  }
  geom.addGroup(botStart, cursor - botStart, 4);
  faces.push({ index: 4, value: 5, normal: new THREE.Vector3(0, -1, 0), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 0, 1) });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return { geometry: geom, faces };
}

/**
 * D7 Pentagonal Prism with numbered end caps:
 * Faces 0..4: 5 rectangular side faces (values 1..5)
 * Face 5: top pentagonal cap (+Y, value 6)
 * Face 6: bottom pentagonal cap (-Y, value 7)
 */
function buildD7Geometry() {
  const radius = 0.98;
  const halfH = 0.75;
  const ring = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ring.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const faces = [];
  const geom = new THREE.BufferGeometry();
  let cursor = 0;

  for (let i = 0; i < 5; i++) {
    const [x0, z0] = ring[i];
    const [x1, z1] = ring[(i + 1) % 5];
    const p00 = new THREE.Vector3(x0, -halfH, z0);
    const p10 = new THREE.Vector3(x1, -halfH, z1);
    const p11 = new THREE.Vector3(x1, halfH, z1);
    const p01 = new THREE.Vector3(x0, halfH, z0);

    const edge = new THREE.Vector3().subVectors(p10, p00);
    const up = new THREE.Vector3(0, 1, 0);
    const mid = new THREE.Vector3().addVectors(p00, p10).multiplyScalar(0.5);
    let n = new THREE.Vector3().crossVectors(edge, up).normalize();
    let v00 = p00, v10 = p10, v11 = p11, v01 = p01;
    if (n.dot(mid) < 0) {
      n.negate();
      v00 = p10; v10 = p00; v11 = p01; v01 = p11;
    }
    const uAxis = new THREE.Vector3().subVectors(v10, v00).normalize();
    const vAxis = new THREE.Vector3(0, 1, 0);

    const start = cursor;
    const tris = [
      [v00, 0, 0], [v10, 1, 0], [v11, 1, 1],
      [v00, 0, 0], [v11, 1, 1], [v01, 0, 1]
    ];
    for (const [pt, u, v] of tris) {
      positions.push(pt.x, pt.y, pt.z);
      normals.push(n.x, n.y, n.z);
      uvs.push(u, v);
      cursor++;
    }
    geom.addGroup(start, cursor - start, i);
    faces.push({ index: i, value: i + 1, normal: n, uAxis, vAxis });
  }

  // Top cap (value 6)
  const topStart = cursor;
  for (let i = 0; i < 5; i++) {
    const iNext = (i + 1) % 5;
    const pCenter = new THREE.Vector3(0, halfH, 0);
    const pA = new THREE.Vector3(ring[iNext][0], halfH, ring[iNext][1]);
    const pB = new THREE.Vector3(ring[i][0], halfH, ring[i][1]);
    for (const pt of [pCenter, pA, pB]) {
      positions.push(pt.x, pt.y, pt.z);
      normals.push(0, 1, 0);
      uvs.push(0.5 + pt.x / (2.2 * radius), 0.5 - pt.z / (2.2 * radius));
      cursor++;
    }
  }
  geom.addGroup(topStart, cursor - topStart, 5);
  faces.push({ index: 5, value: 6, normal: new THREE.Vector3(0, 1, 0), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 0, -1) });

  // Bottom cap (value 7)
  const botStart = cursor;
  for (let i = 0; i < 5; i++) {
    const iNext = (i + 1) % 5;
    const pCenter = new THREE.Vector3(0, -halfH, 0);
    const pA = new THREE.Vector3(ring[i][0], -halfH, ring[i][1]);
    const pB = new THREE.Vector3(ring[iNext][0], -halfH, ring[iNext][1]);
    for (const pt of [pCenter, pA, pB]) {
      positions.push(pt.x, pt.y, pt.z);
      normals.push(0, -1, 0);
      uvs.push(0.5 + pt.x / (2.2 * radius), 0.5 + pt.z / (2.2 * radius));
      cursor++;
    }
  }
  geom.addGroup(botStart, cursor - botStart, 6);
  faces.push({ index: 6, value: 7, normal: new THREE.Vector3(0, -1, 0), uAxis: new THREE.Vector3(1, 0, 0), vAxis: new THREE.Vector3(0, 0, 1) });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return { geometry: geom, faces };
}

/**
 * Procedural Bipyramid builder for D14 (N=7), D16 (N=8) and D30 (N=15):
 * Produces 2*N triangular faces with outward normals and UVs centered on each facet.
 */
function buildBipyramidGeometry(N, radius = 1.05, height = 1.25) {
  const topApex = new THREE.Vector3(0, height, 0);
  const botApex = new THREE.Vector3(0, -height, 0);
  const ring = [];
  for (let i = 0; i < N; i++) {
    const angle = (i * Math.PI * 2) / N;
    ring.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const faces = [];
  const geom = new THREE.BufferGeometry();
  let cursor = 0;

  for (let i = 0; i < N; i++) {
    const v0 = topApex;
    const v1 = ring[(i + 1) % N];
    const v2 = ring[i];
    const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    const e1 = new THREE.Vector3().subVectors(v1, v0);
    const e2 = new THREE.Vector3().subVectors(v2, v0);
    const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
    const prefUp = new THREE.Vector3().subVectors(v0, centroid).normalize();
    const { uAxis, vAxis, normal } = buildFaceBasis(n, prefUp);

    const start = cursor;
    for (const pt of [v0, v1, v2]) {
      positions.push(pt.x, pt.y, pt.z);
      normals.push(normal.x, normal.y, normal.z);
      const rel = pt.clone().sub(centroid);
      uvs.push(0.5 + rel.dot(uAxis) * 0.45 / radius, 0.5 + rel.dot(vAxis) * 0.45 / radius);
      cursor++;
    }
    geom.addGroup(start, cursor - start, i);
    faces.push({ index: i, value: i + 1, normal, uAxis, vAxis });
  }

  for (let i = 0; i < N; i++) {
    const v0 = botApex;
    const v1 = ring[i];
    const v2 = ring[(i + 1) % N];
    const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).multiplyScalar(1 / 3);
    const e1 = new THREE.Vector3().subVectors(v1, v0);
    const e2 = new THREE.Vector3().subVectors(v2, v0);
    const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
    const prefUp = new THREE.Vector3().subVectors(centroid, v0).normalize();
    const { uAxis, vAxis, normal } = buildFaceBasis(n, prefUp);

    const faceIdx = N + i;
    const start = cursor;
    for (const pt of [v0, v1, v2]) {
      positions.push(pt.x, pt.y, pt.z);
      normals.push(normal.x, normal.y, normal.z);
      const rel = pt.clone().sub(centroid);
      uvs.push(0.5 + rel.dot(uAxis) * 0.45 / radius, 0.5 + rel.dot(vAxis) * 0.45 / radius);
      cursor++;
    }
    geom.addGroup(start, cursor - start, faceIdx);
    faces.push({ index: faceIdx, value: faceIdx + 1, normal, uAxis, vAxis });
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return { geometry: geom, faces };
}

/**
 * D24 Tetrakis Hexahedron (cube with 6 four-sided pyramids = 24 triangular faces).
 */
function buildD24Geometry() {
  const L = 0.72;
  const H = 1.15;
  const C = [
    new THREE.Vector3(-L, -L, -L),
    new THREE.Vector3(L, -L, -L),
    new THREE.Vector3(L, L, -L),
    new THREE.Vector3(-L, L, -L),
    new THREE.Vector3(-L, -L, L),
    new THREE.Vector3(L, -L, L),
    new THREE.Vector3(L, L, L),
    new THREE.Vector3(-L, L, L)
  ];
  const apexes = [
    new THREE.Vector3(H, 0, 0),
    new THREE.Vector3(-H, 0, 0),
    new THREE.Vector3(0, H, 0),
    new THREE.Vector3(0, -H, 0),
    new THREE.Vector3(0, 0, H),
    new THREE.Vector3(0, 0, -H)
  ];

  const faceQuads = [
    [apexes[0], [C[1], C[2], C[6], C[5]]],
    [apexes[1], [C[4], C[0], C[3], C[7]]],
    [apexes[2], [C[3], C[2], C[6], C[7]]],
    [apexes[3], [C[1], C[0], C[4], C[5]]],
    [apexes[4], [C[5], C[6], C[7], C[4]]],
    [apexes[5], [C[0], C[3], C[2], C[1]]]
  ];

  const positions = [];
  const normals = [];
  const uvs = [];
  const faces = [];
  const geom = new THREE.BufferGeometry();
  let cursor = 0;
  let faceIdx = 0;

  for (const [apex, quad] of faceQuads) {
    for (let k = 0; k < 4; k++) {
      const v0 = apex;
      const v1 = quad[(k + 1) % 4];
      const v2 = quad[k];
      const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).multiplyScalar(1 / 3);
      const e1 = new THREE.Vector3().subVectors(v1, v0);
      const e2 = new THREE.Vector3().subVectors(v2, v0);
      const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
      const prefUp = new THREE.Vector3().subVectors(v0, centroid).normalize();
      const { uAxis, vAxis, normal } = buildFaceBasis(n, prefUp);

      const start = cursor;
      for (const pt of [v0, v1, v2]) {
        positions.push(pt.x, pt.y, pt.z);
        normals.push(normal.x, normal.y, normal.z);
        const rel = pt.clone().sub(centroid);
        uvs.push(0.5 + rel.dot(uAxis) * 0.55 / H, 0.5 + rel.dot(vAxis) * 0.55 / H);
        cursor++;
      }
      geom.addGroup(start, cursor - start, faceIdx);
      faces.push({ index: faceIdx, value: faceIdx + 1, normal, uAxis, vAxis });
      faceIdx++;
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return { geometry: geom, faces };
}

/**
 * Builds a complete polyhedral die mesh + face lookup table.
 * Returns { mesh, faces, textures, materials, geometry }.
 */
function createDieMesh(dieKind, paletteKey = null, materialId = null) {
  const palette = DICE_PALETTE[paletteKey || dieKind] || DICE_PALETTE.d20;
  const matSpec = (materialId && DICE_MATERIALS[materialId]) ? DICE_MATERIALS[materialId] : null;
  let built;
  let shapeHint = 'poly';

  switch (dieKind) {
    case 'd2':
      built = buildD2Geometry();
      shapeHint = 'circle';
      break;
    case 'd3':
      built = buildD3Geometry();
      shapeHint = 'square';
      break;
    case 'd4':
      built = preparePolyhedronFromNonIndexed(new THREE.TetrahedronGeometry(1.18, 0), 4, 0.9);
      break;
    case 'd5':
      built = buildD5Geometry();
      shapeHint = 'square';
      break;
    case 'd6':
      built = buildD6Geometry();
      shapeHint = 'square';
      break;
    case 'd7':
      built = buildD7Geometry();
      shapeHint = 'square';
      break;
    case 'd8':
      built = preparePolyhedronFromNonIndexed(new THREE.OctahedronGeometry(1.15, 0), 8, 0.92);
      break;
    case 'd10':
      built = buildD10Geometry();
      break;
    case 'd10Tens':
      built = buildD10Geometry(
        ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90'].map((lbl, idx) => ({
          value: idx * 10,
          label: lbl,
        }))
      );
      break;
    case 'd10Units':
      built = buildD10Geometry(
        ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((lbl, idx) => ({
          value: idx,
          label: lbl,
        }))
      );
      break;
    case 'd12':
      built = preparePolyhedronFromNonIndexed(new THREE.DodecahedronGeometry(1.1, 0), 12, 1.0);
      break;
    case 'd14':
      built = buildBipyramidGeometry(7, 1.05, 1.25);
      break;
    case 'd16':
      built = buildBipyramidGeometry(8, 1.08, 1.25);
      break;
    case 'd20':
      built = preparePolyhedronFromNonIndexed(new THREE.IcosahedronGeometry(1.16, 0), 20, 0.92);
      break;
    case 'd24':
      built = buildD24Geometry();
      break;
    case 'd30':
      built = buildBipyramidGeometry(15, 1.15, 1.2);
      break;
    case 'd100':
    default:
      built = preparePolyhedronFromNonIndexed(new THREE.IcosahedronGeometry(1.16, 0), 20, 0.92);
      break;
  }

  const textures = [];
  const materials = [];

  for (let i = 0; i < built.faces.length; i++) {
    const face = built.faces[i];
    const label = face.label !== undefined ? face.label : String(face.value);
    const tex = createFaceCanvasTexture(label, palette, shapeHint);
    textures.push(tex);
    materials.push(
      new THREE.MeshStandardMaterial({
        map: tex,
        metalness: matSpec ? matSpec.metalness : palette.metalness,
        roughness: matSpec ? matSpec.roughness : palette.roughness,
        emissive: matSpec && matSpec.emissive ? new THREE.Color(matSpec.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: matSpec ? (matSpec.emissiveIntensity || 0) : 0,
      })
    );
  }

  if (built.extraRimMaterial) {
    materials.push(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.border),
        metalness: 0.65,
        roughness: 0.25,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
      })
    );
  }

  const mesh = new THREE.Mesh(built.geometry, materials);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  // Map value -> face metadata for exact target quaternion lookup
  const faceByValue = new Map();
  for (const f of built.faces) {
    faceByValue.set(f.value, f);
  }

  return {
    mesh,
    geometry: built.geometry,
    materials,
    textures,
    faces: built.faces,
    faceByValue,
  };
}

/**
 * Computes the world quaternion that rotates the chosen face so its normal
 * points directly at the camera (tNormal) and its numeral is upright (tUp).
 */
function computeTargetQuaternion(face, diePosition, cameraPosition) {
  const tNormal = new THREE.Vector3().subVectors(cameraPosition, diePosition).normalize();
  let worldUp = new THREE.Vector3(0, 1, 0);
  if (Math.abs(tNormal.dot(worldUp)) > 0.96) {
    worldUp = new THREE.Vector3(0, 0, -1);
  }
  const tRight = new THREE.Vector3().crossVectors(worldUp, tNormal).normalize();
  const tUp = new THREE.Vector3().crossVectors(tNormal, tRight).normalize();

  // M_target has columns [tRight, tUp, tNormal]
  const mTarget = new THREE.Matrix4().makeBasis(tRight, tUp, tNormal);
  // M_local has columns [uAxis, vAxis, normal]; its transpose is its inverse
  const mLocalInv = new THREE.Matrix4().makeBasis(face.uAxis, face.vAxis, face.normal).transpose();

  const rotMat = new THREE.Matrix4().multiplyMatrices(mTarget, mLocalInv);
  return new THREE.Quaternion().setFromRotationMatrix(rotMat);
}

/* ============================================================================
 * 2D Fallback Styles & Helpers
 * ========================================================================== */

const STYLE_ELEMENT_ID = 'dice-roller-3d-styles';

function ensureStylesInjected() {
  if (!hasDOM()) return;
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = `
    @keyframes dr3d-tumble {
      0% { transform: translateY(-48px) rotate(-180deg) scale(0.72); opacity: 0.2; }
      35% { transform: translateY(10px) rotate(95deg) scale(1.06); opacity: 1; }
      58% { transform: translateY(-14px) rotate(240deg) scale(0.96); }
      78% { transform: translateY(4px) rotate(330deg) scale(1.03); }
      100% { transform: translateY(0) rotate(360deg) scale(1); opacity: 1; }
    }
    @keyframes dr3d-crit-pulse {
      0%, 100% { box-shadow: 0 0 16px rgba(251, 191, 36, 0.55), inset 0 0 12px rgba(251, 191, 36, 0.35); }
      50% { box-shadow: 0 0 34px rgba(251, 191, 36, 0.95), inset 0 0 22px rgba(251, 191, 36, 0.6); }
    }
    @keyframes dr3d-fumble-pulse {
      0%, 100% { box-shadow: 0 0 16px rgba(244, 63, 94, 0.55), inset 0 0 12px rgba(244, 63, 94, 0.35); }
      50% { box-shadow: 0 0 34px rgba(244, 63, 94, 0.95), inset 0 0 22px rgba(244, 63, 94, 0.6); }
    }
    @keyframes dr3d-hud-in {
      0% { opacity: 0; transform: translateY(10px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .dr3d-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      z-index: 40;
    }
    .dr3d-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: block;
    }
    .dr3d-2d-stage {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      align-items: center;
      justify-content: center;
      max-width: 90%;
      padding: 12px;
      z-index: 2;
    }
    .dr3d-2d-die {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(129, 140, 248, 0.75);
      background: radial-gradient(circle at 35% 30%, #27272a, #09090b);
      color: #fafafa;
      font-weight: 800;
      font-size: 28px;
      line-height: 1;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
      animation: dr3d-tumble 680ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      user-select: none;
    }
    .dr3d-2d-die.is-coin { border-radius: 9999px; }
    .dr3d-2d-die.is-crit {
      border-color: #fbbf24;
      color: #fef3c7;
      animation: dr3d-crit-pulse 750ms ease-in-out infinite;
    }
    .dr3d-2d-die.is-fumble {
      border-color: #f43f5e;
      color: #ffe4e6;
      animation: dr3d-fumble-pulse 750ms ease-in-out infinite;
    }
    .dr3d-2d-die-sub {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.72;
      margin-top: 3px;
    }
    .dr3d-hud {
      position: relative;
      margin-top: auto;
      margin-bottom: 24px;
      padding: 10px 18px;
      border-radius: 14px;
      background: rgba(9, 9, 11, 0.84);
      border: 1px solid rgba(63, 63, 70, 0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #f4f4f5;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
      animation: dr3d-hud-in 220ms ease-out forwards;
      z-index: 3;
    }
    .dr3d-hud.is-crit {
      border-color: rgba(251, 191, 36, 0.85);
      box-shadow: 0 0 28px rgba(251, 191, 36, 0.35), 0 16px 40px rgba(0, 0, 0, 0.6);
    }
    .dr3d-hud.is-fumble {
      border-color: rgba(244, 63, 94, 0.85);
      box-shadow: 0 0 28px rgba(244, 63, 94, 0.35), 0 16px 40px rgba(0, 0, 0, 0.6);
    }
    .dr3d-badge {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 9999px;
    }
    .dr3d-badge.crit { background: rgba(251, 191, 36, 0.2); color: #fde68a; border: 1px solid rgba(251, 191, 36, 0.6); }
    .dr3d-badge.fumble { background: rgba(244, 63, 94, 0.2); color: #fecdd3; border: 1px solid rgba(244, 63, 94, 0.6); }
    .dr3d-badge.success { background: rgba(16, 185, 129, 0.2); color: #a7f3d0; border: 1px solid rgba(16, 185, 129, 0.55); }
    .dr3d-badge.fail { background: rgba(244, 63, 94, 0.16); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.5); }
    .dr3d-total {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
    }
    .dr3d-meta {
      font-size: 12px;
      color: #a1a1aa;
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================================
 * DiceRoller3D Class
 * ========================================================================== */

export class DiceRoller3D {
  /**
   * @param {HTMLElement | null} overlayRoot
   * @param {{ lowSpec?: boolean, tumbleMs?: number, settleMs?: number, holdMs?: number, rng?: () => number }} [opts]
   */
  constructor(overlayRoot, opts = {}) {
    this.overlayRoot = overlayRoot || null;
    this.opts = {
      lowSpec: Boolean(opts.lowSpec),
      tumbleMs: Number.isFinite(opts.tumbleMs) ? opts.tumbleMs : 820,
      settleMs: Number.isFinite(opts.settleMs) ? opts.settleMs : 360,
      holdMs: Number.isFinite(opts.holdMs) ? opts.holdMs : 680,
      rng: typeof opts.rng === 'function' ? opts.rng : Math.random,
    };

    this._disposed = false;
    this._container = null;
    this._hudEl = null;
    this._stage2DEl = null;

    // Three.js state (lazy-initialized on first 3D roll)
    this._webglAvailable = null;
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._accentLight = null;
    this._activeDice = [];

    // Active animation handles
    this._rafId = null;
    this._timers = new Set();
    this._cancelCurrent = null;
    this._boundResize = null;

    if (hasDOM() && this.overlayRoot) {
      ensureStylesInjected();
      this._container = document.createElement('div');
      this._container.className = 'dr3d-overlay';
      this.overlayRoot.appendChild(this._container);
    }
  }

  _scheduleTimeout(fn, ms) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      fn();
    }, ms);
    this._timers.add(id);
    return id;
  }

  _clearTimers() {
    for (const id of this._timers) {
      clearTimeout(id);
    }
    this._timers.clear();
  }

  _stopAnimation() {
    if (this._rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._clearTimers();
    if (this._cancelCurrent) {
      const cancel = this._cancelCurrent;
      this._cancelCurrent = null;
      cancel();
    }
  }

  _initWebGL() {
    if (this._webglAvailable === false) return false;
    if (this._renderer) return true;
    if (!hasDOM() || !this._container) {
      this._webglAvailable = false;
      return false;
    }

    try {
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = 'dr3d-canvas';

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 60);
      camera.position.set(0, 6.2, 6.6);
      camera.lookAt(0, 0.1, 0);

      // Balanced studio lighting for dark obsidian polyhedra
      const hemi = new THREE.HemisphereLight(0xf8fafc, 0x1e1b4b, 0.95);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
      keyLight.position.set(4.5, 9.0, 6.5);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x818cf8, 0.75);
      rimLight.position.set(-6.0, 4.5, -5.0);
      scene.add(rimLight);

      const accentLight = new THREE.PointLight(0xfbbf24, 0, 14);
      accentLight.position.set(0, 3.2, 2.0);
      scene.add(accentLight);

      this._container.appendChild(renderer.domElement);
      this._renderer = renderer;
      this._scene = scene;
      this._camera = camera;
      this._accentLight = accentLight;
      this._webglAvailable = true;

      this._resizeRenderer();
      this._boundResize = () => this._resizeRenderer();
      window.addEventListener('resize', this._boundResize);

      return true;
    } catch {
      this._webglAvailable = false;
      this._disposeThreeObjects();
      return false;
    }
  }

  _resizeRenderer() {
    if (!this._renderer || !this._camera || !this._container) return;
    const width = Math.max(1, this._container.clientWidth || window.innerWidth || 640);
    const height = Math.max(1, this._container.clientHeight || window.innerHeight || 360);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this._renderer.setSize(width, height, false);
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
  }

  _clearActiveDice() {
    for (const entry of this._activeDice) {
      if (this._scene && entry.mesh) {
        this._scene.remove(entry.mesh);
      }
      if (entry.geometry) entry.geometry.dispose();
      if (entry.materials) {
        for (const mat of entry.materials) mat.dispose();
      }
      if (entry.textures) {
        for (const tex of entry.textures) tex.dispose();
      }
    }
    this._activeDice = [];
  }

  _clearDOMOverlays() {
    if (this._hudEl && this._hudEl.parentNode) {
      this._hudEl.parentNode.removeChild(this._hudEl);
    }
    this._hudEl = null;
    if (this._stage2DEl && this._stage2DEl.parentNode) {
      this._stage2DEl.parentNode.removeChild(this._stage2DEl);
    }
    this._stage2DEl = null;
  }

  _renderHud(result, { statBonus, dc, label }) {
    if (!hasDOM() || !this._container) return;
    if (this._hudEl && this._hudEl.parentNode) {
      this._hudEl.parentNode.removeChild(this._hudEl);
    }

    const hud = document.createElement('div');
    hud.className = 'dr3d-hud';
    if (result.isCrit) hud.classList.add('is-crit');
    if (result.isFumble) hud.classList.add('is-fumble');

    if (result.isCrit) {
      const b = document.createElement('span');
      b.className = 'dr3d-badge crit';
      b.textContent = 'CRIT · NAT 20';
      hud.appendChild(b);
    } else if (result.isFumble) {
      const b = document.createElement('span');
      b.className = 'dr3d-badge fumble';
      b.textContent = 'FUMBLE · NAT 1';
      hud.appendChild(b);
    }

    const totalEl = document.createElement('span');
    totalEl.className = 'dr3d-total';
    totalEl.textContent = String(result.finalTotal);
    hud.appendChild(totalEl);

    const metaParts = [];
    if (label) metaParts.push(String(label));
    const rollStr = result.count > 1 ? `[${result.rolls.join('+')}]` : String(result.total);
    const bonusStr = statBonus !== 0 ? (statBonus > 0 ? ` + ${statBonus}` : ` - ${Math.abs(statBonus)}`) : '';
    metaParts.push(`${result.count}${result.diceType.toUpperCase()}: ${rollStr}${bonusStr}`);
    if (dc !== null) metaParts.push(`DC ${dc}`);

    const metaEl = document.createElement('span');
    metaEl.className = 'dr3d-meta';
    metaEl.textContent = metaParts.join(' · ');
    hud.appendChild(metaEl);

    if (result.success !== null) {
      const statusBadge = document.createElement('span');
      statusBadge.className = `dr3d-badge ${result.success ? 'success' : 'fail'}`;
      statusBadge.textContent = result.success ? 'SUCCESS' : 'FAIL';
      hud.appendChild(statusBadge);
    }

    this._container.appendChild(hud);
    this._hudEl = hud;
  }

  /**
   * Rolls one or more dice with 3D polyhedral physics/settle or 2D fallback.
   *
   * @param {{
   *   diceType?: string,
   *   count?: number,
   *   targetResult?: number | number[],
   *   dc?: number,
   *   statBonus?: number,
   *   label?: string,
   *   lowSpec?: boolean
   * }} [params]
   * @returns {Promise<{
   *   diceType: string,
   *   count: number,
   *   rolls: number[],
   *   total: number,
   *   finalTotal: number,
   *   success: boolean | null,
   *   isCrit: boolean,
   *   isFumble: boolean,
   *   mode: '3d' | '2d'
   * }>}
   */
  async roll({
    diceType = 'd20',
    count = 1,
    targetResult,
    dc,
    statBonus = 0,
    label = '',
    lowSpec,
  } = {}) {
    if (this._disposed) {
      throw new Error('DiceRoller3D has been disposed');
    }

    // Interrupt any in-flight roll cleanly
    this._stopAnimation();
    this._clearActiveDice();
    this._clearDOMOverlays();

    const normalizedType = normalizeDiceType(diceType);
    const safeCount = clampCount(count);
    const bonus = Number.isFinite(Number(statBonus)) ? Number(statBonus) : 0;
    const hasDc = dc !== undefined && dc !== null && Number.isFinite(Number(dc));
    const numericDc = hasDc ? Number(dc) : null;

    // Determine rolls (authoritative targetResult overrides rng)
    const authRolls = resolveAuthoritativeRolls(normalizedType, safeCount, targetResult, this.opts.rng);
    let mathResult;
    if (authRolls) {
      const total = authRolls.reduce((acc, v) => acc + v, 0);
      mathResult = {
        diceType: normalizedType,
        count: safeCount,
        rolls: authRolls,
        total,
        isCrit: normalizedType === 'd20' && safeCount === 1 && authRolls[0] === 20,
        isFumble: normalizedType === 'd20' && safeCount === 1 && authRolls[0] === 1,
      };
    } else {
      mathResult = rollMathDice(normalizedType, safeCount, this.opts.rng);
    }

    const finalTotal = mathResult.total + bonus;
    const success = hasDc ? finalTotal >= numericDc : null;

    const useLowSpec = lowSpec !== undefined ? Boolean(lowSpec) : this.opts.lowSpec;
    const canUse3D = !useLowSpec && this._initWebGL();

    const result = {
      diceType: mathResult.diceType,
      count: mathResult.count,
      rolls: mathResult.rolls,
      total: mathResult.total,
      finalTotal,
      success,
      isCrit: mathResult.isCrit,
      isFumble: mathResult.isFumble,
      mode: canUse3D ? '3d' : '2d',
    };

    if (canUse3D) {
      await this._animate3D(result, { statBonus: bonus, dc: numericDc, label });
    } else {
      await this._animate2D(result, { statBonus: bonus, dc: numericDc, label });
    }

    return result;
  }

  _animate3D(result, hudMeta) {
    this._resizeRenderer();

    // Build die specs (d100 expands each roll into twin tens + units d10s)
    const dieSpecs = [];
    if (result.diceType === 'd100') {
      for (const rollVal of result.rolls) {
        const tensVal = rollVal === 100 ? 0 : Math.floor(rollVal / 10) * 10;
        const unitsVal = rollVal === 100 ? 0 : rollVal % 10;
        dieSpecs.push({ kind: 'd10Tens', paletteKey: 'd10Tens', targetValue: tensVal });
        dieSpecs.push({ kind: 'd10Units', paletteKey: 'd10Units', targetValue: unitsVal });
      }
    } else {
      for (const rollVal of result.rolls) {
        dieSpecs.push({ kind: result.diceType, paletteKey: result.diceType, targetValue: rollVal });
      }
    }

    const totalMeshes = dieSpecs.length;
    const cols = Math.min(totalMeshes, result.diceType === 'd100' ? 4 : 5);
    const rows = Math.ceil(totalMeshes / cols);
    const spacingX = 2.65;
    const spacingZ = 2.65;

    // Adjust camera framing for multi-die layouts
    const camScale = Math.max(1, 0.72 + Math.max(cols * 0.22, rows * 0.42));
    this._camera.position.set(0, 5.4 * camScale, 5.8 * camScale);
    this._camera.lookAt(0, 0, 0);

    const rng = this.opts.rng;
    const actors = [];

    for (let i = 0; i < totalMeshes; i++) {
      const spec = dieSpecs[i];
      const created = createDieMesh(spec.kind, spec.paletteKey);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowItems = row === rows - 1 ? totalMeshes - row * cols : cols;

      const targetX = (col - (rowItems - 1) / 2) * spacingX;
      const targetZ = (row - (rows - 1) / 2) * spacingZ;
      const targetPos = new THREE.Vector3(targetX, 0, targetZ);

      const face = created.faceByValue.get(spec.targetValue) || created.faces[0];
      const targetQuat = computeTargetQuaternion(face, targetPos, this._camera.position);

      // Initial launch state for bouncy fake physics tumble
      const startPos = new THREE.Vector3(
        targetX + (safeRngUnit(rng) - 0.5) * 2.8,
        3.4 + safeRngUnit(rng) * 1.4,
        targetZ + (safeRngUnit(rng) - 0.5) * 2.2
      );
      created.mesh.position.copy(startPos);
      created.mesh.rotation.set(
        safeRngUnit(rng) * Math.PI * 2,
        safeRngUnit(rng) * Math.PI * 2,
        safeRngUnit(rng) * Math.PI * 2
      );
      this._scene.add(created.mesh);

      const actor = {
        ...created,
        startPos,
        targetPos,
        targetQuat,
        settleStartQuat: new THREE.Quaternion(),
        settleCaptured: false,
        pos: startPos.clone(),
        velY: 1.6 + safeRngUnit(rng) * 1.2,
        spinAxis: new THREE.Vector3(
          safeRngUnit(rng) - 0.5,
          safeRngUnit(rng) - 0.5,
          safeRngUnit(rng) - 0.5
        ).normalize(),
        spinSpeed: 11 + safeRngUnit(rng) * 6,
      };
      actors.push(actor);
      this._activeDice.push(actor);
    }

    const tumbleMs = this.opts.tumbleMs;
    const settleMs = this.opts.settleMs;
    const holdMs = result.isCrit || result.isFumble ? Math.max(this.opts.holdMs, 900) : this.opts.holdMs;
    const totalMs = tumbleMs + settleMs + holdMs;
    const gravity = -26;
    const restitution = 0.52;

    const emissiveColor = result.isCrit
      ? new THREE.Color(0xf59e0b)
      : result.isFumble
        ? new THREE.Color(0xef4444)
        : null;

    if (this._accentLight) {
      this._accentLight.intensity = 0;
      if (emissiveColor) this._accentLight.color.copy(emissiveColor);
    }

    let hudShown = false;

    return new Promise((resolve) => {
      const startTime = performance.now();
      let prevTime = startTime;

      const finish = () => {
        if (this._rafId !== null) {
          cancelAnimationFrame(this._rafId);
          this._rafId = null;
        }
        this._cancelCurrent = null;
        // Clear canvas when idle so overlay is transparent after hold
        if (this._renderer && this._scene && this._camera) {
          this._clearActiveDice();
          this._clearDOMOverlays();
          this._renderer.clear();
        }
        resolve();
      };

      this._cancelCurrent = () => {
        resolve();
      };

      const step = (now) => {
        if (this._disposed) {
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
        prevTime = now;

        if (elapsed < tumbleMs) {
          // Phase 1: Bouncy gravity tumble + horizontal drift toward landing slot
          const t = elapsed / tumbleMs;
          const easeOut = 1 - Math.pow(1 - t, 2.2);

          for (const a of actors) {
            a.velY += gravity * dt;
            a.pos.y += a.velY * dt;
            if (a.pos.y <= 0) {
              a.pos.y = 0;
              a.velY = Math.abs(a.velY) * restitution;
              if (a.velY < 0.7) a.velY = 0;
              // Slight spin deflection on bounce
              a.spinSpeed *= 0.84;
            }
            a.pos.x = THREE.MathUtils.lerp(a.startPos.x, a.targetPos.x, easeOut);
            a.pos.z = THREE.MathUtils.lerp(a.startPos.z, a.targetPos.z, easeOut);
            a.mesh.position.copy(a.pos);

            const angleStep = a.spinSpeed * (1 - t * 0.45) * dt;
            a.mesh.rotateOnWorldAxis(a.spinAxis, angleStep);
          }
        } else if (elapsed < tumbleMs + settleMs) {
          // Phase 2: Smooth slerp onto the exact rolled face normal
          const st = Math.min(1, (elapsed - tumbleMs) / settleMs);
          const ease = 1 - Math.pow(1 - st, 3);

          for (const a of actors) {
            if (!a.settleCaptured) {
              a.settleStartQuat.copy(a.mesh.quaternion);
              a.settleCaptured = true;
            }
            a.mesh.position.lerpVectors(a.pos, a.targetPos, ease);
            a.mesh.quaternion.slerpQuaternions(a.settleStartQuat, a.targetQuat, ease);
            // Subtle celebratory settle pop
            const pop = 1 + Math.sin(st * Math.PI) * 0.08;
            a.mesh.scale.setScalar(pop);
          }
        } else {
          // Phase 3: Hold settled pose + crit/fumble emissive glow pulse + HUD
          if (!hudShown) {
            hudShown = true;
            this._renderHud(result, hudMeta);
          }
          const holdElapsed = elapsed - (tumbleMs + settleMs);
          const pulse = 0.45 + 0.55 * Math.sin((holdElapsed / 140) * Math.PI);

          for (const a of actors) {
            a.mesh.position.copy(a.targetPos);
            a.mesh.quaternion.copy(a.targetQuat);
            a.mesh.scale.setScalar(1);
            if (emissiveColor) {
              for (const mat of a.materials) {
                mat.emissive.copy(emissiveColor);
                mat.emissiveIntensity = 0.25 + pulse * 0.55;
              }
            }
          }
          if (this._accentLight && emissiveColor) {
            this._accentLight.intensity = 1.2 + pulse * 2.2;
          }
        }

        if (this._renderer && this._scene && this._camera) {
          this._renderer.render(this._scene, this._camera);
        }

        if (elapsed >= totalMs) {
          finish();
        } else {
          this._rafId = requestAnimationFrame(step);
        }
      };

      this._rafId = requestAnimationFrame(step);
    });
  }

  _animate2D(result, hudMeta) {
    // Headless / Node environment: resolve immediately
    if (!hasDOM() || !this._container) {
      return Promise.resolve();
    }

    const stage = document.createElement('div');
    stage.className = 'dr3d-2d-stage';
    const sides = DICE_SIDES[result.diceType];
    const palette = DICE_PALETTE[result.diceType] || DICE_PALETTE.d20;
    const dieEls = [];

    for (let i = 0; i < result.rolls.length; i++) {
      const el = document.createElement('div');
      el.className = 'dr3d-2d-die';
      if (result.diceType === 'd2') el.classList.add('is-coin');
      el.style.borderColor = palette.border;
      el.style.background = `radial-gradient(circle at 35% 30%, ${palette.bg2}, ${palette.bg})`;
      el.style.color = palette.text;

      const numEl = document.createElement('span');
      numEl.textContent = String(Math.floor(safeRngUnit(this.opts.rng) * sides) + 1);
      const subEl = document.createElement('span');
      subEl.className = 'dr3d-2d-die-sub';
      subEl.textContent = result.diceType.toUpperCase();

      el.appendChild(numEl);
      el.appendChild(subEl);
      stage.appendChild(el);
      dieEls.push({ el, numEl, finalValue: result.rolls[i] });
    }

    this._container.appendChild(stage);
    this._stage2DEl = stage;

    const animMs = Math.min(680, this.opts.tumbleMs);
    const holdMs = result.isCrit || result.isFumble ? Math.max(this.opts.holdMs, 850) : this.opts.holdMs;

    return new Promise((resolve) => {
      let ticks = 0;
      const maxTicks = Math.max(4, Math.floor(animMs / 75));

      this._cancelCurrent = () => {
        resolve();
      };

      const tick = () => {
        if (this._disposed) {
          resolve();
          return;
        }
        ticks++;
        if (ticks < maxTicks) {
          for (const d of dieEls) {
            d.numEl.textContent = String(Math.floor(safeRngUnit(this.opts.rng) * sides) + 1);
          }
          this._scheduleTimeout(tick, 75);
        } else {
          // Settle onto final values
          for (const d of dieEls) {
            d.numEl.textContent = String(d.finalValue);
            if (result.isCrit) d.el.classList.add('is-crit');
            if (result.isFumble) d.el.classList.add('is-fumble');
          }
          this._renderHud(result, hudMeta);

          this._scheduleTimeout(() => {
            this._cancelCurrent = null;
            this._clearDOMOverlays();
            resolve();
          }, holdMs);
        }
      };

      this._scheduleTimeout(tick, 75);
    });
  }

  _disposeThreeObjects() {
    this._clearActiveDice();

    if (this._boundResize && hasDOM()) {
      window.removeEventListener('resize', this._boundResize);
      this._boundResize = null;
    }

    if (this._renderer) {
      const domEl = this._renderer.domElement;
      if (domEl && domEl.parentNode) {
        domEl.parentNode.removeChild(domEl);
      }
      this._renderer.dispose();
      this._renderer = null;
    }

    this._scene = null;
    this._camera = null;
    this._accentLight = null;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._stopAnimation();
    this._disposeThreeObjects();
    this._clearDOMOverlays();

    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._container = null;
  }
}

export default DiceRoller3D;
