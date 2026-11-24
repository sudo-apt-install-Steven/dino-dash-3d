// Armas Dinossauro Esculpidas para Arena X1 & RPG (Parte 6 & Parte 8.1).
// Conecta-se diretamente aos pontos anatômicos do DinoAnchors.js sem usar formas geométricas cruas.
import * as THREE from 'three';

const BOX = new THREE.BoxGeometry(1, 1, 1);
function vox(g, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

export const DINO_WEAPONS_CATALOG = Object.freeze({
  iron_claws: {
    id: 'iron_claws',
    name: 'Garras de Ferro Meteórico',
    anchorKey: 'limbs',
    damageMult: 1.14,
    speedMult: 1.08,
    reachBonus: 0.35,
    guardBreak: 0.15,
    description: 'Manoplas forjadas com três lâminas curvas de aço escuro que aceleram combos leves e médios.'
  },
  crystal_fangs: {
    id: 'crystal_fangs',
    name: 'Presas de Cristal Arcano',
    anchorKey: 'face',
    damageMult: 1.18,
    speedMult: 1.0,
    reachBonus: 0.25,
    guardBreak: 0.28,
    description: 'Presas gêmeas de quartzo energizado que amplificam mordidas e drenam vigor da guarda rival.'
  },
  club_tail: {
    id: 'club_tail',
    name: 'Maça Caudal de Obsidiana',
    anchorKey: 'tail',
    damageMult: 1.24,
    speedMult: 0.92,
    reachBonus: 0.65,
    guardBreak: 0.42,
    description: 'Clava segmentada cravada de espinhos vulcânicos para varreduras pesadas de longo alcance.'
  },
  legendary_horns: {
    id: 'legendary_horns',
    name: 'Chifres Lendários Solares',
    anchorKey: 'head',
    damageMult: 1.2,
    speedMult: 0.97,
    reachBonus: 0.5,
    guardBreak: 0.36,
    description: 'Par de chifres dourados entalhados que transformam investidas e cabeçadas em lançadores aéreos.'
  }
});

export function buildSculptedDinoWeapon(weaponId = 'iron_claws') {
  const spec = DINO_WEAPONS_CATALOG[weaponId] || DINO_WEAPONS_CATALOG.iron_claws;
  const g = new THREE.Group();
  g.name = `dino_weapon_${spec.id}`;
  g.userData.weaponSpec = spec;

  if (spec.id === 'iron_claws') {
    const steel = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.88, roughness: 0.22 });
    const strap = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.45, roughness: 0.5 });
    for (const sx of [-0.42, 0.42]) {
      vox(g, 0.2, 0.14, 0.22, sx, 0, -0.18, strap);
      for (const cx of [-0.06, 0, 0.06]) {
        vox(g, 0.04, 0.07, 0.28, sx + cx, -0.04, -0.38, steel);
        vox(g, 0.03, 0.05, 0.16, sx + cx, -0.09, -0.54, steel);
      }
    }
  } else if (spec.id === 'crystal_fangs') {
    const cry = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.72, roughness: 0.15, metalness: 0.25 });
    const mount = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.85, roughness: 0.24 });
    for (const sx of [-0.22, 0.22]) {
      vox(g, 0.1, 0.08, 0.12, sx, -0.04, 0.04, mount);
      vox(g, 0.08, 0.24, 0.09, sx, -0.18, 0.02, cry);
      vox(g, 0.05, 0.16, 0.06, sx, -0.34, -0.02, cry);
    }
  } else if (spec.id === 'club_tail') {
    const obs = new THREE.MeshStandardMaterial({ color: '#1c1917', metalness: 0.45, roughness: 0.42 });
    const lava = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ea580c', emissiveIntensity: 0.8 });
    vox(g, 0.34, 0.28, 0.48, 0, 0, 0.28, obs);
    vox(g, 0.52, 0.36, 0.44, 0, 0.02, 0.64, obs);
    for (const sx of [-0.32, 0.32]) {
      vox(g, 0.18, 0.14, 0.16, sx, 0.04, 0.64, lava);
    }
    vox(g, 0.16, 0.22, 0.18, 0, 0.26, 0.64, lava);
  } else {
    const gold = new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#b45309', emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.18 });
    for (const sx of [-0.26, 0.26]) {
      vox(g, 0.14, 0.14, 0.24, sx, 0.04, -0.1, gold);
      vox(g, 0.11, 0.18, 0.34, sx * 1.15, 0.14, -0.34, gold);
      vox(g, 0.08, 0.18, 0.28, sx * 1.25, 0.26, -0.56, gold);
    }
  }
  return g;
}

export function attachWeaponToDinoModel(dinoModel, weaponId) {
  if (!dinoModel || !weaponId || weaponId === 'none') return null;
  const weaponGroup = buildSculptedDinoWeapon(weaponId);
  const spec = weaponGroup.userData.weaponSpec;
  const anchor = dinoModel.anchors?.[spec.anchorKey];
  const parent = spec.anchorKey === 'head' || spec.anchorKey === 'face'
    ? dinoModel.headGroup
    : dinoModel.torso;
  if (anchor?.position) {
    weaponGroup.position.set(...anchor.position);
  }
  parent?.add(weaponGroup);
  return weaponGroup;
}
