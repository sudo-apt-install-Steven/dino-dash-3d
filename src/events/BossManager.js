// Bosses 3D Redesenhados com barra de vida estilizada, fases visuais, partes destrutíveis,
// ataques animados (rugido + onda de choque, mordida, rabada, investida), intro e coop em equipe.
import * as THREE from 'three';
import { LANE_X } from '../world/World.js';
import { Save } from '../systems/Save.js';
import { buildBossModel } from './BossModels.js';
import { StatusSystem } from '../systems/StatusSystem.js';
import { buildVoxelWeakOrb } from '../models/VoxelLibrary.js';
import { buildClaudeBossObstacle } from '../models/ClaudeVoxelModels.js';

export const BOSS_ATTACK_PROFILES = {
  alpha_trex: ['tronco', 'rocha', 'onda'],
  scorpion_king: ['espinhos', 'rocha'],
  storm_eagle: ['raio', 'onda'],
  mother_ufo: ['feixe', 'raio'],
  swamp_hydra: ['poca', 'tronco'],
  lava_golem: ['magma', 'rocha'],
  frost_mammoth: ['gelo', 'onda'],
  cave_spider: ['teia', 'poca'],
  plesiosaur: ['onda', 'poca'],
  amber_scarab: ['espinhos', 'rocha'],
  crystal_wyrm: ['gelo', 'raio'],
  cyber_raptor: ['feixe', 'raio']
};

export const BOSS_OBS_CFG = {
  tronco: { minY: 0, maxY: 0.9, halfW: 0.85, halfD: 0.45, spinX: true, centeredBody: true, yPos: 0.42, scale: 1.25, extraSpeed: 9, label: '🪵 TRONCO DO CHEFE!' },
  rocha: { minY: 0, maxY: 1.48, halfW: 0.72, halfD: 0.68, yPos: 0, scale: 1.15, extraSpeed: 7, label: '🪨 ROCHA PARTIDA!' },
  onda: { minY: 0, maxY: 0.72, halfW: 0.98, halfD: 0.95, yPos: 0, scale: 0.9, extraSpeed: 10, label: '🌊 ONDA SÍSMICA!' },
  espinhos: { minY: 0, maxY: 1.4, halfW: 0.85, halfD: 0.85, yPos: 0, scale: 1.0, extraSpeed: 8, label: '🌵 ESPINHOS DE AREIA!' },
  raio: { minY: 0, maxY: 2.3, halfW: 0.65, halfD: 0.65, yPos: 0, scale: 1.05, extraSpeed: 12, label: '⚡ RAIO DO CHEFE!' },
  feixe: { minY: 0, maxY: 2.5, halfW: 0.8, halfD: 0.8, yPos: 0, scale: 0.98, extraSpeed: 11, label: '🛸 FEIXE ABDUÇÃO!' },
  poca: { minY: 0, maxY: 0.48, halfW: 0.82, halfD: 0.82, yPos: 0, scale: 1.0, extraSpeed: 5, status: 'poison', label: '☠️ POÇA TÓXICA!' },
  magma: { minY: 0, maxY: 1.65, halfW: 0.7, halfD: 0.7, yPos: 0, scale: 1.05, extraSpeed: 8, label: '🌋 PILAR DE MAGMA!' },
  gelo: { minY: 0, maxY: 1.85, halfW: 0.82, halfD: 0.82, yPos: 0, scale: 1.0, extraSpeed: 9, label: '❄️ ESTALACTITES!' },
  teia: { minY: 0, maxY: 1.95, halfW: 0.85, halfD: 0.55, yPos: 0, scale: 0.95, extraSpeed: 6, status: 'mud', label: '🕸️ TEIA PEGAJOSA!' }
};

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
  },
  swamp_hydra: {
    id: 'swamp_hydra',
    name: 'Hidra do Pântano',
    title: 'Terror de Três Cabeças',
    hp: 5,
    color: '#65a30d',
    weakOrder: [0, 2, 1],
    rewardAccessory: 'leaf_cape'
  },
  lava_golem: {
    id: 'lava_golem',
    name: 'Golem de Magma',
    title: 'Titã da Caldeira',
    hp: 6,
    color: '#f97316',
    weakOrder: [1, 0, 2],
    rewardAccessory: 'aura_fire'
  },
  frost_mammoth: {
    id: 'frost_mammoth',
    name: 'Mamute Glacial',
    title: 'Colosso da Tundra',
    hp: 6,
    color: '#38bdf8',
    weakOrder: [2, 1, 0],
    rewardAccessory: 'aura_ice'
  },
  cave_spider: {
    id: 'cave_spider',
    name: 'Aranha Cavernosa',
    title: 'Rainha das Sombras',
    hp: 5,
    color: '#84cc16',
    weakOrder: [0, 1, 0],
    rewardAccessory: 'bat_wings'
  },
  amber_scarab: {
    id: 'amber_scarab',
    name: 'Escaravelho de Âmbar',
    title: 'Guardião Dourado',
    hp: 5,
    color: '#f59e0b',
    weakOrder: [1, 2, 1],
    rewardAccessory: 'amber_medallion'
  },
  crystal_wyrm: {
    id: 'crystal_wyrm',
    name: 'Serpe Cristalina',
    title: 'Dragão de Ametista',
    hp: 6,
    color: '#c084fc',
    weakOrder: [2, 0, 2],
    rewardAccessory: 'crystal_wings'
  },
  cyber_raptor: {
    id: 'cyber_raptor',
    name: 'Raptor Cibernético [Mini-Boss]',
    title: 'Unidade Alfa-X',
    hp: 4,
    color: '#22d3ee',
    weakOrder: [0, 1, 2],
    rewardAccessory: 'visor_neon'
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

    // Orbe Ponto Fraco multi-voxel facetado (cristal cruzado + 4 nodos orbitais)
    this.weakOrb = buildVoxelWeakOrb();
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
    this.obsWarnCooldown = 0;
    this.shotMat = new THREE.MeshStandardMaterial({ color: '#ff2e63', emissive: '#ff5500', emissiveIntensity: 0.85 });
  }

  startBoss(bossId = 'alpha_trex', playerCount = 1) {
    this.clear();
    const def = BOSS_DEFS[bossId] || BOSS_DEFS.alpha_trex;
    const isTeam = playerCount >= 2;
    const scaledHp = isTeam ? def.hp + Math.min(4, playerCount) : def.hp;

    this.activeBoss = {
      ...def,
      weakness: StatusSystem.getBossWeakness(def.id),
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
    this.obsWarnCooldown = Math.max(0, (this.obsWarnCooldown || 0) - dt);
    if (b.introTimer <= 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        const hpLost = b.maxHp - b.currentHp;
        this.attackTimer = Math.max(0.72, 1.75 - hpLost * 0.13);
        const attackRoll = Math.floor(Math.random() * 3);
        const profile = BOSS_ATTACK_PROFILES[b.id] || ['rocha', 'onda'];
        const chosenObs = profile[Math.floor(Math.random() * profile.length)];

        if (attackRoll === 0) {
          this.currentAnim = 'bite';
          this.animCycleTimer = 0.6;
          b.lungeZ = 4.2;
          const lane = Math.floor(Math.random() * 3);
          this._spawnShot(LANE_X[lane], 0, -31, { obsType: chosenObs });
          this._announceObs(chosenObs, players, ctx, b);
        } else if (attackRoll === 1) {
          this.currentAnim = 'tail_sweep';
          this.animCycleTimer = 0.7;
          // Fase 2+: dispara duas faixas deixando 1 livre!
          const safe = Math.floor(Math.random() * 3);
          for (let l = 0; l < 3; l++) {
            if (l === safe && b.phase < 3) continue;
            if (l === safe && b.phase >= 3 && Math.random() < 0.75) continue;
            this._spawnShot(LANE_X[l], 0, -32, { obsType: chosenObs });
          }
          this._announceObs(chosenObs, players, ctx, b);
        } else {
          this.currentAnim = 'roar';
          this.animCycleTimer = 0.75;
          ctx.cameraRig?.triggerShake(0.32, 0.25);
          this._triggerShockwave(this.group.position.x, -32, b.color);
          const lane = Math.floor(Math.random() * 3);
          this._spawnShot(LANE_X[lane], 1.15, -32, { obsType: chosenObs, isHigh: true });
          this._announceObs(chosenObs, players, ctx, b, true);
        }
      }
    }

    // Move obstáculos & ataques temáticos do boss
    for (let i = this.hazardShots.length - 1; i >= 0; i--) {
      const s = this.hazardShots[i];
      s.mesh.position.z += (speed + s.extraSpeed) * dt;
      if (s.spinX) {
        s.mesh.rotation.x += dt * 8;
        if (s.isHigh) s.mesh.rotation.y += dt * 4;
      }
      if (!s.hit) {
        for (const p of players) {
          if (p.dead) continue;
          const pTop = p.y + (p.ducking ? 0.95 : 1.85);
          if (
            Math.abs(p.x - s.mesh.position.x) < s.halfW &&
            Math.abs(p.z - s.mesh.position.z) < s.halfD &&
            p.y < s.maxY &&
            pTop > s.minY
          ) {
            s.hit = true;
            if (s.status) StatusSystem.apply(p, s.status, 3.0, ctx);
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

  _announceObs(obsType, players, ctx, boss, isHigh = false) {
    boss.lastObsType = obsType;
    if (this.obsWarnCooldown > 0 || !players.length) return;
    const cfg = BOSS_OBS_CFG[obsType];
    if (!cfg) return;
    this.obsWarnCooldown = 4.2;
    const msg = isHigh ? '⬇️ ABAIXE! ATAQUE ALTO!' : cfg.label;
    ctx.showFloatText?.(players[0], msg, boss.color);
  }

  _spawnShot(x, y, z, opts = {}) {
    const obsType = opts.obsType || 'rocha';
    const cfg = BOSS_OBS_CFG[obsType] || BOSS_OBS_CFG.rocha;
    const isHigh = !!opts.isHigh;

    // Ataques altos permitem passar abaixado (rocha/tronco arremessados ou cristal elevado)
    const buildType = isHigh && !['tronco', 'rocha', 'gelo'].includes(obsType) ? 'rocha' : obsType;
    const buildCfg = BOSS_OBS_CFG[buildType] || cfg;
    const shot = buildClaudeBossObstacle(buildType, {
      withWarn: !isHigh,
      centeredBody: isHigh && buildType !== 'gelo' ? true : !!buildCfg.centeredBody
    });

    if (isHigh) {
      const isIceBarrier = buildType === 'gelo';
      shot.scale.setScalar(isIceBarrier ? 0.98 : 0.86);
      shot.position.set(x, isIceBarrier ? 0.48 : 1.38, z);
      this.scene.add(shot);
      this.hazardShots.push({
        mesh: shot,
        hit: false,
        obsType: buildType,
        isHigh: true,
        spinX: !isIceBarrier,
        minY: 1.05,
        maxY: 2.38,
        halfW: 0.78,
        halfD: 0.78,
        extraSpeed: 10,
        status: null
      });
      return;
    }

    shot.scale.setScalar(buildCfg.scale || 1);
    shot.position.set(x, buildCfg.yPos ?? y, z);
    this.scene.add(shot);
    this.hazardShots.push({
      mesh: shot,
      hit: false,
      obsType: buildType,
      isHigh: false,
      spinX: !!buildCfg.spinX,
      minY: buildCfg.minY,
      maxY: buildCfg.maxY,
      halfW: buildCfg.halfW,
      halfD: buildCfg.halfD,
      extraSpeed: buildCfg.extraSpeed ?? 9,
      status: buildCfg.status || null
    });
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

    const weakMatch = b.weakness && player.element === b.weakness.element;
    const baseDmg = (player.abilityDuration > 0 || player.attackTimer > 0) ? 2 : 1;
    const dmg = baseDmg + (weakMatch ? 1 : 0);
    if (weakMatch) {
      ctx.showFloatText?.(player, `${b.weakness.icon} FRAQUEZA ELEMENTAL! +DANO!`, '#fde047');
    }
    b.currentHp = Math.max(0, b.currentHp - dmg);
    b.stepIndex++;

    // Mecânica especial da Hidra do Pântano: regenera +1 cabeça/HP na primeira vez que cai abaixo de 50%!
    if (b.id === 'swamp_hydra' && !b.hydraRegenUsed && b.currentHp > 0 && b.currentHp <= Math.ceil(b.maxHp * 0.5)) {
      b.hydraRegenUsed = true;
      b.currentHp = Math.min(b.maxHp, b.currentHp + 1);
      ctx.showFloatText?.(player, '🐍 HIDRA REGENEROU +1 CABEÇA (+1 HP)!', '#a3e635');
      ctx.sfx?.roar('swamp_hydra');
    }

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
      Save.addEggs(55);
      Save.data.crystals = (Save.data.crystals || 0) + 3 + (defeated.bonusCrystals || 0);
      if (!Save.data.dinoHouse.trophies.includes(defeated.id)) {
        Save.data.dinoHouse.trophies.push(defeated.id);
      }
      if (defeated.rewardAccessory && !Save.data.unlockedAccessories.includes(defeated.rewardAccessory)) {
        Save.data.unlockedAccessories.push(defeated.rewardAccessory);
      }
      Save.save();
      ctx.sfx?.victory();
      ctx.onBossDefeated?.(defeated);
      ctx.showFloatText?.(player, `🏆 ${defeated.name} DERROTADO! +55 🥚 & +3 💎!`, '#58d63a');
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
