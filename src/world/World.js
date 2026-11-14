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

    this.hemiLight = new THREE.HemisphereLight('#ffe0b5', '#8c4420', 1.05);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#ffd18c', 1.85);
    this.sunLight.position.set(-16, 22, -24);
    this.sunLight.castShadow = true;

    // Luz de recorte (rim light) e preenchimento sobre o dino e pista para nitidez constante
    this.rimLight = new THREE.DirectionalLight('#fff4e0', 1.1);
    this.rimLight.position.set(10, 14, 14);
    this.scene.add(this.rimLight);

    this.trackFillLight = new THREE.PointLight('#fff3d6', 1.25, 36, 1.2);
    this.trackFillLight.position.set(0, 7.5, -4);
    this.scene.add(this.trackFillLight);

    this.brightnessMult = 1.05;
    this.clearVision = false;
    this.nightGlow = 0;
    this._baseHemiIntensity = 1.05;
    this._baseSunIntensity = 1.85;
    this._themeTransition = 1;
    this._fromThemeColors = null;
    this._toThemeColors = null;
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
    this.trackMat = new THREE.MeshStandardMaterial({
      color: '#eab76a',
      roughness: 0.82,
      emissive: '#3a2210',
      emissiveIntensity: 0.16
    });
    const track = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH, 0.16, 210), this.trackMat);
    track.position.set(0, -0.06, -70);
    track.receiveShadow = true;
    this.worldGroup.add(track);

    // Guias das 3 faixas + trilhos luminosos nas bordas da pista
    this.laneStripeMat = new THREE.MeshStandardMaterial({
      color: '#cf9244',
      roughness: 0.85,
      emissive: '#6e4518',
      emissiveIntensity: 0.22
    });
    for (const lx of [-1.2, 1.2]) {
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 210), this.laneStripeMat);
      divider.position.set(lx, 0.018, -70);
      divider.receiveShadow = true;
      this.worldGroup.add(divider);
    }

    this.edgeRailMat = new THREE.MeshStandardMaterial({
      color: '#ffd166',
      emissive: '#ffb703',
      emissiveIntensity: 0.28,
      roughness: 0.45
    });
    for (const ex of [-3.75, 3.75]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 210), this.edgeRailMat);
      rail.position.set(ex, 0.04, -70);
      this.worldGroup.add(rail);
    }

    // Lanternas / Cristais guia nas margens (acendem automaticamente à noite/eclipse/biomas escuros)
    this.lanternMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#fbbf24',
      emissiveIntensity: 0.45,
      roughness: 0.3
    });
    this.lanternPostMat = new THREE.MeshStandardMaterial({ color: '#5c3d2e', roughness: 0.85 });
    this.trackLanterns = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), this.lanternPostMat);
      post.position.y = 0.45;
      const gem = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), this.lanternMat);
      gem.position.y = 1.02;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), this.lanternPostMat);
      cap.position.y = 1.18;
      g.add(post, gem, cap);
      g.position.set(side * 4.05, 0, -145 + i * 10);
      this.worldGroup.add(g);
      this.trackLanterns.push(g);
    }

    // Sombra circular nítida e anel luminoso da faixa sob o jogador principal
    this.playerShadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 18),
      new THREE.MeshBasicMaterial({ color: '#0f0804', transparent: true, opacity: 0.42, depthWrite: false })
    );
    this.playerShadowMesh.rotation.x = -Math.PI / 2;
    this.playerShadowMesh.position.set(0, 0.032, 0);
    this.scene.add(this.playerShadowMesh);

    this.playerLaneRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.56, 0.72, 24),
      new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false })
    );
    this.playerLaneRingMesh.rotation.x = -Math.PI / 2;
    this.playerLaneRingMesh.position.set(0, 0.036, 0);
    this.scene.add(this.playerLaneRingMesh);

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

  setBrightness(mult = 1.05) {
    this.brightnessMult = Math.max(0.8, Math.min(1.55, Number(mult) || 1.05));
    this.setCycleLighting(this._baseSunIntensity, this._baseHemiIntensity, this.nightGlow);
  }

  setClearVision(enabled = false) {
    this.clearVision = !!enabled;
    if (this.scene.fog) {
      this.scene.fog.density = this.clearVision ? 0.006 : Math.min(0.018, this._targetFogDensity || 0.012);
    }
  }

  setCycleLighting(sunInt = 1.85, hemiInt = 1.05, nightGlow = 0) {
    const b = this.brightnessMult || 1.05;
    this._baseSunIntensity = sunInt / b;
    this._baseHemiIntensity = hemiInt / b;
    this.nightGlow = Math.max(0, Math.min(1, nightGlow));
    this.sunLight.intensity = Math.max(1.12, sunInt);
    this.hemiLight.intensity = Math.max(0.86, hemiInt);
    this.rimLight.intensity = (1.05 + this.nightGlow * 0.42) * b;
    this.trackFillLight.intensity = (1.18 + this.nightGlow * 0.65) * b;
    this.edgeRailMat.emissiveIntensity = 0.28 + this.nightGlow * 0.55;
    this.lanternMat.emissiveIntensity = 0.42 + this.nightGlow * 0.85;
    this.trackMat.emissiveIntensity = 0.14 + this.nightGlow * 0.16;
  }

  setLowSpec(enabled) {
    const low = !!enabled;
    this.lowSpec = low;
    if (this.rimLight) this.rimLight.visible = !low;
    if (this.trackFillLight) this.trackFillLight.visible = !low;
    if (this.playerShadowMesh) this.playerShadowMesh.visible = !low;
    for (let i = 0; i < this.trackLanterns.length; i++) {
      this.trackLanterns[i].visible = !low;
    }
    this.scenery?.setLowDetail?.(low);
    if (this.scene.fog) {
      this.scene.fog.density = low ? 0.004 : (this.clearVision ? 0.006 : Math.min(0.018, this._targetFogDensity || 0.012));
    }
  }

  isTransitioningTheme() {
    return this._themeTransition < 1;
  }

  updatePlayerFocus(x, y, z, accentColor = '#fde047') {
    if (this.playerShadowMesh) {
      this.playerShadowMesh.position.set(x, 0.032, z);
      const shadowScale = Math.max(0.45, 1.0 - Math.min(4.2, Math.max(0, y)) * 0.13);
      this.playerShadowMesh.scale.set(shadowScale, shadowScale, 1);
      this.playerShadowMesh.material.opacity = Math.max(0.18, 0.48 - Math.max(0, y) * 0.06);
    }
    if (this.playerLaneRingMesh) {
      this.playerLaneRingMesh.position.set(x, 0.036, z);
      const pulse = 1 + Math.sin(this.time * 6) * 0.06;
      this.playerLaneRingMesh.scale.set(pulse, pulse, 1);
      if (accentColor) this.playerLaneRingMesh.material.color.set(accentColor);
    }
    if (this.trackFillLight) {
      this.trackFillLight.position.set(x * 0.45, 7.6, z - 3.2);
    }
  }

  setTideLevel(offset) {
    this.tideOffset = offset;
    this.riverMesh.position.y = -0.14 + offset;
  }

  _buildThemeColors(theme) {
    const sky = new THREE.Color(theme.sky || '#f28b50');
    const fog = new THREE.Color(theme.fog || theme.sky || '#f5a87a');
    // Garante piso de luminância perceptível (linear RGB) para zero escuridão opaca na pista
    const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const track = new THREE.Color(theme.track || '#e0ae63');
    for (let i = 0; i < 12 && lum(track) < 0.18; i++) track.offsetHSL(0, 0, 0.04);
    const ground = new THREE.Color(theme.ground || '#c47b47');
    for (let i = 0; i < 10 && lum(ground) < 0.095; i++) ground.offsetHSL(0, 0, 0.04);
    const stripe = new THREE.Color(theme.stripe || '#f3d08f');
    const bank = new THREE.Color(theme.bank || '#8c5a3c');
    const river = new THREE.Color(theme.river || '#38bdf8');
    const riverEmissive = new THREE.Color(theme.riverEmissive || '#0ea5e9');
    const sun = new THREE.Color(theme.sun || '#ffe58f');
    const sunGlow = new THREE.Color(theme.sunGlow || '#ff9f43');
    const edgeGlow = new THREE.Color(theme.edgeGlow || theme.stripe || '#ffd166');
    const fogDensity = Math.min(0.016, theme.fogDensity !== undefined ? theme.fogDensity : 0.011);
    return { sky, fog, fogDensity, ground, track, stripe, bank, river, riverEmissive, sun, sunGlow, edgeGlow };
  }

  applyTheme(theme, immediate = true) {
    if (!theme) return;
    const nextColors = this._buildThemeColors(theme);
    this._targetFogDensity = nextColors.fogDensity;
    if (theme.scenery) this.scenery.setBiomePalette(theme.scenery);

    if (immediate || !this._toThemeColors) {
      this._fromThemeColors = nextColors;
      this._toThemeColors = nextColors;
      this._themeTransition = 1;
      this._applyInterpolatedColors(nextColors, nextColors, 1);
      return;
    }

    // Transição gradual (~5s) entre biomas para evitar cortes bruscos de cor/luz
    this._fromThemeColors = {
      sky: this.scene.background.clone(),
      fog: this.scene.fog.color.clone(),
      fogDensity: this.scene.fog.density,
      ground: this.groundMat.color.clone(),
      track: this.trackMat.color.clone(),
      stripe: this.laneStripeMat.color.clone(),
      bank: this.bankMat.color.clone(),
      river: this.riverMat.color.clone(),
      riverEmissive: this.riverMat.emissive.clone(),
      sun: this.sunCoreMat.color.clone(),
      sunGlow: this.sunGlowMat.color.clone(),
      edgeGlow: this.edgeRailMat.emissive.clone()
    };
    this._toThemeColors = nextColors;
    this._themeTransition = 0;
  }

  _applyInterpolatedColors(from, to, t) {
    const k = Math.max(0, Math.min(1, t));
    this.skyColor.copy(from.sky).lerp(to.sky, k);
    this.fogColor.copy(from.fog).lerp(to.fog, k);
    this.currentSkyColor = this.skyColor;
    this.currentFogColor = this.fogColor;
    this.scene.background.copy(this.skyColor);
    this.scene.fog.color.copy(this.fogColor);
    const baseDens = from.fogDensity + (to.fogDensity - from.fogDensity) * k;
    this.scene.fog.density = this.clearVision ? 0.006 : baseDens;
    this.groundMat.color.copy(from.ground).lerp(to.ground, k);
    this.trackMat.color.copy(from.track).lerp(to.track, k);
    this.trackMat.emissive.copy(this.trackMat.color).multiplyScalar(0.18);
    this.laneStripeMat.color.copy(from.stripe).lerp(to.stripe, k);
    this.laneStripeMat.emissive.copy(this.laneStripeMat.color).multiplyScalar(0.24);
    this.bankMat.color.copy(from.bank).lerp(to.bank, k);
    this.riverMat.color.copy(from.river).lerp(to.river, k);
    this.riverMat.emissive.copy(from.riverEmissive).lerp(to.riverEmissive, k);
    this.sunCoreMat.color.copy(from.sun).lerp(to.sun, k);
    this.sunGlowMat.color.copy(from.sunGlow).lerp(to.sunGlow, k);
    this.edgeRailMat.color.copy(from.edgeGlow).lerp(to.edgeGlow, k);
    this.edgeRailMat.emissive.copy(this.edgeRailMat.color);
    this.lanternMat.color.copy(this.edgeRailMat.color);
    this.lanternMat.emissive.copy(this.edgeRailMat.color);
  }

  update(dt, speed) {
    this.time += dt;
    if (this._themeTransition < 1 && this._fromThemeColors && this._toThemeColors) {
      this._themeTransition = Math.min(1, this._themeTransition + dt / 5.0);
      this._applyInterpolatedColors(this._fromThemeColors, this._toThemeColors, this._themeTransition);
    }

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

    for (let i = 0; i < this.trackLanterns.length; i++) {
      const lan = this.trackLanterns[i];
      lan.position.z += speed * dt;
      if (lan.position.z > 15) lan.position.z -= 160;
    }

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
