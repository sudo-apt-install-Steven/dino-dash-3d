// Carregador centralizado de conteúdo data-driven (Fase 4).
import balanceData from './balance.json' with { type: 'json' };
import bossesData from './bosses.json' with { type: 'json' };
import missionsData from './missions.json' with { type: 'json' };
import seasonalEventsData from './seasonal_events.json' with { type: 'json' };

const BOSS_MAP = new Map(bossesData.map((b) => [b.id, b]));
const MISSION_MAP = new Map(missionsData.map((m) => [m.id, m]));

function isDateInRange(month, day, ev) {
  const cur = month * 100 + day;
  const start = ev.startMM * 100 + ev.startDD;
  const end = ev.endMM * 100 + ev.endDD;
  if (start <= end) {
    return cur >= start && cur <= end;
  }
  // Faixa que cruza a virada do ano (ex.: 20/12 a 05/01)
  return cur >= start || cur <= end;
}

export class ContentLoader {
  static getBalance() {
    return balanceData;
  }

  static getBossCombat() {
    return balanceData.bossCombat || {};
  }

  static getPlayerAttack() {
    return balanceData.playerAttack || {};
  }

  static getEventScheduler() {
    return balanceData.eventScheduler || {};
  }

  static getReviveConfig() {
    return balanceData.revive || {};
  }

  static getOxygenConfig() {
    return balanceData.oxygen || {};
  }

  static getBosses() {
    return bossesData;
  }

  static getBossById(id) {
    return BOSS_MAP.get(id) || null;
  }

  static getBossesByBiome(biomeId) {
    return bossesData.filter((b) => b.biomeId === biomeId);
  }

  static getMissions(scope = null) {
    if (!scope) return missionsData;
    return missionsData.filter((m) => m.scope === scope);
  }

  static getMissionById(id) {
    return MISSION_MAP.get(id) || null;
  }

  static getSeasonalEvents() {
    return seasonalEventsData;
  }

  static getActiveSeasonalEvent(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return seasonalEventsData.find((ev) => isDateInRange(month, day, ev)) || null;
  }

  static validateContent() {
    const errors = [];
    if (!balanceData?.speed || !balanceData?.rewards || !balanceData?.xp) {
      errors.push('balance.json missing required sections (speed, rewards, xp)');
    }
    const requiredBalanceSections = ['bossCombat', 'playerAttack', 'eventScheduler', 'revive', 'oxygen'];
    for (const sec of requiredBalanceSections) {
      if (!balanceData?.[sec] || typeof balanceData[sec] !== 'object') {
        errors.push(`balance.json missing required section: ${sec}`);
      }
    }
    for (const b of bossesData) {
      if (!b.id || !b.name || !b.biomeId || typeof b.hp !== 'number' || !Array.isArray(b.phases) || b.phases.length !== 3) {
        errors.push(`Invalid boss entry: ${b?.id || 'unknown'}`);
      }
    }
    for (const m of missionsData) {
      if (!m.id || !['daily', 'weekly', 'campaign'].includes(m.scope) || !m.title || typeof m.target !== 'number') {
        errors.push(`Invalid mission entry: ${m?.id || 'unknown'}`);
      }
    }
    for (const ev of seasonalEventsData) {
      if (!ev.id || !ev.name || !ev.startMM || !ev.startDD || !ev.endMM || !ev.endDD || typeof ev.bonusMult !== 'number') {
        errors.push(`Invalid seasonal event: ${ev?.id || 'unknown'}`);
      }
    }
    return { ok: errors.length === 0, errors };
  }
}
