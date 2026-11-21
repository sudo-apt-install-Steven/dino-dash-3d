// Transporte LAN Local via WebSocket (`npm run host`) com auto-descoberta de IP LAN e reconexão automática.

const PRIVATE_HOST_RX = /^(localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/i;

// Valida/normaliza o endereço do Host LAN digitado. Aceita apenas loopback e IPs privados RFC1918 (anti-SSRF).
// Aceita "192.168.1.10:5174", "ws://192.168.1.10:5174", "http://localhost:5174".
export function normalizeLanHost(input) {
  const raw = String(input || '').trim();
  if (!raw) return { ok: false, reason: 'Informe o endereço do Host LAN (ex.: 192.168.1.10:5174).' };
  if (raw.length > 80 || /[\s\\@?#]/.test(raw)) return { ok: false, reason: 'Endereço inválido.' };
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `ws://${raw}`;
  let u;
  try { u = new URL(withProto); } catch { return { ok: false, reason: 'Endereço inválido.' }; }
  if (!['ws:', 'wss:', 'http:', 'https:'].includes(u.protocol)) return { ok: false, reason: 'Use ws://, wss:// ou apenas IP:porta.' };
  if (u.username || u.password) return { ok: false, reason: 'Endereço inválido.' };
  const host = u.hostname.toLowerCase();
  if (!PRIVATE_HOST_RX.test(host)) {
    return { ok: false, reason: 'Somente localhost, 127.0.0.1, [::1] ou IPs de rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x) são permitidos.' };
  }
  const octets = host.split('.');
  if (octets.length === 4 && octets.some((o) => Number(o) > 255)) return { ok: false, reason: 'IP inválido.' };
  const secure = u.protocol === 'wss:' || u.protocol === 'https:';
  const hostPort = `${u.hostname}:${u.port || '5174'}`;
  return {
    ok: true,
    host,
    secure,
    wsUrl: `${secure ? 'wss' : 'ws'}://${hostPort}`,
    httpUrl: `${secure ? 'https' : 'http'}://${hostPort}`
  };
}

// ws:// puro a partir de página https:// é bloqueado pelo navegador (mixed content), exceto localhost.
export function isMixedContentBlocked(wsUrl) {
  try {
    if (window.location.protocol !== 'https:') return false;
    const u = new URL(wsUrl);
    if (u.protocol === 'wss:') return false;
    return !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  } catch {
    return false;
  }
}

export class TransportLAN {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.pingMs = 0;
    this.listeners = new Map();
    this.lanIps = [];
    this.lastConnectOpts = null;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.manualClose = false;
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }

  _emit(event, payload) {
    const set = this.listeners.get(event);
    if (set) for (const fn of set) fn(payload);
  }

  // Define o Host LAN customizado (validado). Retorna o resultado da validação; '' limpa.
  setCustomHost(input) {
    if (!input) { this.customHost = null; return { ok: true }; }
    const v = normalizeLanHost(input);
    this.customHost = v.ok ? v : null;
    return v;
  }

  async discoverLanInfo() {
    if (this.customHost?.ok) {
      try {
        const res = await fetch(`${this.customHost.httpUrl}/api/lan-info`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          this.lanIps = data.ips || [];
          return data;
        }
      } catch {
        // host customizado inacessível
      }
      return { ok: false, ips: [], port: 5174 };
    }
    try {
      const res = await fetch('/api/lan-info', { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        this.lanIps = data.ips || [];
        return data;
      }
    } catch {
      // fallback porta direta 5174
      try {
        const host = window.location.hostname || 'localhost';
        const res = await fetch(`http://${host}:5174/api/lan-info`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const data = await res.json();
          this.lanIps = data.ips || [];
          return data;
        }
      } catch {
        // servidor LAN desligado
      }
    }
    return { ok: false, ips: [], port: 5174 };
  }

  _resolveWsUrl(customWsUrl) {
    if (customWsUrl) {
      const v = normalizeLanHost(customWsUrl);
      return v.ok ? v.wsUrl : null; // nunca conecta em host fora da rede local
    }
    if (this.customHost?.ok) return this.customHost.wsUrl;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.port === '5173' || window.location.port === '4173') {
      return `${proto}//${window.location.host}/ws`;
    }
    const host = window.location.hostname || 'localhost';
    return `${proto}//${host}:5174`;
  }

  connect(customWsUrl = '') {
    this.manualClose = false;
    const url = this._resolveWsUrl(customWsUrl);
    this.lastError = '';
    return new Promise((resolve) => {
      if (!url) {
        this.lastError = 'invalid_host';
        resolve(false);
        return;
      }
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ws.url.replace(/\/$/, '') === url.replace(/\/$/, '')) {
        resolve(true);
        return;
      }
      if (this.ws && this.ws.readyState <= 1) {
        this.manualClose = true;
        try { this.ws.close(); } catch {}
        this.manualClose = false;
      }
      if (isMixedContentBlocked(url)) {
        this.lastError = 'mixed_content';
        resolve(false);
        return;
      }
      try {
        const ws = new WebSocket(url);
        this.ws = ws;
        const timeout = setTimeout(() => {
          if (!this.connected) {
            this.lastError = 'timeout';
            try { ws.close(); } catch {}
            resolve(false);
          }
        }, 2500);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.connected = true;
          this._startPingLoop();
          this._emit('connected', true);
          if (this.lastConnectOpts) {
            this.send(this.lastConnectOpts);
          }
          resolve(true);
        };

        ws.onmessage = (ev) => {
          let msg;
          try {
            msg = JSON.parse(ev.data);
          } catch {
            return;
          }
          if (msg.type === 'pong') {
            this.pingMs = Math.max(1, Math.round(performance.now() - msg.ts));
            this._emit('pong', this.pingMs);
            return;
          }
          this._emit('message', msg);
        };

        ws.onclose = () => {
          this.connected = false;
          this._stopPingLoop();
          this._emit('disconnected', true);
          if (!this.manualClose && this.lastConnectOpts) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.connect(customWsUrl), 2200);
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          this.connected = false;
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  _startPingLoop() {
    this._stopPingLoop();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', ts: performance.now(), lastPingMs: this.pingMs });
      }
    }, 2200);
  }

  _stopPingLoop() {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  send(payload) {
    if (payload.type === 'create_room' || payload.type === 'join_room') {
      this.lastConnectOpts = payload.type === 'create_room'
        ? { ...payload, type: 'join_room', code: payload.code }
        : payload;
      if (payload.type === 'create_room') {
        this._pendingCreate = true;
      }
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  async listPublicRooms() {
    try {
      const base = this.customHost?.ok ? this.customHost.httpUrl : '';
      const res = await fetch(`${base}/api/rooms`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const d = await res.json();
        return d.rooms || [];
      }
    } catch {
      // ignora
    }
    return [];
  }

  disconnect() {
    this.manualClose = true;
    this.lastConnectOpts = null;
    clearTimeout(this.reconnectTimer);
    this._stopPingLoop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}
