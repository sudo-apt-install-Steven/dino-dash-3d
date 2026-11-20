// Núcleo compartilhado dos modos 3D livres (Arena X1, Boss Arena, Masmorra RPG, Aventura Aberta).
// Fornece: movimento 360° no plano XZ (pulo/gravidade, esquiva com i-frames, colisão com pilares e
// limites), teclado P1/P2 com detecção de borda própria, câmera orbital em 3ª pessoa, controles
// touch (joystick virtual + botões), textos flutuantes projetados, e a classe base Mode3DBase que
// garante montagem/desmontagem sem resíduos (cena, câmera, DOM, listeners, GPU).
import * as THREE from 'three';
import '../styles/modes3d.css';
import { DinoFactory } from '../dinos/DinoFactory.js';
import { DinoAnimator } from '../dinos/DinoAnimator.js';
import { Save } from '../systems/Save.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function angleDelta(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Yaw de um modelo voxel (frente nativa = -Z) para olhar na direção (dx, dz). */
export function yawFromDir(dx, dz) {
  return Math.atan2(-dx, -dz);
}

/** PRNG determinístico (mulberry32). */
export function makeRng(seed = 1) {
  let a = (typeof seed === 'number' ? seed : hashString(String(seed))) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  } catch { /* ignore */ }
  return 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
}

export function isLowSpec(game) {
  return !!(Save?.data?.lowSpecMode || game?.lowLod);
}

/**
 * Libera recursos GPU de uma hierarquia. `geometry:false` preserva geometrias compartilhadas
 * (ex.: SHARED_BOX do DinoFactory/BossModels). Texturas de materiais são liberadas junto.
 */
export function disposeObject3D(root, { geometry = true, material = true } = {}) {
  if (!root) return;
  root.parent?.remove(root);
  const seenMat = new Set();
  root.traverse((o) => {
    if (geometry && o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.();
    if (material && o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m || seenMat.has(m) || m.userData?.shared) continue;
        seenMat.add(m);
        for (const k of ['map', 'emissiveMap', 'alphaMap', 'normalMap']) m[k]?.dispose?.();
        m.dispose?.();
      }
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Teclado
// ---------------------------------------------------------------------------------------------

export const P1_BINDINGS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], dodge: ['ShiftLeft', 'KeyC'], light: ['KeyQ'], heavy: ['KeyE'], special: ['KeyF'],
  interact: ['KeyE'], block: ['ShiftLeft', 'KeyC'], dash: ['Space']
};

/** P1 quando há P2 local no mesmo teclado: setas ficam com o P2. */
export const P1_SPLIT_BINDINGS = {
  ...P1_BINDINGS,
  up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD']
};

export const P2_BINDINGS = {
  up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
  jump: ['Numpad0'], dodge: ['ShiftRight', 'Period'], light: ['Enter', 'NumpadEnter'], heavy: ['ControlRight'],
  special: ['Slash', 'NumpadDivide'], interact: ['ControlRight'], block: ['ShiftRight', 'Numpad1'], dash: ['Period', 'Numpad0']
};

const PREVENT_CODES = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Quote']);

/** Estado de teclado próprio do modo (independente do InputSystem do runner) com bordas confiáveis. */
export class KeyState {
  constructor() {
    this.down = new Set();
    this.tapped = new Set();
    this.released = new Set();
    this.enabled = true;
    this._onDown = (e) => {
      if (this._isTyping(e)) return;
      if (PREVENT_CODES.has(e.code)) e.preventDefault();
      if (!this.enabled) return;
      if (!this.down.has(e.code)) this.tapped.add(e.code);
      this.down.add(e.code);
    };
    this._onUp = (e) => {
      if (this.down.has(e.code)) this.released.add(e.code);
      this.down.delete(e.code);
    };
    this._onBlur = () => this.down.clear();
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onDown);
      window.addEventListener('keyup', this._onUp);
      window.addEventListener('blur', this._onBlur);
    }
  }
  _isTyping(e) {
    const t = e.target;
    const tag = t?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!t?.isContentEditable;
  }
  isDown(codes) {
    if (!codes) return false;
    for (const c of codes) if (this.down.has(c)) return true;
    return false;
  }
  pressed(codes) {
    if (!codes) return false;
    for (const c of codes) if (this.tapped.has(c)) return true;
    return false;
  }
  /** Chamar ao final de cada update do modo. */
  endFrame() {
    this.tapped.clear();
    this.released.clear();
  }
  clear() {
    this.down.clear();
    this.endFrame();
  }
  dispose() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup', this._onUp);
    window.removeEventListener('blur', this._onBlur);
    this.clear();
  }
}

/**
 * Leitor de controles de um jogador: mistura teclado (bindings) + touch (apenas P1).
 * `move()` devolve {x, y} normalizado (y=+1 = frente da câmera).
 */
export class PlayerControls {
  constructor(keys, bindings, touch = null) {
    this.keys = keys;
    this.bindings = bindings;
    this.touch = touch;
    this._mv = { x: 0, y: 0 };
  }
  move() {
    const b = this.bindings;
    let x = (this.keys.isDown(b.right) ? 1 : 0) - (this.keys.isDown(b.left) ? 1 : 0);
    let y = (this.keys.isDown(b.up) ? 1 : 0) - (this.keys.isDown(b.down) ? 1 : 0);
    if (this.touch?.active) {
      x += this.touch.stick.x;
      y += this.touch.stick.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this._mv.x = x;
    this._mv.y = y;
    return this._mv;
  }
  held(action) {
    return this.keys.isDown(this.bindings[action]) || !!this.touch?.isHeld(action);
  }
  pressed(action) {
    return this.keys.pressed(this.bindings[action]) || !!this.touch?.wasPressed(action);
  }
}

// ---------------------------------------------------------------------------------------------
// Movimento livre 360°
// ---------------------------------------------------------------------------------------------

export class FreeMover {
  constructor(opts = {}) {
    this.pos = new THREE.Vector3(opts.x || 0, 0, opts.z || 0);
    this.vel = new THREE.Vector2(0, 0);
    this.kb = new THREE.Vector2(0, 0);
    this.vy = 0;
    this.grounded = true;
    this.yaw = opts.yaw || 0;
    this.radius = opts.radius ?? 0.65;
    this.speed = opts.speed ?? 7.2;
    this.accel = opts.accel ?? 38;
    this.friction = opts.friction ?? 14;
    this.jumpVel = opts.jumpVel ?? 9.5;
    this.gravity = opts.gravity ?? 27;
    this.dashSpeed = opts.dashSpeed ?? 19;
    this.dashTime = opts.dashTime ?? 0.18;
    this.dashCooldownMax = opts.dashCooldown ?? 0.55;
    this.iframeTime = opts.iframeTime ?? 0.3;
    this.turnRate = opts.turnRate ?? 14;
    this.dashTimer = 0;
    this.dashCd = 0;
    this.iframes = 0;
    this.dashDir = new THREE.Vector2(0, -1);
    this.justLanded = false;
    this.moving = false;
  }

  get invulnerable() { return this.iframes > 0; }
  get dashing() { return this.dashTimer > 0; }
  get planarSpeed() { return Math.hypot(this.vel.x, this.vel.y); }

  /** Forward unitário em XZ derivado do yaw (frente nativa -Z). */
  forward(out = new THREE.Vector2()) {
    return out.set(-Math.sin(this.yaw), -Math.cos(this.yaw));
  }

  jump(mult = 1) {
    if (!this.grounded) return false;
    this.vy = this.jumpVel * mult;
    this.grounded = false;
    return true;
  }

  dodge(dx = 0, dz = 0) {
    if (this.dashCd > 0) return false;
    let len = Math.hypot(dx, dz);
    if (len < 0.01) { const f = this.forward(); dx = f.x; dz = f.y; len = 1; }
    this.dashDir.set(dx / len, dz / len);
    this.dashTimer = this.dashTime;
    this.dashCd = this.dashCooldownMax;
    this.iframes = Math.max(this.iframes, this.iframeTime);
    return true;
  }

  applyImpulse(ix, iz, up = 0) {
    this.kb.x += ix;
    this.kb.y += iz;
    if (up > 0) { this.vy = Math.max(this.vy, up); this.grounded = false; }
  }

  faceTowards(x, z, dt, rate = this.turnRate) {
    const dx = x - this.pos.x;
    const dz = z - this.pos.z;
    if (dx * dx + dz * dz < 1e-4) return;
    const target = yawFromDir(dx, dz);
    this.yaw += angleDelta(this.yaw, target) * (1 - Math.exp(-rate * dt));
  }

  /**
   * Integra um passo. (mx, mz) é a direção desejada em mundo (já relativa à câmera), magnitude 0..1.
   * opts: speedMult, lockYaw (não gira para o movimento), rooted (sem movimento voluntário).
   */
  step(dt, mx, mz, opts = {}) {
    const speedMult = opts.speedMult ?? 1;
    this.justLanded = false;
    if (this.dashCd > 0) this.dashCd = Math.max(0, this.dashCd - dt);
    if (this.iframes > 0) this.iframes = Math.max(0, this.iframes - dt);

    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      this.vel.set(this.dashDir.x * this.dashSpeed, this.dashDir.y * this.dashSpeed);
    } else {
      const inLen = opts.rooted ? 0 : Math.min(1, Math.hypot(mx, mz));
      const tx = inLen > 0.01 ? (mx / Math.max(inLen, 1e-6)) * inLen * this.speed * speedMult : 0;
      const tz = inLen > 0.01 ? (mz / Math.max(inLen, 1e-6)) * inLen * this.speed * speedMult : 0;
      const rate = inLen > 0.01 ? this.accel : this.friction;
      const k = 1 - Math.exp(-rate * dt * 0.25);
      this.vel.x = lerp(this.vel.x, tx, k);
      this.vel.y = lerp(this.vel.y, tz, k);
      this.moving = inLen > 0.05;
      if (this.moving && !opts.lockYaw) {
        const target = yawFromDir(mx, mz);
        this.yaw += angleDelta(this.yaw, target) * (1 - Math.exp(-this.turnRate * dt));
      }
    }

    // Knockback decai exponencialmente
    this.pos.x += (this.vel.x + this.kb.x) * dt;
    this.pos.z += (this.vel.y + this.kb.y) * dt;
    const kbDecay = Math.exp(-7 * dt);
    this.kb.x *= kbDecay;
    this.kb.y *= kbDecay;

    if (!this.grounded || this.vy > 0) {
      this.vy -= this.gravity * dt;
      this.pos.y += this.vy * dt;
      const floor = opts.groundY ?? 0;
      if (this.pos.y <= floor) {
        this.pos.y = floor;
        if (!this.grounded) this.justLanded = true;
        this.vy = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    } else {
      this.pos.y = opts.groundY ?? 0;
    }
  }

  /** Limites do cômodo/arena: {minX,maxX,minZ,maxZ} retangular ou {r,cx,cz} circular. */
  clampToBounds(b) {
    if (!b) return;
    const r = this.radius;
    if (b.r !== undefined) {
      const cx = b.cx || 0;
      const cz = b.cz || 0;
      const dx = this.pos.x - cx;
      const dz = this.pos.z - cz;
      const d = Math.hypot(dx, dz);
      const lim = b.r - r;
      if (d > lim && d > 1e-6) {
        this.pos.x = cx + (dx / d) * lim;
        this.pos.z = cz + (dz / d) * lim;
        this._cancelVelAlong(dx / d, dz / d);
      }
      return;
    }
    if (this.pos.x < b.minX + r) { this.pos.x = b.minX + r; if (this.vel.x < 0) this.vel.x = 0; this.kb.x = Math.abs(this.kb.x) * 0.3; }
    if (this.pos.x > b.maxX - r) { this.pos.x = b.maxX - r; if (this.vel.x > 0) this.vel.x = 0; this.kb.x = -Math.abs(this.kb.x) * 0.3; }
    if (this.pos.z < b.minZ + r) { this.pos.z = b.minZ + r; if (this.vel.y < 0) this.vel.y = 0; this.kb.y = Math.abs(this.kb.y) * 0.3; }
    if (this.pos.z > b.maxZ - r) { this.pos.z = b.maxZ - r; if (this.vel.y > 0) this.vel.y = 0; this.kb.y = -Math.abs(this.kb.y) * 0.3; }
  }

  /** Colisão círculo × pilares cilíndricos [{x,z,r, active?}]. Devolve o pilar atingido (ou null). */
  pushOutCircles(list) {
    let hit = null;
    if (!list) return hit;
    for (const c of list) {
      if (!c || c.active === false) continue;
      const dx = this.pos.x - c.x;
      const dz = this.pos.z - c.z;
      const min = (c.r ?? 0.8) + this.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 1e-4;
        const nx = dx / d;
        const nz = dz / d;
        this.pos.x = c.x + nx * min;
        this.pos.z = c.z + nz * min;
        this._cancelVelAlong(-nx, -nz);
        hit = c;
      }
    }
    return hit;
  }

  /** Colisão círculo × AABBs [{x,z,w,d}] (centro + dimensões). */
  pushOutRects(list) {
    if (!list) return;
    for (const b of list) {
      if (!b || b.active === false) continue;
      const hw = (b.w || 1) / 2;
      const hd = (b.d || 1) / 2;
      const cx = clamp(this.pos.x, b.x - hw, b.x + hw);
      const cz = clamp(this.pos.z, b.z - hd, b.z + hd);
      const dx = this.pos.x - cx;
      const dz = this.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < this.radius * this.radius) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          this.pos.x = cx + (dx / d) * this.radius;
          this.pos.z = cz + (dz / d) * this.radius;
        } else {
          // centro dentro da caixa: empurra pelo menor eixo
          const ox = hw - Math.abs(this.pos.x - b.x);
          const oz = hd - Math.abs(this.pos.z - b.z);
          if (ox < oz) this.pos.x = b.x + Math.sign(this.pos.x - b.x || 1) * (hw + this.radius);
          else this.pos.z = b.z + Math.sign(this.pos.z - b.z || 1) * (hd + this.radius);
        }
      }
    }
  }

  _cancelVelAlong(nx, nz) {
    const v = this.vel.x * nx + this.vel.y * nz;
    if (v > 0) { this.vel.x -= v * nx; this.vel.y -= v * nz; }
    const k = this.kb.x * nx + this.kb.y * nz;
    if (k > 0) { this.kb.x -= k * nx * 1.4; this.kb.y -= k * nz * 1.4; }
  }
}

/** Separa duas entidades circulares (empurrão mútuo). */
export function separateMovers(a, b) {
  const dx = b.pos.x - a.pos.x;
  const dz = b.pos.z - a.pos.z;
  const min = a.radius + b.radius;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return false;
  const d = Math.sqrt(d2) || 1e-4;
  const push = (min - d) / 2;
  const nx = dx / d;
  const nz = dz / d;
  a.pos.x -= nx * push; a.pos.z -= nz * push;
  b.pos.x += nx * push; b.pos.z += nz * push;
  return true;
}

// ---------------------------------------------------------------------------------------------
// Câmera orbital
// ---------------------------------------------------------------------------------------------

export class OrbitCameraRig {
  constructor(camera, domTarget, opts = {}) {
    this.camera = camera;
    this.dom = domTarget;
    this.yaw = opts.yaw ?? 0;
    this.pitch = opts.pitch ?? 0.52;
    this.distance = opts.distance ?? 9;
    this.minDistance = opts.minDistance ?? 4.5;
    this.maxDistance = opts.maxDistance ?? 22;
    this.height = opts.height ?? 1.3;
    this.minPitch = opts.minPitch ?? 0.12;
    this.maxPitch = opts.maxPitch ?? 1.25;
    this.smooth = opts.smooth ?? 8;
    this.autoFollow = opts.autoFollow ?? false;
    this.target = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._shake = 0;
    this._initialized = false;
    this._drag = null;
    this._listeners = [];
    if (domTarget && typeof window !== 'undefined') this._bindPointer();
  }

  _on(el, type, fn, o) {
    el.addEventListener(type, fn, o);
    this._listeners.push(() => el.removeEventListener(type, fn, o));
  }

  _bindPointer() {
    const el = this.dom;
    this._on(el, 'pointerdown', (e) => {
      if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45) return; // metade esquerda = joystick
      this._drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    this._on(window, 'pointermove', (e) => {
      if (!this._drag || this._drag.id !== e.pointerId) return;
      const dx = e.clientX - this._drag.x;
      const dy = e.clientY - this._drag.y;
      this._drag.x = e.clientX;
      this._drag.y = e.clientY;
      this.yaw -= dx * 0.0065;
      this.pitch = clamp(this.pitch + dy * 0.0045, this.minPitch, this.maxPitch);
    });
    const end = (e) => { if (this._drag?.id === e.pointerId) this._drag = null; };
    this._on(window, 'pointerup', end);
    this._on(window, 'pointercancel', end);
    this._on(el, 'wheel', (e) => {
      e.preventDefault();
      this.distance = clamp(this.distance * (1 + Math.sign(e.deltaY) * 0.08), this.minDistance, this.maxDistance);
    }, { passive: false });
  }

  shake(amount = 0.3) { this._shake = Math.max(this._shake, amount); }

  /** Converte input (x=direita, y=frente) para direção em mundo relativa à câmera. */
  toWorld(ix, iy, out = { x: 0, z: 0 }) {
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    out.x = ix * c - iy * s;
    out.z = -ix * s - iy * c;
    return out;
  }

  snap(targetPos) {
    this.target.copy(targetPos);
    this._initialized = false;
    this.update(1, targetPos);
  }

  update(dt, targetPos, extraDistance = 0, followYaw = null) {
    if (followYaw !== null && this.autoFollow && !this._drag) {
      this.yaw += angleDelta(this.yaw, followYaw) * (1 - Math.exp(-1.6 * dt));
    }
    const k = this._initialized ? 1 - Math.exp(-this.smooth * dt) : 1;
    this.target.lerp(targetPos, k);
    const dist = this.distance + extraDistance;
    const cp = Math.cos(this.pitch);
    this._desired.set(
      this.target.x + Math.sin(this.yaw) * cp * dist,
      this.target.y + this.height + Math.sin(this.pitch) * dist,
      this.target.z + Math.cos(this.yaw) * cp * dist
    );
    if (!this._initialized) {
      this.camera.position.copy(this._desired);
      this._initialized = true;
    } else {
      this.camera.position.lerp(this._desired, k);
    }
    if (this._shake > 0) {
      const s = this._shake;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this._shake = Math.max(0, this._shake - dt * 2.2);
    }
    this._lookAt.set(this.target.x, this.target.y + this.height * 0.7, this.target.z);
    this.camera.lookAt(this._lookAt);
  }

  dispose() {
    for (const off of this._listeners) off();
    this._listeners.length = 0;
    this._drag = null;
  }
}

// ---------------------------------------------------------------------------------------------
// Controles touch
// ---------------------------------------------------------------------------------------------

export const DEFAULT_TOUCH_ACTIONS = [
  { action: 'light', label: 'Q', title: 'Ataque' },
  { action: 'heavy', label: 'E', title: 'Forte' },
  { action: 'jump', label: '⤒', title: 'Pular' },
  { action: 'dodge', label: '⇆', title: 'Esquiva' },
  { action: 'special', label: 'F', title: 'Especial' }
];

export class TouchControls {
  constructor(parent, actions = DEFAULT_TOUCH_ACTIONS, opts = {}) {
    this.active = opts.force ?? isTouchDevice();
    this.stick = { x: 0, y: 0 };
    this._held = new Set();
    this._pressed = new Set();
    this._stickId = null;
    this._origin = { x: 0, y: 0 };
    this._listeners = [];
    this.root = document.createElement('div');
    this.root.className = `m3d-touch${this.active ? ' is-active' : ''}`;
    this.root.innerHTML = `
      <div class="m3d-stick" data-tact="stick"><div class="m3d-stick-knob"></div></div>
      <div class="m3d-touch-btns">${actions.map((a) => `<button type="button" class="m3d-tbtn m3d-tbtn-${escapeHtml(a.action)}" data-action="${escapeHtml(a.action)}" aria-label="${escapeHtml(a.title || a.action)}">${escapeHtml(a.label)}</button>`).join('')}</div>`;
    parent.appendChild(this.root);
    this.stickEl = this.root.querySelector('.m3d-stick');
    this.knobEl = this.root.querySelector('.m3d-stick-knob');
    this._bind();
  }

  _on(el, type, fn, o) {
    el.addEventListener(type, fn, o);
    this._listeners.push(() => el.removeEventListener(type, fn, o));
  }

  _bind() {
    const radius = 46;
    this._on(this.stickEl, 'pointerdown', (e) => {
      e.preventDefault();
      this.active = true;
      this.root.classList.add('is-active');
      this._stickId = e.pointerId;
      const r = this.stickEl.getBoundingClientRect();
      this._origin.x = r.left + r.width / 2;
      this._origin.y = r.top + r.height / 2;
      this.stickEl.setPointerCapture?.(e.pointerId);
      this._moveStick(e, radius);
    });
    this._on(this.stickEl, 'pointermove', (e) => { if (e.pointerId === this._stickId) this._moveStick(e, radius); });
    const release = (e) => {
      if (e.pointerId !== this._stickId) return;
      this._stickId = null;
      this.stick.x = 0;
      this.stick.y = 0;
      this.knobEl.style.transform = 'translate3d(0,0,0)';
    };
    this._on(this.stickEl, 'pointerup', release);
    this._on(this.stickEl, 'pointercancel', release);

    for (const btn of this.root.querySelectorAll('.m3d-tbtn')) {
      const action = btn.dataset.action;
      this._on(btn, 'pointerdown', (e) => {
        e.preventDefault();
        this._held.add(action);
        this._pressed.add(action);
        btn.classList.add('is-down');
      });
      const up = () => { this._held.delete(action); btn.classList.remove('is-down'); };
      this._on(btn, 'pointerup', up);
      this._on(btn, 'pointercancel', up);
      this._on(btn, 'pointerleave', up);
    }
  }

  _moveStick(e, radius) {
    let dx = e.clientX - this._origin.x;
    let dy = e.clientY - this._origin.y;
    const d = Math.hypot(dx, dy);
    if (d > radius) { dx = (dx / d) * radius; dy = (dy / d) * radius; }
    this.knobEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    const nx = dx / radius;
    const ny = dy / radius;
    const mag = Math.hypot(nx, ny);
    const dead = 0.14;
    if (mag < dead) { this.stick.x = 0; this.stick.y = 0; return; }
    const scale = (mag - dead) / (1 - dead) / mag;
    this.stick.x = nx * scale;
    this.stick.y = -ny * scale;
  }

  isHeld(action) { return this._held.has(action); }
  wasPressed(action) { return this._pressed.has(action); }
  endFrame() { this._pressed.clear(); }
  setVisible(v) { this.root.style.display = v ? '' : 'none'; }

  dispose() {
    for (const off of this._listeners) off();
    this._listeners.length = 0;
    this.root.remove();
  }
}

// ---------------------------------------------------------------------------------------------
// Textos flutuantes projetados (dano, cura, loot)
// ---------------------------------------------------------------------------------------------

export class FloatTextLayer {
  constructor(parent, camera) {
    this.camera = camera;
    this.root = document.createElement('div');
    this.root.className = 'm3d-floaters';
    parent.appendChild(this.root);
    this.items = [];
    this._v = new THREE.Vector3();
  }
  spawn(pos, text, cls = '') {
    if (this.items.length > 24) this._kill(this.items.shift());
    const el = document.createElement('div');
    el.className = `m3d-float ${cls}`;
    el.textContent = text;
    this.root.appendChild(el);
    this.items.push({ el, x: pos.x, y: pos.y + 2.2, z: pos.z, t: 0, life: 0.9 });
  }
  update(dt, w, h) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.t >= it.life) { this._kill(it); this.items.splice(i, 1); continue; }
      this._v.set(it.x, it.y + it.t * 1.6, it.z).project(this.camera);
      if (this._v.z > 1) { it.el.style.opacity = '0'; continue; }
      const sx = (this._v.x * 0.5 + 0.5) * w;
      const sy = (-this._v.y * 0.5 + 0.5) * h;
      it.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      it.el.style.opacity = String(1 - Math.max(0, (it.t - it.life * 0.55) / (it.life * 0.45)));
    }
  }
  _kill(it) { it?.el?.remove(); }
  dispose() {
    for (const it of this.items) this._kill(it);
    this.items.length = 0;
    this.root.remove();
  }
}

// ---------------------------------------------------------------------------------------------
// Avatar de dinossauro jogável
// ---------------------------------------------------------------------------------------------

export function resolveDinoId(game, opts = {}, slot = 0) {
  if (slot === 0) return opts.dinoId || game?.players?.[0]?.id || Save?.data?.selectedDino || 'trex';
  return opts.p2DinoId || game?.players?.[1]?.id || 'raptor';
}

export class DinoAvatar {
  constructor(dinoId = 'trex', opts = {}) {
    this.dinoId = dinoId;
    this.mover = new FreeMover(opts.mover || {});
    this.scale = opts.scale ?? 1;
    this.model = null;
    this.animator = null;
    try {
      this.model = DinoFactory.build(dinoId, opts.customConfig || null, { skinVariant: opts.skinVariant });
      this.animator = new DinoAnimator(this.model);
      this.root = this.model.root;
    } catch (err) {
      // Fallback seguro: bloco voxel simples (nunca quebra o modo por um id desconhecido)
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 1.6), new THREE.MeshStandardMaterial({ color: opts.color || '#22c55e' }));
      mesh.position.y = 0.6;
      g.add(mesh);
      this.root = g;
      this._fallback = true;
    }
    this.root.scale.multiplyScalar(this.scale);
    if (opts.tint) this._applyTint(opts.tint);
    this.attacking = 0;
    this.attackType = null;
    this.hurtFlash = 0;
    this.dead = false;
    this.victory = false;
  }

  _applyTint(hex) {
    // Anel colorido no chão identifica P1/P2/IA sem alterar materiais compartilhados
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.95, 28),
      new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.renderOrder = 2;
    this.ring = ring;
    this.root.add(ring);
  }

  attack(type = null, dur = 0.34) {
    this.attacking = dur;
    this.attackType = type;
    this.animator?.triggerAttack(type, dur);
  }
  hurt() {
    this.hurtFlash = 0.35;
    this.animator?.triggerHurt(0.45);
  }
  roar() { this.animator?.triggerRoar(0.5); }

  sync(dt) {
    const m = this.mover;
    if (this.attacking > 0) this.attacking = Math.max(0, this.attacking - dt);
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.root.position.copy(m.pos);
    if (this.ring) this.ring.position.y = 0.03 - m.pos.y / Math.max(0.001, this.root.scale.y);
    this.root.rotation.y = m.yaw;
    if (m.justLanded) this.animator?.triggerLandSquash();
    if (this.animator) {
      try {
        this.animator.update(dt, {
          speed: 6 + m.planarSpeed * 2.4,
          grounded: m.grounded,
          vy: m.vy,
          sliding: m.dashing,
          dead: this.dead,
          victory: this.victory,
          hurt: this.hurtFlash > 0,
          attacking: this.attacking > 0,
          attackType: this.attackType,
          invulnActive: m.invulnerable && !m.dashing
        });
      } catch { /* animador tolerante */ }
      // Parado: congela fase de corrida para não "correr no lugar"
      if (!m.moving && m.grounded && !m.dashing) this.animator.runPhase *= 0.85;
    }
  }

  dispose() {
    disposeObject3D(this.root, { geometry: false });
    if (this.ring) disposeObject3D(this.ring);
  }
}

// ---------------------------------------------------------------------------------------------
// Utilidades de malha
// ---------------------------------------------------------------------------------------------

/** Anel de perigo no chão (telegraph AoE). Use `setProgress(0..1)`. */
export function makeDangerRing(radius = 3, color = '#ef4444') {
  const group = new THREE.Group();
  const fillMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const edgeMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 40), fillMat);
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48), edgeMat);
  const grow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
  for (const m of [fill, edge, grow]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 3; group.add(m); }
  fill.position.y = 0.04; grow.position.y = 0.05; edge.position.y = 0.06;
  group.scale.setScalar(radius);
  group.userData.radius = radius;
  group.setProgress = (p) => {
    const s = clamp(p, 0.001, 1);
    grow.scale.setScalar(s);
    edgeMat.opacity = 0.55 + 0.45 * Math.abs(Math.sin(p * 18));
  };
  group.setRadius = (r) => { group.scale.setScalar(r); group.userData.radius = r; };
  return group;
}

export function makeGlowOrb(color = '#f59e0b', radius = 0.35) {
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.3 });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), mat);
  return mesh;
}

/** Luzes padrão de um modo; devolve o grupo com as luzes. */
export function buildModeLights({ sky = '#bfdbfe', ground = '#3f2d1d', sun = '#fff1d6', intensity = 1, shadows = false } = {}) {
  const g = new THREE.Group();
  const hemi = new THREE.HemisphereLight(sky, ground, 0.85 * intensity);
  const dir = new THREE.DirectionalLight(sun, 1.35 * intensity);
  dir.position.set(14, 22, 10);
  dir.castShadow = !!shadows;
  if (shadows) {
    dir.shadow.mapSize.set(1024, 1024);
    const c = dir.shadow.camera;
    c.left = -24; c.right = 24; c.top = 24; c.bottom = -24; c.near = 1; c.far = 70;
  }
  const amb = new THREE.AmbientLight('#ffffff', 0.18 * intensity);
  g.add(hemi, dir, dir.target, amb);
  g.userData.sun = dir;
  return g;
}

// ---------------------------------------------------------------------------------------------
// Classe base dos modos
// ---------------------------------------------------------------------------------------------

export class Mode3DBase {
  constructor(game, opts = {}) {
    this.game = game;
    this.opts = opts;
    this.modeId = opts.modeId || 'mode3d';
    this.group = new THREE.Group();
    this.group.name = `mode3d_${this.modeId}`;
    this.mounted = false;
    this.disposed = false;
    this.elapsed = 0;
    this.hitStop = 0;
    this.lowSpec = isLowSpec(game);
    this._offs = [];
    this._timers = new Set();
    this._ownedObjects = [];
    this._hiddenChildren = [];
    this._savedScene = null;
    this._savedCamera = null;
    this.overlay = null;
    this.keys = null;
    this.touch = null;
    this.rig = null;
    this.floaters = null;
  }

  get camera() { return this.game.camera; }
  get scene() { return this.game.scene; }
  get viewportW() { return this.game.renderer?.domElement?.clientWidth || window.innerWidth || 1; }
  get viewportH() { return this.game.renderer?.domElement?.clientHeight || window.innerHeight || 1; }

  isPaused() {
    return this.game.state === 'paused' || !!this._localPause;
  }

  /** Esconde a cena do runner, aplica fundo/neblina do modo e adiciona `this.group`. */
  mountBase({ background = '#0b0f19', fog = null, clearColor = null, touchActions = DEFAULT_TOUCH_ACTIONS, cameraOpts = {} } = {}) {
    const scene = this.scene;
    this._hiddenChildren = [];
    for (const child of scene.children) {
      if (child.visible) { this._hiddenChildren.push(child); child.visible = false; }
    }
    this._savedScene = { background: scene.background, fog: scene.fog };
    const r = this.game.renderer;
    if (r) {
      const c = new THREE.Color();
      r.getClearColor?.(c);
      this._savedClear = { color: c, alpha: r.getClearAlpha?.() ?? 1 };
      if (clearColor) r.setClearColor(clearColor, 1);
    }
    scene.background = background ? new THREE.Color(background) : null;
    scene.fog = fog ? new THREE.Fog(fog.color, fog.near, fog.far) : null;
    scene.add(this.group);

    const cam = this.camera;
    this._savedCamera = {
      pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov, near: cam.near, far: cam.far
    };
    cam.fov = cameraOpts.fov ?? 60;
    cam.near = 0.1;
    cam.far = cameraOpts.far ?? (this.lowSpec ? 120 : 220);
    cam.updateProjectionMatrix();

    this.overlay = document.createElement('div');
    this.overlay.id = 'mode3d-overlay';
    this.overlay.className = `m3d-root m3d-mode-${this.modeId}`;
    (this.game.uiRoot || document.body).appendChild(this.overlay);

    this.keys = new KeyState();
    this.touch = touchActions ? new TouchControls(this.overlay, touchActions) : null;
    this.rig = new OrbitCameraRig(cam, this.game.canvas || this.game.renderer?.domElement, cameraOpts);
    this.floaters = new FloatTextLayer(this.overlay, cam);

    this.listen(document, 'visibilitychange', () => { if (document.hidden) this.keys?.clear(); });
    this.mounted = true;
  }

  /** addEventListener rastreado (removido no dispose). */
  listen(target, type, fn, o) {
    if (!target) return;
    target.addEventListener(type, fn, o);
    this._offs.push(() => target.removeEventListener(type, fn, o));
  }

  later(fn, ms) {
    const id = setTimeout(() => { this._timers.delete(id); if (!this.disposed) fn(); }, ms);
    this._timers.add(id);
    return id;
  }

  /** Registra objeto 3D criado pelo modo (dispose profundo no fim). */
  own(obj, opts) {
    this._ownedObjects.push({ obj, opts });
    return obj;
  }

  toast(text, cls = '') {
    if (!this.overlay) return;
    const el = document.createElement('div');
    el.className = `m3d-toast ${cls}`;
    el.textContent = text;
    this.overlay.appendChild(el);
    this.later(() => el.remove(), 2200);
  }

  banner(text, sub = '', cls = '', ms = 1500) {
    if (!this.overlay) return;
    const el = document.createElement('div');
    el.className = `m3d-banner ${cls}`;
    el.innerHTML = `<div class="m3d-banner-main">${escapeHtml(text)}</div>${sub ? `<div class="m3d-banner-sub">${escapeHtml(sub)}</div>` : ''}`;
    this.overlay.appendChild(el);
    this.later(() => el.remove(), ms);
  }

  sfx(name, ...args) {
    try { this.game.sfx?.[name]?.(...args); } catch { /* áudio opcional */ }
  }

  /** Encerra o modo: delega ao integrador (opts.onExit / game.exitMode3D) ou volta ao menu. */
  requestExit(result = null) {
    if (this._exiting) return;
    this._exiting = true;
    if (typeof this.opts.onExit === 'function') { this.opts.onExit(result, this); return; }
    if (typeof this.game.exitMode3D === 'function') { this.game.exitMode3D(result, this); return; }
    this.dispose();
    this.game.openMainMenu?.();
  }

  /** Passo comum: hitstop, câmera, teclas. Retorna dt efetivo de simulação (0 durante hitstop). */
  baseTick(dt) {
    dt = Math.min(dt, 1 / 20);
    this.elapsed += dt;
    if (this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); return 0; }
    return dt;
  }

  baseEndFrame(dt) {
    this.floaters?.update(dt, this.viewportW, this.viewportH);
    this.keys?.endFrame();
    this.touch?.endFrame();
  }

  onResize(w, h) {
    const cam = this.camera;
    if (cam && w > 0 && h > 0) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    if (this.overlay) this.overlay.classList.toggle('is-portrait', h > w);
  }

  disposeBase() {
    if (this.disposed) return;
    this.disposed = true;
    this.mounted = false;
    for (const off of this._offs) { try { off(); } catch { /* noop */ } }
    this._offs.length = 0;
    for (const id of this._timers) clearTimeout(id);
    this._timers.clear();
    this.keys?.dispose();
    this.touch?.dispose();
    this.rig?.dispose();
    this.floaters?.dispose();
    for (const { obj, opts } of this._ownedObjects) {
      try {
        if (typeof obj?.dispose === 'function' && !obj.isObject3D) obj.dispose();
        else disposeObject3D(obj, opts);
      } catch { /* noop */ }
    }
    this._ownedObjects.length = 0;
    disposeObject3D(this.group);
    this.scene?.remove(this.group);
    for (const child of this._hiddenChildren) child.visible = true;
    this._hiddenChildren.length = 0;
    if (this._savedScene) {
      const bg = this.scene.background;
      if (bg && bg !== this._savedScene.background && bg.isTexture) bg.dispose?.();
      this.scene.background = this._savedScene.background;
      this.scene.fog = this._savedScene.fog;
    }
    if (this._savedClear && this.game.renderer) this.game.renderer.setClearColor(this._savedClear.color, this._savedClear.alpha);
    const cam = this.camera;
    if (this._savedCamera && cam) {
      cam.position.copy(this._savedCamera.pos);
      cam.quaternion.copy(this._savedCamera.quat);
      cam.fov = this._savedCamera.fov;
      cam.near = this._savedCamera.near;
      cam.far = this._savedCamera.far;
      cam.updateProjectionMatrix();
    }
    this.overlay?.remove();
    this.overlay = null;
  }

  dispose() { this.disposeBase(); }
}
