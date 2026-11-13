// Painel de Depuração (Ideia 146 — Tecla F9) + Relatório de Auditoria de Bosses + Benchmark/PC Fraco.
import { EVENT_CATALOG } from '../events/EventManager.js';
import { BOSS_DEFS } from '../events/BossManager.js';
import { BOSS_AUDIT_REPORT } from '../events/BossModels.js';
import { BIOMES } from '../world/Biomes.js';
import { Save } from '../systems/Save.js';
import { PerfMonitor } from '../systems/PerfMonitor.js';

export class DebugModal {
  static renderInto(container, game, onClose) {
    let benchMsg = Save.data.benchmarkFps ? `Último Benchmark: ~${Save.data.benchmarkFps} FPS` : '';

    const render = () => {
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width:860px;">
            <div class="modal-header">
              <h2>🛠️ Painel de Depuração & Desempenho (F9)</h2>
              <button class="chunky-btn secondary" id="dbg-close">Fechar</button>
            </div>

            <div class="cards-grid" style="grid-template-columns:1fr 1fr;">
              <div class="item-card">
                <strong style="color:#58d63a;">⚡ Controles de Teste & Modos</strong>
                <div style="font-size:0.82rem;">FPS Atual: <strong>${game.perf.avgFps} FPS</strong> • ${benchMsg}</div>
                <label><input type="checkbox" id="dbg-god" ${game.godMode ? 'checked' : ''} /> 🛡️ Modo Deus (Invencível)</label>
                <label><input type="checkbox" id="dbg-low" ${Save.data.lowSpecMode ? 'checked' : ''} /> 💻 Meu PC é fraco (Gráficos Ultra Leves)</label>
                <label><input type="checkbox" id="dbg-mirror" ${Save.data.mirroredMode ? 'checked' : ''} /> 🪞 Modo Espelhado (Controles/Pista Invertidos)</label>
                <label><input type="checkbox" id="dbg-teacher" ${Save.data.teacherMode ? 'checked' : ''} /> 🎓 Modo Professor/Aula (Sem violência)</label>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  <button class="chunky-btn secondary" id="dbg-bench">📊 Rodar Benchmark</button>
                  <button class="chunky-btn orange" id="dbg-eggs">+100 Ovos 🥚</button>
                </div>
              </div>

              <div class="item-card">
                <strong style="color:#ffd447;">🌍 Pular Bioma & Spawnar Boss/Evento</strong>
                <div style="display:flex; gap:6px;">
                  <select class="select-input" id="dbg-biome" style="flex:1;">
                    ${BIOMES.map((b) => `<option value="${b.id}">${b.name}</option>`).join('')}
                  </select>
                  <button class="chunky-btn secondary" id="dbg-go-biome">Pular</button>
                </div>
                <div style="display:flex; gap:6px;">
                  <select class="select-input" id="dbg-boss" style="flex:1;">
                    ${Object.values(BOSS_DEFS).map((b) => `<option value="${b.id}">${b.name} (${b.title})</option>`).join('')}
                  </select>
                  <button class="chunky-btn orange" id="dbg-go-boss">Spawn Boss</button>
                </div>
                <div style="display:flex; gap:6px;">
                  <select class="select-input" id="dbg-ev" style="flex:1;">
                    ${EVENT_CATALOG.map((e) => `<option value="${e.id}">${e.label}</option>`).join('')}
                  </select>
                  <button class="chunky-btn" id="dbg-go-ev">Spawn Evento</button>
                </div>
              </div>
            </div>

            <div class="item-card" style="margin-top:8px;">
              <strong style="color:#ff9a24;">👑 Auditoria Visual dos Bosses (Parte D — Zero Blocos Genéricos)</strong>
              <div style="display:grid; gap:4px; font-size:0.78rem; color:#ffe6c2;">
                ${BOSS_AUDIT_REPORT.map((r) => `<div>• <strong>${r.name} (${r.title}):</strong> [${r.status}] — ${r.details}</div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      container.querySelector('#dbg-close').onclick = onClose;
      container.querySelector('#dbg-god').onchange = (e) => { game.godMode = e.target.checked; };
      container.querySelector('#dbg-low').onchange = (e) => { PerfMonitor.applyLowSpec(game, e.target.checked); };
      container.querySelector('#dbg-mirror').onchange = (e) => {
        Save.data.mirroredMode = e.target.checked;
        Save.save();
      };
      container.querySelector('#dbg-teacher').onchange = (e) => {
        Save.data.teacherMode = e.target.checked;
        Save.save();
      };
      container.querySelector('#dbg-bench').onclick = () => {
        const res = PerfMonitor.runQuickBenchmark(game.renderer);
        benchMsg = `Benchmark: ~${res.estFps} FPS (${res.lowSpecSuggested ? 'PC Fraco sugerido' : 'Ótimo'})`;
        render();
      };
      container.querySelector('#dbg-eggs').onclick = () => {
        Save.addEggs(100);
        render();
      };
      container.querySelector('#dbg-go-biome').onclick = () => {
        const id = container.querySelector('#dbg-biome').value;
        game.jumpToBiome(id);
        onClose();
      };
      container.querySelector('#dbg-go-boss').onclick = () => {
        const bossId = container.querySelector('#dbg-boss').value;
        if (game.state !== 'playing') game.startRun();
        game.events.triggerById('boss', { ...game._eventContext(), bossId }, true);
        onClose();
      };
      container.querySelector('#dbg-go-ev').onclick = () => {
        const evId = container.querySelector('#dbg-ev').value;
        if (game.state !== 'playing') game.startRun();
        game.events.triggerById(evId, game._eventContext(), true);
        onClose();
      };
    };

    render();
  }
}
