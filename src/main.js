import './styles/design-tokens.css';
import './styles/main.css';
import './styles/menus.css';
import './styles/controller.css';
import './styles/modes3d.css';
import { Game } from './game/Game.js';
import { Save } from './systems/Save.js';
import { AuthProfile } from './systems/AuthProfile.js';
import { PerfMonitor } from './systems/PerfMonitor.js';
import { Telemetry } from './systems/Telemetry.js';
import { applyDomLanguage } from './i18n/translations.js';
import { openModelGallery } from './models/ModelGallery.js';
import { isMobileDevice } from './systems/DeviceDetector.js';
import { verifyAuthorizedDomain, renderUnauthorizedDomainNotice } from './security/DomainGuard.js';
import { attachForensicMeta } from './security/Watermark.js';

const LOADING_TIPS = [
  'Dica: Cada dinossauro possui uma habilidade única no Espaço — teste todos na Pista de Testes!',
  'Dica: Combine elementos na corrida! Fogo + Gelo cria Vapor que desintegra obstáculos.',
  'Dica: Arraste o dedo para os lados, cima ou baixo no celular para controlar sem poluir a tela!',
  'Dica: Fique atento aos 30.000 pts — uma 4ª pista lateral abre rumo à Lojinha Exclusiva!',
  'Dica: No Terra Oca você entra através das rachaduras e portais de Terremoto!',
  'Dica: Abra Caixas Fósseis no Gacha 3D para ganhar skins Shiny, Mecânico e Mutações de DNA!'
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

function scheduleBgIdle(fn) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(fn, { timeout: 650 });
  } else {
    setTimeout(fn, 60);
  }
}

function runBackgroundWarmup(game, onStep = null) {
  const steps = [
    { label: 'Aquecendo shaders 3D & mundo...', fn: () => game.renderer.compile?.(game.scene, game.camera) },
    { label: 'Preparando dinossauros e predadores...', fn: () => game.spawner?.setBiome?.(game.currentBiome?.id || 'desert') },
    {
      label: 'Calibrando FPS ideal para seu dispositivo...',
      fn: () => {
        if (!Save.data.benchmarkDone || (Save.data.benchmarkVersion || 1) < 3) {
          PerfMonitor.runTimedBenchmark(game, 950).then((res) => {
            game.ui?.refreshMainMenuIfIdle?.();
            if (res.lowSpecSuggested && !Save.data.lowSpecMode) {
              game.ui.hud.showBanner(`⚠️ ${res.estFps} FPS (${res.tier}) — Modo "Meu PC é Fraco" sugerido!`, '#f59e0b', 4.5);
            }
          });
        }
      }
    }
  ];
  let idx = 0;
  const next = () => {
    if (idx >= steps.length) {
      onStep?.(100, 'Pronto para correr!');
      return;
    }
    const step = steps[idx++];
    try { step.fn(); } catch {}
    onStep?.(Math.round((idx / steps.length) * 100), step.label);
    scheduleBgIdle(next);
  };
  scheduleBgIdle(next);
}

function showSplashAndBoot() {
  const canvas = document.getElementById('game-canvas');
  const uiRoot = document.getElementById('ui-root');
  const domainCheck = verifyAuthorizedDomain();
  if (!domainCheck.allowed) {
    renderUnauthorizedDomainNotice(uiRoot, domainCheck);
    return;
  }
  attachForensicMeta();
  Telemetry.init();
  applyDomLanguage(Save.data?.settings?.lang);
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/debug/models' || params.get('debug') === 'models') {
    openModelGallery(uiRoot, () => window.location.assign('/'));
    return;
  }
  const roomParam = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const onMobile = isMobileDevice();
  const isMobileRoomEntry = onMobile && (params.get('controller') === '1' || Boolean(roomParam)) && params.get('screen') !== '1';

  let splash = null;
  let skipped = false;
  const dismissSplash = () => {
    if (!splash || skipped) return;
    skipped = true;
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => splash?.remove(), 260);
  };

  if (!isMobileRoomEntry) {
    splash = document.createElement('div');
    splash.id = 'dino-loading-splash';
    splash.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999',
      'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center', 'gap:14px',
      'background:radial-gradient(circle at 50% 30%, #422006 0%, #180c05 55%, #09090b 100%)',
      'color:#fafafa', 'font-family:Segoe UI, system-ui, sans-serif', 'text-align:center', 'padding:24px',
      'transition:opacity 0.25s ease', 'pointer-events:auto'
    ].join(';');
    const tip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    splash.innerHTML = `
      <div style="font-size:clamp(1.9rem, 5vw, 2.7rem); font-weight:900; letter-spacing:2px; color:#58d63a; text-shadow:0 4px 0 #14532d;">
        DINO <span style="color:#ff9a24;">DASH 3D</span>
      </div>
      <div style="font-size:0.86rem; color:#e4e4e7; background:rgba(24,24,27,0.8); border:1px solid rgba(255,212,71,0.28); border-radius:14px; padding:10px 16px; max-width:460px; line-height:1.45;">
        🥚 ${tip}
      </div>
      <div style="width:min(340px, 82vw); background:rgba(39,39,42,0.9); border-radius:999px; height:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.12);">
        <div id="splash-prog-fill" style="width:22%; height:100%; background:linear-gradient(90deg, #58d63a, #fde047, #f97316); transition:width 0.22s ease;"></div>
      </div>
      <div style="font-size:0.8rem; color:#fcd34d;" id="splash-bench-lbl">Carregando biomas, dinos e shaders 3D (22%)...</div>
      <button id="splash-skip-btn" type="button" style="margin-top:4px; padding:8px 18px; border-radius:999px; border:1px solid rgba(255,255,255,0.22); background:rgba(39,39,42,0.92); color:#f4f4f5; font-weight:700; font-size:0.82rem; cursor:pointer;">⏭ Pular (carregar em 2º plano)</button>
    `;
    document.body.appendChild(splash);
    splash.querySelector('#splash-skip-btn')?.addEventListener('click', dismissSplash);
  }

  requestAnimationFrame(() => {
    const game = new Game(canvas, uiRoot);
    window.__DINO_DASH_GAME__ = game;
    AuthProfile.initOAuthCallbackListener((user) => {
      if (game.state === 'menu') {
        game.ui?.refreshMainMenuIfIdle?.();
      }
      if (user) {
        game.ui?.hud?.showBanner?.(`☁️ Conta conectada: @${AuthProfile.getLocalProfile().nickname}`, '#34d399', 3.2);
      }
    }).catch(() => {});
    Save.hydrateAsync().then((restored) => {
      if (restored && game.state === 'menu') {
        game.rebuildPlayers?.();
        game.ui?.applyVisualSettings?.();
        game.ui?.refreshMainMenuIfIdle?.();
      }
    }).catch(() => {});

    if (isMobileRoomEntry) {
      game.ui.openController({
        initialRoom: roomParam,
        initialTransport: params.get('transport') === 'supabase' ? 'supabase' : 'lan',
        showEntryChoice: true,
        deferredInstall: window.__DINO_DEFERRED_INSTALL__
      });
      return;
    }

    if (roomParam && !onMobile) {
      dismissSplash();
      game.ui.openSection('multiplayer', {
        initialRoom: roomParam,
        initialTransport: params.get('transport') === 'supabase' ? 'supabase' : 'lan'
      });
      return;
    }

    runBackgroundWarmup(game, (pct, lbl) => {
      if (!splash || skipped) return;
      const fill = splash.querySelector('#splash-prog-fill');
      const txt = splash.querySelector('#splash-bench-lbl');
      if (fill) fill.style.width = `${pct}%`;
      if (txt) txt.textContent = `${lbl} (${pct}%)`;
      if (pct >= 100) {
        setTimeout(dismissSplash, 240);
      }
    });

    // Fallback de segurança para nunca prender tela caso algum browser adie requestIdleCallback
    setTimeout(dismissSplash, 2600);
  });
}

showSplashAndBoot();
