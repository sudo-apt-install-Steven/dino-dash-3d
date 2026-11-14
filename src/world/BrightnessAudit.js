// Auditor automático de luminosidade, contraste e visibilidade por bioma, horário e clima.
import * as THREE from 'three';
import { BIOMES } from './Biomes.js';

const PHASES = [
  { id: 'sunset', label: 'Pôr do Sol', sun: 1.85, hemi: 1.05, rim: 1.10, fill: 1.18, fogMult: 1.0 },
  { id: 'dusk', label: 'Crepúsculo', sun: 1.52, hemi: 0.96, rim: 1.28, fill: 1.54, fogMult: 1.05 },
  { id: 'night', label: 'Noite', sun: 1.28, hemi: 0.95, rim: 1.41, fill: 1.73, fogMult: 1.05 },
  { id: 'eclipse', label: 'Eclipse', sun: 1.22, hemi: 0.92, rim: 1.47, fill: 1.83, fogMult: 1.1 }
];

const WEATHERS_LIST = ['clear', 'rain', 'snow', 'wind'];

export function relativeLuminance(hexOrColor) {
  // THREE.Color armazena R, G, B já convertidos para sRGB linear em versões recentes
  const c = hexOrColor instanceof THREE.Color ? hexOrColor : new THREE.Color(hexOrColor || '#000000');
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

export function runStaticLightingAudit(brightnessMult = 1.05, clearVision = false) {
  const results = [];
  let passed = 0;

  for (const biome of BIOMES) {
    const t = biome.theme || {};
    const trackColor = new THREE.Color(t.track || '#e0ae63');
    for (let s = 0; s < 12 && relativeLuminance(trackColor) < 0.18; s++) {
      trackColor.offsetHSL(0, 0, 0.04);
    }
    const groundColor = new THREE.Color(t.ground || '#c47b47');
    for (let s = 0; s < 10 && relativeLuminance(groundColor) < 0.095; s++) {
      groundColor.offsetHSL(0, 0, 0.04);
    }
    const stripeColor = new THREE.Color(t.stripe || '#f3d08f');
    const trackLum = relativeLuminance(trackColor);
    const groundLum = relativeLuminance(groundColor);
    const stripeContrast = contrastRatio(trackColor, stripeColor);
    const trackEdgeContrast = contrastRatio(trackColor, groundColor);
    const baseFogDens = clearVision ? 0.006 : Math.min(0.016, t.fogDensity ?? 0.011);

    for (const ph of PHASES) {
      const totalLight = (ph.sun * 0.55 + ph.hemi * 0.45 + ph.rim * 0.18 + ph.fill * 0.22) * brightnessMult;
      const effectiveTrackBrightness = Math.min(1, trackLum * totalLight);
      const effectiveSky = ph.id === 'eclipse'
        ? new THREE.Color('#382b6e')
        : ph.id === 'night'
          ? new THREE.Color(t.sky || '#293b75').lerp(new THREE.Color('#2a3f7d'), 0.55)
          : ph.id === 'dusk'
            ? new THREE.Color(t.sky || '#5a2d6b').lerp(new THREE.Color('#472a6e'), 0.42)
            : new THREE.Color(t.sky || '#f28b50');

      const skyLum = relativeLuminance(effectiveSky);
      const dens = Math.min(0.017, baseFogDens * ph.fogMult);
      const fogVis35m = Math.exp(-Math.pow(dens * 35, 2));

      const ok =
        effectiveTrackBrightness >= 0.26 &&
        skyLum >= 0.025 &&
        fogVis35m >= 0.68 &&
        stripeContrast >= 1.25 &&
        trackEdgeContrast >= 1.1;

      if (ok) passed++;
      results.push({
        biomeId: biome.id,
        biomeName: biome.name,
        phase: ph.id,
        phaseLabel: ph.label,
        weathersChecked: WEATHERS_LIST.length,
        effectiveTrackBrightness: Number(effectiveTrackBrightness.toFixed(3)),
        skyLum: Number(skyLum.toFixed(3)),
        stripeContrast: Number(stripeContrast.toFixed(2)),
        fogVis35m: Number((fogVis35m * 100).toFixed(1)),
        ok
      });
    }
  }

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    weathersCovered: WEATHERS_LIST.length,
    results
  };
}

export function runLiveRenderAudit(game) {
  const staticReport = runStaticLightingAudit(
    game?.world?.brightnessMult ?? 1.05,
    !!game?.world?.clearVision
  );

  if (!game?.renderer || !game?.scene || !game?.camera || !game?.world) {
    return { ...staticReport, liveSamples: 0 };
  }

  const prevBiome = game.currentBiome;
  const prevCycle = game.dayNight.cycleTime;
  const prevEclipse = game.dayNight.eclipseTimer;
  const rt = new THREE.WebGLRenderTarget(64, 48);
  const buf = new Uint8Array(64 * 48 * 4);
  const sampleStats = [];

  try {
    game.renderer.setRenderTarget(rt);
    for (const biome of BIOMES) {
      game.world.applyTheme(biome.theme, true);
      for (const ph of PHASES) {
        game.dayNight.eclipseTimer = ph.id === 'eclipse' ? 5 : 0;
        game.dayNight.cycleTime = ph.id === 'sunset' ? 10 : (ph.id === 'dusk' ? 50 : 80);
        game.dayNight.update(0.016, biome.theme);
        game.world.update(0.016, 0);
        game.renderer.render(game.scene, game.camera);
        game.renderer.readRenderTargetPixels(rt, 0, 0, 64, 48, buf);

        let sumLum = 0;
        let minLum = 1;
        let maxLum = 0;
        const pixels = 64 * 48;
        for (let i = 0; i < pixels; i++) {
          const r = buf[i * 4] / 255;
          const g = buf[i * 4 + 1] / 255;
          const b = buf[i * 4 + 2] / 255;
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          sumLum += l;
          if (l < minLum) minLum = l;
          if (l > maxLum) maxLum = l;
        }
        const meanLum = sumLum / pixels;
        sampleStats.push({
          biome: biome.id,
          phase: ph.id,
          meanLum: Number(meanLum.toFixed(3)),
          dynamicRange: Number((maxLum - minLum).toFixed(3)),
          ok: meanLum >= 0.08 && (maxLum - minLum) >= 0.14
        });
      }
    }
  } finally {
    game.renderer.setRenderTarget(null);
    rt.dispose();
    game.dayNight.eclipseTimer = prevEclipse;
    game.dayNight.cycleTime = prevCycle;
    if (prevBiome) game.world.applyTheme(prevBiome.theme, true);
  }

  const livePassed = sampleStats.filter((s) => s.ok).length;
  return {
    ...staticReport,
    liveSamples: sampleStats.length,
    livePassed,
    liveFailed: sampleStats.length - livePassed,
    sampleStats
  };
}
