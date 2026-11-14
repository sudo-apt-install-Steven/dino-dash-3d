// Modal 3D de Gacha / Caixa Fóssil adaptado do modelo Claude com miniaturas 3D reais das recompensas.
import * as THREE from 'three';
import { Save } from '../systems/Save.js';
import { GACHA_EGG_ROLL_COST, GACHA_RARITIES, GachaSystem } from '../systems/GachaSystem.js';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { applySkinVariantToColors } from '../dinos/DinoCustomization.js';
import { buildClaudeAccessoryGroup } from '../models/ClaudeVoxelModels.js';

function buildDnaCapsuleMini(hexColor = '#5eead4') {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color: hexColor,
    emissive: hexColor,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.35
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#e0f2fe',
    emissive: hexColor,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.42,
    roughness: 0.1
  });
  const capMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.3 });

  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.95, 16), glassMat);
  g.add(cyl);
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.16, 16), capMat);
  topCap.position.y = 0.52;
  const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.16, 16), capMat);
  botCap.position.y = -0.52;
  g.add(topCap, botCap);

  const orbGeo = new THREE.BoxGeometry(0.11, 0.08, 0.11);
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const ang = t * Math.PI * 2;
    const y = -0.34 + t * 0.68;
    const n1 = new THREE.Mesh(orbGeo, baseMat);
    n1.position.set(Math.cos(ang) * 0.16, y, Math.sin(ang) * 0.16);
    const n2 = new THREE.Mesh(orbGeo, baseMat);
    n2.position.set(-Math.cos(ang) * 0.16, y, -Math.sin(ang) * 0.16);
    g.add(n1, n2);
  }
  return g;
}

export class GachaModal {
  constructor(root, onCloseCb = null) {
    this.root = root;
    this.onCloseCb = onCloseCb;
    this.el = null;
    this._raf = 0;
    this._renderer = null;
    this._onPointerUp = null;
    this._onPointerMove = null;
  }

  open() {
    this.close(true);
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'gacha-modal';
    wrap.innerHTML = `
      <div class="modal-card gacha-card" style="max-width:680px;width:94vw;background:linear-gradient(160deg,rgba(9,9,11,0.96),rgba(24,24,27,0.95));border:1px solid rgba(161,161,170,0.22);box-shadow:0 24px 64px rgba(0,0,0,0.75);">
        <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <h2 style="margin:0;color:#fde047;display:flex;align-items:center;gap:8px;">🥚 Gacha Fóssil 3D</h2>
            <p class="small-note" style="margin:4px 0 0;color:#a1a1aa;">Choque ovos antigos para liberar Dinos, Mutações de DNA, Cores Únicas, Shiny, Mecânico e Segredos!</p>
          </div>
          <button id="gacha-close" class="btn-ghost" type="button">✕ Fechar</button>
        </div>

        <div class="gacha-meta-row" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center;justify-content:space-between;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span id="gacha-crates-pill" class="badge" style="background:rgba(245,158,11,0.18);border:1px solid rgba(245,158,11,0.45);color:#fde047;">📦 Caixas Fósseis: ${GachaSystem.getCrateCount()}</span>
            <span id="gacha-eggs-pill" class="badge" style="background:rgba(16,185,129,0.16);border:1px solid rgba(16,185,129,0.4);color:#6ee7b7;">🥚 ${Math.floor(Save.data.eggs || 0)}</span>
          </div>
          <span id="gacha-pity-pill" class="small-note" style="color:#c4b5fd;">✨ Garantia Épica+: ${(Save.data.gachaPity || 0)}/9 • Shiny+: ${(Save.data.gachaPity || 0)}/15</span>
        </div>

        <div style="position:relative;margin-top:10px;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 45%, rgba(99,102,241,0.16), rgba(9,9,11,0.88));border:1px solid rgba(255,255,255,0.08);">
          <canvas id="gacha-canvas" style="width:100%;height:270px;display:block;touch-action:pan-y;cursor:grab;"></canvas>
          <div id="gacha-drop-badge" style="position:absolute;top:10px;left:12px;font-size:11px;color:#d4d4d8;background:rgba(9,9,11,0.7);padding:4px 9px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);">Arraste para girar 3D</div>
        </div>

        <div id="gacha-result-box" style="margin-top:10px;min-height:52px;padding:10px 12px;border-radius:12px;background:rgba(24,24,27,0.85);border:1px solid rgba(63,63,70,0.8);display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div>
            <div id="gacha-res-title" style="font-weight:700;color:#fafafa;font-size:14px;">Clique abaixo para chocar seu Ovo Fóssil!</div>
            <div id="gacha-res-desc" class="small-note" style="color:#a1a1aa;margin-top:2px;">Pontuações altas em dificuldades maiores (Difícil/Supremo) concedem mais Caixas grátis por corrida.</div>
          </div>
          <span id="gacha-res-tier" class="badge" style="display:none;"></span>
        </div>

        <div class="btn-row" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;">
          <button id="gacha-open-crate" class="btn-primary" type="button" style="flex:1;min-width:190px;">📦 Chocar Caixa Grátis (<span id="gacha-crate-btn-num">${GachaSystem.getCrateCount()}</span>)</button>
          <button id="gacha-open-eggs" class="btn-secondary" type="button" style="flex:1;min-width:190px;">🥚 Chocar por ${GACHA_EGG_ROLL_COST} Ovos</button>
        </div>

        <div class="gacha-odds" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;justify-content:center;">
          ${GACHA_RARITIES.map((r) => `<span style="font-size:11px;padding:3px 8px;border-radius:999px;background:${r.bg};color:${r.fg};border:1px solid ${r.hex}55;">${r.name}: ${r.weight}%</span>`).join('')}
        </div>
      </div>
    `;
    this.root.appendChild(wrap);
    this.el = wrap;

    this._init3D(wrap);

    wrap.querySelector('#gacha-close')?.addEventListener('click', () => this.close());
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) this.close();
    });
  }

  _init3D(wrap) {
    const canvas = wrap.querySelector('#gacha-canvas');
    if (!canvas) return;
    const W = canvas.clientWidth || 560;
    const H = 270;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this._renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 50);
    camera.position.set(0, 1.35, 5.8);
    camera.lookAt(0, 0.65, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.15));
    const dl = new THREE.DirectionalLight(0xffffff, 0.95);
    dl.position.set(3, 5, 4);
    scene.add(dl);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    // Modelo Voxel fiel ao gacha_ovo_fossil_3d.html
    const U = 0.1;
    const G = new THREE.BoxGeometry(1, 1, 1);
    const mc = {};
    const mat = (c, o = {}) => {
      const k = `${c}|${o.e || 0}`;
      if (!mc[k]) {
        mc[k] = new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.78,
          emissive: o.e ? c : 0x000000,
          emissiveIntensity: o.e || 0
        });
      }
      return mc[k];
    };
    const sh = (c, k) => {
      const r = Math.min(255, Math.round(((c >> 16) & 255) * k));
      const g = Math.min(255, Math.round(((c >> 8) & 255) * k));
      const b = Math.min(255, Math.round((c & 255) * k));
      return (r << 16) | (g << 8) | b;
    };
    const hs = (x, y, z) => {
      let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
      h = (h ^ (h >>> 13)) >>> 0;
      return h % 7;
    };
    const BM = (g, x, y, z, w, h, d, m) => {
      const e = new THREE.Mesh(G, m);
      e.scale.set(w * U, h * U, d * U);
      e.position.set(x * U, (y + h / 2) * U, z * U);
      g.add(e);
    };
    const VC = (g, x, y, z, c, o) => BM(g, x, y, z, 1, 1, 1, mat(sh(c, 1 + (hs(x, y, z) - 3) * 0.03), o));
    const er = (y) => {
      const t = (y + 0.5) / 17;
      return 6.5 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.45) / 0.55, 2)));
    };

    const crackMat = new THREE.MeshStandardMaterial({
      color: 0x4a3f2b,
      roughness: 0.75,
      emissive: 0x000000,
      emissiveIntensity: 0
    });
    const holder = new THREE.Group();
    const egg = new THREE.Group();
    const topHalf = new THREE.Group();
    const botHalf = new THREE.Group();
    const nest = new THREE.Group();
    egg.add(topHalf, botHalf);
    holder.add(nest, egg);

    const crack = {};
    for (let y = 3; y <= 15; y++) {
      const off = Math.round(2 * Math.sin(y * 0.9));
      const q = er(y) * er(y) - off * off;
      if (q <= 0) continue;
      const zm = Math.floor(Math.sqrt(q));
      [[off, zm], [off, -zm], [zm, off], [-zm, off]].forEach((a) => {
        crack[`${a[0]},${y},${a[1]}`] = 1;
      });
    }
    for (let y = 0; y <= 16; y++) {
      const r = er(y);
      for (let x = -7; x <= 7; x++) {
        for (let z = -7; z <= 7; z++) {
          if (x * x + z * z > r * r) continue;
          const g = y >= 9 ? topHalf : botHalf;
          if (crack[`${x},${y},${z}`]) {
            BM(g, x - 0.5, y + 2, z - 0.5, 1, 1, 1, crackMat);
            continue;
          }
          let c = y < 3 ? 0x6a5c42 : 0x8c7b5a;
          const h = hs(x, y, z);
          if (h === 0) c = 0x5e5039;
          else if (h === 1) c = 0xb8aa84;
          VC(g, x, y + 2, z, c);
        }
      }
    }
    for (let x = -10; x <= 10; x++) {
      for (let z = -10; z <= 10; z++) {
        const d = Math.hypot(x, z);
        if (d > 10) continue;
        if (d < 6.5) {
          VC(nest, x, 0, z, 0x3a2a18);
          continue;
        }
        const h = hs(x, 0, z);
        VC(nest, x, 0, z, h < 3 ? 0x7a4b24 : 0x5c3517);
        if (h > 1) VC(nest, x, 1, z, h % 2 ? 0x7a4b24 : 0x5c3517);
      }
    }
    [[-9, 2, 2], [8, 2, -3], [2, 2, 9], [-4, 2, -9], [7, 2, 6]].forEach((a) => {
      for (let i = 0; i < 3; i++) VC(nest, a[0], a[1] + i, a[2], 0xf1efe8);
      VC(nest, a[0] + 1, a[1] + 2, a[2], 0xf1efe8);
    });

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.75, 40),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    holder.add(ring);

    const rewardPivot = new THREE.Group();
    rewardPivot.visible = false;
    holder.add(rewardPivot);

    holder.position.y = -0.82;
    holder.rotation.x = 0.22;
    scene.add(holder);

    let state = 'idle';
    let ts = 0;
    let last = performance.now();
    let curReward = null;
    let parts = [];

    const clearRewardPivot = () => {
      while (rewardPivot.children.length > 0) {
        rewardPivot.remove(rewardPivot.children[0]);
      }
      rewardPivot.visible = false;
    };

    const buildRealMiniReward = (reward) => {
      clearRewardPivot();
      const pv = reward?.preview || {};
      let obj = null;
      if (pv.modelKind === 'dino') {
        const spec = getDinoSpec(pv.dinoId || 'trex');
        const colors = applySkinVariantToColors(spec.colors, pv.skinVariant || 'normal');
        const built = DinoFactory.build(spec.id, colors, { allowHybrid: false });
        obj = built.root;
        obj.scale.setScalar(0.54);
        obj.position.y = -0.22;
      } else if (pv.modelKind === 'accessory') {
        obj = buildClaudeAccessoryGroup(pv.accessoryId || 'crown');
        obj.scale.setScalar(1.35);
      } else {
        obj = buildDnaCapsuleMini(pv.colorHex || reward?.tier?.hex || '#c084fc');
        obj.scale.setScalar(0.9);
      }
      rewardPivot.add(obj);
      rewardPivot.position.set(0, 0.85, 0);
      rewardPivot.scale.setScalar(0.1);
      rewardPivot.rotation.set(0, -0.35, 0);
      rewardPivot.visible = true;
    };

    const resetEgg = () => {
      topHalf.position.set(0, 0, 0);
      topHalf.rotation.set(0, 0, 0);
      topHalf.visible = true;
      egg.rotation.set(0, 0, 0);
      crackMat.color.set(0x4a3f2b);
      crackMat.emissive.set(0x000000);
      crackMat.emissiveIntensity = 0;
      clearRewardPivot();
      ring.material.opacity = 0;
      parts.forEach((p) => holder.remove(p.m));
      parts = [];
    };

    const triggerBurst = () => {
      const tier = curReward.tier;
      ring.material.color.set(tier.color);
      ring.material.opacity = 0.92;
      buildRealMiniReward(curReward);
      for (let i = 0; i < tier.np; i++) {
        const m = new THREE.Mesh(G, new THREE.MeshBasicMaterial({ color: i % 3 ? tier.color : 0xffffff }));
        const s = 0.05 + Math.random() * 0.07;
        m.scale.set(s, s, s);
        m.position.set(0, 1, 0);
        holder.add(m);
        const a = Math.random() * Math.PI * 2;
        const sp = 0.8 + Math.random() * 1.9;
        parts.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, 2 + Math.random() * 2.5, Math.sin(a) * sp), l: 1.4 });
      }
    };

    const refreshCounters = () => {
      const c = GachaSystem.getCrateCount();
      const cratesEl = wrap.querySelector('#gacha-crates-pill');
      const btnNum = wrap.querySelector('#gacha-crate-btn-num');
      const eggsEl = wrap.querySelector('#gacha-eggs-pill');
      const pityEl = wrap.querySelector('#gacha-pity-pill');
      const crateBtn = wrap.querySelector('#gacha-open-crate');
      const eggsBtn = wrap.querySelector('#gacha-open-eggs');
      if (cratesEl) cratesEl.textContent = `📦 Caixas Fósseis: ${c}`;
      if (btnNum) btnNum.textContent = `${c}`;
      if (eggsEl) eggsEl.textContent = `🥚 ${Math.floor(Save.data.eggs || 0)}`;
      if (pityEl) pityEl.textContent = `✨ Garantia Épica+: ${Save.data.gachaPity || 0}/9 • Shiny+: ${Save.data.gachaPity || 0}/15`;
      if (crateBtn) crateBtn.disabled = c <= 0 || state === 'shake' || state === 'burst';
      if (eggsBtn) eggsBtn.disabled = (Save.data.eggs || 0) < GACHA_EGG_ROLL_COST || state === 'shake' || state === 'burst';
    };

    const runPull = (useEggs) => {
      if (state === 'shake' || state === 'burst') return;
      const res = GachaSystem.openCrate({ useEggs });
      if (!res.ok) {
        const desc = wrap.querySelector('#gacha-res-desc');
        if (desc) desc.textContent = res.error;
        return;
      }
      resetEgg();
      curReward = res.reward;
      state = 'shake';
      ts = performance.now();
      const titleEl = wrap.querySelector('#gacha-res-title');
      const descEl = wrap.querySelector('#gacha-res-desc');
      const badgeEl = wrap.querySelector('#gacha-res-tier');
      if (titleEl) titleEl.textContent = 'Chocando Ovo Fóssil...';
      if (descEl) descEl.textContent = 'As rachaduras estão brilhando!';
      if (badgeEl) badgeEl.style.display = 'none';
      refreshCounters();
    };

    wrap.querySelector('#gacha-open-crate')?.addEventListener('click', () => runPull(false));
    wrap.querySelector('#gacha-open-eggs')?.addEventListener('click', () => runPull(true));

    let drag = false;
    let lx = 0;
    let autoSpin = true;
    canvas.addEventListener('pointerdown', (e) => {
      drag = true;
      autoSpin = false;
      lx = e.clientX;
    });
    this._onPointerUp = () => { drag = false; };
    this._onPointerMove = (e) => {
      if (!drag) return;
      holder.rotation.y += (e.clientX - lx) * 0.012;
      lx = e.clientX;
    };
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointermove', this._onPointerMove);

    const loop = (t) => {
      if (!this.el) return;
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      const now = performance.now();

      if (state === 'idle' || state === 'done') {
        egg.position.y = Math.sin(t * 0.0022) * 0.025;
      }
      if (state === 'shake' && curReward) {
        const d = (now - ts) / 1000;
        const k = Math.min(d / 1.25, 1);
        egg.rotation.z = Math.sin(d * 40) * 0.08 * k;
        egg.rotation.x = Math.cos(d * 33) * 0.05 * k;
        crackMat.color.set(curReward.tier.color);
        crackMat.emissive.set(curReward.tier.color);
        crackMat.emissiveIntensity = k * 1.4;
        if (d >= 1.25) {
          state = 'burst';
          ts = now;
          egg.rotation.set(0, 0, 0);
          triggerBurst();
        }
      }
      if (state === 'burst' && curReward) {
        const d = (now - ts) / 1000;
        topHalf.position.y = d * 1.9;
        topHalf.rotation.y += 0.12;
        if (topHalf.position.y > 4) topHalf.visible = false;
        rewardPivot.position.y = 0.85 + Math.min(d, 0.9) * 1.3;
        rewardPivot.scale.setScalar(Math.min(1, d * 2.6));
        ring.material.opacity = Math.max(0, 0.92 - d * 0.72);
        if (d > 0.9) {
          state = 'done';
          const tier = curReward.tier;
          const titleEl = wrap.querySelector('#gacha-res-title');
          const descEl = wrap.querySelector('#gacha-res-desc');
          const badgeEl = wrap.querySelector('#gacha-res-tier');
          if (titleEl) titleEl.textContent = `${curReward.isNew ? '🆕 ' : ''}${curReward.title}`;
          if (descEl) descEl.textContent = curReward.desc;
          if (badgeEl) {
            badgeEl.style.display = 'inline-flex';
            badgeEl.textContent = tier.name;
            badgeEl.style.background = tier.bg;
            badgeEl.style.color = tier.fg;
            badgeEl.style.border = `1px solid ${tier.hex}88`;
          }
          refreshCounters();
        }
      }
      if (rewardPivot.visible) rewardPivot.rotation.y += 0.032;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.v.y -= 6 * dt;
        p.m.position.addScaledVector(p.v, dt);
        p.l -= dt;
        const s = Math.max(0, p.l / 1.4);
        p.m.scale.setScalar(Math.max(0.001, s * 0.1));
        if (p.l <= 0) {
          holder.remove(p.m);
          parts.splice(i, 1);
        }
      }
      if (!drag && autoSpin) holder.rotation.y += 0.006;
      renderer.render(scene, camera);
    };
    refreshCounters();
    this._raf = requestAnimationFrame(loop);
  }

  close(silent = false) {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    if (this._onPointerUp) window.removeEventListener('pointerup', this._onPointerUp);
    if (this._onPointerMove) window.removeEventListener('pointermove', this._onPointerMove);
    this._onPointerUp = null;
    this._onPointerMove = null;
    if (this._renderer) {
      try {
        this._renderer.dispose();
      } catch {}
      this._renderer = null;
    }
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    if (!silent && this.onCloseCb) this.onCloseCb();
  }
}
