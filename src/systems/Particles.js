// Sistema de partículas voxel com ObjectPool (poeira nos pés, salto, pouso e impacto).
import * as THREE from 'three';
import { ObjectPool } from '../systems/ObjectPool.js';

const PARTICLE_GEO = new THREE.BoxGeometry(1, 1, 1);

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.pool = new ObjectPool(
      () => {
        const mat = new THREE.MeshStandardMaterial({ color: '#e6b873', roughness: 0.9 });
        const mesh = new THREE.Mesh(PARTICLE_GEO, mat);
        mesh.visible = false;
        this.group.add(mesh);
        return {
          mesh,
          mat,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 0,
          maxLife: 0.4,
          size: 0.2,
          gravity: 16,
          bounce: false
        };
      },
      (p) => {
        p.mesh.visible = false;
        p.life = 0;
        p.bounce = false;
      },
      90
    );
  }

  emitDust(x, y, z, count = 4, color = '#e6b873', spread = 1.2) {
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      p.mat.color.set(color);
      p.size = 0.14 + Math.random() * 0.14;
      p.mesh.position.set(
        x + (Math.random() - 0.5) * 0.5,
        Math.max(0.08, y),
        z + (Math.random() - 0.5) * 0.4
      );
      p.mesh.scale.setScalar(p.size);
      p.mesh.visible = true;
      p.vx = (Math.random() - 0.5) * spread;
      p.vy = 1.5 + Math.random() * 2.5;
      p.vz = 2.0 + Math.random() * 3.5;
      p.gravity = 10;
      p.maxLife = 0.28 + Math.random() * 0.22;
      p.life = p.maxLife;
    }
  }

  emitExplosion(x, y, z, color = '#58d63a', count = 16, bounce = true) {
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      p.mat.color.set(color);
      p.size = 0.2 + Math.random() * 0.22;
      p.mesh.position.set(x, y + Math.random() * 0.6, z);
      p.mesh.scale.setScalar(p.size);
      p.mesh.visible = true;
      p.vx = (Math.random() - 0.5) * 9;
      p.vy = 3.5 + Math.random() * 6.5;
      p.vz = (Math.random() - 0.5) * 9;
      p.gravity = 22;
      p.bounce = bounce;
      p.maxLife = 0.6 + Math.random() * 0.45;
      p.life = p.maxLife;
    }
  }

  update(dt, worldSpeed = 16) {
    for (let i = this.pool.active.length - 1; i >= 0; i--) {
      const p = this.pool.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.releaseAt(i);
        continue;
      }

      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += (p.vz + worldSpeed * 0.28) * dt;
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.y += dt * 4;

      if (p.bounce && p.mesh.position.y < p.size * 0.5) {
        p.mesh.position.y = p.size * 0.5;
        p.vy = Math.abs(p.vy) * 0.48;
        p.vx *= 0.8;
      }

      const ratio = p.life / p.maxLife;
      p.mesh.scale.setScalar(p.size * ratio);
    }
  }

  clear() {
    this.pool.releaseAll();
  }
}
