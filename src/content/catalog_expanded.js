// Catálogo Expandido Data-Driven (Mega Expansão)
// Matriz arquétipo × variante de bioma/origem × afixo/nível.
// Todos os itens têm id único global, kind ('threat' | 'help' | 'neutral') e parâmetros mecânicos reais.
import hazardsData from './hazards_catalog.json' with { type: 'json' };
import debuffsData from './debuffs_catalog.json' with { type: 'json' };
import eventsData from './events_expanded.json' with { type: 'json' };
import helpersData from './helpers_catalog.json' with { type: 'json' };

function round2(n) {
  return Math.round(n * 100) / 100;
}

function buildHazardVariants() {
  const out = [];
  for (const arch of hazardsData.archetypes) {
    for (const bv of hazardsData.biomeVariants) {
      for (const afx of hazardsData.affixes) {
        const telegraphSec = Math.max(
          0.55,
          round2((arch.telegraphSec + (bv.telegraphDelta || 0)) * (afx.telegraphMult || 1))
        );
        const speedMult = round2((arch.speedMult || 1) * (bv.speedMult || 1) * (afx.speedMult || 1));
        const damage = Math.max(0, (arch.damage || 0) + (afx.damageBonus || 0));
        const debuffId = (afx.id === 'apex' && bv.debuffOverride) ? bv.debuffOverride : arch.debuffId;
        const debuffDuration = round2((arch.debuffDuration || 4.0) * (afx.id === 'apex' ? 1.25 : afx.id === 'overcharged' ? 1.12 : 1.0));
        out.push({
          id: `haz_${arch.id}_${bv.id}_${afx.id}`,
          kind: 'threat',
          category: 'hazard',
          name: `${arch.name} ${bv.label} (${afx.label})`,
          archetype: arch.id,
          biome: bv.id,
          affix: afx.id,
          movement: arch.movement,
          dangerTierMin: Math.max(1, (arch.dangerTierMin || 1) + (afx.tierOffset || 0)),
          telegraphSec,
          speedMult,
          damage,
          width: arch.width,
          height: arch.height,
          depth: arch.depth,
          debuffId,
          debuffDuration,
          safeCounterplay: arch.safeCounterplay,
          color: bv.colorShift || arch.color,
          accent: arch.accent || '#facc15',
          weight: round2((arch.weight || 1) * (afx.weightMult || 1))
        });
      }
    }
  }
  return out;
}

function buildDebuffVariants() {
  const out = [];
  for (const arch of debuffsData.archetypes) {
    for (const v of debuffsData.variants) {
      const baseDur = 4.5;
      const durationSec = round2(baseDur * (v.durationMult || 1));
      const multScale = v.intensityMult || 1;
      out.push({
        id: `deb_${arch.id}_${v.id}`,
        kind: 'threat',
        category: 'debuff',
        name: `${arch.name} — ${v.label}`,
        archetype: arch.id,
        icon: arch.icon,
        color: arch.color,
        dangerTierMin: v.dangerTierMin || 1,
        durationSec,
        intensityMult: multScale,
        speedMult: arch.speedMult != null ? round2(Math.max(0.55, 1 - (1 - arch.speedMult) * multScale)) : 1.0,
        laneMult: arch.laneMult != null ? round2(Math.max(0.45, 1 - (1 - arch.laneMult) * multScale)) : 1.0,
        visionMult: arch.visionMult != null ? round2(Math.max(0.32, 1 - (1 - arch.visionMult) * multScale)) : 1.0,
        gravityMult: arch.gravityMult != null ? round2(1 + (arch.gravityMult - 1) * multScale) : 1.0,
        controlsReversed: !!arch.controlsReversed,
        abilityLocked: !!arch.abilityLocked,
        staminaDrainPerSec: arch.staminaDrainPerSec ? round2(arch.staminaDrainPerSec * multScale) : 0,
        oxygenDrainPerSec: arch.oxygenDrainPerSec ? round2(arch.oxygenDrainPerSec * multScale) : 0,
        damageTakenMult: arch.damageTakenMult ? round2(1 + (arch.damageTakenMult - 1) * multScale) : 1.0,
        scoreMult: arch.scoreMult ?? 1.0,
        cooldownMult: arch.cooldownMult ? round2(1 + (arch.cooldownMult - 1) * multScale) : 1.0,
        cameraTilt: arch.cameraTilt ? round2(arch.cameraTilt * multScale) : 0,
        magnetRepel: !!arch.magnetRepel,
        stripShield: !!arch.stripShield,
        phantomHazards: !!arch.phantomHazards,
        predatorAggroBonus: arch.predatorAggroBonus ? round2(arch.predatorAggroBonus * multScale) : 0,
        counterplay: arch.counterplay,
        desc: arch.desc
      });
    }
  }
  return out;
}

function buildEventVariants() {
  const out = [];
  for (const arch of eventsData.archetypes) {
    for (const tier of eventsData.tiers) {
      out.push({
        id: `evt_${arch.id}_${tier.id}`,
        kind: 'threat',
        category: 'event',
        name: `${arch.label} (${tier.label})`,
        archetype: arch.id,
        tier: arch.tier,
        dangerTierMin: tier.dangerTierMin,
        minScore: arch.minScore || 0,
        durationSec: round2((arch.durationSec || 8) * (1 + (tier.dangerTierMin - 1) * 0.1)),
        intensityMult: tier.intensityMult,
        hazardCount: tier.hazardCount,
        warningLeadSec: tier.warningLeadSec,
        debuffId: arch.debuffId || null,
        scoreBonus: tier.scoreBonus,
        weight: arch.weight || 1.0,
        warningText: arch.warningText,
        warningColor: arch.warningColor,
        noBiomeSwap: true
      });
    }
  }
  return out;
}

function buildHelperVariants() {
  const out = [];
  for (const fam of helpersData.families) {
    for (const arch of fam.archetypes) {
      for (const tier of helpersData.tiers) {
        const bonusVal = arch.bonusVal != null ? round2(arch.bonusVal * tier.mult) : null;
        const penaltyVal = arch.penaltyVal != null ? round2(arch.penaltyVal * tier.costMult) : null;
        const costEggs = arch.costEggs != null ? Math.round(arch.costEggs * tier.costMult) : 0;
        out.push({
          id: `hlp_${fam.category}_${arch.id}_${tier.id}`,
          kind: 'help',
          category: fam.category,
          name: `${arch.name} (${tier.rarity})`,
          archetype: arch.id,
          rarity: tier.rarity,
          dangerTierMin: tier.dangerTierMin,
          bonus: arch.bonus,
          penalty: arch.penalty,
          stat: arch.stat || null,
          bonusVal,
          penaltyStat: arch.penaltyStat || null,
          penaltyVal,
          costEggs,
          cooldownSec: arch.cooldownSec || 0,
          allowedInPerfectMode: arch.allowedInPerfectMode !== false
        });
      }
    }
  }
  return out;
}

export const HAZARD_ARCHETYPES = hazardsData.archetypes;
export const DEBUFF_ARCHETYPES = debuffsData.archetypes;
export const EVENT_ARCHETYPES = eventsData.archetypes;

export const HAZARD_VARIANTS = buildHazardVariants();
export const DEBUFF_VARIANTS = buildDebuffVariants();
export const EVENT_VARIANTS = buildEventVariants();
export const HELPER_VARIANTS = buildHelperVariants();

const _threatCount = HAZARD_VARIANTS.length + DEBUFF_VARIANTS.length + EVENT_VARIANTS.length;
const _helpCount = HELPER_VARIANTS.length;
const _totalCount = _threatCount + _helpCount;

export const CATALOG_SUMMARY = {
  hazards: HAZARD_VARIANTS.length,
  debuffs: DEBUFF_VARIANTS.length,
  events: EVENT_VARIANTS.length,
  helpers: HELPER_VARIANTS.length,
  hazardArchetypes: HAZARD_ARCHETYPES.length,
  debuffArchetypes: DEBUFF_ARCHETYPES.length,
  eventArchetypes: EVENT_ARCHETYPES.length,
  threatTotal: _threatCount,
  helpTotal: _helpCount,
  total: _totalCount,
  threatRatio: round2(_threatCount / _totalCount),
  helpRatio: round2(_helpCount / _totalCount)
};

export function getHazardArchetypes() {
  return HAZARD_ARCHETYPES;
}

export function getAllExpandedEntries() {
  return [
    ...HAZARD_VARIANTS,
    ...DEBUFF_VARIANTS,
    ...EVENT_VARIANTS,
    ...HELPER_VARIANTS
  ];
}

// Mapa de prefixo de bioma -> família de variante de bioma para seleção contextual rápida
const BIOME_FAMILY_MAP = {
  desert: 'desert',
  canyon: 'desert',
  savanna: 'desert',
  ruins: 'desert',
  volcano: 'volcano',
  lava: 'volcano',
  magma: 'volcano',
  obsidian: 'volcano',
  glacier: 'glacier',
  snow: 'glacier',
  ice: 'glacier',
  tundra: 'glacier',
  jungle: 'jungle',
  swamp: 'jungle',
  forest: 'jungle',
  river: 'jungle',
  cyber: 'cyber',
  neon: 'cyber',
  space: 'cyber',
  crystal: 'cyber'
};

/**
 * Sorteia um hazard do catálogo respeitando Danger Tier e bioma atual.
 * @param {() => number} rng
 * @param {{ dangerTier?: number, biomeId?: string, allowTierAbove?: boolean }} ctx
 */
export function rollHazard(rng = Math.random, ctx = {}) {
  const rand = typeof rng === 'function' ? rng : Math.random;
  const dangerTier = Math.max(1, Math.floor(ctx?.dangerTier ?? 1));
  const rawBiome = String(ctx?.biomeId || '').toLowerCase();
  const biomeFamily = BIOME_FAMILY_MAP[rawBiome] || null;

  let totalWeight = 0;
  // Passagem 1: soma pesos sem alocar array intermediário por frame
  for (let i = 0; i < HAZARD_VARIANTS.length; i++) {
    const h = HAZARD_VARIANTS[i];
    if (h.dangerTierMin > dangerTier + 1) continue;
    let w = h.weight || 1.0;
    if (biomeFamily && h.biome === biomeFamily) w *= 1.85;
    if (h.dangerTierMin === dangerTier) w *= 1.35;
    else if (h.dangerTierMin > dangerTier) w *= 0.35;
    totalWeight += w;
  }

  if (totalWeight <= 0) {
    return HAZARD_VARIANTS[Math.floor(rand() * HAZARD_VARIANTS.length)];
  }

  let r = rand() * totalWeight;
  for (let i = 0; i < HAZARD_VARIANTS.length; i++) {
    const h = HAZARD_VARIANTS[i];
    if (h.dangerTierMin > dangerTier + 1) continue;
    let w = h.weight || 1.0;
    if (biomeFamily && h.biome === biomeFamily) w *= 1.85;
    if (h.dangerTierMin === dangerTier) w *= 1.35;
    else if (h.dangerTierMin > dangerTier) w *= 0.35;
    r -= w;
    if (r <= 0) return h;
  }
  return HAZARD_VARIANTS[0];
}
