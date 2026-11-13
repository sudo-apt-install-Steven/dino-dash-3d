// Controle Jurássico no Celular (modelo Jackbox, ideias 147–158 + 192–194):
// tema pedra/osso/ovo, arranhões SVG, vibração, canhoto/destro, joystick arrastável,
// cartas pessoais no celular, mochila, latência, Wake Lock, aviso paisagem e PWA.
import { DINO_CATALOG, getDinoSpec } from '../dinos/DinoCatalog.js';
import { BACKPACK_ITEMS } from '../systems/Items.js';
import { Save } from '../systems/Save.js';

const CLAW_SCRATCH_SVG = `
  <svg class="ctrl-claw-svg" viewBox="0 0 360 22" preserveAspectRatio="none" aria-hidden="true">
    <path d="M12 4 L125 11 L18 16 M108 6 L252 10 L122 18 M235 4 L348 12 L248 19"
          stroke="#c97b3e" stroke-width="2.6" stroke-linecap="round" fill="none" />
  </svg>
`;

export class MobileController {
  constructor(rootEl, roomClient, options = {}) {
    this.rootEl = rootEl;
    this.net = roomClient;
    this.onExit = options.onExit || (() => {});
    this.deferredInstall = options.deferredInstall || null;

    const connectedPeer = roomClient.isConnected
      ? roomClient.room?.peers?.find((p) => p.peerId === roomClient.peerId)
      : null;

    this.state = {
      nickname: connectedPeer?.name || Save.data.network?.nickname || `Dino${Math.floor(10 + Math.random() * 89)}`,
      roomCode: options.initialRoom || roomClient.room?.code || Save.data.network?.lastRoom || '',
      transport: options.initialTransport || (roomClient.isConnected ? roomClient.transportType : (roomClient.supabase?.isConfigured?.() ? 'supabase' : 'lan')),
      dinoId: connectedPeer?.dinoId || Save.data.selectedDino || 'trex',
      color: connectedPeer?.color || '#58d63a',
      ready: !!connectedPeer?.ready,
      leftHanded: false,
      useJoystick: false,
      inMatch: roomClient.isConnected && roomClient.room?.status === 'playing',
      dead: false,
      cardOffer: null,
      triviaPrompt: null,
      selfSnap: null,
      errorMsg: ''
    };

    this.heldActions = { left: false, right: false, jump: false, duck: false, ability: false, attack: false, item: false, bullet: false };
    this.wakeLock = null;
    this._bindNetworkEvents();
    this._requestWakeLock();
    this.render();
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

  _vibrate(ms = 22) {
    try {
      if (Save.data.settings.accessibility.vibration && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {
      // ignora
    }
  }

  _bindNetworkEvents() {
    this._onRoom = () => {
      const wasInMatch = this.state.inMatch;
      const selfPeer = this.net.room?.peers?.find((p) => p.peerId === this.net.peerId);
      if (selfPeer && typeof selfPeer.ready === 'boolean') {
        this.state.ready = selfPeer.ready;
      }
      if (this.net.room?.status === 'playing' && !this.state.inMatch) {
        this.state.inMatch = true;
        this.render();
        return;
      }
      if (!wasInMatch) {
        this.render();
      }
    };
    this._onJoined = () => {
      this.state.errorMsg = '';
      if (this.net.room?.status === 'playing') this.state.inMatch = true;
      this.render();
    };
    this._onStart = () => {
      this.state.inMatch = true;
      this.state.dead = false;
      this.state.cardOffer = null;
      this.render();
    };
    this._onEnd = () => {
      this.state.inMatch = false;
      this.state.cardOffer = null;
      this.render();
    };
    this._onSnapshot = (msg) => {
      const me = msg?.snapshot?.players?.find((p) => p.peerId === this.net.peerId);
      if (me) {
        this.state.selfSnap = me;
        this.state.dead = !!me.dead;
        this._updateLiveHudBars();
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
      this.state.errorMsg = msg.message || 'Erro de conexão.';
      this.render();
    };
    this._onPing = () => {
      const el = this.rootEl.querySelector('#ctrl-ping');
      if (el) el.textContent = `📶 ${this.net.pingMs || 2} ms`;
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

  _updateLiveHudBars() {
    const snap = this.state.selfSnap;
    if (!snap) return;
    const hpEl = this.rootEl.querySelector('#ctrl-hp');
    const atkEl = this.rootEl.querySelector('#ctrl-atk');
    const cdEl = this.rootEl.querySelector('#ctrl-cd');
    if (hpEl) hpEl.textContent = `❤️ ${snap.lives}/${snap.maxLives} • 🛡️ ${snap.shields || 0}`;
    if (atkEl) atkEl.textContent = snap.attackCd > 0 ? `⚔️ ${snap.attackCd.toFixed(1)}s` : '⚔️ Q Pronto!';
    if (cdEl) cdEl.textContent = snap.abilityCd > 0 ? `⏳ ${snap.abilityCd.toFixed(1)}s` : '⚡ Pronta!';
  }

  _setHeld(act, down) {
    if (down) this._vibrate(20);
    this.heldActions[act] = !!down;
    this.net.sendInputState(this.heldActions);
  }

  render() {
    const connected = this.net.isConnected;
    const spec = getDinoSpec(this.state.dinoId);

    if (!connected) {
      this.rootEl.innerHTML = `
        <div class="ctrl-screen">
          <div class="ctrl-topbar">
            <div class="ctrl-player-tag">📱 Controle Jurássico — DINO DASH 3D</div>
            <button class="chunky-btn secondary" id="ctrl-back" style="padding:6px 12px; font-size:0.82rem;">Voltar ao Jogo</button>
          </div>
          ${CLAW_SCRATCH_SVG}
          <div class="egg-shell-panel" style="max-width:460px; margin:12px auto; width:100%;">
            <h2 style="color:#ffd447; margin-bottom:10px;">🥚 Entrar na Sala do PC/TV</h2>
            ${this.state.errorMsg ? `<div style="color:#ff6b81; font-weight:700; margin-bottom:8px;">⚠️ ${this.state.errorMsg}</div>` : ''}
            <div style="display:grid; gap:10px;">
              <label>Código da Sala (4 letras):
                <input class="text-input" id="ctrl-room" maxlength="4" style="width:100%; text-transform:uppercase; font-size:1.3rem; letter-spacing:4px; text-align:center;" value="${this.state.roomCode}" placeholder="DINO" />
              </label>
              <label>Seu Apelido:
                <input class="text-input" id="ctrl-name" maxlength="16" style="width:100%;" value="${this.state.nickname}" />
              </label>
              <div style="display:flex; gap:8px;">
                <label style="flex:1;">Transporte:
                  <select class="select-input" id="ctrl-tr" style="width:100%;">
                    <option value="lan" ${this.state.transport === 'lan' ? 'selected' : ''}>LAN Wi-Fi (WebSocket)</option>
                    <option value="supabase" ${this.state.transport === 'supabase' ? 'selected' : ''}>Online (Supabase)</option>
                  </select>
                </label>
                <label>Cor:
                  <input type="color" id="ctrl-color" value="${this.state.color}" style="width:52px; height:36px;" />
                </label>
              </div>
              <label>Seu Dinossauro:
                <select class="select-input" id="ctrl-dino" style="width:100%;">
                  ${DINO_CATALOG.slice(0, 13).map((d) => `<option value="${d.id}" ${d.id === this.state.dinoId ? 'selected' : ''}>${d.name}</option>`).join('')}
                </select>
              </label>
              <button class="bone-btn jump" id="ctrl-join" style="width:100%; margin-top:6px;">🦖 CONECTAR À SALA</button>
              ${this.deferredInstall ? `<button class="chunky-btn orange" id="ctrl-pwa">📲 Instalar como App (PWA)</button>` : ''}
            </div>
          </div>
        </div>
      `;

      this.rootEl.querySelector('#ctrl-back').onclick = () => this.destroy(true);
      this.rootEl.querySelector('#ctrl-pwa')?.addEventListener('click', () => {
        this.deferredInstall?.prompt();
      });
      this.rootEl.querySelector('#ctrl-join').onclick = async () => {
        this._vibrate(30);
        this.state.roomCode = this.rootEl.querySelector('#ctrl-room').value.toUpperCase().trim();
        this.state.nickname = this.rootEl.querySelector('#ctrl-name').value.trim() || 'Dino';
        this.state.transport = this.rootEl.querySelector('#ctrl-tr').value;
        this.state.color = this.rootEl.querySelector('#ctrl-color').value;
        this.state.dinoId = this.rootEl.querySelector('#ctrl-dino').value;
        Save.data.network.nickname = this.state.nickname;
        Save.data.network.lastRoom = this.state.roomCode;
        Save.save();
        const res = await this.net.joinRoom(this.state.roomCode, {
          name: this.state.nickname,
          dinoId: this.state.dinoId,
          color: this.state.color,
          transport: this.state.transport,
          role: 'controller'
        });
        if (!res.ok) {
          this.state.errorMsg = res.message;
          this.render();
        }
      };
      return;
    }

    // Conectado — Sala de Espera Animada (Lobby) OU Controle Ativo / Espectador / Carta
    if (!this.state.inMatch) {
      this.rootEl.innerHTML = `
        <div class="ctrl-screen">
          <div class="ctrl-topbar">
            <div class="ctrl-player-tag">
              <span class="ctrl-color-dot" style="background:${this.state.color};"></span>
              <span>${this.state.nickname} (${spec.name})</span>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="ctrl-latency" id="ctrl-ping">📶 ${this.net.pingMs || 2} ms</span>
              <span class="ctrl-latency">Sala ${this.net.room?.code || ''}</span>
              <button class="chunky-btn secondary" id="ctrl-leave" style="padding:4px 10px; font-size:0.75rem;">Sair</button>
            </div>
          </div>
          ${CLAW_SCRATCH_SVG}
          <div class="egg-shell-panel" style="text-align:center; margin-top:10px;">
            <div style="font-size:2.4rem;">🦖✨</div>
            <h2 style="color:#ffd447;">Pronto para Correr!</h2>
            <p style="font-size:0.86rem; color:#e5cbb0;">Aguardando o Telão PC/TV iniciar a partida... (${this.net.room?.peers?.length || 1}/8 jogadores)</p>
            <button class="bone-btn ${this.state.ready ? 'jump' : ''}" id="ctrl-ready" style="margin:12px auto;">
              ${this.state.ready ? '✅ ESTOU PRONTO!' : '👍 MARCAR PRONTO'}
            </button>
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin-top:8px;">
              ${['🔥', '🦖', '😱', '🏆', '🥚'].map((em) => `<button class="ctrl-slot-btn" data-emote="${em}">${em}</button>`).join('')}
            </div>
            <div style="margin-top:10px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
              <span style="font-size:0.8rem; color:#ffe6a7; align-self:center;">Apostar 10 Ovos no vencedor:</span>
              ${(this.net.room?.peers || []).map((p) => `<button class="ctrl-slot-btn" data-bet="${p.peerId}">🎲 ${p.name}</button>`).join('')}
            </div>
          </div>
        </div>
      `;
      this.rootEl.querySelector('#ctrl-leave').onclick = () => this.destroy(true);
      this.rootEl.querySelector('#ctrl-ready').onclick = () => {
        this._vibrate(25);
        this.state.ready = !this.state.ready;
        this.net.sendPlayerMeta({ ready: this.state.ready });
        this.render();
      };
      this.rootEl.querySelectorAll('[data-emote]').forEach((b) => {
        b.onclick = () => { this._vibrate(15); this.net.sendEmote(b.getAttribute('data-emote')); };
      });
      this.rootEl.querySelectorAll('[data-bet]').forEach((b) => {
        b.onclick = () => {
          this._vibrate(25);
          this.net.sendBet(b.getAttribute('data-bet'), 10);
          b.textContent = '✅ Apostado!';
        };
      });
      return;
    }

    // Partida Ativa -> Trivia, Escolha de Cartas no celular, Espectador ou Controle Jurássico!
    const snap = this.state.selfSnap || { lives: 3, maxLives: 3, shields: 0, attackCd: 0, abilityCd: 0, backpack: [] };
    this.rootEl.innerHTML = `
      <div class="ctrl-screen">
        <div class="ctrl-topbar">
          <div class="ctrl-player-tag">
            <span class="ctrl-color-dot" style="background:${this.state.color};"></span>
            <span>${this.state.nickname}</span>
            <span id="ctrl-hp" style="font-size:0.85rem; color:#ffd447;">❤️ ${snap.lives}/${snap.maxLives} • 🛡️ ${snap.shields || 0}</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="ctrl-latency" id="ctrl-atk">⚔️ Pronto</span>
            <span class="ctrl-latency" id="ctrl-cd">⚡ Pronta</span>
            <span class="ctrl-latency" id="ctrl-ping">📶 ${this.net.pingMs || 2} ms</span>
            <button class="ctrl-slot-btn" id="ctrl-swap">🖐️ ${this.state.leftHanded ? 'Canhoto' : 'Destro'}</button>
            <button class="ctrl-slot-btn" id="ctrl-joy-toggle">${this.state.useJoystick ? '🎛️ Joy' : '⬅️➡️ Setas'}</button>
            <button class="ctrl-slot-btn" id="ctrl-exit">✕</button>
          </div>
        </div>
        <div class="ctrl-portrait-warn">📱 Gire seu celular para o modo paisagem para jogar melhor!</div>
        ${CLAW_SCRATCH_SVG}

        ${this.state.triviaPrompt ? `
          <div class="egg-shell-panel" style="margin-top:8px;">
            <strong style="color:#ffd447;">⚡ PERGUNTA-RELÂMPAGO (+15 OVOS):</strong>
            <div style="margin:6px 0;">${this.state.triviaPrompt.question}</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              ${this.state.triviaPrompt.options.map((opt, idx) => `<button class="bone-btn" data-trivia="${idx}" style="min-height:44px; font-size:0.85rem;">${opt}</button>`).join('')}
            </div>
          </div>
        ` : ''}

        ${this.state.cardOffer ? `
          <div class="egg-shell-panel" style="margin-top:8px;">
            <strong style="color:#ffd447;">✨ ESCOLHA SUA CARTA NO CELULAR (sem pausar os outros!):</strong>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:8px;">
              ${this.state.cardOffer.map((c, idx) => `
                <button class="bone-btn" data-pick-card="${idx}" style="flex-direction:column; min-height:74px; padding:8px; font-size:0.76rem; border-color:${c.rarityColor || '#ffd447'};">
                  <span>${c.name}</span>
                  <span style="font-weight:500; font-size:0.68rem;">${c.desc}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : this.state.dead ? `
          <div class="egg-shell-panel" style="margin-top:12px; text-align:center;">
            <h2 style="color:#38bdf8;">👻 MODO ESPECTADOR / TORCIDA</h2>
            <p style="font-size:0.85rem;">Ajude aliados ou envie obstáculos divertidos!</p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:10px;">
              <button class="bone-btn jump" data-spec="help_fruit">🍉 Fruta Aliada</button>
              <button class="bone-btn duck" data-spec="help_shield">🔰 Dar Escudo</button>
              <button class="bone-btn ability" data-spec="sabotage_cactus">🌵 Jogar Cacto</button>
              <button class="bone-btn" data-spec="sabotage_rock">🪨 Jogar Pedra</button>
            </div>
          </div>
        ` : `
          <div class="ctrl-pad-grid ${this.state.leftHanded ? 'left-handed' : ''}">
            <div class="ctrl-dpad-zone">
              ${this.state.useJoystick ? `
                <div class="ctrl-joystick" id="ctrl-joystick">
                  <span>ARRASTE ◀ ▶</span>
                  <div class="ctrl-joystick-knob" id="ctrl-knob"></div>
                </div>
              ` : `
                <div style="display:flex; gap:12px;">
                  <button class="bone-btn" data-hold="left">◀ ESQ</button>
                  <button class="bone-btn" data-hold="right">DIR ▶</button>
                </div>
              `}
              <div style="display:flex; gap:10px;">
                <button class="bone-btn duck" data-hold="duck">⬇ ABAIXAR</button>
                <button class="bone-btn" data-hold="attack">⚔️ ATAQUE</button>
              </div>
            </div>
            <div class="ctrl-action-zone">
              <button class="bone-btn jump" data-hold="jump">⬆ PULAR</button>
              <button class="bone-btn ability" data-hold="ability">⚡ ESPECIAL</button>
              <div class="ctrl-backpack-row">
                ${(snap.backpack || []).length === 0
                  ? `<span style="font-size:0.75rem; color:#bca07e;">🎒 Mochila vazia</span>`
                  : (snap.backpack || []).map((id) => {
                    const it = BACKPACK_ITEMS[id];
                    return `<button class="ctrl-slot-btn" id="ctrl-use-item">${it ? `${it.icon} ${it.name}` : id}</button>`;
                  }).join('')}
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    this.rootEl.querySelector('#ctrl-exit').onclick = () => this.destroy(true);
    this.rootEl.querySelector('#ctrl-swap').onclick = () => {
      this.state.leftHanded = !this.state.leftHanded;
      this.render();
    };
    this.rootEl.querySelector('#ctrl-joy-toggle').onclick = () => {
      this.state.useJoystick = !this.state.useJoystick;
      this.render();
    };
    this.rootEl.querySelectorAll('[data-hold]').forEach((btn) => {
      const act = btn.getAttribute('data-hold');
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.classList.add('active'); this._setHeld(act, true); });
      const up = () => { btn.classList.remove('active'); this._setHeld(act, false); };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
    const joy = this.rootEl.querySelector('#ctrl-joystick');
    const knob = this.rootEl.querySelector('#ctrl-knob');
    if (joy && knob) {
      let originX = 0;
      joy.addEventListener('pointerdown', (e) => {
        originX = e.clientX;
        joy.setPointerCapture?.(e.pointerId);
      });
      joy.addEventListener('pointermove', (e) => {
        if (!e.buttons && e.pointerType === 'mouse') return;
        const dx = Math.max(-45, Math.min(45, e.clientX - originX));
        knob.style.transform = `translateX(${dx}px)`;
        this._setHeld('left', dx < -18);
        this._setHeld('right', dx > 18);
      });
      const resetJoy = () => {
        knob.style.transform = 'translateX(0px)';
        this._setHeld('left', false);
        this._setHeld('right', false);
      };
      joy.addEventListener('pointerup', resetJoy);
      joy.addEventListener('pointercancel', resetJoy);
    }
    this.rootEl.querySelector('#ctrl-use-item')?.addEventListener('click', () => {
      this._vibrate(25);
      this.net.sendInputState({ ...this.heldActions, item: true });
      setTimeout(() => this.net.sendInputState({ ...this.heldActions, item: false }), 120);
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
    this.rootEl.querySelectorAll('[data-spec]').forEach((btn) => {
      btn.onclick = () => {
        this._vibrate(20);
        this.net.sendSpectatorAction(btn.getAttribute('data-spec'));
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
    try { this.wakeLock?.release(); } catch {}
    if (exitRoom) {
      this.net.leaveRoom();
    }
    this.rootEl.innerHTML = '';
    this.onExit();
  }
}
