// Persistência resiliente em 3 camadas (localStorage + IndexedDB + Cookie técnico de recuperação),
// sem vínculo com IP ou Wi-Fi (LGPD Art. 6º / Art. 18).

const STORAGE_KEY = 'dino_dash_3d_save_v1';
const IDB_NAME = 'DinoDash3DDB';
const IDB_STORE = 'saves';
const IDB_KEY = 'primary';
const CHECKPOINT_COOKIE = 'dd3d_chk';

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
  benchmarkVersion: 3,
  benchmarkGpu: '',
    introModeCustom: false,
    devMode: false,
    playerActorId: '',
    savedAt: 0,
  crystals: 0,
  fossilCrates: 2,
  gachaPity: 0,
  gachaPityEpic: 0,
  gachaPityShiny: 0,
  gachaStats: { pulls: 0, shinies: 0, mechas: 0, secrets: 0 },
  discoveredHollowEarth: false,
  unlockedMutations: ['amber_core'],
  mutationLevels: { amber_core: 1 },
  mutationActiveTiers: { amber_core: 1 },
  equippedMutation: null,
  unlockedSkins: {},
  equippedSkinVariants: {},
  shopRotation: { slotKey: '', offers: [], purchasedIds: [], rerolls: 0 },
  seenElements: [],
  pinnedPredator: null,
  abilityLevels: {},
  unlockedSpecialItems: [],
  discoveredFossils: {},
  perfectMode: false,
  network: { nickname: '', lastRoom: '', tvScale: false, mpCameraMode: 'shared' },
  settings: {
    quality: 'medium',
    shadows: true,
    particles: 'normal',
    fov: 58,
    brightness: 1.05,
    clearVision: false,
    lowHpPulse: false,
    disableIntro: false,
    introMode: 'always',
    discoveryPopups: true,
    progressiveUnlocks: true,
    mpCameraMode: 'shared',
    fpsCap: 0,
    sensitivity: 1.0,
    lang: 'pt',
    styleFilter: 'default',
    narrator: false,
    obstacleHints: true,
    touchMode: 'swipe',
    disableGachaVoluntary: false,
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

function readCheckpointCookie() {
  if (typeof document === 'undefined') return null;
  try {
    const parts = document.cookie ? document.cookie.split('; ') : [];
    const hit = parts.find((p) => p.startsWith(`${CHECKPOINT_COOKIE}=`));
    if (!hit) return null;
    const raw = decodeURIComponent(hit.slice(CHECKPOINT_COOKIE.length + 1));
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeCheckpointCookie(data) {
  if (typeof document === 'undefined' || !data) return;
  try {
    const summary = {
      highScore: Math.floor(data.highScore || 0),
      eggs: Math.floor(data.eggs || 0),
      crystals: Math.floor(data.crystals || 0),
      fossilCrates: Math.floor(data.fossilCrates || 0),
      selectedDino: String(data.selectedDino || 'trex').slice(0, 28),
      unlockedDinos: Array.isArray(data.unlockedDinos) ? data.unlockedDinos.slice(0, 40) : ['trex'],
      activeTitle: String(data.activeTitle || 'Iniciante').slice(0, 28),
      playerActorId: String(data.playerActorId || '').slice(0, 64),
      savedAt: Number(data.savedAt || Date.now())
    };
    const encoded = encodeURIComponent(JSON.stringify(summary));
    if (encoded.length > 3400) return;
    const secFlag = (typeof window !== 'undefined' && window.location?.protocol === 'https:') ? '; Secure' : '';
    document.cookie = `${CHECKPOINT_COOKIE}=${encoded}; path=/; max-age=15552000; SameSite=Lax${secFlag}`;
  } catch {
    // Cookie opcional de recuperação
  }
}

function clearCheckpointCookie() {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${CHECKPOINT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
}

function openSaveDb() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbReadSave() {
  const db = await openSaveDb();
  if (!db) return null;
  return await new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => { db.close(); resolve(req.result || null); };
      req.onerror = () => { db.close(); resolve(null); };
    } catch {
      try { db.close(); } catch {}
      resolve(null);
    }
  });
}

async function idbWriteSave(snapshot) {
  const db = await openSaveDb();
  if (!db) return false;
  return await new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(snapshot, IDB_KEY);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
    } catch {
      try { db.close(); } catch {}
      resolve(false);
    }
  });
}

async function idbDeleteAll() {
  if (typeof window === 'undefined' || !window.indexedDB) return;
  await new Promise((resolve) => {
    try {
      const req = window.indexedDB.deleteDatabase(IDB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

class SaveSystem {
  constructor() {
    this.memoryFallback = null;
    this.storageAvailable = true;
    this._wipedAt = 0;
    this.data = this.load();
  }

  _normalizeLoaded(parsed) {
    const prevBenchVer = parsed?.benchmarkVersion || 1;
    const loaded = mergeDefaults(deepClone(parsed), DEFAULT_SAVE);
    const freeStarters = DEFAULT_SAVE.unlockedDinos;
    for (const id of freeStarters) {
      if (!loaded.unlockedDinos.includes(id)) loaded.unlockedDinos.push(id);
    }
    if (prevBenchVer < 3) {
      const wasLowTier = loaded.benchmarkTier === 'Baixo';
      loaded.benchmarkVersion = 3;
      loaded.benchmarkDone = false;
      loaded.benchmarkTier = '';
      loaded.benchmarkFps = 0;
      if (!loaded.lowSpecManual && loaded.lowSpecMode && wasLowTier) {
        loaded.lowSpecMode = false;
        loaded.settings.quality = loaded.settings.quality === 'low' ? 'medium' : loaded.settings.quality;
        loaded.settings.shadows = true;
      }
    }
    if (!loaded.introModeCustom && !loaded.settings?.disableIntro && loaded.settings?.introMode === 'first_time') {
      loaded.settings.introMode = 'always';
    }
    const legacyPity = Math.max(0, Math.floor(Number(loaded.gachaPity || 0)));
    loaded.gachaPityEpic = parsed?.gachaPityEpic == null
      ? Math.min(8, legacyPity)
      : Math.max(0, Math.min(8, Math.floor(Number(loaded.gachaPityEpic || 0))));
    loaded.gachaPityShiny = parsed?.gachaPityShiny == null
      ? Math.min(14, legacyPity)
      : Math.max(0, Math.min(14, Math.floor(Number(loaded.gachaPityShiny || 0))));
    loaded.gachaPity = loaded.gachaPityEpic;
    if (!import.meta.env?.DEV) {
      loaded.devMode = false;
    }
    return loaded;
  }

  load() {
    let parsed = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        parsed = JSON.parse(raw);
      }
    } catch {
      this.storageAvailable = false;
    }

    if (!parsed) {
      const cookieChk = readCheckpointCookie();
      if (cookieChk) {
        parsed = cookieChk;
      }
    }

    if (!parsed) {
      if (this.memoryFallback) return this.memoryFallback;
      this.memoryFallback = deepClone(DEFAULT_SAVE);
      return this.memoryFallback;
    }
    return this._normalizeLoaded(parsed);
  }

  async hydrateAsync() {
    const reqStart = Date.now();
    const idbData = await idbReadSave();
    if (!idbData || typeof idbData !== 'object') return false;
    if (this._wipedAt >= reqStart) return false;
    const idbSavedAt = Number(idbData.savedAt || 0);
    const curSavedAt = Number(this.data?.savedAt || 0);
    let hasLocal = false;
    try {
      hasLocal = !!window.localStorage.getItem(STORAGE_KEY);
    } catch {}
    const shouldRestore = !hasLocal || idbSavedAt > curSavedAt || (Number(idbData.highScore || 0) > Number(this.data?.highScore || 0) && curSavedAt === 0);
    if (!shouldRestore) return false;
    this.data = this._normalizeLoaded(idbData);
    this.memoryFallback = this.data;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.storageAvailable = true;
    } catch {}
    writeCheckpointCookie(this.data);
    return true;
  }

  save() {
    this.data.savedAt = Date.now();
    if (!import.meta.env?.DEV) this.data.devMode = false;
    this.memoryFallback = this.data;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.storageAvailable = true;
    } catch {
      this.storageAvailable = false;
    }
    writeCheckpointCookie(this.data);
    idbWriteSave(deepClone(this.data)).catch(() => {});
  }

  exportJson() {
    return JSON.stringify(this.data, null, 2);
  }

  importJson(rawText) {
    try {
      const parsed = JSON.parse(String(rawText || ''));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'Arquivo JSON inválido.' };
      }
      this.data = this._normalizeLoaded(parsed);
      this.save();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Não foi possível ler este JSON de save.' };
    }
  }

  async wipeAllLocalData() {
    this._wipedAt = Date.now();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
    clearCheckpointCookie();
    await idbDeleteAll();
    this.data = deepClone(DEFAULT_SAVE);
    this.memoryFallback = this.data;
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

  addCrystals(amount) {
    this.data.crystals = Math.max(0, Math.floor((this.data.crystals || 0) + amount));
    this.save();
    return this.data.crystals;
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
