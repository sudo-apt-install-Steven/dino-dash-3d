// tests/parte8_conteudo_novo_seletor_cor.test.mjs
// Testes unitários para a Parte 8 (Conteúdo Novo e Seletor de Cores Completo):
// 1. Conversão precisa entre HEX, RGB e HSL
// 2. Proteção Anti-Abuso Multiplayer: Limite mínimo de transparência (alpha >= 0.35)
// 3. Sanitização contra dinos invisíveis
// 4. Integridade de traduções PT-BR e termos de acessibilidade

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  sanitizeDinoColor,
  MIN_OPACITY_THRESHOLD
} from '../src/dinos/AdvancedColorStudio.js';

import { LIMITED_DINO_CATALOG } from '../src/content/limited_dinos.js';
import { TRANSLATIONS } from '../src/i18n/translations.js';

test('Parte 8.1: Conversões de Cores (HEX, RGB, HSL)', () => {
  // 1. Vermelho puro
  const rgbRed = hexToRgb('#ff0000');
  assert.deepEqual(rgbRed, { r: 255, g: 0, b: 0 });
  assert.equal(rgbToHex(255, 0, 0), '#ff0000');

  const hslRed = rgbToHsl(255, 0, 0);
  assert.equal(hslRed.h, 0);
  assert.equal(hslRed.s, 100);
  assert.equal(hslRed.l, 50);

  const rgbBack = hslToRgb(hslRed.h, hslRed.s, hslRed.l);
  assert.deepEqual(rgbBack, { r: 255, g: 0, b: 0 });

  // 2. Verde Esmeralda
  const rgbGreen = hexToRgb('#10b981');
  const hexBack = rgbToHex(rgbGreen.r, rgbGreen.g, rgbGreen.b);
  assert.equal(hexBack.toLowerCase(), '#10b981');
});

test('Parte 8.2: Barreira Anti-Abuso de Invisibilidade no Multiplayer (Seção 8.2)', () => {
  assert.equal(MIN_OPACITY_THRESHOLD, 0.35, 'Limite mínimo deve ser 35% de opacidade');

  // Tentativa de invisibilidade total (0% ou 10% de opacidade)
  const exploitAttempt1 = sanitizeDinoColor('#ff00ff', 0.0);
  assert.equal(exploitAttempt1.opacity, 0.35, 'Opacidade 0 deve ser clampada em 0.35');
  assert.ok(exploitAttempt1.rgbaString.includes('0.35'));

  const exploitAttempt2 = sanitizeDinoColor('#ff00ff', 0.15);
  assert.equal(exploitAttempt2.opacity, 0.35, 'Opacidade 0.15 deve ser clampada em 0.35');

  // Opacidade legítima (0.8 ou 1.0)
  const legitColor = sanitizeDinoColor('#00ffff', 0.85);
  assert.equal(legitColor.opacity, 0.85);
});

test('Parte 8.3: Catálogo de Dinossauros Limitados e Eventos', () => {
  assert.ok(LIMITED_DINO_CATALOG.length >= 10, 'Deve conter pelo menos 10 dinossauros limitados');
  for (const dino of LIMITED_DINO_CATALOG) {
    assert.ok(dino.id, 'Dino limitado deve possuir id');
    assert.ok(dino.name, 'Dino limitado deve possuir nome');
    assert.ok(dino.stats, 'Dino limitado deve possuir atributos balanceados');
  }
});

test('Parte 8.4: Cobertura de Traduções em PT-BR', () => {
  assert.ok(TRANSLATIONS['pt-BR'], 'Deve possuir dicionário pt-BR');
  const pt = TRANSLATIONS['pt-BR'];
  assert.ok(pt['app.title'], 'Deve ter app.title em pt-BR');
  assert.ok(pt['menu.play'], 'Deve ter menu.play em pt-BR');
});
