// Eventos Avançados com modelos voxel detalhados: Perseguidor Carnotauro, Pterodáctilo Montável na Fase de Voo e Corredor de Lava.
import * as THREE from 'three';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { LANE_X } from '../world/World.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);

export class AdvancedEvents {
  constructor(scene) {
    this.scene = scene;
    this.chaserActive = false;
    this.chaserTimer = 0;
    this.chaserDistance = 12;
    this.chaserModel = null;

    this.flightActive = false;
    this.flightTimer = 0;
    this.flightCarrier = null;
    this.flightWingL = null;
    this.flightWingR = null;
    this.flightPhase = 0;

    this.lavaCorridorTimer = 0;
    this.auroraBuffTimer = 0;
  }

  startAuroraBuff(duration = 12) {
    this.auroraBuffTimer = duration;
  }

  getScoreMultiplier() {
    return this.auroraBuffTimer > 0 ? 1.5 : 1.0;
  }

  startChaser(duration = 14) {
    this.clearChaser();
    this.chaserActive = true;
    this.chaserTimer = duration;
    this.chaserDistance = 14;
    this.chaserModel = DinoFactory.build('carnotaurus', { primary: '#9e001f', spikes: '#ffd447' });
    this.chaserModel.root.scale.setScalar(1.45);
    this.chaserModel.root.position.set(0, 0, 12);
    this.scene.add(this.chaserModel.root);
  }

  startFlightPhase(duration = 8) {
    this.flightActive = true;
    this.flightTimer = duration;
    if (!this.flightCarrier) {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: '#7209b7', roughness: 0.45 });
      const wingMat = new THREE.MeshStandardMaterial({ color: '#b5179e', roughness: 0.5 });
      const beakMat = new THREE.MeshStandardMaterial({ color: '#ffd166', roughness: 0.4 });
      const saddleMat = new THREE.MeshStandardMaterial({ color: '#4cc9f0', roughness: 0.4 });

      const body = new THREE.Mesh(BOX, bodyMat);
      body.scale.set(0.75, 0.45, 1.5);
      const saddle = new THREE.Mesh(BOX, saddleMat);
      saddle.scale.set(0.55, 0.16, 0.55);
      saddle.position.set(0, 0.25, 0);
      const head = new THREE.Mesh(BOX, bodyMat);
      head.scale.set(0.42, 0.38, 0.65);
      head.position.set(0, 0.22, -0.95);
      const crest = new THREE.Mesh(BOX, wingMat);
      crest.scale.set(0.14, 0.38, 0.72);
      crest.position.set(0, 0.45, -0.65);
      const beak = new THREE.Mesh(BOX, beakMat);
      beak.scale.set(0.22, 0.18, 0.72);
      beak.position.set(0, 0.14, -1.52);

      this.flightWingL = new THREE.Group();
      this.flightWingL.position.set(-0.35, 0.1, 0);
      const wl = new THREE.Mesh(BOX, wingMat);
      wl.scale.set(1.75, 0.14, 0.75);
      wl.position.set(-0.88, 0, 0);
      this.flightWingL.add(wl);

      this.flightWingR = new THREE.Group();
      this.flightWingR.position.set(0.35, 0.1, 0);
      const wr = new THREE.Mesh(BOX, wingMat);
      wr.scale.set(1.75, 0.14, 0.75);
      wr.position.set(0.88, 0, 0);
      this.flightWingR.add(wr);

      g.add(body, saddle, head, crest, beak, this.flightWingL, this.flightWingR);
      this.flightCarrier = g;
      this.scene.add(this.flightCarrier);
    }
    this.flightCarrier.visible = true;
  }

  startLavaCorridor(duration = 10) {
    this.lavaCorridorTimer = duration;
  }

  update(dt, speed, players, ctx) {
    // Perseguidor Gigante
    if (this.chaserActive && this.chaserModel) {
      this.chaserTimer -= dt;
      const lead = players[0];
      const paceBonus = speed > 26 ? 2.5 : -1.8;
      const decoyPush = ctx.decoyTimer > 0 ? 6.0 : 0;
      this.chaserDistance = Math.max(1.2, Math.min(22, this.chaserDistance + (paceBonus + decoyPush) * dt));

      if (lead) {
        this.chaserModel.root.position.x += (lead.x - this.chaserModel.root.position.x) * Math.min(1, dt * 4);
      }
      this.chaserModel.root.position.z = this.chaserDistance;
      ctx.onChaserHudUpdate?.(true, this.chaserDistance);

      if (this.chaserDistance <= 1.6 && lead && !lead.dead) {
        ctx.damagePlayer?.(lead);
        this.chaserDistance = 8.5;
      }
      if (this.chaserTimer <= 0) {
        this.clearChaser();
        ctx.onChaserHudUpdate?.(false, 0);
        ctx.addScore?.(250);
        ctx.showFloatText?.(lead, 'PERSEGUIDOR DESPISTADO! +250', '#ffd447');
      }
    }

    // Fase de Voo com Pterodáctilo Gigante batendo asas
    if (this.flightActive) {
      this.flightTimer -= dt;
      this.flightPhase += dt * 10;
      const p = players[0];
      if (p && !p.dead) {
        p.y = 3.2;
        p.vy = 0;
        p.grounded = false;
        this.flightCarrier.position.set(p.x, 4.35, p.z);
        const flap = Math.sin(this.flightPhase) * 0.45;
        if (this.flightWingL) this.flightWingL.rotation.z = flap;
        if (this.flightWingR) this.flightWingR.rotation.z = -flap;
        if (Math.random() < dt * 2.5) {
          ctx.spawner?.spawnEggArc(Math.floor(Math.random() * 3), 2, true, -65);
        }
      }
      if (this.flightTimer <= 0) {
        this.flightActive = false;
        if (this.flightCarrier) this.flightCarrier.visible = false;
        if (p) {
          p.grounded = false;
          p.invulnTimer = Math.max(p.invulnTimer, 1.5);
        }
      }
    }

    // Corredor de Lava
    if (this.lavaCorridorTimer > 0) {
      this.lavaCorridorTimer -= dt;
      if (Math.random() < dt * 2.2) {
        const lane = Math.floor(Math.random() * 3);
        ctx.spawner?._acquire('lava_pool', LANE_X[lane], 0, -110);
      }
    }

    // Aurora Boreal (Buff)
    if (this.auroraBuffTimer > 0) {
      this.auroraBuffTimer = Math.max(0, this.auroraBuffTimer - dt);
    }
  }

  clearChaser() {
    this.chaserActive = false;
    if (this.chaserModel) {
      this.scene.remove(this.chaserModel.root);
      this.chaserModel = null;
    }
  }

  clear() {
    this.clearChaser();
    this.flightActive = false;
    if (this.flightCarrier) this.flightCarrier.visible = false;
    this.lavaCorridorTimer = 0;
    this.auroraBuffTimer = 0;
  }
}
