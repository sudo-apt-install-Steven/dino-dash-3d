// Definição completa dos 15 mapas/biomas (5 Essenciais + 10 Avançados),
// suas paletas visuais, mecânicas únicas e bosses associados.

export const BIOMES = [
  // === 5 BIOMAS ESSENCIAIS ===
  {
    id: 'desert',
    tier: 'essential',
    name: 'Deserto Dourado',
    ruleDesc: 'Pista clássica com rio lateral, cactos, escorpiões e águias.',
    lore: 'Antigo leito marinho transformado em dunas douradas onde escorpiões gigantes vigiam os oásis.',
    fossil: { id: 'fossil_desert', name: 'Pinça Fóssil Real', icon: '🦂' },
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
    lore: 'Afluente ancestral raso onde nadadores jurássicos cruzam troncos submersos em busca de cardumes.',
    fossil: { id: 'fossil_river', name: 'Dente de Espinossauro', icon: '🦷' },
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
    lore: 'Caldeira ativa de obsidiana moldada por erupções contínuas e vigiada pelo Golem de Magma.',
    fossil: { id: 'fossil_volcano', name: 'Núcleo de Obsidiana', icon: '🌋' },
    bossId: 'lava_golem',
    heatDrain: true,
    theme: {
      sky: '#993322', fog: '#bd4c2e', fogDensity: 0.011,
      ground: '#61413b', track: '#8d6e63', stripe: '#ffb74d', bank: '#4a302b', edgeGlow: '#ff6d00',
      river: '#ff5722', riverEmissive: '#e65100', sun: '#ffa726', sunGlow: '#ff5252',
      scenery: { pebble: '#8d6e63', rock: '#6d4c41', flora: '#a83324', flower: '#ffb300', mesa: '#732920', cloud: '#a16b62', wood: '#593b36' }
    }
  },
  {
    id: 'ice_age',
    tier: 'essential',
    name: 'Era do Gelo',
    ruleDesc: 'Pista escorregadia e placas de gelo fino que racham.',
    lore: 'Planície congelada onde manadas antigas preservaram presas de marfim sob o gelo eterno.',
    fossil: { id: 'fossil_ice', name: 'Presa de Mamute Glacial', icon: '🦣' },
    bossId: 'frost_mammoth',
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
    lore: 'Satélite roxo colonizado por sondas extraterrestres que estudam DNA pré-histórico.',
    fossil: { id: 'fossil_alien', name: 'Âmbar Estelar Antigo', icon: '🛸' },
    bossId: 'mother_ufo',
    lowGravity: 0.62,
    theme: {
      sky: '#4b1d78', fog: '#663399', fogDensity: 0.010,
      ground: '#3c2563', track: '#7c4dff', stripe: '#00f5d4', bank: '#512da8', edgeGlow: '#00f5d4',
      river: '#00f5d4', riverEmissive: '#7c4dff', sun: '#ff4081', sunGlow: '#aa00ff',
      scenery: { pebble: '#b388ff', rock: '#5e35b1', flora: '#00f5d4', flower: '#ffd54f', mesa: '#512da8', cloud: '#d1c4e9', wood: '#8e24aa' }
    }
  },

  // === 10 BIOMAS AVANÇADOS ===
  {
    id: 'jurassic_forest',
    tier: 'advanced',
    name: 'Floresta Jurássica',
    ruleDesc: 'Árvores gigantes, folhagem densa e raptors na espreita.',
    lore: 'Selva de samambaias colossais e sequoias antigas onde o T-Rex Alfa reina soberano.',
    fossil: { id: 'fossil_forest', name: 'Âmbar de Samambaia', icon: '🌿' },
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
    lore: 'Brejo milenar de águas turvas onde a Hidra de três cabeças regenera suas escamas.',
    fossil: { id: 'fossil_swamp', name: 'Escama de Hidra', icon: '🐍' },
    bossId: 'swamp_hydra',
    mudSlow: 0.86,
    theme: {
      sky: '#477057', fog: '#5b8a6e', fogDensity: 0.012,
      ground: '#3e5c42', track: '#82785f', stripe: '#e6f598', bank: '#4e735c', edgeGlow: '#bef264',
      river: '#6b9e78', riverEmissive: '#4b7f52', sun: '#e9f5a6', sunGlow: '#b7ce63',
      scenery: { pebble: '#7f5539', rock: '#588157', flora: '#4a7c59', flower: '#d9ff47', mesa: '#3a5a40', cloud: '#88ad96', wood: '#5c4033' }
    }
  },
  {
    id: 'fossil_graveyard',
    tier: 'advanced',
    name: 'Cemitério de Fósseis',
    ruleDesc: 'Ossadas colossais e fantasmas noturnos.',
    lore: 'Desfiladeiro de costelas gigantes guardado pela Aranha Cavernosa tecelã de teias ácidas.',
    fossil: { id: 'fossil_graveyard', name: 'Crânio de Titã', icon: '💀' },
    bossId: 'cave_spider',
    theme: {
      sky: '#6b7094', fog: '#53567d', fogDensity: 0.011,
      ground: '#736c69', track: '#b0a2af', stripe: '#e5d4ce', bank: '#606485', edgeGlow: '#72efdd',
      river: '#4cc9f0', riverEmissive: '#4361ee', sun: '#f8edeb', sunGlow: '#b5a7c7',
      scenery: { pebble: '#e5e5e5', rock: '#8a949e', flora: '#dcd6f7', flower: '#4cc9f0', mesa: '#534973', cloud: '#dcd0cb', wood: '#666d73' }
    }
  },
  {
    id: 'ruined_city',
    tier: 'advanced',
    name: 'Cidade em Ruínas',
    ruleDesc: 'Templos pré-históricos, estátuas e armadilhas antigas.',
    lore: 'Templos esquecidos cobertos por ouro e besouros sagrados guardiões dos enigmas rúnicos.',
    fossil: { id: 'fossil_ruins', name: 'Relíquia do Escaravelho', icon: '🪲' },
    bossId: 'amber_scarab',
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
    lore: 'Picos ventosos onde águias colossais patrulham passagens estreitas entre penhascos.',
    fossil: { id: 'fossil_mountain', name: 'Pena Petrificada', icon: '🦅' },
    bossId: 'storm_eagle',
    windBias: 1.5,
    theme: {
      sky: '#74c0fc', fog: '#a5d8ff', fogDensity: 0.011,
      ground: '#eff6ff', track: '#a8c7e6', stripe: '#3b82f6', bank: '#93c5fd', edgeGlow: '#60a5fa',
      river: '#339af0', riverEmissive: '#1864ab', sun: '#fff9db', sunGlow: '#74c0fc',
      scenery: { pebble: '#adb5bd', rock: '#495057', flora: '#2b8a3e', flower: '#e7f5ff', mesa: '#868e96', cloud: '#ffffff', wood: '#495057' }
    }
  },
  {
    id: 'crystal_cavern',
    tier: 'advanced',
    name: 'Caverna de Cristais',
    ruleDesc: 'Escuridão iluminada por cristais brilhantes.',
    lore: 'Gruta profunda de ametista bioluminescente habitada pela lendária Serpe Cristalina.',
    fossil: { id: 'fossil_crystal', name: 'Geodo de Ametista', icon: '🔮' },
    bossId: 'crystal_wyrm',
    theme: {
      sky: '#3c256b', fog: '#56398f', fogDensity: 0.011,
      ground: '#3c2f63', track: '#6b56a6', stripe: '#72efdd', bank: '#4c2d85', edgeGlow: '#80ffdb',
      river: '#64dfdf', riverEmissive: '#5e60ce', sun: '#80ffdb', sunGlow: '#748ffc',
      scenery: { pebble: '#748ffc', rock: '#5b3a96', flora: '#64dfdf', flower: '#ff85b3', mesa: '#452782', cloud: '#7950b5', wood: '#5f3dc4' }
    }
  },
  {
    id: 'migration_savanna',
    tier: 'advanced',
    name: 'Savana da Migração',
    ruleDesc: 'Manadas frequentes onde é possível montar herbívoros.',
    lore: 'Planície dourada de manadas em movimento e caçadores velozes de olhos de águia.',
    fossil: { id: 'fossil_savanna', name: 'Pegada de Manada', icon: '🐾' },
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
    lore: 'Costa tropical pré-histórica onde conchas gigantes e leviatãs emergem na maré alta.',
    fossil: { id: 'fossil_beach', name: 'Amonite Dourada', icon: '🐚' },
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
    lore: 'Dunas carregadas de raios estáticos onde tempestades de areia escondem relíquias antigas.',
    fossil: { id: 'fossil_storm', name: 'Fulgurito Elétrico', icon: '⚡' },
    bossId: 'storm_eagle',
    windBias: -2.0,
    theme: {
      sky: '#c9782c', fog: '#b56a33', fogDensity: 0.012,
      ground: '#a86535', track: '#db8c48', stripe: '#fff3a1', bank: '#8f4d20', edgeGlow: '#fde047',
      river: '#4ea8de', riverEmissive: '#277da1', sun: '#ffba08', sunGlow: '#e85d04',
      scenery: { pebble: '#7f4f24', rock: '#582f0e', flora: '#55a630', flower: '#ff9ebb', mesa: '#6f1d1b', cloud: '#d4a373', wood: '#432818' }
    }
  },
  {
    id: 'alien_factory',
    tier: 'advanced',
    name: 'Fábrica Alienígena',
    ruleDesc: 'Esteiras turbo, drones e lasers rotativos.',
    lore: 'Complexo mecânico orbital onde clones robóticos e o Raptor Cibernético protegem o núcleo.',
    fossil: { id: 'fossil_factory', name: 'Chip Fóssil Quântico', icon: '🤖' },
    bossId: 'cyber_raptor',
    speedMod: 1.15,
    theme: {
      sky: '#334e78', fog: '#485b96', fogDensity: 0.010,
      ground: '#475569', track: '#6f829c', stripe: '#38bdf8', bank: '#334155', edgeGlow: '#38bdf8',
      river: '#c084fc', riverEmissive: '#9333ea', sun: '#38bdf8', sunGlow: '#c084fc',
      scenery: { pebble: '#94a3b8', rock: '#64748b', flora: '#38bdf8', flower: '#fb7185', mesa: '#4338ca', cloud: '#94a3b8', wood: '#475569' }
    }
  }
];

export function getBiomeById(id) {
  return BIOMES.find((b) => b.id === id) || BIOMES[0];
}
