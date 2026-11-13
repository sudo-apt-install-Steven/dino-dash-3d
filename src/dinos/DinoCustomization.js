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
  { id: 'cap', name: 'Boné Radical', price: 45, rarity: 'Comum', category: 'accessory' },
  { id: 'scarf', name: 'Cachecol Veloz', price: 65, rarity: 'Comum', category: 'accessory' },
  { id: 'glasses', name: 'Óculos Escuros', price: 110, rarity: 'Rara', category: 'accessory' },
  { id: 'backpack', name: 'Mochila Explorador', price: 140, rarity: 'Rara', category: 'accessory' },
  { id: 'helmet', name: 'Capacete Jurássico', price: 175, rarity: 'Rara', category: 'accessory' },
  { id: 'tophat', name: 'Cartola Elegante', price: 230, rarity: 'Épica', category: 'accessory' },
  { id: 'cape', name: 'Capa de Herói', price: 280, rarity: 'Épica', category: 'accessory' },
  { id: 'wings', name: 'Asas Douradas', price: 340, rarity: 'Épica', category: 'accessory' },
  { id: 'vr_visor', name: 'Visor Cyber', price: 390, rarity: 'Épica', category: 'accessory' },
  { id: 'spikes', name: 'Ombreiras Alfa', price: 430, rarity: 'Lendária', category: 'accessory' },
  { id: 'aura_fire', name: 'Aura Vulcânica', price: 480, rarity: 'Lendária', category: 'accessory' },
  { id: 'crown', name: 'Coroa Real', price: 520, rarity: 'Lendária', category: 'accessory' }
];

export const TRAILS_SHOP = [
  { id: 'dust', name: 'Poeira Clássica', price: 0, rarity: 'Comum', color: '#e8bc79' },
  { id: 'fire', name: 'Rastro de Fogo', price: 120, rarity: 'Rara', color: '#ff5e1a' },
  { id: 'stars', name: 'Chuva de Estrelas', price: 240, rarity: 'Épica', color: '#ffd447' },
  { id: 'rainbow', name: 'Arco-Íris', price: 420, rarity: 'Lendária', color: 'rainbow' }
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
