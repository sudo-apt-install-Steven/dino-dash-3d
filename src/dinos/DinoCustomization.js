// Personalização de cores, padrões, acessórios, rastros, presets, loja e mutações aleatórias.
import { Save } from '../systems/Save.js';

export const PATTERNS = [
  { id: 'solid', label: 'Liso' },
  { id: 'stripes', label: 'Listras' },
  { id: 'spots', label: 'Manchas' },
  { id: 'gradient', label: 'Degradê' },
  { id: 'camo', label: 'Camuflagem' },
  { id: 'neon', label: 'Neon' }
];

export const ACCESSORIES_SHOP = [
  { id: 'none', name: 'Sem Acessório', price: 0, rarity: 'Comum', category: 'accessory' },
  // Tier Comum (150 🥚)
  { id: 'cap', name: 'Boné Radical', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'scarf', name: 'Cachecol Veloz', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'bandana', name: 'Bandana Tribal', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'beanie', name: 'Gorro Polar', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'bowtie', name: 'Gravata Elegante', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'bell_collar', name: 'Coleira com Sino', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'flower_crown', name: 'Coroa de Flores', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'leaf_cape', name: 'Manto de Folhas', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'antenna', name: 'Antena Sismológica', price: 150, rarity: 'Comum', category: 'accessory' },
  { id: 'monocle', name: 'Monóculo Dourado', price: 150, rarity: 'Comum', category: 'accessory' },
  // Tier Rara (600 🥚)
  { id: 'glasses', name: 'Óculos Escuros', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'backpack', name: 'Mochila Explorador', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'helmet', name: 'Capacete Jurássico', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'cowboy_hat', name: 'Chapéu do Deserto', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'explorer_hat', name: 'Chapéu Safári', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'snorkel', name: 'Máscara de Mergulho', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'chef_hat', name: 'Chapéu de Chef', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'headphones', name: 'Fone Jurássico', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'quiver', name: 'Aljava de Caçador', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'turtle_shell', name: 'Casco Protetor', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'gold_chain', name: 'Corrente de Ouro', price: 600, rarity: 'Rara', category: 'accessory' },
  { id: 'spike_collar', name: 'Coleira de Espinhos', price: 600, rarity: 'Rara', category: 'accessory' },
  // Tier Épica (2.500 🥚)
  { id: 'tophat', name: 'Cartola Elegante', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'cape', name: 'Capa de Herói', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'wings', name: 'Asas Douradas', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'vr_visor', name: 'Visor Cyber', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'visor_neon', name: 'Visor Holográfico', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'viking_horn', name: 'Elmo Viking', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'wizard_hat', name: 'Chapéu Arcano', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'pirate_hat', name: 'Tricórnio Pirata', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'star_shades', name: 'Óculos Estelares', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'jetpack', name: 'Jetpack Turbo', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'bat_wings', name: 'Asas Noturnas', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'amber_medallion', name: 'Medalhão de Âmbar', price: 2500, rarity: 'Épica', category: 'accessory' },
  { id: 'lantern_neck', name: 'Lanterna de Caverna', price: 2500, rarity: 'Épica', category: 'accessory' },
  // Tier Lendária (10.000 🥚)
  { id: 'spikes', name: 'Ombreiras Alfa', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_fire', name: 'Aura Vulcânica', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'crown', name: 'Coroa Real', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'halo', name: 'Auréola Celestial', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'angel_wings', name: 'Asas Celestiais', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'crystal_wings', name: 'Asas de Cristal', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_ice', name: 'Aura Glacial', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_lightning', name: 'Aura Tempestade', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_galaxy', name: 'Aura Cósmica', price: 10000, rarity: 'Lendária', category: 'accessory' },
  { id: 'orbital_eggs', name: 'Ovos Orbitais Místicos', price: 10000, rarity: 'Lendária', category: 'accessory' },
  // Novos Acessórios da Grande Atualização
  { id: 'diving_mask', name: 'Máscara Abissal', price: 650, rarity: 'Rara', category: 'accessory' },
  { id: 'sub_jetpack', name: 'Propulsor Submarino', price: 1800, rarity: 'Épica', category: 'accessory' },
  { id: 'star_cape', name: 'Manto Estelar', price: 2800, rarity: 'Épica', category: 'accessory' },
  { id: 'cyber_armor', name: 'Blindagem Cyber', price: 4200, rarity: 'Épica', category: 'accessory' },
  { id: 'mecha_wings', name: 'Asas Propulsoras Mecha', price: 8500, rarity: 'Lendária', category: 'accessory' },
  { id: 'floating_crystal', name: 'Cristal Terra Oca', price: 9500, rarity: 'Lendária', category: 'accessory' },
  { id: 'cosmic_horns', name: 'Chifres Cósmicos Alfa', price: 12000, rarity: 'Mítica', category: 'accessory' }
];

export const TRAILS_SHOP = [
  { id: 'dust', name: 'Poeira Clássica', price: 0, rarity: 'Comum', color: '#e8bc79' },
  { id: 'fire', name: 'Rastro de Fogo', price: 600, rarity: 'Rara', color: '#ff5e1a' },
  { id: 'stars', name: 'Chuva de Estrelas', price: 2500, rarity: 'Épica', color: '#ffd447' },
  { id: 'rainbow', name: 'Arco-Íris', price: 10000, rarity: 'Lendária', color: 'rainbow' }
];

export const SKIN_VARIANTS = [
  { id: 'normal', name: 'Padrão', badge: '🦖', rarity: 'Comum', price: 0, desc: 'Visual clássico da espécie.' },
  { id: 'unique_crimson', name: 'Cor Única: Rubi Vulcânico', badge: '❤️', rarity: 'Rara', price: 800, primary: '#dc2626', secondary: '#fecaca', eye: '#fef08a', spots: '#7f1d1d', spikes: '#fb923c', pattern: 'stripes', desc: 'Tonalidade escarlate exclusiva de caçador.' },
  { id: 'unique_cobalt', name: 'Cor Única: Safira Abissal', badge: '💙', rarity: 'Rara', price: 800, primary: '#2563eb', secondary: '#dbeafe', eye: '#22d3ee', spots: '#1e3a8a', spikes: '#7dd3fc', pattern: 'gradient', desc: 'Azul profundo brilhante dos mares jurássicos.' },
  { id: 'unique_amber', name: 'Cor Única: Âmbar Imperial', badge: '🧡', rarity: 'Épica', price: 1800, primary: '#d97706', secondary: '#fef3c7', eye: '#ffffff', spots: '#78350f', spikes: '#fde047', pattern: 'spots', desc: 'Dourado âmbar fossilizado raríssimo.' },
  { id: 'unique_jade', name: 'Cor Única: Jade Subterrânea', badge: '💚', rarity: 'Épica', price: 1800, primary: '#059669', secondary: '#a7f3d0', eye: '#fde047', spots: '#064e3b', spikes: '#5eead4', pattern: 'neon', desc: 'Brilho esmeralda extraído da Terra Oca.' },
  { id: 'shiny', name: 'Shiny Cintilante ✨', badge: '✨', rarity: 'Lendária', price: 0, gachaOnly: true, primary: '#fef08a', secondary: '#ffffff', eye: '#38bdf8', spots: '#f59e0b', spikes: '#f472b6', pattern: 'neon', emissiveBoost: 0.42, desc: 'Variante Shiny rara obtida no Gacha! Emite brilho estelar e +15% pontuação.' },
  { id: 'mecha', name: 'Mecânico / Cyber Bot 🤖', badge: '🤖', rarity: 'Mítica', price: 0, gachaOnly: true, primary: '#64748b', secondary: '#e2e8f0', eye: '#38bdf8', spots: '#1e293b', spikes: '#00f5d4', pattern: 'neon', isMecha: true, desc: 'Transformação robótica completa estilo Mecha-Titan com visor LED, placas metálicas e propulsores!' },
  { id: 'secret', name: 'Secreto Cósmico 🌌', badge: '🌌', rarity: 'Secreta', price: 0, gachaOnly: true, primary: '#5b21b6', secondary: '#f5d0fe', eye: '#00f5d4', spots: '#1e1b4b', spikes: '#f472b6', pattern: 'neon', emissiveBoost: 0.55, desc: 'Forma secreta ultra-rara do universo Terra Oca +25% Score e aura espacial!' }
];

export const MUTATIONS = [
  { id: 'amber_core', name: 'Núcleo de Âmbar', badge: '🧬', rarity: 'Comum', cost: 0, desc: '+10% ganho de Fúria ao coletar ovos.', mods: { furyBonus: 0.1 } },
  { id: 'glow', name: 'Escamas Bioluminescentes', badge: '💡', rarity: 'Comum', cost: 450, desc: 'Brilha no escuro e +15% pontuação.', mods: { scoreMult: 0.15, emissive: '#5eead4' } },
  { id: 'fire_trail', name: 'Passos Flamejantes', badge: '🔥', rarity: 'Rara', cost: 850, desc: 'Rastro ígneo +8% velocidade e +10% ataque.', mods: { speedMult: 0.08, emissive: '#f97316' } },
  { id: 'bouncy', name: 'Tendões Elásticos', badge: '🦘', rarity: 'Rara', cost: 900, desc: '+15% altura de pulo e economia de estamina no salto.', mods: { jumpMult: 0.15, staminaSave: 0.15 } },
  { id: 'lucky_eggs', name: 'Olfato Fóssil', badge: '🥚', rarity: 'Épica', cost: 1600, desc: 'Todo ovo comum coletado concede +1 extra.', mods: { eggBonus: 1 } },
  { id: 'tiny_core', name: 'Encolhimento Ágil', badge: '🔬', rarity: 'Épica', cost: 1900, desc: 'Hitbox 16% menor contra obstáculos fechados.', mods: { hitboxScale: 0.84 } },
  { id: 'venom_spines', name: 'Espinhos Peçonhentos', badge: '☠️', rarity: 'Épica', cost: 2200, desc: 'Resistência a veneno/lama + recarga rápida de Ataque (Q).', mods: { attackCdMult: 0.78, poisonResist: true } },
  { id: 'turbo_tail', name: 'Cauda Hidrodinâmica', badge: '⚡', rarity: 'Lendária', cost: 3400, desc: '+22% regeneração de Estamina em terra e água.', mods: { stamRegenMult: 1.22 } },
  { id: 'mecha_core', name: 'Implante Nano-Mecha', badge: '⚙️', rarity: 'Mítica', cost: 5200, desc: '+1 Escudo inicial em toda corrida + +15% duração de Fúria.', mods: { startShield: 1, furyDurMult: 1.15 } },
  { id: 'cosmic_dna', name: 'DNA Híbrido Cósmico', badge: '🌌', rarity: 'Secreta', cost: 0, gachaOnly: true, desc: '+20% Score, +15% Raio de Ímã e +1 Escudo inicial!', mods: { scoreMult: 0.2, magnetBonus: 2.2, startShield: 1 } }
];

export function getSkinVariantDef(id) {
  return SKIN_VARIANTS.find((v) => v.id === id) || SKIN_VARIANTS[0];
}

export function isSkinVariantUnlocked(dinoId, variantId) {
  if (!variantId || variantId === 'normal') return true;
  const map = Save.data.unlockedSkins || {};
  const list = map[dinoId] || [];
  return list.includes(variantId) || (map['__all__'] || []).includes(variantId);
}

export function unlockSkinVariant(dinoId, variantId) {
  if (!Save.data.unlockedSkins) Save.data.unlockedSkins = {};
  const targetKey = dinoId || '__all__';
  if (!Array.isArray(Save.data.unlockedSkins[targetKey])) {
    Save.data.unlockedSkins[targetKey] = [];
  }
  const already = Save.data.unlockedSkins[targetKey].includes(variantId);
  if (!already) {
    Save.data.unlockedSkins[targetKey].push(variantId);
    Save.save();
  }
  return !already;
}

export function getEquippedSkinVariant(dinoId) {
  return Save.data.equippedSkinVariants?.[dinoId] || 'normal';
}

export function setEquippedSkinVariant(dinoId, variantId) {
  if (!Save.data.equippedSkinVariants) Save.data.equippedSkinVariants = {};
  Save.data.equippedSkinVariants[dinoId] = variantId || 'normal';
  Save.save();
}

export function applySkinVariantToColors(baseColors, variantId) {
  const v = getSkinVariantDef(variantId);
  if (!v || v.id === 'normal') return { ...baseColors };
  return {
    ...baseColors,
    primary: v.primary || baseColors.primary,
    secondary: v.secondary || baseColors.secondary,
    eye: v.eye || baseColors.eye,
    spots: v.spots || baseColors.spots,
    spikes: v.spikes || baseColors.spikes,
    pattern: v.pattern || baseColors.pattern || 'solid',
    skinVariant: v.id,
    isMecha: !!v.isMecha,
    isShiny: v.id === 'shiny',
    isSecret: v.id === 'secret'
  };
}

export function getMutationDef(id) {
  return MUTATIONS.find((m) => m.id === id) || null;
}

export function isMutationUnlocked(id) {
  return (Save.data.unlockedMutations || ['amber_core']).includes(id);
}

export function unlockMutation(id) {
  if (!Array.isArray(Save.data.unlockedMutations)) Save.data.unlockedMutations = ['amber_core'];
  const isNew = !Save.data.unlockedMutations.includes(id);
  if (isNew) {
    Save.data.unlockedMutations.push(id);
    Save.save();
  }
  return isNew;
}

export function getActivePreset(playerKey = 'p1') {
  const cfg = Save.data.customization[playerKey] || Save.data.customization.p1;
  return cfg.presets[cfg.activePreset] || cfg.presets[0];
}

export function randomizePreset(preset) {
  const palette = ['#3fa34d', '#e05a2b', '#2d7dd2', '#8338ec', '#e9c46a', '#f72585', '#1f8a8c', '#ff9f1c'];
  const pick = () => palette[Math.floor(Math.random() * palette.length)];
  preset.useCustomColors = true;
  preset.primary = pick();
  preset.secondary = '#f8f0d8';
  preset.eye = Math.random() < 0.5 ? '#ffd54f' : '#ffffff';
  preset.spots = pick();
  preset.spikes = pick();
  preset.pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)].id;
  const unlockedAcc = Save.data.unlockedAccessories || ['none'];
  preset.accessory = unlockedAcc[Math.floor(Math.random() * unlockedAcc.length)];
  Save.save();
  return preset;
}

export function rollRandomMutation() {
  return MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
}

const FIXED_SKIN_THEMES = [
  { key: 'original', name: 'Original Fóssil', badge: '🌿' },
  { key: 'magma', name: 'Magma Alfa', badge: '🔥', primary: '#b91c1c', secondary: '#fde68a', eye: '#fbbf24', spots: '#450a0a', spikes: '#fb923c', pattern: 'stripes' },
  { key: 'glacial', name: 'Ártico Real', badge: '❄️', primary: '#0284c7', secondary: '#e0f2fe', eye: '#fef08a', spots: '#1e3a8a', spikes: '#bae6fd', pattern: 'gradient' }
];

const CUSTOM_SKIN_OVERRIDES = {
  trex: [
    { key: 'amber', name: 'Âmbar Supremo', badge: '💎', primary: '#d97706', secondary: '#fef3c7', eye: '#ef4444', spots: '#78350f', spikes: '#fbbf24', pattern: 'spots' },
    { key: 'cyber', name: 'Apex Neon', badge: '⚡', primary: '#1e293b', secondary: '#38bdf8', eye: '#22d3ee', spots: '#6366f1', spikes: '#00f5d4', pattern: 'neon' }
  ],
  raptor: [
    { key: 'blue', name: 'Alfa Índigo', badge: '💠', primary: '#1d4ed8', secondary: '#dbeafe', eye: '#facc15', spots: '#38bdf8', spikes: '#93c5fd', pattern: 'stripes' },
    { key: 'shadow', name: 'Caçador Sombrio', badge: '🌑', primary: '#312e81', secondary: '#e2e8f0', eye: '#f43f5e', spots: '#1e1b4b', spikes: '#a855f7', pattern: 'camo' }
  ],
  spinosaurus: [
    { key: 'abyssal', name: 'Leviatã Abissal', badge: '🌊', primary: '#0f766e', secondary: '#99f6e4', eye: '#fde047', spots: '#134e4a', spikes: '#2dd4bf', pattern: 'stripes' },
    { key: 'crimson', name: 'Vela Escarlate', badge: '🔥', primary: '#991b1b', secondary: '#fecaca', eye: '#fbbf24', spots: '#450a0a', spikes: '#f97316', pattern: 'gradient' }
  ],
  triceratops: [
    { key: 'ivory', name: 'Marfim Real', badge: '👑', primary: '#b45309', secondary: '#fef3c7', eye: '#ffffff', spots: '#78350f', spikes: '#fde047', pattern: 'spots' },
    { key: 'moss', name: 'Guardião Musgo', badge: '🍃', primary: '#3f6212', secondary: '#ecfccb', eye: '#a3e635', spots: '#1a2e05', spikes: '#84cc16', pattern: 'camo' }
  ],
  ghostgold: [
    { key: 'celestial', name: 'Espectro Astral', badge: '✨', primary: '#7c3aed', secondary: '#f5f3ff', eye: '#22d3ee', spots: '#4c1d95', spikes: '#fde047', pattern: 'neon' },
    { key: 'solar', name: 'Aura Solar', badge: '☀️', primary: '#f59e0b', secondary: '#fffbeb', eye: '#ffffff', spots: '#b45309', spikes: '#fef08a', pattern: 'gradient' }
  ]
};

export function getDinoSkins(dinoSpec) {
  const spec = typeof dinoSpec === 'string' ? { id: dinoSpec, colors: {} } : (dinoSpec || { id: 'trex', colors: {} });
  const base = spec.colors || { primary: '#3fa34d', secondary: '#c7e89b', eye: '#ffd54f', spots: '#1e5b2b', spikes: '#e87a24' };
  const orig = {
    id: `${spec.id}_original`,
    name: FIXED_SKIN_THEMES[0].name,
    badge: FIXED_SKIN_THEMES[0].badge,
    ...base,
    pattern: 'solid'
  };
  const customPair = CUSTOM_SKIN_OVERRIDES[spec.id];
  if (customPair) {
    return [orig, ...customPair.map((s) => ({ id: `${spec.id}_${s.key}`, ...s }))];
  }
  return [
    orig,
    { id: `${spec.id}_magma`, ...FIXED_SKIN_THEMES[1] },
    { id: `${spec.id}_glacial`, ...FIXED_SKIN_THEMES[2] }
  ];
}
