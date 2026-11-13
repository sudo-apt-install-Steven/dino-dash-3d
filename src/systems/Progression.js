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
  { id: 'm_eggs', text: 'Colete 20 ovos em corridas', goal: 20, reward: 15, stat: 'eggs' },
  { id: 'm_score', text: 'Alcance 600 pontos em uma corrida', goal: 600, reward: 20, stat: 'bestRun' },
  { id: 'm_jumps', text: 'Dê 30 pulos na pista', goal: 30, reward: 12, stat: 'jumps' },
  { id: 'm_stomp', text: 'Pisotear 4 inimigos pequenos', goal: 4, reward: 18, stat: 'stomps' }
];

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
    const xpGain = Math.max(10, Math.floor(score * 0.15) + eggs * 2);
    Save.data.seasonPass.xp += xpGain;
    while (Save.data.seasonPass.xp >= 120 && Save.data.seasonPass.level < 50) {
      Save.data.seasonPass.xp -= 120;
      Save.data.seasonPass.level += 1;
      Save.addEggs(8);
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

  static upgradeDinoSkill(dinoId) {
    const cur = Save.data.dinoLevels[dinoId] || 1;
    if (cur >= 10) return { ok: false, reason: 'Nível máximo atingido!' };
    const cost = cur * 10;
    if ((Save.data.eggs || 0) < cost) return { ok: false, reason: `Precisa de ${cost} ovos.` };
    Save.addEggs(-cost);
    Save.data.dinoLevels[dinoId] = cur + 1;
    Save.save();
    return { ok: true, level: cur + 1 };
  }

  static openMysteryEgg() {
    const cost = 25;
    if ((Save.data.eggs || 0) < cost) return { ok: false, reason: `Precisa de ${cost} ovos.` };
    Save.addEggs(-cost);

    // Tenta desbloquear acessório ou rastro ainda não obtido; senão devolve prêmio em ovos!
    const lockedAcc = ACCESSORIES_SHOP.filter((a) => !Save.data.unlockedAccessories.includes(a.id));
    if (lockedAcc.length > 0) {
      const pick = lockedAcc[Math.floor(Math.random() * lockedAcc.length)];
      Save.data.unlockedAccessories.push(pick.id);
      Save.save();
      return { ok: true, rewardName: `${pick.name} (${pick.rarity})`, item: pick };
    }

    const lockedTrails = TRAILS_SHOP.filter((t) => !Save.data.unlockedTrails.includes(t.id));
    if (lockedTrails.length > 0) {
      const pick = lockedTrails[Math.floor(Math.random() * lockedTrails.length)];
      Save.data.unlockedTrails.push(pick.id);
      Save.save();
      return { ok: true, rewardName: `${pick.name} (${pick.rarity})`, item: pick };
    }

    const bonus = 40;
    Save.addEggs(bonus);
    return { ok: true, rewardName: `+${bonus} Ovos Dourados (Bônus)!` };
  }
}
