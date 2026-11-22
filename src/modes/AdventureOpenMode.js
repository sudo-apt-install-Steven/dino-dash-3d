// Aventura Aberta 3D (`adventure_open`) — Exploração de Mundo Aberto rica e ultra-leve (60 FPS).
// Streaming dinâmico de chunks (3x3 em low-spec, 5x5 em normal) com geometrias/materiais compartilhados
// e descarte automático de chunks distantes.
// Inclui:
// 1. Câmera controlável ([C] ciclo de presets com fallback seguro, botões 🔍-/🔍+ e dica de órbita)
//    + Radar/Minimapa de Mundo Aberto (Seta do Jogador, NPCs 🧙, Bosses Regionais 👑, Frutas 🍎,
//    Altar ✨, Fogueiras 🔥, Portal de Masmorra 🏰 e Eventos Dinâmicos ☄️/🐣).
// 2. 4 NPCs 3D Voxel elaborados com diálogos e missões via [E] / toque:
//    - Guia da Savana (perto do spawn — missão principal, dicas de controles/frutas/bosses)
//    - Cozinheiro Pré-Histórico (no acampamento — troca frutas por buffs permanentes +MaxHP/+Atk/+Speed e refeições)
//    - Caçador de Bosses (rastreia os 3 Bosses Regionais e recompensa ovos + relíquias por boss derrotado)
//    - Guardião do Portal (guarda o Portal de Masmorra 🏰; permite entrar direto em `dungeon_rpg` ou pegar saque)
// 3. Sistema de Frutas, Alimentos Voxel e Energia (⚡):
//    - 🍎 Maçã Jurássica (+25 HP & +15 Energia)
//    - 🍍 Fruta Dourada (+45 Estamina + 5s Turbo!)
//    - 🍖 Carne Fóssil (+20% Ataque por 20s & +20 HP)
//    - 🫐 Baga Cristalina (+1 Escudo absorvente + 10 Ovos)
// 4. 3 Bosses Regionais (Guardião do Altar, Titã de Obsidiana, Colosso Glacial) com barra de HP no topo,
//    ataques de onda de choque telegrafados (anel vermelho de perigo no chão!) e recompensas épicas,
//    além de Fogueiras curativas, Aventuras Dinâmicas (Meteoro do Tesouro ☄️ e Filhote Perdido 🐣)
//    e Portais de Bioma.

import * as THREE from 'three';
import {
  Mode3DBase,
  DinoAvatar,
  PlayerControls,
  P1_BINDINGS,
  buildModeLights,
  makeGlowOrb,
  makeDangerRing,
  makeRng,
  resolveDinoId,
  disposeObject3D,
   yawFromDir,
  clamp,
  escapeHtml
} from './WorldExplorer3D.js';
import { buildDungeonEnemyModel } from '../models/DungeonProps.js';
import {
  buildSculptedBiomeTree,
  buildSculptedRockFormation,
  buildSculptedAncientAltar,
  buildSculptedDungeonPortal,
  buildSculptedInteractable,
  buildSculptedFoodModel,
  buildSculptedCrystalSpire
} from '../models/SculptedWorldProps.js';
import { uiIcon } from '../ui/UiIcons.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { Save } from '../systems/Save.js';

const CHUNK_SIZE = 28;
const RADAR_RANGE = 58; // metros mapeados no raio do radar

export const OPEN_BIOMES = [
  { id: 'emerald_valley', name: 'Vale Esmeralda', sky: '#0f221b', fog: '#142e25', ground: '#2d5a3c', accent: '#10b981', rock: '#4b5563' },
  { id: 'amber_dunes', name: 'Dunas de Âmbar', sky: '#24180d', fog: '#332211', ground: '#8c5d30', accent: '#f59e0b', rock: '#78350f' },
  { id: 'frost_basin', name: 'Bacia Glacial', sky: '#0d1b2a', fog: '#162c44', ground: '#5e84a3', accent: '#38bdf8', rock: '#334155' },
  { id: 'obsidian_ridge', name: 'Serra Obsidiana', sky: '#1a0e12', fog: '#2a1319', ground: '#3b2528', accent: '#ef4444', rock: '#1f2937' }
];

export const CAMERA_PRESETS = [
  { id: 'explorer', name: 'Explorador', distance: 11, pitch: 0.48, height: 1.5, autoFollow: false },
  { id: 'panoramic', name: 'Panorâmica', distance: 16, pitch: 0.72, height: 1.8, autoFollow: false },
  { id: 'chase', name: 'Perseguição', distance: 7.8, pitch: 0.34, height: 1.35, autoFollow: true },
  { id: 'eagle', name: 'Visão de Águia', distance: 19.5, pitch: 1.05, height: 1.7, autoFollow: false }
];

export const FOOD_CATALOG = {
  apple: {
    id: 'apple',
    name: 'Maçã Jurássica',
    icon: '🍎',
    color: '#ef4444',
    desc: '+25 HP & +15 Energia',
    popup: '🍎 Maçã Jurássica! +25 HP · +15 ⚡',
    cls: 'is-emerald'
  },
  golden_fruit: {
    id: 'golden_fruit',
    name: 'Fruta Dourada',
    icon: '🍍',
    color: '#f59e0b',
    desc: '+45 Estamina + 5s Turbo!',
    popup: '🍍 Fruta Dourada! +45 Estamina · 5s TURBO!',
    cls: 'is-amber'
  },
  fossil_meat: {
    id: 'fossil_meat',
    name: 'Carne Fóssil',
    icon: '🍖',
    color: '#f97316',
    desc: '+20% Ataque por 20s & +20 HP',
    popup: '🍖 Carne Fóssil! +20% ATQ (20s) · +20 HP',
    cls: 'is-crit'
  },
  crystal_berry: {
    id: 'crystal_berry',
    name: 'Baga Cristalina',
    icon: '🫐',
    color: '#38bdf8',
    desc: '+1 Escudo absorvente + 10 Ovos',
    popup: '🫐 Baga Cristalina! +1 🛡️ Escudo · +10 🥚',
    cls: 'is-cyan'
  }
};

const FOOD_KEYS = ['apple', 'golden_fruit', 'fossil_meat', 'crystal_berry'];

export const REGIONAL_BOSS_SPECS = [
  {
    id: 'boss_altar',
    name: 'Guardião do Altar',
    title: 'Sentinela Ancestral das Ruínas',
    archetype: 'rune_golem',
    theme: 'aztec_ruins',
    x: 22,
    z: -32,
    scale: 1.72,
    maxHp: 220,
    atk: 20,
    shockDmg: 28,
    shockRadius: 4.5,
    color: '#10b981',
    eggReward: 110,
    relicName: 'Totem Esmeralda (+25 MaxHP)'
  },
  {
    id: 'boss_obsidian',
    name: 'Titã de Obsidiana',
    title: 'Colosso da Cratera Vulcânica',
    archetype: 'fossil_knight',
    theme: 'volcano_temple',
    x: 42,
    z: 18,
    scale: 1.85,
    maxHp: 280,
    atk: 24,
    shockDmg: 34,
    shockRadius: 5.0,
    color: '#ef4444',
    eggReward: 140,
    relicName: 'Núcleo de Magma (+6 Ataque)'
  },
  {
    id: 'boss_glacial',
    name: 'Colosso Glacial',
    title: 'Monarca da Tempestade Eterna',
    archetype: 'cyber_sentinel',
    theme: 'ice_cavern',
    x: -36,
    z: -38,
    scale: 1.78,
    maxHp: 250,
    atk: 22,
    shockDmg: 30,
    shockRadius: 4.7,
    color: '#38bdf8',
    eggReward: 125,
    relicName: 'Brasão Glacial (+12% Velocidade)'
  }
];

export const NPC_SPECS = [
  {
    id: 'guia_savana',
    name: 'Guia da Savana',
    role: 'Mestre Explorador',
    icon: '🧙',
    x: 5.5,
    z: 1.5,
    bodyColor: '#10b981',
    hatColor: '#d97706',
    accentColor: '#34d399'
  },
  {
    id: 'cozinheiro',
    name: 'Cozinheiro Pré-Histórico',
    role: 'Mestre Cuca da Fogueira',
    icon: '🧙',
    badge: '👨‍🍳',
    x: -13.5,
    z: -9.5,
    bodyColor: '#f97316',
    hatColor: '#f8fafc',
    accentColor: '#fbbf24'
  },
  {
    id: 'cacador_bosses',
    name: 'Caçador de Bosses',
    role: 'Rastreador de Titãs',
    icon: '🧙',
    badge: '🏹',
    x: 15.5,
    z: 11.5,
    bodyColor: '#ef4444',
    hatColor: '#7f1d1d',
    accentColor: '#fca5a5'
  },
  {
    id: 'guardiao_portal',
    name: 'Guardião do Portal',
    role: 'Sentinela da Masmorra 🏰',
    icon: '🧙',
    badge: '🔮',
    x: -21.5,
    z: 19.5,
    bodyColor: '#8b5cf6',
    hatColor: '#312e81',
    accentColor: '#38bdf8'
  }
];

const OPEN_WORLD_TOUCH = [
  { action: 'light', label: 'Q', title: 'Mordida / Ataque' },
  { action: 'interact', label: 'E', title: 'Interagir (NPC / Altar / Portal)' },
  { action: 'jump', label: '⤒', title: 'Pular' },
  { action: 'dodge', label: '⇆', title: 'Investida / Esquiva' },
  { action: 'special', label: 'F', title: 'Rugido de Energia (35⚡)' }
];

export class AdventureOpenMode extends Mode3DBase {
  constructor(game, opts = {}) {
    super(game, { ...opts, modeId: 'adventure_open' });
    this.biomeIdx = Math.max(0, OPEN_BIOMES.findIndex((b) => b.id === opts.biomeId));
    this.biome = OPEN_BIOMES[this.biomeIdx];
    this.seed = opts.seed || `adv-${Date.now()}`;
    this.viewRadius = this.lowSpec ? 1 : 2; // 3x3 em low-spec, 5x5 em normal

    this.chunks = new Map(); // "cx,cz" -> { group, pillars, pickups, patrols, campfires }
    this.collectedIds = new Set();
    this.player = null;
    this.altar = null;
    this.dungeonPortal = null;
    this.mainCampfire = null;
    this.npcs = [];
    this.bosses = [];
    this.guardian = null; // compat alias para o boss do altar

    // Progresso de exploração, frutas e energia
    this.relicsFound = 0;
    this.relicsTarget = 3;
    this.altarActivated = false;
    this.guardianDefeated = false;
    this.eggsFound = 0;
    this.energy = 30;
    this.maxEnergy = 120;
    this.fruitsCollected = 0; // total acumulado na run
    this.fruitWallet = 0; // frutas disponíveis para trocar no Cozinheiro
    this.foodCounts = { apple: 0, golden_fruit: 0, fossil_meat: 0, crystal_berry: 0 };

    // Buffs e missões
    this.turboTimer = 0;
    this.atkBuffTimer = 0;
    this.cookBuffs = { hp: 0, atk: 0, speed: 0 };
    this.guidePackClaimed = false;
    this.guideQuestClaimed = false;
    this.portalLootClaimed = false;
    this.claimedBossBounties = new Set();
    this.activeDialogNpc = null;
    this.nearestInteractable = null;

    // Câmera
    this.camPresetIdx = 0;

    // Aventuras Dinâmicas (Meteoro do Tesouro / Filhote Perdido)
    this.dynamicEvent = null;
    this._nextEventTimer = 4.5;
    this._rescuedHatchling = null;

    // Recursos GPU compartilhados (geometrias e materiais marcados com userData.shared = true)
    this._shared = null;

    this._hud = {};
    this._radarBlips = [];
    this._lastChunkKey = '';
    this._tmpW = { x: 0, z: 0 };
    this._campfireHealToastCd = 0;
  }

  async mount() {
    this.mountBase({
      background: this.biome.sky,
      fog: { color: this.biome.fog, near: 24, far: this.lowSpec ? 58 : 90 },
      clearColor: this.biome.sky,
      touchActions: OPEN_WORLD_TOUCH,
      cameraOpts: { distance: 11, pitch: 0.48, height: 1.5, autoFollow: false, minDistance: 5.5, maxDistance: 22 }
    });

    // Adiciona método cyclePreset na instância do rig caso não exista no OrbitCameraRig base
    if (this.rig && typeof this.rig.cyclePreset !== 'function') {
      this.rig.cyclePreset = () => this._applyCameraPreset((this.camPresetIdx + 1) % CAMERA_PRESETS.length);
    }

    this._initSharedAssets();

    this.group.add(buildModeLights({
      sky: '#e0f2fe', ground: this.biome.ground, sun: '#fff4d6', intensity: 1.08,
      shadows: !this.lowSpec && !!Save?.data?.settings?.shadows
    }));

    this._spawnPlayer();
    this._spawnBiomeAltar();
    this._spawnMainCampfire();
    this._spawnDungeonPortal();
    this._spawnOpenWorldNPCs();
    this._spawnRegionalBosses();
    this._buildHud();
    this._streamChunks(true);
    this._spawnDynamicAdventure('meteor');

    this.rig.snap(this.player.mover.pos);
    this.banner(
      this.biome.name,
      'Explore Chunks · Colete Frutas 🍎 · Fale com NPCs [E] · Vença os 3 Bosses 👑',
      'is-emerald',
      2300
    );
    this.onResize(this.viewportW, this.viewportH);
  }

  // ---------------------------------------------------------------------------
  // Pool de Geometrias e Materiais Compartilhados (60 FPS, baixo consumo de RAM/VRAM)
  // ---------------------------------------------------------------------------
  _initSharedAssets() {
    const mark = (g) => { g.userData = { ...g.userData, shared: true }; return g; };
    const geos = {
      tile: mark(new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE)),
      box: mark(new THREE.BoxGeometry(1, 1, 1)),
      ring: mark(new THREE.RingGeometry(0.75, 1.0, 24)),
      disc: mark(new THREE.CircleGeometry(1, 24))
    };
    const mats = new Map();
    const getMat = (color, opts = {}) => {
      const key = `${color}|${opts.roughness ?? 0.75}|${opts.metalness ?? 0.08}|${opts.emissive || ''}|${opts.emissiveIntensity ?? 0}|${opts.opacity ?? 1}|${opts.basic ? 'B' : 'S'}`;
      if (mats.has(key)) return mats.get(key);
      let m;
      if (opts.basic) {
        m = new THREE.MeshBasicMaterial({
          color,
          transparent: (opts.opacity ?? 1) < 1,
          opacity: opts.opacity ?? 1,
          side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
          depthWrite: opts.depthWrite ?? true
        });
      } else {
        m = new THREE.MeshStandardMaterial({
          color,
          roughness: opts.roughness ?? 0.75,
          metalness: opts.metalness ?? 0.08,
          emissive: opts.emissive || '#000000',
          emissiveIntensity: opts.emissiveIntensity ?? 0,
          transparent: (opts.opacity ?? 1) < 1,
          opacity: opts.opacity ?? 1
        });
      }
      m.userData = { shared: true };
      mats.set(key, m);
      return m;
    };
    this._shared = { geos, mats, getMat };
  }

  _disposeSharedAssets() {
    if (!this._shared) return;
    for (const g of Object.values(this._shared.geos)) g.dispose?.();
    for (const m of this._shared.mats.values()) m.dispose?.();
    this._shared.mats.clear();
    this._shared = null;
  }

  // ---------------------------------------------------------------------------
  // Jogador
  // ---------------------------------------------------------------------------
  _spawnPlayer() {
    const dinoId = resolveDinoId(this.game, this.opts, 0);
    const spec = getDinoSpec(dinoId);
    const baseSpeed = 8.4 + (spec?.stats?.speed || 5) * 0.26;
    const avatar = new DinoAvatar(dinoId, {
      mover: { x: 0, z: 5, yaw: 0, radius: 0.72, speed: baseSpeed, dashSpeed: 21.5, dashCooldown: 0.52 },
      tint: '#10b981'
    });
    this.group.add(avatar.root);
    const maxHp = 110 + (spec?.stats?.hp || 4) * 15;
    this.player = {
      dinoId,
      name: spec?.name || dinoId,
      avatar,
      mover: avatar.mover,
      controls: new PlayerControls(this.keys, P1_BINDINGS, this.touch),
      baseSpeed,
      maxHp,
      hp: maxHp,
      stamina: 100,
      baseAtk: 18 + (spec?.stats?.attack || 5) * 2.2,
      atk: 18 + (spec?.stats?.attack || 5) * 2.2,
      atkCd: 0,
      shields: 1 // Começa com 1 escudo cristalino de boas-vindas
    };
  }

  // ---------------------------------------------------------------------------
  // Altar do Bioma, Acampamento com Fogueira e Portal de Masmorra 🏰
  // ---------------------------------------------------------------------------
  _spawnBiomeAltar() {
    if (this.altar?.group) disposeObject3D(this.altar.group);
    const ax = 22;
    const az = -26;
    const g = buildSculptedAncientAltar(this.biome.accent, this.biome.rock);
    g.position.set(ax, 0, az);
    this.group.add(g);
    this.altar = { group: g, crystal: g.userData.crystal, runeRing: g.userData.runeRing, x: ax, z: az };
  }

  _buildCampfireMesh() {
    const { geos, getMat } = this._shared;
    const g = new THREE.Group();

    // Anel de zona segura curativa
    const safeRing = new THREE.Mesh(
      geos.ring,
      getMat('#f59e0b', { basic: true, opacity: 0.45, doubleSide: true, depthWrite: false })
    );
    safeRing.rotation.x = -Math.PI / 2;
    safeRing.scale.setScalar(4.0);
    safeRing.position.y = 0.04;
    g.add(safeRing);

    // Pedras voxel em círculo
    const stoneMat = getMat('#52525b', { roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(geos.box, stoneMat);
      st.scale.set(0.36, 0.24, 0.34);
      st.position.set(Math.cos(a) * 1.05, 0.12, Math.sin(a) * 1.05);
      st.rotation.y = a;
      g.add(st);
    }

    // Troncos cruzados
    const logMat = getMat('#78350f', { roughness: 0.88 });
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(geos.box, logMat);
      log.scale.set(1.5, 0.24, 0.26);
      log.position.y = 0.18;
      log.rotation.y = (i / 3) * Math.PI;
      g.add(log);
    }

    // Chamas voxel esculpidas
    const flameOuter = new THREE.Mesh(
      geos.box,
      getMat('#f97316', { emissive: '#ea580c', emissiveIntensity: 1.6, roughness: 0.2 })
    );
    flameOuter.scale.set(0.52, 0.92, 0.52);
    flameOuter.position.y = 0.68;
    flameOuter.rotation.y = Math.PI / 4;

    const flameCore = new THREE.Mesh(
      geos.box,
      getMat('#fde047', { emissive: '#facc15', emissiveIntensity: 2.0, roughness: 0.1 })
    );
    flameCore.scale.set(0.3, 0.62, 0.3);
    flameCore.position.y = 0.62;
    flameCore.rotation.y = Math.PI / 8;

    g.add(flameOuter, flameCore);
    g.userData.flameOuter = flameOuter;
    g.userData.flameCore = flameCore;
    return g;
  }

  _spawnMainCampfire() {
    if (this.mainCampfire?.group) disposeObject3D(this.mainCampfire.group);
    const fx = -11.5;
    const fz = -9.5;
    const mesh = this._buildCampfireMesh();
    mesh.position.set(fx, 0, fz);

    // Caldeirão voxel do Cozinheiro ao lado da fogueira
    const { geos, getMat } = this._shared;
    const potMat = getMat('#27272a', { roughness: 0.4, metalness: 0.6 });
    const pot = new THREE.Mesh(geos.box, potMat);
    pot.scale.set(0.92, 0.65, 0.92);
    pot.position.set(-1.35, 0.36, -0.9);
    const potRim = new THREE.Mesh(geos.box, potMat);
    potRim.scale.set(1.04, 0.12, 1.04);
    potRim.position.set(-1.35, 0.72, -0.9);
    const soup = new THREE.Mesh(
      geos.box,
      getMat('#10b981', { emissive: '#059669', emissiveIntensity: 1.1, roughness: 0.2 })
    );
    soup.scale.set(0.8, 0.08, 0.8);
    soup.position.set(-1.35, 0.76, -0.9);
    mesh.add(pot, potRim, soup);

    this.group.add(mesh);
    this.mainCampfire = { group: mesh, x: fx, z: fz, radius: 4.2 };
  }

  _spawnDungeonPortal() {
    if (this.dungeonPortal?.group) disposeObject3D(this.dungeonPortal.group);
    const px = -24.5;
    const pz = 22.5;
    const g = buildSculptedDungeonPortal('#38bdf8');
    g.position.set(px, 0, pz);
    this.group.add(g);
    this.dungeonPortal = {
      group: g,
      ring: g.userData.ring,
      vortex: g.userData.vortex,
      crownGem: g.userData.crownGem,
      x: px,
      z: pz,
      radius: 3.4
    };
  }

  // ---------------------------------------------------------------------------
  // 4 NPCs 3D Voxel Elaborados
  // ---------------------------------------------------------------------------
  _buildNpcVoxelModel(spec) {
    const { geos, getMat } = this._shared;
    const root = new THREE.Group();

    // Anel indicador no chão
    const ring = new THREE.Mesh(
      geos.ring,
      getMat(spec.accentColor, { basic: true, opacity: 0.78, doubleSide: true, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(1.15);
    ring.position.y = 0.04;
    root.add(ring);

    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const bodyMat = getMat(spec.bodyColor, { roughness: 0.65 });
    const skinMat = getMat('#eab308', { roughness: 0.7 });
    const darkMat = getMat('#18181b', { roughness: 0.4 });
    const hatMat = getMat(spec.hatColor, { roughness: 0.6 });
    const glowMat = getMat(spec.accentColor, { emissive: spec.accentColor, emissiveIntensity: 1.5, roughness: 0.25 });

    // Pernas
    const legL = new THREE.Mesh(geos.box, darkMat);
    legL.scale.set(0.28, 0.55, 0.28);
    legL.position.set(-0.22, 0.28, 0);
    const legR = new THREE.Mesh(geos.box, darkMat);
    legR.scale.set(0.28, 0.55, 0.28);
    legR.position.set(0.22, 0.28, 0);

    // Torso e capa/avental
    const torso = new THREE.Mesh(geos.box, bodyMat);
    torso.scale.set(0.82, 0.92, 0.56);
    torso.position.set(0, 0.98, 0);

    // Cabeça dino/explorador estilizada com focinho e olhos
    const head = new THREE.Mesh(geos.box, skinMat);
    head.scale.set(0.68, 0.62, 0.68);
    head.position.set(0, 1.72, 0);

    const snout = new THREE.Mesh(geos.box, skinMat);
    snout.scale.set(0.46, 0.32, 0.38);
    snout.position.set(0, 1.62, -0.44);

    const eyeL = new THREE.Mesh(geos.box, darkMat);
    eyeL.scale.set(0.1, 0.1, 0.1);
    eyeL.position.set(-0.2, 1.78, -0.36);
    const eyeR = new THREE.Mesh(geos.box, darkMat);
    eyeR.scale.set(0.1, 0.1, 0.1);
    eyeR.position.set(0.2, 1.78, -0.36);

    bodyGroup.add(legL, legR, torso, head, snout, eyeL, eyeR);

    // Detalhes exclusivos de cada NPC (100% voxel esculpido)
    if (spec.id === 'guia_savana') {
      // Chapéu de explorador + cajado com cristal flutuante + mochila
      const brim = new THREE.Mesh(geos.box, hatMat);
      brim.scale.set(1.12, 0.08, 1.12);
      brim.position.set(0, 2.06, 0);
      const crown = new THREE.Mesh(geos.box, hatMat);
      crown.scale.set(0.56, 0.3, 0.56);
      crown.position.set(0, 2.24, 0);
      const pack = new THREE.Mesh(geos.box, hatMat);
      pack.scale.set(0.58, 0.62, 0.32);
      pack.position.set(0, 1.02, 0.42);
      const staff = new THREE.Mesh(geos.box, getMat('#78350f'));
      staff.scale.set(0.12, 2.1, 0.12);
      staff.position.set(0.6, 1.05, -0.2);
      const staffGem = buildSculptedCrystalSpire(spec.accentColor, 0.22);
      staffGem.position.set(0.6, 2.1, -0.2);
      bodyGroup.add(brim, crown, pack, staff, staffGem);
    } else if (spec.id === 'cozinheiro') {
      // Toque blanche (chapéu de chef alto) + avental branco + concha
      const apron = new THREE.Mesh(geos.box, hatMat);
      apron.scale.set(0.74, 0.78, 0.1);
      apron.position.set(0, 0.92, -0.31);
      const chefBase = new THREE.Mesh(geos.box, hatMat);
      chefBase.scale.set(0.58, 0.46, 0.58);
      chefBase.position.set(0, 2.26, 0);
      const chefPuff = new THREE.Mesh(geos.box, hatMat);
      chefPuff.scale.set(0.74, 0.36, 0.74);
      chefPuff.position.set(0, 2.6, 0);
      const ladle = new THREE.Mesh(geos.box, getMat('#d4d4d8', { metalness: 0.7, roughness: 0.3 }));
      ladle.scale.set(0.1, 1.1, 0.1);
      ladle.position.set(0.56, 1.15, -0.25);
      bodyGroup.add(apron, chefBase, chefPuff, ladle);
    } else if (spec.id === 'cacador_bosses') {
      // Ombreiras de osso + elmo de caçador + lança de obsidiana brilhante
      const helm = new THREE.Mesh(geos.box, hatMat);
      helm.scale.set(0.74, 0.3, 0.74);
      helm.position.set(0, 2.08, 0);
      const hornL = new THREE.Mesh(geos.box, getMat('#fef3c7'));
      hornL.scale.set(0.14, 0.4, 0.14);
      hornL.position.set(-0.38, 2.32, -0.1);
      hornL.rotation.z = 0.35;
      const hornR = new THREE.Mesh(geos.box, getMat('#fef3c7'));
      hornR.scale.set(0.14, 0.4, 0.14);
      hornR.position.set(0.38, 2.32, -0.1);
      hornR.rotation.z = -0.35;
      const spearShaft = new THREE.Mesh(geos.box, darkMat);
      spearShaft.scale.set(0.1, 2.3, 0.1);
      spearShaft.position.set(0.62, 1.15, -0.18);
      const spearTip = new THREE.Mesh(geos.box, glowMat);
      spearTip.scale.set(0.22, 0.46, 0.12);
      spearTip.position.set(0.62, 2.48, -0.18);
      bodyGroup.add(helm, hornL, hornR, spearShaft, spearTip);
    } else if (spec.id === 'guardiao_portal') {
      // Capuz místico + coroa rúnica + cetro dimensional
      const hood = new THREE.Mesh(geos.box, hatMat);
      hood.scale.set(0.78, 0.42, 0.78);
      hood.position.set(0, 2.22, 0);
      const hoodTip = new THREE.Mesh(geos.box, hatMat);
      hoodTip.scale.set(0.46, 0.3, 0.46);
      hoodTip.position.set(0, 2.52, 0.08);
      const scepter = new THREE.Mesh(geos.box, hatMat);
      scepter.scale.set(0.11, 2.0, 0.11);
      scepter.position.set(-0.6, 1.0, -0.2);
      const orb = buildSculptedInteractable('crystal', spec.accentColor);
      orb.scale.setScalar(0.45);
      orb.position.set(-0.6, 2.22, -0.2);
      bodyGroup.add(hood, hoodTip, scepter, orb);
    }

    // Cristal indicador flutuante acima do NPC
    const marker = buildSculptedCrystalSpire(spec.accentColor, 0.28);
    marker.position.y = 3.05;
    root.add(marker);

    return { root, bodyGroup, marker, ring };
  }

  _spawnOpenWorldNPCs() {
    for (const n of this.npcs) disposeObject3D(n.model.root);
    this.npcs = [];
    for (const spec of NPC_SPECS) {
      const model = this._buildNpcVoxelModel(spec);
      model.root.position.set(spec.x, 0, spec.z);
      this.group.add(model.root);
      this.npcs.push({
        ...spec,
        model,
        radius: 1.0
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 3 Bosses Regionais (com barras de HP e ondas de choque telegrafadas)
  // ---------------------------------------------------------------------------
  _spawnRegionalBosses() {
    for (const b of this.bosses) {
      b.model?.dispose?.();
      if (b.dangerRing) disposeObject3D(b.dangerRing);
    }
    this.bosses = [];

    for (const spec of REGIONAL_BOSS_SPECS) {
      let model = null;
      try {
        model = buildDungeonEnemyModel(spec.archetype, spec.theme);
      } catch {
        const root = new THREE.Group();
        const body = new THREE.Mesh(
          this._shared.geos.box,
          this._shared.getMat(spec.color, { emissive: spec.color, emissiveIntensity: 0.35 })
        );
        body.scale.set(2.2, 2.8, 2.2);
        body.position.y = 1.4;
        root.add(body);
        model = { root, hitBoxRadius: 1.8, animate() {}, dispose() { disposeObject3D(root); } };
      }
      model.root.scale.setScalar(spec.scale);
      model.root.position.set(spec.x, 0, spec.z);

      // Coroa/aura de Boss Regional
      const bossCrown = buildSculptedCrystalSpire(spec.color, 0.42);
      bossCrown.position.y = 2.95;
      model.root.add(bossCrown);

      // Anel de perigo telegrafado (vermelho) no chão
      const dangerRing = makeDangerRing(spec.shockRadius, '#ef4444');
      dangerRing.position.set(spec.x, 0, spec.z);
      dangerRing.visible = false;

      this.group.add(model.root, dangerRing);

      const bossObj = {
        ...spec,
        homeX: spec.x,
        homeZ: spec.z,
        model,
        bossCrown,
        dangerRing,
        pos: model.root.position,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        defeated: false,
        atkCd: 1.6,
        shockCd: 4.5,
        telegraphTimer: 0,
        telegraphDuration: 1.2,
        state: 'idle',
        stateTimer: 0
      };
      this.bosses.push(bossObj);
    }

    // Compatibilidade com this.guardian apontando para o Guardião do Altar
    this.guardian = this.bosses[0] || null;
  }

  _spawnGuardian() {
    const altarBoss = this.bosses.find((b) => b.id === 'boss_altar');
    if (altarBoss && !altarBoss.defeated) {
      this.banner('GUARDIÃO DESPERTOU!', 'Cuidado com o anel vermelho de Onda de Choque!', 'is-crit', 1900);
      this.sfx('roar');
    }
  }

  // ---------------------------------------------------------------------------
  // Modelos Voxel Compartilhados de Frutas & Alimentos (baixas draw calls)
  // ---------------------------------------------------------------------------
  _buildFoodVoxelMesh(foodId) {
    return buildSculptedFoodModel(foodId);
  }

  // ---------------------------------------------------------------------------
  // Streaming Dinâmico de Chunks (3x3 low-spec / 5x5 normal + descarte automático)
  // ---------------------------------------------------------------------------
  _streamChunks(force = false) {
    const px = this.player.mover.pos.x;
    const pz = this.player.mover.pos.z;
    const cx = Math.floor(px / CHUNK_SIZE);
    const cz = Math.floor(pz / CHUNK_SIZE);
    const curKey = `${cx},${cz}`;
    if (!force && curKey === this._lastChunkKey) return;
    this._lastChunkKey = curKey;

    const keep = new Set();
    for (let dx = -this.viewRadius; dx <= this.viewRadius; dx++) {
      for (let dz = -this.viewRadius; dz <= this.viewRadius; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        keep.add(key);
        if (!this.chunks.has(key)) {
          this.chunks.set(key, this._buildChunk(cx + dx, cz + dz));
        }
      }
    }

    // Descarrega chunks fora do raio para manter RAM/FPS baixos
    for (const [key, chunk] of this.chunks) {
      if (!keep.has(key)) {
        disposeObject3D(chunk.group);
        this.chunks.delete(key);
      }
    }
  }

  _isNearLandmark(wx, wz, minDist = 6.5) {
    if (Math.hypot(wx, wz) < minDist) return true;
    if (this.altar && Math.hypot(wx - this.altar.x, wz - this.altar.z) < minDist) return true;
    if (this.mainCampfire && Math.hypot(wx - this.mainCampfire.x, wz - this.mainCampfire.z) < minDist) return true;
    if (this.dungeonPortal && Math.hypot(wx - this.dungeonPortal.x, wz - this.dungeonPortal.z) < minDist) return true;
    for (const n of this.npcs) {
      if (Math.hypot(wx - n.x, wz - n.z) < 4.5) return true;
    }
    for (const b of this.bosses) {
      if (Math.hypot(wx - b.homeX, wz - b.homeZ) < 6.5) return true;
    }
    return false;
  }

  _buildChunk(cx, cz) {
    const rng = makeRng(`${this.seed}:${this.biome.id}:${cx}:${cz}`);
    const { geos, getMat } = this._shared;
    const g = new THREE.Group();
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;
    g.position.set(ox, 0, oz);

    const tile = new THREE.Mesh(
      geos.tile,
      getMat(this.biome.ground, { roughness: 0.94 })
    );
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);
    tile.receiveShadow = true;
    g.add(tile);

    const pillars = [];
    const pickups = [];
    const patrols = [];
    const campfires = [];

    // Rochas / árvores esculpidas em Voxel-Craft com geometrias compartilhadas
    const propCount = this.lowSpec ? 4 : 7;
    for (let i = 0; i < propCount; i++) {
      const lx = 2.5 + rng() * (CHUNK_SIZE - 5);
      const lz = 2.5 + rng() * (CHUNK_SIZE - 5);
      const wx = ox + lx;
      const wz = oz + lz;
      if (this._isNearLandmark(wx, wz, 6.2)) continue;
      const isTree = rng() < 0.55;
      const propSeed = `${this.seed}:${this.biome.id}:${cx}:${cz}:${i}`;
      const prop = isTree
        ? buildSculptedBiomeTree(this.biome.id, propSeed)
        : buildSculptedRockFormation(this.biome.id, propSeed);
      const r = isTree ? 0.65 : 1.05;
      prop.position.set(lx, 0, lz);
      if (!this.lowSpec) {
        prop.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      }
      g.add(prop);
      pillars.push({ x: wx, z: wz, r });
    }

    // Pickups: 4 Frutas/Alimentos Voxel + Ovos + Relíquias + Portais de Bioma
    const addFoodPickup = (foodId, idx) => {
      const id = `${this.biome.id}:${cx}:${cz}:food:${foodId}:${idx}`;
      if (this.collectedIds.has(id)) return;
      const lx = 3 + rng() * (CHUNK_SIZE - 6);
      const lz = 3 + rng() * (CHUNK_SIZE - 6);
      const mesh = this._buildFoodVoxelMesh(foodId);
      mesh.position.set(lx, 0.9, lz);
      g.add(mesh);
      pickups.push({ id, kind: 'food', foodId, x: ox + lx, z: oz + lz, mesh, active: true });
    };

    const addOrbPickup = (kind, color, radius) => {
      const id = `${this.biome.id}:${cx}:${cz}:${kind}`;
      if (this.collectedIds.has(id)) return;
      const lx = 3 + rng() * (CHUNK_SIZE - 6);
      const lz = 3 + rng() * (CHUNK_SIZE - 6);
      const mesh = buildSculptedInteractable(kind === 'relic' ? 'relic' : 'crystal', color);
      mesh.scale.setScalar(Math.max(0.5, radius / 0.45));
      mesh.position.set(lx, 0.88, lz);
      g.add(mesh);
      pickups.push({ id, kind, x: ox + lx, z: oz + lz, mesh, active: true });
    };

    // Garante 1 a 2 alimentos voxel por chunk
    const food1 = FOOD_KEYS[Math.floor(rng() * FOOD_KEYS.length)];
    addFoodPickup(food1, 0);
    if (rng() < 0.65) {
      const food2 = FOOD_KEYS[(FOOD_KEYS.indexOf(food1) + 1 + Math.floor(rng() * 3)) % FOOD_KEYS.length];
      addFoodPickup(food2, 1);
    }

    if (rng() < 0.72) addOrbPickup('egg', '#fbbf24', 0.36);
    if ((cx !== 0 || cz !== 0) && rng() < 0.42) addOrbPickup('relic', '#a855f7', 0.48);
    if (Math.abs(cx) + Math.abs(cz) >= 2 && rng() < 0.2) addOrbPickup('portal', '#38bdf8', 0.65);

    // Fogueiras de descanso adicionais em alguns chunks externos
    if ((Math.abs(cx) + Math.abs(cz) >= 2) && rng() < 0.22) {
      const fx = 6 + rng() * (CHUNK_SIZE - 12);
      const fz = 6 + rng() * (CHUNK_SIZE - 12);
      if (!this._isNearLandmark(ox + fx, oz + fz, 7)) {
        const cfMesh = this._buildCampfireMesh();
        cfMesh.position.set(fx, 0, fz);
        g.add(cfMesh);
        campfires.push({ group: cfMesh, x: ox + fx, z: oz + fz, radius: 4.0 });
      }
    }

    // Patrulha de dino IA leve em chunks externos
    if ((cx !== 0 || cz !== 0) && rng() < 0.45) {
      const lx = CHUNK_SIZE * 0.5;
      const lz = CHUNK_SIZE * 0.5;
      if (!this._isNearLandmark(ox + lx, oz + lz, 8)) {
        const pGroup = new THREE.Group();
        const body = new THREE.Mesh(geos.box, getMat('#f43f5e', { roughness: 0.55 }));
        body.scale.set(1.0, 1.0, 1.65);
        body.position.y = 0.65;
        const head = new THREE.Mesh(geos.box, getMat('#e11d48', { roughness: 0.5 }));
        head.scale.set(0.75, 0.65, 0.85);
        head.position.set(0, 1.15, -0.75);
        const crest = new THREE.Mesh(geos.box, getMat('#fbbf24', { emissive: '#d97706', emissiveIntensity: 0.6 }));
        crest.scale.set(0.2, 0.44, 0.34);
        crest.position.set(0, 1.58, -0.65);
        pGroup.add(body, head, crest);
        pGroup.position.set(lx, 0, lz);
        g.add(pGroup);
        patrols.push({
          cx: ox + lx, cz: oz + lz, x: ox + lx, z: oz + lz,
          ox, oz, mesh: pGroup, hp: 48, maxHp: 48, angle: rng() * Math.PI * 2, active: true, atkCd: 0
        });
      }
    }

    this.group.add(g);
    return { group: g, pillars, pickups, patrols, campfires };
  }

  // ---------------------------------------------------------------------------
  // Aventuras Dinâmicas do Mundo (Meteoro do Tesouro ☄️ & Filhote Perdido 🐣)
  // ---------------------------------------------------------------------------
  _spawnDynamicAdventure(preferredKind = null) {
    if (this.dynamicEvent?.group) disposeObject3D(this.dynamicEvent.group);
    this.dynamicEvent = null;

    const kind = preferredKind || (Math.random() < 0.5 ? 'meteor' : 'hatchling');
    const pPos = this.player?.mover?.pos || { x: 0, z: 0 };
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 14;
    const ex = Math.round(pPos.x + Math.cos(angle) * dist);
    const ez = Math.round(pPos.z + Math.sin(angle) * dist);

    const { geos, getMat } = this._shared;
    const g = new THREE.Group();
    g.position.set(ex, 0, ez);

    if (kind === 'meteor') {
      // Feixe vertical de luz celeste + cratera + núcleo de meteoro esculpido
      const beam = new THREE.Mesh(
        geos.box,
        getMat('#38bdf8', { basic: true, opacity: 0.24, doubleSide: true, depthWrite: false })
      );
      beam.scale.set(1.2, 28, 1.2);
      beam.rotation.y = Math.PI / 4;
      beam.position.y = 14;

      const ring = new THREE.Mesh(
        geos.ring,
        getMat('#f59e0b', { basic: true, opacity: 0.85, doubleSide: true, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(2.6);
      ring.position.y = 0.06;

      const core = buildSculptedCrystalSpire('#f59e0b', 1.15);
      core.position.y = 0.1;

      g.add(beam, ring, core);
      this.group.add(g);
      this.dynamicEvent = {
        kind: 'meteor',
        name: 'Meteoro do Tesouro',
        icon: '☄️',
        x: ex,
        z: ez,
        group: g,
        core,
        beam,
        active: true
      };
      this.toast('☄️ EVENTO DINÂMICO: Um Meteoro do Tesouro caiu por perto! Veja no Radar!', 'is-amber');
    } else {
      // Filhote de Dino Perdido 🐣 pedindo resgate
      const ring = new THREE.Mesh(
        geos.ring,
        getMat('#34d399', { basic: true, opacity: 0.85, doubleSide: true, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(2.0);
      ring.position.y = 0.05;

      const baby = new THREE.Group();
      const bBody = new THREE.Mesh(geos.box, getMat('#34d399', { roughness: 0.5 }));
      bBody.scale.set(0.55, 0.5, 0.85);
      bBody.position.y = 0.42;
      const bHead = new THREE.Mesh(geos.box, getMat('#6ee7b7', { roughness: 0.45 }));
      bHead.scale.set(0.48, 0.46, 0.52);
      bHead.position.set(0, 0.78, -0.35);
      const bCrest = new THREE.Mesh(geos.box, getMat('#fbbf24', { emissive: '#f59e0b', emissiveIntensity: 1.3 }));
      bCrest.scale.set(0.16, 0.24, 0.26);
      bCrest.position.set(0, 1.14, -0.35);
      baby.add(bBody, bHead, bCrest);

      g.add(ring, baby);
      this.group.add(g);
      this.dynamicEvent = {
        kind: 'hatchling',
        name: 'Filhote Perdido',
        icon: '🐣',
        x: ex,
        z: ez,
        group: g,
        core: baby,
        active: true
      };
      this.toast('🐣 EVENTO DINÂMICO: Um Filhote Perdido pede ajuda! Veja no Radar!', 'is-emerald');
    }
  }

  _completeDynamicEvent() {
    const ev = this.dynamicEvent;
    if (!ev || !ev.active) return;
    ev.active = false;
    const p = this.player;

    if (ev.kind === 'meteor') {
      this.eggsFound += 75;
      this.energy = Math.min(this.maxEnergy, this.energy + 35);
      p.shields += 1;
      this.relicsFound = Math.min(this.relicsTarget, this.relicsFound + 1);
      this._persistEggs(75);
      this.floaters.spawn(p.mover.pos, '☄️ +75 🥚 · +1 🏺 · +1 🛡️', 'is-amber');
      this.banner('TESOURO DO METEORO!', '+75 Ovos · +1 Relíquia · +1 Escudo · +35 Energia', 'is-amber', 2000);
      this.sfx('victory');
    } else {
      this.eggsFound += 80;
      this.fruitsCollected += 2;
      this.fruitWallet += 2;
      this.cookBuffs.speed += 0.08;
      this._recalcPlayerStats();
      this._persistEggs(80);
      this.floaters.spawn(p.mover.pos, '🐣 Filhote Salvo! +80 🥚 · +2 🍎 · +Velocidade', 'is-emerald');
      this.banner('FILHOTE RESGATADO!', '+80 Ovos · +2 Frutas · +8% Velocidade Permanente', 'is-emerald', 2000);
      this.sfx('victory');
    }

    disposeObject3D(ev.group);
    this.dynamicEvent = null;
    this._nextEventTimer = 22;
  }

  // ---------------------------------------------------------------------------
  // Construção do HUD, Controle de Câmera, Radar/Minimapa e Modal de NPC
  // ---------------------------------------------------------------------------
  _buildHud() {
    const el = document.createElement('div');
    el.className = 'm3d-hud-layer';
    el.innerHTML = `
      <style>
        .m3d-ow-radar-wrap {
          position: absolute;
          top: 56px;
          right: 16px;
          width: 164px;
          padding: 10px;
          border-radius: 16px;
          background: rgba(9, 9, 11, 0.86);
          border: 1px solid rgba(16, 185, 129, 0.38);
          backdrop-filter: blur(10px);
          pointer-events: auto;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        }
        .m3d-ow-radar-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }
        .m3d-ow-radar-disc {
          position: relative;
          width: 142px;
          height: 142px;
          margin: 0 auto;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(9, 9, 11, 0.95) 75%);
          border: 1.5px solid rgba(52, 211, 153, 0.42);
          overflow: hidden;
        }
        .m3d-ow-radar-ring {
          position: absolute;
          inset: 24%;
          border-radius: 50%;
          border: 1px dashed rgba(52, 211, 153, 0.22);
          pointer-events: none;
        }
        .m3d-ow-cardinal {
          position: absolute;
          font-size: 9px;
          font-weight: 800;
          color: #a1a1aa;
          pointer-events: none;
        }
        .m3d-ow-cardinal.is-n { top: 3px; left: 50%; transform: translateX(-50%); color: #fbbf24; }
        .m3d-ow-cardinal.is-s { bottom: 3px; left: 50%; transform: translateX(-50%); }
        .m3d-ow-cardinal.is-e { right: 5px; top: 50%; transform: translateY(-50%); }
        .m3d-ow-cardinal.is-w { left: 5px; top: 50%; transform: translateY(-50%); }
        .m3d-ow-player-arrow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 13px solid #22d3ee;
          transform: translate(-50%, -50%);
          filter: drop-shadow(0 0 6px #22d3ee);
          z-index: 5;
        }
        .m3d-ow-blip {
          position: absolute;
          font-size: 12px;
          line-height: 1;
          transform: translate(-50%, -50%);
          pointer-events: none;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
          z-index: 3;
        }
        .m3d-ow-radar-legend {
          margin-top: 7px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 5px;
          font-size: 10px;
          color: #d4d4d8;
        }
        .m3d-ow-cam-bar {
          margin-top: 6px;
          display: flex;
          gap: 4px;
          justify-content: space-between;
        }
        .m3d-ow-cam-bar .m3d-btn {
          padding: 4px 7px;
          font-size: 11px;
          flex: 1;
          justify-content: center;
        }
        .m3d-ow-energy-row {
          margin-top: 8px;
          padding-top: 7px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .m3d-ow-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 4px;
        }
        .m3d-ow-badge {
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(16, 185, 129, 0.18);
          border: 1px solid rgba(16, 185, 129, 0.45);
          color: #6ee7b7;
        }
        .m3d-ow-badge.is-amber {
          background: rgba(245, 158, 11, 0.2);
          border-color: rgba(245, 158, 11, 0.5);
          color: #fde68a;
        }
        .m3d-ow-badge.is-cyan {
          background: rgba(56, 189, 248, 0.2);
          border-color: rgba(56, 189, 248, 0.5);
          color: #7dd3fc;
        }
        .m3d-ow-interact-btn {
          position: absolute;
          bottom: 92px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #0ea5e9);
          color: #09090b;
          border: 2px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.45);
          cursor: pointer;
          pointer-events: auto;
          z-index: 12;
        }
        .m3d-ow-dialog {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: min(580px, calc(100% - 24px));
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(9, 9, 11, 0.95);
          border: 1px solid rgba(52, 211, 153, 0.45);
          backdrop-filter: blur(14px);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
          pointer-events: auto;
          z-index: 20;
        }
        .m3d-ow-dialog-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .m3d-ow-dialog-title { font-size: 17px; font-weight: 800; color: #34d399; }
        .m3d-ow-dialog-role { font-size: 11px; color: #a1a1aa; font-weight: 600; }
        .m3d-ow-dialog-body { font-size: 13px; line-height: 1.45; color: #e4e4e7; margin-bottom: 12px; }
        .m3d-ow-dialog-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px; }
        @media (max-width: 640px) {
          .m3d-adv-actions {
            z-index: 6;
            gap: 4px;
          }
          .m3d-adv-actions .m3d-btn {
            padding: 6px 8px;
            font-size: 11px;
          }
          .m3d-adv-panel {
            top: 56px;
            left: 8px;
            max-width: calc(100vw - 140px);
            padding: 8px 10px;
            font-size: 11px;
          }
          .m3d-ow-radar-wrap {
            top: 56px;
            right: 8px;
            width: 118px;
            padding: 7px;
          }
          .m3d-ow-radar-head {
            font-size: 9.5px;
            gap: 4px;
            flex-wrap: wrap;
          }
          .m3d-ow-radar-disc {
            width: 96px;
            height: 96px;
          }
          .m3d-ow-radar-legend {
            display: none;
          }
        }
      </style>

      <!-- Painel de Exploração, Objetivos, Frutas e Energia -->
      <div class="m3d-adv-panel">
        <div class="m3d-adv-biome" data-biome>${escapeHtml(this.biome.name)}</div>
        <div class="m3d-adv-objs">
          <div class="m3d-obj" data-obj-relics>🏺 Relíquias: 0 / ${this.relicsTarget}</div>
          <div class="m3d-obj" data-obj-altar>✨ Ativar Altar do Bioma</div>
          <div class="m3d-obj" data-obj-guard>👑 Bosses Regionais: 0 / 3</div>
          <div class="m3d-obj" data-obj-event>☄️ Evento: Explorando...</div>
        </div>
        <div class="m3d-ow-energy-row">
          <div data-energy-counter>⚡ Energia: 30 / 120 · 🍎 Frutas: 0 (Bolsa: 0)</div>
          <div style="font-size:11px;color:#a1a1aa;" data-food-breakdown>🍎0 · 🍍0 · 🍖0 · 🫐0</div>
          <div class="m3d-ow-badges" data-buff-badges></div>
        </div>
        <div class="m3d-adv-coords" data-coords>X 0 · Z 0 · 🥚 0</div>
      </div>

      <!-- Barra de HP de Boss Regional no Topo (visível quando perto de um Boss) -->
      <div class="m3d-boss-top" data-boss-bar style="display:none;">
        <div class="m3d-boss-header">
          <div>
            <span class="m3d-boss-name" data-boss-name>👑 Guardião do Altar</span>
            <span class="m3d-boss-title" data-boss-title>Sentinela Ancestral</span>
          </div>
          <span class="m3d-boss-phase" data-boss-hp-text>220 / 220 HP</span>
        </div>
        <div class="m3d-bar m3d-bar-boss"><div class="m3d-bar-fill" data-boss-fill style="width:100%"></div></div>
      </div>

      <!-- Barra de Vida, Estamina e Energia do Jogador -->
      <div class="m3d-player-pill">
        <div class="m3d-pill-label" data-player-label>${escapeHtml(this.player.name)} · 🛡️ 1</div>
        <div class="m3d-bar m3d-bar-hp" title="Vida (HP)"><div class="m3d-bar-fill" data-php></div></div>
        <div class="m3d-bar m3d-bar-stam" style="margin-top:5px;" title="Estamina"><div class="m3d-bar-fill" data-pstam></div></div>
        <div class="m3d-bar m3d-bar-fury" style="margin-top:5px;" title="Energia das Frutas (⚡)"><div class="m3d-bar-fill" data-penergy></div></div>
      </div>

      <!-- Ações de Canto + Câmera -->
      <div class="m3d-corner-actions">
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="cam-preset" title="Alternar Câmera [C]">${uiIcon('camera', { size: 15 })} Câmera [C]</button>
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="biome" title="Trocar Bioma">${uiIcon('openworld', { size: 15 })} Bioma</button>
        <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">${uiIcon('close', { size: 15 })} Menu</button>
      </div>

      <!-- Radar / Minimapa de Mundo Aberto + Controles de Zoom da Câmera -->
      <div class="m3d-ow-radar-wrap" data-radar-wrap>
        <div class="m3d-ow-radar-head">
          <span>${uiIcon('compass', { size: 13 })} RADAR ABERTO</span>
          <span data-cam-label>Explorador</span>
        </div>
        <div class="m3d-ow-radar-disc" data-radar-disc>
          <div class="m3d-ow-radar-ring"></div>
          <span class="m3d-ow-cardinal is-n">N</span>
          <span class="m3d-ow-cardinal is-s">S</span>
          <span class="m3d-ow-cardinal is-e">L</span>
          <span class="m3d-ow-cardinal is-w">O</span>
          <div class="m3d-ow-player-arrow" data-radar-arrow></div>
          <div data-radar-blips></div>
        </div>
        <div class="m3d-ow-radar-legend">
          <span>${uiIcon('npc', { size: 11 })}NPC</span><span>${uiIcon('crown', { size: 11, color: '#fbbf24' })}Boss</span><span>${uiIcon('fruit', { size: 11, color: '#f87171' })}Fruta</span><span>${uiIcon('sparkle', { size: 11, color: '#34d399' })}Altar</span><span>${uiIcon('flame', { size: 11, color: '#fb923c' })}Fogo</span><span>${uiIcon('dungeon', { size: 11, color: '#a855f7' })}Masmorra</span>
        </div>
        <div class="m3d-ow-cam-bar">
          <button type="button" class="m3d-btn" data-act="cam-zoom-in" title="Aproximar Zoom">${uiIcon('zoomIn', { size: 14 })}</button>
          <button type="button" class="m3d-btn" data-act="cam-preset-sub" title="Mudar Ângulo [C]">[C] Visão</button>
          <button type="button" class="m3d-btn" data-act="cam-zoom-out" title="Afastar Zoom">${uiIcon('zoomOut', { size: 14 })}</button>
        </div>
      </div>

      <!-- Botão Flutuante de Interação [E] (NPCs, Fogueira, Altar, Portal, Eventos) -->
      <button type="button" class="m3d-ow-interact-btn" data-interact-btn style="display:none;">
        [E] Interagir
      </button>

      <!-- Modal de Diálogo e Missões dos 4 NPCs -->
      <div class="m3d-ow-dialog" data-npc-dialog style="display:none;">
        <div class="m3d-ow-dialog-head">
          <div>
            <div class="m3d-ow-dialog-title" data-dlg-title>${uiIcon('npc', { size: 16 })} Guia da Savana</div>
            <div class="m3d-ow-dialog-role" data-dlg-role>Mestre Explorador</div>
          </div>
          <button type="button" class="m3d-btn m3d-btn-ghost" data-dlg-close>${uiIcon('close', { size: 14 })} Fechar</button>
        </div>
        <div class="m3d-ow-dialog-body" data-dlg-body></div>
        <div class="m3d-ow-dialog-opts" data-dlg-opts></div>
      </div>

      <div class="m3d-controls-hint">
        <span><b>WASD</b> Explorar 360°</span>
        <span><b>Q / Clique</b> Mordida</span>
        <span><b>E</b> Interagir (NPC/Altar/Portal)</span>
        <span><b>Espaço / Shift</b> Pular / Dash</span>
        <span><b>F</b> Rugido (35⚡)</span>
        <span><b>[C] / 🔍 / Arraste</b> Girar Câmera</span>
      </div>
    `;
    this.overlay.appendChild(el);

    this._hud = {
      biome: el.querySelector('[data-biome]'),
      objRelics: el.querySelector('[data-obj-relics]'),
      objAltar: el.querySelector('[data-obj-altar]'),
      objGuard: el.querySelector('[data-obj-guard]'),
      objEvent: el.querySelector('[data-obj-event]'),
      energyCounter: el.querySelector('[data-energy-counter]'),
      foodBreakdown: el.querySelector('[data-food-breakdown]'),
      buffBadges: el.querySelector('[data-buff-badges]'),
      coords: el.querySelector('[data-coords]'),
      bossBar: el.querySelector('[data-boss-bar]'),
      bossName: el.querySelector('[data-boss-name]'),
      bossTitle: el.querySelector('[data-boss-title]'),
      bossHpText: el.querySelector('[data-boss-hp-text]'),
      bossFill: el.querySelector('[data-boss-fill]'),
      playerLabel: el.querySelector('[data-player-label]'),
      php: el.querySelector('[data-php]'),
      pstam: el.querySelector('[data-pstam]'),
      penergy: el.querySelector('[data-penergy]'),
      camLabel: el.querySelector('[data-cam-label]'),
      radarDisc: el.querySelector('[data-radar-disc]'),
      radarArrow: el.querySelector('[data-radar-arrow]'),
      radarBlips: el.querySelector('[data-radar-blips]'),
      interactBtn: el.querySelector('[data-interact-btn]'),
      npcDialog: el.querySelector('[data-npc-dialog]'),
      dlgTitle: el.querySelector('[data-dlg-title]'),
      dlgRole: el.querySelector('[data-dlg-role]'),
      dlgBody: el.querySelector('[data-dlg-body]'),
      dlgOpts: el.querySelector('[data-dlg-opts]')
    };

    // Pool de blips para o Radar (evita recriar nós DOM a cada frame)
    this._radarBlips = [];
    for (let i = 0; i < 28; i++) {
      const blip = document.createElement('span');
      blip.className = 'm3d-ow-blip';
      blip.style.display = 'none';
      this._hud.radarBlips.appendChild(blip);
      this._radarBlips.push(blip);
    }

    // Listeners de botões
    this.listen(el.querySelector('[data-act="exit"]'), 'click', () => {
      this.requestExit({ eggs: this.eggsFound, relics: this.relicsFound, fruits: this.fruitsCollected });
    });
    this.listen(el.querySelector('[data-act="biome"]'), 'click', () => {
      this._switchBiome((this.biomeIdx + 1) % OPEN_BIOMES.length);
    });
    this.listen(el.querySelector('[data-act="cam-preset"]'), 'click', () => this.cycleCameraPreset());
    this.listen(el.querySelector('[data-act="cam-preset-sub"]'), 'click', () => this.cycleCameraPreset());
    this.listen(el.querySelector('[data-act="cam-zoom-in"]'), 'click', () => this.zoomCamera(-2.0));
    this.listen(el.querySelector('[data-act="cam-zoom-out"]'), 'click', () => this.zoomCamera(2.0));
    this.listen(this._hud.interactBtn, 'click', () => this._triggerInteraction());
    this.listen(el.querySelector('[data-dlg-close]'), 'click', () => this._closeNpcDialog());

    // Atalho de teclado [C] dedicado para câmera e clique para ataque
    this.listen(window, 'keydown', (e) => {
      if (!this.mounted || this.isPaused()) return;
      if (e.code === 'KeyC' && !e.repeat) {
        this.cycleCameraPreset();
      } else if (e.code === 'Escape' && this.activeDialogNpc) {
        this._closeNpcDialog();
      }
    });

    const canvasEl = this.game.canvas || this.game.renderer?.domElement;
    if (canvasEl) {
      this.listen(canvasEl, 'pointerdown', (e) => {
        if (e.button === 0 && !this.activeDialogNpc && this.player && this.player.atkCd <= 0) {
          // Ataque rápido com clique esquerdo se não estiver arrastando
          this._clickDownPos = { x: e.clientX, y: e.clientY };
        }
      });
      this.listen(canvasEl, 'pointerup', (e) => {
        if (e.button === 0 && this._clickDownPos && !this.activeDialogNpc) {
          const moved = Math.hypot(e.clientX - this._clickDownPos.x, e.clientY - this._clickDownPos.y);
          this._clickDownPos = null;
          if (moved < 6 && this.player && this.player.atkCd <= 0) {
            this._performPlayerAttack();
          }
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Controle de Câmera ([C] Presets + Zoom 🔍-/🔍+)
  // ---------------------------------------------------------------------------
  cycleCameraPreset() {
    return this._applyCameraPreset((this.camPresetIdx + 1) % CAMERA_PRESETS.length);
  }

  _applyCameraPreset(idx) {
    this.camPresetIdx = idx % CAMERA_PRESETS.length;
    const preset = CAMERA_PRESETS[this.camPresetIdx];
    if (this.rig) {
      this.rig.distance = clamp(preset.distance, this.rig.minDistance, this.rig.maxDistance);
      this.rig.pitch = clamp(preset.pitch, this.rig.minPitch, this.rig.maxPitch);
      this.rig.height = preset.height;
      this.rig.autoFollow = preset.autoFollow;
    }
    if (this._hud.camLabel) this._hud.camLabel.textContent = preset.name;
    this.toast(`🎥 Câmera: ${preset.name}${preset.autoFollow ? ' (Auto-Follow)' : ''}`, 'is-cyan');
    return preset;
  }

  zoomCamera(delta) {
    if (!this.rig) return;
    this.rig.distance = clamp(this.rig.distance + delta, this.rig.minDistance, this.rig.maxDistance);
  }

  // ---------------------------------------------------------------------------
  // Troca de Bioma via Portais ou HUD
  // ---------------------------------------------------------------------------
  _switchBiome(nextIdx) {
    this.biomeIdx = nextIdx % OPEN_BIOMES.length;
    this.biome = OPEN_BIOMES[this.biomeIdx];
    for (const chunk of this.chunks.values()) disposeObject3D(chunk.group);
    this.chunks.clear();
    this._lastChunkKey = '';
    this.scene.background = new THREE.Color(this.biome.sky);
    this.scene.fog = new THREE.Fog(this.biome.fog, 24, this.lowSpec ? 58 : 90);
    this._spawnBiomeAltar();
    this._streamChunks(true);
    if (this._hud.biome) this._hud.biome.textContent = this.biome.name;
    this.banner(this.biome.name, 'Novo Bioma Aberto!', 'is-cyan', 1500);
  }

  // ---------------------------------------------------------------------------
  // Loop Principal de Simulação
  // ---------------------------------------------------------------------------
  update(dt) {
    if (!this.mounted || this.isPaused()) return;
    const simDt = this.baseTick(dt);

    if (simDt > 0) {
      this._updatePlayer(simDt);
      this._streamChunks(false);
      this._updateWorldEntities(simDt);
      this._updateRegionalBosses(simDt);
      this._updateNPCs(simDt);
      this._updateDynamicAdventure(simDt);
      this.player.avatar.sync(simDt);
      this.rig.update(simDt, this.player.mover.pos, 0, this.player.mover.yaw);
      this._syncHud();
      this._syncRadar();
    }

    this.baseEndFrame(dt);
  }

  _recalcPlayerStats() {
    const p = this.player;
    if (!p) return;
    const speedMult = (1 + this.cookBuffs.speed) * (this.turboTimer > 0 ? 1.35 : 1);
    p.mover.speed = p.baseSpeed * speedMult;
    const atkMult = this.atkBuffTimer > 0 ? 1.2 : 1.0;
    p.atk = Math.round((p.baseAtk + this.cookBuffs.atk) * atkMult);
  }

  _updatePlayer(dt) {
    const p = this.player;
    const m = p.mover;
    const c = p.controls;

    // Timers de buffs de frutas
    let statsDirty = false;
    if (this.turboTimer > 0) {
      this.turboTimer = Math.max(0, this.turboTimer - dt);
      if (this.turboTimer === 0) statsDirty = true;
    }
    if (this.atkBuffTimer > 0) {
      this.atkBuffTimer = Math.max(0, this.atkBuffTimer - dt);
      if (this.atkBuffTimer === 0) statsDirty = true;
    }
    if (statsDirty) this._recalcPlayerStats();
    if (this._campfireHealToastCd > 0) this._campfireHealToastCd -= dt;

    p.stamina = Math.min(100, p.stamina + (this.turboTimer > 0 ? 32 : 18) * dt);
    if (p.atkCd > 0) p.atkCd = Math.max(0, p.atkCd - dt);

    const mv = c.move();
    this.rig.toWorld(mv.x, mv.y, this._tmpW);
    if (c.pressed('jump')) {
      if (m.jump()) this.sfx('jump');
    }
    if (c.pressed('dodge') && p.stamina >= 16 && m.dodge(this._tmpW.x, this._tmpW.z)) {
      p.stamina -= 16;
      this.sfx('jump');
    }

    // Ataque mordida/garra [Q]
    if (p.atkCd <= 0 && c.pressed('light')) {
      this._performPlayerAttack();
    }

    // Habilidade Especial de Energia [F]: Rugido de Choque Jurássico (usa 35 ⚡ Energia)
    if (c.pressed('special')) {
      this._performEnergyRoar();
    }

    // Interação [E] com NPCs, Altar, Portal de Masmorra, Fogueira ou Evento Dinâmico
    if (c.pressed('interact')) {
      this._triggerInteraction();
    }

    m.step(dt, this._tmpW.x, this._tmpW.z);

    // Colisão com obstáculos dos chunks e NPCs
    for (const chunk of this.chunks.values()) m.pushOutCircles(chunk.pillars);
    m.pushOutCircles(this.npcs);

    // Checa proximidade com Fogueiras (Zona Segura Curativa)
    this._checkCampfireHealing(dt);

    // Atualiza qual ponto interativo está mais próximo para exibir o botão [E]
    this._updateNearestInteractable();
  }

  _performPlayerAttack() {
    const p = this.player;
    p.atkCd = 0.28;
    p.avatar.attack('bite', 0.32);
    this._attackNearby(3.6, p.atk, false);
  }

  _performEnergyRoar() {
    const p = this.player;
    if (this.energy < 35) {
      this.toast(`⚡ Energia insuficiente (${Math.floor(this.energy)}/35)! Colete Frutas 🍎!`, 'is-amber');
      return;
    }
    this.energy -= 35;
    p.avatar.roar();
    this.rig?.shake(0.35);
    this.sfx('roar');
    this.floaters.spawn(p.mover.pos, '⚡ RUGIDO JURÁSSICO!', 'is-cyan');
    this._attackNearby(6.2, Math.round(p.atk * 1.75), true);
  }

  _attackNearby(range, dmg, isAoE = false) {
    const p = this.player;
    const pos = p.mover.pos;

    for (const chunk of this.chunks.values()) {
      for (const pat of chunk.patrols) {
        if (!pat.active) continue;
        if (Math.hypot(pat.x - pos.x, pat.z - pos.z) <= range) {
          pat.hp -= dmg;
          this.floaters.spawn(new THREE.Vector3(pat.x, 1.2, pat.z), `-${dmg}`, isAoE ? 'is-crit' : 'is-dmg');
          this.sfx('hit');
          if (pat.hp <= 0) {
            pat.active = false;
            pat.mesh.visible = false;
            this.eggsFound += 15;
            this.energy = Math.min(this.maxEnergy, this.energy + 8);
            this._persistEggs(15);
            this.floaters.spawn(new THREE.Vector3(pat.x, 1.5, pat.z), '+15 🥚 · +8 ⚡', 'is-amber');
          }
        }
      }
    }

    // Dano nos 3 Bosses Regionais
    for (const b of this.bosses) {
      if (b.defeated) continue;
      if (Math.hypot(b.pos.x - pos.x, b.pos.z - pos.z) <= range + 1.0) {
        b.hp = Math.max(0, b.hp - dmg);
        b.state = b.hp <= 0 ? 'dead' : 'hurt';
        b.stateTimer = 0.42;
        this.floaters.spawn(b.pos, `-${dmg}`, 'is-crit');
        this.sfx('hit');
        if (b.hp <= 0) this._onRegionalBossDefeated(b);
      }
    }
  }

  _applyDamageToPlayer(rawDmg, knockX = 0, knockZ = 0, sourceLabel = '') {
    const p = this.player;
    if (p.mover.invulnerable) return;

    // 🫐 Escudo da Baga Cristalina absorve o impacto!
    if (p.shields > 0) {
      p.shields -= 1;
      p.mover.iframes = 0.55;
      this.floaters.spawn(p.mover.pos, '🛡️ ESCUDO ABSORVEU!', 'is-cyan');
      this.sfx('coin');
      return;
    }

    p.hp = Math.max(1, p.hp - rawDmg);
    p.mover.iframes = 0.45;
    if (knockX || knockZ) p.mover.applyImpulse(knockX, knockZ, 2.8);
    p.avatar.hurt();
    this.floaters.spawn(p.mover.pos, `-${rawDmg}${sourceLabel ? ` ${sourceLabel}` : ''}`, 'is-dmg');
    this.sfx('hit');
  }

  // ---------------------------------------------------------------------------
  // Coleta de Frutas/Alimentos, Ovos, Relíquias, Fogueiras e Patrulhas
  // ---------------------------------------------------------------------------
  _collectFood(foodId) {
    const p = this.player;
    const pos = p.mover.pos;
    const def = FOOD_CATALOG[foodId] || FOOD_CATALOG.apple;

    this.fruitsCollected += 1;
    this.fruitWallet += 1;
    this.foodCounts[foodId] = (this.foodCounts[foodId] || 0) + 1;

    if (foodId === 'apple') {
      // 🍎 Maçã Jurássica (+25 HP & +15 Energia)
      p.hp = Math.min(p.maxHp, p.hp + 25);
      this.energy = Math.min(this.maxEnergy, this.energy + 15);
    } else if (foodId === 'golden_fruit') {
      // 🍍 Fruta Dourada (+45 Estamina + 5s Turbo!)
      p.stamina = Math.min(100, p.stamina + 45);
      this.energy = Math.min(this.maxEnergy, this.energy + 12);
      this.turboTimer = Math.max(this.turboTimer, 5.0);
      this._recalcPlayerStats();
    } else if (foodId === 'fossil_meat') {
      // 🍖 Carne Fóssil (+20% Ataque por 20s & +20 HP)
      p.hp = Math.min(p.maxHp, p.hp + 20);
      this.energy = Math.min(this.maxEnergy, this.energy + 10);
      this.atkBuffTimer = Math.max(this.atkBuffTimer, 20.0);
      this._recalcPlayerStats();
    } else if (foodId === 'crystal_berry') {
      // 🫐 Baga Cristalina (+1 Escudo absorvente + 10 Ovos)
      p.shields += 1;
      this.eggsFound += 10;
      this.energy = Math.min(this.maxEnergy, this.energy + 10);
      this._persistEggs(10);
    }

    this.floaters.spawn(pos, def.popup, def.cls);
    this.sfx('coin');
  }

  _checkCampfireHealing(dt) {
    const p = this.player;
    const pos = p.mover.pos;
    let inSafeCamp = false;

    const allFires = [];
    if (this.mainCampfire) allFires.push(this.mainCampfire);
    for (const chunk of this.chunks.values()) {
      for (const cf of chunk.campfires) allFires.push(cf);
    }

    for (const cf of allFires) {
      // Animação suave da chama
      const fo = cf.group?.userData?.flameOuter;
      const fc = cf.group?.userData?.flameCore;
      if (fo) fo.scale.y = 0.9 + Math.sin(this.elapsed * 9 + cf.x) * 0.16;
      if (fc) fc.scale.y = 0.62 + Math.cos(this.elapsed * 12 + cf.z) * 0.12;

      if (Math.hypot(pos.x - cf.x, pos.z - cf.z) <= cf.radius) {
        inSafeCamp = true;
      }
    }

    if (inSafeCamp) {
      const prevHp = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + 15 * dt);
      p.stamina = Math.min(100, p.stamina + 28 * dt);
      this.energy = Math.min(this.maxEnergy, this.energy + 9 * dt);
      if (Math.floor(p.hp) > Math.floor(prevHp) && this._campfireHealToastCd <= 0) {
        this._campfireHealToastCd = 2.6;
        this.floaters.spawn(pos, '🔥 Fogueira: +HP / +⚡', 'is-emerald');
      }
    }
    this._inSafeCamp = inSafeCamp;
  }

  _updateWorldEntities(dt) {
    const p = this.player;
    const pos = p.mover.pos;
    if (this.altar?.crystal) this.altar.crystal.rotation.y += dt * 1.6;
    if (this.dungeonPortal?.ring) {
      this.dungeonPortal.ring.rotation.z += dt * 1.2;
      this.dungeonPortal.crownGem.rotation.y += dt * 2.0;
    }

    for (const chunk of this.chunks.values()) {
      for (const pk of chunk.pickups) {
        if (!pk.active) continue;
        pk.mesh.rotation.y += dt * 2.2;
        pk.mesh.position.y = 0.88 + Math.sin(this.elapsed * 3.2 + pk.x) * 0.16;
        if (Math.hypot(pk.x - pos.x, pk.z - pos.z) < 1.75) {
          pk.active = false;
          pk.mesh.visible = false;
          this.collectedIds.add(pk.id);
          if (pk.kind === 'food') {
            this._collectFood(pk.foodId);
          } else if (pk.kind === 'egg') {
            this.eggsFound += 10;
            this._persistEggs(10);
            this.floaters.spawn(pos, '+10 🥚', 'is-amber');
            this.sfx('coin');
          } else if (pk.kind === 'berry') {
            this._collectFood('apple');
          } else if (pk.kind === 'relic') {
            this.relicsFound = Math.min(this.relicsTarget, this.relicsFound + 1);
            this.floaters.spawn(pos, `🏺 Relíquia ${this.relicsFound}/${this.relicsTarget}!`, 'is-special');
            this.toast(
              this.relicsFound >= this.relicsTarget
                ? '✨ Todas as relíquias coletadas! Ative o Altar [E]!'
                : `🏺 Relíquia ${this.relicsFound}/${this.relicsTarget} encontrada!`,
              'is-amber'
            );
            this.sfx('victory');
          } else if (pk.kind === 'portal') {
            this._switchBiome((this.biomeIdx + 1) % OPEN_BIOMES.length);
            return;
          }
        }
      }

      for (const pat of chunk.patrols) {
        if (!pat.active) continue;
        if (pat.atkCd > 0) pat.atkCd -= dt;
        const dist = Math.hypot(pos.x - pat.x, pos.z - pat.z);
        // Patrulhas respeitam a zona segura da fogueira
        if (dist < 10 && !this._inSafeCamp) {
          const dx = (pos.x - pat.x) / Math.max(0.01, dist);
          const dz = (pos.z - pat.z) / Math.max(0.01, dist);
          pat.x += dx * 3.6 * dt;
          pat.z += dz * 3.6 * dt;
          pat.mesh.rotation.y = yawFromDir(dx, dz);
          if (dist < 1.65 && pat.atkCd <= 0) {
            pat.atkCd = 1.4;
            this._applyDamageToPlayer(12, dx * 5, dz * 5);
          }
        } else {
          pat.angle += dt * 0.75;
          const nx = pat.cx + Math.cos(pat.angle) * 4;
          const nz = pat.cz + Math.sin(pat.angle) * 4;
          pat.mesh.rotation.y = yawFromDir(nx - pat.x, nz - pat.z);
          pat.x = nx;
          pat.z = nz;
        }
        pat.mesh.position.set(pat.x - pat.ox, 0, pat.z - pat.oz);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3 Bosses Regionais + Onda de Choque Telegrafada (Anel Vermelho!)
  // ---------------------------------------------------------------------------
  _updateRegionalBosses(dt) {
    const p = this.player;
    const pPos = p.mover.pos;

    for (const b of this.bosses) {
      if (b.defeated) continue;
      if (b.bossCrown) b.bossCrown.rotation.y += dt * 2.2;

      if (b.stateTimer > 0) {
        b.stateTimer -= dt;
        if (b.stateTimer <= 0 && b.state !== 'telegraph') b.state = 'idle';
      }
      try { b.model.animate?.(this.elapsed, b.state); } catch { /* noop */ }

      const dx = pPos.x - b.pos.x;
      const dz = pPos.z - b.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const distFromHome = Math.hypot(b.pos.x - b.homeX, b.pos.z - b.homeZ);

      // Se estiver preparando a Onda de Choque Telegrafada (Anel Vermelho no chão!)
      if (b.telegraphTimer > 0) {
        b.telegraphTimer += dt;
        const progress = clamp(b.telegraphTimer / b.telegraphDuration, 0, 1);
        b.dangerRing.visible = true;
        b.dangerRing.position.set(b.pos.x, 0, b.pos.z);
        b.dangerRing.setProgress(progress);

        if (b.telegraphTimer >= b.telegraphDuration) {
          // Detona a Onda de Choque!
          b.telegraphTimer = 0;
          b.dangerRing.visible = false;
          b.state = 'attack';
          b.stateTimer = 0.5;
          this.rig?.shake(0.42);
          this.sfx('roar');

          if (dist <= b.shockRadius && pPos.y < 1.15) {
            this._applyDamageToPlayer(b.shockDmg, (dx / dist) * 12, (dz / dist) * 12, '💥 ONDA');
          } else if (dist <= b.shockRadius + 3.5) {
            this.floaters.spawn(pPos, '✨ Esquivou da Onda!', 'is-emerald');
          }
        }
        continue;
      }

      // Perseguição dentro do território do Boss (até 26m)
      if (dist < 24 && distFromHome < 32 && !this._inSafeCamp) {
        b.model.root.rotation.y = yawFromDir(dx, dz);
        if (dist > 2.9) {
          b.pos.x += (dx / dist) * 3.7 * dt;
          b.pos.z += (dz / dist) * 3.7 * dt;
        }
        if (b.atkCd > 0) b.atkCd -= dt;
        if (b.shockCd > 0) b.shockCd -= dt;

        // Inicia Onda de Choque Telegrafada com anel vermelho
        if (dist < b.shockRadius + 1.4 && b.shockCd <= 0) {
          b.shockCd = 5.6;
          b.telegraphTimer = 0.01;
          b.state = 'telegraph';
          b.dangerRing.position.set(b.pos.x, 0, b.pos.z);
          b.dangerRing.visible = true;
          b.dangerRing.setProgress(0.05);
          this.floaters.spawn(b.pos, '⚠️ ONDA DE CHOQUE!', 'is-crit');
          continue;
        }

        // Golpe corpo a corpo padrão
        if (dist < 3.1 && b.atkCd <= 0) {
          b.atkCd = 1.65;
          b.state = 'attack';
          b.stateTimer = 0.45;
          this._applyDamageToPlayer(b.atk, (dx / dist) * 8.5, (dz / dist) * 8.5);
        }
      } else if (distFromHome > 1.5) {
        // Retorna suavemente para seu covil
        const hx = b.homeX - b.pos.x;
        const hz = b.homeZ - b.pos.z;
        const hd = Math.hypot(hx, hz) || 1;
        b.pos.x += (hx / hd) * 3.0 * dt;
        b.pos.z += (hz / hd) * 3.0 * dt;
        b.model.root.rotation.y = yawFromDir(hx, hz);
      }
    }
  }

  _onRegionalBossDefeated(boss) {
    boss.defeated = true;
    boss.state = 'dead';
    boss.dangerRing.visible = false;
    try { boss.model.animate?.(this.elapsed, 'dead'); } catch { /* noop */ }

    if (boss.id === 'boss_altar') this.guardianDefeated = true;

    const bonus = boss.eggReward;
    this.eggsFound += bonus;
    this.relicsFound = Math.min(this.relicsTarget, this.relicsFound + 1);
    this.player.shields += 1;
    this._persistEggs(bonus);

    // Aplica bônus de relíquia do Boss
    if (boss.id === 'boss_altar') {
      this.player.maxHp += 25;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45);
    } else if (boss.id === 'boss_obsidian') {
      this.cookBuffs.atk += 6;
      this._recalcPlayerStats();
    } else if (boss.id === 'boss_glacial') {
      this.cookBuffs.speed += 0.12;
      this._recalcPlayerStats();
    }

    this.sfx('victory');
    this.banner(
      `👑 ${boss.name.toUpperCase()} DERROTADO!`,
      `+${bonus} 🥚 · ${boss.relicName} · Fale com o Caçador de Bosses!`,
      'is-amber',
      2600
    );
  }

  _persistEggs(amount) {
    try {
      if (Save?.data && amount > 0) {
        Save.data.eggs = (Save.data.eggs || 0) + amount;
        Save.save?.();
      }
    } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // NPCs, Interações [E] e Diálogos / Missões
  // ---------------------------------------------------------------------------
  _updateNPCs(dt) {
    const pPos = this.player.mover.pos;
    for (const n of this.npcs) {
      if (n.model.marker) {
        n.model.marker.rotation.y += dt * 2.2;
        n.model.marker.position.y = 3.12 + Math.sin(this.elapsed * 3.5 + n.x) * 0.14;
      }
      const d = Math.hypot(pPos.x - n.x, pPos.z - n.z);
      if (d < 8) {
        n.model.bodyGroup.rotation.y = yawFromDir(pPos.x - n.x, pPos.z - n.z);
      }
    }
  }

  _updateDynamicAdventure(dt) {
    if (this.dynamicEvent?.active) {
      const ev = this.dynamicEvent;
      if (ev.core) ev.core.rotation.y += dt * 1.8;
      // Coleta automática se encostar direto no meteoro/filhote
      const pPos = this.player.mover.pos;
      if (Math.hypot(pPos.x - ev.x, pPos.z - ev.z) < 2.2) {
        this._completeDynamicEvent();
      }
    } else {
      this._nextEventTimer -= dt;
      if (this._nextEventTimer <= 0) {
        const nextKind = this._lastEventKind === 'meteor' ? 'hatchling' : 'meteor';
        this._lastEventKind = nextKind;
        this._spawnDynamicAdventure(nextKind);
      }
    }
  }

  _updateNearestInteractable() {
    const pPos = this.player.mover.pos;
    let best = null;
    let bestDist = 4.2;

    for (const n of this.npcs) {
      const d = Math.hypot(pPos.x - n.x, pPos.z - n.z);
      if (d < bestDist) {
        bestDist = d;
        best = { type: 'npc', npc: n, label: `[E] Falar com ${n.name} (${n.badge || n.icon})` };
      }
    }

    if (this.dungeonPortal) {
      const d = Math.hypot(pPos.x - this.dungeonPortal.x, pPos.z - this.dungeonPortal.z);
      if (d < 3.8 && d < bestDist) {
        bestDist = d;
        best = { type: 'dungeon_portal', label: '[E] 🏰 Entrar no Portal de Masmorra' };
      }
    }

    if (this.altar) {
      const d = Math.hypot(pPos.x - this.altar.x, pPos.z - this.altar.z);
      if (d < 4.0 && d < bestDist) {
        bestDist = d;
        best = { type: 'altar', label: this.altarActivated ? '[E] ✨ Altar Ativado (Bênção)' : `[E] ✨ Ativar Altar (${this.relicsFound}/${this.relicsTarget} Relíquias)` };
      }
    }

    if (this.dynamicEvent?.active) {
      const d = Math.hypot(pPos.x - this.dynamicEvent.x, pPos.z - this.dynamicEvent.z);
      if (d < 4.5 && d < bestDist) {
        bestDist = d;
        best = {
          type: 'event',
          label: this.dynamicEvent.kind === 'meteor'
            ? '[E] ☄️ Abrir Meteoro do Tesouro'
            : '[E] 🐣 Resgatar Filhote Perdido'
        };
      }
    }

    if (this.mainCampfire) {
      const d = Math.hypot(pPos.x - this.mainCampfire.x, pPos.z - this.mainCampfire.z);
      if (d < 3.8 && d < bestDist) {
        bestDist = d;
        best = { type: 'campfire', label: '[E] 🔥 Descansar na Fogueira' };
      }
    }

    this.nearestInteractable = best;
    if (this._hud.interactBtn) {
      if (best && !this.activeDialogNpc) {
        this._hud.interactBtn.style.display = '';
        this._hud.interactBtn.textContent = best.label;
      } else {
        this._hud.interactBtn.style.display = 'none';
      }
    }
  }

  _triggerInteraction() {
    if (this.activeDialogNpc) {
      this._closeNpcDialog();
      return;
    }
    const target = this.nearestInteractable;
    if (!target) {
      this.toast('Aproxime-se de um NPC 🧙, Altar ✨, Fogueira 🔥 ou Portal 🏰 para interagir [E]!', 'is-cyan');
      return;
    }

    if (target.type === 'npc') {
      this._openNpcDialog(target.npc);
    } else if (target.type === 'dungeon_portal') {
      const portalNpc = this.npcs.find((n) => n.id === 'guardiao_portal');
      if (portalNpc) this._openNpcDialog(portalNpc);
      else this._enterDungeonRpg();
    } else if (target.type === 'altar') {
      this._interactWithAltar();
    } else if (target.type === 'event') {
      this._completeDynamicEvent();
    } else if (target.type === 'campfire') {
      this.player.hp = this.player.maxHp;
      this.player.stamina = 100;
      this.energy = Math.min(this.maxEnergy, this.energy + 25);
      this.floaters.spawn(this.player.mover.pos, '🔥 Descanso Completo! HP & Estamina 100%', 'is-emerald');
      this.sfx('coin');
    }
  }

  _interactWithAltar() {
    if (!this.altarActivated) {
      if (this.relicsFound >= this.relicsTarget) {
        this.altarActivated = true;
        this.altar.crystal.material.emissiveIntensity = 2.6;
        this.eggsFound += 50;
        this.player.shields += 1;
        this._persistEggs(50);
        this.floaters.spawn(this.player.mover.pos, '✨ ALTAR ATIVADO! +50 🥚 · +1 🛡️', 'is-emerald');
        this._spawnGuardian();
      } else {
        this.toast(`✨ Faltam ${this.relicsTarget - this.relicsFound} relíquia(s) para ativar o Altar!`, 'is-amber');
      }
    } else {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
      this.energy = Math.min(this.maxEnergy, this.energy + 20);
      this.floaters.spawn(this.player.mover.pos, '✨ Bênção do Altar: +35 HP · +20 ⚡', 'is-cyan');
      this.sfx('coin');
    }
  }

  _openNpcDialog(npc) {
    this.activeDialogNpc = npc;
    if (this._hud.interactBtn) this._hud.interactBtn.style.display = 'none';
    this._renderNpcDialog();
    if (this._hud.npcDialog) this._hud.npcDialog.style.display = '';
    this.sfx('coin');
  }

  _closeNpcDialog() {
    this.activeDialogNpc = null;
    if (this._hud.npcDialog) this._hud.npcDialog.style.display = 'none';
  }

  _renderNpcDialog() {
    const npc = this.activeDialogNpc;
    if (!npc || !this._hud.npcDialog) return;

    this._hud.dlgTitle.textContent = `${npc.badge || npc.icon} ${npc.name}`;
    this._hud.dlgRole.textContent = npc.role;
    this._hud.dlgOpts.innerHTML = '';

    const addOption = (label, cls, onClick) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `m3d-btn ${cls || ''}`;
      btn.textContent = label;
      this.listen(btn, 'click', onClick);
      this._hud.dlgOpts.appendChild(btn);
    };

    if (npc.id === 'guia_savana') {
      const bossesDone = this.bosses.filter((b) => b.defeated).length;
      this._hud.dlgBody.innerHTML = `
        Bem-vindo ao <b>${escapeHtml(this.biome.name)}</b>, explorador!
        <br>• Colete <b>🍎 Maçã Jurássica</b>, <b>🍍 Fruta Dourada</b>, <b>🍖 Carne Fóssil</b> e <b>🫐 Baga Cristalina</b> pelos chunks para ganhar <b>⚡ Energia</b>, Escudos e Turbo!
        <br>• Use <b>[C]</b> ou os botões <b>🔍+/🔍-</b> no Radar para controlar a câmera e <b>[F]</b> (35⚡) para soltar seu Rugido de Energia!
        <br>• <b>Missão da Região:</b> Frutas (${this.fruitsCollected}/4) · Relíquias (${this.relicsFound}/${this.relicsTarget}) · Bosses (${bossesDone}/3).
      `;

      if (!this.guidePackClaimed) {
        addOption('🎁 Kit do Explorador (+25 ⚡ · +20 🥚 · +1 🍎)', 'm3d-btn-primary', () => {
          this.guidePackClaimed = true;
          this.energy = Math.min(this.maxEnergy, this.energy + 25);
          this.eggsFound += 20;
          this.fruitsCollected += 1;
          this.fruitWallet += 1;
          this._persistEggs(20);
          this.floaters.spawn(this.player.mover.pos, '🎁 +20 🥚 · +25 ⚡ · +1 🍎', 'is-emerald');
          this._renderNpcDialog();
        });
      }

      if (!this.guideQuestClaimed && (this.fruitsCollected >= 4 || this.relicsFound >= 2 || bossesDone >= 1)) {
        addOption('🏆 Concluir Missão da Savana (+120 🥚 & +1 🏺 Relíquia)', 'm3d-btn-primary', () => {
          this.guideQuestClaimed = true;
          this.eggsFound += 120;
          this.relicsFound = Math.min(this.relicsTarget, this.relicsFound + 1);
          this._persistEggs(120);
          this.floaters.spawn(this.player.mover.pos, '🏆 Missão Concluída! +120 🥚 · +1 🏺', 'is-amber');
          this.sfx('victory');
          this._renderNpcDialog();
        });
      }

      addOption('🧭 Apontar Evento Dinâmico (☄️ / 🐣)', '', () => {
        if (!this.dynamicEvent?.active) this._spawnDynamicAdventure();
        const ev = this.dynamicEvent;
        const d = Math.round(Math.hypot(ev.x - this.player.mover.pos.x, ev.z - this.player.mover.pos.z));
        this.toast(`${ev.icon} ${ev.name} está a ${d}m (X ${ev.x}, Z ${ev.z})!`, 'is-amber');
      });
    } else if (npc.id === 'cozinheiro') {
      this._hud.dlgBody.innerHTML = `
        O caldeirão está fervendo na <b>🔥 Fogueira</b>! Traga frutas coletadas pelo mundo aberto para cozinhar <b>buffs permanentes</b> nesta jornada!
        <br>• <b>Frutas na Bolsa:</b> <b>${this.fruitWallet} 🍎</b> (Total coletado: ${this.fruitsCollected})
        <br>• <b>Buffs Ativos da Cozinha:</b> +${this.cookBuffs.hp} MaxHP · +${this.cookBuffs.atk} ATQ · +${Math.round(this.cookBuffs.speed * 100)}% Velocidade
      `;

      addOption(`🍲 Ensopado Vital (+35 MaxHP & Cura) [2 🍎]`, 'm3d-btn-primary', () => {
        if (this.fruitWallet < 2) { this.toast('Colete pelo menos 2 Frutas 🍎 para cozinhar!', 'is-amber'); return; }
        this.fruitWallet -= 2;
        this.cookBuffs.hp += 35;
        this.player.maxHp += 35;
        this.player.hp = this.player.maxHp;
        this.floaters.spawn(this.player.mover.pos, '🍲 +35 MaxHP & Cura Total!', 'is-emerald');
        this.sfx('victory');
        this._renderNpcDialog();
      });

      addOption(`🥩 Assado Vulcânico (+6 ATQ Permanente) [2 🍎]`, 'm3d-btn-primary', () => {
        if (this.fruitWallet < 2) { this.toast('Colete pelo menos 2 Frutas 🍎 para cozinhar!', 'is-amber'); return; }
        this.fruitWallet -= 2;
        this.cookBuffs.atk += 6;
        this._recalcPlayerStats();
        this.floaters.spawn(this.player.mover.pos, '🥩 +6 Ataque Permanente!', 'is-crit');
        this.sfx('victory');
        this._renderNpcDialog();
      });

      addOption(`⚡ Néctar Turbo (+10% Velocidade & +40⚡) [2 🍎]`, 'm3d-btn-primary', () => {
        if (this.fruitWallet < 2) { this.toast('Colete pelo menos 2 Frutas 🍎 para cozinhar!', 'is-amber'); return; }
        this.fruitWallet -= 2;
        this.cookBuffs.speed += 0.1;
        this.energy = Math.min(this.maxEnergy, this.energy + 40);
        this._recalcPlayerStats();
        this.floaters.spawn(this.player.mover.pos, '⚡ +10% Velocidade & +40 Energia!', 'is-cyan');
        this.sfx('victory');
        this._renderNpcDialog();
      });

      addOption('🍱 Refeição da Fogueira (Cura +50 HP & +30⚡ Grátis)', '', () => {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
        this.player.stamina = 100;
        this.energy = Math.min(this.maxEnergy, this.energy + 30);
        this.floaters.spawn(this.player.mover.pos, '🍱 +50 HP · +30 ⚡', 'is-emerald');
        this.sfx('coin');
        this._renderNpcDialog();
      });
    } else if (npc.id === 'cacador_bosses') {
      const statusHtml = this.bosses.map((b) => {
        const d = Math.round(Math.hypot(b.pos.x - this.player.mover.pos.x, b.pos.z - this.player.mover.pos.z));
        const claimed = this.claimedBossBounties.has(b.id);
        return `<div>• <b>👑 ${escapeHtml(b.name)}</b>: ${
          b.defeated
            ? `<span style="color:#34d399;">DERROTADO ✓</span> ${claimed ? '(Troféu Resgatado)' : '<b>(Recompensa Pronta!)</b>'}`
            : `<span style="color:#fbbf24;">${b.hp}/${b.maxHp} HP</span> (${d}m)`
        }</div>`;
      }).join('');

      this._hud.dlgBody.innerHTML = `
        Eu rastreio os <b>3 Bosses Regionais</b> deste mundo! Quando o anel vermelho surgir no chão, saia da área ou use seu escudo 🫐!
        <div style="margin-top:6px;">${statusHtml}</div>
      `;

      for (const b of this.bosses) {
        if (b.defeated && !this.claimedBossBounties.has(b.id)) {
          addOption(`🏆 Resgatar Troféu: ${b.name} (+90 🥚 & +1 🛡️)`, 'm3d-btn-primary', () => {
            this.claimedBossBounties.add(b.id);
            this.eggsFound += 90;
            this.player.shields += 1;
            this.relicsFound = Math.min(this.relicsTarget, this.relicsFound + 1);
            this._persistEggs(90);
            this.floaters.spawn(this.player.mover.pos, `🏆 Troféu ${b.name}! +90 🥚 · +1 🛡️`, 'is-amber');
            this.sfx('victory');
            this._renderNpcDialog();
          });
        }
      }

      addOption('🧭 Localizar Boss Mais Próximo', '', () => {
        const alive = this.bosses.filter((b) => !b.defeated);
        if (!alive.length) {
          this.toast('👑 Todos os 3 Bosses Regionais foram derrotados! Lendário!', 'is-emerald');
          return;
        }
        alive.sort((a, b) =>
          Math.hypot(a.pos.x - this.player.mover.pos.x, a.pos.z - this.player.mover.pos.z) -
          Math.hypot(b.pos.x - this.player.mover.pos.x, b.pos.z - this.player.mover.pos.z)
        );
        const target = alive[0];
        const d = Math.round(Math.hypot(target.pos.x - this.player.mover.pos.x, target.pos.z - this.player.mover.pos.z));
        this.toast(`👑 ${target.name} está a ${d}m (X ${Math.round(target.pos.x)}, Z ${Math.round(target.pos.z)})!`, 'is-amber');
      });
    } else if (npc.id === 'guardiao_portal') {
      this._hud.dlgBody.innerHTML = `
        Eu vigio o <b>🏰 Portal de Masmorra</b>! Através desta fenda dimensional você pode mergulhar diretamente na <b>Masmorra RPG 3D (<code>dungeon_rpg</code>)</b> com seus ovos conquistados, ou reivindicar o saque dimensional!
      `;

      addOption('🏰 Entrar na Masmorra RPG (dungeon_rpg)', 'm3d-btn-primary', () => {
        this._closeNpcDialog();
        this._enterDungeonRpg();
      });

      if (!this.portalLootClaimed) {
        addOption('🎁 Reivindicar Saque do Portal (+65 🥚 · +1 🏺 · +1 🛡️)', '', () => {
          this.portalLootClaimed = true;
          this.eggsFound += 65;
          this.relicsFound = Math.min(this.relicsTarget, this.relicsFound + 1);
          this.player.shields += 1;
          this._persistEggs(65);
          this.floaters.spawn(this.player.mover.pos, '🏰 Saque do Portal! +65 🥚 · +1 🏺 · +1 🛡️', 'is-cyan');
          this.sfx('victory');
          this._renderNpcDialog();
        });
      }

      addOption('🌍 Viajar para o Próximo Bioma', '', () => {
        this._closeNpcDialog();
        this._switchBiome((this.biomeIdx + 1) % OPEN_BIOMES.length);
      });
    }
  }

  _enterDungeonRpg() {
    this.sfx('victory');
    this.toast('🏰 Atravessando o Portal para a Masmorra RPG...', 'is-cyan');
    const dinoId = this.player?.dinoId;
    if (typeof this.game?._startFree3DMode === 'function') {
      this.game._startFree3DMode('dungeon_rpg', { dinoId, fromOpenWorld: true });
      return;
    }
    this.requestExit({
      switchMode: 'dungeon_rpg',
      eggs: this.eggsFound,
      relics: this.relicsFound,
      fruits: this.fruitsCollected
    });
  }

  // ---------------------------------------------------------------------------
  // Sincronização do HUD e do Radar/Minimapa de Mundo Aberto
  // ---------------------------------------------------------------------------
  _syncHud() {
    const h = this._hud;
    if (!h.coords) return;
    const p = this.player;
    const pos = p.mover.pos;

    h.objRelics.textContent = `🏺 Relíquias: ${this.relicsFound} / ${this.relicsTarget}${this.relicsFound >= this.relicsTarget ? ' ✓' : ''}`;
    h.objRelics.classList.toggle('is-done', this.relicsFound >= this.relicsTarget);

    const dAltar = Math.round(Math.hypot(pos.x - this.altar.x, pos.z - this.altar.z));
    h.objAltar.textContent = `✨ Altar (${dAltar}m)${this.altarActivated ? ' ✓' : ''}`;
    h.objAltar.classList.toggle('is-done', this.altarActivated);

    const bossesDefeated = this.bosses.filter((b) => b.defeated).length;
    h.objGuard.textContent = `👑 Bosses Regionais: ${bossesDefeated} / ${this.bosses.length}${bossesDefeated >= this.bosses.length ? ' ✓' : ''}`;
    h.objGuard.classList.toggle('is-done', bossesDefeated >= this.bosses.length);

    if (this.dynamicEvent?.active) {
      const dEv = Math.round(Math.hypot(pos.x - this.dynamicEvent.x, pos.z - this.dynamicEvent.z));
      h.objEvent.textContent = `${this.dynamicEvent.icon} ${this.dynamicEvent.name} (${dEv}m)`;
    } else {
      h.objEvent.textContent = `🔥 Fogueira (${Math.round(Math.hypot(pos.x - this.mainCampfire.x, pos.z - this.mainCampfire.z))}m) · 🏰 Portal (${Math.round(Math.hypot(pos.x - this.dungeonPortal.x, pos.z - this.dungeonPortal.z))}m)`;
    }

    h.energyCounter.textContent = `⚡ Energia: ${Math.floor(this.energy)} / ${this.maxEnergy} · 🍎 Frutas: ${this.fruitsCollected} (Bolsa: ${this.fruitWallet})`;
    h.foodBreakdown.textContent = `🍎${this.foodCounts.apple} · 🍍${this.foodCounts.golden_fruit} · 🍖${this.foodCounts.fossil_meat} · 🫐${this.foodCounts.crystal_berry}`;

    // Badges de buffs ativos
    const badges = [];
    if (p.shields > 0) badges.push(`<span class="m3d-ow-badge is-cyan">🛡️ ${p.shields} Escudo(s)</span>`);
    if (this.turboTimer > 0) badges.push(`<span class="m3d-ow-badge is-amber">🍍 Turbo ${this.turboTimer.toFixed(1)}s</span>`);
    if (this.atkBuffTimer > 0) badges.push(`<span class="m3d-ow-badge is-amber">🍖 +20% ATQ ${Math.ceil(this.atkBuffTimer)}s</span>`);
    if (this._inSafeCamp) badges.push(`<span class="m3d-ow-badge">🔥 Zona Segura</span>`);
    const badgeHtml = badges.join('');
    if (h.buffBadges._lastHtml !== badgeHtml) {
      h.buffBadges._lastHtml = badgeHtml;
      h.buffBadges.innerHTML = badgeHtml;
    }

    h.coords.textContent = `X ${Math.round(pos.x)} · Z ${Math.round(pos.z)} · 🥚 ${this.eggsFound} · ATQ ${p.atk}`;
    h.playerLabel.textContent = `${p.name} · ❤️ ${Math.ceil(p.hp)}/${p.maxHp} · 🛡️ ${p.shields}`;
    h.php.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
    h.pstam.style.width = `${clamp(p.stamina, 0, 100)}%`;
    h.penergy.style.width = `${clamp((this.energy / this.maxEnergy) * 100, 0, 100)}%`;

    // Barra de HP de Boss Regional no topo quando próximo (<= 28m)
    let nearestBoss = null;
    let nearestBossDist = 28;
    for (const b of this.bosses) {
      if (b.defeated) continue;
      const d = Math.hypot(pos.x - b.pos.x, pos.z - b.pos.z);
      if (d < nearestBossDist) {
        nearestBossDist = d;
        nearestBoss = b;
      }
    }

    if (nearestBoss) {
      h.bossBar.style.display = '';
      h.bossName.textContent = `👑 ${nearestBoss.name}`;
      h.bossTitle.textContent = `${nearestBoss.title} (${Math.round(nearestBossDist)}m)`;
      h.bossHpText.textContent = `${nearestBoss.hp} / ${nearestBoss.maxHp} HP${nearestBoss.telegraphTimer > 0 ? ' · ⚠️ ONDA!' : ''}`;
      h.bossFill.style.width = `${clamp((nearestBoss.hp / nearestBoss.maxHp) * 100, 0, 100)}%`;
    } else {
      h.bossBar.style.display = 'none';
    }
  }

  _syncRadar() {
    const h = this._hud;
    if (!h.radarArrow || !this.player) return;
    const pPos = this.player.mover.pos;
    const yawDeg = (-this.player.mover.yaw * 180) / Math.PI;
    h.radarArrow.style.transform = `translate(-50%, -50%) rotate(${yawDeg.toFixed(1)}deg)`;

    const points = [];

    // 1. Altar ✨
    if (this.altar) points.push({ x: this.altar.x, z: this.altar.z, icon: '✨' });
    // 2. Portal de Masmorra 🏰
    if (this.dungeonPortal) points.push({ x: this.dungeonPortal.x, z: this.dungeonPortal.z, icon: '🏰' });
    // 3. Fogueira Principal 🔥 + Fogueiras de chunks
    if (this.mainCampfire) points.push({ x: this.mainCampfire.x, z: this.mainCampfire.z, icon: '🔥' });
    for (const chunk of this.chunks.values()) {
      for (const cf of chunk.campfires) points.push({ x: cf.x, z: cf.z, icon: '🔥' });
    }
    // 4. 4 NPCs 🧙
    for (const n of this.npcs) points.push({ x: n.x, z: n.z, icon: '🧙' });
    // 5. 3 Bosses Regionais 👑
    for (const b of this.bosses) {
      if (!b.defeated) points.push({ x: b.pos.x, z: b.pos.z, icon: '👑' });
    }
    // 6. Evento Dinâmico ☄️ / 🐣
    if (this.dynamicEvent?.active) {
      points.push({ x: this.dynamicEvent.x, z: this.dynamicEvent.z, icon: this.dynamicEvent.icon });
    }
    // 7. Frutas/Alimentos 🍎 próximos
    for (const chunk of this.chunks.values()) {
      for (const pk of chunk.pickups) {
        if (!pk.active) continue;
        if (pk.kind === 'food') {
          points.push({ x: pk.x, z: pk.z, icon: '🍎' });
        } else if (pk.kind === 'relic') {
          points.push({ x: pk.x, z: pk.z, icon: '🏺' });
        }
        if (points.length >= this._radarBlips.length) break;
      }
      if (points.length >= this._radarBlips.length) break;
    }

    const radiusPx = 58; // raio útil dentro do disco de 142px
    for (let i = 0; i < this._radarBlips.length; i++) {
      const blip = this._radarBlips[i];
      const pt = points[i];
      if (!pt) {
        blip.style.display = 'none';
        continue;
      }
      const dx = pt.x - pPos.x;
      const dz = pt.z - pPos.z;
      const dist = Math.hypot(dx, dz);
      const norm = Math.min(1, dist / RADAR_RANGE);
      const angle = Math.atan2(dz, dx);
      const bx = 71 + Math.cos(angle) * norm * radiusPx;
      const bz = 71 + Math.sin(angle) * norm * radiusPx;
      blip.style.display = '';
      blip.textContent = pt.icon;
      blip.style.left = `${bx.toFixed(1)}px`;
      blip.style.top = `${bz.toFixed(1)}px`;
      blip.style.opacity = dist > RADAR_RANGE ? '0.68' : '1';
    }
  }

  dispose() {
    for (const chunk of this.chunks.values()) disposeObject3D(chunk.group);
    this.chunks.clear();
    if (this.altar?.group) disposeObject3D(this.altar.group);
    if (this.mainCampfire?.group) disposeObject3D(this.mainCampfire.group);
    if (this.dungeonPortal?.group) disposeObject3D(this.dungeonPortal.group);
    if (this.dynamicEvent?.group) disposeObject3D(this.dynamicEvent.group);
    for (const n of this.npcs) disposeObject3D(n.model.root);
    this.npcs.length = 0;
    for (const b of this.bosses) {
      b.model?.dispose?.();
      if (b.dangerRing) disposeObject3D(b.dangerRing);
    }
    this.bosses.length = 0;
    this.guardian = null;
    this.player?.avatar?.dispose();
    this._disposeSharedAssets();
    this.disposeBase();
  }
}
