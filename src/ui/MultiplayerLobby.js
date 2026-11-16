// Lobby Multiplayer Completo (LAN WebSocket + Supabase Realtime):
// - Criar sala com Nome, Pública/Privada + Senha opcional, Máx 2–8, Modo TV, Votação, Dificuldade,
//   Habitat único/múltiplo, Modo de jogo, Híbridos, Dinos únicos, Controles, Espectadores, Eventos/Bosses/Power-ups, Pausa e Handicap
// - Atalho "🤝 Sala de Amigos" (1 toque) + Botão Engrenagem (⚙️ Config da Sala) para o Dono
// - Preview 3D do Dino personalizado de cada jogador + Trocar de Dino + Personalizar + Contagem 3-2-1
// - Moderação (Expulsar, Banir, Passar Dono, Denunciar), Chat Seguro (só Emotes & Frases Prontas), Indicador de Ping & Web Share

import { renderQrToCanvas } from '../net/QrGenerator.js';
import { DINO_CATALOG, getDinoSpec } from '../dinos/DinoCatalog.js';
import { getActivePreset, getEquippedSkinVariant } from '../dinos/DinoCustomization.js';
import { DinoPreview3D } from './SelectionScreen.js';
import { BIOMES, getBiomePreviewMeta } from '../world/Biomes.js';
import { DIFFICULTY_PRESETS } from '../game/Difficulty.js';
import { Save } from '../systems/Save.js';
import { isMobileDevice } from '../systems/DeviceDetector.js';
import { attachModalHelp } from './Menus.js';
import {
  escapeHtml,
  sanitizeNickname,
  sanitizeRoomCode,
  sanitizeRoomPassword,
  sanitizeHexColor
} from '../security/Sanitize.js';

const SAFE_PHRASES = [
  'Boa corrida!',
  'Vamos lá!',
  'Quase!',
  'Parabéns!',
  'Me ajuda!',
  'GG!'
];

const MP_MODES = [
  { id: 'race', label: '🏁 Corrida Competitiva' },
  { id: 'coop', label: '🤝 Cooperativo' },
  { id: 'duel', label: '⚔️ Duelo PvP' },
  { id: 'elimination', label: '⏳ Eliminação 30s' },
  { id: 'shared_controls', label: '👥 Controles Compartilhados' },
  { id: 'relay', label: '🔄 Revezamento' }
];

function pingBadge(ms) {
  const v = Math.max(1, Number(ms || 12));
  if (v < 60) return { color: '#4ade80', icon: '🟢', label: `${v}ms` };
  if (v <= 130) return { color: '#facc15', icon: '🟡', label: `${v}ms` };
  return { color: '#f87171', icon: '🔴', label: `${v}ms (Alto)` };
}

export class MultiplayerLobby {
  static renderInto(container, net, callbacks = {}) {
    const onMobile = isMobileDevice();
    let transport = callbacks.initialTransport || (net.supabase.isConfigured() && !net.lan.connected ? 'supabase' : (net.transportType || 'lan'));
    let nickname = sanitizeNickname(Save.data.network?.nickname || `Dino_${Math.floor(10 + Math.random() * 89)}`, 'Dino', 18);
    let roomName = 'Sala Jurássica';
    let joinCode = sanitizeRoomCode(callbacks.initialRoom || '');
    let joinPassword = '';
    let roomPassword = '';
    let isPublic = true;
    let maxPlayers = 8;
    let mpMode = 'race';
    let hostDifficulty = Save.data.difficulty || 'normal';
    let hostBiomeId = Save.data.startBiomeId || 'random_portal';
    let multiHabitats = true;
    let allowVoting = true;
    let allowRevive = true;
    let allowHybrids = true;
    let uniqueDinos = false;
    let allowControllers = true;
    let allowMultiControllersPerPlayer = false;
    let allowSpectators = true;
    let allowEvents = true;
    let allowBosses = true;
    let allowPowerups = true;
    let allowHandicap = false;
    let pausePolicy = 'host_only';
    let tvScale = !!Save.data.network?.tvScale;
    let teacherMode = !!Save.data.teacherMode;
    let botCount = 0;
    let publicRooms = [];
    let connTest = null;
    let statusMsg = '';
    let initialRefreshed = false;
    let showGearModal = false;
    let showDinoPicker = false;
    let countdownSec = 0;
    let countdownTid = null;
    let preview3d = null;
    let autoRefreshTid = null;

    const getLocalCustomization = () => ({
      ...getActivePreset('p1'),
      skinVariant: getEquippedSkinVariant(Save.data.selectedDino || 'trex'),
      hybrid: Save.data.hybrid
    });

    const destroyPreview = () => {
      try { preview3d?.destroy?.(); } catch {}
      preview3d = null;
    };

    const onRoom = () => {
      if (net.isConnected && statusMsg.startsWith('⏳')) statusMsg = '';
      render();
    };
    const onChat = () => render();
    const onErr = (msg) => { statusMsg = `⚠️ ${msg.message || 'Erro'}`; render(); };
    const onReported = (msg) => {
      statusMsg = `🚨 Denúncia de ${msg.reporterName || 'Jogador'} contra ${msg.targetName || 'Alvo'}: ${msg.reason || ''}`;
      render();
    };
    const onCountdown = (msg) => {
      countdownSec = Number(msg?.seconds || 3);
      render();
    };

    net.on('room_state', onRoom);
    net.on('chat', onChat);
    net.on('error', onErr);
    net.on('player_reported', onReported);
    net.on('start_countdown', onCountdown);

    const refreshRooms = async () => {
      publicRooms = await net.listRooms(transport);
      if (!net.isConnected) render();
    };

    autoRefreshTid = setInterval(() => {
      if (!net.isConnected && document.body.contains(container)) {
        refreshRooms().catch(() => {});
      }
    }, 5000);

    const startWithCountdown = (room) => {
      if (countdownTid) return;
      countdownSec = 3;
      net.broadcastCountdown(3);
      render();
      countdownTid = setInterval(() => {
        countdownSec--;
        if (countdownSec <= 0) {
          clearInterval(countdownTid);
          countdownTid = null;
          cleanupListeners();
          callbacks.onStartMatch?.({ room, botCount });
        } else {
          render();
        }
      }, 1000);
    };

    const doCreateRoom = async ({ friendsQuick = false } = {}) => {
      nickname = sanitizeNickname(container.querySelector('#mp-nick')?.value || nickname, 'Host', 18);
      if (friendsQuick) {
        isPublic = false;
        roomName = `Amigos de ${nickname}`.slice(0, 28);
        roomPassword = '';
      } else {
        roomName = sanitizeNickname(container.querySelector('#mp-room-name')?.value || roomName, 'Sala Jurássica', 28);
        isPublic = container.querySelector('#mp-pub')?.checked ?? true;
        roomPassword = sanitizeRoomPassword(container.querySelector('#mp-room-pass')?.value || '');
        maxPlayers = Math.max(2, Math.min(8, Number(container.querySelector('#mp-max-players')?.value || 8)));
        mpMode = container.querySelector('#mp-mode')?.value || 'race';
        hostDifficulty = container.querySelector('#mp-diff')?.value || hostDifficulty;
        hostBiomeId = container.querySelector('#mp-biome')?.value || hostBiomeId;
        multiHabitats = container.querySelector('#mp-multi-hab')?.checked !== false;
        allowVoting = container.querySelector('#mp-allow-vote')?.checked !== false;
        allowRevive = container.querySelector('#mp-allow-revive')?.checked !== false;
        allowHybrids = container.querySelector('#mp-allow-hybrids')?.checked !== false;
        uniqueDinos = !!container.querySelector('#mp-unique-dinos')?.checked;
        allowControllers = container.querySelector('#mp-allow-ctrl')?.checked !== false;
        allowSpectators = container.querySelector('#mp-allow-spec')?.checked !== false;
        allowEvents = container.querySelector('#mp-allow-events')?.checked !== false;
        allowBosses = container.querySelector('#mp-allow-bosses')?.checked !== false;
        allowPowerups = container.querySelector('#mp-allow-pups')?.checked !== false;
        allowHandicap = !!container.querySelector('#mp-allow-handicap')?.checked;
        pausePolicy = container.querySelector('#mp-pause-policy')?.value || 'host_only';
        tvScale = !!container.querySelector('#mp-tv')?.checked;
        teacherMode = !!container.querySelector('#mp-teacher')?.checked;
      }

      try {
        Save.data.network.nickname = nickname;
        Save.data.network.tvScale = tvScale;
        Save.data.teacherMode = teacherMode;
        Save.save();
      } catch {}

      statusMsg = '⏳ Criando sala...';
      render();
      const res = await net.createRoom({
        transport,
        roomName,
        password: roomPassword,
        maxPlayers,
        name: nickname,
        dinoId: Save.data.selectedDino || 'trex',
        customization: getLocalCustomization(),
        isPublic,
        mpMode,
        elimination: mpMode === 'elimination',
        partyMode: true,
        tvScale,
        teacherMode,
        role: onMobile ? 'mobile_player' : 'screen',
        config: {
          allowVoting,
          difficulty: hostDifficulty,
          biomeId: hostBiomeId,
          multiHabitats,
          allowHybrids,
          uniqueDinos,
          allowControllers,
          allowMultiControllersPerPlayer,
          allowSpectators,
          allowEvents,
          allowBosses,
          allowPowerups,
          allowRevive,
          allowHandicap,
          pausePolicy
        }
      });
      statusMsg = res.ok ? '' : res.message;
      render();
    };

    const render = () => {
      destroyPreview();
      const connected = net.isConnected;
      const room = net.room;
      const shareUrl = connected ? net.getShareUrl(room.code) : '';

      container.innerHTML = `
        <div class="overlay-center">
          <div class="chunky-panel modal-card" style="max-width:1000px;">
            <div class="modal-header">
              <div>
                <h2>🌐 Sala Multiplayer LAN / Online (2–8 Jogadores)</h2>
                <div style="font-size:0.8rem; color:#ffd447;">
                  ${onMobile ? 'Jogue no celular ou conecte à sala do grupo!' : 'PC/TV como Telão Principal • Escaneie o QR Code lateral no celular'}
                </div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${connected && net.isHost ? `<button class="chunky-btn secondary" id="mp-open-gear" title="Configurações da Sala">⚙️ Config</button>` : ''}
                ${onMobile ? `<button class="chunky-btn secondary" id="mp-open-ctrl" style="border-color:#38bdf8; color:#bae6fd;">🎮 Modo Controle</button>` : ''}
                <button class="chunky-btn secondary" id="mp-close">Voltar</button>
              </div>
            </div>

            ${statusMsg ? `<div class="item-card" style="border-color:#ff9a24; color:#ffd447; font-weight:700;">${escapeHtml(statusMsg)}</div>` : ''}

            ${!connected ? `
              <div class="tabs-row" style="align-items:center;">
                <button class="tab-btn ${transport === 'lan' ? 'active' : ''}" data-tr="lan">📡 LAN Wi-Fi Local</button>
                <button class="tab-btn ${transport === 'supabase' ? 'active' : ''}" data-tr="supabase">☁️ Online Global</button>
                <button class="chunky-btn secondary" id="mp-test-conn" style="padding:6px 12px; font-size:0.8rem;">🔌 Testar Conexão</button>
                <button class="chunky-btn orange" id="mp-friends-quick" style="padding:6px 12px; font-size:0.8rem; margin-left:auto;">🤝 Sala de Amigos (1 Toque)</button>
              </div>

              ${connTest ? `
                <div class="item-card" style="border-color:${connTest.ok ? '#58d63a' : '#ff4757'}; font-size:0.84rem;">
                  <strong>Diagnóstico:</strong> ${connTest.qualityLabel} • Ping: <strong>${connTest.avgPingMs} ms</strong> • Jitter: ${connTest.jitterMs} ms • Perda: ${connTest.packetLoss}%
                </div>
              ` : ''}

              <div class="cards-grid mp-create-grid">
                <div class="item-card">
                  <strong style="color:#58d63a;">📺 Criar Sala</strong>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <label style="font-size:0.8rem;">Seu Apelido:
                      <input class="text-input" id="mp-nick" value="${escapeHtml(nickname)}" maxlength="18" style="width:100%;" />
                    </label>
                    <label style="font-size:0.8rem;">Nome da Sala:
                      <input class="text-input" id="mp-room-name" value="${escapeHtml(roomName)}" maxlength="28" style="width:100%;" />
                    </label>
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr 80px; gap:6px;">
                    <label style="font-size:0.78rem;">Visibilidade:
                      <select class="select-input" id="mp-pub-sel" style="width:100%;">
                        <option value="public" ${isPublic ? 'selected' : ''}>🌍 Pública</option>
                        <option value="private" ${!isPublic ? 'selected' : ''}>🔒 Privada</option>
                      </select>
                      <input type="checkbox" id="mp-pub" class="hidden" ${isPublic ? 'checked' : ''} />
                    </label>
                    <label style="font-size:0.78rem;">Senha (opcional):
                      <input class="text-input" id="mp-room-pass" value="${escapeHtml(roomPassword)}" maxlength="12" placeholder="Sem senha" style="width:100%;" />
                    </label>
                    <label style="font-size:0.78rem;">Máx.:
                      <select class="select-input" id="mp-max-players" style="width:100%;">
                        ${[2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}" ${maxPlayers === n ? 'selected' : ''}>${n}</option>`).join('')}
                      </select>
                    </label>
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <label style="font-size:0.78rem;">Modo de Jogo:
                      <select class="select-input" id="mp-mode" style="width:100%;">
                        ${MP_MODES.map((m) => `<option value="${m.id}" ${mpMode === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}
                      </select>
                    </label>
                    <label style="font-size:0.78rem;">Dificuldade:
                      <select class="select-input" id="mp-diff" style="width:100%;">
                        ${Object.values(DIFFICULTY_PRESETS).map((d) => `<option value="${d.id}" ${hostDifficulty === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
                      </select>
                    </label>
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <label style="font-size:0.78rem;">Habitat (Mapa):
                      <select class="select-input" id="mp-biome" style="width:100%;">
                        <option value="random_portal" ${hostBiomeId === 'random_portal' ? 'selected' : ''}>🌀 Sorteio / Portais</option>
                        ${BIOMES.map((b) => `<option value="${b.id}" ${hostBiomeId === b.id ? 'selected' : ''}>${getBiomePreviewMeta(b).icon} ${b.name}</option>`).join('')}
                      </select>
                    </label>
                    <label style="font-size:0.78rem;">Regra de Pausa:
                      <select class="select-input" id="mp-pause-policy" style="width:100%;">
                        <option value="host_only" ${pausePolicy === 'host_only' ? 'selected' : ''}>👑 Só o Dono</option>
                        <option value="all_limited" ${pausePolicy === 'all_limited' ? 'selected' : ''}>👥 Todos (c/ limite)</option>
                      </select>
                    </label>
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:0.76rem; margin-top:2px;">
                    <label><input type="checkbox" id="mp-multi-hab" ${multiHabitats ? 'checked' : ''} /> 🌍 Vários habitats</label>
                    <label><input type="checkbox" id="mp-allow-vote" ${allowVoting ? 'checked' : ''} /> 🗳️ Votação ativa</label>
                    <label><input type="checkbox" id="mp-allow-hybrids" ${allowHybrids ? 'checked' : ''} /> 🧬 Permitir híbridos</label>
                    <label><input type="checkbox" id="mp-unique-dinos" ${uniqueDinos ? 'checked' : ''} /> 🦖 Dinos únicos</label>
                    <label><input type="checkbox" id="mp-allow-ctrl" ${allowControllers ? 'checked' : ''} /> 📱 Controles celular</label>
                    <label><input type="checkbox" id="mp-allow-spec" ${allowSpectators ? 'checked' : ''} /> 👁️ Espectadores</label>
                    <label><input type="checkbox" id="mp-allow-events" ${allowEvents ? 'checked' : ''} /> ☄️ Eventos</label>
                    <label><input type="checkbox" id="mp-allow-bosses" ${allowBosses ? 'checked' : ''} /> 👑 Bosses</label>
                    <label><input type="checkbox" id="mp-allow-pups" ${allowPowerups ? 'checked' : ''} /> ⚡ Power-ups</label>
                    <label><input type="checkbox" id="mp-allow-revive" ${allowRevive ? 'checked' : ''} /> 💖 Reviver aliado</label>
                    <label><input type="checkbox" id="mp-allow-handicap" ${allowHandicap ? 'checked' : ''} /> ⚖️ Handicap</label>
                    <label><input type="checkbox" id="mp-tv" ${tvScale ? 'checked' : ''} /> 📺 Modo TV</label>
                    <label><input type="checkbox" id="mp-teacher" ${teacherMode ? 'checked' : ''} /> 🎓 Modo Aula</label>
                  </div>
                  <button class="chunky-btn" id="mp-create" style="margin-top:6px;">✨ CRIAR SALA E GERAR QR CODE</button>
                </div>

                <div class="item-card">
                  <strong style="color:#ffd447;">🔑 Entrar em Sala por Código</strong>
                  <label style="font-size:0.82rem;">Seu Apelido:
                    <input class="text-input" id="mp-join-nick" value="${escapeHtml(nickname)}" maxlength="18" style="width:100%;" />
                  </label>
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <input class="text-input" id="mp-code" value="${escapeHtml(joinCode)}" maxlength="4" placeholder="ABCD" style="flex:1; min-width:95px; text-transform:uppercase; font-size:1.1rem; letter-spacing:3px; text-align:center;" />
                    <input class="text-input" id="mp-join-pass" value="${escapeHtml(joinPassword)}" maxlength="12" placeholder="Senha (se tiver)" style="width:120px; font-size:0.82rem;" />
                    <button class="chunky-btn orange" id="mp-join">Entrar</button>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                    <strong style="font-size:0.84rem;">🌍 Salas Públicas Abertas (auto-atualiza):</strong>
                    <button class="chunky-btn secondary" id="mp-refresh" style="padding:4px 10px; font-size:0.74rem;">🔄 Atualizar</button>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">
                    ${publicRooms.length === 0 ? `<span style="font-size:0.8rem; color:#d8c2a6;">Nenhuma sala pública listada ainda.</span>` :
                      publicRooms.map((r) => {
                        const codeSafe = escapeHtml(sanitizeRoomCode(r.code));
                        return `
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; background:rgba(0,0,0,0.34); padding:7px 9px; border-radius:10px; border:1px solid rgba(255,212,71,0.2);">
                          <div style="font-size:0.78rem;">
                            <div><strong>${r.hasPassword ? '🔒 ' : ''}${escapeHtml(r.roomName || codeSafe)}</strong> <span style="color:#ffd447;">[${codeSafe}]</span></div>
                            <div style="font-size:0.7rem; color:#d8c2a6;">${escapeHtml(r.hostName)} • ${escapeHtml(r.mode || 'race')} • ${Number(r.playerCount) || 1}/${Number(r.maxPlayers) || 8} • ${r.status === 'playing' ? '🔥 Em jogo' : '🟢 Aberta'}</div>
                          </div>
                          <button class="chunky-btn secondary" data-join-code="${codeSafe}" style="padding:5px 10px; font-size:0.76rem;">Conectar</button>
                        </div>
                      `;
                      }).join('')}
                  </div>
                </div>
              </div>
            ` : `
              <div class="cards-grid mp-connected-grid">
                <div class="item-card mp-qr-card" style="align-items:center; text-align:center;">
                  <div style="font-size:0.78rem; font-weight:800; color:#58d63a;">📲 ESCANEIE PARA JOGAR</div>
                  <div style="font-size:1.75rem; font-weight:900; letter-spacing:5px; color:#ffd447;">${escapeHtml(room.code)}</div>
                  <div style="font-size:0.76rem; color:#fde68a; font-weight:700;">${escapeHtml(room.roomName || `Sala ${room.code}`)} ${room.hasPassword ? '🔒' : ''}</div>
                  <canvas id="mp-qr-canvas" width="156" height="156" style="border-radius:10px; background:#fff6e5;"></canvas>
                  <div style="display:flex; gap:6px; width:100%;">
                    <button class="chunky-btn secondary" id="mp-copy-url" style="font-size:0.72rem; padding:6px 8px; flex:1;">🔗 Copiar Link</button>
                    <button class="chunky-btn orange" id="mp-share-url" style="font-size:0.72rem; padding:6px 8px; flex:1;">📤 Convidar</button>
                  </div>
                  <div style="font-size:0.66rem; color:#d8c2a6; word-break:break-all;">${escapeHtml(shareUrl)}</div>

                  <!-- Preview 3D do Dino do Jogador no Lobby -->
                  <div style="width:100%; margin-top:4px;">
                    <div id="mp-lobby-dino-preview" style="width:100%; height:130px; border-radius:12px; border:2px solid #8a562d; background:radial-gradient(circle, #5b2e16, #1d0e06);"></div>
                    <div style="display:flex; gap:5px; margin-top:6px;">
                      <button class="chunky-btn secondary" id="mp-swap-dino-btn" style="flex:1; padding:5px 6px; font-size:0.72rem;">🦖 Trocar Dino</button>
                      <button class="chunky-btn secondary" id="mp-custom-dino-btn" style="flex:1; padding:5px 6px; font-size:0.72rem;">🎨 Personalizar</button>
                    </div>
                  </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px; min-width:0;">
                  ${(() => {
                    const selfPeer = room.peers.find((p) => p.peerId === net.peerId);
                    const selfReady = !!selfPeer?.ready;
                    const hostPeer = room.peers.find((p) => p.peerId === room.hostPeerId) || room.peers[0];
                    const playerPeers = room.peers.filter((p) => p.role !== 'controller' && p.role !== 'spectator');
                    const notReadyPlayers = playerPeers.filter((p) => !p.ready);
                    const allPlayersReady = playerPeers.length > 0 && notReadyPlayers.length === 0;
                    const readyCount = playerPeers.filter((p) => p.ready).length;
                    const trLabel = net.transportType === 'supabase' ? '☁️ Online' : '📡 LAN Wi-Fi';
                    const resolvedCfg = net.resolveRoomConfig(room);
                    const roomMpMode = resolvedCfg.mpMode;
                    const modeLabel = MP_MODES.find((m) => m.id === roomMpMode)?.label || '🏁 Corrida';
                    const diffLabel = DIFFICULTY_PRESETS[resolvedCfg.difficulty]?.name || 'Normal';
                    const biomeObj = resolvedCfg.biomeId === 'random_portal'
                      ? { id: 'random_portal', name: '🌀 Sorteio (Portais)' }
                      : BIOMES.find((b) => b.id === resolvedCfg.biomeId);
                    const biomeLabel = biomeObj?.name || 'Deserto Dourado';
                    const selfVote = room.votes?.[net.peerId] || {};
                    const highPingPeers = room.peers.filter((p) => (p.pingMs || 0) > 130);
                    const describeRoleBadge = (p) => {
                      if (p.role === 'controller') return `<span class="mp-role-pill ctrl">🎮 Controle</span>`;
                      if (p.role === 'spectator') return `<span class="mp-role-pill">👁️ Espectador</span>`;
                      if (p.role === 'mobile_player') return `<span class="mp-role-pill mob3d">📱 Jogador Celular</span>`;
                      return `<span class="mp-role-pill screen">🖥️ Jogador PC/TV</span>`;
                    };

                    return `
                  ${countdownSec > 0 ? `
                    <div class="item-card" style="text-align:center; border-color:#58d63a; background:rgba(20,83,45,0.65);">
                      <strong style="font-size:1.6rem; color:#fde047;">🚀 LARGADA EM ${countdownSec}...</strong>
                    </div>
                  ` : ''}

                  <div class="item-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                      <strong>🦖 Jogadores (${playerPeers.length}/${room.maxPlayers || 8} · ${readyCount}/${playerPeers.length} prontos) • ${trLabel}</strong>
                      ${net.isHost ? `
                        <div style="display:flex; gap:6px; align-items:center;">
                          <span style="font-size:0.76rem;">Bots IA: ${botCount}</span>
                          <button class="chunky-btn secondary" id="mp-add-bot" style="padding:4px 8px; font-size:0.74rem;">+ Bot</button>
                        </div>
                      ` : ''}
                    </div>
                    <div style="margin-top:4px; padding:6px 10px; border-radius:8px; background:rgba(15,23,42,0.5); border:1px solid #f59e0b; font-size:0.76rem; color:#fde047; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                      <span><strong>${modeLabel}</strong> • ${diffLabel} • ${biomeLabel} • ${room.config?.multiHabitats !== false ? '🌍 Multi-Habitat' : '📍 Habitat Único'}</span>
                      <span>${room.config?.uniqueDinos ? '🔒 Dinos Únicos' : '♻️ Repetidos OK'} • ${room.config?.allowHybrids !== false ? '🧬 Híbridos ON' : '🚫 Sem Híbridos'}</span>
                    </div>
                    ${highPingPeers.length > 0 ? `
                      <div style="margin-top:4px; padding:4px 8px; border-radius:8px; background:rgba(127,29,29,0.55); border:1px solid #f87171; font-size:0.74rem; color:#fecaca;">
                        ⚠️ Ping alto detectado em: ${highPingPeers.map((h) => `${escapeHtml(h.name)} (${h.pingMs}ms)`).join(', ')}
                      </div>
                    ` : ''}

                    ${resolvedCfg.allowVoting ? `
                      <div style="margin-top:6px; padding:7px; border-radius:10px; background:rgba(15,23,42,0.55); border:1px solid rgba(56,189,248,0.35); display:flex; flex-direction:column; gap:5px;">
                        <strong style="font-size:0.76rem; color:#7dd3fc;">🗳️ Seu Voto (Maioria decide)</strong>
                        <div class="mp-rules-grid">
                          <select class="select-input" id="mp-vote-mode" style="font-size:0.74rem;">
                            ${MP_MODES.map((m) => `<option value="${m.id}" ${(selfVote.mpMode || roomMpMode) === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}
                          </select>
                          <select class="select-input" id="mp-vote-diff" style="font-size:0.74rem;">
                            ${Object.values(DIFFICULTY_PRESETS).map((d) => `<option value="${d.id}" ${(selfVote.difficulty || resolvedCfg.difficulty) === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
                          </select>
                          <select class="select-input" id="mp-vote-biome" style="font-size:0.74rem;">
                            <option value="random_portal" ${(selfVote.biomeId || resolvedCfg.biomeId) === 'random_portal' ? 'selected' : ''}>🌀 Sorteio</option>
                            ${BIOMES.map((b) => `<option value="${b.id}" ${(selfVote.biomeId || resolvedCfg.biomeId) === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                          </select>
                        </div>
                      </div>
                    ` : ''}

                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(185px, 1fr)); gap:6px; margin-top:6px;">
                      ${room.peers.map((p) => {
                        const pb = pingBadge(p.peerId === net.peerId ? net.pingMs : p.pingMs);
                        const canRevoke = p.role === 'controller' && (p.targetPlayerPeerId === net.peerId || net.isHost);
                        const boundTarget = p.targetPlayerPeerId ? room.peers.find((x) => x.peerId === p.targetPlayerPeerId) : null;
                        return `
                        <div style="padding:7px 9px; border-radius:10px; background:rgba(0,0,0,0.4); border:1.5px solid ${sanitizeHexColor(p.color, '#ffd447')}; font-size:0.8rem; display:flex; flex-direction:column; gap:3px;">
                          <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
                            <span style="font-weight:800;">${p.peerId === hostPeer?.peerId ? '👑 ' : ''}${escapeHtml(p.name)}${p.peerId === net.peerId ? ' (Você)' : ''}</span>
                            <span style="font-size:0.68rem; color:${pb.color};">${pb.icon} ${pb.label}</span>
                          </div>
                          <div>${describeRoleBadge(p)}</div>
                          ${boundTarget ? `<div style="font-size:0.68rem; color:#7dd3fc;">🔗 Controlando: <strong>${escapeHtml(boundTarget.name)}</strong></div>` : ''}
                          <div style="font-size:0.72rem; color:#d8c2a6;">🦖 ${escapeHtml(getDinoSpec(p.dinoId).name)} • ${p.ready ? '✅ Pronto' : '⏳ Aguardando'}</div>
                          <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:2px;">
                            ${canRevoke ? `<button class="inline-change-btn" data-revoke-ctrl="${escapeHtml(p.peerId)}" style="border-color:#f87171; color:#fecaca;">🚫 Remover</button>` : ''}
                            ${net.isHost && p.peerId !== net.peerId ? `
                              ${p.role !== 'controller' ? `<button class="inline-change-btn" data-pass-host="${escapeHtml(p.peerId)}" style="border-color:#ffd447; color:#fde047;">👑 Dono</button>` : ''}
                              <button class="inline-change-btn" data-kick="${escapeHtml(p.peerId)}" style="border-color:#fb923c; color:#fed7aa;">👢</button>
                              <button class="inline-change-btn" data-ban="${escapeHtml(p.peerId)}" style="border-color:#ef4444; color:#fca5a5;">🚫 Ban</button>
                            ` : ''}
                            ${!net.isHost && p.peerId !== net.peerId ? `<button class="inline-change-btn" data-report-peer="${escapeHtml(p.peerId)}" style="border-color:#94a3b8; color:#cbd5e1;">🚨</button>` : ''}
                          </div>
                        </div>
                      `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- Chat Seguro (Proteção a Menores: apenas Emotes & Frases Prontas) -->
                  <div class="item-card" style="gap:6px;">
                    <strong>💬 Emotes &amp; Frases Rápidas (Seguro)</strong>
                    <div style="max-height:70px; overflow-y:auto; font-size:0.78rem; background:rgba(0,0,0,0.25); padding:5px 7px; border-radius:8px;">
                      ${net.chatLog.length === 0 ? `<span style="color:#a89078;">Toque numa frase pronta ou emote para interagir!</span>` :
                        net.chatLog.map((c) => `<div><strong style="color:#ffd447;">${escapeHtml(c.name)}:</strong> ${escapeHtml(c.text)}</div>`).join('')}
                    </div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                      ${SAFE_PHRASES.map((ph) => `<button class="tab-btn" data-mp-phrase="${escapeHtml(ph)}" style="padding:4px 8px; font-size:0.72rem;">${escapeHtml(ph)}</button>`).join('')}
                      ${['🦖', '🔥', '👑', '🥚', '⚡', '🎉'].map((em) => `<button class="tab-btn" data-mp-em="${em}" style="padding:4px 8px; font-size:0.76rem;">${em}</button>`).join('')}
                    </div>
                  </div>

                  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <button class="chunky-btn ${selfReady ? 'orange' : ''}" id="mp-ready-self" style="flex:1; font-size:0.94rem;">
                      ${selfReady ? '✅ PRONTO (Clique p/ cancelar)' : '👍 MARCAR PRONTO'}
                    </button>
                    ${net.isHost ? `
                      <button class="chunky-btn" id="mp-start" ${!allPlayersReady ? 'disabled' : ''} style="flex:1.2; font-size:1rem;">
                        ${allPlayersReady
                          ? `🚀 INICIAR CORRIDA (${playerPeers.length + botCount} DINOS)`
                          : `⏳ Faltam prontos: ${notReadyPlayers.map((n) => escapeHtml(n.name)).join(', ')}`}
                      </button>
                    ` : (room.status === 'playing' && room.activeMatch ? `<button class="chunky-btn" id="mp-join-live" style="flex:1;">🎮 ENTRAR NA CORRIDA!</button>` : '')}
                    <button class="chunky-btn secondary" id="mp-leave">Sair</button>
                  </div>
                    `;
                  })()}
                </div>
              </div>
            `}
          </div>
        </div>

        ${connected && showDinoPicker ? `
          <div class="overlay-center" id="mp-dino-picker-modal" style="z-index:80;">
            <div class="chunky-panel modal-card" style="max-width:660px;">
              <div class="modal-header">
                <h2>🦖 Escolher Dinossauro no Lobby</h2>
                <button class="chunky-btn secondary" id="mp-close-dpick">Fechar</button>
              </div>
              ${room.config?.uniqueDinos ? `<div class="hud-pill" style="color:#fde047;">🔒 Sala exige dinos únicos — dinos já escolhidos ficam bloqueados.</div>` : ''}
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:6px; max-height:55vh; overflow-y:auto;">
                ${DINO_CATALOG.filter((d) => Save.data.unlockedDinos.includes(d.id)).map((d) => {
                  const taken = room.config?.uniqueDinos && room.peers.some((p) => p.peerId !== net.peerId && p.role !== 'controller' && p.dinoId === d.id);
                  const isMine = (Save.data.selectedDino || 'trex') === d.id;
                  return `
                    <button class="tab-btn ${isMine ? 'active' : ''}" data-pick-lobby-dino="${d.id}" ${taken ? 'disabled' : ''} style="text-align:left; padding:8px;">
                      <div style="font-weight:900;">${escapeHtml(d.name)}</div>
                      <small style="opacity:0.8;">${taken ? '🔒 Em uso' : (isMine ? '★ Atual' : d.habitat || 'land')}</small>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        ${connected && showGearModal && net.isHost ? `
          <div class="overlay-center" id="mp-gear-modal" style="z-index:80;">
            <div class="chunky-panel modal-card" style="max-width:560px;">
              <div class="modal-header">
                <h2>⚙️ Configurações da Sala</h2>
                <button class="chunky-btn secondary" id="mp-close-gear">Fechar</button>
              </div>
              ${room.status === 'playing' ? `<div class="hud-pill" style="color:#f87171;">🔒 Partida em andamento — algumas opções estão travadas.</div>` : ''}
              <div style="display:grid; gap:8px;">
                <label class="field-row"><span>Modo de Jogo</span>
                  <select class="select-input" id="gear-mode" ${room.status === 'playing' ? 'disabled' : ''}>
                    ${MP_MODES.map((m) => `<option value="${m.id}" ${(room.mpMode || 'race') === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}
                  </select>
                </label>
                <label class="field-row"><span>Dificuldade</span>
                  <select class="select-input" id="gear-diff" ${room.status === 'playing' ? 'disabled' : ''}>
                    ${Object.values(DIFFICULTY_PRESETS).map((d) => `<option value="${d.id}" ${(room.config?.difficulty || 'normal') === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
                  </select>
                </label>
                <label class="field-row"><span>Habitat Inicial</span>
                  <select class="select-input" id="gear-biome" ${room.status === 'playing' ? 'disabled' : ''}>
                    <option value="random_portal" ${(room.config?.biomeId || 'random_portal') === 'random_portal' ? 'selected' : ''}>🌀 Sorteio (Portais)</option>
                    ${BIOMES.map((b) => `<option value="${b.id}" ${room.config?.biomeId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                  </select>
                </label>
                <label class="field-row"><span>Regra de Pausa</span>
                  <select class="select-input" id="gear-pause">
                    <option value="host_only" ${(room.config?.pausePolicy || 'host_only') === 'host_only' ? 'selected' : ''}>👑 Só o Dono</option>
                    <option value="all_limited" ${room.config?.pausePolicy === 'all_limited' ? 'selected' : ''}>👥 Todos (c/ limite)</option>
                  </select>
                </label>
                <label class="field-row"><span>🌍 Vários Habitats (portais)</span><input type="checkbox" id="gear-multihab" ${room.config?.multiHabitats !== false ? 'checked' : ''} /></label>
                <label class="field-row"><span>🗳️ Jogadores podem votar</span><input type="checkbox" id="gear-vote" ${room.config?.allowVoting !== false ? 'checked' : ''} /></label>
                <label class="field-row"><span>🧬 Permitir Híbridos</span><input type="checkbox" id="gear-hybrids" ${room.config?.allowHybrids !== false ? 'checked' : ''} /></label>
                <label class="field-row"><span>🔒 Exigir Dinos Únicos</span><input type="checkbox" id="gear-unique" ${room.config?.uniqueDinos ? 'checked' : ''} /></label>
                <label class="field-row"><span>📱 Permitir Controles Celular</span><input type="checkbox" id="gear-ctrl" ${room.config?.allowControllers !== false ? 'checked' : ''} /></label>
                <label class="field-row"><span>👥 +1 Controle por Jogador</span><input type="checkbox" id="gear-multictrl" ${room.config?.allowMultiControllersPerPlayer ? 'checked' : ''} /></label>
                <label class="field-row"><span>☄️ Eventos / 👑 Bosses / ⚡ Power-ups</span>
                  <div style="display:flex; gap:10px;">
                    <label><input type="checkbox" id="gear-ev" ${room.config?.allowEvents !== false ? 'checked' : ''} /> Ev</label>
                    <label><input type="checkbox" id="gear-boss" ${room.config?.allowBosses !== false ? 'checked' : ''} /> Boss</label>
                    <label><input type="checkbox" id="gear-pup" ${room.config?.allowPowerups !== false ? 'checked' : ''} /> PUp</label>
                  </div>
                </label>
                <label class="field-row"><span>⚖️ Handicap Opcional</span><input type="checkbox" id="gear-handicap" ${room.config?.allowHandicap ? 'checked' : ''} /></label>
              </div>
              <button class="chunky-btn" id="gear-save" style="margin-top:8px;">✅ Aplicar Regras</button>
            </div>
          </div>
        ` : ''}
      `;

      container.querySelector('#mp-close').onclick = () => {
        cleanupListeners();
        callbacks.onClose?.();
      };
      container.querySelector('#mp-open-ctrl')?.addEventListener('click', () => {
        cleanupListeners();
        callbacks.onOpenController?.(room?.code || '', transport);
      });
      container.querySelector('#mp-open-gear')?.addEventListener('click', () => {
        showGearModal = true;
        render();
      });

      if (!connected) {
        container.querySelectorAll('[data-tr]').forEach((b) => {
          b.onclick = () => { transport = b.getAttribute('data-tr'); connTest = null; statusMsg = ''; refreshRooms(); };
        });
        container.querySelector('#mp-pub-sel')?.addEventListener('change', (e) => {
          const cb = container.querySelector('#mp-pub');
          if (cb) cb.checked = e.target.value === 'public';
        });
        container.querySelector('#mp-test-conn').onclick = async () => {
          statusMsg = '⏳ Testando conexão...';
          render();
          connTest = await net.runConnectionTest(transport);
          statusMsg = '';
          render();
        };
        container.querySelector('#mp-refresh').onclick = refreshRooms;
        container.querySelector('#mp-friends-quick')?.addEventListener('click', () => doCreateRoom({ friendsQuick: true }));
        container.querySelector('#mp-create').onclick = () => doCreateRoom({ friendsQuick: false });
        container.querySelector('#mp-join').onclick = async () => {
          joinCode = sanitizeRoomCode(container.querySelector('#mp-code').value);
          joinPassword = sanitizeRoomPassword(container.querySelector('#mp-join-pass')?.value || '');
          nickname = sanitizeNickname(container.querySelector('#mp-join-nick')?.value || nickname, 'Dino', 18);
          try { Save.data.network.nickname = nickname; Save.save(); } catch {}
          statusMsg = '⏳ Entrando na sala...';
          render();
          const res = await net.joinRoom(joinCode, {
            transport,
            password: joinPassword,
            name: nickname,
            dinoId: Save.data.selectedDino || 'trex',
            customization: getLocalCustomization(),
            role: onMobile ? 'mobile_player' : 'screen'
          });
          if (!res.ok) statusMsg = `⚠️ ${res.message}`;
          else if (statusMsg.startsWith('⏳') && net.isConnected) statusMsg = '';
          render();
        };
        container.querySelectorAll('[data-join-code]').forEach((b) => {
          b.onclick = async () => {
            const c = b.getAttribute('data-join-code');
            joinPassword = sanitizeRoomPassword(container.querySelector('#mp-join-pass')?.value || '');
            nickname = sanitizeNickname(container.querySelector('#mp-join-nick')?.value || nickname, 'Dino', 18);
            try { Save.data.network.nickname = nickname; Save.save(); } catch {}
            statusMsg = '⏳ Conectando à sala...';
            render();
            const res = await net.joinRoom(c, {
              transport,
              password: joinPassword,
              name: nickname,
              dinoId: Save.data.selectedDino || 'trex',
              customization: getLocalCustomization(),
              role: onMobile ? 'mobile_player' : 'screen'
            });
            if (!res.ok) statusMsg = `⚠️ ${res.message}`;
            else if (statusMsg.startsWith('⏳') && net.isConnected) statusMsg = '';
            render();
          };
        });
      } else {
        const qrCanvas = container.querySelector('#mp-qr-canvas');
        if (qrCanvas) renderQrToCanvas(qrCanvas, shareUrl, 156);

        const prevBox = container.querySelector('#mp-lobby-dino-preview');
        const selfPeerNow = room.peers.find((p) => p.peerId === net.peerId);
        if (prevBox) {
          try {
            const customCfg = getLocalCustomization();
            preview3d = new DinoPreview3D(prevBox, selfPeerNow?.dinoId || Save.data.selectedDino || 'trex', customCfg, {
              allowHybrid: room.config?.allowHybrids !== false && !!Save.data.hybrid?.enabled,
              skinVariant: customCfg.skinVariant
            });
          } catch {}
        }

        container.querySelector('#mp-copy-url')?.addEventListener('click', () => {
          navigator.clipboard?.writeText(shareUrl).catch(() => {});
          statusMsg = '✅ Link copiado!';
          render();
        });
        container.querySelector('#mp-share-url')?.addEventListener('click', async () => {
          if (navigator.share) {
            try {
              await navigator.share({
                title: `Dino Dash 3D — Sala ${room.code}`,
                text: `Entre na minha sala ${room.code} no Dino Dash 3D!`,
                url: shareUrl
              });
              return;
            } catch {}
          }
          navigator.clipboard?.writeText(shareUrl).catch(() => {});
          statusMsg = '✅ Link pronto para compartilhar!';
          render();
        });
        container.querySelector('#mp-swap-dino-btn')?.addEventListener('click', () => {
          showDinoPicker = true;
          render();
        });
        container.querySelector('#mp-custom-dino-btn')?.addEventListener('click', () => {
          cleanupListeners();
          callbacks.onOpenCustom?.();
        });
        container.querySelector('#mp-close-dpick')?.addEventListener('click', () => {
          showDinoPicker = false;
          render();
        });
        container.querySelectorAll('[data-pick-lobby-dino]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const dId = btn.getAttribute('data-pick-lobby-dino');
            if (!dId) return;
            Save.data.selectedDino = dId;
            try { Save.save(); } catch {}
            net.sendPlayerMeta({ dinoId: dId, customization: getLocalCustomization() });
            showDinoPicker = false;
            render();
          });
        });

        container.querySelector('#mp-close-gear')?.addEventListener('click', () => {
          showGearModal = false;
          render();
        });
        container.querySelector('#gear-save')?.addEventListener('click', () => {
          const modeVal = container.querySelector('#gear-mode')?.value || 'race';
          net.updateRoomSettings({
            mpMode: modeVal,
            elimination: modeVal === 'elimination',
            config: {
              difficulty: container.querySelector('#gear-diff')?.value || 'normal',
              biomeId: container.querySelector('#gear-biome')?.value || 'random_portal',
              pausePolicy: container.querySelector('#gear-pause')?.value || 'host_only',
              multiHabitats: !!container.querySelector('#gear-multihab')?.checked,
              allowVoting: !!container.querySelector('#gear-vote')?.checked,
              allowHybrids: !!container.querySelector('#gear-hybrids')?.checked,
              uniqueDinos: !!container.querySelector('#gear-unique')?.checked,
              allowControllers: !!container.querySelector('#gear-ctrl')?.checked,
              allowMultiControllersPerPlayer: !!container.querySelector('#gear-multictrl')?.checked,
              allowEvents: !!container.querySelector('#gear-ev')?.checked,
              allowBosses: !!container.querySelector('#gear-boss')?.checked,
              allowPowerups: !!container.querySelector('#gear-pup')?.checked,
              allowHandicap: !!container.querySelector('#gear-handicap')?.checked
            }
          });
          showGearModal = false;
          render();
        });

        container.querySelector('#mp-add-bot')?.addEventListener('click', () => {
          botCount = Math.min(7, botCount + 1);
          render();
        });
        container.querySelectorAll('[data-mp-phrase]').forEach((b) => {
          b.onclick = () => net.sendChat(b.getAttribute('data-mp-phrase'));
        });
        container.querySelectorAll('[data-mp-em]').forEach((b) => {
          b.onclick = () => net.sendEmote(b.getAttribute('data-mp-em'));
        });
        container.querySelector('#mp-ready-self')?.addEventListener('click', () => {
          const self = room.peers.find((p) => p.peerId === net.peerId);
          const nextReady = !(self?.ready);
          if (self) self.ready = nextReady;
          net.sendPlayerMeta({ ready: nextReady });
          render();
        });

        const emitVote = () => {
          net.sendRoomVote({
            mpMode: container.querySelector('#mp-vote-mode')?.value || null,
            difficulty: container.querySelector('#mp-vote-diff')?.value || null,
            biomeId: container.querySelector('#mp-vote-biome')?.value || null
          });
        };
        container.querySelector('#mp-vote-mode')?.addEventListener('change', emitVote);
        container.querySelector('#mp-vote-diff')?.addEventListener('change', emitVote);
        container.querySelector('#mp-vote-biome')?.addEventListener('change', emitVote);

        container.querySelectorAll('[data-revoke-ctrl]').forEach((btn) => {
          btn.addEventListener('click', () => net.sendControlRevoke(btn.getAttribute('data-revoke-ctrl')));
        });
        container.querySelectorAll('[data-pass-host]').forEach((btn) => {
          btn.addEventListener('click', () => net.transferHost(btn.getAttribute('data-pass-host')));
        });
        container.querySelectorAll('[data-kick]').forEach((btn) => {
          btn.addEventListener('click', () => net.kickPeer(btn.getAttribute('data-kick'), false));
        });
        container.querySelectorAll('[data-ban]').forEach((btn) => {
          btn.addEventListener('click', () => net.kickPeer(btn.getAttribute('data-ban'), true));
        });
        container.querySelectorAll('[data-report-peer]').forEach((btn) => {
          btn.addEventListener('click', () => {
            net.reportPlayer(btn.getAttribute('data-report-peer'), 'Apelido ou conduta imprópria');
            statusMsg = '🚨 Jogador reportado ao Dono da Sala.';
            render();
          });
        });

        container.querySelector('#mp-join-live')?.addEventListener('click', () => {
          if (room.activeMatch) {
            cleanupListeners();
            callbacks.onGuestStartMatch?.(room.activeMatch);
          }
        });
        container.querySelector('#mp-leave').onclick = () => {
          net.leaveRoom();
          render();
        };
        container.querySelector('#mp-start')?.addEventListener('click', () => {
          startWithCountdown(room);
        });
      }
      attachModalHelp(container, 'Crie uma sala com suas regras, compartilhe o QR Code lateral ou código de 4 letras, aguarde todos ficarem prontos e inicie a corrida!');
    };

    const cleanupListeners = () => {
      clearInterval(autoRefreshTid);
      clearInterval(countdownTid);
      destroyPreview();
      net.off('room_state', onRoom);
      net.off('chat', onChat);
      net.off('error', onErr);
      net.off('player_reported', onReported);
      net.off('start_countdown', onCountdown);
    };

    render();
    if (!net.isConnected && !initialRefreshed) {
      initialRefreshed = true;
      refreshRooms().catch(() => {});
    }
    return cleanupListeners;
  }
}
