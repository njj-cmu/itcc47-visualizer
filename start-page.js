/* Makes the tools link feel like a guided handoff instead of a placeholder jump. */
(function () {
  const link = document.getElementById('explore-tools');
  const section = document.getElementById('tools');
  const heading = document.getElementById('tools-heading');
  if (!link || !section || !heading) return;

  link.addEventListener('click', (event) => {
    event.preventDefault();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.classList.remove('is-arriving');
    section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    try { history.pushState(null, '', '#tools'); } catch (error) { /* file:// may restrict history */ }

    requestAnimationFrame(() => {
      section.classList.add('is-arriving');
      heading.tabIndex = -1;
      window.setTimeout(() => heading.focus({ preventScroll: true }), reducedMotion ? 0 : 420);
      window.setTimeout(() => section.classList.remove('is-arriving'), reducedMotion ? 0 : 900);
    });
  });
})();
