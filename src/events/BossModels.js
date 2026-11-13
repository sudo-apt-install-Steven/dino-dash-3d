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
  { id: 'plesiosaur', name: 'Plesiossauro Gigante', title: 'Leviatã Abissal', status: 'Redesenhado do Zero', details: 'Corpo hidrodinâmico bioluminescente, 4 nadadeiras em remo, pescoço sinuoso em 4 segmentos, cabeça com mandíbula denteada e placas dorsais destrutíveis.' }
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
    default:
      return buildAlphaTrex();
  }
}

function createCommonState(root, parts, destructibles, rageMaterials = [], auraMesh = null) {
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
    setPhaseVisuals(hpRatio) {
      this.phase = hpRatio <= 0.34 ? 3 : (hpRatio <= 0.67 ? 2 : 1);
      // Quebra partes destrutíveis conforme perde HP
      const targetBroken = Math.min(
        this.destructibles.length,
        Math.floor((1 - hpRatio) * (this.destructibles.length + 0.5))
      );
      while (this.brokenCount < targetBroken) {
        const part = this.destructibles[this.brokenCount];
        if (part) part.visible = false;
        this.brokenCount++;
      }
      // Ativa rachaduras / olhos / aura na Fase 2 e 3
      for (const rm of this.rageMaterials) {
        if (this.phase === 1) rm.emissiveIntensity = 0.25;
        if (this.phase === 2) rm.emissiveIntensity = 0.95;
        if (this.phase >= 3) rm.emissiveIntensity = 1.65;
      }
      if (this.parts.cracks) {
        for (const c of this.parts.cracks) c.visible = this.phase >= 2;
      }
      if (this.auraMesh) {
        this.auraMesh.visible = this.phase >= 3;
      }
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
