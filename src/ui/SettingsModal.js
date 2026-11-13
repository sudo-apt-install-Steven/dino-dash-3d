// Modal de Configurações: Qualidade, Sombras, Partículas, FOV, Idioma PT-BR/EN,
// Filtros de Estilo, Áudio, Remapeamento de Teclas e Acessibilidade.
import { Save } from '../systems/Save.js';

export class SettingsModal {
  static renderInto(container, { onClose, onApplySettings }) {
    const s = Save.data.settings;
    const kb1 = s.keybindings.p1;
    const kb2 = s.keybindings.p2;

    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card">
          <div class="modal-header">
            <h2>⚙️ Configurações</h2>
            <button class="chunky-btn secondary" id="close-settings">Fechar</button>
          </div>

          <div class="tabs-row" id="set-tabs">
            <button class="tab-btn active" data-stab="general">Gráficos & Áudio</button>
            <button class="tab-btn" data-stab="controls">Controles & Teclas</button>
            <button class="tab-btn" data-stab="a11y">Acessibilidade</button>
          </div>

          <div id="stab-general">
            <div class="field-row">
              <span>Qualidade Gráfica</span>
              <select id="set-quality">
                <option value="low" ${s.quality === 'low' ? 'selected' : ''}>Baixa (Máx FPS)</option>
                <option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Média</option>
                <option value="high" ${s.quality === 'high' ? 'selected' : ''}>Alta</option>
              </select>
            </div>
            <div class="field-row">
              <span>Sombras</span>
              <input type="checkbox" id="set-shadows" ${s.shadows ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>Filtro de Estilo Visual</span>
              <select id="set-filter">
                <option value="default" ${s.styleFilter === 'default' ? 'selected' : ''}>Padrão (Pôr do Sol)</option>
                <option value="8bit" ${s.styleFilter === '8bit' ? 'selected' : ''}>Retrô 8-bit</option>
                <option value="neon" ${s.styleFilter === 'neon' ? 'selected' : ''}>Neon Pôr do Sol</option>
                <option value="bw" ${s.styleFilter === 'bw' ? 'selected' : ''}>P&B Clássico (Chrome Dino)</option>
              </select>
            </div>
            <div class="field-row">
              <span>Idioma</span>
              <select id="set-lang">
                <option value="pt" ${s.lang === 'pt' ? 'selected' : ''}>Português (Padrão)</option>
                <option value="en" ${s.lang === 'en' ? 'selected' : ''}>English</option>
              </select>
            </div>
            <div class="field-row">
              <span>FOV Base (${s.fov}°)</span>
              <input type="range" id="set-fov" min="48" max="80" value="${s.fov}" />
            </div>
            <div class="field-row">
              <span>Volume da Música (${Math.round(s.audio.music * 100)}%)</span>
              <input type="range" id="set-music" min="0" max="100" value="${Math.round(s.audio.music * 100)}" />
            </div>
            <div class="field-row">
              <span>Volume dos Efeitos (${Math.round(s.audio.sfx * 100)}%)</span>
              <input type="range" id="set-sfx" min="0" max="100" value="${Math.round(s.audio.sfx * 100)}" />
            </div>
            <div class="field-row">
              <span>Mudo Total</span>
              <input type="checkbox" id="set-muted" ${s.audio.muted ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>💻 Meu PC é fraco (Máx FPS)</span>
              <input type="checkbox" id="set-lowspec" ${Save.data.lowSpecMode ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>⚡ Auto-Qualidade (Alvo 60 FPS)</span>
              <input type="checkbox" id="set-autoq" ${Save.data.autoQuality !== false ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>📺 Modo TV de Sala (HUD maior)</span>
              <input type="checkbox" id="set-tvscale" ${Save.data.network?.tvScale ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>🪞 Modo Espelhado</span>
              <input type="checkbox" id="set-mirrored" ${Save.data.mirroredMode ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>🎓 Modo Professor / Aula (Livre)</span>
              <input type="checkbox" id="set-teacher" ${Save.data.teacherMode ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>Narrador Divertido (PT-BR)</span>
              <input type="checkbox" id="set-narrator" ${s.narrator ? 'checked' : ''} />
            </div>
            <div class="item-card" style="margin-top:8px; font-size:0.82rem; color:#ffe6a7;">
              📱 <strong>Escaneie para jogar:</strong> Abra <strong>Multiplayer LAN/Online</strong> no menu principal para exibir o QR Code e usar celulares como controles!
            </div>
          </div>

          <div id="stab-controls" class="hidden">
            <p style="font-size: 0.85rem; color: #d8c2a6; margin-bottom: 8px;">Clique num botão para remapear a tecla desejada.</p>
            <div class="cards-grid" style="grid-template-columns: repeat(2, 1fr);">
              <div class="item-card">
                <strong>Jogador 1 (P1)</strong>
                ${['left', 'right', 'jump', 'duck', 'attack', 'ability', 'item', 'bullet'].map((act) => `
                  <div class="field-row">
                    <span>${act}</span>
                    <button class="tab-btn remap-btn" data-player="p1" data-action="${act}">${kb1[act] || (act === 'attack' ? 'KeyQ' : '')}</button>
                  </div>
                `).join('')}
              </div>
              <div class="item-card">
                <strong>Jogador 2 (P2)</strong>
                ${['left', 'right', 'jump', 'duck', 'attack', 'ability', 'item', 'bullet'].map((act) => `
                  <div class="field-row">
                    <span>${act}</span>
                    <button class="tab-btn remap-btn" data-player="p2" data-action="${act}">${kb2[act] || (act === 'attack' ? 'ControlRight' : '')}</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div id="stab-a11y" class="hidden">
            <div class="field-row">
              <span>Modo Uma Mão (J/K/L auxiliares)</span>
              <input type="checkbox" id="a11y-onehand" ${s.accessibility.oneHand ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>Texto Grande</span>
              <input type="checkbox" id="a11y-large" ${s.accessibility.largeText ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>Alto Contraste</span>
              <input type="checkbox" id="a11y-contrast" ${s.accessibility.highContrast ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>Filtro de Daltonismo</span>
              <select id="a11y-cb">
                <option value="none" ${s.accessibility.colorblind === 'none' ? 'selected' : ''}>Desativado</option>
                <option value="protanopia" ${s.accessibility.colorblind === 'protanopia' ? 'selected' : ''}>Protanopia</option>
                <option value="deuteranopia" ${s.accessibility.colorblind === 'deuteranopia' ? 'selected' : ''}>Deuteranopia</option>
                <option value="tritanopia" ${s.accessibility.colorblind === 'tritanopia' ? 'selected' : ''}>Tritanopia</option>
              </select>
            </div>
            <div class="field-row">
              <span>Reduzir Tremores de Câmera</span>
              <input type="checkbox" id="a11y-shake" ${s.accessibility.reduceShake ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>Vibração (Gamepad/Mobile)</span>
              <input type="checkbox" id="a11y-vib" ${s.accessibility.vibration ? 'checked' : ''} />
            </div>
          </div>
        </div>
      </div>
    `;

    // Tabs
    container.querySelectorAll('#set-tabs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#set-tabs .tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-stab');
        ['general', 'controls', 'a11y'].forEach((t) => {
          container.querySelector(`#stab-${t}`).classList.toggle('hidden', t !== tab);
        });
      });
    });

    const sync = () => {
      s.quality = container.querySelector('#set-quality').value;
      s.shadows = container.querySelector('#set-shadows').checked;
      s.styleFilter = container.querySelector('#set-filter').value;
      s.lang = container.querySelector('#set-lang').value;
      s.fov = Number(container.querySelector('#set-fov').value);
      s.audio.music = Number(container.querySelector('#set-music').value) / 100;
      s.audio.sfx = Number(container.querySelector('#set-sfx').value) / 100;
      s.audio.muted = container.querySelector('#set-muted').checked;
      s.narrator = container.querySelector('#set-narrator').checked;

      const lowSpecChecked = container.querySelector('#set-lowspec').checked;
      if (lowSpecChecked !== !!Save.data.lowSpecMode) {
        Save.data.lowSpecMode = lowSpecChecked;
        if (lowSpecChecked) {
          s.quality = 'low';
          s.shadows = false;
          s.particles = 'min';
        }
      }
      Save.data.autoQuality = container.querySelector('#set-autoq').checked;
      if (!Save.data.network) Save.data.network = { nickname: '', lastRoom: '', tvScale: false };
      Save.data.network.tvScale = container.querySelector('#set-tvscale').checked;
      Save.data.mirroredMode = container.querySelector('#set-mirrored').checked;
      Save.data.teacherMode = container.querySelector('#set-teacher').checked;

      s.accessibility.oneHand = container.querySelector('#a11y-onehand').checked;
      s.accessibility.largeText = container.querySelector('#a11y-large').checked;
      s.accessibility.highContrast = container.querySelector('#a11y-contrast').checked;
      s.accessibility.colorblind = container.querySelector('#a11y-cb').value;
      s.accessibility.reduceShake = container.querySelector('#a11y-shake').checked;
      s.accessibility.vibration = container.querySelector('#a11y-vib').checked;

      Save.save();
      if (onApplySettings) onApplySettings();
    };

    container.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('change', sync);
    });

    // Remapeamento
    container.querySelectorAll('.remap-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const player = btn.getAttribute('data-player');
        const action = btn.getAttribute('data-action');
        btn.textContent = 'Pressione...';
        const handler = (e) => {
          e.preventDefault();
          Save.data.settings.keybindings[player][action] = e.code;
          btn.textContent = e.code;
          Save.save();
          window.removeEventListener('keydown', handler, true);
        };
        window.addEventListener('keydown', handler, true);
      });
    });

    container.querySelector('#close-settings').addEventListener('click', () => {
      sync();
      if (onClose) onClose();
    });
  }
}
