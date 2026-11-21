// Persistência resiliente em 3 camadas (localStorage + IndexedDB + Cookie técnico de recuperação),
// com versionamento de schema, checksum, backup automático, migração e proteção anti-prototype-pollution.

import { sanitizeNickname } from '../security/Sanitize.js';

const STORAGE_KEY = 'dino_dash_3d_save_v1';
const BACKUP_KEY = 'dino_dash_3d_save_backup_v1';
const IDB_NAME = 'DinoDash3DDB';
const IDB_STORE = 'saves';
const IDB_KEY = 'primary';
const CHECKPOINT_COOKIE = 'dd3d_chk';

export const SAVE_SCHEMA_VERSION = 5;
export const MAX_SAVE_IMPORT_BYTES = 512 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const DEFAULT_SAVE = {
  schemaVersion: SAVE_SCHEMA_VERSION,
  highScore: 0,
  bestScoresByMode: {},
  eggs: 0,
  selectedDino: 'trex',
  unlockedDinos: [
    'trex', 'raptor', 'triceratops', 'stegosaurus',
    'ankylosaurus', 'spinosaurus', 'brachiosaurus', 'dilophosaurus',
    'scary_raptor'
  ],
  dinoLevels: {},
  customization: {
    p1: {
      activePreset: 0,
      _lastCustomBackup: null,
      presets: [
        { useCustomColors: false, primary: '#3fa34d', secondary: '#c7e89b', eye: '#ffd54f', spots: '#1e5b2b', spikes: '#e87a24', pattern: 'solid', accessory: 'none', accessories: [], trail: 'dust', landingEffect: 'dust', deathEffect: 'cubes' },
        { useCustomColors: true, primary: '#e05a2b', secondary: '#ffd89c', eye: '#ffffff', spots: '#781d0c', spikes: '#ffca3a', pattern: 'stripes', accessory: 'none', accessories: [], trail: 'fire', landingEffect: 'sparks', deathEffect: 'cubes' },
        { useCustomColors: true, primary: '#2d7dd2', secondary: '#a7e8ff', eye: '#ffeb3b', spots: '#143c6d', spikes: '#52e3e1', pattern: 'spots', accessory: 'none', accessories: [], trail: 'stars', landingEffect: 'dust', deathEffect: 'cubes' }
      ]
    },
    p2: {
      activePreset: 0,
      _lastCustomBackup: null,
      presets: [
        { useCustomColors: false, primary: '#e07a24', secondary: '#ffe3a8', eye: '#ffffff', spots: '#7d2f0c', spikes: '#f4d35e', pattern: 'stripes', accessory: 'none', accessories: [], trail: 'dust', landingEffect: 'dust', deathEffect: 'cubes' },
        { useCustomColors: true, primary: '#8338ec', secondary: '#e0b1ff', eye: '#52ffe8', spots: '#3a0ca3', spikes: '#ffbe0b', pattern: 'neon', accessory: 'none', accessories: [], trail: 'rainbow', landingEffect: 'sparks', deathEffect: 'cubes' },
        { useCustomColors: true, primary: '#2a9d8f', secondary: '#b7f4ea', eye: '#ffd166', spots: '#154d46', spikes: '#e76f51', pattern: 'camo', accessory: 'none', accessories: [], trail: 'dust', landingEffect: 'dust', deathEffect: 'cubes' }
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
  achievementProgress: {},
  achievementUnlockedAt: {},
  records: [],
  rivalry: { p1Wins: 0, p2Wins: 0 },
  ghostRuns: {},
  tutorialDone: false,
  firstRunTutorialDone: false,
  glossarySeen: false,
  tutorialRewardClaimed: false,
  minigamesDaily: { date: '', eggsEarned: 0 },
  prestige: { level: 0, bonusMult: 1.0 },
  talents: { speed: 0, magnet: 0, vitality: 0, alchemy: 0, greed: 0 },
  campaign: { completedNodes: [], currentNode: 'desert_start' },
  season: 'auto',
  team: { name: 'Dino Squad', color: '#58d63a', emblem: '🦖' },
  stats: { runs: 0, totalDist: 0, totalEggs: 0, bossesDefeated: 0, playTimeSec: 0, deathsBy: {}, skillsUsed: {}, victoriesLan: 0 },
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
  imported: false,
  importedAt: 0,
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
  profile: {
    nickname: '',
    bio: '',
    isPublic: true,
    avatar: {
      dinoId: 'trex',
      angleY: -0.55,
      angleX: 0.12,
      zoom: 1.0,
      pose: 'idle',
      skinId: 'original'
    },
    showcaseAchievements: [],
    bannerId: 'amber_classic',
    frameId: 'default',
    nicknameChangedAt: 0,
    xp: 0,
    level: 1
  },
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
    forceLandscape: false,
    autoRotateTilt: true,
    controllerLayout: {
      preset: 'default',
      leftHanded: false,
      useJoystick: false,
      scale: 1.0,
      opacity: 0.96,
      positions: {}
    },
    mobileHudLayout: {
      scale: 1.0,
      opacity: 0.92,
      positions: {}
    },
    disableGachaVoluntary: false,
    personalNames: false,
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

/**
 * Remove chaves perigosas (__proto__, constructor, prototype) recursivamente contra prototype pollution.
 */
export function sanitizePlainObject(value, depth = 0) {
  if (depth > 16) return null;
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return 0;
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 500).map((item) => sanitizePlainObject(item, depth + 1));
  }
  const out = {};
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    out[key] = sanitizePlainObject(value[key], depth + 1);
  }
  return out;
}

function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`;
  }
  const keys = Object.keys(value).filter((k) => !FORBIDDEN_KEYS.has(k)).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(',')}}`;
}

/**
 * Calcula checksum determinístico FNV-1a duplo (64-bit hex) para integridade do JSON exportado.
 */
export function computeSaveChecksum(dataObj) {
  const canonical = canonicalStringify(sanitizePlainObject(dataObj));
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < canonical.length; i++) {
    const c = canonical.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (c + (i & 0xff));
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `dd3d_${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

function sanitizeBioText(raw, maxLen = 160) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F<>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function clampInt(val, min, max, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function mergeDefaults(target, defaults) {
  for (const key of Object.keys(defaults)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const val = defaults[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
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

function migratePresetAccessories(customization) {
  if (!customization || typeof customization !== 'object') return;
  for (const key of ['p1', 'p2']) {
    const slot = customization[key];
    if (!slot || typeof slot !== 'object') continue;
    if (slot._lastCustomBackup === undefined) slot._lastCustomBackup = null;
    if (!Array.isArray(slot.presets)) continue;
    for (const preset of slot.presets) {
      if (!preset || typeof preset !== 'object') continue;
      if (!Array.isArray(preset.accessories)) {
        preset.accessories = (preset.accessory && preset.accessory !== 'none') ? [preset.accessory] : [];
      } else {
        preset.accessories = preset.accessories.filter((a) => typeof a === 'string' && a && a !== 'none');
        if (!preset.accessories.length && preset.accessory && preset.accessory !== 'none') {
          preset.accessories = [preset.accessory];
        }
      }
      preset.accessory = preset.accessories[0] || 'none';
    }
  }
}

/**
 * Migra saves de versões antigas (v1/v2/v3/v4 ou campos legados) para o schema atual v5.
 */
export function migrateSaveData(rawObj, sourceVersion = 1) {
  const clean = sanitizePlainObject(rawObj) || {};
  const migrated = deepClone(clean);

  // Migrações de campos legados (v1/v2)
  if (migrated.scores && !migrated.bestScoresByMode) {
    migrated.bestScoresByMode = typeof migrated.scores === 'object' ? migrated.scores : {};
  }
  if (typeof migrated.coins === 'number' && migrated.eggs === undefined) {
    migrated.eggs = migrated.coins;
  }
  if (typeof migrated.dino === 'string' && !migrated.selectedDino) {
    migrated.selectedDino = migrated.dino;
  }
  if (migrated.gachaPity !== undefined && migrated.gachaPityEpic === undefined) {
    migrated.gachaPityEpic = migrated.gachaPity;
  }
  if (migrated.network?.nickname && (!migrated.profile || !migrated.profile.nickname)) {
    migrated.profile = { ...(migrated.profile || {}), nickname: migrated.network.nickname };
  }
  migratePresetAccessories(migrated.customization);
  if (migrated.equippedMutation === '' || migrated.equippedMutation === 'none') {
    migrated.equippedMutation = null;
  }
  if (Array.isArray(migrated.unlockedDinos) && !migrated.unlockedDinos.includes('scary_raptor')) {
    migrated.unlockedDinos.push('scary_raptor');
  }
  if (migrated.firstRunTutorialDone === undefined) {
    migrated.firstRunTutorialDone = false;
  }
  if (migrated.glossarySeen === undefined) {
    migrated.glossarySeen = false;
  }
  if (sourceVersion < SAVE_SCHEMA_VERSION) {
    migrated.schemaVersion = SAVE_SCHEMA_VERSION;
  }
  return migrated;
}

function readCheckpointCookie() {
  if (typeof document === 'undefined') return null;
  try {
    const parts = document.cookie ? document.cookie.split('; ') : [];
    const hit = parts.find((p) => p.startsWith(`${CHECKPOINT_COOKIE}=`));
    if (!hit) return null;
    const raw = decodeURIComponent(hit.slice(CHECKPOINT_COOKIE.length + 1));
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? sanitizePlainObject(parsed) : null;
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
    this.lastBackup = null;
    this.storageAvailable = true;
    this._wipedAt = 0;
    this.data = this.load();
  }

  _normalizeLoaded(parsed) {
    const clean = sanitizePlainObject(parsed) || {};
    const prevBenchVer = clean?.benchmarkVersion || 1;
    const loaded = mergeDefaults(deepClone(clean), DEFAULT_SAVE);
    loaded.schemaVersion = SAVE_SCHEMA_VERSION;
    migratePresetAccessories(loaded.customization);
    if (loaded.equippedMutation === '' || loaded.equippedMutation === 'none' || loaded.equippedMutation === undefined) {
      loaded.equippedMutation = null;
    }

    const freeStarters = DEFAULT_SAVE.unlockedDinos;
    if (!Array.isArray(loaded.unlockedDinos)) loaded.unlockedDinos = [...freeStarters];
    for (const id of freeStarters) {
      if (!loaded.unlockedDinos.includes(id)) loaded.unlockedDinos.push(id);
    }
    if (!Array.isArray(loaded.achievements)) loaded.achievements = [];
    loaded.achievements = Array.from(new Set(loaded.achievements.filter((a) => typeof a === 'string').slice(0, 200)));
    if (!loaded.achievementProgress || typeof loaded.achievementProgress !== 'object') loaded.achievementProgress = {};
    if (!loaded.achievementUnlockedAt || typeof loaded.achievementUnlockedAt !== 'object') loaded.achievementUnlockedAt = {};

    loaded.highScore = clampInt(loaded.highScore, 0, 10_000_000, 0);
    loaded.eggs = clampInt(loaded.eggs, 0, 5_000_000, 0);
    loaded.crystals = clampInt(loaded.crystals, 0, 500_000, 0);
    loaded.fossilCrates = clampInt(loaded.fossilCrates, 0, 10_000, 2);

    if (loaded.network) {
      loaded.network.nickname = loaded.network.nickname ? sanitizeNickname(loaded.network.nickname, '', 16) : '';
    }
    if (loaded.profile) {
      loaded.profile.nickname = loaded.profile.nickname ? sanitizeNickname(loaded.profile.nickname, '', 16) : (loaded.network?.nickname || '');
      loaded.profile.bio = sanitizeBioText(loaded.profile.bio || '', 160);
      loaded.profile.isPublic = loaded.profile.isPublic !== false;
      loaded.profile.level = clampInt(loaded.profile.level, 1, 999, 1);
      loaded.profile.xp = clampInt(loaded.profile.xp, 0, 10_000_000, 0);
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
    loaded.gachaPityEpic = clean?.gachaPityEpic == null
      ? Math.min(8, legacyPity)
      : Math.max(0, Math.min(8, Math.floor(Number(loaded.gachaPityEpic || 0))));
    loaded.gachaPityShiny = clean?.gachaPityShiny == null
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
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) parsed = JSON.parse(raw);
      }
    } catch {
      this.storageAvailable = false;
    }

    if (!parsed) {
      const cookieChk = readCheckpointCookie();
      if (cookieChk) parsed = cookieChk;
    }

    if (!parsed) {
      if (this.memoryFallback) return this.memoryFallback;
      this.memoryFallback = deepClone(DEFAULT_SAVE);
      return this.memoryFallback;
    }
    return this._normalizeLoaded(migrateSaveData(parsed, Number(parsed.schemaVersion || 1)));
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
      hasLocal = !!(typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY));
    } catch {}
    const shouldRestore = !hasLocal || idbSavedAt > curSavedAt || (Number(idbData.highScore || 0) > Number(this.data?.highScore || 0) && curSavedAt === 0);
    if (!shouldRestore) return false;
    this.data = this._normalizeLoaded(migrateSaveData(idbData, Number(idbData.schemaVersion || 1)));
    this.memoryFallback = this.data;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.storageAvailable = true;
      }
    } catch {}
    writeCheckpointCookie(this.data);
    return true;
  }

  save() {
    this.data.savedAt = Date.now();
    this.data.schemaVersion = SAVE_SCHEMA_VERSION;
    if (!import.meta.env?.DEV) this.data.devMode = false;
    this.memoryFallback = this.data;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.storageAvailable = true;
      }
    } catch {
      this.storageAvailable = false;
    }
    writeCheckpointCookie(this.data);
    idbWriteSave(deepClone(this.data)).catch(() => {});
  }

  exportSavePackage() {
    const cleanData = sanitizePlainObject(deepClone(this.data));
    cleanData.schemaVersion = SAVE_SCHEMA_VERSION;
    const checksum = computeSaveChecksum(cleanData);
    return {
      game: 'dino-dash-3d',
      schemaVersion: SAVE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      checksum,
      data: cleanData
    };
  }

  exportJson() {
    return JSON.stringify(this.exportSavePackage(), null, 2);
  }

  /**
   * Valida JSON importado (tamanho, prototype pollution, tipos, checksum e migração)
   * e retorna pré-visualização antes de sobrescrever o save atual.
   */
  previewImport(rawText) {
    if (typeof rawText !== 'string' || !rawText.trim()) {
      return { ok: false, error: 'Arquivo vazio ou formato inválido.' };
    }
    if (rawText.length > MAX_SAVE_IMPORT_BYTES) {
      return { ok: false, error: `Arquivo muito grande (máximo ${Math.round(MAX_SAVE_IMPORT_BYTES / 1024)} KB).` };
    }
    // Detecção rápida de payload malicioso de prototype pollution no texto bruto
    if (/"__proto__"\s*:|"constructor"\s*:|"prototype"\s*:/i.test(rawText)) {
      return { ok: false, error: 'Arquivo rejeitado por conter chaves inválidas de segurança.' };
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return { ok: false, error: 'Não foi possível ler este JSON (arquivo corrompido ou sintaxe inválida).' };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Estrutura de save inválida (esperado objeto JSON).' };
    }

    const warnings = [];
    let isLegacy = false;
    let sourceVersion = 1;
    let checksumValid = true;
    let rawData = null;
    let exportedAt = null;

    if (parsed.game === 'dino-dash-3d' && parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
      sourceVersion = clampInt(parsed.schemaVersion, 1, 99, 1);
      exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null;
      rawData = parsed.data;
      if (parsed.checksum) {
        const expected = computeSaveChecksum(rawData);
        if (expected !== parsed.checksum) {
          checksumValid = false;
          return { ok: false, error: 'Checksum inválido: o arquivo foi alterado ou está corrompido.' };
        }
      } else {
        warnings.push('Arquivo sem checksum de integridade.');
      }
    } else {
      // Suporte a saves antigos (v1-v3) exportados antes do wrapper
      isLegacy = true;
      sourceVersion = clampInt(parsed.schemaVersion, 1, 3, 1);
      rawData = parsed;
      const hasAnyKnownField = (
        typeof rawData.highScore === 'number' ||
        typeof rawData.eggs === 'number' ||
        Array.isArray(rawData.unlockedDinos) ||
        typeof rawData.selectedDino === 'string' ||
        typeof rawData.scores === 'object'
      );
      if (!hasAnyKnownField) {
        return { ok: false, error: 'Este JSON não parece ser um save válido do Dino Dash 3D.' };
      }
      warnings.push(`Save legado (v${sourceVersion}) será migrado automaticamente para v${SAVE_SCHEMA_VERSION}.`);
    }

    const migrated = migrateSaveData(rawData, sourceVersion);
    const normalized = this._normalizeLoaded(migrated);

    return {
      ok: true,
      schemaVersion: sourceVersion,
      isLegacy,
      checksumValid,
      exportedAt,
      warnings,
      normalizedData: normalized,
      summary: {
        highScore: normalized.highScore,
        level: normalized.seasonPass?.level || normalized.profile?.level || 1,
        eggs: normalized.eggs,
        crystals: normalized.crystals,
        unlockedDinosCount: normalized.unlockedDinos.length,
        achievementsCount: normalized.achievements.length,
        nickname: normalized.profile?.nickname || normalized.network?.nickname || 'Convidado'
      }
    };
  }

  createAutoBackup() {
    const backup = {
      backedUpAt: Date.now(),
      data: deepClone(this.data)
    };
    this.lastBackup = backup;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      }
    } catch {}
    return backup;
  }

  getAutoBackupInfo() {
    let backup = this.lastBackup;
    if (!backup) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(BACKUP_KEY);
          if (raw) backup = JSON.parse(raw);
        }
      } catch {}
    }
    if (!backup || !backup.data) return null;
    return {
      backedUpAt: backup.backedUpAt || 0,
      highScore: Math.floor(backup.data.highScore || 0),
      eggs: Math.floor(backup.data.eggs || 0),
      unlockedDinosCount: Array.isArray(backup.data.unlockedDinos) ? backup.data.unlockedDinos.length : 0,
      achievementsCount: Array.isArray(backup.data.achievements) ? backup.data.achievements.length : 0
    };
  }

  restoreAutoBackup() {
    let backup = this.lastBackup;
    if (!backup) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(BACKUP_KEY);
          if (raw) backup = JSON.parse(raw);
        }
      } catch {}
    }
    if (!backup || !backup.data) {
      return { ok: false, error: 'Nenhum backup automático disponível.' };
    }
    this.data = this._normalizeLoaded(backup.data);
    this.save();
    return { ok: true };
  }

  importJson(rawText, { skipBackup = false } = {}) {
    const check = this.previewImport(rawText);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }
    if (!skipBackup) {
      this.createAutoBackup();
    }
    const nextData = check.normalizedData;
    nextData.imported = true;
    nextData.importedAt = Date.now();
    this.data = nextData;
    this.save();
    return { ok: true, preview: check.summary, warnings: check.warnings };
  }

  isImportedSave() {
    return !!this.data?.imported;
  }

  async wipeAllLocalData() {
    this._wipedAt = Date.now();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(BACKUP_KEY);
      }
    } catch {}
    this.lastBackup = null;
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

  unlockAchievement(id, { bypassAntiExploit = false } = {}) {
    if (!id || typeof id !== 'string') return false;
    if (!bypassAntiExploit && this.data.devMode) return false;
    if (!this.data.achievements.includes(id)) {
      this.data.achievements.push(id);
      if (!this.data.achievementUnlockedAt) this.data.achievementUnlockedAt = {};
      this.data.achievementUnlockedAt[id] = Date.now();
      this.save();
      return true;
    }
    return false;
  }
}

export const Save = new SaveSystem();
