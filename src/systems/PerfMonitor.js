// Monitoramento de Desempenho (Parte C): Benchmark inicial, Auto-Qualidade 60 FPS e preset "Meu PC é fraco".
import { Save } from './Save.js';

export class PerfMonitor {
  constructor() {
    this.frames = 0;
    this.elapsed = 0;
    this.avgFps = 60;
    this.lowStreak = 0;
    this.lowLod = false;
    this.autoNotified = false;
  }

  static classifyFps(fps) {
    if (fps >= 55) return { tier: 'Alto', tierColor: '#58d63a', lowSpecSuggested: false };
    if (fps >= 35) return { tier: 'Médio', tierColor: '#ffd447', lowSpecSuggested: false };
    return { tier: 'Baixo', tierColor: '#ff6b6b', lowSpecSuggested: true };
  }

  static runTimedBenchmark(game, durationMs = 1050, onProgress = null) {
    return new Promise((resolve) => {
      const start = performance.now();
      let frames = 0;
      const step = (now) => {
        if (game?.renderer && game?.scene && game?.camera) {
          game.renderer.render(game.scene, game.camera);
        }
        frames++;
        const elapsedMs = Math.max(1, now - start);
        if (onProgress) onProgress(Math.min(1, elapsedMs / durationMs), frames);
        if (elapsedMs >= durationMs || (elapsedMs >= 650 && frames >= 120)) {
          const estFps = Math.max(12, Math.min(144, Math.round((frames * 1000) / elapsedMs)));
          const info = PerfMonitor.classifyFps(estFps);
          Save.data.benchmarkFps = estFps;
          Save.data.benchmarkTier = info.tier;
          Save.data.benchmarkDone = true;
          Save.save();
          resolve({
            estFps,
            frameCount: frames,
            elapsedMs: Math.round(elapsedMs),
            ...info
          });
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  static runQuickBenchmark(renderer) {
    // Fallback síncrono rápido (<120ms) quando usado fora de loop RAF
    const t0 = performance.now();
    let acc = 0;
    const size = renderer ? 32 : 16;
    for (let i = 0; i < 90000; i++) {
      acc += Math.sin(i * 0.01) * Math.cos(i * 0.007) + (i % size);
    }
    const elapsedMs = Math.max(1, performance.now() - t0);
    const estFps = Math.max(24, Math.min(120, Math.round(60 * (26 / Math.max(8, elapsedMs)))));
    const info = PerfMonitor.classifyFps(estFps);
    Save.data.benchmarkFps = estFps;
    Save.data.benchmarkTier = info.tier;
    Save.data.benchmarkDone = true;
    Save.save();
    return { estFps, elapsedMs: Math.round(elapsedMs), ...info, acc };
  }

  static applyLowSpec(game, enabled) {
    Save.data.lowSpecMode = !!enabled;
    if (enabled) {
      Save.data.settings.quality = 'low';
      Save.data.settings.shadows = false;
      Save.data.settings.particles = 'min';
      if (game?.camera) {
        game.camera.far = 125;
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
    if (this.elapsed < 2.5) return null;

    this.avgFps = Math.round(this.frames / this.elapsed);
    this.frames = 0;
    this.elapsed = 0;

    const shouldLod = !!Save.data.lowSpecMode || this.avgFps < 45;
    if (shouldLod !== this.lowLod) {
      this.lowLod = shouldLod;
      game?.setLowLod?.(shouldLod);
    }

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
