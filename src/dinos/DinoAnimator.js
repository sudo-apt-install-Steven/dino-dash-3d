// Animações procedurais de dinossauros voxel:
// correr, pular (esticar/encolher), abaixar, deslizar, nadar, ataque (Q), dano, reviver, vitória e morte.

const HEADBUTT_IDS = new Set(['carnotaurus', 'pachycephalosaurus', 'triceratops', 'styracosaurus', 'ceratosaurus']);
const TAIL_ATTACK_IDS = new Set(['stegosaurus', 'ankylosaurus', 'kentrosaurus', 'brachiosaurus', 'diplodocus', 'argentinosaurus']);
const LUNGE_ATTACK_IDS = new Set([
  'raptor', 'deinonychus', 'utahraptor', 'therizinosaurus', 'compsognathus',
  'oviraptor', 'cyber_raptor', 'quetzalcoatlus', 'pteranodon', 'tapejara', 'dimorphodon'
]);

function resolveAttackType(bodyId) {
  if (HEADBUTT_IDS.has(bodyId)) return 'headbutt';
  if (TAIL_ATTACK_IDS.has(bodyId)) return 'tail';
  if (LUNGE_ATTACK_IDS.has(bodyId)) return 'lunge';
  return 'bite';
}

export class DinoAnimator {
  constructor(model) {
    this.model = model;
    this.runPhase = 0;
    this.hurtPhase = 0;
    this.roarTimer = 0;
    this.hurtTimer = 0;
    this.squashTimer = 0;
    this.attackTimer = 0;
    this.attackDuration = 0.34;
    this.attackType = resolveAttackType(model.bodyId);
    this.deathProgress = 0;
    this.reviveGlowTimer = 0;
    this.baseTorsoY = model.torso.position.y;
    this.baseNeckRotX = model.neckPivot?.rotation?.x ?? 0;
  }

  triggerLandSquash() {
    this.squashTimer = 0.18;
  }

  triggerRoar(duration = 0.45) {
    this.roarTimer = duration;
  }

  triggerAttack(typeOrDuration = null, duration = 0.34) {
    if (typeof typeOrDuration === 'number') {
      this.attackType = resolveAttackType(this.model.bodyId);
      this.attackDuration = Math.max(0.18, typeOrDuration);
    } else {
      this.attackType = typeOrDuration || resolveAttackType(this.model.bodyId);
      this.attackDuration = Math.max(0.18, duration);
    }
    this.attackTimer = this.attackDuration;
  }

  triggerRevive(duration = 0.55) {
    this.reviveGlowTimer = duration;
  }

  triggerHurt(duration = 0.75) {
    this.hurtTimer = duration;
  }

  reset() {
    const m = this.model;
    this.runPhase = 0;
    this.hurtPhase = 0;
    this.roarTimer = 0;
    this.hurtTimer = 0;
    this.squashTimer = 0;
    this.attackTimer = 0;
    this.deathProgress = 0;
    this.reviveGlowTimer = 0;
    m.rig.scale.setScalar(m.baseScale);
    m.rig.rotation.set(0, 0, 0);
    m.rig.position.set(0, 0, 0);
    m.torso.position.y = this.baseTorsoY;
    m.torso.position.z = 0;
    m.torso.rotation.set(0, 0, 0);
    m.neckPivot.rotation.set(this.baseNeckRotX, 0, 0);
    m.jaw.rotation.set(0, 0, 0);
    if (Array.isArray(m.extraLegs)) {
      m.extraLegs.forEach((leg) => {
        leg.hip.rotation.set(0, 0, leg.baseRotZ || 0);
        if (leg.knee) leg.knee.rotation.set(0, 0, 0);
      });
    }
    if (m.eyeGroups) {
      m.eyeGroups.forEach((eg) => eg.scale.set(1, 1, 1));
    }
    if (m.browGroups) {
      m.browGroups.forEach((bg) => {
        bg.rotation.set(0, 0, 0);
        if (bg._baseY !== undefined) bg.position.y = bg._baseY;
      });
    }
    m.root.visible = true;
  }

  update(dt, state) {
    const m = this.model;
    const {
      speed = 18,
      grounded = true,
      vy = 0,
      ducking = false,
      sliding = false,
      swimming = false,
      dead = false,
      victory = false,
      hurt = false,
      attack = false,
      attacking = false,
      attackType = null,
      invulnActive = false,
      giantScale = 1.0,
      laneLean = 0
    } = state;

    if (dead) {
      this.deathProgress = Math.min(1, this.deathProgress + dt * 3.4);
      const p = this.deathProgress;
      m.rig.rotation.z = p * (Math.PI * 0.48);
      m.rig.position.y = -p * 0.42;
      m.rig.position.x = 0;
      m.jaw.rotation.x = -0.45 * p;
      m.root.visible = true;
      return;
    } else if (this.deathProgress > 0) {
      // Transição suave de reviver: ergue o corpo progressivamente sem estalo visual
      this.deathProgress = Math.max(0, this.deathProgress - dt * 2.8);
      const p = this.deathProgress * this.deathProgress;
      m.rig.rotation.z = p * (Math.PI * 0.48);
      m.rig.position.y = -p * 0.42;
      m.jaw.rotation.x = -0.45 * p;
      if (this.deathProgress === 0) {
        this.reviveGlowTimer = Math.max(this.reviveGlowTimer, 0.45);
      }
    }

    if (this.squashTimer > 0) this.squashTimer = Math.max(0, this.squashTimer - dt);
    if (this.roarTimer > 0) this.roarTimer = Math.max(0, this.roarTimer - dt);
    if (this.reviveGlowTimer > 0) this.reviveGlowTimer = Math.max(0, this.reviveGlowTimer - dt);
    if ((attack || attacking) && this.attackTimer <= 0) {
      this.triggerAttack(attackType || null, 0.34);
    }
    if (this.attackTimer > 0) this.attackTimer = Math.max(0, this.attackTimer - dt);
    const isHurtActive = hurt || this.hurtTimer > 0;
    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
      // Pisca claramente no estado de invulnerabilidade pós-dano
      m.root.visible = Math.floor(this.hurtTimer * 18) % 2 === 0;
    } else if (invulnActive) {
      m.root.visible = Math.floor(performance.now() * 0.016) % 2 === 0;
    } else {
      m.root.visible = true;
    }

    if (isHurtActive) {
      this.hurtPhase += dt;
      m.rig.position.x = Math.sin(this.hurtPhase * 42) * 0.085;
    } else {
      this.hurtPhase = 0;
      m.rig.position.x += (0 - m.rig.position.x) * Math.min(1, dt * 16);
    }

    // Esticar e encolher (squash & stretch) no pulo e pouso
    let sx = 1;
    let sy = 1;
    let sz = 1;
    if (!grounded) {
      const stretch = Math.min(0.2, Math.abs(vy) * 0.012);
      sy = 1 + stretch;
      sx = 1 - stretch * 0.45;
      sz = 1 - stretch * 0.45;
    } else if (this.squashTimer > 0) {
      const f = this.squashTimer / 0.18;
      sy = 1 - 0.22 * f;
      sx = 1 + 0.16 * f;
      sz = 1 + 0.16 * f;
    }

    if (ducking || sliding) {
      sy *= 0.62;
      sx *= 1.18;
      sz *= 1.12;
    }

    m.rig.scale.set(
      m.baseScale * giantScale * sx,
      m.baseScale * giantScale * sy,
      m.baseScale * giantScale * sz
    );

    if (victory) {
      this.runPhase += dt * 9.5;
      const hop = Math.abs(Math.sin(this.runPhase));
      const sway = Math.sin(this.runPhase * 0.5);
      m.torso.position.y = this.baseTorsoY + hop * 0.42;
      m.torso.rotation.x = -0.18 + Math.sin(this.runPhase * 2) * 0.08;
      m.torso.rotation.y = sway * 0.22;
      m.torso.rotation.z = sway * 0.08;

      // Braços / asas erguidos comemorando
      if (m.armL?.isWing && m.armR?.isWing) {
        m.armL.hip.rotation.z = -(0.35 + hop * 0.55);
        m.armR.hip.rotation.z = +(0.35 + hop * 0.55);
        if (m.armL.outer) m.armL.outer.rotation.z = -(hop * 0.35);
        if (m.armR.outer) m.armR.outer.rotation.z = +(hop * 0.35);
      } else if (m.armL?.isFlipper && m.armR?.isFlipper) {
        m.armL.hip.rotation.z = -0.35 - hop * 0.42;
        m.armR.hip.rotation.z = 0.35 + hop * 0.42;
      } else if (m.armL?.hip && m.armR?.hip) {
        m.armL.hip.rotation.x = -1.25 - Math.sin(this.runPhase * 2) * 0.28;
        m.armR.hip.rotation.x = -1.25 + Math.sin(this.runPhase * 2) * 0.28;
      }

      // Pernas acompanham o pulo rítmico
      if (m.legL?.hip && m.legR?.hip && !m.legL.isFlipper) {
        m.legL.hip.rotation.x = -hop * 0.36;
        m.legR.hip.rotation.x = -hop * 0.36;
        if (m.legL.knee) m.legL.knee.rotation.x = hop * 0.52;
        if (m.legR.knee) m.legR.knee.rotation.x = hop * 0.52;
      }
      if (Array.isArray(m.extraLegs)) {
        m.extraLegs.forEach((leg) => {
          leg.hip.rotation.x = -hop * 0.28;
          if (leg.knee) leg.knee.rotation.x = hop * 0.42;
        });
      }

      // Cabeça erguida em rugido triunfante + olhos brilhantes
      m.neckPivot.rotation.x = this.baseNeckRotX - 0.22 - hop * 0.08;
      m.neckPivot.rotation.y = sway * 0.14;
      m.jaw.rotation.x = -0.4 - hop * 0.16;
      if (m.eyeGroups?.length === 2) {
        m.eyeGroups.forEach((eg) => {
          eg.scale.y += (1.18 - eg.scale.y) * Math.min(1, dt * 16);
          eg.scale.z += (1.0 - eg.scale.z) * Math.min(1, dt * 16);
        });
      }
      if (m.browGroups?.length === 2) {
        m.browGroups.forEach((bg) => {
          if (bg._baseY === undefined) bg._baseY = bg.position.y;
          bg.rotation.x += (-0.22 - bg.rotation.x) * Math.min(1, dt * 16);
          bg.position.y += ((bg._baseY + 0.04) - bg.position.y) * Math.min(1, dt * 16);
        });
      }
      m.tailSegments.forEach((seg, idx) => {
        seg.rotation.y = Math.sin(this.runPhase * 1.6 - idx * 0.6) * (0.18 + idx * 0.05);
        seg.rotation.x = 0.08;
      });
      return;
    }

    // Determina modo de locomoção realista (aquático nadando, voador batendo asas, ou terrestre)
    const { diveDepth = 0, forceLand = false } = state;
    const hasFlippers = !!(m.legL?.isFlipper);
    const hasWings = !!(m.armL?.isWing);
    const hasExtraLegs = !!(m.extraLegs && m.extraLegs.length > 0);
    const locomotion = state.locomotion
      || (forceLand ? 'land'
        : ((m.isAquatic && (swimming || !hasExtraLegs)) ? 'aquatic'
          : (m.isFlying ? 'flying'
            : (swimming && hasFlippers ? 'aquatic' : 'land'))));

    if (locomotion === 'aquatic') {
      // Nado real hidrodinâmico: onda senoidal em S no corpo/cauda e propulsão por nadadeiras
      this.runPhase += dt * Math.max(4.6, speed * 0.48);
      const wave = Math.sin(this.runPhase);
      const sweep = Math.cos(this.runPhase);
      const targetPitch = diveDepth * 0.44 - vy * 0.014 + (ducking ? 0.28 : 0);
      m.torso.rotation.x += (targetPitch - m.torso.rotation.x) * Math.min(1, dt * 12);
      m.torso.rotation.y += (wave * 0.1 - m.torso.rotation.y) * Math.min(1, dt * 12);
      m.torso.rotation.z += ((laneLean * 0.34 + sweep * 0.05) - m.torso.rotation.z) * Math.min(1, dt * 12);
      m.torso.position.y = this.baseTorsoY + Math.sin(this.runPhase * 0.85) * 0.1 - diveDepth * 0.12;

      // Nadadeiras dianteiras (peitorais)
      if (m.armL?.isFlipper && m.armR?.isFlipper) {
        m.armL.hip.rotation.z = -0.14 - wave * 0.4;
        m.armR.hip.rotation.z = 0.14 + wave * 0.4;
        m.armL.hip.rotation.y = 0.18 + sweep * 0.24;
        m.armR.hip.rotation.y = -0.18 - sweep * 0.24;
        if (m.armL.outer) m.armL.outer.rotation.z = -Math.sin(this.runPhase - 0.55) * 0.28;
        if (m.armR.outer) m.armR.outer.rotation.z = Math.sin(this.runPhase - 0.55) * 0.28;
      } else if (m.armL?.hip && m.armR?.hip) {
        m.armL.hip.rotation.x = 0.25 + wave * 0.35;
        m.armR.hip.rotation.x = 0.25 - wave * 0.35;
      }

      // Nadadeiras traseiras (pélvicas) defasadas para propulsão contínua
      const rearWave = Math.sin(this.runPhase - 1.15);
      if (m.legL?.isFlipper && m.legR?.isFlipper) {
        m.legL.hip.rotation.z = -0.12 - rearWave * 0.34;
        m.legR.hip.rotation.z = 0.12 + rearWave * 0.34;
        m.legL.hip.rotation.y = 0.16 + Math.cos(this.runPhase - 1.15) * 0.18;
        m.legR.hip.rotation.y = -0.16 - Math.cos(this.runPhase - 1.15) * 0.18;
        if (m.legL.outer) m.legL.outer.rotation.z = -rearWave * 0.22;
        if (m.legR.outer) m.legR.outer.rotation.z = rearWave * 0.22;
      } else if (m.legL?.hip && m.legR?.hip) {
        m.legL.hip.rotation.x = 0.52 + rearWave * 0.42;
        m.legR.hip.rotation.x = 0.52 - rearWave * 0.42;
        if (m.legL.knee) m.legL.knee.rotation.x = 0.32;
        if (m.legR.knee) m.legR.knee.rotation.x = 0.32;
      }

      if (hasExtraLegs) {
        // Patas extras dobradas para trás oferecendo leve arrasto hidrodinâmico
        m.extraLegs.forEach((leg) => {
          leg.hip.rotation.x = 0.65 + Math.sin(this.runPhase - leg.pairIndex * 0.6) * 0.22;
          leg.hip.rotation.z = leg.baseRotZ * 0.85;
          if (leg.knee) leg.knee.rotation.x = 0.38;
        });
      }
    } else if (locomotion === 'flying') {
      // Voo realista de pterossauros: batida de asa em 2 articulações + patas recolhidas + inclinação lateral
      this.runPhase += dt * Math.max(5.8, speed * 0.52);
      const flap = Math.sin(this.runPhase);
      const fold = Math.cos(this.runPhase);
      const targetPitch = sliding ? -0.26 : (ducking ? 0.3 : (!grounded ? -vy * 0.022 : 0.06));
      m.torso.rotation.x += (targetPitch - m.torso.rotation.x) * Math.min(1, dt * 12);
      m.torso.rotation.y *= Math.max(0, 1 - dt * 10);
      m.torso.rotation.z += (laneLean * 0.44 - m.torso.rotation.z) * Math.min(1, dt * 12);
      m.torso.position.y = (ducking || sliding ? this.baseTorsoY * 0.78 : this.baseTorsoY + 0.14) - flap * 0.12;

      if (hasWings) {
        m.armL.hip.rotation.z = -(0.12 + flap * 0.58);
        m.armR.hip.rotation.z = +(0.12 + flap * 0.58);
        m.armL.hip.rotation.y = -0.14 + fold * 0.16;
        m.armR.hip.rotation.y = +0.14 - fold * 0.16;
        const outerFlap = Math.sin(this.runPhase - 0.68);
        if (m.armL.outer) m.armL.outer.rotation.z = -(outerFlap * 0.48 - 0.08);
        if (m.armR.outer) m.armR.outer.rotation.z = +(outerFlap * 0.48 - 0.08);
      } else if (m.armL?.hip && m.armR?.hip) {
        m.armL.hip.rotation.z = -0.85 - flap * 0.32;
        m.armR.hip.rotation.z = +0.85 + flap * 0.32;
      }

      if (m.legL?.hip && m.legR?.hip) {
        if (m.legL.isFlipper) {
          m.legL.hip.rotation.z = -0.28;
          m.legR.hip.rotation.z = 0.28;
        } else {
          m.legL.hip.rotation.x = 0.74 + flap * 0.09;
          m.legR.hip.rotation.x = 0.74 - flap * 0.09;
          if (m.legL.knee) m.legL.knee.rotation.x = 0.34;
          if (m.legR.knee) m.legR.knee.rotation.x = 0.34;
        }
      }

      if (hasExtraLegs) {
        m.extraLegs.forEach((leg) => {
          leg.hip.rotation.x = 0.78 + Math.sin(this.runPhase + leg.pairIndex) * 0.08;
          leg.hip.rotation.z = leg.baseRotZ * 0.75;
          if (leg.knee) leg.knee.rotation.x = 0.4;
        });
      }
    } else {
      // Locomoção terrestre (bípedes, quadrúpedes ou aquáticos com mutação +Patas)
      this.runPhase += dt * (speed * 0.65);
      const swing = grounded ? Math.sin(this.runPhase) : 0.45;
      const bounce = grounded && !sliding ? Math.abs(Math.cos(this.runPhase)) * 0.09 : 0;

      const targetPitch = sliding ? -0.42 : (ducking ? 0.38 : (swimming ? 0.16 : (!grounded ? -vy * 0.018 : 0.08)));
      m.torso.rotation.x += (targetPitch - m.torso.rotation.x) * Math.min(1, dt * 14);
      m.torso.rotation.y *= Math.max(0, 1 - dt * 12);
      m.torso.rotation.z += (laneLean * 0.25 - m.torso.rotation.z) * Math.min(1, dt * 12);
      m.torso.position.y = (ducking || sliding ? this.baseTorsoY * 0.72 : this.baseTorsoY) + bounce;

      const legAmp = swimming ? 0.5 : (sliding ? 0.2 : 0.78);
      if (m.legL?.isFlipper && m.legR?.isFlipper) {
        // Aquático andando em terra firme com mutação +Patas: recolhe levemente as nadadeiras
        m.legL.hip.rotation.z = -0.34;
        m.legR.hip.rotation.z = 0.34;
        if (m.legL.outer) m.legL.outer.rotation.z = -0.22;
        if (m.legR.outer) m.legR.outer.rotation.z = 0.22;
      } else {
        m.legL.hip.rotation.x = swing * legAmp;
        m.legR.hip.rotation.x = -swing * legAmp;
        if (m.legL.knee) m.legL.knee.rotation.x = Math.max(0, -swing) * 0.55;
        if (m.legR.knee) m.legR.knee.rotation.x = Math.max(0, swing) * 0.55;
      }

      if (m.isQuadruped && !m.armL?.isFlipper && !m.armL?.isWing) {
        m.armL.hip.rotation.x = -swing * legAmp * 0.85;
        m.armR.hip.rotation.x = swing * legAmp * 0.85;
      } else if (m.armL?.isFlipper && m.armR?.isFlipper) {
        m.armL.hip.rotation.z = -0.32;
        m.armR.hip.rotation.z = 0.32;
      } else if (m.armL?.isWing && m.armR?.isWing) {
        m.armL.hip.rotation.z = -0.58 - Math.sin(this.runPhase) * 0.16;
        m.armR.hip.rotation.z = 0.58 + Math.sin(this.runPhase) * 0.16;
      } else {
        m.armL.hip.rotation.x = -0.35 + swing * 0.35;
        m.armR.hip.rotation.x = -0.35 - swing * 0.35;
      }

      if (hasExtraLegs) {
        m.extraLegs.forEach((leg) => {
          const altPhase = this.runPhase + leg.pairIndex * 1.15 + (leg.side > 0 ? Math.PI : 0);
          const stride = grounded ? Math.sin(altPhase) : 0.32;
          const lift = grounded ? Math.max(0, Math.cos(altPhase)) : 0.25;
          leg.hip.rotation.x = stride * (sliding ? 0.2 : 0.66);
          leg.hip.rotation.z = leg.baseRotZ + (leg.side * lift * 0.14);
          if (leg.knee) leg.knee.rotation.x = lift * 0.52;
        });
      }
    }

    // Pescoço, mandíbula e expressões faciais (Pulo / Ataque Q / Dano / Rugido / Dash)
    const isAttackActive = this.attackTimer > 0;
    let atkNeckPitch = 0;
    let atkNeckYaw = 0;
    let atkTorsoPitch = 0;
    let atkTorsoYaw = 0;
    let atkTorsoZ = 0;
    let atkJaw = 0;
    let atkTailBias = 0;

    if (isAttackActive) {
      const progress = 1 - (this.attackTimer / Math.max(0.01, this.attackDuration));
      // 0..0.32 antecipação, 0.32..0.66 impacto, 0.66..1.0 recuperação
      let ant = 0;
      let imp = 0;
      if (progress < 0.32) {
        const u = progress / 0.32;
        ant = u * u;
      } else if (progress < 0.66) {
        const u = (progress - 0.32) / 0.34;
        ant = 1 - u;
        imp = Math.sin(u * Math.PI * 0.5);
      } else {
        const u = (progress - 0.66) / 0.34;
        imp = 1 - u * u;
      }

      if (this.attackType === 'headbutt') {
        atkTorsoPitch = -0.18 * ant + 0.36 * imp;
        atkTorsoZ = 0.14 * ant - 0.42 * imp;
        atkNeckPitch = -0.22 * ant + 0.48 * imp;
        atkJaw = 0.14 * ant;
      } else if (this.attackType === 'tail') {
        atkTorsoYaw = -0.45 * ant + 0.72 * imp;
        atkNeckYaw = 0.25 * ant - 0.38 * imp;
        atkTailBias = -0.55 * ant + 0.95 * imp;
      } else if (this.attackType === 'lunge') {
        atkTorsoPitch = -0.16 * ant + 0.32 * imp;
        atkTorsoZ = 0.16 * ant - 0.48 * imp;
        atkNeckPitch = -0.18 * ant + 0.22 * imp;
        atkJaw = 0.32 * ant + 0.44 * imp;
        if (m.armL?.hip && m.armR?.hip && !m.armL.isWing && !m.armL.isFlipper) {
          m.armL.hip.rotation.x = -0.95 * ant + 0.45 * imp;
          m.armR.hip.rotation.x = -0.95 * ant + 0.45 * imp;
        }
      } else {
        // 'bite' (mordida com antecipação de boca aberta e impacto rápido)
        atkTorsoPitch = -0.14 * ant + 0.28 * imp;
        atkTorsoZ = 0.12 * ant - 0.38 * imp;
        atkNeckPitch = -0.24 * ant + 0.44 * imp;
        atkJaw = 0.58 * ant + 0.08 * imp;
      }
    }

    m.torso.rotation.x += atkTorsoPitch;
    m.torso.rotation.y += atkTorsoYaw;
    m.torso.position.z += (atkTorsoZ - m.torso.position.z) * Math.min(1, dt * 24);

    const isHurtFace = isHurtActive;
    const isRoarFace = this.roarTimer > 0 || !!state.furyActive;
    const isDashFace = !!(sliding || state.dashing);
    const isJumpFace = !grounded && vy > 2;

    if (isHurtActive) {
      m.torso.rotation.x -= 0.16;
      if (m.armL?.hip && m.armR?.hip && !m.armL.isWing && !m.armL.isFlipper) {
        m.armL.hip.rotation.z = -0.35;
        m.armR.hip.rotation.z = 0.35;
      }
    } else if (m.armL?.hip && m.armR?.hip && !m.armL.isWing && !m.armL.isFlipper) {
      m.armL.hip.rotation.z += (0 - m.armL.hip.rotation.z) * Math.min(1, dt * 14);
      m.armR.hip.rotation.z += (0 - m.armR.hip.rotation.z) * Math.min(1, dt * 14);
    }

    const targetNeckPitch = this.baseNeckRotX + atkNeckPitch + (isHurtFace ? -0.26 : (ducking ? -0.35 : (sliding ? 0.28 : (isRoarFace ? -0.16 : 0))));
    m.neckPivot.rotation.x += (targetNeckPitch - m.neckPivot.rotation.x) * Math.min(1, dt * (isAttackActive ? 22 : 12));
    if (isAttackActive && atkNeckYaw !== 0) {
      m.neckPivot.rotation.y += (atkNeckYaw - m.neckPivot.rotation.y) * Math.min(1, dt * 20);
    } else if (locomotion === 'aquatic') {
      m.neckPivot.rotation.y += (-Math.sin(this.runPhase + 0.45) * 0.1 - m.neckPivot.rotation.y) * Math.min(1, dt * 14);
    } else {
      m.neckPivot.rotation.y *= Math.max(0, 1 - dt * 10);
    }
    const targetJaw = -(isAttackActive ? Math.max(atkJaw, 0.04) : (isRoarFace ? 0.56 : (isHurtFace ? 0.42 : (isJumpFace ? 0.16 : 0.04 + Math.max(0, Math.sin(this.runPhase * 0.5)) * 0.05))));
    m.jaw.rotation.x += (targetJaw - m.jaw.rotation.x) * Math.min(1, dt * (isAttackActive ? 28 : 18));

    if (m.eyeGroups?.length === 2) {
      const eyeScaleY = isHurtFace ? 0.26 : (isAttackActive ? 0.72 : (isDashFace ? 0.68 : (isJumpFace ? 1.24 : 1.0)));
      const eyeScaleZ = isHurtFace ? 1.18 : 1.0;
      m.eyeGroups.forEach((eg) => {
        eg.scale.y += (eyeScaleY - eg.scale.y) * Math.min(1, dt * 18);
        eg.scale.z += (eyeScaleZ - eg.scale.z) * Math.min(1, dt * 18);
      });
    }
    if (m.browGroups?.length === 2) {
      const browTilt = isHurtFace ? 0.42 : (isAttackActive ? 0.38 : (isRoarFace ? 0.34 : (isDashFace ? 0.22 : (isJumpFace ? -0.22 : 0))));
      const browYOff = isJumpFace ? 0.045 : (isHurtFace || isRoarFace || isAttackActive ? -0.025 : 0);
      m.browGroups.forEach((bg, idx) => {
        if (bg._baseY === undefined) bg._baseY = bg.position.y;
        const sideSign = idx === 0 ? -1 : 1;
        bg.rotation.x += (browTilt - bg.rotation.x) * Math.min(1, dt * 16);
        bg.rotation.y += (sideSign * browTilt * 0.35 - bg.rotation.y) * Math.min(1, dt * 16);
        bg.position.y += ((bg._baseY + browYOff) - bg.position.y) * Math.min(1, dt * 16);
      });
    }

    // Cauda articulada com onda senoidal atrasada por segmento (intensa no nado aquático e golpe de cauda)
    const tailYawAmp = locomotion === 'aquatic' ? 0.23 : (locomotion === 'flying' ? 0.045 : 0.09);
    const tailStepAmp = locomotion === 'aquatic' ? 0.09 : 0.035;
    m.tailSegments.forEach((seg, idx) => {
      const wave = Math.sin(this.runPhase - idx * 0.72);
      seg.rotation.y = wave * (tailYawAmp + idx * tailStepAmp) + atkTailBias * (0.35 + idx * 0.16);
      seg.rotation.x = Math.cos(this.runPhase - idx * 0.5) * (locomotion === 'flying' ? 0.02 : 0.04);
    });
  }
}
