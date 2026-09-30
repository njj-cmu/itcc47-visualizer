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
  const progression = companion.referenceProgression ? `<section id="lesson-progression" class="companion-progression" aria-labelledby="reference-progression-title"><p class="eyebrow">Reference progression</p><h2 id="reference-progression-title" tabindex="-1">From position to connection</h2><p>${esc(companion.referenceProgression.intro)}</p><ol>${companion.referenceProgression.items.map((item) => `<li><strong>${esc(item.structure)}</strong><span>${esc(item.question)}</span><em>${esc(item.reference)}</em></li>`).join('')}</ol></section>` : '';
  const codeComparison = companion.codeComparison ? `<section id="lesson-code" class="companion-code"><p class="eyebrow">Practical implementation</p><h2 tabindex="-1">The small Python-list version</h2><pre aria-label="${esc(companion.codeComparison.language)} example"><code>${companion.codeComparison.lines.map(esc).join('\n')}</code></pre><button type="button" class="btn btn-small" id="copy-companion-code">Copy Python example</button><span id="copy-companion-status" role="status"></span><p>${esc(companion.codeComparison.note)}</p></section>` : '';
  const diagram = checkpoint.id === 'm3-linked-foundations' ? `<figure class="companion-linked-diagram"><div class="companion-linked-nodes" role="img" tabindex="0" aria-label="Head Grades, linked in both directions to Syllabus, Attendance, Module3, then tail Notes.">${['Grades', 'Syllabus', 'Attendance', 'Module3', 'Notes'].map((name, index) => `<div><small>${index === 0 ? 'head ↓' : index === 4 ? 'tail ↓' : '&nbsp;'}</small><strong>${name}</strong><small>position: ${index}</small></div>${index < 4 ? '<span aria-hidden="true">⇄</span>' : ''}`).join('')}</div><figcaption>Five stable document identities, linked in order. Moving Attendance to the front changes its position and links; its identity stays the same.</figcaption></figure>` : '';
  const sections = [['mental', 'Mental model'], ['trace', 'Worked trace'], ['invariants', 'Invariants'], ['misconceptions', 'Common mistakes'], ['vocabulary', 'Vocabulary'], ['code', 'Python-list example'], ['progression', 'Reference progression'], ['self-check', 'Self-checks']];

  root.innerHTML = `<nav class="lesson-rail" aria-label="Lesson sections"><p><strong>ITCC47</strong><br>Data Structures and Algorithms</p><a class="lesson-return" href="${ITCC47CurriculumUI.href('problems.html?view=midterm')}">← Midterm Review<span>Module ${module.number}</span></a><ol>${sections.map(([id, label], index) => `<li><a href="#lesson-${id}"${index === 0 ? ' aria-current="location"' : ''}><span>${index + 1}</span>${label}</a></li>`).join('')}</ol></nav>
    <article class="lesson-companion">
      <div class="lesson-reading">
      <header><nav class="lesson-breadcrumb" aria-label="Lesson breadcrumb"><a href="${ITCC47CurriculumUI.href('problems.html?view=midterm')}">Midterm Review</a><span>/ Module ${module.number}</span></nav><h1>${esc(checkpoint.title)}</h1><p>${esc(checkpoint.summary)}</p><div class="lesson-release">${ITCC47CurriculumUI.badge(release.state)}<span>CLO ${module.cloIds.join(', ')}</span></div></header>
      <section id="lesson-mental" class="companion-mental"><h2 tabindex="-1"><span class="lesson-number">1</span>Mental model</h2><p>${esc(companion.mentalModel)}</p><strong class="companion-thesis">${esc(companion.thesis)}</strong>${diagram}</section>
      <section id="lesson-trace" class="companion-trace"><h2 tabindex="-1"><span class="lesson-number">2</span>Worked trace</h2><p>Move Attendance to the front using both representations.</p><div class="companion-trace-wrap" role="region" aria-label="Scrollable worked trace" tabindex="0"><table><thead><tr><th>Moment</th><th>State</th><th>Why it is valid</th></tr></thead><tbody>${companion.workedTrace.map(([step, state, why]) => `<tr><th scope="row">${esc(step)}</th><td><code>${esc(state)}</code></td><td>${esc(why)}</td></tr>`).join('')}</tbody></table></div></section>
      <section id="lesson-vocabulary"><h2 tabindex="-1">Vocabulary</h2><dl class="companion-vocabulary">${companion.vocabulary.map(([term, definition]) => `<div><dt>${esc(term)}</dt><dd>${esc(definition)}</dd></div>`).join('')}</dl></section>
      ${codeComparison}
      ${progression}
      <section id="lesson-self-check" class="companion-self-check"><p class="eyebrow">Self-check</p><h2 tabindex="-1">Explain before revealing</h2>${companion.selfChecks.map(([question, answer], index) => `<details><summary>${index + 1}. ${esc(question)}</summary><p>${esc(answer)}</p></details>`).join('')}</section>
      </div><aside class="lesson-support" aria-label="Invariants and continuation">
      <section id="lesson-invariants" class="companion-invariants"><h2 tabindex="-1"><span class="lesson-number">3</span>Invariants</h2><ul>${companion.invariants.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>
      <section id="lesson-misconceptions" class="companion-misconceptions"><h2 tabindex="-1"><span class="lesson-number">4</span>Common mistakes</h2><ul><li>${esc(companion.misconceptions[0])}</li></ul><details><summary>More misconceptions (${companion.misconceptions.length - 1})</summary><ul>${companion.misconceptions.slice(1).map(item => `<li>${esc(item)}</li>`).join('')}</ul></details></section>
      <section class="companion-next"><p class="eyebrow">Learn → Visualize → Practice</p><h2>Continue the checkpoint</h2><ol class="lesson-sequence">${resources.map((resource) => { const state = ITCC47Curriculum.stateForResource(resource.kind, resource.id, ITCC47CurriculumUI.previewOptions()); const open = ['available', 'current'].includes(state.state); return `<li><span>${labels[resource.kind]}</span><strong>${esc(resource.title || resource.id)}</strong>${open ? `<a href="${ITCC47CurriculumUI.href(route(resource))}">Open</a>` : ITCC47CurriculumUI.badge(state.state)}</li>`; }).join('')}</ol></section>
      </aside>
    </article>`;
  root.querySelectorAll('.lesson-rail a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    root.querySelectorAll('.lesson-rail a').forEach(item => item.removeAttribute('aria-current'));
    link.setAttribute('aria-current', 'location');
    const target = document.querySelector(link.getAttribute('href'));
    history.pushState(null, '', link.href);
    target.scrollIntoView({ block: 'start' });
    target.querySelector('h2').focus({ preventScroll: true });
  }));
  document.getElementById('copy-companion-code')?.addEventListener('click', async () => {
    const status = document.getElementById('copy-companion-status');
    try { await navigator.clipboard.writeText(companion.codeComparison.lines.join('\n')); status.textContent = ' Copied.'; }
    catch { status.textContent = ' Select the code above to copy it.'; }
  });
})();
