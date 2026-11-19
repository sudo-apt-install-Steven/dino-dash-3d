// Sistema Unificado de Status, Elementais, Combos Alquímicos, Fraquezas de Chefes
// e 24+ Debuffs Mecânicos Reais com contra-jogada clara (Mega Expansão).
import { DEBUFF_ARCHETYPES } from '../content/catalog_expanded.js';
import { ContentLoader } from '../content/ContentLoader.js';

export const STATUS_DEFS = {
  poison: {
    id: 'poison',
    name: 'Veneno',
    icon: '☠️',
    color: '#a3e635',
    isDebuff: true,
    speedMult: 0.92,
    counterplay: 'Cure com Antídoto (E), Fogo ou Fruta',
    desc: 'Reduz velocidade. Cure com Antídoto (E), Fogo ou Fruta!'
  },
  mud: {
    id: 'mud',
    name: 'Lama',
    icon: '🟤',
    color: '#a16207',
    isDebuff: true,
    speedMult: 0.78,
    counterplay: 'Seque com Fogo, Turbo ou pule antes da poça',
    desc: 'Poça de lama desacelera por alguns segundos.'
  },
  ice: {
    id: 'ice',
    name: 'Gelo',
    icon: '❄️',
    color: '#38bdf8',
    isDebuff: false,
    speedMult: 1.0,
    laneMult: 0.72,
    desc: 'Carga Gélida / Piso escorregadio. Derreta com Fogo ou Tocha.'
  },
  fire: {
    id: 'fire',
    name: 'Fogo',
    icon: '🔥',
    color: '#ff5e1a',
    isDebuff: false,
    speedMult: 1.04,
    desc: 'Carga Ígnea: derrete gelo e reage com Veneno/Gelo!'
  },
  lightning: {
    id: 'lightning',
    name: 'Raio',
    icon: '⚡',
    color: '#facc15',
    isDebuff: false,
    speedMult: 1.06,
    desc: 'Carga Elétrica: magnetismo extra e detona rios!'
  },
  turbo: {
    id: 'turbo',
    name: 'Turbo',
    icon: '🚀',
    color: '#f59e0b',
    isDebuff: false,
    desc: 'Velocidade máxima e invencibilidade temporária!'
  },
  fury: {
    id: 'fury',
    name: 'Fúria',
    icon: '💢',
    color: '#ef4444',
    isDebuff: false,
    desc: 'Gigante imbatível que destrói obstáculos!'
  },
  torch: {
    id: 'torch',
    name: 'Tocha Solar',
    icon: '🔆',
    color: '#fb923c',
    isDebuff: false,
    desc: 'Imune a gelo e ilumina eclipses/cavernas.'
  },
  gas_mask: {
    id: 'gas_mask',
    name: 'Máscara',
    icon: '😷',
    color: '#84cc16',
    isDebuff: false,
    desc: 'Protegido contra veneno e nuvens tóxicas.'
  }
};

// Registra os 24 debuffs mecânicos reais a partir do catálogo data-driven
for (const arch of DEBUFF_ARCHETYPES) {
  STATUS_DEFS[arch.id] = {
    id: arch.id,
    name: arch.name,
    icon: arch.icon,
    color: arch.color,
    isDebuff: true,
    speedMult: arch.speedMult ?? 1.0,
    laneMult: arch.laneMult ?? 1.0,
    visionMult: arch.visionMult ?? 1.0,
    gravityMult: arch.gravityMult ?? 1.0,
    controlsReversed: !!arch.controlsReversed,
    abilityLocked: !!arch.abilityLocked,
    staminaDrainPerSec: arch.staminaDrainPerSec ?? 0,
    oxygenDrainPerSec: arch.oxygenDrainPerSec ?? 0,
    damageTakenMult: arch.damageTakenMult ?? 1.0,
    scoreMult: arch.scoreMult ?? 1.0,
    cooldownMult: arch.cooldownMult ?? 1.0,
    cameraTilt: arch.cameraTilt ?? 0,
    magnetRepel: !!arch.magnetRepel,
    stripShield: !!arch.stripShield,
    phantomHazards: !!arch.phantomHazards,
    periodicStaggerSec: arch.periodicStaggerSec ?? 0,
    predatorAggroBonus: arch.predatorAggroBonus ?? 0,
    counterplay: arch.counterplay,
    desc: arch.desc
  };
}

export const DEBUFF_IDS = Object.values(STATUS_DEFS)
  .filter((s) => s.isDebuff)
  .map((s) => s.id);

export const BUFF_IDS = Object.values(STATUS_DEFS)
  .filter((s) => !s.isDebuff)
  .map((s) => s.id);

export const BOSS_WEAKNESSES = {
  scorpion_king: { element: 'fire', icon: '🔥', label: 'Fogo' },
  storm_eagle: { element: 'ice', icon: '❄️', label: 'Gelo' },
  mother_ufo: { element: 'lightning', icon: '⚡', label: 'Raio' },
  alpha_trex: { element: 'poison', icon: '☠️', label: 'Veneno' },
  plesiosaur: { element: 'lightning', icon: '⚡', label: 'Raio' },
  swamp_hydra: { element: 'fire', icon: '🔥', label: 'Fogo' },
  lava_golem: { element: 'ice', icon: '❄️', label: 'Gelo' },
  frost_mammoth: { element: 'fire', icon: '🔥', label: 'Fogo' },
  cave_spider: { element: 'fire', icon: '🔥', label: 'Fogo' },
  cyber_raptor: { element: 'lightning', icon: '⚡', label: 'Raio' },
  amber_scarab: { element: 'ice', icon: '❄️', label: 'Gelo' },
  crystal_wyrm: { element: 'lightning', icon: '⚡', label: 'Raio' },
  sand_wyrm: { element: 'ice', icon: '❄️', label: 'Gelo' },
  meteor_titan: { element: 'lightning', icon: '⚡', label: 'Raio' }
};

function createDefaultEffects() {
  return {
    speedMult: 1.0,
    laneMult: 1.0,
    controlsReversed: false,
    abilityLocked: false,
    visionMult: 1.0,
    gravityMult: 1.0,
    scoreMult: 1.0,
    cooldownMult: 1.0,
    damageTakenMult: 1.0,
    cameraTilt: 0,
    magnetRepel: false,
    phantomHazards: false,
    predatorAggroBonus: 0,
    activeDebuffs: []
  };
}

export class StatusSystem {
  static ensurePlayer(player) {
    if (!player.statuses) player.statuses = {};
    if (!player._debuffEffects) player._debuffEffects = createDefaultEffects();
  }

  static apply(player, id, duration = null, ctx = null) {
    if (!player || player.dead) return false;
    this.ensurePlayer(player);
    const def = STATUS_DEFS[id];
    if (!def) return false;

    const cfg = ContentLoader.getDebuffsConfig();
    let dur = duration != null ? duration : (cfg.defaultDurationSec ?? 4.5);

    if (def.isDebuff) {
      // Imunidades e contra-jogadas elementais
      if (
        (id === 'poison' || id === 'oxygen_leak' || id === 'brittle_armor') &&
        (player.gasMaskTimer > 0 || player.invulnTimer > 0)
      ) {
        ctx?.showFloatText?.(player, '😷 MÁSCARA BLOQUEOU DEBUFF!', '#84cc16');
        return false;
      }
      if (id === 'poison' && player.statuses.fire?.timeLeft > 0) {
        ctx?.showFloatText?.(player, '🛡️ IMUNE A VENENO!', '#84cc16');
        return false;
      }
      if (
        (id === 'frostbite' || id === 'slippery_lanes') &&
        (player.torchTimer > 0 || player.statuses.fire?.timeLeft > 0 || player.immuneFrostbite)
      ) {
        ctx?.showFloatText?.(player, '🔆 CALOR BLOQUEOU GELO!', '#fb923c');
        return false;
      }
      if (id === 'burn' && (player.statuses.ice?.timeLeft > 0 || player.inSubmerged || player.immuneBurn)) {
        ctx?.showFloatText?.(player, '❄️ ÁGUA/GELO APAGOU FOGO!', '#38bdf8');
        return false;
      }
      if ((id === 'blind_fog' || id === 'tunnel_vision') && player.torchTimer > 0) {
        dur *= 0.45;
      }
      if (player.invulnTimer > 0 || player.furyTimer > 0 || player.turboTimer > 0) {
        return false;
      }

      // Escalonamento por Danger Tier e modo
      const tier = Math.max(1, Math.floor(ctx?.dangerTier ?? 1));
      const dtCfg = ContentLoader.getDangerTierConfig();
      const tierMult = 1 + (tier - 1) * (dtCfg.debuffDurationMultPerTier ?? 0.08);
      const modeMult = player.isPerfectMode
        ? (cfg.perfectModeDurationMult ?? 1.2)
        : (ctx?.difficultyId === 'supreme' ? (cfg.supremeModeDurationMult ?? 1.15) : 1.0);
      const resistMult = Math.max(0.5, 1 - (player.debuffResist || 0));
      const extraMult = player.debuffDurationMult || 1.0;
      dur = Math.min(cfg.maxDurationSec ?? 9.0, dur * tierMult * modeMult * resistMult * extraMult);

      // Limite de debuffs simultâneos para manter legibilidade
      const maxSim = cfg.maxSimultaneous ?? 4;
      const activeDebuffKeys = Object.keys(player.statuses).filter((k) => player.statuses[k]?.isDebuff);
      if (!player.statuses[id] && activeDebuffKeys.length >= maxSim) {
        // Substitui o debuff com menor tempo restante
        let oldestKey = activeDebuffKeys[0];
        for (let i = 1; i < activeDebuffKeys.length; i++) {
          const k = activeDebuffKeys[i];
          if ((player.statuses[k]?.timeLeft || 0) < (player.statuses[oldestKey]?.timeLeft || 0)) {
            oldestKey = k;
          }
        }
        delete player.statuses[oldestKey];
      }

      // Efeito imediato de shield_shatter
      if (def.stripShield && (player.shields || 0) > 0) {
        player.shields = Math.max(0, player.shields - 1);
        ctx?.showFloatText?.(player, '🛡️ ESCUDO ESTILHAÇADO!', '#ef4444');
      }
    } else {
      if (id === 'ice' && player.torchTimer > 0) {
        ctx?.showFloatText?.(player, '🔆 TOCHA DERRETEU GELO!', '#fb923c');
        return false;
      }
      if (id === 'fire') {
        delete player.statuses.mud;
        delete player.statuses.frostbite;
        delete player.statuses.slippery_lanes;
      }
    }

    const existing = player.statuses[id];
    if (existing) {
      existing.timeLeft = Math.max(existing.timeLeft, dur);
      existing.duration = Math.max(existing.duration, dur);
    } else {
      player.statuses[id] = {
        id,
        name: def.name,
        icon: def.icon,
        color: def.color,
        isDebuff: !!def.isDebuff,
        counterplay: def.counterplay || '',
        timeLeft: dur,
        duration: dur,
        tickAccum: 0
      };
    }
    return true;
  }

  static cureDebuffs(player, ctx = null) {
    if (!player) return false;
    this.ensurePlayer(player);
    let cured = false;
    for (const key of Object.keys(player.statuses)) {
      const st = player.statuses[key];
      const def = STATUS_DEFS[key];
      if (st?.isDebuff || def?.isDebuff) {
        delete player.statuses[key];
        cured = true;
      }
    }
    if ((player.freezeMeter || 0) > 0) {
      player.freezeMeter = 0;
      cured = true;
    }
    if ((player.armorSlowTimer || 0) > 0) {
      player.armorSlowTimer = 0;
      cured = true;
    }
    if (player.element === 'poison') {
      player.element = null;
      cured = true;
    }
    if (cured) {
      ctx?.showFloatText?.(player, '🧪 STATUS CURADOS!', '#4ade80');
    }
    return cured;
  }

  static tick(player, dt) {
    if (!player || player.dead) return;
    this.ensurePlayer(player);
    for (const key of Object.keys(player.statuses)) {
      const st = player.statuses[key];
      if (!st || typeof st !== 'object') {
        delete player.statuses[key];
        continue;
      }
      st.timeLeft -= dt;
      if (st.timeLeft <= 0) {
        delete player.statuses[key];
      }
    }
    // Sincroniza flags legadas para a HUD unificada
    if (player.turboTimer > 0) this.apply(player, 'turbo', player.turboTimer);
    else delete player.statuses.turbo;

    if (player.furyTimer > 0) this.apply(player, 'fury', player.furyTimer);
    else delete player.statuses.fury;

    if (player.torchTimer > 0) this.apply(player, 'torch', player.torchTimer);
    else delete player.statuses.torch;

    if (player.gasMaskTimer > 0) this.apply(player, 'gas_mask', player.gasMaskTimer);
    else delete player.statuses.gas_mask;
  }

  /**
   * Atualiza todos os debuffs ativos do jogador sem alocar objetos por frame
   * e devolve os multiplicadores/flags mecânicos consolidados para Game.js.
   */
  static tickDebuffs(player, dt = 0, ctx = null) {
    if (!player) return createDefaultEffects();
    this.ensurePlayer(player);

    if (!player.dead && dt > 0) {
      this.tick(player, dt);
    }

    const cfg = ContentLoader.getDebuffsConfig();
    const fx = player._debuffEffects;
    fx.speedMult = 1.0;
    fx.laneMult = 1.0;
    fx.controlsReversed = false;
    fx.abilityLocked = false;
    fx.visionMult = 1.0;
    fx.gravityMult = 1.0;
    fx.scoreMult = 1.0;
    fx.cooldownMult = 1.0;
    fx.damageTakenMult = 1.0;
    fx.cameraTilt = 0;
    fx.magnetRepel = false;
    fx.phantomHazards = false;
    fx.predatorAggroBonus = 0;
    fx.activeDebuffs.length = 0;

    if (player.dead) return fx;

    const statuses = player.statuses;
    for (const key in statuses) {
      const st = statuses[key];
      if (!st || typeof st !== 'object' || st.timeLeft <= 0) continue;
      const def = STATUS_DEFS[st.id];
      if (!def) continue;

      if (def.speedMult && def.speedMult !== 1) fx.speedMult *= def.speedMult;
      if (def.laneMult && def.laneMult !== 1) fx.laneMult *= def.laneMult;

      if (!def.isDebuff) continue;

      fx.activeDebuffs.push(st);

      if (def.visionMult && def.visionMult < 1) {
        const resist = Math.min(0.45, player.visionResist || 0);
        const effVision = Math.min(1, def.visionMult + (1 - def.visionMult) * resist);
        fx.visionMult = Math.min(fx.visionMult, effVision);
      }
      if (def.gravityMult && def.gravityMult !== 1) fx.gravityMult *= def.gravityMult;
      if (def.controlsReversed) fx.controlsReversed = true;
      if (def.abilityLocked) fx.abilityLocked = true;
      if (def.scoreMult && def.scoreMult < 1) fx.scoreMult *= def.scoreMult;
      if (def.cooldownMult && def.cooldownMult > 1) fx.cooldownMult *= def.cooldownMult;
      if (def.damageTakenMult && def.damageTakenMult > 1) fx.damageTakenMult *= def.damageTakenMult;
      if (def.cameraTilt) fx.cameraTilt += def.cameraTilt;
      if (def.magnetRepel) fx.magnetRepel = true;
      if (def.phantomHazards) fx.phantomHazards = true;
      if (def.predatorAggroBonus) fx.predatorAggroBonus += def.predatorAggroBonus;

      // Drenos contínuos (estamina / oxigênio / abalo periódico / hex rotativo)
      if (dt > 0) {
        if (def.staminaDrainPerSec > 0 && typeof player.stamina === 'number') {
          player.stamina = Math.max(0, player.stamina - def.staminaDrainPerSec * dt);
        }
        if (def.oxygenDrainPerSec > 0 && typeof player.oxygen === 'number') {
          const oxResist = Math.min(0.4, player.oxygenResist || 0);
          player.oxygen = Math.max(0, player.oxygen - def.oxygenDrainPerSec * (1 - oxResist) * dt);
        }
        if (def.periodicStaggerSec > 0) {
          st.tickAccum = (st.tickAccum || 0) + dt;
          if (st.tickAccum >= def.periodicStaggerSec) {
            st.tickAccum -= def.periodicStaggerSec;
            ctx?.cameraRig?.triggerShake?.(0.22, 0.14);
          }
        }
        if (st.id === 'hex_random') {
          const phase = Math.floor((st.duration - st.timeLeft) / 1.8) % 3;
          if (phase === 0) fx.controlsReversed = true;
          else if (phase === 1) fx.gravityMult *= 1.35;
          else fx.abilityLocked = true;
        }
      }
    }

    if (player.armorSlowTimer > 0) fx.speedMult *= 0.85;

    // Clamps de segurança para manter o jogo sempre jogável (fairness)
    fx.speedMult = Math.max(cfg.minSpeedMult ?? 0.55, Math.min(1.5, fx.speedMult));
    fx.laneMult = Math.max(cfg.minLaneMult ?? 0.45, Math.min(1.5, fx.laneMult));
    fx.visionMult = Math.max(cfg.minVisionMult ?? 0.35, Math.min(1.0, fx.visionMult));
    fx.gravityMult = Math.max(0.5, Math.min(cfg.maxGravityMult ?? 1.85, fx.gravityMult));

    return fx;
  }

  static getSpeedMultiplier(player) {
    if (!player?.statuses) return 1.0;
    let mult = 1.0;
    for (const st of Object.values(player.statuses)) {
      const def = STATUS_DEFS[st.id];
      if (def?.speedMult) mult *= def.speedMult;
    }
    if (player.armorSlowTimer > 0) mult *= 0.85;
    return Math.max(0.55, mult);
  }

  static getActiveList(player) {
    if (!player?.statuses) return [];
    const list = Object.values(player.statuses).filter((s) => s && typeof s === 'object' && s.timeLeft > 0.05);
    if (player.element && !player.statuses[player.element]) {
      const def = STATUS_DEFS[player.element];
      if (def) {
        list.push({
          id: def.id,
          name: def.name,
          icon: def.icon,
          color: def.color,
          isDebuff: false,
          timeLeft: 99,
          duration: 99,
          permanentElement: true
        });
      }
    }
    return list;
  }

  static getBossWeakness(bossId) {
    return BOSS_WEAKNESSES[bossId] || { element: 'fire', icon: '🔥', label: 'Fogo' };
  }

  static resolveElementCombo(prevElem, nextElem, inWater = false) {
    if (!nextElem) return null;
    if ((prevElem === 'fire' && nextElem === 'ice') || (prevElem === 'ice' && nextElem === 'fire')) {
      return {
        id: 'vapor',
        title: '💨 REAÇÃO DE VAPOR! Fogo + Gelo limpou a pista!',
        color: '#e2e8f0',
        clearRadius: 34,
        bonusScore: 180
      };
    }
    if ((prevElem === 'poison' && nextElem === 'fire') || (prevElem === 'fire' && nextElem === 'poison')) {
      return {
        id: 'toxic_nova',
        title: '💥 NOVA TÓXICA! Veneno + Fogo: Fúria +45% & Explosão!',
        color: '#a3e635',
        clearRadius: 36,
        bonusScore: 210,
        bonusFury: 45
      };
    }
    if ((prevElem === 'lightning' && nextElem === 'poison') || (prevElem === 'poison' && nextElem === 'lightning')) {
      return {
        id: 'acid_overload',
        title: '⚡ SOBRECARGA ÁCIDA! Raio + Veneno deu Escudo e limpou a pista!',
        color: '#bef264',
        clearRadius: 32,
        bonusScore: 195,
        bonusShield: 1
      };
    }
    if ((prevElem === 'ice' && nextElem === 'lightning') || (prevElem === 'lightning' && nextElem === 'ice')) {
      return {
        id: 'superconductor',
        title: '❄️⚡ SUPERCONDUTOR! Gelo + Raio deu Turbo 3.5s!',
        color: '#7dd3fc',
        clearRadius: 24,
        bonusScore: 190,
        bonusTurbo: 3.5
      };
    }
    if (nextElem === 'lightning' && inWater) {
      return {
        id: 'hydro_shock',
        title: '⚡ CHOQUE HIDRELÉTRICO! Rio eletrificado!',
        color: '#facc15',
        clearRadius: 32,
        bonusScore: 170,
        keepElement: 'lightning'
      };
    }
    return null;
  }
}
