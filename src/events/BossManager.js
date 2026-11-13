// Bosses 3D Redesenhados com barra de vida estilizada, fases visuais, partes destrutíveis,
// ataques animados (rugido + onda de choque, mordida, rabada, investida), intro e coop em equipe.
import * as THREE from 'three';
import { LANE_X } from '../world/World.js';
import { Save } from '../systems/Save.js';
import { buildBossModel } from './BossModels.js';

export const BOSS_DEFS = {
  scorpion_king: {
    id: 'scorpion_king',
    name: 'Rei Escorpião',
    title: 'Soberano das Dunas',
    hp: 5,
    color: '#9b1d42',
    weakOrder: [0, 2, 1],
    rewardAccessory: 'crown'
  },
  storm_eagle: {
    id: 'storm_eagle',
    name: 'Águia Tempestade',
    title: 'Senhora dos Ventos',
    hp: 5,
    color: '#3a86ff',
    weakOrder: [1, 0, 2],
    rewardAccessory: 'wings'
  },
  mother_ufo: {
    id: 'mother_ufo',
    name: 'Mãe OVNI',
    title: 'Nave-Mãe Extraterrestre',
    hp: 6,
    color: '#a855f7',
    weakOrder: [2, 1, 0],
    rewardAccessory: 'vr_visor'
  },
  alpha_trex: {
    id: 'alpha_trex',
    name: 'T-Rex Alfa',
    title: 'Rei dos Predadores',
    hp: 6,
    color: '#dc2626',
    weakOrder: [1, 2, 0],
    rewardAccessory: 'spikes'
  },
  plesiosaur: {
    id: 'plesiosaur',
    name: 'Plesiossauro Gigante',
    title: 'Leviatã Abissal',
    hp: 5,
    color: '#0284c7',
    weakOrder: [0, 1, 2],
    rewardAccessory: 'aura_fire'
  }
};

export class BossManager {
  constructor(scene) {
    this.scene = scene;
    this.activeBoss = null;
    this.bossRig = null;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.attackTimer = 2.0;
    this.animCycleTimer = 0;
    this.currentAnim = 'idle';

    // Orbe Ponto Fraco facetado (cristal rotativo + anel)
    this.weakOrb = new THREE.Group();
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: '#ffd447', emissive: '#ff9500', emissiveIntensity: 0.95 })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.08, 6, 16),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    this.weakOrb.add(crystal, ring);
    this.weakOrb.visible = false;
    this.scene.add(this.weakOrb);

    // Onda de choque de rugido / ataque
    this.shockRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.5, 24),
      new THREE.MeshBasicMaterial({ color: '#ff3b30', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    this.shockRing.rotation.x = -Math.PI / 2;
    this.shockRing.visible = false;
    this.shockTimer = 0;
    this.scene.add(this.shockRing);

    this.hazardShots = [];
    this.shotMat = new THREE.MeshStandardMaterial({ color: '#ff2e63', emissive: '#ff5500', emissiveIntensity: 0.85 });
    this.shotGeo = new THREE.OctahedronGeometry(0.62, 0);
  }

  startBoss(bossId = 'alpha_trex', playerCount = 1) {
    this.clear();
    const def = BOSS_DEFS[bossId] || BOSS_DEFS.alpha_trex;
    const isTeam = playerCount >= 2;
    const scaledHp = isTeam ? def.hp + Math.min(4, playerCount) : def.hp;

    this.activeBoss = {
      ...def,
      currentHp: scaledHp,
      maxHp: scaledHp,
      stepIndex: 0,
      phaseTime: 0,
      introTimer: 1.65,
      teamMode: isTeam,
      teamComboIds: new Set(),
      phase: 1,
      lungeZ: 0
    };

    this.bossRig = buildBossModel(def.id);
    this.bossRig.root.rotation.y = Math.PI; // voltado para frente encarando o jogador!
    this.group.add(this.bossRig.root);
    this.group.position.set(0, 6.5, -42);
    this.group.visible = true;

    this.currentAnim = 'roar';
    this.animCycleTimer = 1.4;
    this._triggerShockwave(0, -34, def.color);
    this._spawnNextWeakOrb();
  }

  _triggerShockwave(x, z, color = '#ff3b30') {
    this.shockRing.material.color.set(color);
    this.shockRing.position.set(x, 0.16, z);
    this.shockRing.scale.setScalar(1);
    this.shockRing.material.opacity = 0.85;
    this.shockRing.visible = true;
    this.shockTimer = 0.65;
  }

  _spawnNextWeakOrb() {
    if (!this.activeBoss) return;
    const lane = this.activeBoss.weakOrder[this.activeBoss.stepIndex % this.activeBoss.weakOrder.length];
    this.weakOrb.position.set(LANE_X[lane], 1.15, -72);
    this.weakOrb.visible = true;
  }

  update(dt, speed, players, ctx) {
    if (!this.activeBoss) return;
    const b = this.activeBoss;
    b.phaseTime += dt;

    // Introdução cinematográfica curta
    if (b.introTimer > 0) {
      b.introTimer -= dt;
      const p = Math.max(0, b.introTimer / 1.65);
      this.group.position.set(0, p * 6.5, -34 - p * 8);
      if (b.introTimer <= 0.8 && this.currentAnim !== 'roar') {
        this.currentAnim = 'roar';
        ctx.cameraRig?.triggerShake(0.45, 0.35);
        ctx.sfx?.roar(b.id);
      }
    } else {
      const aggSpeed = b.phase >= 2 ? 1.85 : 1.35;
      this.group.position.x = Math.sin(b.phaseTime * aggSpeed) * 2.55;
      this.group.position.y = Math.sin(b.phaseTime * 3.1) * 0.18;
      if (b.lungeZ > 0) b.lungeZ = Math.max(0, b.lungeZ - dt * 14);
      this.group.position.z = -33 + b.lungeZ;
      this.group.rotation.y = Math.sin(b.phaseTime * 0.9) * 0.15;
    }

    if (this.animCycleTimer > 0) {
      this.animCycleTimer -= dt;
      if (this.animCycleTimer <= 0) this.currentAnim = 'idle';
    }

    this.bossRig?.updateAnimation(b.phaseTime, dt, this.currentAnim);

    // Anima onda de choque
    if (this.shockTimer > 0) {
      this.shockTimer -= dt;
      const grow = 1 + (0.65 - this.shockTimer) * 18;
      this.shockRing.scale.setScalar(grow);
      this.shockRing.material.opacity = Math.max(0, this.shockTimer / 0.65);
      if (this.shockTimer <= 0) this.shockRing.visible = false;
    }

    // Dispara ataques variados por fase (rugido, mordida/investida, rabada dupla)
    if (b.introTimer <= 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        const hpLost = b.maxHp - b.currentHp;
        this.attackTimer = Math.max(0.72, 1.75 - hpLost * 0.13);
        const attackRoll = Math.floor(Math.random() * 3);

        if (attackRoll === 0) {
          this.currentAnim = 'bite';
          this.animCycleTimer = 0.6;
          b.lungeZ = 4.2;
          const lane = Math.floor(Math.random() * 3);
          this._spawnShot(LANE_X[lane], 0.72, -31);
        } else if (attackRoll === 1) {
          this.currentAnim = 'tail_sweep';
          this.animCycleTimer = 0.7;
          // Fase 2+: dispara duas faixas deixando 1 livre!
          const safe = Math.floor(Math.random() * 3);
          for (let l = 0; l < 3; l++) {
            if (l === safe && b.phase < 3) continue;
            if (l === safe && b.phase >= 3 && Math.random() < 0.75) continue;
            this._spawnShot(LANE_X[l], 0.68, -32);
          }
        } else {
          this.currentAnim = 'roar';
          this.animCycleTimer = 0.75;
          ctx.cameraRig?.triggerShake(0.32, 0.25);
          this._triggerShockwave(this.group.position.x, -32, b.color);
          const lane = Math.floor(Math.random() * 3);
          this._spawnShot(LANE_X[lane], 1.35, -32); // tiro alto p/ abaixar!
        }
      }
    }

    // Move projéteis do boss
    for (let i = this.hazardShots.length - 1; i >= 0; i--) {
      const s = this.hazardShots[i];
      s.mesh.position.z += (speed + 10) * dt;
      s.mesh.rotation.x += dt * 7;
      s.mesh.rotation.y += dt * 5;
      if (!s.hit) {
        for (const p of players) {
          if (p.dead) continue;
          const pTop = p.y + (p.ducking ? 0.95 : 1.85);
          const shotY = s.mesh.position.y;
          if (
            Math.abs(p.x - s.mesh.position.x) < 0.85 &&
            Math.abs(p.z - s.mesh.position.z) < 0.85 &&
            p.y < shotY + 0.55 &&
            pTop > shotY - 0.5
          ) {
            s.hit = true;
            ctx.damagePlayer?.(p);
          }
        }
      }
      if (s.mesh.position.z > 16) {
        this.scene.remove(s.mesh);
        this.hazardShots.splice(i, 1);
      }
    }

    // Move ponto fraco dourado (em multiplayer de equipe, exige múltiplos jogadores atacando ou dá bônus conjunto!)
    if (this.weakOrb.visible) {
      this.weakOrb.position.z += speed * 0.92 * dt;
      this.weakOrb.rotation.y += dt * 4.5;
      this.weakOrb.rotation.x += dt * 2.2;
      for (const p of players) {
        if (p.dead) continue;
        const reachX = p.attackTimer > 0 ? 1.45 : 1.2;
        const reachZ = p.attackTimer > 0 ? 1.85 : 1.2;
        if (Math.abs(p.x - this.weakOrb.position.x) < reachX && Math.abs(p.z - this.weakOrb.position.z) < reachZ) {
          this._hitBossWeakPoint(p, players, ctx);
          break;
        }
      }
      if (this.weakOrb.position.z > 14 && this.activeBoss) {
        this._spawnNextWeakOrb();
      }
    }

    ctx.onBossHudUpdate?.(this.activeBoss);
  }

  _spawnShot(x, y, z) {
    const shot = new THREE.Mesh(this.shotGeo, this.shotMat);
    shot.position.set(x, y, z);
    this.scene.add(shot);
    this.hazardShots.push({ mesh: shot, hit: false });
  }

  _hitBossWeakPoint(player, players, ctx) {
    if (!this.activeBoss) return;
    const b = this.activeBoss;
    const aliveCount = players.filter((pl) => !pl.dead).length;

    // Mecânica de ataque em equipe no multiplayer (2+ vivos): o primeiro jogador carrega o golpe e outro precisa atacar junto (ou ataque com habilidade quebra direto!)
    if (b.teamMode && aliveCount >= 2 && !player.abilityDuration) {
      b.teamComboIds.add(player.id);
      if (b.teamComboIds.size < Math.min(2, aliveCount)) {
        ctx.sfx?.click();
        ctx.showFloatText?.(player, `ATAQUE EM EQUIPE (${b.teamComboIds.size}/2)!`, '#38bdf8');
        this._spawnNextWeakOrb();
        return;
      }
      b.teamComboIds.clear();
    }

    const dmg = (player.abilityDuration > 0 || player.attackTimer > 0) ? 2 : 1;
    b.currentHp = Math.max(0, b.currentHp - dmg);
    b.stepIndex++;

    const hpRatio = b.currentHp / b.maxHp;
    const prevPhase = b.phase;
    this.bossRig?.setPhaseVisuals(hpRatio);
    b.phase = this.bossRig?.phase || 1;

    ctx.sfx?.stomp();
    ctx.cameraRig?.triggerShake(0.55, 0.25);
    ctx.particles?.emitExplosion(this.group.position.x, 2.2, -33, '#ffd447', 18, true);

    if (b.phase > prevPhase) {
      this.currentAnim = 'roar';
      this.animCycleTimer = 1.1;
      this._triggerShockwave(this.group.position.x, -32, '#ff2e2e');
      ctx.sfx?.roar(b.id);
      ctx.showFloatText?.(player, `⚠️ FÚRIA FASE ${b.phase}! PARTE QUEBRADA!`, '#ff4757');
    } else {
      ctx.showFloatText?.(player, `PONTO FRACO! -${dmg} HP`, '#ffd447');
    }

    if (b.currentHp <= 0) {
      const defeated = b;
      ctx.particles?.emitExplosion(this.group.position.x, 2.6, -33, '#ff9a24', 32, true);
      this.clear();
      ctx.onBossHudUpdate?.(null);
      ctx.addScore?.(750);
      Save.addEggs(18);
      if (!Save.data.dinoHouse.trophies.includes(defeated.id)) {
        Save.data.dinoHouse.trophies.push(defeated.id);
      }
      if (defeated.rewardAccessory && !Save.data.unlockedAccessories.includes(defeated.rewardAccessory)) {
        Save.data.unlockedAccessories.push(defeated.rewardAccessory);
      }
      Save.save();
      ctx.sfx?.victory();
      ctx.onBossDefeated?.(defeated);
      ctx.showFloatText?.(player, `🏆 ${defeated.name} DERROTADO! +18 OVOS & TROFÉU!`, '#58d63a');
    } else {
      this._spawnNextWeakOrb();
    }
  }

  clear() {
    this.activeBoss = null;
    this.bossRig = null;
    this.weakOrb.visible = false;
    this.shockRing.visible = false;
    this.shockTimer = 0;
    this.group.visible = false;
    while (this.group.children.length > 0) this.group.remove(this.group.children[0]);
    for (const s of this.hazardShots) this.scene.remove(s.mesh);
    this.hazardShots = [];
  }
}
