// Monitoramento de Desempenho (Parte C): Benchmark inicial, Auto-Qualidade 60 FPS e preset "Meu PC é fraco".
import { Save } from './Save.js';

export class PerfMonitor {
  constructor() {
    this.frames = 0;
    this.elapsed = 0;
    this.avgFps = 60;
    this.lowStreak = 0;
    this.autoNotified = false;
  }

  static runQuickBenchmark(renderer) {
    // Micro-teste rápido (<200ms) para estimar capacidade de hardware sem travar o menu
    const t0 = performance.now();
    let acc = 0;
    const size = renderer ? 32 : 16;
    for (let i = 0; i < 90000; i++) {
      acc += Math.sin(i * 0.01) * Math.cos(i * 0.007) + (i % size);
    }
    const elapsedMs = Math.max(1, performance.now() - t0);
    // Normaliza para estimativa de FPS em GPU integrada/dispositivo
    const estFps = Math.max(24, Math.min(120, Math.round(60 * (26 / Math.max(8, elapsedMs)))));
    Save.data.benchmarkFps = estFps;
    Save.data.benchmarkDone = true;
    if (estFps < 40) {
      Save.data.lowSpecMode = true;
      Save.data.settings.quality = 'low';
      Save.data.settings.shadows = false;
      Save.data.settings.particles = 'min';
    }
    Save.save();
    return { estFps, elapsedMs: Math.round(elapsedMs), lowSpecSuggested: estFps < 40, acc };
  }

  static applyLowSpec(game, enabled) {
    Save.data.lowSpecMode = !!enabled;
    if (enabled) {
      Save.data.settings.quality = 'low';
      Save.data.settings.shadows = false;
      Save.data.settings.particles = 'min';
      if (game?.camera) {
        game.camera.far = 145;
        game.camera.updateProjectionMatrix();
      }
    } else {
      Save.data.settings.quality = 'medium';
      Save.data.settings.shadows = true;
      Save.data.settings.particles = 'normal';
      if (game?.camera) {
        game.camera.far = 260;
        game.camera.updateProjectionMatrix();
      }
    }
    Save.save();
    game?.applySettings?.();
  }

  recordFrame(dt, game) {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < 3.0) return null;

    this.avgFps = Math.round(this.frames / this.elapsed);
    this.frames = 0;
    this.elapsed = 0;

    if (!Save.data.autoQuality || Save.data.lowSpecMode) return null;

    if (this.avgFps < 46) {
      this.lowStreak++;
      if (this.lowStreak >= 2) {
        this.lowStreak = 0;
        const s = Save.data.settings;
        if (s.shadows) {
          s.shadows = false;
          game?.applySettings?.();
          Save.save();
          return '⚡ Auto-Qualidade: sombras reduzidas para manter 60 FPS!';
        }
        if (s.quality !== 'low') {
          s.quality = 'low';
          s.particles = 'min';
          game?.applySettings?.();
          Save.save();
          return '⚡ Auto-Qualidade: modo leve ativado para fluidez!';
        }
      }
    } else {
      this.lowStreak = 0;
    }
    return null;
  }
}
