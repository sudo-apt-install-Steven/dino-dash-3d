// Tela de Seleção 3D de Dinossauros: modelo girando (arrastar para rotacionar),
// barras de atributos, passiva, habilidade, árvore de níveis 1-10 e botão "Testar".
import * as THREE from 'three';
import { DINO_CATALOG, DINO_CLASSES, getDinoSpec } from '../dinos/DinoCatalog.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { DinoAnimator } from '../dinos/DinoAnimator.js';
import { Save } from '../systems/Save.js';
import { ProgressionManager } from '../systems/Progression.js';

let _sharedPreviewStage = null;

function getSharedPreviewStage() {
  if (_sharedPreviewStage) return _sharedPreviewStage;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
  camera.position.set(0, 2.0, 5.1);
  camera.lookAt(0, 1.0, 0);

  scene.add(new THREE.HemisphereLight('#fff2d6', '#5e2c14', 1.1));
  const key = new THREE.DirectionalLight('#ffdca8', 1.8);
  key.position.set(3, 5, 4);
  scene.add(key);

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.25, 2.4),
    new THREE.MeshStandardMaterial({ color: '#c48640', roughness: 0.85 })
  );
  pedestal.position.y = -0.14;
  scene.add(pedestal);

  _sharedPreviewStage = { renderer, scene, camera };
  return _sharedPreviewStage;
}

export class DinoPreview3D {
  constructor(containerEl, dinoId, customConfig = null) {
    this.stage = getSharedPreviewStage();
    this.renderer = this.stage.renderer;
    this.scene = this.stage.scene;
    this.camera = this.stage.camera;

    this.model = null;
    this.animator = null;
    this.rotY = -0.6;
    this.dragging = false;
    this.lastX = 0;

    this.mountInto(containerEl);
    this.setDino(dinoId, customConfig);
    this._bindDrag(this.renderer.domElement);

    this.lastTime = performance.now();
    this._raf = requestAnimationFrame(this._tick.bind(this));
  }

  mountInto(containerEl) {
    this.container = containerEl;
    this.width = Math.max(240, containerEl.clientWidth || 280);
    this.height = Math.max(220, containerEl.clientHeight || 270);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    containerEl.innerHTML = '';
    containerEl.appendChild(this.renderer.domElement);
  }

  _clearCurrentModel() {
    if (!this.model) return;
    this.scene.remove(this.model.root);
    const disposedMats = new Set();
    for (const mesh of this.model.allMeshes || []) {
      if (mesh.material && !disposedMats.has(mesh.material)) {
        disposedMats.add(mesh.material);
        mesh.material.dispose();
      }
    }
    this.model = null;
  }

  setDino(dinoId, customConfig = null) {
    this._clearCurrentModel();
    this.model = DinoFactory.build(dinoId, customConfig);
    this.model.root.rotation.y = this.rotY;
    this.scene.add(this.model.root);
    this.animator = new DinoAnimator(this.model);
  }

  _bindDrag(el) {
    this._onDown = (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
    };
    this._onMove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.rotY += dx * 0.015;
    };
    this._onUp = () => {
      this.dragging = false;
    };
    el.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
  }

  _tick(now) {
    this._raf = requestAnimationFrame(this._tick.bind(this));
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (!this.dragging) this.rotY += dt * 0.75;
    if (this.model) {
      this.model.root.rotation.y = this.rotY;
      this.animator?.update(dt, { speed: 12, grounded: true });
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this.renderer.domElement.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    this._clearCurrentModel();
  }
}

export class SelectionScreen {
  static renderInto(container, { onClose, onSelect, onTestTrack, onPlayRoar }) {
    let currentId = Save.data.selectedDino || 'trex';
    let preview = null;
    let secretNotice = '';

    const render = () => {
      const spec = getDinoSpec(currentId);
      const cls = DINO_CLASSES[spec.dinoClass] || DINO_CLASSES.carnivore;
      const level = Save.data.dinoLevels[currentId] || 1;
      const upgradeCost = level * 10;
      const availableDinos = DINO_CATALOG.filter(
        (d) => !d.secret || Save.data.unlockedDinos.includes(d.id)
      );
      const hasSecret = Save.data.unlockedDinos.includes('ghostgold');
      const isEquipped = currentId === Save.data.selectedDino;

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card">
            <div class="modal-header">
              <h2>🦖 Seleção de Dinossauros (${availableDinos.length}/14)</h2>
              <div style="display:flex; gap:8px; align-items:center;">
                <span class="hud-pill">🥚 Ovos: <strong>${Save.data.eggs}</strong></span>
                <button class="chunky-btn secondary" id="sel-close">Voltar</button>
              </div>
            </div>

            ${secretNotice ? `<div class="hud-pill" style="color:#ffd447; text-align:center;">${secretNotice}</div>` : ''}

            <div class="preview-split">
              <div>
                <div class="preview-canvas-box" id="sel-preview-box"></div>
                <p style="font-size:0.75rem; color:#d8c2a6; text-align:center; margin-top:6px;">
                  Arraste para girar o modelo 3D
                </p>
                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                  <button class="chunky-btn" id="sel-confirm" style="flex:1;">${isEquipped ? '✔ Equipado' : 'Equipar'}</button>
                  <button class="chunky-btn orange" id="sel-test">Testar</button>
                  <button class="chunky-btn secondary" id="sel-roar">🔊 Rugido</button>
                </div>
              </div>

              <div style="display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h3 style="font-size:1.35rem; color:#ffd447;">${spec.name}</h3>
                  <span class="hud-pill">${cls.name.pt} • Nv.${level}/10</span>
                </div>
                <div style="font-size:0.84rem; color:#9ce6e0;">Passiva: ${cls.passive.pt}</div>
                <div class="item-card" style="padding:10px;">
                  <strong style="color:#ff9a24;">Habilidade: ${spec.ability.name}</strong>
                  <span style="font-size:0.84rem; color:#e5d3bc;">${spec.ability.desc}</span>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                    <span style="font-size:0.78rem; color:#ffd447;">Árvore de Habilidade Nv.${level} (+${(level - 1) * 8}% poder)</span>
                    <button class="tab-btn" id="sel-upgrade" ${level >= 10 ? 'disabled' : ''}>
                      ${level >= 10 ? 'MÁXIMO' : `Evoluir (${upgradeCost} 🥚)`}
                    </button>
                  </div>
                </div>

                ${[
                  ['Velocidade', spec.stats.speed],
                  ['Pulo', spec.stats.jump],
                  ['Vida', spec.stats.hp * 2],
                  ['Defesa', spec.stats.defense],
                  ['Energia', spec.stats.energy]
                ].map(([label, v]) => `
                  <div class="attr-row">
                    <span>${label}</span>
                    <div class="attr-bar"><div class="attr-fill" style="width:${Math.min(100, v * 10)}%"></div></div>
                    <strong style="width:24px; text-align:right;">${v}</strong>
                  </div>
                `).join('')}

                <p style="font-size:0.8rem; color:#d8c2a6; font-style:italic;">
                  💡 Curiosidade: ${spec.fact.pt}
                </p>
              </div>
            </div>

            <div class="tabs-row" style="margin-top:4px;">
              ${availableDinos.map((d) => `
                <button class="tab-btn ${d.id === currentId ? 'active' : ''}" data-dino-id="${d.id}">
                  ${d.id === Save.data.selectedDino ? '★ ' : ''}${d.name}
                </button>
              `).join('')}
              ${!hasSecret ? `<button class="tab-btn" id="sel-secret-locked" style="opacity:0.75;">🔒 ??? (Secreto)</button>` : ''}
            </div>
          </div>
        </div>
      `;

      const previewBox = container.querySelector('#sel-preview-box');
      if (preview) preview.destroy();
      const custom = Save.data.customization.p1.presets[Save.data.customization.p1.activePreset];
      preview = new DinoPreview3D(previewBox, currentId, custom);

      container.querySelectorAll('[data-dino-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          secretNotice = '';
          currentId = btn.getAttribute('data-dino-id');
          if (onPlayRoar) onPlayRoar(currentId);
          render();
        });
      });

      container.querySelector('#sel-secret-locked')?.addEventListener('click', () => {
        secretNotice = '👻 Dino Dourado/Fantasma Secreto: alcance conquistas difíceis ou digite ↑↑↓↓←→←→BA no menu!';
        render();
      });

      container.querySelector('#sel-roar')?.addEventListener('click', () => {
        if (onPlayRoar) onPlayRoar(currentId);
      });

      container.querySelector('#sel-upgrade')?.addEventListener('click', () => {
        const res = ProgressionManager.upgradeDinoSkill(currentId);
        if (res.ok) render();
      });

      container.querySelector('#sel-confirm').addEventListener('click', () => {
        Save.data.selectedDino = currentId;
        if (!Save.data.albumDiscovered.includes(currentId)) {
          Save.data.albumDiscovered.push(currentId);
        }
        Save.save();
        preview?.destroy();
        if (onSelect) onSelect(currentId);
        if (onClose) onClose();
      });

      container.querySelector('#sel-test').addEventListener('click', () => {
        Save.data.selectedDino = currentId;
        Save.save();
        preview?.destroy();
        if (onTestTrack) onTestTrack(currentId);
      });

      container.querySelector('#sel-close').addEventListener('click', () => {
        preview?.destroy();
        if (onClose) onClose();
      });
    };

    render();
    return () => preview?.destroy();
  }
}
