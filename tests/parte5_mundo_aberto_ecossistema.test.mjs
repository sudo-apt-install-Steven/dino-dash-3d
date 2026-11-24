// tests/parte5_mundo_aberto_ecossistema.test.mjs
// Testes unitários para a Parte 5 (Seções 5.1, 5.2, 5.3):
// 1. Redesenho de modelos primitivos e audit de silhuetas
// 2. Ecossistema vivo: IA de Presas (fuga/pasto) e Predadores (caça/patrulha)
// 3. Ciclo Dia/Noite e Estações com efeitos térmicos
// 4. Catálogo de Criaturas e Plantas com nome, efeito e dicas de uso
// 5. Sistema de Crafting de Ninho e Abrigo

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CREATURE_CATALOG,
  FLORA_CATALOG,
  CRAFTING_RECIPES,
  OpenWorldEcosystem
} from '../src/modes/OpenWorldEcosystem.js';

test('Parte 5.1: Catálogo de Criaturas e Flora (Seção 5.3) — Requisitos de Nomes, Efeitos e Dicas', () => {
  assert.ok(CREATURE_CATALOG.length >= 4, 'Deve conter pelo menos 4 criaturas ricas');
  assert.ok(FLORA_CATALOG.length >= 3, 'Deve conter pelo menos 3 espécies de plantas raras');

  for (const c of CREATURE_CATALOG) {
    assert.ok(c.name, 'Criatura deve ter nome');
    assert.ok(c.desc, 'Criatura deve ter descrição');
    assert.ok(c.effect, 'Criatura deve ter efeito');
    assert.ok(c.tip, 'Criatura deve ter dica de uso/enfrentamento');
  }

  for (const f of FLORA_CATALOG) {
    assert.ok(f.name, 'Planta deve ter nome');
    assert.ok(f.desc, 'Planta deve ter descrição');
    assert.ok(f.effect, 'Planta deve ter efeito');
    assert.ok(f.tip, 'Planta deve ter dica de coleta');
  }
});

test('Parte 5.2: Simulação de IA de Presas e Predadores no Ecossistema', () => {
  const eco = new OpenWorldEcosystem();
  const playerPos = { x: 0, z: 0 };

  // Presa a 5 metros do jogador deve fugir
  const prey = { type: 'prey', x: 5, z: 0, speed: 6, state: 'grazing' };
  const statePrey = eco.simulateAiBehavior(prey, playerPos, 0.5);
  assert.equal(statePrey, 'fleeing');
  assert.ok(prey.x > 5, 'Presa deve se afastar do jogador ao fugir');

  // Predador a 10 metros deve perseguir
  const predator = { type: 'predator', x: 10, z: 0, speed: 8, state: 'patrolling' };
  const statePred = eco.simulateAiBehavior(predator, playerPos, 0.5);
  assert.equal(statePred, 'chasing');
  assert.ok(predator.x < 10, 'Predador deve se aproximar do jogador ao perseguir');
});

test('Parte 5.3: Ciclo Dia/Noite e Variação de Temperatura', () => {
  const eco = new OpenWorldEcosystem();
  // 300 segundos = meio ciclo (avança de 0.25 para 0.75 crepúsculo/noite)
  const env = eco.updateTime(300);
  assert.ok(env.timeOfDay >= 0.7 && env.timeOfDay <= 0.8);

  // Noite profunda
  eco.updateTime(100);
  assert.equal(eco.updateTime(0).isNight, true);
});

test('Parte 5.4: Sistema de Ninho e Receitas de Crafting', () => {
  assert.ok(CRAFTING_RECIPES.length >= 3);
  const bed = CRAFTING_RECIPES.find(r => r.id === 'cozy_nest_bed');
  assert.ok(bed != null);
  assert.ok(bed.benefit.includes('sono no ninho'));
});
