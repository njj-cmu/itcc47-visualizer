/* Optional checkpoint companions governed by the same release resolver as activities and practice. */
(function () {
  const root = document.getElementById('lesson-root');
  const params = new URLSearchParams(location.search);
  const requested = params.get('checkpoint') || ITCC47Curriculum.activeProfile(ITCC47CurriculumUI.previewOptions()).currentCheckpointId;
  const checkpoint = ITCC47Curriculum.getCheckpoint(requested);
  const release = ITCC47Curriculum.stateForCheckpoint(requested, ITCC47CurriculumUI.previewOptions());
  if (!checkpoint || !['available', 'current'].includes(release.state)) {
    root.innerHTML = ITCC47CurriculumUI.lockedPanel(release, { title: checkpoint ? `${checkpoint.title} is not released yet` : 'Companion unavailable' });
    return;
  }

  const module = ITCC47Curriculum.getModule(checkpoint.moduleId);
  const companion = typeof ITCC47CheckpointCompanions === 'undefined' ? null : ITCC47CheckpointCompanions.get(checkpoint.id);
  if (!companion) {
    const target = new URL('problem-list.html', location.href);
    target.searchParams.set('module', module.number);
    if (params.get('preview') === '1') target.searchParams.set('preview', '1');
    location.replace(target.href);
    return;
  }

  const esc = ITCC47CurriculumUI.esc;
  const sequenceOrder = new Map((checkpoint.sequence || []).map((reference, index) => [reference, index]));
  const resources = ITCC47Curriculum.resourcesForCheckpoint(checkpoint.id)
    .filter((resource) => ['activity', 'problem'].includes(resource.kind))
    .sort((left, right) => (sequenceOrder.get(`${left.kind}:${left.id}`) ?? Number.MAX_SAFE_INTEGER) - (sequenceOrder.get(`${right.kind}:${right.id}`) ?? Number.MAX_SAFE_INTEGER));
  const labels = { activity: 'Visualize', problem: 'Practice' };
  const route = (resource) => resource.kind === 'activity'
    ? `visualizer.html?activity=${encodeURIComponent(resource.id)}`
    : `practice.html?module=${module.number}&problem=${encodeURIComponent(resource.id)}`;
  const progression = companion.referenceProgression ? `<section class="companion-progression" aria-labelledby="reference-progression-title"><p class="eyebrow">Reference progression</p><h2 id="reference-progression-title">From position to connection</h2><p>${esc(companion.referenceProgression.intro)}</p><ol>${companion.referenceProgression.items.map((item) => `<li><strong>${esc(item.structure)}</strong><span>${esc(item.question)}</span><em>${esc(item.reference)}</em></li>`).join('')}</ol></section>` : '';
  const codeComparison = companion.codeComparison ? `<section class="companion-code"><p class="eyebrow">Practical implementation</p><h2>The small Python-list version</h2><pre aria-label="${esc(companion.codeComparison.language)} example"><code>${companion.codeComparison.lines.map(esc).join('\n')}</code></pre><p>${esc(companion.codeComparison.note)}</p></section>` : '';

  root.innerHTML = `<nav class="lesson-breadcrumb" aria-label="Lesson breadcrumb"><a href="${ITCC47CurriculumUI.href('problems.html?view=midterm')}">Midterm Review</a><span>Module ${module.number}</span></nav>
    <article class="lesson-companion">
      <header>${ITCC47CurriculumUI.badge(release.state)}<p class="eyebrow">Module ${module.number} · CLO ${module.cloIds.join(', ')}</p><h1>${esc(checkpoint.title)}</h1><p>${esc(checkpoint.summary)}</p></header>
      <section class="companion-mental"><p class="eyebrow">Mental model</p><h2>What to picture</h2><p>${esc(companion.mentalModel)}</p><strong class="companion-thesis">${esc(companion.thesis)}</strong><dl class="companion-vocabulary">${companion.vocabulary.map(([term, definition]) => `<div><dt>${esc(term)}</dt><dd>${esc(definition)}</dd></div>`).join('')}</dl></section>
      ${codeComparison}
      <section class="companion-trace"><p class="eyebrow">Worked trace</p><h2>One Recent Documents operation</h2><div class="companion-trace-wrap" role="region" aria-label="Scrollable worked trace" tabindex="0"><table><thead><tr><th>Moment</th><th>State</th><th>Why it is valid</th></tr></thead><tbody>${companion.workedTrace.map(([step, state, why]) => `<tr><th>${esc(step)}</th><td><code>${esc(state)}</code></td><td>${esc(why)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="companion-invariants"><p class="eyebrow">Invariants and complexity</p><h2>What must stay true</h2><ul>${companion.invariants.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>
      <section class="companion-misconceptions"><p class="eyebrow">Common misconceptions</p><h2>Catch the tempting mistake</h2><ul>${companion.misconceptions.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>
      ${progression}
      <section class="companion-self-check"><p class="eyebrow">Self-check</p><h2>Explain before revealing</h2>${companion.selfChecks.map(([question, answer], index) => `<details><summary>${index + 1}. ${esc(question)}</summary><p>${esc(answer)}</p></details>`).join('')}</section>
      <section class="companion-next"><p class="eyebrow">Learn → Visualize → Practice</p><h2>Continue the checkpoint</h2><ol class="lesson-sequence">${resources.map((resource) => { const state = ITCC47Curriculum.stateForResource(resource.kind, resource.id, ITCC47CurriculumUI.previewOptions()); const open = ['available', 'current'].includes(state.state); return `<li><span>${labels[resource.kind]}</span><strong>${esc(resource.title || resource.id)}</strong>${open ? `<a href="${ITCC47CurriculumUI.href(route(resource))}">Open</a>` : ITCC47CurriculumUI.badge(state.state)}</li>`; }).join('')}</ol></section>
    </article>`;
})();
