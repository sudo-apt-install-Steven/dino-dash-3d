// Cenário infinito: pista de areia dourada, rio azul lateral animado,
// iluminação de pôr do sol, sol grande, névoa atmosférica e parallax.
import * as THREE from 'three';
import { SceneryInstancer } from './SceneryInstancer.js';

export const LANE_X = [-2.4, 0, 2.4];
export const TRACK_WIDTH = 9.2;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.scrollOffset = 0;
    this.time = 0;
    this.tideOffset = 0;
    this.riverY = -0.05;

    this._setupLightingAndSky();
    this._setupTrackAndRiver();
    this.scenery = new SceneryInstancer(scene);
  }

  _setupLightingAndSky() {
    this.skyColor = new THREE.Color('#f78c4f');
    this.fogColor = new THREE.Color('#f28549');
    this.scene.background = this.skyColor.clone();
    this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), 0.011);

    this.hemiLight = new THREE.HemisphereLight('#ffe0b5', '#8c4420', 0.95);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#ffd18c', 1.85);
    this.sunLight.position.set(-16, 22, -24);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 75;
    this.sunLight.shadow.camera.left = -14;
    this.sunLight.shadow.camera.right = 14;
    this.sunLight.shadow.camera.top = 14;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    // Sol voxel gigante no horizonte + brilho simulado
    this.sunGroup = new THREE.Group();
    this.sunGroup.position.set(-14, 19, -138);
    this.scene.add(this.sunGroup);

    this.sunCoreMat = new THREE.MeshBasicMaterial({ color: '#ffe066', fog: false });
    const sunCore = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 2), this.sunCoreMat);
    this.sunGroup.add(sunCore);

    this.sunGlowMat = new THREE.MeshBasicMaterial({
      color: '#ff9233',
      transparent: true,
      opacity: 0.34,
      fog: false
    });
    const sunGlow = new THREE.Mesh(new THREE.BoxGeometry(22, 22, 1.5), this.sunGlowMat);
    sunGlow.position.z = -1.2;
    this.sunGroup.add(sunGlow);
  }

  _setupTrackAndRiver() {
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // Solo esquerdo e solo além-rio para que o leito do rio nunca fique coberto
    this.groundMat = new THREE.MeshStandardMaterial({ color: '#d89c54', roughness: 0.94 });
    const groundLeft = new THREE.Mesh(new THREE.BoxGeometry(105, 1, 220), this.groundMat);
    groundLeft.position.set(-57, -0.52, -70);
    groundLeft.receiveShadow = true;
    this.worldGroup.add(groundLeft);

    const groundRight = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 220), this.groundMat);
    groundRight.position.set(66.5, -0.52, -70);
    groundRight.receiveShadow = true;
    this.worldGroup.add(groundRight);

    // Fundo do leito do rio (abaixo da superfície azul)
    this.riverBedMat = new THREE.MeshStandardMaterial({ color: '#0d4f82', roughness: 0.9 });
    const riverBed = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.5, 220), this.riverBedMat);
    riverBed.position.set(11.6, -0.55, -70);
    riverBed.receiveShadow = true;
    this.worldGroup.add(riverBed);

    // Pista principal de areia dourada
    this.trackMat = new THREE.MeshStandardMaterial({ color: '#eab76a', roughness: 0.85 });
    const track = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH, 0.16, 210), this.trackMat);
    track.position.set(0, -0.06, -70);
    track.receiveShadow = true;
    this.worldGroup.add(track);

    // Guias sutis das 3 faixas
    this.laneStripeMat = new THREE.MeshStandardMaterial({ color: '#cf9244', roughness: 0.9 });
    for (const lx of [-1.2, 1.2]) {
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 210), this.laneStripeMat);
      divider.position.set(lx, 0.015, -70);
      divider.receiveShadow = true;
      this.worldGroup.add(divider);
    }

    // Faixas transversais móveis para dar forte sensação de velocidade
    const barGeo = new THREE.BoxGeometry(TRACK_WIDTH - 0.6, 0.025, 0.42);
    this.trackStripes = new THREE.InstancedMesh(barGeo, this.laneStripeMat, 36);
    this.trackStripes.receiveShadow = true;
    this.worldGroup.add(this.trackStripes);

    // Margem esquerda e direita
    this.bankMat = new THREE.MeshStandardMaterial({ color: '#c48640', roughness: 0.92 });
    const bankRight = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 210), this.bankMat);
    bankRight.position.set(5.55, 0.02, -70);
    bankRight.receiveShadow = true;
    this.worldGroup.add(bankRight);

    const bankLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 210), this.bankMat);
    bankLeft.position.set(-5.2, 0.02, -70);
    bankLeft.receiveShadow = true;
    this.worldGroup.add(bankLeft);

    // Rio azul brilhante ao lado direito da pista (visível e vibrante!)
    this.riverMat = new THREE.MeshStandardMaterial({
      color: '#1b98f5',
      roughness: 0.18,
      metalness: 0.14,
      emissive: '#0c5ea8',
      emissiveIntensity: 0.35
    });
    this.riverMesh = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.22, 210), this.riverMat);
    this.riverMesh.position.set(11.6, -0.14, -70);
    this.riverMesh.receiveShadow = true;
    this.worldGroup.add(this.riverMesh);

    // Espuma/marolas voxel azul-claro e brancas no rio
    this.rippleMat = new THREE.MeshBasicMaterial({ color: '#b8ecff', transparent: true, opacity: 0.78 });
    this.rippleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 1), this.rippleMat, 56);
    this.worldGroup.add(this.rippleMesh);
    this.ripples = [];
    for (let i = 0; i < 56; i++) {
      this.ripples.push({
        x: 7.0 + ((i * 1.9) % 9.0),
        z: -155 + (i / 56) * 175,
        w: 0.32 + (i % 3) * 0.22,
        d: 1.4 + (i % 4) * 0.7
      });
    }

    this._dummy = new THREE.Object3D();
  }

  setShadowEnabled(enabled) {
    this.sunLight.castShadow = enabled;
  }

  setTideLevel(offset) {
    this.tideOffset = offset;
    this.riverMesh.position.y = -0.14 + offset;
  }

  applyTheme(theme) {
    if (!theme) return;
    if (theme.sky) {
      this.skyColor.set(theme.sky);
      this.scene.background.copy(this.skyColor);
    }
    if (theme.fog) {
      this.fogColor.set(theme.fog);
      this.scene.fog.color.copy(this.fogColor);
    }
    if (theme.fogDensity !== undefined) {
      this.scene.fog.density = theme.fogDensity;
    }
    if (theme.ground) this.groundMat.color.set(theme.ground);
    if (theme.track) this.trackMat.color.set(theme.track);
    if (theme.stripe) this.laneStripeMat.color.set(theme.stripe);
    if (theme.bank) this.bankMat.color.set(theme.bank);
    if (theme.river) this.riverMat.color.set(theme.river);
    if (theme.riverEmissive) this.riverMat.emissive.set(theme.riverEmissive);
    if (theme.sun) this.sunCoreMat.color.set(theme.sun);
    if (theme.sunGlow) this.sunGlowMat.color.set(theme.sunGlow);
    if (theme.scenery) this.scenery.setBiomePalette(theme.scenery);
  }

  update(dt, speed) {
    this.time += dt;
    this.scrollOffset = (this.scrollOffset + speed * dt) % 6;

    for (let i = 0; i < 36; i++) {
      const z = -170 + i * 6 + this.scrollOffset;
      this._dummy.position.set(0, 0.02, z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.set(1, 1, 1);
      this._dummy.updateMatrix();
      this.trackStripes.setMatrixAt(i, this._dummy.matrix);
    }
    this.trackStripes.instanceMatrix.needsUpdate = true;

    const riverSurfaceY = this.riverMesh.position.y + 0.115;
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      r.z += speed * dt * 0.85;
      if (r.z > 20) r.z -= 175;
      const bob = Math.sin(this.time * 4.5 + i) * 0.02;
      this._dummy.position.set(r.x, riverSurfaceY + bob, r.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.set(r.w, 1, r.d);
      this._dummy.updateMatrix();
      this.rippleMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.rippleMesh.instanceMatrix.needsUpdate = true;

    this.scenery.update(dt, speed);
  }
}
