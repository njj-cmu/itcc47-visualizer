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
    if (result.state === 'planned') return 'This resource is visible on the roadmap but is not in the deployed course build yet.';
    return `Complete the lecture sequence through ${result.checkpoint ? esc(result.checkpoint.title) : 'its mapped checkpoint'} before using this resource.`;
  }

  function lockedPanel(result, options = {}) {
    const current = result.current?.title || 'the current lecture';
    return `<section class="curriculum-lock" role="status" aria-labelledby="curriculum-lock-title">
      ${badge(result.state)}
      <p class="eyebrow">Lecture-aligned access</p>
      <h1 id="curriculum-lock-title">${esc(options.title || 'This resource is not released yet')}</h1>
      <p>${requirement(result)}</p>
      <dl><div><dt>Current checkpoint</dt><dd>${esc(current)}</dd></div><div><dt>Required checkpoint</dt><dd>${esc(result.checkpoint?.title || 'Curriculum review')}</dd></div></dl>
      <div class="curriculum-lock-actions"><a class="btn btn-primary" href="${href(`lesson.html?checkpoint=${encodeURIComponent(result.current?.id || 'orientation')}`)}">Continue current lecture</a><a class="btn" href="${href('problems.html')}">View roadmap</a></div>
      <p class="curriculum-lock-note">Your saved drafts and practice progress remain in this browser while this resource is locked.</p>
    </section>`;
  }

  function mountPreviewControls(target) {
    if (!target) return;
    const active = ITCC47Curriculum.activeProfile(previewOptions());
    const details = document.createElement('details');
    details.className = 'release-preview';
    details.innerHTML = `<summary>Instructor preview</summary><div class="release-preview-body">
      <p>Preview changes only this browser. It never advances the deployed semester profile.</p>
      <label>Preview checkpoint<select></select></label>
      <div><button type="button" data-preview-apply>Apply preview</button><button type="button" data-preview-clear>Use deployed profile</button></div>
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
    details.querySelector('[data-preview-clear]').addEventListener('click', () => {
      ITCC47Curriculum.clearPreview(); const url = new URL(location.href); url.searchParams.delete('preview'); location.href = url.href;
    });
    target.appendChild(details);
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
