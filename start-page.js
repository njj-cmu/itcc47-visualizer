/* Makes the tools link feel like a guided handoff instead of a placeholder jump. */
(function () {
  const current = typeof ITCC47Curriculum === 'undefined' ? null : ITCC47Curriculum.activeProfile();
  const checkpoint = current ? ITCC47Curriculum.getCheckpoint(current.currentCheckpointId) : null;
  const practiceLink = document.getElementById('open-current-practice');
  const currentCard = document.getElementById('current-checkpoint');
  if (checkpoint && practiceLink && currentCard) {
    practiceLink.href = `problem-list.html?module=${encodeURIComponent(checkpoint.moduleId.replace(/^m/, ''))}`;
    currentCard.innerHTML = `<span>Current module</span><strong>${ITCC47CurriculumUI.esc(checkpoint.title)}</strong><small>${ITCC47CurriculumUI.esc(checkpoint.summary)}</small>`;
  }
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
