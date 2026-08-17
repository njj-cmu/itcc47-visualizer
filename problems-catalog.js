/* Curriculum roadmap: one release resolver for cards, menus, and direct routes. */
(function () {
  const ui = ITCC47CurriculumUI;
  const options = ui.previewOptions();
  const activeProfile = ITCC47Curriculum.activeProfile(options);
  const activeCheckpoint = ITCC47Curriculum.getCheckpoint(activeProfile.currentCheckpointId);
  const activeModule = ITCC47Curriculum.getModule(activeCheckpoint?.moduleId);
  const resourceByModule = (moduleId, kind) => ITCC47Curriculum.listResources(kind)
    .filter((item) => ITCC47Curriculum.getCheckpoint(item.checkpointId)?.moduleId === moduleId);
  const resourceCountLabel = (kind, count) => `${count} ${count === 1 ? kind : kind === 'activity' ? 'activities' : `${kind}s`}`;
  const problemById = new Map(PROBLEMS.map((problem) => [problem.id, problem]));

  function readPracticeRecords() {
    const progress = new Map();
    try {
      const stored = JSON.parse(localStorage.getItem('itcc47.practice-records:v2') || 'null');
      if (stored?.schemaVersion === 2) {
        PROBLEMS.forEach((problem) => {
          const record = stored.records?.[problem.id];
          if (record?.contentVersion === problem.contentVersion) progress.set(problem.id, {
            complete: Boolean(record.completed),
            draft: typeof record.draft === 'string' && record.draft.length > 0,
          });
        });
        return progress;
      }
      const solved = JSON.parse(localStorage.getItem('itcc47.problems.v1') || '{}') || {};
      const drafts = JSON.parse(localStorage.getItem('itcc47.problems.code.v1') || '{}') || {};
      PROBLEMS.forEach((problem) => progress.set(problem.id, {
        complete: Boolean(solved[problem.id]),
        draft: Object.prototype.hasOwnProperty.call(drafts, problem.id),
      }));
    } catch { /* Practice storage is optional. */ }
    return progress;
  }

  const practiceRecords = readPracticeRecords();

  function practiceCards(module, resources) {
    const rows = resources.map((resource) => ({
      problem: problemById.get(resource.id),
      release: ITCC47Curriculum.stateForResource('problem', resource.id, options),
    })).filter((row) => row.problem && ['available', 'current'].includes(row.release.state));

    return `<section class="module-practice" aria-labelledby="module-${module.number}-practice">
      <header class="module-section-head"><div><p class="eyebrow">Practice bank</p><h3 id="module-${module.number}-practice">Choose a problem</h3></div><span>${rows.length} available</span></header>
      <div class="module-problem-grid">${rows.map((row, index) => {
        const progress = practiceRecords.get(row.problem.id) || {};
        const progressLabel = progress.complete ? 'Review' : progress.draft ? 'Continue' : 'Start';
        const status = progress.complete ? 'Completed' : progress.draft ? 'Draft saved' : `${row.problem.visibleTests.length} examples`;
        const difficultyClass = `diff-${row.problem.difficulty.toLowerCase().replace(/[^a-z]/g, '')}`;
        return `<a class="module-problem-card" href="${ui.href(`practice.html?module=${module.number}&problem=${encodeURIComponent(row.problem.id)}`)}">
          <span class="module-problem-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <span class="chip chip-diff ${difficultyClass}">${ui.esc(row.problem.difficulty)}</span>
          <strong>${ui.esc(row.problem.title)}</strong>
          <span class="module-problem-status">${ui.esc(status)}</span>
          <span class="module-problem-action">${progressLabel} <span aria-hidden="true">→</span></span>
        </a>`;
      }).join('')}</div>
      <a class="module-all-practice" href="${ui.href(`problem-list.html?module=${module.number}`)}">Browse all Module ${module.number} practice <span aria-hidden="true">→</span></a>
    </section>`;
  }

  const moduleGrid = document.getElementById('module-grid');
  ITCC47Curriculum.modules.forEach((module) => {
    const checkpoints = ITCC47Curriculum.checkpoints.filter((item) => item.moduleId === module.id);
    const stateRows = checkpoints.map((checkpoint) => ITCC47Curriculum.stateForCheckpoint(checkpoint.id, options));
    const current = stateRows.find((item) => item.state === 'current');
    const moduleState = current ? 'current' : stateRows.every((item) => item.state === 'locked') ? 'locked'
      : stateRows.some((item) => ['available', 'current'].includes(item.state)) ? 'available' : 'planned';
    const problems = resourceByModule(module.id, 'problem');
    const activities = resourceByModule(module.id, 'activity');
    const counts = [['problem', problems.length], ['activity', activities.length]];
    const expanded = moduleState === 'current';
    const article = document.createElement('article');
    article.className = `module-card module-card-${moduleState}${expanded ? ' module-card-expanded' : ' module-card-compact'}`;
    article.innerHTML = `<div class="module-card-head"><span class="module-number" aria-hidden="true">${module.number}</span><div><p class="module-label">Module ${module.number}</p><h2>${ui.esc(module.title)}</h2></div>${ui.badge(moduleState)}</div>
      <div class="module-summary"><span>CLO ${module.cloIds.join(', ')}</span><span>${counts.map(([kind, count]) => resourceCountLabel(kind, count)).join(' · ')}</span></div>
      ${expanded ? `<div class="module-card-body">${practiceCards(module, problems)}</div>`
        : `<div class="module-card-footer"><span>${moduleState === 'locked' ? `Unlocks after the current Module ${activeModule?.number || 1} ${activeProfile.preview ? 'preview' : 'release'}.` : 'Previously released practice stays available.'}</span><a class="btn module-action" href="${ui.href(`problem-list.html?module=${module.number}`)}">${moduleState === 'locked' ? 'View requirements' : `Open ${problems.length} problems`}</a></div>`}`;
    moduleGrid.appendChild(article);
  });
  ui.mountPreviewControls(document.getElementById('release-controls'));

  const visualizationGrid = document.getElementById('visualization-grid');
  const activities = typeof ITCC47Activities === 'undefined' ? [] : ITCC47Activities.list();
  const visualizationFamilies = [...new Set(activities.map((activity) => activity.family))]
    .map((family, firstSeen) => ({
      family,
      firstSeen,
      module: Math.min(...activities.filter((activity) => activity.family === family).map((activity) => activity.module)),
    }))
    .sort((left, right) => left.module - right.module || left.firstSeen - right.firstSeen);
  visualizationFamilies.forEach(({ family }) => {
    const group = document.createElement('section'); group.className = 'visualization-group';
    group.innerHTML = `<header><p>Course visualizations</p><h2>${ui.esc(family)}</h2></header><div class="visualization-cards"></div>`;
    activities.filter((activity) => activity.family === family).forEach((activity) => {
      const result = ITCC47Curriculum.stateForResource('activity', activity.id, options);
      const link = document.createElement('a'); link.className = `visualization-card visualization-${result.state}`;
      link.href = ui.href(`visualizer.html?activity=${encodeURIComponent(activity.id)}`);
      const locked = !['available', 'current'].includes(result.state);
      const lockIcon = locked ? `<span class="visualization-lock" role="img" aria-label="${ui.esc(result.state)}">${typeof BSITIcons === 'function' ? BSITIcons('lock') : '🔒'}</span>` : '';
      link.innerHTML = `<span class="visualization-card-meta"><span class="visualization-module">Module ${activity.module} · ${ui.esc(activity.topic)}</span>${lockIcon}</span><strong>${ui.esc(activity.title)}</strong><span class="visualization-subtitle">${ui.esc(activity.subtitle)}</span><em>${locked ? 'View requirements' : 'Open visualization'} →</em>`;
      group.querySelector('.visualization-cards').appendChild(link);
    });
    visualizationGrid.appendChild(group);
  });

  const tabs = [...document.querySelectorAll('[data-catalog-view]')];
  const views = { problems: document.getElementById('problem-catalog'), visualizations: document.getElementById('visualization-catalog') };
  function selectView(name, updateUrl = true, focus = false) {
    const selected = views[name] ? name : 'problems';
    tabs.forEach((tab) => { const active = tab.dataset.catalogView === selected; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; if (active && focus) tab.focus(); });
    Object.entries(views).forEach(([key, panel]) => { panel.hidden = key !== selected; });
    if (updateUrl) { const url = new URL(location.href); selected === 'problems' ? url.searchParams.delete('view') : url.searchParams.set('view', selected); history.replaceState({}, '', url); }
  }
  tabs.forEach((tab, index) => { tab.addEventListener('click', () => selectView(tab.dataset.catalogView)); tab.addEventListener('keydown', (event) => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; selectView(tabs[next].dataset.catalogView, true, true); }); });
  selectView(new URLSearchParams(location.search).get('view') || 'problems', false);
})();
