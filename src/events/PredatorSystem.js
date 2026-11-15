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
    const ly = lead ? ((lead.baseY || 0) + lead.y) : 0;
    const lz = lead ? lead.z : 0;
    const px = lx + 0.55;
    let pz = 5.4;
    let py = ly;
    let roarScale = 0.45;
    let act = 1;
    let actLabel = '🥚 ATO 1/3: O SAQUE DO NINHO • Espaço/Clique pula';
    let blendToChase = 0;

    // Fase 1 (0..1.35s): câmera acompanha ninho chegando até o jogador e captura do ovo luminoso
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
      // Ato 1: Saque do ovo + vulto do Predador emergindo ao fundo
      act = 1;
      const u = Math.min(1, t / 1.35);
      const ease = 1 - Math.pow(1 - u, 3);
      pz = 12.2 - ease * (12.2 - 5.35);
      py = ly + Math.sin(u * Math.PI) * 0.45;
      roarScale = 0.25 + u * 0.45;
      this.currentShot.pos.set(lx - 2.75 - ease * 0.75, ly + 1.65 + ease * 0.45, -4.8 + ease * 6.1);
      this.currentShot.look.set(lx + ease * 0.35, ly + 1.0 + ease * 0.55, -0.4 + ease * 4.5);
    } else if (t < 3.05) {
      // Ato 2: Close dramático em contra-plongée (low angle) no Rugido do Alfa
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
      // Ato 3: Whip-pan cinematográfico direto para a câmera de corrida + arrancada
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
        const targetY = ctx.habitatMode === 'flying' ? Math.max(1.8, (lead.baseY || 0) + lead.y * 0.8) : 0;
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
