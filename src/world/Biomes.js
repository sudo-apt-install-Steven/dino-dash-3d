// Definição completa dos 15 mapas/biomas (5 Essenciais + 10 Avançados),
// suas paletas visuais, mecânicas únicas e bosses associados.

export const BIOMES = [
  // === 5 BIOMAS ESSENCIAIS ===
  {
    id: 'desert',
    tier: 'essential',
    name: 'Deserto Dourado',
    ruleDesc: 'Pista clássica com rio lateral, cactos, escorpiões e águias.',
    bossId: 'scorpion_king',
    theme: {
      sky: '#f78c4f', fog: '#f28549', fogDensity: 0.011,
      ground: '#d89c54', track: '#eab76a', stripe: '#cf9244', bank: '#c48640',
      river: '#1b98f5', riverEmissive: '#0c5ea8', sun: '#ffe066', sunGlow: '#ff9233',
      scenery: { pebble: '#c48f4d', rock: '#9c6644', flora: '#3b8c3a', flower: '#ff6ca8', mesa: '#c85a28', cloud: '#ffd2a6', wood: '#6b442a' }
    }
  },
  {
    id: 'jurassic_river',
    tier: 'essential',
    name: 'Rio Jurássico',
    ruleDesc: 'Pista alagada com correnteza lateral; aquáticos ganham impulso!',
    bossId: 'plesiosaur',
    waterTrack: true,
    currentForce: 1.8,
    theme: {
      sky: '#4fb8f0', fog: '#5dc2f5', fogDensity: 0.0105,
      ground: '#2b9348', track: '#219ebc', stripe: '#8ecae6', bank: '#55a630',
      river: '#0077b6', riverEmissive: '#023e8a', sun: '#fff3b0', sunGlow: '#90e0ef',
      scenery: { pebble: '#48cae4', rock: '#4f772d', flora: '#2d6a4f', flower: '#ff9ebb', mesa: '#386641', cloud: '#ffffff', wood: '#582f0e' }
    }
  },
  {
    id: 'volcano',
    tier: 'essential',
    name: 'Vulcão em Erupção',
    ruleDesc: 'Poças de lava e calor intenso; pule as poças ou use escudo!',
    bossId: 'alpha_trex',
    heatDrain: true,
    theme: {
      sky: '#591616', fog: '#7f1d1d', fogDensity: 0.014,
      ground: '#2c2525', track: '#423737', stripe: '#ff5e00', bank: '#1f1919',
      river: '#ff4500', riverEmissive: '#d00000', sun: '#ff6d00', sunGlow: '#ff0000',
      scenery: { pebble: '#5c4d4d', rock: '#3d3131', flora: '#7f1d1d', flower: '#ff9100', mesa: '#4a1c1c', cloud: '#6b4b4b', wood: '#2b1f1f' }
    }
  },
  {
    id: 'ice_age',
    tier: 'essential',
    name: 'Era do Gelo',
    ruleDesc: 'Pista escorregadia e placas de gelo fino que racham.',
    bossId: 'storm_eagle',
    slippery: true,
    theme: {
      sky: '#99d9f2', fog: '#b5e6fa', fogDensity: 0.012,
      ground: '#d8f3ff', track: '#bde0fe', stripe: '#ffffff', bank: '#8ecae6',
      river: '#48cae4', riverEmissive: '#0096c7', sun: '#ffffff', sunGlow: '#a2d2ff',
      scenery: { pebble: '#90e0ef', rock: '#6c8ea4', flora: '#1b4965', flower: '#caf0f8', mesa: '#5fa8d3', cloud: '#ffffff', wood: '#4a5759' }
    }
  },
  {
    id: 'alien_planet',
    tier: 'essential',
    name: 'Planeta Alienígena',
    ruleDesc: 'Baixa gravidade: pulos gigantes e armadilhas alienígenas!',
    bossId: 'mother_ufo',
    lowGravity: 0.62,
    theme: {
      sky: '#240046', fog: '#3c096c', fogDensity: 0.012,
      ground: '#1a0b2e', track: '#5a189a', stripe: '#00f5d4', bank: '#3c096c',
      river: '#00f5d4', riverEmissive: '#7209b7', sun: '#f72585', sunGlow: '#7209b7',
      scenery: { pebble: '#9d4edd', rock: '#240046', flora: '#00f5d4', flower: '#ffbe0b', mesa: '#480ca8', cloud: '#c77dff', wood: '#7209b7' }
    }
  },

  // === 10 BIOMAS AVANÇADOS ===
  {
    id: 'jurassic_forest',
    tier: 'advanced',
    name: 'Floresta Jurássica',
    ruleDesc: 'Árvores gigantes, folhagem densa e raptors na espreita.',
    bossId: 'alpha_trex',
    theme: {
      sky: '#6ab04c', fog: '#4d8a35', fogDensity: 0.013,
      ground: '#2d5a27', track: '#7f5539', stripe: '#582f0e', bank: '#386641',
      river: '#219ebc', riverEmissive: '#023047', sun: '#ffe66d', sunGlow: '#a7c957',
      scenery: { pebble: '#6f4e37', rock: '#4f5d2f', flora: '#1b4332', flower: '#ffbe0b', mesa: '#2d6a4f', cloud: '#e9f5db', wood: '#432818' }
    }
  },
  {
    id: 'dark_swamp',
    tier: 'advanced',
    name: 'Pântano Sombrio',
    ruleDesc: 'Lama que desacelera e neblina densa com vaga-lumes.',
    bossId: 'scorpion_king',
    mudSlow: 0.86,
    theme: {
      sky: '#2b3a2e', fog: '#1f2d22', fogDensity: 0.018,
      ground: '#253326', track: '#4a4031', stripe: '#6b705c', bank: '#344e41',
      river: '#588157', riverEmissive: '#3a5a40', sun: '#d4e09b', sunGlow: '#a3b18a',
      scenery: { pebble: '#582f0e', rock: '#3a5a40', flora: '#344e41', flower: '#ccff33', mesa: '#1b4332', cloud: '#4f6d5a', wood: '#3d2b1f' }
    }
  },
  {
    id: 'fossil_graveyard',
    tier: 'advanced',
    name: 'Cemitério de Fósseis',
    ruleDesc: 'Ossadas colossais e fantasmas noturnos.',
    bossId: 'alpha_trex',
    theme: {
      sky: '#4a4e69', fog: '#22223b', fogDensity: 0.0135,
      ground: '#5c5552', track: '#9a8c98', stripe: '#c9ada7', bank: '#4a4e69',
      river: '#4cc9f0', riverEmissive: '#3f37c9', sun: '#f2e9e4', sunGlow: '#9a8c98',
      scenery: { pebble: '#e5e5e5', rock: '#6c757d', flora: '#dcd6f7', flower: '#4cc9f0', mesa: '#3d3456', cloud: '#c9ada7', wood: '#495057' }
    }
  },
  {
    id: 'ruined_city',
    tier: 'advanced',
    name: 'Cidade em Ruínas',
    ruleDesc: 'Templos pré-históricos, estátuas e armadilhas antigas.',
    bossId: 'scorpion_king',
    theme: {
      sky: '#d4a373', fog: '#bc8a5f', fogDensity: 0.0115,
      ground: '#7f5539', track: '#b08968', stripe: '#e6ccb2', bank: '#6c584c',
      river: '#2a9d8f', riverEmissive: '#264653', sun: '#ffd166', sunGlow: '#f4a261',
      scenery: { pebble: '#a98467', rock: '#6c584c', flora: '#606c38', flower: '#ffd166', mesa: '#582f0e', cloud: '#faedcd', wood: '#4a3525' }
    }
  },
  {
    id: 'snowy_mountain',
    tier: 'advanced',
    name: 'Montanha Nevada',
    ruleDesc: 'Vento lateral nas alturas e pedras rolando da encosta.',
    bossId: 'storm_eagle',
    windBias: 1.5,
    theme: {
      sky: '#74c0fc', fog: '#a5d8ff', fogDensity: 0.012,
      ground: '#e9ecef', track: '#dee2e6', stripe: '#4dabf7', bank: '#adb5bd',
      river: '#339af0', riverEmissive: '#1864ab', sun: '#fff9db', sunGlow: '#74c0fc',
      scenery: { pebble: '#adb5bd', rock: '#495057', flora: '#2b8a3e', flower: '#e7f5ff', mesa: '#868e96', cloud: '#ffffff', wood: '#495057' }
    }
  },
  {
    id: 'crystal_cavern',
    tier: 'advanced',
    name: 'Caverna de Cristais',
    ruleDesc: 'Escuridão iluminada por cristais brilhantes.',
    bossId: 'mother_ufo',
    theme: {
      sky: '#10002b', fog: '#10002b', fogDensity: 0.017,
      ground: '#1b1433', track: '#2b1e4a', stripe: '#72efdd', bank: '#240046',
      river: '#64dfdf', riverEmissive: '#5e60ce', sun: '#72efdd', sunGlow: '#5390d9',
      scenery: { pebble: '#5e60ce', rock: '#3c096c', flora: '#64dfdf', flower: '#ff70a6', mesa: '#240046', cloud: '#3c096c', wood: '#3a0ca3' }
    }
  },
  {
    id: 'migration_savanna',
    tier: 'advanced',
    name: 'Savana da Migração',
    ruleDesc: 'Manadas frequentes onde é possível montar herbívoros.',
    bossId: 'alpha_trex',
    theme: {
      sky: '#f4a261', fog: '#e76f51', fogDensity: 0.01,
      ground: '#c9a227', track: '#e9c46a', stripe: '#a47148', bank: '#9b7220',
      river: '#48cae4', riverEmissive: '#0077b6', sun: '#fff3b0', sunGlow: '#f4a261',
      scenery: { pebble: '#a47148', rock: '#7f4f24', flora: '#606c38', flower: '#ffb703', mesa: '#9c6644', cloud: '#ffe8d6', wood: '#582f0e' }
    }
  },
  {
    id: 'beach_sea',
    tier: 'advanced',
    name: 'Praia e Mar Aberto',
    ruleDesc: 'Ondas empurram na areia e marés sobem rapidamente.',
    bossId: 'plesiosaur',
    currentForce: 1.2,
    theme: {
      sky: '#38bdf8', fog: '#7dd3fc', fogDensity: 0.009,
      ground: '#fde68a', track: '#fef3c7', stripe: '#f59e0b', bank: '#fcd34d',
      river: '#0284c7', riverEmissive: '#0369a1', sun: '#fef08a', sunGlow: '#38bdf8',
      scenery: { pebble: '#d97706', rock: '#78716c', flora: '#16a34a', flower: '#fb7185', mesa: '#0284c7', cloud: '#ffffff', wood: '#92400e' }
    }
  },
  {
    id: 'storm_desert',
    tier: 'advanced',
    name: 'Deserto de Tempestade',
    ruleDesc: 'Redemoinhos e ventania constante desviam saltos.',
    bossId: 'storm_eagle',
    windBias: -2.0,
    theme: {
      sky: '#b5651d', fog: '#9c5221', fogDensity: 0.016,
      ground: '#a45a2a', track: '#cc7733', stripe: '#7a3e13', bank: '#8b4513',
      river: '#4ea8de', riverEmissive: '#277da1', sun: '#ffba08', sunGlow: '#e85d04',
      scenery: { pebble: '#7f4f24', rock: '#582f0e', flora: '#55a630', flower: '#ff9ebb', mesa: '#6f1d1b', cloud: '#d4a373', wood: '#432818' }
    }
  },
  {
    id: 'alien_factory',
    tier: 'advanced',
    name: 'Fábrica Alienígena',
    ruleDesc: 'Esteiras turbo, drones e lasers rotativos.',
    bossId: 'mother_ufo',
    speedMod: 1.15,
    theme: {
      sky: '#0f172a', fog: '#1e1b4b', fogDensity: 0.012,
      ground: '#1e293b', track: '#334155', stripe: '#22d3ee', bank: '#0f172a',
      river: '#a855f7', riverEmissive: '#7e22ce', sun: '#22d3ee', sunGlow: '#a855f7',
      scenery: { pebble: '#64748b', rock: '#475569', flora: '#22d3ee', flower: '#f43f5e', mesa: '#312e81', cloud: '#475569', wood: '#334155' }
    }
  }
];

export function getBiomeById(id) {
  return BIOMES.find((b) => b.id === id) || BIOMES[0];
}
