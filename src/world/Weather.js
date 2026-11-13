// Clima dinâmico que afeta o gameplay (chuva escorregadia, vento no pulo, calor),
// estações do ano (flores/folhas/neve) e marés do rio.
import * as THREE from 'three';

export const WEATHERS = ['clear', 'rain', 'wind', 'heat', 'snow'];
export const SEASONS = ['summer', 'autumn', 'winter', 'spring'];

export class WeatherSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.current = 'clear';
    this.season = 'summer';
    this.weatherTimer = 28;
    this.windForce = 0;
    this.tidePhase = 0;

    // Partículas de chuva/neve/folhas em InstancedMesh
    const dropGeo = new THREE.BoxGeometry(0.08, 0.45, 0.08);
    this.dropMat = new THREE.MeshBasicMaterial({ color: '#90e0ef', transparent: true, opacity: 0.65 });
    this.dropsMesh = new THREE.InstancedMesh(dropGeo, this.dropMat, 120);
    this.dropsMesh.visible = false;
    this.scene.add(this.dropsMesh);

    this.drops = [];
    for (let i = 0; i < 120; i++) {
      this.drops.push({
        x: (Math.random() - 0.5) * 28,
        y: Math.random() * 14,
        z: -35 + Math.random() * 45
      });
    }
    this._dummy = new THREE.Object3D();
  }

  setWeather(weatherId) {
    this.current = weatherId;
    this.dropsMesh.visible = weatherId === 'rain' || weatherId === 'snow' || this.season === 'autumn' || this.season === 'spring';
    if (weatherId === 'rain') {
      this.dropMat.color.set('#7dd3fc');
      this.windForce = 0;
    } else if (weatherId === 'snow') {
      this.dropMat.color.set('#ffffff');
      this.windForce = 0;
    } else if (weatherId === 'wind') {
      this.windForce = Math.random() < 0.5 ? -2.2 : 2.2;
    } else {
      this.windForce = 0;
    }
  }

  cycleSeason() {
    const idx = (SEASONS.indexOf(this.season) + 1) % SEASONS.length;
    this.season = SEASONS[idx];
    if (this.season === 'autumn') {
      this.dropMat.color.set('#f4a261');
      this.dropsMesh.visible = true;
    } else if (this.season === 'spring') {
      this.dropMat.color.set('#ff9ebb');
      this.dropsMesh.visible = true;
    } else if (this.season === 'winter') {
      this.setWeather('snow');
    } else {
      this.setWeather('clear');
    }
    return this.season;
  }

  update(dt, autoCycle = true) {
    this.tidePhase += dt * 0.45;
    const tide = Math.sin(this.tidePhase) * 0.09;
    this.world.setTideLevel(tide);

    if (autoCycle) {
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        this.weatherTimer = 25 + Math.random() * 15;
        const next = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
        this.setWeather(next);
      }
    }

    if (this.dropsMesh.visible) {
      const fallSpeed = this.current === 'rain' ? 24 : 5.5;
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        d.y -= fallSpeed * dt;
        d.x += this.windForce * 0.5 * dt;
        if (d.y < 0) {
          d.y = 14;
          d.x = (Math.random() - 0.5) * 28;
        }
        this._dummy.position.set(d.x, d.y, d.z);
        this._dummy.scale.set(
          this.current === 'rain' ? 1 : 2.2,
          this.current === 'rain' ? 1 : 0.35,
          this.current === 'rain' ? 1 : 2.2
        );
        this._dummy.updateMatrix();
        this.dropsMesh.setMatrixAt(i, this._dummy.matrix);
      }
      this.dropsMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
