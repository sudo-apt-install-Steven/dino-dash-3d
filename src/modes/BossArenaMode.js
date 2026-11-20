// Boss Arena — Combate 3D livre 360° contra qualquer chefe de BOSS_DEFS (via buildBossModel).
// Inclui anéis luminosos de perigo AoE no chão (investida, ondas sísmicas, meteoros),
// cristais de quebra de armadura/stagger ao redor da arena, fases 1/2/3 visuais e tela de recompensa.
import * as THREE from 'three';
import {
  Mode3DBase,
  DinoAvatar,
  PlayerControls,
  P1_BINDINGS,
  buildModeLights,
  makeDangerRing,
  resolveDinoId,
  disposeObject3D,
  yawFromDir,
  angleDelta,
  clamp,
  lerp,
  escapeHtml
} from './WorldExplorer3D.js';
import { BOSS_DEFS } from '../events/BossManager.js';
import { buildBossModel } from '../events/BossModels.js';
import { buildArenaProps } from '../models/DungeonProps.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { Save } from '../systems/Save.js';

const BOSS_KEYS = Object.keys(BOSS_DEFS);

export class BossArenaMode extends Mode3DBase {
  constructor(game, opts = {}) {
    super(game, { ...opts, modeId: 'boss_arena' });
    this.bossId = (opts.bossId && BOSS_DEFS[opts.bossId]) ? opts.bossId : (BOSS_KEYS[0] || 'alpha_trex');
    this.bossDef = BOSS_DEFS[this.bossId];
    this.arenaRadius = 18;
    this.arenaProps = null;
    this.pillars = [];
    this.crystals = [];
    this.hazards = []; // { kind, x, z, radius, t, dur, ring, hitDone, mesh? }
    this.player = null;
    this.boss = null;
    this.state = 'fight'; // 'fight' | 'victory' | 'defeat'
    this.fightTime = 0;
    this._hud = {};
    this._tmpW = { x: 0, z: 0 };
    this._focus = new THREE.Vector3();
  }

  async mount() {
    this.mountBase({
      background: '#120d16',
      fog: { color: '#1e1326', near: 28, far: 86 },
      clearColor: '#120d16',
      cameraOpts: { distance: 12, pitch: 0.48, height: 1.5, minDistance: 6, maxDistance: 22 }
    });

    this._buildArena();
    this._spawnPlayer();
    this._spawnBoss(this.bossId);
    this._spawnStaggerCrystals();
    this._buildHud();
    this.rig.snap(this.player.mover.pos);
    this.banner(this.bossDef.name, this.bossDef.title || 'Chefe Colossal', 'is-crit', 1700);
    this.sfx('roar');
    this.onResize(this.viewportW, this.viewportH);
  }

  _buildArena() {
    this.group.add(buildModeLights({
      sky: '#e9d5ff', ground: '#2e1065', sun: '#fde68a', intensity: 1.05,
      shadows: !this.lowSpec && !!Save?.data?.settings?.shadows
    }));

    try {
      const props = buildArenaProps('volcanic_crater');
      if (props?.group) {
        this.arenaProps = props;
        this.group.add(props.group);
        if (Array.isArray(props.pillars)) this.pillars = props.pillars.slice(0, 4);
      }
    } catch { /* fallback abaixo */ }

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(this.arenaRadius + 0.6, this.arenaRadius + 1.4, 0.9, 44),
      new THREE.MeshStandardMaterial({ color: '#272030', roughness: 0.86, metalness: 0.1 })
    );
    floor.position.y = -0.45;
    floor.receiveShadow = true;
    this.group.add(floor);

    const border = new THREE.Mesh(
      new THREE.RingGeometry(this.arenaRadius - 0.35, this.arenaRadius + 0.15, 56),
      new THREE.MeshBasicMaterial({ color: this.bossDef.color || '#ef4444', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.03;
    this.group.add(border);
  }

  _spawnPlayer() {
    const dinoId = resolveDinoId(this.game, this.opts, 0);
    const spec = getDinoSpec(dinoId);
    const avatar = new DinoAvatar(dinoId, {
      mover: { x: 0, z: 10.5, yaw: 0, radius: 0.72, speed: 7.4 + (spec?.stats?.speed || 5) * 0.22, dashSpeed: 20, dashCooldown: 0.65 },
      tint: '#38bdf8'
    });
    this.group.add(avatar.root);
    const maxHp = 100 + (spec?.stats?.hp || 4) * 15;
    this.player = {
      dinoId,
      name: spec?.name || dinoId,
      avatar,
      mover: avatar.mover,
      controls: new PlayerControls(this.keys, P1_BINDINGS, this.touch),
      maxHp,
      hp: maxHp,
      stamina: 100,
      fury: 0,
      atk: 14 + (spec?.stats?.attack || 5) * 2.1,
      atkCd: 0
    };
  }

  _spawnBoss(bossId) {
    if (this.boss?.rig?.root) disposeObject3D(this.boss.rig.root, { geometry: false });
    this.bossId = bossId;
    this.bossDef = BOSS_DEFS[bossId] || BOSS_DEFS.alpha_trex;

    let rig = null;
    try {
      rig = buildBossModel(bossId);
    } catch {
      const root = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 3.2, 3.4),
        new THREE.MeshStandardMaterial({ color: this.bossDef.color || '#dc2626', roughness: 0.55 })
      );
      body.position.y = 1.6;
      root.add(body);
      rig = { root, setPhaseVisuals() {} };
    }

    rig.root.scale.setScalar(1.45);
    rig.root.position.set(0, 0, -6);
    this.group.add(rig.root);

    const maxHp = 260 + (this.bossDef.hp || 5) * 55;
    this.boss = {
      id: bossId,
      def: this.bossDef,
      rig,
      pos: rig.root.position,
      yaw: Math.PI,
      radius: 2.35,
      maxHp,
      hp: maxHp,
      trailHp: maxHp,
      armor: 100,
      maxArmor: 100,
      staggerTimer: 0,
      aiState: 'stalk', // 'stalk' | 'telegraph' | 'recover' | 'staggered'
      aiTimer: 1.6,
      attackIdx: 0,
      chargeDir: new THREE.Vector2(0, 1),
      charging: 0
    };
  }

  _spawnStaggerCrystals() {
    for (const c of this.crystals) disposeObject3D(c.mesh);
    this.crystals = [];
    const count = 4;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.PI / 4;
      const r = this.arenaRadius - 3.6;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.75, 0),
        new THREE.MeshStandardMaterial({ color: '#22d3ee', emissive: '#06b6d4', emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.3 })
      );
      mesh.position.set(x, 1.15, z);
      this.group.add(mesh);
      this.crystals.push({ x, z, r: 0.85, hp: 2, active: true, respawn: 0, mesh });
    }
  }

  _buildHud() {
    const el = document.createElement('div');
    el.className = 'm3d-hud-layer';
    el.innerHTML = `
      <div class="m3d-boss-top">
        <div class="m3d-boss-header">
          <div>
            <span class="m3d-boss-name" data-bname>${escapeHtml(this.bossDef.name)}</span>
            <span class="m3d-boss-title" data-btitle>${escapeHtml(this.bossDef.title || '')}</span>
          </div>
          <span class="m3d-boss-phase" data-bphase>FASE 1</span>
        </div>
        <div class="m3d-bar m3d-bar-boss"><div class="m3d-bar-trail" data-btrail></div><div class="m3d-bar-fill" data-bhp></div></div>
        <div class="m3d-bar m3d-bar-armor"><div class="m3d-bar-fill" data-barmor></div></div>
      </div>

      <div class="m3d-player-pill">
        <div class="m3d-pill-label">${escapeHtml(this.player.name)}</div>
        <div class="m3d-bar m3d-bar-hp"><div class="m3d-bar-fill" data-php></div></div>
        <div class="m3d-x1-subbars">
          <div class="m3d-bar m3d-bar-stam"><div class="m3d-bar-fill" data-pstam></div></div>
          <div class="m3d-bar m3d-bar-fury"><div class="m3d-bar-fill" data-pfury></div></div>
        </div>
      </div>

      <div class="m3d-corner-actions">
        <select class="m3d-select" data-boss-select aria-label="Escolher Chefe">
          ${BOSS_KEYS.map((k) => `<option value="${escapeHtml(k)}"${k === this.bossId ? ' selected' : ''}>${escapeHtml(BOSS_DEFS[k].name)}</option>`).join('')}
        </select>
        <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">✕ Menu</button>
      </div>

      <div class="m3d-controls-hint">
        <span><b>WASD</b> Mover 360°</span><span><b>Q / E</b> Atacar</span><span><b>Shift</b> Esquiva</span><span><b>F</b> Especial</span><span>💎 Quebre Cristais para Atordoar o Chefe!</span>
      </div>
    `;
    this.overlay.appendChild(el);

    this._hud = {
      bname: el.querySelector('[data-bname]'),
      btitle: el.querySelector('[data-btitle]'),
      bphase: el.querySelector('[data-bphase]'),
      bhp: el.querySelector('[data-bhp]'),
      btrail: el.querySelector('[data-btrail]'),
      barmor: el.querySelector('[data-barmor]'),
      php: el.querySelector('[data-php]'),
      pstam: el.querySelector('[data-pstam]'),
      pfury: el.querySelector('[data-pfury]')
    };

    this.listen(el.querySelector('[data-act="exit"]'), 'click', () => this.requestExit({ bossId: this.bossId, state: this.state }));
    this.listen(el.querySelector('[data-boss-select]'), 'change', (e) => {
      this._clearHazards();
      this.state = 'fight';
      this.fightTime = 0;
      this.player.hp = this.player.maxHp;
      this.player.stamina = 100;
      this.player.fury = 0;
      this.player.avatar.dead = false;
      this.player.avatar.victory = false;
      this.player.mover.pos.set(0, 0, 10.5);
      this._spawnBoss(e.target.value);
      this._spawnStaggerCrystals();
      this._hud.bname.textContent = this.bossDef.name;
      this._hud.btitle.textContent = this.bossDef.title || '';
      this.banner(this.bossDef.name, this.bossDef.title || '', 'is-crit', 1500);
      this.sfx('roar');
    });
  }

  update(dt) {
    if (!this.mounted || this.isPaused()) return;
    const simDt = this.baseTick(dt);

    if (simDt > 0) {
      if (this.state === 'fight') {
        this.fightTime += simDt;
        this._updatePlayer(simDt);
        this._updateBoss(simDt);
        this._updateCrystals(simDt);
        this._updateHazards(simDt);
      } else {
        this.player.mover.step(simDt, 0, 0, { rooted: true });
      }
      this.player.avatar.sync(simDt);

      // Câmera acompanha o jogador com leve viés para o chefe
      this._focus.lerpVectors(this.player.mover.pos, this.boss.pos, 0.28);
      this.rig.update(simDt, this._focus);
      this._syncHud(simDt);
    }

    this.baseEndFrame(dt);
  }

  _updatePlayer(dt) {
    const p = this.player;
    const m = p.mover;
    const c = p.controls;
    p.stamina = Math.min(100, p.stamina + 22 * dt);
    if (p.atkCd > 0) p.atkCd = Math.max(0, p.atkCd - dt);

    const mv = c.move();
    this.rig.toWorld(mv.x, mv.y, this._tmpW);
    if (c.pressed('jump')) m.jump();
    if (c.pressed('dodge') && p.stamina >= 18 && m.dodge(this._tmpW.x, this._tmpW.z)) {
      p.stamina -= 18;
      this.sfx('jump');
    }

    if (p.atkCd <= 0) {
      if (c.pressed('special') && p.fury >= 100) {
        p.fury = 0;
        p.atkCd = 0.55;
        p.avatar.attack('lunge', 0.45);
        p.avatar.roar();
        this._playerStrike(p.atk * 2.8, 5.2, 34, true);
      } else if (c.pressed('heavy') && p.stamina >= 22) {
        p.stamina -= 22;
        p.atkCd = 0.48;
        p.avatar.attack('headbutt', 0.4);
        this._playerStrike(p.atk * 1.65, 3.8, 18, false);
      } else if (c.pressed('light')) {
        p.atkCd = 0.24;
        p.avatar.attack('bite', 0.26);
        this._playerStrike(p.atk, 3.3, 10, false);
      }
    }

    m.step(dt, this._tmpW.x, this._tmpW.z);
    m.clampToBounds({ r: this.arenaRadius });
    m.pushOutCircles(this.pillars);
    // Não atravessa o corpo do chefe
    m.pushOutCircles([{ x: this.boss.pos.x, z: this.boss.pos.z, r: this.boss.radius }]);
  }

  _playerStrike(dmg, range, armorDmg, isSpecial) {
    const p = this.player;
    const b = this.boss;
    const distBoss = Math.hypot(b.pos.x - p.mover.pos.x, b.pos.z - p.mover.pos.z);
    if (distBoss <= range + b.radius) {
      const mult = b.staggerTimer > 0 ? 1.75 : 1.0;
      const finalDmg = Math.round(dmg * mult);
      b.hp = Math.max(0, b.hp - finalDmg);
      b.armor = Math.max(0, b.armor - armorDmg);
      p.fury = Math.min(100, p.fury + (isSpecial ? 0 : 12));
      this.hitStop = isSpecial ? 0.08 : 0.04;
      this.rig.shake(isSpecial ? 0.4 : 0.16);
      this.floaters.spawn(b.pos, b.staggerTimer > 0 ? `💥 -${finalDmg}!` : `-${finalDmg}`, isSpecial || b.staggerTimer > 0 ? 'is-crit' : 'is-dmg');
      this.sfx('hit');

      b.rig.setPhaseVisuals?.(b.hp / b.maxHp);
      if (b.armor <= 0 && b.staggerTimer <= 0) this._staggerBoss('ARMADURA QUEBRADA!');
      if (b.hp <= 0) this._onVictory();
      return;
    }

    // Checa cristais de stagger
    for (const c of this.crystals) {
      if (!c.active) continue;
      if (Math.hypot(c.x - p.mover.pos.x, c.z - p.mover.pos.z) <= range + c.r) {
        c.hp -= isSpecial ? 2 : 1;
        this.sfx('hit');
        if (c.hp <= 0) {
          c.active = false;
          c.mesh.visible = false;
          c.respawn = 16;
          b.armor = Math.max(0, b.armor - 45);
          this.floaters.spawn(new THREE.Vector3(c.x, 1.2, c.z), '💎 -45 ARMADURA!', 'is-cyan');
          if (b.armor <= 0 && b.staggerTimer <= 0) this._staggerBoss('CRISTAL RESSONANTE!');
        } else {
          this.floaters.spawn(new THREE.Vector3(c.x, 1.2, c.z), '💎 Rachou!', 'is-cyan');
        }
        break;
      }
    }
  }

  _staggerBoss(reason) {
    const b = this.boss;
    b.staggerTimer = 4.2;
    b.aiState = 'staggered';
    b.charging = 0;
    this._clearHazards();
    this.banner('CHEFE ATORDOADO!', `${reason} · Dano x1.75`, 'is-cyan', 1500);
    this.rig.shake(0.35);
    this.sfx('shield');
  }

  _updateBoss(dt) {
    const b = this.boss;
    const pPos = this.player.mover.pos;
    const hpRatio = b.hp / b.maxHp;
    const phase = hpRatio <= 0.34 ? 3 : hpRatio <= 0.67 ? 2 : 1;
    const pace = phase === 3 ? 1.38 : phase === 2 ? 1.18 : 1.0;

    if (b.staggerTimer > 0) {
      b.staggerTimer -= dt;
      b.rig.root.rotation.z = Math.sin(this.elapsed * 18) * 0.08;
      if (b.staggerTimer <= 0) {
        b.rig.root.rotation.z = 0;
        b.armor = b.maxArmor;
        b.aiState = 'stalk';
        b.aiTimer = 1.1;
      }
      return;
    }

    // Investida em andamento
    if (b.charging > 0) {
      b.charging -= dt;
      b.pos.x += b.chargeDir.x * 16.5 * pace * dt;
      b.pos.z += b.chargeDir.y * 16.5 * pace * dt;
      const d = Math.hypot(b.pos.x, b.pos.z);
      if (d > this.arenaRadius - b.radius) {
        b.pos.x = (b.pos.x / d) * (this.arenaRadius - b.radius);
        b.pos.z = (b.pos.z / d) * (this.arenaRadius - b.radius);
        b.charging = 0;
        this.rig.shake(0.3);
      }
      if (Math.hypot(pPos.x - b.pos.x, pPos.z - b.pos.z) < b.radius + 1.15) {
        this._damagePlayer(24, b.pos);
        b.charging = 0;
      }
      return;
    }

    // Olha suavemente para o jogador
    const dx = pPos.x - b.pos.x;
    const dz = pPos.z - b.pos.z;
    const targetYaw = yawFromDir(dx, dz) + Math.PI; // BossModels olham +Z por padrão
    b.yaw += angleDelta(b.yaw, targetYaw) * (1 - Math.exp(-4.5 * dt));
    b.rig.root.rotation.y = b.yaw;
    b.rig.root.position.y = Math.abs(Math.sin(this.elapsed * 3.2 * pace)) * 0.14;

    b.aiTimer -= dt;
    if (b.aiState === 'stalk') {
      const dist = Math.hypot(dx, dz) || 1;
      if (dist > 5.5) {
        b.pos.x += (dx / dist) * 3.2 * pace * dt;
        b.pos.z += (dz / dist) * 3.2 * pace * dt;
      }
      if (b.aiTimer <= 0) {
        this._launchBossPattern(phase);
        b.aiState = 'recover';
        b.aiTimer = Math.max(1.3, 2.5 / pace);
      }
    } else if (b.aiState === 'recover' && b.aiTimer <= 0) {
      b.aiState = 'stalk';
      b.aiTimer = Math.max(0.85, 1.5 / pace);
    }
  }

  _launchBossPattern(phase) {
    const b = this.boss;
    const pPos = this.player.mover.pos;
    const pattern = b.attackIdx % 3;
    b.attackIdx += 1;

    if (pattern === 0) {
      // Onda sísmica AoE ao redor do chefe
      this._spawnHazard('shockwave', b.pos.x, b.pos.z, 6.4 + phase * 0.8, 1.15, '#ef4444', 22);
    } else if (pattern === 1) {
      // Chuva de meteoros telegrafados (3 a 5 alvos)
      const count = 2 + phase;
      for (let i = 0; i < count; i++) {
        const spread = i === 0 ? 0 : 4.5 + Math.random() * 5.5;
        const a = Math.random() * Math.PI * 2;
        const tx = clamp(pPos.x + Math.cos(a) * spread, -this.arenaRadius + 3, this.arenaRadius - 3);
        const tz = clamp(pPos.z + Math.sin(a) * spread, -this.arenaRadius + 3, this.arenaRadius - 3);
        this._spawnHazard('meteor', tx, tz, 2.9, 1.25 + i * 0.14, '#f97316', 20);
      }
    } else {
      // Investida telegrafada na direção do jogador
      const dx = pPos.x - b.pos.x;
      const dz = pPos.z - b.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      b.chargeDir.set(dx / d, dz / d);
      this._spawnHazard('charge', pPos.x, pPos.z, 2.6, 0.85, '#eab308', 0, () => {
        b.charging = 0.72;
        this.sfx('roar');
      });
    }
  }

  _spawnHazard(kind, x, z, radius, dur, color, dmg, onDetonate = null) {
    const ring = makeDangerRing(radius, color);
    ring.position.set(x, 0, z);
    this.group.add(ring);
    this.hazards.push({ kind, x, z, radius, t: 0, dur, dmg, ring, onDetonate });
  }

  _updateHazards(dt) {
    const pPos = this.player.mover.pos;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.t += dt;
      h.ring.setProgress(h.t / h.dur);
      if (h.t >= h.dur) {
        if (h.onDetonate) h.onDetonate();
        if (h.dmg > 0) {
          const dist = Math.hypot(pPos.x - h.x, pPos.z - h.z);
          if (dist <= h.radius && pPos.y < 1.35) this._damagePlayer(h.dmg, { x: h.x, z: h.z });
          this.rig.shake(0.24);
          this.sfx('hit');
        }
        disposeObject3D(h.ring);
        this.hazards.splice(i, 1);
      }
    }
  }

  _clearHazards() {
    for (const h of this.hazards) disposeObject3D(h.ring);
    this.hazards.length = 0;
  }

  _updateCrystals(dt) {
    for (const c of this.crystals) {
      if (c.active) {
        c.mesh.rotation.y += dt * 1.8;
        c.mesh.position.y = 1.15 + Math.sin(this.elapsed * 3 + c.x) * 0.16;
      } else {
        c.respawn -= dt;
        if (c.respawn <= 0) {
          c.active = true;
          c.hp = 2;
          c.mesh.visible = true;
        }
      }
    }
  }

  _damagePlayer(dmg, srcPos) {
    const p = this.player;
    if (p.mover.invulnerable || this.state !== 'fight') return;
    p.hp = Math.max(0, p.hp - dmg);
    p.mover.iframes = 0.75;
    const dx = p.mover.pos.x - srcPos.x;
    const dz = p.mover.pos.z - srcPos.z;
    const d = Math.hypot(dx, dz) || 1;
    p.mover.applyImpulse((dx / d) * 10, (dz / d) * 10, 3.5);
    p.avatar.hurt();
    this.rig.shake(0.32);
    this.floaters.spawn(p.mover.pos, `-${dmg}`, 'is-dmg');
    this.sfx('hit');
    if (p.hp <= 0) this._onDefeat();
  }

  _onVictory() {
    this.state = 'victory';
    this._clearHazards();
    this.player.avatar.victory = true;
    const eggs = 80 + (this.bossDef.hp || 5) * 15;
    try {
      if (Save?.data) {
        Save.data.eggs = (Save.data.eggs || 0) + eggs;
        Save.save?.();
      }
    } catch { /* ignore */ }
    this.sfx('victory');
    this._showEndModal(true, eggs);
  }

  _onDefeat() {
    this.state = 'defeat';
    this._clearHazards();
    this.player.avatar.dead = true;
    this._showEndModal(false, 15);
  }

  _showEndModal(won, eggs) {
    const modal = document.createElement('div');
    modal.className = 'm3d-modal-backdrop';
    modal.innerHTML = `
      <div class="m3d-modal">
        <div class="m3d-modal-eyebrow">BOSS ARENA 3D</div>
        <h2 class="m3d-modal-title">${won ? `${escapeHtml(this.bossDef.name)} DERROTADO!` : 'DERROTA NA ARENA'}</h2>
        <p class="m3d-modal-sub">Tempo: ${this.fightTime.toFixed(1)}s · Recompensa: +${eggs} 🥚</p>
        <div class="m3d-modal-actions">
          <button type="button" class="m3d-btn m3d-btn-primary" data-act="retry">${won ? 'Próximo Chefe' : 'Tentar Novamente'}</button>
          <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">Voltar ao Menu</button>
        </div>
      </div>`;
    this.overlay.appendChild(modal);
    this.listen(modal.querySelector('[data-act="retry"]'), 'click', () => {
      modal.remove();
      const nextId = won ? BOSS_KEYS[(BOSS_KEYS.indexOf(this.bossId) + 1) % BOSS_KEYS.length] : this.bossId;
      this.state = 'fight';
      this.fightTime = 0;
      this.player.hp = this.player.maxHp;
      this.player.stamina = 100;
      this.player.fury = 0;
      this.player.avatar.dead = false;
      this.player.avatar.victory = false;
      this.player.mover.pos.set(0, 0, 10.5);
      this._spawnBoss(nextId);
      this._spawnStaggerCrystals();
      this._hud.bname.textContent = this.bossDef.name;
      this._hud.btitle.textContent = this.bossDef.title || '';
      const sel = this.overlay.querySelector('[data-boss-select]');
      if (sel) sel.value = nextId;
    });
    this.listen(modal.querySelector('[data-act="exit"]'), 'click', () => this.requestExit({ bossId: this.bossId, won, eggs }));
  }

  _syncHud(dt) {
    const b = this.boss;
    const p = this.player;
    const h = this._hud;
    if (!h.bhp) return;
    b.trailHp = lerp(b.trailHp, b.hp, Math.min(1, dt * 4.5));
    const ratio = b.hp / b.maxHp;
    const phase = ratio <= 0.34 ? 3 : ratio <= 0.67 ? 2 : 1;
    h.bhp.style.width = `${ratio * 100}%`;
    h.btrail.style.width = `${(b.trailHp / b.maxHp) * 100}%`;
    h.barmor.style.width = `${(b.armor / b.maxArmor) * 100}%`;
    h.bphase.textContent = b.staggerTimer > 0 ? 'ATORDOADO!' : `FASE ${phase}`;
    h.php.style.width = `${(p.hp / p.maxHp) * 100}%`;
    h.pstam.style.width = `${p.stamina}%`;
    h.pfury.style.width = `${p.fury}%`;
  }

  dispose() {
    this._clearHazards();
    for (const c of this.crystals) disposeObject3D(c.mesh);
    this.crystals.length = 0;
    this.player?.avatar?.dispose();
    if (this.boss?.rig?.root) disposeObject3D(this.boss.rig.root, { geometry: false });
    this.arenaProps?.dispose?.();
    this.disposeBase();
  }
}
