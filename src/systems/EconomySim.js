// Simulador de Economia Balanceada (100 partidas) para validação no Debug e balanceamento automático.
import { MYSTERY_EGG_COST, MYSTERY_EGG_DUP_REFUND, ProgressionManager } from './Progression.js';
import { BOSS_DEFS } from '../events/BossManager.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simula `runCount` partidas de ~3 minutos (com mistura de perfis: iniciante, médio, experiente),
 * calculando média de ovos por 3 min, cristais, ritmo por patamar (150/600/2500/10000)
 * e prova de retorno negativo no Ovo Misterioso completo.
 */
export function runEconomySimulation(runCount = 100, seed = 20261113) {
  const rng = mulberry32(seed);
  const runs = [];

  for (let i = 0; i < runCount; i++) {
    // Perfil do jogador: 30% iniciante (~0.42 captura), 45% intermediário (~0.56), 25% avançado (~0.70)
    const roll = rng();
    const skill = roll < 0.30 ? 0.42 : (roll < 0.75 ? 0.56 : 0.70);
    const durationSec = 150 + rng() * 60; // ~2.5 a 3.5 min (~180s centro)
    const waves = Math.floor(durationSec / 0.95);

    let eggs = 0;
    let crystals = 0;
    let tier1 = 0;
    let tier5 = 0;
    let tier25 = 0;

    for (let w = 0; w < waves; w++) {
      if (rng() < 0.32) {
        const arcCount = 2 + Math.floor(rng() * 3);
        for (let k = 0; k < arcCount; k++) {
          if (rng() > skill) continue;
          const tr = rng();
          if (tr < 0.02) {
            eggs += 25;
            tier25++;
          } else if (tr < 0.16) {
            eggs += 5;
            tier5++;
          } else {
            eggs += 1;
            tier1++;
          }
        }
      }
      // Baú de tesouro eventual
      if (rng() < 0.0085 * skill * 1.4) {
        eggs += 25;
        crystals += 1;
      }
    }

    // Chefe derrotado eventual em boas corridas (~45% em 3 min)
    const bossCount = durationSec > 165 && rng() < 0.45 * (skill / 0.56) ? 1 : 0;
    if (bossCount > 0) {
      eggs += 55;
      crystals += 3;
    }

    // Bônus médio de missão diária diluído (~20 ovos/corrida)
    eggs += rng() < 0.3 ? 65 : 0;

    const per3Min = Math.round((eggs / durationSec) * 180);
    runs.push({ eggs, per3Min, crystals, tier1, tier5, tier25, durationSec });
  }

  const avgEggs = Math.round(runs.reduce((s, r) => s + r.eggs, 0) / runCount);
  const avgPer3Min = Math.round(runs.reduce((s, r) => s + r.per3Min, 0) / runCount);
  const minPer3Min = Math.min(...runs.map((r) => r.per3Min));
  const maxPer3Min = Math.max(...runs.map((r) => r.per3Min));
  const avgCrystals = Number((runs.reduce((s, r) => s + r.crystals, 0) / runCount).toFixed(2));

  // Teste explícito de zero farm infinito no Ovo Misterioso completo
  const mysteryNetOnComplete = MYSTERY_EGG_DUP_REFUND - MYSTERY_EGG_COST;
  const upgradeCosts = Array.from({ length: 9 }, (_, lvl) => ProgressionManager.getSkillUpgradeCost(lvl + 1));

  return {
    runCount,
    avgEggs,
    avgPer3Min,
    minPer3Min,
    maxPer3Min,
    avgCrystals,
    runsToTier: {
      150: Number((150 / Math.max(1, avgPer3Min)).toFixed(1)),
      600: Number((600 / Math.max(1, avgPer3Min)).toFixed(1)),
      2500: Number((2500 / Math.max(1, avgPer3Min)).toFixed(1)),
      10000: Number((10000 / Math.max(1, avgPer3Min)).toFixed(1))
    },
    mysteryCost: MYSTERY_EGG_COST,
    mysteryCompleteRefund: MYSTERY_EGG_DUP_REFUND,
    mysteryNetOnComplete,
    infiniteFarmBlocked: mysteryNetOnComplete < 0,
    inTargetBand150to400: avgPer3Min >= 150 && avgPer3Min <= 400,
    upgradeCosts,
    totalBosses: Object.keys(BOSS_DEFS).length
  };
}
