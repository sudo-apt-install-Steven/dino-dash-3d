// Controle Jurássico no Celular (modelo Jackbox + Vínculo Confirmado + Editor de Layout Temático):
// Fluxo Fase 1:
// 1. Ao entrar pelo celular (QR, link ou código): popup com 2 opções grandes:
//    - "Entrar como jogador" (escolhe apelido & dino -> vai para o lobby 3D)
//    - "Usar como controle de um jogador" (lista jogadores na sala -> pedido de confirmação 15s -> vinculado)
// 2. Botão "Voltar a controlar" se desconectado/removido + token de sessão (60s) para retomar a vaga.
// 3. Controles completos: Movimentação, Abaixar/Mergulhar, Pular, Ataque, Especial, Fúria, Mochila, Habitat, Roda X e Pausa.

import { DINO_CATALOG, getDinoSpec } from '../dinos/DinoCatalog.js';
import { BACKPACK_ITEMS } from '../systems/Items.js';
import { Save } from '../systems/Save.js';
import { OrientationManager } from '../systems/OrientationManager.js';
import {
  escapeHtml,
  sanitizeNickname,
  sanitizeRoomCode,
  sanitizeHexColor
} from '../security/Sanitize.js';

const CLAW_SCRATCH_SVG = `
  <svg class="ctrl-claw-svg" viewBox="0 0 360 16" preserveAspectRatio="none" aria-hidden="true">
    <path d="M12 3 L125 9 L18 13 M108 4 L252 8 L122 14 M235 3 L348 9 L248 14"
          stroke="#c97b3e" stroke-width="2.2" stroke-linecap="round" fill="none" />
  </svg>
`;

const DEFAULT_LAYOUT_PRESETS = {
  default: {
    label: '🦕 Padrão Ergonômico',
    leftHanded: false,
    useJoystick: false,
    scale: 0.96,
    opacity: 0.96,
    positions: {
      dpad: { x: 14, y: 36, scale: 0.94 },
      duck: { x: 14, y: 74, scale: 0.92 },
      utility: { x: 43, y: 76, scale: 0.8 },
      jump: { x: 85, y: 33, scale: 0.98 },
      attack: { x: 72, y: 74, scale: 0.9 },
      ability: { x: 88, y: 74, scale: 0.9 }
    }
  },
  arcade: {
    label: '🕹️ Arcade Clássico',
    leftHanded: false,
    useJoystick: true,
    scale: 0.98,
    opacity: 0.98,
    positions: {
      dpad: { x: 15, y: 40, scale: 1.0 },
      duck: { x: 33, y: 74, scale: 0.9 },
      utility: { x: 50, y: 76, scale: 0.82 },
      jump: { x: 85, y: 32, scale: 1.0 },
      attack: { x: 70, y: 74, scale: 0.92 },
      ability: { x: 87, y: 74, scale: 0.92 }
    }
  },
  claw_pro: {
    label: '🦅 Garra Pro (Ações Grandes)',
    leftHanded: false,
    useJoystick: false,
    scale: 1.04,
    opacity: 1.0,
    positions: {
      dpad: { x: 15, y: 36, scale: 1.0 },
      duck: { x: 15, y: 74, scale: 0.96 },
      utility: { x: 46, y: 76, scale: 0.84 },
      jump: { x: 84, y: 32, scale: 1.06 },
      attack: { x: 69, y: 74, scale: 0.98 },
      ability: { x: 87, y: 74, scale: 0.98 }
    }
  },
  lefty: {
    label: '🖐️ Canhoto Invertido',
    leftHanded: true,
    useJoystick: false,
    scale: 0.96,
    opacity: 0.96,
    positions: {
      dpad: { x: 85, y: 36, scale: 0.96 },
      duck: { x: 85, y: 74, scale: 0.94 },
      utility: { x: 54, y: 76, scale: 0.84 },
      jump: { x: 15, y: 33, scale: 0.98 },
      attack: { x: 30, y: 74, scale: 0.92 },
      ability: { x: 13, y: 74, scale: 0.92 }
    }
  }
};

function getSavedControllerLayout() {
  try {
    const raw = Save.data?.settings?.controllerLayout || {};
    const presetKey = DEFAULT_LAYOUT_PRESETS[raw.preset] ? raw.preset : 'default';
    const base = DEFAULT_LAYOUT_PRESETS[presetKey];
    const mergedPositions = {};
    for (const k of Object.keys(base.positions)) {
      const custom = raw.positions?.[k];
      mergedPositions[k] = {
        x: Number.isFinite(custom?.x) ? Math.max(8, Math.min(92, custom.x)) : base.positions[k].x,
        y: Number.isFinite(custom?.y) ? Math.max(24, Math.min(92, custom.y)) : base.positions[k].y,
        scale: Number.isFinite(custom?.scale) ? Math.max(0.7, Math.min(1.45, custom.scale)) : (base.positions[k].scale || 1.0)
      };
    }
    return {
      preset: presetKey,
      leftHanded: raw.leftHanded ?? base.leftHanded,
      useJoystick: raw.useJoystick ?? base.useJoystick,
      scale: Number.isFinite(raw.scale) ? Math.max(0.75, Math.min(1.4, raw.scale)) : base.scale,
      opacity: Number.isFinite(raw.opacity) ? Math.max(0.5, Math.min(1.0, raw.opacity)) : base.opacity,
      positions: mergedPositions
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_LAYOUT_PRESETS.default));
  }
}

function saveControllerLayout(layout) {
  try {
    if (!Save.data.settings) return;
    Save.data.settings.controllerLayout = {
      preset: layout.preset || 'default',
      leftHanded: !!layout.leftHanded,
      useJoystick: !!layout.useJoystick,
      scale: Number(layout.scale || 1.0),
      opacity: Number(layout.opacity || 0.96),
      positions: JSON.parse(JSON.stringify(layout.positions || {}))
    };
    Save.save();
  } catch {
    // fallback silencioso se armazenamento estiver bloqueado
  }
}

export class MobileController {
  constructor(rootEl, roomClient, options = {}) {
    this.rootEl = rootEl;
    this.net = roomClient;
    this.onExit = options.onExit || (() => {});
    this.onSwitchToPlayer3D = options.onSwitchToPlayer3D || null;
    this.deferredInstall = options.deferredInstall || null;

    OrientationManager.init();
    this.layout = getSavedControllerLayout();

    const resumed = roomClient.loadSessionSnapshot?.();
    const connectedPeer = roomClient.isConnected
      ? roomClient.room?.peers?.find((p) => p.peerId === roomClient.peerId)
      : null;

    const initCode = sanitizeRoomCode(options.initialRoom || roomClient.room?.code || resumed?.roomCode || Save.data.network?.lastRoom || '');

    this.state = {
      nickname: connectedPeer?.name || resumed?.nickname || Save.data.network?.nickname || `Dino_${Math.floor(10 + Math.random() * 89)}`,
      roomCode: initCode,
      transport: options.initialTransport || (roomClient.isConnected ? roomClient.transportType : (resumed?.transport || (roomClient.supabase?.isConfigured?.() ? 'supabase' : 'lan'))),
      dinoId: connectedPeer?.dinoId || resumed?.dinoId || Save.data.selectedDino || 'trex',
      color: connectedPeer?.color || '#58d63a',
      ready: connectedPeer ? !!connectedPeer.ready : true,
      // 'entry_choice' | 'player_form' | 'pick_target' | 'waiting_confirm' | 'controller_active'
      step: connectedPeer?.targetPlayerPeerId
        ? 'controller_active'
        : (options.showEntryChoice && initCode.length === 4 ? 'entry_choice' : (roomClient.isConnected ? 'pick_target' : 'entry_choice')),
      boundTargetPeerId: connectedPeer?.targetPlayerPeerId || null,
      boundTargetName: '',
      lastTargetPeerId: resumed?.targetPlayerPeerId || connectedPeer?.targetPlayerPeerId || null,
      pendingTargetName: '',
      pendingWaitSec: 0,
      inMatch: roomClient.isConnected && roomClient.room?.status === 'playing',
      connecting: false,
      showRadialPicker: false,
      editLayoutMode: false,
      selectedEditCluster: 'jump',
      dead: false,
      cardOffer: null,
      triviaPrompt: null,
      selfSnap: null,
      errorMsg: '',
      statusNotice: ''
    };

    this.heldActions = {
      left: false,
      right: false,
      jump: false,
      duck: false,
      ability: false,
      attack: false,
      item: false,
      bullet: false,
      fury: false,
      transmute: false
    };
    this.wakeLock = null;
    this._waitTimerId = null;
    this._autoConnectTried = false;
    this._bindNetworkEvents();
    this._unsubOrientation = OrientationManager.onChange(() => {
      const rotBtn = this.rootEl.querySelector('#ctrl-rotate-btn');
      if (rotBtn) {
        rotBtn.textContent = OrientationManager.isEffectiveLandscape() ? '🔄 Paisagem ON' : '🔄 Deitar Tela';
      }
    });
    this._requestWakeLock();
    this.render();

    // Se já veio com código de sala de 4 letras (QR/Link), conecta silenciosamente em espera para poder listar jogadores!
    if (!this.net.isConnected && this.state.roomCode.length === 4 && !this._autoConnectTried) {
      this._autoConnectTried = true;
      setTimeout(() => this._connectToRoom({ silentInspect: true }), 80);
    }
  }

  async _requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {}
  }

  _vibrate(ms = 20) {
    try {
      if (Save.data.settings.accessibility.vibration && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {}
  }

  _pulseDamageEdge(color = '#ff3b30') {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed; inset:0; pointer-events:none; z-index:95; box-shadow:inset 0 0 64px 20px ${color}; opacity:0.95; transition:opacity 0.35s ease;`;
    document.body.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = '0'; });
    setTimeout(() => flash.remove(), 380);
  }

  _clearPendingConfirmTimer() {
    clearInterval(this._waitTimerId);
    this._waitTimerId = null;
  }

  _bindNetworkEvents() {
    this._onRoom = () => {
      const selfPeer = this.net.room?.peers?.find((p) => p.peerId === this.net.peerId);
      if (selfPeer) {
        if (typeof selfPeer.ready === 'boolean') this.state.ready = selfPeer.ready;
        if (selfPeer.targetPlayerPeerId && this.state.step !== 'controller_active') {
          const target = this.net.room?.peers?.find((x) => x.peerId === selfPeer.targetPlayerPeerId);
          this.state.boundTargetPeerId = selfPeer.targetPlayerPeerId;
          this.state.boundTargetName = target?.name || 'Jogador';
          this.state.lastTargetPeerId = selfPeer.targetPlayerPeerId;
          this.state.step = 'controller_active';
          this._clearPendingConfirmTimer();
        } else if (!selfPeer.targetPlayerPeerId && this.state.boundTargetPeerId) {
          this.state.boundTargetPeerId = null;
          this.state.step = 'pick_target';
        }
      }
      const nowPlaying = this.net.room?.status === 'playing';
      if (nowPlaying !== this.state.inMatch) {
        this.state.inMatch = nowPlaying;
      }
      if (!this.state.editLayoutMode) {
        this.render();
      }
    };
    this._onJoined = () => {
      this.state.connecting = false;
      this.state.errorMsg = '';
      if (this.net.room?.status === 'playing') this.state.inMatch = true;
      const selfPeer = this.net.room?.peers?.find((p) => p.peerId === this.net.peerId);
      if (selfPeer?.targetPlayerPeerId) {
        const tgt = this.net.room?.peers?.find((x) => x.peerId === selfPeer.targetPlayerPeerId);
        this.state.boundTargetPeerId = selfPeer.targetPlayerPeerId;
        this.state.boundTargetName = tgt?.name || 'Jogador';
        this.state.lastTargetPeerId = selfPeer.targetPlayerPeerId;
        this.state.step = 'controller_active';
      }
      this.render();
    };
    this._onControlGranted = (msg) => {
      this._clearPendingConfirmTimer();
      this.state.boundTargetPeerId = msg.targetPlayerPeerId;
      this.state.boundTargetName = msg.targetPlayerName || 'Jogador';
      this.state.lastTargetPeerId = msg.targetPlayerPeerId;
      this.state.step = 'controller_active';
      this.state.errorMsg = '';
      this.state.statusNotice = `✅ Confirmado! Você está controlando ${this.state.boundTargetName}.`;
      this.net.saveSessionSnapshot?.({
        role: 'controller',
        targetPlayerPeerId: this.state.boundTargetPeerId,
        nickname: this.state.nickname,
        dinoId: this.state.dinoId
      });
      this._vibrate([25, 35, 25]);
      this.render();
    };
    this._onControlRejected = (msg) => {
      this._clearPendingConfirmTimer();
      this.state.boundTargetPeerId = null;
      this.state.step = 'pick_target';
      this.state.errorMsg = msg.reason || 'Pedido recusado pelo jogador.';
      this._vibrate([60, 40, 60]);
      this.render();
    };
    this._onControlRevoked = (msg) => {
      this._clearPendingConfirmTimer();
      this.state.boundTargetPeerId = null;
      this.state.step = 'pick_target';
      this.state.errorMsg = msg.reason || 'O jogador removeu o controle.';
      this._vibrate(80);
      this.render();
    };
    this._onDisconnected = () => {
      if (this.state.boundTargetPeerId) {
        this.net.saveSessionSnapshot?.({
          role: 'controller',
          targetPlayerPeerId: this.state.boundTargetPeerId,
          nickname: this.state.nickname,
          dinoId: this.state.dinoId
        });
      }
      this.state.boundTargetPeerId = null;
      this.state.errorMsg = 'Conexão perdida! Toque em "Voltar a controlar" para retomar.';
      this.render();
    };
    this._onStart = () => {
      this.state.inMatch = true;
      this.state.dead = false;
      this.state.cardOffer = null;
      this.state.statusNotice = '🏁 Corrida iniciada no Telão! Use os controles abaixo!';
      this._vibrate([30, 40, 30]);
      this.render();
    };
    this._onEnd = () => {
      this.state.inMatch = false;
      this.state.cardOffer = null;
      this.state.statusNotice = '🏆 Fim da corrida!';
      this.render();
    };
    this._onSnapshot = (msg) => {
      const players = msg?.snapshot?.players || [];
      const me = players.find(
        (p) => (this.state.boundTargetPeerId && p.peerId === this.state.boundTargetPeerId) ||
          p.peerId === this.net.peerId ||
          (Array.isArray(p.controllerPeerIds) && p.controllerPeerIds.includes(this.net.peerId))
      ) || players[0];
      if (me) {
        if (!this.state.inMatch) this.state.inMatch = true;
        const prev = this.state.selfSnap;
        if (prev && ((me.lives < prev.lives) || (me.shields < prev.shields && me.lives <= prev.lives))) {
          this._vibrate([45, 25, 65]);
          this._pulseDamageEdge(me.lives < prev.lives ? '#ff3b30' : '#38bdf8');
        }
        const prevWater = !!(prev?.inWater || prev?.inSubmerged);
        const nowWater = !!(me.inWater || me.inSubmerged);
        const prevDive = Math.round(prev?.diveTarget || 0);
        const nowDive = Math.round(me.diveTarget || 0);
        const prevFuryReady = (prev?.fury || 0) >= 100;
        const nowFuryReady = (me.fury || 0) >= 100;
        const prevBagLen = (prev?.backpack || []).length;
        const nowBagLen = (me.backpack || []).length;

        this.state.selfSnap = me;
        this.state.dead = !!me.dead;
        if (
          this.state.step === 'controller_active' &&
          !this.state.editLayoutMode &&
          (prevWater !== nowWater || prevDive !== nowDive || prevFuryReady !== nowFuryReady || prevBagLen !== nowBagLen || Boolean(prev?.dead) !== Boolean(me.dead))
        ) {
          this.render();
        } else {
          this._updateLiveHudBars();
        }
      }
    };
    this._onCardOffer = (msg) => {
      if (msg.targetPeerId === this.net.peerId && Array.isArray(msg.choices)) {
        this.state.cardOffer = msg.choices;
        this._vibrate(45);
        this.render();
      }
    };
    this._onTrivia = (msg) => {
      this.state.triviaPrompt = msg;
      this._vibrate(35);
      this.render();
    };
    this._onError = (msg) => {
      this.state.connecting = false;
      this.state.errorMsg = msg.message || 'Erro de conexão.';
      this.render();
    };
    this._onPing = () => {
      const el = this.rootEl.querySelector('#ctrl-ping');
      if (el) el.textContent = `📶 ${this.net.pingMs || 12} ms`;
    };

    this.net.on('room_state', this._onRoom);
    this.net.on('joined', this._onJoined);
    this.net.on('control_granted', this._onControlGranted);
    this.net.on('control_rejected', this._onControlRejected);
    this.net.on('control_revoked', this._onControlRevoked);
    this.net.on('disconnected', this._onDisconnected);
    this.net.on('start_match', this._onStart);
    this.net.on('end_match', this._onEnd);
    this.net.on('state_snapshot', this._onSnapshot);
    this.net.on('card_offer', this._onCardOffer);
    this.net.on('trivia_prompt', this._onTrivia);
    this.net.on('error', this._onError);
    this.net.on('ping', this._onPing);
  }

  async _connectToRoom({ silentInspect = false, role = 'controller' } = {}) {
    const code = sanitizeRoomCode(this.state.roomCode);
    if (!code || code.length < 4) {
      if (!silentInspect) {
        this.state.errorMsg = 'Informe o código de 4 letras da sala do PC/TV.';
        this.render();
      }
      return false;
    }
    this.state.connecting = true;
    this.state.errorMsg = '';
    this.render();

    try {
      Save.data.network.nickname = this.state.nickname;
      Save.data.network.lastRoom = code;
      Save.save();
    } catch {}

    const res = await this.net.joinRoom(code, {
      name: this.state.nickname,
      dinoId: this.state.dinoId,
      color: this.state.color,
      transport: this.state.transport,
      role,
      ready: role === 'controller'
    });
    this.state.connecting = false;
    if (!res.ok) {
      this.state.errorMsg = res.message;
      this.render();
      return false;
    }
    if (role === 'mobile_player') {
      this._switchToMobilePlayer3D();
    } else {
      this.render();
    }
    return true;
  }

  _sendControlRequestTo(targetPeerId, targetName = 'Jogador') {
    if (!targetPeerId) return;
    this.state.pendingTargetName = targetName;
    this.state.pendingWaitSec = 15;
    this.state.step = 'waiting_confirm';
    this.state.errorMsg = '';
    this.net.sendControlRequest(targetPeerId);
    this._clearPendingConfirmTimer();
    this._waitTimerId = setInterval(() => {
      this.state.pendingWaitSec--;
      const secEl = this.rootEl.querySelector('#ctrl-wait-sec');
      if (secEl) secEl.textContent = `${Math.max(0, this.state.pendingWaitSec)}s`;
      if (this.state.pendingWaitSec <= 0) {
        this._clearPendingConfirmTimer();
        this.state.step = 'pick_target';
        this.state.errorMsg = `⏳ ${targetName} não respondeu em 15 segundos.`;
        this.render();
      }
    }, 1000);
    this.render();
  }

  _switchToMobilePlayer3D() {
    this._vibrate(25);
    this._clearPendingConfirmTimer();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('controller');
      url.searchParams.set('screen', '1');
      window.history.replaceState({}, '', url.toString());
    } catch {}
    if (this.net.isConnected) {
      this.net.sendPlayerMeta({
        role: 'mobile_player',
        name: this.state.nickname,
        dinoId: this.state.dinoId,
        color: this.state.color,
        ready: false
      });
    }
    const cb = this.onSwitchToPlayer3D;
    this.onExit = () => {};
    this.destroy(false);
    if (cb) cb();
  }

  _updateLiveHudBars() {
    const snap = this.state.selfSnap;
    if (!snap) return;
    const hpEl = this.rootEl.querySelector('#ctrl-hp');
    const atkEl = this.rootEl.querySelector('#ctrl-atk-sub');
    const cdEl = this.rootEl.querySelector('#ctrl-ab-sub');
    const furyEl = this.rootEl.querySelector('#ctrl-fury-sub');
    const stamFill = this.rootEl.querySelector('#ctrl-stam-fill');
    const o2Wrap = this.rootEl.querySelector('#ctrl-o2-wrap');
    const o2Fill = this.rootEl.querySelector('#ctrl-o2-fill');

    if (hpEl) hpEl.textContent = `❤️ ${snap.lives}/${snap.maxLives} • 🛡️ ${snap.shields || 0}`;
    if (atkEl) atkEl.textContent = snap.attackCd > 0.05 ? `${snap.attackCd.toFixed(1)}s` : 'Pronto!';
    if (cdEl) {
      const chg = snap.abilityCharge ?? 100;
      cdEl.textContent = snap.abilityCd > 0.05 ? `${snap.abilityCd.toFixed(1)}s` : `${chg}%`;
    }
    if (furyEl) {
      furyEl.textContent = (snap.fury || 0) >= 100 ? '🔥 PRONTA!' : `${Math.round(snap.fury || 0)}%`;
    }
    if (stamFill) {
      const st = Math.max(0, Math.min(100, snap.stamina ?? 100));
      stamFill.style.width = `${st}%`;
      stamFill.style.background = st < 30 ? '#ef4444' : '#34d399';
    }
    if (o2Wrap && o2Fill) {
      const showO2 = !!(snap.inWater || snap.inSubmerged || (snap.oxygen ?? 100) < 99);
      o2Wrap.style.display = showO2 ? 'flex' : 'none';
      const o2 = Math.max(0, Math.min(100, snap.oxygen ?? 100));
      o2Fill.style.width = `${o2}%`;
    }
  }

  _setHeld(act, down) {
    if (this.state.editLayoutMode || this.state.step !== 'controller_active') return;
    if (down) this._vibrate(18);
    this.heldActions[act] = !!down;
    const led = this.rootEl.querySelector('#ctrl-input-led');
    if (led) {
      const anyDown = Object.values(this.heldActions).some(Boolean);
      led.classList.toggle('active', anyDown);
    }
    this.net.sendInputState(this.heldActions, down);
  }

  _pulseAction(act, durationMs = 130) {
    if (this.state.editLayoutMode || this.state.step !== 'controller_active') return;
    this._vibrate(24);
    this.heldActions[act] = true;
    this.net.sendInputState(this.heldActions, true);
    setTimeout(() => {
      this.heldActions[act] = false;
      this.net.sendInputState(this.heldActions, true);
    }, durationMs);
  }

  _applyPreset(presetKey) {
    const preset = DEFAULT_LAYOUT_PRESETS[presetKey] || DEFAULT_LAYOUT_PRESETS.default;
    this.layout = {
      preset: presetKey,
      leftHanded: preset.leftHanded,
      useJoystick: preset.useJoystick,
      scale: preset.scale,
      opacity: preset.opacity,
      positions: JSON.parse(JSON.stringify(preset.positions))
    };
    saveControllerLayout(this.layout);
    this.render();
  }

  _clusterStyle(clusterId) {
    const pos = this.layout.positions?.[clusterId] || DEFAULT_LAYOUT_PRESETS.default.positions[clusterId] || { x: 50, y: 50, scale: 1 };
    const totalScale = (this.layout.scale || 1) * (pos.scale || 1);
    return `left:${pos.x}%; top:${pos.y}%; transform:translate(-50%, -50%) scale(${totalScale.toFixed(2)}); opacity:${(this.layout.opacity || 0.96).toFixed(2)};`;
  }

  render() {
    const connected = this.net.isConnected;
    const spec = getDinoSpec(this.state.dinoId);
    const playersInRoom = this.net.getPlayerPeers ? this.net.getPlayerPeers() : [];
    const snap = this.state.selfSnap || {
      lives: 3, maxLives: 3, shields: 0, stamina: 100, oxygen: 100,
      inWater: false, inSubmerged: false, diveTarget: 0, fury: 0,
      abilityCharge: 100, attackCd: 0, abilityCd: 0, canTransmute: false,
      habitatMode: 'land', backpack: [], score: 0
    };
    const isLandscape = OrientationManager.isEffectiveLandscape();
    const divingTarget = (snap.diveTarget || 0) >= 0.5;
    const duckLabel = (snap.inWater && !snap.inSubmerged)
      ? (divingTarget ? '🌊 SUBIR' : '🤿 MERGULHAR')
      : '⬇ ABAIXAR';
    const furyReady = (snap.fury || 0) >= 100;

    this.rootEl.innerHTML = `
      <div class="ctrl-screen ${this.state.editLayoutMode ? 'ctrl-editing' : ''}">
        <div class="ctrl-topbar">
          <div class="ctrl-player-tag">
            <span class="ctrl-input-led ${connected && this.state.boundTargetPeerId ? 'online' : ''}" id="ctrl-input-led"></span>
            <span class="ctrl-color-dot" style="background:${sanitizeHexColor(this.state.color, '#58d63a')};"></span>
            <span class="ctrl-nick-lbl">${escapeHtml(this.state.nickname)}</span>
            <span class="ctrl-role-badge" id="ctrl-mode-indicator">
              ${this.state.boundTargetPeerId
                ? `🟢 ${escapeHtml(this.net.room?.code || '')} • Controlando ${escapeHtml(this.state.boundTargetName || 'Jogador')}`
                : (connected ? `🟡 Sala ${escapeHtml(this.net.room?.code || '')}` : '⚪ Desconectado')}
            </span>
          </div>

          <div class="ctrl-telemetry-strip">
            <span id="ctrl-hp" class="ctrl-stat-chip">❤️ ${snap.lives}/${snap.maxLives} • 🛡️ ${snap.shields || 0}</span>
            <div class="ctrl-mini-meter"><span>🏃</span><div class="ctrl-mini-bar"><div id="ctrl-stam-fill" style="width:${snap.stamina ?? 100}%; background:#34d399;"></div></div></div>
            <div class="ctrl-mini-meter" id="ctrl-o2-wrap" style="display:${snap.inWater || snap.inSubmerged ? 'flex' : 'none'};"><span>🫧</span><div class="ctrl-mini-bar"><div id="ctrl-o2-fill" style="width:${snap.oxygen ?? 100}%; background:#38bdf8;"></div></div></div>
            <span class="ctrl-latency" id="ctrl-ping">📶 ${this.net.pingMs || 12} ms</span>
          </div>

          <div class="ctrl-top-actions">
            ${this.state.step !== 'controller_active' && this.state.lastTargetPeerId ? `
              <button class="ctrl-slot-btn" id="ctrl-resume-control-btn" style="border-color:#22c55e; color:#86efac;">🎮 Voltar a controlar</button>
            ` : ''}
            <button class="ctrl-slot-btn" id="ctrl-rotate-btn">${isLandscape ? '🔄 Paisagem ON' : '🔄 Deitar Tela'}</button>
            ${this.state.step === 'controller_active' ? `
              <button class="ctrl-slot-btn ${this.state.editLayoutMode ? 'active-tool' : ''}" id="ctrl-edit-layout-btn">🛠️ ${this.state.editLayoutMode ? 'Salvar' : 'Editar Botões'}</button>
              <button class="ctrl-slot-btn" id="ctrl-btn-pause" title="Pausar / Pedir Pausa">⏸ Pausa</button>
            ` : ''}
            <button class="ctrl-slot-btn" id="ctrl-open-setup">⚙️ Opções</button>
            <button class="ctrl-slot-btn" id="ctrl-exit">✕</button>
          </div>
        </div>

        ${CLAW_SCRATCH_SVG}

        ${this.state.statusNotice ? `<div class="ctrl-status-toast"><span>${escapeHtml(this.state.statusNotice)}</span></div>` : ''}

        <!-- Barra de Edição Interativa do Layout -->
        ${this.state.editLayoutMode ? `
          <div class="ctrl-editor-toolbar" id="ctrl-editor-toolbar">
            <div class="ctrl-editor-row">
              <strong style="color:#ffd447;">🛠️ Editor de Layout: Arraste os botões na tela!</strong>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${Object.entries(DEFAULT_LAYOUT_PRESETS).map(([k, pr]) => `
                  <button class="ctrl-slot-btn ${this.layout.preset === k ? 'active-tool' : ''}" data-preset="${k}">${pr.label}</button>
                `).join('')}
              </div>
            </div>
            <div class="ctrl-editor-row">
              <label class="ctrl-editor-slider"><span>Tamanho (${Math.round((this.layout.scale || 1) * 100)}%):</span><input type="range" id="ctrl-edit-scale" min="75" max="140" value="${Math.round((this.layout.scale || 1) * 100)}" /></label>
              <label class="ctrl-editor-slider"><span>Botão (${Math.round(((this.layout.positions?.[this.state.selectedEditCluster]?.scale || 1)) * 100)}%):</span><input type="range" id="ctrl-edit-btn-scale" min="70" max="145" value="${Math.round(((this.layout.positions?.[this.state.selectedEditCluster]?.scale || 1)) * 100)}" /></label>
              <label class="ctrl-editor-slider"><span>Opacidade (${Math.round((this.layout.opacity || 0.96) * 100)}%):</span><input type="range" id="ctrl-edit-opacity" min="50" max="100" value="${Math.round((this.layout.opacity || 0.96) * 100)}" /></label>
              <button class="ctrl-slot-btn" id="ctrl-joy-toggle">${this.layout.useJoystick ? '🎛️ Joystick' : '◀▶ Setas'}</button>
              <button class="ctrl-slot-btn" id="ctrl-reset-layout">🔄 Padrão</button>
              <button class="bone-btn jump ctrl-compact-btn" id="ctrl-save-layout">✅ Concluir</button>
            </div>
          </div>
        ` : ''}

        <!-- Popups de Carta Pessoal / Trivia / Roda X no Controle -->
        ${this.state.showRadialPicker ? `
          <div class="egg-shell-panel ctrl-floating-modal" style="border-color:#c084fc;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="color:#f5d0fe;">🧭 Roda Tática [X]</strong>
              <button class="ctrl-slot-btn" id="ctrl-close-radial">✕</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <button class="bone-btn ctrl-compact-btn" data-ctrl-rslot="habitat">🔄 Habitat</button>
              <button class="bone-btn ctrl-compact-btn" data-ctrl-rslot="backpack">🎒 Mochila</button>
              <button class="bone-btn ctrl-compact-btn" data-ctrl-rslot="companion">🐾 Mascote</button>
              <button class="bone-btn ctrl-compact-btn" data-ctrl-rslot="focus">⚡ Foco (+Carga/+O₂)</button>
            </div>
          </div>
        ` : ''}

        ${this.state.triviaPrompt ? `
          <div class="egg-shell-panel ctrl-floating-modal">
            <strong style="color:#ffd447;">⚡ PERGUNTA-RELÂMPAGO (+15 OVOS):</strong>
            <div style="margin:6px 0;">${escapeHtml(this.state.triviaPrompt.question)}</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              ${this.state.triviaPrompt.options.map((opt, idx) => `<button class="bone-btn" data-trivia="${idx}" style="min-height:44px; font-size:0.85rem;">${escapeHtml(opt)}</button>`).join('')}
            </div>
          </div>
        ` : ''}

        ${this.state.cardOffer ? `
          <div class="egg-shell-panel ctrl-floating-modal">
            <strong style="color:#ffd447;">✨ ESCOLHA SUA CARTA NO CELULAR (sem pausar o Telão!):</strong>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:8px;">
              ${this.state.cardOffer.map((c, idx) => `
                <button class="bone-btn" data-pick-card="${idx}" style="flex-direction:column; min-height:74px; padding:8px; font-size:0.76rem; border-color:${c.rarityColor || '#ffd447'};">
                  <span>${escapeHtml(c.name)}</span>
                  <span style="font-weight:500; font-size:0.68rem;">${escapeHtml(c.desc)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Palco do Gamepad (Visível quando vinculado & confirmado) -->
        <div class="ctrl-canvas-stage" id="ctrl-canvas-stage">
          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'dpad' ? 'selected-cluster' : ''}" data-cluster="dpad" style="${this._clusterStyle('dpad')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Direcional</span>` : ''}
            ${this.layout.useJoystick ? `
              <div class="ctrl-joystick" id="ctrl-joystick"><span class="ctrl-joy-hint">◀ ARRASTE ▶</span><div class="ctrl-joystick-knob" id="ctrl-knob"></div></div>
            ` : `
              <div class="ctrl-dpad-pair">
                <button class="bone-btn ctrl-theme-fossil" data-hold="left"><span class="ctrl-btn-icon">◀</span><span class="ctrl-btn-lbl">ESQ</span></button>
                <button class="bone-btn ctrl-theme-fossil" data-hold="right"><span class="ctrl-btn-icon">▶</span><span class="ctrl-btn-lbl">DIR</span></button>
              </div>
            `}
          </div>

          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'duck' ? 'selected-cluster' : ''}" data-cluster="duck" style="${this._clusterStyle('duck')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Abaixar/Merg.</span>` : ''}
            <button class="bone-btn duck ctrl-theme-ocean" data-hold="duck" id="ctrl-btn-duck">
              <span class="ctrl-btn-main">${duckLabel}</span>
              <span class="ctrl-btn-sub">${snap.inWater ? 'Alterna Mergulho' : 'Deslizar / Rasante'}</span>
            </button>
          </div>

          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'utility' ? 'selected-cluster' : ''}" data-cluster="utility" style="${this._clusterStyle('utility')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Fúria, Mochila & Roda</span>` : ''}
            <div class="ctrl-utility-strip">
              <button class="bone-btn ctrl-theme-magma ${furyReady ? 'fury-ready-pulse' : ''}" id="ctrl-btn-fury" data-hold="fury">
                <span class="ctrl-btn-main">🔥 FÚRIA</span><span class="ctrl-btn-sub" id="ctrl-fury-sub">${furyReady ? '🔥 PRONTA!' : `${Math.round(snap.fury || 0)}%`}</span>
              </button>
              <button class="bone-btn ctrl-theme-amber" id="ctrl-use-item">
                <span class="ctrl-btn-main">🎒 ${(snap.backpack || []).length > 0 ? (BACKPACK_ITEMS[snap.backpack[0]]?.icon || 'ITEM') : 'ITEM'}</span><span class="ctrl-btn-sub">Mochila</span>
              </button>
              <button class="bone-btn ctrl-theme-crystal" id="ctrl-btn-radial">
                <span class="ctrl-btn-main">🧭 RODA</span><span class="ctrl-btn-sub">Tecla X</span>
              </button>
            </div>
          </div>

          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'jump' ? 'selected-cluster' : ''}" data-cluster="jump" style="${this._clusterStyle('jump')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Pulo</span>` : ''}
            <button class="bone-btn jump ctrl-theme-emerald" data-hold="jump" id="ctrl-btn-jump">
              <span class="ctrl-btn-main">⬆ PULAR</span><span class="ctrl-btn-sub">Segure = Alto • 2x = Ar</span>
            </button>
          </div>

          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'attack' ? 'selected-cluster' : ''}" data-cluster="attack" style="${this._clusterStyle('attack')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Ataque</span>` : ''}
            <button class="bone-btn ctrl-theme-claw" data-hold="attack" id="ctrl-btn-attack">
              <span class="ctrl-btn-main">⚔️ ATAQUE</span><span class="ctrl-btn-sub" id="ctrl-atk-sub">${snap.attackCd > 0.05 ? `${snap.attackCd.toFixed(1)}s` : 'Pronto!'}</span>
            </button>
          </div>

          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'ability' ? 'selected-cluster' : ''}" data-cluster="ability" style="${this._clusterStyle('ability')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Especial</span>` : ''}
            <button class="bone-btn ability ctrl-theme-gold" data-hold="ability" id="ctrl-btn-ability">
              <span class="ctrl-btn-main">⚡ ${escapeHtml(spec.ability?.name || 'ESPECIAL')}</span><span class="ctrl-btn-sub" id="ctrl-ab-sub">${snap.abilityCd > 0.05 ? `${snap.abilityCd.toFixed(1)}s` : `${snap.abilityCharge ?? 100}%`}</span>
            </button>
          </div>
        </div>

        <!-- FLUXO DE ENTRADA FASE 1 (Popup 2 Opções Grandes / Formulário Jogador / Lista de Jogadores p/ Controle / Aguardando Confirmação 15s) -->
        ${this.state.step !== 'controller_active' ? `
          <div class="ctrl-setup-backdrop" id="ctrl-setup-backdrop">
            <div class="egg-shell-panel ctrl-setup-card">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <h2 style="color:#ffd447; font-size:1.15rem; margin:0;">
                  ${this.state.step === 'entry_choice' ? `📱 Sala ${escapeHtml(this.state.roomCode || 'Multiplayer')}`
                    : (this.state.step === 'player_form' ? '🦖 Entrar como Jogador'
                    : (this.state.step === 'pick_target' ? '🎮 Escolha quem você quer controlar'
                    : '⏳ Aguardando Confirmação'))}
                </h2>
                <button class="ctrl-slot-btn" id="ctrl-exit-modal">Sair</button>
              </div>

              ${this.state.errorMsg ? `<div class="ctrl-error-box">⚠️ ${escapeHtml(this.state.errorMsg)}</div>` : ''}
              ${this.state.connecting ? `<div class="ctrl-connecting-box">⏳ Conectando à sala <strong>${escapeHtml(this.state.roomCode)}</strong>...</div>` : ''}

              ${this.state.step === 'entry_choice' ? `
                <div style="display:grid; gap:10px; margin-bottom:10px;">
                  ${!connected ? `
                    <div class="ctrl-form-grid">
                      <label>Código da Sala (4 letras):
                        <input class="text-input" id="ctrl-room" maxlength="4" style="width:100%; text-transform:uppercase; font-size:1.2rem; letter-spacing:4px; text-align:center;" value="${escapeHtml(this.state.roomCode)}" placeholder="UL5T" />
                      </label>
                      <label>Transporte:
                        <select class="select-input" id="ctrl-tr" style="width:100%;">
                          <option value="supabase" ${this.state.transport === 'supabase' ? 'selected' : ''}>☁️ Online (Supabase)</option>
                          <option value="lan" ${this.state.transport === 'lan' ? 'selected' : ''}>📡 LAN Wi-Fi Local</option>
                        </select>
                      </label>
                    </div>
                  ` : ''}

                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button type="button" class="bone-btn jump" id="ctrl-choose-player" style="min-height:92px; padding:12px;">
                      <span class="ctrl-btn-main" style="font-size:1.05rem;">🦖 Entrar como jogador</span>
                      <span class="ctrl-btn-sub">Escolhe apelido e dino e joga na tela do celular!</span>
                    </button>

                    <button type="button" class="bone-btn ability" id="ctrl-choose-controller"
                            style="min-height:92px; padding:12px; ${connected && playersInRoom.length === 0 ? 'opacity:0.55; cursor:not-allowed;' : ''}"
                            ${connected && playersInRoom.length === 0 ? 'disabled' : ''}>
                      <span class="ctrl-btn-main" style="font-size:1.05rem;">🎮 Usar como controle de um jogador</span>
                      <span class="ctrl-btn-sub">${connected && playersInRoom.length === 0 ? 'Ainda não há jogadores na sala' : 'Controla o dino de um jogador após confirmação!'}</span>
                    </button>
                  </div>

                  ${this.state.lastTargetPeerId ? `
                    <button type="button" class="bone-btn ctrl-theme-crystal" id="ctrl-quick-resume" style="width:100%; min-height:48px;">
                      🔄 Voltar a controlar jogador anterior
                    </button>
                  ` : ''}
                </div>
              ` : this.state.step === 'player_form' ? `
                <div class="ctrl-form-grid">
                  <label>Seu Apelido:
                    <input class="text-input" id="ctrl-name" maxlength="16" style="width:100%;" value="${escapeHtml(this.state.nickname)}" />
                  </label>
                  <label>Seu Dinossauro:
                    <div style="display:flex; gap:6px;">
                      <select class="select-input" id="ctrl-dino" style="flex:1;">
                        ${DINO_CATALOG.map((d) => `<option value="${d.id}" ${d.id === this.state.dinoId ? 'selected' : ''}>${d.name}</option>`).join('')}
                      </select>
                      <input type="color" id="ctrl-color" value="${sanitizeHexColor(this.state.color, '#58d63a')}" style="width:42px; height:36px; border-radius:8px; border:none;" />
                    </div>
                  </label>
                </div>
                <div style="display:flex; gap:8px; margin-top:12px;">
                  <button type="button" class="ctrl-slot-btn" id="ctrl-back-choice">← Voltar</button>
                  <button type="button" class="bone-btn jump" id="ctrl-join-player" style="flex:1; min-height:48px;">🦖 IR PARA O LOBBY COMO JOGADOR</button>
                </div>
              ` : this.state.step === 'pick_target' ? `
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <label style="font-size:0.82rem;">Seu Apelido no Pedido:
                    <input class="text-input" id="ctrl-name" maxlength="16" style="width:100%; margin-top:3px;" value="${escapeHtml(this.state.nickname)}" />
                  </label>
                  ${playersInRoom.length === 0 ? `
                    <div class="ctrl-error-box">Ainda não há jogadores na sala ${escapeHtml(this.state.roomCode)}. Aguarde alguém entrar ou entre como jogador!</div>
                  ` : `
                    <div style="font-size:0.8rem; color:#fde68a;">Toque no jogador cujo dinossauro você deseja controlar (ele precisará aceitar na tela dele):</div>
                    <div style="display:grid; gap:8px; max-height:220px; overflow-y:auto;">
                      ${playersInRoom.map((pl) => {
                        const sp = getDinoSpec(pl.dinoId);
                        return `
                          <button type="button" class="ctrl-mode-option" data-pick-target="${escapeHtml(pl.peerId)}" style="flex-direction:row; justify-content:space-between; align-items:center; border-color:${sanitizeHexColor(pl.color, '#ffd447')};">
                            <div>
                              <strong style="font-size:0.95rem; color:#fff;">${pl.peerId === this.net.room?.hostPeerId ? '👑 ' : ''}${escapeHtml(pl.name)}</strong>
                              <small style="display:block;">🦖 ${escapeHtml(sp.name)}</small>
                            </div>
                            <span class="ctrl-role-badge">🎮 Pedir Controle</span>
                          </button>
                        `;
                      }).join('')}
                    </div>
                  `}
                  <div style="display:flex; gap:8px; margin-top:6px;">
                    <button type="button" class="ctrl-slot-btn" id="ctrl-back-choice">← Voltar</button>
                    <button type="button" class="ctrl-slot-btn" id="ctrl-refresh-peers">🔄 Atualizar Lista</button>
                  </div>
                </div>
              ` : `
                <div style="text-align:center; padding:12px 6px;">
                  <div style="font-size:2.2rem;">⏳</div>
                  <p style="font-size:0.95rem; color:#fef3c7; margin:6px 0;">
                    Pedido enviado para <strong>${escapeHtml(this.state.pendingTargetName)}</strong>!<br>
                    Peça para ele tocar em <strong>Aceitar</strong> na tela dele.
                  </p>
                  <div class="ctrl-latency" id="ctrl-wait-sec" style="display:inline-block; font-size:1rem; padding:6px 14px; color:#ffd447;">${this.state.pendingWaitSec}s</div>
                  <div style="margin-top:12px;">
                    <button type="button" class="ctrl-slot-btn" id="ctrl-cancel-wait">Cancelar Pedido</button>
                  </div>
                </div>
              `}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this._bindDomHandlers();
  }

  _bindDomHandlers() {
    const q = (s) => this.rootEl.querySelector(s);

    q('#ctrl-exit')?.addEventListener('click', () => this.destroy(true));
    q('#ctrl-exit-modal')?.addEventListener('click', () => this.destroy(true));
    q('#ctrl-rotate-btn')?.addEventListener('click', () => {
      this._vibrate(20);
      OrientationManager.toggleForceLandscape();
      this.render();
    });
    q('#ctrl-open-setup')?.addEventListener('click', () => {
      this.state.step = 'entry_choice';
      this.render();
    });
    q('#ctrl-resume-control-btn')?.addEventListener('click', () => {
      if (this.state.lastTargetPeerId) {
        const tgt = this.net.room?.peers?.find((x) => x.peerId === this.state.lastTargetPeerId);
        this._sendControlRequestTo(this.state.lastTargetPeerId, tgt?.name || 'Jogador');
      }
    });
    q('#ctrl-quick-resume')?.addEventListener('click', async () => {
      if (!this.net.isConnected) await this._connectToRoom({ role: 'controller' });
      if (this.net.isConnected && this.state.lastTargetPeerId) {
        const tgt = this.net.room?.peers?.find((x) => x.peerId === this.state.lastTargetPeerId);
        this._sendControlRequestTo(this.state.lastTargetPeerId, tgt?.name || 'Jogador');
      }
    });

    // Entry choice buttons
    q('#ctrl-choose-player')?.addEventListener('click', () => {
      this._syncFormInputs();
      this.state.step = 'player_form';
      this.render();
    });
    q('#ctrl-choose-controller')?.addEventListener('click', async () => {
      this._syncFormInputs();
      if (!this.net.isConnected) {
        const ok = await this._connectToRoom({ role: 'controller' });
        if (!ok) return;
      }
      this.state.step = 'pick_target';
      this.render();
    });
    q('#ctrl-back-choice')?.addEventListener('click', () => {
      this.state.step = 'entry_choice';
      this.state.errorMsg = '';
      this.render();
    });
    q('#ctrl-refresh-peers')?.addEventListener('click', () => {
      this.net.requestRoomSync?.();
      this.render();
    });
    q('#ctrl-join-player')?.addEventListener('click', async () => {
      this._syncFormInputs();
      if (!this.net.isConnected) {
        await this._connectToRoom({ role: 'mobile_player' });
      } else {
        this._switchToMobilePlayer3D();
      }
    });
    this.rootEl.querySelectorAll('[data-pick-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._syncFormInputs();
        if (this.net.isConnected) {
          this.net.sendPlayerMeta({ name: this.state.nickname, role: 'controller' });
        }
        const tid = btn.getAttribute('data-pick-target');
        const tgt = this.net.room?.peers?.find((x) => x.peerId === tid);
        this._sendControlRequestTo(tid, tgt?.name || 'Jogador');
      });
    });
    q('#ctrl-cancel-wait')?.addEventListener('click', () => {
      this._clearPendingConfirmTimer();
      this.state.step = 'pick_target';
      this.render();
    });

    q('#ctrl-edit-layout-btn')?.addEventListener('click', () => {
      this._vibrate(20);
      this.state.editLayoutMode = !this.state.editLayoutMode;
      if (!this.state.editLayoutMode) saveControllerLayout(this.layout);
      this.render();
    });
    q('#ctrl-btn-pause')?.addEventListener('click', () => {
      this._vibrate(25);
      this.net.sendPauseRequest?.();
    });
    q('#ctrl-btn-radial')?.addEventListener('click', () => {
      this._vibrate(20);
      this.state.showRadialPicker = !this.state.showRadialPicker;
      this.render();
    });
    q('#ctrl-close-radial')?.addEventListener('click', () => {
      this.state.showRadialPicker = false;
      this.render();
    });
    this.rootEl.querySelectorAll('[data-ctrl-rslot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._vibrate(22);
        this.net.sendRadialAction?.(btn.getAttribute('data-ctrl-rslot'));
        this.state.showRadialPicker = false;
        this.render();
      });
    });

    if (this.state.editLayoutMode) {
      this.rootEl.querySelectorAll('[data-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._vibrate(20);
          this._applyPreset(btn.getAttribute('data-preset'));
        });
      });
      q('#ctrl-edit-scale')?.addEventListener('input', (e) => {
        this.layout.scale = Number(e.target.value) / 100;
        saveControllerLayout(this.layout);
        this._refreshClusterStylesLive();
      });
      q('#ctrl-edit-btn-scale')?.addEventListener('input', (e) => {
        const cid = this.state.selectedEditCluster;
        if (cid && this.layout.positions[cid]) {
          this.layout.positions[cid].scale = Number(e.target.value) / 100;
          saveControllerLayout(this.layout);
          this._refreshClusterStylesLive();
        }
      });
      q('#ctrl-edit-opacity')?.addEventListener('input', (e) => {
        this.layout.opacity = Number(e.target.value) / 100;
        saveControllerLayout(this.layout);
        this._refreshClusterStylesLive();
      });
      q('#ctrl-joy-toggle')?.addEventListener('click', () => {
        this.layout.useJoystick = !this.layout.useJoystick;
        saveControllerLayout(this.layout);
        this.render();
      });
      q('#ctrl-reset-layout')?.addEventListener('click', () => this._applyPreset('default'));
      q('#ctrl-save-layout')?.addEventListener('click', () => {
        this.state.editLayoutMode = false;
        saveControllerLayout(this.layout);
        this.render();
      });
      this._bindClusterDragEditor();
      return;
    }

    this.rootEl.querySelectorAll('[data-hold]').forEach((btn) => {
      const act = btn.getAttribute('data-hold');
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.classList.add('active');
        this._setHeld(act, true);
      });
      const up = () => {
        btn.classList.remove('active');
        this._setHeld(act, false);
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });

    const joy = q('#ctrl-joystick');
    const knob = q('#ctrl-knob');
    if (joy && knob) {
      let originX = 0;
      let activeId = null;
      joy.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const pt = OrientationManager.mapPointerCoords(e.clientX, e.clientY);
        originX = pt.x;
        activeId = e.pointerId;
        joy.setPointerCapture?.(e.pointerId);
      });
      joy.addEventListener('pointermove', (e) => {
        if (activeId !== e.pointerId) return;
        const pt = OrientationManager.mapPointerCoords(e.clientX, e.clientY);
        const dx = Math.max(-46, Math.min(46, pt.x - originX));
        knob.style.transform = `translateX(${dx}px)`;
        this._setHeld('left', dx < -15);
        this._setHeld('right', dx > 15);
      });
      const resetJoy = () => {
        activeId = null;
        knob.style.transform = 'translateX(0px)';
        this._setHeld('left', false);
        this._setHeld('right', false);
      };
      joy.addEventListener('pointerup', resetJoy);
      joy.addEventListener('pointercancel', resetJoy);
    }

    q('#ctrl-use-item')?.addEventListener('click', () => this._pulseAction('item', 140));

    this.rootEl.querySelectorAll('[data-pick-card]').forEach((btn) => {
      btn.onclick = () => {
        const card = this.state.cardOffer?.[Number(btn.getAttribute('data-pick-card'))];
        if (card) {
          this.net.sendCardPick(card);
          this.state.cardOffer = null;
          this.render();
        }
      };
    });

    this.rootEl.querySelectorAll('[data-trivia]').forEach((btn) => {
      btn.onclick = () => {
        this._vibrate(20);
        this.net.sendTriviaAnswer(Number(btn.getAttribute('data-trivia')));
        this.state.triviaPrompt = null;
        this.render();
      };
    });
  }

  _syncFormInputs() {
    const q = (s) => this.rootEl.querySelector(s);
    const roomIn = q('#ctrl-room');
    const nameIn = q('#ctrl-name');
    const trIn = q('#ctrl-tr');
    const dinoIn = q('#ctrl-dino');
    const colIn = q('#ctrl-color');
    if (roomIn) this.state.roomCode = sanitizeRoomCode(roomIn.value);
    if (nameIn) this.state.nickname = sanitizeNickname(nameIn.value, 'Dino', 16);
    if (trIn) this.state.transport = trIn.value;
    if (dinoIn) this.state.dinoId = dinoIn.value;
    if (colIn) this.state.color = sanitizeHexColor(colIn.value, '#58d63a');
  }

  _refreshClusterStylesLive() {
    this.rootEl.querySelectorAll('[data-cluster]').forEach((el) => {
      const cid = el.getAttribute('data-cluster');
      el.setAttribute('style', this._clusterStyle(cid));
    });
  }

  _bindClusterDragEditor() {
    const stage = this.rootEl.querySelector('#ctrl-canvas-stage');
    if (!stage) return;

    this.rootEl.querySelectorAll('[data-cluster]').forEach((clusterEl) => {
      const cid = clusterEl.getAttribute('data-cluster');
      let dragging = false;
      let pointerId = null;

      clusterEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._vibrate(15);
        this.state.selectedEditCluster = cid;
        this.rootEl.querySelectorAll('[data-cluster]').forEach((c) => c.classList.toggle('selected-cluster', c === clusterEl));
        const btnScaleSlider = this.rootEl.querySelector('#ctrl-edit-btn-scale');
        if (btnScaleSlider && this.layout.positions[cid]) {
          btnScaleSlider.value = String(Math.round((this.layout.positions[cid].scale || 1) * 100));
        }
        dragging = true;
        pointerId = e.pointerId;
        clusterEl.setPointerCapture?.(e.pointerId);
      });

      clusterEl.addEventListener('pointermove', (e) => {
        if (!dragging || e.pointerId !== pointerId) return;
        const vp = OrientationManager.getViewportSize();
        const pt = OrientationManager.mapPointerCoords(e.clientX, e.clientY);
        const xPct = Math.max(10, Math.min(90, (pt.x / Math.max(1, vp.width)) * 100));
        const yPct = Math.max(22, Math.min(90, (pt.y / Math.max(1, vp.height)) * 100));
        if (!this.layout.positions[cid]) {
          this.layout.positions[cid] = { x: xPct, y: yPct, scale: 1.0 };
        } else {
          this.layout.positions[cid].x = Math.round(xPct * 10) / 10;
          this.layout.positions[cid].y = Math.round(yPct * 10) / 10;
        }
        clusterEl.setAttribute('style', this._clusterStyle(cid));
      });

      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        pointerId = null;
        saveControllerLayout(this.layout);
      };
      clusterEl.addEventListener('pointerup', endDrag);
      clusterEl.addEventListener('pointercancel', endDrag);
    });
  }

  destroy(exitRoom = false) {
    this._clearPendingConfirmTimer();
    this.net.off('room_state', this._onRoom);
    this.net.off('joined', this._onJoined);
    this.net.off('control_granted', this._onControlGranted);
    this.net.off('control_rejected', this._onControlRejected);
    this.net.off('control_revoked', this._onControlRevoked);
    this.net.off('disconnected', this._onDisconnected);
    this.net.off('start_match', this._onStart);
    this.net.off('end_match', this._onEnd);
    this.net.off('state_snapshot', this._onSnapshot);
    this.net.off('card_offer', this._onCardOffer);
    this.net.off('trivia_prompt', this._onTrivia);
    this.net.off('error', this._onError);
    this.net.off('ping', this._onPing);
    this._unsubOrientation?.();
    try { this.wakeLock?.release(); } catch {}
    if (exitRoom) {
      this.net.clearSessionSnapshot?.();
      this.net.leaveRoom();
    }
    this.rootEl.innerHTML = '';
    this.onExit();
  }
}
