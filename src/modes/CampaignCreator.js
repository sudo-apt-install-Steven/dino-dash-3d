// CampaignCreator.js
// Orquestrador de Criação de Campanhas Procedurais e Governança do Mestre IA (Seções 2.2 e 2.3).
// Gera Lore do Mundo, Sugestões de Lore de Personagem, NPCs Importantes e Integração com Presets.

import { assembleDinoPreset } from '../dinos/DinoPresetAssembler.js';

export const WORLD_THEMES = [
  {
    id: 'jurassic_wild',
    title: 'Jurássico Selvagem',
    desc: 'Um continente pré-histórico dominado por predadores colossais, vegetação densa e manadas migratórias.',
    climate: 'Tropical Úmido',
    dangerLevel: 'Médio',
    factions: ['Manada dos Pastos Altos', 'Bando dos Caçadores Noturnos', 'Protetores do Vale Fértil']
  },
  {
    id: 'ice_age',
    title: 'Era Glacial Primitiva',
    desc: 'Geleiras avançam sobre planícies antigas, forçando dinossauros adaptados ao frio a disputarem cavernas termais.',
    climate: 'Nevasca e Tundra',
    dangerLevel: 'Alto',
    factions: ['Guardiões da Fenda Térmica', 'Errantes da Geleira', 'Xamãs do Gelo Eterno']
  },
  {
    id: 'volcanic_caldera',
    title: 'Caldeira Vulcânica',
    desc: 'Rios de lava incandescente, chuvas de cinzas e terremotos constantes testam a sobrevivência dos mais resistentes.',
    climate: 'Magmático e Tóxico',
    dangerLevel: 'Brutal',
    factions: ['Culto do Meteoro Rubro', 'Sobreviventes das Fendas', 'Guerreiros do Magma']
  },
  {
    id: 'mystic_fantasy',
    title: 'Fantasia Feudal de Dinossauros',
    desc: 'Reinos com fortalezas de pedra bruta, ordens de cavaleiros dinossauros e cristais mágicos subterrâneos.',
    climate: 'Temperado Místico',
    dangerLevel: 'Médio',
    factions: ['Ordem dos Paladinos Tricerátopes', 'Círculo Druídico Pterossauro', 'Corte Real de Rexgard']
  },
  {
    id: 'meteor_apocalypse',
    title: 'Apocalipse do Meteoro',
    desc: 'O impacto cósmico acabou de ocorrer. Céus escurecidos, fragmentos incandescentes e a corrida contra a extinção.',
    climate: 'Inverno Pós-Impacto',
    dangerLevel: 'Extremo',
    factions: ['Refugiados da Grande Cratera', 'Predadores Desesperados', 'Sábios do Santuário Subterrâneo']
  }
];

export const LORE_SUGGESTIONS = [
  'Cresci como o último sobrevivente de um bando emboscado na ravina escura e agora busco reconstruir meu legado.',
  'Fui abençoado pela energia de um cristal misterioso que caiu do céu, concedendo-me instintos aguçados e visões.',
  'Era um jovem explorador curioso que se perdeu da manada durante uma tempestade sísmica e aprendeu a caçar sozinho.',
  'Treinado pelos anciãos das cavernas para ser o guardião das terras ancestrais contra intrusos implacáveis.',
  'Um estrategista solitário que prefere emboscadas e astúcia a meros confrontos de força bruta.'
];

export const NPC_ROLES = [
  { role: 'ally', title: 'Aliado Leal', archetypes: ['Batedor Ágil', 'Curandeiro Natural', 'Guardião Firme'] },
  { role: 'rival', title: 'Rival Temível', archetypes: ['Líder de Bando Inimigo', 'Caçador Furtivo Solitário'] },
  { role: 'merchant', title: 'Mercador Nômade', archetypes: ['Tricerátops Coletor de Relíquias', 'Pterodáctilo Cambista'] },
  { role: 'blacksmith', title: 'Ferreiro Primitivo', archetypes: ['Anquilossauro Moldador de Ossos e Carapaças'] },
  { role: 'sage', title: 'Sábio Ancião', archetypes: ['Braquiossauro Centenário das Estrelas'] },
  { role: 'villain', title: 'Grande Ameaça', archetypes: ['O Tirano Corrompido', 'O Monstro do Meteoro'] }
];

/**
 * Gera os NPCs fundamentais da campanha de acordo com o tema selecionado.
 * @param {string} themeId
 * @returns {Array<Object>} Lista de NPCs com arte procedural, personalidade e diálogos.
 */
export function generateCampaignNpcs(themeId) {
  const theme = WORLD_THEMES.find(t => t.id === themeId) || WORLD_THEMES[0];

  return [
    {
      id: 'npc_ally_1',
      name: 'Kael, o Batedor Veloz',
      species: 'Velociraptor de Penas Azuis',
      role: 'ally',
      roleLabel: 'Aliado Leal',
      personality: 'Leal, perspicaz e veloz. Sempre alerta a perigos na vanguarda.',
      dialogue: 'O caminho à frente tem cheiro de emboscada... Mantenha suas garras prontas.',
      illustrationPrompt: 'blue_feathered_raptor_scout_jungle',
      portraitColor: '#22d3ee',
      stats: { hp: 18, atk: 7, def: 4 }
    },
    {
      id: 'npc_rival_1',
      name: 'Vorgath, Garra-Cicatriz',
      species: 'Carnotauro das Fendas',
      role: 'rival',
      roleLabel: 'Rival Temível',
      personality: 'Orgulhoso, agressivo e desafiador. Respeita apenas a força bruta.',
      dialogue: 'Este território pertence aos fortes. Prove seu valor ou vire alimento.',
      illustrationPrompt: 'scarred_carnotaurus_war_paint',
      portraitColor: '#ef4444',
      stats: { hp: 28, atk: 9, def: 6 }
    },
    {
      id: 'npc_merchant_1',
      name: 'Oren, Casco-de-Pedra',
      species: 'Tricerátops Mercador',
      role: 'merchant',
      roleLabel: 'Mercador Nômade',
      personality: 'Calmo, negociador experiente. Troca frutas raras e minérios por ovos dourados.',
      dialogue: 'Bons artefatos para quem sabe o valor de voltar vivo da mata.',
      illustrationPrompt: 'triceratops_trader_backpack_lantern',
      portraitColor: '#fbbf24',
      stats: { hp: 35, atk: 5, def: 9 }
    },
    {
      id: 'npc_sage_1',
      name: 'Mestra Thalassa',
      species: 'Braquiossauro Anciã',
      role: 'sage',
      roleLabel: 'Sábia Anciã',
      personality: 'Serena, conhecedora dos segredos das estrelas e do pulso da terra.',
      dialogue: 'A terra treme não por acaso, pequeno predador. Os astros avisam uma grande mudança.',
      illustrationPrompt: 'ancient_brachiosaurus_mystic_moss',
      portraitColor: '#a78bfa',
      stats: { hp: 50, atk: 4, def: 8 }
    },
    {
      id: 'npc_villain_1',
      name: 'Ignis, o Devorador de Brasas',
      species: 'T-Rex Titânico das Cinzas',
      role: 'villain',
      roleLabel: 'Grande Vilão',
      personality: 'Implacável, destrutivo e dominante. Deseja subjugar todos os vales.',
      dialogue: 'Cinzas serão tudo o que restará da sua coragem.',
      illustrationPrompt: 'titan_rex_lava_cracks_menacing',
      portraitColor: '#dc2626',
      stats: { hp: 60, atk: 12, def: 8 }
    }
  ];
}

/**
 * Fluxo completo de inicialização de campanha.
 * @param {Object} params
 * @param {string} params.themeId - Identificador do tema do mundo.
 * @param {string} params.playerLore - História digitada pelo jogador.
 * @param {string} [params.baseSpeciesId] - Espécie de base escolhida.
 * @returns {Object} Campanha montada pronta para início imediato da narrativa.
 */
export function createCampaign(params = {}) {
  const theme = WORLD_THEMES.find(t => t.id === params.themeId) || WORLD_THEMES[0];
  const playerLore = String(params.playerLore || '').trim() || LORE_SUGGESTIONS[0];
  const npcs = generateCampaignNpcs(theme.id);
  const dinoModel = assembleDinoPreset({
    playerLore,
    worldTheme: theme.title,
    baseSpeciesId: params.baseSpeciesId
  });

  return {
    id: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    theme,
    playerLore,
    dinoModel,
    npcs,
    state: {
      chapter: 1,
      sceneId: 'intro_clearing',
      playerHp: dinoModel.derivedStats.vigor,
      maxHp: dinoModel.derivedStats.vigor,
      inventory: [
        { id: 'ration_berry', name: 'Frutas Revigorantes', count: 3, heal: 8 },
        { id: 'sharp_fang_dagger', name: 'Presa Afiada', count: 1, bonus: 1 }
      ],
      goldEggs: 50,
      journal: [
        `Campanha iniciada no mundo "${theme.title}". Origem do herói registrada.`
      ]
    }
  };
}
