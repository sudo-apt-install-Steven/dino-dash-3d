import test from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  sanitizeNickname,
  sanitizeRoomCode,
  sanitizeRoomPassword,
  sanitizeHexColor
} from '../src/security/Sanitize.js';
import { GAME_MODES, getModeDef } from '../src/game/Modes.js';
import { DINO_CATALOG, getDinoSpec } from '../src/dinos/DinoCatalog.js';
import { BIOMES, getBiomeById } from '../src/world/Biomes.js';
import { DIFFICULTY_PRESETS } from '../src/game/Difficulty.js';
import { ObjectPool } from '../src/systems/ObjectPool.js';
import { SUPPORTED_LOCALES, normalizeLocale, t } from '../src/i18n/translations.js';
import { ContentLoader } from '../src/content/ContentLoader.js';

test('Sanitize: escapeHtml blocks XSS payloads', () => {
  const dirty = '<script>alert("xss")</script>&"\'';
  const clean = escapeHtml(dirty);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('&lt;script&gt;'), true);
  assert.equal(clean.includes('&amp;'), true);
});

test('Sanitize: sanitizeNickname, roomCode, roomPassword, hexColor', () => {
  assert.equal(sanitizeNickname('  <b>Steven</b>  ', 'Dino', 18), 'bSteven/b');
  assert.equal(sanitizeNickname('', 'Dino', 18), 'Dino');
  assert.equal(sanitizeRoomCode('ab-12!'), 'AB12');
  assert.equal(sanitizeRoomPassword('  1234\n\t '), '1234');
  assert.equal(sanitizeHexColor('#ff00aa'), '#ff00aa');
  assert.equal(sanitizeHexColor('javascript:alert(1)', '#ffffff'), '#ffffff');
});

test('Modes: >= 22 unique modes (including expansion modes) and valid fallback', () => {
  assert.ok(GAME_MODES.length >= 22, `Expected >= 22 modes, got ${GAME_MODES.length}`);
  const ids = new Set(GAME_MODES.map((m) => m.id));
  assert.equal(ids.size, GAME_MODES.length);
  for (const reqId of ['raid', 'boss_fight', 'free_roam', 'race', 'competition', 'coop']) {
    assert.ok(ids.has(reqId), `Missing required mode: ${reqId}`);
  }
  for (const m of GAME_MODES) {
    assert.ok(m.name && m.tier && m.players >= 1);
  }
  assert.equal(getModeDef('nonexistent_mode').id, 'solo');
});

test('DinoCatalog: 37 unique species with valid attributes', () => {
  assert.equal(DINO_CATALOG.length, 37);
  const ids = new Set(DINO_CATALOG.map((d) => d.id));
  assert.equal(ids.size, DINO_CATALOG.length);
  for (const d of DINO_CATALOG) {
    assert.ok(d.name);
    assert.ok(d.stats && d.stats.speed > 0 && d.stats.jump > 0);
  }
  assert.equal(getDinoSpec('trex').id, 'trex');
});

test('Biomes & Difficulty: 19 biomes and valid difficulty presets', () => {
  assert.equal(BIOMES.length, 19);
  const ids = new Set(BIOMES.map((b) => b.id));
  assert.equal(ids.size, BIOMES.length);
  assert.equal(getBiomeById('desert').id, 'desert');
  for (const key of ['easy', 'normal', 'hard', 'insane']) {
    assert.ok(DIFFICULTY_PRESETS[key]);
  }
});

test('ObjectPool: reuses released instances without leaking', () => {
  let created = 0;
  const pool = new ObjectPool(
    () => ({ id: ++created, active: false }),
    (obj) => { obj.active = false; },
    2
  );
  const a = pool.acquire();
  const b = pool.acquire();
  assert.equal(created, 2);
  a.active = true;
  pool.release(a);
  assert.equal(a.active, false);
  const a2 = pool.acquire();
  assert.equal(a2, a);
  assert.equal(created, 2);
  pool.release(b);
  pool.release(a2);
});

test('i18n: supports pt-BR, en, and es translations cleanly', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['pt-BR', 'en', 'es']);
  assert.equal(normalizeLocale('pt'), 'pt-BR');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('es-ES'), 'es');
  assert.equal(t('menu.play', 'pt-BR'), '▶ Jogar Agora');
  assert.equal(t('menu.play', 'en'), '▶ Play Now');
  assert.equal(t('menu.play', 'es'), '▶ Jugar Ahora');
});

test('ContentLoader: validates data-driven bosses, missions, and seasonal events', () => {
  const res = ContentLoader.validateContent();
  assert.equal(res.ok, true, `Content validation errors: ${(res.errors || []).join(', ')}`);
  assert.ok(ContentLoader.getBosses().length >= 14);
  assert.ok(ContentLoader.getMissions().length >= 10);
  assert.ok(ContentLoader.getSeasonalEvents().length >= 4);
});

