// Trava leve de domínio oficial e proteção anti-iframe (complementar a CSP frame-ancestors 'none').
import { escapeHtml } from './Sanitize.js';

export const OFFICIAL_PROD_DOMAIN = 'dino-dash-3d-six.vercel.app';
export const OFFICIAL_PROD_URL = `https://${OFFICIAL_PROD_DOMAIN}`;

const LOCAL_HOST_SET = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function isPrivateLanHost(hostname) {
  if (!hostname) return false;
  if (hostname.endsWith('.local')) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const m172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (m172) {
    const second = Number(m172[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

function getConfiguredExtraDomains() {
  const raw = import.meta.env?.VITE_ALLOWED_DOMAINS || '';
  return String(raw)
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0])
    .filter((host) => host && host !== '*' && !host.includes('*'));
}

/**
 * Verifica uma única vez no boot se a execução ocorre em domínio autorizado e fora de iframe malicioso.
 */
export function verifyAuthorizedDomain() {
  if (typeof window === 'undefined') {
    return { allowed: true, reason: 'ssr', hostname: 'ssr' };
  }

  const hostname = String(window.location.hostname || '').trim().toLowerCase();

  let embeddedInFrame = false;
  try {
    embeddedInFrame = window.top !== window.self;
  } catch {
    embeddedInFrame = true;
  }

  if (embeddedInFrame) {
    return {
      allowed: false,
      reason: 'frame_embed',
      hostname
    };
  }

  if (hostname === OFFICIAL_PROD_DOMAIN) {
    return { allowed: true, reason: 'official_domain', hostname };
  }

  if (LOCAL_HOST_SET.has(hostname) || isPrivateLanHost(hostname)) {
    return { allowed: true, reason: 'local_or_lan', hostname };
  }

  const extra = getConfiguredExtraDomains();
  if (extra.includes(hostname)) {
    return { allowed: true, reason: 'env_allowlist', hostname };
  }

  return {
    allowed: false,
    reason: 'unauthorized_domain',
    hostname
  };
}

/**
 * Exibe aviso legal e bloqueia boot em cópias hospedadas fora dos domínios oficiais.
 */
export function renderUnauthorizedDomainNotice(rootEl, info) {
  if (!rootEl) return;
  const safeHost = escapeHtml(info?.hostname || 'desconhecido');
  const title = info?.reason === 'frame_embed'
    ? 'Incorporação em Iframe Bloqueada'
    : 'Cópia / Domínio Não Autorizado';
  rootEl.innerHTML = `
    <div class="overlay-center" style="background:radial-gradient(circle at top,#2a1409,#09090b); padding:20px;">
      <div class="chunky-panel modal-card" style="max-width:540px; text-align:center; border-color:#ef4444;">
        <h2 style="color:#fca5a5;">🛡️ DINO DASH 3D — ${title}</h2>
        <p style="color:#e5d3bc; font-size:0.92rem; line-height:1.5;">
          Este aplicativo é obra intelectual proprietária protegida por direitos autorais
          (<strong>Steven Tayllon teixeira Jerônimo De Melos</strong> • Lei nº 9.609/98 e Lei nº 9.610/98)
          e não possui autorização para execução em <code>${safeHost}</code>.
        </p>
        <p style="color:#fde68a; font-size:0.86rem;">
          Acesse a versão oficial e segura diretamente no domínio oficial:
        </p>
        <a href="${OFFICIAL_PROD_URL}" rel="noopener noreferrer" class="chunky-btn" style="text-decoration:none; display:inline-block;">
          🦖 Abrir DINO DASH 3D Oficial
        </a>
      </div>
    </div>
  `;
}
