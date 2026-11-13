// Sistema de cartas por marco de score (500, 1500, 3000, 5000...), raridades, reroll e sinergias.

export const CARD_MILESTONES = [500, 1500, 3000, 5000, 7500, 10500, 14000, 18000, 23000];

export const CARD_POOL = [
  {
    id: 'high_jump',
    name: 'Molas Jurássicas',
    rarity: 'comum',
    desc: '+15% altura de pulo.',
    apply: (p) => { p.jumpMult = (p.jumpMult || 1) * 1.15; }
  },
  {
    id: 'extra_shield',
    name: 'Escama Blindada',
    rarity: 'comum',
    desc: 'Ganha +1 Escudo imediato.',
    apply: (p) => { p.shields = Math.min(4, p.shields + 1); }
  },
  {
    id: 'egg_magnet',
    name: 'Ímã Pré-Histórico',
    rarity: 'comum',
    desc: 'Atrai ovos mais de longe permanentemente.',
    apply: (p) => { p.permanentMagnet = (p.permanentMagnet || 0) + 2.4; }
  },
  {
    id: 'fast_dash',
    name: 'Reflexos de Raptor',
    rarity: 'rara',
    desc: 'Troca de faixa 35% mais rápida + recarga menor.',
    apply: (p) => {
      p.laneSpeedMult = (p.laneSpeedMult || 1) * 1.35;
      p.cooldownMult = (p.cooldownMult || 1) * 0.85;
    }
  },
  {
    id: 'cooldown_cut',
    name: 'Fôlego Infinito',
    rarity: 'rara',
    desc: 'Reduz recarga da habilidade em 25%.',
    apply: (p) => { p.cooldownMult = (p.cooldownMult || 1) * 0.75; }
  },
  {
    id: 'life_plus',
    name: 'Coração Ancestral',
    rarity: 'rara',
    desc: '+1 Vida máxima e cura 1 vida.',
    apply: (p) => {
      p.maxHp = Math.min(7, p.maxHp + 1);
      p.hp = Math.min(p.maxHp, p.hp + 1);
    }
  },
  {
    id: 'score_boost',
    name: 'Instinto Alfa',
    rarity: 'rara',
    desc: '+25% de pontos ganhos em tudo.',
    apply: (p) => { p.scoreCardMult = (p.scoreCardMult || 1) * 1.25; }
  },
  {
    id: 'tiny_dino',
    name: 'Furtividade Ágil',
    rarity: 'épica',
    desc: 'Tamanho e hitbox 20% menores.',
    apply: (p) => { p.smallHitbox = true; p.cardScaleMult = (p.cardScaleMult || 1) * 0.84; }
  },
  {
    id: 'half_damage',
    name: 'Casco Titânico',
    rarity: 'épica',
    desc: 'Ganha +2 Escudos e invulnerabilidade maior após dano.',
    apply: (p) => { p.shields += 2; p.postHitInvulnBonus = 1.0; }
  },
  {
    id: 'turbo_skill',
    name: 'Habilidade Turbinada',
    rarity: 'épica',
    desc: 'Duração e força da habilidade +45%.',
    apply: (p) => { p.abilityPowerMult = (p.abilityPowerMult || 1) * 1.45; }
  },
  {
    id: 'egg_rain',
    name: 'Chuva de Ovos',
    rarity: 'lendária',
    desc: 'Chove 25 ovos na pista e dobra bônus de cadeia.',
    apply: (p, ctx) => {
      p.eggValueMult = (p.eggValueMult || 1) * 2;
      ctx?.spawnEggRain?.(25);
    }
  },
  {
    id: 'slow_chronos',
    name: 'Ampulheta Jurássica',
    rarity: 'lendária',
    desc: 'Ativa 6s de câmera lenta e recarrega Bullet-Time.',
    apply: (p, ctx) => {
      p.bulletEnergy = 100;
      if (ctx) ctx.slowMoTimer = 6.0;
    }
  },
  {
    id: 'curse_fury',
    name: 'Maldição da Fúria',
    rarity: 'maldição',
    desc: '+65% Pontos e Fúria enche 2x mais rápido, mas -1 Vida máxima.',
    apply: (p) => {
      p.scoreCardMult = (p.scoreCardMult || 1) * 1.65;
      p.furyChargeMult = (p.furyChargeMult || 1) * 2.0;
      p.maxHp = Math.max(1, p.maxHp - 1);
      p.hp = Math.min(p.hp, p.maxHp);
    }
  }
];

export function drawThreeCards(allowCurses = false) {
  const pool = allowCurses
    ? CARD_POOL
    : CARD_POOL.filter((c) => c.rarity !== 'maldição');
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
