// Sistema Unificado de Status, Elementais, Combos Alquímicos e Fraquezas de Chefes.

export const STATUS_DEFS = {
  poison: {
    id: 'poison',
    name: 'Veneno',
    icon: '☠️',
    color: '#a3e635',
    isDebuff: true,
    speedMult: 0.92,
    desc: 'Reduz velocidade. Cure com Antídoto (E), Fogo ou Fruta!'
  },
  mud: {
    id: 'mud',
    name: 'Lama',
    icon: '🟤',
    color: '#a16207',
    isDebuff: true,
    speedMult: 0.78,
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

export class StatusSystem {
  static ensurePlayer(player) {
    if (!player.statuses) player.statuses = {};
  }

  static apply(player, id, duration = 5, ctx = null) {
    if (!player || player.dead) return;
    this.ensurePlayer(player);
    const def = STATUS_DEFS[id];
    if (!def) return;

    // Proteções e curas automáticas por elemento oposto
    if (id === 'poison' && (player.gasMaskTimer > 0 || player.invulnTimer > 0 || player.statuses.fire?.timeLeft > 0)) {
      ctx?.showFloatText?.(player, '🛡️ IMUNE A VENENO!', '#84cc16');
      return;
    }
    if (id === 'ice' && player.torchTimer > 0) {
      ctx?.showFloatText?.(player, '🔆 TOCHA DERRETEU GELO!', '#fb923c');
      return;
    }
    if (id === 'fire') {
      if (player.statuses.mud) delete player.statuses.mud;
    }

    player.statuses[id] = {
      id,
      name: def.name,
      icon: def.icon,
      color: def.color,
      isDebuff: def.isDebuff,
      timeLeft: duration,
      duration
    };
  }

  static cureDebuffs(player, ctx = null) {
    if (!player) return false;
    this.ensurePlayer(player);
    let cured = false;
    for (const key of ['poison', 'mud']) {
      if (player.statuses[key]) {
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

  static getSpeedMultiplier(player) {
    if (!player?.statuses) return 1.0;
    let mult = 1.0;
    for (const st of Object.values(player.statuses)) {
      const def = STATUS_DEFS[st.id];
      if (def?.speedMult) mult *= def.speedMult;
    }
    if (player.armorSlowTimer > 0) mult *= 0.85;
    return mult;
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
