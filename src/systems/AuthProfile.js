// Sistema de Contas (Supabase Auth + Edge Function nick-login), Nick + Senha sem e-mail obrigatório,
// limite de 1 conta por PC/navegador (localStorage + IndexedDB + Cookie + servidor),
// OAuth Google/Discord, Migração Convidado->Conta, Perfil do Jogador e Exclusão LGPD (D2, D3, D8).
import { Save } from './Save.js';
import { getSupabaseClient } from '../net/TransportSupabase.js';
import { requestCloudDataWipe } from '../security/EdgeClient.js';

export const NICKNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const DEVICE_STORAGE_KEY = 'dino_dash_device_id_v1';
const DEVICE_COOKIE_KEY = 'dd_dev_id';
const CREATED_ACCOUNT_STORAGE_KEY = 'dino_dash_created_account_v1';
const CREATED_ACCOUNT_COOKIE_KEY = 'dd_acct_created';
const IDB_NAME = 'dino_dash_auth_vault';
const IDB_STORE = 'kv';

export const PROFILE_BANNERS = [
  { id: 'amber_classic', name: 'Âmbar Jurássico', gradient: 'linear-gradient(135deg, #451a03, #92400e)' },
  { id: 'emerald_jungle', name: 'Selva Primordial', gradient: 'linear-gradient(135deg, #064e3b, #047857)' },
  { id: 'abyss_ocean', name: 'Abismo Submerso', gradient: 'linear-gradient(135deg, #0c4a6e, #0369a1)' },
  { id: 'cyber_neon', name: 'Metrópole Neon', gradient: 'linear-gradient(135deg, #312e81, #7e22ce)' },
  { id: 'volcano_magma', name: 'Caldeira Vulcânica', gradient: 'linear-gradient(135deg, #7f1d1d, #c2410c)' }
];

export const PROFILE_FRAMES = [
  { id: 'default', name: 'Madeira Fóssil', border: '#92400e' },
  { id: 'gold', name: 'Ouro Real', border: '#fbbf24' },
  { id: 'diamond', name: 'Diamante Glacial', border: '#38bdf8' },
  { id: 'emerald', name: 'Esmeralda', border: '#34d399' },
  { id: 'crimson', name: 'Rubi Alfa', border: '#f43f5e' }
];

const BLOCKED_TERMS = [
  /p[u\*]t[ao]/i, /c[a@]r[a@]lh/i, /f[o0]d[ae]/i, /p[o0]rr[a@]/i,
  /b[u\*]c[e3]t/i, /m[e3]rd[a@]/i, /v[i1][a@]d[o0]/i, /f[u\*]ck/i,
  /sh[i1]t/i, /b[i1]tch/i, /n[i1]gg/i, /r[a@]p[e3]/i,
  /p[e3]nd[e3]j[o0]/i, /c[a@]br[o0]n/i, /gilipoll/i
];

const RESERVED_NICK_WORDS = new Set([
  'admin', 'administrator', 'root', 'moderator', 'mod', 'system',
  'null', 'undefined', 'select', 'union', 'drop', 'insert',
  'delete', 'script', 'alert', 'eval', 'staff', 'support',
  'owner', 'superuser', 'dinodash', 'guest', 'convidado'
]);

const MALICIOUS_PAYLOAD_PATTERNS = [
  /['";<>`]/,
  /--/,
  /\/\*/,
  /\*\//,
  /\bunion\s+select\b/i,
  /\bor\s+1\s*=\s*1\b/i,
  /\band\s+1\s*=\s*1\b/i,
  /\bdrop\s+table\b/i,
  /\binsert\s+into\b/i,
  /\bdelete\s+from\b/i,
  /javascript:/i,
  /\bon(error|load|click|mouseover)\s*=/i,
  /<\s*script/i
];

const DEVICE_ID_REGEX = /^[a-zA-Z0-9_-]{12,128}$/;

let _idbCacheDeviceId = null;
let _idbCacheCreatedAccount = null;

function readCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) return '';
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return '';
}

function writeCookie(name, value, maxAgeSec = 31536000) {
  if (typeof document === 'undefined') return;
  try {
    const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax; max-age=${maxAgeSec}${secure}`;
  } catch {
    // Ignora em ambientes sem cookie
  }
}

function openAuthIdb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(key) {
  const db = await openAuthIdb();
  if (!db) return null;
  return await new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      try { db.close(); } catch {}
      resolve(null);
    }
  });
}

async function idbSet(key, value) {
  const db = await openAuthIdb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch {
      try { db.close(); } catch {}
      resolve();
    }
  });
}

async function idbDelete(key) {
  const db = await openAuthIdb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch {
      try { db.close(); } catch {}
      resolve();
    }
  });
}

function generateRandomDeviceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `dd_${hex}`;
  }
  const fallback = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}${Math.random().toString(36).slice(2, 10)}`;
  return `dd_${fallback.replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 48);
}

/**
 * Triple-persisted Device ID (localStorage + IndexedDB + Cookie SameSite=Lax 1 ano)
 * para garantir o limite de 1 conta por PC/navegador.
 */
export async function getOrCreateDeviceId() {
  let lsId = '';
  try {
    if (typeof localStorage !== 'undefined') {
      lsId = localStorage.getItem(DEVICE_STORAGE_KEY) || '';
    }
  } catch {}

  const ckId = readCookie(DEVICE_COOKIE_KEY);
  let idbId = _idbCacheDeviceId || '';
  if (!idbId) {
    const stored = await idbGet(DEVICE_STORAGE_KEY);
    if (typeof stored === 'string' && DEVICE_ID_REGEX.test(stored)) {
      idbId = stored;
      _idbCacheDeviceId = stored;
    }
  }

  let resolved = '';
  for (const candidate of [idbId, lsId, ckId]) {
    if (candidate && DEVICE_ID_REGEX.test(candidate)) {
      resolved = candidate;
      break;
    }
  }

  if (!resolved) {
    resolved = generateRandomDeviceId();
  }

  _idbCacheDeviceId = resolved;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DEVICE_STORAGE_KEY, resolved);
    }
  } catch {}
  writeCookie(DEVICE_COOKIE_KEY, resolved, 31536000);
  await idbSet(DEVICE_STORAGE_KEY, resolved);

  // Aproveita para hidratar cache do marcador de conta criada do IndexedDB
  if (!_idbCacheCreatedAccount) {
    const idbAcct = await idbGet(CREATED_ACCOUNT_STORAGE_KEY);
    if (typeof idbAcct === 'string' && idbAcct.trim()) {
      _idbCacheCreatedAccount = idbAcct.trim();
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(CREATED_ACCOUNT_STORAGE_KEY, _idbCacheCreatedAccount);
        }
      } catch {}
      writeCookie(CREATED_ACCOUNT_COOKIE_KEY, _idbCacheCreatedAccount, 31536000);
    }
  }

  return resolved;
}

export function hasLocalCreatedAccount() {
  if (_idbCacheCreatedAccount) return true;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(CREATED_ACCOUNT_STORAGE_KEY)) {
      return true;
    }
  } catch {}
  if (readCookie(CREATED_ACCOUNT_COOKIE_KEY)) return true;
  return false;
}

export function getLocalCreatedAccountNick() {
  if (_idbCacheCreatedAccount) return _idbCacheCreatedAccount;
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(CREATED_ACCOUNT_STORAGE_KEY);
      if (v) return v;
    }
  } catch {}
  return readCookie(CREATED_ACCOUNT_COOKIE_KEY) || '';
}

export function markLocalCreatedAccount(nick) {
  const clean = String(nick ?? '').trim() || 'player';
  _idbCacheCreatedAccount = clean;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CREATED_ACCOUNT_STORAGE_KEY, clean);
    }
  } catch {}
  writeCookie(CREATED_ACCOUNT_COOKIE_KEY, clean, 31536000);
  void idbSet(CREATED_ACCOUNT_STORAGE_KEY, clean);
}

function clearLocalCreatedAccountMarker() {
  _idbCacheCreatedAccount = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CREATED_ACCOUNT_STORAGE_KEY);
    }
  } catch {}
  writeCookie(CREATED_ACCOUNT_COOKIE_KEY, '', 0);
  void idbDelete(CREATED_ACCOUNT_STORAGE_KEY);
}

export function validateNickname(nick) {
  const s = String(nick ?? '').trim();
  if (MALICIOUS_PAYLOAD_PATTERNS.some((rx) => rx.test(s))) {
    return { ok: false, error: 'Apelido contém caracteres ou termos não permitidos.' };
  }
  if (s.length < 3 || s.length > 16) {
    return { ok: false, error: 'Apelido deve ter entre 3 e 16 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) {
    return { ok: false, error: 'Apelido aceita apenas letras, números, "_" e "-".' };
  }
  if (RESERVED_NICK_WORDS.has(s.toLowerCase())) {
    return { ok: false, error: 'Este apelido é reservado pelo sistema. Escolha outro.' };
  }
  if (BLOCKED_TERMS.some((rx) => rx.test(s))) {
    return { ok: false, error: 'Escolha um apelido apropriado.' };
  }
  return { ok: true, value: s };
}

export function validateEmail(email) {
  const s = String(email ?? '').trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 160;
  return ok ? { ok: true, value: s } : { ok: false, error: 'Informe um e-mail válido.' };
}

export function validatePassword(pw) {
  const s = String(pw ?? '');
  if (s.length < 8 || s.length > 128) {
    return { ok: false, error: 'A senha deve ter entre 8 e 128 caracteres.' };
  }
  if (!/[a-zA-Z]/.test(s) || !/\d/.test(s)) {
    return { ok: false, error: 'A senha precisa conter pelo menos uma letra e um número.' };
  }
  return { ok: true };
}

export function evaluatePasswordStrength(pw) {
  const s = String(pw ?? '');
  if (!s) return { score: 0, label: 'Digite uma senha', color: '#94a3b8' };
  let score = 0;
  if (s.length >= 8) score++;
  if (s.length >= 12) score++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) score++;
  if (/\d/.test(s)) score++;
  if (/[^a-zA-Z0-9]/.test(s)) score++;
  if (s.length < 8 || !/[a-zA-Z]/.test(s) || !/\d/.test(s)) {
    return { score: 1, label: 'Fraca (mín. 8 chars, letras + números)', color: '#f87171' };
  }
  if (score <= 2) return { score: 2, label: 'Razoável', color: '#fbbf24' };
  if (score <= 3) return { score: 3, label: 'Boa', color: '#38bdf8' };
  return { score: 4, label: 'Forte 🛡️', color: '#4ade80' };
}

export function sanitizeBio(raw, maxLen = 160) {
  let clean = String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F<>`"'\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  for (const rx of BLOCKED_TERMS) {
    clean = clean.replace(rx, '***');
  }
  return clean;
}

export function getOAuthRedirectUrl() {
  if (typeof window === 'undefined' || !window.location) {
    return 'https://dino-dash-3d-six.vercel.app/';
  }
  const { origin, pathname } = window.location;
  const cleanPath = pathname && pathname !== '/index.html' ? pathname : '/';
  return `${origin}${cleanPath}`;
}

export function translateAuthError(rawError, provider = '') {
  const msg = String(rawError?.message || rawError || '').trim();
  const lower = msg.toLowerCase();
  const provLabel = provider === 'google' ? 'Google' : (provider === 'discord' ? 'Discord' : 'OAuth');
  if (!msg) return 'Erro inesperado na autenticação. Tente novamente.';
  if (lower.includes('unsupported provider') || lower.includes('provider is not enabled')) {
    return `O login com ${provLabel} ainda precisa ser ativado no painel do Supabase Auth (veja docs/CONFIGURACAO_OAUTH.md).`;
  }
  if (lower.includes('manual linking is disabled') || lower.includes('identity_already_exists')) {
    return lower.includes('already')
      ? `Esta conta ${provLabel} já está vinculada a outro perfil.`
      : 'O vínculo manual de contas precisa estar ativado em Supabase > Auth > Settings > Enable Manual Linking.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'E-mail/apelido ou senha inválidos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail pelo link enviado antes de entrar.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Este e-mail já está cadastrado. Use a aba Entrar ou Recuperar Senha.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Muitas tentativas em sequência. Aguarde alguns segundos e tente novamente.';
  }
  if (lower.includes('redirect_uri') || lower.includes('redirect url')) {
    return 'URL de redirecionamento não autorizada no painel do Supabase Auth (adicione localhost e o domínio da Vercel em Redirect URLs).';
  }
  if (lower.includes('popup') || lower.includes('access_denied') || lower.includes('cancelled')) {
    return `Login com ${provLabel} cancelado pelo usuário.`;
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Sem conexão com o servidor de autenticação. Verifique sua internet.';
  }
  return msg;
}

class AuthProfileSystem {
  constructor() {
    this._cachedUser = null;
    this._authSub = null;
    this._lastOAuthStatus = null;
  }

  isOnlineConfigured() {
    return !!getSupabaseClient();
  }

  getCachedUser() {
    return this._cachedUser;
  }

  async getOrCreateDeviceId() {
    return await getOrCreateDeviceId();
  }

  hasLocalCreatedAccount() {
    return hasLocalCreatedAccount();
  }

  getLocalCreatedAccountNick() {
    return getLocalCreatedAccountNick();
  }

  markLocalCreatedAccount(nick) {
    markLocalCreatedAccount(nick);
  }

  async getCurrentSession() {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data } = await client.auth.getSession();
      this._cachedUser = data?.session?.user || null;
      return data?.session || null;
    } catch {
      return null;
    }
  }

  async getCurrentUser() {
    const sess = await this.getCurrentSession();
    return sess?.user || null;
  }

  getLocalProfile() {
    const p = Save.data.profile || {};
    const nickname = p.nickname || Save.data.network?.nickname || 'Convidado';
    return {
      nickname,
      bio: sanitizeBio(p.bio || ''),
      isPublic: p.isPublic !== false,
      avatar: {
        dinoId: p.avatar?.dinoId || Save.data.selectedDino || 'trex',
        angleY: Number.isFinite(Number(p.avatar?.angleY)) ? Number(p.avatar.angleY) : -0.55,
        angleX: Number.isFinite(Number(p.avatar?.angleX)) ? Number(p.avatar.angleX) : 0.12,
        zoom: Number.isFinite(Number(p.avatar?.zoom)) ? Number(p.avatar.zoom) : 1.0,
        pose: ['idle', 'run', 'jump', 'roar'].includes(p.avatar?.pose) ? p.avatar.pose : 'idle',
        skinId: p.avatar?.skinId || 'original'
      },
      showcaseAchievements: Array.isArray(p.showcaseAchievements) ? p.showcaseAchievements.slice(0, 4) : [],
      bannerId: p.bannerId || 'amber_classic',
      frameId: p.frameId || 'default',
      nicknameChangedAt: Number(p.nicknameChangedAt || 0),
      xp: Number(p.xp || 0),
      level: Number(p.level || 1),
      activeTitle: Save.data.activeTitle || 'Iniciante'
    };
  }

  getStatsSnapshot() {
    const s = Save.data.stats || {};
    return {
      highScore: Save.getHighScore(),
      totalDist: Math.floor(s.totalDist || 0),
      runs: Math.floor(s.runs || 0),
      bossesDefeated: Math.floor(s.bossesDefeated || 0),
      playTimeSec: Math.floor(s.playTimeSec || 0),
      totalEggs: Math.floor(s.totalEggs || Save.data.eggs || 0),
      favoriteDino: Save.data.selectedDino || 'trex'
    };
  }

  async _invokeNickLogin(payload) {
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, offline: true, error: 'Modo offline: Supabase não configurado neste ambiente.' };
    }
    try {
      const { data, error } = await client.functions.invoke('nick-login', { body: payload });
      if (error) {
        return { ok: false, error: error.message || 'Falha de comunicação com o servidor.' };
      }
      if (!data || data.ok === false) {
        return { ok: false, error: data?.error || 'Operação não autorizada.' };
      }
      return { ok: true, ...data };
    } catch (err) {
      return { ok: false, error: err?.message || 'Erro de rede ao conectar à conta.' };
    }
  }

  async checkNicknameAvailability(nick) {
    const localCheck = validateNickname(nick);
    if (!localCheck.ok) {
      return { ok: false, valid: false, available: false, error: localCheck.error };
    }
    const res = await this._invokeNickLogin({
      action: 'check_nick',
      nickname: localCheck.value
    });
    if (res.offline) {
      return { ok: true, valid: true, available: true, offline: true, message: 'Formato válido (modo offline).' };
    }
    if (!res.ok) {
      return { ok: false, valid: true, available: false, error: res.error };
    }
    return {
      ok: true,
      valid: res.valid !== false,
      available: !!res.available,
      message: res.message || (res.available ? 'Apelido disponível!' : 'Este apelido já está em uso.'),
      error: res.error || ''
    };
  }

  async register({ nickname, email = '', password, confirmPassword, acceptTerms = true, isMinorConsent = false }) {
    if (!acceptTerms) {
      return { ok: false, error: 'É necessário aceitar os Termos de Uso e Política de Privacidade.' };
    }

    const deviceId = await getOrCreateDeviceId();

    // Bloqueio imediato local (em adição à validação server-side em device_account_registry)
    if (hasLocalCreatedAccount()) {
      const existingNick = getLocalCreatedAccountNick();
      return {
        ok: false,
        error: existingNick
          ? `Este navegador/PC já possui a conta "@${existingNick}" criada. Faça login na sua conta existente.`
          : 'Este navegador/PC já possui uma conta criada. Faça login na sua conta existente.'
      };
    }

    const nickCheck = validateNickname(nickname);
    if (!nickCheck.ok) return nickCheck;

    const cleanEmail = String(email ?? '').trim().toLowerCase();
    if (cleanEmail) {
      const emailCheck = validateEmail(cleanEmail);
      if (!emailCheck.ok) return emailCheck;
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) return pwCheck;

    if (password !== confirmPassword) {
      return { ok: false, error: 'As senhas não conferem.' };
    }

    const payload = {
      action: 'register',
      nickname: nickCheck.value,
      password,
      deviceId,
      isMinorConsent: !!isMinorConsent
    };
    if (cleanEmail) payload.email = cleanEmail;

    const res = await this._invokeNickLogin(payload);
    if (!res.ok) return res;

    markLocalCreatedAccount(nickCheck.value);

    if (!Save.data.profile) Save.data.profile = {};
    Save.data.profile.nickname = nickCheck.value;
    if (!Save.data.network) Save.data.network = {};
    Save.data.network.nickname = nickCheck.value;
    Save.save();

    if (res.session?.access_token && res.session?.refresh_token) {
      const client = getSupabaseClient();
      await client?.auth.setSession(res.session);
      await this.getCurrentSession();
      await this.migrateGuestProgressToAccount();
    }

    return res;
  }

  async login({ identifier, password }) {
    const idClean = String(identifier ?? '').trim();
    if (!idClean || !password) {
      return { ok: false, error: 'Informe seu apelido ou e-mail e senha.' };
    }

    const res = await this._invokeNickLogin({
      action: 'login',
      identifier: idClean,
      password
    });

    const client = getSupabaseClient();
    if (!res.ok) {
      // Fallback direto para login por e-mail/senha no Supabase Auth caso o usuário já tenha conta Auth/OAuth com e-mail
      if (client && idClean.includes('@')) {
        const emailCheck = validateEmail(idClean);
        if (emailCheck.ok) {
          try {
            const { data, error } = await client.auth.signInWithPassword({
              email: emailCheck.value,
              password
            });
            if (!error && data?.session) {
              this._cachedUser = data.user || data.session.user || null;
              await this.syncProfileFromCloud();
              return { ok: true, nickname: this.getLocalProfile().nickname };
            }
            if (error) return { ok: false, error: translateAuthError(error) };
          } catch (err) {
            return { ok: false, error: translateAuthError(err) };
          }
        }
      }
      return { ok: false, error: translateAuthError(res.error) };
    }

    if (client && res.session?.access_token && res.session?.refresh_token) {
      await client.auth.setSession(res.session);
      await this.getCurrentSession();
      if (res.nickname) {
        if (!Save.data.profile) Save.data.profile = {};
        Save.data.profile.nickname = res.nickname;
        if (!Save.data.network) Save.data.network = {};
        Save.data.network.nickname = res.nickname;
        Save.save();
      }
      await this.syncProfileFromCloud();
    }
    return { ok: true, nickname: res.nickname };
  }

  async recoverPassword(identifier) {
    const idClean = String(identifier ?? '').trim();
    if (!idClean) {
      return { ok: false, error: 'Informe seu apelido ou e-mail.' };
    }
    const redirectTo = getOAuthRedirectUrl();
    const res = await this._invokeNickLogin({
      action: 'recover_password',
      identifier: idClean,
      redirectTo
    });
    if (!res.ok && idClean.includes('@')) {
      const client = getSupabaseClient();
      const emailCheck = validateEmail(idClean);
      if (client && emailCheck.ok) {
        try {
          const { error } = await client.auth.resetPasswordForEmail(emailCheck.value, { redirectTo });
          if (error) return { ok: false, error: translateAuthError(error) };
          return { ok: true, message: 'Se o e-mail existir, enviamos um link de recuperação de senha.' };
        } catch (err) {
          return { ok: false, error: translateAuthError(err) };
        }
      }
    }
    return res.ok ? res : { ok: false, error: translateAuthError(res.error) };
  }

  getLinkedIdentities(user = this._cachedUser) {
    const list = Array.isArray(user?.identities) ? user.identities : [];
    const providers = Array.from(new Set(list.map((i) => String(i?.provider || '').toLowerCase()).filter(Boolean)));
    const appProv = String(user?.app_metadata?.provider || '').toLowerCase();
    if (appProv && !providers.includes(appProv)) providers.push(appProv);
    return {
      google: providers.includes('google'),
      discord: providers.includes('discord'),
      email: providers.includes('email'),
      providers
    };
  }

  consumeLastOAuthStatus() {
    const v = this._lastOAuthStatus;
    this._lastOAuthStatus = null;
    return v;
  }

  async initOAuthCallbackListener(onAuthUpdated = null) {
    const client = getSupabaseClient();
    if (!client) return null;

    // Captura erros retornados na URL por provedores OAuth (Google/Discord)
    if (typeof window !== 'undefined' && window.location) {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
      const errMsg = url.searchParams.get('error_description')
        || hashParams.get('error_description')
        || url.searchParams.get('error')
        || hashParams.get('error');
      if (errMsg) {
        this._lastOAuthStatus = { ok: false, message: translateAuthError(errMsg) };
        url.searchParams.delete('error');
        url.searchParams.delete('error_code');
        url.searchParams.delete('error_description');
        try { window.history.replaceState({}, document.title, url.pathname + url.search); } catch {}
      }

      // PKCE code exchange explícito (garante funcionamento em localhost e Vercel)
      const code = url.searchParams.get('code');
      if (code && typeof client.auth.exchangeCodeForSession === 'function') {
        try {
          const { data, error } = await client.auth.exchangeCodeForSession(code);
          if (error) {
            this._lastOAuthStatus = { ok: false, message: translateAuthError(error) };
          } else if (data?.session?.user) {
            this._cachedUser = data.session.user;
            this._lastOAuthStatus = { ok: true, message: 'Conta conectada com sucesso!' };
            await this._postOAuthSync(data.session.user);
            onAuthUpdated?.(data.session.user);
          }
        } catch (err) {
          this._lastOAuthStatus = { ok: false, message: translateAuthError(err) };
        } finally {
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          try { window.history.replaceState({}, document.title, url.pathname + (url.search || '')); } catch {}
        }
      }
    }

    if (!this._authSub && typeof client.auth.onAuthStateChange === 'function') {
      const { data } = client.auth.onAuthStateChange(async (event, session) => {
        this._cachedUser = session?.user || null;
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          await this._postOAuthSync(session.user);
          onAuthUpdated?.(session.user);
        } else if (event === 'SIGNED_OUT') {
          onAuthUpdated?.(null);
        }
      });
      this._authSub = data?.subscription || null;
    }

    await this.getCurrentSession();
    return this._cachedUser;
  }

  async _postOAuthSync(user) {
    if (!user) return;
    const synced = await this.syncProfileFromCloud();
    if (!synced?.profile) {
      // Primeiro login OAuth: garante apelido divertido válido e migra o progresso local
      const metaName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 14);
      const localNick = this.getLocalProfile().nickname;
      const candidate = validateNickname(localNick).ok
        ? localNick
        : (validateNickname(metaName).ok ? metaName : `Dino${user.id.slice(0, 6)}`);
      if (!Save.data.profile) Save.data.profile = {};
      Save.data.profile.nickname = candidate;
      if (!Save.data.network) Save.data.network = {};
      Save.data.network.nickname = candidate;
      Save.save();
      await this.migrateGuestProgressToAccount().catch(() => {});
    }
  }

  async signInWithOAuth(provider) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, error: 'Serviço de contas online (Supabase) não configurado neste ambiente.' };
    if (!['google', 'discord'].includes(provider)) {
      return { ok: false, error: 'Provedor OAuth não suportado.' };
    }
    try {
      const redirectTo = getOAuthRedirectUrl();
      const options = {
        redirectTo,
        ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {})
      };
      const { data, error } = await client.auth.signInWithOAuth({ provider, options });
      if (error) return { ok: false, error: translateAuthError(error, provider) };
      if (!data?.url) {
        return { ok: false, error: translateAuthError('provider is not enabled', provider) };
      }
      return { ok: true, url: data.url };
    } catch (err) {
      return { ok: false, error: translateAuthError(err, provider) };
    }
  }

  async linkOAuthIdentity(provider) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, error: 'Serviço de contas online (Supabase) não configurado neste ambiente.' };
    if (!['google', 'discord'].includes(provider)) {
      return { ok: false, error: 'Provedor inválido.' };
    }
    const user = await this.getCurrentUser();
    if (!user) {
      return { ok: false, error: 'Faça login primeiro para vincular Google ou Discord à sua conta.' };
    }
    const linked = this.getLinkedIdentities(user);
    if (linked[provider]) {
      return { ok: true, alreadyLinked: true, message: `${provider === 'google' ? 'Google' : 'Discord'} já está vinculado a esta conta!` };
    }
    try {
      if (typeof client.auth.linkIdentity === 'function') {
        const redirectTo = getOAuthRedirectUrl();
        const { data, error } = await client.auth.linkIdentity({
          provider,
          options: { redirectTo }
        });
        if (error) return { ok: false, error: translateAuthError(error, provider) };
        return { ok: true, url: data?.url };
      }
      return await this.signInWithOAuth(provider);
    } catch (err) {
      return { ok: false, error: translateAuthError(err, provider) };
    }
  }

  exportPersonalDataLGPD() {
    const pkg = Save.exportSavePackage();
    const prof = this.getLocalProfile();
    const stats = this.getStatsSnapshot();
    const linked = this.getLinkedIdentities(this._cachedUser);
    const payload = {
      schema: 'dino-dash-3d-lgpd-export-v1',
      exportedAt: new Date().toISOString(),
      legalBasis: 'LGPD Art. 18 (Portabilidade e Acesso aos Dados)',
      account: this._cachedUser ? {
        id: this._cachedUser.id,
        providers: linked.providers,
        email: this._cachedUser.email && !this._cachedUser.email.endsWith('@player.dinodash.internal')
          ? this._cachedUser.email
          : null
      } : { mode: 'guest_local' },
      profile: prof,
      stats,
      saveData: pkg.data
    };
    const json = JSON.stringify(payload, null, 2);
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dino-dash-3d-dados-lgpd-${prof.nickname.toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 250);
    }
    return { ok: true, payload };
  }

  async logout(scope = 'local') {
    const client = getSupabaseClient();
    if (!client) return { ok: true };
    try {
      await client.auth.signOut({ scope: scope === 'global' ? 'global' : 'local' });
      this._cachedUser = null;
      return { ok: true };
    } catch (err) {
      return { ok: false, error: translateAuthError(err) };
    }
  }

  /**
   * Migra o progresso local (convidado) para a conta autenticada após criar backup automático.
   */
  async migrateGuestProgressToAccount() {
    const client = getSupabaseClient();
    const user = await this.getCurrentUser();
    if (!client || !user) {
      return { ok: false, error: 'Faça login para sincronizar seu progresso na nuvem.' };
    }

    Save.createAutoBackup();
    const prof = this.getLocalProfile();
    const stats = this.getStatsSnapshot();

    const nickCheck = validateNickname(prof.nickname);
    const safeNick = nickCheck.ok ? nickCheck.value : `Dino_${user.id.slice(0, 6)}`;

    await client.from('player_profiles').upsert({
      id: user.id,
      nickname: safeNick,
      nickname_lower: safeNick.toLowerCase(),
      bio: prof.bio,
      is_public: prof.isPublic,
      avatar_config: prof.avatar,
      showcase_achievements: prof.showcaseAchievements,
      stats,
      level: prof.level,
      xp: prof.xp,
      active_title: prof.activeTitle,
      banner_id: prof.bannerId,
      frame_id: prof.frameId,
      updated_at: new Date().toISOString()
    });

    const achIds = Array.isArray(Save.data.achievements) ? Save.data.achievements : [];
    if (achIds.length > 0 && !Save.isImportedSave()) {
      const rows = achIds.slice(0, 200).map((aid) => ({
        user_id: user.id,
        achievement_id: aid,
        source: 'migrated'
      }));
      await client.from('player_achievements').upsert(rows, { onConflict: 'user_id,achievement_id' });
    }

    await client.from('player_cloud_saves').upsert({
      user_id: user.id,
      schema_version: Save.data.schemaVersion || 4,
      save_data: Save.exportSavePackage().data,
      updated_at: new Date().toISOString()
    });

    return { ok: true };
  }

  async syncProfileFromCloud() {
    const client = getSupabaseClient();
    const user = await this.getCurrentUser();
    if (!client || !user) return { ok: false };

    const { data: cloudProf } = await client
      .from('player_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (cloudProf) {
      if (!Save.data.profile) Save.data.profile = {};
      Save.data.profile.nickname = cloudProf.nickname || Save.data.profile.nickname;
      Save.data.profile.bio = sanitizeBio(cloudProf.bio || '');
      Save.data.profile.isPublic = cloudProf.is_public !== false;
      if (cloudProf.avatar_config) Save.data.profile.avatar = cloudProf.avatar_config;
      if (Array.isArray(cloudProf.showcase_achievements)) {
        Save.data.profile.showcaseAchievements = cloudProf.showcase_achievements.slice(0, 4);
      }
      if (cloudProf.banner_id) Save.data.profile.bannerId = cloudProf.banner_id;
      if (cloudProf.frame_id) Save.data.profile.frameId = cloudProf.frame_id;
      if (cloudProf.nickname_changed_at) {
        Save.data.profile.nicknameChangedAt = new Date(cloudProf.nickname_changed_at).getTime();
      }
      if (cloudProf.active_title) Save.data.activeTitle = cloudProf.active_title;
      if (!Save.data.network) Save.data.network = {};
      Save.data.network.nickname = Save.data.profile.nickname;
      Save.save();
    }

    const { data: cloudAch } = await client
      .from('player_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    if (Array.isArray(cloudAch)) {
      for (const row of cloudAch) {
        if (row?.achievement_id && !Save.data.achievements.includes(row.achievement_id)) {
          Save.data.achievements.push(row.achievement_id);
        }
      }
      Save.save();
    }

    return { ok: true, profile: cloudProf || null };
  }

  async updateProfile(patch = {}) {
    if (!Save.data.profile) Save.data.profile = {};
    const cur = this.getLocalProfile();

    if (patch.nickname !== undefined && patch.nickname.trim() !== cur.nickname) {
      const nickCheck = validateNickname(patch.nickname);
      if (!nickCheck.ok) return nickCheck;

      const lastChanged = Number(cur.nicknameChangedAt || 0);
      if (lastChanged > 0 && Date.now() - lastChanged < NICKNAME_CHANGE_COOLDOWN_MS) {
        const daysLeft = Math.ceil((NICKNAME_CHANGE_COOLDOWN_MS - (Date.now() - lastChanged)) / (24 * 60 * 60 * 1000));
        return { ok: false, error: `Você poderá alterar seu apelido novamente em ${daysLeft} dia(s).` };
      }

      const user = await this.getCurrentUser();
      if (user) {
        const res = await this._invokeNickLogin({
          action: 'change_nickname',
          nickname: nickCheck.value
        });
        if (!res.ok) return res;
      }

      Save.data.profile.nickname = nickCheck.value;
      Save.data.profile.nicknameChangedAt = Date.now();
      if (!Save.data.network) Save.data.network = {};
      Save.data.network.nickname = nickCheck.value;
    }

    if (patch.bio !== undefined) {
      Save.data.profile.bio = sanitizeBio(patch.bio, 160);
    }
    if (patch.isPublic !== undefined) {
      Save.data.profile.isPublic = !!patch.isPublic;
    }
    if (patch.avatar && typeof patch.avatar === 'object') {
      Save.data.profile.avatar = {
        ...cur.avatar,
        ...patch.avatar,
        zoom: Math.max(0.65, Math.min(1.65, Number(patch.avatar.zoom ?? cur.avatar.zoom ?? 1.0)))
      };
    }
    if (Array.isArray(patch.showcaseAchievements)) {
      Save.data.profile.showcaseAchievements = patch.showcaseAchievements.slice(0, 4);
    }
    if (patch.bannerId) Save.data.profile.bannerId = String(patch.bannerId).slice(0, 32);
    if (patch.frameId) Save.data.profile.frameId = String(patch.frameId).slice(0, 32);
    if (patch.activeTitle && Save.data.unlockedTitles?.includes(patch.activeTitle)) {
      Save.data.activeTitle = patch.activeTitle;
    }

    Save.save();

    const client = getSupabaseClient();
    const user = await this.getCurrentUser();
    if (client && user) {
      const updated = this.getLocalProfile();
      await client.from('player_profiles').update({
        bio: updated.bio,
        is_public: updated.isPublic,
        avatar_config: updated.avatar,
        showcase_achievements: updated.showcaseAchievements,
        banner_id: updated.bannerId,
        frame_id: updated.frameId,
        active_title: updated.activeTitle,
        stats: this.getStatsSnapshot(),
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
    }

    return { ok: true, profile: this.getLocalProfile() };
  }

  /**
   * Exclusão completa LGPD Art. 18 (nuvem + Auth + local).
   */
  async deleteAccountAndCloudData() {
    const client = getSupabaseClient();
    const user = await this.getCurrentUser();
    let cloudStatus = 'offline';

    if (client) {
      if (user) {
        const delRes = await this._invokeNickLogin({ action: 'delete_account' });
        cloudStatus = delRes.ok ? 'conta e dados na nuvem removidos' : (delRes.error || 'parcial');
      }
      const wipeRes = await requestCloudDataWipe(client);
      if (wipeRes?.ok && cloudStatus === 'offline') {
        cloudStatus = 'nuvem removida';
      }
      await client.auth.signOut().catch(() => {});
    }

    clearLocalCreatedAccountMarker();
    await Save.wipeAllLocalData();
    this._cachedUser = null;
    return { ok: true, cloudStatus };
  }
}

export const AuthProfile = new AuthProfileSystem();
