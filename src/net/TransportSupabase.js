// Transporte Online via Supabase Realtime (Broadcast + Presence) + Auth opcional & Ranking Global.
import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabaseClient() {
  if (_client) return _client;
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('SEU-PROJETO')) return null;
  try {
    _client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 20 } }
    });
    return _client;
  } catch {
    return null;
  }
}

export class TransportSupabase {
  constructor() {
    this.client = getSupabaseClient();
    this.channel = null;
    this.connected = false;
    this.pingMs = 0;
    this.listeners = new Map();
    this.room = null;
    this.selfPeerId = null;
    this.pingTimer = null;
  }

  isConfigured() {
    return !!this.client;
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }

  _emit(event, payload) {
    const set = this.listeners.get(event);
    if (set) for (const fn of set) fn(payload);
  }

  async connectAndJoin(opts) {
    if (!this.client) return { ok: false, message: 'Supabase não configurado no .env' };
    this.disconnect();

    const code = (opts.code || this._randomCode()).toUpperCase();
    const peerId = opts.peerId || `sb_${Math.random().toString(36).slice(2, 9)}`;
    this.selfPeerId = peerId;

    this.room = {
      code,
      hostPeerId: opts.isCreate ? peerId : null,
      isPublic: opts.isPublic !== false,
      mode: opts.mode || 'lan_party',
      mpMode: opts.mpMode || (opts.elimination ? 'elimination' : 'race'),
      status: 'lobby',
      seed: opts.seed || `SB-${code}-${Math.floor(Math.random() * 9999)}`,
      elimination: !!opts.elimination,
      partyMode: opts.partyMode !== false,
      teacherMode: !!opts.teacherMode,
      tvScale: !!opts.tvScale,
      activeMatch: null,
      peers: []
    };

    const channel = this.client.channel(`dino-room-${code}`, {
      config: {
        broadcast: { self: false },
        presence: { key: peerId }
      }
    });
    this.channel = channel;

    let presenceSyncedOnce = false;
    let onAnyRemotePeer = null;

    channel.on('presence', { event: 'sync' }, () => {
      presenceSyncedOnce = true;
      const state = channel.presenceState();
      const palette = ['#58d63a', '#38bdf8', '#ff9a24', '#f43f5e', '#a855f7', '#ffd447', '#14b8a6', '#ec4899'];
      const entries = [];
      let idx = 0;
      for (const key of Object.keys(state)) {
        const arr = state[key];
        const info = arr?.[0];
        if (!info) continue;
        entries.push({
          peerId: key,
          isHost: !!info.isHost,
          name: info.name || `Dino ${idx + 1}`,
          dinoId: info.dinoId || 'trex',
          color: info.color || palette[idx % palette.length],
          ready: !!info.ready,
          role: info.role || 'controller',
          slot: info.slot ?? idx,
          joinedAt: info.joinedAt || 0,
          pingMs: info.pingMs || 0
        });
        idx++;
      }
      entries.sort((a, b) => (a.isHost === b.isHost ? a.joinedAt - b.joinedAt : (a.isHost ? -1 : 1)));
      entries.forEach((p, i) => { p.slot = i; });
      this.room.peers = entries.slice(0, 8);

      // Identifica host real por isHost antes de fallback/migração
      const explicitHost = this.room.peers.find((p) => p.isHost);
      const prevHost = this.room.hostPeerId;
      const hostAlive = prevHost && this.room.peers.some((p) => p.peerId === prevHost);

      if (explicitHost) {
        this.room.hostPeerId = explicitHost.peerId;
      } else if (!hostAlive && this.room.peers.length > 0 && (opts.isCreate || this.room.peers.length > 1 || presenceSyncedOnce)) {
        // Só assume host se o anterior realmente caiu (ou houver mais peers) — nunca quando guest chega em sala vazia
        const nonSelf = this.room.peers.find((p) => p.peerId !== this.selfPeerId && p.role === 'screen')
          || this.room.peers.find((p) => p.peerId !== this.selfPeerId)
          || (opts.isCreate ? this.room.peers[0] : null);
        if (nonSelf) {
          this.room.hostPeerId = nonSelf.peerId;
          if (prevHost && prevHost !== nonSelf.peerId) {
            this._emit('message', {
              type: 'host_migrated',
              hostPeerId: nonSelf.peerId,
              hostName: nonSelf.name
            });
          }
        }
      }

      if (this.room.peers.some((p) => p.peerId !== this.selfPeerId)) {
        onAnyRemotePeer?.();
      }

      if (this.room.hostPeerId === this.selfPeerId) {
        this._broadcastRoomPatch();
        this._syncRoomDb(true).catch(() => {});
      }

      this._emit('message', { type: 'room_state', room: this.room });
    });

    channel.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (!payload) return;
      onAnyRemotePeer?.();
      if (payload.type === 'ping') {
        this.send({ type: 'pong', ts: payload.ts, targetPeer: payload.peerId });
        return;
      }
      if (payload.type === 'pong' && (!payload.targetPeer || payload.targetPeer === this.selfPeerId)) {
        this.pingMs = Math.max(1, Math.round(performance.now() - payload.ts));
        this._emit('pong', this.pingMs);
        return;
      }
      if (payload.type === 'request_room_sync') {
        if (this.room.hostPeerId === this.selfPeerId) {
          this._broadcastRoomPatch();
          if (this.room.status === 'playing' && this.room.activeMatch) {
            this.channel?.send({
              type: 'broadcast',
              event: 'msg',
              payload: { ...this.room.activeMatch, peerId: this.selfPeerId }
            }).catch(() => {});
          }
        }
        return;
      }
      if (payload.type === 'player_meta_hint' && payload.peerId) {
        const peer = this.room.peers.find((p) => p.peerId === payload.peerId);
        if (peer && payload.meta) {
          Object.assign(peer, payload.meta);
          this._emit('message', { type: 'room_state', room: this.room });
        }
        return;
      }
      if (payload.type === 'update_room') {
        Object.assign(this.room, payload.patch || {});
        this._emit('message', { type: 'room_state', room: this.room });
        return;
      }
      if (payload.type === 'start_match') {
        this.room.status = 'playing';
        this.room.activeMatch = payload;
      } else if (payload.type === 'end_match') {
        this.room.status = 'lobby';
        this.room.activeMatch = null;
      }
      this._emit('message', payload);
    });

    return new Promise((resolve) => {
      let settled = false;
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !settled) {
          this.connected = true;
          this.myMeta = {
            isHost: !!opts.isCreate,
            name: String(opts.name || 'Jogador').slice(0, 18),
            dinoId: opts.dinoId || 'trex',
            color: opts.color || '#58d63a',
            ready: !!opts.isCreate,
            role: opts.role || 'controller',
            joinedAt: Date.now(),
            pingMs: 0
          };
          await channel.track(this.myMeta);
          this._startPingLoop();

          if (!opts.isCreate) {
            // Verifica se a sala existe (outro peer em Presence ou registro ativo no dino_rooms)
            this.send({ type: 'request_room_sync' });
            let foundRemote = this.room.peers.some((p) => p.peerId !== peerId);
            if (!foundRemote) {
              const cutoff = new Date(Date.now() - 360 * 60 * 1000).toISOString();
              const [{ data: dbRow }] = await Promise.all([
                this.client.from('dino_rooms').select('code, status, mode_id').eq('code', code).gte('updated_at', cutoff).maybeSingle(),
                new Promise((r) => {
                  let done = false;
                  const finish = () => { if (!done) { done = true; r(); } };
                  onAnyRemotePeer = finish;
                  setTimeout(finish, 1100);
                })
              ]);
              foundRemote = this.room.peers.some((p) => p.peerId !== peerId) || !!dbRow;
            }
            if (!foundRemote) {
              settled = true;
              this.disconnect();
              resolve({ ok: false, message: `Sala "${code}" não encontrada ou já encerrada (confirme se o Host criou no modo Online).` });
              return;
            }
            this.send({ type: 'request_room_sync' });
          }

          settled = true;
          this._emit('connected', true);
          this._emit('message', { type: 'joined', code, peerId, room: this.room });
          resolve({ ok: true, code, peerId });
        } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !settled) {
          settled = true;
          this.connected = false;
          resolve({ ok: false, message: `Falha ao conectar canal Supabase (${status}).` });
        }
      });
    });
  }

  _broadcastRoomPatch() {
    if (!this.channel || !this.connected || !this.room) return;
    this.channel.send({
      type: 'broadcast',
      event: 'msg',
      payload: {
        type: 'update_room',
        patch: {
          hostPeerId: this.room.hostPeerId,
          status: this.room.status,
          seed: this.room.seed,
          mpMode: this.room.mpMode || (this.room.elimination ? 'elimination' : 'race'),
          elimination: this.room.elimination,
          partyMode: this.room.partyMode,
          teacherMode: this.room.teacherMode,
          tvScale: this.room.tvScale,
          activeMatch: this.room.activeMatch || null
        }
      }
    }).catch(() => {});
  }

  _randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  _startPingLoop() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping', ts: performance.now(), peerId: this.selfPeerId });
    }, 3000);
  }

  send(payload) {
    if (!this.channel || !this.connected) return false;
    if (payload.type === 'player_meta' && this.myMeta) {
      Object.assign(this.myMeta, {
        name: payload.name ?? this.myMeta.name,
        dinoId: payload.dinoId ?? this.myMeta.dinoId,
        color: payload.color ?? this.myMeta.color,
        role: payload.role ?? this.myMeta.role,
        ready: payload.ready ?? this.myMeta.ready,
        pingMs: this.pingMs
      });
      const localPeer = this.room?.peers?.find((p) => p.peerId === this.selfPeerId);
      if (localPeer) {
        Object.assign(localPeer, {
          name: this.myMeta.name,
          dinoId: this.myMeta.dinoId,
          color: this.myMeta.color,
          role: this.myMeta.role,
          ready: this.myMeta.ready
        });
        this._emit('message', { type: 'room_state', room: this.room });
      }
      this.channel.send({
        type: 'broadcast',
        event: 'msg',
        payload: { type: 'player_meta_hint', peerId: this.selfPeerId, meta: { ...this.myMeta } }
      }).catch(() => {});
      this.channel.track(this.myMeta).catch(() => {});
      return true;
    }
    if (payload.type === 'update_room' && this.room) {
      const { type, ...patch } = payload;
      Object.assign(this.room, patch);
      this.channel.send({ type: 'broadcast', event: 'msg', payload: { type: 'update_room', patch } }).catch(() => {});
      if (this.room.hostPeerId === this.selfPeerId) {
        this._syncRoomDb(true).catch(() => {});
      }
      return true;
    }
    this.channel.send({
      type: 'broadcast',
      event: 'msg',
      payload: { ...payload, peerId: this.selfPeerId }
    }).catch(() => {});
    return true;
  }

  async _syncRoomDb(onlyIfHost = false) {
    if (!this.client || !this.room) return;
    if (onlyIfHost && this.room.hostPeerId !== this.selfPeerId) return;
    const host = this.room.peers.find((p) => p.peerId === this.room.hostPeerId);
    await this.client.from('dino_rooms').upsert({
      code: this.room.code,
      host_name: host?.name || 'Host',
      mode_id: this.room.mode,
      is_public: this.room.isPublic,
      player_count: Math.max(1, this.room.peers.length),
      status: this.room.status || 'lobby',
      updated_at: new Date().toISOString()
    });
  }

  async listPublicRooms() {
    if (!this.client) return [];
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data, error } = await this.client
      .from('dino_rooms')
      .select('code, host_name, mode_id, player_count, status')
      .eq('is_public', true)
      .gte('updated_at', cutoff)
      .order('updated_at', { ascending: false })
      .limit(12);
    if (error || !data) return [];
    return data.map((r) => ({
      code: r.code,
      hostName: r.host_name,
      mode: r.mode_id,
      playerCount: r.player_count,
      maxPlayers: 8,
      status: r.status
    }));
  }

  async fetchGlobalLeaderboard() {
    if (!this.client) return { ok: false, rows: [], reason: 'Supabase offline (.env ausente).' };
    const { data, error } = await this.client
      .from('dino_leaderboard')
      .select('player_name, dino_id, mode_id, score, distance, eggs, created_at')
      .order('score', { ascending: false })
      .limit(20);
    if (error) return { ok: false, rows: [], reason: error.message };
    return { ok: true, rows: data || [] };
  }

  async submitGlobalScore({ playerName, dinoId, modeId, score, distance, eggs }) {
    if (!this.client) return false;
    const cleanScore = Math.min(250000, Math.max(0, Math.floor(score)));
    const { error } = await this.client.from('dino_leaderboard').insert({
      player_name: String(playerName || 'Dino').trim().slice(0, 24) || 'Dino',
      dino_id: dinoId || 'trex',
      mode_id: modeId || 'solo',
      score: cleanScore,
      distance: Math.max(0, Math.floor(distance)),
      eggs: Math.max(0, Math.floor(eggs))
    });
    return !error;
  }

  async signInWithEmailOtp(email) {
    if (!this.client) return { ok: false, message: 'Supabase não configurado.' };
    const { error } = await this.client.auth.signInWithOtp({ email });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Link mágico enviado para seu e-mail!' };
  }

  async getCurrentUser() {
    if (!this.client) return null;
    const { data } = await this.client.auth.getUser();
    return data?.user || null;
  }

  disconnect() {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
    if (this.channel) {
      this.client?.removeChannel(this.channel);
      this.channel = null;
    }
    this.connected = false;
  }
}
