// Servidor WebSocket LAN local embutido (`npm run host`) para DINO DASH 3D.
// Suporta salas de 4 letras (públicas/privadas), 2–8 jogadores, ping, chat,
// controles Jackbox, migração automática de host e expiração de salas inativas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const PORT = Number(process.env.LAN_PORT || process.env.PORT || 5174);
const MAX_PLAYERS = 8;
const ROOM_TTL_MS = 15 * 60 * 1000;
const WS_MAX_PAYLOAD_BYTES = 16 * 1024;
const WS_RATE_LIMIT_PER_SEC = 45;
const WS_FLOOD_CLOSE_PER_SEC = 160;

const BLOCKED_NICK_PATTERNS = [
  /p[u\*]t[ao]/i, /c[a@]r[a@]lh/i, /f[o0]d[ae]/i, /p[o0]rr[a@]/i,
  /b[u\*]c[e3]t/i, /m[e3]rd[a@]/i, /v[i1][a@]d[o0]/i, /f[u\*]ck/i,
  /sh[i1]t/i, /b[i1]tch/i, /n[i1]gg/i, /r[a@]p[e3]/i
];

function cleanStr(value, fallback = '', maxLen = 32, filterProfanity = false) {
  const s = String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>`"'\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  if (!s) return fallback;
  if (filterProfanity && BLOCKED_NICK_PATTERNS.some((rx) => rx.test(s))) {
    return fallback;
  }
  return s;
}

function cleanRoomCode(value) {
  const s = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{4}$/.test(s) ? s : '';
}

function cleanHexColor(value, fallback = '#58d63a') {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}

function cleanId(value, fallback = 'trex', maxLen = 28) {
  const s = String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen);
  return s || fallback;
}

function isAllowedHttpOrigin(origin) {
  if (!origin) return false;
  if (origin === 'https://dino-dash-3d-six.vercel.app') return true;
  return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/.test(origin);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png'
};

function getLanIps() {
  const result = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const fam = typeof net.family === 'string' ? net.family : String(net.family);
      if ((fam === 'IPv4' || fam === '4') && !net.internal) {
        result.push(net.address);
      }
    }
  }
  return result;
}

const rooms = new Map();

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? randomRoomCode() : code;
}

function serializeRoom(room) {
  return {
    code: room.code,
    roomName: room.roomName || `Sala ${room.code}`,
    hostPeerId: room.hostPeerId,
    isPublic: room.isPublic,
    hasPassword: !!room.passwordHash,
    maxPlayers: room.maxPlayers || MAX_PLAYERS,
    mode: room.mode,
    mpMode: room.mpMode || (room.elimination ? 'elimination' : 'race'),
    status: room.status,
    seed: room.seed,
    elimination: room.elimination,
    partyMode: room.partyMode,
    teacherMode: room.teacherMode,
    tvScale: room.tvScale,
    config: room.config || {
      allowVoting: true,
      difficulty: 'normal',
      biomeId: 'random_portal',
      multiHabitats: true,
      allowHybrids: true,
      uniqueDinos: false,
      allowControllers: true,
      allowMultiControllersPerPlayer: false,
      allowSpectators: true,
      allowEvents: true,
      allowBosses: true,
      allowPowerups: true,
      allowRevive: true,
      allowHandicap: false,
      pausePolicy: 'host_only'
    },
    votes: room.votes || {},
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
      pingMs: p.pingMs
    }))
  };
}

function send(ws, payload) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room, payload, excludePeerId = null) {
  const raw = JSON.stringify(payload);
  for (const peer of room.peers.values()) {
    if (peer.peerId === excludePeerId) continue;
    if (peer.ws && peer.ws.readyState === 1) {
      peer.ws.send(raw);
    }
  }
}

function cleanupPeer(ws) {
  if (!ws._roomCode || !ws._peerId) return;
  const room = rooms.get(ws._roomCode);
  if (!room) return;

  const peer = room.peers.get(ws._peerId);
  if (!peer || peer.ws !== ws) return;

  room.peers.delete(ws._peerId);
  if (peer.sessionToken) {
    room.disconnectedSessions = room.disconnectedSessions || new Map();
    room.disconnectedSessions.set(peer.sessionToken, {
      peerId: peer.peerId,
      name: peer.name,
      dinoId: peer.dinoId,
      color: peer.color,
      role: peer.role,
      controlMode: peer.controlMode,
      targetPlayerPeerId: peer.targetPlayerPeerId || null,
      slot: peer.slot,
      expiresAt: Date.now() + 60000
    });
  }
  if (room.votes) delete room.votes[ws._peerId];
  room.lastActivity = Date.now();

  if (room.peers.size === 0) {
    // Mantém sala viva brevemente para reconexão automática se alguém recarregar
    room.emptySince = Date.now();
    return;
  }

  // Migração de Host se o PC/Host atual desconectar
  if (room.hostPeerId === ws._peerId) {
    const candidates = Array.from(room.peers.values());
    const nextHost = candidates.find((c) => c.role === 'screen') || candidates[0];
    if (nextHost) {
      room.hostPeerId = nextHost.peerId;
      broadcast(room, {
        type: 'host_migrated',
        hostPeerId: nextHost.peerId,
        hostName: nextHost.name
      });
    }
  }

  broadcast(room, { type: 'room_state', room: serializeRoom(room) });
}

// Expiração automática de salas vazias/inativas
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if ((room.peers.size === 0 && room.emptySince && now - room.emptySince > 120000) ||
        now - room.lastActivity > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}, 20000).unref();

const server = http.createServer((req, res) => {
  const reqOrigin = String(req.headers.origin || '').trim();
  if (isAllowedHttpOrigin(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.method === 'OPTIONS') {
    res.writeHead(reqOrigin && !isAllowedHttpOrigin(reqOrigin) ? 403 : 204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Método não permitido.' }));
    return;
  }

  const reqUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  if (reqUrl.pathname === '/api/lan-info') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, ips: getLanIps(), port: PORT }));
    return;
  }

  if (reqUrl.pathname === '/api/rooms') {
    const publicRooms = [];
    for (const room of rooms.values()) {
      if (!room.isPublic || room.peers.size === 0) continue;
      const host = room.peers.get(room.hostPeerId);
      publicRooms.push({
        code: cleanRoomCode(room.code) || '0000',
        roomName: cleanStr(room.roomName, `Sala ${room.code}`, 28),
        hostName: cleanStr(host?.name, 'Host', 18),
        mode: cleanId(room.mpMode || room.mode, 'race', 24),
        biomeId: cleanId(room.config?.biomeId, 'random_portal', 24),
        hasPassword: !!room.passwordHash,
        playerCount: room.peers.size,
        maxPlayers: room.maxPlayers || MAX_PLAYERS,
        status: ['lobby', 'playing', 'finished'].includes(room.status) ? room.status : 'lobby'
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, rooms: publicRooms }));
    return;
  }

  // Caso dist/ esteja compilado, serve o jogo estático diretamente pela porta LAN com proteção anti-traversal
  if (fs.existsSync(DIST_DIR)) {
    const relPath = reqUrl.pathname === '/' ? 'index.html' : reqUrl.pathname.replace(/^\/+/, '');
    let filePath = path.resolve(DIST_DIR, relPath);
    const distPrefix = DIST_DIR.endsWith(path.sep) ? DIST_DIR : DIST_DIR + path.sep;
    if (!filePath.startsWith(distPrefix) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Dino Dash 3D LAN WebSocket Server ativo. Conecte via /ws ou rode npm run dev.');
});

const wss = new WebSocketServer({ server, maxPayload: WS_MAX_PAYLOAD_BYTES });

wss.on('connection', (ws) => {
  ws._msgWindowStart = Date.now();
  ws._msgCount = 0;

  ws.on('message', (raw) => {
    if (raw && raw.length > WS_MAX_PAYLOAD_BYTES) {
      ws.close(1009, 'Payload excede limite.');
      return;
    }

    const nowMs = Date.now();
    if (nowMs - ws._msgWindowStart >= 1000) {
      ws._msgWindowStart = nowMs;
      ws._msgCount = 0;
    }
    ws._msgCount += 1;
    if (ws._msgCount > WS_FLOOD_CLOSE_PER_SEC) {
      ws.close(1008, 'Flood detectado.');
      return;
    }
    if (ws._msgCount > WS_RATE_LIMIT_PER_SEC) {
      return;
    }

    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
      return;
    }

    if (msg.type === 'ping') {
      if (ws._roomCode && ws._peerId) {
        const room = rooms.get(ws._roomCode);
        const peer = room?.peers.get(ws._peerId);
        if (peer && typeof msg.lastPingMs === 'number') peer.pingMs = msg.lastPingMs;
      }
      send(ws, { type: 'pong', ts: msg.ts });
      return;
    }

    if (msg.type === 'list_rooms') {
      const list = [];
      for (const room of rooms.values()) {
        if (!room.isPublic || room.peers.size === 0) continue;
        const host = room.peers.get(room.hostPeerId);
        list.push({
          code: room.code,
          hostName: host?.name || 'Host',
          mode: room.mode,
          playerCount: room.peers.size,
          maxPlayers: MAX_PLAYERS,
          status: room.status
        });
      }
      send(ws, { type: 'rooms_list', rooms: list });
      return;
    }

    if (msg.type === 'create_room') {
      cleanupPeer(ws);
      const requestedCode = cleanRoomCode(msg.code);
      const code = requestedCode && !rooms.has(requestedCode)
        ? requestedCode
        : randomRoomCode();
      const peerId = cleanId(msg.peerId, `p_${crypto.randomBytes(4).toString('hex')}`, 32);
      const mpMode = cleanId(msg.mpMode || (msg.elimination ? 'elimination' : 'race'), 'race', 24);
      const rawPass = cleanStr(msg.password, '', 12);
      const maxPlayers = Math.max(2, Math.min(8, Math.floor(Number(msg.maxPlayers) || MAX_PLAYERS)));
      const room = {
        code,
        roomName: cleanStr(msg.roomName, `Sala ${code}`, 28, true),
        hostPeerId: peerId,
        isPublic: msg.isPublic !== false,
        passwordHash: rawPass ? crypto.createHash('sha256').update(rawPass).digest('hex') : null,
        maxPlayers,
        mode: cleanId(msg.mode, 'lan_party', 24),
        mpMode,
        status: 'lobby',
        seed: cleanStr(msg.seed, `LAN-${code}-${crypto.randomInt(1000, 9999)}`, 32),
        elimination: mpMode === 'elimination' || !!msg.elimination,
        partyMode: msg.partyMode !== false,
        teacherMode: !!msg.teacherMode,
        tvScale: !!msg.tvScale,
        config: {
          allowVoting: msg.config?.allowVoting !== false,
          difficulty: cleanId(msg.config?.difficulty, 'normal', 16),
          biomeId: cleanId(msg.config?.biomeId, 'random_portal', 24),
          multiHabitats: msg.config?.multiHabitats !== false,
          allowHybrids: msg.config?.allowHybrids !== false,
          uniqueDinos: !!msg.config?.uniqueDinos,
          allowControllers: msg.config?.allowControllers !== false,
          allowMultiControllersPerPlayer: !!msg.config?.allowMultiControllersPerPlayer,
          allowSpectators: msg.config?.allowSpectators !== false,
          allowEvents: msg.config?.allowEvents !== false,
          allowBosses: msg.config?.allowBosses !== false,
          allowPowerups: msg.config?.allowPowerups !== false,
          allowRevive: msg.config?.allowRevive !== false,
          allowHandicap: !!msg.config?.allowHandicap,
          pausePolicy: ['host_only', 'all_limited'].includes(msg.config?.pausePolicy) ? msg.config.pausePolicy : 'host_only'
        },
        votes: {},
        bannedTokens: new Set(),
        disconnectedSessions: new Map(),
        lastActivity: Date.now(),
        emptySince: null,
        peers: new Map()
      };
      room.peers.set(peerId, {
        peerId,
        ws,
        sessionToken: cleanId(msg.sessionToken, crypto.randomBytes(8).toString('hex'), 48),
        name: cleanStr(msg.name, 'Host PC', 18, true),
        dinoId: cleanId(msg.dinoId, 'trex', 28),
        color: cleanHexColor(msg.color, '#58d63a'),
        customization: msg.customization && typeof msg.customization === 'object' ? msg.customization : null,
        ready: true,
        role: ['screen', 'controller', 'mobile_player', 'spectator'].includes(msg.role) ? msg.role : 'screen',
        controlMode: ['p1_remote', 'own_dino'].includes(msg.controlMode) ? msg.controlMode : 'p1_remote',
        targetPlayerPeerId: null,
        slot: 0,
        pingMs: 0
      });
      rooms.set(code, room);
      ws._roomCode = code;
      ws._peerId = peerId;
      send(ws, { type: 'joined', code, peerId, room: serializeRoom(room) });
      return;
    }

    if (msg.type === 'join_room') {
      cleanupPeer(ws);
      const nowTry = Date.now();
      if (ws._joinBlockedUntil && nowTry < ws._joinBlockedUntil) {
        send(ws, { type: 'error', message: 'Muitas tentativas seguidas. Aguarde 30 segundos.' });
        return;
      }
      const code = cleanRoomCode(msg.code);
      const room = code ? rooms.get(code) : null;
      if (!room) {
        ws._joinFails = (ws._joinFails || 0) + 1;
        if (ws._joinFails >= 6) {
          ws._joinBlockedUntil = nowTry + 30000;
          ws._joinFails = 0;
        }
        send(ws, { type: 'error', message: `Sala "${cleanStr(msg.code, '????', 8)}" não encontrada ou expirada.` });
        return;
      }
      if (room.passwordHash) {
        const tryPass = cleanStr(msg.password, '', 12);
        const tryHash = tryPass ? crypto.createHash('sha256').update(tryPass).digest('hex') : '';
        if (tryHash !== room.passwordHash) {
          ws._joinFails = (ws._joinFails || 0) + 1;
          if (ws._joinFails >= 6) ws._joinBlockedUntil = nowTry + 30000;
          send(ws, { type: 'error', message: '🔒 Senha da sala incorreta ou ausente.' });
          return;
        }
      }
      ws._joinFails = 0;

      const peerId = cleanId(msg.peerId, `p_${crypto.randomBytes(4).toString('hex')}`, 32);
      const sessionToken = cleanId(msg.sessionToken, '', 48);
      if (room.bannedTokens?.has(peerId) || (sessionToken && room.bannedTokens?.has(sessionToken))) {
        send(ws, { type: 'error', message: '🚫 Você foi banido desta sala pelo Dono.' });
        return;
      }

      const existing = room.peers.get(peerId);
      const maxCap = room.maxPlayers || MAX_PLAYERS;
      if (!existing && room.peers.size >= maxCap) {
        send(ws, { type: 'error', message: `Sala cheia (máximo ${maxCap} jogadores).` });
        return;
      }

      const joinedRole = ['screen', 'controller', 'mobile_player', 'spectator'].includes(msg.role) ? msg.role : 'controller';
      if (joinedRole === 'spectator' && room.config?.allowSpectators === false) {
        send(ws, { type: 'error', message: 'Espectadores estão desativados nesta sala.' });
        return;
      }

      room.emptySince = null;
      room.lastActivity = Date.now();
      const usedSlots = new Set(Array.from(room.peers.values()).map((p) => p.slot));
      let nextSlot = existing ? existing.slot : 0;
      if (!existing) {
        while (usedSlots.has(nextSlot) && nextSlot < maxCap) nextSlot++;
      }

      const palette = ['#58d63a', '#38bdf8', '#ff9a24', '#f43f5e', '#a855f7', '#ffd447', '#14b8a6', '#ec4899'];
      const savedSess = sessionToken ? room.disconnectedSessions?.get(sessionToken) : null;
      const validSaved = savedSess && savedSess.expiresAt > Date.now() ? savedSess : null;
      if (validSaved) room.disconnectedSessions.delete(sessionToken);

      room.peers.set(peerId, {
        peerId,
        ws,
        sessionToken: sessionToken || crypto.randomBytes(8).toString('hex'),
        name: cleanStr(msg.name || existing?.name || validSaved?.name, `Dino ${nextSlot + 1}`, 18, true),
        dinoId: cleanId(msg.dinoId || existing?.dinoId || validSaved?.dinoId, 'raptor', 28),
        color: cleanHexColor(msg.color || existing?.color || validSaved?.color, palette[nextSlot % palette.length]),
        customization: msg.customization && typeof msg.customization === 'object' ? msg.customization : (existing?.customization || null),
        ready: existing?.ready ?? (joinedRole === 'controller' ? true : false),
        role: joinedRole,
        controlMode: ['p1_remote', 'own_dino'].includes(msg.controlMode) ? msg.controlMode : (existing?.controlMode || validSaved?.controlMode || 'p1_remote'),
        targetPlayerPeerId: existing?.targetPlayerPeerId || (validSaved?.targetPlayerPeerId && room.peers.has(validSaved.targetPlayerPeerId) ? validSaved.targetPlayerPeerId : null),
        slot: validSaved?.slot ?? nextSlot,
        pingMs: 0
      });
      // Se o host atual era apenas um controle de celular e este novo peer é Telão ('screen'/'mobile_player'), promove o Telão a Host
      const curHost = room.peers.get(room.hostPeerId);
      if ((!curHost || curHost.role === 'controller') && (joinedRole === 'screen' || joinedRole === 'mobile_player')) {
        room.hostPeerId = peerId;
      }
      ws._roomCode = code;
      ws._peerId = peerId;
      send(ws, { type: 'joined', code, peerId, room: serializeRoom(room) });
      broadcast(room, { type: 'room_state', room: serializeRoom(room) });
      if (room.status === 'playing' && room.activeMatch) {
        send(ws, room.activeMatch);
      }
      return;
    }

    const room = ws._roomCode ? rooms.get(ws._roomCode) : null;
    if (!room) return;
    room.lastActivity = Date.now();
    const peer = room.peers.get(ws._peerId);

    switch (msg.type) {
      case 'leave_room':
        cleanupPeer(ws);
        ws._roomCode = null;
        ws._peerId = null;
        break;
      case 'update_room':
        if (ws._peerId === room.hostPeerId) {
          if (msg.mode !== undefined) room.mode = msg.mode;
          if (msg.mpMode !== undefined) {
            room.mpMode = msg.mpMode;
            room.elimination = msg.mpMode === 'elimination';
          }
          if (msg.status !== undefined) room.status = msg.status;
          if (msg.seed !== undefined) room.seed = msg.seed;
          if (msg.elimination !== undefined) room.elimination = !!msg.elimination;
          if (msg.partyMode !== undefined) room.partyMode = !!msg.partyMode;
          if (msg.teacherMode !== undefined) room.teacherMode = !!msg.teacherMode;
          if (msg.tvScale !== undefined) room.tvScale = !!msg.tvScale;
          if (msg.isPublic !== undefined) room.isPublic = !!msg.isPublic;
          if (msg.config && typeof msg.config === 'object') {
            room.config = { ...(room.config || {}), ...msg.config };
          }
          if (msg.resetVotes) {
            room.votes = {};
          }
          if (msg.activeMatch !== undefined) room.activeMatch = msg.activeMatch;
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        }
        break;
      case 'room_vote':
        if (room.config?.allowVoting !== false && peer) {
          room.votes = room.votes || {};
          room.votes[peer.peerId] = {
            difficulty: msg.difficulty || null,
            biomeId: msg.biomeId || null,
            mpMode: msg.mpMode || null
          };
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        }
        break;
      case 'player_meta':
        if (peer) {
          if (msg.name) peer.name = cleanStr(msg.name, peer.name, 18, true);
          if (msg.dinoId) {
            const nextDino = cleanId(msg.dinoId, peer.dinoId, 28);
            const takenByOther = room.config?.uniqueDinos && Array.from(room.peers.values()).some(
              (other) => other.peerId !== peer.peerId && other.role !== 'controller' && other.dinoId === nextDino
            );
            if (takenByOther) {
              send(ws, { type: 'error', message: 'Este dinossauro já foi escolhido por outro jogador nesta sala!' });
              break;
            }
            peer.dinoId = nextDino;
          }
          if (msg.color) peer.color = cleanHexColor(msg.color, peer.color);
          if (msg.customization && typeof msg.customization === 'object') peer.customization = msg.customization;
          if (['screen', 'controller', 'mobile_player', 'spectator'].includes(msg.role)) peer.role = msg.role;
          if (['p1_remote', 'own_dino'].includes(msg.controlMode)) peer.controlMode = msg.controlMode;
          if (msg.ready !== undefined) peer.ready = !!msg.ready;
          if (peer.role === 'controller' && room.hostPeerId === peer.peerId) {
            const screenCandidate = Array.from(room.peers.values()).find((c) => c.peerId !== peer.peerId && (c.role === 'screen' || c.role === 'mobile_player'));
            if (screenCandidate) {
              room.hostPeerId = screenCandidate.peerId;
            }
          }
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        }
        break;
      case 'kick_peer': {
        if (ws._peerId !== room.hostPeerId) break;
        const targetId = cleanId(msg.targetPeerId, '', 32);
        const target = targetId && targetId !== ws._peerId ? room.peers.get(targetId) : null;
        if (!target) break;
        if (msg.ban) {
          room.bannedTokens = room.bannedTokens || new Set();
          room.bannedTokens.add(target.peerId);
          if (target.sessionToken) room.bannedTokens.add(target.sessionToken);
        }
        room.peers.delete(targetId);
        send(target.ws, {
          type: 'kicked',
          banned: !!msg.ban,
          reason: msg.ban ? '🚫 Você foi banido desta sala pelo Dono.' : '👢 Você foi removido da sala pelo Dono.'
        });
        broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        break;
      }
      case 'transfer_host': {
        if (ws._peerId !== room.hostPeerId) break;
        const targetId = cleanId(msg.targetPeerId, '', 32);
        const target = targetId ? room.peers.get(targetId) : null;
        if (!target || target.role === 'controller') break;
        room.hostPeerId = target.peerId;
        broadcast(room, { type: 'host_migrated', hostPeerId: target.peerId, hostName: target.name });
        broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        break;
      }
      case 'report_player': {
        const hostPeer = room.peers.get(room.hostPeerId);
        const target = room.peers.get(cleanId(msg.targetPeerId, '', 32));
        if (hostPeer && target) {
          send(hostPeer.ws, {
            type: 'player_reported',
            reporterName: peer?.name || 'Jogador',
            targetPeerId: target.peerId,
            targetName: target.name,
            reason: cleanStr(msg.reason, 'Comportamento inadequado', 60)
          });
        }
        break;
      }
      case 'request_room_sync':
        send(ws, { type: 'room_state', room: serializeRoom(room) });
        if (room.status === 'playing' && room.activeMatch) {
          send(ws, room.activeMatch);
        }
        break;
      case 'chat':
        broadcast(room, {
          type: 'chat',
          peerId: ws._peerId,
          name: cleanStr(peer?.name, 'Dino', 18),
          text: cleanStr(msg.text || msg.message, '', 120)
        }, ws._peerId);
        break;
      case 'emote':
        broadcast(room, {
          type: 'emote',
          peerId: ws._peerId,
          emote: cleanStr(msg.emote || msg.emoji, '🦖', 16)
        }, ws._peerId);
        break;
      case 'input':
        if (peer?.role === 'controller' && !peer.targetPlayerPeerId) {
          break; // Controle não confirmado não envia comandos
        }
        broadcast(room, { ...msg, peerId: ws._peerId, targetPlayerPeerId: peer?.targetPlayerPeerId || null }, ws._peerId);
        break;
      case 'control_request': {
        if (!peer) break;
        if (room.config?.allowControllers === false) {
          send(ws, { type: 'control_rejected', targetPlayerPeerId: msg.targetPlayerPeerId, reason: 'Controles de celular estão desativados nesta sala.' });
          break;
        }
        const target = room.peers.get(cleanId(msg.targetPlayerPeerId, '', 32));
        if (!target || target.role === 'controller' || target.role === 'spectator') {
          send(ws, { type: 'control_rejected', targetPlayerPeerId: msg.targetPlayerPeerId, reason: 'Jogador não encontrado na sala.' });
          break;
        }
        const alreadyBound = Array.from(room.peers.values()).filter(
          (p) => p.role === 'controller' && p.targetPlayerPeerId === target.peerId && p.peerId !== peer.peerId
        );
        if (alreadyBound.length >= 1 && !room.config?.allowMultiControllersPerPlayer) {
          send(ws, { type: 'control_rejected', targetPlayerPeerId: target.peerId, reason: `${target.name} já possui um controle vinculado.` });
          break;
        }
        send(target.ws, {
          type: 'control_request',
          requesterPeerId: peer.peerId,
          requesterName: peer.name,
          targetPlayerPeerId: target.peerId
        });
        break;
      }
      case 'control_response': {
        const reqPeer = room.peers.get(cleanId(msg.requesterPeerId, '', 32));
        if (!reqPeer) break;
        if (msg.accepted) {
          reqPeer.role = 'controller';
          reqPeer.targetPlayerPeerId = ws._peerId;
          reqPeer.ready = true;
          send(reqPeer.ws, {
            type: 'control_granted',
            targetPlayerPeerId: ws._peerId,
            targetPlayerName: peer?.name || 'Jogador',
            room: serializeRoom(room)
          });
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        } else {
          reqPeer.targetPlayerPeerId = null;
          send(reqPeer.ws, {
            type: 'control_rejected',
            targetPlayerPeerId: ws._peerId,
            reason: cleanStr(msg.reason, `${peer?.name || 'O jogador'} recusou o pedido de controle.`, 80)
          });
        }
        break;
      }
      case 'control_revoke': {
        const ctrlId = cleanId(msg.controllerPeerId, '', 32);
        const ctrlPeer = room.peers.get(ctrlId);
        if (!ctrlPeer) break;
        if (ctrlPeer.targetPlayerPeerId === ws._peerId || ws._peerId === room.hostPeerId) {
          ctrlPeer.targetPlayerPeerId = null;
          send(ctrlPeer.ws, {
            type: 'control_revoked',
            reason: `${peer?.name || 'O jogador'} removeu o vínculo do controle.`
          });
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
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
        broadcast(room, { ...msg, peerId: ws._peerId }, ws._peerId);
        break;
      case 'start_match':
        if (ws._peerId === room.hostPeerId) {
          room.status = 'playing';
          room.activeMatch = msg;
          broadcast(room, msg, ws._peerId);
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        }
        break;
      case 'end_match':
        if (ws._peerId === room.hostPeerId) {
          room.status = 'lobby';
          room.activeMatch = null;
          broadcast(room, msg, ws._peerId);
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        }
        break;
      case 'state_snapshot':
      case 'trivia_prompt':
      case 'party_prompt':
      case 'card_offer':
        if (ws._peerId === room.hostPeerId) {
          broadcast(room, msg, ws._peerId);
        }
        break;
      default:
        // Tipos desconhecidos são descartados para prevenir injeção arbitrária de protocolo.
        break;
    }
  });

  ws.on('close', () => cleanupPeer(ws));
  ws.on('error', () => cleanupPeer(ws));
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLanIps();
  console.log(`\n🦖 DINO DASH 3D — Servidor LAN WebSocket ativo!`);
  console.log(`   Local: ws://localhost:${PORT}`);
  for (const ip of ips) {
    console.log(`   LAN:   ws://${ip}:${PORT}  (celular: http://${ip}:5173/?room=CODIGO&transport=lan)`);
  }
  console.log(`   Mantenha este processo aberto durante partidas em rede local.\n`);
});
