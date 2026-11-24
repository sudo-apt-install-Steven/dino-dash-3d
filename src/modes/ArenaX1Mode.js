// Arena X1 — Combate 3D Livre 1v1 (1P vs IA inteligente, 2P Local no mesmo teclado, ou estado Online/LAN).
// 6 arenas selecionáveis/rotacionáveis via buildArenaProps, combos leves (Q), pesado/lunge (E),
// defesa/parry (Shift), esquiva/dash (Espaço), Especial da Espécie (F), pilares destrutíveis,
// orbes de fúria, hitstop, knockback, Melhor de 3 rounds e HUD fighting-game completo.
import * as THREE from 'three';
import {
  Mode3DBase,
  DinoAvatar,
  PlayerControls,
  P1_BINDINGS,
  P1_SPLIT_BINDINGS,
  P2_BINDINGS,
  buildModeLights,
  makeGlowOrb,
  separateMovers,
  resolveDinoId,
  disposeObject3D,
  clamp,
  lerp,
  escapeHtml
} from './WorldExplorer3D.js';
import { buildArenaProps } from '../models/DungeonProps.js';
import { buildSculptedArenaPillar } from '../models/SculptedWorldProps.js';
import { uiIcon } from '../ui/UiIcons.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { DINO_WEAPONS_CATALOG, attachWeaponToDinoModel } from '../arena/DinoWeapons.js';
import { FIGHTING_COMBO_TABLE, getSpeciesSpecialMeta } from '../arena/FightingAnimator.js';
import { Save } from '../systems/Save.js';

export const X1_ARENAS = [
  { id: 'fossil_colosseum', name: 'Coliseu Fóssil', bg: '#1c1917', fog: '#292524', sky: '#fef3c7', ground: '#44403c', floor: '#57534e', ring: '#d97706' },
  { id: 'volcanic_crater', name: 'Cratera Vulcânica', bg: '#1f0d0a', fog: '#3b1109', sky: '#fdba74', ground: '#450a0a', floor: '#3f231d', ring: '#ef4444' },
  { id: 'aztec_temple', name: 'Templo Asteca', bg: '#0c1f17', fog: '#122b20', sky: '#bbf7d0', ground: '#1c3829', floor: '#42483b', ring: '#10b981' },
  { id: 'glacier', name: 'Glaciar', bg: '#0c1b2a', fog: '#162d44', sky: '#e0f2fe', ground: '#1e3a5f', floor: '#476b8a', ring: '#38bdf8' },
  { id: 'cyber_arena', name: 'Arena Cyber', bg: '#09091a', fog: '#131333', sky: '#a5f3fc', ground: '#1e1b4b', floor: '#1f2338', ring: '#22d3ee' },
  { id: 'hollow_earth', name: 'Terra Oca', bg: '#0f1d18', fog: '#183028', sky: '#a7f3d0', ground: '#1b3a30', floor: '#2d4739', ring: '#34d399' }
];

const ARENA_TOUCH_ACTIONS = [
  { action: 'light', label: 'Q', title: 'Combo Leve' },
  { action: 'heavy', label: 'E', title: 'Ataque Pesado' },
  { action: 'block', label: '🛡', title: 'Defesa / Parry' },
  { action: 'dash', label: '⚡', title: 'Dash' },
  { action: 'special', label: 'F', title: 'Especial' }
];

const ROUND_TIME = 90;
const ROUNDS_TO_WIN = 2;

export class ArenaX1Mode extends Mode3DBase {
  constructor(game, opts = {}) {
    super(game, { ...opts, modeId: 'arena_x1' });
    this.submode = opts.submode || (opts.local2P ? 'local2p' : opts.online ? 'online' : 'vs_ai');
    this.arenaIdx = Math.max(0, X1_ARENAS.findIndex((a) => a.id === opts.arenaId));
    if (opts.arenaId == null) this.arenaIdx = Math.floor(Math.random() * X1_ARENAS.length);
    this.arena = X1_ARENAS[this.arenaIdx];
    this.arenaRadius = 14.5;
    this.arenaGroup = null;
    this.arenaProps = null;
    this.pillars = [];
    this.orbs = [];
    this.orbTimer = 5;
    this.vfx = [];

    this.fighters = [];
    this.wins = [0, 0];
    this.roundNum = 1;
    this.roundTimer = ROUND_TIME;
    this.phase = 'intro'; // 'intro' | 'fight' | 'ko' | 'match_over'
    this.phaseTimer = 1.4;
    this.aiDifficulty = opts.aiDifficulty ?? 0.72;
    this.remoteState = null;

    this._hud = {};
    this._mid = new THREE.Vector3();
    this._tmpW = { x: 0, z: 0 };
  }

  /** Integrador de rede/LAN pode empurrar estado remoto do P2 aqui. */
  applyRemoteOpponentState(state) {
    this.remoteState = state || null;
  }

  async mount() {
    this.mountBase({
      background: this.arena.bg,
      fog: { color: this.arena.fog, near: 26, far: 78 },
      clearColor: this.arena.bg,
      touchActions: this.submode === 'local2p' ? null : ARENA_TOUCH_ACTIONS,
      cameraOpts: { distance: 12.5, pitch: 0.48, height: 1.5, yaw: 0, minDistance: 7, maxDistance: 20 }
    });

    this._buildArenaScene();
    this._spawnFighters();
    this._buildHud();
    this._startRound(1);
    this.onResize(this.viewportW, this.viewportH);
  }

  _buildArenaScene() {
    if (this.arenaGroup) {
      this.arenaProps?.dispose?.();
      disposeObject3D(this.arenaGroup);
      this.arenaGroup = null;
    }
    this.arena = X1_ARENAS[this.arenaIdx];
    this.scene.background = new THREE.Color(this.arena.bg);
    this.scene.fog = new THREE.Fog(this.arena.fog, 26, 78);

    const g = new THREE.Group();
    g.name = 'arena_x1_env';
    this.arenaGroup = g;
    this.group.add(g);

    g.add(buildModeLights({
      sky: this.arena.sky,
      ground: this.arena.ground,
      sun: '#fff4dc',
      intensity: 1.05,
      shadows: !this.lowSpec && !!Save?.data?.settings?.shadows
    }));

    // Tenta props da arena (DungeonProps.js) com fallback procedural seguro
    let propsRadius = 14.5;
    let rawPillars = [];
    try {
      const props = buildArenaProps(this.arena.id);
      if (props?.group) {
        this.arenaProps = props;
        g.add(props.group);
        if (props.radius > 6) propsRadius = props.radius;
        if (Array.isArray(props.pillars)) rawPillars = props.pillars;
      }
    } catch { /* fallback abaixo */ }
    this.arenaRadius = propsRadius;

    // Piso da arena + anel de borda brilhante
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(propsRadius + 0.6, propsRadius + 1.2, 0.8, 40),
      new THREE.MeshStandardMaterial({ color: this.arena.floor, roughness: 0.85, metalness: 0.08 })
    );
    floor.position.y = -0.4;
    floor.receiveShadow = true;
    g.add(floor);

    const trim = new THREE.Mesh(
      new THREE.RingGeometry(propsRadius - 0.35, propsRadius + 0.15, 48),
      new THREE.MeshBasicMaterial({ color: this.arena.ring, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    trim.rotation.x = -Math.PI / 2;
    trim.position.y = 0.03;
    g.add(trim);

    const centerMark = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.5, 32),
      new THREE.MeshBasicMaterial({ color: this.arena.ring, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    centerMark.rotation.x = -Math.PI / 2;
    centerMark.position.y = 0.025;
    g.add(centerMark);

    // Pilares destrutíveis (usa posições de buildArenaProps ou gera 4 simétricos)
    this.pillars = [];
    const pillarPositions = rawPillars.length
      ? rawPillars.slice(0, 6)
      : [
          { x: -6.5, z: -5.5, r: 0.95 },
          { x: 6.5, z: -5.5, r: 0.95 },
          { x: -6.5, z: 5.5, r: 0.95 },
          { x: 6.5, z: 5.5, r: 0.95 }
        ];
    for (const p of pillarPositions) {
      const r = p.r ?? 0.95;
      const pg = buildSculptedArenaPillar({ floor: this.arena.floor, ring: this.arena.ring, r });
      pg.position.set(p.x, 0, p.z);
      if (!this.lowSpec) {
        pg.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      }
      g.add(pg);
      this.pillars.push({ x: p.x, z: p.z, r, hp: 3, maxHp: 3, active: true, mesh: pg, body: pg.userData.body || pg });
    }
  }

  _spawnFighters() {
    for (const f of this.fighters) f.avatar.dispose();
    this.fighters = [];

    const p1Id = resolveDinoId(this.game, this.opts, 0);
    const p2Id = this.opts.opponentDinoId || resolveDinoId(this.game, this.opts, 1);
    const is2P = this.submode === 'local2p';

    const makeFighter = (slot, dinoId, x, yaw, tint, isAI, isRemote) => {
      const spec = getDinoSpec(dinoId);
      const avatar = new DinoAvatar(dinoId, {
        mover: { x, z: 0, yaw, radius: 0.78, speed: 6.6 + (spec?.stats?.speed || 5) * 0.25, dashSpeed: 18, dashCooldown: 0.7 },
        tint
      });
      this.group.add(avatar.root);
      const weaponKeys = Object.keys(DINO_WEAPONS_CATALOG);
      const chosenWeaponId = slot === 0
        ? (this.selectedWeaponId || 'iron_claws')
        : weaponKeys[(slot + this.arenaIdx) % weaponKeys.length];
      const wSpec = DINO_WEAPONS_CATALOG[chosenWeaponId] || null;
      if (avatar.model && wSpec) {
        attachWeaponToDinoModel(avatar.model, chosenWeaponId);
      }
      const maxHp = 110 + (spec?.stats?.hp || 4) * 14;
      const atk = Math.round((11 + (spec?.stats?.attack || 5) * 1.6) * (wSpec?.damageMult || 1));
      const def = 1 - clamp(((spec?.stats?.defense || 4) - 4) * 0.03, -0.1, 0.22);
      return {
        slot,
        dinoId,
        weaponId: chosenWeaponId,
        weaponName: wSpec?.name || 'Garras Naturais',
        specialMeta: getSpeciesSpecialMeta(dinoId),
        name: spec?.name || dinoId,
        abilityName: spec?.ability || 'Fúria Ancestral',
        avatar,
        mover: avatar.mover,
        controls: slot === 0
          ? new PlayerControls(this.keys, is2P ? P1_SPLIT_BINDINGS : P1_BINDINGS, this.touch)
          : (is2P ? new PlayerControls(this.keys, P2_BINDINGS, null) : null),
        isAI,
        isRemote,
        maxHp,
        hp: maxHp,
        trailHp: maxHp,
        stamina: 100,
        fury: 0,
        comboStep: 0,
        comboReset: 0,
        actionState: 'idle', // 'idle' | 'windup' | 'active' | 'recover' | 'block' | 'stun'
        actionTimer: 0,
        currentMove: null,
        moveHitDone: false,
        blockStart: 0,
        parryWindow: 0,
        atk,
        def,
        aiTimer: 0.2,
        aiIntent: 'approach'
      };
    };

    this.fighters.push(
      makeFighter(0, p1Id, -5.5, -Math.PI / 2, '#38bdf8', false, false),
      makeFighter(1, p2Id, 5.5, Math.PI / 2, '#f43f5e', this.submode === 'vs_ai', this.submode === 'online')
    );
  }

  _buildHud() {
    const [p1, p2] = this.fighters;
    const modeTag = this.submode === 'local2p' ? '2P LOCAL' : this.submode === 'online' ? 'ONLINE / LAN' : 'VS IA';
    const el = document.createElement('div');
    el.className = 'm3d-hud-layer';
    el.innerHTML = `
      <div class="m3d-x1-top">
        <div class="m3d-x1-fighter is-p1">
          <div class="m3d-x1-name-row">
            <span class="m3d-x1-name">${escapeHtml(p1.name)}</span>
            <span class="m3d-x1-pips" data-pips="0"></span>
          </div>
          <div class="m3d-bar m3d-bar-hp"><div class="m3d-bar-trail" data-trail="0"></div><div class="m3d-bar-fill" data-hp="0"></div></div>
          <div class="m3d-x1-subbars">
            <div class="m3d-bar m3d-bar-stam"><div class="m3d-bar-fill" data-stam="0"></div></div>
            <div class="m3d-bar m3d-bar-fury"><div class="m3d-bar-fill" data-fury="0"></div></div>
          </div>
        </div>

        <div class="m3d-x1-center">
          <div class="m3d-x1-round" data-round>ROUND 1</div>
          <div class="m3d-x1-timer" data-timer>90</div>
          <div class="m3d-x1-arena-tag" data-arena>${escapeHtml(this.arena.name)} · ${modeTag}</div>
        </div>

        <div class="m3d-x1-fighter is-p2">
          <div class="m3d-x1-name-row">
            <span class="m3d-x1-pips" data-pips="1"></span>
            <span class="m3d-x1-name">${escapeHtml(p2.name)}</span>
          </div>
          <div class="m3d-bar m3d-bar-hp"><div class="m3d-bar-trail" data-trail="1"></div><div class="m3d-bar-fill" data-hp="1"></div></div>
          <div class="m3d-x1-subbars">
            <div class="m3d-bar m3d-bar-fury"><div class="m3d-bar-fill" data-fury="1"></div></div>
            <div class="m3d-bar m3d-bar-stam"><div class="m3d-bar-fill" data-stam="1"></div></div>
          </div>
        </div>
      </div>

      <div class="m3d-corner-actions">
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="weapon">${uiIcon('claw', { size: 15 })} Arma: ${escapeHtml(p1.weaponName)}</button>
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="combos">${uiIcon('scroll', { size: 15 })} Combos</button>
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="family">${this.familyMode !== false ? 'Modo Família: ON' : 'Modo Família: OFF'}</button>
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="arena">${uiIcon('arena', { size: 15 })} Arena</button>
        <button type="button" class="m3d-btn m3d-btn-ghost" data-act="mode">${this.submode === 'local2p' ? `${uiIcon('mecha', { size: 15 })} VS IA` : `${uiIcon('multiplayer', { size: 15 })} 2P Local`}</button>
        <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">${uiIcon('close', { size: 15 })} Menu</button>
      </div>

      <div id="m3d-x1-combo-drawer" class="dd-glass-card" style="display:none; position:absolute; right:16px; top:112px; padding:12px 14px; max-width:320px; z-index:8; font-size:0.78rem;">
        <strong style="color:#fde047; display:block; margin-bottom:6px;">Tabela de Combos &amp; Especial (${escapeHtml(p1.specialMeta?.name || p1.abilityName)})</strong>
        ${FIGHTING_COMBO_TABLE.map((c) => `<div style="margin-bottom:5px;"><b>${escapeHtml(c.name)}</b> (+${c.bonusDamage} dano): <span style="color:#a5f3fc;">${escapeHtml(c.hint)}</span></div>`).join('')}
      </div>

      <div class="m3d-controls-hint">
        <span><b>WASD</b> Mover</span><span><b>Q</b> Leve</span><span><b>E</b> Pesado</span><span><b>Shift</b> Defesa/Parry</span><span><b>Espaço</b> Dash</span><span><b>F</b> Especial (Fúria 100%)</span>
        ${this.submode === 'local2p' ? '<span class="m3d-hint-p2">P2: Setas · Enter · RCtrl · RShift · /</span>' : ''}
      </div>
    `;
    this.overlay.appendChild(el);

    this._hud = {
      root: el,
      hp: [el.querySelector('[data-hp="0"]'), el.querySelector('[data-hp="1"]')],
      trail: [el.querySelector('[data-trail="0"]'), el.querySelector('[data-trail="1"]')],
      stam: [el.querySelector('[data-stam="0"]'), el.querySelector('[data-stam="1"]')],
      fury: [el.querySelector('[data-fury="0"]'), el.querySelector('[data-fury="1"]')],
      pips: [el.querySelector('[data-pips="0"]'), el.querySelector('[data-pips="1"]')],
      round: el.querySelector('[data-round]'),
      timer: el.querySelector('[data-timer]'),
      arena: el.querySelector('[data-arena]'),
      modeBtn: el.querySelector('[data-act="mode"]')
    };

    this.listen(el.querySelector('[data-act="exit"]'), 'click', () => this.requestExit({ wins: [...this.wins] }));
    this.listen(el.querySelector('[data-act="combos"]'), 'click', () => {
      const drawer = el.querySelector('#m3d-x1-combo-drawer');
      if (drawer) drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    });
    this.listen(el.querySelector('[data-act="family"]'), 'click', (ev) => {
      this.familyMode = this.familyMode === false;
      ev.currentTarget.textContent = this.familyMode ? 'Modo Família: ON' : 'Modo Família: OFF';
      this.toast(this.familyMode ? 'Modo Família ativado (finalizações suaves)' : 'Modo Família desativado');
    });
    this.listen(el.querySelector('[data-act="weapon"]'), 'click', (ev) => {
      const keys = Object.keys(DINO_WEAPONS_CATALOG);
      const curIdx = Math.max(0, keys.indexOf(this.selectedWeaponId || 'iron_claws'));
      this.selectedWeaponId = keys[(curIdx + 1) % keys.length];
      this._spawnFighters();
      ev.currentTarget.innerHTML = `${uiIcon('claw', { size: 15 })} Arma: ${escapeHtml(this.fighters[0].weaponName)}`;
      this.toast(`Arma equipada: ${this.fighters[0].weaponName}`);
    });
    this.listen(el.querySelector('[data-act="arena"]'), 'click', () => {
      this.arenaIdx = (this.arenaIdx + 1) % X1_ARENAS.length;
      this._buildArenaScene();
      this._hud.arena.textContent = `${this.arena.name} · ${this.submode === 'local2p' ? '2P LOCAL' : this.submode === 'online' ? 'ONLINE / LAN' : 'VS IA'}`;
      this.toast(`Arena: ${this.arena.name}`);
    });
    this.listen(this._hud.modeBtn, 'click', () => {
      this.submode = this.submode === 'local2p' ? 'vs_ai' : 'local2p';
      this.wins = [0, 0];
      this._spawnFighters();
      this._hud.modeBtn.innerHTML = this.submode === 'local2p'
        ? `${uiIcon('mecha', { size: 15 })} VS IA`
        : `${uiIcon('multiplayer', { size: 15 })} 2P Local`;
      this._hud.arena.textContent = `${this.arena.name} · ${this.submode === 'local2p' ? '2P LOCAL' : 'VS IA'}`;
      this._startRound(1);
    });
  }

  _startRound(num) {
    this.roundNum = num;
    this.roundTimer = ROUND_TIME;
    this.phase = 'intro';
    this.phaseTimer = 1.45;
    this._clearOrbs();

    // Restaura pilares no início do round
    for (const p of this.pillars) {
      p.hp = p.maxHp;
      p.active = true;
      p.mesh.visible = true;
      p.mesh.scale.setScalar(1);
    }

    this.fighters.forEach((f, idx) => {
      f.hp = f.maxHp;
      f.trailHp = f.maxHp;
      f.stamina = 100;
      f.fury = Math.min(100, f.fury + (num > 1 ? 20 : 0));
      f.actionState = 'idle';
      f.actionTimer = 0;
      f.currentMove = null;
      f.comboStep = 0;
      f.avatar.dead = false;
      f.avatar.victory = false;
      f.mover.pos.set(idx === 0 ? -5.5 : 5.5, 0, 0);
      f.mover.vel.set(0, 0);
      f.mover.kb.set(0, 0);
      f.mover.vy = 0;
      f.mover.grounded = true;
      f.mover.yaw = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
      f.avatar.sync(0.016);
    });

    this.rig.snap(new THREE.Vector3(0, 0.5, 0));
    this.banner(`ROUND ${num}`, this.arena.name, 'is-amber', 1350);
    this._syncHud(0.016);
  }

  update(dt) {
    if (!this.mounted || this.isPaused()) return;
    const simDt = this.baseTick(dt);

    if (simDt > 0) {
      this._updatePhase(simDt);
      this._updateOrbs(simDt);
      this._updateVfx(simDt);

      const [p1, p2] = this.fighters;
      if (this.phase === 'fight') {
        this.roundTimer = Math.max(0, this.roundTimer - simDt);
        this._updateFighter(p1, p2, simDt);
        this._updateFighter(p2, p1, simDt);
        separateMovers(p1.mover, p2.mover);
        p1.mover.clampToBounds({ r: this.arenaRadius });
        p2.mover.clampToBounds({ r: this.arenaRadius });
        if (this.roundTimer <= 0) this._finishRound(p1.hp >= p2.hp ? 0 : 1, 'TEMPO ESGOTADO!');
      } else {
        for (const f of this.fighters) {
          f.mover.step(simDt, 0, 0, { rooted: true });
          f.mover.clampToBounds({ r: this.arenaRadius });
        }
      }

      for (const f of this.fighters) f.avatar.sync(simDt);

      // Câmera dinâmica enquadra os dois lutadores
      this._mid.lerpVectors(p1.mover.pos, p2.mover.pos, 0.5);
      const sep = p1.mover.pos.distanceTo(p2.mover.pos);
      this.rig.update(simDt, this._mid, clamp((sep - 6) * 0.55, 0, 8));
      this._syncHud(simDt);
    }

    this.baseEndFrame(dt);
  }

  _updatePhase(dt) {
    if (this.phase === 'intro') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phase = 'fight';
        this.banner('LUTE!', '', 'is-emerald', 850);
        this.sfx('roar');
      }
    } else if (this.phase === 'ko') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.wins[0] >= ROUNDS_TO_WIN || this.wins[1] >= ROUNDS_TO_WIN) {
          this._showMatchResult(this.wins[0] >= ROUNDS_TO_WIN ? 0 : 1);
        } else {
          this._startRound(this.roundNum + 1);
        }
      }
    }
  }

  _updateFighter(f, foe, dt) {
    const m = f.mover;
    if (f.comboReset > 0) {
      f.comboReset -= dt;
      if (f.comboReset <= 0) f.comboStep = 0;
    }
    if (f.parryWindow > 0) f.parryWindow = Math.max(0, f.parryWindow - dt);
    if (f.actionState !== 'block') f.stamina = Math.min(100, f.stamina + 20 * dt);

    // Estado remoto (Online/LAN)
    if (f.isRemote && this.remoteState) {
      m.pos.x = lerp(m.pos.x, this.remoteState.x ?? m.pos.x, 0.35);
      m.pos.z = lerp(m.pos.z, this.remoteState.z ?? m.pos.z, 0.35);
      if (this.remoteState.yaw !== undefined) m.yaw = this.remoteState.yaw;
      if (this.remoteState.hp !== undefined) f.hp = clamp(this.remoteState.hp, 0, f.maxHp);
      return;
    }

    const input = f.isAI ? this._thinkAI(f, foe, dt) : this._readHuman(f);

    // Processa estados temporizados
    if (f.actionState === 'stun') {
      f.actionTimer -= dt;
      if (f.actionTimer <= 0) f.actionState = 'idle';
      m.step(dt, 0, 0, { rooted: true });
      this._collidePillars(m, f);
      return;
    }

    if (f.actionState === 'windup' || f.actionState === 'active' || f.actionState === 'recover') {
      f.actionTimer -= dt;
      const mv = f.currentMove;
      if (f.actionState === 'windup' && f.actionTimer <= 0) {
        f.actionState = 'active';
        f.actionTimer = mv.active;
        f.moveHitDone = false;
        if (mv.lunge > 0) {
          const dir = m.forward();
          m.applyImpulse(dir.x * mv.lunge, dir.y * mv.lunge, mv.up || 0);
        }
        if (mv.special) this._spawnShockwave(m.pos, mv.range, f.slot === 0 ? '#38bdf8' : '#f43f5e');
      } else if (f.actionState === 'active') {
        if (!f.moveHitDone) this._checkHit(f, foe, mv);
        if (f.actionTimer <= 0) {
          f.actionState = 'recover';
          f.actionTimer = mv.recover;
        }
      } else if (f.actionState === 'recover' && f.actionTimer <= 0) {
        f.actionState = 'idle';
        f.currentMove = null;
      }
      m.step(dt, 0, 0, { rooted: true });
      this._collidePillars(m, f);
      return;
    }

    // Defesa / Parry
    if (input.block && f.stamina > 8) {
      if (f.actionState !== 'block') {
        f.actionState = 'block';
        f.parryWindow = 0.22;
      }
      f.stamina = Math.max(0, f.stamina - 14 * dt);
      m.faceTowards(foe.mover.pos.x, foe.mover.pos.z, dt, 18);
      m.step(dt, input.mx * 0.25, input.mz * 0.25, { lockYaw: true });
      this._collidePillars(m, f);
      return;
    } else if (f.actionState === 'block') {
      f.actionState = 'idle';
    }

    // Dash com i-frames
    if (input.dash && f.stamina >= 18 && m.dodge(input.mx, input.mz)) {
      f.stamina -= 18;
      this.sfx('jump');
    }

    // Ataques
    if (input.special && f.fury >= 100) {
      this._startMove(f, foe, {
        name: f.abilityName, dmg: f.atk * 2.35, range: 4.4, arc: Math.PI,
        windup: 0.22, active: 0.16, recover: 0.36, lunge: 11, kb: 16, up: 6.5,
        furyGain: 0, special: true, anim: 'lunge'
      });
      f.fury = 0;
      f.avatar.roar();
      this.floaters.spawn(m.pos, `⚡ ${f.abilityName}!`, 'is-special');
      this.rig.shake(0.45);
      return;
    }

    if (input.heavy && f.stamina >= 24) {
      f.stamina -= 24;
      this._startMove(f, foe, {
        name: 'Pesado', dmg: f.atk * 1.65, range: 3.1, arc: 1.5,
        windup: 0.24, active: 0.12, recover: 0.34, lunge: 12, kb: 13.5, up: 5.5,
        furyGain: 18, anim: 'headbutt'
      });
      return;
    }

    if (input.light && f.stamina >= 10) {
      f.stamina -= 10;
      f.comboStep = (f.comboStep % 3) + 1;
      f.comboReset = 0.85;
      const fin = f.comboStep === 3;
      this._startMove(f, foe, {
        name: fin ? 'Finalizador' : 'Combo',
        dmg: f.atk * (fin ? 1.3 : 0.85),
        range: fin ? 2.8 : 2.4,
        arc: 1.35,
        windup: fin ? 0.14 : 0.08,
        active: 0.09,
        recover: fin ? 0.24 : 0.14,
        lunge: fin ? 7.5 : 3.5,
        kb: fin ? 10 : 4.2,
        up: fin ? 3.2 : 0,
        furyGain: fin ? 14 : 9,
        anim: fin ? 'tail' : 'bite'
      });
      return;
    }

    // Movimento livre
    m.step(dt, input.mx, input.mz);
    if (!m.moving) m.faceTowards(foe.mover.pos.x, foe.mover.pos.z, dt, 10);
    this._collidePillars(m, f);
  }

  _startMove(f, foe, mv) {
    f.mover.faceTowards(foe.mover.pos.x, foe.mover.pos.z, 1, 99);
    f.actionState = 'windup';
    f.actionTimer = mv.windup;
    f.currentMove = mv;
    f.moveHitDone = false;
    f.avatar.attack(mv.anim, mv.windup + mv.active + mv.recover * 0.5);
  }

  _checkHit(atk, def, mv) {
    // Checa pilares destrutíveis no alcance
    const fwd = atk.mover.forward();
    for (const p of this.pillars) {
      if (!p.active) continue;
      const dx = p.x - atk.mover.pos.x;
      const dz = p.z - atk.mover.pos.z;
      const d = Math.hypot(dx, dz);
      if (d <= mv.range + p.r) {
        const dot = (dx * fwd.x + dz * fwd.y) / Math.max(0.001, d);
        if (dot > 0.3 || mv.special) {
          p.hp -= mv.special ? 3 : 1;
          if (p.hp <= 0) {
            p.active = false;
            p.mesh.visible = false;
            this.floaters.spawn(new THREE.Vector3(p.x, 1, p.z), '💥 Pilar destruído!', 'is-amber');
            this._spawnOrbAt(p.x, p.z);
          } else {
            p.mesh.scale.set(1, 0.8 + p.hp * 0.07, 1);
          }
        }
      }
    }

    if (def.mover.invulnerable) return;
    const dx = def.mover.pos.x - atk.mover.pos.x;
    const dz = def.mover.pos.z - atk.mover.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > mv.range + def.mover.radius) return;
    const dot = (dx * fwd.x + dz * fwd.y) / Math.max(0.001, d);
    if (!mv.special && dot < Math.cos(mv.arc)) return;

    atk.moveHitDone = true;
    const nx = dx / Math.max(0.001, d);
    const nz = dz / Math.max(0.001, d);

    // Parry perfeito!
    if (def.actionState === 'block' && def.parryWindow > 0) {
      def.fury = Math.min(100, def.fury + 28);
      def.stamina = Math.min(100, def.stamina + 25);
      atk.actionState = 'stun';
      atk.actionTimer = 0.7;
      atk.mover.applyImpulse(-nx * 9, -nz * 9, 2);
      this.hitStop = 0.09;
      this.rig.shake(0.32);
      this.floaters.spawn(def.mover.pos, '✦ PARRY!', 'is-cyan');
      this.sfx('shield');
      return;
    }

    // Bloqueio normal
    if (def.actionState === 'block') {
      const chip = Math.round(mv.dmg * 0.22 * def.def);
      def.hp = Math.max(1, def.hp - chip);
      def.stamina = Math.max(0, def.stamina - 18);
      def.mover.applyImpulse(nx * mv.kb * 0.45, nz * mv.kb * 0.45, 0);
      atk.fury = Math.min(100, atk.fury + mv.furyGain * 0.5);
      this.hitStop = 0.04;
      this.floaters.spawn(def.mover.pos, `🛡 -${chip}`, 'is-muted');
      this.sfx('hit');
      return;
    }

    // Acerto limpo
    const dmg = Math.max(4, Math.round(mv.dmg * def.def));
    def.hp = Math.max(0, def.hp - dmg);
    def.fury = Math.min(100, def.fury + 12);
    atk.fury = Math.min(100, atk.fury + mv.furyGain);
    def.actionState = 'stun';
    def.actionTimer = mv.special ? 0.48 : 0.26;
    def.mover.applyImpulse(nx * mv.kb, nz * mv.kb, mv.up);
    def.avatar.hurt();
    this.hitStop = mv.special ? 0.1 : 0.055;
    this.rig.shake(mv.special ? 0.5 : 0.22);
    this.floaters.spawn(def.mover.pos, `-${dmg}`, mv.special ? 'is-crit' : 'is-dmg');
    this.sfx('hit');

    if (def.hp <= 0) this._finishRound(atk.slot, 'K.O.!');
  }

  _collidePillars(m, f) {
    const hit = m.pushOutCircles(this.pillars);
    if (hit && Math.hypot(m.kb.x, m.kb.y) > 7) {
      hit.hp -= 1;
      if (hit.hp <= 0) {
        hit.active = false;
        hit.mesh.visible = false;
        this.floaters.spawn(new THREE.Vector3(hit.x, 1, hit.z), '💥 Pilar!', 'is-amber');
        this._spawnOrbAt(hit.x, hit.z);
      }
      f.hp = Math.max(1, f.hp - 5);
    }
  }

  _readHuman(f) {
    const c = f.controls;
    const mv = c.move();
    this.rig.toWorld(mv.x, mv.y, this._tmpW);
    return {
      mx: this._tmpW.x,
      mz: this._tmpW.z,
      light: c.pressed('light'),
      heavy: c.pressed('heavy'),
      block: c.held('block'),
      dash: c.pressed('dash'),
      special: c.pressed('special')
    };
  }

  _thinkAI(f, foe, dt) {
    const dx = foe.mover.pos.x - f.mover.pos.x;
    const dz = foe.mover.pos.z - f.mover.pos.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const nx = dx / dist;
    const nz = dz / dist;

    f.aiTimer -= dt;
    if (f.aiTimer <= 0) {
      f.aiTimer = 0.22 + (1 - this.aiDifficulty) * 0.32;
      const r = Math.random();
      if (foe.actionState === 'windup' && dist < 3.5 && r < this.aiDifficulty * 0.68) f.aiIntent = 'defend';
      else if (this.orbs.length && f.fury < 80 && r < 0.32) f.aiIntent = 'orb';
      else if (dist < 3.2) f.aiIntent = r < 0.72 ? 'attack' : 'strafe';
      else f.aiIntent = 'approach';
    }

    const out = { mx: 0, mz: 0, light: false, heavy: false, block: false, dash: false, special: false };
    if (f.fury >= 100 && dist < 4.5 && Math.random() < 0.14) { out.special = true; return out; }

    if (f.aiIntent === 'defend') {
      if (Math.random() < 0.35) { out.dash = true; out.mx = -nz; out.mz = nx; }
      else out.block = true;
      return out;
    }
    if (f.aiIntent === 'orb' && this.orbs.length) {
      const o = this.orbs[0];
      const odx = o.mesh.position.x - f.mover.pos.x;
      const odz = o.mesh.position.z - f.mover.pos.z;
      const od = Math.hypot(odx, odz) || 1;
      out.mx = odx / od; out.mz = odz / od;
      return out;
    }
    if (f.aiIntent === 'strafe') {
      out.mx = -nz * 0.85; out.mz = nx * 0.85;
      return out;
    }
    if (f.aiIntent === 'attack' && dist < 3.1) {
      if (Math.random() < 0.28) out.heavy = true;
      else out.light = true;
      return out;
    }
    out.mx = nx; out.mz = nz;
    if (dist > 7.5 && f.stamina > 55 && Math.random() < 0.04) out.dash = true;
    return out;
  }

  _spawnOrbAt(x, z) {
    if (this.orbs.length >= 3) return;
    const mesh = makeGlowOrb('#f59e0b', 0.42);
    mesh.position.set(x, 0.9, z);
    this.group.add(mesh);
    this.orbs.push({ mesh, t: 0 });
  }

  _updateOrbs(dt) {
    if (this.phase === 'fight') {
      this.orbTimer -= dt;
      if (this.orbTimer <= 0) {
        this.orbTimer = 8.5;
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * (this.arenaRadius - 5);
        this._spawnOrbAt(Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.t += dt;
      o.mesh.rotation.y += dt * 2.4;
      o.mesh.position.y = 0.9 + Math.sin(o.t * 3.5) * 0.22;
      for (const f of this.fighters) {
        if (Math.hypot(f.mover.pos.x - o.mesh.position.x, f.mover.pos.z - o.mesh.position.z) < 1.35) {
          f.fury = Math.min(100, f.fury + 35);
          f.stamina = Math.min(100, f.stamina + 30);
          this.floaters.spawn(f.mover.pos, '+35 FÚRIA', 'is-amber');
          this.sfx('coin');
          disposeObject3D(o.mesh);
          this.orbs.splice(i, 1);
          break;
        }
      }
    }
  }

  _clearOrbs() {
    for (const o of this.orbs) disposeObject3D(o.mesh);
    this.orbs.length = 0;
  }

  _spawnShockwave(pos, maxR, color) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.9, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.12, pos.z);
    this.group.add(mesh);
    this.vfx.push({ mesh, t: 0, dur: 0.42, maxR });
  }

  _updateVfx(dt) {
    for (let i = this.vfx.length - 1; i >= 0; i--) {
      const v = this.vfx[i];
      v.t += dt;
      const p = v.t / v.dur;
      if (p >= 1) { disposeObject3D(v.mesh); this.vfx.splice(i, 1); continue; }
      v.mesh.scale.setScalar(1 + p * v.maxR);
      v.mesh.material.opacity = (1 - p) * 0.85;
    }
  }

  _finishRound(winnerSlot, label) {
    if (this.phase !== 'fight') return;
    this.phase = 'ko';
    this.phaseTimer = 2.1;
    this.wins[winnerSlot] += 1;
    const winner = this.fighters[winnerSlot];
    const loser = this.fighters[1 - winnerSlot];
    winner.avatar.victory = true;
    loser.avatar.dead = true;
    this.hitStop = 0.16;
    this.banner(label, `${winner.name} vence o Round ${this.roundNum}!`, 'is-crit', 1900);
    this.sfx('victory');
    this._syncHud(0.016);
  }

  _showMatchResult(winnerSlot) {
    this.phase = 'match_over';
    const winner = this.fighters[winnerSlot];
    const rewardEggs = winnerSlot === 0 ? 45 : 15;
    try {
      if (Save?.data) {
        Save.data.eggs = (Save.data.eggs || 0) + rewardEggs;
        Save.save?.();
      }
    } catch { /* ignore */ }

    const modal = document.createElement('div');
    modal.className = 'm3d-modal-backdrop';
    modal.innerHTML = `
      <div class="m3d-modal">
        <div class="m3d-modal-eyebrow">ARENA X1 · MELHOR DE 3</div>
        <h2 class="m3d-modal-title">${escapeHtml(winner.name)} VENCEU!</h2>
        <p class="m3d-modal-sub">Placar final: ${this.wins[0]} × ${this.wins[1]} · +${rewardEggs} 🥚</p>
        <div class="m3d-modal-actions">
          <button type="button" class="m3d-btn m3d-btn-primary" data-act="rematch">Revanche</button>
          <button type="button" class="m3d-btn m3d-btn-ghost" data-act="next">Próxima Arena</button>
          <button type="button" class="m3d-btn m3d-btn-danger" data-act="exit">Voltar ao Menu</button>
        </div>
      </div>`;
    this.overlay.appendChild(modal);
    this.listen(modal.querySelector('[data-act="rematch"]'), 'click', () => {
      modal.remove();
      this.wins = [0, 0];
      this._startRound(1);
    });
    this.listen(modal.querySelector('[data-act="next"]'), 'click', () => {
      modal.remove();
      this.arenaIdx = (this.arenaIdx + 1) % X1_ARENAS.length;
      this._buildArenaScene();
      this._hud.arena.textContent = `${this.arena.name} · ${this.submode === 'local2p' ? '2P LOCAL' : 'VS IA'}`;
      this.wins = [0, 0];
      this._startRound(1);
    });
    this.listen(modal.querySelector('[data-act="exit"]'), 'click', () => this.requestExit({ winnerSlot, wins: [...this.wins], rewardEggs }));
  }

  _syncHud(dt) {
    const h = this._hud;
    if (!h.round) return;
    h.round.textContent = `ROUND ${this.roundNum}`;
    h.timer.textContent = String(Math.ceil(this.roundTimer)).padStart(2, '0');
    this.fighters.forEach((f, i) => {
      f.trailHp = lerp(f.trailHp, f.hp, Math.min(1, dt * 4.5));
      h.hp[i].style.width = `${(f.hp / f.maxHp) * 100}%`;
      h.trail[i].style.width = `${(f.trailHp / f.maxHp) * 100}%`;
      h.stam[i].style.width = `${f.stamina}%`;
      h.fury[i].style.width = `${f.fury}%`;
      h.fury[i].parentElement?.classList.toggle('is-full', f.fury >= 100);
      h.pips[i].innerHTML = Array.from({ length: ROUNDS_TO_WIN }, (_, k) => `<i class="m3d-pip${k < this.wins[i] ? ' is-won' : ''}"></i>`).join('');
    });
  }

  dispose() {
    this._clearOrbs();
    for (const v of this.vfx) disposeObject3D(v.mesh);
    this.vfx.length = 0;
    for (const f of this.fighters) f.avatar.dispose();
    this.fighters.length = 0;
    this.arenaProps?.dispose?.();
    this.disposeBase();
  }
}
