// Telas de Menu Principal 3D, Seleção de Modos, Biomas, Dificuldade, Álbum, Casa do Dino,
// Cidade Pré-Histórica (Hub), Missões, Conquistas, Passe de Temporada e Recordes.
import { GAME_MODES, STORY_CHAPTERS } from '../game/Modes.js';
import { BIOMES, getBiomePreviewMeta } from '../world/Biomes.js';
import { renderBiomeThumbnailsBatch, getBiomeThumbnailUrl } from '../world/BiomePreviewRenderer.js';
import { DIFFICULTY_PRESETS } from '../game/Difficulty.js';
import { EVENT_CATALOG } from '../events/EventManager.js';
import { DINO_CATALOG } from '../dinos/DinoCatalog.js';
import { BOSS_DEFS } from '../events/BossManager.js';
import { PREDATOR_CATALOG } from '../events/PredatorModels.js';
import { STATUS_DEFS } from '../systems/StatusSystem.js';
import { ACHIEVEMENTS_CATALOG, ProgressionManager } from '../systems/Progression.js';
import { Save } from '../systems/Save.js';
import { AuthProfile } from '../systems/AuthProfile.js';
import { isMobileDevice } from '../systems/DeviceDetector.js';
import { normalizeLocale } from '../i18n/translations.js';
import { escapeHtml } from '../security/Sanitize.js';
import { uiIcon } from './UiIcons.js';

const OPTIONAL_CONTENT_GLOB = typeof import.meta.glob === 'function'
  ? import.meta.glob('../content/{catalog_expanded,threat_variants}.js')
  : {};

let _bestiaryExtraCache = null;
async function loadOptionalBestiaryCatalogs() {
  if (_bestiaryExtraCache) return _bestiaryExtraCache;
  const out = { debuffVariants: [], eventVariants: [], hazardVariants: [], predatorVariants: [], bossAffixes: [] };
  for (const [p, loader] of Object.entries(OPTIONAL_CONTENT_GLOB)) {
    try {
      const mod = await loader();
      if (p.includes('catalog_expanded')) {
        out.debuffVariants = Array.isArray(mod.DEBUFF_VARIANTS) ? mod.DEBUFF_VARIANTS : [];
        out.eventVariants = Array.isArray(mod.EVENT_VARIANTS) ? mod.EVENT_VARIANTS : [];
        out.hazardVariants = Array.isArray(mod.HAZARD_VARIANTS) ? mod.HAZARD_VARIANTS : [];
      } else if (p.includes('threat_variants')) {
        out.predatorVariants = Array.isArray(mod.PREDATOR_ENCOUNTER_VARIANTS) ? mod.PREDATOR_ENCOUNTER_VARIANTS : [];
        out.bossAffixes = Array.isArray(mod.BOSS_AFFIX_VARIANTS) ? mod.BOSS_AFFIX_VARIANTS : [];
      }
    } catch { /* fallback silencioso se módulo opcional não existir */ }
  }
  _bestiaryExtraCache = out;
  return out;
}

const MODE_CATEGORY_META = [
  { id: 'all', icon: 'gamepad', label: { 'pt-BR': 'Todos', en: 'All', es: 'Todos' } },
  { id: 'classic', icon: 'dino', label: { 'pt-BR': 'Clássicos', en: 'Classic', es: 'Clásicos' } },
  { id: 'competitive', icon: 'arena', label: { 'pt-BR': 'Competitivos', en: 'Competitive', es: 'Competitivos' } },
  { id: 'cooperative', icon: 'multiplayer', label: { 'pt-BR': 'Cooperativos', en: 'Cooperative', es: 'Cooperativos' } },
  { id: 'challenge', icon: 'crown', label: { 'pt-BR': 'Desafios / Boss', en: 'Challenges / Boss', es: 'Desafíos / Jefe' } },
  { id: 'exploration_rpg', icon: 'dungeon', label: { 'pt-BR': 'Aventura & RPG', en: 'Adventure & RPG', es: 'Aventura y RPG' } },
  { id: 'free', icon: 'compass', label: { 'pt-BR': 'Livre', en: 'Free', es: 'Libre' } }
];

const MODE_DISPLAY_FALLBACKS = {
  solo: { cat: 'classic', icon: 'dino', diff: 'Normal', tone: 'normal' },
  story: { cat: 'classic', icon: 'book', diff: 'Normal', tone: 'normal' },
  time_trial: { cat: 'classic', icon: 'bolt', diff: 'Médio', tone: 'medium' },
  pvp: { cat: 'competitive', icon: 'arena', diff: 'Competitivo', tone: 'hard' },
  teams_2v2: { cat: 'competitive', icon: 'shield', diff: 'Competitivo', tone: 'hard' },
  tournament: { cat: 'competitive', icon: 'trophy', diff: 'Torneio', tone: 'hard' },
  sabotage: { cat: 'competitive', icon: 'flame', diff: 'Difícil', tone: 'hard' },
  capture_egg: { cat: 'competitive', icon: 'egg', diff: 'Médio', tone: 'medium' },
  rival_ai: { cat: 'competitive', icon: 'mecha', diff: 'Difícil', tone: 'hard' },
  race: { cat: 'competitive', icon: 'sprint', diff: 'Velocidade', tone: 'medium' },
  competition: { cat: 'competitive', icon: 'medal', diff: 'Ranqueado', tone: 'hard' },
  arena_x1: { cat: 'competitive', icon: 'arena', diff: 'Combate 3D', tone: 'hard' },
  coop: { cat: 'cooperative', icon: 'multiplayer', diff: 'Coop', tone: 'normal' },
  shared_controls: { cat: 'cooperative', icon: 'gamepad', diff: 'Party', tone: 'medium' },
  relay: { cat: 'cooperative', icon: 'swap', diff: 'Coop', tone: 'normal' },
  raid: { cat: 'cooperative', icon: 'claw', diff: 'Extremo', tone: 'extreme' },
  boss_fight: { cat: 'challenge', icon: 'crown', diff: 'Boss Rush', tone: 'extreme' },
  boss_arena: { cat: 'challenge', icon: 'crown', diff: 'Colossal 3D', tone: 'extreme' },
  hardcore: { cat: 'challenge', icon: 'warning', diff: 'Extremo', tone: 'extreme' },
  chaos: { cat: 'challenge', icon: 'sparkle', diff: 'Caótico', tone: 'hard' },
  wave_survival: { cat: 'challenge', icon: 'gills', diff: 'Difícil', tone: 'hard' },
  daily_challenge: { cat: 'challenge', icon: 'star', diff: 'Desafio', tone: 'medium' },
  dungeon_rpg: { cat: 'exploration_rpg', icon: 'dungeon', diff: 'RPG + Dados', tone: 'hard' },
  dungeon_rush: { cat: 'exploration_rpg', icon: 'key', diff: 'Roguelike', tone: 'extreme' },
  adventure_open: { cat: 'exploration_rpg', icon: 'openworld', diff: 'Mundo Aberto', tone: 'normal' },
  zen: { cat: 'free', icon: 'sparkle', diff: 'Livre', tone: 'free' },
  free_roam: { cat: 'free', icon: 'compass', diff: 'Livre', tone: 'free' }
};

function classifyModeCategory(mode) {
  const rawCat = String(mode?.category || '').toLowerCase();
  if (['classic', 'competitive', 'cooperative', 'challenge', 'exploration_rpg', 'free'].includes(rawCat)) return rawCat;
  if (rawCat.includes('rpg') || rawCat.includes('explor') || rawCat.includes('advent')) return 'exploration_rpg';
  if (rawCat.includes('coop')) return 'cooperative';
  if (rawCat.includes('boss') || rawCat.includes('chal') || rawCat.includes('desaf')) return 'challenge';
  if (rawCat.includes('comp') || rawCat.includes('pvp') || rawCat.includes('race')) return 'competitive';
  if (rawCat.includes('free') || rawCat.includes('livre') || rawCat.includes('zen')) return 'free';
  const fb = MODE_DISPLAY_FALLBACKS[mode?.id];
  if (fb) return fb.cat;
  if (mode?.tier === 'bonus') return 'challenge';
  if (mode?.tier === 'advanced') return 'competitive';
  return 'classic';
}

function getModeDisplayMeta(mode) {
  const fb = MODE_DISPLAY_FALLBACKS[mode?.id] || { cat: 'classic', icon: 'gamepad', diff: 'Normal', tone: 'normal' };
  const diffLabel = mode?.difficulty || fb.diff;
  const dl = String(diffLabel).toLowerCase();
  const tone = fb.tone || (dl.includes('extr') || dl.includes('boss') ? 'extreme' : (dl.includes('dif') || dl.includes('hard') ? 'hard' : (dl.includes('liv') || dl.includes('free') ? 'free' : 'normal')));
  const players = mode?.maxPlayers && mode.maxPlayers > 1
    ? `${mode.players || 1}–${mode.maxPlayers}P`
    : (mode?.players > 1 ? `${mode.players}P` : '1P');
  return {
    category: classifyModeCategory(mode),
    icon: fb.icon || 'gamepad',
    difficulty: diffLabel,
    tone,
    players
  };
}

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
  pop.innerHTML = `<strong>${uiIcon('info', { size: 15, color: '#38bdf8' })} Como funciona:</strong> ${helpText}`;

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

export function renderHelpBadge(tipText) {
  if (!tipText) return '';
  const safe = escapeHtml(tipText);
  return `<button type="button" class="opt-help-btn" data-opt-tip="${safe}" aria-label="Explicação da opção" title="${safe}">?</button>`;
}

export function renderGameSwitch(id, label, checked, tip = '', extraAttrs = '') {
  return `
    <div class="field-row game-field-row" ${tip ? `data-opt-tip-host="${escapeHtml(tip)}"` : ''}>
      <span class="game-field-label">${label} ${renderHelpBadge(tip)}</span>
      <label class="game-switch" for="${id}">
        <input type="checkbox" class="game-switch-input" id="${id}" ${checked ? 'checked' : ''} ${extraAttrs} />
        <span class="game-switch-track" aria-hidden="true"><span class="game-switch-thumb"></span></span>
      </label>
    </div>
  `;
}

export function renderGameStepper(id, options, selectedValue, { disabled = false, tip = '' } = {}) {
  const optsHtml = options.map((opt) => {
    const val = String(opt.value);
    const sel = String(selectedValue) === val ? 'selected' : '';
    return `<option value="${escapeHtml(val)}" ${sel}>${escapeHtml(opt.label)}</option>`;
  }).join('');
  const current = options.find((o) => String(o.value) === String(selectedValue)) || options[0] || { label: '—' };
  return `
    <div class="game-stepper ${disabled ? 'is-disabled' : ''}" data-stepper-for="${id}" ${tip ? `data-opt-tip-host="${escapeHtml(tip)}"` : ''}>
      <button type="button" class="game-stepper-btn" data-step="-1" aria-label="Anterior" ${disabled ? 'disabled' : ''}>${uiIcon('arrowLeft', { size: 14 })}</button>
      <span class="game-stepper-val" data-stepper-label>${escapeHtml(current.label)}</span>
      <button type="button" class="game-stepper-btn" data-step="1" aria-label="Próximo" ${disabled ? 'disabled' : ''}>${uiIcon('arrowRight', { size: 14 })}</button>
      <select class="game-stepper-native" id="${id}" ${disabled ? 'disabled' : ''}>${optsHtml}</select>
    </div>
  `;
}

function playUiClickSound() {
  try { window.__DINO_DASH_GAME__?.sfx?.click?.(); } catch {}
}

export function enhanceGameControls(container, { onEscape = null } = {}) {
  if (!container) return;

  // Tooltip flutuante unificado para hover, toque longo (mobile) e botão '?'
  let tipEl = container.querySelector('#game-opt-tooltip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'game-opt-tooltip';
    tipEl.className = 'game-opt-tooltip hidden';
    container.appendChild(tipEl);
  }

  let hideTid = null;
  const showTip = (anchorEl, text) => {
    if (!text || !anchorEl) return;
    clearTimeout(hideTid);
    tipEl.textContent = text;
    tipEl.classList.remove('hidden');
    const r = anchorEl.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - 290);
    const left = Math.max(12, Math.min(maxLeft, r.left));
    const top = r.top > 110 ? Math.max(10, r.top - 56) : Math.min(window.innerHeight - 72, r.bottom + 8);
    tipEl.style.left = `${left}px`;
    tipEl.style.top = `${top}px`;
  };
  const hideTip = () => {
    clearTimeout(hideTid);
    tipEl.classList.add('hidden');
  };

  container.querySelectorAll('[data-opt-tip]').forEach((btn) => {
    const tip = btn.getAttribute('data-opt-tip');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      playUiClickSound();
      if (!tipEl.classList.contains('hidden') && tipEl.textContent === tip) {
        hideTip();
      } else {
        showTip(btn, tip);
        hideTid = setTimeout(hideTip, 3800);
      }
    });
  });

  container.querySelectorAll('[data-opt-tip-host]').forEach((host) => {
    const tip = host.getAttribute('data-opt-tip-host');
    let longPressTid = null;
    host.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') showTip(host, tip);
    });
    host.addEventListener('pointerleave', () => hideTip());
    host.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      clearTimeout(longPressTid);
      longPressTid = setTimeout(() => {
        showTip(host, tip);
        hideTid = setTimeout(hideTip, 3400);
      }, 450);
    });
    const cancelLp = () => clearTimeout(longPressTid);
    host.addEventListener('pointerup', cancelLp);
    host.addEventListener('pointercancel', cancelLp);
    host.addEventListener('pointermove', cancelLp);
  });

  // Wire game-stepper ◀ ▶ controls to underlying <select>
  container.querySelectorAll('.game-stepper').forEach((stepper) => {
    const sel = stepper.querySelector('.game-stepper-native');
    const lbl = stepper.querySelector('[data-stepper-label]');
    if (!sel || !lbl) return;
    const syncLabel = () => {
      const opt = sel.options[sel.selectedIndex];
      lbl.textContent = opt ? opt.textContent : '—';
    };
    syncLabel();
    sel.addEventListener('change', syncLabel);
    stepper.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (sel.disabled || sel.options.length === 0) return;
        const delta = Number(btn.getAttribute('data-step') || 1);
        const len = sel.options.length;
        sel.selectedIndex = (sel.selectedIndex + delta + len) % len;
        syncLabel();
        playUiClickSound();
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  });

  // Sons táteis nos switches
  container.querySelectorAll('.game-switch-input').forEach((cb) => {
    cb.addEventListener('change', () => playUiClickSound());
  });

  // Navegação por teclado (setas cima/baixo entre controles focáveis + Esc)
  const panel = container.querySelector('.main-menu-panel, .modal-card');
  if (panel && !panel.dataset.kbNavWired) {
    panel.dataset.kbNavWired = '1';
    panel.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (tag === 'SELECT' || tag === 'TEXTAREA') return;
      const focusables = Array.from(
        panel.querySelectorAll('button:not(:disabled), input:not(:disabled):not(.hidden), select:not(:disabled), [tabindex="0"]')
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const idx = focusables.indexOf(document.activeElement);
      const nextIdx = e.key === 'ArrowDown'
        ? (idx + 1) % focusables.length
        : (idx - 1 + focusables.length) % focusables.length;
      e.preventDefault();
      focusables[nextIdx]?.focus();
    });
  }
}

export class Menus {
  static renderMainMenu(container, state, actions) {
    const title = Save.data.activeTitle || 'Iniciante';
    const prestigeLv = Save.data.prestige?.level || 0;
    const cachedUser = AuthProfile.getCachedUser?.() || null;
    const localNick = Save.data.profile?.nickname || Save.data.network?.nickname || 'Dino';
    const isLogged = !!cachedUser;
    container.innerHTML = `
      <div class="main-menu-wrap">
        <div class="chunky-panel main-menu-panel" style="width:min(448px, 94vw); padding:16px 18px; gap:9px;">
          <div class="menu-header-block">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
              <div class="dino-logo" id="main-dino-logo" style="font-size:1.92rem; cursor:pointer; user-select:none; line-height:1.05;" title="Dino Dash 3D">DINO <span class="dash-accent">DASH 3D</span></div>
              <button type="button" class="menu-account-pill ${isLogged ? 'is-logged' : ''}" id="menu-account-pill" title="${isLogged ? 'Gerenciar conta conectada na nuvem' : 'Entrar ou criar conta sem e-mail (Nick + Senha)'}">
                ${isLogged ? `${uiIcon('cloud', { size: 14 })} @${escapeHtml(localNick)}` : `${uiIcon('key', { size: 14 })} Entrar / Criar Conta`}
              </button>
              <div class="mob-only" style="display:flex; gap:5px; align-items:center;">
                <button type="button" class="inline-change-btn" id="menu-rotate-btn" style="padding:4px 8px; border-color:#38bdf8; color:#7dd3fc; display:inline-flex; align-items:center; gap:4px;">${uiIcon('rotate', { size: 13 })} ${state.isLandscape ? 'Paisagem' : 'Deitar'}</button>
                ${isMobileDevice() ? `<button type="button" class="inline-change-btn" id="menu-ctrl-btn" style="padding:4px 8px; border-color:#58d63a; color:#86efac; display:inline-flex; align-items:center; gap:4px;">${uiIcon('gamepad', { size: 13 })} Controle</button>` : ''}
              </div>
            </div>
            <div class="menu-economy-strip" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:7px; align-items:center;">
              <span class="hud-pill" style="display:inline-flex; align-items:center; gap:4px;">${uiIcon('trophy', { size: 14, color: '#ffd447' })} HI: <strong>${Save.getHighScore()}</strong></span>
              <span class="hud-pill" style="display:inline-flex; align-items:center; gap:4px;">${uiIcon('egg', { size: 14, color: '#fde68a' })} Ovos: <strong>${Save.data.eggs}</strong></span>
              <button type="button" class="hud-pill" id="menu-crystals-info-btn" title="Clique para ver para que servem os Diamantes" style="color:#38bdf8; cursor:pointer; border:1px solid rgba(56,189,248,0.45); display:inline-flex; align-items:center; gap:4px;">${uiIcon('diamond', { size: 14, color: '#38bdf8' })} <strong>${Save.data.crystals || 0}</strong> ${uiIcon('info', { size: 13 })}</button>
              <span class="hud-pill" style="display:inline-flex; align-items:center; gap:4px;">${uiIcon('medal', { size: 14, color: '#c4b5fd' })} ${escapeHtml(title)}</span>
              ${prestigeLv > 0 ? `<span class="hud-pill" style="color:#ffd447; display:inline-flex; align-items:center; gap:3px;">${uiIcon('sparkle', { size: 13, color: '#ffd447' })} P${prestigeLv}</span>` : ''}
            </div>
            <div id="menu-crystals-popover" class="item-card" style="display:none; margin-top:7px; padding:8px 10px; border-color:#38bdf8; font-size:0.75rem; color:#bae6fd; line-height:1.4;">
              <strong style="color:#38bdf8; display:inline-flex; align-items:center; gap:4px;">${uiIcon('diamond', { size: 14, color: '#38bdf8' })} O que os Diamantes fazem?</strong><br>
              • <strong>Catalisador Gacha (3):</strong> Garante Épica+ e dobra chance Shiny/Mítica.<br>
              • <strong>Forja de Mutações (2–4):</strong> Desbloqueia ou evolui DNA direto.<br>
              • <strong>Renascer na Corrida (2):</strong> Volta à vida 1× no Fácil/Normal.<br>
              • <strong>Loja Rotativa (2):</strong> Atualiza ofertas com -20% na hora.<br>
              <small style="color:#94a3b8;">Ganhe Diamantes em Baús do Tesouro na corrida, Chefes ou Ovo Misterioso completo.</small>
            </div>
          </div>

          <div class="menu-loadout-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <button type="button" class="loadout-chip" data-nav="modes" title="Trocar modo de jogo">
              <span class="loadout-chip-ico" style="color:#58d63a;">${uiIcon('gamepad', { size: 15 })}</span>
              <span class="loadout-chip-body">
                <span class="loadout-chip-label">Modo</span>
                <strong class="loadout-chip-val" style="color:#58d63a;">${escapeHtml(state.modeName)}</strong>
              </span>
              <span class="loadout-chip-chevron">${uiIcon('arrowRight', { size: 13 })}</span>
            </button>
            <button type="button" class="loadout-chip" data-nav="difficulty" title="Trocar dificuldade">
              <span class="loadout-chip-ico" style="color:#ff9a24;">${uiIcon('bolt', { size: 15 })}</span>
              <span class="loadout-chip-body">
                <span class="loadout-chip-label">Dificuldade</span>
                <strong class="loadout-chip-val" style="color:#ff9a24;">${escapeHtml(state.diffName)}${Save.data.perfectMode ? ' • 1 Vida' : ''}</strong>
              </span>
              <span class="loadout-chip-chevron">${uiIcon('arrowRight', { size: 13 })}</span>
            </button>
            <button type="button" class="loadout-chip" data-nav="dinos" title="Trocar dinossauro">
              <span class="loadout-chip-ico" style="color:#ffd447;">${uiIcon('dino', { size: 15 })}</span>
              <span class="loadout-chip-body">
                <span class="loadout-chip-label">Dino</span>
                <strong class="loadout-chip-val" style="color:#ffd447;">${escapeHtml(state.dinoName)} <span style="color:#fda4af; font-weight:700;">(${state.effectiveLives ?? 3}${uiIcon('heart', { size: 11, color: '#fda4af' })})</span></strong>
              </span>
              <span class="loadout-chip-chevron">${uiIcon('arrowRight', { size: 13 })}</span>
            </button>
            <button type="button" class="loadout-chip" data-nav="maps" title="Trocar mapa / bioma">
              <span class="loadout-chip-ico" style="color:#38bdf8;">${uiIcon('openworld', { size: 15 })}</span>
              <span class="loadout-chip-body">
                <span class="loadout-chip-label">Mapa</span>
                <strong class="loadout-chip-val">${escapeHtml(state.biomeLabel)}</strong>
              </span>
              <span class="loadout-chip-chevron">${uiIcon('arrowRight', { size: 13 })}</span>
            </button>
          </div>

          ${(state.benchmarkTier === 'Baixo' && !state.lowSpec) ? `
            <button type="button" class="lowspec-suggest-pill" id="menu-lowspec-suggest" style="display:inline-flex; align-items:center; justify-content:center; gap:6px;">
              ${uiIcon('warning', { size: 14, color: '#fbbf24' })} PC lento detectado (~${state.benchmarkFps} FPS) • Ativar "Meu PC é Fraco"
            </button>
          ` : ''}

          <button class="chunky-btn menu-play-hero" id="menu-play" style="font-size:1.18rem; padding:13px 16px; display:flex; align-items:center; justify-content:center; gap:8px;">
            ${uiIcon('play', { size: 18 })} <span>JOGAR AGORA</span>
          </button>

          <div class="menu-quick3d-box">
            <div class="menu-quick3d-header">
              <span style="display:inline-flex; align-items:center; gap:5px;">${uiIcon('sparkle', { size: 14, color: '#ffd447' })} Novos Modos 3D</span>
              <span class="menu-quick3d-tag">NOVO</span>
            </div>
            <div class="menu-quick3d-grid">
              <button type="button" class="menu-quick3d-btn" data-quick-mode="dungeon_rpg" title="Explore masmorras 3D com dados RPG e Mestre IA">${uiIcon('dungeon', { size: 16 })} <span>Masmorra RPG</span></button>
              <button type="button" class="menu-quick3d-btn" data-quick-mode="adventure_open" title="Mundo aberto 3D com biomas, segredos e exploração livre">${uiIcon('openworld', { size: 16 })} <span>Mundo Aberto</span></button>
              <button type="button" class="menu-quick3d-btn" data-quick-mode="arena_x1" title="Combate 3D direto 1v1 em arena jurássica">${uiIcon('arena', { size: 16 })} <span>Arena X1</span></button>
            </div>
          </div>

          <div class="menu-primary-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:7px;">
            <button class="chunky-btn orange" data-nav="multiplayer" style="padding:10px 8px; font-size:0.92rem; display:flex; align-items:center; justify-content:center; gap:6px;">
              ${uiIcon('multiplayer', { size: 16 })} <span>Multiplayer</span>
            </button>
            <button class="chunky-btn secondary" data-nav="dinos" style="padding:10px 8px; font-size:0.92rem; display:flex; align-items:center; justify-content:center; gap:6px;">
              ${uiIcon('dino', { size: 16 })} <span>Dinossauros</span>
            </button>
            <button class="chunky-btn secondary" data-nav="custom" style="padding:10px 8px; font-size:0.92rem; display:flex; align-items:center; justify-content:center; gap:6px;">
              ${uiIcon('palette', { size: 16 })} <span>Personalização</span>
            </button>
            <button class="chunky-btn secondary" data-nav="gacha" style="padding:10px 8px; font-size:0.92rem; border-color:#f59e0b; color:#fde68a; display:flex; align-items:center; justify-content:center; gap:6px;">
              ${uiIcon('gacha', { size: 16 })} <span>Gacha 3D</span>
              ${(state.fossilCrates || 0) > 0 ? `<span class="badge-start-here" style="background:#f59e0b;color:#111827; display:inline-flex; align-items:center; gap:2px;">${state.fossilCrates}${uiIcon('extras', { size: 11 })}</span>` : ''}
            </button>
          </div>

          <div class="menu-account-row menu-utility-dock" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
            <button class="chunky-btn secondary menu-mini-btn" data-nav="profile" style="padding:8px 5px; font-size:0.75rem; display:flex; align-items:center; justify-content:center; gap:4px;" title="Perfil do Jogador, Dino 3D e Estatísticas">${uiIcon('account', { size: 14 })} <span>Perfil</span></button>
            <button class="chunky-btn secondary menu-mini-btn" data-nav="achievements" style="padding:8px 5px; font-size:0.75rem; display:flex; align-items:center; justify-content:center; gap:4px;" title="Galeria de Conquistas e Troféus">${uiIcon('trophy', { size: 14 })} <span>Conquistas</span></button>
            <button class="chunky-btn secondary menu-mini-btn" data-nav="save_data" style="padding:8px 5px; font-size:0.75rem; display:flex; align-items:center; justify-content:center; gap:4px;" title="Exportar, Importar e Backup do Save">${uiIcon('save', { size: 14 })} <span>Save</span></button>
            <button class="chunky-btn secondary menu-mini-btn" data-nav="extras" style="padding:8px 5px; font-size:0.75rem; display:flex; align-items:center; justify-content:center; gap:4px;" title="Tutorial, Guias, Minigames e Configurações">${uiIcon('extras', { size: 14 })} <span>Extras</span>${!state.tutorialDone ? '<span class="badge-start-here" style="margin-left:2px;">!</span>' : ''}</button>
          </div>

          <div class="menu-inline-links" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center; font-size:0.72rem; color:#d6d3d1;">
            <button type="button" class="inline-change-btn" data-nav="bestiary" title="Bestiário de Predadores, Chefes, Debuffs e Eventos" style="display:inline-flex; align-items:center; gap:4px;">${uiIcon('bestiary', { size: 12 })} Bestiário</button>
            <button type="button" class="inline-change-btn" data-nav="custom" title="Desbloqueie e equipe cápsulas de DNA em Personalização" style="display:inline-flex; align-items:center; gap:4px;">${uiIcon('dna', { size: 12 })} Mutações</button>
            <button type="button" class="inline-change-btn" data-nav="gacha" title="Desbloqueie Variantes Mecânicas, Shiny e Secretas" style="display:inline-flex; align-items:center; gap:4px;">${uiIcon('mecha', { size: 12 })} Mecânico &amp; Shiny</button>
            <button type="button" class="inline-change-btn" data-nav="guide" title="Lojinha especial na 4ª Pista a cada 30.000 pts" style="display:inline-flex; align-items:center; gap:4px;">${uiIcon('shop', { size: 12 })} Lojinha 30k</button>
          </div>
          <div class="menu-legal-footer" style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; align-items:center; font-size:0.69rem; color:#a8a29e; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;">
            <button type="button" class="inline-change-btn" data-nav="legal" style="color:#a7f3d0; display:inline-flex; align-items:center; gap:4px;">${uiIcon('shield', { size: 12, color: '#4ade80' })} Livre • Termos &amp; Privacidade (LGPD)</button>
            <button type="button" class="inline-change-btn" data-nav="report" style="color:#fca5a5; display:inline-flex; align-items:center; gap:4px;">${uiIcon('flag', { size: 12, color: '#fca5a5' })} Denunciar</button>
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

    container.querySelector('#menu-crystals-info-btn')?.addEventListener('click', () => {
      const pop = container.querySelector('#menu-crystals-popover');
      if (pop) pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
    });

    const acctPill = container.querySelector('#menu-account-pill');
    acctPill?.addEventListener('click', () => {
      if (typeof window !== 'undefined') window.__DINO_PROFILE_INITIAL_TAB__ = 'account';
      if (typeof actions.onOpenAccount === 'function') {
        actions.onOpenAccount();
      } else {
        actions.onNavigate?.('profile');
      }
    });
    if (acctPill) {
      AuthProfile.getCurrentUser?.().then((user) => {
        if (!acctPill.isConnected) return;
        if (user) {
          const nick = Save.data.profile?.nickname || Save.data.network?.nickname || user.user_metadata?.nickname || 'Dino';
          acctPill.classList.add('is-logged');
          acctPill.innerHTML = `${uiIcon('cloud', { size: 14 })} @${escapeHtml(nick)}`;
          acctPill.title = 'Gerenciar conta conectada na nuvem';
        } else {
          acctPill.classList.remove('is-logged');
          acctPill.innerHTML = `${uiIcon('key', { size: 14 })} Entrar / Criar Conta`;
          acctPill.title = 'Entrar ou criar conta sem e-mail (Nick + Senha)';
        }
      }).catch(() => {});
    }

    container.querySelectorAll('[data-quick-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modeId = btn.getAttribute('data-quick-mode');
        if (!modeId) return;
        if (typeof actions.onQuickPlayMode === 'function') {
          actions.onQuickPlayMode(modeId);
        } else {
          actions.onNavigate?.('modes');
        }
      });
    });

    container.querySelector('#menu-play').addEventListener('click', actions.onPlay);
    container.querySelector('#menu-rotate-btn')?.addEventListener('click', () => actions.onToggleLandscape?.());
    container.querySelector('#menu-ctrl-btn')?.addEventListener('click', () => actions.onOpenController?.());
    container.querySelector('#menu-lowspec-suggest')?.addEventListener('click', actions.onToggleLowSpec);
    container.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => actions.onNavigate(btn.getAttribute('data-nav')));
    });
    enhanceGameControls(container);
  }

  static renderExtrasModal(container, state, actions) {
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" style="max-width: 780px;">
          <div class="modal-header">
            <h2>${uiIcon('extras', { size: 20 })} Extras &amp; Opções</h2>
            <button class="chunky-btn secondary" id="extras-close">Voltar</button>
          </div>

          <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));">
            <button class="item-card" data-ex-nav="tutorial" style="text-align:left; cursor:pointer; border-color:${state.tutorialDone ? 'var(--panel-border)' : '#38bdf8'};">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <strong style="color:#7dd3fc;">${uiIcon('sparkle', { size: 15, color: '#7dd3fc' })} Tutorial Interativo</strong>
                ${!state.tutorialDone ? '<span class="badge-start-here">Comece por aqui!</span>' : ''}
              </div>
              <small style="color:#d8c2a6;">Aprenda pulo, ataque [Q], habilidade e reações em 1 minuto.</small>
            </button>

            <button class="item-card" data-ex-nav="guide" style="text-align:left; cursor:pointer;">
              <strong style="color:#ffd447;">${uiIcon('book', { size: 15, color: '#ffd447' })} Guia, Obstáculos &amp; Status</strong>
              <small style="color:#d8c2a6;">Enciclopédia completa de perigos, combos e fraquezas.</small>
            </button>

            <button class="item-card" data-ex-nav="bestiary" data-nav="bestiary" style="text-align:left; cursor:pointer; border-color:#f97316;">
              <strong style="color:#fb923c;">${uiIcon('bestiary', { size: 15, color: '#fb923c' })} Bestiário &amp; Catálogo</strong>
              <small style="color:#d8c2a6;">Predadores, chefes, debuffs e eventos com dicas de contra-jogada.</small>
            </button>

            <button class="item-card" data-ex-nav="missions" style="text-align:left; cursor:pointer;">
              <strong style="color:#58d63a;">${uiIcon('scroll', { size: 15, color: '#58d63a' })} Missões &amp; Passe</strong>
              <small style="color:#d8c2a6;">Objetivos diários, conquistas e títulos desbloqueáveis.</small>
            </button>

            <button class="item-card" data-ex-nav="album" style="text-align:left; cursor:pointer;">
              <strong>${uiIcon('trophy', { size: 15, color: '#ffd447' })} Álbum &amp; Casa de Troféus</strong>
              <small style="color:#d8c2a6;">Espécies descobertas e troféus de chefes derrotados.</small>
            </button>

            <button class="item-card" data-ex-nav="records" style="text-align:left; cursor:pointer;">
              <strong>${uiIcon('medal', { size: 15, color: '#fbbf24' })} Recordes &amp; Estatísticas</strong>
              <small style="color:#d8c2a6;">Melhores pontuações por modo e placar de rivalidade.</small>
            </button>

            <button class="item-card" data-ex-nav="metagame" style="text-align:left; cursor:pointer;">
              <strong>${uiIcon('dna', { size: 15, color: '#5eead4' })} Expansão &amp; Híbridos</strong>
              <small style="color:#d8c2a6;">Campanha, Prestígio, Talentos, Híbridos e Ranking Global.</small>
            </button>

            <button class="item-card" data-ex-nav="minigames" style="text-align:left; cursor:pointer;">
              <strong>${uiIcon('gamepad', { size: 15, color: '#a78bfa' })} Vila &amp; Minigames</strong>
              <small style="color:#d8c2a6;">Ritmo Jurássico, Pesca no Rio e Chocadeira de Filhotes.</small>
            </button>

            ${isMobileDevice() ? `
            <button class="item-card" data-ex-nav="controller" style="text-align:left; cursor:pointer;">
              <strong>${uiIcon('gamepad', { size: 15, color: '#38bdf8' })} Controle no Celular</strong>
              <small style="color:#d8c2a6;">Transforme o celular em controle de corrida sem fio.</small>
            </button>
            ` : ''}

            <button class="item-card" data-ex-nav="settings" style="text-align:left; cursor:pointer;">
              <strong>${uiIcon('settings', { size: 15, color: '#cbd5e1' })} Configurações</strong>
              <small style="color:#d8c2a6;">Gráficos, brilho, áudio, teclas e acessibilidade.</small>
            </button>

            <button class="item-card ${state.lowSpec ? 'selected' : ''}" id="extras-lowspec" style="text-align:left; cursor:pointer;">
              <strong style="color:#38bdf8;">${uiIcon('monitor', { size: 15, color: '#38bdf8' })} ${state.lowSpec ? 'Meu PC é Fraco: ATIVO' : 'Modo "Meu PC é Fraco"'}</strong>
              <small style="color:#d8c2a6;">Reduz resolução e efeitos pesados para manter o jogo fluido.</small>
            </button>

            <div class="item-card" style="grid-column: 1 / -1; text-align:left; border-color:#fb923c;">
              <strong style="color:#fb923c;">${uiIcon('claw', { size: 15, color: '#fb923c' })} Fixar Predador Caçador (14 Originais)</strong>
              <small style="color:#d8c2a6;">Escolha qual predador surgirá nas perseguições (ou deixe automático por bioma).</small>
              <select class="select-input" id="extras-predator" style="margin-top:6px;">
                <option value="">Automático (Por Bioma)</option>
                ${PREDATOR_CATALOG.map((pr) => `<option value="${pr.id}" ${state.pinnedPredator === pr.id ? 'selected' : ''}>${pr.name} — ${pr.title} (${pr.biome})</option>`).join('')}
              </select>
            </div>

            <button class="item-card" data-ex-nav="credits" style="text-align:left; cursor:pointer;">
              <strong>${uiIcon('scroll', { size: 15, color: '#fde68a' })} Créditos</strong>
              <small style="color:#d8c2a6;">Sobre o projeto Dino Dash 3D e tecnologias utilizadas.</small>
            </button>

            <button class="item-card" data-ex-nav="legal" style="text-align:left; cursor:pointer; border-color:#22c55e;">
              <strong style="color:#86efac;">${uiIcon('shield', { size: 15, color: '#86efac' })} LGPD, Termos &amp; Denúncia</strong>
              <small style="color:#d8c2a6;">Privacidade, ECA Digital, exportar ou excluir dados.</small>
            </button>

            ${import.meta.env.DEV && state.devMode ? `
              <button class="item-card" data-ex-nav="debug" style="text-align:left; cursor:pointer; border-color:#38bdf8;">
                <strong style="color:#38bdf8;">${uiIcon('settings', { size: 15, color: '#38bdf8' })} Depurar (Debug / QA)</strong>
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
            <h2>${uiIcon('scroll', { size: 20 })} Créditos — Dino Dash 3D</h2>
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
                ${uiIcon('multiplayer', { size: 15 })} GitHub (@sudo-apt-install-Steven)
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
            <strong style="color:#58d63a;">${uiIcon('settings', { size: 15, color: '#58d63a' })} Ferramentas &amp; Tecnologias Utilizadas (Atribuição Open Source)</strong>
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
            <strong style="color:#ffd447;">${uiIcon('gamepad', { size: 15, color: '#ffd447' })} Controles Principais</strong>
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
    const loc = normalizeLocale(Save.data.settings?.lang);
    const L = {
      title: loc === 'en' ? 'Game Modes' : (loc === 'es' ? 'Modos de Juego' : 'Modos de Jogo'),
      back: loc === 'en' ? 'Back' : (loc === 'es' ? 'Volver' : 'Voltar'),
      seedLbl: loc === 'en' ? 'Shareable Seed (optional, e.g. JURASSIC99)' : (loc === 'es' ? 'Semilla compartible (opcional)' : 'Seed Compartilhável (opcional, ex.: JURASSIC99)'),
      seedPh: loc === 'en' ? 'Random' : (loc === 'es' ? 'Aleatoria' : 'Aleatória'),
      selected: loc === 'en' ? 'Selected' : (loc === 'es' ? 'Seleccionado' : 'Selecionado'),
      pick: loc === 'en' ? 'Select' : (loc === 'es' ? 'Elegir' : 'Escolher')
    };

    const currentModeObj = GAME_MODES.find((m) => m.id === currentModeId);
    let tab = currentModeObj ? classifyModeCategory(currentModeObj) : 'all';
    let seedDraft = currentSeed || '';

    const countByCat = (catId) => (catId === 'all'
      ? GAME_MODES.length
      : GAME_MODES.filter((m) => classifyModeCategory(m) === catId).length);

    const render = () => {
      const list = tab === 'all'
        ? GAME_MODES
        : GAME_MODES.filter((m) => classifyModeCategory(m) === tab);

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card">
            <div class="modal-header">
              <h2>${uiIcon('gamepad', { size: 20 })} ${L.title} (${GAME_MODES.length})</h2>
              <button class="chunky-btn secondary" id="modes-close">${L.back}</button>
            </div>
            <div class="tabs-row" role="tablist" aria-label="${L.title}">
              ${MODE_CATEGORY_META.map((cat) => {
                const cnt = countByCat(cat.id);
                return `
                  <button class="tab-btn ${tab === cat.id ? 'active' : ''}" role="tab" aria-selected="${tab === cat.id}" data-mtab="${cat.id}">
                    ${uiIcon(cat.icon, { size: 14 })} ${cat.label[loc] || cat.label['pt-BR']} (${cnt})
                  </button>
                `;
              }).join('')}
            </div>
            <div class="field-row">
              <span>${L.seedLbl}</span>
              <input class="text-input" id="mode-seed" value="${escapeHtml(seedDraft)}" placeholder="${L.seedPh}" />
            </div>
            <div class="cards-grid modes-cards-grid">
              ${list.map((m) => {
                const meta = getModeDisplayMeta(m);
                const isSel = m.id === currentModeId;
                return `
                  <div class="item-card mode-card ${isSel ? 'selected' : ''}">
                    <div class="mode-card-head">
                      <span class="mode-icon" aria-hidden="true">${uiIcon(meta.icon, { size: 18 })}</span>
                      <strong class="mode-card-title">${escapeHtml(m.name)}</strong>
                    </div>
                    <div class="mode-card-badges">
                      <span class="mode-diff-badge tone-${meta.tone}">${escapeHtml(meta.difficulty)}</span>
                      <span class="mode-players-badge">${uiIcon('account', { size: 12 })} ${escapeHtml(meta.players)}</span>
                    </div>
                    <p class="mode-card-desc">${escapeHtml(m.desc || '')}</p>
                    <button class="chunky-btn ${isSel ? '' : 'secondary'}" data-pick-mode="${escapeHtml(m.id)}">
                      ${isSel ? `${uiIcon('check', { size: 14 })} ${L.selected}` : L.pick}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
            ${currentModeId === 'story' ? `
              <div class="item-card">
                <strong>${uiIcon('book', { size: 15 })} Capítulos da História:</strong>
                ${STORY_CHAPTERS.map((ch) => `<div style="font-size:0.82rem; color:#ffe8b5;">• ${escapeHtml(ch.title)} — ${escapeHtml(ch.dialogue)}</div>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;

      const seedInput = container.querySelector('#mode-seed');
      seedInput?.addEventListener('input', () => { seedDraft = seedInput.value; });

      container.querySelectorAll('[data-mtab]').forEach((b) => {
        b.addEventListener('click', () => {
          tab = b.getAttribute('data-mtab');
          render();
        });
      });
      container.querySelectorAll('[data-pick-mode]').forEach((b) => {
        b.addEventListener('click', () => {
          const seedVal = (container.querySelector('#mode-seed')?.value || '').trim();
          onSelectMode(b.getAttribute('data-pick-mode'), seedVal);
          onClose();
        });
      });
      container.querySelector('#modes-close').addEventListener('click', () => {
        const seedVal = (container.querySelector('#mode-seed')?.value || '').trim();
        onSelectMode(currentModeId, seedVal);
        onClose();
      });
      attachModalHelp(container, 'Explore os modos por categoria (Clássicos, Competitivos, Cooperativos, Desafios/Boss e Livre). Opcionalmente informe uma Seed para repetir a mesma pista.');
    };
    render();
  }

  static renderBestiaryModal(container, onClose) {
    const loc = normalizeLocale(Save.data.settings?.lang);
    const L = {
      title: loc === 'en' ? 'Bestiary & Catalog' : (loc === 'es' ? 'Bestiario y Catálogo' : 'Bestiário & Catálogo'),
      back: loc === 'en' ? 'Back' : (loc === 'es' ? 'Volver' : 'Voltar'),
      searchPh: loc === 'en' ? 'Search by name, biome or counter...' : (loc === 'es' ? 'Buscar por nombre, bioma o contra...' : 'Buscar por nome, bioma ou contra-jogada...'),
      counterLbl: loc === 'en' ? 'How to counter' : (loc === 'es' ? 'Cómo enfrentar' : 'Como enfrentar'),
      more: loc === 'en' ? 'Load more' : (loc === 'es' ? 'Mostrar más' : 'Mostrar mais'),
      empty: loc === 'en' ? 'No entries match your search.' : (loc === 'es' ? 'Ningún resultado encontrado.' : 'Nenhum registro encontrado para essa busca.')
    };

    let tab = 'predators';
    let query = '';
    let limit = 48;
    let extra = _bestiaryExtraCache || { debuffVariants: [], eventVariants: [], hazardVariants: [], predatorVariants: [], bossAffixes: [] };
    let ultraEntries = null;
    let ultraLoading = false;
    let destroyed = false;

    const loadUltraCatalog = () => {
      if (ultraEntries || ultraLoading) return;
      ultraLoading = true;
      import('../content/ultra_catalog.js').then((mod) => {
        const list = [];
        for (const e of (mod.DUNGEON_ENCOUNTERS || [])) {
          list.push({
            icon: 'arena',
            name: e.name,
            subtitle: `Encontro Masmorra • Andar ${e.floorMin}+ • ${e.diceHint}`,
            desc: `HP ${e.hp} • ATK ${e.atk} • Traço: ${e.trait || 'elite'} • Elemento: ${e.element || 'físico'}.`,
            counter: `Fraqueza: ${e.weakness || 'ataque pesado'}. Recompensa: +${e.rewardEggs || 0} ovos.`,
            accent: '#f97316'
          });
        }
        for (const t of (mod.DUNGEON_TRAPS || [])) {
          list.push({
            icon: 'warning',
            name: t.name,
            subtitle: `Armadilha • Andar ${t.floorMin}+ • ${t.diceHint}`,
            desc: `Dano ${t.damage} • Elemento: ${t.element || 'físico'}${t.debuffId ? ` • Debuff: ${t.debuffId}` : ''}.`,
            counter: t.counterplay || 'Role d20 de agilidade ou esquive antes do disparo.',
            accent: '#ef4444'
          });
        }
        for (const r of (mod.DUNGEON_RELICS || [])) {
          list.push({
            icon: 'sparkle',
            name: r.name,
            subtitle: `Relíquia • ${r.rarity} • Andar ${r.floorMin}+`,
            desc: `Bônus: +${r.bonus?.value ?? 0} ${r.bonus?.stat || ''} • Trade-off: -${r.penalty?.value ?? 0} ${r.penalty?.stat || ''}.`,
            counter: 'Combine com a classe do seu dino para maximizar sinergia na Masmorra RPG.',
            accent: '#a855f7'
          });
        }
        for (const m of (mod.X1_COMBAT_MOVES || [])) {
          list.push({
            icon: 'claw',
            name: m.name,
            subtitle: `Golpe X1 • ${m.element} • CD ${m.cooldown}s`,
            desc: `Multiplicador ${m.damageMult}x • Estamina ${m.staminaCost} • Alcance ${m.range}.`,
            counter: 'Use Defesa/Parry [Shift] ou Dash [Espaço] no momento do impacto.',
            accent: '#38bdf8'
          });
        }
        ultraEntries = list;
        ultraLoading = false;
        if (!destroyed) render();
      }).catch(() => {
        ultraEntries = [];
        ultraLoading = false;
        if (!destroyed) render();
      });
    };

    const buildEntries = () => {
      if (tab === 'predators') {
        const base = (PREDATOR_CATALOG || []).map((p) => ({
          icon: p.habitat === 'aquatic' ? 'gills' : (p.habitat === 'flying' ? 'sprint' : 'dino'),
          name: p.name,
          subtitle: `${p.title || p.archetype || 'Predador'} • ${p.biome || 'global'}`,
          desc: p.lore || 'Predador alfa de perseguição ativa na pista.',
          counter: p.counterTip || 'Observe o telégrafo na faixa, troque de pista a tempo e use [Q] ou Habilidade [Espaço].',
          accent: p.accent || '#fb923c'
        }));
        const vars = (extra.predatorVariants || []).map((v) => ({
          icon: 'claw',
          name: v.name || v.id,
          subtitle: `${v.category || 'Encontro'} • Variante`,
          desc: v.desc || v.description || 'Encontro avançado de predador.',
          counter: v.counterTip || v.counter || 'Desvie da faixa sinalizada pelo telégrafo e contra-ataque após a investida.',
          accent: '#f97316'
        }));
        return [...base, ...vars];
      }

      if (tab === 'bosses') {
        const bossList = Array.isArray(BOSS_DEFS) ? BOSS_DEFS : Object.values(BOSS_DEFS || {});
        const base = bossList.map((b) => ({
          icon: 'crown',
          name: b.name,
          subtitle: `${b.title || 'Chefe'} • Bioma: ${b.biomeId || 'geral'} • HP ${b.hp || 5}`,
          desc: b.attackProfile?.length ? `Ataques: ${b.attackProfile.join(', ')}. Fases: ${(b.phases || []).length || 3}.` : 'Chefe de arena com múltiplas fases.',
          counter: b.counterTip || 'Desvie dos projéteis sinalizados e pressione [Q] ou use fraquezas elementais quando a guarda abrir.',
          accent: b.color || '#ef4444'
        }));
        const affixes = (extra.bossAffixes || []).map((a) => ({
          icon: 'flame',
          name: a.name || a.id,
          subtitle: `Afixo de Chefe • ${a.category || 'Elite'}`,
          desc: a.desc || a.description || 'Modificador tático aplicado a chefes em níveis altos.',
          counter: a.counterTip || a.counter || 'Guarde Estamina/Escudo para o pico de fase e priorize a fraqueza elemental.',
          accent: '#ec4899'
        }));
        return [...base, ...affixes];
      }

      if (tab === 'debuffs') {
        const base = Object.values(STATUS_DEFS || {}).map((s) => ({
          icon: 'warning',
          name: s.name || s.id,
          subtitle: s.isDebuff ? 'Debuff de Perigo' : 'Status / Elemento',
          desc: s.desc || 'Altera atributos ou controle do dinossauro temporariamente.',
          counter: s.counterTip || s.desc || 'Use Antídoto [E], reações elementais ou limpe com Habilidade/Fúria.',
          accent: s.color || '#facc15'
        }));
        const vars = (extra.debuffVariants || []).map((d) => ({
          icon: 'warning',
          name: d.name || d.id,
          subtitle: `Debuff • ${d.category || 'Ameaça'}`,
          desc: d.desc || d.description || 'Efeito negativo aplicado por perigos ou predadores.',
          counter: d.counterTip || d.counter || 'Troque de faixa antes da aplicação ou limpe com item/habilidade.',
          accent: d.color || '#f97316'
        }));
        return [...base, ...vars];
      }

      if (tab === 'ultra') {
        if (!ultraEntries) {
          loadUltraCatalog();
          return [];
        }
        return ultraEntries;
      }

      // events + hazards
      const baseEvents = (EVENT_CATALOG || []).map((e) => ({
        icon: 'bolt',
        name: e.name || e.id,
        subtitle: `Evento • ${e.category || 'Mundo'}`,
        desc: e.desc || e.description || 'Evento dinâmico que altera a pista temporariamente.',
        counter: e.counterTip || e.tip || 'Leia o banner de alerta, mantenha a faixa central livre e use [Shift] se precisar de precisão.',
        accent: e.color || '#38bdf8'
      }));
      const extraEv = (extra.eventVariants || []).map((e) => ({
        icon: 'flame',
        name: e.name || e.id,
        subtitle: `Evento Avançado • ${e.category || 'Clima'}`,
        desc: e.desc || e.description || 'Variação de evento de alta intensidade.',
        counter: e.counterTip || e.counter || 'Antecipe o padrão do evento e evite gastar toda a estamina de uma vez.',
        accent: '#38bdf8'
      }));
      const extraHaz = (extra.hazardVariants || []).map((h) => ({
        icon: 'warning',
        name: h.name || h.id,
        subtitle: `Perigo • ${h.category || 'Obstáculo'}`,
        desc: h.desc || h.description || 'Obstáculo especializado de pista.',
        counter: h.counterTip || h.counter || 'Pule [W], abaixe [S], corte com [Q] ou mude de faixa [A/D].',
        accent: '#fb923c'
      }));
      return [...baseEvents, ...extraEv, ...extraHaz];
    };

    const render = () => {
      if (destroyed) return;
      const modalCard = container.querySelector('#bestiary-modal-card');
      const savedScroll = modalCard ? modalCard.scrollTop : 0;
      const all = buildEntries();
      const q = query.trim().toLowerCase();
      const filtered = q
        ? all.filter((it) => `${it.name} ${it.subtitle} ${it.desc} ${it.counter}`.toLowerCase().includes(q))
        : all;
      const shown = filtered.slice(0, limit);

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" id="bestiary-modal-card">
            <div class="modal-header">
              <h2>${uiIcon('bestiary', { size: 20 })} ${L.title}</h2>
              <button class="chunky-btn secondary" id="bestiary-close">${L.back}</button>
            </div>
            <div class="tabs-row" role="tablist" aria-label="${L.title}">
              <button class="tab-btn ${tab === 'predators' ? 'active' : ''}" data-btab="predators">${uiIcon('dino', { size: 14 })} Predadores</button>
              <button class="tab-btn ${tab === 'bosses' ? 'active' : ''}" data-btab="bosses">${uiIcon('crown', { size: 14 })} Chefes</button>
              <button class="tab-btn ${tab === 'debuffs' ? 'active' : ''}" data-btab="debuffs">${uiIcon('warning', { size: 14 })} Debuffs</button>
              <button class="tab-btn ${tab === 'events' ? 'active' : ''}" data-btab="events">${uiIcon('bolt', { size: 14 })} Eventos</button>
              <button class="tab-btn ${tab === 'ultra' ? 'active' : ''}" data-btab="ultra">${uiIcon('dungeon', { size: 14 })} Masmorras &amp; Relíquias</button>
            </div>
            <div class="catalog-toolbar">
              <input type="search" class="text-input catalog-search" id="bestiary-search" value="${escapeHtml(query)}" placeholder="${escapeHtml(L.searchPh)}" aria-label="${escapeHtml(L.searchPh)}" />
              <span class="hud-pill" style="font-size:0.78rem;">${filtered.length} itens</span>
            </div>
            <div class="cards-grid bestiary-grid">
              ${shown.length ? shown.map((it) => `
                <article class="item-card bestiary-card" style="border-color:${escapeHtml(it.accent)};">
                  <div class="bestiary-card-head">
                    <span class="bestiary-ico" aria-hidden="true">${uiIcon(it.icon, { size: 18, color: it.accent })}</span>
                    <div>
                      <strong style="color:#ffd447;">${escapeHtml(it.name)}</strong>
                      <div class="bestiary-sub">${escapeHtml(it.subtitle)}</div>
                    </div>
                  </div>
                  <p class="bestiary-desc">${escapeHtml(it.desc)}</p>
                  <div class="bestiary-counter-box">
                    <strong>${uiIcon('shield', { size: 13 })} ${L.counterLbl}:</strong> ${escapeHtml(it.counter)}
                  </div>
                </article>
              `).join('') : `<div class="item-card" style="grid-column:1/-1; text-align:center; color:#d8c2a6;">${L.empty}</div>`}
            </div>
            ${filtered.length > shown.length ? `
              <div style="text-align:center; margin-top:6px;">
                <button class="chunky-btn secondary" id="bestiary-more">${L.more} (${shown.length}/${filtered.length})</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      const searchEl = container.querySelector('#bestiary-search');
      if (searchEl) {
        searchEl.addEventListener('input', () => {
          query = searchEl.value;
          limit = 48;
          render();
          const nextSearch = container.querySelector('#bestiary-search');
          if (nextSearch) {
            nextSearch.focus();
            nextSearch.setSelectionRange(query.length, query.length);
          }
        });
      }
      container.querySelectorAll('[data-btab]').forEach((b) => {
        b.addEventListener('click', () => {
          tab = b.getAttribute('data-btab');
          limit = 48;
          render();
        });
      });
      container.querySelector('#bestiary-more')?.addEventListener('click', () => {
        limit += 48;
        render();
      });
      container.querySelector('#bestiary-close')?.addEventListener('click', () => {
        destroyed = true;
        onClose();
      });
      attachModalHelp(container, 'Consulte predadores, chefes, debuffs e eventos com estratégias de contra-jogada.');
      const nextCard = container.querySelector('#bestiary-modal-card');
      if (nextCard) nextCard.scrollTop = savedScroll;
    };

    render();
    if (!_bestiaryExtraCache) {
      loadOptionalBestiaryCatalogs().then((loaded) => {
        extra = loaded;
        if (!destroyed) render();
      });
    }
  }

  static renderMapsModal(container, selectedBiome, sequenceMode, onSelect, onClose) {
    let tab = selectedBiome === 'random_portal'
      ? 'essential'
      : (BIOMES.find((b) => b.id === selectedBiome)?.tier || 'essential');
    const essCount = BIOMES.filter((b) => b.tier === 'essential').length;
    const advCount = BIOMES.filter((b) => b.tier === 'advanced').length;
    const ultraCount = BIOMES.filter((b) => b.tier === 'ultra').length;
    const render = () => {
      const list = BIOMES.filter((b) => b.tier === tab);
      const portalThumb = getBiomeThumbnailUrl({ id: 'random_portal', name: 'Portais Dinâmicos' });
      const thumbMap = renderBiomeThumbnailsBatch(list);
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card">
            <div class="modal-header">
              <h2>${uiIcon('openworld', { size: 20 })} Mapas &amp; Biomas (${BIOMES.length})</h2>
              <button class="chunky-btn secondary" id="maps-close">Voltar</button>
            </div>
            <div class="field-row">
              <span>Transição Automática por Portal (~1000 pts)</span>
              <input type="checkbox" id="map-seq" ${sequenceMode ? 'checked' : ''} />
            </div>
            <div class="item-card ${selectedBiome === 'random_portal' ? 'selected' : ''}" style="border-color:#a855f7; background:linear-gradient(135deg, rgba(30,27,75,0.75), rgba(88,28,135,0.45));">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:220px;">
                  ${portalThumb ? `<img src="${portalThumb}" alt="Preview 3D Portais Dinâmicos" class="biome-thumb-3d" style="width:96px; height:52px; border-radius:8px; object-fit:cover; border:1px solid rgba(192,132,252,0.55); flex-shrink:0;" />` : ''}
                  <div>
                    <strong style="color:#e9d5ff;">${uiIcon('sparkle', { size: 15, color: '#e9d5ff' })} Modo Aleatório (Portais Dinâmicos)</strong>
                    <p style="font-size:0.8rem; color:#ddd6fe; margin:2px 0 0;">Sorteia o bioma inicial e abre portais aleatórios a cada ~1.050 pts (Terra, Água, Céu, Futuro &amp; Terra Oca)!</p>
                  </div>
                </div>
                <button class="chunky-btn ${selectedBiome === 'random_portal' ? '' : 'secondary'}" data-pick-biome="random_portal">
                  ${selectedBiome === 'random_portal' ? 'Ativo' : 'Ativar Portais'}
                </button>
              </div>
            </div>
            <div class="tabs-row">
              <button class="tab-btn ${tab === 'essential' ? 'active' : ''}" data-btab="essential">Essenciais (${essCount})</button>
              <button class="tab-btn ${tab === 'advanced' ? 'active' : ''}" data-btab="advanced">Avançados (${advCount})</button>
              <button class="tab-btn ${tab === 'ultra' ? 'active' : ''}" data-btab="ultra">${uiIcon('sparkle', { size: 13 })} Ultra (${ultraCount})</button>
            </div>
            <div class="cards-grid">
              ${list.map((b) => {
                const meta = getBiomePreviewMeta(b);
                const thumbUrl = thumbMap.get(b.id) || '';
                return `
                  <div class="item-card ${b.id === selectedBiome ? 'selected' : ''}">
                    <div class="biome-preview-frame" style="height:86px; border-radius:10px; position:relative; overflow:hidden; border:1px solid ${b.theme?.edgeGlow || 'rgba(255,255,255,0.2)'}; background:${b.theme?.sky || '#18181b'};">
                      ${thumbUrl ? `<img src="${thumbUrl}" alt="Cenário 3D ${escapeHtml(b.name)}" class="biome-thumb-3d" style="width:100%; height:100%; object-fit:cover; display:block;" />` : ''}
                      <span style="position:absolute; left:7px; bottom:6px; font-size:0.7rem; font-weight:800; background:rgba(9,9,11,0.78); color:#fafaf9; padding:2px 8px; border-radius:999px; border:1px solid rgba(255,255,255,0.16); display:inline-flex; align-items:center; gap:4px; backdrop-filter:blur(4px);">${uiIcon('compass', { size: 11 })} ${meta.tag}</span>
                    </div>
                    <strong>${b.name}</strong>
                    <p style="font-size:0.8rem; color:#d8c2a6; flex:1;">${b.ruleDesc}</p>
                    <small style="color:#ffd447;">${uiIcon('crown', { size: 13, color: '#ffd447' })} Chefe: ${BOSS_DEFS[b.bossId]?.name || b.bossId}</small>
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
              <h2>${uiIcon('bolt', { size: 20, color: '#ff9a24' })} Dificuldade</h2>
              <button class="chunky-btn secondary" id="diff-close">Salvar &amp; Voltar</button>
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
              <span>${uiIcon('diamond', { size: 14, color: '#38bdf8' })} Modo Perfeito (1 Hit = Fim • Score ×2.2 • Ovos ×1.5)</span>
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
              return `<p style="font-size:0.9rem; color:#d8c2a6;">Preset selecionado: <strong>${cfg.name}</strong> • Vidas (${selDino?.name || 'Dino'}): ${Save.data.perfectMode ? `<strong style="color:#38bdf8;">1 (${uiIcon('diamond', { size: 13, color: '#38bdf8' })} Modo Perfeito ativo!)</strong>` : `<strong>${eff} ${uiIcon('heart', { size: 13, color: '#fda4af' })}</strong> (base ${cfg.lives})`} • Multiplicador: ${cfg.scoreMult}x</p>`;
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
            <h2>${uiIcon('scroll', { size: 20 })} Missões, Conquistas &amp; Passe</h2>
            <button class="chunky-btn secondary" id="mp-close">Voltar</button>
          </div>
          <div class="item-card">
            <div style="display:flex; justify-content:space-between;">
              <strong>${uiIcon('star', { size: 15, color: '#ffd447' })} Passe de Temporada Local — Nível ${pass.level}/50</strong>
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
                <span style="color:#ffd447;">${m.claimed ? `${uiIcon('check', { size: 13, color: '#4ade80' })} Recompensa recebida!` : `Prêmio: +${m.reward} ${uiIcon('egg', { size: 13 })}`}</span>
              </div>
            `).join('')}
          </div>
          <h3>Conquistas &amp; Títulos</h3>
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
                  <strong>${unlocked ? uiIcon('trophy', { size: 14, color: '#ffd447' }) : uiIcon('lock', { size: 14 })} ${a.name}</strong>
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
            <h2>${uiIcon('book', { size: 20 })} Álbum de Dinos &amp; Casa de Troféus</h2>
            <button class="chunky-btn secondary" id="ah-close">Voltar</button>
          </div>
           <div class="item-card">
             <strong>${uiIcon('trophy', { size: 15, color: '#ffd447' })} Casa do Dino — Troféus de Chefes (${trophies.length}/${Object.keys(BOSS_DEFS).length})</strong>
             <div class="tabs-row">
               ${Object.values(BOSS_DEFS).map((b) => `
                 <span class="hud-pill" style="opacity:${trophies.includes(b.id) ? 1 : 0.4};">
                   ${trophies.includes(b.id) ? uiIcon('trophy', { size: 13, color: '#ffd447' }) : uiIcon('lock', { size: 13 })} ${b.name}
                 </span>
               `).join('')}
             </div>
           </div>
           <div class="item-card" style="margin-top:8px;">
             <strong>${uiIcon('sparkle', { size: 15, color: '#fde68a' })} Fósseis &amp; Lore dos Biomas (${Object.keys(Save.data.discoveredFossils || {}).length}/${BIOMES.length})</strong>
             <div class="cards-grid" style="margin-top:6px;">
               ${BIOMES.map((b) => {
                 const found = !!Save.data.discoveredFossils?.[b.fossil?.id];
                 return `
                   <div class="item-card ${found ? 'selected' : ''}" style="opacity:${found ? 1 : 0.72}; padding:8px;">
                     <strong style="color:#ffd447;">${found ? uiIcon('star', { size: 13, color: '#ffd447' }) : uiIcon('lock', { size: 13 })} ${b.fossil?.name || b.name}</strong>
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
            <h2>${uiIcon('medal', { size: 20, color: '#ffd447' })} Recordes &amp; Rivalidade</h2>
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
            <h2>${uiIcon('dungeon', { size: 20 })} Cidade Pré-Histórica (Hub)</h2>
            <button class="chunky-btn secondary" id="hub-close">Voltar</button>
          </div>
          <p style="color:#ffe8b5; font-size:0.9rem;">
            Bem-vindo à Vila Jurássica! Converse com os moradores e prepare-se para a próxima expedição.
          </p>
          <div class="cards-grid">
            <div class="item-card">
              <strong>${uiIcon('dino', { size: 15 })} Mestre Rex (Treinador)</strong>
              <p style="font-size:0.82rem; color:#d8c2a6;">"Evolua suas habilidades até o nível 10 para encarar os chefes!"</p>
              <button class="chunky-btn" id="hub-dinos">Treinar Dinos</button>
            </div>
            <div class="item-card">
              <strong>${uiIcon('shop', { size: 15 })} Mercador Parasaurolophus</strong>
              <p style="font-size:0.82rem; color:#d8c2a6;">"Trouxe ovos frescos? Tenho acessórios raros e ovos misteriosos!"</p>
              <button class="chunky-btn orange" id="hub-shop">Ir para Loja</button>
            </div>
            <div class="item-card">
              <strong>${uiIcon('gamepad', { size: 15 })} Pescador Spino</strong>
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
