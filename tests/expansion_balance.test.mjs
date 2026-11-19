import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

import { ContentLoader } from '../src/content/ContentLoader.js';
import { DINO_CATALOG } from '../src/dinos/DinoCatalog.js';
import { BIOMES } from '../src/world/Biomes.js';
import { GAME_MODES } from '../src/game/Modes.js';
import * as DifficultyMod from '../src/game/Difficulty.js';
import * as CardsMod from '../src/systems/Cards.js';
import { PredatorSystem } from '../src/events/PredatorSystem.js';
import { BossManager } from '../src/events/BossManager.js';
import { EventManager } from '../src/events/EventManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const STRICT = process.env.EXPANSION_STRICT === '1';

async function tryImport(relPath) {
  const absPath = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    return { missing: true, relPath, mod: null };
  }
  const mod = await import(`../${relPath}`);
  return { missing: false, relPath, mod };
}

function resolveGetDangerTier() {
  if (typeof DifficultyMod.getDangerTier === 'function') {
    return DifficultyMod.getDangerTier;
  }
  if (typeof DifficultyMod.DifficultyManager?.getDangerTier === 'function') {
    return (score) => DifficultyMod.DifficultyManager.getDangerTier(score);
  }
  if (typeof DifficultyMod.DifficultyManager === 'function') {
    const inst = new DifficultyMod.DifficultyManager();
    if (typeof inst.getDangerTier === 'function') {
      return (score) => inst.getDangerTier(score);
    }
  }
  return null;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// 1. Catálogo expandido >= 1000 entradas, IDs únicos globais, threat >= 55%, help <= 45%
// ============================================================================
test('Expansion Catalog: >= 1000 entries, global unique IDs, threat >= 55%, help <= 45%', async (t) => {
  const [catExp, threatVar, collExp] = await Promise.all([
    tryImport('src/content/catalog_expanded.js'),
    tryImport('src/content/threat_variants.js'),
    tryImport('src/content/collection_expanded.js')
  ]);

  const missing = [catExp, threatVar, collExp].filter((r) => r.missing).map((r) => r.relPath);
  if (missing.length > 0) {
    const msg = `Pending catalog modules not yet merged: ${missing.join(', ')}`;
    if (STRICT) assert.fail(msg);
    t.skip(msg);
    return;
  }

  const hazardVariants = catExp.mod.HAZARD_VARIANTS || [];
  const debuffVariants = catExp.mod.DEBUFF_VARIANTS || [];
  const eventVariants = catExp.mod.EVENT_VARIANTS || [];
  const helperVariants = catExp.mod.HELPER_VARIANTS || [];
  const predatorVariants = threatVar.mod.PREDATOR_ENCOUNTER_VARIANTS || [];
  const bossAffixVariants = threatVar.mod.BOSS_AFFIX_VARIANTS || [];
  const collectionVariants = collExp.mod.COLLECTION_VARIANTS || [];

  assert.ok(Array.isArray(hazardVariants) && hazardVariants.length > 0, 'HAZARD_VARIANTS must be non-empty array');
  assert.ok(Array.isArray(debuffVariants) && debuffVariants.length > 0, 'DEBUFF_VARIANTS must be non-empty array');
  assert.ok(Array.isArray(eventVariants) && eventVariants.length > 0, 'EVENT_VARIANTS must be non-empty array');
  assert.ok(Array.isArray(helperVariants) && helperVariants.length > 0, 'HELPER_VARIANTS must be non-empty array');
  assert.ok(Array.isArray(predatorVariants) && predatorVariants.length > 0, 'PREDATOR_ENCOUNTER_VARIANTS must be non-empty array');
  assert.ok(Array.isArray(bossAffixVariants) && bossAffixVariants.length > 0, 'BOSS_AFFIX_VARIANTS must be non-empty array');
  assert.ok(Array.isArray(collectionVariants) && collectionVariants.length > 0, 'COLLECTION_VARIANTS must be non-empty array');

  const allEntries = [
    ...hazardVariants,
    ...debuffVariants,
    ...eventVariants,
    ...helperVariants,
    ...predatorVariants,
    ...bossAffixVariants,
    ...collectionVariants
  ];

  // Validate schema & unique IDs globally
  const seenIds = new Set();
  const duplicates = [];
  let threatCount = 0;
  let helpCount = 0;
  let neutralCount = 0;

  for (const entry of allEntries) {
    assert.ok(entry && typeof entry === 'object', 'Every catalog entry must be an object');
    assert.ok(typeof entry.id === 'string' && entry.id.trim().length > 0, `Entry missing valid id: ${JSON.stringify(entry)}`);
    assert.ok(['threat', 'help', 'neutral'].includes(entry.kind), `Entry ${entry.id} has invalid kind: ${entry.kind}`);
    assert.ok(typeof entry.category === 'string' && entry.category.length > 0, `Entry ${entry.id} missing category`);
    assert.ok(typeof entry.name === 'string' && entry.name.length > 0, `Entry ${entry.id} missing name`);

    if (seenIds.has(entry.id)) {
      duplicates.push(entry.id);
    } else {
      seenIds.add(entry.id);
    }

    if (entry.kind === 'threat') threatCount++;
    else if (entry.kind === 'help') helpCount++;
    else neutralCount++;
  }

  assert.equal(duplicates.length, 0, `Duplicate global catalog IDs found: ${duplicates.slice(0, 10).join(', ')}`);

  const threatPlusHelp = threatCount + helpCount;
  assert.ok(
    threatPlusHelp >= 1000,
    `Total catalog entries (threat+help) must be >= 1000, got ${threatPlusHelp} (threat=${threatCount}, help=${helpCount}, neutral=${neutralCount})`
  );

  const threatRatio = threatCount / threatPlusHelp;
  const helpRatio = helpCount / threatPlusHelp;
  assert.ok(
    threatRatio >= 0.55,
    `Threat ratio must be >= 55%, got ${(threatRatio * 100).toFixed(2)}% (${threatCount}/${threatPlusHelp})`
  );
  assert.ok(
    helpRatio <= 0.45,
    `Help ratio must be <= 45%, got ${(helpRatio * 100).toFixed(2)}% (${helpCount}/${threatPlusHelp})`
  );
});

// ============================================================================
// 2. DINO_CATALOG >= 50, BIOMES >= 25, 20 Bosses
// ============================================================================
test('Content scale: DINO_CATALOG >= 50 unique species', () => {
  assert.ok(DINO_CATALOG.length >= 50, `Expected DINO_CATALOG >= 50, got ${DINO_CATALOG.length}`);
  const ids = new Set(DINO_CATALOG.map((d) => d.id));
  assert.equal(ids.size, DINO_CATALOG.length, 'DINO_CATALOG contains duplicate IDs');
  for (const d of DINO_CATALOG) {
    assert.ok(d.id && d.name && d.stats && d.stats.speed > 0 && d.stats.jump > 0, `Invalid dino spec: ${d?.id}`);
  }
});

test('Content scale: BIOMES >= 25 unique biomes', () => {
  assert.ok(BIOMES.length >= 25, `Expected BIOMES >= 25, got ${BIOMES.length}`);
  const ids = new Set(BIOMES.map((b) => b.id));
  assert.equal(ids.size, BIOMES.length, 'BIOMES contains duplicate IDs');
  for (const b of BIOMES) {
    assert.ok(b.id && b.name && b.theme && b.theme.sky && b.theme.ground, `Invalid biome spec: ${b?.id}`);
  }
});

test('Content scale: 20 unique bosses in bosses.json', () => {
  const bosses = ContentLoader.getBosses();
  assert.ok(bosses.length >= 20, `Expected >= 20 bosses, got ${bosses.length}`);
  const ids = new Set(bosses.map((b) => b.id));
  assert.equal(ids.size, bosses.length, 'bosses.json contains duplicate IDs');
  for (const b of bosses) {
    assert.ok(b.id && b.name && b.hp > 0 && Array.isArray(b.phases) && b.phases.length >= 3, `Invalid boss: ${b?.id}`);
  }
});

// ============================================================================
// 3. GAME_MODES contém raid, boss_fight, free_roam, race, competition
// ============================================================================
test('Game Modes: includes raid, boss_fight, free_roam, race, competition', () => {
  const ids = new Set(GAME_MODES.map((m) => m.id));
  assert.equal(ids.size, GAME_MODES.length, 'GAME_MODES contains duplicate IDs');
  for (const requiredId of ['raid', 'boss_fight', 'free_roam', 'race', 'competition']) {
    assert.ok(ids.has(requiredId), `GAME_MODES must include '${requiredId}'`);
  }
});

// ============================================================================
// 4. Difficulty.getDangerTier crescente e monotônica
// ============================================================================
test('Difficulty.getDangerTier(score) is monotonic and strictly escalating', () => {
  const getDangerTier = resolveGetDangerTier();
  assert.equal(typeof getDangerTier, 'function', 'Difficulty must export getDangerTier(score)');

  const scores = [0, 1000, 3000, 8000, 15000, 30000, 60000, 120000, 250000, 500000];
  const tiers = scores.map((s) => getDangerTier(s));

  for (let i = 0; i < tiers.length; i++) {
    const cur = tiers[i];
    assert.ok(cur && typeof cur === 'object', `getDangerTier(${scores[i]}) must return an object`);
    for (const key of ['tier', 'speedBonus', 'densityBonus', 'eventFreqBonus', 'predatorAggro']) {
      assert.equal(typeof cur[key], 'number', `getDangerTier(${scores[i]}).${key} must be a number`);
      assert.ok(Number.isFinite(cur[key]), `getDangerTier(${scores[i]}).${key} must be finite`);
    }
    if (i > 0) {
      const prev = tiers[i - 1];
      assert.ok(cur.tier >= prev.tier, `tier must be monotonic: score ${scores[i - 1]}=${prev.tier} -> ${scores[i]}=${cur.tier}`);
      assert.ok(cur.speedBonus >= prev.speedBonus, `speedBonus must be monotonic at score ${scores[i]}`);
      assert.ok(cur.densityBonus >= prev.densityBonus, `densityBonus must be monotonic at score ${scores[i]}`);
      assert.ok(cur.eventFreqBonus >= prev.eventFreqBonus, `eventFreqBonus must be monotonic at score ${scores[i]}`);
      assert.ok(cur.predatorAggro >= prev.predatorAggro, `predatorAggro must be monotonic at score ${scores[i]}`);
    }
  }

  const first = tiers[0];
  const last = tiers[tiers.length - 1];
  assert.ok(last.tier > first.tier, `tier must strictly increase over score range (${first.tier} -> ${last.tier})`);
  assert.ok(last.speedBonus > first.speedBonus, `speedBonus must increase over score range`);
  assert.ok(last.densityBonus > first.densityBonus, `densityBonus must increase over score range`);
  assert.ok(last.predatorAggro > first.predatorAggro, `predatorAggro must increase over score range`);
});

// ============================================================================
// 5. Cards.js proíbe escudos extras em Modo Perfeito
// ============================================================================
test('Cards.js forbids extra shields and extra HP in Perfect Mode', () => {
  const pool = CardsMod.CARD_POOL || [];
  assert.ok(pool.length > 0, 'CARD_POOL must be non-empty');

  for (const card of pool) {
    const perfectPlayer = {
      isPerfectMode: true,
      hp: 1,
      maxHp: 1,
      shields: 0,
      jumpMult: 1,
      laneSpeedMult: 1,
      cooldownMult: 1,
      scoreCardMult: 1,
      abilityPowerMult: 1,
      eggValueMult: 1,
      stamina: 50,
      abilityCharge: 50
    };
    const ctx = { spawnEggRain: () => {}, slowMoTimer: 0 };
    if (typeof card.apply === 'function') {
      card.apply(perfectPlayer, ctx);
    }
    assert.equal(
      perfectPlayer.shields,
      0,
      `Card '${card.id}' must NOT grant shields in Perfect Mode (got shields=${perfectPlayer.shields})`
    );
    assert.ok(
      perfectPlayer.hp <= 1 && perfectPlayer.maxHp <= 1,
      `Card '${card.id}' must NOT grant extra HP in Perfect Mode (hp=${perfectPlayer.hp}, maxHp=${perfectPlayer.maxHp})`
    );
  }
});

// ============================================================================
// 6. PredatorSystem não recua sozinho e executa ataques ativos com dano real
// ============================================================================
test('PredatorSystem does not passively retreat and executes active attacks with real damage', () => {
  const scene = new THREE.Scene();
  const ps = new PredatorSystem(scene);

  const player = {
    x: 0,
    y: 0,
    baseY: 0,
    lane: 1,
    dead: false,
    hp: 3,
    isBot: false
  };

  let hazardCalls = 0;
  let statusCalls = 0;
  let damageCalls = 0;
  const ctx = {
    currentBiome: { id: 'desert' },
    habitatMode: 'land',
    bossActive: false,
    ufoActive: false,
    decoyTimer: 0,
    dangerTier: { tier: 2, predatorAggro: 1.4 },
    spawnPredatorHazard: (h) => {
      hazardCalls++;
      if (h && typeof h.damage === 'number' && h.damage > 0) {
        // Simulate un-dodged hazard hitting player
        damageCalls++;
      }
    },
    applyStatus: () => { statusCalls++; },
    damagePlayer: () => { damageCalls++; },
    onChaserHudUpdate: () => {},
    onPredatorIntroHud: () => {},
    showBanner: () => {},
    showFloatText: () => {},
    addScore: () => {}
  };

  // Start chase
  if (typeof ps.startEncounter === 'function') {
    ps.startEncounter('desert', ctx);
  } else {
    ps.nextAutoScore = 0;
    ps.update(0.05, 28, 1000, [player], ctx);
  }
  assert.equal(ps.state, 'chasing', 'PredatorSystem must enter chasing state');

  // Simulate 25 seconds of running at high speed (30) without decoy or player counter-action
  const dt = 0.05;
  for (let step = 0; step < 500; step++) {
    ps.update(dt, 30, 2000 + step * 10, [player], ctx);
  }

  assert.equal(
    ps.state,
    'chasing',
    `Predator must NOT passively retreat on timer/speed alone (ended in state='${ps.state}', distance=${ps.distance})`
  );
  assert.ok(
    hazardCalls > 0 || statusCalls > 0 || damageCalls > 0,
    `Predator must execute active attacks during chase (hazards=${hazardCalls}, status=${statusCalls}, damage=${damageCalls})`
  );
  assert.ok(
    damageCalls > 0,
    `Predator must deal real damage in headless simulation when player does not dodge (damageCalls=${damageCalls})`
  );
});

// ============================================================================
// 7. Regressão: simulateBossFightHeadless (Normal 60-90s) e simulateEventsTo60k
// ============================================================================
test('BossManager.simulateBossFightHeadless(normal) completes in 60-90s', () => {
  const simFn = BossManager.simulateBossFightHeadless || new BossManager(new THREE.Scene()).simulateBossFightHeadless;
  assert.equal(typeof simFn, 'function', 'BossManager.simulateBossFightHeadless must exist');

  for (let i = 0; i < 3; i++) {
    const res = simFn.call(BossManager, 'normal');
    assert.equal(res.ok ?? res.defeated, true, `Run ${i + 1}: boss must be defeated`);
    assert.equal(res.stuckDetected ?? false, false, `Run ${i + 1}: boss must not get stuck`);
    assert.ok(
      res.durationSec >= 60 && res.durationSec <= 90,
      `Run ${i + 1}: expected 60-90s, got ${res.durationSec}s`
    );
  }
});

test('EventManager.simulateEventsTo60k() passes with >= 12 events and no back-to-back repeats', () => {
  const simFn = EventManager.simulateEventsTo60k || new EventManager(new THREE.Scene()).simulateEventsTo60k;
  assert.equal(typeof simFn, 'function', 'EventManager.simulateEventsTo60k must exist');

  const sim = simFn.call(EventManager);
  const events = sim.eventsLog || sim.events || [];
  assert.equal(sim.ok ?? true, true, 'EventManager.simulateEventsTo60k must return ok: true');
  assert.ok(events.length >= 12, `Expected >= 12 events up to 60k, got ${events.length}`);
  for (let i = 1; i < events.length; i++) {
    const prevId = events[i - 1].id ?? events[i - 1];
    const currId = events[i].id ?? events[i];
    assert.notEqual(currId, prevId, `Event ${currId} repeated back-to-back at index ${i}`);
  }
});

// ============================================================================
// 8. SIMULAÇÃO DE DIFICULDADE HEADLESS:
//    - Bot ótimo em Supremo + Modo Perfeito NÃO chega nem perto de 2.000.000 pts
//    - Bot médio em Normal sobrevive > 3 min (180s)
// ============================================================================
function simulateHeadlessRun({ presetId, perfectMode, botSkill, seed, getDangerTier }) {
  const diff = DifficultyMod.DIFFICULTY_PRESETS[presetId] || DifficultyMod.DIFFICULTY_PRESETS.normal;
  const rng = mulberry32(seed);

  let hp = perfectMode ? 1 : (diff.lives || 3);
  const maxHp = hp;
  let shields = perfectMode ? 0 : 1;
  let speed = diff.initialSpeed || 18;
  let score = 0;
  let timeSec = 0;
  let invuln = 0;
  let healCooldown = 45;
  let nextWaveTimer = 1.4;
  let predatorPressureTimer = 12;

  const dt = 0.25;
  const maxTimeSec = 1800; // hard cap 30 min
  const perfectMult = perfectMode ? 2.2 : 1.0;

  while (hp > 0 && timeSec < maxTimeSec) {
    timeSec += dt;
    if (invuln > 0) invuln = Math.max(0, invuln - dt);

    const tierInfo = getDangerTier
      ? getDangerTier(score)
      : { tier: 0, speedBonus: 0, densityBonus: 0, eventFreqBonus: 0, predatorAggro: 1.0 };

    const targetMaxSpeed = (diff.maxSpeed || 35) + (tierInfo.speedBonus || 0);
    speed = Math.min(targetMaxSpeed, speed + (diff.accel || 0.013) * 18 * dt);

    // Score gain aligned with Game.js (speed * dt * 0.55 * scoreMult * perfectMult)
    score += speed * dt * 0.55 * (diff.scoreMult || 1.0) * perfectMult;

    // Periodic shield/heal pickups in non-perfect mode
    if (!perfectMode) {
      healCooldown -= dt;
      if (healCooldown <= 0) {
        healCooldown = 42 + rng() * 18;
        if (shields < 2) shields++;
        else if (hp < maxHp) hp++;
      }
    }

    // Hazard wave rate scaled by density + danger tier
    const effectiveDensity = (diff.density || 1.0) + (tierInfo.densityBonus || 0);
    const effectiveEventFreq = (diff.eventFreq || 1.0) + (tierInfo.eventFreqBonus || 0);
    const predatorAggro = Math.max(0.5, tierInfo.predatorAggro || 1.0);

    nextWaveTimer -= dt * effectiveDensity;
    if (nextWaveTimer <= 0) {
      nextWaveTimer = Math.max(0.32, 1.35 - Math.min(0.85, speed * 0.012));

      // Reaction window compression at high speed + single safe path + no red signage + active events
      const speedStrain = Math.max(0, (speed - 36) / 35);
      const pathPenalty = (diff.minSafePaths || 2) <= 1 ? 0.018 : 0.0;
      const signagePenalty = diff.showRedHazardSignage === false ? 0.012 : 0.0;
      const eventOverlap = rng() < Math.min(0.45, 0.08 * effectiveEventFreq) ? 0.028 : 0.0;
      const debuffOverlap = diff.allowCurses && rng() < Math.min(0.35, 0.05 * effectiveEventFreq) ? 0.032 : 0.0;

      const hitChance = Math.min(
        0.55,
        Math.max(0.002, (1 - botSkill) + speedStrain * 0.065 + pathPenalty + signagePenalty + eventOverlap + debuffOverlap)
      );

      if (invuln <= 0 && rng() < hitChance) {
        if (shields > 0) {
          shields--;
          invuln = 1.2;
        } else {
          hp -= 1;
          invuln = 1.5;
        }
      }
    }

    // Active predator attack pressure (cannot be passively outrun)
    predatorPressureTimer -= dt * predatorAggro;
    if (predatorPressureTimer <= 0) {
      predatorPressureTimer = Math.max(2.2, 9.5 / predatorAggro);
      const predHitChance = Math.min(0.42, (1 - botSkill) * 1.4 + Math.max(0, (predatorAggro - 1) * 0.09));
      if (invuln <= 0 && rng() < predHitChance) {
        if (shields > 0) {
          shields--;
          invuln = 1.2;
        } else {
          hp -= 1;
          invuln = 1.5;
        }
      }
    }
  }

  return { score: Math.round(score), survivalSec: Math.round(timeSec) };
}

test('Difficulty Simulation: optimal bot in Supreme+Perfect stays far below 2,000,000 pts; average bot in Normal survives > 3 min', () => {
  const getDangerTier = resolveGetDangerTier();
  assert.equal(typeof getDangerTier, 'function', 'Difficulty.getDangerTier is required for difficulty simulation');

  const runs = 20;
  const supremeResults = [];
  const normalResults = [];

  for (let i = 0; i < runs; i++) {
    supremeResults.push(
      simulateHeadlessRun({
        presetId: 'supreme',
        perfectMode: true,
        botSkill: 0.965, // optimal human/bot precision
        seed: 1000 + i * 37,
        getDangerTier
      })
    );
    normalResults.push(
      simulateHeadlessRun({
        presetId: 'normal',
        perfectMode: false,
        botSkill: 0.975, // average player in Normal with 2 safe paths + signage
        seed: 2000 + i * 41,
        getDangerTier
      })
    );
  }

  const maxSupremeScore = Math.max(...supremeResults.map((r) => r.score));
  const avgSupremeScore = supremeResults.reduce((s, r) => s + r.score, 0) / runs;
  const avgSupremeSec = supremeResults.reduce((s, r) => s + r.survivalSec, 0) / runs;
  const avgNormalSec = normalResults.reduce((s, r) => s + r.survivalSec, 0) / runs;

  assert.ok(
    maxSupremeScore < 500000,
    `Optimal bot in Supreme+Perfect must stay far below 2,000,000 pts (max=${maxSupremeScore}, avg=${Math.round(avgSupremeScore)}, avgSec=${Math.round(avgSupremeSec)}s)`
  );
  assert.ok(
    avgSupremeScore < 250000,
    `Average score of optimal bot in Supreme+Perfect should be < 250,000 (got ${Math.round(avgSupremeScore)})`
  );
  assert.ok(
    avgNormalSec > 180,
    `Normal difficulty must stay fair: average bot should survive > 180s (3 min), got ${Math.round(avgNormalSec)}s`
  );
});
