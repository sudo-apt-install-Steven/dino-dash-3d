// Extras de Festa (Ideias 191–196) & Tela Final de Pódio/MVP/Ping/Replay.
import { Save } from '../systems/Save.js';
import { escapeHtml, sanitizeHexColor } from '../security/Sanitize.js';

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
    const modeLabels = {
      duel: '⚔️ Duelo PvP',
      elimination: '⏳ Eliminação 30s',
      race: '🏁 Corrida Competitiva',
      raid: '🐉 Raid Colossal',
      boss_fight: '👑 Boss Fight / Rush',
      competition: '🏅 Competição (Liga)',
      coop: '🤝 Coop Tático',
      free_roam: '🧪 Livre / Sandbox'
    };
    const modeName = modeLabels[summary?.mpMode] || '🏁 Corrida Competitiva';
    const durSec = Math.max(0, Math.floor(summary?.durationSec || 0));
    const durLabel = `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')}`;
    const matchDist = Math.floor(summary?.distance || 0);
    const biomeLabel = escapeHtml(summary?.biomeName || 'Bioma Variado');
    const diffLabel = escapeHtml((summary?.difficulty || 'normal').toUpperCase());
    const voteBiomes = [
      { id: 'desert', label: '🏜️ Deserto' },
      { id: 'volcano', label: '🌋 Vulcão' },
      { id: 'ice_age', label: '❄️ Gelo' },
      { id: 'dark_swamp', label: '🧪 Pântano' },
      { id: 'crystal_cavern', label: '💎 Cristais' },
      { id: 'alien_planet', label: '🛸 Alien' }
    ];
    const voteModes = [
      { id: 'race', label: '🏁 Corrida' },
      { id: 'coop', label: '🤝 Coop' },
      { id: 'raid', label: '🐉 Raid' },
      { id: 'boss_fight', label: '👑 Boss Rush' },
      { id: 'competition', label: '🏅 Liga' },
      { id: 'duel', label: '⚔️ Duelo PvP' },
      { id: 'elimination', label: '⏳ Eliminação' },
      { id: 'free_roam', label: '🧪 Livre' }
    ];
    let pickedBiome = summary?._votedBiome || 'desert';
    let pickedMode = summary?._votedMpMode || summary?.mpMode || 'race';

    const renderView = () => {
      container.innerHTML = `
      <div class="overlay-center">
        <div class="chunky-panel modal-card" style="max-width:740px; text-align:center;">
          <h2 style="color:#ffd447; font-size:1.65rem;">🏆 PÓDIO MULTIPLAYER (${modeName})</h2>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; font-size:0.8rem; color:#cbd5e1; margin:4px 0 8px;">
            <span>⏱️ ${durLabel}</span>
            <span>📏 ${matchDist}m</span>
            <span>🌍 ${biomeLabel}</span>
            <span>🎚️ ${diffLabel}</span>
            ${summary?.raceTargetDistance ? `<span>🏁 Meta ${Math.floor(summary.raceTargetDistance)}m</span>` : ''}
            ${summary?.raidTotalDamage > 0 ? `<span>🐉 Dano Raid ${Math.floor(summary.raidTotalDamage)}</span>` : ''}
            ${summary?.maxCombo > 1 ? `<span>🔥 Combo Max ${summary.maxCombo}x</span>` : ''}
          </div>
          ${mvp ? `<div class="item-card" style="border-color:#ffd447; margin:8px 0;">
            <strong style="font-size:1.12rem; color:#58d63a;">🥇 CAMPEÃO &amp; MVP: ${escapeHtml(mvp.name)} (${Math.floor(mvp.score)} pts)</strong>
            <div style="font-size:0.84rem; color:#ffe6a7;">
              ${summary?.rewardEggs > 0 ? `🥚 Prêmio ganho nesta corrida: <strong>+${summary.rewardEggs} Ovos</strong>` : '👑 Coroa de Campeão conquistada! (Prêmios de ovos exigem 2+ humanos na sala)'}
            </div>
          </div>` : ''}
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
            ${standings.map((p, i) => `
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; padding:8px 12px; border-radius:10px; background:rgba(0,0,0,0.35); border-left:4px solid ${sanitizeHexColor(p.color, '#ffd447')};">
                <span>
                  <strong>#${i + 1} ${escapeHtml(p.name)}</strong>
                  ${i === 0 ? '👑' : ''}
                  ${p.dinoId ? `<small style="opacity:0.75;">(${escapeHtml(p.dinoId)})</small>` : ''}
                  ${p.alive === false ? '<small style="color:#ff6b6b;">💀</small>' : ''}
                </span>
                <span style="font-size:0.85rem;">
                  <strong>${Math.floor(p.score)} pts</strong>
                  ${typeof p.raidDamage === 'number' && p.raidDamage > 0 ? ` • 🐉 ${Math.floor(p.raidDamage)} dmg (${Math.round(p.raidDps || 0)} DPS)` : ''}
                  ${typeof p.distance === 'number' && summary?.raceTargetDistance ? ` • 📏 ${Math.floor(p.distance)}m` : ''}
                  ${typeof p.eggs === 'number' ? ` • 🥚 ${p.eggs}` : ''}
                  ${typeof p.stomps === 'number' && p.stomps > 0 ? ` • 💥 ${p.stomps}` : ''}
                  ${p.pvpHits ? ` • ⚔️ ${p.pvpHits}` : ''}
                  ${p.eggReward > 0 ? ` • <span style="color:#58d63a;">+${p.eggReward}🥚</span>` : ''}
                  • 📶 ${p.pingMs || 2}ms
                </span>
              </div>
            `).join('')}
          </div>
          <div class="item-card" style="margin-bottom:10px; text-align:left; border-color:#38bdf8;">
            <strong style="color:#38bdf8; font-size:0.86rem;">🗳️ Votação para Próxima Rodada (Mapa & Modo):</strong>
            <div class="tabs-row" style="margin-top:6px; gap:5px;">
              ${voteBiomes.map((b) => `<button class="tab-btn ${pickedBiome === b.id ? 'active' : ''}" data-vbiome="${b.id}">${b.label}</button>`).join('')}
            </div>
            <div class="tabs-row" style="margin-top:6px; gap:5px;">
              ${voteModes.map((m) => `<button class="tab-btn ${pickedMode === m.id ? 'active' : ''}" data-vmode="${m.id}">${m.label}</button>`).join('')}
            </div>
          </div>
          <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
            <button class="chunky-btn" id="pod-rematch">🔄 Revanche (Mesma Sala)</button>
            <button class="chunky-btn orange" id="pod-again">🔁 Próxima Rodada</button>
            <button class="chunky-btn secondary" id="pod-replay">🎬 Replay</button>
            <button class="chunky-btn secondary" id="pod-trivia" ${summary?._triviaDone ? 'disabled' : ''}>
              ${summary?._triviaDone ? '✔ Trivia OK' : '⚡ Trivia (+6 🥚)'}
            </button>
            <button class="chunky-btn secondary" id="pod-menu">🏠 Menu</button>
          </div>
        </div>
      </div>
    `;
      container.querySelectorAll('[data-vbiome]').forEach((b) => {
        b.onclick = () => {
          pickedBiome = b.getAttribute('data-vbiome');
          if (summary) summary._votedBiome = pickedBiome;
          actions.onVote?.({ biomeId: pickedBiome, mpMode: pickedMode });
          renderView();
        };
      });
      container.querySelectorAll('[data-vmode]').forEach((b) => {
        b.onclick = () => {
          pickedMode = b.getAttribute('data-vmode');
          if (summary) summary._votedMpMode = pickedMode;
          actions.onVote?.({ biomeId: pickedBiome, mpMode: pickedMode });
          renderView();
        };
      });
      container.querySelector('#pod-rematch').onclick = () => (actions.onRematch ? actions.onRematch() : actions.onAgain?.({ keepRoomConfig: true }));
      container.querySelector('#pod-replay').onclick = actions.onReplay;
      container.querySelector('#pod-again').onclick = () => actions.onAgain?.({ votedBiome: pickedBiome, votedMpMode: pickedMode });
      container.querySelector('#pod-trivia').onclick = () => {
        if (summary?._triviaDone) return;
        if (summary) summary._triviaDone = true;
        this.renderTriviaModal(container, () => renderView());
      };
      container.querySelector('#pod-menu').onclick = actions.onMenu;
    };
    renderView();
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
