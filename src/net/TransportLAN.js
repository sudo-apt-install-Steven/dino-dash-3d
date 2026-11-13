// Transporte LAN Local via WebSocket (`npm run host`) com auto-descoberta de IP LAN e reconexão automática.

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

  async discoverLanInfo() {
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
    if (customWsUrl) return customWsUrl;
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
    return new Promise((resolve) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }
      try {
        const ws = new WebSocket(url);
        this.ws = ws;
        const timeout = setTimeout(() => {
          if (!this.connected) resolve(false);
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
      const res = await fetch('/api/rooms', { signal: AbortSignal.timeout(1500) });
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
