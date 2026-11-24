// Coordenador de UI: conecta HUD, Menus, Cartas, Seleção 3D, Personalização, Minigames e Filtros.
import { Save } from '../systems/Save.js';
import { HUD } from './HUD.js';
import { Menus } from './Menus.js';
import { SelectionScreen } from './SelectionScreen.js';
import { CustomizationScreen } from './CustomizationScreen.js';
import { SettingsModal } from './SettingsModal.js';
import { CardModal } from './CardModal.js';
import { MinigamesUI } from './MinigamesUI.js';
import { MultiplayerLobby } from './MultiplayerLobby.js';
import { MobileController } from './MobileController.js';
import { MetagameModal } from './MetagameModal.js';
import { PartyModals } from './PartyModals.js';
import { GuideModal } from './GuideModal.js';
import { GachaModal } from './GachaModal.js';
import { LegalModal } from './LegalModal.js';
import { ProfileModal } from './ProfileModal.js';
import { AchievementsModal } from './AchievementsModal.js';
import { SaveModal } from './SaveModal.js';
import { GachaSystem } from '../systems/GachaSystem.js';
import { PerfMonitor } from '../systems/PerfMonitor.js';
import { OrientationManager } from '../systems/OrientationManager.js';
import { isMobileDevice } from '../systems/DeviceDetector.js';
import { getModeDef } from '../game/Modes.js';
import { getDinoSpec, getDinoDisplayName, getEffectiveDinoHabitat } from '../dinos/DinoCatalog.js';
import { getBiomeById, isAquaticBiome } from '../world/Biomes.js';

export class UIManager {
  constructor(rootEl, game) {
    this.rootEl = rootEl;
    this.game = game;
    this.controllerInstance = null;
    this.hud = new HUD(rootEl, {
      onRestart: () => this.game.restartRun(),
      onRequestRestart: () => this.game.requestRestart(),
      onConfirmRestart: () => this.game.confirmRestart(),
      onCancelRestart: () => this.game.cancelRestart(),
      onSkipTutorial: () => this.game.skipTutorial(),
      onOpenGuide: () => this.openSection('guide'),
      onOpenGacha: () => this.openSection('gacha'),
      onMpRevive: () => this.game.reviveFallenAlly(0),
      onReplay: () => this.game.startReplayPlayback(),
      onGoDinos: () => this.openSection('dinos'),
      onGoMenu: () => this.game.openMainMenu(),
      onTogglePause: () => this.game.togglePause(),
      onTogglePhoto: () => this.game.togglePhotoMode(),
      onCapturePhoto: () => this.game.capturePhotoSnapshot(),
      onCycleCamera: () => this.game.cycleCamera(),
      onUseItem: () => this.game.usePlayerItem(0),
      onMerchantBuy: () => this.game.buyFromMerchant(),
      onMerchantSkip: () => this.game.closeMerchant(true),
      onOpenDebug: () => this.openSection('debug'),
      onRecordClip: () => this.game.toggleClipRecording(),
      onBasicAttack: () => this.game.triggerManualAttack(0),
      onTriggerFury: () => this.game.input.triggerVirtualPulse('p1', 'fury', 100),
      onTransmute: () => this.game.input.triggerVirtualPulse('p1', 'transmute', 100),
      onCrystalRevive: () => this.game.reviveWithCrystal(),
      onToggleRadialWheel: (force) => this.game.toggleRadialWheel?.(force),
      onSelectRadialAction: (slot) => this.game.executeRadialAction?.(slot),
      onTouchAction: (act, active) => this.game.input.setVirtualAction('p1', act, active)
    });

    this.cardModal = new CardModal(this.hud.modalLayer, (card) => {
      this.game.applyPickedCard(card);
    });

    this.activeCleanup = null;
    this.applyVisualSettings();
  }

  applyVisualSettings() {
    const app = document.getElementById('app');
    if (!app) return;
    const s = Save.data.settings;

    app.classList.remove('filter-8bit', 'filter-neon', 'filter-bw', 'a11y-large', 'a11y-contrast', 'cb-protanopia', 'cb-deuteranopia', 'cb-tritanopia');
    if (s.styleFilter === '8bit') app.classList.add('filter-8bit');
    if (s.styleFilter === 'neon') app.classList.add('filter-neon');
    if (s.styleFilter === 'bw') app.classList.add('filter-bw');

    if (s.accessibility.largeText) app.classList.add('a11y-large');
    if (s.accessibility.highContrast) app.classList.add('a11y-contrast');
    if (s.accessibility.colorblind && s.accessibility.colorblind !== 'none') {
      app.classList.add(`cb-${s.accessibility.colorblind}`);
    }
    this.hud.setDebugButtonVisible(import.meta.env.DEV && !!Save.data.devMode);
    this.hud.applyTouchMode(s.touchMode || 'swipe');
  }

  openGacha(afterClose = null) {
    this._clearModal();
    const modal = new GachaModal(this.hud.modalLayer, () => {
      this.activeCleanup = null;
      this.game.rebuildPlayers();
      if (afterClose) afterClose();
      else this.showMainMenu();
    });
    this.activeCleanup = () => modal.close(true);
    modal.open();
  }

  _clearModal() {
    if (this.activeCleanup) {
      this.activeCleanup();
      this.activeCleanup = null;
    }
    this.hud.modalLayer.innerHTML = '';
  }

  refreshMainMenuIfIdle() {
    if (this.game?.state !== 'menu') return false;
    const ml = this.hud?.modalLayer;
    if (ml && ml.children.length > 0 && !ml.querySelector('#menu-play')) {
      return false;
    }
    this.showMainMenu();
    return true;
  }

  showMainMenu() {
    this._clearModal();
    this.hud.setPlayingUI(false);
    this.hud.hideGameOver();
    this.hud.showPause(false);

    const modeDef = getModeDef(this.game.modeId);
    const diffCfg = this.game.difficultyMgr.getConfig();
    const dinoSpec = getDinoSpec(Save.data.selectedDino);
    const rawBiome = getBiomeById(this.game.startBiomeId);
    const biomeLabel = this.game.startBiomeId === 'random_portal'
      ? 'Aleatório (Portais)'
      : (this.game.sequenceBiomes
        ? `Sequência (${rawBiome.name})`
        : rawBiome.name);
    const isPerf = !!Save.data.perfectMode && modeDef.id !== 'zen';
    const effectiveLives = (isPerf || modeDef.id === 'hardcore')
      ? 1
      : Math.max(1, Math.min(7, diffCfg.lives + Math.floor((Save.data.talents?.vitality || 0) / 2) + ((dinoSpec.stats?.hp ?? 3) - 3)));

    Menus.renderMainMenu(
      this.hud.modalLayer,
      {
        modeName: modeDef.name,
        diffName: diffCfg.name,
        dinoName: getDinoDisplayName(dinoSpec, Save.data.settings),
        effectiveLives,
        biomeLabel,
        fossilCrates: GachaSystem.getCrateCount(),
        lowSpec: !!Save.data.lowSpecMode,
        benchmarkFps: Save.data.benchmarkFps || 0,
        benchmarkTier: Save.data.benchmarkTier || '',
        tutorialDone: !!Save.data.tutorialDone,
        isLandscape: OrientationManager.isEffectiveLandscape(),
        devMode: import.meta.env.DEV ? !!Save.data.devMode : false
      },
      {
        onPlay: () => {
          this.game.sfx.click();
          this._clearModal();
          this.game.startRun();
        },
        onQuickPlayMode: (modeId) => {
          this.game.sfx.click();
          this._clearModal();
          if (typeof this.game.startQuickMode === 'function') {
            this.game.startQuickMode(modeId);
          } else {
            this.game.modeId = modeId;
            this.game.startRun();
          }
        },
        onOpenAccount: () => {
          this.game.sfx.click();
          this.openSection('profile', { initialTab: 'account' });
        },
        onToggleLandscape: () => {
          this.game.sfx.click();
          OrientationManager.toggleForceLandscape();
          this.showMainMenu();
        },
        onOpenController: () => {
          this.game.sfx.click();
          this.openController({ deferredInstall: window.__DINO_DEFERRED_INSTALL__ });
        },
        onToggleLowSpec: () => {
          this.game.sfx.click();
          PerfMonitor.applyLowSpec(this.game, !Save.data.lowSpecMode);
          this.showMainMenu();
        },
        onUnlockDevMode: import.meta.env.DEV ? () => {
          Save.data.devMode = true;
          Save.save();
          this.hud.setDebugButtonVisible(true);
          this.game.sfx.powerup();
          this.hud.showBanner('🛠️ Modo Desenvolvedor ativado! (F9 / Extras)', '#38bdf8', 3.0);
        } : null,
        onNavigate: (section) => {
          this.game.sfx.click();
          this.openSection(section);
        }
      }
    );
  }

  openController(opts = {}) {
    if (!isMobileDevice() && !opts.forceMobile) {
      this.openSection('multiplayer', opts);
      return;
    }
    this._clearModal();
    this.hud.setPlayingUI(false);
    this.hud.hideGameOver();
    this.hud.showPause(false);
    const ctrl = new MobileController(this.hud.modalLayer, this.game.net, {
      ...opts,
      onSwitchToPlayer3D: () => {
        this.controllerInstance = null;
        if (this.game.net.isConnected) {
          this.game.net.sendPlayerMeta({ role: 'mobile_player', ready: true });
          if (this.game.net.room?.status === 'playing' && this.game.net.room?.activeMatch) {
            this.game.startMultiplayerGuestMatch(this.game.net.room.activeMatch);
            return;
          }
          this.openSection('multiplayer');
        } else {
          this.showMainMenu();
        }
      },
      onExit: () => {
        this.controllerInstance = null;
        this.showMainMenu();
      }
    });
    this.controllerInstance = ctrl;
    this.activeCleanup = () => {
      if (this.controllerInstance === ctrl) {
        this.controllerInstance = null;
        ctrl.onExit = () => {};
        ctrl.destroy(false);
      }
    };
  }

  showPodium(summary, callbacks = {}) {
    this._clearModal();
    this.hud.setPlayingUI(false);
    this.hud.hideGameOver();
    PartyModals.renderPodiumModal(this.hud.modalLayer, summary, callbacks);
  }

  showControlConfirmationPopup({ requesterPeerId, requesterName = 'Celular', onAccept, onReject }) {
    document.getElementById('ctrl-confirm-popup')?.remove();
    const wrap = document.createElement('div');
    wrap.id = 'ctrl-confirm-popup';
    wrap.className = 'overlay-center';
    wrap.style.zIndex = '120';

    let secondsLeft = 15;
    let settled = false;
    wrap.innerHTML = `
      <div class="chunky-panel gameover-card" style="max-width:420px; border-color:#38bdf8;">
        <div style="font-size:2rem;">🎮📱</div>
        <h3 style="margin:0; color:#ffd447; font-size:1.15rem;">Pedido de Controle no Celular</h3>
        <p style="margin:4px 0; font-size:0.9rem; color:#fef3c7;">
          <strong>${String(requesterName).replace(/[<>&"']/g, '')}</strong> quer controlar o seu dinossauro pelo celular.
        </p>
        <div id="ctrl-confirm-timer" class="hud-pill" style="margin:0 auto; color:#7dd3fc;">⏳ Expira em ${secondsLeft}s</div>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:6px;">
          <button class="chunky-btn" id="ctrl-confirm-accept" style="flex:1;">✅ Aceitar</button>
          <button class="chunky-btn orange" id="ctrl-confirm-reject" style="flex:1;">❌ Recusar</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const cleanup = () => {
      clearInterval(tid);
      wrap.remove();
    };
    const tid = setInterval(() => {
      secondsLeft--;
      const tEl = wrap.querySelector('#ctrl-confirm-timer');
      if (tEl) tEl.textContent = `⏳ Expira em ${Math.max(0, secondsLeft)}s`;
      if (secondsLeft <= 0 && !settled) {
        settled = true;
        cleanup();
        onReject?.('Tempo esgotado (15s sem resposta).');
      }
    }, 1000);

    wrap.querySelector('#ctrl-confirm-accept')?.addEventListener('click', () => {
      if (settled) return;
      settled = true;
      cleanup();
      onAccept?.();
    });
    wrap.querySelector('#ctrl-confirm-reject')?.addEventListener('click', () => {
      if (settled) return;
      settled = true;
      cleanup();
      onReject?.('Pedido recusado pelo jogador.');
    });
  }

  openSection(section, sectionOpts = {}) {
    this._clearModal();
    const back = () => this.showMainMenu();

    switch (section) {
      case 'modes':
        Menus.renderModesModal(
          this.hud.modalLayer,
          this.game.modeId,
          this.game.customSeed,
          (modeId, seed) => { this.game.setMode(modeId, seed); },
          back
        );
        break;
      case 'dinos':
        this.activeCleanup = SelectionScreen.renderInto(this.hud.modalLayer, {
          onClose: back,
          onSelect: () => this.game.rebuildPlayers(),
          onPlayRoar: (id) => this.game.sfx.roar(id),
          onTestTrack: (id) => {
            this._clearModal();
            this.game.startTestTrack(id);
          }
        });
        break;
      case 'custom':
      case 'customize':
        this.activeCleanup = CustomizationScreen.renderInto(this.hud.modalLayer, {
          onClose: back,
          onApplyCustom: () => this.game.rebuildPlayers(),
          onOpenGacha: (afterGacha) => this.openGacha(afterGacha || (() => this.openSection('custom')))
        });
        break;
      case 'gacha':
        this.openGacha(back);
        break;
      case 'maps':
        Menus.renderMapsModal(
          this.hud.modalLayer,
          this.game.startBiomeId,
          this.game.sequenceBiomes,
          (biomeId, seq) => { this.game.setBiomeConfig(biomeId, seq); },
          back
        );
        break;
      case 'difficulty':
        Menus.renderDifficultyModal(this.hud.modalLayer, this.game.difficultyMgr, back);
        break;
      case 'missions':
        Menus.renderMissionsAndPassModal(this.hud.modalLayer, back);
        break;
      case 'album':
        Menus.renderAlbumAndHouseModal(this.hud.modalLayer, back);
        break;
      case 'records':
        Menus.renderRecordsModal(this.hud.modalLayer, back);
        break;
      case 'minigames':
        Menus.renderCityHubModal(this.hud.modalLayer, {
          onOpenShop: () => this.openSection('custom'),
          onOpenDinos: () => this.openSection('dinos'),
          onOpenMinigames: () => {
            this._clearModal();
            this.activeCleanup = MinigamesUI.openHub(this.hud.modalLayer, {
              onClose: back,
              sfx: this.game.sfx
            });
          },
          onClose: back
        });
        break;
      case 'multiplayer':
        this.activeCleanup = MultiplayerLobby.renderInto(this.hud.modalLayer, this.game.net, {
          initialRoom: sectionOpts.initialRoom || '',
          initialTransport: sectionOpts.initialTransport || '',
          onClose: back,
          onOpenController: (initialRoom, initialTransport) => {
            if (!isMobileDevice()) return;
            this.openController({
              initialRoom,
              initialTransport,
              showEntryChoice: true,
              deferredInstall: window.__DINO_DEFERRED_INSTALL__
            });
          },
          onOpenCustom: () => {
            this.activeCleanup = CustomizationScreen.renderInto(this.hud.modalLayer, {
              onClose: () => this.openSection('multiplayer'),
              onApplyCustom: () => this.game.rebuildPlayers(),
              onOpenGacha: () => this.openSection('multiplayer')
            });
          },
          onStartMatch: ({ room, botCount }) => {
            this._clearModal();
            this.game.startMultiplayerMatch(room, botCount);
          },
          onGuestStartMatch: (payload) => {
            this._clearModal();
            this.game.startMultiplayerGuestMatch(payload);
          }
        });
        break;
      case 'metagame':
        MetagameModal.renderInto(this.hud.modalLayer, this.game, () => {
          this.game.rebuildPlayers();
          back();
        });
        break;
      case 'controller':
        this.openController({ deferredInstall: window.__DINO_DEFERRED_INSTALL__ });
        break;
      case 'debug': {
        if (!import.meta.env.DEV) {
          back();
          break;
        }
        const wasPlaying = this.game.state === 'playing';
        if (wasPlaying) this.game.state = 'paused';
        import('./DebugModal.js').then(({ DebugModal }) => {
          DebugModal.renderInto(this.hud.modalLayer, this.game, () => {
            this._clearModal();
            if (wasPlaying) {
              this.game.state = 'playing';
              this.game.lastTime = performance.now();
            } else {
              back();
            }
          });
        });
        break;
      }
      case 'guide': {
        const wasPlaying = this.game.state === 'playing';
        if (wasPlaying) this.game.state = 'paused';
        GuideModal.renderInto(this.hud.modalLayer, {
          onClose: () => {
            this._clearModal();
            if (wasPlaying) {
              this.game.state = 'playing';
              this.game.lastTime = performance.now();
            } else {
              back();
            }
          },
          onStartTutorial: () => {
            this._clearModal();
            this.game.startTutorial();
          }
        });
        break;
      }
      case 'tutorial':
        this._clearModal();
        this.game.startTutorial();
        break;
      case 'extras':
        Menus.renderExtrasModal(
          this.hud.modalLayer,
          {
            tutorialDone: !!Save.data.tutorialDone,
            devMode: import.meta.env.DEV ? !!Save.data.devMode : false,
            lowSpec: !!Save.data.lowSpecMode,
            pinnedPredator: Save.data.pinnedPredator || ''
          },
          {
            onNavigate: (sec) => {
              this.game.sfx.click();
              this.openSection(sec);
            },
            onToggleLowSpec: () => {
              this.game.sfx.click();
              Save.data.lowSpecManual = true;
              PerfMonitor.applyLowSpec(this.game, !Save.data.lowSpecMode);
              this.openSection('extras');
            },
            onPinPredator: (predId) => {
              this.game.sfx.click();
              Save.data.pinnedPredator = predId || null;
              Save.save();
            },
            onClose: back
          }
        );
        break;
      case 'credits':
        Menus.renderCreditsModal(this.hud.modalLayer, () => this.openSection('extras'));
        break;
      case 'bestiary':
        Menus.renderBestiaryModal(this.hud.modalLayer, back);
        break;
      case 'profile':
        this.activeCleanup = ProfileModal.renderInto(this.hud.modalLayer, {
          initialTab: sectionOpts?.initialTab || 'profile',
          onClose: back,
          onOpenAchievements: () => this.openSection('achievements'),
          onOpenSave: () => this.openSection('save_data'),
          onOpenLegal: () => this.openSection('legal'),
          onProfileUpdated: () => {
            this.game.rebuildPlayers?.();
          }
        });
        break;
      case 'achievements':
        AchievementsModal.renderInto(this.hud.modalLayer, {
          onClose: back
        });
        break;
      case 'save_data':
        SaveModal.renderInto(this.hud.modalLayer, {
          onClose: back,
          onOpenLegal: () => this.openSection('legal'),
          onAfterImport: () => {
            this.applyVisualSettings();
            this.game.rebuildPlayers?.();
          }
        });
        break;
      case 'legal':
      case 'report':
        LegalModal.renderInto(this.hud.modalLayer, {
          initialTab: section === 'report' ? 'report' : 'terms',
          onOpenSettings: () => this.openSection('settings'),
          onAfterWipe: () => {
            this.applyVisualSettings();
            this.game.rebuildPlayers?.();
          },
          onClose: back
        });
        break;
      case 'settings':
        SettingsModal.renderInto(this.hud.modalLayer, {
          onClose: back,
          onRunBenchmark: () => PerfMonitor.runTimedBenchmark(this.game, 1050),
          onOpenLegal: () => this.openSection('legal'),
          onApplySettings: () => {
            this.applyVisualSettings();
            this.game.applySettings();
          }
        });
        break;
      default:
        back();
    }
  }
}
