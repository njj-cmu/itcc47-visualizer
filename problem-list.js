/* Module -> Problem navigation governed by the shared curriculum resolver. */
(function () {
  const moduleNumber = Number(new URLSearchParams(location.search).get('module') || 1);
  const moduleName = `Module ${moduleNumber}`;
  const module = ITCC47Curriculum.getModule(`m${moduleNumber}`);
  const problems = PROBLEMS.filter((problem) => problem.module === moduleName);
  const releaseOptions = ITCC47CurriculumUI.previewOptions();
  let solved = {}; let drafts = {};
  try {
    const stored = JSON.parse(localStorage.getItem('itcc47.practice-records:v2') || 'null');
    if (stored?.schemaVersion === 2) {
      problems.forEach((problem) => { const record = stored.records?.[problem.id]; if (record?.contentVersion === problem.contentVersion) { solved[problem.id] = Boolean(record.completed); drafts[problem.id] = record.draft; } });
    } else {
      solved = JSON.parse(localStorage.getItem('itcc47.problems.v1') || '{}') || {};
      drafts = JSON.parse(localStorage.getItem('itcc47.problems.code.v1') || '{}') || {};
    }
  } catch { /* optional storage */ }
  const esc = ITCC47CurriculumUI.esc;
  const cards = document.getElementById('problem-cards');
  document.getElementById('module-crumb').textContent = moduleName;
  document.getElementById('problem-list-heading').textContent = `${module?.title || moduleName}: select a problem`;

  if (!problems.length) {
    cards.innerHTML = '<div class="empty-module"><h2>Planned practice</h2><p>This module is on the roadmap; its checked practice set is still being prepared.</p><a class="btn btn-primary" href="problems.html">Return to roadmap</a></div>';
  } else {
    problems.forEach((problem, index) => {
      const release = ITCC47Curriculum.stateForResource('problem', problem.id, releaseOptions);
      const open = ['available', 'current'].includes(release.state);
      const complete = Boolean(solved[problem.id]);
      const hasDraft = Object.prototype.hasOwnProperty.call(drafts, problem.id);
      const difficultyClass = `diff-${problem.difficulty.toLowerCase().replace(/[^a-z]/g, '')}`;
      const article = document.createElement('article'); article.className = `problem-choice problem-choice-${release.state}`;
      article.innerHTML = `<div class="problem-choice-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
        <div class="problem-choice-body"><div class="problem-choice-heading"><h2>${esc(problem.title)}</h2>${ITCC47CurriculumUI.badge(release.state)}<span class="chip chip-diff ${difficultyClass}">${esc(problem.difficulty)}</span>${complete ? '<span class="chip chip-solved">Solved</span>' : ''}</div>
        <p>${open ? esc(problem.statement) : esc(ITCC47CurriculumUI.requirement(release))}</p>
        <small>${open ? `${problem.visibleTests.length} visible example${problem.visibleTests.length === 1 ? '' : 's'} · ${hasDraft && !complete ? 'Draft saved' : complete ? 'Completed in this browser' : 'Not started'}` : `Requires ${esc(release.checkpoint?.title || 'curriculum review')}`}</small></div>
        <a class="btn ${open && !complete ? 'btn-primary' : 'btn-edit'} problem-choice-action" href="${ITCC47CurriculumUI.href(`practice.html?module=${moduleNumber}&problem=${encodeURIComponent(problem.id)}`)}">${open ? complete ? 'Review' : hasDraft ? 'Continue' : 'Start' : 'Requirements'}</a>`;
      cards.appendChild(article);
    });
  }

  document.getElementById('btn-clear-progress').addEventListener('click', () => {
    if (!confirm('Clear all saved problem progress and drafts in this browser?')) return;
    try { localStorage.removeItem('itcc47.practice-records:v2'); localStorage.removeItem('itcc47.problems.v1'); localStorage.removeItem('itcc47.problems.code.v1'); } catch { /* optional storage */ }
    location.reload();
  });
})();
