// Controle Jurássico no Celular (modelo Jackbox + Gamepad Sem Fio + Editor de Layout Temático):
// Suporta:
// 1. Conexão automática via QR Code (?controller=1&room=XXXX)
// 2. Escolha clara de modo com indicadores:
//    - 🎮 Controle 1P (Controlar Dino Principal do Telão PC/TV)
//    - 🦖 Controle 2–8P (Entrar com Dino Próprio no Telão PC/TV)
//    - 📱 Jogar no Celular como Player (Tela 3D Completa no Celular)
// 3. Controles Temáticos SEMPRE visíveis na tela + Barra de Confirmação / "Iniciar Corrida no Telão" direto pelo celular!
// 4. Editor Interativo de Layout de Botões (Arrastar, Tamanho, Opacidade, Canhoto/Destro, Joystick/Setas e Presets)
// 5. Modo Paisagem Automático / Forçado ("🔄 Deitar Tela") para funcionar mesmo com rotação bloqueada no celular.

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
      utility: { x: 42, y: 76, scale: 0.8 },
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
}

function saveControllerLayout(layout) {
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

    const connectedPeer = roomClient.isConnected
      ? roomClient.room?.peers?.find((p) => p.peerId === roomClient.peerId)
      : null;

    this.state = {
      nickname: connectedPeer?.name || Save.data.network?.nickname || `Dino_${Math.floor(10 + Math.random() * 89)}`,
      roomCode: sanitizeRoomCode(options.initialRoom || roomClient.room?.code || Save.data.network?.lastRoom || ''),
      transport: options.initialTransport || (roomClient.isConnected ? roomClient.transportType : (roomClient.supabase?.isConfigured?.() ? 'supabase' : 'lan')),
      dinoId: connectedPeer?.dinoId || Save.data.selectedDino || 'trex',
      color: connectedPeer?.color || '#58d63a',
      ready: connectedPeer ? !!connectedPeer.ready : true,
      deviceRole: connectedPeer?.role === 'mobile_player' ? 'mobile_player' : 'controller',
      controlMode: connectedPeer?.controlMode || 'p1_remote', // 'p1_remote' | 'own_dino'
      inMatch: roomClient.isConnected && roomClient.room?.status === 'playing',
      connecting: false,
      showConnectModal: !roomClient.isConnected,
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

    // Auto-conecta imediatamente se veio de um QR Code com código de 4 letras!
    if (!this.net.isConnected && this.state.roomCode.length === 4 && !this._autoConnectTried) {
      this._autoConnectTried = true;
      setTimeout(() => this._connectToRoom(), 80);
    }
  }

  async _requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {
      // ignora em dispositivos sem permissão
    }
  }

  _vibrate(ms = 20) {
    try {
      if (Save.data.settings.accessibility.vibration && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {
      // ignora
    }
  }

  _pulseDamageEdge(color = '#ff3b30') {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed; inset:0; pointer-events:none; z-index:95; box-shadow:inset 0 0 64px 20px ${color}; opacity:0.95; transition:opacity 0.35s ease;`;
    document.body.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = '0'; });
    setTimeout(() => flash.remove(), 380);
  }

  _bindNetworkEvents() {
    this._onRoom = () => {
      const selfPeer = this.net.room?.peers?.find((p) => p.peerId === this.net.peerId);
      if (selfPeer) {
        if (typeof selfPeer.ready === 'boolean') this.state.ready = selfPeer.ready;
        if (selfPeer.controlMode) this.state.controlMode = selfPeer.controlMode;
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
      this.state.showConnectModal = false;
      this.state.statusNotice = `✅ Conectado à sala ${this.net.room?.code || this.state.roomCode}! Controles prontos na tela.`;
      if (this.net.room?.status === 'playing') this.state.inMatch = true;
      this.render();
    };
    this._onStart = () => {
      this.state.inMatch = true;
      this.state.dead = false;
      this.state.cardOffer = null;
      this.state.showConnectModal = false;
      this.state.statusNotice = '🏁 Corrida iniciada no Telão! Use os botões abaixo!';
      this._vibrate([30, 40, 30]);
      this.render();
    };
    this._onEnd = () => {
      this.state.inMatch = false;
      this.state.cardOffer = null;
      this.state.statusNotice = '🏆 Fim da corrida! Você pode iniciar uma nova rodada abaixo.';
      this.render();
    };
    this._onSnapshot = (msg) => {
      const players = msg?.snapshot?.players || [];
      const me = players.find(
        (p) => p.peerId === this.net.peerId || (Array.isArray(p.controllerPeerIds) && p.controllerPeerIds.includes(this.net.peerId))
      ) || players[0];
      if (me) {
        if (!this.state.inMatch) {
          this.state.inMatch = true;
          this.state.showConnectModal = false;
        }
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
    this.net.on('start_match', this._onStart);
    this.net.on('end_match', this._onEnd);
    this.net.on('state_snapshot', this._onSnapshot);
    this.net.on('card_offer', this._onCardOffer);
    this.net.on('trivia_prompt', this._onTrivia);
    this.net.on('error', this._onError);
    this.net.on('ping', this._onPing);
  }

  async _connectToRoom() {
    const code = sanitizeRoomCode(this.state.roomCode);
    if (!code || code.length < 4) {
      this.state.errorMsg = 'Informe o código de 4 letras da sala do PC/TV.';
      this.state.showConnectModal = true;
      this.render();
      return;
    }
    this.state.connecting = true;
    this.state.errorMsg = '';
    this.render();

    Save.data.network.nickname = this.state.nickname;
    Save.data.network.lastRoom = code;
    Save.save();

    if (this.state.deviceRole === 'mobile_player') {
      const res = await this.net.joinRoom(code, {
        name: this.state.nickname,
        dinoId: this.state.dinoId,
        color: this.state.color,
        transport: this.state.transport,
        role: 'mobile_player',
        ready: true
      });
      this.state.connecting = false;
      if (!res.ok) {
        this.state.errorMsg = res.message;
        this.state.showConnectModal = true;
        this.render();
        return;
      }
      this._switchToMobilePlayer3D();
      return;
    }

    const res = await this.net.joinRoom(code, {
      name: this.state.nickname,
      dinoId: this.state.dinoId,
      color: this.state.color,
      transport: this.state.transport,
      role: 'controller',
      controlMode: this.state.controlMode,
      ready: true
    });
    this.state.connecting = false;
    if (!res.ok) {
      this.state.errorMsg = res.message;
      this.state.showConnectModal = true;
      this.render();
    } else {
      this.state.ready = true;
      this.state.showConnectModal = false;
      this.render();
    }
  }

  _switchToMobilePlayer3D() {
    this._vibrate(25);
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
        ready: true
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
    const scoreEl = this.rootEl.querySelector('#ctrl-score-pill');

    if (hpEl) hpEl.textContent = `❤️ ${snap.lives}/${snap.maxLives} • 🛡️ ${snap.shields || 0}`;
    if (scoreEl) scoreEl.textContent = `🏆 ${snap.score || 0} pts`;
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
    if (this.state.editLayoutMode) return;
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
    if (this.state.editLayoutMode) return;
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
    const snap = this.state.selfSnap || {
      lives: 3,
      maxLives: 3,
      shields: 0,
      stamina: 100,
      oxygen: 100,
      inWater: false,
      inSubmerged: false,
      diveTarget: 0,
      fury: 0,
      abilityCharge: 100,
      attackCd: 0,
      abilityCd: 0,
      canTransmute: false,
      habitatMode: 'land',
      backpack: [],
      score: 0
    };

    const isLandscape = OrientationManager.isEffectiveLandscape();
    const divingTarget = (snap.diveTarget || 0) >= 0.5;
    const duckLabel = (snap.inWater && !snap.inSubmerged)
      ? (divingTarget ? '🌊 SUBIR' : '🤿 MERGULHAR')
      : '⬇ ABAIXAR';
    const furyReady = (snap.fury || 0) >= 100;
    const modeTagText = this.state.controlMode === 'p1_remote'
      ? '🎮 Controle 1P (Dino do PC)'
      : '🦖 Controle 2–8P (Dino Próprio)';

    this.rootEl.innerHTML = `
      <div class="ctrl-screen ${this.state.editLayoutMode ? 'ctrl-editing' : ''}">
        <!-- Barra Superior Compacta com Indicadores em Tempo Real -->
        <div class="ctrl-topbar">
          <div class="ctrl-player-tag">
            <span class="ctrl-input-led ${connected ? 'online' : ''}" id="ctrl-input-led" title="Indicador de transmissão de comandos"></span>
            <span class="ctrl-color-dot" style="background:${sanitizeHexColor(this.state.color, '#58d63a')};"></span>
            <span class="ctrl-nick-lbl">${escapeHtml(this.state.nickname)}</span>
            <span class="ctrl-role-badge" id="ctrl-mode-indicator" title="Modo atual do celular">${connected ? `🟢 ${escapeHtml(this.net.room?.code || '')} • ${modeTagText}` : '⚪ Desconectado'}</span>
          </div>

          <div class="ctrl-telemetry-strip">
            <span id="ctrl-hp" class="ctrl-stat-chip">❤️ ${snap.lives}/${snap.maxLives} • 🛡️ ${snap.shields || 0}</span>
            <div class="ctrl-mini-meter" title="Estamina">
              <span>🏃</span>
              <div class="ctrl-mini-bar"><div id="ctrl-stam-fill" style="width:${snap.stamina ?? 100}%; background:#34d399;"></div></div>
            </div>
            <div class="ctrl-mini-meter" id="ctrl-o2-wrap" style="display:${snap.inWater || snap.inSubmerged ? 'flex' : 'none'};" title="Oxigênio">
              <span>🫧</span>
              <div class="ctrl-mini-bar"><div id="ctrl-o2-fill" style="width:${snap.oxygen ?? 100}%; background:#38bdf8;"></div></div>
            </div>
            <span class="ctrl-latency" id="ctrl-ping">📶 ${this.net.pingMs || 12} ms</span>
          </div>

          <div class="ctrl-top-actions">
            <button class="ctrl-slot-btn" id="ctrl-rotate-btn" title="Deitar a tela em modo Paisagem">${isLandscape ? '🔄 Paisagem ON' : '🔄 Deitar Tela'}</button>
            <button class="ctrl-slot-btn ${this.state.editLayoutMode ? 'active-tool' : ''}" id="ctrl-edit-layout-btn" title="Editar posição e tamanho dos botões">🛠️ ${this.state.editLayoutMode ? 'Salvar Layout' : 'Editar Botões'}</button>
            <button class="ctrl-slot-btn" id="ctrl-open-setup" title="Sala, Modo (Controle vs Jogador 3D) e Dinossauro">⚙️ Sala / Modo</button>
            <button class="ctrl-slot-btn ctrl-switch-3d-btn" id="ctrl-go-3d-player" title="Jogar na tela 3D do celular">📱 Virar Player 3D</button>
            <button class="ctrl-slot-btn" id="ctrl-exit" title="Voltar ao Menu">✕</button>
          </div>
        </div>

        ${CLAW_SCRATCH_SVG}

        ${this.state.statusNotice ? `
          <div class="ctrl-status-toast" id="ctrl-status-toast">
            <span>${escapeHtml(this.state.statusNotice)}</span>
          </div>
        ` : ''}

        <!-- Barra de Confirmação & Início Rápido quando conectado na Sala (Lobby) -->
        ${connected && !this.state.inMatch && !this.state.editLayoutMode ? `
          <div class="ctrl-lobby-bar" id="ctrl-lobby-bar">
            <div class="ctrl-lobby-info">
              <strong>🏠 Sala ${escapeHtml(this.net.room?.code || '')} (${this.net.room?.peers?.length || 1}/8)</strong>
              <span>Você já pode testar os controles abaixo ou iniciar a corrida no Telão!</span>
            </div>
            <div class="ctrl-lobby-btns">
              <button class="bone-btn ctrl-compact-btn ${this.state.ready ? 'jump' : ''}" id="ctrl-ready">
                ${this.state.ready ? '✅ PRONTO CONFIRMADO' : '👍 CONFIRMAR PRONTO'}
              </button>
              <button class="bone-btn ability ctrl-compact-btn" id="ctrl-start-match">
                🚀 INICIAR CORRIDA NO TELÃO!
              </button>
              <div class="ctrl-quick-emotes">
                ${['🔥', '🦖', '😱', '🏆'].map((em) => `<button class="ctrl-slot-btn" data-emote="${em}">${em}</button>`).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Barra de Edição Interativa do Layout dos Botões -->
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
              <label class="ctrl-editor-slider">
                <span>Tamanho Geral (${Math.round((this.layout.scale || 1) * 100)}%):</span>
                <input type="range" id="ctrl-edit-scale" min="75" max="140" value="${Math.round((this.layout.scale || 1) * 100)}" />
              </label>
              <label class="ctrl-editor-slider">
                <span>Botão Selecionado (${Math.round(((this.layout.positions?.[this.state.selectedEditCluster]?.scale || 1)) * 100)}%):</span>
                <input type="range" id="ctrl-edit-btn-scale" min="70" max="145" value="${Math.round(((this.layout.positions?.[this.state.selectedEditCluster]?.scale || 1)) * 100)}" />
              </label>
              <label class="ctrl-editor-slider">
                <span>Opacidade (${Math.round((this.layout.opacity || 0.96) * 100)}%):</span>
                <input type="range" id="ctrl-edit-opacity" min="50" max="100" value="${Math.round((this.layout.opacity || 0.96) * 100)}" />
              </label>
              <button class="ctrl-slot-btn" id="ctrl-joy-toggle">${this.layout.useJoystick ? '🎛️ Usando Joystick' : '◀▶ Usando Setas'}</button>
              <button class="ctrl-slot-btn" id="ctrl-reset-layout">🔄 Restaurar Padrão</button>
              <button class="bone-btn jump ctrl-compact-btn" id="ctrl-save-layout">✅ Concluir</button>
            </div>
          </div>
        ` : ''}

        <!-- Popups de Carta Pessoal ou Pergunta-Relâmpago durante a corrida -->
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

        <!-- Canvas Principal do Gamepad Temático (Posições Editáveis) -->
        <div class="ctrl-canvas-stage" id="ctrl-canvas-stage">
          <!-- Cluster 1: Direcional (Setas Fósseis ou Joystick Analógico) -->
          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'dpad' ? 'selected-cluster' : ''}"
               data-cluster="dpad"
               style="${this._clusterStyle('dpad')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Direcional</span>` : ''}
            ${this.layout.useJoystick ? `
              <div class="ctrl-joystick" id="ctrl-joystick">
                <span class="ctrl-joy-hint">◀ ARRASTE ▶</span>
                <div class="ctrl-joystick-knob" id="ctrl-knob"></div>
              </div>
            ` : `
              <div class="ctrl-dpad-pair">
                <button class="bone-btn ctrl-theme-fossil" data-hold="left" aria-label="Mover para Esquerda">
                  <span class="ctrl-btn-icon">◀</span>
                  <span class="ctrl-btn-lbl">ESQ</span>
                </button>
                <button class="bone-btn ctrl-theme-fossil" data-hold="right" aria-label="Mover para Direita">
                  <span class="ctrl-btn-icon">▶</span>
                  <span class="ctrl-btn-lbl">DIR</span>
                </button>
              </div>
            `}
          </div>

          <!-- Cluster 2: Abaixar / Mergulhar -->
          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'duck' ? 'selected-cluster' : ''}"
               data-cluster="duck"
               style="${this._clusterStyle('duck')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Abaixar/Merg.</span>` : ''}
            <button class="bone-btn duck ctrl-theme-ocean" data-hold="duck" id="ctrl-btn-duck">
              <span class="ctrl-btn-main">${duckLabel}</span>
              <span class="ctrl-btn-sub">${snap.inWater ? 'Alterna Mergulho' : 'Deslizar / Rasante'}</span>
            </button>
          </div>

          <!-- Cluster 3: Utilidades (Fúria, Mochila, Transmutação Habitat) -->
          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'utility' ? 'selected-cluster' : ''}"
               data-cluster="utility"
               style="${this._clusterStyle('utility')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Fúria & Mochila</span>` : ''}
            <div class="ctrl-utility-strip">
              <button class="bone-btn ctrl-theme-magma ${furyReady ? 'fury-ready-pulse' : ''}" id="ctrl-btn-fury" data-hold="fury">
                <span class="ctrl-btn-main">🔥 FÚRIA</span>
                <span class="ctrl-btn-sub" id="ctrl-fury-sub">${furyReady ? '🔥 PRONTA!' : `${Math.round(snap.fury || 0)}%`}</span>
              </button>
              <button class="bone-btn ctrl-theme-amber" id="ctrl-use-item">
                <span class="ctrl-btn-main">🎒 ${(snap.backpack || []).length > 0 ? (BACKPACK_ITEMS[snap.backpack[0]]?.icon || 'ITEM') : 'ITEM'}</span>
                <span class="ctrl-btn-sub">${(snap.backpack || []).length > 0 ? (BACKPACK_ITEMS[snap.backpack[0]]?.name || 'Usar') : 'Mochila'}</span>
              </button>
              <button class="bone-btn ctrl-theme-crystal" id="ctrl-btn-transmute">
                <span class="ctrl-btn-main">🔄 HABITAT</span>
                <span class="ctrl-btn-sub">${snap.habitatMode === 'aquatic' ? '🌊 Água' : (snap.habitatMode === 'flying' ? '🪽 Céu' : '🌿 Terra')}</span>
              </button>
            </div>
          </div>

          <!-- Cluster 4: Pular (Primário) -->
          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'jump' ? 'selected-cluster' : ''}"
               data-cluster="jump"
               style="${this._clusterStyle('jump')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Pulo</span>` : ''}
            <button class="bone-btn jump ctrl-theme-emerald" data-hold="jump" id="ctrl-btn-jump">
              <span class="ctrl-btn-main">⬆ PULAR</span>
              <span class="ctrl-btn-sub">Segure = Alto • 2x = Ar</span>
            </button>
          </div>

          <!-- Cluster 5: Ataque Q -->
          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'attack' ? 'selected-cluster' : ''}"
               data-cluster="attack"
               style="${this._clusterStyle('attack')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Ataque</span>` : ''}
            <button class="bone-btn ctrl-theme-claw" data-hold="attack" id="ctrl-btn-attack">
              <span class="ctrl-btn-main">⚔️ ATAQUE</span>
              <span class="ctrl-btn-sub" id="ctrl-atk-sub">${snap.attackCd > 0.05 ? `${snap.attackCd.toFixed(1)}s` : 'Pronto!'}</span>
            </button>
          </div>

          <!-- Cluster 6: Habilidade Especial -->
          <div class="ctrl-draggable-cluster ${this.state.selectedEditCluster === 'ability' ? 'selected-cluster' : ''}"
               data-cluster="ability"
               style="${this._clusterStyle('ability')}">
            ${this.state.editLayoutMode ? `<span class="ctrl-drag-badge">✥ Especial</span>` : ''}
            <button class="bone-btn ability ctrl-theme-gold" data-hold="ability" id="ctrl-btn-ability">
              <span class="ctrl-btn-main">⚡ ${escapeHtml(spec.ability?.name || 'ESPECIAL')}</span>
              <span class="ctrl-btn-sub" id="ctrl-ab-sub">${snap.abilityCd > 0.05 ? `${snap.abilityCd.toFixed(1)}s` : `${snap.abilityCharge ?? 100}%`}</span>
            </button>
          </div>
        </div>

        <!-- Modal de Conexão / Escolha de Papel (Controle Remoto vs Jogador 3D no Celular) -->
        ${this.state.showConnectModal ? `
          <div class="ctrl-setup-backdrop" id="ctrl-setup-backdrop">
            <div class="egg-shell-panel ctrl-setup-card">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <h2 style="color:#ffd447; font-size:1.15rem; margin:0;">📱 Configurar Celular & Sala</h2>
                <button class="ctrl-slot-btn" id="ctrl-close-setup">${connected ? 'Fechar' : 'Testar Botões'}</button>
              </div>

              ${this.state.errorMsg ? `<div class="ctrl-error-box">⚠️ ${escapeHtml(this.state.errorMsg)}</div>` : ''}
              ${this.state.connecting ? `<div class="ctrl-connecting-box">⏳ Conectando à sala <strong>${escapeHtml(this.state.roomCode)}</strong>...</div>` : ''}

              <div class="ctrl-mode-selector-grid">
                <button type="button" class="ctrl-mode-option ${this.state.deviceRole === 'controller' && this.state.controlMode === 'p1_remote' ? 'selected' : ''}" data-pick-mode="p1_remote">
                  <span class="ctrl-mode-ico">🎮</span>
                  <strong>Controle do PC (1P)</strong>
                  <small>Usa o celular como gamepad para controlar o dino principal no Telão PC/TV.</small>
                </button>
                <button type="button" class="ctrl-mode-option ${this.state.deviceRole === 'controller' && this.state.controlMode === 'own_dino' ? 'selected' : ''}" data-pick-mode="own_dino">
                  <span class="ctrl-mode-ico">🦖</span>
                  <strong>Novo Dino no Telão (2–8P)</strong>
                  <small>Adiciona seu próprio dino na corrida do Telão PC/TV controlado pelo celular.</small>
                </button>
                <button type="button" class="ctrl-mode-option ${this.state.deviceRole === 'mobile_player' ? 'selected' : ''}" data-pick-mode="mobile_player">
                  <span class="ctrl-mode-ico">📱</span>
                  <strong>Jogar no Celular (Tela 3D)</strong>
                  <small>Joga vendo a pista 3D diretamente na tela do seu celular!</small>
                </button>
              </div>

              <div class="ctrl-form-grid">
                <label>Código da Sala (4 letras):
                  <input class="text-input" id="ctrl-room" maxlength="4" style="width:100%; text-transform:uppercase; font-size:1.2rem; letter-spacing:4px; text-align:center;" value="${escapeHtml(this.state.roomCode)}" placeholder="UL5T" />
                </label>
                <label>Seu Apelido:
                  <input class="text-input" id="ctrl-name" maxlength="16" style="width:100%;" value="${escapeHtml(this.state.nickname)}" />
                </label>
                <label>Transporte:
                  <select class="select-input" id="ctrl-tr" style="width:100%;">
                    <option value="supabase" ${this.state.transport === 'supabase' ? 'selected' : ''}>☁️ Online (Supabase)</option>
                    <option value="lan" ${this.state.transport === 'lan' ? 'selected' : ''}>📡 LAN Wi-Fi Local</option>
                  </select>
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

              <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                <button class="bone-btn jump" id="ctrl-join" style="flex:1; min-height:48px; font-size:0.98rem;">
                  ${this.state.deviceRole === 'mobile_player' ? '📱 ENTRAR COMO JOGADOR 3D NO CELULAR' : '🎮 CONECTAR CONTROLE À SALA'}
                </button>
                ${connected ? `
                  <button class="bone-btn ability" id="ctrl-modal-start" style="min-height:48px; font-size:0.92rem;">
                    🚀 Iniciar no Telão
                  </button>
                ` : ''}
              </div>
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
    q('#ctrl-rotate-btn')?.addEventListener('click', () => {
      this._vibrate(20);
      OrientationManager.toggleForceLandscape();
      this.render();
    });
    q('#ctrl-go-3d-player')?.addEventListener('click', () => {
      this._switchToMobilePlayer3D();
    });
    q('#ctrl-open-setup')?.addEventListener('click', () => {
      this.state.showConnectModal = !this.state.showConnectModal;
      this.render();
    });
    q('#ctrl-close-setup')?.addEventListener('click', () => {
      this.state.showConnectModal = false;
      this.render();
    });

    q('#ctrl-edit-layout-btn')?.addEventListener('click', () => {
      this._vibrate(20);
      this.state.editLayoutMode = !this.state.editLayoutMode;
      if (!this.state.editLayoutMode) {
        saveControllerLayout(this.layout);
      }
      this.render();
    });

    // Seleção de modo (Controle 1P vs Controle 2-8P vs Player 3D)
    this.rootEl.querySelectorAll('[data-pick-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._vibrate(18);
        this._syncFormInputs();
        const mode = btn.getAttribute('data-pick-mode');
        if (mode === 'mobile_player') {
          this.state.deviceRole = 'mobile_player';
        } else {
          this.state.deviceRole = 'controller';
          this.state.controlMode = mode === 'own_dino' ? 'own_dino' : 'p1_remote';
        }
        if (this.net.isConnected) {
          if (this.state.deviceRole === 'mobile_player') {
            this._switchToMobilePlayer3D();
            return;
          }
          this.net.sendPlayerMeta({
            role: 'controller',
            controlMode: this.state.controlMode,
            name: this.state.nickname,
            dinoId: this.state.dinoId,
            color: this.state.color,
            ready: true
          });
        }
        this.render();
      });
    });

    q('#ctrl-join')?.addEventListener('click', () => {
      this._vibrate(30);
      this._syncFormInputs();
      if (this.net.isConnected && this.net.room?.code === this.state.roomCode) {
        if (this.state.deviceRole === 'mobile_player') {
          this._switchToMobilePlayer3D();
          return;
        }
        this.net.sendPlayerMeta({
          name: this.state.nickname,
          dinoId: this.state.dinoId,
          color: this.state.color,
          role: 'controller',
          controlMode: this.state.controlMode,
          ready: true
        });
        this.state.showConnectModal = false;
        this.render();
        return;
      }
      this._connectToRoom();
    });

    q('#ctrl-ready')?.addEventListener('click', () => {
      this._vibrate(25);
      this.state.ready = !this.state.ready;
      this.net.sendPlayerMeta({
        ready: this.state.ready,
        role: 'controller',
        controlMode: this.state.controlMode
      });
      this.render();
    });

    const triggerRemoteStart = () => {
      this._vibrate([25, 35, 25]);
      this.state.ready = true;
      this.net.sendPlayerMeta({
        ready: true,
        role: 'controller',
        controlMode: this.state.controlMode
      });
      this.net.requestStartMatch();
      this.state.showConnectModal = false;
      this.state.statusNotice = '🚀 Comando de iniciar enviado ao Telão PC/TV!';
      this.render();
    };
    q('#ctrl-start-match')?.addEventListener('click', triggerRemoteStart);
    q('#ctrl-modal-start')?.addEventListener('click', triggerRemoteStart);

    this.rootEl.querySelectorAll('[data-emote]').forEach((b) => {
      b.addEventListener('click', () => {
        this._vibrate(15);
        this.net.sendEmote(b.getAttribute('data-emote'));
      });
    });

    // Editor de Layout
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
      q('#ctrl-reset-layout')?.addEventListener('click', () => {
        this._applyPreset('default');
      });
      q('#ctrl-save-layout')?.addEventListener('click', () => {
        this.state.editLayoutMode = false;
        saveControllerLayout(this.layout);
        this.render();
      });

      this._bindClusterDragEditor();
      return;
    }

    // Botões de segurar/apertar do Gamepad
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

    // Joystick Analógico com suporte a coordenadas rotacionadas
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

    q('#ctrl-use-item')?.addEventListener('click', () => {
      this._pulseAction('item', 140);
    });
    q('#ctrl-btn-transmute')?.addEventListener('click', () => {
      this._pulseAction('transmute', 140);
    });

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
    this.net.off('room_state', this._onRoom);
    this.net.off('joined', this._onJoined);
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
      this.net.leaveRoom();
    }
    this.rootEl.innerHTML = '';
    this.onExit();
  }
}
