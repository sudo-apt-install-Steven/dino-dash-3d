// HUD completo em partida: placar HI 00194  00070, barras de Fúria/Habilidade/Bullet-Time,
// mochila, mapa do tesouro, Boss HP, OVNI fuga, Papéis Compartilhados, Touch, Pausa e Game Over.
import { BACKPACK_ITEMS } from '../systems/Items.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { StatusSystem } from '../systems/StatusSystem.js';
import { Save } from '../systems/Save.js';
import { renderSkillSvg, renderEggSvg, renderBossObsSvg } from './SvgIcons.js';

export function formatScoreValue(val) {
  return String(Math.max(0, Math.floor(val))).padStart(5, '0');
}

export class HUD {
  constructor(rootEl, callbacks = {}) {
    this.root = rootEl;
    this.callbacks = callbacks;
    this.bannerTimer = 0;
    this.subTimer = 0;
    this._render();
  }

  _render() {
    this.root.innerHTML = `
      <div class="damage-vignette hidden" id="dmg-vignette"></div>
      <div class="edge-flash-vignette" id="edge-flash"></div>
      <div class="hud-tooltip hidden" id="hud-tooltip"></div>

      <div class="hud-top">
        <div class="hud-pills">
          <div class="dino-logo" style="font-size: 1.25rem;">DINO <span class="dash-accent">DASH 3D</span></div>
          <div class="hud-pill" id="hud-camera" style="cursor:pointer; pointer-events:auto;" data-tip="Troca a câmera de visão (Tecla C ou toque)."><span class="kb-only">Câmera: </span><span class="mob-only">📷 </span><strong>3ª Pessoa</strong></div>
          <div class="hud-pill" id="hud-speed" data-tip="Velocidade atual da corrida.">Vel: <strong>1.0x</strong></div>
          <div class="hud-pill" id="hud-eggs" data-tip="Total de Ovos guardados para Loja e Dinossauros.">${renderEggSvg('dourado', 18)} <strong>0</strong></div>
          <div class="hud-pill hidden" id="hud-combo" style="color:#ffd447;" data-tip="Multiplicador por quase-colisões e pisões seguidos.">Combo: <strong>x1</strong></div>
          <div class="hud-pill hidden" id="hud-mp-rank" style="color:#fde047; border-color:#ffd447;" data-tip="Sua posição atual contra outros jogadores.">🏆 #1</div>
          <div class="hud-pill hidden" id="hud-element" style="color:#38bdf8;" data-tip="Elemento ativo: combine com outro ou acerte a fraqueza do Chefe!">✨ Nenhum</div>
          <div class="hud-pill hidden" id="hud-wanted" style="color:#ff4757;" data-tip="Nível de Caçada: aumenta recompensa e atenção de predadores.">🚨 ★</div>
        </div>

        <div class="hud-top-right" style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
          <div class="hud-top-actions" style="display:flex; gap:8px; align-items:center;">
            <button class="chunky-btn secondary" id="btn-guide" style="padding:5px 10px; font-size:0.75rem;" data-tip="Abre o Guia Visual de obstáculos, status e chefes.">📖<span class="btn-label"> Guia</span></button>
            <button class="chunky-btn secondary" id="btn-clip-rec" style="padding:5px 10px; font-size:0.75rem;" data-tip="Gravar clipe curto da corrida (.webm).">🎥<span class="btn-label"> Clipe</span></button>
            <button class="chunky-btn secondary ${Save.data.devMode ? '' : 'hidden'}" id="btn-debug" style="padding:5px 10px; font-size:0.75rem;" data-tip="Painel de Depuração e Testes (F9).">🛠️<span class="btn-label"> Debug</span></button>
            <button class="chunky-btn secondary" id="btn-photo-mode" style="padding:5px 10px; font-size:0.75rem;" data-tip="Modo Foto (pausa para capturar cena).">📷</button>
            <button class="chunky-btn secondary" id="btn-pause" style="padding:5px 12px; font-size:0.75rem;" data-tip="Pausar corrida (Tecla P).">⏸<span class="btn-label"> P</span></button>
            <div class="hud-score-box" id="hud-score" data-tip="Recorde máximo (HI) e Pontuação atual."><span class="hi-label">HI 00000</span>  00000</div>
          </div>
          <div class="treasure-map" id="hud-treasure-map" data-tip="Progresso até o próximo Portal de mudança de Bioma!">
            <strong class="kb-only" style="color:#fbbf24; font-size:0.68rem;">PROGRESSO</strong>
            <span id="map-biome-name">Deserto Dourado</span>
            <div class="treasure-track"><div class="treasure-fill" id="map-fill" style="width:0%"></div></div>
            <span id="map-next-portal">Portal em 1000</span>
          </div>
        </div>
      </div>

      <div class="boss-bar-wrap hidden" id="boss-bar-wrap">
        <div class="chunky-panel" style="padding:8px 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
            <strong id="boss-name" style="color:#ff4757;">Chefe</strong>
            <span id="boss-weakness" style="font-size:0.74rem; color:#fde047;"></span>
            <span id="boss-hp-text">5/5</span>
          </div>
          <div class="meter-bar" style="height:10px;"><div class="meter-fill" id="boss-hp-fill" style="width:100%; background:#ff4757;"></div></div>
        </div>
      </div>

      <div class="boss-bar-wrap hidden" id="ufo-bar-wrap" style="top:116px;">
        <div class="chunky-panel" style="padding:8px 14px; text-align:center;">
          <div style="font-size:0.85rem; color:#22d3ee; font-weight:900;" id="ufo-label">🛸 FUGA DO OVNI! Desvie ou aperte Espaço!</div>
          <div class="meter-bar" style="height:10px;"><div class="meter-fill" id="ufo-fill" style="width:0%; background:#22d3ee;"></div></div>
        </div>
      </div>

      <div class="banner-toast hidden" id="hud-banner"></div>
      <div class="chunky-panel hidden" id="hud-tutorial-box" style="position:fixed; top:76px; left:50%; transform:translateX(-50%); z-index:26; padding:10px 16px; width:min(540px, 92vw); pointer-events:auto; border-color:#38bdf8;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px;">
          <strong id="tut-step-title" style="color:#ffd447; font-size:0.95rem;">🎓 Tutorial</strong>
          <div style="display:flex; gap:8px; align-items:center;">
            <span id="tut-step-progress" class="hud-pill" style="font-size:0.75rem; padding:2px 8px;">1/6</span>
            <button class="chunky-btn secondary" id="tut-skip" style="padding:3px 9px; font-size:0.72rem;">Sair</button>
          </div>
        </div>
        <div id="tut-step-desc" style="font-size:0.86rem; color:#fef3c7;">Siga as instruções na pista!</div>
      </div>
      <div class="float-callouts" id="hud-floats"></div>
      <div class="narrator-sub hidden" id="hud-narrator"></div>

      <div class="hud-bottom-bar" id="hud-bottom-bar">
        <div class="hud-pill hidden" id="hud-shared-roles" style="color:#ffd447;"></div>
        <div class="hud-pill hidden" id="hud-chaser" style="color:#ff4757;"></div>

        <div class="hud-meters" id="hud-meters">
          <div class="hud-group" id="hud-group-vital">
            <span class="hud-group-title">Vida & Status</span>
            <div class="meter-pill" data-tip="Corações de vida e Escudos absorvem impactos.">
              <div id="hud-hp-text">❤️ 3/3 • 🛡️ 0</div>
            </div>
            <div class="hud-status-row" id="hud-status-pills"></div>
          </div>

          <div class="hud-group" id="hud-group-combat">
            <span class="hud-group-title">Combate</span>
            <div class="meter-pill" id="btn-fury-melee" style="cursor:pointer; pointer-events:auto;" data-tip="Fúria (F): ao encher 100%, clique ou aperte F para ficar gigante!">
              <span>🔥 <span class="btn-label">Fúria</span> <span class="kb-only">(F)</span></span>
              <div class="meter-bar"><div class="meter-fill" id="bar-fury" style="width:0%; background:linear-gradient(90deg,#ff5e1a,#ffd447);"></div></div>
            </div>
            <div class="meter-pill" data-tip="Habilidade especial do seu Dino (Espaço): carrega por tempo + ações (combos, pisões e Q).">
              <span id="lbl-ability">⚡ <span class="btn-label">Habilidade</span> <span class="kb-only">(Espaço)</span></span>
              <div class="meter-bar"><div class="meter-fill" id="bar-ability" style="width:100%; background:#58d63a;"></div></div>
            </div>
            <div class="meter-pill" id="btn-attack-melee" style="cursor:pointer; pointer-events:auto;" data-tip="Ataque rápido (Q): corta cactos, espinhos e acerta chefes!">
              <span>⚔️ <span class="btn-label">Ataque</span> <span class="kb-only">(Q)</span></span>
              <div class="meter-bar"><div class="meter-fill" id="bar-attack" style="width:100%; background:#f97316;"></div></div>
            </div>
            <div class="meter-pill" data-tip="Estamina Física (Shift=Lento / W no ar=Pulo 2x): recarrega no chão e com itens!">
              <span>🏃 <span class="btn-label">Estamina</span> <span class="kb-only">(Shift/2x⬆)</span></span>
              <div class="meter-bar"><div class="meter-fill" id="bar-bullet" style="width:100%; background:#34d399;"></div></div>
            </div>
            <div class="meter-pill" id="hud-backpack" style="cursor:pointer; pointer-events:auto;" data-tip="Mochila (E): clique ou aperte E para usar o próximo item guardado.">
              🎒 <span class="kb-only">(E) </span><strong id="lbl-backpack">Vazia</strong>
            </div>
          </div>
        </div>

        <div class="controls-hint" id="hud-controls-hint">
          <kbd>W</kbd>/<kbd>↑</kbd> Pular (segure=alto) • <kbd>S</kbd>/<kbd>↓</kbd> Abaixar • <kbd>A</kbd>/<kbd>D</kbd> Faixas • <kbd>Q</kbd> Ataque • <kbd>Espaço</kbd> Habilidade • <kbd>F</kbd> Fúria • <kbd>C</kbd> Câmera • <kbd>F9</kbd> Debug
        </div>
      </div>

      <!-- Botões virtuais touch para dispositivos móveis -->
      <div class="touch-controls" id="touch-controls">
        <div class="touch-cluster touch-cluster-left">
          <button class="touch-btn" data-tact="left" aria-label="Faixa Esquerda">◀</button>
          <button class="touch-btn" data-tact="right" aria-label="Faixa Direita">▶</button>
        </div>
        <div class="touch-cluster touch-cluster-right">
          <button class="touch-btn" data-tact="duck" aria-label="Abaixar">▼</button>
          <button class="touch-btn" data-tact="attack" aria-label="Ataque">⚔️</button>
          <button class="touch-btn" data-tact="ability" aria-label="Habilidade">⚡</button>
          <button class="touch-btn" data-tact="jump" aria-label="Pular">▲</button>
        </div>
      </div>

      <!-- Pause Overlay -->
      <div class="overlay-center hidden" id="pause-overlay">
        <div class="chunky-panel gameover-card">
          <h2>⏸ PAUSADO</h2>
          <button class="chunky-btn" id="btn-resume">Continuar</button>
          <button class="chunky-btn orange" id="btn-pause-restart">Reiniciar (R)</button>
          <button class="chunky-btn secondary" id="btn-pause-menu">Menu Principal</button>
        </div>
      </div>

      <!-- Onboarding First-Use Spotlight Overlay -->
      <div class="spotlight-backdrop hidden" id="hud-spotlight-overlay">
        <div class="chunky-panel spotlight-card" id="spotlight-card">
          <div id="spotlight-icon" style="font-size:2.4rem;">⚡</div>
          <h3 id="spotlight-title" style="margin:0; color:#ffd447; font-size:1.18rem;">Novidade Desbloqueada!</h3>
          <p id="spotlight-desc" style="margin:0; color:#fef3c7; font-size:0.92rem; line-height:1.45;">Dica rápida do jogo.</p>
          <button class="chunky-btn" id="spotlight-dismiss" style="margin-top:4px;">Entendi! (Espaço / Clique)</button>
        </div>
      </div>

      <!-- Predator Opening Intro Banner (Subway Surfers style, pre-run, top-left clear of center action & biome pill) -->
      <div class="chunky-panel hidden" id="hud-predator-intro" style="position:fixed; top:74px; left:18px; z-index:48; width:min(380px, calc(100vw - 36px)); pointer-events:auto; padding:9px 13px; border-width:3px; background:rgba(20, 11, 6, 0.88); cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
          <div>
            <span class="hud-pill" id="pred-intro-arch" style="font-size:0.68rem; padding:2px 8px; color:#ffd447;">🐾 PREDADOR ALFA</span>
            <h2 id="pred-intro-name" style="margin:2px 0 0; color:#fff; font-size:1.15rem; line-height:1.15;">Cindermaw</h2>
            <div id="pred-intro-title" style="font-size:0.8rem; color:#fb923c; font-weight:700;">Fauces de Brasa</div>
          </div>
          <button class="chunky-btn orange" id="pred-intro-skip" style="padding:7px 12px; font-size:0.8rem;">⏭ Pular (<span id="pred-intro-sec">3.9</span>s)</button>
        </div>
        <p id="pred-intro-lore" style="margin:4px 0 2px; font-size:0.78rem; color:#fef3c7; line-height:1.28;"></p>
        <div id="pred-intro-tip" style="font-size:0.74rem; color:#38bdf8; font-weight:700; line-height:1.25;"></div>
      </div>

      <!-- Confirmação de Reinício (R) -->
      <div class="overlay-center hidden" id="restart-confirm-overlay">
        <div class="chunky-panel gameover-card" style="max-width:410px; text-align:center;">
          <h2>🔄 Reiniciar Corrida?</h2>
          <p style="font-size:0.9rem; color:#d8c2a6;">Você perderá o progresso desta corrida atual. Deseja realmente reiniciar?</p>
          <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:8px;">
            <button class="chunky-btn orange" id="btn-confirm-restart">Sim, Reiniciar (Enter)</button>
            <button class="chunky-btn secondary" id="btn-cancel-restart">Continuar Jogando (Esc)</button>
          </div>
        </div>
      </div>

      <!-- Merchant Overlay -->
      <div class="overlay-center hidden" id="merchant-overlay">
        <div class="chunky-panel gameover-card">
          <h2>🛒 Mercador de Ovos</h2>
          <p style="font-size:0.9rem; color:#d8c2a6;">Troque ovos por reforços rápidos durante a corrida!</p>
          <button class="chunky-btn" id="merch-heal">Comprar +1 Vida / Escudo (20 🥚)</button>
          <button class="chunky-btn orange" id="merch-skip">Seguir Corrida</button>
        </div>
      </div>

      <!-- Photo Mode Overlay -->
      <div class="overlay-center hidden" id="photo-overlay" style="background:transparent; align-items:flex-end; pointer-events:none;">
        <div class="chunky-panel" style="padding:12px 18px; display:flex; gap:10px; align-items:center;">
          <strong>📷 Modo Foto / Cinema</strong>
          <button class="chunky-btn secondary" id="photo-cam">Trocar Ângulo (C)</button>
          <button class="chunky-btn" id="photo-exit">Sair do Modo Foto</button>
        </div>
      </div>

      <!-- Game Over / End Run Overlay -->
      <div class="overlay-center hidden" id="gameover-overlay">
        <div class="chunky-panel gameover-card" style="width:min(520px,95vw);">
          <h2 id="go-title">GAME OVER!</h2>
          <div id="go-cause-box" class="item-card" style="padding:10px 12px; text-align:left; border-color:#ff6b6b; background:rgba(40, 14, 14, 0.85);">
            <div style="font-size:0.88rem; font-weight:900; color:#ffb4a2;" id="go-cause-text">💥 Colisão na pista</div>
            <div style="font-size:0.8rem; color:#fde68a; margin-top:3px;" id="go-avoid-tip">💡 Dica: Desvie para outra faixa ou pule com W!</div>
          </div>
          <div class="stat-grid">
            <div class="stat-tile"><span class="label">Pontuação</span><span class="val" id="go-score">00000</span></div>
            <div class="stat-tile"><span class="label">Recorde (HI)</span><span class="val" id="go-hi">00000</span></div>
            <div class="stat-tile"><span class="label">Distância</span><span class="val" id="go-dist">0 m</span></div>
            <div class="stat-tile"><span class="label">Ovos / Max Combo</span><span class="val" id="go-eggs">0 / x1</span></div>
          </div>
          <div id="go-record-badge" class="hud-pill hidden" style="margin:0 auto; color:#ffd447;">🏆 NOVO RECORDE!</div>
          <p id="go-fact" style="font-size:0.8rem; color:#d8c2a6; font-style:italic;"></p>
          <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <button class="chunky-btn" id="btn-restart">🔄 Jogar de novo (R)</button>
            <button class="chunky-btn orange" id="btn-go-dinos">🦖 Trocar dino</button>
            <button class="chunky-btn secondary" id="btn-go-menu">🏠 Menu</button>
          </div>
          <div style="margin-top:2px;">
            <button id="btn-replay" class="inline-change-btn" style="padding:3px 10px; font-size:0.78rem;">🎬 Ver replay da corrida</button>
          </div>
        </div>
      </div>

      <div id="modal-layer"></div>
    `;

    this._cacheRefs();
    this._bindInteractions();
  }

  _cacheRefs() {
    const q = (s) => this.root.querySelector(s);
    this.hudTop = q('.hud-top');
    this.scoreEl = q('#hud-score');
    this.cameraEl = q('#hud-camera strong');
    this.speedEl = q('#hud-speed strong');
    this.eggsEl = q('#hud-eggs strong');
    this.comboEl = q('#hud-combo');
    this.mpRankEl = q('#hud-mp-rank');
    this.elementEl = q('#hud-element');
    this.wantedEl = q('#hud-wanted');
    this.hpText = q('#hud-hp-text');
    this.barFury = q('#bar-fury');
    this.lblAbility = q('#lbl-ability');
    this.barAbility = q('#bar-ability');
    this.barBullet = q('#bar-bullet');
    this.barAttack = q('#bar-attack');
    this.clipBtn = q('#btn-clip-rec');
    this.guideBtn = q('#btn-guide');
    this.tutBox = q('#hud-tutorial-box');
    this.tutTitle = q('#tut-step-title');
    this.tutProgress = q('#tut-step-progress');
    this.tutDesc = q('#tut-step-desc');
    this.lblBackpack = q('#lbl-backpack');
    this.mapBiomeName = q('#map-biome-name');
    this.mapFill = q('#map-fill');
    this.mapNextPortal = q('#map-next-portal');
    this.bannerEl = q('#hud-banner');
    this.floatsEl = q('#hud-floats');
    this.narratorEl = q('#hud-narrator');
    this.dmgVignette = q('#dmg-vignette');
    this.edgeFlash = q('#edge-flash');
    this.debugBtn = q('#btn-debug');
    this.sharedRolesEl = q('#hud-shared-roles');
    this.chaserEl = q('#hud-chaser');
    this.predIntroEl = q('#hud-predator-intro');
    this.predIntroName = q('#pred-intro-name');
    this.predIntroTitle = q('#pred-intro-title');
    this.predIntroArch = q('#pred-intro-arch');
    this.predIntroLore = q('#pred-intro-lore');
    this.predIntroTip = q('#pred-intro-tip');
    this.predIntroSec = q('#pred-intro-sec');
    this.predIntroSkip = q('#pred-intro-skip');
    this.bossWrap = q('#boss-bar-wrap');
    this.bossName = q('#boss-name');
    this.bossWeakness = q('#boss-weakness');
    this.bossHpText = q('#boss-hp-text');
    this.bossHpFill = q('#boss-hp-fill');
    this.statusPillsEl = q('#hud-status-pills');
    this.tooltipEl = q('#hud-tooltip');
    this.ufoWrap = q('#ufo-bar-wrap');
    this.ufoFill = q('#ufo-fill');
    this.ufoLabel = q('#ufo-label');
    this.touchControls = q('#touch-controls');
    this.hudBottom = q('#hud-bottom-bar');

    this.pauseOverlay = q('#pause-overlay');
    this.spotlightOverlay = q('#hud-spotlight-overlay');
    this.spotlightCard = q('#spotlight-card');
    this.spotlightIcon = q('#spotlight-icon');
    this.spotlightTitle = q('#spotlight-title');
    this.spotlightDesc = q('#spotlight-desc');
    this.spotlightDismiss = q('#spotlight-dismiss');
    this._spotlightFocusEl = null;
    this._onSpotlightDismiss = null;
    this.restartConfirmOverlay = q('#restart-confirm-overlay');
    this.merchantOverlay = q('#merchant-overlay');
    this.merchHealBtn = q('#merch-heal');
    this.photoOverlay = q('#photo-overlay');
    this.gameOverOverlay = q('#gameover-overlay');
    this.modalLayer = q('#modal-layer');
  }

  _bindInteractions() {
    this.root.querySelector('#btn-restart').addEventListener('click', () => this.callbacks.onRestart?.());
    this.root.querySelector('#btn-replay').addEventListener('click', () => this.callbacks.onReplay?.());
    this.root.querySelector('#btn-go-dinos')?.addEventListener('click', () => this.callbacks.onGoDinos?.());
    this.root.querySelector('#btn-go-menu').addEventListener('click', () => this.callbacks.onGoMenu?.());
    this.root.querySelector('#btn-pause').addEventListener('click', () => this.callbacks.onTogglePause?.());
    this.root.querySelector('#btn-resume').addEventListener('click', () => this.callbacks.onTogglePause?.());
    this.root.querySelector('#btn-pause-restart').addEventListener('click', () => this.callbacks.onRequestRestart?.());
    this.root.querySelector('#btn-confirm-restart').addEventListener('click', () => this.callbacks.onConfirmRestart?.());
    this.root.querySelector('#btn-cancel-restart').addEventListener('click', () => this.callbacks.onCancelRestart?.());
    this.root.querySelector('#btn-pause-menu').addEventListener('click', () => this.callbacks.onGoMenu?.());
    this.root.querySelector('#btn-photo-mode').addEventListener('click', () => this.callbacks.onTogglePhoto?.());
    this.root.querySelector('#btn-debug').addEventListener('click', () => this.callbacks.onOpenDebug?.());
    this.root.querySelector('#btn-guide').addEventListener('click', () => this.callbacks.onOpenGuide?.());
    this.root.querySelector('#tut-skip').addEventListener('click', () => this.callbacks.onSkipTutorial?.());
    this.root.querySelector('#btn-clip-rec').addEventListener('click', () => this.callbacks.onRecordClip?.());
    this.root.querySelector('#btn-fury-melee')?.addEventListener('click', () => this.callbacks.onTriggerFury?.());
    this.root.querySelector('#btn-attack-melee').addEventListener('click', () => this.callbacks.onBasicAttack?.());
    this.root.querySelector('#hud-camera')?.addEventListener('click', () => this.callbacks.onCycleCamera?.());
    this.root.querySelector('#photo-exit').addEventListener('click', () => this.callbacks.onTogglePhoto?.());
    this.root.querySelector('#photo-cam').addEventListener('click', () => this.callbacks.onCycleCamera?.());
    this.root.querySelector('#hud-backpack').addEventListener('click', () => this.callbacks.onUseItem?.());
    this.root.querySelector('#merch-heal').addEventListener('click', () => this.callbacks.onMerchantBuy?.());
    this.root.querySelector('#merch-skip').addEventListener('click', () => {
      if (this.callbacks.onMerchantSkip) {
        this.callbacks.onMerchantSkip();
      } else {
        this.hideMerchant();
      }
    });

    // Tooltips rápidos ao passar o mouse / tocar nos blocos da HUD
    if (this.tooltipEl) {
      const showTip = (el) => {
        const tip = el?.getAttribute?.('data-tip');
        if (!tip) return;
        this.tooltipEl.textContent = tip;
        this.tooltipEl.classList.remove('hidden');
        const r = el.getBoundingClientRect();
        const top = r.top > 90 ? r.top - 42 : r.bottom + 8;
        const left = Math.max(10, Math.min(window.innerWidth - 255, r.left));
        this.tooltipEl.style.top = `${top}px`;
        this.tooltipEl.style.left = `${left}px`;
      };
      const hideTip = () => this.tooltipEl.classList.add('hidden');
      this.root.querySelectorAll('[data-tip]').forEach((el) => {
        el.addEventListener('pointerenter', () => showTip(el));
        el.addEventListener('pointerleave', hideTip);
        el.addEventListener('pointerdown', () => {
          showTip(el);
          setTimeout(hideTip, 2200);
        });
      });
    }

    // Botões virtuais Touch
    this.root.querySelectorAll('[data-tact]').forEach((btn) => {
      const act = btn.getAttribute('data-tact');
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.callbacks.onTouchAction?.(act, true);
      });
      const release = () => this.callbacks.onTouchAction?.(act, false);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });
  }

  setPlayingUI(isPlaying) {
    this.hudTop.classList.toggle('hidden', !isPlaying);
    this.hudBottom.classList.toggle('hidden', !isPlaying);
    this.touchControls.classList.toggle('active-play', isPlaying);
  }

  resetAllOverlays() {
    this.hideGameOver();
    this.showPause(false);
    this.showRestartConfirm(false);
    this.hideMerchant();
    this.showPhotoMode(false);
    this.setBossHud(null);
    this.setUfoHud(false, 0, 0);
    this.setChaserHud(false, 0);
    this.setSharedRolesHint('');
    this.setTutorialHud(null);
    this.setMpRankHud('');
    this.dmgVignette.classList.add('hidden');
    this.bannerEl.classList.add('hidden');
    this.narratorEl.classList.add('hidden');
    this.elementEl?.classList.add('hidden');
    this.wantedEl?.classList.add('hidden');
  }

  setTutorialHud(info) {
    if (!this.tutBox) return;
    const active = !!info?.active;
    this.tutBox.classList.toggle('hidden', !active);
    if (active) {
      this.tutTitle.textContent = info.title || '🎓 Tutorial';
      this.tutProgress.textContent = info.progressText || `${info.step || 1}/${info.total || 6}`;
      this.tutDesc.textContent = info.desc || '';
    }
  }

  setMpRankHud(text, color = '#fde047') {
    if (!this.mpRankEl) return;
    this.mpRankEl.classList.toggle('hidden', !text);
    if (text) {
      this.mpRankEl.textContent = text;
      this.mpRankEl.style.color = color;
    }
  }

  showRestartConfirm(show) {
    this.restartConfirmOverlay?.classList.toggle('hidden', !show);
  }

  setMerchantCost(cost, eggs = null) {
    if (this.merchHealBtn) {
      const lacking = typeof eggs === 'number' && eggs < cost;
      this.merchHealBtn.textContent = lacking
        ? `Ovos insuficientes (${eggs}/${cost} 🥚) — Toque para fechar`
        : `Comprar +1 Vida / Escudo (${cost} 🥚)`;
      this.merchHealBtn.style.opacity = lacking ? '0.82' : '1';
    }
  }

  setClipRecording(active) {
    if (!this.clipBtn) return;
    this.clipBtn.textContent = active ? '⏹ Parar REC' : '🎥 Clipe';
    this.clipBtn.style.borderColor = active ? '#ff4757' : '';
  }

  updateScore(hiScore, currentScore, speedRatio) {
    this.scoreEl.innerHTML = `<span class="hi-label">HI ${formatScoreValue(hiScore)}</span>  ${formatScoreValue(currentScore)}`;
    this.speedEl.textContent = `${speedRatio.toFixed(1)}x`;
  }

  setDebugButtonVisible(visible) {
    this.debugBtn?.classList.toggle('hidden', !visible);
  }

  triggerEdgeFlash(kind = 'red') {
    if (!this.edgeFlash) return;
    this.edgeFlash.className = `edge-flash-vignette flash-${kind} show`;
    clearTimeout(this._flashTid);
    this._flashTid = setTimeout(() => {
      this.edgeFlash?.classList.remove('show');
    }, 220);
  }

  pulseHp(kind = 'hurt') {
    if (!this.hpText) return;
    const cls = kind === 'heal' ? 'hp-pop' : 'hp-shake';
    this.hpText.classList.remove('hp-shake', 'hp-pop');
    clearTimeout(this._hpPulseTid);
    requestAnimationFrame(() => {
      this.hpText?.classList.add(cls);
      this._hpPulseTid = setTimeout(() => this.hpText?.classList.remove('hp-shake', 'hp-pop'), 320);
    });
  }

  updatePlayStatus(player, eggsTotal, biomeName, nextPortalDist, combo, score) {
    this.eggsEl.textContent = String(eggsTotal);
    const maxHp = Math.max(1, player.maxHp || 1);
    const hp = Math.max(0, Math.min(maxHp, Math.round(player.hp ?? 0)));
    const hearts = maxHp <= 6 ? `${'❤️'.repeat(hp)}${'🖤'.repeat(maxHp - hp)} ` : '❤️ ';
    const perfBadge = Save.data.perfectMode && maxHp === 1 ? '💎 ' : '';
    this.hpText.textContent = `${perfBadge}${hearts}${hp}/${maxHp} • 🛡️ ${player.shields || 0}`;
    const pulseLowHp = !!Save.data.settings.lowHpPulse;
    const lowHpActive = pulseLowHp && player.hp <= 1 && !player.dead;
    this.dmgVignette.classList.toggle('hidden', !lowHpActive);
    this.dmgVignette.classList.toggle('low-hp-pulse', lowHpActive);

    this.barFury.style.width = `${Math.min(100, player.fury || 0)}%`;
    const furyPill = this.root.querySelector('#btn-fury-melee');
    if (furyPill) {
      furyPill.style.borderColor = (player.fury || 0) >= 100 ? '#ffd447' : '';
    }
    if (this.lblAbility && this._lastAbilityDinoId !== player.id) {
      this._lastAbilityDinoId = player.id;
      this.lblAbility.innerHTML = `${renderSkillSvg(player.id, 18)} <span class="btn-label">Habilidade</span> <span class="kb-only">(Espaço)</span>`;
    }
    const cdPct = player.abilityMaxCooldown > 0
      ? Math.max(0, 100 * (1 - player.abilityCooldown / player.abilityMaxCooldown))
      : 100;
    const chargePct = Math.max(0, Math.min(100, player.abilityCharge ?? 100));
    this.barAbility.style.width = `${Math.min(cdPct, chargePct)}%`;
    const staminaVal = Math.max(0, Math.min(100, player.stamina ?? 100));
    this.barBullet.style.width = `${staminaVal}%`;
    this.barBullet.style.background = staminaVal < 35 ? '#f59e0b' : '#34d399';
    if (this.barAttack) {
      const atkMax = player.attackMaxCooldown || 1.25;
      const atkCd = Math.max(0, player.attackCooldown || 0);
      const atkPct = Math.max(0, Math.min(100, 100 * (1 - atkCd / atkMax)));
      this.barAttack.style.width = `${atkPct}%`;
      this.barAttack.style.background = atkCd <= 0.02 ? '#fb923c' : '#64748b';
    }
    if (this.elementEl) {
      const elemNames = { fire: '🔥 Fogo', ice: '❄️ Gelo', lightning: '⚡ Raio', poison: '☠️ Veneno' };
      this.elementEl.classList.toggle('hidden', !player.element);
      if (player.element) this.elementEl.textContent = elemNames[player.element] || `✨ ${player.element}`;
    }
    if (this.wantedEl) {
      const stars = Math.min(5, Math.floor(player.wantedStars || 0));
      this.wantedEl.classList.toggle('hidden', stars <= 0);
      if (stars > 0) this.wantedEl.textContent = `🚨 ${'★'.repeat(stars)}`;
    }

    if (this.statusPillsEl) {
      const activeList = StatusSystem.getActiveList(player);
      const invHtml = (player.invulnTimer || 0) > 0.15
        ? `<span class="status-badge" style="color:#7dd3fc;">✨ Imune ${player.invulnTimer.toFixed(1)}s</span>`
        : '';
      this.statusPillsEl.innerHTML = invHtml + activeList.map((st) => {
        const tm = st.permanentElement ? '' : ` ${st.timeLeft.toFixed(0)}s`;
        return `<span class="status-badge" style="color:${st.color};">${st.icon} ${st.name}${tm}</span>`;
      }).join('');
    }

    if (player.backpack?.slots?.length > 0) {
      this.lblBackpack.textContent = player.backpack.slots.map((id) => BACKPACK_ITEMS[id]?.icon || '📦').join(' ');
    } else {
      this.lblBackpack.textContent = 'Vazia';
    }

    this.comboEl.classList.toggle('hidden', combo <= 1);
    this.comboEl.innerHTML = `Combo: <strong>x${combo}</strong>`;

    this.mapBiomeName.textContent = biomeName;
    const progress = ((score % 1000) / 1000) * 100;
    const remainingPts = Math.max(0, Math.ceil((score + 1) / 1000) * 1000 - Math.floor(score));
    this.mapFill.style.width = `${Math.min(100, progress)}%`;
    this.mapNextPortal.textContent = `🌀 Portal em ${remainingPts} pts`;
  }

  setCameraLabel(label) {
    this.cameraEl.textContent = label;
  }

  showBanner(text, color = '#ff9a24', duration = 3.2) {
    this.bannerEl.textContent = text;
    this.bannerEl.style.borderColor = color;
    this.bannerEl.classList.remove('hidden');
    this.bannerTimer = duration;
  }

  showFloatText(text, color = '#ffd447') {
    const el = document.createElement('div');
    el.className = 'float-msg';
    el.style.color = color;
    el.textContent = text;
    this.floatsEl.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  showSubtitle(text) {
    this.narratorEl.textContent = `🎙️ ${text}`;
    this.narratorEl.classList.remove('hidden');
    this.subTimer = 2.6;
  }

  setSharedRolesHint(text) {
    this.sharedRolesEl.classList.toggle('hidden', !text);
    this.sharedRolesEl.textContent = text || '';
  }

  setChaserHud(active, distance, spec = null) {
    this.chaserEl.classList.toggle('hidden', !active);
    if (active) {
      const label = spec ? `${spec.name}` : 'Perseguidor';
      const pct = Math.max(0, Math.min(100, Math.round((distance / 8.6) * 100)));
      const urgency = distance < 3.5 ? '🚨 MUITO PERTO!' : (distance < 6.0 ? '🏃 Corra!' : '💨 Afastando');
      this.chaserEl.style.color = distance < 3.5 ? '#ff4757' : (distance < 6.0 ? '#facc15' : '#4ade80');
      this.chaserEl.textContent = `🐾 CAÇADOR: ${label} • ${distance.toFixed(1)}m (${pct}% • ${urgency})`;
    }
  }

  setPredatorIntroHud(info, onSkip = null) {
    if (!this.predIntroEl) return;
    const active = Boolean(info && info.spec);
    this.predIntroEl.classList.toggle('hidden', !active);
    if (!active) return;
    const { spec, remaining } = info;
    this.predIntroEl.style.borderColor = spec.accent || '#fb923c';
    this.predIntroArch.textContent = `🐾 ${spec.archetype || 'Predador Alfa'} • Espaço/W/Clique pula`;
    this.predIntroName.textContent = spec.name;
    this.predIntroTitle.textContent = spec.title;
    this.predIntroTitle.style.color = spec.accent || '#fb923c';
    this.predIntroLore.textContent = spec.lore || '';
    this.predIntroTip.textContent = `💡 ${spec.counterTip || ''}`;
    this.predIntroSec.textContent = Number(remaining || 0).toFixed(1);
    if (onSkip) {
      const handleSkip = (e) => {
        e.stopPropagation();
        onSkip();
      };
      this.predIntroSkip.onclick = handleSkip;
      this.predIntroEl.onclick = handleSkip;
    }
  }

  setBossHud(boss) {
    this.bossWrap.classList.toggle('hidden', !boss);
    if (!boss) {
      this._lastBossHudKey = null;
      return;
    }
    const hudKey = `${boss.id}:${boss.lastObsType || ''}`;
    if (this._lastBossHudKey !== hudKey) {
      this._lastBossHudKey = hudKey;
      const obsBadge = boss.lastObsType ? ` ${renderBossObsSvg(boss.lastObsType, 20)}` : '';
      this.bossName.innerHTML = `👑 ${boss.name}${obsBadge}`;
    }
    if (this.bossWeakness) {
      const w = boss.weakness;
      this.bossWeakness.textContent = w ? `Fraqueza: ${w.icon} ${w.label}` : '';
    }
    this.bossHpText.textContent = `${boss.currentHp}/${boss.maxHp}`;
    this.bossHpFill.style.width = `${(boss.currentHp / boss.maxHp) * 100}%`;
  }

  setUfoHud(active, timeLeft, progress) {
    this.ufoWrap.classList.toggle('hidden', !active);
    if (active) {
      this.ufoLabel.textContent = `🛸 FUGA DO OVNI (${timeLeft.toFixed(1)}s) — Quebre o feixe!`;
      this.ufoFill.style.width = `${Math.min(100, progress)}%`;
    }
  }

  tickTimers(dt) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerEl.classList.add('hidden');
    }
    if (this.subTimer > 0) {
      this.subTimer -= dt;
      if (this.subTimer <= 0) this.narratorEl.classList.add('hidden');
    }
  }

  showPause(show) {
    this.pauseOverlay.classList.toggle('hidden', !show);
  }

  showSpotlight({ icon = '⚡', title = 'Dica', desc = '', selector = null, accent = '#38bdf8', onDismiss = null }) {
    if (!this.spotlightOverlay) return;
    if (this._spotlightFocusEl) {
      this._spotlightFocusEl.classList.remove('spotlight-focus-ring');
      this._spotlightFocusEl = null;
    }
    if (selector) {
      const target = this.root.querySelector(selector);
      if (target) {
        target.classList.add('spotlight-focus-ring');
        this._spotlightFocusEl = target;
      }
    }
    this.spotlightIcon.textContent = icon;
    this.spotlightTitle.textContent = title;
    this.spotlightDesc.textContent = desc;
    this.spotlightCard.style.borderColor = accent;
    this._onSpotlightDismiss = onDismiss || null;
    this.spotlightOverlay.classList.remove('hidden');

    const close = () => this.hideSpotlight(true);
    this.spotlightOverlay.onclick = close;
    this.spotlightDismiss.onclick = (e) => {
      e.stopPropagation();
      close();
    };
  }

  hideSpotlight(triggerCallback = false) {
    if (this._spotlightFocusEl) {
      this._spotlightFocusEl.classList.remove('spotlight-focus-ring');
      this._spotlightFocusEl = null;
    }
    if (this.spotlightOverlay) {
      this.spotlightOverlay.classList.add('hidden');
      this.spotlightOverlay.onclick = null;
    }
    const cb = triggerCallback ? this._onSpotlightDismiss : null;
    this._onSpotlightDismiss = null;
    if (cb) cb();
  }

  showPhotoMode(show) {
    this.photoOverlay.classList.toggle('hidden', !show);
  }

  showMerchant() {
    this.merchantOverlay.classList.remove('hidden');
  }

  hideMerchant() {
    this.merchantOverlay.classList.add('hidden');
  }

  isMerchantOpen() {
    return Boolean(this.merchantOverlay && !this.merchantOverlay.classList.contains('hidden'));
  }

  showGameOver({ title = 'GAME OVER!', causeLabel = '', avoidTip = '', score, hiScore, isNewRecord, distance, eggs, maxCombo, dinoId }) {
    this.root.querySelector('#go-title').textContent = title;
    const causeBox = this.root.querySelector('#go-cause-box');
    const causeText = this.root.querySelector('#go-cause-text');
    const avoidEl = this.root.querySelector('#go-avoid-tip');
    if (causeBox && causeText && avoidEl) {
      causeBox.classList.toggle('hidden', !causeLabel);
      causeText.textContent = causeLabel || '💥 Fim da corrida!';
      avoidEl.textContent = avoidTip || '💡 Dica: Observe os avisos acima dos obstáculos!';
    }
    this.root.querySelector('#go-score').textContent = formatScoreValue(score);
    this.root.querySelector('#go-hi').textContent = formatScoreValue(hiScore);
    this.root.querySelector('#go-dist').textContent = `${Math.floor(distance)} m`;
    this.root.querySelector('#go-eggs').textContent = `${eggs} / x${maxCombo}`;
    this.root.querySelector('#go-record-badge').classList.toggle('hidden', !isNewRecord);
    const spec = getDinoSpec(dinoId);
    this.root.querySelector('#go-fact').textContent = `💡 Sabia? ${spec.fact.pt}`;
    this.gameOverOverlay.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverOverlay.classList.add('hidden');
  }
}
