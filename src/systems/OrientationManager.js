// Gerenciador de Orientação Mobile (Retrato <-> Paisagem Automático e Forçado):
// Garante que ao deitar o celular (mesmo com rotação bloqueada no sistema ou via giroscópio/botão),
// o jogo 3D, a HUD e o Controle Jurássico deitem perfeitamente em tela cheia horizontal.
import { Save } from './Save.js';

class OrientationManagerSystem {
  constructor() {
    this.listeners = new Set();
    this.isForcedLandscape = false;
    this.tiltLandscapeActive = false;
    this._tiltHoldAccum = 0;
    this._lastTiltCheck = performance.now();
    this._bound = false;
  }

  init() {
    if (this._bound || typeof window === 'undefined') return;
    this._bound = true;

    const triggerSync = () => {
      this._applyClasses();
      setTimeout(() => this._applyClasses(), 90);
      setTimeout(() => this._applyClasses(), 260);
    };

    window.addEventListener('resize', triggerSync);
    window.addEventListener('orientationchange', triggerSync);
    window.screen?.orientation?.addEventListener?.('change', triggerSync);
    window.visualViewport?.addEventListener?.('resize', triggerSync);

    // Sensor de inclinação física (DeviceOrientation): se o usuário deitar o celular fisicamente
    // mesmo com bloqueio de rotação do Android/iOS ativo, gira a interface automaticamente!
    window.addEventListener('deviceorientation', (e) => {
      if (Save.data?.settings?.autoRotateTilt === false) return;
      const isCoarse = window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 960;
      if (!isCoarse) return;
      const gamma = Number(e.gamma); // inclinação lateral (-90 a 90)
      const beta = Number(e.beta);   // inclinação frontal (-180 a 180)
      if (!Number.isFinite(gamma) || !Number.isFinite(beta)) return;

      const now = performance.now();
      const dt = Math.min(0.25, Math.max(0.01, (now - this._lastTiltCheck) / 1000));
      this._lastTiltCheck = now;

      const layingSideways = Math.abs(gamma) > 52 && Math.abs(beta) < 46;
      const standingUpright = Math.abs(beta) > 58 && Math.abs(gamma) < 28;

      if (layingSideways && !this.tiltLandscapeActive) {
        this._tiltHoldAccum += dt;
        if (this._tiltHoldAccum >= 0.35) {
          this.tiltLandscapeActive = true;
          this._tiltHoldAccum = 0;
          this._applyClasses();
        }
      } else if (standingUpright && this.tiltLandscapeActive && !Save.data?.settings?.forceLandscape) {
        this._tiltHoldAccum += dt;
        if (this._tiltHoldAccum >= 0.35) {
          this.tiltLandscapeActive = false;
          this._tiltHoldAccum = 0;
          this._applyClasses();
        }
      } else {
        this._tiltHoldAccum = Math.max(0, this._tiltHoldAccum - dt * 0.5);
      }
    }, { passive: true });

    this._applyClasses();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  isNativeLandscape() {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= window.innerHeight;
  }

  isEffectiveLandscape() {
    return this.isNativeLandscape() || this.isForcedLandscape;
  }

  async toggleForceLandscape(force = null) {
    const curWanted = Boolean(Save.data?.settings?.forceLandscape || this.tiltLandscapeActive);
    const next = force !== null ? Boolean(force) : !curWanted;
    if (Save.data?.settings) {
      Save.data.settings.forceLandscape = next;
      Save.save();
    }
    this.tiltLandscapeActive = next;

    // Tenta usar API nativa de orientação se suportada em tela cheia
    try {
      if (next && screen.orientation?.lock) {
        await screen.orientation.lock('landscape').catch(() => {});
      } else if (!next && screen.orientation?.unlock) {
        screen.orientation.unlock();
      }
    } catch {
      // fallback CSS rotacionado 90 graus cobre 100% dos navegadores mobile (iOS Safari / Chrome)
    }

    this._applyClasses();
    return this.isEffectiveLandscape();
  }

  _applyClasses() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const html = document.documentElement;
    const nativeLand = window.innerWidth >= window.innerHeight;
    const wantForce = Boolean(Save.data?.settings?.forceLandscape || this.tiltLandscapeActive);

    // Só aplica rotação CSS de 90° se o usuário quer paisagem mas o navegador continua em retrato (bloqueio do SO)
    this.isForcedLandscape = wantForce && !nativeLand;

    html.classList.toggle('force-landscape-rot', this.isForcedLandscape);
    html.classList.toggle('is-landscape-view', nativeLand || this.isForcedLandscape);
    html.classList.toggle('is-portrait-view', !nativeLand && !this.isForcedLandscape);

    const vp = this.getViewportSize();
    for (const fn of this.listeners) {
      try { fn(vp); } catch {}
    }
  }

  getViewportSize() {
    if (typeof window === 'undefined') {
      return { width: 1280, height: 720, isForcedRotated: false, isLandscape: true };
    }
    const rawW = Math.max(1, window.innerWidth || 390);
    const rawH = Math.max(1, window.innerHeight || 844);
    if (this.isForcedLandscape && rawW < rawH) {
      return {
        width: rawH,
        height: rawW,
        isForcedRotated: true,
        isLandscape: true
      };
    }
    return {
      width: rawW,
      height: rawH,
      isForcedRotated: false,
      isLandscape: rawW >= rawH
    };
  }

  // Converte coordenadas de ponteiro (clientX, clientY) para o espaço visual do #app quando rotacionado 90°
  mapPointerCoords(clientX, clientY) {
    if (!this.isForcedLandscape || typeof window === 'undefined') {
      return { x: clientX, y: clientY };
    }
    const rawW = window.innerWidth || 390;
    return {
      x: clientY,
      y: rawW - clientX
    };
  }
}

export const OrientationManager = new OrientationManagerSystem();
