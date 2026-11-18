// Metajogo Avançado (Ideias 131–140): Prestígio (Rebirth), Árvore de Talentos Global,
// Mapa-Múndi de Campanha com Rotas Alternativas, Sazonalidade, Times Locais, Desafios Semanais,
// Editor de Pistas (exportar/importar seed/JSON) e Estatísticas com gráficos.
import { Save } from './Save.js';
import { ContentLoader } from '../content/ContentLoader.js';

export const TALENT_DEFS = [
  { id: 'speed', name: 'Pés Ligeiros', icon: '⚡', maxLevel: 5, costBase: 150, desc: '+5% velocidade & distância inicial por nível' },
  { id: 'magnet', name: 'Campo Magnético', icon: '🧲', maxLevel: 5, costBase: 150, desc: '+15% duração e alcance de ímã por nível' },
  { id: 'vitality', name: 'Casco Ancestral', icon: '❤️', maxLevel: 3, costBase: 220, desc: '+1 coração máximo permanente a cada 2 níveis' },
  { id: 'alchemy', name: 'Reator Elemental', icon: '⚗️', maxLevel: 5, costBase: 150, desc: '+20% dano/área de reações elementais por nível' },
  { id: 'greed', name: 'Caçador de Fósseis', icon: '🥚', maxLevel: 5, costBase: 180, desc: '+10% chance de ovos extras & tesouros por nível' }
];

export const CAMPAIGN_NODES = ContentLoader.getMissions('campaign').map((m) => ({
  id: m.id,
  title: m.title,
  biome: m.biome,
  targetScore: m.target,
  x: m.x,
  y: m.y,
  next: m.next || [],
  reward: m.rewardEggs
}));

export const WEEKLY_CHALLENGES = ContentLoader.getMissions('weekly').map((m) => ({
  id: m.id,
  title: m.title,
  desc: m.desc || m.title,
  goal: m.target,
  metric: m.metric,
  reward: m.rewardEggs
}));

export class Metagame {
  static getPrestigeMultiplier() {
    const step = ContentLoader.getBalance().rewards?.prestigeStepMult ?? 0.25;
    return 1 + (Save.data.prestige?.level || 0) * step;
  }

  static getRebirthReqScore() {
    return 1500 * ((Save.data.prestige?.level || 0) + 1);
  }

  static canRebirth() {
    return (Save.data.highScore || 0) >= this.getRebirthReqScore();
  }

  static doRebirth() {
    if (!this.canRebirth()) {
      return { ok: false, reason: `Alcance ${this.getRebirthReqScore()}+ pts de Recorde (HI) para o próximo Prestígio.` };
    }
    const step = ContentLoader.getBalance().rewards?.prestigeStepMult ?? 0.25;
    const p = Save.data.prestige || { level: 0, bonusMult: 1.0 };
    p.level += 1;
    p.bonusMult = Number((1 + p.level * step).toFixed(2));
    Save.data.prestige = p;
    Save.data.dinoLevels = {};
    Save.data.eggs = 150 + Math.min(250, p.level * 50);
    Save.data.crystals = (Save.data.crystals || 0) + 3;
    if (!Save.data.unlockedTitles.includes(`Prestígio ${p.level}★`)) {
      Save.data.unlockedTitles.push(`Prestígio ${p.level}★`);
    }
    Save.save();
    return { ok: true, level: p.level, bonusMult: p.bonusMult };
  }

  static getTalentCost(def, cur) {
    return Math.round(def.costBase * Math.pow(1.4, cur));
  }

  static upgradeTalent(talentId) {
    const def = TALENT_DEFS.find((t) => t.id === talentId);
    if (!def) return { ok: false, reason: 'Talento inválido.' };
    const cur = Save.data.talents[talentId] || 0;
    if (cur >= def.maxLevel) return { ok: false, reason: 'Nível máximo atingido!' };
    const cost = this.getTalentCost(def, cur);
    if ((Save.data.eggs || 0) < cost) return { ok: false, reason: `Precisa de ${cost} ovos.` };
    Save.addEggs(-cost);
    Save.data.talents[talentId] = cur + 1;
    Save.save();
    return { ok: true, level: cur + 1 };
  }

  static getActiveSeason(date = new Date()) {
    const pref = Save.data.season || 'auto';
    if (pref !== 'auto') return pref;
    const ev = ContentLoader.getActiveSeasonalEvent(date);
    return ev ? ev.id : 'none';
  }

  static getActiveSeasonInfo(date = new Date()) {
    const id = this.getActiveSeason(date);
    if (!id || id === 'none') {
      return { id: 'none', name: 'Temporada Padrão', accent: '#38bdf8', bonusMult: 1.0, active: false };
    }
    const ev = ContentLoader.getSeasonalEvents().find((e) => e.id === id);
    return ev
      ? { ...ev, active: true }
      : { id, name: id, accent: '#ffd447', bonusMult: 1.15, active: true };
  }

  static getSeasonBonusMultiplier(date = new Date()) {
    return this.getActiveSeasonInfo(date).bonusMult || 1.0;
  }

  static getMissionsCatalog(scope = null) {
    return ContentLoader.getMissions(scope);
  }

  static getCampaignProgress() {
    const completed = Save.data.campaign?.completedNodes || [];
    const total = CAMPAIGN_NODES.length;
    const unlockedNextIds = new Set(['desert_start']);
    for (const node of CAMPAIGN_NODES) {
      if (completed.includes(node.id)) {
        for (const nxt of node.next || []) unlockedNextIds.add(nxt);
      }
    }
    return { completedCount: completed.length, total, unlockedNextIds: [...unlockedNextIds] };
  }

  static getCurrentWeekId() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  }

  static ensureWeekly() {
    const wk = this.getCurrentWeekId();
    if (Save.data.weekly?.weekId !== wk) {
      Save.data.weekly = { weekId: wk, progress: 0, claimed: false };
      Save.save();
    }
    const idx = wk.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % WEEKLY_CHALLENGES.length;
    return { def: WEEKLY_CHALLENGES[idx], state: Save.data.weekly };
  }

  static updateStatsAndWeekly({ score = 0, distance = 0, eggs = 0, deathCause = null }) {
    const st = Save.data.stats;
    st.runs = (st.runs || 0) + 1;
    st.totalDist = (st.totalDist || 0) + Math.floor(distance);
    st.totalEggs = (st.totalEggs || 0) + Math.floor(eggs);
    if (deathCause) {
      st.deathsBy[deathCause] = (st.deathsBy[deathCause] || 0) + 1;
    }

    const { def, state } = this.ensureWeekly();
    if (!state.claimed) {
      if (def.id === 'wk_no_damage') state.progress = Math.max(state.progress, Math.floor(score));
      else if (def.id === 'wk_collectors') state.progress += Math.floor(eggs);
      else state.progress += Math.floor(distance);

      if (state.progress >= def.goal) {
        state.claimed = true;
        Save.addEggs(def.reward);
      }
    }
    Save.save();
  }

  static recordSkill(skillId) {
    if (!skillId) return;
    Save.data.stats.skillsUsed[skillId] = (Save.data.stats.skillsUsed[skillId] || 0) + 1;
  }

  static saveCustomTrack(track) {
    const item = {
      id: track.id || `trk_${Date.now().toString(36)}`,
      name: String(track.name || 'Pista Personalizada').slice(0, 28),
      biome: track.biome || 'desert',
      gravityScale: Number(track.gravityScale || 1.0),
      obstacleRate: Number(track.obstacleRate || 1.0),
      eggBonus: Number(track.eggBonus || 1.0),
      seed: track.seed || `CUST-${Math.floor(Math.random() * 9999)}`
    };
    const existingIdx = Save.data.customTracks.findIndex((t) => t.id === item.id);
    if (existingIdx >= 0) Save.data.customTracks[existingIdx] = item;
    else Save.data.customTracks.push(item);
    Save.data.activeCustomTrackId = item.id;
    Save.save();
    return item;
  }

  static importTrackJson(rawStr) {
    try {
      const parsed = JSON.parse(rawStr);
      if (!parsed || !parsed.biome) return { ok: false, reason: 'JSON de pista inválido.' };
      const saved = this.saveCustomTrack({ ...parsed, id: null });
      return { ok: true, track: saved };
    } catch {
      return { ok: false, reason: 'Erro ao ler JSON.' };
    }
  }
}
