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
import { GachaSystem } from '../systems/GachaSystem.js';
import { PerfMonitor } from '../systems/PerfMonitor.js';
import { getModeDef } from '../game/Modes.js';
import { getDinoSpec, getEffectiveDinoHabitat } from '../dinos/DinoCatalog.js';
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
    const habInfo = getEffectiveDinoHabitat(dinoSpec, {
      hybrid: Save.data.hybrid,
      mutationId: Save.data.equippedMutation
    });
    const pureAqua = !habInfo.canWalkOnLand;
    const rawBiome = getBiomeById(this.game.startBiomeId);
    const shownBiome = (pureAqua && !isAquaticBiome(rawBiome))
      ? (isAquaticBiome(this.game.currentBiome) ? this.game.currentBiome : getBiomeById('ocean_surface'))
      : rawBiome;
    const biomeLabel = this.game.startBiomeId === 'random_portal'
      ? (pureAqua ? 'Aleatório (Oceano/Portais)' : 'Aleatório (Portais)')
      : (pureAqua && !isAquaticBiome(rawBiome)
        ? `${shownBiome.name} (Aquático)`
        : (this.game.sequenceBiomes
          ? `Sequência (${shownBiome.name})`
          : shownBiome.name));
    const isPerf = !!Save.data.perfectMode && modeDef.id !== 'zen';
    const effectiveLives = (isPerf || modeDef.id === 'hardcore')
      ? 1
      : Math.max(1, Math.min(7, diffCfg.lives + Math.floor((Save.data.talents?.vitality || 0) / 2) + ((dinoSpec.stats?.hp ?? 3) - 3)));

    Menus.renderMainMenu(
      this.hud.modalLayer,
      {
        modeName: modeDef.name,
        diffName: diffCfg.name,
        dinoName: dinoSpec.name,
        effectiveLives,
        biomeLabel,
        fossilCrates: GachaSystem.getCrateCount(),
        lowSpec: !!Save.data.lowSpecMode,
        benchmarkFps: Save.data.benchmarkFps || 0,
        benchmarkTier: Save.data.benchmarkTier || '',
        tutorialDone: !!Save.data.tutorialDone,
        devMode: import.meta.env.DEV ? !!Save.data.devMode : false
      },
      {
        onPlay: () => {
          this.game.sfx.click();
          this._clearModal();
          this.game.startRun();
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
    this._clearModal();
    this.hud.setPlayingUI(false);
    this.hud.hideGameOver();
    this.hud.showPause(false);
    const ctrl = new MobileController(this.hud.modalLayer, this.game.net, {
      ...opts,
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

  openSection(section) {
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
          onClose: back,
          onOpenController: (initialRoom, initialTransport) => {
            if (this.game.net.isConnected) {
              this.game.net.sendPlayerMeta({ role: 'controller' });
            }
            this.openController({
              initialRoom,
              initialTransport,
              deferredInstall: window.__DINO_DEFERRED_INSTALL__
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
