// Enciclopédia e Guia Interativo do DINO DASH 3D: controles, obstáculos, alquimia, economia e multiplayer competitivo.

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
              <button class="tab-btn ${tab === 'alchemy' ? 'active' : ''}" data-gtab="alchemy">⚗️ Alquimia & Economia</button>
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
                    <strong>⚡ Espaço — Habilidade Única</strong>
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
                    <strong>🥚 Economia Balanceada (Sem Farm Infinito)</strong>
                    <ul style="font-size:0.84rem; color:#e5d3bc; padding-left:18px; display:flex; flex-direction:column; gap:4px;">
                      <li><strong>Energia removida:</strong> Agora existem apenas Vida, Escudo, Fúria, Bullet-Time e recarga do Ataque [Q]. Frutas carregam +18% de Fúria e têm chance de curar +1 Vida.</li>
                      <li><strong>20 Dinossauros:</strong> 8 iniciais gratuitos, 11 desbloqueáveis por ovos (60–260 🥚) e 1 secreto lendário. Você pode <em>Testar</em> qualquer espécie antes de comprar!</li>
                      <li><strong>Ovo Misterioso (80 🥚):</strong> Sorteia um acessório ou rastro faltante da coleção. Com a coleção 100% completa, devolve <strong>35 🥚 + 80 XP</strong> (nunca gera lucro infinito).</li>
                      <li><strong>Minigames (Limite 25 🥚/dia):</strong> Pesca e Ritmo exigem <strong>clicar exatamente no instante verde</strong> (pressionar fora e soltar dentro não conta!).</li>
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
    };

    render();
  }
}
