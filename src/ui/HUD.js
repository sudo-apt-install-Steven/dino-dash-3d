// HUD completo em partida: placar HI 00194  00070, barras de Fúria/Habilidade/Bullet-Time,
// mochila, mapa do tesouro, Boss HP, OVNI fuga, Papéis Compartilhados, Touch, Pausa e Game Over.
import { BACKPACK_ITEMS } from '../systems/Items.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { StatusSystem } from '../systems/StatusSystem.js';
import { Save } from '../systems/Save.js';
import { OrientationManager } from '../systems/OrientationManager.js';
import { renderSkillSvg, renderEggSvg, renderBossObsSvg } from './SvgIcons.js';

export function formatScoreValue(val) {
  return String(Math.max(0, Math.floor(val))).padStart(5, '0');
}

const FIRST_TIME_CONTEXT_HINTS = {
  boss_attack_q: {
    icon: '⚔️',
    title: 'Chefe Vulnerável!',
    pcText: 'Pressione [Q] para atacar o Chefe quando ele abrir a guarda!',
    mobText: 'Toque no botão [⚔️ Atq] em destaque para causar dano ao Chefe!'
  },
  water_breathe: {
    icon: '🫧',
    title: 'Mergulho & Oxigênio',
    pcText: 'Seu O₂ cai debaixo d’água! Suba com [W/↑] ou pegue Bolhas 🫧 para respirar.',
    mobText: 'Toque em [🫧 Respirar] ou suba à superfície para recuperar Oxigênio!'
  },
  mp_revive_v: {
    icon: '💖',
    title: 'Aliado Caído!',
    pcText: 'Pressione [V] perto do aliado para revivê-lo (custa 1 Vida ou 1 Escudo).',
    mobText: 'Toque no botão [💖 Reviver] para levantar seu aliado na pista!'
  },
  event_warning: {
    icon: '☄️',
    title: 'Evento Dinâmico na Pista!',
    pcText: 'Fique atento aos avisos visuais e sonoros: cada evento muda os perigos e bônus!',
    mobText: 'Evento começando! Observe os sinais na pista para desviar e coletar bônus!'
  }
};

export class HUD {
  constructor(rootEl, callbacks = {}) {
    this.root = rootEl;
    this.callbacks = callbacks;
    this.bannerTimer = 0;
    this.subTimer = 0;
    this.contextHintTimer = 0;
    this.isEditingTouchLayout = false;
    this._spotlightQueue = [];
    this._shownContextHints = new Set();
    this._contextualTouchState = {
      canAttackBoss: false,
      reviveTargetNick: null,
      canBreathe: false,
      attackCooldownPct: 100,
      oxygenPct: 100
    };
    this._render();
  }

  _render() {
    this.root.innerHTML = `
      <div class="damage-vignette hidden" id="dmg-vignette"></div>
      <div class="submerged-hud-tint hidden" id="hud-submerged-tint"></div>
      <div class="edge-flash-vignette" id="edge-flash"></div>
      <div class="hud-tooltip hidden" id="hud-tooltip"></div>

      <div class="hud-top">
        <div class="hud-pills">
          <div class="dino-logo" style="font-size: 1.25rem;">DINO <span class="dash-accent">DASH 3D</span></div>
          <div class="hud-pill" id="hud-camera" style="cursor:pointer; pointer-events:auto;" data-tip="Troca a câmera de visão (Tecla C ou toque)."><span class="kb-only">Câmera: </span><span class="mob-only">📷 </span><strong>3ª Pessoa</strong></div>
          <div class="hud-pill" id="hud-speed" data-tip="Velocidade atual da corrida.">Vel: <strong>1.0x</strong></div>
          <div class="hud-pill" id="hud-eggs" data-tip="Total de Ovos guardados para Loja e Dinossauros.">${renderEggSvg('dourado', 18)} <strong>0</strong></div>
          <div class="hud-pill" id="hud-crystals" style="color:#7dd3fc; border-color:#38bdf8;" data-tip="Diamantes: servem para Catalisador Gacha (3 💎), Forja de Mutações, Reroll na Loja (2 💎) e Revive (2 💎).">💎 <strong>0</strong></div>
          <div class="hud-pill hidden" id="hud-combo" style="color:#ffd447;" data-tip="Multiplicador por quase-colisões e pisões seguidos.">Combo: <strong>x1</strong></div>
          <div class="hud-pill hidden" id="hud-mp-rank" style="color:#fde047; border-color:#ffd447;" data-tip="Sua posição atual contra outros jogadores.">🏆 #1</div>
          <div class="hud-pill hidden" id="hud-ctrl-status" style="color:#86efac; border-color:#22c55e; display:inline-flex; align-items:center; gap:6px;" data-tip="Indicador de Controle Celular conectado em tempo real.">
            <span class="hud-ctrl-led" id="hud-ctrl-led"></span>
            <span id="hud-ctrl-text">📱 Controle</span>
          </div>
          <div class="hud-pill hidden" id="hud-element" style="color:#38bdf8;" data-tip="Elemento ativo: combine com outro ou acerte a fraqueza do Chefe!">✨ Nenhum</div>
          <div class="hud-pill hidden" id="hud-wanted" style="color:#ff4757;" data-tip="Nível de Caçada: aumenta recompensa e atenção de predadores.">🚨 ★</div>
        </div>

        <div class="hud-top-right" style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
          <div class="hud-top-actions" style="display:flex; gap:8px; align-items:center;">
            <button class="chunky-btn secondary mob-only" id="btn-mob-rotate" style="padding:5px 8px; font-size:0.75rem;" data-tip="Deitar / alternar tela em Paisagem no celular.">🔄</button>
            <button class="chunky-btn secondary mob-only" id="btn-mob-cam" style="padding:5px 8px; font-size:0.75rem;" data-tip="Trocar ângulo de câmera (Tecla C).">📷</button>
            <button class="chunky-btn secondary mob-only" id="btn-mob-edit-hud" style="padding:5px 8px; font-size:0.75rem;" data-tip="Editar tamanho, modo canhoto e posição dos botões touch.">🛠️</button>
            <button class="chunky-btn secondary" id="btn-guide" style="padding:5px 10px; font-size:0.75rem;" data-tip="Abre o Guia Visual de obstáculos, status e chefes.">📖<span class="btn-label"> Guia</span></button>
            <button class="chunky-btn secondary" id="btn-clip-rec" style="padding:5px 10px; font-size:0.75rem;" data-tip="Gravar clipe curto da corrida (.webm).">🎥<span class="btn-label"> Clipe</span></button>
            ${import.meta.env.DEV ? `<button class="chunky-btn secondary ${Save.data.devMode ? '' : 'hidden'}" id="btn-debug" style="padding:5px 10px; font-size:0.75rem;" data-tip="Painel de Depuração e Testes (F9).">🛠️<span class="btn-label"> Debug</span></button>` : ''}
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
      <div class="context-hint-toast hidden" id="hud-context-hint"></div>
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
            <div class="meter-pill hidden" id="hud-oxygen-pill" data-tip="Oxigênio submerso: suba à tona ou pegue Bolhas 🫧 / Máscara Abissal!">
              <span>🫧 <span class="btn-label">O₂</span> <strong id="lbl-oxygen">100%</strong></span>
              <div class="meter-bar"><div class="meter-fill" id="bar-oxygen" style="width:100%; background:#38bdf8;"></div></div>
            </div>
            <div class="meter-pill hidden" id="hud-companion-pill" data-tip="Filhote Companheiro ativo: coleta ovos/bolhas e dispara bônus na corrida e via Roda [X].">
              <span id="lbl-companion">🐾 Pet</span>
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
            <div class="meter-pill" id="btn-attack-melee" style="cursor:pointer; pointer-events:auto;" data-tip="Ataque rápido (Q): corta cactos, corais, espinhos e acerta chefes!">
              <span>⚔️ <span class="btn-label">Ataque</span> <span class="kb-only">(Q)</span></span>
              <div class="meter-bar"><div class="meter-fill" id="bar-attack" style="width:100%; background:#f97316;"></div></div>
            </div>
            <div class="meter-pill" data-tip="Estamina Física (Shift=Foco / Pulo no ar=58 / Ataque Q=20): recarrega no chão.">
              <span>🏃 <span class="btn-label">Estamina</span> <span class="kb-only">(Shift/2x⬆)</span></span>
              <div class="meter-bar"><div class="meter-fill" id="bar-bullet" style="width:100%; background:#34d399;"></div></div>
            </div>
            <div class="meter-pill" id="hud-backpack" style="cursor:pointer; pointer-events:auto;" data-tip="Mochila (E): clique ou aperte E para usar o próximo item guardado.">
              🎒 <span class="kb-only">(E) </span><strong id="lbl-backpack">Vazia</strong>
            </div>
            <div class="meter-pill radial-pill-btn" id="btn-radial-wheel" data-tip="Roda Tática (X): pausa rapidamente a corrida para acionar Habitat, Mochila, Mascote ou Foco!">
              🧭 <span class="btn-label">Roda</span> <strong id="lbl-radial-cd">(X)</strong>
            </div>
            <div class="meter-pill hidden transmute-pill" id="btn-transmute-mode" data-tip="Troca rápida de Habitat em Híbridos & Anfíbios!">
              🔄 <span id="lbl-transmute-mode">Terra</span>
            </div>
            <div class="meter-pill hidden" id="btn-mp-revive" style="cursor:pointer; pointer-events:auto; border-color:#34d399; background:rgba(6, 78, 59, 0.85);" data-tip="Reviver amigo caído no Multiplayer (V): salva o grupo na pista!">
              💖 <strong id="lbl-mp-revive">Reviver (V)</strong>
            </div>
          </div>
        </div>

        <div class="controls-hint" id="hud-controls-hint">
          <kbd>W</kbd>/<kbd>↑</kbd> Pular (segure=alto) • <kbd>S</kbd>/<kbd>↓</kbd> Abaixar/Mergulhar • <kbd>A</kbd>/<kbd>D</kbd> Faixas • <kbd>Q</kbd> Ataque • <kbd>Espaço</kbd> Habilidade • <kbd>F</kbd> Fúria • <kbd>X</kbd> Roda Tática • <kbd>C</kbd> Câmera
        </div>
      </div>

      <!-- Controles touch para celular (Divisão ergonômica: esquerda movimento/abaixar/roda/item/respirar vs direita pular/hab/atq/fúria/troca/reviver; inversível no modo canhoto) -->
      <div class="touch-controls" id="touch-controls">
        <div class="touch-cluster touch-cluster-left" id="touch-cluster-left">
          <button class="touch-btn touch-dpad-only" data-tact="left" aria-label="Faixa Esquerda"><span class="touch-btn-ico">◀</span><span class="touch-btn-lbl">Esq</span></button>
          <button class="touch-btn touch-dpad-only" data-tact="right" aria-label="Faixa Direita"><span class="touch-btn-ico">▶</span><span class="touch-btn-lbl">Dir</span></button>
          <button class="touch-btn touch-dpad-only" data-tact="duck" aria-label="Abaixar ou Mergulhar"><span class="touch-btn-ico" id="touch-duck-ico">▼</span><span class="touch-btn-lbl" id="touch-duck-lbl">Baixo</span></button>
          <button class="touch-btn touch-btn-action touch-btn-radial" id="touch-radial-btn" aria-label="Roda Tática X"><span class="touch-btn-ico">🧭</span><span class="touch-btn-lbl">Roda</span></button>
          <button class="touch-btn touch-btn-action hidden touch-btn-item" id="touch-item-btn" data-tact="item" aria-label="Usar Item da Mochila"><span class="touch-btn-ico" id="touch-item-ico">🎒</span><span class="touch-btn-lbl">Item</span></button>
          <button class="touch-btn touch-btn-action hidden touch-btn-breathe" id="touch-breathe-btn" data-tact="breathe" aria-label="Respirar"><span class="touch-btn-ico">🫧</span><span class="touch-btn-lbl" id="touch-breathe-lbl">Respirar</span></button>
        </div>
        <div class="touch-cluster touch-cluster-right" id="touch-cluster-right">
          <button class="touch-btn touch-dpad-only" data-tact="jump" aria-label="Pular"><span class="touch-btn-ico">▲</span><span class="touch-btn-lbl">Pulo</span></button>
          <button class="touch-btn touch-btn-action touch-btn-ability" id="touch-ability-btn" data-tact="ability" aria-label="Habilidade Especial"><span class="touch-btn-ico">⚡</span><span class="touch-btn-lbl" id="touch-ability-lbl">Hab</span></button>
          <button class="touch-btn touch-btn-action touch-btn-attack" id="touch-attack-btn" data-tact="attack" aria-label="Ataque Rápido">
            <span class="touch-btn-ico">⚔️</span>
            <span class="touch-btn-lbl" id="touch-attack-lbl">Atq</span>
            <span class="touch-cd-track" aria-hidden="true"><span class="touch-cd-fill" id="touch-attack-cd-fill" style="width:100%;"></span></span>
          </button>
          <button class="touch-btn touch-btn-action hidden touch-btn-fury" id="touch-fury-btn" data-tact="fury" aria-label="Modo Fúria"><span class="touch-btn-ico">🔥</span><span class="touch-btn-lbl">Fúria!</span></button>
          <button class="touch-btn touch-btn-action hidden touch-btn-transmute" id="touch-transmute-btn" data-tact="transmute" aria-label="Trocar Habitat"><span class="touch-btn-ico">🔄</span><span class="touch-btn-lbl" id="touch-transmute-lbl">Troca</span></button>
          <button class="touch-btn touch-btn-action hidden touch-btn-revive" id="touch-revive-btn" data-tact="revive" aria-label="Reviver Aliado"><span class="touch-btn-ico">💖</span><span class="touch-btn-lbl" id="touch-revive-lbl">Reviver</span></button>
        </div>
      </div>

      <!-- Roda Tática [X] (Pause-on-Open Radial Action Wheel) -->
      <div class="radial-wheel-overlay hidden" id="hud-radial-wheel">
        <div class="radial-wheel-stage" id="radial-wheel-stage">
          <button class="radial-sector radial-north" data-rslot="habitat" id="rad-opt-habitat">
            <span>🔄 Habitat</span>
            <small id="rad-sub-habitat">Híbrido/Mergulho</small>
            <span class="radial-sector-key">[1 / ↑]</span>
          </button>
          <button class="radial-sector radial-east" data-rslot="backpack" id="rad-opt-backpack">
            <span>🎒 Mochila</span>
            <small id="rad-sub-backpack">Vazia</small>
            <span class="radial-sector-key">[2 / →]</span>
          </button>
          <button class="radial-sector radial-south" data-rslot="companion" id="rad-opt-companion">
            <span>🐾 Mascote</span>
            <small id="rad-sub-companion">Sem Pet</small>
            <span class="radial-sector-key">[3 / ↓]</span>
          </button>
          <button class="radial-sector radial-west" data-rslot="focus" id="rad-opt-focus">
            <span>⚡ Foco Tático</span>
            <small id="rad-sub-focus">+Carga / +O₂</small>
            <span class="radial-sector-key">[4 / ←]</span>
          </button>
          <button class="radial-center-btn" id="radial-cancel">
            <span>⏸ RODA [X]</span>
            <small style="color:#d8c2a6;">Esc = Voltar</small>
          </button>
        </div>
      </div>

      <!-- Barra Flutuante de Edição dos Botões Touch (Player no Celular) -->
      <div class="hud-layout-editor-bar chunky-panel hidden" id="hud-touch-editor-bar">
        <strong style="color:#ffd447; font-size:0.8rem;">🛠️ Editar Botões Touch (Arraste esquerda/direita!)</strong>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:center;">
          <label style="font-size:0.74rem; display:flex; align-items:center; gap:5px;">
            Tamanho: <input type="range" id="hud-touch-scale" min="80" max="135" value="100" style="width:84px; accent-color:#f59e0b;" />
          </label>
          <label style="font-size:0.74rem; display:flex; align-items:center; gap:5px;">
            Opacidade: <input type="range" id="hud-touch-opacity" min="50" max="100" value="92" style="width:84px; accent-color:#f59e0b;" />
          </label>
          <label style="font-size:0.74rem; display:flex; align-items:center; gap:5px; cursor:pointer;" data-tip="Inverte os lados dos botões para jogadores canhotos.">
            <input type="checkbox" id="hud-touch-lefthanded" /> 🤚 Modo Canhoto
          </label>
          <button class="chunky-btn secondary" id="hud-touch-reset" style="padding:5px 10px; font-size:0.74rem;">🔄 Padrão</button>
          <button class="chunky-btn" id="hud-touch-done" style="padding:5px 12px; font-size:0.74rem;">✅ Salvar</button>
        </div>
      </div>

      <!-- Pause Overlay -->
      <div class="overlay-center hidden" id="pause-overlay">
        <div class="chunky-panel gameover-card">
          <h2>⏸ PAUSADO</h2>
          <button class="chunky-btn" id="btn-resume">Continuar</button>
          <button class="chunky-btn secondary mob-only" id="btn-pause-rotate">🔄 Deitar / Alternar Paisagem</button>
          <button class="chunky-btn secondary" id="btn-pause-cam">📷 Trocar Câmera (C)</button>
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
          <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:6px; font-size:0.8rem; color:#cbd5e1; cursor:pointer;">
            <input type="checkbox" id="spotlight-dont-show" style="accent-color:#38bdf8;" />
            <span>Não mostrar mais popups de descoberta</span>
          </label>
          <button class="chunky-btn" id="spotlight-dismiss" style="margin-top:6px;">Entendi! (Espaço / Clique)</button>
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
        <div class="chunky-panel" style="padding:12px 18px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; pointer-events:auto;">
          <strong>📷 Modo Foto / Cinema</strong>
          <button class="chunky-btn orange" id="photo-snap">📸 Salvar Foto PNG</button>
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
          <div id="go-crystal-box" class="item-card hidden" style="padding:10px 12px; border-color:#38bdf8; background:rgba(8, 47, 73, 0.58); display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="text-align:left;">
              <strong style="color:#7dd3fc; font-size:0.9rem;">💎 Renascimento de Cristal</strong>
              <div style="font-size:0.78rem; color:#bae6fd;" id="go-crystal-desc">Volte já na pista com +2 ❤️ e escudo temporário (1x por corrida).</div>
            </div>
            <button class="chunky-btn" id="btn-go-crystal-revive" style="padding:7px 14px; font-size:0.84rem; background:linear-gradient(180deg,#0284c7,#0369a1); border-color:#7dd3fc;">💖 Renascer (2 💎)</button>
          </div>
          <div id="go-gacha-box" class="item-card hidden" style="padding:10px 12px; border-color:#a855f7; background:rgba(46, 16, 101, 0.55); display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="text-align:left;">
              <strong style="color:#f5d0fe; font-size:0.9rem;">🦴 Lootbox Fóssil Conquistada!</strong>
              <div style="font-size:0.78rem; color:#ddd6fe;" id="go-gacha-text">+1 Caixa Fóssil pelo desempenho</div>
            </div>
            <button class="chunky-btn orange" id="btn-go-gacha" style="padding:7px 14px; font-size:0.84rem;">🎲 Abrir Agora</button>
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
    this.crystalsEl = q('#hud-crystals strong');
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
    this.submergedTint = q('#hud-submerged-tint');
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
    this.touchClusterLeft = q('#touch-cluster-left');
    this.touchClusterRight = q('#touch-cluster-right');
    this.touchEditorBar = q('#hud-touch-editor-bar');
    this.ctrlStatusPill = q('#hud-ctrl-status');
    this.ctrlLed = q('#hud-ctrl-led');
    this.ctrlText = q('#hud-ctrl-text');
    this.hudBottom = q('#hud-bottom-bar');

    this.pauseOverlay = q('#pause-overlay');
    this.spotlightOverlay = q('#hud-spotlight-overlay');
    this.spotlightCard = q('#spotlight-card');
    this.spotlightIcon = q('#spotlight-icon');
    this.spotlightTitle = q('#spotlight-title');
    this.spotlightDesc = q('#spotlight-desc');
    this.spotlightDismiss = q('#spotlight-dismiss');
    this.spotlightDontShow = q('#spotlight-dont-show');
    this._spotlightFocusEl = null;
    this._onSpotlightDismiss = null;
    this.pillFury = q('#btn-fury-melee');
    this.pillAbility = q('#lbl-ability')?.closest('.meter-pill') || null;
    this.pillAttack = q('#btn-attack-melee');
    this.pillBullet = q('#bar-bullet')?.closest('.meter-pill') || null;
    this.mpReviveBtn = q('#btn-mp-revive');
    this.mpReviveLbl = q('#lbl-mp-revive');
    this.oxygenPill = q('#hud-oxygen-pill');
    this.oxygenLbl = q('#lbl-oxygen');
    this.oxygenBar = q('#bar-oxygen');
    this.companionPill = q('#hud-companion-pill');
    this.companionLbl = q('#lbl-companion');
    this.radialPillBtn = q('#btn-radial-wheel');
    this.radialCdLbl = q('#lbl-radial-cd');
    this.touchRadialBtn = q('#touch-radial-btn');
    this.radialOverlay = q('#hud-radial-wheel');
    this.transmuteBtn = q('#btn-transmute-mode');
    this.transmuteLbl = q('#lbl-transmute-mode');
    this.touchTransmuteBtn = q('#touch-transmute-btn');
    this.touchTransmuteLbl = q('#touch-transmute-lbl');
    this.touchFuryBtn = q('#touch-fury-btn');
    this.touchItemBtn = q('#touch-item-btn');
    this.touchItemIco = q('#touch-item-ico');
    this.touchAttackBtn = q('#touch-attack-btn');
    this.touchAttackLbl = q('#touch-attack-lbl');
    this.touchAttackCdFill = q('#touch-attack-cd-fill');
    this.touchAbilityBtn = q('#touch-ability-btn');
    this.touchAbilityLbl = q('#touch-ability-lbl');
    this.touchReviveBtn = q('#touch-revive-btn');
    this.touchReviveLbl = q('#touch-revive-lbl');
    this.touchBreatheBtn = q('#touch-breathe-btn');
    this.touchBreatheLbl = q('#touch-breathe-lbl');
    this.touchLeftHandedInput = q('#hud-touch-lefthanded');
    this.contextHintEl = q('#hud-context-hint');
    this.touchDuckBtn = q('[data-tact="duck"]');
    this.touchDuckIco = q('#touch-duck-ico');
    this.touchDuckLbl = q('#touch-duck-lbl');
    this.goCrystalBox = q('#go-crystal-box');
    this.goCrystalDesc = q('#go-crystal-desc');
    this.goCrystalReviveBtn = q('#btn-go-crystal-revive');
    this.goGachaBox = q('#go-gacha-box');
    this.goGachaText = q('#go-gacha-text');
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
    this.root.querySelector('#btn-go-gacha')?.addEventListener('click', () => this.callbacks.onOpenGacha?.());
    this.root.querySelector('#btn-go-crystal-revive')?.addEventListener('click', () => {
      if (this._onCrystalRevive) this._onCrystalRevive();
      else this.callbacks.onCrystalRevive?.();
    });
    this.root.querySelector('#btn-go-menu').addEventListener('click', () => this.callbacks.onGoMenu?.());
    this.root.querySelector('#btn-mp-revive')?.addEventListener('click', () => this.callbacks.onMpRevive?.());
    this.root.querySelector('#btn-transmute-mode')?.addEventListener('click', () => this.callbacks.onTransmute?.());
    this.root.querySelector('#btn-radial-wheel')?.addEventListener('click', () => this.callbacks.onToggleRadialWheel?.());
    this.root.querySelector('#touch-radial-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onToggleRadialWheel?.();
    });
    this.root.querySelector('#radial-cancel')?.addEventListener('click', () => this.callbacks.onToggleRadialWheel?.(false));
    this.root.querySelector('#hud-radial-wheel')?.addEventListener('click', (e) => {
      if (e.target.id === 'hud-radial-wheel') this.callbacks.onToggleRadialWheel?.(false);
    });
    this.root.querySelectorAll('[data-rslot]').forEach((btn) => {
      btn.addEventListener('click', () => this.callbacks.onSelectRadialAction?.(btn.getAttribute('data-rslot')));
    });
    this.root.querySelector('#btn-pause').addEventListener('click', () => this.callbacks.onTogglePause?.());
    this.root.querySelector('#btn-resume').addEventListener('click', () => this.callbacks.onTogglePause?.());
    this.root.querySelector('#btn-mob-rotate')?.addEventListener('click', () => OrientationManager.toggleForceLandscape());
    this.root.querySelector('#btn-mob-cam')?.addEventListener('click', () => this.callbacks.onCycleCamera?.());
    this.root.querySelector('#btn-pause-rotate')?.addEventListener('click', () => OrientationManager.toggleForceLandscape());
    this.root.querySelector('#btn-mob-edit-hud')?.addEventListener('click', () => this.toggleTouchLayoutEditor());
    this.root.querySelector('#hud-touch-done')?.addEventListener('click', () => this.toggleTouchLayoutEditor(false));
    this.root.querySelector('#hud-touch-reset')?.addEventListener('click', () => {
      Save.data.settings.mobileHudLayout = { scale: 1.0, opacity: 0.92, leftHanded: false, positions: {} };
      if (Save.data.settings.controllerLayout) Save.data.settings.controllerLayout.leftHanded = false;
      Save.save();
      this._applyMobileTouchLayout();
    });
    this.root.querySelector('#hud-touch-scale')?.addEventListener('input', (e) => {
      if (!Save.data.settings.mobileHudLayout) Save.data.settings.mobileHudLayout = { scale: 1, opacity: 0.92, leftHanded: false, positions: {} };
      Save.data.settings.mobileHudLayout.scale = Number(e.target.value) / 100;
      Save.save();
      this._applyMobileTouchLayout();
    });
    this.root.querySelector('#hud-touch-opacity')?.addEventListener('input', (e) => {
      if (!Save.data.settings.mobileHudLayout) Save.data.settings.mobileHudLayout = { scale: 1, opacity: 0.92, leftHanded: false, positions: {} };
      Save.data.settings.mobileHudLayout.opacity = Number(e.target.value) / 100;
      Save.save();
      this._applyMobileTouchLayout();
    });
    this.root.querySelector('#hud-touch-lefthanded')?.addEventListener('change', (e) => {
      const isLeft = !!e.target.checked;
      if (!Save.data.settings.mobileHudLayout) Save.data.settings.mobileHudLayout = { scale: 1, opacity: 0.92, leftHanded: false, positions: {} };
      Save.data.settings.mobileHudLayout.leftHanded = isLeft;
      if (Save.data.settings.controllerLayout) Save.data.settings.controllerLayout.leftHanded = isLeft;
      Save.save();
      this._applyMobileTouchLayout();
    });
    this.root.querySelector('#btn-pause-cam')?.addEventListener('click', () => this.callbacks.onCycleCamera?.());
    this.root.querySelector('#btn-pause-restart').addEventListener('click', () => this.callbacks.onRequestRestart?.());
    this.root.querySelector('#btn-confirm-restart').addEventListener('click', () => this.callbacks.onConfirmRestart?.());
    this.root.querySelector('#btn-cancel-restart').addEventListener('click', () => this.callbacks.onCancelRestart?.());
    this.root.querySelector('#btn-pause-menu').addEventListener('click', () => this.callbacks.onGoMenu?.());
    this.root.querySelector('#btn-photo-mode').addEventListener('click', () => this.callbacks.onTogglePhoto?.());
    this.root.querySelector('#btn-debug')?.addEventListener('click', () => this.callbacks.onOpenDebug?.());
    this.root.querySelector('#btn-guide').addEventListener('click', () => this.callbacks.onOpenGuide?.());
    this.root.querySelector('#tut-skip').addEventListener('click', () => this.callbacks.onSkipTutorial?.());
    this.root.querySelector('#btn-clip-rec').addEventListener('click', () => this.callbacks.onRecordClip?.());
    this.root.querySelector('#btn-fury-melee')?.addEventListener('click', () => this.callbacks.onTriggerFury?.());
    this.root.querySelector('#btn-attack-melee').addEventListener('click', () => this.callbacks.onBasicAttack?.());
    this.root.querySelector('#hud-camera')?.addEventListener('click', () => this.callbacks.onCycleCamera?.());
    this.root.querySelector('#photo-snap')?.addEventListener('click', () => this.callbacks.onCapturePhoto?.());
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
        if (this.isEditingTouchLayout) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          navigator.vibrate?.(10);
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'HAPTIC_IMPACT', payload: { style: 'light' } }));
        } catch {}
        this.callbacks.onTouchAction?.(act, true);
      });
      const release = () => {
        if (this.isEditingTouchLayout) return;
        this.callbacks.onTouchAction?.(act, false);
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });

    this._bindTouchClusterDrag(this.touchClusterLeft, 'left');
    this._bindTouchClusterDrag(this.touchClusterRight, 'right');
    this._applyMobileTouchLayout();
  }

  _bindTouchClusterDrag(clusterEl, key) {
    if (!clusterEl) return;
    let dragging = false;
    let pid = null;
    let startPt = null;
    let startOffset = { dx: 0, dy: 0 };

    clusterEl.addEventListener('pointerdown', (e) => {
      if (!this.isEditingTouchLayout) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      pid = e.pointerId;
      startPt = OrientationManager.mapPointerCoords(e.clientX, e.clientY);
      const saved = Save.data.settings?.mobileHudLayout?.positions?.[key] || { dx: 0, dy: 0 };
      startOffset = { dx: saved.dx || 0, dy: saved.dy || 0 };
      clusterEl.setPointerCapture?.(e.pointerId);
    });

    clusterEl.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pid || !this.isEditingTouchLayout) return;
      const pt = OrientationManager.mapPointerCoords(e.clientX, e.clientY);
      const dx = Math.max(-140, Math.min(140, Math.round(startOffset.dx + (pt.x - startPt.x))));
      const dy = Math.max(-160, Math.min(80, Math.round(startOffset.dy + (pt.y - startPt.y))));
      if (!Save.data.settings.mobileHudLayout) Save.data.settings.mobileHudLayout = { scale: 1, opacity: 0.92, positions: {} };
      if (!Save.data.settings.mobileHudLayout.positions) Save.data.settings.mobileHudLayout.positions = {};
      Save.data.settings.mobileHudLayout.positions[key] = { dx, dy };
      this._applyMobileTouchLayout();
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      pid = null;
      Save.save();
    };
    clusterEl.addEventListener('pointerup', endDrag);
    clusterEl.addEventListener('pointercancel', endDrag);
  }

  _applyMobileTouchLayout() {
    const cfg = Save.data.settings?.mobileHudLayout || {};
    const scale = Math.max(0.8, Math.min(1.35, Number(cfg.scale || 1)));
    const opacity = Math.max(0.5, Math.min(1.0, Number(cfg.opacity ?? 0.92)));
    const leftHanded = !!(cfg.leftHanded ?? Save.data.settings?.controllerLayout?.leftHanded);
    this.touchControls?.classList.toggle('touch-left-handed', leftHanded);
    const applyCluster = (el, key, origin) => {
      if (!el) return;
      const pos = cfg.positions?.[key] || { dx: 0, dy: 0 };
      el.style.transformOrigin = origin;
      el.style.transform = `translate(${pos.dx || 0}px, ${pos.dy || 0}px) scale(${scale})`;
      el.style.opacity = String(opacity);
    };
    applyCluster(this.touchClusterLeft, 'left', leftHanded ? 'bottom right' : 'bottom left');
    applyCluster(this.touchClusterRight, 'right', leftHanded ? 'bottom left' : 'bottom right');

    const scIn = this.root.querySelector('#hud-touch-scale');
    const opIn = this.root.querySelector('#hud-touch-opacity');
    if (scIn) scIn.value = String(Math.round(scale * 100));
    if (opIn) opIn.value = String(Math.round(opacity * 100));
    if (this.touchLeftHandedInput) this.touchLeftHandedInput.checked = leftHanded;
  }

  toggleTouchLayoutEditor(force = null) {
    this.isEditingTouchLayout = force !== null ? !!force : !this.isEditingTouchLayout;
    this.touchControls?.classList.toggle('editing-touch-layout', this.isEditingTouchLayout);
    this.touchEditorBar?.classList.toggle('hidden', !this.isEditingTouchLayout);
    if (!this.isEditingTouchLayout) {
      Save.save();
    }
  }

  syncRoomControllers(room, selfPeerId = null, pingMs = 0) {
    if (!this.ctrlStatusPill) return;
    const ctrls = (room?.peers || []).filter((p) => p.role === 'controller' && p.peerId !== selfPeerId);
    const mobPlayers = (room?.peers || []).filter((p) => p.role === 'mobile_player' && p.peerId !== selfPeerId);
    if (ctrls.length === 0 && mobPlayers.length === 0) {
      this.ctrlStatusPill.classList.add('hidden');
      return;
    }
    this.ctrlStatusPill.classList.remove('hidden');
    if (this.ctrlText) {
      if (ctrls.length > 0) {
        const c = ctrls[0];
        const modeLbl = c.controlMode === 'own_dino' ? '2-8P' : '1P';
        this.ctrlText.textContent = ctrls.length > 1
          ? `🎮 ${ctrls.length} Controles (${c.pingMs || pingMs || 12}ms)`
          : `🎮 ${c.name} (${modeLbl} • ${c.pingMs || pingMs || 12}ms)`;
      } else {
        this.ctrlText.textContent = `📱 ${mobPlayers.length} Player 3D`;
      }
    }
  }

  setControllerStatusHud({ connected = false, peerName = 'Controle', pingMs = 12, activeInputs = {}, controlMode = 'p1_remote' } = {}) {
    if (!this.ctrlStatusPill) return;
    this.ctrlStatusPill.classList.toggle('hidden', !connected);
    if (!connected) return;
    const anyDown = Object.values(activeInputs || {}).some(Boolean);
    if (this.ctrlLed) {
      this.ctrlLed.classList.toggle('pulse', anyDown);
    }
    if (this.ctrlText) {
      const modeLbl = controlMode === 'own_dino' ? '2-8P' : '1P';
      const activeList = Object.entries(activeInputs || {}).filter(([, v]) => v).map(([k]) => k.toUpperCase());
      const actTag = activeList.length > 0 ? ` • ${activeList[0]}` : '';
      this.ctrlText.textContent = `🎮 ${peerName} (${modeLbl} • ${pingMs}ms)${actTag}`;
    }
  }

  applyTouchMode(mode = 'swipe') {
    if (!this.touchControls) return;
    this.touchControls.classList.toggle('touch-mode-buttons', mode === 'buttons');
    this._applyMobileTouchLayout();
  }

  setPlayingUI(isPlaying) {
    this.hudTop.classList.toggle('hidden', !isPlaying);
    this.hudBottom.classList.toggle('hidden', !isPlaying);
    this.touchControls.classList.toggle('active-play', isPlaying);
    this.applyTouchMode(Save.data.settings?.touchMode || 'swipe');
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
    this.submergedTint?.classList.add('hidden');
    this.oxygenPill?.classList.add('hidden');
    this.companionPill?.classList.add('hidden');
    this.radialOverlay?.classList.add('hidden');
    this.transmuteBtn?.classList.add('hidden');
    this.touchTransmuteBtn?.classList.add('hidden');
    this.touchFuryBtn?.classList.add('hidden');
    this.touchItemBtn?.classList.add('hidden');
    this.touchReviveBtn?.classList.add('hidden');
    this.touchBreatheBtn?.classList.add('hidden');
    this.touchAttackBtn?.classList.remove('touch-boss-ready');
    this.contextHintEl?.classList.add('hidden');
    this._spotlightQueue = [];
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

  _applyOxygenVisuals(pct) {
    const o2 = Math.max(0, Math.min(100, Math.round(Number(pct ?? 100))));
    if (this.oxygenPill) {
      this.oxygenPill.classList.toggle('o2-critical', o2 <= 30);
      this.oxygenPill.classList.toggle('o2-warn', o2 > 30 && o2 <= 60);
      this.oxygenPill.classList.toggle('o2-safe', o2 > 60);
    }
    if (this.oxygenBar) {
      this.oxygenBar.style.width = `${o2}%`;
      this.oxygenBar.style.background = o2 <= 30
        ? 'linear-gradient(90deg, #dc2626, #ef4444)'
        : (o2 <= 60 ? 'linear-gradient(90deg, #d97706, #facc15)' : 'linear-gradient(90deg, #16a34a, #4ade80)');
    }
  }

  setContextualTouchState({
    canAttackBoss = false,
    reviveTargetNick = null,
    canBreathe = false,
    attackCooldownPct = 100,
    oxygenPct = 100
  } = {}) {
    this._contextualTouchState = {
      canAttackBoss: !!canAttackBoss,
      reviveTargetNick: reviveTargetNick ? String(reviveTargetNick) : null,
      canBreathe: !!canBreathe,
      attackCooldownPct: Math.max(0, Math.min(100, Number(attackCooldownPct ?? 100))),
      oxygenPct: Math.max(0, Math.min(100, Number(oxygenPct ?? 100)))
    };

    if (this.touchReviveBtn) {
      const nick = this._contextualTouchState.reviveTargetNick;
      const showRevive = Boolean(nick);
      this.touchReviveBtn.classList.toggle('hidden', !showRevive);
      this.touchReviveBtn.classList.toggle('touch-ready', showRevive);
      if (showRevive && this.touchReviveLbl) {
        this.touchReviveLbl.textContent = `Reviver ${nick.slice(0, 10)}`;
      }
      if (showRevive) {
        this.showFirstTimeContextHint('mp_revive_v');
      }
    }

    if (this.touchBreatheBtn) {
      const showBreathe = this._contextualTouchState.canBreathe;
      this.touchBreatheBtn.classList.toggle('hidden', !showBreathe);
      this.touchBreatheBtn.classList.toggle('touch-ready', showBreathe && this._contextualTouchState.oxygenPct <= 60);
      this.touchBreatheBtn.classList.toggle('o2-critical', showBreathe && this._contextualTouchState.oxygenPct <= 30);
      if (this.touchBreatheLbl) {
        this.touchBreatheLbl.textContent = 'Respirar';
      }
      if (showBreathe) {
        this.showFirstTimeContextHint('water_breathe');
      }
    }

    if (this.touchAttackBtn) {
      const pct = this._contextualTouchState.attackCooldownPct;
      const bossReady = this._contextualTouchState.canAttackBoss && pct >= 99;
      this.touchAttackBtn.classList.toggle('touch-boss-ready', this._contextualTouchState.canAttackBoss);
      this.touchAttackBtn.classList.toggle('touch-ready', bossReady || pct >= 99);
      if (this.touchAttackCdFill) {
        this.touchAttackCdFill.style.width = `${pct}%`;
        this.touchAttackCdFill.style.background = pct >= 99
          ? (this._contextualTouchState.canAttackBoss ? '#ffd447' : '#fb923c')
          : '#64748b';
      }
      if (this._contextualTouchState.canAttackBoss) {
        this.showFirstTimeContextHint('boss_attack_q');
      }
    }

    this._applyOxygenVisuals(this._contextualTouchState.oxygenPct);
  }

  showFirstTimeContextHint(hintKey, { duration = 4.2 } = {}) {
    const def = FIRST_TIME_CONTEXT_HINTS[hintKey];
    if (!def || !this.contextHintEl) return false;
    if (Save.data.settings?.discoveryPopups === false) return false;
    if (!Save.data.seenContextHints) Save.data.seenContextHints = [];
    if (this._shownContextHints.has(hintKey) || Save.data.seenContextHints.includes(hintKey)) {
      return false;
    }
    this._shownContextHints.add(hintKey);
    Save.data.seenContextHints.push(hintKey);
    try { Save.save(); } catch {}

    const isTouch = (typeof window !== 'undefined') && (window.matchMedia?.('(pointer: coarse)')?.matches || window.innerWidth <= 960);
    const bodyText = isTouch ? def.mobText : def.pcText;
    this.contextHintEl.innerHTML = `<span class="context-hint-ico">${def.icon}</span><div><strong>${def.title}</strong><div>${bodyText}</div></div>`;
    this.contextHintEl.classList.remove('hidden');
    this.contextHintTimer = duration;
    return true;
  }

  setMpReviveHud({ visible = false, canAfford = false, cost = 45, allyName = 'Aliado' } = {}) {
    if (!this.mpReviveBtn) return;
    this.mpReviveBtn.classList.toggle('hidden', !visible);
    if (!visible) return;
    this.mpReviveBtn.style.opacity = canAfford ? '1' : '0.68';
    this.mpReviveBtn.style.borderColor = canAfford ? '#34d399' : '#f59e0b';
    if (this.mpReviveLbl) {
      this.mpReviveLbl.textContent = `Reviver ${allyName} (${cost} 🥚)`;
    }
  }

  updatePlayStatus(player, eggsTotal, biomeName, nextPortalDist, combo, score, extra = {}) {
    this.eggsEl.textContent = String(eggsTotal);
    if (this.crystalsEl) this.crystalsEl.textContent = String(Save.data.crystals || 0);
    const maxHp = Math.max(1, player.maxHp || 1);
    const hp = Math.max(0, Math.min(maxHp, Math.round(player.hp ?? 0)));
    const hearts = maxHp <= 6 ? `${'❤️'.repeat(hp)}${'🖤'.repeat(maxHp - hp)} ` : '❤️ ';
    const perfBadge = Save.data.perfectMode && maxHp === 1 ? '💎 ' : '';
    this.hpText.textContent = `${perfBadge}${hearts}${hp}/${maxHp} • 🛡️ ${player.shields || 0}`;
    const pulseLowHp = !!Save.data.settings.lowHpPulse;
    const lowHpActive = pulseLowHp && player.hp <= 1 && !player.dead;
    this.dmgVignette.classList.toggle('hidden', !lowHpActive);
    this.dmgVignette.classList.toggle('low-hp-pulse', lowHpActive);

    const prog = Save.data.settings?.progressiveUnlocks !== false && !player._unlockAll;
    const abilityOpen = !prog || score >= 600;
    const staminaOpen = !prog || score >= 1200;
    const attackOpen = !prog || score >= 1800;
    const furyOpen = !prog || score >= 2800;

    if (this.pillAbility) this.pillAbility.style.opacity = abilityOpen ? '1' : '0.48';
    if (this.pillBullet) this.pillBullet.style.opacity = staminaOpen ? '1' : '0.48';
    if (this.pillAttack) this.pillAttack.style.opacity = attackOpen ? '1' : '0.48';
    if (this.pillFury) this.pillFury.style.opacity = furyOpen ? '1' : '0.48';

    this.barFury.style.width = furyOpen ? `${Math.min(100, player.fury || 0)}%` : '0%';
    const furyPill = this.root.querySelector('#btn-fury-melee');
    if (furyPill) {
      furyPill.style.borderColor = furyOpen && (player.fury || 0) >= 100 ? '#ffd447' : '';
    }
    if (this.lblAbility && (this._lastAbilityDinoId !== player.id || this._lastAbilityLock !== abilityOpen)) {
      this._lastAbilityDinoId = player.id;
      this._lastAbilityLock = abilityOpen;
      this.lblAbility.innerHTML = abilityOpen
        ? `${renderSkillSvg(player.id, 18)} <span class="btn-label">Habilidade</span> <span class="kb-only">(Espaço)</span>`
        : `🔒 <span class="btn-label">600 pts</span>`;
    }
    const cdPct = player.abilityMaxCooldown > 0
      ? Math.max(0, 100 * (1 - player.abilityCooldown / player.abilityMaxCooldown))
      : 100;
    const chargePct = Math.max(0, Math.min(100, player.abilityCharge ?? 100));
    this.barAbility.style.width = `${Math.min(cdPct, chargePct)}%`;
    const staminaVal = Math.max(0, Math.min(100, player.stamina ?? 100));
    this.barBullet.style.width = `${staminaVal}%`;
    this.barBullet.style.background = staminaVal < 30 ? '#ef4444' : (staminaVal < 55 ? '#f59e0b' : '#34d399');
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

    const divingTarget = (player.diveTarget ?? player.diveDepth ?? 0) >= 0.5;
    if (this.statusPillsEl) {
      const activeList = StatusSystem.getActiveList(player);
      const invHtml = (player.invulnTimer || 0) > 0.15
        ? `<span class="status-badge" style="color:#7dd3fc;">✨ Imune ${player.invulnTimer.toFixed(1)}s</span>`
        : '';
      const diveHtml = (player.inSubmerged || (player.diveDepth || 0) > 0.2)
        ? `<span class="status-badge" style="color:#22d3ee;">🤿 ${player.inSubmerged ? 'Fundo Abissal' : (divingTarget ? 'Submerso (S/▼ ou W/▲ sobe)' : 'Emergindo...')}</span>`
        : '';
      this.statusPillsEl.innerHTML = diveHtml + invHtml + activeList.map((st) => {
        const tm = st.permanentElement ? '' : ` ${st.timeLeft.toFixed(0)}s`;
        return `<span class="status-badge" style="color:${st.color};">${st.icon} ${st.name}${tm}</span>`;
      }).join('');
    }

    const canTransmute = Array.isArray(player.availableHabitats) && player.availableHabitats.length > 1;
    this.transmuteBtn?.classList.toggle('hidden', !canTransmute);
    this.touchTransmuteBtn?.classList.toggle('hidden', !canTransmute);
    if (canTransmute && this.transmuteLbl) {
      const m = player.habitatMode || 'land';
      this.transmuteLbl.textContent = m === 'aquatic' ? '🌊 Água' : (m === 'flying' ? '🪽 Céu' : '🌿 Terra');
    }

    const submergedNow = !!(player.inSubmerged || (player.diveDepth || 0) > 0.25);
    this.submergedTint?.classList.toggle('hidden', !submergedNow);

    const showO2 = !!(player.inWater || submergedNow || (player.oxygen ?? 100) < 99);
    const o2 = Math.max(0, Math.min(100, Math.round(player.oxygen ?? 100)));
    if (this.oxygenPill) {
      this.oxygenPill.classList.toggle('hidden', !showO2);
      if (this.oxygenLbl) {
        this.oxygenLbl.textContent = player.isAquaticNative ? `Brânquias ${o2}%` : `${o2}%`;
      }
      this._applyOxygenVisuals(o2);
    }

    const petStatus = extra?.companionStatus || null;
    if (this.companionPill) {
      this.companionPill.classList.toggle('hidden', !petStatus);
      if (petStatus && this.companionLbl) {
        const cdStr = petStatus.commandCd > 0.1
          ? `${petStatus.commandCd.toFixed(0)}s`
          : (petStatus.shieldCd > 0.1 ? `🛡️${petStatus.shieldCd.toFixed(0)}s` : 'Pronto!');
        this.companionLbl.textContent = `${petStatus.role.icon} ${petStatus.name} • ${cdStr}`;
        this.companionPill.style.borderColor = petStatus.role.color || '';
      }
    }

    const rCd = Math.max(0, extra?.radialCooldown || 0);
    if (this.radialPillBtn && this.radialCdLbl) {
      this.radialPillBtn.classList.toggle('cooldown', rCd > 0.05);
      this.radialCdLbl.textContent = rCd > 0.05 ? `${rCd.toFixed(1)}s` : '(X)';
    }
    if (this.touchRadialBtn) {
      this.touchRadialBtn.style.opacity = rCd > 0.05 ? '0.62' : '1';
    }

    if (player.backpack?.slots?.length > 0) {
      const firstId = player.backpack.slots[0];
      const firstIcon = BACKPACK_ITEMS[firstId]?.icon || '📦';
      this.lblBackpack.textContent = player.backpack.slots.map((id) => BACKPACK_ITEMS[id]?.icon || '📦').join(' ');
      if (this.touchItemBtn) {
        this.touchItemBtn.classList.remove('hidden');
        if (this.touchItemIco) this.touchItemIco.textContent = firstIcon;
      }
    } else {
      this.lblBackpack.textContent = 'Vazia';
      this.touchItemBtn?.classList.add('hidden');
    }

    // Sincronia ergonômica dos botões touch no celular (Fúria, Transmutação, Ataque, Habilidade)
    const atkCd = Math.max(0, player.attackCooldown || 0);
    const abReadyPct = Math.min(cdPct, chargePct);
    if (this.touchAbilityBtn) {
      const abReady = abilityOpen && abReadyPct >= 99;
      this.touchAbilityBtn.classList.toggle('touch-locked', !abilityOpen);
      this.touchAbilityBtn.classList.toggle('touch-ready', abReady);
      this.touchAbilityBtn.style.opacity = !abilityOpen ? '0.45' : (abReady ? '1' : '0.72');
      if (this.touchAbilityLbl) {
        this.touchAbilityLbl.textContent = !abilityOpen ? '600pt' : (abReady ? 'Hab!' : `${Math.round(abReadyPct)}%`);
      }
    }
    if (this.touchAttackBtn) {
      const atkMax = player.attackMaxCooldown || 1.25;
      const atkPct = Math.max(0, Math.min(100, 100 * (1 - atkCd / atkMax)));
      const atkReady = attackOpen && atkCd <= 0.05;
      this.touchAttackBtn.classList.toggle('touch-locked', !attackOpen);
      this.touchAttackBtn.classList.toggle('touch-ready', atkReady);
      this.touchAttackBtn.style.opacity = !attackOpen ? '0.45' : (atkReady ? '1' : '0.78');
      if (this.touchAttackLbl) {
        this.touchAttackLbl.textContent = !attackOpen ? '1.8k' : (atkReady ? 'Atq!' : `${atkCd.toFixed(1)}s`);
      }
      if (this.touchAttackCdFill) {
        this.touchAttackCdFill.style.width = `${atkPct}%`;
        this.touchAttackCdFill.style.background = atkReady ? '#fb923c' : '#64748b';
      }
    }
    if (this.touchBreatheBtn) {
      const canBreatheNow = Boolean((submergedNow || (player.inWater && o2 < 95)) && !player.isAquaticNative);
      this.touchBreatheBtn.classList.toggle('hidden', !canBreatheNow);
      this.touchBreatheBtn.classList.toggle('touch-ready', canBreatheNow && o2 <= 60);
      this.touchBreatheBtn.classList.toggle('o2-critical', canBreatheNow && o2 <= 30);
    }
    if (this.touchFuryBtn) {
      const furyReady = furyOpen && (player.fury || 0) >= 100 && (player.furyTimer || 0) <= 0;
      this.touchFuryBtn.classList.toggle('hidden', !furyReady);
      this.touchFuryBtn.classList.toggle('touch-ready', furyReady);
    }
    if (canTransmute && this.touchTransmuteLbl) {
      const m = player.habitatMode || 'land';
      this.touchTransmuteLbl.textContent = m === 'aquatic' ? 'Água' : (m === 'flying' ? 'Céu' : 'Terra');
    }
    if (this.touchDuckIco && this.touchDuckLbl) {
      if (player.inWater && !player.inSubmerged) {
        if (divingTarget) {
          this.touchDuckIco.textContent = '🌊';
          this.touchDuckLbl.textContent = 'Subir';
        } else {
          this.touchDuckIco.textContent = '🤿';
          this.touchDuckLbl.textContent = 'Merg.';
        }
      } else if (player.habitatMode === 'flying' && !player.inSubmerged) {
        this.touchDuckIco.textContent = '▼';
        this.touchDuckLbl.textContent = 'Descer';
      } else {
        this.touchDuckIco.textContent = '▼';
        this.touchDuckLbl.textContent = 'Baixo';
      }
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

  showRadialWheel({ player, companionStatus = null } = {}) {
    if (!this.radialOverlay) return;
    const habSub = this.root.querySelector('#rad-sub-habitat');
    const bagSub = this.root.querySelector('#rad-sub-backpack');
    const petSub = this.root.querySelector('#rad-sub-companion');
    const focusSub = this.root.querySelector('#rad-sub-focus');
    const bagBtn = this.root.querySelector('#rad-opt-backpack');
    const petBtn = this.root.querySelector('#rad-opt-companion');

    const canHybrid = Array.isArray(player?.availableHabitats) && player.availableHabitats.length > 1;
    if (habSub) {
      if (canHybrid) {
        const cur = player.habitatMode || 'land';
        habSub.textContent = `Atual: ${cur === 'aquatic' ? 'Água' : (cur === 'flying' ? 'Céu' : 'Terra')}`;
      } else if (player?.inWater) {
        habSub.textContent = 'Impulso Submerso';
      } else {
        habSub.textContent = 'Regra Híbrido';
      }
    }
    const bagSlots = player?.backpack?.slots || [];
    if (bagSub) {
      bagSub.textContent = bagSlots.length > 0
        ? (BACKPACK_ITEMS[bagSlots[0]]?.name || `${bagSlots.length} item(s)`)
        : 'Vazia';
    }
    bagBtn?.classList.toggle('radial-disabled', bagSlots.length === 0);

    if (petSub) {
      if (!companionStatus) petSub.textContent = 'Sem Mascote';
      else if (companionStatus.commandCd > 0.1) petSub.textContent = `Recarga ${companionStatus.commandCd.toFixed(1)}s`;
      else petSub.textContent = `${companionStatus.role.icon} ${companionStatus.role.label}`;
    }
    petBtn?.classList.toggle('radial-disabled', !companionStatus || companionStatus.commandCd > 0.1);

    if (focusSub) {
      focusSub.textContent = (player?.stamina ?? 0) >= 25 ? '+28% Hab / +45 O₂' : 'Sem Estamina (25)';
    }
    this.radialOverlay.classList.remove('hidden');
  }

  hideRadialWheel() {
    this.radialOverlay?.classList.add('hidden');
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
    const { spec, remaining, actLabel } = info;
    this.predIntroEl.style.borderColor = spec.accent || '#fb923c';
    this.predIntroArch.textContent = actLabel || `🐾 ${spec.archetype || 'Predador Alfa'} • Espaço/W/Clique pula`;
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
    if (this.contextHintTimer > 0) {
      this.contextHintTimer -= dt;
      if (this.contextHintTimer <= 0) this.contextHintEl?.classList.add('hidden');
    }
  }

  showPause(show) {
    this.pauseOverlay.classList.toggle('hidden', !show);
  }

  showSpotlight(opts = {}) {
    if (!this.spotlightOverlay) return;
    if (Save.data.settings?.discoveryPopups === false) {
      opts.onDismiss?.();
      return;
    }
    const isCurrentlyOpen = !this.spotlightOverlay.classList.contains('hidden');
    if (isCurrentlyOpen) {
      this._spotlightQueue.push(opts);
      return;
    }
    const { icon = '⚡', title = 'Dica', desc = '', selector = null, accent = '#38bdf8', onDismiss = null } = opts;
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
    if (this.spotlightDontShow) this.spotlightDontShow.checked = false;
    this._onSpotlightDismiss = onDismiss || null;
    this.spotlightOverlay.style.backdropFilter = 'blur(8px)';
    this.spotlightOverlay.style.webkitBackdropFilter = 'blur(8px)';
    this.spotlightOverlay.classList.remove('hidden');

    const close = () => {
      if (this.spotlightDontShow?.checked) {
        if (!Save.data.settings) Save.data.settings = {};
        Save.data.settings.discoveryPopups = false;
        Save.save();
      }
      this.hideSpotlight(true);
    };
    if (this.spotlightCard) {
      this.spotlightCard.onclick = (e) => e.stopPropagation();
    }
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
    if (triggerCallback && this._spotlightQueue.length > 0) {
      const next = this._spotlightQueue.shift();
      this.showSpotlight(next);
    }
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

  showGameOver({ title = 'GAME OVER!', causeLabel = '', avoidTip = '', score, hiScore, isNewRecord, distance, eggs, maxCombo, dinoId, gachaCrates = 0, totalCrates = 0, canCrystalRevive = false, crystalReviveCost = 2, crystals = 0, onCrystalRevive = null }) {
    this._onCrystalRevive = typeof onCrystalRevive === 'function' ? onCrystalRevive : null;
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
    if (this.goCrystalBox && this.goCrystalReviveBtn) {
      this.goCrystalBox.classList.toggle('hidden', !canCrystalRevive);
      if (canCrystalRevive) {
        const canAfford = (Number(crystals) || 0) >= crystalReviveCost;
        this.goCrystalReviveBtn.disabled = !canAfford;
        this.goCrystalReviveBtn.style.opacity = canAfford ? '1' : '0.52';
        this.goCrystalReviveBtn.textContent = canAfford
          ? `💖 Renascer (${crystalReviveCost} 💎)`
          : `🔒 Precisa ${crystalReviveCost} 💎 (Tem ${Math.max(0, Math.floor(Number(crystals) || 0))})`;
        if (this.goCrystalDesc) {
          this.goCrystalDesc.textContent = canAfford
            ? `Volte imediatamente na pista com +2 ❤️ e escudo temporário (Saldo: ${crystals} 💎).`
            : `Colete Diamantes na pista ou conquistas para usar o Revive de Cristal (1x por corrida).`;
        }
      }
    }
    if (this.goGachaBox) {
      const showCrates = gachaCrates > 0 || totalCrates > 0;
      this.goGachaBox.classList.toggle('hidden', !showCrates);
      if (showCrates && this.goGachaText) {
        this.goGachaText.textContent = gachaCrates > 0
          ? `+${gachaCrates} Caixa(s) Fóssil(is) nesta corrida! (${totalCrates} 📦 no cofre)`
          : `Você possui ${totalCrates} Caixa(s) Fóssil(is) aguardando no cofre!`;
      }
    }
    this.root.querySelector('#go-record-badge').classList.toggle('hidden', !isNewRecord);
    const spec = getDinoSpec(dinoId);
    this.root.querySelector('#go-fact').textContent = `💡 Sabia? ${spec.fact.pt}`;
    this.gameOverOverlay.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverOverlay.classList.add('hidden');
  }
}
