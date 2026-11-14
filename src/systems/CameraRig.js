// Gerenciador de câmera: 6 modos na tecla C, tremor, FOV dinâmico,
// enquadramento multiplayer, Modo Foto livre e suavização.
import * as THREE from 'three';

export const CAMERA_MODES = [
  { id: 'third', label: '3ª Pessoa' },
  { id: 'side', label: 'Lateral Clássica' },
  { id: 'iso', label: 'Isométrica' },
  { id: 'top', label: 'Topo' },
  { id: 'first', label: '1ª Pessoa' },
  { id: 'cinematic', label: 'Cinemática' }
];

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.modeIndex = 0;
    this.baseFov = 58;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.cinematicTime = 0;
    this.photoOrbitAngle = 0.5;
    this.focusPlayerId = null;
    this.spectatorOrbitAngle = 0;
    this.predatorFocusPos = null;

    this.currentPos = new THREE.Vector3(-0.9, 4.9, 9.2);
    this.currentLook = new THREE.Vector3(1.2, 1.3, -11);
    this.targetPos = new THREE.Vector3();
    this.targetLook = new THREE.Vector3();
  }

  get currentMode() {
    return CAMERA_MODES[this.modeIndex];
  }

  cycleMode() {
    this.modeIndex = (this.modeIndex + 1) % CAMERA_MODES.length;
    return this.currentMode;
  }

  triggerShake(intensity = 0.45, duration = 0.28) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  setFocusPlayer(playerId = null) {
    this.focusPlayerId = playerId;
  }

  setPredatorFocus(pos = null) {
    this.predatorFocusPos = pos ? { x: pos.x || 0, y: pos.y || 0, z: pos.z || 8 } : null;
  }

  update(dt, playersOrPos, speed = 18, reduceShake = false, photoMode = false, spectatorMode = false) {
    this.cinematicTime += dt;

    let fx = 0;
    let fy = 0;
    let fz = 0;
    let spreadExtra = 0;
    let highlightZoom = 0;

    if (Array.isArray(playersOrPos) && playersOrPos.length > 0) {
      const focused = this.focusPlayerId
        ? playersOrPos.find((pl) => pl.peerId === this.focusPlayerId || pl.name === this.focusPlayerId || String(pl.index) === String(this.focusPlayerId))
        : null;

      if (focused && !focused.dead) {
        fx = focused.x;
        fy = (focused.baseY || 0) + focused.y;
        fz = focused.z;
        highlightZoom = -1.35;
      } else {
        const alive = playersOrPos.filter((pl) => !pl.dead);
        const list = alive.length > 0 ? alive : playersOrPos;
        let minX = 99;
        let maxX = -99;
        for (const p of list) {
          fx += p.x;
          fy += (p.baseY || 0) + p.y;
          fz += p.z;
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
        }
        fx /= list.length;
        fy /= list.length;
        fz /= list.length;
        spreadExtra = Math.max(0, (maxX - minX) * 0.65);

        // Zoom automático em quem está sofrendo (1 vida/invuln recente) ou brilhando (fúria/habilidade/combo alto)
        const spotlight = list.find((pl) => pl.invulnTimer > 0.6 || pl.furyTimer > 0 || (pl.combo || 0) >= 8);
        if (spotlight && list.length > 1) {
          fx = fx * 0.45 + spotlight.x * 0.55;
          fz = fz * 0.45 + spotlight.z * 0.55;
          highlightZoom = -0.95;
        }
      }
    } else if (playersOrPos) {
      fx = playersOrPos.x || 0;
      fy = playersOrPos.y || 0;
      fz = playersOrPos.z || 0;
    }

    const aspect = this.camera.aspect || 1;
    const isPortrait = aspect > 0 && aspect < 0.85;
    const portraitDist = isPortrait ? Math.min(2.9, (0.85 - aspect) * 6.4) : 0;

    if (this.predatorFocusPos) {
      const px = this.predatorFocusPos.x || 0;
      const py = this.predatorFocusPos.y || 0;
      const pz = this.predatorFocusPos.z || 8.2;
      const sway = Math.sin(this.cinematicTime * 1.15) * (isPortrait ? 1.25 : 2.1);
      this.targetPos.set(px + sway - (isPortrait ? 0.9 : 1.6), py + 3.2 + portraitDist * 0.25, pz - (isPortrait ? 8.3 : 6.8));
      this.targetLook.set(px, py + 1.85, pz + 0.5);
    } else if (spectatorMode) {
      this.spectatorOrbitAngle += dt * 0.55;
      const r = 10.5 + portraitDist;
      this.targetPos.set(fx + Math.sin(this.spectatorOrbitAngle) * r, 5.2 + fy * 0.4, fz + Math.cos(this.spectatorOrbitAngle) * r);
      this.targetLook.set(fx, 1.3 + fy, fz - 4.0);
    } else if (photoMode) {
      this.photoOrbitAngle += dt * 0.4;
      const r = 8.5 + portraitDist * 0.6;
      this.targetPos.set(fx + Math.sin(this.photoOrbitAngle) * r, 3.6 + fy, fz + Math.cos(this.photoOrbitAngle) * r);
      this.targetLook.set(fx, 1.3 + fy, fz - 1.5);
    } else {
      switch (this.currentMode.id) {
        case 'third':
          // Leve deslocamento à esquerda no desktop; no celular retrato centraliza e recua para mostrar as 3 faixas e predador atrás
          this.targetPos.set(fx * (isPortrait ? 0.52 : 0.6) - (isPortrait ? 0.35 : 0.8), 5.05 + fy * 0.35 + spreadExtra * 0.4 + portraitDist * 0.36, fz + 9.4 + spreadExtra + highlightZoom + portraitDist);
          this.targetLook.set(fx * (isPortrait ? 0.4 : 0.45) + (isPortrait ? 0.45 : 1.1), 1.35 + fy * 0.25, fz - 11.5);
          break;
        case 'side':
          this.targetPos.set(fx - 13.0, 3.4 + fy * 0.25, fz - 2.5);
          this.targetLook.set(fx + 1.5, 1.4, fz - 6.0);
          break;
        case 'iso':
          this.targetPos.set(fx - 8.8, 8.6 + fy * 0.25, fz + 7.8);
          this.targetLook.set(fx + 0.8, 1.1, fz - 7.5);
          break;
        case 'top':
          this.targetPos.set(fx * 0.5 + 1.2, 17.0, fz + 3.0);
          this.targetLook.set(fx * 0.4 + 1.0, 0.5, fz - 9.5);
          break;
        case 'first':
          // Posicionada logo à frente do focinho para evitar colisão interna com a cabeça do dino
          this.targetPos.set(fx, 1.85 + fy * 0.9, fz - 1.75);
          this.targetLook.set(fx, 1.35 + fy * 0.5, fz - 22);
          break;
        case 'cinematic': {
          const orbit = Math.sin(this.cinematicTime * 0.65) * 4.4;
          this.targetPos.set(fx * 0.5 + orbit, 4.4 + Math.cos(this.cinematicTime * 0.5) * 1.1, fz + 8.5);
          this.targetLook.set(fx * 0.5 + 0.6, 1.4 + fy * 0.3, fz - 10.5);
          break;
        }
        default:
          break;
      }
    }

    const lerpFactor = Math.min(1, dt * 8.5);
    this.currentPos.lerp(this.targetPos, lerpFactor);
    this.currentLook.lerp(this.targetLook, lerpFactor);
    this.camera.position.copy(this.currentPos);

    if (this.shakeTimer > 0 && !reduceShake) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const amp = this.shakeIntensity * Math.min(1, this.shakeTimer / 0.25);
      this.camera.position.x += (Math.random() - 0.5) * amp;
      this.camera.position.y += (Math.random() - 0.5) * amp;
    } else if (this.shakeTimer <= 0) {
      this.shakeIntensity = 0;
    }

    this.camera.lookAt(this.currentLook);

    const speedExtra = Math.min(11, Math.max(0, (speed - 18) * 0.32));
    const portraitExtraFov = isPortrait ? Math.min(16, (0.85 - aspect) * 30) : 0;
    const maxFov = isPortrait ? 85 : 79;
    const targetFov = Math.min(maxFov, this.baseFov + portraitExtraFov + speedExtra);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }
  }
}
