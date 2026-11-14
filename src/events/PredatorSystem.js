// Gerenciador Completo dos 14 Predadores Originais: Intro Skippable (6-8s), Perseguição c/ Medidor & Retorno no Chefe.
import * as THREE from 'three';
import { Save } from '../systems/Save.js';
import {
  buildPredatorEggProp,
  buildPredatorModel,
  getPredatorForBiome,
  getPredatorSpec,
  pickRandomPredator
} from './PredatorModels.js';

export class PredatorSystem {
  constructor(scene) {
    this.scene = scene;
    this.state = 'idle'; // 'idle' | 'intro' | 'chasing'
    this.activeModel = null;
    this.activeSpec = null;
    this.runPredatorSpec = null;
    this._lastRunPredatorId = null;
    this.nestGroup = null;
    this.nestEggMesh = null;
    this.stolenEggMesh = null;
    this._eggSnatched = false;
    this.introTimer = 0;
    this.introElapsed = 0;
    this.introMax = 3.6;
    this.chaseTimer = 0;
    this.distance = 6.2;
    this.returningPredator = null;
    this.encounteredInRun = new Set();
    this.nextAutoScore = 950;
    this._stepAudioTimer = 0;
    this._roarTriggered = false;
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

  _selectRunPredator(biomeId, overrideId = null) {
    const pinned = Save.data.pinnedPredator || null;
    if (overrideId) return getPredatorSpec(overrideId);
    if (pinned) return getPredatorSpec(pinned);
    return pickRandomPredator(this._lastRunPredatorId || biomeId);
  }

  _spawnIntroProps(spec, leadX = 0, leadY = 0) {
    this._clearIntroProps();
    const nest = new THREE.Group();
    const twigMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
    const ring = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.24, 1.75), twigMat);
    ring.position.y = 0.12;
    nest.add(ring);

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
      this.scene.remove(this.nestGroup);
      this.nestGroup = null;
      this.nestEggMesh = null;
    }
    if (this.stolenEggMesh) {
      this.scene.remove(this.stolenEggMesh);
      this.stolenEggMesh = null;
    }
    this._eggSnatched = false;
  }

  startOpeningIntro(biomeId, ctx = {}, overrideId = null) {
    this.clearActiveModel();

    if (ctx.headlessBot || ctx.isMultiplayer || ctx.isTestTrack || ctx.isTutorial) {
      this.state = 'idle';
      this.introTimer = 0;
      ctx.onPredatorIntroHud?.(null);
      return false;
    }

    const spec = this._selectRunPredator(biomeId, overrideId);
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
    this.activeModel.root.scale.setScalar(1.36);
    this.activeModel.root.position.set(ctx.leadX ? ctx.leadX + 0.65 : 0.65, ctx.leadY || 0, 9.2);
    this.activeModel.root.rotation.y = 0;
    this.scene.add(this.activeModel.root);

    this._spawnIntroProps(spec, ctx.leadX || 0, ctx.leadY || 0);

    this.state = 'intro';
    this.introMax = 3.6;
    this.introTimer = this.introMax;
    this.introElapsed = 0;
    this._roarTriggered = false;

    ctx.onChaserHudUpdate?.(false);
    ctx.onPredatorIntroHud?.({
      spec,
      remaining: this.introTimer,
      total: this.introMax,
      reason: `🥚 Você roubou o ovo de ${spec.name}! Corra!`
    });
    return true;
  }

  startEncounter(biomeId, ctx = {}, overrideId = null) {
    this.clearActiveModel();

    const pinned = Save.data.pinnedPredator || null;
    const spec = overrideId
      ? getPredatorSpec(overrideId)
      : (pinned ? getPredatorSpec(pinned) : (this.runPredatorSpec || getPredatorForBiome(biomeId)));

    this.activeSpec = spec;
    this.activeModel = buildPredatorModel(spec.id);
    this.activeModel.root.scale.setScalar(1.08);
    this.activeModel.root.position.set(-0.78, 0, 4.6);
    this.activeModel.root.rotation.y = 0;
    this.scene.add(this.activeModel.root);

    this.encounteredInRun.add(spec.id);
    this.chaseTimer = 14.5;
    this.distance = 6.2;
    this._stepAudioTimer = 0;

    // Perseguição ativa no meio da corrida começa visível logo atrás do jogador, sem sequestrar a câmera nem bloquear a lente
    this.state = 'chasing';
    this.introTimer = 0;
    ctx.onPredatorIntroHud?.(null);
    ctx.showBanner?.(`🥚 ${spec.name.toUpperCase()} QUER SEU OVO DE VOLTA!`, spec.accent, 3.0);
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
    const ly = lead ? lead.y : 0;
    const lz = lead ? lead.z : 0;
    const px = lx + 0.58;
    let pz = 4.6;
    let py = ly;
    let roarScale = 1.0;

    // Fase 1 (0..0.72s): Jogador passa pelo ninho e pega o ovo luminoso
    if (this.introElapsed >= 0.72 && !this._eggSnatched) {
      this._eggSnatched = true;
      if (this.nestEggMesh) this.nestEggMesh.visible = false;
      if (this.stolenEggMesh) this.stolenEggMesh.visible = true;
      ctx.showFloatText?.(lead, `🥚 OVO ROUBADO DE ${this.activeSpec.name.toUpperCase()}!`, this.activeSpec.accent);
    }

    if (this.nestGroup) {
      this.nestGroup.position.z += dt * (this._eggSnatched ? 18 : 3.2);
      if (this.nestGroup.position.z > 14) this.nestGroup.visible = false;
    }

    if (this.stolenEggMesh && this._eggSnatched) {
      this.stolenEggMesh.position.set(lx, ly + 1.05 + Math.sin(this.introElapsed * 14) * 0.08, lz - 0.85);
      this.stolenEggMesh.rotation.y += dt * 4.5;
    }

    if (this.introElapsed < 0.95) {
      const u = Math.min(1, this.introElapsed / 0.95);
      const ease = 1 - Math.pow(1 - u, 3);
      pz = 9.2 - ease * (9.2 - 4.4);
      py = ly + Math.sin(u * Math.PI) * 0.55;
      roarScale = u * 0.75;
      if (u >= 0.72 && !this._roarTriggered) {
        this._roarTriggered = true;
        ctx.sfx?.roar?.() || ctx.sfx?.meteor?.();
        ctx.cameraRig?.triggerShake?.(0.38, 0.55);
      }
    } else if (this.introElapsed > this.introMax - 0.75) {
      const u = Math.min(1, (this.introElapsed - (this.introMax - 0.75)) / 0.75);
      const ease = u * u * (3 - 2 * u);
      pz = 4.4 + ease * 7.8;
      roarScale = Math.max(0.15, 1.0 - ease);
    } else {
      pz = 4.4 + Math.sin((this.introElapsed - 0.95) * 4.5) * 0.35;
    }

    this.activeModel.root.position.set(px, py, pz);
    this.activeModel.root.rotation.y = Math.sin(this.introElapsed * 2.4) * 0.1;
    this.activeModel.update(dt, roarScale, 'intro');

    ctx.onPredatorIntroHud?.({
      spec: this.activeSpec,
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

  update(dt, speed, score, players, ctx = {}) {
    if (this.state === 'intro') return;

    if (this.state === 'idle' && score >= this.nextAutoScore && !ctx.bossActive && !ctx.ufoActive) {
      this.nextAutoScore += 1600;
      this.startEncounter(ctx.currentBiome?.id || 'desert', ctx);
      return;
    }

    if (!this.activeModel || !this.activeSpec) return;

    const lead = players[0];

    if (this.state === 'chasing') {
      this.chaseTimer -= dt;
      const paceBonus = speed >= 25.5 ? 1.15 : (speed < 20 ? -1.45 : -0.25);
      const decoyPush = ctx.decoyTimer > 0 ? 3.8 : 0;
      this.distance = Math.max(1.4, Math.min(9.2, this.distance + (paceBonus + decoyPush) * dt));

      if (lead) {
        const flankX = lead.x >= (ctx.habitatMode === 'aquatic' ? 10 : 0) ? -0.78 : 0.78;
        const targetX = lead.x + flankX * 0.75;
        this.activeModel.root.position.x += (targetX - this.activeModel.root.position.x) * Math.min(1, dt * 4.4);
        const targetY = ctx.habitatMode === 'flying' ? Math.max(1.8, lead.y * 0.8) : 0;
        this.activeModel.root.position.y += (targetY - this.activeModel.root.position.y) * Math.min(1, dt * 4.0);
      }
      this.activeModel.root.rotation.y = 0;
      // Mantém o predador sempre visível atrás do dino (z = 2.2..5.9) e bem à frente da lente da câmera (z >= 9.4)
      const visualZ = Math.max(2.2, Math.min(5.9, 2.0 + (this.distance - 1.5) * 0.56));
      this.activeModel.root.position.z = visualZ;
      this.activeModel.update(dt, this.distance < 3.5 ? 0.85 : 0.25);

      // Som/pulsação de tensão quando o predador se aproxima (< 3.8m)
      if (this.distance < 3.8) {
        this._stepAudioTimer -= dt;
        if (this._stepAudioTimer <= 0) {
          this._stepAudioTimer = Math.max(0.28, this.distance * 0.12);
          ctx.sfx?.step?.();
        }
      }

      ctx.onChaserHudUpdate?.(true, this.distance, this.activeSpec);

      if (this.distance <= 1.75 && lead && !lead.dead) {
        ctx.damagePlayer?.(lead, `mordida de ${this.activeSpec.name}`);
        this.distance = 5.8;
      }

      if (this.distance >= 8.6 || this.chaseTimer <= 0) {
        const escapedSpec = this.activeSpec;
        this.returningPredator = escapedSpec;
        this.clearActiveModel();
        this.state = 'idle';
        ctx.onChaserHudUpdate?.(false, 0, null);
        ctx.addScore?.(180);
        if (lead && !lead.isBot) {
          Save.addEggs(40);
        }
        ctx.showFloatText?.(lead, `💨 ${escapedSpec.name.toUpperCase()} DESPISTADO! +40 🥚`, '#ffd447');
        ctx.showBanner?.(`⚠️ ${escapedSpec.name} recuou — e pode voltar no Chefe do Bioma!`, escapedSpec.accent, 3.0);
      }
    }
  }

  clearActiveModel() {
    this._clearIntroProps();
    if (this.activeModel) {
      this.scene.remove(this.activeModel.root);
      this.activeModel = null;
    }
    this.activeSpec = null;
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
    this.clearActiveModel();
    this.encounteredInRun.clear();
  }
}

export { PREDATOR_CATALOG } from './PredatorModels.js';
