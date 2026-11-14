// Animações procedurais de dinossauros voxel:
// correr, pular (esticar/encolher), abaixar, deslizar, nadar, dano, vitória e morte.

export class DinoAnimator {
  constructor(model) {
    this.model = model;
    this.runPhase = 0;
    this.roarTimer = 0;
    this.hurtTimer = 0;
    this.squashTimer = 0;
    this.deathProgress = 0;
    this.baseTorsoY = model.torso.position.y;
  }

  triggerLandSquash() {
    this.squashTimer = 0.18;
  }

  triggerRoar(duration = 0.45) {
    this.roarTimer = duration;
  }

  triggerHurt(duration = 0.75) {
    this.hurtTimer = duration;
  }

  reset() {
    const m = this.model;
    this.runPhase = 0;
    this.roarTimer = 0;
    this.hurtTimer = 0;
    this.squashTimer = 0;
    this.deathProgress = 0;
    m.rig.scale.setScalar(m.baseScale);
    m.rig.rotation.set(0, 0, 0);
    m.rig.position.set(0, 0, 0);
    m.torso.position.y = this.baseTorsoY;
    m.torso.rotation.set(0, 0, 0);
    m.neckPivot.rotation.set(0, 0, 0);
    m.jaw.rotation.set(0, 0, 0);
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
      invulnActive = false,
      giantScale = 1.0,
      laneLean = 0
    } = state;

    if (dead) {
      this.deathProgress = Math.min(1, this.deathProgress + dt * 3.4);
      const p = this.deathProgress;
      m.rig.rotation.z = p * (Math.PI * 0.48);
      m.rig.position.y = -p * 0.42;
      m.jaw.rotation.x = -0.45 * p;
      return;
    } else if (this.deathProgress > 0) {
      this.deathProgress = 0;
      m.rig.rotation.z = 0;
      m.rig.position.y = 0;
      m.jaw.rotation.x = 0;
    }

    if (this.squashTimer > 0) this.squashTimer = Math.max(0, this.squashTimer - dt);
    if (this.roarTimer > 0) this.roarTimer = Math.max(0, this.roarTimer - dt);
    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
      // Pisca claramente no estado de invulnerabilidade pós-dano
      m.root.visible = Math.floor(this.hurtTimer * 18) % 2 === 0;
    } else if (invulnActive) {
      m.root.visible = Math.floor(performance.now() * 0.016) % 2 === 0;
    } else {
      m.root.visible = true;
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
      this.runPhase += dt * 10;
      m.torso.position.y = this.baseTorsoY + Math.abs(Math.sin(this.runPhase)) * 0.35;
      m.torso.rotation.x = -0.15;
      m.jaw.rotation.x = -0.35;
      return;
    }

    // Avanço da passada conforme velocidade
    this.runPhase += dt * (speed * 0.65);
    const swing = grounded ? Math.sin(this.runPhase) : 0.45;
    const bounce = grounded && !sliding ? Math.abs(Math.cos(this.runPhase)) * 0.09 : 0;

    // Postura do tronco
    const targetPitch = sliding ? -0.42 : (ducking ? 0.38 : (swimming ? 0.16 : (!grounded ? -vy * 0.018 : 0.08)));
    m.torso.rotation.x += (targetPitch - m.torso.rotation.x) * Math.min(1, dt * 14);
    m.torso.rotation.z += (laneLean * 0.25 - m.torso.rotation.z) * Math.min(1, dt * 12);
    m.torso.position.y = (ducking || sliding ? this.baseTorsoY * 0.72 : this.baseTorsoY) + bounce;

    // Pernas
    const legAmp = swimming ? 0.5 : (sliding ? 0.2 : 0.78);
    m.legL.hip.rotation.x = swing * legAmp;
    m.legR.hip.rotation.x = -swing * legAmp;
    m.legL.knee.rotation.x = Math.max(0, -swing) * 0.55;
    m.legR.knee.rotation.x = Math.max(0, swing) * 0.55;

    // Braços / patas dianteiras
    if (m.isQuadruped) {
      m.armL.hip.rotation.x = -swing * legAmp * 0.85;
      m.armR.hip.rotation.x = swing * legAmp * 0.85;
    } else {
      m.armL.hip.rotation.x = -0.35 + swing * 0.35;
      m.armR.hip.rotation.x = -0.35 - swing * 0.35;
    }

    // Pescoço, mandíbula e expressões faciais (Pulo / Dano / Rugido / Dash)
    const isHurtFace = this.hurtTimer > 0;
    const isRoarFace = this.roarTimer > 0 || !!state.furyActive;
    const isDashFace = !!(sliding || state.dashing);
    const isJumpFace = !grounded && vy > 2;

    const targetNeckPitch = ducking ? -0.35 : (sliding ? 0.28 : (isRoarFace ? -0.16 : 0));
    m.neckPivot.rotation.x += (targetNeckPitch - m.neckPivot.rotation.x) * Math.min(1, dt * 12);
    const targetJaw = -(isRoarFace ? 0.56 : (isHurtFace ? 0.42 : (isJumpFace ? 0.16 : 0.04 + Math.max(0, Math.sin(this.runPhase * 0.5)) * 0.05)));
    m.jaw.rotation.x += (targetJaw - m.jaw.rotation.x) * Math.min(1, dt * 18);

    if (m.eyeGroups?.length === 2) {
      const eyeScaleY = isHurtFace ? 0.26 : (isDashFace ? 0.68 : (isJumpFace ? 1.24 : 1.0));
      const eyeScaleZ = isHurtFace ? 1.18 : 1.0;
      m.eyeGroups.forEach((eg) => {
        eg.scale.y += (eyeScaleY - eg.scale.y) * Math.min(1, dt * 18);
        eg.scale.z += (eyeScaleZ - eg.scale.z) * Math.min(1, dt * 18);
      });
    }
    if (m.browGroups?.length === 2) {
      const browTilt = isHurtFace ? 0.42 : (isRoarFace ? 0.34 : (isDashFace ? 0.22 : (isJumpFace ? -0.22 : 0)));
      const browYOff = isJumpFace ? 0.045 : (isHurtFace || isRoarFace ? -0.025 : 0);
      m.browGroups.forEach((bg, idx) => {
        if (bg._baseY === undefined) bg._baseY = bg.position.y;
        const sideSign = idx === 0 ? -1 : 1;
        bg.rotation.x += (browTilt - bg.rotation.x) * Math.min(1, dt * 16);
        bg.rotation.y += (sideSign * browTilt * 0.35 - bg.rotation.y) * Math.min(1, dt * 16);
        bg.position.y += ((bg._baseY + browYOff) - bg.position.y) * Math.min(1, dt * 16);
      });
    }

    // Cauda articulada com onda senoidal atrasada por segmento
    m.tailSegments.forEach((seg, idx) => {
      const wave = Math.sin(this.runPhase - idx * 0.65);
      seg.rotation.y = wave * (0.09 + idx * 0.035);
      seg.rotation.x = Math.cos(this.runPhase - idx * 0.5) * 0.04;
    });
  }
}
