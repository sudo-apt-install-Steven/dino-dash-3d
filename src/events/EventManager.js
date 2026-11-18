// Orquestrador de Eventos Dinâmicos Data-Driven (agendamento por pontuação, fila durante boss/intro,
// catálogo de 12 eventos sem troca de bioma e simulação headless até 60k pts).
import { CoreEvents } from './CoreEvents.js';
import { UfoEvent } from './UfoEvent.js';
import { AdvancedEvents } from './AdvancedEvents.js';
import { WorldEvents } from './WorldEvents.js';
import { BossManager } from './BossManager.js';
import { PredatorSystem } from './PredatorSystem.js';
import { Save } from '../systems/Save.js';
import { ContentLoader } from '../content/ContentLoader.js';

export const EVENT_CATALOG = [
  // 12 Eventos Principais do Agendador (sem troca de bioma)
  { id: 'meteor', label: 'Chuva de Meteoros', tier: 'essential', weight: 1.2, minScore: 0, schedulable: true, warningText: '⚠️ ALERTA: CHUVA DE METEOROS EM 2s!', warningColor: '#ff5e1a' },
  { id: 'herd', label: 'Manada de Herbívoros', tier: 'essential', weight: 1.15, minScore: 0, schedulable: true, warningText: '🦕 ALERTA: MANADA EM FUGA CHEGANDO!', warningColor: '#58d63a' },
  { id: 'electric_storm', label: 'Tempestade Elétrica', tier: 'essential', weight: 1.1, minScore: 1500, schedulable: true, warningText: '⚡ ALERTA: TEMPESTADE ELÉTRICA! Busque para-raios!', warningColor: '#fde047' },
  { id: 'sandstorm', label: 'Tempestade de Areia', tier: 'essential', weight: 1.0, minScore: 2000, schedulable: true, warningText: '🌪️ ALERTA: TEMPESTADE DE AREIA SE APROXIMA!', warningColor: '#eab308' },
  { id: 'ufo', label: 'OVNI Capturador', tier: 'essential', weight: 0.95, minScore: 2500, schedulable: true, warningText: '🛸 ALERTA: SINAL ALIENÍGENA DETECTADO!', warningColor: '#22d3ee' },
  { id: 'earthquake', label: 'Terremoto & Fissuras', tier: 'essential', weight: 1.05, minScore: 2500, schedulable: true, warningText: '🌋 ALERTA: TREMOR SÍSMICO NA PISTA!', warningColor: '#f97316' },
  { id: 'eclipse', label: 'Eclipse Sombrio', tier: 'essential', weight: 0.9, minScore: 3500, schedulable: true, warningText: '🌑 ALERTA: ECLIPSE SOMBRIO! Bônus de ovos!', warningColor: '#818cf8' },
  { id: 'aurora', label: 'Aurora & Orbes', tier: 'bonus', weight: 0.95, minScore: 4000, schedulable: true, warningText: '✨ ALERTA: AURORA BOREAL! Bônus 1.5x de pontos!', warningColor: '#00f5d4' },
  { id: 'egg_day', label: 'Chuva de Ovos Dourados', tier: 'essential', weight: 1.1, minScore: 0, schedulable: true, warningText: '🥚 ALERTA: CHUVA DE OVOS DOURADOS!', warningColor: '#ffd447' },
  { id: 'egg_rush', label: 'Fuga de Ovos Raros', tier: 'advanced', weight: 1.0, minScore: 5000, schedulable: true, warningText: '🥚✨ ALERTA: FUGA DE OVOS RAROS NA PISTA!', warningColor: '#fbbf24' },
  { id: 'lava_corridor', label: 'Travessia / Corredor de Lava', tier: 'advanced', weight: 0.9, minScore: 6000, schedulable: true, warningText: '🔥 ALERTA: CORREDOR DE LAVA À FRENTE!', warningColor: '#ff4500' },
  { id: 'pterosaur_swarm', label: 'Enxame Aéreo de Pterossauros', tier: 'advanced', weight: 1.05, minScore: 3000, schedulable: true, warningText: '🦅 ALERTA: ENXAME AÉREO SE APROXIMANDO!', warningColor: '#a855f7' },

  // Eventos adicionais / legados / invocáveis via Debug
  { id: 'pteros', label: 'Bando de Pterodáctilos', tier: 'essential', weight: 0.6, minScore: 1500, schedulable: false },
  { id: 'merchant', label: 'Mercador de Ovos', tier: 'essential', weight: 0.5, minScore: 3000, schedulable: false },
  { id: 'chaser', label: 'Perseguidor Gigante', tier: 'advanced', weight: 0, minScore: 0, schedulable: false },
  { id: 'flight', label: 'Fase de Voo', tier: 'advanced', weight: 0.5, minScore: 7000, schedulable: false },
  { id: 'boss', label: 'Chefe do Bioma', tier: 'advanced', weight: 0, minScore: 0, schedulable: false },
  { id: 'reverse_stampede', label: 'Estampida Reversa', tier: 'bonus', weight: 0.5, minScore: 5500, schedulable: false },
  { id: 'tsunami', label: 'Tsunami do Rio', tier: 'bonus', weight: 0.5, minScore: 5500, schedulable: false },
  { id: 'rare_comet', label: 'Cometa Raro Cadente', tier: 'bonus', weight: 0.5, minScore: 4000, schedulable: false },
  { id: 'bonus_portal', label: 'Portal Dimensão dos Ovos', tier: 'bonus', weight: 0.4, minScore: 8000, schedulable: false },
  { id: 'ptero_nest', label: 'Ninho de Pterodáctilo', tier: 'bonus', weight: 0.5, minScore: 3000, schedulable: false },
  { id: 'primitive_hunters', label: 'Caçadores Primitivos', tier: 'bonus', weight: 0.4, minScore: 7000, schedulable: false },
  { id: 'ruins_puzzle', label: 'Enigma das Ruínas', tier: 'bonus', weight: 0.4, minScore: 6000, schedulable: false },
  { id: 'toxic_fog', label: 'Nevoeiro Tóxico', tier: 'bonus', weight: 0.4, minScore: 6500, schedulable: false },
  { id: 'fruit_rain', label: 'Chuva de Frutas', tier: 'bonus', weight: 0.6, minScore: 0, schedulable: false },
  { id: 'npc_duel', label: 'Duelo com Dino NPC', tier: 'bonus', weight: 0.4, minScore: 8000, schedulable: false },
  { id: 'magnetic_storm', label: 'Tempestade Magnética', tier: 'bonus', weight: 0.55, minScore: 3500, schedulable: false },
  { id: 'crystal_shower', label: 'Chuva de Cristais', tier: 'bonus', weight: 0.55, minScore: 3500, schedulable: false },
  { id: 'lunar_gravity', label: 'Gravidade Lunar', tier: 'bonus', weight: 0.5, minScore: 5000, schedulable: false }
];

const TEACHER_FRIENDLY_EVENTS = new Set([
  'herd', 'egg_day', 'egg_rush', 'merchant', 'flight', 'aurora', 'rare_comet',
  'bonus_portal', 'ptero_nest', 'ruins_puzzle', 'fruit_rain',
  'magnetic_storm', 'crystal_shower', 'lunar_gravity', 'eclipse'
]);

const CATALOG_MAP = new Map(EVENT_CATALOG.map((e) => [e.id, e]));

export class EventManager {
  constructor(scene, opts = {}) {
    this.headless = !!opts.headless;
    this.core = new CoreEvents(scene);
    this.ufo = new UfoEvent(scene);
    this.advanced = new AdvancedEvents(scene);
    this.world = new WorldEvents(scene);
    this.bosses = new BossManager(scene, { headless: this.headless });
    this.predators = new PredatorSystem(scene);

    this.frequencyMult = 1.0;
    this.enabledMap = new Set(EVENT_CATALOG.map((e) => e.id));
    this.sandstormTimer = 0;
    this.earthquakeTimer = 0;
    this.eggDayTimer = 0;
    this.eclipseTimer = 0;
    this.auroraTimer = 0;

    this.lastEventId = null;
    this.eventQueue = [];
    this.pendingWarning = null;
    this.triggeredLog = [];
    this.nextEventScore = this._rollFirstEventScore();
  }

  _rollRange(min, max) {
    const lo = Number(min) || 1600;
    const hi = Math.max(lo, Number(max) || lo);
    return Math.round(lo + Math.random() * (hi - lo));
  }

  _rollFirstEventScore() {
    const cfg = ContentLoader.getEventScheduler();
    return this._rollRange(cfg.firstEventMinScore ?? 1600, cfg.firstEventMaxScore ?? 2600);
  }

  _rollNextIntervalScore() {
    const cfg = ContentLoader.getEventScheduler();
    const min = cfg.intervalMinScore ?? 1600;
    const max = cfg.intervalMaxScore ?? 3600;
    const raw = this._rollRange(min, max);
    const scale = 1 / Math.max(0.75, this.frequencyMult);
    return Math.max(1500, Math.min(4000, Math.round(raw * scale)));
  }

  configure(frequencyMult = 1.0, enabledIds = null) {
    this.frequencyMult = Math.max(0.25, frequencyMult);
    if (Array.isArray(enabledIds)) {
      this.enabledMap = new Set(enabledIds);
    }
  }

  _getActiveEventIds() {
    const active = [];
    if (this.ufo.active) active.push('ufo');
    if (this.sandstormTimer > 0) active.push('sandstorm');
    if (this.earthquakeTimer > 0) active.push('earthquake');
    if (this.eggDayTimer > 0) active.push('egg_day');
    if (this.eclipseTimer > 0) active.push('eclipse');
    if (this.auroraTimer > 0) active.push('aurora');
    if ((this.advanced?.flightTimer || 0) > 0) active.push('flight');
    if ((this.advanced?.lavaCorridorTimer || 0) > 0) active.push('lava_corridor');
    if (this.core.meteors.length > 0) active.push('meteor');
    if (this.core.herd.length > 0) active.push('herd');
    if (this.core.pteroFlock.length > 0) active.push('pteros');
    if (this.world.electricStormTimer > 0) active.push('electric_storm');
    if (this.world.eggRushTimer > 0) active.push('egg_rush');
    if (this.world.magneticTimer > 0) active.push('magnetic_storm');
    if (this.world.lunarTimer > 0) active.push('lunar_gravity');
    if (this.world.skySwarm.length > 0) active.push('pterosaur_swarm');
    return active;
  }

  _pickWeightedEvent(score) {
    const cfg = ContentLoader.getEventScheduler();
    const progEnabled = cfg.progressiveUnlock !== false && Save.data.settings?.progressiveUnlocks !== false;
    const phaseWeightBoost = (ev) => {
      if (score < 12000) return ev.tier === 'essential' ? 1.25 : 0.75;
      if (score < 32000) return 1.0;
      return ev.tier === 'advanced' || ev.tier === 'bonus' ? 1.3 : 1.0;
    };

    const pool = EVENT_CATALOG.filter((e) => {
      if (!e.schedulable) return false;
      if (!this.enabledMap.has(e.id)) return false;
      if (Save.data.teacherMode && !TEACHER_FRIENDLY_EVENTS.has(e.id)) return false;
      if (progEnabled && score < (e.minScore || 0)) return false;
      return true;
    });

    const withoutLast = pool.filter((e) => e.id !== this.lastEventId);
    const candidates = withoutLast.length > 0 ? withoutLast : pool;
    if (candidates.length === 0) return null;

    let totalW = 0;
    const weights = candidates.map((e) => {
      const w = Math.max(0.1, (e.weight || 1) * phaseWeightBoost(e));
      totalW += w;
      return w;
    });

    let r = Math.random() * totalW;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  _scheduleWarningForEvent(evDef, ctx) {
    const cfg = ContentLoader.getEventScheduler();
    const leadSec = cfg.warningLeadSec ?? 2.2;
    this.pendingWarning = {
      id: evDef.id,
      timer: leadSec,
      ctxSnapshot: ctx
    };
    ctx.showBanner?.(evDef.warningText || `⚠️ ALERTA: ${evDef.label.toUpperCase()}!`, evDef.warningColor || '#ffd447', leadSec);
    ctx.sfx?.click?.();
  }

  triggerById(id, ctx = {}, force = false) {
    if (!force && !this.enabledMap.has(id)) return false;
    if (!force && Save.data.teacherMode && !TEACHER_FRIENDLY_EVENTS.has(id)) {
      id = 'egg_day';
    }

    switch (id) {
      case 'meteor':
        ctx.showBanner?.('☄️ CHUVA DE METEOROS! Desvie das sombras vermelhas!', '#ff5e1a');
        ctx.narrator?.say?.('meteor');
        ctx.sfx?.meteor?.();
        if (!this.headless) this.core.spawnMeteorWave(5);
        break;
      case 'herd':
        ctx.showBanner?.('🦕 MANADA DE HERBÍVOROS! Pule nas costas para carona!', '#58d63a');
        ctx.narrator?.say?.('herd');
        if (!this.headless) this.core.spawnHerbivoreHerd();
        break;
      case 'electric_storm':
        ctx.showBanner?.('⚡ TEMPESTADE ELÉTRICA! Desvie dos raios e pegue para-raios!', '#fde047');
        this.world.triggerElectricStorm(9);
        break;
      case 'ufo':
        if (this.ufo.active) return false;
        ctx.showBanner?.('🛸 OVNI! Desvie do feixe ou aperte Espaço/Clique rápido!', '#22d3ee');
        ctx.narrator?.say?.('ufo');
        ctx.sfx?.ufo?.();
        if (!this.headless) this.ufo.start(10);
        break;
      case 'sandstorm':
        ctx.showBanner?.('🌪️ TEMPESTADE DE AREIA! Vento lateral forte!', '#eab308');
        this.sandstormTimer = 9;
        ctx.weather?.setWeather?.('wind');
        break;
      case 'earthquake':
        ctx.showBanner?.('🌋 TERREMOTO! Pule as fissuras sísmicas!', '#f97316');
        this.earthquakeTimer = 6;
        ctx.cameraRig?.triggerShake?.(0.6, 2.5);
        if (!this.headless) this.world.spawnEarthquakeEffects(ctx?.world, { ...ctx, allowBiomePortal: false });
        break;
      case 'pteros':
        ctx.showBanner?.('🦅 BANDO DE PTERODÁCTILOS EM ATAQUE!', '#a855f7');
        if (!this.headless) this.core.spawnPterodactylFlock();
        break;
      case 'eclipse':
        ctx.showBanner?.('🌑 ECLIPSE SOMBRIO! Siga os pontos de luz para bônus!', '#818cf8');
        this.eclipseTimer = 10;
        ctx.dayNight?.triggerEclipse?.(10);
        if (!this.headless) ctx.spawner?.spawnEggRain?.(8);
        break;
      case 'egg_day':
        ctx.showBanner?.('🥚 DIA DOS OVOS! Chuva de ovos dourados!', '#ffd447');
        this.eggDayTimer = 7;
        if (!this.headless) ctx.spawner?.spawnEggRain?.(18);
        break;
      case 'egg_rush':
        ctx.showBanner?.('🥚✨ FUGA DE OVOS RAROS! Colete o máximo que puder!', '#fbbf24');
        this.world.triggerEggRush(8);
        break;
      case 'merchant':
        ctx.showBanner?.('🛒 MERCADOR DE OVOS NA PISTA!', '#f4a261');
        if (!this.headless) this.core.spawnEggMerchant();
        break;
      case 'chaser':
        this.predators.startEncounter(ctx.currentBiome?.id || 'desert', ctx, ctx.predatorId || null);
        break;
      case 'flight':
        ctx.showBanner?.('🪽 FASE DE VOO! Colete ovos nos céus!', '#c084fc');
        if (!this.headless) this.advanced.startFlightPhase(8);
        break;
      case 'lava_corridor':
        ctx.showBanner?.('🔥 CORREDOR DE LAVA! Pule entre as plataformas!', '#ff4500');
        this.advanced.startLavaCorridor(9);
        break;
      case 'boss':
        if (this.bosses.activeBoss) return false;
        {
          const returning = this.predators.consumeReturningPredator();
          this.predators.clearActiveModel();
          const bId = ctx.bossId || ctx.currentBiome?.bossId || 'alpha_trex';
          const diffId = ctx.difficulty?.id || 'normal';
          if (returning) {
            ctx.showBanner?.(`👑 CHEFE + RETORNO DE ${returning.name.toUpperCase()}! Emboscada Dupla!`, returning.accent || '#ff2e63');
          } else {
            ctx.showBanner?.('👑 CHEFE DO BIOMA CHEGANDO! Ataque com [Q] quando exposto!', '#ff2e63');
          }
          ctx.narrator?.say?.('boss');
          this.bosses.startBoss(bId, (ctx.playerCount || 1) + (returning ? 1 : 0), diffId);
          if (returning && this.bosses.activeBoss) {
            this.bosses.activeBoss.name = `${this.bosses.activeBoss.name} + ${returning.name}`;
            this.bosses.activeBoss.bonusCrystals = 1;
          }
        }
        break;
      case 'aurora':
        ctx.showBanner?.('✨ AURORA BOREAL! Bônus x1.5 de pontuação por 10s!', '#00f5d4');
        this.auroraTimer = 10;
        this.advanced.startAuroraBuff(10);
        ctx.dayNight?.triggerAuroraAndComet?.();
        break;
      case 'reverse_stampede':
        ctx.showBanner?.('🐾 ESTAMPIDA REVERSA! Dinos vindo por trás!', '#f59e0b');
        if (!this.headless) this.world.spawnReverseStampede();
        break;
      case 'tsunami':
        ctx.showBanner?.('🌊 TSUNAMI GIGANTE! Corra para a faixa dourada!', '#0284c7');
        if (!this.headless) this.world.spawnTsunami();
        break;
      case 'rare_comet':
        ctx.showBanner?.('☄️ COMETA RARO CRUZANDO O CÉU! Ovos extras!', '#38bdf8');
        if (!this.headless) this.world.spawnRareComet();
        break;
      case 'bonus_portal':
        ctx.showBanner?.('🌀 PORTAL DIMENSIONAL! Entre para fase bônus de ovos!', '#c084fc');
        if (!this.headless) this.world.spawnBonusPortal();
        break;
      case 'ptero_nest':
        ctx.showBanner?.('🪺 NINHO DE PTERODÁCTILO! Proteja os filhotes!', '#ffd447');
        if (!this.headless) this.world.spawnPteroNest();
        break;
      case 'primitive_hunters':
        ctx.showBanner?.('🏹 CAÇADORES PRIMITIVOS COM LANÇAS NAS MARGENS!', '#fb923c');
        if (!this.headless) this.world.spawnPrimitiveHunters();
        break;
      case 'ruins_puzzle':
        ctx.showBanner?.('🏛️ ENIGMA DE RUÍNAS! Pise nas placas douradas na ordem!', '#facc15');
        if (!this.headless) this.world.spawnRuinsPuzzle();
        break;
      case 'toxic_fog':
        ctx.showBanner?.('☠️ NEVOEIRO TÓXICO! Sem máscara, recarga fica lenta!', '#84cc16');
        this.world.triggerToxicFog(10);
        break;
      case 'fruit_rain':
        ctx.showBanner?.('🍉 CHUVA DE FRUTAS! +Fúria e chance de cura!', '#4ade80');
        ctx.spawnFruitRain?.(10);
        break;
      case 'npc_duel':
        ctx.showBanner?.('⚔️ DUELO COM DINO RIVAL! Ataque (Q) ou pule nele!', '#ec4899');
        if (!this.headless) this.world.spawnNpcDuel();
        break;
      case 'magnetic_storm':
        ctx.showBanner?.('🧲 TEMPESTADE MAGNÉTICA! Ovos são puxados até você por 9s!', '#38bdf8');
        this.world.triggerMagneticStorm(9);
        break;
      case 'pterosaur_swarm':
        ctx.showBanner?.('🦅 ENXAME AÉREO! Abaixe (↓) ou mude de faixa!', '#a855f7');
        if (!this.headless) this.world.spawnPterosaurSwarm(ctx);
        break;
      case 'crystal_shower':
        ctx.showBanner?.('💎 CHUVA DE CRISTAIS! Colete cristais para recarregar Estamina!', '#2dd4bf');
        if (!this.headless) this.world.spawnCrystalShower(8);
        break;
      case 'lunar_gravity':
        ctx.showBanner?.('🌙 GRAVIDADE LUNAR! Saltos mais altos e leves por 10s!', '#818cf8');
        this.world.triggerLunarGravity(10);
        break;
      default:
        return false;
    }

    if (id !== 'boss' && id !== 'chaser') {
      this.lastEventId = id;
    }
    this.triggeredLog.push({ id, atScore: ctx.score ?? null });
    if (this.triggeredLog.length > 50) this.triggeredLog.shift();
    return true;
  }

  update(dt, speed, score, players, ctx = {}) {
    if (this.sandstormTimer > 0) {
      this.sandstormTimer = Math.max(0, this.sandstormTimer - dt);
      if (ctx.scene?.fog) ctx.scene.fog.density = 0.032;
    }
    if (this.earthquakeTimer > 0) {
      this.earthquakeTimer = Math.max(0, this.earthquakeTimer - dt);
      ctx.cameraRig?.triggerShake?.(0.28, 0.15);
    }
    if (this.eggDayTimer > 0) {
      this.eggDayTimer = Math.max(0, this.eggDayTimer - dt);
    }
    if (this.eclipseTimer > 0) {
      this.eclipseTimer = Math.max(0, this.eclipseTimer - dt);
    }
    if (this.auroraTimer > 0) {
      this.auroraTimer = Math.max(0, this.auroraTimer - dt);
    }

    const schedulerCfg = ContentLoader.getEventScheduler();
    const maxConcurrent = Math.max(1, schedulerCfg.maxConcurrent ?? 1);
    const bossOrIntroBlocking = Boolean(this.bosses.activeBoss || this.predators.state === 'intro');
    const activeEvents = this._getActiveEventIds();

    // Processa aviso pendente (2-3s antes do evento) se não estiver bloqueado por boss/intro
    if (this.pendingWarning && !bossOrIntroBlocking) {
      this.pendingWarning.timer -= dt;
      if (this.pendingWarning.timer <= 0) {
        const warnId = this.pendingWarning.id;
        this.pendingWarning = null;
        this.triggerById(warnId, { ...ctx, score, playerCount: players.length });
      }
    }

    // Dispara evento da fila assim que boss/intro encerrarem
    if (!bossOrIntroBlocking && !this.pendingWarning && activeEvents.length < maxConcurrent && this.eventQueue.length > 0) {
      const queuedId = this.eventQueue.shift();
      const evDef = CATALOG_MAP.get(queuedId);
      if (evDef) {
        this._scheduleWarningForEvent(evDef, { ...ctx, score, playerCount: players.length });
      }
    }

    // Agendador data-driven baseado em pontuação (funciona mesmo quando predador persegue; enfileira durante boss/intro)
    if (this.frequencyMult > 0 && score >= this.nextEventScore) {
      const picked = this._pickWeightedEvent(score);
      this.nextEventScore = score + this._rollNextIntervalScore();
      if (picked) {
        if (bossOrIntroBlocking) {
          if (this.eventQueue.length < 2 && !this.eventQueue.includes(picked.id)) {
            this.eventQueue.push(picked.id);
          }
        } else if (!this.pendingWarning && activeEvents.length < maxConcurrent) {
          this._scheduleWarningForEvent(picked, { ...ctx, score, playerCount: players.length });
        } else if (this.eventQueue.length < 2 && !this.eventQueue.includes(picked.id)) {
          this.eventQueue.push(picked.id);
        }
      }
    }

    if (!this.headless) {
      this.core.update(dt, speed, players, ctx);
      this.ufo.update(dt, players, ctx);
      this.advanced.update(dt, speed, players, ctx);
      this.world.update(dt, speed, players, ctx);
      this.predators.update(dt, speed, score, players, { ...ctx, bossActive: !!this.bosses.activeBoss, ufoActive: this.ufo.active });
      this.bosses.update(dt, speed, players, ctx);
    } else {
      this.advanced.update(dt, speed, players, ctx);
      this.world.update(dt, speed, players, ctx);
    }
  }

  getGravityScale() {
    return this.world?.lunarTimer > 0 ? 0.62 : 1.0;
  }

  isMagneticActive() {
    return (this.world?.magneticTimer || 0) > 0;
  }

  getDebugState(currentScore = 0) {
    return {
      nextEventScore: this.nextEventScore,
      scoreRemaining: Math.max(0, Math.round(this.nextEventScore - currentScore)),
      lastEventId: this.lastEventId,
      queue: [...this.eventQueue],
      pendingWarning: this.pendingWarning ? { id: this.pendingWarning.id, timer: Number(this.pendingWarning.timer.toFixed(2)) } : null,
      activeEvents: this._getActiveEventIds(),
      frequencyMult: this.frequencyMult
    };
  }

  reset() {
    this.sandstormTimer = 0;
    this.earthquakeTimer = 0;
    this.eggDayTimer = 0;
    this.eclipseTimer = 0;
    this.auroraTimer = 0;
    this.lastEventId = null;
    this.eventQueue = [];
    this.pendingWarning = null;
    this.triggeredLog = [];
    this.nextEventScore = this._rollFirstEventScore();
    this.core.clear();
    this.ufo.clear();
    this.advanced.clear();
    this.world.clear();
    this.predators.reset();
    this.bosses.clear();
  }

  /**
   * Simulação headless de 0 até 60.000 pts para validar frequência, fila durante boss/intro,
   * não-repetição consecutiva e ausência de troca de bioma.
   */
  static simulateEventsTo60k(options = {}) {
    const mockScene = { add() {}, remove() {}, fog: { density: 0.01, color: { set() {} } } };
    const mgr = new EventManager(mockScene, { headless: true });
    mgr.configure(options.frequencyMult ?? 1.0);

    let score = 0;
    const targetScore = options.targetScore ?? 60000;
    const dt = 0.1;
    const speed = 28;
    const players = [{ id: 'trex', dead: false, x: 0, y: 0, z: 0, baseY: 0, backpack: {} }];

    let biomeSwapTriggered = false;
    let firedDuringBossOrIntro = 0;
    const eventsLog = [];

    const mockCtx = {
      scene: mockScene,
      openBiomePortal: () => { biomeSwapTriggered = true; },
      enterHollowEarth: () => { biomeSwapTriggered = true; }
    };

    const origTrigger = mgr.triggerById.bind(mgr);
    mgr.triggerById = (id, ctx, force) => {
      if (mgr.bosses.activeBoss || mgr.predators.state === 'intro') {
        firedDuringBossOrIntro++;
      }
      const ok = origTrigger(id, { ...ctx, score }, force);
      if (ok) {
        eventsLog.push({ id, score: Math.round(score) });
      }
      return ok;
    };

    while (score < targetScore) {
      // Simula janelas de intro de predador e luta de boss para provar enfileiramento
      if (score >= 1800 && score < 1950) {
        mgr.predators.state = 'intro';
      } else if (mgr.predators.state === 'intro') {
        mgr.predators.state = 'idle';
      }

      if ((score >= 15000 && score < 16500) || (score >= 38000 && score < 39500)) {
        mgr.bosses.activeBoss = { id: 'alpha_trex' };
      } else {
        mgr.bosses.activeBoss = null;
      }

      mgr.update(dt, speed, score, players, mockCtx);
      score += speed * dt * 0.85;
    }

    let maxConsecutiveRepeat = 0;
    for (let i = 1; i < eventsLog.length; i++) {
      if (eventsLog[i].id === eventsLog[i - 1].id) {
        maxConsecutiveRepeat++;
      }
    }

    const firstEventScore = eventsLog.length > 0 ? eventsLog[0].score : null;
    const uniqueEvents = new Set(eventsLog.map((e) => e.id)).size;

    return {
      ok:
        eventsLog.length >= 12 &&
        firstEventScore !== null &&
        firstEventScore >= 1500 &&
        firstEventScore <= 3000 &&
        maxConsecutiveRepeat === 0 &&
        firedDuringBossOrIntro === 0 &&
        !biomeSwapTriggered,
      totalEvents: eventsLog.length,
      uniqueEvents,
      firstEventScore,
      maxConsecutiveRepeat,
      firedDuringBossOrIntro,
      biomeSwapTriggered,
      eventsLog
    };
  }
}
