// Transporte "Local Instantâneo": multiplayer sem servidor (abas/janelas do mesmo navegador/PC).
// Usa BroadcastChannel('dino_dash_3d_lan_v1') + registro de salas em localStorage ('dd3d_local_rooms_v1', TTL 15 min).
// A aba que cria a sala é o HOST autoritativo (equivalente ao server/lan-host.js, em memória).
// Funciona inclusive em HTTPS (Vercel), pois não usa ws://.
// Mesma interface de TransportLAN: on/connect/send/listPublicRooms/disconnect/connected/pingMs.

const CHANNEL_NAME = 'dino_dash_3d_lan_v1';
const REGISTRY_KEY = 'dd3d_local_rooms_v1';
const ROOM_TTL_MS = 15 * 60 * 1000;
const LIVE_MS = 20000; // sala só aparece na lista se o host deu sinal de vida recentemente
const HEARTBEAT_MS = 5000;
const PEER_TIMEOUT_MS = 9000;
const PING_MS = 2200;
const MAX_PLAYERS = 8;
const ROLES = ['screen', 'controller', 'mobile_player', 'spectator'];
const PALETTE = ['#58d63a', '#38bdf8', '#ff9a24', '#f43f5e', '#a855f7', '#ffd447', '#14b8a6', '#ec4899'];

function cleanStr(value, fallback = '', maxLen = 32) {
  const s = String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>`"'\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return s || fallback;
}
function cleanId(value, fallback = '', maxLen = 32) {
  return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen) || fallback;
}
function cleanCode(value) {
  const s = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{4}$/.test(s) ? s : '';
}
function cleanColor(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}
function readRegistry() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(REGISTRY_KEY) || '{}');
    const now = Date.now();
    const out = {};
    for (const [code, r] of Object.entries(raw || {})) {
      if (r && now - Number(r.createdAt || 0) < ROOM_TTL_MS && now - Number(r.updatedAt || 0) < ROOM_TTL_MS) out[code] = r;
    }
    return out;
  } catch {
    return {};
  }
}
function writeRegistry(reg) {
  try { window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg)); } catch {}
}

export class TransportLocalChannel {
  constructor() {
    this.kind = 'local_channel';
    this.connected = false;
    this.pingMs = 0;
    this.listeners = new Map();
    this.channel = null;
    this.peerId = null;
    this.roomCode = null;
    this.isHostTab = false;
    this.room = null; // estado autoritativo (somente na aba host)
    this.heartbeatTimer = null;
    this.pingTimer = null;
    this.sweepTimer = null;
    this.pendingTimer = null;
    this.lastHostSeen = 0;
    this._unloadBound = false;
    this._instanceId = `lc_${Math.random().toString(36).slice(2, 10)}`;
  }

  static isSupported() {
    return typeof BroadcastChannel !== 'undefined' && typeof window !== 'undefined';
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }

  off(event, fn) {
    this.listeners.get(event)?.delete(fn);
  }

  _emit(event, payload) {
    const set = this.listeners.get(event);
    if (set) for (const fn of Array.from(set)) { try { fn(payload); } catch (e) { console.warn(e); } }
  }

  async connect() {
    if (!TransportLocalChannel.isSupported()) return false;
    if (!this.channel) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (ev) => this._onChannel(ev.data);
      } catch {
        return false;
      }
    }
    if (!this._unloadBound) {
      this._unloadBound = true;
      window.addEventListener('pagehide', () => this._farewell());
      window.addEventListener('beforeunload', () => this._farewell());
    }
    this.connected = true;
    return true;
  }

  async discoverLanInfo() {
    return { ok: true, ips: [], port: 0, local: true };
  }

  // ---------- Registro de salas ----------
  _publishRoom() {
    if (!this.isHostTab || !this.room) return;
    const r = this.room;
    const host = r.peers.get(r.hostPeerId);
    const reg = readRegistry();
    reg[r.code] = {
      code: r.code,
      roomName: r.roomName,
      hostName: host?.name || 'Host',
      mode: r.mpMode || r.mode || 'race',
      biomeId: r.config?.biomeId || 'random_portal',
      isPublic: !!r.isPublic,
      hasPassword: !!r.password,
      playerCount: r.peers.size,
      maxPlayers: r.maxPlayers,
      status: r.status,
      hostInstance: this._instanceId,
      createdAt: r.createdAt,
      updatedAt: Date.now()
    };
    writeRegistry(reg);
  }

  _unpublishRoom(code) {
    const reg = readRegistry();
    delete reg[code];
    writeRegistry(reg);
  }

  async listPublicRooms() {
    const now = Date.now();
    return Object.values(readRegistry())
      .filter((r) => r.isPublic && r.playerCount > 0 && now - Number(r.updatedAt || 0) < LIVE_MS)
      .map((r) => ({
        code: r.code,
        roomName: r.roomName,
        hostName: r.hostName,
        mode: r.mode,
        biomeId: r.biomeId,
        hasPassword: !!r.hasPassword,
        playerCount: r.playerCount,
        maxPlayers: r.maxPlayers,
        status: r.status
      }));
  }

  _randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const reg = readRegistry();
    for (let n = 0; n < 50; n++) {
      let c = '';
      for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
      if (!reg[c]) return c;
    }
    return 'ZZZZ';
  }

  // ---------- Serialização ----------
  _serialize(room = this.room) {
    return {
      code: room.code,
      roomName: room.roomName,
      hostPeerId: room.hostPeerId,
      isPublic: room.isPublic,
      hasPassword: !!room.password,
      maxPlayers: room.maxPlayers,
      mode: room.mode,
      mpMode: room.mpMode || (room.elimination ? 'elimination' : 'race'),
      status: room.status,
      seed: room.seed,
      elimination: room.elimination,
      partyMode: room.partyMode,
      teacherMode: room.teacherMode,
      tvScale: room.tvScale,
      config: { ...room.config },
      votes: { ...(room.votes || {}) },
      activeMatch: room.activeMatch || null,
      peers: Array.from(room.peers.values()).map((p) => ({
        peerId: p.peerId,
        name: p.name,
        dinoId: p.dinoId,
        color: p.color,
        customization: p.customization || null,
        ready: p.ready,
        role: p.role,
        controlMode: p.controlMode || 'p1_remote',
        targetPlayerPeerId: p.targetPlayerPeerId || null,
        slot: p.slot,
        pingMs: p.pingMs || 0
      }))
    };
  }

  // ---------- Envio de baixo nível ----------
  _post(env) {
    try { this.channel?.postMessage({ ...env, inst: this._instanceId, roomCode: env.roomCode ?? this.roomCode }); } catch {}
  }

  // Host -> peer específico (ou local)
  _deliver(toPeerId, payload) {
    if (toPeerId === this.peerId) {
      queueMicrotask(() => this._emit('message', payload));
    } else {
      this._post({ k: 'h2c', to: toPeerId, msg: payload });
    }
  }

  _broadcast(payload, excludePeerId = null) {
    if (this.peerId !== excludePeerId) queueMicrotask(() => this._emit('message', payload));
    this._post({ k: 'h2c', to: '*', exclude: excludePeerId, msg: payload });
  }

  _broadcastState() {
    this._broadcast({ type: 'room_state', room: this._serialize() });
    this._publishRoom();
  }

  // ---------- Entrada do canal ----------
  _onChannel(data) {
    if (!data || data.inst === this._instanceId) return;
    if (data.k === 'c2h') {
      if (this.isHostTab && this.room && data.roomCode === this.room.code) this._hostHandle(data.from, data.msg);
      return;
    }
    if (data.k === 'h2c') {
      if (!this.roomCode || data.roomCode !== this.roomCode || this.isHostTab) return;
      if (data.to !== '*' && data.to !== this.peerId) return;
      if (data.exclude && data.exclude === this.peerId) return;
      this.lastHostSeen = Date.now();
      const m = data.msg;
      if (!m) return;
      if (m.type === 'pong') {
        this.pingMs = Math.max(1, Math.round(performance.now() - m.ts));
        this._emit('pong', this.pingMs);
        return;
      }
      if (m.type === 'joined') { this._clearPending(); this.joined = true; }
      if (m.type === 'error' && !this.joined) { this._clearPending(); this._stopLoops(); this.roomCode = null; }
      if (m.type === 'room_closed') {
        this._emit('message', { type: 'error', message: 'O Host fechou a sala.' });
        this._leaveLocal();
        this._emit('disconnected', true);
        return;
      }
      this._emit('message', m);
    }
  }

  _clearPending() {
    clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
  }

  // ---------- API pública (mesmo contrato do TransportLAN.send) ----------
  send(payload) {
    if (!payload || typeof payload.type !== 'string' || !this.connected) return false;
    const t = payload.type;

    if (t === 'create_room') return this._create(payload);
    if (t === 'join_room') return this._join(payload);
    if (t === 'ping') {
      if (this.isHostTab) {
        queueMicrotask(() => { this.pingMs = 1; this._emit('pong', 1); });
      } else if (this.roomCode) {
        this._post({ k: 'c2h', from: this.peerId, msg: { type: 'ping', ts: payload.ts, lastPingMs: payload.lastPingMs } });
      }
      return true;
    }
    if (!this.roomCode) return false;

    if (this.isHostTab) {
      this._hostHandle(this.peerId, payload);
    } else {
      this._post({ k: 'c2h', from: this.peerId, msg: payload });
    }
    if (t === 'leave_room') this._leaveLocal();
    return true;
  }

  _startLoops() {
    this._stopLoops();
    if (this.isHostTab) {
      this.heartbeatTimer = setInterval(() => this._publishRoom(), HEARTBEAT_MS);
      this.sweepTimer = setInterval(() => this._sweep(), 3000);
    } else {
      this.pingTimer = setInterval(() => {
        if (!this.roomCode) return;
        this._post({ k: 'c2h', from: this.peerId, msg: { type: 'ping', ts: performance.now(), lastPingMs: this.pingMs } });
        if (this.lastHostSeen && Date.now() - this.lastHostSeen > PEER_TIMEOUT_MS * 2) {
          this._emit('message', { type: 'error', message: 'Host local não responde.' });
          this._leaveLocal();
          this._emit('disconnected', true);
        }
      }, PING_MS);
    }
  }

  _stopLoops() {
    clearInterval(this.heartbeatTimer);
    clearInterval(this.pingTimer);
    clearInterval(this.sweepTimer);
    this.heartbeatTimer = this.pingTimer = this.sweepTimer = null;
  }

  _sweep() {
    if (!this.room) return;
    const now = Date.now();
    for (const p of Array.from(this.room.peers.values())) {
      if (p.peerId === this.peerId) continue;
      if (now - (p.lastSeen || 0) > PEER_TIMEOUT_MS) this._removePeer(p.peerId, false);
    }
  }

  _farewell() {
    if (!this.roomCode) return;
    if (this.isHostTab) {
      this._post({ k: 'h2c', to: '*', msg: { type: 'room_closed' } });
      this._unpublishRoom(this.roomCode);
    } else {
      this._post({ k: 'c2h', from: this.peerId, msg: { type: 'leave_room' } });
    }
  }

  _leaveLocal() {
    this._stopLoops();
    this._clearPending();
    if (this.isHostTab && this.roomCode) {
      this._post({ k: 'h2c', to: '*', msg: { type: 'room_closed' } });
      this._unpublishRoom(this.roomCode);
    }
    this.isHostTab = false;
    this.room = null;
    this.roomCode = null;
    this.lastHostSeen = 0;
  }

  // ---------- Criar / entrar ----------
  _create(msg) {
    if (this.roomCode) this._leaveLocal();
    const requested = cleanCode(msg.code);
    const code = requested && !readRegistry()[requested] ? requested : this._randomCode();
    const peerId = cleanId(msg.peerId, `p_${Math.random().toString(36).slice(2, 8)}`);
    const mpMode = cleanId(msg.mpMode || (msg.elimination ? 'elimination' : 'race'), 'race', 24);
    const pass = cleanStr(msg.password, '', 12);
    const c = msg.config || {};
    const room = {
      code,
      roomName: cleanStr(msg.roomName, `Sala ${code}`, 28),
      hostPeerId: peerId,
      isPublic: msg.isPublic !== false,
      password: pass,
      maxPlayers: Math.max(2, Math.min(MAX_PLAYERS, Math.floor(Number(msg.maxPlayers) || MAX_PLAYERS))),
      mode: cleanId(msg.mode, 'lan_party', 24),
      mpMode,
      status: 'lobby',
      seed: cleanStr(msg.seed, `LOC-${code}-${Math.floor(1000 + Math.random() * 9000)}`, 32),
      elimination: mpMode === 'elimination' || !!msg.elimination,
      partyMode: msg.partyMode !== false,
      teacherMode: !!msg.teacherMode,
      tvScale: !!msg.tvScale,
      config: {
        ...(c && typeof c === 'object' ? c : {}),
        allowVoting: c.allowVoting !== false,
        difficulty: cleanId(c.difficulty, 'normal', 16),
        biomeId: cleanId(c.biomeId, 'random_portal', 24),
        multiHabitats: c.multiHabitats !== false,
        allowHybrids: c.allowHybrids !== false,
        uniqueDinos: !!c.uniqueDinos,
        allowControllers: c.allowControllers !== false,
        allowMultiControllersPerPlayer: !!c.allowMultiControllersPerPlayer,
        allowSpectators: c.allowSpectators !== false,
        allowEvents: c.allowEvents !== false,
        allowBosses: c.allowBosses !== false,
        allowPowerups: c.allowPowerups !== false,
        allowRevive: c.allowRevive !== false,
        allowHandicap: !!c.allowHandicap,
        pausePolicy: ['host_only', 'all_limited'].includes(c.pausePolicy) ? c.pausePolicy : 'host_only'
      },
      votes: {},
      banned: new Set(),
      createdAt: Date.now(),
      peers: new Map()
    };
    room.peers.set(peerId, {
      peerId,
      name: cleanStr(msg.name, 'Host PC', 18),
      dinoId: cleanId(msg.dinoId, 'trex', 28),
      color: cleanColor(msg.color, PALETTE[0]),
      customization: msg.customization && typeof msg.customization === 'object' ? msg.customization : null,
      ready: true,
      role: ROLES.includes(msg.role) ? msg.role : 'screen',
      controlMode: ['p1_remote', 'own_dino'].includes(msg.controlMode) ? msg.controlMode : 'p1_remote',
      targetPlayerPeerId: null,
      slot: 0,
      pingMs: 0,
      lastSeen: Date.now()
    });
    this.peerId = peerId;
    this.roomCode = code;
    this.isHostTab = true;
    this.room = room;
    this._publishRoom();
    this._startLoops();
    this._deliver(peerId, { type: 'joined', code, peerId, room: this._serialize() });
    return true;
  }

  _join(msg) {
    if (this.roomCode) this._leaveLocal();
    const code = cleanCode(msg.code);
    const peerId = cleanId(msg.peerId, `p_${Math.random().toString(36).slice(2, 8)}`);
    if (!code) {
      queueMicrotask(() => this._emit('message', { type: 'error', message: 'Código de sala inválido.' }));
      return true;
    }
    this.peerId = peerId;
    this.roomCode = code;
    this.isHostTab = false;
    this.joined = false;
    this.lastHostSeen = 0;
    const joinMsg = { ...msg, type: 'join_room', code, peerId };
    this._post({ k: 'c2h', from: peerId, msg: joinMsg });
    this._clearPending();
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      if (this.roomCode === code && !this.isHostTab && !this.lastHostSeen) {
        this.roomCode = null;
        this._emit('message', {
          type: 'error',
          message: `Sala "${code}" não encontrada. Local Instantâneo só enxerga salas abertas em outra aba/janela deste mesmo navegador e endereço (mesma origem).`
        });
      }
    }, 1800);
    this._startLoops();
    return true;
  }

  // ---------- Lógica do host (espelha server/lan-host.js) ----------
  _removePeer(peerId, silent) {
    const room = this.room;
    if (!room) return;
    const peer = room.peers.get(peerId);
    if (!peer) return;
    room.peers.delete(peerId);
    if (room.votes) delete room.votes[peerId];
    if (room.hostPeerId === peerId) {
      const next = Array.from(room.peers.values()).find((c) => c.role === 'screen') || Array.from(room.peers.values())[0];
      if (next) {
        room.hostPeerId = next.peerId;
        this._broadcast({ type: 'host_migrated', hostPeerId: next.peerId, hostName: next.name });
      }
    }
    if (!silent) this._broadcastState();
  }

  _hostHandle(from, msg) {
    const room = this.room;
    if (!room || !msg || typeof msg.type !== 'string') return;
    const isHost = from === room.hostPeerId;
    const peer = room.peers.get(from);
    if (peer) peer.lastSeen = Date.now();

    switch (msg.type) {
      case 'ping':
        if (peer && typeof msg.lastPingMs === 'number') peer.pingMs = msg.lastPingMs;
        this._deliver(from, { type: 'pong', ts: msg.ts });
        return;
      case 'join_room':
        this._hostJoin(from, msg);
        return;
      case 'list_rooms':
        this.listPublicRooms().then((rooms) => this._deliver(from, { type: 'rooms_list', rooms }));
        return;
    }
    if (!peer) return;

    switch (msg.type) {
      case 'leave_room':
        if (from === this.peerId) {
          // o próprio host saiu: fecha sala (leaveRoom também chama _leaveLocal)
          this._broadcast({ type: 'room_closed' }, this.peerId);
          this._unpublishRoom(room.code);
        } else {
          this._removePeer(from, false);
        }
        break;
      case 'update_room':
      case 'update_room_settings':
      case 'update_meta_room':
        if (!isHost) break;
        if (msg.mode !== undefined) room.mode = cleanId(msg.mode, room.mode, 24);
        if (msg.mpMode !== undefined) { room.mpMode = cleanId(msg.mpMode, 'race', 24); room.elimination = room.mpMode === 'elimination'; }
        if (msg.status !== undefined && ['lobby', 'playing', 'finished'].includes(msg.status)) room.status = msg.status;
        if (msg.seed !== undefined) room.seed = cleanStr(msg.seed, room.seed, 32);
        if (msg.elimination !== undefined) room.elimination = !!msg.elimination;
        if (msg.partyMode !== undefined) room.partyMode = !!msg.partyMode;
        if (msg.teacherMode !== undefined) room.teacherMode = !!msg.teacherMode;
        if (msg.tvScale !== undefined) room.tvScale = !!msg.tvScale;
        if (msg.isPublic !== undefined) room.isPublic = !!msg.isPublic;
        if (msg.config && typeof msg.config === 'object') room.config = { ...room.config, ...msg.config };
        if (msg.resetVotes) room.votes = {};
        if (msg.activeMatch !== undefined) room.activeMatch = msg.activeMatch;
        this._broadcastState();
        break;
      case 'room_vote':
        if (room.config?.allowVoting !== false) {
          room.votes[from] = { difficulty: msg.difficulty || null, biomeId: msg.biomeId || null, mpMode: msg.mpMode || null };
          this._broadcastState();
        }
        break;
      case 'player_meta':
      case 'update_meta':
        if (msg.name) peer.name = cleanStr(msg.name, peer.name, 18);
        if (msg.dinoId) {
          const next = cleanId(msg.dinoId, peer.dinoId, 28);
          const taken = room.config?.uniqueDinos && Array.from(room.peers.values()).some(
            (o) => o.peerId !== from && o.role !== 'controller' && o.dinoId === next
          );
          if (taken) {
            this._deliver(from, { type: 'error', message: 'Este dinossauro já foi escolhido por outro jogador nesta sala!' });
            break;
          }
          peer.dinoId = next;
        }
        if (msg.color) peer.color = cleanColor(msg.color, peer.color);
        if (msg.customization && typeof msg.customization === 'object') peer.customization = msg.customization;
        if (ROLES.includes(msg.role)) peer.role = msg.role;
        if (['p1_remote', 'own_dino'].includes(msg.controlMode)) peer.controlMode = msg.controlMode;
        if (msg.ready !== undefined) peer.ready = !!msg.ready;
        if (peer.role === 'controller' && room.hostPeerId === from) {
          const screen = Array.from(room.peers.values()).find((c) => c.peerId !== from && (c.role === 'screen' || c.role === 'mobile_player'));
          if (screen) room.hostPeerId = screen.peerId;
        }
        this._broadcastState();
        break;
      case 'kick_peer': {
        if (!isHost) break;
        const tid = cleanId(msg.targetPeerId);
        const target = tid && tid !== from ? room.peers.get(tid) : null;
        if (!target) break;
        if (msg.ban) room.banned.add(tid);
        room.peers.delete(tid);
        this._deliver(tid, {
          type: 'kicked',
          banned: !!msg.ban,
          reason: msg.ban ? '🚫 Você foi banido desta sala pelo Dono.' : '👢 Você foi removido da sala pelo Dono.'
        });
        this._broadcastState();
        break;
      }
      case 'transfer_host': {
        if (!isHost) break;
        const target = room.peers.get(cleanId(msg.targetPeerId));
        if (!target || target.role === 'controller') break;
        room.hostPeerId = target.peerId;
        this._broadcast({ type: 'host_migrated', hostPeerId: target.peerId, hostName: target.name });
        this._broadcastState();
        break;
      }
      case 'report_player': {
        const target = room.peers.get(cleanId(msg.targetPeerId));
        if (target) {
          this._deliver(room.hostPeerId, {
            type: 'player_reported',
            reporterName: peer.name,
            targetPeerId: target.peerId,
            targetName: target.name,
            reason: cleanStr(msg.reason, 'Comportamento inadequado', 60)
          });
        }
        break;
      }
      case 'request_room_sync':
        this._deliver(from, { type: 'room_state', room: this._serialize() });
        if (room.status === 'playing' && room.activeMatch) this._deliver(from, room.activeMatch);
        break;
      case 'chat':
        this._broadcast({ type: 'chat', peerId: from, name: cleanStr(peer.name, 'Dino', 18), text: cleanStr(msg.text || msg.message, '', 120) }, from);
        break;
      case 'emote':
        this._broadcast({ type: 'emote', peerId: from, emote: cleanStr(msg.emote || msg.emoji, '🦖', 16) }, from);
        break;
      case 'input':
        if (peer.role === 'controller' && !peer.targetPlayerPeerId) break;
        this._broadcast({ ...msg, peerId: from, targetPlayerPeerId: peer.targetPlayerPeerId || null }, from);
        break;
      case 'start_countdown':
        if (isHost) this._broadcast({ type: 'start_countdown', seconds: Math.max(1, Math.min(10, Number(msg.seconds) || 3)), peerId: from }, from);
        break;
      case 'control_request': {
        if (room.config?.allowControllers === false) {
          this._deliver(from, { type: 'control_rejected', targetPlayerPeerId: msg.targetPlayerPeerId, reason: 'Controles de celular estão desativados nesta sala.' });
          break;
        }
        const target = room.peers.get(cleanId(msg.targetPlayerPeerId));
        if (!target || target.role === 'controller' || target.role === 'spectator') {
          this._deliver(from, { type: 'control_rejected', targetPlayerPeerId: msg.targetPlayerPeerId, reason: 'Jogador não encontrado na sala.' });
          break;
        }
        const bound = Array.from(room.peers.values()).filter(
          (p) => p.role === 'controller' && p.targetPlayerPeerId === target.peerId && p.peerId !== from
        );
        if (bound.length >= 1 && !room.config?.allowMultiControllersPerPlayer) {
          this._deliver(from, { type: 'control_rejected', targetPlayerPeerId: target.peerId, reason: `${target.name} já possui um controle vinculado.` });
          break;
        }
        this._deliver(target.peerId, {
          type: 'control_request',
          requesterPeerId: from,
          requesterName: peer.name,
          targetPlayerPeerId: target.peerId
        });
        break;
      }
      case 'control_response': {
        const req = room.peers.get(cleanId(msg.requesterPeerId));
        if (!req) break;
        if (msg.accepted) {
          req.role = 'controller';
          req.targetPlayerPeerId = from;
          req.ready = true;
          this._deliver(req.peerId, {
            type: 'control_granted',
            targetPlayerPeerId: from,
            targetPlayerName: peer.name,
            room: this._serialize()
          });
          this._broadcastState();
        } else {
          req.targetPlayerPeerId = null;
          this._deliver(req.peerId, {
            type: 'control_rejected',
            targetPlayerPeerId: from,
            reason: cleanStr(msg.reason, `${peer.name} recusou o pedido de controle.`, 80)
          });
        }
        break;
      }
      case 'control_revoke': {
        const ctrl = room.peers.get(cleanId(msg.controllerPeerId));
        if (!ctrl) break;
        if (ctrl.targetPlayerPeerId === from || isHost) {
          ctrl.targetPlayerPeerId = null;
          this._deliver(ctrl.peerId, { type: 'control_revoked', reason: `${peer.name} removeu o vínculo do controle.` });
          this._broadcastState();
        }
        break;
      }
      case 'card_pick':
      case 'spectator_action':
      case 'trivia_answer':
      case 'bet':
      case 'mp_revive':
      case 'round_vote':
      case 'request_start_match':
      case 'pause_request':
      case 'radial_action':
        this._broadcast({ ...msg, peerId: from }, from);
        break;
      case 'start_match':
        if (isHost) {
          room.status = 'playing';
          room.activeMatch = msg;
          this._broadcast(msg, from);
          this._broadcastState();
        }
        break;
      case 'end_match':
        if (isHost) {
          room.status = 'lobby';
          room.activeMatch = null;
          this._broadcast(msg, from);
          this._broadcastState();
        }
        break;
      case 'state_snapshot':
      case 'state_sync':
      case 'trivia_prompt':
      case 'party_prompt':
      case 'card_offer':
        if (isHost) this._broadcast(msg, from);
        break;
      default:
        break;
    }
  }

  _hostJoin(from, msg) {
    const room = this.room;
    const deny = (message) => this._deliver(from, { type: 'error', message });
    if (room.password) {
      const tryPass = cleanStr(msg.password, '', 12);
      if (tryPass !== room.password) return deny('🔒 Senha da sala incorreta ou ausente.');
    }
    const sessionToken = cleanId(msg.sessionToken, '', 48);
    if (room.banned.has(from) || (sessionToken && room.banned.has(sessionToken))) return deny('🚫 Você foi banido desta sala pelo Dono.');
    const existing = room.peers.get(from);
    if (!existing && room.peers.size >= room.maxPlayers) return deny(`Sala cheia (máximo ${room.maxPlayers} jogadores).`);
    const role = ROLES.includes(msg.role) ? msg.role : 'controller';
    if (role === 'spectator' && room.config?.allowSpectators === false) return deny('Espectadores estão desativados nesta sala.');

    const used = new Set(Array.from(room.peers.values()).map((p) => p.slot));
    let slot = existing ? existing.slot : 0;
    if (!existing) while (used.has(slot) && slot < room.maxPlayers) slot++;

    room.peers.set(from, {
      peerId: from,
      name: cleanStr(msg.name || existing?.name, `Dino ${slot + 1}`, 18),
      dinoId: cleanId(msg.dinoId || existing?.dinoId, 'raptor', 28),
      color: cleanColor(msg.color || existing?.color, PALETTE[slot % PALETTE.length]),
      customization: msg.customization && typeof msg.customization === 'object' ? msg.customization : (existing?.customization || null),
      ready: existing?.ready ?? (role === 'controller'),
      role,
      controlMode: ['p1_remote', 'own_dino'].includes(msg.controlMode) ? msg.controlMode : (existing?.controlMode || 'p1_remote'),
      targetPlayerPeerId: existing?.targetPlayerPeerId || null,
      slot,
      pingMs: 0,
      lastSeen: Date.now()
    });
    const curHost = room.peers.get(room.hostPeerId);
    if ((!curHost || curHost.role === 'controller') && (role === 'screen' || role === 'mobile_player')) {
      room.hostPeerId = from;
    }
    this._deliver(from, { type: 'joined', code: room.code, peerId: from, room: this._serialize() });
    this._broadcastState();
    if (room.status === 'playing' && room.activeMatch) this._deliver(from, room.activeMatch);
  }

  disconnect() {
    this._farewellAndReset();
  }

  _farewellAndReset() {
    if (this.roomCode && !this.isHostTab) {
      this._post({ k: 'c2h', from: this.peerId, msg: { type: 'leave_room' } });
    }
    this._leaveLocal(); // host: fecha sala e remove do registro
    this.connected = false;
  }
}
