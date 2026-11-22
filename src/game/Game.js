// Motor completo do DINO DASH 3D: integra Essencial, Avançado e Bônus em arquitetura modular.
import * as THREE from 'three';
import { Save } from '../systems/Save.js';
import { InputSystem } from '../systems/Input.js';
import { OrientationManager } from '../systems/OrientationManager.js';
import { CameraRig } from '../systems/CameraRig.js';
import { ParticleSystem } from '../systems/Particles.js';
import { World, LANE_X, RIVER_LANE_X, SHOP_LANE_X, SKY_CORRIDOR_Y } from '../world/World.js';
import { BIOMES, getBiomeById, getRandomNextBiome, isAquaticBiome } from '../world/Biomes.js';
import { DayNightCycle } from '../world/DayNightCycle.js';
import { WeatherSystem } from '../world/Weather.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { buildVoxelGoldenEgg, buildVoxelDebris } from '../models/VoxelLibrary.js';
import { DinoAnimator } from '../dinos/DinoAnimator.js';
import { DinoAbilities } from '../dinos/DinoAbilities.js';
import * as DinoCatalogMod from '../dinos/DinoCatalog.js';
import { getDinoSpec, getDinoHabitat, getEffectiveDinoHabitat, getDinoSwimCapabilities } from '../dinos/DinoCatalog.js';
import {
  getActivePreset,
  rollRandomMutation,
  getMutationDef,
  getMutationActiveLevel,
  getMutationComputedProfile,
  getEquippedSkinVariant,
  applySkinVariantToColors
} from '../dinos/DinoCustomization.js';
import { GachaSystem } from '../systems/GachaSystem.js';
import { CompanionManager } from '../dinos/Companion.js';
import { Spawner } from '../systems/Spawner.js';
import { PhysicsCollision } from '../systems/PhysicsCollision.js';
import { Backpack } from '../systems/Items.js';
import { StatusSystem } from '../systems/StatusSystem.js';
import { CARD_MILESTONES, CARD_POOL, drawThreeCards, getCardMilestone } from '../systems/Cards.js';
import { ProgressionManager } from '../systems/Progression.js';
import { ReplayRecorder, getTodaySeed } from '../systems/Replay.js';
import { PerfMonitor } from '../systems/PerfMonitor.js';
import { ClipRecorder } from '../systems/ClipRecorder.js';
import { Metagame } from '../systems/Metagame.js';
import { ContentLoader } from '../content/ContentLoader.js';
import { RoomClient } from '../net/RoomClient.js';
import { EventManager } from '../events/EventManager.js';
import { DifficultyManager } from './Difficulty.js';
import {
  getModeDef,
  STORY_CHAPTERS,
  CHAOS_RULES,
  RAID_AFFIXES,
  RACE_DISTANCES,
  isModeRanked,
  getCompetitionSeed
} from './Modes.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { SoundEffects } from '../audio/SoundEffects.js';
import { MusicSequencer } from '../audio/MusicSequencer.js';
import { Narrator } from '../audio/Narrator.js';
import { UIManager } from '../ui/UI.js';
import { TvHud } from '../ui/TvHud.js';
import { startAuthoritativeRun, finishAuthoritativeRun } from '../security/EdgeClient.js';
import { exportWatermarkedSnapshot } from '../security/Watermark.js';

const FREE_3D_MODES = new Set(['arena_x1', 'boss_arena', 'dungeon_rpg', 'dungeon_rush', 'adventure_open']);

const PURE_AQUATIC_GILLS_IDS = new Set([
  'mosasaurus', 'plesiosaurus', 'kronosaurus', 'megalodon',
  'dunkleosteus', 'elasmosaurus', 'liopleurodon', 'ichthyosaurus',
  'abissal_espectral'
]);
const AMPHIBIOUS_HYBRID_IDS = new Set([
  'spinosaurus', 'baryonyx', 'sarcosuchus', 'suchomimus',
  'deinosuchus', 'cryo_spino_aurora'
]);

export function getDinoAquaticPhysiology(specOrId, opts = {}) {
  if (typeof DinoCatalogMod.getDinoAquaticPhysiology === 'function') {
    const ext = DinoCatalogMod.getDinoAquaticPhysiology(specOrId, opts);
    if (typeof ext === 'string') return ext;
    if (ext && typeof ext === 'object') return ext.physiology || ext.type || ext.kind || 'terrestrial';
  }
  const spec = typeof specOrId === 'string' ? getDinoSpec(specOrId) : (specOrId || getDinoSpec('trex'));
  const id = spec?.id || (typeof specOrId === 'string' ? specOrId : 'trex');
  const { hybrid = null, mutationId = null } = opts || {};
  if (hybrid?.enabled) {
    const eff = getEffectiveDinoHabitat(spec, { hybrid, mutationId });
    const modes = Array.isArray(eff?.availableModes) ? eff.availableModes : [];
    if (modes.includes('aquatic')) {
      return (modes.includes('land') || modes.includes('flying')) ? 'amphibious_hybrid' : 'aquatic_gills';
    }
    return 'terrestrial';
  }
  if (AMPHIBIOUS_HYBRID_IDS.has(id) || spec?.habitat === 'amphibious') {
    return 'amphibious_hybrid';
  }
  if (PURE_AQUATIC_GILLS_IDS.has(id) || spec?.habitat === 'aquatic' || spec?.dinoClass === 'aquatic') {
    if (mutationId === 'extra_limbs') return 'amphibious_hybrid';
    return 'aquatic_gills';
  }
  return 'terrestrial';
}

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    OrientationManager.init();
    const initVp = OrientationManager.getViewportSize();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor('#f78c4f', 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(initVp.width, initVp.height);
    this.renderer.shadowMap.enabled = Save.data.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this._onContextLost = (e) => {
      e.preventDefault();
    };
    this._onContextRestored = () => {
      this.applySettings();
      this.world.applyTheme(this.currentBiome.theme);
    };
    canvas.addEventListener('webglcontextlost', this._onContextLost);
    canvas.addEventListener('webglcontextrestored', this._onContextRestored);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(Save.data.settings.fov || 58, initVp.width / Math.max(1, initVp.height), 0.1, 260);
    this.cameraP2 = new THREE.PerspectiveCamera(Save.data.settings.fov || 58, initVp.width / Math.max(1, initVp.height), 0.1, 260);

    this.input = new InputSystem();
    this.cameraRig = new CameraRig(this.camera);
    this.cameraRigP2 = new CameraRig(this.cameraP2);
    this.world = new World(this.scene);
    this.dayNight = new DayNightCycle(this.scene, this.world);
    this.weather = new WeatherSystem(this.scene, this.world);
    this.particles = new ParticleSystem(this.scene);
    this.spawner = new Spawner(this.scene);
    this.abilities = new DinoAbilities(this.scene);
    this.companions = new CompanionManager(this.scene);
    this.events = new EventManager(this.scene);
    this.difficultyMgr = new DifficultyManager();
    this.spawner.setBossManager(this.events.bosses);

    this.audio = new AudioEngine();
    this.sfx = new SoundEffects(this.audio);
    this.music = new MusicSequencer(this.audio);
    this.narrator = new Narrator((txt) => this.ui.hud.showSubtitle(txt));

    this.replay = new ReplayRecorder();
    this.modeId = 'solo';
    this.customSeed = '';
    this.startBiomeId = 'desert';
    this.sequenceBiomes = true;
    this.currentBiome = getBiomeById('desert');
    this.state = 'menu'; // 'menu' | 'playing' | 'paused' | 'card_pick' | 'gameover' | 'replay' | 'test_track'
    this.photoMode = false;

    this.players = [];
    this.ghostModel = null;
    this.rivalAi = null;
    this.goldenEggProp = null;
    this.impactDebris = [];
    this.pvpRounds = { p1: 0, p2: 0 };
    this.tournamentState = null;
    this.teamsState = null;
    this.godMode = false;
    this.spectatorMode = false;
    this.spectatorFreeOffset = new THREE.Vector3(0, 0, 0);
    this.activeCampaignNode = null;
    this.activeCustomTrack = null;
    this.multiplayerSession = null;
    this.merchantUses = 0;
    this._merchantGuardUntil = 0;
    this.hitStopTimer = 0;
    this.spotlightActive = false;
    this._spotlightQueue = [];
    this._crystalReviveUsed = false;
    this._lastFrameRenderAt = 0;
    this.pendingRestart = false;
    this.restartPrevState = 'playing';
    this.radialWheelOpen = false;
    this.radialCooldown = 0;
    this.tutorialState = null;
    this.seenHints = new Set();
    this.hollowEarthState = null;
    this.shopDetour = null;
    this.nextShopMilestone = 30000;
    this._progressiveNotified = new Set();
    this._portalBiomeAccum = 0;
    this._mpReviveCount = 0;

    // Estados dos novos modos (Raid, Boss Fight/Rush, Free Roam, Race, Competition) e integração §3
    this.bossFightConfig = { submode: 'rush', targetBossId: null };
    this.raceConfig = { targetDistance: RACE_DISTANCES[0] || 5000 };
    this.raidState = null;
    this.bossRushState = null;
    this.raceState = null;
    this.freeRoamState = null;
    this.activeFreeMode = null;
    this._freeModeLaunchToken = 0;
    this.raceAiRacers = [];
    this._predatorHazards = [];
    this._currentDangerTier = { tier: 0, speedBonus: 0, densityBonus: 0, eventFreqBonus: 0, predatorAggro: 1.0 };
    this._lastHudDangerTier = -1;
    this._hudDebuffAccum = 0;
    this._lastCoopBossHit = null;

    this.net = new RoomClient();
    this.perf = new PerfMonitor();
    this.clipRecorder = new ClipRecorder(canvas);

    this.ui = new UIManager(uiRoot, this);
    if (this.ui?.hud?.callbacks) {
      this.ui.hud.callbacks.onToggleGlossary = (isOpen) => {
        if (isOpen && this.state === 'playing') {
          this._pausedByGlossary = true;
          this.state = 'paused';
          this.music.setPlaying(false);
        } else if (!isOpen && this._pausedByGlossary) {
          this._pausedByGlossary = false;
          if (!this.photoMode && !this.pendingRestart && this.ui?.hud?.pauseOverlay?.classList.contains('hidden')) {
            this.state = 'playing';
            this.lastTime = performance.now();
            this.music.setPlaying(true);
          }
        }
      };
    }
    this.tvHud = new TvHud(uiRoot, {
      onFocusPlayer: (id) => {
        const nextId = this.tvHud.focusedId === id ? null : id;
        this.cameraRig.setFocusPlayer(nextId);
      },
      onSpectatorAction: (act) => this._applySpectatorAction(act),
      onToggleFreeCam: () => {
        this.spectatorMode = !this.spectatorMode;
        if (!this.spectatorMode) this.spectatorFreeOffset.set(0, 0, 0);
      }
    });
    this._bindNetworkEvents();
    this.rebuildPlayers();
    this._bindEvents();
    this.applySettings();
    this.openMainMenu();

    if (import.meta.env.DEV) {
      import('../ui/DebugModal.js').then((mod) => {
        mod.DebugModal?.mountIfDev?.(this);
      }).catch(() => {});
    }

    this.lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _bindEvents() {
    this._onResize = () => {
      const vp = OrientationManager.getViewportSize();
      const w = Math.max(1, vp.width);
      const h = Math.max(1, vp.height);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.cameraP2.aspect = w / h;
      this.cameraP2.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.activeFreeMode?.onResize?.(w, h);
    };
    window.addEventListener('resize', this._onResize);
    this._unsubOrientation = OrientationManager.onChange(() => this._onResize());

    // Desbloqueio WebAudio + Gestos Touch (Swipe) + Toque OVNI / Pular Intro + Konami
    this._unlockAudio = () => this.audio.ensureContext();
    this._canvasSwipe = null;
    this._swipeSurface = document.getElementById('app') || this.canvas;
    const isInteractiveTarget = (t) => {
      if (!t || !t.closest) return false;
      return !!t.closest('button, a, input, select, textarea, [data-tact], #btn-fury-melee, #btn-attack-melee, #hud-backpack, #hud-camera, #btn-radial-wheel, #btn-transmute-mode, #touch-radial-btn, #hud-radial-wheel, .chunky-panel, .modal-card, .overlay-center, .hud-layout-editor-bar');
    };
    this._onCanvasPointer = (e) => {
      if (this.state !== 'playing') return;
      if (this.ui?.hud?.isEditingTouchLayout) return;
      if (this.events.predators?.state === 'intro') {
        if (!isInteractiveTarget(e.target) && (this.events.predators.introElapsed || 0) >= 1.0) {
          this.events.predators.skipIntro(this._eventContext());
          this._skipIntroGuardFrames = 3;
        }
        return;
      }
      if (isInteractiveTarget(e.target)) return;
      if (this.events.ufo.active) {
        this.events.ufo.mashBreak();
      }
      if (e.isPrimary !== false) {
        const pt = OrientationManager.mapPointerCoords(e.clientX, e.clientY);
        this._canvasSwipe = {
          id: e.pointerId,
          startX: pt.x,
          startY: pt.y,
          lastAxis: null,
          lastTriggerAt: 0
        };
      }
    };
    this._onCanvasPointerMove = (e) => {
      const sw = this._canvasSwipe;
      if (!sw || sw.id !== e.pointerId || this.state !== 'playing') return;
      if (this.ui?.hud?.isEditingTouchLayout) return;
      if (this.events.predators?.state === 'intro') return;
      if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
      const pt = OrientationManager.mapPointerCoords(e.clientX, e.clientY);
      const dx = pt.x - sw.startX;
      const dy = pt.y - sw.startY;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) return;

      const axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      const now = performance.now();
      const minChainWait = axis === sw.lastAxis ? 145 : 75;
      if (sw.lastTriggerAt && (now - sw.lastTriggerAt) < minChainWait) return;

      sw.startX = pt.x;
      sw.startY = pt.y;
      sw.lastAxis = axis;
      sw.lastTriggerAt = now;

      if (axis === 'h') {
        this.input.triggerVirtualPulse('p1', dx < 0 ? 'left' : 'right', 75);
      } else if (dy < 0) {
        this.input.triggerVirtualPulse('p1', 'jump', 210);
      } else {
        this.input.triggerVirtualPulse('p1', 'duck', 520);
      }
    };
    this._onCanvasPointerEnd = (e) => {
      const sw = this._canvasSwipe;
      if (!sw || sw.id !== e.pointerId) return;
      this.input.setVirtualAction('p1', 'jump', false);
      this._canvasSwipe = null;
    };
    window.addEventListener('pointerdown', this._unlockAudio, { passive: true });
    this._swipeSurface.addEventListener('pointerdown', this._onCanvasPointer);
    this._swipeSurface.addEventListener('pointermove', this._onCanvasPointerMove, { passive: false });
    window.addEventListener('pointerup', this._onCanvasPointerEnd);
    window.addEventListener('pointercancel', this._onCanvasPointerEnd);
    window.addEventListener('keydown', this._unlockAudio);

    this.input.onKonami = () => {
      if (!Save.data.unlockedDinos.includes('ghostgold')) {
        Save.data.unlockedDinos.push('ghostgold');
      }
      if (!Save.data.achievements.includes('konami_secret')) {
        Save.addEggs(25);
        Save.unlockAchievement('konami_secret');
        this.sfx.evolution();
        this.ui.hud.showBanner('✨ CÓDIGO KONAMI! Dino Secreto + 25 Ovos (resgate único)!', '#ffd447', 4.5);
      } else {
        Save.save();
        this.sfx.click();
        this.ui.hud.showBanner('✨ Código Konami já resgatado anteriormente!', '#ffd447', 2.6);
      }
    };

    this._onVisibility = () => {
      if (document.hidden && this.state === 'playing' && !this.multiplayerSession?.active) {
        this.togglePause(true);
      }
    };
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  applySettings() {
    const s = Save.data.settings;
    const isLowSpec = !!Save.data.lowSpecMode;
    const dpr = window.devicePixelRatio || 1;
    const pr = isLowSpec
      ? 0.65
      : (s.quality === 'low' ? 0.72 : (s.quality === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.35)));
    this.renderer.setPixelRatio(pr);
    const useShadows = isLowSpec ? false : !!s.shadows;
    this.renderer.shadowMap.enabled = useShadows;
    this.world.setShadowEnabled(useShadows);
    this.world.setLowSpec(isLowSpec);
    this.particles?.setLowSpec?.(isLowSpec || s.particles === 'min');
    this.world.setBrightness(s.brightness ?? 1.05);
    this.world.setClearVision(!!s.clearVision);
    this.weather?.setClearVision?.(!!s.clearVision);
    this.renderer.toneMappingExposure = 0.96 * (s.brightness ?? 1.05);
    this.cameraRig.baseFov = s.fov || 58;
    this.camera.far = isLowSpec ? 125 : 260;
    this.camera.updateProjectionMatrix();
    if (this.cameraRigP2 && this.cameraP2) {
      this.cameraRigP2.baseFov = s.fov || 58;
      this.cameraP2.far = isLowSpec ? 125 : 260;
      this.cameraP2.updateProjectionMatrix();
    }
    this.spawner.setObstacleHints(s.obstacleHints !== false);
    this.spawner.setDifficultyConfig(this.difficultyMgr.getConfig());
    this.audio.applyVolumes();
    this.ui?.hud?.setDebugButtonVisible?.(import.meta.env.DEV && !!Save.data.devMode);
    if (this.multiplayerSession?.active) {
      this.tvHud.setVisible(true, !!Save.data.network?.tvScale);
    }
  }

  setLowLod(active) {
    this.lowLod = Boolean(active || Save.data.lowSpecMode);
    this.world?.scenery?.setLowDetail?.(this.lowLod);
  }

  _bindNetworkEvents() {
    this.net.on('kicked', (msg) => {
      if (this.ui?.controllerInstance) return;
      this.openMainMenu();
      this.ui?.hud?.showBanner?.(msg?.reason || '👢 Você foi removido da sala.', '#ff4757', 4.5);
    });

    this.net.on('room_state', (room) => {
      if (this.ui?.controllerInstance) return;
      this.ui?.hud?.syncRoomControllers?.(room, this.net.peerId, this.net.pingMs);
    });

    this.net.on('request_start_match', (msg) => {
      if (this.ui?.controllerInstance) return;
      if (!this.net.isHost) return;
      if (this.state === 'playing' && this.multiplayerSession?.active) return;
      this.ui?._clearModal?.();
      this.startMultiplayerMatch(this.net.room, Number(msg?.botCount) || 0);
    });

    this.net.on('pause_request', (msg) => {
      if (this.ui?.controllerInstance) return;
      if (this.state !== 'playing' && this.state !== 'paused') return;
      const room = this.net.room;
      const peer = room?.peers?.find((p) => p.peerId === msg.peerId);
      const pausePolicy = room?.config?.pausePolicy || 'all_limited';
      if (pausePolicy === 'host_only' && msg.peerId !== room?.hostPeerId) {
        if (this.net.isHost) {
          this.ui?.hud?.showBanner?.(`⏸ ${peer?.name || 'Jogador'} pediu Pausa (Somente o Dono pode pausar)`, '#fbbf24', 2.4);
        }
        return;
      }
      this.togglePause();
    });

    this.net.on('radial_action', (msg) => {
      if (this.ui?.controllerInstance) return;
      if (this.state !== 'playing') return;
      if (msg.slot) {
        this.executeRadialAction?.(msg.slot);
      } else {
        this.toggleRadialWheel?.();
      }
    });

    this.net.on('control_request', (msg) => {
      if (this.ui?.controllerInstance) return;
      if (msg.targetPlayerPeerId && msg.targetPlayerPeerId !== this.net.peerId) return;
      this.ui?.showControlConfirmationPopup?.({
        requesterPeerId: msg.requesterPeerId,
        requesterName: msg.requesterName || 'Celular',
        onAccept: () => {
          this.net.sendControlResponse(msg.requesterPeerId, true);
          this.ui?.hud?.showBanner?.(`🎮 ${msg.requesterName || 'Celular'} agora controla seu dino!`, '#58d63a', 3.0);
        },
        onReject: (reason = '') => {
          this.net.sendControlResponse(msg.requesterPeerId, false, reason);
        }
      });
    });

    this.net.on('input', (msg) => {
      if (this.ui?.controllerInstance) return;
      const peer = this.net.room?.peers?.find((pr) => pr.peerId === msg.peerId);
      const boundTargetId = peer?.targetPlayerPeerId || msg.targetPlayerPeerId || null;
      if (peer?.role === 'controller' && !boundTargetId) {
        return; // Ignora comandos de controle ainda não confirmado pelo jogador alvo
      }
      const peerName = peer?.name || msg.name || 'Controle Celular';
      this.ui?.hud?.setControllerStatusHud?.({
        connected: true,
        peerName,
        controllerPeerId: peer?.peerId || msg.peerId,
        pingMs: peer?.pingMs || this.net.pingMs || 12,
        activeInputs: msg.inputs || {},
        controlMode: boundTargetId ? 'bound' : (peer?.controlMode || 'p1_remote')
      });

      if (this.state === 'playing' && this.events.predators?.state === 'intro') {
        if ((msg.inputs?.jump || msg.inputs?.ability) && (this.events.predators.introElapsed || 0) >= 0.8) {
          this.events.predators.skipIntro(this._eventContext());
          this._skipIntroGuardFrames = 3;
        }
      } else if (this.state === 'gameover' && (msg.inputs?.jump || msg.inputs?.ability)) {
        if (!this._ctrlRestartDebounce || performance.now() - this._ctrlRestartDebounce > 1200) {
          this._ctrlRestartDebounce = performance.now();
          this.restartRun();
          return;
        }
      }

      if (this.multiplayerSession?.active && !this.multiplayerSession.isHost && !this.net.isHost) return;
      let target = this.players.find(
        (p) => (boundTargetId && p.peerId === boundTargetId) ||
          (Array.isArray(p.controllerPeerIds) && p.controllerPeerIds.includes(msg.peerId)) ||
          (peer?.role !== 'controller' && p.peerId === msg.peerId)
      );
      if (!target && !this.multiplayerSession?.active && boundTargetId === this.net.peerId) {
        target = this.players[0];
      }
      if (target) {
        this.input.applyRemoteInputMap(target.key, msg.inputs || {});
      }
    });

    this.net.on('card_pick', (msg) => {
      if (this.ui?.controllerInstance) return;
      if (this.multiplayerSession?.active && !this.multiplayerSession.isHost && !this.net.isHost) return;
      const target = this.players.find(
        (p) => p.peerId === msg.peerId || (Array.isArray(p.controllerPeerIds) && p.controllerPeerIds.includes(msg.peerId))
      ) || this.players[0];
      const card = CARD_POOL.find((c) => c.id === msg.cardId);
      if (target && card) {
        card.apply(target, this);
        this.sfx.card(card.rarity === 'lendária');
        this.ui.hud.showFloatText(`${target.name}: ${card.name}!`, '#ffd447');
        if (this.state === 'paused' && !this.photoMode && !this.pendingRestart) {
          this.ui.cardModal?.close?.();
          this.state = 'playing';
          this.lastTime = performance.now();
          if (this.music.enabled) this.music.setPlaying(true);
        }
      }
    });

    this.net.on('spectator_action', (msg) => {
      if (!this.multiplayerSession?.active || !this.multiplayerSession.isHost) return;
      this._applySpectatorAction(msg.action, msg.name || 'Espectador');
    });

    this.net.on('bet', (msg) => {
      if (!this.multiplayerSession?.active) return;
      this.multiplayerSession.bets.set(msg.peerId, { targetPeerId: msg.targetPeerId, amount: msg.amount || 10 });
    });

    this.net.on('emote', (msg) => {
      if (this.state === 'playing') {
        this.ui.hud.showFloatText(`${msg.name || 'Dino'} ${msg.emote || '🦖'}`, '#ffd447');
      }
    });

    this.net.on('chat', (msg) => {
      if (this.state === 'playing' && !msg.isEmote) {
        this.ui.hud.showSubtitle(`${msg.name}: ${msg.text}`);
      }
    });

    this.net.on('start_match', (msg) => {
      if (this.net.isHost || this.ui.controllerInstance) return;
      this.ui._clearModal();
      this.startMultiplayerGuestMatch(msg);
    });

    this.net.on('state_snapshot', (msg) => {
      if (!this.multiplayerSession?.active || this.multiplayerSession.isHost || !msg?.snapshot) return;
      this._applyGuestSnapshot(msg.snapshot);
    });

    this.net.on('card_offer', (msg) => {
      if (!this.multiplayerSession?.active || this.multiplayerSession.isHost || this.ui.controllerInstance) return;
      if (msg.targetPeerId === this.net.peerId && Array.isArray(msg.choices)) {
        const milestone = Math.floor(this.score || 500);
        this.ui.cardModal.open(milestone, false, msg.choices);
      }
    });

    this.net.on('end_match', (msg) => {
      if (!this.multiplayerSession?.active || this.multiplayerSession.isHost || this.ui.controllerInstance) return;
      this.state = 'gameover';
      this.pendingRestart = false;
      this.ui.hud.showRestartConfirm(false);
      this.music.setPlaying(false);
      this.tvHud.setVisible(false);
      this.ui.cardModal.close();
      const rawSummary = msg?.summary || { title: 'FIM DE PARTIDA', standings: [] };
      const myEntry = (rawSummary.standings || []).find((s) => s.peerId === this.net.peerId);
      const guestReward = rawSummary.eligible ? (myEntry?.eggReward || 0) : 0;
      if (guestReward > 0) {
        Save.addEggs(guestReward);
      }
      const winner = rawSummary.standings?.[0];
      if (winner && winner.peerId === this.net.peerId) {
        Save.data.stats.victoriesLan = (Save.data.stats.victoriesLan || 0) + 1;
        if (!Save.data.partySkins.includes('lan_crown')) {
          Save.data.partySkins.push('lan_crown');
        }
        Save.save();
      }
      const summary = { ...rawSummary, rewardEggs: guestReward };
      this.lastPodiumSummary = summary;
      this.ui.showPodium(summary, {
        onReplay: () => this.ui.hud.showBanner('🎬 Replay disponível apenas na tela do Host.', '#ffd447', 2.4),
        onVote: (v) => this.net.sendRoundVote(v),
        onRematch: () => {
          this.net.sendRoundVote({ rematch: true });
          this.ui.hud.showBanner('🔄 Pedido de revanche enviado ao Dono da Sala!', '#38bdf8', 2.6);
        },
        onAgain: () => this.ui.hud.showBanner('⏳ Aguardando o Dono da Sala iniciar a próxima rodada...', '#38bdf8', 2.6),
        onMenu: () => this.openMainMenu()
      });
    });

    this.net.on('mp_revive', (msg) => {
      if (!this.multiplayerSession?.active) return;
      if (this.multiplayerSession.isHost) {
        if (this.multiplayerSession.allowRevive === false) return;
        const revCfg = ContentLoader.getBalance().revive || {};
        const mpRevCfg = this.multiplayerSession.reviveConfig || {};
        const maxPerRun = mpRevCfg.maxPerRun ?? revCfg.maxPerRun ?? 2;
        const cooldownSec = mpRevCfg.cooldownSec ?? revCfg.cooldownSec ?? 25;
        const costType = mpRevCfg.costType || revCfg.costType || 'life_or_shield';

        const payerIdx = Math.max(0, this.players.findIndex((p) => p.peerId === (msg.reviverPeerId || msg.peerId)));
        const payer = this.players[payerIdx];
        const ally = (msg.targetPeerId ? this.players.find((pl) => pl.peerId === msg.targetPeerId && pl.dead) : null)
          || this.players.find((pl) => pl.dead && pl !== payer);
        if (!payer || payer.dead || !ally) return;
        if ((payer.reviveCooldown || 0) > 0) return;
        if ((ally.reviveWindowTimer || 0) <= 0) return;
        if ((ally.reviveCount || 0) >= maxPerRun) return;
        if (!this._canPayReviveCost(payer, costType)) return;

        const paidLabel = this._deductReviveCost(payer, costType);
        payer.reviveCooldown = cooldownSec;
        this._revivePlayerEntity(ally, paidLabel, payer.name || 'Companheiro');
        this.net.activeTransport?.send?.({
          type: 'mp_revive',
          approved: true,
          allyName: ally.name || ally.spec?.name || 'Aliado',
          reviverName: payer.name || 'Companheiro',
          paidLabel,
          reviveCount: this._mpReviveCount
        });
      } else if (msg.approved) {
        if (typeof msg.reviveCount === 'number') this._mpReviveCount = msg.reviveCount;
        this.ui.hud.triggerEdgeFlash('green');
        this.ui.hud.showBanner(`💖 ${msg.allyName || 'Aliado'} REVIVIDO por ${msg.reviverName || 'Companheiro'}!`, '#34d399', 3.0);
        this.sfx.powerup?.();
      }
    });
  }

  _applySpectatorAction(action, actorName = 'Torcida') {
    if (this.state !== 'playing') return;
    if (action === 'help_fruit') {
      this.spawner.spawnFruitRain(5);
      this.ui.hud.showBanner(`🍉 ${actorName} enviou Frutas para os corredores!`, '#4ade80', 2.4);
    } else if (action === 'help_shield') {
      const alive = this.players.filter((p) => !p.dead);
      const pick = alive[Math.floor(Math.random() * alive.length)];
      if (pick) {
        pick.shields = Math.min(4, pick.shields + 1);
        this.ui.hud.showFloatText(`🔰 ESCUDO DE ${actorName}!`, '#38bdf8');
      }
    } else if (action === 'sabotage_cactus') {
      const lane = Math.floor(Math.random() * 3);
      this.spawner._acquire('cactus_small', LANE_X[lane], 0, -48);
      this.ui.hud.showFloatText(`🌵 CACTO DE ${actorName}!`, '#ff4757');
    } else if (action === 'sabotage_rock') {
      const lane = Math.floor(Math.random() * 3);
      this.spawner._acquire('tall_rock', LANE_X[lane], 0, -52);
      this.ui.hud.showFloatText(`🪨 PEDRA DE ${actorName}!`, '#f97316');
    }
  }

  jumpToBiome(biomeId) {
    this.startBiomeId = biomeId;
    this.sequenceBiomes = false;
    this.currentBiome = getBiomeById(biomeId);
    this.world.applyTheme(this.currentBiome.theme);
    this.spawner.setBiome(this.currentBiome.id);
    this._discoverCurrentBiomeFossil(true);
    this.ui.hud.showBanner(`🌍 Bioma alterado para: ${this.currentBiome.name}`, '#00f5d4', 2.8);
  }

  _discoverCurrentBiomeFossil(silent = false) {
    const fossil = this.currentBiome?.fossil;
    if (!fossil?.id) return;
    if (!Save.data.discoveredFossils) Save.data.discoveredFossils = {};
    if (!Save.data.discoveredFossils[fossil.id]) {
      Save.data.discoveredFossils[fossil.id] = {
        name: fossil.name,
        icon: fossil.icon,
        biome: this.currentBiome.name,
        at: Date.now()
      };
      Save.save();
      if (!silent) {
        this.ui.hud.showBanner(`${fossil.icon} Fóssil Descoberto: ${fossil.name} (${this.currentBiome.name})!`, '#ffd447', 3.4);
      }
    }
  }

  startCampaignNode(node) {
    this.activeCampaignNode = node;
    this.activeCustomTrack = null;
    this.modeId = 'solo';
    this.setBiomeConfig(node.biome, false);
    this.startRun(false);
    this.ui.hud.showBanner(`🗺️ CAMPANHA: ${node.title} (Meta: ${node.targetScore} pts)`, '#ffd447', 4.0);
  }

  startCustomTrack(track) {
    this.activeCustomTrack = track;
    this.activeCampaignNode = null;
    this.modeId = 'solo';
    this.customSeed = track.seed || '';
    this.setBiomeConfig(track.biome || 'desert', false);
    this.startRun(false);
    this.ui.hud.showBanner(`🛠️ PISTA CUSTOMIZADA: ${track.name}`, '#38bdf8', 3.6);
  }

  toggleClipRecording() {
    if (!this.clipRecorder.isSupported()) {
      this.ui.hud.showFloatText('Gravação .webm indisponível neste navegador', '#ff4757');
      return;
    }
    if (this.clipRecorder.recording) {
      this.clipRecorder.stop();
      this.ui.hud.setClipRecording(false);
      this.ui.hud.showFloatText('🎥 Clipe salvo!', '#58d63a');
    } else {
      const ok = this.clipRecorder.start(() => {
        this.ui.hud.setClipRecording(false);
        this.ui.hud.showFloatText('🎥 Clipe (12s) exportado em Downloads!', '#58d63a');
      });
      this.ui.hud.setClipRecording(ok);
      if (ok) this.ui.hud.showFloatText('🔴 Gravando Clipe (até 12s)...', '#ff4757');
    }
  }

  triggerManualAttack(idx = 0) {
    const p = this.players[idx];
    if (!p || p.dead || this.state !== 'playing') return;
    this._performMeleeAttack(p);
  }

  breatheOrSurface(idx = 0) {
    const p = this.players[idx];
    if (!p || p.dead || this.state !== 'playing') return false;
    const isSubmergedNow = Boolean(p.inSubmerged || (p.inWater && ((p.diveDepth || 0) > 0.25 || (p.diveTarget || 0) >= 0.5)));
    if (!p.inWater && !isSubmergedNow) return false;
    if (!p.inSubmerged) {
      p.diveTarget = 0;
      p.diveDepth = 0;
      p.diveTimer = 0;
      p.vy = Math.max(p.vy || 0, 11.5);
      p.grounded = false;
      p.oxygen = Math.min(100, (p.oxygen ?? 100) + 35);
      this.sfx.jump(true);
      this.particles.emitDust(p.x, (p.baseY || 0) + 0.35, p.z, 10, '#67e8f9', 3.0);
      if (p.index === 0) this.ui.hud.showFloatText('🫧 SUBINDO PARA RESPIRAR (+O₂)!', '#38bdf8');
      return true;
    }
    if ((p._abyssBreatheCd || 0) > 0) return false;
    p._abyssBreatheCd = 3.0;
    p.oxygen = Math.min(100, (p.oxygen ?? 100) + 35);
    this.sfx.heal?.();
    this.particles.emitDust(p.x, (p.baseY || 0) + 0.8, p.z, 10, '#67e8f9', 2.4);
    if (p.index === 0) this.ui.hud.showFloatText('🫧 BOLHA DE AR (+35% O₂)!', '#38bdf8');
    return true;
  }

  _performMeleeAttack(p) {
    const bossActive = Boolean(this.events?.bosses?.activeBoss);
    if (!bossActive && !p._unlockAll && !this.isTestTrack && Save.data.settings?.progressiveUnlocks !== false && this.score < 1800) {
      if (!p._lowStamToastCooldown) {
        p._lowStamToastCooldown = 0.8;
        this.ui.hud.showFloatText('🔒 Ataque [Q] libera aos 1.800 pts!', '#94a3b8');
      }
      return;
    }
    if (p.attackTimer > 0 || (p.attackCooldown || 0) > 0) return;

    const atkCfg = ContentLoader.getBalance().playerAttack || {};
    const baseDamage = atkCfg.damage ?? 28;
    const baseCd = atkCfg.cooldownSec ?? 0.65;
    const baseRangeZ = atkCfg.rangeZ ?? 18;
    const baseRangeX = atkCfg.rangeX ?? 2.6;
    const hitStopSec = atkCfg.hitStopSec ?? 0.045;

    const dinoClass = p.spec?.dinoClass || 'carnivore';
    let classDmgMult = 1.0;
    let classCdMult = 1.0;
    let classRangeXMult = 1.0;
    let classRangeZMult = 1.0;
    let fxColor = '#ffd447';
    if (dinoClass === 'carnivore') {
      classDmgMult = 1.15;
      classCdMult = 0.95;
      fxColor = '#ff5e1a';
    } else if (dinoClass === 'herbivore') {
      classDmgMult = 1.05;
      classRangeXMult = 1.25;
      fxColor = '#4ade80';
    } else if (dinoClass === 'aquatic' || dinoClass === 'amphibious') {
      classRangeZMult = 1.15;
      fxColor = '#22d3ee';
    } else if (dinoClass === 'flying') {
      classCdMult = 0.85;
      fxColor = '#bae6fd';
    }

    const attackPower = (p.attackPowerMult || 1) * classDmgMult;
    const dmg = Math.round(baseDamage * attackPower);
    p.attackTimer = 0.24;
    p.attackMaxCooldown = Math.max(0.35, baseCd * classCdMult * (p.attackCdMult || 1));
    p.attackCooldown = p.attackMaxCooldown;
    p.animator?.triggerRoar?.(0.25);
    this.sfx?.melee?.();
    this.particles?.emitDust?.(p.x, (p.baseY || 0) + 0.8, p.z - 0.9, 8, fxColor, 2.8);

    const trackOffset = p.trackOffsetX || 0;
    const localX = p.x - trackOffset;
    const reachX = baseRangeX * classRangeXMult * (attackPower > 1.1 ? 1.1 : 1);
    const reachZ = baseRangeZ * classRangeZMult;
    const obsReachZ = Math.min(reachZ, 7.5);
    const smashPts = Math.round(35 * attackPower);
    let landedHit = false;

    for (const obs of this.spawner.getActiveObstacles()) {
      if (obs.hit || !obs.breakable) continue;
      if (obs._hitBy && obs._hitBy.has(p.key)) continue;
      const dx = Math.abs(obs.group.position.x - localX);
      const dz = obs.group.position.z - p.z;
      if (dx < reachX && dz > -obsReachZ && dz < 1.6) {
        if (this.multiplayerSession?.active && this.multiplayerSession.trackMode !== 'classic') {
          obs._hitBy = obs._hitBy || new Set();
          obs._hitBy.add(p.key);
        } else {
          obs.hit = true;
          obs.pool?.release(obs);
        }
        this.particles?.emitExplosion?.(trackOffset + obs.group.position.x, (obs.group.position.y || 0) + 0.8, obs.group.position.z, obs.color, 12, true);
        this._spawnImpactDebris(trackOffset + obs.group.position.x, obs.group.position.z, obs.color);
        p.wantedStars = Math.min(5, (p.wantedStars || 0) + 0.3);
        this.addScore(smashPts * (this.combo || 1), p);
        this.ui.hud.showFloatText(`💥 -${dmg} QUEBROU! +${smashPts}`, fxColor);
        landedHit = true;
      }
    }

    // B2: Ataque Q contra Boss, Orbe de Ponto Fraco e Projéteis do Boss
    const bosses = this.events?.bosses;
    const b = bosses?.activeBoss;
    if (b) {
      if (bosses.weakOrb?.visible) {
        const orbDx = Math.abs(bosses.weakOrb.position.x - localX);
        const orbDz = bosses.weakOrb.position.z - p.z;
        if (orbDx < reachX && orbDz > -reachZ && orbDz < 2.0) {
          const weakDmg = this._computeBossAttackDamage(p, Math.max(dmg, 35), true);
          bosses._hitBossWeakPoint?.(p, this.players, this._eventContext());
          this._recordBossDamage(p, weakDmg);
          landedHit = true;
        }
      }
      if (Array.isArray(bosses.hazardShots)) {
        for (let i = bosses.hazardShots.length - 1; i >= 0; i--) {
          const s = bosses.hazardShots[i];
          if (s.hit) continue;
          const sDx = Math.abs(s.mesh.position.x - localX);
          const sDz = s.mesh.position.z - p.z;
          if (sDx < reachX && sDz > -reachZ && sDz < 2.0) {
            s.hit = true;
            this.scene.remove(s.mesh);
            bosses.hazardShots.splice(i, 1);
            this.particles?.emitExplosion?.(trackOffset + s.mesh.position.x, s.mesh.position.y + 0.6, s.mesh.position.z, fxColor, 10, true);
            this.addScore(30 * (this.combo || 1), p);
            this.ui.hud.showFloatText('⚔️ PROJÉTIL DESTRUÍDO! +30', fxColor);
            landedHit = true;
          }
        }
      }
      if (b.introTimer <= 0 && b.currentHp > 0) {
        const bossX = bosses.group?.position?.x ?? 0;
        const bossZ = bosses.group?.position?.z ?? -33;
        const bossDx = Math.abs(bossX - localX);
        const bossDz = bossZ - p.z;
        if (bossDx <= reachX + 2.4 && bossDz >= -(reachZ + 22) && bossDz <= 2.0) {
          const ctx = this._eventContext();
          const finalDmg = this._computeBossAttackDamage(p, dmg, false);
          if (typeof bosses.applyPlayerAttack === 'function') {
            bosses.applyPlayerAttack(p, finalDmg, ctx);
          } else {
            const appliedDmg = b.maxHp > 25 ? finalDmg : Math.max(1, Math.round(finalDmg / 25));
            b.currentHp = Math.max(0, b.currentHp - appliedDmg);
            const hpRatio = b.currentHp / Math.max(1, b.maxHp);
            const nextPhase = hpRatio <= 0.33 ? 3 : (hpRatio <= 0.66 ? 2 : 1);
            b.phase = nextPhase;
            bosses.bossRig?.setPhase?.(nextPhase);
            bosses.bossRig?.setPhaseVisuals?.(hpRatio);
            this.particles?.emitExplosion?.(bossX, 2.2, bossZ, fxColor, 14, true);
            this.ui.hud.showFloatText(`⚔️ -${appliedDmg} HP NO CHEFE!`, fxColor);
            if (b.currentHp <= 0) {
              bosses.clear();
              ctx.onBossHudUpdate?.(null);
              this.addScore(750, p);
              this.sfx?.victory?.();
              this.ui.hud.showFloatText(`🏆 ${b.name} DERROTADO!`, '#58d63a');
            } else {
              ctx.onBossHudUpdate?.(b);
            }
          }
          this._recordBossDamage(p, finalDmg);
          this.cameraRig?.triggerShake?.(0.32, 0.16);
          landedHit = true;
        }
      }
    }

    if (landedHit) {
      this.hitStopTimer = Math.max(this.hitStopTimer || 0, hitStopSec);
    }
    if (this.tutorialState?.active && (this.tutorialState.step === 5 || (!this.tutorialState.isFirstRunMini && this.tutorialState.step === 3))) {
      this._advanceTutorialStep();
    }
    if (p.id === 'scary_raptor' && this.events?.predators?.state === 'chase') {
      this.addScore(Math.round(75 * 1.5 * (this.combo || 1)), p);
      this.ui.hud.showFloatText('🦖 MORDIDA FÓSSIL NO PREDADOR! (+50% DANO)', '#facc15');
    }
    if (p.index === 0) {
      this._triggerFirstUseSpotlight('spotlight_attack', {
        icon: '⚔️',
        title: 'Ataque Rápido [Q]',
        desc: 'Use [Q] perto de cactos quebráveis, troncos e espinhos para destruí-los e carregar sua habilidade!',
        selector: '#bar-attack',
        accent: '#fb923c'
      });
    }

    const isDuel = (this.multiplayerSession?.active && this.multiplayerSession.mpMode === 'duel')
      || this.modeId === 'pvp'
      || this.modeId === 'capture_egg';
    if (isDuel) {
      for (const other of this.players) {
        if (other === p || other.dead || (other.pvpHitInvuln || 0) > 0) continue;
        if (Math.abs(other.x - p.x) < 1.7 && Math.abs(other.z - p.z) < 3.6 && Math.abs(other.y - p.y) < 1.55) {
          other.pvpHitInvuln = 2.0;
          if (other.lane === p.lane) {
            other.lane = p.lane === 0 ? 1 : (p.lane === 2 ? 1 : (other.x >= p.x ? 2 : 0));
          }
          other.armorSlowTimer = Math.max(other.armorSlowTimer || 0, 1.0);
          p.pvpHits = (p.pvpHits || 0) + 1;
          const steal = Math.min(other.score || 0, 25);
          other.score = Math.max(0, (other.score || 0) - steal);
          p.score = (p.score || 0) + 25;
          if (this.modeId === 'pvp') {
            this._damagePlayer(other, 'pvp');
          } else if (this.modeId === 'capture_egg' && other.holdingGoldenEgg) {
            other.holdingGoldenEgg = false;
            p.holdingGoldenEgg = true;
            this.sfx.collectEgg(true);
            this.ui.hud.showFloatText('🥚 OVO ROUBADO NO ATAQUE!', '#ffd447');
          }
          this.particles.emitExplosion(other.x, other.y + 0.9, other.z, '#ff9a24', 12, true);
          this.sfx.stomp();
          this.ui.hud.showFloatText(`⚔️ ${p.name} EMPURROU ${other.name}! +25`, '#ff9a24');
        }
      }
    }
  }

  setMode(modeId, seed = '') {
    this.modeId = modeId;
    this.customSeed = seed;
    this.pvpRounds = { p1: 0, p2: 0 };
    this.tournamentState = modeId === 'tournament'
      ? { players: ['P1', 'P2', 'P3', 'P4'], scores: [], currentIdx: 0 }
      : null;
    this.teamsState = modeId === 'teams_2v2'
      ? { teamScores: [0, 0], currentTeam: 0 }
      : null;
  }

  startQuickMode(modeId, opts = {}) {
    if (!modeId) return false;
    this.sfx?.click?.();
    if (!FREE_3D_MODES.has(this.modeId)) {
      this._returnModeId = this.modeId || 'solo';
    }
    this.setMode(modeId, opts.seed || '');
    this.ui?._clearModal?.();
    this.startRun(false, opts);
    return true;
  }

  setBossFightConfig(cfg = {}) {
    this.bossFightConfig = {
      submode: cfg.submode === 'single' ? 'single' : 'rush',
      targetBossId: cfg.targetBossId || null
    };
  }

  setRaceDistance(distanceMeters = 5000) {
    this.raceConfig = {
      targetDistance: Number(distanceMeters) >= 10000 ? 10000 : 5000
    };
  }

  setFreeRoamBiome(biomeId) {
    const target = getBiomeById(biomeId);
    if (!target) return false;
    this.currentBiome = target;
    this.world.applyTheme(target.theme, false);
    this.spawner.setBiome(target.id);
    this._applyBiomePlayersState(target);
    this.ui.hud.showBanner(`🧪 SANDBOX — Bioma: ${target.name}`, '#34d399', 2.4);
    return true;
  }

  setFreeRoamSpeed(mult = 1.0) {
    if (!this.freeRoamState) this.freeRoamState = { active: true, speedScale: 1.0, spawnPaused: false };
    this.freeRoamState.speedScale = Math.max(0.4, Math.min(2.2, Number(mult) || 1.0));
    this.ui.hud.showFloatText(`🧪 Velocidade: ${Math.round(this.freeRoamState.speedScale * 100)}%`, '#34d399');
    return this.freeRoamState.speedScale;
  }

  spawnFreeRoamEntity(kind = 'wave') {
    if (this.state !== 'playing') return false;
    if (kind === 'boss') {
      const bId = this.currentBiome?.bossId || 'alpha_trex';
      if (typeof this.events?.bosses?.startBossById === 'function') {
        this.events.bosses.startBossById(bId, this.players.length, this.difficultyMgr.activeId);
      } else {
        this.events?.bosses?.startBoss?.(bId, this.players.length, this.difficultyMgr.activeId);
      }
      this.ui.hud.showFloatText(`👑 Boss invocado: ${bId}`, '#fb923c');
      return true;
    }
    if (typeof this.spawner.spawnFromCatalog === 'function') {
      const spawned = this.spawner.spawnFromCatalog(Math.random, {
        biomeId: this.currentBiome?.id,
        dangerTier: this._currentDangerTier,
        modeId: this.modeId
      });
      if (spawned) {
        this.ui.hud.showFloatText('🧪 Entidade de catálogo gerada!', '#38bdf8');
        return true;
      }
    }
    const lane = Math.floor(Math.random() * 3);
    const lx = this.spawner._isWaterTrack?.() ? this.spawner._getLaneX(lane) : LANE_X[lane];
    this.spawner._acquire?.('cactus_tall', lx, 0, -58);
    this.ui.hud.showFloatText('🧪 Obstáculo gerado sob demanda!', '#38bdf8');
    return true;
  }

  _computeBossAttackDamage(p, baseDmg, isWeakPoint = false) {
    let dmg = Math.max(1, Number(baseDmg) || 20);
    if (p?.id === 'scary_raptor') {
      dmg *= 1.5; // Mordida Fóssil: +50% dano [Q] em chefes e predadores
    }
    const affix = this.raidState?.active ? this.raidState.activeAffix : null;
    if (affix && !isWeakPoint && typeof affix.damageMult === 'number') {
      dmg *= affix.damageMult;
    }
    // Sinergia de ataque Coop / Raid (2+ jogadores acertando o chefe em janela de 2.0s)
    const isTeamMode = this.modeId === 'coop' || this.modeId === 'raid' || (this.multiplayerSession?.active && this.players.length >= 2);
    if (isTeamMode && this.players.length >= 2) {
      const last = this._lastCoopBossHit;
      if (last && last.playerKey !== p.key && (this.runTime - last.at) <= 2.0) {
        const synMult = affix?.synergyBonus || 1.35;
        dmg *= synMult;
        p.abilityCharge = Math.min(100, (p.abilityCharge || 0) + 12);
        this.ui.hud.showFloatText(`⚡ SINERGIA COOP! +${Math.round((synMult - 1) * 100)}% DANO!`, '#fde047');
      }
      this._lastCoopBossHit = { playerKey: p.key, at: this.runTime };
    }
    return Math.max(1, Math.round(dmg));
  }

  _recordBossDamage(p, dmg) {
    if (!p || !dmg || dmg <= 0) return;
    p.raidDamage = (p.raidDamage || 0) + dmg;
    if (this.raidState?.active) {
      this.raidState.totalDamage = (this.raidState.totalDamage || 0) + dmg;
    }
  }

  setBiomeConfig(biomeId, seq) {
    this.startBiomeId = biomeId;
    this.sequenceBiomes = seq;
    this.currentBiome = getBiomeById(biomeId);
    if (this.state === 'menu') {
      this._syncMenuEnvironment();
    } else {
      this.world.applyTheme(this.currentBiome.theme);
    }
  }

  _clearPlayersFromScene() {
    for (const p of this.players) {
      this.scene.remove(p.model.root);
    }
    this.players = [];
    if (this.ghostModel) {
      this.scene.remove(this.ghostModel.root);
      this.ghostModel = null;
    }
    if (this.rivalAi) {
      this.scene.remove(this.rivalAi.model.root);
      this.rivalAi = null;
    }
    if (this.goldenEggProp) {
      this.scene.remove(this.goldenEggProp);
      this.goldenEggProp = null;
    }
    if (Array.isArray(this.raceAiRacers) && this.raceAiRacers.length) {
      for (const ai of this.raceAiRacers) {
        if (ai?.model?.root) this.scene.remove(ai.model.root);
      }
      this.raceAiRacers = [];
    }
    this._predatorHazards = [];
    this.companions.clear();
  }

  _createPlayerNameTag(name, color = '#ffd447', highlight = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(18, 10, 6, 0.82)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(14, 10, 228, 44, 14);
    else ctx.fillRect(14, 10, 228, 44);
    ctx.fill();
    ctx.lineWidth = highlight ? 4 : 2.5;
    ctx.strokeStyle = color || '#ffd447';
    ctx.stroke();
    ctx.fillStyle = '#fff6de';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = String(name || 'Dino').slice(0, 14);
    ctx.fillText(highlight ? `★ ${text}` : text, 128, 33);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(2.2, 0.55, 1);
    return spr;
  }

  _getTrackOffsetForIndex(idx, trackMode) {
    if (trackMode !== 'parallel' || idx <= 0) return 0;
    const ring = Math.ceil(idx / 2);
    return (idx % 2 === 1 ? 1 : -1) * ring * 24;
  }

  _applyGhostModeVisuals() {
    const trackMode = this.multiplayerSession?.active ? (this.multiplayerSession.trackMode || 'parallel') : 'classic';
    const isGhost = trackMode === 'ghost' && this.players.length > 1;
    const localPeerId = this.net?.peerId;
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      const isLocal = localPeerId ? p.peerId === localPeerId : i === 0;
      const shouldGhost = isGhost && !isLocal;
      p.model?.root?.traverse?.((obj) => {
        if (obj.isMesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            m.transparent = shouldGhost;
            m.opacity = shouldGhost ? 0.42 : 1.0;
            m.depthWrite = !shouldGhost;
          }
        }
      });
    }
  }

  rebuildPlayers(customRoster = null) {
    this._clearPlayersFromScene();
    const modeDef = getModeDef(this.modeId);
    const diff = this.difficultyMgr.getConfig();
    const talents = Save.data.talents || {};
    const vitalityBonus = Math.floor((talents.vitality || 0) / 2);
    const isPerfect = !!Save.data.perfectMode && this.modeId !== 'zen' && !this.isTestTrack && !this.tutorialState?.active;
    const baseHp = (isPerfect || this.modeId === 'hardcore') ? 1 : (diff.lives + vitalityBonus);
    const activeSeason = Metagame.getActiveSeason();
    const hasCrown = (Save.data.partySkins || []).includes('lan_crown');

    const roster = Array.isArray(customRoster) && customRoster.length > 0
      ? customRoster
      : Array.from({ length: modeDef.players || 1 }, (_, i) => ({
          key: i === 0 ? 'p1' : 'p2',
          dinoId: i === 0 ? (Save.data.selectedDino || 'trex') : 'raptor',
          name: i === 0 ? (Save.data.team?.name ? `${Save.data.team.emblem || '🦖'} P1` : 'Jogador 1') : 'Jogador 2',
          peerId: null,
          color: null,
          isBot: false
        }));

    const count = roster.length;
    for (let i = 0; i < count; i++) {
      const slot = roster[i];
      const pKey = slot.key || `p${i + 1}`;
      const dinoId = slot.dinoId || 'trex';
      const spec = getDinoSpec(dinoId);
      const slotCustom = slot.customization && typeof slot.customization === 'object' ? slot.customization : null;
      const localCustom = slotCustom || ((pKey === 'p1' || pKey === 'p2') ? getActivePreset(pKey) : {});
      const eqSkinVariant = slotCustom?.skinVariant || (i === 0 ? getEquippedSkinVariant(dinoId) : (slot.skinVariant || localCustom.skinVariant || 'normal'));
      const eqMutationId = i === 0 ? (Save.data.equippedMutation || null) : null;
      const eqMutationTier = (i === 0 && eqMutationId) ? getMutationActiveLevel(eqMutationId) : 1;
      const mutProfile = eqMutationId ? getMutationComputedProfile(eqMutationId, eqMutationTier) : null;
      const hybridsAllowed = !this.multiplayerSession?.active || this.multiplayerSession.allowHybrids !== false;
      const hybridCfg = hybridsAllowed ? (slotCustom?.hybrid || (i === 0 ? Save.data.hybrid : null)) : null;
      const habInfo = getEffectiveDinoHabitat(spec, { hybrid: hybridCfg, mutationId: eqMutationId });
      const swimCaps = getDinoSwimCapabilities(spec, { hybrid: hybridCfg, mutationId: eqMutationId });
      const aquaticPhysiology = getDinoAquaticPhysiology(spec, { hybrid: hybridCfg, mutationId: eqMutationId });
      const initialHabitat = habInfo.primary === 'amphibious' ? 'land' : (habInfo.primary || 'land');
      const modelCfg = {
        ...localCustom,
        skinVariant: eqSkinVariant,
        mutation: eqMutationId,
        mutationTier: eqMutationTier,
        ...(slot.color && !slotCustom?.useCustomColors ? { useCustomColors: true, primary: slot.color } : {}),
        ...(i === 0 ? { hybrid: hybridCfg, season: activeSeason, partyCrown: hasCrown } : { hybrid: hybridCfg, season: activeSeason })
      };
      const model = DinoFactory.build(dinoId, modelCfg, {
        allowHybrid: hybridsAllowed && !!hybridCfg?.enabled,
        skinVariant: eqSkinVariant,
        mutationTier: eqMutationTier
      });
      const trackMode = this.multiplayerSession?.active ? (this.multiplayerSession.trackMode || 'parallel') : 'classic';
      const trackOffsetX = (trackMode === 'parallel' && count > 1) ? this._getTrackOffsetForIndex(i, trackMode) : 0;
      const startLane = (trackMode === 'parallel' || count === 1) ? 1 : (i % 3);
      const laneOffset = (trackMode === 'classic' && count > 3) ? ((Math.floor(i / 3) - 0.5) * 0.45) : 0;
      model.root.position.set(trackOffsetX + LANE_X[startLane] + laneOffset, 0, trackMode === 'parallel' ? 0 : Math.floor(i / 3) * 0.65);
      if (count > 1) {
        const nameTag = this._createPlayerNameTag(slot.name || spec.name, slot.color || spec.colors.primary, i === 0);
        nameTag.position.set(0, 2.75, 0);
        model.root.add(nameTag);
        model.nameTag = nameTag;
      }
      this.scene.add(model.root);

      const diffShield = this.difficultyMgr.activeId === 'easy' && this.modeId !== 'hardcore' ? 1 : 0;
      const startShields = isPerfect ? 0 : Math.min(4, (spec.dinoClass === 'herbivore' && this.modeId !== 'hardcore' ? 1 : 0) + diffShield);
      const speciesHpOffset = (spec.stats?.hp ?? 3) - 3;
      const playerMaxHp = (isPerfect || this.modeId === 'hardcore')
        ? 1
        : Math.max(1, Math.min(7, baseHp + speciesHpOffset));

      this.players.push({
        index: i,
        key: pKey,
        id: dinoId,
        name: slot.name || spec.name,
        peerId: slot.peerId || null,
        controllerPeerIds: Array.isArray(slot.controllerPeerIds) ? slot.controllerPeerIds : [],
        peerColor: slot.color || spec.colors.primary,
        isBot: !!slot.isBot,
        botThinkTimer: 0,
        xOffset: laneOffset,
        score: 0,
        spec,
        model,
        animator: new DinoAnimator(model),
        backpack: new Backpack(3),
        skillLevel: Save.data.dinoLevels[dinoId] || 1,
        lane: startLane,
        trackIndex: i,
        trackOffsetX,
        x: trackOffsetX + LANE_X[startLane] + laneOffset,
        y: 0,
        z: trackMode === 'parallel' ? 0 : Math.floor(i / 3) * 0.65,
        vy: 0,
        grounded: initialHabitat !== 'flying',
        ducking: false,
        sliding: false,
        slideTimer: 0,
        jumpHoldTimer: 0,
        extraJumps: dinoId === 'compsognathus' ? 1 : 0,
        airJumpsUsed: 0,
        isPerfectMode: isPerfect,
        hp: playerMaxHp,
        maxHp: playerMaxHp,
        shields: startShields,
        dead: false,
        reviveProgress: 0,
        reviveCount: 0,
        reviveCooldown: 0,
        reviveWindowTimer: 0,
        invulnTimer: 0,
        fury: 0,
        furyTimer: 0,
        giantScale: 1,
        abilityCooldown: 0,
        abilityMaxCooldown: spec.ability.cooldown,
        abilityDuration: 0,
        abilityCharge: 100,
        stamina: 100,
        element: null,
        wantedStars: 0,
        attackTimer: 0,
        attackCooldown: 0,
        attackMaxCooldown: Math.max(0.95, Math.min(1.6, 1.65 - (spec.stats?.attack ?? 6) * 0.065)),
        pvpHitInvuln: 0,
        pvpHits: 0,
        rank: i + 1,
        gasMaskTimer: 0,
        grappleTimer: 0,
        minecartTimer: 0,
        riverLogTimer: 0,
        gravityZoneTimer: 0,
        gravityZoneMode: null,
        resonanceWindow: 0,
        ramTimer: 0,
        turboTimer: 0,
        magnetTimer: 0,
        permanentMagnet: (talents.magnet || 0) * 1.4,
        eggValueMult: 1 + (talents.greed || 0) * 0.15,
        scoreMultBonus: Metagame.getPrestigeMultiplier() * (1 + (talents.speed || 0) * 0.05),
        rocketTimer: 0,
        diveTimer: 0,
        mountedTimer: 0,
        armorSlowTimer: 0,
        torchTimer: 0,
        freezeMeter: 0,
        flipTimer: 0,
        dustTimer: 0,
        campfireSaved: false,
        captureEggTime: 0,
        holdingGoldenEgg: i === 0 && this.modeId === 'capture_egg',
        smallHitbox: dinoId === 'compsognathus',
        habitat: initialHabitat,
        habitatMode: initialHabitat,
        baseHabitat: habInfo.primary,
        availableHabitats: habInfo.availableModes,
        canWalkOnLand: habInfo.canWalkOnLand,
        grantsLandWalk: habInfo.grantsLandWalk,
        swimProfile: swimCaps.swimProfile,
        canSubmerge: swimCaps.canSubmerge,
        surfaceSwimOnly: swimCaps.surfaceSwimOnly,
        isAmphibious: swimCaps.isAmphibious,
        swimModeLabel: swimCaps.swimModeLabel,
        swimModeDescription: swimCaps.swimModeDescription,
        diveDepth: initialHabitat === 'aquatic' && aquaticPhysiology === 'aquatic_gills' ? 1 : 0,
        diveTarget: initialHabitat === 'aquatic' && aquaticPhysiology === 'aquatic_gills' ? 1 : 0,
        inWater: false,
        inSubmerged: false,
        oxygen: 100,
        _oxygenDmgTimer: 0,
        _oxygenWarnCd: 0,
        equippedAccessory: localCustom?.accessory || 'none',
        aquaticPhysiology,
        isAquaticGills: aquaticPhysiology === 'aquatic_gills',
        isAmphibiousHybrid: aquaticPhysiology === 'amphibious_hybrid',
        isAquaticNative: habInfo.primary === 'aquatic' || habInfo.primary === 'amphibious' || aquaticPhysiology !== 'terrestrial',
        skinVariant: eqSkinVariant,
        mutationId: eqMutationId,
        mutationTier: eqMutationTier,
        mutationMods: (mutProfile?.mods) || (eqMutationId ? getMutationDef(eqMutationId)?.mods : null) || null,
        inShopLane: null,
        _staminaRegenDelay: 0,
        _unlockAll: Boolean(this.isTestTrack || this.modeId === 'tutorial')
      });
      const built = this.players[this.players.length - 1];
      const mutMods = built?.mutationMods;
      if (built && mutMods) {
        if (mutMods.startShield) built.shields = (built.shields || 0) + mutMods.startShield;
        if (mutMods.scoreMult) built.scoreMultBonus = (built.scoreMultBonus || 1) * (1 + mutMods.scoreMult);
        if (mutMods.jumpMult) built.jumpMult = (built.jumpMult || 1) * (1 + mutMods.jumpMult);
        if (mutMods.speedMult) built.speedBonus = (built.speedBonus || 1) * (1 + mutMods.speedMult);
        if (mutMods.magnetBonus) built.permanentMagnet = (built.permanentMagnet || 0) + mutMods.magnetBonus;
        if (mutMods.hitboxScale) built.hitboxScale = (built.hitboxScale || 1) * mutMods.hitboxScale;
        if (mutMods.attackCdMult) built.attackCdMult = mutMods.attackCdMult;
        if (mutMods.laneSpeedMult) built.laneSpeedMult = (built.laneSpeedMult || 1) * mutMods.laneSpeedMult;
        if (mutMods.stabilityBonus) built.stabilityBonus = (built.stabilityBonus || 0) + mutMods.stabilityBonus;
        if (mutMods.attackPowerMult) built.attackPowerMult = (built.attackPowerMult || 1) * mutMods.attackPowerMult;
        if (mutMods.waterSpeedMult) built.waterSpeedMult = (built.waterSpeedMult || 1) * mutMods.waterSpeedMult;
        if (mutMods.airStaminaCostMult) built.airStaminaCostMult = (built.airStaminaCostMult || 1) * mutMods.airStaminaCostMult;
        if (mutMods.eggBonus) built.eggValueMult = (built.eggValueMult || 1) * (1 + mutMods.eggBonus);
      }
      if (built && (eqSkinVariant === 'shiny' || eqSkinVariant === 'secret')) {
        built.scoreMultBonus = (built.scoreMultBonus || 1) * (eqSkinVariant === 'secret' ? 1.25 : 1.15);
      }
    }
    this._applyGhostModeVisuals();
    if (this.state === 'menu') {
      this._syncMenuEnvironment();
    }
  }

  _disposeFreeMode() {
    this._freeModeLaunchToken = (this._freeModeLaunchToken || 0) + 1;
    if (this.activeFreeMode) {
      try {
        this.activeFreeMode.dispose?.();
      } catch (err) {
        console.warn('Erro ao encerrar modo 3D livre:', err);
      }
      this.activeFreeMode = null;
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('#mode3d-overlay, .m3d-root, .m3d-dice-layer').forEach((n) => n.remove());
      document.body?.classList?.remove('mode-3d-active', 'rpg-active', 'arena-active');
    }
    if (this.world?.worldGroup) this.world.worldGroup.visible = true;
    if (this.world?.scenery?.group) this.world.scenery.group.visible = true;
    if (this.camera) {
      this.camera.fov = Number(Save.data.settings?.fov) || 58;
      this.camera.up.set(0, 1, 0);
      this.camera.updateProjectionMatrix();
    }
  }

  async _startFree3DMode(modeId, opts = {}) {
    this._disposeFreeMode();
    const launchToken = this._freeModeLaunchToken;

    this.state = 'playing';
    this.photoMode = false;
    this.pendingRestart = false;
    this.spotlightActive = false;
    this.ui?._clearModal?.();
    this.ui.hud.resetAllOverlays();
    this.ui.hud.setPlayingUI(false);

    for (const p of this.players) {
      if (p?.model?.root) this.scene.remove(p.model.root);
    }
    this.players = [];
    this.spawner.reset();
    this.events.reset();
    this.abilities.clear();
    this.particles.clear();
    this._clearDebris();
    if (this.world?.worldGroup) this.world.worldGroup.visible = false;
    if (this.world?.scenery?.group) this.world.scenery.group.visible = false;

    try {
      let ModeClass = null;
      const modeOpts = { ...opts, modeId };
      if (modeId === 'arena_x1') {
        ({ ArenaX1Mode: ModeClass } = await import('../modes/ArenaX1Mode.js'));
      } else if (modeId === 'boss_arena') {
        ({ BossArenaMode: ModeClass } = await import('../modes/BossArenaMode.js'));
      } else if (modeId === 'dungeon_rpg' || modeId === 'dungeon_rush') {
        ({ DungeonRPGMode: ModeClass } = await import('../modes/DungeonRPGMode.js'));
        modeOpts.rush = modeId === 'dungeon_rush';
      } else if (modeId === 'adventure_open') {
        ({ AdventureOpenMode: ModeClass } = await import('../modes/AdventureOpenMode.js'));
      }

      if (launchToken !== this._freeModeLaunchToken || this.state !== 'playing' || !ModeClass) {
        if (this.world?.worldGroup) this.world.worldGroup.visible = true;
        if (this.world?.scenery?.group) this.world.scenery.group.visible = true;
        return;
      }

      const instance = new ModeClass(this, modeOpts);
      this.activeFreeMode = instance;
      await instance.mount();
    } catch (err) {
      console.error('Falha ao iniciar modo 3D livre:', modeId, err);
      this._disposeFreeMode();
      this.openMainMenu();
      this.ui?.hud?.showBanner?.('⚠️ Não foi possível iniciar o modo 3D. Tente novamente.', '#ef4444', 3.2);
    }
  }

  openMainMenu() {
    this._disposeFreeMode();
    // Parte 1.2 & 1.3: Restaura modo base de 1 jogador ao voltar de modos 3D livres / Arena X1 (evita "Jogador 2" fantasma e UI quebrada)
    if (FREE_3D_MODES.has(this.modeId) || this.modeId === 'arena_x1') {
      const fallbackMode = (this._returnModeId && !FREE_3D_MODES.has(this._returnModeId)) ? this._returnModeId : 'solo';
      this.modeId = fallbackMode;
      this._returnModeId = null;
    }
    this.state = 'menu';
    this.photoMode = false;
    this.spectatorMode = false;
    this.spectatorFreeOffset = new THREE.Vector3(0, 0, 0);
    this.pendingRestart = false;
    this.radialWheelOpen = false;
    this.radialCooldown = 0;
    this.input?.reset?.();
    this.ui.hud.hideRadialWheel?.();
    this._dismissSpotlight();
    this.tutorialState = null;
    this.multiplayerSession = null;
    this.tvHud.setVisible(false);
    this.cameraRig.setFocusPlayer(null);
    this.cameraRig.setPredatorFocus(null);
    this.events?.reset?.();
    this.ui.hud.setPredatorIntroHud?.(null);
    this.music.setPlaying(false);
    this.spawner.reset();
    this.events.reset();
    this.abilities.clear();
    this.particles.clear();
    this._clearDebris();
    this.rebuildPlayers();
    this.currentBiome = getBiomeById(this.startBiomeId);
    this.world?.applyTheme?.(this.currentBiome.theme, false);
    this._syncMenuEnvironment();
    this.ui.hud.resetAllOverlays();
    this.ui.showMainMenu();
  }

  startMultiplayerMatch(room, botCount = 0) {
    const peers = Array.isArray(room?.peers) ? room.peers : [];
    const screenPeers = peers.filter((pr) => pr.role !== 'controller' && pr.role !== 'spectator');
    if (this.net.isHost) {
      // o dino do host (teclado local) sempre é p1
      screenPeers.sort((a, b) => (b.peerId === this.net.peerId) - (a.peerId === this.net.peerId));
    }
    const confirmedControllers = peers.filter((pr) => pr.role === 'controller' && !!pr.targetPlayerPeerId);

    const roster = [];
    let keyIdx = 1;

    for (let sIdx = 0; sIdx < screenPeers.length; sIdx++) {
      if (roster.length >= 8) break;
      const pr = screenPeers[sIdx];
      const attachedCtrls = confirmedControllers.filter((c) => c.targetPlayerPeerId === pr.peerId);
      roster.push({
        key: `p${keyIdx++}`,
        dinoId: pr.dinoId || 'trex',
        name: pr.name || `Dino ${roster.length + 1}`,
        peerId: pr.peerId,
        controllerPeerIds: attachedCtrls.map((c) => c.peerId),
        color: pr.color || null,
        customization: pr.customization || (pr.peerId === this.net.peerId ? { ...getActivePreset('p1'), skinVariant: getEquippedSkinVariant(pr.dinoId || Save.data.selectedDino), hybrid: Save.data.hybrid } : null),
        isBot: false
      });
    }

    const botNames = ['Rex Bot', 'Raptor IA', 'Spino Turbo', 'Trike Guard', 'Stego Alfa', 'Carno Flash', 'Ankylo Titan'];
    const botDinos = ['raptor', 'triceratops', 'spinosaurus', 'stegosaurus', 'carnotaurus', 'ankylosaurus', 'trex'];
    for (let b = 0; b < botCount && roster.length < 8; b++) {
      roster.push({
        key: `p${keyIdx++}`,
        dinoId: botDinos[b % botDinos.length],
        name: `🤖 ${botNames[b % botNames.length]}`,
        peerId: `bot_${b}`,
        color: null,
        isBot: true
      });
    }
    if (roster.length === 0) {
      roster.push({ key: 'p1', dinoId: Save.data.selectedDino || 'trex', name: 'Host', peerId: this.net.peerId, color: null, isBot: false });
    }

    const resolvedCfg = this.net.resolveRoomConfig(room);
    const matchSeed = this.customSeed || `MP-${room?.code || 'DINO'}-${Math.floor(Math.random() * 9999)}`;
    const mpMode = resolvedCfg.mpMode || room?.mpMode || (room?.elimination ? 'elimination' : 'race');
    const isElim = mpMode === 'elimination' || !!room?.elimination;
    const matchDiffId = resolvedCfg.difficulty || Save.data.difficulty || 'normal';
    const matchBiomeId = resolvedCfg.biomeId || this.startBiomeId || 'random_portal';
    const trackMode = resolvedCfg.trackMode || room?.config?.trackMode || Save.data.settings?.mpTrackMode || 'parallel';
    const revDefaults = ContentLoader.getBalance().revive || {};
    const reviveConfig = {
      costType: resolvedCfg.reviveCostType || room?.config?.reviveCostType || revDefaults.costType || 'life_or_shield',
      cooldownSec: Number(room?.config?.reviveCooldownSec ?? revDefaults.cooldownSec ?? 25),
      windowSec: Number(room?.config?.reviveWindowSec ?? revDefaults.windowSec ?? 15),
      maxPerRun: Number(room?.config?.reviveMaxPerRun ?? revDefaults.maxPerRun ?? 2),
      invulnSec: Number(room?.config?.reviveInvulnSec ?? revDefaults.invulnSec ?? 2.5)
    };
    this.difficultyMgr.setPreset(matchDiffId);
    this.multiplayerSession = {
      active: true,
      isHost: this.net.isHost,
      room,
      roster,
      botCount,
      seed: matchSeed,
      mpMode,
      trackMode,
      reviveConfig,
      difficultyId: matchDiffId,
      multiHabitats: room?.config?.multiHabitats !== false,
      allowHybrids: room?.config?.allowHybrids !== false,
      allowEvents: room?.config?.allowEvents !== false,
      allowBosses: room?.config?.allowBosses !== false,
      allowPowerups: room?.config?.allowPowerups !== false,
      allowHandicap: !!room?.config?.allowHandicap,
      pausePolicy: room?.config?.pausePolicy || 'host_only',
      allowRevive: resolvedCfg.allowRevive !== false,
      elimination: isElim,
      elimTimer: isElim ? 30 : null,
      partyMode: room?.partyMode !== false,
      prevLeaderPeerId: null,
      suddenDeath: false,
      netSnapAccum: 0,
      bets: new Map(),
      nextCardScoreByPeer: new Map()
    };

    const mpNativeModes = new Set(['raid', 'boss_fight', 'race', 'competition', 'coop', 'free_roam', 'arena_x1', 'boss_arena', 'dungeon_rpg', 'dungeon_rush', 'adventure_open']);
    this.modeId = mpNativeModes.has(mpMode) ? mpMode : 'solo';
    this.net.broadcastHostStart({
      roomCode: room?.code,
      roster,
      botCount,
      seed: matchSeed,
      mpMode,
      trackMode,
      reviveConfig,
      difficultyId: matchDiffId,
      multiHabitats: this.multiplayerSession.multiHabitats,
      allowHybrids: this.multiplayerSession.allowHybrids,
      allowEvents: this.multiplayerSession.allowEvents,
      allowBosses: this.multiplayerSession.allowBosses,
      allowPowerups: this.multiplayerSession.allowPowerups,
      allowHandicap: this.multiplayerSession.allowHandicap,
      pausePolicy: this.multiplayerSession.pausePolicy,
      allowRevive: this.multiplayerSession.allowRevive,
      elim: isElim,
      partyMode: this.multiplayerSession.partyMode,
      biomeId: matchBiomeId
    });
    this.startRun(false, { keepMultiplayerSession: true, roster, seed: matchSeed, biomeId: matchBiomeId });
    this.tvHud.setVisible(this.players.length > 1, !!Save.data.network?.tvScale);
    const mpBannerLabels = {
      duel: '⚔️ DUELO PvP',
      elimination: '⏳ ELIMINAÇÃO 30s',
      race: '🏁 CORRIDA',
      raid: '🐉 RAID COLOSSAL',
      boss_fight: '👑 BOSS RUSH',
      competition: '🏅 LIGA COMPETITIVA',
      coop: '🤝 COOP TÁTICO',
      free_roam: '🧪 LIVRE / SANDBOX',
      arena_x1: '⚔️ ARENA X1 3D',
      boss_arena: '👑 BOSS ARENA 3D',
      dungeon_rpg: '🏰 MASMORRA RPG 3D',
      dungeon_rush: '🗝️ CRIPTA INFINITA',
      adventure_open: '🗺️ AVENTURA ABERTA 3D'
    };
    const modeLabel = mpBannerLabels[mpMode] || (isElim ? '⏳ ELIMINAÇÃO 30s' : '🏁 CORRIDA');
    this.ui.hud.showBanner(`🌐 ${modeLabel} INICIADA (${this.players.length} DINOS)!`, '#58d63a', 3.4);
  }

  startMultiplayerGuestMatch(payload = {}) {
    const room = this.net.room || {};
    const peers = Array.isArray(room.peers) ? room.peers : [];
    const roster = Array.isArray(payload.roster) && payload.roster.length > 0
      ? payload.roster
      : peers.map((pr, idx) => ({
          key: `p${idx + 1}`,
          dinoId: pr.dinoId || 'trex',
          name: pr.name || `Dino ${idx + 1}`,
          peerId: pr.peerId,
          color: pr.color || null,
          isBot: false
        }));

    if (roster.length === 0) {
      roster.push({
        key: 'p1',
        dinoId: Save.data.selectedDino || 'trex',
        name: Save.data.network?.nickname || 'Jogador',
        peerId: this.net.peerId,
        color: null,
        isBot: false
      });
    }

    const mpMode = payload.mpMode || room.mpMode || (payload.elim ? 'elimination' : 'race');
    const isElim = mpMode === 'elimination' || !!payload.elim;
    if (payload.difficultyId) {
      this.difficultyMgr.setPreset(payload.difficultyId);
    }
    this.multiplayerSession = {
      active: true,
      isHost: false,
      room,
      roster,
      botCount: payload.botCount || 0,
      seed: payload.seed || room.seed || `MP-${room.code || 'GUEST'}`,
      mpMode,
      trackMode: payload.trackMode || room?.config?.trackMode || 'parallel',
      reviveConfig: payload.reviveConfig || ContentLoader.getBalance().revive || {},
      difficultyId: payload.difficultyId || 'normal',
      allowRevive: payload.allowRevive !== false,
      elimination: isElim,
      elimTimer: isElim ? 30 : null,
      partyMode: payload.partyMode !== false,
      suddenDeath: false,
      myPeerId: this.net.peerId,
      netSnapAccum: 0,
      bets: new Map(),
      nextCardScoreByPeer: new Map()
    };

    const mpNativeModes = new Set(['raid', 'boss_fight', 'race', 'competition', 'coop', 'free_roam', 'arena_x1', 'boss_arena', 'dungeon_rpg', 'dungeon_rush', 'adventure_open']);
    this.modeId = mpNativeModes.has(mpMode) ? mpMode : 'solo';
    this.startRun(false, {
      keepMultiplayerSession: true,
      roster,
      seed: this.multiplayerSession.seed,
      biomeId: payload.biomeId || this.startBiomeId
    });
    const myDino = this.players.find((p) => p.peerId === this.net.peerId) || this.players[0];
    if (myDino?.peerId) {
      this.cameraRig.setFocusPlayer(myDino.peerId);
    }
    this.tvHud.setVisible(this.players.length > 1, !!Save.data.network?.tvScale);
    this.ui.hud.showBanner(`🌐 CORRENDO NA SALA ${room.code || ''} COMO ${myDino?.name || 'CONVIDADO'}!`, '#38bdf8', 3.4);
  }

  startTestTrack(dinoId) {
    Save.data.selectedDino = dinoId;
    Save.save();
    this.startRun(true);
    this.ui.hud.showBanner('🧪 MINI PISTA DE TESTE — Pule, abaixe, ataque (Q) e teste sua habilidade! (R para reiniciar)', '#58d63a', 4);
  }

  startTutorial() {
    this.modeId = 'solo';
    this.startRun(true, { tutorial: true, biomeId: 'desert' });
    this.tutorialState = {
      active: true,
      isFirstRunMini: false,
      step: 0,
      total: 6,
      progress: 0,
      stepTimer: 4.0,
      spawnCd: 0.45,
      elemCount: 0,
      doneTimer: 0
    };
    this._syncTutorialHud();
    this.ui.hud.showBanner('🎓 TUTORIAL JOGÁVEL — Siga as instruções no topo! (+20 🥚 na 1ª conclusão)', '#38bdf8', 4.0);
  }

  skipTutorial() {
    this.tutorialState = null;
    this.spawner.tutorialMode = false;
    this.firstRunGentleTimer = 0;
    Save.data.firstRunTutorialDone = true;
    Save.data.tutorialDone = true;
    Save.save();
    this.ui.hud.setTutorialHud(null);
    if (this.state === 'playing' || this.state === 'paused') {
      this.isTestTrack = false;
      this.ui.hud.showFloatText('⏭ Tutorial pulado! Boa corrida!', '#38bdf8');
    } else {
      this.openMainMenu();
    }
  }

  _syncTutorialHud() {
    const ts = this.tutorialState;
    if (!ts || !ts.active) {
      this.ui.hud.setTutorialHud(null);
      return;
    }
    const defs = [
      {
        title: 'Guia Visual • Auras, Buff, Debuff & Estamina',
        desc: '🔴 AURA VERMELHA = PERIGO! (desvie ou ataque) • 🟢 AURA VERDE/DOURADA = AJUDA! (colete) • Buff (poder bom temporário), Debuff (efeito ruim temporário), Estamina (energia para impulso/pulo duplo/ataque).',
        html: `
          <div style="display:flex; flex-direction:column; gap:4px; text-align:left;">
            <div><strong style="color:#fca5a5;">🔴 AURA VERMELHA = PERIGO!</strong> (Obstáculos e Debuffs — desvie ou ataque!)</div>
            <div><strong style="color:#6ee7b7;">🟢 AURA VERDE/DOURADA = AJUDA!</strong> (Frutas, Ovos e Buffs — colete!)</div>
            <div style="font-size:0.79rem; color:#bae6fd; margin-top:2px;">
              <b>Buff:</b> poder bom temporário • <b>Debuff:</b> efeito ruim temporário • <b>Estamina:</b> energia para impulso/pulo duplo/ataque
            </div>
          </div>
        `
      },
      {
        title: 'Passo 1/5 • Desviar de Faixa (A/D ou ←/→)',
        desc: 'Use [A] / [D] ou [←] / [→] (ou arraste para os lados) para trocar de faixa na pista!'
      },
      {
        title: 'Passo 2/5 • Pular Obstáculo com 🔴 Aura Vermelha (W/↑)',
        desc: 'Perigos têm 🔴 Aura Vermelha no chão! Aperte [W] ou [↑] para pular sobre o obstáculo!'
      },
      {
        title: 'Passo 3/5 • Abaixar / Mergulhar (S/↓)',
        desc: 'Aperte [S] ou [↓] para deslizar sob aves altas ou mergulhar fundo na água!'
      },
      {
        title: 'Passo 4/5 • Abrir Roda Tática / Impulso (X)',
        desc: 'Aperte [X] (ou toque em 🧭 Roda): a Roda Tática dá Foco/Impulso (+Carga) e recupera Oxigênio (+45 O₂)!'
      },
      {
        title: 'Passo 5/5 • Usar Mochila (E) & Ataque (Q)',
        desc: 'Você ganhou 1 🛡️ item grátis na Mochila! Aperte [E] para usar a Mochila ou [Q] para atacar obstáculos/chefes!'
      }
    ];
    const d = defs[ts.step] || defs[5];
    this.ui.hud.setTutorialHud({
      active: true,
      step: ts.step + 1,
      total: ts.total,
      progressText: ts.step === 0 ? 'Intro' : `${ts.step}/5`,
      title: `🎓 ${d.title}`,
      desc: d.desc,
      html: d.html || null
    });
  }

  _advanceTutorialStep() {
    const ts = this.tutorialState;
    if (!ts || !ts.active) return;
    ts.step++;
    ts.progress = 0;
    ts.stepTimer = 0;
    ts.spawnCd = 0.55;
    this.sfx.powerup();
    if (ts.step === 5) {
      const p0 = this.players[0];
      if (p0 && p0.backpack && p0.backpack.slots.length === 0) {
        p0.backpack.add('shield');
        this.ui.hud.showFloatText('🎒 +1 ESCUDO GRÁTIS NA MOCHILA! Aperte [E]!', '#facc15');
      }
    }
    if (ts.step >= ts.total) {
      const wasFirstRunMini = Boolean(ts.isFirstRunMini);
      ts.active = false;
      ts.doneTimer = wasFirstRunMini ? 0 : 1.4;
      this.spawner.tutorialMode = false;
      Save.data.firstRunTutorialDone = true;
      Save.data.tutorialDone = true;
      const firstTime = !Save.data.tutorialRewardClaimed;
      if (firstTime) {
        Save.data.tutorialRewardClaimed = true;
        Save.addEggs(20);
      }
      Save.save();
      this.sfx.victory();
      this.ui.hud.setTutorialHud(null);
      this.ui.hud.showBanner(
        firstTime ? '🎓 TUTORIAL COMPLETO! +20 Ovos de Recompensa! Boa corrida!' : '🎓 TUTORIAL COMPLETO! Você dominou todas as mecânicas!',
        '#58d63a',
        3.8
      );
      if (wasFirstRunMini) {
        this.tutorialState = null;
      }
      return;
    }
    this.ui.hud.showFloatText('✅ ETAPA CONCLUÍDA!', '#58d63a');
    this._syncTutorialHud();
  }

  _updateTutorial(dt) {
    const ts = this.tutorialState;
    if (!ts) return;
    if (!ts.active) {
      if (ts.doneTimer > 0) {
        ts.doneTimer -= dt;
        if (ts.doneTimer <= 0) {
          this.tutorialState = null;
          this._finishRun('🎓 TUTORIAL CONCLUÍDO!');
        }
      }
      return;
    }

    const p0 = this.players[0];
    if (!p0) return;

    if (ts.step === 0) {
      ts.stepTimer = (ts.stepTimer ?? 4.0) - dt;
      if (ts.stepTimer <= 0) {
        this._advanceTutorialStep();
        return;
      }
    } else if (ts.step === 4) {
      ts.stepTimer = (ts.stepTimer || 0) + dt;
      if (this.radialWheelOpen) {
        this._advanceTutorialStep();
        return;
      }
    }

    if (!ts.isFirstRunMini) {
      ts.spawnCd -= dt;
      if (ts.spawnCd <= 0) {
        const hasHazardAhead = this.spawner.getActiveObstacles().some((o) => !o.hit && o.group.position.z < 1);
        if (ts.step === 2 && !hasHazardAhead) {
          this.spawner.spawnTutorialObject('cactus_small', p0.lane, { z: -48 });
          ts.spawnCd = 1.6;
        } else if (ts.step === 3 && !hasHazardAhead) {
          this.spawner.spawnTutorialObject('bird', p0.lane, { highBird: true, z: -50 });
          ts.spawnCd = 1.8;
        } else if (ts.step === 5 && !hasHazardAhead) {
          this.spawner.spawnTutorialObject('cactus_spine', p0.lane, { z: -46 });
          ts.spawnCd = 1.6;
        } else {
          ts.spawnCd = 0.6;
        }
      }
    }
  }

  startRun(isTestTrack = false, opts = {}) {
    if (typeof isTestTrack === 'object' && isTestTrack !== null) {
      opts = isTestTrack;
      isTestTrack = Boolean(opts.isTestTrack);
    }
    this._disposeFreeMode();
    if (!isTestTrack && FREE_3D_MODES.has(this.modeId)) {
      this._startFree3DMode(this.modeId, opts);
      return;
    }
    this.isTestTrack = isTestTrack;
    this.pendingRestart = false;
    this.spotlightActive = false;
    this._spotlightQueue = [];
    this._crystalReviveUsed = false;
    this.merchantUses = 0;
    this._merchantGuardUntil = 0;
    this.seenHints = new Set();
    if (!opts.tutorial) {
      this.tutorialState = null;
    }
    if (!opts.keepMultiplayerSession) {
      this.multiplayerSession = null;
      this.tvHud.setVisible(false);
    }
    this.spectatorMode = false;
    this.spectatorFreeOffset = new THREE.Vector3(0, 0, 0);
    this.state = 'playing';
    this.photoMode = false;
    this.ui?._clearModal?.();
    this.ui.hud.resetAllOverlays();
    this.ui.hud.setPlayingUI(true);

    this.rebuildPlayers(opts.roster || this.multiplayerSession?.roster || null);
    this.spawner.reset();
    this.spawner.tutorialMode = !!opts.tutorial;
    this.events.reset();
    this.abilities.clear();
    this.particles.clear();
    this._clearDebris();

    const diff = this.difficultyMgr.getConfig();
    const speedCfg = ContentLoader.getBalance().speed || {};
    this.baseSpeed = diff.initialSpeed * (speedCfg.initialSpeedMultiplier ?? 1.0);
    this.maxSpeed = diff.maxSpeed * (speedCfg.maxSpeedMultiplier ?? 1.0);
    this.speedAccel = diff.accel * (speedCfg.accelMultiplier ?? 1.0);
    this.speed = this.baseSpeed;
    if (!isTestTrack && this.net?.supabase?.isConfigured?.()) {
      const firstDinoId = this.players[0]?.id || Save.data.selectedDino || 'trex';
      startAuthoritativeRun(this.net.supabase.client, {
        modeId: this.modeId,
        difficulty: diff.id,
        dinoId: firstDinoId,
        seed: opts.seed || this.customSeed || null
      }).catch(() => {});
    }
    this.score = 0;
    this.distance = 0;
    this.runTime = 0;
    this.runEggs = 0;
    this.eggChain = 0;
    this.eggChainTimer = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboDecayTimer = 0;
    this.runJumps = 0;
    this.runStomps = 0;
    this.nextCardIdx = 0;
    this.evolutionTier = 0;
    this.hitStopTimer = 0;
    this.slowMoTimer = 0;
    this.radialWheelOpen = false;
    this.radialCooldown = 0;
    this.ui.hud.hideRadialWheel?.();
    this.decoyTimer = 0;
    this._pendingStartBanners = [];
    this._skipIntroGuardFrames = 0;
    this._lastIntroLook = null;
    this.currentOasis = 0;
    this.shortcutTimer = 0;
    this.sharedSwapTimer = 60;
    this.sharedFlipped = false;
    this.chaosTimer = 25;
    this.activeChaosRule = null;
    this.storyChapterIdx = 0;
    this.relayTimer = 18;
    this.relayActiveIdx = 0;
    this.waveIndex = 1;
    this.waveTimer = 18;
    this.captureMatchTimer = 30;
    this.wantedSpawnTimer = 6;
    this.hollowEarthState = { active: false, savedBiomeId: null, timer: 0, portalZ: null };
    this.shopDetour = { active: false, side: 'right', phase: 'none', timer: 0, visited: false };
    this.nextShopMilestone = 30000;
    this._progressiveNotified = new Set();
    this._portalBiomeAccum = 0;
    this._mpReviveCount = 0;

    // Reset de estados dos modos de expansão e integração §3 (preservando configs escolhidas)
    this.raidState = null;
    this.bossRushState = null;
    this.raceState = null;
    this.freeRoamState = null;
    this._predatorHazards = [];
    this._currentDangerTier = { tier: 0, speedBonus: 0, densityBonus: 0, eventFreqBonus: 0, predatorAggro: 1.0 };
    this._lastHudDangerTier = -1;
    this._hudDebuffAccum = 0;
    this._lastCoopBossHit = null;
    this.ui.hud.setDangerTier?.(this._currentDangerTier);
    this.ui.hud.setActiveDebuffs?.([]);
    this.ui.hud.setPredatorTelegraph?.(null);
    this.hiScore = Save.getHighScore();

    // Modo Competição (Liga): regras padronizadas sem modificadores fáceis
    if (this.modeId === 'competition') {
      if (this.difficultyMgr.activeId === 'easy') {
        this.difficultyMgr.setPreset('normal');
      }
      this.activeCustomTrack = null;
      for (const pl of this.players) {
        pl._unlockAll = true;
      }
    }

    // Seed determinística para Desafio Diário, Competição (Liga), Multiplayer ou Seed compartilhável
    const seed = opts.seed
      || (this.modeId === 'competition' ? getCompetitionSeed() : null)
      || this.activeCustomTrack?.seed
      || (this.modeId === 'daily_challenge' ? getTodaySeed() : this.customSeed);
    this.spawner.setSeed(seed);
    this.spawner.setDifficultyId(this.difficultyMgr.activeId);
    this.spawner.setDifficultyConfig(diff);
    this.spawner.setBossManager(this.events.bosses);
    const mpCfg = this.multiplayerSession?.active ? this.multiplayerSession : null;
    this.spawner.setDensity(diff.density * (this.activeCustomTrack?.obstacleRate || 1.0));
    const evFreq = mpCfg && mpCfg.allowEvents === false ? 0 : diff.eventFreq;
    this.events.configure(evFreq, diff.enabledEvents);
    if (this.events?.bosses) {
      this.events.bosses.disabled = Boolean(mpCfg && mpCfg.allowBosses === false);
    }

    // Bioma inicial (Modo História começa no capítulo 1; Modo Aleatório inicia via Portal Dinâmico)
    const rawStartId = opts.biomeId || (this.modeId === 'story' ? STORY_CHAPTERS[0].biome : this.startBiomeId);
    this.randomPortalMode = (mpCfg && mpCfg.multiHabitats === false) ? false : (rawStartId === 'random_portal' || !!opts.randomPortal);
    if (mpCfg && mpCfg.multiHabitats === false) {
      this.sequenceBiomes = false;
    }
    let startId = rawStartId === 'random_portal'
      ? getRandomNextBiome(null).id
      : rawStartId;
    let chosenBiome = getBiomeById(startId);
    this.currentBiome = chosenBiome;
    this._lastSeqBiomeStep = 0;
    this.world.applyTheme(this.currentBiome.theme);
    this.world.setHollowEarthVisuals(false);
    this.world.setShopLane(null);
    this.spawner.setBiome(this.currentBiome.id);
    if (!isTestTrack) this._discoverCurrentBiomeFossil();

    const isSubmergedStart = Boolean(this.currentBiome?.submerged);
    if (this.multiplayerSession?.active && this.multiplayerSession?.allowHandicap) {
      for (const pl of this.players) {
        if ((pl.skillLevel || 1) <= 2) {
          pl.shields = Math.min(4, (pl.shields || 0) + 1);
        }
      }
    }
    this._syncEnvironmentHabitat(this.players[0]);
    const mpTrackMode = this.multiplayerSession?.active ? (this.multiplayerSession.trackMode || 'parallel') : 'classic';
    this.world.setParallelTracks(
      mpTrackMode === 'parallel' ? this.players.map((pl) => pl.trackOffsetX || 0) : []
    );
    for (const pl of this.players) {
      const mode = pl.habitatMode || pl.habitat;
      const isFly = mode === 'flying' && !isSubmergedStart;
      const naturalDive = Boolean(isSubmergedStart || (pl.aquaticPhysiology === 'aquatic_gills' && mode === 'aquatic'));
      pl.diveDepth = naturalDive ? 1 : 0;
      pl.diveTarget = naturalDive ? 1 : 0;
      pl.inWater = !isFly && Boolean(isSubmergedStart || mode === 'aquatic');
      pl.inSubmerged = isSubmergedStart;
      pl.grounded = !isFly;
      const tOff = pl.trackOffsetX || 0;
      if (mode === 'aquatic' && !isSubmergedStart) {
        pl.x = tOff + (RIVER_LANE_X[pl.lane] ?? RIVER_LANE_X[1]);
        pl.baseY = 0;
      } else if (isFly) {
        pl.x = tOff + (LANE_X[pl.lane] ?? 0);
        pl.baseY = SKY_CORRIDOR_Y - 1.15;
      } else {
        pl.x = tOff + (LANE_X[pl.lane] ?? 0);
        pl.baseY = 0;
      }
      pl.y = 0;
      pl.model.root.position.x = pl.x;
      pl.model.root.position.y = pl.baseY;
    }

    // Mutação Equipada (respeita null quando o jogador desativou mutações)
    if (!isTestTrack && this.players[0]) {
      const mut = Save.data.equippedMutation ? getMutationDef(Save.data.equippedMutation) : null;
      this.activeMutation = mut;
      if (mut) {
        if (mut.id === 'tiny_core' && !this.players[0].mutationMods) this.players[0].smallHitbox = true;
        const mutText = `🧬 ${mut.badge || '🧬'} ${mut.name}: ${mut.desc}`;
        if (Save.data.perfectMode && this.modeId !== 'zen') {
          this._pendingStartBanners.push({
            text: `💎 MODO PERFEITO (1 Vida • Score 2.2x) • ${mutText}`,
            color: '#38bdf8',
            dur: 4.2
          });
        } else {
          this._pendingStartBanners.push({
            text: mutText,
            color: '#c084fc',
            dur: 3.4
          });
        }
      } else if (Save.data.perfectMode && this.modeId !== 'zen') {
        this._pendingStartBanners.push({
          text: '💎 MODO PERFEITO (1 Vida • Score 2.2x)',
          color: '#38bdf8',
          dur: 4.0
        });
      }
    }

    // Filhote companheiro ativo se chocado no minigame
    if (Save.data.activeCompanion) {
      this.companions.spawn(Save.data.activeCompanion);
    }

    // PvP Auto-handicap: jogador com menos vitórias ganha +1 escudo
    if (this.modeId === 'pvp' && this.players.length === 2) {
      const riv = Save.data.rivalry;
      if (riv.p1Wins > riv.p2Wins) this.players[1].shields += 1;
      else if (riv.p2Wins > riv.p1Wins) this.players[0].shields += 1;
      this.ui.hud.showBanner(`⚔️ PVP MELHOR DE 3 — P1 (${this.pvpRounds.p1}) × (${this.pvpRounds.p2}) P2`, '#ff9a24', 3.2);
    }

    // Ovo Dourado multi-voxel visível no modo Captura o Ovo
    if (this.modeId === 'capture_egg') {
      this.goldenEggProp = buildVoxelGoldenEgg();
      this.scene.add(this.goldenEggProp);
      this.ui.hud.showBanner('🥚 CAPTURA O OVO (30s)! Esbarrar rouba o Ovo Dourado!', '#ffd447', 3.4);
    }

    if (this.modeId === 'tournament' && this.tournamentState) {
      const idx = this.tournamentState.currentIdx;
      const pName = this.tournamentState.players[idx] || `P${idx + 1}`;
      this.ui.hud.showBanner(`🏆 TORNEIO LOCAL — Vez de ${pName} (${idx + 1}/${this.tournamentState.players.length})`, '#ffd447', 3.4);
    }

    if (this.modeId === 'teams_2v2' && this.teamsState) {
      this.ui.hud.showBanner(
        `🤝 EQUIPES 2x2 — Equipe ${this.teamsState.currentTeam + 1} em campo! (${this.teamsState.teamScores[0]} × ${this.teamsState.teamScores[1]})`,
        '#58d63a',
        3.4
      );
    }

    if (this.modeId === 'wave_survival') {
      this.ui.hud.showBanner('🌊 ONDA 1 INICIADA! Sobreviva por bônus e chefes!', '#38bdf8', 3.2);
    }

    // Fantasma no Contra-Relógio
    if (this.modeId === 'time_trial' && Save.data.ghostRuns?.frames?.length) {
      this.ghostModel = DinoFactory.build(Save.data.selectedDino, { primary: '#90e0ef' }, { ghost: true });
      this.scene.add(this.ghostModel.root);
    }

    // Dino Rival IA
    if (this.modeId === 'rival_ai') {
      const personalities = [
        { name: 'Rex Provocador', quote: 'Vai comer poeira, novato!', chatter: ['Muito lento!', 'Olha o cacto atrás!', 'Ninguém me pega!'] },
        { name: 'Raptor Tímido', quote: 'C-cuidado com os cactos...', chatter: ['E-essa foi por pouco...', 'Que velocidade!', 'Ufa!'] },
        { name: 'Carno Trapaceiro', quote: 'Hehe, essa faixa é minha!', chatter: ['Saia da minha frente!', 'Hahaha, quase!', 'Turbo ligado!'] }
      ];
      const pers = personalities[Math.floor(Math.random() * personalities.length)];
      const rModel = DinoFactory.build('carnotaurus', { primary: '#ff4757' });
      this.scene.add(rModel.root);
      this.rivalAi = { model: rModel, animator: new DinoAnimator(rModel), lane: 2, x: LANE_X[2], y: 0, z: -1.5, vy: 0, quoteTimer: 10, pers };
      this.ui.hud.showBanner(`🤖 ${pers.name}: "${pers.quote}"`, '#ff4757', 3.5);
    }

    // 1) Modo Raid Colossal (múltiplas barras de vida, afixos rotativos, placar DPS)
    if (this.modeId === 'raid') {
      const pCount = Math.max(1, this.players.length);
      const totalBars = 4;
      const firstAffix = RAID_AFFIXES[0];
      const raidBossId = opts.bossId || this.currentBiome?.bossId || 'alpha_trex';
      this.raidState = {
        active: true,
        bossId: raidBossId,
        bossBarIndex: 1,
        totalBars,
        affixIndex: 0,
        affixTimer: 22,
        activeAffix: firstAffix,
        spawnDelay: 2.2,
        bossSpawned: false,
        hazardTimer: 5.5,
        totalDamage: 0,
        dpsAnnounceTimer: 8.0
      };
      for (const pl of this.players) {
        pl.raidDamage = 0;
        pl._unlockAll = true;
      }
      this.ui.hud.showBanner(
        `🐉 RAID COLOSSAL (${totalBars} Barras • ${pCount}P) — Afixo: ${firstAffix.icon} ${firstAffix.name}!`,
        '#c084fc',
        4.2
      );
    }

    // 2) Modo Boss Fight / Boss Rush (escolher boss direto ou sequência Boss Rush)
    if (this.modeId === 'boss_fight') {
      const submode = opts.bossSubmode || this.bossFightConfig?.submode || 'rush';
      const targetBossId = opts.bossId || this.bossFightConfig?.targetBossId || this.currentBiome?.bossId || 'alpha_trex';
      const rushList = [
        'alpha_trex',
        'scorpion_king',
        'magma_golem',
        'frost_mammoth',
        'void_leviathan'
      ];
      for (const pl of this.players) {
        pl._unlockAll = true;
      }
      this.bossRushState = {
        active: true,
        submode,
        targetBossId,
        queue: submode === 'single' ? [targetBossId] : rushList,
        currentIndex: 0,
        defeatedCount: 0,
        nextBossDelay: 1.8,
        usedNativeRush: false
      };
      this.ui.hud.showBanner(
        submode === 'single'
          ? `👑 BOSS FIGHT — Duelo direto contra ${targetBossId}!`
          : `👑 BOSS RUSH — Derrote ${rushList.length} chefes em sequência!`,
        '#fb923c',
        3.8
      );
    }

    // 3) Modo Livre / Sandbox (sem morte, sem ranking/conquistas validadas)
    if (this.modeId === 'free_roam') {
      this.freeRoamState = {
        active: true,
        speedScale: 1.0,
        spawnPaused: false
      };
      for (const pl of this.players) {
        pl._unlockAll = true;
      }
      this.ui.hud.showBanner(
        '🧪 LIVRE / SANDBOX (Sem Ranking) — [1/2] Velocidade • [3] Bioma • [4] Spawn • [5] Boss',
        '#34d399',
        4.6
      );
    }

    // 4) Modo Corrida (Linha de Chegada 5.000m / 10.000m, barra 1º/2º/3º, checkpoints)
    if (this.modeId === 'race') {
      const targetDistance = Number(opts.raceDistance || this.raceConfig?.targetDistance || 5000);
      this.raceState = {
        active: true,
        targetDistance: targetDistance >= 10000 ? 10000 : 5000,
        checkpointStep: 1000,
        nextCheckpoint: 1000,
        finished: false,
        winnerName: null
      };
      for (const pl of this.players) {
        pl.distance = 0;
        pl.raceFinished = false;
      }
      // Em corrida solo (sem outros jogadores humanos/bots da sala), cria 2 rivais IA para disputar 1º/2º/3º
      if (!this.multiplayerSession?.active && this.players.length === 1) {
        const aiSpecs = [
          { name: 'Veloz IA', dinoId: 'raptor', color: '#38bdf8', lane: 0, pace: 0.99 },
          { name: 'Titã IA', dinoId: 'carnotaurus', color: '#fb923c', lane: 2, pace: 1.015 }
        ];
        this.raceAiRacers = aiSpecs.map((cfg) => {
          const m = DinoFactory.build(cfg.dinoId, { primary: cfg.color });
          this.scene.add(m.root);
          return {
            name: cfg.name,
            color: cfg.color,
            model: m,
            animator: new DinoAnimator(m),
            lane: cfg.lane,
            x: LANE_X[cfg.lane],
            y: 0,
            z: -1.8,
            vy: 0,
            distance: 0,
            pace: cfg.pace,
            burstTimer: 2 + Math.random() * 4
          };
        });
      }
      this.ui.hud.showBanner(
        `🏁 CORRIDA ATÉ ${this.raceState.targetDistance.toLocaleString('pt-BR')}m! Checkpoints a cada 1.000m!`,
        '#38bdf8',
        3.8
      );
    }

    // 5) Modo Competição / Liga (Seed fixa, Danger Tier acelerado, sem modificadores fáceis)
    if (this.modeId === 'competition') {
      this.ui.hud.showBanner(
        `🏅 LIGA COMPETITIVA (${seed}) — Regras oficiais & Danger Tier acelerado!`,
        '#facc15',
        4.0
      );
    }

    if (this.modeId === 'coop' && this.players.length >= 2) {
      this.ui.hud.showBanner(
        '🤝 COOP TÁTICO — Ataques sincronizados em boss (+35% dano) & Reviver [V] ou por proximidade!',
        '#58d63a',
        3.6
      );
    }

    // First-Run Interactive Mini-Tutorial (non-intrusive, 25s gentle density + prominent Skip button)
    const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    const shouldAutoMiniTutorial = Boolean(
      this.modeId === 'solo' &&
      !isTestTrack &&
      !opts.tutorial &&
      !opts.skipAutoTutorial &&
      !this.multiplayerSession?.active &&
      !this.activeCampaignNode &&
      !this.activeCustomTrack &&
      !this.headlessBot &&
      !opts.headless &&
      !Save.data.firstRunTutorialDone
    );
    if (shouldAutoMiniTutorial) {
      this.firstRunGentleTimer = 25.0;
      this.tutorialState = {
        active: true,
        isFirstRunMini: true,
        step: 0,
        total: 6,
        progress: 0,
        stepTimer: 4.0,
        spawnCd: 0.6,
        elemCount: 0,
        doneTimer: 0
      };
      if (this.players[0]) {
        this.players[0]._unlockAll = true;
      }
      this._syncTutorialHud();
    } else {
      this.firstRunGentleTimer = 0;
    }

    if (!Save.data.tutorialDone) {
      Save.data.tutorialDone = true;
      Save.save();
      if (!shouldAutoMiniTutorial) {
        this._pendingStartBanners.push({
          text: isCoarse
            ? '👆 Arraste o dedo na tela: ⬅ ➡ faixas • ⬆ pular • ⬇ deslizar!'
            : 'Dica: Use W/↑ para pular, S/↓ para abaixar/deslizar e A/D para trocar de faixa!',
          color: '#58d63a',
          dur: 4.5
        });
      }
    } else if (isCoarse && !this._mobileSwipeTipShown && !this.isTestTrack && !shouldAutoMiniTutorial) {
      this._mobileSwipeTipShown = true;
      this._pendingStartBanners.push({
        text: '👆 Arraste em qualquer lugar: ⬅ ➡ mover • ⬆ pular • ⬇ deslizar',
        color: '#38bdf8',
        dur: 2.8
      });
    }

    this.ui.hud.setSharedRolesHint(
      this.modeId === 'shared_controls' ? '👥 A: Move faixas (A/D) | B: Pulo/Abaixar/Habilidade (↑/↓/Enter)' : ''
    );
    this.ui.hud.setCameraLabel(this.cameraRig.currentMode.label);
    this.cameraRig.setPredatorFocus(null);
    this.ui.hud.setPredatorIntroHud(null);
    this.replay.reset();
    this.music.setPlaying(true);

    const lead0 = this.players[0];
    if (lead0) {
      lead0.model?.root.position.set(lead0.x, (lead0.baseY || 0) + (lead0.y || 0), lead0.z);
      lead0.animator?.update(0.016, { speed: 0, grounded: lead0.habitatMode !== 'flying', habitatMode: lead0.habitatMode });
      this.ui.hud.updatePlayStatus(
        lead0,
        Save.data.eggs,
        this.currentBiome.name,
        Math.ceil((this.score + 1) / 1000) * 1000,
        this.combo,
        this.score
      );
    }

    const introStarted = this.events.predators.startOpeningIntro(
      this.currentBiome.id,
      this._eventContext()
    );
    if (introStarted) {
      this._updatePredatorIntro(0.001);
    } else {
      this._flushStartBanners();
    }
  }

  requestRestart() {
    if (this.pendingRestart) return;
    if (this.state === 'gameover' || this.state === 'replay') {
      this.restartRun();
      return;
    }
    if (this.state !== 'playing' && this.state !== 'paused') return;
    this.pendingRestart = true;
    this.restartPrevState = this.state;
    this.state = 'paused';
    this.music.setPlaying(false);
    this.ui.hud.showPause(false);
    this.ui.hud.showRestartConfirm(true);
  }

  confirmRestart() {
    this.pendingRestart = false;
    this.ui.hud.showRestartConfirm(false);
    this.restartRun();
  }

  cancelRestart() {
    if (!this.pendingRestart) return;
    this.pendingRestart = false;
    this.ui.hud.showRestartConfirm(false);
    if (this.restartPrevState === 'paused') {
      this.state = 'paused';
      this.ui.hud.showPause(true);
    } else {
      this.state = 'playing';
      this.lastTime = performance.now();
      this.music.setPlaying(true);
    }
  }

  restartRun() {
    this._disposeFreeMode();
    this.pendingRestart = false;
    this.ui.hud.showRestartConfirm(false);
    if (this.tutorialState) {
      this.startTutorial();
      return;
    }
    if (this.multiplayerSession?.active) {
      if (!this.multiplayerSession.isHost) {
        this.ui.hud.showBanner('⏳ Aguardando o Dono da Sala iniciar uma nova corrida!', '#38bdf8', 2.4);
        return;
      }
      this.startMultiplayerMatch(this.multiplayerSession.room, this.multiplayerSession.botCount);
      return;
    }
    this.startRun(this.isTestTrack);
  }

  togglePause(forcePause = null) {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    const nextPause = forcePause !== null ? forcePause : this.state === 'playing';
    this.state = nextPause ? 'paused' : 'playing';
    this.ui.hud.showPause(nextPause);
    this.music.setPlaying(!nextPause);
    if (!nextPause) this.lastTime = performance.now();
  }

  togglePhotoMode() {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    this.photoMode = !this.photoMode;
    this.state = this.photoMode ? 'paused' : 'playing';
    this.ui.hud.showPhotoMode(this.photoMode);
    this.ui.hud.showPause(false);
  }

  capturePhotoSnapshot() {
    this.renderer.render(this.scene, this.camera);
    const ok = exportWatermarkedSnapshot(this.canvas, 'dino-dash-3d-foto');
    this.ui.hud.showFloatText(ok ? '📸 Foto salva com marca d\'água oficial!' : '⚠️ Falha ao capturar foto.', ok ? '#58d63a' : '#ff4757');
  }

  cycleCamera() {
    const mode = this.cameraRig.cycleMode();
    this.ui.hud.setCameraLabel(mode.label);
  }

  usePlayerItem(idx = 0) {
    const p = this.players[idx];
    if (!p || p.dead) return;
    p.backpack.useNext(p, this._eventContext());
    if (this.tutorialState?.active && this.tutorialState.step === 5 && p.index === 0) {
      this._advanceTutorialStep();
    }
  }

  _getMerchantCost() {
    if (this.merchantUses <= 0) return 80;
    if (this.merchantUses === 1) return 140;
    return 220;
  }

  closeMerchant(grantGrace = true) {
    this.ui.hud.hideMerchant();
    if (this.state === 'paused' && !this.photoMode && !this.pendingRestart) {
      this.state = 'playing';
      if (this.music.enabled) this.music.setPlaying(true);
    }
    const p = this.players[0];
    if (grantGrace && p && !p.dead) {
      p.invulnTimer = Math.max(p.invulnTimer || 0, 1.8);
    }
    this.lastTime = performance.now();
  }

  buyFromMerchant() {
    if (performance.now() < (this._merchantGuardUntil || 0)) return;
    const cost = this._getMerchantCost();
    if (Save.data.eggs < cost) {
      this.ui.hud.showFloatText(`Precisa de ${cost} ovos!`, '#ff4757');
      this.closeMerchant(true);
      return;
    }
    Save.addEggs(-cost);
    this.merchantUses++;
    const p = this.players[0];
    if (p) {
      if (Save.data.perfectMode || p.isPerfectMode) {
        p.shields = Math.min(5, (p.shields || 0) + 1);
        this.ui.hud.showFloatText('🛒 +1 ESCUDO DO MERCADOR!', '#38bdf8');
      } else {
        this._healPlayer(p, 1, '🛒 CURA DO MERCADOR & ESCUDO!');
        p.shields = Math.min(4, (p.shields || 0) + 1);
      }
      this.ui.hud.triggerEdgeFlash('rara');
    }
    this.closeMerchant(true);
  }

  applyPickedCard(card) {
    if (this.multiplayerSession?.active && !this.multiplayerSession.isHost) {
      this.net.sendCardPick(card);
      this.sfx.card(card.rarity === 'lendária');
      this.ui.hud.triggerEdgeFlash(card.rarity || 'comum');
      this.ui.hud.showFloatText(`CARTA ENVIADA: ${card.name}!`, '#ffd447');
      this.state = 'playing';
      return;
    }
    for (const p of this.players) {
      if (!p.dead) card.apply(p, this);
    }
    this.sfx.card(card.rarity === 'lendária');
    this.sfx.pickupRarity(card.rarity || 'comum');
    this.ui.hud.triggerEdgeFlash(card.rarity || 'comum');
    this.ui.hud.showFloatText(`CARTA: ${card.name}!`, '#ffd447');
    this.state = 'playing';
    this.lastTime = performance.now();
    this.music.setPlaying(true);
  }

  spawnEggRain(count = 16) {
    this.spawner.spawnEggRain(count);
  }

  spawnFruitRain(count = 10) {
    this.spawner.spawnFruitRain(count);
  }

  addScore(pts, player = null) {
    const scaledPts = Save.data.perfectMode ? pts * 2.2 : pts;
    this.score += scaledPts;
    if (player && !player.dead) {
      player.score = (player.score || 0) + scaledPts;
    }
  }

  showFloatText(player, text, color = '#ffd447') {
    this.ui.hud.showFloatText(text, color);
  }

  _isPureAquaticPlayer(p) {
    if (!p) return false;
    const mode = p.habitatMode || p.habitat || p.baseHabitat || 'land';
    return mode === 'aquatic' && !p.canWalkOnLand && !(Array.isArray(p.availableHabitats) && p.availableHabitats.includes('land'));
  }

  _syncMenuEnvironment() {
    const p0 = this.players[0];
    const targetBiome = getBiomeById(this.startBiomeId);
    this.currentBiome = targetBiome;
    this.world.applyTheme(targetBiome.theme);
    this.world.setHollowEarthVisuals(false);
    this.world.setShopLane(null);
    this.spawner.setBiome(targetBiome.id);
    this._syncEnvironmentHabitat(p0);
    const isSubmergedBiome = Boolean(targetBiome?.submerged);
    for (const pl of this.players) {
      const mode = pl.habitatMode || pl.habitat;
      const isFly = mode === 'flying' && !isSubmergedBiome;
      const naturalDive = Boolean(isSubmergedBiome || (pl.aquaticPhysiology === 'aquatic_gills' && mode === 'aquatic'));
      pl.inWater = !isFly && Boolean(isSubmergedBiome || mode === 'aquatic');
      pl.inSubmerged = isSubmergedBiome;
      pl.diveTarget = naturalDive ? 1 : 0;
      pl.diveDepth = naturalDive ? 1 : 0;
      pl.grounded = !isFly;
      if (mode === 'aquatic') {
        const lanes = isSubmergedBiome ? LANE_X : RIVER_LANE_X;
        pl.x = (lanes[pl.lane] ?? lanes[1]) + (pl.xOffset || 0);
        pl.baseY = 0;
      } else if (isFly) {
        pl.x = (LANE_X[pl.lane] ?? 0) + (pl.xOffset || 0);
        pl.baseY = SKY_CORRIDOR_Y - 1.15;
      } else {
        pl.x = (LANE_X[pl.lane] ?? 0) + (pl.xOffset || 0);
        pl.baseY = 0;
      }
      pl.y = 0;
      pl.model.root.position.set(pl.x, pl.baseY, pl.z || 0);
    }
  }

  _syncEnvironmentHabitat(leadPlayer = this.players[0]) {
    const biome = this.currentBiome;
    const isSubmergedBiome = !!biome?.submerged;
    const anyAquatic = !isSubmergedBiome && this.players.some((p) => (p.habitatMode || p.habitat) === 'aquatic');
    const anyFlying = !isSubmergedBiome && this.players.some((p) => (p.habitatMode || p.habitat) === 'flying');
    const leadMode = leadPlayer ? (leadPlayer.habitatMode || leadPlayer.habitat) : 'land';
    const leadInWater = Boolean(isSubmergedBiome || leadMode === 'aquatic');
    const leadDive = leadPlayer?.diveDepth || 0;
    this.world.setAquaticChannelActive(anyAquatic);
    this.world.setSkyCorridorActive(anyFlying);
    this.world.setFullWaterTrack(false);
    this.world.setWaterTrackVisuals(anyAquatic);
    this.world.setSubmergedVisuals(isSubmergedBiome || (leadInWater && leadDive > 0.25), isSubmergedBiome);
    this.spawner.setHabitatMode(leadMode, isSubmergedBiome);
  }

  _buildCameraEnvOpts(lead = this.players[0]) {
    const isSubmergedBiome = !!this.currentBiome?.submerged;
    const leadMode = lead ? (lead.habitatMode || lead.habitat) : 'land';
    const trackOffsetX = lead?.trackOffsetX || 0;
    const trackCenterX = trackOffsetX + ((!isSubmergedBiome && leadMode === 'aquatic') ? (RIVER_LANE_X[1] ?? 10) : 0);
    const inWater = Boolean(isSubmergedBiome || leadMode === 'aquatic');
    const diveDepth = lead?.diveDepth || 0;
    const isSubmerged = Boolean(isSubmergedBiome || (inWater && diveDepth > 0.25));
    const isWaterSurface = Boolean(inWater && !isSubmerged);
    return { trackCenterX, inWater, isWaterSurface, isSubmerged, isSubmergedBiome, diveDepth };
  }

  _transmutePlayerHabitat(p) {
    if (!p || p.dead || !Array.isArray(p.availableHabitats) || p.availableHabitats.length <= 1) return false;
    const cur = p.habitatMode || p.habitat || 'land';
    const idx = p.availableHabitats.indexOf(cur);
    const nextMode = p.availableHabitats[(idx + 1) % p.availableHabitats.length];
    if (nextMode === cur) return false;

    const isSub = Boolean(this.currentBiome?.submerged);
    const naturalDive = Boolean(isSub || (p.aquaticPhysiology === 'aquatic_gills' && nextMode === 'aquatic'));
    const oldX = p.x;
    const oldY = (p.baseY || 0) + p.y;
    p.habitatMode = nextMode;
    p.habitat = nextMode;
    p.diveDepth = naturalDive ? 1 : 0;
    p.diveTarget = naturalDive ? 1 : 0;
    p.inShopLane = null;
    p.sliding = false;
    p.ducking = false;
    p.grounded = nextMode !== 'flying' || isSub;

    const tOff = p.trackOffsetX || 0;
    if (nextMode === 'aquatic') {
      const lanes = isSub ? LANE_X : RIVER_LANE_X;
      p.baseY = 0;
      p.y = 0;
      p.vy = 0;
      p.x = tOff + (lanes[p.lane] ?? lanes[1]);
    } else if (nextMode === 'flying' && !isSub) {
      p.baseY = SKY_CORRIDOR_Y - 1.15;
      p.y = 0;
      p.vy = 2.2;
      p.x = tOff + (LANE_X[p.lane] ?? 0);
    } else {
      p.baseY = 0;
      p.y = 0;
      p.vy = 0;
      p.x = tOff + (LANE_X[p.lane] ?? 0);
    }
    p.inWater = Boolean(isSub || nextMode === 'aquatic');
    p.model.root.position.set(p.x, (p.baseY || 0) + p.y, p.z);

    if (p.index === 0) {
      this._syncEnvironmentHabitat(p);
    }
    this.sfx.evolution?.();
    this.particles.emitExplosion(oldX, oldY + 0.7, p.z, '#38bdf8', 10, false);
    this.particles.emitExplosion(p.x, (p.baseY || 0) + p.y + 0.7, p.z, '#c084fc', 14, true);
    const label = nextMode === 'aquatic'
      ? '🌊 TRANSMUTAÇÃO: MODO AQUÁTICO!'
      : (nextMode === 'flying' ? '🪽 TRANSMUTAÇÃO: MODO AÉREO!' : '🌿 TRANSMUTAÇÃO: MODO TERRESTRE!');
    this.ui.hud.showFloatText(label, nextMode === 'aquatic' ? '#38bdf8' : (nextMode === 'flying' ? '#facc15' : '#4ade80'));
    return true;
  }

  toggleRadialWheel(force = null) {
    if (this.state !== 'playing') return;
    if (this.events.predators?.state === 'intro' || this.spotlightActive || this.pendingRestart) return;
    const next = force === null ? !this.radialWheelOpen : !!force;
    if (next && this.radialCooldown > 0.05) {
      this.ui.hud.showFloatText(`🧭 Roda recarregando (${this.radialCooldown.toFixed(1)}s)!`, '#94a3b8');
      return;
    }
    this.radialWheelOpen = next;
    if (next) {
      if (this.tutorialState?.active && this.tutorialState.step === 4) {
        this._advanceTutorialStep();
      }
      const p0 = this.players[0];
      this.ui.hud.showRadialWheel({
        player: p0,
        companionStatus: this.companions?.getHudStatus?.() || null
      });
    } else {
      this.ui.hud.hideRadialWheel();
    }
  }

  executeRadialAction(slot) {
    const p0 = this.players[0];
    if (!p0 || p0.dead || this.state !== 'playing') {
      this.toggleRadialWheel(false);
      return;
    }
    let applied = false;
    if (slot === 'habitat') {
      if (Array.isArray(p0.availableHabitats) && p0.availableHabitats.length > 1) {
        applied = this._transmutePlayerHabitat(p0);
      } else if (p0.inWater || p0.inSubmerged) {
        p0.diveDepth = 0;
        p0.vy = Math.max(p0.vy || 0, 11.4);
        p0.grounded = false;
        p0.oxygen = Math.min(100, (p0.oxygen ?? 100) + 28);
        this.sfx.jump(true);
        this.ui.hud.showFloatText('🫧 IMPULSO ABISSAL (+28% O₂)!', '#38bdf8');
        applied = true;
      } else {
        this.ui.hud.showFloatText('🧬 Apenas Híbridos, Anfíbios ou Aquáticos (+Patas) trocam habitat!', '#c084fc');
      }
    } else if (slot === 'backpack') {
      if (p0.backpack?.slots?.length > 0) {
        this.usePlayerItem(0);
        applied = true;
      } else {
        this.ui.hud.showFloatText('🎒 Mochila vazia!', '#94a3b8');
      }
    } else if (slot === 'companion') {
      const res = this.companions?.triggerActiveCommand?.(p0, this.spawner, () => this.addScore(45 * this.combo, p0));
      if (res?.ok) {
        this.sfx.powerup?.();
        this.ui.hud.showFloatText(res.msg, '#4ade80');
        applied = true;
      } else {
        this.ui.hud.showFloatText(res?.reason || '🐾 Sem Mascote ativo!', '#fbbf24');
      }
    } else if (slot === 'focus') {
      if ((p0.stamina ?? 0) >= 25) {
        p0.stamina = Math.max(0, (p0.stamina ?? 100) - 25);
        p0.abilityCharge = Math.min(100, (p0.abilityCharge ?? 100) + 28);
        p0.oxygen = Math.min(100, (p0.oxygen ?? 100) + 45);
        if (p0.statuses) {
          delete p0.statuses.mud;
          delete p0.statuses.poison;
        }
        this.sfx.powerup?.();
        this.ui.hud.showFloatText('⚡ FOCO TÁTICO (+28% Hab / +45 O₂)!', '#fde047');
        applied = true;
      } else {
        this.ui.hud.showFloatText('💨 Estamina insuficiente (precisa 25)!', '#fbbf24');
      }
    }
    if (applied) {
      this.radialCooldown = 4.5;
    }
    this.toggleRadialWheel(false);
  }

  enterHollowEarth(duration = 14) {
    if (this.hollowEarthState?.active) {
      this.hollowEarthState.timer = Math.max(this.hollowEarthState.timer, duration);
      return;
    }
    const savedBiomeId = this.currentBiome?.id || 'savannah';
    this.hollowEarthState = { active: true, savedBiomeId, timer: duration, portalZ: 0 };
    this.currentBiome = getBiomeById('hollow_earth');
    this.world.applyTheme(this.currentBiome.theme);
    this.world.setHollowEarthVisuals(true);
    this.spawner.setBiome('hollow_earth');
    this._syncEnvironmentHabitat(this.players[0]);
    if (!this.isTestTrack) this._discoverCurrentBiomeFossil();
    if (!Save.data.discoveredHollowEarth) {
      Save.data.discoveredHollowEarth = true;
      Save.save();
    }
    this.sfx.portal?.();
    this.ui.hud.triggerEdgeFlash('mítica');
    this.ui.hud.showBanner(`🕳️ TERRA OCA! Mundo subterrâneo revelado por ${Math.round(duration)}s!`, '#c084fc', 3.4);
  }

  exitHollowEarth() {
    if (!this.hollowEarthState?.active) return;
    const savedId = this.hollowEarthState.savedBiomeId || 'savannah';
    this.hollowEarthState = { active: false, savedBiomeId: null, timer: 0, portalZ: null };
    this.world.setHollowEarthVisuals(false);
    this.currentBiome = getBiomeById(savedId);
    this.world.applyTheme(this.currentBiome.theme);
    this.spawner.setBiome(this.currentBiome.id);
    this._syncEnvironmentHabitat(this.players[0]);
    this.ui.hud.showBanner(`☀️ RETORNO À SUPERFÍCIE: ${this.currentBiome.name}!`, '#38bdf8', 2.6);
  }

  _applyBiomePlayersState(targetBiome) {
    const isSub = Boolean(targetBiome?.submerged);
    this._syncEnvironmentHabitat(this.players[0]);
    for (const pl of this.players) {
      const mode = pl.habitatMode || pl.habitat || 'land';
      const isFly = mode === 'flying' && !isSub;
      const naturalDive = Boolean(isSub || (pl.aquaticPhysiology === 'aquatic_gills' && mode === 'aquatic'));
      pl.inSubmerged = isSub;
      pl.inWater = !isFly && Boolean(isSub || mode === 'aquatic');
      pl.diveTarget = naturalDive ? 1 : 0;
      pl.diveDepth = naturalDive ? 1 : 0;
      pl.grounded = !isFly;
      pl.baseY = isFly ? (SKY_CORRIDOR_Y - 1.15) : 0;
      if (mode === 'aquatic') {
        const lanes = isSub ? LANE_X : RIVER_LANE_X;
        pl.x = lanes[pl.lane] ?? lanes[1];
        pl.model.root.position.x = pl.x;
      } else {
        pl.x = LANE_X[pl.lane] ?? 0;
        pl.model.root.position.x = pl.x;
      }
      pl.model.root.position.y = (pl.baseY || 0) + (pl.y || 0);
    }
  }

  triggerRandomPortalTransition() {
    if (this.hollowEarthState?.active) this.exitHollowEarth();
    const allPureAqua = this.players.length > 0 && this.players.every((pl) => this._isPureAquaticPlayer(pl));
    const aquaList = allPureAqua ? BIOMES.filter((b) => isAquaticBiome(b) && b.id !== this.currentBiome?.id) : [];
    const nextBiome = (allPureAqua && aquaList.length > 0)
      ? aquaList[Math.floor(Math.random() * aquaList.length)]
      : getRandomNextBiome(this.currentBiome?.id);
    this.currentBiome = nextBiome;
    this.world.applyTheme(this.currentBiome.theme);
    this.spawner.setBiome(this.currentBiome.id);
    this._applyBiomePlayersState(this.currentBiome);
    if (!this.isTestTrack) this._discoverCurrentBiomeFossil();
    this.sfx.portal?.();
    this.ui.hud.triggerEdgeFlash('cyan');
    this.ui.hud.showBanner(`🌀 PORTAL DE BIOMA → ${this.currentBiome.name}!`, '#38bdf8', 3.0);
  }

  _canPayReviveCost(payer, costType = 'life_or_shield') {
    if (!payer || payer.dead) return false;
    if (costType === 'shield') return (payer.shields || 0) > 0;
    if (costType === 'life') return (payer.hp || 0) > 1;
    // life_or_shield: 1 escudo ou 1 vida (nunca sacrifica a última vida)
    return (payer.shields || 0) > 0 || (payer.hp || 0) > 1;
  }

  _deductReviveCost(payer, costType = 'life_or_shield') {
    if (!payer) return '';
    if (costType === 'shield' || (costType === 'life_or_shield' && (payer.shields || 0) > 0)) {
      payer.shields = Math.max(0, (payer.shields || 0) - 1);
      return '1 🛡️';
    }
    payer.hp = Math.max(1, (payer.hp || 1) - 1);
    return '1 ❤️';
  }

  _revivePlayerEntity(ally, paidLabel = '1 🛡️', reviverName = '') {
    if (!ally) return;
    const revCfg = ContentLoader.getBalance().revive || {};
    const mpRevCfg = this.multiplayerSession?.reviveConfig || {};
    const invulnSec = mpRevCfg.invulnSec ?? revCfg.invulnSec ?? 2.5;
    ally.dead = false;
    ally.hp = 1;
    ally.shields = 0;
    ally.oxygen = 100;
    ally.invulnTimer = invulnSec;
    ally.reviveWindowTimer = 0;
    ally.reviveCount = (ally.reviveCount || 0) + 1;
    ally.x = (ally.trackOffsetX || 0) + (LANE_X[ally.lane] ?? 0);
    ally.y = 0;
    ally.vy = 4.5;
    ally.grounded = true;
    if (ally.model?.root) {
      ally.model.root.visible = true;
      ally.model.root.position.set(ally.x, ally.baseY || 0, ally.z || 0);
    }
    this._mpReviveCount = (this._mpReviveCount || 0) + 1;
    this.particles?.emitDust?.(ally.x, 1, ally.model?.root?.position?.z || 0, 18, '#34d399', 4.5);
    this.sfx?.powerup?.();
    this.ui.hud.triggerEdgeFlash('green');
    const byStr = reviverName ? ` por ${reviverName}` : '';
    this.ui.hud.showBanner(`💖 ${ally.name || 'Aliado'} REVIVIDO${byStr} (${paidLabel})!`, '#34d399', 3.2);
  }

  reviveFallenAlly(payerIdx = 0) {
    if (this.state !== 'playing') return false;
    if (this.multiplayerSession?.active && this.multiplayerSession.allowRevive === false) {
      this.ui.hud.showBanner('🔒 Revive desativado pelo Dono da Sala!', '#f87171', 2.2);
      return false;
    }
    const revCfg = ContentLoader.getBalance().revive || {};
    const mpRevCfg = this.multiplayerSession?.reviveConfig || {};
    const costType = mpRevCfg.costType || revCfg.costType || 'life_or_shield';
    const cooldownSec = mpRevCfg.cooldownSec ?? revCfg.cooldownSec ?? 25;
    const maxPerRun = mpRevCfg.maxPerRun ?? revCfg.maxPerRun ?? 2;

    const payer = (this.multiplayerSession?.active && this.net.peerId)
      ? (this.players.find((pl) => pl.peerId === this.net.peerId) || this.players[payerIdx])
      : this.players[payerIdx];
    const ally = this.players.find(
      (pl) => pl.dead && pl !== payer && (pl.reviveWindowTimer || 0) > 0 && (pl.reviveCount || 0) < maxPerRun
    );
    if (!payer || payer.dead || !ally) return false;

    if ((payer.reviveCooldown || 0) > 0) {
      this.ui.hud.showFloatText(`⏳ Cooldown de reviver: ${Math.ceil(payer.reviveCooldown)}s`, '#fbbf24');
      return false;
    }

    if (!this._canPayReviveCost(payer, costType)) {
      this.ui.hud.showBanner('💔 Precisa de 1 Escudo ou 1 Vida extra (>1 ❤️) para reviver!', '#f87171', 2.4);
      return false;
    }

    if (this.multiplayerSession?.active && !this.multiplayerSession.isHost) {
      payer.reviveCooldown = cooldownSec;
      this.net.sendMpRevive({
        reviverPeerId: this.net.peerId,
        targetPeerId: ally.peerId || null,
        costType
      });
      this.ui.hud.showFloatText(`💖 Revivendo ${ally.name || 'Aliado'}...`, '#34d399');
      return true;
    }

    const paidLabel = this._deductReviveCost(payer, costType);
    payer.reviveCooldown = cooldownSec;
    this._revivePlayerEntity(ally, paidLabel, payer.name || '');
    if (this.multiplayerSession?.active) {
      this.net.activeTransport?.send?.({
        type: 'mp_revive',
        approved: true,
        allyName: ally.name || ally.spec?.name || 'Aliado',
        reviverName: payer.name || 'Host',
        paidLabel,
        reviveCount: this._mpReviveCount
      });
    }
    return true;
  }

  _eventContext() {
    return {
      scene: this.scene,
      world: this.world,
      spawner: this.spawner,
      cameraRig: this.cameraRig,
      currentBiome: this.currentBiome,
      enterHollowEarth: (dur) => this.enterHollowEarth(dur),
      openBiomePortal: () => this.triggerRandomPortalTransition(),
      isMultiplayer: Boolean(this.multiplayerSession?.active),
      headlessBot: Boolean(this.headlessBot),
      particles: this.particles,
      weather: this.weather,
      dayNight: this.dayNight,
      sfx: this.sfx,
      narrator: this.narrator,
      habitatMode: this.players[0]?.habitatMode || this.players[0]?.habitat || 'land',
      playerHabitat: this.players[0]?.baseHabitat || this.players[0]?.habitat || 'land',
      isAquaticBiome: Boolean(this.currentBiome?.submerged),
      trackCenterX: this._buildCameraEnvOpts(this.players[0]).trackCenterX,
      leadX: this.players[0]?.x || 0,
      leadY: (this.players[0]?.baseY || 0) + (this.players[0]?.y || 0),
      playerCount: this.players.length,
      decoyTimer: this.decoyTimer,
      addScore: (v, p) => this.addScore(v, p),
      showBanner: (t, c, d) => this.ui.hud.showBanner(t, c, d),
      showFloatText: (p, t, c) => this.ui.hud.showFloatText(t, c),
      damagePlayer: (p, cause = 'event') => this._damagePlayer(p, cause),
      applyStatus: (player, id, dur = 4.0) => this._applyPlayerStatus(player, id, dur),
      spawnPredatorHazard: (cfg) => this._spawnPredatorHazard(cfg),
      onPredatorTelegraph: (info) => this.ui.hud.setPredatorTelegraph?.(info),
      dangerTier: this._currentDangerTier,
      predatorAggro: (this._currentDangerTier?.predatorAggro ?? 1.0)
        + (this.raidState?.activeAffix?.predatorAggroBonus || 0),
      modeId: this.modeId,
      onBossDamage: (p, dmg) => this._recordBossDamage(p, dmg),
      healPlayer: (p, amt = 1, text = '💚 +1 VIDA!') => this._healPlayer(p, amt, text),
      onMerchantEncounter: () => {
        if (this.state !== 'playing' || this.isTestTrack || this.headlessBot || this.multiplayerSession?.active) return;
        const cost = this._getMerchantCost();
        this.state = 'paused';
        this.music.setPlaying(false);
        this._merchantGuardUntil = performance.now() + 450;
        this.ui.hud.setMerchantCost(cost, Save.data.eggs);
        this.ui.hud.showMerchant();
      },
      onBossHudUpdate: (b) => this.ui.hud.setBossHud(b),
      onUfoHudUpdate: (a, t, pr) => this.ui.hud.setUfoHud(a, t, pr),
      onChaserHudUpdate: (a, d, spec) => this.ui.hud.setChaserHud(a, d, spec),
      onPredatorIntroHud: (info) => this.ui.hud.setPredatorIntroHud(info, () => {
        this._skipIntroGuardFrames = 2;
        this.events.predators.skipIntro(this._eventContext());
      }),
      onIntroEnd: () => {
        this._skipIntroGuardFrames = 2;
        if (this.cameraRig?.currentPos && this._lastIntroLook) {
          this.cameraRig.currentPos.copy(this.camera.position);
          this.cameraRig.currentLook.copy(this._lastIntroLook);
          this._lastIntroLook = null;
        }
        this._flushStartBanners();
      },
      isTestTrack: Boolean(this.isTestTrack),
      isTutorial: Boolean(this.tutorialState?.active),
      clearNearbyObstacles: (x, z, radius, stunOnly) => this._clearNearbyObstacles(x, z, radius, stunOnly),
      convertNearbyObstaclesToAllies: (pl) => this.convertNearbyObstaclesToAllies(pl),
      healPartner: (source) => {
        for (const p of this.players) {
          if (p !== source && !p.dead) this._healPlayer(p, 1, '💚 PARCEIRO CUROU!');
        }
      },
      pushPvPRival: (source) => {
        for (const p of this.players) {
          if (p !== source && !p.dead) {
            p.lane = p.lane === 0 ? 2 : 0;
            this._damagePlayer(p, 'pvp');
          }
        }
      },
      stunPvPRival: (source) => {
        for (const p of this.players) {
          if (p !== source && !p.dead) p.armorSlowTimer = 2.0;
        }
      },
      spawnEggRain: (n) => this.spawnEggRain(n),
      spawnFruitRain: (n) => this.spawnFruitRain(n)
    };
  }

  convertNearbyObstaclesToAllies(player = this.players[0]) {
    const p = player || this.players[0];
    if (!p) return 0;
    const trackOffset = p.trackOffsetX || 0;
    const localX = p.x - trackOffset;
    const pz = p.z || 0;
    let converted = 0;
    const nonHazards = new Set([
      'egg', 'powerup', 'ramp', 'campfire', 'shortcut', 'fruit',
      'elemental_egg', 'treasure', 'grapple_point', 'gravity_zone',
      'minecart_zone', 'river_log', 'bifurcation', 'oasis_zone',
      'fragile_bridge', 'rescue_cross', 'oxygen_bubble', 'current_ring', 'speed_pad', 'trampoline'
    ]);
    for (const obs of this.spawner.getActiveObstacles()) {
      if (obs.hit || obs.nonHazard || nonHazards.has(obs.kind)) continue;
      const dx = obs.group.position.x - localX;
      const dz = obs.group.position.z - pz;
      const dist = Math.hypot(dx, dz);
      if ((dz <= 2.5 && dz >= -28) || dist <= 28) {
        obs.hit = true;
        obs.pool?.release(obs);
        const ox = trackOffset + obs.group.position.x;
        const oz = obs.group.position.z;
        this.particles?.emitExplosion?.(ox, 0.9, oz, '#1fb6c8', 12, true);
        this.particles?.emitExplosion?.(ox, 1.1, oz, '#facc15', 10, true);
        this._spawnImpactDebris(ox, oz, '#facc15');
        converted++;
      }
    }
    const bonusEggs = 8 + Math.min(8, converted * 2);
    const bonusScore = (250 + converted * 60) * (this.combo || 1);
    this.runEggs = (this.runEggs || 0) + bonusEggs;
    Save.addEggs(bonusEggs);
    this.addScore(bonusScore, p);
    p.turboTimer = Math.max(p.turboTimer || 0, 2.4);
    p.invulnTimer = Math.max(p.invulnTimer || 0, 2.2);
    p.extraJumps = Math.max(p.extraJumps || 0, 1);
    if (converted > 0) {
      this.spawnEggRain(Math.min(6, converted + 2));
    }
    this.sfx?.evolution?.();
    this.ui?.hud?.triggerEdgeFlash?.('mítica');
    return converted;
  }

  _clearNearbyObstacles(px, pz, radius = 25, pushAway = false) {
    for (const obs of this.spawner.getActiveObstacles()) {
      if (obs.hit || obs.nonHazard || ['egg', 'powerup', 'ramp', 'campfire', 'shortcut', 'fruit', 'elemental_egg', 'treasure', 'grapple_point', 'gravity_zone', 'minecart_zone', 'river_log', 'bifurcation', 'oasis_zone', 'fragile_bridge', 'rescue_cross'].includes(obs.kind)) continue;
      if (Math.hypot(obs.group.position.x - px, obs.group.position.z - pz) < radius) {
        obs.hit = true;
        obs.pool?.release(obs);
        this.particles.emitExplosion(obs.group.position.x, 0.8, obs.group.position.z, obs.color, 10, true);
        this._spawnImpactDebris(obs.group.position.x, obs.group.position.z, obs.color);
        this.addScore(40 * this.combo);
      }
    }
  }

  _spawnImpactDebris(x, z, color) {
    const mesh = buildVoxelDebris(color || '#ffd447');
    mesh.position.set(x, 0.6, z);
    this.scene.add(mesh);
    this.impactDebris.push({ mesh, vx: (Math.random() - 0.5) * 4, vy: 5.5, vz: -34, life: 1.4 });
  }

  _clearDebris() {
    for (const d of this.impactDebris) this.scene.remove(d.mesh);
    this.impactDebris = [];
  }

  _healPlayer(p, amount = 1, text = '💚 +1 VIDA!') {
    if (!p || p.dead) return false;
    const curMax = Number.isFinite(p.maxHp) && p.maxHp > 0 ? p.maxHp : 3;
    const curHp = Number.isFinite(p.hp) ? p.hp : curMax;
    p.maxHp = curMax;
    if (p.isPerfectMode || Save.data.perfectMode) {
      p.hp = 1;
      p.shields = Math.min(5, (p.shields || 0) + 1);
      try { this.sfx?.heal?.(); } catch {}
      this.particles?.emitExplosion?.(p.x, p.y + 0.9, p.z, '#38bdf8', 12, false);
      this.ui?.hud?.triggerEdgeFlash?.('rara');
      this.ui?.hud?.showFloatText?.('🛡️ +1 ESCUDO (PERFEITO)!', '#38bdf8');
      return false;
    }
    const prev = Math.min(curMax, curHp);
    const inc = Math.max(1, Number(amount) || 1);
    p.hp = Math.min(curMax, Math.max(1, prev + inc));
    const healed = p.hp > prev;
    try { this.sfx?.heal?.(); } catch {}
    this.particles?.emitExplosion?.(p.x, p.y + 0.9, p.z, '#4ade80', 14, false);
    this.ui?.hud?.triggerEdgeFlash?.('heal');
    this.ui?.hud?.pulseHp?.('heal');
    this.ui?.hud?.showFloatText?.(healed ? text : '💚 VIDA CHEIA!', '#4ade80');
    return healed;
  }

  _describeDeathCause(cause) {
    const map = {
      cactus_small: { label: '🌵 Cacto Pequeno', tip: 'Pule com [W/↑] ou destrua usando o Ataque [Q].' },
      cactus_tall: { label: '🌵 Cacto Alto', tip: 'Troque de faixa com [A/D] ou segure [W/↑] para pulo alto.' },
      cactus_cluster: { label: '🌵 Conjunto de Cactos', tip: 'Antecipe mudando para uma faixa livre com [A/D].' },
      bird: { label: '🦅 Ave / Pterodáctilo', tip: 'Abaixe com [S/↓] nas aves altas ou pule em cima das baixas.' },
      scorpion: { label: '🦂 Escorpião Veloz', tip: 'Ele vem rápido: pule em cima para pisotear ou quebre com [Q].' },
      rolling_log: { label: '🪵 Tronco Rolante', tip: 'Pule antes do choque com [W/↑] ou estilhace com [Q].' },
      tall_rock: { label: '🪨 Pedra Alta', tip: 'Troque de faixa ou aperte [W/↑] duas vezes perto para Wall Jump.' },
      lava_pool: { label: '🔥 Poça de Lava', tip: 'Pule bem alto sobre o anel brilhante ou mantenha um Escudo.' },
      thin_ice: { label: '❄️ Gelo Frágil', tip: 'Desvie do piso rachado azul-claro usando [A/D] ou pulando.' },
      alien_trap: { label: '🛸 Armadilha Laser', tip: 'Troque de faixa antes que o laser dispare.' },
      cactus_shooter: { label: '🌵 Cacto Atirador', tip: 'Mude de faixa assim que o cacto carregar o disparo.' },
      cactus_spine: { label: '📌 Espinho Voador', tip: 'Corte o projétil no ar com [Q] ou mude de faixa.' },
      meteor: { label: '☄️ Chuva de Meteoros', tip: 'Saia da faixa com círculo vermelho no chão antes do impacto!' },
      ufo: { label: '🛸 Raio do OVNI', tip: 'Observe a sombra luminosa na pista e troque de faixa.' },
      boss: { label: '👑 Ataque do Chefe', tip: 'Use [Q] para acertar o Orbe do Chefe (bônus se usar elemento fraco!).' },
      predator: { label: '🦖 Predador Alfa', tip: 'Guarde [Espaço] e Escudos ao ouvir o rugido da perseguição!' },
      predator_attack: { label: '🦖 Ataque de Predador', tip: 'Observe o telégrafo na faixa e troque de faixa [A/D] ou pule antes do golpe!' },
      raid_hazard: { label: '🐉 Afixo de Raid', tip: 'Fique atento ao afixo ativo e saia das faixas telegrafadas!' },
      poison: { label: '☠️ Veneno Acumulado', tip: 'Use Antídoto [E] ou pegue Esfera de Fogo 🔥 para neutralizar o veneno.' },
      amber_crystal: { label: '🔶 Cristal de Âmbar', tip: 'Quebre o Cristal com Ataque [Q] ou pule/desvie para outra faixa!' },
      geyser_vent: { label: '💨 Gêiser Vulcânico', tip: 'Troque de faixa com [A/D] ou dê um salto alto sobre o jato!' },
      tar_pit: { label: '🖤 Poço de Piche', tip: 'Pule sobre o piche com [W/↑] para não perder estamina e velocidade!' },
      falling_stalactite: { label: '🪨 Estalactite Cristalina', tip: 'Destrua com [Q] ou desvie de faixa antes do impacto.' },
      electric_pylon: { label: '⚡ Bobina Elétrica', tip: 'Desvie da faixa energizada usando [A/D]!' },
      spike_barricade: { label: '🪵 Barricada de Espinhos', tip: 'Pule com [W/↑] ou quebre com [Q] / Fúria!' },
      coral_reef: { label: '🪸 Recife de Coral', tip: 'Pule sobre os corais ou corte com Ataque [Q]!' },
      abyss_mine: { label: '💣 Mina Abissal', tip: 'Desvie de faixa [A/D] ou alterne o mergulho com [S/↓]!' },
      jellyfish_swarm: { label: '🪼 Água-Viva Elétrica', tip: 'Mergulhe com [S/↓] por baixo ou corte com [Q]!' },
      whirlpool_vortex: { label: '🌀 Redemoinho Abissal', tip: 'Mude de faixa com [A/D] ou mergulhe por baixo!' },
      shark_fin: { label: '🦈 Barbatana de Tubarão', tip: 'Toque em [S/↓] ou arraste para baixo para mergulhar sob o tubarão!' },
      angler_hazard: { label: '🐟 Peixe Abissal', tip: 'Suba à tona com [S/↓] / [W/↑] ou ataque com [Q]!' },
      thermal_vent: { label: '🌋 Fumarola Submarina', tip: 'Mude de faixa [A/D] ou emerja à superfície [W/↑]!' },
      oxygen: { label: '🫧 Falta de Oxigênio (O₂)', tip: 'Colete Bolhas 🫧, volte à superfície [S/↓] ou equipe Máscara Abissal!' },
      pvp: { label: '⚔️ Ataque de Rival', tip: 'Contra-ataque com [Q] ou mantenha escudos ativos nos Duelos.' }
    };
    const found = map[cause];
    return found || {
      label: '⚠️ Perigo na Pista',
      tip: 'Use [W/↑] para pular, [S/↓] para abaixar e [A/D] para desviar.'
    };
  }

  _applyPlayerStatus(player, id, dur = 4.0) {
    if (!player || player.dead || !id) return false;
    if (this.modeId === 'zen' || this.modeId === 'free_roam' || this.isTestTrack) return false;
    if (typeof StatusSystem.apply === 'function') {
      StatusSystem.apply(player, id, dur, this);
      return true;
    }
    return false;
  }

  _spawnPredatorHazard(cfg = {}) {
    if (this.state !== 'playing' || this.isTestTrack) return;
    const lane = Number.isInteger(cfg.lane) ? Math.max(0, Math.min(2, cfg.lane)) : Math.floor(Math.random() * 3);
    const x = Number.isFinite(cfg.x) ? cfg.x : (LANE_X[lane] ?? 0);
    const telegraphSec = Math.max(0.25, Number(cfg.telegraphSec ?? 0.9));
    const type = cfg.type || 'lunge';
    const label = cfg.label || (type === 'roar' ? '📢 RUGIDO' : (type === 'pounce' ? '🐾 BOTE' : '🦖 ATAQUE PREDADOR'));
    const entry = {
      type,
      lane,
      x,
      remainingSec: telegraphSec,
      damage: Math.max(1, Number(cfg.damage ?? 1)),
      label
    };
    this._predatorHazards.push(entry);
    this.ui.hud.setPredatorTelegraph?.({
      type: entry.type,
      lane: entry.lane,
      remainingSec: entry.remainingSec,
      label: entry.label
    });
    if (typeof this.spawner.spawnFromCatalog === 'function' && cfg.spawnObstacle) {
      this.spawner.spawnFromCatalog(Math.random, {
        biomeId: this.currentBiome?.id,
        lane,
        dangerTier: this._currentDangerTier,
        source: 'predator'
      });
    }
  }

  _updatePredatorHazards(dt) {
    if (!this._predatorHazards || this._predatorHazards.length === 0) return;
    let leadHazard = null;
    for (let i = this._predatorHazards.length - 1; i >= 0; i--) {
      const h = this._predatorHazards[i];
      h.remainingSec -= dt;
      if (h.remainingSec <= 0) {
        this._predatorHazards.splice(i, 1);
        this.particles?.emitExplosion?.(h.x, 0.9, -1.2, '#ef4444', 12, true);
        this.cameraRig?.triggerShake?.(0.35, 0.18);
        for (const p of this.players) {
          if (p.dead) continue;
          const localX = p.x - (p.trackOffsetX || 0);
          const sameLane = p.lane === h.lane || Math.abs(localX - h.x) < 1.35;
          const jumpedOver = h.type === 'sweep' && p.y > 1.05;
          if (sameLane && !jumpedOver) {
            this._damagePlayer(p, h.type === 'raid_storm' ? 'raid_hazard' : 'predator_attack');
            if (this.raidState?.activeAffix?.appliesPoison) {
              this._applyPlayerStatus(p, 'poison', 4.5);
            }
          }
        }
      } else if (!leadHazard || h.remainingSec < leadHazard.remainingSec) {
        leadHazard = h;
      }
    }
    this.ui.hud.setPredatorTelegraph?.(leadHazard ? {
      type: leadHazard.type,
      lane: leadHazard.lane,
      remainingSec: Math.max(0, leadHazard.remainingSec),
      label: leadHazard.label
    } : null);
  }

  _computeDangerTier(scoreVal) {
    const effScore = this.modeId === 'competition'
      ? Math.max(0, scoreVal * 1.45 + 600)
      : Math.max(0, scoreVal);
    if (typeof this.difficultyMgr?.getDangerTier === 'function') {
      const info = this.difficultyMgr.getDangerTier(effScore);
      if (info && typeof info.tier === 'number') return info;
    }
    if (typeof DifficultyManager?.getDangerTier === 'function') {
      const info = DifficultyManager.getDangerTier(effScore);
      if (info && typeof info.tier === 'number') return info;
    }
    const tier = Math.min(10, Math.floor(effScore / 2500));
    const dtOut = this._currentDangerTier;
    dtOut.tier = tier;
    dtOut.speedBonus = tier * 0.035;
    dtOut.densityBonus = tier * 0.045;
    dtOut.eventFreqBonus = tier * 0.04;
    dtOut.predatorAggro = 1 + tier * 0.12;
    return dtOut;
  }

  _damagePlayer(p, cause = 'obstacle') {
    if (this.tutorialState?.active) {
      this.ui.hud.showFloatText('💡 Veja a instrução no topo para desviar ou quebrar!', '#ffd447');
      return;
    }
    if (!p || p.dead || this.godMode || this.modeId === 'zen' || this.modeId === 'free_roam' || this.isTestTrack) {
      if (this.modeId === 'free_roam' && p && !p.dead && p.invulnTimer <= 0) {
        p.invulnTimer = 0.7;
        this.ui.hud.showFloatText('🧪 Sandbox: sem dano!', '#34d399');
      }
      return;
    }
    if (p.invulnTimer > 0 || p.furyTimer > 0 || p.ramTimer > 0 || p.rocketTimer > 0) return;

    // Filhote companheiro pode bloquear 1 dano!
    if (p.index === 0 && this.companions.tryBlockDamage()) {
      p.invulnTimer = 1.4;
      this.hitStopTimer = 0.06;
      this.sfx.shieldBreak();
      this.ui.hud.triggerEdgeFlash('blue');
      this.ui.hud.showFloatText('FILHOTE BLOQUEOU!', '#58d63a');
      return;
    }

    if (p.shields > 0) {
      p.shields -= 1;
      p.invulnTimer = 1.6;
      this.hitStopTimer = 0.08;
      this.sfx.shieldBreak();
      this.cameraRig.triggerShake(0.45, 0.25);
      this.ui.hud.triggerEdgeFlash('blue');
      this.ui.hud.pulseHp('shield');
      this.ui.hud.showFloatText('🛡️ ESCUDO QUEBRADO!', '#38bdf8');
      return;
    }

    const dmg = this.modeId === 'pvp' ? (this.difficultyMgr.getConfig().pvpDamage || 1) : 1;
    p.hp -= dmg;
    p.animator.triggerHurt(1.2);
    p.invulnTimer = 1.6 + (p.postHitInvulnBonus || 0);
    this.hitStopTimer = 0.085;
    this.combo = 1;
    this.sfx.hurt();
    this.narrator.say('hurt');
    this.cameraRig.triggerShake(0.68, 0.34);
    this.ui.hud.triggerEdgeFlash('red');
    this.ui.hud.pulseHp('hurt');
    this.particles.emitExplosion(p.x, p.y + 0.9, p.z, p.model.colors.primary, 16, true);

    if (p.hp <= 0) {
      if (p.campfireSaved) {
        p.campfireSaved = false;
        p.hp = 1;
        p.invulnTimer = 2.5;
        this.sfx.evolution();
        this.ui.hud.pulseHp('heal');
        this.ui.hud.showBanner('🔥 REVIVIDO PELA FOGUEIRA CHECKPOINT!', '#ff9a24', 3);
        return;
      }
      p.hp = 0;
      p.dead = true;
      p._lastDeathCause = cause;
      this.slowMoTimer = 0.45;
      if (this.multiplayerSession?.active || this.players.length >= 2) {
        const revCfg = ContentLoader.getBalance().revive || {};
        const mpRevCfg = this.multiplayerSession?.reviveConfig || {};
        const windowSec = mpRevCfg.windowSec ?? revCfg.windowSec ?? 15;
        const maxPerRun = mpRevCfg.maxPerRun ?? revCfg.maxPerRun ?? 2;
        p.reviveWindowTimer = (p.reviveCount || 0) < maxPerRun ? windowSec : 0;
        const nick = p.name || p.spec?.name || 'Aliado';
        this.ui.hud.showBanner(
          p.reviveWindowTimer > 0
            ? `💀 ${nick} caiu! Pressione V para reviver ${nick} (${Math.round(windowSec)}s)`
            : `💀 ${nick} caiu!`,
          '#f87171',
          3.5
        );
      }
      const customDeath = getActivePreset(p.key).deathEffect;
      if (customDeath === 'fireworks') {
        this.particles.emitExplosion(p.x, p.y + 1.0, p.z, '#ffbe0b', 18, true);
        this.particles.emitExplosion(p.x + 0.5, p.y + 1.3, p.z, '#ff2e63', 14, true);
      } else if (customDeath === 'ghost') {
        this.particles.emitExplosion(p.x, p.y + 0.9, p.z, '#90e0ef', 20, false);
      } else {
        this.particles.emitExplosion(p.x, p.y + 0.8, p.z, '#ffd447', 16, true);
      }
      if (this.multiplayerSession?.active && this.players.some((pl) => !pl.dead)) {
        const isLocalSpectatorTrigger = p.peerId === this.net.peerId || p.index === 0;
        if (isLocalSpectatorTrigger && !this.spectatorMode) {
          this.spectatorMode = true;
          this.spectatorFreeOffset.set(0, 0, 0);
          this.tvHud.setVisible(true);
          this.ui.hud.showBanner('👻 ELIMINADO! Câmera Livre Espectador ativa (WASD/Setas mover, Q/E altura, Tab alvo)', '#38bdf8', 4.0);
        }
      }
      this._checkAllPlayersDead();
    }
  }

  _checkAllPlayersDead() {
    if (this.modeId === 'pvp') {
      const winner = this.players.find((p) => !p.dead);
      if (winner) {
        if (winner.index === 0) this.pvpRounds.p1++;
        else this.pvpRounds.p2++;

        if (this.pvpRounds.p1 >= 2 || this.pvpRounds.p2 >= 2) {
          if (winner.index === 0) Save.data.rivalry.p1Wins++;
          else Save.data.rivalry.p2Wins++;
          Save.save();
          const summary = `${this.pvpRounds.p1}×${this.pvpRounds.p2}`;
          this.pvpRounds = { p1: 0, p2: 0 };
          this._finishRun(`🏆 JOGADOR ${winner.index + 1} VENCEU A SÉRIE (${summary})!`);
        } else {
          this._finishRun(`⚔️ ROUND PARA P${winner.index + 1}! (Série ${this.pvpRounds.p1}×${this.pvpRounds.p2} — Aperte R)`);
        }
      } else if (this.players.every((p) => p.dead)) {
        this._finishRun(`⚔️ EMPATE NO ROUND! (${this.pvpRounds.p1}×${this.pvpRounds.p2})`);
      }
      return;
    }

    if (this.modeId === 'capture_egg') {
      const survivor = this.players.find((p) => !p.dead);
      if (survivor) {
        survivor.holdingGoldenEgg = true;
        survivor.captureEggTime += 5;
        if (survivor.index === 0) Save.data.rivalry.p1Wins++;
        else Save.data.rivalry.p2Wins++;
        Save.save();
        this._finishRun(`🥚 CAPTURA O OVO: JOGADOR ${survivor.index + 1} SOBREVIVEU!`);
      } else if (this.players.every((p) => p.dead)) {
        this._finishRun('🥚 FIM DE PARTIDA!');
      }
      return;
    }

    if (this.modeId === 'sabotage') {
      const alive = this.players.filter((p) => !p.dead);
      if (alive.length === 1) {
        this.ui.hud.showBanner('👻 MODO SABOTAGEM! Jogador caído agora joga cactos apertando Pulo!', '#c084fc', 3.5);
        return;
      }
    }

    if (this.players.every((p) => p.dead)) {
      this._finishRun('GAME OVER!');
    }
  }

  _finishRun(title) {
    this.state = 'gameover';
    this.music.setPlaying(false);

    const diff = this.difficultyMgr.getConfig();
    const rankedMode = isModeRanked(this.modeId) && this.modeId !== 'free_roam' && !this.isTestTrack;
    const finalScore = Math.floor(this.score * diff.scoreMult * (this.modeId === 'hardcore' ? 5 : 1));
    const isNewRecord = rankedMode ? Save.updateHighScore(finalScore, this.modeId) : false;
    this.hiScore = Save.getHighScore();

    let displayTitle = title;
    if (this.modeId === 'tournament' && this.tournamentState && !this.isTestTrack) {
      const ts = this.tournamentState;
      const playerName = ts.players[ts.currentIdx] || `P${ts.currentIdx + 1}`;
      ts.scores.push({ name: playerName, score: finalScore });
      ts.currentIdx++;
      if (ts.currentIdx < ts.players.length) {
        displayTitle = `🏆 ${playerName}: ${finalScore} pts — Próximo: ${ts.players[ts.currentIdx]} (Aperte R)`;
      } else {
        const champ = [...ts.scores].sort((a, b) => b.score - a.score)[0];
        displayTitle = `🏆 CAMPEÃO DO TORNEIO: ${champ.name} (${champ.score} pts)!`;
        this.tournamentState = { players: ['P1', 'P2', 'P3', 'P4'], scores: [], currentIdx: 0 };
      }
    } else if (this.modeId === 'teams_2v2' && this.teamsState && !this.isTestTrack) {
      const tm = this.teamsState;
      tm.teamScores[tm.currentTeam] += finalScore;
      if (tm.currentTeam === 0) {
        tm.currentTeam = 1;
        displayTitle = `🤝 EQUIPE 1 SOMOU ${finalScore} pts! Agora joga Equipe 2 (Aperte R)`;
      } else {
        const [s0, s1] = tm.teamScores;
        const winMsg = s0 === s1 ? 'EMPATE' : (s0 > s1 ? 'EQUIPE 1 VENCEU' : 'EQUIPE 2 VENCEU');
        displayTitle = `🏆 ${winMsg}! (${s0} × ${s1} pts)`;
        this.teamsState = { teamScores: [0, 0], currentTeam: 0 };
      }
    }

    if (this.modeId === 'time_trial') {
      this.replay.saveGhostIfBest(finalScore);
    }

    if (rankedMode) {
      ProgressionManager.reportRunStats({
        score: finalScore,
        eggs: this.runEggs,
        jumps: this.runJumps,
        stomps: this.runStomps
      });
      Metagame.updateStatsAndWeekly({
        score: finalScore,
        distance: this.distance,
        eggs: this.runEggs,
        deathCause: this.players[0]?._lastDeathCause || null
      });
    }

    if (rankedMode && this.activeCampaignNode && finalScore >= this.activeCampaignNode.targetScore) {
      if (!Save.data.campaign.completedNodes.includes(this.activeCampaignNode.id)) {
        Save.data.campaign.completedNodes.push(this.activeCampaignNode.id);
        Save.addEggs(this.activeCampaignNode.reward || 20);
      }
      Save.save();
    }

    if (rankedMode && this.net?.supabase?.isConfigured?.() && finalScore > 100 && !this.isTestTrack) {
      finishAuthoritativeRun(this.net.supabase.client, {
        playerName: Save.data.network?.nickname || 'Dino',
        dinoId: this.players[0]?.id || 'trex',
        modeId: this.modeId,
        difficulty: diff.id,
        score: finalScore,
        distance: this.distance,
        eggs: this.runEggs,
        runTimeSec: this.runTime,
        maxCombo: this.maxCombo,
        competitive: this.modeId === 'competition',
        seed: this.modeId === 'competition' ? getCompetitionSeed() : (this.customSeed || null)
      }).catch(() => {});
    }

    if (this.multiplayerSession?.active) {
      const sorted = [...this.players].sort((a, b) => (b.score || 0) - (a.score || 0));
      const humanCount = this.players.filter((p) => !p.isBot).length;
      const eligible = humanCount >= 2 && this.runTime >= 20 && finalScore >= 120;
      const tierRewards = [12, 6, 3];
      const elapsedSec = Math.max(1, this.runTime || 1);
      const standings = sorted.map((p, idx) => ({
        peerId: p.peerId,
        name: p.name,
        dinoId: p.id || p.spec?.id || 'trex',
        score: p.score || finalScore,
        distance: Math.floor(p.distance || this.distance || 0),
        raidDamage: Math.floor(p.raidDamage || 0),
        raidDps: Math.round((p.raidDamage || 0) / elapsedSec),
        eggs: p.eggsCollected ?? this.runEggs ?? 0,
        stomps: p.stomps || 0,
        pvpHits: p.pvpHits || 0,
        alive: !p.dead,
        color: p.peerColor,
        eggReward: eligible ? (tierRewards[idx] || 0) : 0,
        pingMs: this.net.pingMs || 2
      }));
      const winner = standings[0];
      if (winner && winner.peerId === this.net.peerId && humanCount >= 2) {
        Save.data.stats.victoriesLan = (Save.data.stats.victoriesLan || 0) + 1;
        if (!Save.data.partySkins.includes('lan_crown')) {
          Save.data.partySkins.push('lan_crown');
        }
        Save.save();
      }
      const hostEntry = standings.find((s) => s.peerId === this.net.peerId);
      const rewardEggs = eligible ? (hostEntry?.eggReward || 0) : 0;
      if (rewardEggs > 0) {
        Save.addEggs(rewardEggs);
      }
      // Recompensa de apostas no lobby (apenas quando elegível contra humanos)
      if (eligible) {
        for (const bet of this.multiplayerSession.bets.values()) {
          if (winner && bet.targetPeerId === winner.peerId) {
            Save.addEggs(Math.min(20, bet.amount * 2));
          }
        }
      }
      const summary = {
        title: displayTitle,
        mpMode: this.multiplayerSession.mpMode || 'race',
        durationSec: Math.floor(this.runTime || 0),
        distance: Math.floor(this.distance || 0),
        raceTargetDistance: this.raceState?.targetDistance || null,
        raidTotalDamage: Math.floor(this.raidState?.totalDamage || 0),
        biomeName: this.currentBiome?.name || this.currentBiome?.id || 'Deserto',
        difficulty: diff?.id || 'normal',
        maxCombo: this.maxCombo || 1,
        eligible,
        rewardEggs,
        standings
      };
      this.lastPodiumSummary = summary;
      this.net.broadcastHostEnd(summary);
      this.tvHud.setVisible(false);
      this.ui.showPodium(summary, {
        onReplay: () => this.startReplayPlayback(),
        onVote: (v) => this.net.sendRoundVote(v),
        onRematch: () => {
          // Revanche mantendo exatamente a mesma sala e configuração atual
          this.restartRun();
        },
        onAgain: (voteRes) => {
          if (!voteRes?.keepRoomConfig) {
            if (voteRes?.votedBiome) {
              this.setBiomeConfig(voteRes.votedBiome, this.sequenceBiomes);
            }
            if (voteRes?.votedMpMode && this.multiplayerSession) {
              this.multiplayerSession.mpMode = voteRes.votedMpMode;
              if (this.multiplayerSession.room) {
                this.multiplayerSession.room.mpMode = voteRes.votedMpMode;
                this.multiplayerSession.room.elimination = (voteRes.votedMpMode === 'elimination');
              }
            }
          }
          this.restartRun();
        },
        onMenu: () => this.openMainMenu()
      });
      return;
    }

    const gachaEligible = rankedMode && !this.isTestTrack && !this.multiplayerSession?.active && this.modeId !== 'zen' && this.modeId !== 'free_roam' && this.modeId !== 'tutorial';
    const gachaCrates = GachaSystem.computeRunCrates(finalScore, this.difficultyMgr.getConfig(), gachaEligible);
    if (gachaCrates > 0) GachaSystem.addCrates(gachaCrates);
    const totalCrates = GachaSystem.getCrateCount();

    const canCrystalRevive = Boolean(
      !this.isTestTrack &&
      !this.multiplayerSession?.active &&
      !this._crystalReviveUsed &&
      !Save.data.perfectMode &&
      this.modeId !== 'hardcore' &&
      this.modeId !== 'competition' &&
      (this.difficultyMgr.activeId === 'easy' || this.difficultyMgr.activeId === 'normal')
    );

    const deathInfo = this._describeDeathCause(this.players[0]?._lastDeathCause);
    this.lastPodiumSummary = null;
    this.lastGameOverArgs = {
      title: displayTitle,
      score: finalScore,
      hiScore: this.hiScore,
      isNewRecord,
      distance: this.distance,
      eggs: this.runEggs,
      maxCombo: this.maxCombo,
      dinoId: this.players[0]?.id || 'trex',
      causeLabel: deathInfo.label,
      avoidTip: deathInfo.tip,
      gachaCrates,
      totalCrates,
      canCrystalRevive,
      crystalReviveCost: 2,
      crystals: Save.data.crystals || 0,
      onCrystalRevive: () => this.reviveWithCrystal()
    };

    this.ui.hud.showGameOver(this.lastGameOverArgs);
  }

  reviveWithCrystal() {
    if (this.state !== 'gameover' || this._crystalReviveUsed) return false;
    if (this.isTestTrack || this.multiplayerSession?.active || Save.data.perfectMode || this.modeId === 'hardcore') return false;
    if (this.difficultyMgr.activeId !== 'easy' && this.difficultyMgr.activeId !== 'normal') return false;
    if ((Save.data.crystals || 0) < 2) return false;
    const p0 = this.players[0];
    if (!p0) return false;

    Save.addCrystals(-2);
    this._crystalReviveUsed = true;
    p0.dead = false;
    p0.hp = Math.min(p0.maxHp || 3, 2);
    p0.invulnTimer = 3.2;
    p0.oxygen = 100;
    p0.stamina = 100;
    p0.y = 0;
    p0.vy = 0;
    p0.grounded = p0.habitatMode !== 'flying';
    p0.model.root.rotation.set(0, 0, 0);
    this._clearNearbyObstacles(p0.x, p0.z, 28, false);
    this.ui.hud.hideGameOver();
    this.state = 'playing';
    this.lastTime = performance.now();
    this.music.setPlaying(true);
    this.sfx.heal?.();
    this.particles.emitExplosion(p0.x, (p0.baseY || 0) + 1.0, p0.z, '#38bdf8', 22, true);
    this.ui.hud.showBanner('💎 RENASCIMENTO DE CRISTAL (-2 💎)! +2 ❤️ & Escudo Temporário!', '#38bdf8', 3.2);
    return true;
  }

  startReplayPlayback() {
    if (this.replay.frames.length === 0) return;
    this.state = 'replay';
    this.replayTime = 0;
    this.spawner.reset();
    this.events.reset();
    this.particles.clear();
    const p0 = this.players[0];
    if (p0) {
      p0.dead = false;
      p0.invulnTimer = 0;
      p0.furyTimer = 0;
      p0.animator.reset();
      p0.model.root.rotation.set(0, 0, 0);
    }
    this.ui.hud.hideGameOver();
    this.ui.hud.showBanner('🎬 REPLAY CINEMATOGRÁFICO (R para reiniciar)', '#ffd447', 4);
  }

  _handlePlayerInput(p, dt) {
    if (p.dead) {
      if ((p.reviveWindowTimer || 0) > 0) {
        p.reviveWindowTimer = Math.max(0, p.reviveWindowTimer - dt);
      }
      // Sabotagem: fantasma joga cactos apertando pulo!
      if (this.modeId === 'sabotage' && this.input.wasActionJustPressed(p.key, 'jump', false)) {
        this.spawner._acquire('cactus_small', LANE_X[Math.floor(Math.random() * 3)], 0, -55);
      }
      return;
    }
    if ((p.reviveCooldown || 0) > 0) p.reviveCooldown = Math.max(0, p.reviveCooldown - dt);
    if ((p._abyssBreatheCd || 0) > 0) p._abyssBreatheCd = Math.max(0, p._abyssBreatheCd - dt);

    // No modo Relay, apenas o jogador ativo responde
    if (this.modeId === 'relay' && p.index !== this.relayActiveIdx) return;

    let leftJust = false;
    let rightJust = false;
    let jumpJust = false;
    let jumpHeld = false;
    let duckJust = false;
    let duckHeld = false;
    let abilityJust = false;
    let attackJust = false;
    let furyJust = false;
    let itemJust = false;
    let transmuteJust = false;

    const isRemotePeer = !!(this.multiplayerSession?.active && p.peerId && p.peerId !== this.net.peerId);
    const isLocalMain = !this.multiplayerSession?.active ? (p.index === 0) : (this.multiplayerSession.isHost && p.peerId === this.net.peerId);

    if (p.isBot) {
      p.botThinkTimer -= dt;
      if (p.botThinkTimer <= 0) {
        p.botThinkTimer = 0.14;
        const nearHaz = this.spawner.getActiveObstacles().filter(
          (o) => !o.hit && !['egg', 'powerup', 'ramp', 'fruit'].includes(o.kind) && o.group.position.z > -16 && o.group.position.z < 1.2
        );
        const blocked = nearHaz.some((o) => Math.abs(o.group.position.x - LANE_X[p.lane]) < 1.15);
        if (blocked) {
          const freeLane = [0, 1, 2].find((ln) => !nearHaz.some((o) => Math.abs(o.group.position.x - LANE_X[ln]) < 1.15));
          if (freeLane !== undefined) {
            leftJust = freeLane < p.lane;
            rightJust = freeLane > p.lane;
          } else if (p.grounded) {
            jumpJust = true;
          }
        }
      }
    } else if (this.modeId === 'shared_controls') {
      const moveKey = this.sharedFlipped ? 'p2' : 'p1';
      const actKey = this.sharedFlipped ? 'p1' : 'p2';
      leftJust = this.input.wasActionJustPressed(moveKey, 'left', false);
      rightJust = this.input.wasActionJustPressed(moveKey, 'right', false);
      jumpJust = this.input.wasActionJustPressed(actKey, 'jump', true);
      jumpHeld = this.input.isActionDown(actKey, 'jump', true);
      duckJust = this.input.wasActionJustPressed(actKey, 'duck', true);
      duckHeld = this.input.isActionDown(actKey, 'duck', true);
      abilityJust = this.input.wasActionJustPressed(actKey, 'ability', false);
      attackJust = this.input.wasActionJustPressed(actKey, 'attack', false);
      furyJust = this.input.wasKeyJustPressed('KeyF') || this.input.wasActionJustPressed('p1', 'fury', false);
      itemJust = this.input.wasKeyJustPressed('KeyE') || this.input.wasActionJustPressed(actKey, 'item', false);
      transmuteJust = this.input.wasActionJustPressed(actKey, 'transmute', false);
    } else if (isRemotePeer) {
      leftJust = !!this.input.virtualJustPressed[p.key]?.has('left');
      rightJust = !!this.input.virtualJustPressed[p.key]?.has('right');
      jumpJust = !!this.input.virtualJustPressed[p.key]?.has('jump');
      jumpHeld = !!this.input.virtualState[p.key]?.jump;
      duckJust = !!this.input.virtualJustPressed[p.key]?.has('duck');
      duckHeld = !!this.input.virtualState[p.key]?.duck;
      abilityJust = !!this.input.virtualJustPressed[p.key]?.has('ability');
      attackJust = !!this.input.virtualJustPressed[p.key]?.has('attack');
      furyJust = !!this.input.virtualJustPressed[p.key]?.has('fury');
      itemJust = !!this.input.virtualJustPressed[p.key]?.has('item');
      transmuteJust = !!this.input.virtualJustPressed[p.key]?.has('transmute');
    } else {
      const allowClassic = this.players.length === 1 || (!!this.multiplayerSession?.active && isLocalMain);
      const inKey = isLocalMain ? 'p1' : p.key;
      leftJust = this.input.wasActionJustPressed(inKey, 'left', allowClassic);
      rightJust = this.input.wasActionJustPressed(inKey, 'right', allowClassic);
      jumpJust = this.input.wasActionJustPressed(inKey, 'jump', allowClassic);
      jumpHeld = this.input.isActionDown(inKey, 'jump', allowClassic);
      duckJust = this.input.wasActionJustPressed(inKey, 'duck', allowClassic);
      duckHeld = this.input.isActionDown(inKey, 'duck', allowClassic);
      abilityJust = this.input.wasActionJustPressed(inKey, 'ability', false);
      attackJust = this.input.wasActionJustPressed(inKey, 'attack', false);
      furyJust = isLocalMain && (this.input.wasKeyJustPressed('KeyF') || this.input.wasActionJustPressed('p1', 'fury', false));
      itemJust = isLocalMain
        ? (this.input.wasKeyJustPressed('KeyE') || this.input.wasActionJustPressed('p1', 'item', false))
        : this.input.wasActionJustPressed(inKey, 'item', false);
      transmuteJust = this.input.wasActionJustPressed(inKey, 'transmute', false);
    }

    if ((this._skipIntroGuardFrames || 0) > 0) {
      jumpJust = false;
      jumpHeld = false;
      duckJust = false;
      abilityJust = false;
      transmuteJust = false;
    }

    if (transmuteJust) {
      this._transmutePlayerHabitat(p);
    }

    // Tick de debuffs expandidos (§3 contrato) — devolve speedMult, laneMult, controlsReversed, abilityLocked, visionMult, gravityMult
    const debuffFx = typeof StatusSystem.tickDebuffs === 'function'
      ? StatusSystem.tickDebuffs(p, dt, this._eventContext())
      : null;
    p._debuffFx = debuffFx;

    // Regra do Modo Caos, Modo Espelhado ou Debuff controlsReversed: controles invertidos!
    if (this.activeChaosRule?.id === 'inverted' || Save.data.mirroredMode || debuffFx?.controlsReversed) {
      [leftJust, rightJust] = [rightJust, leftJust];
    }

    // Vento ou correnteza do bioma empurram suavemente (reduzido por estabilidade / patas extras)
    const stab = Math.min(0.85, p.stabilityBonus || 0);
    const envWind = ((this.weather.windForce || 0) + (this.currentBiome.windBias || 0) + (p.spec.dinoClass === 'aquatic' ? 0 : (this.currentBiome.currentForce || 0))) * (1 - stab);
    if ((p._moveComboCd || 0) > 0) p._moveComboCd = Math.max(0, p._moveComboCd - dt);

    const progLocked = !p._unlockAll && Save.data.settings?.progressiveUnlocks !== false;
    const abilityUnlocked = !progLocked || this.score >= 600;
    const staminaUnlocked = !progLocked || this.score >= 1200;
    const attackUnlocked = !progLocked || this.score >= 1800;
    const furyUnlocked = !progLocked || this.score >= 2800;

    const isSubmergedBiome = Boolean(this.currentBiome?.submerged);
    const curHabitat = p.habitatMode || p.habitat || 'land';
    const isFlyingFlight = curHabitat === 'flying' && !isSubmergedBiome;
    const laneArr = (curHabitat === 'aquatic' && !isSubmergedBiome) ? RIVER_LANE_X : LANE_X;
    const inWater = !isFlyingFlight && Boolean(isSubmergedBiome || curHabitat === 'aquatic');
    p.inWater = inWater;
    p.inSubmerged = isSubmergedBiome;
    p.baseY = isFlyingFlight ? (SKY_CORRIDOR_Y - 1.15) : 0;

    if (leftJust) {
      if (p.inShopLane === 'right') {
        p.inShopLane = null;
        p.lane = 2;
        p._lastLaneSwitchAt = this.runTime;
        this.sfx.dash();
      } else if (this.shopDetour?.active && this.shopDetour.side === 'left' && p.lane === 0 && p.habitat !== 'flying') {
        p.inShopLane = 'left';
        p._lastLaneSwitchAt = this.runTime;
        this.sfx.dash();
        this.ui.hud.showFloatText('🛒 ENTRANDO NA LOJINHA!', '#34d399');
      } else if (p.lane > 0) {
        p.lane--;
        p._lastLaneSwitchAt = this.runTime;
        this.sfx.dash();
        this.particles.emitDust(p.x, (p.baseY || 0) + 0.2, p.z, 3, '#ffd447', 1.4);
        if (this.tutorialState?.active && p.index === 0) {
          if (this.tutorialState.step === 0 || this.tutorialState.step === 1) {
            this._advanceTutorialStep();
          }
        }
      }
    }
    if (rightJust) {
      if (p.inShopLane === 'left') {
        p.inShopLane = null;
        p.lane = 0;
        p._lastLaneSwitchAt = this.runTime;
        this.sfx.dash();
      } else if (this.shopDetour?.active && this.shopDetour.side === 'right' && p.lane === 2 && p.habitat !== 'flying') {
        p.inShopLane = 'right';
        p._lastLaneSwitchAt = this.runTime;
        this.sfx.dash();
        this.ui.hud.showFloatText('🛒 ENTRANDO NA LOJINHA!', '#34d399');
      } else if (p.lane < 2) {
        p.lane++;
        p._lastLaneSwitchAt = this.runTime;
        this.sfx.dash();
        this.particles.emitDust(p.x, (p.baseY || 0) + 0.2, p.z, 3, '#ffd447', 1.4);
        if (this.tutorialState?.active && p.index === 0) {
          if (this.tutorialState.step === 0 || this.tutorialState.step === 1) {
            this._advanceTutorialStep();
          }
        }
      }
    }

    const iceLaneMult = p.statuses?.ice ? 0.72 : 1;
    const debuffLaneMult = Number.isFinite(debuffFx?.laneMult)
      ? Math.max(0.35, Math.min(1.5, debuffFx.laneMult))
      : 1;
    const laneSpeed = 16 * (p.laneSpeedMult || 1) * iceLaneMult * debuffLaneMult;
    const tOff = p.trackOffsetX || 0;
    const baseTargetX = tOff + (p.inShopLane ? (SHOP_LANE_X[p.inShopLane] ?? laneArr[p.lane]) : (laneArr[p.lane] ?? 0));
    const targetX = baseTargetX + (p.xOffset || 0) + Math.sin(this.runTime * 2) * (Math.abs(envWind) > 0.2 ? envWind * 0.15 : 0);
    const prevX = p.x;
    p.x += (targetX - p.x) * Math.min(1, dt * laneSpeed);
    const laneLean = (p.x - prevX) / Math.max(dt, 0.001) * 0.055;

    // Pulo + Salto Duplo Limitado + Pulo Carregado / Voo Aerodinâmico + Emersão na água
    const jumpMult = (p.jumpMult || 1) * (p.spec.stats.jump >= 9 ? 1.1 : 1.0);
    const maxAirJumps = p.id === 'compsognathus' ? 2 : 1;
    const airJumpCost = Math.round(58 * (1 - (p.mutationMods?.staminaSave || 0)) * (p.airStaminaCostMult || 1));

    if (isFlyingFlight) {
      p.diveTarget = 0;
      p.diveDepth = Math.max(0, (p.diveDepth || 0) - dt * 6.0);
      p.sliding = false;
      p.grounded = false;
      const flapCost = Math.round(18 * (1 - (p.mutationMods?.staminaSave || 0)) * (p.airStaminaCostMult || 1));
      if (jumpJust) {
        if (this.events.ufo.active && this.events.ufo.mashBreak()) {
          // Quebrou o feixe do OVNI!
        } else if (this.isTestTrack || (p.stamina ?? 100) >= flapCost) {
          if (!this.isTestTrack) {
            p.stamina = Math.max(0, (p.stamina ?? 100) - flapCost);
            p._staminaRegenDelay = 0.6;
          }
          p.glideHoldTimer = 0.65;
          p.vy = Math.max(p.vy, 7.8 * jumpMult);
          p.airJumpsUsed = 0;
          this.runJumps++;
          this.sfx.jump(true);
          this.particles.emitDust(p.x, (p.baseY || 0) + p.y, p.z + 0.25, 5, '#bae6fd', 2.0);
          if (this.tutorialState?.active && this.tutorialState.step === 2 && p.index === 0) {
            this._advanceTutorialStep();
          }
        } else if (!p._lowStamToastCooldown && p.index === 0) {
          p._lowStamToastCooldown = 0.85;
          this.ui.hud.showFloatText('💨 Sem estamina nas asas! Voe nivelado ou dê rasante (S/↓)!', '#fbbf24');
        }
      }
      if (duckJust || duckHeld) {
        p.vy = duckJust ? Math.min(p.vy, -8.8) : Math.max(-11.2, p.vy - 28.0 * dt);
        p.glideHoldTimer = Math.min(0.65, (p.glideHoldTimer ?? 0.4) + dt * 1.1);
        if (duckJust) this.sfx.slide?.();
        if (this.tutorialState?.active && this.tutorialState.step === 3 && p.index === 0) {
          this._advanceTutorialStep();
        }
      } else if (jumpHeld) {
        const hasWingStam = this.isTestTrack || (p.stamina ?? 100) > 4;
        const hasHoldTime = (p.glideHoldTimer ?? 0.65) > 0;
        if (hasWingStam && hasHoldTime) {
          if (!this.isTestTrack) {
            const holdDrain = 56 * (1 - (p.mutationMods?.staminaSave || 0)) * (p.airStaminaCostMult || 1);
            p.stamina = Math.max(0, (p.stamina ?? 100) - holdDrain * dt);
            p._staminaRegenDelay = 0.7;
          }
          p.glideHoldTimer = Math.max(0, (p.glideHoldTimer ?? 0.65) - dt);
          if (p.y >= 2.45) {
            p.glideHoldTimer = Math.min(p.glideHoldTimer, 0.08);
          }
          p.vy = Math.min(9.2, p.vy + 22.0 * dt);
        } else {
          // Estamina ou tempo máximo de planeio esgotado: perde sustentação imediatamente e desce de volta ao nível base!
          p.vy = Math.min(p.vy, -1.8) + ((-0.35 - p.y) * 7.2 - p.vy * 4.8) * dt;
          if (!p._lowStamToastCooldown && p.index === 0) {
            p._lowStamToastCooldown = 1.1;
            this.ui.hud.showFloatText(
              !hasWingStam
                ? '💨 Estamina esgotada! Solte para recuperar no voo nivelado!'
                : '🪽 Limite de planeio atingido! Solte a tecla para estabilizar!',
              '#fbbf24'
            );
          }
        }
      } else {
        // Estabilização suave de planeio no corredor celeste e recarga do tempo de sustentação quando nivelado
        p.vy += (-p.y * 5.8 - p.vy * 4.8) * dt;
        if (p.y <= 0.55) {
          p.glideHoldTimer = Math.min(0.65, (p.glideHoldTimer ?? 0) + dt * 1.1);
        }
      }
      p.ducking = Boolean(duckHeld);
    } else {
      if (jumpJust) {
        if (this.events.ufo.active && this.events.ufo.mashBreak()) {
          // Quebrou o feixe do OVNI!
        } else if (inWater && !p.inSubmerged && ((p.diveTarget || 0) >= 0.5 || (p.diveDepth || 0) > 0.25)) {
          p.diveTarget = 0;
          p.diveDepth = 0;
          p.diveTimer = 0;
          p.vy = 11.8 * jumpMult;
          p.grounded = false;
          p.ducking = false;
          p.sliding = false;
          p.airJumpsUsed = 0;
          this.sfx.jump(true);
          this.particles.emitDust(p.x, (p.baseY || 0) + 0.35, p.z, 12, '#67e8f9', 3.2);
          if (p.index === 0) this.ui.hud.showFloatText('🌊 SALTO NA SUPERFÍCIE!', '#38bdf8');
        } else if (p.grounded) {
          p.vy = 13.4 * jumpMult;
          p.grounded = false;
          p.ducking = false;
          p.sliding = false;
          p.jumpHoldTimer = 0.12;
          p.airJumpsUsed = 0;
          p._lastJumpAt = this.runTime;
          this.runJumps++;
          this.sfx.jump(false);
          this.particles.emitDust(p.x, (p.baseY || 0) + 0.12, p.z + 0.2, 6, '#f2c57c', 2.2);
          if ((this.runTime - (p._lastLaneSwitchAt ?? -99)) <= 0.65 && (p._moveComboCd || 0) <= 0) {
            p._moveCombo = Math.min(8, (p._moveCombo || 0) + 1);
            p._moveComboCd = 1.6;
            this.addScore(35 * p._moveCombo, p);
            this.ui.hud.showFloatText(`🏃 ESQUIVA ÁGIL! +${35 * p._moveCombo}`, '#5eead4');
          }
          if (this.tutorialState?.active && this.tutorialState.step === 2 && p.index === 0) {
            this._advanceTutorialStep();
          }
        } else if ((p.airJumpsUsed || 0) < maxAirJumps) {
          if (p.extraJumps > 0) {
            p.extraJumps--;
            p.airJumpsUsed = (p.airJumpsUsed || 0) + 1;
            p.vy = 10.6 * jumpMult;
            p.jumpHoldTimer = 0;
            this.sfx.jump(true);
            this.particles.emitDust(p.x, (p.baseY || 0) + p.y, p.z, 8, '#90e0ef', 2.4);
          } else if (!staminaUnlocked && p.index === 0) {
            if (!p._lowStamToastCooldown) {
              p._lowStamToastCooldown = 0.9;
              this.ui.hud.showFloatText('🔒 Pulo Duplo & Estamina liberam aos 1.200 pts!', '#94a3b8');
            }
          } else if (this.isTestTrack || (p.stamina ?? 100) >= airJumpCost) {
            if (!this.isTestTrack) {
              p.stamina = Math.max(0, (p.stamina ?? 100) - airJumpCost);
              p._staminaRegenDelay = 0.75;
            }
            p.airJumpsUsed = (p.airJumpsUsed || 0) + 1;
            p.vy = 10.1 * jumpMult;
            p.jumpHoldTimer = 0;
            this.sfx.jump(true);
            this.particles.emitDust(p.x, (p.baseY || 0) + p.y, p.z, 8, '#34d399', 2.4);
          } else if (!p._lowStamToastCooldown) {
            p._lowStamToastCooldown = 0.8;
            this.ui.hud.showFloatText(`💨 Estamina baixa (precisa ${airJumpCost})!`, '#fbbf24');
          }
        } else if (!p._lowStamToastCooldown) {
          p._lowStamToastCooldown = 0.8;
          this.ui.hud.showFloatText('⬇️ Toque o chão antes de outro pulo!', '#94a3b8');
        }
      }

      // Pulo carregado enquanto segura a tecla nos primeiros instantes da subida
      if (jumpHeld && p.jumpHoldTimer > 0 && p.vy > 0) {
        p.jumpHoldTimer -= dt;
        p.vy += 13 * dt;
      }

      // Abaixar / Deslizar / Mergulho Alternante na Água (S / ↓ / Arraste para Baixo alterna Superfície ↔ Submerso)
      if ((duckJust || duckHeld) && this.tutorialState?.active && this.tutorialState.step === 3 && p.index === 0) {
        this._advanceTutorialStep();
      }
      if (p.inSubmerged) {
        p.diveTarget = 1;
        p.diveDepth = 1.0;
        p.ducking = Boolean(duckHeld);
      } else if (inWater) {
        if (duckJust) {
          const nextTarget = (p.diveTarget || 0) >= 0.5 ? 0 : 1;
          p.diveTarget = nextTarget;
          this.sfx.slide?.();
          if (nextTarget === 1) {
            this.particles.emitDust(p.x, (p.baseY || 0) + 0.25, p.z, 12, '#67e8f9', 3.2);
            if (p.index === 0) {
              this.ui.hud.showFloatText('🤿 SUBMERSO! (S/↓ ou W/↑ sobe)', '#22d3ee');
              if (!p.isAquaticNative) {
                this._triggerFirstUseSpotlight('spotlight_submerge', {
                  icon: '🫧',
                  title: 'Mergulho Profundo & O₂',
                  desc: 'Toque em S/↓ ou Arraste para Baixo na água para alternar entre Superfície e Fundo do Mar! Embaixo d’água você escapa de tubarões e encontra correntes turbo 🌀 e baús! Pressione S/↓ ou W/↑ novamente para subir antes que o O₂ acabe.',
                  selector: '#hud-oxygen-pill',
                  accent: '#22d3ee'
                });
              }
            }
          } else {
            this.particles.emitDust(p.x, (p.baseY || 0) - 0.85, p.z, 10, '#bae6fd', 2.8);
            if (p.index === 0) {
              this.ui.hud.showFloatText('🌊 VOLTANDO À SUPERFÍCIE!', '#38bdf8');
            }
          }
        }
        const target = (p.diveTarget || 0) >= 0.5 ? 1 : 0;
        const prevDive = p.diveDepth || 0;
        if (prevDive < target) {
          p.diveDepth = Math.min(target, prevDive + dt * 4.6);
        } else if (prevDive > target) {
          p.diveDepth = Math.max(target, prevDive - dt * 4.2);
        }
        p.diveTimer = target === 1 ? 0.25 : 0;
        p.ducking = Boolean(duckHeld);
        if ((p.diveDepth || 0) > 0.22 && Math.random() < dt * 9) {
          this.particles.emitDust(p.x, (p.baseY || 0) - (p.diveDepth || 0) * 2.5, p.z + 0.22, 2, '#90e0ef', 1.4);
        }
      } else {
        p.diveTarget = 0;
        p.diveDepth = Math.max(0, (p.diveDepth || 0) - dt * 6.0);
        if (duckHeld) {
          if (!p.grounded) {
            if (p.vy > -18 && (this.runTime - (p._lastJumpAt ?? -99)) <= 0.85 && (p._moveComboCd || 0) <= 0) {
              p._moveCombo = Math.min(8, (p._moveCombo || 0) + 1);
              p._moveComboCd = 1.6;
              this.addScore(45 * p._moveCombo, p);
              this.ui.hud.showFloatText(`⚡ MERGULHO PERFEITO! +${45 * p._moveCombo}`, '#38bdf8');
            }
            p.vy = Math.min(p.vy, -20);
          } else if (!p.sliding && !p.ducking) {
            const slideCost = staminaUnlocked ? 14 : 0;
            const hasSlideStam = this.isTestTrack || !staminaUnlocked || (p.stamina ?? 100) >= slideCost;
            if (hasSlideStam && slideCost > 0 && !this.isTestTrack) {
              p.stamina = Math.max(0, (p.stamina ?? 100) - slideCost);
              p._staminaRegenDelay = 0.45;
            }
            p.sliding = hasSlideStam;
            p.slideTimer = hasSlideStam ? 0.48 : 0;
            this.sfx.slide();
          }
          p.ducking = true;
        } else {
          p.ducking = false;
        }
      }
    }

    // Controle realista de Oxigênio e Brânquias por fisiologia (aquatic_gills, amphibious_hybrid, terrestrial) (B6)
    const o2Cfg = ContentLoader.getBalance().oxygen || {};
    const o2DrainBase = o2Cfg.drainPerSec ?? 5.5;
    const o2RechargeBase = o2Cfg.rechargePerSec ?? 38;
    const o2LowThreshold = o2Cfg.lowThreshold ?? 30;
    const o2GraceSec = o2Cfg.graceSec ?? 2.0;

    if (p._oxygenWarnCd > 0) p._oxygenWarnCd = Math.max(0, p._oxygenWarnCd - dt);
    const physiology = p.aquaticPhysiology || getDinoAquaticPhysiology(p.spec || p.id);
    const isSubmergedDepth = Boolean(p.inSubmerged || (inWater && (p.diveDepth || 0) > 0.32));
    const hasDiveGear = p.equippedAccessory === 'diving_mask' || p.equippedAccessory === 'snorkel' || p.equippedAccessory === 'steam_goggles';
    p._gillsUnderwaterBoost = false;

    if (physiology === 'aquatic_gills') {
      if (isSubmergedDepth || p.inSubmerged) {
        // Habitat natural submerso: ZERO drenagem de O2, 100% sempre + 15% velocidade e regeneração de estamina!
        p.oxygen = 100;
        p._oxygenDmgTimer = 0;
        p._gillsUnderwaterBoost = true;
      } else if (inWater && !this.isTestTrack && this.modeId !== 'zen') {
        // Na superfície em bioma/canal aquático: drenagem suave de umidade das brânquias (2.6/s), mergulhar (S/↓) recarrega rápido (90/s)
        if ((p.diveTarget || 0) >= 0.5) {
          p.oxygen = Math.min(100, (p.oxygen ?? 100) + 90 * dt);
          p._oxygenDmgTimer = 0;
        } else {
          const moistureDrain = 2.6 * (hasDiveGear ? 0.5 : 1.0);
          p.oxygen = Math.max(0, (p.oxygen ?? 100) - moistureDrain * dt);
          if (p.oxygen <= o2LowThreshold && p.oxygen > 0 && p.index === 0 && (p._oxygenWarnCd || 0) <= 0) {
            p._oxygenWarnCd = 2.8;
            this.ui.hud.showFloatText('💧 Umidade das Brânquias baixa! Mergulhe com [S/↓]!', '#38bdf8');
          }
          if (p.oxygen <= 0) {
            p._oxygenDmgTimer = (p._oxygenDmgTimer || 0) + dt;
            if (p._oxygenDmgTimer >= o2GraceSec * 1.4) {
              p._oxygenDmgTimer = 0;
              p.diveTarget = 1;
              p.oxygen = 65;
              if (p.index === 0) {
                this.ui.hud.showFloatText('🤿 Mergulho automático para hidratar as Brânquias!', '#22d3ee');
              }
            }
          }
        }
      } else {
        p.oxygen = Math.min(100, (p.oxygen ?? 100) + 90 * dt);
        p._oxygenDmgTimer = 0;
      }
    } else if (physiology === 'amphibious_hybrid') {
      if (isSubmergedDepth && !this.isTestTrack && this.modeId !== 'zen') {
        // Reserva anfíbia estendida: drenagem muito lenta (2.0/s = 50s submerso!)
        const ampDrain = 2.0 * (hasDiveGear ? 0.5 : 1.0) * (1 - (p.spec?.passive?.oxygenSave || 0));
        p.oxygen = Math.max(0, (p.oxygen ?? 100) - ampDrain * dt);
        if (p.oxygen <= o2LowThreshold && p.oxygen > 0 && p.index === 0 && (p._oxygenWarnCd || 0) <= 0) {
          p._oxygenWarnCd = 2.6;
          this.ui.hud.showFloatText('🫧 Fôlego Anfíbio baixo! Suba [W/↑], pegue Bolha 🫧 ou use [X] Foco (+O₂)!', '#fbbf24');
        }
        if (p.oxygen <= 0) {
          p._oxygenDmgTimer = (p._oxygenDmgTimer || 0) + dt;
          if (p._oxygenDmgTimer >= o2GraceSec) {
            p._oxygenDmgTimer = 0;
            p.oxygen = 28;
            if (!p.inSubmerged) p.diveTarget = 0;
            this._damagePlayer(p, 'oxygen');
          }
        }
      } else {
        // Recarga super rápida na superfície/terra (65/s)
        p.oxygen = Math.min(100, (p.oxygen ?? 100) + 65 * dt);
        p._oxygenDmgTimer = 0;
      }
    } else {
      // Terrestre: drenagem justa de 5.5/s (reduzida com equipamento de mergulho), dicas de Bolhas e [X] Foco Tático (+O2)
      if (isSubmergedDepth && !this.isTestTrack && this.modeId !== 'zen') {
        if (p.index === 0) {
          this._hintOnce('submerge_o2', '🫧 Submerso! Suba (W/↑), pegue Bolhas 🫧 ou use [X] Foco Tático (+45 O₂)!', '#22d3ee');
        }
        const terrDrain = Math.min(5.5, o2DrainBase) * (hasDiveGear ? 0.45 : 1.0);
        p.oxygen = Math.max(0, (p.oxygen ?? 100) - terrDrain * dt);
        if (p.oxygen <= o2LowThreshold && p.oxygen > 0 && p.index === 0 && (p._oxygenWarnCd || 0) <= 0) {
          p._oxygenWarnCd = 2.6;
          this.ui.hud.showFloatText('⚠️ OXIGÊNIO BAIXO! Suba (W/↑), pegue Bolha 🫧 ou use [X] Foco Tático (+O₂)!', '#ef4444');
        }
        if (p.oxygen <= 0) {
          p._oxygenDmgTimer = (p._oxygenDmgTimer || 0) + dt;
          if (p._oxygenDmgTimer >= o2GraceSec) {
            p._oxygenDmgTimer = 0;
            p.oxygen = 24;
            if (!p.inSubmerged) p.diveTarget = 0;
            this._damagePlayer(p, 'oxygen');
          }
        }
      } else {
        p.oxygen = Math.min(100, (p.oxygen ?? 100) + Math.max(42, o2RechargeBase) * dt);
        p._oxygenDmgTimer = 0;
      }
    }

    if (p.sliding) {
      p.slideTimer -= dt;
      if (p.slideTimer <= 0 || !duckHeld) p.sliding = false;
    }

    // Ataque Básico / Mordida / Destruir Cactos (Q)
    if (attackJust) {
      if (!attackUnlocked && p.index === 0) {
        if (!p._lowStamToastCooldown) {
          p._lowStamToastCooldown = 0.9;
          this.ui.hud.showFloatText('🔒 Ataque [Q] libera aos 1.800 pts!', '#f97316');
        }
      } else {
        this._performMeleeAttack(p);
      }
    }

    // Habilidade Especial (também quebra o feixe do OVNI se capturado!)
    if (abilityJust) {
      if (this.events.ufo.active && this.events.ufo.mashBreak()) {
        // Escapando do feixe do OVNI!
      } else if (debuffFx?.abilityLocked) {
        if (!p._lowStamToastCooldown && p.index === 0) {
          p._lowStamToastCooldown = 0.9;
          this.ui.hud.showFloatText('🔒 Habilidade silenciada por debuff!', '#c084fc');
        }
      } else if (!abilityUnlocked && p.index === 0) {
        if (!p._lowStamToastCooldown) {
          p._lowStamToastCooldown = 0.9;
          this.ui.hud.showFloatText('🔒 Habilidade [Espaço] libera aos 600 pts!', '#38bdf8');
        }
      } else {
        const activated = this.abilities.activate(p, this._eventContext());
        if (activated) {
          Metagame.recordSkill(p.id);
          if (p.index === 0) {
            this._triggerFirstUseSpotlight('spotlight_ability', {
              icon: '⚡',
              title: 'Habilidade Especial [Espaço]',
              desc: 'Cada dino ativa um poder próprio no [Espaço]. Recarregue pegando ovos ou fazendo rasantes!',
              selector: '#bar-ability',
              accent: '#38bdf8'
            });
          }
          if (this.tutorialState?.active && this.tutorialState.step === 4 && p.index === 0) {
            this._advanceTutorialStep();
          }
        }
        if (activated && this.modeId === 'coop' && this.players.length === 2) {
          const other = this.players.find((o) => o !== p);
          if (other && other.abilityDuration > 0) {
            // Combinação Coop + Fusão temporária de 10s!
            p.furyTimer = 10;
            other.furyTimer = 10;
            this.sfx.fury();
            this.ui.hud.showBanner('💥 FUSÃO COOP ATIVADA POR 10s! INVENCÍVEIS!', '#ffd447', 3.5);
          }
        }
      }
    }

    // Fúria (F)
    if (furyJust) {
      if (!furyUnlocked && p.index === 0) {
        if (!p._lowStamToastCooldown) {
          p._lowStamToastCooldown = 0.9;
          this.ui.hud.showFloatText('🔒 Fúria [F] libera aos 2.800 pts!', '#fbbf24');
        }
      } else if (p.fury >= 100 && p.furyTimer <= 0) {
        p.fury = 0;
        p.furyTimer = 6.0 * (p.mutationMods?.furyDurMult || 1);
        this.sfx.fury();
        this.narrator.say('fury');
        this.ui.hud.showBanner(`🔥 ${p.name}: MODO FÚRIA ATIVADO!`, '#ff5e1a', 2.5);
      }
    }

    // Mochila (E ou botão do controle remoto)
    if (itemJust) {
      this.usePlayerItem(p.index);
    }

    // Garante que qualquer evento (OVNI, montaria, foguete encerrado) retorne o dino à gravidade
    if (!isFlyingFlight && p.y > 0.01 && p.rocketTimer <= 0 && p.grappleTimer <= 0 && p.riverLogTimer <= 0) {
      p.grounded = false;
    }

    // Gravidade (Planeta Alienígena, Modo Caos, Pista Customizada, Evento Baixa Gravidade, Debuffs, Raid Affix)
    const debuffGravMult = Number.isFinite(debuffFx?.gravityMult)
      ? Math.max(0.45, Math.min(1.85, debuffFx.gravityMult))
      : 1.0;
    const raidGravMult = this.raidState?.activeAffix?.gravityMult || 1.0;
    let gravMult = (this.activeChaosRule?.id === 'low_grav' ? 0.55 : (this.currentBiome.lowGravity || 1.0))
      * (this.activeCustomTrack?.gravityScale || 1.0)
      * (this.events.getGravityScale?.() ?? 1.0)
      * debuffGravMult
      * raidGravMult;
    if (p.gravityZoneTimer > 0) {
      p.gravityZoneTimer -= dt;
      gravMult *= (p.gravityZoneMode === 'low' ? 0.5 : 1.55);
    }

    if (p.rocketTimer > 0) {
      p.rocketTimer -= dt;
      p.grounded = false;
      p.y += (2.8 - p.y) * Math.min(1, dt * 6);
      p.vy = 0;
    } else if (p.grappleTimer > 0) {
      p.grappleTimer -= dt;
      p.grounded = false;
      p.y += (2.4 - p.y) * Math.min(1, dt * 8);
      p.vy = 0;
    } else if (p.riverLogTimer > 0) {
      p.riverLogTimer -= dt;
      p.grounded = true;
      p.y += (0.55 - p.y) * Math.min(1, dt * 10);
      p.vy = 0;
    } else if (isFlyingFlight) {
      p.grounded = false;
      p.y += p.vy * dt;
      if (p.y > 2.6) {
        p.y = 2.6;
        if (p.vy > 0) p.vy = 0;
      } else if (p.y < -1.35) {
        p.y = -1.35;
        if (p.vy < 0) p.vy = 0;
      }
    } else if (!p.grounded) {
      p.vy -= 35.0 * gravMult * dt;
      // Planar breve consome estamina rapidamente e possui limite de sustentação por salto (impede voar segurando a tecla)
      if (jumpHeld && p.vy < -2.6 && (p.stamina ?? 0) > 4 && (p.glideHoldTimer ?? 0.65) > 0) {
        p.stamina = Math.max(0, (p.stamina ?? 0) - 62 * (p.airStaminaCostMult || 1) * dt);
        p.glideHoldTimer = Math.max(0, (p.glideHoldTimer ?? 0.65) - dt);
        p._staminaRegenDelay = 0.55;
        p.vy = Math.max(p.vy, -10.5);
      }
      p.y += p.vy * dt;
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.grounded = true;
        p.glideHoldTimer = 0.65;
        p.extraJumps = p.id === 'compsognathus' ? 1 : 0;
        p.airJumpsUsed = 0;
        p.resonanceWindow = 0.45;
        p.animator.triggerLandSquash();
        this.sfx.land();
        const landFx = getActivePreset(p.key).landingEffect;
        if (landFx === 'sparks') {
          this.particles.emitExplosion(p.x, (p.baseY || 0) + 0.14, p.z, '#ff9a24', 10, false);
        } else if (landFx === 'shockwave') {
          this.particles.emitExplosion(p.x, (p.baseY || 0) + 0.14, p.z, '#ffd447', 12, true);
        } else {
          this.particles.emitDust(p.x, (p.baseY || 0) + 0.12, p.z, 7, '#f2c57c', 2.5);
        }
      }
    }

    // Acrobacia no ar após rampa
    if (p.flipTimer > 0) {
      p.flipTimer -= dt;
      p.model.rig.rotation.x = -(p.flipTimer / 0.65) * Math.PI * 2;
    } else {
      p.model.rig.rotation.x = 0;
    }

    // Temporizadores de buffs, estamina e recarga combinada
    if (p._lowStamToastCooldown > 0) p._lowStamToastCooldown = Math.max(0, p._lowStamToastCooldown - dt);
    if (p._staminaRegenDelay > 0) p._staminaRegenDelay = Math.max(0, p._staminaRegenDelay - dt);
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.abilityCooldown > 0) p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
    if (p.abilityDuration > 0) p.abilityDuration = Math.max(0, p.abilityDuration - dt);
    p.abilityCharge = this.isTestTrack
      ? 100
      : Math.min(100, (p.abilityCharge ?? 100) + dt * 10);
    const inOasis = !!this.currentOasis;
    const canRegenFlying = isFlyingFlight && !jumpHeld && p.y <= 0.6;
    const canRegenStam = (p._staminaRegenDelay || 0) <= 0 && (p.grounded || curHabitat === 'aquatic' || canRegenFlying);
    const baseStamRegen = isFlyingFlight && (duckHeld || p.y < -0.25) ? 16.5 : (isFlyingFlight ? 11.5 : 8.5);
    const gillsStamMult = p._gillsUnderwaterBoost ? 1.15 : 1.0;
    const stamRegen = inOasis ? 28 : (canRegenStam ? baseStamRegen * (p.mutationMods?.stamRegenMult || 1) * gillsStamMult : 0);
    p.stamina = Math.min(100, (p.stamina ?? 100) + stamRegen * dt);
    if (p.resonanceWindow > 0) p.resonanceWindow = Math.max(0, p.resonanceWindow - dt);
    if (p.ramTimer > 0) p.ramTimer = Math.max(0, p.ramTimer - dt);
    if (p.turboTimer > 0) p.turboTimer = Math.max(0, p.turboTimer - dt);
    if (p.magnetTimer > 0) p.magnetTimer = Math.max(0, p.magnetTimer - dt);
    if (p.minecartTimer > 0) p.minecartTimer = Math.max(0, p.minecartTimer - dt);
    if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt);
    if (p.attackCooldown > 0) p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    if (p.pvpHitInvuln > 0) p.pvpHitInvuln = Math.max(0, p.pvpHitInvuln - dt);
    if (p.gasMaskTimer > 0) p.gasMaskTimer = Math.max(0, p.gasMaskTimer - dt);
    p.backpack.hasGasMask = p.gasMaskTimer > 0;
    if (p.diveTimer > 0) p.diveTimer = Math.max(0, p.diveTimer - dt);
    if (p.mountedTimer > 0) p.mountedTimer = Math.max(0, p.mountedTimer - dt);
    if (p.armorSlowTimer > 0) p.armorSlowTimer = Math.max(0, p.armorSlowTimer - dt);
    StatusSystem.tick(p, dt);
    if (p.furyTimer > 0) {
      p.furyTimer = Math.max(0, p.furyTimer - dt);
      p.giantScale = 1.52;
    } else if (this.activeChaosRule?.id === 'giant') {
      p.giantScale = 1.45;
    } else {
      p.giantScale = (1 + this.evolutionTier * 0.06) * (p.cardScaleMult || 1);
    }

    // Rastro personalizado nos pés
    if (p.grounded) {
      p.dustTimer -= dt * (this.speed / 18);
      if (p.dustTimer <= 0) {
        p.dustTimer = 0.13;
        const custom = getActivePreset(p.key);
        const trailColor = (inWater || curHabitat === 'aquatic')
          ? '#67e8f9'
          : (custom.trail === 'fire' ? '#ff5e1a'
            : custom.trail === 'stars' ? '#ffd447'
            : custom.trail === 'rainbow' ? ['#ff4757', '#ffa502', '#2ed573', '#1e90ff'][Math.floor(Math.random() * 4)]
            : '#e8bc79');
        this.particles.emitDust(p.x, (p.baseY || 0) + 0.08 - (p.diveDepth || 0) * 2.6, p.z + 0.35, 1, trailColor, 0.9);
      }
    }

    const diveSink = (p.inSubmerged ? 0.2 : (p.diveDepth || 0) * 2.75);
    p.model.root.position.set(p.x, (p.baseY || 0) + p.y - diveSink, p.z);
    if (p.model.nameTag) {
      p.model.nameTag.visible = !p.dead;
      if (p.model.nameTag.material) p.model.nameTag.material.opacity = p.dead ? 0 : 0.95;
    }
    p.animator.update(dt, {
      speed: this.speed,
      grounded: p.grounded,
      vy: p.vy,
      ducking: p.ducking,
      sliding: p.sliding,
      swimming: inWater,
      locomotion: curHabitat,
      diveDepth: p.inSubmerged ? 1 : (p.diveDepth || 0),
      forceLand: curHabitat === 'land',
      dead: p.dead,
      invulnActive: p.invulnTimer > 0 && !p.dead,
      furyActive: p.furyTimer > 0,
      dashing: Boolean(p.sliding || p.ramTimer > 0 || p.turboTimer > 0),
      giantScale: p.giantScale,
      laneLean
    });
  }

  _applyGuestSnapshot(snap) {
    if (!snap || !this.multiplayerSession) return;
    if (typeof snap.score === 'number') this.score = snap.score;
    if (typeof snap.distance === 'number') this.distance = snap.distance;
    if (typeof snap.speed === 'number') this.speed = snap.speed;
    if (snap.elimTimer !== undefined) this.multiplayerSession.elimTimer = snap.elimTimer;
    if (snap.suddenDeath !== undefined) this.multiplayerSession.suddenDeath = !!snap.suddenDeath;
    if (snap.mpMode) this.multiplayerSession.mpMode = snap.mpMode;
    if (snap.modeId && snap.modeId !== this.modeId) this.modeId = snap.modeId;
    if (typeof snap.dangerTier === 'number' && snap.dangerTier !== this._lastHudDangerTier) {
      this._lastHudDangerTier = snap.dangerTier;
      this.ui.hud.setDangerTier?.({ tier: snap.dangerTier });
    }
    if (snap.trackMode && snap.trackMode !== this.multiplayerSession.trackMode) {
      this.multiplayerSession.trackMode = snap.trackMode;
      this._applyGhostModeVisuals();
    }

    const nextBiomeId = snap.biomeId || snap.biome;
    if (nextBiomeId && nextBiomeId !== this.currentBiome?.id) {
      const targetBiome = getBiomeById(nextBiomeId);
      if (targetBiome) {
        this.currentBiome = targetBiome;
        this.world.applyTheme(targetBiome.theme);
        this.spawner.setBiome(targetBiome.id);
        this._applyBiomePlayersState(targetBiome);
        this.ui.hud.showBanner(`🌀 PORTAL! Entrando em: ${targetBiome.name}`, '#00f5d4', 3.0);
      }
    }

    if (Array.isArray(snap.obstacles)) {
      this.spawner.syncFromHostObstacles(snap.obstacles);
    }
    if (snap.boss !== undefined) {
      this.ui.hud.setBossHud?.(snap.boss);
    }

    if (Array.isArray(snap.players)) {
      for (let i = 0; i < snap.players.length; i++) {
        const sp = snap.players[i];
        const target = this.players.find((p) => p.peerId && p.peerId === sp.peerId) || this.players[i];
        if (!target) continue;
        target.hp = sp.lives ?? target.hp;
        target.maxHp = sp.maxLives ?? target.maxHp;
        target.shields = sp.shields ?? target.shields;
        target.fury = sp.fury ?? target.fury;
        target.furyTimer = sp.furyTimer ?? target.furyTimer;
        target.abilityCooldown = sp.abilityCd ?? target.abilityCooldown;
        target.attackCooldown = sp.attackCd ?? target.attackCooldown;
        target.attackMaxCooldown = sp.attackMaxCd ?? target.attackMaxCooldown;
        target.oxygen = sp.oxygen ?? target.oxygen;
        target.inWater = sp.inWater ?? target.inWater;
        target.inSubmerged = sp.inSubmerged ?? target.inSubmerged;
        target.diveTarget = sp.diveTarget ?? target.diveTarget;
        target.diveDepth = sp.diveDepth ?? target.diveDepth;
        target.trackOffsetX = sp.trackOffsetX ?? target.trackOffsetX ?? 0;
        target.reviveWindowTimer = sp.reviveWindowTimer ?? target.reviveWindowTimer ?? 0;
        target.reviveCount = sp.reviveCount ?? target.reviveCount ?? 0;
        target.reviveCooldown = sp.reviveCooldown ?? target.reviveCooldown ?? 0;
        target.rank = sp.rank ?? target.rank;
        target.pvpHits = sp.pvpHits ?? target.pvpHits;
        target.dead = !!sp.dead;
        target.score = sp.score ?? target.score;
        target.giantScale = sp.giantScale ?? target.giantScale;
        if (Array.isArray(sp.backpack)) {
          target.backpack.slots = [...sp.backpack];
        }
        target._netTarget = {
          x: typeof sp.x === 'number' ? sp.x : target.x,
          y: typeof sp.y === 'number' ? sp.y : target.y,
          vy: sp.vy || 0,
          lane: sp.lane ?? target.lane,
          ducking: !!sp.ducking,
          sliding: !!sp.sliding
        };
      }
    }
  }

  _updateMultiplayerGuest(dt) {
    this.runTime += dt;
    this.net.sendInputState({
      left: this.input.isActionDown('p1', 'left', true) || this.input.wasActionJustPressed('p1', 'left', true),
      right: this.input.isActionDown('p1', 'right', true) || this.input.wasActionJustPressed('p1', 'right', true),
      jump: this.input.isActionDown('p1', 'jump', true) || this.input.wasActionJustPressed('p1', 'jump', true),
      duck: this.input.isActionDown('p1', 'duck', true),
      ability: this.input.isActionDown('p1', 'ability', false) || this.input.wasActionJustPressed('p1', 'ability', false),
      attack: this.input.isActionDown('p1', 'attack', false) || this.input.wasActionJustPressed('p1', 'attack', false),
      bullet: this.input.isActionDown('p1', 'bullet', false),
      item: this.input.isKeyDown('KeyE') || this.input.wasKeyJustPressed('KeyE') || this.input.wasActionJustPressed('p1', 'item', false),
      fury: this.input.isKeyDown('KeyF') || this.input.wasKeyJustPressed('KeyF')
    });

    for (const p of this.players) {
      const nt = p._netTarget;
      if (nt) {
        p.x += (nt.x - p.x) * Math.min(1, dt * 18);
        p.y += (nt.y - p.y) * Math.min(1, dt * 18);
        p.vy = nt.vy;
        p.lane = nt.lane;
        p.ducking = nt.ducking;
        p.sliding = nt.sliding;
        p.grounded = p.y <= 0.08;
      }
      p.model.root.position.set(p.x, p.y, p.z);
      p.animator.update(dt, {
        speed: this.speed,
        grounded: p.grounded,
        vy: p.vy,
        ducking: p.ducking,
        sliding: p.sliding,
        swimming: this.currentBiome.waterTrack,
        dead: p.dead,
        giantScale: p.giantScale,
        laneLean: 0
      });
    }

    this.world.update(dt, this.speed);
    this.dayNight.update(dt, this.currentBiome.theme);
    this.weather.update(dt, true);
    this.spawner.remoteSyncMode = true;
    this.spawner.update(dt, this.speed, this.score, this.players);
    if (this.multiplayerSession.trackMode === 'parallel') {
      this.world.syncParallelObstacleProxies(
        this.players.map((pl) => pl.trackOffsetX || 0),
        this.spawner.getActiveObstacles()
      );
    }
    this.particles.update(dt, this.speed);
    this.narrator.update(dt);

    const myDino = this.players.find((p) => p.peerId === this.net.peerId) || this.players[0];
    if (myDino) {
      const isSub = Boolean(this.currentBiome?.submerged || (myDino.inWater && (myDino.diveDepth || 0) > 0.25));
      this.world.setSubmergedVisuals(isSub, !!this.currentBiome?.submerged);
    }
    if (myDino) {
      this.ui.hud.updatePlayStatus(
        myDino,
        Save.data.eggs,
        this.currentBiome.name,
        Math.ceil((this.score + 1) / 1000) * 1000,
        this.combo,
        this.score,
        {
          companionStatus: this.companions?.getHudStatus?.() || null,
          radialCooldown: this.radialCooldown || 0,
        }
      );
      const modeTag = this.multiplayerSession.mpMode === 'duel'
        ? 'DUELO PvP'
        : (this.multiplayerSession.elimination ? 'ELIMINAÇÃO' : 'CORRIDA');
      const sdTag = this.multiplayerSession.suddenDeath ? ' • 🔥 MORTE SÚBITA!' : '';
      this.ui.hud.setMpRankHud(
        `🏁 #${myDino.rank || 1}/${this.players.length} • ${Math.floor(myDino.score || 0)} pts (${modeTag})${sdTag}`,
        myDino.rank === 1 ? '#fde047' : '#93c5fd'
      );
    }
    this.ui.hud.updateScore(Math.max(this.hiScore, this.score), this.score, this.speed / Math.max(1, this.baseSpeed));
    this.music.update(dt, this.speed, myDino && myDino.hp <= 1 ? 1 : 0);
    const camPlayers = (this.multiplayerSession.trackMode === 'parallel' || this.multiplayerSession.trackMode === 'ghost') && myDino && !myDino.dead
      ? [myDino]
      : (myDino && !myDino.dead ? [myDino] : this.players.filter((x) => !x.dead));
    const camLead = camPlayers[0] || this.players[0];
    this.cameraRig.update(
      dt,
      camPlayers.length > 0 ? camPlayers : this.players,
      this.speed,
      Save.data.settings.accessibility.reduceShake,
      this.photoMode,
      this.spectatorMode,
      this._buildCameraEnvOpts(camLead)
    );
    this.tvHud.updatePlayers(this.players, this.multiplayerSession.elimTimer, this.spectatorMode);
  }

  _flushStartBanners() {
    if (this._pendingStartBanners?.length) {
      const first = this._pendingStartBanners.shift();
      this.ui.hud.showBanner(first.text, first.color, first.dur);
      this._pendingStartBanners.length = 0;
    }
    const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (this.state === 'playing' && !this.headlessBot && !this.isTestTrack && !this.tutorialState?.active) {
      this._triggerFirstUseSpotlight('spotlight_controls', {
        icon: isCoarse ? '📱' : '⌨️',
        title: isCoarse ? 'Controles no Celular' : 'Controles de Corrida',
        desc: isCoarse
          ? 'Deslize o dedo na tela (⬅️ ➡️ faixas • ⬆️ pular • ⬇️ abaixar/mergulhar) e use os botões grandes no canto inferior direito para ⚡ Habilidade, ⚔️ Ataque, 🔥 Fúria e 🔄 Troca!'
          : 'Mova com [A/D] ou [⬅️ ➡️], pule com [W/⬆️] e deslize/mergulhe com [S/⬇️]. Use [Espaço] Habilidade, [Q] Ataque, [F] Fúria e [E] Mochila!',
        selector: isCoarse ? '#touch-controls' : '#hud-group-combat',
        accent: '#58d63a'
      });
    }
  }

  _updatePredatorIntro(dt) {
    const pred = this.events.predators;
    if (!pred || pred.state !== 'intro') return false;

    // Pausa corrida, velocidade, pontuação, obstáculos e eventos durante a apresentação inicial estilo Subway Surfers
    this.speed = 0;
    this.cameraRig.setPredatorFocus(null);

    for (const p of this.players) {
      if (!p.dead) {
        const isFlyIntro = p.habitatMode === 'flying' && !p.inSubmerged;
        p.vy = 0;
        p.y = 0;
        p.grounded = !isFlyIntro;
        p.sliding = false;
        p.model.root.position.set(p.x, p.baseY || 0, p.z);
        p.animator.update(dt, { speed: 0, grounded: !isFlyIntro, vy: 0, ducking: false });
      }
    }

    const p0 = this.players[0];
    if (p0) {
      this.ui.hud.updatePlayStatus(
        p0,
        Save.data.eggs,
        this.currentBiome.name,
        Math.ceil((this.score + 1) / 1000) * 1000,
        this.combo,
        this.score
      );
      this.ui.hud.updateScore(Math.max(this.hiScore, this.score), this.score, 0);
    }

    const camPlayers = this.players.filter((x) => !x.dead);
    const introCamOpts = this._buildCameraEnvOpts(p0 || camPlayers[0]);
    this.cameraRig.update(
      dt,
      camPlayers.length > 0 ? camPlayers : this.players,
      this.baseSpeed,
      Save.data.settings.accessibility.reduceShake,
      this.photoMode,
      this.spectatorMode,
      introCamOpts
    );

    const chasePos = this.camera.position.clone();
    const chaseLook = this.cameraRig.currentLook.clone();
    const px = p0 ? p0.x : 0;
    const py = p0 ? (p0.baseY || 0) : 0;

    const stillIntro = pred.updateIntro(dt, this.players, this._eventContext());
    if (stillIntro && pred.state === 'intro') {
      const shot = pred.currentShot;
      const smooth = shot ? (shot.blendToChase || 0) : 0;
      const subtlePan = Math.sin((pred.introElapsed || 0) * 1.15) * 0.32;
      const introPos = shot?.pos
        ? shot.pos.clone()
        : new THREE.Vector3(px - 2.65 + subtlePan, py + 4.15, 11.4);
      const introLook = shot?.look
        ? shot.look.clone()
        : new THREE.Vector3(px + 0.2, py + 1.35, -3.5);

      this.camera.position.lerpVectors(introPos, chasePos, smooth);
      introLook.lerp(chaseLook, smooth);
      this.camera.lookAt(introLook);
      this._lastIntroLook = introLook.clone();
    }
    return stillIntro;
  }

  _updatePlaying(dt) {
    const perfMsg = this.perf.recordFrame(dt, this);
    if (perfMsg) this.ui.hud.showBanner(perfMsg, '#38bdf8', 3.4);

    if (this.multiplayerSession?.active && !this.multiplayerSession.isHost) {
      this._updateMultiplayerGuest(dt);
      return;
    }

    if (this.events.predators?.state === 'intro') {
      this._updatePredatorIntro(dt);
      return;
    }

    if (this.radialWheelOpen) {
      const camPlayers = this.players.filter((x) => !x.dead);
      const radOpts = this._buildCameraEnvOpts(camPlayers[0] || this.players[0]);
      this.cameraRig.update(
        dt,
        camPlayers.length > 0 ? camPlayers : this.players,
        0,
        Save.data.settings.accessibility.reduceShake,
        this.photoMode,
        this.spectatorMode,
        radOpts
      );
      return;
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      const camPlayers = this.players.filter((x) => !x.dead);
      const hitOpts = this._buildCameraEnvOpts(camPlayers[0] || this.players[0]);
      this.cameraRig.update(
        dt,
        camPlayers.length > 0 ? camPlayers : this.players,
        this.speed,
        Save.data.settings.accessibility.reduceShake,
        this.photoMode,
        this.spectatorMode,
        hitOpts
      );
      return;
    }

    // Bullet-Time / Foco com Estamina (ShiftLeft) — libera aos 1.200 pts no modo progressivo
    const bulletHeld = this.input.isActionDown('p1', 'bullet', false);
    const p0 = this.players[0];
    const p0StamOpen = !p0 || p0._unlockAll || Save.data.settings?.progressiveUnlocks === false || this.score >= 1200;
    let timeScale = 1.0;
    if (bulletHeld && p0StamOpen && p0 && (p0.stamina ?? 0) > 2) {
      timeScale = 0.42;
      p0.stamina = Math.max(0, (p0.stamina ?? 0) - dt * 52);
      p0._staminaRegenDelay = 0.55;
    }
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      timeScale = Math.min(timeScale, 0.55);
    }

    const worldDt = dt * timeScale;
    this.runTime += dt;
    if (this.currentOasis > 0) this.currentOasis = Math.max(0, this.currentOasis - dt);

    // Velocidade progressiva + bônus de turbo/slide + dificuldade adaptativa + Danger Tier (§3)
    const baseDiff = this.difficultyMgr.getConfig();
    const dangerTierInfo = this._computeDangerTier(this.score);
    this._currentDangerTier = dangerTierInfo;
    if (dangerTierInfo.tier !== this._lastHudDangerTier) {
      this._lastHudDangerTier = dangerTierInfo.tier;
      this.ui.hud.setDangerTier?.(dangerTierInfo);
      if (dangerTierInfo.tier >= 1 && this.runTime > 5 && this.modeId !== 'free_roam') {
        this.ui.hud.showFloatText(`⚠️ PERIGO NV.${dangerTierInfo.tier}!`, '#f97316');
      }
    }
    this.spawner.setDangerTier?.(dangerTierInfo);
    this.events.setDangerTier?.(dangerTierInfo);

    if ((this.firstRunGentleTimer || 0) > 0) {
      this.firstRunGentleTimer = Math.max(0, this.firstRunGentleTimer - dt);
    }
    const gentleDensityMult = (this.firstRunGentleTimer || 0) > 0 ? 0.55 : 1.0;
    const dangerDensityMult = (1 + (dangerTierInfo.densityBonus || 0)) * gentleDensityMult;
    let adaptiveMult = 1.0;
    if (this.difficultyMgr.adaptive && p0 && this.modeId !== 'competition') {
      if (p0.hp <= 1 && p0.maxHp > 1) {
        adaptiveMult = 0.88;
        this.spawner.setDensity(baseDiff.density * 0.8 * dangerDensityMult);
      } else if (this.combo >= 4 && p0.hp >= p0.maxHp) {
        adaptiveMult = 1.12;
        this.spawner.setDensity(baseDiff.density * 1.18 * dangerDensityMult);
      } else {
        this.spawner.setDensity(baseDiff.density * dangerDensityMult);
      }
    } else {
      this.spawner.setDensity(baseDiff.density * dangerDensityMult);
    }

    // Soft-cap nos multiplicadores de velocidade para evitar aceleração insana com buffs empilhados
    const debuffSpeedMult = Number.isFinite(p0?._debuffFx?.speedMult)
      ? Math.max(0.55, Math.min(1.35, p0._debuffFx.speedMult))
      : 1;
    const raidSpeedMult = this.raidState?.activeAffix?.speedMult || 1;
    const freeRoamMult = this.modeId === 'free_roam' ? (this.freeRoamState?.speedScale || 1) : 1;
    const dangerSpeedMult = 1 + Math.min(0.45, dangerTierInfo.speedBonus || 0);
    let speedMult = adaptiveMult
      * (p0 ? StatusSystem.getSpeedMultiplier(p0) : 1)
      * (p0?.speedBonus || 1)
      * debuffSpeedMult
      * raidSpeedMult
      * dangerSpeedMult
      * freeRoamMult;
    if (p0?.inWater && p0?.mutationMods?.waterSpeedMult) {
      speedMult *= p0.mutationMods.waterSpeedMult;
    }
    if (p0?._gillsUnderwaterBoost) {
      speedMult *= 1.15;
    }
    if (p0?.id === 'scary_raptor' && (this.combo || 1) >= 5) {
      speedMult *= 1.2;
    }
    const hasBoost = Boolean(p0?.turboTimer > 0 || p0?.rocketTimer > 0 || p0?.minecartTimer > 0);
    if (hasBoost) speedMult *= 1.24;
    if (p0?.sliding) speedMult *= 1.07;
    if (this.activeChaosRule?.id === 'turbo_frenzy') speedMult *= 1.18;
    if (this.currentBiome.speedMod) speedMult *= (1 + (this.currentBiome.speedMod - 1) * 0.55);

    // Morte Súbita Competitiva (>= 60s em Multiplayer)
    if (this.multiplayerSession?.active) {
      if (this.runTime >= 60 && !this.multiplayerSession.suddenDeath) {
        this.multiplayerSession.suddenDeath = true;
        this.sfx.roar('trex');
        this.ui.hud.showBanner('🔥 MORTE SÚBITA (60s+)! Velocidade +22% e Obstáculos Intensos!', '#ff4757', 4.0);
      }
      if (this.multiplayerSession.suddenDeath) {
        speedMult *= 1.22;
        this.spawner.setDensity(baseDiff.density * 1.35);
      }
    }

    if (speedMult > 1.32) {
      speedMult = 1.32 + Math.min(0.14, (speedMult - 1.32) * 0.35);
    }

    // Curva de velocidade calibrada por Tempo (62%) + Score amortecido (38%), com aquecimento 0-18s
    const timeSec = Math.max(0, this.runTime || 0);
    const warmupFactor = Math.min(1, timeSec / 18);
    const timeRamp = Math.log1p(timeSec / 26) * 5.2 + Math.min(12.5, timeSec * 0.055);
    const scoreDamped = Math.log1p(Math.max(0, this.score) / 1400) * 3.4 + Math.min(9.5, this.score * (this.speedAccel * 0.28));
    const curveDelta = (timeRamp * 0.62 + scoreDamped * 0.38) * (0.25 + 0.75 * warmupFactor);
    const wavePhase = (timeSec % 32) / 32;
    const waveRelief = wavePhase < 0.14 ? 0.92 : (0.98 + Math.sin(wavePhase * Math.PI) * 0.05);
    const bossRelief = this.events.bosses.activeBoss ? 0.94 : 1.0;
    const rawSpeed = Math.min(this.maxSpeed, this.baseSpeed * (0.92 + 0.08 * warmupFactor) + curveDelta) * waveRelief * bossRelief * speedMult;
    const hardSpeedCeiling = this.maxSpeed * (hasBoost ? 1.18 : 1.06);
    const targetSpeed = Math.max(this.baseSpeed * 0.65, Math.min(hardSpeedCeiling, rawSpeed));
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 3.5);
    this.distance += this.speed * worldDt;
    const perfectMult = Save.data.perfectMode ? 2.2 : 1;
    const scoreGain = this.speed * worldDt * 0.55 * (p0?.scoreCardMult || 1) * (p0?.scoreMultBonus || 1) * perfectMult;
    this.score += scoreGain;

    // Desbloqueios Progressivos dentro da corrida (menos sobrecarga nos primeiros segundos!)
    if (
      p0 &&
      !p0._unlockAll &&
      !this.isTestTrack &&
      !this.tutorialState?.active &&
      !this.headlessBot &&
      Save.data.settings?.progressiveUnlocks !== false
    ) {
      const stages = [
        [600, 'abil', '⚡', 'Habilidade Especial [Espaço] Liberada!', 'Aperte [Espaço] (ou ⚡) para ativar o poder único do seu dino!', '#bar-ability', '#38bdf8'],
        [1200, 'stam', '🏃', 'Estamina, Pulo Duplo & Foco [Shift]!', 'Agora você pode pular no ar (gasta estamina) e segurar [Shift] para desacelerar o tempo!', '#bar-bullet', '#34d399'],
        [1800, 'atk', '⚔️', 'Ataque Rápido [Q] Liberado!', 'Aperte [Q] perto de cactos quebráveis, troncos e chefes para golpear!', '#btn-attack-melee', '#f97316'],
        [2800, 'fury', '🔥', 'Modo Fúria [F] Liberado!', 'Encha a barra coletando ovos e pressione [F] para crescer invencível!', '#btn-fury-melee', '#fbbf24']
      ];
      for (const [req, sid, icon, title, desc, selector, accent] of stages) {
        if (this.score >= req && !this._progressiveNotified.has(sid)) {
          this._progressiveNotified.add(sid);
          this.sfx.powerup?.();
          this.ui.hud.showBanner(`${icon} ${title}`, accent, 2.8);
          this._triggerFirstUseSpotlight(`prog_${sid}`, { icon, title, desc, selector, accent });
          break;
        }
      }
    }

    // Terra Oca temporária
    if (this.hollowEarthState?.active) {
      this.hollowEarthState.timer -= worldDt;
      if (this.hollowEarthState.timer <= 0) {
        this.exitHollowEarth();
      }
    }

    // Modo Aleatório / Portais dinâmicos a cada ~1050 pts
    if (this.randomPortalMode && !this.hollowEarthState?.active && !this.shopDetour?.active && !this.events.bosses?.activeBoss) {
      this._portalBiomeAccum = (this._portalBiomeAccum || 0) + scoreGain;
      if (this._portalBiomeAccum >= 1050) {
        this._portalBiomeAccum = 0;
        this.triggerRandomPortalTransition();
      }
    }

    // 4ª Pista Lateral da Lojinha a cada 30.000 pts (entra e sai pelo mesmo lado)
    if (
      !this.isTestTrack &&
      !this.tutorialState?.active &&
      !this.multiplayerSession?.active &&
      !this.shopDetour?.active &&
      !this.events.bosses?.activeBoss &&
      this.score >= this.nextShopMilestone &&
      p0?.habitat !== 'flying'
    ) {
      const side = Math.random() < 0.5 ? 'right' : 'left';
      this.world.setShopLane(side);
      this.spawner.spawnShopGate(side, -110);
      this.shopDetour = { active: true, side, phase: 'entering', timer: 9.0, visited: false };
      this.sfx.portal?.();
      this.ui.hud.showBanner(
        `🛒 LOJINHA NA 4ª PISTA (${side === 'right' ? 'DIREITA' : 'ESQUERDA'})! Desvie para a lateral para entrar!`,
        '#34d399',
        3.8
      );
    }

    if (this.shopDetour?.active) {
      this.shopDetour.timer -= worldDt;
      if (this.shopDetour.timer <= 0) {
        if (this.shopDetour.phase === 'entering') {
          this.shopDetour.phase = 'exiting';
          this.shopDetour.timer = 4.5;
        } else if (this.shopDetour.phase === 'exiting') {
          for (const pl of this.players) {
            if (pl.inShopLane) {
              pl.lane = this.shopDetour.side === 'right' ? 2 : 0;
              pl.inShopLane = null;
            }
          }
          this.world.setShopLane(null);
          this.shopDetour = { active: false, side: 'right', phase: 'none', timer: 0, visited: false };
          this.nextShopMilestone += 30000;
          this.ui.hud.showFloatText('🛣️ Voltando à pista principal!', '#93c5fd');
        }
      }
    }
    for (const p of this.players) {
      if (!p.dead) {
        const pStepDist = this.speed * worldDt * (p.speedBonus || 1) * (p.turboTimer > 0 ? 1.12 : 1);
        p.distance = (p.distance || 0) + pStepDist;
        p.score = (p.score || 0) + this.speed * worldDt * 0.55 * (p.scoreCardMult || 1) * (p.scoreMultBonus || 1) * perfectMult;
      }
    }

    if (this.multiplayerSession?.active && this.players.length > 1) {
      const ranked = [...this.players].sort((a, b) => {
        if (a.dead !== b.dead) return a.dead ? 1 : -1;
        return (b.score || 0) - (a.score || 0);
      });
      ranked.forEach((pl, idx) => { pl.rank = idx + 1; });
      const top = ranked.find((pl) => !pl.dead);
      if (top) {
        const prev = this.multiplayerSession.prevLeaderPeerId;
        if (this.runTime > 3 && prev && prev !== top.peerId) {
          top.score = (top.score || 0) + 30;
          this.ui.hud.showFloatText(`⚡ ULTRAPASSAGEM! ${top.name} #1 (+30)`, '#fde047');
        }
        this.multiplayerSession.prevLeaderPeerId = top.peerId;
      }
    }

    if (this.tutorialState) {
      this._updateTutorial(dt);
    }

    // Cadeia de ovos e combo decaindo suavemente
    if (this.eggChainTimer > 0) {
      this.eggChainTimer -= dt;
      if (this.eggChainTimer <= 0) this.eggChain = 0;
    }
    if (this.comboDecayTimer > 0) {
      this.comboDecayTimer -= dt;
      if (this.comboDecayTimer <= 0) this.combo = 1;
    }
    if (this.decoyTimer > 0) this.decoyTimer -= dt;

    // Transição de bioma por portal a cada ~1000 pontos avançando a partir do bioma atual (ou Modo História)
    if (this.sequenceBiomes && !this.randomPortalMode && !this.hollowEarthState?.active && this.modeId !== 'story' && this.startBiomeId !== 'random_portal') {
      const seqStep = Math.floor(this.score / 1000);
      if (seqStep > (this._lastSeqBiomeStep || 0)) {
        this._lastSeqBiomeStep = seqStep;
        const allPureAqua = this.players.length > 0 && this.players.every((pl) => this._isPureAquaticPlayer(pl));
        const seqList = allPureAqua ? BIOMES.filter((b) => isAquaticBiome(b)) : BIOMES;
        const curIdx = Math.max(0, seqList.findIndex((b) => b.id === this.currentBiome?.id));
        const targetBiome = seqList[(curIdx + 1) % Math.max(1, seqList.length)];
        if (targetBiome && targetBiome.id !== this.currentBiome.id) {
          this.currentBiome = targetBiome;
          this.world.applyTheme(targetBiome.theme, false);
          this.spawner.setBiome(targetBiome.id);
          this._applyBiomePlayersState(targetBiome);
          this.ui.hud.showBanner(`🌀 PORTAL! Entrando em: ${targetBiome.name}`, '#00f5d4', 3.5);
          this._discoverCurrentBiomeFossil();
          if (targetBiome.id === 'jurassic_river' && isModeRanked(this.modeId)) Save.unlockAchievement('river_king');
        }
      }
    }

    // Modo História: avança capítulos
    if (this.modeId === 'story') {
      const ch = STORY_CHAPTERS[this.storyChapterIdx];
      if (ch && this.score >= ch.targetScore) {
        this.storyChapterIdx++;
        if (this.storyChapterIdx >= STORY_CHAPTERS.length) {
          this.sfx.victory();
          this._finishRun('CAMPANHA CONCLUÍDA! VITÓRIA!');
          return;
        }
        const nextCh = STORY_CHAPTERS[this.storyChapterIdx];
        this.currentBiome = getBiomeById(nextCh.biome);
        this.world.applyTheme(this.currentBiome.theme, false);
        this.spawner.setBiome(this.currentBiome.id);
        this._syncEnvironmentHabitat(p0);
        this._discoverCurrentBiomeFossil();
        this.ui.hud.showBanner(`📖 ${nextCh.title}: ${nextCh.dialogue}`, '#ffd447', 4.5);
      }
    }

    // Marcos progressivos de Cartas (1000, 2500, 4800, 8000...) e Evolução Visual
    const nextCardTarget = getCardMilestone(this.nextCardIdx);
    if (
      !this.isTestTrack &&
      this.events.predators?.state !== 'intro' &&
      this.score >= nextCardTarget
    ) {
      const milestone = nextCardTarget;
      this.nextCardIdx++;
      if (this.nextCardIdx % 2 === 0 && this.evolutionTier < 2) {
        this.evolutionTier++;
        this.sfx.evolution();
        this.ui.hud.showBanner('✨ EVOLUÇÃO VISUAL! Seu dino cresceu e ganhou espinhos!', '#ffd447', 3.2);
      }
      if (this.multiplayerSession?.active) {
        // Em Multiplayer LAN/Online, envia oferta pessoal ao celular sem pausar os outros jogadores!
        const rarityColors = { comum: '#94a3b8', rara: '#38bdf8', épica: '#c084fc', lendária: '#ffd447', maldição: '#ff4757' };
        for (const pl of this.players) {
          if (pl.dead || pl.isBot) continue;
          const choices = drawThreeCards(this.difficultyMgr.getConfig().allowCurses);
          const remoteTargetId = (Array.isArray(pl.controllerPeerIds) && pl.controllerPeerIds[0])
            || (pl.peerId && pl.peerId !== this.net.peerId ? pl.peerId : null);
          if (remoteTargetId) {
            this.net.broadcastCardOffer(remoteTargetId, choices.map((c) => ({
              id: c.id, name: c.name, desc: c.desc, rarity: c.rarity, rarityColor: rarityColors[c.rarity] || '#ffd447'
            })));
          } else {
            // Host / Bot recebe carta automática se sem pausa
            choices[0]?.apply(pl, this);
          }
        }
        this.ui.hud.showBanner(`🃏 MARCO ${milestone}! Escolham cartas nos celulares!`, '#ffd447', 3.2);
      } else {
        this.state = 'card_pick';
        this.music.setPlaying(false);
        this.ui.cardModal.open(milestone, this.difficultyMgr.getConfig().allowCurses);
        return;
      }
    }

    // Campanha mapa-múndi: marca vitória de nó ao atingir pontuação alvo
    if (this.activeCampaignNode && this.score >= this.activeCampaignNode.targetScore && !Save.data.campaign.completedNodes.includes(this.activeCampaignNode.id)) {
      Save.data.campaign.completedNodes.push(this.activeCampaignNode.id);
      Save.addEggs(this.activeCampaignNode.reward || 20);
      Save.save();
      this.sfx.victory();
      this.ui.hud.showBanner(`🗺️ ROTA CONCLUÍDA: ${this.activeCampaignNode.title}! +${this.activeCampaignNode.reward || 20} 🥚!`, '#58d63a', 4);
    }

    // Perseguição por estrelas de Procurado (#119)
    if ((p0?.wantedStars || 0) >= 2 && !this.isTestTrack) {
      this.wantedSpawnTimer -= worldDt;
      if (this.wantedSpawnTimer <= 0) {
        this.wantedSpawnTimer = Math.max(4, 11 - p0.wantedStars);
        this.events.triggerById('primitive_hunters', this._eventContext(), true);
      }
    }

    // Modo Eliminação Multiplayer (30s): elimina o último colocado quando o tempo zera
    if (this.multiplayerSession?.active && this.multiplayerSession.elimination) {
      const alive = this.players.filter((x) => !x.dead);
      if (alive.length > 1) {
        this.multiplayerSession.elimTimer -= dt;
        if (this.multiplayerSession.elimTimer <= 0) {
          this.multiplayerSession.elimTimer = 30;
          const lastPlace = [...alive].sort((a, b) => (a.score || 0) - (b.score || 0))[0];
          if (lastPlace) {
            lastPlace.hp = 0;
            lastPlace.shields = 0;
            lastPlace.dead = true;
            this.ui.hud.showBanner(`⏳ ELIMINAÇÃO! ${lastPlace.name} caiu em último!`, '#ff4757', 3.0);
            if ((lastPlace.peerId === this.net.peerId || lastPlace.index === 0) && this.players.some((pl) => !pl.dead)) {
              this.spectatorMode = true;
              this.spectatorFreeOffset.set(0, 0, 0);
              this.tvHud.setVisible(true);
            }
            this._checkAllPlayersDead();
          }
        }
      } else if (alive.length === 1 && this.players.length > 1) {
        this._finishRun(`🏆 CAMPEÃO DA ELIMINAÇÃO: ${alive[0].name}!`);
        return;
      }
    }

    // Fogueira checkpoint e Atalho secreto eventuais (bem espaçados)
    if (Math.random() < worldDt * 0.008 && this.score > 360) this.spawner.spawnCampfire();
    if (Math.random() < worldDt * 0.007 && this.score > 460) this.spawner.spawnShortcutPortal();

    // Regras especiais de modos
    if (this.modeId === 'shared_controls') {
      this.sharedSwapTimer -= dt;
      if (this.sharedSwapTimer <= 0) {
        this.sharedSwapTimer = 60;
        this.sharedFlipped = !this.sharedFlipped;
        this.ui.hud.setSharedRolesHint(
          this.sharedFlipped
            ? '🔄 RODÍZIO! B move faixas (Setas) | A pula/abaixa (W/S/Espaço)'
            : '👥 A move faixas (A/D) | B pula/abaixa/habilidade (↑/↓/Enter)'
        );
      }
    }

    if (this.modeId === 'chaos') {
      this.chaosTimer -= dt;
      if (this.chaosTimer <= 0) {
        this.chaosTimer = 25;
        this.activeChaosRule = CHAOS_RULES[Math.floor(Math.random() * CHAOS_RULES.length)];
        this.ui.hud.showBanner(`🎲 MODO CAOS: ${this.activeChaosRule.label} (${this.activeChaosRule.desc})`, '#f72585', 3.5);
      }
    }

    if (this.modeId === 'relay' && this.players.length === 2) {
      this.relayTimer -= dt;
      if (this.relayTimer <= 0) {
        this.relayTimer = 16;
        this.relayActiveIdx = 1 - this.relayActiveIdx;
        this.ui.hud.showBanner(`🏃 REVEZAMENTO! Agora corre Jogador ${this.relayActiveIdx + 1}!`, '#58d63a', 2.8);
      }
    }

    if (this.modeId === 'wave_survival') {
      this.waveTimer -= worldDt;
      if (this.waveTimer <= 0) {
        this.waveIndex++;
        this.waveTimer = 18;
        this.addScore(150 * this.waveIndex);
        this.sfx.evolution();
        this.ui.hud.showBanner(`🌊 ONDA ${this.waveIndex}! +${150 * this.waveIndex} BÔNUS DE ONDA!`, '#38bdf8', 3.2);
        const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, 2);
        const waterWave = this.spawner._isWaterTrack();
        const isAbyssWave = this.currentBiome?.id === 'abyss_submerged';
        const isFlyWave = !waterWave && p0?.habitatMode === 'flying' && !isAbyssWave;
        for (const ln of lanes) {
          const lx = waterWave ? this.spawner._getLaneX(ln) : LANE_X[ln];
          const wKind = waterWave
            ? (isAbyssWave ? (this.waveIndex % 2 === 0 ? 'angler_hazard' : 'coral_reef') : (this.waveIndex % 2 === 0 ? 'whirlpool_vortex' : 'shark_fin'))
            : (isFlyWave ? 'bird' : (this.waveIndex % 2 === 0 ? 'scorpion' : 'cactus_tall'));
          const spawned = this.spawner._acquire(wKind, lx, isFlyWave ? (this.waveIndex % 2 === 0 ? 1.35 : -0.45) : 0, -64);
          if (isFlyWave && spawned) {
            spawned.baseY = this.waveIndex % 2 === 0 ? 1.35 : -0.45;
            spawned.spawnY = this.spawner._getBaseY(spawned.baseY);
          }
        }
        if (this.waveIndex % 3 === 0 && !this.events.bosses.activeBoss) {
          this.ui.hud.showBanner(`👑 CHEFE DA ONDA ${this.waveIndex} CHEGANDO!`, '#ff2e63', 3.5);
          this.events.bosses.startBoss(this.currentBiome.bossId || 'scorpion_king');
        }
      }
    }

    // Atualiza jogadores
    for (const p of this.players) {
      this._handlePlayerInput(p, dt);
    }
    if (p0) {
      const isSub = Boolean(this.currentBiome?.submerged || (p0.inWater && (p0.diveDepth || 0) > 0.25));
      this.world.setSubmergedVisuals(isSub, !!this.currentBiome?.submerged);
    }

    // 1) Modo Raid Colossal: múltiplas barras de vida, afixos rotativos e placar DPS
    if (this.modeId === 'raid' && this.raidState?.active) {
      const rs = this.raidState;
      const bosses = this.events?.bosses;
      if (!rs.bossSpawned) {
        rs.spawnDelay -= worldDt;
        if (rs.spawnDelay <= 0 && bosses) {
          rs.bossSpawned = true;
          const bId = rs.bossId || this.currentBiome?.bossId || 'alpha_trex';
          const pScale = Math.max(1, this.players.length) + 1;
          if (typeof bosses.startBossById === 'function') {
            bosses.startBossById(bId, pScale, this.difficultyMgr.activeId);
          } else {
            bosses.startBoss(bId, pScale, this.difficultyMgr.activeId);
          }
          if (bosses.activeBoss) {
            bosses.activeBoss.name = `${bosses.activeBoss.name} [Barra ${rs.bossBarIndex}/${rs.totalBars}]`;
            this.ui.hud.setBossHud?.(bosses.activeBoss);
          }
        }
      } else if (bosses && !bosses.activeBoss) {
        if (rs.bossBarIndex < rs.totalBars) {
          rs.bossBarIndex++;
          rs.bossSpawned = false;
          rs.spawnDelay = 1.6;
          this.addScore(400 * rs.bossBarIndex);
          for (const pl of this.players) {
            if (!pl.dead) pl.shields = Math.min(4, (pl.shields || 0) + 1);
          }
          this.sfx.evolution();
          this.ui.hud.showBanner(
            `🐉 BARRA ${rs.bossBarIndex - 1}/${rs.totalBars} DESTRUÍDA! Próxima fase do Colosso chegando!`,
            '#c084fc',
            3.2
          );
        } else {
          rs.active = false;
          this.sfx.victory();
          const topDps = [...this.players].sort((a, b) => (b.raidDamage || 0) - (a.raidDamage || 0))[0];
          const dpsVal = Math.round((topDps?.raidDamage || 0) / Math.max(1, this.runTime));
          this._finishRun(`🐉 RAID COLOSSAL VENCIDA! MVP DPS: ${topDps?.name || 'Dino'} (${dpsVal} DPS)`);
          return;
        }
      }

      // Rotação de afixos a cada 22s
      rs.affixTimer -= dt;
      if (rs.affixTimer <= 0) {
        rs.affixTimer = 22;
        rs.affixIndex = (rs.affixIndex + 1) % RAID_AFFIXES.length;
        rs.activeAffix = RAID_AFFIXES[rs.affixIndex];
        this.ui.hud.showBanner(
          `🐉 NOVO AFIXO: ${rs.activeAffix.icon} ${rs.activeAffix.name} — ${rs.activeAffix.desc}`,
          '#c084fc',
          3.6
        );
      }

      // Afixo Tempestade do Vazio: telegrafa ataque em faixa
      if (rs.activeAffix?.telegraphHazards) {
        rs.hazardTimer -= worldDt;
        if (rs.hazardTimer <= 0) {
          rs.hazardTimer = 4.2;
          const tLane = Math.floor(Math.random() * 3);
          this._spawnPredatorHazard({
            type: 'raid_storm',
            lane: tLane,
            telegraphSec: 1.0,
            damage: 1,
            label: '⚡ RAIO DO VAZIO'
          });
        }
      }

      // Placar de DPS (HUD + resumo periódico)
      rs.dpsAnnounceTimer -= dt;
      if (rs.dpsAnnounceTimer <= 0) {
        rs.dpsAnnounceTimer = 7.5;
        const elapsed = Math.max(1, this.runTime);
        const dpsList = [...this.players]
          .sort((a, b) => (b.raidDamage || 0) - (a.raidDamage || 0))
          .map((pl) => ({ name: pl.name, damage: Math.floor(pl.raidDamage || 0), dps: Math.round((pl.raidDamage || 0) / elapsed) }));
        this.ui.hud.setRaidDpsHud?.({
          barIndex: rs.bossBarIndex,
          totalBars: rs.totalBars,
          affix: rs.activeAffix,
          dpsList
        });
        const summaryStr = dpsList.slice(0, 3).map((d) => `${d.name}: ${d.dps} DPS`).join(' | ');
        if (summaryStr) {
          this.ui.hud.showFloatText(`🐉 Barra ${rs.bossBarIndex}/${rs.totalBars} • ${summaryStr}`, '#c084fc');
        }
      }
    }

    // 2) Modo Boss Fight / Boss Rush (usa startBossById / startBossRush quando existirem)
    if (this.modeId === 'boss_fight' && this.bossRushState?.active) {
      const br = this.bossRushState;
      const bosses = this.events?.bosses;
      if (bosses && !bosses.activeBoss) {
        br.nextBossDelay -= worldDt;
        if (br.nextBossDelay <= 0) {
          if (br.submode === 'rush' && !br.usedNativeRush && typeof bosses.startBossRush === 'function') {
            br.usedNativeRush = true;
            bosses.startBossRush(br.queue, this.players.length, this.difficultyMgr.activeId);
          } else if (br.currentIndex < br.queue.length) {
            const nextId = br.queue[br.currentIndex];
            if (br.currentIndex > 0) {
              for (const pl of this.players) {
                if (!pl.dead) this._healPlayer(pl, 1, '💚 +1 VIDA (ENTRE CHEFES)!');
              }
            }
            if (typeof bosses.startBossById === 'function') {
              bosses.startBossById(nextId, this.players.length, this.difficultyMgr.activeId);
            } else {
              bosses.startBoss(nextId, this.players.length, this.difficultyMgr.activeId);
            }
            br.currentIndex++;
            br.nextBossDelay = 2.4;
          } else {
            br.active = false;
            this.sfx.victory();
            this._finishRun(
              br.submode === 'single'
                ? `👑 CHEFE DERROTADO! VITÓRIA NO DUELO!`
                : `👑 BOSS RUSH CONCLUÍDO (${br.queue.length} CHEFES DERROTADOS)!`
            );
            return;
          }
        }
      }
    }

    // 4) Modo Corrida (Linha de Chegada 5.000m/10.000m, checkpoints e barra 1º/2º/3º)
    if (this.modeId === 'race' && this.raceState?.active && !this.raceState.finished) {
      const rc = this.raceState;
      // Atualiza rivais IA da corrida
      if (this.raceAiRacers?.length) {
        const leadDist = this.players[0]?.distance || this.distance;
        for (const ai of this.raceAiRacers) {
          ai.burstTimer -= dt;
          if (ai.burstTimer <= 0) {
            ai.burstTimer = 3.5 + Math.random() * 4.5;
            ai.lane = Math.floor(Math.random() * 3);
          }
          const gap = leadDist - ai.distance;
          const rubber = Math.max(-0.08, Math.min(0.11, gap * 0.00055));
          ai.distance += this.speed * worldDt * (ai.pace + rubber);
          ai.x += (LANE_X[ai.lane] - ai.x) * Math.min(1, dt * 7);
          const relZ = Math.max(-18, Math.min(10, (leadDist - ai.distance) * 0.16 - 1.2));
          ai.model.root.position.set(ai.x, ai.y, relZ);
          ai.animator.update(dt, { speed: this.speed * ai.pace, grounded: true, vy: 0 });
        }
      }

      // Checkpoints a cada 1.000m
      const maxPlayerDist = Math.max(...this.players.map((pl) => pl.distance || 0), this.distance || 0);
      if (maxPlayerDist >= rc.nextCheckpoint && rc.nextCheckpoint < rc.targetDistance) {
        const cp = rc.nextCheckpoint;
        rc.nextCheckpoint += rc.checkpointStep;
        this.sfx.powerup?.();
        for (const pl of this.players) {
          if (!pl.dead) {
            pl.stamina = 100;
            pl.turboTimer = Math.max(pl.turboTimer || 0, 1.5);
          }
        }
        this.ui.hud.showBanner(`🏁 CHECKPOINT ${cp.toLocaleString('pt-BR')}m / ${rc.targetDistance.toLocaleString('pt-BR')}m! Turbo + Estamina!`, '#38bdf8', 2.6);
      }

      // Calcula posição 1º/2º/3º
      const entries = [
        ...this.players.map((pl) => ({ name: pl.name, distance: pl.distance || 0, isPlayer: true, player: pl })),
        ...(this.raceAiRacers || []).map((ai) => ({ name: ai.name, distance: ai.distance || 0, isPlayer: false }))
      ].sort((a, b) => b.distance - a.distance);

      const p0Pos = Math.max(1, entries.findIndex((e) => e.player === p0) + 1);
      const pct = Math.min(100, Math.round((maxPlayerDist / rc.targetDistance) * 100));
      this.ui.hud.setRaceHud?.({
        position: p0Pos,
        total: entries.length,
        distance: Math.floor(maxPlayerDist),
        targetDistance: rc.targetDistance,
        progressPct: pct,
        standings: entries.slice(0, 3).map((e, i) => ({ rank: i + 1, name: e.name, distance: Math.floor(e.distance) }))
      });

      const winner = entries.find((e) => e.distance >= rc.targetDistance);
      if (winner) {
        rc.finished = true;
        rc.winnerName = winner.name;
        this.sfx.victory();
        const podiumStr = entries.slice(0, 3).map((e, i) => `${i + 1}º ${e.name}`).join(' • ');
        this._finishRun(`🏁 LINHA DE CHEGADA (${rc.targetDistance.toLocaleString('pt-BR')}m)! ${podiumStr}`);
        return;
      }
    }

    // Coop: reviver parceiro caído ficando perto por 2.5s (além do reviver tático [V])
    if (this.modeId === 'coop' && this.players.length === 2) {
      const [a, b] = this.players;
      if (a.dead && !b.dead && Math.abs((a.x - (a.trackOffsetX || 0)) - (b.x - (b.trackOffsetX || 0))) < 2.2) {
        a.reviveProgress += dt;
        if (a.reviveProgress >= 2.5) {
          a.dead = false;
          a.hp = 1;
          a.shields = Math.min(4, (a.shields || 0) + 1);
          a.invulnTimer = 2.5;
          a.reviveProgress = 0;
          this.sfx.powerup?.();
          this.ui.hud.showBanner('💚 PARCEIRO REVIVIDO (+1 ESCUDO)!', '#58d63a', 2.5);
        }
      } else if (b.dead && !a.dead && Math.abs((a.x - (a.trackOffsetX || 0)) - (b.x - (b.trackOffsetX || 0))) < 2.2) {
        b.reviveProgress += dt;
        if (b.reviveProgress >= 2.5) {
          b.dead = false;
          b.hp = 1;
          b.shields = Math.min(4, (b.shields || 0) + 1);
          b.invulnTimer = 2.5;
          b.reviveProgress = 0;
          this.sfx.powerup?.();
          this.ui.hud.showBanner('💚 PARCEIRO REVIVIDO (+1 ESCUDO)!', '#58d63a', 2.5);
        }
      }
    }

    // PvP / Captura o Ovo: colisão entre jogadores na mesma faixa
    if ((this.modeId === 'pvp' || this.modeId === 'capture_egg') && this.players.length === 2) {
      const [a, b] = this.players;
      if (!a.dead && !b.dead && Math.abs(a.x - b.x) < 0.85 && Math.abs(a.y - b.y) < 0.85) {
        if (this.modeId === 'capture_egg') {
          a.holdingGoldenEgg = !a.holdingGoldenEgg;
          b.holdingGoldenEgg = !b.holdingGoldenEgg;
          b.lane = b.lane === 2 ? 0 : 2;
          this.sfx.collectEgg(true);
          this.ui.hud.showFloatText('🥚 OVO ROUBADO!', '#ffd447');
        } else {
          // Pisão ou empurrão
          if (a.y > b.y + 0.4 && a.vy < 0) {
            this._damagePlayer(b);
            a.vy = 10;
          } else if (b.y > a.y + 0.4 && b.vy < 0) {
            this._damagePlayer(a);
            b.vy = 10;
          }
        }
      }
      if (this.modeId === 'capture_egg') {
        this.captureMatchTimer -= dt;
        for (const p of this.players) {
          if (p.holdingGoldenEgg && !p.dead) p.captureEggTime += dt;
        }
        const holder = this.players.find((p) => p.holdingGoldenEgg && !p.dead) || this.players.find((p) => !p.dead);
        if (holder) holder.holdingGoldenEgg = true;
        if (this.goldenEggProp && holder) {
          this.goldenEggProp.visible = true;
          this.goldenEggProp.position.set(holder.x, holder.y + 2.55 + Math.sin(this.runTime * 5) * 0.12, holder.z);
          this.goldenEggProp.rotation.y += dt * 3;
        }
        if (this.captureMatchTimer <= 0) {
          const winnerIdx = a.captureEggTime >= b.captureEggTime ? 0 : 1;
          if (winnerIdx === 0) Save.data.rivalry.p1Wins++;
          else Save.data.rivalry.p2Wins++;
          Save.save();
          this.sfx.victory();
          this._finishRun(
            `🥚 TEMPO ESGOTADO! P${winnerIdx + 1} VENCEU (${a.captureEggTime.toFixed(1)}s × ${b.captureEggTime.toFixed(1)}s)!`
          );
          return;
        }
      }
    }

    // Grava replay / atualiza fantasma e Rival IA inteligente
    if (p0 && !p0.dead) {
      this.replay.record(dt, this.runTime, p0);
    }
    if (this.ghostModel && Save.data.ghostRuns?.frames) {
      const f = ReplayRecorder.sampleFrame(Save.data.ghostRuns.frames, this.runTime);
      if (f) this.ghostModel.root.position.set(f.x, f.y, -0.4);
    }
    if (this.rivalAi) {
      const r = this.rivalAi;
      const hazards = this.spawner.getActiveObstacles().filter(
        (o) => !o.hit && !['egg', 'powerup', 'ramp'].includes(o.kind) && o.group.position.z > -15 && o.group.position.z < 0.8
      );
      const laneBlocked = (ln) => hazards.some((o) => Math.abs(o.group.position.x - LANE_X[ln]) < 1.15);
      if (laneBlocked(r.lane)) {
        const freeLane = [0, 1, 2].find((ln) => !laneBlocked(ln));
        if (freeLane !== undefined) r.lane = freeLane;
        else if (r.y <= 0.05) r.vy = 13.0;
      } else if (Math.random() < dt * 0.35) {
        r.lane = Math.floor(Math.random() * 3);
      }

      if (r.y > 0 || r.vy !== 0) {
        r.vy -= 34 * dt;
        r.y += r.vy * dt;
        if (r.y <= 0) {
          r.y = 0;
          r.vy = 0;
        }
      }

      r.x += (LANE_X[r.lane] - r.x) * Math.min(1, dt * 8);
      r.model.root.position.set(r.x, r.y, r.z);
      r.animator.update(dt, { speed: this.speed, grounded: r.y <= 0.05, vy: r.vy });

      r.quoteTimer -= dt;
      if (r.quoteTimer <= 0 && r.pers.chatter?.length) {
        r.quoteTimer = 12;
        const msg = r.pers.chatter[Math.floor(Math.random() * r.pers.chatter.length)];
        this.ui.hud.showFloatText(`🤖 ${r.pers.name.split(' ')[0]}: "${msg}"`, '#ff4757');
      }
    }

    // Mundo, Spawner, Clima, Eventos, Habilidades e Companheiros
    this.world.update(worldDt, this.speed);
    this.dayNight.update(worldDt, this.currentBiome.theme);
    this.weather.update(worldDt, true);
    this.spawner.update(worldDt, this.speed, this.score, this.players, Boolean(this.events.isMagneticActive?.()));
    this.particles.update(worldDt, this.speed);
    this.events.update(worldDt, this.speed, this.score, this.players, this._eventContext());
    this._updatePredatorHazards(worldDt);
    this.cameraRig.setPredatorFocus(null);
    if (this.events?.bosses?.activeBoss) {
      this._hintOnce('boss_attack_q', '⚔️ Chefe à frente! Pressione Q para atacar!', '#fb923c');
    }

    this.abilities.update(worldDt, this.spawner, this.particles, () => {
      this.addScore(45 * this.combo);
    });

    this.companions.update(dt, p0, this.spawner, () => this._collectEgg(p0, false), {
      onNotify: (msg, color) => this.ui.hud.showFloatText(msg, color),
      onBreakHazard: (obs) => {
        this.particles.emitExplosion(obs.group.position.x, (obs.group.position.y || 0) + 0.7, obs.group.position.z, obs.color, 10, true);
        this.sfx.stomp?.();
        this.addScore(45 * this.combo, p0);
      }
    });

    // Cubos de impacto quicantes atingem outros inimigos
    for (let i = this.impactDebris.length - 1; i >= 0; i--) {
      const d = this.impactDebris[i];
      d.life -= dt;
      d.vy -= 18 * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      if (d.mesh.position.y < 0.25) {
        d.mesh.position.y = 0.25;
        d.vy = Math.abs(d.vy) * 0.6;
      }
      for (const obs of this.spawner.getActiveObstacles()) {
        if (obs.hit || ['egg', 'powerup', 'ramp'].includes(obs.kind)) continue;
        if (Math.hypot(obs.group.position.x - d.mesh.position.x, obs.group.position.z - d.mesh.position.z) < 1.1) {
          obs.hit = true;
          obs.pool?.release(obs);
          this.particles.emitExplosion(obs.group.position.x, 0.8, obs.group.position.z, obs.color, 10, true);
          this.addScore(50);
        }
      }
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        this.impactDebris.splice(i, 1);
      }
    }

    // Colisões principais do(s) jogador(es)
    const activeObs = this.spawner.getActiveObstacles();
    const mpTrackMode = this.multiplayerSession?.active ? (this.multiplayerSession.trackMode || 'parallel') : 'classic';
    if (mpTrackMode === 'parallel' && this.players.length > 1) {
      this.world.syncParallelObstacleProxies(
        this.players.map((pl) => pl.trackOffsetX || 0),
        activeObs
      );
    }
    const perPlayerHitTrack = this.multiplayerSession?.active && mpTrackMode !== 'classic';

    for (const p of this.players) {
      if (p.dead) continue;
      const rawBox = PhysicsCollision.getPlayerBox(p);
      const tOff = p.trackOffsetX || 0;
      const pBox = tOff !== 0
        ? { ...rawBox, minX: rawBox.minX - tOff, maxX: rawBox.maxX - tOff }
        : rawBox;

      for (const obs of activeObs) {
        if (obs.hit) continue;
        if (perPlayerHitTrack && obs._hitBy && obs._hitBy.has(p.key)) continue;

        if (PhysicsCollision.checkNearMiss(pBox, obs)) {
          obs.nearMissed = true;
          this.combo = Math.min(10, this.combo + 1);
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.comboDecayTimer = 4.5;
          p.resonanceWindow = 0.55;
          const isScary = p.id === 'scary_raptor';
          const nearMissMult = isScary ? 1.35 : 1.0;
          p.abilityCharge = Math.min(100, (p.abilityCharge ?? 100) + Math.round(18 * nearMissMult));
          p.fury = Math.min(100, p.fury + (p.spec.dinoClass === 'carnivore' ? 18 : 13) * (p.furyChargeMult || 1) * (isScary ? 1.2 : 1));
          this.addScore(Math.round(25 * this.combo * nearMissMult), p);
          this.sfx.nearMiss();
          this.narrator.say('nearMiss');
          this.ui.hud.showFloatText(
            isScary ? `👁️ OLHO DINÂMICO! x${this.combo} (+35%)` : `QUASE! x${this.combo}`,
            isScary ? '#22d3ee' : '#ffd447'
          );
        }

        if (!PhysicsCollision.checkObstacleHit(pBox, obs)) continue;
        if (perPlayerHitTrack) {
          obs._hitBy = obs._hitBy || new Set();
          obs._hitBy.add(p.key);
        }

        // Coletáveis e interativos
        if (obs.kind === 'egg') {
          obs.hit = true;
          obs.pool?.release(obs);
          this._collectEgg(p, obs.eggTier || (obs.isGold ? 5 : 1), !!obs.isMystery);
          continue;
        }

        if (obs.kind === 'oxygen_bubble') {
          obs.hit = true;
          obs.pool?.release(obs);
          p.oxygen = Math.min(100, (p.oxygen ?? 100) + 38);
          p.stamina = Math.min(100, (p.stamina ?? 100) + 12);
          this.sfx.heal?.();
          this.particles.emitExplosion(obs.group.position.x, (obs.group.position.y || 0) + 0.5, obs.group.position.z, '#38bdf8', 10, false);
          this.addScore(40 * this.combo, p);
          this.ui.hud.showFloatText('🫧 +38% OXIGÊNIO & ESTAMINA!', '#67e8f9');
          continue;
        }

        if (obs.kind === 'current_ring') {
          obs.hit = true;
          obs.pool?.release(obs);
          p.turboTimer = Math.max(p.turboTimer || 0, 2.4);
          p.invulnTimer = Math.max(p.invulnTimer || 0, 1.1);
          p.abilityCharge = Math.min(100, (p.abilityCharge ?? 100) + 25);
          p.stamina = Math.min(100, (p.stamina ?? 100) + 18);
          if (!p.isAquaticNative) p.oxygen = Math.min(100, (p.oxygen ?? 100) + 15);
          this.sfx.dash();
          this.particles.emitExplosion(obs.group.position.x, (obs.group.position.y || 0) + 0.65, obs.group.position.z, '#22d3ee', 14, false);
          this.addScore(90 * this.combo, p);
          this.ui.hud.showFloatText(`🌀 CORRENTE TURBO! +${90 * this.combo}`, '#22d3ee');
          continue;
        }

        if (obs.kind === 'whirlpool_vortex') {
          if (p.y > 1.15) continue;
          obs.hit = true;
          p.stamina = Math.max(0, (p.stamina ?? 100) - 18);
          p.oxygen = Math.max(0, (p.oxygen ?? 100) - 16);
          StatusSystem.apply(p, 'mud', 2.2, this);
          this._damagePlayer(p, 'whirlpool_vortex');
          continue;
        }

        if (obs.kind === 'powerup') {
          obs.hit = true;
          obs.pool?.release(obs);
          this._collectPowerup(p, obs);
          continue;
        }

        if (obs.kind === 'ramp') {
          obs.hit = true;
          p.vy = 18.2;
          p.grounded = false;
          p.flipTimer = 0.65;
          this.addScore(100 * this.combo);
          this.sfx.jump(true);
          this.narrator.say('greatJump');
          this.ui.hud.showFloatText('ACROBACIA! +100', '#00f5d4');
          continue;
        }

        if (obs.kind === 'campfire') {
          obs.hit = true;
          p.campfireSaved = true;
          this.sfx.powerup();
          this.ui.hud.showFloatText('🔥 CHECKPOINT SALVO!', '#ff9a24');
          continue;
        }

        if (obs.kind === 'speed_pad') {
          obs.hit = true;
          p.turboTimer = Math.max(p.turboTimer || 0, 2.6);
          p.invulnTimer = Math.max(p.invulnTimer || 0, 1.4);
          p.stamina = Math.min(100, (p.stamina ?? 100) + 18);
          this.sfx.dash();
          this.addScore(60 * this.combo, p);
          this.particles.emitExplosion(obs.group.position.x, 0.3, obs.group.position.z, '#facc15', 10, false);
          this._hintOnce('speed_pad', '⚡ Speed Pad (>>>): dá Turbo e recupera Estamina!', '#facc15');
          this.ui.hud.showFloatText('⚡ TURBO PAD +ESTAMINA!', '#facc15');
          continue;
        }

        if (obs.kind === 'trampoline') {
          obs.hit = true;
          p.vy = 21.5;
          p.grounded = false;
          p.flipTimer = 0.72;
          this.sfx.jump(true);
          this.addScore(110 * this.combo, p);
          this._hintOnce('trampoline', '🟢 Trampolim (▲): salto gigante sobre perigos!', '#4ade80');
          this.ui.hud.showFloatText('🟢 TRAMPOLIM!', '#4ade80');
          continue;
        }

        if (obs.kind === 'mud_pool') {
          obs.hit = true;
          StatusSystem.apply(p, 'mud', 3.4, this);
          this.sfx.slide();
          this._hintOnce('mud_pool', '🟤 Lama: desacelera brevemente! Pule ou use Fogo/Antídoto.', '#fbbf24');
          this.ui.hud.showFloatText('🟤 LAMA!', '#fbbf24');
          continue;
        }

        if (obs.kind === 'toxic_pool') {
          obs.hit = true;
          StatusSystem.apply(p, 'poison', 5.5, this);
          this.sfx.damage();
          this._hintOnce('toxic_pool', '☠️ Poça Tóxica: envenena! Cure com Antídoto (E) ou Fogo.', '#bef264');
          continue;
        }

        if (obs.kind === 'tar_pit') {
          obs.hit = true;
          StatusSystem.apply(p, 'mud', 3.8, this);
          p.stamina = Math.max(0, (p.stamina ?? 100) - 24);
          this.sfx.slide();
          this._hintOnce('tar_pit', '🖤 Piche Fóssil: drena estamina e reduz velocidade! Pule com [W/↑].', '#d4d4d8');
          this.ui.hud.showFloatText('🖤 PICHE! -ESTAMINA', '#d4d4d8');
          continue;
        }

        if (obs.kind === 'geyser_vent') {
          if (p.y > 1.72) continue;
          obs.hit = true;
          p.vy = Math.max(p.vy, 11.5);
          p.grounded = false;
          this._damagePlayer(p, 'geyser_vent');
          continue;
        }

        if (obs.kind === 'oasis_zone') {
          if (!obs._hitBy) obs._hitBy = new Set();
          if (obs._hitBy.has(p.key)) continue;
          obs._hitBy.add(p.key);
          if (p.statuses) {
            delete p.statuses.mud;
            delete p.statuses.poison;
          }
          p.stamina = Math.min(100, (p.stamina ?? 100) + 25);
          this.currentOasis = 3.2;
          this.spawner.oasisReliefTimer = 4.0;
          this.addScore(80 * this.combo, p);
          if (!Save.data.perfectMode) {
            this._healPlayer(p, 1, '🌴 OÁSIS +1 VIDA!');
          } else {
            this.sfx.heal();
            this.ui.hud.showFloatText('🌴 OÁSIS +ESTAMINA!', '#5eead4');
          }
          continue;
        }

        if (obs.kind === 'fragile_bridge') {
          if (p.y > 0.65) continue;
          if (!obs._hitBy) obs._hitBy = new Set();
          if (obs._hitBy.has(p.key)) continue;
          obs._hitBy.add(p.key);
          if (Math.abs(p.x - LANE_X[1]) < 0.85) {
            StatusSystem.apply(p, 'mud', 0.45, this);
            p.armorSlowTimer = Math.max(p.armorSlowTimer || 0, 0.45);
            this.sfx.slide();
            this.ui.hud.showFloatText('🪵 TÁBUA RACHADA! (-0.4s)', '#fb923c');
          } else {
            p.stamina = Math.min(100, (p.stamina ?? 100) + 10);
            const bonus = 85 * this.combo;
            this.addScore(bonus, p);
            this.sfx.powerup();
            this.ui.hud.showFloatText(`🌉 PONTE SEGURA! +${bonus}`, '#4ade80');
          }
          continue;
        }

        if (obs.kind === 'rescue_cross') {
          if (!obs._hitBy) obs._hitBy = new Set();
          if (obs._hitBy.has(p.key)) continue;
          obs._hitBy.add(p.key);
          const allowRevive = this.modeId === 'coop' || this.modeId === 'shared' || (this.multiplayerSession?.active && !this.multiplayerSession?.elimination && this.multiplayerSession?.mpMode !== 'duel');
          const fallen = allowRevive ? this.players.find((pl) => pl !== p && pl.dead) : null;
          if (fallen && !Save.data.perfectMode) {
            fallen.dead = false;
            fallen.hp = 1;
            fallen.invulnTimer = 3.0;
            fallen.reviveProgress = 0;
            fallen.y = 0;
            fallen.vy = 0;
            this.ui.hud.showBanner(`🚨 RESGATE TÁTICO! ${fallen.name || 'Aliado'} REVIVIDO!`, '#38bdf8', 2.8);
          } else if (!Save.data.perfectMode) {
            p.shields = Math.min(4, (p.shields || 0) + 1);
            this.ui.hud.showFloatText('🚨 RESGATE +1 ESCUDO & ESTAMINA!', '#38bdf8');
          } else {
            this.ui.hud.showFloatText('🚨 RESGATE +ESTAMINA!', '#38bdf8');
          }
          p.stamina = Math.min(100, (p.stamina ?? 100) + 16);
          this.sfx.powerup();
          this.addScore(75 * this.combo, p);
          continue;
        }

        if (obs.kind === 'shortcut') {
          obs.hit = true;
          obs.pool?.release(obs);
          p.invulnTimer = Math.max(p.invulnTimer, 2.5);
          this._hintOnce('shortcut', '🌀 Portais de Runas levam a outro bioma (Azul), Ovos (Dourado) ou Surpresa (Roxo)!', obs.color || '#38bdf8');
          if (obs.portalDest === 'biome' && this.modeId !== 'story') {
            const allPureAqua = this.players.length > 0 && this.players.every((pl) => this._isPureAquaticPlayer(pl));
            const poolList = allPureAqua ? BIOMES.filter((b) => isAquaticBiome(b)) : BIOMES;
            const curIdx = poolList.findIndex((b) => b.id === this.currentBiome.id);
            const nextB = poolList[(curIdx + 1) % Math.max(1, poolList.length)];
            if (nextB) {
              this.currentBiome = nextB;
              this.world.applyTheme(nextB.theme, false);
              this.spawner.setBiome(nextB.id);
              this._applyBiomePlayersState(nextB);
              this._discoverCurrentBiomeFossil();
              this.ui.hud.showBanner(`🌀 PORTAL AZUL → Entrando em: ${nextB.name}!`, '#38bdf8', 3.2);
            }
          } else if (obs.portalDest === 'mystery') {
            p.shields = Math.min(4, p.shields + 1);
            p.turboTimer = Math.max(p.turboTimer || 0, 3.0);
            this.spawnEggRain(5);
            this.ui.hud.showBanner('🌀 PORTAL ROXO → Escudo + Turbo + Ovos!', '#c084fc', 3.0);
          } else {
            this.spawnEggRain(9);
            this.ui.hud.showBanner('🌀 PORTAL DOURADO → Chuva de Ovos & Escudo!', '#ffd447', 3.0);
          }
          continue;
        }

        if (obs.kind === 'fruit') {
          obs.hit = true;
          obs.pool?.release(obs);
          p.fury = Math.min(100, (p.fury || 0) + 18 * (p.furyChargeMult || 1));
          p.stamina = Math.min(100, (p.stamina ?? 100) + 16);
          p.abilityCharge = Math.min(100, (p.abilityCharge ?? 100) + 14);
          let bonusMsg = '🍉 +ESTAMINA & FÚRIA!';
          if (p.hp < p.maxHp && Math.random() < 0.35) {
            this._healPlayer(p, 1, '🍉 +1 VIDA & FÚRIA!');
          } else if (Math.random() < 0.25) {
            p.shields = Math.min(4, p.shields + 1);
            bonusMsg = '🍉 +ESCUDO & FÚRIA!';
            this.sfx.pickupRarity('rara');
            this.ui.hud.triggerEdgeFlash('rara');
            this.ui.hud.showFloatText(bonusMsg, '#4ade80');
          } else {
            this.sfx.egg(6);
            this.ui.hud.triggerEdgeFlash('comum');
            this.ui.hud.showFloatText(bonusMsg, '#4ade80');
          }
          this.addScore(45 * this.combo, p);
          continue;
        }

        if (obs.kind === 'elemental_egg') {
          obs.hit = true;
          obs.pool?.release(obs);
          this._applyElementalEgg(p, obs.element);
          continue;
        }

        if (obs.kind === 'treasure') {
          obs.hit = true;
          obs.pool?.release(obs);
          const gold = 25 + Math.floor((Save.data.talents?.greed || 0) * 6);
          Save.addEggs(gold);
          Save.addCrystals(1);
          this.runEggs += gold;
          this.sfx.pickupRarity('épica');
          this.ui.hud.triggerEdgeFlash('épica');
          this.addScore(180 * this.combo, p);
          this.ui.hud.showBanner(`💎 BAÚ DO TESOURO! +${gold} 🥚 & +1 💎!`, '#ffd447', 2.8);
          if (p.index === 0) {
            this._triggerFirstUseSpotlight('spotlight_diamond', {
              icon: '💎',
              title: 'Para que servem os Diamantes (💎)?',
              desc: 'Use 💎 na Loja Rotativa (Atualizar por 2 💎), na Forja de Mutações (evoluir direto por 2-4 💎), no Catalisador do Gacha (3 💎 garante Épica+!) ou para Renascer 1x na corrida (2 💎)!',
              selector: '#hud-crystals',
              accent: '#38bdf8'
            });
          }
          continue;
        }

        if (obs.kind === 'grapple_point') {
          obs.hit = true;
          p.grappleTimer = 0.85;
          p.invulnTimer = Math.max(p.invulnTimer, 1.0);
          this.sfx.grapple();
          this.addScore(90 * this.combo, p);
          this._hintOnce('grapple_point', '🪢 Cipó suspenso sobrevoa buracos e obstáculos!', '#84cc16');
          this.ui.hud.showFloatText('🪝 GANCHO!', '#84cc16');
          continue;
        }

        if (obs.kind === 'gravity_zone') {
          obs.hit = true;
          p.gravityZoneMode = obs.gravMode || 'low';
          p.gravityZoneTimer = 5.5;
          this.sfx.powerup();
          this._hintOnce('gravity_zone', '🪐 Zona Gravitacional altera a altura do pulo por 5.5s!', '#818cf8');
          this.ui.hud.showFloatText(p.gravityZoneMode === 'low' ? '🪐 GRAVIDADE BAIXA!' : '⬇️ GRAVIDADE PESADA!', '#818cf8');
          continue;
        }

        if (obs.kind === 'minecart_zone') {
          obs.hit = true;
          p.minecartTimer = 4.0;
          p.invulnTimer = Math.max(p.invulnTimer, 4.0);
          this.sfx.evolution();
          this.addScore(110 * this.combo, p);
          this._hintOnce('minecart_zone', '🚋 Carrinho de Mina dá Turbo e invencibilidade por 4s!', '#cbd5e1');
          this.ui.hud.showFloatText('🚋 CARRINHO DE MINA! TURBO!', '#cbd5e1');
          continue;
        }

        if (obs.kind === 'river_log') {
          obs.hit = true;
          p.riverLogTimer = 1.6;
          this.sfx.jump(true);
          this.addScore(80 * this.combo, p);
          this._hintOnce('river_log', '🪵 Tronco no Rio evita correnteza e dá impulso!', '#fbbf24');
          this.ui.hud.showFloatText('🪵 SURF NO RIO!', '#fbbf24');
          continue;
        }

        if (obs.kind === 'shop_gate') {
          obs.hit = true;
          obs.pool?.release(obs);
          if (this.shopDetour?.active && !this.shopDetour.visited && !p.remote && !p.isBot) {
            this.shopDetour.visited = true;
            this.shopDetour.phase = 'exiting';
            this.shopDetour.timer = 5.0;
            this._eventContext().onMerchantEncounter?.();
          }
          continue;
        }

        if (obs.kind === 'bifurcation') {
          obs.hit = true;
          this._hintOnce('bifurcation', '🔀 Esquerda dá Escudo seguro • Direita dá Ovos & Pontos!', '#ffd447');
          if (p.lane === 2) {
            this.spawnEggRain(4);
            this.addScore(150, p);
            this.ui.hud.showFloatText('⚡ ROTA ARRISCADA! +OVOS!', '#f59e0b');
          } else {
            p.shields = Math.min(4, p.shields + 1);
            this.ui.hud.showFloatText('🛡️ ROTA SEGURA! +ESCUDO!', '#22c55e');
          }
          continue;
        }

        if (obs.kind === 'tall_rock' && p.y > 1.25) {
          p.vy = 14.5;
          p.grounded = false;
          this.sfx.jump(true);
          this.ui.hud.showFloatText('WALL JUMP!', '#90e0ef');
          continue;
        }

        // Fúria / Carga / Ataque Básico destroem o obstáculo! (Mergulho desvia por baixo, sem invencibilidade gratuita)
        if (p.furyTimer > 0 || p.ramTimer > 0 || (p.attackTimer > 0 && obs.breakable)) {
          obs.hit = true;
          obs.pool?.release(obs);
          this.particles.emitExplosion(obs.group.position.x, (obs.group.position.y || 0) + 0.8, obs.group.position.z, obs.color, 14, true);
          this._spawnImpactDebris(obs.group.position.x, obs.group.position.z, obs.color);
          this.sfx.stomp();
          p.wantedStars = Math.min(5, (p.wantedStars || 0) + 0.25);
          p.abilityCharge = Math.min(100, (p.abilityCharge ?? 100) + 15);
          p.stamina = Math.min(100, (p.stamina ?? 100) + 5);
          this.addScore(65 * this.combo, p);
          if (p.attackTimer > 0 && this.tutorialState?.active && this.tutorialState.step === 3) {
            this._advanceTutorialStep();
          }
          continue;
        }

        // Pisotear inimigos pequenos!
        if (PhysicsCollision.isStompHit(p, pBox, obs)) {
          obs.hit = true;
          obs.pool?.release(obs);
          p.vy = 11.5;
          this.runStomps++;
          this.combo = Math.min(10, this.combo + 1);
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.comboDecayTimer = 4.5;
          p.abilityCharge = Math.min(100, (p.abilityCharge ?? 100) + 16);
          p.stamina = Math.min(100, (p.stamina ?? 100) + 6);
          const stompBonus = p.spec.dinoClass === 'carnivore' ? 75 : 55;
          this.addScore(stompBonus * this.combo, p);
          this.sfx.stomp();
          this.narrator.say('stomp');
          this.particles.emitExplosion(obs.group.position.x, 0.5, obs.group.position.z, obs.color, 12, true);
          this.ui.hud.showFloatText(`PISÃO! +${stompBonus * this.combo}`, '#58d63a');
          continue;
        }

        // Dano normal
        obs.hit = true;
        this._damagePlayer(p, obs.kind || 'obstacle');
      }
    }

    // Atualiza HUD & Música & Câmera & Multiplayer Snapshot (~18 Hz)
    const lead = (this.multiplayerSession?.active
      ? this.players.find((x) => !x.dead && (x.peerId === this.net.peerId || (Array.isArray(x.controllerPeerIds) && x.controllerPeerIds.includes(this.net.peerId))))
      : null) || this.players.find((x) => !x.dead) || p0;
    if (lead) {
      this.world.updatePlayerFocus(lead.x, (lead.baseY || 0) + lead.y, lead.z, this.currentBiome?.theme?.edgeGlow || '#fde047');
      this.ui.hud.updatePlayStatus(
        lead,
        Save.data.eggs,
        this.currentBiome.name,
        Math.ceil((this.score + 1) / 1000) * 1000,
        this.combo,
        this.score,
        {
          companionStatus: this.companions?.getHudStatus?.() || null,
          radialCooldown: this.radialCooldown || 0,
        }
      );
      let reviveTargetNick = null;
      if (this.multiplayerSession?.active) {
        const modeTag = this.multiplayerSession.mpMode === 'duel'
          ? 'DUELO PvP'
          : (this.multiplayerSession.elimination ? 'ELIMINAÇÃO' : 'CORRIDA');
        const sdTag = this.multiplayerSession.suddenDeath ? ' • 🔥 MORTE SÚBITA!' : '';
        this.ui.hud.setMpRankHud(
          `🏁 #${lead.rank || 1}/${this.players.length} • ${Math.floor(lead.score || 0)} pts (${modeTag})${sdTag}`,
          lead.rank === 1 ? '#fde047' : '#93c5fd'
        );
        const revCfg = ContentLoader.getBalance().revive || {};
        const mpRevCfg = this.multiplayerSession.reviveConfig || {};
        const maxPerRun = mpRevCfg.maxPerRun ?? revCfg.maxPerRun ?? 2;
        const costType = mpRevCfg.costType || revCfg.costType || 'life_or_shield';
        const myPlayer = this.players.find((pl) => pl.peerId === this.net.peerId) || lead;
        const fallenAlly = this.players.find(
          (pl) => pl !== myPlayer && pl.dead && (pl.reviveWindowTimer || 0) > 0 && (pl.reviveCount || 0) < maxPerRun
        );
        const canAfford = this._canPayReviveCost(myPlayer, costType) && (myPlayer?.reviveCooldown || 0) <= 0;
        const canShowRevive = Boolean(
          this.multiplayerSession.allowRevive !== false &&
          fallenAlly &&
          myPlayer &&
          !myPlayer.dead &&
          this.players.length >= 2
        );
        if (canShowRevive && fallenAlly) {
          reviveTargetNick = fallenAlly.name || fallenAlly.spec?.name || 'Aliado';
        }
        this.ui.hud.setMpReviveHud({
          visible: canShowRevive,
          canAfford,
          cost: costType === 'shield' ? '1 🛡️' : (costType === 'life' ? '1 ❤️' : '1 🛡️/❤️'),
          allyName: reviveTargetNick || 'Aliado'
        });
      } else {
        this.ui.hud.setMpReviveHud({ visible: false });
      }
      const atkMax = lead.attackMaxCooldown || 0.65;
      const atkPct = Math.max(0, Math.min(100, 100 * (1 - Math.max(0, lead.attackCooldown || 0) / atkMax)));
      this.ui.hud.setContextualTouchState?.({
        canAttackBoss: Boolean(this.events?.bosses?.activeBoss),
        reviveTargetNick,
        canBreathe: Boolean(lead.inSubmerged || (lead.inWater && (lead.diveDepth || 0) > 0.25)),
        attackCooldownPct: atkPct,
        oxygenPct: Math.round(lead.oxygen ?? 100)
      });
    }
    // Atualiza HUD de debuffs ativos (throttled ~5Hz para manter 60 FPS sem thrash de DOM)
    this._hudDebuffAccum = (this._hudDebuffAccum || 0) + dt;
    if (lead && this._hudDebuffAccum >= 0.2) {
      this._hudDebuffAccum = 0;
      const activeDebuffs = typeof StatusSystem.getActiveDebuffs === 'function'
        ? StatusSystem.getActiveDebuffs(lead)
        : (Array.isArray(lead.debuffs) ? lead.debuffs : []);
      this.ui.hud.setActiveDebuffs?.(activeDebuffs);
      if (Number.isFinite(lead._debuffFx?.visionMult) && lead._debuffFx.visionMult < 0.99) {
        this.ui.hud.setVisionMult?.(lead._debuffFx.visionMult);
      } else {
        this.ui.hud.setVisionMult?.(1);
      }
    }

    this.ui.hud.updateScore(Math.max(this.hiScore, this.score), this.score, this.speed / this.baseSpeed);
    const dangerLevel = (this.events.bosses.activeBoss || this.events.ufo.active || (lead && lead.hp <= 1) || (this._currentDangerTier?.tier || 0) >= 3) ? 1 : 0;
    this.music.update(dt, this.speed, dangerLevel);
    this.narrator.update(dt);
    const camPlayers = this.players.filter((x) => !x.dead);
    const camMode = Save.data.settings?.mpCameraMode || 'shared';
    const useSplitCam = (camMode === 'split_h' || camMode === 'split_v') &&
      this.players.length >= 2 &&
      !this.multiplayerSession?.active &&
      !this.photoMode &&
      !this.spectatorMode;
    if (useSplitCam && this.cameraRigP2) {
      const p1 = this.players[0];
      const p2 = this.players[1];
      const p1Lead = !p1.dead ? p1 : (camPlayers[0] || p1);
      const p2Lead = !p2.dead ? p2 : (camPlayers[0] || p2);
      this.cameraRig.update(dt, [p1Lead], this.speed, Save.data.settings.accessibility.reduceShake, false, false, this._buildCameraEnvOpts(p1Lead));
      this.cameraRigP2.update(dt, [p2Lead], this.speed, Save.data.settings.accessibility.reduceShake, false, false, this._buildCameraEnvOpts(p2Lead));
    } else {
      const focusOwnCam = this.multiplayerSession?.active &&
        (mpTrackMode === 'parallel' || mpTrackMode === 'ghost') &&
        lead && !lead.dead;
      const activeCamList = focusOwnCam ? [lead] : (camPlayers.length > 0 ? camPlayers : this.players);
      this.cameraRig.update(
        dt,
        activeCamList,
        this.speed,
        Save.data.settings.accessibility.reduceShake,
        this.photoMode,
        this.spectatorMode,
        this._buildCameraEnvOpts(lead || activeCamList[0])
      );
      if (this.spectatorMode && this.state === 'playing') {
        this._updateSpectatorFreeCam(dt, activeCamList);
      }
    }
    if ((this._skipIntroGuardFrames || 0) > 0) this._skipIntroGuardFrames--;

    const hasConnectedController = this.net.isConnected && !this.ui?.controllerInstance &&
      this.net.room?.peers?.some((pr) => pr.role === 'controller');
    if (this.multiplayerSession?.active || hasConnectedController) {
      if (this.multiplayerSession?.active) {
        this.tvHud.updatePlayers(this.players, this.multiplayerSession.elimTimer, this.spectatorMode);
      }
      this._ctrlSnapAccum = (this._ctrlSnapAccum || 0) + dt;
      if (this.multiplayerSession) this.multiplayerSession.netSnapAccum = this._ctrlSnapAccum;
      const canBroadcastSnap = (this.multiplayerSession?.active ? this.multiplayerSession.isHost : this.net.isHost) && this._ctrlSnapAccum >= 0.055;
      if (canBroadcastSnap) {
        this._ctrlSnapAccum = 0;
        if (this.multiplayerSession) this.multiplayerSession.netSnapAccum = 0;
        const activeBoss = this.events?.bosses?.activeBoss;
        this.net.broadcastHostSnapshot({
          score: Math.floor(this.score),
          distance: Math.floor(this.distance),
          speed: Math.round(this.speed * 10) / 10,
          biome: this.currentBiome.id,
          biomeId: this.currentBiome.id,
          trackMode: mpTrackMode,
          mpMode: this.multiplayerSession?.mpMode || 'race',
          modeId: this.modeId,
          dangerTier: this._currentDangerTier?.tier || 0,
          raid: this.raidState?.active ? {
            barIndex: this.raidState.bossBarIndex,
            totalBars: this.raidState.totalBars,
            affixName: this.raidState.activeAffix?.name || '',
            totalDamage: Math.floor(this.raidState.totalDamage || 0)
          } : null,
          race: this.raceState?.active ? {
            targetDistance: this.raceState.targetDistance,
            nextCheckpoint: this.raceState.nextCheckpoint
          } : null,
          suddenDeath: !!this.multiplayerSession?.suddenDeath,
          elimTimer: this.multiplayerSession?.elimTimer || null,
          obstacles: this.spawner.serializeActiveObstacles(),
          boss: activeBoss ? {
            id: activeBoss.id,
            name: activeBoss.name,
            title: activeBoss.title,
            currentHp: activeBoss.currentHp,
            maxHp: activeBoss.maxHp,
            phase: activeBoss.phase,
            color: activeBoss.color
          } : null,
          players: this.players.map((pl) => ({
            peerId: pl.peerId,
            controllerPeerIds: pl.controllerPeerIds || [],
            name: pl.name,
            lane: pl.lane,
            trackOffsetX: pl.trackOffsetX || 0,
            x: Math.round(pl.x * 100) / 100,
            y: Math.round(pl.y * 100) / 100,
            vy: Math.round(pl.vy * 100) / 100,
            ducking: !!pl.ducking,
            sliding: !!pl.sliding,
            fury: Math.round(pl.fury || 0),
            furyTimer: Math.round((pl.furyTimer || 0) * 10) / 10,
            giantScale: pl.giantScale || 1,
            lives: pl.hp,
            maxLives: pl.maxHp,
            shields: pl.shields,
            stamina: Math.round(pl.stamina ?? 100),
            oxygen: Math.round(pl.oxygen ?? 100),
            inWater: !!pl.inWater,
            inSubmerged: !!pl.inSubmerged,
            diveTarget: pl.diveTarget ?? 0,
            diveDepth: Math.round((pl.diveDepth ?? 0) * 100) / 100,
            reviveWindowTimer: Math.round((pl.reviveWindowTimer ?? 0) * 10) / 10,
            reviveCount: pl.reviveCount || 0,
            reviveCooldown: Math.round((pl.reviveCooldown ?? 0) * 10) / 10,
            habitatMode: pl.habitatMode || pl.habitat || 'land',
            canTransmute: Array.isArray(pl.availableHabitats) && pl.availableHabitats.length > 1,
            abilityCharge: Math.round(pl.abilityCharge ?? 100),
            attackCd: Math.round((pl.attackCooldown || 0) * 100) / 100,
            attackMaxCd: pl.attackMaxCooldown || 0.65,
            rank: pl.rank || 1,
            pvpHits: pl.pvpHits || 0,
            abilityCd: pl.abilityCooldown,
            dead: pl.dead,
            backpack: pl.backpack.slots,
            score: Math.floor(pl.score || 0)
          }))
        });
      }
    }
  }

  _hintOnce(key, msg, color = '#38bdf8') {
    const savedSeen = Save.data.seenElements || [];
    if (this.seenHints.has(key) || savedSeen.includes(key)) return;
    this.seenHints.add(key);
    if (!Save.data.seenElements) Save.data.seenElements = [];
    Save.data.seenElements.push(key);
    Save.save();
    this.ui.hud.showBanner(msg, color, 2.8);
  }

  _dismissSpotlight() {
    if (!this.spotlightActive) return;
    if (this._spotlightQueue && this._spotlightQueue.length > 0) {
      const nextCfg = this._spotlightQueue.shift();
      this.ui.hud.showSpotlight({
        ...nextCfg,
        onDismiss: () => this._dismissSpotlight()
      });
      this.lastTime = performance.now();
      return;
    }
    this.spotlightActive = false;
    this.ui.hud.hideSpotlight(false);
    if (this.state === 'playing') this.music.setPlaying(true);
    this.lastTime = performance.now();
  }

  _triggerFirstUseSpotlight(key, cfg) {
    if (this.state !== 'playing') return;
    if (this.multiplayerSession?.active || this.tutorialState?.active || this.isTestTrack || this.headlessBot) return;
    const savedSeen = Save.data.seenElements || [];
    if (this.seenHints.has(key) || savedSeen.includes(key)) return;
    this.seenHints.add(key);
    if (!Save.data.seenElements) Save.data.seenElements = [];
    Save.data.seenElements.push(key);
    Save.save();

    if (Save.data.settings?.discoveryPopups !== false) {
      if (this.spotlightActive) {
        this._spotlightQueue = this._spotlightQueue || [];
        this._spotlightQueue.push(cfg);
        return;
      }
      this.spotlightActive = true;
      this.music.setPlaying(false);
      this.ui.hud.showSpotlight({
        ...cfg,
        onDismiss: () => this._dismissSpotlight()
      });
      return;
    }

    // Dica não-bloqueante em banner no topo quando popups com desfoque estiverem desativados
    this.spotlightActive = false;
    this.ui.hud.showBanner(`${cfg.icon || '💡'} ${cfg.title}: ${cfg.desc}`, cfg.accent || '#38bdf8', 3.6);
  }

  _applyElementalEgg(p, element) {
    const prev = p.element;
    const alchRadius = 24 * (1 + (Save.data.talents?.alchemy || 0) * 0.2);
    if (this.tutorialState?.active && this.tutorialState.step === 5 && p.index === 0) {
      this.tutorialState.elemCount = (this.tutorialState.elemCount || 0) + 1;
    }
    if (p.index === 0) {
      this._triggerFirstUseSpotlight('spotlight_alchemy', {
        icon: '✨',
        title: 'Esferas Elementais & Alquimia',
        desc: 'Pegue 2 elementos diferentes (ex: 🔥 + ❄️ ou ⚡ + ❄️) para desencadear combos que limpam a pista!',
        selector: '#hud-hp-text',
        accent: '#a855f7'
      });
    }

    const combo = StatusSystem.resolveElementCombo(prev, element, !!this.currentBiome.waterTrack);
    if (combo) {
      p.element = combo.keepElement || null;
      this.sfx.reaction();
      if (combo.clearRadius) this._clearNearbyObstacles(p.x, p.z, Math.max(alchRadius, combo.clearRadius), false);
      if (combo.bonusFury) p.fury = Math.min(100, (p.fury || 0) + combo.bonusFury);
      if (combo.bonusShield) p.shields = Math.min(4, p.shields + combo.bonusShield);
      if (combo.bonusTurbo) p.turboTimer = Math.max(p.turboTimer || 0, combo.bonusTurbo);
      this.addScore(combo.bonusScore * this.combo, p);
      this.ui.hud.showBanner(combo.title, combo.color, 3.0);
      if (this.tutorialState?.active && this.tutorialState.step === 5) this._advanceTutorialStep();
      return;
    }

    p.element = element;
    StatusSystem.apply(p, element, 16, this);
    this.sfx.pickupRarity('rara');
    this.ui.hud.triggerEdgeFlash('rara');
    this.addScore(65 * this.combo, p);
    const icons = { fire: '🔥', ice: '❄️', lightning: '⚡', poison: '☠️' };
    this._hintOnce('elemental_egg', '✨ Esferas Elementais dão bônus e criam combos entre si (ex: 🔥+❄️)!', '#38bdf8');
    this.ui.hud.showFloatText(`${icons[element] || '✨'} ELEMENTO ${element.toUpperCase()}!`, '#38bdf8');
    if (this.tutorialState?.active && this.tutorialState.step === 5 && (this.tutorialState.elemCount || 0) >= 2) {
      this._advanceTutorialStep();
    }
  }

  _collectEgg(p, tierOrGold = 1, isMystery = false) {
    const baseTier = isMystery
      ? (4 + Math.floor(Math.random() * 5))
      : (tierOrGold === true ? 5 : (tierOrGold === false ? 1 : (Number(tierOrGold) || 1)));
    this.eggChain = Math.min(20, this.eggChain + 1);
    this.eggChainTimer = 3.2;
    const perfectEggMult = Save.data.perfectMode ? 1.5 : 1;
    const val = Math.round(baseTier * (p.eggValueMult || 1) * perfectEggMult);
    this.runEggs += val;
    Save.addEggs(val);
    this.addScore((15 + this.eggChain * 5 + baseTier * 2) * this.combo, p);
    p.fury = Math.min(100, p.fury + (isMystery ? 24 : (baseTier >= 25 ? 20 : (baseTier >= 5 ? 12 : 6))) * (p.furyChargeMult || 1));
    if (p.index === 0 && p.fury >= 100 && (p.furyTimer || 0) <= 0) {
      const isCoarseFury = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
      this._triggerFirstUseSpotlight('spotlight_fury_ready', {
        icon: '🔥',
        title: 'Modo Fúria 100% Pronto!',
        desc: 'Sua barra de Fúria encheu! Pressione [F] no teclado ou toque no botão 🔥 Fúria no celular para ficar gigante e invencível!',
        selector: isCoarseFury ? '#touch-fury-btn' : '#btn-fury-melee',
        accent: '#fbbf24'
      });
    }
    p.stamina = Math.min(100, (p.stamina ?? 100) + (isMystery ? 18 : (baseTier >= 25 ? 20 : (baseTier >= 5 ? 8 : 3))));
    p.abilityCharge = Math.min(100, (p.abilityCharge ?? 100) + (isMystery ? 22 : (baseTier >= 25 ? 24 : (baseTier >= 5 ? 12 : 4))));
    this.sfx.egg(this.eggChain);
    if (isMystery) {
      let bonusText = '+FÚRIA & ESTAMINA!';
      if ((p.shields || 0) < 3) {
        p.shields = Math.min(3, (p.shields || 0) + 1);
        bonusText = '+1 🛡️ ESCUDO!';
      } else {
        p.magnetTimer = Math.max(p.magnetTimer || 0, 5.0);
        bonusText = '🧲 ÍMÃ 5s!';
      }
      this.sfx.pickupRarity('épica');
      this.ui.hud.triggerEdgeFlash('épica');
      this.ui.hud.showFloatText(`❓ OVO SURPRESA +${val} 🥚 (${bonusText})`, '#c084fc');
    } else if (baseTier >= 25) {
      this.sfx.pickupRarity('lendária');
      this.ui.hud.triggerEdgeFlash('lendária');
      this.ui.hud.showFloatText(`💎 OVO COLOSSAL +${val}!`, '#e879f9');
    } else if (baseTier >= 5) {
      this.sfx.pickupRarity('rara');
      this.ui.hud.triggerEdgeFlash('rara');
      this.ui.hud.showFloatText(`🥚 NINHO DOURADO +${val}!`, '#ffd447');
    }
  }

  _collectPowerup(p, obs) {
    const isMajor = ['shield', 'rocket', 'bomb', 'turbo'].includes(obs.powerId);
    const rarity = isMajor ? 'épica' : 'rara';
    if (obs.powerId === 'heal') {
      this._healPlayer(p, 1, '💚 +1 VIDA!');
      return;
    }
    this.sfx.pickupRarity(rarity);
    this.ui.hud.triggerEdgeFlash(rarity);
    if (obs.isBackpack) {
      const added = p.backpack.add(obs.powerId);
      this.ui.hud.showFloatText(added ? 'ITEM NA MOCHILA!' : 'MOCHILA CHEIA!', '#f59e0b');
      if (p.index === 0) {
        const isCoarseItem = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
        this._triggerFirstUseSpotlight('spotlight_item', {
          icon: '🎒',
          title: 'Item Guardado na Mochila!',
          desc: 'Pressione [E] no teclado ou toque em 🎒 Item no celular para usar o item ativo no momento certo!',
          selector: isCoarseItem ? '#touch-item-btn' : '#hud-backpack',
          accent: '#f59e0b'
        });
      }
      return;
    }

    switch (obs.powerId) {
      case 'shield': p.shields = Math.min(4, p.shields + 1); break;
      case 'magnet': p.magnetTimer = 10; break;
      case 'turbo': p.turboTimer = 5; p.invulnTimer = Math.max(p.invulnTimer, 5); break;
      case 'clock': this.slowMoTimer = 5.5; break;
      case 'rocket': p.rocketTimer = 4.2; p.invulnTimer = Math.max(p.invulnTimer, 4.5); break;
      case 'bomb': this._clearNearbyObstacles(p.x, p.z, 55, false); break;
      case 'mega_stamina':
        p.stamina = 100;
        p.abilityCharge = Math.min(100, (p.abilityCharge ?? 100) + 25);
        p.turboTimer = Math.max(p.turboTimer || 0, 2.2);
        this.ui.hud.showFloatText('🔋 MEGA ESTAMINA + TURBO!', '#a3e635');
        return;
      default: break;
    }
    this.ui.hud.showFloatText(`⚡ ${obs.powerId.toUpperCase()}!`, '#38bdf8');
  }

  _updateGlobalKeys() {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
      return;
    }

    if (this.spotlightActive) {
      if (this.input.wasKeyJustPressed('Space') || this.input.wasKeyJustPressed('Enter') || this.input.wasKeyJustPressed('Escape')) {
        this._dismissSpotlight();
      }
      return;
    }

    if (this.ui?.hud?.glossaryOverlay && !this.ui.hud.glossaryOverlay.classList.contains('hidden')) {
      if (this.input.wasKeyJustPressed('Escape') || this.input.wasKeyJustPressed('Enter') || this.input.wasKeyJustPressed('Space')) {
        this.ui.hud.toggleGlossary(false);
      }
      return;
    }

    if (this.ui.hud.isMerchantOpen?.()) {
      if (this.input.wasKeyJustPressed('Escape')) {
        this.closeMerchant(true);
      } else if (this.input.wasKeyJustPressed('Enter') && performance.now() >= (this._merchantGuardUntil || 0)) {
        this.buyFromMerchant();
      }
      return;
    }

    if (this.state === 'playing' && this.events.predators?.state === 'intro') {
      if (
        (this.events.predators.introElapsed || 0) >= 1.0 &&
        (this.input.wasKeyJustPressed('Space') ||
          this.input.wasKeyJustPressed('Enter') ||
          this.input.wasKeyJustPressed('KeyW') ||
          this.input.wasKeyJustPressed('ArrowUp'))
      ) {
        this._skipIntroGuardFrames = 2;
        this.events.predators.skipIntro(this._eventContext());
        return;
      }
    }

    if (this.pendingRestart) {
      if (this.input.wasKeyJustPressed('Enter') || this.input.wasKeyJustPressed('NumpadEnter')) {
        this.confirmRestart();
      } else if (this.input.wasKeyJustPressed('Escape') || this.input.wasKeyJustPressed('KeyR')) {
        this.cancelRestart();
      }
      return;
    }

    if (this.radialWheelOpen) {
      if (this.input.wasKeyJustPressed('Escape') || this.input.wasKeyJustPressed('KeyX')) {
        this.toggleRadialWheel(false);
      } else if (this.input.wasKeyJustPressed('Digit1') || this.input.wasKeyJustPressed('KeyW') || this.input.wasKeyJustPressed('ArrowUp')) {
        this.executeRadialAction('habitat');
      } else if (this.input.wasKeyJustPressed('Digit2') || this.input.wasKeyJustPressed('KeyD') || this.input.wasKeyJustPressed('ArrowRight')) {
        this.executeRadialAction('backpack');
      } else if (this.input.wasKeyJustPressed('Digit3') || this.input.wasKeyJustPressed('KeyS') || this.input.wasKeyJustPressed('ArrowDown')) {
        this.executeRadialAction('companion');
      } else if (this.input.wasKeyJustPressed('Digit4') || this.input.wasKeyJustPressed('KeyA') || this.input.wasKeyJustPressed('ArrowLeft')) {
        this.executeRadialAction('focus');
      }
      return;
    }

    if (import.meta.env.DEV && this.input.wasKeyJustPressed('F9')) {
      if (!Save.data.devMode) {
        Save.data.devMode = true;
        Save.save();
        this.ui.hud.setDebugButtonVisible(true);
      }
      this.ui.openSection('debug');
      return;
    }
    if (this.input.wasKeyJustPressed('KeyC')) {
      this.cycleCamera();
    }
    if (this.input.wasKeyJustPressed('KeyP') || this.input.wasKeyJustPressed('Escape')) {
      if (this.state === 'playing' || this.state === 'paused') {
        this.togglePause();
      } else if (this.state === 'replay') {
        if (this.lastGameOverArgs) {
          this.state = 'gameover';
          if (this.players[0]) this.players[0].dead = true;
          this.ui.hud.showGameOver(this.lastGameOverArgs);
        } else {
          this.openMainMenu();
        }
      }
    }
    if (this.input.wasKeyJustPressed('KeyR')) {
      if (this.state === 'playing' || this.state === 'paused') {
        this.requestRestart();
      } else if (this.state === 'gameover' || this.state === 'replay') {
        this.restartRun();
      }
    }
    // Roda Tática [X], Emotes rápidos (1, 2, 3) & Reviver Aliado Multiplayer (V)
    if (this.state === 'playing') {
      if (this.input.wasKeyJustPressed('KeyX')) {
        this.toggleRadialWheel();
        return;
      }
      if (this.modeId === 'free_roam') {
        if (this.input.wasKeyJustPressed('Digit1')) {
          this.setFreeRoamSpeed((this.freeRoamState?.speedScale || 1) - 0.2);
        }
        if (this.input.wasKeyJustPressed('Digit2')) {
          this.setFreeRoamSpeed((this.freeRoamState?.speedScale || 1) + 0.2);
        }
        if (this.input.wasKeyJustPressed('Digit3')) {
          const curIdx = Math.max(0, BIOMES.findIndex((b) => b.id === this.currentBiome?.id));
          const nextB = BIOMES[(curIdx + 1) % BIOMES.length];
          if (nextB) this.setFreeRoamBiome(nextB.id);
        }
        if (this.input.wasKeyJustPressed('Digit4')) {
          this.spawnFreeRoamEntity('wave');
        }
        if (this.input.wasKeyJustPressed('Digit5')) {
          this.spawnFreeRoamEntity('boss');
        }
      } else {
        if (this.input.wasKeyJustPressed('Digit1')) this.ui.hud.showFloatText('🎉 VAMOOO!', '#58d63a');
        if (this.input.wasKeyJustPressed('Digit2')) this.ui.hud.showFloatText('😜 HEHE!', '#ff9a24');
        if (this.input.wasKeyJustPressed('Digit3')) this.ui.hud.showFloatText('🆘 SOCORRO!', '#38bdf8');
      }
      if (this.input.wasKeyJustPressed('KeyV') && (this.multiplayerSession?.active || this.players.length >= 2)) {
        if (!this.reviveFallenAlly(0) && this.players.length >= 2) {
          this.reviveFallenAlly(1);
        }
      }
      if (this.input.wasKeyJustPressed('KeyB')) {
        this.breatheOrSurface(0);
      }
    }
  }

  _loop(now) {
    this._rafId = requestAnimationFrame(this._loop.bind(this));
    const fpsCap = Number(Save.data.settings?.fpsCap || 0);
    if (fpsCap > 0 && this._lastFrameRenderAt) {
      const minInterval = 1000 / fpsCap - 1.5;
      if (now - this._lastFrameRenderAt < minInterval) {
        return;
      }
    }
    this._lastFrameRenderAt = now;

    const dt = Math.min(0.05, Math.max(0.0001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.input.beginFrame();
    if (!this.activeFreeMode) {
      this._updateGlobalKeys();
    }
    this.ui.hud.tickTimers(dt);
    if (this.activeFreeMode) {
      if (this.state === 'playing') {
        this.activeFreeMode.update?.(dt);
      }
      this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
      return;
    }
    if (this.state === 'playing' && !this.radialWheelOpen && !this.spotlightActive && this.radialCooldown > 0) {
      this.radialCooldown = Math.max(0, this.radialCooldown - dt);
    }

    if (this.spotlightActive) {
      this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
      return;
    }

    if (this.ui?.controllerInstance) {
      this.input.endFrame();
      return;
    }

    let consumedPlayingInput = false;
    if (this.state === 'menu') {
      this.world.update(dt, 14);
      this.dayNight.update(dt, this.currentBiome.theme);
      this.particles.update(dt, 14);
      const aquaBiomeMenu = Boolean(this.currentBiome?.submerged);
      for (const p of this.players) {
        const curMode = p.habitatMode || p.habitat || 'land';
        p.animator.update(dt, {
          speed: 14,
          grounded: curMode !== 'flying' && curMode !== 'aquatic',
          swimming: curMode === 'aquatic' || aquaBiomeMenu,
          locomotion: curMode,
          diveDepth: p.diveDepth || 0,
          forceLand: curMode === 'land'
        });
      }
      const pMenu = this.players[0];
      if (pMenu) {
        this.world.updatePlayerFocus(pMenu.x, (pMenu.baseY || 0) + pMenu.y, pMenu.z, this.currentBiome?.theme?.edgeGlow || '#fde047');
      }
      const envMenu = this._buildCameraEnvOpts(pMenu);
      const focusX = pMenu ? pMenu.x - 1.4 : -1.4;
      const focusY = (pMenu?.baseY || 0) + 0.2;
      this.cameraRig.update(dt, { x: focusX, y: focusY, z: 0, diveDepth: pMenu?.diveDepth || 0 }, 14, true, false, false, envMenu);
    } else if (this.state === 'playing') {
      const FIXED_STEP = 1 / 60;
      this._fixedAcc = Math.min(0.1, (this._fixedAcc || 0) + dt);
      let steps = 0;
      while (this._fixedAcc >= FIXED_STEP && steps < 4) {
        this._updatePlaying(FIXED_STEP);
        if (steps === 0) {
          this.input.endFrame();
          consumedPlayingInput = true;
        }
        this._fixedAcc -= FIXED_STEP;
        steps++;
      }
      if (steps === 0) consumedPlayingInput = true; // preserva justPressed até o próximo passo fixo
    } else if (this.state === 'gameover') {
      for (const p of this.players) {
        if (p.dead) p.animator.update(dt, { dead: true });
      }
      this.particles.update(dt, 4);
      this.cameraRig.update(dt, this.players[0]?.model.root.position, this.baseSpeed, false, false, false, this._buildCameraEnvOpts(this.players[0]));
    } else if (this.state === 'replay') {
      this.replayTime += dt;
      const maxReplayTime = Math.max(0.6, (this.replay.frames.length - 1) * 0.05);
      const frame = ReplayRecorder.sampleFrame(this.replay.frames, this.replayTime);
      const p0 = this.players[0];
      if (frame && p0 && this.replayTime <= maxReplayTime) {
        p0.dead = false;
        p0.model.root.position.set(frame.x, frame.y, 0);
        p0.animator.update(dt, { speed: 22, grounded: frame.y <= 0.05, ducking: Boolean(frame.duck) });
        this.world.update(dt, 22);
        this.particles.update(dt, 22);
        this.cameraRig.update(dt, p0.model.root.position, 22, true, false, false, this._buildCameraEnvOpts(p0));
      } else {
        if (this.lastPodiumSummary) {
          this.state = 'gameover';
          this.ui.showPodium(this.lastPodiumSummary, {
            onReplay: () => this.startReplayPlayback(),
            onAgain: () => this.restartRun(),
            onMenu: () => this.openMainMenu()
          });
        } else if (this.lastGameOverArgs) {
          this.state = 'gameover';
          if (p0) p0.dead = true;
          this.ui.hud.showGameOver(this.lastGameOverArgs);
        } else {
          this.openMainMenu();
        }
      }
    } else if (this.photoMode) {
      this.cameraRig.update(dt, this.players[0]?.model.root.position, this.speed, true, true, false, this._buildCameraEnvOpts(this.players[0]));
    }

    const camMode = Save.data.settings?.mpCameraMode || 'shared';
    const useSplitRender = this.state === 'playing' &&
      (camMode === 'split_h' || camMode === 'split_v') &&
      this.players.length >= 2 &&
      !this.multiplayerSession?.active &&
      !this.photoMode &&
      !this.spectatorMode &&
      this.cameraP2;

    if (useSplitRender) {
      const vp = OrientationManager.getViewportSize();
      const w = Math.max(1, vp.width);
      const h = Math.max(1, vp.height);
      this._wasSplitRender = true;
      this.renderer.setScissorTest(true);
      if (camMode === 'split_h') {
        const hw = Math.floor(w / 2);
        const asp = Math.max(0.2, hw / h);
        if (Math.abs(this.camera.aspect - asp) > 0.01) {
          this.camera.aspect = asp;
          this.camera.updateProjectionMatrix();
        }
        if (Math.abs(this.cameraP2.aspect - asp) > 0.01) {
          this.cameraP2.aspect = asp;
          this.cameraP2.updateProjectionMatrix();
        }
        this.renderer.setViewport(0, 0, hw, h);
        this.renderer.setScissor(0, 0, hw, h);
        this.renderer.render(this.scene, this.camera);

        this.renderer.setViewport(hw, 0, w - hw, h);
        this.renderer.setScissor(hw, 0, w - hw, h);
        this.renderer.render(this.scene, this.cameraP2);
      } else {
        const hh = Math.floor(h / 2);
        const asp = Math.max(0.2, w / Math.max(1, hh));
        if (Math.abs(this.camera.aspect - asp) > 0.01) {
          this.camera.aspect = asp;
          this.camera.updateProjectionMatrix();
        }
        if (Math.abs(this.cameraP2.aspect - asp) > 0.01) {
          this.cameraP2.aspect = asp;
          this.cameraP2.updateProjectionMatrix();
        }
        this.renderer.setViewport(0, h - hh, w, hh);
        this.renderer.setScissor(0, h - hh, w, hh);
        this.renderer.render(this.scene, this.camera);

        this.renderer.setViewport(0, 0, w, h - hh);
        this.renderer.setScissor(0, 0, w, h - hh);
        this.renderer.render(this.scene, this.cameraP2);
      }
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, w, h);
    } else {
      if (this._wasSplitRender) {
        const vp = OrientationManager.getViewportSize();
        const w = Math.max(1, vp.width);
        const h = Math.max(1, vp.height);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(0, 0, w, h);
        this._wasSplitRender = false;
      }
      this.renderer.render(this.scene, this.camera);
    }
    if (!consumedPlayingInput) {
      this.input.endFrame();
    }
  }

  _updateSpectatorFreeCam(dt, activeCamList = []) {
    const panSpeed = 14;
    const off = this.spectatorFreeOffset;
    if (this.input.isKeyDown('KeyA') || this.input.isKeyDown('ArrowLeft')) off.x -= panSpeed * dt;
    if (this.input.isKeyDown('KeyD') || this.input.isKeyDown('ArrowRight')) off.x += panSpeed * dt;
    if (this.input.isKeyDown('KeyW') || this.input.isKeyDown('ArrowUp')) off.z -= panSpeed * dt;
    if (this.input.isKeyDown('KeyS') || this.input.isKeyDown('ArrowDown')) off.z += panSpeed * dt;
    if (this.input.isKeyDown('KeyE') || this.input.isKeyDown('Space')) off.y += panSpeed * 0.7 * dt;
    if (this.input.isKeyDown('KeyQ') || this.input.isKeyDown('ShiftLeft')) off.y -= panSpeed * 0.7 * dt;
    off.x = Math.max(-18, Math.min(18, off.x));
    off.y = Math.max(-2, Math.min(18, off.y));
    off.z = Math.max(-28, Math.min(24, off.z));

    if (this.input.wasKeyJustPressed('Tab') && activeCamList.length > 0) {
      const curIdx = activeCamList.findIndex((pl) => pl.peerId === this.tvHud.focusedId || pl.id === this.tvHud.focusedId);
      const next = activeCamList[(curIdx + 1) % activeCamList.length];
      const nextId = next?.peerId || next?.id || null;
      this.cameraRig.setFocusPlayer(nextId);
      off.set(0, 0, 0);
    }

    this.camera.position.add(off);
    const focusTarget = activeCamList[0];
    if (focusTarget) {
      this.camera.lookAt(
        (focusTarget.x || 0) + off.x * 0.35,
        1.4 + (focusTarget.y || 0) + off.y * 0.25,
        (focusTarget.z || 0) - 4 + off.z * 0.35
      );
    }
  }

  destroy() {
    this._disposeFreeMode();
    cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointerdown', this._unlockAudio);
    this._swipeSurface?.removeEventListener('pointerdown', this._onCanvasPointer);
    this._swipeSurface?.removeEventListener('pointermove', this._onCanvasPointerMove);
    window.removeEventListener('pointerup', this._onCanvasPointerEnd);
    window.removeEventListener('pointercancel', this._onCanvasPointerEnd);
    this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored);
    window.removeEventListener('keydown', this._unlockAudio);
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.net?.leaveRoom();
    this.input.destroy();
    this.renderer.dispose();
  }
}
