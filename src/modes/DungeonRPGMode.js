// Masmorra RPG 3D (`dungeon_rpg` até Andar 5 / `dungeon_rush` infinito escalando).
// Exploração livre 360° em salas 3D geradas por DungeonGenerator + DungeonProps,
// Painel Tabletop RPG com Mestre IA (AIDungeonClient) + Rolagem de Dados 3D/2D (DiceRoller3D),
// 4 ações sugeridas clicáveis, caixa de ação livre, Bandeja de Dados Manual e minimapa vivo.
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
import { DUNGEON_THEMES, buildDungeonRoomMeshes, buildDungeonEnemyModel } from '../models/DungeonProps.js';
import { DiceRoller3D, SUPPORTED_DICE } from './DiceRoller3D.js';
import { AIDungeonClient, evaluateLocalDungeonAction } from '../net/AIDungeonClient.js';
import {
  rollDungeonEncounter,
  rollDungeonTrap,
  rollDungeonRelic,
  rollDungeonRoomEvent
} from '../content/ultra_catalog.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { Save } from '../systems/Save.js';

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
  boss: 'Chefe do Andar'
};

const DIR_OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };

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
    this.portalMesh = null;
    this.interactableMeshes = [];

    this.player = null;
    this.relics = [];
    this.eggsEarned = 0;
    this.roomsCleared = 0;

    this.aiClient = new AIDungeonClient();
    this.diceRoller = null;
    this.panelOpen = false;
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
      cameraOpts: { distance: 10.5, pitch: 0.62, height: 1.4, minDistance: 6, maxDistance: 17 }
    });

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
      controls: new PlayerControls(this.keys, P1_BINDINGS, this.touch),
      maxHp,
      hp: maxHp
    };
  }

  _loadFloor(floorNum) {
    this.floorNum = floorNum;
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

    // Limpa sala anterior
    if (this.roomGroup) {
      this.roomBuilt?.dispose?.();
      this.enemyActor?.dispose?.();
      this.enemyActor = null;
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
    this._doorMarkers = [];
    for (const a of this.doorAnchors) {
      const pad = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 1.1, 24),
        new THREE.MeshBasicMaterial({ color: room.cleared ? '#10b981' : '#ef4444', side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(a.x, 0.05, a.z);
      rg.add(pad);
      this._doorMarkers.push({ dir: a.dir, x: a.x, z: a.z, pad });
    }

    // Spawna inimigo 3D ou ponto de interação central (baú/santuário/armadilha/mercador)
    if (!room.cleared && (room.type === 'combat' || room.type === 'boss') && room.encounter) {
      this._spawnRoomEnemy(room.encounter);
    } else if (!room.cleared && room.type !== 'start') {
      const color = room.type === 'treasure' ? '#f59e0b' : room.type === 'shrine' ? '#22d3ee' : room.type === 'merchant' ? '#a855f7' : '#ef4444';
      const orb = makeGlowOrb(color, 0.55);
      orb.position.set(0, 1.1, -1.5);
      rg.add(orb);
      this.interactableMeshes.push({ mesh: orb, x: 0, z: -1.5, kind: room.type });
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

  _spawnFloorPortal() {
    if (this.portalMesh) return;
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.16, 12, 32),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 1.5 })
    );
    ring.position.y = 1.6;
    const core = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 24),
      new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    core.position.y = 1.6;
    g.add(ring, core);
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
          <div class="m3d-dng-stat">❤️ <b data-hp>18/18</b></div>
          <div class="m3d-dng-stat">🥚 <b data-eggs>0</b></div>
          <div class="m3d-dng-stat">🏺 <b data-relics>0</b></div>
        </div>
        <div class="m3d-dng-room-pill" data-room-pill>Entrada</div>
        <div class="m3d-dng-actions">
          <button type="button" class="m3d-btn m3d-btn-ghost" data-act="dice-tray">🎲 Dados</button>
          <button type="button" class="m3d-btn m3d-btn-primary" data-act="open-dm">📜 Mestre [E]</button>
          <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">✕ Menu</button>
        </div>
      </div>

      <div class="m3d-minimap" data-minimap aria-label="Minimapa da Masmorra"></div>
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
        <div class="m3d-rpg-log" data-rpg-log></div>
        <div class="m3d-rpg-ruling" data-rpg-ruling style="display:none"></div>
        <div class="m3d-rpg-suggestions" data-rpg-sugs></div>
        <form class="m3d-rpg-form" data-rpg-form>
          <input type="text" class="m3d-input" data-rpg-input maxlength="200" placeholder="Escreva o que seu dinossauro faz..." autocomplete="off" />
          <button type="submit" class="m3d-btn m3d-btn-primary" data-rpg-send>Enviar ao Mestre</button>
        </form>
      </div>

      <div class="m3d-dice-tray" data-dice-tray style="display:none">
        <div class="m3d-tray-head">
          <span>🎲 Bandeja Manual de Dados</span>
          <button type="button" class="m3d-btn m3d-btn-ghost" data-act="close-tray">✕</button>
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
      relics: el.querySelector('[data-relics]'),
      roomPill: el.querySelector('[data-room-pill]'),
      minimap: el.querySelector('[data-minimap]'),
      prompt: el.querySelector('[data-prompt]'),
      panel: el.querySelector('[data-rpg-panel]'),
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

  update(dt) {
    if (!this.mounted || this.isPaused()) return;
    const simDt = this.baseTick(dt);

    if (simDt > 0) {
      if (this._doorCooldown > 0) this._doorCooldown = Math.max(0, this._doorCooldown - simDt);

      // Anima inimigo, portal e orbes
      if (this.enemyActor) {
        if (this.enemyActor.stateTimer > 0) {
          this.enemyActor.stateTimer -= simDt;
          if (this.enemyActor.stateTimer <= 0 && this.enemyActor.state !== 'dead') this.enemyActor.state = 'idle';
        }
        try { this.enemyActor.model.animate?.(this.elapsed, this.enemyActor.state); } catch { /* noop */ }
      }
      if (this.portalMesh) this.portalMesh.rotation.y += simDt * 1.4;
      for (const it of this.interactableMeshes) {
        it.mesh.rotation.y += simDt * 2;
        it.mesh.position.y = 1.1 + Math.sin(this.elapsed * 3) * 0.16;
      }

      // Movimento livre 360° quando o painel Tabletop está fechado
      const p = this.player;
      const m = p.mover;
      if (!this.panelOpen) {
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
      this.rig.update(simDt, m.pos);
    }

    this.baseEndFrame(dt);
  }

  _checkRoomTriggers(interactPressed) {
    const room = this.currentRoom;
    if (!room) return;
    const pos = this.player.mover.pos;
    let promptText = '';

    // 1) Encontro / Interação ativa no centro da sala
    if (!room.cleared && room.type !== 'start') {
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

    // 2) Portal do próximo andar na sala do chefe limpa
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

    // 3) Portas N/S/E/W (destrancadas quando a sala está limpa ou se for start)
    if (this._doorCooldown <= 0) {
      for (const d of this._doorMarkers || []) {
        const distD = Math.hypot(pos.x - d.x, pos.z - d.z);
        if (distD < 1.7) {
          if (room.cleared || room.type === 'start') {
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
    return {
      floor: this.floorNum,
      themeId: this.floorData?.themeId || 'crypt',
      roomType: r?.type || 'combat',
      roomCleared: !!r?.cleared,
      dinoId: this.player.dinoId,
      dinoName: this.player.name,
      dinoClass: this.player.spec?.dinoClass || 'carnivore',
      dinoStats: this.player.spec?.stats || { attack: 5, defense: 4, speed: 5 },
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
      actionText
    };
  }

  _defaultSuggestionsForRoom() {
    const r = this.currentRoom;
    if (!r) return ['Avançar com cautela', 'Investigar o ambiente', 'Rugir para intimidar', 'Preparar defesa'];
    if (r.type === 'combat' || r.type === 'boss') {
      return [
        `Avançar com mordida poderosa em ${r.encounter?.name || 'o inimigo'}`,
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
        'Inspecionar as runas ao redor da relíquia',
        'Quebrar o selo com um golpe direto',
        'Farejar magia oculta no tesouro'
      ];
    }
    if (r.type === 'merchant') {
      return [
        'Comprar Poção de Âmbar (+3 HP por 20 ovos)',
        'Negociar uma Relíquia rara (35 ovos)',
        'Pedir dicas sobre o chefe deste andar',
        'Agradecer e seguir viagem'
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

    const r = this.currentRoom;
    this._hud.rpgType.textContent = `${ROOM_LABELS[r.type] || 'SALA'} · ANDAR ${this.floorNum}`;
    this._hud.rpgTitle.textContent = r.encounter?.name || r.trap?.name || r.relic?.name || r.roomEvent?.name || (r.type === 'merchant' ? 'Mercador das Profundezas' : 'Câmara da Masmorra');

    if (this.logLines.length === 0 || this._lastRoomLogId !== r.id) {
      this._lastRoomLogId = r.id;
      this.logLines = [this._describeRoomIntro(r)];
    }
    this._renderPanelState(this._defaultSuggestionsForRoom());
  }

  _closeEncounterPanel() {
    this.panelOpen = false;
    this.keys.enabled = true;
    this.touch?.setVisible(true);
    this._hud.panel.style.display = 'none';
  }

  _describeRoomIntro(r) {
    if (r.cleared) return 'Esta câmara já foi resolvida. As portas estão abertas.';
    if (r.encounter) return `Um ${r.encounter.name} (${r.encounter.hp}/${r.encounter.maxHp} HP) bloqueia a passagem! Fraqueza suspeita: ${r.encounter.weakness || 'desconhecida'}.`;
    if (r.trap) return `Armadilha detectada: ${r.trap.name}! (${r.trap.counterplay || 'Exige precisão'}).`;
    if (r.relic) return `Um baú reluzente guarda a relíquia "${r.relic.name}".`;
    if (r.type === 'merchant') return 'Um mercador encapuzado oferece poções e relíquias em troca de ovos.';
    return `${r.roomEvent?.name || 'Um altar ancestral'} pulsa com energia misteriosa.`;
  }

  _renderPanelState(suggestions) {
    const r = this.currentRoom;
    if (r?.encounter && !r.cleared) {
      this._hud.rpgEnemyHp.innerHTML = `<span class="m3d-badge-dmg">HP ${r.encounter.hp}/${r.encounter.maxHp}</span>`;
    } else {
      this._hud.rpgEnemyHp.innerHTML = r?.cleared ? '<span class="m3d-badge-ok">SALA LIMPA</span>' : '';
    }
    this._hud.rpgLog.innerHTML = this.logLines.slice(-4).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
    this._hud.rpgSugs.innerHTML = (suggestions || this._defaultSuggestionsForRoom())
      .slice(0, 4)
      .map((s) => `<button type="button" class="m3d-sug-btn" data-sug="${escapeHtml(s)}">${escapeHtml(s)}</button>`)
      .join('');
    for (const btn of this._hud.rpgSugs.querySelectorAll('[data-sug]')) {
      btn.addEventListener('click', () => { if (!this.busy) this._submitActionToDM(btn.dataset.sug); });
    }
  }

  async _submitActionToDM(actionText) {
    if (this.busy || !this.currentRoom) return;
    const room = this.currentRoom;

    // Ações rápidas de mercador (determinísticas, sem gastar IA)
    if (room.type === 'merchant' && /comprar|poção|negociar|relíquia/i.test(actionText)) {
      this._handleMerchantAction(actionText);
      return;
    }

    this.busy = true;
    this._hud.rpgSend.disabled = true;
    this._hud.rpgSend.textContent = 'Mestre pensando...';
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
      const diceCount = clamp(Number(decision.diceCount) || 1, 1, 3);
      const dc = clamp(Number(decision.dc) || 11, 2, 95);
      const statBonus = clamp(Number(decision.statBonus) || 0, -2, 6);
      const verdict = !possible ? 'Bloqueado' : dc >= 15 ? 'Difícil' : 'Possível';

      this._hud.rpgRuling.style.display = '';
      this._hud.rpgRuling.innerHTML = `
        <div class="m3d-ruling-row">
          <span class="m3d-verdict is-${!possible ? 'blocked' : dc >= 15 ? 'hard' : 'ok'}">${verdict}</span>
          <span>Dado: <b>${diceCount}×${diceType.toUpperCase()}</b></span>
          <span>CD: <b>${dc}</b></span>
          <span>Bônus: <b>${statBonus >= 0 ? `+${statBonus}` : statBonus}</b></span>
        </div>
        <div class="m3d-ruling-narr">${escapeHtml(decision.narrative || 'O Mestre avalia sua manobra...')}</div>
      `;

      if (!possible) {
        this.logLines.push(`🚫 Mestre: ${decision.narrative || 'Ação impossível nesta situação.'}`);
        this._renderPanelState(decision.suggestions);
        return;
      }

      // Rola o dado 3D (ou 2D lowSpec)
      const rollRes = this.diceRoller
        ? await this.diceRoller.roll({ diceType, count: diceCount, dc, statBonus, label: `${verdict} · CD ${dc}`, lowSpec: this.lowSpec })
        : this._fallbackRoll(diceType, diceCount, dc, statBonus);

      const finalTotal = rollRes.finalTotal ?? (rollRes.total + statBonus);
      const success = rollRes.success !== undefined ? rollRes.success : (finalTotal >= dc || !!rollRes.isCrit);
      const outcomeLine = `🎲 ${diceType.toUpperCase()}: ${rollRes.total}${statBonus ? ` (${statBonus >= 0 ? `+${statBonus}` : statBonus})` : ''} = ${finalTotal} vs CD ${dc} → ${rollRes.isCrit ? 'CRÍTICO!' : success ? 'SUCESSO!' : 'FALHA!'}`;
      this.logLines.push(outcomeLine);

      this._applyEncounterOutcome(decision, success, !!rollRes.isCrit, !!rollRes.isFumble);
      this._renderPanelState(decision.suggestions);
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

  _applyEncounterOutcome(decision, success, isCrit, isFumble) {
    const r = this.currentRoom;
    const p = this.player;

    if (r.type === 'combat' || r.type === 'boss') {
      const enc = r.encounter;
      if (success && enc) {
        const dmg = Math.max(2, (Number(decision.enemyDamage) || 3) + (isCrit ? 3 : 0));
        enc.hp = Math.max(0, enc.hp - dmg);
        p.avatar.attack('bite', 0.4);
        if (this.enemyActor) { this.enemyActor.state = enc.hp <= 0 ? 'dead' : 'hurt'; this.enemyActor.stateTimer = 0.55; }
        this.floaters.spawn(new THREE.Vector3(0, 1.5, -2.5), `-${dmg} HP`, isCrit ? 'is-crit' : 'is-amber');
        this.sfx('hit');
        if (enc.hp <= 0) this._clearCurrentRoom(enc.rewardEggs || (20 + this.floorNum * 10));
      } else {
        const dmgP = Math.max(1, (Number(decision.playerDamage) || 1) + (isFumble ? 1 : 0));
        this._hurtPlayer(dmgP);
        if (this.enemyActor) { this.enemyActor.state = 'attack'; this.enemyActor.stateTimer = 0.5; }
      }
      return;
    }

    if (r.type === 'trap') {
      if (success) {
        this.logLines.push('✨ Você superou a armadilha sem arranhões!');
        this._clearCurrentRoom(15 + this.floorNum * 5);
      } else {
        this._hurtPlayer(Math.max(1, r.trap?.damage || 2));
        this._clearCurrentRoom(5);
      }
      return;
    }

    if (r.type === 'treasure') {
      if (r.relic) {
        this.relics.push(r.relic);
        this.logLines.push(`🏺 Relíquia obtida: ${r.relic.name} (${r.relic.bonus || '+Poder'})`);
      }
      this._clearCurrentRoom(25 + this.floorNum * 8);
      return;
    }

    // shrine / puzzle
    if (success) {
      const heal = Math.max(2, Number(decision.playerHeal) || 2);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      this.logLines.push(`💚 Benção recebida: +${heal} HP!`);
      this._clearCurrentRoom(20 + this.floorNum * 6);
    } else {
      this._hurtPlayer(1);
      this._clearCurrentRoom(8);
    }
  }

  _handleMerchantAction(text) {
    const wantsHeal = /poção|hp/i.test(text);
    const cost = wantsHeal ? 20 : 35;
    if (this.eggsEarned < cost) {
      this.logLines.push(`🥚 Ovos insuficientes (${this.eggsEarned}/${cost}).`);
      this._renderPanelState(null);
      return;
    }
    this.eggsEarned -= cost;
    if (wantsHeal) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
      this.logLines.push('🧪 Poção de Âmbar bebida! +3 HP.');
    } else {
      const rel = this.currentRoom.merchantOffers?.[1]?.label || { name: 'Relíquia do Mercador', bonus: '+2 Ataque' };
      this.relics.push(rel);
      this.logLines.push(`🏺 Comprou ${rel.name}!`);
    }
    this._clearCurrentRoom(0);
    this._syncStatusHud();
    this._renderPanelState(null);
  }

  _hurtPlayer(amount) {
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
        <p class="m3d-modal-sub">Salas limpas: ${this.roomsCleared} · Relíquias: ${this.relics.length} · +${totalEggs} 🥚</p>
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
    this._hud.minimap.style.gridTemplateColumns = `repeat(${cols}, 14px)`;
    this._hud.minimap.style.gridTemplateRows = `repeat(${rows}, 14px)`;
    this._hud.minimap.innerHTML = rooms.map((r) => {
      const cur = r.id === this.currentRoom?.id ? ' is-current' : '';
      const clr = r.cleared ? ' is-cleared' : '';
      const vis = r.visited ? ' is-visited' : '';
      return `<div class="m3d-mm-cell is-${r.type}${cur}${clr}${vis}" style="grid-column:${r.x - minX + 1};grid-row:${r.y - minY + 1}" title="${escapeHtml(ROOM_LABELS[r.type] || r.type)}"></div>`;
    }).join('');
  }

  _syncStatusHud() {
    if (!this._hud.floor) return;
    this._hud.floor.textContent = `ANDAR ${this.floorNum}${this.isRush ? ' · RUSH' : `/${this.maxFloors}`}`;
    this._hud.hp.textContent = `${this.player.hp}/${this.player.maxHp}`;
    this._hud.eggs.textContent = String(this.eggsEarned);
    this._hud.relics.textContent = String(this.relics.length);
    this._hud.roomPill.textContent = `${ROOM_LABELS[this.currentRoom?.type] || 'Sala'}${this.currentRoom?.cleared ? ' ✓' : ''}`;
  }

  dispose() {
    this.diceRoller?.dispose?.();
    this.roomBuilt?.dispose?.();
    this.enemyActor?.dispose?.();
    this.player?.avatar?.dispose();
    this.disposeBase();
  }
}
