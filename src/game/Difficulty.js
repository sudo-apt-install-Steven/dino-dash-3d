// Dificuldades: Fácil, Normal, Difícil, Insano, Supremo e Personalizado (com escalonamento contínuo por Danger Tier).
// Balanceamento calibrado para:
// - Normal continuar justo e acessível (minSafePaths >= 2, boss Normal 60-90s).
// - Difícil/Insano/Supremo exigirem domínio real; 2.000.000 pts em Supremo + Modo Perfeito ser quase impossível sem maestria.
import { EVENT_CATALOG } from '../events/EventManager.js';

export const DIFFICULTY_PRESETS = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    scoreMult: 0.8,
    initialSpeed: 16,
    maxSpeed: 29,
    accel: 0.009,
    density: 0.72,
    eventFreq: 0.68,
    lives: 4,
    pvpDamage: 1,
    allowCurses: false,
    showRedHazardSignage: true,
    minSafePaths: 2,
    gachaMult: 0.85,
    predatorAggro: 0.72,
    predatorCooldownMult: 1.3,
    allowPackCall: false
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    scoreMult: 1.0,
    initialSpeed: 18,
    maxSpeed: 36,
    accel: 0.0135,
    density: 0.98,
    eventFreq: 1.0,
    lives: 3,
    pvpDamage: 1,
    allowCurses: false,
    showRedHazardSignage: true,
    minSafePaths: 2,
    gachaMult: 1.0,
    predatorAggro: 1.0,
    predatorCooldownMult: 1.0,
    allowPackCall: false
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    scoreMult: 1.45,
    initialSpeed: 22,
    maxSpeed: 46,
    accel: 0.022,
    density: 1.42,
    eventFreq: 1.5,
    lives: 2,
    pvpDamage: 1,
    allowCurses: true,
    showRedHazardSignage: false,
    minSafePaths: 1,
    gachaMult: 1.45,
    predatorAggro: 1.35,
    predatorCooldownMult: 0.82,
    allowPackCall: true
  },
  insane: {
    id: 'insane',
    name: 'Insano',
    scoreMult: 2.15,
    initialSpeed: 25.5,
    maxSpeed: 54,
    accel: 0.03,
    density: 1.78,
    eventFreq: 1.9,
    lives: 1,
    pvpDamage: 2,
    allowCurses: true,
    showRedHazardSignage: false,
    minSafePaths: 1,
    gachaMult: 1.9,
    predatorAggro: 1.68,
    predatorCooldownMult: 0.68,
    allowPackCall: true
  },
  supreme: {
    id: 'supreme',
    name: 'Supremo',
    scoreMult: 2.85,
    initialSpeed: 28,
    maxSpeed: 62,
    accel: 0.038,
    density: 2.08,
    eventFreq: 2.25,
    lives: 1,
    pvpDamage: 2,
    allowCurses: true,
    showRedHazardSignage: false,
    minSafePaths: 1,
    gachaMult: 2.6,
    predatorAggro: 2.0,
    predatorCooldownMult: 0.56,
    allowPackCall: true
  }
};

/**
 * Marcos de escalonamento contínuo (Danger Tiers 1..12+).
 * Interpolação suave entre marcos evita saltos bruscos de dificuldade,
 * mantendo sempre pelo menos `minSafePaths` rotas livres.
 */
export const DANGER_TIER_THRESHOLDS = [
  { tier: 1, score: 0, speedBonus: 0.0, densityBonus: 0.0, eventFreqBonus: 0.0, predatorAggro: 1.0, label: 'Calmo' },
  { tier: 2, score: 10000, speedBonus: 1.6, densityBonus: 0.08, eventFreqBonus: 0.08, predatorAggro: 1.08, label: 'Alerta' },
  { tier: 3, score: 25000, speedBonus: 3.4, densityBonus: 0.17, eventFreqBonus: 0.16, predatorAggro: 1.18, label: 'Tenso' },
  { tier: 4, score: 50000, speedBonus: 5.5, densityBonus: 0.28, eventFreqBonus: 0.26, predatorAggro: 1.3, label: 'Hostil' },
  { tier: 5, score: 100000, speedBonus: 8.0, densityBonus: 0.42, eventFreqBonus: 0.38, predatorAggro: 1.46, label: 'Perigoso' },
  { tier: 6, score: 250000, speedBonus: 11.2, densityBonus: 0.6, eventFreqBonus: 0.54, predatorAggro: 1.66, label: 'Predatório' },
  { tier: 7, score: 500000, speedBonus: 14.8, densityBonus: 0.8, eventFreqBonus: 0.72, predatorAggro: 1.9, label: 'Letal' },
  { tier: 8, score: 1000000, speedBonus: 18.8, densityBonus: 1.02, eventFreqBonus: 0.92, predatorAggro: 2.18, label: 'Cataclísmico' },
  { tier: 9, score: 1500000, speedBonus: 22.0, densityBonus: 1.2, eventFreqBonus: 1.1, predatorAggro: 2.42, label: 'Extinção' },
  { tier: 10, score: 2000000, speedBonus: 25.2, densityBonus: 1.38, eventFreqBonus: 1.28, predatorAggro: 2.68, label: 'Abissal' },
  { tier: 11, score: 3000000, speedBonus: 28.5, densityBonus: 1.56, eventFreqBonus: 1.46, predatorAggro: 2.95, label: 'Impossível' },
  { tier: 12, score: 5000000, speedBonus: 32.0, densityBonus: 1.75, eventFreqBonus: 1.65, predatorAggro: 3.25, label: 'Ômega' }
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Calcula o Danger Tier contínuo a partir da pontuação atual.
 * Retorna { tier, speedBonus, densityBonus, eventFreqBonus, predatorAggro, label, nextScore, progress }.
 * Garantidamente monotônico e sem saltos abruptos entre marcos.
 */
export function getDangerTier(score = 0) {
  const s = Math.max(0, Number.isFinite(score) ? score : 0);
  const list = DANGER_TIER_THRESHOLDS;
  const last = list[list.length - 1];

  if (s >= last.score) {
    const extraSteps = (s - last.score) / 2000000;
    const extraTier = Math.floor(extraSteps);
    // Crescimento logarítmico suave acima de 5M para manter jogabilidade sem overflow
    const smoothExtra = Math.log1p(extraSteps) * 1.4;
    return {
      tier: last.tier + extraTier,
      speedBonus: Number((last.speedBonus + smoothExtra * 3.2).toFixed(3)),
      densityBonus: Number((last.densityBonus + smoothExtra * 0.18).toFixed(3)),
      eventFreqBonus: Number((last.eventFreqBonus + smoothExtra * 0.16).toFixed(3)),
      predatorAggro: Number((last.predatorAggro + smoothExtra * 0.28).toFixed(3)),
      label: last.label,
      nextScore: last.score + (extraTier + 1) * 2000000,
      progress: Number((extraSteps - extraTier).toFixed(3))
    };
  }

  let idx = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (s >= list[i].score) {
      idx = i;
      break;
    }
  }

  const cur = list[idx];
  const next = list[idx + 1] || cur;
  const span = Math.max(1, next.score - cur.score);
  const rawT = Math.max(0, Math.min(1, (s - cur.score) / span));
  // Smoothstep leve para evitar degraus bruscos preservando monotonicidade estrita
  const t = rawT * rawT * (3 - 2 * rawT);

  return {
    tier: cur.tier,
    speedBonus: Number(lerp(cur.speedBonus, next.speedBonus, t).toFixed(3)),
    densityBonus: Number(lerp(cur.densityBonus, next.densityBonus, t).toFixed(3)),
    eventFreqBonus: Number(lerp(cur.eventFreqBonus, next.eventFreqBonus, t).toFixed(3)),
    predatorAggro: Number(lerp(cur.predatorAggro, next.predatorAggro, t).toFixed(3)),
    label: cur.label,
    nextScore: next.score,
    progress: Number(rawT.toFixed(3))
  };
}

/**
 * Garante que mesmo em Danger Tiers altos sempre exista ao menos `minSafePaths` caminho seguro.
 */
export function getEffectiveMinSafePaths(presetId = 'normal') {
  const cfg = DIFFICULTY_PRESETS[presetId] || DIFFICULTY_PRESETS.normal;
  return Math.max(1, cfg.minSafePaths ?? 1);
}

export const Difficulty = {
  DIFFICULTY_PRESETS,
  DANGER_TIER_THRESHOLDS,
  getDangerTier,
  getEffectiveMinSafePaths
};

export class DifficultyManager {
  constructor() {
    this.activeId = 'normal';
    this.adaptive = false;
    this.custom = {
      ...DIFFICULTY_PRESETS.normal,
      id: 'custom',
      name: 'Personalizado',
      enabledEvents: EVENT_CATALOG.map((e) => e.id)
    };
  }

  static getDangerTier(score = 0) {
    return getDangerTier(score);
  }

  getDangerTier(score = 0) {
    return getDangerTier(score);
  }

  getConfig() {
    if (this.activeId === 'custom') return this.custom;
    return DIFFICULTY_PRESETS[this.activeId] || DIFFICULTY_PRESETS.normal;
  }

  setPreset(id) {
    if (id === 'custom' || DIFFICULTY_PRESETS[id]) {
      this.activeId = id;
    }
  }
}
