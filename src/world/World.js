// Cenário infinito: pista de areia dourada, rio azul lateral animado,
// iluminação de pôr do sol, sol grande, névoa atmosférica e parallax.
import * as THREE from 'three';
import { SceneryInstancer } from './SceneryInstancer.js';

export const LANE_X = [-2.4, 0, 2.4];
export const RIVER_LANE_X = [7.6, 10.0, 12.4];
export const SHOP_LANE_X = { left: -5.45, right: 5.45 };
export const SKY_CORRIDOR_Y = 3.2;
export const TRACK_WIDTH = 9.2;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.scrollOffset = 0;
    this.time = 0;
    this.tideOffset = 0;
    this.riverY = -0.05;
    this.shopLaneSide = null;
    this.aquaticChannelActive = false;
    this.skyCorridorActive = false;
    this.hollowEarthActive = false;

    this._setupLightingAndSky();
    this._setupTrackAndRiver();
    this._setupSpecialCorridorsAndFx();
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
    this.groundLeft = groundLeft;

    const groundRight = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 220), this.groundMat);
    groundRight.position.set(66.5, -0.52, -70);
    groundRight.receiveShadow = true;
    this.worldGroup.add(groundRight);
    this.groundRight = groundRight;

    // Fundo do leito do rio (rebaixado para suportar mergulho 3D real no rio e oceano!)
    this.riverBedMat = new THREE.MeshStandardMaterial({ color: '#0d4f82', roughness: 0.9 });
    const riverBed = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.5, 220), this.riverBedMat);
    riverBed.position.set(11.6, -4.85, -70);
    riverBed.receiveShadow = true;
    this.worldGroup.add(riverBed);
    this.riverBed = riverBed;

    // Pista principal (torna-se lâmina de água translúcida em biomas aquáticos ou dinos 100% aquáticos)
    this.trackMat = new THREE.MeshStandardMaterial({
      color: '#eab76a',
      roughness: 0.82,
      emissive: '#3a2210',
      emissiveIntensity: 0.16,
      side: THREE.FrontSide
    });
    const track = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH, 0.16, 210), this.trackMat);
    track.position.set(0, -0.06, -70);
    track.receiveShadow = true;
    this.worldGroup.add(track);
    this.track = track;

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
    this.bankRight = bankRight;

    const bankLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 210), this.bankMat);
    bankLeft.position.set(-5.2, 0.02, -70);
    bankLeft.receiveShadow = true;
    this.worldGroup.add(bankLeft);
    this.bankLeft = bankLeft;

    // Leito oceânico real a y = -4.6 (visível ao mergulhar abaixo de y = 0!)
    this.seabedGroup = new THREE.Group();
    this.seabedGroup.visible = false;
    this.seabedMat = new THREE.MeshStandardMaterial({
      color: '#0e7490',
      roughness: 0.88,
      emissive: '#083344',
      emissiveIntensity: 0.35
    });
    const seabedMesh = new THREE.Mesh(new THREE.BoxGeometry(140, 0.5, 220), this.seabedMat);
    seabedMesh.position.set(4, -4.85, -70);
    seabedMesh.receiveShadow = true;
    this.seabedGroup.add(seabedMesh);

    const seabedRailMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.55 });
    for (const rx of [-3.6, -1.2, 1.2, 3.6, 6.4, 8.8, 11.2, 13.6]) {
      const sRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 200), seabedRailMat);
      sRail.position.set(rx, -4.57, -70);
      this.seabedGroup.add(sRail);
    }
    this.seabedBars = [];
    const seabedBarMat = new THREE.MeshStandardMaterial({ color: '#155e75', roughness: 0.8 });
    for (let i = 0; i < 22; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.55), seabedBarMat);
      bar.position.set(i % 2 === 0 ? 0 : 10, -4.56, -155 + i * 8);
      this.seabedGroup.add(bar);
      this.seabedBars.push(bar);
    }
    this.worldGroup.add(this.seabedGroup);

    // Rio azul brilhante ao lado direito da pista (translúcido e dupla-face para olhar de baixo ao mergulhar!)
    this.riverMat = new THREE.MeshStandardMaterial({
      color: '#1b98f5',
      roughness: 0.18,
      metalness: 0.14,
      emissive: '#0c5ea8',
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide
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

  _setupSpecialCorridorsAndFx() {
    // 1. Guias luminosas das 3 raias aquáticas no rio lateral (x = 7.6, 10.0, 12.4)
    this.waterLaneGroup = new THREE.Group();
    this.waterLaneGroup.visible = false;
    const wGuideMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.42
    });
    const dividerXs = [6.4, 8.8, 11.2, 13.6];
    for (const gx of dividerXs) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 170), wGuideMat);
      strip.position.set(gx, 0.02, -70);
      this.waterLaneGroup.add(strip);
    }
    this.worldGroup.add(this.waterLaneGroup);

    // 2. Guias de corredor aéreo no céu para dinossauros voadores (y ≈ 3.2)
    this.skyCorridorGroup = new THREE.Group();
    this.skyCorridorGroup.visible = false;
    const skyRailMat = new THREE.MeshBasicMaterial({
      color: '#bae6fd',
      transparent: true,
      opacity: 0.32
    });
    this.skyCorridorRings = [];
    for (let i = 0; i < 12; i++) {
      const band = new THREE.Group();
      for (const lx of LANE_X) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.78, 0.06, 6, 16),
          skyRailMat
        );
        ring.position.set(lx, SKY_CORRIDOR_Y, 0);
        band.add(ring);
      }
      band.position.z = -150 + i * 14;
      this.skyCorridorGroup.add(band);
      this.skyCorridorRings.push(band);
    }
    this.worldGroup.add(this.skyCorridorGroup);

    // 3. 4ª Pista Lateral Dinâmica da Lojinha (a cada 30k pts, entra e sai pelo mesmo lado)
    this.shopLaneGroup = new THREE.Group();
    this.shopLaneGroup.visible = false;
    const shopTrackMat = new THREE.MeshStandardMaterial({
      color: '#1f3a2e',
      roughness: 0.65,
      emissive: '#065f46',
      emissiveIntensity: 0.25
    });
    const shopBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 180), shopTrackMat);
    shopBase.position.set(0, 0.055, -72);
    shopBase.receiveShadow = true;
    const shopGoldMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      emissive: '#eab308',
      emissiveIntensity: 0.72
    });
    const railInner = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 180), shopGoldMat);
    railInner.position.set(-1.25, 0.09, -72);
    const railOuter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 180), shopGoldMat);
    railOuter.position.set(1.25, 0.09, -72);
    this.shopLaneGroup.add(shopBase, railInner, railOuter);
    this.shopChevrons = [];
    for (let i = 0; i < 20; i++) {
      const chev = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.03, 0.38),
        new THREE.MeshBasicMaterial({ color: '#34d399', transparent: true, opacity: 0.8 })
      );
      chev.position.set(0, 0.1, -152 + i * 9);
      this.shopLaneGroup.add(chev);
      this.shopChevrons.push(chev);
    }
    this.worldGroup.add(this.shopLaneGroup);

    // 4. Abóbada de Cristais da Terra Oca (bioma subterrâneo Hollow Earth)
    this.hollowEarthGroup = new THREE.Group();
    this.hollowEarthGroup.visible = false;
    const archMat = new THREE.MeshStandardMaterial({ color: '#3b0764', roughness: 0.85, emissive: '#1e1b4b', emissiveIntensity: 0.35 });
    const crystalMat = new THREE.MeshStandardMaterial({ color: '#2dd4bf', emissive: '#14b8a6', emissiveIntensity: 0.9, roughness: 0.25 });
    this.hollowArches = [];
    for (let i = 0; i < 8; i++) {
      const arch = new THREE.Group();
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(18, 1.4, 2.2), archMat);
      topBeam.position.set(0, 15.5, 0);
      const colL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 15.5, 2.0), archMat);
      colL.position.set(-8.2, 7.75, 0);
      const colR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 15.5, 2.0), archMat);
      colR.position.set(8.2, 7.75, 0);
      arch.add(topBeam, colL, colR);
      for (let c = -2; c <= 2; c++) {
        const crys = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), crystalMat);
        crys.scale.set(0.7, 2.2, 0.7);
        crys.position.set(c * 3.1, 14.2, 0);
        crys.rotation.z = c * 0.14;
        arch.add(crys);
      }
      arch.position.z = -150 + i * 22;
      this.hollowEarthGroup.add(arch);
      this.hollowArches.push(arch);
    }
    this.worldGroup.add(this.hollowEarthGroup);

    // 5. Pool de Rachaduras de Terremoto no chão
    this.earthquakeCracks = [];
    const crackGroup = new THREE.Group();
    this.worldGroup.add(crackGroup);
    const crackOuterMat = new THREE.MeshBasicMaterial({ color: '#1c1917', transparent: true, opacity: 0.86 });
    const crackMagmaMat = new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.78 });
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      const mainSeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 5.2), crackOuterMat);
      const glowSeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 4.8), crackMagmaMat);
      const branch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.25), crackOuterMat);
      branch.position.set(0.6, 0.005, 0.8);
      branch.rotation.y = 0.55;
      c.add(mainSeg, glowSeg, branch);
      c.visible = false;
      crackGroup.add(c);
      this.earthquakeCracks.push({ mesh: c, active: false, z: 0, x: 0 });
    }

    // 6. Cristas de onda e espuma translúcida na superfície do oceano/água ("Sobre a Água")
    this.waterSurfaceGroup = new THREE.Group();
    this.waterSurfaceGroup.visible = false;
    const crestMat = new THREE.MeshBasicMaterial({
      color: '#bae6fd',
      transparent: true,
      opacity: 0.42
    });
    const deepCrestMat = new THREE.MeshBasicMaterial({
      color: '#0284c7',
      transparent: true,
      opacity: 0.34
    });
    this.oceanWaveSlats = [];
    for (let i = 0; i < 24; i++) {
      const w = new THREE.Mesh(
        new THREE.BoxGeometry(i % 2 === 0 ? 7.6 : 10.4, 0.08, 0.55),
        i % 2 === 0 ? crestMat : deepCrestMat
      );
      w.position.set(i % 3 === 0 ? -0.4 : (i % 3 === 1 ? 0.4 : 0), 0.06, -150 + i * 7.2);
      this.waterSurfaceGroup.add(w);
      this.oceanWaveSlats.push(w);
    }
    this.worldGroup.add(this.waterSurfaceGroup);

    // 7. Ambiente 3D real SUBMERSO ("Submerso" & mergulho real abaixo da superfície y = 0)
    this.underwaterEnvGroup = new THREE.Group();
    this.underwaterEnvGroup.visible = false;
    this.submergedActive = false;
    this.fullWaterTrack = false;
    this.waterSurfaceActive = false;
    this._subFloorY = -4.6;
    this._subCeilY = 0.0;

    const surfaceCeilingMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });
    const surfaceCeiling = new THREE.Mesh(new THREE.PlaneGeometry(110, 210), surfaceCeilingMat);
    surfaceCeiling.rotation.x = Math.PI / 2;
    surfaceCeiling.position.set(4, 0.02, -70);
    this.underwaterEnvGroup.add(surfaceCeiling);
    this.surfaceCeiling = surfaceCeiling;

    this.ceilingWaveSlats = [];
    const ceilRibMat = new THREE.MeshBasicMaterial({
      color: '#cffafe',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      fog: false
    });
    for (let i = 0; i < 16; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(36, 0.12, 1.3), ceilRibMat);
      rib.position.set(4, -0.06, -145 + i * 10.5);
      this.underwaterEnvGroup.add(rib);
      this.ceilingWaveSlats.push(rib);
    }

    this.underwaterGodRays = [];
    const rayMat = new THREE.MeshBasicMaterial({
      color: '#7dd3fc',
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    for (let i = 0; i < 8; i++) {
      const ray = new THREE.Mesh(new THREE.BoxGeometry(1.75, 9.2, 3.8), rayMat);
      const sideX = (i % 2 === 0 ? -5.8 : 5.8) + (i % 3) * 1.4;
      ray.position.set(sideX, -2.4, -125 + i * 18);
      ray.rotation.z = 0.24;
      this.underwaterEnvGroup.add(ray);
      this.underwaterGodRays.push(ray);
    }

    this.underwaterBubbleMat = new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.78
    });
    this.underwaterBubblesMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      this.underwaterBubbleMat,
      96
    );
    this.underwaterBubbles = [];
    for (let i = 0; i < 96; i++) {
      this.underwaterBubbles.push({
        x: -10 + ((i * 3.17) % 26),
        yFrac: (i * 0.137) % 1,
        z: -140 + (i / 96) * 155,
        vy: 0.9 + (i % 4) * 0.35,
        scale: 0.65 + (i % 3) * 0.45
      });
    }
    this.underwaterEnvGroup.add(this.underwaterBubblesMesh);

    this.kelpColumns = [];
    const kelpMat = new THREE.MeshStandardMaterial({
      color: '#0d9488',
      emissive: '#14b8a6',
      emissiveIntensity: 0.42,
      roughness: 0.72
    });
    for (let i = 0; i < 18; i++) {
      const kelp = new THREE.Group();
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = i >= 10 ? (side < 0 ? 6.2 : 14.2) : side * 5.2;
      const segs = 2 + (i % 2);
      for (let s = 0; s < segs; s++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.35, 0.24), kelpMat);
        frond.position.set((s % 2 === 0 ? 0.08 : -0.08), 0.65 + s * 1.15, 0);
        kelp.add(frond);
      }
      kelp.position.set(baseX, -4.6, -135 + i * 8.8);
      this.underwaterEnvGroup.add(kelp);
      this.kelpColumns.push(kelp);
    }

    this.worldGroup.add(this.underwaterEnvGroup);
  }

  setWaterTrackVisuals(active) {
    this.waterSurfaceActive = !!active;
    this._syncUnderwaterGeometry();
  }

  setFullWaterTrack(active) {
    this.fullWaterTrack = !!active;
    this._syncUnderwaterGeometry();
  }

  setSubmergedVisuals(active, submergedBiome = false) {
    this.submergedActive = !!active;
    this._isSubmergedBiome = !!submergedBiome;
    this._syncUnderwaterGeometry();
  }

  _syncUnderwaterGeometry() {
    const sub = !!this.submergedActive;
    const isSubBiome = !!this._isSubmergedBiome;
    const fullWater = Boolean(this.fullWaterTrack || this.waterSurfaceActive);
    const surfaceWaveOn = Boolean((this.waterSurfaceActive || this.fullWaterTrack) && !isSubBiome);

    if (this.waterSurfaceGroup) this.waterSurfaceGroup.visible = surfaceWaveOn;
    if (this.underwaterEnvGroup) this.underwaterEnvGroup.visible = sub;
    if (this.seabedGroup) this.seabedGroup.visible = Boolean((fullWater || sub) && !isSubBiome);

    const floorY = isSubBiome ? -0.1 : -4.6;
    const ceilY = isSubBiome ? 9.8 : 0.0;
    this._subFloorY = floorY;
    this._subCeilY = ceilY;

    if (this.surfaceCeiling) this.surfaceCeiling.position.y = ceilY + 0.02;
    const midY = (floorY + ceilY) * 0.5;
    for (let i = 0; i < (this.underwaterGodRays?.length || 0); i++) {
      this.underwaterGodRays[i].position.y = midY;
      this.underwaterGodRays[i].scale.y = Math.max(0.45, (ceilY - floorY) / 9.2);
    }
    for (let i = 0; i < (this.kelpColumns?.length || 0); i++) {
      this.kelpColumns[i].position.y = floorY;
    }

    // Submergindo abaixo da superfície y=0: pista d'água fica translúcida para revelar o mundo submerso e o teto oceânico!
    const waterLookOn = fullWater && !isSubBiome;
    if (this.track) {
      this.track.position.y = waterLookOn ? -0.02 : -0.06;
    }
    if (this.trackMat) {
      if (waterLookOn) {
        this.trackMat.color.set(sub ? '#0284c7' : '#0ea5e9');
        this.trackMat.emissive.set('#0369a1');
        this.trackMat.emissiveIntensity = sub ? 0.34 : 0.42;
        this.trackMat.roughness = 0.16;
        this.trackMat.transparent = true;
        this.trackMat.opacity = sub ? 0.46 : 0.78;
        this.trackMat.depthWrite = !sub;
        this.trackMat.side = THREE.DoubleSide;
      } else {
        this.trackMat.roughness = 0.82;
        this.trackMat.transparent = false;
        this.trackMat.opacity = 1;
        this.trackMat.depthWrite = true;
        this.trackMat.side = THREE.FrontSide;
      }
      this.trackMat.needsUpdate = true;
    }
    if (this.riverMat) {
      this.riverMat.transparent = sub;
      this.riverMat.opacity = sub ? 0.46 : 1;
      this.riverMat.depthWrite = !sub;
      this.riverMat.needsUpdate = true;
    }

    // Esconde faixas secas / margens terrestres / cactos opacos quando em corrida aquática ou abaixo d'água!
    const hideSideLand = Boolean((fullWater || sub) && !isSubBiome);
    if (this.groundLeft) this.groundLeft.position.y = hideSideLand ? -5.15 : -0.52;
    if (this.groundRight) this.groundRight.position.y = (sub || this.aquaticChannelActive || hideSideLand) ? -5.15 : -0.52;
    if (this.bankLeft) this.bankLeft.visible = !hideSideLand;
    if (this.bankRight) this.bankRight.visible = !hideSideLand;
    for (let i = 0; i < (this.trackLanterns?.length || 0); i++) {
      this.trackLanterns[i].visible = !this.lowSpec && !sub;
    }
    if (this.trackStripes) {
      this.trackStripes.visible = !(sub && !isSubBiome);
    }

    this.scenery?.setWaterState?.({
      submerged: sub,
      fullWater: waterLookOn,
      floorY: isSubBiome ? 0 : -4.6
    });
  }

  setAquaticChannelActive(active) {
    this.aquaticChannelActive = !!active;
    if (this.waterLaneGroup) this.waterLaneGroup.visible = this.aquaticChannelActive;
  }

  setSkyCorridorActive(active) {
    this.skyCorridorActive = !!active;
    if (this.skyCorridorGroup) this.skyCorridorGroup.visible = this.skyCorridorActive;
  }

  setShopLane(side = null) {
    this.shopLaneSide = (side === 'left' || side === 'right') ? side : null;
    if (!this.shopLaneGroup) return;
    if (!this.shopLaneSide) {
      this.shopLaneGroup.visible = false;
      return;
    }
    this.shopLaneGroup.position.x = SHOP_LANE_X[this.shopLaneSide];
    this.shopLaneGroup.visible = true;
  }

  setHollowEarthVisuals(active) {
    this.hollowEarthActive = !!active;
    if (this.hollowEarthGroup) this.hollowEarthGroup.visible = this.hollowEarthActive;
  }

  spawnEarthquakeCracks(count = 6) {
    let spawned = 0;
    for (let i = 0; i < this.earthquakeCracks.length && spawned < count; i++) {
      const slot = this.earthquakeCracks[i];
      if (!slot.active) {
        slot.active = true;
        slot.x = -3.6 + Math.random() * 7.2;
        slot.z = -35 - spawned * 14 - Math.random() * 8;
        slot.mesh.position.set(slot.x, 0.045, slot.z);
        slot.mesh.rotation.y = (Math.random() - 0.5) * 0.45;
        slot.mesh.visible = true;
        spawned++;
      }
    }
  }

  _updateSpecialCorridorsAndFx(dt, speed) {
    if (this.skyCorridorActive && this.skyCorridorRings) {
      for (let i = 0; i < this.skyCorridorRings.length; i++) {
        const b = this.skyCorridorRings[i];
        b.position.z += speed * dt;
        if (b.position.z > 18) b.position.z -= 168;
      }
    }
    if (this.shopLaneSide && this.shopChevrons) {
      for (let i = 0; i < this.shopChevrons.length; i++) {
        const c = this.shopChevrons[i];
        c.position.z += speed * dt;
        if (c.position.z > 20) c.position.z -= 180;
      }
    }
    if (this.hollowEarthActive && this.hollowArches) {
      for (let i = 0; i < this.hollowArches.length; i++) {
        const a = this.hollowArches[i];
        a.position.z += speed * dt;
        if (a.position.z > 22) a.position.z -= 176;
      }
    }
    if (this.earthquakeCracks) {
      for (let i = 0; i < this.earthquakeCracks.length; i++) {
        const slot = this.earthquakeCracks[i];
        if (!slot.active) continue;
        slot.z += speed * dt;
        slot.mesh.position.z = slot.z;
        if (slot.z > 16) {
          slot.active = false;
          slot.mesh.visible = false;
        }
      }
    }
    if (this.seabedGroup?.visible && this.seabedBars) {
      for (let i = 0; i < this.seabedBars.length; i++) {
        const sb = this.seabedBars[i];
        sb.position.z += speed * dt;
        if (sb.position.z > 20) sb.position.z -= 176;
      }
    }
    if (this.waterSurfaceGroup?.visible && this.oceanWaveSlats) {
      for (let i = 0; i < this.oceanWaveSlats.length; i++) {
        const w = this.oceanWaveSlats[i];
        w.position.z += speed * dt * 1.1;
        w.position.y = 0.05 + Math.sin(this.time * 4.5 + i * 0.7) * 0.045;
        if (w.position.z > 18) w.position.z -= 172;
      }
    }
    if (this.submergedActive && this.underwaterEnvGroup?.visible) {
      const floorY = this._subFloorY ?? -4.6;
      const ceilY = this._subCeilY ?? 0.0;
      const spanY = Math.max(2.0, ceilY - floorY);
      for (let i = 0; i < this.ceilingWaveSlats.length; i++) {
        const rib = this.ceilingWaveSlats[i];
        rib.position.z += speed * dt * 0.72;
        rib.position.y = ceilY - 0.08 + Math.sin(this.time * 2.8 + i) * 0.09;
        if (rib.position.z > 20) rib.position.z -= 168;
      }
      for (let i = 0; i < this.underwaterGodRays.length; i++) {
        const ray = this.underwaterGodRays[i];
        ray.position.z += speed * dt * 0.85;
        if (ray.position.z > 22) ray.position.z -= 144;
      }
      for (let i = 0; i < this.kelpColumns.length; i++) {
        const k = this.kelpColumns[i];
        k.position.z += speed * dt;
        k.rotation.z = Math.sin(this.time * 2.4 + i) * 0.12;
        if (k.position.z > 18) k.position.z -= 158;
      }
      for (let i = 0; i < this.underwaterBubbles.length; i++) {
        const b = this.underwaterBubbles[i];
        b.yFrac = (b.yFrac + (b.vy * dt) / spanY) % 1;
        b.z += speed * dt * 0.92;
        if (b.z > 16) b.z -= 155;
        const wy = floorY + 0.25 + b.yFrac * (spanY - 0.35);
        this._dummy.position.set(b.x + Math.sin(this.time * 3.2 + i) * 0.18, wy, b.z);
        this._dummy.rotation.set(0, 0, 0);
        this._dummy.scale.setScalar(b.scale);
        this._dummy.updateMatrix();
        this.underwaterBubblesMesh.setMatrixAt(i, this._dummy.matrix);
      }
      this.underwaterBubblesMesh.instanceMatrix.needsUpdate = true;
    }
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
    const floorRefY = (this.submergedActive && !this._isSubmergedBiome && y < -0.5) ? -4.57 : 0;
    const heightAboveFloor = Math.max(0, y - floorRefY);
    if (this.playerShadowMesh) {
      this.playerShadowMesh.position.set(x, floorRefY + 0.032, z);
      const shadowScale = Math.max(0.45, 1.0 - Math.min(4.2, heightAboveFloor) * 0.13);
      this.playerShadowMesh.scale.set(shadowScale, shadowScale, 1);
      this.playerShadowMesh.material.opacity = Math.max(0.18, 0.48 - heightAboveFloor * 0.06);
    }
    if (this.playerLaneRingMesh) {
      this.playerLaneRingMesh.position.set(x, floorRefY + 0.036, z);
      const pulse = 1 + Math.sin(this.time * 6) * 0.06;
      this.playerLaneRingMesh.scale.set(pulse, pulse, 1);
      if (accentColor) this.playerLaneRingMesh.material.color.set(accentColor);
    }
    if (this.trackFillLight) {
      this.trackFillLight.position.set(x * 0.45, y < -0.5 ? 0.8 : 7.6, z - 3.2);
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
    if (!(this.fullWaterTrack || this.waterSurfaceActive) || this._isSubmergedBiome) {
      this.trackMat.color.copy(from.track).lerp(to.track, k);
      this.trackMat.emissive.copy(this.trackMat.color).multiplyScalar(0.18);
    }
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
    this._updateSpecialCorridorsAndFx(dt, speed);
  }
}
