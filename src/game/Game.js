// Motor completo do DINO DASH 3D: integra Essencial, Avançado e Bônus em arquitetura modular.
import * as THREE from 'three';
import { Save } from '../systems/Save.js';
import { InputSystem } from '../systems/Input.js';
import { CameraRig } from '../systems/CameraRig.js';
import { ParticleSystem } from '../systems/Particles.js';
import { World, LANE_X } from '../world/World.js';
import { BIOMES, getBiomeById } from '../world/Biomes.js';
import { DayNightCycle } from '../world/DayNightCycle.js';
import { WeatherSystem } from '../world/Weather.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { DinoAnimator } from '../dinos/DinoAnimator.js';
import { DinoAbilities } from '../dinos/DinoAbilities.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { getActivePreset, rollRandomMutation } from '../dinos/DinoCustomization.js';
import { CompanionManager } from '../dinos/Companion.js';
import { Spawner } from '../systems/Spawner.js';
import { PhysicsCollision } from '../systems/PhysicsCollision.js';
import { Backpack } from '../systems/Items.js';
import { CARD_MILESTONES, CARD_POOL, drawThreeCards } from '../systems/Cards.js';
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

    this.input = new InputSystem();
    this.cameraRig = new CameraRig(this.camera);
    this.world = new World(this.scene);
    this.dayNight = new DayNightCycle(this.scene, this.world);
    this.weather = new WeatherSystem(this.scene, this.world);
    this.particles = new ParticleSystem(this.scene);
    this.spawner = new Spawner(this.scene);
    this.abilities = new DinoAbilities(this.scene);
    this.companions = new CompanionManager(this.scene);
    this.events = new EventManager(this.scene);
    this.difficultyMgr = new DifficultyManager();

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
    this.pendingRestart = false;
    this.restartPrevState = 'playing';
    this.tutorialState = null;
    this.seenHints = new Set();

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
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._onResize);

    // Desbloqueio WebAudio + toque/clique para escapar do OVNI + Konami Easter Egg
    this._unlockAudio = () => this.audio.ensureContext();
    this._onCanvasPointer = () => {
      if (this.state === 'playing' && this.events.ufo.active) {
        this.events.ufo.mashBreak();
      }
    };
    window.addEventListener('pointerdown', this._unlockAudio, { passive: true });
    this.canvas.addEventListener('pointerdown', this._onCanvasPointer);
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
    const pr = s.quality === 'low' ? 1 : (s.quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1.4);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = s.shadows;
    this.world.setShadowEnabled(s.shadows);
    this.cameraRig.baseFov = s.fov || 58;
    this.camera.far = Save.data.lowSpecMode ? 145 : 260;
    this.camera.updateProjectionMatrix();
    this.spawner.setObstacleHints(s.obstacleHints !== false);
    this.audio.applyVolumes();
    if (this.multiplayerSession?.active) {
      this.tvHud.setVisible(true, !!Save.data.network?.tvScale);
    }
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
        onAgain: () => this.ui.hud.showBanner('⏳ Aguardando o Dono da Sala iniciar a próxima rodada...', '#38bdf8', 2.6),
        onMenu: () => this.openMainMenu()
      });
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
    this.ui.hud.showBanner(`🌍 Bioma alterado para: ${this.currentBiome.name}`, '#00f5d4', 2.8);
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
    if (p.attackTimer > 0 || (p.attackCooldown || 0) > 0) return;
    p.attackTimer = 0.24;
    p.attackCooldown = p.attackMaxCooldown || 1.25;
    p.animator.triggerRoar(0.25);
    this.sfx.melee();
    this.particles.emitDust(p.x, 0.8, p.z - 0.9, 6, '#ffd447', 2.4);

    let brokeAny = false;
    for (const obs of this.spawner.getActiveObstacles()) {
      if (obs.hit || !obs.breakable) continue;
      const dx = Math.abs(obs.group.position.x - p.x);
      const dz = obs.group.position.z - p.z;
      if (dx < 1.35 && dz > -4.8 && dz < 1.3) {
        obs.hit = true;
        obs.pool?.release(obs);
        this.particles.emitExplosion(obs.group.position.x, 0.8, obs.group.position.z, obs.color, 12, true);
        this._spawnImpactDebris(obs.group.position.x, obs.group.position.z, obs.color);
        p.wantedStars = Math.min(5, (p.wantedStars || 0) + 0.3);
        this.addScore(35 * this.combo, p);
        this.ui.hud.showFloatText('💥 QUEBROU! +35', '#ffd447');
        brokeAny = true;
      }
    }

    if (brokeAny && this.tutorialState?.active && this.tutorialState.step === 3) {
      this._advanceTutorialStep();
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

  rebuildPlayers(customRoster = null) {
    this._clearPlayersFromScene();
    const modeDef = getModeDef(this.modeId);
    const diff = this.difficultyMgr.getConfig();
    const talents = Save.data.talents || {};
    const vitalityBonus = Math.floor((talents.vitality || 0) / 2);
    const baseHp = (this.modeId === 'hardcore' ? 1 : diff.lives) + vitalityBonus;
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
      const modelCfg = {
        ...localCustom,
        ...(slot.color ? { useCustomColors: true, primary: slot.color } : {}),
        ...(i === 0 ? { hybrid: Save.data.hybrid, season: activeSeason, partyCrown: hasCrown } : { season: activeSeason })
      };
      const model = DinoFactory.build(dinoId, modelCfg, { allowHybrid: i === 0 && !!Save.data.hybrid?.enabled });
      const startLane = count === 1 ? 1 : (i % 3);
      const laneOffset = count > 3 ? ((Math.floor(i / 3) - 0.5) * 0.45) : 0;
      model.root.position.set(LANE_X[startLane] + laneOffset, 0, Math.floor(i / 3) * 0.65);
      this.scene.add(model.root);

      const startShields = spec.dinoClass === 'herbivore' && this.modeId !== 'hardcore' ? 1 : 0;

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
        hp: baseHp,
        maxHp: baseHp,
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
        bulletEnergy: 100,
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
        smallHitbox: dinoId === 'compsognathus'
      });
    }
  }

  openMainMenu() {
    this.state = 'menu';
    this.photoMode = false;
    this.spectatorMode = false;
    this.pendingRestart = false;
    this.tutorialState = null;
    this.multiplayerSession = null;
    this.tvHud.setVisible(false);
    this.cameraRig.setFocusPlayer(null);
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

    const matchSeed = this.customSeed || `MP-${room?.code || 'DINO'}-${Math.floor(Math.random() * 9999)}`;
    const mpMode = room?.mpMode || (room?.elimination ? 'elimination' : 'race');
    const isElim = mpMode === 'elimination' || !!room?.elimination;
    this.multiplayerSession = {
      active: true,
      isHost: this.net.isHost,
      room,
      roster,
      botCount,
      seed: matchSeed,
      mpMode,
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
      elim: isElim,
      partyMode: this.multiplayerSession.partyMode,
      biomeId: this.startBiomeId
    });
    this.startRun(false, { keepMultiplayerSession: true, roster, seed: matchSeed, biomeId: this.startBiomeId });
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
    this.multiplayerSession = {
      active: true,
      isHost: false,
      room,
      roster,
      botCount: payload.botCount || 0,
      seed: payload.seed || room.seed || `MP-${room.code || 'GUEST'}`,
      mpMode,
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
    this.merchantUses = 0;
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
    this.slowMoTimer = 0;
    this.decoyTimer = 0;
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
    this.hiScore = Save.getHighScore();

    // Seed determinística para Desafio Diário, Multiplayer ou Seed compartilhável
    const seed = opts.seed || this.activeCustomTrack?.seed || (this.modeId === 'daily_challenge' ? getTodaySeed() : this.customSeed);
    this.spawner.setSeed(seed);
    this.spawner.setDensity(diff.density * (this.activeCustomTrack?.obstacleRate || 1.0));
    this.events.configure(diff.eventFreq, diff.enabledEvents);

    // Bioma inicial (Modo História começa no capítulo 1)
    const startId = opts.biomeId || (this.modeId === 'story' ? STORY_CHAPTERS[0].biome : this.startBiomeId);
    this.currentBiome = getBiomeById(startId);
    this.world.applyTheme(this.currentBiome.theme);
    this.spawner.setBiome(this.currentBiome.id);

    // Mutação aleatória divertida na partida (1 por corrida em modos normais)
    if (!isTestTrack && this.players[0]) {
      const mut = rollRandomMutation();
      this.activeMutation = mut;
      if (mut.id === 'bouncy') this.players[0].jumpMult = 1.15;
      if (mut.id === 'tiny_core') this.players[0].smallHitbox = true;
      this.ui.hud.showBanner(`🧬 Mutação da Partida: ${mut.name} (${mut.desc})`, '#c084fc', 3.4);
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

    // Ovo Dourado visível no modo Captura o Ovo
    if (this.modeId === 'capture_egg') {
      this.goldenEggProp = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.58, 0.46),
        new THREE.MeshStandardMaterial({
          color: '#ffd447',
          emissive: '#ff9f1c',
          emissiveIntensity: 0.75,
          metalness: 0.5,
          roughness: 0.2
        })
      );
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

    // Tutorial curto na 1ª partida
    if (!Save.data.tutorialDone) {
      Save.data.tutorialDone = true;
      Save.save();
      this.ui.hud.showBanner('Dica: Use W/↑ para pular, S/↓ para abaixar/deslizar e A/D para trocar de faixa!', '#58d63a', 4.5);
    }

    this.ui.hud.setSharedRolesHint(
      this.modeId === 'shared_controls' ? '👥 A: Move faixas (A/D) | B: Pulo/Abaixar/Habilidade (↑/↓/Enter)' : ''
    );
    this.ui.hud.setCameraLabel(this.cameraRig.currentMode.label);
    this.replay.reset();
    this.music.setPlaying(true);
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
    if (this.merchantUses <= 0) return 20;
    if (this.merchantUses === 1) return 30;
    return 45;
  }

  buyFromMerchant() {
    const cost = this._getMerchantCost();
    if (Save.data.eggs < cost) {
      this.ui.hud.showFloatText(`Precisa de ${cost} ovos!`, '#ff4757');
      return;
    }
    Save.addEggs(-cost);
    this.merchantUses++;
    const p = this.players[0];
    if (p) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      p.shields = Math.min(4, p.shields + 1);
      this.sfx.powerup();
      this.ui.hud.showFloatText('+1 VIDA & ESCUDO!', '#58d63a');
    }
    this.ui.hud.hideMerchant();
  }

  applyPickedCard(card) {
    if (this.multiplayerSession?.active && !this.multiplayerSession.isHost) {
      this.net.sendCardPick(card);
      this.sfx.card(card.rarity === 'lendária');
      this.ui.hud.showFloatText(`CARTA ENVIADA: ${card.name}!`, '#ffd447');
      this.state = 'playing';
      return;
    }
    for (const p of this.players) {
      if (!p.dead) card.apply(p, this);
    }
    this.sfx.card(card.rarity === 'lendária');
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
    this.score += pts;
    if (player && !player.dead) {
      player.score = (player.score || 0) + pts;
    }
  }

  showFloatText(player, text, color = '#ffd447') {
    this.ui.hud.showFloatText(text, color);
  }

  _eventContext() {
    return {
      scene: this.scene,
      spawner: this.spawner,
      cameraRig: this.cameraRig,
      particles: this.particles,
      weather: this.weather,
      dayNight: this.dayNight,
      sfx: this.sfx,
      narrator: this.narrator,
      currentBiome: this.currentBiome,
      playerCount: this.players.length,
      decoyTimer: this.decoyTimer,
      addScore: (v, p) => this.addScore(v, p),
      showBanner: (t, c, d) => this.ui.hud.showBanner(t, c, d),
      showFloatText: (p, t, c) => this.ui.hud.showFloatText(t, c),
      damagePlayer: (p, cause = 'event') => this._damagePlayer(p, cause),
      onMerchantEncounter: () => {
        this.ui.hud.setMerchantCost(this._getMerchantCost());
        this.ui.hud.showMerchant();
      },
      onBossHudUpdate: (b) => this.ui.hud.setBossHud(b),
      onUfoHudUpdate: (a, t, pr) => this.ui.hud.setUfoHud(a, t, pr),
      onChaserHudUpdate: (a, d) => this.ui.hud.setChaserHud(a, d),
      clearNearbyObstacles: (x, z, radius, stunOnly) => this._clearNearbyObstacles(x, z, radius, stunOnly),
      healPartner: (source) => {
        for (const p of this.players) {
          if (p !== source && !p.dead) p.hp = Math.min(p.maxHp, p.hp + 1);
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
      if (obs.hit || ['egg', 'powerup', 'ramp', 'campfire', 'shortcut', 'fruit', 'elemental_egg', 'treasure', 'grapple_point', 'gravity_zone', 'minecart_zone', 'river_log', 'bifurcation'].includes(obs.kind)) continue;
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
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshStandardMaterial({ color: color || '#ffd447' })
    );
    mesh.position.set(x, 0.6, z);
    this.scene.add(mesh);
    this.impactDebris.push({ mesh, vx: (Math.random() - 0.5) * 4, vy: 5.5, vz: -34, life: 1.4 });
  }

  _clearDebris() {
    for (const d of this.impactDebris) this.scene.remove(d.mesh);
    this.impactDebris = [];
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
      this.sfx.click();
      this.ui.hud.showFloatText('FILHOTE BLOQUEOU!', '#58d63a');
      return;
    }

    if (p.shields > 0) {
      p.shields -= 1;
      p.invulnTimer = 1.6;
      this.sfx.hurt();
      this.cameraRig.triggerShake(0.38, 0.22);
      this.ui.hud.showFloatText('ESCUDO QUEBRADO!', '#38bdf8');
      return;
    }

    const dmg = this.modeId === 'pvp' ? (this.difficultyMgr.getConfig().pvpDamage || 1) : 1;
    p.hp -= dmg;
    p.animator.triggerHurt(1.2);
    p.invulnTimer = 1.6 + (p.postHitInvulnBonus || 0);
    this.combo = 1;
    this.sfx.hurt();
    this.narrator.say('hurt');
    this.cameraRig.triggerShake(0.6, 0.32);
    this.particles.emitExplosion(p.x, p.y + 0.9, p.z, p.model.colors.primary, 16, true);

    if (p.hp <= 0) {
      if (p.campfireSaved) {
        p.campfireSaved = false;
        p.hp = 1;
        p.invulnTimer = 2.5;
        this.sfx.evolution();
        this.ui.hud.showBanner('🔥 REVIVIDO PELA FOGUEIRA CHECKPOINT!', '#ff9a24', 3);
        return;
      }
      p.hp = 0;
      p.dead = true;
      p._lastDeathCause = cause;
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
        onAgain: () => this.restartRun(),
        onMenu: () => this.openMainMenu()
      });
      return;
    }

    this.lastPodiumSummary = null;
    this.lastGameOverArgs = {
      title: displayTitle,
      score: finalScore,
      hiScore: this.hiScore,
      isNewRecord,
      distance: this.distance,
      eggs: this.runEggs,
      maxCombo: this.maxCombo,
      dinoId: this.players[0]?.id || 'trex'
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
      furyJust = this.input.wasKeyJustPressed('KeyF');
      itemJust = this.input.wasKeyJustPressed('KeyE');
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
      furyJust = isLocalMain && this.input.wasKeyJustPressed('KeyF');
      itemJust = isLocalMain ? this.input.wasKeyJustPressed('KeyE') : this.input.wasActionJustPressed(inKey, 'item', false);
    }

    // Regra do Modo Caos ou Modo Espelhado: controles invertidos!
    if (this.activeChaosRule?.id === 'inverted' || Save.data.mirroredMode) {
      [leftJust, rightJust] = [rightJust, leftJust];
    }

    // Vento ou correnteza do bioma empurram suavemente
    const envWind = (this.weather.windForce || 0) + (this.currentBiome.windBias || 0) + (p.spec.dinoClass === 'aquatic' ? 0 : (this.currentBiome.currentForce || 0));

    if (leftJust && p.lane > 0) {
      p.lane--;
      this.sfx.dash();
      this.particles.emitDust(p.x, 0.2, p.z, 3, '#ffd447', 1.4);
      if (this.tutorialState?.active && this.tutorialState.step === 0 && p.index === 0) {
        this.tutorialState.progress++;
        this._syncTutorialHud();
        if (this.tutorialState.progress >= 2) this._advanceTutorialStep();
      }
    }
    if (rightJust && p.lane < 2) {
      p.lane++;
      this.sfx.dash();
      this.particles.emitDust(p.x, 0.2, p.z, 3, '#ffd447', 1.4);
      if (this.tutorialState?.active && this.tutorialState.step === 0 && p.index === 0) {
        this.tutorialState.progress++;
        this._syncTutorialHud();
        if (this.tutorialState.progress >= 2) this._advanceTutorialStep();
      }
    }

    const laneSpeed = 16 * (p.laneSpeedMult || 1);
    const targetX = LANE_X[p.lane] + (p.xOffset || 0) + Math.sin(this.runTime * 2) * (Math.abs(envWind) > 0.2 ? envWind * 0.15 : 0);
    const prevX = p.x;
    p.x += (targetX - p.x) * Math.min(1, dt * laneSpeed);
    const laneLean = (p.x - prevX) / Math.max(dt, 0.001) * 0.055;

    // Pulo + Salto Duplo (Compsognathus) + Pulo Carregado
    const jumpMult = (p.jumpMult || 1) * (p.spec.stats.jump >= 9 ? 1.1 : 1.0);
    if (jumpJust) {
      if (this.events.ufo.active && this.events.ufo.mashBreak()) {
        // Quebrou o feixe do OVNI!
      } else if (p.grounded) {
        p.vy = 13.8 * jumpMult;
        p.grounded = false;
        p.ducking = false;
        p.sliding = false;
        p.jumpHoldTimer = 0.18;
        this.runJumps++;
        this.sfx.jump(false);
        this.particles.emitDust(p.x, 0.12, p.z + 0.2, 6, '#f2c57c', 2.2);
        if (this.tutorialState?.active && this.tutorialState.step === 1 && p.index === 0) {
          this.tutorialState.progress++;
          this._syncTutorialHud();
          if (this.tutorialState.progress >= 2) this._advanceTutorialStep();
        }
      } else if (p.extraJumps > 0) {
        p.extraJumps--;
        p.vy = 13.0 * jumpMult;
        this.sfx.jump(true);
        this.particles.emitDust(p.x, p.y, p.z, 8, '#90e0ef', 2.4);
      }
    }

    // Pulo carregado enquanto segura a tecla nos primeiros instantes da subida
    if (jumpHeld && p.jumpHoldTimer > 0 && p.vy > 0) {
      p.jumpHoldTimer -= dt;
      p.vy += 17 * dt;
    }

    // Abaixar / Deslizar (abaixar em movimento no chão dá deslizada com impulso)
    if (duckHeld) {
      if (!p.grounded) {
        p.vy = Math.min(p.vy, -20);
        p.ducking = true;
      } else if (!p.sliding && !p.ducking) {
        p.sliding = true;
        p.slideTimer = 0.55;
        this.sfx.slide();
      }
      p.ducking = true;
    } else {
      p.ducking = false;
    }

    if (p.sliding) {
      p.slideTimer -= dt;
      if (p.slideTimer <= 0 || !duckHeld) p.sliding = false;
    }

    // Ataque Básico / Mordida / Destruir Cactos (Q)
    if (attackJust) {
      this._performMeleeAttack(p);
    }

    // Habilidade Especial (também quebra o feixe do OVNI se capturado!)
    if (abilityJust) {
      if (this.events.ufo.active && this.events.ufo.mashBreak()) {
        // Escapando do feixe do OVNI!
      } else {
        const activated = this.abilities.activate(p, this._eventContext());
        if (activated) {
          Metagame.recordSkill(p.id);
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
    if (furyJust && p.fury >= 100 && p.furyTimer <= 0) {
      p.fury = 0;
      p.furyTimer = 6.0;
      this.sfx.fury();
      this.narrator.say('fury');
      this.ui.hud.showBanner(`🔥 ${p.name}: MODO FÚRIA ATIVADO!`, '#ff5e1a', 2.5);
    }

    // Mochila (E ou botão do controle remoto)
    if (itemJust) {
      this.usePlayerItem(p.index);
    }

    // Garante que qualquer evento (OVNI, montaria, foguete encerrado) retorne o dino à gravidade
    if (p.y > 0.01 && p.rocketTimer <= 0 && p.grappleTimer <= 0 && p.riverLogTimer <= 0) {
      p.grounded = false;
    }

    // Gravidade (Planeta Alienígena, Modo Caos, Pista Customizada ou Zonas Gravitacionais + Planar)
    let gravMult = (this.activeChaosRule?.id === 'low_grav' ? 0.55 : (this.currentBiome.lowGravity || 1.0))
      * (this.activeCustomTrack?.gravityScale || 1.0);
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
      p.vy -= 34.0 * gravMult * dt;
      // Planar no ar (#108): segurar Pulo ao descer reduz queda
      if (jumpHeld && p.vy < -2.2) {
        p.vy = Math.max(p.vy, -4.4);
      }
      p.y += p.vy * dt;
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.grounded = true;
        p.extraJumps = p.id === 'compsognathus' ? 1 : 0;
        p.resonanceWindow = 0.45;
        p.animator.triggerLandSquash();
        this.sfx.land();
        const landFx = getActivePreset(p.key).landingEffect;
        if (landFx === 'sparks') {
          this.particles.emitExplosion(p.x, 0.14, p.z, '#ff9a24', 10, false);
        } else if (landFx === 'shockwave') {
          this.particles.emitExplosion(p.x, 0.14, p.z, '#ffd447', 12, true);
        } else {
          this.particles.emitDust(p.x, 0.12, p.z, 7, '#f2c57c', 2.5);
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

    // Temporizadores de buffs e recargas
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.abilityCooldown > 0) p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
    if (p.abilityDuration > 0) p.abilityDuration = Math.max(0, p.abilityDuration - dt);
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
        this.particles.emitDust(p.x, 0.08, p.z + 0.35, 1, trailColor, 0.9);
      }
    }

    p.model.root.position.set(p.x, p.y - (p.diveTimer > 0 ? 0.55 : 0), p.z);
    p.animator.update(dt, {
      speed: this.speed,
      grounded: p.grounded,
      vy: p.vy,
      ducking: p.ducking,
      sliding: p.sliding,
      swimming: this.currentBiome.waterTrack,
      dead: p.dead,
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

  _updatePlaying(dt) {
    const perfMsg = this.perf.recordFrame(dt, this);
    if (perfMsg) this.ui.hud.showBanner(perfMsg, '#38bdf8', 3.4);

    if (this.multiplayerSession?.active && !this.multiplayerSession.isHost) {
      this._updateMultiplayerGuest(dt);
      return;
    }

    // Bullet-Time (ShiftLeft)
    const bulletHeld = this.input.isActionDown('p1', 'bullet', false);
    const p0 = this.players[0];
    let timeScale = 1.0;
    if (bulletHeld && p0 && p0.bulletEnergy > 2) {
      timeScale = 0.42;
      p0.bulletEnergy = Math.max(0, p0.bulletEnergy - dt * 32);
    } else if (p0) {
      p0.bulletEnergy = Math.min(100, p0.bulletEnergy + dt * 14);
    }
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      timeScale = Math.min(timeScale, 0.55);
    }

    const worldDt = dt * timeScale;
    this.runTime += dt;

    // Velocidade progressiva + bônus de turbo/slide + dificuldade adaptativa
    const baseDiff = this.difficultyMgr.getConfig();
    let adaptiveMult = 1.0;
    if (this.difficultyMgr.adaptive && p0) {
      if (p0.hp <= 1 && baseDiff.lives > 1) {
        adaptiveMult = 0.88;
        this.spawner.setDensity(baseDiff.density * 0.8);
      } else if (this.combo >= 4 && p0.hp >= p0.maxHp) {
        adaptiveMult = 1.12;
        this.spawner.setDensity(baseDiff.density * 1.18);
      } else {
        this.spawner.setDensity(baseDiff.density);
      }
    }

    let speedMult = adaptiveMult;
    if (p0?.turboTimer > 0 || p0?.rocketTimer > 0 || p0?.minecartTimer > 0) speedMult *= 1.42;
    if (p0?.sliding) speedMult *= 1.15;
    if (this.activeChaosRule?.id === 'turbo_frenzy') speedMult *= 1.38;
    if (this.currentBiome.speedMod) speedMult *= this.currentBiome.speedMod;

    // Morte Súbita Competitiva (>= 60s em Multiplayer)
    if (this.multiplayerSession?.active) {
      if (this.runTime >= 60 && !this.multiplayerSession.suddenDeath) {
        this.multiplayerSession.suddenDeath = true;
        this.sfx.roar('trex');
        this.ui.hud.showBanner('🔥 MORTE SÚBITA (60s+)! Velocidade +35% e Obstáculos Intensos!', '#ff4757', 4.0);
      }
      if (this.multiplayerSession.suddenDeath) {
        speedMult *= 1.35;
        this.spawner.setDensity(baseDiff.density * 1.35);
      }
    }

    this.speed = Math.min(this.maxSpeed, this.baseSpeed + this.score * this.speedAccel) * speedMult;
    this.distance += this.speed * worldDt;
    const scoreGain = this.speed * worldDt * 0.55 * (p0?.scoreCardMult || 1) * (p0?.scoreMultBonus || 1);
    this.score += scoreGain;
    for (const p of this.players) {
      if (!p.dead) {
        p.score = (p.score || 0) + this.speed * worldDt * 0.55 * (p.scoreCardMult || 1) * (p.scoreMultBonus || 1);
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
        this.world.applyTheme(targetBiome.theme);
        this.spawner.setBiome(targetBiome.id);
        this.ui.hud.showBanner(`🌀 PORTAL! Entrando em: ${targetBiome.name}`, '#00f5d4', 3.5);
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
        this.world.applyTheme(this.currentBiome.theme);
        this.spawner.setBiome(this.currentBiome.id);
        this.ui.hud.showBanner(`📖 ${nextCh.title}: ${nextCh.dialogue}`, '#ffd447', 4.5);
      }
    }

    // Marcos de Cartas (500, 1500, 3000...) e Evolução Visual
    if (!this.isTestTrack && this.nextCardIdx < CARD_MILESTONES.length && this.score >= CARD_MILESTONES[this.nextCardIdx]) {
      const milestone = CARD_MILESTONES[this.nextCardIdx];
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

    // Fogueira checkpoint e Atalho secreto eventuais
    if (Math.random() < worldDt * 0.025 && this.score > 220) this.spawner.spawnCampfire();
    if (Math.random() < worldDt * 0.02 && this.score > 300) this.spawner.spawnShortcutPortal();

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
    this.spawner.update(worldDt, this.speed, this.score, this.players);
    this.particles.update(worldDt, this.speed);
    this.events.update(worldDt, this.speed, this.score, this.players, this._eventContext());

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
          this._collectEgg(p, obs.isGold);
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

        if (obs.kind === 'shortcut') {
          obs.hit = true;
          obs.pool?.release(obs);
          p.invulnTimer = Math.max(p.invulnTimer, 2.5);
          this.spawnEggRain(5);
          this.ui.hud.showBanner('🕳️ ATALHO SECRETO! Escudo temporário + Ovos!', '#00f5d4', 3);
          continue;
        }

        if (obs.kind === 'fruit') {
          obs.hit = true;
          obs.pool?.release(obs);
          p.fury = Math.min(100, (p.fury || 0) + 18 * (p.furyChargeMult || 1));
          let bonusMsg = '🍉 FÚRIA +18%!';
          if (p.hp < p.maxHp && Math.random() < 0.35) {
            p.hp++;
            bonusMsg = '🍉 +1 VIDA & FÚRIA!';
          } else if (Math.random() < 0.25) {
            p.shields = Math.min(4, p.shields + 1);
            bonusMsg = '🍉 +ESCUDO & FÚRIA!';
          }
          this.sfx.egg(6);
          this.addScore(45 * this.combo, p);
          this.ui.hud.showFloatText(bonusMsg, '#4ade80');
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
          const gold = 7 + Math.floor((Save.data.talents?.greed || 0) * 1.5);
          Save.addEggs(gold);
          this.runEggs += gold;
          this.sfx.victory();
          this.addScore(180 * this.combo, p);
          this.ui.hud.showBanner(`💎 BAÚ DO TESOURO! +${gold} Ovos!`, '#ffd447', 2.8);
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
          this.particles.emitExplosion(obs.group.position.x, 0.8, obs.group.position.z, obs.color, 14, true);
          this._spawnImpactDebris(obs.group.position.x, obs.group.position.z, obs.color);
          this.sfx.stomp();
          p.wantedStars = Math.min(5, (p.wantedStars || 0) + 0.25);
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
      }
    }
    this.ui.hud.updateScore(Math.max(this.hiScore, this.score), this.score, this.speed / this.baseSpeed);
    const dangerLevel = (this.events.bosses.activeBoss || this.events.ufo.active || (lead && lead.hp <= 1)) ? 1 : 0;
    this.music.update(dt, this.speed, dangerLevel);
    this.narrator.update(dt);
    const camPlayers = this.players.filter((x) => !x.dead);
    this.cameraRig.update(
      dt,
      camPlayers.length > 0 ? camPlayers : this.players,
      this.speed,
      Save.data.settings.accessibility.reduceShake,
      this.photoMode,
      this.spectatorMode
    );

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
    if (this.seenHints.has(key)) return;
    this.seenHints.add(key);
    this.ui.hud.showBanner(msg, color, 2.8);
  }

  _applyElementalEgg(p, element) {
    const prev = p.element;
    const alchRadius = 24 * (1 + (Save.data.talents?.alchemy || 0) * 0.2);
    if (this.tutorialState?.active && this.tutorialState.step === 5 && p.index === 0) {
      this.tutorialState.elemCount = (this.tutorialState.elemCount || 0) + 1;
    }

    if ((prev === 'fire' && element === 'ice') || (prev === 'ice' && element === 'fire')) {
      p.element = null;
      this.sfx.reaction();
      this._clearNearbyObstacles(p.x, p.z, alchRadius * 1.4, false);
      this.addScore(180 * this.combo, p);
      this.ui.hud.showBanner('💨 REAÇÃO DE VAPOR! Fogo + Gelo limpou a pista!', '#e2e8f0', 2.8);
      if (this.tutorialState?.active && this.tutorialState.step === 5) this._advanceTutorialStep();
      return;
    }

    if ((prev === 'poison' && element === 'fire') || (prev === 'fire' && element === 'poison')) {
      p.element = null;
      this.sfx.reaction();
      p.fury = Math.min(100, (p.fury || 0) + 45);
      this._clearNearbyObstacles(p.x, p.z, alchRadius * 1.5, false);
      this.addScore(200 * this.combo, p);
      this.ui.hud.showBanner('💥 NOVA TÓXICA! Fúria + Explosão!', '#a3e635', 2.8);
      if (this.tutorialState?.active && this.tutorialState.step === 5) this._advanceTutorialStep();
      return;
    }

    if (element === 'lightning' && this.currentBiome.waterTrack) {
      p.element = 'lightning';
      this.sfx.reaction();
      this._clearNearbyObstacles(p.x, p.z, alchRadius * 1.35, false);
      this.addScore(160 * this.combo, p);
      this.ui.hud.showBanner('⚡ CHOQUE HIDRELÉTRICO! Rio eletrificado!', '#facc15', 2.8);
      if (this.tutorialState?.active && this.tutorialState.step === 5) this._advanceTutorialStep();
      return;
    }

    p.element = element;
    this.sfx.powerup();
    this.addScore(65 * this.combo, p);
    const icons = { fire: '🔥', ice: '❄️', lightning: '⚡', poison: '☠️' };
    this.ui.hud.showFloatText(`${icons[element] || '✨'} ELEMENTO ${element.toUpperCase()}!`, '#38bdf8');
    if (this.tutorialState?.active && this.tutorialState.step === 5 && (this.tutorialState.elemCount || 0) >= 2) {
      this._advanceTutorialStep();
    }
  }

  _collectEgg(p, isGold) {
    this.eggChain = Math.min(20, this.eggChain + 1);
    this.eggChainTimer = 3.2;
    const val = Math.round((isGold ? 3 : 1) * (p.eggValueMult || 1));
    this.runEggs += val;
    Save.addEggs(val);
    this.addScore((15 + this.eggChain * 5) * this.combo, p);
    p.fury = Math.min(100, p.fury + 6 * (p.furyChargeMult || 1));
    this.sfx.egg(this.eggChain);
    if (isGold) this.ui.hud.showFloatText(`OVO DOURADO +${val}!`, '#ffd447');
  }

  _collectPowerup(p, obs) {
    this.sfx.powerup();
    if (obs.isBackpack) {
      const added = p.backpack.add(obs.powerId);
      this.ui.hud.showFloatText(added ? 'ITEM NA MOCHILA!' : 'MOCHILA CHEIA!', '#f59e0b');
      return;
    }

    switch (obs.powerId) {
      case 'shield': p.shields = Math.min(4, p.shields + 1); break;
      case 'magnet': p.magnetTimer = 10; break;
      case 'turbo': p.turboTimer = 5; p.invulnTimer = Math.max(p.invulnTimer, 5); break;
      case 'clock': this.slowMoTimer = 5.5; break;
      case 'rocket': p.rocketTimer = 4.2; p.invulnTimer = Math.max(p.invulnTimer, 4.5); break;
      case 'heal': p.hp = Math.min(p.maxHp, p.hp + 1); break;
      case 'bomb': this._clearNearbyObstacles(p.x, p.z, 55, false); break;
      default: break;
    }
    this.ui.hud.showFloatText(`⚡ ${obs.powerId.toUpperCase()}!`, '#38bdf8');
  }

  _updateGlobalKeys() {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
      return;
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
    // Emotes rápidos (1, 2, 3)
    if (this.state === 'playing') {
      if (this.input.wasKeyJustPressed('Digit1')) this.ui.hud.showFloatText('🎉 VAMOOO!', '#58d63a');
      if (this.input.wasKeyJustPressed('Digit2')) this.ui.hud.showFloatText('😜 HEHE!', '#ff9a24');
      if (this.input.wasKeyJustPressed('Digit3')) this.ui.hud.showFloatText('🆘 SOCORRO!', '#38bdf8');
    }
  }

  _loop(now) {
    this._rafId = requestAnimationFrame(this._loop.bind(this));
    const dt = Math.min(0.05, Math.max(0.0001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.input.beginFrame();
    this._updateGlobalKeys();
    this.ui.hud.tickTimers(dt);

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

    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  destroy() {
    cancelAnimationFrame(this._rafId);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointerdown', this._unlockAudio);
    this.canvas.removeEventListener('pointerdown', this._onCanvasPointer);
    this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored);
    window.removeEventListener('keydown', this._unlockAudio);
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.net?.leaveRoom();
    this.input.destroy();
    this.renderer.dispose();
  }
}
