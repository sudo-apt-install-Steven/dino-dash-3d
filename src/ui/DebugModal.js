// Painel de Depuração (Ideia 146 — Tecla F9) + Relatório de Auditoria de Bosses + Benchmark/PC Fraco.
import { EVENT_CATALOG } from '../events/EventManager.js';
import { BOSS_DEFS } from '../events/BossManager.js';
import { BOSS_AUDIT_REPORT } from '../events/BossModels.js';
import { VOXEL_AUDIT_REPORT } from '../models/VoxelLibrary.js';
import { PREDATOR_CATALOG } from '../events/PredatorModels.js';
import { BIOMES } from '../world/Biomes.js';
import { Save } from '../systems/Save.js';
import { PerfMonitor } from '../systems/PerfMonitor.js';
import { runLiveRenderAudit } from '../world/BrightnessAudit.js';
import { runEconomySimulation } from '../systems/EconomySim.js';
import { runBotQASimulation } from '../systems/BotQA.js';
import { attachModalHelp } from './Menus.js';

export class DebugModal {
  static renderInto(container, game, onClose) {
    let benchMsg = Save.data.benchmarkFps ? `Último Benchmark: ~${Save.data.benchmarkFps} FPS` : '';
    let lightReport = null;
    let ecoReport = null;
    let botReport = null;

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
                  <button class="chunky-btn secondary" id="dbg-audit-light">☀️ Auditar Brilho</button>
                  <button class="chunky-btn secondary" id="dbg-sim-eco">⚖️ Simular Economia (100)</button>
                  <button class="chunky-btn secondary" id="dbg-bot-qa">🤖 Bot QA (100 Corridas)</button>
                  <button class="chunky-btn orange" id="dbg-eggs">+600 Ovos 🥚</button>
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
                <div style="display:flex; gap:6px; margin-top:6px;">
                  <select class="select-input" id="dbg-predator" style="flex:1;">
                    ${PREDATOR_CATALOG.map((p) => `<option value="${p.id}">🐾 ${p.name} (${p.biome})</option>`).join('')}
                  </select>
                  <button class="chunky-btn orange" id="dbg-go-predator">Spawn Predador</button>
                </div>
              </div>
            </div>

            ${lightReport ? `
            <div class="item-card" style="margin-top:8px;">
                <strong style="color:#fde047;">☀️ Auditoria Biomas × Climas × Horários (${lightReport.passed}/${lightReport.total} OK • WebGL ${lightReport.livePassed ?? 0}/${lightReport.liveSamples ?? 0})</strong>
                <div style="max-height:130px; overflow-y:auto; font-size:0.74rem; display:grid; gap:2px;">
                  ${lightReport.results.filter((r) => !r.ok).slice(0, 8).map((r) => `<div>⚠️ ${r.biomeName} (${r.phaseLabel}): brilho ${r.effectiveTrackBrightness} | neblina vis ${r.fogVis35m}%</div>`).join('') || '<div style="color:#4ade80;">✅ 100% dos biomas, horários e climas aprovados!</div>'}
                </div>
              </div>
            ` : ''}

            ${ecoReport ? `
              <div class="item-card" style="margin-top:8px; border-color:#58d63a;">
                <strong style="color:#58d63a;">⚖️ Simulador Econômico (${ecoReport.runCount} partidas de ~3 min)</strong>
                <div style="font-size:0.78rem; color:#e5d3bc; display:grid; gap:3px; margin-top:4px;">
                  <div>• Média por 3 min: <strong style="color:#ffd447;">${ecoReport.avgPer3Min} 🥚</strong> (faixa meta 150–400: ${ecoReport.inTargetBand150to400 ? '✅ APROVADO' : '⚠️ FORA'}) • Cristais/partida: <strong>${ecoReport.avgCrystals} 💎</strong></div>
                  <div>• Corridas por patamar: 150 🥚 (${ecoReport.runsToTier[150]}x) • 600 🥚 (${ecoReport.runsToTier[600]}x) • 2.500 🥚 (${ecoReport.runsToTier[2500]}x) • 10.000 🥚 (${ecoReport.runsToTier[10000]}x)</div>
                  <div>• Ovo Misterioso completo (${ecoReport.mysteryCost} → ${ecoReport.mysteryCompleteRefund} 🥚): lucro líquido <strong>${ecoReport.mysteryNetOnComplete} 🥚</strong> (${ecoReport.infiniteFarmBlocked ? '✅ Zero farm infinito!' : '⚠️ Farm!'})</div>
                  <div>• Upgrades +40%/nv (1→10): ${ecoReport.upgradeCosts.join(' → ')} 🥚</div>
                </div>
              </div>
            ` : ''}

            ${botReport ? `
              <div class="item-card" style="margin-top:8px; border-color:#38bdf8;">
                <strong style="color:#38bdf8;">🤖 Relatório Bot QA Automatizado (${botReport.passedRuns}/${botReport.runCount} Corridas)</strong>
                <div style="font-size:0.78rem; color:#e0f2fe; display:grid; gap:3px; margin-top:4px;">
                  <div>• Status: <strong style="color:${botReport.ok ? '#4ade80' : '#ff4757'};">${botReport.ok ? '✅ 0 CRASHES • 0 NaNs' : `⚠️ Crashes: ${botReport.crashedRuns} | NaNs: ${botReport.nanErrors}`}</strong> • Passos simulados: <strong>${botReport.totalStepsSimulated}</strong></div>
                  <div>• Cobertura: <strong>${botReport.uniqueDinosTested}</strong> dinos • <strong>${botReport.uniqueBiomesTested}</strong> biomas • <strong>${botReport.uniqueChunksTested}</strong> blocos de pista • <strong>${botReport.uniqueStatusesTested}</strong> status • <strong>${botReport.uniqueItemsChecked}</strong> itens • <strong>${botReport.perfectRunsTested}</strong> corridas Modo Perfeito</div>
                </div>
              </div>
            ` : ''}

            <div class="item-card" style="margin-top:8px;">
              <strong style="color:#38bdf8;">🧱 Auditoria de Modelos Voxel Próprios (Zero Primitivas Genéricas)</strong>
              <div style="display:grid; gap:4px; font-size:0.78rem; color:#e0f2fe; margin-top:4px;">
                ${VOXEL_AUDIT_REPORT.map((r) => `<div>• <strong>${r.category}:</strong> [${r.status} • mín. ${r.minParts} peças] — ${r.note}</div>`).join('')}
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
        benchMsg = '⏳ Medindo FPS reais no WebGL (~1s)...';
        render();
        PerfMonitor.runTimedBenchmark(game, 1000).then((res) => {
          benchMsg = `Benchmark Real: ~${res.estFps} FPS • Nível ${res.tier} (${res.frameCount} quadros/${res.elapsedMs}ms)${res.lowSpecSuggested ? ' — Sugerido: Meu PC é Fraco' : ''}`;
          render();
        });
      };
      container.querySelector('#dbg-audit-light').onclick = () => {
        lightReport = runLiveRenderAudit(game);
        render();
      };
      container.querySelector('#dbg-sim-eco').onclick = () => {
        ecoReport = runEconomySimulation(100);
        render();
      };
      container.querySelector('#dbg-bot-qa').onclick = () => {
        botReport = runBotQASimulation(100);
        render();
      };
      container.querySelector('#dbg-eggs').onclick = () => {
        Save.addEggs(600);
        Save.data.crystals = (Save.data.crystals || 0) + 5;
        Save.save();
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
      container.querySelector('#dbg-go-predator').onclick = () => {
        const predId = container.querySelector('#dbg-predator').value;
        if (game.state !== 'playing') game.startRun();
        game.events.predators.startEncounter(game.currentBiome?.id || 'desert', game._eventContext(), predId);
        onClose();
      };
      attachModalHelp(container, 'Ferramentas de QA e depuração: invoque chefes/eventos, audite iluminação 3D nos 15 biomas e rode benchmark de FPS.');
    };

    render();
  }
}
