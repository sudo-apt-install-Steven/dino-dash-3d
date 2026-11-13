// HUD completo em partida: placar HI 00194  00070, barras de Fúria/Habilidade/Bullet-Time,
// mochila, mapa do tesouro, Boss HP, OVNI fuga, Papéis Compartilhados, Touch, Pausa e Game Over.
import { BACKPACK_ITEMS } from '../systems/Items.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';

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

      <div class="hud-top">
        <div class="hud-pills">
          <div class="dino-logo" style="font-size: 1.25rem;">DINO <span class="dash-accent">DASH 3D</span></div>
          <div class="hud-pill" id="hud-camera">Câmera: <strong>3ª Pessoa</strong></div>
          <div class="hud-pill" id="hud-speed">Vel: <strong>1.0x</strong></div>
          <div class="hud-pill" id="hud-eggs">🥚 <strong>0</strong></div>
          <div class="hud-pill hidden" id="hud-combo" style="color:#ffd447;">Combo: <strong>x1</strong></div>
          <div class="hud-pill hidden" id="hud-mp-rank" style="color:#fde047; border-color:#ffd447;">🏆 #1</div>
          <div class="hud-pill hidden" id="hud-element" style="color:#38bdf8;">✨ Nenhum</div>
          <div class="hud-pill hidden" id="hud-wanted" style="color:#ff4757;">🚨 ★</div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="chunky-btn secondary" id="btn-guide" style="padding:5px 10px; font-size:0.75rem;" title="Guia de Obstáculos & Controles">📖 Guia</button>
            <button class="chunky-btn secondary" id="btn-clip-rec" style="padding:5px 10px; font-size:0.75rem;" title="Gravar clipe (.webm)">🎥 Clipe</button>
            <button class="chunky-btn secondary" id="btn-debug" style="padding:5px 10px; font-size:0.75rem;" title="Painel de Depuração (F9)">🛠️ F9</button>
            <button class="chunky-btn secondary" id="btn-photo-mode" style="padding:5px 10px; font-size:0.75rem;">📷</button>
            <button class="chunky-btn secondary" id="btn-pause" style="padding:5px 12px; font-size:0.75rem;">⏸ P</button>
            <div class="hud-score-box" id="hud-score"><span class="hi-label">HI 00000</span>  00000</div>
          </div>
          <div class="treasure-map" id="hud-treasure-map">
            <span id="map-biome-name">Deserto Dourado</span>
            <div class="treasure-track"><div class="treasure-fill" id="map-fill" style="width:0%"></div></div>
            <span id="map-next-portal">Portal 1000</span>
          </div>
        </div>
      </div>

      <div class="boss-bar-wrap hidden" id="boss-bar-wrap">
        <div class="chunky-panel" style="padding:8px 14px;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
            <strong id="boss-name" style="color:#ff4757;">Chefe</strong>
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
          <div class="meter-pill">
            <div id="hud-hp-text">❤️ 3/3 • 🛡️ 0</div>
          </div>
          <div class="meter-pill">
            <span>🔥 Fúria (F)</span>
            <div class="meter-bar"><div class="meter-fill" id="bar-fury" style="width:0%; background:linear-gradient(90deg,#ff5e1a,#ffd447);"></div></div>
          </div>
          <div class="meter-pill">
            <span id="lbl-ability">⚡ Habilidade (Espaço)</span>
            <div class="meter-bar"><div class="meter-fill" id="bar-ability" style="width:100%; background:#58d63a;"></div></div>
          </div>
          <div class="meter-pill">
            <span>⏱️ Bullet-Time (Shift)</span>
            <div class="meter-bar"><div class="meter-fill" id="bar-bullet" style="width:100%; background:#a855f7;"></div></div>
          </div>
          <div class="meter-pill" id="btn-attack-melee" style="cursor:pointer; pointer-events:auto;" title="Ataque / Mordida / Cortar (Q)">
            <span>⚔️ Ataque (Q)</span>
            <div class="meter-bar"><div class="meter-fill" id="bar-attack" style="width:100%; background:#f97316;"></div></div>
          </div>
          <div class="meter-pill" id="hud-backpack" style="cursor:pointer; pointer-events:auto;">
            🎒 Mochila (E): <strong id="lbl-backpack">Vazia</strong>
          </div>
        </div>

        <div class="controls-hint" id="hud-controls-hint">
          <kbd>W</kbd>/<kbd>↑</kbd> Pular (segure=alto) • <kbd>S</kbd>/<kbd>↓</kbd> Abaixar • <kbd>A</kbd>/<kbd>D</kbd> Faixas • <kbd>Q</kbd> Ataque • <kbd>Espaço</kbd> Habilidade • <kbd>F</kbd> Fúria • <kbd>C</kbd> Câmera • <kbd>F9</kbd> Debug
        </div>
      </div>

      <!-- Botões virtuais touch para dispositivos móveis -->
      <div class="touch-controls" id="touch-controls">
        <div class="touch-cluster">
          <button class="touch-btn" data-tact="left">◀</button>
          <button class="touch-btn" data-tact="right">▶</button>
        </div>
        <div class="touch-cluster">
          <button class="touch-btn" data-tact="duck">▼</button>
          <button class="touch-btn" data-tact="attack">⚔️</button>
          <button class="touch-btn" data-tact="ability">⚡</button>
          <button class="touch-btn" data-tact="jump">▲</button>
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
          <div class="stat-grid">
            <div class="stat-tile"><span class="label">Pontuação</span><span class="val" id="go-score">00000</span></div>
            <div class="stat-tile"><span class="label">Recorde (HI)</span><span class="val" id="go-hi">00000</span></div>
            <div class="stat-tile"><span class="label">Distância</span><span class="val" id="go-dist">0 m</span></div>
            <div class="stat-tile"><span class="label">Ovos / Max Combo</span><span class="val" id="go-eggs">0 / x1</span></div>
          </div>
          <div id="go-record-badge" class="hud-pill hidden" style="margin:0 auto; color:#ffd447;">🏆 NOVO RECORDE!</div>
          <p id="go-fact" style="font-size:0.8rem; color:#d8c2a6; font-style:italic;"></p>
          <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <button class="chunky-btn" id="btn-restart">Jogar Novamente (R)</button>
            <button class="chunky-btn orange" id="btn-replay">🎬 Ver Replay</button>
            <button class="chunky-btn secondary" id="btn-go-menu">Menu</button>
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
    this.sharedRolesEl = q('#hud-shared-roles');
    this.chaserEl = q('#hud-chaser');
    this.bossWrap = q('#boss-bar-wrap');
    this.bossName = q('#boss-name');
    this.bossHpText = q('#boss-hp-text');
    this.bossHpFill = q('#boss-hp-fill');
    this.ufoWrap = q('#ufo-bar-wrap');
    this.ufoFill = q('#ufo-fill');
    this.ufoLabel = q('#ufo-label');
    this.touchControls = q('#touch-controls');
    this.hudBottom = q('#hud-bottom-bar');

    this.pauseOverlay = q('#pause-overlay');
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
    this.root.querySelector('#btn-attack-melee').addEventListener('click', () => this.callbacks.onBasicAttack?.());
    this.root.querySelector('#photo-exit').addEventListener('click', () => this.callbacks.onTogglePhoto?.());
    this.root.querySelector('#photo-cam').addEventListener('click', () => this.callbacks.onCycleCamera?.());
    this.root.querySelector('#hud-backpack').addEventListener('click', () => this.callbacks.onUseItem?.());
    this.root.querySelector('#merch-heal').addEventListener('click', () => this.callbacks.onMerchantBuy?.());
    this.root.querySelector('#merch-skip').addEventListener('click', () => this.hideMerchant());

    // Botões virtuais Touch
    this.root.querySelectorAll('[data-tact]').forEach((btn) => {
      const act = btn.getAttribute('data-tact');
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.callbacks.onTouchAction?.(act, true); });
      btn.addEventListener('pointerup', () => this.callbacks.onTouchAction?.(act, false));
      btn.addEventListener('pointercancel', () => this.callbacks.onTouchAction?.(act, false));
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

  setMerchantCost(cost) {
    if (this.merchHealBtn) {
      this.merchHealBtn.textContent = `Comprar +1 Vida / Escudo (${cost} 🥚)`;
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

  updatePlayStatus(player, eggsTotal, biomeName, nextPortalDist, combo, score) {
    this.eggsEl.textContent = String(eggsTotal);
    this.hpText.textContent = `❤️ ${player.hp}/${player.maxHp} • 🛡️ ${player.shields}`;
    this.dmgVignette.classList.toggle('hidden', player.hp > 1 || player.dead);

    this.barFury.style.width = `${Math.min(100, player.fury || 0)}%`;
    const cdPct = player.abilityMaxCooldown > 0
      ? Math.max(0, 100 * (1 - player.abilityCooldown / player.abilityMaxCooldown))
      : 100;
    this.barAbility.style.width = `${cdPct}%`;
    this.barBullet.style.width = `${Math.min(100, player.bulletEnergy ?? 100)}%`;
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

    if (player.backpack?.slots?.length > 0) {
      this.lblBackpack.textContent = player.backpack.slots.map((id) => BACKPACK_ITEMS[id]?.icon || '📦').join(' ');
    } else {
      this.lblBackpack.textContent = 'Vazia';
    }

    this.comboEl.classList.toggle('hidden', combo <= 1);
    this.comboEl.innerHTML = `Combo: <strong>x${combo}</strong>`;

    this.mapBiomeName.textContent = biomeName;
    const progress = ((score % 1000) / 1000) * 100;
    this.mapFill.style.width = `${Math.min(100, progress)}%`;
    this.mapNextPortal.textContent = `Portal ${Math.ceil((score + 1) / 1000) * 1000}`;
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

  setChaserHud(active, distance) {
    this.chaserEl.classList.toggle('hidden', !active);
    if (active) this.chaserEl.textContent = `🦖 Perseguidor a ${distance.toFixed(1)}m!`;
  }

  setBossHud(boss) {
    this.bossWrap.classList.toggle('hidden', !boss);
    if (boss) {
      this.bossName.textContent = `👑 ${boss.name}`;
      this.bossHpText.textContent = `${boss.currentHp}/${boss.maxHp}`;
      this.bossHpFill.style.width = `${(boss.currentHp / boss.maxHp) * 100}%`;
    }
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

  showPhotoMode(show) {
    this.photoOverlay.classList.toggle('hidden', !show);
  }

  showMerchant() {
    this.merchantOverlay.classList.remove('hidden');
  }

  hideMerchant() {
    this.merchantOverlay.classList.add('hidden');
  }

  showGameOver({ title = 'GAME OVER!', score, hiScore, isNewRecord, distance, eggs, maxCombo, dinoId }) {
    this.root.querySelector('#go-title').textContent = title;
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
