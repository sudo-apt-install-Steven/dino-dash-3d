import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

import { ContentLoader } from '../src/content/ContentLoader.js';
import { BossManager } from '../src/events/BossManager.js';
import { EventManager } from '../src/events/EventManager.js';
import { Save } from '../src/systems/Save.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// 1. B1: Simulação headless de Boss (60–90s no Normal)
test('B1: Boss fight headless simulation finishes in 60-90s on Normal', () => {
  const balance = ContentLoader.getBalance();
  assert.ok(balance.bossCombat, 'balance.json must define bossCombat');
  assert.ok(
    balance.bossCombat.targetDurationSec?.normal >= 60 &&
    balance.bossCombat.targetDurationSec?.normal <= 90,
    'Normal targetDurationSec must be 60-90s'
  );

  const simFn = BossManager.simulateBossFightHeadless || new BossManager(new THREE.Scene()).simulateBossFightHeadless;
  assert.equal(typeof simFn, 'function', 'BossManager.simulateBossFightHeadless(diff) must exist');

  for (let i = 0; i < 5; i++) {
    const res = simFn.call(BossManager, 'normal');
    assert.equal(res.ok ?? res.defeated, true, `Run ${i + 1}: boss must be defeated`);
    assert.equal(res.stuckDetected ?? false, false, `Run ${i + 1}: boss must not get stuck`);
    assert.ok(
      res.durationSec >= 60 && res.durationSec <= 90,
      `Run ${i + 1}: expected 60-90s, got ${res.durationSec}s`
    );
  }
});

// 2. B2: Ataque Q + cooldown + dano no Boss
test('B2: Player attack Q config, cooldown, and boss damage integration', () => {
  const balance = ContentLoader.getBalance();
  assert.ok(balance.playerAttack, 'balance.json must define playerAttack');
  assert.ok(balance.playerAttack.damage > 0, 'playerAttack.damage must be > 0');
  assert.ok(balance.playerAttack.cooldownSec > 0, 'playerAttack.cooldownSec must be > 0');
  assert.ok(balance.playerAttack.rangeZ > 0, 'playerAttack.rangeZ must be > 0');
  assert.ok(balance.playerAttack.rangeX > 0, 'playerAttack.rangeX must be > 0');

  const gameSrc = readRepoFile('src/game/Game.js');
  assert.match(gameSrc, /_performMeleeAttack/, 'Game.js must implement _performMeleeAttack');
  assert.match(gameSrc, /activeBoss|damageBoss|bosses\.hitByPlayerAttack/, 'Game.js _performMeleeAttack must damage active boss');
  assert.match(gameSrc, /attackCooldown/, 'Game.js must enforce attackCooldown');
});

// 3. B3: Agendador de eventos até 60k pts (>= 12 eventos sem troca de bioma e sem repetir seguido)
test('B3: Event scheduler triggers >= 12 events up to 60k pts without biome swap or back-to-back repeat', () => {
  const balance = ContentLoader.getBalance();
  assert.ok(balance.eventScheduler, 'balance.json must define eventScheduler');
  assert.ok(balance.eventScheduler.firstEventMinScore >= 1500 && balance.eventScheduler.firstEventMaxScore <= 3000);
  assert.equal(balance.eventScheduler.maxConcurrent, 1);

  const simFn = EventManager.simulateEventsTo60k || new EventManager(new THREE.Scene()).simulateEventsTo60k;
  assert.equal(typeof simFn, 'function', 'EventManager.simulateEventsTo60k() must exist');

  const sim = simFn.call(EventManager);
  const events = sim.eventsLog || sim.events || [];
  assert.equal(sim.ok ?? true, true, 'EventManager.simulateEventsTo60k must return ok: true');
  assert.ok(events.length >= 12, `Expected >= 12 events up to 60k pts, got ${events.length}`);
  assert.equal(sim.biomeSwapTriggered ?? false, false, 'Events must not trigger biome swaps');
  assert.equal(sim.firedDuringBossOrIntro ?? 0, 0, 'Events must not fire during boss or predator intro');

  for (let i = 1; i < events.length; i++) {
    const prevId = events[i - 1].id ?? events[i - 1];
    const currId = events[i].id ?? events[i];
    assert.notEqual(currId, prevId, `Event ${currId} repeated back-to-back at index ${i}`);
  }
});

// 4. B5: Regras de reviver (custo/cooldown/janela/limite)
test('B5: Revive rules enforce cost, cooldown, time window, and max per run', () => {
  const balance = ContentLoader.getBalance();
  assert.ok(balance.revive, 'balance.json must define revive');
  assert.equal(balance.revive.costType, 'life_or_shield');
  assert.ok(balance.revive.cooldownSec >= 20, 'revive.cooldownSec should be >= 20s');
  assert.ok(balance.revive.windowSec >= 10, 'revive.windowSec should be >= 10s');
  assert.ok(balance.revive.maxPerRun >= 1 && balance.revive.maxPerRun <= 5, 'revive.maxPerRun should be bounded');
  assert.ok(balance.revive.invulnSec >= 2.0, 'revive.invulnSec should grant >= 2s invulnerability');

  const gameSrc = readRepoFile('src/game/Game.js');
  assert.match(gameSrc, /reviveFallenAlly/, 'Game.js must implement reviveFallenAlly');
  assert.match(gameSrc, /Pressione.*V.*reviver|reviver.*V/i, 'Game.js must show revive V hint');
  assert.match(gameSrc, /caiu!/i, 'Game.js must announce fallen player nick');
});

// 5. B6: Oxigênio (config, drenagem, recarga, graça, dano)
test('B6: Oxygen config and single-action breathe / surface refill', () => {
  const balance = ContentLoader.getBalance();
  assert.ok(balance.oxygen, 'balance.json must define oxygen');
  assert.ok(balance.oxygen.drainPerSec > 0);
  assert.ok(balance.oxygen.rechargePerSec > balance.oxygen.drainPerSec);
  assert.ok(balance.oxygen.lowThreshold > 0 && balance.oxygen.lowThreshold <= 40);
  assert.ok(balance.oxygen.graceSec > 0);
  assert.ok(balance.oxygen.drownDamagePerTick >= 1);

  const hudSrc = readRepoFile('src/ui/HUD.js');
  assert.match(hudSrc, /setContextualTouchState/, 'HUD.js must expose setContextualTouchState');
  assert.match(hudSrc, /touch-breathe-btn/, 'HUD.js must include #touch-breathe-btn');
});

// 6. D6: Save import/export/backup/anti-pollution/migração
test('D6: Save export/import validates schema, checksum, anti-prototype-pollution, backup, and imported flag', () => {
  const exported = Save.exportJson();
  const parsed = JSON.parse(exported);
  assert.ok(parsed.schemaVersion >= 1, 'exportJson must include schemaVersion');
  assert.ok(parsed.checksum, 'exportJson must include checksum');

  // Empty / invalid JSON must fail cleanly
  const emptyRes = Save.importJson('');
  assert.equal(emptyRes.ok, false);

  // Oversized payload must be rejected
  const huge = JSON.stringify({ padding: 'x'.repeat(1024 * 1024) });
  const hugeRes = Save.importJson(huge);
  assert.equal(hugeRes.ok, false, 'Oversized save JSON must be rejected');

  // Prototype pollution payload must not pollute Object.prototype
  const protoPayload = '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted2":true}},"highScore":999,"eggs":50}';
  Save.importJson(protoPayload, { previewOnly: true });
  assert.equal(({}).polluted, undefined, 'Object.prototype must not be polluted');
  assert.equal(({}).polluted2, undefined, 'Object.prototype must not be polluted via constructor');

  // Valid roundtrip with preview + apply + backup + imported flag
  const prevEggs = Save.data.eggs;
  Save.data.eggs = 123;
  const validJson = Save.exportJson();
  Save.data.eggs = prevEggs;

  const previewRes = Save.importJson(validJson, { previewOnly: true });
  assert.equal(previewRes.ok, true);
  assert.ok(previewRes.preview, 'previewOnly must return preview summary');

  const applyRes = Save.importJson(validJson);
  assert.equal(applyRes.ok, true);
  assert.equal(Save.data.imported, true, 'Imported save must be flagged imported: true');
});

// 7. D4: 60+ conquistas data-driven nas 9 categorias + anti-exploit
test('D4: Achievements catalog has >= 62 achievements across 9 categories and anti-exploit', async () => {
  const raw = readRepoFile('src/content/achievements.json');
  const catalog = JSON.parse(raw);
  const list = Array.isArray(catalog) ? catalog : catalog.achievements;
  assert.ok(Array.isArray(list), 'achievements.json must contain an array of achievements');
  assert.ok(list.length >= 62, `Expected >= 62 achievements, got ${list.length}`);

  const categories = new Set(list.map((a) => a.category));
  assert.ok(categories.size >= 9, `Expected >= 9 categories, got ${categories.size}`);

  const tiers = new Set(list.map((a) => a.trophy || a.tier || a.rarity).filter(Boolean));
  assert.ok(tiers.size >= 4, 'Achievements must support multiple rarity/trophy tiers');

  const achMod = await import('../src/systems/Achievements.js');
  assert.ok(achMod.Achievements, 'Achievements system must be exported');
});

// 8. B4 (#26): Sync 100% de mapa/obstáculos Host -> Convidado
test('B4: Spawner syncs host obstacles and Game snapshot includes biomeId', async () => {
  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      width: 128,
      height: 64,
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillText: () => {},
        strokeText: () => {},
        measureText: () => ({ width: 20 }),
        beginPath: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {}
      })
    })
  };
  try {
    const { Spawner } = await import('../src/systems/Spawner.js');
    const scene = new THREE.Scene();
    const hostSpawner = new Spawner(scene);
    const guestSpawner = new Spawner(scene);

    hostSpawner._acquire('cactus_small', 0, 0, -40, { uid: 101 });
    const serialized = hostSpawner.serializeActiveObstacles();
    assert.ok(serialized.length >= 1, 'Host spawner must serialize active obstacles');
    assert.equal(serialized[0].uid, 101);

    guestSpawner.syncFromHostObstacles(serialized);
    assert.equal(guestSpawner.remoteSyncMode, true, 'Guest spawner must enter remoteSyncMode');
    const guestObs = guestSpawner.getActiveObstacles();
    assert.equal(guestObs.length, serialized.length, 'Guest must mirror exact host obstacle count');
    assert.equal(guestObs[0].uid, 101, 'Guest obstacle uid must match host');

    const gameSrc = readRepoFile('src/game/Game.js');
    assert.match(gameSrc, /biomeId:\s*this\.currentBiome/, 'Host snapshot must include biomeId');
    assert.match(gameSrc, /syncFromHostObstacles/, 'Guest must call syncFromHostObstacles');
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
});

