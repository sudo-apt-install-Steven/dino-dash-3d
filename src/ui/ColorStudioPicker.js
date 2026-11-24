// Seletor de Cor Studio Completo (Parte 8.2):
// Roda/Espectro HSV, Brilho, Saturação, Hex, RGB, HSL, Conta-Gotas (EyeDropper API + fallback),
// Paleta de Cores Salvas e Transparência com Piso Mínimo Anti-Abuso (nunca permite dino invisível!).
import { escapeHtml } from '../security/Sanitize.js';

export const MIN_DINO_ALPHA_SOLO = 0.35;
export const MIN_DINO_ALPHA_MULTIPLAYER = 0.65;
const SAVED_SWATCHES_KEY = 'dino_dash_saved_colors_v1';

export function clampDinoAlpha(alpha, { multiplayer = false } = {}) {
  const minA = multiplayer ? MIN_DINO_ALPHA_MULTIPLAYER : MIN_DINO_ALPHA_SOLO;
  const n = Number(alpha);
  if (!Number.isFinite(n)) return 1;
  return Math.max(minA, Math.min(1, Number(n.toFixed(2))));
}

export function hexToRgb(hex) {
  const clean = String(hex || '#22c55e').trim().replace(/^#/, '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 34, g: 197, b: 94 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex({ r = 0, g = 0, b = 0 }) {
  const clampByte = (v) => Math.max(0, Math.min(255, Math.round(Number(v) || 0)));
  return '#' + [clampByte(r), clampByte(g), clampByte(b)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

export function rgbToHsl({ r = 0, g = 0, b = 0 }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h = 0, s = 100, l = 50 }) {
  const hn = (((Number(h) || 0) % 360) + 360) % 360 / 360;
  const sn = Math.max(0, Math.min(100, Number(s) || 0)) / 100;
  const ln = Math.max(0, Math.min(100, Number(l) || 0)) / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255)
  };
}

export function loadSavedSwatches() {
  const defaults = ['#22c55e', '#f59e0b', '#38bdf8', '#f43f5e', '#a855f7', '#eab308', '#14b8a6', '#f8fafc'];
  try {
    if (typeof localStorage === 'undefined') return defaults;
    const raw = JSON.parse(localStorage.getItem(SAVED_SWATCHES_KEY) || 'null');
    if (Array.isArray(raw) && raw.length) {
      return raw.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 16);
    }
  } catch {}
  return defaults;
}

export function saveColorSwatch(hex) {
  const rgb = hexToRgb(hex);
  const clean = rgbToHex(rgb);
  const list = [clean, ...loadSavedSwatches().filter((c) => c.toLowerCase() !== clean.toLowerCase())].slice(0, 16);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_SWATCHES_KEY, JSON.stringify(list));
    }
  } catch {}
  return list;
}

/**
 * Renderiza o Widget Completo do Color Studio dentro de `container` e invoca `onChange({ hex, rgb, hsl, alpha })` ao vivo.
 */
export class ColorStudioPicker {
  constructor(container, { initialHex = '#22c55e', initialAlpha = 1, multiplayer = false, onChange = null } = {}) {
    this.container = container;
    this.multiplayer = multiplayer;
    this.onChange = onChange;
    this.rgb = hexToRgb(initialHex);
    this.hsl = rgbToHsl(this.rgb);
    this.alpha = clampDinoAlpha(initialAlpha, { multiplayer });
    this.swatches = loadSavedSwatches();
    this.render();
  }

  getState() {
    return {
      hex: rgbToHex(this.rgb),
      rgb: { ...this.rgb },
      hsl: { ...this.hsl },
      alpha: this.alpha
    };
  }

  _emit() {
    this.onChange?.(this.getState());
  }

  render() {
    if (!this.container) return;
    const hex = rgbToHex(this.rgb);
    const minAlphaPct = Math.round((this.multiplayer ? MIN_DINO_ALPHA_MULTIPLAYER : MIN_DINO_ALPHA_SOLO) * 100);
    const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

    this.container.innerHTML = `
      <div class="dd-glass-card" style="padding:14px; display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <strong style="font-size:0.9rem; color:#fafafa;">Estúdio de Cor Completo</strong>
          <div style="display:flex; align-items:center; gap:6px;">
            <span id="cs-live-chip" style="width:28px; height:28px; border-radius:8px; border:1px solid rgba(255,255,255,0.28); background:${hex}; opacity:${this.alpha}; display:inline-block;"></span>
            <button type="button" class="dd-btn" id="cs-eyedropper" style="min-height:34px; padding:4px 10px; font-size:0.76rem;" title="${hasEyeDropper ? 'Capturar cor da tela' : 'Sortear amostra do espectro'}">Conta-Gotas</button>
            <button type="button" class="dd-btn dd-btn-emerald" id="cs-save-swatch" style="min-height:34px; padding:4px 10px; font-size:0.76rem;">+ Salvar</button>
          </div>
        </div>

        <canvas id="cs-spectrum" width="280" height="128" style="width:100%; height:128px; border-radius:10px; cursor:crosshair; border:1px solid rgba(255,255,255,0.14);"></canvas>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; font-size:0.75rem;">
          <label>Matiz (${this.hsl.h}°)
            <input type="range" id="cs-h" min="0" max="360" value="${this.hsl.h}" style="width:100%;" />
          </label>
          <label>Saturação (${this.hsl.s}%)
            <input type="range" id="cs-s" min="0" max="100" value="${this.hsl.s}" style="width:100%;" />
          </label>
          <label>Brilho (${this.hsl.l}%)
            <input type="range" id="cs-l" min="0" max="100" value="${this.hsl.l}" style="width:100%;" />
          </label>
        </div>

        <div style="display:grid; grid-template-columns:1.2fr 1fr 1fr 1fr; gap:6px; font-size:0.74rem;">
          <label>HEX
            <input type="text" id="cs-hex" class="text-input" maxlength="7" value="${escapeHtml(hex)}" style="width:100%; font-family:monospace;" />
          </label>
          <label>R
            <input type="number" id="cs-r" class="text-input" min="0" max="255" value="${this.rgb.r}" style="width:100%;" />
          </label>
          <label>G
            <input type="number" id="cs-g" class="text-input" min="0" max="255" value="${this.rgb.g}" style="width:100%;" />
          </label>
          <label>B
            <input type="number" id="cs-b" class="text-input" min="0" max="255" value="${this.rgb.b}" style="width:100%;" />
          </label>
        </div>

        <label style="font-size:0.76rem; display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; justify-content:space-between;">
            <span>Opacidade / Transparência (mín. ${minAlphaPct}% anti-invisibilidade)</span>
            <strong id="cs-alpha-lbl">${Math.round(this.alpha * 100)}%</strong>
          </div>
          <input type="range" id="cs-alpha" min="${minAlphaPct}" max="100" value="${Math.round(this.alpha * 100)}" />
        </label>

        <div style="display:flex; gap:6px; flex-wrap:wrap;" id="cs-swatches">
          ${this.swatches.map((sw) => `
            <button type="button" data-swatch="${escapeHtml(sw)}" aria-label="Cor salva ${escapeHtml(sw)}" style="width:24px; height:24px; border-radius:6px; border:1px solid rgba(255,255,255,0.28); background:${escapeHtml(sw)}; cursor:pointer;"></button>
          `).join('')}
        </div>
      </div>
    `;

    this._drawSpectrum();
    this._bindEvents();
  }

  _drawSpectrum() {
    const c = this.container?.querySelector('#cs-spectrum');
    const ctx = c?.getContext?.('2d');
    if (!ctx || !c) return;
    const w = c.width, h = c.height;
    const hueGrad = ctx.createLinearGradient(0, 0, w, 0);
    for (let stop = 0; stop <= 6; stop++) {
      hueGrad.addColorStop(stop / 6, `hsl(${stop * 60}, 100%, 50%)`);
    }
    ctx.fillStyle = hueGrad;
    ctx.fillRect(0, 0, w, h);

    const lightGrad = ctx.createLinearGradient(0, 0, 0, h);
    lightGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
    lightGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    lightGrad.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, w, h);

    const mx = (this.hsl.h / 360) * w;
    const my = (1 - this.hsl.l / 100) * h;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  _bindEvents() {
    const root = this.container;
    const spec = root.querySelector('#cs-spectrum');
    spec?.addEventListener('pointerdown', (e) => {
      const rect = spec.getBoundingClientRect();
      const h = Math.round(((e.clientX - rect.left) / Math.max(1, rect.width)) * 360);
      const l = Math.round((1 - (e.clientY - rect.top) / Math.max(1, rect.height)) * 100);
      this.hsl = { h: Math.max(0, Math.min(360, h)), s: Math.max(35, this.hsl.s), l: Math.max(8, Math.min(94, l)) };
      this.rgb = hslToRgb(this.hsl);
      this._emit();
      this.render();
    });

    for (const axis of ['h', 's', 'l']) {
      root.querySelector(`#cs-${axis}`)?.addEventListener('input', (e) => {
        this.hsl[axis] = Number(e.target.value);
        this.rgb = hslToRgb(this.hsl);
        this._emit();
        this.render();
      });
    }

    for (const ch of ['r', 'g', 'b']) {
      root.querySelector(`#cs-${ch}`)?.addEventListener('change', (e) => {
        this.rgb[ch] = Math.max(0, Math.min(255, Number(e.target.value) || 0));
        this.hsl = rgbToHsl(this.rgb);
        this._emit();
        this.render();
      });
    }

    root.querySelector('#cs-hex')?.addEventListener('change', (e) => {
      const val = String(e.target.value || '').trim();
      if (/^#?[0-9a-fA-F]{3,6}$/.test(val)) {
        this.rgb = hexToRgb(val);
        this.hsl = rgbToHsl(this.rgb);
        this._emit();
        this.render();
      }
    });

    root.querySelector('#cs-alpha')?.addEventListener('input', (e) => {
      this.alpha = clampDinoAlpha(Number(e.target.value) / 100, { multiplayer: this.multiplayer });
      const chip = root.querySelector('#cs-live-chip');
      const lbl = root.querySelector('#cs-alpha-lbl');
      if (chip) chip.style.opacity = String(this.alpha);
      if (lbl) lbl.textContent = `${Math.round(this.alpha * 100)}%`;
      this._emit();
    });

    root.querySelector('#cs-save-swatch')?.addEventListener('click', () => {
      this.swatches = saveColorSwatch(rgbToHex(this.rgb));
      this.render();
    });

    root.querySelectorAll('[data-swatch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.rgb = hexToRgb(btn.getAttribute('data-swatch'));
        this.hsl = rgbToHsl(this.rgb);
        this._emit();
        this.render();
      });
    });

    root.querySelector('#cs-eyedropper')?.addEventListener('click', async () => {
      if (typeof window !== 'undefined' && 'EyeDropper' in window) {
        try {
          const ed = new window.EyeDropper();
          const res = await ed.open();
          if (res?.sRGBHex) {
            this.rgb = hexToRgb(res.sRGBHex);
            this.hsl = rgbToHsl(this.rgb);
            this._emit();
            this.render();
          }
        } catch {}
      }
    });
  }
}
