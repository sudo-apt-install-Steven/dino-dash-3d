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
  { id: 'orbital_eggs', name: 'Ovos Orbitais Místicos', price: 10000, rarity: 'Lendária', category: 'accessory' }
];

export const TRAILS_SHOP = [
  { id: 'dust', name: 'Poeira Clássica', price: 0, rarity: 'Comum', color: '#e8bc79' },
  { id: 'fire', name: 'Rastro de Fogo', price: 600, rarity: 'Rara', color: '#ff5e1a' },
  { id: 'stars', name: 'Chuva de Estrelas', price: 2500, rarity: 'Épica', color: '#ffd447' },
  { id: 'rainbow', name: 'Arco-Íris', price: 10000, rarity: 'Lendária', color: 'rainbow' }
];

export const MUTATIONS = [
  { id: 'glow', name: 'Brilha no Escuro', desc: 'Aumenta visibilidade e +15% pontuação.' },
  { id: 'fire_trail', name: 'Passos Flamejantes', desc: 'Deixa rastros de fogo e +10% velocidade.' },
  { id: 'bouncy', name: 'Pernas Elásticas', desc: '+15% altura de pulo.' },
  { id: 'lucky_eggs', name: 'Olfato de Ovos', desc: 'Ovos valem +1 extra.' },
  { id: 'tiny_core', name: 'Encolhimento Ágil', desc: 'Hitbox 15% menor.' }
];

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
