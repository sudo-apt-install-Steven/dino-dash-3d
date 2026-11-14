// Eventos Dinâmicos com modelos voxel articulados (meteoros irregulares, bando de pterodáctilos com asas, manada e mercador).
import * as THREE from 'three';
import { LANE_X } from '../world/World.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { buildVoxelCrater } from '../models/VoxelLibrary.js';

const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);

function buildPterodactylVoxel(bodyMat, wingMat, beakMat) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(BOX_GEO, bodyMat);
  body.scale.set(0.45, 0.34, 0.9);
  const head = new THREE.Mesh(BOX_GEO, bodyMat);
  head.scale.set(0.28, 0.28, 0.42);
  head.position.set(0, 0.14, 0.56);
  const crest = new THREE.Mesh(BOX_GEO, wingMat);
  crest.scale.set(0.12, 0.24, 0.55);
  crest.position.set(0, 0.3, 0.32);
  const beak = new THREE.Mesh(BOX_GEO, beakMat);
  beak.scale.set(0.14, 0.12, 0.48);
  beak.position.set(0, 0.1, 0.95);

  const wingL = new THREE.Group();
  wingL.position.set(-0.22, 0.08, 0.1);
  const wl = new THREE.Mesh(BOX_GEO, wingMat);
  wl.scale.set(1.05, 0.09, 0.48);
  wl.position.set(-0.52, 0, 0);
  wingL.add(wl);

  const wingR = new THREE.Group();
  wingR.position.set(0.22, 0.08, 0.1);
  const wr = new THREE.Mesh(BOX_GEO, wingMat);
  wr.scale.set(1.05, 0.09, 0.48);
  wr.position.set(0.52, 0, 0);
  wingR.add(wr);

  root.add(body, head, crest, beak, wingL, wingR);
  return { root, wingL, wingR };
}

export class CoreEvents {
  constructor(scene) {
    this.scene = scene;
    this.meteors = [];
    this.craters = [];
    this.herd = [];
    this.pteroFlock = [];
    this.merchant = null;

    this.ringGeo = new THREE.RingGeometry(0.45, 0.95, 16);
    this.ringMat = new THREE.MeshBasicMaterial({ color: '#ff2e2e', side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    this.meteorMat = new THREE.MeshStandardMaterial({ color: '#4a2016', emissive: '#ff5500', emissiveIntensity: 0.7 });
    this.meteorCoreMat = new THREE.MeshStandardMaterial({ color: '#ff9e00', emissive: '#ff5400', emissiveIntensity: 1.2 });
    this.craterMat = new THREE.MeshStandardMaterial({ color: '#2b1810', roughness: 0.95 });
    this.pteroMat = new THREE.MeshStandardMaterial({ color: '#7b2cbf', roughness: 0.55 });
    this.pteroWingMat = new THREE.MeshStandardMaterial({ color: '#c77dff', roughness: 0.5 });
    this.beakMat = new THREE.MeshStandardMaterial({ color: '#ffd166', roughness: 0.4 });
  }

  spawnMeteorWave(count = 5) {
    for (let i = 0; i < count; i++) {
      const lane = Math.floor(Math.random() * 3);
      const x = LANE_X[lane];
      const z = -12 - i * 9;
      const shadow = new THREE.Mesh(this.ringGeo, this.ringMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(x, 0.08, z);
      this.scene.add(shadow);

      const rock = new THREE.Group();
      const core = new THREE.Mesh(BOX_GEO, this.meteorMat);
      core.scale.set(1.25, 1.15, 1.35);
      const magma = new THREE.Mesh(BOX_GEO, this.meteorCoreMat);
      magma.scale.set(0.85, 1.35, 0.85);
      const ridge = new THREE.Mesh(BOX_GEO, this.meteorMat);
      ridge.scale.set(1.45, 0.72, 0.85);
      rock.add(core, magma, ridge);
      rock.position.set(x - 6, 22 + i * 4, z - 8);
      this.scene.add(rock);

      this.meteors.push({ rock, shadow, targetX: x, targetZ: z, timeLeft: 1.45 + i * 0.35 });
    }
  }

  spawnHerbivoreHerd() {
    const gaps = [0, 1, 2];
    const openLane = gaps[Math.floor(Math.random() * 3)];
    for (let lane = 0; lane < 3; lane++) {
      if (lane === openLane && Math.random() < 0.75) continue;
      const model = DinoFactory.build(lane % 2 === 0 ? 'triceratops' : 'brachiosaurus');
      model.root.scale.setScalar(1.08);
      model.root.position.set(LANE_X[lane], 0, -95 - lane * 4);
      this.scene.add(model.root);
      this.herd.push({ model, x: LANE_X[lane], z: -95 - lane * 4, rideable: true });
    }
  }

  spawnPterodactylFlock() {
    for (let i = 0; i < 4; i++) {
      const lane = i % 3;
      const rig = buildPterodactylVoxel(this.pteroMat, this.pteroWingMat, this.beakMat);
      rig.root.position.set(LANE_X[lane], i % 2 === 0 ? 1.65 : 0.8, -90 - i * 11);
      this.scene.add(rig.root);
      this.pteroFlock.push({ rig, y: rig.root.position.y, phase: i * 0.9, hit: false });
    }
  }

  spawnEggMerchant() {
    const model = DinoFactory.build('parasaurolophus', { primary: '#f4a261', accessory: 'tophat' });
    model.root.position.set(LANE_X[2] + 1.2, 0, -90);
    model.root.rotation.y = Math.PI * 0.35;
    this.scene.add(model.root);
    this.merchant = { model, offered: false };
  }

  update(dt, speed, players, ctx) {
    // Meteoros
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.timeLeft -= dt;
      m.targetZ += speed * 0.45 * dt;
      m.shadow.position.z = m.targetZ;
      const t = Math.max(0, m.timeLeft / 1.6);
      m.rock.position.set(m.targetX - t * 6, Math.max(0.6, t * 24), m.targetZ - t * 6);
      m.rock.rotation.x += dt * 4;
      m.rock.rotation.z += dt * 3;

      if (m.timeLeft <= 0) {
        this.scene.remove(m.rock);
        this.scene.remove(m.shadow);
        ctx.sfx?.meteor();
        ctx.cameraRig?.triggerShake(0.45, 0.25);
        ctx.particles?.emitExplosion(m.targetX, 0.5, m.targetZ, '#ff5500', 14, true);

        const crater = buildVoxelCrater(this.craterMat, this.meteorCoreMat);
        crater.position.set(m.targetX, 0.02, m.targetZ);
        this.scene.add(crater);
        this.craters.push({ mesh: crater, life: 5.0 });

        for (const p of players) {
          if (p.dead) continue;
          if (Math.hypot(p.x - m.targetX, p.z - m.targetZ) < 1.3 && p.y < 1.3) {
            ctx.damagePlayer?.(p);
          }
        }
        this.meteors.splice(i, 1);
      }
    }

    // Crateras
    for (let i = this.craters.length - 1; i >= 0; i--) {
      const c = this.craters[i];
      c.life -= dt;
      c.mesh.position.z += speed * dt;
      if (c.life <= 0 || c.mesh.position.z > 16) {
        this.scene.remove(c.mesh);
        this.craters.splice(i, 1);
      }
    }

    // Manada de herbívoros
    for (let i = this.herd.length - 1; i >= 0; i--) {
      const h = this.herd[i];
      h.z += (speed + 5) * dt;
      h.model.root.position.z = h.z;

      for (const p of players) {
        if (p.dead) continue;
        const dx = Math.abs(p.x - h.x);
        const dz = Math.abs(p.z - h.z);
        if (dx < 1.05 && dz < 1.2) {
          if (p.y >= 0.9 && p.vy <= 0 && !p.mountedTimer) {
            p.mountedTimer = 5.5;
            p.invulnTimer = Math.max(p.invulnTimer, 5.5);
            ctx.addScore?.(150);
            ctx.showFloatText?.(p, 'CARONA NA MANADA! +150', '#58d63a');
          } else if (p.y < 0.85 && !p.mountedTimer) {
            ctx.damagePlayer?.(p);
          }
        }
      }

      if (h.z > 18) {
        this.scene.remove(h.model.root);
        this.herd.splice(i, 1);
      }
    }

    // Bando de pterodáctilos com bater de asas
    for (let i = this.pteroFlock.length - 1; i >= 0; i--) {
      const pt = this.pteroFlock[i];
      pt.phase += dt * 11;
      pt.rig.root.position.z += (speed + 8) * dt;
      const flap = Math.sin(pt.phase) * 0.55;
      pt.rig.wingL.rotation.z = flap;
      pt.rig.wingR.rotation.z = -flap;
      if (!pt.hit) {
        for (const p of players) {
          if (p.dead) continue;
          const dx = Math.abs(p.x - pt.rig.root.position.x);
          const dz = Math.abs(p.z - pt.rig.root.position.z);
          const pyTop = p.y + (p.ducking ? 0.95 : 1.85);
          if (dx < 1.0 && dz < 0.7 && p.y < pt.y + 0.35 && pyTop > pt.y - 0.35) {
            pt.hit = true;
            ctx.damagePlayer?.(p);
          }
        }
      }
      if (pt.rig.root.position.z > 18) {
        this.scene.remove(pt.rig.root);
        this.pteroFlock.splice(i, 1);
      }
    }

    // Mercador de ovos
    if (this.merchant) {
      this.merchant.model.root.position.z += speed * 0.85 * dt;
      if (!this.merchant.offered && this.merchant.model.root.position.z > -10) {
        this.merchant.offered = true;
        ctx.onMerchantEncounter?.();
      }
      if (this.merchant.model.root.position.z > 18) {
        this.scene.remove(this.merchant.model.root);
        this.merchant = null;
      }
    }
  }

  clear() {
    for (const m of this.meteors) {
      this.scene.remove(m.rock);
      this.scene.remove(m.shadow);
    }
    for (const c of this.craters) this.scene.remove(c.mesh);
    for (const h of this.herd) this.scene.remove(h.model.root);
    for (const p of this.pteroFlock) this.scene.remove(p.rig.root);
    if (this.merchant) this.scene.remove(this.merchant.model.root);
    this.meteors = [];
    this.craters = [];
    this.herd = [];
    this.pteroFlock = [];
    this.merchant = null;
  }
}
