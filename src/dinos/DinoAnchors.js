// Sistema completo de Pontos de Encaixe (Anchor Points) por espécie e postura para DINO DASH 3D (Parte 1.6).
// Garante alinhamento preciso em TODOS os dinos (bípedes, quadrúpedes, aquáticos, voadores e rastejantes):
// - Coleiras / acessórios de pescoço (spike_collar, bell_collar, scarf, etc.) montam diretamente no neckPivot!
// - Mochilas / jetpacks / aljavas montam SOBRE AS COSTAS (rotação dorsal), nunca pendurados no rabo!
// - Chapéus / óculos / asas / capas / ombros / cauda / patas respeitam cristas, velas dorsais, golas e cascos.

export const POSTURE_TYPES = ['biped', 'quadruped', 'aquatic', 'flying', 'sprawling'];

const SPRAWLING_SPECIES = new Set(['archelon', 'ankylosaurus', 'edmontonia']);
const DORSAL_SAIL_SPECIES = new Set(['spinosaurus', 'amargasaurus']);
const DORSAL_PLATE_SPECIES = new Set(['stegosaurus', 'kentrosaurus', 'concavenator', 'acrocanthosaurus']);
const ARMORED_BACK_SPECIES = new Set(['ankylosaurus', 'edmontonia', 'archelon', 'dunkleosteus', 'indominus_voxel']);
const WIDE_NECK_SPECIES = new Set(['trex', 'giganotosaurus', 'kronosaurus', 'dunkleosteus', 'hatzegopteryx', 'triceratops', 'styracosaurus', 'indominus_voxel']);
const SLENDER_NECK_SPECIES = new Set(['raptor', 'compsognathus', 'gallimimus', 'elasmosaurus', 'plesiosaurus', 'microraptor', 'archaeopteryx', 'dimorphodon', 'scary_monsters', 'cyber_raptor']);

export const PACK_BACK_ACCESSORIES = new Set([
  'backpack',
  'dino_backpack_plush',
  'jetpack',
  'sub_jetpack',
  'magma_core_pack',
  'quiver',
  'orbital_thruster',
  'fossil_shield',
  'royal_trident'
]);

export const CAPE_BACK_ACCESSORIES = new Set([
  'cape',
  'star_cape',
  'leaf_cape',
  'solar_mantle'
]);

export const WING_BACK_ACCESSORIES = new Set([
  'wings',
  'bat_wings',
  'angel_wings',
  'crystal_wings',
  'mecha_wings',
  'chrono_wings',
  'abyss_fins'
]);

export const TAIL_ACCESSORIES = new Set([
  'comet_tail_rig'
]);

export function classifyDinoPosture({ bodyId, isQuadruped, isAquatic, isFlying }) {
  if (SPRAWLING_SPECIES.has(bodyId)) return 'sprawling';
  if (isAquatic) return 'aquatic';
  if (isFlying) return 'flying';
  if (isQuadruped) return 'quadruped';
  return 'biped';
}

/**
 * Calcula todos os pontos de encaixe anatômicos do dinossauro:
 * head, face, neck, back, backPack, backCape, backWings, backShell, shoulders, hip, tail, limbs, aura.
 */
export function computeDinoAnchorPoints(ctx = {}) {
  const {
    bodyId = 'trex',
    headId = bodyId,
    isQuadruped = false,
    isAquatic = false,
    isFlying = false,
    torsoW = 0.78,
    torsoH = 0.72,
    torsoD = 1.08,
    neckLen = 0.48,
    headW = 0.66,
    headH = 0.52,
    headD = 0.78,
    hasFrill = false,
    frillTopY = 0.87,
    frillFrontZ = 0.06
  } = ctx;

  const posture = classifyDinoPosture({ bodyId, isQuadruped, isAquatic, isFlying });

  // Altura extra sobre o dorso para não atravessar velas, placas ou carapaças
  let dorsalLift = 0;
  if (DORSAL_SAIL_SPECIES.has(bodyId)) dorsalLift = 0.24;
  else if (DORSAL_PLATE_SPECIES.has(bodyId)) dorsalLift = 0.16;
  else if (ARMORED_BACK_SPECIES.has(bodyId)) dorsalLift = 0.14;

  // Escala do pescoço para que coleiras (spike_collar, bell_collar, scarf, etc.) envolvam o pescoço sem flutuar nem atravessar
  const neckRadiusScale = WIDE_NECK_SPECIES.has(headId)
    ? 0.84
    : (SLENDER_NECK_SPECIES.has(headId) ? 0.68 : 0.75);
  const neckAnchorY = Math.max(0.10, Math.min(neckLen * 0.44, Math.max(0.14, neckLen - 0.12)));

  // Cabeça e rosto calibrados pelas dimensões reais do crânio
  const headTopY = 0.16 + headH * 0.50;
  const headScale = Math.max(0.74, Math.min(1.16, headW / 0.66));
  const faceZ = -0.18 - headD * 0.52;

  // Costas: mochila fica centralizada SOBRE o dorso (z próximo de -0.06..+0.02), NUNCA sobre o rabo (+torsoD * 0.5)
  const packScale = posture === 'sprawling'
    ? 0.84
    : (posture === 'quadruped' ? 0.86 : (posture === 'aquatic' ? 0.76 : 0.78));
  const packZ = posture === 'quadruped' || posture === 'sprawling'
    ? -0.06
    : (posture === 'aquatic' ? -0.10 : -0.08);
  const packY = torsoH * 0.50 + dorsalLift + (posture === 'sprawling' ? 0.06 : 0.02);
  // Rotação -PI/2 deita a mochila sobre as costas (topo para frente/ombros, bolso para cima, alças abraçando o dorso)
  // Em bípedes usamos leve inclinação esportiva (-1.38 rad) para leitura perfeita na câmera 3ª pessoa
  const packRotX = posture === 'biped' ? -1.38 : -Math.PI / 2;

  return {
    posture,
    head: {
      parentKey: 'headGroup',
      position: [0, hasFrill ? Math.max(headTopY + 0.04, 0.46) : headTopY, hasFrill ? Math.min(-0.34, frillFrontZ - 0.36) : -0.18],
      rotation: [0, 0, 0],
      scale: [headScale, headScale, headScale],
      hasFrill,
      frillTopY,
      frillFrontZ
    },
    face: {
      parentKey: 'headGroup',
      position: [0, 0.16 + headH * 0.16, faceZ],
      rotation: [0, 0, 0],
      scale: [Math.max(0.75, headW / 0.66), Math.max(0.78, headH / 0.52), 1]
    },
    neck: {
      parentKey: 'neckPivot',
      position: [0, neckAnchorY, -0.08],
      rotation: [0, 0, 0],
      scale: [neckRadiusScale, Math.min(0.86, neckRadiusScale * 0.96), neckRadiusScale]
    },
    back: {
      parentKey: 'torso',
      position: [0, torsoH * 0.56 + dorsalLift, -0.04],
      rotation: [0, 0, 0],
      scale: [Math.max(0.76, torsoW / 0.82), 0.85, Math.max(0.76, torsoD / 1.12)]
    },
    backPack: {
      parentKey: 'torso',
      position: [0, packY, packZ],
      rotation: [packRotX, 0, 0],
      scale: [packScale, packScale, packScale]
    },
    backCape: {
      parentKey: 'torso',
      position: [0, torsoH * 0.55 + dorsalLift * 0.55, -torsoD * 0.16],
      rotation: [posture === 'biped' ? -1.08 : -1.28, 0, 0],
      scale: [Math.max(0.84, torsoW / 0.78), 0.9, 0.9]
    },
    backWings: {
      parentKey: 'torso',
      position: [0, torsoH * 0.52 + dorsalLift * 0.35, -torsoD * 0.06],
      rotation: [0, 0, 0],
      scale: [Math.max(0.82, torsoW / 0.78), 0.92, 0.92]
    },
    backShell: {
      parentKey: 'torso',
      position: [0, torsoH * 0.44 + dorsalLift * 0.4, -torsoD * 0.46],
      rotation: [0, 0, 0],
      scale: [Math.max(0.82, torsoW / 0.82), 0.88, Math.max(0.82, torsoD / 1.08)]
    },
    shoulders: {
      parentKey: 'torso',
      position: [0, torsoH * 0.54, -torsoD * 0.20],
      rotation: [0, 0, 0],
      scale: [Math.max(0.72, torsoW / 0.78), 0.86, 0.86]
    },
    hip: {
      parentKey: 'torso',
      position: [0, torsoH * 0.12, torsoD * 0.24],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    },
    tail: {
      parentKey: 'torso',
      position: [0, torsoH * 0.32, torsoD * 0.46],
      rotation: [0, 0, 0],
      scale: [0.82, 0.82, 0.82]
    },
    limbs: {
      parentKey: 'torso',
      position: [0, -torsoH * 0.36, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    },
    aura: {
      parentKey: 'torso',
      position: [0, torsoH * 0.45, 0],
      rotation: [0, 0, 0],
      scale: [Math.max(0.88, torsoW / 0.78), 1, Math.max(0.88, torsoD / 1.08)]
    }
  };
}

/** Resolve qual ponto de encaixe usar para um dado acessório e slot. */
export function resolveAccessoryAnchorKey(slot, baseId) {
  if (TAIL_ACCESSORIES.has(baseId)) return 'tail';
  if (slot === 'back') {
    if (baseId === 'turtle_shell') return 'backShell';
    if (PACK_BACK_ACCESSORIES.has(baseId)) return 'backPack';
    if (CAPE_BACK_ACCESSORIES.has(baseId)) return 'backCape';
    if (WING_BACK_ACCESSORIES.has(baseId)) return 'backWings';
    return 'back';
  }
  return slot || 'back';
}
