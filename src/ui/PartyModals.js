// Extras de Festa (Ideias 191–196) & Tela Final de Pódio/MVP/Ping/Replay.
import { Save } from '../systems/Save.js';

export const TRIVIA_BANK = [
  { question: 'Qual dinossauro é conhecido como o "Rei dos Predadores" e possui braços curtos?', options: ['Triceratops', 'T-Rex', 'Estegossauro', 'Brachiossauro'], correct: 1 },
  { question: 'Quantas garras enormes o Therizinosaur possuía em cada mão?', options: ['1 garra', '3 garras longas', 'Nenhuma', '10 garras'], correct: 1 },
  { question: 'O que o Spinosaurus usava nas costas semelhante a um barco?', options: ['Casco rígido', 'Asas de penas', 'Vela dorsal', 'Chifre triplo'], correct: 2 },
  { question: 'Em DINO DASH 3D, qual elemento reage com Fogo criando Vapor?', options: ['Gelo', 'Pedra', 'Areia', 'Ouro'], correct: 0 }
];

export class PartyModals {
  static renderPodiumModal(container, summary, actions = {}) {
    const standings = summary?.standings || [];
    const mvp = standings[0];
    const modeName = summary?.mpMode === 'duel'
      ? '⚔️ Duelo PvP'
      : (summary?.mpMode === 'elimination' ? '⏳ Eliminação 30s' : '🏁 Corrida Competitiva');
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" style="max-width:680px; text-align:center;">
          <h2 style="color:#ffd447; font-size:1.75rem;">🏆 PÓDIO MULTIPLAYER (${modeName})</h2>
          ${mvp ? `<div class="item-card" style="border-color:#ffd447; margin:10px 0;">
            <strong style="font-size:1.15rem; color:#58d63a;">🥇 CAMPEÃO & MVP: ${mvp.name} (${Math.floor(mvp.score)} pts)</strong>
            <div style="font-size:0.84rem; color:#ffe6a7;">
              ${summary?.rewardEggs > 0 ? `🥚 Prêmio ganho nesta corrida: <strong>+${summary.rewardEggs} Ovos</strong>` : '👑 Coroa de Campeão conquistada! (Prêmios de ovos exigem 2+ humanos na sala)'}
            </div>
          </div>` : ''}
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
            ${standings.map((p, i) => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-radius:10px; background:rgba(0,0,0,0.35); border-left:4px solid ${p.color || '#ffd447'};">
                <span><strong>#${i + 1} ${p.name}</strong> ${i === 0 ? '👑 MVP' : ''}</span>
                <span>${Math.floor(p.score)} pts${p.pvpHits ? ` • ⚔️ ${p.pvpHits}` : ''} • 📶 ${p.pingMs || 2}ms</span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <button class="chunky-btn orange" id="pod-replay">🎬 Replay Melhores Jogadas</button>
            <button class="chunky-btn" id="pod-again">🔁 Próxima Rodada</button>
            <button class="chunky-btn secondary" id="pod-trivia" ${summary?._triviaDone ? 'disabled' : ''}>
              ${summary?._triviaDone ? '✔ Trivia Respondida' : '⚡ Pergunta-Relâmpago (+6 🥚)'}
            </button>
            <button class="chunky-btn secondary" id="pod-menu">🏠 Menu</button>
          </div>
        </div>
      </div>
    `;
    container.querySelector('#pod-replay').onclick = actions.onReplay;
    container.querySelector('#pod-again').onclick = actions.onAgain;
    container.querySelector('#pod-trivia').onclick = () => {
      if (summary?._triviaDone) return;
      if (summary) summary._triviaDone = true;
      this.renderTriviaModal(container, () => this.renderPodiumModal(container, summary, actions));
    };
    container.querySelector('#pod-menu').onclick = actions.onMenu;
  }

  static renderTriviaModal(container, onDone) {
    const q = TRIVIA_BANK[Math.floor(Math.random() * TRIVIA_BANK.length)];
    let answered = false;
    container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" style="max-width:520px; text-align:center;">
          <h2 style="color:#38bdf8;">⚡ PERGUNTA-RELÂMPAGO!</h2>
          <p style="margin:10px 0; font-size:1.05rem;">${q.question}</p>
          <div class="cards-grid" style="grid-template-columns:1fr 1fr;">
            ${q.options.map((opt, idx) => `<button class="chunky-btn secondary" data-trv="${idx}">${opt}</button>`).join('')}
          </div>
          <div id="trv-res" style="margin-top:10px; font-weight:800;"></div>
          <button class="chunky-btn" id="trv-close" style="margin-top:10px;">Continuar</button>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-trv]').forEach((b) => {
      b.onclick = () => {
        if (answered) return;
        answered = true;
        const pick = Number(b.getAttribute('data-trv'));
        const ok = pick === q.correct;
        if (ok) Save.addEggs(6);
        const res = container.querySelector('#trv-res');
        res.style.color = ok ? '#58d63a' : '#ff4757';
        res.textContent = ok ? '✅ Correto! +6 Ovos Bônus!' : `❌ Resposta certa: ${q.options[q.correct]}`;
      };
    });
    container.querySelector('#trv-close').onclick = onDone;
  }
}
