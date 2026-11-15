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

/**
 * Normaliza apelidos de jogadores/hosts removendo caracteres de controle e HTML.
 */
export function sanitizeNickname(value, fallback = 'Dino', maxLen = 18) {
  const cleaned = String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>`"'\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
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
