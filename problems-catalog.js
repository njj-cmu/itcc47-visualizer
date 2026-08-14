/* Curriculum roadmap: one release resolver for cards, menus, and direct routes. */
(function () {
  const ui = ITCC47CurriculumUI;
  const options = ui.previewOptions();
  const resourceByModule = (moduleId, kind) => ITCC47Curriculum.listResources(kind)
    .filter((item) => ITCC47Curriculum.getCheckpoint(item.checkpointId)?.moduleId === moduleId);
  const resourceCountLabel = (kind, count) => `${count} ${count === 1 ? kind : kind === 'activity' ? 'activities' : `${kind}s`}`;
  const moduleGrid = document.getElementById('module-grid');
  ITCC47Curriculum.modules.forEach((module) => {
    const checkpoints = ITCC47Curriculum.checkpoints.filter((item) => item.moduleId === module.id);
    const stateRows = checkpoints.map((checkpoint) => ITCC47Curriculum.stateForCheckpoint(checkpoint.id, options));
    const current = stateRows.find((item) => item.state === 'current');
    const moduleState = current ? 'current' : stateRows.every((item) => item.state === 'locked') ? 'locked'
      : stateRows.some((item) => ['available', 'current'].includes(item.state)) ? 'available' : 'planned';
    const counts = ['problem', 'activity'].map((kind) => [kind, resourceByModule(module.id, kind).length]);
    const article = document.createElement('article');
    article.className = `module-card module-card-${moduleState}`;
    article.innerHTML = `<div class="module-card-head"><span class="module-number" aria-hidden="true">${module.number}</span><div><p class="module-label">Module ${module.number}</p><h2>${ui.esc(module.title)}</h2></div>${ui.badge(moduleState)}</div>
      <p class="module-summary">CLO ${module.cloIds.join(', ')} · ${checkpoints.length} lecture checkpoints</p>
      <ul class="checkpoint-list">${stateRows.map((row) => `<li class="checkpoint-${row.state}">${ui.badge(row.state)}<span><strong>${ui.esc(row.checkpoint.title)}</strong><small>${ui.esc(row.checkpoint.summary)}</small></span>${['available', 'current'].includes(row.state) ? `<a href="${ui.href(`lesson.html?checkpoint=${row.checkpoint.id}`)}">Open companion</a>` : `<em>${ui.esc(row.reason || 'Planned')}</em>`}</li>`).join('')}</ul>
      <div class="module-card-footer"><span class="module-status">${counts.map(([kind,count]) => resourceCountLabel(kind, count)).join(' · ')}</span><a class="btn module-action" href="${ui.href(`problem-list.html?module=${module.number}`)}">View module resources</a></div>`;
    moduleGrid.appendChild(article);
  });
  ui.mountPreviewControls(document.getElementById('release-controls'));

  const visualizationGrid = document.getElementById('visualization-grid');
  const activities = typeof ITCC47Activities === 'undefined' ? [] : ITCC47Activities.list();
  [...new Set(activities.map((activity) => activity.family))].forEach((family) => {
    const group = document.createElement('section'); group.className = 'visualization-group';
    group.innerHTML = `<header><p>Course visualizations</p><h2>${ui.esc(family)}</h2></header><div class="visualization-cards"></div>`;
    activities.filter((activity) => activity.family === family).forEach((activity) => {
      const result = ITCC47Curriculum.stateForResource('activity', activity.id, options);
      const link = document.createElement('a'); link.className = `visualization-card visualization-${result.state}`;
      link.href = ui.href(`visualizer.html?activity=${encodeURIComponent(activity.id)}`);
      link.innerHTML = `${ui.badge(result.state)}<span class="visualization-module">Module ${activity.module} · ${ui.esc(activity.topic)}</span><strong>${ui.esc(activity.title)}</strong><span>${ui.esc(activity.subtitle)}</span><em>${['available','current'].includes(result.state) ? 'Open visualization' : 'View requirements'} →</em>`;
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
