// Gerador Combinatório de Dinossauro por Presets guiado pela Lore do Jogador (Parte 2.3 & 2.5).
// Cobre tamanho, espécie base/híbrido, postura, pescoço, cabeça, mandíbula/presas, chifres/cristas/placas/penas,
// caudas (clava, leque, espinhos), garras, micro-asas, cores, padrões, cicatrizes, pinturas de guerra,
// acessórios (compatíveis com DinoAnchors Parte 1.6), voz e temperamento.
import { DinoFactory } from '../dinos/DinoFactory.js';

export const DINO_PRESET_LIBRARY = Object.freeze({
  sizes: [
    { id: 'tiny',     label: 'Minúsculo', scale: 0.65 },
    { id: 'small',    label: 'Pequeno',   scale: 0.82 },
    { id: 'medium',   label: 'Médio',     scale: 1.0  },
    { id: 'large',    label: 'Grande',    scale: 1.18 },
    { id: 'colossal', label: 'Colossal',  scale: 1.36 }
  ],
  species: ['trex', 'raptor', 'spinosaurus', 'triceratops', 'stegosaurus', 'ankylosaurus', 'brachiosaurus', 'carnotaurus', 'quetzalcoatlus', 'mosasaurus', 'scary_monsters'],
  postures: ['biped', 'quadruped'],
  necks: ['short_muscular', 'balanced', 'long_graceful', 'armored_cervical'],
  jaws: ['crusher_fangs', 'serrated_raptor', 'hooked_piscivore', 'beaked_herbivore'],
  headFeatures: ['none', 'brow_horns', 'nasal_horn', 'royal_frill', 'feathered_crest', 'neural_crown'],
  dorsalFeatures: ['none', 'osteoderm_ridge', 'spino_sail', 'stego_plates', 'proto_feathers'],
  tails: ['whip_balance', 'bone_club', 'feather_fan', 'thagomizer_spikes'],
  claws: ['standard', 'sickle_talons', 'digging_iron', 'razor_prism'],
  miniWings: ['none', 'glider_feathers', 'draconic_winglets'],
  patterns: ['solid', 'stripes', 'spots', 'camo', 'gradient', 'tribal'],
  scarsAndPaint: ['none', 'eye_scar', 'claw_marks', 'amber_war_paint', 'crimson_clan_paint', 'starlight_runes'],
  voices: ['deep_roar', 'sharp_shriek', 'resonant_bellow', 'ancient_growl', 'clicking_predator'],
  behaviors: ['feroz', 'protetor', 'astuto', 'curioso', 'solitário', 'nobre']
});

const LORE_ARCHETYPE_RULES = [
  {
    match: /(furtiv|sombr|raptor|ágil|agil|caçador|ladin|veloz)/i,
    patch: { species: 'raptor', size: 'small', posture: 'biped', claws: 'sickle_talons', dorsalFeatures: 'proto_feathers', tails: 'feather_fan', pattern: 'stripes', primary: '#1e293b', secondary: '#38bdf8', eye: '#facc15', behavior: 'astuto', archetype: 'Batedor', accessory: 'bandana' }
  },
  {
    match: /(escud|guardi|defes| couraç|armadur|muralh|tricer|ankyl)/i,
    patch: { species: 'ankylosaurus', size: 'large', posture: 'quadruped', headFeatures: 'royal_frill', tails: 'bone_club', pattern: 'camo', primary: '#4d7c0f', secondary: '#d97706', eye: '#fde047', behavior: 'protetor', archetype: 'Guardião', accessory: 'fossil_shield' }
  },
  {
    match: /(xam|magi|místic|cristal|runa|arcano|espírit|estrela)/i,
    patch: { species: 'spinosaurus', size: 'medium', posture: 'biped', dorsalFeatures: 'spino_sail', miniWings: 'draconic_winglets', scarsAndPaint: 'starlight_runes', pattern: 'gradient', primary: '#4c1d95', secondary: '#22d3ee', eye: '#e879f9', behavior: 'curioso', archetype: 'Xamã', accessory: 'amber_medallion' }
  },
  {
    match: /(vulc|fogo|chama|coloss|rei|tiran|alfa|sangue|guerr)/i,
    patch: { species: 'trex', size: 'colossal', posture: 'biped', jaws: 'crusher_fangs', headFeatures: 'brow_horns', scarsAndPaint: 'crimson_clan_paint', pattern: 'tribal', primary: '#991b1b', secondary: '#f59e0b', eye: '#fde047', voice: 'deep_roar', behavior: 'feroz', archetype: 'Predador', accessory: 'spike_collar' }
  },
  {
    match: /(cur|paz|ninho|ervas|sábio|sabio|gigant|antig)/i,
    patch: { species: 'brachiosaurus', size: 'colossal', posture: 'quadruped', necks: 'long_graceful', jaws: 'beaked_herbivore', pattern: 'spots', primary: '#0f766e', secondary: '#a7f3d0', eye: '#34d399', voice: 'resonant_bellow', behavior: 'nobre', archetype: 'Curandeiro', accessory: 'backpack' }
  }
];

/**
 * Monta automaticamente um Preset completo de Dinossauro a partir da Lore escrita pelo jogador e do tema do mundo!
 */
export function generateDinoPresetFromLore(playerLore = '', worldTheme = 'jurassic_wild') {
  const base = {
    size: 'medium',
    species: 'trex',
    hybridHead: null,
    hybridTail: null,
    posture: 'biped',
    necks: 'balanced',
    jaws: 'crusher_fangs',
    headFeatures: 'none',
    dorsalFeatures: 'osteoderm_ridge',
    tails: 'whip_balance',
    claws: 'standard',
    miniWings: 'none',
    primary: '#16a34a',
    secondary: '#fde047',
    eye: '#f97316',
    pattern: 'stripes',
    scarsAndPaint: 'none',
    accessory: 'backpack',
    voice: 'deep_roar',
    behavior: 'curioso',
    archetype: 'Predador'
  };

  for (const rule of LORE_ARCHETYPE_RULES) {
    if (rule.match.test(playerLore)) {
      Object.assign(base, rule.patch);
      break;
    }
  }

  if (/gelo|glacia/i.test(worldTheme) && !playerLore.trim()) {
    base.primary = '#0284c7';
    base.secondary = '#e0f2fe';
    base.accessory = 'scarf';
  } else if (/medieval/i.test(worldTheme) && base.accessory === 'backpack') {
    base.accessory = 'cape';
  }

  return base;
}

/**
 * Constrói o modelo 3D real do dinossauro a partir do preset para prévia ao vivo ou modo 3D Diorama.
 */
export function buildDinoModelFromPreset(preset = {}) {
  const sizeEntry = DINO_PRESET_LIBRARY.sizes.find((s) => s.id === preset.size) || DINO_PRESET_LIBRARY.sizes[2];
  const speciesId = DINO_PRESET_LIBRARY.species.includes(preset.species) ? preset.species : 'trex';
  const useHybrid = Boolean(preset.hybridHead || preset.hybridTail);

  const model = DinoFactory.build(speciesId, {
    useCustomColors: true,
    primary: preset.primary || '#16a34a',
    secondary: preset.secondary || '#fde047',
    spots: preset.secondary || '#fde047',
    spikes: preset.secondary || '#fde047',
    eye: preset.eye || '#f97316',
    pattern: preset.pattern || 'stripes',
    accessories: preset.accessory && preset.accessory !== 'none' ? [preset.accessory] : [],
    hybrid: useHybrid ? {
      enabled: true,
      body: speciesId,
      head: preset.hybridHead || speciesId,
      tail: preset.hybridTail || speciesId
    } : undefined
  }, { allowHybrid: useHybrid });

  model.rig.scale.multiplyScalar(sizeEntry.scale / (model.baseScale || 1));
  model.root.userData.preset = { ...preset };
  return model;
}
