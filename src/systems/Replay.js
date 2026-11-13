// Sistema de Fantasma (Ghost) para Contra-Relógio, Replay cinematográfico e Seed compartilhável.
import { Save } from './Save.js';

export function getTodaySeed() {
  return `DAILY-${new Date().toISOString().slice(0, 10)}`;
}

export class ReplayRecorder {
  constructor() {
    this.frames = [];
    this.sampleTimer = 0;
  }

  reset() {
    this.frames = [];
    this.sampleTimer = 0;
  }

  record(dt, time, player) {
    this.sampleTimer += dt;
    if (this.sampleTimer < 0.05) return; // 20Hz leve
    this.sampleTimer = 0;
    if (this.frames.length < 3600) {
      this.frames.push({
        t: Number(time.toFixed(2)),
        x: Number(player.x.toFixed(2)),
        y: Number(player.y.toFixed(2)),
        duck: player.ducking ? 1 : 0
      });
    }
  }

  saveGhostIfBest(score) {
    const best = Save.data.ghostRuns?.bestScore || 0;
    if (score > best && this.frames.length > 10) {
      Save.data.ghostRuns = { bestScore: Math.floor(score), frames: this.frames.slice(0, 2400) };
      Save.save();
      return true;
    }
    return false;
  }

  static sampleFrame(frames, time) {
    if (!frames || frames.length === 0) return null;
    const idx = Math.min(frames.length - 1, Math.floor(time / 0.05));
    return frames[idx];
  }
}
