// Metajogo Avançado (Ideias 131–140): Prestígio (Rebirth), Árvore de Talentos Global,
// Mapa-Múndi de Campanha com Rotas Alternativas, Sazonalidade, Times Locais, Desafios Semanais,
// Editor de Pistas (exportar/importar seed/JSON) e Estatísticas com gráficos.
import { Save } from './Save.js';

export const TALENT_DEFS = [
  { id: 'speed', name: 'Pés Ligeiros', icon: '⚡', maxLevel: 5, costBase: 18, desc: '+5% velocidade & distância inicial por nível' },
  { id: 'magnet', name: 'Campo Magnético', icon: '🧲', maxLevel: 5, costBase: 16, desc: '+15% duração e alcance de ímã por nível' },
  { id: 'vitality', name: 'Casco Ancestral', icon: '❤️', maxLevel: 3, costBase: 30, desc: '+1 coração máximo permanente a cada 2 níveis' },
  { id: 'alchemy', name: 'Reator Elemental', icon: '⚗️', maxLevel: 5, costBase: 22, desc: '+20% dano/área de reações elementais por nível' },
  { id: 'greed', name: 'Caçador de Fósseis', icon: '🥚', maxLevel: 5, costBase: 20, desc: '+15% chance de ovos extras & tesouros por nível' }
];

export const CAMPAIGN_NODES = [
  { id: 'desert_start', title: 'Vale Dourado', biome: 'desert', targetScore: 350, x: 14, y: 50, next: ['oasis_route', 'canyon_route'], reward: 15 },
  { id: 'oasis_route', title: 'Rota do Oásis', biome: 'river', targetScore: 650, x: 38, y: 28, next: ['ice_peaks', 'temple_secret'], reward: 22 },
  { id: 'canyon_route', title: 'Caldeira Vulcânica', biome: 'volcano', targetScore: 700, x: 38, y: 74, next: ['magma_boss', 'ice_peaks'], reward: 25 },
  { id: 'ice_peaks', title: 'Picos Glaciais', biome: 'ice', targetScore: 1000, x: 64, y: 36, next: ['final_sanctuary'], reward: 30 },
  { id: 'temple_secret', title: 'Templo Submerso', biome: 'ocean_abyss', targetScore: 1050, x: 64, y: 14, next: ['final_sanctuary'], reward: 35 },
  { id: 'magma_boss', title: 'Cidadela do Alfa', biome: 'cyber_city', targetScore: 1150, x: 64, y: 76, next: ['final_sanctuary'], reward: 40 },
  { id: 'final_sanctuary', title: 'Santuário Estelar', biome: 'alien_planet', targetScore: 1500, x: 88, y: 48, next: [], reward: 80 }
];

export const WEEKLY_CHALLENGES = [
  { id: 'wk_no_damage', title: 'Intocável da Semana', desc: 'Alcance 800 pts esta semana em uma corrida.', goal: 800, reward: 65 },
  { id: 'wk_collectors', title: 'Grande Colecionador', desc: 'Colete 60 ovos acumulados na semana.', goal: 60, reward: 55 },
  { id: 'wk_elements', title: 'Alquimista Jurássico', desc: 'Percorra 1800m acumulados na semana.', goal: 1800, reward: 60 }
];

export class Metagame {
  static getPrestigeMultiplier() {
    return 1 + (Save.data.prestige?.level || 0) * 0.25;
  }

  static canRebirth() {
    return (Save.data.highScore || 0) >= 1200 || Object.keys(Save.data.dinoLevels || {}).length >= 2;
  }

  static doRebirth() {
    if (!this.canRebirth()) {
      return { ok: false, reason: 'Alcance 1200+ pts em uma corrida para fazer Prestígio (Rebirth).' };
    }
    const p = Save.data.prestige || { level: 0, bonusMult: 1.0 };
    p.level += 1;
    p.bonusMult = Number((1 + p.level * 0.25).toFixed(2));
    Save.data.prestige = p;
    Save.data.dinoLevels = {};
    Save.data.eggs = 30 + p.level * 15;
    if (!Save.data.unlockedTitles.includes(`Prestígio ${p.level}★`)) {
      Save.data.unlockedTitles.push(`Prestígio ${p.level}★`);
    }
    Save.save();
    return { ok: true, level: p.level, bonusMult: p.bonusMult };
  }

  static upgradeTalent(talentId) {
    const def = TALENT_DEFS.find((t) => t.id === talentId);
    if (!def) return { ok: false, reason: 'Talento inválido.' };
    const cur = Save.data.talents[talentId] || 0;
    if (cur >= def.maxLevel) return { ok: false, reason: 'Nível máximo atingido!' };
    const cost = def.costBase * (cur + 1);
    if ((Save.data.eggs || 0) < cost) return { ok: false, reason: `Precisa de ${cost} ovos.` };
    Save.addEggs(-cost);
    Save.data.talents[talentId] = cur + 1;
    Save.save();
    return { ok: true, level: cur + 1 };
  }

  static getActiveSeason() {
    const pref = Save.data.season || 'auto';
    if (pref !== 'auto') return pref;
    const m = new Date().getMonth() + 1;
    const d = new Date().getDate();
    if (m === 10) return 'halloween';
    if (m === 12) return 'xmas';
    if (m === 11 && d <= 20) return 'birthday';
    return 'none';
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
