// HUD de Tela Principal PC/TV (estilo Jackbox): Ranking lateral com variação ↑↓,
// foco por clique, contador de eliminação 30s, modo "TV de Sala" e overlay de espectador.
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { escapeHtml, sanitizeHexColor } from '../security/Sanitize.js';

export class TvHud {
  constructor(rootEl, callbacks = {}) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.prevRanks = new Map();
    this.focusedId = null;

    this.panel = document.createElement('div');
    this.panel.className = 'tv-ranking-panel hidden';
    this.rootEl.appendChild(this.panel);

    this.elimBanner = document.createElement('div');
    this.elimBanner.className = 'hud-pill hidden';
    this.elimBanner.style.cssText = 'position:fixed; top:52px; left:50%; transform:translateX(-50%); z-index:26; border-color:#ff4757; color:#ffd447; font-size:0.95rem;';
    this.rootEl.appendChild(this.elimBanner);
  }

  setVisible(visible, tvScale = false) {
    this.panel.classList.toggle('hidden', !visible);
    const app = document.getElementById('app');
    if (app) app.classList.toggle('tv-scale', !!tvScale);
    if (!visible) {
      this.elimBanner.classList.add('hidden');
      this.prevRanks.clear();
      this.focusedId = null;
    }
  }

  updatePlayers(players, elimTimer = null, spectatorMode = false) {
    if (!players || players.length <= 1) {
      this.panel.classList.add('hidden');
      return;
    }
    this.panel.classList.remove('hidden');

    if (elimTimer !== null && elimTimer > 0) {
      this.elimBanner.classList.remove('hidden');
      this.elimBanner.textContent = `⏳ Eliminação do último lugar em ${Math.ceil(elimTimer)}s!`;
    } else {
      this.elimBanner.classList.add('hidden');
    }

    const sorted = [...players].sort((a, b) => {
      if (a.dead !== b.dead) return a.dead ? 1 : -1;
      return (b.score || 0) - (a.score || 0);
    });

    const rowsHtml = sorted.map((p, idx) => {
      const id = p.peerId || p.name || String(p.index);
      const prevRank = this.prevRanks.get(id);
      let delta = '=';
      if (prevRank !== undefined) {
        if (idx < prevRank) delta = `<span style="color:#58d63a;">↑${prevRank - idx}</span>`;
        else if (idx > prevRank) delta = `<span style="color:#ff4757;">↓${idx - prevRank}</span>`;
      }
      this.prevRanks.set(id, idx);

      const spec = getDinoSpec(p.id);
      const isFocused = this.focusedId === id;
      const color = sanitizeHexColor(p.peerColor || spec?.colors?.primary, '#ffd447');
      const safeIdAttr = escapeHtml(id);
      const safeName = escapeHtml(p.name || spec.name);
      return `
        <div class="tv-rank-row ${isFocused ? 'focused' : ''} ${p.dead ? 'dead' : ''}" data-focus-id="${safeIdAttr}" title="Clique para focar a câmera">
          <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
            <span>#${idx + 1}</span>
            <span style="width:10px; height:10px; border-radius:50%; background:${color}; display:inline-block; flex-shrink:0;"></span>
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</span>
          </div>
          <div style="display:flex; align-items:center; gap:5px; font-weight:800;">
            <span>${p.dead ? '💀' : `${Math.floor(p.score || 0)}`}</span>
            <span style="font-size:0.75rem;">${delta}</span>
          </div>
        </div>
      `;
    }).join('');

    this.panel.innerHTML = `
      <div style="font-size:0.76rem; font-weight:900; color:#ffd447; display:flex; justify-content:space-between; margin-bottom:2px;">
        <span>🏁 PLACAR AO VIVO (clique p/ focar)</span>
        ${this.focusedId ? `<span id="tv-clear-focus" style="cursor:pointer; color:#38bdf8;">[Grupo]</span>` : ''}
      </div>
      ${rowsHtml}
      ${spectatorMode ? `
        <div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.14); display:flex; flex-direction:column; gap:4px;">
          <div style="font-size:0.74rem; color:#38bdf8; font-weight:800;">🎥 MODO ESPECTADOR ATIVO</div>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            <button class="ctrl-slot-btn" id="tv-spec-help">🍉 Fruta</button>
            <button class="ctrl-slot-btn" id="tv-spec-rock">🪨 Pedra</button>
            <button class="ctrl-slot-btn" id="tv-spec-cam">🔄 Câmera Livre</button>
          </div>
        </div>
      ` : ''}
    `;

    this.panel.querySelectorAll('[data-focus-id]').forEach((row) => {
      row.onclick = () => {
        const fid = row.getAttribute('data-focus-id');
        this.focusedId = this.focusedId === fid ? null : fid;
        this.callbacks.onFocusPlayer?.(this.focusedId);
      };
    });
    this.panel.querySelector('#tv-clear-focus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.focusedId = null;
      this.callbacks.onFocusPlayer?.(null);
    });
    this.panel.querySelector('#tv-spec-help')?.addEventListener('click', () => this.callbacks.onSpectatorAction?.('help_fruit'));
    this.panel.querySelector('#tv-spec-rock')?.addEventListener('click', () => this.callbacks.onSpectatorAction?.('sabotage_rock'));
    this.panel.querySelector('#tv-spec-cam')?.addEventListener('click', () => this.callbacks.onToggleFreeCam?.());
  }

  destroy() {
    this.panel.remove();
    this.elimBanner.remove();
  }
}
