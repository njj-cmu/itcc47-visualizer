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
             <a class="btn btn-primary module-action" href="practice.html?module=${module.number}">Open problem sets <span aria-hidden="true">→</span></a>`
          : `<span class="module-status status-pending">Not implemented</span>
             <span class="module-action module-action-disabled" aria-disabled="true">Not implemented</span>`}
      </div>`;
    grid.appendChild(article);
  });
})();
