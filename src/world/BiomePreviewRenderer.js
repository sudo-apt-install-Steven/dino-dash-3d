// Renderizador leve de miniaturas 3D REAIS dos biomas para todos os seletores de mapa (Parte 1.7).
// Usa UM ÚNICO WebGLRenderer offscreen sob demanda, renderiza um diorama 3D real com céu, neblina, sol,
// pista, rio/lava/oceano e elementos 3D do bioma, converte em dataURL e libera o contexto imediatamente
// (0 contextos WebGL persistentes, 0 impacto no FPS). Possui fallback Canvas2D ilustrado se WebGL indisponível.
import * as THREE from 'three';

const THUMB_CACHE = new Map();
const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);
const SHARED_CONE = new THREE.ConeGeometry(0.6, 1.4, 5);
const SHARED_OCTA = new THREE.OctahedronGeometry(0.55, 0);

function buildBiomeDioramaScene(biome) {
  const scene = new THREE.Scene();
  const t = biome?.theme || {
    sky: '#4b1d78', fog: '#663399', ground: '#3c2563', track: '#7c4dff',
    stripe: '#00f5d4', bank: '#512da8', river: '#00f5d4', sun: '#ffe066',
    scenery: { rock: '#5e35b1', flora: '#00f5d4', mesa: '#512da8', cloud: '#d1c4e9', wood: '#6b442a' }
  };
  const sc = t.scenery || {};
  const isPortal = biome?.id === 'random_portal';

  scene.background = new THREE.Color(isPortal ? '#1e1038' : (t.sky || '#38bdf8'));
  scene.fog = new THREE.FogExp2(isPortal ? '#2e1065' : (t.fog || t.sky || '#38bdf8'), 0.055);

  scene.add(new THREE.HemisphereLight(t.sun || '#fff5d6', t.ground || '#27272a', 1.15));
  const dir = new THREE.DirectionalLight(t.sun || '#ffe8b6', 1.7);
  dir.position.set(5, 8, 4);
  scene.add(dir);

  // Sol / Lua / Portal no horizonte
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(isPortal ? 1.45 : 1.15, 16, 12),
    new THREE.MeshBasicMaterial({ color: isPortal ? '#c084fc' : (t.sun || '#ffe066') })
  );
  sunMesh.position.set(isPortal ? 0 : 3.2, isPortal ? 2.8 : 4.2, -13);
  scene.add(sunMesh);

  if (isPortal) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.24, 10, 28),
      new THREE.MeshBasicMaterial({ color: '#22d3ee' })
    );
    ring.position.set(0, 2.8, -12.4);
    scene.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.7, 0.14, 8, 28),
      new THREE.MeshBasicMaterial({ color: '#f59e0b' })
    );
    ring2.position.set(0, 2.8, -12.6);
    ring2.rotation.z = 0.4;
    scene.add(ring2);
  }

  // Terreno base + pista 3D + faixas + margens + rio/lava/oceano
  const groundMat = new THREE.MeshStandardMaterial({ color: t.ground || '#a16207', roughness: 0.9 });
  const ground = new THREE.Mesh(SHARED_BOX, groundMat);
  ground.scale.set(28, 0.5, 28);
  ground.position.set(0, -0.35, -6);
  scene.add(ground);

  const trackMat = new THREE.MeshStandardMaterial({ color: t.track || '#d97706', roughness: 0.78 });
  const track = new THREE.Mesh(SHARED_BOX, trackMat);
  track.scale.set(4.6, 0.2, 24);
  track.position.set(0, -0.05, -6);
  scene.add(track);

  const stripeMat = new THREE.MeshStandardMaterial({
    color: t.stripe || '#fef08a',
    emissive: t.edgeGlow || '#000000',
    emissiveIntensity: t.edgeGlow ? 0.45 : 0
  });
  for (const x of [-1.45, 1.45]) {
    const rail = new THREE.Mesh(SHARED_BOX, stripeMat);
    rail.scale.set(0.16, 0.24, 24);
    rail.position.set(x, -0.02, -6);
    scene.add(rail);
  }

  const riverMat = new THREE.MeshStandardMaterial({
    color: t.river || '#0ea5e9',
    emissive: t.riverEmissive || '#000000',
    emissiveIntensity: biome?.heatDrain || biome?.submerged ? 0.55 : 0.22,
    roughness: 0.25,
    metalness: 0.18
  });
  const river = new THREE.Mesh(SHARED_BOX, riverMat);
  river.scale.set(biome?.submerged || biome?.oceanSurface ? 26 : 4.2, 0.22, 24);
  river.position.set(biome?.submerged || biome?.oceanSurface ? 0 : 4.6, biome?.submerged ? 0.08 : -0.04, -6);
  scene.add(river);

  // Montanhas / Mesas / Vulcão / Torres no fundo
  const mesaMat = new THREE.MeshStandardMaterial({ color: sc.mesa || t.bank || '#6b442a', roughness: 0.85 });
  const rockMat = new THREE.MeshStandardMaterial({ color: sc.rock || '#57534e', roughness: 0.82 });
  const floraMat = new THREE.MeshStandardMaterial({
    color: sc.flora || '#22c55e',
    emissive: sc.emissiveFlora || '#000000',
    emissiveIntensity: sc.emissiveIntensity || 0,
    roughness: 0.72
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: sc.wood || '#5c3a21', roughness: 0.88 });
  const glowMat = new THREE.MeshBasicMaterial({ color: t.edgeGlow || sc.flower || t.sun || '#ffd447' });

  const id = String(biome?.id || '');
  const isCrystal = id.includes('crystal') || id.includes('biolum');
  const isVolcano = Boolean(biome?.heatDrain) || id.includes('volcano') || id.includes('magma');
  const isIce = Boolean(biome?.slippery) || id.includes('ice') || id.includes('snow');
  const isTech = id.includes('orbital') || id.includes('mecha') || id.includes('alien') || id.includes('lunar');
  const isAquatic = Boolean(biome?.submerged || biome?.oceanSurface || biome?.waterTrack);

  // Marcos de fundo (silhueta imediata do bioma)
  const peaks = [[-5.6, -11, 3.4, 3.6], [-2.2, -12.5, 2.8, 2.8], [5.8, -11.5, 3.8, 4.1], [2.4, -12.8, 2.4, 2.5]];
  for (const [px, pz, pw, ph] of peaks) {
    if (isVolcano) {
      const cone = new THREE.Mesh(SHARED_CONE, mesaMat);
      cone.scale.set(pw * 0.9, ph, pw * 0.9);
      cone.position.set(px, ph * 0.45, pz);
      scene.add(cone);
      const lavaCap = new THREE.Mesh(SHARED_BOX, glowMat);
      lavaCap.scale.set(pw * 0.28, 0.35, pw * 0.28);
      lavaCap.position.set(px, ph * 0.95, pz);
      scene.add(lavaCap);
    } else if (isIce || isCrystal) {
      const spire = new THREE.Mesh(SHARED_OCTA, isCrystal ? floraMat : mesaMat);
      spire.scale.set(pw * 0.5, ph * 0.95, pw * 0.5);
      spire.position.set(px, ph * 0.42, pz);
      scene.add(spire);
    } else if (isTech) {
      const tower = new THREE.Mesh(SHARED_BOX, mesaMat);
      tower.scale.set(pw * 0.5, ph * 1.15, pw * 0.5);
      tower.position.set(px, ph * 0.55, pz);
      scene.add(tower);
      const beacon = new THREE.Mesh(SHARED_BOX, glowMat);
      beacon.scale.set(pw * 0.54, 0.22, pw * 0.54);
      beacon.position.set(px, ph * 0.82, pz);
      scene.add(beacon);
    } else {
      const mesa = new THREE.Mesh(SHARED_BOX, mesaMat);
      mesa.scale.set(pw, ph * 0.85, pw * 0.8);
      mesa.position.set(px, ph * 0.38, pz);
      scene.add(mesa);
      const cap = new THREE.Mesh(SHARED_BOX, rockMat);
      cap.scale.set(pw * 0.72, ph * 0.25, pw * 0.62);
      cap.position.set(px, ph * 0.88, pz);
      scene.add(cap);
    }
  }

  // Flora / Cristais / Corais / Cactos nas laterais da pista
  const props = [[-3.3, -2.5], [-4.1, -6.2], [-3.0, -9.2], [3.1, -3.4], [4.2, -7.8]];
  props.forEach(([x, z], idx) => {
    if (isCrystal) {
      const cry = new THREE.Mesh(SHARED_OCTA, idx % 2 ? glowMat : floraMat);
      cry.scale.set(0.65, 1.35 + (idx % 2) * 0.5, 0.65);
      cry.position.set(x, 0.65, z);
      scene.add(cry);
    } else if (isTech) {
      const pylon = new THREE.Mesh(SHARED_BOX, rockMat);
      pylon.scale.set(0.45, 1.5, 0.45);
      pylon.position.set(x, 0.75, z);
      scene.add(pylon);
      const light = new THREE.Mesh(SHARED_BOX, glowMat);
      light.scale.set(0.52, 0.24, 0.52);
      light.position.set(x, 1.35, z);
      scene.add(light);
    } else if (isAquatic) {
      const coral = new THREE.Mesh(SHARED_BOX, floraMat);
      coral.scale.set(0.32, 1.2 + (idx % 3) * 0.35, 0.32);
      coral.position.set(x, 0.65, z);
      scene.add(coral);
      const branch = new THREE.Mesh(SHARED_BOX, glowMat);
      branch.scale.set(0.75, 0.24, 0.24);
      branch.position.set(x, 1.0, z);
      scene.add(branch);
    } else {
      const trunk = new THREE.Mesh(SHARED_BOX, woodMat);
      trunk.scale.set(0.28, 1.05, 0.28);
      trunk.position.set(x, 0.52, z);
      scene.add(trunk);
      const canopy = new THREE.Mesh(SHARED_BOX, floraMat);
      canopy.scale.set(1.05, 0.72, 1.05);
      canopy.position.set(x, 1.25, z);
      scene.add(canopy);
    }
  });

  // Nuvens / Esporos no céu
  const cloudMat = new THREE.MeshBasicMaterial({ color: sc.cloud || '#ffffff', transparent: true, opacity: 0.7 });
  for (const [cx, cy, cz, cw] of [[-4.2, 4.4, -10.5, 2.4], [0.8, 4.8, -11.2, 2.8], [5.2, 4.1, -9.8, 2.1]]) {
    const cl = new THREE.Mesh(SHARED_BOX, cloudMat);
    cl.scale.set(cw, 0.48, 0.9);
    cl.position.set(cx, cy, cz);
    scene.add(cl);
  }

  return scene;
}

function renderFallbackCanvas2D(biome, width = 192, height = 96) {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const t = biome?.theme || {};
  const sc = t.scenery || {};
  const isPortal = biome?.id === 'random_portal';

  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.65);
  skyGrad.addColorStop(0, isPortal ? '#1e1038' : (t.sky || '#38bdf8'));
  skyGrad.addColorStop(1, isPortal ? '#4c1d95' : (t.fog || t.sky || '#93c5fd'));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Sol / Portal
  ctx.fillStyle = isPortal ? '#c084fc' : (t.sun || '#ffe066');
  ctx.beginPath();
  ctx.arc(isPortal ? width * 0.5 : width * 0.74, height * 0.28, isPortal ? 15 : 11, 0, Math.PI * 2);
  ctx.fill();
  if (isPortal) {
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.28, 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Silhueta de montanhas / mesas
  ctx.fillStyle = sc.mesa || t.bank || '#6b442a';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.62);
  ctx.lineTo(width * 0.16, height * 0.36);
  ctx.lineTo(width * 0.34, height * 0.54);
  ctx.lineTo(width * 0.58, height * 0.32);
  ctx.lineTo(width * 0.82, height * 0.5);
  ctx.lineTo(width, height * 0.38);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Terreno + pista em perspectiva + rio lateral
  ctx.fillStyle = t.ground || '#a16207';
  ctx.fillRect(0, height * 0.58, width, height * 0.42);

  ctx.fillStyle = t.river || '#0ea5e9';
  ctx.beginPath();
  ctx.moveTo(width * 0.66, height * 0.58);
  ctx.lineTo(width, height * 0.58);
  ctx.lineTo(width, height);
  ctx.lineTo(width * 0.74, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = t.track || '#d97706';
  ctx.beginPath();
  ctx.moveTo(width * 0.41, height * 0.58);
  ctx.lineTo(width * 0.59, height * 0.58);
  ctx.lineTo(width * 0.73, height);
  ctx.lineTo(width * 0.27, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = t.stripe || t.edgeGlow || '#fef08a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.43, height * 0.58);
  ctx.lineTo(width * 0.31, height);
  ctx.moveTo(width * 0.57, height * 0.58);
  ctx.lineTo(width * 0.69, height);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

/**
 * Renderiza e cacheia miniaturas 3D reais para uma lista de biomas em um único lote WebGL efêmero.
 * Retorna Map<biomeId, dataURL>.
 */
export function renderBiomeThumbnailsBatch(biomes = [], { width = 192, height = 96 } = {}) {
  const missing = biomes.filter((b) => b?.id && !THUMB_CACHE.has(b.id));
  if (missing.length === 0) return THUMB_CACHE;

  let renderer = null;
  let camera = null;
  try {
    if (typeof document !== 'undefined') {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(1);
      camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 60);
      camera.position.set(0, 2.65, 3.2);
      camera.lookAt(0, 1.05, -8.5);
    }
  } catch {
    renderer = null;
  }

  for (const biome of missing) {
    let url = '';
    if (renderer && camera) {
      try {
        const scene = buildBiomeDioramaScene(biome);
        renderer.render(scene, camera);
        url = renderer.domElement.toDataURL('image/webp', 0.86);
        if (!url || !url.startsWith('data:image/')) {
          url = renderer.domElement.toDataURL('image/png');
        }
        scene.traverse((obj) => {
          if (obj.isMesh) {
            if (obj.geometry && obj.geometry !== SHARED_BOX && obj.geometry !== SHARED_CONE && obj.geometry !== SHARED_OCTA) {
              obj.geometry.dispose();
            }
            if (obj.material) obj.material.dispose();
          }
        });
      } catch {
        url = '';
      }
    }
    if (!url) {
      url = renderFallbackCanvas2D(biome, width, height);
    }
    if (url) THUMB_CACHE.set(biome.id, url);
  }

  if (renderer) {
    try {
      renderer.dispose();
      renderer.forceContextLoss?.();
    } catch {}
  }

  return THUMB_CACHE;
}

export function getBiomeThumbnailUrl(biome, opts) {
  if (!biome?.id) return '';
  if (!THUMB_CACHE.has(biome.id)) {
    renderBiomeThumbnailsBatch([biome], opts);
  }
  return THUMB_CACHE.get(biome.id) || '';
}

export function clearBiomeThumbnailCache() {
  THUMB_CACHE.clear();
}
