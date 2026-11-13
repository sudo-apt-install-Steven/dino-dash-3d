// Catálogo completo dos Modos de Jogo (Essencial, Avançado e Bônus).

export const GAME_MODES = [
  // === ESSENCIAL ===
  {
    id: 'solo',
    tier: 'essential',
    name: 'Solo Clássico',
    players: 1,
    desc: 'Corrida infinita com cartas, biomas, eventos e ranking local.'
  },
  {
    id: 'coop',
    tier: 'essential',
    name: 'Coop Local (2P)',
    players: 2,
    desc: 'Score somado, reviver ficando perto por 3s, combos e fusão!'
  },
  {
    id: 'pvp',
    tier: 'essential',
    name: 'PvP Local (2P)',
    players: 2,
    desc: 'Duelo na pista com empurrões, obstáculos no rival, melhor de 3 e handicap.'
  },
  {
    id: 'shared_controls',
    tier: 'essential',
    name: 'Controles Compartilhados',
    players: 1,
    sharedRoles: true,
    desc: 'Jogador A move as faixas (A/D) e Jogador B pula/abaixa/habilidade (↑/↓/Enter), com rodízio!'
  },

  // === AVANÇADO ===
  {
    id: 'story',
    tier: 'advanced',
    name: 'Modo História',
    players: 1,
    desc: 'Campanha em 3 capítulos: Fuga do Meteoro → Travessia → Santuário.'
  },
  {
    id: 'time_trial',
    tier: 'advanced',
    name: 'Contra-Relógio (Ghost)',
    players: 1,
    desc: 'Corra contra o fantasma do seu melhor recorde até a meta!'
  },
  {
    id: 'tournament',
    tier: 'advanced',
    name: 'Torneio Local (4–8P)',
    players: 1,
    desc: 'Chaveamento eliminatório alternando no mesmo teclado.'
  },
  {
    id: 'teams_2v2',
    tier: 'advanced',
    name: 'Equipes 2x2',
    players: 2,
    desc: 'Duas duplas competem em rodadas somando pontuação.'
  },
  {
    id: 'sabotage',
    tier: 'advanced',
    name: 'Modo Sabotagem (2P)',
    players: 2,
    desc: 'Quem cair primeiro vira fantasma e lança cactos no rival!'
  },
  {
    id: 'capture_egg',
    tier: 'advanced',
    name: 'Captura o Ovo (PvP)',
    players: 2,
    desc: 'Segure o Ovo Dourado por mais tempo; esbarrar rouba o ovo!'
  },
  {
    id: 'relay',
    tier: 'advanced',
    name: 'Corrida de Revezamento',
    players: 2,
    desc: 'Jogadores revezam a cada trecho passando o bastão!'
  },

  // === BÔNUS ===
  {
    id: 'chaos',
    tier: 'bonus',
    name: 'Modo Caos',
    players: 1,
    desc: 'Regras mudam a cada 25s: baixa gravidade, controles invertidos, dino gigante!'
  },
  {
    id: 'hardcore',
    tier: 'bonus',
    name: 'Modo Hardcore',
    players: 1,
    desc: 'Apenas 1 vida, sem escudo inicial, mas Score x5!'
  },
  {
    id: 'wave_survival',
    tier: 'bonus',
    name: 'Sobrevivência de Ondas',
    players: 1,
    desc: 'Ondas intensas de inimigos e chefes com bônus entre ondas.'
  },
  {
    id: 'daily_challenge',
    tier: 'bonus',
    name: 'Desafio Diário',
    players: 1,
    desc: 'Pista com semente fixa pela data de hoje igual para todos.'
  },
  {
    id: 'zen',
    tier: 'bonus',
    name: 'Modo Zen',
    players: 1,
    desc: 'Sem morte! Relaxe coletando ovos e apreciando as paisagens.'
  },
  {
    id: 'rival_ai',
    tier: 'bonus',
    name: 'Dino Rival (IA)',
    players: 1,
    desc: 'Corra contra um dino IA com personalidade provocadora, tímida ou trapaceira!'
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
