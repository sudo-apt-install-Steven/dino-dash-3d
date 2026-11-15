// Sistema unificado de entrada (teclado P1/P2, gamepad, toque e remapeamento).
import { Save } from './Save.js';

export class InputSystem {
  constructor() {
    this.keysDown = new Set();
    this.justPressed = new Set();
    this.justReleased = new Set();
    this.listeners = new Map();
    this.konamiBuffer = [];
    this.konamiCode = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'KeyB', 'KeyA'
    ];
    this.onKonami = null;

    // Estado virtual (celular / toque / rede para p1..p8)
    this.virtualState = {
      p1: { left: false, right: false, jump: false, duck: false, ability: false, item: false, bullet: false, attack: false, fury: false, transmute: false },
      p2: { left: false, right: false, jump: false, duck: false, ability: false, item: false, bullet: false, attack: false, fury: false, transmute: false }
    };
    this.virtualJustPressed = { p1: new Set(), p2: new Set() };
    this._virtualPulseTimers = new Map();
    this.gamepadPrevButtons = new Map();

    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onBlur = this._handleBlur.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  _handleKeyDown(e) {
    // Evita scroll com espaço/setas quando dentro do jogo
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
      }
    }

    if (!this.keysDown.has(e.code)) {
      this.justPressed.add(e.code);
      this._trackKonami(e.code);
      this._emit('keyJustPressed', e.code);
    }
    this.keysDown.add(e.code);
  }

  _handleKeyUp(e) {
    if (this.keysDown.has(e.code)) {
      this.justReleased.add(e.code);
    }
    this.keysDown.delete(e.code);
  }

  _handleBlur() {
    this.keysDown.clear();
    this.justPressed.clear();
    this.justReleased.clear();
  }

  _trackKonami(code) {
    this.konamiBuffer.push(code);
    if (this.konamiBuffer.length > this.konamiCode.length) {
      this.konamiBuffer.shift();
    }
    if (
      this.konamiBuffer.length === this.konamiCode.length &&
      this.konamiBuffer.every((k, idx) => k === this.konamiCode[idx])
    ) {
      this.konamiBuffer = [];
      if (this.onKonami) this.onKonami();
    }
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }

  _emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) fn(payload);
  }

  setVirtualAction(playerKey, action, active) {
    if (!this.virtualState[playerKey]) {
      this.virtualState[playerKey] = { left: false, right: false, jump: false, duck: false, ability: false, item: false, bullet: false, attack: false, fury: false, transmute: false };
      this.virtualJustPressed[playerKey] = new Set();
    }
    const prev = this.virtualState[playerKey][action];
    this.virtualState[playerKey][action] = active;
    if (active && !prev) {
      this.virtualJustPressed[playerKey].add(action);
    }
  }

  triggerVirtualPulse(playerKey, action, holdMs = 0) {
    if (!this.virtualState[playerKey]) {
      this.virtualState[playerKey] = { left: false, right: false, jump: false, duck: false, ability: false, item: false, bullet: false, attack: false, fury: false, transmute: false };
      this.virtualJustPressed[playerKey] = new Set();
    }
    this.virtualJustPressed[playerKey].add(action);
    const key = `${playerKey}:${action}`;
    const prevTid = this._virtualPulseTimers.get(key);
    if (prevTid) clearTimeout(prevTid);
    if (holdMs > 0) {
      this.virtualState[playerKey][action] = true;
      const tid = setTimeout(() => {
        if (this.virtualState[playerKey]) this.virtualState[playerKey][action] = false;
        this._virtualPulseTimers.delete(key);
      }, holdMs);
      this._virtualPulseTimers.set(key, tid);
    }
  }

  applyRemoteInputMap(playerKey, inputs = {}) {
    for (const action of ['left', 'right', 'jump', 'duck', 'ability', 'item', 'bullet', 'attack', 'fury']) {
      if (inputs[action] !== undefined) {
        this.setVirtualAction(playerKey, action, !!inputs[action]);
      }
    }
  }

  isKeyDown(code) {
    return this.keysDown.has(code);
  }

  wasKeyJustPressed(code) {
    return this.justPressed.has(code);
  }

  wasKeyJustReleased(code) {
    return this.justReleased.has(code);
  }

  getBindings(playerKey = 'p1') {
    return Save.data.settings.keybindings[playerKey] || null;
  }

  // Consulta de ações com fallback clássico do Chrome Dino e suporte P3..P8 remotos
  isActionDown(playerKey, action, allowClassicAliases = true) {
    if (this.virtualState[playerKey]?.[action]) return true;
    if (playerKey !== 'p1' && playerKey !== 'p2') return false;
    const bind = this.getBindings(playerKey)?.[action];
    if (bind && this.keysDown.has(bind)) return true;
    if (playerKey === 'p1' && action === 'attack' && this.keysDown.has('KeyQ')) return true;
    if (playerKey === 'p2' && action === 'transmute' && this.keysDown.has('Slash')) return true;

    if (playerKey === 'p1' && allowClassicAliases) {
      if (action === 'jump' && this.keysDown.has('ArrowUp')) return true;
      if (action === 'duck' && this.keysDown.has('ArrowDown')) return true;
      if (action === 'left' && this.keysDown.has('ArrowLeft')) return true;
      if (action === 'right' && this.keysDown.has('ArrowRight')) return true;
    }

    if (Save.data.settings.accessibility.oneHand && playerKey === 'p1') {
      if (action === 'jump' && this.keysDown.has('KeyK')) return true;
      if (action === 'duck' && this.keysDown.has('KeyJ')) return true;
      if (action === 'ability' && this.keysDown.has('KeyL')) return true;
    }

    return this._isGamepadActionDown(playerKey, action);
  }

  wasActionJustPressed(playerKey, action, allowClassicAliases = true) {
    if (this.virtualJustPressed[playerKey]?.has(action)) return true;
    if (playerKey !== 'p1' && playerKey !== 'p2') return false;
    const bind = this.getBindings(playerKey)?.[action];
    if (bind && this.justPressed.has(bind)) return true;
    if (playerKey === 'p1' && action === 'attack' && this.justPressed.has('KeyQ')) return true;
    if (playerKey === 'p2' && action === 'transmute' && this.justPressed.has('Slash')) return true;

    if (playerKey === 'p1' && allowClassicAliases) {
      if (action === 'jump' && this.justPressed.has('ArrowUp')) return true;
      if (action === 'duck' && this.justPressed.has('ArrowDown')) return true;
      if (action === 'left' && this.justPressed.has('ArrowLeft')) return true;
      if (action === 'right' && this.justPressed.has('ArrowRight')) return true;
    }

    if (Save.data.settings.accessibility.oneHand && playerKey === 'p1') {
      if (action === 'jump' && this.justPressed.has('KeyK')) return true;
      if (action === 'duck' && this.justPressed.has('KeyJ')) return true;
      if (action === 'ability' && this.justPressed.has('KeyL')) return true;
    }

    return this._wasGamepadActionJustPressed(playerKey, action);
  }

  _pollGamepads() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    this._currentGamepadSnapshot = pads;
  }

  _getPadIndexForPlayer(playerKey) {
    return playerKey === 'p1' ? 0 : 1;
  }

  _mapGamepadAction(pad, action) {
    if (!pad || !pad.connected) return false;
    const axX = pad.axes?.[0] || 0;
    const axY = pad.axes?.[1] || 0;
    const b = pad.buttons || [];
    switch (action) {
      case 'left': return axX < -0.45 || b[14]?.pressed;
      case 'right': return axX > 0.45 || b[15]?.pressed;
      case 'jump': return b[0]?.pressed || axY < -0.55 || b[12]?.pressed;
      case 'duck': return b[1]?.pressed || axY > 0.55 || b[13]?.pressed;
      case 'ability': return b[2]?.pressed || b[5]?.pressed;
      case 'item': return b[3]?.pressed;
      case 'bullet': return b[4]?.pressed;
      default: return false;
    }
  }

  _isGamepadActionDown(playerKey, action) {
    const pads = this._currentGamepadSnapshot;
    if (!pads) return false;
    const pad = pads[this._getPadIndexForPlayer(playerKey)];
    return this._mapGamepadAction(pad, action);
  }

  _wasGamepadActionJustPressed(playerKey, action) {
    const now = this._isGamepadActionDown(playerKey, action);
    const key = `${playerKey}:${action}`;
    const prev = this.gamepadPrevButtons.get(key) || false;
    return now && !prev;
  }

  beginFrame() {
    this._pollGamepads();
  }

  endFrame() {
    // Atualiza snapshot de gamepad para detecção de borda no próximo frame
    const pads = this._currentGamepadSnapshot;
    if (pads) {
      for (const pKey of ['p1', 'p2']) {
        const pad = pads[this._getPadIndexForPlayer(pKey)];
        for (const action of ['left', 'right', 'jump', 'duck', 'ability', 'item', 'bullet']) {
          this.gamepadPrevButtons.set(`${pKey}:${action}`, this._mapGamepadAction(pad, action));
        }
      }
    }
    this.justPressed.clear();
    this.justReleased.clear();
    for (const set of Object.values(this.virtualJustPressed)) {
      set.clear();
    }
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    for (const tid of this._virtualPulseTimers.values()) clearTimeout(tid);
    this._virtualPulseTimers.clear();
  }
}
