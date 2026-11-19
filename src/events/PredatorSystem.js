// Gerenciador Completo dos Predadores Alfa: Intro Skippable, Perseguição com Pressão Real & 5 Ataques Ativos Telegrafados.
import * as THREE from 'three';
import { Save } from '../systems/Save.js';
import { DIFFICULTY_PRESETS, getDangerTier } from '../game/Difficulty.js';
import { LANE_X, RIVER_LANE_X } from '../world/World.js';
import {
  applyPredatorMutatorVisuals,
  buildPredatorEggProp,
  buildPredatorModel,
  buildPredatorNestProp,
  getPredatorForBiome,
  getPredatorMutator,
  getPredatorSpec,
  normalizePredatorHabitat,
  pickRandomPredator,
  rollPredatorMutator
} from './PredatorModels.js';

export const PREDATOR_ATTACK_TYPES = [
  { id: 'lane_lunge', name: 'Bote de Faixa', telegraphSec: 0.75, damage: 1, hardOnly: false, label: '⚠️ BOTE DE FAIXA!' },
  { id: 'venom_spit', name: 'Cuspe Ácido', telegraphSec: 0.75, damage: 1, hardOnly: false, label: '☠️ CUSPE PROJÉTIL!' },
  { id: 'roar_wave', name: 'Onda de Rugido', telegraphSec: 0.75, damage: 0, hardOnly: false, label: '🔊 ONDA DE RUGIDO!' },
  { id: 'flank_cut', name: 'Corte de Flanco', telegraphSec: 0.75, damage: 1, hardOnly: false, durationSec: 2.5, label: '🗡️ CORTE DE FLANCO (2.5s)!' },
  { id: 'pack_call', name: 'Chamado da Matilha', telegraphSec: 0.75, damage: 1, hardOnly: true, label: '🐺 CHAMADO DA MATILHA!' }
];

function laneFromX(x, laneXs = LANE_X) {
  let best = 1;
  let bestDist = Infinity;
  for (let i = 0; i < laneXs.length; i++) {
    const d = Math.abs(x - laneXs[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export class PredatorSystem {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.headless = !!opts.headless;
    this.state = 'idle'; // 'idle' | 'intro' | 'chasing'
    this.activeModel = null;
    this.activeSpec = null;
    this.activeMutator = null;
    this.runPredatorSpec = null;
    this._lastRunPredatorId = null;
    this.nestGroup = null;
    this.nestEggMesh = null;
    this.stolenEggMesh = null;
    this._eggSnatched = false;
    this.introTimer = 0;
    this.introElapsed = 0;
    this.introMax = 4.4;
    this.currentShot = {
      pos: new THREE.Vector3(0, 2, -4),
      look: new THREE.Vector3(0, 1.2, 2),
      blendToChase: 0,
      act: 1
    };
    this.chaseTimer = 0;
    this.distance = 6.2;
    this.returningPredator = null;
    this.encounteredInRun = new Set();
    this.nextAutoScore = 950;
    this._stepAudioTimer = 0;
    this._roarTriggered = false;

    // Estado dos ataques ativos telegrafados (zero alocação por frame)
    this.attackCooldown = 2.4;
    this.pendingAttack = null;
    this.blockedFlanks = []; // { lane, x, remainingSec, hitCooldown }
    this.attacksExecuted = 0;
    this._lungeVisualTimer = 0;
    this._lungeVisualX = 0;

    // Marcadores visuais reutilizáveis de telegrafia de faixa (3 faixas)
    this.telegraphMarkers = this.headless
      ? [0, 1, 2].map(() => ({ visible: false, position: new THREE.Vector3(), material: { color: { set() {} }, opacity: 0.5 } }))
      : [0, 1, 2].map(() => {
          const mat = new THREE.MeshBasicMaterial({
            color: '#ff2e4c',
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 14), mat);
          mesh.rotation.x = -Math.PI / 2;
          mesh.visible = false;
          this.scene?.add?.(mesh);
          return mesh;
        });
  }

  _shouldPlayIntro(predatorId) {
    const s = Save.data.settings || {};
    if (s.disableIntro || s.introMode === 'off') return false;
    if (s.introMode === 'first_time') {
      const seen = Save.data.seenElements || [];
      return !seen.includes(`pred_intro_${predatorId}`);
    }
    return true;
  }

  _markIntroSeen(predatorId) {
    const s = Save.data.settings || {};
    if (s.introMode !== 'first_time') return;
    if (!Save.data.seenElements) Save.data.seenElements = [];
    const key = `pred_intro_${predatorId}`;
    if (!Save.data.seenElements.includes(key)) {
      Save.data.seenElements.push(key);
      Save.save();
    }
  }

  _selectRunPredator(biomeId, overrideId = null, habitat = 'land') {
    const pinned = Save.data.pinnedPredator || null;
    if (overrideId) return getPredatorSpec(overrideId);
    const normHab = normalizePredatorHabitat(habitat);
    if (pinned) {
      const pinnedSpec = getPredatorSpec(pinned);
      if ((pinnedSpec.habitat || 'land') === normHab) return pinnedSpec;
    }
    return pickRandomPredator(this._lastRunPredatorId || biomeId, normHab);
  }

  _spawnIntroProps(spec, leadX = 0, leadY = 0) {
    this._clearIntroProps();
    if (this.headless) return;
    const nest = new THREE.Group();
    const nestBase = buildPredatorNestProp(spec.habitat || 'land', spec.accent);
    nest.add(nestBase);

    const nestEgg = buildPredatorEggProp(spec.accent);
    nestEgg.position.y = 0.45;
    nest.add(nestEgg);

    nest.position.set(leadX, leadY, -2.4);
    this.scene.add(nest);
    this.nestGroup = nest;
    this.nestEggMesh = nestEgg;

    const heldEgg = buildPredatorEggProp(spec.accent);
    heldEgg.scale.setScalar(0.82);
    heldEgg.visible = false;
    this.scene.add(heldEgg);
    this.stolenEggMesh = heldEgg;
    this._eggSnatched = false;
  }

  _clearIntroProps() {
    if (this.nestGroup) {
      this.scene?.remove?.(this.nestGroup);
      this.nestGroup = null;
      this.nestEggMesh = null;
    }
    if (this.stolenEggMesh) {
      this.scene?.remove?.(this.stolenEggMesh);
      this.stolenEggMesh = null;
    }
    this._eggSnatched = false;
  }

  _hideTelegraphMarkers() {
    for (let i = 0; i < this.telegraphMarkers.length; i++) {
      this.telegraphMarkers[i].visible = false;
    }
  }

  _showTelegraphMarkers(lanes, laneXs, baseY = 0, color = '#ff2e4c') {
    this._hideTelegraphMarkers();
    if (this.headless) return;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const m = this.telegraphMarkers[lane];
      if (!m) continue;
      m.material.color.set(color);
      m.position.set(laneXs[lane] ?? 0, baseY + 0.07, -1.5);
      m.visible = true;
    }
  }

  startOpeningIntro(biomeId, ctx = {}, overrideId = null) {
    this.clearActiveModel();

    if (this.headless || ctx.headlessBot || ctx.isMultiplayer || ctx.isTestTrack || ctx.isTutorial) {
      this.state = 'idle';
      this.introTimer = 0;
      ctx.onPredatorIntroHud?.(null);
      return false;
    }

    const habitat = normalizePredatorHabitat(ctx.habitatMode || ctx.playerHabitat || 'land');
    const spec = this._selectRunPredator(biomeId, overrideId, habitat);
    this._lastRunPredatorId = spec.id;
    this.runPredatorSpec = spec;

    if (!this._shouldPlayIntro(spec.id)) {
      this.state = 'idle';
      this.introTimer = 0;
      ctx.onPredatorIntroHud?.(null);
      return false;
    }
    this._markIntroSeen(spec.id);

    this.activeSpec = spec;
    this.activeModel = buildPredatorModel(spec.id);
    this.activeModel.root.scale.setScalar(1.42);
    const startX = ctx.leadX || 0;
    const startY = ctx.leadY || 0;
    this.activeModel.root.position.set(startX + 0.65, startY, 12.2);
    this.activeModel.root.rotation.y = 0;
    this.scene.add(this.activeModel.root);

    this._spawnIntroProps(spec, startX, startY);

    this.state = 'intro';
    this.introMax = 4.4;
    this.introTimer = this.introMax;
    this.introElapsed = 0;
    this._roarTriggered = false;
    this.currentShot.pos.set(startX - 2.8, startY + 1.75, -4.8);
    this.currentShot.look.set(startX + 0.2, startY + 1.05, -0.4);
    this.currentShot.blendToChase = 0;
    this.currentShot.act = 1;

    ctx.onChaserHudUpdate?.(false);
    ctx.onPredatorIntroHud?.({
      spec,
      act: 1,
      actLabel: '🥚 ATO 1/3: O SAQUE DO NINHO • Espaço/Clique pula',
      remaining: this.introTimer,
      total: this.introMax,
      reason: `🥚 Você saqueou o ninho de ${spec.name}!`
    });
    return true;
  }

  startEncounter(biomeId, ctx = {}, overrideId = null) {
    this.clearActiveModel();

    const habitat = normalizePredatorHabitat(ctx.habitatMode || ctx.playerHabitat || 'land');
    const pinned = Save.data.pinnedPredator || null;
    const pinnedSpec = pinned ? getPredatorSpec(pinned) : null;
    const runMatchesHabitat = this.runPredatorSpec && (this.runPredatorSpec.habitat || 'land') === habitat;
    const spec = overrideId
      ? getPredatorSpec(overrideId)
      : (pinnedSpec && (pinnedSpec.habitat || 'land') === habitat
        ? pinnedSpec
        : (runMatchesHabitat ? this.runPredatorSpec : getPredatorForBiome(biomeId, habitat)));

    const diffId = ctx.difficulty?.id || ctx.difficultyId || 'normal';
    const diffCfg = ctx.difficulty || DIFFICULTY_PRESETS[diffId] || DIFFICULTY_PRESETS.normal;
    const danger = getDangerTier(ctx.score || 0);
    const mutator = ctx.mutatorId
      ? getPredatorMutator(ctx.mutatorId)
      : rollPredatorMutator(diffId, danger.tier, ctx.rng || Math.random);

    this.activeSpec = spec;
    this.activeMutator = mutator;

    if (!this.headless) {
      this.activeModel = buildPredatorModel(spec.id);
      if (mutator) applyPredatorMutatorVisuals(this.activeModel, mutator);
      this.activeModel.root.scale.setScalar(1.08);
      const startTrackX = ctx.leadX ?? (habitat === 'aquatic' ? (ctx.trackCenterX ?? 0) : 0);
      const startTrackY = ctx.leadY ?? (habitat === 'flying' ? 2.05 : 0);
      this.activeModel.root.position.set(startTrackX - 0.78, startTrackY, 4.6);
      this.activeModel.root.rotation.y = 0;
      this.scene?.add?.(this.activeModel.root);
    } else {
      this.activeModel = {
        root: { position: new THREE.Vector3(0, 0, 4.6), rotation: new THREE.Euler(), scale: new THREE.Vector3(1, 1, 1) },
        update() {}
      };
    }

    this.encounteredInRun.add(spec.id);
    const durMult = (mutator?.durationMult || 1.0) * (1 + Math.min(0.65, (danger.tier - 1) * 0.08));
    this.chaseTimer = (diffId === 'supreme' ? 21 : diffId === 'insane' ? 19 : diffId === 'hard' ? 17 : 14.5) * durMult;
    this.distance = diffId === 'supreme' ? 4.8 : diffId === 'insane' ? 5.2 : 5.8;
    this._stepAudioTimer = 0;
    this.pendingAttack = null;
    this.blockedFlanks.length = 0;
    this._lungeVisualTimer = 0;
    this.attackCooldown = Math.max(1.1, 2.2 * (diffCfg.predatorCooldownMult ?? 1.0) * (mutator?.attackCooldownMult ?? 1.0));

    this.state = 'chasing';
    this.introTimer = 0;
    ctx.onPredatorIntroHud?.(null);
    const mutLabel = mutator ? ` [${mutator.badge} ${mutator.name.toUpperCase()}]` : '';
    ctx.showBanner?.(`🥚 ${spec.name.toUpperCase()}${mutLabel} QUER SEU OVO DE VOLTA!`, mutator?.color || spec.accent, 3.0);
    ctx.onChaserHudUpdate?.(true, this.distance, spec);
    return true;
  }

  skipIntro(ctx = {}) {
    if (this.state !== 'intro') return false;
    const spec = this.activeSpec;
    this.state = 'idle';
    this.introTimer = 0;
    this.introElapsed = 0;
    this.clearActiveModel();
    ctx.onPredatorIntroHud?.(null);
    ctx.onChaserHudUpdate?.(false);
    if (spec) {
      ctx.onIntroEnd?.(spec);
    }
    return true;
  }

  updateIntro(dt, players, ctx = {}) {
    if (this.state !== 'intro' || !this.activeModel || !this.activeSpec) return false;

    this.introElapsed += dt;
    this.introTimer = Math.max(0, this.introMax - this.introElapsed);

    const lead = players?.[0];
    const lx = lead ? lead.x : 0;
    const ly = lead ? ((lead.baseY || 0) + lead.y) : 0;
    const lz = lead ? lead.z : 0;
    const px = lx + 0.55;
    let pz = 5.4;
    let py = ly;
    let roarScale = 0.45;
    let act = 1;
    let actLabel = '🥚 ATO 1/3: O SAQUE DO NINHO • Espaço/Clique pula';
    let blendToChase = 0;

    if (this.introElapsed >= 0.82 && !this._eggSnatched) {
      this._eggSnatched = true;
      if (this.nestEggMesh) this.nestEggMesh.visible = false;
      if (this.stolenEggMesh) this.stolenEggMesh.visible = true;
      ctx.sfx?.egg?.();
      ctx.particles?.emitExplosion?.(lx, ly + 0.9, -0.4, this.activeSpec.accent || '#fde047', 14, true);
      ctx.showFloatText?.(lead, `🥚 OVO DE ${this.activeSpec.name.toUpperCase()} ROUBADO!`, this.activeSpec.accent);
    }

    if (this.nestGroup) {
      if (!this._eggSnatched) {
        const uNest = Math.min(1, this.introElapsed / 0.82);
        this.nestGroup.position.set(lx, ly, -2.7 + uNest * 2.4);
      } else {
        this.nestGroup.position.z += dt * 16;
        if (this.nestGroup.position.z > 16) this.nestGroup.visible = false;
      }
    }

    if (this.stolenEggMesh && this._eggSnatched) {
      this.stolenEggMesh.position.set(lx, ly + 1.12 + Math.sin(this.introElapsed * 14) * 0.08, lz - 0.82);
      this.stolenEggMesh.rotation.y += dt * 4.8;
    }

    const t = this.introElapsed;
    if (t < 1.35) {
      act = 1;
      const u = Math.min(1, t / 1.35);
      const ease = 1 - Math.pow(1 - u, 3);
      pz = 12.2 - ease * (12.2 - 5.35);
      py = ly + Math.sin(u * Math.PI) * 0.45;
      roarScale = 0.25 + u * 0.45;
      this.currentShot.pos.set(lx - 2.75 - ease * 0.75, ly + 1.65 + ease * 0.45, -4.8 + ease * 6.1);
      this.currentShot.look.set(lx + ease * 0.35, ly + 1.0 + ease * 0.55, -0.4 + ease * 4.5);
    } else if (t < 3.05) {
      act = 2;
      actLabel = `🦖 ATO 2/3: A FÚRIA DE ${this.activeSpec.name.toUpperCase()}!`;
      const u = Math.min(1, (t - 1.35) / 1.7);
      const arc = Math.sin(u * Math.PI * 0.5);
      pz = 5.35 - Math.sin(u * Math.PI) * 0.95;
      roarScale = 0.7 + Math.sin(u * Math.PI) * 0.68;
      if (t >= 1.62 && !this._roarTriggered) {
        this._roarTriggered = true;
        ctx.sfx?.roar?.() || ctx.sfx?.meteor?.();
        ctx.cameraRig?.triggerShake?.(0.45, 0.68);
        ctx.particles?.emitExplosion?.(px, ly + 0.55, pz - 0.6, this.activeSpec.accent || '#fb923c', 18, true);
      }
      this.currentShot.pos.set(lx - 3.2 + arc * 6.0, ly + 1.48 + arc * 0.58, 1.35 - Math.sin(u * Math.PI) * 0.85);
      this.currentShot.look.set(px, ly + 1.78, pz - 0.4);
    } else {
      act = 3;
      actLabel = '💨 ATO 3/3: PERSEGUIÇÃO INICIADA!';
      const u = Math.min(1, (t - 3.05) / (this.introMax - 3.05));
      blendToChase = u * u * (3 - 2 * u);
      pz = 5.35 + blendToChase * 1.45;
      roarScale = Math.max(0.25, 1.0 - blendToChase * 0.7);
      this.currentShot.pos.set(lx + 2.8 - blendToChase * 1.4, ly + 2.06 + blendToChase * 1.4, 1.35 + blendToChase * 4.0);
      this.currentShot.look.set(lx, ly + 1.4, pz - 3.0 - blendToChase * 4.5);
    }
    this.currentShot.blendToChase = blendToChase;
    this.currentShot.act = act;

    this.activeModel.root.position.set(px, py, pz);
    this.activeModel.root.rotation.y = Math.sin(this.introElapsed * 2.8) * 0.11;
    this.activeModel.update(dt, roarScale, act === 2 ? 'intro' : 'chase');

    ctx.onPredatorIntroHud?.({
      spec: this.activeSpec,
      act,
      actLabel,
      remaining: this.introTimer,
      total: this.introMax,
      eggSnatched: this._eggSnatched,
      reason: this._eggSnatched
        ? `🥚 OVO ROUBADO! ${this.activeSpec.name} está furioso logo atrás!`
        : `🥚 Pegue o ovo no ninho de ${this.activeSpec.name}...`
    });

    if (this.introTimer <= 0) {
      this.skipIntro(ctx);
      return false;
    }
    return true;
  }

  consumeReturningPredator() {
    const p = this.returningPredator;
    this.returningPredator = null;
    return p;
  }

  getBlockedLanes() {
    const out = [];
    for (let i = 0; i < this.blockedFlanks.length; i++) {
      out.push(this.blockedFlanks[i].lane);
    }
    return out;
  }

  _pickNextAttack(lead, diffCfg, danger, laneXs, rng) {
    const allowPack = !!(diffCfg.allowPackCall || danger.tier >= 4 || this.activeMutator?.forcePackCall);
    const pool = allowPack
      ? PREDATOR_ATTACK_TYPES
      : PREDATOR_ATTACK_TYPES.filter((a) => !a.hardOnly);

    let chosen = pool[Math.floor(rng() * pool.length)] || PREDATOR_ATTACK_TYPES[0];
    if (this.activeMutator?.forcePackCall && allowPack && rng() < 0.42) {
      chosen = PREDATOR_ATTACK_TYPES[4]; // pack_call
    }

    const playerLane = lead ? laneFromX(lead.x || 0, laneXs) : 1;
    const minSafePaths = Math.max(1, diffCfg.minSafePaths ?? 1);
    const telegraphSec = Math.max(0.55, Number(((chosen.telegraphSec ?? 0.75) * (this.activeMutator?.telegraphMult ?? 1.0)).toFixed(2)));

    let lanes = [playerLane];
    if (chosen.id === 'flank_cut') {
      // Escolhe faixa do jogador ou adjacente, preservando ao menos minSafePaths livres
      const candidate = rng() < 0.6 ? playerLane : (playerLane === 1 ? (rng() < 0.5 ? 0 : 2) : 1);
      lanes = [candidate];
    } else if (chosen.id === 'pack_call') {
      // Bloqueia até (3 - minSafePaths) faixas (em Hard+ minSafePaths=1 -> 2 faixas, sempre sobra 1 segura!)
      const maxBlock = Math.max(1, Math.min(2, 3 - minSafePaths));
      if (maxBlock >= 2) {
        const other = (playerLane + 1 + Math.floor(rng() * 2)) % 3;
        lanes = [playerLane, other];
      } else {
        lanes = [playerLane];
      }
    }

    return {
      type: chosen.id,
      name: chosen.name,
      label: chosen.label,
      lane: lanes[0],
      lanes,
      x: laneXs[lanes[0]] ?? 0,
      remainingSec: telegraphSec,
      totalSec: telegraphSec,
      damage: (chosen.damage ?? 1) + (this.activeMutator?.extraDamage ?? 0),
      durationSec: chosen.durationSec ?? 0
    };
  }

  _executePendingAttack(atk, lead, laneXs, ctx) {
    this.attacksExecuted++;
    const spec = this.activeSpec;
    const mut = this.activeMutator;
    const playerLane = lead ? laneFromX(lead.x || 0, laneXs) : -1;
    const statusId = mut?.statusId || (atk.type === 'venom_spit' ? 'poison' : atk.type === 'roar_wave' ? 'stun_slow' : null);

    if (atk.type === 'lane_lunge') {
      this._lungeVisualTimer = 0.42;
      this._lungeVisualX = atk.x;
      ctx.spawnPredatorHazard?.({
        type: 'lane_lunge',
        lane: atk.lane,
        x: atk.x,
        telegraphSec: atk.totalSec,
        damage: atk.damage,
        predatorId: spec?.id
      });
      ctx.cameraRig?.triggerShake?.(0.32, 0.22);
      if (lead && !lead.dead && playerLane === atk.lane) {
        if (statusId) ctx.applyStatus?.(lead, statusId, 2.5);
        ctx.damagePlayer?.(lead, `bote de ${spec?.name || 'predador'}`);
        this.distance = Math.min(6.4, this.distance + 1.8);
      }
    } else if (atk.type === 'venom_spit') {
      ctx.spawnPredatorHazard?.({
        type: 'venom_spit',
        lane: atk.lane,
        x: atk.x,
        telegraphSec: atk.totalSec,
        damage: atk.damage,
        statusId: statusId || 'poison',
        predatorId: spec?.id
      });
      if (lead && !lead.dead && playerLane === atk.lane) {
        ctx.applyStatus?.(lead, statusId || 'poison', 3.0);
        ctx.damagePlayer?.(lead, `cuspe de ${spec?.name || 'predador'}`);
      }
    } else if (atk.type === 'roar_wave') {
      const staminaDrain = mut?.id === 'voltaic' ? 38 : 28;
      ctx.spawnPredatorHazard?.({
        type: 'roar_wave',
        lane: atk.lane,
        x: atk.x,
        telegraphSec: atk.totalSec,
        damage: 0,
        knockback: true,
        staminaDrain,
        predatorId: spec?.id
      });
      ctx.sfx?.roar?.(spec?.id);
      ctx.cameraRig?.triggerShake?.(0.42, 0.35);
      if (lead && !lead.dead) {
        if (typeof lead.stamina === 'number') {
          lead.stamina = Math.max(0, lead.stamina - staminaDrain);
        }
        ctx.applyStatus?.(lead, statusId || 'stun_slow', 2.2);
        // Empurrão/perda de ritmo encurta distância do predador
        this.distance = Math.max(1.85, this.distance - 0.65);
      }
    } else if (atk.type === 'flank_cut') {
      const dur = atk.durationSec || 2.5;
      ctx.spawnPredatorHazard?.({
        type: 'flank_cut',
        lane: atk.lane,
        x: atk.x,
        telegraphSec: atk.totalSec,
        durationSec: dur,
        damage: atk.damage,
        predatorId: spec?.id
      });
      // Substitui se já houver corte na mesma faixa para manter lista limitada
      const existing = this.blockedFlanks.find((f) => f.lane === atk.lane);
      if (existing) {
        existing.remainingSec = dur;
      } else {
        this.blockedFlanks.push({ lane: atk.lane, x: atk.x, remainingSec: dur, hitCooldown: 0 });
      }
      if (lead && !lead.dead && playerLane === atk.lane) {
        if (statusId) ctx.applyStatus?.(lead, statusId, 2.5);
        ctx.damagePlayer?.(lead, `corte de flanco de ${spec?.name || 'predador'}`);
      }
    } else if (atk.type === 'pack_call') {
      for (let i = 0; i < atk.lanes.length; i++) {
        const l = atk.lanes[i];
        ctx.spawnPredatorHazard?.({
          type: 'pack_call',
          lane: l,
          lanes: atk.lanes,
          x: laneXs[l] ?? 0,
          telegraphSec: atk.totalSec,
          damage: atk.damage,
          predatorId: spec?.id
        });
      }
      ctx.sfx?.roar?.(spec?.id);
      ctx.cameraRig?.triggerShake?.(0.36, 0.28);
      if (lead && !lead.dead && atk.lanes.includes(playerLane)) {
        if (statusId) ctx.applyStatus?.(lead, statusId, 2.5);
        ctx.damagePlayer?.(lead, `matilha de ${spec?.name || 'predador'}`);
        this.distance = Math.min(6.4, this.distance + 1.4);
      }
    }
  }

  update(dt, speed, score, players, ctx = {}) {
    if (this.state === 'intro') return;

    const diffId = ctx.difficulty?.id || ctx.difficultyId || 'normal';
    const diffCfg = ctx.difficulty || DIFFICULTY_PRESETS[diffId] || DIFFICULTY_PRESETS.normal;
    const danger = getDangerTier(score || 0);

    if (this.state === 'idle' && score >= this.nextAutoScore && !ctx.bossActive && !ctx.ufoActive) {
      const interval = Math.max(900, Math.round(1600 / Math.max(0.8, 1 + danger.eventFreqBonus * 0.45)));
      this.nextAutoScore += interval;
      this.startEncounter(ctx.currentBiome?.id || 'desert', { ...ctx, score });
      return;
    }

    if (!this.activeModel || !this.activeSpec) return;

    const lead = players?.[0];
    const laneXs = ctx.habitatMode === 'aquatic' && !ctx.isAquaticBiome ? RIVER_LANE_X : LANE_X;
    const baseY = ctx.habitatMode === 'flying' ? (lead?.baseY || 2.0) : 0;
    const rng = ctx.rng || Math.random;

    if (this.state === 'chasing') {
      this.chaseTimer -= dt;

      // CORREÇÃO CRÍTICA: paceBonus escala com velocidade de cruzeiro da dificuldade + Danger Tier + mutador.
      // O predador NUNCA recua sozinho em Insano/Supremo só porque speed >= 25.5!
      const mutPace = this.activeMutator?.paceMult ?? 1.0;
      const aggro = (diffCfg.predatorAggro ?? 1.0) * (0.78 + danger.predatorAggro * 0.22) * mutPace;
      const refCruiseSpeed = Math.max(
        18,
        (diffCfg.initialSpeed + diffCfg.maxSpeed) * 0.5 + danger.speedBonus * 0.55
      );
      const speedRatio = (speed || refCruiseSpeed) / refCruiseSpeed;
      const isBoosting = !!(lead && (lead.turboActive || lead.dashTimer > 0 || lead.speedBoostTimer > 0));

      let paceBonus;
      if (isBoosting) {
        // Turbo/Dash dá respiro real, mas mitigado pela agressividade em Supremo/Tier alto
        paceBonus = Math.max(0.35, 1.35 / Math.sqrt(Math.max(0.7, aggro)));
      } else if (speedRatio >= 1.22) {
        // Velocidade excepcional acima do cruzeiro: afasta lentamente
        paceBonus = Math.max(0.15, 0.55 / Math.sqrt(Math.max(0.7, aggro)));
      } else if (speedRatio < 0.86) {
        // Jogador perdeu ritmo/tropeçou: predador fecha rápido!
        paceBonus = -1.55 * aggro;
      } else {
        // Cruzeiro normal: predador mantém pressão ativa e encosta gradualmente
        paceBonus = -0.42 * aggro;
      }

      const decoyResist = this.activeMutator?.decoyResist ?? 0;
      const decoyPush = ctx.decoyTimer > 0 ? 3.2 * (1 - decoyResist) : 0;
      this.distance = Math.max(1.4, Math.min(9.2, this.distance + (paceBonus + decoyPush) * dt));

      // Atualiza faixas bloqueadas por Corte de Flanco (2.5s)
      const playerLane = lead ? laneFromX(lead.x || 0, laneXs) : -1;
      for (let i = this.blockedFlanks.length - 1; i >= 0; i--) {
        const fl = this.blockedFlanks[i];
        fl.remainingSec -= dt;
        if (fl.hitCooldown > 0) fl.hitCooldown -= dt;
        if (fl.remainingSec <= 0) {
          this.blockedFlanks.splice(i, 1);
        } else if (lead && !lead.dead && playerLane === fl.lane && fl.hitCooldown <= 0) {
          fl.hitCooldown = 1.1;
          ctx.damagePlayer?.(lead, `corte de flanco de ${this.activeSpec.name}`);
        }
      }

      // Máquina de ataques ativos telegrafados (0.75s antes da execução)
      if (this.pendingAttack) {
        this.pendingAttack.remainingSec -= dt;
        ctx.onPredatorTelegraph?.({
          type: this.pendingAttack.type,
          lane: this.pendingAttack.lane,
          lanes: this.pendingAttack.lanes,
          x: this.pendingAttack.x,
          remainingSec: Math.max(0, Number(this.pendingAttack.remainingSec.toFixed(2))),
          totalSec: this.pendingAttack.totalSec,
          label: this.pendingAttack.label,
          predatorId: this.activeSpec.id,
          predatorName: this.activeSpec.name,
          mutator: this.activeMutator?.id || null
        });
        if (!this.headless) {
          const pulse = 0.35 + Math.abs(Math.sin(this.chaseTimer * 22)) * 0.45;
          for (let i = 0; i < this.telegraphMarkers.length; i++) {
            if (this.telegraphMarkers[i].visible) this.telegraphMarkers[i].material.opacity = pulse;
          }
        }
        if (this.pendingAttack.remainingSec <= 0) {
          const atk = this.pendingAttack;
          this.pendingAttack = null;
          this._hideTelegraphMarkers();
          ctx.onPredatorTelegraph?.(null);
          this._executePendingAttack(atk, lead, laneXs, ctx);
          const baseCd = 2.8 / Math.max(0.75, Math.sqrt(aggro));
          this.attackCooldown = Math.max(
            1.15,
            baseCd * (diffCfg.predatorCooldownMult ?? 1.0) * (this.activeMutator?.attackCooldownMult ?? 1.0)
          );
        }
      } else {
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0 && this.distance <= 7.8) {
          this.pendingAttack = this._pickNextAttack(lead, diffCfg, danger, laneXs, rng);
          this._showTelegraphMarkers(
            this.pendingAttack.lanes,
            laneXs,
            baseY,
            this.activeMutator?.color || '#ff2e4c'
          );
          ctx.onPredatorTelegraph?.({
            type: this.pendingAttack.type,
            lane: this.pendingAttack.lane,
            lanes: this.pendingAttack.lanes,
            x: this.pendingAttack.x,
            remainingSec: this.pendingAttack.remainingSec,
            totalSec: this.pendingAttack.totalSec,
            label: this.pendingAttack.label,
            predatorId: this.activeSpec.id,
            predatorName: this.activeSpec.name,
            mutator: this.activeMutator?.id || null
          });
        }
      }

      if (this._lungeVisualTimer > 0) {
        this._lungeVisualTimer = Math.max(0, this._lungeVisualTimer - dt);
      }

      if (lead) {
        const trackCenterX = ctx.habitatMode === 'aquatic' ? (ctx.trackCenterX ?? 0) : 0;
        const flankX = lead.x >= trackCenterX ? -0.78 : 0.78;
        const targetX = this._lungeVisualTimer > 0 ? this._lungeVisualX : (lead.x + flankX * 0.75);
        this.activeModel.root.position.x += (targetX - this.activeModel.root.position.x) * Math.min(1, dt * (this._lungeVisualTimer > 0 ? 12 : 4.8));
        let targetY = (lead.baseY || 0) + Math.max(0, (lead.y || 0) * 0.25);
        if (ctx.habitatMode === 'flying') {
          targetY = Math.max(1.8, (lead.baseY || 0) + (lead.y || 0) * 0.85);
        } else if (ctx.habitatMode === 'aquatic') {
          const leadDiveSink = lead.inSubmerged ? 0.2 : (lead.diveDepth || 0) * 2.75;
          targetY = (lead.baseY || 0) + (lead.y || 0) * 0.72 - leadDiveSink;
        }
        this.activeModel.root.position.y += (targetY - this.activeModel.root.position.y) * Math.min(1, dt * 4.0);
      }
      this.activeModel.root.rotation.y = 0;
      const lungeOffset = this._lungeVisualTimer > 0 ? -1.1 : 0;
      const visualZ = Math.max(1.8, Math.min(5.9, 2.0 + (this.distance - 1.5) * 0.56 + lungeOffset));
      this.activeModel.root.position.z = visualZ;
      this.activeModel.update(dt, this.distance < 3.5 || this.pendingAttack ? 0.85 : 0.25);

      if (this.distance < 3.8) {
        this._stepAudioTimer -= dt;
        if (this._stepAudioTimer <= 0) {
          this._stepAudioTimer = Math.max(0.28, this.distance * 0.12);
          ctx.sfx?.step?.();
        }
      }

      ctx.onChaserHudUpdate?.(true, this.distance, this.activeSpec);

      if (this.distance <= 1.75 && lead && !lead.dead) {
        if (this.activeMutator?.statusId) {
          ctx.applyStatus?.(lead, this.activeMutator.statusId, 2.5);
        }
        ctx.damagePlayer?.(lead, `mordida de ${this.activeSpec.name}`);
        this.distance = 5.4;
      }

      if (this.distance >= 8.8 || this.chaseTimer <= 0) {
        const escapedSpec = this.activeSpec;
        const genuinelyOutran = this.distance >= 8.8;
        this.returningPredator = escapedSpec;
        this.pendingAttack = null;
        this.blockedFlanks.length = 0;
        this._hideTelegraphMarkers();
        ctx.onPredatorTelegraph?.(null);
        this.clearActiveModel();
        this.state = 'idle';
        ctx.onChaserHudUpdate?.(false, 0, null);

        // Recompensa drasticamente reduzida (sem farm grátis por timeout!)
        if (genuinelyOutran) {
          ctx.addScore?.(45);
          if (lead && !lead.isBot && !this.headless) {
            Save.addEggs(8);
          }
          ctx.showFloatText?.(lead, `💨 ${escapedSpec.name.toUpperCase()} DESPISTADO! +8 🥚`, '#ffd447');
        } else {
          ctx.addScore?.(25);
          ctx.showFloatText?.(lead, `⚠️ ${escapedSpec.name.toUpperCase()} RECUOU PARA EMBOSCAR!`, '#fb923c');
        }
        ctx.showBanner?.(`⚠️ ${escapedSpec.name} recuou — e pode voltar no Chefe do Bioma!`, escapedSpec.accent, 3.0);
      }
    }
  }

  clearActiveModel() {
    this._clearIntroProps();
    this._hideTelegraphMarkers();
    if (this.activeModel) {
      if (!this.headless) {
        this.scene?.remove?.(this.activeModel.root);
      }
      this.activeModel = null;
    }
    this.activeSpec = null;
    this.activeMutator = null;
    this.pendingAttack = null;
    this.blockedFlanks.length = 0;
  }

  reset() {
    this.state = 'idle';
    this.introTimer = 0;
    this.introElapsed = 0;
    this.chaseTimer = 0;
    this.distance = 6.2;
    this.returningPredator = null;
    this.nextAutoScore = 950;
    this._roarTriggered = false;
    this.attackCooldown = 2.4;
    this.attacksExecuted = 0;
    this._lungeVisualTimer = 0;
    this.clearActiveModel();
    this.encounteredInRun.clear();
  }
}

export { PREDATOR_CATALOG, PREDATOR_HUNT_MUTATORS } from './PredatorModels.js';
