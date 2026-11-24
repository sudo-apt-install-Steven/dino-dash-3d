// Constrói modelos voxel articulados procedurais para cada espécie, com dezenas de cubos,
// padrões de cores, acessórios cúbicos e evolução visual.
import * as THREE from 'three';
import { getDinoSpec } from './DinoCatalog.js';
import { applySkinVariantToColors, getMutationActiveLevel, getMutationComputedProfile } from './DinoCustomization.js';
import { buildClaudeAccessoryGroup } from '../models/ClaudeVoxelModels.js';
import { attachSculptedAccessory, buildSculptedAccessoryStandalone, getAccessorySlot } from '../models/VoxelAccessories.js';
import { computeDinoAnchorPoints } from './DinoAnchors.js';
import { LIMITED_BODY_SPECS, applyLimitedDinoDetails } from '../models/LimitedDinoModels.js';

const AQUATIC_SPECIES = ['mosasaurus', 'elasmosaurus', 'dunkleosteus', 'liopleurodon', 'plesiosaurus', 'kronosaurus', 'archelon', 'abissal_espectral'];
const FLYING_SPECIES = ['quetzalcoatlus', 'pteranodon', 'tapejara', 'dimorphodon', 'hatzegopteryx', 'archaeopteryx', 'microraptor', 'chrono_wyvern', 'dragao_lunar'];

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
    const skinVariant = customConfig?.skinVariant || options?.skinVariant || 'normal';
    const basePalette = applyColors ? { ...spec.colors, ...customConfig } : { ...spec.colors };
    const colors = applySkinVariantToColors(basePalette, skinVariant);
    const pattern = colors?.pattern || customConfig?.pattern || 'solid';
    const accessory = customConfig?.accessory || 'none';
    const mutationId = customConfig?.mutation || options?.mutation || null;
    const mutationTier = options?.mutationTier ?? (mutationId ? getMutationActiveLevel(mutationId) : 1);
    const evolutionTier = options.evolutionTier || 0;
    const isGhost = dinoId === 'ghostgold' || options.ghost;
    const isMecha = !!spec.mecha || skinVariant === 'mecha' || !!colors.isMecha;
    const isShiny = skinVariant === 'shiny' || !!colors.isShiny;
    const isSecret = skinVariant === 'secret' || !!colors.isSecret;

    const root = new THREE.Group();
    root.name = `dino_${dinoId}`;

    // Paleta de materiais conforme padrão e variante escolhida (Shiny / Mecânico / Secreto)
    const isNeon = pattern === 'neon' || isMecha || isSecret;
    const emissiveMain = isSecret
      ? new THREE.Color('#a855f7')
      : isShiny
        ? new THREE.Color('#fde047')
        : isMecha
          ? new THREE.Color('#0ea5e9')
          : isNeon
            ? new THREE.Color(colors.primary)
            : (isGhost ? new THREE.Color('#ffda6a') : new THREE.Color(0x000000));
    const emissiveIntensity = isSecret ? 0.36 : isShiny ? 0.28 : isMecha ? 0.16 : isNeon ? 0.35 : (isGhost ? 0.25 : 0);

    const matPrimary = createMat(colors.primary, {
      emissive: emissiveMain,
      emissiveIntensity,
      transparent: isGhost,
      opacity: isGhost ? 0.84 : 1,
      metalness: isMecha ? 0.78 : isShiny ? 0.58 : (dinoId === 'ghostgold' ? 0.45 : 0.08),
      roughness: isMecha ? 0.26 : isShiny ? 0.22 : 0.65
    });
    const matPrimaryDark = createMat(darkenHex(colors.primary, 0.22), {
      emissive: emissiveMain,
      emissiveIntensity: emissiveIntensity * 0.5,
      transparent: isGhost,
      opacity: isGhost ? 0.84 : 1,
      metalness: isMecha ? 0.82 : isShiny ? 0.5 : 0.08,
      roughness: isMecha ? 0.28 : 0.65
    });
    const matSecondary = createMat(colors.secondary, {
      transparent: isGhost,
      opacity: isGhost ? 0.86 : 1,
      metalness: isMecha ? 0.65 : isShiny ? 0.45 : 0.05,
      roughness: isMecha ? 0.3 : 0.62
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

    // Proporções por espécie (suporta híbridos cabeça/corpo/cauda e dinos limitados!)
    const limitedSpec = LIMITED_BODY_SPECS[bodyId] || null;
    const isQuadruped = ['triceratops', 'styracosaurus', 'stegosaurus', 'ankylosaurus', 'brachiosaurus', 'kentrosaurus', 'diplodocus', 'argentinosaurus', 'amargasaurus', 'edmontonia'].includes(bodyId)
      || Boolean(limitedSpec?.proportions?.quadruped);
    const isAquatic = AQUATIC_SPECIES.includes(bodyId);
    const isFlying = FLYING_SPECIES.includes(bodyId);
    const isTailAquatic = AQUATIC_SPECIES.includes(tailId);
    const bodyScale = limitedSpec?.scale ?? (
      bodyId === 'compsognathus' || bodyId === 'dimorphodon' ? 0.68
      : bodyId === 'microraptor' ? 0.72
      : bodyId === 'archaeopteryx' ? 0.78
      : bodyId === 'oviraptor' ? 0.8
      : bodyId === 'gallimimus' || bodyId === 'tapejara' ? 0.86
      : bodyId === 'quetzalcoatlus' || bodyId === 'pteranodon' ? 0.92
      : bodyId === 'concavenator' || bodyId === 'corythosaurus' ? 0.95
      : bodyId === 'brachiosaurus' ? 1.24
      : bodyId === 'argentinosaurus' || bodyId === 'mosasaurus' ? 1.26
      : bodyId === 'kronosaurus' ? 1.2
      : bodyId === 'diplodocus' || bodyId === 'mecha_rex' ? 1.16
      : bodyId === 'giganotosaurus' || bodyId === 'liopleurodon' || bodyId === 'amargasaurus' ? 1.14
      : bodyId === 'archelon' || bodyId === 'indominus_voxel' ? 1.12
      : bodyId === 'acrocanthosaurus' ? 1.1
      : bodyId === 'raptor' || bodyId === 'dilophosaurus' || bodyId === 'deinonychus' || bodyId === 'utahraptor' || bodyId === 'cyber_raptor' ? 0.9
      : bodyId === 'ankylosaurus' || bodyId === 'kentrosaurus' || bodyId === 'dunkleosteus' || bodyId === 'edmontonia' || bodyId === 'chrono_wyvern' ? 1.05
      : 1.0
    );

    // Rig hierárquico para animações procedurais
    const rig = new THREE.Group();
    rig.scale.setScalar(bodyScale);
    root.add(rig);

    const torso = new THREE.Group();
    torso.position.set(0, isAquatic ? 0.62 : (isFlying ? 0.96 : (isQuadruped ? 0.88 : 1.08)), 0);
    rig.add(torso);

    // Corpo principal (vários blocos para textura voxel rica)
    const torsoW = isQuadruped ? 0.92 : 0.78;
    const torsoH = isQuadruped ? 0.66 : 0.72;
    const torsoD = isQuadruped ? 1.38 : 1.08;

    addVoxel(torso, torsoW, torsoH, torsoD, 0, 0, 0, matPrimary);
    addVoxel(torso, torsoW * 0.86, torsoH * 0.26, torsoD * 0.9, 0, -torsoH * 0.42, 0, matSecondary); // barriga
    addVoxel(torso, torsoW * 0.78, torsoH * 0.22, torsoD * 0.78, 0, torsoH * 0.45, 0.04, matPrimaryDark); // dorso
    addVoxel(torso, torsoW * 0.9, torsoH * 0.52, torsoD * 0.36, 0, 0.06, -torsoD * 0.34, matPrimary); // peito

    // Padrão visual (listras / manchas / degradê / camuflagem / neon / novos padrões)
    if (pattern === 'stripes' || pattern === 'neon' || pattern === 'tribal') {
      for (let i = -1; i <= 1; i++) {
        addVoxel(torso, torsoW + 0.05, torsoH * 0.65, 0.14, 0, 0.06, i * 0.34, matSpots);
      }
    } else if (pattern === 'spots' || pattern === 'camo' || pattern === 'scales') {
      addVoxel(torso, 0.22, 0.22, 0.24, torsoW * 0.44, 0.12, -0.2, matSpots);
      addVoxel(torso, 0.2, 0.2, 0.22, -torsoW * 0.44, -0.02, 0.16, matSpots);
      addVoxel(torso, 0.24, 0.18, 0.26, torsoW * 0.43, -0.05, 0.28, matSpots);
      addVoxel(torso, 0.2, 0.22, 0.22, -torsoW * 0.44, 0.14, -0.26, matSpots);
    } else if (pattern === 'gradient' || pattern === 'crystalline') {
      addVoxel(torso, torsoW + 0.02, torsoH * 0.28, torsoD * 0.96, 0, torsoH * 0.32, 0, matSpots);
    } else if (pattern === 'circuit' || pattern === 'magma_veins' || pattern === 'cosmic') {
      addVoxel(torso, torsoW + 0.05, 0.1, torsoD * 0.88, 0, 0.14, 0, matSpikes);
      addVoxel(torso, torsoW + 0.05, 0.08, torsoD * 0.72, 0, -0.08, 0.05, matSpots);
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
    } else if (bodyId === 'carnotaurus') {
      // Fileiras duplas de osteodermos dorsais + fileira lateral de tubérculos
      for (let i = 0; i < 4; i++) {
        const zOff = -0.38 + i * 0.25;
        const h = 0.15 + (i % 2) * 0.06;
        addVoxel(torso, 0.1, h, 0.13, -0.17, torsoH * 0.56, zOff, matSpikes);
        addVoxel(torso, 0.1, h, 0.13, 0.17, torsoH * 0.56, zOff, matSpikes);
      }
      for (let i = 0; i < 3; i++) {
        const zOff = -0.3 + i * 0.3;
        addVoxel(torso, 0.08, 0.1, 0.12, -torsoW * 0.52, 0.12, zOff, matPrimaryDark);
        addVoxel(torso, 0.08, 0.1, 0.12, torsoW * 0.52, 0.12, zOff, matPrimaryDark);
      }
    } else if (bodyId === 'trex') {
      // Dorso musculoso robusto de T-Rex com cristas baixas espaçadas
      for (let i = 0; i < 3; i++) {
        addVoxel(torso, 0.14, 0.13, 0.18, 0, torsoH * 0.55, -0.32 + i * 0.32, matPrimaryDark);
      }
    } else if (bodyId === 'argentinosaurus') {
      // Placas dérmicas largas de titanossauro
      for (let i = -1; i <= 1; i++) {
        addVoxel(torso, 0.24, 0.14, 0.28, -0.22, torsoH * 0.54, i * 0.38, matPrimaryDark);
        addVoxel(torso, 0.24, 0.14, 0.28, 0.22, torsoH * 0.54, i * 0.38, matPrimaryDark);
      }
    } else if (bodyId === 'dunkleosteus') {
      // Escudo placodermo encouraçado + quilha dorsal
      addVoxel(torso, torsoW + 0.14, 0.16, 0.62, 0, torsoH * 0.52, -0.22, matPrimaryDark);
      addVoxel(torso, 0.1, 0.42, 0.28, 0, torsoH * 0.64, 0.18, matSpikes);
    } else if (bodyId === 'mosasaurus' || bodyId === 'liopleurodon') {
      // Cristas hidrodinâmicas baixas ao longo da coluna
      for (let i = 0; i < 4; i++) {
        addVoxel(torso, 0.08, 0.14, 0.2, 0, torsoH * 0.54, -0.36 + i * 0.24, matSpikes);
      }
    } else if (bodyId === 'elasmosaurus' || bodyId === 'plesiosaurus') {
      // Dorso hidrodinâmico liso de plesiossauro
      addVoxel(torso, torsoW * 0.64, 0.1, torsoD * 0.68, 0, torsoH * 0.52, 0.04, matPrimaryDark);
      if (bodyId === 'plesiosaurus') {
        addVoxel(torso, torsoW * 0.42, 0.12, torsoD * 0.45, 0, torsoH * 0.56, -0.08, matSpikes);
      }
    } else if (bodyId === 'acrocanthosaurus') {
      // Crista neural muscular elevada contínua ao longo de todo o dorso
      const ridgeH = [0.28, 0.42, 0.48, 0.44, 0.3];
      ridgeH.forEach((rh, idx) => {
        addVoxel(torso, 0.22, rh, 0.22, 0, torsoH * 0.48 + rh * 0.42, -0.44 + idx * 0.22, matSpikes);
      });
    } else if (bodyId === 'concavenator') {
      // Corcova triangular icônica concentrada sobre os quadris
      addVoxel(torso, 0.16, 0.34, 0.32, 0, torsoH * 0.62, 0.18, matSpikes);
      addVoxel(torso, 0.12, 0.56, 0.18, 0, torsoH * 0.78, 0.2, matSpikes);
      addVoxel(torso, 0.1, 0.26, 0.16, 0, torsoH * 0.6, 0.36, matPrimaryDark);
    } else if (bodyId === 'amargasaurus') {
      // Fileiras paralelas de espinhos dorsais altos
      for (let i = 0; i < 4; i++) {
        const zOff = -0.48 + i * 0.3;
        addVoxel(torso, 0.08, 0.54 - i * 0.05, 0.12, -0.14, torsoH * 0.72, zOff, matSpikes);
        addVoxel(torso, 0.08, 0.54 - i * 0.05, 0.12, 0.14, torsoH * 0.72, zOff, matSpikes);
      }
    } else if (bodyId === 'edmontonia') {
      // Carapaça nodossauro larga + espinhos gigantes nos ombros projetados para frente
      addVoxel(torso, torsoW + 0.24, 0.22, torsoD + 0.06, 0, torsoH * 0.46, 0, matPrimaryDark);
      addVoxel(torso, 0.2, 0.16, 0.62, -torsoW * 0.64, 0.14, -0.46, matTooth);
      addVoxel(torso, 0.2, 0.16, 0.62, torsoW * 0.64, 0.14, -0.46, matTooth);
      addVoxel(torso, 0.38, 0.12, 0.14, -torsoW * 0.68, 0.12, 0.1, matSpikes);
      addVoxel(torso, 0.38, 0.12, 0.14, torsoW * 0.68, 0.12, 0.1, matSpikes);
    } else if (bodyId === 'archelon') {
      // Carapaça larga abobadada com quilhas longitudinais de tartaruga gigante
      addVoxel(torso, torsoW * 1.65, 0.24, torsoD * 1.18, 0, torsoH * 0.32, 0.02, matPrimaryDark);
      addVoxel(torso, torsoW * 1.25, 0.22, torsoD * 0.92, 0, torsoH * 0.52, 0.02, matPrimary);
      addVoxel(torso, 0.14, 0.14, torsoD * 0.86, 0, torsoH * 0.64, 0.02, matSpikes);
    } else if (bodyId === 'kronosaurus') {
      // Pliossauro compacto e largo com quilha hidrodinâmica dupla
      addVoxel(torso, torsoW * 1.18, 0.16, torsoD * 0.88, 0, torsoH * 0.44, -0.06, matPrimaryDark);
      addVoxel(torso, 0.12, 0.22, 0.34, 0, torsoH * 0.58, 0.16, matSpikes);
    } else if (bodyId === 'indominus_voxel') {
      // Híbrido alfa: espinhos pontiagudos serrilhados no dorso + placas laterais blindadas
      for (let i = 0; i < 4; i++) {
        addVoxel(torso, 0.08, 0.3 + (i % 2) * 0.1, 0.12, -0.14, torsoH * 0.62, -0.38 + i * 0.26, matSpikes);
        addVoxel(torso, 0.08, 0.3 + (i % 2) * 0.1, 0.12, 0.14, torsoH * 0.62, -0.38 + i * 0.26, matSpikes);
      }
      addVoxel(torso, torsoW + 0.14, 0.18, 0.65, 0, 0.1, -0.05, matPrimaryDark);
    } else if (bodyId === 'chrono_wyvern') {
      // Núcleo cristalino no peito + cristas temporais energizadas no dorso
      const coreMat = createMat('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 0.95 });
      addVoxel(torso, 0.28, 0.28, 0.14, 0, 0.08, -torsoD * 0.54, coreMat);
      for (let i = 0; i < 3; i++) {
        addVoxel(torso, 0.12, 0.32, 0.16, 0, torsoH * 0.64, -0.3 + i * 0.3, coreMat);
      }
    } else if (bodyId === 'archaeopteryx' || bodyId === 'microraptor') {
      // Dorso emplumado aerodinâmico
      addVoxel(torso, torsoW * 0.92, 0.14, torsoD * 0.85, 0, torsoH * 0.5, 0.05, matSpikes);
    } else {
      // Fileira padrão de espinhos dorsais estilizados
      for (let i = 0; i < 3; i++) {
        addVoxel(torso, 0.1, 0.16, 0.16, 0, torsoH * 0.56, -0.3 + i * 0.3, matSpikes);
      }
    }

    // Pescoço e Cabeça articulados
    const neckPivot = new THREE.Group();
    const neckLen = headId === 'brachiosaurus' || headId === 'argentinosaurus' || headId === 'elasmosaurus' ? 1.32
      : (headId === 'diplodocus' || headId === 'amargasaurus' ? 1.15
        : (headId === 'plesiosaurus' ? 0.92
          : (headId === 'gallimimus' || headId === 'hatzegopteryx' ? 0.72
            : (headId === 'kronosaurus' || headId === 'archelon' ? 0.22
              : (isAquatic ? 0.26 : (isQuadruped ? 0.34 : 0.48))))));
    neckPivot.position.set(0, isAquatic ? 0.06 : torsoH * 0.25, -torsoD * 0.45);
    if (isAquatic && headId !== 'elasmosaurus' && headId !== 'plesiosaurus') {
      // Alinha cabeça hidrodinamicamente para frente na água
      neckPivot.rotation.x = -0.82;
    } else if (isAquatic && (headId === 'elasmosaurus' || headId === 'plesiosaurus')) {
      neckPivot.rotation.x = -0.35;
    }
    torso.add(neckPivot);

    addVoxel(neckPivot, headId === 'hatzegopteryx' ? 0.48 : 0.42, neckLen, 0.42, 0, neckLen * 0.42, -0.08, matPrimary);
    addVoxel(neckPivot, 0.32, neckLen * 0.85, 0.16, 0, neckLen * 0.4, 0.09, matSecondary);
    if (headId === 'amargasaurus') {
      // Espinhos cervicais paralelos icônicos do Amargasaurus
      for (let ns = 0; ns < 3; ns++) {
        const ny = 0.28 + ns * 0.3;
        addVoxel(neckPivot, 0.07, 0.14, 0.44, -0.13, ny, 0.16, matSpikes);
        addVoxel(neckPivot, 0.07, 0.14, 0.44, 0.13, ny, 0.16, matSpikes);
      }
    }

    const headGroup = new THREE.Group();
    headGroup.position.set(0, neckLen * 0.88, -0.14);
    if (isAquatic && headId !== 'elasmosaurus' && headId !== 'plesiosaurus') {
      headGroup.rotation.x = 0.82;
    } else if (isAquatic && (headId === 'elasmosaurus' || headId === 'plesiosaurus')) {
      headGroup.rotation.x = 0.35;
    }
    neckPivot.add(headGroup);

    const headW = headId === 'triceratops' || headId === 'styracosaurus' ? 0.72
      : (headId === 'trex' || headId === 'kronosaurus' || headId === 'indominus_voxel' ? 0.76
        : (headId === 'carnotaurus' || headId === 'acrocanthosaurus' ? 0.66
          : (headId === 'pachycephalosaurus' || headId === 'dunkleosteus' ? 0.74
            : (headId === 'archelon' ? 0.54
              : (isFlying ? 0.44 : 0.66)))));
    const headH = headId === 'giganotosaurus' || headId === 'dunkleosteus' || headId === 'kronosaurus' ? 0.6
      : (headId === 'trex' || headId === 'acrocanthosaurus' || headId === 'indominus_voxel' ? 0.6
        : (headId === 'carnotaurus' ? 0.62 : (isFlying ? 0.38 : 0.52)));
    const headD = headId === 'spinosaurus' || headId === 'baryonyx' || headId === 'mosasaurus' || headId === 'kronosaurus' ? 1.12
      : (headId === 'hatzegopteryx' ? 1.24
        : (headId === 'trex' || headId === 'indominus_voxel' ? 0.88
          : (headId === 'carnotaurus' || headId === 'archelon' ? 0.62 : (isFlying ? 1.02 : 0.78))));
    addVoxel(headGroup, headW, headH, headD, 0, 0.16, -0.18, matPrimary);
    // Focinho (curto/alto no Carnotauro, massivo no T-Rex, estreito/longo nos espinossaurídeos)
    const snoutW = (headId === 'spinosaurus' || headId === 'baryonyx') ? headW * 0.66
      : (headId === 'trex' ? headW * 0.88 : (headId === 'carnotaurus' ? headW * 0.8 : headW * 0.84));
    const snoutH = headId === 'carnotaurus' ? headH * 0.74
      : (headId === 'trex' ? headH * 0.7 : headH * 0.64);
    const snoutD = headId === 'carnotaurus' ? headD * 0.34
      : (headId === 'trex' ? headD * 0.5 : headD * 0.46);
    const snoutZ = headId === 'carnotaurus' ? -headD * 0.52 : -headD * 0.58;
    addVoxel(headGroup, snoutW, snoutH, snoutD, 0, headId === 'carnotaurus' ? 0.13 : 0.1, snoutZ, matPrimary);

    // Mandíbula inferior articulada (abre no rugido/ataque/vitória)
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.02, -0.04);
    headGroup.add(jaw);
    const jawH = headId === 'trex' ? 0.2 : 0.16;
    addVoxel(jaw, headW * 0.76, jawH, headD * 0.82, 0, -0.06, -headD * 0.34, matSecondary);
    // Dentes brancos voxel para carnívoros (T-Rex com dentição dupla proeminente)
    if (headSpec.dinoClass === 'carnivore' || headId === 'spinosaurus') {
      const toothCount = headId === 'trex' ? 4 : 3;
      const toothStep = headId === 'carnotaurus' ? 0.14 : 0.17;
      for (let t = 0; t < toothCount; t++) {
        const tz = -0.26 - t * toothStep;
        const th = headId === 'trex' ? 0.12 : 0.1;
        addVoxel(headGroup, 0.06, th, 0.06, snoutW * 0.38, -0.05, tz, matTooth);
        addVoxel(headGroup, 0.06, th, 0.06, -snoutW * 0.38, -0.05, tz, matTooth);
        if (headId === 'trex' && t < 3) {
          addVoxel(jaw, 0.055, 0.09, 0.055, snoutW * 0.32, 0.04, tz + 0.05, matTooth);
          addVoxel(jaw, 0.055, 0.09, 0.055, -snoutW * 0.32, 0.04, tz + 0.05, matTooth);
        }
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
    } else if (headId === 'trex') {
      // Cristas lacrimais robustas e arco nasal retangular do T-Rex
      addVoxel(headGroup, 0.14, 0.12, 0.34, -0.24, 0.48, -0.32, matPrimaryDark);
      addVoxel(headGroup, 0.14, 0.12, 0.34, 0.24, 0.48, -0.32, matPrimaryDark);
      addVoxel(headGroup, 0.32, 0.09, 0.42, 0, 0.47, -0.42, matPrimaryDark);
    } else if (headId === 'carnotaurus') {
      // Chifres 3D volumétricos (base larga + meio curvo + ponta afiada) + crista supraorbital
      for (const side of [-1, 1]) {
        addVoxel(headGroup, 0.14, 0.1, 0.32, side * 0.24, 0.46, -0.2, matPrimaryDark);
        const hornPivot = new THREE.Group();
        hornPivot.position.set(side * 0.28, 0.48, -0.18);
        hornPivot.rotation.z = -side * 0.36;
        hornPivot.rotation.x = 0.18;
        headGroup.add(hornPivot);
        addVoxel(hornPivot, 0.16, 0.16, 0.18, 0, 0.06, 0, matPrimaryDark);
        const midPivot = new THREE.Group();
        midPivot.position.set(0, 0.14, -0.02);
        midPivot.rotation.z = -side * 0.18;
        midPivot.rotation.x = -0.24;
        hornPivot.add(midPivot);
        addVoxel(midPivot, 0.12, 0.2, 0.13, 0, 0.08, 0, matSpikes);
        addVoxel(midPivot, 0.07, 0.16, 0.08, side * 0.01, 0.22, -0.02, matTooth);
      }
    } else if (headId === 'pachycephalosaurus') {
      addVoxel(headGroup, 0.56, 0.3, 0.56, 0, 0.5, -0.2, matSpikes);
    } else if (headId === 'allosaurus' || headId === 'giganotosaurus') {
      for (const side of [-1, 1]) {
        addVoxel(headGroup, 0.11, 0.16, 0.3, side * 0.24, 0.44, -0.32, matPrimaryDark);
        addVoxel(headGroup, 0.09, 0.14, 0.18, side * 0.25, 0.54, -0.36, matSpikes);
      }
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
    } else if (headId === 'pteranodon' || headId === 'dimorphodon') {
      addVoxel(headGroup, 0.12, 0.28, 0.78, 0, 0.38, 0.22, matSpikes);
    } else if (headId === 'tapejara') {
      // Crista alta colorida de Tapejara
      addVoxel(headGroup, 0.08, 0.76, 0.62, 0, 0.56, -0.06, matSpikes);
      addVoxel(headGroup, 0.1, 0.44, 0.34, 0, 0.48, 0.18, matEyeIris);
    } else if (headId === 'dunkleosteus') {
      addVoxel(headGroup, headW + 0.16, 0.32, 0.64, 0, 0.34, -0.22, matPrimaryDark);
      addVoxel(headGroup, 0.14, 0.22, 0.34, -0.26, -0.04, -0.44, matTooth);
      addVoxel(headGroup, 0.14, 0.22, 0.34, 0.26, -0.04, -0.44, matTooth);
    } else if (headId === 'utahraptor') {
      addVoxel(headGroup, 0.16, 0.26, 0.48, 0, 0.45, 0.14, matSpikes);
    } else if (headId === 'corythosaurus') {
      // Elmo semicircular característico (crista de capacete coríntio)
      addVoxel(headGroup, 0.14, 0.52, 0.62, 0, 0.54, -0.06, matSpikes);
      addVoxel(headGroup, 0.12, 0.34, 0.42, 0, 0.68, 0.04, matSecondary);
    } else if (headId === 'acrocanthosaurus' || headId === 'concavenator') {
      addVoxel(headGroup, 0.12, 0.14, 0.42, -0.22, 0.46, -0.34, matSpikes);
      addVoxel(headGroup, 0.12, 0.14, 0.42, 0.22, 0.46, -0.34, matSpikes);
    } else if (headId === 'archelon') {
      // Bico adunco de tartaruga marinha gigante
      addVoxel(headGroup, 0.28, 0.22, 0.32, 0, 0.04, -0.62, matSpikes);
    } else if (headId === 'kronosaurus') {
      // Crista craniana alongada de pliossauro
      addVoxel(headGroup, 0.34, 0.12, 0.72, 0, 0.44, -0.26, matPrimaryDark);
    } else if (headId === 'hatzegopteryx') {
      // Bico em lança + quilha cranial baixa
      addVoxel(headGroup, 0.12, 0.2, 0.96, 0, 0.34, -0.42, matSpikes);
    } else if (headId === 'archaeopteryx' || headId === 'microraptor') {
      // Penacho de penas na nuca + bico afilado
      addVoxel(headGroup, 0.24, 0.16, 0.34, 0, 0.12, -0.78, matSpikes);
      addVoxel(headGroup, 0.18, 0.22, 0.42, 0, 0.4, 0.2, matSpikes);
    } else if (headId === 'indominus_voxel') {
      // Chifres supraorbitais + espinhos na nuca
      addVoxel(headGroup, 0.14, 0.24, 0.26, -0.28, 0.5, -0.24, matSpikes);
      addVoxel(headGroup, 0.14, 0.24, 0.26, 0.28, 0.5, -0.24, matSpikes);
      addVoxel(headGroup, 0.1, 0.22, 0.32, 0, 0.46, 0.22, matTooth);
    } else if (headId === 'chrono_wyvern') {
      // Chifres duplos cristalinos varridos para trás
      const hornMat = createMat('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 0.9 });
      addVoxel(headGroup, 0.12, 0.18, 0.64, -0.24, 0.46, 0.16, hornMat);
      addVoxel(headGroup, 0.12, 0.18, 0.64, 0.24, 0.46, 0.16, hornMat);
    }

    // Visual Mecânico / Transformers / Mecha-Godzilla + Shiny / Secreto
    if (isMecha) {
      const armorMat = createMat('#94a3b8', { metalness: 0.85, roughness: 0.22 });
      const glowReactor = createMat('#00f5d4', { emissive: '#06b6d4', emissiveIntensity: 1.05, roughness: 0.15 });
      const visorLed = createMat(colors.eye || '#38bdf8', { emissive: colors.eye || '#38bdf8', emissiveIntensity: 1.0 });
      // Visor cibernético + antenas de cabeça
      addVoxel(headGroup, headW + 0.12, 0.16, 0.26, 0, eyeY + 0.02, eyeZ - 0.12, visorLed);
      addVoxel(headGroup, 0.08, 0.34, 0.08, -headW * 0.42, 0.46, 0, armorMat);
      addVoxel(headGroup, 0.08, 0.34, 0.08, headW * 0.42, 0.46, 0, armorMat);
      // Núcleo reator no peito + ombreiras angulares + propulsores dorsais
      addVoxel(torso, 0.34, 0.34, 0.16, 0, 0.08, -torsoD * 0.54, glowReactor);
      addVoxel(torso, 0.3, 0.34, 0.38, -torsoW * 0.64, torsoH * 0.28, -0.2, armorMat);
      addVoxel(torso, 0.3, 0.34, 0.38, torsoW * 0.64, torsoH * 0.28, -0.2, armorMat);
      for (let m = 0; m < 3; m++) {
        addVoxel(torso, 0.14, 0.32 + m * 0.06, 0.18, -0.14, torsoH * 0.64, -0.3 + m * 0.28, glowReactor);
        addVoxel(torso, 0.14, 0.32 + m * 0.06, 0.18, 0.14, torsoH * 0.64, -0.3 + m * 0.28, glowReactor);
      }
    }
    if (isShiny || isSecret) {
      const auraCol = isSecret ? '#e879f9' : '#fde047';
      const starMat = createMat(auraCol, { emissive: auraCol, emissiveIntensity: 0.95, roughness: 0.15 });
      addVoxel(torso, 0.16, 0.16, 0.16, -0.68, torsoH * 0.55, -0.22, starMat);
      addVoxel(torso, 0.16, 0.16, 0.16, 0.68, torsoH * 0.55, 0.22, starMat);
      addVoxel(headGroup, 0.18, 0.18, 0.18, 0, 0.64, -0.18, starMat);
    }

    // Cauda segmentada (4 segmentos articulados — T-Rex com base pesada para contrabalancear o crânio)
    const tailSegments = [];
    let tailParent = torso;
    const isHeavyTail = tailId === 'trex' || tailId === 'giganotosaurus';
    for (let s = 0; s < 4; s++) {
      const segPivot = new THREE.Group();
      segPivot.position.set(0, s === 0 ? 0.04 : 0, s === 0 ? torsoD * 0.5 : 0.34);
      tailParent.add(segPivot);
      const scaleFactor = (1 - s * 0.2) * (isHeavyTail && s < 2 ? 1.18 : 1.0);
      addVoxel(segPivot, 0.42 * scaleFactor, 0.36 * scaleFactor, isHeavyTail ? 0.42 : 0.38, 0, 0, 0.18, s % 2 === 0 ? matPrimary : matPrimaryDark);
      if (tailId === 'ankylosaurus' && s === 3) {
        addVoxel(segPivot, 0.42, 0.34, 0.42, 0, 0, 0.36, matSpikes);
      } else if ((tailId === 'stegosaurus' || tailId === 'kentrosaurus') && s >= 2) {
        addVoxel(segPivot, 0.54, 0.1, 0.09, 0, 0.12, 0.24, matSpikes);
      } else if (tailId === 'spinosaurus' && s >= 1) {
        addVoxel(segPivot, 0.08, 0.36, 0.28, 0, 0.24, 0.18, matSpikes);
      } else if ((tailId === 'oviraptor' || tailId === 'deinonychus' || tailId === 'gallimimus' || tailId === 'archaeopteryx' || tailId === 'microraptor') && s === 3) {
        // Leque de penas na ponta da cauda
        addVoxel(segPivot, 0.56, 0.08, 0.48, 0, 0.08, 0.32, matSpikes);
        addVoxel(segPivot, 0.4, 0.12, 0.34, 0, 0.14, 0.34, matSecondary);
      } else if (tailId === 'chrono_wyvern' && s === 3) {
        // Ponta de cauda cristalina em diamante
        addVoxel(segPivot, 0.48, 0.12, 0.48, 0, 0.04, 0.36, matSpikes);
      } else if (tailId === 'diplodocus' && s === 3) {
        addVoxel(segPivot, 0.12, 0.12, 0.72, 0, 0, 0.42, matSpikes);
      } else if (isTailAquatic && s === 3) {
        // Barbatana caudal dupla aquática
        addVoxel(segPivot, 0.74, 0.1, 0.48, 0, 0, 0.34, matSpikes);
        addVoxel(segPivot, 0.1, 0.68, 0.4, 0, 0.04, 0.34, matSecondary);
      }
      tailSegments.push(segPivot);
      tailParent = segPivot;
    }

    // Pernas articuladas (coxas + canelas + pés) — apenas para terrestres e voadores
    const buildLeg = (sideX, zPos, isFront = false, scale = 1.0) => {
      const hip = new THREE.Group();
      hip.position.set(sideX, -torsoH * 0.32, zPos);
      torso.add(hip);

      const thighH = (isQuadruped ? 0.42 : 0.48) * scale;
      const shinH = (isQuadruped ? 0.38 : 0.42) * scale;
      addVoxel(hip, 0.26 * scale, thighH, 0.3 * scale, 0, -thighH * 0.4, 0, matPrimaryDark);

      const knee = new THREE.Group();
      knee.position.set(0, -thighH * 0.8, 0);
      hip.add(knee);
      addVoxel(knee, 0.2 * scale, shinH, 0.22 * scale, 0, -shinH * 0.45, 0.02, matPrimary);

      const foot = new THREE.Group();
      foot.position.set(0, -shinH * 0.85, 0);
      knee.add(foot);
      addVoxel(foot, 0.26 * scale, 0.12 * scale, (isFront ? 0.26 : 0.36) * scale, 0, -0.04 * scale, -0.07 * scale, matSecondary);
      addVoxel(foot, 0.07 * scale, 0.08 * scale, 0.12 * scale, -0.07 * scale, -0.05 * scale, -0.26 * scale, matTooth);
      addVoxel(foot, 0.07 * scale, 0.08 * scale, 0.12 * scale, 0.07 * scale, -0.05 * scale, -0.26 * scale, matTooth);
      if (!isFront && (bodyId === 'raptor' || bodyId === 'deinonychus' || bodyId === 'utahraptor')) {
        // Garra em foice erguida característica dos dromeossaurídeos
        const innerSide = sideX < 0 ? 1 : -1;
        addVoxel(foot, 0.055 * scale, 0.14 * scale, 0.14 * scale, innerSide * 0.11 * scale, 0.05 * scale, -0.24 * scale, matTooth);
      }

      return { hip, knee, foot };
    };

    // Hidronadadeiras articuladas (ombro/quadril + pá distal) para dinos aquáticos (ZERO patas terrestres)
    const buildFlipper = (sideX, zPos, scale = 1.0) => {
      const hip = new THREE.Group();
      hip.position.set(sideX, -torsoH * 0.2, zPos);
      torso.add(hip);
      const dir = sideX < 0 ? -1 : 1;
      addVoxel(hip, 0.56 * scale, 0.09, 0.34 * scale, dir * 0.3 * scale, -0.02, 0.06, matPrimaryDark);

      const outer = new THREE.Group();
      outer.position.set(dir * 0.54 * scale, -0.02, 0.08);
      hip.add(outer);
      addVoxel(outer, 0.42 * scale, 0.07, 0.24 * scale, dir * 0.2 * scale, 0, 0.08, matSpikes);
      return { hip, outer, isFlipper: true };
    };

    // Patas finas e garras posteriores aerodinâmicas para pterossauros voadores
    const buildPterosaurTalon = (sideX) => {
      const hip = new THREE.Group();
      hip.position.set(sideX * 0.72, -torsoH * 0.26, 0.34);
      hip.rotation.x = 0.65;
      torso.add(hip);
      addVoxel(hip, 0.12, 0.28, 0.14, 0, -0.12, 0.04, matPrimaryDark);
      if (bodyId === 'microraptor') {
        // Asas traseiras emplumadas exclusivas do Microraptor (4 asas!)
        const dir = sideX < 0 ? -1 : 1;
        addVoxel(hip, 0.54, 0.06, 0.28, dir * 0.28, -0.14, 0.08, matSpikes);
      }
      const knee = new THREE.Group();
      knee.position.set(0, -0.24, 0.04);
      knee.rotation.x = 0.35;
      hip.add(knee);
      addVoxel(knee, 0.09, 0.26, 0.1, 0, -0.12, 0.04, matPrimary);
      const foot = new THREE.Group();
      foot.position.set(0, -0.24, 0.04);
      knee.add(foot);
      addVoxel(foot, 0.14, 0.07, 0.22, 0, -0.02, -0.06, matSecondary);
      addVoxel(foot, 0.04, 0.05, 0.12, -0.04, -0.03, -0.18, matTooth);
      addVoxel(foot, 0.04, 0.05, 0.12, 0.04, -0.03, -0.18, matTooth);
      return { hip, knee, foot, isPteroTalon: true };
    };

    let legL;
    let legR;
    if (isAquatic) {
      // Aquáticos não têm pés nem patas: nadadeiras pélvicas traseiras reais!
      legL = buildFlipper(-torsoW * 0.44, torsoD * 0.28, 0.92);
      legR = buildFlipper(torsoW * 0.44, torsoD * 0.28, 0.92);
    } else if (isFlying) {
      legL = buildPterosaurTalon(-torsoW * 0.42);
      legR = buildPterosaurTalon(torsoW * 0.42);
    } else {
      legL = buildLeg(-torsoW * 0.44, isQuadruped ? 0.38 : 0.08);
      legR = buildLeg(torsoW * 0.44, isQuadruped ? 0.38 : 0.08);
    }

    let armL;
    let armR;
    if (isQuadruped) {
      armL = buildLeg(-torsoW * 0.44, -0.44, true);
      armR = buildLeg(torsoW * 0.44, -0.44, true);
    } else if (isAquatic) {
      // Nadadeiras peitorais dianteiras largas para nado veloz (Archelon tem nadadeiras gigantes)
      const frontFlipScale = bodyId === 'archelon' ? 1.62 : (bodyId === 'kronosaurus' ? 1.44 : 1.32);
      armL = buildFlipper(-torsoW * 0.46, -torsoD * 0.24, frontFlipScale);
      armR = buildFlipper(torsoW * 0.46, -torsoD * 0.24, frontFlipScale);
    } else {
      const buildArm = (sideX) => {
        const shoulder = new THREE.Group();
        shoulder.position.set(sideX, isFlying ? 0.08 : -0.1, -torsoD * 0.3);
        torso.add(shoulder);
        const dir = sideX < 0 ? -1 : 1;
        if (isFlying) {
          // Asa articulada em 2 estágios (braço interno + ponta longa da membrana)
          addVoxel(shoulder, 0.96, 0.09, 0.42, dir * 0.48, 0.04, 0.06, matPrimaryDark);
          addVoxel(shoulder, 0.14, 0.09, 0.22, dir * 0.88, -0.02, -0.16, matTooth); // garra do punho
          const outer = new THREE.Group();
          outer.position.set(dir * 0.94, 0.03, 0.04);
          shoulder.add(outer);
          addVoxel(outer, 0.86, 0.06, 0.38, dir * 0.44, 0.0, 0.12, matSpikes);
          addVoxel(outer, 0.48, 0.05, 0.2, dir * 0.96, -0.02, 0.22, matSecondary);
          return { hip: shoulder, outer, isWing: true };
        }
        if (bodyId === 'carnotaurus') {
          // Braços vestigiais minúsculos e colados ao peito (característica marcante do Carnotauro)
          addVoxel(shoulder, 0.09, 0.14, 0.1, dir * -0.02, -0.05, -0.03, matPrimaryDark);
          return { hip: shoulder };
        }
        if (bodyId === 'trex') {
          // Braços curtos articulados com antebraço e 2 dedos/garras
          addVoxel(shoulder, 0.13, 0.2, 0.13, 0, -0.08, -0.04, matPrimaryDark);
          addVoxel(shoulder, 0.11, 0.16, 0.12, 0, -0.18, -0.11, matPrimary);
          addVoxel(shoulder, 0.045, 0.06, 0.13, -0.04, -0.24, -0.18, matTooth);
          addVoxel(shoulder, 0.045, 0.06, 0.13, 0.04, -0.24, -0.18, matTooth);
          return { hip: shoulder };
        }
        const armLen = bodyId === 'therizinosaurus' ? 0.48 : (bodyId === 'indominus_voxel' ? 0.42 : (bodyId === 'baryonyx' ? 0.38 : 0.28));
        addVoxel(shoulder, 0.14, armLen, 0.16, 0, -armLen * 0.4, -0.06, matPrimaryDark);
        if (bodyId === 'therizinosaurus' || bodyId === 'indominus_voxel') {
          // 3 garras gigantes distintas em foice
          const clawLen = bodyId === 'therizinosaurus' ? 0.56 : 0.36;
          addVoxel(shoulder, 0.045, 0.07, clawLen * 0.9, -0.06, -armLen * 0.85, -clawLen * 0.58, matTooth);
          addVoxel(shoulder, 0.05, 0.07, clawLen, 0, -armLen * 0.85, -clawLen * 0.64, matTooth);
          addVoxel(shoulder, 0.045, 0.07, clawLen * 0.9, 0.06, -armLen * 0.85, -clawLen * 0.58, matTooth);
        } else if (bodyId === 'utahraptor' || bodyId === 'raptor' || bodyId === 'deinonychus') {
          if (bodyId !== 'raptor') {
            addVoxel(shoulder, 0.08, 0.26, 0.38, dir * 0.06, -armLen * 0.45, 0.08, matSpikes);
          }
          addVoxel(shoulder, 0.045, 0.07, 0.26, -0.05, -armLen * 0.86, -0.18, matTooth);
          addVoxel(shoulder, 0.05, 0.07, 0.3, 0, -armLen * 0.88, -0.22, matTooth);
          addVoxel(shoulder, 0.045, 0.07, 0.26, 0.05, -armLen * 0.86, -0.18, matTooth);
        } else if (bodyId === 'allosaurus' || bodyId === 'giganotosaurus') {
          addVoxel(shoulder, 0.05, 0.07, 0.22, -0.05, -armLen * 0.85, -0.16, matTooth);
          addVoxel(shoulder, 0.05, 0.07, 0.24, 0, -armLen * 0.87, -0.18, matTooth);
          addVoxel(shoulder, 0.05, 0.07, 0.22, 0.05, -armLen * 0.85, -0.16, matTooth);
        } else if (bodyId === 'baryonyx') {
          addVoxel(shoulder, 0.12, 0.12, 0.34, 0, -armLen * 0.88, -0.24, matTooth);
        } else if (bodyId === 'oviraptor') {
          addVoxel(shoulder, 0.08, 0.24, 0.36, dir * 0.06, -armLen * 0.45, 0.08, matSpikes);
          addVoxel(shoulder, 0.1, 0.08, 0.18, 0, -armLen * 0.85, -0.1, matTooth);
        } else if (bodyId === 'iguanodon') {
          addVoxel(shoulder, 0.12, 0.12, 0.36, 0, -armLen * 0.85, -0.24, matTooth);
        } else {
          addVoxel(shoulder, 0.12, 0.08, 0.18, 0, -armLen * 0.85, -0.12, matTooth);
        }
        return { hip: shoulder };
      };
      armL = buildArm(-torsoW * 0.48);
      armR = buildArm(torsoW * 0.48);
    }

    // Detalhes esculpidos exclusivos dos 13 dinossauros limitados
    if (limitedSpec) {
      applyLimitedDinoDetails(bodyId, {
        root,
        rig,
        torso,
        neckPivot,
        headGroup,
        jaw,
        eyeGroups,
        tailSegments,
        torsoW,
        torsoH,
        torsoD,
        colors,
        materials: { matPrimary, matPrimaryDark, matSecondary, matSpots, matSpikes, matEyeWhite, matEyeIris, matPupil, matTooth },
        addVoxel,
        createMat
      });
    }

    // Acessórios cúbicos (multi-slot simultâneo até 6 slots) + Mutações 3D (incluindo +2/+4/+6/+8 Patas articuladas) + skins sazonais
    const extraLegs = [];
    const rawAccList = Array.isArray(customConfig?.accessories) && customConfig.accessories.length
      ? customConfig.accessories
      : (accessory && accessory !== 'none' ? [accessory] : []);
    const usedSlots = new Set();
    const accList = [];
    for (const accId of rawAccList) {
      if (!accId || accId === 'none') continue;
      const slot = getAccessorySlot(accId);
      if (slot && usedSlots.has(slot)) continue;
      if (slot) usedSlots.add(slot);
      accList.push(accId);
    }
    // Sistema de Pontos de Encaixe por espécie e postura (Parte 1.6)
    const anchors = computeDinoAnchorPoints({
      bodyId,
      headId,
      isQuadruped,
      isAquatic,
      isFlying,
      torsoW,
      torsoH,
      torsoD,
      neckLen,
      headW,
      headH,
      headD,
      hasFrill: Boolean(headGroup.userData?.hasFrill),
      frillTopY: headGroup.userData?.frillTopY,
      frillFrontZ: headGroup.userData?.frillFrontZ
    });
    const anchorCtx = {
      anchors,
      neckPivot,
      bodyId,
      headId,
      isQuadruped,
      isAquatic,
      isFlying,
      neckLen,
      headW,
      headH,
      headD
    };

    for (const accId of accList) {
      const sculpted = attachSculptedAccessory(accId, headGroup, torso, torsoW, torsoH, torsoD, anchorCtx);
      if (!sculpted) {
        DinoFactory._attachAccessory(accId, headGroup, torso, torsoW, torsoH, torsoD);
      }
    }
    DinoFactory._attachMutation(mutationId, headGroup, torso, torsoW, torsoH, torsoD, {
      mutationTier,
      matPrimary,
      matPrimaryDark,
      matSecondary,
      matTooth,
      extraLegs,
      isAquatic,
      isFlying
    });
    if (customConfig?.partyCrown && !accList.includes('crown') && !usedSlots.has('head')) {
      const sculptedCrown = attachSculptedAccessory('crown', headGroup, torso, torsoW, torsoH, torsoD, anchorCtx);
      if (!sculptedCrown) {
        DinoFactory._attachAccessory('crown', headGroup, torso, torsoW, torsoH, torsoD);
      }
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
      extraLegs,
      bodyId,
      anchors,
      posture: anchors.posture,
      isQuadruped,
      isAquatic,
      isFlying,
      hasBaseLegs: !isAquatic,
      hasLegs: !isAquatic || extraLegs.length > 0,
      mutationId,
      mutationTier,
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
      case 'diving_mask': {
        const maskMat = createMat('#0ea5e9', { transparent: true, opacity: 0.72, emissive: '#0284c7', emissiveIntensity: 0.3 });
        addVoxel(headGroup, 0.78, 0.24, 0.24, 0, 0.22, -0.26, matDark);
        addVoxel(headGroup, 0.68, 0.18, 0.14, 0, 0.22, -0.35, maskMat);
        addVoxel(headGroup, 0.11, 0.56, 0.11, 0.44, 0.48, -0.14, matGold);
        break;
      }
      case 'sub_jetpack': {
        const tankMat = createMat('#0284c7', { metalness: 0.65, roughness: 0.25 });
        const glowCyan = createMat('#38bdf8', { emissive: '#00f5d4', emissiveIntensity: 0.95 });
        addVoxel(torso, 0.24, 0.52, 0.24, -0.24, torsoH * 0.62, 0.2, tankMat);
        addVoxel(torso, 0.24, 0.52, 0.24, 0.24, torsoH * 0.62, 0.2, tankMat);
        addVoxel(torso, 0.2, 0.16, 0.2, -0.24, torsoH * 0.34, 0.32, glowCyan);
        addVoxel(torso, 0.2, 0.16, 0.2, 0.24, torsoH * 0.34, 0.32, glowCyan);
        break;
      }
      case 'star_cape': {
        const velvet = createMat('#312e81', { roughness: 0.55 });
        const starGold = createMat('#fde047', { emissive: '#f59e0b', emissiveIntensity: 0.85 });
        addVoxel(torso, 0.96, 0.62, 0.12, 0, torsoH * 0.44, 0.56, velvet);
        addVoxel(torso, 0.24, 0.24, 0.08, 0, torsoH * 0.52, 0.63, starGold);
        addVoxel(torso, 0.16, 0.16, 0.08, -0.26, torsoH * 0.32, 0.63, starGold);
        addVoxel(torso, 0.16, 0.16, 0.08, 0.26, torsoH * 0.32, 0.63, starGold);
        break;
      }
      case 'cyber_armor': {
        const alloy = createMat('#64748b', { metalness: 0.85, roughness: 0.2 });
        const neonC = createMat('#00f5d4', { emissive: '#06b6d4', emissiveIntensity: 0.95 });
        addVoxel(torso, torsoW + 0.18, 0.26, torsoD * 0.55, 0, torsoH * 0.45, -0.1, alloy);
        addVoxel(torso, 0.34, 0.34, 0.38, -torsoW * 0.58, torsoH * 0.36, -0.15, alloy);
        addVoxel(torso, 0.34, 0.34, 0.38, torsoW * 0.58, torsoH * 0.36, -0.15, alloy);
        addVoxel(torso, 0.28, 0.28, 0.12, 0, 0.1, -torsoD * 0.52, neonC);
        break;
      }
      case 'mecha_wings': {
        const blade = createMat('#cbd5e1', { metalness: 0.82, roughness: 0.2 });
        const jet = createMat('#38bdf8', { emissive: '#0284c7', emissiveIntensity: 0.95 });
        for (const s of [-1, 1]) {
          addVoxel(torso, 0.72, 0.12, 0.32, s * 0.64, torsoH * 0.52, 0.08, blade);
          addVoxel(torso, 0.58, 0.09, 0.24, s * 1.16, torsoH * 0.6, 0.18, blade);
          addVoxel(torso, 0.34, 0.08, 0.14, s * 0.88, torsoH * 0.52, 0.24, jet);
        }
        break;
      }
      case 'floating_crystal': {
        const cMat = createMat('#2dd4bf', { emissive: '#14b8a6', emissiveIntensity: 0.95, roughness: 0.15 });
        addVoxel(headGroup, 0.24, 0.42, 0.24, 0, 0.82, -0.14, cMat);
        addVoxel(headGroup, 0.32, 0.2, 0.32, 0, 0.82, -0.14, cMat);
        break;
      }
      case 'cosmic_horns': {
        const gal = createMat('#a855f7', { emissive: '#7e22ce', emissiveIntensity: 0.85, metalness: 0.35 });
        const tip = createMat('#f472b6', { emissive: '#ec4899', emissiveIntensity: 1.0 });
        for (const s of [-1, 1]) {
          addVoxel(headGroup, 0.16, 0.34, 0.16, s * 0.3, 0.52, -0.1, gal);
          addVoxel(headGroup, 0.12, 0.34, 0.14, s * 0.42, 0.78, 0.04, tip);
        }
        break;
      }
      case 'steam_goggles': {
        const brass = createMat('#d97706', { metalness: 0.72, roughness: 0.28 });
        const lens = createMat('#38bdf8', { emissive: '#0284c7', emissiveIntensity: 0.72, roughness: 0.15 });
        addVoxel(headGroup, 0.82, 0.14, 0.62, 0, 0.25, -0.16, matDark);
        for (const s of [-1, 1]) {
          addVoxel(headGroup, 0.26, 0.26, 0.2, s * 0.24, 0.26, -0.34, brass);
          addVoxel(headGroup, 0.18, 0.18, 0.12, s * 0.24, 0.26, -0.4, lens);
        }
        addVoxel(headGroup, 0.12, 0.22, 0.12, 0.44, 0.3, -0.18, createMat('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 0.85 }));
        break;
      }
      case 'samurai_kabuto': {
        const lacquer = createMat('#991b1b', { roughness: 0.32, metalness: 0.25 });
        addVoxel(headGroup, 0.82, 0.26, 0.72, 0, 0.48, -0.12, lacquer);
        addVoxel(headGroup, 0.94, 0.1, 0.78, 0, 0.36, -0.06, matDark);
        addVoxel(headGroup, 0.14, 0.34, 0.1, -0.18, 0.68, -0.36, matGold);
        addVoxel(headGroup, 0.14, 0.34, 0.1, 0.18, 0.68, -0.36, matGold);
        addVoxel(headGroup, 0.28, 0.14, 0.1, 0, 0.58, -0.37, matGold);
        break;
      }
      case 'dino_backpack_plush': {
        const plushGreen = createMat('#4ade80', { roughness: 0.6 });
        const belly = createMat('#fef08a', { roughness: 0.65 });
        addVoxel(torso, 0.42, 0.48, 0.38, 0, torsoH * 0.66, 0.18, plushGreen);
        addVoxel(torso, 0.24, 0.28, 0.14, 0, torsoH * 0.6, 0.35, belly);
        addVoxel(torso, 0.32, 0.28, 0.34, 0, torsoH * 1.0, 0.1, plushGreen);
        addVoxel(torso, 0.1, 0.08, 0.1, -0.14, torsoH * 1.06, 0.05, matGold);
        addVoxel(torso, 0.1, 0.08, 0.1, 0.14, torsoH * 1.06, 0.05, matGold);
        break;
      }
      case 'royal_trident': {
        const shaft = createMat('#0f766e', { metalness: 0.55, roughness: 0.3 });
        const prong = createMat('#2dd4bf', { emissive: '#14b8a6', emissiveIntensity: 0.85 });
        addVoxel(torso, 0.12, 1.08, 0.12, 0.28, torsoH * 0.85, 0.16, shaft);
        addVoxel(torso, 0.52, 0.12, 0.12, 0.28, torsoH * 1.36, 0.16, matGold);
        addVoxel(torso, 0.1, 0.36, 0.1, 0.06, torsoH * 1.54, 0.16, prong);
        addVoxel(torso, 0.12, 0.46, 0.12, 0.28, torsoH * 1.58, 0.16, prong);
        addVoxel(torso, 0.1, 0.36, 0.1, 0.5, torsoH * 1.54, 0.16, prong);
        break;
      }
      case 'plasma_halo': {
        const plasmaA = createMat('#00f5d4', { emissive: '#06b6d4', emissiveIntensity: 0.98 });
        const plasmaB = createMat('#c084fc', { emissive: '#a855f7', emissiveIntensity: 0.95 });
        addVoxel(headGroup, 0.84, 0.09, 0.84, 0, 0.74, -0.14, plasmaA);
        addVoxel(headGroup, 0.24, 0.24, 0.24, -0.44, 0.76, -0.14, plasmaB);
        addVoxel(headGroup, 0.24, 0.24, 0.24, 0.44, 0.76, -0.14, plasmaB);
        addVoxel(headGroup, 0.22, 0.22, 0.22, 0, 0.82, -0.48, plasmaA);
        break;
      }
      case 'comet_tail_rig': {
        const hull = createMat('#312e81', { metalness: 0.65, roughness: 0.22 });
        const ember = createMat('#fbbf24', { emissive: '#f59e0b', emissiveIntensity: 0.98 });
        addVoxel(torso, 0.56, 0.28, 0.54, 0, torsoH * 0.66, 0.22, hull);
        addVoxel(torso, 0.22, 0.22, 0.44, -0.34, torsoH * 0.62, 0.42, ember);
        addVoxel(torso, 0.22, 0.22, 0.44, 0.34, torsoH * 0.62, 0.42, ember);
        addVoxel(torso, 0.18, 0.52, 0.14, 0, torsoH * 0.94, 0.26, ember);
        break;
      }
      // === 18 NOVOS ACESSÓRIOS 3D DA MEGA EXPANSÃO ===
      case 'lunar_helmet': {
        const glass = createMat('#bae6fd', { transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.2 });
        const rim = createMat('#cbd5e1', { metalness: 0.6, roughness: 0.3 });
        addVoxel(headGroup, 0.84, 0.72, 0.88, 0, 0.24, -0.2, glass);
        addVoxel(headGroup, 0.88, 0.12, 0.9, 0, -0.1, -0.2, rim);
        addVoxel(headGroup, 0.08, 0.28, 0.08, 0.42, 0.56, -0.05, matGold);
        break;
      }
      case 'aztec_headdress': {
        const jade = createMat('#14b8a6', { emissive: '#0d9488', emissiveIntensity: 0.35 });
        addVoxel(headGroup, 0.72, 0.2, 0.24, 0, 0.52, -0.1, matGold);
        for (let i = -2; i <= 2; i++) {
          addVoxel(headGroup, 0.12, 0.48 - Math.abs(i) * 0.06, 0.1, i * 0.2, 0.78 - Math.abs(i) * 0.04, 0.04, i % 2 === 0 ? jade : matRed);
        }
        break;
      }
      case 'spore_crown': {
        const glow = createMat('#2dd4bf', { emissive: '#14b8a6', emissiveIntensity: 0.85 });
        addVoxel(headGroup, 0.68, 0.1, 0.68, 0, 0.48, -0.18, createMat('#115e59'));
        addVoxel(headGroup, 0.18, 0.24, 0.18, -0.24, 0.64, -0.24, glow);
        addVoxel(headGroup, 0.22, 0.3, 0.22, 0, 0.68, -0.18, glow);
        addVoxel(headGroup, 0.18, 0.24, 0.18, 0.24, 0.64, -0.24, glow);
        break;
      }
      case 'obsidian_pauldrons': {
        const obs = createMat('#18181b', { metalness: 0.5, roughness: 0.22 });
        const ruby = createMat('#f43f5e', { emissive: '#e11d48', emissiveIntensity: 0.75 });
        for (const s of [-1, 1]) {
          addVoxel(torso, 0.34, 0.32, 0.46, s * (torsoW * 0.62), torsoH * 0.34, -0.16, obs);
          addVoxel(torso, 0.12, 0.24, 0.12, s * (torsoW * 0.74), torsoH * 0.54, -0.16, ruby);
        }
        break;
      }
      case 'magma_core_pack': {
        const basalt = createMat('#292524', { roughness: 0.75 });
        const lava = createMat('#ff5722', { emissive: '#ff4500', emissiveIntensity: 0.95 });
        addVoxel(torso, 0.64, 0.42, 0.54, 0, torsoH * 0.62, 0.08, basalt);
        addVoxel(torso, 0.34, 0.26, 0.34, 0, torsoH * 0.76, 0.08, lava);
        break;
      }
      case 'orbital_thruster': {
        const hull = createMat('#475569', { metalness: 0.75, roughness: 0.22 });
        const ion = createMat('#38bdf8', { emissive: '#0284c7', emissiveIntensity: 0.98 });
        addVoxel(torso, 0.76, 0.28, 0.56, 0, torsoH * 0.62, 0.12, hull);
        addVoxel(torso, 0.2, 0.2, 0.38, -0.32, torsoH * 0.56, 0.44, ion);
        addVoxel(torso, 0.2, 0.2, 0.38, 0.32, torsoH * 0.56, 0.44, ion);
        break;
      }
      case 'crystal_visor': {
        const qtz = createMat('#c084fc', { emissive: '#a855f7', emissiveIntensity: 0.7, transparent: true, opacity: 0.8 });
        addVoxel(headGroup, 0.78, 0.2, 0.26, 0, 0.22, -0.34, qtz);
        addVoxel(headGroup, 0.12, 0.12, 0.38, -0.36, 0.22, -0.18, matGold);
        addVoxel(headGroup, 0.12, 0.12, 0.38, 0.36, 0.22, -0.18, matGold);
        break;
      }
      case 'chrono_wings': {
        const cMat = createMat('#c084fc', { emissive: '#9333ea', emissiveIntensity: 0.8 });
        const trim = createMat('#38bdf8', { emissive: '#0284c7', emissiveIntensity: 0.85 });
        for (const s of [-1, 1]) {
          addVoxel(torso, 0.88, 0.08, 0.38, s * 0.76, torsoH * 0.44, 0.12, cMat);
          addVoxel(torso, 0.62, 0.06, 0.22, s * 1.12, torsoH * 0.54, 0.22, trim);
        }
        break;
      }
      case 'fossil_shield': {
        const bone = createMat('#e7e5e4', { roughness: 0.55 });
        addVoxel(torso, 0.78, 0.18, 0.86, 0, torsoH * 0.58, 0.04, bone);
        addVoxel(torso, 0.48, 0.14, 0.54, 0, torsoH * 0.68, 0.04, matGold);
        break;
      }
      case 'solar_mantle': {
        const sol = createMat('#f59e0b', { emissive: '#ea580c', emissiveIntensity: 0.85 });
        addVoxel(torso, 0.92, 0.12, 0.82, 0, torsoH * 0.54, 0.22, sol);
        addVoxel(torso, 0.68, 0.12, 0.44, 0, torsoH * 0.44, 0.7, matGold);
        break;
      }
      case 'abyss_fins': {
        const fin = createMat('#06b6d4', { emissive: '#0891b2', emissiveIntensity: 0.75 });
        addVoxel(torso, 0.1, 0.54, 0.46, 0, torsoH * 0.76, 0.04, fin);
        addVoxel(torso, 0.48, 0.08, 0.28, -torsoW * 0.68, 0.1, 0.08, fin);
        addVoxel(torso, 0.48, 0.08, 0.28, torsoW * 0.68, 0.1, 0.08, fin);
        break;
      }
      case 'thunder_crest': {
        const bolt = createMat('#fde047', { emissive: '#eab308', emissiveIntensity: 0.95 });
        addVoxel(headGroup, 0.12, 0.36, 0.28, 0, 0.62, -0.18, bolt);
        addVoxel(headGroup, 0.12, 0.28, 0.24, 0, 0.78, 0.04, bolt);
        break;
      }
      case 'jade_amulet': {
        const jade = createMat('#10b981', { emissive: '#059669', emissiveIntensity: 0.7 });
        addVoxel(torso, 0.56, 0.1, 0.12, 0, 0.18, -torsoD * 0.5, matGold);
        addVoxel(torso, 0.24, 0.28, 0.14, 0, 0.04, -torsoD * 0.54, jade);
        break;
      }
      case 'nebula_ring': {
        const neb = createMat('#a855f7', { emissive: '#7e22ce', emissiveIntensity: 0.9 });
        addVoxel(torso, 1.32, 0.08, 0.12, 0, torsoH * 0.76, 0.04, neb);
        addVoxel(torso, 0.12, 0.08, 1.32, 0, torsoH * 0.76, 0.04, neb);
        break;
      }
      case 'bone_pauldrons': {
        const bone = createMat('#f5f5f4', { roughness: 0.5 });
        for (const s of [-1, 1]) {
          addVoxel(torso, 0.3, 0.28, 0.42, s * (torsoW * 0.6), torsoH * 0.32, -0.18, bone);
          addVoxel(torso, 0.12, 0.24, 0.12, s * (torsoW * 0.72), torsoH * 0.48, -0.18, bone);
        }
        break;
      }
      case 'cyber_turret': {
        const steel = createMat('#64748b', { metalness: 0.8, roughness: 0.2 });
        const laser = createMat('#22d3ee', { emissive: '#06b6d4', emissiveIntensity: 0.95 });
        addVoxel(torso, 0.34, 0.24, 0.42, torsoW * 0.48, torsoH * 0.62, -0.1, steel);
        addVoxel(torso, 0.12, 0.12, 0.46, torsoW * 0.48, torsoH * 0.68, -0.44, laser);
        break;
      }
      case 'feather_plume': {
        addVoxel(headGroup, 0.12, 0.48, 0.24, 0, 0.64, -0.04, matRed);
        addVoxel(headGroup, 0.1, 0.38, 0.22, 0, 0.76, 0.14, matGold);
        break;
      }
      case 'void_horns': {
        const voidM = createMat('#312e81', { emissive: '#7c3aed', emissiveIntensity: 0.95 });
        for (const s of [-1, 1]) {
          addVoxel(headGroup, 0.14, 0.34, 0.18, s * 0.28, 0.58, -0.16, voidM);
          addVoxel(headGroup, 0.12, 0.32, 0.16, s * 0.4, 0.82, -0.06, matBlue);
        }
        break;
      }
      default:
        break;
    }
  }

  static _attachMutation(mutationId, headGroup, torso, torsoW, torsoH, torsoD = 1.08, ctx = {}) {
    if (!mutationId) return;
    const tier = Math.max(1, Math.min(4, ctx.mutationTier ?? getMutationActiveLevel(mutationId) ?? 1));
    if (mutationId === 'extra_limbs') {
      const profile = getMutationComputedProfile('extra_limbs', tier);
      const pairs = Math.max(1, Math.min(4, profile?.extraPairs || tier));
      const matThigh = ctx.matPrimaryDark || createMat('#1f7a3e', { roughness: 0.55 });
      const matShin = ctx.matPrimary || createMat('#34d399', { roughness: 0.5 });
      const matFoot = ctx.matSecondary || createMat('#fef3c7', { roughness: 0.55 });
      const matClaw = ctx.matTooth || createMat('#f7f4e8', { roughness: 0.35 });
      const bioNode = createMat('#10b981', { emissive: '#059669', emissiveIntensity: 0.85, roughness: 0.25 });

      for (let p = 0; p < pairs; p++) {
        const zOff = pairs === 1 ? 0.04 : (-0.36 + (p / (pairs - 1)) * 0.72);
        const yOff = -torsoH * 0.28;
        [-1, 1].forEach((dir) => {
          const hip = new THREE.Group();
          const splay = dir * (0.24 + (p % 2) * 0.08);
          hip.position.set(dir * (torsoW * 0.5 + 0.08), yOff, zOff);
          hip.rotation.z = splay;
          torso.add(hip);

          // Nó biológico de mutação no quadril
          addVoxel(hip, 0.14, 0.14, 0.14, dir * 0.02, 0.02, 0, bioNode);

          const thighH = ctx.isAquatic ? 0.36 : 0.38;
          const shinH = ctx.isAquatic ? 0.32 : 0.34;
          addVoxel(hip, 0.19, thighH, 0.22, dir * 0.06, -thighH * 0.4, 0, matThigh);

          const knee = new THREE.Group();
          knee.position.set(dir * 0.08, -thighH * 0.78, 0);
          hip.add(knee);
          addVoxel(knee, 0.15, shinH, 0.17, 0, -shinH * 0.45, 0.02, matShin);

          const foot = new THREE.Group();
          foot.position.set(0, -shinH * 0.84, 0);
          knee.add(foot);
          addVoxel(foot, 0.2, 0.1, 0.28, 0, -0.04, -0.06, matFoot);
          addVoxel(foot, 0.06, 0.07, 0.11, -0.06, -0.05, -0.22, matClaw);
          addVoxel(foot, 0.06, 0.07, 0.11, 0.06, -0.05, -0.22, matClaw);

          if (Array.isArray(ctx.extraLegs)) {
            ctx.extraLegs.push({ hip, knee, foot, baseRotZ: splay, side: dir, pairIndex: p });
          }
        });
      }
      return;
    }
    if (mutationId === 'glow' || mutationId === 'cosmic_dna') {
      const col = mutationId === 'cosmic_dna' ? '#c084fc' : '#5eead4';
      const glowM = createMat(col, { emissive: col, emissiveIntensity: 0.75 + tier * 0.15 });
      const count = 1 + Math.min(2, Math.floor((tier + 1) / 2));
      for (let i = -count; i <= count; i++) {
        addVoxel(torso, 0.14, 0.2 + tier * 0.03, 0.16, 0, torsoH * 0.58, i * 0.2, glowM);
      }
      if (mutationId === 'cosmic_dna' || tier >= 3) {
        addVoxel(headGroup, 0.16, 0.24 + tier * 0.04, 0.16, 0, 0.54, -0.18, glowM);
      }
    } else if (mutationId === 'fire_trail') {
      const fireM = createMat('#f97316', { emissive: '#ea580c', emissiveIntensity: 0.8 + tier * 0.12 });
      addVoxel(torso, 0.18, 0.22 + tier * 0.04, 0.22, -torsoW * 0.52, 0.1, 0.22, fireM);
      addVoxel(torso, 0.18, 0.22 + tier * 0.04, 0.22, torsoW * 0.52, 0.1, 0.22, fireM);
      if (tier >= 2) {
        addVoxel(torso, 0.14, 0.24, 0.18, 0, torsoH * 0.58, 0.34, fireM);
      }
    } else if (mutationId === 'venom_spines') {
      const toxM = createMat('#84cc16', { emissive: '#65a30d', emissiveIntensity: 0.7 + tier * 0.12 });
      const rows = 2 + Math.min(2, tier);
      for (let i = 0; i < rows; i++) {
        const zOff = -0.36 + i * (0.72 / Math.max(1, rows - 1));
        addVoxel(torso, 0.12, 0.26 + tier * 0.04, 0.12, -0.18, torsoH * 0.62, zOff, toxM);
        addVoxel(torso, 0.12, 0.26 + tier * 0.04, 0.12, 0.18, torsoH * 0.62, zOff, toxM);
      }
    } else if (mutationId === 'mecha_core') {
      const mechM = createMat('#38bdf8', { emissive: '#0284c7', emissiveIntensity: 0.8 + tier * 0.15 });
      addVoxel(torso, 0.28 + tier * 0.03, 0.28 + tier * 0.03, 0.16, 0, 0.12, -torsoD * 0.53, mechM);
    } else if (mutationId === 'turbo_tail' || mutationId === 'bouncy' || mutationId === 'amber_core' || mutationId === 'lucky_eggs' || mutationId === 'tiny_core') {
      const c = mutationId === 'amber_core' ? '#f59e0b' : mutationId === 'lucky_eggs' ? '#fde047' : mutationId === 'tiny_core' ? '#a855f7' : '#22d3ee';
      const m = createMat(c, { emissive: c, emissiveIntensity: 0.65 + tier * 0.12 });
      addVoxel(torso, 0.18 + tier * 0.02, 0.18 + tier * 0.02, 0.2, 0, torsoH * 0.54, 0.42, m);
    } else if (mutationId === 'lunar_bones' || mutationId === 'obsidian_scales' || mutationId === 'biolum_glands' || mutationId === 'magma_heart' || mutationId === 'orbital_gyro' || mutationId === 'chrono_synapse' || mutationId === 'abyssal_gills' || mutationId === 'apex_adrenaline') {
      const colMap = {
        lunar_bones: '#e2e8f0',
        obsidian_scales: '#f43f5e',
        biolum_glands: '#2dd4bf',
        magma_heart: '#ff5722',
        orbital_gyro: '#38bdf8',
        chrono_synapse: '#c084fc',
        abyssal_gills: '#06b6d4',
        apex_adrenaline: '#facc15'
      };
      const c = colMap[mutationId] || '#38bdf8';
      const m = createMat(c, { emissive: c, emissiveIntensity: 0.72 + tier * 0.1 });
      addVoxel(torso, 0.16 + tier * 0.02, 0.22 + tier * 0.03, 0.18, -torsoW * 0.52, torsoH * 0.36, 0.08, m);
      addVoxel(torso, 0.16 + tier * 0.02, 0.22 + tier * 0.03, 0.18, torsoW * 0.52, torsoH * 0.36, 0.08, m);
    }
  }

  static buildAccessoryStandalone(accessoryId, fallbackHex = '#ffd447') {
    const root = new THREE.Group();
    const inner = new THREE.Group();
    const sculpted = buildSculptedAccessoryStandalone(accessoryId);
    if (sculpted?.slot && sculpted.root?.children?.length > 0) {
      inner.add(sculpted.root);
    } else {
      const headGroup = new THREE.Group();
      const torso = new THREE.Group();
      DinoFactory._attachAccessory(accessoryId, headGroup, torso, 1.0, 1.0, 1.08);
      if (headGroup.children.length > 0) inner.add(headGroup);
      if (torso.children.length > 0) inner.add(torso);
    }

    const box = new THREE.Box3().setFromObject(inner);
    if (box.isEmpty()) {
      const m = createMat(fallbackHex, { emissive: fallbackHex, emissiveIntensity: 0.55, metalness: 0.4 });
      addVoxel(inner, 0.72, 0.22, 0.56, 0, 0, 0, m);
      addVoxel(inner, 0.2, 0.34, 0.2, -0.24, 0.24, 0, m);
      addVoxel(inner, 0.22, 0.44, 0.22, 0, 0.29, 0, m);
      addVoxel(inner, 0.2, 0.34, 0.2, 0.24, 0.24, 0, m);
      box.setFromObject(inner);
    }

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.35);
    const scale = 1.15 / maxDim;
    inner.position.sub(center);
    root.add(inner);
    root.scale.setScalar(scale);
    return root;
  }
}
