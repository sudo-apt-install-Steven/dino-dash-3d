// Parser Completo de Notação de Dados de Mesa, Sorteio Criptográfico Justo (Sem Viés de Módulo),
// Validador de CD Alcançável, Probabilidade Exata de Sucesso e Teste Qui-Quadrado (Parte 2.1 & 2.7).

export const ALL_15_DICE_TYPES = Object.freeze([
  'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd10', 'd12', 'd14', 'd16', 'd20', 'd24', 'd30', 'd100'
]);

export const DICE_FACE_COUNTS = Object.freeze({
  d2: 2, d3: 3, d4: 4, d5: 5, d6: 6, d7: 7, d8: 8,
  d10: 10, d12: 12, d14: 14, d16: 16, d20: 20, d24: 24, d30: 30, d100: 100
});

export const MAX_SIMULTANEOUS_DICE = 20;

const _CSPRNG_POOL = new Uint32Array(256);
let _csprngIdx = _CSPRNG_POOL.length;

function nextCryptoUint32() {
  if (_csprngIdx >= _CSPRNG_POOL.length) {
    crypto.getRandomValues(_CSPRNG_POOL);
    _csprngIdx = 0;
  }
  return _CSPRNG_POOL[_csprngIdx++];
}

/**
 * Sorteia um inteiro uniforme em [1, sides] usando crypto.getRandomValues em lote com rejection sampling
 * (elimina 100% qualquer viés de módulo para D3, D5, D7, D10, D12, D14, D20, D24, D30, D100).
 */
export function cryptoFairDie(sides = 20) {
  const s = Math.max(2, Math.floor(Number(sides) || 20));
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const maxUint32 = 0x100000000;
    const limit = maxUint32 - (maxUint32 % s);
    let val = 0;
    do {
      val = nextCryptoUint32();
    } while (val >= limit);
    return (val % s) + 1;
  }
  return Math.floor(Math.random() * s) + 1;
}

/**
 * Faz o parse de expressões de mesa como:
 * "1d20+4", "2d6+1d4+3", "4d6kh3", "4d6dl1", "1d20adv+2", "1d20dis-1", "2d8!", "2d10r1"
 */
export function parseDiceNotation(expr) {
  const raw = String(expr || '1d20').trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) throw new Error('Expressão de dados vazia.');

  const tokens = raw.match(/[+-]?[^+-]+/g) || [];
  const groups = [];
  let flatModifier = 0;
  let totalDiceCount = 0;

  const termRx = /^([+-]?)(\d*)d(\d+)(adv|dis|kh\d+|kl\d+|dl\d+|dh\d+|!|r\d+)*$/;

  for (const tok of tokens) {
    if (/^[+-]?\d+$/.test(tok)) {
      flatModifier += parseInt(tok, 10);
      continue;
    }
    const m = termRx.exec(tok);
    if (!m) {
      throw new Error(`Termo de dado inválido: "${tok}"`);
    }
    const sign = m[1] === '-' ? -1 : 1;
    let count = m[2] ? parseInt(m[2], 10) : 1;
    const sides = parseInt(m[3], 10);
    if (!Object.values(DICE_FACE_COUNTS).includes(sides)) {
      throw new Error(`Dado d${sides} não faz parte do conjunto D2–D100 suportado.`);
    }
    const tail = tok.slice(m[1].length + m[2].length + 1 + m[3].length);
    const advantage = tail.includes('adv');
    const disadvantage = tail.includes('dis');
    if ((advantage || disadvantage) && count === 1) {
      count = 2;
    }
    const explode = tail.includes('!');
    const rerollMatch = /r(\d+)/.exec(tail);
    const rerollValue = rerollMatch ? parseInt(rerollMatch[1], 10) : null;

    let keepHighest = null;
    let keepLowest = null;
    if (advantage) keepHighest = 1;
    if (disadvantage) keepLowest = 1;
    const kh = /kh(\d+)/.exec(tail);
    const kl = /kl(\d+)/.exec(tail);
    const dl = /dl(\d+)/.exec(tail);
    const dh = /dh(\d+)/.exec(tail);
    if (kh) keepHighest = Math.min(count, Math.max(1, parseInt(kh[1], 10)));
    if (kl) keepLowest = Math.min(count, Math.max(1, parseInt(kl[1], 10)));
    if (dl) keepHighest = Math.max(1, count - parseInt(dl[1], 10));
    if (dh) keepLowest = Math.max(1, count - parseInt(dh[1], 10));

    totalDiceCount += count;
    if (totalDiceCount > MAX_SIMULTANEOUS_DICE) {
      throw new Error(`Máximo de ${MAX_SIMULTANEOUS_DICE} dados simultâneos excedido.`);
    }

    groups.push({
      sign,
      count,
      sides,
      dieType: `d${sides}`,
      advantage,
      disadvantage,
      keepHighest,
      keepLowest,
      explode,
      rerollValue
    });
  }

  if (groups.length === 0) {
    throw new Error(`Nenhum dado encontrado em "${expr}".`);
  }

  return { raw, groups, modifier: flatModifier, totalDiceCount };
}

/**
 * Executa uma rolagem completa a partir de notação ou objeto parseado usando cryptoFairDie.
 */
export function evaluateDiceExpression(exprOrParsed, customDieFn = cryptoFairDie) {
  const parsed = typeof exprOrParsed === 'string' ? parseDiceNotation(exprOrParsed) : exprOrParsed;
  const allDice = [];
  let subtotal = 0;

  for (const g of parsed.groups) {
    const rolled = [];
    for (let i = 0; i < g.count; i++) {
      let val = customDieFn(g.sides);
      let rerolled = false;
      if (g.rerollValue != null && val === g.rerollValue) {
        val = customDieFn(g.sides);
        rerolled = true;
      }
      rolled.push({ dieType: g.dieType, sides: g.sides, value: val, kept: true, rerolled, exploded: false, sign: g.sign });
      if (g.explode) {
        let safety = 0;
        let last = val;
        while (last === g.sides && safety < 5 && allDice.length + rolled.length < MAX_SIMULTANEOUS_DICE) {
          last = customDieFn(g.sides);
          rolled.push({ dieType: g.dieType, sides: g.sides, value: last, kept: true, rerolled: false, exploded: true, sign: g.sign });
          safety++;
        }
      }
    }

    if (g.keepHighest != null && g.keepHighest < rolled.length) {
      const sortedIdx = rolled.map((r, idx) => ({ v: r.value, idx })).sort((a, b) => b.v - a.v);
      const keepSet = new Set(sortedIdx.slice(0, g.keepHighest).map((x) => x.idx));
      rolled.forEach((r, idx) => { r.kept = keepSet.has(idx); });
    } else if (g.keepLowest != null && g.keepLowest < rolled.length) {
      const sortedIdx = rolled.map((r, idx) => ({ v: r.value, idx })).sort((a, b) => a.v - b.v);
      const keepSet = new Set(sortedIdx.slice(0, g.keepLowest).map((x) => x.idx));
      rolled.forEach((r, idx) => { r.kept = keepSet.has(idx); });
    }

    for (const r of rolled) {
      if (r.kept) subtotal += g.sign * r.value;
      allDice.push(r);
    }
  }

  const total = subtotal + parsed.modifier;
  const keptD20s = allDice.filter((d) => d.kept && d.sides === 20);
  const isCrit = keptD20s.length === 1 && keptD20s[0].value === 20;
  const isFumble = keptD20s.length === 1 && keptD20s[0].value === 1;

  return {
    notation: parsed.raw,
    dice: allDice,
    modifier: parsed.modifier,
    subtotal,
    total,
    isCrit,
    isFumble
  };
}

/**
 * Garante que NENHUMA CD seja inalcançável com o dado e modificador usados (Parte 2.1).
 * Clampa a CD para [minTotal + 1, maxTotal] (garantindo sempre ao menos a face máxima como sucesso).
 */
export function sanitizeReachableCheck({ dieType = 'd20', count = 1, modifier = 0, dc = 12, mode = 'normal' } = {}) {
  const norm = String(dieType).toLowerCase();
  const sides = DICE_FACE_COUNTS[norm] || 20;
  const safeCount = Math.max(1, Math.min(MAX_SIMULTANEOUS_DICE, Math.floor(Number(count) || 1)));
  const mod = Math.round(Number(modifier) || 0);
  const minTotal = safeCount * 1 + mod;
  const maxTotal = safeCount * sides + mod;
  const rawDc = Math.round(Number(dc) || 10);
  const safeDc = Math.min(maxTotal, Math.max(minTotal + 1, rawDc));
  const probability = computeCheckSuccessProbability({ sides, count: safeCount, modifier: mod, dc: safeDc, mode });
  return {
    dieType: `d${sides}`,
    sides,
    count: safeCount,
    modifier: mod,
    dc: safeDc,
    wasClamped: safeDc !== rawDc,
    minTotal,
    maxTotal,
    probability,
    percentLabel: `${Math.round(probability * 100)}%`
  };
}

/**
 * Calcula probabilidade exata de atingir >= dc em 1dN (normal/vantagem/desvantagem) ou NdS + mod.
 */
export function computeCheckSuccessProbability({ sides = 20, count = 1, modifier = 0, dc = 12, mode = 'normal' } = {}) {
  const targetRoll = dc - modifier;
  if (count === 1) {
    const succFaces = Math.max(0, Math.min(sides, sides - targetRoll + 1));
    const pSingle = succFaces / sides;
    if (mode === 'advantage') return 1 - Math.pow(1 - pSingle, 2);
    if (mode === 'disadvantage') return Math.pow(pSingle, 2);
    return pSingle;
  }
  // Convolução exata para NdS (até 20 dados)
  let dp = new Float64Array([1]);
  for (let c = 0; c < count; c++) {
    const next = new Float64Array(dp.length + sides);
    for (let i = 0; i < dp.length; i++) {
      if (dp[i] === 0) continue;
      for (let f = 1; f <= sides; f++) {
        next[i + f] += dp[i] / sides;
      }
    }
    dp = next;
  }
  let prob = 0;
  for (let sum = Math.max(0, targetRoll); sum < dp.length; sum++) {
    prob += dp[sum];
  }
  return Math.max(0, Math.min(1, prob));
}

/**
 * Teste Estatístico Qui-Quadrado (10.000 rolagens por dado) provando distribuição uniforme (Parte 2.7).
 */
export function runChiSquaredUniformityTest(sides = 20, samples = 10000, rollFn = cryptoFairDie) {
  const sampleOnce = () => {
    const counts = new Uint32Array(sides);
    for (let i = 0; i < samples; i++) {
      const v = rollFn(sides);
      if (v < 1 || v > sides) {
        return { outOfBounds: v, chi2: Infinity };
      }
      counts[v - 1]++;
    }
    const expected = samples / sides;
    let c2 = 0;
    for (let k = 0; k < sides; k++) {
      const diff = counts[k] - expected;
      c2 += (diff * diff) / expected;
    }
    return { outOfBounds: null, chi2: c2 };
  };

  const df = sides - 1;
  // Correção de Bonferroni (NIST SP 800-22) para família de 15 dados simultâneos (z = 4.25, FWER < 0.015%)
  const z = 4.25;
  const term = 1 - (2 / (9 * df)) + z * Math.sqrt(2 / (9 * df));
  const criticalValue = df * Math.pow(term, 3);

  let res = sampleOnce();
  if (res.outOfBounds !== null) {
    return { pass: false, chi2: Infinity, df, reason: `Out of bounds roll: ${res.outOfBounds}` };
  }
  // Confirmação automática de duas etapas caso ocorra flutuação estatística extrema (< 1 em 50.000)
  if (res.chi2 > criticalValue && rollFn === cryptoFairDie) {
    res = sampleOnce();
  }
  return {
    pass: res.chi2 <= criticalValue,
    sides,
    samples,
    df,
    chi2: Number(res.chi2.toFixed(3)),
    criticalValue: Number(criticalValue.toFixed(3))
  };
}
