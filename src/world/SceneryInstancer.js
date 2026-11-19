// Renderização de cenário decorativo em 60 FPS usando InstancedMesh (sem alocações por frame).
import * as THREE from 'three';

const DUMMY = new THREE.Object3D();

export class SceneryInstancer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.items = [];
    this._lowDetail = false;
    this._submergedMode = false;
    this._fullWaterMode = false;
    this._floorY = 0;
    this._createMeshes();
    this._populateInitial();
  }

  _createMeshes() {
    const box = new THREE.BoxGeometry(1, 1, 1);

    // 1. Pedrinhas na borda da pista
    this.pebbleMat = new THREE.MeshStandardMaterial({ color: '#c48f4d', roughness: 0.9 });
    this.pebbleMesh = new THREE.InstancedMesh(box, this.pebbleMat, 140);
    this.pebbleMesh.receiveShadow = true;
    this.group.add(this.pebbleMesh);

    // 2. Pedras médias fora da pista
    this.rockMat = new THREE.MeshStandardMaterial({ color: '#9c6644', roughness: 0.88 });
    this.rockMesh = new THREE.InstancedMesh(box, this.rockMat, 60);
    this.group.add(this.rockMesh);

    // 3. Cactos decorativos laterais + flores rosa
    this.cactusMat = new THREE.MeshStandardMaterial({ color: '#3b8c3a', roughness: 0.75 });
    this.cactusMesh = new THREE.InstancedMesh(box, this.cactusMat, 56);
    this.group.add(this.cactusMesh);

    this.flowerMat = new THREE.MeshStandardMaterial({ color: '#ff6ca8', roughness: 0.55, emissive: '#5a1030', emissiveIntensity: 0.2 });
    this.flowerMesh = new THREE.InstancedMesh(box, this.flowerMat, 28);
    this.group.add(this.flowerMesh);

    // 4. Ossos de fóssil e árvores secas
    this.boneMat = new THREE.MeshStandardMaterial({ color: '#efe5d0', roughness: 0.7 });
    this.boneMesh = new THREE.InstancedMesh(box, this.boneMat, 28);
    this.group.add(this.boneMesh);

    this.woodMat = new THREE.MeshStandardMaterial({ color: '#6b442a', roughness: 0.9 });
    this.treeMesh = new THREE.InstancedMesh(box, this.woodMat, 30);
    this.group.add(this.treeMesh);

    // 5. Mesas e mesetas laranja em parallax (camadas médias/distantes)
    this.mesaMat = new THREE.MeshStandardMaterial({ color: '#c85a28', roughness: 0.92 });
    this.mesaMesh = new THREE.InstancedMesh(box, this.mesaMat, 36);
    this.group.add(this.mesaMesh);

    // 6. Nuvens cúbicas no céu
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: '#ffd2a6',
      roughness: 0.8,
      emissive: '#ff8a47',
      emissiveIntensity: 0.18
    });
    this.cloudMesh = new THREE.InstancedMesh(box, this.cloudMat, 40);
    this.group.add(this.cloudMesh);

    // 7. Fauna decorativa viva (pequenos dinos e insetos que reagem à passagem)
    this.faunaMat = new THREE.MeshStandardMaterial({ color: '#9ef01a', roughness: 0.55 });
    this.faunaMesh = new THREE.InstancedMesh(box, this.faunaMat, 22);
    this.group.add(this.faunaMesh);

    this.bugMat = new THREE.MeshBasicMaterial({ color: '#ffe66d' });
    this.bugMesh = new THREE.InstancedMesh(box, this.bugMat, 26);
    this.group.add(this.bugMesh);
  }

  _populateInitial() {
    this.pebbles = [];
    for (let i = 0; i < 140; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (4.7 + (i % 5) * 0.28);
      const z = -150 + (i / 140) * 170;
      const s = 0.22 + ((i * 7) % 10) * 0.025;
      this.pebbles.push({ x, y: s * 0.45, z, sx: s * 1.3, sy: s * 0.75, sz: s * 1.1, ry: (i * 0.7) % Math.PI });
    }

    this.rocks = [];
    for (let i = 0; i < 60; i++) {
      const left = i % 3 !== 0;
      const x = left ? -(6.5 + (i % 7) * 2.8) : (17.5 + (i % 5) * 3.2);
      const z = -150 + (i / 60) * 170;
      const s = 0.7 + ((i * 11) % 10) * 0.14;
      this.rocks.push({ x, y: s * 0.4, z, sx: s * 1.3, sy: s * 0.85, sz: s, ry: (i * 1.1) % Math.PI });
    }

    this.cacti = [];
    for (let i = 0; i < 56; i++) {
      const left = i % 3 !== 0;
      const x = left ? -(6.2 + (i % 8) * 2.5) : (17.0 + (i % 6) * 2.6);
      const z = -155 + (i / 56) * 175;
      const h = 1.4 + ((i * 5) % 10) * 0.18;
      this.cacti.push({ x, z, h, hasFlower: i % 2 === 0 });
    }

    this.bones = [];
    for (let i = 0; i < 28; i++) {
      const x = -(6.0 + (i % 6) * 2.3);
      const z = -150 + (i / 28) * 170;
      this.bones.push({ x, z, ry: (i * 0.9) % Math.PI });
    }

    this.trees = [];
    for (let i = 0; i < 30; i++) {
      const left = i % 2 === 0;
      const x = left ? -(8.5 + (i % 5) * 3.5) : (18.5 + (i % 4) * 3.5);
      const z = -155 + (i / 30) * 175;
      const h = 2.4 + (i % 4) * 0.5;
      this.trees.push({ x, z, h });
    }

    this.mesas = [];
    for (let i = 0; i < 36; i++) {
      const layer = i % 3; // 3 camadas de parallax
      const side = i % 2 === 0 ? -1 : 1;
      const dist = 24 + layer * 16 + (i % 4) * 3;
      const x = side < 0 ? -dist : dist + 8;
      const z = -165 + (i / 36) * 190;
      const w = 7 + layer * 4;
      const h = 4 + layer * 3.8 + (i % 3) * 2;
      const d = 8 + layer * 4;
      this.mesas.push({ x, y: h * 0.45, z, w, h, d, parallax: 0.65 - layer * 0.18 });
    }

    this.clouds = [];
    for (let i = 0; i < 40; i++) {
      const x = -48 + (i % 10) * 11;
      const y = 17 + (i % 4) * 3.2;
      const z = -160 + (i / 40) * 185;
      const w = 4.2 + (i % 3) * 2.5;
      const h = 1.1 + (i % 2) * 0.6;
      const d = 2.6 + (i % 3) * 1.1;
      this.clouds.push({ x, y, z, w, h, d, parallax: 0.22 });
    }

    this.fauna = [];
    for (let i = 0; i < 22; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.fauna.push({
        baseX: side * (5.2 + (i % 4) * 0.8),
        x: 0,
        z: -150 + (i / 22) * 170,
        phase: i * 1.3
      });
    }

    this.bugs = [];
    for (let i = 0; i < 26; i++) {
      this.bugs.push({
        x: (i % 2 === 0 ? -1 : 1) * (4.5 + (i % 5) * 1.2),
        y: 0.7 + (i % 3) * 0.45,
        z: -140 + (i / 26) * 160,
        phase: i * 0.9
      });
    }

    this.update(0, 0);
  }

  setLowDetail(enabled) {
    this._lowDetail = !!enabled;
    this._syncLayerVisibility();
  }

  setWaterState({ submerged = false, fullWater = false, floorY = 0 } = {}) {
    this._submergedMode = !!submerged;
    this._fullWaterMode = !!fullWater;
    this._floorY = this._submergedMode ? (Number(floorY) || 0) : 0;
    this._syncLayerVisibility();
  }

  _syncLayerVisibility() {
    const low = this._lowDetail;
    const sub = this._submergedMode;
    const hideLandFlora = sub || this._fullWaterMode;
    if (this.bugMesh) this.bugMesh.visible = !low && !hideLandFlora;
    if (this.faunaMesh) this.faunaMesh.visible = !low && !hideLandFlora;
    if (this.cactusMesh) this.cactusMesh.visible = !hideLandFlora;
    if (this.flowerMesh) this.flowerMesh.visible = !low && !hideLandFlora;
    if (this.treeMesh) this.treeMesh.visible = !hideLandFlora;
    if (this.boneMesh) this.boneMesh.visible = !low && (!this._fullWaterMode || sub);
    if (this.mesaMesh) this.mesaMesh.visible = !sub;
    if (this.cloudMesh) this.cloudMesh.visible = !sub;
  }

  setBiomePalette(palette) {
    this.pebbleMat.color.set(palette.pebble || '#c48f4d');
    this.rockMat.color.set(palette.rock || '#9c6644');
    this.cactusMat.color.set(palette.flora || '#3b8c3a');
    this.flowerMat.color.set(palette.flower || '#ff6ca8');
    this.mesaMat.color.set(palette.mesa || '#c85a28');
    this.cloudMat.color.set(palette.cloud || '#ffd2a6');
    this.woodMat.color.set(palette.wood || '#6b442a');

    // Suporte emissivo para biomas bioluminescentes, núcleo magmático, lunar e orbital (zero alocações extras)
    const emInt = palette.emissiveIntensity ?? 0;
    if (palette.emissiveFlora) {
      this.cactusMat.emissive.set(palette.emissiveFlora);
      this.cactusMat.emissiveIntensity = emInt;
    } else {
      this.cactusMat.emissive.setHex(0x000000);
      this.cactusMat.emissiveIntensity = 0;
    }
    if (palette.emissiveFlower) {
      this.flowerMat.emissive.set(palette.emissiveFlower);
      this.flowerMat.emissiveIntensity = Math.max(0.2, emInt);
      this.bugMat.color.set(palette.emissiveFlower);
    } else {
      this.flowerMat.emissive.set('#5a1030');
      this.flowerMat.emissiveIntensity = 0.2;
      this.bugMat.color.set('#ffe66d');
    }
  }

  update(dt, speed) {
    const move = speed * dt;
    const wrapMin = -160;
    const wrapMax = 20;
    const wrapSpan = wrapMax - wrapMin;

    const floorY = this._floorY || 0;

    // Pedrinhas
    for (let i = 0; i < this.pebbles.length; i++) {
      const p = this.pebbles[i];
      p.z += move;
      if (p.z > wrapMax) p.z -= wrapSpan;
      DUMMY.position.set(p.x, p.y + floorY, p.z);
      DUMMY.rotation.set(0, p.ry, 0);
      DUMMY.scale.set(p.sx, p.sy, p.sz);
      DUMMY.updateMatrix();
      this.pebbleMesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.pebbleMesh.instanceMatrix.needsUpdate = true;

    // Pedras
    for (let i = 0; i < this.rocks.length; i++) {
      const r = this.rocks[i];
      r.z += move;
      if (r.z > wrapMax) r.z -= wrapSpan;
      DUMMY.position.set(r.x, r.y + floorY, r.z);
      DUMMY.rotation.set(0, r.ry, 0);
      DUMMY.scale.set(r.sx, r.sy, r.sz);
      DUMMY.updateMatrix();
      this.rockMesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.rockMesh.instanceMatrix.needsUpdate = true;

    // Cactos decorativos + flores rosa
    let flowerIdx = 0;
    for (let i = 0; i < this.cacti.length; i++) {
      const c = this.cacti[i];
      c.z += move;
      if (c.z > wrapMax) c.z -= wrapSpan;
      DUMMY.position.set(c.x, c.h * 0.5, c.z);
      DUMMY.rotation.set(0, 0, 0);
      DUMMY.scale.set(0.55, c.h, 0.55);
      DUMMY.updateMatrix();
      this.cactusMesh.setMatrixAt(i, DUMMY.matrix);

      if (c.hasFlower && flowerIdx < 28) {
        DUMMY.position.set(c.x, c.h + 0.14, c.z);
        DUMMY.scale.set(0.32, 0.24, 0.32);
        DUMMY.updateMatrix();
        this.flowerMesh.setMatrixAt(flowerIdx++, DUMMY.matrix);
      }
    }
    this.cactusMesh.instanceMatrix.needsUpdate = true;
    this.flowerMesh.instanceMatrix.needsUpdate = true;

    // Ossos
    for (let i = 0; i < this.bones.length; i++) {
      const b = this.bones[i];
      b.z += move;
      if (b.z > wrapMax) b.z -= wrapSpan;
      DUMMY.position.set(b.x, 0.18 + floorY, b.z);
      DUMMY.rotation.set(0.15, b.ry, 0.25);
      DUMMY.scale.set(0.95, 0.18, 0.22);
      DUMMY.updateMatrix();
      this.boneMesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.boneMesh.instanceMatrix.needsUpdate = true;

    // Árvores secas
    for (let i = 0; i < this.trees.length; i++) {
      const t = this.trees[i];
      t.z += move;
      if (t.z > wrapMax) t.z -= wrapSpan;
      DUMMY.position.set(t.x, t.h * 0.5, t.z);
      DUMMY.rotation.set(0, 0, 0.08 * (i % 2 === 0 ? 1 : -1));
      DUMMY.scale.set(0.36, t.h, 0.36);
      DUMMY.updateMatrix();
      this.treeMesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.treeMesh.instanceMatrix.needsUpdate = true;

    // Mesas em 3 camadas de parallax
    for (let i = 0; i < this.mesas.length; i++) {
      const m = this.mesas[i];
      m.z += move * m.parallax;
      if (m.z > 30) m.z -= 195;
      DUMMY.position.set(m.x, m.y, m.z);
      DUMMY.rotation.set(0, 0, 0);
      DUMMY.scale.set(m.w, m.h, m.d);
      DUMMY.updateMatrix();
      this.mesaMesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.mesaMesh.instanceMatrix.needsUpdate = true;

    // Nuvens cúbicas
    for (let i = 0; i < this.clouds.length; i++) {
      const cl = this.clouds[i];
      cl.z += move * cl.parallax;
      if (cl.z > 30) cl.z -= 190;
      DUMMY.position.set(cl.x, cl.y, cl.z);
      DUMMY.rotation.set(0, 0, 0);
      DUMMY.scale.set(cl.w, cl.h, cl.d);
      DUMMY.updateMatrix();
      this.cloudMesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;

    // Fauna decorativa: foge lateralmente ao se aproximar do jogador em z = 0
    for (let i = 0; i < this.fauna.length; i++) {
      const f = this.fauna[i];
      f.z += move;
      f.phase += dt * 7;
      if (f.z > 20) f.z -= 170;
      const flee = f.z > -12 && f.z < 6 ? Math.sign(f.baseX) * (12 - Math.abs(f.z)) * 0.22 : 0;
      const hop = Math.abs(Math.sin(f.phase)) * 0.22;
      DUMMY.position.set(f.baseX + flee, 0.22 + hop, f.z);
      DUMMY.rotation.set(0, f.baseX > 0 ? -0.4 : 0.4, 0);
      DUMMY.scale.set(0.36, 0.34, 0.56);
      DUMMY.updateMatrix();
      this.faunaMesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.faunaMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.bugs.length; i++) {
      const b = this.bugs[i];
      b.z += move * 0.92;
      b.phase += dt * 9;
      if (b.z > 20) b.z -= 160;
      const scatter = b.z > -8 && b.z < 5 ? Math.sin(b.phase) * 1.4 : 0;
      DUMMY.position.set(b.x + scatter, b.y + Math.sin(b.phase * 1.5) * 0.35, b.z);
      DUMMY.rotation.set(0, 0, 0);
      DUMMY.scale.set(0.14, 0.14, 0.14);
      DUMMY.updateMatrix();
      this.bugMesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.bugMesh.instanceMatrix.needsUpdate = true;
  }
}
