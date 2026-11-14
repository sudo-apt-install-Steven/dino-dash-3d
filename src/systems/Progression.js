// Missões diárias, Conquistas, Títulos, Passe de Temporada (50 níveis), Árvore 1-10 e Ovos Misteriosos.
import { Save } from '../systems/Save.js';
import { ACCESSORIES_SHOP, TRAILS_SHOP } from '../dinos/DinoCustomization.js';

export const ACHIEVEMENTS_CATALOG = [
  { id: 'first_run', name: 'Primeiros Passos', desc: 'Complete sua primeira corrida.', title: 'Corredor' },
  { id: 'score_500', name: 'Veterano do Deserto', desc: 'Alcance 500 pontos em uma partida.', title: 'Explorador' },
  { id: 'score_2000', name: 'Lenda Jurássica', desc: 'Alcance 2000 pontos em uma partida.', title: 'Lenda' },
  { id: 'ufo_escape', name: 'Escapei do OVNI', desc: 'Escape do feixe trator do OVNI.', title: 'Caçador de OVNI' },
  { id: 'river_king', name: 'Rei do Rio', desc: 'Chegue ao bioma Rio Jurássico.', title: 'Rei do Rio' },
  { id: 'legendary_cards', name: 'Colecionador Épico', desc: 'Pegue 3 cartas lendárias no total.', title: 'Mestre das Cartas' },
  { id: 'konami_secret', name: 'Segredo Ancestral', desc: 'Descubra o Dino Dourado/Fantasma secreto!', title: 'Guardião Dourado' }
];

const DAILY_MISSION_TEMPLATES = [
  { id: 'm_eggs', text: 'Colete 220 ovos em corridas', goal: 220, reward: 65, stat: 'eggs' },
  { id: 'm_score', text: 'Alcance 1500 pontos em uma corrida', goal: 1500, reward: 80, stat: 'bestRun' },
  { id: 'm_jumps', text: 'Dê 55 pulos na pista', goal: 55, reward: 50, stat: 'jumps' },
  { id: 'm_stomp', text: 'Derrote 8 inimigos (pisão ou Q)', goal: 8, reward: 75, stat: 'stomps' }
];

export const MYSTERY_EGG_COST = 600;
export const MYSTERY_EGG_DUP_REFUND = 240;
export const MYSTERY_EGG_DUP_XP = 150;
export const MYSTERY_EGG_DUP_CRYSTALS = 1;
export const SHOP_TIERS = { common: 150, rare: 600, epic: 2500, legendary: 10000 };

export class ProgressionManager {
  static ensureDailyMissions() {
    const today = new Date().toISOString().slice(0, 10);
    if (Save.data.missions.date !== today || Save.data.missions.list.length === 0) {
      Save.data.missions.date = today;
      Save.data.missions.list = DAILY_MISSION_TEMPLATES.slice(0, 3).map((t) => ({
        ...t,
        progress: 0,
        claimed: false
      }));
      Save.save();
    }
    return Save.data.missions.list;
  }

  static reportRunStats({ score = 0, eggs = 0, jumps = 0, stomps = 0 }) {
    const list = this.ensureDailyMissions();
    let unlocked = [];

    for (const m of list) {
      if (m.claimed) continue;
      if (m.stat === 'eggs') m.progress += eggs;
      if (m.stat === 'jumps') m.progress += jumps;
      if (m.stat === 'stomps') m.progress += stomps;
      if (m.stat === 'bestRun') m.progress = Math.max(m.progress, Math.floor(score));

      if (m.progress >= m.goal && !m.claimed) {
        m.claimed = true;
        Save.addEggs(m.reward);
      }
    }

    // Passe de temporada (50 níveis)
    const xpGain = Math.max(15, Math.floor(score * 0.12) + Math.floor(eggs * 0.3));
    Save.data.seasonPass.xp += xpGain;
    while (Save.data.seasonPass.xp >= 160 && Save.data.seasonPass.level < 50) {
      Save.data.seasonPass.xp -= 160;
      Save.data.seasonPass.level += 1;
      Save.addEggs(40);
      if (Save.data.seasonPass.level % 5 === 0) {
        Save.data.crystals = (Save.data.crystals || 0) + 1;
      }
    }

    // Conquistas automáticas
    if (Save.unlockAchievement('first_run')) unlocked.push('Primeiros Passos');
    if (score >= 500 && Save.unlockAchievement('score_500')) unlocked.push('Veterano do Deserto');
    if (score >= 2000 && Save.unlockAchievement('score_2000')) unlocked.push('Lenda Jurássica');

    for (const achId of Save.data.achievements) {
      const def = ACHIEVEMENTS_CATALOG.find((a) => a.id === achId);
      if (def && !Save.data.unlockedTitles.includes(def.title)) {
        Save.data.unlockedTitles.push(def.title);
      }
    }

    Save.save();
    return unlocked;
  }

  static getSkillUpgradeCost(curLevel) {
    // Escalonamento consistente de ~+40% por nível a partir do patamar base (90 -> ~1330 no nv.9->10)
    return Math.round(90 * Math.pow(1.4, Math.max(0, (curLevel || 1) - 1)));
  }

  static upgradeDinoSkill(dinoId) {
    const cur = Save.data.dinoLevels[dinoId] || 1;
    if (cur >= 10) return { ok: false, reason: 'Nível máximo atingido!' };
    const cost = this.getSkillUpgradeCost(cur);
    if ((Save.data.eggs || 0) < cost) return { ok: false, reason: `Precisa de ${cost} ovos.` };
    Save.addEggs(-cost);
    Save.data.dinoLevels[dinoId] = cur + 1;
    Save.save();
    return { ok: true, level: cur + 1 };
  }

  static getRotatingShop() {
    const rot = Save.data.shopRotation || (Save.data.shopRotation = { slotKey: '', offers: [], purchasedIds: [], rerolls: 0 });
    const windowIdx = Math.floor(Date.now() / (1000 * 3600 * 6));
    const slotKey = `${windowIdx}:${rot.rerolls || 0}`;
    if (rot.slotKey !== slotKey || !Array.isArray(rot.offers) || rot.offers.length === 0) {
      rot.slotKey = slotKey;
      rot.purchasedIds = [];
      let s = (windowIdx * 2654435761 + (rot.rerolls || 0) * 1013904223) >>> 0;
      const rng = () => {
        s = (1664525 * s + 1013904223) >>> 0;
        return s / 4294967296;
      };
      const allShop = [
        ...ACCESSORIES_SHOP.filter((a) => a.price > 0).map((a) => ({ kind: 'acc', id: a.id, name: a.name, basePrice: a.price, rarity: a.rarity })),
        ...TRAILS_SHOP.filter((t) => t.price > 0).map((t) => ({ kind: 'trail', id: t.id, name: t.name, basePrice: t.price, rarity: t.rarity }))
      ].sort(() => rng() - 0.5);
      const picked = allShop.slice(0, 2).map((o, idx) => ({
        ...o,
        offerId: `rot_${idx}_${o.id}`,
        price: Math.round(o.basePrice * 0.8),
        discountPct: 20
      }));
      picked.push({
        kind: 'crystal_pack',
        id: 'crystals_2',
        offerId: 'rot_crystal_2',
        name: 'Pacote 2x Cristais 💎',
        basePrice: 600,
        price: 550,
        discountPct: 8,
        rarity: 'Rara'
      });
      rot.offers = picked;
      Save.save();
    }
    const nextMs = (windowIdx + 1) * 1000 * 3600 * 6 - Date.now();
    const hrs = Math.max(0, Math.floor(nextMs / 3600000));
    const mins = Math.max(0, Math.floor((nextMs % 3600000) / 60000));
    return {
      offers: rot.offers,
      purchasedIds: rot.purchasedIds || [],
      refreshIn: `${hrs}h ${String(mins).padStart(2, '0')}m`
    };
  }

  static buyRotatingOffer(offerId) {
    const shop = this.getRotatingShop();
    const offer = shop.offers.find((o) => o.offerId === offerId);
    if (!offer) return { ok: false, reason: 'Oferta indisponível.' };
    if (shop.purchasedIds.includes(offerId)) return { ok: false, reason: 'Oferta já comprada neste ciclo!' };
    if ((Save.data.eggs || 0) < offer.price) return { ok: false, reason: `Precisa de ${offer.price} 🥚.` };
    Save.addEggs(-offer.price);
    Save.data.shopRotation.purchasedIds.push(offerId);
    if (offer.kind === 'acc' && !Save.data.unlockedAccessories.includes(offer.id)) {
      Save.data.unlockedAccessories.push(offer.id);
    } else if (offer.kind === 'trail' && !Save.data.unlockedTrails.includes(offer.id)) {
      Save.data.unlockedTrails.push(offer.id);
    } else if (offer.kind === 'crystal_pack') {
      Save.data.crystals = (Save.data.crystals || 0) + 2;
    }
    Save.save();
    return { ok: true, offer };
  }

  static rerollRotatingShop(useCrystals = false) {
    const rot = Save.data.shopRotation || (Save.data.shopRotation = { slotKey: '', offers: [], purchasedIds: [], rerolls: 0 });
    if (useCrystals) {
      if ((Save.data.crystals || 0) < 2) return { ok: false, reason: 'Precisa de 2 💎 Cristais.' };
      Save.data.crystals -= 2;
    } else {
      if ((Save.data.eggs || 0) < 120) return { ok: false, reason: 'Precisa de 120 🥚.' };
      Save.addEggs(-120);
    }
    rot.rerolls = (rot.rerolls || 0) + 1;
    rot.slotKey = '';
    Save.save();
    return { ok: true, shop: this.getRotatingShop() };
  }

  static getMysteryEggStatus() {
    const unlockedAcc = Save.data.unlockedAccessories || [];
    const unlockedTrails = Save.data.unlockedTrails || [];
    const remainingAcc = ACCESSORIES_SHOP.filter((a) => !unlockedAcc.includes(a.id)).length;
    const remainingTrails = TRAILS_SHOP.filter((t) => !unlockedTrails.includes(t.id)).length;
    const totalRemaining = remainingAcc + remainingTrails;
    return {
      cost: MYSTERY_EGG_COST,
      dupRefund: MYSTERY_EGG_DUP_REFUND,
      dupXp: MYSTERY_EGG_DUP_XP,
      remainingAcc,
      remainingTrails,
      totalRemaining,
      collectionComplete: totalRemaining === 0
    };
  }

  static openMysteryEgg() {
    const cost = MYSTERY_EGG_COST;
    if ((Save.data.eggs || 0) < cost) return { ok: false, reason: `Precisa de ${cost} ovos.` };
    Save.addEggs(-cost);

    // Pool combinado de acessórios e rastros ainda não desbloqueados
    const lockedAcc = ACCESSORIES_SHOP.filter((a) => !Save.data.unlockedAccessories.includes(a.id)).map((item) => ({ kind: 'acc', item }));
    const lockedTrails = TRAILS_SHOP.filter((t) => !Save.data.unlockedTrails.includes(t.id)).map((item) => ({ kind: 'trail', item }));
    const pool = [...lockedAcc, ...lockedTrails];

    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.kind === 'acc') {
        Save.data.unlockedAccessories.push(pick.item.id);
      } else {
        Save.data.unlockedTrails.push(pick.item.id);
      }
      Save.save();
      return { ok: true, rewardName: `${pick.item.name} (${pick.item.rarity})`, item: pick.item };
    }

    // Coleção 100% completa: devolve menos do que custou + XP no Passe + 1 Cristal (sem farm infinito!)
    Save.addEggs(MYSTERY_EGG_DUP_REFUND);
    Save.data.crystals = (Save.data.crystals || 0) + MYSTERY_EGG_DUP_CRYSTALS;
    Save.data.seasonPass.xp = (Save.data.seasonPass.xp || 0) + MYSTERY_EGG_DUP_XP;
    while (Save.data.seasonPass.xp >= 160 && Save.data.seasonPass.level < 50) {
      Save.data.seasonPass.xp -= 160;
      Save.data.seasonPass.level += 1;
      Save.addEggs(40);
    }
    Save.save();
    return {
      ok: true,
      completedFallback: true,
      rewardName: `Coleção Completa: ${MYSTERY_EGG_DUP_REFUND} 🥚 + ${MYSTERY_EGG_DUP_CRYSTALS} 💎 + ${MYSTERY_EGG_DUP_XP} XP`
    };
  }
}
