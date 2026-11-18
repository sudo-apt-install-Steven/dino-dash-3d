// Auditoria & Redesenho Voxel Completo de TODOS os 5 Bosses de DINO DASH 3D.
// Nenhum boss é um cubo genérico: todos possuem anatomia articulada multi-parte,
// fases de dano visuais (rachaduras, aura de fúria), partes destrutíveis e animações procedurais.
import * as THREE from 'three';

const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);

function vox(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(SHARED_BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function pivotAt(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export const BOSS_AUDIT_REPORT = [
  { id: 'alpha_trex', name: 'T-Rex Alfa', title: 'Rei dos Predadores', status: 'Redesenho Prioritário Completo', details: 'Crânio com mandíbula articulada e presas, olhos brilhantes, cicatrizes, crista dorsal, braços curtos com garras, pernas fortes, cauda 3 segmentos, 4 partes destrutíveis (armadura/chifres/presas), aura de fúria, ondas de choque.' },
  { id: 'scorpion_king', name: 'Rei Escorpião', title: 'Soberano das Dunas', status: 'Redesenhado do Zero', details: 'Carapaça segmentada, coroa dourada com rubi, 6 pernas articuladas, 2 pinças gigantes com garras e cauda curva em 5 gomos com ferrão tóxico.' },
  { id: 'storm_eagle', name: 'Águia Tempestade', title: 'Senhora dos Ventos', status: 'Redesenhado do Zero', details: 'Corpo aerodinâmico, cabeça com crista branca e bico curvo dourado, asas duplas articuladas com penas elétricas, cauda em leque e garras de raio.' },
  { id: 'mother_ufo', name: 'Mãe OVNI', title: 'Nave-Mãe Extraterrestre', status: 'Redesenhado do Zero', details: 'Disco multi-camadas chanfrado, cúpula translúcida com núcleo reator pulsante, anel giratório com 6 luzes, torre de antena e 3 canhões inferiores destrutíveis.' },
  { id: 'plesiosaur', name: 'Plesiossauro Gigante', title: 'Leviatã Abissal', status: 'Redesenhado do Zero', details: 'Corpo hidrodinâmico bioluminescente, 4 nadadeiras em remo, pescoço sinuoso em 4 segmentos, cabeça com mandíbula denteada e placas dorsais destrutíveis.' },
  { id: 'swamp_hydra', name: 'Hidra do Pântano', title: 'Terror de Três Cabeças', status: 'Modelo Voxel Completo', details: '3 pescoços sinuosos articulados, mandíbulas venenosas, cauda pantanosa e regeneração de cabeça na Fase 2.' },
  { id: 'lava_golem', name: 'Golem de Magma', title: 'Titã da Caldeira', status: 'Modelo Voxel Completo', details: 'Tronco basáltico articulado, núcleo de magma pulsante, ombreiras de obsidiana e punhos sísmicos.' },
  { id: 'frost_mammoth', name: 'Mamute Glacial', title: 'Colosso da Tundra', status: 'Modelo Voxel Completo', details: 'Corpo peludo maciço, tromba articulada, presas curvas de marfim e sela de gelo eterno.' },
  { id: 'cave_spider', name: 'Aranha Cavernosa', title: 'Rainha das Sombras', status: 'Modelo Voxel Completo', details: '8 pernas articuladas, quelíceras venenosas, 6 olhos rubis e abdômen bioluminescente.' },
  { id: 'amber_scarab', name: 'Escaravelho de Âmbar', title: 'Guardião Dourado', status: 'Modelo Voxel Completo', details: 'Élitros articulados que abrem em voo, pinças frontais e gema solar incandescente.' },
  { id: 'crystal_wyrm', name: 'Serpe Cristalina', title: 'Dragão de Ametista', status: 'Modelo Voxel Completo', details: 'Asas prismáticas articuladas, crânio dracônico com chifres de quartzo e cauda espigada.' },
  { id: 'cyber_raptor', name: 'Raptor Cibernético [Mini-Boss]', title: 'Unidade Alfa-X', status: 'Modelo Voxel Completo', details: 'Exoesqueleto cromado, visor laser neon, propulsores a jato duplos e lâmina caudal.' },
  { id: 'leviathan_abyssal', name: 'Leviatã Abissal', title: 'Soberano das Fossas', status: 'Modelo Voxel Novo', details: 'Serpente abissal colossal, barbatanas peitorais gigantes, mandíbula luminosa e lanternas bioluminescentes.' },
  { id: 'mecha_titan', name: 'Titã Mecânico Ω', title: 'Colosso Cibernético', status: 'Modelo Voxel Novo', details: 'Blindagem estilo Transformers/Mecha-Godzilla, placas dorsais neon, canhões nos ombros e núcleo de fusão.' }
];

export function buildBossModel(bossId) {
  switch (bossId) {
    case 'alpha_trex':
      return buildAlphaTrex();
    case 'scorpion_king':
      return buildScorpionKing();
    case 'storm_eagle':
      return buildStormEagle();
    case 'mother_ufo':
      return buildMotherUfo();
    case 'plesiosaur':
      return buildPlesiosaur();
    case 'swamp_hydra':
      return buildSwampHydra();
    case 'lava_golem':
      return buildLavaGolem();
    case 'frost_mammoth':
      return buildFrostMammoth();
    case 'cave_spider':
      return buildCaveSpider();
    case 'amber_scarab':
      return buildAmberScarab();
    case 'crystal_wyrm':
      return buildCrystalWyrm();
    case 'cyber_raptor':
      return buildCyberRaptor();
    case 'leviathan_abyssal':
      return buildLeviathanAbyssal();
    case 'mecha_titan':
      return buildMechaTitan();
    default:
      return buildAlphaTrex();
  }
}

function createCommonState(root, parts, destructibles, rageMaterials = [], auraMesh = null) {
  const baseAuraOpacity = auraMesh?.material?.opacity ?? 0.38;

  const applyPhaseVisuals = (targetPhase, targetBroken) => {
    const clampedBroken = Math.max(0, Math.min(destructibles.length, targetBroken));
    for (let i = 0; i < destructibles.length; i++) {
      if (destructibles[i]) destructibles[i].visible = i >= clampedBroken;
    }

    for (const rm of rageMaterials) {
      if (!rm) continue;
      if (targetPhase === 1) rm.emissiveIntensity = 0.25;
      else if (targetPhase === 2) rm.emissiveIntensity = 1.05;
      else rm.emissiveIntensity = 1.85;
    }

    if (parts?.cracks) {
      for (const c of parts.cracks) {
        if (c) c.visible = targetPhase >= 2;
      }
    }

    if (auraMesh) {
      if (targetPhase === 1) {
        auraMesh.visible = false;
      } else if (targetPhase === 2) {
        auraMesh.visible = true;
        if (auraMesh.material) {
          auraMesh.material.transparent = true;
          auraMesh.material.opacity = baseAuraOpacity * 0.45;
        }
      } else {
        auraMesh.visible = true;
        if (auraMesh.material) {
          auraMesh.material.transparent = true;
          auraMesh.material.opacity = baseAuraOpacity;
        }
      }
    }
  };

  return {
    root,
    parts,
    destructibles,
    rageMaterials,
    auraMesh,
    animState: 'idle',
    animTimer: 0,
    brokenCount: 0,
    phase: 1,
    setPhase(phase) {
      const nextPhase = Math.max(1, Math.min(3, Math.round(Number(phase) || 1)));
      this.phase = nextPhase;
      const targetBroken = nextPhase === 1
        ? 0
        : (nextPhase === 2 ? Math.ceil(this.destructibles.length * 0.5) : this.destructibles.length);
      this.brokenCount = targetBroken;
      applyPhaseVisuals(nextPhase, targetBroken);
    },
    setPhaseVisuals(hpRatio) {
      const ratio = Math.max(0, Math.min(1, Number(hpRatio) ?? 1));
      this.phase = ratio <= 0.34 ? 3 : (ratio <= 0.67 ? 2 : 1);
      // Quebra partes destrutíveis conforme perde HP
      const targetBroken = Math.min(
        this.destructibles.length,
        Math.floor((1 - ratio) * (this.destructibles.length + 0.5))
      );
      this.brokenCount = Math.max(this.brokenCount, targetBroken);
      applyPhaseVisuals(this.phase, this.brokenCount);
    }
  };
}

// =========================================================================
// 1. T-REX ALFA — "REI DOS PREDADORES" (Prioridade Máxima)
// =========================================================================
function buildAlphaTrex() {
  const root = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.62 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: '#450a0a', roughness: 0.7 });
  const armorMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.65, roughness: 0.35 });
  const hornMat = new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#ca8a04', emissiveIntensity: 0.25 });
  const spikeMat = new THREE.MeshStandardMaterial({ color: '#fb923c', roughness: 0.4 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#ff2e2e', emissive: '#ff1e00', emissiveIntensity: 1.4 });
  const toothMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.25 });
  const scarMat = new THREE.MeshStandardMaterial({ color: '#fca5a5', emissive: '#ef4444', emissiveIntensity: 0.65 });
  const auraMat = new THREE.MeshBasicMaterial({ color: '#ff2e2e', wireframe: true, transparent: true, opacity: 0.38 });

  // Corpo & Peito
  const bodyPivot = pivotAt(root, 0, 2.2, 0);
  vox(bodyPivot, 2.3, 2.1, 3.0, 0, 0, 0, skinMat);
  vox(bodyPivot, 1.8, 0.55, 2.5, 0, -0.85, 0.1, bellyMat);
  // Costelas / cicatrizes luminosas da fase 2+
  const cracks = [
    vox(bodyPivot, 2.38, 0.18, 1.1, 0, 0.2, 0.2, scarMat),
    vox(bodyPivot, 2.38, 0.16, 0.9, 0, -0.25, -0.3, scarMat),
    vox(bodyPivot, 0.16, 1.1, 0.2, 1.16, 0.1, 0.4, scarMat)
  ];
  for (const c of cracks) c.visible = false;

  // Armadura peitoral/ombros (destrutível)
  const armorChest = pivotAt(bodyPivot, 0, 0.25, 0.7);
  vox(armorChest, 2.65, 1.35, 1.35, 0, 0, 0, armorMat);
  vox(armorChest, 0.45, 0.65, 0.45, -1.35, 0.65, 0, hornMat);
  vox(armorChest, 0.45, 0.65, 0.45, 1.35, 0.65, 0, hornMat);

  // Cristas dorsais
  for (let i = 0; i < 5; i++) {
    vox(bodyPivot, 0.34, 0.55 - i * 0.05, 0.42, 0, 1.25 - i * 0.05, 0.85 - i * 0.52, spikeMat);
  }

  // Cabeça maciça + Mandíbula articulada + Dentes + Cicatriz no focinho
  const headPivot = pivotAt(bodyPivot, 0, 1.15, 1.45);
  vox(headPivot, 1.85, 1.15, 2.1, 0, 0.25, 0.65, skinMat);
  vox(headPivot, 1.95, 0.22, 0.8, 0, 0.85, 0.1, armorMat); // coroa craniana
  // Olhos brilhantes
  vox(headPivot, 0.24, 0.28, 0.34, -0.88, 0.42, 0.72, eyeMat);
  vox(headPivot, 0.24, 0.28, 0.34, 0.88, 0.42, 0.72, eyeMat);
  // Cicatriz facial
  vox(headPivot, 0.16, 0.55, 0.14, 0.94, 0.22, 1.05, scarMat);
  // Chifres frontais (destrutíveis!)
  const hornL = vox(headPivot, 0.28, 0.85, 0.28, -0.68, 1.1, 0.25, hornMat);
  hornL.rotation.x = 0.25;
  const hornR = vox(headPivot, 0.28, 0.85, 0.28, 0.68, 1.1, 0.25, hornMat);
  hornR.rotation.x = 0.25;

  // Dentes superiores
  for (let t = -2; t <= 2; t++) {
    vox(headPivot, 0.14, 0.28, 0.14, t * 0.32, -0.34, 1.55, toothMat);
  }
  const jawGroup = pivotAt(headPivot, 0, -0.35, 0.1);
  vox(jawGroup, 1.55, 0.42, 1.8, 0, -0.1, 0.65, bellyMat);
  const fangCluster = pivotAt(jawGroup, 0, 0.12, 1.35);
  for (let t = -2; t <= 2; t++) {
    vox(fangCluster, 0.14, 0.24, 0.14, t * 0.28, 0.08, 0, toothMat);
  }

  // Braços curtos com garras
  const armL = pivotAt(bodyPivot, -1.25, -0.25, 1.05);
  vox(armL, 0.36, 0.85, 0.36, 0, -0.35, 0.25, skinMat);
  vox(armL, 0.12, 0.12, 0.35, -0.08, -0.78, 0.45, toothMat);
  vox(armL, 0.12, 0.12, 0.35, 0.08, -0.78, 0.45, toothMat);
  const armR = pivotAt(bodyPivot, 1.25, -0.25, 1.05);
  vox(armR, 0.36, 0.85, 0.36, 0, -0.35, 0.25, skinMat);
  vox(armR, 0.12, 0.12, 0.35, -0.08, -0.78, 0.45, toothMat);
  vox(armR, 0.12, 0.12, 0.35, 0.08, -0.78, 0.45, toothMat);

  // Pernas fortes
  const legL = pivotAt(root, -0.82, 1.65, -0.15);
  vox(legL, 0.72, 1.15, 0.9, 0, -0.5, 0, skinMat);
  vox(legL, 0.62, 0.85, 0.65, 0, -1.25, -0.1, bellyMat);
  vox(legL, 0.82, 0.32, 1.15, 0, -1.58, 0.25, armorMat);
  const legR = pivotAt(root, 0.82, 1.65, -0.15);
  vox(legR, 0.72, 1.15, 0.9, 0, -0.5, 0, skinMat);
  vox(legR, 0.62, 0.85, 0.65, 0, -1.25, -0.1, bellyMat);
  vox(legR, 0.82, 0.32, 1.15, 0, -1.58, 0.25, armorMat);

  // Cauda 3 segmentos articulada
  const tail1 = pivotAt(bodyPivot, 0, 0.05, -1.55);
  vox(tail1, 1.35, 1.15, 1.4, 0, 0, -0.65, skinMat);
  vox(tail1, 0.28, 0.45, 0.36, 0, 0.72, -0.65, spikeMat);
  const tail2 = pivotAt(tail1, 0, -0.05, -1.35);
  vox(tail2, 0.95, 0.82, 1.35, 0, 0, -0.65, skinMat);
  vox(tail2, 0.22, 0.38, 0.32, 0, 0.52, -0.65, spikeMat);
  const tail3 = pivotAt(tail2, 0, -0.05, -1.3);
  vox(tail3, 0.55, 0.5, 1.25, 0, 0, -0.6, spikeMat);

  // Aura de Fúria (Fase 3)
  const auraMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.4, 5.2), auraMat);
  auraMesh.position.set(0, 2.2, 0.2);
  auraMesh.visible = false;
  root.add(auraMesh);

  const state = createCommonState(
    root,
    { bodyPivot, headPivot, jawGroup, armL, armR, legL, legR, tail1, tail2, tail3, cracks },
    [armorChest, hornL, hornR, fangCluster],
    [scarMat, eyeMat],
    auraMesh
  );

  state.updateAnimation = (t, dt, animName) => {
    const agg = state.phase >= 2 ? 1.35 : 1.0;
    legL.rotation.x = Math.sin(t * 5.2 * agg) * 0.45;
    legR.rotation.x = -Math.sin(t * 5.2 * agg) * 0.45;
    bodyPivot.position.y = 2.2 + Math.abs(Math.cos(t * 5.2 * agg)) * 0.18;
    armL.rotation.x = -0.35 + Math.sin(t * 6) * 0.2;
    armR.rotation.x = -0.35 - Math.sin(t * 6) * 0.2;

    tail1.rotation.y = Math.sin(t * 3.5 * agg) * 0.25;
    tail2.rotation.y = Math.sin(t * 3.5 * agg - 0.8) * 0.32;
    tail3.rotation.y = Math.sin(t * 3.5 * agg - 1.5) * 0.4;

    if (animName === 'roar') {
      jawGroup.rotation.x = 0.55 + Math.sin(t * 28) * 0.08;
      headPivot.rotation.x = -0.32;
    } else if (animName === 'bite') {
      headPivot.rotation.x = 0.38;
      jawGroup.rotation.x = 0.45 * Math.abs(Math.sin(t * 16));
    } else if (animName === 'tail_sweep') {
      tail1.rotation.y = Math.sin(t * 12) * 0.75;
      tail2.rotation.y = Math.sin(t * 12) * 0.65;
    } else {
      jawGroup.rotation.x = 0.12 + Math.sin(t * 3) * 0.06;
      headPivot.rotation.x = Math.sin(t * 2.4) * 0.08;
    }
    if (auraMesh.visible) {
      auraMesh.scale.setScalar(1 + Math.sin(t * 9) * 0.06);
      auraMesh.rotation.y += dt * 1.4;
    }
  };
  return state;
}

// =========================================================================
// 2. REI ESCORPIÃO — "SOBERANO DAS DUNAS"
// =========================================================================
function buildScorpionKing() {
  const root = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.45 });
  const darkShell = new THREE.MeshStandardMaterial({ color: '#450a0a', roughness: 0.55 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#d97706', emissiveIntensity: 0.45 });
  const venomMat = new THREE.MeshStandardMaterial({ color: '#a3e635', emissive: '#65a30d', emissiveIntensity: 1.0 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', emissive: '#e11d48', emissiveIntensity: 1.3 });
  const auraMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', wireframe: true, transparent: true, opacity: 0.32 });

  const body = pivotAt(root, 0, 1.3, 0);
  vox(body, 2.6, 1.05, 3.1, 0, 0, 0, shellMat);
  vox(body, 2.9, 0.35, 1.4, 0, 0.45, 0.35, darkShell);
  const backPlate = vox(body, 2.4, 0.4, 1.8, 0, 0.72, -0.2, darkShell);

  // Cabeça + Coroa Dourada (destrutível) + 4 olhos
  vox(body, 1.5, 0.75, 1.1, 0, 0.1, 1.65, darkShell);
  vox(body, 0.22, 0.22, 0.22, -0.45, 0.3, 2.15, eyeMat);
  vox(body, 0.22, 0.22, 0.22, 0.45, 0.3, 2.15, eyeMat);
  vox(body, 0.14, 0.14, 0.14, -0.2, 0.35, 2.18, eyeMat);
  vox(body, 0.14, 0.14, 0.14, 0.2, 0.35, 2.18, eyeMat);
  const crown = pivotAt(body, 0, 0.65, 1.5);
  vox(crown, 1.3, 0.4, 0.9, 0, 0, 0, goldMat);
  vox(crown, 0.24, 0.55, 0.24, -0.45, 0.32, 0, goldMat);
  vox(crown, 0.3, 0.7, 0.3, 0, 0.4, 0, eyeMat);
  vox(crown, 0.24, 0.55, 0.24, 0.45, 0.32, 0, goldMat);

  // 2 Pinças gigantes
  const armL = pivotAt(body, -1.5, 0.05, 1.2);
  vox(armL, 0.55, 0.55, 1.4, -0.35, 0, 0.6, darkShell);
  const clawArmorL = vox(armL, 0.95, 0.72, 1.15, -0.55, 0.05, 1.65, shellMat);
  vox(armL, 0.3, 0.25, 0.75, -0.3, 0.15, 2.4, goldMat);
  vox(armL, 0.3, 0.25, 0.75, -0.8, -0.1, 2.4, goldMat);

  const armR = pivotAt(body, 1.5, 0.05, 1.2);
  vox(armR, 0.55, 0.55, 1.4, 0.35, 0, 0.6, darkShell);
  const clawArmorR = vox(armR, 0.95, 0.72, 1.15, 0.55, 0.05, 1.65, shellMat);
  vox(armR, 0.3, 0.25, 0.75, 0.3, 0.15, 2.4, goldMat);
  vox(armR, 0.3, 0.25, 0.75, 0.8, -0.1, 2.4, goldMat);

  // 6 Pernas articuladas
  const legs = [];
  for (let side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const leg = pivotAt(body, side * 1.35, -0.2, 0.85 - i * 0.95);
      vox(leg, 1.1, 0.28, 0.28, side * 0.55, 0.15, 0, darkShell);
      vox(leg, 0.28, 1.05, 0.28, side * 1.05, -0.42, 0, shellMat);
      legs.push({ leg, side, i });
    }
  }

  // Cauda em 5 gomos curvando sobre o corpo
  const tailSegs = [];
  let prev = body;
  const poses = [
    [0, 0.55, -1.55],
    [0, 0.85, -0.55],
    [0, 0.95, 0.1],
    [0, 0.75, 0.65],
    [0, 0.45, 0.85]
  ];
  for (let s = 0; s < poses.length; s++) {
    const seg = pivotAt(prev, poses[s][0], poses[s][1], poses[s][2]);
    const sz = 0.85 - s * 0.08;
    vox(seg, sz, sz, 0.85, 0, 0, 0, s === 4 ? darkShell : shellMat);
    if (s === 4) {
      vox(seg, 0.35, 0.35, 0.95, 0, -0.1, 0.75, venomMat);
    }
    tailSegs.push(seg);
    prev = seg;
  }

  const cracks = [vox(body, 2.7, 0.22, 1.2, 0, 0.35, -0.2, venomMat)];
  cracks[0].visible = false;
  const auraMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.2, 5.2), auraMat);
  auraMesh.position.y = 2.0;
  auraMesh.visible = false;
  root.add(auraMesh);

  const state = createCommonState(
    root,
    { body, armL, armR, legs, tailSegs, cracks },
    [crown, backPlate, clawArmorL, clawArmorR],
    [goldMat, venomMat],
    auraMesh
  );
  state.updateAnimation = (t, dt, animName) => {
    for (const { leg, side, i } of legs) {
      leg.rotation.y = Math.sin(t * 9 + i * 1.3) * 0.28 * side;
      leg.rotation.z = Math.cos(t * 9 + i * 1.3) * 0.18;
    }
    armL.rotation.y = Math.sin(t * 4) * 0.2;
    armR.rotation.y = -Math.sin(t * 4) * 0.2;
    const strike = animName === 'roar' || animName === 'bite' ? 0.38 : Math.sin(t * 3.5) * 0.12;
    for (let s = 0; s < tailSegs.length; s++) {
      tailSegs[s].rotation.x = s === 0 ? strike : strike * 0.4;
    }
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.8;
  };
  return state;
}

// =========================================================================
// 3. ÁGUIA TEMPESTADE — "SENHORA DOS VENTOS"
// =========================================================================
function buildStormEagle() {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.45 });
  const crestMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
  const beakMat = new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#eab308', emissiveIntensity: 0.45 });
  const boltMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 1.25 });
  const auraMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', wireframe: true, transparent: true, opacity: 0.35 });

  const body = pivotAt(root, 0, 2.5, 0);
  vox(body, 1.8, 1.35, 2.7, 0, 0, 0, bodyMat);
  vox(body, 1.5, 0.45, 2.0, 0, -0.55, 0.1, crestMat);

  // Cabeça com crista e bico curvo
  const head = pivotAt(body, 0, 0.75, 1.45);
  vox(head, 1.15, 1.0, 1.2, 0, 0, 0, crestMat);
  vox(head, 0.25, 0.45, 0.75, 0, 0.65, -0.25, boltMat); // penacho
  vox(head, 0.22, 0.22, 0.26, -0.52, 0.12, 0.25, boltMat);
  vox(head, 0.22, 0.22, 0.26, 0.52, 0.12, 0.25, boltMat);
  vox(head, 0.48, 0.42, 0.85, 0, -0.05, 0.85, beakMat);
  vox(head, 0.34, 0.38, 0.28, 0, -0.28, 1.18, beakMat); // ponta curva

  // Cauda em leque
  const tailFan = pivotAt(body, 0, 0.1, -1.4);
  for (let i = -2; i <= 2; i++) {
    const feather = vox(tailFan, 0.42, 0.14, 1.6, i * 0.36, 0, -0.75, Math.abs(i) % 2 === 0 ? bodyMat : crestMat);
    feather.rotation.y = i * -0.18;
  }

  // Asas multi-articuladas com pontas de raio (destrutíveis)
  const wingLIn = pivotAt(body, -0.9, 0.35, 0.15);
  vox(wingLIn, 2.3, 0.24, 1.35, -1.15, 0, -0.1, bodyMat);
  const wingLOut = pivotAt(wingLIn, -2.2, 0, -0.05);
  vox(wingLOut, 2.1, 0.18, 1.05, -1.0, 0, -0.15, crestMat);
  const tipL = vox(wingLOut, 0.8, 0.16, 0.7, -2.15, 0, -0.25, boltMat);

  const wingRIn = pivotAt(body, 0.9, 0.35, 0.15);
  vox(wingRIn, 2.3, 0.24, 1.35, 1.15, 0, -0.1, bodyMat);
  const wingROut = pivotAt(wingRIn, 2.2, 0, -0.05);
  vox(wingROut, 2.1, 0.18, 1.05, 1.0, 0, -0.15, crestMat);
  const tipR = vox(wingROut, 0.8, 0.16, 0.7, 2.15, 0, -0.25, boltMat);

  // Garras de relâmpago (destrutíveis armadura)
  const talonL = vox(body, 0.45, 0.95, 0.55, -0.6, -1.0, 0.3, boltMat);
  const talonR = vox(body, 0.45, 0.95, 0.55, 0.6, -1.0, 0.3, boltMat);

  const cracks = [vox(body, 1.9, 0.22, 1.4, 0, 0.1, 0, boltMat)];
  cracks[0].visible = false;
  const auraMesh = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.8, 4.4), auraMat);
  auraMesh.position.y = 2.5;
  auraMesh.visible = false;
  root.add(auraMesh);

  const state = createCommonState(
    root,
    { body, head, wingLIn, wingLOut, wingRIn, wingROut, tailFan, cracks },
    [tipL, tipR, talonL, talonR],
    [boltMat, beakMat],
    auraMesh
  );
  state.updateAnimation = (t, dt, animName) => {
    const flapSpeed = animName === 'roar' || state.phase >= 2 ? 9.5 : 6.2;
    const flap = Math.sin(t * flapSpeed);
    wingLIn.rotation.z = flap * 0.45;
    wingRIn.rotation.z = -flap * 0.45;
    wingLOut.rotation.z = Math.sin(t * flapSpeed - 0.7) * 0.5;
    wingROut.rotation.z = -Math.sin(t * flapSpeed - 0.7) * 0.5;
    body.position.y = 2.5 - flap * 0.22;
    tailFan.rotation.x = Math.cos(t * 4) * 0.15;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 2.0;
  };
  return state;
}

// =========================================================================
// 4. MÃE OVNI — "NAVE-MÃE EXTRATERRESTRE"
// =========================================================================
function buildMotherUfo() {
  const root = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.78, roughness: 0.22 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#a855f7', emissive: '#7e22ce', emissiveIntensity: 0.65 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.6, transparent: true, opacity: 0.78 });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#4ade80', emissive: '#22c55e', emissiveIntensity: 1.4 });
  const auraMat = new THREE.MeshBasicMaterial({ color: '#a855f7', wireframe: true, transparent: true, opacity: 0.35 });

  const ship = pivotAt(root, 0, 2.6, 0);
  // Camadas do disco
  vox(ship, 5.4, 0.55, 5.4, 0, 0, 0, hullMat);
  vox(ship, 6.2, 0.25, 3.2, 0, 0.05, 0, hullMat);
  vox(ship, 3.2, 0.25, 6.2, 0, 0.05, 0, hullMat);
  vox(ship, 4.0, 0.5, 4.0, 0, -0.45, 0, hullMat);

  // Anel giratório com luzes
  const spinRing = pivotAt(ship, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    vox(spinRing, 0.45, 0.38, 0.45, Math.cos(a) * 2.9, 0.1, Math.sin(a) * 2.9, i % 2 === 0 ? coreMat : rimMat);
  }

  // Cúpula translúcida + Núcleo reator + Antena
  vox(ship, 1.2, 1.15, 1.2, 0, 0.85, 0, coreMat);
  const shieldDome = vox(ship, 2.4, 1.35, 2.4, 0, 0.9, 0, glassMat);
  vox(ship, 0.22, 1.1, 0.22, 0, 2.0, 0, hullMat);
  vox(ship, 0.45, 0.45, 0.45, 0, 2.6, 0, coreMat);

  // 3 Canhões inferiores destrutíveis
  const podL = vox(ship, 0.85, 0.75, 0.85, -1.9, -0.75, 0.8, rimMat);
  const podC = vox(ship, 1.15, 0.85, 1.15, 0, -0.85, -1.4, rimMat);
  const podR = vox(ship, 0.85, 0.75, 0.85, 1.9, -0.75, 0.8, rimMat);

  const cracks = [vox(ship, 4.5, 0.22, 4.5, 0, -0.15, 0, coreMat)];
  cracks[0].visible = false;
  const auraMesh = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.6, 6.8), auraMat);
  auraMesh.position.y = 2.6;
  auraMesh.visible = false;
  root.add(auraMesh);

  const state = createCommonState(
    root,
    { ship, spinRing, cracks },
    [podL, podR, podC, shieldDome],
    [coreMat, rimMat],
    auraMesh
  );
  state.updateAnimation = (t, dt) => {
    spinRing.rotation.y += dt * (state.phase >= 2 ? 3.8 : 2.1);
    ship.position.y = 2.6 + Math.sin(t * 3.2) * 0.3;
    ship.rotation.z = Math.sin(t * 1.9) * 0.08;
    if (auraMesh.visible) auraMesh.rotation.y -= dt * 1.6;
  };
  return state;
}

// =========================================================================
// 5. PLESIOSSAURO GIGANTE — "LEVIATÃ ABISSAL"
// =========================================================================
function buildPlesiosaur() {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.35 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.45 });
  const finMat = new THREE.MeshStandardMaterial({ color: '#0ea5e9', emissive: '#0284c7', emissiveIntensity: 0.45 });
  const glowMat = new THREE.MeshStandardMaterial({ color: '#2dd4bf', emissive: '#14b8a6', emissiveIntensity: 1.1 });
  const toothMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const auraMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', wireframe: true, transparent: true, opacity: 0.32 });

  const body = pivotAt(root, 0, 1.7, 0);
  vox(body, 2.5, 1.4, 3.8, 0, 0, 0, bodyMat);
  vox(body, 2.1, 0.45, 3.2, 0, -0.65, 0, bellyMat);
  const crest1 = vox(body, 0.32, 0.7, 1.4, 0, 0.95, 0.3, glowMat);
  const crest2 = vox(body, 0.28, 0.65, 1.2, 0, 0.9, -1.1, glowMat);

  // 4 Nadadeiras longas
  const fl = pivotAt(body, -1.25, -0.25, 1.0);
  vox(fl, 2.1, 0.18, 0.85, -1.0, 0, -0.1, finMat);
  const fr = pivotAt(body, 1.25, -0.25, 1.0);
  vox(fr, 2.1, 0.18, 0.85, 1.0, 0, -0.1, finMat);
  const bl = pivotAt(body, -1.1, -0.25, -1.2);
  vox(bl, 1.75, 0.16, 0.72, -0.85, 0, -0.1, finMat);
  const br = pivotAt(body, 1.1, -0.25, -1.2);
  vox(br, 1.75, 0.16, 0.72, 0.85, 0, -0.1, finMat);

  // Pescoço sinuoso em 4 segmentos + cabeça com mandíbula e chifre
  const neckSegs = [];
  let nParent = body;
  for (let i = 0; i < 4; i++) {
    const n = pivotAt(nParent, 0, i === 0 ? 0.55 : 0.75, i === 0 ? 1.85 : 0.45);
    vox(n, 0.85 - i * 0.08, 0.95, 0.85 - i * 0.08, 0, 0.35, 0.15, bodyMat);
    vox(n, 0.22, 0.22, 0.22, -0.42, 0.35, 0.15, glowMat);
    vox(n, 0.22, 0.22, 0.22, 0.42, 0.35, 0.15, glowMat);
    neckSegs.push(n);
    nParent = n;
  }
  const head = pivotAt(nParent, 0, 0.75, 0.4);
  vox(head, 1.1, 0.65, 1.45, 0, 0.1, 0.4, bodyMat);
  const hornTop = vox(head, 0.28, 0.7, 0.45, 0, 0.65, 0.1, glowMat);
  vox(head, 0.18, 0.2, 0.22, -0.52, 0.2, 0.5, glowMat);
  vox(head, 0.18, 0.2, 0.22, 0.52, 0.2, 0.5, glowMat);
  const jaw = pivotAt(head, 0, -0.22, 0.1);
  vox(jaw, 0.95, 0.28, 1.25, 0, -0.05, 0.4, bellyMat);
  vox(jaw, 0.12, 0.18, 0.12, -0.28, 0.1, 0.92, toothMat);
  vox(jaw, 0.12, 0.18, 0.12, 0.28, 0.1, 0.92, toothMat);

  // Cauda leme
  const tail = pivotAt(body, 0, 0, -1.95);
  vox(tail, 0.75, 0.7, 1.75, 0, 0, -0.8, bodyMat);
  const tailFin = vox(tail, 0.2, 1.15, 1.1, 0, 0.2, -1.7, finMat);

  const cracks = [vox(body, 2.55, 0.22, 1.6, 0, 0.2, 0, glowMat)];
  cracks[0].visible = false;
  const auraMesh = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.8, 6.2), auraMat);
  auraMesh.position.y = 2.4;
  auraMesh.visible = false;
  root.add(auraMesh);

  const state = createCommonState(
    root,
    { body, neckSegs, head, jaw, fl, fr, bl, br, tail, cracks },
    [crest1, crest2, hornTop, tailFin],
    [glowMat, finMat],
    auraMesh
  );
  state.updateAnimation = (t, dt, animName) => {
    const row = Math.sin(t * 4.5);
    fl.rotation.z = row * 0.42;
    fr.rotation.z = -row * 0.42;
    bl.rotation.z = -row * 0.35;
    br.rotation.z = row * 0.35;
    for (let i = 0; i < neckSegs.length; i++) {
      neckSegs[i].rotation.x = Math.sin(t * 3.2 - i * 0.6) * 0.14;
      neckSegs[i].rotation.y = Math.cos(t * 2.1 - i * 0.5) * 0.12;
    }
    jaw.rotation.x = animName === 'roar' || animName === 'bite' ? 0.48 : 0.08 + Math.sin(t * 3) * 0.05;
    tail.rotation.y = Math.sin(t * 4) * 0.28;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.5;
  };
  return state;
}

function makeStandardAura(root, color, sx, sy, sz) {
  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.34 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.y = sy * 0.5;
  mesh.visible = false;
  root.add(mesh);
  return mesh;
}

function buildSwampHydra() {
  const root = new THREE.Group();
  const scaleMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.5 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: '#bef264', roughness: 0.55 });
  const toxicMat = new THREE.MeshStandardMaterial({ color: '#a3e635', emissive: '#65a30d', emissiveIntensity: 0.9 });
  const toothMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const body = pivotAt(root, 0, 1.85, 0);
  vox(body, 2.8, 1.5, 3.2, 0, 0, 0, scaleMat);
  vox(body, 2.3, 0.45, 2.8, 0, -0.68, 0, bellyMat);
  for (let s = -1; s <= 1; s += 2) {
    vox(body, 0.8, 1.2, 0.85, s * 1.35, -0.85, 0.7, scaleMat);
    vox(body, 0.8, 1.2, 0.85, s * 1.35, -0.85, -0.7, scaleMat);
  }
  const heads = [];
  const destructibles = [];
  [-1.25, 0, 1.25].forEach((hx, idx) => {
    const neck = pivotAt(body, hx, 0.75, 1.2);
    vox(neck, 0.65, 1.45, 0.65, 0, 0.72, 0.25, scaleMat);
    vox(neck, 0.52, 1.1, 0.3, 0, 0.68, 0.48, bellyMat);
    const skull = pivotAt(neck, 0, 1.5, 0.45);
    vox(skull, 0.95, 0.62, 1.25, 0, 0.1, 0.35, scaleMat);
    vox(skull, 0.18, 0.18, 0.2, -0.46, 0.22, 0.5, toxicMat);
    vox(skull, 0.18, 0.18, 0.2, 0.46, 0.22, 0.5, toxicMat);
    const crest = vox(skull, 0.24, 0.45, 0.75, 0, 0.52, 0.05, toxicMat);
    const jaw = pivotAt(skull, 0, -0.18, 0.15);
    vox(jaw, 0.82, 0.24, 1.05, 0, -0.05, 0.35, bellyMat);
    vox(jaw, 0.12, 0.2, 0.12, -0.25, 0.12, 0.78, toothMat);
    vox(jaw, 0.12, 0.2, 0.12, 0.25, 0.12, 0.78, toothMat);
    heads.push({ neck, skull, jaw, phase: idx * 1.4 });
    destructibles.push(crest);
  });
  const tail = pivotAt(body, 0, 0, -1.65);
  vox(tail, 0.9, 0.8, 1.8, 0, 0, -0.85, scaleMat);
  vox(tail, 0.45, 0.5, 1.2, 0, 0.1, -2.0, toxicMat);
  const auraMesh = makeStandardAura(root, '#84cc16', 5.2, 4.6, 5.4);
  const state = createCommonState(root, { body, heads, tail, cracks: [] }, destructibles, [toxicMat], auraMesh);
  state.updateAnimation = (t, dt, animName) => {
    heads.forEach((h) => {
      h.neck.rotation.x = Math.sin(t * 3.5 + h.phase) * 0.22;
      h.neck.rotation.z = Math.cos(t * 2.4 + h.phase) * 0.14;
      h.jaw.rotation.x = animName === 'roar' || animName === 'bite' ? 0.55 : 0.1 + Math.sin(t * 4 + h.phase) * 0.08;
    });
    tail.rotation.y = Math.sin(t * 3.8) * 0.32;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.6;
  };
  return state;
}

function buildLavaGolem() {
  const root = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.85 });
  const magmaMat = new THREE.MeshStandardMaterial({ color: '#ff5e1a', emissive: '#ff4500', emissiveIntensity: 1.15 });
  const obsidianMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.35 });
  const body = pivotAt(root, 0, 2.35, 0);
  vox(body, 3.1, 2.1, 1.9, 0, 0, 0, stoneMat);
  vox(body, 2.4, 0.55, 2.02, 0, 0.65, 0, obsidianMat);
  vox(body, 2.1, 0.5, 1.98, 0, -0.65, 0, obsidianMat);
  const core = vox(body, 1.4, 1.1, 2.08, 0, 0.05, 0.08, magmaMat);
  // Espinhos de caldeira nas costas
  for (let i = -1; i <= 1; i++) {
    vox(body, 0.48, 0.95, 0.48, i * 0.85, 1.25, -0.58, obsidianMat);
    vox(body, 0.32, 0.45, 0.32, i * 0.85, 1.82, -0.58, magmaMat);
  }
  const sL = vox(body, 1.15, 0.95, 1.25, -2.0, 0.7, 0, magmaMat);
  const sR = vox(body, 1.15, 0.95, 1.25, 2.0, 0.7, 0, magmaMat);
  const head = pivotAt(body, 0, 1.25, 0.15);
  vox(head, 1.25, 1.05, 1.25, 0, 0.45, 0, stoneMat);
  vox(head, 0.28, 0.62, 0.28, -0.52, 1.08, 0, obsidianMat);
  vox(head, 0.28, 0.62, 0.28, 0.52, 1.08, 0, obsidianMat);
  vox(head, 0.35, 0.2, 0.25, -0.32, 0.5, 0.6, magmaMat);
  vox(head, 0.35, 0.2, 0.25, 0.32, 0.5, 0.6, magmaMat);
  vox(head, 0.85, 0.22, 0.32, 0, 0.1, 0.58, magmaMat);
  const armL = pivotAt(body, -2.0, 0.3, 0);
  vox(armL, 0.95, 1.85, 0.95, -0.1, -0.85, 0, stoneMat);
  vox(armL, 1.15, 0.9, 1.15, -0.1, -1.75, 0.15, magmaMat);
  vox(armL, 0.28, 0.35, 0.45, -0.45, -2.1, 0.55, obsidianMat);
  vox(armL, 0.28, 0.35, 0.45, 0.25, -2.1, 0.55, obsidianMat);
  const armR = pivotAt(body, 2.0, 0.3, 0);
  vox(armR, 0.95, 1.85, 0.95, 0.1, -0.85, 0, stoneMat);
  vox(armR, 1.15, 0.9, 1.15, 0.1, -1.75, 0.15, magmaMat);
  vox(armR, 0.28, 0.35, 0.45, -0.25, -2.1, 0.55, obsidianMat);
  vox(armR, 0.28, 0.35, 0.45, 0.45, -2.1, 0.55, obsidianMat);
  vox(body, 1.05, 1.45, 1.05, -0.9, -1.65, 0, stoneMat);
  vox(body, 1.05, 1.45, 1.05, 0.9, -1.65, 0, stoneMat);
  vox(body, 1.18, 0.45, 1.25, -0.9, -2.25, 0.18, obsidianMat);
  vox(body, 1.18, 0.45, 1.25, 0.9, -2.25, 0.18, obsidianMat);
  const auraMesh = makeStandardAura(root, '#f97316', 5.8, 5.0, 4.2);
  const state = createCommonState(root, { body, head, armL, armR, core, cracks: [] }, [sL, sR], [magmaMat], auraMesh);
  state.updateAnimation = (t, dt, animName) => {
    const slam = animName === 'bite' || animName === 'roar' ? -0.75 : Math.sin(t * 4) * 0.28;
    armL.rotation.x = slam;
    armR.rotation.x = animName === 'roar' ? slam : -slam;
    body.position.y = 2.35 + Math.abs(Math.sin(t * 3.5)) * 0.18;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.5;
  };
  return state;
}

function buildFrostMammoth() {
  const root = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.9 });
  const iceMat = new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#0ea5e9', emissiveIntensity: 0.6 });
  const ivoryMat = new THREE.MeshStandardMaterial({ color: '#fef9c3', roughness: 0.3 });
  const body = pivotAt(root, 0, 2.0, 0);
  vox(body, 2.8, 2.1, 3.4, 0, 0, 0, furMat);
  vox(body, 2.5, 0.85, 2.6, 0, 0.95, 0.2, furMat);
  const iceSaddle = vox(body, 1.8, 0.55, 2.0, 0, 1.38, -0.2, iceMat);
  // Cristais glaciais na sela dorsal
  for (let i = -1; i <= 1; i++) {
    vox(body, 0.36, 0.72, 0.36, i * 0.58, 1.82, -0.25, iceMat);
  }
  const head = pivotAt(body, 0, 0.45, 1.85);
  vox(head, 1.5, 1.4, 1.4, 0, 0.2, 0.35, furMat);
  vox(head, 1.05, 0.65, 1.05, 0, 1.02, 0.25, furMat);
  vox(head, 0.22, 0.92, 0.68, -0.88, 0.22, -0.15, furMat);
  vox(head, 0.22, 0.92, 0.68, 0.88, 0.22, -0.15, furMat);
  vox(head, 0.24, 0.22, 0.22, -0.7, 0.35, 0.65, iceMat);
  vox(head, 0.24, 0.22, 0.22, 0.7, 0.35, 0.65, iceMat);
  const trunk = pivotAt(head, 0, -0.1, 1.05);
  vox(trunk, 0.42, 1.25, 0.42, 0, -0.5, 0.22, furMat);
  vox(trunk, 0.34, 0.45, 0.55, 0, -1.1, 0.45, furMat);
  vox(trunk, 0.28, 0.28, 0.34, 0, -1.25, 0.68, iceMat);
  const tuskL = vox(head, 0.24, 0.24, 1.25, -0.62, -0.35, 1.05, ivoryMat);
  vox(head, 0.2, 0.65, 0.24, -0.62, -0.1, 1.75, ivoryMat);
  const tuskR = vox(head, 0.24, 0.24, 1.25, 0.62, -0.35, 1.05, ivoryMat);
  vox(head, 0.2, 0.65, 0.24, 0.62, -0.1, 1.75, ivoryMat);
  [[-0.95, 1.0], [0.95, 1.0], [-0.95, -1.0], [0.95, -1.0]].forEach(([lx, lz]) => {
    vox(body, 0.78, 1.55, 0.78, lx, -1.25, lz, furMat);
    vox(body, 0.86, 0.32, 0.86, lx, -1.92, lz, ivoryMat);
  });
  vox(body, 0.26, 0.78, 0.26, 0, -0.1, -1.85, furMat);
  const auraMesh = makeStandardAura(root, '#38bdf8', 5.2, 4.8, 5.8);
  const state = createCommonState(root, { body, head, trunk, cracks: [] }, [tuskL, tuskR, iceSaddle], [iceMat], auraMesh);
  state.updateAnimation = (t, dt, animName) => {
    trunk.rotation.x = animName === 'roar' ? -0.9 : Math.sin(t * 4) * 0.28;
    body.position.y = 2.0 + Math.abs(Math.sin(t * 5)) * 0.14;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.4;
  };
  return state;
}

function buildCaveSpider() {
  const root = new THREE.Group();
  const chMat = new THREE.MeshStandardMaterial({ color: '#1e1b4b', roughness: 0.55 });
  const venomMat = new THREE.MeshStandardMaterial({ color: '#a3e635', emissive: '#65a30d', emissiveIntensity: 0.9 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', emissive: '#e11d48', emissiveIntensity: 1.1 });
  const body = pivotAt(root, 0, 1.65, 0);
  vox(body, 1.7, 1.1, 1.8, 0, 0, 0.5, chMat);
  const abdomen = vox(body, 2.4, 1.7, 2.4, 0, 0.45, -1.35, chMat);
  const sack = vox(body, 1.5, 0.85, 1.5, 0, 0.95, -1.35, venomMat);
  for (let i = -1; i <= 1; i++) {
    vox(body, 0.2, 0.2, 0.2, i * 0.35, 0.25, 1.42, eyeMat);
    vox(body, 0.14, 0.14, 0.14, i * 0.28, 0.48, 1.4, eyeMat);
  }
  const fangL = vox(body, 0.22, 0.55, 0.42, -0.35, -0.35, 1.55, venomMat);
  const fangR = vox(body, 0.22, 0.55, 0.42, 0.35, -0.35, 1.55, venomMat);
  const legs = [];
  for (let side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const lp = pivotAt(body, side * 0.85, -0.1, 0.8 - i * 0.52);
      vox(lp, 1.45, 0.26, 0.28, side * 0.72, 0.35, 0, chMat);
      vox(lp, 0.28, 1.45, 0.28, side * 1.4, -0.35, 0, chMat);
      legs.push({ pivot: lp, side, idx: i });
    }
  }
  const auraMesh = makeStandardAura(root, '#84cc16', 5.6, 4.0, 5.6);
  const state = createCommonState(root, { body, legs, abdomen, cracks: [] }, [sack, fangL, fangR], [venomMat, eyeMat], auraMesh);
  state.updateAnimation = (t, dt) => {
    legs.forEach((l) => {
      l.pivot.rotation.y = Math.sin(t * 9 + l.idx * 1.3) * 0.22 * l.side;
      l.pivot.rotation.z = Math.cos(t * 9 + l.idx * 1.3) * 0.14;
    });
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.5;
  };
  return state;
}

function buildAmberScarab() {
  const root = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.65, roughness: 0.25 });
  const gemMat = new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#f59e0b', emissiveIntensity: 1.0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.5 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#dc2626', emissiveIntensity: 1.0 });
  const wingInnerMat = new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#eab308', emissiveIntensity: 0.45, transparent: true, opacity: 0.72 });
  const body = pivotAt(root, 0, 1.85, 0);
  vox(body, 2.5, 1.25, 3.2, 0, 0, 0, darkMat);
  vox(body, 2.05, 0.55, 1.15, 0, 0.48, 1.15, goldMat);
  vox(body, 1.35, 0.75, 0.9, 0, 0.05, 1.65, darkMat);
  vox(body, 0.24, 0.24, 0.28, -0.46, 0.2, 1.98, eyeMat);
  vox(body, 0.24, 0.24, 0.28, 0.46, 0.2, 1.98, eyeMat);
  vox(body, 1.6, 0.28, 0.45, 0, -0.1, -1.78, goldMat);
  const shellL = pivotAt(body, -0.1, 0.65, 0.4);
  vox(shellL, 1.25, 0.42, 2.8, -0.65, 0.1, -0.65, goldMat);
  vox(shellL, 0.9, 0.2, 2.2, -0.65, 0.34, -0.65, darkMat);
  vox(shellL, 1.05, 0.08, 2.5, -0.62, -0.12, -0.65, wingInnerMat);
  const shellR = pivotAt(body, 0.1, 0.65, 0.4);
  vox(shellR, 1.25, 0.42, 2.8, 0.65, 0.1, -0.65, goldMat);
  vox(shellR, 0.9, 0.2, 2.2, 0.65, 0.34, -0.65, darkMat);
  vox(shellR, 1.05, 0.08, 2.5, 0.62, -0.12, -0.65, wingInnerMat);
  const solarGem = vox(body, 0.95, 0.75, 0.95, 0, 0.78, 0.3, gemMat);
  const hornL = vox(body, 0.26, 0.3, 1.2, -0.52, 0.1, 1.85, goldMat);
  vox(body, 0.22, 0.38, 0.45, -0.34, 0.22, 2.48, gemMat);
  const hornR = vox(body, 0.26, 0.3, 1.2, 0.52, 0.1, 1.85, goldMat);
  vox(body, 0.22, 0.38, 0.45, 0.34, 0.22, 2.48, gemMat);
  for (let side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      vox(body, 0.95, 0.24, 0.28, side * 1.45, -0.45, 0.85 - i * 0.85, goldMat);
      vox(body, 0.22, 0.55, 0.24, side * 1.85, -0.78, 0.85 - i * 0.85, darkMat);
    }
  }
  const auraMesh = makeStandardAura(root, '#facc15', 5.2, 4.0, 5.4);
  const state = createCommonState(root, { body, shellL, shellR, cracks: [] }, [solarGem, hornL, hornR], [gemMat], auraMesh);
  state.updateAnimation = (t, dt, animName) => {
    const open = animName === 'roar' ? 0.55 : 0.18 + Math.sin(t * 7) * 0.12;
    shellL.rotation.z = open;
    shellR.rotation.z = -open;
    body.position.y = 1.85 + Math.sin(t * 4) * 0.22;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.6;
  };
  return state;
}

function buildCrystalWyrm() {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#6d28d9', roughness: 0.3, metalness: 0.4 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: '#4c1d95', roughness: 0.45 });
  const crysMat = new THREE.MeshStandardMaterial({ color: '#c084fc', emissive: '#9333ea', emissiveIntensity: 0.95 });
  const toothMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.25 });
  const body = pivotAt(root, 0, 2.4, 0);
  vox(body, 1.8, 1.25, 3.4, 0, 0, 0, bodyMat);
  vox(body, 1.45, 0.38, 2.9, 0, -0.68, 0, bellyMat);
  for (let i = 0; i < 4; i++) {
    vox(body, 0.26, 0.58 + (i % 2) * 0.24, 0.42, 0, 0.88, 1.15 - i * 0.78, crysMat);
  }
  const neck = pivotAt(body, 0, 0.38, 1.65);
  vox(neck, 0.95, 0.85, 0.95, 0, 0.2, 0.32, bodyMat);
  const head = pivotAt(neck, 0, 0.32, 0.95);
  vox(head, 1.25, 0.72, 1.45, 0, 0.18, 0.45, bodyMat);
  const jaw = pivotAt(head, 0, -0.25, 0.35);
  vox(jaw, 1.05, 0.28, 1.25, 0, -0.08, 0.45, bellyMat);
  vox(jaw, 0.14, 0.22, 0.14, -0.35, 0.1, 0.92, toothMat);
  vox(jaw, 0.14, 0.22, 0.14, 0.35, 0.1, 0.92, toothMat);
  vox(head, 0.2, 0.18, 0.22, -0.56, 0.34, 0.82, crysMat);
  vox(head, 0.2, 0.18, 0.22, 0.56, 0.34, 0.82, crysMat);
  const horn1 = vox(head, 0.24, 0.85, 0.35, -0.42, 0.75, -0.1, crysMat);
  const horn2 = vox(head, 0.24, 0.85, 0.35, 0.42, 0.75, -0.1, crysMat);
  const wingL = pivotAt(body, -0.9, 0.4, 0.3);
  vox(wingL, 2.8, 0.16, 1.5, -1.45, 0.25, -0.15, crysMat);
  vox(wingL, 2.6, 0.26, 0.28, -1.35, 0.38, 0.48, bodyMat);
  vox(wingL, 0.32, 0.18, 1.65, -2.55, 0.22, -0.25, bellyMat);
  const wingR = pivotAt(body, 0.9, 0.4, 0.3);
  vox(wingR, 2.8, 0.16, 1.5, 1.45, 0.25, -0.15, crysMat);
  vox(wingR, 2.6, 0.26, 0.28, 1.35, 0.38, 0.48, bodyMat);
  vox(wingR, 0.32, 0.18, 1.65, 2.55, 0.22, -0.25, bellyMat);
  const tail = pivotAt(body, 0, 0, -1.75);
  vox(tail, 0.95, 0.85, 1.6, 0, 0, -0.75, bodyMat);
  vox(tail, 0.62, 0.58, 1.25, 0, 0.08, -1.95, bellyMat);
  const tailSpike = vox(tail, 0.35, 0.95, 0.95, 0, 0.45, -2.4, crysMat);
  vox(tail, 0.95, 0.22, 0.48, 0, 0.1, -2.55, crysMat);
  const auraMesh = makeStandardAura(root, '#c084fc', 6.8, 4.4, 5.8);
  const state = createCommonState(root, { body, head, wingL, wingR, tail, jaw, cracks: [] }, [horn1, horn2, tailSpike], [crysMat], auraMesh);
  state.updateAnimation = (t, dt, animName) => {
    const f = Math.sin(t * 6.5) * 0.42;
    wingL.rotation.z = f;
    wingR.rotation.z = -f;
    jaw.rotation.x = animName === 'roar' || animName === 'bite' ? 0.48 : 0.08 + Math.sin(t * 4) * 0.06;
    tail.rotation.y = Math.sin(t * 4) * 0.35;
    body.position.y = 2.4 + Math.sin(t * 3.2) * 0.3;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.6;
  };
  return state;
}

function buildCyberRaptor() {
  const root = new THREE.Group();
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.2 });
  const darkAlloyMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.7, roughness: 0.35 });
  const neonMat = new THREE.MeshStandardMaterial({ color: '#00f5d4', emissive: '#06b6d4', emissiveIntensity: 1.1 });
  const body = pivotAt(root, 0, 1.9, 0);
  vox(body, 1.75, 1.35, 2.9, 0, 0, 0, chromeMat);
  vox(body, 1.35, 0.65, 1.9, 0, 0.2, 0.55, darkAlloyMat);
  vox(body, 0.72, 0.72, 0.36, 0, 0.1, 1.48, neonMat);
  for (let i = 0; i < 4; i++) {
    vox(body, 0.18, 0.45, 0.38, 0, 0.88, 0.9 - i * 0.65, neonMat);
  }
  const jetL = vox(body, 0.55, 0.85, 1.15, -1.08, 0.35, -0.3, neonMat);
  vox(body, 0.62, 0.42, 0.78, -1.08, 0.68, -0.25, darkAlloyMat);
  const jetR = vox(body, 0.55, 0.85, 1.15, 1.08, 0.35, -0.3, neonMat);
  vox(body, 0.62, 0.42, 0.78, 1.08, 0.68, -0.25, darkAlloyMat);
  const head = pivotAt(body, 0, 0.85, 1.45);
  vox(head, 1.15, 0.75, 1.55, 0, 0.25, 0.45, chromeMat);
  vox(head, 0.95, 0.28, 1.3, 0, -0.22, 0.48, darkAlloyMat);
  vox(head, 0.12, 0.18, 0.14, -0.34, -0.02, 1.02, neonMat);
  vox(head, 0.12, 0.18, 0.14, 0.34, -0.02, 1.02, neonMat);
  const visor = vox(head, 1.24, 0.26, 0.72, 0, 0.32, 0.82, neonMat);
  // Braços cibernéticos com garras
  vox(body, 0.34, 0.72, 0.34, -0.82, -0.15, 1.15, darkAlloyMat);
  vox(body, 0.42, 0.22, 0.48, -0.82, -0.45, 1.45, neonMat);
  vox(body, 0.34, 0.72, 0.34, 0.82, -0.15, 1.15, darkAlloyMat);
  vox(body, 0.42, 0.22, 0.48, 0.82, -0.45, 1.45, neonMat);
  const legL = pivotAt(body, -0.78, -0.45, 0.1);
  vox(legL, 0.52, 1.45, 0.62, 0, -0.7, 0, chromeMat);
  vox(legL, 0.62, 0.28, 0.92, 0, -1.35, 0.25, darkAlloyMat);
  const legR = pivotAt(body, 0.78, -0.45, 0.1);
  vox(legR, 0.52, 1.45, 0.62, 0, -0.7, 0, chromeMat);
  vox(legR, 0.62, 0.28, 0.92, 0, -1.35, 0.25, darkAlloyMat);
  const tail = pivotAt(body, 0, 0.15, -1.5);
  vox(tail, 0.48, 0.45, 2.2, 0, 0, -1.05, chromeMat);
  vox(tail, 0.18, 0.75, 1.2, 0, 0.22, -2.15, neonMat);
  const auraMesh = makeStandardAura(root, '#22d3ee', 4.6, 4.2, 5.2);
  const state = createCommonState(root, { body, head, legL, legR, tail, cracks: [] }, [jetL, jetR, visor], [neonMat], auraMesh);
  state.updateAnimation = (t, dt) => {
    const stride = Math.sin(t * 10);
    legL.rotation.x = stride * 0.48;
    legR.rotation.x = -stride * 0.48;
    tail.rotation.y = Math.sin(t * 6) * 0.25;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.8;
  };
  return state;
}

function buildLeviathanAbyssal() {
  const root = new THREE.Group();
  const deepMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.45 });
  const scaleMat = new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.25, metalness: 0.35 });
  const bioMat = new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#06b6d4', emissiveIntensity: 1.25 });
  const fangMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 });

  const body = pivotAt(root, 0, 2.2, 0);
  vox(body, 2.3, 1.5, 3.6, 0, 0, 0, deepMat);
  vox(body, 1.8, 0.45, 3.0, 0, -0.78, 0, scaleMat);
  for (let i = 0; i < 4; i++) {
    vox(body, 0.24, 0.72 + (i % 2) * 0.28, 0.55, 0, 1.0, 1.2 - i * 0.85, bioMat);
  }
  const head = pivotAt(body, 0, 0.45, 1.9);
  vox(head, 1.85, 1.05, 2.0, 0, 0.3, 0.65, deepMat);
  const jaw = pivotAt(head, 0, -0.35, 0.5);
  vox(jaw, 1.55, 0.38, 1.75, 0, -0.1, 0.65, scaleMat);
  vox(jaw, 0.16, 0.32, 0.16, -0.48, 0.16, 1.35, fangMat);
  vox(jaw, 0.16, 0.32, 0.16, 0.48, 0.16, 1.35, fangMat);
  const lure = vox(head, 0.42, 0.42, 0.42, 0, 1.1, 1.55, bioMat);
  vox(head, 0.26, 0.26, 0.26, -0.75, 0.42, 1.25, bioMat);
  vox(head, 0.26, 0.26, 0.26, 0.75, 0.42, 1.25, bioMat);

  const finL = pivotAt(body, -1.25, -0.25, 0.5);
  vox(finL, 2.2, 0.18, 1.25, -1.1, 0, -0.15, scaleMat);
  vox(finL, 1.8, 0.12, 0.35, -0.95, 0.08, 0.42, bioMat);
  const finR = pivotAt(body, 1.25, -0.25, 0.5);
  vox(finR, 2.2, 0.18, 1.25, 1.1, 0, -0.15, scaleMat);
  vox(finR, 1.8, 0.12, 0.35, 0.95, 0.08, 0.42, bioMat);

  const tail = pivotAt(body, 0, 0, -2.0);
  vox(tail, 1.2, 1.0, 2.2, 0, 0, -1.0, deepMat);
  const tailFluke = vox(tail, 2.1, 0.22, 1.1, 0, 0, -2.3, bioMat);

  const auraMesh = makeStandardAura(root, '#06b6d4', 6.4, 4.2, 5.8);
  const state = createCommonState(root, { body, head, jaw, finL, finR, tail, cracks: [] }, [lure, tailFluke], [bioMat], auraMesh);
  state.updateAnimation = (t, dt, animName) => {
    const flap = Math.sin(t * 4.5) * 0.38;
    finL.rotation.z = flap;
    finR.rotation.z = -flap;
    jaw.rotation.x = animName === 'roar' || animName === 'bite' ? 0.55 : 0.12 + Math.sin(t * 3.5) * 0.06;
    tail.rotation.y = Math.sin(t * 5.0) * 0.38;
    body.position.y = 2.2 + Math.sin(t * 2.8) * 0.26;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 1.4;
  };
  return state;
}

function buildMechaTitan() {
  const root = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.85, roughness: 0.22 });
  const darkFrame = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.72, roughness: 0.38 });
  const plasmaMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', emissive: '#e11d48', emissiveIntensity: 1.2 });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 1.3 });

  const body = pivotAt(root, 0, 2.55, 0);
  vox(body, 2.45, 2.1, 2.25, 0, 0, 0, armorMat);
  vox(body, 1.75, 1.15, 0.35, 0, 0.25, 1.18, darkFrame);
  const core = vox(body, 0.92, 0.92, 0.42, 0, 0.25, 1.32, coreMat);
  for (let i = 0; i < 4; i++) {
    vox(body, 0.32, 0.85, 0.52, -0.52, 1.25 - i * 0.25, -0.95, plasmaMat);
    vox(body, 0.32, 0.85, 0.52, 0.52, 1.25 - i * 0.25, -0.95, plasmaMat);
  }
  const head = pivotAt(body, 0, 1.45, 0.85);
  vox(head, 1.35, 1.05, 1.55, 0, 0.2, 0.35, armorMat);
  const visor = vox(head, 1.42, 0.28, 0.75, 0, 0.32, 0.85, plasmaMat);
  vox(head, 0.24, 0.72, 0.28, -0.58, 0.78, 0.1, coreMat);
  vox(head, 0.24, 0.72, 0.28, 0.58, 0.78, 0.1, coreMat);

  const cannonL = pivotAt(body, -1.65, 0.85, 0.3);
  vox(cannonL, 0.95, 0.95, 2.1, 0, 0, 0.55, darkFrame);
  vox(cannonL, 0.55, 0.55, 0.45, 0, 0, 1.65, plasmaMat);
  const cannonR = pivotAt(body, 1.65, 0.85, 0.3);
  vox(cannonR, 0.95, 0.95, 2.1, 0, 0, 0.55, darkFrame);
  vox(cannonR, 0.55, 0.55, 0.45, 0, 0, 1.65, plasmaMat);

  const legL = pivotAt(body, -0.92, -1.05, 0);
  vox(legL, 0.82, 1.65, 0.92, 0, -0.82, 0, armorMat);
  vox(legL, 0.98, 0.38, 1.35, 0, -1.55, 0.28, darkFrame);
  const legR = pivotAt(body, 0.92, -1.05, 0);
  vox(legR, 0.82, 1.65, 0.92, 0, -0.82, 0, armorMat);
  vox(legR, 0.98, 0.38, 1.35, 0, -1.55, 0.28, darkFrame);

  const tail = pivotAt(body, 0, -0.55, -1.2);
  vox(tail, 0.78, 0.72, 2.8, 0, 0, -1.25, armorMat);
  vox(tail, 0.35, 0.55, 2.4, 0, 0.35, -1.25, coreMat);

  const auraMesh = makeStandardAura(root, '#f43f5e', 5.8, 4.8, 5.4);
  const state = createCommonState(root, { body, head, cannonL, cannonR, legL, legR, tail, cracks: [] }, [cannonL, cannonR, visor, core], [plasmaMat, coreMat], auraMesh);
  state.updateAnimation = (t, dt) => {
    const stride = Math.sin(t * 7.5);
    legL.rotation.x = stride * 0.42;
    legR.rotation.x = -stride * 0.42;
    cannonL.rotation.x = Math.sin(t * 4.2) * 0.12;
    cannonR.rotation.x = -Math.sin(t * 4.2) * 0.12;
    tail.rotation.y = Math.sin(t * 5) * 0.25;
    if (auraMesh.visible) auraMesh.rotation.y += dt * 2.0;
  };
  return state;
}
