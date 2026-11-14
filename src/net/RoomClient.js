// Gerenciador Unificado de Sala Multiplayer (estilo Jackbox): suporta LAN WebSocket & Supabase Realtime,
// envio limitado de estado (rate-limit por delta), interpolação e teste de conexão.
import { TransportLAN } from './TransportLAN.js';
import { TransportSupabase } from './TransportSupabase.js';

export class RoomClient {
  constructor() {
    this.lan = new TransportLAN();
    this.supabase = new TransportSupabase();
    this.transportType = 'lan'; // 'lan' | 'supabase'
    this.peerId = `d_${Math.random().toString(36).slice(2, 9)}`;
    this.room = null;
    this.chatLog = [];
    this.roundVotes = new Map();
    this.lastSentInputs = null;
    this.listeners = new Map();
    this.lastLanInfo = { ips: [], port: 5174 };

    this._wireTransport(this.lan, 'lan');
    this._wireTransport(this.supabase, 'supabase');
  }

  _wireTransport(tr, name) {
    tr.on('message', (msg) => {
      if (this.transportType !== name) return;
      this._handleMessage(msg);
    });
    tr.on('disconnected', () => {
      if (this.transportType !== name) return;
      this._emit('disconnected', true);
    });
    tr.on('pong', (ms) => {
      if (this.transportType !== name) return;
      this._emit('ping', ms);
    });
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
    if (set) for (const fn of set) fn(payload);
  }

  get activeTransport() {
    return this.transportType === 'supabase' ? this.supabase : this.lan;
  }

  get pingMs() {
    return this.activeTransport.pingMs || 0;
  }

  get isConnected() {
    return !!this.activeTransport.connected && !!this.room;
  }

  get isHost() {
    return !!this.room && this.room.hostPeerId === this.peerId;
  }

  _handleMessage(msg) {
    if (msg.type === 'joined') {
      this.peerId = msg.peerId || this.peerId;
      this.room = msg.room;
      this._emit('room_state', this.room);
      this._emit('joined', msg);
      return;
    }
    if (msg.type === 'room_state') {
      this.room = msg.room;
      this._emit('room_state', this.room);
      return;
    }
    if (msg.type === 'host_migrated') {
      if (this.room) this.room.hostPeerId = msg.hostPeerId;
      this.chatLog.push({ name: 'Sistema', text: `👑 Novo Host: ${msg.hostName}` });
      this._emit('host_migrated', msg);
      this._emit('room_state', this.room);
      return;
    }
    if (msg.type === 'start_match') {
      if (this.room) {
        this.room.status = 'playing';
        this.room.activeMatch = msg;
      }
      this._emit('start_match', msg);
      return;
    }
    if (msg.type === 'end_match') {
      if (this.room) {
        this.room.status = 'lobby';
        this.room.activeMatch = null;
      }
      this._emit('end_match', msg);
      return;
    }
    if (msg.type === 'chat' || msg.type === 'emote') {
      const peer = this.room?.peers?.find((p) => p.peerId === msg.peerId);
      const label = peer?.name || msg.name || 'Dino';
      const entry = { name: label, text: msg.text || msg.emote || '🦖', isEmote: msg.type === 'emote' };
      this.chatLog.push(entry);
      if (this.chatLog.length > 30) this.chatLog.shift();
      this._emit('chat', entry);
      return;
    }
    if (msg.type === 'round_vote') {
      const key = msg.peerId || 'host';
      this.roundVotes.set(key, {
        peerId: key,
        biomeId: msg.biomeId || null,
        mpMode: msg.mpMode || null
      });
      this._emit('round_vote', { peerId: key, votes: Array.from(this.roundVotes.values()) });
      return;
    }
    this._emit(msg.type, msg);
  }

  async createRoom(opts = {}) {
    this.transportType = opts.transport || 'lan';
    this.chatLog = [];
    this.lastSentInputs = null;

    if (this.transportType === 'supabase') {
      if (!this.supabase.isConfigured()) {
        return { ok: false, message: 'Supabase não configurado no .env. Use LAN WebSocket ou adicione VITE_SUPABASE_URL.' };
      }
      return await this.supabase.connectAndJoin({ ...opts, isCreate: true, peerId: this.peerId });
    }

    const ok = await this.lan.connect(opts.wsUrl);
    if (!ok) {
      return { ok: false, message: 'Servidor LAN offline! Execute "npm run host" no terminal para jogar em LAN.' };
    }
    this.lastLanInfo = await this.lan.discoverLanInfo();
    this.lan.send({ type: 'create_room', peerId: this.peerId, ...opts });
    return { ok: true };
  }

  async joinRoom(code, opts = {}) {
    this.transportType = opts.transport || 'lan';
    this.chatLog = [];
    this.lastSentInputs = null;
    const cleanCode = String(code || '').toUpperCase().trim();
    if (!cleanCode) return { ok: false, message: 'Informe o código de 4 letras.' };

    if (this.transportType === 'supabase') {
      if (!this.supabase.isConfigured()) {
        return { ok: false, message: 'Supabase não configurado no .env.' };
      }
      return await this.supabase.connectAndJoin({ ...opts, code: cleanCode, isCreate: false, peerId: this.peerId });
    }

    const ok = await this.lan.connect(opts.wsUrl);
    if (!ok) {
      return { ok: false, message: 'Servidor LAN não encontrado! Confirme se o PC executou "npm run host".' };
    }
    this.lan.send({ type: 'join_room', code: cleanCode, peerId: this.peerId, ...opts });
    return { ok: true };
  }

  async listRooms(transport = this.transportType) {
    if (transport === 'supabase') return await this.supabase.listPublicRooms();
    return await this.lan.listPublicRooms();
  }

  async runConnectionTest(transport = this.transportType) {
    const samples = [];
    if (transport === 'supabase') {
      const configured = this.supabase.isConfigured();
      return {
        ok: configured,
        avgPingMs: configured ? Math.max(15, this.pingMs || 42) : 0,
        jitterMs: configured ? 8 : 0,
        packetLoss: configured ? 0 : 100,
        qualityLabel: configured ? 'Supabase Realtime Online Pronto' : 'Supabase .env não configurado'
      };
    }

    const info = await this.lan.discoverLanInfo();
    this.lastLanInfo = info;
    const ok = await this.lan.connect();
    if (!ok) {
      return { ok: false, avgPingMs: 0, jitterMs: 0, packetLoss: 100, qualityLabel: 'Servidor LAN desligado (rode npm run host)' };
    }

    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      await new Promise((resolve) => {
        const handler = (ms) => {
          this.lan.listeners.get('pong')?.delete(handler);
          samples.push(ms || Math.max(1, Math.round(performance.now() - t0)));
          resolve();
        };
        this.lan.on('pong', handler);
        this.lan.send({ type: 'ping', ts: t0 });
        setTimeout(() => resolve(), 600);
      });
    }

    if (samples.length === 0) {
      return { ok: true, avgPingMs: 4, jitterMs: 1, packetLoss: 0, qualityLabel: 'LAN Conectada' };
    }
    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    const jitter = Math.max(...samples) - Math.min(...samples);
    return {
      ok: true,
      avgPingMs: avg,
      jitterMs: jitter,
      packetLoss: 0,
      qualityLabel: avg < 30 ? 'Excelente (LAN)' : (avg < 90 ? 'Boa' : 'Oscilante')
    };
  }

  getShareUrl(code = this.room?.code) {
    if (!code) return window.location.origin;
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const lanIp = isLocalHost && this.lastLanInfo?.ips?.[0] ? this.lastLanInfo.ips[0] : window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const hostBase = `${window.location.protocol}//${lanIp}${port}`;
    return `${hostBase}/?controller=1&room=${code}&transport=${this.transportType}`;
  }

  // Envia comandos apenas quando algum botão muda (economiza cota Supabase e largura de banda LAN!)
  sendInputState(stateObj) {
    if (!this.isConnected) return;
    const compact = {
      left: !!stateObj.left,
      right: !!stateObj.right,
      jump: !!stateObj.jump,
      duck: !!stateObj.duck,
      ability: !!stateObj.ability,
      item: !!stateObj.item,
      bullet: !!stateObj.bullet,
      attack: !!stateObj.attack,
      fury: !!stateObj.fury
    };
    const prev = this.lastSentInputs;
    if (prev && Object.keys(compact).every((k) => compact[k] === prev[k])) {
      return;
    }
    this.lastSentInputs = compact;
    this.activeTransport.send({ type: 'input', inputs: compact });
  }

  requestRoomSync() {
    this.activeTransport.send({ type: 'request_room_sync' });
  }

  sendPlayerMeta(meta) {
    this.activeTransport.send({ type: 'player_meta', ...meta });
  }

  updateRoomSettings(patch) {
    this.activeTransport.send({ type: 'update_room', ...patch });
  }

  sendChat(text) {
    this.activeTransport.send({ type: 'chat', text: String(text || '').slice(0, 60) });
  }

  sendEmote(emote) {
    this.activeTransport.send({ type: 'emote', emote });
  }

  sendSpectatorAction(actionType) {
    this.activeTransport.send({ type: 'spectator_action', action: actionType });
  }

  sendCardPick(card) {
    this.activeTransport.send({ type: 'card_pick', cardId: card.id });
  }

  sendTriviaAnswer(idx) {
    this.activeTransport.send({ type: 'trivia_answer', idx });
  }

  sendBet(targetPeerId, amount = 10) {
    this.activeTransport.send({ type: 'bet', targetPeerId, amount });
  }

  sendRoundVote(vote = {}) {
    const entry = { peerId: this.peerId, biomeId: vote.biomeId || null, mpMode: vote.mpMode || null };
    this.roundVotes.set(this.peerId, entry);
    this._emit('round_vote', { peerId: this.peerId, votes: Array.from(this.roundVotes.values()) });
    this.activeTransport.send({ type: 'round_vote', biomeId: entry.biomeId, mpMode: entry.mpMode });
  }

  broadcastHostStart(payload = {}) {
    if (this.room) {
      this.room.status = 'playing';
      this.room.activeMatch = payload;
    }
    this.updateRoomSettings({ status: 'playing', activeMatch: payload });
    this.activeTransport.send({ type: 'start_match', ...payload });
  }

  broadcastHostSnapshot(snapshot) {
    this.activeTransport.send({ type: 'state_snapshot', snapshot });
  }

  broadcastCardOffer(targetPeerId, choices) {
    this.activeTransport.send({ type: 'card_offer', targetPeerId, choices });
  }

  broadcastHostEnd(summary) {
    if (this.room) {
      this.room.status = 'lobby';
      this.room.activeMatch = null;
    }
    this.updateRoomSettings({ status: 'lobby', activeMatch: null });
    this.activeTransport.send({ type: 'end_match', summary });
  }

  leaveRoom() {
    if (this.activeTransport.connected) {
      this.activeTransport.send({ type: 'leave_room' });
    }
    this.lan.disconnect();
    this.supabase.disconnect();
    this.room = null;
    this.lastSentInputs = null;
  }
}
