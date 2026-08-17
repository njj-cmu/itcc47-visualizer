const { test, expect } = require('@playwright/test');
const path = require('path');

const entries = ['index.html', 'itcc47.html', 'itcc45.html', 'itcc45-topics.html', 'itcc45-practice.html?topic=classes', 'visualizer.html', 'visualizer.html?activity=insertion-sort', 'visualizer.html?activity=deque-sliding-window&preview=1', 'visualizer.html?course=itcc45&activity=itcc45-classes-blueprint', 'writer.html', 'tracer.html', 'problems.html', 'lesson.html?checkpoint=m2-selection-sort', 'student-materials.html', 'problem-list.html?module=1', 'practice.html?module=1', 'practice.html?module=3&problem=linked-node-count'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('itcc47.release-preview:v1', JSON.stringify({ schemaVersion: 2, profileId: 'itcc47-2026-2027-s1', profileVersion: 3, currentCheckpointId: 'm8-dp' })));
});

async function openMobilePlaybackDetails(page) {
  const details = page.locator('.mobile-playback-details');
  if (await details.isVisible() && await details.getAttribute('open') === null) await details.getByText('Timeline and settings', { exact: true }).click();
}

async function visualizerTimeline(page) {
  const desktop = page.locator('#step-slider');
  if (await desktop.isVisible()) return desktop;
  await openMobilePlaybackDetails(page);
  return page.getByLabel('Mobile timeline step', { exact: true });
}

async function visualizerMotion(page) {
  const desktop = page.locator('.playback-settings .motion-control select');
  if (await desktop.isVisible()) return desktop;
  if (await page.locator('.mobile-playback-details').isVisible()) {
    await openMobilePlaybackDetails(page);
    return page.locator('.mobile-playback-details .motion-control select');
  }
  if (await page.locator('.playback-settings').getAttribute('open') === null) await page.getByText('Settings', { exact: true }).click();
  return desktop;
}

async function visualizerSpeed(page) {
  const desktop = page.locator('.playback-settings .speed-control select');
  if (await desktop.isVisible()) return desktop;
  if (await page.locator('.mobile-playback-details').isVisible()) {
    await openMobilePlaybackDetails(page);
    return page.locator('.mobile-playback-details .speed-control select');
  }
  if (await page.locator('.playback-settings').getAttribute('open') === null) await page.getByText('Settings', { exact: true }).click();
  return desktop;
}

async function installITCC45MotionProbe(page) {
  await page.evaluate(() => {
    window.__itcc45MotionObserver?.disconnect();
    window.__itcc45MotionSamples = [];
    const root = document.querySelector('.itcc45-model-pane');
    const record = (element) => {
      if (!(element instanceof Element)) return;
      const kind = element.matches('.object-class-member') ? 'member'
        : element.matches('.object-instance-card') ? 'object'
          : element.matches('[data-field-name] code') ? 'field'
            : null;
      if (!kind) return;
      window.__itcc45MotionSamples.push({ kind, text: element.textContent, style: element.getAttribute('style') || '' });
      if (window.__itcc45MotionSamples.length > 800) window.__itcc45MotionSamples.shift();
    };
    const observer = new MutationObserver((records) => records.forEach((mutation) => {
      if (mutation.type === 'attributes') record(mutation.target);
      mutation.addedNodes.forEach((node) => {
        record(node);
        node.querySelectorAll?.('.object-class-member, .object-instance-card, [data-field-name] code').forEach(record);
      });
    }));
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
    window.__itcc45MotionObserver = observer;
  });
}

async function expectRecordedMotion(page, kind, text) {
  await expect.poll(() => page.evaluate(({ kind, text }) => {
    const styles = (window.__itcc45MotionSamples || [])
      .filter((sample) => sample.kind === kind && sample.text.includes(text)).map((sample) => sample.style);
    return styles.some((style) => /opacity:\s*0(?:;|$)/.test(style))
      && styles.some((style) => /opacity:\s*1(?:;|$)/.test(style));
  }, { kind, text })).toBeTruthy();
}

for (const entry of entries) {
  test(`${entry} has no horizontal overflow`, async ({ page }) => {
    await page.goto(`/${entry}`);
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('mobile navigation opens and moves focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/itcc47.html');
  const toggle = page.getByRole('button', { name: /menu/i });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeFocused();
});

test('start page gives students a clear route into the current lecture', async ({ page }) => {
  await page.goto('/itcc47.html');
  await expect(page.getByRole('heading', { name: /Start with a problem/ })).toBeVisible();
  await expect(page.locator('#current-checkpoint')).toContainText('Complexity basics');
  await page.getByRole('link', { name: /Continue current lecture/ }).click();
  await expect(page).toHaveURL(/lesson\.html\?checkpoint=m1-complexity$/);
  await expect(page.getByRole('heading', { name: /Complexity basics/ })).toBeVisible();
});

test('curriculum roadmap expands the current module and compacts locked modules', async ({ page }) => {
  await page.goto('/problems.html');
  await expect(page.locator('.module-card')).toHaveCount(8);
  await expect(page.locator('.module-card-current')).toContainText('Algorithmic Thinking');
  await expect(page.locator('.module-card-current .module-problem-card')).toHaveCount(11);
  await expect(page.locator('.checkpoint-list, .module-lessons, .module-outline')).toHaveCount(0);
  await expect(page.locator('.module-card-locked').first()).toBeVisible();
  await expect(page.locator('.module-card-locked .module-problem-card')).toHaveCount(0);
  await expect(page.getByText('Instructor preview', { exact: true })).toBeVisible();
});

test('locked visualization cards use a compact icon and border state', async ({ page }) => {
  await page.goto('/problems.html?view=visualizations');
  await expect(page.locator('.visualization-card')).toHaveCount(35);
  await expect(page.locator('.visualization-card.visualization-locked')).toHaveCount(35);
  await expect(page.locator('.visualization-lock')).toHaveCount(35);
  await expect(page.locator('.visualization-card .release-badge')).toHaveCount(0);
  await expect(page.locator('.visualization-card').first().locator('.visualization-card-meta')).toContainText('Module 2');
  const familyOrder = await page.locator('.visualization-group h2').allTextContents();
  expect(familyOrder.slice(0, 7)).toEqual(['Sorting', 'Searching', 'Array Lists', 'Linked Lists', 'Stacks', 'Queues', 'Deques']);
  expect(familyOrder.indexOf('Deques')).toBeLessThan(familyOrder.indexOf('Recursion'));
});

test('locked visualizer route renders requirements without source or playback', async ({ page }) => {
  await page.goto('/visualizer.html?activity=recursive-range-search');
  await expect(page.locator('.curriculum-lock')).toContainText('Recursive duplicate-range search is not released yet');
  const actions = page.locator('.curriculum-lock-actions .btn');
  await expect(actions).toHaveCount(2);
  expect(await actions.evaluateAll((links) => links.every((link) => getComputedStyle(link).textDecorationLine === 'none'))).toBe(true);
  await expect(actions.first()).toHaveCSS('min-height', '44px');
  await expect(page.locator('.source-panel')).toHaveCount(0);
  await expect(page.getByRole('slider', { name: /Timeline/ })).toHaveCount(0);
  await expect(page.locator('.visualizer-workspace')).toHaveCount(0);
});

test('locked planned practice route exposes no problem statement or editor', async ({ page }) => {
  await page.goto('/practice.html?module=5&problem=recursive-sum');
  await expect(page.locator('.curriculum-lock')).toContainText('Recursive range sum is not released yet');
  await expect(page.locator('#p-statement')).toHaveCount(0);
  await expect(page.locator('#code-box')).toHaveCount(0);
});

test('instructor preview is explicit, persistent, and does not change the deployed profile', async ({ page }) => {
  await page.goto('/problems.html?preview=1');
  await page.getByText('Instructor preview', { exact: true }).click();
  await page.getByLabel('Preview checkpoint').selectOption('m8-dp');
  await page.getByRole('button', { name: 'Apply preview' }).click();
  await expect(page).toHaveURL(/preview=1/);
  await page.goto('/visualizer.html?activity=recursive-range-search&preview=1');
  await expect(page.getByRole('heading', { name: 'Recursive duplicate-range search' })).toBeVisible();
  await expect(page.locator('.draft-preview-indicator')).toContainText('Draft preview');
  await page.goto('/visualizer.html?activity=recursive-range-search');
  await expect(page.locator('.curriculum-lock')).toBeVisible();
});

test('former materials route redirects without exposing downloads or metadata', async ({ page }) => {
  await page.goto('/student-materials.html');
  await expect(page).toHaveURL(/problems\.html$/);
  await expect(page.locator('a[download]')).toHaveCount(0);
  await expect(page.locator('script[src*="student-materials"],script[src*="student-bundles"]')).toHaveCount(0);
  await expect(page.locator('.topbar-nav a', { hasText: 'Materials' })).toHaveCount(0);
});

test('instructor preview renders every later-domain teaching activity', async ({ page }) => {
  const activities = ['binary-range-search','stable-insertion-dispatch','array-linked-comparison','linked-list-sorted-insert','linked-list-find-update','linked-list-delete','recursive-range-search','stable-merge-sort','tree-traversals','bst-insert-search','bst-height-shape','graph-representation','bfs-shortest-path','dfs-reachability','greedy-dp-coin-change','knapsack-dp'];
  for (const activity of activities) {
    await page.goto(`/visualizer.html?activity=${activity}&preview=1`);
    await expect(page.locator('.visualizer-workspace')).toBeVisible();
    await expect(page.locator('.source-line')).not.toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
    if (['recursive-range-search','stable-merge-sort','tree-traversals','bst-insert-search','bst-height-shape','graph-representation','bfs-shortest-path','dfs-reachability','greedy-dp-coin-change','knapsack-dp'].includes(activity)) {
      await expect(page.locator('.concept-domain')).toBeVisible();
      await expect(page.locator('.draft-preview-indicator')).toContainText('Draft preview');
    }
  }
});

test('instructor preview exposes ten line-by-line Module 4 examples', async ({ page }) => {
  const activities = ['stack-lifo-basics','stack-postfix-evaluator','stack-delimiter-audit','stack-editor-undo','queue-fifo-basics','queue-round-robin','queue-printer-jobs','deque-end-operations','deque-sliding-window','deque-service-lane'];
  await page.goto('/problems.html?view=visualizations&preview=1');
  await expect(page.locator('.visualization-group', { hasText: 'Stacks' }).locator('.visualization-card')).toHaveCount(4);
  await expect(page.locator('.visualization-group', { hasText: 'Queues' }).locator('.visualization-card')).toHaveCount(3);
  await expect(page.locator('.visualization-group', { hasText: 'Deques' }).locator('.visualization-card')).toHaveCount(3);
  for (const activity of activities) {
    await page.goto(`/visualizer.html?activity=${activity}&preview=1`);
    await expect(page.locator('.linear-adt')).toBeVisible();
    await expect(page.locator('.linear-teaching')).toBeVisible();
    await expect(page.locator('.source-line.is-current')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
  }
});

test('visualizer workspaces choose a structure-aware desktop composition', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=stack-lifo-basics&preview=1');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-workspace-composition', 'split-vertical');
  if (testInfo.project.name === 'laptop') {
    const stackPanels = await page.locator('.itcc47-workbench').evaluate((workbench) => {
      const source = workbench.querySelector('.desktop-source').getBoundingClientRect();
      const visual = workbench.querySelector('.itcc47-visual-shell').getBoundingClientRect();
      return { sourceTop: source.top, visualTop: visual.top, sourceRight: source.right, visualLeft: visual.left };
    });
    expect(Math.abs(stackPanels.sourceTop - stackPanels.visualTop)).toBeLessThan(3);
    expect(stackPanels.visualLeft).toBeGreaterThan(stackPanels.sourceRight);
    const stackSections = await page.locator('.linear-adt-stack').evaluate((renderer) => {
      const operation = renderer.querySelector('.linear-operation').getBoundingClientRect();
      const lane = renderer.querySelector('.linear-lane').getBoundingClientRect();
      return { operationBottom: operation.bottom, laneTop: lane.top };
    });
    expect(stackSections.laneTop).toBeGreaterThanOrEqual(stackSections.operationBottom);
  }

  await page.goto('/visualizer.html?activity=queue-fifo-basics&preview=1');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-workspace-composition', 'stacked-horizontal');
  if (testInfo.project.name === 'laptop') {
    const queuePanels = await page.locator('.itcc47-workbench').evaluate((workbench) => {
      const source = workbench.querySelector('.desktop-source').getBoundingClientRect();
      const visual = workbench.querySelector('.itcc47-visual-shell').getBoundingClientRect();
      return { sourceBottom: source.bottom, visualTop: visual.top };
    });
    expect(queuePanels.visualTop).toBeGreaterThan(queuePanels.sourceBottom);
  }

  await page.goto('/visualizer.html?activity=tree-traversals&preview=1');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-workspace-composition', 'wide-hierarchy');
  await expect(page.locator('.concept-domain-trees')).toBeVisible();
});

test('deque foundation names both ends and changes state line by line', async ({ page }) => {
  await page.goto('/visualizer.html?activity=deque-end-operations&preview=1');
  await expect(page.getByRole('heading', { name: 'Use both ends of a deque' })).toBeVisible();
  await expect(page.locator('.linear-end-label.end-front')).toContainText('front');
  await expect(page.locator('.linear-end-label.end-back')).toContainText('back');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.linear-item')).toContainText('A');
  await expect(page.locator('.source-line.is-current')).toContainText('ADD_BACK deque, A');
});

test('instructor preview opens the six-problem Module 3 practice bank', async ({ page }, testInfo) => {
  await page.goto('/problem-list.html?module=3&preview=1');
  await expect(page.locator('.problem-choice')).toHaveCount(6);
  await page.locator('.problem-choice-action').first().click();
  await expect(page.getByRole('heading', { name: /Count Reachable Linked Nodes/i })).toBeVisible();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByLabel('Problem solution pseudocode')).toBeVisible();
  await expect(page.locator('#p-statement')).not.toBeEmpty();
});

test('reviewed companions expose the full teaching bridge and practice-only links', async ({ page }) => {
  await page.goto('/lesson.html?checkpoint=m2-binary-search&preview=1');
  await expect(page.locator('.companion-mental')).toContainText('Mental model');
  await expect(page.locator('.companion-trace')).toContainText('Worked trace');
  await expect(page.locator('.companion-invariants')).toContainText('Invariants and complexity');
  await expect(page.locator('.companion-misconceptions')).toContainText('Common misconceptions');
  await expect(page.locator('.companion-self-check details')).toHaveCount(2);
  await expect(page.locator('.lesson-sequence a')).not.toHaveCount(0);
  expect(await page.locator('.lesson-sequence a').evaluateAll((links) => links.every((link) => /(?:visualizer|practice)\.html/.test(link.getAttribute('href') || '')))).toBe(true);
});

test('practice contract changes preserve the old draft and clear only that completion', async ({ page }, testInfo) => {
  const earlierDraft = 'READ n\nWRITE n';
  await page.addInitScript((draft) => localStorage.setItem('itcc47.practice-records:v2', JSON.stringify({
    schemaVersion: 2,
    records: {
      'linked-node-count': { contentVersion: 1, draft, completed: true },
      'linked-find-value': { contentVersion: 2, draft: 'READ target\nWRITE -1', completed: true },
    },
    recovery: {},
  })), earlierDraft);
  await page.goto('/practice.html?module=3&problem=linked-node-count&preview=1');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByLabel('Problem solution pseudocode')).not.toHaveValue(earlierDraft);
  await expect(page.locator('#draft-recovery')).toContainText('Recover an earlier draft (1)');
  await expect(page.locator('#progress-line')).toContainText('1 of 6 solved');
  await page.locator('#draft-recovery summary').click();
  await page.getByRole('button', { name: 'Restore this draft for editing' }).click();
  await expect(page.getByLabel('Problem solution pseudocode')).toHaveValue(earlierDraft);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc47.practice-records:v2')));
  expect(stored.records['linked-node-count'].completed).toBe(false);
  expect(stored.records['linked-find-value'].completed).toBe(true);
});

test('Explore the Tools performs a guided transition and moves focus', async ({ page }) => {
  await page.goto('/itcc47.html');
  await page.getByRole('link', { name: 'Explore the Tools' }).click();
  await expect(page).toHaveURL(/#tools$/);
  await expect(page.getByRole('heading', { name: 'Open a tool' })).toBeFocused();
});

test('subject chooser routes to both course homes', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'Choose a subject and start exploring.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open ITCC45/ })).toHaveAttribute('href', 'itcc45.html');
  await expect(page.getByRole('link', { name: /Open ITCC47/ })).toHaveAttribute('href', 'itcc47.html');
  await page.getByRole('link', { name: /Open ITCC45/ }).click();
  await expect(page).toHaveURL(/itcc45\.html$/);
  await expect(page.getByRole('heading', { name: /See what Python objects are doing/ })).toBeVisible();
});

test('ITCC45 exposes six ordered topics with three audited examples each', async ({ page }) => {
  await page.goto('/itcc45-topics.html');
  await expect(page.getByRole('heading', { name: 'Build object-oriented thinking step by step.' })).toBeVisible();
  await expect(page.locator('.oop-topic-group')).toHaveCount(6);
  await expect(page.locator('.oop-topic-group h2')).toHaveText(['Classes', 'Objects', 'Encapsulation', 'Inheritance', 'Class Abstraction', 'Polymorphism']);
  await expect(page.locator('.oop-example-card')).toHaveCount(18);
  for (const group of await page.locator('.oop-topic-group').all()) {
    await expect(group.locator('.oop-example-card')).toHaveCount(3);
    await expect(group.getByRole('link', { name: 'Practice 3 tasks' })).toHaveCount(1);
  }
  await page.getByRole('link', { name: 'Open example' }).first().click();
  await expect(page).toHaveURL(/visualizer\.html\?course=itcc45&activity=itcc45-classes-blueprint$/);
});

test('ITCC45 lab identifies and navigates examples within a topic', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await expect(page.getByText('Topic 1 / Classes / Example 1 of 3')).toBeVisible();
  await expect(page.getByText('Read a class as a blueprint and follow self through initialization.')).toBeVisible();
  await page.getByRole('link', { name: /Next example:/ }).click();
  await expect(page).toHaveURL(/activity=itcc45-classes-instance-shadowing/);
  await expect(page.getByText('Topic 1 / Classes / Example 2 of 3')).toBeVisible();
  await expect(page.getByRole('link', { name: /Previous example:/ })).toBeVisible();
});

test('ITCC45 attempt and repair phases stay synchronized with source and output', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-shared-mutable');
  await expect(page.getByText('Attempt', { exact: true }).first()).toBeVisible();
  const slider = page.locator('#step-slider');
  await slider.fill('4');
  await expect(page.getByText('Repair', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Rendered program output')).toContainText('shared second: Notebook');
  await slider.fill('5');
  await expect(page.getByLabel('Rendered program output')).toContainText('fixed second: empty');
  await expect(page.getByLabel('Concept evidence')).toContainText('Per-instance owner');
});

test('Classes source and rendered output advance together through both print statements', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  const slider = page.locator('#step-slider');
  await slider.fill('7');
  await expect(page.locator('.source-line.is-current')).toContainText('print(Student.school)');
  await expect(page.getByLabel('Rendered program output')).toContainText('CMU');
  await expect(page.getByLabel('Rendered program output')).not.toContainText('Ana studies BSIT');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('.source-line.is-current')).toContainText('print(student.describe())');
  await expect(page.getByLabel('Rendered program output')).toContainText('Ana studies BSIT');
});

test('Classes model grows members and fields with semantic change labels', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  const slider = page.locator('#step-slider');
  const studentClass = page.locator('[data-class-id="class:Student"]');
  await expect(studentClass).toBeVisible();
  await expect(studentClass.locator('.object-class-member')).toHaveCount(0);
  await slider.fill('1');
  await expect(studentClass.locator('.member-attribute')).toContainText('school = "CMU"');
  await slider.fill('3');
  await expect(studentClass.locator('.member-method')).toHaveCount(2);
  await slider.fill('4');
  const studentObject = page.locator('[data-object-id="student:1"]');
  await expect(studentObject).toBeVisible();
  await expect(studentObject.locator('[data-field-name]')).toHaveCount(0);
  await slider.fill('5');
  await expect(studentObject.locator('[data-field-name="name"]')).toContainText('new');
  await slider.fill('6');
  await expect(studentObject.locator('[data-field-name="program"]')).toContainText('new');
  await expect(studentObject.locator('[data-field-name="name"]')).not.toContainText('new');
});

test('ITCC45 Motion animates blueprint growth, object creation, and field updates', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await page.getByLabel('Motion preference').selectOption('on');
  await installITCC45MotionProbe(page);
  const slider = page.locator('#step-slider');
  const step = page.getByRole('button', { name: 'Step', exact: true });

  await step.click();
  const schoolMember = page.locator('[data-class-id="class:Student"] .member-attribute');
  await expect(schoolMember).toBeVisible();
  await expectRecordedMotion(page, 'member', 'school = "CMU"');

  await expect(step).toBeEnabled({ timeout: 1600 });
  await slider.fill('3');
  await page.evaluate(() => { window.__itcc45MotionSamples = []; });
  await step.click();
  const studentObject = page.locator('[data-object-id="student:1"]');
  await expect(studentObject).toBeVisible();
  await expectRecordedMotion(page, 'object', 'student:1');

  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-encapsulation-property');
  await page.getByRole('button', { name: 'Edit scenario' }).click();
  await page.getByLabel('Proposed score').fill('92');
  await page.getByRole('button', { name: 'Apply scenario' }).click();
  const encapsulationSlider = page.locator('#step-slider');
  await encapsulationSlider.fill('2');
  const scoreField = page.locator('[data-object-id="record:1"] [data-field-name="_score"]');
  await expect(scoreField.locator('code')).toHaveText('88');
  await installITCC45MotionProbe(page);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expectRecordedMotion(page, 'field', '92');
  await expect(scoreField).toContainText('updated');
});

test('Python Object Lab synchronizes source, object state, lookup, output, and editable inputs', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await expect(page.getByRole('heading', { name: /Classes: turn a blueprint/ })).toBeVisible();
  await expect(page.getByLabel('Python source')).toContainText('class Student');
  await expect(page.getByLabel('Rendered program output')).toContainText('No output yet');
  await page.getByRole('button', { name: 'Edit scenario' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit scenario' })).toBeVisible();
  await page.getByLabel('Student name').fill('Lia');
  await page.getByRole('button', { name: 'Apply scenario' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit scenario' })).toBeHidden();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Visualize' }).click();
  await expect(page.locator('.object-instance-card')).toContainText('Lia');
  await expect(page.getByLabel('Rendered program output')).toContainText('Lia studies BSIT');
  await expect(page.locator('.visual-canvas .object-canvas')).toHaveCSS('overflow-y', 'auto');
  await page.getByRole('button', { name: 'Expand model' }).click();
  await expect(page.getByRole('dialog', { name: /Classes: turn a blueprint/ })).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Classes: turn a blueprint/ }).getByLabel('Class blueprints')).toContainText('Student');
  await page.getByRole('button', { name: 'Close full model view' }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Call path' }).click();
  await expect(page.locator('.evidence-drawer:visible')).toContainText('Student.describe');
  await page.getByRole('tab', { name: 'Output' }).click();
  await expect(page.locator('.evidence-drawer:visible pre')).toContainText('Lia studies BSIT');
  if (testInfo.project.name !== 'phone') {
    await page.getByRole('button', { name: 'Copy Python' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  }
});

test('ITCC45 desktop workspace resizes, focuses panels, and preserves playback', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  const stage = page.locator('.itcc45-lab-stage');
  const separator = page.getByRole('separator', { name: 'Resize code and model panels' });
  await expect(separator).toHaveAttribute('aria-valuenow', '40');
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', '45');

  const bounds = await stage.boundingBox();
  await separator.hover();
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);
  await page.mouse.up();
  await expect(separator).toHaveAttribute('aria-valuenow', '50');

  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  const finalStep = await slider.inputValue();
  await page.getByRole('button', { name: 'Focus source' }).click();
  await expect(stage).toHaveClass(/focus-source/);
  await expect(page.locator('#itcc45-model-pane')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(stage).toHaveClass(/focus-split/);
  await page.getByRole('button', { name: 'Focus model' }).click();
  await expect(stage).toHaveClass(/focus-model/);
  await page.getByRole('button', { name: 'Exit model focus' }).click();
  await expect(slider).toHaveValue(finalStep);
  await expect(page.getByLabel('Rendered program output')).toContainText('Ana studies BSIT');
  await page.getByRole('button', { name: 'Expand output' }).click();
  await expect(page.getByLabel('Rendered program output').locator('pre')).toContainText('CMU');
});

test('ITCC45 source fills the lab stage at short desktop heights', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.setViewportSize({ width: 1600, height: 520 });
  const url = process.platform === 'win32'
    ? `file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?course=itcc45&activity=itcc45-classes-blueprint`
    : '/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint';
  await page.goto(url);

  const geometry = await page.evaluate(() => {
    const sourcePane = document.querySelector('.itcc45-source-pane');
    const sourcePanel = sourcePane?.querySelector('.source-panel');
    const modelPane = document.querySelector('.itcc45-model-pane');
    if (!sourcePane || !sourcePanel || !modelPane) return null;
    const sourcePaneRect = sourcePane.getBoundingClientRect();
    const sourcePanelRect = sourcePanel.getBoundingClientRect();
    const modelPaneRect = modelPane.getBoundingClientRect();
    return {
      sourcePaneHeight: sourcePaneRect.height,
      sourcePanelHeight: sourcePanelRect.height,
      modelPaneHeight: modelPaneRect.height,
      sourceClientHeight: sourcePanel.clientHeight,
      sourceScrollHeight: sourcePanel.scrollHeight,
      sourceMaxHeight: getComputedStyle(sourcePanel).maxHeight,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry.sourceMaxHeight).toBe('none');
  expect(Math.abs(geometry.sourcePaneHeight - geometry.modelPaneHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.sourcePanelHeight - geometry.sourcePaneHeight)).toBeLessThanOrEqual(1);
  expect(geometry.sourceScrollHeight).toBeGreaterThan(geometry.sourceClientHeight);
});

test('ITCC45 evidence rail uses adaptive defaults and remembers learner choice', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  await expect(page.getByLabel('Collapsed learning evidence')).toBeVisible();
  await page.getByRole('tab', { name: 'Object state' }).click();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
  await expect(page.getByRole('tab', { name: 'Object state' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Collapse learning evidence' }).click();
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  await page.getByRole('button', { name: 'Expand learning evidence' }).click();
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc45.workspace-layout:v1')));
  expect(saved).toEqual({ version: 1, evidence: 'expanded', sourceRatio: 0.4 });

  await page.evaluate(() => localStorage.removeItem('itcc45.workspace-layout:v1'));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
});

test('ITCC45 topics use distinct real-world scenarios', async ({ page }) => {
  const scenarios = [
    ['itcc45-object-state', 'class LibraryBook', /track two library books/],
    ['itcc45-encapsulation-property', 'class GradeRecord', /protect a valid score/],
    ['itcc45-inheritance-lookup', 'class Delivery', /calculate an express delivery/],
    ['itcc45-abstraction-contract', 'class PaymentMethod', /require a payment contract/],
    ['itcc45-polymorphic-dispatch', 'class EmailNotification', /send one alert two ways/],
  ];
  for (const [activity, source, title] of scenarios) {
    await page.goto(`/visualizer.html?course=itcc45&activity=${activity}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByLabel('Python source')).toContainText(source);
  }
});

test('every retained ITCC45 example route renders a deterministic source and model', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/itcc45-topics.html');
  const links = await page.locator('.oop-example-link').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  expect(links).toHaveLength(18);
  for (const href of links) {
    await page.goto(`/${href}`);
    await expect(page.getByLabel('Python source')).toContainText('class');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/visualization canvas/)).toBeVisible();
  }
});

test('ITCC45 practice gives rationale and persists only solved progress', async ({ page }) => {
  await page.goto('/itcc45-practice.html?topic=classes');
  await page.evaluate(() => localStorage.removeItem('itcc45.practice:v1'));
  await page.reload();
  await page.getByLabel('CMU').check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toContainText('That reasoning holds.');
  await expect(page.locator('#practice-progress-count')).toHaveText('1 / 18 complete');
  await page.reload();
  await expect(page.locator('#practice-progress-count')).toHaveText('1 / 18 complete');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc45.practice:v1')));
  expect(Object.keys(stored).sort()).toEqual(['contentVersion', 'solvedIds']);
});

test('mismatched ITCC45 activity falls back and normalizes the URL', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=bubble-sort');
  await expect(page.getByRole('heading', { name: /Classes: turn a blueprint/ })).toBeVisible();
  await expect(page).toHaveURL(/course=itcc45&activity=itcc45-classes-blueprint/);
});

test('Visualize opens the activity menu instead of defaulting to Bubble Sort', async ({ page }) => {
  await page.goto('/itcc47.html');
  await page.getByRole('link', { name: /Visualize an algorithm/ }).click();
  await expect(page).toHaveURL(/visualizer\.html$/);
  await expect(page.getByRole('heading', { name: 'Choose a visualization.' })).toBeVisible();
  await expect(page.locator('.visualizer-menu-item')).toHaveCount(35);
  await expect(page.locator('.visualizer-workspace')).toHaveCount(0);
  await page.getByRole('link', { name: /Selection Sort/ }).click();
  await expect(page).toHaveURL(/visualizer\.html\?activity=selection-sort$/);
  await expect(page.getByRole('heading', { name: 'Selection Sort' })).toBeVisible();
});

test('sorting can step, play, pause, and scrub backward', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await (await visualizerMotion(page)).selectOption('off');
  const slider = await visualizerTimeline(page);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(slider).toHaveValue('1');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await slider.fill('0');
  await expect(slider).toHaveValue('0');
});

test('binary search explains its sorted copy before searching', async ({ page }) => {
  await page.goto('/visualizer.html?activity=binary-search&preview=1');
  await expect(page.locator('#result-caption')).toContainText('Set target');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#result-caption')).toContainText('sorted copy');
  await expect(page.locator('.source-line.is-current')).toContainText('values <- sorted copy');
});

test('every curated array algorithm exposes its real loop line and boundary', async ({ page }, testInfo) => {
  const cases = [
    ['bubble-sort', 1, 'FOR end <- n - 1 DOWNTO 1 DO', 'unsorted range'],
    ['selection-sort', 1, 'FOR i <- 0 TO n - 2 DO', 'search range'],
    ['insertion-sort', 1, 'FOR i <- 1 TO n - 1 DO', 'sorted insertion range'],
    ['linear-search', 2, 'FOR i <- 0 TO n - 1 DO', null],
    ['binary-search', 4, 'WHILE low <= high DO', 'search range'],
  ];
  for (const [activity, steps, sourceLine, boundaryLabel] of cases) {
    await page.goto(`/visualizer.html?activity=${activity}&preview=1`);
    await (await visualizerMotion(page)).selectOption('off');
    for (let step = 0; step < steps; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
    if (boundaryLabel) await expect(page.locator('.array-loop-boundary')).toContainText(boundaryLabel);
    if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
    await expect(page.locator('.source-line.is-current')).toContainText(sourceLine);
  }
});

const teachingShellCases = [
  ['bubble-sort', 4, 'Adjacent comparison', ['values[j]', 'values[j + 1]']],
  ['selection-sort', 4, 'Current selection', ['minIndex', 'values[j]']],
  ['insertion-sort', 4, 'Insertion state', ['key', 'values[j]']],
  ['linear-search', 3, 'Current scan', ['target', 'values[i]']],
  ['binary-search', 6, 'Search window', ['target', 'low', 'mid', 'high']],
  ['array-list-insert', 4, 'Insertion shift', ['value', 'shift from', 'shift to']],
  ['array-list-remove', 3, 'Removal shift', ['removed', 'shift from', 'shift to']],
  ['linked-list-traversal', 4, 'Traversal pointer', ['current']],
  ['linked-list-insert-head', 2, 'Head pointer update', ['newNode']],
];
for (const [activity, steps, title, labels] of teachingShellCases) {
  test(`${activity} exposes its focused teaching shell`, async ({ page }) => {
    await page.goto(`/visualizer.html?activity=${activity}&preview=1`);
    await (await visualizerMotion(page)).selectOption('off');
    for (let step = 0; step < steps; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
    const teaching = page.locator('.teaching-strip');
    await expect(teaching.getByRole('heading', { name: title })).toBeVisible();
    for (const label of labels) await expect(teaching.getByText(label, { exact: true })).toBeVisible();
  });
}

test('ITCC47 integrates playback and remembers the evidence rail', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=selection-sort&preview=1');
  await expect(page.locator('.playback-dock')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
  if (testInfo.project.name === 'phone') {
    await expect(page.locator('.integrated-playback')).toHaveCSS('position', 'sticky');
    await page.getByRole('tab', { name: 'Code' }).click();
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.locator('#result-caption')).toContainText('Set i to 0');
    return;
  }
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
  await page.getByRole('button', { name: 'Collapse learning evidence' }).click();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  const split = await page.evaluate(() => {
    const code = document.querySelector('.desktop-source').getBoundingClientRect();
    const visual = document.querySelector('.itcc47-visual-shell').getBoundingClientRect();
    return { code, visual, scrollbar: getComputedStyle(document.querySelector('.source-panel')).scrollbarWidth };
  });
  expect(Math.abs(split.code.y - split.visual.y)).toBeLessThan(2);
  expect(split.visual.x).toBeGreaterThan(split.code.x + split.code.width);
  expect(split.scrollbar).toBe('thin');
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  await page.getByRole('tab', { name: 'Variables' }).click();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
});

test('array-list removal shows setup, loop entry, and the target to remove', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=array-list-remove&preview=1');
  await (await visualizerMotion(page)).selectOption('off');
  await expect(page.locator('.source-line.is-current')).toContainText('index <- 1');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-marker')).toContainText('remove here');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-loop-boundary')).toContainText('shift boundary: i = 1');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('.source-line.is-current')).toContainText('FOR i <- index TO size - 2 DO');
});

test('custom signed data is rendered and oversized data is rejected inline', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  const controls = page.getByText('Data and inputs', { exact: true });
  if (!(await page.locator('.data-controls').evaluate((element) => element.open))) await controls.click();
  const input = page.getByLabel('Custom values (comma-separated)');
  await input.fill('-8, -2, 0, 5');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.array-cell')).toHaveCount(4);
  await expect(page.locator('.array-cell').nth(0)).toContainText('-8');
  await expect(page.locator('.array-cell').nth(2)).toContainText('0');
  await input.fill(Array.from({ length: 19 }, (_, i) => i).join(','));
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('#data-error')).toContainText('at most 18 values');
});

test('array-list activity synchronizes source, structure, trace, and metrics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=array-list-insert&preview=1');
  await (await visualizerMotion(page)).selectOption('off');
  await expect(page.getByRole('heading', { name: 'Insert at an index' })).toBeVisible();
  await expect(page.locator('.source-line code').nth(0)).toContainText('index <- 2');
  await expect(page.locator('.source-line code').nth(1)).toContainText('value <- 24');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(await visualizerTimeline(page)).toHaveValue('1');
  await expect(page.locator('.source-line.is-current')).toContainText('value <- 24');
  await expect(page.locator('.array-held-value strong')).toHaveText('24');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.source-line.is-current')).toContainText('size <- size + 1');
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.source-line.is-current')).toContainText('FOR i <- size - 2');
  await expect(page.locator('.array-loop-boundary')).toContainText('index 2 … i = 3');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.source-line.is-current')).toContainText('values[i + 1] <- values[i]');
  await expect(page.locator('.array-cell.bar-move')).toHaveCount(1);
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Operations' }).click();
  const visibleEvidence = page.locator('.evidence-drawer:visible');
  await expect(visibleEvidence.locator('.metric-summary')).toContainText('Moves');
  await expect(visibleEvidence.locator('.metric-summary')).toContainText('1');
  await visibleEvidence.getByRole('button', { name: 'Primitive model' }).click();
  await expect(visibleEvidence.getByText('These algorithm metrics are never added to it.')).toBeVisible();
});

test('insertion shifts stage one held entity and one explicit hole without visual overwrite', async ({ page }) => {
  await page.goto('/visualizer.html?activity=insertion-sort&preview=1');
  const slider = await visualizerTimeline(page);
  await slider.fill('5');
  await expect(page.locator('.array-held-value strong')).toHaveText('17');
  await expect(page.locator('.array-held-value')).toHaveAttribute('aria-label', 'Held insertion value 17');
  await expect(page.locator('[data-entity-id="item:0"]')).toContainText('42');
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
  const geometry = await page.evaluate(() => {
    const indices = [...document.querySelectorAll('.array-index')].map((node) => node.getBoundingClientRect().bottom);
    const connector = document.querySelector('.array-connector').getBoundingClientRect();
    return { lowestIndex: Math.max(...indices), connectorTop: connector.top };
  });
  expect(geometry.connectorTop).toBeGreaterThan(geometry.lowestIndex + 8);
  await slider.fill('11');
  await expect(page.locator('.array-held-value strong')).toHaveText('8');
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
});

test('scope lines anchor to their slots while the legend stays in an accessible disclosure', async ({ page }) => {
  await page.goto('/visualizer.html?activity=array-list-insert&preview=1');
  await (await visualizerMotion(page)).selectOption('off');
  await (await visualizerTimeline(page)).fill('4');

  const legend = page.locator('.visualization-legend');
  const legendSummary = legend.locator('summary');
  await expect(legendSummary).toBeVisible();
  await expect(legend).not.toHaveAttribute('open', '');
  await expect(page.locator('.array-legend')).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.array-item')].map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, center: rect.left + rect.width / 2 };
    });
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    const boundary = box('.array-loop-boundary');
    const route = box('.array-connector-route');
    const summary = box('.visualization-legend > summary');
    const connector = box('.array-connector');
    const intersectionArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const canvas = box('.visual-canvas');
    return {
      boundaryStartError: boundary.left - (items[2].left + 6),
      boundaryEndError: boundary.right - (items[3].right - 6),
      routeStartError: route.left - items[3].center,
      routeEndError: route.right - items[4].center,
      connectorLegendOverlap: intersectionArea(connector, summary),
      legendVisibleInCanvas: summary.left >= canvas.left && summary.right <= canvas.right,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(Math.abs(geometry.boundaryStartError)).toBeLessThan(0.75);
  expect(Math.abs(geometry.boundaryEndError)).toBeLessThan(0.75);
  expect(Math.abs(geometry.routeStartError)).toBeLessThan(0.75);
  expect(Math.abs(geometry.routeEndError)).toBeLessThan(0.75);
  expect(geometry.connectorLegendOverlap).toBe(0);
  expect(geometry.legendVisibleInCanvas).toBe(true);
  expect(geometry.pageOverflow).toBe(false);

  await legendSummary.focus();
  await page.keyboard.press('Enter');
  await expect(legend).toHaveAttribute('open', '');
  await expect(legend.locator('.visualization-legend-panel')).toContainText('Loop / search scope');
  await page.keyboard.press('Enter');
  await expect(legend).not.toHaveAttribute('open', '');

  await page.goto('/visualizer.html?activity=linked-list-traversal&preview=1');
  const linkedLegend = page.locator('.visualization-legend');
  await expect(linkedLegend.locator('summary')).toBeVisible();
  await linkedLegend.locator('summary').click();
  await expect(linkedLegend.locator('.visualization-legend-panel')).toContainText('Head');
  await expect(linkedLegend.locator('.visualization-legend-panel')).toContainText('Current');
  await expect(linkedLegend.locator('.visualization-legend-panel')).toContainText('Visited');
  await expect(linkedLegend.locator('.visualization-legend-panel')).toContainText('Pointer write');
});

test('Motion swaps stable entities and gates rapid structural steps', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  const slider = await visualizerTimeline(page);
  await slider.fill('4');
  const before = await page.locator('[data-entity-id="item:0"]').boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeDisabled();
  await expect(slider).toHaveValue('5');
  const during = await page.locator('[data-entity-id="item:0"]').boundingBox();
  expect(during.x).toBeGreaterThan(before.x);
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeEnabled({ timeout: 1200 });
  await expect(slider).toHaveValue('5');
});

test('array-list shifts identify the moving value and its exact destination', async ({ page }) => {
  await page.goto('/visualizer.html?activity=array-list-insert&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  for (let step = 0; step < 4; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-connector span')).toHaveText('shift 12: [3] → [4]');
  await expect(page.locator('[data-motion-role="moving"]')).toHaveAttribute('data-entity-id', 'item:3');
  await expect(page.locator('.array-held-value strong')).toHaveText('24');

  await page.goto('/visualizer.html?activity=array-list-remove&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  for (let step = 0; step < 3; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-connector span')).toHaveText('shift 31: [2] → [1]');
  await expect(page.locator('[data-motion-role="moving"]')).toHaveAttribute('data-entity-id', 'item:2');
  await expect(page.locator('.array-connector')).toHaveClass(/moves-left/);
});

test('Motion duration follows speed while direct seeking stays immediate', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  const speed = await visualizerSpeed(page);
  await speed.selectOption('3');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.8');
  await speed.selectOption('6');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.52');
  await speed.selectOption('9');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.3');
  await (await visualizerTimeline(page)).fill('2');
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeEnabled();
});

test('motion preferences persist, reduce, turn off, and reset to the device', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  let control = await visualizerMotion(page);
  await control.selectOption('reduced');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await page.reload();
  control = await visualizerMotion(page);
  await expect(control).toHaveValue('reduced');
  await control.selectOption('off');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-off/);
  await control.selectOption('device');
  await expect(control).toHaveValue('device');
});

test('OS reduced motion becomes the default when no override is saved', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('itcc47.release-preview:v1', JSON.stringify({ schemaVersion: 2, profileId: 'itcc47-2026-2027-s1', profileVersion: 3, currentCheckpointId: 'm8-dp' })));
  const page = await context.newPage();
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await expect(await visualizerMotion(page)).toHaveValue('device');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await context.close();
});

test('linked-list head insertion synchronizes references, links, source, and metrics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=linked-list-insert-head&preview=1');
  await expect(page.getByRole('heading', { name: 'Insert at the head' })).toBeVisible();
  const slider = await visualizerTimeline(page);
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('.linked-node')).toHaveCount(3);
  await expect(page.locator('.linked-node').first()).toContainText('24');
  await expect(page.locator('.pointer-labels').first()).toContainText('head');
  await expect(page.locator('.linked-arrow')).toHaveCount(2);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Operations' }).click();
  await expect(page.locator('.evidence-drawer:visible .metric-summary')).toContainText('Pointer writes');
  await expect(page.locator('.evidence-drawer:visible .metric-summary')).toContainText('2');
});

test('linked-list structure, head, and current pointer have distinct visual roles', async ({ page }) => {
  await page.goto('/visualizer.html?activity=linked-list-traversal&preview=1');
  await (await visualizerTimeline(page)).fill('9');
  await expect(page.locator('.linked-node-wrap.has-head')).toHaveCount(1);
  await expect(page.locator('.linked-node-wrap.is-current')).toHaveCount(1);
  await expect(page.locator('.pointer-head')).toHaveText('head');
  await expect(page.locator('.pointer-current')).toHaveText('current');
  await expect(page.locator('.linked-node-wrap.is-current .linked-node')).toHaveAttribute('aria-label', /current node/);
});

test('curated linked-list pseudocode opens in the lab and retains trace, output, and diagnostics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=linked-list-traversal&preview=1');
  await page.getByRole('link', { name: /Edit pseudocode/ }).click();
  await expect(page).toHaveURL(/tracer\.html\?activity=linked-list-traversal/);
  await expect(page.getByLabel('Pseudocode editor')).toHaveValue(/head <- NEW NODE\(18\)/);
  await expect(page.locator('#status-line')).toContainText('loaded from the Visualizer');
  await page.getByRole('button', { name: /run/i }).click();
  await expect(page.locator('#status-line')).toContainText('step(s) recorded');
  await expect(page.locator('#trace-body tr')).not.toHaveCount(0);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('#output-box')).toContainText('31');
});

test('pseudocode lab shows node references in scoped runtime state', async ({ page }, testInfo) => {
  await page.goto('/tracer.html');
  await page.getByLabel('Pseudocode editor').fill(`FUNCTION Echo(node)
 RETURN node
ENDFUNCTION
head <- NEW NODE(4)
CALL Echo(head) INTO alias
WRITE alias = head`);
  await page.getByRole('button', { name: /run/i }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('#vars-box')).toContainText('&node:1');
  await expect(page.locator('#output-box')).toContainText('true');
});

test('mobile visualizer tabs replace the central surface without resetting playback', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(await visualizerTimeline(page)).toHaveValue('1');
  await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('.desktop-source')).toBeVisible();
  await expect(page.locator('.visual-canvas')).toBeHidden();
  await page.getByRole('tab', { name: 'Trace' }).click();
  await expect(page.locator('.mobile-evidence')).toBeVisible();
  await expect(await visualizerTimeline(page)).toHaveValue('1');
});

test('tracer runs and its result tabs work from the keyboard', async ({ page }) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: /run/i }).click();
  await expect(page.locator('#status-line')).toContainText('step(s) recorded');
  const traceTab = page.getByRole('tab', { name: /trace/i });
  await traceTab.focus();
  await traceTab.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /operations/i })).toHaveAttribute('aria-selected', 'true');
});

test('tracer delegates editor and trace overflow to their parent surfaces', async ({ page }, testInfo) => {
  await page.goto('/tracer.html');
  const source = ['x <- 0', ...Array.from({ length: 48 }, () => 'x <- x + 1'), 'WRITE x'].join('\n');
  await page.getByLabel('Pseudocode editor').fill(source);
  const editorScroll = await page.evaluate(() => {
    const editor = document.querySelector('#code-box');
    const parent = document.querySelector('.editor-card');
    return {
      editorOverflow: getComputedStyle(editor).overflowY,
      editorClient: editor.clientHeight,
      editorScroll: editor.scrollHeight,
      parentOverflow: getComputedStyle(parent).overflowY,
    };
  });
  expect(editorScroll.editorOverflow).toBe('hidden');
  expect(editorScroll.editorScroll).toBeLessThanOrEqual(editorScroll.editorClient + 2);
  expect(editorScroll.parentOverflow).toBe(testInfo.project.name === 'phone' ? 'visible' : 'auto');

  await page.getByRole('button', { name: 'Run', exact: true }).click();
  const traceScroll = await page.evaluate(() => ({
    panel: getComputedStyle(document.querySelector('#panel-trace')).overflowY,
    table: getComputedStyle(document.querySelector('#panel-trace .trace-table-wrap')).overflowY,
  }));
  expect(traceScroll.table).toBe('visible');
  expect(traceScroll.panel).toBe(testInfo.project.name === 'phone' ? 'visible' : 'auto');
});

test('tracer explains exact symbolic FOR-loop counts and explicit control costs', async ({ page }) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: sum of n values/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();

  await expect(page.locator('#ops-total-value')).toHaveText('30');
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n + 6');
  await expect(page.locator('#ops-growth')).toHaveText('O(n)');
  await expect(page.locator('.loop-explanation').first()).toContainText('= n iterations');

  const bodyRow = page.locator('.ops-row').filter({ hasText: 'total <- total + i' });
  await bodyRow.click();
  await expect(page.locator('.code-line.count-line')).toHaveAttribute('data-line', '4');
  await expect(page.locator('.code-line.count-loop-line')).toHaveCount(3);

  await page.getByText('Full Control', { exact: true }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 11n + 12');
  await expect(page.locator('.ops-row-kind')).toHaveCount(3);
  await expect(page.locator('.ops-row').filter({ hasText: 'condition' })).toContainText('n + 1');
});

test('recursive functions expose call frames and guided recurrence assumptions', async ({ page }, testInfo) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Recursive Factorial/ }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  await page.locator('#step-slider').fill('8');
  await expect(page.locator('#call-stack-box')).toContainText('Factorial');
  await expect(page.locator('#call-stack-box')).toContainText('depth 3');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Results' }).click();
  await page.getByRole('tab', { name: 'Recurrence' }).click();
  await page.getByRole('button', { name: 'Confirm size measure' }).click();
  await expect(page.locator('#recurrence-assumptions')).toContainText('non-recursive work');
  await page.locator('input[name="recurrence-combine"][value="constant"]').click();
  await expect(page.locator('#recurrence-formula')).toContainText('T(n)');
  await expect(page.locator('#recurrence-big-o')).toHaveText('O(n)');
});

test('symbolic operation counting is touch-readable without horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: nested loops/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n² + 6');
  await expect(page.locator('.loop-explanation').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('problem work tabs reach code and results on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/practice.html?module=1');
  await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('#code-box')).toBeVisible();
  await expect(page.locator('#problem-pane')).toBeHidden();
  await page.getByRole('button', { name: 'Run Checks' }).click();
  await expect(page.getByRole('tab', { name: 'Results' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#results-body')).toBeVisible();
});

test('module catalog exposes current practice and retains the full problem list', async ({ page }, testInfo) => {
  await page.goto('/problems.html');
  await expect(page.getByRole('heading', { name: 'Choose what to practise' })).toBeVisible();
  await expect(page.locator('.module-card')).toHaveCount(8);
  await expect(page.locator('.module-card-current')).toContainText('Algorithmic Thinking');
  await expect(page.locator('.module-card-locked')).not.toHaveCount(0);
  await expect(page.locator('.module-card-current .module-problem-card')).toHaveCount(11);
  await page.getByRole('link', { name: /Browse all Module 1 practice/ }).click();
  await expect(page).toHaveURL(/problem-list\.html\?module=1$/);
  await expect(page.getByRole('heading', { name: 'Module 1: select a problem' })).toBeVisible();
  await page.locator('.problem-choice-action').first().click();
  await expect(page).toHaveURL(/practice\.html\?module=1&problem=/);
  await expect(page.locator('#p-module')).toHaveText('Module 1');
  await expect(page.locator('#progress-line')).toContainText('of 11 solved');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByRole('link', { name: 'Back to Problem List' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'All Problems' })).toHaveCount(0);
});

test('modules catalog opens visualizations in the shared navigation shell', async ({ page }) => {
  await page.goto('/problems.html?view=visualizations&preview=1');
  await expect(page.getByRole('tab', { name: 'Visualizations' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.visualization-card')).toHaveCount(35);
  await page.getByRole('link', { name: /Bubble Sort/ }).click();
  await expect(page).toHaveURL(/visualizer\.html\?activity=bubble-sort&preview=1$/);
  await expect(page.locator('.topbar-nav a', { hasText: 'Visualize' })).toHaveAttribute('aria-current', 'page');
});

test('difficulty tags use a distinct increasing-intensity palette', async ({ page }) => {
  await page.goto('/problem-list.html?module=1');
  await expect(page.locator('.diff-warmup').first()).toBeVisible();
  await expect(page.locator('.diff-core').first()).toBeVisible();
  await expect(page.locator('.diff-challenge').first()).toBeVisible();
  await expect(page.locator('.diff-medium').first()).toBeVisible();
  await expect(page.locator('.diff-mediumhard').first()).toBeVisible();
  await expect(page.locator('.diff-hard').first()).toBeVisible();
  const colors = await page.locator('.chip-diff').evaluateAll((chips) => chips.map((chip) => getComputedStyle(chip).backgroundColor));
  expect(new Set(colors).size).toBeGreaterThan(2);
});

test('touch indentation works in both structured and pseudocode editors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/writer.html');
  const secondStep = page.locator('.step-input').nth(1);
  await secondStep.focus();
  const writerIndent = page.getByRole('button', { name: 'Indent step' });
  await writerIndent.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const writerScrollBefore = await page.evaluate(() => window.scrollY);
  await writerIndent.click();
  await expect(page.locator('.step-row').nth(1)).toHaveCSS('padding-left', '20px');
  expect(await page.evaluate(() => window.scrollY)).toBe(writerScrollBefore);
  const writerOutdent = page.getByRole('button', { name: 'Outdent step' });
  const writerOutdentScrollBefore = await page.evaluate(() => window.scrollY);
  await writerOutdent.click();
  await expect(page.locator('.step-row').nth(1)).toHaveCSS('padding-left', '6px');
  expect(await page.evaluate(() => window.scrollY)).toBe(writerOutdentScrollBefore);

  await page.goto('/tracer.html');
  const editor = page.locator('#code-box');
  const longProgram = ['IF ready THEN', ...Array.from({ length: 40 }, () => 'WRITE "yes"'), 'ENDIF'].join('\n');
  await editor.fill(longProgram);
  await editor.evaluate((element) => {
    const endifStart = element.value.lastIndexOf('ENDIF');
    element.setSelectionRange(endifStart, element.value.length);
  });
  await page.evaluate(() => window.scrollTo(0, Math.min(136, document.documentElement.scrollHeight - innerHeight)));
  const tracerScrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Indent', exact: true }).click();
  expect(await page.evaluate(() => window.scrollY)).toBe(tracerScrollBefore);
  const toolbarBox = await page.locator('.editor-toolbar').boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox.y).toBeGreaterThanOrEqual(0);
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(844);
  expect((await editor.inputValue()).split('\n').at(-1)).toBe('    ENDIF');
  const tracerOutdentScrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Outdent', exact: true }).click();
  expect(await page.evaluate(() => window.scrollY)).toBe(tracerOutdentScrollBefore);
  expect((await editor.inputValue()).split('\n').at(-1)).toBe('ENDIF');
});

test('all entry pages open from file URLs and permit an interaction', async ({ page }) => {
  test.skip(process.platform !== 'win32');
  for (const entry of entries) {
    const fileUrl = `file:///${path.resolve(__dirname, '..', entry).replace(/\\/g, '/')}`;
    await page.goto(fileUrl);
    await expect(page.locator('body')).toBeVisible();
  }
  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?activity=bubble-sort&preview=1`);
  await (await visualizerMotion(page)).selectOption('off');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(await visualizerTimeline(page)).toHaveValue('1');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'tracer.html').replace(/\\/g, '/')}`);
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: sum of n values/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n + 6');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?course=itcc45&activity=itcc45-object-state`);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');
});

test('cached navigation remains available offline', async ({ page, context }, testInfo) => {
  await page.goto('/visualizer.html');
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.goto('/practice.html?module=1');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('#code-box')).toBeVisible();
});

test('service-worker updates remove only obsolete practice caches', async ({ page }) => {
  await page.goto('/missing-test-entry');
  await page.evaluate(async () => {
    await caches.open('another-app-cache');
    await caches.open('itcc47-practice-obsolete');
  });
  await page.goto('/index.html');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(async () => await caches.keys())).toContain('another-app-cache');
  expect(await page.evaluate(async () => (await caches.keys()).includes('itcc47-practice-obsolete'))).toBe(false);
});
