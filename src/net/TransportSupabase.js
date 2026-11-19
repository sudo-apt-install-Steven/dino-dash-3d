// Transporte Online via Supabase Realtime (Broadcast + Presence) + Auth opcional & Ranking Global.
import { createClient } from '@supabase/supabase-js';
import { syncAuthoritativeRoom } from '../security/EdgeClient.js';
import { sanitizeNickname, sanitizeRoomCode, sanitizeHexColor } from '../security/Sanitize.js';

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
    this.hostSecret = null;
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
      roomName: String(opts.roomName || `Sala ${code}`).slice(0, 28),
      maxPlayers: Math.max(2, Math.min(8, Number(opts.maxPlayers) || 8)),
      hasPassword: !!opts.password,
      isPublic: opts.isPublic !== false,
      mode: opts.mode || 'lan_party',
      mpMode: opts.mpMode || (opts.elimination ? 'elimination' : 'race'),
      status: 'lobby',
      seed: opts.seed || `SB-${code}-${Math.floor(Math.random() * 9999)}`,
      elimination: !!opts.elimination,
      partyMode: opts.partyMode !== false,
      teacherMode: !!opts.teacherMode,
      tvScale: !!opts.tvScale,
      config: {
        allowVoting: opts.config?.allowVoting !== false,
        difficulty: opts.config?.difficulty || 'normal',
        biomeId: opts.config?.biomeId || 'random_portal',
        allowRevive: opts.config?.allowRevive !== false,
        allowPowerups: opts.config?.allowPowerups !== false,
        multiHabitats: opts.config?.multiHabitats !== false,
        allowHybrids: opts.config?.allowHybrids !== false,
        uniqueDinos: !!opts.config?.uniqueDinos,
        allowControllers: opts.config?.allowControllers !== false,
        allowMultiControllersPerPlayer: !!opts.config?.allowMultiControllersPerPlayer,
        allowSpectators: opts.config?.allowSpectators !== false,
        allowEvents: opts.config?.allowEvents !== false,
        allowBosses: opts.config?.allowBosses !== false,
        allowHandicap: !!opts.config?.allowHandicap,
        pausePolicy: opts.config?.pausePolicy || 'host_only'
      },
      votes: {},
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
          name: sanitizeNickname(info.name || `Dino ${idx + 1}`, `Dino ${idx + 1}`, 18),
          dinoId: String(info.dinoId || 'trex').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28) || 'trex',
          color: sanitizeHexColor(info.color, palette[idx % palette.length]),
          ready: !!info.ready,
          role: ['screen', 'controller', 'mobile_player', 'spectator'].includes(info.role) ? info.role : 'controller',
          controlMode: ['p1_remote', 'own_dino'].includes(info.controlMode) ? info.controlMode : 'p1_remote',
          targetPlayerPeerId: info.targetPlayerPeerId || null,
          slot: info.slot ?? idx,
          joinedAt: info.joinedAt || 0,
          pingMs: Math.max(0, Math.min(9999, Number(info.pingMs || 0)))
        });
        idx++;
      }
      // Garante que o próprio peer continue na lista durante micro-atualizações de channel.track()
      if (this.selfPeerId && this.myMeta && !entries.some((e) => e.peerId === this.selfPeerId)) {
        entries.push({
          peerId: this.selfPeerId,
          isHost: !!this.myMeta.isHost,
          name: sanitizeNickname(this.myMeta.name || 'Jogador', 'Jogador', 18),
          dinoId: String(this.myMeta.dinoId || 'trex').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28) || 'trex',
          color: sanitizeHexColor(this.myMeta.color, palette[0]),
          ready: !!this.myMeta.ready,
          role: ['screen', 'controller', 'mobile_player', 'spectator'].includes(this.myMeta.role) ? this.myMeta.role : 'controller',
          controlMode: ['p1_remote', 'own_dino'].includes(this.myMeta.controlMode) ? this.myMeta.controlMode : 'p1_remote',
          slot: 0,
          joinedAt: this.myMeta.joinedAt || 0,
          pingMs: this.pingMs || 0
        });
      }
      entries.sort((a, b) => {
        const aScreen = a.role === 'screen' || a.role === 'mobile_player';
        const bScreen = b.role === 'screen' || b.role === 'mobile_player';
        if (aScreen !== bScreen) return aScreen ? -1 : 1;
        return a.isHost === b.isHost ? a.joinedAt - b.joinedAt : (a.isHost ? -1 : 1);
      });
      entries.forEach((p, i) => { p.slot = i; });
      this.room.peers = entries.slice(0, 8);

      // Identifica host real: dispositivos Telão/Jogador 3D ('screen' / 'mobile_player') SEMPRE têm prioridade sobre 'controller'
      const screenPeers = this.room.peers.filter((p) => p.role === 'screen' || p.role === 'mobile_player');
      const explicitScreenHost = screenPeers.find((p) => p.isHost);
      const explicitAnyHost = this.room.peers.find((p) => p.isHost);
      const prevHost = this.room.hostPeerId;
      const prevHostPeer = prevHost ? this.room.peers.find((p) => p.peerId === prevHost) : null;
      const hostAlive = !!prevHostPeer;
      const hostIsControllerWithScreenAvailable = prevHostPeer?.role === 'controller' && screenPeers.length > 0;

      if (explicitScreenHost) {
        this.room.hostPeerId = explicitScreenHost.peerId;
      } else if (screenPeers.length > 0 && (!hostAlive || hostIsControllerWithScreenAvailable)) {
        const chosenScreen = screenPeers.find((p) => p.role === 'screen') || screenPeers[0];
        this.room.hostPeerId = chosenScreen.peerId;
        if (chosenScreen.peerId === this.selfPeerId && this.myMeta && !this.myMeta.isHost) {
          this.myMeta.isHost = true;
          this.channel?.track(this.myMeta).catch(() => {});
        }
        if (prevHost && prevHost !== chosenScreen.peerId) {
          this._emit('message', {
            type: 'host_migrated',
            hostPeerId: chosenScreen.peerId,
            hostName: chosenScreen.name
          });
        }
      } else if (explicitAnyHost && screenPeers.length === 0) {
        this.room.hostPeerId = explicitAnyHost.peerId;
      } else if (!hostAlive && this.room.peers.length > 0 && (opts.isCreate || this.room.peers.length > 1 || presenceSyncedOnce)) {
        const nonSelf = this.room.peers.find((p) => p.peerId !== this.selfPeerId && (p.role === 'screen' || p.role === 'mobile_player'))
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
        const patch = payload.patch || {};
        if (patch.config && typeof patch.config === 'object') {
          this.room.config = { ...(this.room.config || {}), ...patch.config };
        }
        const { config: _cfg, hostPeerId: patchHostId, ...rest } = patch;
        Object.assign(this.room, rest);
        if (patchHostId) {
          const patchHostPeer = this.room.peers.find((p) => p.peerId === patchHostId);
          const hasScreenPeer = this.room.peers.some((p) => p.role === 'screen' || p.role === 'mobile_player');
          if (!hasScreenPeer || (patchHostPeer && patchHostPeer.role !== 'controller')) {
            this.room.hostPeerId = patchHostId;
          }
        }
        this._emit('message', { type: 'room_state', room: this.room });
        return;
      }
      if (payload.type === 'room_vote' && payload.peerId) {
        if (this.room.config?.allowVoting !== false) {
          this.room.votes = this.room.votes || {};
          this.room.votes[payload.peerId] = {
            difficulty: payload.difficulty || null,
            biomeId: payload.biomeId || null,
            mpMode: payload.mpMode || null
          };
          this._emit('message', { type: 'room_state', room: this.room });
        }
        return;
      }
      if (payload.type === 'control_response' && payload.requesterPeerId === this.selfPeerId) {
        if (payload.accepted) {
          if (this.myMeta) {
            this.myMeta.targetPlayerPeerId = payload.targetPlayerPeerId || payload.peerId;
            this.myMeta.role = 'controller';
            this.myMeta.ready = true;
            this.channel?.track(this.myMeta).catch(() => {});
          }
          const targetPeer = this.room.peers.find((p) => p.peerId === (payload.targetPlayerPeerId || payload.peerId));
          this._emit('message', {
            type: 'control_granted',
            targetPlayerPeerId: payload.targetPlayerPeerId || payload.peerId,
            targetPlayerName: targetPeer?.name || 'Jogador',
            room: this.room
          });
        } else {
          if (this.myMeta) {
            this.myMeta.targetPlayerPeerId = null;
            this.channel?.track(this.myMeta).catch(() => {});
          }
          this._emit('message', {
            type: 'control_rejected',
            targetPlayerPeerId: payload.targetPlayerPeerId || payload.peerId,
            reason: payload.reason || 'Pedido de controle recusado.'
          });
        }
        return;
      }
      if (payload.type === 'control_revoke' && payload.controllerPeerId === this.selfPeerId) {
        if (this.myMeta) {
          this.myMeta.targetPlayerPeerId = null;
          this.channel?.track(this.myMeta).catch(() => {});
        }
        this._emit('message', {
          type: 'control_revoked',
          reason: 'O jogador removeu o vínculo do controle.'
        });
        return;
      }
      if (payload.type === 'kick_peer') {
        const senderIsHost = payload.peerId === this.room.hostPeerId;
        if (!senderIsHost) return;
        if (payload.targetPeerId === this.selfPeerId) {
          this.disconnect();
          this._emit('message', {
            type: 'kicked',
            banned: !!payload.ban,
            reason: payload.ban ? '🚫 Você foi banido desta sala pelo Dono.' : '👢 Você foi removido da sala pelo Dono.'
          });
        } else if (payload.ban) {
          this.room.bannedIds = this.room.bannedIds || new Set();
          this.room.bannedIds.add(payload.targetPeerId);
        }
        return;
      }
      if (payload.type === 'transfer_host') {
        if (payload.peerId !== this.room.hostPeerId) return;
        this.room.hostPeerId = payload.targetPeerId;
        if (this.myMeta) {
          this.myMeta.isHost = payload.targetPeerId === this.selfPeerId;
          this.channel?.track(this.myMeta).catch(() => {});
        }
        this._emit('message', { type: 'host_migrated', hostPeerId: payload.targetPeerId, hostName: this.room.peers.find((p) => p.peerId === payload.targetPeerId)?.name || 'Jogador' });
        this._emit('message', { type: 'room_state', room: this.room });
        return;
      }
      if (payload.type === 'report_player') {
        if (this.room.hostPeerId !== this.selfPeerId) return;
        const reporter = this.room.peers.find((p) => p.peerId === payload.peerId);
        const target = this.room.peers.find((p) => p.peerId === payload.targetPeerId);
        this._emit('message', {
          type: 'player_reported',
          reporterName: reporter?.name || 'Jogador',
          targetPeerId: payload.targetPeerId,
          targetName: target?.name || 'Jogador',
          reason: String(payload.reason || '').slice(0, 60)
        });
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
            isHost: !!opts.isCreate && opts.role !== 'controller',
            name: String(opts.name || 'Jogador').slice(0, 18),
            dinoId: opts.dinoId || 'trex',
            color: opts.color || '#58d63a',
            ready: !!opts.isCreate || opts.ready !== false,
            role: opts.role || 'controller',
            controlMode: opts.controlMode || 'p1_remote',
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
              const [{ data: lookupRes }] = await Promise.all([
                syncAuthoritativeRoom(this.client, { action: 'lookup', code }).then((r) => ({ data: r?.ok && r.exists ? r.room : null })),
                new Promise((r) => {
                  let done = false;
                  const finish = () => { if (!done) { done = true; r(); } };
                  onAnyRemotePeer = finish;
                  setTimeout(finish, 1100);
                })
              ]);
              foundRemote = this.room.peers.some((p) => p.peerId !== peerId) || !!lookupRes;
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
          roomName: this.room.roomName || `Sala ${this.room.code}`,
          maxPlayers: Number(this.room.maxPlayers) || 8,
          hasPassword: !!this.room.hasPassword,
          status: this.room.status,
          seed: this.room.seed,
          mpMode: this.room.mpMode || (this.room.elimination ? 'elimination' : 'race'),
          elimination: this.room.elimination,
          partyMode: this.room.partyMode,
          teacherMode: this.room.teacherMode,
          tvScale: this.room.tvScale,
          config: this.room.config || {},
          votes: this.room.votes || {},
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
      const nextRole = payload.role ?? this.myMeta.role;
      const hasOtherScreen = this.room?.peers?.some((p) => p.peerId !== this.selfPeerId && (p.role === 'screen' || p.role === 'mobile_player'));
      const nextIsHost = nextRole === 'controller' && hasOtherScreen
        ? false
        : (payload.isHost ?? this.myMeta.isHost);
      Object.assign(this.myMeta, {
        isHost: nextIsHost,
        name: payload.name ?? this.myMeta.name,
        dinoId: payload.dinoId ?? this.myMeta.dinoId,
        color: payload.color ?? this.myMeta.color,
        role: nextRole,
        controlMode: payload.controlMode ?? this.myMeta.controlMode ?? 'p1_remote',
        ready: payload.ready ?? this.myMeta.ready,
        pingMs: this.pingMs
      });
      const localPeer = this.room?.peers?.find((p) => p.peerId === this.selfPeerId);
      if (localPeer) {
        Object.assign(localPeer, {
          isHost: this.myMeta.isHost,
          name: this.myMeta.name,
          dinoId: this.myMeta.dinoId,
          color: this.myMeta.color,
          role: this.myMeta.role,
          controlMode: this.myMeta.controlMode,
          ready: this.myMeta.ready
        });
        if (this.myMeta.role === 'controller' && this.room.hostPeerId === this.selfPeerId) {
          const otherScreen = this.room.peers.find((p) => p.peerId !== this.selfPeerId && (p.role === 'screen' || p.role === 'mobile_player'));
          if (otherScreen) this.room.hostPeerId = otherScreen.peerId;
        }
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
      if (patch.config && typeof patch.config === 'object') {
        this.room.config = { ...(this.room.config || {}), ...patch.config };
      }
      const { config: _cfg, ...rest } = patch;
      Object.assign(this.room, rest);
      const netPatch = { ...patch, config: this.room.config };
      this.channel.send({ type: 'broadcast', event: 'msg', payload: { type: 'update_room', patch: netPatch } }).catch(() => {});
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
    const code = sanitizeRoomCode(this.room.code);
    if (!code) return;
    const res = await syncAuthoritativeRoom(this.client, {
      action: 'upsert',
      code,
      hostName: sanitizeNickname(host?.name || 'Host', 'Host', 24),
      modeId: String(this.room.mode || 'lan_party').slice(0, 24),
      isPublic: !!this.room.isPublic,
      playerCount: Math.max(1, Math.min(8, this.room.peers.length)),
      status: this.room.status || 'lobby',
      hostSecret: this.hostSecret || ''
    });
    if (res?.ok && res.hostSecret) {
      this.hostSecret = res.hostSecret;
    }
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

  async submitGlobalScore() {
    // Escrita direta no ranking foi desativada por segurança (use finishAuthoritativeRun / finish-run).
    return false;
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
    if (this.client && this.room && this.room.hostPeerId === this.selfPeerId && this.hostSecret) {
      const code = sanitizeRoomCode(this.room.code);
      const secret = this.hostSecret;
      if (code && secret) {
        syncAuthoritativeRoom(this.client, { action: 'delete', code, hostSecret: secret }).catch(() => {});
      }
    }
    this.hostSecret = null;
    if (this.channel) {
      this.client?.removeChannel(this.channel);
      this.channel = null;
    }
    this.connected = false;
  }
}
