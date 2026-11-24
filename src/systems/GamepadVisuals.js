// Sistema Vetorial de Ícones de Botões de Gamepad Trocáveis (Xbox / PlayStation / Nintendo Switch)
// com Auto-Detecção via Navigator Gamepad API e Zero Emojis (Parte 7).

export const GAMEPAD_FAMILIES = Object.freeze(['xbox', 'playstation', 'switch']);

export function detectGamepadFamilyFromId(gamepadId = '') {
  const id = String(gamepadId || '').toLowerCase();
  if (/dualsense|dualshock|playstation|wireless controller|054c/i.test(id)) return 'playstation';
  if (/nintendo|switch|joy-con|pro controller|057e/i.test(id)) return 'switch';
  return 'xbox';
}

export function getActiveGamepadFamily(preferred = 'auto') {
  if (GAMEPAD_FAMILIES.includes(preferred)) return preferred;
  if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
    try {
      const pads = navigator.getGamepads() || [];
      for (const pad of pads) {
        if (pad && pad.connected && pad.id) {
          return detectGamepadFamilyFromId(pad.id);
        }
      }
    } catch {}
  }
  return 'xbox';
}

const BUTTON_LABELS = Object.freeze({
  xbox: {
    south: { txt: 'A', color: '#22c55e' },
    east:  { txt: 'B', color: '#ef4444' },
    west:  { txt: 'X', color: '#38bdf8' },
    north: { txt: 'Y', color: '#eab308' },
    lb:    { txt: 'LB', color: '#94a3b8' },
    rb:    { txt: 'RB', color: '#94a3b8' },
    lt:    { txt: 'LT', color: '#94a3b8' },
    rt:    { txt: 'RT', color: '#94a3b8' },
    start: { txt: 'MENU', color: '#cbd5e1' }
  },
  playstation: {
    south: { shape: 'cross',    color: '#60a5fa' },
    east:  { shape: 'circle',   color: '#fb7185' },
    west:  { shape: 'square',   color: '#e879f9' },
    north: { shape: 'triangle', color: '#34d399' },
    lb:    { txt: 'L1', color: '#94a3b8' },
    rb:    { txt: 'R1', color: '#94a3b8' },
    lt:    { txt: 'L2', color: '#94a3b8' },
    rt:    { txt: 'R2', color: '#94a3b8' },
    start: { txt: 'OPTIONS', color: '#cbd5e1' }
  },
  switch: {
    south: { txt: 'B', color: '#eab308' },
    east:  { txt: 'A', color: '#ef4444' },
    west:  { txt: 'Y', color: '#22c55e' },
    north: { txt: 'X', color: '#38bdf8' },
    lb:    { txt: 'L',  color: '#94a3b8' },
    rb:    { txt: 'R',  color: '#94a3b8' },
    lt:    { txt: 'ZL', color: '#94a3b8' },
    rt:    { txt: 'ZR', color: '#94a3b8' },
    start: { txt: '+',  color: '#cbd5e1' }
  }
});

/**
 * Retorna SVG vetorial nítido para qualquer botão lógico ('south', 'east', 'west', 'north', 'lb', 'rb', 'lt', 'rt', 'start').
 */
export function renderGamepadButtonSVG(logicalBtn = 'south', { family = 'auto', size = 24 } = {}) {
  const fam = getActiveGamepadFamily(family);
  const meta = BUTTON_LABELS[fam]?.[logicalBtn] || BUTTON_LABELS.xbox.south;
  const s = Math.max(16, Number(size) || 24);

  if (meta.shape) {
    let inner = '';
    if (meta.shape === 'cross') {
      inner = `<path d="M8 8L16 16M16 8L8 16" stroke="${meta.color}" stroke-width="2.4" stroke-linecap="round"/>`;
    } else if (meta.shape === 'circle') {
      inner = `<circle cx="12" cy="12" r="5" fill="none" stroke="${meta.color}" stroke-width="2.3"/>`;
    } else if (meta.shape === 'square') {
      inner = `<rect x="7.5" y="7.5" width="9" height="9" rx="1.2" fill="none" stroke="${meta.color}" stroke-width="2.2"/>`;
    } else if (meta.shape === 'triangle') {
      inner = `<polygon points="12,6.6 17.4,16.4 6.6,16.4" fill="none" stroke="${meta.color}" stroke-width="2.2" stroke-linejoin="round"/>`;
    }
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-label="${fam} ${logicalBtn}" style="vertical-align:middle;">
        <circle cx="12" cy="12" r="10.5" fill="#18181b" stroke="rgba(255,255,255,0.28)" stroke-width="1.4"/>
        ${inner}
      </svg>
    `.trim();
  }

  const isWide = (meta.txt?.length || 1) >= 2;
  const w = isWide ? Math.round(s * 1.45) : s;
  return `
    <svg width="${w}" height="${s}" viewBox="0 0 ${isWide ? 34 : 24} 24" aria-label="${fam} ${meta.txt}" style="vertical-align:middle;">
      <rect x="1.5" y="2" width="${isWide ? 31 : 21}" height="20" rx="${isWide ? 6 : 10}" fill="#18181b" stroke="${meta.color}" stroke-width="1.8"/>
      <text x="${isWide ? 17 : 12}" y="15.5" text-anchor="middle" fill="${meta.color}" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="${meta.txt.length > 3 ? 6.5 : 10.5}">${meta.txt}</text>
    </svg>
  `.trim();
}
