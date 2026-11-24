// tests/parte4_rpg_interface_regras_mesa.test.mjs
// Testes unitários e de integração para a Parte 4 (Seções 2.4, 2.6, 2.8):
// 1. Regras completas de mesa (6 Atributos, 12 Perícias, 8 Arquétipos, Níveis 1..20, Death Saves, Descansos)
// 2. Mapa 2D Ilustrado (Nós, Rotas, Viagem e Fog of War em SVG)
// 3. Mesa Virtual Multiplayer (2..6 jogadores, Iniciativa de Grupo, Votações e Emotes de Mesa)

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ATTRIBUTES,
  SKILLS,
  DINO_ARCHETYPES,
  STATUS_CONDITIONS,
  XP_TABLE,
  getLevelFromXp,
  createCharacterSheet,
  processDeathSave,
  restCharacter
} from '../src/modes/TabletopRPGRules.js';

import {
  TabletopIllustratedMap,
  REGIONS,
  MAP_CONNECTIONS
} from '../src/modes/TabletopIllustratedMap.js';

import {
  TabletopMultiplayerSession,
  QUICK_EMOTES
} from '../src/modes/TabletopMultiplayerSession.js';

test('Parte 4.1: Regras do RPG — Ficha, Níveis 1..20 e Atributos', () => {
  assert.equal(ATTRIBUTES.length, 6, 'Deve possuir 6 atributos');
  assert.equal(SKILLS.length, 12, 'Deve possuir 12 perícias balanceadas');
  assert.equal(DINO_ARCHETYPES.length, 8, 'Deve possuir 8 arquétipos de dinossauros');
  assert.equal(XP_TABLE.length, 20, 'Tabela de XP deve cobrir 20 níveis');

  assert.equal(getLevelFromXp(0), 1);
  assert.equal(getLevelFromXp(300), 2);
  assert.equal(getLevelFromXp(6500), 5);
  assert.equal(getLevelFromXp(355000), 20);

  const sheet = createCharacterSheet({
    name: 'Garras-de-Fogo',
    species: 'Velociraptor',
    archetypeId: 'batedor'
  });

  assert.equal(sheet.name, 'Garras-de-Fogo');
  assert.equal(sheet.archetypeId, 'batedor');
  assert.ok(sheet.hp > 0);
  assert.ok(sheet.equippedWeapon != null);
});

test('Parte 4.2: Regras do RPG — Salvaguarda contra Morte (Death Saves) e Descanso', () => {
  const sheet = createCharacterSheet({ archetypeId: 'predador' });
  sheet.hp = 0;

  // 1. Rolagem de falha
  const res1 = processDeathSave(sheet, 5);
  assert.equal(res1.outcome, 'pending');
  assert.equal(sheet.deathSaves.failures, 1);

  // 2. Rolagem de falha crítica (d20 = 1 soma 2 falhas)
  const res2 = processDeathSave(sheet, 1);
  assert.equal(res2.outcome, 'dead', '3 falhas levam à morte');
  assert.equal(sheet.deathSaves.failures, 3);

  // 3. Sucesso crítico (d20 = 20 revive com 1 HP)
  sheet.hp = 0;
  sheet.deathSaves = { successes: 0, failures: 0 };
  const res3 = processDeathSave(sheet, 20);
  assert.equal(res3.outcome, 'critical_recovery');
  assert.equal(sheet.hp, 1);

  // 4. Descanso Curto e Longo
  restCharacter(sheet, 'short');
  assert.ok(sheet.hp > 1);

  restCharacter(sheet, 'long');
  assert.equal(sheet.hp, sheet.maxHp);
});

test('Parte 4.3: Mapa 2D Ilustrado — Descoberta, Viagem e Fog of War', () => {
  const map = new TabletopIllustratedMap();
  assert.equal(map.currentRegionId, 'clearing');

  // Viagem para nó conectado
  const travelRes = map.travelTo('river_crossing');
  assert.equal(travelRes.success, true);
  assert.equal(map.currentRegionId, 'river_crossing');
  assert.equal(map.getCurrentRegion().discovered, true);

  // Viagem impossível (sem conexão direta)
  const badTravel = map.travelTo('volcano_caldera');
  assert.equal(badTravel.success, false);

  // Renderização SVG do Mapa
  const svg = map.renderSvg();
  assert.ok(svg.includes('<svg'), 'Deve gerar tag svg');
  assert.ok(svg.includes('Clareira dos Fósseis'));
  assert.ok(svg.includes('Terra Incógnita'), 'Regiões não descobertas devem exibir Fog of War');
});

test('Parte 4.4: Mesa Virtual Multiplayer (2 a 6 jogadores)', () => {
  const session = new TabletopMultiplayerSession({ sessionId: 'mesa_alpha' });
  assert.ok(QUICK_EMOTES.length >= 5);

  const p1 = session.addPlayer({ id: 'p1', name: 'Rex', species: 'T-Rex' });
  const p2 = session.addPlayer({ id: 'p2', name: 'Spike', species: 'Triceratops' });
  const p3 = session.addPlayer({ id: 'p3', name: 'Slash', species: 'Velociraptor' });

  assert.equal(session.players.size, 3);

  // Iniciativa de Combate Coletiva
  const initRolls = session.rollGroupInitiative();
  assert.equal(initRolls.length, 3);
  assert.ok(session.getCurrentTurnPlayer() != null);

  const firstTurnPlayer = session.getCurrentTurnPlayer().id;
  session.nextTurn();
  const secondTurnPlayer = session.getCurrentTurnPlayer().id;
  assert.notEqual(firstTurnPlayer, secondTurnPlayer);

  // Votação Democrática de Grupo
  session.startGroupVote('Qual caminho seguir?', ['Caverna dos Cristais', 'Ruínas Antigas']);
  session.castVote('p1', 0);
  session.castVote('p2', 0);
  const voteRes = session.castVote('p3', 1);

  assert.equal(voteRes.isComplete, true);
  assert.equal(voteRes.winningOption.text, 'Caverna dos Cristais');

  // Emotes Rápidos
  const emoteMsg = session.sendEmote('p1', 'roar');
  assert.ok(emoteMsg.includes('Rex'));
  assert.ok(emoteMsg.includes('Ruge com imponência'));
});
