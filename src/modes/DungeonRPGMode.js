// Masmorra RPG 3D Ilustrada de Mesa (`dungeon_rpg` até Andar 5 / `dungeon_rush` infinito).
// Câmera 3D controlável (Isométrica / 3ª Pessoa / Topo + arraste orbital + zoom),
// 5 NPCs voxel 3D interativos, 10 armas com bônus nos dados, Minimapa com Névoa de Guerra
// desbloqueável pelo Pergaminho do Mapa da Masmorra, Ficha de Herói/Inventário e
// Resolução Tabletop RPG de 6 Tiers via AIDungeonClient + DiceRoller3D.
import * as THREE from 'three';
import {
  Mode3DBase,
  DinoAvatar,
  PlayerControls,
  P1_BINDINGS,
  buildModeLights,
  makeGlowOrb,
  resolveDinoId,
  disposeObject3D,
  clamp,
  escapeHtml
} from './WorldExplorer3D.js';
import { generateFloor } from './DungeonGenerator.js';
import {
  DUNGEON_THEMES,
  DUNGEON_NPCS,
  DUNGEON_WEAPONS,
  buildDungeonRoomMeshes,
  buildDungeonEnemyModel,
  buildDungeonNpcModel
} from '../models/DungeonProps.js';
import {
  buildSculptedDungeonPortal,
  buildSculptedInteractable
} from '../models/SculptedWorldProps.js';
import { uiIcon } from '../ui/UiIcons.js';
import { DiceRoller3D, SUPPORTED_DICE } from './DiceRoller3D.js';
import {
  AIDungeonClient,
  evaluateLocalDungeonAction,
  classifyRollOutcome,
  getTierNarrative
} from '../net/AIDungeonClient.js';
import {
  rollDungeonEncounter,
  rollDungeonTrap,
  rollDungeonRelic,
  rollDungeonRoomEvent
} from '../content/ultra_catalog.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { Save } from '../systems/Save.js';

const DUNGEON_P1_BINDINGS = {
  ...P1_BINDINGS,
  dodge: ['ShiftLeft'],
  block: ['ShiftLeft']
};

const DUNGEON_TOUCH = [
  { action: 'interact', label: 'E', title: 'Interagir / Mestre' },
  { action: 'jump', label: '⤒', title: 'Pular' },
  { action: 'dodge', label: '⇆', title: 'Esquiva' }
];

const ROOM_LABELS = {
  start: 'Entrada',
  combat: 'Combate',
  trap: 'Armadilha',
  treasure: 'Tesouro',
  shrine: 'Santuário',
  puzzle: 'Enigma',
  merchant: 'Mercador',
  npc: 'Encontro NPC',
  boss: 'Chefe do Andar'
};

const ROOM_ICONS = {
  start: '🧭',
  combat: '⚔️',
  trap: '⚠️',
  treasure: '💎',
  shrine: '✨',
  puzzle: '🧩',
  merchant: '🧙',
  npc: '🧙',
  boss: '👑'
};

const DIR_OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };

const DEFAULT_WEAPON = {
  id: 'natural_claws',
  name: 'Garras Naturais',
  icon: '🐾',
  bonus: 0,
  perk: 'Armas naturais do dinossauro',
  cost: 0,
  desc: 'Confiáveis no início, mas o Ferreiro Fóssil pode forjar algo muito mais letal.'
};

const RUNE_RIDDLES = [
  {
    q: 'Tenho coroa mas não sou rei, rugo nas trevas e guardo a porta do próximo andar. Quem sou eu?',
    options: [
      { label: 'O Chefe do Andar', correct: true },
      { label: 'Uma Poção de Âmbar', correct: false },
      { label: 'Uma Pedra Comum', correct: false }
    ]
  },
  {
    q: 'Quanto mais você explora minhas salas, mais eu desapareço — até um pergaminho me apagar por completo. O que sou?',
    options: [
      { label: 'A Névoa de Guerra do Mapa', correct: true },
      { label: 'O Martelo Sísmico', correct: false },
      { label: 'A Mochila do Mercador', correct: false }
    ]
  },
  {
    q: 'Tenho vinte faces, decido o destino entre glória crítica e falha desastrosa. O que sou?',
    options: [
      { label: 'O Dado D20', correct: true },
      { label: 'Um Escudo de Obsidiana', correct: false },
      { label: 'Uma Tocha da Cripta', correct: false }
    ]
  }
];

const SCOPED_CSS = `
  .m3d-dng-cambar {
    position: absolute;
    bottom: 12px;
    left: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    pointer-events: auto;
    z-index: 4;
  }
  .m3d-dng-cam-hint {
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 11px;
    color: #cbd5e1;
    background: rgba(9, 9, 11, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    pointer-events: none;
  }
  .m3d-dng-hero-bar {
    position: absolute;
    top: 62px;
    left: 14px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 7px 12px;
    border-radius: 12px;
    background: rgba(9, 9, 11, 0.86);
    border: 1px solid rgba(251, 191, 36, 0.25);
    backdrop-filter: blur(10px);
    font-size: 12px;
    pointer-events: auto;
  }
  .m3d-dng-weapon-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #fde68a;
    font-weight: 700;
  }
  .m3d-dng-buff-pill {
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(52, 211, 153, 0.18);
    border: 1px solid rgba(52, 211, 153, 0.45);
    color: #6ee7b7;
    font-weight: 700;
    font-size: 11px;
  }
  .m3d-mm-wrap {
    position: absolute;
    top: 64px;
    right: 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    pointer-events: auto;
  }
  .m3d-mm-badge {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    background: rgba(9, 9, 11, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #a1a1aa;
    backdrop-filter: blur(8px);
  }
  .m3d-mm-badge.is-revealed {
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.55);
    box-shadow: 0 0 14px rgba(16, 185, 129, 0.28);
  }
  .m3d-mm-wrap .m3d-minimap {
    position: static;
    gap: 4px;
    padding: 9px;
  }
  .m3d-mm-cell {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    display: grid;
    place-items: center;
    font-size: 11px;
    line-height: 1;
  }
  .m3d-mm-cell.is-fog {
    background: rgba(39, 39, 42, 0.65);
    border: 1px dashed rgba(161, 161, 170, 0.38);
    color: #a1a1aa;
    font-weight: 800;
  }
  .m3d-mm-cell.is-npc,
  .m3d-mm-cell.is-merchant { background: rgba(168, 85, 247, 0.72); }
  .m3d-mm-cell.is-trap { background: rgba(249, 115, 22, 0.75); }
  .m3d-mm-cell.is-shrine,
  .m3d-mm-cell.is-puzzle { background: rgba(56, 189, 248, 0.68); }
  .m3d-npc-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(24, 24, 27, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.14);
    margin-bottom: 8px;
  }
  .m3d-npc-avatar {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-size: 24px;
    flex-shrink: 0;
    background: rgba(9, 9, 11, 0.9);
    border: 2px solid #38bdf8;
  }
  .m3d-npc-meta { font-size: 12px; color: #d4d4d8; line-height: 1.35; }
  .m3d-npc-meta b { color: #f4f4f5; font-size: 13px; }
  .m3d-ruling-target {
    margin-top: 4px;
    padding: 5px 8px;
    border-radius: 8px;
    background: rgba(34, 211, 238, 0.12);
    border: 1px solid rgba(34, 211, 238, 0.32);
    color: #bae6fd;
    font-weight: 600;
    font-size: 12px;
  }
  .m3d-tier-banner {
    margin-bottom: 8px;
    padding: 9px 12px;
    border-radius: 12px;
    border: 1.5px solid currentColor;
    background: rgba(9, 9, 11, 0.92);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    animation: m3d-tier-in 0.24s ease-out;
  }
  .m3d-tier-title { font-size: 15px; font-weight: 900; letter-spacing: 0.04em; }
  .m3d-tier-detail { font-size: 12px; color: #e4e4e7; margin-top: 2px; }
  @keyframes m3d-tier-in {
    from { opacity: 0; transform: translateY(6px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .m3d-hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
    margin: 12px 0;
    max-height: 280px;
    overflow-y: auto;
  }
  .m3d-hero-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(24, 24, 27, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.12);
    font-size: 12px;
  }
  .m3d-hero-item.is-equipped {
    border-color: rgba(251, 191, 36, 0.65);
    background: rgba(251, 191, 36, 0.1);
  }
  @media (max-width: 640px) {
    .m3d-dng-top {
      z-index: 6;
      gap: 6px;
    }
    .m3d-dng-top .m3d-btn {
      padding: 6px 8px;
      font-size: 11px;
    }
    .m3d-dng-hero-bar {
      top: 142px;
      left: 10px;
      padding: 5px 9px;
      font-size: 11px;
      max-width: calc(100vw - 132px);
    }
    .m3d-mm-wrap {
      top: 142px;
      right: 10px;
      gap: 4px;
      z-index: 4;
    }
    .m3d-mm-wrap .m3d-minimap {
      padding: 6px;
      gap: 3px;
    }
    .m3d-mm-cell {
      width: 17px;
      height: 17px;
      font-size: 9px;
    }
    .m3d-dng-cambar {
      bottom: 164px;
      left: 10px;
      gap: 4px;
    }
    .m3d-dng-cambar .m3d-btn {
      padding: 5px 8px;
      font-size: 11px;
    }
    .m3d-dng-cam-hint {
      display: none;
    }
  }
`;

export class DungeonRPGMode extends Mode3DBase {
  constructor(game, opts = {}) {
    super(game, { ...opts, modeId: opts.rush ? 'dungeon_rush' : 'dungeon_rpg' });
    this.isRush = !!opts.rush || opts.modeId === 'dungeon_rush';
    this.maxFloors = this.isRush ? Infinity : (opts.maxFloors || 5);
    this.seed = opts.seed || `dng-${Date.now()}`;
    this.floorNum = 1;
    this.floorData = null;
    this.currentRoom = null;

    this.roomGroup = null;
    this.roomBuilt = null;
    this.wallColliders = [];
    this.doorAnchors = [];
    this.enemyActor = null;
    this.npcActor = null;
    this.portalMesh = null;
    this.interactableMeshes = [];

    this.player = null;
    this.relics = [];
    this.weapons = [{ ...DEFAULT_WEAPON }];
    this.equippedWeapon = this.weapons[0];
    this.potions = 1;
    this.smokeBombs = 0;
    this.eggsEarned = 0;
    this.roomsCleared = 0;
    this.mapRevealed = false;
    this.nextRollAdvantage = 0;
    this.allyAidCharges = 0;
    this.bossTipRevealed = false;
    this._activeRiddle = null;

    this.aiClient = new AIDungeonClient();
    this.diceRoller = null;
    this.panelOpen = false;
    this.heroModalOpen = false;
    this.busy = false;
    this.diceTrayOpen = false;
    this.lastRuling = null;
    this.logLines = [];
    this._doorCooldown = 0;
    this._hud = {};
    this._tmpW = { x: 0, z: 0 };
  }

  async mount() {
    this.mountBase({
      background: '#0b0d14',
      fog: { color: '#111522', near: 18, far: 54 },
      clearColor: '#0b0d14',
      touchActions: DUNGEON_TOUCH,
      cameraOpts: {
        preset: 'isometric',
        minDistance: 5.5,
        maxDistance: 19,
        onPresetChange: () => this._syncCameraHud()
      }
    });

    const styleEl = document.createElement('style');
    styleEl.textContent = SCOPED_CSS;
    this.overlay.appendChild(styleEl);

    this.group.add(buildModeLights({
      sky: '#c7d2fe', ground: '#1e1b4b', sun: '#fde68a', intensity: 0.95,
      shadows: !this.lowSpec && !!Save?.data?.settings?.shadows
    }));

    this._spawnPlayer();
    this._buildOverlayHud();

    // Inicializa DiceRoller3D em camada dedicada dentro do overlay
    const diceLayer = document.createElement('div');
    diceLayer.className = 'm3d-dice-layer';
    this.overlay.appendChild(diceLayer);
    try {
      this.diceRoller = new DiceRoller3D(diceLayer, { lowSpec: this.lowSpec });
    } catch {
      this.diceRoller = null;
    }

    this._loadFloor(1);
    this._syncCameraHud();
    this.onResize(this.viewportW, this.viewportH);
  }

  _spawnPlayer() {
    const dinoId = resolveDinoId(this.game, this.opts, 0);
    const spec = getDinoSpec(dinoId);
    const avatar = new DinoAvatar(dinoId, {
      mover: { x: 0, z: 4, yaw: 0, radius: 0.72, speed: 7.2, dashSpeed: 17 },
      tint: '#22d3ee'
    });
    this.group.add(avatar.root);
    const maxHp = 10 + (spec?.stats?.hp || 4) * 2;
    this.player = {
      dinoId,
      name: spec?.name || dinoId,
      spec,
      avatar,
      mover: avatar.mover,
      controls: new PlayerControls(this.keys, DUNGEON_P1_BINDINGS, this.touch),
      maxHp,
      hp: maxHp
    };
  }

  _loadFloor(floorNum) {
    this.floorNum = floorNum;
    this.mapRevealed = false;
    this.bossTipRevealed = false;
    const rollers = { rollDungeonEncounter, rollDungeonTrap, rollDungeonRelic, rollDungeonRoomEvent };
    this.floorData = generateFloor(floorNum, this.seed, this.opts.themeId || null, rollers);
    const theme = DUNGEON_THEMES?.[this.floorData.themeId];
    if (theme?.palette?.fog) {
      this.scene.background = new THREE.Color(theme.palette.fog);
      this.scene.fog = new THREE.Fog(theme.palette.fog, 16, 48);
    }
    this._enterRoom(this.floorData.startRoomId, null);
    this.banner(
      `ANDAR ${floorNum}${this.isRush ? ' · RUSH' : ` / ${this.maxFloors}`}`,
      theme?.name || this.floorData.themeId,
      'is-cyan',
      1550
    );
  }

  _enterRoom(roomId, enteredFromDir) {
    const room = this.floorData.roomsById[roomId];
    if (!room) return;
    this.currentRoom = room;
    room.visited = true;
    this._doorCooldown = 0.75;
    this._activeRiddle = null;

    // Limpa sala anterior
    if (this.roomGroup) {
      this.roomBuilt?.dispose?.();
      this.enemyActor?.dispose?.();
      this.npcActor?.dispose?.();
      this.enemyActor = null;
      this.npcActor = null;
      this.portalMesh = null;
      this.interactableMeshes = [];
      disposeObject3D(this.roomGroup);
      this.roomGroup = null;
    }

    const rg = new THREE.Group();
    rg.name = `dng_room_${room.id}`;
    this.roomGroup = rg;
    this.group.add(rg);

    // Constrói sala 3D via DungeonProps (com fallback geométrico seguro)
    this.wallColliders = [];
    this.doorAnchors = [];
    try {
      const built = buildDungeonRoomMeshes(
        { w: room.w, h: room.h, doors: room.doorList, seed: room.seed, type: room.type },
        this.floorData.themeId
      );
      if (built?.group) {
        this.roomBuilt = built;
        rg.add(built.group);
        if (Array.isArray(built.wallColliders)) this.wallColliders = built.wallColliders;
        if (Array.isArray(built.doorAnchors)) this.doorAnchors = built.doorAnchors;
      }
    } catch { /* fallback abaixo */ }

    const hw = room.w / 2;
    const hh = room.h / 2;
    if (!this.roomBuilt) {
      const floorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(room.w, 0.5, room.h),
        new THREE.MeshStandardMaterial({ color: '#1e2433', roughness: 0.9 })
      );
      floorMesh.position.y = -0.25;
      floorMesh.receiveShadow = true;
      rg.add(floorMesh);
    }

    // Garante âncoras de portas para cada ligação N/S/E/W
    const defaultAnchors = {
      N: { dir: 'N', x: 0, z: -hh + 1.1 },
      S: { dir: 'S', x: 0, z: hh - 1.1 },
      E: { dir: 'E', x: hw - 1.1, z: 0 },
      W: { dir: 'W', x: -hw + 1.1, z: 0 }
    };
    const anchorByDir = new Map(this.doorAnchors.map((a) => [a.dir, a]));
    this.doorAnchors = room.doorList.map((dir) => anchorByDir.get(dir) || defaultAnchors[dir]);

    // Indicadores luminosos nas portas (verde se liberada, vermelho se trancada)
    const doorsOpen = room.cleared || room.type === 'start' || room.type === 'npc' || room.type === 'merchant';
    this._doorMarkers = [];
    for (const a of this.doorAnchors) {
      const pad = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 1.1, 24),
        new THREE.MeshBasicMaterial({ color: doorsOpen ? '#10b981' : '#ef4444', side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(a.x, 0.05, a.z);
      rg.add(pad);
      this._doorMarkers.push({ dir: a.dir, x: a.x, z: a.z, pad });
    }

    // Spawna inimigo 3D, NPC voxel 3D, ou ponto de interação central
    if (!room.cleared && (room.type === 'combat' || room.type === 'boss') && room.encounter) {
      this._spawnRoomEnemy(room.encounter);
    } else if (room.npcId) {
      this._spawnRoomNpc(room.npcId);
    } else if (!room.cleared && room.type !== 'start') {
      const color = room.type === 'treasure' ? '#f59e0b' : room.type === 'shrine' ? '#22d3ee' : '#ef4444';
      const prop = buildSculptedInteractable(room.type, color);
      prop.position.set(0, 0.72, -1.5);
      rg.add(prop);
      this.interactableMeshes.push({ mesh: prop, x: 0, z: -1.5, kind: room.type });
    }

    // Se sala de chefe já estiver limpa, cria portal de próximo andar
    if (room.type === 'boss' && room.cleared) this._spawnFloorPortal();

    // Posiciona jogador perto da porta de entrada (ou no sul na sala inicial)
    const spawn = enteredFromDir ? defaultAnchors[DIR_OPPOSITE[enteredFromDir]] : { x: 0, z: hh - 3 };
    const sx = clamp((spawn?.x || 0) * 0.65, -hw + 2.5, hw - 2.5);
    const sz = clamp((spawn?.z || 3) * 0.65, -hh + 2.5, hh - 2.5);
    this.player.mover.pos.set(sx, 0, sz);
    this.player.mover.vel.set(0, 0);
    this.player.mover.yaw = 0;
    this.rig.snap(this.player.mover.pos);

    this._renderMinimap();
    this._syncStatusHud();
  }

  _spawnRoomEnemy(enc) {
    let model = null;
    try {
      model = buildDungeonEnemyModel(enc.archetype || 'skeleton_raptor', this.floorData.themeId);
    } catch {
      const root = new THREE.Group();
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.8, 1.4),
        new THREE.MeshStandardMaterial({ color: enc.isBoss ? '#dc2626' : '#f97316', roughness: 0.5 })
      );
      m.position.y = 0.9;
      root.add(m);
      model = { root, hitBoxRadius: 1.1, animate() {}, dispose() { disposeObject3D(root); } };
    }
    if (enc.isBoss) model.root.scale.setScalar(1.55);
    model.root.position.set(0, 0, -2.5);
    this.roomGroup.add(model.root);
    this.enemyActor = { model, state: 'idle', stateTimer: 0, x: 0, z: -2.5 };
  }

  _spawnRoomNpc(npcId) {
    let model = null;
    try {
      model = buildDungeonNpcModel(npcId);
    } catch {
      const root = new THREE.Group();
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.8, 1.1),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.4 })
      );
      m.position.y = 0.9;
      root.add(m);
      model = { root, npcId, npc: DUNGEON_NPCS[npcId], hitBoxRadius: 0.9, animate() {}, dispose() { disposeObject3D(root); } };
    }
    model.root.position.set(0, 0, -2.0);
    this.roomGroup.add(model.root);
    this.npcActor = { model, npcId, npc: DUNGEON_NPCS[npcId] || DUNGEON_NPCS.jurassic_oracle, x: 0, z: -2.0 };
  }

  _spawnFloorPortal() {
    if (this.portalMesh) return;
    const g = buildSculptedDungeonPortal('#38bdf8');
    g.scale.setScalar(0.78);
    g.position.set(0, 0, -2.5);
    this.roomGroup.add(g);
    this.portalMesh = g;
  }

  _buildOverlayHud() {
    const el = document.createElement('div');
    el.className = 'm3d-hud-layer';
    el.innerHTML = `
      <div class="m3d-dng-top">
        <div class="m3d-dng-stats">
          <div class="m3d-dng-badge" data-floor>ANDAR 1</div>
          <div class="m3d-dng-stat">${uiIcon('heart', { size: 14, color: '#f87171' })} <b data-hp>18/18</b></div>
          <div class="m3d-dng-stat">${uiIcon('egg', { size: 14, color: '#fbbf24' })} <b data-eggs>0</b></div>
          <div class="m3d-dng-stat">${uiIcon('sparkle', { size: 14, color: '#34d399' })} <b data-potions>1</b></div>
          <div class="m3d-dng-stat">${uiIcon('trophy', { size: 14, color: '#a855f7' })} <b data-relics>0</b></div>
        </div>
        <div class="m3d-dng-room-pill" data-room-pill>Entrada</div>
        <div class="m3d-dng-actions">
          <button type="button" class="m3d-btn m3d-btn-ghost" data-act="hero-sheet">${uiIcon('backpack', { size: 15 })} Ficha</button>
          <button type="button" class="m3d-btn m3d-btn-ghost" data-act="dice-tray">${uiIcon('dice', { size: 15 })} Dados</button>
          <button type="button" class="m3d-btn m3d-btn-primary" data-act="open-dm">${uiIcon('scroll', { size: 15 })} Mestre [E]</button>
          <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">${uiIcon('close', { size: 15 })} Menu</button>
        </div>
      </div>

      <div class="m3d-dng-hero-bar">
        <span class="m3d-dng-weapon-pill" data-weapon-bar>${uiIcon('claw', { size: 14 })} Garras Naturais (+0 nos dados)</span>
        <span class="m3d-dng-buff-pill" data-buff-pill style="display:none"></span>
      </div>

      <div class="m3d-mm-wrap">
        <div class="m3d-mm-badge" data-mm-badge>${uiIcon('openworld', { size: 13 })} Névoa</div>
        <div class="m3d-minimap" data-minimap aria-label="Minimapa da Masmorra"></div>
      </div>

      <div class="m3d-dng-cambar">
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="cam-cycle">[C] ${uiIcon('camera', { size: 15 })} Câmera: Isométrica</button>
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="zoom-out" title="Afastar câmera">${uiIcon('zoomOut', { size: 15 })}</button>
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="zoom-in" title="Aproximar câmera">${uiIcon('zoomIn', { size: 15 })}</button>
        <span class="m3d-dng-cam-hint">Arraste para girar a câmera · Scroll zoom</span>
      </div>

      <div class="m3d-prompt-pill" data-prompt style="display:none">Pressione <b>[E]</b> para interagir</div>

      <div class="m3d-rpg-panel" data-rpg-panel style="display:none">
        <div class="m3d-rpg-head">
          <div>
            <div class="m3d-rpg-eyebrow" data-rpg-type>ENCONTRO RPG</div>
            <h3 class="m3d-rpg-title" data-rpg-title>Sala</h3>
          </div>
          <div class="m3d-rpg-enemy-hp" data-rpg-enemy-hp></div>
          <button type="button" class="m3d-btn m3d-btn-ghost" data-act="close-dm">✕</button>
        </div>
        <div class="m3d-npc-banner" data-npc-banner style="display:none"></div>
        <div class="m3d-tier-banner" data-tier-banner style="display:none"></div>
        <div class="m3d-rpg-log" data-rpg-log></div>
        <div class="m3d-rpg-ruling" data-rpg-ruling style="display:none"></div>
        <div class="m3d-rpg-suggestions" data-rpg-sugs></div>
        <form class="m3d-rpg-form" data-rpg-form>
          <input type="text" class="m3d-input" data-rpg-input maxlength="200" placeholder="Escreva qualquer ação que seu dino quiser tentar..." autocomplete="off" />
          <button type="submit" class="m3d-btn m3d-btn-primary" data-rpg-send>Enviar ao Mestre</button>
        </form>
      </div>

      <div class="m3d-dice-tray" data-dice-tray style="display:none">
        <div class="m3d-tray-head">
          <span>${uiIcon('dice', { size: 15, color: '#fbbf24' })} Bandeja Manual de Dados</span>
          <button type="button" class="m3d-btn m3d-btn-ghost" data-act="close-tray">${uiIcon('close', { size: 14 })}</button>
        </div>
        <div class="m3d-tray-grid">
          ${SUPPORTED_DICE.map((d) => `<button type="button" class="m3d-btn m3d-btn-ghost m3d-die-btn" data-roll-die="${d}">${d.toUpperCase()}</button>`).join('')}
        </div>
      </div>
    `;
    this.overlay.appendChild(el);

    this._hud = {
      floor: el.querySelector('[data-floor]'),
      hp: el.querySelector('[data-hp]'),
      eggs: el.querySelector('[data-eggs]'),
      potions: el.querySelector('[data-potions]'),
      relics: el.querySelector('[data-relics]'),
      weaponBar: el.querySelector('[data-weapon-bar]'),
      buffPill: el.querySelector('[data-buff-pill]'),
      roomPill: el.querySelector('[data-room-pill]'),
      mmBadge: el.querySelector('[data-mm-badge]'),
      minimap: el.querySelector('[data-minimap]'),
      camBtn: el.querySelector('[data-act="cam-cycle"]'),
      prompt: el.querySelector('[data-prompt]'),
      panel: el.querySelector('[data-rpg-panel]'),
      npcBanner: el.querySelector('[data-npc-banner]'),
      tierBanner: el.querySelector('[data-tier-banner]'),
      rpgType: el.querySelector('[data-rpg-type]'),
      rpgTitle: el.querySelector('[data-rpg-title]'),
      rpgEnemyHp: el.querySelector('[data-rpg-enemy-hp]'),
      rpgLog: el.querySelector('[data-rpg-log]'),
      rpgRuling: el.querySelector('[data-rpg-ruling]'),
      rpgSugs: el.querySelector('[data-rpg-sugs]'),
      rpgForm: el.querySelector('[data-rpg-form]'),
      rpgInput: el.querySelector('[data-rpg-input]'),
      rpgSend: el.querySelector('[data-rpg-send]'),
      diceTray: el.querySelector('[data-dice-tray]')
    };

    this.listen(el.querySelector('[data-act="exit"]'), 'click', () => this.requestExit({ floor: this.floorNum, eggs: this.eggsEarned }));
    this.listen(el.querySelector('[data-act="open-dm"]'), 'click', () => this._openEncounterPanel());
    this.listen(el.querySelector('[data-act="close-dm"]'), 'click', () => this._closeEncounterPanel());
    this.listen(el.querySelector('[data-act="dice-tray"]'), 'click', () => this._toggleDiceTray());
    this.listen(el.querySelector('[data-act="close-tray"]'), 'click', () => this._toggleDiceTray(false));
    this.listen(el.querySelector('[data-act="hero-sheet"]'), 'click', () => this._openHeroSheetModal());
    this.listen(el.querySelector('[data-act="cam-cycle"]'), 'click', () => this._cycleCameraPreset());
    this.listen(el.querySelector('[data-act="zoom-out"]'), 'click', () => this.rig?.adjustZoom(1.6));
    this.listen(el.querySelector('[data-act="zoom-in"]'), 'click', () => this.rig?.adjustZoom(-1.6));

    for (const btn of el.querySelectorAll('[data-roll-die]')) {
      this.listen(btn, 'click', () => this._rollManualDie(btn.dataset.rollDie));
    }

    this.listen(this._hud.rpgForm, 'submit', (e) => {
      e.preventDefault();
      const text = this._hud.rpgInput.value.trim();
      if (!text || this.busy) return;
      this._hud.rpgInput.value = '';
      this._submitActionToDM(text);
    });
  }

  _cycleCameraPreset() {
    if (!this.rig) return;
    const preset = this.rig.cyclePreset();
    this._syncCameraHud();
    if (preset) this.toast(`🎥 Câmera: ${preset.label}`, 'is-amber');
  }

  _syncCameraHud() {
    if (!this._hud.camBtn || !this.rig) return;
    this._hud.camBtn.innerHTML = `[C] ${uiIcon('camera', { size: 15 })} Câmera: ${escapeHtml(this.rig.getPresetLabel())}`;
  }

  _toggleDiceTray(force) {
    this.diceTrayOpen = force !== undefined ? force : !this.diceTrayOpen;
    this._hud.diceTray.style.display = this.diceTrayOpen ? '' : 'none';
  }

  async _rollManualDie(diceType) {
    if (this.busy) return;
    this.busy = true;
    try {
      const res = this.diceRoller
        ? await this.diceRoller.roll({ diceType, count: 1, label: `Rolagem Manual ${diceType.toUpperCase()}`, lowSpec: this.lowSpec })
        : { total: 1 + Math.floor(Math.random() * Number(diceType.slice(1) || 20)), diceType };
      this.toast(`🎲 ${diceType.toUpperCase()}: ${res.total}${res.isCrit ? ' (CRÍTICO!)' : res.isFumble ? ' (FALHA CRÍTICA!)' : ''}`, res.isCrit ? 'is-amber' : '');
    } finally {
      this.busy = false;
    }
  }

  _openHeroSheetModal() {
    if (this.heroModalOpen) return;
    this.heroModalOpen = true;
    this.keys.enabled = false;

    const modal = document.createElement('div');
    modal.className = 'm3d-modal-backdrop m3d-hero-modal';
    const renderModal = () => {
      const weaponItems = this.weapons.map((w) => {
        const eq = this.equippedWeapon?.id === w.id;
        return `
          <div class="m3d-hero-item ${eq ? 'is-equipped' : ''}">
            <div>
              <b>${escapeHtml(w.icon)} ${escapeHtml(w.name)} (+${w.bonus} nos dados)</b>
              <div style="color:#a1a1aa">${escapeHtml(w.perk || w.desc)}</div>
            </div>
            ${eq
              ? '<span class="m3d-badge-ok">Equipada</span>'
              : `<button type="button" class="m3d-btn m3d-btn-primary" data-equip-weapon="${escapeHtml(w.id)}">Equipar</button>`}
          </div>`;
      }).join('');

      const relicItems = this.relics.length
        ? this.relics.map((r) => `<div class="m3d-hero-item"><span>🏺 <b>${escapeHtml(r.name)}</b></span><span style="color:#6ee7b7">${escapeHtml(r.bonus || '+Poder')}</span></div>`).join('')
        : '<div class="m3d-hero-item" style="color:#a1a1aa">Nenhuma relíquia coletada ainda.</div>';

      modal.innerHTML = `
        <div class="m3d-modal" style="width:min(520px,calc(100% - 28px));text-align:left">
          <div class="m3d-modal-eyebrow">FICHA DO HERÓI · ANDAR ${this.floorNum}</div>
          <h2 class="m3d-modal-title" style="font-size:20px">${escapeHtml(this.player.name)}</h2>
          <p class="m3d-modal-sub" style="margin-bottom:10px">
            ❤️ HP: <b>${this.player.hp}/${this.player.maxHp}</b> ·
            🥚 Ovos: <b>${this.eggsEarned}</b> ·
            🧪 Poções: <b>${this.potions}</b> ·
            🗺️ Mapa: <b>${this.mapRevealed ? 'Revelado!' : 'Névoa'}</b>
          </p>
          <div style="font-size:12px;font-weight:700;color:#fde68a;margin-bottom:4px">🗡️ ARMAS (${this.weapons.length})</div>
          <div class="m3d-hero-grid">${weaponItems}</div>
          <div style="font-size:12px;font-weight:700;color:#67e8f9;margin-bottom:4px">🏺 RELÍQUIAS (${this.relics.length})</div>
          <div class="m3d-hero-grid" style="max-height:110px">${relicItems}</div>
          <div class="m3d-modal-actions" style="margin-top:12px">
            <button type="button" class="m3d-btn m3d-btn-primary" data-act="drink-potion" ${this.potions <= 0 || this.player.hp >= this.player.maxHp ? 'disabled' : ''}>🧪 Beber Poção (+4 HP)</button>
            <button type="button" class="m3d-btn m3d-btn-ghost" data-act="close-hero">Fechar</button>
          </div>
        </div>`;

      modal.querySelector('[data-act="close-hero"]')?.addEventListener('click', () => {
        modal.remove();
        this.heroModalOpen = false;
        if (!this.panelOpen) this.keys.enabled = true;
      });
      modal.querySelector('[data-act="drink-potion"]')?.addEventListener('click', () => {
        if (this.potions <= 0 || this.player.hp >= this.player.maxHp) return;
        this.potions -= 1;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 4);
        this.sfx('coin');
        this.toast('🧪 Poção de Âmbar bebida! +4 HP', 'is-emerald');
        this._syncStatusHud();
        renderModal();
      });
      for (const b of modal.querySelectorAll('[data-equip-weapon]')) {
        b.addEventListener('click', () => {
          const w = this.weapons.find((x) => x.id === b.dataset.equipWeapon);
          if (w) {
            this.equippedWeapon = w;
            this.toast(`${w.icon} Equipou ${w.name} (+${w.bonus})!`, 'is-amber');
            this._syncStatusHud();
            renderModal();
          }
        });
      }
    };
    renderModal();
    this.overlay.appendChild(modal);
  }

  _grantWeapon(weaponObj) {
    if (!weaponObj) return null;
    const existing = this.weapons.find((w) => w.id === weaponObj.id);
    if (existing) {
      if (existing.bonus < 4) {
        existing.bonus += 1;
        this.toast(`⚒️ ${existing.name} reforjada para +${existing.bonus}!`, 'is-amber');
      }
      if (existing.bonus >= (this.equippedWeapon?.bonus || 0)) this.equippedWeapon = existing;
      return existing;
    }
    const copy = { ...weaponObj };
    this.weapons.push(copy);
    if (copy.bonus >= (this.equippedWeapon?.bonus || 0)) {
      this.equippedWeapon = copy;
    }
    this._syncStatusHud();
    return copy;
  }

  _unlockFloorMap(sourceLabel = 'Mapa da Masmorra') {
    if (this.mapRevealed) return;
    this.mapRevealed = true;
    this.sfx('victory');
    this.banner('🗺️ MAPA DA MASMORRA REVELADO!', `Todo o Andar ${this.floorNum} está visível no minimapa`, 'is-emerald', 2000);
    this.logLines.push(`🗺️ ${sourceLabel}: Todas as salas, NPCs, tesouros e o Chefe do andar foram revelados!`);
    this._renderMinimap();
    this._syncStatusHud();
  }

  update(dt) {
    if (!this.mounted || this.isPaused()) return;
    const simDt = this.baseTick(dt);

    if (simDt > 0) {
      if (this._doorCooldown > 0) this._doorCooldown = Math.max(0, this._doorCooldown - simDt);

      // Tecla [C] alterna presets de câmera (Isométrica / 3ª Pessoa / Topo)
      if (!this.panelOpen && !this.heroModalOpen && this.keys.pressed(['KeyC'])) {
        this._cycleCameraPreset();
      }

      // Anima inimigo, NPC, portal e orbes
      if (this.enemyActor) {
        if (this.enemyActor.stateTimer > 0) {
          this.enemyActor.stateTimer -= simDt;
          if (this.enemyActor.stateTimer <= 0 && this.enemyActor.state !== 'dead') this.enemyActor.state = 'idle';
        }
        try { this.enemyActor.model.animate?.(this.elapsed, this.enemyActor.state); } catch { /* noop */ }
      }
      if (this.npcActor) {
        try { this.npcActor.model.animate?.(this.elapsed); } catch { /* noop */ }
      }
      if (this.portalMesh) {
        if (this.portalMesh.userData?.ring) this.portalMesh.userData.ring.rotation.z += simDt * 1.6;
        if (this.portalMesh.userData?.crownGem) this.portalMesh.userData.crownGem.rotation.y += simDt * 2.0;
      }
      for (const it of this.interactableMeshes) {
        it.mesh.rotation.y += simDt * 1.6;
        it.mesh.position.y = 0.72 + Math.sin(this.elapsed * 3) * 0.1;
      }

      // Movimento livre 360° quando os painéis estão fechados
      const p = this.player;
      const m = p.mover;
      if (!this.panelOpen && !this.heroModalOpen) {
        const mv = p.controls.move();
        this.rig.toWorld(mv.x, mv.y, this._tmpW);
        if (p.controls.pressed('jump')) m.jump();
        if (p.controls.pressed('dodge')) m.dodge(this._tmpW.x, this._tmpW.z);
        m.step(simDt, this._tmpW.x, this._tmpW.z);
        const hw = (this.currentRoom?.w || 18) / 2 - 0.8;
        const hh = (this.currentRoom?.h || 18) / 2 - 0.8;
        m.clampToBounds({ minX: -hw, maxX: hw, minZ: -hh, maxZ: hh });
        m.pushOutRects(this.wallColliders);
        this._checkRoomTriggers(p.controls.pressed('interact'));
      } else {
        m.step(simDt, 0, 0, { rooted: true });
      }

      p.avatar.sync(simDt);
      this.rig.update(simDt, m.pos, 0, m.yaw);
    }

    this.baseEndFrame(dt);
  }

  _checkRoomTriggers(interactPressed) {
    const room = this.currentRoom;
    if (!room) return;
    const pos = this.player.mover.pos;
    let promptText = '';

    // 1) NPC 3D interativo na sala
    if (this.npcActor) {
      const distNpc = Math.hypot(pos.x - this.npcActor.x, pos.z - this.npcActor.z);
      if (distNpc < 4.4) {
        const npc = this.npcActor.npc;
        promptText = `Pressione <b>[E]</b> — Falar com ${escapeHtml(npc.icon)} <b>${escapeHtml(npc.name)}</b> (${escapeHtml(npc.title)})`;
        if (interactPressed || (distNpc < 2.0 && !room.npcInteracted)) {
          room.npcInteracted = true;
          this._openEncounterPanel();
          return;
        }
      }
    }

    // 2) Encontro / Interação ativa no centro da sala
    if (!this.npcActor && !room.cleared && room.type !== 'start') {
      const tx = this.enemyActor ? this.enemyActor.x : 0;
      const tz = this.enemyActor ? this.enemyActor.z : -1.5;
      const dist = Math.hypot(pos.x - tx, pos.z - tz);
      if (dist < 4.2) {
        promptText = `Pressione <b>[E]</b> — ${escapeHtml(ROOM_LABELS[room.type] || 'Encontro')}`;
        if (interactPressed || dist < 2.2) {
          this._openEncounterPanel();
          return;
        }
      }
    }

    // 3) Portal do próximo andar na sala do chefe limpa
    if (this.portalMesh) {
      const distP = Math.hypot(pos.x, pos.z + 2.5);
      if (distP < 2.4) {
        promptText = 'Pressione <b>[E]</b> — Avançar ao Próximo Andar';
        if (interactPressed || distP < 1.35) {
          this._advanceFloor();
          return;
        }
      }
    }

    // 4) Atalho universal [E] para abrir o Painel do Mestre IA em qualquer sala (consistente com botão "📜 Mestre [E]")
    if (interactPressed) {
      this._openEncounterPanel();
      return;
    }

    // 5) Portas N/S/E/W (destrancadas quando a sala está limpa, start ou NPC)
    const doorsOpen = room.cleared || room.type === 'start' || room.type === 'npc' || room.type === 'merchant';
    if (this._doorCooldown <= 0) {
      for (const d of this._doorMarkers || []) {
        const distD = Math.hypot(pos.x - d.x, pos.z - d.z);
        if (distD < 1.7) {
          if (doorsOpen) {
            this._enterRoom(room.doors[d.dir], d.dir);
            return;
          } else {
            promptText = '🔒 Resolva a sala para destrancar as portas!';
          }
        }
      }
    }

    if (promptText) {
      this._hud.prompt.innerHTML = promptText;
      this._hud.prompt.style.display = '';
    } else {
      this._hud.prompt.style.display = 'none';
    }
  }

  _buildDMContext(actionText = '') {
    const r = this.currentRoom;
    const npc = r?.npcId ? DUNGEON_NPCS[r.npcId] : null;
    return {
      floor: this.floorNum,
      themeId: this.floorData?.themeId || 'crypt',
      roomType: r?.type || 'combat',
      roomCleared: !!r?.cleared,
      npcName: npc ? `${npc.name} (${npc.title})` : null,
      dinoId: this.player.dinoId,
      dinoName: this.player.name,
      dinoClass: this.player.spec?.dinoClass || 'carnivore',
      dinoStats: this.player.spec?.stats || { attack: 5, defense: 4, speed: 5 },
      weaponBonus: this.equippedWeapon?.bonus || 0,
      weaponName: this.equippedWeapon?.name || '',
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      relics: this.relics.map((x) => x.name),
      enemy: r?.encounter ? {
        name: r.encounter.name,
        archetype: r.encounter.archetype,
        hp: r.encounter.hp,
        maxHp: r.encounter.maxHp,
        dcBase: r.encounter.dcBase,
        weakness: r.encounter.weakness
      } : null,
      trap: r?.trap || null,
      roomEvent: r?.roomEvent || null,
      actionText,
      lang: 'pt'
    };
  }

  _roomWeaponObj(r) {
    return DUNGEON_WEAPONS.find((w) => w.id === r?.weaponId) || DUNGEON_WEAPONS[Math.min(DUNGEON_WEAPONS.length - 1, this.floorNum)];
  }

  _npcChoicesForRoom(r) {
    const npcId = r?.npcId;
    const offerWeapon = this._roomWeaponObj(r);
    const curBonus = this.equippedWeapon?.bonus || 0;
    const upgradeCost = 30 + curBonus * 15;

    if (npcId === 'fossil_smith') {
      return [
        { key: 'npc:forge_weapon', label: `⚒️ Forjar ${offerWeapon.icon} ${offerWeapon.name} (+${offerWeapon.bonus}) — ${offerWeapon.cost} 🥚` },
        { key: 'npc:upgrade_weapon', label: `🔥 Melhorar ${this.equippedWeapon.name} para +${Math.min(4, curBonus + 1)} — ${upgradeCost} 🥚` },
        { key: 'npc:sharpen_free', label: '✨ Afiar garras na bigorna (+1 vantagem na próxima rolagem)' },
        { key: 'dm:Pedir ao Ferreiro Fóssil uma história ou segredo da masmorra', label: '💬 Conversar com Bronto-Forja (Mestre IA)' }
      ];
    }
    if (npcId === 'jurassic_oracle') {
      return [
        { key: 'npc:buy_map', label: this.mapRevealed ? '🗺️ Mapa já revelado neste andar' : '🗺️ Obter Mapa da Masmorra (20 🥚 — revela todo o andar!)' },
        { key: 'npc:boss_tip', label: '👑 Revelar fraqueza do Chefe + Vantagem +2 (15 🥚)' },
        { key: 'npc:oracle_bless', label: '💚 Receber Bênção Jurássica (+4 HP por 15 🥚)' },
        { key: 'dm:Consultar os ossos do Oráculo sobre o meu destino', label: '🔮 Consultar o Oráculo nos dados (Mestre IA)' }
      ];
    }
    if (npcId === 'wandering_merchant') {
      return [
        { key: 'npc:buy_potion', label: '🧪 Comprar Poção de Âmbar (+1 Poção — 15 🥚)' },
        { key: 'npc:buy_weapon', label: `🗡️ Comprar ${offerWeapon.icon} ${offerWeapon.name} (+${offerWeapon.bonus}) — ${offerWeapon.cost} 🥚` },
        { key: 'npc:buy_map', label: this.mapRevealed ? '💨 Comprar Bomba de Fumaça (20 🥚)' : '🗺️ Comprar Mapa da Masmorra (25 🥚)' },
        { key: 'npc:buy_relic', label: '🏺 Comprar Relíquia Rara (35 🥚)' }
      ];
    }
    if (npcId === 'wounded_hunter') {
      if (r.questDone) {
        return [
          { key: 'npc:boss_tip_free', label: '🧭 Pedir orientação sobre o caminho até o Chefe' },
          { key: 'dm:Treinar um golpe combinado com o Raptor-Batedor', label: '⚔️ Treinar golpe combinado (Mestre IA)' }
        ];
      }
      return [
        { key: 'npc:heal_hunter_potion', label: `🧪 Usar 1 Poção para curar o Caçador (ganha ${offerWeapon.name} + ajuda aliada!)` },
        { key: 'dm:Fazer primeiros socorros improvisados no Raptor-Batedor ferido', label: '🎲 Rolar dados de Primeiros Socorros (Mestre IA)' },
        { key: 'npc:hunter_map_tip', label: '🗺️ Ajudar o Caçador a se levantar e trocar informações do andar' },
        { key: 'dm:Inspecionar os rastros de quem emboscou o Caçador', label: '🔍 Investigar a emboscada (Mestre IA)' }
      ];
    }
    if (npcId === 'rune_guardian') {
      if (this._activeRiddle) {
        return this._activeRiddle.options.map((opt, idx) => ({
          key: `npc:riddle_ans:${idx}`,
          label: `🗿 Responder: "${opt.label}"`
        }));
      }
      return [
        { key: 'npc:start_riddle', label: '🗿 Aceitar o Enigma das Runas (recompensa mítica!)' },
        { key: 'dm:Canalizar energia ancestral para decifrar o selo rúnico', label: '🎲 Decifrar o selo nos dados (Mestre IA)' },
        { key: 'npc:rune_tribute', label: '🏺 Oferecer 20 🥚 em tributo por uma Relíquia Antiga' },
        { key: 'dm:Desafiar o Guardião de Runas em um teste de astúcia', label: '✨ Ação livre de mesa (Mestre IA)' }
      ];
    }
    return [];
  }

  _defaultSuggestionsForRoom() {
    const r = this.currentRoom;
    if (!r) return ['Avançar com cautela', 'Investigar o ambiente', 'Rugir para intimidar', 'Preparar defesa'];
    if (r.type === 'combat' || r.type === 'boss') {
      const wTag = this.equippedWeapon?.bonus > 0 ? ` com ${this.equippedWeapon.name}` : '';
      return [
        `Atacar ${r.encounter?.name || 'o inimigo'}${wTag}`,
        'Flanquear furtivamente buscando o ponto fraco',
        `Soltar ${this.player.spec?.ability || 'rugido intimidador'} para quebrar a guarda`,
        'Usar o terreno para uma esquiva acrobática e contra-ataque'
      ];
    }
    if (r.type === 'trap') {
      return [
        'Saltar agilmente sobre o mecanismo da armadilha',
        'Desarmar cuidadosamente o gatilho com as garras',
        'Lançar uma pedra para acionar a armadilha à distância',
        'Atravessar protegendo-se com as escamas'
      ];
    }
    if (r.type === 'treasure') {
      return [
        'Abrir o baú cuidadosamente checando armadilhas',
        'Inspecionar as runas ao redor da relíquia e do pergaminho',
        'Quebrar o selo do baú com um golpe direto',
        'Farejar magia oculta no tesouro'
      ];
    }
    return [
      'Investigar as inscrições antigas do santuário',
      'Oferecer um rugido de respeito ao altar',
      'Tocar o cristal central com cautela',
      'Recuar e contornar o enigma'
    ];
  }

  _openEncounterPanel() {
    if (this.panelOpen) return;
    this.panelOpen = true;
    this.keys.enabled = false;
    this.touch?.setVisible(false);
    this._hud.prompt.style.display = 'none';
    this._hud.panel.style.display = '';
    this._hud.rpgRuling.style.display = 'none';
    this._hud.tierBanner.style.display = 'none';

    const r = this.currentRoom;
    const npc = r?.npcId ? DUNGEON_NPCS[r.npcId] : null;
    this._hud.rpgType.textContent = `${ROOM_LABELS[r.type] || 'SALA'} · ANDAR ${this.floorNum}`;
    this._hud.rpgTitle.textContent = npc
      ? `${npc.icon} ${npc.name} — ${npc.title}`
      : (r.encounter?.name || r.trap?.name || r.relic?.name || r.roomEvent?.name || 'Câmara da Masmorra');

    if (npc) {
      this._hud.npcBanner.style.display = '';
      this._hud.npcBanner.innerHTML = `
        <div class="m3d-npc-avatar" style="border-color:${escapeHtml(npc.color)}">${escapeHtml(npc.icon)}</div>
        <div class="m3d-npc-meta">
          <div><b>${escapeHtml(npc.name)}</b> · <span style="color:${escapeHtml(npc.color)}">${escapeHtml(npc.title)}</span></div>
          <div>"${escapeHtml(npc.greeting)}"</div>
        </div>
      `;
    } else {
      this._hud.npcBanner.style.display = 'none';
    }

    if (this.logLines.length === 0 || this._lastRoomLogId !== r.id) {
      this._lastRoomLogId = r.id;
      this.logLines = [this._describeRoomIntro(r)];
    }
    this._renderPanelState(null);
  }

  _closeEncounterPanel() {
    this.panelOpen = false;
    if (!this.heroModalOpen) this.keys.enabled = true;
    this.touch?.setVisible(true);
    this._hud.panel.style.display = 'none';
  }

  _describeRoomIntro(r) {
    if (r.npcId) {
      const npc = DUNGEON_NPCS[r.npcId];
      return `${npc?.icon || '🧙'} Você encontra ${npc?.name || 'um viajante'} (${npc?.personality || 'aliado da masmorra'}). Escolha uma interação ou digite qualquer ação livre!`;
    }
    if (r.cleared) return 'Esta câmara já foi resolvida. As portas estão abertas.';
    if (r.encounter) return `Um ${r.encounter.name} (${r.encounter.hp}/${r.encounter.maxHp} HP) bloqueia a passagem! Fraqueza suspeita: ${r.encounter.weakness || 'desconhecida'}.`;
    if (r.trap) return `Armadilha detectada: ${r.trap.name}! (${r.trap.counterplay || 'Exige precisão'}).`;
    if (r.relic) {
      const mapHint = r.hasMapScroll ? ' + 🗺️ Pergaminho do Mapa da Masmorra!' : '';
      return `Um baú reluzente guarda "${r.relic.name}"${mapHint}`;
    }
    return `${r.roomEvent?.name || 'Um altar ancestral'} pulsa com energia misteriosa.`;
  }

  _renderPanelState(suggestions) {
    const r = this.currentRoom;
    if (r?.encounter && !r.cleared) {
      this._hud.rpgEnemyHp.innerHTML = `<span class="m3d-badge-dmg">HP ${r.encounter.hp}/${r.encounter.maxHp}</span>`;
    } else if (r?.npcId) {
      this._hud.rpgEnemyHp.innerHTML = '<span class="m3d-badge-ok">ZONA SEGURA · NPC</span>';
    } else {
      this._hud.rpgEnemyHp.innerHTML = r?.cleared ? '<span class="m3d-badge-ok">SALA LIMPA</span>' : '';
    }
    this._hud.rpgLog.innerHTML = this.logLines.slice(-5).map((line) => `<p>${escapeHtml(line)}</p>`).join('');

    // Se a sala tem NPC, mostra botões interativos do NPC (além da caixa de texto livre para o Mestre IA!)
    if (r?.npcId && !suggestions) {
      const choices = this._npcChoicesForRoom(r);
      this._hud.rpgSugs.innerHTML = choices
        .map((c) => `<button type="button" class="m3d-sug-btn" data-npc-key="${escapeHtml(c.key)}">${escapeHtml(c.label)}</button>`)
        .join('');
      for (const btn of this._hud.rpgSugs.querySelectorAll('[data-npc-key]')) {
        btn.addEventListener('click', () => {
          if (this.busy) return;
          const k = btn.dataset.npcKey;
          if (k.startsWith('dm:')) this._submitActionToDM(k.slice(3));
          else this._handleNpcChoice(k);
        });
      }
      return;
    }

    this._hud.rpgSugs.innerHTML = (suggestions || this._defaultSuggestionsForRoom())
      .slice(0, 4)
      .map((s) => `<button type="button" class="m3d-sug-btn" data-sug="${escapeHtml(s)}">${escapeHtml(s)}</button>`)
      .join('');
    for (const btn of this._hud.rpgSugs.querySelectorAll('[data-sug]')) {
      btn.addEventListener('click', () => { if (!this.busy) this._submitActionToDM(btn.dataset.sug); });
    }
  }

  _handleNpcChoice(key) {
    const r = this.currentRoom;
    const offerWeapon = this._roomWeaponObj(r);
    const curBonus = this.equippedWeapon?.bonus || 0;

    if (key === 'npc:forge_weapon' || key === 'npc:buy_weapon') {
      if (this.eggsEarned < offerWeapon.cost) {
        this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/${offerWeapon.cost}) para ${offerWeapon.name}.`);
      } else {
        this.eggsEarned -= offerWeapon.cost;
        const w = this._grantWeapon(offerWeapon);
        this.sfx('coin');
        this.logLines.push(`⚒️ Adquiriu e equipou ${w.icon} ${w.name} (+${w.bonus} nos dados)!`);
        this.toast(`${w.icon} ${w.name} (+${w.bonus}) equipada!`, 'is-amber');
      }
    } else if (key === 'npc:upgrade_weapon') {
      const cost = 30 + curBonus * 15;
      if (curBonus >= 4) {
        this.logLines.push(`⚒️ ${this.equippedWeapon.name} já está no nível máximo (+4)!`);
      } else if (this.eggsEarned < cost) {
        this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/${cost}) para reforjar.`);
      } else {
        this.eggsEarned -= cost;
        this.equippedWeapon.bonus += 1;
        this.sfx('victory');
        this.logLines.push(`🔥 Bronto-Forja temperou ${this.equippedWeapon.name} para +${this.equippedWeapon.bonus} nos dados!`);
        this.toast(`🔥 ${this.equippedWeapon.name} agora dá +${this.equippedWeapon.bonus}!`, 'is-amber');
      }
    } else if (key === 'npc:sharpen_free') {
      this.nextRollAdvantage = Math.max(this.nextRollAdvantage, 1);
      this.logLines.push('✨ Bronto-Forja afiou suas garras! Você ganhou +1 de vantagem na próxima rolagem.');
    } else if (key === 'npc:buy_map') {
      if (this.mapRevealed) {
        // Mercador vende Bomba de Fumaça quando mapa já está revelado
        if (this.eggsEarned < 20) {
          this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/20) para Bomba de Fumaça.`);
        } else {
          this.eggsEarned -= 20;
          this.smokeBombs += 1;
          this.nextRollAdvantage = Math.max(this.nextRollAdvantage, 2);
          this.logLines.push('💨 Comprou Bomba de Fumaça! +2 de vantagem na próxima manobra.');
        }
      } else {
        const cost = r.npcId === 'jurassic_oracle' ? 20 : 25;
        if (this.eggsEarned < cost && r.npcId !== 'jurassic_oracle') {
          this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/${cost}) para o Mapa da Masmorra.`);
        } else {
          if (this.eggsEarned >= cost) this.eggsEarned -= cost;
          else this.logLines.push('🔮 Ankylo-Sábio sente sua coragem e oferece o pergaminho como presente!');
          this._unlockFloorMap('🗺️ Mapa da Masmorra obtido');
        }
      }
    } else if (key === 'npc:boss_tip' || key === 'npc:boss_tip_free') {
      const cost = key === 'npc:boss_tip_free' ? 0 : 15;
      if (this.eggsEarned < cost) {
        this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/${cost}).`);
      } else {
        this.eggsEarned -= cost;
        const bossRoom = this.floorData?.roomsById?.[this.floorData.bossRoomId];
        const boss = bossRoom?.encounter;
        this.bossTipRevealed = true;
        this.nextRollAdvantage = Math.max(this.nextRollAdvantage, 2);
        this.logLines.push(`👑 Visão do Chefe: ${boss?.name || 'Guardião'} (${boss?.hp || '?'} HP) teme "${boss?.weakness || 'impacto'}"! +2 vantagem na próxima rolagem.`);
      }
    } else if (key === 'npc:oracle_bless') {
      if (this.eggsEarned < 15) {
        this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/15).`);
      } else {
        this.eggsEarned -= 15;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 4);
        this.sfx('coin');
        this.logLines.push('💚 Bênção Jurássica recebida! +4 HP restaurados.');
      }
    } else if (key === 'npc:buy_potion') {
      if (this.eggsEarned < 15) {
        this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/15).`);
      } else {
        this.eggsEarned -= 15;
        this.potions += 1;
        this.sfx('coin');
        this.logLines.push('🧪 Comprou +1 Poção de Âmbar! Use na Ficha do Herói [🎒].');
      }
    } else if (key === 'npc:buy_relic' || key === 'npc:rune_tribute') {
      const cost = key === 'npc:rune_tribute' ? 20 : 35;
      if (this.eggsEarned < cost) {
        this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/${cost}).`);
      } else {
        this.eggsEarned -= cost;
        const rel = r.relic || r.merchantOffers?.[1]?.label || { name: 'Relíquia Ancestral', bonus: '+2 Poder' };
        this.relics.push(rel);
        this.sfx('coin');
        this.logLines.push(`🏺 Recebeu a relíquia "${rel.name}" (${rel.bonus || '+Poder'})!`);
      }
    } else if (key === 'npc:heal_hunter_potion') {
      if (this.potions <= 0) {
        this.logLines.push('🧪 Você não tem poções! Tente rolar Primeiros Socorros nos dados.');
      } else {
        this.potions -= 1;
        r.questDone = true;
        this.allyAidCharges += 1;
        this.nextRollAdvantage = Math.max(this.nextRollAdvantage, 2);
        const w = this._grantWeapon(offerWeapon);
        this.sfx('victory');
        this.logLines.push(`🩹 Raptor-Batedor curado! Ele entrega ${w.icon} ${w.name} (+${w.bonus}) e promete cobrir seu flanco (+2 vantagem)!`);
        this.toast(`🩹 Missão concluída! Ganhou ${w.name}!`, 'is-emerald');
      }
    } else if (key === 'npc:hunter_map_tip') {
      r.questDone = true;
      if (!this.mapRevealed) this._unlockFloorMap('🩹 Mapa rabiscado do Raptor-Batedor');
      else this.logLines.push('🧭 O Raptor-Batedor confirma que o Chefe aguarda no extremo do andar.');
    } else if (key === 'npc:start_riddle') {
      this._activeRiddle = RUNE_RIDDLES[(this.floorNum + r.seed) % RUNE_RIDDLES.length];
      this.logLines.push(`🗿 Enigma do Guardião: "${this._activeRiddle.q}"`);
    } else if (key.startsWith('npc:riddle_ans:')) {
      const idx = Number(key.split(':')[2]);
      const opt = this._activeRiddle?.options?.[idx];
      this._activeRiddle = null;
      if (opt?.correct) {
        const w = this._grantWeapon(offerWeapon);
        this.eggsEarned += 30;
        this.sfx('victory');
        this.logLines.push(`🌟 Resposta correta! O Guardião de Runas concede ${w.icon} ${w.name} (+${w.bonus}) e +30 🥚!`);
        this.toast(`🗿 Enigma vencido! ${w.name} + 30 🥚`, 'is-amber');
      } else {
        this._hurtPlayer(1);
        this.logLines.push('⚡ Runas faiscam com sua resposta errada (-1 HP). Tente novamente ou role dados!');
      }
    }

    this._syncStatusHud();
    this._renderPanelState(null);
  }

  async _submitActionToDM(actionText) {
    if (this.busy || !this.currentRoom) return;
    const room = this.currentRoom;

    this.busy = true;
    this._hud.rpgSend.disabled = true;
    this._hud.rpgSend.textContent = 'Mestre avaliando...';
    this._hud.tierBanner.style.display = 'none';
    this.logLines.push(`▶ ${this.player.name}: "${actionText}"`);
    this._renderPanelState(null);

    try {
      const ctx = this._buildDMContext(actionText);
      let decision = null;
      try {
        decision = await this.aiClient.evaluateAction(ctx);
      } catch {
        decision = evaluateLocalDungeonAction(ctx);
      }
      if (!decision || typeof decision !== 'object') decision = evaluateLocalDungeonAction(ctx);

      const possible = decision.possible !== false;
      const diceType = SUPPORTED_DICE.includes(decision.diceType) ? decision.diceType : 'd20';
      const sides = Number(diceType.slice(1)) || 20;
      const diceCount = clamp(Number(decision.diceCount) || 1, 1, 3);
      const dc = clamp(Number(decision.dc) || 11, 2, 95);
      const baseStatBonus = clamp(Number(decision.statBonus) || 0, -2, 6);
      const weaponBonus = this.equippedWeapon?.bonus || 0;
      const advBonus = this.nextRollAdvantage || 0;
      const totalBonus = clamp(baseStatBonus + advBonus, -2, 10);
      const neededOnDie = Math.max(1, dc - totalBonus);
      const verdict = !possible ? 'Impossível' : dc >= 15 ? 'Difícil' : 'Possível';

      const bonusBreakdown = [
        weaponBonus > 0 ? `arma +${weaponBonus}` : null,
        advBonus > 0 ? `vantagem +${advBonus}` : null,
        `total ${totalBonus >= 0 ? `+${totalBonus}` : totalBonus}`
      ].filter(Boolean).join(', ');

      this._hud.rpgRuling.style.display = '';
      this._hud.rpgRuling.innerHTML = `
        <div class="m3d-ruling-row">
          <span class="m3d-verdict is-${!possible ? 'blocked' : dc >= 15 ? 'hard' : 'ok'}">${verdict}</span>
          <span>Dado: <b>${diceCount}×${diceType.toUpperCase()}</b></span>
          <span>Meta (CD): <b>${dc}</b></span>
          <span>Bônus: <b>${totalBonus >= 0 ? `+${totalBonus}` : totalBonus}</b></span>
        </div>
        ${possible
          ? `<div class="m3d-ruling-target">🎯 Você precisa tirar <b>${neededOnDie}+</b> no dado (${escapeHtml(bonusBreakdown)})</div>`
          : `<div class="m3d-ruling-target" style="border-color:rgba(239,68,68,.5);color:#fca5a5">🚫 Ação bloqueada pelas leis da masmorra</div>`}
        <div class="m3d-ruling-narr" style="margin-top:4px">${escapeHtml(decision.narrative || 'O Mestre avalia sua manobra...')}</div>
      `;

      if (!possible) {
        this.logLines.push(`🚫 Mestre: ${decision.narrative || 'Ação impossível nesta situação.'}`);
        this._renderPanelState(decision.suggestions);
        return;
      }

      // Consome vantagem acumulada após aplicá-la à rolagem
      this.nextRollAdvantage = 0;

      // Rola o dado 3D (ou 2D lowSpec)
      const rollRes = this.diceRoller
        ? await this.diceRoller.roll({ diceType, count: diceCount, dc, statBonus: totalBonus, label: `${verdict} · CD ${dc}`, lowSpec: this.lowSpec })
        : this._fallbackRoll(diceType, diceCount, dc, totalBonus);

      const rawRoll = Number(rollRes.total) || 1;
      const finalTotal = rawRoll + totalBonus;
      const outcome = classifyRollOutcome(rawRoll, sides, finalTotal, dc);
      const tierFlavor = getTierNarrative(outcome.tier, 'pt');

      // Banner dramático dos 6 tiers
      this._hud.tierBanner.style.display = '';
      this._hud.tierBanner.style.color = outcome.color;
      this._hud.tierBanner.innerHTML = `
        <div>
          <div class="m3d-tier-title">${outcome.icon} ${outcome.label}</div>
          <div class="m3d-tier-detail">${escapeHtml(tierFlavor)}</div>
        </div>
        <div style="text-align:right;font-size:13px;font-weight:800;white-space:nowrap">
          🎲 ${rawRoll}${totalBonus ? (totalBonus > 0 ? `+${totalBonus}` : totalBonus) : ''} = ${finalTotal}<br/>
          <span style="font-size:11px;color:#a1a1aa">Meta CD ${dc}</span>
        </div>
      `;

      this.logLines.push(
        `🎲 ${diceType.toUpperCase()}: ${rawRoll}${totalBonus ? ` (${totalBonus >= 0 ? `+${totalBonus}` : totalBonus})` : ''} = ${finalTotal} vs CD ${dc} → ${outcome.icon} ${outcome.label}`
      );

      this._applySixTierOutcome(decision, outcome);
      this._renderPanelState(room.npcId ? null : decision.suggestions);
      this._syncStatusHud();
    } finally {
      this.busy = false;
      this._hud.rpgSend.disabled = false;
      this._hud.rpgSend.textContent = 'Enviar ao Mestre';
    }
  }

  _fallbackRoll(diceType, count, dc, statBonus) {
    const sides = Number(diceType.slice(1)) || 20;
    let total = 0;
    for (let i = 0; i < count; i++) total += 1 + Math.floor(Math.random() * sides);
    return { total, finalTotal: total + statBonus, success: total + statBonus >= dc, isCrit: sides === 20 && total === 20, isFumble: sides === 20 && total === 1 };
  }

  _applySixTierOutcome(decision, outcome) {
    const r = this.currentRoom;
    const p = this.player;

    // Aplica bônus de vantagem para a próxima rolagem (SUCESSO COM SOBRA = +2, CRÍTICO = +1)
    if (outcome.nextRollBonus > 0) {
      this.nextRollAdvantage = Math.max(this.nextRollAdvantage, outcome.nextRollBonus);
    }

    // Recompensas extras no CRÍTICO!
    if (outcome.tier === 'critical') {
      const critEggs = 10 + this.floorNum * 3;
      this.eggsEarned += critEggs;
      this.sfx('victory');
      this.toast(`🌟 CRÍTICO! +${critEggs} 🥚 + faísca na arma!`, 'is-amber');
    } else if (outcome.tier === 'great_success') {
      this.sfx('coin');
      this.toast('🔥 SUCESSO COM SOBRA! +2 vantagem no próximo dado!', 'is-emerald');
    }

    // Sala de NPC (ação livre de RPG de mesa)
    if (r.npcId) {
      if (outcome.success) {
        const reward = Math.max(6, Math.round((Number(decision.eggReward) || 10) * outcome.effectMult));
        this.eggsEarned += reward;
        if (r.npcId === 'wounded_hunter' && !r.questDone) {
          r.questDone = true;
          const w = this._grantWeapon(this._roomWeaponObj(r));
          this.logLines.push(`🩹 Primeiros socorros bem-sucedidos! Ganhou ${w.icon} ${w.name} (+${w.bonus}) e +${reward} 🥚!`);
        } else {
          this.logLines.push(`✨ ${decision.narrative || 'O encontro rende frutos!'} (+${reward} 🥚)`);
        }
      } else if (outcome.tier === 'critical_fail') {
        this._hurtPlayer(1);
        this.logLines.push(`💀 ${decision.failNarrative || 'Algo sai bem errado na negociação!'} (-1 HP)`);
      } else {
        this.logLines.push(`${outcome.icon} ${decision.failNarrative || 'O NPC apenas balança a cabeça.'}`);
      }
      return;
    }

    // Combate ou Chefe
    if (r.type === 'combat' || r.type === 'boss') {
      const enc = r.encounter;
      const baseDmg = Math.max(2, Number(decision.enemyDamage) || 3);
      const baseEnemyAtk = Math.max(1, Number(decision.playerDamage) || 1);

      if (outcome.success && enc) {
        const dmg = Math.max(1, Math.round(baseDmg * outcome.effectMult));
        enc.hp = Math.max(0, enc.hp - dmg);
        p.avatar.attack('bite', 0.42);
        if (this.enemyActor) { this.enemyActor.state = enc.hp <= 0 ? 'dead' : 'hurt'; this.enemyActor.stateTimer = 0.55; }
        this.floaters.spawn(new THREE.Vector3(0, 1.5, -2.5), `-${dmg} HP`, outcome.isCrit ? 'is-crit' : 'is-amber');
        if (outcome.isCrit) this.rig.shake(0.32);
        this.sfx('hit');
        if (enc.hp <= 0) this._clearCurrentRoom(enc.rewardEggs || (20 + this.floorNum * 10));
      } else if (outcome.tier === 'minor_fail' && enc) {
        // Falha menor: raspão de 1 dano no inimigo e contra-ataque reduzido (0 ou 1)
        enc.hp = Math.max(0, enc.hp - 1);
        this.floaters.spawn(new THREE.Vector3(0, 1.5, -2.5), '-1 (raspão)', 'is-muted');
        const chip = Math.floor(baseEnemyAtk * 0.5);
        if (chip > 0) this._hurtPlayer(chip);
        if (enc.hp <= 0) this._clearCurrentRoom(enc.rewardEggs || (20 + this.floorNum * 10));
      } else if (outcome.tier === 'critical_fail') {
        // Falha crítica: contra-ataque pesado + shake dramático
        const heavy = Math.max(2, Math.ceil(baseEnemyAtk * 1.75));
        this._hurtPlayer(heavy);
        this.rig.shake(0.5);
        if (this.enemyActor) { this.enemyActor.state = 'attack'; this.enemyActor.stateTimer = 0.6; }
      } else {
        // Falha normal
        this._hurtPlayer(baseEnemyAtk);
        if (this.enemyActor) { this.enemyActor.state = 'attack'; this.enemyActor.stateTimer = 0.5; }
      }
      return;
    }

    // Armadilha
    if (r.type === 'trap') {
      if (outcome.success) {
        const bonus = Math.round((15 + this.floorNum * 5) * outcome.effectMult);
        this.logLines.push(`✨ Você superou a armadilha com maestria! (+${bonus} 🥚)`);
        this._clearCurrentRoom(bonus);
      } else if (outcome.tier === 'minor_fail') {
        this._hurtPlayer(1);
        this.logLines.push('⚠️ Quase escapou ileso! Sofreu apenas 1 de dano de raspão.');
        this._clearCurrentRoom(8);
      } else {
        const trapDmg = Math.max(1, Math.round((r.trap?.damage || 2) * outcome.counterDmgMult));
        this._hurtPlayer(trapDmg);
        this._clearCurrentRoom(5);
      }
      return;
    }

    // Tesouro (pode conter Relíquia, Arma e o Pergaminho do Mapa da Masmorra!)
    if (r.type === 'treasure') {
      if (r.relic) {
        this.relics.push(r.relic);
        this.logLines.push(`🏺 Relíquia obtida: ${r.relic.name} (${r.relic.bonus || '+Poder'})`);
      }
      if (r.weaponId && outcome.success) {
        const w = this._grantWeapon(this._roomWeaponObj(r));
        if (w) this.logLines.push(`🗡️ Arma encontrada no baú: ${w.icon} ${w.name} (+${w.bonus} nos dados)!`);
      }
      if (r.hasMapScroll) {
        this._unlockFloorMap('🗺️ Pergaminho encontrado no Baú');
      }
      if (outcome.tier === 'critical_fail') {
        this._hurtPlayer(1);
        this.logLines.push('💀 Uma agulha oculta no fecho do baú arranha você (-1 HP), mas o tesouro é seu!');
      }
      this._clearCurrentRoom(Math.round((25 + this.floorNum * 8) * Math.max(0.8, outcome.effectMult || 1)));
      return;
    }

    // Santuário / Enigma
    if (outcome.success) {
      const heal = Math.max(2, Math.round((Number(decision.playerHeal) || 2) * outcome.effectMult));
      p.hp = Math.min(p.maxHp, p.hp + heal);
      this.logLines.push(`💚 Bênção recebida: +${heal} HP!`);
      this._clearCurrentRoom(20 + this.floorNum * 6);
    } else if (outcome.tier === 'minor_fail') {
      this.logLines.push('⚠️ O altar responde fracamente, mas não fere você.');
      this._clearCurrentRoom(10);
    } else {
      this._hurtPlayer(outcome.tier === 'critical_fail' ? 2 : 1);
      this._clearCurrentRoom(8);
    }
  }

  _hurtPlayer(amount) {
    if (amount <= 0) return;
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.player.avatar.hurt();
    this.rig.shake(0.28);
    this.floaters.spawn(this.player.mover.pos, `-${amount} HP`, 'is-dmg');
    this.sfx('hit');
    if (this.player.hp <= 0) {
      this.player.avatar.dead = true;
      this._closeEncounterPanel();
      this._showRunEnd(false);
    }
  }

  _clearCurrentRoom(bonusEggs = 0) {
    const r = this.currentRoom;
    if (!r || r.cleared) return;
    r.cleared = true;
    this.roomsCleared += 1;
    this.eggsEarned += bonusEggs;
    for (const d of this._doorMarkers || []) d.pad.material.color.set('#10b981');
    for (const it of this.interactableMeshes) it.mesh.visible = false;
    if (bonusEggs > 0) this.toast(`Sala limpa! +${bonusEggs} 🥚`, 'is-emerald');
    if (r.type === 'boss') {
      this._spawnFloorPortal();
      this.logLines.push('🌀 O portal para o próximo andar se abriu!');
      this.sfx('victory');
    }
    this._renderMinimap();
    this._syncStatusHud();
  }

  _advanceFloor() {
    if (!this.isRush && this.floorNum >= this.maxFloors) {
      this._showRunEnd(true);
      return;
    }
    this._closeEncounterPanel();
    this._loadFloor(this.floorNum + 1);
  }

  _showRunEnd(victory) {
    const totalEggs = this.eggsEarned + (victory ? 120 : 20);
    try {
      if (Save?.data) {
        Save.data.eggs = (Save.data.eggs || 0) + totalEggs;
        Save.save?.();
      }
    } catch { /* ignore */ }

    const modal = document.createElement('div');
    modal.className = 'm3d-modal-backdrop';
    modal.innerHTML = `
      <div class="m3d-modal">
        <div class="m3d-modal-eyebrow">${this.isRush ? 'DUNGEON RUSH' : 'MASMORRA RPG 3D'}</div>
        <h2 class="m3d-modal-title">${victory ? 'MASMORRA CONQUISTADA!' : `CAÍDO NO ANDAR ${this.floorNum}`}</h2>
        <p class="m3d-modal-sub">Salas limpas: ${this.roomsCleared} · Arma: ${escapeHtml(this.equippedWeapon?.name || 'Garras')} (+${this.equippedWeapon?.bonus || 0}) · Relíquias: ${this.relics.length} · +${totalEggs} 🥚</p>
        <div class="m3d-modal-actions">
          <button type="button" class="m3d-btn m3d-btn-primary" data-act="again">Nova Expedição</button>
          <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">Voltar ao Menu</button>
        </div>
      </div>`;
    this.overlay.appendChild(modal);
    this.listen(modal.querySelector('[data-act="again"]'), 'click', () => {
      modal.remove();
      this.seed = `dng-${Date.now()}`;
      this.relics = [];
      this.weapons = [{ ...DEFAULT_WEAPON }];
      this.equippedWeapon = this.weapons[0];
      this.potions = 1;
      this.smokeBombs = 0;
      this.nextRollAdvantage = 0;
      this.eggsEarned = 0;
      this.roomsCleared = 0;
      this.player.hp = this.player.maxHp;
      this.player.avatar.dead = false;
      this._loadFloor(1);
    });
    this.listen(modal.querySelector('[data-act="exit"]'), 'click', () => this.requestExit({ victory, floor: this.floorNum, eggs: totalEggs }));
  }

  _renderMinimap() {
    if (!this._hud.minimap || !this.floorData) return;
    const rooms = this.floorData.rooms;
    const xs = rooms.map((r) => r.x);
    const ys = rooms.map((r) => r.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const cols = Math.max(...xs) - minX + 1;
    const rows = Math.max(...ys) - minY + 1;

    if (this._hud.mmBadge) {
      this._hud.mmBadge.innerHTML = this.mapRevealed
        ? `${uiIcon('openworld', { size: 13 })} Mapa Revelado!`
        : `${uiIcon('openworld', { size: 13 })} Névoa`;
      this._hud.mmBadge.classList.toggle('is-revealed', this.mapRevealed);
    }

    // Descobre salas adjacentes às visitadas para o modo Névoa de Guerra
    const adjacentIds = new Set();
    for (const r of rooms) {
      if (r.visited) {
        for (const nextId of Object.values(r.doors || {})) adjacentIds.add(nextId);
      }
    }

    this._hud.minimap.style.gridTemplateColumns = `repeat(${cols}, 22px)`;
    this._hud.minimap.style.gridTemplateRows = `repeat(${rows}, 22px)`;

    this._hud.minimap.innerHTML = rooms.map((r) => {
      const isCur = r.id === this.currentRoom?.id;
      const visible = this.mapRevealed || r.visited;
      const isFogSilhouette = !visible && adjacentIds.has(r.id);
      if (!visible && !isFogSilhouette) return '';

      if (isFogSilhouette) {
        return `<div class="m3d-mm-cell is-fog" style="grid-column:${r.x - minX + 1};grid-row:${r.y - minY + 1}" title="Sala inexplorada">?</div>`;
      }

      const cur = isCur ? ' is-current' : '';
      const clr = r.cleared ? ' is-cleared' : '';
      const vis = r.visited ? ' is-visited' : '';
      const icon = ROOM_ICONS[r.type] || '•';
      const title = r.npcId
        ? `${DUNGEON_NPCS[r.npcId]?.name || 'NPC'} (${ROOM_LABELS[r.type] || r.type})`
        : (ROOM_LABELS[r.type] || r.type);
      return `<div class="m3d-mm-cell is-${r.type}${cur}${clr}${vis}" style="grid-column:${r.x - minX + 1};grid-row:${r.y - minY + 1}" title="${escapeHtml(title)}">${icon}</div>`;
    }).join('');
  }

  _syncStatusHud() {
    if (!this._hud.floor) return;
    this._hud.floor.textContent = `ANDAR ${this.floorNum}${this.isRush ? ' · RUSH' : `/${this.maxFloors}`}`;
    this._hud.hp.textContent = `${this.player.hp}/${this.player.maxHp}`;
    this._hud.eggs.textContent = String(this.eggsEarned);
    if (this._hud.potions) this._hud.potions.textContent = String(this.potions);
    this._hud.relics.textContent = String(this.relics.length);
    if (this._hud.weaponBar && this.equippedWeapon) {
      this._hud.weaponBar.textContent = `${this.equippedWeapon.icon} ${this.equippedWeapon.name} (+${this.equippedWeapon.bonus} nos dados)`;
    }
    if (this._hud.buffPill) {
      if (this.nextRollAdvantage > 0) {
        this._hud.buffPill.style.display = '';
        this._hud.buffPill.textContent = `✨ +${this.nextRollAdvantage} Vantagem no próximo dado`;
      } else {
        this._hud.buffPill.style.display = 'none';
      }
    }
    const npc = this.currentRoom?.npcId ? DUNGEON_NPCS[this.currentRoom.npcId] : null;
    this._hud.roomPill.textContent = npc
      ? `${npc.icon} ${npc.name}`
      : `${ROOM_LABELS[this.currentRoom?.type] || 'Sala'}${this.currentRoom?.cleared ? ' ✓' : ''}`;
  }

  dispose() {
    this.diceRoller?.dispose?.();
    this.roomBuilt?.dispose?.();
    this.enemyActor?.dispose?.();
    this.npcActor?.dispose?.();
    this.player?.avatar?.dispose();
    this.disposeBase();
  }
}
