// Telemetria Anônima Opt-in (Zero PII) e Painel de Erros em Runtime.
import { Save } from './Save.js';

const MAX_ERRORS = 25;

class TelemetrySystem {
  constructor() {
    this.errors = [];
    this.counters = {
      sessions: 0,
      runsStarted: 0,
      bossesDefeated: 0
    };
    this._initialized = false;
  }

  init() {
    if (this._initialized || typeof window === 'undefined') return;
    this._initialized = true;

    window.addEventListener('error', (ev) => {
      this.recordError('error', ev?.message || 'Unknown error', ev?.filename, ev?.lineno);
    });

    window.addEventListener('unhandledrejection', (ev) => {
      const reason = ev?.reason?.message || String(ev?.reason || 'Unhandled rejection');
      this.recordError('promise', reason);
    });

    this.trackEvent('session_start');
  }

  isOptedIn() {
    return Boolean(Save.data?.settings?.analyticsOptIn);
  }

  setOptIn(enabled) {
    if (Save.data?.settings) {
      Save.data.settings.analyticsOptIn = Boolean(enabled);
      Save.save();
    }
  }

  trackEvent(eventName) {
    if (!this.isOptedIn()) return false;
    if (eventName === 'session_start') this.counters.sessions += 1;
    else if (eventName === 'run_start') this.counters.runsStarted += 1;
    else if (eventName === 'boss_defeated') this.counters.bossesDefeated += 1;
    return true;
  }

  recordError(kind, message, file = '', line = 0) {
    const cleanMsg = String(message || 'Error').slice(0, 180);
    const cleanFile = String(file || '').split('/').pop().slice(0, 60);
    this.errors.push({
      ts: new Date().toISOString(),
      kind: String(kind || 'error'),
      message: cleanMsg,
      location: cleanFile ? `${cleanFile}:${Number(line) || 0}` : 'runtime'
    });
    if (this.errors.length > MAX_ERRORS) {
      this.errors.shift();
    }
  }

  getErrorLog() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors.length = 0;
  }
}

export const Telemetry = new TelemetrySystem();
