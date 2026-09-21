const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');
const path = require('path');

const instructorAccessToken = fs.readFileSync(path.resolve(__dirname, '..', '.instructor-preview-token'), 'utf8').trim();

for (const entry of ['index.html', 'itcc47.html', 'itcc45.html', 'itcc45-topics.html', 'itcc45-practice.html?topic=classes', 'computer-architecture.html', 'computer-architecture-modules.html', 'computer-architecture-practice.html', 'computer-networking.html', 'computer-networking-modules.html', 'computer-networking-practice.html', 'visualizer.html', 'visualizer.html?activity=insertion-sort', 'visualizer.html?activity=linked-list-traversal', 'visualizer.html?activity=array-linked-comparison', 'visualizer.html?activity=linked-list-insert-head', 'visualizer.html?activity=linked-list-sorted-insert', 'visualizer.html?activity=linked-list-find-update', 'visualizer.html?activity=linked-list-delete', 'visualizer.html?activity=stack-lifo-basics', 'visualizer.html?activity=deque-sliding-window', 'visualizer.html?course=itcc45&activity=itcc45-classes-blueprint', 'visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle', 'visualizer.html?course=computer-architecture&activity=architecture-decode-instruction', 'visualizer.html?course=computer-architecture&activity=architecture-add-immediate', 'visualizer.html?course=computer-networking&activity=networking-read-classroom-network', 'visualizer.html?course=computer-networking&activity=networking-local-peer-sharing', 'visualizer.html?course=computer-networking&activity=networking-classify-components', 'visualizer.html?course=computer-networking&activity=networking-compare-media', 'visualizer.html?course=computer-networking&activity=networking-read-network-topologies', 'visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery', 'industry-workbench.html', 'industry-workbench.html?scenario=industry-priority-range-recall', 'writer.html', 'tracer.html', 'problems.html', 'problems.html?view=midterm', 'problems.html?view=visualizations', 'problems.html?view=workbenches', 'lesson.html?checkpoint=m2-selection-sort', 'lesson.html?checkpoint=m3-linked-foundations&preview=1', 'student-materials.html', 'problem-list.html?module=1', 'problem-list.html?module=4', 'practice.html?module=1', 'practice.html?module=3&problem=linked-node-count', 'practice.html?module=3&problem=linked-invariant-audit', 'practice.html?module=4&problem=stack-reverse']) {
  test(`${entry} has no serious or critical Axe violations`, async ({ page }) => {
    await page.goto(`/${entry}`);
    if (entry === 'visualizer.html') await expect(page).toHaveURL(/problems\.html\?view=visualizations$/);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    const summary = important.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
    expect(summary, important.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  });
}

test('stack phase controls are keyboard operable and transitional states are Axe-clean', async ({ page }) => {
  await page.goto('/visualizer.html?activity=stack-lifo-basics');
  await expect(page.getByRole('heading', { name: 'Push, peek, and pop' })).toBeVisible();
  const step = page.getByRole('button', { name: 'Step', exact: true });
  await step.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('.stack-execution-workbench')).toHaveAttribute('data-line', '3');
  await expect(page.locator('.stack-execution-workbench')).toHaveAttribute('data-phase', '1');
  for (const target of [2, 4, 11, 15, 18]) {
    await page.getByLabel('Playback settings', { exact: true }).click();
    await page.getByLabel('Timeline step', { exact: true }).fill(String(target));
    await page.getByLabel('Playback settings', { exact: true }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
  }
});

test('postfix phase, token, runtime and output states are keyboard operable and Axe-clean', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/visualizer.html?activity=stack-postfix-evaluator');
  await page.getByRole('button', { name: 'Step', exact: true }).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
  await expect(page.locator('.postfix-workbench')).toHaveAttribute('data-line', '4');
  await expect(page.locator('.postfix-workbench')).toHaveAttribute('data-token', '1');
  for (const target of [3,4,5,21,25,29,31,34,50,54,60,68,69]) {
    await page.getByLabel('Playback settings', { exact: true }).click();
    await page.getByLabel('Timeline step', { exact: true }).fill(String(target));
    await page.getByLabel('Playback settings', { exact: true }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
  }
});

test('Recent Documents compact scenario controls are keyboard operable and Axe-clean', async ({ page }) => {
  await page.goto('/visualizer.html?activity=array-linked-comparison&preview=1');
  const documentChoice = page.getByLabel('Document', { exact: true });
  const structureChoice = page.getByLabel('Data structure', { exact: true });
  await expect(documentChoice).toBeVisible();
  await expect(structureChoice).toBeVisible();
  await documentChoice.focus();
  await documentChoice.press('End');
  await expect(documentChoice).toBeFocused();
  await expect(documentChoice).toHaveValue('notes');
  await structureChoice.focus();
  await structureChoice.press('End');
  await expect(structureChoice).toBeFocused();
  await expect(structureChoice).toHaveValue('linked');
  await expect(page.locator('.sequence-scenario')).toContainText('Opened: Notes.txt');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  const summary = important.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) }));
  expect(summary, important.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
});

test('ITCC45 scenario and expanded-model dialogs have no serious or critical Axe violations', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  for (const buttonName of ['Edit scenario', 'Expand model']) {
    await page.getByRole('button', { name: buttonName }).click();
    if (buttonName === 'Expand model') {
      await expect(page.locator('.object-model-dialog .object-empty')).toHaveCSS('opacity', '1');
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    const summary = important.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) }));
    expect(summary, important.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
    await page.getByRole('button', { name: buttonName === 'Edit scenario' ? 'Close scenario dialog' : 'Close full model view' }).click();
  }
});

test('network topology chooser has no serious or critical Axe violations', async ({ page }) => {
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-read-classroom-network');
  await page.getByRole('button', { name: /Change Network Topology/ }).click();
  await expect(page.getByRole('dialog', { name: 'Change Network Topology' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  const summary = important.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) }));
  expect(summary, important.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
});

test('reviewed visualization progress remains accessible', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('itcc47.visualizer-progress:v1', JSON.stringify({
      schemaVersion: 1,
      activities: { 'bubble-sort': { lastVisitedAt: '2026-08-18T02:03:04.000Z', reviewedAt: '2026-08-18T02:03:04.000Z' } },
    }));
  });
  await page.goto('/problems.html?view=visualizations');
  await expect(page.locator('.visualization-card.visualization-reviewed')).toHaveCount(1);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  expect(important.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) }))).toEqual([]);
});

test('selected Midterm modules, disclosures, navigation, and local progress remain accessible', async ({ page }) => {
  await page.goto('/problems.html?view=midterm');
  await page.evaluate(() => {
    const contentVersion = PROBLEMS.find((problem) => problem.id === 'linked-node-count').contentVersion;
    localStorage.setItem('itcc47.visualizer-progress:v1', JSON.stringify({
      schemaVersion: 1,
      activities: { 'bubble-sort': { lastVisitedAt: '2026-09-01T01:02:03.000Z', reviewedAt: '2026-09-01T01:02:03.000Z' } },
    }));
    localStorage.setItem('itcc47.practice-records:v2', JSON.stringify({
      schemaVersion: 2,
      records: { 'linked-node-count': { contentVersion, draft: 'completed draft', completed: true } },
    }));
  });
  await page.reload();
  await expect(page.locator('[data-progress-state="reviewed"]')).toHaveCount(1);
  await expect(page.locator('[data-progress-state="completed"]')).toHaveCount(1);
  for (const moduleNumber of [1, 2, 3, 4]) {
    const module = page.locator(`[data-midterm-module="${moduleNumber}"]`);
    await module.locator('[data-midterm-module-toggle]').click();
    await expect(page.locator('.midterm-module-body:not([hidden])')).toHaveCount(1);
    await module.locator('.midterm-more').evaluateAll((items) => items.forEach((item) => { item.open = true; }));
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    expect(important.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) }))).toEqual([]);
  }
});

test('instructor-preview problem and later-domain activity have no serious or critical Axe violations', async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem('itcc47.instructor-access:v1', JSON.stringify({ schemaVersion: 1, profileId: 'itcc47-2026-2027-s1', profileVersion: 6, token }));
    localStorage.setItem('itcc47.release-preview:v1', JSON.stringify({ schemaVersion: 2, profileId: 'itcc47-2026-2027-s1', profileVersion: 6, currentCheckpointId: 'm8-dp' }));
  }, instructorAccessToken);
  for (const entry of ['practice.html?module=5&problem=recursive-sum&preview=1', 'practice.html?module=6&problem=bst-insert-order&preview=1', 'practice.html?module=7&problem=graph-degree&preview=1', 'practice.html?module=8&problem=greedy-coin-count&preview=1', 'visualizer.html?activity=recursive-range-search&preview=1', 'visualizer.html?activity=tree-traversals&preview=1', 'visualizer.html?activity=bfs-shortest-path&preview=1', 'visualizer.html?activity=greedy-dp-coin-change&preview=1']) {
    await page.goto(`/${entry}`);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    const summary = important.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) }));
    expect(summary, important.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  }
});
