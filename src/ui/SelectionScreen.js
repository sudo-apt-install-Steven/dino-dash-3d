// Tela de Seleção 3D de Dinossauros: modelo girando (arrastar para rotacionar),
// barras de atributos, passiva, habilidade, árvore de níveis 1-10 e botão "Testar".
import * as THREE from 'three';
import { DINO_CATALOG, DINO_CLASSES, getDinoSpec, getDinoHabitat, getEffectiveDinoHabitat, getDinoSwimCapabilities } from '../dinos/DinoCatalog.js';
import { getDinoSkins, getEquippedSkinVariant, SKIN_VARIANTS } from '../dinos/DinoCustomization.js';
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

  const pedestalMat = new THREE.MeshStandardMaterial({ color: '#c48640', roughness: 0.85, transparent: false, opacity: 1 });
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.25, 2.5),
    pedestalMat
  );
  pedestal.position.y = -0.14;
  scene.add(pedestal);

  const waterRing = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.24, 28),
    new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  );
  waterRing.rotation.x = -Math.PI / 2;
  waterRing.position.y = 0.01;
  waterRing.visible = false;
  scene.add(waterRing);

  _sharedPreviewStage = { renderer, scene, camera, pedestal, pedestalMat, waterRing };
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
    this.forceLand = false;

    this.mountInto(containerEl);
    this.setDino(dinoId, customConfig);
    this._bindDrag(this.renderer.domElement);

    this.lastTime = performance.now();
    this._raf = requestAnimationFrame(this._tick.bind(this));
  }

  mountInto(containerEl) {
    this.container = containerEl;
    const syncSize = () => {
      if (!this.container) return;
      this.width = Math.max(180, this.container.clientWidth || 260);
      this.height = Math.max(170, this.container.clientHeight || 225);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height, false);
    };
    syncSize();
    this._syncSize = syncSize;
    if (typeof ResizeObserver !== 'undefined') {
      this._ro?.disconnect();
      this._ro = new ResizeObserver(syncSize);
      this._ro.observe(containerEl);
    }
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

  setDino(dinoId, customConfig = null, options = {}) {
    this._clearCurrentModel();
    if (options.forceLand !== undefined) {
      this.forceLand = !!options.forceLand;
    } else if (customConfig && customConfig.mutation === 'extra_limbs') {
      this.forceLand = true;
    } else {
      this.forceLand = false;
    }
    const habInfo = getEffectiveDinoHabitat(dinoId, {
      hybrid: customConfig?.hybrid,
      mutationId: customConfig?.mutation || options?.mutation || null
    });
    this.isAquaticPreview = habInfo.primary === 'aquatic' && !this.forceLand;
    this.isFlyingPreview = habInfo.primary === 'flying' && !this.forceLand;
    if (this.stage.pedestalMat) {
      if (this.isAquaticPreview) {
        this.stage.pedestalMat.color.set('#0284c7');
        this.stage.pedestalMat.emissive.set('#0369a1');
        this.stage.pedestalMat.emissiveIntensity = 0.42;
        this.stage.pedestalMat.roughness = 0.16;
        this.stage.pedestalMat.transparent = true;
        this.stage.pedestalMat.opacity = 0.86;
      } else {
        this.stage.pedestalMat.color.set(this.isFlyingPreview ? '#64748b' : '#c48640');
        this.stage.pedestalMat.emissive.set('#000000');
        this.stage.pedestalMat.emissiveIntensity = 0;
        this.stage.pedestalMat.roughness = 0.85;
        this.stage.pedestalMat.transparent = false;
        this.stage.pedestalMat.opacity = 1;
      }
      this.stage.pedestalMat.needsUpdate = true;
    }
    if (this.stage.waterRing) {
      this.stage.waterRing.visible = this.isAquaticPreview;
    }
    this.model = DinoFactory.build(dinoId, customConfig, options);
    this.model.root.rotation.y = this.rotY;
    this.model.root.position.y = this.isAquaticPreview ? 0.24 : 0;
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
      this.animator?.update(dt, {
        speed: 12,
        grounded: !this.isFlyingPreview,
        swimming: !!this.isAquaticPreview,
        locomotion: this.isAquaticPreview ? 'aquatic' : (this.isFlyingPreview ? 'flying' : 'land'),
        forceLand: this.forceLand
      });
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._ro?.disconnect();
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

    const allNonSecret = DINO_CATALOG.filter(
      (d) => !d.secret || Save.data.unlockedDinos.includes(d.id)
    );
    const hasSecret = Save.data.unlockedDinos.includes('ghostgold');
    const unlockedCount = DINO_CATALOG.filter((d) => Save.data.unlockedDinos.includes(d.id)).length;

    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card dino-modal" id="sel-modal-card">
          <div class="modal-header">
            <h2 id="sel-heading">🦖 Dinossauros (${unlockedCount}/${DINO_CATALOG.length})</h2>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <span class="hud-pill">🥚 Ovos: <strong id="sel-eggs-val">${Save.data.eggs}</strong></span>
              <button class="chunky-btn secondary" id="sel-close">Voltar</button>
            </div>
          </div>

          <div class="preview-split">
            <div class="sel-stage-col" id="sel-stage-col">
              <div class="preview-canvas-box" id="sel-preview-box"></div>
              <p id="sel-lock-hint" style="font-size:0.75rem; color:#d8c2a6; text-align:center; margin-top:4px;"></p>
              <div class="sel-action-bar">
                <button class="chunky-btn" id="sel-confirm" style="flex:1 1 135px; white-space:nowrap; font-size:0.86rem; padding:9px 12px;"></button>
                <button class="chunky-btn secondary" id="sel-test" style="padding:9px 12px; font-size:0.86rem;">Testar</button>
                <button class="chunky-btn secondary" id="sel-roar" style="padding:9px 12px; font-size:0.86rem;">🔊 Rugido</button>
              </div>
              <div class="sel-skins-wrap">
                <div style="font-size:0.72rem; color:#ffd447; margin-bottom:3px;">🎨 Skins Fixas:</div>
                <div class="tabs-row" id="sel-skins-row" style="gap:5px;"></div>
              </div>
            </div>

            <div class="sel-details-col" id="sel-details-col">
              <div class="hud-pill" id="sel-hybrid-banner" style="display:none; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; background:rgba(139,92,246,0.22); border-color:#a855f7; color:#f3e8ff; padding:6px 10px; font-size:0.8rem;">
                <span>🧬 Modo Híbrido Ativo (sobrepõe dino na corrida)</span>
                <button class="tab-btn" id="sel-disable-hybrid" style="padding:4px 9px; font-size:0.74rem; border-color:#c084fc;">Usar Dino Puro</button>
              </div>
              <div class="hud-pill" id="sel-notice" style="color:#ffd447; text-align:center; padding:6px 12px; font-size:0.82rem; display:none;"></div>
              <div id="sel-details" style="display:flex; flex-direction:column; gap:9px;"></div>
            </div>
          </div>

          <div class="sel-bottom-dock" id="sel-bottom-dock">
            <div class="tabs-row sel-filter-tabs" id="sel-filter-tabs">
              <button class="tab-btn active" data-cfilter="all">Todos (${allNonSecret.length})</button>
              ${Object.entries(DINO_CLASSES).map(([k, info]) => `
                <button class="tab-btn" data-cfilter="${k}">${info.name.pt}</button>
              `).join('')}
            </div>
            <div class="dino-selector-row" id="sel-dino-list"></div>
          </div>
        </div>
      </div>
    `;

    const modalCard = container.querySelector('#sel-modal-card');
    const detailsCol = container.querySelector('#sel-details-col');
    const previewBox = container.querySelector('#sel-preview-box');
    const getCustomFor = (id) => {
      const baseCustom = Save.data.customization.p1.presets[Save.data.customization.p1.activePreset];
      return {
        ...(baseCustom || {}),
        skinVariant: getEquippedSkinVariant(id),
        mutation: Save.data.equippedMutation || null
      };
    };

    preview = new DinoPreview3D(previewBox, currentId, getCustomFor(currentId), { allowHybrid: false });

    const equipDino = (id, notify = true) => {
      const targetSpec = getDinoSpec(id);
      const owned = Save.data.unlockedDinos.includes(id) || (targetSpec.unlockCost || 0) === 0;
      if (!owned) return false;
      const hadHybrid = Boolean(Save.data.hybrid?.enabled);
      if (hadHybrid) {
        Save.data.hybrid.enabled = false;
      }
      Save.data.selectedDino = id;
      if (!Save.data.albumDiscovered.includes(id)) {
        Save.data.albumDiscovered.push(id);
      }
      Save.save();
      if (onSelect) onSelect(id);
      if (notify) {
        noticeMsg = hadHybrid
          ? `✅ ${targetSpec.name} equipado! (Modo Híbrido desativado para correr com este dino)`
          : `★ ${targetSpec.name} equipado para a próxima corrida!`;
      }
      return true;
    };

    const syncListSelection = () => {
      const listEl = container.querySelector('#sel-dino-list');
      if (!listEl) return;
      listEl.querySelectorAll('[data-dino-id]').forEach((btn) => {
        const id = btn.getAttribute('data-dino-id');
        const d = getDinoSpec(id);
        const owned = Save.data.unlockedDinos.includes(id) || (d.unlockCost || 0) === 0;
        btn.classList.toggle('active', id === currentId);
        btn.textContent = `${id === Save.data.selectedDino ? '★ ' : (!owned ? '🔒 ' : '')}${d.name}`;
      });
    };

    const rebuildDinoList = () => {
      const listEl = container.querySelector('#sel-dino-list');
      if (!listEl) return;
      const savedListScroll = listEl.scrollTop;
      const filteredDinos = classFilter === 'all'
        ? allNonSecret
        : allNonSecret.filter((d) => d.dinoClass === classFilter);

      listEl.innerHTML = `
        ${filteredDinos.map((d) => {
          const owned = Save.data.unlockedDinos.includes(d.id) || (d.unlockCost || 0) === 0;
          return `
            <button class="tab-btn ${d.id === currentId ? 'active' : ''}" data-dino-id="${d.id}" title="${d.name}" style="min-height:40px; width:100%;">
              ${d.id === Save.data.selectedDino ? '★ ' : (!owned ? '🔒 ' : '')}${d.name}
            </button>
          `;
        }).join('')}
        ${!hasSecret ? `<button class="tab-btn" id="sel-secret-locked" style="opacity:0.75; min-height:40px; width:100%;">🔒 ??? (Secreto)</button>` : ''}
      `;
      listEl.scrollTop = savedListScroll;

      listEl.querySelectorAll('[data-dino-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          noticeMsg = '';
          currentId = btn.getAttribute('data-dino-id');
          equipDino(currentId, true);
          if (onPlayRoar) onPlayRoar(currentId);
          updateContent({ updatePreview: true, resetDetailsScroll: true });
        });
      });

      listEl.querySelector('#sel-secret-locked')?.addEventListener('click', () => {
        noticeMsg = '👻 Dino Dourado/Fantasma Secreto: alcance conquistas difíceis ou digite ↑↑↓↓←→←→BA no menu!';
        updateContent({ updatePreview: false });
      });
    };

    const updateContent = ({ updatePreview = false, rebuildList = false, resetDetailsScroll = false } = {}) => {
      // Preserva scroll vertical exato no modal e na grade sem rolar a tela inteira
      const savedCardScroll = modalCard ? modalCard.scrollTop : 0;
      const savedDetailsScroll = detailsCol ? detailsCol.scrollTop : 0;
      const spec = getDinoSpec(currentId);
      const cls = DINO_CLASSES[spec.dinoClass] || DINO_CLASSES.carnivore;
      const level = Save.data.dinoLevels[currentId] || 1;
      const upgradeCost = ProgressionManager.getSkillUpgradeCost(level);
      const isUnlocked = Save.data.unlockedDinos.includes(currentId) || (spec.unlockCost || 0) === 0;
      const isEquipped = isUnlocked && currentId === Save.data.selectedDino;
      const curUnlocked = DINO_CATALOG.filter((d) => Save.data.unlockedDinos.includes(d.id)).length;

      container.querySelector('#sel-heading').textContent = `🦖 Dinossauros (${curUnlocked}/${DINO_CATALOG.length})`;
      container.querySelector('#sel-eggs-val').textContent = Save.data.eggs;

      const hybridBanner = container.querySelector('#sel-hybrid-banner');
      if (hybridBanner) {
        hybridBanner.style.display = Save.data.hybrid?.enabled ? 'flex' : 'none';
      }

      const noticeEl = container.querySelector('#sel-notice');
      if (noticeMsg) {
        noticeEl.textContent = noticeMsg;
        noticeEl.style.display = '';
      } else {
        noticeEl.style.display = 'none';
      }

      container.querySelector('#sel-lock-hint').textContent =
        `Arraste para girar o modelo 3D • ${isUnlocked ? (isEquipped && !Save.data.hybrid?.enabled ? '★ Equipado Agora' : '✔ Desbloqueado') : `🔒 Custo: ${spec.unlockCost} 🥚`}`;

      const confirmBtn = container.querySelector('#sel-confirm');
      confirmBtn.className = `chunky-btn ${isUnlocked ? '' : 'orange'}`;
      confirmBtn.textContent = isUnlocked
        ? (isEquipped && !Save.data.hybrid?.enabled ? '✔ Equipado • Voltar' : '★ Equipar Agora')
        : `🔓 Liberar (${spec.unlockCost} 🥚)`;

      const activePreset = Save.data.customization.p1.presets[Save.data.customization.p1.activePreset];
      const skins = getDinoSkins(spec);
      const skinsRow = container.querySelector('#sel-skins-row');
      skinsRow.innerHTML = skins.map((sk) => {
        const isSkinActive = activePreset.skinId ? activePreset.skinId === sk.id : (!activePreset.useCustomColors && sk.key === 'original');
        return `<button class="tab-btn ${isSkinActive ? 'active' : ''}" data-skin-id="${sk.id}" title="${sk.badge}">${sk.badge} ${sk.name}</button>`;
      }).join('');
      skinsRow.querySelectorAll('[data-skin-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const skinId = btn.getAttribute('data-skin-id');
          const skin = skins.find((s) => s.id === skinId);
          if (!skin) return;
          const p1c = Save.data.customization.p1;
          const preset = p1c.presets[p1c.activePreset];
          preset.skinId = skin.id;
          preset.useCustomColors = skin.key !== 'original';
          if (skin.primary) preset.primary = skin.primary;
          if (skin.secondary) preset.secondary = skin.secondary;
          if (skin.eye) preset.eye = skin.eye;
          if (skin.spots) preset.spots = skin.spots;
          if (skin.spikes) preset.spikes = skin.spikes;
          if (skin.pattern) preset.pattern = skin.pattern;
          Save.save();
          noticeMsg = `${skin.badge} Skin "${skin.name}" aplicada em ${spec.name}!`;
          updateContent({ updatePreview: true });
        });
      });

      const activeMut = Save.data.equippedMutation || null;
      const habInfo = getEffectiveDinoHabitat(spec, { mutationId: activeMut });
      const swimCaps = getDinoSwimCapabilities(spec, { mutationId: activeMut });
      const hab = habInfo.primary || getDinoHabitat(spec);
      const habLabel = hab === 'aquatic'
        ? (habInfo.grantsLandWalk
          ? '🌊 Aquático + 🐾 Terra (Mutação)'
          : (swimCaps.canSubmerge ? '🌊 Aquático • Mergulho Profundo' : '🌊 Aquático • Superfície (Sem Afundar)'))
        : hab === 'amphibious'
          ? '🐊 Anfíbio • Terra ↔ Água (Superfície)'
          : hab === 'flying'
            ? '🪽 Aéreo (Voo/Céu)'
            : '🌿 Terrestre (Corre/Nada)';
      const swimTipLine = (hab === 'aquatic' || hab === 'amphibious')
        ? `<div style="font-size:0.78rem; color:#67e8f9; background:rgba(14,116,144,0.22); border:1px solid rgba(34,211,238,0.35); border-radius:8px; padding:5px 8px;">💧 ${swimCaps.swimModeDescription}</div>`
        : '';
      const eqVarId = getEquippedSkinVariant(currentId);
      const vDef = SKIN_VARIANTS.find((v) => v.id === eqVarId);
      const varPill = vDef && vDef.id !== 'normal'
        ? `<span class="hud-pill" style="border-color:${vDef.color}; color:${vDef.color};">${vDef.badge} ${vDef.name}</span>`
        : '';

      const detailsEl = container.querySelector('#sel-details');
      detailsEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <h3 style="font-size:1.35rem; color:#ffd447;">${spec.name}</h3>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <span class="hud-pill">${habLabel}</span>${varPill}
            <span class="hud-pill">${cls.name.pt} • Nv.${level}/10</span>
          </div>
        </div>
        <div style="font-size:0.84rem; color:#9ce6e0;">Passiva: ${cls.passive.pt}</div>
        ${swimTipLine}
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
      `;

      detailsEl.querySelector('#sel-upgrade')?.addEventListener('click', () => {
        const res = ProgressionManager.upgradeDinoSkill(currentId);
        noticeMsg = res.ok ? `✨ ${spec.name} evoluiu para Nível ${res.level}!` : res.reason;
        updateContent({ updatePreview: false });
      });

      if (updatePreview) {
        preview?.setDino(currentId, getCustomFor(currentId), { allowHybrid: false });
      }
      if (rebuildList) rebuildDinoList();
      else syncListSelection();

      if (detailsCol) detailsCol.scrollTop = resetDetailsScroll ? 0 : savedDetailsScroll;
      if (modalCard) modalCard.scrollTop = savedCardScroll;
    };

    container.querySelector('#sel-disable-hybrid')?.addEventListener('click', () => {
      if (Save.data.hybrid) Save.data.hybrid.enabled = false;
      equipDino(currentId, true);
      updateContent({ updatePreview: true });
    });

    container.querySelectorAll('[data-cfilter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        classFilter = btn.getAttribute('data-cfilter');
        container.querySelectorAll('[data-cfilter]').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-cfilter') === classFilter);
        });
        updateContent({ rebuildList: true });
      });
    });

    container.querySelector('#sel-roar')?.addEventListener('click', () => {
      if (onPlayRoar) onPlayRoar(currentId);
    });

    container.querySelector('#sel-confirm').addEventListener('click', () => {
      const spec = getDinoSpec(currentId);
      const isUnlocked = Save.data.unlockedDinos.includes(currentId) || (spec.unlockCost || 0) === 0;
      if (!isUnlocked) {
        const cost = spec.unlockCost || 0;
        if ((Save.data.eggs || 0) < cost) {
          noticeMsg = `Você precisa de ${cost} 🥚 para desbloquear ${spec.name} (ou clique Testar)!`;
          updateContent();
          return;
        }
        Save.addEggs(-cost);
        if (!Save.data.unlockedDinos.includes(currentId)) Save.data.unlockedDinos.push(currentId);
        noticeMsg = `🎉 ${spec.name} desbloqueado e equipado!`;
      }
      equipDino(currentId, false);
      preview?.destroy();
      if (onSelect) onSelect(currentId);
      if (onClose) onClose();
    });

    container.querySelector('#sel-test').addEventListener('click', () => {
      const spec = getDinoSpec(currentId);
      const isUnlocked = Save.data.unlockedDinos.includes(currentId) || (spec.unlockCost || 0) === 0;
      if (isUnlocked) {
        equipDino(currentId, false);
      }
      preview?.destroy();
      if (onTestTrack) onTestTrack(currentId);
    });

    container.querySelector('#sel-close').addEventListener('click', () => {
      preview?.destroy();
      if (onClose) onClose();
    });

    attachModalHelp(container, 'Gire o dino em 3D, compare passivas e atributos, evolua a habilidade e clique em "Testar" antes de comprar.');
    updateContent({ rebuildList: true });
    return () => preview?.destroy();
  }
}
