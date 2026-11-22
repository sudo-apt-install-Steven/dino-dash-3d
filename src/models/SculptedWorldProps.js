// Biblioteca proprietária de modelos 3D esculpidos em Voxel-Craft (SculptedWorldProps.js).
// Usa exclusivamente uma BoxGeometry(1,1,1) compartilhada e cache de MeshStandardMaterial
// (todos marcados com userData.shared = true) para silhuetas ricas e 60 FPS estáveis mesmo em mobile.
import * as THREE from 'three';

const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);
SHARED_BOX.userData = { shared: true };

const MAT_CACHE = new Map();

function getMat(color, opts = {}) {
  const emissive = opts.emissive || '#000000';
  const emissiveIntensity = opts.emissiveIntensity ?? 0;
  const roughness = opts.roughness ?? 0.72;
  const metalness = opts.metalness ?? 0.08;
  const opacity = opts.opacity ?? 1;
  const key = `${color}|${emissive}|${emissiveIntensity}|${roughness}|${metalness}|${opacity}`;
  const cached = MAT_CACHE.get(key);
  if (cached) return cached;
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity < 0.75 ? false : true
  });
  mat.userData = { shared: true };
  MAT_CACHE.set(key, mat);
  return mat;
}

function vox(parent, w, h, d, x, y, z, mat, rot = null) {
  const m = new THREE.Mesh(SHARED_BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (rot) {
    if (rot.x) m.rotation.x = rot.x;
    if (rot.y) m.rotation.y = rot.y;
    if (rot.z) m.rotation.z = rot.z;
  }
  parent.add(m);
  return m;
}

function seededUnit(seed, salt = 0) {
  let h = (typeof seed === 'number' ? seed : 2166136261) >>> 0;
  if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  h = Math.imul((h ^ (salt * 374761393)) >>> 0, 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % 10000) / 10000;
}

// ---------------------------------------------------------------------------
// 1. Árvores Esculpidas por Bioma
// ---------------------------------------------------------------------------

export function buildSculptedBiomeTree(biomeId = 'emerald_valley', seed = 1) {
  const g = new THREE.Group();
  const r1 = seededUnit(seed, 1);
  const r2 = seededUnit(seed, 2);
  const scaleVar = 0.88 + r1 * 0.28;
  g.rotation.y = r2 * Math.PI * 2;

  if (biomeId === 'amber_dunes') {
    // Palmeira do deserto: tronco curvo em degraus com anéis + 6 frondes arqueadas + cocos
    const trunkA = getMat('#92400e', { roughness: 0.88 });
    const trunkB = getMat('#78350f', { roughness: 0.92 });
    const frondMat = getMat('#65a30d', { roughness: 0.65 });
    const frondTip = getMat('#84cc16', { roughness: 0.6 });
    const cocoMat = getMat('#451a03', { roughness: 0.8 });

    // Base alargada
    vox(g, 0.72, 0.35, 0.72, 0, 0.175, 0, trunkB);
    // Tronco curvo segmentado com sulcos de anel
    const segs = 6;
    let topX = 0;
    let topY = 0.35;
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1);
      const w = 0.56 - t * 0.16;
      const dx = Math.pow(t, 1.45) * 0.78;
      const y = 0.52 + i * 0.52;
      vox(g, w, 0.44, w, dx, y, 0, i % 2 === 0 ? trunkA : trunkB, { z: -t * 0.18 });
      // Anel de entalhe (notch)
      vox(g, w + 0.08, 0.1, w + 0.08, dx, y + 0.22, 0, trunkB, { z: -t * 0.18 });
      topX = dx;
      topY = y + 0.32;
    }

    // Cacho de cocos sob a copa
    for (let c = 0; c < 3; c++) {
      const a = (c / 3) * Math.PI * 2 + 0.4;
      vox(g, 0.24, 0.24, 0.24, topX + Math.cos(a) * 0.26, topY - 0.12, Math.sin(a) * 0.26, cocoMat);
    }

    // 6 frondes arqueadas em degraus
    for (let f = 0; f < 6; f++) {
      const ang = (f / 6) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.position.set(topX, topY + 0.08, 0);
      pivot.rotation.y = ang;
      vox(pivot, 0.34, 0.12, 0.95, 0, 0.18, 0.52, frondMat, { x: -0.22 });
      vox(pivot, 0.28, 0.1, 0.9, 0, 0.14, 1.32, frondTip, { x: 0.22 });
      vox(pivot, 0.18, 0.08, 0.62, 0, -0.14, 1.92, frondTip, { x: 0.58 });
      g.add(pivot);
    }
    g.scale.setScalar(scaleVar);
    return g;
  }

  if (biomeId === 'frost_basin') {
    // Pinheiro glacial: tronco de madeira escura + 4 camadas de galhos nevados
    const bark = getMat('#3b271c', { roughness: 0.9 });
    const pine = getMat('#14532d', { roughness: 0.78 });
    const pineDark = getMat('#064e3b', { roughness: 0.82 });
    const snow = getMat('#e0f2fe', { roughness: 0.45, emissive: '#38bdf8', emissiveIntensity: 0.12 });

    vox(g, 0.68, 0.35, 0.68, 0, 0.175, 0, bark);
    vox(g, 0.48, 1.35, 0.48, 0, 0.85, 0, bark);

    const tiers = [
      { y: 1.55, w: 2.35, h: 0.62, mat: pineDark },
      { y: 2.32, w: 1.85, h: 0.58, mat: pine },
      { y: 3.04, w: 1.32, h: 0.52, mat: pineDark },
      { y: 3.66, w: 0.78, h: 0.48, mat: pine }
    ];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const rotY = i % 2 === 0 ? 0 : Math.PI / 4;
      vox(g, t.w, t.h, t.w, 0, t.y, 0, t.mat, { y: rotY });
      // Camada de neve esculpida no topo de cada nível
      vox(g, t.w * 0.92, 0.15, t.w * 0.92, 0, t.y + t.h * 0.5 + 0.04, 0, snow, { y: rotY });
    }
    // Ponteira nevada
    vox(g, 0.32, 0.46, 0.32, 0, 4.18, 0, snow);
    g.scale.setScalar(scaleVar);
    return g;
  }

  if (biomeId === 'obsidian_ridge') {
    // Árvore de basalto carbonizado com veios de magma e coroa de lascas de obsidiana
    const basalt = getMat('#1c1917', { roughness: 0.88, metalness: 0.2 });
    const obsidian = getMat('#2e1065', { roughness: 0.35, metalness: 0.45 });
    const magma = getMat('#f97316', { emissive: '#ef4444', emissiveIntensity: 1.45, roughness: 0.2 });

    // Raízes angulares de basalto
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.3;
      vox(g, 0.42, 0.52, 0.65, Math.cos(a) * 0.55, 0.24, Math.sin(a) * 0.55, basalt, { y: -a });
    }
    // Tronco carbonizado + veio de magma incandescente
    vox(g, 0.64, 2.35, 0.64, 0, 1.35, 0, basalt);
    vox(g, 0.16, 1.9, 0.68, 0, 1.35, 0, magma);
    vox(g, 0.68, 1.5, 0.16, 0, 1.45, 0, magma);

    // Galhos/lascas de obsidiana em coroa jagged
    vox(g, 0.55, 1.35, 0.55, 0, 3.05, 0, obsidian);
    vox(g, 0.28, 0.95, 0.28, 0, 3.85, 0, magma);
    const shards = [
      { x: 0.78, y: 2.75, z: 0.2, rz: -0.45, h: 1.35 },
      { x: -0.78, y: 2.85, z: -0.18, rz: 0.42, h: 1.25 },
      { x: 0.12, y: 2.8, z: 0.82, rx: 0.42, h: 1.2 },
      { x: -0.16, y: 2.72, z: -0.78, rx: -0.46, h: 1.15 }
    ];
    for (const s of shards) {
      vox(g, 0.34, s.h, 0.34, s.x, s.y, s.z, obsidian, { x: s.rx || 0, z: s.rz || 0 });
    }
    g.scale.setScalar(scaleVar);
    return g;
  }

  // Padrão: emerald_valley — raízes alargadas, tronco segmentado, galhos bifurcados, copa 3 camadas + flores douradas
  const bark = getMat('#5c3a21', { roughness: 0.88 });
  const barkDark = getMat('#452714', { roughness: 0.92 });
  const lush1 = getMat('#15803d', { roughness: 0.72 });
  const lush2 = getMat('#10b981', { roughness: 0.66 });
  const lush3 = getMat('#34d399', { roughness: 0.62 });
  const blossom = getMat('#fbbf24', { emissive: '#d97706', emissiveIntensity: 0.55, roughness: 0.35 });

  // Raízes alargadas
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    vox(g, 0.36, 0.42, 0.58, Math.cos(a) * 0.42, 0.21, Math.sin(a) * 0.42, barkDark, { y: -a });
  }
  // Tronco segmentado
  vox(g, 0.58, 0.95, 0.58, 0, 0.65, 0, bark);
  vox(g, 0.48, 0.95, 0.48, 0.04, 1.55, -0.02, barkDark);
  // Galhos bifurcados
  vox(g, 0.28, 0.75, 0.28, -0.42, 2.25, 0.14, bark, { z: 0.42 });
  vox(g, 0.28, 0.72, 0.28, 0.44, 2.22, -0.16, bark, { z: -0.38 });

  // Copa assimétrica em 3 camadas
  vox(g, 2.25, 0.82, 2.05, -0.1, 2.75, 0.08, lush1);
  vox(g, 1.72, 0.76, 1.82, 0.24, 3.38, -0.12, lush2);
  vox(g, 1.12, 0.62, 1.12, -0.05, 3.92, 0.06, lush3);

  // Flores douradas de destaque na copa
  vox(g, 0.26, 0.26, 0.26, 0.92, 3.05, 0.65, blossom);
  vox(g, 0.24, 0.24, 0.24, -0.88, 3.12, -0.58, blossom);
  vox(g, 0.22, 0.22, 0.22, 0.22, 4.18, 0.42, blossom);

  g.scale.setScalar(scaleVar);
  return g;
}

// ---------------------------------------------------------------------------
// 2. Formações Rochosas Esculpidas por Bioma
// ---------------------------------------------------------------------------

export function buildSculptedRockFormation(biomeId = 'emerald_valley', seed = 1) {
  const g = new THREE.Group();
  const r1 = seededUnit(seed, 11);
  const r2 = seededUnit(seed, 12);
  const scaleVar = 0.85 + r1 * 0.35;
  g.rotation.y = r2 * Math.PI * 2;

  const palettes = {
    emerald_valley: { base: '#475569', mid: '#64748b', cap: '#10b981', glow: null },
    amber_dunes: { base: '#92400e', mid: '#b45309', cap: '#f59e0b', glow: null },
    frost_basin: { base: '#334155', mid: '#475569', cap: '#bae6fd', glow: '#38bdf8' },
    obsidian_ridge: { base: '#18181b', mid: '#27272a', cap: '#f97316', glow: '#ef4444' }
  };
  const pal = palettes[biomeId] || palettes.emerald_valley;

  const baseMat = getMat(pal.base, { roughness: 0.9 });
  const midMat = getMat(pal.mid, { roughness: 0.85 });
  const capMat = pal.glow
    ? getMat(pal.cap, { emissive: pal.glow, emissiveIntensity: 0.95, roughness: 0.3 })
    : getMat(pal.cap, { roughness: 0.72 });

  // Monólito principal multi-camada
  vox(g, 1.85, 0.85, 1.65, 0, 0.42, 0, baseMat);
  vox(g, 1.35, 0.95, 1.25, -0.14, 1.12, 0.08, midMat, { y: 0.18 });
  vox(g, 0.88, 0.68, 0.82, -0.08, 1.72, 0.04, baseMat, { y: -0.14 });
  // Rocha secundária lateral
  vox(g, 0.95, 0.62, 0.88, 0.85, 0.31, -0.42, midMat, { y: 0.35 });
  vox(g, 0.62, 0.44, 0.62, -0.82, 0.22, 0.56, baseMat, { y: -0.25 });

  // Detalhe característico do bioma
  if (biomeId === 'obsidian_ridge') {
    // Veio de lava atravessando a rocha
    vox(g, 1.42, 0.14, 0.22, -0.12, 1.15, 0.58, capMat, { z: 0.25 });
    vox(g, 0.22, 0.72, 0.22, 0.15, 2.02, 0, capMat);
  } else if (biomeId === 'frost_basin') {
    // Crista de gelo brilhante no topo
    vox(g, 0.36, 0.85, 0.36, -0.08, 2.25, 0.04, capMat, { z: 0.15 });
    vox(g, 0.24, 0.58, 0.24, 0.22, 2.05, -0.16, capMat, { z: -0.25 });
  } else if (biomeId === 'amber_dunes') {
    // Estratos horizontais de arenito
    vox(g, 1.44, 0.18, 1.32, -0.14, 1.02, 0.08, capMat, { y: 0.18 });
    vox(g, 0.96, 0.16, 0.9, -0.08, 2.06, 0.04, capMat, { y: -0.14 });
  } else {
    // Musgo esmeralda no topo e ombro da pedra
    vox(g, 0.96, 0.16, 0.88, -0.08, 2.08, 0.04, capMat, { y: -0.14 });
    vox(g, 0.82, 0.14, 0.78, 0.85, 0.65, -0.42, capMat, { y: 0.35 });
  }

  g.scale.setScalar(scaleVar);
  return g;
}

// ---------------------------------------------------------------------------
// 3. Altar Ancestral Jurássico-Asteca
// ---------------------------------------------------------------------------

export function buildSculptedAncientAltar(accentColor = '#10b981', rockColor = '#4b5563') {
  const g = new THREE.Group();
  const stone = getMat(rockColor, { roughness: 0.86 });
  const darkStone = getMat('#1f2937', { roughness: 0.78 });
  const gold = getMat('#f59e0b', { roughness: 0.32, metalness: 0.55 });
  const accent = getMat(accentColor, { emissive: accentColor, emissiveIntensity: 1.45, roughness: 0.2 });
  const flameOuter = getMat('#f97316', { emissive: '#ea580c', emissiveIntensity: 1.6, roughness: 0.2 });
  const flameCore = getMat('#fde047', { emissive: '#facc15', emissiveIntensity: 2.0, roughness: 0.1 });

  // Ziggurat em 3 degraus
  vox(g, 6.2, 0.36, 6.2, 0, 0.18, 0, stone);
  vox(g, 4.8, 0.38, 4.8, 0, 0.55, 0, darkStone);
  vox(g, 3.4, 0.42, 3.4, 0, 0.95, 0, stone);
  // Escadaria frontal
  vox(g, 1.8, 0.22, 0.7, 0, 0.11, 3.35, darkStone);
  vox(g, 1.6, 0.26, 0.65, 0, 0.42, 2.68, stone);
  vox(g, 1.4, 0.28, 0.6, 0, 0.78, 2.0, darkStone);

  // Anel rúnico octogonal no chão (userData.runeRing)
  const runeRing = buildSculptedGateRing(accentColor, 3.7);
  runeRing.rotation.x = -Math.PI / 2;
  runeRing.position.y = 0.06;
  g.add(runeRing);

  // 4 braseiros rúnicos nos cantos com blocos de fogo
  const flames = [];
  for (const [cx, cz] of [[-2.35, -2.35], [2.35, -2.35], [-2.35, 2.35], [2.35, 2.35]]) {
    vox(g, 0.68, 1.45, 0.68, cx, 0.95, cz, stone);
    vox(g, 0.82, 0.22, 0.82, cx, 1.72, cz, darkStone);
    vox(g, 0.74, 0.14, 0.74, cx, 1.25, cz, accent);
    const f1 = vox(g, 0.36, 0.52, 0.36, cx, 2.05, cz, flameOuter, { y: 0.4 });
    const f2 = vox(g, 0.2, 0.38, 0.2, cx, 2.15, cz, flameCore, { y: 0.8 });
    flames.push(f1, f2);
  }

  // Plinto com arco de crista de dinossauro ao fundo
  vox(g, 0.56, 2.4, 0.56, -1.25, 2.25, -1.25, darkStone);
  vox(g, 0.56, 2.4, 0.56, 1.25, 2.25, -1.25, darkStone);
  vox(g, 3.2, 0.5, 0.68, 0, 3.55, -1.25, stone);
  // Cristas jurássicas esculpidas sobre o arco
  for (let i = -2; i <= 2; i++) {
    const ch = i === 0 ? 0.62 : Math.abs(i) === 1 ? 0.44 : 0.28;
    vox(g, 0.28, ch, 0.32, i * 0.55, 3.8 + ch * 0.5, -1.25, gold);
  }

  // Obelisco de cristal levitante multi-peça (userData.crystal)
  const crystal = new THREE.Group();
  crystal.position.set(0, 2.55, 0);
  vox(crystal, 0.56, 1.35, 0.56, 0, 0, 0, accent, { y: Math.PI / 4 });
  vox(crystal, 0.36, 0.55, 0.36, 0, 0.85, 0, accent, { y: Math.PI / 4 });
  vox(crystal, 0.36, 0.48, 0.36, 0, -0.82, 0, accent, { y: Math.PI / 4 });
  // Placas orbitantes douradas
  vox(crystal, 0.92, 0.12, 0.18, 0, 0.15, 0, gold, { y: 0.5 });
  vox(crystal, 0.18, 0.12, 0.92, 0, -0.15, 0, gold, { y: 0.5 });
  g.add(crystal);

  g.userData.crystal = crystal;
  g.userData.runeRing = runeRing;
  g.userData.flames = flames;
  return g;
}

// ---------------------------------------------------------------------------
// 4. Portal de Masmorra Esculpido
// ---------------------------------------------------------------------------

export function buildSculptedDungeonPortal(accentColor = '#38bdf8') {
  const g = new THREE.Group();
  const stone = getMat('#312e81', { roughness: 0.78 });
  const trim = getMat('#1e1b4b', { roughness: 0.7 });
  const rune = getMat(accentColor, { emissive: accentColor, emissiveIntensity: 1.65, roughness: 0.2 });
  const vortexMat = getMat('#a855f7', { emissive: '#7e22ce', emissiveIntensity: 1.7, roughness: 0.2 });
  const veilMat = getMat(accentColor, { emissive: accentColor, emissiveIntensity: 1.1, opacity: 0.45 });

  // Soleira luminosa em degraus
  vox(g, 4.6, 0.36, 2.5, 0, 0.18, 0, stone);
  vox(g, 3.2, 0.08, 1.4, 0, 0.38, 0, rune);

  // Pilares gêmeos canelados com runas
  for (const sx of [-1.62, 1.62]) {
    vox(g, 0.92, 0.42, 0.92, sx, 0.55, 0, trim);
    vox(g, 0.72, 3.7, 0.72, sx, 2.45, 0, stone);
    // Caneluras verticais
    vox(g, 0.16, 3.4, 0.82, sx, 2.45, 0, trim);
    for (const sy of [1.35, 2.45, 3.55]) {
      vox(g, 0.24, 0.34, 0.86, sx, sy, 0, rune);
    }
    vox(g, 0.95, 0.38, 0.95, sx, 4.22, 0, trim);
  }

  // Verga e pedra-chave escalonada
  vox(g, 4.35, 0.68, 0.96, 0, 4.62, 0, stone);
  vox(g, 1.35, 0.56, 1.1, 0, 4.82, 0, trim);

  // Cristal de coroação no topo
  const crownGem = buildSculptedCrystalSpire(accentColor, 0.55);
  crownGem.position.set(0, 5.05, 0);
  g.add(crownGem);

  // Vórtice giratório em camadas de lascas de cristal voxel
  const ring = new THREE.Group();
  ring.position.set(0, 2.38, 0);
  const shardCount = 8;
  for (let i = 0; i < shardCount; i++) {
    const a = (i / shardCount) * Math.PI * 2;
    const rad = 1.24;
    const m = i % 2 === 0 ? vortexMat : rune;
    vox(ring, 0.36, 0.62, 0.18, Math.cos(a) * rad, Math.sin(a) * rad, 0, m, { z: a + Math.PI / 2 });
  }
  // Camada interna de lascas
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    vox(ring, 0.22, 0.45, 0.14, Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0.06, rune, { z: a });
  }
  g.add(ring);

  // Véu central translúcido
  const vortex = new THREE.Group();
  vortex.position.set(0, 2.38, 0);
  vox(vortex, 1.95, 2.25, 0.08, 0, 0, 0, veilMat);
  g.add(vortex);

  g.userData.ring = ring;
  g.userData.vortex = vortex;
  g.userData.crownGem = crownGem;
  return g;
}

// ---------------------------------------------------------------------------
// 5. Interativos Esculpidos (Substitui IcosahedronGeometry genéricos)
// ---------------------------------------------------------------------------

export function buildSculptedInteractable(kind = 'crystal', accentColor = '#f59e0b') {
  const g = new THREE.Group();
  const accent = getMat(accentColor, { emissive: accentColor, emissiveIntensity: 1.4, roughness: 0.22 });

  if (kind === 'treasure') {
    // Baú voxel de madeira com faixas de ferro, fecho dourado e gema flutuante
    const wood = getMat('#78350f', { roughness: 0.82 });
    const woodDark = getMat('#451a03', { roughness: 0.88 });
    const iron = getMat('#52525b', { roughness: 0.4, metalness: 0.65 });
    const gold = getMat('#fbbf24', { emissive: '#d97706', emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.6 });

    vox(g, 1.12, 0.62, 0.78, 0, -0.08, 0, wood);
    vox(g, 1.16, 0.26, 0.82, 0, 0.34, 0, woodDark);
    vox(g, 0.98, 0.16, 0.66, 0, 0.52, 0, wood);
    // Faixas de ferro laterais
    vox(g, 0.12, 0.92, 0.84, -0.44, 0.08, 0, iron);
    vox(g, 0.12, 0.92, 0.84, 0.44, 0.08, 0, iron);
    // Fecho dourado frontal
    vox(g, 0.22, 0.26, 0.1, 0, 0.18, 0.42, gold);
    // Brilho de gema flutuando acima
    vox(g, 0.24, 0.34, 0.24, 0, 0.88, 0, accent, { y: Math.PI / 4 });
    return g;
  }

  if (kind === 'shrine') {
    // Totem de pedra esculpido com olho rúnico brilhante e 2 tábuas orbitantes
    const stone = getMat('#334155', { roughness: 0.82 });
    const trim = getMat('#1e293b', { roughness: 0.75 });
    vox(g, 0.9, 0.24, 0.9, 0, -0.42, 0, trim);
    vox(g, 0.58, 1.25, 0.58, 0, 0.25, 0, stone);
    vox(g, 0.76, 0.22, 0.76, 0, 0.92, 0, trim);
    // Olho rúnico
    vox(g, 0.34, 0.34, 0.64, 0, 0.42, 0, accent);
    // 2 tábuas de pedra orbitando
    vox(g, 0.16, 0.56, 0.34, -0.68, 0.35, 0, stone, { z: 0.18 });
    vox(g, 0.16, 0.56, 0.34, 0.68, 0.35, 0, stone, { z: -0.18 });
    return g;
  }

  if (kind === 'trap') {
    // Pedestal de placa de pressão entalhado com dentes carmesim e runa de perigo
    const stone = getMat('#27272a', { roughness: 0.85 });
    const crimson = getMat('#ef4444', { emissive: '#dc2626', emissiveIntensity: 1.5, roughness: 0.25 });
    const steel = getMat('#a1a1aa', { roughness: 0.35, metalness: 0.7 });

    vox(g, 1.2, 0.24, 1.2, 0, -0.35, 0, stone);
    vox(g, 0.86, 0.14, 0.86, 0, -0.16, 0, crimson);
    // 4 dentes metálicos/carmesim nos cantos
    for (const [cx, cz] of [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]]) {
      vox(g, 0.18, 0.48, 0.18, cx, 0.02, cz, steel);
      vox(g, 0.12, 0.22, 0.12, cx, 0.34, cz, crimson);
    }
    return g;
  }

  if (kind === 'merchant') {
    // Lanterna de mercado com toldo listrado e brilho âmbar acolhedor
    const wood = getMat('#78350f', { roughness: 0.85 });
    const awningA = getMat('#dc2626', { roughness: 0.65 });
    const awningB = getMat('#fef3c7', { roughness: 0.65 });
    const lantern = getMat('#fbbf24', { emissive: '#f59e0b', emissiveIntensity: 1.6, roughness: 0.2 });

    vox(g, 0.2, 1.35, 0.2, 0, 0.15, 0, wood);
    vox(g, 0.75, 0.12, 0.16, 0.28, 0.78, 0, wood);
    // Toldo listrado
    vox(g, 0.36, 0.12, 0.62, -0.34, 0.92, 0, awningA, { z: 0.16 });
    vox(g, 0.36, 0.12, 0.62, 0, 0.96, 0, awningB);
    vox(g, 0.36, 0.12, 0.62, 0.34, 0.92, 0, awningA, { z: -0.16 });
    // Lanterna suspensa
    vox(g, 0.32, 0.4, 0.32, 0.56, 0.46, 0, lantern);
    return g;
  }

  if (kind === 'relic') {
    // Ídolo fóssil dourado sobre plinto relicário em degraus
    const stone = getMat('#3f3f46', { roughness: 0.82 });
    const gold = getMat('#fbbf24', { emissive: '#d97706', emissiveIntensity: 0.85, roughness: 0.25, metalness: 0.65 });
    vox(g, 0.88, 0.2, 0.88, 0, -0.45, 0, stone);
    vox(g, 0.62, 0.22, 0.62, 0, -0.24, 0, stone);
    // Ídolo fóssil dourado
    vox(g, 0.42, 0.58, 0.34, 0, 0.18, 0, gold);
    vox(g, 0.52, 0.24, 0.42, 0, 0.56, 0, gold);
    vox(g, 0.2, 0.28, 0.2, 0, 0.8, 0, accent, { y: Math.PI / 4 });
    return g;
  }

  // Fallback ('crystal' etc.): lanterna de cristal multifacetada flutuante (4 placas + núcleo rúnico)
  const frame = getMat('#1e293b', { roughness: 0.45, metalness: 0.55 });
  vox(g, 0.34, 0.62, 0.34, 0, 0, 0, accent, { y: Math.PI / 4 });
  vox(g, 0.2, 0.26, 0.2, 0, 0.44, 0, accent, { y: Math.PI / 4 });
  vox(g, 0.2, 0.26, 0.2, 0, -0.44, 0, accent, { y: Math.PI / 4 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    vox(g, 0.1, 0.46, 0.24, Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34, frame, { y: -a });
  }
  return g;
}

// ---------------------------------------------------------------------------
// 6. Alimentos & Frutas Voxel Esculpidos
// ---------------------------------------------------------------------------

export function buildSculptedFoodModel(foodKind = 'apple') {
  const g = new THREE.Group();

  if (foodKind === 'golden_fruit') {
    // Abacaxi Dourado: corpo escalonado em losango + coroa de 5 pontas
    const goldA = getMat('#f59e0b', { emissive: '#d97706', emissiveIntensity: 0.95, roughness: 0.25, metalness: 0.45 });
    const goldB = getMat('#fbbf24', { emissive: '#f59e0b', emissiveIntensity: 0.75, roughness: 0.22, metalness: 0.5 });
    const leaf = getMat('#10b981', { emissive: '#059669', emissiveIntensity: 0.65, roughness: 0.5 });

    vox(g, 0.36, 0.2, 0.36, 0, -0.22, 0, goldA);
    vox(g, 0.52, 0.28, 0.52, 0, 0.02, 0, goldB, { y: Math.PI / 4 });
    vox(g, 0.38, 0.22, 0.38, 0, 0.26, 0, goldA);
    // Coroa de 5 pontas folhosas
    vox(g, 0.14, 0.42, 0.14, 0, 0.56, 0, leaf);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      vox(g, 0.12, 0.32, 0.12, Math.cos(a) * 0.16, 0.48, Math.sin(a) * 0.16, leaf, {
        x: Math.sin(a) * 0.42,
        z: -Math.cos(a) * 0.42
      });
    }
    return g;
  }

  if (foodKind === 'fossil_meat') {
    // Pernil pré-histórico: carne selada + centro marmorizado + 2 pontas de osso branco
    const bone = getMat('#f8fafc', { roughness: 0.4 });
    const meat = getMat('#ea580c', { emissive: '#9a3412', emissiveIntensity: 0.55, roughness: 0.5 });
    const marble = getMat('#fed7aa', { roughness: 0.45 });

    vox(g, 0.92, 0.14, 0.14, 0, 0, 0, bone);
    // Pontas de osso duplas
    vox(g, 0.14, 0.22, 0.22, -0.48, 0.05, 0, bone);
    vox(g, 0.14, 0.22, 0.22, -0.48, -0.05, 0, bone);
    vox(g, 0.14, 0.22, 0.22, 0.48, 0.05, 0, bone);
    vox(g, 0.14, 0.22, 0.22, 0.48, -0.05, 0, bone);
    // Carne selada + centro marmorizado
    vox(g, 0.56, 0.44, 0.44, 0, 0, 0, meat);
    vox(g, 0.6, 0.22, 0.24, 0, 0, 0, marble);
    return g;
  }

  if (foodKind === 'crystal_berry') {
    // Cacho de 3 bagas safira cristalinas com folhas gélidas
    const berry = getMat('#38bdf8', { emissive: '#0284c7', emissiveIntensity: 1.35, roughness: 0.18, metalness: 0.25 });
    const frostLeaf = getMat('#bae6fd', { emissive: '#38bdf8', emissiveIntensity: 0.6, roughness: 0.3 });

    for (const [bx, by, bz] of [[-0.18, -0.04, 0.1], [0.18, 0.0, 0.1], [0, 0.12, -0.12]]) {
      vox(g, 0.28, 0.28, 0.28, bx, by, bz, berry, { y: Math.PI / 4 });
      vox(g, 0.18, 0.34, 0.18, bx, by, bz, berry);
    }
    vox(g, 0.34, 0.08, 0.16, -0.08, 0.34, 0, frostLeaf, { z: 0.28 });
    vox(g, 0.32, 0.08, 0.16, 0.12, 0.34, 0.04, frostLeaf, { z: -0.28 });
    return g;
  }

  // Padrão: 'apple' — Maçã Jurássica gordinha multi-voxel + brilho + cabinho + folha esmeralda
  const red = getMat('#ef4444', { emissive: '#b91c1c', emissiveIntensity: 0.6, roughness: 0.32 });
  const cheek = getMat('#fca5a5', { emissive: '#ef4444', emissiveIntensity: 0.45, roughness: 0.22 });
  const stem = getMat('#78350f', { roughness: 0.85 });
  const leaf = getMat('#22c55e', { emissive: '#16a34a', emissiveIntensity: 0.55, roughness: 0.5 });

  vox(g, 0.56, 0.5, 0.56, 0, 0, 0, red);
  vox(g, 0.42, 0.58, 0.42, 0, 0, 0, red);
  vox(g, 0.16, 0.18, 0.16, 0.22, 0.1, 0.22, cheek);
  vox(g, 0.09, 0.26, 0.09, 0, 0.38, 0, stem);
  vox(g, 0.28, 0.08, 0.16, 0.16, 0.44, 0, leaf, { z: 0.38 });
  return g;
}

// ---------------------------------------------------------------------------
// 7. Pilar de Arena Coliseu (Substitui CylinderGeometry)
// ---------------------------------------------------------------------------

export function buildSculptedArenaPillar(theme = {}) {
  const g = new THREE.Group();
  const baseColor = typeof theme === 'string' ? '#3f3f46' : (theme.floor || theme.stone || '#3f3f46');
  const accentColor = typeof theme === 'string' ? '#f59e0b' : (theme.ring || theme.accent || '#f59e0b');
  const radius = typeof theme === 'object' && theme.r ? theme.r : 0.95;
  const s = radius / 0.95;

  const stone = getMat(baseColor, { roughness: 0.78, metalness: 0.12 });
  const darkStone = getMat('#1f2937', { roughness: 0.85 });
  const rune = getMat(accentColor, { emissive: accentColor, emissiveIntensity: 1.25, roughness: 0.25 });
  const fire = getMat('#f97316', { emissive: '#ea580c', emissiveIntensity: 1.7, roughness: 0.2 });

  // Plinto base em degraus
  vox(g, 1.95 * s, 0.34, 1.95 * s, 0, 0.17, 0, darkStone);
  vox(g, 1.62 * s, 0.28, 1.62 * s, 0, 0.48, 0, stone);

  // Fuste canelado
  const shaft = vox(g, 1.22 * s, 2.35, 1.22 * s, 0, 1.78, 0, stone);
  vox(g, 1.36 * s, 2.2, 0.34 * s, 0, 1.78, 0, darkStone);
  vox(g, 0.34 * s, 2.2, 1.36 * s, 0, 1.78, 0, darkStone);

  // Faixa rúnica luminosa
  vox(g, 1.44 * s, 0.24, 1.44 * s, 0, 2.42, 0, rune);

  // Capitel e braseiro de fogo no topo
  vox(g, 1.75 * s, 0.3, 1.75 * s, 0, 3.08, 0, stone);
  vox(g, 1.45 * s, 0.22, 1.45 * s, 0, 3.34, 0, darkStone);
  vox(g, 0.65 * s, 0.42, 0.65 * s, 0, 3.62, 0, fire, { y: Math.PI / 4 });

  g.userData.body = shaft;
  return g;
}

// ---------------------------------------------------------------------------
// 8. Espira de Cristal Esculpida (Substitui OctahedronGeometry)
// ---------------------------------------------------------------------------

export function buildSculptedCrystalSpire(color = '#22d3ee', scale = 1) {
  const g = new THREE.Group();
  const mainMat = getMat(color, { emissive: color, emissiveIntensity: 1.15, roughness: 0.2, metalness: 0.3 });
  const tipMat = getMat('#e0f2fe', { emissive: color, emissiveIntensity: 1.5, roughness: 0.15 });
  const baseMat = getMat('#1e293b', { roughness: 0.8 });

  // Base rochosa sutil
  vox(g, 0.82, 0.22, 0.82, 0, 0.11, 0, baseMat);
  // Espira principal escalonada
  vox(g, 0.56, 0.92, 0.56, 0, 0.62, 0, mainMat, { y: Math.PI / 4 });
  vox(g, 0.38, 0.68, 0.38, 0, 1.28, 0, mainMat, { y: Math.PI / 4 });
  vox(g, 0.2, 0.42, 0.2, 0, 1.74, 0, tipMat, { y: Math.PI / 4 });

  // 2 lascas laterais inclinadas
  vox(g, 0.3, 0.95, 0.3, 0.42, 0.56, 0.12, mainMat, { z: -0.34, y: 0.3 });
  vox(g, 0.26, 0.82, 0.26, -0.38, 0.48, -0.18, mainMat, { z: 0.38, x: -0.16 });

  if (scale !== 1) g.scale.setScalar(scale);
  return g;
}

// ---------------------------------------------------------------------------
// 9. Anel/Portão Rúnico Octogonal Esculpido (Substitui TorusGeometry)
// ---------------------------------------------------------------------------

export function buildSculptedGateRing(color = '#22d3ee', radius = 0.78) {
  const g = new THREE.Group();
  const segMat = getMat(color, { emissive: color, emissiveIntensity: 1.1, roughness: 0.25 });
  const cornerMat = getMat('#f8fafc', { emissive: color, emissiveIntensity: 1.5, roughness: 0.2 });

  const segs = 8;
  const sideLen = 2 * radius * Math.sin(Math.PI / segs) * 0.94;
  const thick = Math.max(0.08, radius * 0.15);

  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    vox(g, thick, sideLen, thick, x, y, 0, segMat, { z: a });
    // Nó rúnico a cada 2 segmentos
    if (i % 2 === 0) {
      const ca = a + Math.PI / segs;
      vox(g, thick * 1.35, thick * 1.35, thick * 1.35, Math.cos(ca) * radius, Math.sin(ca) * radius, 0, cornerMat, { z: ca });
    }
  }
  return g;
}
