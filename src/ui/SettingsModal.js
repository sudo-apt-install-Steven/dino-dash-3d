// Modal de Configurações em abas de jogo: Geral, Gráficos, Áudio, Controles, Acessibilidade e Conta/Dados.
import { Save } from '../systems/Save.js';
import { OrientationManager } from '../systems/OrientationManager.js';
import { Telemetry } from '../systems/Telemetry.js';
import { applyDomLanguage, normalizeLocale } from '../i18n/translations.js';
import { escapeHtml } from '../security/Sanitize.js';
import { renderGamepadButtonSVG } from '../systems/GamepadVisuals.js';
import {
  attachModalHelp,
  renderGameSwitch,
  renderGameStepper,
  renderHelpBadge,
  enhanceGameControls
} from './Menus.js';

export class SettingsModal {
  static renderInto(container, { onClose, onApplySettings, onRunBenchmark = null, onOpenLegal = null }) {
    const s = Save.data.settings;
    const kb1 = s.keybindings.p1;
    const kb2 = s.keybindings.p2;
    const benchLabel = Save.data.benchmarkDone
      ? `${Save.data.benchmarkTier || 'Médio'} (~${Save.data.benchmarkFps || 60} FPS)`
      : 'Ainda não medido';
    const introVal = (s.introMode === 'off' || s.disableIntro)
      ? 'off'
      : (s.introMode === 'first_time' ? 'first_time' : 'always');
    const leftHanded = !!(s.mobileHudLayout?.leftHanded ?? s.controllerLayout?.leftHanded);

    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card game-modal-card">
          <div class="modal-header">
            <h2>⚙️ Configurações</h2>
            <button class="chunky-btn secondary" id="close-settings">Fechar</button>
          </div>

          <div class="tabs-row" id="set-tabs">
            <button type="button" class="tab-btn active" data-stab="general">🎮 Geral</button>
            <button type="button" class="tab-btn" data-stab="graphics">🎨 Gráficos</button>
            <button type="button" class="tab-btn" data-stab="audio">🔊 Áudio</button>
            <button type="button" class="tab-btn" data-stab="controls">🕹️ Controles</button>
            <button type="button" class="tab-btn" data-stab="a11y">♿ Acessibilidade</button>
            <button type="button" class="tab-btn" data-stab="account">💾 Conta &amp; Dados</button>
          </div>

          <div id="stab-general">
            <div class="field-row game-field-row" data-opt-tip-host="Escolha o idioma dos textos e menus do jogo.">
              <span class="game-field-label">Idioma / Language / Idioma ${renderHelpBadge('Escolha o idioma dos textos e menus do jogo.')}</span>
              ${renderGameStepper('set-lang', [
                { value: 'pt-BR', label: 'Português (Brasil)' },
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' }
              ], normalizeLocale(s.lang))}
            </div>
            ${renderGameSwitch('set-hints', '🪧 Dicas Visuais sobre Obstáculos', s.obstacleHints !== false, 'Exibe setas e avisos acima de obstáculos difíceis na pista.')}
            ${renderGameSwitch('set-discovery-popups', '✨ Popups de Descoberta (Elementos & Poderes)', s.discoveryPopups !== false, 'Mostra uma dica rápida na primeira vez que você encontra uma mecânica nova.')}
            ${renderGameSwitch('set-progressive', '🌱 Desbloqueio Progressivo na Corrida', s.progressiveUnlocks !== false, 'Libera habilidade, estamina, ataque e fúria aos poucos para não poluir o início.')}
            <div class="field-row game-field-row" data-opt-tip-host="Define como a câmera funciona quando há 2+ jogadores na mesma tela.">
              <span class="game-field-label">👥 Câmera Multiplayer Local ${renderHelpBadge('Define como a câmera funciona quando há 2+ jogadores na mesma tela.')}</span>
              ${renderGameStepper('set-mp-cam', [
                { value: 'shared', label: 'Única Compartilhada' },
                { value: 'split_h', label: 'Dividida Horizontal' },
                { value: 'split_v', label: 'Dividida Vertical' }
              ], s.mpCameraMode || 'shared')}
            </div>
            ${renderGameSwitch('set-narrator', '🎙️ Narrador Divertido (PT-BR)', !!s.narrator, 'Exibe legendas e comentários animados durante a corrida.')}
            <div class="field-row game-field-row" data-opt-tip-host="Controla quando a apresentação cinematográfica dos predadores aparece.">
              <span class="game-field-label">🎬 Intros dos Predadores ${renderHelpBadge('Controla quando a apresentação cinematográfica dos predadores aparece.')}</span>
              ${renderGameStepper('set-intromode', [
                { value: 'always', label: 'Sempre (pulável)' },
                { value: 'first_time', label: 'Somente 1ª vez' },
                { value: 'off', label: 'Desativar Intros' }
              ], introVal)}
            </div>
            ${renderGameSwitch('set-teacher', '🎓 Modo Professor / Aula (Livre)', !!Save.data.teacherMode, 'Modo educativo simplificado para salas de aula e apresentações.')}
            ${renderGameSwitch('set-mirrored', '🪞 Modo Espelhado', !!Save.data.mirroredMode, 'Inverte visualmente a pista para um desafio extra de reflexo.')}
            ${renderGameSwitch('set-tvscale', '📺 Modo TV de Sala (HUD maior)', !!Save.data.network?.tvScale, 'Aumenta textos e placares para jogar a distância na TV.')}
          </div>

          <div id="stab-graphics" class="hidden">
            <div class="field-row game-field-row" data-opt-tip-host="Ajusta resolução e detalhes 3D para equilibrar visual e FPS.">
              <span class="game-field-label">Qualidade Gráfica ${renderHelpBadge('Ajusta resolução e detalhes 3D para equilibrar visual e FPS.')}</span>
              ${renderGameStepper('set-quality', [
                { value: 'low', label: 'Baixa (Máx FPS)' },
                { value: 'medium', label: 'Média' },
                { value: 'high', label: 'Alta' }
              ], s.quality || 'medium')}
            </div>
            ${renderGameSwitch('set-shadows', '🌑 Sombras em Tempo Real', !!s.shadows, 'Ativa sombras projetadas pelos dinossauros e obstáculos.')}
            <div class="field-row game-field-row" data-opt-tip-host="Ajusta a exposição e luminosidade geral da cena 3D.">
              <span class="game-field-label">☀️ Brilho Geral (<strong id="set-brightness-val">${Math.round((s.brightness ?? 1.05) * 100)}%</strong>) ${renderHelpBadge('Ajusta a exposição e luminosidade geral da cena 3D.')}</span>
              <input type="range" class="game-slider" id="set-brightness" min="80" max="150" value="${Math.round((s.brightness ?? 1.05) * 100)}" />
            </div>
            ${renderGameSwitch('set-clearvis', '👁️ Visão Clara (menos neblina e partículas)', !!s.clearVision, 'Reduz neblina e partículas climáticas para máxima visibilidade.')}
            ${renderGameSwitch('set-lowspec', '💻 Meu PC é fraco (Escala 0.65x)', !!Save.data.lowSpecMode, 'Otimiza ao máximo para aparelhos antigos ou sem placa de vídeo.')}
            ${renderGameSwitch('set-autoq', '⚡ Auto-Qualidade (Alvo 60 FPS)', Save.data.autoQuality !== false, 'Reduz efeitos automaticamente se o FPS cair durante a corrida.')}
            <div class="field-row game-field-row" data-opt-tip-host="Limita a taxa de quadros por segundo para economizar bateria.">
              <span class="game-field-label">Limite de FPS ${renderHelpBadge('Limita a taxa de quadros por segundo para economizar bateria.')}</span>
              ${renderGameStepper('set-fpscap', [
                { value: '0', label: 'Ilimitado' },
                { value: '60', label: '60 FPS' },
                { value: '30', label: '30 FPS (Econômico)' }
              ], String(s.fpsCap || 0))}
            </div>
            <div class="field-row game-field-row" data-opt-tip-host="Aplica filtros retrô ou estilizados sobre o canvas 3D.">
              <span class="game-field-label">Filtro de Estilo Visual ${renderHelpBadge('Aplica filtros retrô ou estilizados sobre o canvas 3D.')}</span>
              ${renderGameStepper('set-filter', [
                { value: 'default', label: 'Padrão (Pôr do Sol)' },
                { value: '8bit', label: 'Retrô 8-bit' },
                { value: 'neon', label: 'Neon Pôr do Sol' },
                { value: 'bw', label: 'P&B Clássico' }
              ], s.styleFilter || 'default')}
            </div>
            <div class="field-row game-field-row" data-opt-tip-host="Controla o campo de visão da câmera 3D (48° a 80°).">
              <span class="game-field-label">FOV Base (<strong id="set-fov-val">${s.fov}°</strong>) ${renderHelpBadge('Controla o campo de visão da câmera 3D (48° a 80°).')}</span>
              <input type="range" class="game-slider" id="set-fov" min="48" max="80" value="${s.fov}" />
            </div>
            <div class="field-row game-field-row" style="gap:8px; flex-wrap:wrap;">
              <span>📊 Benchmark Real FPS: <strong id="set-bench-out" style="color:#ffd447;">${benchLabel}</strong></span>
              <button type="button" class="chunky-btn secondary" id="set-bench" style="padding:6px 12px; font-size:0.8rem;">Testar FPS</button>
            </div>
          </div>

          <div id="stab-audio" class="hidden">
            <div class="field-row game-field-row">
              <span class="game-field-label">🎵 Volume da Música (<strong id="set-music-val">${Math.round(s.audio.music * 100)}%</strong>)</span>
              <input type="range" class="game-slider" id="set-music" min="0" max="100" value="${Math.round(s.audio.music * 100)}" />
            </div>
            <div class="field-row game-field-row">
              <span class="game-field-label">💥 Volume dos Efeitos (<strong id="set-sfx-val">${Math.round(s.audio.sfx * 100)}%</strong>)</span>
              <input type="range" class="game-slider" id="set-sfx" min="0" max="100" value="${Math.round(s.audio.sfx * 100)}" />
            </div>
            ${renderGameSwitch('set-muted', '🔇 Mudo Total', !!s.audio.muted, 'Silencia música e efeitos sonoros imediatamente.')}
          </div>

          <div id="stab-controls" class="hidden">
            <div class="field-row game-field-row" data-opt-tip-host="Escolhe os ícones dos botões de controle exibidos na tela (Xbox, PlayStation ou Switch).">
              <span class="game-field-label">Ícones de Botões do Gamepad ${renderHelpBadge('Detecta automaticamente o controle conectado ou fixa o padrão Xbox, PlayStation ou Nintendo Switch.')}</span>
              ${renderGameStepper('set-gp-icons', [
                { value: 'auto', label: 'Automático' },
                { value: 'xbox', label: 'Xbox (A B X Y)' },
                { value: 'playstation', label: 'PlayStation (✕ ○ □ △)' },
                { value: 'switch', label: 'Switch (B A Y X)' }
              ], s.gamepadIcons || 'auto')}
            </div>
            <div class="field-row" id="set-gp-preview-row" style="gap:8px; justify-content:flex-start; flex-wrap:wrap;">
              <span style="font-size:0.76rem; color:#a1a1aa;">Prévia de Botões:</span>
              <span id="set-gp-preview-badges" style="display:inline-flex; gap:6px; align-items:center;">
                ${['south', 'east', 'west', 'north', 'lb', 'rb'].map((b) => renderGamepadButtonSVG(b, { family: s.gamepadIcons || 'auto', size: 22 })).join('')}
              </span>
            </div>
            <div class="field-row game-field-row" data-opt-tip-host="Escolha entre deslizar o dedo na tela ou usar botões direcionais fixos.">
              <span class="game-field-label">📱 Controles no Celular ${renderHelpBadge('Escolha entre deslizar o dedo na tela ou usar botões direcionais fixos.')}</span>
              ${renderGameStepper('set-touchmode', [
                { value: 'swipe', label: 'Arrastar o Dedo' },
                { value: 'buttons', label: 'Botões Direcionais' }
              ], s.touchMode === 'buttons' ? 'buttons' : 'swipe')}
            </div>
            ${renderGameSwitch('set-lefthanded', '🤚 Modo Canhoto (Touch)', leftHanded, 'Inverte os botões de movimento e ação entre esquerda e direita no celular.')}
            ${renderGameSwitch('set-autorotate-tilt', '🔄 Deitar Tela Automaticamente ao Virar o Celular', s.autoRotateTilt !== false, 'Adapta a tela ao girar o aparelho para paisagem.')}
            ${renderGameSwitch('set-force-landscape', '📺 Forçar Modo Paisagem no Celular', !!s.forceLandscape, 'Trava a interface em modo horizontal mesmo com rotação bloqueada.')}
            <p style="font-size: 0.85rem; color: #d8c2a6; margin: 8px 0;">Clique num botão para remapear a tecla desejada:</p>
            <div class="cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));">
              <div class="item-card">
                <strong>Jogador 1 (P1)</strong>
                ${['left', 'right', 'jump', 'duck', 'attack', 'ability', 'item', 'bullet'].map((act) => `
                  <div class="field-row">
                    <span>${act}</span>
                    <button type="button" class="tab-btn remap-btn" data-player="p1" data-action="${act}">${kb1[act] || (act === 'attack' ? 'KeyQ' : '')}</button>
                  </div>
                `).join('')}
              </div>
              <div class="item-card">
                <strong>Jogador 2 (P2)</strong>
                ${['left', 'right', 'jump', 'duck', 'attack', 'ability', 'item', 'bullet'].map((act) => `
                  <div class="field-row">
                    <span>${act}</span>
                    <button type="button" class="tab-btn remap-btn" data-player="p2" data-action="${act}">${kb2[act] || (act === 'attack' ? 'ControlRight' : '')}</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div id="stab-a11y" class="hidden">
            ${renderGameSwitch('a11y-onehand', '🖐️ Modo Uma Mão (J/K/L auxiliares)', !!s.accessibility.oneHand, 'Permite jogar com uma mão usando as teclas J, K e L.')}
            ${renderGameSwitch('a11y-large', '🔠 Texto Grande', !!s.accessibility.largeText, 'Aumenta o tamanho da fonte nos menus e no HUD.')}
            ${renderGameSwitch('a11y-contrast', '🌗 Alto Contraste', !!s.accessibility.highContrast, 'Aplica fundo escuro sólido e bordas douradas de alta legibilidade.')}
            <div class="field-row game-field-row" data-opt-tip-host="Ajusta as cores do jogo para diferentes tipos de daltonismo.">
              <span class="game-field-label">🎨 Filtro de Daltonismo ${renderHelpBadge('Ajusta as cores do jogo para diferentes tipos de daltonismo.')}</span>
              ${renderGameStepper('a11y-cb', [
                { value: 'none', label: 'Desativado' },
                { value: 'protanopia', label: 'Protanopia' },
                { value: 'deuteranopia', label: 'Deuteranopia' },
                { value: 'tritanopia', label: 'Tritanopia' }
              ], s.accessibility.colorblind || 'none')}
            </div>
            ${renderGameSwitch('a11y-shake', '📷 Reduzir Tremores de Câmera', !!s.accessibility.reduceShake, 'Diminui o chacoalhar da câmera em impactos e ataques de chefes.')}
            ${renderGameSwitch('a11y-flashes', '✨ Reduzir Flashes e Cintilações', !!s.accessibility.reduceFlashes, 'Suaviza clarões de tela e efeitos estroboscópicos.')}
            ${renderGameSwitch('set-lowhp-pulse', '❤️ Pulsar tela em 1 vida', !!s.lowHpPulse, 'Exibe alerta pulsante nas bordas quando restar apenas 1 coração.')}
            ${renderGameSwitch('a11y-vib', '📳 Vibração (Gamepad/Mobile)', !!s.accessibility.vibration, 'Ativa resposta tátil ao tocar botões ou sofrer impactos.')}
          </div>

          <div id="stab-account" class="hidden">
            ${renderGameSwitch('set-disable-gacha', '🎲 Desativar Caixas Gacha Voluntariamente (ECA Digital)', !!s.disableGachaVoluntary, 'Oculta mecânicas de caixas aleatórias para conformidade com proteção a jovens.')}
            ${renderGameSwitch('set-analytics-optin', '📊 Telemetria Anônima Opt-in (Sem Dados Pessoais)', !!s.analyticsOptIn, 'Ajuda a melhorar o balanceamento sem enviar dados pessoais.')}
            ${import.meta.env.DEV ? renderGameSwitch('set-devmode', '🛠️ Ativar Modo Desenvolvedor / Debug', !!Save.data.devMode, 'Exibe ferramentas de depuração no HUD (apenas ambiente de desenvolvimento).') : ''}
            <div class="item-card" style="margin-top:8px; font-size:0.82rem; color:#ffe6a7; display:flex; flex-direction:column; gap:8px;">
              <div>📱 <strong>Escaneie para jogar:</strong> Abra <strong>Multiplayer</strong> no menu principal para exibir o QR Code e usar celulares como controles!</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button type="button" class="chunky-btn secondary" id="set-export-save" style="padding:7px 12px; font-size:0.8rem;">💾 Exportar Save (JSON)</button>
                <button type="button" class="chunky-btn secondary" id="set-import-save" style="padding:7px 12px; font-size:0.8rem;">📂 Importar Save</button>
                <input type="file" id="set-import-file" accept=".json,application/json" class="hidden" />
                <button type="button" class="chunky-btn secondary" id="set-legal-open" style="padding:7px 12px; font-size:0.8rem; border-color:#22c55e; color:#86efac;">🛡️ LGPD, Termos &amp; Excluir Dados</button>
              </div>
              <small id="set-save-status" style="color:#6ee7b7;"></small>
            </div>
            <div class="item-card" id="set-error-panel" style="margin-top:8px; font-size:0.76rem; color:#e4e4e7;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>🩺 Painel de Erros (${Telemetry.getErrorLog().length})</strong>
                <button type="button" class="chunky-btn secondary" id="set-clear-errors" style="padding:3px 8px; font-size:0.72rem;">Limpar</button>
              </div>
              <div id="set-error-list" style="max-height:80px; overflow-y:auto; font-family:monospace; color:#cbd5e1; margin-top:4px;">
                ${Telemetry.getErrorLog().length === 0 ? 'Nenhum erro registrado nesta sessão.' : Telemetry.getErrorLog().map((e) => `<div>[${escapeHtml(e.kind)}] ${escapeHtml(e.message)} (${escapeHtml(e.location)})</div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    attachModalHelp(container, 'Ajuste idioma, brilho, qualidade para PCs mais fracos, áudio, teclas, acessibilidade e dados de save.');
    enhanceGameControls(container, {
      onEscape: () => {
        sync();
        onClose?.();
      }
    });

    // Tabs
    container.querySelectorAll('#set-tabs .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#set-tabs .tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-stab');
        ['general', 'graphics', 'audio', 'controls', 'a11y', 'account'].forEach((t) => {
          container.querySelector(`#stab-${t}`)?.classList.toggle('hidden', t !== tab);
        });
      });
    });

    // Live slider labels
    const bindRangeLabel = (inputSel, valSel, fmt) => {
      const inp = container.querySelector(inputSel);
      const valEl = container.querySelector(valSel);
      if (inp && valEl) {
        inp.addEventListener('input', () => {
          valEl.textContent = fmt(inp.value);
        });
      }
    };
    bindRangeLabel('#set-brightness', '#set-brightness-val', (v) => `${v}%`);
    bindRangeLabel('#set-fov', '#set-fov-val', (v) => `${v}°`);
    bindRangeLabel('#set-music', '#set-music-val', (v) => `${v}%`);
    bindRangeLabel('#set-sfx', '#set-sfx-val', (v) => `${v}%`);

    const sync = () => {
      s.quality = container.querySelector('#set-quality').value;
      s.shadows = container.querySelector('#set-shadows').checked;
      s.styleFilter = container.querySelector('#set-filter').value;
      s.lang = container.querySelector('#set-lang').value;
      s.fov = Number(container.querySelector('#set-fov').value);
      s.brightness = Number(container.querySelector('#set-brightness')?.value || 105) / 100;
      s.clearVision = !!container.querySelector('#set-clearvis')?.checked;
      s.lowHpPulse = !!container.querySelector('#set-lowhp-pulse')?.checked;
      s.audio.music = Number(container.querySelector('#set-music').value) / 100;
      s.audio.sfx = Number(container.querySelector('#set-sfx').value) / 100;
      s.audio.muted = container.querySelector('#set-muted').checked;
      s.obstacleHints = container.querySelector('#set-hints').checked;
      s.discoveryPopups = container.querySelector('#set-discovery-popups')?.checked !== false;
      s.progressiveUnlocks = container.querySelector('#set-progressive')?.checked !== false;
      s.mpCameraMode = container.querySelector('#set-mp-cam')?.value || 'shared';
      s.narrator = container.querySelector('#set-narrator').checked;
      s.touchMode = container.querySelector('#set-touchmode')?.value || 'swipe';
      s.gamepadIcons = container.querySelector('#set-gp-icons')?.value || 'auto';
      const gpPreview = container.querySelector('#set-gp-preview-badges');
      if (gpPreview) {
        gpPreview.innerHTML = ['south', 'east', 'west', 'north', 'lb', 'rb']
          .map((b) => renderGamepadButtonSVG(b, { family: s.gamepadIcons, size: 22 }))
          .join('');
      }
      const lh = !!container.querySelector('#set-lefthanded')?.checked;
      if (!s.mobileHudLayout) s.mobileHudLayout = { scale: 1.0, opacity: 0.92, leftHanded: false, positions: {} };
      s.mobileHudLayout.leftHanded = lh;
      if (!s.controllerLayout) s.controllerLayout = { preset: 'default', leftHanded: false, useJoystick: false, scale: 1.0, opacity: 0.96, positions: {} };
      s.controllerLayout.leftHanded = lh;
      s.autoRotateTilt = container.querySelector('#set-autorotate-tilt')?.checked !== false;
      const wantLand = !!container.querySelector('#set-force-landscape')?.checked;
      if (wantLand !== !!s.forceLandscape) {
        s.forceLandscape = wantLand;
        OrientationManager.toggleForceLandscape(wantLand);
      }
      s.introMode = container.querySelector('#set-intromode')?.value || 'first_time';
      s.disableIntro = s.introMode === 'off';
      Save.data.introModeCustom = true;

      const lowSpecChecked = container.querySelector('#set-lowspec').checked;
      if (lowSpecChecked !== !!Save.data.lowSpecMode) {
        Save.data.lowSpecMode = lowSpecChecked;
        Save.data.lowSpecManual = true;
        if (lowSpecChecked) {
          s.quality = 'low';
          s.shadows = false;
          s.particles = 'min';
        }
      }
      Save.data.autoQuality = container.querySelector('#set-autoq').checked;
      s.fpsCap = Number(container.querySelector('#set-fpscap')?.value || 0);
      if (!Save.data.network) Save.data.network = { nickname: '', lastRoom: '', tvScale: false };
      Save.data.network.tvScale = container.querySelector('#set-tvscale').checked;
      Save.data.mirroredMode = container.querySelector('#set-mirrored').checked;
      Save.data.teacherMode = container.querySelector('#set-teacher').checked;
      s.disableGachaVoluntary = !!container.querySelector('#set-disable-gacha')?.checked;
      Save.data.devMode = import.meta.env.DEV ? !!container.querySelector('#set-devmode')?.checked : false;

      s.accessibility.oneHand = container.querySelector('#a11y-onehand').checked;
      s.accessibility.largeText = container.querySelector('#a11y-large').checked;
      s.accessibility.highContrast = container.querySelector('#a11y-contrast').checked;
      s.accessibility.colorblind = container.querySelector('#a11y-cb').value;
      s.accessibility.reduceShake = container.querySelector('#a11y-shake').checked;
      s.accessibility.reduceFlashes = !!container.querySelector('#a11y-flashes')?.checked;
      s.accessibility.vibration = container.querySelector('#a11y-vib').checked;
      s.analyticsOptIn = !!container.querySelector('#set-analytics-optin')?.checked;
      applyDomLanguage(s.lang);

      Save.save();
      if (onApplySettings) onApplySettings();
    };

    container.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('change', sync);
    });

    const benchBtn = container.querySelector('#set-bench');
    const benchOut = container.querySelector('#set-bench-out');
    if (benchBtn && benchOut) {
      benchBtn.addEventListener('click', () => {
        benchBtn.disabled = true;
        benchOut.style.color = '#38bdf8';
        benchOut.textContent = 'Medindo WebGL (~1s)...';
        const runner = onRunBenchmark || (() => Promise.resolve({ estFps: 60, tier: 'Alto', tierColor: '#58d63a', lowSpecSuggested: false }));
        Promise.resolve(runner()).then((res) => {
          benchBtn.disabled = false;
          benchOut.style.color = res.tierColor || '#ffd447';
          benchOut.textContent = `${res.tier} (~${res.estFps} FPS real)`;
          if (res.lowSpecSuggested) {
            const lowCb = container.querySelector('#set-lowspec');
            if (lowCb && !lowCb.checked) {
              lowCb.checked = true;
              sync();
              benchOut.textContent += ' • "Meu PC é fraco" ativado!';
            }
          }
        });
      });
    }

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

    container.querySelector('#set-export-save')?.addEventListener('click', () => {
      sync();
      const jsonText = Save.exportJson();
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dino-dash-3d-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const st = container.querySelector('#set-save-status');
      if (st) st.textContent = '✅ Save exportado em JSON!';
    });

    const importFile = container.querySelector('#set-import-file');
    container.querySelector('#set-import-save')?.addEventListener('click', () => {
      importFile?.click();
    });
    importFile?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const text = await f.text();
      const res = Save.importJson(text);
      const st = container.querySelector('#set-save-status');
      if (res.ok) {
        if (st) {
          st.style.color = '#6ee7b7';
          st.textContent = '✅ Save importado! Feche para aplicar visualmente.';
        }
        if (onApplySettings) onApplySettings();
      } else if (st) {
        st.style.color = '#fca5a5';
        st.textContent = `⚠️ ${res.error}`;
      }
      importFile.value = '';
    });

    container.querySelector('#set-legal-open')?.addEventListener('click', () => {
      sync();
      onOpenLegal?.();
    });

    container.querySelector('#set-clear-errors')?.addEventListener('click', () => {
      Telemetry.clearErrors();
      const list = container.querySelector('#set-error-list');
      if (list) list.textContent = 'Nenhum erro registrado nesta sessão.';
    });

    container.querySelector('#close-settings').addEventListener('click', () => {
      sync();
      if (onClose) onClose();
    });
  }
}
