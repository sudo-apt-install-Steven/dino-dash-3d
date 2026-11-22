import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generateRandomDinoNick } from '../src/systems/Save.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('1.1 main.css defines custom slim themed scrollbars (Firefox + WebKit)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/styles/main.css'), 'utf8');
  assert.match(css, /scrollbar-width\s*:\s*thin/);
  assert.match(css, /scrollbar-color\s*:/);
  assert.match(css, /::-webkit-scrollbar\b/);
  assert.match(css, /::-webkit-scrollbar-thumb\b/);
  assert.match(css, /::-webkit-scrollbar-track\b/);
});

test('1.2 & 1.3 Game.js cleans up free 3D modes, restores camera & resets modeId on openMainMenu', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/game/Game.js'), 'utf8');
  assert.match(src, /_returnModeId/);
  assert.match(src, /#mode3d-overlay/);
  assert.match(src, /\.m3d-dice-layer/);
  assert.match(src, /camera\.fov\s*=\s*Number\(Save\.data\.settings\?\.fov\)\s*\|\|\s*58/);
  assert.match(src, /camera\.updateProjectionMatrix\(\)/);
  assert.match(src, /this\.modeId\s*===\s*'arena_x1'/);
  assert.match(src, /this\.input\?\.reset\?\.\(\)/);
});

test('1.4 generateRandomDinoNick returns fun random nicknames <= 16 chars and never leftover test strings', () => {
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const nick = generateRandomDinoNick();
    assert.equal(typeof nick, 'string');
    assert.ok(nick.length >= 6 && nick.length <= 16, `unexpected nick length: ${nick}`);
    assert.match(nick, /^[A-Za-z0-9]+$/);
    assert.doesNotMatch(nick, /steven|teste|guest|convidado/i);
    seen.add(nick);
  }
  assert.ok(seen.size >= 30, `expected high uniqueness, got ${seen.size}`);
});

test('1.4 Save.js sanitizes leftover test nicknames like "steven teste" on load', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/systems/Save.js'), 'utf8');
  assert.match(src, /resolveCleanDefaultNick/);
  assert.match(src, /steven\\s\*teste/i);
});
