// Tela de Seleção 3D de Dinossauros: modelo girando (arrastar para rotacionar),
// barras de atributos, passiva, habilidade, árvore de níveis 1-10 e botão "Testar".
import * as THREE from 'three';
import { DINO_CATALOG, DINO_CLASSES, getDinoSpec } from '../dinos/DinoCatalog.js';
import { getDinoSkins } from '../dinos/DinoCustomization.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { DinoAnimator } from '../dinos/DinoAnimator.js';
import { Save } from '../systems/Save.js';
import { ProgressionManager } from '../systems/Progression.js';
import { attachModalHelp } from './Menus.js';
import { renderSkillSvg } from './SvgIcons.js';

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
    this.width = Math.max(180, containerEl.clientWidth || 260);
    this.height = Math.max(170, containerEl.clientHeight || 225);
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
    let classFilter = 'all';
    let preview = null;
    let noticeMsg = '';
    let dinoScrollTop = 0;

    const render = () => {
      const prevList = container.querySelector('#sel-dino-list');
      if (prevList) dinoScrollTop = prevList.scrollTop;
      queueMicrotask(() => {
        const listEl = container.querySelector('#sel-dino-list');
        if (listEl) listEl.scrollTop = dinoScrollTop;
      });
      const spec = getDinoSpec(currentId);
      const cls = DINO_CLASSES[spec.dinoClass] || DINO_CLASSES.carnivore;
      const level = Save.data.dinoLevels[currentId] || 1;
      const upgradeCost = ProgressionManager.getSkillUpgradeCost(level);
      const allNonSecret = DINO_CATALOG.filter(
        (d) => !d.secret || Save.data.unlockedDinos.includes(d.id)
      );
      const filteredDinos = classFilter === 'all'
        ? allNonSecret
        : allNonSecret.filter((d) => d.dinoClass === classFilter);
      const hasSecret = Save.data.unlockedDinos.includes('ghostgold');
      const isUnlocked = Save.data.unlockedDinos.includes(currentId) || (spec.unlockCost || 0) === 0;
      const isEquipped = isUnlocked && currentId === Save.data.selectedDino;
      const unlockedCount = DINO_CATALOG.filter((d) => Save.data.unlockedDinos.includes(d.id)).length;

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card dino-modal">
            <div class="modal-header">
              <h2>🦖 Dinossauros (${unlockedCount}/${DINO_CATALOG.length})</h2>
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <span class="hud-pill">🥚 Ovos: <strong>${Save.data.eggs}</strong></span>
                <button class="chunky-btn secondary" id="sel-close">Voltar</button>
              </div>
            </div>

            ${noticeMsg ? `<div class="hud-pill" style="color:#ffd447; text-align:center; padding:6px 12px; font-size:0.82rem;">${noticeMsg}</div>` : ''}

            <div class="tabs-row" style="margin-bottom:6px;">
              <button class="tab-btn ${classFilter === 'all' ? 'active' : ''}" data-cfilter="all">Todos (${allNonSecret.length})</button>
              ${Object.entries(DINO_CLASSES).map(([k, info]) => `
                <button class="tab-btn ${classFilter === k ? 'active' : ''}" data-cfilter="${k}">${info.name.pt}</button>
              `).join('')}
            </div>

            <div class="preview-split">
              <div>
                <div class="preview-canvas-box" id="sel-preview-box"></div>
                <p style="font-size:0.75rem; color:#d8c2a6; text-align:center; margin-top:6px;">
                  Arraste para girar o modelo 3D • ${isUnlocked ? '✔ Desbloqueado' : `🔒 Custo: ${spec.unlockCost} 🥚`}
                </p>
                <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
                  <button class="chunky-btn ${isUnlocked ? '' : 'orange'}" id="sel-confirm" style="flex:1 1 150px; white-space:nowrap; font-size:0.86rem; padding:9px 12px;">
                    ${isUnlocked ? (isEquipped ? '✔ Equipado' : 'Equipar') : `🔓 Liberar (${spec.unlockCost} 🥚)`}
                  </button>
                  <button class="chunky-btn secondary" id="sel-test" style="padding:9px 12px; font-size:0.86rem;">Testar</button>
                  <button class="chunky-btn secondary" id="sel-roar" style="padding:9px 12px; font-size:0.86rem;">🔊 Rugido</button>
                </div>
                <div style="margin-top:8px;">
                  <div style="font-size:0.74rem; color:#ffd447; margin-bottom:4px;">🎨 Skins Fixas da Espécie:</div>
                  <div class="tabs-row" style="gap:6px;">
                    ${(() => {
                      const activePreset = Save.data.customization.p1.presets[Save.data.customization.p1.activePreset];
                      const skins = getDinoSkins(spec);
                      return skins.map((sk) => {
                        const isSkinActive = activePreset.skinId ? activePreset.skinId === sk.id : (!activePreset.useCustomColors && sk.isOriginal);
                        return `<button class="tab-btn ${isSkinActive ? 'active' : ''}" data-skin-id="${sk.id}" title="${sk.badge}">${sk.badge} ${sk.name}</button>`;
                      }).join('');
                    })()}
                  </div>
                </div>
              </div>

              <div style="display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <h3 style="font-size:1.35rem; color:#ffd447;">${spec.name}</h3>
                  <span class="hud-pill">${cls.name.pt} • Nv.${level}/10</span>
                </div>
                <div style="font-size:0.84rem; color:#9ce6e0;">Passiva: ${cls.passive.pt}</div>
                <div class="item-card" style="padding:10px;">
                  <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                    ${renderSkillSvg(spec.id, 34)}
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <strong style="color:#ff9a24;">Habilidade: ${spec.ability.name}</strong>
                      <span style="font-size:0.84rem; color:#e5d3bc;">${spec.ability.desc}</span>
                    </div>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                    <span style="font-size:0.78rem; color:#ffd447;">Árvore de Habilidade Nv.${level} (+${(level - 1) * 8}% poder)</span>
                    <button class="tab-btn" id="sel-upgrade" ${(!isUnlocked || level >= 10) ? 'disabled' : ''}>
                      ${!isUnlocked ? 'Desbloqueie antes' : (level >= 10 ? 'MÁXIMO' : `Evoluir (${upgradeCost} 🥚)`)}
                    </button>
                  </div>
                </div>

                ${[
                  ['Velocidade', spec.stats.speed],
                  ['Pulo', spec.stats.jump],
                  ['Vida', spec.stats.hp * 2],
                  ['Defesa', spec.stats.defense],
                  ['Ataque (Q)', spec.stats.attack || 6]
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

            <div class="dino-selector-row" id="sel-dino-list">
              ${filteredDinos.map((d) => {
                const owned = Save.data.unlockedDinos.includes(d.id) || (d.unlockCost || 0) === 0;
                return `
                  <button class="tab-btn ${d.id === currentId ? 'active' : ''}" data-dino-id="${d.id}" title="${d.name}">
                    ${d.id === Save.data.selectedDino ? '★ ' : (!owned ? '🔒 ' : '')}${d.name}
                  </button>
                `;
              }).join('')}
              ${!hasSecret ? `<button class="tab-btn" id="sel-secret-locked" style="opacity:0.75;">🔒 ??? (Secreto)</button>` : ''}
            </div>
          </div>
        </div>
      `;

      const previewBox = container.querySelector('#sel-preview-box');
      if (preview) preview.destroy();
      const custom = Save.data.customization.p1.presets[Save.data.customization.p1.activePreset];
      preview = new DinoPreview3D(previewBox, currentId, custom);

      container.querySelectorAll('[data-cfilter]').forEach((btn) => {
        btn.addEventListener('click', () => {
          classFilter = btn.getAttribute('data-cfilter');
          render();
        });
      });

      container.querySelectorAll('[data-dino-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          noticeMsg = '';
          currentId = btn.getAttribute('data-dino-id');
          if (onPlayRoar) onPlayRoar(currentId);
          render();
        });
      });

      container.querySelector('#sel-secret-locked')?.addEventListener('click', () => {
        noticeMsg = '👻 Dino Dourado/Fantasma Secreto: alcance conquistas difíceis ou digite ↑↑↓↓←→←→BA no menu!';
        render();
      });

      container.querySelector('#sel-roar')?.addEventListener('click', () => {
        if (onPlayRoar) onPlayRoar(currentId);
      });

      container.querySelectorAll('[data-skin-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const skinId = btn.getAttribute('data-skin-id');
          const skins = getDinoSkins(spec);
          const skin = skins.find((s) => s.id === skinId);
          if (!skin) return;
          const p1c = Save.data.customization.p1;
          const preset = p1c.presets[p1c.activePreset];
          preset.skinId = skin.id;
          preset.useCustomColors = !skin.isOriginal;
          preset.primary = skin.primary;
          preset.secondary = skin.secondary;
          preset.eye = skin.eye;
          preset.spots = skin.spots;
          preset.spikes = skin.spikes;
          preset.pattern = skin.pattern || 'solid';
          Save.save();
          noticeMsg = `${skin.badge} Skin "${skin.name}" aplicada em ${spec.name}!`;
          render();
        });
      });

      container.querySelector('#sel-upgrade')?.addEventListener('click', () => {
        const res = ProgressionManager.upgradeDinoSkill(currentId);
        if (res.ok) {
          noticeMsg = `✨ ${spec.name} evoluiu para Nível ${res.level}!`;
        } else {
          noticeMsg = res.reason;
        }
        render();
      });

      container.querySelector('#sel-confirm').addEventListener('click', () => {
        if (!isUnlocked) {
          const cost = spec.unlockCost || 0;
          if ((Save.data.eggs || 0) < cost) {
            noticeMsg = `Você precisa de ${cost} 🥚 para desbloquear ${spec.name} (ou clique Testar)!`;
            render();
            return;
          }
          Save.addEggs(-cost);
          if (!Save.data.unlockedDinos.includes(currentId)) Save.data.unlockedDinos.push(currentId);
          noticeMsg = `🎉 ${spec.name} desbloqueado e equipado!`;
        }
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
        // Permite testar qualquer espécie gratuitamente na pista sem alterar compra permanente se trancado
        if (isUnlocked) {
          Save.data.selectedDino = currentId;
          Save.save();
        }
        preview?.destroy();
        if (onTestTrack) onTestTrack(currentId);
      });

      container.querySelector('#sel-close').addEventListener('click', () => {
        preview?.destroy();
        if (onClose) onClose();
      });
      attachModalHelp(container, 'Gire o dino em 3D, compare passivas e atributos, evolua a habilidade e clique em "Testar" antes de comprar.');
    };

    render();
    return () => preview?.destroy();
  }
}
