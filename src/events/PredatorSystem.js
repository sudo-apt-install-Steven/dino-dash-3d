// Gerenciador Completo dos 14 Predadores Originais: Intro Skippable (6-8s), Perseguição c/ Medidor & Retorno no Chefe.
import { Save } from '../systems/Save.js';
import { buildPredatorModel, getPredatorForBiome, getPredatorSpec, PREDATOR_CATALOG } from './PredatorModels.js';

export class PredatorSystem {
  constructor(scene) {
    this.scene = scene;
    this.state = 'idle'; // 'idle' | 'intro' | 'chasing'
    this.activeModel = null;
    this.activeSpec = null;
    this.introTimer = 0;
    this.introElapsed = 0;
    this.introMax = 3.2;
    this.chaseTimer = 0;
    this.distance = 6.2;
    this.returningPredator = null;
    this.encounteredInRun = new Set();
    this.nextAutoScore = 680;
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
    if (!Save.data.seenElements) Save.data.seenElements = [];
    const key = `pred_intro_${predatorId}`;
    if (!Save.data.seenElements.includes(key)) {
      Save.data.seenElements.push(key);
      Save.save();
    }
  }

  startOpeningIntro(biomeId, ctx = {}, overrideId = null) {
    this.clearActiveModel();

    if (ctx.headlessBot || ctx.isMultiplayer || ctx.isTestTrack || ctx.isTutorial) {
      this.state = 'idle';
      this.introTimer = 0;
      ctx.onPredatorIntroHud?.(null);
      return false;
    }

    const pinned = Save.data.pinnedPredator || null;
    const spec = overrideId
      ? getPredatorSpec(overrideId)
      : (pinned ? getPredatorSpec(pinned) : getPredatorForBiome(biomeId));

    if (!this._shouldPlayIntro(spec.id)) {
      this.state = 'idle';
      this.introTimer = 0;
      ctx.onPredatorIntroHud?.(null);
      return false;
    }
    this._markIntroSeen(spec.id);

    this.activeSpec = spec;
    this.activeModel = buildPredatorModel(spec.id);
    this.activeModel.root.scale.setScalar(1.38);
    this.activeModel.root.position.set(0.48, 0, 11.0);
    this.activeModel.root.rotation.y = 0;
    this.scene.add(this.activeModel.root);

    this.state = 'intro';
    this.introMax = 3.2;
    this.introTimer = this.introMax;
    this.introElapsed = 0;
    this._roarTriggered = false;

    ctx.onChaserHudUpdate?.(false);
    ctx.onPredatorIntroHud?.({
      spec,
      remaining: this.introTimer,
      total: this.introMax
    });
    return true;
  }

  startEncounter(biomeId, ctx = {}, overrideId = null) {
    this.clearActiveModel();

    const pinned = Save.data.pinnedPredator || null;
    const spec = overrideId
      ? getPredatorSpec(overrideId)
      : (pinned ? getPredatorSpec(pinned) : getPredatorForBiome(biomeId));

    this.activeSpec = spec;
    this.activeModel = buildPredatorModel(spec.id);
    this.activeModel.root.scale.setScalar(1.06);
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
    ctx.showBanner?.(`🐾 CAÇADOR: ${spec.name.toUpperCase()} (${spec.title}) ATRÁS DE VOCÊ!`, spec.accent, 3.0);
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
    const px = lx + 0.48;
    let pz = 4.9;
    let py = 0;
    let roarScale = 1.0;

    if (this.introElapsed < 0.55) {
      // Aproximação dramática inicial (salto/avanço até ficar logo atrás do dino do jogador)
      const u = Math.min(1, this.introElapsed / 0.55);
      const ease = 1 - Math.pow(1 - u, 3);
      pz = 11.0 - ease * (11.0 - 4.9);
      py = Math.sin(u * Math.PI) * 0.42;
      roarScale = u * 0.55;
      if (u >= 0.72 && !this._roarTriggered) {
        this._roarTriggered = true;
        ctx.sfx?.roar?.() || ctx.sfx?.meteor?.();
        ctx.cameraRig?.triggerShake?.(0.38, 0.55);
      }
    } else if (this.introElapsed > this.introMax - 0.75) {
      // Recua suavemente enquanto a câmera desliza para a posição normal de corrida
      const u = Math.min(1, (this.introElapsed - (this.introMax - 0.75)) / 0.75);
      const ease = u * u * (3 - 2 * u);
      pz = 4.9 + ease * 7.2;
      roarScale = Math.max(0.15, 1.0 - ease);
    }

    this.activeModel.root.position.set(px, py, pz);
    this.activeModel.root.rotation.y = Math.sin(this.introElapsed * 2.4) * 0.1;
    this.activeModel.update(dt, roarScale, 'intro');

    ctx.onPredatorIntroHud?.({
      spec: this.activeSpec,
      remaining: this.introTimer,
      total: this.introMax
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
      this.nextAutoScore += 1400;
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
        const flankX = lead.x >= 0 ? -0.78 : 0.78;
        const targetX = lead.x * 0.72 + flankX;
        this.activeModel.root.position.x += (targetX - this.activeModel.root.position.x) * Math.min(1, dt * 4.4);
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
    this.nextAutoScore = 680;
    this._roarTriggered = false;
    this.clearActiveModel();
    this.encounteredInRun.clear();
  }
}

export { PREDATOR_CATALOG };
