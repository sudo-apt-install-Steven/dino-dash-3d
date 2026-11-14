// Habilidades ativas dos 13+1 dinos, passivas de classe, ressonância, combos Coop e fusão.
import * as THREE from 'three';
import { getDinoSpec } from './DinoCatalog.js';
import { buildVoxelProjectile } from '../models/VoxelLibrary.js';

export class DinoAbilities {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.shockwaves = [];

    this.acidMat = new THREE.MeshBasicMaterial({ color: '#7bf118' });
    this.spikeMat = new THREE.MeshBasicMaterial({ color: '#ff6b35' });
  }

  getSkillLevelScale(level = 1) {
    return 1 + (Math.max(1, Math.min(10, level)) - 1) * 0.08;
  }

  activate(player, gameCtx) {
    const spec = getDinoSpec(player.id);
    if (player.abilityCooldown > 0) return false;
    if ((player.abilityCharge ?? 100) < 100) {
      gameCtx.showFloatText?.(player, `⏳ CARGA ${Math.floor(player.abilityCharge || 0)}% (combos/pisões/Q!)`, '#fbbf24');
      return false;
    }

    const lvlScale = this.getSkillLevelScale(player.skillLevel || 1);
    const cdMult = player.cooldownMult || 1;

    // Ressonância: ativar logo após quase-colisão ou pouso perfeito amplifica o efeito!
    const isResonance = player.resonanceWindow > 0;
    const durMult = (isResonance ? 1.5 : 1.0) * lvlScale * (player.abilityPowerMult || 1);

    player.abilityCooldown = spec.ability.cooldown * cdMult;
    player.abilityDuration = spec.ability.duration * durMult;
    player.abilityMaxCooldown = player.abilityCooldown;
    player.abilityCharge = 0;
    player.animator.triggerRoar(0.5);
    gameCtx.sfx?.roar(player.id);

    if (isResonance) {
      player.resonanceWindow = 0;
      gameCtx.addScore?.(120);
      gameCtx.showFloatText?.(player, 'RESSONÂNCIA!', '#ffd447');
    }

    switch (player.id) {
      case 'trex':
        this._spawnWave(player.x, player.z, '#ff9f1c', 12);
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 26, true);
        gameCtx.showFloatText?.(player, 'RUGIDO!', '#ff9f1c');
        break;
      case 'raptor':
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        player.turboTimer = Math.max(player.turboTimer, player.abilityDuration);
        gameCtx.showFloatText?.(player, 'INVESTIDA RELÂMPAGO!', '#ffbe0b');
        break;
      case 'triceratops':
        player.ramTimer = player.abilityDuration;
        gameCtx.showFloatText?.(player, 'CARGA DE CHIFRES!', '#3b82c4');
        break;
      case 'stegosaurus':
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          this._spawnProjectile(player.x, 1.0, player.z, Math.cos(ang) * 20, Math.sin(ang) * 20, this.spikeMat);
        }
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 15, false);
        gameCtx.showFloatText?.(player, 'CAUDA DE ESPINHOS!', '#e0533c');
        break;
      case 'ankylosaurus':
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        player.armorSlowTimer = player.abilityDuration;
        gameCtx.showFloatText?.(player, 'CASCO DE AÇO!', '#b8bb26');
        break;
      case 'spinosaurus':
        player.diveTimer = player.abilityDuration;
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        gameCtx.showFloatText?.(player, 'MERGULHO!', '#38bdf8');
        break;
      case 'brachiosaurus':
        this._spawnWave(player.x, player.z, '#52b788', 18);
        gameCtx.cameraRig?.triggerShake(0.55, 0.32);
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 34, false);
        gameCtx.showFloatText?.(player, 'PISÃO SÍSMICO!', '#52b788');
        break;
      case 'dilophosaurus':
        this._spawnProjectile(player.x, 1.2, player.z - 0.8, 0, -45, this.acidMat);
        this._spawnProjectile(player.x - 1.2, 1.2, player.z - 0.8, -3, -45, this.acidMat);
        this._spawnProjectile(player.x + 1.2, 1.2, player.z - 0.8, 3, -45, this.acidMat);
        gameCtx.showFloatText?.(player, 'VENENO!', '#7bf118');
        break;
      case 'parasaurolophus':
        player.magnetTimer = Math.max(player.magnetTimer, player.abilityDuration);
        this._spawnWave(player.x, player.z, '#f4a261', 14);
        gameCtx.healPartner?.(player);
        gameCtx.showFloatText?.(player, 'TROMBETA SÔNICA!', '#f4a261');
        break;
      case 'compsognathus':
        player.extraJumps = Math.max(player.extraJumps, 1);
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        player.stealth = true;
        gameCtx.showFloatText?.(player, 'FURTIVIDADE!', '#70e000');
        break;
      case 'carnotaurus':
        player.ramTimer = player.abilityDuration;
        gameCtx.pushPvPRival?.(player);
        gameCtx.showFloatText?.(player, 'INVESTIDA BRUTAL!', '#ef233c');
        break;
      case 'pachycephalosaurus':
        player.ramTimer = player.abilityDuration;
        this._spawnWave(player.x, player.z, '#e9c46a', 10);
        gameCtx.stunPvPRival?.(player);
        gameCtx.showFloatText?.(player, 'MARRETADA!', '#e9c46a');
        break;
      case 'therizinosaurus':
        this._spawnProjectile(player.x - 0.9, 1.1, player.z - 0.7, 0, -42, this.spikeMat);
        this._spawnProjectile(player.x + 0.9, 1.1, player.z - 0.7, 0, -42, this.spikeMat);
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 18, false);
        gameCtx.showFloatText?.(player, 'CORTE DUPLO!', '#a29bfe');
        break;
      case 'allosaurus':
        player.turboTimer = Math.max(player.turboTimer, player.abilityDuration);
        player.scoreMultBonus = Math.max(player.scoreMultBonus || 1, 1.6);
        this._spawnProjectile(player.x - 0.7, 1.1, player.z - 0.8, -2, -46, this.spikeMat);
        this._spawnProjectile(player.x + 0.7, 1.1, player.z - 0.8, 2, -46, this.spikeMat);
        gameCtx.showFloatText?.(player, 'CAÇADA FRENÉTICA!', '#f43f5e');
        break;
      case 'baryonyx':
        player.diveTimer = player.abilityDuration;
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        this._spawnWave(player.x, player.z, '#0ea5e9', 14);
        gameCtx.showFloatText?.(player, 'BOTE AQUÁTICO!', '#38bdf8');
        break;
      case 'styracosaurus':
        player.ramTimer = player.abilityDuration;
        player.shields = Math.min(4, Math.max(player.shields || 0, 1));
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 12, false);
        gameCtx.showFloatText?.(player, 'FALANGE DE CHIFRES!', '#f97316');
        break;
      case 'oviraptor':
        player.magnetTimer = Math.max(player.magnetTimer, player.abilityDuration + 2.0);
        player.turboTimer = Math.max(player.turboTimer, 2.2);
        gameCtx.showFloatText?.(player, 'FARDO DE OVOS!', '#fb923c');
        break;
      case 'quetzalcoatlus':
        player.y = Math.max(player.y, 1.5);
        player.vy = 11.8;
        player.extraJumps = Math.max(player.extraJumps, 2);
        player.invulnTimer = Math.max(player.invulnTimer, 2.4);
        this._spawnWave(player.x, player.z, '#60a5fa', 12);
        gameCtx.showFloatText?.(player, 'CORRENTE TÉRMICA!', '#60a5fa');
        break;
      case 'giganotosaurus':
        this._spawnWave(player.x, player.z, '#be123c', 26);
        gameCtx.cameraRig?.triggerShake(0.65, 0.35);
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 38, false);
        gameCtx.pushPvPRival?.(player);
        player.furyTimer = Math.max(player.furyTimer, 2.5);
        gameCtx.showFloatText?.(player, 'RUGIDO COLOSSAL!', '#fb7185');
        break;
      case 'iguanodon':
        player.ramTimer = player.abilityDuration;
        player.shields = Math.max(player.shields, 1);
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 18, false);
        gameCtx.showFloatText?.(player, 'ESPIGÃO DE POLEGAR!', '#52b788');
        break;
      case 'gallimimus':
        player.turboTimer = Math.max(player.turboTimer, player.abilityDuration);
        player.stamina = Math.min(player.maxStamina || 100, (player.stamina || 0) + 60);
        gameCtx.showFloatText?.(player, 'ARRANQUE RELÂMPAGO!', '#f4a261');
        break;
      case 'deinonychus':
        player.extraJumps = Math.max(player.extraJumps, 2);
        this._spawnProjectile(player.x - 0.5, 1.1, player.z - 0.7, -2.2, -46, this.spikeMat);
        this._spawnProjectile(player.x, 1.1, player.z - 0.8, 0, -48, this.spikeMat);
        this._spawnProjectile(player.x + 0.5, 1.1, player.z - 0.7, 2.2, -46, this.spikeMat);
        gameCtx.showFloatText?.(player, 'SALTO EM FOICE!', '#e63946');
        break;
      case 'kentrosaurus':
        player.shields = Math.min(4, (player.shields || 0) + 1);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          this._spawnProjectile(player.x, 1.0, player.z, Math.cos(ang) * 20, Math.sin(ang) * 20, this.spikeMat);
        }
        gameCtx.showFloatText?.(player, 'MURALHA DE ESPINHOS!', '#f4d35e');
        break;
      case 'diplodocus':
        this._spawnWave(player.x, player.z, '#38bdf8', 22);
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 26, false);
        gameCtx.stunPvPRival?.(player);
        gameCtx.showFloatText?.(player, 'CHICOTE SUPERSÔNICO!', '#a8dadc');
        break;
      case 'ceratosaurus':
        player.ramTimer = player.abilityDuration;
        this._spawnProjectile(player.x - 0.7, 1.0, player.z - 0.8, -1.5, -45, this.spikeMat);
        this._spawnProjectile(player.x + 0.7, 1.0, player.z - 0.8, 1.5, -45, this.spikeMat);
        gameCtx.showFloatText?.(player, 'CHIFRADA SÍSMICA!', '#b5179e');
        break;
      case 'argentinosaurus':
        this._spawnWave(player.x, player.z, '#3d5a80', 30);
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        gameCtx.cameraRig?.triggerShake(0.7, 0.35);
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 44, false);
        gameCtx.showFloatText?.(player, 'PISÃO TECTÔNICO!', '#ffd447');
        break;
      case 'ghostgold':
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        player.scoreMultBonus = 1.8;
        gameCtx.spawnEggRain?.(5);
        gameCtx.showFloatText?.(player, 'TRANSCENDÊNCIA!', '#ffd447');
        break;
      case 'mosasaurus':
      case 'liopleurodon':
        player.ramTimer = player.abilityDuration;
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration * 0.85);
        this._spawnWave(player.x, player.z, '#2dd4bf', 20);
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 22, true);
        gameCtx.showFloatText?.(player, spec.id === 'mosasaurus' ? 'MORDIDA ABISSAL!' : 'SALTO OCEÂNICO!', '#38bdf8');
        break;
      case 'elasmosaurus':
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        player.magnetTimer = Math.max(player.magnetTimer, 5.0);
        gameCtx.showFloatText?.(player, 'JATO DE MARÉ!', '#38bdf8');
        break;
      case 'dunkleosteus':
        player.shields = Math.min(5, (player.shields || 0) + 1);
        player.ramTimer = player.abilityDuration;
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 18, false);
        gameCtx.showFloatText?.(player, 'MANDÍBULA BLINDADA!', '#f59e0b');
        break;
      case 'pteranodon':
      case 'tapejara':
      case 'dimorphodon':
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration * 0.8);
        player.magnetTimer = Math.max(player.magnetTimer, spec.id === 'tapejara' ? 4.5 : 0);
        for (let k = -1; k <= 1; k++) {
          this._spawnProjectile(player.x + k * 0.8, 2.8, player.z - 0.8, k * 2, -46, this.plasmaMat);
        }
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 20, true);
        gameCtx.showFloatText?.(player, spec.ability.name.toUpperCase() + '!', '#38bdf8');
        break;
      case 'utahraptor':
        player.ramTimer = player.abilityDuration;
        player.speedBoostTimer = Math.max(player.speedBoostTimer, player.abilityDuration);
        gameCtx.showFloatText?.(player, 'GARRA FOICE TURBO!', '#ef4444');
        break;
      case 'mecha_rex':
        player.shields = Math.min(5, (player.shields || 0) + 1);
        this._spawnWave(player.x, player.z, '#00f5d4', 28);
        for (let i = 0; i < 4; i++) {
          this._spawnProjectile(player.x + (i - 1.5) * 0.65, 1.1, player.z - 1.0, 0, -56, this.plasmaMat);
        }
        gameCtx.clearNearbyObstacles?.(player.x, player.z, 34, false);
        gameCtx.showFloatText?.(player, 'CANHÃO DE PLASMA MECHA!', '#00f5d4');
        break;
      case 'cyber_raptor':
        player.invulnTimer = Math.max(player.invulnTimer, player.abilityDuration);
        player.speedBoostTimer = Math.max(player.speedBoostTimer, player.abilityDuration);
        player.magnetTimer = Math.max(player.magnetTimer, 4.5);
        this._spawnWave(player.x, player.z, '#38bdf8', 18);
        gameCtx.showFloatText?.(player, 'OVERCLOCK QUÂNTICO!', '#00f5d4');
        break;
      default:
        break;
    }

    return true;
  }

  _spawnProjectile(x, y, z, vx, vz, mat) {
    const mesh = buildVoxelProjectile(mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, vx, vz, life: 1.5 });
  }

  _spawnWave(x, z, color, maxRadius) {
    const geo = new THREE.RingGeometry(0.6, 1.0, 16);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.14, z);
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, geo, mat, age: 0, maxAge: 0.48, maxRadius });
  }

  update(dt, spawner, particles, onDestroyObstacle) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.y += dt * 10;

      // Colisão com obstáculos à frente
      const obstacles = spawner.getActiveObstacles();
      let consumed = false;
      for (const obs of obstacles) {
        if (obs.hit || obs.kind === 'egg' || obs.kind === 'powerup' || obs.kind === 'ramp') continue;
        const dx = Math.abs(obs.group.position.x - p.mesh.position.x);
        const dz = Math.abs(obs.group.position.z - p.mesh.position.z);
        if (dx < obs.halfW + 0.65 && dz < obs.halfD + 0.9) {
          obs.hit = true;
          obs.pool?.release(obs);
          particles.emitExplosion(obs.group.position.x, 0.8, obs.group.position.z, obs.color, 12, true);
          if (onDestroyObstacle) onDestroyObstacle(obs);
          consumed = true;
          break;
        }
      }

      if (consumed || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const w = this.shockwaves[i];
      w.age += dt;
      const t = w.age / w.maxAge;
      const s = 1 + t * w.maxRadius;
      w.mesh.scale.set(s, s, 1);
      w.mat.opacity = Math.max(0, 0.85 * (1 - t));
      if (w.age >= w.maxAge) {
        this.scene.remove(w.mesh);
        w.geo.dispose();
        w.mat.dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    for (const w of this.shockwaves) {
      this.scene.remove(w.mesh);
      w.geo.dispose();
      w.mat.dispose();
    }
    this.shockwaves = [];
  }
}
