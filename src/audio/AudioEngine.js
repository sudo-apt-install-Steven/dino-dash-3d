// Motor WebAudio procedural com controle separado de música, efeitos e mute.
import { Save } from '../systems/Save.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.unlocked = false;
  }

  ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.applyVolumes();
    this.unlocked = true;
    return this.ctx;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const cfg = Save.data.settings.audio;
    const muted = cfg.muted ? 0 : 1;
    this.masterGain.gain.setValueAtTime(muted, this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(cfg.music ?? 0.45, this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(cfg.sfx ?? 0.75, this.ctx.currentTime);
  }

  playTone({
    freq = 440,
    endFreq = null,
    duration = 0.14,
    type = 'square',
    gain = 0.25,
    bus = 'sfx',
    delay = 0
  }) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(25, freq), now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), now + duration);
    }

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(g);
    g.connect(bus === 'music' ? this.musicGain : this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playNoise({ duration = 0.18, filterFreq = 900, gain = 0.2, bus = 'sfx', delay = 0 }) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.1;

    const g = ctx.createGain();
    const now = ctx.currentTime + delay;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(bus === 'music' ? this.musicGain : this.sfxGain);
    src.start(now);
  }
}
