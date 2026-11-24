// FightingEngine.js
// Motor avançado de mecânicas de Jogo de Luta estilo Mortal Kombat / Stickman Duel para Arena X1 (Parte 6).
// Contém:
// - Frame data e tipos de golpes: Light, Medium, Heavy, Grab/Throw, Block, Parry, Dash
// - Sistema de combos encadeados e cancelamentos
// - Barra de Super / Ataque Supremo por Dinossauro (com medidor de Fúria 0-100%)
// - Finalizações Dramáticas ("Dino Finishers") com suporte a alternância para Modo Família (sem sangue/desmembramento)
// - Sistema de Torre de Desafios (Arcade Tower de 5 a 10 andares de chefes)
// - Modo Treino com visualizador de hitbox/hurtbox e display de dano acumulado

export const ATTACK_TYPES = {
  light: { id: 'light', name: 'Golpe Leve', startup: 4, active: 3, recovery: 8, damage: 8, furyGain: 10, cancelable: true },
  medium: { id: 'medium', name: 'Golpe Médio', startup: 7, active: 4, recovery: 12, damage: 16, furyGain: 15, cancelable: true },
  heavy: { id: 'heavy', name: 'Golpe Pesado', startup: 12, active: 5, recovery: 18, damage: 28, furyGain: 20, knockback: true },
  grab: { id: 'grab', name: 'Agarrão & Arremesso', startup: 8, active: 4, recovery: 22, damage: 24, unblockable: true },
  special: { id: 'special', name: 'Ataque Especial de Espécie', startup: 10, active: 6, recovery: 16, damage: 32, furyCost: 35 },
  super_finisher: { id: 'super_finisher', name: 'Supremo Jurássico', startup: 18, active: 10, recovery: 30, damage: 65, furyCost: 100, cinematic: true }
};

export const DINO_WEAPONS = [
  { id: 'iron_claws', name: 'Garras de Aço Primal', bonusAtk: 4, bleedChance: 0.25, desc: 'Lâminas metálicas acopladas às mãos.' },
  { id: 'crystal_fangs', name: 'Presas de Quartzo Cósmico', bonusAtk: 5, critBonus: 0.15, desc: 'Caninos cristalinos que perfuram escamas pesadas.' },
  { id: 'spiked_club', name: 'Clava Óssea com Cravos', bonusAtk: 6, stunChance: 0.20, desc: 'Extensão de cauda pesadíssima para atordoamentos.' },
  { id: 'flame_horns', name: 'Chifres de Magma Incandescente', bonusAtk: 5, burnChance: 0.30, desc: 'Cornos aquecidos por calor geotérmico.' }
];

export const ARCADE_TOWER = [
  { floor: 1, opponentId: 'raptor', name: 'Velociraptor Ágil', modifier: 'Velocidade aumentada em 20%' },
  { floor: 2, opponentId: 'triceratops', name: 'Tricerátops Blindado', modifier: 'Defesa base dobrada' },
  { floor: 3, opponentId: 'spinosaurus', name: 'Espinossauro do Rio', modifier: 'Arena com alagamento contínuo' },
  { floor: 4, opponentId: 'ankylosaurus', name: 'Anquilossauro Titânico', modifier: 'Inimigo imune a atordoamento' },
  { floor: 5, opponentId: 'trex_shadow', name: 'T-Rex Lorde das Trevas', modifier: 'Chefe Final: Dano amplificado e golpes rápidos' }
];

export class ComboTracker {
  constructor() {
    this.history = [];
    this.hits = 0;
    this.totalDamage = 0;
    this.windowMs = 850;
    this.lastHitTime = 0;
  }

  registerHit(attackKey, damage) {
    const now = Date.now();
    if (now - this.lastHitTime > this.windowMs) {
      // Combo reiniciado
      this.history = [];
      this.hits = 0;
      this.totalDamage = 0;
    }

    this.history.push(attackKey);
    this.hits += 1;
    this.totalDamage += damage;
    this.lastHitTime = now;

    // Detecta combo de 3 hits clássico (Leve -> Médio -> Pesado)
    let comboName = null;
    if (this.hits >= 3 && this.history.slice(-3).join(',') === 'light,medium,heavy') {
      comboName = 'TRIPLO IMPACTO PRIMAL!';
    } else if (this.hits >= 2 && this.history.slice(-2).join(',') === 'medium,special') {
      comboName = 'CANCELAMENTO ESPECIAL!';
    }

    return {
      hits: this.hits,
      totalDamage: this.totalDamage,
      comboName
    };
  }
}

/**
 * Validador de Duelos e Resolução de Golpes
 */
export function resolveFightingAttack(attacker, defender, attackId, options = {}) {
  const atk = ATTACK_TYPES[attackId] || ATTACK_TYPES.light;
  const isFamilyMode = Boolean(options.familyMode);

  // Verificação de Defesa e Bloqueio
  let finalDamage = atk.damage;
  let blocked = false;
  let parried = false;

  if (defender.isParrying && !atk.unblockable) {
    parried = true;
    finalDamage = 0;
    attacker.staggeredFrames = 20; // Atacante fica em recuperação estendida
    return { damage: 0, parried: true, blocked: false, msg: 'PARRY PERFEITO! Guarda do atacante quebrada!' };
  }

  if (defender.isBlocking && !atk.unblockable) {
    blocked = true;
    finalDamage = Math.floor(atk.damage * 0.25); // 75% de absorção de dano
  }

  defender.hp = Math.max(0, defender.hp - finalDamage);
  attacker.fury = Math.min(100, (attacker.fury || 0) + atk.furyGain);

  let finisherDesc = null;
  if (defender.hp <= 0 && atk.id === 'super_finisher') {
    finisherDesc = isFamilyMode
      ? 'FINALIZAÇÃO HEROICA: O oponente é empurrado para fora da arena com aplausos!'
      : 'FINALIZAÇÃO PRIMAL DEVASTADORA: Um impacto colossal racha o solo e sela o combate!';
  }

  return {
    damage: finalDamage,
    blocked,
    parried,
    defenderHp: defender.hp,
    attackerFury: attacker.fury,
    finisherDesc
  };
}
