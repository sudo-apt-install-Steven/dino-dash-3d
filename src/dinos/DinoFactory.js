// Constrói modelos voxel articulados procedurais para cada espécie, com dezenas de cubos,
// padrões de cores, acessórios cúbicos e evolução visual.
import * as THREE from 'three';
import { getDinoSpec } from './DinoCatalog.js';

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
    const isQuadruped = ['triceratops', 'stegosaurus', 'ankylosaurus', 'brachiosaurus'].includes(bodyId);
    const bodyScale = bodyId === 'compsognathus' ? 0.62
      : bodyId === 'brachiosaurus' ? 1.24
      : bodyId === 'raptor' || bodyId === 'dilophosaurus' ? 0.88
      : bodyId === 'ankylosaurus' ? 1.05
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
    } else {
      // Fileira padrão de espinhos dorsais estilizados
      for (let i = 0; i < 3; i++) {
        addVoxel(torso, 0.1, 0.16, 0.16, 0, torsoH * 0.56, -0.3 + i * 0.3, matSpikes);
      }
    }

    // Pescoço e Cabeça articulados
    const neckPivot = new THREE.Group();
    const neckLen = headId === 'brachiosaurus' ? 1.35 : (isQuadruped ? 0.34 : 0.48);
    neckPivot.position.set(0, torsoH * 0.25, -torsoD * 0.45);
    torso.add(neckPivot);

    addVoxel(neckPivot, 0.42, neckLen, 0.42, 0, neckLen * 0.42, -0.08, matPrimary);
    addVoxel(neckPivot, 0.32, neckLen * 0.85, 0.16, 0, neckLen * 0.4, 0.09, matSecondary);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, neckLen * 0.88, -0.14);
    neckPivot.add(headGroup);

    const headW = headId === 'triceratops' ? 0.72 : (headId === 'pachycephalosaurus' ? 0.64 : 0.66);
    const headH = 0.52;
    const headD = headId === 'spinosaurus' ? 0.94 : 0.78;
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

    // Olhos grandes expressivos (esclera + íris + pupila)
    const eyeX = headW * 0.47;
    const eyeY = 0.22;
    const eyeZ = -0.22;
    for (const side of [-1, 1]) {
      addVoxel(headGroup, 0.09, 0.2, 0.2, side * eyeX, eyeY, eyeZ, matEyeWhite);
      addVoxel(headGroup, 0.1, 0.14, 0.14, side * (eyeX + 0.01), eyeY, eyeZ - 0.01, matEyeIris);
      addVoxel(headGroup, 0.11, 0.08, 0.08, side * (eyeX + 0.015), eyeY, eyeZ - 0.02, matPupil);
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
      } else if (tailId === 'stegosaurus' && s >= 2) {
        addVoxel(segPivot, 0.48, 0.1, 0.08, 0, 0.12, 0.24, matSpikes);
      } else if (tailId === 'spinosaurus' && s >= 1) {
        addVoxel(segPivot, 0.08, 0.36, 0.28, 0, 0.24, 0.18, matSpikes);
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
        const armLen = bodyId === 'therizinosaurus' ? 0.46 : 0.28;
        addVoxel(shoulder, 0.14, armLen, 0.16, 0, -armLen * 0.4, -0.06, matPrimaryDark);
        if (bodyId === 'therizinosaurus') {
          // Garras gigantes icônicas
          addVoxel(shoulder, 0.05, 0.08, 0.46, -0.04, -armLen * 0.85, -0.28, matTooth);
          addVoxel(shoulder, 0.05, 0.08, 0.46, 0.04, -armLen * 0.85, -0.28, matTooth);
        } else {
          addVoxel(shoulder, 0.12, 0.08, 0.18, 0, -armLen * 0.85, -0.12, matTooth);
        }
        return { hip: shoulder };
      };
      armL = buildArm(-torsoW * 0.48);
      armR = buildArm(torsoW * 0.48);
    }

    // Acessórios cúbicos + skins sazonais & comemorativas LAN
    DinoFactory._attachAccessory(accessory, headGroup, torso, torsoW, torsoH);
    if (customConfig?.partyCrown && accessory !== 'crown') {
      DinoFactory._attachAccessory('crown', headGroup, torso, torsoW, torsoH);
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

  static _attachAccessory(accessory, headGroup, torso, torsoW, torsoH) {
    if (!accessory || accessory === 'none') return;
    const matDark = createMat('#222228', { roughness: 0.5 });
    const matGold = createMat('#ffd447', { roughness: 0.25, metalness: 0.5 });
    const matRed = createMat('#e63946', { roughness: 0.5 });
    const matBlue = createMat('#3a86ff', { roughness: 0.5 });

    switch (accessory) {
      case 'tophat':
        addVoxel(headGroup, 0.72, 0.08, 0.72, 0, 0.46, -0.18, matDark);
        addVoxel(headGroup, 0.48, 0.42, 0.48, 0, 0.7, -0.18, matDark);
        addVoxel(headGroup, 0.5, 0.09, 0.5, 0, 0.54, -0.18, matRed);
        break;
      case 'cap':
        addVoxel(headGroup, 0.68, 0.18, 0.68, 0, 0.46, -0.18, matBlue);
        addVoxel(headGroup, 0.64, 0.07, 0.36, 0, 0.4, -0.56, matGold);
        break;
      case 'crown':
        addVoxel(headGroup, 0.54, 0.14, 0.54, 0, 0.47, -0.18, matGold);
        addVoxel(headGroup, 0.1, 0.18, 0.1, -0.2, 0.6, -0.36, matGold);
        addVoxel(headGroup, 0.1, 0.22, 0.1, 0, 0.62, -0.36, matGold);
        addVoxel(headGroup, 0.1, 0.18, 0.1, 0.2, 0.6, -0.36, matGold);
        break;
      case 'helmet':
        addVoxel(headGroup, 0.76, 0.32, 0.82, 0, 0.42, -0.18, createMat('#adb5bd', { metalness: 0.6 }));
        break;
      case 'glasses':
        addVoxel(headGroup, 0.76, 0.16, 0.22, 0, 0.24, -0.24, matDark);
        addVoxel(headGroup, 0.12, 0.12, 0.18, 0.36, 0.24, -0.24, createMat('#111111', { roughness: 0.1, metalness: 0.8 }));
        addVoxel(headGroup, 0.12, 0.12, 0.18, -0.36, 0.24, -0.24, createMat('#111111', { roughness: 0.1, metalness: 0.8 }));
        break;
      case 'cape':
        addVoxel(torso, torsoW * 0.92, 0.1, 0.95, 0, torsoH * 0.54, 0.34, matRed);
        break;
      case 'backpack':
        addVoxel(torso, 0.58, 0.46, 0.36, 0, torsoH * 0.62, 0.06, matBlue);
        break;
      case 'scarf':
        addVoxel(torso, 0.56, 0.16, 0.56, 0, torsoH * 0.36, -0.44, matRed);
        addVoxel(torso, 0.2, 0.12, 0.48, 0.18, torsoH * 0.34, -0.14, matRed);
        break;
      case 'wings':
        addVoxel(torso, 0.82, 0.1, 0.38, -0.78, torsoH * 0.42, 0.02, matGold);
        addVoxel(torso, 0.82, 0.1, 0.38, 0.78, torsoH * 0.42, 0.02, matGold);
        break;
      default:
        break;
    }
  }
}
