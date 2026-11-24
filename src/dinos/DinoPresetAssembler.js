// DinoPresetAssembler.js
// Biblioteca de partes e variações combináveis de dinossauros (Seção 2.5).
// Gera presets estruturados com base na lore do jogador ou escolhas manuais.

import { DINO_CATALOG } from './DinoCatalog.js';
import { ACCESSORIES_SHOP } from './DinoCustomization.js';
import { ANCHOR_SLOTS } from './DinoAnchors.js';

export const SIZES = [
  { id: 'tiny', label: 'Minúsculo', scale: 0.6, hpMod: -1, speedMod: +2 },
  { id: 'small', label: 'Pequeno', scale: 0.8, hpMod: 0, speedMod: +1 },
  { id: 'medium', label: 'Médio', scale: 1.0, hpMod: 0, speedMod: 0 },
  { id: 'large', label: 'Grande', scale: 1.3, hpMod: +2, speedMod: -1 },
  { id: 'colossal', label: 'Colossal', scale: 1.7, hpMod: +4, speedMod: -2 }
];

export const POSTURES = [
  { id: 'biped', label: 'Bípede', stance: 'vertical', agilityBonus: 1 },
  { id: 'quadruped', label: 'Quadrúpede', stance: 'grounded', defenseBonus: 1 }
];

export const HEAD_TYPES = [
  { id: 'apex_carnivore', label: 'Mandíbula de Apex', attackBonus: 2 },
  { id: 'crested_runner', label: 'Cabeça com Crista Aerodinâmica', speedBonus: 1 },
  { id: 'horned_shield', label: 'Escudo Ósseo com Chifres', defenseBonus: 2 },
  { id: 'armored_snout', label: 'Focinho Acorraçado', defenseBonus: 1 },
  { id: 'duckbill', label: 'Bico Chato Sensorial', instinctBonus: 2 },
  { id: 'dome_crusher', label: 'Domo Ósseo Maciço', attackBonus: 1 }
];

export const HORNS_CRESTS = [
  { id: 'none', label: 'Nenhum' },
  { id: 'ceratops_tri', label: 'Três Chifres Longos' },
  { id: 'single_nasal', label: 'Chifre Nasal Rinocerôntico' },
  { id: 'parasaur_tube', label: 'Tubo de Ressonância' },
  { id: 'carno_brows', label: 'Cornos Supraoculares' },
  { id: 'pterosaur_fin', label: 'Crista Óssea Alta' }
];

export const DORSAL_PLATES = [
  { id: 'none', label: 'Liso' },
  { id: 'stego_plates', label: 'Placas Pentagonais' },
  { id: 'spino_sail', label: 'Vela Dorsal Térmica' },
  { id: 'ankyl_osteoderms', label: 'Osteodermas e Espinhos Laterais' },
  { id: 'feather_crest', label: 'Penugem Plumada Dorsal' }
];

export const TAIL_TYPES = [
  { id: 'standard', label: 'Cauda Padrão com Contrapeso' },
  { id: 'ankyl_club', label: 'Clava Óssea Pesada', attackBonus: 1 },
  { id: 'stego_thagomizer', label: 'Espinhos Thagomizer', attackBonus: 1 },
  { id: 'feather_fan', label: 'Leque de Penas Ágeis', agilityBonus: 1 },
  { id: 'whip_tail', label: 'Cauda Chicote Estalada' }
];

export const FEET_CLAWS = [
  { id: 'raptor_sickle', label: 'Garra Retrátil em Foice', attackBonus: 2 },
  { id: 'heavy_hooves', label: 'Patas Colunares Pesadas', defenseBonus: 1 },
  { id: 'grasping_talons', label: 'Mãos Preênseis com Três Dedos', cunningBonus: 1 },
  { id: 'webbed_swimmers', label: 'Membranas Natatórias', aquaticBonus: 2 }
];

export const COLOR_PALETTES = [
  { id: 'emerald_jungle', name: 'Selva Esmeralda', primary: '#2d6a4f', secondary: '#95d5b2', eye: '#ffb703', spots: '#1b4332' },
  { id: 'volcanic_ash', name: 'Cinza Vulcânica', primary: '#2b2b2b', secondary: '#d90429', eye: '#ffba08', spots: '#ef233c' },
  { id: 'glacial_frost', name: 'Gelo Polar', primary: '#caf0f8', secondary: '#0077b6', eye: '#90e0ef', spots: '#03045e' },
  { id: 'desert_amber', name: 'Âmbar do Deserto', primary: '#bc6c25', secondary: '#dda15e', eye: '#606c38', spots: '#283618' },
  { id: 'spectral_night', name: 'Noite Espectral', primary: '#3a0ca3', secondary: '#7209b7', eye: '#4cc9f0', spots: '#f72585' }
];

export const BODY_PATTERNS = [
  { id: 'solid', label: 'Liso' },
  { id: 'tiger_stripes', label: 'Listras de Tigre' },
  { id: 'leopard_spots', label: 'Manchas de Leopardo' },
  { id: 'dorsal_gradient', label: 'Degradê Dorsal' },
  { id: 'jungle_camo', label: 'Camuflagem de Selva' }
];

export const WAR_PAINTINGS = [
  { id: 'none', label: 'Sem Pintura' },
  { id: 'tribal_claws', label: 'Três Garras Vermelhas no Rosto' },
  { id: 'bone_white_skull', label: 'Crânio Branco Pintado' },
  { id: 'bioluminescent_glyphs', label: 'Glifos Brilhantes Antigos' },
  { id: 'battle_scars', label: 'Cicatrizes de Confronto' }
];

/**
 * Monta um modelo lógico de dinossauro a partir de uma lore e preferências do jogador.
 * @param {Object} options
 * @param {string} options.playerLore - História livre escrita pelo jogador.
 * @param {string} options.worldTheme - Tema do mundo da campanha.
 * @param {string} options.baseSpeciesId - Espécie de base opcional.
 * @returns {Object} Ficha de montagem de dinossauro pronta para renderização e regras.
 */
export function assembleDinoPreset(options = {}) {
  const lore = String(options.playerLore || '').toLowerCase();
  const theme = String(options.worldTheme || '').toLowerCase();
  let baseSpecies = options.baseSpeciesId || 'trex';

  // Inferência inteligente por palavras-chave na lore
  let size = 'medium';
  let posture = 'biped';
  let head = 'apex_carnivore';
  let horns = 'none';
  let dorsal = 'none';
  let tail = 'standard';
  let claws = 'raptor_sickle';
  let palette = COLOR_PALETTES[0];
  let pattern = BODY_PATTERNS[0];
  let warPaint = WAR_PAINTINGS[0];
  let accessory = 'backpack';

  if (/rapido|agil|veloz|furtiv|sombra|pequeno|pena/.test(lore)) {
    baseSpecies = 'raptor';
    size = 'small';
    posture = 'biped';
    head = 'crested_runner';
    tail = 'feather_fan';
    palette = COLOR_PALETTES[4]; // Spectral Night
    pattern = BODY_PATTERNS[1]; // Stripes
  } else if (/tanque|defesa|escudo|chifre|forte|pesado|trice/.test(lore)) {
    baseSpecies = 'triceratops';
    size = 'large';
    posture = 'quadruped';
    head = 'horned_shield';
    horns = 'ceratops_tri';
    claws = 'heavy_hooves';
    dorsal = 'stego_plates';
    palette = COLOR_PALETTES[3]; // Desert Amber
  } else if (/coloss|gigante|pesco[cç]o|braquio|sauro/.test(lore)) {
    baseSpecies = 'brachiosaurus';
    size = 'colossal';
    posture = 'quadruped';
    head = 'duckbill';
    tail = 'whip_tail';
    palette = COLOR_PALETTES[0];
  } else if (/armadura|clava|espinho|ankyl|ancilo/.test(lore)) {
    baseSpecies = 'ankylosaurus';
    size = 'large';
    posture = 'quadruped';
    head = 'armored_snout';
    dorsal = 'ankyl_osteoderms';
    tail = 'ankyl_club';
    claws = 'heavy_hooves';
    palette = COLOR_PALETTES[1];
  }

  // Temática do mundo adapta paleta se compatível
  if (theme.includes('vulcan') || theme.includes('lava') || theme.includes('fogo')) {
    palette = COLOR_PALETTES[1]; // Volcanic Ash
    warPaint = WAR_PAINTINGS[1]; // Tribal
  } else if (theme.includes('glacial') || theme.includes('gelo') || theme.includes('polar')) {
    palette = COLOR_PALETTES[2]; // Glacial Frost
    accessory = 'scarf';
  } else if (theme.includes('mágico') || theme.includes('arcano') || theme.includes('fantasia')) {
    warPaint = WAR_PAINTINGS[3]; // Glifos bioluminescentes
    accessory = 'amber_medallion';
  }

  if (lore.includes('guerra') || lore.includes('cicatriz') || lore.includes('batalha')) {
    warPaint = WAR_PAINTINGS[4]; // Battle scars
  }

  const baseDinoData = DINO_CATALOG.find(d => d.id === baseSpecies) || DINO_CATALOG[0];

  return {
    baseSpecies,
    speciesName: baseDinoData.name,
    dinoClass: baseDinoData.dinoClass,
    size,
    posture,
    head,
    horns,
    dorsal,
    tail,
    claws,
    palette,
    pattern,
    warPaint,
    accessory,
    anchorSlots: ANCHOR_SLOTS,
    baseStats: { ...baseDinoData.stats },
    derivedStats: calculatePresetStats(baseDinoData.stats, { size, posture, head, tail, claws })
  };
}

function calculatePresetStats(baseStats, choices) {
  const stats = {
    forca: (baseStats.attack || 5) + 5,
    agilidade: (baseStats.speed || 5) + 5,
    vigor: (baseStats.hp || 3) * 3 + 5,
    instinto: (baseStats.jump || 5) + 5,
    astucia: 10,
    presenca: 10
  };

  const sizeObj = SIZES.find(s => s.id === choices.size);
  if (sizeObj) {
    stats.vigor += sizeObj.hpMod * 2;
    stats.agilidade += sizeObj.speedMod;
  }

  const postObj = POSTURES.find(p => p.id === choices.posture);
  if (postObj?.agilityBonus) stats.agilidade += postObj.agilityBonus;
  if (postObj?.defenseBonus) stats.vigor += postObj.defenseBonus;

  const headObj = HEAD_TYPES.find(h => h.id === choices.head);
  if (headObj?.attackBonus) stats.forca += headObj.attackBonus;
  if (headObj?.speedBonus) stats.agilidade += headObj.speedBonus;
  if (headObj?.defenseBonus) stats.vigor += headObj.defenseBonus;
  if (headObj?.instinctBonus) stats.instinto += headObj.instinctBonus;

  const tailObj = TAIL_TYPES.find(t => t.id === choices.tail);
  if (tailObj?.attackBonus) stats.forca += tailObj.attackBonus;
  if (tailObj?.agilityBonus) stats.agilidade += tailObj.agilityBonus;

  const clawsObj = FEET_CLAWS.find(c => c.id === choices.claws);
  if (clawsObj?.attackBonus) stats.forca += clawsObj.attackBonus;
  if (clawsObj?.defenseBonus) stats.vigor += clawsObj.defenseBonus;
  if (clawsObj?.cunningBonus) stats.astucia += clawsObj.cunningBonus;

  return stats;
}
