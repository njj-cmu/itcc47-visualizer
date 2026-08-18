/* Shared, dependency-free presentation helpers for curriculum-governed pages. */
const ITCC47CurriculumUI = (() => {
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));

  function previewOptions() {
    return { preview: ITCC47Curriculum.isPreviewRequested() };
  }

  function href(path) {
    if (!ITCC47Curriculum.isPreviewRequested()) return path;
    const url = new URL(path, location.href);
    url.searchParams.set('preview', '1');
    return `${url.pathname.split('/').pop()}${url.search}${url.hash}`;
  }

  function badge(state) {
    return `<span class="release-badge release-${esc(state)}">${esc(state)}</span>`;
  }

  function requirement(result) {
    if (result.state === 'planned') return 'This topic is listed in the roadmap and is still being prepared.';
    return 'This topic is scheduled for a later module. You can keep working through the available topics in the meantime.';
  }

  function lockedPanel(result, options = {}) {
    const current = result.current?.title || 'the current module';
    const currentModule = String(result.current?.moduleId || 'm1').replace(/^m/, '');
    return `<section class="curriculum-lock" role="status" aria-labelledby="curriculum-lock-title">
      <h1 id="curriculum-lock-title">${esc(options.title || 'This topic is coming later')}</h1>
      <p>${requirement(result)}</p>
      <div class="curriculum-lock-requirement"><span aria-hidden="true">→</span><div><small>Available after</small><strong>${esc(result.checkpoint?.title || 'Curriculum review')}</strong></div></div>
      <div class="curriculum-lock-actions"><a class="btn btn-primary" href="${href(`problem-list.html?module=${encodeURIComponent(currentModule)}`)}">Continue with Module ${esc(currentModule)} <span aria-hidden="true">→</span></a><a class="btn" href="${href('problems.html?view=visualizations')}">Explore available visualizations</a></div>
      <p class="curriculum-lock-note">Currently studying: ${esc(current)}. Your saved practice remains in this browser.</p>
    </section>`;
  }

  function mountPreviewControls(target) {
    if (!target || !ITCC47Curriculum.hasInstructorAccess() || target.querySelector('.release-preview')) return;
    const active = ITCC47Curriculum.activeProfile(previewOptions());
    const controls = document.createElement('div');
    controls.id = 'release-controls';
    const details = document.createElement('details');
    details.className = 'release-preview';
    details.innerHTML = `<summary>Instructor preview</summary><div class="release-preview-body">
      <p>Private preview changes only this authorized browser. It never advances the deployed semester profile.</p>
      <label>Preview checkpoint<select></select></label>
      <div><button type="button" data-preview-apply>Apply preview</button><button type="button" data-preview-exit>Exit instructor mode</button></div>
      <small>${active.preview ? `Previewing through ${esc(active.currentCheckpointId)}` : 'Preview mode is off.'}</small>
    </div>`;
    const select = details.querySelector('select');
    ITCC47Curriculum.checkpoints.forEach((checkpoint) => {
      const option = document.createElement('option'); option.value = checkpoint.id;
      option.textContent = `${checkpoint.moduleId.toUpperCase()} · ${checkpoint.title}`;
      option.selected = checkpoint.id === active.currentCheckpointId;
      select.appendChild(option);
    });
    details.querySelector('[data-preview-apply]').addEventListener('click', () => {
      ITCC47Curriculum.writePreview(select.value);
      const url = new URL(location.href); url.searchParams.set('preview', '1'); location.href = url.href;
    });
    details.querySelector('[data-preview-exit]').addEventListener('click', () => {
      ITCC47Curriculum.revokeInstructorAccess();
      const url = new URL(location.href); url.searchParams.delete('preview'); url.searchParams.delete(ITCC47Curriculum.INSTRUCTOR_QUERY_KEY); location.href = url.href;
    });
    controls.appendChild(details);
    target.appendChild(controls);
  }

  function mountDraftPreviewIndicator() {
    const profile = ITCC47Curriculum.activeProfile(previewOptions());
    const checkpoint = ITCC47Curriculum.getCheckpoint(profile.currentCheckpointId);
    if (!profile.preview || checkpoint?.reviewStatus !== 'draft' || document.querySelector('.draft-preview-indicator')) return;
    const indicator = document.createElement('div');
    indicator.className = 'draft-preview-indicator';
    indicator.setAttribute('role', 'status');
    indicator.innerHTML = `<strong>Draft preview</strong><span>${esc(checkpoint.title)} is open for instructor review and is not part of the student release.</span>`;
    document.body.prepend(indicator);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDraftPreviewIndicator, { once: true });
  else mountDraftPreviewIndicator();

  return Object.freeze({ esc, previewOptions, href, badge, requirement, lockedPanel, mountPreviewControls, mountDraftPreviewIndicator });
})();
