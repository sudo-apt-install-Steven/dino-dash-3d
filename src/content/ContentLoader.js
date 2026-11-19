// Carregador centralizado de conteúdo data-driven (Fase 4 + Mega Expansão).
import balanceData from './balance.json' with { type: 'json' };
import bossesData from './bosses.json' with { type: 'json' };
import missionsData from './missions.json' with { type: 'json' };
import seasonalEventsData from './seasonal_events.json' with { type: 'json' };
import {
  HAZARD_VARIANTS,
  DEBUFF_VARIANTS,
  EVENT_VARIANTS,
  HELPER_VARIANTS,
  CATALOG_SUMMARY,
  getAllExpandedEntries
} from './catalog_expanded.js';

const BOSS_MAP = new Map(bossesData.map((b) => [b.id, b]));
const MISSION_MAP = new Map(missionsData.map((m) => [m.id, m]));
const VALID_KINDS = new Set(['threat', 'help', 'neutral']);

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

  static getDangerTierConfig() {
    return balanceData.dangerTier || {};
  }

  static getDebuffsConfig() {
    return balanceData.debuffs || {};
  }

  static getHazardsConfig() {
    return balanceData.hazards || {};
  }

  static getHelpersConfig() {
    return balanceData.helpers || {};
  }

  static getExpandedCatalog() {
    return {
      HAZARD_VARIANTS,
      DEBUFF_VARIANTS,
      EVENT_VARIANTS,
      HELPER_VARIANTS,
      summary: CATALOG_SUMMARY
    };
  }

  static getBosses() {
    return bossesData;
  }

  static getBossById(id) {
    return BOSS_MAP.get(id) || bossesData[0] || null;
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
    const month = date.getMonth() + 1;
    const day = date.getDate();
    for (const ev of seasonalEventsData) {
      if (isDateInRange(month, day, ev)) return ev;
    }
    return null;
  }

  static validateContent() {
    const errors = [];
    if (!balanceData?.speed || !balanceData?.rewards || !balanceData?.xp) {
      errors.push('balance.json missing required sections (speed/rewards/xp)');
    }
    if (!balanceData?.dangerTier || !balanceData?.debuffs || !balanceData?.hazards || !balanceData?.helpers) {
      errors.push('balance.json missing expansion sections (dangerTier/debuffs/hazards/helpers)');
    }
    if (!Array.isArray(bossesData) || bossesData.length < 14) {
      errors.push('bosses.json must contain at least 14 bosses');
    }
    if (!Array.isArray(missionsData) || missionsData.length < 10) {
      errors.push('missions.json must contain at least 10 missions');
    }
    if (!Array.isArray(seasonalEventsData) || seasonalEventsData.length < 4) {
      errors.push('seasonal_events.json must contain at least 4 seasonal events');
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

    // Validação do catálogo expandido (ids únicos, kind válido, metas mínimas e razão threat/help)
    if (HAZARD_VARIANTS.length < 320) {
      errors.push(`HAZARD_VARIANTS count (${HAZARD_VARIANTS.length}) < 320`);
    }
    if (DEBUFF_VARIANTS.length < 120) {
      errors.push(`DEBUFF_VARIANTS count (${DEBUFF_VARIANTS.length}) < 120`);
    }
    if (EVENT_VARIANTS.length < 120) {
      errors.push(`EVENT_VARIANTS count (${EVENT_VARIANTS.length}) < 120`);
    }
    if (HELPER_VARIANTS.length < 120) {
      errors.push(`HELPER_VARIANTS count (${HELPER_VARIANTS.length}) < 120`);
    }

    const seenIds = new Set();
    const groups = [
      { label: 'HAZARD_VARIANTS', list: HAZARD_VARIANTS, expectedKind: 'threat' },
      { label: 'DEBUFF_VARIANTS', list: DEBUFF_VARIANTS, expectedKind: 'threat' },
      { label: 'EVENT_VARIANTS', list: EVENT_VARIANTS, expectedKind: 'threat' },
      { label: 'HELPER_VARIANTS', list: HELPER_VARIANTS, expectedKind: 'help' }
    ];
    for (const g of groups) {
      for (const item of g.list) {
        if (!item || typeof item.id !== 'string' || !item.id.trim()) {
          errors.push(`${g.label}: entry missing valid id`);
          continue;
        }
        if (seenIds.has(item.id)) {
          errors.push(`Duplicate catalog id: ${item.id}`);
        } else {
          seenIds.add(item.id);
        }
        if (!VALID_KINDS.has(item.kind) || item.kind !== g.expectedKind) {
          errors.push(`Invalid kind for ${item.id}: expected ${g.expectedKind}, got ${item.kind}`);
        }
        if (!item.name || !item.category) {
          errors.push(`Catalog entry missing name or category: ${item.id}`);
        }
      }
    }

    const allEntries = getAllExpandedEntries();
    const helpCount = allEntries.filter((e) => e.kind === 'help').length;
    const maxHelpRatio = balanceData?.helpers?.maxHelpCatalogRatio ?? 0.30;
    if (allEntries.length > 0 && helpCount / allEntries.length >= maxHelpRatio) {
      errors.push(`Help ratio (${(helpCount / allEntries.length).toFixed(3)}) must be < ${maxHelpRatio}`);
    }

    return { ok: errors.length === 0, errors };
  }
}
