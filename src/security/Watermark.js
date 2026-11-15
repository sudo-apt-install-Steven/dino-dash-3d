// Marca d'água forense discreta (metadados de build + carimbo em capturas) sem impacto no loop 3D a 60 FPS.

export const BUILD_OWNER = 'Steven Tayllon teixeira Jerônimo De Melos';
export const BUILD_DOMAIN = 'dino-dash-3d-six.vercel.app';
export const BUILD_EDITION = import.meta.env?.VITE_APP_EDITION || 'public-free';

function computeShortDigest(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function getBuildSignature() {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'offline';
  const raw = `${BUILD_OWNER}|${BUILD_DOMAIN}|${BUILD_EDITION}|${host}`;
  return `DD3D-${computeShortDigest(raw).toUpperCase()}`;
}

/**
 * Registra metadados discretos uma única vez no carregamento (custo zero por frame).
 */
export function attachForensicMeta() {
  if (typeof document === 'undefined') return;
  const sig = getBuildSignature();
  document.documentElement.dataset.dinoSignature = sig;
  document.documentElement.dataset.dinoEdition = BUILD_EDITION;
  return sig;
}

/**
 * Exporta captura PNG do canvas 3D com marca d'água discreta de autoria e domínio oficial.
 */
export function exportWatermarkedSnapshot(sourceCanvas, filenamePrefix = 'dino-dash-3d-foto') {
  if (!sourceCanvas || typeof document === 'undefined') return false;
  try {
    const w = sourceCanvas.width || 1280;
    const h = sourceCanvas.height || 720;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(sourceCanvas, 0, 0, w, h);

    const tag = `DINO DASH 3D • ${BUILD_DOMAIN} • © Steven Tayllon [${getBuildSignature()}]`;
    const fontSize = Math.max(12, Math.round(h * 0.02));
    ctx.font = `700 ${fontSize}px system-ui, Segoe UI, sans-serif`;
    const metrics = ctx.measureText(tag);
    const padX = 12;
    const padY = 8;
    const boxW = metrics.width + padX * 2;
    const boxH = fontSize + padY * 2;

    ctx.fillStyle = 'rgba(9, 9, 11, 0.58)';
    ctx.fillRect(w - boxW - 14, h - boxH - 12, boxW, boxH);
    ctx.fillStyle = 'rgba(255, 244, 214, 0.88)';
    ctx.fillText(tag, w - boxW - 14 + padX, h - 12 - padY);

    const url = out.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}
