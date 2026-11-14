// Ciclo Dia / Noite / Eclipse, vaga-lumes, estrelas, aurora boreal e cometa raro.
import * as THREE from 'three';

export class DayNightCycle {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.cycleTime = 0; // 0..90s ciclo completo
    this.phase = 'sunset'; // 'day' | 'sunset' | 'night' | 'eclipse'
    this.eclipseTimer = 0;
    this.auroraTimer = 0;

    // Estrelas e vaga-lumes (InstancedMesh leve)
    const starGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    this.starMat = new THREE.MeshBasicMaterial({ color: '#fff8d6', transparent: true, opacity: 0, fog: false });
    this.stars = new THREE.InstancedMesh(starGeo, this.starMat, 70);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 70; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 140,
        18 + Math.random() * 26,
        -135 + Math.random() * 35
      );
      dummy.updateMatrix();
      this.stars.setMatrixAt(i, dummy.matrix);
    }
    this.stars.instanceMatrix.needsUpdate = true;
    this.scene.add(this.stars);

    // Aurora boreal + Cometa raro
    this.auroraMat = new THREE.MeshBasicMaterial({ color: '#00f5d4', transparent: true, opacity: 0, fog: false });
    this.aurora = new THREE.Mesh(new THREE.BoxGeometry(90, 6, 1.5), this.auroraMat);
    this.aurora.position.set(0, 32, -135);
    this.scene.add(this.aurora);

    this.cometMat = new THREE.MeshBasicMaterial({ color: '#90e0ef', fog: false });
    this.comet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 6), this.cometMat);
    this.comet.visible = false;
    this.scene.add(this.comet);
    this.cometActive = false;
  }

  triggerEclipse(duration = 12) {
    this.eclipseTimer = duration;
  }

  triggerAuroraAndComet() {
    this.auroraTimer = 14;
    this.cometActive = true;
    this.comet.visible = true;
    this.comet.position.set(-45, 34, -125);
  }

  update(dt, baseTheme) {
    this.cycleTime = (this.cycleTime + dt) % 100;

    // Eclipse e Noite escurecem APENAS o céu distante; pista, obstáculos e dino ficam nítidos!
    const clearVis = !!this.world.clearVision;
    const minFactor = this.world.brightnessMult || 1.05;
    if (this.eclipseTimer > 0) {
      this.eclipseTimer -= dt;
      this.phase = 'eclipse';
      this.world.setCycleLighting(Math.max(1.22, 1.25 * minFactor), Math.max(0.92, 0.96 * minFactor), 1.0);
      this.scene.fog.density = clearVis ? 0.0065 : 0.0155;
      this.scene.background.set('#382b6e');
      this.scene.fog.color.set('#4c3e8f');
      this.starMat.opacity = 0.9;
    } else if (this.cycleTime < 40) {
      // Pôr do sol quente (padrão) / Dia do bioma
      this.phase = 'sunset';
      this.world.setCycleLighting(1.85 * minFactor, 1.05 * minFactor, 0.12);
      if (baseTheme && !this.world.isTransitioningTheme()) {
        this.scene.background.lerp(this.world.currentSkyColor || new THREE.Color(baseTheme.sky), Math.min(1, dt * 3));
        this.scene.fog.color.lerp(this.world.currentFogColor || new THREE.Color(baseTheme.fog), Math.min(1, dt * 3));
        const targetDens = clearVis ? 0.006 : Math.min(0.017, baseTheme.fogDensity || 0.011);
        this.scene.fog.density += (targetDens - this.scene.fog.density) * Math.min(1, dt * 3);
      }
      this.starMat.opacity = 0;
    } else if (this.cycleTime < 68) {
      // Crepúsculo suave com cor de bioma preservada
      this.phase = 'dusk';
      this.world.setCycleLighting(1.52 * minFactor, 0.96 * minFactor, 0.55);
      if (baseTheme && !this.world.isTransitioningTheme()) {
        const duskSky = new THREE.Color(baseTheme.sky).lerp(new THREE.Color('#472a6e'), 0.45);
        const duskFog = new THREE.Color(baseTheme.fog || baseTheme.sky).lerp(new THREE.Color('#5a3985'), 0.4);
        this.scene.background.lerp(duskSky, Math.min(1, dt * 1.5));
        this.scene.fog.color.lerp(duskFog, Math.min(1, dt * 1.5));
      }
      this.scene.fog.density = clearVis ? 0.0065 : 0.014;
      this.starMat.opacity = 0.35;
    } else {
      // Noite estrelada: céu escuro vibrante + pista iluminada por lanternas/cristais
      this.phase = 'night';
      this.world.setCycleLighting(Math.max(1.28, 1.35 * minFactor), Math.max(0.95, 0.98 * minFactor), 0.85);
      const baseSky = baseTheme?.sky || '#293b75';
      const nightSky = new THREE.Color(baseSky).lerp(new THREE.Color('#2a3f7d'), 0.55);
      const nightFog = new THREE.Color(baseTheme?.fog || '#3a5096').lerp(new THREE.Color('#39529e'), 0.45);
      this.scene.background.lerp(nightSky, Math.min(1, dt * 1.5));
      this.scene.fog.color.lerp(nightFog, Math.min(1, dt * 1.5));
      this.scene.fog.density = clearVis ? 0.0065 : 0.0135;
      this.starMat.opacity = 0.92;
    }

    if (this.auroraTimer > 0) {
      this.auroraTimer -= dt;
      this.auroraMat.opacity = 0.42 * Math.sin(this.auroraTimer * 2) * 0.3 + 0.35;
      this.aurora.position.x = Math.sin(this.cycleTime * 0.4) * 10;
    } else {
      this.auroraMat.opacity = 0;
    }

    if (this.cometActive) {
      this.comet.position.x += dt * 18;
      this.comet.position.y -= dt * 3.5;
      if (this.comet.position.x > 55) {
        this.cometActive = false;
        this.comet.visible = false;
      }
    }
  }
}
