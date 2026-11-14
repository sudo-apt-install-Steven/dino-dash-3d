// Eventos de Mundo 121–130: Estampida Reversa, Tsunami, Cometa Raro, Portal Bônus de Ovos,
// Ninho de Pterodáctilo, Caçadores Primitivos com Lanças, Enigma de Ruínas, Nevoeiro Tóxico,
// Chuva de Frutas e Duelo com Dino NPC.
import * as THREE from 'three';
import { LANE_X } from '../world/World.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { Save } from '../systems/Save.js';
import {
  buildVoxelBonusPortal,
  buildVoxelRuinsPlate,
  buildVoxelSpear
} from '../models/VoxelLibrary.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);

function buildHunterVoxel(skinMat, tunicMat, spearMat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(BOX, tunicMat);
  body.scale.set(0.55, 0.72, 0.35);
  body.position.y = 0.85;
  const head = new THREE.Mesh(BOX, skinMat);
  head.scale.set(0.45, 0.45, 0.45);
  head.position.y = 1.48;
  const feather = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: '#ff4757' }));
  feather.scale.set(0.14, 0.42, 0.14);
  feather.position.set(0, 1.85, -0.08);
  const legL = new THREE.Mesh(BOX, skinMat);
  legL.scale.set(0.2, 0.5, 0.2);
  legL.position.set(-0.15, 0.25, 0);
  const legR = new THREE.Mesh(BOX, skinMat);
  legR.scale.set(0.2, 0.5, 0.2);
  legR.position.set(0.15, 0.25, 0);
  const spear = new THREE.Mesh(BOX, spearMat);
  spear.scale.set(0.08, 0.08, 1.85);
  spear.position.set(0.36, 1.05, 0.3);
  g.add(body, head, feather, legL, legR, spear);
  return g;
}

export class WorldEvents {
  constructor(scene) {
    this.scene = scene;
    this.reverseHerd = [];
    this.tsunami = null;
    this.comet = null;
    this.bonusPortal = null;
    this.bonusDimensionTimer = 0;
    this.pteroNest = null;
    this.hunters = [];
    this.spears = [];
    this.ruinsPlates = [];
    this.ruinsStep = 0;
    this.toxicFogTimer = 0;
    this.npcDuel = null;
  }

  // 121. Estampida reversa: vêm por trás (+Z -> -Z)!
  spawnReverseStampede() {
    const safeLane = Math.floor(Math.random() * 3);
    for (let l = 0; l < 3; l++) {
      if (l === safeLane) continue;
      const model = DinoFactory.build(l % 2 === 0 ? 'triceratops' : 'pachycephalosaurus', { primary: '#d97706' });
      model.root.rotation.y = Math.PI; // correndo para frente (-Z)
      model.root.position.set(LANE_X[l], 0, 14 + l * 2.5);
      this.scene.add(model.root);
      this.reverseHerd.push({ model, x: LANE_X[l], z: model.root.position.z, hit: false });
    }
  }

  // 122. Tsunami vindo do rio!
  spawnTsunami() {
    if (this.tsunami) return;
    const g = new THREE.Group();
    const waterMat = new THREE.MeshStandardMaterial({ color: '#0284c7', transparent: true, opacity: 0.72, roughness: 0.15 });
    const foamMat = new THREE.MeshStandardMaterial({ color: '#e0f2fe', emissive: '#38bdf8', emissiveIntensity: 0.4 });
    const wall = new THREE.Mesh(BOX, waterMat);
    wall.scale.set(8.2, 2.2, 3.6);
    wall.position.y = 1.1;
    const foam = new THREE.Mesh(BOX, foamMat);
    foam.scale.set(8.4, 0.55, 2.4);
    foam.position.set(0, 2.25, 0.4);
    g.add(wall, foam);
    const safeLane = Math.floor(Math.random() * 3);
    // Deixa uma abertura clara visual na cor dourada ou salto alto!
    const gapBeacon = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: '#ffd447' }));
    gapBeacon.scale.set(1.2, 0.35, 3.8);
    gapBeacon.position.set(LANE_X[safeLane], 2.5, 0);
    g.add(gapBeacon);
    g.position.set(4, 0, -90);
    this.scene.add(g);
    this.tsunami = { group: g, safeLane, z: -90, hit: false };
  }

  // 123. Cometa raro no céu!
  spawnRareComet() {
    const g = new THREE.Group();
    const coreMat = new THREE.MeshStandardMaterial({ color: '#67e8f9', emissive: '#22d3ee', emissiveIntensity: 1.5 });
    const tailMat = new THREE.MeshBasicMaterial({ color: '#a5f3fc', transparent: true, opacity: 0.7 });
    const core = new THREE.Mesh(BOX, coreMat);
    core.scale.set(1.6, 1.6, 1.6);
    const halo = new THREE.Mesh(BOX, coreMat);
    halo.scale.set(1.1, 2.2, 1.1);
    halo.rotation.set(0.4, 0.4, 0);
    const tail = new THREE.Mesh(BOX, tailMat);
    tail.scale.set(0.9, 0.9, 5.5);
    tail.position.set(0, 0, -3.2);
    const tailOuter = new THREE.Mesh(BOX, tailMat);
    tailOuter.scale.set(0.5, 0.5, 7.2);
    tailOuter.position.set(0, 0, -4.1);
    g.add(core, halo, tail, tailOuter);
    g.position.set(-28, 22, -85);
    this.scene.add(g);
    this.comet = { group: g, timer: 4.5, dropped: false };
  }

  // 124. Portal dimensional para fase bônus de ovos
  spawnBonusPortal() {
    if (this.bonusPortal) return;
    const g = buildVoxelBonusPortal();
    const lane = Math.floor(Math.random() * 3);
    g.position.set(LANE_X[lane], 1.7, -85);
    this.scene.add(g);
    this.bonusPortal = { group: g, lane, entered: false };
  }

  // 125. Ninho de pterodáctilo
  spawnPteroNest() {
    if (this.pteroNest) return;
    const g = new THREE.Group();
    const twigMat = new THREE.MeshStandardMaterial({ color: '#78350f' });
    const twigs = new THREE.Mesh(BOX, twigMat);
    twigs.scale.set(1.9, 0.35, 1.9);
    twigs.position.y = 0.2;
    const rimL = new THREE.Mesh(BOX, twigMat);
    rimL.scale.set(0.28, 0.28, 1.85);
    rimL.position.set(-0.85, 0.38, 0);
    const rimR = new THREE.Mesh(BOX, twigMat);
    rimR.scale.set(0.28, 0.28, 1.85);
    rimR.position.set(0.85, 0.38, 0);
    const chick1 = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: '#fde047' }));
    chick1.scale.set(0.45, 0.5, 0.45);
    chick1.position.set(-0.35, 0.55, 0);
    const chick2 = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: '#fdba74' }));
    chick2.scale.set(0.45, 0.5, 0.45);
    chick2.position.set(0.35, 0.55, 0);
    g.add(twigs, rimL, rimR, chick1, chick2);
    const lane = Math.floor(Math.random() * 3);
    g.position.set(LANE_X[lane], 0, -78);
    this.scene.add(g);
    this.pteroNest = { group: g, rescued: false };
  }

  // 126. Caçadores primitivos com lanças
  spawnPrimitiveHunters() {
    const skinMat = new THREE.MeshStandardMaterial({ color: '#d4a373' });
    const tunicMat = new THREE.MeshStandardMaterial({ color: '#8d5524' });
    const spearMat = new THREE.MeshStandardMaterial({ color: '#582f0e' });
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -4.3 : 4.3;
      const m = buildHunterVoxel(skinMat, tunicMat, spearMat);
      m.position.set(side, 0, -45 - i * 16);
      m.rotation.y = side < 0 ? Math.PI * 0.4 : -Math.PI * 0.4;
      this.scene.add(m);
      this.hunters.push({ mesh: m, side, shot: false });
    }
  }

  // 127. Enigma de ruínas (pisar na sequência de plataformas iluminadas)
  spawnRuinsPuzzle() {
    this.ruinsPlates.forEach((p) => this.scene.remove(p.mesh));
    this.ruinsPlates = [];
    this.ruinsStep = 0;
    const order = [0, 2, 1];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: i === 0 ? '#ffd447' : '#64748b',
        emissive: i === 0 ? '#ff9f1c' : '#334155',
        emissiveIntensity: i === 0 ? 1.1 : 0.35
      });
      const plate = buildVoxelRuinsPlate(mat);
      plate.position.set(LANE_X[order[i]], 0, -45 - i * 24);
      this.scene.add(plate);
      this.ruinsPlates.push({ mesh: plate, mat, lane: order[i], index: i, lit: false });
    }
  }

  // 128. Nevoeiro tóxico
  triggerToxicFog(duration = 10) {
    this.toxicFogTimer = duration;
  }

  // 130. Duelo com Dino NPC no caminho (mini-boss)
  spawnNpcDuel() {
    if (this.npcDuel) return;
    const model = DinoFactory.build('carnotaurus', { primary: '#ec4899', spikes: '#38bdf8' });
    model.root.scale.setScalar(1.22);
    model.root.position.set(LANE_X[1], 0, -52);
    this.scene.add(model.root);
    this.npcDuel = { model, lane: 1, hp: 2, z: -52, switchTimer: 1.4 };
  }

  update(dt, speed, players, ctx) {
    // 121. Estampida Reversa
    for (let i = this.reverseHerd.length - 1; i >= 0; i--) {
      const r = this.reverseHerd[i];
      r.z -= (speed * 0.55 + 6) * dt;
      r.model.root.position.z = r.z;
      if (!r.hit) {
        for (const p of players) {
          if (p.dead) continue;
          if (Math.abs(p.x - r.x) < 0.9 && Math.abs(p.z - r.z) < 0.9 && p.y < 1.1) {
            r.hit = true;
            ctx.damagePlayer?.(p);
          }
        }
      }
      if (r.z < -85) {
        this.scene.remove(r.model.root);
        this.reverseHerd.splice(i, 1);
      }
    }

    // 122. Tsunami
    if (this.tsunami) {
      this.tsunami.z += (speed + 7) * dt;
      this.tsunami.group.position.z = this.tsunami.z;
      this.tsunami.group.position.x = Math.max(0, this.tsunami.group.position.x - dt * 2.5);
      if (!this.tsunami.hit && Math.abs(this.tsunami.z) < 1.8) {
        for (const p of players) {
          if (p.dead) continue;
          const onSafe = Math.abs(p.x - LANE_X[this.tsunami.safeLane]) < 1.15;
          if (!onSafe && p.y < 2.2) {
            this.tsunami.hit = true;
            ctx.damagePlayer?.(p);
          } else if (onSafe) {
            ctx.addScore?.(100);
            ctx.showFloatText?.(p, 'SURF NA ONDA! +100', '#38bdf8');
            this.tsunami.hit = true;
          }
        }
      }
      if (this.tsunami.z > 20) {
        this.scene.remove(this.tsunami.group);
        this.tsunami = null;
      }
    }

    // 123. Cometa Raro
    if (this.comet) {
      this.comet.timer -= dt;
      this.comet.group.position.x += dt * 14;
      this.comet.group.position.y -= dt * 1.4;
      if (!this.comet.dropped && this.comet.timer < 3.0) {
        this.comet.dropped = true;
        ctx.spawner?.spawnEggRain(6);
        ctx.addScore?.(180);
      }
      if (this.comet.timer <= 0) {
        this.scene.remove(this.comet.group);
        this.comet = null;
      }
    }

    // 124. Portal Dimensional Bônus de Ovos
    if (this.bonusPortal) {
      this.bonusPortal.group.position.z += speed * dt;
      this.bonusPortal.group.rotation.z += dt * 2.5;
      if (!this.bonusPortal.entered) {
        for (const p of players) {
          if (p.dead) continue;
          if (Math.abs(p.x - this.bonusPortal.group.position.x) < 1.35 && Math.abs(p.z - this.bonusPortal.group.position.z) < 1.4) {
            this.bonusPortal.entered = true;
            this.bonusDimensionTimer = 6.5;
            ctx.spawner?.spawnEggRain(10);
            ctx.sfx?.evolution();
            ctx.showFloatText?.(p, '🌀 DIMENSÃO DOS OVOS! 6.5s BÔNUS!', '#c084fc');
            break;
          }
        }
      }
      if (this.bonusPortal.group.position.z > 16) {
        this.scene.remove(this.bonusPortal.group);
        this.bonusPortal = null;
      }
    }
    if (this.bonusDimensionTimer > 0) {
      this.bonusDimensionTimer -= dt;
      if (Math.random() < dt * 2.5) ctx.spawner?.spawnEggArc(Math.floor(Math.random() * 3), 2, true, -60);
    }

    // 125. Ninho de Pterodáctilo
    if (this.pteroNest) {
      this.pteroNest.group.position.z += speed * dt;
      if (!this.pteroNest.rescued) {
        for (const p of players) {
          if (p.dead) continue;
          if (Math.abs(p.x - this.pteroNest.group.position.x) < 1.6 && Math.abs(p.z - this.pteroNest.group.position.z) < 1.8) {
            this.pteroNest.rescued = true;
            Save.addEggs(8);
            ctx.addScore?.(300);
            ctx.sfx?.victory();
            ctx.showFloatText?.(p, '🪺 FILHOTES PROTEGIDOS! +8 OVOS!', '#ffd447');
            break;
          }
        }
      }
      if (this.pteroNest.group.position.z > 18) {
        this.scene.remove(this.pteroNest.group);
        this.pteroNest = null;
      }
    }

    // 126. Caçadores Primitivos & Lanças
    for (let i = this.hunters.length - 1; i >= 0; i--) {
      const h = this.hunters[i];
      h.mesh.position.z += speed * dt;
      if (!h.shot && h.mesh.position.z > -28) {
        h.shot = true;
        const lane = Math.floor(Math.random() * 3);
        const sp = buildVoxelSpear();
        sp.position.set(h.side, 0.9, h.mesh.position.z);
        this.scene.add(sp);
        this.spears.push({ mesh: sp, targetX: LANE_X[lane], hit: false });
      }
      if (h.mesh.position.z > 18) {
        this.scene.remove(h.mesh);
        this.hunters.splice(i, 1);
      }
    }
    for (let i = this.spears.length - 1; i >= 0; i--) {
      const s = this.spears[i];
      s.mesh.position.x += (s.targetX - s.mesh.position.x) * Math.min(1, dt * 5);
      s.mesh.position.z += (speed + 12) * dt;
      if (!s.hit) {
        for (const p of players) {
          if (p.dead) continue;
          if (Math.abs(p.x - s.mesh.position.x) < 0.75 && Math.abs(p.z - s.mesh.position.z) < 0.95 && p.y < 1.35) {
            s.hit = true;
            ctx.damagePlayer?.(p);
          }
        }
      }
      if (s.mesh.position.z > 16) {
        this.scene.remove(s.mesh);
        this.spears.splice(i, 1);
      }
    }

    // 127. Enigma de Ruínas
    for (let i = this.ruinsPlates.length - 1; i >= 0; i--) {
      const pl = this.ruinsPlates[i];
      pl.mesh.position.z += speed * dt;
      if (!pl.lit && Math.abs(pl.mesh.position.z) < 1.3) {
        for (const p of players) {
          if (!p.dead && Math.abs(p.x - pl.mesh.position.x) < 1.15 && p.y < 0.65 && pl.index === this.ruinsStep) {
            pl.lit = true;
            this.ruinsStep++;
            pl.mat.color.set('#58d63a');
            pl.mat.emissive.set('#22c55e');
            ctx.sfx?.click();
            if (this.ruinsPlates[this.ruinsStep]) {
              this.ruinsPlates[this.ruinsStep].mat.color.set('#ffd447');
              this.ruinsPlates[this.ruinsStep].mat.emissive.set('#ff9f1c');
              this.ruinsPlates[this.ruinsStep].mat.emissiveIntensity = 1.1;
            }
            if (this.ruinsStep >= this.ruinsPlates.length) {
              Save.addEggs(8);
              ctx.addScore?.(250);
              ctx.sfx?.victory();
              ctx.showFloatText?.(p, '🏛️ ENIGMA RESOLVIDO! +8 OVOS!', '#ffd447');
            }
            break;
          }
        }
      }
      if (pl.mesh.position.z > 16) {
        this.scene.remove(pl.mesh);
        this.ruinsPlates.splice(i, 1);
      }
    }

    // 128. Nevoeiro tóxico (desacelera recargas se estiver sem máscara)
    if (this.toxicFogTimer > 0) {
      this.toxicFogTimer -= dt;
      if (ctx.scene.fog) {
        ctx.scene.fog.color.set('#3f6212');
        ctx.scene.fog.density = 0.036;
      }
      for (const p of players) {
        if (p.dead || p.backpack?.hasGasMask) continue;
        p.abilityCooldown = Math.min(p.abilityMaxCooldown || 12, (p.abilityCooldown || 0) + dt * 0.45);
        p.attackCooldown = Math.min(2.0, (p.attackCooldown || 0) + dt * 0.35);
      }
    }

    // 130. Duelo NPC
    if (this.npcDuel) {
      const d = this.npcDuel;
      d.switchTimer -= dt;
      if (d.switchTimer <= 0) {
        d.switchTimer = 1.35;
        d.lane = Math.floor(Math.random() * 3);
      }
      d.model.root.position.x += (LANE_X[d.lane] - d.model.root.position.x) * Math.min(1, dt * 5);
      d.z += (speed * 0.18) * dt;
      d.model.root.position.z = d.z;
      for (const p of players) {
        if (p.dead) continue;
        if (Math.abs(p.x - d.model.root.position.x) < 1.25 && Math.abs(p.z - d.z) < 1.6) {
          if (p.attackTimer > 0 || p.abilityDuration > 0 || p.y > 0.7) {
            d.hp -= 1;
            d.z -= 12;
            ctx.particles?.emitExplosion(d.model.root.position.x, 1.2, d.z, '#ec4899', 14, true);
            ctx.sfx?.stomp();
            if (d.hp <= 0) {
              this.scene.remove(d.model.root);
              this.npcDuel = null;
              Save.addEggs(10);
              ctx.addScore?.(400);
              ctx.showFloatText?.(p, '⚔️ DUELO VENCIDO! +10 OVOS & +400 PTS!', '#ffd447');
              break;
            }
          } else {
            ctx.damagePlayer?.(p);
            d.z -= 10;
          }
        }
      }
      if (this.npcDuel && d.z > 16) {
        this.scene.remove(d.model.root);
        this.npcDuel = null;
      }
    }
  }

  clear() {
    for (const r of this.reverseHerd) this.scene.remove(r.model.root);
    if (this.tsunami) this.scene.remove(this.tsunami.group);
    if (this.comet) this.scene.remove(this.comet.group);
    if (this.bonusPortal) this.scene.remove(this.bonusPortal.group);
    if (this.pteroNest) this.scene.remove(this.pteroNest.group);
    for (const h of this.hunters) this.scene.remove(h.mesh);
    for (const s of this.spears) this.scene.remove(s.mesh);
    for (const p of this.ruinsPlates) this.scene.remove(p.mesh);
    if (this.npcDuel) this.scene.remove(this.npcDuel.model.root);
    this.reverseHerd = [];
    this.tsunami = null;
    this.comet = null;
    this.bonusPortal = null;
    this.bonusDimensionTimer = 0;
    this.pteroNest = null;
    this.hunters = [];
    this.spears = [];
    this.ruinsPlates = [];
    this.ruinsStep = 0;
    this.toxicFogTimer = 0;
    this.npcDuel = null;
  }
}
