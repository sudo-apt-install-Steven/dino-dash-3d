// Motor de Luta 2.5D / 3D Estilo Mortal Kombat 11 & Stickman Weapon Duel para Arena X1 (Parte 6).
// Inclui Frame Data real (Startup / Active / Recovery / Hitstop), Combos Encadeados, Tabela de Comandos,
// Especiais Únicos por Arquétipo de Dino, Ataque Supremo, Modo Família (desativa finalização dramática)
// e Câmera Lateral Cinematográfica Dinâmica com Zoom, Hitstop e Tremor Amortecido.

export const FIGHTING_MOVES = Object.freeze({
  light: {
    id: 'light', name: 'Garra Rápida', startup: 6, active: 4, recovery: 9,
    damage: 7, chipDamage: 1, meterGain: 8, meterCost: 0, hitstun: 14, blockstun: 9,
    hitstopMs: 55, knockback: 0.9, range: 2.3, canChainInto: ['light', 'medium', 'heavy', 'special']
  },
  medium: {
    id: 'medium', name: 'Mordida Cruzada', startup: 10, active: 5, recovery: 14,
    damage: 13, chipDamage: 2, meterGain: 13, meterCost: 0, hitstun: 19, blockstun: 12,
    hitstopMs: 75, knockback: 1.6, range: 2.75, canChainInto: ['heavy', 'special', 'super']
  },
  heavy: {
    id: 'heavy', name: 'Chicote Demolidor', startup: 16, active: 6, recovery: 21,
    damage: 21, chipDamage: 4, meterGain: 18, meterCost: 0, hitstun: 26, blockstun: 16,
    hitstopMs: 105, knockback: 3.1, launcher: true, range: 3.25, canChainInto: ['special', 'super']
  },
  grab: {
    id: 'grab', name: 'Agarrão Predador', startup: 8, active: 3, recovery: 18,
    damage: 15, unblockable: true, meterGain: 12, meterCost: 0, hitstun: 24,
    hitstopMs: 90, knockback: 2.4, range: 1.85, canChainInto: []
  },
  env_strike: {
    id: 'env_strike', name: 'Impacto de Pilar da Arena', startup: 14, active: 6, recovery: 20,
    damage: 24, chipDamage: 5, meterGain: 20, meterCost: 0, hitstun: 28,
    hitstopMs: 115, knockback: 3.6, range: 3.4, canChainInto: ['super']
  },
  special: {
    id: 'special', name: 'Técnica Ancestral da Espécie', startup: 12, active: 7, recovery: 18,
    damage: 26, chipDamage: 5, meterGain: 0, meterCost: 35, hitstun: 28, blockstun: 14,
    hitstopMs: 110, knockback: 3.2, range: 3.6, canChainInto: ['super']
  },
  super: {
    id: 'super', name: 'Extinção Suprema (Super)', startup: 14, active: 10, recovery: 24,
    damage: 42, chipDamage: 9, meterGain: 0, meterCost: 100, hitstun: 38, blockstun: 20,
    hitstopMs: 165, knockback: 4.8, cinematic: true, range: 4.2, canChainInto: []
  },
  finisher: {
    id: 'finisher', name: 'Rugido Soberano (Finalização)', startup: 18, active: 12, recovery: 30,
    damage: 999, meterCost: 0, hitstopMs: 200, knockback: 5.5, cinematic: true, range: 4.0, canChainInto: []
  }
});

export const FIGHTING_COMBO_TABLE = Object.freeze([
  { id: 'raptor_rush',    name: 'Fúria Veloz',          sequence: ['light', 'light', 'medium'],        bonusDamage: 5,  hint: 'Leve → Leve → Médio' },
  { id: 'apex_crusher',   name: 'Quebra-Crânio Alfa',   sequence: ['light', 'medium', 'heavy'],        bonusDamage: 9,  hint: 'Leve → Médio → Pesado (Lança ao ar)' },
  { id: 'primal_tempest', name: 'Tempestade Jurássica', sequence: ['medium', 'heavy', 'special'],      bonusDamage: 14, hint: 'Médio → Pesado → Especial (35% Energia)' },
  { id: 'meteor_extinction', name: 'Combo Extinção',    sequence: ['light', 'medium', 'heavy', 'super'], bonusDamage: 22, hint: 'Leve → Médio → Pesado → Supremo (100% Energia)' }
]);

const SPECIES_SPECIAL_STYLES = Object.freeze({
  trex:            { name: 'Mordida Sísmica do Rei',     archetype: 'bite_slam',   color: '#f59e0b' },
  spinosaurus:     { name: 'Vórtice Hidrodinâmico',      archetype: 'sail_slash',  color: '#06b6d4' },
  triceratops:     { name: 'Investida de Três Chifres',  archetype: 'horn_charge', color: '#10b981' },
  stegosaurus:     { name: 'Giro Thagomizer',            archetype: 'tail_spin',   color: '#84cc16' },
  ankylosaurus:    { name: 'Martelo Tectônico',          archetype: 'club_smash',  color: '#d97706' },
  scary_monsters:  { name: 'Frenesi Fóssil (Stand Rush)',archetype: 'raptor_barrage', color: '#38bdf8' }
});

export function getSpeciesSpecialMeta(dinoId = 'trex') {
  return SPECIES_SPECIAL_STYLES[dinoId] || {
    name: 'Investida Feroz Primordial',
    archetype: 'claw_blitz',
    color: '#fbbf24'
  };
}

/**
 * Controlador por lutador de Frame Data (60 Hz), Combos Encadeados e Pose Procedural 3D.
 */
export class FightingAnimator {
  constructor(dinoModel, { dinoId = 'trex', weaponSpec = null, familyMode = true } = {}) {
    this.model = dinoModel;
    this.dinoId = dinoId;
    this.weapon = weaponSpec;
    this.familyMode = familyMode;

    this.currentMove = null;
    this.moveFrame = 0;
    this.hitRegistered = false;
    this.comboHistory = [];
    this.comboResetTimer = 0;
    this.blocking = false;
    this.crouching = false;
    this.dodgingTimer = 0;
    this.hitstopTimer = 0;
  }

  canExecuteMove(moveId, currentMeter = 0) {
    const move = FIGHTING_MOVES[moveId];
    if (!move) return false;
    if (currentMeter < (move.meterCost || 0)) return false;
    if (!this.currentMove) return true;
    // Cancelamento de combo durante janela Active / início do Recovery
    const phase = this.getPhase();
    if ((phase === 'active' || phase === 'recovery') && this.currentMove.canChainInto?.includes(moveId)) {
      return true;
    }
    return false;
  }

  startMove(moveId, currentMeter = 0) {
    if (!this.canExecuteMove(moveId, currentMeter)) return { started: false };
    const base = FIGHTING_MOVES[moveId];
    const spdMult = this.weapon?.speedMult || 1.0;
    this.currentMove = {
      ...base,
      startup: Math.max(3, Math.round(base.startup / spdMult)),
      damage: Math.round(base.damage * (this.weapon?.damageMult || 1)),
      range: base.range + (this.weapon?.reachBonus || 0)
    };
    this.moveFrame = 0;
    this.hitRegistered = false;
    this.comboHistory.push(moveId);
    if (this.comboHistory.length > 4) this.comboHistory.shift();
    this.comboResetTimer = 1.25;

    const matchedCombo = FIGHTING_COMBO_TABLE.find((c) => {
      if (this.comboHistory.length < c.sequence.length) return false;
      const tail = this.comboHistory.slice(-c.sequence.length);
      return c.sequence.every((step, idx) => step === tail[idx]);
    }) || null;

    return {
      started: true,
      move: this.currentMove,
      meterSpent: base.meterCost || 0,
      matchedCombo
    };
  }

  triggerHitstop(durationMs = 80) {
    this.hitstopTimer = Math.max(this.hitstopTimer, durationMs / 1000);
  }

  getPhase() {
    if (!this.currentMove) return 'neutral';
    const f = this.moveFrame;
    if (f < this.currentMove.startup) return 'startup';
    if (f < this.currentMove.startup + this.currentMove.active) return 'active';
    return 'recovery';
  }

  update(dt) {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return { phase: this.getPhase(), frozenByHitstop: true };
    }
    if (this.dodgingTimer > 0) this.dodgingTimer = Math.max(0, this.dodgingTimer - dt);
    if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer === 0) this.comboHistory.length = 0;
    }

    if (this.currentMove) {
      this.moveFrame += dt * 60;
      const total = this.currentMove.startup + this.currentMove.active + this.currentMove.recovery;
      if (this.moveFrame >= total) {
        this.currentMove = null;
        this.moveFrame = 0;
      }
    }

    this._applyProceduralKeyframes();
    return { phase: this.getPhase(), frozenByHitstop: false };
  }

  _applyProceduralKeyframes() {
    const m = this.model;
    if (!m?.torso || !m?.rig) return;
    const phase = this.getPhase();

    if (!this.currentMove) {
      m.torso.rotation.x = this.blocking ? -0.22 : (this.crouching ? 0.28 : 0);
      m.torso.rotation.y = this.blocking ? 0.35 : 0;
      m.rig.position.y = this.crouching ? -0.26 : 0;
      if (m.jaw) m.jaw.rotation.x = 0;
      return;
    }

    const id = this.currentMove.id;
    if (phase === 'startup') {
      // Antecipação clara (wind-up) para leitura justa do adversário!
      m.torso.rotation.x = -0.24;
      m.torso.rotation.y = id === 'heavy' ? -0.55 : -0.22;
      if (m.jaw) m.jaw.rotation.x = 0.25;
    } else if (phase === 'active') {
      // Extensão explosiva do golpe
      m.torso.rotation.x = 0.34;
      m.torso.rotation.y = id === 'heavy' ? 0.85 : 0.28;
      if (m.jaw) m.jaw.rotation.x = (id === 'finisher' && this.familyMode) ? 0.38 : 0.56;
    } else {
      // Retorno amortecido (recovery)
      m.torso.rotation.x *= 0.82;
      m.torso.rotation.y *= 0.82;
      if (m.jaw) m.jaw.rotation.x *= 0.8;
    }
  }
}

/**
 * Calcula pose cinematográfica lateral 2.5D estilo MK11 acompanhando ambos os lutadores,
 * com zoom dramático em golpes pesados/Supremos e Modo Família seguro.
 */
export function computeFightingCameraPose(p1Pos, p2Pos, { cinematicZoom = 0, trauma = 0, time = 0 } = {}) {
  const midX = (p1Pos.x + p2Pos.x) * 0.5;
  const midZ = (p1Pos.z + p2Pos.z) * 0.5;
  const separation = Math.hypot(p2Pos.x - p1Pos.x, p2Pos.z - p1Pos.z);
  const baseDist = Math.max(7.2, Math.min(15.5, 5.6 + separation * 0.82));
  const dist = baseDist * (1 - Math.max(0, Math.min(0.38, cinematicZoom)));

  // Vetor perpendicular ao eixo entre os dois dinos (visão lateral limpa de jogo de luta!)
  const dx = p2Pos.x - p1Pos.x;
  const dz = p2Pos.z - p1Pos.z;
  const len = Math.max(0.001, Math.hypot(dx, dz));
  const perpX = -dz / len;
  const perpZ = dx / len;

  const shakeAmt = trauma * trauma * 0.35;
  const sx = Math.sin(time * 47) * shakeAmt;
  const sy = Math.cos(time * 53) * shakeAmt;

  return {
    position: {
      x: midX + perpX * dist + sx,
      y: 2.35 + separation * 0.08 - cinematicZoom * 0.55 + sy,
      z: midZ + perpZ * dist
    },
    lookAt: {
      x: midX,
      y: 1.25,
      z: midZ
    },
    fov: 50 - cinematicZoom * 10
  };
}
