import './styles/main.css';
import './styles/menus.css';
import './styles/controller.css';
import { Game } from './game/Game.js';
import { Save } from './systems/Save.js';
import { PerfMonitor } from './systems/PerfMonitor.js';

const LOADING_TIPS = [
  'Dica: Cada dinossauro possui uma habilidade única no Espaço — teste todos na Pista de Testes!',
  'Dica: Combine elementos na corrida! Fogo + Gelo cria Vapor que desintegra obstáculos.',
  'Dica: Escaneie o QR Code no Multiplayer LAN para transformar qualquer celular em Controle Jurássico!',
  'Dica: Pressione Q no teclado para atacar cactos quebráveis e afastar rivais.',
  'Dica: Ative "Meu PC é fraco" no menu ou nas configurações se quiser FPS máximo em qualquer máquina.'
];

window.__DINO_DEFERRED_INSTALL__ = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__DINO_DEFERRED_INSTALL__ = e;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function showSplashAndBoot() {
  const canvas = document.getElementById('game-canvas');
  const uiRoot = document.getElementById('ui-root');
  const params = new URLSearchParams(window.location.search);
  const isControllerUrl = params.get('controller') === '1' || (Boolean(params.get('room')) && params.get('screen') !== '1');

  let splash = null;
  if (!isControllerUrl) {
    splash = document.createElement('div');
    splash.id = 'dino-loading-splash';
    splash.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999',
      'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center', 'gap:12px',
      'background:radial-gradient(circle at 50% 35%, #5c2d14 0%, #241208 75%)',
      'color:#fff6e5', 'font-family:Segoe UI, system-ui, sans-serif', 'text-align:center', 'padding:24px',
      'transition:opacity 0.25s ease', 'pointer-events:none'
    ].join(';');
    const tip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    splash.innerHTML = `
      <div style="font-size:2.2rem; font-weight:900; letter-spacing:2px; color:#58d63a; text-shadow:0 3px 0 #1b380f;">
        DINO <span style="color:#ff9a24;">DASH 3D</span>
      </div>
      <div style="font-size:0.92rem; color:#ffd447; max-width:480px; line-height:1.45;">🦕 ${tip}</div>
      <div style="font-size:0.78rem; color:#d8c2a6;" id="splash-bench-lbl">Calibrando gráficos 3D...</div>
    `;
    document.body.appendChild(splash);
  }

  requestAnimationFrame(() => {
    const game = new Game(canvas, uiRoot);
    window.__DINO_DASH_GAME__ = game;

    if (isControllerUrl) {
      game.ui.openController({
        initialRoom: (params.get('room') || '').toUpperCase().trim(),
        initialTransport: params.get('transport') === 'supabase' ? 'supabase' : 'lan',
        deferredInstall: window.__DINO_DEFERRED_INSTALL__
      });
    } else if (!Save.data.benchmarkDone || (Save.data.benchmarkVersion || 1) < 2) {
      // Auto-benchmark real em WebGL com pré-compilação e aquecimento para classificar Alto/Médio/Baixo sem falsos positivos
      PerfMonitor.runTimedBenchmark(game, 1250).then((res) => {
        if (game.state === 'menu') {
          game.ui.showMainMenu();
        }
        if (res.lowSpecSuggested && !Save.data.lowSpecMode) {
          game.ui.hud.showBanner(`⚠️ ${res.estFps} FPS detectados (${res.tier}) — Modo "Meu PC é Fraco" sugerido no menu!`, '#f59e0b', 4.5);
        }
      });
    }

    if (splash) {
      setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 260);
      }, 220);
    }
  });
}

showSplashAndBoot();
