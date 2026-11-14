// Constrói modelos voxel articulados procedurais para cada espécie, com dezenas de cubos,
// padrões de cores, acessórios cúbicos e evolução visual.
import * as THREE from 'three';
import { getDinoSpec } from './DinoCatalog.js';
import { buildClaudeAccessoryGroup } from '../models/ClaudeVoxelModels.js';

const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);

function darkenHex(hex, amount = 0.28) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return `#${c.getHexString()}`;
}

function createMat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.65,
    metalness: options.metalness ?? 0.08,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1
  });
}

function addVoxel(parent, w, h, d, x, y, z, mat, castShadow = true) {
  const mesh = new THREE.Mesh(SHARED_BOX, mat);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export class DinoFactory {
  static build(dinoId = 'trex', customConfig = null, options = {}) {
    const hybrid = customConfig?.hybrid;
    const useHybrid = hybrid && hybrid.enabled && (dinoId === 'hybrid' || options.allowHybrid);
    const bodyId = useHybrid ? (hybrid.body || dinoId) : dinoId;
    const headId = useHybrid ? (hybrid.head || dinoId) : dinoId;
    const tailId = useHybrid ? (hybrid.tail || dinoId) : dinoId;

    const spec = getDinoSpec(bodyId === 'hybrid' ? 'trex' : bodyId);
    const headSpec = getDinoSpec(headId === 'hybrid' ? 'trex' : headId);
    const applyColors = customConfig && (customConfig.useCustomColors === undefined || customConfig.useCustomColors === true);
    const colors = applyColors ? { ...spec.colors, ...customConfig } : { ...spec.colors };
    const pattern = customConfig?.pattern || 'solid';
    const accessory = customConfig?.accessory || 'none';
    const evolutionTier = options.evolutionTier || 0;
    const isGhost = dinoId === 'ghostgold' || options.ghost;

    const root = new THREE.Group();
    root.name = `dino_${dinoId}`;

    // Paleta de materiais conforme padrão escolhido
    const isNeon = pattern === 'neon';
    const emissiveMain = isNeon ? new THREE.Color(colors.primary) : (isGhost ? new THREE.Color('#ffda6a') : new THREE.Color(0x000000));
    const emissiveIntensity = isNeon ? 0.35 : (isGhost ? 0.25 : 0);

    const matPrimary = createMat(colors.primary, {
      emissive: emissiveMain,
      emissiveIntensity,
      transparent: isGhost,
      opacity: isGhost ? 0.84 : 1,
      metalness: dinoId === 'ghostgold' ? 0.45 : 0.08
    });
    const matPrimaryDark = createMat(darkenHex(colors.primary, 0.22), {
      emissive: emissiveMain,
      emissiveIntensity: emissiveIntensity * 0.5,
      transparent: isGhost,
      opacity: isGhost ? 0.84 : 1
    });
    const matSecondary = createMat(colors.secondary, {
      transparent: isGhost,
      opacity: isGhost ? 0.86 : 1
    });
    const matSpots = createMat(
      pattern === 'camo' ? darkenHex(colors.primary, 0.42) : colors.spots,
      {
        emissive: isNeon ? new THREE.Color(colors.spots) : new THREE.Color(0x000000),
        emissiveIntensity: isNeon ? 0.45 : 0
      }
    );
    const matSpikes = createMat(colors.spikes, {
      emissive: isNeon ? new THREE.Color(colors.spikes) : new THREE.Color(0x000000),
      emissiveIntensity: isNeon ? 0.4 : 0
    });
    const matEyeWhite = createMat('#ffffff', { roughness: 0.3 });
    const matEyeIris = createMat(colors.eye, { roughness: 0.2, emissive: colors.eye, emissiveIntensity: 0.15 });
    const matPupil = createMat('#111111', { roughness: 0.2 });
    const matTooth = createMat('#f7f4e8', { roughness: 0.35 });

    // Proporções por espécie (suporta híbridos cabeça/corpo/cauda!)
    const isQuadruped = ['triceratops', 'styracosaurus', 'stegosaurus', 'ankylosaurus', 'brachiosaurus', 'kentrosaurus', 'diplodocus', 'argentinosaurus'].includes(bodyId);
    const bodyScale = bodyId === 'compsognathus' ? 0.62
      : bodyId === 'oviraptor' ? 0.8
      : bodyId === 'gallimimus' ? 0.86
      : bodyId === 'quetzalcoatlus' ? 0.92
      : bodyId === 'brachiosaurus' ? 1.24
      : bodyId === 'argentinosaurus' ? 1.32
      : bodyId === 'diplodocus' ? 1.18
      : bodyId === 'giganotosaurus' ? 1.14
      : bodyId === 'raptor' || bodyId === 'dilophosaurus' || bodyId === 'deinonychus' ? 0.88
      : bodyId === 'ankylosaurus' || bodyId === 'kentrosaurus' ? 1.05
      : 1.0;

    // Rig hierárquico para animações procedurais
    const rig = new THREE.Group();
    rig.scale.setScalar(bodyScale);
    root.add(rig);

    const torso = new THREE.Group();
    torso.position.set(0, isQuadruped ? 0.88 : 1.08, 0);
    rig.add(torso);

    // Corpo principal (vários blocos para textura voxel rica)
    const torsoW = isQuadruped ? 0.92 : 0.78;
    const torsoH = isQuadruped ? 0.66 : 0.72;
    const torsoD = isQuadruped ? 1.38 : 1.08;

    addVoxel(torso, torsoW, torsoH, torsoD, 0, 0, 0, matPrimary);
    addVoxel(torso, torsoW * 0.86, torsoH * 0.26, torsoD * 0.9, 0, -torsoH * 0.42, 0, matSecondary); // barriga
    addVoxel(torso, torsoW * 0.78, torsoH * 0.22, torsoD * 0.78, 0, torsoH * 0.45, 0.04, matPrimaryDark); // dorso
    addVoxel(torso, torsoW * 0.9, torsoH * 0.52, torsoD * 0.36, 0, 0.06, -torsoD * 0.34, matPrimary); // peito

    // Padrão visual (listras / manchas / degradê / camuflagem / neon)
    if (pattern === 'stripes' || pattern === 'neon') {
      for (let i = -1; i <= 1; i++) {
        addVoxel(torso, torsoW + 0.05, torsoH * 0.65, 0.14, 0, 0.06, i * 0.34, matSpots);
      }
    } else if (pattern === 'spots' || pattern === 'camo') {
      addVoxel(torso, 0.22, 0.22, 0.24, torsoW * 0.44, 0.12, -0.2, matSpots);
      addVoxel(torso, 0.2, 0.2, 0.22, -torsoW * 0.44, -0.02, 0.16, matSpots);
      addVoxel(torso, 0.24, 0.18, 0.26, torsoW * 0.43, -0.05, 0.28, matSpots);
      addVoxel(torso, 0.2, 0.22, 0.22, -torsoW * 0.44, 0.14, -0.26, matSpots);
    } else if (pattern === 'gradient') {
      addVoxel(torso, torsoW + 0.02, torsoH * 0.28, torsoD * 0.96, 0, torsoH * 0.32, 0, matSpots);
    }

    // Detalhes dorsais específicos da espécie
    if (bodyId === 'stegosaurus') {
      for (let i = 0; i < 4; i++) {
        const zOff = -0.45 + i * 0.32;
        addVoxel(torso, 0.09, 0.42, 0.22, -0.14, torsoH * 0.68, zOff, matSpikes);
        addVoxel(torso, 0.09, 0.38, 0.22, 0.14, torsoH * 0.65, zOff + 0.1, matSpikes);
      }
    } else if (bodyId === 'spinosaurus') {
      // Vela dorsal característica do Spinosaurus
      const sailHeights = [0.42, 0.72, 0.85, 0.76, 0.48];
      sailHeights.forEach((sh, idx) => {
        addVoxel(torso, 0.12, sh, 0.2, 0, torsoH * 0.5 + sh * 0.45, -0.45 + idx * 0.23, matSpikes);
      });
    } else if (bodyId === 'ankylosaurus') {
      // Carapaça blindada com espinhos laterais
      addVoxel(torso, torsoW + 0.16, 0.18, torsoD + 0.08, 0, torsoH * 0.46, 0, matPrimaryDark);
      for (let i = -1; i <= 1; i++) {
        addVoxel(torso, 0.18, 0.14, 0.18, torsoW * 0.56, 0.12, i * 0.38, matSpikes);
        addVoxel(torso, 0.18, 0.14, 0.18, -torsoW * 0.56, 0.12, i * 0.38, matSpikes);
      }
    } else if (bodyId === 'giganotosaurus') {
      // Fileira dupla de cristas dorsais pesadas
      for (let i = 0; i < 4; i++) {
        const zOff = -0.4 + i * 0.28;
        addVoxel(torso, 0.1, 0.24, 0.18, -0.14, torsoH * 0.58, zOff, matSpikes);
        addVoxel(torso, 0.1, 0.24, 0.18, 0.14, torsoH * 0.58, zOff, matSpikes);
      }
    } else if (bodyId === 'kentrosaurus') {
      // Placas frontais + fileira de espinhos longos no quadril e ombros
      for (let i = 0; i < 4; i++) {
        const zOff = -0.45 + i * 0.3;
        addVoxel(torso, 0.08, i < 2 ? 0.36 : 0.48, 0.16, -0.16, torsoH * 0.68, zOff, matSpikes);
        addVoxel(torso, 0.08, i < 2 ? 0.36 : 0.48, 0.16, 0.16, torsoH * 0.68, zOff, matSpikes);
      }
      addVoxel(torso, 0.55, 0.1, 0.12, -torsoW * 0.62, 0.16, -0.25, matTooth);
      addVoxel(torso, 0.55, 0.1, 0.12, torsoW * 0.62, 0.16, -0.25, matTooth);
    } else if (bodyId === 'ceratosaurus') {
      // Osteodermas dorsais serrilhadas
      for (let i = 0; i < 5; i++) {
        addVoxel(torso, 0.12, 0.22 + (i % 2) * 0.08, 0.14, 0, torsoH * 0.6, -0.44 + i * 0.22, matSpikes);
      }
    } else if (bodyId === 'argentinosaurus') {
      // Placas dérmicas largas de titanossauro
      for (let i = -1; i <= 1; i++) {
        addVoxel(torso, 0.24, 0.14, 0.28, -0.22, torsoH * 0.54, i * 0.38, matPrimaryDark);
        addVoxel(torso, 0.24, 0.14, 0.28, 0.22, torsoH * 0.54, i * 0.38, matPrimaryDark);
      }
    } else {
      // Fileira padrão de espinhos dorsais estilizados
      for (let i = 0; i < 3; i++) {
        addVoxel(torso, 0.1, 0.16, 0.16, 0, torsoH * 0.56, -0.3 + i * 0.3, matSpikes);
      }
    }

    // Pescoço e Cabeça articulados
    const neckPivot = new THREE.Group();
    const neckLen = headId === 'brachiosaurus' || headId === 'argentinosaurus' ? 1.38
      : (headId === 'diplodocus' ? 1.15 : (headId === 'gallimimus' ? 0.72 : (isQuadruped ? 0.34 : 0.48)));
    neckPivot.position.set(0, torsoH * 0.25, -torsoD * 0.45);
    torso.add(neckPivot);

    addVoxel(neckPivot, 0.42, neckLen, 0.42, 0, neckLen * 0.42, -0.08, matPrimary);
    addVoxel(neckPivot, 0.32, neckLen * 0.85, 0.16, 0, neckLen * 0.4, 0.09, matSecondary);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, neckLen * 0.88, -0.14);
    neckPivot.add(headGroup);

    const headW = headId === 'triceratops' || headId === 'styracosaurus' ? 0.72
      : (headId === 'pachycephalosaurus' ? 0.64 : (headId === 'quetzalcoatlus' ? 0.46 : 0.66));
    const headH = headId === 'giganotosaurus' ? 0.58 : (headId === 'quetzalcoatlus' ? 0.4 : 0.52);
    const headD = headId === 'spinosaurus' || headId === 'baryonyx' ? 0.96
      : (headId === 'quetzalcoatlus' ? 1.08 : 0.78);
    addVoxel(headGroup, headW, headH, headD, 0, 0.16, -0.18, matPrimary);
    // Focinho
    addVoxel(headGroup, headW * 0.84, headH * 0.64, headD * 0.46, 0, 0.1, -headD * 0.58, matPrimary);

    // Mandíbula inferior articulada (abre no rugido/vitória)
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.02, -0.04);
    headGroup.add(jaw);
    addVoxel(jaw, headW * 0.76, 0.16, headD * 0.82, 0, -0.06, -headD * 0.34, matSecondary);
    // Dentes brancos voxel para carnívoros
    if (headSpec.dinoClass === 'carnivore' || headId === 'spinosaurus') {
      for (let t = 0; t < 3; t++) {
        const tz = -0.32 - t * 0.18;
        addVoxel(headGroup, 0.06, 0.1, 0.06, headW * 0.3, -0.04, tz, matTooth);
        addVoxel(headGroup, 0.06, 0.1, 0.06, -headW * 0.3, -0.04, tz, matTooth);
      }
    }

    // Olhos grandes expressivos (esclera + íris + pupila + sobrancelha animável)
    const eyeX = headW * 0.47;
    const eyeY = 0.22;
    const eyeZ = -0.22;
    const eyeGroups = [];
    const browGroups = [];
    for (const side of [-1, 1]) {
      const eg = new THREE.Group();
      eg.position.set(side * eyeX, eyeY, eyeZ);
      headGroup.add(eg);
      addVoxel(eg, 0.09, 0.2, 0.2, 0, 0, 0, matEyeWhite);
      addVoxel(eg, 0.1, 0.14, 0.14, side * 0.01, 0, -0.01, matEyeIris);
      addVoxel(eg, 0.11, 0.08, 0.08, side * 0.015, 0, -0.02, matPupil);
      eyeGroups.push(eg);

      const bg = new THREE.Group();
      bg.position.set(side * (eyeX - 0.01), eyeY + 0.14, eyeZ - 0.01);
      headGroup.add(bg);
      addVoxel(bg, 0.1, 0.055, 0.22, 0, 0, 0, matPrimaryDark);
      browGroups.push(bg);
    }

    // Características únicas da cabeça por espécie
    if (headId === 'triceratops') {
      // Escudo occipital + 3 chifres
      addVoxel(headGroup, 1.06, 0.86, 0.18, 0, 0.44, 0.18, matPrimaryDark);
      addVoxel(headGroup, 0.94, 0.74, 0.12, 0, 0.44, 0.12, matSpikes);
      addVoxel(headGroup, 0.1, 0.1, 0.56, -0.24, 0.36, -0.72, matTooth);
      addVoxel(headGroup, 0.1, 0.1, 0.56, 0.24, 0.36, -0.72, matTooth);
      addVoxel(headGroup, 0.09, 0.26, 0.12, 0, 0.32, -0.76, matTooth);
    } else if (headId === 'dilophosaurus') {
      addVoxel(headGroup, 0.07, 0.32, 0.52, -0.15, 0.52, -0.25, matSpikes);
      addVoxel(headGroup, 0.07, 0.32, 0.52, 0.15, 0.52, -0.25, matSpikes);
      addVoxel(headGroup, 1.15, 0.58, 0.12, 0, 0.05, 0.22, matSpikes);
    } else if (headId === 'raptor') {
      addVoxel(headGroup, 0.12, 0.24, 0.36, 0, 0.45, 0.16, matSpikes);
    } else if (headId === 'parasaurolophus') {
      addVoxel(headGroup, 0.16, 0.2, 0.92, 0, 0.46, 0.26, matSpikes);
    } else if (headId === 'carnotaurus') {
      addVoxel(headGroup, 0.11, 0.28, 0.12, -0.26, 0.48, -0.16, matSpikes);
      addVoxel(headGroup, 0.11, 0.28, 0.12, 0.26, 0.48, -0.16, matSpikes);
    } else if (headId === 'pachycephalosaurus') {
      addVoxel(headGroup, 0.56, 0.3, 0.56, 0, 0.5, -0.2, matSpikes);
    } else if (headId === 'allosaurus' || headId === 'giganotosaurus') {
      addVoxel(headGroup, 0.1, 0.18, 0.28, -0.24, 0.44, -0.32, matSpikes);
      addVoxel(headGroup, 0.1, 0.18, 0.28, 0.24, 0.44, -0.32, matSpikes);
    } else if (headId === 'styracosaurus') {
      addVoxel(headGroup, 1.12, 0.92, 0.18, 0, 0.46, 0.18, matPrimaryDark);
      for (let i = -2; i <= 2; i++) {
        addVoxel(headGroup, 0.09, 0.32, 0.1, i * 0.22, 0.94 - Math.abs(i) * 0.08, 0.18, matTooth);
      }
      addVoxel(headGroup, 0.12, 0.46, 0.14, 0, 0.46, -0.78, matTooth);
    } else if (headId === 'oviraptor') {
      addVoxel(headGroup, 0.16, 0.34, 0.44, 0, 0.5, -0.28, matSpikes);
    } else if (headId === 'quetzalcoatlus') {
      addVoxel(headGroup, 0.12, 0.22, 0.85, 0, 0.36, 0.22, matSpikes);
    } else if (headId === 'baryonyx') {
      addVoxel(headGroup, 0.14, 0.12, 0.4, 0, 0.44, -0.05, matSpikes);
    } else if (headId === 'deinonychus') {
      addVoxel(headGroup, 0.16, 0.26, 0.52, 0, 0.46, 0.16, matSpikes);
      addVoxel(headGroup, 0.1, 0.2, 0.36, -0.14, 0.42, 0.22, matSecondary);
      addVoxel(headGroup, 0.1, 0.2, 0.36, 0.14, 0.42, 0.22, matSecondary);
    } else if (headId === 'ceratosaurus') {
      addVoxel(headGroup, 0.12, 0.34, 0.16, 0, 0.44, -0.62, matSpikes); // chifre nasal
      addVoxel(headGroup, 0.1, 0.22, 0.26, -0.22, 0.46, -0.24, matSpikes);
      addVoxel(headGroup, 0.1, 0.22, 0.26, 0.22, 0.46, -0.24, matSpikes);
    } else if (headId === 'gallimimus') {
      addVoxel(headGroup, 0.12, 0.14, 0.42, 0, 0.2, -0.56, matSpikes);
      addVoxel(headGroup, 0.16, 0.22, 0.34, 0, 0.42, 0.18, matSpikes);
    } else if (headId === 'iguanodon') {
      addVoxel(headGroup, 0.16, 0.18, 0.45, 0, 0.42, -0.18, matSpikes);
    }

    // Cauda segmentada (4 segmentos articulados)
    const tailSegments = [];
    let tailParent = torso;
    for (let s = 0; s < 4; s++) {
      const segPivot = new THREE.Group();
      segPivot.position.set(0, s === 0 ? 0.04 : 0, s === 0 ? torsoD * 0.5 : 0.34);
      tailParent.add(segPivot);
      const scaleFactor = 1 - s * 0.2;
      addVoxel(segPivot, 0.42 * scaleFactor, 0.36 * scaleFactor, 0.38, 0, 0, 0.18, s % 2 === 0 ? matPrimary : matPrimaryDark);
      if (tailId === 'ankylosaurus' && s === 3) {
        addVoxel(segPivot, 0.42, 0.34, 0.42, 0, 0, 0.36, matSpikes);
      } else if ((tailId === 'stegosaurus' || tailId === 'kentrosaurus') && s >= 2) {
        addVoxel(segPivot, 0.54, 0.1, 0.09, 0, 0.12, 0.24, matSpikes);
      } else if (tailId === 'spinosaurus' && s >= 1) {
        addVoxel(segPivot, 0.08, 0.36, 0.28, 0, 0.24, 0.18, matSpikes);
      } else if ((tailId === 'oviraptor' || tailId === 'deinonychus' || tailId === 'gallimimus') && s === 3) {
        // Leque de penas na ponta da cauda
        addVoxel(segPivot, 0.56, 0.08, 0.42, 0, 0.08, 0.32, matSpikes);
        addVoxel(segPivot, 0.4, 0.12, 0.3, 0, 0.14, 0.34, matSecondary);
      } else if (tailId === 'diplodocus' && s === 3) {
        addVoxel(segPivot, 0.12, 0.12, 0.72, 0, 0, 0.42, matSpikes);
      }
      tailSegments.push(segPivot);
      tailParent = segPivot;
    }

    // Pernas articuladas (coxas + canelas + pés)
    const buildLeg = (sideX, zPos, isFront = false) => {
      const hip = new THREE.Group();
      hip.position.set(sideX, -torsoH * 0.32, zPos);
      torso.add(hip);

      const thighH = isQuadruped ? 0.42 : 0.48;
      const shinH = isQuadruped ? 0.38 : 0.42;
      addVoxel(hip, 0.26, thighH, 0.3, 0, -thighH * 0.4, 0, matPrimaryDark);

      const knee = new THREE.Group();
      knee.position.set(0, -thighH * 0.8, 0);
      hip.add(knee);
      addVoxel(knee, 0.2, shinH, 0.22, 0, -shinH * 0.45, 0.02, matPrimary);

      const foot = new THREE.Group();
      foot.position.set(0, -shinH * 0.85, 0);
      knee.add(foot);
      addVoxel(foot, 0.26, 0.12, isFront ? 0.26 : 0.36, 0, -0.04, -0.07, matSecondary);
      // Dedos/garras voxel
      addVoxel(foot, 0.07, 0.08, 0.12, -0.07, -0.05, -0.26, matTooth);
      addVoxel(foot, 0.07, 0.08, 0.12, 0.07, -0.05, -0.26, matTooth);

      return { hip, knee, foot };
    };

    const legL = buildLeg(-torsoW * 0.44, isQuadruped ? 0.38 : 0.08);
    const legR = buildLeg(torsoW * 0.44, isQuadruped ? 0.38 : 0.08);

    let armL;
    let armR;
    if (isQuadruped) {
      armL = buildLeg(-torsoW * 0.44, -0.44, true);
      armR = buildLeg(torsoW * 0.44, -0.44, true);
    } else {
      const buildArm = (sideX) => {
        const shoulder = new THREE.Group();
        shoulder.position.set(sideX, -0.1, -torsoD * 0.32);
        torso.add(shoulder);
        const dir = sideX < 0 ? -1 : 1;
        if (bodyId === 'quetzalcoatlus') {
          // Asas enormes de pterossauro
          addVoxel(shoulder, 0.88, 0.1, 0.38, dir * 0.48, 0.06, 0.06, matPrimaryDark);
          addVoxel(shoulder, 0.72, 0.06, 0.44, dir * 0.96, 0.02, 0.14, matSpikes);
          addVoxel(shoulder, 0.12, 0.08, 0.18, dir * 0.14, -0.1, -0.18, matTooth);
          return { hip: shoulder };
        }
        const armLen = bodyId === 'therizinosaurus' ? 0.46 : bodyId === 'baryonyx' ? 0.38 : 0.28;
        addVoxel(shoulder, 0.14, armLen, 0.16, 0, -armLen * 0.4, -0.06, matPrimaryDark);
        if (bodyId === 'therizinosaurus') {
          // Garras gigantes icônicas
          addVoxel(shoulder, 0.05, 0.08, 0.46, -0.04, -armLen * 0.85, -0.28, matTooth);
          addVoxel(shoulder, 0.05, 0.08, 0.46, 0.04, -armLen * 0.85, -0.28, matTooth);
        } else if (bodyId === 'baryonyx') {
          // Garra curva espessa de pescador
          addVoxel(shoulder, 0.12, 0.12, 0.32, 0, -armLen * 0.88, -0.22, matTooth);
        } else if (bodyId === 'oviraptor') {
          // Penas laterais nos braços
          addVoxel(shoulder, 0.08, 0.24, 0.36, dir * 0.06, -armLen * 0.45, 0.08, matSpikes);
          addVoxel(shoulder, 0.1, 0.08, 0.18, 0, -armLen * 0.85, -0.1, matTooth);
        } else if (bodyId === 'iguanodon') {
          // Espigão de polegar característico
          addVoxel(shoulder, 0.12, 0.12, 0.36, 0, -armLen * 0.85, -0.24, matTooth);
        } else if (bodyId === 'deinonychus') {
          // Penas e garra dupla
          addVoxel(shoulder, 0.08, 0.26, 0.38, dir * 0.06, -armLen * 0.45, 0.08, matSpikes);
          addVoxel(shoulder, 0.09, 0.1, 0.32, 0, -armLen * 0.88, -0.22, matTooth);
        } else {
          addVoxel(shoulder, 0.12, 0.08, 0.18, 0, -armLen * 0.85, -0.12, matTooth);
        }
        return { hip: shoulder };
      };
      armL = buildArm(-torsoW * 0.48);
      armR = buildArm(torsoW * 0.48);
    }

    // Acessórios cúbicos + skins sazonais & comemorativas LAN
    DinoFactory._attachAccessory(accessory, headGroup, torso, torsoW, torsoH, torsoD);
    if (customConfig?.partyCrown && accessory !== 'crown') {
      DinoFactory._attachAccessory('crown', headGroup, torso, torsoW, torsoH, torsoD);
    }
    const season = customConfig?.season;
    if (season === 'xmas') {
      addVoxel(headGroup, 0.56, 0.14, 0.56, 0, 0.48, -0.18, createMat('#ffffff'));
      addVoxel(headGroup, 0.42, 0.32, 0.42, 0, 0.66, -0.18, createMat('#e63946'));
      addVoxel(headGroup, 0.18, 0.18, 0.18, 0, 0.86, -0.18, createMat('#ffffff'));
    } else if (season === 'halloween') {
      addVoxel(headGroup, 0.62, 0.08, 0.62, 0, 0.46, -0.18, createMat('#f97316'));
      addVoxel(headGroup, 0.36, 0.38, 0.36, 0, 0.68, -0.18, createMat('#7e22ce'));
    } else if (season === 'birthday') {
      addVoxel(headGroup, 0.34, 0.42, 0.34, 0, 0.68, -0.18, createMat('#38bdf8', { emissive: '#0284c7', emissiveIntensity: 0.4 }));
      addVoxel(headGroup, 0.16, 0.16, 0.16, 0, 0.94, -0.18, createMat('#ffd447'));
    }

    // Coleta de referências para piscar em dano, evoluções e explosão de cubos
    const allMeshes = [];
    rig.traverse((child) => {
      if (child.isMesh) allMeshes.push(child);
    });

    return {
      root,
      rig,
      torso,
      neckPivot,
      headGroup,
      jaw,
      eyeGroups,
      browGroups,
      tailSegments,
      legL,
      legR,
      armL,
      armR,
      isQuadruped,
      baseScale: bodyScale,
      allMeshes,
      spec,
      colors
    };
  }

  static _attachAccessory(accessory, headGroup, torso, torsoW, torsoH, torsoD = 1.08) {
    if (!accessory || accessory === 'none') return;
    const matDark = createMat('#222228', { roughness: 0.5 });
    const matGold = createMat('#ffd447', { roughness: 0.25, metalness: 0.5 });
    const matRed = createMat('#e63946', { roughness: 0.5 });
    const matBlue = createMat('#3a86ff', { roughness: 0.5 });

    switch (accessory) {
      case 'tophat': {
        const m = buildClaudeAccessoryGroup('cartola');
        if (m) {
          m.position.set(0, 0.42, -0.18);
          m.scale.setScalar(0.95);
          headGroup.add(m);
        }
        break;
      }
      case 'cap':
        addVoxel(headGroup, 0.68, 0.18, 0.68, 0, 0.46, -0.18, matBlue);
        addVoxel(headGroup, 0.64, 0.07, 0.36, 0, 0.4, -0.56, matGold);
        addVoxel(headGroup, 0.22, 0.14, 0.08, 0, 0.5, -0.53, matRed);
        break;
      case 'crown': {
        const m = buildClaudeAccessoryGroup('coroa');
        if (m) {
          m.position.set(0, 0.42, -0.18);
          m.scale.setScalar(0.98);
          headGroup.add(m);
        }
        break;
      }
      case 'helmet': {
        const m = buildClaudeAccessoryGroup('capacete');
        if (m) {
          m.position.set(0, 0.16, -0.18);
          m.scale.setScalar(1.06);
          headGroup.add(m);
        }
        break;
      }
      case 'glasses': {
        const m = buildClaudeAccessoryGroup('oculos');
        if (m) {
          m.position.set(0, 0.25, -0.59);
          m.scale.set(1.22, 1.05, 1.05);
          headGroup.add(m);
        }
        break;
      }
      case 'cape': {
        const m = buildClaudeAccessoryGroup('capa');
        if (m) {
          m.position.set(0, torsoH * 0.54, torsoD * 0.18);
          m.scale.setScalar(1.15);
          m.rotation.x = -0.65;
          torso.add(m);
        }
        break;
      }
      case 'backpack': {
        const matTan = createMat('#d4a373', { roughness: 0.75 });
        addVoxel(torso, 0.58, 0.46, 0.36, 0, torsoH * 0.62, 0.06, matBlue);
        addVoxel(torso, 0.44, 0.28, 0.14, 0, torsoH * 0.56, 0.26, matTan);
        addVoxel(torso, 0.54, 0.18, 0.18, 0, torsoH * 0.88, 0.06, matGold);
        addVoxel(torso, 0.1, 0.42, 0.12, -0.24, torsoH * 0.5, -0.14, matDark);
        addVoxel(torso, 0.1, 0.42, 0.12, 0.24, torsoH * 0.5, -0.14, matDark);
        break;
      }
      case 'scarf':
        addVoxel(torso, 0.56, 0.16, 0.56, 0, torsoH * 0.36, -0.44, matRed);
        addVoxel(torso, 0.2, 0.12, 0.48, 0.18, torsoH * 0.34, -0.14, matRed);
        addVoxel(torso, 0.16, 0.1, 0.38, -0.16, torsoH * 0.38, -0.18, matGold);
        break;
      case 'wings':
        addVoxel(torso, 0.54, 0.12, 0.36, -0.58, torsoH * 0.44, 0.02, matGold);
        addVoxel(torso, 0.48, 0.09, 0.3, -1.04, torsoH * 0.5, 0.08, matGold);
        addVoxel(torso, 0.34, 0.07, 0.22, -1.36, torsoH * 0.54, 0.14, matRed);
        addVoxel(torso, 0.54, 0.12, 0.36, 0.58, torsoH * 0.44, 0.02, matGold);
        addVoxel(torso, 0.48, 0.09, 0.3, 1.04, torsoH * 0.5, 0.08, matGold);
        addVoxel(torso, 0.34, 0.07, 0.22, 1.36, torsoH * 0.54, 0.14, matRed);
        break;
      case 'vr_visor': {
        const matCyan = createMat('#00f5d4', { emissive: '#00bfa5', emissiveIntensity: 0.75 });
        addVoxel(headGroup, 0.78, 0.18, 0.26, 0, 0.24, -0.26, matDark);
        addVoxel(headGroup, 0.72, 0.1, 0.14, 0, 0.24, -0.34, matCyan);
        addVoxel(headGroup, 0.1, 0.22, 0.22, -0.42, 0.26, -0.2, matDark);
        addVoxel(headGroup, 0.1, 0.22, 0.22, 0.42, 0.26, -0.2, matDark);
        break;
      }
      case 'spikes': {
        const matIron = createMat('#cbd5e1', { metalness: 0.7, roughness: 0.25 });
        addVoxel(torso, 0.16, 0.34, 0.22, 0, torsoH * 0.68, -0.2, matIron);
        addVoxel(torso, 0.14, 0.38, 0.22, 0, torsoH * 0.7, 0.12, matIron);
        addVoxel(torso, 0.12, 0.28, 0.2, 0, torsoH * 0.64, 0.4, matIron);
        break;
      }
      case 'aura_fire': {
        const matFire = createMat('#fb923c', { emissive: '#f97316', emissiveIntensity: 0.9, roughness: 0.2 });
        addVoxel(torso, 0.22, 0.26, 0.22, -0.58, torsoH * 0.38, 0.15, matFire);
        addVoxel(torso, 0.22, 0.26, 0.22, 0.58, torsoH * 0.38, 0.15, matFire);
        addVoxel(headGroup, 0.2, 0.22, 0.2, 0, 0.56, -0.18, matFire);
        break;
      }
      case 'bandana': {
        const bandMat = createMat('#e63946', { roughness: 0.55 });
        addVoxel(headGroup, 0.72, 0.14, 0.76, 0, 0.34, -0.18, bandMat);
        addVoxel(headGroup, 0.14, 0.12, 0.38, 0.1, 0.32, 0.34, matGold);
        addVoxel(headGroup, 0.14, 0.12, 0.34, -0.1, 0.3, 0.32, bandMat);
        break;
      }
      case 'beanie': {
        const knit = createMat('#38bdf8', { roughness: 0.75 });
        addVoxel(headGroup, 0.7, 0.24, 0.72, 0, 0.44, -0.18, knit);
        addVoxel(headGroup, 0.74, 0.1, 0.76, 0, 0.34, -0.18, matGold);
        addVoxel(headGroup, 0.24, 0.2, 0.24, 0, 0.62, -0.18, createMat('#ffffff'));
        break;
      }
      case 'pirate_hat': {
        const m = buildClaudeAccessoryGroup('pirata');
        if (m) {
          m.position.set(0, 0.42, -0.18);
          m.scale.setScalar(0.95);
          headGroup.add(m);
        }
        break;
      }
      case 'cowboy_hat':
      case 'explorer_hat':
      case 'wizard_hat':
      case 'chef_hat': {
        const brimColor = accessory === 'cowboy_hat' ? '#92400e' : accessory === 'explorer_hat' ? '#a16207' : accessory === 'pirate_hat' ? '#1e293b' : accessory === 'wizard_hat' ? '#581c87' : '#ffffff';
        const brimMat = createMat(brimColor, { roughness: 0.6 });
        addVoxel(headGroup, 0.92, 0.08, 0.92, 0, 0.46, -0.18, brimMat);
        addVoxel(headGroup, 0.54, accessory === 'wizard_hat' ? 0.52 : accessory === 'chef_hat' ? 0.46 : 0.32, 0.54, 0, accessory === 'wizard_hat' ? 0.72 : 0.64, -0.18, brimMat);
        addVoxel(headGroup, 0.58, 0.1, 0.58, 0, 0.53, -0.18, accessory === 'wizard_hat' ? matGold : matRed);
        if (accessory === 'wizard_hat') addVoxel(headGroup, 0.24, 0.28, 0.24, 0, 1.04, -0.14, matGold);
        break;
      }
      case 'bowtie':
      case 'gold_chain':
      case 'bell_collar':
      case 'spike_collar':
      case 'lantern_neck':
      case 'amber_medallion': {
        const bandMat = accessory === 'gold_chain' ? matGold : accessory === 'lantern_neck' ? createMat('#475569') : matDark;
        const badgeMat = accessory === 'bowtie' ? matRed : accessory === 'amber_medallion' ? createMat('#f59e0b', { emissive: '#d97706', emissiveIntensity: 0.75 }) : accessory === 'lantern_neck' ? createMat('#fde047', { emissive: '#facc15', emissiveIntensity: 1.0 }) : matGold;
        addVoxel(torso, 0.58, 0.14, 0.58, 0, torsoH * 0.35, -0.44, bandMat);
        addVoxel(torso, 0.26, 0.2, 0.16, 0, torsoH * 0.32, -0.74, badgeMat);
        addVoxel(torso, 0.18, 0.18, 0.14, -0.16, torsoH * 0.34, -0.72, badgeMat);
        addVoxel(torso, 0.18, 0.18, 0.14, 0.16, torsoH * 0.34, -0.72, badgeMat);
        break;
      }
      case 'flower_crown':
      case 'halo':
      case 'viking_horn':
      case 'antenna': {
        const mainC = accessory === 'halo' ? createMat('#fde047', { emissive: '#facc15', emissiveIntensity: 0.9 }) : accessory === 'flower_crown' ? createMat('#ec4899', { emissive: '#db2777', emissiveIntensity: 0.35 }) : createMat('#64748b', { metalness: 0.55 });
        const accC = accessory === 'halo' ? createMat('#ffffff', { emissive: '#fef08a', emissiveIntensity: 0.9 }) : accessory === 'flower_crown' ? createMat('#4ade80') : accessory === 'antenna' ? createMat('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 0.95 }) : createMat('#fef3c7');
        const yOff = accessory === 'halo' ? 0.68 : 0.48;
        addVoxel(headGroup, 0.68, 0.12, 0.68, 0, yOff, -0.18, mainC);
        addVoxel(headGroup, 0.16, accessory === 'antenna' ? 0.42 : 0.26, 0.16, -0.34, yOff + 0.14, -0.18, accC);
        addVoxel(headGroup, 0.16, accessory === 'antenna' ? 0.42 : 0.26, 0.16, 0.34, yOff + 0.14, -0.18, accC);
        break;
      }
      case 'monocle':
      case 'snorkel':
      case 'headphones':
      case 'visor_neon':
      case 'star_shades': {
        const frameMat = accessory === 'monocle' || accessory === 'star_shades' ? matGold : matDark;
        const lensMat = accessory === 'snorkel' ? createMat('#38bdf8', { transparent: true, opacity: 0.78 }) : accessory === 'visor_neon' ? createMat('#f43f5e', { emissive: '#e11d48', emissiveIntensity: 0.85 }) : accessory === 'headphones' ? createMat('#22c55e', { emissive: '#16a34a', emissiveIntensity: 0.5 }) : createMat('#fde047', { emissive: '#f59e0b', emissiveIntensity: 0.75 });
        addVoxel(headGroup, 0.78, 0.16, 0.26, 0, accessory === 'headphones' ? 0.38 : 0.24, -0.24, frameMat);
        addVoxel(headGroup, 0.24, 0.24, 0.2, -0.38, 0.24, -0.24, lensMat);
        addVoxel(headGroup, 0.24, 0.24, 0.2, 0.38, 0.24, -0.24, lensMat);
        if (accessory === 'snorkel') addVoxel(headGroup, 0.12, 0.48, 0.12, 0.42, 0.48, -0.18, matGold);
        break;
      }
      case 'jetpack': {
        const m = buildClaudeAccessoryGroup('foguete');
        if (m) {
          m.position.set(0, torsoH * 0.66, torsoD * 0.22);
          m.scale.setScalar(1.1);
          m.rotation.x = -0.65;
          torso.add(m);
        }
        break;
      }
      case 'leaf_cape':
      case 'quiver':
      case 'turtle_shell':
      case 'bat_wings':
      case 'angel_wings':
      case 'crystal_wings': {
        const baseM = accessory === 'leaf_cape' ? createMat('#22c55e') : accessory === 'quiver' ? createMat('#92400e') : accessory === 'turtle_shell' ? createMat('#15803d') : accessory === 'jetpack' ? createMat('#64748b', { metalness: 0.65 }) : accessory === 'bat_wings' ? createMat('#4c1d95') : accessory === 'crystal_wings' ? createMat('#22d3ee', { emissive: '#0891b2', emissiveIntensity: 0.75 }) : createMat('#ffffff', { emissive: '#fef08a', emissiveIntensity: 0.45 });
        const trimM = accessory === 'jetpack' ? createMat('#f97316', { emissive: '#ea580c', emissiveIntensity: 0.9 }) : matGold;
        if (accessory.includes('wings')) {
          addVoxel(torso, 0.56, 0.12, 0.36, -0.58, torsoH * 0.44, 0.02, baseM);
          addVoxel(torso, 0.52, 0.09, 0.3, -1.06, torsoH * 0.5, 0.08, trimM);
          addVoxel(torso, 0.56, 0.12, 0.36, 0.58, torsoH * 0.44, 0.02, baseM);
          addVoxel(torso, 0.52, 0.09, 0.3, 1.06, torsoH * 0.5, 0.08, trimM);
        } else {
          addVoxel(torso, 0.7, 0.44, 0.52, 0, torsoH * 0.58, 0.12, baseM);
          addVoxel(torso, 0.24, 0.48, 0.24, -0.24, torsoH * 0.62, 0.22, trimM);
          addVoxel(torso, 0.24, 0.48, 0.24, 0.24, torsoH * 0.62, 0.22, trimM);
        }
        break;
      }
      case 'aura_ice':
      case 'aura_lightning':
      case 'aura_galaxy':
      case 'orbital_eggs': {
        const auraC = accessory === 'aura_ice' ? '#38bdf8' : accessory === 'aura_lightning' ? '#facc15' : accessory === 'aura_galaxy' ? '#a855f7' : '#ffd447';
        const auraMat = createMat(auraC, { emissive: auraC, emissiveIntensity: 0.92, roughness: 0.2 });
        addVoxel(torso, 0.22, 0.28, 0.22, -0.62, torsoH * 0.42, 0.15, auraMat);
        addVoxel(torso, 0.22, 0.28, 0.22, 0.62, torsoH * 0.42, 0.15, auraMat);
        addVoxel(headGroup, 0.2, 0.26, 0.2, 0, 0.62, -0.18, auraMat);
        break;
      }
      default:
        break;
    }
  }
}
