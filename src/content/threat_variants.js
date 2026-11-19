// Matriz data-driven de Variantes de Ameaça: Encontros de Predadores Alfa + Afixos de Chefes.
// Contrato §2 (docs/CONTRATOS_EXPANSAO.md):
// - Todas as entradas possuem { id: string único, kind: 'threat', category, name, ... }
// - PREDATOR_ENCOUNTER_VARIANTS >= 80 entradas
// - BOSS_AFFIX_VARIANTS >= 120 entradas
import bossesData from './bosses.json' with { type: 'json' };
import { PREDATOR_CATALOG, PREDATOR_HUNT_MUTATORS } from '../events/PredatorModels.js';

export const BOSS_AFFIXES = [
  {
    id: 'enraged',
    name: 'Enfurecido',
    badge: '🔥',
    color: '#ef4444',
    hpMult: 1.0,
    damageTakenMult: 1.0,
    telegraphMult: 0.86,
    idleMult: 0.82,
    extraObs: null,
    vampiricHealPct: 0,
    extraLaneHazard: false,
    desc: 'Telegrafia mais curta e menor pausa entre ataques.'
  },
  {
    id: 'armored',
    name: 'Blindado',
    badge: '🛡️',
    color: '#94a3b8',
    hpMult: 1.08,
    damageTakenMult: 0.88,
    telegraphMult: 1.0,
    idleMult: 1.0,
    extraObs: null,
    vampiricHealPct: 0,
    extraLaneHazard: false,
    desc: 'Carapaça reforçada reduz dano recebido fora do Ponto Fraco.'
  },
  {
    id: 'shadow',
    name: 'Sombrio',
    badge: '🌑',
    color: '#7c3aed',
    hpMult: 1.0,
    damageTakenMult: 1.0,
    telegraphMult: 0.88,
    idleMult: 0.92,
    extraObs: 'teia',
    vampiricHealPct: 0,
    extraLaneHazard: false,
    desc: 'Ataques elevados frequentes e teias de sombra na pista.'
  },
  {
    id: 'stormy',
    name: 'Tempestuoso',
    badge: '⚡',
    color: '#facc15',
    hpMult: 1.0,
    damageTakenMult: 1.0,
    telegraphMult: 0.92,
    idleMult: 0.9,
    extraObs: 'raio',
    vampiricHealPct: 0,
    extraLaneHazard: false,
    desc: 'Adiciona raios de alta velocidade ao perfil de ataque.'
  },
  {
    id: 'summoner',
    name: 'Convocador',
    badge: '🐺',
    color: '#f97316',
    hpMult: 1.0,
    damageTakenMult: 1.0,
    telegraphMult: 0.96,
    idleMult: 0.95,
    extraObs: null,
    vampiricHealPct: 0,
    extraLaneHazard: true,
    desc: 'Convoca obstáculos extras respeitando minSafePaths.'
  },
  {
    id: 'vampiric',
    name: 'Vampírico',
    badge: '🩸',
    color: '#e11d48',
    hpMult: 1.0,
    damageTakenMult: 1.0,
    telegraphMult: 0.95,
    idleMult: 0.95,
    extraObs: null,
    vampiricHealPct: 0.04,
    extraLaneHazard: false,
    desc: 'Recupera 4% do HP máximo sempre que acerta um jogador.'
  },
  {
    id: 'molten',
    name: 'Fundido',
    badge: '🌋',
    color: '#ea580c',
    hpMult: 1.04,
    damageTakenMult: 1.0,
    telegraphMult: 0.94,
    idleMult: 0.92,
    extraObs: 'magma',
    vampiricHealPct: 0,
    extraLaneHazard: false,
    desc: 'Erige pilares de magma ardente durante as investidas.'
  },
  {
    id: 'glacial',
    name: 'Glacial',
    badge: '❄️',
    color: '#38bdf8',
    hpMult: 1.04,
    damageTakenMult: 0.95,
    telegraphMult: 0.96,
    idleMult: 0.96,
    extraObs: 'gelo',
    vampiricHealPct: 0,
    extraLaneHazard: false,
    desc: 'Lança estalactites congelantes de alto alcance vertical.'
  },
  {
    id: 'arcane',
    name: 'Arcano',
    badge: '✨',
    color: '#c084fc',
    hpMult: 1.02,
    damageTakenMult: 1.0,
    telegraphMult: 0.9,
    idleMult: 0.9,
    extraObs: 'feixe',
    vampiricHealPct: 0,
    extraLaneHazard: false,
    desc: 'Dispara feixes orbitais imprevisíveis entre fases.'
  },
  {
    id: 'colossal',
    name: 'Colossal',
    badge: '🗿',
    color: '#78716c',
    hpMult: 1.12,
    damageTakenMult: 0.94,
    telegraphMult: 1.02,
    idleMult: 0.96,
    extraObs: 'onda',
    vampiricHealPct: 0,
    extraLaneHazard: false,
    desc: 'Maior reserva de vida e ondas sísmicas amplas.'
  }
];

export function getBossAffix(id) {
  if (!id) return null;
  return BOSS_AFFIXES.find((a) => a.id === id) || null;
}

export function rollBossAffix(difficultyId = 'normal', dangerTier = 1, rng = Math.random) {
  // Em Normal padrão (tier <= 2), mantém boss sem afixo para garantir meta 60-90s limpa;
  // em Difícil+, Supremo, Raid ou Danger Tier alto, aplica afixos progressivamente.
  const chance =
    difficultyId === 'supreme' ? 1.0 :
    difficultyId === 'insane' ? 0.9 :
    difficultyId === 'hard' ? 0.7 :
    dangerTier >= 4 ? 0.55 : 0;
  if (rng() > chance) return null;
  const idx = Math.floor(rng() * BOSS_AFFIXES.length);
  return BOSS_AFFIXES[idx] || null;
}

const SIGNATURE_ATTACKS = [
  { id: 'lane_lunge', name: 'Bote de Faixa', weight: 1.0 },
  { id: 'venom_spit', name: 'Cuspe Ácido', weight: 1.05 },
  { id: 'roar_wave', name: 'Onda de Rugido', weight: 1.1 },
  { id: 'flank_cut', name: 'Corte de Flanco', weight: 1.15 },
  { id: 'pack_call', name: 'Chamado da Matilha', weight: 1.3 }
];

/**
 * Matriz Predador × Mutador × Ataque Assinatura.
 * 27 predadores × 5 ataques (pareados deterministicamente com mutadores) = 135 entradas únicas (>= 80).
 */
export const PREDATOR_ENCOUNTER_VARIANTS = (() => {
  const list = [];
  for (let pIdx = 0; pIdx < PREDATOR_CATALOG.length; pIdx++) {
    const pred = PREDATOR_CATALOG[pIdx];
    for (let aIdx = 0; aIdx < SIGNATURE_ATTACKS.length; aIdx++) {
      const atk = SIGNATURE_ATTACKS[aIdx];
      const mut = PREDATOR_HUNT_MUTATORS[(pIdx * 3 + aIdx * 2) % PREDATOR_HUNT_MUTATORS.length];
      list.push({
        id: `threat_pred_${pred.id}_${mut.id}_${atk.id}`,
        kind: 'threat',
        category: 'predator_encounter',
        name: `${pred.name} ${mut.name} (${atk.name})`,
        predatorId: pred.id,
        habitat: pred.habitat || 'land',
        biome: pred.biome,
        mutatorId: mut.id,
        signatureAttack: atk.id,
        dangerWeight: Number((atk.weight * (mut.paceMult || 1.0) * (pred.alpha ? 1.15 : 1.0)).toFixed(2)),
        description: `${pred.title} com mutador ${mut.name}: ${mut.desc}`
      });
    }
  }
  return list;
})();

/**
 * Matriz Chefe × Afixo.
 * 20 bosses × 10 afixos = 200 entradas únicas (>= 120).
 */
export const BOSS_AFFIX_VARIANTS = (() => {
  const list = [];
  for (let bIdx = 0; bIdx < bossesData.length; bIdx++) {
    const boss = bossesData[bIdx];
    for (let aIdx = 0; aIdx < BOSS_AFFIXES.length; aIdx++) {
      const affix = BOSS_AFFIXES[aIdx];
      list.push({
        id: `threat_boss_${boss.id}_${affix.id}`,
        kind: 'threat',
        category: 'boss_affix',
        name: `${boss.name} ${affix.name}`,
        bossId: boss.id,
        biomeId: boss.biomeId,
        affixId: affix.id,
        affixName: affix.name,
        badge: affix.badge,
        hpMult: affix.hpMult,
        telegraphMult: affix.telegraphMult,
        dangerWeight: Number(((boss.hp || 6) * affix.hpMult / Math.max(0.7, affix.telegraphMult) * 0.25).toFixed(2)),
        description: `${boss.title} com afixo ${affix.name}: ${affix.desc}`
      });
    }
  }
  return list;
})();
