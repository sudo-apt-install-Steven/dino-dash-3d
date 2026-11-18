// Bosses 3D com máquina de estados explícita (intro -> idle -> telegraph -> attack -> vulnerable),
// recepção de ataque [Q] do jogador, fases visuais e simulação headless para balanceamento.
import * as THREE from 'three';
import { LANE_X, RIVER_LANE_X, SKY_CORRIDOR_Y } from '../world/World.js';
import { Save } from '../systems/Save.js';
import { buildBossModel } from './BossModels.js';
import { StatusSystem } from '../systems/StatusSystem.js';
import { buildVoxelWeakOrb } from '../models/VoxelLibrary.js';
import { buildClaudeBossObstacle } from '../models/ClaudeVoxelModels.js';
import { ContentLoader } from '../content/ContentLoader.js';

export function computeBossPhase(hpRatio, phases = null) {
  const combatCfg = ContentLoader.getBossCombat();
  const p2 = phases?.[1]?.hpThreshold ?? combatCfg.phase2Threshold ?? 0.66;
  const p3 = phases?.[2]?.hpThreshold ?? combatCfg.phase3Threshold ?? 0.33;
  if (hpRatio <= p3) return 3;
  if (hpRatio <= p2) return 2;
  return 1;
}

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
  cyber_raptor: ['feixe', 'raio'],
  leviathan_abyssal: ['onda', 'poca', 'gelo'],
  mecha_titan: ['feixe', 'raio', 'rocha']
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
  scorpion_king: { id: 'scorpion_king', name: 'Rei Escorpião', title: 'Soberano das Dunas', hp: 5, color: '#9b1d42', weakOrder: [0, 2, 1], rewardAccessory: 'crown' },
  storm_eagle: { id: 'storm_eagle', name: 'Águia Tempestade', title: 'Senhora dos Ventos', hp: 5, color: '#3a86ff', weakOrder: [1, 0, 2], rewardAccessory: 'wings' },
  mother_ufo: { id: 'mother_ufo', name: 'Mãe OVNI', title: 'Nave-Mãe Extraterrestre', hp: 6, color: '#a855f7', weakOrder: [2, 1, 0], rewardAccessory: 'vr_visor' },
  alpha_trex: { id: 'alpha_trex', name: 'T-Rex Alfa', title: 'Rei dos Predadores', hp: 6, color: '#dc2626', weakOrder: [1, 2, 0], rewardAccessory: 'spikes' },
  plesiosaur: { id: 'plesiosaur', name: 'Plesiossauro Gigante', title: 'Leviatã Abissal', hp: 5, color: '#0284c7', weakOrder: [0, 1, 2], rewardAccessory: 'aura_fire' },
  swamp_hydra: { id: 'swamp_hydra', name: 'Hidra do Pântano', title: 'Terror de Três Cabeças', hp: 5, color: '#65a30d', weakOrder: [0, 2, 1], rewardAccessory: 'leaf_cape' },
  lava_golem: { id: 'lava_golem', name: 'Golem de Magma', title: 'Titã da Caldeira', hp: 6, color: '#f97316', weakOrder: [1, 0, 2], rewardAccessory: 'aura_fire' },
  frost_mammoth: { id: 'frost_mammoth', name: 'Mamute Glacial', title: 'Colosso da Tundra', hp: 6, color: '#38bdf8', weakOrder: [2, 1, 0], rewardAccessory: 'aura_ice' },
  cave_spider: { id: 'cave_spider', name: 'Aranha Cavernosa', title: 'Rainha das Sombras', hp: 5, color: '#84cc16', weakOrder: [0, 1, 0], rewardAccessory: 'bat_wings' },
  amber_scarab: { id: 'amber_scarab', name: 'Escaravelho de Âmbar', title: 'Guardião Dourado', hp: 5, color: '#f59e0b', weakOrder: [1, 2, 1], rewardAccessory: 'amber_medallion' },
  crystal_wyrm: { id: 'crystal_wyrm', name: 'Serpe Cristalina', title: 'Dragão de Ametista', hp: 6, color: '#c084fc', weakOrder: [2, 0, 2], rewardAccessory: 'crystal_wings' },
  cyber_raptor: { id: 'cyber_raptor', name: 'Raptor Cibernético [Mini-Boss]', title: 'Unidade Alfa-X', hp: 4, color: '#22d3ee', weakOrder: [0, 1, 2], rewardAccessory: 'visor_neon' },
  leviathan_abyssal: { id: 'leviathan_abyssal', name: 'Leviatã Abissal', title: 'Soberano das Fossas', hp: 6, color: '#06b6d4', weakOrder: [0, 2, 1], rewardAccessory: 'diving_mask' },
  mecha_titan: { id: 'mecha_titan', name: 'Titã Mecânico Ω', title: 'Colosso Cibernético', hp: 7, color: '#f43f5e', weakOrder: [2, 0, 1], rewardAccessory: 'mecha_wings' }
};

export class BossManager {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.headless = !!opts.headless;
    this.activeBoss = null;
    this.bossRig = null;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.state = 'idle'; // 'intro' | 'idle' | 'telegraph' | 'attack' | 'vulnerable' | 'defeated'
    this.stateTimer = 0;
    this.attackTimer = 1.4;
    this.animCycleTimer = 0;
    this.currentAnim = 'idle';

    // Orbe Ponto Fraco multi-voxel facetado
    this.weakOrb = this.headless ? { position: new THREE.Vector3(), rotation: new THREE.Euler(), visible: false } : buildVoxelWeakOrb();
    this.weakOrb.visible = false;
    if (!this.headless) this.scene.add(this.weakOrb);

    // Onda de choque de rugido / ataque
    this.shockRing = this.headless
      ? { position: new THREE.Vector3(), scale: new THREE.Vector3(1, 1, 1), rotation: new THREE.Euler(), material: { color: { set() {} }, opacity: 0.85 }, visible: false }
      : new THREE.Mesh(
          new THREE.RingGeometry(0.8, 1.5, 24),
          new THREE.MeshBasicMaterial({ color: '#ff3b30', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
    if (!this.headless) {
      this.shockRing.rotation.x = -Math.PI / 2;
      this.shockRing.visible = false;
      this.scene.add(this.shockRing);
    }
    this.shockTimer = 0;

    this.hazardShots = [];
    this.obsWarnCooldown = 0;
    this.pendingAttack = null;
    this.telegraphMarkers = this.headless
      ? [0, 1, 2].map(() => ({ visible: false, position: new THREE.Vector3(), material: { color: { set() {} }, opacity: 0.55 } }))
      : [0, 1, 2].map(() => {
          const mat = new THREE.MeshBasicMaterial({
            color: '#ff3b30',
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide
          });
          const marker = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 16), mat);
          marker.rotation.x = -Math.PI / 2;
          marker.visible = false;
          this.scene.add(marker);
          return marker;
        });
  }

  startBoss(bossId = 'alpha_trex', playerCount = 1, difficultyId = 'normal') {
    this.clear();
    const contentDef = ContentLoader.getBossById(bossId);
    const legacyDef = BOSS_DEFS[bossId] || BOSS_DEFS.alpha_trex;
    const def = { ...legacyDef, ...(contentDef || {}) };
    const combatCfg = ContentLoader.getBossCombat();

    const phases = Array.isArray(def.phases) && def.phases.length === 3
      ? def.phases
      : [
          { phase: 1, hpThreshold: 1.0, pattern: 'padrao_1', telegraphSec: combatCfg.defaultTelegraphSec ?? 0.85 },
          { phase: 2, hpThreshold: combatCfg.phase2Threshold ?? 0.66, pattern: 'padrao_2', telegraphSec: 0.72 },
          { phase: 3, hpThreshold: combatCfg.phase3Threshold ?? 0.33, pattern: 'padrao_3', telegraphSec: 0.58 }
        ];

    const isTeam = playerCount >= 2;
    const tierHp = def.hp || 6;
    const baseHpPerTier = combatCfg.baseHpPerTier ?? 350;
    const diffScale = combatCfg.hpScaleByDifficulty?.[difficultyId] ?? 1.0;
    const teamScale = isTeam ? 1 + Math.min(3, playerCount - 1) * 0.35 : 1.0;
    const scaledHp = Math.max(100, Math.round(tierHp * baseHpPerTier * diffScale * teamScale));

    this.state = 'intro';
    this.stateTimer = 1.65;
    this.attackTimer = combatCfg.idleBetweenAttacksSec ?? 1.4;

    this.activeBoss = {
      ...def,
      difficultyId,
      phases,
      weakness: StatusSystem.getBossWeakness(def.id),
      currentHp: scaledHp,
      maxHp: scaledHp,
      stepIndex: 0,
      phaseTime: 0,
      introTimer: 1.65,
      teamMode: isTeam,
      teamComboIds: new Set(),
      phase: 1,
      state: 'intro',
      currentPattern: phases[0]?.pattern || 'padrao_1',
      telegraphSec: phases[0]?.telegraphSec || combatCfg.defaultTelegraphSec || 0.85,
      lungeZ: 0,
      hitsTaken: 0
    };

    if (!this.headless) {
      this.bossRig = buildBossModel(def.id);
      this.bossRig.root.rotation.y = Math.PI;
      this.bossRig.setPhase?.(1);
      this.bossRig.setPhaseVisuals?.(1);
      this.group.add(this.bossRig.root);
    }
    this.group.position.set(0, 6.5, -24);
    this.group.visible = true;

    this.currentAnim = 'roar';
    this.animCycleTimer = 1.4;
    this._triggerShockwave(0, -22, def.color);
    this._spawnNextWeakOrb();
  }

  _triggerShockwave(x, z, color = '#ff3b30') {
    if (this.headless) return;
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
    const laneXs = this.currentHabitatMode === 'aquatic' && !this.currentIsAquaticBiome ? RIVER_LANE_X : LANE_X;
    const yPos = this.currentHabitatMode === 'flying' ? SKY_CORRIDOR_Y : 1.15;
    this.weakOrb.position.set(laneXs[lane], yPos, -72);
    this.weakOrb.visible = true;
  }

  _setState(nextState, durationSec, boss) {
    this.state = nextState;
    this.stateTimer = Math.max(0.05, durationSec);
    if (boss) {
      boss.state = nextState;
    }
  }

  update(dt, speed, players, ctx = {}) {
    if (!this.activeBoss) return;
    const b = this.activeBoss;
    const combatCfg = ContentLoader.getBossCombat();
    b.phaseTime += dt;
    this.currentHabitatMode = ctx?.habitatMode || 'land';
    this.currentIsAquaticBiome = !!ctx?.isAquaticBiome;
    const trackCenterX = this.currentHabitatMode === 'aquatic' && !this.currentIsAquaticBiome ? (RIVER_LANE_X[1] ?? 10) : 0;

    this.obsWarnCooldown = Math.max(0, (this.obsWarnCooldown || 0) - dt);
    const laneXs = this.currentHabitatMode === 'aquatic' && !ctx?.isAquaticBiome ? RIVER_LANE_X : LANE_X;
    const baseY = this.currentHabitatMode === 'flying' ? SKY_CORRIDOR_Y - 1.15 : 0;
    const minSafePaths = Math.max(1, ctx?.difficulty?.minSafePaths ?? 1);
    const showRedSign = ctx?.difficulty?.showRedHazardSignage ?? true;

    // Máquina de estados determinística: intro -> idle -> telegraph -> attack -> vulnerable -> idle
    this.stateTimer -= dt;

    if (this.state === 'intro') {
      b.introTimer = Math.max(0, this.stateTimer);
      const p = Math.max(0, b.introTimer / 1.65);
      this.group.position.set(trackCenterX, p * 6.5, -18 - p * 8);
      if (b.introTimer <= 0.8 && this.currentAnim !== 'roar') {
        this.currentAnim = 'roar';
        ctx.cameraRig?.triggerShake?.(0.45, 0.35);
        ctx.sfx?.roar?.(b.id);
      }
      if (this.stateTimer <= 0) {
        b.introTimer = 0;
        this._setState('idle', combatCfg.idleBetweenAttacksSec ?? 1.4, b);
      }
    } else if (this.state === 'idle') {
      const aggSpeed = b.phase >= 2 ? 1.85 : 1.35;
      this.group.position.x = trackCenterX + Math.sin(b.phaseTime * aggSpeed) * 1.9;
      this.group.position.y = Math.sin(b.phaseTime * 3.1) * 0.18;
      if (b.lungeZ > 0) b.lungeZ = Math.max(0, b.lungeZ - dt * 14);
      this.group.position.z = -18 + b.lungeZ;
      this.group.rotation.y = Math.sin(b.phaseTime * 0.9) * 0.15;

      if (this.stateTimer <= 0) {
        this._beginTelegraph(b, laneXs, baseY, minSafePaths, showRedSign, ctx, combatCfg);
      }
    } else if (this.state === 'telegraph') {
      this.group.position.x = trackCenterX + Math.sin(b.phaseTime * 2.2) * 1.4;
      this.group.position.y = Math.sin(b.phaseTime * 4.5) * 0.22;
      this.group.position.z = -17.5;
      const pulse = 0.35 + Math.abs(Math.sin(b.phaseTime * 18)) * 0.45;
      for (const m of this.telegraphMarkers) {
        if (m.visible) m.material.opacity = pulse;
      }
      if (this.stateTimer <= 0) {
        const atk = this.pendingAttack;
        this.pendingAttack = null;
        this._hideTelegraphMarkers();
        if (atk) {
          this._executeTelegraphedAttack(atk, players, ctx, b);
        }
        this._setState('attack', combatCfg.attackExecSec ?? 0.55, b);
      }
    } else if (this.state === 'attack') {
      if (b.lungeZ > 0) b.lungeZ = Math.max(0, b.lungeZ - dt * 10);
      this.group.position.x = trackCenterX;
      this.group.position.y = 0;
      this.group.position.z = -14.5 + b.lungeZ;
      if (this.stateTimer <= 0) {
        this.currentAnim = 'idle';
        const vulnSec = combatCfg.vulnerabilityWindowSec ?? 4.5;
        this._setState('vulnerable', vulnSec, b);
        ctx.showFloatText?.(players?.[0], '⚔️ CHEFE EXPOSTO! ATACAR [Q]!', '#58d63a');
      }
    } else if (this.state === 'vulnerable') {
      // Boss avança para dentro do alcance corpo a corpo (z = -14.5) e reduz oscilação lateral
      this.group.position.x += (trackCenterX - this.group.position.x) * Math.min(1, dt * 6);
      this.group.position.y = Math.sin(b.phaseTime * 5.0) * 0.08 - 0.15;
      this.group.position.z = -14.5;
      this.group.rotation.y = Math.sin(b.phaseTime * 1.6) * 0.08;
      if (this.stateTimer <= 0) {
        this._setState('idle', combatCfg.idleBetweenAttacksSec ?? 1.4, b);
      }
    }

    if (this.animCycleTimer > 0) {
      this.animCycleTimer -= dt;
      if (this.animCycleTimer <= 0) this.currentAnim = 'idle';
    }

    if (!this.headless) {
      this.bossRig?.updateAnimation?.(b.phaseTime, dt, this.currentAnim);
    }

    // Anima onda de choque
    if (this.shockTimer > 0) {
      this.shockTimer -= dt;
      const grow = 1 + (0.65 - this.shockTimer) * 18;
      this.shockRing.scale.setScalar(grow);
      this.shockRing.material.opacity = Math.max(0, this.shockTimer / 0.65);
      if (this.shockTimer <= 0) this.shockRing.visible = false;
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
          const py = (p.baseY || 0) + p.y;
          const pTop = py + (p.ducking ? 0.95 : 1.85);
          if (
            Math.abs(p.x - s.mesh.position.x) < s.halfW &&
            Math.abs(p.z - s.mesh.position.z) < s.halfD &&
            py < s.maxY &&
            pTop > s.minY
          ) {
            s.hit = true;
            if (s.status) StatusSystem.apply(p, s.status, 3.0, ctx);
            ctx.damagePlayer?.(p, 'boss');
          }
        }
      }
      if (s.mesh.position.z > 16) {
        if (!this.headless) this.scene.remove(s.mesh);
        this.hazardShots.splice(i, 1);
      }
    }

    // Move ponto fraco dourado
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

  _beginTelegraph(b, laneXs, baseY, minSafePaths, showRedSign, ctx, combatCfg) {
    const attackRoll = b.phase >= 3 && Math.random() < 0.45 ? 1 : Math.floor(Math.random() * 3);
    const profile = b.attackProfile || BOSS_ATTACK_PROFILES[b.id] || ['rocha', 'onda'];
    const chosenObs = profile[Math.floor(Math.random() * profile.length)];
    const telegraphSec = b.telegraphSec || combatCfg.defaultTelegraphSec || 0.85;

    const lanes = [];
    let isHigh = false;
    if (attackRoll === 0) {
      lanes.push(Math.floor(Math.random() * 3));
      this.currentAnim = 'bite';
      this.animCycleTimer = Math.max(0.5, telegraphSec);
    } else if (attackRoll === 1) {
      const safe = Math.floor(Math.random() * 3);
      if (minSafePaths >= 2) {
        lanes.push((safe + 2) % 3);
        if (b.phase >= 2) lanes.push((safe + 1) % 3);
      } else {
        for (let l = 0; l < 3; l++) {
          if (l !== safe) lanes.push(l);
        }
      }
      this.currentAnim = 'tail_sweep';
      this.animCycleTimer = Math.max(0.6, telegraphSec);
    } else {
      isHigh = true;
      lanes.push(Math.floor(Math.random() * 3));
      this.currentAnim = 'roar';
      this.animCycleTimer = Math.max(0.65, telegraphSec);
    }

    this.pendingAttack = {
      attackRoll,
      chosenObs,
      lanes,
      isHigh,
      minSafePaths,
      laneXs,
      baseY,
      showRedSign
    };
    this._showTelegraphMarkers(lanes, laneXs, baseY, isHigh ? '#ffd447' : '#ff3b30');
    this._setState('telegraph', telegraphSec, b);
    ctx.onBossTelegraph?.({
      boss: b,
      phase: b.phase,
      pattern: b.currentPattern,
      lanes,
      isHigh,
      telegraphSec
    });
  }

  /**
   * Recebe ataque do jogador (tecla Q / botão touch) com alcance e dano configurados em balance.json.
   */
  receivePlayerAttack(player, ctx = {}) {
    if (!this.activeBoss || this.state === 'defeated') {
      return { hit: false, reason: 'no_boss' };
    }
    if (!player || player.dead) {
      return { hit: false, reason: 'player_dead' };
    }
    if (this.state === 'intro') {
      return { hit: false, reason: 'boss_intro' };
    }

    const atkCfg = ContentLoader.getPlayerAttack();
    const combatCfg = ContentLoader.getBossCombat();
    const rangeZ = atkCfg.rangeZ ?? 18;
    const rangeX = atkCfg.rangeX ?? 2.6;

    const bossZ = this.group.position.z;
    const bossX = this.group.position.x;
    const dz = Math.abs((player.z || 0) - bossZ);
    const dx = Math.abs((player.x || 0) - bossX);

    if (dz > rangeZ || dx > rangeX + 1.5) {
      return { hit: false, reason: 'out_of_range', dx, dz };
    }

    const b = this.activeBoss;
    const baseDmg = atkCfg.damage ?? 28;
    const atkPower = player.attackPowerMult || 1;
    const weakMatch = b.weakness && player.element === b.weakness.element;
    const windowMult = this.state === 'vulnerable' ? 1.0 : (combatCfg.offWindowDamageMult ?? 0.45);
    const elemMult = weakMatch ? (1 + (combatCfg.elementalWeaknessBonusMult ?? 0.5)) : 1.0;
    const damage = Math.max(1, Math.round(baseDmg * atkPower * windowMult * elemMult));

    this._applyDamageToBoss(damage, player, ctx, {
      via: 'player_attack',
      weakMatch,
      criticalWindow: this.state === 'vulnerable'
    });

    return {
      hit: true,
      damage,
      remainingHp: this.activeBoss ? this.activeBoss.currentHp : 0,
      maxHp: b.maxHp,
      defeated: !this.activeBoss,
      state: this.state
    };
  }

  handlePlayerAttack(player, ctx = {}) {
    return this.receivePlayerAttack(player, ctx);
  }

  _applyDamageToBoss(dmg, player, ctx = {}, meta = {}) {
    const b = this.activeBoss;
    if (!b) return;

    b.currentHp = Math.max(0, b.currentHp - dmg);
    b.hitsTaken = (b.hitsTaken || 0) + 1;

    // Hidra do Pântano regenera 1x ao cair abaixo de 50%
    if (b.id === 'swamp_hydra' && !b.hydraRegenUsed && b.currentHp > 0 && b.currentHp <= Math.floor(b.maxHp * 0.5)) {
      b.hydraRegenUsed = true;
      const healAmt = Math.round(b.maxHp * 0.08);
      b.currentHp = Math.min(b.maxHp, b.currentHp + healAmt);
      ctx.showFloatText?.(player, `🐍 HIDRA REGENEROU (+${healAmt} HP)!`, '#a3e635');
      ctx.sfx?.roar?.('swamp_hydra');
    }

    const hpRatio = b.currentHp / Math.max(1, b.maxHp);
    const prevPhase = b.phase;
    const nextPhase = computeBossPhase(hpRatio, b.phases);
    this.bossRig?.setPhase?.(nextPhase);
    this.bossRig?.setPhaseVisuals?.(hpRatio);
    b.phase = nextPhase;
    const phaseCfg = b.phases?.[nextPhase - 1];
    if (phaseCfg) {
      b.currentPattern = phaseCfg.pattern;
      b.telegraphSec = phaseCfg.telegraphSec;
    }

    ctx.sfx?.stomp?.();
    ctx.cameraRig?.triggerShake?.(meta.criticalWindow ? 0.45 : 0.28, 0.18);
    ctx.particles?.emitExplosion?.(this.group.position.x, 2.0, this.group.position.z, meta.criticalWindow ? '#ffd447' : '#fb923c', 14, true);

    if (b.phase > prevPhase) {
      this.currentAnim = 'roar';
      this.animCycleTimer = 1.1;
      this._triggerShockwave(this.group.position.x, this.group.position.z, '#ff2e2e');
      ctx.sfx?.roar?.(b.id);
      ctx.showFloatText?.(player, `⚠️ FÚRIA FASE ${b.phase}! (${b.currentPattern || 'OVERDRIVE'})`, '#ff4757');
    } else if (meta.via === 'player_attack') {
      const tag = meta.criticalWindow ? `⚔️ -${dmg} HP!` : `⚔️ -${dmg} HP`;
      ctx.showFloatText?.(player, tag, meta.criticalWindow ? '#ffd447' : '#fdba74');
    } else {
      ctx.showFloatText?.(player, `PONTO FRACO! -${dmg} HP`, '#ffd447');
    }

    if (b.currentHp <= 0) {
      const defeated = b;
      const rewards = ContentLoader.getBalance().rewards || {};
      const rewardMult = rewards.bossRewardMult ?? 1.0;
      const eggReward = Math.round((defeated.rewardEggs || rewards.bossDefaultEggs || 55) * rewardMult);
      const crystalReward = (defeated.rewardCrystals || rewards.bossDefaultCrystals || 3) + (defeated.bonusCrystals || 0);
      const scoreBonus = Math.round((rewards.bossScoreBonus || 750) * rewardMult);

      ctx.particles?.emitExplosion?.(this.group.position.x, 2.6, this.group.position.z, '#ff9a24', 32, true);
      this.state = 'defeated';
      this.clear();
      ctx.onBossHudUpdate?.(null);
      ctx.addScore?.(scoreBonus);
      if (!this.headless) {
        Save.addEggs(eggReward);
        Save.data.crystals = (Save.data.crystals || 0) + crystalReward;
        if (!Save.data.dinoHouse.trophies.includes(defeated.id)) {
          Save.data.dinoHouse.trophies.push(defeated.id);
        }
        if (defeated.rewardAccessory && !Save.data.unlockedAccessories.includes(defeated.rewardAccessory)) {
          Save.data.unlockedAccessories.push(defeated.rewardAccessory);
        }
        Save.save();
      }
      ctx.sfx?.victory?.();
      ctx.onBossDefeated?.(defeated);
      ctx.showFloatText?.(player, `🏆 ${defeated.name} DERROTADO! +${eggReward} 🥚 & +${crystalReward} 💎!`, '#58d63a');
    }
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
    if (this.headless) return;
    const obsType = opts.obsType || 'rocha';
    const cfg = BOSS_OBS_CFG[obsType] || BOSS_OBS_CFG.rocha;
    const isHigh = !!opts.isHigh;
    const laneIdx = opts.laneIdx ?? 1;
    const yBase = typeof opts.laneY === 'number' ? opts.laneY : 0;

    const buildType = isHigh && !['tronco', 'rocha', 'gelo'].includes(obsType) ? 'rocha' : obsType;
    const buildCfg = BOSS_OBS_CFG[buildType] || cfg;
    const showRedSign = opts.showRedSign !== undefined ? !!opts.showRedSign : true;
    const shot = buildClaudeBossObstacle(buildType, {
      withWarn: showRedSign && !isHigh,
      centeredBody: isHigh && buildType !== 'gelo' ? true : !!buildCfg.centeredBody
    });

    if (isHigh) {
      const isIceBarrier = buildType === 'gelo';
      shot.scale.setScalar(isIceBarrier ? 0.98 : 0.86);
      shot.position.set(x, (yBase > 0 ? yBase : 0) + (isIceBarrier ? 0.48 : 1.38), z);
      this.scene.add(shot);
      this.hazardShots.push({
        mesh: shot,
        hit: false,
        obsType: buildType,
        laneIdx,
        isHigh: true,
        spinX: !isIceBarrier,
        minY: (yBase > 0 ? yBase : 0) + 1.05,
        maxY: (yBase > 0 ? yBase : 0) + 2.38,
        halfW: 0.78,
        halfD: 0.78,
        extraSpeed: 10,
        status: null
      });
      return;
    }

    const groundY = y ?? buildCfg.yPos ?? 0;
    shot.scale.setScalar(buildCfg.scale || 1);
    shot.position.set(x, groundY, z);
    this.scene.add(shot);
    this.hazardShots.push({
      mesh: shot,
      hit: false,
      obsType: buildType,
      laneIdx,
      isHigh: false,
      spinX: !!buildCfg.spinX,
      minY: groundY + buildCfg.minY,
      maxY: groundY + buildCfg.maxY,
      halfW: buildCfg.halfW,
      halfD: buildCfg.halfD,
      extraSpeed: buildCfg.extraSpeed ?? 9,
      status: buildCfg.status || null
    });
  }

  _showTelegraphMarkers(lanes, laneXs, baseY = 0, color = '#ff3b30') {
    this._hideTelegraphMarkers();
    if (this.headless) return;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const m = this.telegraphMarkers[lane];
      if (!m) continue;
      m.material.color.set(color);
      m.position.set(laneXs[lane], baseY + 0.08, -24);
      m.visible = true;
    }
  }

  _hideTelegraphMarkers() {
    for (const m of this.telegraphMarkers) {
      m.visible = false;
    }
  }

  _executeTelegraphedAttack(atk, players, ctx, b) {
    const { attackRoll, chosenObs, lanes, isHigh, minSafePaths, laneXs, baseY, showRedSign } = atk;
    if (attackRoll === 0) {
      b.lungeZ = 3.2;
      const lane = lanes[0] ?? 1;
      this._spawnShot(laneXs[lane], baseY, -28, { obsType: chosenObs, laneIdx: lane, laneY: baseY, showRedSign });
      this._announceObs(chosenObs, players, ctx, b);
    } else if (attackRoll === 1) {
      if (minSafePaths >= 2) {
        const jumpableObs = chosenObs === 'raio' || chosenObs === 'feixe' || chosenObs === 'gelo' ? 'onda' : chosenObs;
        if (lanes[0] !== undefined) {
          this._spawnShot(laneXs[lanes[0]], baseY, -28, { obsType: chosenObs, laneIdx: lanes[0], laneY: baseY, showRedSign });
        }
        if (lanes[1] !== undefined) {
          this._spawnShot(laneXs[lanes[1]], baseY, -28, { obsType: jumpableObs, isHigh: true, laneIdx: lanes[1], laneY: baseY, showRedSign });
        }
      } else {
        for (const l of lanes) {
          this._spawnShot(laneXs[l], baseY, -28, { obsType: chosenObs, laneIdx: l, laneY: baseY, showRedSign });
        }
      }
      this._announceObs(chosenObs, players, ctx, b);
    } else {
      ctx.cameraRig?.triggerShake?.(0.32, 0.25);
      this._triggerShockwave(this.group.position.x, -26, b.color);
      const lane = lanes[0] ?? 1;
      this._spawnShot(laneXs[lane], baseY, -28, { obsType: chosenObs, isHigh, laneIdx: lane, laneY: baseY, showRedSign });
      this._announceObs(chosenObs, players, ctx, b, true);
    }
  }

  getBlockedLanesNearZ(zMin, zMax) {
    const blocked = new Set();
    if (!this.activeBoss || !this.hazardShots.length) return blocked;
    for (let i = 0; i < this.hazardShots.length; i++) {
      const s = this.hazardShots[i];
      const sz = s.mesh.position.z;
      if (sz >= zMin && sz <= zMax && s.laneIdx >= 0 && s.laneIdx <= 2) {
        blocked.add(s.laneIdx);
      }
    }
    return blocked;
  }

  _hitBossWeakPoint(player, players, ctx) {
    if (!this.activeBoss) return;
    const b = this.activeBoss;
    const aliveCount = players.filter((pl) => !pl.dead).length;

    if (b.teamMode && aliveCount >= 2 && !player.abilityDuration) {
      b.teamComboIds.add(player.id);
      if (b.teamComboIds.size < Math.min(2, aliveCount)) {
        ctx.sfx?.click?.();
        ctx.showFloatText?.(player, `ATAQUE EM EQUIPE (${b.teamComboIds.size}/2)!`, '#38bdf8');
        this._spawnNextWeakOrb();
        return;
      }
      b.teamComboIds.clear();
    }

    const atkCfg = ContentLoader.getPlayerAttack();
    const combatCfg = ContentLoader.getBossCombat();
    const weakMatch = b.weakness && player.element === b.weakness.element;
    const baseOrbDmg = (atkCfg.damage ?? 28) * (combatCfg.weakOrbDamageMult ?? 2.5);
    const activeBonus = (player.abilityDuration > 0 || player.attackTimer > 0) ? 1.25 : 1.0;
    const elemBonus = weakMatch ? (1 + (combatCfg.elementalWeaknessBonusMult ?? 0.5)) : 1.0;
    const dmg = Math.max(1, Math.round(baseOrbDmg * activeBonus * elemBonus));

    if (weakMatch) {
      ctx.showFloatText?.(player, `${b.weakness.icon} FRAQUEZA ELEMENTAL! +DANO!`, '#fde047');
    }
    b.stepIndex++;
    this._applyDamageToBoss(dmg, player, ctx, { via: 'weak_orb', weakMatch });
    if (this.activeBoss) {
      this._spawnNextWeakOrb();
    }
  }

  getDebugState() {
    if (!this.activeBoss) {
      return { active: false, state: 'none', phase: 0, hp: 0, maxHp: 0 };
    }
    return {
      active: true,
      id: this.activeBoss.id,
      name: this.activeBoss.name,
      hp: this.activeBoss.currentHp,
      maxHp: this.activeBoss.maxHp,
      phase: this.activeBoss.phase,
      state: this.state,
      stateTimer: Number(this.stateTimer.toFixed(2)),
      z: Number(this.group.position.z.toFixed(2)),
      x: Number(this.group.position.x.toFixed(2))
    };
  }

  clear() {
    this.activeBoss = null;
    this.bossRig = null;
    this.pendingAttack = null;
    this.state = 'idle';
    this.stateTimer = 0;
    this._hideTelegraphMarkers();
    this.weakOrb.visible = false;
    this.shockRing.visible = false;
    this.shockTimer = 0;
    this.group.visible = false;
    while (this.group.children.length > 0) this.group.remove(this.group.children[0]);
    if (!this.headless) {
      for (const s of this.hazardShots) this.scene.remove(s.mesh);
    }
    this.hazardShots = [];
  }

  /**
   * Simulação headless determinística da luta contra o boss com bot que ataca [Q] na janela de dano.
   * Prova a meta de duração (Fácil ~45-60s, Normal 60-90s, Difícil ~90-120s) sem travamentos.
   */
  static simulateBossFightHeadless(difficultyId = 'normal', bossId = 'alpha_trex', options = {}) {
    const mockScene = { add() {}, remove() {} };
    const mgr = new BossManager(mockScene, { headless: true });
    mgr.startBoss(bossId, options.playerCount || 1, difficultyId);

    const atkCfg = ContentLoader.getPlayerAttack();
    const atkCooldownSec = atkCfg.cooldownSec ?? 0.65;
    const dt = options.dt || 0.05;
    const maxSimSec = options.maxSimSec || 240;

    const bot = {
      id: 'trex',
      dead: false,
      x: 0,
      z: 0,
      y: 0,
      baseY: 0,
      element: null,
      attackPowerMult: 1,
      attackTimer: 0,
      abilityDuration: 0
    };

    const phasesVisited = new Set([1]);
    const statesVisited = new Set([mgr.state]);
    let elapsed = 0;
    let cooldown = 0;
    let hitsLanded = 0;
    let totalDamage = 0;
    let defeated = false;
    let lastState = mgr.state;
    let sameStateDuration = 0;
    let stuckDetected = false;

    const mockCtx = {
      onBossDefeated: () => {
        defeated = true;
      }
    };

    while (elapsed < maxSimSec && mgr.activeBoss) {
      mgr.update(dt, 24, [bot], mockCtx);
      elapsed += dt;
      if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);

      if (mgr.activeBoss) {
        phasesVisited.add(mgr.activeBoss.phase);
        statesVisited.add(mgr.state);
        if (mgr.state === lastState) {
          sameStateDuration += dt;
          if (sameStateDuration > 15) {
            stuckDetected = true;
            break;
          }
        } else {
          lastState = mgr.state;
          sameStateDuration = 0;
        }

        // Bot ataca com [Q] sempre que o boss está na janela de dano ('vulnerable')
        if (mgr.state === 'vulnerable' && cooldown <= 0) {
          const res = mgr.receivePlayerAttack(bot, mockCtx);
          if (res.hit) {
            hitsLanded++;
            totalDamage += res.damage;
            cooldown = atkCooldownSec;
          }
        }
      }
    }

    return {
      ok: defeated && !stuckDetected,
      difficulty: difficultyId,
      bossId,
      durationSec: Number(elapsed.toFixed(2)),
      hitsLanded,
      totalDamage,
      phasesVisited: [...phasesVisited].sort(),
      statesVisited: [...statesVisited],
      finalState: mgr.state,
      stuckDetected
    };
  }
}
