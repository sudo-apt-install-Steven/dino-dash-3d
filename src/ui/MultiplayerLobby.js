// Lobby Multiplayer (LAN Local WebSocket + Supabase Online):
// Código 4 letras, QR Code ("Escaneie para jogar"), Lista de Salas Públicas,
// Teste de Conexão, 2–8 jogadores, Chat/Emotes, Pronto, Eliminação 30s e Preview do Controle.
import { renderQrToCanvas } from '../net/QrGenerator.js';
import { getDinoSpec } from '../dinos/DinoCatalog.js';
import { Save } from '../systems/Save.js';

export class MultiplayerLobby {
  static renderInto(container, net, callbacks = {}) {
    let transport = net.supabase.isConfigured() && !net.lan.connected ? 'supabase' : (net.transportType || 'lan');
    let nickname = Save.data.network?.nickname || `Host_${Math.floor(10 + Math.random() * 89)}`;
    let joinCode = '';
    let isPublic = true;
    let elimination = false;
    let partyMode = true;
    let tvScale = !!Save.data.network?.tvScale;
    let teacherMode = !!Save.data.teacherMode;
    let botCount = 0;
    let publicRooms = [];
    let connTest = null;
    let statusMsg = '';

    const onRoom = () => render();
    const onChat = () => render();
    const onErr = (msg) => { statusMsg = `⚠️ ${msg.message || 'Erro'}`; render(); };
    net.on('room_state', onRoom);
    net.on('chat', onChat);
    net.on('error', onErr);

    const refreshRooms = async () => {
      publicRooms = await net.listRooms(transport);
      render();
    };

    const render = () => {
      const connected = net.isConnected;
      const room = net.room;
      const shareUrl = connected ? net.getShareUrl(room.code) : '';

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width:960px;">
            <div class="modal-header">
              <div>
                <h2>🌐 Sala Multiplayer LAN / Online (2–8 Jogadores)</h2>
                <div style="font-size:0.82rem; color:#ffd447;">PC/TV como Telão Principal • Celulares via QR Code como Controles Jurássicos</div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="chunky-btn secondary" id="mp-open-ctrl">📱 Abrir Controle Celular</button>
                <button class="chunky-btn secondary" id="mp-close">Voltar</button>
              </div>
            </div>

            ${statusMsg ? `<div class="item-card" style="border-color:#ff9a24; color:#ffd447; font-weight:700;">${statusMsg}</div>` : ''}

            ${!connected ? `
              <div class="tabs-row">
                <button class="tab-btn ${transport === 'lan' ? 'active' : ''}" data-tr="lan">📡 LAN Wi-Fi Local (npm run host)</button>
                <button class="tab-btn ${transport === 'supabase' ? 'active' : ''}" data-tr="supabase">☁️ Online Global (Supabase Realtime)</button>
                <button class="chunky-btn secondary" id="mp-test-conn" style="padding:6px 12px; font-size:0.82rem;">🔌 Testar Conexão</button>
              </div>

              ${connTest ? `
                <div class="item-card" style="border-color:${connTest.ok ? '#58d63a' : '#ff4757'}; font-size:0.86rem;">
                  <strong>Diagnóstico:</strong> ${connTest.qualityLabel} • Ping: <strong>${connTest.avgPingMs} ms</strong> • Jitter: ${connTest.jitterMs} ms • Perda: ${connTest.packetLoss}%
                </div>
              ` : ''}

              <div class="cards-grid" style="grid-template-columns:1.1fr 1fr;">
                <div class="item-card">
                  <strong style="color:#58d63a;">📺 Criar Sala (Telão PC/TV)</strong>
                  <label style="font-size:0.84rem;">Apelido do Host:
                    <input class="text-input" id="mp-nick" value="${nickname}" maxlength="18" style="width:100%;" />
                  </label>
                  <label style="display:flex; gap:8px; align-items:center; font-size:0.84rem;">
                    <input type="checkbox" id="mp-pub" ${isPublic ? 'checked' : ''} /> Sala Pública (visível na lista)
                  </label>
                  <label style="display:flex; gap:8px; align-items:center; font-size:0.84rem;">
                    <input type="checkbox" id="mp-elim" ${elimination ? 'checked' : ''} /> Modo Eliminação 30s (último sai!)
                  </label>
                  <label style="display:flex; gap:8px; align-items:center; font-size:0.84rem;">
                    <input type="checkbox" id="mp-tv" ${tvScale ? 'checked' : ''} /> Modo "TV de Sala" (texto grande)
                  </label>
                  <label style="display:flex; gap:8px; align-items:center; font-size:0.84rem;">
                    <input type="checkbox" id="mp-teacher" ${teacherMode ? 'checked' : ''} /> 🎓 Modo Professor/Aula (leve e educativo)
                  </label>
                  <button class="chunky-btn" id="mp-create" style="margin-top:6px;">✨ CRIAR SALA E GERAR QR CODE</button>
                </div>

                <div class="item-card">
                  <strong style="color:#ffd447;">🔑 Entrar em Sala por Código</strong>
                  <div style="display:flex; gap:8px;">
                    <input class="text-input" id="mp-code" value="${joinCode}" maxlength="4" placeholder="ABCD" style="flex:1; text-transform:uppercase; font-size:1.1rem; letter-spacing:3px; text-align:center;" />
                    <button class="chunky-btn orange" id="mp-join">Entrar</button>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                    <strong style="font-size:0.85rem;">Salas Públicas Abertas:</strong>
                    <button class="chunky-btn secondary" id="mp-refresh" style="padding:4px 10px; font-size:0.75rem;">🔄 Atualizar</button>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:6px; max-height:150px; overflow-y:auto;">
                    ${publicRooms.length === 0 ? `<span style="font-size:0.8rem; color:#d8c2a6;">Nenhuma sala pública listada ainda.</span>` :
                      publicRooms.map((r) => `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:6px 8px; border-radius:8px;">
                          <span><strong>${r.code}</strong> • ${r.hostName} (${r.playerCount}/8)</span>
                          <button class="chunky-btn secondary" data-join-code="${r.code}" style="padding:4px 10px; font-size:0.78rem;">Conectar</button>
                        </div>
                      `).join('')}
                  </div>
                </div>
              </div>
            ` : `
              <div class="cards-grid" style="grid-template-columns:220px 1fr;">
                <div class="item-card" style="align-items:center; text-align:center;">
                  <div style="font-size:0.78rem; font-weight:800; color:#58d63a;">📲 ESCANEIE PARA JOGAR</div>
                  <div style="font-size:1.9rem; font-weight:900; letter-spacing:5px; color:#ffd447;">${room.code}</div>
                  <canvas id="mp-qr-canvas" width="168" height="168" style="border-radius:10px; background:#fff6e5;"></canvas>
                  <button class="chunky-btn secondary" id="mp-copy-url" style="font-size:0.75rem; padding:6px 10px; width:100%;">🔗 Copiar Link do Celular</button>
                  <div style="font-size:0.72rem; color:#d8c2a6; word-break:break-all;">${shareUrl}</div>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px;">
                  <div class="item-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                      <strong>🦖 Jogadores na Sala (${room.peers.length}/8) • Ping: ${net.pingMs || 2}ms</strong>
                      ${net.isHost ? `
                        <div style="display:flex; gap:6px; align-items:center;">
                          <span style="font-size:0.78rem;">Bots p/ testar: ${botCount}</span>
                          <button class="chunky-btn secondary" id="mp-add-bot" style="padding:4px 8px; font-size:0.76rem;">+ Bot IA</button>
                        </div>
                      ` : ''}
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(175px, 1fr)); gap:6px; margin-top:6px;">
                      ${room.peers.map((p) => `
                        <div style="padding:6px 8px; border-radius:10px; background:rgba(0,0,0,0.35); border:1px solid ${p.color || '#ffd447'}; font-size:0.82rem;">
                          <div style="font-weight:800;">${p.peerId === room.hostPeerId ? '👑 ' : ''}${p.name}</div>
                          <div style="font-size:0.74rem; color:#d8c2a6;">${getDinoSpec(p.dinoId).name} • ${p.ready ? '✅ Pronto' : '⏳ Aguardando'}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <div class="item-card" style="gap:6px;">
                    <strong>💬 Chat Rápido & Emotes</strong>
                    <div style="max-height:85px; overflow-y:auto; font-size:0.8rem; background:rgba(0,0,0,0.25); padding:6px; border-radius:8px;">
                      ${net.chatLog.length === 0 ? `<span style="color:#a89078;">Envie um olá ou emoji para a galera!</span>` :
                        net.chatLog.map((c) => `<div><strong style="color:#ffd447;">${c.name}:</strong> ${c.text}</div>`).join('')}
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                      <input class="text-input" id="mp-chat-in" placeholder="Mensagem rápida..." style="flex:1;" />
                      <button class="chunky-btn secondary" id="mp-chat-send" style="padding:6px 12px;">Enviar</button>
                      ${['🦖', '🔥', '👑', '🥚'].map((em) => `<button class="chunky-btn secondary" data-mp-em="${em}" style="padding:6px 9px;">${em}</button>`).join('')}
                    </div>
                  </div>

                  <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    ${net.isHost
                      ? `<button class="chunky-btn" id="mp-start" style="flex:1; font-size:1.1rem;">🚀 INICIAR CORRIDA MULTIPLAYER (${room.peers.length + botCount} DINOS)</button>`
                      : `<button class="chunky-btn" id="mp-ready-self" style="flex:1;">✅ ALTERNAR PRONTO</button>`}
                    <button class="chunky-btn secondary" id="mp-leave">Sair da Sala</button>
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>
      `;

      container.querySelector('#mp-close').onclick = () => {
        cleanupListeners();
        callbacks.onClose?.();
      };
      container.querySelector('#mp-open-ctrl').onclick = () => {
        cleanupListeners();
        callbacks.onOpenController?.(room?.code || '', transport);
      };

      if (!connected) {
        container.querySelectorAll('[data-tr]').forEach((b) => {
          b.onclick = () => { transport = b.getAttribute('data-tr'); connTest = null; statusMsg = ''; render(); };
        });
        container.querySelector('#mp-test-conn').onclick = async () => {
          statusMsg = '⏳ Testando conexão...';
          render();
          connTest = await net.runConnectionTest(transport);
          statusMsg = '';
          render();
        };
        container.querySelector('#mp-refresh').onclick = refreshRooms;
        container.querySelector('#mp-create').onclick = async () => {
          nickname = container.querySelector('#mp-nick').value.trim() || 'Host';
          isPublic = container.querySelector('#mp-pub').checked;
          elimination = container.querySelector('#mp-elim').checked;
          tvScale = container.querySelector('#mp-tv').checked;
          teacherMode = container.querySelector('#mp-teacher').checked;
          Save.data.network.nickname = nickname;
          Save.data.network.tvScale = tvScale;
          Save.data.teacherMode = teacherMode;
          Save.save();

          statusMsg = '⏳ Criando sala...';
          render();
          const res = await net.createRoom({
            transport,
            name: nickname,
            dinoId: Save.data.selectedDino || 'trex',
            isPublic,
            elimination,
            partyMode,
            tvScale,
            teacherMode,
            role: 'screen'
          });
          statusMsg = res.ok ? '' : res.message;
          render();
        };
        container.querySelector('#mp-join').onclick = async () => {
          joinCode = container.querySelector('#mp-code').value.toUpperCase().trim();
          nickname = container.querySelector('#mp-nick')?.value?.trim() || nickname;
          const res = await net.joinRoom(joinCode, {
            transport,
            name: nickname,
            dinoId: Save.data.selectedDino || 'trex',
            role: 'screen'
          });
          statusMsg = res.ok ? '' : res.message;
          render();
        };
        container.querySelectorAll('[data-join-code]').forEach((b) => {
          b.onclick = async () => {
            const c = b.getAttribute('data-join-code');
            const res = await net.joinRoom(c, { transport, name: nickname, dinoId: Save.data.selectedDino || 'trex', role: 'screen' });
            statusMsg = res.ok ? '' : res.message;
            render();
          };
        });
      } else {
        const qrCanvas = container.querySelector('#mp-qr-canvas');
        if (qrCanvas) renderQrToCanvas(qrCanvas, shareUrl, 168);

        container.querySelector('#mp-copy-url').onclick = () => {
          navigator.clipboard?.writeText(shareUrl).catch(() => {});
          statusMsg = '✅ Link copiado para enviar ao celular!';
          render();
        };
        container.querySelector('#mp-add-bot')?.addEventListener('click', () => {
          botCount = Math.min(7, botCount + 1);
          render();
        });
        container.querySelector('#mp-chat-send').onclick = () => {
          const v = container.querySelector('#mp-chat-in').value.trim();
          if (v) net.sendChat(v);
        };
        container.querySelectorAll('[data-mp-em]').forEach((b) => {
          b.onclick = () => net.sendEmote(b.getAttribute('data-mp-em'));
        });
        container.querySelector('#mp-ready-self')?.addEventListener('click', () => {
          const self = room.peers.find((p) => p.peerId === net.peerId);
          net.sendPlayerMeta({ ready: !(self?.ready) });
        });
        container.querySelector('#mp-leave').onclick = () => {
          net.leaveRoom();
          render();
        };
        container.querySelector('#mp-start')?.addEventListener('click', () => {
          cleanupListeners();
          callbacks.onStartMatch?.({ room, botCount });
        });
      }
    };

    const cleanupListeners = () => {
      net.off('room_state', onRoom);
      net.off('chat', onChat);
      net.off('error', onErr);
    };

    render();
    return cleanupListeners;
  }
}
