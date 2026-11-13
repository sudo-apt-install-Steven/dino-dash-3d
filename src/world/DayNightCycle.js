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

    if (this.eclipseTimer > 0) {
      this.eclipseTimer -= dt;
      this.phase = 'eclipse';
      this.world.sunLight.intensity = 0.25;
      this.world.hemiLight.intensity = 0.22;
      this.scene.fog.density = 0.042;
      this.scene.background.set('#0a0612');
      this.scene.fog.color.set('#0a0612');
      this.starMat.opacity = 0.9;
    } else if (this.cycleTime < 40) {
      // Pôr do sol quente (padrão) / Dia do bioma
      this.phase = 'sunset';
      this.world.sunLight.intensity = 1.85;
      this.world.hemiLight.intensity = 0.95;
      if (baseTheme) {
        this.scene.background.set(baseTheme.sky);
        this.scene.fog.color.set(baseTheme.fog);
        this.scene.fog.density = baseTheme.fogDensity || 0.011;
      }
      this.starMat.opacity = 0;
    } else if (this.cycleTime < 68) {
      // Crepúsculo suave
      this.phase = 'dusk';
      this.world.sunLight.intensity = 1.35;
      this.world.hemiLight.intensity = 0.72;
      this.starMat.opacity = 0.35;
    } else {
      // Noite estrelada
      this.phase = 'night';
      this.world.sunLight.intensity = 0.75;
      this.world.hemiLight.intensity = 0.45;
      this.scene.background.set('#141b33');
      this.scene.fog.color.set('#18213d');
      this.scene.fog.density = 0.015;
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
