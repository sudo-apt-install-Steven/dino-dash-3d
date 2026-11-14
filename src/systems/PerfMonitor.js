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

  static detectHardwareProfile(renderer = null) {
    let gpuName = '';
    let maxTex = 0;
    let isWebGL2 = false;
    try {
      const gl = renderer?.getContext?.() || null;
      if (gl) {
        isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0);
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          gpuName = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
        }
        if (!gpuName) {
          gpuName = String(gl.getParameter(gl.RENDERER) || '');
        }
      }
    } catch {
      gpuName = '';
    }
    const lower = gpuName.toLowerCase();
    const isSoftwareRenderer = /(swiftshader|llvmpipe|software adapter|microsoft basic render|lavapipe)/i.test(lower);
    const hasGpuBrand = /(nvidia|rtx|gtx|radeon\s+rx|rx\s*\d{3,4}|radeon\s+pro|amd|arc\s+a\d+|quadro|titan|apple\s+m[1-9]|geforce|adreno\s+[678]\d\d|mali-g7[6-9]|mali-g[89]\d)/i.test(lower);
    const cores = Number(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 0) || 4;
    const memoryGb = Number(typeof navigator !== 'undefined' ? navigator.deviceMemory : 0) || 4;
    const maskedCapableDesktop = !isSoftwareRenderer && !/mobile|android|iphone/i.test(navigator?.userAgent || '') && (isWebGL2 || maxTex >= 8192) && cores >= 6;
    const isDedicatedGpu = !isSoftwareRenderer && (hasGpuBrand || maskedCapableDesktop);
    return { gpuName, isDedicatedGpu, isSoftwareRenderer, cores, memoryGb, maxTex, isWebGL2 };
  }

  static classifyFps(fps, hw = null) {
    if (fps >= 48) return { tier: 'Alto', tierColor: '#58d63a', lowSpecSuggested: false };
    if (fps >= 32) return { tier: 'Médio', tierColor: '#ffd447', lowSpecSuggested: false };
    // GPUs dedicadas e desktops com WebGL2 + >=6 threads não devem receber alerta falso de "PC fraco"
    const isHighSpecHw = hw?.isDedicatedGpu && !hw?.isSoftwareRenderer && (hw?.cores || 4) >= 4;
    if (isHighSpecHw && fps >= 20) {
      return { tier: 'Médio', tierColor: '#ffd447', lowSpecSuggested: false };
    }
    return { tier: 'Baixo', tierColor: '#ff6b6b', lowSpecSuggested: !isHighSpecHw && fps < 24 };
  }

  static runTimedBenchmark(game, durationMs = 1350, onProgress = null) {
    return new Promise((resolve) => {
      const hw = PerfMonitor.detectHardwareProfile(game?.renderer);
      try {
        if (game?.renderer && game?.scene && game?.camera) {
          game.renderer.compile?.(game.scene, game.camera);
          game.renderer.render(game.scene, game.camera);
        }
      } catch {
        // segue normalmente se renderer mockado não possuir compile
      }

      const start = performance.now();
      let warmupFrames = 0;
      let prevTime = start;
      const deltas = [];
      let measuredFrames = 0;

      const step = (now) => {
        if (typeof document !== 'undefined' && document.hidden) {
          prevTime = now;
          requestAnimationFrame(step);
          return;
        }
        if (game?.renderer && game?.scene && game?.camera) {
          try {
            game.renderer.render(game.scene, game.camera);
          } catch {}
        }
        const elapsedMs = Math.max(1, now - start);

        // Descarta os primeiros frames de compilação de shaders / transição de splash
        if (warmupFrames < 18 && elapsedMs < 550) {
          warmupFrames++;
          prevTime = now;
          if (onProgress) onProgress(Math.min(0.28, elapsedMs / durationMs), warmupFrames);
          requestAnimationFrame(step);
          return;
        }

        const frameDelta = now - prevTime;
        prevTime = now;
        if (frameDelta > 2 && frameDelta < 75) {
          deltas.push(frameDelta);
        }
        measuredFrames++;
        if (onProgress) onProgress(Math.min(1, elapsedMs / durationMs), measuredFrames);

        if ((elapsedMs >= durationMs && deltas.length >= 26) || (elapsedMs >= 1000 && deltas.length >= 48) || elapsedMs >= durationMs + 650) {
          let estFps = hw.isDedicatedGpu ? 60 : 56;
          if (deltas.length >= 8) {
            const sorted = [...deltas].sort((a, b) => a - b);
            const trimStart = Math.floor(sorted.length * 0.12);
            const trimEnd = Math.max(trimStart + 1, Math.ceil(sorted.length * 0.78));
            const core = sorted.slice(trimStart, trimEnd);
            const median = core[Math.floor(core.length / 2)] || sorted[Math.floor(sorted.length / 2)];
            estFps = Math.round(1000 / Math.max(6.8, median));
          } else {
            estFps = Math.round((measuredFrames * 1000) / Math.max(1, elapsedMs));
          }
          if (hw.isDedicatedGpu && estFps >= 48 && estFps <= 63) {
            estFps = 60;
          }
          estFps = Math.max(20, Math.min(144, estFps));
          const info = PerfMonitor.classifyFps(estFps, hw);
          Save.data.benchmarkFps = estFps;
          Save.data.benchmarkTier = info.tier;
          Save.data.benchmarkDone = true;
          Save.data.benchmarkVersion = 3;
          Save.data.benchmarkGpu = hw.gpuName || '';
          Save.save();
          resolve({
            estFps,
            frameCount: measuredFrames,
            elapsedMs: Math.round(elapsedMs),
            hardware: hw,
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
    // Fallback síncrono rápido quando usado fora de loop RAF
    const hw = PerfMonitor.detectHardwareProfile(renderer);
    const t0 = performance.now();
    let acc = 0;
    const size = renderer ? 32 : 16;
    for (let i = 0; i < 90000; i++) {
      acc += Math.sin(i * 0.01) * Math.cos(i * 0.007) + (i % size);
    }
    const elapsedMs = Math.max(1, performance.now() - t0);
    let estFps = Math.max(28, Math.min(120, Math.round(60 * (28 / Math.max(8, elapsedMs)))));
    if (hw.isDedicatedGpu && estFps < 60 && (hw.cores || 4) >= 6) {
      estFps = 60;
    }
    const info = PerfMonitor.classifyFps(estFps, hw);
    Save.data.benchmarkFps = estFps;
    Save.data.benchmarkTier = info.tier;
    Save.data.benchmarkDone = true;
    Save.data.benchmarkVersion = 3;
    Save.data.benchmarkGpu = hw.gpuName || '';
    Save.save();
    return { estFps, elapsedMs: Math.round(elapsedMs), hardware: hw, ...info, acc };
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
    if (!game || game.state !== 'playing') return null;
    if (typeof document !== 'undefined' && document.hidden) return null;
    if ((game.runTime || 0) < 6.0) return null;
    if (dt <= 0 || dt > 0.045 || game.hitStopTimer > 0 || game.events?.predators?.state === 'intro') {
      return null;
    }

    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < 3.5) return null;

    this.avgFps = Math.round(this.frames / this.elapsed);
    this.frames = 0;
    this.elapsed = 0;

    const shouldLod = !!Save.data.lowSpecMode || this.avgFps < 32;
    if (shouldLod !== this.lowLod) {
      this.lowLod = shouldLod;
      game?.setLowLod?.(shouldLod);
    }

    if (!Save.data.autoQuality || Save.data.lowSpecMode) return null;

    if (this.avgFps < 30) {
      this.lowStreak++;
      if (this.lowStreak >= 4) {
        this.lowStreak = 0;
        const s = Save.data.settings;
        const hw = PerfMonitor.detectHardwareProfile(game?.renderer);
        if (s.shadows && (!hw.isDedicatedGpu || this.avgFps < 26)) {
          s.shadows = false;
          game?.applySettings?.();
          Save.save();
          return '⚡ Auto-Qualidade: sombras reduzidas para manter o FPS estável.';
        }
        if (s.quality !== 'low' && (!hw.isDedicatedGpu && this.avgFps < 24)) {
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
