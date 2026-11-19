// Catálogo completo dos Modos de Jogo (Essencial, Avançado, Bônus e Expansão).

export const MODE_CATEGORIES = [
  { id: 'classic', label: 'Clássicos', icon: '🦖' },
  { id: 'competitive', label: 'Competitivos', icon: '🏁' },
  { id: 'cooperative', label: 'Cooperativos', icon: '🤝' },
  { id: 'boss_challenge', label: 'Desafios & Boss', icon: '👑' },
  { id: 'sandbox', label: 'Livre & Sandbox', icon: '🧪' }
];

export const RACE_DISTANCES = [5000, 10000];

export const RAID_AFFIXES = [
  {
    id: 'frenzy',
    name: 'Frenesi Colossal',
    icon: '🔥',
    desc: 'Velocidade +14% e ataques do chefe mais frequentes.',
    speedMult: 1.14,
    damageMult: 1.0,
    hazardRateMult: 1.25
  },
  {
    id: 'armored_scales',
    name: 'Escamas Blindadas',
    icon: '🛡️',
    desc: 'Dano direto reduzido em 25%, mas ataques sincronizados e pontos fracos causam +50%!',
    speedMult: 1.0,
    damageMult: 0.75,
    synergyBonus: 1.5
  },
  {
    id: 'void_storms',
    name: 'Tempestade do Vazio',
    icon: '⚡',
    desc: 'Raios telegrafados nas faixas enquanto o chefe avança.',
    speedMult: 1.04,
    damageMult: 1.0,
    telegraphHazards: true
  },
  {
    id: 'predator_pack',
    name: 'Alcateia Alfa',
    icon: '🐺',
    desc: 'Predadores de perseguição ficam mais agressivos durante a Raid.',
    speedMult: 1.06,
    damageMult: 1.05,
    predatorAggroBonus: 0.45
  },
  {
    id: 'gravity_flux',
    name: 'Fluxo Gravitacional',
    icon: '🪐',
    desc: 'Gravidade oscila durante o combate contra o colosso.',
    speedMult: 1.0,
    damageMult: 1.1,
    gravityMult: 0.72
  },
  {
    id: 'venom_aura',
    name: 'Aura Peçonhenta',
    icon: '☠️',
    desc: 'Projéteis e impactos aplicam veneno temporário.',
    speedMult: 1.02,
    damageMult: 1.05,
    appliesPoison: true
  }
];

export const GAME_MODES = [
  // === ESSENCIAL ===
  {
    id: 'solo',
    tier: 'essential',
    category: 'classic',
    icon: '🦖',
    difficultyTag: 'Padrão',
    name: 'Solo Clássico',
    players: 1,
    supportsMultiplayer: false,
    ranked: true,
    desc: 'Corrida infinita com cartas, biomas, eventos, chefes e ranking local.',
    tooltip: 'O modo infinito principal: evolua, escolha cartas e enfrente chefes e predadores.'
  },
  {
    id: 'coop',
    tier: 'essential',
    category: 'cooperative',
    icon: '🤝',
    difficultyTag: 'Médio',
    name: 'Coop Local (2P)',
    players: 2,
    supportsMultiplayer: true,
    supportsLocalCoop: true,
    ranked: true,
    desc: 'Score somado, sinergia de ataque em boss/raid, reviver tático (proximidade ou [V]), pistas paralelas e fusão!',
    tooltip: 'Dois ou mais jogadores cooperam com ataques combinados (+35% dano em chefes) e resgate tático.'
  },
  {
    id: 'pvp',
    tier: 'essential',
    category: 'competitive',
    icon: '⚔️',
    difficultyTag: 'Médio',
    name: 'PvP Local (2P)',
    players: 2,
    supportsMultiplayer: true,
    ranked: false,
    desc: 'Duelo na pista com empurrões, obstáculos no rival, melhor de 3 e handicap.',
    tooltip: 'Duelo direto em melhor de 3 rodadas no mesmo teclado ou LAN.'
  },
  {
    id: 'shared_controls',
    tier: 'essential',
    category: 'cooperative',
    icon: '🎮',
    difficultyTag: 'Difícil',
    name: 'Controles Compartilhados',
    players: 1,
    sharedRoles: true,
    supportsLocalCoop: true,
    ranked: false,
    desc: 'Jogador A move as faixas (A/D) e Jogador B pula/abaixa/habilidade (↑/↓/Enter), com rodízio!',
    tooltip: 'Dois jogadores controlam o mesmo dinossauro alternando funções a cada 60s.'
  },
  {
    id: 'race',
    tier: 'essential',
    category: 'competitive',
    icon: '🏁',
    difficultyTag: 'Médio',
    name: 'Corrida (Linha de Chegada)',
    players: 1,
    supportsMultiplayer: true,
    supportsLocalCoop: true,
    ranked: true,
    desc: 'Disputa até a linha de chegada (5.000m ou 10.000m) com barra de posição 1º/2º/3º, checkpoints e rivais IA ou LAN/online!',
    tooltip: 'Cruze a linha de chegada primeiro! Checkpoints a cada 1.000m recarregam estamina e turbo.'
  },

  // === AVANÇADO ===
  {
    id: 'story',
    tier: 'advanced',
    category: 'classic',
    icon: '📖',
    difficultyTag: 'Médio',
    name: 'Modo História',
    players: 1,
    ranked: true,
    desc: 'Campanha em 3 capítulos: Fuga do Meteoro → Travessia → Santuário.',
    tooltip: 'Sobreviva aos 3 capítulos temáticos atravessando Deserto, Vulcão e Planeta Alienígena.'
  },
  {
    id: 'time_trial',
    tier: 'advanced',
    category: 'competitive',
    icon: '⏱️',
    difficultyTag: 'Médio',
    name: 'Contra-Relógio (Ghost)',
    players: 1,
    ranked: true,
    desc: 'Corra contra o fantasma do seu melhor recorde até a meta!',
    tooltip: 'Seu melhor trajeto fica gravado como um fantasma translúcido para você superar.'
  },
  {
    id: 'tournament',
    tier: 'advanced',
    category: 'competitive',
    icon: '🏆',
    difficultyTag: 'Médio',
    name: 'Torneio Local (4–8P)',
    players: 1,
    ranked: false,
    desc: 'Chaveamento eliminatório alternando no mesmo teclado.',
    tooltip: 'Até 8 jogadores disputam pontuações em turnos no mesmo dispositivo.'
  },
  {
    id: 'teams_2v2',
    tier: 'advanced',
    category: 'cooperative',
    icon: '🛡️',
    difficultyTag: 'Médio',
    name: 'Equipes 2x2',
    players: 2,
    supportsLocalCoop: true,
    ranked: false,
    desc: 'Duas duplas competem em rodadas somando pontuação.',
    tooltip: 'Equipe 1 e Equipe 2 correm em baterias somando os pontos da dupla.'
  },
  {
    id: 'sabotage',
    tier: 'advanced',
    category: 'competitive',
    icon: '👻',
    difficultyTag: 'Médio',
    name: 'Modo Sabotagem (2P)',
    players: 2,
    supportsMultiplayer: true,
    ranked: false,
    desc: 'Quem cair primeiro vira fantasma e lança cactos no rival!',
    tooltip: 'Cair não significa fim de jogo: atrapalhe seu rival como fantasma.'
  },
  {
    id: 'capture_egg',
    tier: 'advanced',
    category: 'competitive',
    icon: '🥚',
    difficultyTag: 'Médio',
    name: 'Captura o Ovo (PvP)',
    players: 2,
    supportsMultiplayer: true,
    ranked: false,
    desc: 'Segure o Ovo Dourado por mais tempo; esbarrar rouba o ovo!',
    tooltip: 'Partida rápida de 30s: vença acumulando mais tempo com o Ovo Dourado.'
  },
  {
    id: 'relay',
    tier: 'advanced',
    category: 'cooperative',
    icon: '🏃',
    difficultyTag: 'Médio',
    name: 'Corrida de Revezamento',
    players: 2,
    supportsLocalCoop: true,
    ranked: false,
    desc: 'Jogadores revezam a cada trecho passando o bastão!',
    tooltip: 'A cada 16s o controle passa para o parceiro na mesma corrida.'
  },
  {
    id: 'raid',
    tier: 'advanced',
    category: 'boss_challenge',
    icon: '🐉',
    difficultyTag: 'Difícil',
    name: 'Raid Colossal',
    players: 1,
    supportsMultiplayer: true,
    supportsLocalCoop: true,
    ranked: true,
    desc: 'Bosses colossais com múltiplas barras de vida, afixos rotativos e placar de dano (DPS) solo ou coop/multiplayer!',
    tooltip: 'Destrua todas as barras de vida do colosso enquanto adapta-se aos afixos rotativos e sobe no placar de DPS.'
  },
  {
    id: 'boss_fight',
    tier: 'advanced',
    category: 'boss_challenge',
    icon: '👑',
    difficultyTag: 'Difícil',
    name: 'Boss Fight / Boss Rush',
    players: 1,
    supportsMultiplayer: true,
    supportsLocalCoop: true,
    ranked: true,
    desc: 'Arena focada nos chefes: enfrente um boss direto ou encare o Boss Rush em sequência!',
    tooltip: 'Combate direto contra chefes sem espera. No modo infinito padrão, os chefes continuam aparecendo normalmente.'
  },
  {
    id: 'competition',
    tier: 'advanced',
    category: 'competitive',
    icon: '🏅',
    difficultyTag: 'Extremo',
    name: 'Competição (Liga)',
    players: 1,
    supportsMultiplayer: true,
    ranked: true,
    competitive: true,
    desc: 'Seed competitiva fixa, regras padronizadas sem modificadores fáceis, Danger Tier acelerado e pontuação validada!',
    tooltip: 'Sem handicap, sem reviver por cristal e sem facilidades: todos correm na mesma seed semanal de liga.'
  },

  // === BÔNUS ===
  {
    id: 'chaos',
    tier: 'bonus',
    category: 'classic',
    icon: '🎲',
    difficultyTag: 'Imprevisível',
    name: 'Modo Caos',
    players: 1,
    ranked: true,
    desc: 'Regras mudam a cada 25s: baixa gravidade, controles invertidos, dino gigante!',
    tooltip: 'Mutadores aleatórios mudam a física e os controles a cada 25 segundos.'
  },
  {
    id: 'hardcore',
    tier: 'bonus',
    category: 'boss_challenge',
    icon: '💀',
    difficultyTag: 'Extremo',
    name: 'Modo Hardcore',
    players: 1,
    ranked: true,
    desc: 'Apenas 1 vida, sem escudo inicial, mas Score x5!',
    tooltip: 'Um único erro encerra a corrida — recompensa máxima para mestres.'
  },
  {
    id: 'wave_survival',
    tier: 'bonus',
    category: 'boss_challenge',
    icon: '🌊',
    difficultyTag: 'Difícil',
    name: 'Sobrevivência de Ondas',
    players: 1,
    ranked: true,
    desc: 'Ondas intensas de inimigos e chefes com bônus entre ondas.',
    tooltip: 'Sobreviva a ondas progressivas de obstáculos e chefes a cada 3 ondas.'
  },
  {
    id: 'daily_challenge',
    tier: 'bonus',
    category: 'competitive',
    icon: '📅',
    difficultyTag: 'Padrão',
    name: 'Desafio Diário',
    players: 1,
    ranked: true,
    desc: 'Pista com semente fixa pela data de hoje igual para todos.',
    tooltip: 'Mesma sequência de obstáculos para todos os jogadores no dia de hoje.'
  },
  {
    id: 'zen',
    tier: 'bonus',
    category: 'sandbox',
    icon: '🧘',
    difficultyTag: 'Relaxante',
    name: 'Modo Zen',
    players: 1,
    ranked: false,
    unranked: true,
    desc: 'Sem morte! Relaxe coletando ovos e apreciando as paisagens.',
    tooltip: 'Ideal para explorar biomas e treinar movimentos sem perder vidas.'
  },
  {
    id: 'rival_ai',
    tier: 'bonus',
    category: 'competitive',
    icon: '🤖',
    difficultyTag: 'Médio',
    name: 'Dino Rival (IA)',
    players: 1,
    ranked: true,
    desc: 'Corra contra um dino IA com personalidade provocadora, tímida ou trapaceira!',
    tooltip: 'Um rival controlado por IA corre ao seu lado reagindo aos obstáculos.'
  },
  {
    id: 'free_roam',
    tier: 'bonus',
    category: 'sandbox',
    icon: '🧪',
    difficultyTag: 'Livre',
    name: 'Livre / Sandbox',
    players: 1,
    supportsMultiplayer: true,
    supportsLocalCoop: true,
    ranked: false,
    unranked: true,
    desc: 'Controle de bioma, velocidade e spawn sob demanda! Sem morte, sem ranking e sem conquistas validadas.',
    tooltip: 'Teclas [1]/[2] velocidade, [3] trocar bioma, [4] onda de obstáculos, [5] invocar boss.'
  }
];

export const STORY_CHAPTERS = [
  {
    id: 1,
    title: 'Capítulo 1: Fuga do Meteoro',
    biome: 'desert',
    targetScore: 450,
    dialogue: 'O céu ficou laranja... Meteoros estão caindo! Corra pelo Deserto Dourado!'
  },
  {
    id: 2,
    title: 'Capítulo 2: Travessia Vulcânica',
    biome: 'volcano',
    targetScore: 950,
    dialogue: 'Atravesse o rio fervente e vença os desafios do Vulcão em Erupção!'
  },
  {
    id: 3,
    title: 'Capítulo 3: O Refúgio Estelar',
    biome: 'alien_planet',
    targetScore: 1500,
    dialogue: 'Salte pela baixa gravidade e derrote a ameaça alienígena para salvar os dinos!'
  }
];

export const CHAOS_RULES = [
  { id: 'low_grav', label: 'Gravidade Lunar!', desc: 'Pulos super altos!' },
  { id: 'inverted', label: 'Controles Invertidos!', desc: 'Esquerda e Direita trocadas!' },
  { id: 'giant', label: 'Dino Gigante!', desc: 'Você está enorme e esmaga obstáculos!' },
  { id: 'turbo_frenzy', label: 'Velocidade Turbo!', desc: 'Tudo 40% mais rápido!' }
];

export function getModeDef(id) {
  return GAME_MODES.find((m) => m.id === id) || GAME_MODES[0];
}

export function getModesByCategory(category) {
  if (!category || category === 'all') return GAME_MODES;
  return GAME_MODES.filter((m) => m.category === category);
}

export function isModeRanked(id) {
  const def = getModeDef(id);
  return def.ranked !== false && !def.unranked;
}

export function getCompetitionSeed(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `LEAGUE-${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
