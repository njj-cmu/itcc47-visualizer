/*
 * A small rich-tooltip helper.
 *
 * Deliberately dependency-free: this project runs straight from the folder with
 * no build step, so a CDN script would break it offline and on file:// URLs.
 * The positioning need here is modest — flip above/below, clamp to the viewport,
 * point an arrow at the target — which is far less than Floating UI solves.
 *
 * Usage:
 *   Tooltip.bind(container, '.selector', (el) => htmlStringOrNull);
 * The content callback runs on hover/focus, so it always reflects current state.
 */
const Tooltip = (() => {
  const GAP = 10;       // distance between target and tooltip
  const EDGE = 8;       // minimum distance from the viewport edge
  const DELAY = 90;     // ms before showing, so passing the cursor over is quiet

  let tipEl = null;
  let arrowEl = null;
  let showTimer = null;
  let activeTarget = null;

  function ensureEl() {
    if (tipEl) return;
    tipEl = document.createElement('div');
    tipEl.className = 'tip';
    tipEl.setAttribute('role', 'tooltip');
    arrowEl = document.createElement('span');
    arrowEl.className = 'tip-arrow';
    tipEl.appendChild(arrowEl);
    document.body.appendChild(tipEl);
  }

  function place(target) {
    const t = target.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const w = tipEl.offsetWidth;
    const h = tipEl.offsetHeight;

    // prefer above; flip below when there is not enough room
    let top = t.top - h - GAP;
    let below = false;
    if (top < EDGE) {
      top = t.bottom + GAP;
      below = true;
    }
    // if it would now overflow the bottom too, pin to whichever side has room
    if (below && top + h > vh - EDGE) {
      top = Math.max(EDGE, Math.min(top, vh - h - EDGE));
    }

    const targetCenter = t.left + t.width / 2;
    let left = targetCenter - w / 2;
    left = Math.max(EDGE, Math.min(left, vw - w - EDGE));

    tipEl.style.top = `${Math.round(top)}px`;
    tipEl.style.left = `${Math.round(left)}px`;
    tipEl.classList.toggle('tip-below', below);

    // keep the arrow pointing at the target even after horizontal clamping
    const arrowX = Math.max(12, Math.min(targetCenter - left, w - 12));
    arrowEl.style.left = `${Math.round(arrowX)}px`;
  }

  function show(target, html) {
    ensureEl();
    activeTarget = target;
    // rebuild content, keeping the arrow node
    tipEl.innerHTML = html;
    tipEl.appendChild(arrowEl);
    tipEl.classList.add('tip-visible');
    place(target);
  }

  function hide() {
    clearTimeout(showTimer);
    activeTarget = null;
    if (tipEl) tipEl.classList.remove('tip-visible');
  }

  function bind(container, selector, getHtml) {
    const open = (e) => {
      const target = e.target.closest(selector);
      if (!target || !container.contains(target)) return;
      const html = getHtml(target);
      if (!html) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(() => show(target, html), DELAY);
    };
    const close = (e) => {
      const target = e.target.closest(selector);
      if (!target) return;
      hide();
    };

    container.addEventListener('mouseover', open);
    container.addEventListener('mouseout', close);
    container.addEventListener('focusin', open);
    container.addEventListener('focusout', close);
  }

  // a fixed-position tooltip would drift away from its target on scroll/resize
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  return { bind, hide, reposition: () => { if (activeTarget) place(activeTarget); } };
})();
