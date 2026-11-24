// tests/parte6_arena_x1_luta.test.mjs
// Testes unitários para a Parte 6 (Arena X1 Estilo Jogo de Luta):
// 1. Frame data dos golpes (Leve, Médio, Pesado, Agarrão, Especial, Supremo)
// 2. Sistema de Combos e Cancelamentos (ComboTracker)
// 3. Mecânica de Defesa, Bloqueio e Parry com stagger
// 4. Finalizações Dramáticas ("Dino Finishers") com suporte a Modo Família
// 5. Torre de Desafios (Arcade Tower) e Armas de Dinossauro

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ATTACK_TYPES,
  DINO_WEAPONS,
  ARCADE_TOWER,
  ComboTracker,
  resolveFightingAttack
} from '../src/modes/FightingEngine.js';

test('Parte 6.1: Tipos de Golpes e Frame Data de Luta', () => {
  assert.ok(ATTACK_TYPES.light.startup < ATTACK_TYPES.heavy.startup, 'Golpe leve deve ter startup mais rápido que pesado');
  assert.ok(ATTACK_TYPES.grab.unblockable, 'Agarrão deve ser indefensável');
  assert.equal(ATTACK_TYPES.super_finisher.furyCost, 100, 'Supremo consome 100% de Fúria');
});

test('Parte 6.2: Sistema de Combos e Detecção de Encadeamento', () => {
  const tracker = new ComboTracker();

  const h1 = tracker.registerHit('light', 8);
  assert.equal(h1.hits, 1);
  assert.equal(h1.totalDamage, 8);

  const h2 = tracker.registerHit('medium', 16);
  assert.equal(h2.hits, 2);

  const h3 = tracker.registerHit('heavy', 28);
  assert.equal(h3.hits, 3);
  assert.equal(h3.totalDamage, 52);
  assert.equal(h3.comboName, 'TRIPLO IMPACTO PRIMAL!');
});

test('Parte 6.3: Resolução de Combate — Bloqueio, Parry e Dano', () => {
  const attacker = { hp: 100, fury: 0 };
  const defender = { hp: 100, isBlocking: false, isParrying: false };

  // 1. Golpe limpo
  const r1 = resolveFightingAttack(attacker, defender, 'medium');
  assert.equal(r1.damage, 16);
  assert.equal(defender.hp, 84);
  assert.equal(attacker.fury, 15);

  // 2. Golpe bloqueado (reduz para 25% do dano)
  defender.isBlocking = true;
  const r2 = resolveFightingAttack(attacker, defender, 'heavy');
  assert.equal(r2.blocked, true);
  assert.equal(r2.damage, 7); // floor(28 * 0.25)
  assert.equal(defender.hp, 77);

  // 3. Parry perfeito (dano 0 e atacante fica staggered)
  defender.isBlocking = false;
  defender.isParrying = true;
  const r3 = resolveFightingAttack(attacker, defender, 'light');
  assert.equal(r3.parried, true);
  assert.equal(r3.damage, 0);
  assert.equal(attacker.staggeredFrames, 20);
});

test('Parte 6.4: Finalizações Dramáticas e Modo Família', () => {
  const attacker = { hp: 100, fury: 100 };
  const defender = { hp: 20, isBlocking: false };

  // Modo normal
  const r1 = resolveFightingAttack(attacker, defender, 'super_finisher', { familyMode: false });
  assert.ok(r1.finisherDesc.includes('DEVASTADORA'));

  // Modo Família (amigável para todas as idades)
  const defenderFam = { hp: 10, isBlocking: false };
  const r2 = resolveFightingAttack(attacker, defenderFam, 'super_finisher', { familyMode: true });
  assert.ok(r2.finisherDesc.includes('HEROICA'));
});

test('Parte 6.5: Torre de Desafios e Armas Customizadas', () => {
  assert.equal(ARCADE_TOWER.length, 5, 'Torre Arcade deve ter 5 andares');
  assert.equal(ARCADE_TOWER[4].opponentId, 'trex_shadow', 'Chefe final deve ser T-Rex Lorde das Trevas');
  assert.ok(DINO_WEAPONS.length >= 4, 'Deve conter pelo menos 4 armas de dinossauro');
});
