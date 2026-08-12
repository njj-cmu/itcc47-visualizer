/* The intermediate Module -> Problem -> Practice navigation step. */
(function () {
  const moduleNumber = Number(new URLSearchParams(location.search).get('module') || 1);
  const moduleName = `Module ${moduleNumber}`;
  const problems = PROBLEMS.filter((problem) => problem.module === moduleName);
  let solved = {};
  let drafts = {};
  try {
    solved = JSON.parse(localStorage.getItem('itcc47.problems.v1') || '{}') || {};
    drafts = JSON.parse(localStorage.getItem('itcc47.problems.code.v1') || '{}') || {};
  } catch (error) { /* file-mode storage can be unavailable */ }

  const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const cards = document.getElementById('problem-cards');
  document.getElementById('module-crumb').textContent = moduleName;
  document.getElementById('problem-list-heading').textContent = `${moduleName}: select a problem`;

  if (!problems.length) {
    cards.innerHTML = '<div class="empty-module"><h2>Not implemented</h2><p>This module does not have practice problems yet.</p><a class="btn btn-primary" href="problems.html">Return to all modules</a></div>';
    return;
  }

  problems.forEach((problem, index) => {
    const complete = Boolean(solved[problem.id]);
    const hasDraft = Object.prototype.hasOwnProperty.call(drafts, problem.id);
    const difficultyClass = `diff-${problem.difficulty.toLowerCase().replace(/[^a-z]/g, '')}`;
    const article = document.createElement('article');
    article.className = 'problem-choice';
    article.innerHTML = `
      <div class="problem-choice-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
      <div class="problem-choice-body">
        <div class="problem-choice-heading"><h2>${esc(problem.title)}</h2><span class="chip chip-diff ${difficultyClass}">${esc(problem.difficulty)}</span>${complete ? '<span class="chip chip-solved">Solved</span>' : ''}</div>
        <p>${esc(problem.statement)}</p>
        <small>${problem.visibleTests.length} visible example${problem.visibleTests.length === 1 ? '' : 's'} · ${hasDraft && !complete ? 'Draft saved' : complete ? 'Completed in this browser' : 'Not started'}</small>
      </div>
      <a class="btn ${complete ? 'btn-edit' : 'btn-primary'} problem-choice-action" href="practice.html?module=${moduleNumber}&amp;problem=${encodeURIComponent(problem.id)}" data-icon="${complete || hasDraft ? 'edit' : 'play'}">${complete ? 'Review' : hasDraft ? 'Continue' : 'Start'}</a>`;
    cards.appendChild(article);
  });

  document.querySelectorAll('#problem-cards [data-icon]').forEach((element) => {
    if (window.ITCC47Icons) element.insertAdjacentHTML('afterbegin', window.ITCC47Icons(element.dataset.icon));
  });

  document.getElementById('btn-clear-progress').addEventListener('click', () => {
    if (!confirm('Clear all saved problem progress and drafts in this browser?')) return;
    try {
      localStorage.removeItem('itcc47.problems.v1');
      localStorage.removeItem('itcc47.problems.code.v1');
    } catch (error) { /* file-mode storage can be unavailable */ }
    location.reload();
  });
})();
