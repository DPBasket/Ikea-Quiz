/* IKEA QUIZ · micro-interactions. Presentation only: no game logic, no socket events.
 * - magnetic buttons: on a mouse, buttons lean a few pixels towards the pointer (CSS reads --mx/--my)
 * - a short tick of the vibration motor when a phone button is pressed
 * Works by delegation, so buttons that are re-rendered keep the behaviour. */
(function () {
  'use strict';
  const SEL = '.go, .btn, .act, .pbtn, .tcard, .modebar button, #sab .opt, #sab .tg button, .tlist button';
  const fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (fine && !still) {
    let cur = null;
    const reset = el => { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); };
    document.addEventListener('pointermove', e => {
      const el = e.target.closest && e.target.closest(SEL);
      if (cur && cur !== el) { reset(cur); cur = null; }
      if (!el || el.disabled) return;
      cur = el;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const k = Math.min(7, Math.max(3, r.width * 0.03));
      el.style.setProperty('--mx', (dx * k).toFixed(1) + 'px');
      el.style.setProperty('--my', (dy * k * 0.6).toFixed(1) + 'px');
    }, { passive: true });
    document.addEventListener('pointerleave', () => { if (cur) { reset(cur); cur = null; } }, true);
  }

  // phone: a tiny tick under the thumb (ignored where the browser has no vibration)
  if (!fine && navigator.vibrate) {
    document.addEventListener('pointerdown', e => {
      const el = e.target.closest && e.target.closest('.pa, .act, .pbtn, .btn, #sab .tg button');
      if (el && !el.disabled) { try { navigator.vibrate(8); } catch (err) {} }
    }, { passive: true, capture: true });
  }
})();
// canvases (race HUD, wheel, 3D signs) draw text with these fonts: ask for them early
if (document.fonts && document.fonts.load) ['800 20px "Plus Jakarta Sans"', '700 20px "Plus Jakarta Sans"', '700 20px "Space Mono"', '400 12px "Space Mono"']
  .forEach(f => document.fonts.load(f).catch(() => {}));
