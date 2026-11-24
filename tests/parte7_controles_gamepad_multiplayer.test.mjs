// tests/parte7_controles_gamepad_multiplayer.test.mjs
// Testes unitários para a Parte 7 (Controles e Multiplayer):
// 1. Detecção automática de Gamepad (Xbox, PlayStation, Nintendo Switch, Genérico)
// 2. Esquemas de ícones de botões trocáveis (A/B vs ✕/○ vs B/A)
// 3. Remapeamento de botões e reset de padrão
// 4. Navegação por Menus 100% via Gamepad com debounce
// 5. Layout de 1 Teclado para 2 Jogadores (P1 WASD/QE vs P2 Setas/Numpad)

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTROLLER_TYPES,
  DEFAULT_KEYBOARD_2P_LAYOUT,
  GamepadHardwareBridge
} from '../src/systems/GamepadHardwareBridge.js';

test('Parte 7.1: Detecção Automática de Gamepads (Xbox, PlayStation, Switch)', () => {
  const bridge = new GamepadHardwareBridge();

  assert.equal(bridge.detectControllerType('Sony Interactive Entertainment Wireless Controller DualSense (054c)'), 'playstation');
  assert.equal(bridge.getButtonLabel('btn_south'), '✕');
  assert.equal(bridge.getButtonLabel('btn_east'), '○');

  assert.equal(bridge.detectControllerType('Nintendo Switch Pro Controller (057e)'), 'switch');
  assert.equal(bridge.getButtonLabel('btn_south'), 'B');
  assert.equal(bridge.getButtonLabel('btn_east'), 'A');

  assert.equal(bridge.detectControllerType('Xbox Series X Bluetooth Controller (045e)'), 'xbox');
  assert.equal(bridge.getButtonLabel('btn_south'), 'A');
  assert.equal(bridge.getButtonLabel('btn_east'), 'B');

  assert.equal(bridge.detectControllerType('Unknown USB Joystick'), 'generic');
  assert.equal(bridge.getButtonLabel('btn_south'), '1');
});

test('Parte 7.2: Remapeamento de Botões de Controle', () => {
  const bridge = new GamepadHardwareBridge();
  bridge.remapButton('jump', 0); // Botão A
  bridge.remapButton('attack', 2); // Botão X

  assert.equal(bridge.customRemap.get('jump'), 0);
  assert.equal(bridge.customRemap.get('attack'), 2);

  bridge.resetDefaultRemap();
  assert.equal(bridge.customRemap.size, 0);
});

test('Parte 7.3: Navegação por Menus através de Gamepad', () => {
  const bridge = new GamepadHardwareBridge();

  // 1. D-Pad Down pressionado
  const mockPadDown = {
    buttons: new Array(16).fill({ pressed: false }),
    axes: [0, 0]
  };
  mockPadDown.buttons[13] = { pressed: true }; // D-Pad Down

  const nav1 = bridge.processMenuNavigation(mockPadDown);
  assert.equal(nav1, 'down');

  // Debounce: chamada imediata subsequente deve retornar null para evitar pulos de menu
  const navDebounce = bridge.processMenuNavigation(mockPadDown);
  assert.equal(navDebounce, null);

  // 2. Botão Confirmar (A / ✕)
  const mockPadConfirm = {
    buttons: new Array(16).fill({ pressed: false }),
    axes: [0, 0]
  };
  mockPadConfirm.buttons[0] = { pressed: true }; // Botão South

  bridge.lastMenuNavTime = 0; // Força passagem do debounce
  const navConfirm = bridge.processMenuNavigation(mockPadConfirm);
  assert.equal(navConfirm, 'confirm');
});

test('Parte 7.4: Layout de 1 Teclado para 2 Jogadores', () => {
  const p1 = DEFAULT_KEYBOARD_2P_LAYOUT.p1;
  const p2 = DEFAULT_KEYBOARD_2P_LAYOUT.p2;

  // Sem sobreposição de teclas entre P1 e P2
  const p1Keys = Object.values(p1);
  const p2Keys = Object.values(p2);

  for (const k of p1Keys) {
    assert.ok(!p2Keys.includes(k), `Tecla "${k}" não pode coincidir entre P1 e P2`);
  }
});
