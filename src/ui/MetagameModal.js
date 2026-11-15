// Metajogo Completo (131–140 + 173–174): Prestígio, Talentos Globais, Mapa da Campanha,
// Editor de Híbridos, Editor de Pistas (seed/JSON), Estatísticas SVG, Sazonal, Times, Ghost & Ranking Global.
import { Save } from '../systems/Save.js';
import { Metagame, TALENT_DEFS, CAMPAIGN_NODES } from '../systems/Metagame.js';
import { DINO_CATALOG, getDinoHabitat, getHybridAvailableModes } from '../dinos/DinoCatalog.js';
import { BIOMES } from '../world/Biomes.js';
import { attachModalHelp } from './Menus.js';

export class MetagameModal {
  static renderInto(container, game, onClose) {
    let tab = 'prestige';
    let feedback = '';
    let globalRows = null;
    let globalInfo = '';

    const loadGlobal = async () => {
      globalInfo = '⏳ Buscando ranking global...';
      render();
      const res = await game.net.supabase.fetchGlobalLeaderboard();
      globalRows = res.rows || [];
      globalInfo = res.ok ? `🌐 Top ${globalRows.length} Global (Supabase)` : `⚠️ ${res.reason}`;
      render();
    };

    const render = () => {
      const prevModalCard = container.querySelector('.modal-card');
      const savedModalScroll = prevModalCard ? prevModalCard.scrollTop : 0;
      const st = Save.data.stats || { runs: 0, totalDist: 0, totalEggs: 0, deathsBy: {}, skillsUsed: {} };
      const { def: wkDef, state: wkState } = Metagame.ensureWeekly();
      const prestige = Save.data.prestige || { level: 0, bonusMult: 1.0 };

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width:960px;">
            <div class="modal-header">
              <h2>🧬 Expansão Jurássica (Prestígio, Campanha, Híbridos & Pistas)</h2>
              <button class="chunky-btn secondary" id="mg-close">Voltar</button>
            </div>

            <div class="tabs-row">
              <button class="tab-btn ${tab === 'prestige' ? 'active' : ''}" data-mt="prestige">✨ Prestígio & Talentos</button>
              <button class="tab-btn ${tab === 'campaign' ? 'active' : ''}" data-mt="campaign">🗺️ Campanha</button>
              <button class="tab-btn ${tab === 'hybrid' ? 'active' : ''}" data-mt="hybrid">🧬 Híbridos</button>
              <button class="tab-btn ${tab === 'editor' ? 'active' : ''}" data-mt="editor">🛠️ Editor de Pistas</button>
              <button class="tab-btn ${tab === 'stats' ? 'active' : ''}" data-mt="stats">📊 Stats & Times</button>
              <button class="tab-btn ${tab === 'global' ? 'active' : ''}" data-mt="global">🌐 Ranking Global</button>
            </div>

            ${feedback ? `<div class="item-card" style="border-color:#ffd447; color:#ffd447; font-weight:700;">${feedback}</div>` : ''}

            ${tab === 'prestige' ? `
              <div class="item-card" style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                  <div>
                    <strong style="color:#ffd447; font-size:1.05rem;">🌟 Prestígio Nível ${prestige.level} (Multiplicador Permanente ${prestige.bonusMult}x)</strong>
                    <div style="font-size:0.82rem; color:#d8c2a6;">Reinicia níveis dos dinos em troca de +25% permanente em Score & Ovos para sempre.</div>
                  </div>
                  <button class="chunky-btn orange" id="mg-rebirth">♻️ Fazer Prestígio (Rebirth)</button>
                </div>
              </div>
              <div class="cards-grid">
                ${TALENT_DEFS.map((t) => {
                  const lvl = Save.data.talents[t.id] || 0;
                  const cost = Metagame.getTalentCost(t, lvl);
                  return `
                    <div class="item-card">
                      <strong>${t.icon} ${t.name} (${lvl}/${t.maxLevel})</strong>
                      <p style="font-size:0.8rem; color:#d8c2a6;">${t.desc}</p>
                      <button class="chunky-btn secondary" data-talent="${t.id}" ${lvl >= t.maxLevel ? 'disabled' : ''}>
                        ${lvl >= t.maxLevel ? 'MÁXIMO' : `Melhorar (${cost} 🥚)`}
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}

            ${tab === 'campaign' ? `
              <div class="item-card">
                <strong style="color:#58d63a;">🗺️ Mapa-Múndi com Rotas Alternativas</strong>
                <div style="position:relative; height:240px; background:rgba(0,0,0,0.35); border-radius:12px; margin-top:8px; overflow:hidden;">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%;">
                    ${CAMPAIGN_NODES.flatMap((n) => n.next.map((nid) => {
                      const t = CAMPAIGN_NODES.find((x) => x.id === nid);
                      return t ? `<line x1="${n.x}" y1="${n.y}" x2="${t.x}" y2="${t.y}" stroke="#8a562d" stroke-width="1.2" stroke-dasharray="2 1" />` : '';
                    })).join('')}
                  </svg>
                  ${CAMPAIGN_NODES.map((n) => {
                    const done = Save.data.campaign.completedNodes.includes(n.id);
                    return `
                      <button class="chunky-btn ${done ? '' : 'orange'}" data-camp-node="${n.id}"
                        style="position:absolute; left:${n.x}%; top:${n.y}%; transform:translate(-50%,-50%); padding:5px 8px; font-size:0.74rem; white-space:nowrap;">
                        ${done ? '✅ ' : ''}${n.title} (${n.targetScore}pts)
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            ${tab === 'hybrid' ? (() => {
              const habIcon = (d) => {
                const h = getDinoHabitat(d);
                return h === 'aquatic' ? '🌊' : h === 'amphibious' ? '🐊' : h === 'flying' ? '🪽' : '🌿';
              };
              const hybState = Save.data.hybrid || { enabled: false, head: 'trex', body: 'raptor', tail: 'ankylosaurus' };
              const modes = getHybridAvailableModes(hybState, Save.data.equippedMutation);
              const modeBadges = modes.map((m) => (m === 'aquatic' ? '🌊 Água/Submerso' : m === 'flying' ? '🪽 Voo Aéreo' : '🌿 Terra Firme'));
              return `
              <div class="item-card">
                <strong style="color:#c084fc;">🧬 Editor de Dinossauro Híbrido — Transmutação Adaptativa</strong>
                <p style="font-size:0.82rem; color:#d8c2a6;">Misture TODAS as espécies (Terrestres, Aquáticas e Voadoras)! Híbridos com múltiplos habitats ganham <strong>🔄 Transmutação Adaptativa [X]</strong> para alternar entre Terra, Água e Céu durante a corrida.</p>
                <label style="display:flex; gap:8px; align-items:center;">
                  <input type="checkbox" id="hyb-en" ${hybState.enabled ? 'checked' : ''} /> Ativar Híbrido Customizado nas Corridas
                </label>
                <div class="cards-grid" style="grid-template-columns:repeat(auto-fit, minmax(175px, 1fr));">
                  <label>Cabeça:
                    <select class="select-input" id="hyb-head" style="width:100%;">
                      ${DINO_CATALOG.map((d) => `<option value="${d.id}" ${hybState.head === d.id ? 'selected' : ''}>${habIcon(d)} ${d.name}</option>`).join('')}
                    </select>
                  </label>
                  <label>Corpo & Membros:
                    <select class="select-input" id="hyb-body" style="width:100%;">
                      ${DINO_CATALOG.map((d) => `<option value="${d.id}" ${hybState.body === d.id ? 'selected' : ''}>${habIcon(d)} ${d.name}</option>`).join('')}
                    </select>
                  </label>
                  <label>Cauda:
                    <select class="select-input" id="hyb-tail" style="width:100%;">
                      ${DINO_CATALOG.map((d) => `<option value="${d.id}" ${hybState.tail === d.id ? 'selected' : ''}>${habIcon(d)} ${d.name}</option>`).join('')}
                    </select>
                  </label>
                </div>
                <div class="hud-pill" id="hyb-modes-preview" style="margin-top:6px; border-color:#c084fc; color:#f5d0fe;">
                  Habitats herdados: ${modeBadges.join(' • ')} ${modes.length > 1 ? '— 🔄 Transmutação Adaptativa [X] ATIVA!' : '(adicione parte aquática/voadora para alternar [X])'}
                </div>
                <button class="chunky-btn" id="hyb-save">🧬 Aplicar Híbrido no Jogo</button>
              </div>
              `;
            })() : ''}

            ${tab === 'editor' ? `
              <div class="item-card">
                <strong style="color:#ffd447;">🛠️ Editor de Pistas (Exportar/Importar por Seed ou JSON)</strong>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                  <label>Nome: <input class="text-input" id="ed-name" value="Minha Pista Jurássica" style="width:100%;" /></label>
                  <label>Bioma:
                    <select class="select-input" id="ed-biome" style="width:100%;">
                      ${BIOMES.map((b) => `<option value="${b.id}">${b.name}</option>`).join('')}
                    </select>
                  </label>
                  <label>Gravidade (0.5x–1.5x): <input class="text-input" id="ed-grav" type="number" step="0.1" min="0.5" max="1.6" value="1.0" /></label>
                  <label>Densidade de Obstáculos (0.4x–2.0x): <input class="text-input" id="ed-dens" type="number" step="0.1" min="0.4" max="2.0" value="1.0" /></label>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
                  <button class="chunky-btn" id="ed-play">▶ Salvar & Jogar Esta Pista</button>
                  <button class="chunky-btn secondary" id="ed-export">📋 Exportar JSON</button>
                  <button class="chunky-btn secondary" id="ed-import">📥 Importar JSON</button>
                </div>
                <textarea class="text-input" id="ed-json" rows="2" placeholder="Cole aqui JSON de uma pista ou ghost compartilhado..."></textarea>
              </div>
            ` : ''}

            ${tab === 'stats' ? `
              <div class="cards-grid" style="grid-template-columns:1fr 1fr;">
                <div class="item-card">
                  <strong>📊 Gráficos & Desafio Semanal</strong>
                  <div style="font-size:0.82rem;">Corridas: ${st.runs} • Distância Total: ${st.totalDist}m • Ovos Coletados: ${st.totalEggs}</div>
                  <div style="font-size:0.82rem; color:#ffd447;">🏆 ${wkDef.title}: ${wkState.progress}/${wkDef.goal} (${wkState.claimed ? 'Concluído!' : `+${wkDef.reward} 🥚`})</div>
                  <svg viewBox="0 0 260 75" style="width:100%; height:75px; background:rgba(0,0,0,0.3); border-radius:8px; margin-top:4px;">
                    ${Object.entries(st.skillsUsed || { roar: 1 }).slice(0, 5).map(([k, v], i) => {
                      const h = Math.min(52, 8 + v * 6);
                      return `<rect x="${12 + i * 48}" y="${60 - h}" width="30" height="${h}" fill="#58d63a" rx="4" />
                              <text x="${27 + i * 48}" y="71" fill="#fff" font-size="8" text-anchor="middle">${k.slice(0, 6)}</text>`;
                    }).join('')}
                  </svg>
                  <button class="chunky-btn secondary" id="st-ghost-exp" style="font-size:0.78rem;">👻 Exportar Código Ghost / Recorde</button>
                </div>
                <div class="item-card">
                  <strong>🚩 Time Local, Evento Sazonal & Desafios</strong>
                  <label style="font-size:0.82rem;">Nome do Time: <input class="text-input" id="tm-name" value="${Save.data.team?.name || 'Dino Squad'}" style="width:100%;" /></label>
                  <div style="display:flex; gap:8px;">
                    <label>Cor: <input type="color" id="tm-color" value="${Save.data.team?.color || '#58d63a'}" /></label>
                    <label style="flex:1;">Evento Sazonal:
                      <select class="select-input" id="tm-season" style="width:100%;">
                        <option value="auto" ${Save.data.season === 'auto' ? 'selected' : ''}>Automático</option>
                        <option value="none" ${Save.data.season === 'none' ? 'selected' : ''}>Desligado</option>
                        <option value="halloween" ${Save.data.season === 'halloween' ? 'selected' : ''}>🎃 Halloween</option>
                        <option value="xmas" ${Save.data.season === 'xmas' ? 'selected' : ''}>🎅 Natal</option>
                        <option value="birthday" ${Save.data.season === 'birthday' ? 'selected' : ''}>🎉 Aniversário</option>
                      </select>
                    </label>
                  </div>
                  <button class="chunky-btn" id="tm-save">Salvar Time & Sazonal</button>
                </div>
              </div>
            ` : ''}

            ${tab === 'global' ? `
              <div class="item-card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                  <strong>${globalInfo || '🌐 Placar Global Online (Supabase Database)'}</strong>
                  <div style="display:flex; gap:6px;">
                    <input class="text-input" id="gl-email" placeholder="E-mail p/ login opcional..." />
                    <button class="chunky-btn secondary" id="gl-login">Entrar OTP</button>
                    <button class="chunky-btn secondary" id="gl-refresh">Atualizar</button>
                  </div>
                </div>
                <div style="margin-top:8px; max-height:210px; overflow-y:auto;">
                  ${!globalRows || globalRows.length === 0 ? `<div style="font-size:0.84rem; color:#d8c2a6;">Nenhum placar carregado ainda ou Supabase offline.</div>` :
                    globalRows.map((r, i) => `
                      <div style="display:flex; justify-content:space-between; padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.08);">
                        <span>#${i + 1} <strong>${r.player_name}</strong> (${r.dino_id})</span>
                        <span style="color:#ffd447; font-weight:800;">${r.score} pts</span>
                      </div>
                    `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      container.querySelector('#mg-close').onclick = onClose;
      container.querySelectorAll('[data-mt]').forEach((b) => {
        b.onclick = () => {
          tab = b.getAttribute('data-mt');
          feedback = '';
          if (tab === 'global' && globalRows === null) loadGlobal();
          else render();
        };
      });

      if (tab === 'prestige') {
        container.querySelector('#mg-rebirth').onclick = () => {
          const res = Metagame.doRebirth();
          feedback = res.ok ? `🌟 Prestígio ${res.level} ativado (${res.bonusMult}x permanente)!` : `⚠️ ${res.reason}`;
          render();
        };
        container.querySelectorAll('[data-talent]').forEach((b) => {
          b.onclick = () => {
            const res = Metagame.upgradeTalent(b.getAttribute('data-talent'));
            feedback = res.ok ? `✅ Talento elevado para nível ${res.level}!` : `⚠️ ${res.reason}`;
            render();
          };
        });
      }

      if (tab === 'campaign') {
        container.querySelectorAll('[data-camp-node]').forEach((b) => {
          b.onclick = () => {
            const nid = b.getAttribute('data-camp-node');
            const node = CAMPAIGN_NODES.find((x) => x.id === nid);
            if (node) {
              Save.data.campaign.currentNode = nid;
              Save.save();
              onClose();
              game.startCampaignNode(node);
            }
          };
        });
      }

      if (tab === 'hybrid') {
        const refreshModesPreview = () => {
          const previewCfg = {
            enabled: true,
            head: container.querySelector('#hyb-head').value,
            body: container.querySelector('#hyb-body').value,
            tail: container.querySelector('#hyb-tail').value
          };
          const modes = getHybridAvailableModes(previewCfg, Save.data.equippedMutation);
          const badges = modes.map((m) => (m === 'aquatic' ? '🌊 Água/Submerso' : m === 'flying' ? '🪽 Voo Aéreo' : '🌿 Terra Firme'));
          const prevEl = container.querySelector('#hyb-modes-preview');
          if (prevEl) {
            prevEl.textContent = `Habitats herdados: ${badges.join(' • ')} ${modes.length > 1 ? '— 🔄 Transmutação Adaptativa [X] ATIVA!' : '(adicione parte aquática/voadora para alternar [X])'}`;
          }
        };
        ['#hyb-head', '#hyb-body', '#hyb-tail'].forEach((sel) => {
          container.querySelector(sel)?.addEventListener('change', refreshModesPreview);
        });
        container.querySelector('#hyb-save').onclick = () => {
          Save.data.hybrid = {
            enabled: container.querySelector('#hyb-en').checked,
            head: container.querySelector('#hyb-head').value,
            body: container.querySelector('#hyb-body').value,
            tail: container.querySelector('#hyb-tail').value
          };
          Save.save();
          game.rebuildPlayers();
          const modes = getHybridAvailableModes(Save.data.hybrid, Save.data.equippedMutation);
          feedback = Save.data.hybrid.enabled
            ? `🧬 Híbrido ativo (${modes.length > 1 ? '🔄 Transmutação [X] liberada!' : modes[0]}): ${Save.data.hybrid.head} + ${Save.data.hybrid.body} + ${Save.data.hybrid.tail}!`
            : '🧬 Híbrido salvo (desativado no momento).';
          render();
        };
      }

      if (tab === 'editor') {
        container.querySelector('#ed-play').onclick = () => {
          const track = Metagame.saveCustomTrack({
            name: container.querySelector('#ed-name').value,
            biome: container.querySelector('#ed-biome').value,
            gravityScale: Number(container.querySelector('#ed-grav').value),
            obstacleRate: Number(container.querySelector('#ed-dens').value)
          });
          onClose();
          game.startCustomTrack(track);
        };
        container.querySelector('#ed-export').onclick = () => {
          const obj = {
            name: container.querySelector('#ed-name').value,
            biome: container.querySelector('#ed-biome').value,
            gravityScale: Number(container.querySelector('#ed-grav').value),
            obstacleRate: Number(container.querySelector('#ed-dens').value)
          };
          container.querySelector('#ed-json').value = JSON.stringify(obj);
          navigator.clipboard?.writeText(container.querySelector('#ed-json').value).catch(() => {});
          feedback = '✅ JSON da pista exportado abaixo!';
          render();
        };
        container.querySelector('#ed-import').onclick = () => {
          const raw = container.querySelector('#ed-json').value.trim();
          const res = Metagame.importTrackJson(raw);
          feedback = res.ok ? `✅ Pista "${res.track.name}" importada!` : `⚠️ ${res.reason}`;
          render();
        };
      }

      if (tab === 'stats') {
        container.querySelector('#st-ghost-exp')?.addEventListener('click', () => {
          const code = btoa(JSON.stringify({ seed: game.customSeed || 'DEFAULT', hi: Save.getHighScore(), dino: Save.data.selectedDino }));
          navigator.clipboard?.writeText(code).catch(() => {});
          feedback = `👻 Código Ghost copiado: ${code.slice(0, 28)}...`;
          render();
        });
        container.querySelector('#tm-save').onclick = () => {
          Save.data.team.name = container.querySelector('#tm-name').value.trim() || 'Dino Squad';
          Save.data.team.color = container.querySelector('#tm-color').value;
          Save.data.season = container.querySelector('#tm-season').value;
          Save.save();
          game.rebuildPlayers();
          feedback = '✅ Time e tema sazonal aplicados!';
          render();
        };
      }

      if (tab === 'global') {
        container.querySelector('#gl-refresh').onclick = loadGlobal;
        container.querySelector('#gl-login').onclick = async () => {
          const email = container.querySelector('#gl-email').value.trim();
          const res = await game.net.supabase.signInWithEmailOtp(email);
          feedback = res.message;
          render();
        };
      }
      attachModalHelp(container, 'Evolua talentos permanentes, avance na campanha jurássica, crie dinos híbridos, pistas por seed e veja o Ranking Global.');
      const curModalCard = container.querySelector('.modal-card');
      if (curModalCard) curModalCard.scrollTop = savedModalScroll;
    };

    render();
  }
}
