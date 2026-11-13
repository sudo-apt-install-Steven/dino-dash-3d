// Minigames Bônus: Pesca de Ovos no Rio, Minigame de Ritmo e Chocar Ovo (cria filhote companheiro).
import { Save } from '../systems/Save.js';
import { DINO_CATALOG } from '../dinos/DinoCatalog.js';

export class MinigamesUI {
  static openHub(container, { onClose, sfx }) {
    let activeGame = 'menu';
    let timerId = 0;

    const cleanup = () => {
      if (timerId) cancelAnimationFrame(timerId);
      timerId = 0;
    };

    const renderMenu = () => {
      cleanup();
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 680px;">
            <div class="modal-header">
              <h2>🕹️ Minigames</h2>
              <button class="chunky-btn secondary" id="mg-close">Voltar</button>
            </div>
            <div class="cards-grid">
              <div class="item-card">
                <strong>🎣 Pesca de Ovos no Rio</strong>
                <p style="font-size:0.84rem; color:#d8c2a6;">Clique no momento certo quando o anzol passar pelo ovo dourado!</p>
                <button class="chunky-btn" id="mg-fish">Jogar</button>
              </div>
              <div class="item-card">
                <strong>🎵 Ritmo Jurássico</strong>
                <p style="font-size:0.84rem; color:#d8c2a6;">Pule ou abaixe no compasso da batida para ganhar ovos extras!</p>
                <button class="chunky-btn orange" id="mg-rhythm">Jogar</button>
              </div>
              <div class="item-card">
                <strong>🥚 Chocar o Ovo</strong>
                <p style="font-size:0.84rem; color:#d8c2a6;">Aqueça o ovo com cliques até nascer um filhote companheiro!</p>
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
      let pos = 10;
      let dir = 1;
      let caught = 0;
      let tries = 5;

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 520px; text-align:center;">
            <div class="modal-header">
              <h2>🎣 Pesca de Ovos</h2>
              <button class="chunky-btn secondary" id="mg-back">Menu</button>
            </div>
            <p>Acerte a zona dourada para pescar ovos! Tentativas: <strong id="fish-tries">${tries}</strong></p>
            <div style="position:relative; height:34px; background:#0d4f82; border:3px solid #5b3117; border-radius:12px; overflow:hidden;">
              <div style="position:absolute; left:40%; width:20%; top:0; bottom:0; background:rgba(255,212,71,0.45);"></div>
              <div id="fish-bobber" style="position:absolute; left:10%; width:18px; top:3px; bottom:3px; background:#ff4757; border-radius:6px;"></div>
            </div>
            <div id="fish-status" class="hud-pill" style="margin:0 auto;">Ovos pescados: 0</div>
            <button class="chunky-btn" id="fish-pull">PUXAR ANZOL!</button>
          </div>
        </div>
      `;

      const bob = container.querySelector('#fish-bobber');
      const status = container.querySelector('#fish-status');
      const triesEl = container.querySelector('#fish-tries');

      const loop = () => {
        pos += dir * 1.45;
        if (pos >= 94) dir = -1;
        if (pos <= 2) dir = 1;
        bob.style.left = `${pos}%`;
        timerId = requestAnimationFrame(loop);
      };
      timerId = requestAnimationFrame(loop);

      container.querySelector('#fish-pull').addEventListener('click', () => {
        if (tries <= 0) return;
        tries--;
        triesEl.textContent = tries;
        if (pos >= 38 && pos <= 60) {
          caught += 5;
          Save.addEggs(5);
          sfx?.egg(3);
          status.textContent = `🎉 Fisgou! Total: +${caught} ovos!`;
        } else {
          sfx?.click();
          status.textContent = `Quase! Ovos pescados: ${caught}`;
        }
        if (tries <= 0) {
          container.querySelector('#fish-pull').textContent = 'Fim da Pesca! (+' + caught + ' ovos)';
        }
      });

      container.querySelector('#mg-back').addEventListener('click', renderMenu);
    };

    const startRhythm = () => {
      cleanup();
      let beat = 0;
      let score = 0;
      let hits = 0;

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 520px; text-align:center;">
            <div class="modal-header">
              <h2>🎵 Ritmo Jurássico</h2>
              <button class="chunky-btn secondary" id="mg-back">Menu</button>
            </div>
            <p>Clique no botão quando o marcador cruzar o centro verde!</p>
            <div style="position:relative; height:36px; background:#22130b; border:3px solid #5b3117; border-radius:12px;">
              <div style="position:absolute; left:44%; width:12%; top:0; bottom:0; background:rgba(88,214,58,0.45);"></div>
              <div id="rhy-note" style="position:absolute; left:0%; width:16px; top:4px; bottom:4px; background:#ffd447; border-radius:8px;"></div>
            </div>
            <div id="rhy-info" class="hud-pill" style="margin:0 auto;">Acertos: 0 • Prêmio: 0 🥚</div>
            <button class="chunky-btn orange" id="rhy-hit">PULAR NO COMPASSO!</button>
          </div>
        </div>
      `;

      const note = container.querySelector('#rhy-note');
      const info = container.querySelector('#rhy-info');
      const loop = () => {
        beat = (beat + 1.8) % 100;
        note.style.left = `${beat}%`;
        timerId = requestAnimationFrame(loop);
      };
      timerId = requestAnimationFrame(loop);

      container.querySelector('#rhy-hit').addEventListener('click', () => {
        if (beat >= 39 && beat <= 59) {
          hits++;
          score += 3;
          Save.addEggs(3);
          sfx?.egg(hits);
          info.textContent = `✨ NO RITMO! Acertos: ${hits} • +${score} 🥚`;
        } else {
          sfx?.hurt();
          info.textContent = `Fora do tempo! Acertos: ${hits} • +${score} 🥚`;
        }
      });

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

      container.querySelector('#hatch-tap').addEventListener('click', () => {
        if (hatched) return;
        warmth = Math.min(100, warmth + 14);
        container.querySelector('#hatch-bar').style.width = `${warmth}%`;
        sfx?.click();
        if (warmth >= 100) {
          hatched = true;
          const species = DINO_CATALOG[Math.floor(Math.random() * 13)];
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
