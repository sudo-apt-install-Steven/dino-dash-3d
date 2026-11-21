// Modelos voxel esculpidos para os 13 dinos limitados.
// Convenção de coordenadas do DinoFactory: frente = -Z, cauda = +Z, cima = +Y.
import * as THREE from 'three';

export const LIMITED_BODY_SPECS = {
  scary_raptor: {
    scale: 0.98,
    colors: { primary: '#1fb6c8', secondary: '#a5f3fc', spots: '#facc15', spikes: '#eab308', eye: '#facc15' },
    proportions: { torsoW: 0.72, torsoH: 0.70, torsoD: 1.08, neckLen: 0.62, tailLen: 1.45 }
  },
  dracorex_solar: {
    scale: 1.0,
    colors: { primary: '#e9a41a', secondary: '#ffe9a8', spots: '#b5700b', spikes: '#fff0a0', eye: '#fff6d0' },
    proportions: { torsoW: 0.76, torsoH: 0.72, torsoD: 1.08 }
  },
  nebulossauro: {
    scale: 1.1,
    colors: { primary: '#35216e', secondary: '#7b5cc9', spots: '#1e1146', spikes: '#6ee7f2', eye: '#6ee7f2' },
    proportions: { torsoW: 0.86, torsoH: 0.68, torsoD: 1.28, quadruped: true }
  },
  cristaloceratops: {
    scale: 1.1,
    colors: { primary: '#1f6f8b', secondary: '#8fd8ea', spots: '#14485c', spikes: '#7ff0ff', eye: '#ffe08a' },
    proportions: { torsoW: 0.92, torsoH: 0.68, torsoD: 1.38, quadruped: true }
  },
  abissal_espectral: {
    scale: 1.12,
    colors: { primary: '#0c4a6e', secondary: '#38bdf8', spots: '#a5f3fc', spikes: '#22d3ee', eye: '#e0f2fe' },
    proportions: { torsoW: 0.72, torsoH: 0.62, torsoD: 1.3 }
  },
  pirofenix_rex: {
    scale: 1.14,
    colors: { primary: '#b91c1c', secondary: '#fb923c', spots: '#fde047', spikes: '#f97316', eye: '#fef08a' },
    proportions: { torsoW: 0.82, torsoH: 0.76, torsoD: 1.1 }
  },
  cryo_spino_aurora: {
    scale: 1.12,
    colors: { primary: '#38bdf8', secondary: '#e0f2fe', spots: '#a78bfa', spikes: '#67e8f9', eye: '#c4b5fd' },
    proportions: { torsoW: 0.78, torsoH: 0.72, torsoD: 1.15 }
  },
  dragao_lunar: {
    scale: 1.06,
    colors: { primary: '#c7d2fe', secondary: '#eef2ff', spots: '#6366f1', spikes: '#e0e7ff', eye: '#fde68a' },
    proportions: { torsoW: 0.74, torsoH: 0.7, torsoD: 1.1 }
  },
  meca_indominus_zero: {
    scale: 1.16,
    colors: { primary: '#334155', secondary: '#94a3b8', spots: '#ef4444', spikes: '#0ea5e9', eye: '#ef4444' },
    proportions: { torsoW: 0.82, torsoH: 0.78, torsoD: 1.16, mecha: true }
  },
  lich_rex_dungeon: {
    scale: 1.12,
    colors: { primary: '#d6d3d1', secondary: '#a8a29e', spots: '#4ade80', spikes: '#86efac', eye: '#4ade80' },
    proportions: { torsoW: 0.7, torsoH: 0.7, torsoD: 1.08 }
  },
  gladiador_carno: {
    scale: 1.1,
    colors: { primary: '#9a3412', secondary: '#fcd34d', spots: '#78350f', spikes: '#d4d4d8', eye: '#fbbf24' },
    proportions: { torsoW: 0.84, torsoH: 0.74, torsoD: 1.1 }
  },
  crono_raptor: {
    scale: 0.96,
    colors: { primary: '#0f766e', secondary: '#fcd34d', spots: '#22d3ee', spikes: '#fbbf24', eye: '#22d3ee' },
    proportions: { torsoW: 0.7, torsoH: 0.68, torsoD: 1.08 }
  },
  florassauro_primavera: {
    scale: 1.1,
    colors: { primary: '#4ade80', secondary: '#fef9c3', spots: '#f472b6', spikes: '#facc15', eye: '#f472b6' },
    proportions: { torsoW: 0.86, torsoH: 0.7, torsoD: 1.3, quadruped: true }
  }
};

const FALLBACK_BOX = new THREE.BoxGeometry(1, 1, 1);

function makeKit(ctx) {
  const cache = new Map();
  const createMat = ctx.createMat || ((color, o = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness: o.roughness ?? 0.62,
    metalness: o.metalness ?? 0.08,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 0,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1
  }));
  const addVoxel = ctx.addVoxel || ((parent, w, h, d, x, y, z, mat, castShadow = true) => {
    const mesh = new THREE.Mesh(FALLBACK_BOX, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  });

  const m = (color, o = {}) => {
    const glow = o.glow ?? 0;
    const opacity = o.opacity ?? 1;
    const key = `${color}|${glow}|${opacity}|${o.metalness ?? ''}|${o.roughness ?? ''}`;
    if (!cache.has(key)) {
      cache.set(key, createMat(color, {
        emissive: glow > 0 ? color : 0x000000,
        emissiveIntensity: glow,
        transparent: opacity < 1,
        opacity,
        metalness: o.metalness,
        roughness: o.roughness
      }));
    }
    return cache.get(key);
  };

  const v = (parent, w, h, d, x, y, z, mat, castShadow = true) => {
    if (!parent) return null;
    return addVoxel(parent, w, h, d, x, y, z, mat, castShadow);
  };

  return { m, v };
}

function getTailTip(ctx) {
  const segs = ctx.tailSegments;
  if (Array.isArray(segs) && segs.length > 0) return segs[segs.length - 1];
  return ctx.torso || null;
}

function getTailBase(ctx) {
  const segs = ctx.tailSegments;
  if (Array.isArray(segs) && segs.length > 0) return segs[0];
  return ctx.torso || null;
}

// 1. SCARY RAPTOR (fiel à referência estilo JoJo)
function buildScaryRaptor(c, k) {
  const { torso: T, headGroup: H, jaw: J, neckPivot: N, torsoW: W = 0.78, torsoH: Hh = 0.72, torsoD: D = 1.08 } = c;
  const { m, v } = k;
  const teal = m('#1fb6c8');
  const cyan = m('#a5f3fc');
  const gold = m('#facc15', { glow: 0.25, metalness: 0.35, roughness: 0.35 });
  const spikeGold = m('#eab308', { glow: 0.22, metalness: 0.4, roughness: 0.3 });
  const knobGold = m('#fde047', { glow: 0.55, roughness: 0.25 });
  const black = m('#0f172a', { roughness: 0.5 });
  const cobalt = m('#1d3b8b', { roughness: 0.55 });
  const lightning = m('#f59e0b', { glow: 0.48, roughness: 0.3 });
  const tooth = m('#ffffff', { roughness: 0.28 });

  if (T) {
    // Barriga ciano claro com grade dourada cruzada
    v(T, W * 0.72, 0.14, D * 0.76, 0, -Hh * 0.48, 0, cyan, false);
    for (let i = -2; i <= 2; i++) {
      v(T, 0.035, 0.03, D * 0.8, i * 0.11, -Hh * 0.555, 0, gold, false);
    }
    for (let j = -3; j <= 3; j++) {
      v(T, W * 0.68, 0.03, 0.035, 0, -Hh * 0.56, j * 0.13, gold, false);
    }

    // Marcações tribais negras ao longo do dorso
    for (let i = 0; i < 5; i++) {
      const z = -0.38 + i * 0.19;
      v(T, 0.28, 0.05, 0.09, 0, Hh * 0.52, z, black, false);
      v(T, 0.08, 0.05, 0.16, (i % 2 ? 1 : -1) * 0.16, Hh * 0.52, z + 0.04, black, false);
    }

    // Pernas traseiras musculosas cobalto com raios dourados laterais + garra foice elevada + mãos de 3 dedos
    for (const s of [-1, 1]) {
      const lx = s * (W * 0.52 + 0.02);
      v(T, 0.28, 0.48, 0.42, lx, -0.38, 0.2, cobalt);
      v(T, 0.18, 0.34, 0.22, lx, -0.72, 0.12, cobalt);
      // Listras de raio dourado na lateral da coxa/canela
      const sx = s * (W * 0.52 + 0.17);
      v(T, 0.04, 0.15, 0.12, sx, -0.32, 0.22, lightning, false);
      v(T, 0.04, 0.12, 0.1, sx, -0.44, 0.3, lightning, false);
      v(T, 0.04, 0.14, 0.1, sx, -0.55, 0.16, lightning, false);
      v(T, 0.04, 0.12, 0.1, sx, -0.68, 0.22, lightning, false);

      // Pé com 3 dedos + garras douradas
      for (let f = -1; f <= 1; f++) {
        v(T, 0.065, 0.065, 0.28, lx + f * 0.075, -0.92, -0.04, cobalt);
        v(T, 0.045, 0.045, 0.09, lx + f * 0.075, -0.92, -0.22, gold, false);
      }
      // Garra foice dourada erguida (lado interno do pé)
      const clawX = lx - s * 0.09;
      v(T, 0.055, 0.18, 0.06, clawX, -0.82, -0.1, spikeGold);
      v(T, 0.05, 0.06, 0.16, clawX, -0.71, -0.17, knobGold);

      // Braços ágeis com mãos de 3 dedos e garras douradas
      const ax = s * (W * 0.52 + 0.04);
      v(T, 0.13, 0.13, 0.3, ax, -0.08, -D * 0.38, teal);
      for (let f = -1; f <= 1; f++) {
        v(T, 0.038, 0.038, 0.14, ax + f * 0.045, -0.1, -D * 0.38 - 0.21, gold, false);
      }
    }
  }

  if (N) {
    // Marcações tribais negras no pescoço
    for (let i = 0; i < 3; i++) {
      v(N, 0.26, 0.05, 0.09, 0, 0.12 + i * 0.14, 0.14, black, false);
    }
  }

  if (H) {
    // Coroa radial de 7 espinhos dourados finos com pontas arredondadas (#fde047) em leque sobre o crânio
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) / 3; // -1..1
      const len = 0.42 - Math.abs(a) * 0.1;
      const g = new THREE.Group();
      g.position.set(0, 0.36, -0.02);
      g.rotation.z = -a * 1.05;
      g.rotation.x = 0.32;
      v(g, 0.055, len, 0.055, 0, len * 0.5, 0, spikeGold);
      v(g, 0.115, 0.115, 0.115, 0, len + 0.04, 0, knobGold);
      H.add(g);
    }
    // Faixa tribal negra no focinho
    v(H, 0.12, 0.04, 0.28, 0, 0.38, -0.34, black, false);

    // Dentes brancos ao longo da mandíbula superior
    for (let i = 0; i < 4; i++) {
      const tz = -0.34 - i * 0.1;
      v(H, 0.045, 0.08, 0.045, 0.16, -0.04, tz, tooth, false);
      v(H, 0.045, 0.08, 0.045, -0.16, -0.04, tz, tooth, false);
    }
    // Dentes brancos na mandíbula inferior (anexados a jaw se disponível)
    const jawTarget = J || H;
    const jy = J ? 0.04 : -0.1;
    for (let i = 0; i < 4; i++) {
      const tz = -0.28 - i * 0.1;
      v(jawTarget, 0.04, 0.07, 0.04, 0.14, jy, tz, tooth, false);
      v(jawTarget, 0.04, 0.07, 0.04, -0.14, jy, tz, tooth, false);
    }
  }

  const tb = getTailBase(c);
  if (tb && tb !== T) {
    v(tb, 0.18, 0.05, 0.28, 0, 0.16, 0.18, black, false);
  }
}

// 2. DRACOREX SOLAR (portado fielmente de dinos_limitados_3d.html linhas 105-156)
function buildDracorexSolar(c, k) {
  const { torso: T, headGroup: H, torsoH: Hh = 0.72 } = c;
  const { m, v } = k;
  const accent = m('#fff0a0', { glow: 0.7 });
  const haloGold = m('#ffd65c', { glow: 0.9 });
  const plateGold = m('#ffd65c', { glow: 0.3 });
  const tipOrange = m('#ff6a00', { glow: 0.8 });

  if (H) {
    // 7 raios solares no topo do crânio (k = -3..3) + 2 raios laterais
    for (let r = -3; r <= 3; r++) {
      const h = 0.34 - Math.abs(r) * 0.05;
      v(H, 0.08, h, 0.08, r * 0.095, 0.42 + h * 0.5, -0.08, accent);
    }
    v(H, 0.09, 0.24, 0.09, -0.34, 0.36, -0.08, accent);
    v(H, 0.09, 0.24, 0.09, 0.34, 0.36, -0.08, accent);

    // Halo circular dourado atrás da cabeça (18 segmentos em anel)
    const radius = 0.52;
    for (let deg = 0; deg < 360; deg += 20) {
      const rad = (deg * Math.PI) / 180;
      v(H, 0.08, 0.08, 0.05, Math.cos(rad) * radius, 0.26 + Math.sin(rad) * radius, 0.24, haloGold, false);
    }
  }

  if (T) {
    // 5 placas dorsais douradas brilhantes
    for (let i = 0; i < 5; i++) {
      const ph = 0.14 + (i % 2) * 0.07;
      v(T, 0.16, ph, 0.13, 0, Hh * 0.5 + ph * 0.5, -0.4 + i * 0.2, plateGold);
    }
  }

  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.22, 0.22, 0.26, 0, 0, 0.14, tipOrange);
  }
}

// 3. NEBULOSSAURO (portado fielmente de dinos_limitados_3d.html linhas 105-156)
function buildNebulossauro(c, k) {
  const { torso: T, headGroup: H, torsoW: W = 0.86, torsoH: Hh = 0.68, torsoD: D = 1.28 } = c;
  const { m, v } = k;
  const bodyGalaxy = m('#35216e', { roughness: 0.7 });
  const starWhite = m('#ffffff', { glow: 0.9 });
  const cyanTube = m('#6ee7f2', { glow: 0.85 });
  const pinkTip = m('#ff5fa2', { glow: 0.8 });

  if (T) {
    // 30 estrelas brilhantes distribuídas nas laterais e dorso do corpo de galáxia
    for (let i = 0; i < 30; i++) {
      const side = i % 3;
      const z = -D * 0.45 + (((i * 37) % 100) / 100) * (D * 0.9);
      const y = -Hh * 0.36 + (((i * 53) % 100) / 100) * (Hh * 0.78);
      if (side === 0) {
        v(T, 0.025, 0.055, 0.055, -W * 0.51, y, z, starWhite, false);
      } else if (side === 1) {
        v(T, 0.025, 0.055, 0.055, W * 0.51, y, z, starWhite, false);
      } else {
        const x = -W * 0.42 + (((i * 29) % 100) / 100) * (W * 0.84);
        v(T, 0.055, 0.025, 0.055, x, Hh * 0.51, z, starWhite, false);
      }
    }
  }

  if (H) {
    // Crista em tubo parassaurolofo curva para trás (+Z) com 10 segmentos, ponta em ciano luminoso
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const y = 0.42 + Math.sin(t * Math.PI * 0.9) * 0.28;
      const z = -0.22 + i * 0.12;
      v(H, 0.14, 0.14, 0.15, 0, y, z, i >= 6 ? cyanTube : bodyGalaxy);
    }
  }

  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.24, 0.24, 0.28, 0, 0, 0.14, pinkTip);
  }
}

// 4. CRISTALOCERATOPS (portado fielmente de dinos_limitados_3d.html linhas 105-156)
function buildCristaloceratops(c, k) {
  const { torso: T, headGroup: H, torsoH: Hh = 0.68 } = c;
  const { m, v } = k;
  const teal = m('#1f6f8b', { roughness: 0.65 });
  const frillInner = m('#2b93b5', { roughness: 0.5 });
  const crystal = m('#7ff0ff', { glow: 0.6, opacity: 0.85, roughness: 0.2, metalness: 0.15 });
  const plateCrystal = m('#7ff0ff', { glow: 0.5, opacity: 0.85, roughness: 0.25 });

  if (H) {
    // Babador/gola azul-petróleo com painel interno brilhante
    v(H, 1.06, 0.82, 0.12, 0, 0.44, 0.18, teal);
    v(H, 0.92, 0.66, 0.04, 0, 0.44, 0.11, frillInner, false);

    // 9 espinhos de cristal ao longo do topo da gola
    for (let i = 0; i < 9; i++) {
      const x = -0.46 + i * 0.115;
      const h = 0.14 + ((i + 1) % 2) * 0.09;
      v(H, 0.09, h, 0.09, x, 0.85 + h * 0.5, 0.18, crystal);
    }
    // 4 espinhos/gemas de cristal em cada lateral da gola
    for (let j = 0; j < 4; j++) {
      const y = 0.14 + j * 0.18;
      v(H, 0.11, 0.1, 0.09, -0.58, y, 0.18, crystal);
      v(H, 0.11, 0.1, 0.09, 0.58, y, 0.18, crystal);
    }

    // 3 chifres translúcidos ciano apontando para frente (-Z)
    v(H, 0.095, 0.095, 0.46, -0.22, 0.36, -0.68, crystal);
    v(H, 0.095, 0.095, 0.46, 0.22, 0.36, -0.68, crystal);
    v(H, 0.09, 0.09, 0.28, 0, 0.2, -0.78, crystal);
  }

  if (T) {
    // 5 placas dorsais de cristal translúcido
    for (let i = 0; i < 5; i++) {
      const ph = 0.14 + (i % 2) * 0.07;
      v(T, 0.16, ph, 0.13, 0, Hh * 0.5 + ph * 0.5, -0.45 + i * 0.22, plateCrystal);
    }
  }

  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.2, 0.2, 0.24, 0, 0, 0.14, crystal);
  }
}

// 5. ABISSAL ESPECTRAL
function buildAbissalEspectral(c, k) {
  const { torso: T, headGroup: H, torsoW: W = 0.72, torsoH: Hh = 0.62, torsoD: D = 1.3 } = c;
  const { m, v } = k;
  const bio = m('#a5f3fc', { glow: 0.9, opacity: 0.85 });
  const fin = m('#0ea5e9', { glow: 0.35, opacity: 0.72 });
  const lure = m('#fde047', { glow: 1.0 });
  const stalk = m('#0c4a6e');
  const tooth = m('#e0f2fe', { glow: 0.2 });

  if (T) {
    v(T, 0.05, 0.58, D * 0.72, 0, Hh * 0.68, 0.04, fin);
    for (let i = 0; i < 5; i++) {
      v(T, 0.06, 0.28 - Math.abs(i - 2) * 0.05, 0.09, 0, Hh * 0.5 + 0.34, -0.36 + i * 0.19, bio);
    }
    for (const s of [-1, 1]) {
      v(T, 0.46, 0.05, 0.36, s * (W * 0.5 + 0.22), -0.1, -0.2, fin);
      v(T, 0.28, 0.04, 0.26, s * (W * 0.5 + 0.5), -0.14, -0.06, fin);
      for (let i = 0; i < 4; i++) {
        v(T, 0.045, 0.055, 0.055, s * (W * 0.51), -0.1 + (i % 2) * 0.12, -0.38 + i * 0.24, bio, false);
      }
    }
  }

  if (H) {
    // Antena bioluminescente de peixe-abissal
    v(H, 0.045, 0.3, 0.045, 0, 0.52, -0.12, stalk);
    v(H, 0.045, 0.045, 0.32, 0, 0.66, -0.28, stalk);
    v(H, 0.14, 0.14, 0.14, 0, 0.6, -0.46, lure);
    for (let i = 0; i < 4; i++) {
      v(H, 0.045, 0.11, 0.045, 0.14, -0.06, -0.38 - i * 0.08, tooth, false);
      v(H, 0.045, 0.11, 0.045, -0.14, -0.06, -0.38 - i * 0.08, tooth, false);
    }
  }

  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.05, 0.52, 0.32, 0, 0, 0.18, fin);
    v(tt, 0.06, 0.16, 0.12, 0, 0, 0.32, bio, false);
  }
}

// 6. PIROFÊNIX REX
function buildPirofenixRex(c, k) {
  const { torso: T, headGroup: H, torsoW: W = 0.82, torsoH: Hh = 0.76, torsoD: D = 1.1 } = c;
  const { m, v } = k;
  const flame = m('#f97316', { glow: 0.8 });
  const solar = m('#fde047', { glow: 1.0 });
  const crimson = m('#7f1d1d');
  const ember = m('#fb923c', { glow: 0.6 });

  if (T) {
    // Asas flamejantes em penas voxel nas laterais
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const len = 0.72 - i * 0.12;
        const g = new THREE.Group();
        g.position.set(s * W * 0.46, Hh * 0.32, -0.22 + i * 0.16);
        g.rotation.z = -s * (0.88 - i * 0.12);
        v(g, len, 0.065, 0.11, s * len * 0.5, 0, 0, i % 2 ? solar : flame);
        T.add(g);
      }
    }
    // Crina dorsal de fogo
    for (let i = 0; i < 6; i++) {
      const h = 0.2 + (i % 3) * 0.1;
      v(T, 0.1, h, 0.12, 0, Hh * 0.5 + h * 0.5, -0.44 + i * 0.18, i % 2 ? flame : solar);
    }
    v(T, W * 0.52, 0.12, D * 0.52, 0, -Hh * 0.48, 0, ember, false);
  }

  if (H) {
    // Coroa de penas flamejantes para trás
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      g.position.set((i - 2) * 0.11, 0.4, 0.04);
      g.rotation.x = 0.5 + (i % 2) * 0.2;
      v(g, 0.075, 0.36 - Math.abs(i - 2) * 0.05, 0.075, 0, 0.16, 0, i % 2 ? solar : flame);
      H.add(g);
    }
    v(H, 0.09, 0.09, 0.28, 0.22, 0.36, -0.14, crimson);
    v(H, 0.09, 0.09, 0.28, -0.22, 0.36, -0.14, crimson);
  }

  const tt = getTailTip(c);
  if (tt) {
    for (let i = 0; i < 3; i++) {
      v(tt, 0.1, 0.24 - i * 0.04, 0.12, (i - 1) * 0.12, 0.14, 0.12 + i * 0.09, i === 1 ? solar : flame);
    }
  }
}

// 7. CRYO SPINO AURORA
function buildCryoSpinoAurora(c, k) {
  const { torso: T, headGroup: H, torsoH: Hh = 0.72 } = c;
  const { m, v } = k;
  const ice = m('#67e8f9', { glow: 0.5, opacity: 0.82, roughness: 0.2 });
  const auroraViolet = m('#a78bfa', { glow: 0.85, opacity: 0.85 });
  const auroraMint = m('#34d399', { glow: 0.85, opacity: 0.85 });
  const frost = m('#f8fafc', { roughness: 0.3 });

  if (T) {
    // Vela dorsal glacial prismática de aurora boreal
    const heights = [0.42, 0.72, 0.94, 0.86, 0.62, 0.36];
    heights.forEach((h, i) => {
      const z = -0.48 + i * 0.19;
      v(T, 0.1, h, 0.17, 0, Hh * 0.5 + h * 0.45, z, i % 2 ? auroraViolet : auroraMint);
      v(T, 0.14, 0.07, 0.19, 0, Hh * 0.5 + h * 0.9, z, ice);
    });
    for (let i = 0; i < 4; i++) {
      v(T, 0.18, 0.08, 0.18, i % 2 ? 0.22 : -0.22, Hh * 0.5 + 0.04, -0.32 + i * 0.24, frost);
    }
  }

  if (H) {
    // Crista glacial sobre o focinho
    v(H, 0.1, 0.11, 0.48, 0, 0.36, -0.34, ice);
    v(H, 0.07, 0.16, 0.1, 0, 0.46, -0.5, auroraViolet);
    for (let i = 0; i < 4; i++) {
      v(H, 0.05, 0.11, 0.05, i % 2 ? 0.12 : -0.12, -0.06, -0.38 - i * 0.09, frost, false);
    }
  }

  const tt = getTailTip(c);
  if (tt) {
    for (let i = 0; i < 3; i++) {
      v(tt, 0.08, 0.3 - i * 0.07, 0.11, 0, 0.14, 0.08 + i * 0.12, i % 2 ? auroraViolet : auroraMint);
    }
  }
}

// 8. DRAGÃO LUNAR
function buildDragaoLunar(c, k) {
  const { torso: T, headGroup: H, torsoW: W = 0.74, torsoH: Hh = 0.7 } = c;
  const { m, v } = k;
  const moon = m('#fef9c3', { glow: 0.85 });
  const silver = m('#e0e7ff', { glow: 0.2, metalness: 0.45, roughness: 0.3 });
  const indigo = m('#4338ca', { glow: 0.35 });
  const wing = m('#818cf8', { glow: 0.4, opacity: 0.76 });

  if (T) {
    // Asas celestiais
    for (const s of [-1, 1]) {
      v(T, 0.06, 0.06, 0.58, s * W * 0.5, Hh * 0.34, 0, silver);
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        g.position.set(s * W * 0.5, Hh * 0.34, -0.2 + i * 0.22);
        g.rotation.z = -s * (0.5 - i * 0.1);
        const w = 0.88 - i * 0.15;
        v(g, w, 0.045, 0.22, s * w * 0.5, 0, 0, wing);
        T.add(g);
      }
      // Emblema meia-lua nos flancos
      const fx = s * (W * 0.51);
      v(T, 0.04, 0.28, 0.09, fx, 0, 0, moon, false);
      v(T, 0.04, 0.09, 0.1, fx, 0.16, -0.07, moon, false);
      v(T, 0.04, 0.09, 0.1, fx, -0.16, -0.07, moon, false);
    }
    for (let i = 0; i < 5; i++) {
      v(T, 0.08, 0.18, 0.1, 0, Hh * 0.5 + 0.09, -0.38 + i * 0.19, moon);
    }
  }

  if (H) {
    // Chifres curvos em crescente lunar
    for (const s of [-1, 1]) {
      v(H, 0.07, 0.24, 0.07, s * 0.2, 0.46, 0.0, moon);
      v(H, 0.07, 0.07, 0.2, s * 0.2, 0.6, -0.1, moon);
      v(H, 0.07, 0.14, 0.07, s * 0.2, 0.52, -0.22, silver);
    }
    v(H, 0.14, 0.14, 0.05, 0, 0.34, -0.52, indigo);
  }

  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.22, 0.22, 0.22, 0, 0, 0.14, moon);
  }
}

// 9. MECA INDOMINUS ZERO
function buildMecaIndominusZero(c, k) {
  const { torso: T, headGroup: H, neckPivot: N, torsoW: W = 0.82, torsoH: Hh = 0.78, torsoD: D = 1.16 } = c;
  const { m, v } = k;
  const steel = m('#475569', { metalness: 0.82, roughness: 0.28 });
  const dark = m('#1e293b', { metalness: 0.75, roughness: 0.36 });
  const visorRed = m('#ef4444', { glow: 0.95 });
  const coreCyan = m('#0ea5e9', { glow: 0.75 });

  if (T) {
    v(T, W + 0.08, 0.14, D * 0.9, 0, Hh * 0.5, 0, steel);
    for (let i = 0; i < 4; i++) {
      const z = -0.35 + i * 0.24;
      v(T, W + 0.1, 0.06, 0.1, 0, Hh * 0.5 + 0.1, z, dark);
      v(T, 0.12, 0.22, 0.14, i % 2 ? 0.2 : -0.2, Hh * 0.5 + 0.18, z, steel);
    }
    for (const s of [-1, 1]) {
      v(T, 0.06, 0.4, 0.5, s * (W * 0.5 + 0.04), 0, 0.05, dark);
      v(T, 0.07, 0.07, 0.4, s * (W * 0.5 + 0.08), 0.12, 0.05, coreCyan, false);
      v(T, 0.07, 0.07, 0.3, s * (W * 0.5 + 0.08), -0.08, 0.08, visorRed, false);
      v(T, 0.2, 0.2, 0.2, s * (W * 0.5 + 0.1), -0.34, 0.24, steel);
    }
    // Reator peitoral vermelho
    v(T, 0.22, 0.22, 0.06, 0, 0.05, -D * 0.5 - 0.03, visorRed);
  }

  if (N) {
    v(N, 0.46, 0.06, 0.12, 0, 0.28, -0.08, steel);
    v(N, 0.46, 0.06, 0.12, 0, 0.48, -0.08, steel);
  }

  if (H) {
    v(H, 0.56, 0.11, 0.5, 0, 0.42, -0.2, steel);
    v(H, 0.08, 0.22, 0.08, 0, 0.54, -0.08, visorRed);
    // Visor cibernético luminoso
    v(H, 0.62, 0.11, 0.14, 0, 0.24, -0.36, visorRed);
    for (const s of [-1, 1]) {
      v(H, 0.08, 0.3, 0.08, s * 0.22, 0.56, 0.02, steel);
    }
  }

  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.2, 0.2, 0.3, 0, 0, 0.12, dark);
    v(tt, 0.08, 0.22, 0.28, 0, 0.1, 0.28, visorRed);
  }
}

// 10. LICH REX DUNGEON
function buildLichRexDungeon(c, k) {
  const { torso: T, headGroup: H, torsoW: W = 0.7, torsoH: Hh = 0.7, torsoD: D = 1.08 } = c;
  const { m, v } = k;
  const bone = m('#e7e5e4', { roughness: 0.7 });
  const soulGreen = m('#4ade80', { glow: 0.95 });
  const robePurple = m('#7e22ce', { glow: 0.28 });
  const crownGold = m('#ca8a04', { metalness: 0.72, roughness: 0.3 });

  if (T) {
    // Costelas esqueléticas expostas
    for (let i = 0; i < 5; i++) {
      const z = -0.38 + i * 0.19;
      for (const s of [-1, 1]) {
        v(T, 0.06, 0.34, 0.07, s * (W * 0.5 + 0.03), -0.02, z, bone);
        v(T, 0.2, 0.05, 0.07, s * (W * 0.5 - 0.06), 0.18, z, bone);
      }
    }
    v(T, 0.09, 0.28, D * 0.8, 0, Hh * 0.5 + 0.06, 0, bone);
    // Filactério/alma verde no peito
    v(T, 0.22, 0.22, 0.1, 0, 0.02, -D * 0.5 - 0.02, soulGreen);
    // Manto roxo rasgado nos ombros/flancos
    for (const s of [-1, 1]) {
      v(T, 0.06, 0.48, 0.48, s * (W * 0.5 + 0.1), 0.05, 0.28, robePurple);
      v(T, 0.06, 0.24, 0.2, s * (W * 0.5 + 0.1), -0.3, 0.38, robePurple);
    }
  }

  if (H) {
    // Coroa de Lich + chamas espectrais verdes sobre os olhos
    v(H, 0.52, 0.08, 0.42, 0, 0.42, -0.18, crownGold);
    for (let i = 0; i < 5; i++) {
      v(H, 0.07, 0.14 + (i % 2) * 0.1, 0.07, -0.2 + i * 0.1, 0.53 + (i % 2) * 0.04, -0.18, crownGold);
    }
    for (const s of [-1, 1]) {
      v(H, 0.1, 0.1, 0.08, s * 0.2, 0.22, -0.38, soulGreen);
      v(H, 0.06, 0.2, 0.06, s * 0.2, 0.36, -0.38, soulGreen, false);
    }
    for (let i = 0; i < 4; i++) {
      v(H, 0.055, 0.1, 0.05, 0.14, -0.06, -0.38 - i * 0.08, bone, false);
      v(H, 0.055, 0.1, 0.05, -0.14, -0.06, -0.38 - i * 0.08, bone, false);
    }
  }

  const tb = getTailBase(c);
  if (tb && tb !== T) {
    for (let i = 0; i < 3; i++) v(tb, 0.16, 0.08, 0.1, 0, 0.14, 0.1 + i * 0.18, bone);
  }
  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.16, 0.16, 0.16, 0, 0, 0.12, soulGreen);
  }
}

// 11. GLADIADOR CARNO
function buildGladiadorCarno(c, k) {
  const { torso: T, headGroup: H, torsoW: W = 0.84, torsoH: Hh = 0.74, torsoD: D = 1.1 } = c;
  const { m, v } = k;
  const bronze = m('#b45309', { metalness: 0.72, roughness: 0.34 });
  const steel = m('#d4d4d8', { metalness: 0.85, roughness: 0.24 });
  const plumeRed = m('#b91c1c', { roughness: 0.6 });
  const leather = m('#451a03', { roughness: 0.8 });
  const gold = m('#fbbf24', { metalness: 0.8, glow: 0.2 });

  if (T) {
    v(T, W + 0.1, 0.14, 0.42, 0, Hh * 0.5, -0.28, bronze);
    // Ombreiras de aço com espigões
    for (const s of [-1, 1]) {
      v(T, 0.3, 0.2, 0.34, s * (W * 0.5 + 0.12), Hh * 0.42, -0.34, steel);
      v(T, 0.12, 0.14, 0.12, s * (W * 0.5 + 0.2), Hh * 0.56, -0.34, steel);
    }
    // Cinturão de couro e tiras de bronze
    v(T, W + 0.06, 0.1, 0.5, 0, -0.1, 0.08, leather);
    for (let i = 0; i < 4; i++) {
      v(T, 0.1, 0.2, 0.06, -0.24 + i * 0.16, -0.26, -D * 0.5 + 0.2, bronze);
    }
    // Emblema peitoral + gládio lateral
    v(T, 0.2, 0.2, 0.06, 0, 0.1, -D * 0.5 - 0.03, gold);
    v(T, 0.06, 0.5, 0.06, -W * 0.5 - 0.14, -0.38, -0.44, steel);
    v(T, 0.2, 0.06, 0.06, -W * 0.5 - 0.14, -0.14, -0.44, gold);
  }

  if (H) {
    // Elmo de gladiador romano com crista vermelha e grade facial
    v(H, 0.56, 0.22, 0.5, 0, 0.4, -0.16, steel);
    v(H, 0.08, 0.22, 0.52, 0, 0.6, -0.16, plumeRed);
    v(H, 0.54, 0.06, 0.06, 0, 0.22, -0.44, steel, false);
    v(H, 0.08, 0.2, 0.08, 0.28, 0.2, -0.32, steel);
    v(H, 0.08, 0.2, 0.08, -0.28, 0.2, -0.32, steel);
  }

  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.2, 0.2, 0.26, 0, 0, 0.12, bronze);
  }
}

// 12. CRONO RAPTOR
function buildCronoRaptor(c, k) {
  const { torso: T, headGroup: H, torsoW: W = 0.7, torsoH: Hh = 0.68 } = c;
  const { m, v } = k;
  const gearGold = m('#fbbf24', { metalness: 0.82, roughness: 0.28, glow: 0.2 });
  const chronoCyan = m('#22d3ee', { glow: 0.9 });
  const clockDark = m('#0f172a');
  const bronze = m('#b45309', { metalness: 0.72, roughness: 0.35 });

  if (T) {
    // Engrenagens e mostradores de relógio nos flancos
    for (const s of [-1, 1]) {
      const fx = s * (W * 0.5 + 0.03);
      v(T, 0.05, 0.34, 0.34, fx, 0.04, 0.05, gearGold);
      v(T, 0.06, 0.12, 0.44, fx, 0.04, 0.05, bronze);
      v(T, 0.06, 0.44, 0.12, fx, 0.04, 0.05, bronze);
      v(T, 0.07, 0.04, 0.16, fx + s * 0.03, 0.1, 0.05, clockDark, false);
      v(T, 0.07, 0.14, 0.04, fx + s * 0.03, 0.04, 0.0, clockDark, false);
      v(T, 0.07, 0.08, 0.08, fx + s * 0.03, 0.04, 0.05, chronoCyan, false);
    }
    for (let i = 0; i < 4; i++) {
      v(T, 0.14, 0.14, 0.14, 0, Hh * 0.5 + 0.08, -0.35 + i * 0.24, i % 2 ? gearGold : chronoCyan);
    }
  }

  if (H) {
    // Halo temporal com ponteiros atrás da cabeça
    const R = 0.36;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      v(H, 0.1, 0.1, 0.05, Math.cos(a) * R, 0.24 + Math.sin(a) * R, 0.26, i % 2 ? gearGold : chronoCyan, false);
    }
    v(H, 0.04, 0.22, 0.04, 0, 0.34, 0.26, clockDark, false);
    v(H, 0.16, 0.04, 0.04, 0.07, 0.24, 0.26, clockDark, false);
  }

  const tt = getTailTip(c);
  if (tt) {
    v(tt, 0.24, 0.24, 0.1, 0, 0, 0.14, gearGold);
    v(tt, 0.1, 0.1, 0.12, 0, 0, 0.14, chronoCyan);
  }
}

// 13. FLORASSAURO PRIMAVERA
function buildFlorassauroPrimavera(c, k) {
  const { torso: T, headGroup: H, torsoW: W = 0.86, torsoH: Hh = 0.7, torsoD: D = 1.3 } = c;
  const { m, v } = k;
  const pink = m('#f472b6');
  const rose = m('#fb7185');
  const pollen = m('#facc15', { glow: 0.3 });
  const leaf = m('#16a34a');
  const petalWhite = m('#fdf2f8');
  const bud = m('#a3e635');

  const addFlower = (p, x, y, z, col) => {
    v(p, 0.09, 0.09, 0.09, x, y, z, pollen, false);
    v(p, 0.09, 0.09, 0.09, x + 0.09, y, z, col, false);
    v(p, 0.09, 0.09, 0.09, x - 0.09, y, z, col, false);
    v(p, 0.09, 0.09, 0.09, x, y + 0.09, z, col, false);
    v(p, 0.09, 0.09, 0.09, x, y - 0.09, z, col, false);
  };

  if (T) {
    v(T, W * 0.9, 0.1, D * 0.72, 0, Hh * 0.5 + 0.04, 0, leaf);
    addFlower(T, -0.2, Hh * 0.5 + 0.16, -0.34, pink);
    addFlower(T, 0.2, Hh * 0.5 + 0.16, 0.0, petalWhite);
    addFlower(T, -0.1, Hh * 0.5 + 0.16, 0.36, rose);
    for (let i = 0; i < 5; i++) {
      v(T, 0.12, 0.08, 0.2, i % 2 ? 0.34 : -0.34, Hh * 0.5 + 0.1, -0.4 + i * 0.2, leaf, false);
    }
    for (const s of [-1, 1]) {
      addFlower(T, s * (W * 0.5 + 0.04), 0.1, -0.18, s > 0 ? pink : petalWhite);
      v(T, 0.05, 0.3, 0.08, s * (W * 0.5 + 0.04), -0.12, 0.2, leaf, false);
    }
  }

  if (H) {
    // Coroa floral + brotos primaveris
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      v(H, 0.11, 0.09, 0.11, Math.cos(a) * 0.2, 0.44, -0.18 + Math.sin(a) * 0.2, i % 2 ? pink : petalWhite, false);
    }
    v(H, 0.11, 0.11, 0.11, 0, 0.44, -0.18, pollen, false);
    v(H, 0.06, 0.2, 0.06, 0.16, 0.54, -0.1, bud);
    v(H, 0.06, 0.2, 0.06, -0.16, 0.54, -0.1, bud);
  }

  const tt = getTailTip(c);
  if (tt) {
    addFlower(tt, 0, 0.1, 0.14, pink);
    v(tt, 0.1, 0.2, 0.2, 0, 0, 0, leaf, false);
  }
}

const BUILDERS = {
  scary_raptor: buildScaryRaptor,
  dracorex_solar: buildDracorexSolar,
  nebulossauro: buildNebulossauro,
  cristaloceratops: buildCristaloceratops,
  abissal_espectral: buildAbissalEspectral,
  pirofenix_rex: buildPirofenixRex,
  cryo_spino_aurora: buildCryoSpinoAurora,
  dragao_lunar: buildDragaoLunar,
  meca_indominus_zero: buildMecaIndominusZero,
  lich_rex_dungeon: buildLichRexDungeon,
  gladiador_carno: buildGladiadorCarno,
  crono_raptor: buildCronoRaptor,
  florassauro_primavera: buildFlorassauroPrimavera
};

export function applyLimitedDinoDetails(id, ctx = {}) {
  const build = BUILDERS[id];
  if (!build || !ctx) return false;
  try {
    build(ctx, makeKit(ctx));
    return true;
  } catch (err) {
    console.warn('applyLimitedDinoDetails falhou para', id, err);
    return false;
  }
}
