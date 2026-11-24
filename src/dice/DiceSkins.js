// Sistema de Skins PBR/Procedurais de Dados 3D (13 Acabamentos), Bandejas Esculpidas (Feltro/Madeira/Couro),
// Efeitos Especiais de Crítico Natural (20: Supernova Dourada / 1: Rachadura & Tremor) e Fallback 2D Animado (Parte 2.7).
import * as THREE from 'three';

export const DICE_SKINS_CATALOG = Object.freeze([
  {
    id: 'obsidian_resin',
    name: 'Resina Obsidiana',
    category: 'resina',
    baseColor: '#1e1b2e',
    accentColor: '#6366f1',
    inkColor: '#f8fafc',
    borderColor: '#818cf8',
    roughness: 0.22,
    metalness: 0.08,
    clearcoat: 0.85,
    opacity: 1,
    pattern: 'swirl'
  },
  {
    id: 'translucent_amber',
    name: 'Âmbar Translúcido',
    category: 'translucido',
    baseColor: '#d97706',
    accentColor: '#fde047',
    inkColor: '#fffbeb',
    borderColor: '#fbbf24',
    roughness: 0.14,
    metalness: 0.04,
    clearcoat: 1.0,
    opacity: 0.84,
    transparent: true,
    emissive: '#78350f',
    emissiveIntensity: 0.22,
    pattern: 'inclusions'
  },
  {
    id: 'fossil_bone',
    name: 'Osso Fóssil',
    category: 'osso',
    baseColor: '#e7dcc8',
    accentColor: '#a8997e',
    inkColor: '#292524',
    borderColor: '#78716c',
    roughness: 0.68,
    metalness: 0.02,
    opacity: 1,
    pattern: 'grain'
  },
  {
    id: 'runic_stone',
    name: 'Pedra Rúnica',
    category: 'pedra',
    baseColor: '#44403c',
    accentColor: '#2dd4bf',
    inkColor: '#99f6e4',
    borderColor: '#14b8a6',
    roughness: 0.82,
    metalness: 0.06,
    emissive: '#0f766e',
    emissiveIntensity: 0.25,
    opacity: 1,
    pattern: 'speckle'
  },
  {
    id: 'quartz_crystal',
    name: 'Cristal de Quartzo',
    category: 'cristal',
    baseColor: '#38bdf8',
    accentColor: '#e0f2fe',
    inkColor: '#ffffff',
    borderColor: '#7dd3fc',
    roughness: 0.1,
    metalness: 0.15,
    clearcoat: 1.0,
    opacity: 0.82,
    transparent: true,
    emissive: '#0284c7',
    emissiveIntensity: 0.28,
    pattern: 'facets'
  },
  {
    id: 'emerald_gem',
    name: 'Gema Esmeralda',
    category: 'gema',
    baseColor: '#047857',
    accentColor: '#34d399',
    inkColor: '#ecfdf5',
    borderColor: '#6ee7b7',
    roughness: 0.16,
    metalness: 0.22,
    clearcoat: 0.95,
    opacity: 0.9,
    transparent: true,
    emissive: '#064e3b',
    emissiveIntensity: 0.24,
    pattern: 'facets'
  },
  {
    id: 'brushed_steel',
    name: 'Metal Escovado',
    category: 'metal',
    baseColor: '#64748b',
    accentColor: '#cbd5e1',
    inkColor: '#0f172a',
    borderColor: '#e2e8f0',
    roughness: 0.28,
    metalness: 0.88,
    opacity: 1,
    pattern: 'brushed'
  },
  {
    id: 'royal_gold',
    name: 'Ouro Real',
    category: 'ouro',
    baseColor: '#eab308',
    accentColor: '#fef08a',
    inkColor: '#1c1917',
    borderColor: '#fde047',
    roughness: 0.2,
    metalness: 0.94,
    emissive: '#713f12',
    emissiveIntensity: 0.18,
    opacity: 1,
    pattern: 'brushed'
  },
  {
    id: 'ancient_wood',
    name: 'Madeira Sequoiana',
    category: 'madeira',
    baseColor: '#7c4a21',
    accentColor: '#451a03',
    inkColor: '#fef3c7',
    borderColor: '#d97706',
    roughness: 0.72,
    metalness: 0.04,
    opacity: 1,
    pattern: 'wood'
  },
  {
    id: 'magma_lava',
    name: 'Lava Vulcânica',
    category: 'lava',
    baseColor: '#1c1917',
    accentColor: '#f97316',
    inkColor: '#fef08a',
    borderColor: '#ef4444',
    roughness: 0.52,
    metalness: 0.12,
    emissive: '#ea580c',
    emissiveIntensity: 0.62,
    opacity: 1,
    pattern: 'veins'
  },
  {
    id: 'glacial_ice',
    name: 'Gelo Eterno',
    category: 'gelo',
    baseColor: '#0284c7',
    accentColor: '#bae6fd',
    inkColor: '#f0f9ff',
    borderColor: '#e0f2fe',
    roughness: 0.18,
    metalness: 0.1,
    clearcoat: 0.9,
    opacity: 0.85,
    transparent: true,
    emissive: '#0369a1',
    emissiveIntensity: 0.3,
    pattern: 'frost'
  },
  {
    id: 'nebula_galaxy',
    name: 'Galáxia Nebulosa',
    category: 'galaxia',
    baseColor: '#1e1b4b',
    accentColor: '#c084fc',
    inkColor: '#fdf4ff',
    borderColor: '#e879f9',
    roughness: 0.2,
    metalness: 0.25,
    clearcoat: 0.92,
    emissive: '#581c87',
    emissiveIntensity: 0.42,
    opacity: 1,
    pattern: 'stars'
  },
  {
    id: 'jurassic_limited',
    name: 'Edição Limitada Rei Jurássico',
    category: 'limitada',
    limited: true,
    baseColor: '#18181b',
    accentColor: '#f59e0b',
    inkColor: '#fde047',
    borderColor: '#facc15',
    roughness: 0.18,
    metalness: 0.78,
    clearcoat: 1.0,
    emissive: '#b45309',
    emissiveIntensity: 0.36,
    opacity: 1,
    pattern: 'royal_scales'
  }
]);

export const TRAY_SURFACES = Object.freeze({
  felt: {
    id: 'felt',
    name: 'Feltro Esmeralda de Mesa',
    floorColor: '#064e3b',
    rimColor: '#451a03',
    trimColor: '#d97706',
    restitution: 0.36,
    friction: 0.78,
    roughness: 0.92
  },
  wood: {
    id: 'wood',
    name: 'Madeira Nobre Entalhada',
    floorColor: '#5c3417',
    rimColor: '#3b1d0a',
    trimColor: '#fbbf24',
    restitution: 0.54,
    friction: 0.56,
    roughness: 0.64
  },
  leather: {
    id: 'leather',
    name: 'Couro Fóssil Costurado',
    floorColor: '#3e2723',
    rimColor: '#1c1917',
    trimColor: '#f59e0b',
    restitution: 0.42,
    friction: 0.7,
    roughness: 0.78
  }
});

export function getDiceSkinById(skinId, customOverrides = null) {
  const base = DICE_SKINS_CATALOG.find((s) => s.id === skinId) || DICE_SKINS_CATALOG[0];
  if (!customOverrides || typeof customOverrides !== 'object') return base;
  return {
    ...base,
    baseColor: customOverrides.baseColor || base.baseColor,
    inkColor: customOverrides.inkColor || base.inkColor,
    borderColor: customOverrides.borderColor || base.borderColor,
    fontFamily: customOverrides.fontFamily || 'Cinzel, Georgia, serif'
  };
}

/**
 * Desenha textura procedural rica para cada face do dado (incluindo D2 Moeda com Ovo [1] e Pegada [2],
 * sublinhado para 6. e 9., moldura chanfrada e veios de lava/galáxia/madeira/osso).
 */
export function renderNumberedDieFaceCanvas(label, skin, { size = 256, dieType = 'd20', cracked = false } = {}) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const s = getDiceSkinById(skin?.id || skin, typeof skin === 'object' ? skin : null);
  const grad = ctx.createRadialGradient(size * 0.38, size * 0.34, size * 0.06, size * 0.5, size * 0.5, size * 0.72);
  grad.addColorStop(0, s.accentColor || s.baseColor);
  grad.addColorStop(0.52, s.baseColor);
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Padrão procedural por material
  ctx.save();
  if (s.pattern === 'veins' || s.pattern === 'frost') {
    ctx.strokeStyle = s.accentColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 57) % size, 0);
      ctx.quadraticCurveTo(size * 0.5 + (i - 2) * 24, size * 0.5, size - ((i * 43) % size), size);
      ctx.stroke();
    }
  } else if (s.pattern === 'stars') {
    for (let i = 0; i < 28; i++) {
      const sx = (i * 73 + 19) % size;
      const sy = (i * 131 + 37) % size;
      ctx.fillStyle = i % 3 === 0 ? '#fde047' : '#ffffff';
      ctx.globalAlpha = 0.4 + (i % 5) * 0.12;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3) + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (s.pattern === 'wood' || s.pattern === 'grain') {
    ctx.strokeStyle = s.accentColor;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    for (let y = 10; y < size; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.33, y + 6, size * 0.66, y - 6, size, y + 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Moldura gravada chanfrada
  ctx.strokeStyle = s.borderColor;
  ctx.lineWidth = Math.max(4, size * 0.032);
  ctx.strokeRect(size * 0.07, size * 0.07, size * 0.86, size * 0.86);

  // D2 especial: Face 1 = Ovo de Dinossauro em Relevo | Face 2 = Pegada Jurássica em Relevo
  const text = String(label ?? '20');
  ctx.fillStyle = s.inkColor;
  ctx.shadowColor = 'rgba(0,0,0,0.72)';
  ctx.shadowBlur = size * 0.04;

  if (dieType === 'd2' && (text === '1' || text === '2')) {
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.39, 0, Math.PI * 2);
    ctx.lineWidth = size * 0.035;
    ctx.stroke();
    if (text === '1') {
      // Ovo de dinossauro com manchas
      ctx.beginPath();
      ctx.ellipse(size * 0.5, size * 0.5, size * 0.19, size * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.baseColor;
      ctx.beginPath();
      ctx.arc(size * 0.45, size * 0.44, size * 0.038, 0, Math.PI * 2);
      ctx.arc(size * 0.56, size * 0.55, size * 0.03, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Pegada tridáctila de dinossauro
      ctx.beginPath();
      ctx.ellipse(size * 0.5, size * 0.6, size * 0.13, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [tx, ty, rot] of [[0.36, 0.4, -0.35], [0.5, 0.34, 0], [0.64, 0.4, 0.35]]) {
        ctx.save();
        ctx.translate(size * tx, size * ty);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.045, size * 0.11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.fillStyle = s.inkColor;
    ctx.font = `900 ${Math.round(size * 0.15)}px ${s.fontFamily || 'Inter, sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.fillText(text, size * 0.5, size * 0.86);
  } else {
    const fontScale = text.length >= 3 ? 0.31 : (text.length === 2 ? 0.40 : 0.46);
    ctx.font = `900 ${Math.round(size * fontScale)}px ${s.fontFamily || 'Cinzel, Georgia, Inter, serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayTxt = (text === '6' || text === '9') ? `${text}.` : text;
    ctx.fillText(displayTxt, size * 0.5, size * 0.52);
  }

  // Falha Crítica (1 natural): rachadura dramática sobre a face
  if (cracked) {
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = Math.max(3, size * 0.024);
    ctx.beginPath();
    ctx.moveTo(size * 0.18, size * 0.15);
    ctx.lineTo(size * 0.46, size * 0.48);
    ctx.lineTo(size * 0.38, size * 0.62);
    ctx.lineTo(size * 0.78, size * 0.86);
    ctx.moveTo(size * 0.46, size * 0.48);
    ctx.lineTo(size * 0.76, size * 0.28);
    ctx.stroke();
  }

  return canvas;
}

/**
 * Cria MeshPhysicalMaterial / MeshStandardMaterial para uma skin de dado 3D.
 */
export function buildDiceSkinMaterial(skinId, faceTexture = null, customOverrides = null) {
  const s = getDiceSkinById(skinId, customOverrides);
  const params = {
    color: faceTexture ? 0xffffff : s.baseColor,
    map: faceTexture || null,
    roughness: s.roughness ?? 0.28,
    metalness: s.metalness ?? 0.2,
    transparent: Boolean(s.transparent),
    opacity: s.opacity ?? 1,
    emissive: new THREE.Color(s.emissive || '#000000'),
    emissiveIntensity: s.emissiveIntensity || 0
  };
  if (s.clearcoat && typeof THREE.MeshPhysicalMaterial === 'function') {
    return new THREE.MeshPhysicalMaterial({
      ...params,
      clearcoat: s.clearcoat,
      clearcoatRoughness: 0.12
    });
  }
  return new THREE.MeshStandardMaterial(params);
}

/**
 * Constrói uma Bandeja 3D esculpida (octogonal/retangular chanfrada com paredes de madeira/couro e fundo de feltro).
 */
export function buildSculptedDiceTray3D(surfaceId = 'felt', { width = 11, depth = 8.5, wallHeight = 1.05 } = {}) {
  const surf = TRAY_SURFACES[surfaceId] || TRAY_SURFACES.felt;
  const group = new THREE.Group();
  group.name = `dice_tray_${surf.id}`;

  const floorMat = new THREE.MeshStandardMaterial({ color: surf.floorColor, roughness: surf.roughness, metalness: 0.04 });
  const rimMat = new THREE.MeshStandardMaterial({ color: surf.rimColor, roughness: 0.58, metalness: 0.12 });
  const trimMat = new THREE.MeshStandardMaterial({ color: surf.trimColor, roughness: 0.26, metalness: 0.78 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.28, depth), floorMat);
  floor.position.y = -0.14;
  floor.receiveShadow = true;
  group.add(floor);

  const wallT = 0.42;
  const walls = [
    [width + wallT * 2, wallHeight, wallT, 0, wallHeight * 0.42, -depth * 0.5 - wallT * 0.5],
    [width + wallT * 2, wallHeight, wallT, 0, wallHeight * 0.42, depth * 0.5 + wallT * 0.5],
    [wallT, wallHeight, depth, -width * 0.5 - wallT * 0.5, wallHeight * 0.42, 0],
    [wallT, wallHeight, depth, width * 0.5 + wallT * 0.5, wallHeight * 0.42, 0]
  ];
  for (const [w, h, d, x, y, z] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rimMat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  // Cantoneiras metálicas douradas esculpidas nos 4 cantos (zero visual de caixa crua!)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.64, wallHeight + 0.1, 0.64), trimMat);
      cap.position.set(sx * (width * 0.5 + wallT * 0.5), wallHeight * 0.44, sz * (depth * 0.5 + wallT * 0.5));
      group.add(cap);
    }
  }

  group.userData.bounds = { halfW: width * 0.5 - 0.55, halfD: depth * 0.5 - 0.55, restitution: surf.restitution, friction: surf.friction };
  return group;
}

/**
 * Fallback 2D vetorial leve (SVG) para PCs fracos / celulares / modo sem animação (Parte 2.7).
 */
export function renderDie2DFallbackSVG(dieType = 'd20', value = 20, skinId = 'obsidian_resin', { size = 76 } = {}) {
  const s = getDiceSkinById(skinId);
  const v = String(value);
  const ptsByType = {
    d4: '38,6 70,66 6,66',
    d6: '12,12 64,12 64,64 12,64',
    d8: '38,5 70,38 38,71 6,38',
    d10: '38,5 69,30 56,69 20,69 7,30',
    d12: '38,5 66,19 71,50 51,71 25,71 5,50 10,19',
    d20: '38,4 68,21 68,55 38,72 8,55 8,21'
  };
  const poly = ptsByType[String(dieType).toLowerCase()] || '';
  const shape = poly
    ? `<polygon points="${poly}" fill="${s.baseColor}" stroke="${s.borderColor}" stroke-width="3" stroke-linejoin="round"/>`
    : `<circle cx="38" cy="38" r="33" fill="${s.baseColor}" stroke="${s.borderColor}" stroke-width="3"/>`;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 76 76" role="img" aria-label="${dieType.toUpperCase()} resultado ${v}">
      ${shape}
      <text x="38" y="43" text-anchor="middle" fill="${s.inkColor}" font-family="Cinzel, Inter, sans-serif" font-weight="900" font-size="${v.length >= 3 ? 17 : 22}">${v}</text>
      <text x="38" y="62" text-anchor="middle" fill="${s.borderColor}" font-family="Inter, sans-serif" font-weight="700" font-size="9">${String(dieType).toUpperCase()}</text>
    </svg>
  `.trim();
}
