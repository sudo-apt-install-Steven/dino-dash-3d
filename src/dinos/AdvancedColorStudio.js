// AdvancedColorStudio.js
// Seletor de Cor Completo com Roda/Espectro, RGB, HSL, Hex e Transparência Limitada Anti-Abuso (Parte 8.2).
// Regras Obrigatórias:
// - Suporte bidirecional a HEX, RGB e HSL
// - Limite mínimo de opacidade/transparência: alpha >= 0.35 (ou 35%) para impedir invisibilidade abusiva no multiplayer
// - Cores salvas (favoritos locais) e presets recomendados de alto contraste

export const MIN_OPACITY_THRESHOLD = 0.35; // 35% mínimo absoluto contra dinos invisíveis

export function hexToRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);

  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(Number(v) || 0)));
  const toHex = v => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function hslToRgb(h, s, l) {
  const hNorm = (h % 360) / 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  if (sNorm === 0) {
    const val = Math.round(lNorm * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p, q, t) => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255)
  };
}

/**
 * Aplica transparência sanitizada com barreira de segurança anti-invisibilidade no multiplayer.
 * @param {string} hexColor
 * @param {number} requestedOpacity 0.0 a 1.0
 * @returns {Object} { hex, opacity, rgbaString, safe: boolean }
 */
export function sanitizeDinoColor(hexColor, requestedOpacity = 1.0) {
  const rgb = hexToRgb(hexColor);
  const rawNum = Number(requestedOpacity);
  const op = Number.isFinite(rawNum) ? rawNum : 1.0;
  const opacity = Math.max(MIN_OPACITY_THRESHOLD, Math.min(1.0, op));
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  return {
    hex,
    opacity,
    rgbaString: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
    safe: opacity >= MIN_OPACITY_THRESHOLD
  };
}
