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
  const toolDetails = new Map([
    ['writer', { title: 'Algorithm Writer', description: 'Turn a plain-language plan into clear nested steps.' }],
    ['tracer', { title: 'Pseudocode Tracer', description: 'Run pseudocode line by line and inspect changing state.' }],
  ]);

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
  ui.mountPreviewControls(document.querySelector('.catalog-intro'));

  const visualizationGrid = document.getElementById('visualization-grid');
  const workbenchGrid = document.getElementById('workbench-grid');
  const allActivities = typeof ITCC47Activities === 'undefined' ? [] : ITCC47Activities.list();
  const activityById = new Map(allActivities.map((activity) => [activity.id, activity]));
  const focusedProgress = typeof ITCC47VisualizerProgress === 'undefined' ? null : ITCC47VisualizerProgress;
  const midtermVisualRecords = focusedProgress?.read().activities || {};
  const midtermCheckpoints = ITCC47Curriculum.checkpoints.filter((checkpoint) => ['m1', 'm2', 'm3', 'm4'].includes(checkpoint.moduleId));
  const midtermCheckpointIds = new Set(midtermCheckpoints.map((checkpoint) => checkpoint.id));
  const midtermResources = ITCC47Curriculum.listResources().filter((resource) => midtermCheckpointIds.has(resource.checkpointId));
  const midtermModules = ITCC47Curriculum.modules.filter((module) => module.number <= 4);
  const midtermReviewGrid = document.getElementById('midterm-review-grid');
  const midtermReviewSummary = document.getElementById('midterm-review-summary');
  const midtermModuleNavList = document.getElementById('midterm-module-nav-list');
  const midtermModuleSelect = document.getElementById('midterm-module-select');
  let selectedMidtermModuleNumber = null;
  let selectMidtermModule = () => {};

  function midtermResourceDetails(resource, moduleNumber) {
    if (resource.kind === 'tool') {
      const details = toolDetails.get(resource.id) || { title: resource.id, description: 'Open this local learning tool.' };
      return { ...details, href: resource.route || `${resource.id}.html` };
    }
    if (resource.kind === 'problem') {
      const problem = problemById.get(resource.id);
      return {
        title: problem?.title || resource.title || resource.id,
        description: problem ? `${problem.difficulty} · ${problem.visibleTests.length} visible examples` : 'Checked practice',
        href: `practice.html?module=${moduleNumber}&problem=${encodeURIComponent(resource.id)}`,
      };
    }
    const activity = activityById.get(resource.id);
    return {
      title: activity?.title || resource.title || resource.id,
      description: activity?.subtitle || 'Guided visualization',
      href: resource.id.startsWith('industry-')
        ? `industry-workbench.html?scenario=${encodeURIComponent(resource.id)}`
        : `visualizer.html?activity=${encodeURIComponent(resource.id)}`,
    };
  }

  function midtermResourceProgress(resource) {
    if (resource.kind === 'activity') {
      const record = midtermVisualRecords[resource.id];
      if (record?.reviewedAt) return { label: 'Reviewed', state: 'reviewed' };
      if (record?.lastVisitedAt) return { label: 'Visited', state: 'visited' };
      return { label: 'New', state: 'new' };
    }
    if (resource.kind === 'problem') {
      const record = practiceRecords.get(resource.id) || {};
      if (record.complete) return { label: 'Completed', state: 'completed' };
      if (record.draft) return { label: 'Continue', state: 'continue' };
      return { label: 'Start', state: 'start' };
    }
    return null;
  }

  function midtermResourceLinks(resources, moduleNumber, placement) {
    return resources.map((resource) => {
      const details = midtermResourceDetails(resource, moduleNumber);
      const progress = midtermResourceProgress(resource);
      const progressMarkup = progress ? `<span class="midterm-progress-badge is-${progress.state}" data-progress-state="${progress.state}" aria-label="Review status: ${progress.label}"><i aria-hidden="true"></i>${progress.label}</span>` : '';
      return `<a class="midterm-resource-link midterm-resource-${ui.esc(resource.kind)}" data-midterm-resource="${ui.esc(`${resource.kind}:${resource.id}`)}" data-midterm-placement="${placement}" href="${ui.href(details.href)}"><span class="midterm-resource-copy"><strong>${ui.esc(details.title)}</strong><span>${ui.esc(details.description)}</span></span>${progressMarkup}</a>`;
    }).join('');
  }

  function midtermMoreResources(resources, moduleNumber, kind, label) {
    if (!resources.length) return '';
    return `<details class="midterm-more midterm-more-${kind}" data-midterm-more="${kind}"><summary><span>${label}</span><strong>${resources.length}</strong></summary><div class="midterm-resource-links">${midtermResourceLinks(resources, moduleNumber, 'additional')}</div></details>`;
  }

  function midtermModuleProgress(resources, moduleNumber) {
    const visualStates = resources.filter((resource) => resource.kind === 'activity').map(midtermResourceProgress);
    const practiceStates = resources.filter((resource) => resource.kind === 'problem').map(midtermResourceProgress);
    const visualCount = (state) => visualStates.filter((item) => item.state === state).length;
    const practiceCount = (state) => practiceStates.filter((item) => item.state === state).length;
    return `<span class="midterm-module-progress" aria-label="Module ${moduleNumber} browser-local review summary">
      ${visualStates.length ? `<span><strong>Visualize</strong><span>${visualCount('reviewed')} reviewed · ${visualCount('visited')} visited · ${visualCount('new')} new</span></span>` : ''}
      ${practiceStates.length ? `<span><strong>Practice</strong><span>${practiceCount('completed')} completed · ${practiceCount('continue')} continue · ${practiceCount('start')} start</span></span>` : ''}
    </span>`;
  }

  if (midtermReviewGrid && midtermReviewSummary && midtermModuleNavList && midtermModuleSelect) {
    const counts = {
      tool: midtermResources.filter((resource) => resource.kind === 'tool').length,
      activity: midtermResources.filter((resource) => resource.kind === 'activity').length,
      problem: midtermResources.filter((resource) => resource.kind === 'problem').length,
    };
    midtermReviewSummary.innerHTML = `<span><strong>${midtermCheckpoints.length}</strong> reviewed checkpoints</span><span><strong>${counts.tool}</strong> local learning tools</span><span><strong>${counts.activity}</strong> guided activities</span><span><strong>${counts.problem}</strong> checked problems</span>`;

    const moduleModels = midtermModules.map((module) => {
      const checkpoints = midtermCheckpoints.filter((checkpoint) => checkpoint.moduleId === module.id);
      const resources = midtermResources.filter((resource) => checkpoints.some((checkpoint) => checkpoint.id === resource.checkpointId));
      const resourceSummary = [
        resources.some((resource) => resource.kind === 'tool') ? `${resources.filter((resource) => resource.kind === 'tool').length} learning tools` : '',
        resources.some((resource) => resource.kind === 'activity') ? `${resources.filter((resource) => resource.kind === 'activity').length} guided activities` : '',
        resources.some((resource) => resource.kind === 'problem') ? `${resources.filter((resource) => resource.kind === 'problem').length} checked problems` : '',
      ].filter(Boolean).join(' · ');
      const stateRows = checkpoints.map((checkpoint) => ITCC47Curriculum.stateForCheckpoint(checkpoint.id, options));
      const moduleState = stateRows.some((row) => row.state === 'current') ? 'current' : 'available';
      return { module, checkpoints, resources, resourceSummary, moduleState };
    });

    const deployedProfile = ITCC47Curriculum.activeProfile({ preview: false, search: '' });
    const deployedCheckpoint = ITCC47Curriculum.getCheckpoint(deployedProfile.currentCheckpointId);
    const deployedModule = ITCC47Curriculum.getModule(deployedCheckpoint?.moduleId);
    const defaultModuleNumber = moduleModels.some((model) => model.module.number === deployedModule?.number)
      ? deployedModule.number : moduleModels.at(-1)?.module.number;

    midtermModuleNavList.innerHTML = moduleModels.map(({ module, checkpoints, resources, moduleState }) => `<li><button type="button" class="midterm-module-nav-button" data-midterm-nav-module="${module.number}" aria-controls="midterm-module-body-${module.number}"><span class="midterm-nav-number" aria-hidden="true">${module.number}</span><span class="midterm-nav-copy"><strong>Module ${module.number}</strong><span>${ui.esc(module.title)}</span><small>${checkpoints.length} checkpoint${checkpoints.length === 1 ? '' : 's'} · ${resources.length} resources</small></span>${ui.badge(moduleState)}<span class="midterm-nav-selected">Selected</span></button></li>`).join('');
    midtermModuleSelect.innerHTML = moduleModels.map(({ module, moduleState }) => `<option value="${module.number}">Module ${module.number}: ${ui.esc(module.title)}${moduleState === 'current' ? ' — Current' : ''}</option>`).join('');

    moduleModels.forEach(({ module, checkpoints, resources, resourceSummary, moduleState }) => {
      const item = document.createElement('li');
      item.className = `midterm-module-card midterm-module-${moduleState}`;
      item.dataset.midtermModule = String(module.number);
      const toggleId = `midterm-module-toggle-${module.number}`;
      const bodyId = `midterm-module-body-${module.number}`;
      item.innerHTML = `<section class="midterm-module-panel"><h3 class="midterm-module-heading"><button id="${toggleId}" type="button" class="midterm-module-head" data-midterm-module-toggle="${module.number}" aria-expanded="false" aria-controls="${bodyId}"><span class="module-number" aria-hidden="true">${module.number}</span><span class="midterm-module-copy"><span class="module-label">Module ${module.number}</span><span class="midterm-module-title">${ui.esc(module.title)}</span><span>${checkpoints.length} checkpoint${checkpoints.length === 1 ? '' : 's'} · ${ui.esc(resourceSummary)}</span></span>${midtermModuleProgress(resources, module.number)}<span class="midterm-module-state">${ui.badge(moduleState)}<span class="midterm-module-toggle"><span class="when-closed">Open module</span><span class="when-open">Selected module</span><i aria-hidden="true"></i></span></span></button></h3>
        <div id="${bodyId}" class="midterm-module-body" role="region" aria-labelledby="${toggleId}" hidden><ol class="midterm-checkpoint-list">${checkpoints.map((checkpoint, checkpointIndex) => {
          const sequenceOrder = new Map((checkpoint.sequence || []).map((reference, index) => [reference, index]));
          const checkpointResources = midtermResources.filter((resource) => resource.checkpointId === checkpoint.id)
            .sort((left, right) => (sequenceOrder.get(`${left.kind}:${left.id}`) ?? Number.MAX_SAFE_INTEGER) - (sequenceOrder.get(`${right.kind}:${right.id}`) ?? Number.MAX_SAFE_INTEGER));
          const primaryTool = checkpointResources.find((resource) => resource.kind === 'tool');
          const primaryActivity = checkpointResources.find((resource) => resource.kind === 'activity');
          const primaryProblem = checkpointResources.find((resource) => resource.kind === 'problem');
          const additionalExamples = checkpointResources.filter((resource) => resource.kind !== 'problem' && resource !== primaryTool && resource !== primaryActivity);
          const additionalProblems = checkpointResources.filter((resource) => resource.kind === 'problem' && resource !== primaryProblem);
          const headingId = `midterm-checkpoint-${checkpoint.id}`;
          const stages = [{
            type: 'learn', label: 'Learn', content: `<h4 id="${ui.esc(headingId)}">${ui.esc(checkpoint.title)}</h4><p>${ui.esc(checkpoint.summary)}</p>${checkpoint.goals?.[0] ? `<span class="midterm-understand-focus"><strong>Focus:</strong> ${ui.esc(checkpoint.goals[0])}</span>` : ''}${primaryTool ? `<div class="midterm-resource-links">${midtermResourceLinks([primaryTool], module.number, 'primary')}</div>` : ''}`,
          }];
          if (primaryActivity) stages.push({ type: 'visualize', label: 'Visualize', content: `<div class="midterm-resource-links">${midtermResourceLinks([primaryActivity], module.number, 'primary')}</div>` });
          if (primaryProblem) stages.push({ type: 'practice', label: 'Practice', content: `<div class="midterm-resource-links">${midtermResourceLinks([primaryProblem], module.number, 'primary')}</div>` });
          const stageMarkup = stages.map((stage, stageIndex) => `<li class="midterm-flow-stage midterm-flow-${stage.type}" data-midterm-stage="${stage.type}"><p class="midterm-flow-label"><span aria-hidden="true">${stageIndex + 1}</span>${stage.label}</p>${stage.content}</li>`).join('');
          return `<li class="midterm-checkpoint" data-midterm-checkpoint="${ui.esc(checkpoint.id)}" aria-labelledby="${ui.esc(headingId)}"><p class="midterm-checkpoint-position">Checkpoint ${checkpointIndex + 1} of ${checkpoints.length}</p><ol class="midterm-core-path" data-stage-count="${stages.length}" aria-label="Core review path">${stageMarkup}</ol><div class="midterm-additional-material">${midtermMoreResources(additionalExamples, module.number, 'examples', 'More examples')}${midtermMoreResources(additionalProblems, module.number, 'practice', 'More practice')}</div></li>`;
        }).join('')}</ol></div></section>`;
      midtermReviewGrid.appendChild(item);
    });

    function updateMidtermModuleUrl(moduleNumber, mode) {
      const url = new URL(location.href);
      url.searchParams.set('view', 'midterm');
      url.searchParams.set('module', String(moduleNumber));
      if (url.href === location.href) return;
      try {
        if (mode === 'replace') history.replaceState({}, '', url);
        else history.pushState({}, '', url);
      } catch { /* Query targeting is optional in restricted file contexts. */ }
    }

    selectMidtermModule = (requestedNumber, settings = {}) => {
      const { updateUrl = true, historyMode = 'push', scroll = false } = settings;
      const selectedModel = moduleModels.find((model) => model.module.number === Number(requestedNumber))
        || moduleModels.find((model) => model.module.number === defaultModuleNumber)
        || moduleModels[0];
      if (!selectedModel) return;
      selectedMidtermModuleNumber = selectedModel.module.number;
      moduleModels.forEach(({ module }) => {
        const selected = module.number === selectedMidtermModuleNumber;
        const card = midtermReviewGrid.querySelector(`[data-midterm-module="${module.number}"]`);
        const toggle = card?.querySelector('[data-midterm-module-toggle]');
        const body = card?.querySelector('.midterm-module-body');
        card?.classList.toggle('is-selected', selected);
        toggle?.setAttribute('aria-expanded', String(selected));
        if (body) body.hidden = !selected;
        const navButton = midtermModuleNavList.querySelector(`[data-midterm-nav-module="${module.number}"]`);
        if (selected) navButton?.setAttribute('aria-current', 'true');
        else navButton?.removeAttribute('aria-current');
      });
      midtermModuleSelect.value = String(selectedMidtermModuleNumber);
      if (updateUrl) updateMidtermModuleUrl(selectedMidtermModuleNumber, historyMode);
      if (scroll) requestAnimationFrame(() => {
        const heading = midtermReviewGrid.querySelector(`[data-midterm-module="${selectedMidtermModuleNumber}"] [data-midterm-module-toggle]`);
        const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        heading?.scrollIntoView({ behavior, block: 'start' });
      });
    };

    midtermReviewGrid.querySelectorAll('[data-midterm-module-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', () => selectMidtermModule(toggle.dataset.midtermModuleToggle));
    });
    midtermModuleNavList.querySelectorAll('[data-midterm-nav-module]').forEach((button) => {
      button.addEventListener('click', () => selectMidtermModule(button.dataset.midtermNavModule, { scroll: true }));
    });
    midtermModuleSelect.addEventListener('change', () => selectMidtermModule(midtermModuleSelect.value, { scroll: true }));
    const requestedModuleNumber = Number(new URLSearchParams(location.search).get('module'));
    selectMidtermModule(requestedModuleNumber, { updateUrl: false });

    midtermReviewGrid.addEventListener('click', (event) => {
      const link = event.target.closest('[data-midterm-resource^="activity:"]');
      if (!link || !focusedProgress) return;
      focusedProgress.markVisited(link.dataset.midtermResource.slice('activity:'.length));
    });
  }
  const activities = allActivities.filter((activity) => activity.catalogPlacement !== 'featured-workbench');
  const releasedActivityIds = activities
    .filter((activity) => ['available', 'current'].includes(ITCC47Curriculum.stateForResource('activity', activity.id, { preview: false }).state))
    .map((activity) => activity.id);
  if (visualizationGrid && focusedProgress) {
    const progress = focusedProgress.summary(releasedActivityIds);
    const progressPanel = document.createElement('section');
    progressPanel.className = 'visualization-progress-summary';
    progressPanel.setAttribute('aria-labelledby', 'visualization-progress-title');
    progressPanel.innerHTML = `<span class="visualization-progress-icon" aria-hidden="true">${typeof BSITIcons === 'function' ? BSITIcons('check') : '✓'}</span>
      <div><p class="eyebrow">Your progress</p><h2 id="visualization-progress-title">${progress.reviewed} of ${progress.total} available visualizations reviewed</h2><p>Reach the final step to mark a visualization as reviewed. Progress stays in this browser.</p></div>
      <div class="visualization-progress-meter"><span>${progress.reviewed} / ${progress.total}</span><progress value="${progress.reviewed}" max="${Math.max(progress.total, 1)}">${progress.reviewed} of ${progress.total}</progress></div>`;
    visualizationGrid.appendChild(progressPanel);
  }
  if (workbenchGrid && typeof ITCC47IndustryWorkbench !== 'undefined') {
    const scenarios = ITCC47IndustryWorkbench.listScenarios();
    const release = ITCC47Curriculum.stateForResource('activity', scenarios[0].id, options);
    const open = ['available', 'current'].includes(release.state);
    const feature = document.createElement('a');
    feature.className = `industry-catalog-feature industry-catalog-${release.state}`;
    feature.href = ui.href('industry-workbench.html');
    feature.innerHTML = `<span class="industry-catalog-icon" aria-hidden="true">${typeof BSITIcons === 'function' ? BSITIcons('database') : '▦'}</span>
      <span class="industry-catalog-copy"><small>Featured experience · Module 2</small><strong>Industry Data Workbench Sample</strong><span>Follow four algorithm decisions across one deterministic 12,400-ticket support dataset.</span></span>
      <span class="industry-catalog-stream" aria-hidden="true"><i><small>0</small><b>TCK-000001</b><em>P1</em></i><i><small>1</small><b>TCK-000002</b><em>P1</em></i><span>+ 12,396 compressed records</span><i><small>12,398</small><b>TCK-012399</b><em>P4</em></i><i><small>12,399</small><b>TCK-012400</b><em>P4</em></i></span>
      <span class="industry-catalog-action">${open ? 'Choose a scenario' : `${typeof BSITIcons === 'function' ? BSITIcons('lock') : '🔒'} Preview scenarios`} <b aria-hidden="true">→</b></span>`;
    workbenchGrid.appendChild(feature);
  }
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
      const progress = focusedProgress?.get(activity.id);
      const reviewed = Boolean(progress?.reviewedAt);
      const visited = Boolean(progress?.lastVisitedAt);
      const link = document.createElement('a'); link.className = `visualization-card visualization-${result.state}${visited ? ' visualization-visited' : ''}${reviewed ? ' visualization-reviewed' : ''}`;
      link.href = ui.href(`visualizer.html?activity=${encodeURIComponent(activity.id)}`);
      const locked = !['available', 'current'].includes(result.state);
      const lockIcon = locked ? `<span class="visualization-lock" role="img" aria-label="${ui.esc(result.state)}">${typeof BSITIcons === 'function' ? BSITIcons('lock') : '🔒'}</span>` : '';
      const progressMeta = visited ? `<span class="visualization-progress-meta"><span class="visualization-progress-state">${reviewed ? `${typeof BSITIcons === 'function' ? BSITIcons('check') : '✓'} Reviewed` : 'Visited'}</span><span>Last visited at: ${focusedProgress.formatDate(progress.lastVisitedAt)}</span></span>` : '';
      link.innerHTML = `<span class="visualization-card-meta"><span class="visualization-module">Module ${activity.module} · ${ui.esc(activity.topic)}</span>${lockIcon}</span><strong>${ui.esc(activity.title)}</strong><span class="visualization-subtitle">${ui.esc(activity.subtitle)}</span>${progressMeta}<em>${locked ? 'View requirements' : reviewed ? 'Review again' : visited ? 'Continue visualization' : 'Open visualization'} <span aria-hidden="true">→</span></em>`;
      group.querySelector('.visualization-cards').appendChild(link);
    });
    visualizationGrid.appendChild(group);
  });

  const tabs = [...document.querySelectorAll('[data-catalog-view]')];
  const views = {
    problems: document.getElementById('problem-catalog'),
    midterm: document.getElementById('midterm-review'),
    visualizations: document.getElementById('visualization-catalog'),
    workbenches: document.getElementById('workbench-catalog'),
  };
  function selectView(name, updateUrl = true, focus = false) {
    const selected = views[name] ? name : 'problems';
    tabs.forEach((tab) => { const active = tab.dataset.catalogView === selected; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; if (active && focus) tab.focus(); });
    Object.entries(views).forEach(([key, panel]) => { panel.hidden = key !== selected; });
    if (updateUrl) {
      const url = new URL(location.href);
      selected === 'problems' ? url.searchParams.delete('view') : url.searchParams.set('view', selected);
      if (selected === 'midterm' && selectedMidtermModuleNumber) url.searchParams.set('module', String(selectedMidtermModuleNumber));
      else url.searchParams.delete('module');
      history.replaceState({}, '', url);
    }
  }
  tabs.forEach((tab, index) => { tab.addEventListener('click', () => selectView(tab.dataset.catalogView)); tab.addEventListener('keydown', (event) => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; selectView(tabs[next].dataset.catalogView, true, true); }); });
  selectView(new URLSearchParams(location.search).get('view') || 'problems', false);
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view') || 'problems';
    selectView(view, false);
    if (view === 'midterm') selectMidtermModule(Number(params.get('module')), { updateUrl: false, scroll: true });
  });
})();
