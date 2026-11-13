// Servidor WebSocket LAN local embutido (`npm run host`) para DINO DASH 3D.
// Suporta salas de 4 letras (públicas/privadas), 2–8 jogadores, ping, chat,
// controles Jackbox, migração automática de host e expiração de salas inativas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PORT = Number(process.env.LAN_PORT || process.env.PORT || 5174);
const MAX_PLAYERS = 8;
const ROOM_TTL_MS = 15 * 60 * 1000;

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
    hostPeerId: room.hostPeerId,
    isPublic: room.isPublic,
    mode: room.mode,
    mpMode: room.mpMode || (room.elimination ? 'elimination' : 'race'),
    status: room.status,
    seed: room.seed,
    elimination: room.elimination,
    partyMode: room.partyMode,
    teacherMode: room.teacherMode,
    tvScale: room.tvScale,
    activeMatch: room.activeMatch || null,
    peers: Array.from(room.peers.values()).map((p) => ({
      peerId: p.peerId,
      name: p.name,
      dinoId: p.dinoId,
      color: p.color,
      ready: p.ready,
      role: p.role,
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
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
        code: room.code,
        hostName: host?.name || 'Host',
        mode: room.mode,
        playerCount: room.peers.size,
        maxPlayers: MAX_PLAYERS,
        status: room.status
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, rooms: publicRooms }));
    return;
  }

  // Caso dist/ esteja compilado, serve o jogo estático diretamente pela porta LAN
  if (fs.existsSync(DIST_DIR)) {
    let filePath = path.join(DIST_DIR, reqUrl.pathname === '/' ? 'index.html' : reqUrl.pathname);
    if (!filePath.startsWith(DIST_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
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
      const code = msg.code && /^[A-Z0-9]{4}$/.test(msg.code) && !rooms.has(msg.code)
        ? msg.code
        : randomRoomCode();
      const peerId = msg.peerId || `p_${Math.random().toString(36).slice(2, 8)}`;
      const mpMode = msg.mpMode || (msg.elimination ? 'elimination' : 'race');
      const room = {
        code,
        hostPeerId: peerId,
        isPublic: msg.isPublic !== false,
        mode: msg.mode || 'lan_party',
        mpMode,
        status: 'lobby',
        seed: msg.seed || `LAN-${code}-${Math.floor(Math.random() * 9999)}`,
        elimination: mpMode === 'elimination' || !!msg.elimination,
        partyMode: msg.partyMode !== false,
        teacherMode: !!msg.teacherMode,
        tvScale: !!msg.tvScale,
        lastActivity: Date.now(),
        emptySince: null,
        peers: new Map()
      };
      room.peers.set(peerId, {
        peerId,
        ws,
        name: String(msg.name || 'Host PC').slice(0, 18),
        dinoId: msg.dinoId || 'trex',
        color: msg.color || '#58d63a',
        ready: true,
        role: msg.role || 'screen',
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
      const code = String(msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) {
        send(ws, { type: 'error', message: `Sala "${code}" não encontrada ou expirada.` });
        return;
      }
      const peerId = msg.peerId || `p_${Math.random().toString(36).slice(2, 8)}`;
      const existing = room.peers.get(peerId);
      if (!existing && room.peers.size >= MAX_PLAYERS) {
        send(ws, { type: 'error', message: 'Sala cheia (máximo 8 jogadores).' });
        return;
      }

      room.emptySince = null;
      room.lastActivity = Date.now();
      const usedSlots = new Set(Array.from(room.peers.values()).map((p) => p.slot));
      let nextSlot = existing ? existing.slot : 0;
      if (!existing) {
        while (usedSlots.has(nextSlot) && nextSlot < MAX_PLAYERS) nextSlot++;
      }

      const palette = ['#58d63a', '#38bdf8', '#ff9a24', '#f43f5e', '#a855f7', '#ffd447', '#14b8a6', '#ec4899'];
      room.peers.set(peerId, {
        peerId,
        ws,
        name: String(msg.name || existing?.name || `Dino ${nextSlot + 1}`).slice(0, 18),
        dinoId: msg.dinoId || existing?.dinoId || 'raptor',
        color: msg.color || existing?.color || palette[nextSlot % palette.length],
        ready: existing?.ready ?? false,
        role: msg.role || 'controller',
        slot: nextSlot,
        pingMs: 0
      });
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
          if (msg.status !== undefined) room.status = msg.status;
          if (msg.seed !== undefined) room.seed = msg.seed;
          if (msg.elimination !== undefined) room.elimination = !!msg.elimination;
          if (msg.partyMode !== undefined) room.partyMode = !!msg.partyMode;
          if (msg.teacherMode !== undefined) room.teacherMode = !!msg.teacherMode;
          if (msg.tvScale !== undefined) room.tvScale = !!msg.tvScale;
          if (msg.isPublic !== undefined) room.isPublic = !!msg.isPublic;
          if (msg.activeMatch !== undefined) room.activeMatch = msg.activeMatch;
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        }
        break;
      case 'player_meta':
        if (peer) {
          if (msg.name) peer.name = String(msg.name).slice(0, 18);
          if (msg.dinoId) peer.dinoId = msg.dinoId;
          if (msg.color) peer.color = msg.color;
          if (msg.role) peer.role = msg.role;
          if (msg.ready !== undefined) peer.ready = !!msg.ready;
          broadcast(room, { type: 'room_state', room: serializeRoom(room) });
        }
        break;
      case 'request_room_sync':
        send(ws, { type: 'room_state', room: serializeRoom(room) });
        if (room.status === 'playing' && room.activeMatch) {
          send(ws, room.activeMatch);
        }
        break;
      case 'chat':
      case 'emote':
      case 'input':
      case 'card_pick':
      case 'spectator_action':
      case 'trivia_answer':
      case 'bet':
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
        broadcast(room, { ...msg, peerId: ws._peerId }, ws._peerId);
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
