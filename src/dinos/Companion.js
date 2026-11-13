// Filhote companheiro que segue o jogador (pega ovos próximos e bloqueia 1 dano)
// e sistema de montaria temporária em herbívoros da manada.
import * as THREE from 'three';
import { DinoFactory } from './DinoFactory.js';

export class CompanionManager {
  constructor(scene) {
    this.scene = scene;
    this.companion = null;
    this.time = 0;
  }

  spawn(dinoId = 'compsognathus', custom = null) {
    this.clear();
    const model = DinoFactory.build(dinoId, custom);
    model.root.scale.setScalar(0.45);
    this.scene.add(model.root);
    this.companion = {
      model,
      x: 0,
      y: 0.2,
      z: 1.4,
      shieldCooldown: 0,
      eggStealCooldown: 0
    };
  }

  update(dt, player, spawner, onCollectEgg) {
    if (!this.companion) return;
    this.time += dt;
    const c = this.companion;
    if (c.shieldCooldown > 0) c.shieldCooldown -= dt;
    if (c.eggStealCooldown > 0) c.eggStealCooldown -= dt;

    // Segue ao lado do dono com leve flutuação animada
    const targetX = player.x + (player.lane === 2 ? -1.1 : 1.1);
    const targetZ = player.z + 1.15;
    c.x += (targetX - c.x) * Math.min(1, dt * 8);
    c.z += (targetZ - c.z) * Math.min(1, dt * 8);
    c.y = Math.max(0, player.y * 0.6) + Math.abs(Math.sin(this.time * 9)) * 0.14;
    c.model.root.position.set(c.x, c.y, c.z);

    // Pega ovos próximos automaticamente
    if (c.eggStealCooldown <= 0 && spawner) {
      for (const obs of spawner.getActiveObstacles()) {
        if (obs.kind !== 'egg' || obs.hit) continue;
        const dist = Math.hypot(obs.group.position.x - c.x, obs.group.position.z - c.z);
        if (dist < 2.9) {
          obs.hit = true;
          obs.pool?.release(obs);
          c.eggStealCooldown = 0.25;
          if (onCollectEgg) onCollectEgg(obs);
          break;
        }
      }
    }
  }

  tryBlockDamage() {
    if (!this.companion || this.companion.shieldCooldown > 0) return false;
    this.companion.shieldCooldown = 25;
    return true;
  }

  clear() {
    if (this.companion) {
      this.scene.remove(this.companion.model.root);
      this.companion = null;
    }
  }
}
