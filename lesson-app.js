/* Reviewed checkpoint companions governed by the same release resolver as activities and practice. */
(function () {
  const root = document.getElementById('lesson-root');
  const params = new URLSearchParams(location.search);
  const requested = params.get('checkpoint') || ITCC47Curriculum.activeProfile(ITCC47CurriculumUI.previewOptions()).currentCheckpointId;
  const checkpoint = ITCC47Curriculum.getCheckpoint(requested);
  const result = ITCC47Curriculum.stateForCheckpoint(requested, ITCC47CurriculumUI.previewOptions());
  if (!checkpoint || !['available', 'current'].includes(result.state)) {
    root.innerHTML = ITCC47CurriculumUI.lockedPanel(result, { title: checkpoint ? `${checkpoint.title} is not released yet` : 'Companion unavailable' });
    return;
  }
  const module = ITCC47Curriculum.getModule(checkpoint.moduleId);
  const resources = ITCC47Curriculum.resourcesForCheckpoint(checkpoint.id);
  const companion = typeof ITCC47CheckpointCompanions === 'undefined' ? null : ITCC47CheckpointCompanions.get(checkpoint.id);
  const labels = { activity: 'Visualization', problem: 'Practice' };
  const route = (resource) => resource.kind === 'activity'
    ? `visualizer.html?activity=${resource.id}`
    : `practice.html?module=${module.number}&problem=${resource.id}`;
  const practiceResources = resources.filter((resource) => ['activity', 'problem'].includes(resource.kind));
  const teachingContent = companion ? `
    <section class="companion-mental"><p class="eyebrow">Mental model</p><h2>What to picture</h2><p>${ITCC47CurriculumUI.esc(companion.mentalModel)}</p><dl class="companion-vocabulary">${companion.vocabulary.map(([term,definition]) => `<div><dt>${ITCC47CurriculumUI.esc(term)}</dt><dd>${ITCC47CurriculumUI.esc(definition)}</dd></div>`).join('')}</dl></section>
    <section class="companion-trace"><p class="eyebrow">Worked trace</p><h2>Follow one complete idea</h2><div class="companion-trace-wrap" role="region" aria-label="Scrollable worked trace" tabindex="0"><table><thead><tr><th>Moment</th><th>State</th><th>Why it is valid</th></tr></thead><tbody>${companion.workedTrace.map(([step,state,why]) => `<tr><th>${ITCC47CurriculumUI.esc(step)}</th><td><code>${ITCC47CurriculumUI.esc(state)}</code></td><td>${ITCC47CurriculumUI.esc(why)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="companion-invariants"><p class="eyebrow">Invariants and complexity</p><h2>What must stay true</h2><ul>${companion.invariants.map((item) => `<li>${ITCC47CurriculumUI.esc(item)}</li>`).join('')}</ul></section>
    <section class="companion-misconceptions"><p class="eyebrow">Common misconceptions</p><h2>Catch the tempting mistake</h2><ul>${companion.misconceptions.map((item) => `<li>${ITCC47CurriculumUI.esc(item)}</li>`).join('')}</ul></section>
    <section class="companion-self-check"><p class="eyebrow">Self-check</p><h2>Explain before revealing</h2>${companion.selfChecks.map(([question,answer],index) => `<details><summary>${index + 1}. ${ITCC47CurriculumUI.esc(question)}</summary><p>${ITCC47CurriculumUI.esc(answer)}</p></details>`).join('')}</section>`
    : `<section><h2>By the end of this checkpoint</h2><ul>${checkpoint.goals.map((goal) => `<li>${ITCC47CurriculumUI.esc(goal)}</li>`).join('')}</ul></section>`;
  root.innerHTML = `<nav class="lesson-breadcrumb"><a href="${ITCC47CurriculumUI.href('problems.html')}">Roadmap</a><span>Module ${module.number}</span></nav>
    <article class="lesson-companion"><header>${ITCC47CurriculumUI.badge(result.state)}<p class="eyebrow">Module ${module.number} · CLO ${module.cloIds.join(', ')}</p><h1>${ITCC47CurriculumUI.esc(checkpoint.title)}</h1><p>${ITCC47CurriculumUI.esc(checkpoint.summary)}</p></header>
    ${teachingContent}
    <section class="companion-next"><h2>Try it yourself</h2><p>Use the synchronized visualization first, then solve a related practice problem.</p><ol class="lesson-sequence">${practiceResources.map((resource) => { const state = ITCC47Curriculum.stateForResource(resource.kind,resource.id,ITCC47CurriculumUI.previewOptions()); const open = ['available','current'].includes(state.state); return `<li><span>${labels[resource.kind]}</span><strong>${ITCC47CurriculumUI.esc(resource.title || resource.id)}</strong>${open ? `<a href="${ITCC47CurriculumUI.href(route(resource))}">Open</a>` : ITCC47CurriculumUI.badge(state.state)}</li>`; }).join('')}</ol></section>
    <aside><strong>Manual release</strong><p>Viewing or completing these resources does not unlock the next lecture. The instructor advances the semester profile explicitly.</p></aside></article>`;
})();
