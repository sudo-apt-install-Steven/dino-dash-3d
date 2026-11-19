// Sistema data-driven de Conquistas & Troféus (D4): catálogo JSON, anti-exploit, progresso, recompensas e toasts.
import achievementsCatalog from '../content/achievements.json' with { type: 'json' };
import { Save } from './Save.js';

export const ACHIEVEMENT_CATEGORIES = [
  { id: 'corrida', label: 'Corrida', icon: '🏃' },
  { id: 'bosses', label: 'Bosses', icon: '⚔️' },
  { id: 'eventos', label: 'Eventos', icon: '🌪️' },
  { id: 'predadores', label: 'Predadores', icon: '🐺' },
  { id: 'multiplayer', label: 'Multiplayer', icon: '🌐' },
  { id: 'exploracao', label: 'Exploração', icon: '🗺️' },
  { id: 'colecao', label: 'Coleção', icon: '🦕' },
  { id: 'maestria', label: 'Maestria', icon: '💠' },
  { id: 'segredos', label: 'Segredos', icon: '👻' }
];

export const TROPHY_TIERS = {
  bronze: { id: 'bronze', label: 'Bronze', icon: '🥉', color: '#cd7f32' },
  prata: { id: 'prata', label: 'Prata', icon: '🥈', color: '#cbd5e1' },
  ouro: { id: 'ouro', label: 'Ouro', icon: '🥇', color: '#fbbf24' },
  platina: { id: 'platina', label: 'Platina', icon: '💎', color: '#38bdf8' }
};

export const RARITY_META = {
  comum: { label: 'Comum', color: '#94a3b8' },
  raro: { label: 'Raro', color: '#38bdf8' },
  epico: { label: 'Épico', color: '#c084fc' },
  lendario: { label: 'Lendário', color: '#fbbf24' }
};

const ACH_MAP = new Map(achievementsCatalog.map((a) => [a.id, a]));

function isUrlDebugActive() {
  try {
    if (typeof window === 'undefined' || !window.location?.search) return false;
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

export class AchievementsSystem {
  constructor() {
    this._toastQueue = [];
    this._toastActive = false;
  }

  getAll() {
    return achievementsCatalog;
  }

  getCategories() {
    return ACHIEVEMENT_CATEGORIES;
  }

  getById(id) {
    return ACH_MAP.get(id) || null;
  }

  isUnlocked(id) {
    return Array.isArray(Save.data.achievements) && Save.data.achievements.includes(id);
  }

  getUnlockedAt(id) {
    return Save.data.achievementUnlockedAt?.[id] || null;
  }

  /**
   * Anti-exploit: bloqueia conquistas em modo debug ou saves importados (para conquistas validadas/de corrida).
   */
  checkAntiExploit(ach, { isDebug = false, isImported = Save.isImportedSave(), allowImportedLocal = false } = {}) {
    if (isDebug || Save.data.devMode || isUrlDebugActive()) {
      return { allowed: false, reason: 'debug' };
    }
    if (isImported && (ach?.serverValidated || !allowImportedLocal)) {
      return { allowed: false, reason: 'imported' };
    }
    return { allowed: true, reason: null };
  }

  /**
   * Calcula o valor atual de uma métrica a partir do progresso salvo e dados do Save.
   */
  getMetricValue(metric) {
    const p = Save.data.achievementProgress || {};
    const stats = Save.data.stats || {};
    switch (metric) {
      case 'runs':
        return Math.max(Number(p.runs || 0), Number(stats.runs || 0));
      case 'totalDist':
        return Math.max(Number(p.totalDist || 0), Number(stats.totalDist || 0));
      case 'score':
        return Math.max(Number(p.score || 0), Number(Save.data.highScore || 0));
      case 'bossesDefeated':
        return Math.max(Number(p.bossesDefeated || 0), Number(stats.bossesDefeated || 0));
      case 'bossTrophiesCount':
        return Array.isArray(Save.data.dinoHouse?.trophies) ? Save.data.dinoHouse.trophies.length : 0;
      case 'victoriesLan':
        return Math.max(Number(p.victoriesLan || 0), Number(stats.victoriesLan || 0));
      case 'unlockedDinosCount':
        return Array.isArray(Save.data.unlockedDinos) ? Save.data.unlockedDinos.length : 0;
      case 'unlockedMutationsCount':
        return Array.isArray(Save.data.unlockedMutations) ? Save.data.unlockedMutations.length : 0;
      case 'gachaPulls':
        return Math.max(Number(p.gachaPulls || 0), Number(Save.data.gachaStats?.pulls || 0));
      case 'gachaShinies':
        return Math.max(Number(p.gachaShinies || 0), Number(Save.data.gachaStats?.shinies || 0));
      case 'maxDinoLevel': {
        const vals = Object.values(Save.data.dinoLevels || {}).map((v) => Number(v || 1));
        return vals.length ? Math.max(1, ...vals) : 1;
      }
      case 'biomesVisited': {
        const fossils = Object.keys(Save.data.discoveredFossils || {}).length;
        return Math.max(Number(p.biomesVisited || 0), fossils);
      }
      case 'prestigeLevel':
        return Number(Save.data.prestige?.level || 0);
      case 'totalSkillsUsed': {
        const sum = Object.values(stats.skillsUsed || {}).reduce((acc, n) => acc + Number(n || 0), 0);
        return Math.max(Number(p.totalSkillsUsed || 0), sum);
      }
      case 'unlockedAchievementsCount':
        return Array.isArray(Save.data.achievements) ? Save.data.achievements.length : 0;
      case 'hollowEarth':
        return Save.data.discoveredHollowEarth ? 1 : Number(p.hollowEarth || 0);
      default:
        return Number(p[metric] || 0);
    }
  }

  getProgress(id) {
    const ach = this.getById(id);
    if (!ach) return { current: 0, target: 1, pct: 0 };
    const target = Math.max(1, Number(ach.requirement?.target || 1));
    const current = this.isUnlocked(id)
      ? target
      : Math.min(target, Math.max(0, this.getMetricValue(ach.requirement?.metric)));
    return {
      current,
      target,
      pct: Math.min(100, Math.round((current / target) * 100))
    };
  }

  unlock(id, opts = {}) {
    const ach = this.getById(id);
    if (!ach) return { ok: false, reason: 'not_found' };
    if (this.isUnlocked(id)) return { ok: false, reason: 'already_unlocked' };

    const guard = this.checkAntiExploit(ach, opts);
    if (!guard.allowed) {
      return { ok: false, reason: guard.reason };
    }

    const unlocked = Save.unlockAchievement(id, { bypassAntiExploit: true });
    if (!unlocked) return { ok: false, reason: 'already_unlocked' };

    // Aplica recompensas sem recursão infinita
    const rw = ach.reward || {};
    if (rw.eggs) Save.addEggs(rw.eggs);
    if (rw.crystals) Save.addCrystals(rw.crystals);
    if (rw.xp) {
      if (!Save.data.profile) Save.data.profile = { xp: 0, level: 1 };
      Save.data.profile.xp = (Save.data.profile.xp || 0) + Number(rw.xp);
      while (Save.data.profile.xp >= 200) {
        Save.data.profile.xp -= 200;
        Save.data.profile.level = (Save.data.profile.level || 1) + 1;
      }
    }
    if (rw.title && Array.isArray(Save.data.unlockedTitles) && !Save.data.unlockedTitles.includes(rw.title)) {
      Save.data.unlockedTitles.push(rw.title);
    }
    Save.save();

    if (!opts.silent) {
      this.showToast(ach);
    }

    // Reavalia marcos de quantidade de conquistas (bronze/prata/ouro/platina)
    if (ach.requirement?.metric !== 'unlockedAchievementsCount') {
      this._evaluateMilestoneTrophies(opts);
    }

    return { ok: true, achievement: ach };
  }

  _evaluateMilestoneTrophies(opts = {}) {
    const count = Save.data.achievements?.length || 0;
    for (const ach of achievementsCatalog) {
      if (ach.requirement?.metric === 'unlockedAchievementsCount' && count >= ach.requirement.target) {
        if (!this.isUnlocked(ach.id)) {
          this.unlock(ach.id, { ...opts, allowImportedLocal: true });
        }
      }
    }
  }

  /**
   * Atualiza métricas acumuladas e máximas após uma corrida ou ação e desbloqueia conquistas elegíveis.
   */
  evaluateRun(metrics = {}, opts = {}) {
    const guard = this.checkAntiExploit({ serverValidated: true }, opts);
    if (!guard.allowed && guard.reason === 'debug') {
      return [];
    }

    if (!Save.data.achievementProgress) Save.data.achievementProgress = {};
    const p = Save.data.achievementProgress;

    const additiveKeys = [
      'runs', 'totalDist', 'bossesDefeated', 'bossHitsQ', 'fastBossKills',
      'ufoEscapes', 'eventsSurvived', 'meteorNoHit', 'eclipseOrAurora',
      'predatorsEscaped', 'stomps', 'predatorHits', 'mpRuns', 'revives',
      'victoriesLan', 'pvpMatches', 'submergedSec', 'flyingDist', 'gachaPulls',
      'gachaShinies', 'totalSkillsUsed', 'hybridRuns', 'retroRuns'
    ];
    const maxKeys = [
      'score', 'eggsRun', 'eventsInRun', 'noDamageScore', 'perfectModeScore',
      'hardScore', 'maxCombo', 'mirroredScore', 'visitedRiver', 'biomesVisited',
      'hollowEarth', 'legendaryCards', 'konamiSecret'
    ];

    if (guard.allowed) {
      for (const k of additiveKeys) {
        if (typeof metrics[k] === 'number' && metrics[k] > 0) {
          p[k] = Number(p[k] || 0) + metrics[k];
        }
      }
      for (const k of maxKeys) {
        if (typeof metrics[k] === 'number' && metrics[k] > 0) {
          p[k] = Math.max(Number(p[k] || 0), metrics[k]);
        }
      }
      Save.save();
    }

    const newlyUnlocked = [];
    for (const ach of achievementsCatalog) {
      if (this.isUnlocked(ach.id)) continue;
      const metric = ach.requirement?.metric;
      const target = Number(ach.requirement?.target || 1);
      if (!metric) continue;
      const current = this.getMetricValue(metric);
      if (current >= target) {
        const res = this.unlock(ach.id, opts);
        if (res.ok) newlyUnlocked.push(ach);
      }
    }
    return newlyUnlocked;
  }

  incrementMetric(metric, delta = 1, opts = {}) {
    return this.evaluateRun({ [metric]: delta }, opts);
  }

  getSummary() {
    const total = achievementsCatalog.length;
    const unlockedIds = new Set(Save.data.achievements || []);
    const unlocked = achievementsCatalog.filter((a) => unlockedIds.has(a.id)).length;
    const byTrophy = { bronze: { total: 0, unlocked: 0 }, prata: { total: 0, unlocked: 0 }, ouro: { total: 0, unlocked: 0 }, platina: { total: 0, unlocked: 0 } };
    const byCategory = {};

    for (const c of ACHIEVEMENT_CATEGORIES) {
      byCategory[c.id] = { total: 0, unlocked: 0 };
    }

    for (const a of achievementsCatalog) {
      const isUnl = unlockedIds.has(a.id);
      if (byTrophy[a.trophy]) {
        byTrophy[a.trophy].total++;
        if (isUnl) byTrophy[a.trophy].unlocked++;
      }
      if (byCategory[a.category]) {
        byCategory[a.category].total++;
        if (isUnl) byCategory[a.category].unlocked++;
      }
    }

    return {
      total,
      unlocked,
      pct: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      byTrophy,
      byCategory
    };
  }

  showToast(ach) {
    if (typeof document === 'undefined' || !document.body) return;
    this._toastQueue.push(ach);
    if (!this._toastActive) {
      this._drainToastQueue();
    }
  }

  _drainToastQueue() {
    if (this._toastQueue.length === 0) {
      this._toastActive = false;
      return;
    }
    this._toastActive = true;
    const ach = this._toastQueue.shift();
    const trophy = TROPHY_TIERS[ach.trophy] || TROPHY_TIERS.bronze;

    let host = document.getElementById('ach-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'ach-toast-host';
      host.style.cssText = 'position:fixed; top:16px; right:16px; z-index:9999; pointer-events:none; display:flex; flex-direction:column; gap:8px;';
      document.body.appendChild(host);
    }

    const card = document.createElement('div');
    card.className = 'chunky-panel';
    card.style.cssText = `
      pointer-events:auto; min-width:260px; max-width:340px; padding:10px 14px;
      border-color:${trophy.color}; background:linear-gradient(135deg, rgba(30,20,10,0.96), rgba(15,10,5,0.96));
      display:flex; align-items:center; gap:10px; box-shadow:0 8px 24px rgba(0,0,0,0.55);
      animation: achToastIn 0.25s ease-out;
    `;
    card.innerHTML = `
      <div style="font-size:1.75rem; line-height:1;">${ach.icon || '🏆'}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.7rem; font-weight:900; color:${trophy.color}; text-transform:uppercase; letter-spacing:0.05em;">
          ${trophy.icon} Conquista Desbloqueada (${trophy.label})
        </div>
        <div style="font-weight:800; color:#fff9eb; font-size:0.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${ach.name}
        </div>
        <div style="font-size:0.74rem; color:#d8c2a6;">${ach.desc}</div>
      </div>
    `;
    host.appendChild(card);

    setTimeout(() => {
      card.style.opacity = '0';
      card.style.transition = 'opacity 0.25s ease';
      setTimeout(() => {
        card.remove();
        this._drainToastQueue();
      }, 260);
    }, 3600);
  }
}

export const Achievements = new AchievementsSystem();
