// Dificuldades: Fácil, Normal, Difícil, Insano e Personalizado (com sliders e modo adaptativo).
import { EVENT_CATALOG } from '../events/EventManager.js';

export const DIFFICULTY_PRESETS = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    scoreMult: 0.8,
    initialSpeed: 16,
    maxSpeed: 30,
    accel: 0.01,
    density: 0.75,
    eventFreq: 0.7,
    lives: 4,
    pvpDamage: 1,
    allowCurses: false
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    scoreMult: 1.0,
    initialSpeed: 18,
    maxSpeed: 36,
    accel: 0.014,
    density: 1.0,
    eventFreq: 1.0,
    lives: 3,
    pvpDamage: 1,
    allowCurses: false
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    scoreMult: 1.5,
    initialSpeed: 21,
    maxSpeed: 42,
    accel: 0.018,
    density: 1.28,
    eventFreq: 1.35,
    lives: 2,
    pvpDamage: 1,
    allowCurses: true
  },
  insane: {
    id: 'insane',
    name: 'Insano',
    scoreMult: 2.5,
    initialSpeed: 24,
    maxSpeed: 48,
    accel: 0.024,
    density: 1.55,
    eventFreq: 1.65,
    lives: 1,
    pvpDamage: 2,
    allowCurses: true
  }
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
