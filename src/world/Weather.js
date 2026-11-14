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

    // Partículas de chuva/neve/folhas em InstancedMesh (suaves e fora do corredor visual central)
    const dropGeo = new THREE.BoxGeometry(0.06, 0.36, 0.06);
    this.dropMat = new THREE.MeshBasicMaterial({ color: '#90e0ef', transparent: true, opacity: 0.4 });
    this.clearVision = false;
    this.dropsMesh = new THREE.InstancedMesh(dropGeo, this.dropMat, 96);
    this.dropsMesh.visible = false;
    this.scene.add(this.dropsMesh);

    this.drops = [];
    for (let i = 0; i < 96; i++) {
      let x = (Math.random() - 0.5) * 30;
      const z = -36 + Math.random() * 44;
      if (Math.abs(x) < 4.8 && z > -14) x = (x < 0 ? -1 : 1) * (4.8 + Math.random() * 8);
      this.drops.push({ x, y: Math.random() * 14, z });
    }
    this._dummy = new THREE.Object3D();
  }

  setClearVision(enabled = false) {
    this.clearVision = !!enabled;
    this.dropMat.opacity = this.clearVision ? 0.16 : 0.4;
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
      const fallSpeed = this.current === 'rain' ? 22 : 5.2;
      const visScale = this.clearVision ? 0.5 : 1.0;
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        d.y -= fallSpeed * dt;
        d.x += this.windForce * 0.5 * dt;
        if (d.y < 0) {
          d.y = 14;
          let nx = (Math.random() - 0.5) * 30;
          if (Math.abs(nx) < 4.8 && d.z > -14) nx = (nx < 0 ? -1 : 1) * (4.8 + Math.random() * 8);
          d.x = nx;
        }
        // Evita obstruir o corredor câmera->dino mesmo sob vento forte
        if (Math.abs(d.x) < 4.5 && d.z > -12) {
          this._dummy.scale.set(0, 0, 0);
        } else {
          this._dummy.scale.set(
            (this.current === 'rain' ? 0.85 : 1.7) * visScale,
            (this.current === 'rain' ? 0.9 : 0.3) * visScale,
            (this.current === 'rain' ? 0.85 : 1.7) * visScale
          );
        }
        this._dummy.position.set(d.x, d.y, d.z);
        this._dummy.updateMatrix();
        this.dropsMesh.setMatrixAt(i, this._dummy.matrix);
      }
      this.dropsMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
