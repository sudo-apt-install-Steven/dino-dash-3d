// Blocos modulares de pista (Seção 9): Zonas de Oásis, Pontes Quebradiças e Cruzamentos de Resgate.
import * as THREE from 'three';
import { addVoxelBox } from '../models/VoxelLibrary.js';
import { LANE_X } from './World.js';

export const CHUNKS_CATALOG = [
  { id: 'oasis_zone', name: 'Zona de Oásis', icon: '🌴', desc: 'Calmaria temporária, regenera estamina rápida e restaura +1 vida.' },
  { id: 'fragile_bridge', name: 'Ponte Quebradiça', icon: '🌉', desc: 'Tábua central racha sob o peso — passe pelas laterais seguras para bônus!' },
  { id: 'rescue_cross', name: 'Cruzamento de Resgate', icon: '🚨', desc: 'Sinalizador tático que revive aliados caídos ou recarrega escudo + estamina.' }
];

export function buildChunkOasis() {
  const g = new THREE.Group();
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#2dd4bf',
    emissive: '#0d9488',
    emissiveIntensity: 0.45,
    roughness: 0.2,
    transparent: true,
    opacity: 0.84,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const sandMat = new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.85 });
  const palmMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#15803d', emissiveIntensity: 0.25 });

  // Lago cristalino atravessando as 3 faixas (sem z-fighting com a areia ou pista)
  addVoxelBox(g, 5.6, 0.08, 3.2, 0, 0.04, 0, sandMat);
  const waterBox = addVoxelBox(g, 4.9, 0.08, 2.5, 0, 0.11, 0, waterMat);
  if (waterBox) waterBox.renderOrder = 2;

  // Palmeiras laterais simétricas com copa em voxel
  for (const sx of [-3.0, 3.0]) {
    addVoxelBox(g, 0.34, 2.2, 0.34, sx, 1.1, 0, palmMat);
    addVoxelBox(g, 1.4, 0.24, 0.48, sx, 2.25, 0, leafMat);
    addVoxelBox(g, 0.48, 0.24, 1.4, sx, 2.25, 0, leafMat);
    addVoxelBox(g, 0.36, 0.22, 0.36, sx, 2.45, 0, leafMat);
  }
  return g;
}

export function buildChunkFragileBridge() {
  const g = new THREE.Group();
  const safeWoodMat = new THREE.MeshStandardMaterial({ color: '#4ade80', emissive: '#16a34a', emissiveIntensity: 0.28, roughness: 0.6 });
  const weakWoodMat = new THREE.MeshStandardMaterial({ color: '#ea580c', emissive: '#9a3412', emissiveIntensity: 0.35, roughness: 0.8 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 });

  // Tábuas laterais seguras (Esquerda e Direita)
  for (const laneIdx of [0, 2]) {
    const lx = LANE_X[laneIdx];
    addVoxelBox(g, 1.68, 0.16, 2.8, lx, 0.08, 0, railMat);
    addVoxelBox(g, 1.48, 0.12, 0.72, lx, 0.18, -0.82, safeWoodMat);
    addVoxelBox(g, 1.48, 0.12, 0.72, lx, 0.18, 0, safeWoodMat);
    addVoxelBox(g, 1.48, 0.12, 0.72, lx, 0.18, 0.82, safeWoodMat);
  }

  // Tábua central rachada com inclinação de alerta
  addVoxelBox(g, 1.56, 0.12, 0.68, LANE_X[1], 0.16, -0.78, weakWoodMat, 0.05, 0.08, -0.04);
  addVoxelBox(g, 1.42, 0.12, 0.62, LANE_X[1] - 0.08, 0.12, 0.04, weakWoodMat, -0.08, -0.1, 0.06);
  addVoxelBox(g, 1.56, 0.12, 0.68, LANE_X[1], 0.16, 0.84, weakWoodMat, 0.04, 0.05, 0);
  addVoxelBox(g, 0.22, 0.9, 2.8, -3.0, 0.45, 0, railMat);
  addVoxelBox(g, 0.22, 0.9, 2.8, 3.0, 0.45, 0, railMat);
  return g;
}

export function buildChunkRescueCross() {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.35, roughness: 0.6 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.9
  });
  const crossMat = new THREE.MeshStandardMaterial({
    color: '#4ade80',
    emissive: '#22c55e',
    emissiveIntensity: 0.7
  });

  // Faixa sinalizada atravessando as 3 pistas + faróis laterais de resgate
  addVoxelBox(g, 5.8, 0.1, 1.65, 0, 0.05, 0, baseMat);
  addVoxelBox(g, 1.6, 0.14, 0.45, 0, 0.12, 0, crossMat);
  addVoxelBox(g, 0.45, 0.14, 1.4, 0, 0.12, 0, crossMat);
  for (const sx of [-2.95, 2.95]) {
    addVoxelBox(g, 0.36, 1.8, 0.36, sx, 0.9, 0, baseMat);
    addVoxelBox(g, 0.52, 0.48, 0.52, sx, 1.98, 0, beaconMat);
  }
  return g;
}
