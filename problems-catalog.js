/* Module catalog for the public, local-first problem practice shell. */
(function () {
  const modules = [
    { number: 1, title: 'Algorithmic Thinking', summary: 'IPO, precise decisions, exact output, loops, and state.' },
    { number: 2, title: 'Arrays, Searching & Sorting', summary: 'Arrays, scans, repeated values, and counted searches.' },
    { number: 3, title: 'Linked Lists', summary: 'Node links, traversal, insertion, and deletion.' },
    { number: 4, title: 'Stacks & Queues', summary: 'LIFO and FIFO structures with practical operations.' },
    { number: 5, title: 'Recursion', summary: 'Base cases, recursive progress, and call tracing.' },
    { number: 6, title: 'Trees', summary: 'Hierarchical structures, traversal, and search.' },
    { number: 7, title: 'Graphs', summary: 'Vertices, edges, traversal, and path reasoning.' },
    { number: 8, title: 'Advanced Algorithms', summary: 'Integrated techniques and larger problem-solving patterns.' },
  ];

  const grid = document.getElementById('module-grid');
  const counts = PROBLEMS.reduce((result, problem) => {
    const match = /^Module\s+(\d+)$/.exec(problem.module);
    if (match) result[Number(match[1])] = (result[Number(match[1])] || 0) + 1;
    return result;
  }, {});

  modules.forEach((module) => {
    const count = counts[module.number] || 0;
    const available = count > 0;
    const article = document.createElement('article');
    article.className = `module-card ${available ? 'module-card-available' : 'module-card-pending'}`;
    article.innerHTML = `
      <div class="module-card-head">
        <span class="module-number" aria-hidden="true">${module.number}</span>
        <div>
          <p class="module-label">Module ${module.number}</p>
          <h2>${module.title}</h2>
        </div>
      </div>
      <p class="module-summary">${module.summary}</p>
      <div class="module-card-footer">
        ${available
          ? `<span class="module-status status-available">Available · ${count} problem${count === 1 ? '' : 's'}</span>
             <a class="btn btn-primary module-action" href="problem-list.html?module=${module.number}" data-icon="problemsList">Choose a problem</a>`
          : `<span class="module-status status-pending">Not implemented</span>
             <span class="module-action module-action-disabled" aria-disabled="true">Not implemented</span>`}
      </div>`;
    grid.appendChild(article);
  });
  document.querySelectorAll('#module-grid [data-icon]').forEach((element) => {
    if (window.ITCC47Icons) element.insertAdjacentHTML('afterbegin', window.ITCC47Icons(element.dataset.icon));
  });

  const visualizationGrid = document.getElementById('visualization-grid');
  const activities = typeof ITCC47Activities === 'undefined' ? [] : ITCC47Activities.list();
  const families = [...new Set(activities.map((activity) => activity.family))];
  families.forEach((family) => {
    const group = document.createElement('section');
    group.className = 'visualization-group';
    group.innerHTML = `<header><p>Course visualizations</p><h2>${family}</h2></header><div class="visualization-cards"></div>`;
    const cards = group.querySelector('.visualization-cards');
    activities.filter((activity) => activity.family === family).forEach((activity) => {
      const link = document.createElement('a');
      link.className = 'visualization-card';
      link.href = `visualizer.html?activity=${encodeURIComponent(activity.id)}`;
      link.innerHTML = `<span class="visualization-module">Module ${activity.module} · ${activity.topic}</span><strong>${activity.title}</strong><span>${activity.subtitle}</span><em>Open visualization ${window.ITCC47Icons ? window.ITCC47Icons('arrow') : '→'}</em>`;
      cards.appendChild(link);
    });
    visualizationGrid.appendChild(group);
  });

  const tabs = [...document.querySelectorAll('[data-catalog-view]')];
  const views = {
    problems: document.getElementById('problem-catalog'),
    visualizations: document.getElementById('visualization-catalog'),
  };
  function selectView(name, updateUrl = true, focus = false) {
    const selected = views[name] ? name : 'problems';
    tabs.forEach((tab) => {
      const active = tab.dataset.catalogView === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    Object.entries(views).forEach(([key, panel]) => { panel.hidden = key !== selected; });
    if (updateUrl) {
      const url = new URL(location.href);
      if (selected === 'problems') url.searchParams.delete('view');
      else url.searchParams.set('view', selected);
      history.replaceState({}, '', url);
    }
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectView(tab.dataset.catalogView));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectView(tabs[next].dataset.catalogView, true, true);
    });
  });
  selectView(new URLSearchParams(location.search).get('view') || 'problems', false);
})();
