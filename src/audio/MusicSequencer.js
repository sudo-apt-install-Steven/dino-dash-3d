// Sequenciador musical em camadas (Ideia 143): percussão e arpejos de tensão entram por velocidade e perigo.

const MELODY_PATTERN = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 349.23, 440.0];
const BASS_PATTERN = [130.81, 130.81, 164.81, 196.0, 146.83, 146.83, 174.61, 196.0];
const TENSION_ARP = [523.25, 622.25, 783.99, 622.25, 587.33, 698.46, 880.0, 698.46];

export class MusicSequencer {
  constructor(engine) {
    this.engine = engine;
    this.step = 0;
    this.accum = 0;
    this.playing = false;
  }

  setPlaying(enabled) {
    this.playing = enabled;
  }

  update(dt, speed = 18, dangerLevel = 0) {
    if (!this.playing || !this.engine.unlocked) return;
    const bpm = Math.min(190, 112 + Math.max(0, speed - 18) * 2.4 + dangerLevel * 12);
    const stepInterval = 60 / bpm / 2;

    this.accum += dt;
    if (this.accum < stepInterval) return;
    this.accum -= stepInterval;

    const idx = this.step % MELODY_PATTERN.length;
    const bassFreq = BASS_PATTERN[idx];
    const melFreq = MELODY_PATTERN[idx];

    // Camada 1: Baixo constante
    this.engine.playTone({
      freq: bassFreq,
      duration: stepInterval * 0.85,
      type: 'triangle',
      gain: 0.12,
      bus: 'music'
    });

    // Camada 2: Melodia principal
    if (this.step % 2 === 0) {
      this.engine.playTone({
        freq: melFreq,
        duration: stepInterval * 0.75,
        type: 'square',
        gain: 0.055,
        bus: 'music'
      });
    }

    // Camada 3: Percussão extra quando velocidade sobe (>21)
    if (speed > 21 || this.step % 4 === 2) {
      this.engine.playNoise({
        duration: speed > 24 && this.step % 2 === 1 ? 0.055 : 0.035,
        filterFreq: this.step % 4 === 0 ? 320 : 3400,
        gain: speed > 24 ? 0.055 : 0.038,
        bus: 'music'
      });
    }

    // Camada 4: Arpejo de tensão em boss, evento perigoso ou vida baixa
    if (dangerLevel >= 1 && this.step % 2 === 1) {
      this.engine.playTone({
        freq: TENSION_ARP[idx],
        duration: stepInterval * 0.55,
        type: 'sawtooth',
        gain: 0.036,
        bus: 'music'
      });
    }

    this.step++;
  }
}
