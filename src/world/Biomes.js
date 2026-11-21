// Definição completa dos 30 mapas/biomas (5 Essenciais + 20 Avançados + 5 Ultra Expansão),
// suas paletas visuais, mecânicas únicas e bosses associados.
import { EXTRA_BIOMES } from '../content/extra_biomes.js';

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
      ground: '#2b9348', track: '#b59264', stripe: '#8c6b3f', bank: '#55a630',
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
  },
  {
    id: 'ocean_surface',
    tier: 'essential',
    name: 'Recife Oceânico',
    ruleDesc: 'Corrida sobre o mar cristalino! Ondas impulsionam saltos e dinos aquáticos ganham turbinamento.',
    lore: 'Mar pré-histórico azul-turquesa repleto de corais vivos, cardumes brilhantes e predadores marinhos.',
    fossil: { id: 'fossil_ocean', name: 'Concha de Mosassauro', icon: '🌊' },
    bossId: 'leviathan_abyssal',
    waterTrack: true,
    oceanSurface: true,
    currentForce: 1.5,
    theme: {
      sky: '#38bdf8', fog: '#7dd3fc', fogDensity: 0.0085,
      ground: '#d4a359', track: '#e6c280', stripe: '#c99e52', bank: '#b8863b', edgeGlow: '#67e8f9',
      river: '#0369a1', riverEmissive: '#0ea5e9', sun: '#fef08a', sunGlow: '#fde047',
      scenery: { pebble: '#f472b6', rock: '#0c4a6e', flora: '#2dd4bf', flower: '#fb7185', mesa: '#075985', cloud: '#ffffff', wood: '#78350f' }
    }
  },
  {
    id: 'abyss_submerged',
    tier: 'advanced',
    name: 'Abismo Submerso',
    ruleDesc: 'Mapa totalmente subaquático com baixa gravidade marinha, bolhas e corais neon!',
    lore: 'Fossa oceânica luminosa de águas profundas habitada por Dunkleosteus e pelo Leviatã Abissal.',
    fossil: { id: 'fossil_abyss', name: 'Pérola Bioluminescente', icon: '🫧' },
    bossId: 'leviathan_abyssal',
    waterTrack: true,
    submerged: true,
    lowGravity: 0.72,
    theme: {
      sky: '#1d4ed8', fog: '#2563eb', fogDensity: 0.0115,
      ground: '#0f2942', track: '#1e4e68', stripe: '#38bdf8', bank: '#163b52', edgeGlow: '#38bdf8',
      river: '#0891b2', riverEmissive: '#06b6d4', sun: '#72efdd', sunGlow: '#38bdf8',
      scenery: { pebble: '#38bdf8', rock: '#334155', flora: '#34d399', flower: '#f472b6', mesa: '#1e293b', cloud: '#67e8f9', wood: '#0f766e' }
    }
  },
  {
    id: 'hollow_earth',
    tier: 'advanced',
    name: 'Terra Oca',
    ruleDesc: 'Subterrâneo cristalino acessível por portais no Terremoto (ou após descoberta)!',
    lore: 'Mundo oculto sob a crosta terrestre iluminado por cristais gigantes e fungos luminescentes.',
    fossil: { id: 'fossil_hollow', name: 'Núcleo Geotérmico', icon: '🕳️' },
    bossId: 'crystal_wyrm',
    subterranean: true,
    lowGravity: 0.88,
    theme: {
      sky: '#2e1065', fog: '#4c1d95', fogDensity: 0.0105,
      ground: '#4338ca', track: '#7c3aed', stripe: '#2dd4bf', bank: '#3730a3', edgeGlow: '#5eead4',
      river: '#14b8a6', riverEmissive: '#0d9488', sun: '#2dd4bf', sunGlow: '#a855f7',
      scenery: { pebble: '#a78bfa', rock: '#4c1d95', flora: '#2dd4bf', flower: '#f472b6', mesa: '#312e81', cloud: '#6d28d9', wood: '#5b21b6' }
    }
  },
  {
    id: 'mecha_city',
    tier: 'advanced',
    name: 'Metrópole Mecha',
    ruleDesc: 'Rodovia cibernética futurista de alta velocidade sob comando do Mecha Titan.',
    lore: 'Complexo neocretáceo onde placas de titânio e reatores sustentam dinossauros cibernéticos.',
    fossil: { id: 'fossil_mecha', name: 'Engrenagem Alfa Cyber', icon: '⚙️' },
    bossId: 'mecha_titan',
    speedMod: 1.12,
    theme: {
      sky: '#1e293b', fog: '#334155', fogDensity: 0.0095,
      ground: '#334155', track: '#64748b', stripe: '#38bdf8', bank: '#475569', edgeGlow: '#38bdf8',
      river: '#06b6d4', riverEmissive: '#0284c7', sun: '#38bdf8', sunGlow: '#f43f5e',
      scenery: { pebble: '#cbd5e1', rock: '#475569', flora: '#22d3ee', flower: '#fb7185', mesa: '#1e293b', cloud: '#64748b', wood: '#334155' }
    }
  },

  // === 6 NOVOS BIOMAS DA MEGA EXPANSÃO (20–25) ===
  {
    id: 'lunar_crater',
    tier: 'advanced',
    name: 'Cratera Lunar',
    ruleDesc: 'Gravidade lunar reduzida (0.52x): saltos amplos sobre crateras e micro-meteoros!',
    lore: 'Bacia de impacto silenciosa sob o céu estrelado onde o Colosso Cósmico guarda fragmentos de asteroides.',
    fossil: { id: 'fossil_lunar', name: 'Meteorito de Titânio', icon: '🌙' },
    bossId: 'colosso_cosmico',
    lowGravity: 0.52,
    craterQuake: true,
    theme: {
      sky: '#1e2444', fog: '#2a325c', fogDensity: 0.0085,
      ground: '#52586b', track: '#8d95ab', stripe: '#e2e8f0', bank: '#3f4659', edgeGlow: '#67e8f9',
      river: '#38bdf8', riverEmissive: '#0284c7', sun: '#60a5fa', sunGlow: '#38bdf8',
      scenery: { pebble: '#cbd5e1', rock: '#64748b', flora: '#67e8f9', flower: '#a5f3fc', mesa: '#3b4259', cloud: '#475569', wood: '#52586b', emissiveFlora: '#38bdf8', emissiveIntensity: 0.35 }
    }
  },
  {
    id: 'aztec_temple',
    tier: 'advanced',
    name: 'Templo Asteca',
    ruleDesc: 'Degraus dourados, brisas de altitude e armadilhas rúnicas ancestrais.',
    lore: 'Pirâmide colossal tomada por vinhas sagradas onde o Titã Fóssil protege relíquias de jade e ouro.',
    fossil: { id: 'fossil_aztec', name: 'Ídolo Solar de Jade', icon: '🏛️' },
    bossId: 'titan_fossil',
    windBias: 0.85,
    templeTraps: true,
    theme: {
      sky: '#d98a3c', fog: '#c27938', fogDensity: 0.0105,
      ground: '#566d3e', track: '#c49b5c', stripe: '#2dd4bf', bank: '#8f6b32', edgeGlow: '#facc15',
      river: '#0d9488', riverEmissive: '#0f766e', sun: '#fde047', sunGlow: '#f59e0b',
      scenery: { pebble: '#d4a359', rock: '#78716c', flora: '#15803d', flower: '#facc15', mesa: '#92400e', cloud: '#fef3c7', wood: '#713f12', emissiveFlower: '#facc15', emissiveIntensity: 0.28 }
    }
  },
  {
    id: 'bioluminescent_jungle',
    tier: 'advanced',
    name: 'Selva Bioluminescente',
    ruleDesc: 'Esporos luminosos e correnteza fosforescente que ampliam visibilidade na noite.',
    lore: 'Floresta tropical de fungos gigantes cintilantes cujo rio abissal abriga o temido Kraken Abissal.',
    fossil: { id: 'fossil_biolum', name: 'Esporo Luminescente', icon: '🍄' },
    bossId: 'kraken_abissal',
    currentForce: 1.0,
    sporeDrift: true,
    theme: {
      sky: '#16425b', fog: '#1f5673', fogDensity: 0.010,
      ground: '#164e63', track: '#1f6f78', stripe: '#34d399', bank: '#0f3d4c', edgeGlow: '#22d3ee',
      river: '#06b6d4', riverEmissive: '#2dd4bf', sun: '#a7f3d0', sunGlow: '#22d3ee',
      scenery: { pebble: '#2dd4bf', rock: '#1e3a5f', flora: '#10b981', flower: '#f472b6', mesa: '#134e4a', cloud: '#38bdf8', wood: '#0f766e', emissiveFlora: '#14b8a6', emissiveFlower: '#f472b6', emissiveIntensity: 0.52 }
    }
  },
  {
    id: 'obsidian_desert',
    tier: 'advanced',
    name: 'Deserto de Obsidiana',
    ruleDesc: 'Dunas de vidro vulcânico, vento quente constante e miragens rubi!',
    lore: 'Antigo mar secado por erupções que vitrificaram as dunas onde o Rei Megalodon ronda a fenda rubi.',
    fossil: { id: 'fossil_obsidian', name: 'Dente de Obsidiana', icon: '🖤' },
    bossId: 'rei_megalodon',
    heatDrain: true,
    windBias: -1.65,
    theme: {
      sky: '#6b324c', fog: '#7a3c54', fogDensity: 0.0105,
      ground: '#362d42', track: '#574e66', stripe: '#f59e0b', bank: '#2b2436', edgeGlow: '#fb7185',
      river: '#e11d48', riverEmissive: '#be123c', sun: '#fda4af', sunGlow: '#f43f5e',
      scenery: { pebble: '#a1a1aa', rock: '#3f3f46', flora: '#e11d48', flower: '#fbbf24', mesa: '#27272a', cloud: '#9f6b82', wood: '#44403c', emissiveFlora: '#f43f5e', emissiveIntensity: 0.3 }
    }
  },
  {
    id: 'magma_core',
    tier: 'advanced',
    name: 'Núcleo Magmático',
    ruleDesc: 'Calor extremo subterrâneo + pista térmica acelerada (1.08x)!',
    lore: 'Câmara profunda do manto terrestre banhada em magma dourado e vigiada pela Fênix Vulcânica.',
    fossil: { id: 'fossil_magma', name: 'Pluma de Magma', icon: '🔥' },
    bossId: 'fenix_vulcanica',
    heatDrain: true,
    subterranean: true,
    speedMod: 1.08,
    theme: {
      sky: '#7f1d1d', fog: '#9a2a1d', fogDensity: 0.0105,
      ground: '#451a14', track: '#7c2d12', stripe: '#fbbf24', bank: '#3b1510', edgeGlow: '#ff6b00',
      river: '#ff4500', riverEmissive: '#ff6d00', sun: '#fde047', sunGlow: '#f97316',
      scenery: { pebble: '#b45309', rock: '#451a03', flora: '#f97316', flower: '#fde047', mesa: '#7c2d12', cloud: '#b91c1c', wood: '#57241a', emissiveFlora: '#ff6b00', emissiveFlower: '#fde047', emissiveIntensity: 0.5 }
    }
  },
  {
    id: 'orbital_station',
    tier: 'advanced',
    name: 'Estação Orbital',
    ruleDesc: 'Baixa gravidade artificial (0.72x) + esteira de aceleração orbital (1.14x)!',
    lore: 'Anel espacial de alta tecnologia comandado pelo Imperador Cibernético sobre a órbita jurássica.',
    fossil: { id: 'fossil_orbital', name: 'Núcleo de Dobra', icon: '🛰️' },
    bossId: 'imperador_cibernetico',
    lowGravity: 0.72,
    speedMod: 1.14,
    theme: {
      sky: '#1e2948', fog: '#28365c', fogDensity: 0.0085,
      ground: '#334155', track: '#566882', stripe: '#38bdf8', bank: '#1e293b', edgeGlow: '#22d3ee',
      river: '#818cf8', riverEmissive: '#6366f1', sun: '#e0f2fe', sunGlow: '#38bdf8',
      scenery: { pebble: '#94a3b8', rock: '#475569', flora: '#38bdf8', flower: '#c084fc', mesa: '#1e3a5f', cloud: '#64748b', wood: '#334155', emissiveFlora: '#38bdf8', emissiveFlower: '#c084fc', emissiveIntensity: 0.45 }
    }
  },
  ...EXTRA_BIOMES
];

export function getBiomeById(id) {
  if (id === 'random_portal') {
    return getRandomNextBiome();
  }
  return BIOMES.find((b) => b.id === id) || BIOMES[0];
}

export function getRandomNextBiome(excludeId = null) {
  const pool = BIOMES.filter((b) => b.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)] || BIOMES[0];
}

export function isAquaticBiome(biome) {
  return Boolean(biome?.waterTrack || biome?.oceanSurface || biome?.submerged);
}

export function getBiomePreviewMeta(biome) {
  if (!biome) return { tag: 'Terrestre', icon: '🏜️' };
  if (biome.id === 'random_portal') return { tag: 'Aleatório (Portais)', icon: '🌀' };
  if (biome.submerged) return { tag: 'Submerso', icon: '🫧' };
  if (biome.oceanSurface || biome.waterTrack) return { tag: 'Sobre a Água', icon: '🌊' };
  if (biome.subterranean) return { tag: 'Terra Oca', icon: '🕳️' };
  if (biome.id === 'orbital_station') return { tag: 'Orbital', icon: '🛰️' };
  if (biome.id === 'lunar_crater') return { tag: 'Lunar', icon: '🌙' };
  if (biome.id === 'magma_core') return { tag: 'Núcleo Magma', icon: '🔥' };
  if (biome.id === 'aztec_temple') return { tag: 'Templo Asteca', icon: '🏛️' };
  if (biome.id === 'bioluminescent_jungle') return { tag: 'Bioluminescente', icon: '🍄' };
  if (biome.id === 'obsidian_desert') return { tag: 'Obsidiana', icon: '🖤' };
  if (biome.id === 'mecha_city' || biome.id === 'alien_factory') return { tag: 'Futurista', icon: '🤖' };
  if (biome.lowGravity) return { tag: 'Baixa Gravidade', icon: '🪐' };
  if (biome.slippery) return { tag: 'Gelo', icon: '❄️' };
  return { tag: 'Terrestre', icon: biome.fossil?.icon || '🦖' };
}
