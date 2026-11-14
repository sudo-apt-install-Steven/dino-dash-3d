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
    this.introMax = 6.5;
    this.chaseTimer = 0;
    this.distance = 14;
    this.returningPredator = null;
    this.encounteredInRun = new Set();
    this.nextAutoScore = 360;
    this._stepAudioTimer = 0;
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

  startEncounter(biomeId, ctx = {}, overrideId = null) {
    this.clearActiveModel();

    const pinned = Save.data.pinnedPredator || null;
    const spec = overrideId
      ? getPredatorSpec(overrideId)
      : (pinned ? getPredatorSpec(pinned) : getPredatorForBiome(biomeId));

    this.activeSpec = spec;
    this.activeModel = buildPredatorModel(spec.id);
    this.activeModel.root.scale.setScalar(1.38);
    this.activeModel.root.position.set(0, 0, 12.5);
    this.scene.add(this.activeModel.root);

    this.encounteredInRun.add(spec.id);
    this.chaseTimer = 15.5;
    this.distance = 13.5;
    this._stepAudioTimer = 0;

    const skipIntro = ctx.headlessBot || ctx.isMultiplayer || !this._shouldPlayIntro(spec.id);
    this._markIntroSeen(spec.id);

    if (skipIntro) {
      this.state = 'chasing';
      this.introTimer = 0;
      ctx.onPredatorIntroHud?.(null);
      ctx.showBanner?.(`🐾 ${spec.name.toUpperCase()} (${spec.title}) ESTÁ CAÇANDO VOCÊ!`, spec.accent, 3.2);
      ctx.onChaserHudUpdate?.(true, this.distance, spec);
      return true;
    }

    this.state = 'intro';
    this.introMax = spec.introDuration || 6.5;
    this.introTimer = this.introMax;
    ctx.sfx?.roar?.() || ctx.sfx?.meteor?.();
    ctx.cameraRig?.triggerShake?.(0.5, 0.8);
    ctx.onPredatorIntroHud?.({
      spec,
      remaining: this.introTimer,
      total: this.introMax
    });
    return true;
  }

  skipIntro(ctx = {}) {
    if (this.state !== 'intro' || !this.activeSpec) return false;
    this.state = 'chasing';
    this.introTimer = 0;
    ctx.onPredatorIntroHud?.(null);
    ctx.onChaserHudUpdate?.(true, this.distance, this.activeSpec);
    ctx.showBanner?.(`🏃 FUJA DE ${this.activeSpec.name.toUpperCase()}!`, this.activeSpec.accent, 2.6);
    return true;
  }

  consumeReturningPredator() {
    const p = this.returningPredator;
    this.returningPredator = null;
    return p;
  }

  update(dt, speed, score, players, ctx = {}) {
    if (this.state === 'idle' && score >= this.nextAutoScore && !ctx.bossActive && !ctx.ufoActive) {
      this.nextAutoScore += 750;
      this.startEncounter(ctx.currentBiome?.id || 'desert', ctx);
      return;
    }

    if (!this.activeModel || !this.activeSpec) return;

    const lead = players[0];

    if (this.state === 'intro') {
      this.introTimer -= dt;
      // Predador ruge na pista atrás do jogador durante a cutscene skippable de 6.5s
      const lx = lead ? lead.x : 0;
      this.activeModel.root.position.set(lx, 0, 8.2);
      this.activeModel.root.rotation.y = Math.sin(performance.now() * 0.004) * 0.14;
      this.activeModel.update(dt, 1.0);
      ctx.onPredatorIntroHud?.({
        spec: this.activeSpec,
        remaining: Math.max(0, this.introTimer),
        total: this.introMax
      });
      if (this.introTimer <= 0) {
        this.skipIntro(ctx);
      }
      return;
    }

    if (this.state === 'chasing') {
      this.chaseTimer -= dt;
      const paceBonus = speed > 25 ? 2.4 : (speed < 19 ? -2.2 : -0.6);
      const decoyPush = ctx.decoyTimer > 0 ? 6.5 : 0;
      this.distance = Math.max(1.5, Math.min(22, this.distance + (paceBonus + decoyPush) * dt));

      if (lead) {
        this.activeModel.root.position.x += (lead.x - this.activeModel.root.position.x) * Math.min(1, dt * 4.2);
      }
      this.activeModel.root.rotation.y = 0;
      this.activeModel.root.position.z = this.distance;
      this.activeModel.update(dt, this.distance < 6 ? 0.8 : 0.2);

      // Som/pulsação de tensão quando o predador se aproxima (< 6.5m)
      if (this.distance < 6.5) {
        this._stepAudioTimer -= dt;
        if (this._stepAudioTimer <= 0) {
          this._stepAudioTimer = Math.max(0.28, this.distance * 0.09);
          ctx.sfx?.step?.();
        }
      }

      ctx.onChaserHudUpdate?.(true, this.distance, this.activeSpec);

      if (this.distance <= 1.85 && lead && !lead.dead) {
        ctx.damagePlayer?.(lead, `mordida de ${this.activeSpec.name}`);
        this.distance = 9.5;
      }

      if (this.distance >= 21.2 || this.chaseTimer <= 0) {
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
    this.chaseTimer = 0;
    this.distance = 14;
    this.returningPredator = null;
    this.nextAutoScore = 360;
    this.encounteredInRun.clear();
    this.clearActiveModel();
  }
}

export { PREDATOR_CATALOG };
