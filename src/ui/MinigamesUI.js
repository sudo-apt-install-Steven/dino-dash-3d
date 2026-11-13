// Minigames Bônus: Pesca de Ovos no Rio, Minigame de Ritmo e Chocar Ovo (cria filhote companheiro).
import { Save } from '../systems/Save.js';
import { DINO_CATALOG } from '../dinos/DinoCatalog.js';

const DAILY_MINIGAME_EGG_CAP = 25;

function ensureDailyRecord() {
  const today = new Date().toISOString().slice(0, 10);
  if (!Save.data.minigamesDaily || Save.data.minigamesDaily.date !== today) {
    Save.data.minigamesDaily = { date: today, eggsEarned: 0 };
    Save.save();
  }
  return Save.data.minigamesDaily;
}

function getDailyRemaining() {
  const rec = ensureDailyRecord();
  return Math.max(0, DAILY_MINIGAME_EGG_CAP - (rec.eggsEarned || 0));
}

function awardMinigameEggs(want) {
  const rec = ensureDailyRecord();
  const avail = Math.max(0, DAILY_MINIGAME_EGG_CAP - (rec.eggsEarned || 0));
  const granted = Math.min(avail, want);
  if (granted > 0) {
    rec.eggsEarned = (rec.eggsEarned || 0) + granted;
    Save.addEggs(granted);
  }
  return granted;
}

export class MinigamesUI {
  static openHub(container, { onClose, sfx }) {
    let timerId = 0;
    let keyHandler = null;

    const cleanup = () => {
      if (timerId) cancelAnimationFrame(timerId);
      timerId = 0;
      if (keyHandler) {
        window.removeEventListener('keydown', keyHandler);
        keyHandler = null;
      }
    };

    const renderMenu = () => {
      cleanup();
      const rem = getDailyRemaining();
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 720px;">
            <div class="modal-header">
              <div>
                <h2>🕹️ Minigames</h2>
                <div style="font-size:0.84rem; color:#fde047;">Limite diário de prêmio em minigames: <strong>${rem} / ${DAILY_MINIGAME_EGG_CAP} 🥚</strong> disponíveis hoje</div>
              </div>
              <button class="chunky-btn secondary" id="mg-close">Voltar</button>
            </div>
            <div class="cards-grid">
              <div class="item-card">
                <strong>🎣 Pesca de Ovos no Rio</strong>
                <p style="font-size:0.84rem; color:#d8c2a6;">Clique <strong>exatamente</strong> na zona verde (sem segurar fora e soltar!). 5 tentativas • +3 🥚 por acerto.</p>
                <button class="chunky-btn" id="mg-fish">Jogar</button>
              </div>
              <div class="item-card">
                <strong>🎵 Ritmo Jurássico</strong>
                <p style="font-size:0.84rem; color:#d8c2a6;">Acerte no exato instante (clique ou Espaço) quando o cursor estiver dentro da zona verde. 10 rodadas • +2 🥚/acerto.</p>
                <button class="chunky-btn orange" id="mg-rhythm">Jogar</button>
              </div>
              <div class="item-card">
                <strong>🥚 Chocar o Ovo</strong>
                <p style="font-size:0.84rem; color:#d8c2a6;">Aqueça o ovo com cliques rápidos até nascer um filhote companheiro!</p>
                <button class="chunky-btn" id="mg-hatch">Chocar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      container.querySelector('#mg-close').addEventListener('click', () => { cleanup(); onClose(); });
      container.querySelector('#mg-fish').addEventListener('click', startFishing);
      container.querySelector('#mg-rhythm').addEventListener('click', startRhythm);
      container.querySelector('#mg-hatch').addEventListener('click', startHatch);
    };

    const startFishing = () => {
      cleanup();
      let pos = 8;
      let dir = 1;
      let caught = 0;
      let hits = 0;
      let tries = 5;
      let lastTick = performance.now();

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 540px; text-align:center;">
            <div class="modal-header">
              <h2>🎣 Pesca de Ovos</h2>
              <button class="chunky-btn secondary" id="mg-back">Menu</button>
            </div>
            <p style="font-size:0.9rem;">Pressione o botão (ou <strong>Espaço</strong>) <strong>exatamente</strong> dentro da zona verde (42%–58%). Tentativas: <strong id="fish-tries">${tries}</strong></p>
            <div style="position:relative; height:38px; background:#0d4f82; border:3px solid #5b3117; border-radius:12px; overflow:hidden; margin: 10px 0;">
              <div style="position:absolute; left:42%; width:16%; top:0; bottom:0; background:rgba(74, 222, 128, 0.5); border-left:2px solid #86efac; border-right:2px solid #86efac;"></div>
              <div id="fish-mark" style="display:none; position:absolute; top:0; bottom:0; width:4px; transform:translateX(-50%); background:#ffffff; z-index:2;"></div>
              <div id="fish-bobber" style="position:absolute; left:8%; width:14px; top:3px; bottom:3px; transform:translateX(-50%); background:#ff4757; border:2px solid #fff; border-radius:6px; z-index:3;"></div>
            </div>
            <div id="fish-status" class="hud-pill" style="margin:0 auto 10px;">Ovos ganhos: 0 • Restam hoje: ${getDailyRemaining()} 🥚</div>
            <button class="chunky-btn" id="fish-pull">PUXAR ANZOL! (Clique no verde)</button>
          </div>
        </div>
      `;

      const bob = container.querySelector('#fish-bobber');
      const mark = container.querySelector('#fish-mark');
      const status = container.querySelector('#fish-status');
      const triesEl = container.querySelector('#fish-tries');
      const pullBtn = container.querySelector('#fish-pull');

      const loop = (now) => {
        const dt = Math.min(0.05, (now - lastTick) / 1000);
        lastTick = now;
        pos += dir * 92 * dt;
        if (pos >= 94) { pos = 94; dir = -1; }
        if (pos <= 6) { pos = 6; dir = 1; }
        bob.style.left = `${pos}%`;
        timerId = requestAnimationFrame(loop);
      };
      timerId = requestAnimationFrame(loop);

      const triggerPull = () => {
        if (tries <= 0) return;
        tries--;
        triesEl.textContent = tries;
        const clickPos = pos;
        const hitGreen = clickPos >= 42 && clickPos <= 58;
        mark.style.display = 'block';
        mark.style.left = `${clickPos}%`;
        mark.style.background = hitGreen ? '#4ade80' : '#ef4444';

        if (hitGreen) {
          hits++;
          const granted = awardMinigameEggs(3);
          caught += granted;
          sfx?.egg(hits);
          status.textContent = granted > 0
            ? `🎉 Na mosca! +${granted} 🥚 (Total: ${caught} • Limite hoje: ${getDailyRemaining()})`
            : `🎯 Acertou no treino! (Limite diário de 25 🥚 já atingido hoje)`;
        } else {
          sfx?.hurt();
          status.textContent = `❌ Fora do verde! Ovos: +${caught} • Restam hoje: ${getDailyRemaining()} 🥚`;
        }
        if (tries <= 0) {
          pullBtn.textContent = `Fim da Pesca! (${hits}/5 acertos • +${caught} 🥚)`;
          pullBtn.disabled = true;
        }
      };

      // Importante: somente pointerdown (não click/mouseup!) para impedir clicar fora e soltar dentro do verde
      pullBtn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        triggerPull();
      });

      keyHandler = (e) => {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          triggerPull();
        }
      };
      window.addEventListener('keydown', keyHandler);
      container.querySelector('#mg-back').addEventListener('click', renderMenu);
    };

    const startRhythm = () => {
      cleanup();
      let beat = 6;
      let score = 0;
      let hits = 0;
      let misses = 0;
      let roundsLeft = 10;
      let finished = false;
      let lastTick = performance.now();

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 540px; text-align:center;">
            <div class="modal-header">
              <h2>🎵 Ritmo Jurássico</h2>
              <button class="chunky-btn secondary" id="mg-back">Menu</button>
            </div>
            <p style="font-size:0.9rem;">Clique (ou aperte <strong>Espaço</strong>) <strong>exatamente</strong> na faixa verde (43%–57%). Rodadas: <strong id="rhy-rounds">${roundsLeft}</strong> • Erros máx: 3</p>
            <div style="position:relative; height:40px; background:#22130b; border:3px solid #5b3117; border-radius:12px; overflow:hidden; margin:10px 0;">
              <div style="position:absolute; left:43%; width:14%; top:0; bottom:0; background:rgba(74, 222, 128, 0.5); border-left:2px solid #86efac; border-right:2px solid #86efac;"></div>
              <div id="rhy-mark" style="display:none; position:absolute; top:0; bottom:0; width:4px; transform:translateX(-50%); background:#ffffff; z-index:2;"></div>
              <div id="rhy-note" style="position:absolute; left:6%; width:14px; top:4px; bottom:4px; transform:translateX(-50%); background:#ffd447; border:2px solid #fff; border-radius:8px; z-index:3;"></div>
            </div>
            <div id="rhy-info" class="hud-pill" style="margin:0 auto 10px;">Acertos: 0 • Erros: 0/3 • Prêmio: +0 🥚</div>
            <button class="chunky-btn orange" id="rhy-hit">BATER NO COMPASSO! (Clique no verde)</button>
          </div>
        </div>
      `;

      const note = container.querySelector('#rhy-note');
      const mark = container.querySelector('#rhy-mark');
      const info = container.querySelector('#rhy-info');
      const roundsEl = container.querySelector('#rhy-rounds');
      const hitBtn = container.querySelector('#rhy-hit');

      const loop = (now) => {
        const dt = Math.min(0.05, (now - lastTick) / 1000);
        lastTick = now;
        const speed = 104 + hits * 6;
        beat += speed * dt;
        if (beat >= 96) beat = 4;
        note.style.left = `${beat}%`;
        timerId = requestAnimationFrame(loop);
      };
      timerId = requestAnimationFrame(loop);

      const triggerHit = () => {
        if (finished || roundsLeft <= 0) return;
        roundsLeft--;
        roundsEl.textContent = roundsLeft;
        const clickPos = beat;
        const hitGreen = clickPos >= 43 && clickPos <= 57;
        mark.style.display = 'block';
        mark.style.left = `${clickPos}%`;
        mark.style.background = hitGreen ? '#4ade80' : '#ef4444';

        if (hitGreen) {
          hits++;
          const granted = awardMinigameEggs(2);
          score += granted;
          sfx?.egg(hits);
          info.textContent = granted > 0
            ? `✨ NO RITMO! Acertos: ${hits} • Erros: ${misses}/3 • +${score} 🥚`
            : `✨ NO RITMO! (Treino — limite diário de 25 🥚 atingido)`;
        } else {
          misses++;
          sfx?.hurt();
          info.textContent = `❌ Fora do verde! Acertos: ${hits} • Erros: ${misses}/3 • +${score} 🥚`;
        }

        if (roundsLeft <= 0 || misses >= 3) {
          finished = true;
          hitBtn.textContent = misses >= 3 ? `Fim (3 erros) • Ganhou +${score} 🥚` : `Série Completa! ${hits}/10 • +${score} 🥚`;
          hitBtn.disabled = true;
        }
      };

      // Somente pointerdown (nunca click/mouseup) para não aceitar segurar fora e soltar no verde
      hitBtn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        triggerHit();
      });

      keyHandler = (e) => {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          triggerHit();
        }
      };
      window.addEventListener('keydown', keyHandler);
      container.querySelector('#mg-back').addEventListener('click', renderMenu);
    };

    const startHatch = () => {
      cleanup();
      let warmth = 0;
      let hatched = false;

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 480px; text-align:center;">
            <div class="modal-header">
              <h2>🥚 Chocar Companheiro</h2>
              <button class="chunky-btn secondary" id="mg-back">Menu</button>
            </div>
            <div style="font-size:4rem; margin: 10px 0;" id="egg-emoji">🥚</div>
            <div class="meter-bar" style="height:16px;"><div class="meter-fill" id="hatch-bar" style="width:0%; background:#ffd447;"></div></div>
            <p id="hatch-msg" style="color:#d8c2a6;">Clique várias vezes para aquecer e chocar um filhote companheiro!</p>
            <button class="chunky-btn" id="hatch-tap">AQUECER OVO!</button>
          </div>
        </div>
      `;

      container.querySelector('#hatch-tap').addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        if (hatched) return;
        warmth = Math.min(100, warmth + 14);
        container.querySelector('#hatch-bar').style.width = `${warmth}%`;
        sfx?.click();
        if (warmth >= 100) {
          hatched = true;
          const nonSecret = DINO_CATALOG.filter((d) => !d.secret);
          const species = nonSecret[Math.floor(Math.random() * nonSecret.length)];
          Save.data.activeCompanion = species.id;
          Save.save();
          sfx?.evolution();
          container.querySelector('#egg-emoji').textContent = '🐣🦖';
          container.querySelector('#hatch-msg').textContent = `Nasceu um filhote de ${species.name}! Ele agora te acompanha nas corridas!`;
          container.querySelector('#hatch-tap').textContent = 'Companheiro Ativo!';
        }
      });

      container.querySelector('#mg-back').addEventListener('click', renderMenu);
    };

    renderMenu();
    return cleanup;
  }
}
