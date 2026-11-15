// Spawner completo com ObjectPool e PRNG semeável para obstáculos, inimigos,
// rampas, pedras de wall-jump, ovos, power-ups, fogueiras e atalhos secretos.
import * as THREE from 'three';
import { ObjectPool } from './ObjectPool.js';
import { LANE_X, RIVER_LANE_X, SHOP_LANE_X, SKY_CORRIDOR_Y } from '../world/World.js';
import { TRACK_POWERUPS, TRACK_POWERUP_KEYS, BACKPACK_ITEM_KEYS } from './Items.js';
import { Save } from './Save.js';
import {
  buildVoxelPowerupCrate,
  buildVoxelMudPool,
  buildVoxelToxicPool,
  buildVoxelFruit,
  buildVoxelElementalEgg,
  buildVoxelPortalArch,
  buildVoxelRollingLog,
  buildVoxelTallRock,
  buildVoxelCampfire,
  buildVoxelTreasureChest,
  buildVoxelGrapple,
  buildVoxelCactusShooter,
  buildVoxelSpineShot,
  buildVoxelMinecartZone,
  buildVoxelRiverLog,
  buildVoxelAmberCrystal,
  buildVoxelGeyserVent,
  buildVoxelTarPit,
  buildVoxelStalactite,
  buildVoxelElectricPylon,
  buildVoxelSpikeBarricade
} from '../models/VoxelLibrary.js';
import {
  buildChunkOasis,
  buildChunkFragileBridge,
  buildChunkRescueCross
} from '../world/TrackChunks.js';
import {
  buildClaudeEggGroup,
  buildClaudeBuffPlatform,
  buildClaudeBossObstacle,
  buildHazardFloorSign,
  buildTallProhibitionBarrier,
  buildDuckSignOverlay,
  buildShopLaneGateGroup
} from '../models/ClaudeVoxelModels.js';

const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const DANGER_TRIM_MAT = new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: 0.72 });
const SAFE_AURA_MAT = new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.55, side: THREE.DoubleSide });

function makeBox(parent, w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(BOX_GEO, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addDangerTrim(parent, w, d) {
  const trimGroup = new THREE.Group();
  makeBox(trimGroup, w + 0.14, 0.05, 0.07, 0, 0.03, d * 0.5 + 0.04, DANGER_TRIM_MAT);
  makeBox(trimGroup, w + 0.14, 0.05, 0.07, 0, 0.03, -d * 0.5 - 0.04, DANGER_TRIM_MAT);
  makeBox(trimGroup, 0.07, 0.05, d, -w * 0.5 - 0.04, 0.03, 0, DANGER_TRIM_MAT);
  makeBox(trimGroup, 0.07, 0.05, d, w * 0.5 + 0.04, 0.03, 0, DANGER_TRIM_MAT);
  parent.add(trimGroup);
  return trimGroup;
}

export function createSeededRng(seedStr) {
  let h = 2166136261 >>> 0;
  const s = String(seedStr || Date.now());
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function rng() {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.rng = Math.random;
    this.spawnTimer = 1.65;
    this.difficultyId = 'normal';
    this.showRedHazardSignage = true;
    this.minSafePaths = 2;
    this.habitatMode = 'land';
    this.isAquaticBiome = false;
    this.bossManager = null;
    this.magneticStormActive = false;
    this.elapsed = 0;
    this.biomeId = 'desert';
    this.densityMult = 1.0;
    this.tutorialMode = false;
    this.showObstacleHints = true;
    this.oasisReliefTimer = 0;
    this.chunkCooldown = 34;
    this.powerupCooldown = 8;
    this.featureCooldown = 7;
    this.collectibleCooldown = 4.5;
    this._hintMaterials = new Map();
    this._hintSprites = [];

    this._initMaterials();
    this._initPools();
  }

  _getHintMaterial(label, accentColor = '#ffd447') {
    const key = `${label}|${accentColor}`;
    if (this._hintMaterials.has(key)) return this._hintMaterials.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 68;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(6, 6, 348, 56, 26);
      else ctx.rect(6, 6, 348, 56);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 22px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, 180, 35, 326);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });
    this._hintMaterials.set(key, mat);
    return mat;
  }

  _attachHint(group, badgeY, label, accentColor, scaleX = 1.85) {
    const sprite = new THREE.Sprite(this._getHintMaterial(label, accentColor));
    sprite.position.set(0, badgeY, 0);
    sprite.scale.set(scaleX, 0.36, 1);
    sprite.renderOrder = 6;
    sprite.visible = this.showObstacleHints;
    group.add(sprite);
    this._hintSprites.push(sprite);
    return sprite;
  }

  _setHint(item, label, accentColor) {
    if (!item?.hintSprite) return;
    item.hintSprite.material = this._getHintMaterial(label, accentColor);
    item.hintSprite.visible = this.showObstacleHints;
  }

  setObstacleHints(enabled) {
    this.showObstacleHints = !!enabled;
    for (let i = 0; i < this._hintSprites.length; i++) {
      this._hintSprites[i].visible = this.showObstacleHints;
    }
  }

  _initMaterials() {
    this.cactusMat = new THREE.MeshStandardMaterial({ color: '#2f9e36', roughness: 0.75 });
    this.cactusDarkMat = new THREE.MeshStandardMaterial({ color: '#1f7024', roughness: 0.8 });
    this.flowerMat = new THREE.MeshStandardMaterial({ color: '#ff6ca8', roughness: 0.5 });
    this.birdMat = new THREE.MeshStandardMaterial({ color: '#6b3e26', roughness: 0.65 });
    this.birdWingMat = new THREE.MeshStandardMaterial({ color: '#a86438', roughness: 0.65 });
    this.beakMat = new THREE.MeshStandardMaterial({ color: '#ffb703', roughness: 0.45 });
    this.scorpionMat = new THREE.MeshStandardMaterial({ color: '#8b1e3f', roughness: 0.55 });
    this.logMat = new THREE.MeshStandardMaterial({ color: '#7f4f24', roughness: 0.88 });
    this.rockMat = new THREE.MeshStandardMaterial({ color: '#6c757d', roughness: 0.9 });
    this.rampMat = new THREE.MeshStandardMaterial({ color: '#e09f3e', roughness: 0.65 });
    this.eggMat = new THREE.MeshStandardMaterial({ color: '#fff8e7', roughness: 0.35, emissive: '#ffdf8e', emissiveIntensity: 0.15 });
    this.goldEggMat = new THREE.MeshStandardMaterial({ color: '#ffd447', roughness: 0.2, metalness: 0.45, emissive: '#ff9f1c', emissiveIntensity: 0.4 });
    this.colossalEggMat = new THREE.MeshStandardMaterial({ color: '#e879f9', roughness: 0.15, metalness: 0.55, emissive: '#a855f7', emissiveIntensity: 0.65 });
    this.lavaMat = new THREE.MeshStandardMaterial({ color: '#ff4500', roughness: 0.35, emissive: '#ff6d00', emissiveIntensity: 0.9 });
    this.iceMat = new THREE.MeshStandardMaterial({ color: '#7dd3fc', roughness: 0.15, emissive: '#38bdf8', emissiveIntensity: 0.35, transparent: true, opacity: 0.9 });
    this.iceCrackMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.mudMat = new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.9 });
    this.mudBubbleMat = new THREE.MeshStandardMaterial({ color: '#9c6644', roughness: 0.55 });
    this.toxicMat = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.3, emissive: '#a3e635', emissiveIntensity: 0.65 });
    this.speedPadMat = new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#f59e0b', emissiveIntensity: 0.75 });
    this.trampolineMat = new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#16a34a', emissiveIntensity: 0.45 });
    this.stoneMat = new THREE.MeshStandardMaterial({ color: '#8d99ae', roughness: 0.85 });
    this.alienMat = new THREE.MeshStandardMaterial({ color: '#7209b7', roughness: 0.35, emissive: '#b5179e', emissiveIntensity: 0.45 });
    this.fireMat = new THREE.MeshBasicMaterial({ color: '#ff7b00' });
    this.portalMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.82, side: THREE.DoubleSide });
    this.coralMat = new THREE.MeshStandardMaterial({ color: '#fb7185', emissive: '#e11d48', emissiveIntensity: 0.45, roughness: 0.45 });
    this.coralAltMat = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ea580c', emissiveIntensity: 0.35, roughness: 0.5 });
    this.mineMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.72, roughness: 0.25 });
    this.mineGlowMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
    this.jellyMat = new THREE.MeshStandardMaterial({ color: '#a855f7', emissive: '#9333ea', emissiveIntensity: 0.65, transparent: true, opacity: 0.84 });
    this.vortexMat = new THREE.MeshBasicMaterial({ color: '#06b6d4', transparent: true, opacity: 0.72 });
    this.bubbleMat = new THREE.MeshStandardMaterial({ color: '#67e8f9', emissive: '#22d3ee', emissiveIntensity: 0.85, transparent: true, opacity: 0.82, roughness: 0.15 });
    this.sharkFinMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.35, emissive: '#0f172a', emissiveIntensity: 0.25 });
    this.anglerMat = new THREE.MeshStandardMaterial({ color: '#312e81', roughness: 0.45, emissive: '#4338ca', emissiveIntensity: 0.45 });
    this.lureMat = new THREE.MeshBasicMaterial({ color: '#fde047' });
    this.currentRingMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.86, side: THREE.DoubleSide });
  }

  _initPools() {
    const resetBase = (o) => {
      o.group.visible = false;
      o.hit = false;
      o._hitBy = null;
      o.nearMissed = false;
      o.stomped = false;
      o.elite = false;
      o.isMystery = false;
    };

    this.pools = {
      cactus_small: new ObjectPool(() => this._makeCactusSmall(), resetBase, 10),
      cactus_tall: new ObjectPool(() => this._makeCactusTall(), resetBase, 10),
      cactus_cluster: new ObjectPool(() => this._makeCactusCluster(), resetBase, 8),
      bird: new ObjectPool(() => this._makeBird(), (o) => { resetBase(o); o.flapPhase = 0; }, 10),
      scorpion: new ObjectPool(() => this._makeScorpion(), (o) => { resetBase(o); o.walkPhase = 0; }, 8),
      rolling_log: new ObjectPool(() => this._makeLog(), resetBase, 8),
      tall_rock: new ObjectPool(() => this._makeTallRock(), resetBase, 8),
      ramp: new ObjectPool(() => this._makeRamp(), resetBase, 6),
      speed_pad: new ObjectPool(() => this._makeSpeedPad(), resetBase, 5),
      trampoline: new ObjectPool(() => this._makeTrampoline(), resetBase, 5),
      mud_pool: new ObjectPool(() => this._makeMudPool(), resetBase, 6),
      toxic_pool: new ObjectPool(() => this._makeToxicPool(), resetBase, 5),
      egg: new ObjectPool(() => this._makeEgg(), resetBase, 28),
      powerup: new ObjectPool(() => this._makePowerup(), resetBase, 8),
      lava_pool: new ObjectPool(() => this._makeHazard('lava_pool', this.lavaMat, 1.8, 0.16, 2.2), resetBase, 8),
      thin_ice: new ObjectPool(() => this._makeHazard('thin_ice', this.iceMat, 1.9, 0.14, 2.2), resetBase, 8),
      alien_trap: new ObjectPool(() => this._makeAlienTrap(), resetBase, 8),
      campfire: new ObjectPool(() => this._makeCampfire(), resetBase, 3),
      shortcut: new ObjectPool(() => this._makeShortcut(), resetBase, 3),
      fruit: new ObjectPool(() => this._makeFruit(), resetBase, 14),
      elemental_egg: new ObjectPool(() => this._makeElementalEgg(), resetBase, 10),
      treasure: new ObjectPool(() => this._makeTreasure(), resetBase, 5),
      grapple_point: new ObjectPool(() => this._makeGrapple(), resetBase, 4),
      cactus_shooter: new ObjectPool(() => this._makeCactusShooter(), (o) => { resetBase(o); o.shot = false; }, 6),
      cactus_spine: new ObjectPool(() => this._makeSpineShot(), resetBase, 8),
      gravity_zone: new ObjectPool(() => this._makeGravityZone(), resetBase, 4),
      minecart_zone: new ObjectPool(() => this._makeMinecartZone(), resetBase, 3),
      river_log: new ObjectPool(() => this._makeRiverLog(), resetBase, 4),
      bifurcation: new ObjectPool(() => this._makeBifurcation(), resetBase, 3),
      amber_crystal: new ObjectPool(() => this._makeAmberCrystal(), resetBase, 6),
      geyser_vent: new ObjectPool(() => this._makeGeyserVent(), resetBase, 5),
      tar_pit: new ObjectPool(() => this._makeTarPit(), resetBase, 5),
      falling_stalactite: new ObjectPool(() => this._makeStalactite(), resetBase, 5),
      electric_pylon: new ObjectPool(() => this._makeElectricPylon(), resetBase, 5),
      spike_barricade: new ObjectPool(() => this._makeSpikeBarricade(), resetBase, 6),
      oasis_zone: new ObjectPool(() => this._makeOasisZone(), resetBase, 2),
      fragile_bridge: new ObjectPool(() => this._makeFragileBridge(), resetBase, 2),
      rescue_cross: new ObjectPool(() => this._makeRescueCross(), resetBase, 2),
      shop_gate: new ObjectPool(() => this._makeShopGate(), resetBase, 2),
      coral_reef: new ObjectPool(() => this._makeCoralReef(), resetBase, 8),
      abyss_mine: new ObjectPool(() => this._makeAbyssMine(), (o) => { resetBase(o); o.bobPhase = 0; }, 7),
      jellyfish_swarm: new ObjectPool(() => this._makeJellyfishSwarm(), (o) => { resetBase(o); o.bobPhase = 0; }, 7),
      whirlpool_vortex: new ObjectPool(() => this._makeWhirlpoolVortex(), resetBase, 5),
      oxygen_bubble: new ObjectPool(() => this._makeOxygenBubble(), resetBase, 8),
      shark_fin: new ObjectPool(() => this._makeSharkFin(), (o) => { resetBase(o); o.bobPhase = 0; }, 6),
      angler_hazard: new ObjectPool(() => this._makeAnglerHazard(), (o) => { resetBase(o); o.bobPhase = 0; }, 6),
      thermal_vent: new ObjectPool(() => this._makeThermalVent(), resetBase, 5),
      current_ring: new ObjectPool(() => this._makeCurrentRing(), resetBase, 5)
    };
  }

  _reg(kind, group, props, hintCfg = null) {
    group.visible = false;
    this.group.add(group);
    let hintSprite = null;
    if (hintCfg) {
      hintSprite = this._attachHint(group, hintCfg.y, hintCfg.label, hintCfg.color, hintCfg.scaleX || 2.45);
    }
    return { kind, pool: null, group, hintSprite, hit: false, nearMissed: false, stomped: false, dangerVisuals: [], ...props };
  }

  _makeCactusSmall() {
    const g = new THREE.Group();
    makeBox(g, 0.52, 1.15, 0.52, 0, 0.575, 0, this.cactusMat);
    makeBox(g, 0.24, 0.46, 0.24, -0.38, 0.65, 0, this.cactusDarkMat);
    makeBox(g, 0.24, 0.42, 0.24, 0.38, 0.55, 0, this.cactusDarkMat);
    makeBox(g, 0.28, 0.18, 0.28, 0, 1.24, 0, this.flowerMat);
    const trim = addDangerTrim(g, 0.88, 0.62);
    return this._reg('cactus_small', g, { halfW: 0.42, minY: 0, maxY: 1.2, halfD: 0.36, color: '#2f9e36', dangerVisuals: [trim] }, { y: 1.75, label: '⬆ PULAR / [Q]', color: '#4ade80' });
  }

  _makeCactusTall() {
    const g = new THREE.Group();
    makeBox(g, 0.58, 1.75, 0.58, 0, 0.875, 0, this.cactusMat);
    makeBox(g, 0.28, 0.65, 0.28, -0.44, 1.05, 0, this.cactusDarkMat);
    makeBox(g, 0.28, 0.55, 0.28, 0.44, 0.9, 0, this.cactusDarkMat);
    makeBox(g, 0.34, 0.22, 0.34, 0, 1.85, 0, this.flowerMat);
    const trim = addDangerTrim(g, 0.98, 0.68);
    return this._reg('cactus_tall', g, { halfW: 0.48, minY: 0, maxY: 1.75, halfD: 0.38, color: '#2f9e36', dangerVisuals: [trim] }, { y: 2.35, label: '⬆ PULO ALTO', color: '#22c55e' });
  }

  _makeCactusCluster() {
    const g = new THREE.Group();
    makeBox(g, 0.46, 1.45, 0.46, -0.48, 0.725, 0, this.cactusMat);
    makeBox(g, 0.52, 1.62, 0.52, 0, 0.81, 0.12, this.cactusDarkMat);
    makeBox(g, 0.42, 1.18, 0.42, 0.5, 0.59, -0.08, this.cactusMat);
    makeBox(g, 0.26, 0.18, 0.26, 0, 1.7, 0.12, this.flowerMat);
    const trim = addDangerTrim(g, 1.45, 0.72);
    const floorSign = buildHazardFloorSign();
    floorSign.scale.setScalar(0.08);
    g.add(floorSign);
    return this._reg('cactus_cluster', g, { halfW: 0.78, minY: 0, maxY: 1.62, halfD: 0.42, color: '#1f7024', dangerVisuals: [trim, floorSign] }, { y: 2.2, label: '⬅➡ MUDE FAIXA', color: '#ef4444' });
  }

  _makeBird() {
    const g = new THREE.Group();
    makeBox(g, 0.46, 0.38, 0.72, 0, 0, 0, this.birdMat);
    makeBox(g, 0.32, 0.3, 0.36, 0, 0.08, 0.46, this.birdMat);
    makeBox(g, 0.16, 0.14, 0.28, 0, 0.04, 0.72, this.beakMat);
    const wingL = new THREE.Group();
    wingL.position.set(-0.22, 0.08, 0);
    makeBox(wingL, 0.75, 0.1, 0.38, -0.38, 0, 0, this.birdWingMat);
    g.add(wingL);
    const wingR = new THREE.Group();
    wingR.position.set(0.22, 0.08, 0);
    makeBox(wingR, 0.75, 0.1, 0.38, 0.38, 0, 0, this.birdWingMat);
    g.add(wingR);
    const duckOverlay = buildDuckSignOverlay();
    duckOverlay.scale.setScalar(0.09);
    duckOverlay.position.set(0, -0.25, 0.35);
    g.add(duckOverlay);
    return this._reg('bird', g, {
      wingL, wingR, flapPhase: 0, baseY: 1.6, duckOverlay,
      dangerVisuals: [duckOverlay],
      halfW: 0.65, minY: -0.34, maxY: 0.36, halfD: 0.45,
      extraSpeed: 4.5, stompable: true, color: '#a86438'
    }, { y: 0.85, label: '⬇ ABAIXAR / PISAR', color: '#38bdf8' });
  }

  _makeScorpion() {
    const g = new THREE.Group();
    makeBox(g, 0.72, 0.36, 0.85, 0, 0.22, 0, this.scorpionMat);
    makeBox(g, 0.22, 0.2, 0.45, -0.45, 0.25, 0.35, this.scorpionMat); // pinça E
    makeBox(g, 0.22, 0.2, 0.45, 0.45, 0.25, 0.35, this.scorpionMat); // pinça D
    makeBox(g, 0.2, 0.55, 0.2, 0, 0.55, -0.35, this.scorpionMat); // cauda
    makeBox(g, 0.18, 0.18, 0.26, 0, 0.78, -0.2, this.beakMat); // ferrão
    return this._reg('scorpion', g, {
      walkPhase: 0, halfW: 0.55, minY: 0, maxY: 0.78, halfD: 0.5,
      extraSpeed: 2.0, stompable: true, color: '#8b1e3f'
    }, { y: 1.4, label: '⬆ PISAR / [Q]', color: '#f43f5e' });
  }

  _makeLog() {
    const g = new THREE.Group();
    const body = new THREE.Group();
    body.position.set(0, 0.38, 0);
    const model = buildClaudeBossObstacle('tronco', { withWarn: false, centeredBody: true });
    model.scale.set(1.38, 1.25, 1.25);
    body.add(model);
    g.add(body);
    const trim = addDangerTrim(g, 1.85, 0.85);
    return this._reg('rolling_log', g, {
      body, halfW: 0.96, minY: 0, maxY: 0.74, halfD: 0.38, dangerVisuals: [trim],
      extraSpeed: 5.5, color: '#7f4f24'
    }, { y: 1.35, label: '⬆ PULAR / [Q]', color: '#fb923c' });
  }

  _makeTallRock() {
    const g = new THREE.Group();
    const cleanModel = buildTallProhibitionBarrier(false);
    cleanModel.scale.setScalar(0.11);
    const warnModel = buildTallProhibitionBarrier(true);
    warnModel.scale.setScalar(0.11);
    const floorSign = buildHazardFloorSign();
    floorSign.scale.setScalar(0.088);
    g.add(cleanModel, warnModel, floorSign);
    return this._reg('tall_rock', g, {
      halfW: 0.82, minY: 0, maxY: 2.85, halfD: 0.55,
      cleanVisuals: [cleanModel],
      dangerVisuals: [warnModel, floorSign],
      wallJumpable: true, unjumpable: true, color: '#64748b'
    }, { y: 3.15, label: '⛔ MUITO ALTO! ⬅➡', color: '#ef4444' });
  }

  _makeRamp() {
    const g = new THREE.Group();
    makeBox(g, 1.75, 0.22, 1.1, 0, 0.11, 0.7, this.rampMat);
    makeBox(g, 1.75, 0.48, 1.1, 0, 0.24, 0, this.rampMat);
    makeBox(g, 1.75, 0.76, 1.1, 0, 0.38, -0.7, this.rampMat);
    return this._reg('ramp', g, {
      halfW: 0.88, minY: 0, maxY: 0.76, halfD: 1.35, color: '#e09f3e'
    }, { y: 1.5, label: '🚀 RAMPA VOAR', color: '#fbbf24' });
  }

  _makeEgg() {
    const g = new THREE.Group();
    const variants = {
      comum: buildClaudeEggGroup('comum'),
      dourado: buildClaudeEggGroup('dourado'),
      raro: buildClaudeEggGroup('raro'),
      misterioso: buildClaudeEggGroup('misterioso')
    };
    Object.entries(variants).forEach(([k, v]) => {
      v.visible = k === 'comum';
      v.position.y = 0.08;
      g.add(v);
    });
    const nestBase = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.56, 16),
      new THREE.MeshBasicMaterial({ color: '#ffd447', transparent: true, opacity: 0.68, side: THREE.DoubleSide })
    );
    nestBase.rotation.x = Math.PI / 2;
    nestBase.position.y = 0.04;
    nestBase.visible = false;
    g.add(nestBase);
    return this._reg('egg', g, {
      variants, nestBase, isGold: false, isMystery: false, eggTier: 1,
      halfW: 0.44, minY: 0.08, maxY: 1.05, halfD: 0.44, color: '#ffd447'
    });
  }

  _makePowerup() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 0.45, roughness: 0.3 });
    const { group: crate, core: cube } = buildVoxelPowerupCrate(mat);
    crate.visible = false;
    g.add(crate);

    const platHolder = new THREE.Group();
    platHolder.position.y = 0.62;
    platHolder.rotation.x = -0.45;
    const variants = {
      escudo: buildClaudeBuffPlatform('escudo'),
      cura: buildClaudeBuffPlatform('cura'),
      ima: buildClaudeBuffPlatform('ima'),
      tempo: buildClaudeBuffPlatform('tempo'),
      turbo: buildClaudeBuffPlatform('turbo')
    };
    Object.entries(variants).forEach(([k, v]) => {
      v.visible = k === 'escudo';
      v.scale.setScalar(0.86);
      platHolder.add(v);
    });
    g.add(platHolder);

    return this._reg('powerup', g, {
      crate, cube, platHolder, variants, mat, powerId: 'shield', isBackpack: false,
      halfW: 0.48, minY: 0.15, maxY: 1.32, halfD: 0.48, color: '#38bdf8'
    }, { y: 1.65, label: '📦 ITEM ESPECIAL', color: '#38bdf8' });
  }

  _setPowerupVisual(p) {
    if (!p?.variants || !p.platHolder || !p.crate) return;
    const platMap = {
      shield: 'escudo',
      heal: 'cura',
      magnet: 'ima',
      clock: 'tempo',
      turbo: 'turbo',
      rocket: 'turbo',
      mega_stamina: 'turbo'
    };
    const key = p.isBackpack ? null : platMap[p.powerId];
    if (key && p.variants[key]) {
      p.crate.visible = false;
      p.platHolder.visible = true;
      Object.entries(p.variants).forEach(([k, v]) => {
        v.visible = k === key;
      });
    } else {
      p.platHolder.visible = false;
      p.crate.visible = true;
    }
  }

  _makeHazard(kind, mat, w, h, d) {
    const g = new THREE.Group();
    if (kind === 'thin_ice') {
      makeBox(g, w, h, d, 0, h * 0.5, 0, mat);
      makeBox(g, w + 0.18, 0.08, d + 0.18, 0, 0.04, 0, this.iceCrackMat);
      makeBox(g, w * 0.92, 0.04, 0.08, 0, h + 0.02, 0.2, this.iceCrackMat).rotation.y = 0.35;
      makeBox(g, w * 0.75, 0.04, 0.08, 0.1, h + 0.02, -0.25, this.iceCrackMat).rotation.y = -0.5;
      const floorSign = buildHazardFloorSign();
      floorSign.scale.setScalar(0.085);
      g.add(floorSign);
      return this._reg(kind, g, {
        halfW: w * 0.46, minY: 0, maxY: 0.4, halfD: d * 0.46,
        isFloorHazard: true, dangerVisuals: [floorSign], color: '#7dd3fc'
      }, { y: 1.15, label: '❄️ GELO FRÁGIL', color: '#7dd3fc' });
    }
    // Poça de lava com borda de pedra basáltica multi-peças
    makeBox(g, w + 0.28, 0.08, d + 0.28, 0, 0.04, 0, this.rockMat);
    makeBox(g, w, h, d, 0, h * 0.5 + 0.04, 0, mat);
    makeBox(g, 0.38, 0.18, 0.38, -w * 0.46, 0.1, -d * 0.38, this.rockMat);
    makeBox(g, 0.34, 0.16, 0.36, w * 0.46, 0.09, d * 0.36, this.rockMat);
    makeBox(g, 0.42, 0.08, 0.42, 0.1, h + 0.05, 0, this.fireMat);
    const floorSign = buildHazardFloorSign();
    floorSign.scale.setScalar(0.088);
    g.add(floorSign);
    return this._reg(kind, g, {
      halfW: w * 0.46, minY: 0, maxY: 0.4, halfD: d * 0.46,
      isFloorHazard: true, dangerVisuals: [floorSign], color: '#ff5e00'
    }, { y: 1.15, label: '🔥 LAVA PULE', color: '#ff5e00' });
  }

  _makeSpeedPad() {
    const g = new THREE.Group();
    const plat = buildClaudeBuffPlatform('turbo');
    plat.scale.set(1.25, 1.05, 1.85);
    g.add(plat);
    return this._reg('speed_pad', g, {
      halfW: 0.9, minY: 0, maxY: 0.65, halfD: 1.2, color: '#facc15'
    }, { y: 1.25, label: '⚡ TURBO >>>', color: '#facc15' });
  }

  _makeTrampoline() {
    const g = new THREE.Group();
    const plat = buildClaudeBuffPlatform('pulo');
    plat.scale.set(1.15, 1.15, 1.35);
    g.add(plat);
    const arrow = new THREE.Group();
    makeBox(arrow, 0.16, 0.42, 0.16, 0, 0.85, 0, this.speedPadMat);
    makeBox(arrow, 0.52, 0.2, 0.2, 0, 1.12, 0, this.speedPadMat);
    g.add(arrow);
    return this._reg('trampoline', g, {
      arrow, halfW: 0.8, minY: 0, maxY: 0.9, halfD: 0.8, color: '#22c55e'
    }, { y: 1.65, label: '🟢 TRAMPOLIM ⬆', color: '#4ade80' });
  }

  _makeMudPool() {
    const { group: g, b1, b2 } = buildVoxelMudPool(this.mudMat, this.mudBubbleMat, this.rockMat);
    return this._reg('mud_pool', g, {
      b1, b2, halfW: 0.88, minY: 0, maxY: 0.35, halfD: 1.0, color: '#a16207'
    }, { y: 1.05, label: '🟤 LAMA LENTA', color: '#fbbf24' });
  }

  _makeToxicPool() {
    const g = new THREE.Group();
    const model = buildClaudeBossObstacle('poca', { withWarn: false });
    model.scale.set(1.05, 1.1, 1.1);
    const floorSign = buildHazardFloorSign();
    floorSign.scale.setScalar(0.085);
    g.add(model, floorSign);
    return this._reg('toxic_pool', g, {
      poolModel: model, dangerVisuals: [floorSign], halfW: 0.86, minY: 0, maxY: 0.42, halfD: 0.95, color: '#a3e635'
    }, { y: 1.15, label: '☠️ POÇA TÓXICA', color: '#bef264' });
  }

  _makeAlienTrap() {
    const g = new THREE.Group();
    makeBox(g, 0.8, 0.35, 0.8, 0, 0.2, 0, this.alienMat);
    makeBox(g, 0.2, 0.9, 0.2, 0, 0.65, 0, this.alienMat);
    makeBox(g, 0.5, 0.18, 0.5, 0, 1.1, 0, this.beakMat);
    const trim = addDangerTrim(g, 0.95, 0.95);
    return this._reg('alien_trap', g, {
      halfW: 0.45, minY: 0, maxY: 1.15, halfD: 0.45, dangerVisuals: [trim], color: '#b5179e'
    }, { y: 1.7, label: '👽 ARMADILHA ⬅➡', color: '#e879f9' });
  }

  _makeCampfire() {
    const { group: g } = buildVoxelCampfire(this.logMat, this.fireMat);
    return this._reg('campfire', g, {
      halfW: 0.75, minY: 0, maxY: 1.1, halfD: 0.75, color: '#ff7b00'
    }, { y: 1.5, label: '🔥 FOGUEIRA +VIDA', color: '#fb923c' });
  }

  _makeShortcut() {
    const runeMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 0.8 });
    const vortexMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65, side: THREE.DoubleSide });
    const { group: g, vortexRing, vortexDisc } = buildVoxelPortalArch(this.stoneMat, runeMat, vortexMat);
    return this._reg('shortcut', g, {
      runeMat, vortexMat, vortexRing, vortexDisc, portalDest: 'biome',
      halfW: 1.0, minY: 0, maxY: 2.35, halfD: 0.48, color: '#38bdf8'
    }, { y: 2.85, label: '🌀 PORTAL BIOMA', color: '#38bdf8' });
  }

  _makeFruit() {
    const mat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#dc2626', emissiveIntensity: 0.25 });
    const { group: g } = buildVoxelFruit(mat, this.cactusMat, this.logMat);
    return this._reg('fruit', g, { mat, halfW: 0.42, minY: 0.1, maxY: 1.0, halfD: 0.42, color: '#4ade80' }, { y: 1.35, label: '🍉 FRUTA +FÚRIA', color: '#4ade80' });
  }

  _makeElementalEgg() {
    const g = new THREE.Group();
    const variants = {
      fire: buildClaudeEggGroup('fogo'),
      ice: buildClaudeEggGroup('gelo'),
      lightning: buildClaudeEggGroup('raio'),
      poison: buildClaudeEggGroup('veneno')
    };
    Object.entries(variants).forEach(([k, v]) => {
      v.visible = k === 'fire';
      v.position.y = 0.2;
      v.scale.setScalar(0.76);
      g.add(v);
    });
    const mat = new THREE.MeshStandardMaterial({ color: '#ff5e1a', emissive: '#ff5e1a', emissiveIntensity: 0.85, roughness: 0.3, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.58, 16), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    g.add(ring);
    return this._reg('elemental_egg', g, {
      variants, ring, mat, element: 'fire',
      halfW: 0.52, minY: 0.2, maxY: 1.48, halfD: 0.52, color: '#ff5e1a'
    }, { y: 1.85, label: '🔥 ESFERA FOGO', color: '#ff5e1a' });
  }

  _setElementalVisual(item, elementId) {
    if (!item?.variants) return;
    Object.entries(item.variants).forEach(([k, v]) => {
      v.visible = k === elementId;
    });
  }

  _makeTreasure() {
    const { group: g } = buildVoxelTreasureChest(this.goldEggMat);
    return this._reg('treasure', g, { halfW: 0.55, minY: 0, maxY: 0.75, halfD: 0.42, color: '#ffd447' }, { y: 1.3, label: '💎 BAÚ +OVOS', color: '#ffd447' });
  }

  _makeGrapple() {
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#65a30d', emissive: '#84cc16', emissiveIntensity: 0.5 });
    const { group: g } = buildVoxelGrapple(ropeMat, this.goldEggMat);
    return this._reg('grapple_point', g, { halfW: 0.9, minY: 0.7, maxY: 3.8, halfD: 0.65, color: '#84cc16' }, { y: 3.1, label: '🪢 CIPÓ BALANÇO', color: '#84cc16' });
  }

  _makeCactusShooter() {
    const { group: g } = buildVoxelCactusShooter(this.cactusMat, this.cactusDarkMat, this.flowerMat);
    return this._reg('cactus_shooter', g, { shot: false, halfW: 0.48, minY: 0, maxY: 1.5, halfD: 0.42, breakable: true, color: '#ec4899' }, { y: 2.05, label: '🎯 ATIRADOR [Q]', color: '#ec4899' });
  }

  _makeSpineShot() {
    const { group: g } = buildVoxelSpineShot(this.flowerMat);
    return this._reg('cactus_spine', g, { extraSpeed: 11, halfW: 0.25, minY: 0.45, maxY: 1.1, halfD: 0.45, color: '#ff6ca8' }, { y: 1.3, label: '⚡ ESPINHO [Q]', color: '#fb7185' });
  }

  _makeGravityZone() {
    const g = new THREE.Group();
    const gMat = new THREE.MeshBasicMaterial({ color: '#818cf8', transparent: true, opacity: 0.65 });
    makeBox(g, 0.25, 2.6, 0.25, -1.0, 1.3, 0, gMat);
    makeBox(g, 0.25, 2.6, 0.25, 1.0, 1.3, 0, gMat);
    makeBox(g, 2.2, 0.25, 0.25, 0, 2.6, 0, gMat);
    makeBox(g, 0.45, 0.14, 0.45, -1.0, 0.07, 0, this.stoneMat);
    makeBox(g, 0.45, 0.14, 0.45, 1.0, 0.07, 0, this.stoneMat);
    return this._reg('gravity_zone', g, { gravMode: 'low', halfW: 1.1, minY: 0, maxY: 2.6, halfD: 0.4, color: '#818cf8' }, { y: 3.05, label: '🪐 GRAVIDADE BAIXA', color: '#818cf8' });
  }

  _makeMinecartZone() {
    const railMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.7 });
    const { group: g } = buildVoxelMinecartZone(railMat, this.logMat);
    return this._reg('minecart_zone', g, { halfW: 0.75, minY: 0, maxY: 1.0, halfD: 0.9, color: '#94a3b8' }, { y: 1.45, label: '🛒 TRILHO BÔNUS', color: '#cbd5e1' });
  }

  _makeRiverLog() {
    const { group: g } = buildVoxelRiverLog(this.logMat);
    return this._reg('river_log', g, { halfW: 0.75, minY: 0, maxY: 0.6, halfD: 1.3, color: '#92400e' }, { y: 1.15, label: '🪵 TRONCO SURF', color: '#f59e0b' });
  }

  _makeBifurcation() {
    const g = new THREE.Group();
    const safeMat = new THREE.MeshBasicMaterial({ color: '#22c55e', transparent: true, opacity: 0.72 });
    const riskMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.72 });
    makeBox(g, 1.9, 2.4, 0.35, LANE_X[0], 1.2, 0, safeMat);
    makeBox(g, 1.9, 2.4, 0.35, LANE_X[2], 1.2, 0, riskMat);
    makeBox(g, 0.36, 2.75, 0.36, 0, 1.38, 0, this.logMat);
    makeBox(g, 2.2, 0.28, 0.28, -1.1, 2.45, 0, this.stoneMat);
    makeBox(g, 2.2, 0.28, 0.28, 1.1, 2.45, 0, this.goldEggMat);
    return this._reg('bifurcation', g, { halfW: 3.4, minY: 0, maxY: 2.4, halfD: 0.4, color: '#ffd447' }, { y: 2.95, label: '⬅️ SEGURO | 🥚 ARRISCADO', color: '#ffd447', scaleX: 4.1 });
  }

  _makeAmberCrystal() {
    const g = buildVoxelAmberCrystal();
    return this._reg('amber_crystal', g, { halfW: 0.56, minY: 0, maxY: 1.48, halfD: 0.52, breakable: true, color: '#f59e0b' }, { y: 1.9, label: '🔶 ÂMBAR [Q]', color: '#fbbf24' });
  }

  _makeGeyserVent() {
    const g = buildVoxelGeyserVent(this.rockMat);
    return this._reg('geyser_vent', g, { halfW: 0.68, minY: 0, maxY: 1.9, halfD: 0.68, color: '#bae6fd' }, { y: 2.45, label: '💨 GÊISER ⬅➡', color: '#bae6fd' });
  }

  _makeTarPit() {
    const g = buildVoxelTarPit();
    return this._reg('tar_pit', g, { halfW: 0.86, minY: 0, maxY: 0.4, halfD: 0.96, isFloorHazard: true, color: '#52525b' }, { y: 1.12, label: '🖤 PICHE PULE', color: '#d4d4d8' });
  }

  _makeStalactite() {
    const g = new THREE.Group();
    const model = buildClaudeBossObstacle('gelo', { withWarn: false });
    model.scale.set(1.05, 1.0, 1.05);
    const floorSign = buildHazardFloorSign();
    floorSign.scale.setScalar(0.08);
    g.add(model, floorSign);
    return this._reg('falling_stalactite', g, { halfW: 0.62, minY: 0, maxY: 1.85, halfD: 0.62, breakable: true, unjumpable: true, dangerVisuals: [floorSign], color: '#38bdf8' }, { y: 2.2, label: '❄️ ESTALACTITE [Q]', color: '#38bdf8' });
  }

  _makeShopGate() {
    const g = buildShopLaneGateGroup();
    g.scale.setScalar(0.11);
    return this._reg('shop_gate', g, { halfW: 1.35, minY: 0, maxY: 2.5, halfD: 1.25, nonHazard: true, color: '#34d399' }, { y: 2.95, label: '🏪 LOJINHA DA PISTA!', color: '#34d399', scaleX: 2.9 });
  }

  _makeElectricPylon() {
    const g = buildVoxelElectricPylon();
    return this._reg('electric_pylon', g, { halfW: 0.66, minY: 0, maxY: 1.68, halfD: 0.36, color: '#facc15' }, { y: 2.05, label: '⚡ BOBINA ⬅➡', color: '#fde047' });
  }

  _makeSpikeBarricade() {
    const g = buildVoxelSpikeBarricade(this.logMat);
    return this._reg('spike_barricade', g, { halfW: 0.72, minY: 0, maxY: 1.12, halfD: 0.32, breakable: true, color: '#d97706' }, { y: 1.55, label: '🪵 BARRICADA [W/Q]', color: '#fbbf24' });
  }

  _makeOasisZone() {
    const g = buildChunkOasis();
    return this._reg('oasis_zone', g, { halfW: 2.85, minY: 0, maxY: 0.55, halfD: 1.35, nonHazard: true, color: '#2dd4bf' }, { y: 2.8, label: '🌴 OÁSIS DE CALMARIA (+VIDA / +ESTAMINA)', color: '#5eead4', scaleX: 4.3 });
  }

  _makeFragileBridge() {
    const g = buildChunkFragileBridge();
    return this._reg('fragile_bridge', g, { halfW: 2.85, minY: 0, maxY: 0.5, halfD: 1.25, nonHazard: true, color: '#4ade80' }, { y: 2.35, label: '🌉 PONTE QUEBRADIÇA • LATERAIS SEGURAS!', color: '#facc15', scaleX: 4.3 });
  }

  _makeRescueCross() {
    const g = buildChunkRescueCross();
    return this._reg('rescue_cross', g, { halfW: 2.85, minY: 0, maxY: 0.65, halfD: 0.85, nonHazard: true, color: '#38bdf8' }, { y: 2.6, label: '🚨 RESGATE TÁTICO (+REVIVE / +ESCUDO)', color: '#38bdf8', scaleX: 4.3 });
  }

  _makeCoralReef() {
    const g = new THREE.Group();
    makeBox(g, 0.92, 0.24, 0.72, 0, 0.12, 0, this.stoneMat);
    makeBox(g, 0.28, 1.15, 0.28, -0.26, 0.65, 0.04, this.coralMat);
    makeBox(g, 0.3, 1.32, 0.28, 0.06, 0.74, -0.06, this.coralAltMat);
    makeBox(g, 0.24, 0.88, 0.24, 0.34, 0.52, 0.08, this.coralMat);
    const trim = addDangerTrim(g, 1.05, 0.78);
    return this._reg('coral_reef', g, {
      halfW: 0.54, minY: 0, maxY: 1.34, halfD: 0.44, breakable: true, dangerVisuals: [trim], color: '#fb7185'
    }, { y: 1.85, label: '🪸 CORAL [W / Q]', color: '#fb7185' });
  }

  _makeAbyssMine() {
    const g = new THREE.Group();
    makeBox(g, 0.68, 0.68, 0.68, 0, 0.85, 0, this.mineMat);
    makeBox(g, 0.96, 0.16, 0.16, 0, 0.85, 0, this.mineGlowMat);
    makeBox(g, 0.16, 0.96, 0.16, 0, 0.85, 0, this.mineGlowMat);
    makeBox(g, 0.16, 0.16, 0.96, 0, 0.85, 0, this.mineGlowMat);
    makeBox(g, 0.1, 0.52, 0.1, 0, 0.26, 0, this.stoneMat);
    const trim = addDangerTrim(g, 0.95, 0.78);
    return this._reg('abyss_mine', g, {
      bobPhase: 0, baseY: 0.22, halfW: 0.52, minY: 0.42, maxY: 1.48, halfD: 0.48, dangerVisuals: [trim], color: '#ef4444'
    }, { y: 1.88, label: '💣 MINA ⬅➡ / MERGULHE', color: '#f87171' });
  }

  _makeJellyfishSwarm() {
    const g = new THREE.Group();
    makeBox(g, 0.82, 0.42, 0.82, 0, 0.28, 0, this.jellyMat);
    makeBox(g, 0.56, 0.2, 0.56, 0, 0.54, 0, this.bubbleMat);
    makeBox(g, 0.12, 0.78, 0.12, -0.26, -0.28, 0, this.jellyMat);
    makeBox(g, 0.12, 0.86, 0.12, 0, -0.32, 0, this.bubbleMat);
    makeBox(g, 0.12, 0.78, 0.12, 0.26, -0.28, 0, this.jellyMat);
    return this._reg('jellyfish_swarm', g, {
      bobPhase: 0, baseY: 1.52, halfW: 0.48, minY: -0.36, maxY: 0.42, halfD: 0.46, breakable: true, color: '#c084fc'
    }, { y: 0.85, label: '🪼 ÁGUA-VIVA ⬇ / [Q]', color: '#e879f9' });
  }

  _makeWhirlpoolVortex() {
    const g = new THREE.Group();
    const spin = new THREE.Group();
    makeBox(g, 1.38, 0.16, 1.38, 0, 0.08, 0, this.vortexMat);
    makeBox(spin, 1.05, 0.35, 0.22, 0, 0.45, 0, this.bubbleMat);
    makeBox(spin, 0.22, 0.35, 1.05, 0, 0.45, 0, this.vortexMat);
    makeBox(spin, 0.58, 0.75, 0.58, 0, 0.55, 0, this.vortexMat);
    g.add(spin);
    const trim = addDangerTrim(g, 1.48, 1.48);
    return this._reg('whirlpool_vortex', g, {
      spin, halfW: 0.82, minY: 0, maxY: 1.15, halfD: 0.82, dangerVisuals: [trim], color: '#22d3ee'
    }, { y: 1.65, label: '🌀 REDEMOINHO ⬅➡', color: '#22d3ee' });
  }

  _makeOxygenBubble() {
    const g = new THREE.Group();
    const core = new THREE.Group();
    makeBox(core, 0.66, 0.66, 0.66, 0, 0.55, 0, this.bubbleMat);
    makeBox(core, 0.36, 0.84, 0.36, 0, 0.55, 0, this.iceCrackMat);
    g.add(core);
    return this._reg('oxygen_bubble', g, {
      core, halfW: 0.68, minY: 0.05, maxY: 1.55, halfD: 0.68, nonHazard: true, color: '#38bdf8'
    }, { y: 1.45, label: '🫧 +OXIGÊNIO (O2)', color: '#67e8f9' });
  }

  _makeSharkFin() {
    const g = new THREE.Group();
    makeBox(g, 0.16, 0.45, 0.72, 0, 0.24, 0, this.sharkFinMat);
    makeBox(g, 0.14, 0.42, 0.48, 0, 0.62, 0.06, this.sharkFinMat);
    makeBox(g, 0.12, 0.26, 0.24, 0, 0.92, 0.12, this.sharkFinMat);
    makeBox(g, 0.68, 0.08, 1.05, 0, 0.02, 0.12, this.iceCrackMat);
    const trim = addDangerTrim(g, 0.86, 1.05);
    return this._reg('shark_fin', g, {
      bobPhase: 0, extraSpeed: 4.2, halfW: 0.46, minY: -0.1, maxY: 1.1, halfD: 0.54,
      dangerVisuals: [trim], color: '#64748b'
    }, { y: 1.55, label: '🦈 TUBARÃO ⬇ MERGULHE / ⬅➡', color: '#38bdf8' });
  }

  _makeAnglerHazard() {
    const g = new THREE.Group();
    makeBox(g, 0.84, 0.68, 1.05, 0, 0.48, 0, this.anglerMat);
    makeBox(g, 0.68, 0.22, 0.58, 0, 0.24, 0.42, this.eggMat); // dentes / mandíbula
    makeBox(g, 0.12, 0.48, 0.42, 0, 0.48, -0.68, this.coralMat); // cauda
    makeBox(g, 0.1, 0.45, 0.1, 0, 0.98, 0.35, this.stoneMat); // antena
    const lureBulb = makeBox(g, 0.26, 0.26, 0.26, 0, 1.06, 0.58, this.lureMat);
    const trim = addDangerTrim(g, 1.05, 1.15);
    return this._reg('angler_hazard', g, {
      lureBulb, bobPhase: 0, extraSpeed: 3.2, halfW: 0.52, minY: 0.05, maxY: 1.15, halfD: 0.56,
      breakable: true, dangerVisuals: [trim], color: '#818cf8'
    }, { y: 1.68, label: '🐟 PEIXE ABISSAL ⬅➡ / [Q]', color: '#a5b4fc' });
  }

  _makeThermalVent() {
    const g = new THREE.Group();
    makeBox(g, 1.05, 0.95, 1.05, 0, 0.48, 0, this.stoneMat);
    makeBox(g, 0.66, 0.42, 0.66, 0, 1.05, 0, this.lavaMat);
    const plume = makeBox(g, 0.52, 2.25, 0.52, 0, 2.2, 0, this.bubbleMat);
    const trim = addDangerTrim(g, 1.15, 1.15);
    return this._reg('thermal_vent', g, {
      plume, halfW: 0.56, minY: 0, maxY: 3.15, halfD: 0.56,
      dangerVisuals: [trim], color: '#fb923c'
    }, { y: 3.55, label: '🌋 FUMAROLA ⬅➡ / SUBIR', color: '#fb923c' });
  }

  _makeCurrentRing() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.12, 6, 18), this.currentRingMat);
    ring.position.y = 0.72;
    g.add(ring);
    const core = makeBox(g, 0.34, 0.34, 0.34, 0, 0.72, 0, this.bubbleMat);
    return this._reg('current_ring', g, {
      ring, core, halfW: 0.88, minY: -0.1, maxY: 1.55, halfD: 0.65,
      nonHazard: true, color: '#22d3ee'
    }, { y: 1.85, label: '🌀 CORRENTE TURBO!', color: '#22d3ee' });
  }

  setSeed(seed) {
    this.rng = seed ? createSeededRng(seed) : Math.random;
  }

  setBiome(biomeId) {
    this.biomeId = biomeId || 'desert';
  }

  setDensity(mult) {
    this.densityMult = Math.max(0.4, Math.min(2.2, mult));
  }

  setDifficultyId(id) {
    this.difficultyId = id || 'normal';
    this.showRedHazardSignage = id === 'easy' || id === 'normal';
    this.minSafePaths = this.showRedHazardSignage ? 2 : 1;
  }

  setDifficultyConfig(diff) {
    if (!diff) return;
    this.difficultyId = diff.id || 'normal';
    this.showRedHazardSignage = diff.showRedHazardSignage !== undefined
      ? !!diff.showRedHazardSignage
      : (this.difficultyId === 'easy' || this.difficultyId === 'normal');
    this.minSafePaths = Math.max(1, diff.minSafePaths ?? (this.showRedHazardSignage ? 2 : 1));
  }

  setBossManager(bossManager) {
    this.bossManager = bossManager || null;
  }

  setHabitatMode(mode = 'land', isAquaticBiome = false) {
    this.habitatMode = mode || 'land';
    this.isAquaticBiome = !!isAquaticBiome;
  }

  _isWaterTrack() {
    return Boolean(
      this.habitatMode === 'aquatic' ||
      this.isAquaticBiome ||
      this.biomeId === 'abyss_submerged' ||
      this.biomeId === 'jurassic_river' ||
      this.biomeId === 'ocean_surface'
    );
  }

  _getUnderwaterBaseY(relY = 0) {
    return (this.biomeId === 'abyss_submerged' ? 0 : -2.75) + relY;
  }

  _getLaneX(laneIdx = 1) {
    const idx = Math.max(0, Math.min(2, Math.floor(laneIdx)));
    return (this.habitatMode === 'aquatic' && !this.isAquaticBiome) ? RIVER_LANE_X[idx] : LANE_X[idx];
  }

  _getLaneIndexFromX(x) {
    const lanes = (this.habitatMode === 'aquatic' && !this.isAquaticBiome) ? RIVER_LANE_X : LANE_X;
    let best = -1;
    let bestD = 1.1;
    for (let i = 0; i < 3; i++) {
      const d = Math.abs(x - lanes[i]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  _getBaseY(defaultY = 0) {
    return (this.habitatMode === 'flying' ? (SKY_CORRIDOR_Y - 1.15) : 0) + defaultY;
  }

  _getBlockedLanesNearZ(zMin, zMax) {
    const blocked = this.bossManager?.getBlockedLanesNearZ?.(zMin, zMax) || new Set();
    const skipKinds = new Set([
      'egg', 'powerup', 'fruit', 'elemental_egg', 'treasure', 'speed_pad',
      'trampoline', 'ramp', 'campfire', 'shortcut', 'grapple_point',
      'gravity_zone', 'minecart_zone', 'river_log', 'bifurcation',
      'oasis_zone', 'fragile_bridge', 'rescue_cross', 'shop_gate',
      'oxygen_bubble', 'current_ring'
    ]);
    for (const key of Object.keys(this.pools)) {
      if (skipKinds.has(key)) continue;
      const active = this.pools[key].active;
      for (let i = 0; i < active.length; i++) {
        const o = active[i];
        const oz = o.group.position.z;
        if (oz >= zMin && oz <= zMax) {
          const idx = this._getLaneIndexFromX(o.group.position.x);
          if (idx >= 0) blocked.add(idx);
        }
      }
    }
    return blocked;
  }

  _canBlockLane(laneIdx, spawnZ) {
    const blocked = this._getBlockedLanesNearZ(spawnZ - 11, spawnZ + 11);
    blocked.add(laneIdx);
    return (3 - blocked.size) >= (this.minSafePaths || 1);
  }

  getActiveObstacles() {
    const out = [];
    for (const key of Object.keys(this.pools)) {
      const active = this.pools[key].active;
      for (let i = 0; i < active.length; i++) out.push(active[i]);
    }
    return out;
  }

  _acquire(kind, x, y, z, opts = {}) {
    const pool = this.pools[kind];
    if (!pool) return null;
    const item = pool.acquire();
    item.pool = pool;
    item.breakable = kind === 'cactus_small' || kind === 'scorpion' || kind === 'rolling_log' || kind === 'cactus_shooter' || kind === 'cactus_spine' || kind === 'amber_crystal' || kind === 'falling_stalactite' || kind === 'spike_barricade' || kind === 'coral_reef' || kind === 'jellyfish_swarm' || kind === 'angler_hazard';
    const baseY = opts.rawY ? y : this._getBaseY(y);
    item.spawnY = baseY;
    item.group.position.set(x, baseY, z);
    item.group.visible = true;
    const showRed = !!this.showRedHazardSignage;
    if (Array.isArray(item.dangerVisuals)) {
      for (let i = 0; i < item.dangerVisuals.length; i++) {
        item.dangerVisuals[i].visible = showRed;
      }
    }
    if (Array.isArray(item.cleanVisuals)) {
      for (let i = 0; i < item.cleanVisuals.length; i++) {
        item.cleanVisuals[i].visible = !showRed;
      }
    }
    const seen = Save.data.seenElements || [];
    const alwaysHelpful = kind === 'bifurcation' || kind === 'shortcut' || kind === 'shop_gate';
    if (item.hintSprite) {
      item.hintSprite.visible = this.showObstacleHints && (this.tutorialMode || alwaysHelpful || !seen.includes(kind));
    }
    return item;
  }

  spawnTutorialObject(kind, laneIdx = 1, opts = {}) {
    const x = kind === 'bifurcation' ? 0 : LANE_X[Math.max(0, Math.min(2, laneIdx))];
    const z = opts.z ?? -58;
    const y = opts.y ?? (kind === 'bird' ? (opts.highBird ? 1.62 : 0.72) : 0);
    const item = this._acquire(kind, x, y, z);
    if (!item) return null;
    if (kind === 'bird') {
      const isHigh = !!opts.highBird;
      item.baseY = isHigh ? 1.62 : 0.72;
      item.minY = -0.34;
      item.maxY = 0.36;
      item.group.position.y = this._getBaseY(item.baseY);
      this._setHint(item, isHigh ? '⬇ ABAIXAR / PISAR' : '⬆ PULAR / PISAR', isHigh ? '#38bdf8' : '#fbbf24');
    } else if (kind === 'elemental_egg') {
      const elems = [
        { id: 'fire', color: '#ff5e1a', label: '🔥 OVO FOGO' },
        { id: 'ice', color: '#38bdf8', label: '❄️ OVO GELO' },
        { id: 'lightning', color: '#facc15', label: '⚡ OVO RAIO' },
        { id: 'poison', color: '#a3e635', label: '☠️ OVO VENENO' }
      ];
      const pick = elems.find((e) => e.id === opts.element) || elems[0];
      item.element = pick.id;
      item.color = pick.color;
      item.mat.color.set(pick.color);
      item.mat.emissive.set(pick.color);
      this._setElementalVisual(item, pick.id);
      this._setHint(item, pick.label, pick.color);
    } else if (kind === 'powerup') {
      if (opts.powerId) item.powerId = opts.powerId;
      item.isBackpack = !!opts.isBackpack;
      this._setPowerupVisual(item);
    }
    return item;
  }

  _applyEggTier(egg, tierOrBool = 1) {
    const isMyst = tierOrBool === 'mystery' || tierOrBool === 'misterioso';
    const tier = isMyst ? 3 : (tierOrBool === true ? 5 : (tierOrBool === false ? 1 : (Number(tierOrBool) || 1)));
    egg.eggTier = tier;
    egg.isMystery = isMyst;
    egg.isGold = !isMyst && tier >= 5;
    const activeKey = isMyst ? 'misterioso' : (tier >= 25 ? 'raro' : (tier >= 5 ? 'dourado' : 'comum'));
    if (egg.variants) {
      Object.entries(egg.variants).forEach(([k, v]) => {
        v.visible = k === activeKey;
      });
    }
    if (egg.nestBase) {
      egg.nestBase.visible = isMyst || tier >= 5;
      egg.nestBase.material.color.set(isMyst ? '#c084fc' : (tier >= 25 ? '#a855f7' : '#ffd447'));
    }
    const s = isMyst ? 1.08 : (tier >= 25 ? 1.38 : (tier >= 5 ? 1.12 : 1.0));
    egg.group.scale.set(s, s, s);
  }

  spawnEggArc(laneIdx, count = 3, tierOrBool = false, startZ = -125, opts = {}) {
    const x = this._getLaneX(laneIdx);
    const underwater = Boolean(opts?.underwater);
    for (let i = 0; i < count; i++) {
      const arcOffset = Math.sin((i / Math.max(1, count - 1)) * Math.PI) * (underwater ? 0.68 : 1.1);
      const y = underwater ? this._getUnderwaterBaseY(0.12 + arcOffset) : arcOffset;
      const egg = this._acquire('egg', x, y, startZ - i * 2.2, underwater ? { rawY: true } : undefined);
      if (!egg) continue;
      let tier = 1;
      if (tierOrBool === 'mystery' || tierOrBool === 'misterioso') {
        tier = 'mystery';
      } else if (typeof tierOrBool === 'number') {
        tier = tierOrBool;
      } else if (tierOrBool === true) {
        tier = 5;
      } else {
        const r = this.rng();
        tier = r < 0.02 ? 25 : (r < 0.07 ? 'mystery' : (r < 0.19 ? 5 : 1));
      }
      this._applyEggTier(egg, tier);
    }
  }

  spawnEggRain(count = 8) {
    for (let i = 0; i < count; i++) {
      const laneIdx = Math.floor(this.rng() * 3);
      const egg = this._acquire('egg', this._getLaneX(laneIdx), 0.2 + this.rng() * 1.5, -55 - i * 3.4);
      if (egg) {
        const r = this.rng();
        const tier = r < 0.05 ? 25 : (r < 0.28 ? 5 : 1);
        this._applyEggTier(egg, tier);
      }
    }
  }

  spawnCampfire() {
    this._acquire('campfire', this._getLaneX(1), 0, -125);
  }

  spawnShopGate(side = 'right', startZ = -115) {
    const x = SHOP_LANE_X[side] ?? SHOP_LANE_X.right;
    return this._acquire('shop_gate', x, 0, startZ, { rawY: this.habitatMode !== 'flying' });
  }

  spawnShortcutPortal(destType = null) {
    const laneIdx = this.rng() < 0.5 ? 0 : 2;
    const portal = this._acquire('shortcut', this._getLaneX(laneIdx), 0, -125);
    if (portal) {
      const dest = destType || (this.rng() < 0.45 ? 'biome' : (this.rng() < 0.72 ? 'eggs' : 'mystery'));
      const cfg = {
        biome: { color: '#38bdf8', label: '🌀 PORTAL BIOMA' },
        eggs: { color: '#ffd447', label: '🌀 PORTAL OVOS' },
        mystery: { color: '#c084fc', label: '🌀 PORTAL MISTÉRIO' }
      }[dest];
      portal.portalDest = dest;
      portal.color = cfg.color;
      portal.runeMat.color.set(cfg.color);
      portal.runeMat.emissive.set(cfg.color);
      portal.vortexMat.color.set(cfg.color);
      this._setHint(portal, cfg.label, cfg.color);
    }
  }

  spawnFruitRain(count = 10) {
    for (let i = 0; i < count; i++) {
      const laneIdx = Math.floor(this.rng() * 3);
      this._acquire('fruit', this._getLaneX(laneIdx), 0.15, -45 - i * 4.2);
    }
  }

  _acquirePowerup(x, y, z, opts = {}) {
    const p = this._acquire('powerup', x, y, z, opts);
    if (!p) return null;
    const isBackpack = this.rng() < 0.28;
    p.isBackpack = isBackpack;
    if (isBackpack) {
      p.powerId = BACKPACK_ITEM_KEYS[Math.floor(this.rng() * BACKPACK_ITEM_KEYS.length)];
      p.mat.color.set('#f59e0b');
      p.mat.emissive.set('#f59e0b');
      this._setHint(p, '🎒 MOCHILA [E]', '#f59e0b');
    } else {
      p.powerId = TRACK_POWERUP_KEYS[Math.floor(this.rng() * TRACK_POWERUP_KEYS.length)];
      const info = TRACK_POWERUPS[p.powerId];
      p.mat.color.set(info.color);
      p.mat.emissive.set(info.color);
      this._setHint(p, `⚡ ${info.name.toUpperCase()}`, info.color);
    }
    this._setPowerupVisual(p);
    return p;
  }

  _acquireElementalEgg(x, y, z, opts = {}) {
    const ee = this._acquire('elemental_egg', x, y, z, opts);
    if (!ee) return null;
    const elems = [
      { id: 'fire', color: '#ff5e1a', label: '🔥 OVO FOGO' },
      { id: 'ice', color: '#38bdf8', label: '❄️ OVO GELO' },
      { id: 'lightning', color: '#facc15', label: '⚡ OVO RAIO' },
      { id: 'poison', color: '#a3e635', label: '☠️ OVO VENENO' }
    ];
    const pick = elems[Math.floor(this.rng() * elems.length)];
    ee.element = pick.id;
    ee.color = pick.color;
    ee.mat.color.set(pick.color);
    ee.mat.emissive.set(pick.color);
    this._setElementalVisual(ee, pick.id);
    this._setHint(ee, pick.label, pick.color);
    return ee;
  }

  _spawnWaterWave(speed, score, laneIdx, otherLane, thirdLane, spawnZ, waveRoll, r) {
    const isAbyss = this.biomeId === 'abyss_submerged';
    const x = this._getLaneX(laneIdx);
    const otherX = this._getLaneX(otherLane);

    // 1. Onda de recompensa aquática (arco de ovos na superfície ou trilha submersa para incentivar mergulho)
    if (waveRoll < 0.19) {
      const diveArc = !isAbyss && score >= 120 && this.rng() < 0.56;
      this.spawnEggArc(laneIdx, 2 + Math.floor(this.rng() * 2), null, spawnZ - 1, { underwater: diveArc });
      if (score > 340 && this.rng() < 0.4 && this._canBlockLane(otherLane, spawnZ - 3)) {
        if (isAbyss) {
          this._acquire('coral_reef', otherX, 0, spawnZ - 3);
        } else {
          const sf = this._acquire('shark_fin', otherX, -0.05, spawnZ - 3);
          if (sf) sf.bobPhase = this.rng() * Math.PI * 2;
        }
      }
      return;
    }

    // 2. Onda de Power-Up / Mochila aquática
    if (waveRoll < 0.27 && score > 150 && this.powerupCooldown <= 0) {
      this.powerupCooldown = 13 + this.rng() * 6;
      const pLane = (laneIdx + 2) % 3;
      const deepPu = !isAbyss && score > 240 && this.rng() < 0.42;
      const puY = deepPu ? this._getUnderwaterBaseY(0.15) : 0.08;
      this._acquirePowerup(this._getLaneX(pLane), puY, spawnZ - 2, { rawY: deepPu });
      return;
    }

    // 3. Onda de coletável aquático (Bolha de O2, Anel de Corrente, Baú submerso ou Ovo Elemental)
    if (waveRoll < 0.38 && score > 140 && this.collectibleCooldown <= 0) {
      this.collectibleCooldown = 7.5 + this.rng() * 4.5;
      const bonusRoll = this.rng();
      const deepReward = !isAbyss && this.rng() < 0.6;
      if (bonusRoll < 0.44) {
        const by = deepReward ? this._getUnderwaterBaseY(0.05) : 0.15;
        this._acquire('oxygen_bubble', otherX, by, spawnZ - 2, { rawY: deepReward });
      } else if (bonusRoll < 0.68) {
        const ry = !isAbyss ? this._getUnderwaterBaseY(-0.2) : 0.1;
        this._acquire('current_ring', otherX, ry, spawnZ - 2, { rawY: !isAbyss });
        if (score >= 160) {
          this.spawnEggArc(otherLane, 2, 5, spawnZ - 5.5, { underwater: !isAbyss });
        }
      } else if (bonusRoll < 0.86 && score > 220) {
        const ey = deepReward ? this._getUnderwaterBaseY(0.1) : 0.12;
        this._acquireElementalEgg(otherX, ey, spawnZ - 2, { rawY: deepReward });
      } else if (score > 280) {
        const sunken = !isAbyss && this.rng() < 0.72;
        this._acquire('treasure', otherX, sunken ? this._getUnderwaterBaseY(0) : 0, spawnZ - 2, { rawY: sunken });
      } else {
        this._acquire('oxygen_bubble', otherX, deepReward ? this._getUnderwaterBaseY(0.05) : 0.15, spawnZ - 2, { rawY: deepReward });
      }
      return;
    }

    // 4. Anel de Corrente Submarino (convite visual para mergulhar)
    if (!isAbyss && waveRoll < 0.45 && score > 180 && this.featureCooldown <= 0) {
      this.featureCooldown = 8.0 + this.rng() * 4.5;
      this._acquire('current_ring', x, this._getUnderwaterBaseY(-0.2), spawnZ, { rawY: true });
      this.spawnEggArc(laneIdx, 3, null, spawnZ - 3.5, { underwater: true });
      return;
    }

    // 5. Obstáculos aquáticos temáticos (camada de superfície E camada submersa)
    let targetLane = laneIdx;
    if (!this._canBlockLane(targetLane, spawnZ)) {
      const alt = [otherLane, thirdLane].find((idx) => this._canBlockLane(idx, spawnZ));
      if (alt === undefined) {
        this.spawnEggArc(laneIdx, 3, null, spawnZ, { underwater: !isAbyss && this.rng() < 0.45 });
        return;
      }
      targetLane = alt;
    }
    const obsX = this._getLaneX(targetLane);

    if (this.rng() < 0.18) {
      this.spawnEggArc((targetLane + 1) % 3, 2, null, spawnZ - 2, { underwater: !isAbyss && this.rng() < 0.5 });
    }

    if (score < 260) {
      if (isAbyss) {
        if (r < 0.45) {
          this._acquire('coral_reef', obsX, 0, spawnZ);
        } else if (r < 0.78) {
          const ang = this._acquire('angler_hazard', obsX, 0.22, spawnZ);
          if (ang) ang.bobPhase = this.rng() * Math.PI * 2;
        } else {
          const jf = this._acquire('jellyfish_swarm', obsX, 1.32, spawnZ);
          if (jf) jf.bobPhase = this.rng() * Math.PI * 2;
        }
      } else {
        if (r < 0.48) {
          const sf = this._acquire('shark_fin', obsX, -0.05, spawnZ);
          if (sf) sf.bobPhase = this.rng() * Math.PI * 2;
        } else if (r < 0.78) {
          const mine = this._acquire('abyss_mine', obsX, -0.22, spawnZ);
          if (mine) mine.bobPhase = this.rng() * Math.PI * 2;
        } else {
          this._acquire('whirlpool_vortex', obsX, 0, spawnZ);
        }
      }
      return;
    }

    if (isAbyss) {
      if (r < 0.26) {
        this._acquire('coral_reef', obsX, 0, spawnZ);
      } else if (r < 0.5) {
        const ang = this._acquire('angler_hazard', obsX, 0.22, spawnZ);
        if (ang) ang.bobPhase = this.rng() * Math.PI * 2;
      } else if (r < 0.72) {
        this._acquire('thermal_vent', obsX, 0, spawnZ);
      } else if (r < 0.88) {
        const jf = this._acquire('jellyfish_swarm', obsX, 1.42, spawnZ);
        if (jf) jf.bobPhase = this.rng() * Math.PI * 2;
      } else {
        const mine = this._acquire('abyss_mine', obsX, 0.22, spawnZ);
        if (mine) mine.bobPhase = this.rng() * Math.PI * 2;
      }
      return;
    }

    // Pista Oceânica / Rio com dualidade vertical (superfície para mergulhar por baixo vs fundo para subir/desviar)
    const spawnDeep = this.rng() < 0.46;
    if (spawnDeep) {
      if (r < 0.3) {
        const ang = this._acquire('angler_hazard', obsX, -2.85, spawnZ, { rawY: true });
        if (ang) ang.bobPhase = this.rng() * Math.PI * 2;
      } else if (r < 0.56) {
        this._acquire('thermal_vent', obsX, -4.6, spawnZ, { rawY: true });
      } else if (r < 0.8) {
        const mine = this._acquire('abyss_mine', obsX, -3.25, spawnZ, { rawY: true });
        if (mine) mine.bobPhase = this.rng() * Math.PI * 2;
      } else {
        const jf = this._acquire('jellyfish_swarm', obsX, -2.35, spawnZ, { rawY: true });
        if (jf) jf.bobPhase = this.rng() * Math.PI * 2;
      }
      return;
    }

    if (r < 0.36) {
      const sf = this._acquire('shark_fin', obsX, -0.05, spawnZ);
      if (sf) sf.bobPhase = this.rng() * Math.PI * 2;
    } else if (r < 0.68) {
      this._acquire('whirlpool_vortex', obsX, 0, spawnZ);
    } else if (r < 0.86) {
      const mine = this._acquire('abyss_mine', obsX, -0.22, spawnZ);
      if (mine) mine.bobPhase = this.rng() * Math.PI * 2;
    } else {
      const jf = this._acquire('jellyfish_swarm', obsX, 1.18, spawnZ);
      if (jf) jf.bobPhase = this.rng() * Math.PI * 2;
    }
  }

  _spawnOne(speed, score) {
    const spawnZ = -125;
    const laneIdx = Math.floor(this.rng() * 3);
    const x = this._getLaneX(laneIdx);
    const r = this.rng();

    // Ondas organizadas em ritmo limpo (sem empilhar ovos, zonas e 2 obstáculos no mesmo trecho)
    const waveRoll = this.rng();
    const otherLane = (laneIdx + 1) % 3;
    const thirdLane = [0, 1, 2].find((idx) => idx !== laneIdx && idx !== otherLane) ?? otherLane;

    if (this._isWaterTrack()) {
      this._spawnWaterWave(speed, score, laneIdx, otherLane, thirdLane, spawnZ, waveRoll, r);
      return;
    }

    // 1. Onda de recompensa leve (apenas arco de ovos limpo no início; obstáculo leve só após 480 pts com caminho garantido)
    if (waveRoll < 0.17) {
      this.spawnEggArc(laneIdx, 2 + Math.floor(this.rng() * 2), null, spawnZ - 1);
      if (score > 480 && this.rng() < 0.42 && this._canBlockLane(otherLane, spawnZ - 3)) {
        this._acquire('cactus_small', this._getLaneX(otherLane), 0, spawnZ - 3);
      }
      return;
    }

    // 2. Onda de Power-Up ou Mochila (cooldown mínimo para não poluir a pista)
    if (waveRoll < 0.25 && score > 160 && this.powerupCooldown <= 0) {
      this.powerupCooldown = 13 + this.rng() * 6;
      const pLane = (laneIdx + 2) % 3;
      this._acquirePowerup(this._getLaneX(pLane), 0, spawnZ - 2);
      return;
    }

    // 3. Onda de coletável especial (Fruta, Ovo Elemental ou Tesouro espaçados)
    if (waveRoll < 0.34 && score > 190 && this.collectibleCooldown <= 0) {
      this.collectibleCooldown = 8.5 + this.rng() * 4.5;
      const bonusRoll = this.rng();
      if (bonusRoll < 0.46) {
        this._acquire('fruit', this._getLaneX(otherLane), 0.1, spawnZ - 3);
      } else if (bonusRoll < 0.8 && score > 240) {
        this._acquireElementalEgg(this._getLaneX(otherLane), 0.1, spawnZ - 3);
      } else if (score > 340) {
        this._acquire('treasure', this._getLaneX(otherLane), 0, spawnZ - 3);
      }
      if (score > 520 && this.rng() < 0.45 && this._canBlockLane(laneIdx, spawnZ)) {
        this._acquire('cactus_small', x, 0, spawnZ);
      }
      return;
    }

    // 4. Onda de zona interativa / mecanismo de pista (apenas após aprendizado inicial)
    if (waveRoll < 0.43 && score > 320 && this.featureCooldown <= 0 && this.habitatMode === 'land') {
      this.featureCooldown = 9.0 + this.rng() * 5.0;
      const featRoll = this.rng();
      if (featRoll < 0.28) {
        this._acquire('speed_pad', x, 0, spawnZ);
      } else if (featRoll < 0.54) {
        this._acquire('trampoline', x, 0, spawnZ);
      } else if (featRoll < 0.68 && score > 450) {
        this._acquire('grapple_point', x, 0, spawnZ);
      } else if (featRoll < 0.8 && score > 520) {
        const gz = this._acquire('gravity_zone', this._getLaneX(otherLane), 0, spawnZ);
        if (gz) {
          gz.gravMode = this.rng() < 0.5 ? 'low' : 'heavy';
          this._setHint(gz, gz.gravMode === 'low' ? '🪐 GRAVIDADE BAIXA' : '🪨 GRAVIDADE PESADA', gz.gravMode === 'low' ? '#818cf8' : '#a78bfa');
        }
      } else if (featRoll < 0.9 && score > 620) {
        this._acquire('minecart_zone', x, 0, spawnZ);
      } else if (score > 560 && featRoll < 0.96) {
        this._acquire('river_log', this._getLaneX(2), 0, spawnZ);
      } else if (score > 750) {
        this._acquire('bifurcation', 0, 0, spawnZ - 4);
      }
      return;
    }

    // Garante que esta faixa pode receber obstáculo sem violar minSafePaths (2 rotas no Fácil/Normal!)
    let targetLane = laneIdx;
    if (!this._canBlockLane(targetLane, spawnZ)) {
      const alt = [otherLane, thirdLane].find((idx) => this._canBlockLane(idx, spawnZ));
      if (alt === undefined) {
        this.spawnEggArc(laneIdx, 3, null, spawnZ);
        return;
      }
      targetLane = alt;
    }
    const obsX = this._getLaneX(targetLane);

    // Pequeno bônus eventual de 2 ovos em faixa separada em ondas de obstáculo
    if (this.rng() < 0.14) {
      this.spawnEggArc((targetLane + 1) % 3, 2, null, spawnZ - 2);
    }

    // No início da corrida (< 320 pts), mantém pista clara e intuitiva com obstáculos clássicos puláveis/desviáveis
    if (score < 320) {
      if (r < 0.55) {
        this._acquire('cactus_small', obsX, 0, spawnZ);
      } else if (r < 0.85) {
        const bird = this._acquire('bird', obsX, 1.62, spawnZ);
        if (bird) {
          bird.baseY = 1.62;
          bird.minY = -0.34;
          bird.maxY = 0.36;
          bird.flapPhase = this.rng() * Math.PI * 2;
          bird.group.position.y = this._getBaseY(bird.baseY);
          if (bird.duckOverlay) bird.duckOverlay.visible = !!this.showRedHazardSignage;
          this._setHint(bird, '⬇ ABAIXAR / PISAR', '#38bdf8');
        }
      } else {
        this._acquire('cactus_tall', obsX, 0, spawnZ);
      }
      return;
    }

    if (this.habitatMode === 'land') {
      if (this.biomeId === 'dark_swamp' && r < 0.2) {
        this._acquire(this.rng() < 0.62 ? 'mud_pool' : 'toxic_pool', obsX, 0, spawnZ);
        return;
      }
      if (this.biomeId === 'jurassic_forest' && r < 0.14) {
        this._acquire('mud_pool', obsX, 0, spawnZ);
        return;
      }
      if (this.biomeId === 'volcano' && r < 0.25) {
        this._acquire(this.rng() < 0.55 ? 'lava_pool' : 'geyser_vent', obsX, 0, spawnZ);
        return;
      }
      if (this.biomeId === 'ice_age' && r < 0.25) {
        this._acquire(this.rng() < 0.65 ? 'thin_ice' : 'falling_stalactite', obsX, 0, spawnZ);
        return;
      }
      if ((this.biomeId === 'crystal_cavern' || this.biomeId === 'snowy_mountain' || this.biomeId === 'hollow_earth') && r < 0.26) {
        this._acquire(this.rng() < 0.62 ? 'falling_stalactite' : 'amber_crystal', obsX, 0, spawnZ);
        return;
      }
      if ((this.biomeId === 'fossil_graveyard' || this.biomeId === 'ruined_city') && r < 0.25) {
        this._acquire(this.rng() < 0.52 ? 'tar_pit' : (this.rng() < 0.5 ? 'amber_crystal' : 'spike_barricade'), obsX, 0, spawnZ);
        return;
      }
      if ((this.biomeId === 'alien_planet' || this.biomeId === 'alien_factory' || this.biomeId === 'storm_desert' || this.biomeId === 'mecha_city') && r < 0.26) {
        this._acquire(this.rng() < 0.55 ? 'alien_trap' : 'electric_pylon', obsX, 0, spawnZ);
        return;
      }
    }

    if (score > 180 && r < 0.23) {
      const bird = this._acquire('bird', obsX, 1.62, spawnZ);
      if (bird) {
        const isHigh = this.rng() < 0.56;
        bird.baseY = isHigh ? 1.62 : 0.72;
        bird.minY = -0.34;
        bird.maxY = 0.36;
        bird.flapPhase = this.rng() * Math.PI * 2;
        bird.group.position.y = this._getBaseY(bird.baseY);
        if (bird.duckOverlay) bird.duckOverlay.visible = !!this.showRedHazardSignage && isHigh;
        this._setHint(bird, isHigh ? '⬇ ABAIXAR / PISAR' : '⬆ PULAR / PISAR', isHigh ? '#38bdf8' : '#fbbf24');
      }
      return;
    }

    if (score > 340 && r < 0.33) {
      this._acquire(this.rng() < 0.72 ? 'scorpion' : 'spike_barricade', obsX, 0, spawnZ);
      return;
    }

    if (score > 380 && r < 0.39) {
      this._acquire(this.rng() < 0.55 ? 'amber_crystal' : (this.habitatMode === 'land' ? 'tar_pit' : 'toxic_pool'), obsX, 0, spawnZ);
      return;
    }

    if (score > 420 && r < 0.44 && r >= 0.39) {
      this._acquire(this.rng() < 0.65 ? 'cactus_shooter' : 'electric_pylon', obsX, 0, spawnZ);
      return;
    }

    if (score > 360 && r < 0.51) {
      this._acquire(this.rng() < 0.68 ? 'rolling_log' : (this.habitatMode === 'land' ? 'geyser_vent' : 'amber_crystal'), obsX, 0, spawnZ);
      return;
    }

    if (score > 450 && r < 0.56 && this.habitatMode === 'land') {
      this._acquire('ramp', obsX, 0, spawnZ);
      return;
    }

    if (score > 520 && r < 0.63) {
      this._acquire(this.rng() < 0.72 ? 'tall_rock' : 'falling_stalactite', obsX, 0, spawnZ);
      return;
    }

    if (r < 0.78) {
      this._acquire('cactus_small', obsX, 0, spawnZ);
    } else if (r < 0.91) {
      this._acquire('cactus_tall', obsX, 0, spawnZ);
    } else {
      this._acquire('cactus_cluster', obsX, 0, spawnZ);
    }

    // Segundo obstáculo na mesma onda apenas após 700 pts e SOMENTE se respeitar minSafePaths!
    if (score > 700 && this.rng() < 0.24) {
      const secLane = (targetLane + 1) % 3;
      if (this._canBlockLane(secLane, spawnZ - 2.6)) {
        this._acquire('cactus_small', this._getLaneX(secLane), 0, spawnZ - 2.6);
      }
    }
  }

  update(dt, speed, score, players = [], magneticActive = false) {
    this.elapsed += dt;
    this.magneticStormActive = !!magneticActive;
    if (this.oasisReliefTimer > 0) {
      this.oasisReliefTimer = Math.max(0, this.oasisReliefTimer - dt);
    }
    if (this.powerupCooldown > 0) this.powerupCooldown = Math.max(0, this.powerupCooldown - dt);
    if (this.featureCooldown > 0) this.featureCooldown = Math.max(0, this.featureCooldown - dt);
    if (this.collectibleCooldown > 0) this.collectibleCooldown = Math.max(0, this.collectibleCooldown - dt);
    if (!this.tutorialMode) {
      this.chunkCooldown -= dt;
      if (score > 460 && this.habitatMode === 'land' && this.chunkCooldown <= 0) {
        const chunkKinds = ['oasis_zone', 'fragile_bridge', 'rescue_cross'];
        const ck = chunkKinds[Math.floor(this.rng() * chunkKinds.length)];
        this._acquire(ck, 0, 0, -96);
        this.spawnTimer = Math.max(this.spawnTimer, 2.2);
        this.chunkCooldown = 34 + this.rng() * 14;
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawnOne(speed, score);
        const earlyRelief = score < 550 ? 1.45 : 1.0;
        const easyRelief = (this.difficultyId === 'easy' && score < 900) ? 1.3 : 1.0;
        const oasisSlow = this.oasisReliefTimer > 0 ? 1.65 : 1.0;
        const minReactionTime = Math.max(0.95, 23.0 / Math.max(16, speed));
        const rawMinGap = ((1.48 - Math.max(0, speed - 18) * 0.013) / this.densityMult) * earlyRelief * easyRelief * oasisSlow;
        const minGap = Math.max(minReactionTime, rawMinGap);
        const maxGap = (minGap + (0.68 / this.densityMult) * earlyRelief * easyRelief * oasisSlow);
        this.spawnTimer = minGap + this.rng() * (maxGap - minGap);
      }
    }

    for (const key of Object.keys(this.pools)) {
      const pool = this.pools[key];
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const obs = pool.active[i];
        const moveSpeed = speed + (obs.extraSpeed || 0);
        obs.group.position.z += moveSpeed * dt;

        if (obs.kind === 'bird') {
          obs.flapPhase += dt * 13;
          const flap = Math.sin(obs.flapPhase) * 0.58;
          obs.wingL.rotation.z = flap;
          obs.wingR.rotation.z = -flap;
          obs.group.position.y = this._getBaseY(obs.baseY) + Math.sin(obs.flapPhase * 0.5) * 0.08;
        } else if (obs.kind === 'rolling_log') {
          obs.body.rotation.x += dt * 9;
        } else if (obs.kind === 'egg') {
          obs.group.rotation.y += dt * 3;
          // Ímã de ovos (+ Tempestade Magnética)
          for (const p of players) {
            if (p.dead) continue;
            const magnetRange = (p.magnetTimer > 0 ? 11.5 : 0) + (p.permanentMagnet || 0) + (p.id === 'ghostgold' ? 5 : 0) + (this.magneticStormActive ? 14 : 0);
            if (magnetRange > 0) {
              const dx = p.x - obs.group.position.x;
              const dz = p.z - obs.group.position.z;
              const dist = Math.hypot(dx, dz);
              if (dist < magnetRange && dist > 0.05) {
                obs.group.position.x += (dx / dist) * dt * 22;
                obs.group.position.z += (dz / dist) * dt * 22;
              }
            }
          }
        } else if (obs.kind === 'powerup') {
          obs.group.rotation.y += dt * 2.5;
          if (obs.cube && obs.crate?.visible) obs.cube.rotation.x += dt * 1.8;
        } else if (obs.kind === 'scorpion') {
          obs.walkPhase += dt * 10;
          obs.group.position.y = this._getBaseY(Math.abs(Math.sin(obs.walkPhase)) * 0.06);
        } else if (obs.kind === 'cactus_shooter') {
          if (!obs.shot && obs.group.position.z > -42) {
            obs.shot = true;
            this._acquire('cactus_spine', obs.group.position.x, 0, obs.group.position.z + 1.2);
          }
        } else if (obs.kind === 'fruit' || obs.kind === 'elemental_egg' || obs.kind === 'treasure') {
          obs.group.rotation.y += dt * 2.8;
          if (obs.ring) obs.ring.rotation.z += dt * 3.5;
        } else if (obs.kind === 'shortcut') {
          if (obs.vortexRing) obs.vortexRing.rotation.z += dt * 2.4;
          if (obs.vortexDisc) obs.vortexDisc.material.opacity = 0.55 + Math.sin(this.elapsed * 6) * 0.18;
        } else if (obs.kind === 'trampoline' && obs.arrow) {
          obs.arrow.position.y = Math.sin(this.elapsed * 7) * 0.14;
        } else if (obs.kind === 'mud_pool' && obs.b1) {
          obs.b1.scale.setScalar(0.85 + Math.sin(this.elapsed * 6) * 0.25);
          if (obs.b2) obs.b2.scale.setScalar(0.85 + Math.cos(this.elapsed * 5) * 0.25);
        } else if (obs.kind === 'toxic_pool') {
          if (obs.poolModel) obs.poolModel.scale.y = 1.05 + Math.sin(this.elapsed * 7) * 0.16;
          else if (obs.b1) obs.b1.scale.setScalar(0.85 + Math.sin(this.elapsed * 7) * 0.28);
        } else if (obs.kind === 'abyss_mine') {
          obs.bobPhase = (obs.bobPhase || 0) + dt * 3.8;
          obs.group.position.y = (obs.spawnY ?? 0.22) + Math.sin(obs.bobPhase) * 0.22;
          obs.group.rotation.y += dt * 1.4;
        } else if (obs.kind === 'jellyfish_swarm') {
          obs.bobPhase = (obs.bobPhase || 0) + dt * 4.2;
          obs.group.position.y = (obs.spawnY ?? 1.42) + Math.sin(obs.bobPhase) * 0.18;
        } else if (obs.kind === 'shark_fin') {
          obs.bobPhase = (obs.bobPhase || 0) + dt * 5.2;
          obs.group.position.y = (obs.spawnY ?? -0.05) + Math.sin(obs.bobPhase) * 0.08;
          obs.group.rotation.z = Math.sin(obs.bobPhase * 0.7) * 0.09;
        } else if (obs.kind === 'angler_hazard') {
          obs.bobPhase = (obs.bobPhase || 0) + dt * 4.6;
          obs.group.position.y = (obs.spawnY ?? -2.85) + Math.sin(obs.bobPhase) * 0.2;
          if (obs.lureBulb) {
            const pulse = 0.85 + Math.sin(this.elapsed * 9) * 0.25;
            obs.lureBulb.scale.setScalar(pulse);
          }
        } else if (obs.kind === 'thermal_vent' && obs.plume) {
          obs.plume.scale.y = 0.85 + Math.sin(this.elapsed * 8 + obs.group.position.x) * 0.22;
          obs.plume.rotation.y += dt * 2.5;
        } else if (obs.kind === 'current_ring') {
          if (obs.ring) obs.ring.rotation.z += dt * 3.6;
          if (obs.core) obs.core.rotation.y += dt * 3.2;
        } else if (obs.kind === 'whirlpool_vortex' && obs.spin) {
          obs.spin.rotation.y += dt * 6.5;
        } else if (obs.kind === 'oxygen_bubble' && obs.core) {
          obs.core.position.y = Math.sin(this.elapsed * 5 + obs.group.position.x) * 0.16;
          obs.core.rotation.y += dt * 2.4;
        }

        if (obs.group.position.z > 18) {
          pool.releaseAt(i);
        }
      }
    }
  }

  reset() {
    this.spawnTimer = 1.65;
    this.elapsed = 0;
    this.oasisReliefTimer = 0;
    this.chunkCooldown = 34;
    this.powerupCooldown = 8;
    this.featureCooldown = 7;
    this.collectibleCooldown = 4.5;
    this.tutorialMode = false;
    this.habitatMode = 'land';
    this.isAquaticBiome = false;
    this.magneticStormActive = false;
    for (const key of Object.keys(this.pools)) {
      this.pools[key].releaseAll();
    }
  }
}
