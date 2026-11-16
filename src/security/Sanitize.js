// Higienização e sanitização de entradas de usuário/rede para prevenção contra XSS e injeção em DOM.

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;'
};

/**
 * Escapa caracteres HTML especiais antes de interpolar strings externas em templates innerHTML.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'/`]/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

const BLOCKED_NICK_PATTERNS = [
  /p[u\*]t[ao]/i, /c[a@]r[a@]lh/i, /f[o0]d[ae]/i, /p[o0]rr[a@]/i,
  /b[u\*]c[e3]t/i, /m[e3]rd[a@]/i, /v[i1][a@]d[o0]/i, /f[u\*]ck/i,
  /sh[i1]t/i, /b[i1]tch/i, /n[i1]gg/i, /r[a@]p[e3]/i
];

/**
 * Normaliza apelidos de jogadores/hosts removendo caracteres de controle, HTML e termos impróprios.
 */
export function sanitizeNickname(value, fallback = 'Dino', maxLen = 18) {
  let cleaned = String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>`"'\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  if (!cleaned) return fallback;
  if (BLOCKED_NICK_PATTERNS.some((rx) => rx.test(cleaned))) {
    return fallback;
  }
  return cleaned;
}

export function sanitizeRoomPassword(value, maxLen = 12) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>`"'\\\s]/g, '')
    .slice(0, maxLen);
}

/**
 * Sanitiza mensagens curtas de chat rápido em salas multiplayer.
 */
export function sanitizeChatText(value, maxLen = 120) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Restringe código de sala multiplayer estritamente a caracteres alfanuméricos maiúsculos (4 chars).
 */
export function sanitizeRoomCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

/**
 * Valida cor CSS hexadecimal (#RGB ou #RRGGBB) antes de uso em atributos style.
 */
export function sanitizeHexColor(value, fallback = '#ffd447') {
  const str = String(value ?? '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(str) ? str : fallback;
}
