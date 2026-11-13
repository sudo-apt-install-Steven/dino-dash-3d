// Power-ups na pista (escudo, ímã, turbo, relógio, foguete, cura, bomba)
// e Mochila de itens (até 3 slots: isca, bomba de fumaça, escudo portátil, tocha).

export const TRACK_POWERUPS = {
  shield: { id: 'shield', name: 'Escudo', color: '#38bdf8', icon: '🛡️', duration: 9 },
  magnet: { id: 'magnet', name: 'Ímã de Ovos', color: '#f43f5e', icon: '🧲', duration: 10 },
  turbo: { id: 'turbo', name: 'Turbo', color: '#f59e0b', icon: '⚡', duration: 5 },
  clock: { id: 'clock', name: 'Relógio Lento', color: '#a855f7', icon: '⏱️', duration: 5.5 },
  rocket: { id: 'rocket', name: 'Foguete', color: '#ef4444', icon: '🚀', duration: 4.2 },
  heal: { id: 'heal', name: 'Cura', color: '#22c55e', icon: '💚', duration: 0 },
  bomb: { id: 'bomb', name: 'Bomba', color: '#1f2937', icon: '💣', duration: 0 }
};

export const BACKPACK_ITEMS = {
  decoy: { id: 'decoy', name: 'Isca de Carne', icon: '🥩', desc: 'Distrai perseguidores e chefes por 5s.' },
  smoke: { id: 'smoke', name: 'Bomba de Fumaça', icon: '💨', desc: 'Deixa invisível e intangível por 3s.' },
  portable_shield: { id: 'portable_shield', name: 'Escudo Portátil', icon: '🔰', desc: 'Ativa escudo instantâneo.' },
  torch: { id: 'torch', name: 'Tocha Solar', icon: '🔥', desc: 'Ilumina eclipses/cavernas e derrete gelo.' },
  gas_mask: { id: 'gas_mask', name: 'Máscara Jurássica', icon: '😷', desc: 'Protege contra nevoeiro tóxico por 20s.' }
};

export const TRACK_POWERUP_KEYS = Object.keys(TRACK_POWERUPS);
export const BACKPACK_ITEM_KEYS = Object.keys(BACKPACK_ITEMS);

export class Backpack {
  constructor(maxSlots = 3) {
    this.maxSlots = maxSlots;
    this.slots = [];
  }

  add(itemId) {
    if (this.slots.length >= this.maxSlots) return false;
    if (!BACKPACK_ITEMS[itemId]) return false;
    this.slots.push(itemId);
    return true;
  }

  useNext(player, ctx) {
    if (this.slots.length === 0) return null;
    const itemId = this.slots.shift();
    switch (itemId) {
      case 'decoy':
        ctx.decoyTimer = 5.0;
        ctx.showFloatText?.(player, 'ISCA LANÇADA!', '#f59e0b');
        break;
      case 'smoke':
        player.invulnTimer = Math.max(player.invulnTimer, 3.0);
        player.stealth = true;
        ctx.showFloatText?.(player, 'FUMAÇA NINJA!', '#cbd5e1');
        break;
      case 'portable_shield':
        player.shields = Math.min(3, player.shields + 1);
        ctx.showFloatText?.(player, 'ESCUDO +1!', '#38bdf8');
        break;
      case 'torch':
        player.torchTimer = 14.0;
        player.freezeMeter = 0;
        ctx.showFloatText?.(player, 'TOCHA ACESA!', '#fb923c');
        break;
      case 'gas_mask':
        player.gasMaskTimer = 20.0;
        ctx.showFloatText?.(player, 'MÁSCARA ATIVA! Protegido do gás!', '#84cc16');
        break;
      default:
        break;
    }
    return itemId;
  }

  clear() {
    this.slots = [];
  }
}
