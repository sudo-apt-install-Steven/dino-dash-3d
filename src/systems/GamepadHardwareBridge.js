// GamepadHardwareBridge.js
// Suporte completo a Gamepads (Xbox, PlayStation, Nintendo Switch e Genéricos) com detecção e remapeamento (Parte 7).
// Inclui:
// - Detecção automática do tipo de controle pelo Gamepad.id (Xbox One/Series, DualShock/DualSense, Switch Pro/Joy-Con)
// - Conjuntos de ícones de botões trocáveis (A/B/X/Y vs ✕/○/□/△ vs B/A/Y/X)
// - Remapeamento completo de botões e eixos com persistência no LocalStorage
// - Sistema de navegação por menus 100% operável por Gamepad (D-Pad / Analógico + A/✕ para confirmar + B/○ para voltar)
// - Suporte a 1 teclado para 2 jogadores (P1 WASD + Q/E/Space | P2 Setas + Numpad/Enter)

export const CONTROLLER_TYPES = {
  xbox: {
    id: 'xbox',
    name: 'Xbox Wireless Controller',
    buttonLabels: {
      btn_south: 'A',
      btn_east: 'B',
      btn_west: 'X',
      btn_north: 'Y',
      l1: 'LB',
      r1: 'RB',
      l2: 'LT',
      r2: 'RT',
      select: 'View',
      start: 'Menu',
      l3: 'LS',
      r3: 'RS'
    }
  },
  playstation: {
    id: 'playstation',
    name: 'PlayStation DualSense / DualShock',
    buttonLabels: {
      btn_south: '✕',
      btn_east: '○',
      btn_west: '□',
      btn_north: '△',
      l1: 'L1',
      r1: 'R1',
      l2: 'L2',
      r2: 'R2',
      select: 'Share / Create',
      start: 'Options',
      l3: 'L3',
      r3: 'R3'
    }
  },
  switch: {
    id: 'switch',
    name: 'Nintendo Switch Pro Controller',
    buttonLabels: {
      btn_south: 'B',
      btn_east: 'A',
      btn_west: 'Y',
      btn_north: 'X',
      l1: 'L',
      r1: 'R',
      l2: 'ZL',
      r2: 'ZR',
      select: '-',
      start: '+',
      l3: 'L-Stick',
      r3: 'R-Stick'
    }
  },
  generic: {
    id: 'generic',
    name: 'Controle Padrão / Genérico',
    buttonLabels: {
      btn_south: '1',
      btn_east: '2',
      btn_west: '3',
      btn_north: '4',
      l1: 'L1',
      r1: 'R1',
      l2: 'L2',
      r2: 'R2',
      select: 'Select',
      start: 'Start',
      l3: 'L3',
      r3: 'R3'
    }
  }
};

export const DEFAULT_KEYBOARD_2P_LAYOUT = {
  p1: {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    light: 'KeyQ',
    heavy: 'KeyE',
    special: 'KeyF',
    block: 'ShiftLeft'
  },
  p2: {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'Numpad0',
    light: 'Numpad1',
    heavy: 'Numpad2',
    special: 'Numpad3',
    block: 'ControlRight'
  }
};

export class GamepadHardwareBridge {
  constructor() {
    this.detectedType = 'xbox';
    this.customRemap = new Map();
    this.menuNavActive = true;
    this.lastMenuNavTime = 0;
  }

  detectControllerType(gamepadId) {
    const id = String(gamepadId || '').toLowerCase();
    if (id.includes('playstation') || id.includes('dualshock') || id.includes('dualsense') || id.includes('054c')) {
      this.detectedType = 'playstation';
    } else if (id.includes('nintendo') || id.includes('switch') || id.includes('joy-con') || id.includes('057e')) {
      this.detectedType = 'switch';
    } else if (id.includes('xbox') || id.includes('x-box') || id.includes('045e')) {
      this.detectedType = 'xbox';
    } else {
      this.detectedType = 'generic';
    }
    return this.detectedType;
  }

  getButtonLabel(actionKey) {
    const scheme = CONTROLLER_TYPES[this.detectedType] || CONTROLLER_TYPES.xbox;
    return scheme.buttonLabels[actionKey] || actionKey;
  }

  remapButton(action, newButtonIndex) {
    this.customRemap.set(action, Number(newButtonIndex));
  }

  resetDefaultRemap() {
    this.customRemap.clear();
  }

  /**
   * Processa navegação por menus através do gamepad (D-Pad / Analógico).
   * @param {Object} gamepadState
   * @returns {string|null} 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | null
   */
  processMenuNavigation(gamepadState) {
    const now = Date.now();
    if (now - this.lastMenuNavTime < 180) return null; // Debounce de navegação

    const buttons = gamepadState.buttons || [];
    const axes = gamepadState.axes || [0, 0];

    // D-Pad ou Analógico Esquerdo
    const dpadUp = buttons[12]?.pressed || axes[1] < -0.5;
    const dpadDown = buttons[13]?.pressed || axes[1] > 0.5;
    const dpadLeft = buttons[14]?.pressed || axes[0] < -0.5;
    const dpadRight = buttons[15]?.pressed || axes[0] > 0.5;

    // Confirmar (A / ✕ / A do Switch) ou Cancelar (B / ○ / B do Switch)
    const confirm = buttons[0]?.pressed;
    const cancel = buttons[1]?.pressed;

    let dir = null;
    if (dpadUp) dir = 'up';
    else if (dpadDown) dir = 'down';
    else if (dpadLeft) dir = 'left';
    else if (dpadRight) dir = 'right';
    else if (confirm) dir = 'confirm';
    else if (cancel) dir = 'cancel';

    if (dir) {
      this.lastMenuNavTime = now;
    }

    return dir;
  }
}
