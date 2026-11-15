// Motor completo do DINO DASH 3D: integra Essencial, Avançado e Bônus em arquitetura modular.
import * as THREE from 'three';
import { Save } from '../systems/Save.js';
import { InputSystem } from '../systems/Input.js';
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
import { getDinoSpec, getDinoHabitat, getEffectiveDinoHabitat } from '../dinos/DinoCatalog.js';
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
import { RoomClient } from '../net/RoomClient.js';
import { EventManager } from '../events/EventManager.js';
import { DifficultyManager } from './Difficulty.js';
import { getModeDef, STORY_CHAPTERS, CHAOS_RULES } from './Modes.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { SoundEffects } from '../audio/SoundEffects.js';
import { MusicSequencer } from '../audio/MusicSequencer.js';
import { Narrator } from '../audio/Narrator.js';
import { UIManager } from '../ui/UI.js';
import { TvHud } from '../ui/TvHud.js';

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor('#f78c4f', 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
    this.camera = new THREE.PerspectiveCamera(Save.data.settings.fov || 58, window.innerWidth / window.innerHeight, 0.1, 260);
    this.cameraP2 = new THREE.PerspectiveCamera(Save.data.settings.fov || 58, window.innerWidth / window.innerHeight, 0.1, 260);

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
    this.activeCampaignNode = null;
    this.activeCustomTrack = null;
    this.multiplayerSession = null;
    this.merchantUses = 0;
    this._merchantGuardUntil = 0;
    this.hitStopTimer = 0;
    this.spotlightActive = false;
    this._lastFrameRenderAt = 0;
    this.pendingRestart = false;
    this.restartPrevState = 'playing';
    this.tutorialState = null;
    this.seenHints = new Set();
    this.hollowEarthState = null;
    this.shopDetour = null;
    this.nextShopMilestone = 30000;
    this._progressiveNotified = new Set();
    this._portalBiomeAccum = 0;
    this._mpReviveCount = 0;

    this.net = new RoomClient();
    this.perf = new PerfMonitor();
    this.clipRecorder = new ClipRecorder(canvas);

    this.ui = new UIManager(uiRoot, this);
    this.tvHud = new TvHud(uiRoot, {
      onFocusPlayer: (id) => {
        const nextId = this.tvHud.focusedId === id ? null : id;
        this.cameraRig.setFocusPlayer(nextId);
      },
      onSpectatorAction: (act) => this._applySpectatorAction(act),
      onToggleFreeCam: () => {
        this.spectatorMode = !this.spectatorMode;
      }
    });
    this._bindNetworkEvents();
    this.rebuildPlayers();
    this._bindEvents();
    this.applySettings();
    this.openMainMenu();

    this.lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _bindEvents() {
    this._onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.cameraP2.aspect = window.innerWidth / window.innerHeight;
      this.cameraP2.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._onResize);

    // Desbloqueio WebAudio + Gestos Touch (Swipe) + Toque OVNI / Pular Intro + Konami
    this._unlockAudio = () => this.audio.ensureContext();
    this._canvasSwipe = null;
    this._swipeSurface = document.getElementById('app') || this.canvas;
    const isInteractiveTarget = (t) => {
      if (!t || !t.closest) return false;
      return !!t.closest('button, a, input, select, textarea, [data-tact], #btn-fury-melee, #btn-attack-melee, #hud-backpack, #hud-camera, .chunky-panel, .modal-card, .overlay-center');
    };
    this._onCanvasPointer = (e) => {
      if (this.state !== 'playing') return;
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
        this._canvasSwipe = {
          id: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          lastAxis: null,
          lastTriggerAt: 0
        };
      }
    };
    this._onCanvasPointerMove = (e) => {
      const sw = this._canvasSwipe;
      if (!sw || sw.id !== e.pointerId || this.state !== 'playing') return;
      if (this.events.predators?.state === 'intro') return;
      if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
      const dx = e.clientX - sw.startX;
      const dy = e.clientY - sw.startY;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) return;

      const axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      const now = performance.now();
      const minChainWait = axis === sw.lastAxis ? 145 : 75;
      if (sw.lastTriggerAt && (now - sw.lastTriggerAt) < minChainWait) return;

      sw.startX = e.clientX;
      sw.startY = e.clientY;
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
    this.ui?.hud?.setDebugButtonVisible?.(!!Save.data.devMode);
    if (this.multiplayerSession?.active) {
      this.tvHud.setVisible(true, !!Save.data.network?.tvScale);
    }
  }

  setLowLod(active) {
    this.lowLod = Boolean(active || Save.data.lowSpecMode);
    this.world?.scenery?.setLowDetail?.(this.lowLod);
  }

  _bindNetworkEvents() {
    this.net.on('input', (msg) => {
      if (!this.multiplayerSession?.active || !this.multiplayerSession.isHost) return;
      const target = this.players.find((p) => p.peerId === msg.peerId);
      if (target) {
        this.input.applyRemoteInputMap(target.key, msg.inputs || {});
      }
    });

    this.net.on('card_pick', (msg) => {
      if (!this.multiplayerSession?.active || !this.multiplayerSession.isHost) return;
      const target = this.players.find((p) => p.peerId === msg.peerId);
      const card = CARD_POOL.find((c) => c.id === msg.cardId);
      if (target && card) {
        card.apply(target, this);
        this.sfx.card(card.rarity === 'lendária');
        this.ui.hud.showFloatText(`${target.name}: ${card.name}!`, '#ffd447');
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
        onAgain: () => this.ui.hud.showBanner('⏳ Aguardando o Dono da Sala iniciar a próxima rodada...', '#38bdf8', 2.6),
        onMenu: () => this.openMainMenu()
      });
    });

    this.net.on('mp_revive', (msg) => {
      if (!this.multiplayerSession?.active) return;
      if (this.multiplayerSession.isHost) {
        if (this.multiplayerSession.allowRevive === false) return;
        const payerIdx = Math.max(0, this.players.findIndex((p) => p.peerId === (msg.reviverPeerId || msg.peerId)));
        const payer = this.players[payerIdx];
        const ally = (msg.targetPeerId ? this.players.find((pl) => pl.peerId === msg.targetPeerId && pl.dead) : null)
          || this.players.find((pl) => pl.dead && pl !== payer);
        if (!payer || payer.dead || !ally) return;
        this._revivePlayerEntity(ally, msg.cost || (45 + (this._mpReviveCount || 0) * 35), payer.name || 'Companheiro');
        this.net.activeTransport?.send?.({
          type: 'mp_revive',
          approved: true,
          allyName: ally.name || ally.spec?.name || 'Aliado',
          reviverName: payer.name || 'Companheiro',
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

  _performMeleeAttack(p) {
    if (!p._unlockAll && !this.isTestTrack && this.score < 1800) {
      if (!p._lowStamToastCooldown) {
        p._lowStamToastCooldown = 0.8;
        this.ui.hud.showFloatText('🔒 Ataque [Q] libera aos 1.800 pts!', '#94a3b8');
      }
      return;
    }
    if (p.attackTimer > 0 || (p.attackCooldown || 0) > 0) return;
    if (!this.isTestTrack && (p.stamina ?? 100) < 20) {
      if (!p._lowStamToastCooldown) {
        p._lowStamToastCooldown = 0.8;
        this.ui.hud.showFloatText('💨 Sem estamina para atacar (20)!', '#fbbf24');
      }
      return;
    }
    if (!this.isTestTrack) {
      p.stamina = Math.max(0, (p.stamina ?? 100) - 20);
      p._staminaRegenDelay = 0.6;
    }
    const attackPower = p.attackPowerMult || 1;
    p.attackTimer = 0.24;
    p.attackCooldown = (p.attackMaxCooldown || 1.25) * (p.attackCdMult || 1);
    p.animator.triggerRoar(0.25);
    this.sfx.melee();
    this.particles.emitDust(p.x, (p.baseY || 0) + 0.8, p.z - 0.9, 6, '#ffd447', 2.4);

    let brokeAny = false;
    const reachX = 1.35 * (attackPower > 1.1 ? 1.15 : 1);
    const reachZ = 4.8 * Math.min(1.4, attackPower);
    const smashPts = Math.round(35 * attackPower);
    for (const obs of this.spawner.getActiveObstacles()) {
      if (obs.hit || !obs.breakable) continue;
      const dx = Math.abs(obs.group.position.x - p.x);
      const dz = obs.group.position.z - p.z;
      if (dx < reachX && dz > -reachZ && dz < 1.35) {
        obs.hit = true;
        obs.pool?.release(obs);
        this.particles.emitExplosion(obs.group.position.x, (obs.group.position.y || 0) + 0.8, obs.group.position.z, obs.color, 12, true);
        this._spawnImpactDebris(obs.group.position.x, obs.group.position.z, obs.color);
        p.wantedStars = Math.min(5, (p.wantedStars || 0) + 0.3);
        this.addScore(smashPts * this.combo, p);
        this.ui.hud.showFloatText(`💥 QUEBROU! +${smashPts}`, '#ffd447');
        brokeAny = true;
      }
    }

    if (brokeAny && this.tutorialState?.active && this.tutorialState.step === 3) {
      this._advanceTutorialStep();
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

  setBiomeConfig(biomeId, seq) {
    this.startBiomeId = biomeId;
    this.sequenceBiomes = seq;
    this.currentBiome = getBiomeById(biomeId);
    this.world.applyTheme(this.currentBiome.theme);
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
      const localCustom = (pKey === 'p1' || pKey === 'p2') ? getActivePreset(pKey) : {};
      const eqSkinVariant = i === 0 ? getEquippedSkinVariant(dinoId) : (slot.skinVariant || localCustom.skinVariant || 'normal');
      const eqMutationId = i === 0 ? (Save.data.equippedMutation || 'amber_core') : null;
      const eqMutationTier = (i === 0 && eqMutationId) ? getMutationActiveLevel(eqMutationId) : 1;
      const mutProfile = eqMutationId ? getMutationComputedProfile(eqMutationId, eqMutationTier) : null;
      const hybridCfg = i === 0 ? Save.data.hybrid : null;
      const habInfo = getEffectiveDinoHabitat(spec, { hybrid: hybridCfg, mutationId: eqMutationId });
      const initialHabitat = habInfo.primary === 'amphibious' ? 'land' : (habInfo.primary || 'land');
      const modelCfg = {
        ...localCustom,
        skinVariant: eqSkinVariant,
        mutation: eqMutationId,
        mutationTier: eqMutationTier,
        ...(slot.color ? { useCustomColors: true, primary: slot.color } : {}),
        ...(i === 0 ? { hybrid: hybridCfg, season: activeSeason, partyCrown: hasCrown } : { season: activeSeason })
      };
      const model = DinoFactory.build(dinoId, modelCfg, {
        allowHybrid: i === 0 && !!hybridCfg?.enabled,
        skinVariant: eqSkinVariant,
        mutationTier: eqMutationTier
      });
      const startLane = count === 1 ? 1 : (i % 3);
      const laneOffset = count > 3 ? ((Math.floor(i / 3) - 0.5) * 0.45) : 0;
      model.root.position.set(LANE_X[startLane] + laneOffset, 0, Math.floor(i / 3) * 0.65);
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
        x: LANE_X[startLane] + laneOffset,
        y: 0,
        z: Math.floor(i / 3) * 0.65,
        vy: 0,
        grounded: true,
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
        grantsLandWalk: habInfo.grantsLandWalk,
        diveDepth: 0,
        inWater: false,
        inSubmerged: false,
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
  }

  openMainMenu() {
    this.state = 'menu';
    this.photoMode = false;
    this.spectatorMode = false;
    this.pendingRestart = false;
    this._dismissSpotlight();
    this.tutorialState = null;
    this.multiplayerSession = null;
    this.tvHud.setVisible(false);
    this.cameraRig.setFocusPlayer(null);
    this.cameraRig.setPredatorFocus(null);
    this.events?.reset?.();
    this.ui.hud.setPredatorIntroHud(null);
    this.ui.hud.setPredatorIntroHud?.(null);
    this.music.setPlaying(false);
    this.spawner.reset();
    this.events.reset();
    this.abilities.clear();
    this.particles.clear();
    this._clearDebris();
    this.rebuildPlayers();
    this.currentBiome = getBiomeById(this.startBiomeId);
    this.world.applyTheme(this.currentBiome.theme);
    this.ui.hud.resetAllOverlays();
    this.ui.showMainMenu();
  }

  startMultiplayerMatch(room, botCount = 0) {
    const peers = Array.isArray(room?.peers) ? room.peers : [];
    const roster = [];
    let keyIdx = 1;
    for (const pr of peers) {
      if (roster.length >= 8) break;
      roster.push({
        key: `p${keyIdx++}`,
        dinoId: pr.dinoId || 'trex',
        name: pr.name || `Dino ${roster.length + 1}`,
        peerId: pr.peerId,
        color: pr.color || null,
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
    this.diffMgr.setPreset(matchDiffId);
    this.multiplayerSession = {
      active: true,
      isHost: this.net.isHost,
      room,
      roster,
      botCount,
      seed: matchSeed,
      mpMode,
      difficultyId: matchDiffId,
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

    this.modeId = 'solo';
    this.net.broadcastHostStart({
      roomCode: room?.code,
      roster,
      botCount,
      seed: matchSeed,
      mpMode,
      difficultyId: matchDiffId,
      allowRevive: this.multiplayerSession.allowRevive,
      elim: isElim,
      partyMode: this.multiplayerSession.partyMode,
      biomeId: matchBiomeId
    });
    this.startRun(false, { keepMultiplayerSession: true, roster, seed: matchSeed, biomeId: matchBiomeId });
    this.tvHud.setVisible(this.players.length > 1, !!Save.data.network?.tvScale);
    const modeLabel = mpMode === 'duel' ? '⚔️ DUELO PvP' : (isElim ? '⏳ ELIMINAÇÃO 30s' : '🏁 CORRIDA');
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
      this.diffMgr.setPreset(payload.difficultyId);
    }
    this.multiplayerSession = {
      active: true,
      isHost: false,
      room,
      roster,
      botCount: payload.botCount || 0,
      seed: payload.seed || room.seed || `MP-${room.code || 'GUEST'}`,
      mpMode,
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

    this.modeId = 'solo';
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
      step: 0,
      total: 6,
      progress: 0,
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
    this.ui.hud.setTutorialHud(null);
    this.openMainMenu();
  }

  _syncTutorialHud() {
    const ts = this.tutorialState;
    if (!ts || !ts.active) {
      this.ui.hud.setTutorialHud(null);
      return;
    }
    const defs = [
      { title: '1/6 • Trocar de Faixa', desc: 'Use [A] / [D] ou [←] / [→] para desviar lateralmente (0/2 trocas).' },
      { title: '2/6 • Pular Obstáculos', desc: 'Aperte [W] / [↑] para pular sobre os cactos à frente (0/2 pulos).' },
      { title: '3/6 • Abaixar / Deslizar', desc: 'Segure [S] / [↓] para passar por baixo do Pterodáctilo alto!' },
      { title: '4/6 • Ataque Básico [Q]', desc: 'Chegue perto do obstáculo verde e aperte [Q] para quebrá-lo!' },
      { title: '5/6 • Habilidade Especial [Espaço]', desc: 'Aperte [Espaço] para ativar o poder exclusivo do seu dino!' },
      { title: '6/6 • Alquimia Elemental', desc: 'Colete os Ovos Elementais (Fogo + Gelo = Explosão de Vapor)!' }
    ];
    const d = defs[ts.step] || defs[5];
    let desc = d.desc;
    if (ts.step === 0) desc = `Use [A] / [D] ou [←] / [→] para trocar de faixa (${ts.progress}/2 trocas).`;
    if (ts.step === 1) desc = `Pule os cactos com [W] / [↑] (segure para pulo alto) (${ts.progress}/2 pulos).`;
    this.ui.hud.setTutorialHud({
      active: true,
      step: ts.step + 1,
      total: ts.total,
      progressText: `${ts.step + 1}/${ts.total}`,
      title: `🎓 ${d.title}`,
      desc
    });
  }

  _advanceTutorialStep() {
    const ts = this.tutorialState;
    if (!ts || !ts.active) return;
    ts.step++;
    ts.progress = 0;
    ts.spawnCd = 0.55;
    this.sfx.powerup();
    if (ts.step >= ts.total) {
      ts.active = false;
      ts.doneTimer = 1.4;
      this.spawner.tutorialMode = false;
      const firstTime = !Save.data.tutorialRewardClaimed;
      if (firstTime) {
        Save.data.tutorialRewardClaimed = true;
        Save.addEggs(20);
        Save.save();
      }
      this.sfx.victory();
      this.ui.hud.setTutorialHud(null);
      this.ui.hud.showBanner(
        firstTime ? '🎓 TUTORIAL COMPLETO! +20 Ovos de Recompensa!' : '🎓 TUTORIAL COMPLETO! Você dominou todas as mecânicas!',
        '#58d63a',
        4.0
      );
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

    ts.spawnCd -= dt;
    if (ts.spawnCd <= 0) {
      const hasHazardAhead = this.spawner.getActiveObstacles().some((o) => !o.hit && o.group.position.z < 1);
      if (ts.step === 1 && !hasHazardAhead) {
        this.spawner.spawnTutorialObject('cactus_small', p0.lane, { z: -48 });
        ts.spawnCd = 1.6;
      } else if (ts.step === 2 && !hasHazardAhead) {
        this.spawner.spawnTutorialObject('bird', p0.lane, { highBird: true, z: -50 });
        ts.spawnCd = 1.8;
      } else if (ts.step === 3 && !hasHazardAhead) {
        this.spawner.spawnTutorialObject('cactus_spine', p0.lane, { z: -46 });
        ts.spawnCd = 1.6;
      } else if (ts.step === 4) {
        p0.abilityCooldown = 0;
        p0.abilityCharge = 100;
        ts.spawnCd = 1.0;
      } else if (ts.step === 5 && !hasHazardAhead) {
        const nextElem = ts.elemCount === 0 ? 'fire' : 'ice';
        this.spawner.spawnTutorialObject('elemental_egg', p0.lane, { element: nextElem, z: -42 });
        ts.spawnCd = 1.8;
      } else {
        ts.spawnCd = 0.5;
      }
    }

    if (ts.step === 2) {
      const birdClose = this.spawner.getActiveObstacles().some(
        (o) => o.kind === 'bird' && !o.hit && o.group.position.z > -16 && o.group.position.z < 3
      );
      if (birdClose && (p0.ducking || p0.sliding)) {
        ts.progress += dt;
        if (ts.progress >= 0.25) {
          this._advanceTutorialStep();
        }
      }
    }
  }

  startRun(isTestTrack = false, opts = {}) {
    this.isTestTrack = isTestTrack;
    this.pendingRestart = false;
    this.spotlightActive = false;
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
    this.state = 'playing';
    this.photoMode = false;
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
    this.baseSpeed = diff.initialSpeed;
    this.maxSpeed = diff.maxSpeed;
    this.speedAccel = diff.accel;
    this.speed = this.baseSpeed;
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
    this.hiScore = Save.getHighScore();

    // Seed determinística para Desafio Diário, Multiplayer ou Seed compartilhável
    const seed = opts.seed || this.activeCustomTrack?.seed || (this.modeId === 'daily_challenge' ? getTodaySeed() : this.customSeed);
    this.spawner.setSeed(seed);
    this.spawner.setDifficultyId(this.difficultyMgr.activeId);
    this.spawner.setDifficultyConfig(diff);
    this.spawner.setBossManager(this.events.bosses);
    this.spawner.setDensity(diff.density * (this.activeCustomTrack?.obstacleRate || 1.0));
    this.events.configure(diff.eventFreq, diff.enabledEvents);

    // Bioma inicial (Modo História começa no capítulo 1; Modo Aleatório inicia via Portal Dinâmico)
    const rawStartId = opts.biomeId || (this.modeId === 'story' ? STORY_CHAPTERS[0].biome : this.startBiomeId);
    this.randomPortalMode = rawStartId === 'random_portal' || !!opts.randomPortal || !!this.sequenceBiomes;
    const startId = rawStartId === 'random_portal' ? getRandomNextBiome(null).id : rawStartId;
    this.currentBiome = getBiomeById(startId);
    this.world.applyTheme(this.currentBiome.theme);
    this.world.setHollowEarthVisuals(false);
    this.world.setShopLane(null);
    this.spawner.setBiome(this.currentBiome.id);
    if (!isTestTrack) this._discoverCurrentBiomeFossil();

    const aquaBiome = isAquaticBiome(this.currentBiome);
    this._syncEnvironmentHabitat(this.players[0]);
    for (const pl of this.players) {
      const mode = pl.habitatMode || pl.habitat;
      pl.diveDepth = this.currentBiome?.submerged ? 1 : 0;
      pl.inWater = Boolean(aquaBiome || mode === 'aquatic');
      pl.inSubmerged = Boolean(this.currentBiome?.submerged);
      if (mode === 'aquatic' && !aquaBiome) {
        pl.x = RIVER_LANE_X[pl.lane] ?? RIVER_LANE_X[1];
        pl.baseY = 0;
      } else if (mode === 'flying') {
        pl.x = LANE_X[pl.lane] ?? 0;
        pl.baseY = SKY_CORRIDOR_Y - 1.15;
      } else {
        pl.x = LANE_X[pl.lane] ?? 0;
        pl.baseY = 0;
      }
      pl.y = 0;
      pl.model.root.position.x = pl.x;
      pl.model.root.position.y = pl.baseY;
    }

    // Mutação Equipada (ou sorteada apenas se nenhuma estiver selecionada)
    if (!isTestTrack && this.players[0]) {
      const mut = getMutationDef(Save.data.equippedMutation) || rollRandomMutation();
      this.activeMutation = mut;
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

    // Tutorial curto na 1ª partida (e dica de arrastar o dedo no celular)
    const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (!Save.data.tutorialDone) {
      Save.data.tutorialDone = true;
      Save.save();
      this._pendingStartBanners.push({
        text: isCoarse
          ? '👆 Arraste o dedo na tela: ⬅ ➡ faixas • ⬆ pular • ⬇ deslizar!'
          : 'Dica: Use W/↑ para pular, S/↓ para abaixar/deslizar e A/D para trocar de faixa!',
        color: '#58d63a',
        dur: 4.5
      });
    } else if (isCoarse && !this._mobileSwipeTipShown && !this.isTestTrack) {
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
      lead0.model?.root.position.set(lead0.x, 0, lead0.z);
      lead0.animator?.update(0.016, { speed: 0, grounded: true });
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

  cycleCamera() {
    const mode = this.cameraRig.cycleMode();
    this.ui.hud.setCameraLabel(mode.label);
  }

  usePlayerItem(idx = 0) {
    const p = this.players[idx];
    if (!p || p.dead) return;
    p.backpack.useNext(p, this._eventContext());
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

  _syncEnvironmentHabitat(leadPlayer = this.players[0]) {
    const biome = this.currentBiome;
    const aquaBiome = isAquaticBiome(biome);
    const anyAquatic = this.players.some((p) => (p.habitatMode || p.habitat) === 'aquatic') || aquaBiome;
    const anyFlying = this.players.some((p) => (p.habitatMode || p.habitat) === 'flying');
    const leadMode = leadPlayer ? (leadPlayer.habitatMode || leadPlayer.habitat) : 'land';
    const isSubmergedBiome = !!biome?.submerged;
    const isWaterSurfaceTrack = Boolean(aquaBiome && !isSubmergedBiome);
    const leadDive = leadPlayer?.diveDepth || 0;
    this.world.setAquaticChannelActive(anyAquatic);
    this.world.setSkyCorridorActive(anyFlying);
    this.world.setWaterTrackVisuals(isWaterSurfaceTrack);
    this.world.setSubmergedVisuals(isSubmergedBiome || (Boolean(aquaBiome || leadMode === 'aquatic') && leadDive > 0.25));
    this.spawner.setHabitatMode(leadMode, aquaBiome);
  }

  _buildCameraEnvOpts(lead = this.players[0]) {
    const aquaBiome = isAquaticBiome(this.currentBiome);
    const leadMode = lead ? (lead.habitatMode || lead.habitat) : 'land';
    const trackCenterX = (!aquaBiome && leadMode === 'aquatic') ? (RIVER_LANE_X[1] ?? 10) : 0;
    const inWater = Boolean(aquaBiome || leadMode === 'aquatic');
    const diveDepth = lead?.diveDepth || 0;
    const isSubmerged = Boolean(this.currentBiome?.submerged || (inWater && diveDepth > 0.25));
    const isWaterSurface = Boolean(inWater && !isSubmerged);
    return { trackCenterX, inWater, isWaterSurface, isSubmerged, diveDepth };
  }

  _transmutePlayerHabitat(p) {
    if (!p || p.dead || !Array.isArray(p.availableHabitats) || p.availableHabitats.length <= 1) return false;
    const cur = p.habitatMode || p.habitat || 'land';
    const idx = p.availableHabitats.indexOf(cur);
    const nextMode = p.availableHabitats[(idx + 1) % p.availableHabitats.length];
    if (nextMode === cur) return false;

    const aquaBiome = isAquaticBiome(this.currentBiome);
    const oldX = p.x;
    const oldY = (p.baseY || 0) + p.y;
    p.habitatMode = nextMode;
    p.habitat = nextMode;
    p.diveDepth = this.currentBiome?.submerged ? 1 : 0;
    p.inShopLane = null;
    p.sliding = false;
    p.ducking = false;
    p.grounded = nextMode !== 'flying';

    if (nextMode === 'aquatic') {
      const lanes = aquaBiome ? LANE_X : RIVER_LANE_X;
      p.baseY = 0;
      p.y = 0;
      p.vy = 0;
      p.x = lanes[p.lane] ?? lanes[1];
    } else if (nextMode === 'flying') {
      p.baseY = SKY_CORRIDOR_Y - 1.15;
      p.y = 0;
      p.vy = 2.2;
      p.x = LANE_X[p.lane] ?? 0;
    } else {
      p.baseY = 0;
      p.y = 0;
      p.vy = 0;
      p.x = LANE_X[p.lane] ?? 0;
    }
    p.inWater = Boolean(aquaBiome || nextMode === 'aquatic');
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

  triggerRandomPortalTransition() {
    if (this.hollowEarthState?.active) this.exitHollowEarth();
    const nextBiome = getRandomNextBiome(this.currentBiome?.id);
    this.currentBiome = nextBiome;
    this.world.applyTheme(this.currentBiome.theme);
    this.spawner.setBiome(this.currentBiome.id);
    const aqua = isAquaticBiome(this.currentBiome);
    this._syncEnvironmentHabitat(this.players[0]);
    for (const pl of this.players) {
      if ((pl.habitatMode || pl.habitat) === 'aquatic') {
        const lanes = aqua ? LANE_X : RIVER_LANE_X;
        pl.x = lanes[pl.lane] ?? lanes[1];
        pl.model.root.position.x = pl.x;
      }
    }
    if (!this.isTestTrack) this._discoverCurrentBiomeFossil();
    this.sfx.portal?.();
    this.ui.hud.triggerEdgeFlash('cyan');
    this.ui.hud.showBanner(`🌀 PORTAL DE BIOMA → ${this.currentBiome.name}!`, '#38bdf8', 3.0);
  }

  _revivePlayerEntity(ally, paidCost = 45, reviverName = '') {
    if (!ally) return;
    ally.dead = false;
    ally.hp = Math.max(1, Math.min(2, ally.maxHp || 2));
    ally.shields = (ally.shields || 0) + 1;
    ally.invulnTimer = 3.2;
    ally.y = 0;
    ally.vy = 4.5;
    if (ally.model?.root) ally.model.root.visible = true;
    this._mpReviveCount = (this._mpReviveCount || 0) + 1;
    this.particles.emitDust(ally.x, 1, ally.model?.root?.position?.z || 0, 18, '#34d399', 4.5);
    this.sfx.powerup?.();
    this.ui.hud.triggerEdgeFlash('green');
    const byStr = reviverName ? ` por ${reviverName}` : '';
    this.ui.hud.showBanner(`💖 ${ally.name || 'Aliado'} REVIVIDO${byStr} (${paidCost} 🥚)!`, '#34d399', 3.2);
  }

  reviveFallenAlly(payerIdx = 0) {
    if (this.state !== 'playing') return false;
    if (this.multiplayerSession?.active && this.multiplayerSession.allowRevive === false) {
      this.ui.hud.showBanner('🔒 Revive desativado pelo Dono da Sala!', '#f87171', 2.2);
      return false;
    }
    const payer = (this.multiplayerSession?.active && this.net.peerId)
      ? (this.players.find((pl) => pl.peerId === this.net.peerId) || this.players[payerIdx])
      : this.players[payerIdx];
    const ally = this.players.find((pl) => pl.dead && pl !== payer);
    if (!payer || payer.dead || !ally) return false;

    const cost = 45 + (this._mpReviveCount || 0) * 35;
    const totalAvailable = (this.runEggs || 0) + (Save.data.eggs || 0);
    if (totalAvailable < cost) {
      this.ui.hud.showBanner(`🥚 Precisa de ${cost} ovos para reviver ${ally.name || 'aliado'}!`, '#f87171', 2.4);
      return false;
    }

    let rem = cost;
    const takeRun = Math.min(this.runEggs || 0, rem);
    this.runEggs = Math.max(0, (this.runEggs || 0) - takeRun);
    rem -= takeRun;
    if (rem > 0) Save.addEggs(-rem);

    if (this.multiplayerSession?.active && !this.multiplayerSession.isHost) {
      this.net.sendMpRevive({
        reviverPeerId: this.net.peerId,
        targetPeerId: ally.peerId || null,
        cost
      });
      this.ui.hud.showFloatText(`💖 Revivendo ${ally.name || 'Aliado'} (-${cost} 🥚)...`, '#34d399');
      return true;
    }

    this._revivePlayerEntity(ally, cost, payer.name || '');
    if (this.multiplayerSession?.active) {
      this.net.activeTransport?.send?.({
        type: 'mp_revive',
        approved: true,
        allyName: ally.name || ally.spec?.name || 'Aliado',
        reviverName: payer.name || 'Host',
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
      currentBiome: this.currentBiome,
      habitatMode: this.players[0]?.habitatMode || this.players[0]?.habitat || 'land',
      playerCount: this.players.length,
      decoyTimer: this.decoyTimer,
      addScore: (v, p) => this.addScore(v, p),
      showBanner: (t, c, d) => this.ui.hud.showBanner(t, c, d),
      showFloatText: (p, t, c) => this.ui.hud.showFloatText(t, c),
      damagePlayer: (p, cause = 'event') => this._damagePlayer(p, cause),
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
      poison: { label: '☠️ Veneno Acumulado', tip: 'Use Antídoto [E] ou pegue Esfera de Fogo 🔥 para neutralizar o veneno.' },
      amber_crystal: { label: '🔶 Cristal de Âmbar', tip: 'Quebre o Cristal com Ataque [Q] ou pule/desvie para outra faixa!' },
      geyser_vent: { label: '💨 Gêiser Vulcânico', tip: 'Troque de faixa com [A/D] ou dê um salto alto sobre o jato!' },
      tar_pit: { label: '🖤 Poço de Piche', tip: 'Pule sobre o piche com [W/↑] para não perder estamina e velocidade!' },
      falling_stalactite: { label: '🪨 Estalactite Cristalina', tip: 'Destrua com [Q] ou desvie de faixa antes do impacto.' },
      electric_pylon: { label: '⚡ Bobina Elétrica', tip: 'Desvie da faixa energizada usando [A/D]!' },
      spike_barricade: { label: '🪵 Barricada de Espinhos', tip: 'Pule com [W/↑] ou quebre com [Q] / Fúria!' },
      pvp: { label: '⚔️ Ataque de Rival', tip: 'Contra-ataque com [Q] ou mantenha escudos ativos nos Duelos.' }
    };
    const found = map[cause];
    return found || {
      label: '⚠️ Perigo na Pista',
      tip: 'Use [W/↑] para pular, [S/↓] para abaixar e [A/D] para desviar.'
    };
  }

  _damagePlayer(p, cause = 'obstacle') {
    if (this.tutorialState?.active) {
      this.ui.hud.showFloatText('💡 Veja a instrução no topo para desviar ou quebrar!', '#ffd447');
      return;
    }
    if (!p || p.dead || this.godMode || this.modeId === 'zen' || this.isTestTrack) return;
    if (p.invulnTimer > 0 || p.furyTimer > 0 || p.ramTimer > 0 || p.diveTimer > 0 || p.rocketTimer > 0) return;

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
      const customDeath = getActivePreset(p.key).deathEffect;
      if (customDeath === 'fireworks') {
        this.particles.emitExplosion(p.x, p.y + 1.0, p.z, '#ffbe0b', 18, true);
        this.particles.emitExplosion(p.x + 0.5, p.y + 1.3, p.z, '#ff2e63', 14, true);
      } else if (customDeath === 'ghost') {
        this.particles.emitExplosion(p.x, p.y + 0.9, p.z, '#90e0ef', 20, false);
      } else {
        this.particles.emitExplosion(p.x, p.y + 0.8, p.z, '#ffd447', 16, true);
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
    const finalScore = Math.floor(this.score * diff.scoreMult * (this.modeId === 'hardcore' ? 5 : 1));
    const isNewRecord = Save.updateHighScore(finalScore, this.modeId);
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

    if (this.activeCampaignNode && finalScore >= this.activeCampaignNode.targetScore) {
      if (!Save.data.campaign.completedNodes.includes(this.activeCampaignNode.id)) {
        Save.data.campaign.completedNodes.push(this.activeCampaignNode.id);
        Save.addEggs(this.activeCampaignNode.reward || 20);
      }
      Save.save();
    }

    if (this.net?.supabase?.isConfigured?.() && finalScore > 100 && !this.isTestTrack) {
      this.net.supabase.submitGlobalScore({
        playerName: Save.data.network?.nickname || 'Dino',
        dinoId: this.players[0]?.id || 'trex',
        modeId: this.modeId,
        score: finalScore,
        distance: this.distance,
        eggs: this.runEggs
      }).catch(() => {});
    }

    if (this.multiplayerSession?.active) {
      const sorted = [...this.players].sort((a, b) => (b.score || 0) - (a.score || 0));
      const humanCount = this.players.filter((p) => !p.isBot).length;
      const eligible = humanCount >= 2 && this.runTime >= 20 && finalScore >= 120;
      const tierRewards = [12, 6, 3];
      const standings = sorted.map((p, idx) => ({
        peerId: p.peerId,
        name: p.name,
        score: p.score || finalScore,
        pvpHits: p.pvpHits || 0,
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
        onAgain: (voteRes) => {
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
          this.restartRun();
        },
        onMenu: () => this.openMainMenu()
      });
      return;
    }

    const gachaEligible = !this.isTestTrack && this.modeId !== 'zen' && this.modeId !== 'tutorial';
    const gachaCrates = GachaSystem.computeRunCrates(finalScore, this.difficultyMgr.getConfig(), gachaEligible);
    if (gachaCrates > 0) GachaSystem.addCrates(gachaCrates);
    const totalCrates = GachaSystem.getCrateCount();

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
      totalCrates
    };

    this.ui.hud.showGameOver(this.lastGameOverArgs);
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
      // Sabotagem: fantasma joga cactos apertando pulo!
      if (this.modeId === 'sabotage' && this.input.wasActionJustPressed(p.key, 'jump', false)) {
        this.spawner._acquire('cactus_small', LANE_X[Math.floor(Math.random() * 3)], 0, -55);
      }
      return;
    }

    // No modo Relay, apenas o jogador ativo responde
    if (this.modeId === 'relay' && p.index !== this.relayActiveIdx) return;

    let leftJust = false;
    let rightJust = false;
    let jumpJust = false;
    let jumpHeld = false;
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
      duckHeld = this.input.isActionDown(actKey, 'duck', true);
      abilityJust = this.input.wasActionJustPressed(actKey, 'ability', false);
      attackJust = this.input.wasActionJustPressed(actKey, 'attack', false);
      furyJust = this.input.wasKeyJustPressed('KeyF') || this.input.wasActionJustPressed('p1', 'fury', false);
      itemJust = this.input.wasKeyJustPressed('KeyE');
      transmuteJust = this.input.wasActionJustPressed(actKey, 'transmute', false);
    } else if (isRemotePeer) {
      leftJust = !!this.input.virtualJustPressed[p.key]?.has('left');
      rightJust = !!this.input.virtualJustPressed[p.key]?.has('right');
      jumpJust = !!this.input.virtualJustPressed[p.key]?.has('jump');
      jumpHeld = !!this.input.virtualState[p.key]?.jump;
      duckHeld = !!this.input.virtualState[p.key]?.duck;
      abilityJust = !!this.input.virtualJustPressed[p.key]?.has('ability');
      attackJust = !!this.input.virtualJustPressed[p.key]?.has('attack');
      furyJust = !!this.input.virtualJustPressed[p.key]?.has('fury');
      itemJust = !!this.input.virtualJustPressed[p.key]?.has('item');
      transmuteJust = !!this.input.virtualJustPressed[p.key]?.has('transmute');
    } else {
      const allowClassic = isLocalMain || this.players.length === 1;
      const inKey = isLocalMain ? 'p1' : p.key;
      leftJust = this.input.wasActionJustPressed(inKey, 'left', allowClassic);
      rightJust = this.input.wasActionJustPressed(inKey, 'right', allowClassic);
      jumpJust = this.input.wasActionJustPressed(inKey, 'jump', allowClassic);
      jumpHeld = this.input.isActionDown(inKey, 'jump', allowClassic);
      duckHeld = this.input.isActionDown(inKey, 'duck', allowClassic);
      abilityJust = this.input.wasActionJustPressed(inKey, 'ability', false);
      attackJust = this.input.wasActionJustPressed(inKey, 'attack', false);
      furyJust = isLocalMain && (this.input.wasKeyJustPressed('KeyF') || this.input.wasActionJustPressed('p1', 'fury', false));
      itemJust = isLocalMain ? this.input.wasKeyJustPressed('KeyE') : this.input.wasActionJustPressed(inKey, 'item', false);
      transmuteJust = this.input.wasActionJustPressed(inKey, 'transmute', false);
    }

    if ((this._skipIntroGuardFrames || 0) > 0) {
      jumpJust = false;
      jumpHeld = false;
      abilityJust = false;
      transmuteJust = false;
    }

    if (transmuteJust) {
      this._transmutePlayerHabitat(p);
    }

    // Regra do Modo Caos ou Modo Espelhado: controles invertidos!
    if (this.activeChaosRule?.id === 'inverted' || Save.data.mirroredMode) {
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

    const aquaBiome = isAquaticBiome(this.currentBiome);
    const curHabitat = p.habitatMode || p.habitat || 'land';
    const laneArr = (curHabitat === 'aquatic' && !aquaBiome) ? RIVER_LANE_X : LANE_X;
    const inWater = Boolean(aquaBiome || curHabitat === 'aquatic');
    p.inWater = inWater;
    p.inSubmerged = Boolean(this.currentBiome?.submerged);

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
        if (this.tutorialState?.active && this.tutorialState.step === 0 && p.index === 0) {
          this.tutorialState.progress++;
          this._syncTutorialHud();
          if (this.tutorialState.progress >= 2) this._advanceTutorialStep();
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
        if (this.tutorialState?.active && this.tutorialState.step === 0 && p.index === 0) {
          this.tutorialState.progress++;
          this._syncTutorialHud();
          if (this.tutorialState.progress >= 2) this._advanceTutorialStep();
        }
      }
    }

    const iceLaneMult = p.statuses?.ice ? 0.72 : 1;
    const laneSpeed = 16 * (p.laneSpeedMult || 1) * iceLaneMult;
    const baseTargetX = p.inShopLane ? (SHOP_LANE_X[p.inShopLane] ?? laneArr[p.lane]) : (laneArr[p.lane] ?? 0);
    const targetX = baseTargetX + (p.xOffset || 0) + Math.sin(this.runTime * 2) * (Math.abs(envWind) > 0.2 ? envWind * 0.15 : 0);
    const prevX = p.x;
    p.x += (targetX - p.x) * Math.min(1, dt * laneSpeed);
    const laneLean = (p.x - prevX) / Math.max(dt, 0.001) * 0.055;

    // Pulo + Salto Duplo Limitado + Pulo Carregado (+ Emersão na água)
    const jumpMult = (p.jumpMult || 1) * (p.spec.stats.jump >= 9 ? 1.1 : 1.0);
    const maxAirJumps = p.id === 'compsognathus' ? 2 : 1;
    const airJumpCost = Math.round(58 * (1 - (p.mutationMods?.staminaSave || 0)) * (p.airStaminaCostMult || 1));
    if (jumpJust) {
      if (this.events.ufo.active && this.events.ufo.mashBreak()) {
        // Quebrou o feixe do OVNI!
      } else if (inWater && !p.inSubmerged && (p.diveDepth || 0) > 0.3) {
        p.diveDepth = 0;
        p.diveTimer = 0;
        p.vy = 11.8 * jumpMult;
        p.grounded = false;
        p.ducking = false;
        p.sliding = false;
        p.airJumpsUsed = 0;
        this.sfx.jump(true);
        this.particles.emitDust(p.x, (p.baseY || 0) + 0.35, p.z, 10, '#67e8f9', 3.0);
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
        if (this.tutorialState?.active && this.tutorialState.step === 1 && p.index === 0) {
          this.tutorialState.progress++;
          this._syncTutorialHud();
          if (this.tutorialState.progress >= 2) this._advanceTutorialStep();
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

    // Abaixar / Deslizar / Mergulhar na Água (S / ↓)
    if (p.inSubmerged) {
      p.diveDepth = 1.0;
    }
    if (duckHeld) {
      if (inWater && !p.inSubmerged) {
        const prevDive = p.diveDepth || 0;
        p.diveDepth = Math.min(1, prevDive + dt * 5.2);
        p.diveTimer = Math.max(p.diveTimer || 0, 0.16);
        p.ducking = true;
        if (prevDive <= 0.25 && p.diveDepth > 0.25) {
          this.sfx.slide?.();
          this.particles.emitDust(p.x, (p.baseY || 0) + 0.25, p.z, 8, '#67e8f9', 2.6);
        }
        if (Math.random() < dt * 8) {
          this.particles.emitDust(p.x, (p.baseY || 0) - 0.35, p.z + 0.2, 2, '#90e0ef', 1.4);
        }
      } else if (!p.grounded) {
        if (p.vy > -18 && (this.runTime - (p._lastJumpAt ?? -99)) <= 0.85 && (p._moveComboCd || 0) <= 0) {
          p._moveCombo = Math.min(8, (p._moveCombo || 0) + 1);
          p._moveComboCd = 1.6;
          this.addScore(45 * p._moveCombo, p);
          this.ui.hud.showFloatText(`⚡ MERGULHO PERFEITO! +${45 * p._moveCombo}`, '#38bdf8');
        }
        p.vy = Math.min(p.vy, -20);
        p.ducking = true;
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
      if (!p.inSubmerged) {
        p.diveDepth = Math.max(0, (p.diveDepth || 0) - dt * (inWater ? 3.8 : 6.0));
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
    if (p.y > 0.01 && p.rocketTimer <= 0 && p.grappleTimer <= 0 && p.riverLogTimer <= 0) {
      p.grounded = false;
    }

    // Gravidade (Planeta Alienígena, Modo Caos, Pista Customizada, Evento Baixa Gravidade + Planar)
    let gravMult = (this.activeChaosRule?.id === 'low_grav' ? 0.55 : (this.currentBiome.lowGravity || 1.0))
      * (this.activeCustomTrack?.gravityScale || 1.0)
      * (this.events.getGravityScale?.() ?? 1.0);
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
    } else if (!p.grounded) {
      p.vy -= 35.0 * gravMult * dt;
      // Planar breve consome estamina rapidamente (impede voar; pesado se +Patas)
      if (jumpHeld && staminaUnlocked && p.vy < -2.6 && (p.stamina ?? 0) > 4) {
        p.stamina = Math.max(0, (p.stamina ?? 0) - 62 * (p.airStaminaCostMult || 1) * dt);
        p._staminaRegenDelay = 0.5;
        p.vy = Math.max(p.vy, -10.5);
      }
      p.y += p.vy * dt;
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.grounded = true;
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
    const canRegenStam = (p._staminaRegenDelay || 0) <= 0 && (p.grounded || p.habitat === 'aquatic' || p.habitat === 'flying');
    const stamRegen = inOasis ? 28 : (canRegenStam ? 8.5 * (p.mutationMods?.stamRegenMult || 1) : 0);
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
        const trailColor = custom.trail === 'fire' ? '#ff5e1a'
          : custom.trail === 'stars' ? '#ffd447'
          : custom.trail === 'rainbow' ? ['#ff4757', '#ffa502', '#2ed573', '#1e90ff'][Math.floor(Math.random() * 4)]
          : '#e8bc79';
        this.particles.emitDust(p.x, (p.baseY || 0) + 0.08, p.z + 0.35, 1, trailColor, 0.9);
      }
    }

    const diveSink = (p.inSubmerged ? 0.32 : (p.diveDepth || 0) * 1.45);
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
      swimming: curHabitat === 'aquatic' || aquaBiome,
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

    if (snap.biome && snap.biome !== this.currentBiome.id) {
      const targetBiome = getBiomeById(snap.biome);
      if (targetBiome) {
        this.currentBiome = targetBiome;
        this.world.applyTheme(targetBiome.theme);
        this.spawner.setBiome(targetBiome.id);
        this.ui.hud.showBanner(`🌀 PORTAL! Entrando em: ${targetBiome.name}`, '#00f5d4', 3.0);
      }
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
    this.spawner.update(dt, this.speed, this.score, this.players);
    this.particles.update(dt, this.speed);
    this.narrator.update(dt);

    const myDino = this.players.find((p) => p.peerId === this.net.peerId) || this.players[0];
    if (myDino) {
      this.ui.hud.updatePlayStatus(
        myDino,
        Save.data.eggs,
        this.currentBiome.name,
        Math.ceil((this.score + 1) / 1000) * 1000,
        this.combo,
        this.score
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
    const camPlayers = myDino && !myDino.dead ? [myDino] : this.players.filter((x) => !x.dead);
    this.cameraRig.update(
      dt,
      camPlayers.length > 0 ? camPlayers : this.players,
      this.speed,
      Save.data.settings.accessibility.reduceShake,
      this.photoMode,
      this.spectatorMode
    );
    this.tvHud.updatePlayers(this.players, this.multiplayerSession.elimTimer, this.spectatorMode);
  }

  _flushStartBanners() {
    if (!this._pendingStartBanners?.length) return;
    const first = this._pendingStartBanners.shift();
    this.ui.hud.showBanner(first.text, first.color, first.dur);
    this._pendingStartBanners.length = 0;
  }

  _updatePredatorIntro(dt) {
    const pred = this.events.predators;
    if (!pred || pred.state !== 'intro') return false;

    // Pausa corrida, velocidade, pontuação, obstáculos e eventos durante a apresentação inicial estilo Subway Surfers
    this.speed = 0;
    this.cameraRig.setPredatorFocus(null);

    for (const p of this.players) {
      if (!p.dead) {
        p.vy = 0;
        p.y = 0;
        p.grounded = true;
        p.sliding = false;
        p.model.root.position.set(p.x, p.baseY || 0, p.z);
        p.animator.update(dt, { speed: 0, grounded: true, vy: 0, ducking: false });
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

    // Velocidade progressiva + bônus de turbo/slide + dificuldade adaptativa
    const baseDiff = this.difficultyMgr.getConfig();
    let adaptiveMult = 1.0;
    if (this.difficultyMgr.adaptive && p0) {
      if (p0.hp <= 1 && p0.maxHp > 1) {
        adaptiveMult = 0.88;
        this.spawner.setDensity(baseDiff.density * 0.8);
      } else if (this.combo >= 4 && p0.hp >= p0.maxHp) {
        adaptiveMult = 1.12;
        this.spawner.setDensity(baseDiff.density * 1.18);
      } else {
        this.spawner.setDensity(baseDiff.density);
      }
    }

    // Soft-cap nos multiplicadores de velocidade para evitar aceleração insana com buffs empilhados
    let speedMult = adaptiveMult * (p0 ? StatusSystem.getSpeedMultiplier(p0) : 1) * (p0?.speedBonus || 1);
    if (p0?.inWater && p0?.mutationMods?.waterSpeedMult) {
      speedMult *= p0.mutationMods.waterSpeedMult;
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

    // Curva de velocidade não-linear por fases & teto rígido jogável
    const phase = Math.floor(this.score / 850);
    const phaseProgress = (this.score % 850) / 850;
    const phaseCurve = Math.log1p(phase * 0.85) * 3.8 + this.score * (this.speedAccel * 0.58);
    const waveRelief = phaseProgress < 0.16 ? 0.90 : (0.98 + Math.sin(phaseProgress * Math.PI) * 0.06);
    const bossRelief = this.events.bosses.activeBoss ? 0.94 : 1.0;
    const rawSpeed = Math.min(this.maxSpeed, this.baseSpeed + phaseCurve) * waveRelief * bossRelief * speedMult;
    const hardSpeedCeiling = this.maxSpeed * (hasBoost ? 1.22 : 1.08);
    this.speed = Math.max(this.baseSpeed * 0.65, Math.min(hardSpeedCeiling, rawSpeed));
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

    // Transição de bioma por portal a cada ~1000 pontos (ou Modo História)
    if (this.sequenceBiomes && this.modeId !== 'story') {
      const targetIdx = Math.floor(this.score / 1000) % BIOMES.length;
      const targetBiome = BIOMES[targetIdx];
      if (targetBiome && targetBiome.id !== this.currentBiome.id) {
        this.currentBiome = targetBiome;
        this.world.applyTheme(targetBiome.theme, false);
        this.spawner.setBiome(targetBiome.id);
        this._syncEnvironmentHabitat(p0);
        this.ui.hud.showBanner(`🌀 PORTAL! Entrando em: ${targetBiome.name}`, '#00f5d4', 3.5);
        this._discoverCurrentBiomeFossil();
        if (targetBiome.id === 'jurassic_river') Save.unlockAchievement('river_king');
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
          if (pl.peerId && pl.peerId !== this.net.peerId) {
            this.net.broadcastCardOffer(pl.peerId, choices.map((c) => ({
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
        for (const ln of lanes) {
          this.spawner._acquire(this.waveIndex % 2 === 0 ? 'scorpion' : 'cactus_tall', LANE_X[ln], 0, -64);
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
      this.world.setSubmergedVisuals(isSub);
    }

    // Coop: reviver parceiro caído ficando perto por 3s
    if (this.modeId === 'coop' && this.players.length === 2) {
      const [a, b] = this.players;
      if (a.dead && !b.dead && Math.abs(a.x - b.x) < 1.8) {
        a.reviveProgress += dt;
        if (a.reviveProgress >= 3) {
          a.dead = false;
          a.hp = 1;
          a.reviveProgress = 0;
          this.ui.hud.showBanner('💚 PARCEIRO REVIVIDO!', '#58d63a', 2.5);
        }
      } else if (b.dead && !a.dead && Math.abs(a.x - b.x) < 1.8) {
        b.reviveProgress += dt;
        if (b.reviveProgress >= 3) {
          b.dead = false;
          b.hp = 1;
          b.reviveProgress = 0;
          this.ui.hud.showBanner('💚 PARCEIRO REVIVIDO!', '#58d63a', 2.5);
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
    this.cameraRig.setPredatorFocus(null);

    this.abilities.update(worldDt, this.spawner, this.particles, () => {
      this.addScore(45 * this.combo);
    });

    this.companions.update(dt, p0, this.spawner, () => this._collectEgg(p0, false));

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
    for (const p of this.players) {
      if (p.dead) continue;
      const pBox = PhysicsCollision.getPlayerBox(p);

      for (const obs of activeObs) {
        if (obs.hit) continue;

        if (PhysicsCollision.checkNearMiss(pBox, obs)) {
          obs.nearMissed = true;
          this.combo = Math.min(10, this.combo + 1);
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.comboDecayTimer = 4.5;
          p.resonanceWindow = 0.55;
          p.abilityCharge = Math.min(100, (p.abilityCharge ?? 100) + 18);
          p.fury = Math.min(100, p.fury + (p.spec.dinoClass === 'carnivore' ? 18 : 13) * (p.furyChargeMult || 1));
          this.addScore(25 * this.combo);
          this.sfx.nearMiss();
          this.narrator.say('nearMiss');
          this.ui.hud.showFloatText(`QUASE! x${this.combo}`, '#ffd447');
        }

        if (!PhysicsCollision.checkObstacleHit(pBox, obs)) continue;

        // Coletáveis e interativos
        if (obs.kind === 'egg') {
          obs.hit = true;
          obs.pool?.release(obs);
          this._collectEgg(p, obs.eggTier || (obs.isGold ? 5 : 1), !!obs.isMystery);
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
            const idx = (BIOMES.findIndex((b) => b.id === this.currentBiome.id) + 1) % BIOMES.length;
            const nextB = BIOMES[idx];
            if (nextB) {
              this.currentBiome = nextB;
              this.world.applyTheme(nextB.theme, false);
              this.spawner.setBiome(nextB.id);
              this._syncEnvironmentHabitat(p);
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
          Save.data.crystals = (Save.data.crystals || 0) + 1;
          Save.save();
          this.runEggs += gold;
          this.sfx.pickupRarity('épica');
          this.ui.hud.triggerEdgeFlash('épica');
          this.addScore(180 * this.combo, p);
          this.ui.hud.showBanner(`💎 BAÚ DO TESOURO! +${gold} 🥚 & +1 💎!`, '#ffd447', 2.8);
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

        // Fúria / Carga / Mergulho / Ataque Básico destroem o obstáculo!
        if (p.furyTimer > 0 || p.ramTimer > 0 || p.diveTimer > 0 || (p.attackTimer > 0 && obs.breakable)) {
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
      ? this.players.find((x) => x.peerId === this.net.peerId)
      : null) || this.players.find((x) => !x.dead) || p0;
    if (lead) {
      this.world.updatePlayerFocus(lead.x, (lead.baseY || 0) + lead.y, lead.z, this.currentBiome?.theme?.edgeGlow || '#fde047');
      this.ui.hud.updatePlayStatus(
        lead,
        Save.data.eggs,
        this.currentBiome.name,
        Math.ceil((this.score + 1) / 1000) * 1000,
        this.combo,
        this.score
      );
      if (this.multiplayerSession?.active) {
        const modeTag = this.multiplayerSession.mpMode === 'duel'
          ? 'DUELO PvP'
          : (this.multiplayerSession.elimination ? 'ELIMINAÇÃO' : 'CORRIDA');
        const sdTag = this.multiplayerSession.suddenDeath ? ' • 🔥 MORTE SÚBITA!' : '';
        this.ui.hud.setMpRankHud(
          `🏁 #${lead.rank || 1}/${this.players.length} • ${Math.floor(lead.score || 0)} pts (${modeTag})${sdTag}`,
          lead.rank === 1 ? '#fde047' : '#93c5fd'
        );
        const myPlayer = this.players.find((pl) => pl.peerId === this.net.peerId) || lead;
        const fallenAlly = this.players.find((pl) => pl !== myPlayer && pl.dead);
        const revCost = 45 + (this._mpReviveCount || 0) * 35;
        const totalAvailable = (this.runEggs || 0) + (Save.data.eggs || 0);
        this.ui.hud.setMpReviveHud({
          visible: Boolean(
            this.multiplayerSession.allowRevive !== false &&
            fallenAlly &&
            myPlayer &&
            !myPlayer.dead &&
            this.players.length >= 2
          ),
          canAfford: totalAvailable >= revCost,
          cost: revCost,
          allyName: fallenAlly?.name || fallenAlly?.spec?.name || 'Aliado'
        });
      } else {
        this.ui.hud.setMpReviveHud({ visible: false });
      }
    }
    this.ui.hud.updateScore(Math.max(this.hiScore, this.score), this.score, this.speed / this.baseSpeed);
    const dangerLevel = (this.events.bosses.activeBoss || this.events.ufo.active || (lead && lead.hp <= 1)) ? 1 : 0;
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
      const activeCamList = camPlayers.length > 0 ? camPlayers : this.players;
      this.cameraRig.update(
        dt,
        activeCamList,
        this.speed,
        Save.data.settings.accessibility.reduceShake,
        this.photoMode,
        this.spectatorMode,
        this._buildCameraEnvOpts(lead || activeCamList[0])
      );
    }
    if ((this._skipIntroGuardFrames || 0) > 0) this._skipIntroGuardFrames--;

    if (this.multiplayerSession?.active) {
      this.tvHud.updatePlayers(this.players, this.multiplayerSession.elimTimer, this.spectatorMode);
      this.multiplayerSession.netSnapAccum += dt;
      if (this.multiplayerSession.isHost && this.multiplayerSession.netSnapAccum >= 0.055) {
        this.multiplayerSession.netSnapAccum = 0;
        this.net.broadcastHostSnapshot({
          score: Math.floor(this.score),
          distance: Math.floor(this.distance),
          speed: Math.round(this.speed * 10) / 10,
          biome: this.currentBiome.id,
          mpMode: this.multiplayerSession.mpMode,
          suddenDeath: !!this.multiplayerSession.suddenDeath,
          elimTimer: this.multiplayerSession.elimTimer,
          players: this.players.map((pl) => ({
            peerId: pl.peerId,
            name: pl.name,
            lane: pl.lane,
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
            attackCd: Math.round((pl.attackCooldown || 0) * 100) / 100,
            attackMaxCd: pl.attackMaxCooldown || 1.25,
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
        this._triggerFirstUseSpotlight('spotlight_item', {
          icon: '🎒',
          title: 'Item Guardado na Mochila!',
          desc: 'Pressione [E] durante a corrida para usar o item ativo na sua mochila no momento certo!',
          selector: '.backpack-pill',
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

    if (this.input.wasKeyJustPressed('F9')) {
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
    // Emotes rápidos (1, 2, 3) & Reviver Aliado Multiplayer (V)
    if (this.state === 'playing') {
      if (this.input.wasKeyJustPressed('Digit1')) this.ui.hud.showFloatText('🎉 VAMOOO!', '#58d63a');
      if (this.input.wasKeyJustPressed('Digit2')) this.ui.hud.showFloatText('😜 HEHE!', '#ff9a24');
      if (this.input.wasKeyJustPressed('Digit3')) this.ui.hud.showFloatText('🆘 SOCORRO!', '#38bdf8');
      if (this.input.wasKeyJustPressed('KeyV') && (this.multiplayerSession?.active || this.players.length >= 2)) {
        this.reviveFallenAlly(0);
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
    this._updateGlobalKeys();
    this.ui.hud.tickTimers(dt);

    if (this.spotlightActive) {
      this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
      return;
    }

    if (this.ui?.controllerInstance) {
      this.input.endFrame();
      return;
    }

    if (this.state === 'menu') {
      this.world.update(dt, 14);
      this.dayNight.update(dt, this.currentBiome.theme);
      this.particles.update(dt, 14);
      for (const p of this.players) {
        p.animator.update(dt, { speed: 14, grounded: true });
      }
      if (this.players[0]) {
        this.world.updatePlayerFocus(this.players[0].x, this.players[0].y, this.players[0].z, '#fde047');
      }
      this.cameraRig.update(dt, { x: -1.4, y: 0.2, z: 0 }, 14, true, false);
    } else if (this.state === 'playing') {
      this._updatePlaying(dt);
    } else if (this.state === 'gameover') {
      for (const p of this.players) {
        if (p.dead) p.animator.update(dt, { dead: true });
      }
      this.particles.update(dt, 4);
      this.cameraRig.update(dt, this.players[0]?.model.root.position, this.baseSpeed, false, false);
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
        this.cameraRig.update(dt, p0.model.root.position, 22, true, false);
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
      this.cameraRig.update(dt, this.players[0]?.model.root.position, this.speed, true, true);
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
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
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
        const w = window.innerWidth;
        const h = Math.max(1, window.innerHeight);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(0, 0, w, h);
        this._wasSplitRender = false;
      }
      this.renderer.render(this.scene, this.camera);
    }
    this.input.endFrame();
  }

  destroy() {
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
