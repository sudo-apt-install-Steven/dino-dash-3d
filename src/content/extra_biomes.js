// 5 novos biomas exclusivos (elevando o total para 30 quando integrados ao Biomes.js).
// Zero colisão de IDs com os 25 biomas existentes.

export const EXTRA_BIOMES = [
  {
    id: 'amber_canyon',
    tier: 'ultra',
    name: 'Cânion de Âmbar',
    ruleDesc: 'Paredões de resina fossilizada com poças pegajosas de seiva dourada e insetos gigantes.',
    lore: 'Desfiladeiro ancestral onde árvores colossais petrificaram em âmbar puro guardando relíquias pré-históricas.',
    fossil: { id: 'fossil_amber_canyon', name: 'Mosquito em Âmbar Real', icon: '🟠' },
    bossId: 'amber_mantis',
    stickyTrack: true,
    theme: {
      sky: '#d97706',
      fog: '#b45309',
      fogDensity: 0.0115,
      ground: '#78350f',
      track: '#b45309',
      stripe: '#fcd34d',
      bank: '#451a03',
      edgeGlow: '#f59e0b',
      river: '#f59e0b',
      riverEmissive: '#b45309',
      sun: '#fef08a',
      sunGlow: '#f59e0b',
      scenery: {
        pebble: '#92400e',
        rock: '#78350f',
        flora: '#65a30d',
        flower: '#fbbf24',
        mesa: '#9a3412',
        cloud: '#fde68a',
        wood: '#451a03'
      }
    }
  },
  {
    id: 'sunken_citadel',
    tier: 'ultra',
    name: 'Cidadela Submersa',
    ruleDesc: 'Ruínas atlantes submersas com correntes de bolhas e pilares de coral; aquáticos ganham impulso extra.',
    lore: 'Metrópole esquecida sob o oceano jurássico, iluminada por cristais marinhos e vigiada por guardiões de pedra.',
    fossil: { id: 'fossil_sunken_citadel', name: 'Tridente de Coral Antigo', icon: '🏛️' },
    bossId: 'coral_leviathan',
    waterTrack: true,
    currentForce: 2.1,
    theme: {
      sky: '#0c4a6e',
      fog: '#075985',
      fogDensity: 0.014,
      ground: '#164e63',
      track: '#0e7490',
      stripe: '#67e8f9',
      bank: '#083344',
      edgeGlow: '#22d3ee',
      river: '#06b6d4',
      riverEmissive: '#0891b2',
      sun: '#a5f3fc',
      sunGlow: '#38bdf8',
      scenery: {
        pebble: '#155e75',
        rock: '#1e3a5f',
        flora: '#0d9488',
        flower: '#f472b6',
        mesa: '#0f172a',
        cloud: '#67e8f9',
        wood: '#134e4a'
      }
    }
  },
  {
    id: 'giant_shroom_forest',
    tier: 'ultra',
    name: 'Floresta de Cogumelos Gigantes',
    ruleDesc: 'Chapéus elásticos impulsionam saltos altos, mas nuvens de esporos reduzem a visibilidade.',
    lore: 'Vale úmido dominado por fungos titânicos luminescentes que liberam esporos brilhantes ao anoitecer.',
    fossil: { id: 'fossil_giant_shroom', name: 'Esporo Cristalizado', icon: '🍄' },
    bossId: 'mycelium_titan',
    bouncePads: true,
    sporeFog: true,
    theme: {
      sky: '#3b0764',
      fog: '#581c87',
      fogDensity: 0.0135,
      ground: '#1e1b4b',
      track: '#312e81',
      stripe: '#e879f9',
      bank: '#1e1038',
      edgeGlow: '#c084fc',
      river: '#2dd4bf',
      riverEmissive: '#0d9488',
      sun: '#f5d0fe',
      sunGlow: '#a855f7',
      scenery: {
        pebble: '#4c1d95',
        rock: '#3b0764',
        flora: '#ec4899',
        flower: '#38bdf8',
        mesa: '#5b21b6',
        cloud: '#d8b4fe',
        wood: '#2e1065'
      }
    }
  },
  {
    id: 'ash_wastes',
    tier: 'ultra',
    name: 'Deserto de Cinzas',
    ruleDesc: 'Tempestades de cinzas vulcânicas e brasas flutuantes exigem reflexos rápidos e gestão de calor.',
    lore: 'Planície silenciosa coberta por séculos de cinza vulcânica onde apenas predadores blindados sobrevivem.',
    fossil: { id: 'fossil_ash_wastes', name: 'Crânio de Basalto', icon: '🌋' },
    bossId: 'cinder_wyrm',
    heatDrain: true,
    windGusts: true,
    theme: {
      sky: '#3f3f46',
      fog: '#52525b',
      fogDensity: 0.015,
      ground: '#27272a',
      track: '#3f3f46',
      stripe: '#fb923c',
      bank: '#18181b',
      edgeGlow: '#f97316',
      river: '#ea580c',
      riverEmissive: '#9a3412',
      sun: '#fdba74',
      sunGlow: '#ef4444',
      scenery: {
        pebble: '#52525b',
        rock: '#27272a',
        flora: '#71717a',
        flower: '#f97316',
        mesa: '#18181b',
        cloud: '#a1a1aa',
        wood: '#3f3f46'
      }
    }
  },
  {
    id: 'celestial_sanctuary',
    tier: 'ultra',
    name: 'Santuário Celestial',
    ruleDesc: 'Passarelas flutuantes em baixa gravidade com anéis estelares; saltos e voos têm alcance ampliado.',
    lore: 'Templo suspenso entre constelações antigas, erguido sobre nuvens douradas acima do mundo jurássico.',
    fossil: { id: 'fossil_celestial_sanctuary', name: 'Relíquia Estelar', icon: '✨' },
    bossId: 'astral_seraph',
    lowGravity: true,
    theme: {
      sky: '#1e1b4b',
      fog: '#312e81',
      fogDensity: 0.0095,
      ground: '#1e293b',
      track: '#334155',
      stripe: '#fde047',
      bank: '#0f172a',
      edgeGlow: '#38bdf8',
      river: '#818cf8',
      riverEmissive: '#4f46e5',
      sun: '#fef9c3',
      sunGlow: '#facc15',
      scenery: {
        pebble: '#64748b',
        rock: '#475569',
        flora: '#38bdf8',
        flower: '#fde047',
        mesa: '#312e81',
        cloud: '#e0e7ff',
        wood: '#4338ca'
      }
    }
  }
];
