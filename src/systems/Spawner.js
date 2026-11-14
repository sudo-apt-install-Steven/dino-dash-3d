// Spawner completo com ObjectPool e PRNG semeável para obstáculos, inimigos,
// rampas, pedras de wall-jump, ovos, power-ups, fogueiras e atalhos secretos.
import * as THREE from 'three';
import { ObjectPool } from './ObjectPool.js';
import { LANE_X } from '../world/World.js';
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
  buildClaudeBossObstacle
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
  makeBox(parent, w + 0.14, 0.05, 0.07, 0, 0.03, d * 0.5 + 0.04, DANGER_TRIM_MAT);
  makeBox(parent, w + 0.14, 0.05, 0.07, 0, 0.03, -d * 0.5 - 0.04, DANGER_TRIM_MAT);
  makeBox(parent, 0.07, 0.05, d, -w * 0.5 - 0.04, 0.03, 0, DANGER_TRIM_MAT);
  makeBox(parent, 0.07, 0.05, d, w * 0.5 + 0.04, 0.03, 0, DANGER_TRIM_MAT);
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
    this.spawnTimer = 1.1;
    this.difficultyId = 'normal';
    this.elapsed = 0;
    this.biomeId = 'desert';
    this.densityMult = 1.0;
    this.tutorialMode = false;
    this.showObstacleHints = true;
    this.oasisReliefTimer = 0;
    this.chunkCooldown = 14;
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

  _attachHint(group, badgeY, label, accentColor, scaleX = 2.45) {
    const sprite = new THREE.Sprite(this._getHintMaterial(label, accentColor));
    sprite.position.set(0, badgeY, 0);
    sprite.scale.set(scaleX, 0.48, 1);
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
      rescue_cross: new ObjectPool(() => this._makeRescueCross(), resetBase, 2)
    };
  }

  _reg(kind, group, props, hintCfg = null) {
    group.visible = false;
    this.group.add(group);
    let hintSprite = null;
    if (hintCfg) {
      hintSprite = this._attachHint(group, hintCfg.y, hintCfg.label, hintCfg.color, hintCfg.scaleX || 2.45);
    }
    return { kind, pool: null, group, hintSprite, hit: false, nearMissed: false, stomped: false, ...props };
  }

  _makeCactusSmall() {
    const g = new THREE.Group();
    makeBox(g, 0.52, 1.15, 0.52, 0, 0.575, 0, this.cactusMat);
    makeBox(g, 0.24, 0.46, 0.24, -0.38, 0.65, 0, this.cactusDarkMat);
    makeBox(g, 0.24, 0.42, 0.24, 0.38, 0.55, 0, this.cactusDarkMat);
    makeBox(g, 0.28, 0.18, 0.28, 0, 1.24, 0, this.flowerMat);
    addDangerTrim(g, 0.88, 0.62);
    return this._reg('cactus_small', g, { halfW: 0.42, minY: 0, maxY: 1.2, halfD: 0.36, color: '#2f9e36' }, { y: 1.75, label: '⬆ PULAR / [Q]', color: '#4ade80' });
  }

  _makeCactusTall() {
    const g = new THREE.Group();
    makeBox(g, 0.58, 1.75, 0.58, 0, 0.875, 0, this.cactusMat);
    makeBox(g, 0.28, 0.65, 0.28, -0.44, 1.05, 0, this.cactusDarkMat);
    makeBox(g, 0.28, 0.55, 0.28, 0.44, 0.9, 0, this.cactusDarkMat);
    makeBox(g, 0.34, 0.22, 0.34, 0, 1.85, 0, this.flowerMat);
    addDangerTrim(g, 0.98, 0.68);
    return this._reg('cactus_tall', g, { halfW: 0.48, minY: 0, maxY: 1.75, halfD: 0.38, color: '#2f9e36' }, { y: 2.35, label: '⬆ PULO ALTO', color: '#22c55e' });
  }

  _makeCactusCluster() {
    const g = new THREE.Group();
    makeBox(g, 0.46, 1.45, 0.46, -0.48, 0.725, 0, this.cactusMat);
    makeBox(g, 0.52, 1.62, 0.52, 0, 0.81, 0.12, this.cactusDarkMat);
    makeBox(g, 0.42, 1.18, 0.42, 0.5, 0.59, -0.08, this.cactusMat);
    makeBox(g, 0.26, 0.18, 0.26, 0, 1.7, 0.12, this.flowerMat);
    addDangerTrim(g, 1.45, 0.72);
    return this._reg('cactus_cluster', g, { halfW: 0.78, minY: 0, maxY: 1.62, halfD: 0.42, color: '#1f7024' }, { y: 2.2, label: '⬅➡ MUDE FAIXA', color: '#ef4444' });
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
    return this._reg('bird', g, {
      wingL, wingR, flapPhase: 0, baseY: 1.6,
      halfW: 0.65, minY: 1.28, maxY: 1.98, halfD: 0.45,
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
    addDangerTrim(g, 1.85, 0.85);
    return this._reg('rolling_log', g, {
      body, halfW: 0.96, minY: 0, maxY: 0.74, halfD: 0.38,
      extraSpeed: 5.5, color: '#7f4f24'
    }, { y: 1.35, label: '⬆ PULAR / [Q]', color: '#fb923c' });
  }

  _makeTallRock() {
    const g = new THREE.Group();
    const model = buildClaudeBossObstacle('rocha', { withWarn: true });
    model.scale.set(1.45, 1.55, 1.45);
    g.add(model);
    return this._reg('tall_rock', g, {
      halfW: 0.72, minY: 0, maxY: 2.15, halfD: 0.68,
      wallJumpable: true, color: '#6c757d'
    }, { y: 2.65, label: '🧱 PULO DUPLO ⬆', color: '#cbd5e1' });
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
      return this._reg(kind, g, {
        halfW: w * 0.46, minY: 0, maxY: 0.4, halfD: d * 0.46,
        isFloorHazard: true, color: '#7dd3fc'
      }, { y: 1.15, label: '❄️ GELO FRÁGIL', color: '#7dd3fc' });
    }
    // Poça de lava com borda de pedra basáltica multi-peças
    makeBox(g, w + 0.28, 0.08, d + 0.28, 0, 0.04, 0, this.rockMat);
    makeBox(g, w, h, d, 0, h * 0.5 + 0.04, 0, mat);
    makeBox(g, 0.38, 0.18, 0.38, -w * 0.46, 0.1, -d * 0.38, this.rockMat);
    makeBox(g, 0.34, 0.16, 0.36, w * 0.46, 0.09, d * 0.36, this.rockMat);
    makeBox(g, 0.42, 0.08, 0.42, 0.1, h + 0.05, 0, this.fireMat);
    return this._reg(kind, g, {
      halfW: w * 0.46, minY: 0, maxY: 0.4, halfD: d * 0.46,
      isFloorHazard: true, color: '#ff5e00'
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
    const model = buildClaudeBossObstacle('poca', { withWarn: true });
    model.scale.set(1.05, 1.1, 1.1);
    g.add(model);
    return this._reg('toxic_pool', g, {
      poolModel: model, halfW: 0.86, minY: 0, maxY: 0.42, halfD: 0.95, color: '#a3e635'
    }, { y: 1.15, label: '☠️ POÇA TÓXICA', color: '#bef264' });
  }

  _makeAlienTrap() {
    const g = new THREE.Group();
    makeBox(g, 0.8, 0.35, 0.8, 0, 0.2, 0, this.alienMat);
    makeBox(g, 0.2, 0.9, 0.2, 0, 0.65, 0, this.alienMat);
    makeBox(g, 0.5, 0.18, 0.5, 0, 1.1, 0, this.beakMat);
    addDangerTrim(g, 0.95, 0.95);
    return this._reg('alien_trap', g, {
      halfW: 0.45, minY: 0, maxY: 1.15, halfD: 0.45, color: '#b5179e'
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
    const model = buildClaudeBossObstacle('gelo', { withWarn: true });
    model.scale.set(1.05, 1.0, 1.05);
    g.add(model);
    return this._reg('falling_stalactite', g, { halfW: 0.62, minY: 0, maxY: 1.85, halfD: 0.62, breakable: true, color: '#38bdf8' }, { y: 2.2, label: '❄️ ESTALACTITE [Q]', color: '#38bdf8' });
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
  }

  getActiveObstacles() {
    const out = [];
    for (const key of Object.keys(this.pools)) {
      const active = this.pools[key].active;
      for (let i = 0; i < active.length; i++) out.push(active[i]);
    }
    return out;
  }

  _acquire(kind, x, y, z) {
    const pool = this.pools[kind];
    if (!pool) return null;
    const item = pool.acquire();
    item.pool = pool;
    item.breakable = kind === 'cactus_small' || kind === 'scorpion' || kind === 'rolling_log' || kind === 'cactus_shooter' || kind === 'cactus_spine' || kind === 'amber_crystal' || kind === 'falling_stalactite' || kind === 'spike_barricade';
    item.group.position.set(x, y, z);
    item.group.visible = true;
    const seen = Save.data.seenElements || [];
    const alwaysHelpful = ['bifurcation', 'shortcut', 'speed_pad', 'trampoline'].includes(kind);
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
      item.minY = isHigh ? 1.28 : 0.38;
      item.maxY = isHigh ? 1.98 : 1.08;
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

  spawnEggArc(laneIdx, count = 3, tierOrBool = false, startZ = -125) {
    const x = LANE_X[laneIdx];
    for (let i = 0; i < count; i++) {
      const egg = this._acquire('egg', x, Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 1.1, startZ - i * 2.2);
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
      const egg = this._acquire('egg', LANE_X[laneIdx], 0.2 + this.rng() * 1.5, -55 - i * 3.4);
      if (egg) {
        const r = this.rng();
        const tier = r < 0.05 ? 25 : (r < 0.28 ? 5 : 1);
        this._applyEggTier(egg, tier);
      }
    }
  }

  spawnCampfire() {
    this._acquire('campfire', LANE_X[1], 0, -125);
  }

  spawnShortcutPortal(destType = null) {
    const laneIdx = this.rng() < 0.5 ? 0 : 2;
    const portal = this._acquire('shortcut', LANE_X[laneIdx], 0, -125);
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
      this._acquire('fruit', LANE_X[laneIdx], 0.15, -45 - i * 4.2);
    }
  }

  _spawnOne(speed, score) {
    const spawnZ = -125;
    const laneIdx = Math.floor(this.rng() * 3);
    const x = LANE_X[laneIdx];
    const r = this.rng();

    // Ovos & Power-ups aparecem em ritmo balanceado em faixas livres
    if (this.rng() < 0.32) {
      const eggLane = (laneIdx + 1) % 3;
      this.spawnEggArc(eggLane, 2 + Math.floor(this.rng() * 3), null, spawnZ - 2);
    }

    // Frutas, Ovos Elementais, Tesouros e Zonas Interativas
    const bonusRoll = this.rng();
    const bonusLane = (laneIdx + 1) % 3;
    if (bonusRoll < 0.14) {
      this._acquire('fruit', LANE_X[bonusLane], 0.1, spawnZ - 5);
    } else if (bonusRoll < 0.21 && score > 60) {
      const ee = this._acquire('elemental_egg', LANE_X[bonusLane], 0.1, spawnZ - 5);
      if (ee) {
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
      }
    } else if (bonusRoll < 0.25 && score > 120) {
      this._acquire('treasure', LANE_X[bonusLane], 0, spawnZ - 5);
    } else if (bonusRoll < 0.285 && score > 140) {
      this._acquire('grapple_point', x, 0, spawnZ - 3);
    } else if (bonusRoll < 0.315 && score > 180) {
      const gz = this._acquire('gravity_zone', LANE_X[bonusLane], 0, spawnZ - 6);
      if (gz) {
        gz.gravMode = this.rng() < 0.5 ? 'low' : 'heavy';
        this._setHint(gz, gz.gravMode === 'low' ? '🪐 GRAVIDADE BAIXA' : '🪨 GRAVIDADE PESADA', gz.gravMode === 'low' ? '#818cf8' : '#a78bfa');
      }
    } else if (bonusRoll < 0.34 && score > 220) {
      this._acquire('minecart_zone', LANE_X[bonusLane], 0, spawnZ - 5);
    } else if (bonusRoll < 0.365 && score > 150) {
      this._acquire('river_log', LANE_X[2], 0, spawnZ - 5);
    } else if (bonusRoll < 0.385 && score > 260) {
      this._acquire('bifurcation', 0, 0, spawnZ - 8);
    } else if (bonusRoll < 0.425 && score > 40) {
      this._acquire('speed_pad', LANE_X[bonusLane], 0, spawnZ - 4);
    } else if (bonusRoll < 0.455 && score > 75) {
      this._acquire('trampoline', LANE_X[bonusLane], 0, spawnZ - 4);
    }

    if (this.biomeId === 'dark_swamp' && r < 0.22) {
      this._acquire(this.rng() < 0.62 ? 'mud_pool' : 'toxic_pool', x, 0, spawnZ);
      return;
    }
    if (this.biomeId === 'jurassic_forest' && r < 0.16) {
      this._acquire('mud_pool', x, 0, spawnZ);
      return;
    }

    if (this.rng() < 0.085 && score > 30) {
      const pLane = (laneIdx + 2) % 3;
      const p = this._acquire('powerup', LANE_X[pLane], 0, spawnZ - 4);
      if (p) {
        const isBackpack = this.rng() < 0.3;
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
      }
    }

    // Obstáculos específicos do bioma + clássicos
    if (this.biomeId === 'volcano' && r < 0.28) {
      this._acquire(this.rng() < 0.55 ? 'lava_pool' : 'geyser_vent', x, 0, spawnZ);
      return;
    }
    if (this.biomeId === 'ice_age' && r < 0.28) {
      this._acquire(this.rng() < 0.65 ? 'thin_ice' : 'falling_stalactite', x, 0, spawnZ);
      return;
    }
    if ((this.biomeId === 'crystal_cavern' || this.biomeId === 'snowy_mountain') && r < 0.28) {
      this._acquire(this.rng() < 0.62 ? 'falling_stalactite' : 'amber_crystal', x, 0, spawnZ);
      return;
    }
    if ((this.biomeId === 'fossil_graveyard' || this.biomeId === 'ruined_city') && r < 0.28) {
      this._acquire(this.rng() < 0.52 ? 'tar_pit' : (this.rng() < 0.5 ? 'amber_crystal' : 'spike_barricade'), x, 0, spawnZ);
      return;
    }
    if ((this.biomeId === 'alien_planet' || this.biomeId === 'alien_factory' || this.biomeId === 'storm_desert') && r < 0.3) {
      this._acquire(this.rng() < 0.55 ? 'alien_trap' : 'electric_pylon', x, 0, spawnZ);
      return;
    }

    if (score > 25 && r < 0.22) {
      const bird = this._acquire('bird', x, 1.62, spawnZ);
      if (bird) {
        const isHigh = this.rng() < 0.56;
        bird.baseY = isHigh ? 1.62 : 0.72;
        bird.minY = isHigh ? 1.28 : 0.38;
        bird.maxY = isHigh ? 1.98 : 1.08;
        bird.flapPhase = this.rng() * Math.PI * 2;
        bird.group.position.y = bird.baseY;
        this._setHint(bird, isHigh ? '⬇ ABAIXAR / PISAR' : '⬆ PULAR / PISAR', isHigh ? '#38bdf8' : '#fbbf24');
      }
      return;
    }

    if (score > 45 && r < 0.34) {
      this._acquire(this.rng() < 0.72 ? 'scorpion' : 'spike_barricade', x, 0, spawnZ);
      return;
    }

    if (score > 55 && r < 0.4) {
      this._acquire(this.rng() < 0.55 ? 'amber_crystal' : 'tar_pit', x, 0, spawnZ);
      return;
    }

    if (score > 80 && r < 0.45 && r >= 0.4) {
      this._acquire(this.rng() < 0.65 ? 'cactus_shooter' : 'electric_pylon', x, 0, spawnZ);
      return;
    }

    if (score > 70 && r < 0.52) {
      this._acquire(this.rng() < 0.68 ? 'rolling_log' : 'geyser_vent', x, 0, spawnZ);
      return;
    }

    if (score > 90 && r < 0.58) {
      this._acquire('ramp', x, 0, spawnZ);
      return;
    }

    if (score > 110 && r < 0.65) {
      this._acquire(this.rng() < 0.68 ? 'tall_rock' : 'falling_stalactite', x, 0, spawnZ);
      return;
    }

    if (r < 0.78) {
      this._acquire('cactus_small', x, 0, spawnZ);
    } else if (r < 0.91) {
      this._acquire('cactus_tall', x, 0, spawnZ);
    } else {
      this._acquire('cactus_cluster', x, 0, spawnZ);
    }

    if (score > 90 && !(this.difficultyId === 'easy' && score < 400) && this.rng() < 0.42) {
      const otherLanes = [0, 1, 2].filter((idx) => idx !== laneIdx);
      const secondLane = otherLanes[Math.floor(this.rng() * otherLanes.length)];
      this._acquire('cactus_small', LANE_X[secondLane], 0, spawnZ - 1.5);
    }
  }

  update(dt, speed, score, players = []) {
    this.elapsed += dt;
    if (this.oasisReliefTimer > 0) {
      this.oasisReliefTimer = Math.max(0, this.oasisReliefTimer - dt);
    }
    if (!this.tutorialMode) {
      this.chunkCooldown -= dt;
      if (score > 90 && this.chunkCooldown <= 0) {
        const chunkKinds = ['oasis_zone', 'fragile_bridge', 'rescue_cross'];
        const ck = chunkKinds[Math.floor(this.rng() * chunkKinds.length)];
        this._acquire(ck, 0, 0, -96);
        this.spawnTimer = Math.max(this.spawnTimer, 1.45);
        this.chunkCooldown = 18 + this.rng() * 8;
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this._spawnOne(speed, score);
        const easyRelief = (this.difficultyId === 'easy' && score < 500) ? 1.38 : 1.0;
        const oasisSlow = this.oasisReliefTimer > 0 ? 1.65 : 1.0;
        const minGap = Math.max(0.42, (1.06 - (speed - 18) * 0.02) / this.densityMult) * easyRelief * oasisSlow;
        const maxGap = (minGap + (0.52 / this.densityMult) * easyRelief * oasisSlow);
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
          obs.group.position.y = obs.baseY + Math.sin(obs.flapPhase * 0.5) * 0.08;
        } else if (obs.kind === 'rolling_log') {
          obs.body.rotation.x += dt * 9;
        } else if (obs.kind === 'egg') {
          obs.group.rotation.y += dt * 3;
          // Ímã de ovos
          for (const p of players) {
            if (p.dead) continue;
            const magnetRange = (p.magnetTimer > 0 ? 11.5 : 0) + (p.permanentMagnet || 0) + (p.id === 'ghostgold' ? 5 : 0);
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
          obs.group.position.y = Math.abs(Math.sin(obs.walkPhase)) * 0.06;
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
        }

        if (obs.group.position.z > 18) {
          pool.releaseAt(i);
        }
      }
    }
  }

  reset() {
    this.spawnTimer = 0.85;
    this.elapsed = 0;
    this.oasisReliefTimer = 0;
    this.chunkCooldown = 14;
    this.tutorialMode = false;
    for (const key of Object.keys(this.pools)) {
      this.pools[key].releaseAll();
    }
  }
}
