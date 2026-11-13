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
  { id: 'm_eggs', text: 'Colete 35 ovos em corridas', goal: 35, reward: 18, stat: 'eggs' },
  { id: 'm_score', text: 'Alcance 1000 pontos em uma corrida', goal: 1000, reward: 22, stat: 'bestRun' },
  { id: 'm_jumps', text: 'Dê 50 pulos na pista', goal: 50, reward: 15, stat: 'jumps' },
  { id: 'm_stomp', text: 'Derrote 6 inimigos (pisão ou Q)', goal: 6, reward: 20, stat: 'stomps' }
];

export const MYSTERY_EGG_COST = 80;
export const MYSTERY_EGG_DUP_REFUND = 35;
export const MYSTERY_EGG_DUP_XP = 80;

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
    const xpGain = Math.max(8, Math.floor(score * 0.1) + eggs);
    Save.data.seasonPass.xp += xpGain;
    while (Save.data.seasonPass.xp >= 160 && Save.data.seasonPass.level < 50) {
      Save.data.seasonPass.xp -= 160;
      Save.data.seasonPass.level += 1;
      Save.addEggs(10);
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
    return 25 * curLevel + curLevel * curLevel * 8;
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

    // Coleção 100% completa: devolve menos do que custou + XP no Passe (sem farm infinito!)
    Save.addEggs(MYSTERY_EGG_DUP_REFUND);
    Save.data.seasonPass.xp = (Save.data.seasonPass.xp || 0) + MYSTERY_EGG_DUP_XP;
    while (Save.data.seasonPass.xp >= 160 && Save.data.seasonPass.level < 50) {
      Save.data.seasonPass.xp -= 160;
      Save.data.seasonPass.level += 1;
      Save.addEggs(10);
    }
    Save.save();
    return {
      ok: true,
      completedFallback: true,
      rewardName: `Coleção Completa: reembolso de ${MYSTERY_EGG_DUP_REFUND} 🥚 + ${MYSTERY_EGG_DUP_XP} XP`
    };
  }
}
