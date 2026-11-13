// Evento OVNI Redesenhado (disco voxel multi-camadas + cúpula + anel giratório + luzes) + Fuga segura.
import * as THREE from 'three';
import { LANE_X } from '../world/World.js';
import { Save } from '../systems/Save.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);

export class UfoEvent {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.timer = 0;
    this.duration = 12;
    this.escapeProgress = 0;
    this.beamLane = 1;
    this.beamSwitchTimer = 2.0;

    this.group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.72, roughness: 0.25 });
    const darkHull = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.65, roughness: 0.3 });
    const domeMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.7, transparent: true, opacity: 0.85 });
    const lightMat = new THREE.MeshStandardMaterial({ color: '#4ade80', emissive: '#22c55e', emissiveIntensity: 1.2 });

    // Disco multi-camadas
    const diskA = new THREE.Mesh(BOX, hullMat);
    diskA.scale.set(3.8, 0.45, 3.8);
    const diskB = new THREE.Mesh(BOX, darkHull);
    diskB.scale.set(4.5, 0.22, 2.2);
    const diskC = new THREE.Mesh(BOX, darkHull);
    diskC.scale.set(2.2, 0.22, 4.5);
    const emitter = new THREE.Mesh(BOX, lightMat);
    emitter.scale.set(1.2, 0.35, 1.2);
    emitter.position.y = -0.35;

    // Cúpula com silhueta de piloto alienígena
    const alien = new THREE.Mesh(BOX, lightMat);
    alien.scale.set(0.65, 0.75, 0.65);
    alien.position.y = 0.62;
    const dome = new THREE.Mesh(BOX, domeMat);
    dome.scale.set(1.85, 0.95, 1.85);
    dome.position.y = 0.7;

    // Anel de luzes giratórias na borda
    this.rimLights = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const bulb = new THREE.Mesh(BOX, lightMat);
      bulb.scale.set(0.32, 0.25, 0.32);
      bulb.position.set(Math.cos(a) * 2.05, 0.12, Math.sin(a) * 2.05);
      this.rimLights.add(bulb);
    }

    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 1.45, 9, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.42, side: THREE.DoubleSide })
    );
    this.beam.position.y = -4.5;

    this.group.add(diskA, diskB, diskC, emitter, alien, dome, this.rimLights, this.beam);
    this.group.visible = false;
    this.scene.add(this.group);
  }

  start(duration = 12) {
    this.active = true;
    this.duration = duration;
    this.timer = duration;
    this.escapeProgress = 0;
    this.beamLane = 1;
    this.beamSwitchTimer = 1.6;
    this.group.position.set(0, 7.5, -2.5);
    this.group.visible = true;
  }

  mashBreak() {
    if (!this.active) return false;
    this.escapeProgress = Math.min(100, this.escapeProgress + 14);
    return this.escapeProgress >= 100;
  }

  update(dt, players, ctx) {
    if (!this.active) return;

    this.timer -= dt;
    this.group.rotation.y += dt * 1.4;
    this.rimLights.rotation.y -= dt * 3.2;

    this.beamSwitchTimer -= dt;
    if (this.beamSwitchTimer <= 0) {
      this.beamSwitchTimer = 1.8;
      this.beamLane = Math.floor(Math.random() * 3);
    }

    const targetX = LANE_X[this.beamLane];
    this.group.position.x += (targetX - this.group.position.x) * Math.min(1, dt * 4);
    this.group.position.z = -1.5 + Math.sin(this.timer * 2.5) * 1.5;

    // Puxa jogador dentro do feixe; ao sair ou vencer, garante retorno limpo ao chão
    const target = players[0];
    if (target && !target.dead) {
      const inBeam = Math.abs(target.x - this.group.position.x) < 1.15;
      if (inBeam) {
        this.escapeProgress = Math.max(0, this.escapeProgress - dt * 6);
        target.grounded = false;
        target.vy = 0;
        target.y = Math.min(2.2, target.y + dt * 1.5);
      } else {
        this.escapeProgress += dt * 11;
        if (target.y > 0.01) target.grounded = false;
      }

      if (players.length > 1 && players[1] && !players[1].dead) {
        if (Math.abs(players[1].x - this.group.position.x) < 1.4 && players[1].abilityDuration > 0) {
          this.escapeProgress += 60;
          ctx.showFloatText?.(players[1], 'RESGATE COOP!', '#58d63a');
        }
      }
    }

    ctx.onUfoHudUpdate?.(true, this.timer, this.escapeProgress);

    if (this.escapeProgress >= 100) {
      this._finish(true, players, ctx);
    } else if (this.timer <= 0) {
      const captured = target && Math.abs(target.x - this.group.position.x) < 1.1;
      this._finish(!captured, players, ctx);
    }
  }

  _finish(success, players, ctx) {
    this.active = false;
    this.group.visible = false;
    ctx.onUfoHudUpdate?.(false, 0, 0);

    for (const pl of players) {
      if (pl && pl.y > 0.01) {
        pl.grounded = false;
        pl.vy = Math.min(0, pl.vy);
      }
    }

    if (success) {
      ctx.addScore?.(350);
      Save.addEggs(8);
      Save.unlockAchievement('ufo_escape');
      ctx.sfx?.victory();
      ctx.showFloatText?.(players[0], 'ESCAPOU DO OVNI! +8 OVOS', '#22d3ee');
    } else {
      if (players[0]) {
        players[0].y = 0;
        players[0].grounded = true;
        players[0].vy = 0;
        ctx.damagePlayer?.(players[0]);
      }
      ctx.showFloatText?.(players[0], 'ABDUZIDO! -1 VIDA', '#ff4757');
    }
  }

  clear() {
    this.active = false;
    this.group.visible = false;
  }
}
