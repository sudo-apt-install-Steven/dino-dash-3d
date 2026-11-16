// Detecção confiável de dispositivo (PC vs Celular/Tablet) baseada em ponteiro/toque e dimensões de tela,
// sem depender apenas do User-Agent (suporta DevTools touch, tablets e telas híbridas).

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches || false;
  const noHover = window.matchMedia?.('(hover: none)')?.matches || false;
  const hasTouch = (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
  const minDim = Math.min(window.innerWidth || 1280, window.innerHeight || 720);
  const maxDim = Math.max(window.innerWidth || 1280, window.innerHeight || 720);

  if (coarse && (hasTouch || noHover) && maxDim <= 1366) {
    return true;
  }
  if (hasTouch && minDim <= 820 && maxDim <= 1180) {
    return true;
  }
  return false;
}

export function isDesktopDevice() {
  return !isMobileDevice();
}
