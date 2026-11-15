// Telas de Menu Principal 3D, Seleção de Modos, Biomas, Dificuldade, Álbum, Casa do Dino,
// Cidade Pré-Histórica (Hub), Missões, Conquistas, Passe de Temporada e Recordes.
import { GAME_MODES, STORY_CHAPTERS } from '../game/Modes.js';
import { BIOMES, getBiomePreviewMeta } from '../world/Biomes.js';
import { DIFFICULTY_PRESETS } from '../game/Difficulty.js';
import { EVENT_CATALOG } from '../events/EventManager.js';
import { DINO_CATALOG } from '../dinos/DinoCatalog.js';
import { BOSS_DEFS } from '../events/BossManager.js';
import { PREDATOR_CATALOG } from '../events/PredatorModels.js';
import { ACHIEVEMENTS_CATALOG, ProgressionManager } from '../systems/Progression.js';
import { Save } from '../systems/Save.js';
import { escapeHtml } from '../security/Sanitize.js';

export function attachModalHelp(container, helpText) {
  const header = container.querySelector('.modal-header');
  if (!header || header.querySelector('.modal-help-btn')) return;

  const helpBtn = document.createElement('button');
  helpBtn.type = 'button';
  helpBtn.className = 'modal-help-btn';
  helpBtn.title = 'Ajuda sobre esta tela';
  helpBtn.setAttribute('aria-label', 'Ajuda sobre esta tela');
  helpBtn.textContent = '?';

  const pop = document.createElement('div');
  pop.className = 'modal-help-popover hidden';
  pop.innerHTML = `<strong>❓ Como funciona:</strong> ${helpText}`;

  const rightSlot = header.querySelector('div:last-child');
  if (rightSlot && rightSlot !== header && rightSlot.querySelector('button')) {
    rightSlot.prepend(helpBtn);
  } else {
    header.appendChild(helpBtn);
  }
  header.insertAdjacentElement('afterend', pop);

  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.classList.toggle('hidden');
  });
}

export class Menus {
  static renderMainMenu(container, state, actions) {
    const title = Save.data.activeTitle || 'Iniciante';
    const prestigeLv = Save.data.prestige?.level || 0;
    container.innerHTML = `
      <div class="main-menu-wrap">
        <div class="chunky-panel main-menu-panel" style="width:min(420px, 92vw); padding:20px; gap:12px;">
          <div>
            <div class="dino-logo" id="main-dino-logo" style="font-size:2.15rem; cursor:pointer; user-select:none;" title="Dino Dash 3D">DINO <span class="dash-accent">DASH 3D</span></div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
              <span class="hud-pill">🏆 HI: <strong>${Save.getHighScore()}</strong></span>
              <span class="hud-pill">🥚 Ovos: <strong>${Save.data.eggs}</strong></span>
              ${(Save.data.crystals || 0) > 0 ? `<span class="hud-pill" style="color:#38bdf8;">💎 ${Save.data.crystals}</span>` : ''}
              <span class="hud-pill">🎖️ ${title}</span>
              ${prestigeLv > 0 ? `<span class="hud-pill" style="color:#ffd447;">✨ P${prestigeLv}</span>` : ''}
            </div>
          </div>

          <div class="item-card" style="padding:10px 12px; font-size:0.84rem; gap:6px;">
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; align-items:center;">
              <span>Modo: <strong style="color:#58d63a;">${state.modeName}</strong> <button type="button" class="inline-change-btn" data-nav="modes">mudar</button></span>
              <span>Dif.: <strong style="color:#ff9a24;">${state.diffName}</strong>${Save.data.perfectMode ? ' <strong style="color:#38bdf8;">• 💎 1 Vida</strong>' : ''} <button type="button" class="inline-change-btn" data-nav="difficulty">mudar</button></span>
            </div>
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; align-items:center;">
              <span>Dino: <strong style="color:#ffd447;">${state.dinoName}</strong> <span style="color:#fda4af;">(${state.effectiveLives ?? 3}❤️)</span> <button type="button" class="inline-change-btn" data-nav="dinos">mudar</button></span>
              <span>Mapa: <strong>${state.biomeLabel}</strong> <button type="button" class="inline-change-btn" data-nav="maps">mudar</button></span>
            </div>
          </div>

          ${(state.benchmarkTier === 'Baixo' && !state.lowSpec) ? `
            <button type="button" class="lowspec-suggest-pill" id="menu-lowspec-suggest">
              ⚠️ PC lento detectado (~${state.benchmarkFps} FPS) • Clique para ativar "Meu PC é Fraco"
            </button>
          ` : ''}

          <button class="chunky-btn" id="menu-play" style="font-size:1.28rem; padding:15px;">▶ Jogar Agora</button>
          <button class="chunky-btn orange" data-nav="multiplayer" style="font-size:1.02rem; padding:11px;">🌐 Multiplayer</button>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="chunky-btn secondary" data-nav="dinos" style="padding:11px 10px;">🦖 Dinossauros</button>
            <button class="chunky-btn secondary" data-nav="custom" style="padding:11px 10px;">🎨 Personalização</button>
          </div>

          <div style="display:grid; grid-template-columns:1.15fr 0.85fr; gap:8px;">
            <button class="chunky-btn secondary" data-nav="gacha" style="padding:10px; border-color:#f59e0b; color:#fde68a; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span>🎲 Gacha 3D</span>
              ${(state.fossilCrates || 0) > 0 ? `<span class="badge-start-here" style="background:#f59e0b;color:#111827;">${state.fossilCrates}📦</span>` : ''}
            </button>
            <button class="chunky-btn secondary" data-nav="extras" style="padding:10px; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span>📦 Extras</span>
              ${!state.tutorialDone ? '<span class="badge-start-here">Novo!</span>' : ''}
            </button>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; font-size:0.74rem; color:#d6d3d1;">
            <button type="button" class="inline-change-btn" data-nav="custom" title="Desbloqueie e equipe cápsulas de DNA em Personalização">🧬 Mutações DNA</button>
            <button type="button" class="inline-change-btn" data-nav="gacha" title="Desbloqueie Variantes Mecânicas, Shiny e Secretas">🤖 Mecânico & Shiny</button>
            <button type="button" class="inline-change-btn" data-nav="guide" title="Lojinha especial na 4ª Pista a cada 30.000 pts">🛍️ Lojinha 30k</button>
          </div>
        </div>
      </div>
    `;

    if (import.meta.env.DEV) {
      let logoClicks = 0;
      let lastLogoClick = 0;
      container.querySelector('#main-dino-logo')?.addEventListener('click', () => {
        const now = performance.now();
        if (now - lastLogoClick > 2400) logoClicks = 0;
        lastLogoClick = now;
        logoClicks++;
        if (logoClicks >= 5) {
          logoClicks = 0;
          actions.onUnlockDevMode?.();
        }
      });
    }

    container.querySelector('#menu-play').addEventListener('click', actions.onPlay);
    container.querySelector('#menu-lowspec-suggest')?.addEventListener('click', actions.onToggleLowSpec);
    container.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => actions.onNavigate(btn.getAttribute('data-nav')));
    });
  }

  static renderExtrasModal(container, state, actions) {
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" style="max-width: 780px;">
          <div class="modal-header">
            <h2>📦 Extras & Opções</h2>
            <button class="chunky-btn secondary" id="extras-close">Voltar</button>
          </div>

          <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));">
            <button class="item-card" data-ex-nav="tutorial" style="text-align:left; cursor:pointer; border-color:${state.tutorialDone ? 'var(--panel-border)' : '#38bdf8'};">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <strong style="color:#7dd3fc;">🎓 Tutorial Interativo</strong>
                ${!state.tutorialDone ? '<span class="badge-start-here">Comece por aqui!</span>' : ''}
              </div>
              <small style="color:#d8c2a6;">Aprenda pulo, ataque [Q], habilidade e reações em 1 minuto.</small>
            </button>

            <button class="item-card" data-ex-nav="guide" style="text-align:left; cursor:pointer;">
              <strong style="color:#ffd447;">📖 Guia, Obstáculos & Status</strong>
              <small style="color:#d8c2a6;">Enciclopédia completa de perigos, combos e fraquezas.</small>
            </button>

            <button class="item-card" data-ex-nav="missions" style="text-align:left; cursor:pointer;">
              <strong style="color:#58d63a;">📜 Missões & Passe</strong>
              <small style="color:#d8c2a6;">Objetivos diários, conquistas e títulos desbloqueáveis.</small>
            </button>

            <button class="item-card" data-ex-nav="album" style="text-align:left; cursor:pointer;">
              <strong>📖 Álbum & Casa de Troféus</strong>
              <small style="color:#d8c2a6;">Espécies descobertas e troféus de chefes derrotados.</small>
            </button>

            <button class="item-card" data-ex-nav="records" style="text-align:left; cursor:pointer;">
              <strong>🏅 Recordes & Estatísticas</strong>
              <small style="color:#d8c2a6;">Melhores pontuações por modo e placar de rivalidade.</small>
            </button>

            <button class="item-card" data-ex-nav="metagame" style="text-align:left; cursor:pointer;">
              <strong>🧬 Expansão & Híbridos</strong>
              <small style="color:#d8c2a6;">Campanha, Prestígio, Talentos, Híbridos e Ranking Global.</small>
            </button>

            <button class="item-card" data-ex-nav="minigames" style="text-align:left; cursor:pointer;">
              <strong>🕹️ Vila & Minigames</strong>
              <small style="color:#d8c2a6;">Ritmo Jurássico, Pesca no Rio e Chocadeira de Filhotes.</small>
            </button>

            <button class="item-card" data-ex-nav="controller" style="text-align:left; cursor:pointer;">
              <strong>📱 Controle no Celular</strong>
              <small style="color:#d8c2a6;">Transforme o celular em controle de corrida sem fio.</small>
            </button>

            <button class="item-card" data-ex-nav="settings" style="text-align:left; cursor:pointer;">
              <strong>⚙️ Configurações</strong>
              <small style="color:#d8c2a6;">Gráficos, brilho, áudio, teclas e acessibilidade.</small>
            </button>

            <button class="item-card ${state.lowSpec ? 'selected' : ''}" id="extras-lowspec" style="text-align:left; cursor:pointer;">
              <strong style="color:#38bdf8;">${state.lowSpec ? '💻 Meu PC é Fraco: ATIVO' : '💻 Modo "Meu PC é Fraco"'}</strong>
              <small style="color:#d8c2a6;">Reduz resolução e efeitos pesados para manter o jogo fluido.</small>
            </button>

            <div class="item-card" style="grid-column: 1 / -1; text-align:left; border-color:#fb923c;">
              <strong style="color:#fb923c;">🐾 Fixar Predador Caçador (14 Originais)</strong>
              <small style="color:#d8c2a6;">Escolha qual predador surgirá nas perseguições (ou deixe automático por bioma).</small>
              <select class="select-input" id="extras-predator" style="margin-top:6px;">
                <option value="">🎲 Automático (Por Bioma)</option>
                ${PREDATOR_CATALOG.map((pr) => `<option value="${pr.id}" ${state.pinnedPredator === pr.id ? 'selected' : ''}>${pr.name} — ${pr.title} (${pr.biome})</option>`).join('')}
              </select>
            </div>

            <button class="item-card" data-ex-nav="credits" style="text-align:left; cursor:pointer;">
              <strong>📜 Créditos</strong>
              <small style="color:#d8c2a6;">Sobre o projeto Dino Dash 3D e tecnologias utilizadas.</small>
            </button>

            ${import.meta.env.DEV && state.devMode ? `
              <button class="item-card" data-ex-nav="debug" style="text-align:left; cursor:pointer; border-color:#38bdf8;">
                <strong style="color:#38bdf8;">🛠️ Depurar (Debug / QA)</strong>
                <small style="color:#d8c2a6;">Auditoria visual, simuladores, chefes e FPS ao vivo.</small>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    attachModalHelp(container, 'Todos os recursos extras organizados em um único lugar: tutorial, guias, missões, minigames, controle remoto e configurações.');
    container.querySelector('#extras-close').addEventListener('click', actions.onClose);
    container.querySelector('#extras-lowspec').addEventListener('click', actions.onToggleLowSpec);
    container.querySelector('#extras-predator')?.addEventListener('change', (e) => {
      actions.onPinPredator?.(e.target.value || null);
    });
    container.querySelectorAll('[data-ex-nav]').forEach((el) => {
      el.addEventListener('click', () => actions.onNavigate(el.getAttribute('data-ex-nav')));
    });
  }

  static renderCreditsModal(container, onClose) {
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" style="max-width: 640px;">
          <div class="modal-header">
            <h2>📜 Créditos — Dino Dash 3D</h2>
            <button class="chunky-btn secondary" id="cred-close">Voltar</button>
          </div>
          <div class="item-card" style="border-color:#ff9a24; background:linear-gradient(145deg, rgba(43,23,11,0.92), rgba(20,11,6,0.94));">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <small style="color:#ffd447; font-weight:900; letter-spacing:0.06em; text-transform:uppercase;">Criador, Autor &amp; Titular Legal</small>
                <h3 style="margin:2px 0 0; color:#fff9eb; font-size:1.22rem;">Steven Tayllon teixeira Jerônimo De Melos</h3>
              </div>
              <a
                href="https://github.com/sudo-apt-install-Steven/dino-dash-3d"
                target="_blank"
                rel="noopener noreferrer"
                class="chunky-btn orange"
                style="padding:8px 14px; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:6px;"
              >
                🐙 GitHub (@sudo-apt-install-Steven)
              </a>
            </div>
            <p style="font-size:0.86rem; color:#ffe8b5; line-height:1.45;">
              <strong>Ideia do Projeto &amp; Conceito do Jogo:</strong> Idealizado por <strong>Steven Tayllon teixeira Jerônimo De Melos</strong> como um corredor infinito pré-histórico em 3D com biomas reativos, dinossauros terrestres, aquáticos e voadores realistas, mutações evolutivas, sistema de gacha 3D, híbridos adaptativos, chefes, sobrevivência contra predadores e multiplayer em tempo real.
            </p>
            <div style="font-size:0.78rem; color:#fde68a; line-height:1.5;">
              <strong>Domínio oficial:</strong> <a href="https://dino-dash-3d-six.vercel.app" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:underline;">dino-dash-3d-six.vercel.app</a><br/>
              <strong>Repositório:</strong> <a href="https://github.com/sudo-apt-install-Steven/dino-dash-3d" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:underline; word-break:break-all;">github.com/sudo-apt-install-Steven/dino-dash-3d</a><br/>
              <span style="color:#fca5a5;">© 2026 Steven Tayllon teixeira Jerônimo De Melos — Todos os direitos reservados (Licença Proprietária • Lei nº 9.609/98 &amp; Lei nº 9.610/98).</span>
            </div>
          </div>

          <div class="item-card">
            <strong style="color:#58d63a;">🛠️ Ferramentas &amp; Tecnologias Utilizadas (Atribuição Open Source)</strong>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">
              <span class="hud-pill" style="font-size:0.76rem; color:#fde047;">Three.js (WebGL 3D)</span>
              <span class="hud-pill" style="font-size:0.76rem; color:#93c5fd;">JavaScript (ES Modules)</span>
              <span class="hud-pill" style="font-size:0.76rem; color:#a78bfa;">Vite</span>
              <span class="hud-pill" style="font-size:0.76rem; color:#f97316;">HTML5 &amp; CSS3 Responsivo</span>
              <span class="hud-pill" style="font-size:0.76rem; color:#34d399;">WebAudio API Procedural</span>
              <span class="hud-pill" style="font-size:0.76rem; color:#2dd4bf;">Supabase Realtime &amp; WebSockets</span>
              <span class="hud-pill" style="font-size:0.76rem; color:#fbbf24;">PWA &amp; Node.js</span>
              <span class="hud-pill" style="font-size:0.76rem; color:#f472b6;">Antigravity • Claude • Gemini</span>
            </div>
            <p style="font-size:0.8rem; color:#d8c2a6; margin-top:4px;">
              Todos os modelos voxel procedurais, mecânicas de biomas (Terra, Sobre a Água, Submerso, Céu e Terra Oca), síntese de áudio e efeitos climáticos rodam nativamente no navegador. Bibliotecas de terceiros (Three.js, Supabase JS, QRCode, ws, Vite) seguem sob suas respectivas licenças permissivas (ver <code>THIRD_PARTY_LICENSES.md</code>).
            </p>
          </div>

          <div class="item-card">
            <strong style="color:#ffd447;">🎮 Controles Principais</strong>
            <p style="font-size:0.81rem; color:#d8c2a6; line-height:1.45;">
              <strong>W/↑</strong> Pular • <strong>S/↓</strong> Abaixar / Mergulhar na água • <strong>A/D</strong> Trocar de Faixa • <strong>X</strong> Transmutação Adaptativa (Híbridos) • <strong>Q</strong> Ataque Direto • <strong>Espaço</strong> Habilidade • <strong>E</strong> Item • <strong>F</strong> Fúria • <strong>Shift</strong> Bullet-Time • <strong>C</strong> Câmera • <strong>R</strong> Reiniciar.<br/>
              <strong>Celular:</strong> Arraste o dedo para esquerda/direita/cima/baixo + botões táticos na tela.
            </p>
          </div>
        </div>
      </div>
    `;
    attachModalHelp(container, 'Créditos oficiais de Steven Tayllon, conceito do projeto, link do GitHub, tecnologias e controles.');
    container.querySelector('#cred-close').addEventListener('click', onClose);
  }

  static renderModesModal(container, currentModeId, currentSeed, onSelectMode, onClose) {
    let tab = 'essential';
    const render = () => {
      const list = GAME_MODES.filter((m) => m.tier === tab);
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card">
            <div class="modal-header">
              <h2>🎮 Modos de Jogo</h2>
              <button class="chunky-btn secondary" id="modes-close">Voltar</button>
            </div>
            <div class="tabs-row">
              <button class="tab-btn ${tab === 'essential' ? 'active' : ''}" data-mtab="essential">Essencial (4)</button>
              <button class="tab-btn ${tab === 'advanced' ? 'active' : ''}" data-mtab="advanced">Avançado (7)</button>
              <button class="tab-btn ${tab === 'bonus' ? 'active' : ''}" data-mtab="bonus">Bônus (6)</button>
            </div>
            <div class="field-row">
              <span>Seed Compartilhável (opcional, ex.: JURASSIC99)</span>
              <input class="text-input" id="mode-seed" value="${escapeHtml(currentSeed || '')}" placeholder="Aleatória" />
            </div>
            <div class="cards-grid">
              ${list.map((m) => `
                <div class="item-card ${m.id === currentModeId ? 'selected' : ''}">
                  <strong style="color:#ffd447;">${m.name}</strong>
                  <p style="font-size:0.82rem; color:#d8c2a6; flex:1;">${m.desc}</p>
                  <button class="chunky-btn ${m.id === currentModeId ? '' : 'secondary'}" data-pick-mode="${m.id}">
                    ${m.id === currentModeId ? 'Selecionado' : 'Escolher'}
                  </button>
                </div>
              `).join('')}
            </div>
            ${currentModeId === 'story' ? `
              <div class="item-card">
                <strong>📖 Capítulos da História:</strong>
                ${STORY_CHAPTERS.map((ch) => `<div style="font-size:0.82rem; color:#ffe8b5;">• ${ch.title} — ${ch.dialogue}</div>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;

      container.querySelectorAll('[data-mtab]').forEach((b) => {
        b.addEventListener('click', () => { tab = b.getAttribute('data-mtab'); render(); });
      });
      container.querySelectorAll('[data-pick-mode]').forEach((b) => {
        b.addEventListener('click', () => {
          const seedVal = container.querySelector('#mode-seed').value.trim();
          onSelectMode(b.getAttribute('data-pick-mode'), seedVal);
          onClose();
        });
      });
      container.querySelector('#modes-close').addEventListener('click', () => {
        const seedVal = container.querySelector('#mode-seed').value.trim();
        onSelectMode(currentModeId, seedVal);
        onClose();
      });
      attachModalHelp(container, 'Escolha como correr: Solo Clássico, Cooperação local, Duelo PvP, História, Horda ou Corrida Caótica. Opcionalmente informe uma Seed para repetir a mesma pista.');
    };
    render();
  }

  static renderMapsModal(container, selectedBiome, sequenceMode, onSelect, onClose) {
    let tab = selectedBiome === 'random_portal'
      ? 'essential'
      : (BIOMES.find((b) => b.id === selectedBiome)?.tier || 'essential');
    const essCount = BIOMES.filter((b) => b.tier === 'essential').length;
    const advCount = BIOMES.filter((b) => b.tier === 'advanced').length;
    const render = () => {
      const list = BIOMES.filter((b) => b.tier === tab);
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card">
            <div class="modal-header">
              <h2>🗺️ Mapas & Biomas (${BIOMES.length})</h2>
              <button class="chunky-btn secondary" id="maps-close">Voltar</button>
            </div>
            <div class="field-row">
              <span>Transição Automática por Portal (~1000 pts)</span>
              <input type="checkbox" id="map-seq" ${sequenceMode ? 'checked' : ''} />
            </div>
            <div class="item-card ${selectedBiome === 'random_portal' ? 'selected' : ''}" style="border-color:#a855f7; background:linear-gradient(135deg, rgba(30,27,75,0.75), rgba(88,28,135,0.45));">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div>
                  <strong style="color:#e9d5ff;">🌀 Modo Aleatório (Portais Dinâmicos)</strong>
                  <p style="font-size:0.8rem; color:#ddd6fe; margin:2px 0 0;">Sorteia o bioma inicial e abre portais aleatórios a cada ~1.050 pts (Terra, Água, Céu, Futuro & Terra Oca)!</p>
                </div>
                <button class="chunky-btn ${selectedBiome === 'random_portal' ? '' : 'secondary'}" data-pick-biome="random_portal">
                  ${selectedBiome === 'random_portal' ? 'Ativo' : 'Ativar Portais'}
                </button>
              </div>
            </div>
            <div class="tabs-row">
              <button class="tab-btn ${tab === 'essential' ? 'active' : ''}" data-btab="essential">Essenciais (${essCount})</button>
              <button class="tab-btn ${tab === 'advanced' ? 'active' : ''}" data-btab="advanced">Avançados (${advCount})</button>
            </div>
            <div class="cards-grid">
              ${list.map((b) => {
                const meta = getBiomePreviewMeta(b);
                return `
                  <div class="item-card ${b.id === selectedBiome ? 'selected' : ''}">
                    <div style="height:36px; border-radius:8px; position:relative; overflow:hidden; border:1px solid ${b.theme?.edgeGlow || 'rgba(255,255,255,0.2)'}; background:linear-gradient(180deg, ${b.theme.sky} 0%, ${b.theme.track} 62%, ${b.theme.river} 100%); display:flex; align-items:center; justify-content:space-between; padding:0 8px;">
                      <span style="font-size:0.72rem; font-weight:800; background:rgba(9,9,11,0.72); color:#fafaf9; padding:2px 7px; border-radius:999px;">${meta.icon} ${meta.tag}</span>
                      <span style="width:12px; height:12px; border-radius:50%; background:${b.theme?.edgeGlow || '#ffd447'}; box-shadow:0 0 8px ${b.theme?.edgeGlow || '#ffd447'};"></span>
                    </div>
                    <strong>${b.name}</strong>
                    <p style="font-size:0.8rem; color:#d8c2a6; flex:1;">${b.ruleDesc}</p>
                    <small style="color:#ffd447;">👑 Chefe: ${BOSS_DEFS[b.bossId]?.name || b.bossId}</small>
                    <button class="chunky-btn ${b.id === selectedBiome ? '' : 'secondary'}" data-pick-biome="${b.id}">
                      ${b.id === selectedBiome ? 'Ativo' : 'Selecionar'}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('[data-btab]').forEach((b) => {
        b.addEventListener('click', () => { tab = b.getAttribute('data-btab'); render(); });
      });
      container.querySelectorAll('[data-pick-biome]').forEach((b) => {
        b.addEventListener('click', () => {
          const seq = container.querySelector('#map-seq').checked;
          onSelect(b.getAttribute('data-pick-biome'), seq);
          onClose();
        });
      });
      container.querySelector('#maps-close').addEventListener('click', () => {
        const seq = container.querySelector('#map-seq').checked;
        onSelect(selectedBiome, seq);
        onClose();
      });
      attachModalHelp(container, 'Selecione o bioma inicial da corrida e ative ou não a troca automática pelos Portais de Runas a cada marco.');
    };
    render();
  }

  static renderDifficultyModal(container, diffMgr, onClose) {
    const render = () => {
      const c = diffMgr.custom;
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card">
            <div class="modal-header">
              <h2>⚡ Dificuldade</h2>
              <button class="chunky-btn secondary" id="diff-close">Salvar & Voltar</button>
            </div>
            <div class="tabs-row">
              ${Object.values(DIFFICULTY_PRESETS).map((p) => `
                <button class="tab-btn ${diffMgr.activeId === p.id ? 'active' : ''}" data-diff="${p.id}">
                  ${p.name} (${p.scoreMult}x)
                </button>
              `).join('')}
              <button class="tab-btn ${diffMgr.activeId === 'custom' ? 'active' : ''}" data-diff="custom">Personalizado</button>
            </div>
            <div class="field-row">
              <span>Dificuldade Adaptativa (ajusta conforme seu desempenho)</span>
              <input type="checkbox" id="diff-adapt" ${diffMgr.adaptive ? 'checked' : ''} />
            </div>
            <div class="field-row">
              <span>💎 Modo Perfeito (1 Hit = Fim • Score ×2.2 • Ovos ×1.5)</span>
              <input type="checkbox" id="diff-perfect" ${Save.data.perfectMode ? 'checked' : ''} />
            </div>
            ${diffMgr.activeId === 'custom' ? `
              <div class="field-row"><span>Velocidade Inicial (${c.initialSpeed})</span><input type="range" id="dc-spd" min="12" max="32" value="${c.initialSpeed}" /></div>
              <div class="field-row"><span>Densidade de Obstáculos (${c.density.toFixed(1)}x)</span><input type="range" id="dc-dens" min="5" max="20" value="${Math.round(c.density * 10)}" /></div>
              <div class="field-row"><span>Frequência de Eventos (${c.eventFreq.toFixed(1)}x)</span><input type="range" id="dc-ev" min="3" max="25" value="${Math.round(c.eventFreq * 10)}" /></div>
              <div class="field-row"><span>Vidas (${c.lives})</span><input type="range" id="dc-lives" min="1" max="6" value="${c.lives}" /></div>
              <div class="item-card">
                <strong>Ativar / Desativar Eventos</strong>
                <div class="tabs-row">
                  ${EVENT_CATALOG.map((ev) => `
                    <label style="font-size:0.8rem; display:flex; align-items:center; gap:4px;">
                      <input type="checkbox" class="dc-ev-chk" value="${ev.id}" ${c.enabledEvents.includes(ev.id) ? 'checked' : ''} />
                      ${ev.label}
                    </label>
                  `).join('')}
                </div>
              </div>
            ` : (() => {
              const cfg = diffMgr.getConfig();
              const selDino = DINO_CATALOG.find((d) => d.id === Save.data.selectedDino) || DINO_CATALOG[0];
              const vit = Math.floor((Save.data.talents?.vitality || 0) / 2);
              const eff = Save.data.perfectMode ? 1 : Math.max(1, Math.min(7, cfg.lives + vit + ((selDino?.stats?.hp ?? 3) - 3)));
              return `<p style="font-size:0.9rem; color:#d8c2a6;">Preset selecionado: <strong>${cfg.name}</strong> • Vidas (${selDino?.name || 'Dino'}): ${Save.data.perfectMode ? '<strong style="color:#38bdf8;">1 (💎 Modo Perfeito ativo!)</strong>' : `<strong>${eff}❤️</strong> (base ${cfg.lives})`} • Multiplicador: ${cfg.scoreMult}x</p>`;
            })()}
          </div>
        </div>
      `;

      container.querySelectorAll('[data-diff]').forEach((b) => {
        b.addEventListener('click', () => {
          diffMgr.setPreset(b.getAttribute('data-diff'));
          render();
        });
      });

      const syncCustom = () => {
        diffMgr.adaptive = container.querySelector('#diff-adapt').checked;
        Save.data.perfectMode = !!container.querySelector('#diff-perfect')?.checked;
        Save.save();
        if (diffMgr.activeId === 'custom') {
          c.initialSpeed = Number(container.querySelector('#dc-spd').value);
          c.density = Number(container.querySelector('#dc-dens').value) / 10;
          c.eventFreq = Number(container.querySelector('#dc-ev').value) / 10;
          c.lives = Number(container.querySelector('#dc-lives').value);
          c.enabledEvents = Array.from(container.querySelectorAll('.dc-ev-chk:checked')).map((el) => el.value);
        }
      };

      container.querySelectorAll('input').forEach((el) => el.addEventListener('change', syncCustom));
      container.querySelector('#diff-close').addEventListener('click', () => { syncCustom(); onClose(); });
      attachModalHelp(container, 'Escolha entre Iniciante, Normal, Difícil, Pesadelo ou monte regras personalizadas de vidas, velocidade e eventos.');
    };
    render();
  }

  static renderMissionsAndPassModal(container, onClose) {
    const missions = ProgressionManager.ensureDailyMissions();
    const pass = Save.data.seasonPass;
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card">
          <div class="modal-header">
            <h2>📜 Missões, Conquistas & Passe</h2>
            <button class="chunky-btn secondary" id="mp-close">Voltar</button>
          </div>
          <div class="item-card">
            <div style="display:flex; justify-content:space-between;">
              <strong>🎟️ Passe de Temporada Local — Nível ${pass.level}/50</strong>
              <span style="color:#ffd447;">XP ${pass.xp}/160</span>
            </div>
            <div class="meter-bar" style="height:12px;"><div class="meter-fill" style="width:${Math.min(100, (pass.xp / 160) * 100)}%; background:#58d63a;"></div></div>
          </div>
          <h3>Missões Diárias</h3>
          <div class="cards-grid">
            ${missions.map((m) => `
              <div class="item-card ${m.claimed ? 'selected' : ''}">
                <strong>${m.text}</strong>
                <div>Progresso: ${Math.min(m.progress, m.goal)} / ${m.goal}</div>
                <span style="color:#ffd447;">${m.claimed ? '✅ Recompensa recebida!' : `Prêmio: +${m.reward} 🥚`}</span>
              </div>
            `).join('')}
          </div>
          <h3>Conquistas & Títulos</h3>
          <div class="field-row">
            <span>Título Ativo:</span>
            <select id="active-title">
              ${Save.data.unlockedTitles.map((t) => `<option value="${escapeHtml(t)}" ${Save.data.activeTitle === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
            </select>
          </div>
          <div class="cards-grid">
            ${ACHIEVEMENTS_CATALOG.map((a) => {
              const unlocked = Save.data.achievements.includes(a.id);
              return `
                <div class="item-card ${unlocked ? 'selected' : ''}">
                  <strong>${unlocked ? '🏆' : '🔒'} ${a.name}</strong>
                  <small style="color:#d8c2a6;">${a.desc}</small>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    container.querySelector('#active-title').addEventListener('change', (e) => {
      Save.data.activeTitle = e.target.value;
      Save.save();
    });
    attachModalHelp(container, 'Acompanhe missões diárias que rendem Ovos extras, seu Passe de Temporada local e troféus de conquistas.');
    container.querySelector('#mp-close').addEventListener('click', onClose);
  }

  static renderAlbumAndHouseModal(container, onClose) {
    const trophies = Save.data.dinoHouse.trophies || [];
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card">
          <div class="modal-header">
            <h2>📖 Álbum de Dinos & Casa de Troféus</h2>
            <button class="chunky-btn secondary" id="ah-close">Voltar</button>
          </div>
           <div class="item-card">
             <strong>🏠 Casa do Dino — Troféus de Chefes (${trophies.length}/${Object.keys(BOSS_DEFS).length})</strong>
             <div class="tabs-row">
               ${Object.values(BOSS_DEFS).map((b) => `
                 <span class="hud-pill" style="opacity:${trophies.includes(b.id) ? 1 : 0.4};">
                   ${trophies.includes(b.id) ? '🏆' : '⬛'} ${b.name}
                 </span>
               `).join('')}
             </div>
           </div>
           <div class="item-card" style="margin-top:8px;">
             <strong>🦴 Fósseis & Lore dos Biomas (${Object.keys(Save.data.discoveredFossils || {}).length}/${BIOMES.length})</strong>
             <div class="cards-grid" style="margin-top:6px;">
               ${BIOMES.map((b) => {
                 const found = !!Save.data.discoveredFossils?.[b.fossil?.id];
                 return `
                   <div class="item-card ${found ? 'selected' : ''}" style="opacity:${found ? 1 : 0.72}; padding:8px;">
                     <strong style="color:#ffd447;">${found ? (b.fossil?.icon || '🦴') : '🔒'} ${b.fossil?.name || b.name}</strong>
                     <small style="color:#9ce6e0;">${b.name} ${found ? '• Descoberto' : '• Visite o bioma'}</small>
                     <p style="font-size:0.74rem; color:#d8c2a6; margin-top:4px;">${b.lore || b.theme?.name || ''}</p>
                   </div>
                 `;
               }).join('')}
             </div>
           </div>
           <div class="cards-grid" style="margin-top:8px;">
            ${DINO_CATALOG.map((d) => `
              <div class="item-card ${Save.data.albumDiscovered.includes(d.id) ? 'selected' : ''}">
                <strong style="color:#ffd447;">${d.name}</strong>
                <small style="color:#9ce6e0;">Habilidade: ${d.ability.name}</small>
                <p style="font-size:0.78rem; color:#d8c2a6;">${d.fact.pt}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    attachModalHelp(container, 'Veja todos os dinossauros já desbloqueados ou encontrados e sua coleção de troféus de chefes.');
    container.querySelector('#ah-close').addEventListener('click', onClose);
  }

  static renderRecordsModal(container, onClose) {
    const bestModes = Save.data.bestScoresByMode || {};
    const riv = Save.data.rivalry || { p1Wins: 0, p2Wins: 0 };
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" style="max-width: 620px;">
          <div class="modal-header">
            <h2>🏅 Recordes & Rivalidade</h2>
            <button class="chunky-btn secondary" id="rec-close">Voltar</button>
          </div>
          <div class="stat-grid">
            <div class="stat-tile"><span class="label">Recorde Geral (HI)</span><span class="val">${Save.getHighScore()}</span></div>
            <div class="stat-tile"><span class="label">Placar Rivalidade PvP</span><span class="val">P1 ${riv.p1Wins} × ${riv.p2Wins} P2</span></div>
          </div>
          <div class="item-card">
            <strong>Melhores Pontuações por Modo</strong>
            ${Object.keys(bestModes).length === 0 ? '<p style="color:#d8c2a6;">Nenhuma partida registrada ainda.</p>' : ''}
            ${Object.entries(bestModes).map(([m, sc]) => `
              <div class="field-row"><span>${m}</span><strong>${sc} pts</strong></div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    attachModalHelp(container, 'Compare seus melhores recordes em cada modo de jogo e veja quem lidera os duelos locais P1 × P2.');
    container.querySelector('#rec-close').addEventListener('click', onClose);
  }

  static renderCityHubModal(container, { onOpenShop, onOpenMinigames, onOpenDinos, onClose }) {
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" style="max-width: 640px;">
          <div class="modal-header">
            <h2>🏛️ Cidade Pré-Histórica (Hub)</h2>
            <button class="chunky-btn secondary" id="hub-close">Voltar</button>
          </div>
          <p style="color:#ffe8b5; font-size:0.9rem;">
            Bem-vindo à Vila Jurássica! Converse com os moradores e prepare-se para a próxima expedição.
          </p>
          <div class="cards-grid">
            <div class="item-card">
              <strong>🦕 Mestre Rex (Treinador)</strong>
              <p style="font-size:0.82rem; color:#d8c2a6;">"Evolua suas habilidades até o nível 10 para encarar os chefes!"</p>
              <button class="chunky-btn" id="hub-dinos">Treinar Dinos</button>
            </div>
            <div class="item-card">
              <strong>🛍️ Mercador Parasaurolophus</strong>
              <p style="font-size:0.82rem; color:#d8c2a6;">"Trouxe ovos frescos? Tenho acessórios raros e ovos misteriosos!"</p>
              <button class="chunky-btn orange" id="hub-shop">Ir para Loja</button>
            </div>
            <div class="item-card">
              <strong>🎣 Pescador Spino</strong>
              <p style="font-size:0.82rem; color:#d8c2a6;">"Quer testar reflexos no rio ou chocar um novo filhote?"</p>
              <button class="chunky-btn" id="hub-mini">Minigames</button>
            </div>
          </div>
        </div>
      </div>
    `;
    attachModalHelp(container, 'Atalho rápido entre o treinador de dinossauros, a loja de ovos misteriosos e os minigames.');
    container.querySelector('#hub-dinos').addEventListener('click', onOpenDinos);
    container.querySelector('#hub-shop').addEventListener('click', onOpenShop);
    container.querySelector('#hub-mini').addEventListener('click', onOpenMinigames);
    container.querySelector('#hub-close').addEventListener('click', onClose);
  }
}
