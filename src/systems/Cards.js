// Sistema de cartas por marco progressivo de score (1000, 2500, 4800, 8000...),
// Pactos Jurássicos (bônus + penalidade obrigatória) e blindagem de caps rígidos
// para Modo Perfeito e Supremo (impede builds invencíveis).
import { ContentLoader } from '../content/ContentLoader.js';
import { HELPER_VARIANTS } from '../content/catalog_expanded.js';

export const CARD_MILESTONES = [1000, 2500, 4800, 8000, 12200, 17600, 24400, 32800, 43000];

export function getCardMilestone(index = 0) {
  const idx = Math.max(0, Math.floor(index));
  if (idx < CARD_MILESTONES.length) return CARD_MILESTONES[idx];
  let last = CARD_MILESTONES[CARD_MILESTONES.length - 1];
  const extraSteps = idx - CARD_MILESTONES.length + 1;
  for (let s = 1; s <= extraSteps; s++) {
    last += 10200 + s * 2200;
  }
  return last;
}

export function getPlayerCaps(player = {}, difficultyId = null) {
  const rawCaps = ContentLoader.getHelpersConfig()?.caps || {};
  const diff = String(difficultyId || player?.difficultyId || 'normal').toLowerCase();
  const isPerfect = !!player?.isPerfectMode;
  const isSupreme = diff === 'supreme';
  const isInsane = diff === 'insane';
  const isHard = diff === 'hard';

  const maxShields = isPerfect || player?.blockShields
    ? 0
    : isSupreme
      ? (rawCaps.maxShieldsSupreme ?? 1)
      : isInsane
        ? (rawCaps.maxShieldsInsane ?? 1)
        : isHard
          ? (rawCaps.maxShieldsHard ?? 2)
          : (rawCaps.maxShieldsNormal ?? 2);

  const maxHp = isPerfect
    ? (rawCaps.maxHpPerfect ?? 1)
    : isSupreme
      ? (rawCaps.maxHpSupreme ?? 3)
      : isInsane
        ? (rawCaps.maxHpInsane ?? 4)
        : isHard
          ? (rawCaps.maxHpHard ?? 4)
          : (rawCaps.maxHpNormal ?? 5);

  return {
    maxShields,
    maxHp,
    maxScoreCardMult: rawCaps.maxScoreCardMult ?? 2.25,
    minCooldownMult: rawCaps.minCooldownMult ?? 0.55,
    maxPostHitInvulnBonus: (isPerfect || isSupreme) ? 0 : (rawCaps.maxPostHitInvulnBonus ?? 0.45),
    maxJumpMult: rawCaps.maxJumpMult ?? 1.35,
    maxLaneSpeedMult: rawCaps.maxLaneSpeedMult ?? 1.65,
    minCardScaleMult: rawCaps.minCardScaleMult ?? 0.85,
    maxAbilityPowerMult: rawCaps.maxAbilityPowerMult ?? 1.85,
    maxEggValueMult: rawCaps.maxEggValueMult ?? 2.0,
    maxFuryChargeMult: rawCaps.maxFuryChargeMult ?? 2.2
  };
}

/**
 * Aplica todos os caps rígidos no jogador após qualquer carta, pacto ou relíquia.
 * Garante que Modo Perfeito nunca tenha escudos ou >1 vida e que nenhum modo fique invencível.
 */
export function enforcePlayerCaps(p, difficultyId = null) {
  if (!p) return p;
  const caps = getPlayerCaps(p, difficultyId);

  if (p.isPerfectMode) {
    p.shields = 0;
    if (typeof p.maxHp === 'number') p.maxHp = Math.min(1, Math.max(1, p.maxHp));
    if (typeof p.hp === 'number') p.hp = Math.min(1, p.hp);
    p.postHitInvulnBonus = 0;
  } else {
    if (typeof p.shields === 'number') {
      p.shields = Math.max(0, Math.min(caps.maxShields, p.shields));
    }
    if (typeof p.maxHp === 'number') {
      p.maxHp = Math.max(1, Math.min(caps.maxHp, p.maxHp));
    }
    if (typeof p.hp === 'number' && typeof p.maxHp === 'number') {
      p.hp = Math.min(p.maxHp, p.hp);
    }
    if (typeof p.postHitInvulnBonus === 'number') {
      p.postHitInvulnBonus = Math.max(0, Math.min(caps.maxPostHitInvulnBonus, p.postHitInvulnBonus));
    }
  }

  if (typeof p.scoreCardMult === 'number') {
    p.scoreCardMult = Math.max(0.5, Math.min(caps.maxScoreCardMult, p.scoreCardMult));
  }
  if (typeof p.cooldownMult === 'number') {
    p.cooldownMult = Math.max(caps.minCooldownMult, Math.min(1.6, p.cooldownMult));
  }
  if (typeof p.jumpMult === 'number') {
    p.jumpMult = Math.max(0.8, Math.min(caps.maxJumpMult, p.jumpMult));
  }
  if (typeof p.laneSpeedMult === 'number') {
    p.laneSpeedMult = Math.max(0.65, Math.min(caps.maxLaneSpeedMult, p.laneSpeedMult));
  }
  if (typeof p.cardScaleMult === 'number') {
    p.cardScaleMult = Math.max(caps.minCardScaleMult, Math.min(1.25, p.cardScaleMult));
  }
  if (typeof p.abilityPowerMult === 'number') {
    p.abilityPowerMult = Math.max(0.75, Math.min(caps.maxAbilityPowerMult, p.abilityPowerMult));
  }
  if (typeof p.eggValueMult === 'number') {
    p.eggValueMult = Math.max(0.6, Math.min(caps.maxEggValueMult, p.eggValueMult));
  }
  if (typeof p.furyChargeMult === 'number') {
    p.furyChargeMult = Math.max(0.6, Math.min(caps.maxFuryChargeMult, p.furyChargeMult));
  }
  return p;
}

export const CARD_POOL = [
  {
    id: 'high_jump',
    name: 'Molas Jurássicas',
    rarity: 'comum',
    allowedInPerfectMode: true,
    desc: '+12% altura de pulo (cap 1.35x) | -5% controle de queda',
    apply: (p, ctx) => {
      p.jumpMult = (p.jumpMult || 1) * 1.12;
      p.staminaCostMult = (p.staminaCostMult || 1) * 1.05;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'extra_shield',
    name: 'Escama Blindada',
    rarity: 'comum',
    grantsShield: true,
    allowedInPerfectMode: false,
    desc: '+1 Escudo (cap rígido; proibido no Perfeito) | -6% vel. de faixa',
    apply: (p, ctx) => {
      if (!p.isPerfectMode && !p.blockShields) {
        const caps = getPlayerCaps(p, ctx?.difficultyId);
        p.shields = Math.min(caps.maxShields, (p.shields || 0) + 1);
      }
      p.laneSpeedMult = (p.laneSpeedMult || 1) * 0.94;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'egg_magnet',
    name: 'Ímã Pré-Histórico',
    rarity: 'comum',
    allowedInPerfectMode: true,
    desc: '+2.0 alcance de ímã de ovos | -5% carga de fúria',
    apply: (p, ctx) => {
      p.permanentMagnet = Math.min(5.0, (p.permanentMagnet || 0) + 2.0);
      p.furyChargeMult = (p.furyChargeMult || 1) * 0.95;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'fast_dash',
    name: 'Reflexos de Raptor',
    rarity: 'rara',
    allowedInPerfectMode: true,
    desc: '+20% vel. de faixa & -10% recarga | +8% gasto de estamina',
    apply: (p, ctx) => {
      p.laneSpeedMult = (p.laneSpeedMult || 1) * 1.2;
      p.cooldownMult = (p.cooldownMult || 1) * 0.9;
      p.staminaCostMult = (p.staminaCostMult || 1) * 1.08;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'cooldown_cut',
    name: 'Fôlego Tático',
    rarity: 'rara',
    allowedInPerfectMode: true,
    desc: '-16% tempo de recarga (mín. 0.55x) | -8% valor de ovos',
    apply: (p, ctx) => {
      p.cooldownMult = (p.cooldownMult || 1) * 0.84;
      p.eggValueMult = (p.eggValueMult || 1) * 0.92;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'life_plus',
    name: 'Coração Ancestral',
    rarity: 'rara',
    grantsLife: true,
    allowedInPerfectMode: false,
    desc: '+1 Vida máx. (cap rígido; bloqueado no Perfeito) | -10% score',
    apply: (p, ctx) => {
      if (!p.isPerfectMode) {
        const caps = getPlayerCaps(p, ctx?.difficultyId);
        p.maxHp = Math.min(caps.maxHp, (p.maxHp || 3) + 1);
        p.hp = Math.min(p.maxHp, (p.hp || 1) + 1);
      }
      p.scoreCardMult = (p.scoreCardMult || 1) * 0.9;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'score_boost',
    name: 'Instinto Alfa',
    rarity: 'rara',
    allowedInPerfectMode: true,
    desc: '+18% pontos (cap 2.25x) | +12% duração de debuffs',
    apply: (p, ctx) => {
      p.scoreCardMult = (p.scoreCardMult || 1) * 1.18;
      p.debuffDurationMult = (p.debuffDurationMult || 1) * 1.12;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'tiny_dino',
    name: 'Furtividade Ágil',
    rarity: 'épica',
    allowedInPerfectMode: true,
    desc: '-12% hitbox (mín. 0.85x) | -8% altura de pulo',
    apply: (p, ctx) => {
      p.smallHitbox = true;
      p.cardScaleMult = (p.cardScaleMult || 1) * 0.88;
      p.jumpMult = (p.jumpMult || 1) * 0.92;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'half_damage',
    name: 'Casco Titânico',
    rarity: 'épica',
    grantsShield: true,
    allowedInPerfectMode: false,
    desc: '+1 Escudo & +0.3s invuln pós-hit (proibido no Perfeito) | -10% vel. de faixa',
    apply: (p, ctx) => {
      if (!p.isPerfectMode && !p.blockShields) {
        const caps = getPlayerCaps(p, ctx?.difficultyId);
        p.shields = Math.min(caps.maxShields, (p.shields || 0) + 1);
        p.postHitInvulnBonus = Math.min(caps.maxPostHitInvulnBonus, (p.postHitInvulnBonus || 0) + 0.3);
      }
      p.laneSpeedMult = (p.laneSpeedMult || 1) * 0.9;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'turbo_skill',
    name: 'Habilidade Turbinada',
    rarity: 'épica',
    allowedInPerfectMode: true,
    desc: '+25% força do poder (cap 1.85x) | +12% recarga',
    apply: (p, ctx) => {
      p.abilityPowerMult = (p.abilityPowerMult || 1) * 1.25;
      p.cooldownMult = (p.cooldownMult || 1) * 1.12;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'egg_rain',
    name: 'Chuva de Ovos',
    rarity: 'lendária',
    allowedInPerfectMode: true,
    desc: '+10 ovos agora & +25% valor de ovos | +15% agressividade de predadores',
    apply: (p, ctx) => {
      p.eggValueMult = (p.eggValueMult || 1) * 1.25;
      p.predatorAggroBonus = (p.predatorAggroBonus || 0) + 0.15;
      ctx?.spawnEggRain?.(10);
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'slow_chronos',
    name: 'Ampulheta Jurássica',
    rarity: 'lendária',
    allowedInPerfectMode: true,
    desc: '3.5s câmera lenta & +60% Estamina | -10% score por esta corrida',
    apply: (p, ctx) => {
      p.stamina = Math.min(100, (p.stamina || 0) + 60);
      p.scoreCardMult = (p.scoreCardMult || 1) * 0.9;
      if (ctx) ctx.slowMoTimer = Math.min(4.0, Math.max(ctx.slowMoTimer || 0, 3.5));
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'curse_fury',
    name: 'Pacto da Fúria',
    rarity: 'maldição',
    isPact: true,
    allowedInPerfectMode: true,
    desc: '+35% Pontos & +50% carga de Fúria | -1 Vida máxima obrigatória',
    apply: (p, ctx) => {
      p.scoreCardMult = (p.scoreCardMult || 1) * 1.35;
      p.furyChargeMult = (p.furyChargeMult || 1) * 1.5;
      if (typeof p.maxHp === 'number') {
        p.maxHp = Math.max(1, p.maxHp - 1);
        if (typeof p.hp === 'number') p.hp = Math.min(p.hp, p.maxHp);
      }
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'pact_glass_cannon',
    name: 'Pacto do Canhão de Vidro',
    rarity: 'maldição',
    isPact: true,
    allowedInPerfectMode: true,
    desc: '+40% dano contra bosses & +20% pontos | Zera e proíbe escudos',
    apply: (p, ctx) => {
      p.attackDamageMult = Math.min(2.0, (p.attackDamageMult || 1) * 1.4);
      p.scoreCardMult = (p.scoreCardMult || 1) * 1.2;
      p.blockShields = true;
      p.shields = 0;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  },
  {
    id: 'pact_apex_risk',
    name: 'Pacto do Ápice',
    rarity: 'maldição',
    isPact: true,
    allowedInPerfectMode: true,
    desc: '+28% pontos & -15% recarga | +20% duração de debuffs',
    apply: (p, ctx) => {
      p.scoreCardMult = (p.scoreCardMult || 1) * 1.28;
      p.cooldownMult = (p.cooldownMult || 1) * 0.85;
      p.debuffDurationMult = (p.debuffDurationMult || 1) * 1.2;
      enforcePlayerCaps(p, ctx?.difficultyId);
    }
  }
];

export function getHelperCardPool() {
  return HELPER_VARIANTS.filter((h) => h.category === 'card' || h.category === 'pact');
}

export function applyHelperVariant(variant, p, ctx = null) {
  if (!variant || !p) return false;
  if (p.isPerfectMode && variant.allowedInPerfectMode === false) {
    return false;
  }
  if (variant.stat === 'shields') {
    if (!p.isPerfectMode && !p.blockShields) {
      p.shields = (p.shields || 0) + Math.round(variant.bonusVal || 1);
    }
  } else if (variant.stat === 'maxHp') {
    if (!p.isPerfectMode) {
      p.maxHp = (p.maxHp || 3) + Math.round(variant.bonusVal || 1);
      p.hp = (p.hp || 1) + 1;
    }
  } else if (variant.stat && typeof variant.bonusVal === 'number') {
    const base = typeof p[variant.stat] === 'number' ? p[variant.stat] : 1;
    p[variant.stat] = base + variant.bonusVal;
  }

  if (variant.penaltyStat === 'blockShields') {
    p.blockShields = true;
    p.shields = 0;
  } else if (variant.penaltyStat === 'maxHp') {
    p.maxHp = Math.max(1, (p.maxHp || 3) + Math.round(variant.penaltyVal || -1));
    if (typeof p.hp === 'number') p.hp = Math.min(p.hp, p.maxHp);
  } else if (variant.penaltyStat && typeof variant.penaltyVal === 'number') {
    const base = typeof p[variant.penaltyStat] === 'number' ? p[variant.penaltyStat] : 1;
    p[variant.penaltyStat] = base + variant.penaltyVal;
  }

  enforcePlayerCaps(p, ctx?.difficultyId);
  return true;
}

export function drawThreeCards(allowCurses = false, playerOrOpts = null) {
  const isPerfect = !!(playerOrOpts?.isPerfectMode || playerOrOpts?.perfectMode);
  const blockShields = !!(isPerfect || playerOrOpts?.blockShields);

  const pool = CARD_POOL.filter((c) => {
    if (!allowCurses && c.rarity === 'maldição') return false;
    if (isPerfect && (c.allowedInPerfectMode === false || c.grantsShield || c.grantsLife)) return false;
    if (blockShields && c.grantsShield) return false;
    return true;
  });

  const picked = [];
  const used = new Set();
  while (picked.length < 3 && used.size < pool.length) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(candidate.id)) {
      used.add(candidate.id);
      picked.push(candidate);
    }
  }
  return picked;
}
