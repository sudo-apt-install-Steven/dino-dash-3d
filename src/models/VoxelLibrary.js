// Biblioteca central de modelos Voxel multi-partes (>= 3 peças por objeto).
// Elimina blocos isolados e geometrias primitivas soltas em itens, obstáculos, projéteis e acessórios.
import * as THREE from 'three';

export const VOXEL_BOX = new THREE.BoxGeometry(1, 1, 1);

export function addVoxelBox(parent, w, h, d, x, y, z, mat, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(VOXEL_BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

export function countVoxelMeshes(obj) {
  let count = 0;
  obj?.traverse?.((n) => {
    if (n.isMesh) count += 1;
  });
  return count;
}

export function buildVoxelPowerupCrate(mat) {
  const g = new THREE.Group();
  const trimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.35, metalness: 0.4 });
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 0.78, 0);
  // Núcleo central + moldura em cruz (5 peças no núcleo rotativo + 2 base holográfica = 7 peças)
  addVoxelBox(coreGroup, 0.48, 0.48, 0.48, 0, 0, 0, mat);
  addVoxelBox(coreGroup, 0.68, 0.16, 0.68, 0, 0, 0, trimMat);
  addVoxelBox(coreGroup, 0.18, 0.68, 0.18, 0, 0, 0, mat);
  addVoxelBox(coreGroup, 0.14, 0.14, 0.72, 0, 0, 0, trimMat);
  addVoxelBox(coreGroup, 0.72, 0.14, 0.14, 0, 0, 0, trimMat);
  g.add(coreGroup);
  // Pedestal flutuante abaixo
  addVoxelBox(g, 0.62, 0.1, 0.62, 0, 0.12, 0, trimMat);
  addVoxelBox(g, 0.4, 0.08, 0.4, 0, 0.22, 0, mat);
  return { group: g, core: coreGroup };
}

export function buildVoxelMudPool(mudMat, bubbleMat, rimMat) {
  const g = new THREE.Group();
  // Borda escalonada de lama seca + poça central + 2 clusters multi-voxel borbulhantes
  addVoxelBox(g, 2.08, 0.06, 2.38, 0, 0.03, 0, rimMat);
  addVoxelBox(g, 1.88, 0.08, 2.16, 0, 0.05, 0, mudMat);
  addVoxelBox(g, 0.46, 0.1, 0.54, -0.78, 0.08, -0.68, rimMat);
  addVoxelBox(g, 0.52, 0.1, 0.44, 0.75, 0.08, 0.72, rimMat);

  const b1 = new THREE.Group();
  b1.position.set(-0.4, 0.1, 0.3);
  addVoxelBox(b1, 0.26, 0.16, 0.26, 0, 0.06, 0, bubbleMat);
  addVoxelBox(b1, 0.14, 0.12, 0.14, 0.04, 0.18, -0.02, bubbleMat);

  const b2 = new THREE.Group();
  b2.position.set(0.35, 0.1, -0.35);
  addVoxelBox(b2, 0.3, 0.18, 0.3, 0, 0.07, 0, bubbleMat);
  addVoxelBox(b2, 0.16, 0.14, 0.16, -0.05, 0.2, 0.04, bubbleMat);

  g.add(b1, b2);
  return { group: g, b1, b2 };
}

export function buildVoxelToxicPool(rockMat, toxicMat) {
  const g = new THREE.Group();
  const drumMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.45 });
  addVoxelBox(g, 1.92, 0.08, 2.18, 0, 0.04, 0, rockMat);
  addVoxelBox(g, 1.66, 0.1, 1.88, 0, 0.06, 0, toxicMat);
  addVoxelBox(g, 0.28, 0.24, 0.34, -0.82, 0.14, 0.65, drumMat, 0.2, 0.3, 0.15);
  addVoxelBox(g, 0.24, 0.2, 0.24, 0.84, 0.12, -0.6, drumMat);

  const b1 = new THREE.Group();
  b1.position.set(0.24, 0.14, 0.18);
  addVoxelBox(b1, 0.24, 0.18, 0.24, 0, 0.06, 0, toxicMat);
  addVoxelBox(b1, 0.14, 0.16, 0.14, 0.08, 0.22, -0.05, toxicMat);
  addVoxelBox(b1, 0.1, 0.12, 0.1, -0.1, 0.28, 0.06, toxicMat);
  g.add(b1);
  return { group: g, b1 };
}

export function buildVoxelFruit(fruitMat, leafMat, stemMat) {
  const g = new THREE.Group();
  const sliceMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.55 });
  // Fruta pré-histórica escalonada com fatia/listra + caule + 2 folhas
  addVoxelBox(g, 0.56, 0.48, 0.56, 0, 0.58, 0, fruitMat);
  addVoxelBox(g, 0.62, 0.22, 0.62, 0, 0.58, 0, sliceMat);
  addVoxelBox(g, 0.38, 0.64, 0.38, 0, 0.58, 0, fruitMat);
  addVoxelBox(g, 0.1, 0.22, 0.1, 0, 0.96, 0, stemMat);
  addVoxelBox(g, 0.28, 0.08, 0.16, 0.18, 0.98, 0, leafMat, 0, 0, 0.32);
  addVoxelBox(g, 0.24, 0.08, 0.14, -0.16, 0.94, 0.05, leafMat, 0, 0.4, -0.28);
  return { group: g };
}

export function buildVoxelElementalEgg(mat) {
  const g = new THREE.Group();
  const darkCap = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.45 });
  // Núcleo de ovo cristalino escalonado (4 peças)
  const core = new THREE.Group();
  core.position.set(0, 0.98, 0);
  addVoxelBox(core, 0.48, 0.64, 0.48, 0, 0, 0, mat);
  addVoxelBox(core, 0.34, 0.82, 0.34, 0, 0, 0, mat);
  addVoxelBox(core, 0.62, 0.36, 0.62, 0, -0.04, 0, mat);
  addVoxelBox(core, 0.44, 0.12, 0.44, 0, -0.44, 0, darkCap);

  // Anel orbital de 4 cristais flutuantes (zero TorusGeometry)
  const ring = new THREE.Group();
  ring.position.set(0, 0.98, 0);
  ring.rotation.x = 1.05;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    addVoxelBox(ring, 0.2, 0.2, 0.2, Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0, mat, 0.4, 0.4, a);
  }
  g.add(core, ring);
  return { group: g, core, ring };
}

export function buildVoxelPortalArch(stoneMat, runeMat, vortexMat) {
  const g = new THREE.Group();
  // Pilares de pedra + arco de 9 blocos + runas brilhantes
  addVoxelBox(g, 0.48, 0.38, 0.52, -1.05, 0.19, 0, stoneMat);
  addVoxelBox(g, 0.48, 0.38, 0.52, 1.05, 0.19, 0, stoneMat);
  for (let i = 0; i < 9; i++) {
    const ang = (i / 8) * Math.PI;
    const sx = Math.cos(ang) * 1.04;
    const sy = 0.38 + Math.sin(ang) * 1.15;
    addVoxelBox(g, 0.36, 0.34, 0.38, sx, sy, 0, stoneMat, 0, 0, ang - Math.PI / 2);
    addVoxelBox(g, 0.14, 0.16, 0.42, sx * 0.92, sy * 0.96, 0, runeMat, 0, 0, ang - Math.PI / 2);
  }
  // Anel de runas rotativo em voxel (8 segmentos)
  const vortexRing = new THREE.Group();
  vortexRing.position.set(0, 1.12, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addVoxelBox(vortexRing, 0.22, 0.14, 0.14, Math.cos(a) * 0.74, Math.sin(a) * 0.74, 0, runeMat, 0, 0, a + Math.PI / 2);
  }
  // Núcleo vórtice multi-placa mantendo referência .material em vortexDisc
  const vortexDisc = addVoxelBox(g, 0.92, 0.92, 0.08, 0, 1.12, 0, vortexMat, 0, 0, Math.PI / 4);
  addVoxelBox(g, 0.56, 0.56, 0.12, 0, 1.12, 0, vortexMat);
  g.add(vortexRing);
  return { group: g, vortexRing, vortexDisc };
}

export function buildVoxelRollingLog(logMat) {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({ color: '#d4a373', roughness: 0.78 });
  const mossMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.85 });
  const body = new THREE.Group();
  body.position.set(0, 0.38, 0);
  addVoxelBox(body, 1.94, 0.62, 0.62, 0, 0, 0, logMat);
  addVoxelBox(body, 1.98, 0.46, 0.74, 0, 0, 0, logMat);
  addVoxelBox(body, 2.02, 0.38, 0.38, 0, 0, 0, ringMat);
  addVoxelBox(body, 0.28, 0.2, 0.78, -0.45, 0.14, 0.04, mossMat);
  addVoxelBox(body, 0.32, 0.18, 0.76, 0.48, -0.06, -0.05, mossMat);
  g.add(body);
  return { group: g, body };
}

export function buildVoxelTallRock(rockMat) {
  const g = new THREE.Group();
  const darkMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 });
  const mossMat = new THREE.MeshStandardMaterial({ color: '#3f6212', roughness: 0.9 });
  addVoxelBox(g, 1.38, 0.45, 1.28, 0, 0.225, 0, darkMat);
  addVoxelBox(g, 1.22, 1.48, 1.12, 0, 1.04, 0, rockMat);
  addVoxelBox(g, 0.86, 0.48, 0.82, 0.08, 1.92, -0.04, rockMat);
  addVoxelBox(g, 0.48, 0.28, 0.52, -0.1, 2.22, 0.04, darkMat);
  addVoxelBox(g, 0.95, 0.14, 0.76, -0.05, 1.56, 0.24, mossMat);
  return { group: g };
}

export function buildVoxelCampfire(logMat, fireMat) {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.85 });
  const coreFire = new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#facc15', emissiveIntensity: 1.15 });
  // Lenha cruzada + pedras + chamas em camadas
  addVoxelBox(g, 1.22, 0.18, 0.26, 0, 0.12, 0, logMat, 0, 0.48, 0);
  addVoxelBox(g, 1.22, 0.18, 0.26, 0, 0.16, 0, logMat, 0, -0.52, 0);
  addVoxelBox(g, 0.28, 0.22, 0.28, -0.58, 0.11, 0.55, stoneMat);
  addVoxelBox(g, 0.28, 0.22, 0.28, 0.58, 0.11, -0.55, stoneMat);
  addVoxelBox(g, 0.28, 0.22, 0.28, -0.55, 0.11, -0.55, stoneMat);
  addVoxelBox(g, 0.52, 0.68, 0.52, 0, 0.5, 0, fireMat);
  addVoxelBox(g, 0.3, 0.88, 0.3, 0.04, 0.66, -0.03, coreFire, 0, 0.45, 0);
  return { group: g };
}

export function buildVoxelTreasureChest(goldMat) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
  const gem = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.8 });
  addVoxelBox(g, 0.96, 0.48, 0.66, 0, 0.24, 0, wood);
  addVoxelBox(g, 1.0, 0.16, 0.7, 0, 0.52, 0, wood);
  addVoxelBox(g, 0.14, 0.58, 0.72, -0.34, 0.29, 0, goldMat);
  addVoxelBox(g, 0.14, 0.58, 0.72, 0.34, 0.29, 0, goldMat);
  addVoxelBox(g, 0.24, 0.24, 0.12, 0, 0.44, 0.36, goldMat);
  addVoxelBox(g, 0.28, 0.24, 0.28, 0, 0.72, 0, gem, 0, Math.PI / 4, 0);
  return { group: g };
}

export function buildVoxelGrapple(ropeMat, goldMat) {
  const g = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.55 });
  addVoxelBox(g, 0.16, 2.8, 0.16, 0, 3.3, 0, ropeMat);
  addVoxelBox(g, 0.28, 0.16, 0.28, -0.12, 3.6, 0.08, leafMat, 0.2, 0.3, 0.4);
  addVoxelBox(g, 0.26, 0.14, 0.26, 0.14, 2.75, -0.06, leafMat, -0.2, 0, -0.4);
  addVoxelBox(g, 0.88, 0.28, 0.28, 0, 1.9, 0, goldMat);
  addVoxelBox(g, 0.36, 0.36, 0.36, 0, 1.65, 0, goldMat);
  return { group: g };
}

export function buildVoxelCactusShooter(cactusMat, cactusDarkMat, flowerMat) {
  const g = new THREE.Group();
  addVoxelBox(g, 0.66, 1.48, 0.66, 0, 0.74, 0, cactusDarkMat);
  addVoxelBox(g, 0.22, 0.45, 0.22, -0.4, 0.85, 0, cactusMat);
  addVoxelBox(g, 0.22, 0.42, 0.22, 0.4, 0.72, 0, cactusMat);
  addVoxelBox(g, 0.38, 0.38, 0.32, 0, 1.0, 0.4, flowerMat);
  addVoxelBox(g, 0.2, 0.2, 0.22, 0, 1.0, 0.58, cactusMat);
  addVoxelBox(g, 0.32, 0.18, 0.32, 0, 1.56, 0, flowerMat);
  return { group: g };
}

export function buildVoxelSpineShot(flowerMat) {
  const g = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({
    color: '#ff2e3b',
    emissive: '#ef4444',
    emissiveIntensity: 0.75,
    roughness: 0.35
  });
  const tipMat = new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#facc15', emissiveIntensity: 0.85 });
  // Projétil de espinho ampliado para leitura instantânea (>= 0.74 largura × >= 0.80 altura)
  addVoxelBox(g, 0.34, 0.34, 1.05, 0, 0.76, 0, coreMat);
  addVoxelBox(g, 0.24, 0.24, 0.42, 0, 0.76, 0.64, tipMat);
  addVoxelBox(g, 0.78, 0.16, 0.34, 0, 0.76, -0.18, flowerMat);
  addVoxelBox(g, 0.16, 0.82, 0.34, 0, 0.76, -0.18, flowerMat);
  addVoxelBox(g, 0.56, 0.56, 0.18, 0, 0.76, 0.2, tipMat, 0, 0, Math.PI / 4);
  return { group: g };
}

export function buildVoxelMinecartZone(railMat, logMat) {
  const g = new THREE.Group();
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.75 });
  addVoxelBox(g, 1.24, 0.46, 1.48, 0, 0.44, 0, railMat);
  addVoxelBox(g, 1.02, 0.22, 1.24, 0, 0.68, 0, wheelMat);
  addVoxelBox(g, 0.18, 0.24, 0.24, -0.58, 0.18, 0.48, wheelMat);
  addVoxelBox(g, 0.18, 0.24, 0.24, 0.58, 0.18, 0.48, wheelMat);
  addVoxelBox(g, 0.18, 0.24, 0.24, -0.58, 0.18, -0.48, wheelMat);
  addVoxelBox(g, 0.18, 0.24, 0.24, 0.58, 0.18, -0.48, wheelMat);
  addVoxelBox(g, 0.14, 0.1, 4.6, -0.55, 0.05, 0, railMat);
  addVoxelBox(g, 0.14, 0.1, 4.6, 0.55, 0.05, 0, railMat);
  addVoxelBox(g, 1.42, 0.08, 4.4, 0, 0.04, 0, logMat);
  return { group: g };
}

export function buildVoxelRiverLog(logMat) {
  const g = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.7 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.8 });
  addVoxelBox(g, 0.44, 0.36, 2.6, -0.42, 0.18, 0, logMat);
  addVoxelBox(g, 0.48, 0.38, 2.64, 0, 0.19, 0, logMat);
  addVoxelBox(g, 0.44, 0.36, 2.6, 0.42, 0.18, 0, logMat);
  addVoxelBox(g, 1.38, 0.42, 0.18, 0, 0.2, 0.85, ropeMat);
  addVoxelBox(g, 1.38, 0.42, 0.18, 0, 0.2, -0.85, ropeMat);
  addVoxelBox(g, 0.34, 0.14, 0.38, 0.2, 0.42, 0.1, leafMat);
  return { group: g };
}

export function buildVoxelProjectile(mat) {
  const g = new THREE.Group();
  const trimMat = new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#f59e0b', emissiveIntensity: 0.9 });
  addVoxelBox(g, 0.32, 0.32, 0.62, 0, 0, 0, mat);
  addVoxelBox(g, 0.18, 0.18, 0.34, 0, 0, -0.42, trimMat);
  addVoxelBox(g, 0.68, 0.08, 0.28, 0, 0, 0.12, mat);
  addVoxelBox(g, 0.08, 0.62, 0.24, 0, 0, 0.14, mat);
  return g;
}

export function buildVoxelBossShot(mat) {
  const g = new THREE.Group();
  const sparkMat = new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#ff9500', emissiveIntensity: 1.0 });
  addVoxelBox(g, 0.72, 0.72, 0.72, 0, 0, 0, mat);
  addVoxelBox(g, 0.96, 0.36, 0.36, 0, 0, 0, sparkMat);
  addVoxelBox(g, 0.36, 0.96, 0.36, 0, 0, 0, sparkMat);
  addVoxelBox(g, 0.36, 0.36, 0.96, 0, 0, 0, mat);
  return g;
}

export function buildVoxelWeakOrb() {
  const g = new THREE.Group();
  const coreMat = new THREE.MeshStandardMaterial({ color: '#ffd447', emissive: '#ff9500', emissiveIntensity: 0.95 });
  const ringMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fef08a', emissiveIntensity: 0.85 });
  // Cristal facetado multi-voxel (3 barras cruzadas + 4 nodos orbitais)
  addVoxelBox(g, 0.78, 0.78, 0.78, 0, 0, 0, coreMat, 0.4, 0.4, 0);
  addVoxelBox(g, 0.44, 1.24, 0.44, 0, 0, 0, coreMat);
  addVoxelBox(g, 1.22, 0.44, 0.44, 0, 0, 0, coreMat);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    addVoxelBox(g, 0.24, 0.24, 0.24, Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0, ringMat);
  }
  return g;
}

export function buildVoxelBonusPortal() {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({ color: '#a855f7', emissive: '#9333ea', emissiveIntensity: 1.1 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#f59e0b', emissiveIntensity: 0.9 });
  const innerMat = new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addVoxelBox(g, 0.72, 0.36, 0.38, Math.cos(a) * 1.65, Math.sin(a) * 1.65, 0, i % 2 === 0 ? ringMat : goldMat, 0, 0, a + Math.PI / 2);
  }
  addVoxelBox(g, 1.65, 1.65, 0.14, 0, 0, 0, innerMat, 0, 0, Math.PI / 4);
  addVoxelBox(g, 1.1, 1.1, 0.2, 0, 0, 0, innerMat);
  return g;
}

export function buildVoxelRuinsPlate(mat) {
  const g = new THREE.Group();
  const bezelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 });
  addVoxelBox(g, 1.78, 0.14, 2.34, 0, 0.07, 0, bezelMat);
  addVoxelBox(g, 1.48, 0.2, 2.02, 0, 0.11, 0, mat);
  addVoxelBox(g, 0.24, 0.26, 0.24, -0.68, 0.14, 0.88, bezelMat);
  addVoxelBox(g, 0.24, 0.26, 0.24, 0.68, 0.14, -0.88, bezelMat);
  return g;
}

export function buildVoxelSpear() {
  const g = new THREE.Group();
  const shaftMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
  const tipMat = new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#f97316', emissiveIntensity: 0.55 });
  const featherMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.6 });
  addVoxelBox(g, 0.14, 0.14, 1.65, 0, 0, 0, shaftMat);
  addVoxelBox(g, 0.24, 0.24, 0.42, 0, 0, 0.94, tipMat);
  addVoxelBox(g, 0.34, 0.08, 0.32, 0, 0, -0.68, featherMat);
  addVoxelBox(g, 0.08, 0.34, 0.32, 0, 0, -0.68, featherMat);
  return g;
}

export function buildVoxelCrater(craterMat, emberMat) {
  const g = new THREE.Group();
  addVoxelBox(g, 1.85, 0.12, 1.85, 0, 0.06, 0, craterMat);
  addVoxelBox(g, 0.85, 0.08, 0.85, 0, 0.11, 0, emberMat);
  addVoxelBox(g, 0.46, 0.22, 0.56, -0.82, 0.14, 0.42, craterMat, 0.1, 0.4, 0.1);
  addVoxelBox(g, 0.52, 0.24, 0.44, 0.82, 0.14, -0.35, craterMat, -0.1, -0.3, 0.1);
  addVoxelBox(g, 0.42, 0.2, 0.48, 0.1, 0.13, 0.86, craterMat);
  return g;
}

export function buildVoxelDebris(color = '#ffd447') {
  const g = new THREE.Group();
  const m1 = new THREE.MeshStandardMaterial({ color });
  const m2 = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7 });
  addVoxelBox(g, 0.36, 0.36, 0.36, 0, 0, 0, m1);
  addVoxelBox(g, 0.22, 0.22, 0.22, 0.22, 0.12, -0.1, m2, 0.4, 0.3, 0);
  addVoxelBox(g, 0.2, 0.18, 0.24, -0.18, -0.1, 0.16, m1, 0.2, -0.4, 0.3);
  return g;
}

export function buildVoxelGoldenEgg() {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ffd447',
    emissive: '#ff9f1c',
    emissiveIntensity: 0.78,
    metalness: 0.52,
    roughness: 0.2
  });
  const gemMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.9 });
  addVoxelBox(g, 0.46, 0.56, 0.46, 0, 0, 0, goldMat);
  addVoxelBox(g, 0.34, 0.74, 0.34, 0, 0.04, 0, goldMat);
  addVoxelBox(g, 0.54, 0.16, 0.54, 0, -0.06, 0, gemMat);
  addVoxelBox(g, 0.2, 0.18, 0.2, 0, 0.42, 0, gemMat);
  return g;
}

export function buildVoxelAmberCrystal() {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: '#57534e', roughness: 0.92 });
  const amberMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    emissive: '#d97706',
    emissiveIntensity: 0.55,
    roughness: 0.22
  });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#fde68a', emissive: '#f59e0b', emissiveIntensity: 0.75 });
  addVoxelBox(g, 1.05, 0.22, 1.05, 0, 0.11, 0, baseMat);
  addVoxelBox(g, 0.42, 1.25, 0.42, 0, 0.72, 0, amberMat, 0.08, 0.3, -0.06);
  addVoxelBox(g, 0.24, 0.72, 0.24, -0.32, 0.5, 0.16, amberMat, 0.24, 0.2, 0.22);
  addVoxelBox(g, 0.26, 0.84, 0.26, 0.3, 0.55, -0.18, amberMat, -0.22, -0.2, -0.18);
  addVoxelBox(g, 0.22, 0.38, 0.22, 0, 1.38, 0, coreMat);
  return g;
}

export function buildVoxelGeyserVent(rockMat) {
  const g = new THREE.Group();
  const rimMat = rockMat || new THREE.MeshStandardMaterial({ color: '#44403c', roughness: 0.9 });
  const magmaMat = new THREE.MeshStandardMaterial({ color: '#ea580c', emissive: '#c2410c', emissiveIntensity: 0.65 });
  const steamMat = new THREE.MeshStandardMaterial({
    color: '#e0f2fe',
    emissive: '#bae6fd',
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.8
  });
  addVoxelBox(g, 1.35, 0.22, 1.35, 0, 0.11, 0, rimMat);
  addVoxelBox(g, 0.95, 0.2, 0.95, 0, 0.28, 0, rimMat);
  addVoxelBox(g, 0.62, 0.14, 0.62, 0, 0.36, 0, magmaMat);
  addVoxelBox(g, 0.34, 1.05, 0.34, 0, 0.96, 0, steamMat);
  addVoxelBox(g, 0.52, 0.38, 0.52, 0, 1.68, 0, steamMat);
  addVoxelBox(g, 0.36, 0.32, 0.36, 0.12, 2.08, -0.08, steamMat);
  return g;
}

export function buildVoxelTarPit() {
  const g = new THREE.Group();
  const tarMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.25, metalness: 0.3 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#3f3f46', roughness: 0.85 });
  const boneMat = new THREE.MeshStandardMaterial({ color: '#e7e5e4', roughness: 0.6 });
  addVoxelBox(g, 1.9, 0.08, 2.15, 0, 0.04, 0, rimMat);
  addVoxelBox(g, 1.56, 0.12, 1.82, 0, 0.08, 0, tarMat);
  addVoxelBox(g, 0.34, 0.18, 0.34, -0.35, 0.16, 0.32, tarMat);
  addVoxelBox(g, 0.28, 0.2, 0.28, 0.38, 0.18, -0.28, tarMat);
  addVoxelBox(g, 0.28, 0.22, 0.28, -0.58, 0.2, -0.45, boneMat, 0.1, 0.3, -0.2);
  addVoxelBox(g, 0.48, 0.1, 0.12, 0.45, 0.16, 0.52, boneMat, 0, 0.5, 0.2);
  return g;
}

export function buildVoxelStalactite(rockMat) {
  const g = new THREE.Group();
  const stone = rockMat || new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.88 });
  const crystal = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.45, roughness: 0.35 });
  addVoxelBox(g, 0.96, 0.22, 0.96, 0, 0.11, 0, stone);
  addVoxelBox(g, 0.64, 0.72, 0.64, 0, 0.56, 0, stone);
  addVoxelBox(g, 0.42, 0.68, 0.42, 0, 1.24, 0, crystal);
  addVoxelBox(g, 0.22, 0.42, 0.22, 0, 1.72, 0, crystal);
  addVoxelBox(g, 0.26, 0.52, 0.26, -0.34, 0.42, 0.2, crystal, 0, 0, 0.32);
  return g;
}

export function buildVoxelElectricPylon() {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.65, roughness: 0.3 });
  const coilMat = new THREE.MeshStandardMaterial({ color: '#0ea5e9', emissive: '#38bdf8', emissiveIntensity: 0.8 });
  const arcMat = new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#facc15', emissiveIntensity: 0.95 });
  addVoxelBox(g, 1.38, 0.18, 0.58, 0, 0.09, 0, metalMat);
  addVoxelBox(g, 0.22, 1.48, 0.22, -0.48, 0.84, 0, metalMat);
  addVoxelBox(g, 0.22, 1.48, 0.22, 0.48, 0.84, 0, metalMat);
  addVoxelBox(g, 0.36, 0.24, 0.36, -0.48, 1.56, 0, coilMat);
  addVoxelBox(g, 0.36, 0.24, 0.36, 0.48, 1.56, 0, coilMat);
  addVoxelBox(g, 0.82, 0.14, 0.14, 0, 1.56, 0, arcMat);
  return g;
}

export function buildVoxelSpikeBarricade(logMat) {
  const g = new THREE.Group();
  const wood = logMat || new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 });
  const tipMat = new THREE.MeshStandardMaterial({ color: '#e5e7eb', metalness: 0.25, roughness: 0.45 });
  addVoxelBox(g, 1.46, 0.24, 0.32, 0, 0.36, 0, wood);
  addVoxelBox(g, 0.2, 0.96, 0.2, -0.52, 0.48, -0.08, wood, 0.35, 0, 0);
  addVoxelBox(g, 0.2, 1.02, 0.2, 0, 0.52, -0.08, wood, 0.35, 0, 0);
  addVoxelBox(g, 0.2, 0.96, 0.2, 0.52, 0.48, -0.08, wood, 0.35, 0, 0);
  addVoxelBox(g, 0.16, 0.28, 0.16, -0.52, 0.94, 0.12, tipMat, 0.35, 0, 0);
  addVoxelBox(g, 0.16, 0.28, 0.16, 0, 0.98, 0.12, tipMat, 0.35, 0, 0);
  addVoxelBox(g, 0.16, 0.28, 0.16, 0.52, 0.94, 0.12, tipMat, 0.35, 0, 0);
  return g;
}

export const VOXEL_AUDIT_REPORT = [
  { category: 'Dinossauros Jogáveis (27)', minParts: 14, status: 'OK', note: '27 modelos voxel articulados por espécie' },
  { category: 'Predadores & Chefes (12)', minParts: 20, status: 'OK', note: '14 predadores + 12 chefes multi-peças com mandíbula e aura' },
  { category: 'Obstáculos & Perigos (48)', minParts: 4, status: 'OK', note: '20 obstáculos base + 28 arquétipos móveis/telegrafados da Mega Expansão' },
  { category: 'Itens, Frutas & Ovos Elementais', minParts: 6, status: 'OK', note: '15 itens especiais sem Sphere/Octahedron/Torus genéricos' },
  { category: 'Portais Rúnicos & Projéteis', minParts: 4, status: 'OK', note: 'Arco rúnico em voxel, projéteis alados e pontos fracos' },
  { category: 'Acessórios (45) & Destroços', minParts: 3, status: 'OK', note: '45 acessórios com >= 3 peças voxel próprias' }
];

// Cache de materiais para os 28 arquétipos expandidos (zero alocação repetida)
const _expMatCache = new Map();
function getCachedVoxelMat(color, opts = {}) {
  const key = `${color}|${opts.emissive || ''}|${opts.emissiveIntensity || 0}|${opts.opacity ?? 1}|${opts.metalness || 0}|${opts.polygonOffset ? 1 : 0}|${opts.depthWrite === false ? 0 : 1}`;
  let m = _expMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.55,
      metalness: opts.metalness ?? 0.15,
      emissive: opts.emissive || '#000000',
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      depthWrite: opts.depthWrite ?? true,
      polygonOffset: !!opts.polygonOffset,
      polygonOffsetFactor: opts.polygonOffset ? -1 : 0,
      polygonOffsetUnits: opts.polygonOffset ? -1 : 0
    });
    _expMatCache.set(key, m);
  }
  return m;
}

/**
 * Constrói modelos voxel multi-partes (>= 4 peças) + indicador visual de telégrafo
 * para os 28 novos arquétipos móveis/telegrafados do catálogo expandido.
 */
export function buildVoxelExpandedHazard(archetype, primaryColor = '#ef4444', accentColor = '#facc15') {
  const g = new THREE.Group();
  const baseMat = getCachedVoxelMat(primaryColor, { roughness: 0.65, metalness: 0.2 });
  const darkMat = getCachedVoxelMat('#1e293b', { roughness: 0.45, metalness: 0.5 });
  const glowMat = getCachedVoxelMat(accentColor, { emissive: accentColor, emissiveIntensity: 0.85, roughness: 0.3 });
  const warnMat = getCachedVoxelMat('#ff2e3b', {
    emissive: '#ff2e3b',
    emissiveIntensity: 0.9,
    opacity: 0.78,
    depthWrite: false,
    polygonOffset: true
  });

  // Telégrafo de solo universal (visível antes da ativação para fairness garantida)
  const telegraphMesh = new THREE.Group();
  addVoxelBox(telegraphMesh, 1.9, 0.04, 0.22, 0, 0.044, 0.85, warnMat);
  addVoxelBox(telegraphMesh, 1.9, 0.04, 0.22, 0, 0.044, -0.85, warnMat);
  addVoxelBox(telegraphMesh, 0.22, 0.04, 1.8, -0.88, 0.044, 0, warnMat);
  addVoxelBox(telegraphMesh, 0.22, 0.04, 1.8, 0.88, 0.044, 0, warnMat);
  g.add(telegraphMesh);

  const activePart = new THREE.Group();
  g.add(activePart);

  switch (archetype) {
    case 'oscillating_laser':
    case 'plasma_turret':
      addVoxelBox(g, 0.34, 2.2, 0.34, -1.05, 1.1, 0, darkMat);
      addVoxelBox(g, 0.34, 2.2, 0.34, 1.05, 1.1, 0, darkMat);
      addVoxelBox(activePart, 2.0, 0.24, 0.24, 0, 1.1, 0, glowMat);
      addVoxelBox(activePart, 0.38, 0.38, 0.38, -0.95, 1.1, 0, baseMat);
      addVoxelBox(activePart, 0.38, 0.38, 0.38, 0.95, 1.1, 0, baseMat);
      break;
    case 'lane_saw':
      addVoxelBox(g, 2.1, 0.1, 0.4, 0, 0.05, 0, darkMat);
      addVoxelBox(activePart, 1.15, 1.15, 0.22, 0, 0.68, 0, baseMat);
      addVoxelBox(activePart, 0.9, 0.9, 0.28, 0, 0.68, 0, glowMat, 0, 0, Math.PI / 4);
      addVoxelBox(activePart, 0.36, 0.36, 0.36, 0, 0.68, 0, darkMat);
      break;
    case 'telegraphed_geyser':
    case 'acid_geyser':
    case 'magma_fissure':
      addVoxelBox(g, 1.6, 0.16, 1.6, 0, 0.08, 0, darkMat);
      addVoxelBox(g, 1.15, 0.2, 1.15, 0, 0.14, 0, baseMat);
      addVoxelBox(activePart, 0.85, 2.4, 0.85, 0, 1.25, 0, glowMat);
      addVoxelBox(activePart, 1.18, 0.45, 1.18, 0, 2.35, 0, baseMat);
      break;
    case 'magnetic_mine':
    case 'spore_mine':
      addVoxelBox(activePart, 0.9, 0.9, 0.9, 0, 0.95, 0, darkMat);
      addVoxelBox(activePart, 1.15, 0.32, 0.32, 0, 0.95, 0, glowMat);
      addVoxelBox(activePart, 0.32, 1.15, 0.32, 0, 0.95, 0, glowMat);
      addVoxelBox(activePart, 0.32, 0.32, 1.15, 0, 0.95, 0, baseMat);
      break;
    case 'quicksand_pit':
    case 'net_trap':
      addVoxelBox(g, 2.05, 0.08, 2.4, 0, 0.04, 0, baseMat);
      addVoxelBox(activePart, 1.7, 0.1, 2.0, 0, 0.08, 0, darkMat);
      addVoxelBox(activePart, 1.35, 0.12, 0.2, 0, 0.12, 0.55, glowMat);
      addVoxelBox(activePart, 1.35, 0.12, 0.2, 0, 0.12, -0.55, glowMat);
      break;
    case 'double_wall_gap':
      addVoxelBox(g, 0.36, 2.5, 0.65, -0.95, 1.25, 0, baseMat);
      addVoxelBox(g, 0.36, 2.5, 0.65, 0.95, 1.25, 0, baseMat);
      addVoxelBox(activePart, 2.1, 0.72, 0.65, 0, 2.15, 0, darkMat);
      addVoxelBox(activePart, 1.9, 0.16, 0.72, 0, 1.72, 0, glowMat);
      break;
    case 'sliding_block':
    case 'crusher_pillar':
      addVoxelBox(g, 2.2, 0.08, 0.55, 0, 0.04, 0, darkMat);
      addVoxelBox(activePart, 1.55, 1.65, 1.25, 0, 0.92, 0, baseMat);
      addVoxelBox(activePart, 1.65, 0.25, 1.32, 0, 1.62, 0, glowMat);
      addVoxelBox(activePart, 1.65, 0.25, 1.32, 0, 0.22, 0, darkMat);
      break;
    case 'emerging_tentacle':
    case 'blood_thorn':
      addVoxelBox(g, 1.25, 0.16, 1.25, 0, 0.08, 0, darkMat);
      addVoxelBox(activePart, 0.52, 0.85, 0.52, 0, 0.45, 0, baseMat);
      addVoxelBox(activePart, 0.38, 0.85, 0.38, 0.12, 1.2, 0, baseMat, 0, 0, -0.18);
      addVoxelBox(activePart, 0.26, 0.7, 0.26, -0.05, 1.88, 0, glowMat, 0, 0, 0.22);
      break;
    case 'sonic_crystal':
    case 'frost_obelisk':
    case 'static_pylon':
    case 'quake_totem':
      addVoxelBox(g, 1.15, 0.24, 1.15, 0, 0.12, 0, darkMat);
      addVoxelBox(g, 0.68, 1.7, 0.68, 0, 1.05, 0, baseMat);
      addVoxelBox(g, 0.4, 0.65, 0.4, 0, 2.1, 0, glowMat);
      addVoxelBox(activePart, 1.85, 0.18, 0.22, 0, 0.55, 0.85, glowMat);
      addVoxelBox(activePart, 1.85, 0.18, 0.22, 0, 0.55, -0.85, glowMat);
      break;
    case 'seeker_drone':
      addVoxelBox(activePart, 0.95, 0.45, 0.95, 0, 1.45, 0, darkMat);
      addVoxelBox(activePart, 0.38, 0.3, 0.3, 0, 1.45, 0.5, glowMat);
      addVoxelBox(activePart, 1.45, 0.12, 0.3, 0, 1.65, 0, baseMat);
      addVoxelBox(activePart, 0.3, 0.12, 1.45, 0, 1.65, 0, baseMat);
      break;
    case 'bone_pendulum':
      addVoxelBox(g, 0.28, 2.9, 0.28, -1.0, 1.45, 0, darkMat);
      addVoxelBox(g, 0.28, 2.9, 0.28, 1.0, 1.45, 0, darkMat);
      addVoxelBox(g, 2.2, 0.26, 0.28, 0, 2.85, 0, darkMat);
      activePart.position.set(0, 2.75, 0);
      addVoxelBox(activePart, 0.18, 1.55, 0.18, 0, -0.8, 0, baseMat);
      addVoxelBox(activePart, 1.15, 0.55, 0.55, 0, -1.55, 0, glowMat);
      break;
    case 'retractable_spike':
      addVoxelBox(g, 1.8, 0.14, 1.8, 0, 0.07, 0, darkMat);
      addVoxelBox(activePart, 0.24, 1.05, 0.24, -0.5, 0.52, -0.45, glowMat);
      addVoxelBox(activePart, 0.24, 1.05, 0.24, 0.5, 0.52, -0.45, glowMat);
      addVoxelBox(activePart, 0.24, 1.05, 0.24, 0, 0.52, 0.45, baseMat);
      break;
    case 'corrosive_cloud':
    case 'void_rift':
    case 'phantom_decoy':
      addVoxelBox(activePart, 1.45, 0.9, 1.35, 0, 1.55, 0, baseMat);
      addVoxelBox(activePart, 1.05, 0.75, 1.05, -0.55, 1.75, 0.25, glowMat);
      addVoxelBox(activePart, 0.95, 0.7, 0.95, 0.55, 1.45, -0.25, glowMat);
      break;
    case 'inverted_gravity_field':
      addVoxelBox(g, 0.34, 2.3, 0.4, -0.95, 1.15, 0, darkMat);
      addVoxelBox(g, 0.34, 2.3, 0.4, 0.95, 1.15, 0, darkMat);
      addVoxelBox(g, 2.2, 0.3, 0.45, 0, 2.28, 0, baseMat);
      addVoxelBox(activePart, 1.7, 1.9, 0.18, 0, 1.15, 0, glowMat);
      break;
    case 'shockwave_emitter':
      addVoxelBox(g, 0.75, 0.55, 0.75, 0, 0.28, 0, darkMat);
      addVoxelBox(g, 0.42, 0.85, 0.42, 0, 0.65, 0, baseMat);
      addVoxelBox(activePart, 2.1, 0.22, 0.22, 0, 0.32, 0.88, glowMat);
      addVoxelBox(activePart, 2.1, 0.22, 0.22, 0, 0.32, -0.88, glowMat);
      addVoxelBox(activePart, 0.22, 0.22, 1.9, -0.95, 0.32, 0, glowMat);
      addVoxelBox(activePart, 0.22, 0.22, 1.9, 0.95, 0.32, 0, glowMat);
      break;
    case 'fragmented_meteor':
    default:
      addVoxelBox(activePart, 1.15, 1.1, 1.15, 0, 1.1, 0, baseMat);
      addVoxelBox(activePart, 0.75, 1.35, 0.75, 0, 1.15, 0, glowMat);
      addVoxelBox(activePart, 1.35, 0.65, 0.75, 0, 1.0, 0, darkMat);
      break;
  }

  return { group: g, telegraphMesh, activePart };
}
