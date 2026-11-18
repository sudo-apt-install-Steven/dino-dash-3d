// Galeria de Modelos 3D Voxel (/debug/models) — módulo independente.
// Permite inspecionar os 37 dinossauros, 14 bosses (Fases 1/2/3) e props da VoxelLibrary,
// testar animações em tempo real, girar a câmera e medir triângulos/voxels por modelo.
import * as THREE from 'three';
import { DINO_CATALOG } from '../dinos/DinoCatalog.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { DinoAnimator } from '../dinos/DinoAnimator.js';
import { BOSS_AUDIT_REPORT, buildBossModel } from '../events/BossModels.js';
import {
  buildVoxelPowerupCrate,
  buildVoxelElementalEgg,
  buildVoxelPortalArch,
  buildVoxelFruit,
  buildVoxelMudPool,
  buildVoxelToxicPool,
  countVoxelMeshes
} from './VoxelLibrary.js';

const DINO_ANIMS = [
  { id: 'idle', label: 'Parado' },
  { id: 'run', label: 'Correr' },
  { id: 'jump', label: 'Pular' },
  { id: 'duck', label: 'Abaixar' },
  { id: 'slide', label: 'Deslizar' },
  { id: 'swim', label: 'Nadar' },
  { id: 'fly', label: 'Voar' },
  { id: 'hurt', label: 'Dano (Hurt)' },
  { id: 'victory', label: 'Vitória' },
  { id: 'dead', label: 'Derrota' }
];

const SKIN_VARIANTS = [
  { id: 'normal', label: 'Normal' },
  { id: 'shiny', label: 'Shiny' },
  { id: 'mecha', label: 'Mecha' },
  { id: 'secret', label: 'Secreto' }
];

const BOSS_ANIMS = [
  { id: 'idle', label: 'Idle / Patrulha' },
  { id: 'roar', label: 'Rugido (Roar)' },
  { id: 'bite', label: 'Ataque (Bite)' },
  { id: 'tail_sweep', label: 'Golpe Cauda' }
];

const VOXEL_PROPS = [
  {
    id: 'crate',
    name: 'Caixa de Power-up',
    build: () => {
      const mat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.35, roughness: 0.35 });
      const res = buildVoxelPowerupCrate(mat);
      return { root: res.group, update: (t) => { res.core.rotation.y = t * 1.4; } };
    }
  },
  {
    id: 'egg',
    name: 'Ovo Elemental',
    build: () => {
      const mat = new THREE.MeshStandardMaterial({ color: '#a855f7', emissive: '#7e22ce', emissiveIntensity: 0.45, roughness: 0.25 });
      const res = buildVoxelElementalEgg(mat);
      return { root: res.group, update: (t) => { res.ring.rotation.z = t * 1.8; res.core.position.y = 0.98 + Math.sin(t * 2.5) * 0.08; } };
    }
  },
  {
    id: 'portal',
    name: 'Portal de Bioma',
    build: () => {
      const stone = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 });
      const rune = new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#06b6d4', emissiveIntensity: 0.9 });
      const vortex = new THREE.MeshStandardMaterial({ color: '#6366f1', transparent: true, opacity: 0.45, emissive: '#4f46e5', emissiveIntensity: 0.6 });
      const res = buildVoxelPortalArch(stone, rune, vortex);
      return { root: res.group };
    }
  },
  {
    id: 'fruit',
    name: 'Fruta Pré-Histórica',
    build: () => {
      const fruit = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.45 });
      const leaf = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.55 });
      const stem = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
      const res = buildVoxelFruit(fruit, leaf, stem);
      return { root: res.group };
    }
  },
  {
    id: 'mud',
    name: 'Poça de Lama',
    build: () => {
      const mud = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.4 });
      const bubble = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.35 });
      const rim = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.8 });
      const res = buildVoxelMudPool(mud, bubble, rim);
      return { root: res.group };
    }
  },
  {
    id: 'toxic',
    name: 'Poça Tóxica',
    build: () => {
      const rock = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 });
      const toxic = new THREE.MeshStandardMaterial({ color: '#84cc16', emissive: '#65a30d', emissiveIntensity: 0.75, roughness: 0.25 });
      const res = buildVoxelToxicPool(rock, toxic);
      return { root: res.group };
    }
  }
];

function computeTriangleCount(object3d) {
  let tris = 0;
  object3d?.traverse?.((node) => {
    if (!node.isMesh || !node.visible || !node.geometry) return;
    const geom = node.geometry;
    if (geom.index) {
      tris += geom.index.count / 3;
    } else if (geom.attributes?.position) {
      tris += geom.attributes.position.count / 3;
    }
  });
  return Math.round(tris);
}

function disposeObjectTree(object3d) {
  if (!object3d) return;
  object3d.traverse((node) => {
    if (!node.isMesh) return;
    if (Array.isArray(node.material)) {
      node.material.forEach((m) => m?.dispose?.());
    } else {
      node.material?.dispose?.();
    }
  });
}

/**
 * Abre a Galeria de Modelos 3D dentro de `container`.
 * @param {HTMLElement} container
 * @param {() => void} [onClose]
 */
export function openModelGallery(container, onClose) {
  if (!container) return null;

  let category = 'dinos'; // 'dinos' | 'bosses' | 'props'
  let selectedId = DINO_CATALOG[0]?.id || 'trex';
  let dinoAnim = 'run';
  let skinVariant = 'normal';
  let bossPhase = 1;
  let bossAnim = 'idle';
  let autoRotate = true;

  let camYaw = 0.55;
  let camPitch = 0.34;
  let camDist = 5.4;
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  let currentRoot = null;
  let currentAnimator = null;
  let currentBossRig = null;
  let currentPropUpdate = null;
  let animTime = 0;
  let lastFrame = performance.now();
  let rafId = 0;
  let destroyed = false;

  container.innerHTML = `
    <div id="mg-overlay" style="position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;background:#09090b;color:#f4f4f5;font-family:Inter,system-ui,-apple-system,sans-serif;">
      <header style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:rgba(24,24,27,0.9);border-bottom:1px solid rgba(63,63,70,0.7);gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#10b981);font-weight:700;font-size:16px;">3D</span>
          <div>
            <div style="font-weight:700;font-size:15px;letter-spacing:-0.01em;">Galeria de Modelos Voxel</div>
            <div style="font-size:12px;color:#a1a1aa;">Inspeção de silhueta, animações, fases de boss e orçamento de triângulos</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button data-cat="dinos" class="mg-tab" style="padding:7px 12px;border-radius:8px;border:1px solid #3f3f46;background:#4f46e5;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Dinos (${DINO_CATALOG.length})</button>
          <button data-cat="bosses" class="mg-tab" style="padding:7px 12px;border-radius:8px;border:1px solid #3f3f46;background:#18181b;color:#d4d4d8;font-size:12px;font-weight:600;cursor:pointer;">Bosses (${BOSS_AUDIT_REPORT.length})</button>
          <button data-cat="props" class="mg-tab" style="padding:7px 12px;border-radius:8px;border:1px solid #3f3f46;background:#18181b;color:#d4d4d8;font-size:12px;font-weight:600;cursor:pointer;">Props (${VOXEL_PROPS.length})</button>
          <button id="mg-close" style="margin-left:8px;padding:7px 14px;border-radius:8px;border:1px solid #52525b;background:#27272a;color:#f4f4f5;font-size:12px;font-weight:600;cursor:pointer;">Fechar ✕</button>
        </div>
      </header>

      <div style="flex:1;display:grid;grid-template-columns:280px 1fr;min-height:0;">
        <aside style="border-right:1px solid rgba(63,63,70,0.7);background:#0f0f12;display:flex;flex-direction:column;min-height:0;">
          <div style="padding:10px 12px;border-bottom:1px solid rgba(63,63,70,0.5);">
            <input id="mg-search" type="text" placeholder="Filtrar modelo..." style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid #3f3f46;background:#18181b;color:#f4f4f5;font-size:12px;outline:none;" />
          </div>
          <div id="mg-list" style="flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px;"></div>
        </aside>

        <main style="position:relative;display:flex;flex-direction:column;min-width:0;min-height:0;background:radial-gradient(circle at 50% 35%, #1e1b4b 0%, #09090b 70%);">
          <div id="mg-canvas-host" style="flex:1;position:relative;min-height:0;cursor:grab;"></div>

          <div id="mg-stats" style="position:absolute;top:14px;left:14px;padding:10px 14px;border-radius:10px;background:rgba(9,9,11,0.78);border:1px solid rgba(63,63,70,0.8);backdrop-filter:blur(8px);font-size:12px;pointer-events:none;display:flex;flex-direction:column;gap:3px;">
            <strong id="mg-model-title" style="font-size:14px;color:#fff;">—</strong>
            <span id="mg-model-meta" style="color:#a1a1aa;">—</span>
            <span id="mg-model-budget" style="color:#34d399;font-weight:600;">—</span>
          </div>

          <div style="position:absolute;top:14px;right:14px;display:flex;gap:6px;">
            <button id="mg-autorot" style="padding:6px 10px;border-radius:8px;border:1px solid #3f3f46;background:rgba(24,24,27,0.85);color:#f4f4f5;font-size:12px;cursor:pointer;">↻ Auto-Giro: ON</button>
            <button id="mg-zoom-in" style="padding:6px 10px;border-radius:8px;border:1px solid #3f3f46;background:rgba(24,24,27,0.85);color:#f4f4f5;font-size:12px;cursor:pointer;">＋</button>
            <button id="mg-zoom-out" style="padding:6px 10px;border-radius:8px;border:1px solid #3f3f46;background:rgba(24,24,27,0.85);color:#f4f4f5;font-size:12px;cursor:pointer;">－</button>
            <button id="mg-reset-cam" style="padding:6px 10px;border-radius:8px;border:1px solid #3f3f46;background:rgba(24,24,27,0.85);color:#f4f4f5;font-size:12px;cursor:pointer;">Reset</button>
          </div>

          <div id="mg-controls" style="padding:12px 16px;background:rgba(24,24,27,0.92);border-top:1px solid rgba(63,63,70,0.7);display:flex;flex-wrap:wrap;gap:8px;align-items:center;"></div>
        </main>
      </div>
    </div>
  `;

  const host = container.querySelector('#mg-canvas-host');
  const listEl = container.querySelector('#mg-list');
  const searchEl = container.querySelector('#mg-search');
  const controlsEl = container.querySelector('#mg-controls');
  const titleEl = container.querySelector('#mg-model-title');
  const metaEl = container.querySelector('#mg-model-meta');
  const budgetEl = container.querySelector('#mg-model-budget');

  // Cena Three.js
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), 0.1, 120);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
  renderer.shadowMap.enabled = true;
  host.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xe0e7ff, 0x1e293b, 1.0);
  scene.add(hemiLight);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
  keyLight.position.set(6, 10, 8);
  keyLight.castShadow = true;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x818cf8, 0.75);
  rimLight.position.set(-7, 4, -6);
  scene.add(rimLight);

  const grid = new THREE.GridHelper(14, 14, 0x4f46e5, 0x27272a);
  scene.add(grid);

  const updateBudgetReadout = () => {
    const meshes = countVoxelMeshes(currentRoot);
    const tris = computeTriangleCount(currentRoot);
    budgetEl.textContent = `${meshes} voxels/meshes • ${tris.toLocaleString('pt-BR')} triângulos`;
  };

  const clearCurrentModel = () => {
    if (currentRoot) {
      scene.remove(currentRoot);
      disposeObjectTree(currentRoot);
      currentRoot = null;
    }
    currentAnimator = null;
    currentBossRig = null;
    currentPropUpdate = null;
  };

  const loadModel = () => {
    clearCurrentModel();

    if (category === 'dinos') {
      const spec = DINO_CATALOG.find((d) => d.id === selectedId) || DINO_CATALOG[0];
      selectedId = spec.id;
      const model = DinoFactory.build(spec.id, { skinVariant }, { skinVariant });
      currentRoot = model.root;
      currentAnimator = new DinoAnimator(model);
      scene.add(currentRoot);
      camDist = 4.6;
      titleEl.textContent = `${spec.name} (${spec.id})`;
      metaEl.textContent = `Classe: ${spec.cls || 'dino'} • Skin: ${skinVariant}`;
    } else if (category === 'bosses') {
      const info = BOSS_AUDIT_REPORT.find((b) => b.id === selectedId) || BOSS_AUDIT_REPORT[0];
      selectedId = info.id;
      const rig = buildBossModel(info.id);
      rig.setPhase?.(bossPhase);
      currentBossRig = rig;
      currentRoot = rig.root;
      scene.add(currentRoot);
      camDist = 9.2;
      titleEl.textContent = `${info.name} — ${info.title}`;
      metaEl.textContent = `Fase ${bossPhase}/3 • Animação: ${bossAnim}`;
    } else {
      const prop = VOXEL_PROPS.find((p) => p.id === selectedId) || VOXEL_PROPS[0];
      selectedId = prop.id;
      const built = prop.build();
      currentRoot = built.root;
      currentPropUpdate = built.update || null;
      scene.add(currentRoot);
      camDist = 4.2;
      titleEl.textContent = prop.name;
      metaEl.textContent = 'Biblioteca Voxel (VoxelLibrary.js)';
    }

    updateBudgetReadout();
    renderControls();
    renderList();
  };

  const renderList = () => {
    const q = (searchEl.value || '').trim().toLowerCase();
    let items = [];
    if (category === 'dinos') {
      items = DINO_CATALOG.map((d) => ({ id: d.id, label: d.name, sub: d.cls || 'dino' }));
    } else if (category === 'bosses') {
      items = BOSS_AUDIT_REPORT.map((b) => ({ id: b.id, label: b.name, sub: b.title }));
    } else {
      items = VOXEL_PROPS.map((p) => ({ id: p.id, label: p.name, sub: 'Prop Voxel' }));
    }

    const filtered = q
      ? items.filter((it) => it.label.toLowerCase().includes(q) || it.id.toLowerCase().includes(q))
      : items;

    listEl.innerHTML = filtered.map((it) => {
      const active = it.id === selectedId;
      return `
        <button data-id="${it.id}" style="text-align:left;padding:8px 10px;border-radius:8px;border:1px solid ${active ? '#6366f1' : 'transparent'};background:${active ? 'rgba(99,102,241,0.2)' : 'rgba(24,24,27,0.6)'};color:${active ? '#fff' : '#d4d4d8'};cursor:pointer;display:flex;flex-direction:column;gap:2px;">
          <span style="font-size:12px;font-weight:600;">${it.label}</span>
          <span style="font-size:10px;color:#a1a1aa;">${it.sub}</span>
        </button>
      `;
    }).join('') || '<div style="padding:12px;font-size:12px;color:#71717a;">Nenhum modelo encontrado.</div>';

    listEl.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedId = btn.dataset.id;
        loadModel();
      });
    });
  };

  const renderControls = () => {
    if (category === 'dinos') {
      controlsEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="font-size:11px;color:#a1a1aa;font-weight:600;margin-right:4px;">Animação:</span>
          ${DINO_ANIMS.map((a) => `
            <button data-anim="${a.id}" style="padding:5px 9px;border-radius:6px;border:1px solid ${dinoAnim === a.id ? '#10b981' : '#3f3f46'};background:${dinoAnim === a.id ? 'rgba(16,185,129,0.22)' : '#18181b'};color:${dinoAnim === a.id ? '#6ee7b7' : '#d4d4d8'};font-size:11px;cursor:pointer;">${a.label}</button>
          `).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-left:auto;">
          <span style="font-size:11px;color:#a1a1aa;font-weight:600;">Skin:</span>
          ${SKIN_VARIANTS.map((v) => `
            <button data-skin="${v.id}" style="padding:5px 9px;border-radius:6px;border:1px solid ${skinVariant === v.id ? '#f59e0b' : '#3f3f46'};background:${skinVariant === v.id ? 'rgba(245,158,11,0.22)' : '#18181b'};color:${skinVariant === v.id ? '#fcd34d' : '#d4d4d8'};font-size:11px;cursor:pointer;">${v.label}</button>
          `).join('')}
        </div>
      `;
      controlsEl.querySelectorAll('button[data-anim]').forEach((btn) => {
        btn.addEventListener('click', () => {
          dinoAnim = btn.dataset.anim;
          if (currentAnimator) currentAnimator.reset();
          renderControls();
        });
      });
      controlsEl.querySelectorAll('button[data-skin]').forEach((btn) => {
        btn.addEventListener('click', () => {
          skinVariant = btn.dataset.skin;
          loadModel();
        });
      });
    } else if (category === 'bosses') {
      controlsEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;color:#a1a1aa;font-weight:600;">Fase do Boss:</span>
          ${[1, 2, 3].map((p) => `
            <button data-phase="${p}" style="padding:5px 11px;border-radius:6px;border:1px solid ${bossPhase === p ? '#ef4444' : '#3f3f46'};background:${bossPhase === p ? 'rgba(239,68,68,0.25)' : '#18181b'};color:${bossPhase === p ? '#fca5a5' : '#d4d4d8'};font-size:11px;font-weight:600;cursor:pointer;">Fase ${p}</button>
          `).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-left:auto;flex-wrap:wrap;">
          <span style="font-size:11px;color:#a1a1aa;font-weight:600;">Animação:</span>
          ${BOSS_ANIMS.map((a) => `
            <button data-banim="${a.id}" style="padding:5px 9px;border-radius:6px;border:1px solid ${bossAnim === a.id ? '#6366f1' : '#3f3f46'};background:${bossAnim === a.id ? 'rgba(99,102,241,0.25)' : '#18181b'};color:${bossAnim === a.id ? '#c7d2fe' : '#d4d4d8'};font-size:11px;cursor:pointer;">${a.label}</button>
          `).join('')}
        </div>
      `;
      controlsEl.querySelectorAll('button[data-phase]').forEach((btn) => {
        btn.addEventListener('click', () => {
          bossPhase = Number(btn.dataset.phase) || 1;
          currentBossRig?.setPhase?.(bossPhase);
          metaEl.textContent = `Fase ${bossPhase}/3 • Animação: ${bossAnim}`;
          updateBudgetReadout();
          renderControls();
        });
      });
      controlsEl.querySelectorAll('button[data-banim]').forEach((btn) => {
        btn.addEventListener('click', () => {
          bossAnim = btn.dataset.banim;
          metaEl.textContent = `Fase ${bossPhase}/3 • Animação: ${bossAnim}`;
          renderControls();
        });
      });
    } else {
      controlsEl.innerHTML = '<span style="font-size:12px;color:#a1a1aa;">Arraste para girar o modelo 3D e use o scroll ou botões +/- para zoom.</span>';
    }
  };

  // Tabs de categoria
  container.querySelectorAll('.mg-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      category = tab.dataset.cat;
      container.querySelectorAll('.mg-tab').forEach((t) => {
        const isAct = t.dataset.cat === category;
        t.style.background = isAct ? '#4f46e5' : '#18181b';
        t.style.color = isAct ? '#fff' : '#d4d4d8';
      });
      if (category === 'dinos') selectedId = DINO_CATALOG[0]?.id || 'trex';
      else if (category === 'bosses') selectedId = BOSS_AUDIT_REPORT[0]?.id || 'alpha_trex';
      else selectedId = VOXEL_PROPS[0]?.id || 'crate';
      loadModel();
    });
  });

  searchEl.addEventListener('input', renderList);

  const autoRotBtn = container.querySelector('#mg-autorot');
  autoRotBtn.addEventListener('click', () => {
    autoRotate = !autoRotate;
    autoRotBtn.textContent = `↻ Auto-Giro: ${autoRotate ? 'ON' : 'OFF'}`;
  });
  container.querySelector('#mg-zoom-in').addEventListener('click', () => { camDist = Math.max(2.2, camDist - 0.8); });
  container.querySelector('#mg-zoom-out').addEventListener('click', () => { camDist = Math.min(18, camDist + 0.8); });
  container.querySelector('#mg-reset-cam').addEventListener('click', () => {
    camYaw = 0.55;
    camPitch = 0.34;
    camDist = category === 'bosses' ? 9.2 : 4.6;
  });

  const onPointerDown = (e) => {
    dragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    host.style.cursor = 'grabbing';
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    camYaw -= dx * 0.01;
    camPitch = Math.max(-0.25, Math.min(1.25, camPitch + dy * 0.01));
  };
  const onPointerUp = () => {
    dragging = false;
    host.style.cursor = 'grab';
  };
  const onWheel = (e) => {
    e.preventDefault();
    camDist = Math.max(2.0, Math.min(20, camDist + e.deltaY * 0.005));
  };

  host.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  host.addEventListener('wheel', onWheel, { passive: false });

  const resizeObserver = new ResizeObserver(() => {
    if (destroyed) return;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(host);

  const buildDinoAnimState = (t) => {
    const base = {
      speed: 18,
      grounded: true,
      vy: 0,
      ducking: false,
      sliding: false,
      swimming: false,
      dead: false,
      victory: false,
      hurt: false,
      locomotion: null,
      diveDepth: 0,
      forceLand: false,
      giantScale: 1.0,
      laneLean: 0
    };
    switch (dinoAnim) {
      case 'idle': return { ...base, speed: 0 };
      case 'jump': return { ...base, grounded: false, vy: Math.cos(t * 4) * 9 };
      case 'duck': return { ...base, ducking: true };
      case 'slide': return { ...base, sliding: true, dashing: true };
      case 'swim': return { ...base, swimming: true, locomotion: 'aquatic' };
      case 'fly': return { ...base, grounded: false, locomotion: 'flying' };
      case 'hurt': return { ...base, hurt: true };
      case 'victory': return { ...base, victory: true };
      case 'dead': return { ...base, dead: true };
      default: return base;
    }
  };

  const tick = (now) => {
    if (destroyed) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    animTime += dt;

    if (autoRotate && !dragging) {
      camYaw += dt * 0.45;
    }

    if (currentAnimator) {
      currentAnimator.update(dt, buildDinoAnimState(animTime));
    } else if (currentBossRig?.updateAnimation) {
      currentBossRig.updateAnimation(animTime, dt, bossAnim);
    } else if (currentPropUpdate) {
      currentPropUpdate(animTime, dt);
    }

    const targetY = category === 'bosses' ? 2.1 : 1.0;
    camera.position.set(
      Math.sin(camYaw) * Math.cos(camPitch) * camDist,
      targetY + Math.sin(camPitch) * camDist,
      Math.cos(camYaw) * Math.cos(camPitch) * camDist
    );
    camera.lookAt(0, targetY, 0);

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    host.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    host.removeEventListener('wheel', onWheel);
    clearCurrentModel();
    renderer.dispose();
    container.innerHTML = '';
  };

  container.querySelector('#mg-close').addEventListener('click', () => {
    destroy();
    onClose?.();
  });

  loadModel();
  rafId = requestAnimationFrame(tick);
  return { destroy };
}
