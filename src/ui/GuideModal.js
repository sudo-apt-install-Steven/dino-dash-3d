// Enciclopédia e Guia Interativo do DINO DASH 3D: controles, obstáculos, alquimia, economia e multiplayer competitivo.
import { attachModalHelp } from './Menus.js';
import { PREDATOR_CATALOG } from '../events/PredatorModels.js';
import { Save } from '../systems/Save.js';
import { renderEggSvg, renderBuffSvg, renderBossObsSvg, renderSkillSvg } from './SvgIcons.js';

const OBSTACLE_ENTRIES = [
  { icon: '🌵', name: 'Cacto Pequeno', badge: '⬆ Pular ou [Q] 💥', color: '#4ade80', desc: 'Pule por cima (W / ↑) ou estilhace com o Ataque [Q] para ganhar pontos extras.' },
  { icon: '🌲', name: 'Cacto Alto & Conjunto', badge: '⬅➡ Desvie ou Pulo Alto', color: '#ef4444', desc: 'Mais alto que o normal: segure [W/↑] para pulo alto ou troque de faixa com [A]/[D].' },
  { icon: '🦅', name: 'Ave / Pterodáctilo', badge: '⬇ Abaixar (S) ou ⬆ Pisar', color: '#38bdf8', desc: 'Se voar alto, segure [S/↓] para abaixar. Se voar baixo, pule em cima para pisar!' },
  { icon: '🦂', name: 'Escorpião & Tronco Rolante', badge: '⬆ Pisar / [Q] 💥', color: '#f43f5e', desc: 'Aproximam-se mais rápido! Pule em cima para esmagar ou ataque com [Q].' },
  { icon: '🪨', name: 'Pedra Alta (Wall Jump)', badge: '⬆⬆ Pulo Duplo', color: '#cbd5e1', desc: 'Alta demais para um único pulo: aperte [W/↑] perto dela e aperte de novo no ar para escalar (Wall Jump)!' },
  { icon: '🎯', name: 'Cacto Atirador & Espinho', badge: '⬅➡ Desvie ou Corte [Q]', color: '#ec4899', desc: 'Dispara um espinho veloz pela faixa. Troque de faixa ou corte o espinho no ar com [Q]!' },
  { icon: '🚀', name: 'Rampa Dourada', badge: 'Subir nela = Impulso Aéreo', color: '#fbbf24', desc: 'Passe por cima da rampa para decolar longe sobre perigos e alcançar ovos altos.' },
  { icon: '🪢', name: 'Cipó (Grapple)', badge: 'Alcançar em salto/faixa', color: '#84cc16', desc: 'Balance automaticamente pelo ar por alguns segundos ganhando velocidade e segurança.' },
  { icon: '🪐', name: 'Portal de Gravidade & Atalho', badge: 'Passe por dentro', color: '#818cf8', desc: 'Altera temporariamente a gravidade (baixa ou pesada) ou teletransporta em atalhos de ovos!' },
  { icon: '🛒', name: 'Trilho de Mina & Tronco no Rio', badge: 'Surf & Bônus', color: '#f59e0b', desc: 'Suba no trilho ou tronco para ganhar pontos contínuos e estabilidade em terrenos difíceis.' },
  { icon: '🔀', name: 'Bifurcação de Rota', badge: '⬅️ Seguro | Direita +Pts ➡️', color: '#ffd447', desc: 'Esquerda garante rota segura; direita entrega bônus de pontuação em troca de mais risco!' },
  { icon: '🔥', name: 'Lava, Gelo Frágil & Armadilha Alien', badge: '⬆ Pular / Escudo', color: '#ff5e00', desc: 'Perigos específicos de biomas: pule por cima da lava, não pise no gelo frágil nem nos lasers alien.' },
  { icon: '💎', name: 'Fogueira, Fruta & Baú', badge: 'Coletáveis', color: '#4ade80', desc: 'Fogueira cura +1 vida e enche Fúria; Fruta carrega Fúria (+chance de cura); Baú dá ovos ao pular em cima!' }
];

const ALCHEMY_REACTIONS = [
  { combo: '🔥 Fogo + ❄️ Gelo', result: '💨 Choque Térmico de Vapor', desc: 'Limpa obstáculos próximos numa explosão de vapor + 200 pts.' },
  { combo: '🔥 Fogo + ☠️ Veneno', result: '💥 Detonação Tóxica', desc: 'Onda explosiva ampla de alto impacto + combo garantido.' },
  { combo: '❄️ Gelo + ⚡ Raio', result: '⚡ Tempestade Supercondutora', desc: 'Imã temporário superpotente + escudo elétrico extra!' }
];

export class GuideModal {
  static renderInto(container, { onClose, onStartTutorial }) {
    let tab = 'controls';

    const render = () => {
      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width: 820px;">
            <div class="modal-header">
              <h2>📖 Guia Completo & Obstáculos</h2>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="chunky-btn" id="guide-tut">🎓 Fazer Tutorial Jogável</button>
                <button class="chunky-btn secondary" id="guide-close">Voltar</button>
              </div>
            </div>

            <div class="tabs-row">
              <button class="tab-btn ${tab === 'controls' ? 'active' : ''}" data-gtab="controls">🎮 Controles & Ataque (Q)</button>
              <button class="tab-btn ${tab === 'obstacles' ? 'active' : ''}" data-gtab="obstacles">🚧 Obstáculos & Zonas</button>
              <button class="tab-btn ${tab === 'alchemy' ? 'active' : ''}" data-gtab="alchemy">⚗️ Status, Alquimia & Economia</button>
              <button class="tab-btn ${tab === 'predators' ? 'active' : ''}" data-gtab="predators">🐾 Predadores (14)</button>
              <button class="tab-btn ${tab === 'multiplayer' ? 'active' : ''}" data-gtab="multiplayer">⚔️ Multiplayer Competitivo</button>
            </div>

            <div style="max-height: 58vh; overflow-y: auto; padding-right: 4px;">
              ${tab === 'controls' ? `
                <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));">
                  <div class="item-card">
                    <strong>⬆️ W / Seta Cima</strong>
                    <p style="font-size:0.84rem; color:#d8c2a6;">Pular obstáculos. Segure para salto mais alto; aperte novamente perto de Pedras Altas para <strong>Wall Jump</strong>!</p>
                  </div>
                  <div class="item-card">
                    <strong>⬇️ S / Seta Baixo</strong>
                    <p style="font-size:0.84rem; color:#d8c2a6;">Abaixar para passar sob aves altas. No ar, acelera a queda (<strong>Slam</strong>) e pisoteia inimigos!</p>
                  </div>
                  <div class="item-card">
                    <strong>⬅️➡️ A / D ou Setas</strong>
                    <p style="font-size:0.84rem; color:#d8c2a6;">Trocar entre as 3 faixas da pista para desviar, buscar ovos ou entrar em portais.</p>
                  </div>
                  <div class="item-card" style="border-color:#f97316;">
                    <strong style="color:#fb923c;">⚔️ Q — Ataque Direto</strong>
                    <p style="font-size:0.84rem; color:#ffe6a7;">Golpe corpo a corpo com recarga própria (1.0s–1.55s, escala com o atributo <strong>Ataque Q</strong>): destrói cactos pequenos, troncos, escorpiões, espinhos voadores, atinge o Orbe de Boss com <strong>2x dano</strong> e empurra rivais no Multiplayer!</p>
                  </div>
                  <div class="item-card">
                    <strong style="display:flex; align-items:center; gap:6px;">${renderSkillSvg('rugido', 22)} Espaço — Habilidade Única</strong>
                    <p style="font-size:0.84rem; color:#d8c2a6;">Ativa o poder exclusivo da espécie escolhida (investida, rugido, mergulho, vento térmico, etc.). Evolua na tela de Dinossauros!</p>
                  </div>
                  <div class="item-card">
                    <strong>🔥 F (Fúria) • ⏱️ Shift (Bullet-Time) • 🎒 E</strong>
                    <p style="font-size:0.84rem; color:#d8c2a6;"><strong>[F]</strong> ativa Fúria quando a barra chega a 100%; <strong>[Shift]</strong> deixa tudo em câmera lenta para precisão extrema; <strong>[E]</strong> usa o item da mochila (Escudo/Turbo/Ímã).</p>
                  </div>
                  <div class="item-card">
                    <strong>📷 C • ⏸️ P • 🔄 R</strong>
                    <p style="font-size:0.84rem; color:#d8c2a6;"><strong>[C]</strong> alterna 5 ângulos de câmera; <strong>[P]</strong> pausa; <strong>[R]</strong> abre janela de confirmação antes de reiniciar.</p>
                  </div>
                </div>
                <div class="item-card" style="margin-top:10px; border-color:#38bdf8;">
                  <strong>🪧 Sobre as Placas Flutuantes nos Obstáculos</strong>
                  <p style="font-size:0.84rem; color:#bae6fd;">Cada obstáculo exibe uma placa rápida indicando a ação certa (Pular, Abaixar, [Q], Wall Jump, Rampa, Portal). Você pode ligar/desligar isso a qualquer momento em <strong>Configurações → Dicas Visuais sobre Obstáculos</strong>.</p>
                </div>
              ` : ''}

              ${tab === 'obstacles' ? `
                <div class="item-card" style="margin-bottom:10px; border-color:#38bdf8;">
                  <strong>⚡ Plataformas de Buff & Ataques de Chefe</strong>
                  <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                    ${[
                      ['turbo', 'Turbo >>>'],
                      ['pulo', 'Trampolim'],
                      ['escudo', 'Escudo'],
                      ['cura', 'Cura'],
                      ['ima', 'Ímã'],
                      ['tempo', 'Relógio']
                    ].map(([k, lbl]) => `
                      <span class="hud-pill" style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem;">
                        ${renderBuffSvg(k, 20)} ${lbl}
                      </span>
                    `).join('')}
                  </div>
                  <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                    ${[
                      ['choque', 'Onda'],
                      ['espinhos', 'Espinhos'],
                      ['raio', 'Raio'],
                      ['feixe', 'Feixe OVNI'],
                      ['poca', 'Poça Tóxica'],
                      ['magma', 'Magma'],
                      ['gelo', 'Gelo'],
                      ['teia', 'Teia']
                    ].map(([k, lbl]) => `
                      <span class="hud-pill" style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; border-color:#f97316;">
                        ${renderBossObsSvg(k, 22)} ${lbl}
                      </span>
                    `).join('')}
                  </div>
                </div>
                <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));">
                  ${OBSTACLE_ENTRIES.map((o) => `
                    <div class="item-card" style="border-left: 4px solid ${o.color};">
                      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                        <strong>${o.icon} ${o.name}</strong>
                      </div>
                      <span class="hud-pill" style="font-size:0.72rem; padding:3px 8px; width:fit-content; color:${o.color};">${o.badge}</span>
                      <p style="font-size:0.82rem; color:#d8c2a6;">${o.desc}</p>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${tab === 'alchemy' ? `
                <div style="display:flex; flex-direction:column; gap:10px;">
                  <div class="item-card">
                    <strong>🥚 Tipos de Ovos na Pista</strong>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                      ${[
                        ['comum', '+1 🥚'],
                        ['dourado', 'Dourado +5'],
                        ['raro', 'Colossal +25'],
                        ['surpresa', 'Surpresa (?)'],
                        ['fogo', 'Fogo 🔥'],
                        ['gelo', 'Gelo ❄️'],
                        ['raio', 'Raio ⚡'],
                        ['veneno', 'Veneno ☠️']
                      ].map(([k, lbl]) => `
                        <span class="hud-pill" style="display:inline-flex; align-items:center; gap:5px; font-size:0.76rem;">
                          ${renderEggSvg(k, 22)} ${lbl}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                  <div class="item-card">
                    <strong>⚗️ Reações Elementais (Ovos Brilhantes)</strong>
                    <p style="font-size:0.84rem; color:#d8c2a6;">Pegue 2 ovos de elementos diferentes em sequência para disparar uma reação na pista:</p>
                    <div class="cards-grid" style="margin-top:8px;">
                      ${ALCHEMY_REACTIONS.map((r) => `
                        <div class="item-card" style="background:rgba(15,23,42,0.55);">
                          <strong>${r.combo}</strong>
                          <div style="color:#ffd447; font-size:0.85rem;">→ ${r.result}</div>
                          <p style="font-size:0.78rem; color:#cbd5e1;">${r.desc}</p>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  <div class="item-card">
                    <strong>🩺 Status & Ícones do HUD</strong>
                    <div class="cards-grid" style="margin-top:8px;">
                      <div class="item-card"><strong>❤️ Vida & 🛡️ Escudo</strong><small style="color:#d8c2a6;">Corações mostram vidas restantes; Escudo azul bloqueia 1 golpe sem perder vida. Passe em cima de <strong>Frutas</strong> ou use <strong>Antídoto [E]</strong> para recuperar.</small></div>
                      <div class="item-card"><strong>🔥 Fogo & 💥 Fúria [F]</strong><small style="color:#d8c2a6;">Esferas de fogo protegem e criam reações explosivas. Barra Fúria em 100% deixa seu dino gigante e invencível!</small></div>
                      <div class="item-card"><strong>☠️ Veneno & 🟤 Lama</strong><small style="color:#d8c2a6;">Veneno causa dano periódico; Lama reduz velocidade. Cure imediatamente com <strong>🧪 Antídoto [E]</strong> ou pegando <strong>🔥 Fogo</strong>!</small></div>
                      <div class="item-card"><strong>❄️ Gelo & ⚡ Raio</strong><small style="color:#d8c2a6;">Gelo reduz ritmo brevemente; Raio dá carga magnética e combina com Gelo para formar <strong>⚡ Tempestade Supercondutora</strong>!</small></div>
                    </div>
                  </div>
                  <div class="item-card">
                    <strong>🥚 Economia Balanceada (Sem Farm Infinito)</strong>
                    <ul style="font-size:0.84rem; color:#e5d3bc; padding-left:18px; display:flex; flex-direction:column; gap:4px;">
                      <li><strong>Estamina Física:</strong> Agora você gerencia Vida, Escudo, Fúria, <strong>Estamina</strong> (Bullet-Time [Shift] e Pulo Duplo aéreo, recarrega no chão/Oásis/itens) e carga combinada da Habilidade [Espaço] (tempo + combos/pisões/Q).</li>
                      <li><strong>Pacotes & Patamares:</strong> Ovos valem 1, 5 (Dourado) ou 25 (Colossal) rendendo ~150–400 🥚 por partida de 3 min. Loja segue patamares claros (150 / 600 / 2.500 / 10.000 🥚), loja rotativa (-20%) e Cristais 💎 raros de chefes/baús.</li>
                      <li><strong>Ovo Misterioso (${600} 🥚):</strong> Sorteia um acessório ou rastro faltante. Com coleção 100% completa, devolve <strong>240 🥚 + 150 XP + 1 💎</strong> (sem farm infinito).</li>
                      <li><strong>Minigames (Limite 90 🥚/dia):</strong> Pesca e Ritmo exigem <strong>clicar exatamente no instante verde</strong> (pressionar fora e soltar dentro não conta!).</li>
                    </ul>
                  </div>
                </div>
              ` : ''}

              ${tab === 'multiplayer' ? `
                <div style="display:flex; flex-direction:column; gap:10px;">
                  <div class="item-card">
                    <strong>🏁 Modos Competitivos Online & LAN</strong>
                    <div class="cards-grid" style="margin-top:8px;">
                      <div class="item-card">
                        <strong>🏁 Corrida Competitiva</strong>
                        <p style="font-size:0.82rem; color:#d8c2a6;">Pontuação em tempo real com pódio ao vivo no HUD! Ultrapassar o líder dá bônus de <strong>+30 pts (Overtake)</strong> e o #1 usa coroa dourada.</p>
                      </div>
                      <div class="item-card" style="border-color:#ef4444;">
                        <strong>⚔️ Duelo PvP (Ataque Q)</strong>
                        <p style="font-size:0.82rem; color:#d8c2a6;">Aperte <strong>[Q]</strong> perto de um rival para empurrá-lo de faixa e roubar +25 pts + combo! Proteção anti-stunlock de 2s após cada golpe.</p>
                      </div>
                      <div class="item-card" style="border-color:#f59e0b;">
                        <strong>⏳ Eliminação 30s</strong>
                        <p style="font-size:0.82rem; color:#d8c2a6;">A cada 30 segundos o último colocado é eliminado até restar apenas 1 sobrevivente!</p>
                      </div>
                    </div>
                  </div>
                  <div class="item-card">
                    <strong>🏆 Recompensas Justas & Morte Súbita</strong>
                    <p style="font-size:0.84rem; color:#d8c2a6;">Após 60s de corrida ativa a <strong>Morte Súbita (+Velocidade)</strong>. Ao final, salas com 2+ jogadores reais e partida real premiam o pódio (<strong>1º +12 🥚 • 2º +6 🥚 • 3º +3 🥚</strong>).</p>
                  </div>
                </div>
              ` : ''}

              ${tab === 'predators' ? `
                <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));">
                  ${PREDATOR_CATALOG.map((p) => {
                    const seen = (Save.data.seenElements || []).includes('pred_intro_' + p.id);
                    return `
                      <div class="item-card" style="border-left: 4px solid ${p.accent};">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                          <strong style="color:${p.accent};">🐾 ${p.name}</strong>
                          <span class="hud-pill" style="font-size:0.68rem; padding:2px 6px;">${seen ? '✅ Avistado' : p.biome}</span>
                        </div>
                        <small style="color:#ffd447; font-weight:700;">${p.title} • ${p.archetype}</small>
                        <p style="font-size:0.81rem; color:#fef3c7; margin:4px 0;">${p.lore}</p>
                        <small style="color:#86efac;">💡 ${p.counterTip}</small>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('[data-gtab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          tab = btn.getAttribute('data-gtab');
          render();
        });
      });

      container.querySelector('#guide-close').addEventListener('click', () => {
        if (onClose) onClose();
      });

      container.querySelector('#guide-tut').addEventListener('click', () => {
        if (onStartTutorial) onStartTutorial();
      });
      attachModalHelp(container, 'Consulte como superar cada obstáculo, combos de alquimia, status elementais e regras do Multiplayer.');
    };

    render();
  }
}
