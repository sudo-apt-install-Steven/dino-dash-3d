// Painel de Depuração (B0) — Ativo SOMENTE em desenvolvimento com ?debug=1 (ausente em produção).
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
  static isDebugEnabled() {
    if (!import.meta.env?.DEV) return false;
    if (typeof window === 'undefined' || typeof location === 'undefined') return false;
    try {
      return new URLSearchParams(location.search).get('debug') === '1';
    } catch {
      return false;
    }
  }

  /**
   * Monta o overlay e painel de debug somente em DEV com ?debug=1.
   * Em produção (import.meta.env.PROD), retorna null sem montar DOM.
   */
  static mountIfDev(game) {
    if (!import.meta.env?.DEV) return null;
    if (!DebugModal.isDebugEnabled()) return null;
    if (typeof document === 'undefined' || !game) return null;

    const existing = document.getElementById('dino-debug-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'dino-debug-root';
    root.style.cssText = [
      'position:fixed',
      'top:8px',
      'right:8px',
      'z-index:99999',
      'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
      'font-size:11px',
      'color:#f8fafc',
      'pointer-events:auto',
      'max-width:390px',
      'width:calc(100vw - 16px)'
    ].join(';');

    const logs = [];
    const pushLog = (msg) => {
      const ts = new Date().toLocaleTimeString('pt-BR', { hour12: false });
      logs.unshift(`[${ts}] ${msg}`);
      if (logs.length > 40) logs.length = 40;
    };

    // Hook não-invasivo de tempo x2/x4 e vida/escudo infinitos apenas em DEV
    let timeScale = 1;
    let infiniteVitals = false;
    if (!game._debugHooked && typeof game._updatePlaying === 'function') {
      const origUpdate = game._updatePlaying.bind(game);
      game._updatePlaying = (dt) => {
        if (infiniteVitals && Array.isArray(game.players)) {
          for (const p of game.players) {
            if (!p.dead) {
              p.hp = p.maxHp || 3;
              p.shields = Math.max(p.shields || 0, 4);
              p.oxygen = 100;
              p.stamina = 100;
            }
          }
        }
        const steps = timeScale === 4 ? 4 : (timeScale === 2 ? 2 : 1);
        for (let i = 0; i < steps; i++) {
          origUpdate(dt);
          if (game.state !== 'playing') break;
        }
      };
      if (game.events && typeof game.events.triggerById === 'function') {
        const origTrig = game.events.triggerById.bind(game.events);
        game.events.triggerById = (id, ctx, force) => {
          const ok = origTrig(id, ctx, force);
          if (ok) pushLog(`Evento: ${id} (score=${Math.round(game.score || 0)})`);
          return ok;
        };
      }
      game._debugHooked = true;
    }

    let collapsed = false;
    root.innerHTML = `
      <div style="background:rgba(9,13,22,0.9);border:1px solid #334155;border-radius:10px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,0.55);backdrop-filter:blur(6px);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;">
          <strong style="color:#38bdf8;">🛠️ DEBUG (?debug=1)</strong>
          <button id="dbg-ov-toggle" style="background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:6px;padding:2px 8px;cursor:pointer;">Ocultar</button>
        </div>
        <div id="dbg-ov-telemetry" style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:6px;line-height:1.45;margin-bottom:6px;"></div>
        <div id="dbg-ov-controls" style="display:grid;gap:6px;">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <input id="dbg-score-val" type="number" value="60000" style="width:82px;background:#0f172a;color:#fff;border:1px solid #475569;border-radius:4px;padding:3px 5px;" />
            <button id="dbg-set-score" style="background:#0284c7;color:#fff;border:0;border-radius:4px;padding:3px 7px;cursor:pointer;">Ir Score</button>
            <button id="dbg-jump-60k" style="background:#7c3aed;color:#fff;border:0;border-radius:4px;padding:3px 7px;cursor:pointer;">60k pts</button>
            <button id="dbg-speed-1" style="background:#334155;color:#fff;border:0;border-radius:4px;padding:3px 6px;cursor:pointer;">x1</button>
            <button id="dbg-speed-2" style="background:#334155;color:#fff;border:0;border-radius:4px;padding:3px 6px;cursor:pointer;">x2</button>
            <button id="dbg-speed-4" style="background:#334155;color:#fff;border:0;border-radius:4px;padding:3px 6px;cursor:pointer;">x4</button>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <label style="cursor:pointer;"><input type="checkbox" id="dbg-ov-god" ${game.godMode ? 'checked' : ''}/> Invencível</label>
            <label style="cursor:pointer;"><input type="checkbox" id="dbg-ov-inf"/> Vida/Escudo ∞</label>
            <button id="dbg-kill-p1" style="background:#dc2626;color:#fff;border:0;border-radius:4px;padding:3px 7px;cursor:pointer;">💀 Matar P1</button>
          </div>
          <div style="display:flex;gap:4px;align-items:center;">
            <span>Simular Jogadores:</span>
            <button data-sim-p="2" style="background:#1d4ed8;color:#fff;border:0;border-radius:4px;padding:2px 7px;cursor:pointer;">2P</button>
            <button data-sim-p="3" style="background:#1d4ed8;color:#fff;border:0;border-radius:4px;padding:2px 7px;cursor:pointer;">3P</button>
            <button data-sim-p="4" style="background:#1d4ed8;color:#fff;border:0;border-radius:4px;padding:2px 7px;cursor:pointer;">4P</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:4px;">
            <select id="dbg-ov-ev" style="background:#0f172a;color:#fff;border:1px solid #475569;border-radius:4px;padding:3px;">
              ${EVENT_CATALOG.map((e) => `<option value="${e.id}">${e.label}</option>`).join('')}
            </select>
            <button id="dbg-ov-go-ev" style="background:#059669;color:#fff;border:0;border-radius:4px;padding:3px 8px;cursor:pointer;">Evento</button>
            <select id="dbg-ov-boss" style="background:#0f172a;color:#fff;border:1px solid #475569;border-radius:4px;padding:3px;">
              ${Object.values(BOSS_DEFS).map((b) => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
            <button id="dbg-ov-go-boss" style="background:#ea580c;color:#fff;border:0;border-radius:4px;padding:3px 8px;cursor:pointer;">Boss</button>
            <select id="dbg-ov-pred" style="background:#0f172a;color:#fff;border:1px solid #475569;border-radius:4px;padding:3px;">
              ${PREDATOR_CATALOG.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <button id="dbg-ov-go-pred" style="background:#d97706;color:#fff;border:0;border-radius:4px;padding:3px 8px;cursor:pointer;">Predador</button>
            <select id="dbg-ov-biome" style="background:#0f172a;color:#fff;border:1px solid #475569;border-radius:4px;padding:3px;">
              ${BIOMES.map((b) => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
            <button id="dbg-ov-go-biome" style="background:#0284c7;color:#fff;border:0;border-radius:4px;padding:3px 8px;cursor:pointer;">Bioma</button>
          </div>
          <div id="dbg-ov-log" style="max-height:95px;overflow-y:auto;background:#020617;border:1px solid #1e293b;border-radius:4px;padding:4px;font-size:10px;color:#cbd5e1;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const telEl = root.querySelector('#dbg-ov-telemetry');
    const logEl = root.querySelector('#dbg-ov-log');
    const controlsEl = root.querySelector('#dbg-ov-controls');
    const toggleBtn = root.querySelector('#dbg-ov-toggle');

    toggleBtn.onclick = () => {
      collapsed = !collapsed;
      controlsEl.style.display = collapsed ? 'none' : 'grid';
      toggleBtn.textContent = collapsed ? 'Abrir' : 'Ocultar';
    };

    const ensurePlaying = () => {
      if (game.state !== 'playing') game.startRun?.();
    };

    const jumpScore = (target) => {
      ensurePlaying();
      const val = Math.max(0, Number(target) || 0);
      game.score = val;
      game.distance = Math.max(game.distance || 0, Math.round(val * 1.4));
      pushLog(`Score -> ${val}`);
    };

    root.querySelector('#dbg-set-score').onclick = () => jumpScore(root.querySelector('#dbg-score-val').value);
    root.querySelector('#dbg-jump-60k').onclick = () => {
      root.querySelector('#dbg-score-val').value = '60000';
      jumpScore(60000);
    };

    const setScale = (s) => {
      timeScale = s;
      pushLog(`Velocidade tempo: x${s}`);
    };
    root.querySelector('#dbg-speed-1').onclick = () => setScale(1);
    root.querySelector('#dbg-speed-2').onclick = () => setScale(2);
    root.querySelector('#dbg-speed-4').onclick = () => setScale(4);

    root.querySelector('#dbg-ov-god').onchange = (e) => {
      game.godMode = e.target.checked;
      pushLog(`Invencível: ${game.godMode}`);
    };
    root.querySelector('#dbg-ov-inf').onchange = (e) => {
      infiniteVitals = e.target.checked;
      pushLog(`Vida/Escudo ∞: ${infiniteVitals}`);
    };
    root.querySelector('#dbg-kill-p1').onclick = () => {
      const p0 = game.players?.[0];
      if (!p0) return;
      p0.shields = 0;
      p0.hp = 0;
      p0.dead = true;
      p0._lastDeathCause = 'debug_kill';
      game._checkAllPlayersDead?.();
      pushLog(`Jogador ${p0.name || 'P1'} eliminado via debug`);
    };

    root.querySelectorAll('[data-sim-p]').forEach((btn) => {
      btn.onclick = () => {
        const n = Number(btn.getAttribute('data-sim-p')) || 2;
        const dinos = ['trex', 'raptor', 'triceratops', 'spinosaurus'];
        const roster = Array.from({ length: n }, (_, i) => ({
          key: `p${i + 1}`,
          dinoId: dinos[i % dinos.length],
          name: i === 0 ? 'Jogador 1' : `Sim ${i + 1}`,
          peerId: `sim_${i + 1}`,
          isBot: i > 0
        }));
        game.rebuildPlayers?.(roster);
        if (game.state !== 'playing') game.startRun?.(false, { roster });
        pushLog(`Jogadores simulados: ${n}`);
      };
    });

    root.querySelector('#dbg-ov-go-ev').onclick = () => {
      const evId = root.querySelector('#dbg-ov-ev').value;
      ensurePlaying();
      game.events?.triggerById?.(evId, { ...game._eventContext?.(), score: game.score }, true);
    };
    root.querySelector('#dbg-ov-go-boss').onclick = () => {
      const bossId = root.querySelector('#dbg-ov-boss').value;
      ensurePlaying();
      game.events?.triggerById?.('boss', { ...game._eventContext?.(), bossId }, true);
    };
    root.querySelector('#dbg-ov-go-pred').onclick = () => {
      const predId = root.querySelector('#dbg-ov-pred').value;
      ensurePlaying();
      game.events?.predators?.startEncounter?.(game.currentBiome?.id || 'desert', game._eventContext?.(), predId);
      pushLog(`Predador forçado: ${predId}`);
    };
    root.querySelector('#dbg-ov-go-biome').onclick = () => {
      const biomeId = root.querySelector('#dbg-ov-biome').value;
      game.jumpToBiome?.(biomeId);
      pushLog(`Bioma forçado: ${biomeId}`);
    };

    const refreshTelemetry = () => {
      if (!document.body.contains(root)) return;
      const p0 = game.players?.[0];
      const alive = (game.players || []).filter((p) => !p.dead).length;
      const total = (game.players || []).length;
      const evDbg = game.events?.getDebugState?.(game.score || 0) || {};
      const bossDbg = game.events?.bosses?.getDebugState?.() || {};
      const fps = Math.round(game.perf?.avgFps || 0);
      const o2 = p0 ? Math.round(p0.oxygen ?? 100) : 100;

      telEl.innerHTML = `
        <div><strong>FPS:</strong> ${fps} | <strong>Score:</strong> ${Math.round(game.score || 0)} | <strong>Tempo:</strong> x${timeScale}</div>
        <div><strong>Spawner:</strong> próx=${evDbg.nextEventScore ?? '-'} | fila=[${(evDbg.queue || []).join(',')}] | últ=${evDbg.lastEventId || '-'}</div>
        <div><strong>O₂:</strong> ${o2}% ${p0?.inSubmerged ? '(Submerso)' : ''} | <strong>Vivos:</strong> ${alive}/${total}</div>
        <div><strong>Boss:</strong> ${bossDbg.active ? `${bossDbg.name} F${bossDbg.phase} [${bossDbg.state}] ${bossDbg.hp}/${bossDbg.maxHp}` : 'inativo'}</div>
      `;
      logEl.innerHTML = logs.slice(0, 12).map((l) => `<div>${l}</div>`).join('') || '<div style="color:#64748b;">Sem eventos registrados ainda.</div>';
    };

    const timer = setInterval(refreshTelemetry, 250);
    refreshTelemetry();
    pushLog('DebugModal montado em DEV (?debug=1)');

    return {
      root,
      destroy: () => {
        clearInterval(timer);
        root.remove();
      }
    };
  }

  static renderInto(container, game, onClose) {
    if (!import.meta.env?.DEV) {
      container.innerHTML = '';
      onClose?.();
      return;
    }
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
