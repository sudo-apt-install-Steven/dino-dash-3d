// Persistência segura com fallback em memória caso localStorage falhe.

const STORAGE_KEY = 'dino_dash_3d_save_v1';

const DEFAULT_SAVE = {
  highScore: 0,
  bestScoresByMode: {},
  eggs: 0,
  selectedDino: 'trex',
  unlockedDinos: [
    'trex', 'raptor', 'triceratops', 'stegosaurus',
    'ankylosaurus', 'spinosaurus', 'brachiosaurus', 'dilophosaurus'
  ],
  dinoLevels: {},
  customization: {
    p1: {
      activePreset: 0,
      presets: [
        { useCustomColors: false, primary: '#3fa34d', secondary: '#c7e89b', eye: '#ffd54f', spots: '#1e5b2b', spikes: '#e87a24', pattern: 'solid', accessory: 'none', trail: 'dust', landingEffect: 'dust', deathEffect: 'cubes' },
        { useCustomColors: true, primary: '#e05a2b', secondary: '#ffd89c', eye: '#ffffff', spots: '#781d0c', spikes: '#ffca3a', pattern: 'stripes', accessory: 'none', trail: 'fire', landingEffect: 'sparks', deathEffect: 'cubes' },
        { useCustomColors: true, primary: '#2d7dd2', secondary: '#a7e8ff', eye: '#ffeb3b', spots: '#143c6d', spikes: '#52e3e1', pattern: 'spots', accessory: 'none', trail: 'stars', landingEffect: 'dust', deathEffect: 'cubes' }
      ]
    },
    p2: {
      activePreset: 0,
      presets: [
        { useCustomColors: false, primary: '#e07a24', secondary: '#ffe3a8', eye: '#ffffff', spots: '#7d2f0c', spikes: '#f4d35e', pattern: 'stripes', accessory: 'none', trail: 'dust', landingEffect: 'dust', deathEffect: 'cubes' },
        { useCustomColors: true, primary: '#8338ec', secondary: '#e0b1ff', eye: '#52ffe8', spots: '#3a0ca3', spikes: '#ffbe0b', pattern: 'neon', accessory: 'none', trail: 'rainbow', landingEffect: 'sparks', deathEffect: 'cubes' },
        { useCustomColors: true, primary: '#2a9d8f', secondary: '#b7f4ea', eye: '#ffd166', spots: '#154d46', spikes: '#e76f51', pattern: 'camo', accessory: 'none', trail: 'dust', landingEffect: 'dust', deathEffect: 'cubes' }
      ]
    }
  },
  unlockedAccessories: ['none'],
  unlockedTrails: ['dust'],
  unlockedPatterns: ['solid', 'stripes', 'spots', 'gradient', 'camo', 'neon'],
  unlockedTitles: ['Iniciante'],
  activeTitle: 'Iniciante',
  seasonPass: { xp: 0, level: 1, claimed: [] },
  albumDiscovered: ['trex'],
  dinoHouse: { trophies: [], decorations: [] },
  companionEggs: [],
  activeCompanion: null,
  missions: { date: '', list: [] },
  achievements: [],
  records: [],
  rivalry: { p1Wins: 0, p2Wins: 0 },
  ghostRuns: {},
  tutorialDone: false,
  tutorialRewardClaimed: false,
  minigamesDaily: { date: '', eggsEarned: 0 },
  prestige: { level: 0, bonusMult: 1.0 },
  talents: { speed: 0, magnet: 0, vitality: 0, alchemy: 0, greed: 0 },
  campaign: { completedNodes: [], currentNode: 'desert_start' },
  season: 'auto',
  team: { name: 'Dino Squad', color: '#58d63a', emblem: '🦖' },
  stats: { runs: 0, totalDist: 0, totalEggs: 0, deathsBy: {}, skillsUsed: {}, victoriesLan: 0 },
  weekly: { weekId: '', progress: 0, claimed: false },
  customTracks: [],
  activeCustomTrackId: null,
  hybrid: { enabled: false, head: 'trex', body: 'spinosaurus', tail: 'ankylosaurus' },
  partySkins: [],
  teacherMode: false,
  mirroredMode: false,
  lowSpecMode: false,
  lowSpecManual: false,
  autoQuality: true,
  benchmarkFps: 0,
  benchmarkTier: '',
  benchmarkDone: false,
  benchmarkVersion: 2,
  benchmarkGpu: '',
  introModeCustom: false,
  devMode: false,
  crystals: 0,
  shopRotation: { slotKey: '', offers: [], purchasedIds: [], rerolls: 0 },
  seenElements: [],
  pinnedPredator: null,
  abilityLevels: {},
  unlockedSpecialItems: [],
  discoveredFossils: {},
  perfectMode: false,
  network: { nickname: '', lastRoom: '', tvScale: false },
  settings: {
    quality: 'medium',
    shadows: true,
    particles: 'normal',
    fov: 58,
    brightness: 1.05,
    clearVision: false,
    lowHpPulse: false,
    disableIntro: false,
    introMode: 'first_time',
    fpsCap: 0,
    sensitivity: 1.0,
    lang: 'pt',
    styleFilter: 'default',
    narrator: false,
    obstacleHints: true,
    touchMode: 'swipe',
    audio: { music: 0.45, sfx: 0.75, muted: false },
    accessibility: {
      oneHand: false,
      largeText: false,
      highContrast: false,
      colorblind: 'none',
      reduceShake: false,
      vibration: true
    },
    keybindings: {
      p1: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', duck: 'KeyS', attack: 'KeyQ', ability: 'Space', item: 'KeyE', bullet: 'ShiftLeft' },
      p2: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', duck: 'ArrowDown', attack: 'ControlRight', ability: 'Enter', item: 'Slash', bullet: 'ShiftRight' }
    }
  }
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeDefaults(target, defaults) {
  for (const key of Object.keys(defaults)) {
    const val = defaults[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = deepClone(val);
      } else {
        mergeDefaults(target[key], val);
      }
    } else if (target[key] === undefined) {
      target[key] = deepClone(val);
    }
  }
  return target;
}

class SaveSystem {
  constructor() {
    this.memoryFallback = null;
    this.storageAvailable = true;
    this.data = this.load();
  }

  load() {
    let loaded = null;
    let prevBenchVer = 2;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        prevBenchVer = parsed?.benchmarkVersion || 1;
        loaded = mergeDefaults(parsed, DEFAULT_SAVE);
      }
    } catch {
      this.storageAvailable = false;
    }
    if (!loaded) {
      if (this.memoryFallback) return this.memoryFallback;
      this.memoryFallback = deepClone(DEFAULT_SAVE);
      return this.memoryFallback;
    }
    // Garante que novos iniciais gratuitos sejam liberados em saves antigos
    const freeStarters = DEFAULT_SAVE.unlockedDinos;
    for (const id of freeStarters) {
      if (!loaded.unlockedDinos.includes(id)) loaded.unlockedDinos.push(id);
    }
    // Revalida benchmark antigo (v1 media frames sem aquecimento de shader e falso-negava placas RTX/GTX)
    if (prevBenchVer < 2) {
      const wasLowTier = loaded.benchmarkTier === 'Baixo';
      loaded.benchmarkVersion = 2;
      loaded.benchmarkDone = false;
      loaded.benchmarkTier = '';
      loaded.benchmarkFps = 0;
      if (!loaded.lowSpecManual && loaded.lowSpecMode && wasLowTier) {
        loaded.lowSpecMode = false;
      }
    }
    if (!loaded.introModeCustom && loaded.settings?.introMode === 'always' && !loaded.settings.disableIntro) {
      loaded.settings.introMode = 'first_time';
    }
    return loaded;
  }

  save() {
    this.memoryFallback = this.data;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.storageAvailable = true;
    } catch {
      this.storageAvailable = false;
    }
  }

  getHighScore() {
    return Math.floor(this.data.highScore || 0);
  }

  updateHighScore(score, mode = 'solo') {
    const intScore = Math.floor(score);
    let isNewRecord = false;
    if (intScore > (this.data.highScore || 0)) {
      this.data.highScore = intScore;
      isNewRecord = true;
    }
    const prevMode = this.data.bestScoresByMode[mode] || 0;
    if (intScore > prevMode) {
      this.data.bestScoresByMode[mode] = intScore;
    }
    this.save();
    return isNewRecord;
  }

  addEggs(amount) {
    this.data.eggs = Math.max(0, Math.floor((this.data.eggs || 0) + amount));
    this.save();
    return this.data.eggs;
  }

  unlockAchievement(id) {
    if (!this.data.achievements.includes(id)) {
      this.data.achievements.push(id);
      this.save();
      return true;
    }
    return false;
  }
}

export const Save = new SaveSystem();
