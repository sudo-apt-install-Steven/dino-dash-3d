// Suíte de Testes Automatizados — Parte 2: Dados 3D D2-D100, Qui-Quadrado (10.000 rolagens) e Bugs do RPG 2.1
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORTED_DICE,
  DICE_SIDES,
  DICE_MATERIALS,
  DICE_BAG_PRESETS,
  rollMathDice,
  rollTabletopFormula,
  calculateSuccessProbability,
  cryptoRngUnit
} from '../src/modes/DiceRoller3D.js';
import {
  DICE_TYPES,
  clampDecisionToContract,
  evaluateLocalDungeonAction
} from '../src/net/AIDungeonClient.js';

// Valores críticos da distribuição Qui-Quadrado (alpha = 0.001) para graus de liberdade df = S - 1
const CHI_SQUARE_CRITICAL_001 = {
  1: 10.83,   // d2 (df=1)
  2: 13.82,   // d3 (df=2)
  3: 16.27,   // d4 (df=3)
  4: 18.47,   // d5 (df=4)
  5: 20.52,   // d6 (df=5)
  6: 22.46,   // d7 (df=6)
  7: 24.32,   // d8 (df=7)
  9: 27.88,   // d10 (df=9)
  11: 31.26,  // d12 (df=11)
  13: 34.53,  // d14 (df=13)
  15: 37.70,  // d16 (df=15)
  19: 43.82,  // d20 (df=19)
  23: 49.73,  // d24 (df=23)
  29: 58.30,  // d30 (df=29)
  99: 148.23  // d100 (df=99)
};

test('Parte 2.7: SUPPORTED_DICE contém os 15 tipos de dados (D2 a D100)', () => {
  const expected = ['d2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd10', 'd12', 'd14', 'd16', 'd20', 'd24', 'd30', 'd100'];
  assert.deepEqual(SUPPORTED_DICE, expected);
  assert.deepEqual(DICE_TYPES, expected);
  for (const die of expected) {
    assert.ok(DICE_SIDES[die] >= 2, `Lado inválido para ${die}`);
  }
});

test('Parte 2.7: Materiais de Dados (9 materiais oficiais configurados)', () => {
  const expectedMats = [
    'resina', 'osso_dino', 'pedra_vulcanica', 'ambar', 'jade',
    'madeira_petrificada', 'ouro_jurassico', 'cristal_meteoro', 'neon'
  ];
  for (const m of expectedMats) {
    assert.ok(DICE_MATERIALS[m], `Material ausente: ${m}`);
    assert.ok(typeof DICE_MATERIALS[m].roughness === 'number');
    assert.ok(typeof DICE_MATERIALS[m].metalness === 'number');
  }
});

test('Parte 2.7: Bolsa de Dados — Presets de Mesa configurados', () => {
  assert.ok(DICE_BAG_PRESETS.length >= 10);
  for (const p of DICE_BAG_PRESETS) {
    assert.ok(p.id && p.label && p.formula);
    const evalRes = rollTabletopFormula(p.formula);
    assert.ok(Number.isFinite(evalRes.total), `Fórmula inválida no preset ${p.id}`);
  }
});

test('Parte 2.7: Notação de Mesa — Avaliação rigorosa (NdX, kh, kl, adv, dis, !)', () => {
  // 1. 2d6+3
  for (let i = 0; i < 50; i++) {
    const r = rollTabletopFormula('2d6+3');
    assert.ok(r.total >= 5 && r.total <= 15, `2d6+3 fora do limite: ${r.total}`);
    assert.equal(r.flatModifier, 3);
  }

  // 2. 4d6kh3 (keep highest 3)
  for (let i = 0; i < 50; i++) {
    const r = rollTabletopFormula('4d6kh3');
    assert.ok(r.total >= 3 && r.total <= 18, `4d6kh3 fora do limite: ${r.total}`);
    assert.equal(r.diceGroups[0].kept.length, 3);
    assert.equal(r.diceGroups[0].dropped.length, 1);
  }

  // 3. 1d20adv (vantagem)
  for (let i = 0; i < 50; i++) {
    const r = rollTabletopFormula('1d20adv');
    assert.ok(r.total >= 1 && r.total <= 20);
    const [r1, r2] = r.diceGroups[0].rolls;
    assert.equal(r.total, Math.max(r1, r2));
  }

  // 4. 1d20dis (desvantagem)
  for (let i = 0; i < 50; i++) {
    const r = rollTabletopFormula('1d20dis');
    assert.ok(r.total >= 1 && r.total <= 20);
    const [r1, r2] = r.diceGroups[0].rolls;
    assert.equal(r.total, Math.min(r1, r2));
  }

  // 5. Suporte a até 20 dados simultâneos
  const r20 = rollTabletopFormula('20d6');
  assert.equal(r20.diceGroups[0].rolls.length, 20);
  assert.ok(r20.total >= 20 && r20.total <= 120);
});

test('Parte 2.1: Cálculo e Exibição de Probabilidade de CD', () => {
  // 1d20 vs CD 11 com bônus +0: precisa tirar 11..20 (10 faces de 20 -> 50%)
  const p1 = calculateSuccessProbability('d20', 1, 0, 11, 'normal');
  assert.equal(Math.round(p1 * 100), 50);

  // 1d20 vs CD 15 com bônus +4: precisa tirar 11..20 (50%)
  const p2 = calculateSuccessProbability('d20', 1, 4, 15, 'normal');
  assert.equal(Math.round(p2 * 100), 50);

  // CD inalcançável sem bônus em d6 deve ser 0% se não ajustada
  const pImp = calculateSuccessProbability('d6', 1, 0, 10, 'normal');
  assert.equal(pImp, 0);

  // Vantagem aumenta probabilidade: 1d20 vs CD 11 com adv é 1 - (10/20)^2 = 75%
  const pAdv = calculateSuccessProbability('d20', 1, 0, 11, 'adv');
  assert.equal(Math.round(pAdv * 100), 75);
});

test('Parte 2.1: Nenhuma CD é inalcançável em todos os tipos de ações e andares 1..10', () => {
  const testActions = [
    'curar minhas feridas com uma poção',
    'atacar o t-rex com as garras ferozes',
    'esgueirar nas sombras da masmorra',
    'saltar sobre o abismo rochoso',
    'rugir para intimidar os guardas',
    'lançar magia arcana de fogo',
    'procurar armadilhas secretas'
  ];

  for (let floor = 1; floor <= 10; floor++) {
    for (const act of testActions) {
      const ctx = {
        actionText: act,
        floor,
        hp: 10,
        maxHp: 15,
        weaponBonus: 2,
        lang: 'pt',
        enemy: { name: 'Raptor', hp: 8 }
      };
      const dec = evaluateLocalDungeonAction(ctx);
      assert.ok(dec.possible !== false);
      const sides = DICE_SIDES[dec.diceType];
      const maxPossibleTotal = sides * dec.diceCount + dec.statBonus;
      assert.ok(
        dec.dc <= maxPossibleTotal,
        `CD IMPOSSÍVEL DETECTADA: ${dec.diceType} (max ${maxPossibleTotal}) exigiu CD ${dec.dc} para ação '${act}' no andar ${floor}`
      );
      const prob = calculateSuccessProbability(dec.diceType, dec.diceCount, dec.statBonus, dec.dc);
      assert.ok(prob > 0, `Probabilidade 0 para ação válida '${act}'`);
    }
  }
});

test('Parte 2.7: Teste Estatístico Qui-Quadrado (10.000 rolagens por dado de D2 a D100)', () => {
  const N = 10000;
  const diceList = ['d2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd10', 'd12', 'd14', 'd16', 'd20', 'd24', 'd30', 'd100'];

  for (const die of diceList) {
    const sides = DICE_SIDES[die];
    const observed = new Array(sides + 1).fill(0);

    for (let i = 0; i < N; i++) {
      const res = rollMathDice(die, 1, cryptoRngUnit);
      const v = res.rolls[0];
      assert.ok(v >= 1 && v <= sides, `${die} sorteou valor fora do intervalo: ${v}`);
      observed[v]++;
    }

    // Qui-Quadrado: sum((O - E)^2 / E)
    const expected = N / sides;
    let chiSquare = 0;
    for (let v = 1; v <= sides; v++) {
      assert.ok(observed[v] > 0, `${die} face ${v} nunca foi sorteada em ${N} rolagens`);
      const diff = observed[v] - expected;
      chiSquare += (diff * diff) / expected;
    }

    const df = sides - 1;
    const crit = CHI_SQUARE_CRITICAL_001[df] || (df + 3.29 * Math.sqrt(2 * df)); // Aproximação normal para df alto
    assert.ok(
      chiSquare <= crit,
      `Qui-quadrado FALHOU para ${die}: chiSquare=${chiSquare.toFixed(2)}, crit=${crit.toFixed(2)} (df=${df}, p=0.001)`
    );
  }
});
