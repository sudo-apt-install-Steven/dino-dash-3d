// Orquestrador de Eventos Dinâmicos (agendamento, banners PC/TV, modo Professor e controle por dificuldade).
import { CoreEvents } from './CoreEvents.js';
import { UfoEvent } from './UfoEvent.js';
import { AdvancedEvents } from './AdvancedEvents.js';
import { WorldEvents } from './WorldEvents.js';
import { BossManager } from './BossManager.js';
import { PredatorSystem } from './PredatorSystem.js';
import { Save } from '../systems/Save.js';

export const EVENT_CATALOG = [
  { id: 'meteor', label: 'Chuva de Meteoros', tier: 'essential' },
  { id: 'herd', label: 'Manada de Herbívoros', tier: 'essential' },
  { id: 'ufo', label: 'OVNI Capturador', tier: 'essential' },
  { id: 'sandstorm', label: 'Tempestade de Areia', tier: 'essential' },
  { id: 'earthquake', label: 'Terremoto', tier: 'essential' },
  { id: 'pteros', label: 'Bando de Pterodáctilos', tier: 'essential' },
  { id: 'eclipse', label: 'Eclipse Sombrio', tier: 'essential' },
  { id: 'egg_day', label: 'Dia dos Ovos Dourados', tier: 'essential' },
  { id: 'merchant', label: 'Mercador de Ovos', tier: 'essential' },
  { id: 'chaser', label: 'Perseguidor Gigante', tier: 'advanced' },
  { id: 'flight', label: 'Fase de Voo', tier: 'advanced' },
  { id: 'lava_corridor', label: 'Corredor de Lava', tier: 'advanced' },
  { id: 'boss', label: 'Chefe do Bioma', tier: 'advanced' },
  { id: 'aurora', label: 'Aurora & Cometa Raro', tier: 'bonus' },
  { id: 'reverse_stampede', label: 'Estampida Reversa', tier: 'bonus' },
  { id: 'tsunami', label: 'Tsunami do Rio', tier: 'bonus' },
  { id: 'rare_comet', label: 'Cometa Raro Cadente', tier: 'bonus' },
  { id: 'bonus_portal', label: 'Portal Dimensão dos Ovos', tier: 'bonus' },
  { id: 'ptero_nest', label: 'Ninho de Pterodáctilo', tier: 'bonus' },
  { id: 'primitive_hunters', label: 'Caçadores Primitivos', tier: 'bonus' },
  { id: 'ruins_puzzle', label: 'Enigma das Ruínas', tier: 'bonus' },
  { id: 'toxic_fog', label: 'Nevoeiro Tóxico', tier: 'bonus' },
  { id: 'fruit_rain', label: 'Chuva de Frutas', tier: 'bonus' },
  { id: 'npc_duel', label: 'Duelo com Dino NPC', tier: 'bonus' }
];

const TEACHER_FRIENDLY_EVENTS = new Set([
  'herd', 'egg_day', 'merchant', 'flight', 'aurora', 'rare_comet',
  'bonus_portal', 'ptero_nest', 'ruins_puzzle', 'fruit_rain'
]);

export class EventManager {
  constructor(scene) {
    this.core = new CoreEvents(scene);
    this.ufo = new UfoEvent(scene);
    this.advanced = new AdvancedEvents(scene);
    this.world = new WorldEvents(scene);
    this.bosses = new BossManager(scene);
    this.predators = new PredatorSystem(scene);

    this.cooldown = 16;
    this.frequencyMult = 1.0;
    this.enabledMap = new Set(EVENT_CATALOG.map((e) => e.id));
    this.sandstormTimer = 0;
    this.earthquakeTimer = 0;
    this.eggDayTimer = 0;
  }

  configure(frequencyMult = 1.0, enabledIds = null) {
    this.frequencyMult = Math.max(0.25, frequencyMult);
    if (Array.isArray(enabledIds)) {
      this.enabledMap = new Set(enabledIds);
    }
  }

  triggerById(id, ctx, force = false) {
    if (!force && !this.enabledMap.has(id)) return false;
    if (!force && Save.data.teacherMode && !TEACHER_FRIENDLY_EVENTS.has(id)) {
      id = 'fruit_rain';
    }

    switch (id) {
      case 'meteor':
        ctx.showBanner?.('⚠️ CHUVA DE METEOROS! Desvie das sombras vermelhas!', '#ff5e1a');
        ctx.narrator?.say('meteor');
        ctx.sfx?.meteor();
        this.core.spawnMeteorWave(5);
        break;
      case 'herd':
        ctx.showBanner?.('🦕 MANADA DE HERBÍVOROS! Pule nas costas para carona!', '#58d63a');
        ctx.narrator?.say('herd');
        this.core.spawnHerbivoreHerd();
        break;
      case 'ufo':
        if (this.ufo.active) return false;
        ctx.showBanner?.('🛸 OVNI! Desvie do feixe ou aperte Espaço/Clique rápido!', '#22d3ee');
        ctx.narrator?.say('ufo');
        ctx.sfx?.ufo();
        this.ufo.start(12);
        break;
      case 'sandstorm':
        ctx.showBanner?.('🌪️ TEMPESTADE DE AREIA! Vento lateral forte!', '#eab308');
        this.sandstormTimer = 9;
        ctx.weather?.setWeather('wind');
        break;
      case 'earthquake':
        ctx.showBanner?.('🌋 TERREMOTO! Cuidado com os tremores!', '#f97316');
        this.earthquakeTimer = 6;
        ctx.cameraRig?.triggerShake(0.6, 2.5);
        break;
      case 'pteros':
        ctx.showBanner?.('🦅 BANDO DE PTERODÁCTILOS EM ATAQUE!', '#a855f7');
        this.core.spawnPterodactylFlock();
        break;
      case 'eclipse':
        ctx.showBanner?.('🌑 ECLIPSE SOMBRIO! Visibilidade reduzida!', '#818cf8');
        ctx.dayNight?.triggerEclipse(11);
        break;
      case 'egg_day':
        ctx.showBanner?.('🥚 DIA DOS OVOS! Chuva de ovos dourados!', '#ffd447');
        this.eggDayTimer = 7;
        ctx.spawner?.spawnEggRain(20);
        break;
      case 'merchant':
        ctx.showBanner?.('🛒 MERCADOR DE OVOS NA PISTA!', '#f4a261');
        this.core.spawnEggMerchant();
        break;
      case 'chaser':
        this.predators.startEncounter(ctx.currentBiome?.id || 'desert', ctx, ctx.predatorId || null);
        break;
      case 'flight':
        ctx.showBanner?.('🪽 FASE DE VOO! Colete ovos nos céus!', '#c084fc');
        this.advanced.startFlightPhase(8);
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
          if (returning) {
            ctx.showBanner?.(`👑 CHEFE + RETORNO DE ${returning.name.toUpperCase()}! Emboscada Dupla!`, returning.accent || '#ff2e63');
          } else {
            ctx.showBanner?.('👑 CHEFE DO BIOMA CHEGANDO! Acerte os pontos fracos dourados!', '#ff2e63');
          }
          ctx.narrator?.say('boss');
          this.bosses.startBoss(bId, (ctx.playerCount || 1) + (returning ? 1 : 0));
          if (returning && this.bosses.activeBoss) {
            this.bosses.activeBoss.name = `${this.bosses.activeBoss.name} + ${returning.name}`;
            this.bosses.activeBoss.bonusCrystals = 1;
          }
        }
        break;
      case 'aurora':
        ctx.showBanner?.('✨ AURORA E COMETA RARO! Bônus x2 de pontuação!', '#00f5d4');
        ctx.dayNight?.triggerAuroraAndComet();
        break;
      case 'reverse_stampede':
        ctx.showBanner?.('🐾 ESTAMPIDA REVERSA! Dinos vindo por trás!', '#f59e0b');
        this.world.spawnReverseStampede();
        break;
      case 'tsunami':
        ctx.showBanner?.('🌊 TSUNAMI GIGANTE! Corra para a faixa dourada!', '#0284c7');
        this.world.spawnTsunami();
        break;
      case 'rare_comet':
        ctx.showBanner?.('☄️ COMETA RARO CRUZANDO O CÉU! Ovos extras!', '#38bdf8');
        this.world.spawnRareComet();
        break;
      case 'bonus_portal':
        ctx.showBanner?.('🌀 PORTAL DIMENSIONAL! Entre para fase bônus de ovos!', '#c084fc');
        this.world.spawnBonusPortal();
        break;
      case 'ptero_nest':
        ctx.showBanner?.('🪺 NINHO DE PTERODÁCTILO! Proteja os filhotes!', '#ffd447');
        this.world.spawnPteroNest();
        break;
      case 'primitive_hunters':
        ctx.showBanner?.('🏹 CAÇADORES PRIMITIVOS COM LANÇAS NAS MARGENS!', '#fb923c');
        this.world.spawnPrimitiveHunters();
        break;
      case 'ruins_puzzle':
        ctx.showBanner?.('🏛️ ENIGMA DE RUÍNAS! Pise nas placas douradas na ordem!', '#facc15');
        this.world.spawnRuinsPuzzle();
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
        this.world.spawnNpcDuel();
        break;
      default:
        return false;
    }
    return true;
  }

  update(dt, speed, score, players, ctx) {
    if (this.sandstormTimer > 0) {
      this.sandstormTimer -= dt;
      ctx.scene.fog.density = 0.032;
    }
    if (this.earthquakeTimer > 0) {
      this.earthquakeTimer -= dt;
      ctx.cameraRig?.triggerShake(0.28, 0.15);
    }
    if (this.eggDayTimer > 0) {
      this.eggDayTimer -= dt;
    }

    if (score > 140 && !this.ufo.active && !this.bosses.activeBoss) {
      this.cooldown -= dt * this.frequencyMult;
      if (this.cooldown <= 0) {
        this.cooldown = 16 + Math.random() * 9;
        const allowed = EVENT_CATALOG.filter((e) =>
          this.enabledMap.has(e.id) && (!Save.data.teacherMode || TEACHER_FRIENDLY_EVENTS.has(e.id))
        );
        if (allowed.length > 0) {
          const pick = allowed[Math.floor(Math.random() * allowed.length)];
          this.triggerById(pick.id, { ...ctx, playerCount: players.length });
        }
      }
    }

    this.core.update(dt, speed, players, ctx);
    this.ufo.update(dt, players, ctx);
    this.advanced.update(dt, speed, players, ctx);
    this.world.update(dt, speed, players, ctx);
    this.predators.update(dt, speed, score, players, { ...ctx, bossActive: !!this.bosses.activeBoss, ufoActive: this.ufo.active });
    this.bosses.update(dt, speed, players, ctx);
  }

  reset() {
    this.cooldown = 16;
    this.sandstormTimer = 0;
    this.earthquakeTimer = 0;
    this.eggDayTimer = 0;
    this.core.clear();
    this.ufo.clear();
    this.advanced.clear();
    this.world.clear();
    this.predators.reset();
    this.bosses.clear();
  }
}
