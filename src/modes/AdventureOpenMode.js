// Aventura Aberta 3D (`adventure_open`) — Exploração de Mundo Aberto com streaming dinâmico de chunks.
// Carrega/descarrega chunks procedurais ao redor do jogador (RAM/FPS leves em celulares low-spec),
// com ninhos de ovos, relíquias ocultas, patrulhas de dinos IA, portais de bioma, frutinhas de estamina
// e objetivos de exploração (3 Relíquias + Ativar Altar do Bioma + Derrotar o Guardião).
import * as THREE from 'three';
import {
  Mode3DBase,
  DinoAvatar,
  PlayerControls,
  P1_BINDINGS,
  buildModeLights,
  makeGlowOrb,
  makeRng,
  resolveDinoId,
  disposeObject3D,
  clamp,
  escapeHtml
} from './WorldExplorer3D.js';
import { buildDungeonEnemyModel } from '../models/DungeonProps.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { Save } from '../systems/Save.js';

const CHUNK_SIZE = 28;
const OPEN_BIOMES = [
  { id: 'emerald_valley', name: 'Vale Esmeralda', sky: '#0f221b', fog: '#142e25', ground: '#2d5a3c', accent: '#10b981', rock: '#4b5563' },
  { id: 'amber_dunes', name: 'Dunas de Âmbar', sky: '#24180d', fog: '#332211', ground: '#8c5d30', accent: '#f59e0b', rock: '#78350f' },
  { id: 'frost_basin', name: 'Bacia Glacial', sky: '#0d1b2a', fog: '#162c44', ground: '#5e84a3', accent: '#38bdf8', rock: '#334155' },
  { id: 'obsidian_ridge', name: 'Serra Obsidiana', sky: '#1a0e12', fog: '#2a1319', ground: '#3b2528', accent: '#ef4444', rock: '#1f2937' }
];

export class AdventureOpenMode extends Mode3DBase {
  constructor(game, opts = {}) {
    super(game, { ...opts, modeId: 'adventure_open' });
    this.biomeIdx = Math.max(0, OPEN_BIOMES.findIndex((b) => b.id === opts.biomeId));
    this.biome = OPEN_BIOMES[this.biomeIdx];
    this.seed = opts.seed || `adv-${Date.now()}`;
    this.viewRadius = this.lowSpec ? 1 : 2; // 3x3 em low-spec, 5x5 em normal

    this.chunks = new Map(); // "cx,cz" -> { group, pillars, pickups, patrols }
    this.collectedIds = new Set();
    this.player = null;
    this.altar = null;
    this.guardian = null;

    this.relicsFound = 0;
    this.relicsTarget = 3;
    this.altarActivated = false;
    this.guardianDefeated = false;
    this.eggsFound = 0;

    this._hud = {};
    this._lastChunkKey = '';
    this._tmpW = { x: 0, z: 0 };
  }

  async mount() {
    this.mountBase({
      background: this.biome.sky,
      fog: { color: this.biome.fog, near: 24, far: this.lowSpec ? 56 : 86 },
      clearColor: this.biome.sky,
      cameraOpts: { distance: 11, pitch: 0.48, height: 1.5, autoFollow: false, minDistance: 6, maxDistance: 20 }
    });

    this.group.add(buildModeLights({
      sky: '#e0f2fe', ground: this.biome.ground, sun: '#fff4d6', intensity: 1.05,
      shadows: !this.lowSpec && !!Save?.data?.settings?.shadows
    }));

    this._spawnPlayer();
    this._spawnBiomeAltar();
    this._buildHud();
    this._streamChunks(true);
    this.rig.snap(this.player.mover.pos);
    this.banner(this.biome.name, 'Encontre 3 Relíquias · Ative o Altar · Derrote o Guardião', 'is-emerald', 2100);
    this.onResize(this.viewportW, this.viewportH);
  }

  _spawnPlayer() {
    const dinoId = resolveDinoId(this.game, this.opts, 0);
    const spec = getDinoSpec(dinoId);
    const avatar = new DinoAvatar(dinoId, {
      mover: { x: 0, z: 4, yaw: 0, radius: 0.72, speed: 8.2 + (spec?.stats?.speed || 5) * 0.25, dashSpeed: 21, dashCooldown: 0.55 },
      tint: '#10b981'
    });
    this.group.add(avatar.root);
    const maxHp = 100 + (spec?.stats?.hp || 4) * 14;
    this.player = {
      name: spec?.name || dinoId,
      avatar,
      mover: avatar.mover,
      controls: new PlayerControls(this.keys, P1_BINDINGS, this.touch),
      maxHp,
      hp: maxHp,
      stamina: 100,
      atk: 16 + (spec?.stats?.attack || 5) * 2,
      atkCd: 0
    };
  }

  _spawnBiomeAltar() {
    if (this.altar?.group) disposeObject3D(this.altar.group);
    const g = new THREE.Group();
    const ax = 22;
    const az = -26;
    g.position.set(ax, 0, az);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.2, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: this.biome.rock, roughness: 0.8 })
    );
    base.position.y = 0.35;
    const crystal = makeGlowOrb(this.biome.accent, 0.85);
    crystal.position.y = 2.4;
    g.add(base, crystal);
    this.group.add(g);
    this.altar = { group: g, crystal, x: ax, z: az };
  }

  _spawnGuardian() {
    if (this.guardian) return;
    let model = null;
    try {
      model = buildDungeonEnemyModel('rune_golem', 'aztec_ruins');
    } catch {
      const root = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.8, 2.2),
        new THREE.MeshStandardMaterial({ color: this.biome.accent, emissive: this.biome.accent, emissiveIntensity: 0.35 })
      );
      body.position.y = 1.4;
      root.add(body);
      model = { root, hitBoxRadius: 1.8, animate() {}, dispose() { disposeObject3D(root); } };
    }
    model.root.scale.setScalar(1.65);
    model.root.position.set(this.altar.x, 0, this.altar.z - 6);
    this.group.add(model.root);
    this.guardian = {
      model,
      pos: model.root.position,
      hp: 180,
      maxHp: 180,
      atkCd: 1.5,
      state: 'idle',
      stateTimer: 0
    };
    this.banner('GUARDIÃO DESPERTOU!', 'Derrote o Guardião do Bioma!', 'is-crit', 1700);
    this.sfx('roar');
  }

  _streamChunks(force = false) {
    const px = this.player.mover.pos.x;
    const pz = this.player.mover.pos.z;
    const cx = Math.floor(px / CHUNK_SIZE);
    const cz = Math.floor(pz / CHUNK_SIZE);
    const curKey = `${cx},${cz}`;
    if (!force && curKey === this._lastChunkKey) return;
    this._lastChunkKey = curKey;

    const keep = new Set();
    for (let dx = -this.viewRadius; dx <= this.viewRadius; dx++) {
      for (let dz = -this.viewRadius; dz <= this.viewRadius; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        keep.add(key);
        if (!this.chunks.has(key)) this.chunks.set(key, this._buildChunk(cx + dx, cz + dz));
      }
    }

    // Descarrega chunks fora do raio para manter RAM/FPS baixos
    for (const [key, chunk] of this.chunks) {
      if (!keep.has(key)) {
        disposeObject3D(chunk.group);
        this.chunks.delete(key);
      }
    }
  }

  _buildChunk(cx, cz) {
    const rng = makeRng(`${this.seed}:${this.biome.id}:${cx}:${cz}`);
    const g = new THREE.Group();
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;
    g.position.set(ox, 0, oz);

    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
      new THREE.MeshStandardMaterial({ color: this.biome.ground, roughness: 0.94 })
    );
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(CHUNK_SIZE / 2, 0, CHUNK_SIZE / 2);
    tile.receiveShadow = true;
    g.add(tile);

    const pillars = [];
    const pickups = [];
    const patrols = [];

    // Rochas / árvores estilizadas (evita spawnar em cima da origem 0,0)
    const propCount = this.lowSpec ? 4 : 7;
    const rockMat = new THREE.MeshStandardMaterial({ color: this.biome.rock, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: this.biome.accent, roughness: 0.7 });
    for (let i = 0; i < propCount; i++) {
      const lx = 2.5 + rng() * (CHUNK_SIZE - 5);
      const lz = 2.5 + rng() * (CHUNK_SIZE - 5);
      const wx = ox + lx;
      const wz = oz + lz;
      if (Math.hypot(wx, wz) < 6 || Math.hypot(wx - this.altar.x, wz - this.altar.z) < 6) continue;
      const isTree = rng() < 0.55;
      const h = 1.6 + rng() * 2.4;
      const r = isTree ? 0.55 : 0.9 + rng() * 0.7;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, h, 7), rockMat);
      trunk.position.set(lx, h / 2, lz);
      trunk.castShadow = !this.lowSpec;
      g.add(trunk);
      if (isTree) {
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 0), leafMat);
        crown.position.set(lx, h + 0.8, lz);
        g.add(crown);
      }
      pillars.push({ x: wx, z: wz, r });
    }

    // Pickups: ninhos de ovos, frutinhas de estamina, relíquias ocultas e portais de bioma
    const addPickup = (kind, color, radius) => {
      const id = `${this.biome.id}:${cx}:${cz}:${kind}`;
      if (this.collectedIds.has(id)) return;
      const lx = 3 + rng() * (CHUNK_SIZE - 6);
      const lz = 3 + rng() * (CHUNK_SIZE - 6);
      const mesh = makeGlowOrb(color, radius);
      mesh.position.set(lx, 0.85, lz);
      g.add(mesh);
      pickups.push({ id, kind, x: ox + lx, z: oz + lz, mesh, active: true });
    };

    if (rng() < 0.72) addPickup('egg', '#fbbf24', 0.36);
    if (rng() < 0.65) addPickup('berry', '#34d399', 0.3);
    if ((cx !== 0 || cz !== 0) && rng() < 0.38) addPickup('relic', '#a855f7', 0.48);
    if (Math.abs(cx) + Math.abs(cz) >= 2 && rng() < 0.18) addPickup('portal', '#38bdf8', 0.65);

    // Patrulha de dino IA leve em chunks externos
    if ((cx !== 0 || cz !== 0) && rng() < 0.45) {
      const lx = CHUNK_SIZE * 0.5;
      const lz = CHUNK_SIZE * 0.5;
      const pMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.2, 1.8),
        new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.6 })
      );
      pMesh.position.set(lx, 0.65, lz);
      g.add(pMesh);
      patrols.push({
        cx: ox + lx, cz: oz + lz, x: ox + lx, z: oz + lz,
        ox, oz, mesh: pMesh, hp: 45, maxHp: 45, angle: rng() * Math.PI * 2, active: true, atkCd: 0
      });
    }

    this.group.add(g);
    return { group: g, pillars, pickups, patrols };
  }

  _buildHud() {
    const el = document.createElement('div');
    el.className = 'm3d-hud-layer';
    el.innerHTML = `
      <div class="m3d-adv-panel">
        <div class="m3d-adv-biome" data-biome>${escapeHtml(this.biome.name)}</div>
        <div class="m3d-adv-objs">
          <div class="m3d-obj" data-obj-relics>🏺 Relíquias: 0 / ${this.relicsTarget}</div>
          <div class="m3d-obj" data-obj-altar>⛩ Ativar Altar do Bioma</div>
          <div class="m3d-obj" data-obj-guard>👹 Derrotar Guardião</div>
        </div>
        <div class="m3d-adv-coords" data-coords>X 0 · Z 0 · 🥚 0</div>
      </div>

      <div class="m3d-player-pill">
        <div class="m3d-pill-label">${escapeHtml(this.player.name)}</div>
        <div class="m3d-bar m3d-bar-hp"><div class="m3d-bar-fill" data-php></div></div>
        <div class="m3d-bar m3d-bar-stam"><div class="m3d-bar-fill" data-pstam></div></div>
      </div>

      <div class="m3d-corner-actions">
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="biome">🌍 Bioma</button>
        <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">✕ Menu</button>
      </div>

      <div class="m3d-controls-hint">
        <span><b>WASD</b> Explorar 360°</span><span><b>Q / E</b> Atacar / Interagir</span><span><b>Espaço</b> Pular</span><span><b>Shift</b> Esquiva</span>
      </div>
    `;
    this.overlay.appendChild(el);

    this._hud = {
      biome: el.querySelector('[data-biome]'),
      objRelics: el.querySelector('[data-obj-relics]'),
      objAltar: el.querySelector('[data-obj-altar]'),
      objGuard: el.querySelector('[data-obj-guard]'),
      coords: el.querySelector('[data-coords]'),
      php: el.querySelector('[data-php]'),
      pstam: el.querySelector('[data-pstam]')
    };

    this.listen(el.querySelector('[data-act="exit"]'), 'click', () => this.requestExit({ eggs: this.eggsFound, relics: this.relicsFound }));
    this.listen(el.querySelector('[data-act="biome"]'), 'click', () => this._switchBiome((this.biomeIdx + 1) % OPEN_BIOMES.length));
  }

  _switchBiome(nextIdx) {
    this.biomeIdx = nextIdx;
    this.biome = OPEN_BIOMES[this.biomeIdx];
    for (const chunk of this.chunks.values()) disposeObject3D(chunk.group);
    this.chunks.clear();
    this._lastChunkKey = '';
    if (this.guardian) { this.guardian.model.dispose?.(); this.guardian = null; }
    this.scene.background = new THREE.Color(this.biome.sky);
    this.scene.fog = new THREE.Fog(this.biome.fog, 24, this.lowSpec ? 56 : 86);
    this._spawnBiomeAltar();
    this._streamChunks(true);
    this._hud.biome.textContent = this.biome.name;
    this.banner(this.biome.name, 'Novo Bioma Aberto!', 'is-cyan', 1400);
  }

  update(dt) {
    if (!this.mounted || this.isPaused()) return;
    const simDt = this.baseTick(dt);

    if (simDt > 0) {
      this._updatePlayer(simDt);
      this._streamChunks(false);
      this._updateWorldEntities(simDt);
      this._updateGuardian(simDt);
      this.player.avatar.sync(simDt);
      this.rig.update(simDt, this.player.mover.pos);
      this._syncHud();
    }

    this.baseEndFrame(dt);
  }

  _updatePlayer(dt) {
    const p = this.player;
    const m = p.mover;
    const c = p.controls;
    p.stamina = Math.min(100, p.stamina + 18 * dt);
    if (p.atkCd > 0) p.atkCd = Math.max(0, p.atkCd - dt);

    const mv = c.move();
    this.rig.toWorld(mv.x, mv.y, this._tmpW);
    if (c.pressed('jump')) m.jump();
    if (c.pressed('dodge') && p.stamina >= 16 && m.dodge(this._tmpW.x, this._tmpW.z)) {
      p.stamina -= 16;
      this.sfx('jump');
    }

    if (p.atkCd <= 0 && (c.pressed('light') || c.pressed('heavy'))) {
      p.atkCd = 0.3;
      p.avatar.attack('bite', 0.32);
      this._attackNearby();
    }

    m.step(dt, this._tmpW.x, this._tmpW.z);
    for (const chunk of this.chunks.values()) m.pushOutCircles(chunk.pillars);

    // Checa ativação do altar
    const dAltar = Math.hypot(m.pos.x - this.altar.x, m.pos.z - this.altar.z);
    if (dAltar < 3.6 && !this.altarActivated) {
      if (this.relicsFound >= this.relicsTarget) {
        this.altarActivated = true;
        this.altar.crystal.material.emissiveIntensity = 2.6;
        this._spawnGuardian();
      } else if (c.pressed('interact')) {
        this.toast(`Faltam ${this.relicsTarget - this.relicsFound} relíquia(s) para ativar o Altar!`, 'is-amber');
      }
    }
  }

  _attackNearby() {
    const p = this.player;
    const pos = p.mover.pos;
    for (const chunk of this.chunks.values()) {
      for (const pat of chunk.patrols) {
        if (!pat.active) continue;
        if (Math.hypot(pat.x - pos.x, pat.z - pos.z) <= 3.4) {
          pat.hp -= p.atk;
          this.floaters.spawn(new THREE.Vector3(pat.x, 1.2, pat.z), `-${p.atk}`, 'is-dmg');
          this.sfx('hit');
          if (pat.hp <= 0) {
            pat.active = false;
            pat.mesh.visible = false;
            this.eggsFound += 15;
            this.floaters.spawn(new THREE.Vector3(pat.x, 1.5, pat.z), '+15 🥚', 'is-amber');
          }
        }
      }
    }
    if (this.guardian && !this.guardianDefeated) {
      const g = this.guardian;
      if (Math.hypot(g.pos.x - pos.x, g.pos.z - pos.z) <= 4.4) {
        g.hp = Math.max(0, g.hp - p.atk);
        g.state = g.hp <= 0 ? 'dead' : 'hurt';
        g.stateTimer = 0.45;
        this.floaters.spawn(g.pos, `-${p.atk}`, 'is-crit');
        this.sfx('hit');
        if (g.hp <= 0) this._onGuardianDefeated();
      }
    }
  }

  _updateWorldEntities(dt) {
    const p = this.player;
    const pos = p.mover.pos;
    if (this.altar?.crystal) this.altar.crystal.rotation.y += dt * 1.6;

    for (const chunk of this.chunks.values()) {
      for (const pk of chunk.pickups) {
        if (!pk.active) continue;
        pk.mesh.rotation.y += dt * 2.2;
        pk.mesh.position.y = 0.85 + Math.sin(this.elapsed * 3.2 + pk.x) * 0.16;
        if (Math.hypot(pk.x - pos.x, pk.z - pos.z) < 1.65) {
          pk.active = false;
          pk.mesh.visible = false;
          this.collectedIds.add(pk.id);
          if (pk.kind === 'egg') {
            this.eggsFound += 10;
            this.floaters.spawn(pos, '+10 🥚', 'is-amber');
            this.sfx('coin');
          } else if (pk.kind === 'berry') {
            p.stamina = 100;
            p.hp = Math.min(p.maxHp, p.hp + 18);
            this.floaters.spawn(pos, '🫐 +Estamina/HP', 'is-emerald');
            this.sfx('coin');
          } else if (pk.kind === 'relic') {
            this.relicsFound = Math.min(this.relicsTarget, this.relicsFound + 1);
            this.floaters.spawn(pos, `🏺 Relíquia ${this.relicsFound}/${this.relicsTarget}!`, 'is-special');
            this.toast(this.relicsFound >= this.relicsTarget ? 'Todas as relíquias coletadas! Vá ao Altar!' : `Relíquia ${this.relicsFound}/${this.relicsTarget} encontrada!`, 'is-amber');
            this.sfx('victory');
          } else if (pk.kind === 'portal') {
            this._switchBiome((this.biomeIdx + 1) % OPEN_BIOMES.length);
            return;
          }
        }
      }

      for (const pat of chunk.patrols) {
        if (!pat.active) continue;
        if (pat.atkCd > 0) pat.atkCd -= dt;
        const dist = Math.hypot(pos.x - pat.x, pos.z - pat.z);
        if (dist < 10) {
          const dx = (pos.x - pat.x) / Math.max(0.01, dist);
          const dz = (pos.z - pat.z) / Math.max(0.01, dist);
          pat.x += dx * 3.5 * dt;
          pat.z += dz * 3.5 * dt;
          if (dist < 1.6 && pat.atkCd <= 0 && !p.mover.invulnerable) {
            pat.atkCd = 1.4;
            p.hp = Math.max(1, p.hp - 12);
            p.avatar.hurt();
            this.floaters.spawn(pos, '-12', 'is-dmg');
            this.sfx('hit');
          }
        } else {
          pat.angle += dt * 0.7;
          pat.x = pat.cx + Math.cos(pat.angle) * 4;
          pat.z = pat.cz + Math.sin(pat.angle) * 4;
        }
        pat.mesh.position.set(pat.x - pat.ox, 0.65, pat.z - pat.oz);
      }
    }
  }

  _updateGuardian(dt) {
    const g = this.guardian;
    if (!g || this.guardianDefeated) return;
    if (g.stateTimer > 0) {
      g.stateTimer -= dt;
      if (g.stateTimer <= 0) g.state = 'idle';
    }
    try { g.model.animate?.(this.elapsed, g.state); } catch { /* noop */ }
    const p = this.player;
    const dx = p.mover.pos.x - g.pos.x;
    const dz = p.mover.pos.z - g.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    if (dist > 2.8) {
      g.pos.x += (dx / dist) * 3.8 * dt;
      g.pos.z += (dz / dist) * 3.8 * dt;
    }
    if (g.atkCd > 0) g.atkCd -= dt;
    if (dist < 3.1 && g.atkCd <= 0 && !p.mover.invulnerable) {
      g.atkCd = 1.6;
      g.state = 'attack';
      g.stateTimer = 0.45;
      p.hp = Math.max(1, p.hp - 18);
      p.mover.applyImpulse((dx / dist) * 9, (dz / dist) * 9, 3);
      p.avatar.hurt();
      this.floaters.spawn(p.mover.pos, '-18', 'is-dmg');
      this.sfx('hit');
    }
  }

  _onGuardianDefeated() {
    this.guardianDefeated = true;
    const bonus = 100 + this.eggsFound;
    try {
      if (Save?.data) {
        Save.data.eggs = (Save.data.eggs || 0) + bonus;
        Save.save?.();
      }
    } catch { /* ignore */ }
    this.sfx('victory');
    this.banner('BIOMA CONQUISTADO!', `Guardião derrotado! +${bonus} 🥚`, 'is-amber', 2400);
  }

  _syncHud() {
    const h = this._hud;
    if (!h.coords) return;
    const p = this.player;
    h.objRelics.textContent = `🏺 Relíquias: ${this.relicsFound} / ${this.relicsTarget}${this.relicsFound >= this.relicsTarget ? ' ✓' : ''}`;
    h.objRelics.classList.toggle('is-done', this.relicsFound >= this.relicsTarget);
    h.objAltar.textContent = `⛩ Altar (${Math.round(Math.hypot(p.mover.pos.x - this.altar.x, p.mover.pos.z - this.altar.z))}m)${this.altarActivated ? ' ✓' : ''}`;
    h.objAltar.classList.toggle('is-done', this.altarActivated);
    h.objGuard.textContent = `👹 Guardião${this.guardianDefeated ? ' ✓' : this.guardian ? ` (${this.guardian.hp} HP)` : ''}`;
    h.objGuard.classList.toggle('is-done', this.guardianDefeated);
    h.coords.textContent = `X ${Math.round(p.mover.pos.x)} · Z ${Math.round(p.mover.pos.z)} · 🥚 ${this.eggsFound}`;
    h.php.style.width = `${(p.hp / p.maxHp) * 100}%`;
    h.pstam.style.width = `${p.stamina}%`;
  }

  dispose() {
    for (const chunk of this.chunks.values()) disposeObject3D(chunk.group);
    this.chunks.clear();
    if (this.altar?.group) disposeObject3D(this.altar.group);
    this.guardian?.model?.dispose?.();
    this.player?.avatar?.dispose();
    this.disposeBase();
  }
}
