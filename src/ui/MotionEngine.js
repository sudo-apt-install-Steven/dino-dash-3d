// Motor central de Motion, Micro-Interações GPU, Contadores Animados e Gestos Mobile (Swipe-to-Dismiss).
// Respeita automaticamente Save.data.lowSpecMode, prefers-reduced-motion e opção "Sem Animação".
import { Save } from '../systems/Save.js';

export function shouldReduceMotion() {
  if (Save?.data?.lowSpecMode) return true;
  if (Save?.data?.settings?.noDiceAnimation) return true;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch {}
  }
  return false;
}

/**
 * Aplica entrada escalonada (staggered reveal) via transform + opacity nos elementos filhos.
 */
export function staggerChildrenReveal(container, selector = '[data-stagger]', stepMs = 38) {
  if (!container) return;
  const items = Array.from(container.querySelectorAll(selector));
  if (!items.length) return;
  const reduce = shouldReduceMotion();
  items.forEach((el, idx) => {
    if (reduce) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }
    el.style.animationDelay = `${Math.min(idx * stepMs, 260)}ms`;
    el.classList.add('dd-anim-enter');
  });
}

/**
 * Anima um número (dano, soma de dados, XP, moedas) com interpolação easeOutExpo em 60 FPS.
 */
export function animateNumberRoll(el, fromVal, toVal, { durationMs = 420, prefix = '', suffix = '' } = {}) {
  if (!el) return () => {};
  const target = Math.round(Number(toVal) || 0);
  if (shouldReduceMotion() || durationMs <= 0 || typeof requestAnimationFrame !== 'function') {
    el.textContent = `${prefix}${target}${suffix}`;
    return () => {};
  }
  const start = Math.round(Number(fromVal) || 0);
  const t0 = performance.now();
  let rafId = 0;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / durationMs);
    const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    const current = Math.round(start + (target - start) * eased);
    el.textContent = `${prefix}${current}${suffix}`;
    if (p < 1) {
      rafId = requestAnimationFrame(step);
    }
  };
  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}

/**
 * Conecta gesto mobile "Swipe Down to Dismiss" (deltaY > 50px) e clique no backdrop scrim.
 */
export function bindBottomSheetGestures(scrimEl, sheetEl, onClose) {
  if (!scrimEl || !sheetEl || typeof onClose !== 'function') return () => {};
  let startY = null;
  let deltaY = 0;

  const onScrimClick = (e) => {
    if (e.target === scrimEl) onClose();
  };

  const handle = sheetEl.querySelector('.dd-sheet-handle') || sheetEl;
  const onTouchStart = (e) => {
    if (sheetEl.scrollTop > 4) return;
    const t = e.touches?.[0];
    if (!t) return;
    startY = t.clientY;
    deltaY = 0;
  };
  const onTouchMove = (e) => {
    if (startY === null) return;
    const t = e.touches?.[0];
    if (!t) return;
    deltaY = Math.max(0, t.clientY - startY);
    if (deltaY > 0 && !shouldReduceMotion()) {
      sheetEl.style.transform = `translate3d(0, ${Math.min(160, deltaY * 0.75)}px, 0)`;
    }
  };
  const onTouchEnd = () => {
    if (startY === null) return;
    startY = null;
    sheetEl.style.transform = '';
    if (deltaY > 52) {
      onClose();
    }
    deltaY = 0;
  };

  scrimEl.addEventListener('click', onScrimClick);
  handle.addEventListener('touchstart', onTouchStart, { passive: true });
  handle.addEventListener('touchmove', onTouchMove, { passive: true });
  handle.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    scrimEl.removeEventListener('click', onScrimClick);
    handle.removeEventListener('touchstart', onTouchStart);
    handle.removeEventListener('touchmove', onTouchMove);
    handle.removeEventListener('touchend', onTouchEnd);
  };
}

/**
 * Dispara feedback visual cinematográfico de Crítico Natural (20) ou Falha Crítica (1).
 */
export function triggerDiceImpactFX(hostEl, { isCrit = false, isFumble = false } = {}) {
  if (!hostEl || shouldReduceMotion()) return;
  if (isCrit) {
    const ring = document.createElement('div');
    ring.style.cssText = [
      'position:absolute', 'left:50%', 'top:50%', 'width:130px', 'height:130px',
      'margin-left:-65px', 'margin-top:-65px', 'border-radius:9999px',
      'border:3px solid #facc15', 'box-shadow:0 0 38px rgba(250,204,21,0.78)',
      'pointer-events:none', 'z-index:20',
      'animation:ddCritShockwave 560ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
    ].join(';');
    hostEl.appendChild(ring);
    setTimeout(() => ring.remove(), 600);
  } else if (isFumble) {
    hostEl.classList.remove('dd-anim-fumble');
    void hostEl.offsetWidth;
    hostEl.classList.add('dd-anim-fumble');
  }
}
