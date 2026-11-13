// Biblioteca de efeitos sonoros sintetizados + rugido único para cada um dos 14 dinos.
import { getDinoSpec } from '../dinos/DinoCatalog.js';

export class SoundEffects {
  constructor(engine) {
    this.engine = engine;
  }

  jump(charged = false) {
    this.engine.playTone({
      freq: charged ? 240 : 280,
      endFreq: charged ? 720 : 560,
      duration: charged ? 0.2 : 0.13,
      type: 'square',
      gain: 0.18
    });
  }

  land() {
    this.engine.playNoise({ duration: 0.08, filterFreq: 320, gain: 0.15 });
  }

  dash() {
    this.engine.playNoise({ duration: 0.1, filterFreq: 1400, gain: 0.14 });
    this.engine.playTone({ freq: 420, endFreq: 210, duration: 0.08, type: 'triangle', gain: 0.12 });
  }

  slide() {
    this.engine.playNoise({ duration: 0.22, filterFreq: 700, gain: 0.16 });
  }

  egg(chain = 1) {
    const base = 520 + Math.min(chain, 12) * 45;
    this.engine.playTone({ freq: base, endFreq: base * 1.35, duration: 0.1, type: 'sine', gain: 0.24 });
    this.engine.playTone({ freq: base * 1.5, duration: 0.08, type: 'triangle', gain: 0.15, delay: 0.05 });
  }

  nearMiss() {
    this.engine.playTone({ freq: 740, endFreq: 980, duration: 0.09, type: 'triangle', gain: 0.15 });
  }

  stomp() {
    this.engine.playTone({ freq: 180, endFreq: 75, duration: 0.14, type: 'sawtooth', gain: 0.26 });
    this.engine.playTone({ freq: 540, endFreq: 780, duration: 0.1, type: 'square', gain: 0.16, delay: 0.04 });
  }

  powerup() {
    [440, 554, 659, 880].forEach((f, idx) => {
      this.engine.playTone({ freq: f, duration: 0.09, type: 'triangle', gain: 0.18, delay: idx * 0.055 });
    });
  }

  hurt() {
    this.engine.playTone({ freq: 210, endFreq: 68, duration: 0.26, type: 'sawtooth', gain: 0.3 });
    this.engine.playNoise({ duration: 0.22, filterFreq: 420, gain: 0.25 });
  }

  roar(dinoId) {
    const spec = getDinoSpec(dinoId);
    const pitch = spec.roarPitch || 110;
    this.engine.playTone({
      freq: pitch * 1.25,
      endFreq: pitch * 0.58,
      duration: 0.42,
      type: spec.dinoClass === 'herbivore' ? 'triangle' : 'sawtooth',
      gain: 0.28
    });
    this.engine.playTone({
      freq: pitch * 0.72,
      endFreq: pitch * 0.42,
      duration: 0.38,
      type: 'square',
      gain: 0.15,
      delay: 0.05
    });
    this.engine.playNoise({ duration: 0.34, filterFreq: pitch * 4.2, gain: 0.16 });
  }

  fury() {
    [220, 330, 440, 660].forEach((f, idx) => {
      this.engine.playTone({ freq: f, duration: 0.16, type: 'sawtooth', gain: 0.2, delay: idx * 0.05 });
    });
  }

  card(isLegendary = false) {
    const notes = isLegendary ? [523, 659, 784, 1046] : [440, 554, 659];
    notes.forEach((f, i) => {
      this.engine.playTone({ freq: f, duration: 0.14, type: 'triangle', gain: 0.2, delay: i * 0.06 });
    });
  }

  meteor() {
    this.engine.playTone({ freq: 140, endFreq: 42, duration: 0.45, type: 'sawtooth', gain: 0.28 });
    this.engine.playNoise({ duration: 0.4, filterFreq: 260, gain: 0.26 });
  }

  ufo() {
    this.engine.playTone({ freq: 620, endFreq: 960, duration: 0.18, type: 'sine', gain: 0.18 });
    this.engine.playTone({ freq: 960, endFreq: 520, duration: 0.2, type: 'sine', gain: 0.18, delay: 0.18 });
  }

  evolution() {
    [392, 523, 659, 784, 1046].forEach((f, i) => {
      this.engine.playTone({ freq: f, duration: 0.16, type: 'sine', gain: 0.22, delay: i * 0.07 });
    });
  }

  victory() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      this.engine.playTone({ freq: f, duration: 0.2, type: 'triangle', gain: 0.22, delay: i * 0.09 });
    });
  }

  click() {
    this.engine.playTone({ freq: 640, endFreq: 820, duration: 0.05, type: 'triangle', gain: 0.12 });
  }

  melee() {
    this.engine.playNoise({ duration: 0.12, filterFreq: 850, gain: 0.22 });
    this.engine.playTone({ freq: 240, endFreq: 95, duration: 0.12, type: 'sawtooth', gain: 0.2 });
  }

  grapple() {
    this.engine.playTone({ freq: 380, endFreq: 880, duration: 0.18, type: 'triangle', gain: 0.2 });
  }

  reaction() {
    [480, 720, 960, 1240].forEach((f, i) => {
      this.engine.playTone({ freq: f, duration: 0.1, type: 'sine', gain: 0.2, delay: i * 0.04 });
    });
  }
}
