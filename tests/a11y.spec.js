const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');
const path = require('path');

const instructorAccessToken = fs.readFileSync(path.resolve(__dirname, '..', '.instructor-preview-token'), 'utf8').trim();

for (const entry of ['index.html', 'itcc47.html', 'itcc45.html', 'itcc45-topics.html', 'itcc45-practice.html?topic=classes', 'computer-architecture.html', 'computer-architecture-modules.html', 'computer-architecture-practice.html', 'computer-networking.html', 'computer-networking-modules.html', 'computer-networking-practice.html', 'visualizer.html', 'visualizer.html?activity=insertion-sort', 'visualizer.html?activity=linked-list-traversal', 'visualizer.html?activity=array-linked-comparison', 'visualizer.html?course=itcc45&activity=itcc45-classes-blueprint', 'visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle', 'visualizer.html?course=computer-architecture&activity=architecture-decode-instruction', 'visualizer.html?course=computer-architecture&activity=architecture-add-immediate', 'visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery', 'industry-workbench.html', 'industry-workbench.html?scenario=industry-priority-range-recall', 'writer.html', 'tracer.html', 'problems.html', 'problems.html?view=visualizations', 'problems.html?view=workbenches', 'lesson.html?checkpoint=m2-selection-sort', 'student-materials.html', 'problem-list.html?module=1', 'practice.html?module=1', 'practice.html?module=3&problem=linked-node-count']) {
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

test('ITCC45 scenario and expanded-model dialogs have no serious or critical Axe violations', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  for (const buttonName of ['Edit scenario', 'Expand model']) {
    await page.getByRole('button', { name: buttonName }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    const summary = important.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) }));
    expect(summary, important.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
    await page.getByRole('button', { name: buttonName === 'Edit scenario' ? 'Close scenario dialog' : 'Close full model view' }).click();
  }
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

test('instructor-preview problem and later-domain activity have no serious or critical Axe violations', async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem('itcc47.instructor-access:v1', JSON.stringify({ schemaVersion: 1, profileId: 'itcc47-2026-2027-s1', profileVersion: 5, token }));
    localStorage.setItem('itcc47.release-preview:v1', JSON.stringify({ schemaVersion: 2, profileId: 'itcc47-2026-2027-s1', profileVersion: 5, currentCheckpointId: 'm8-dp' }));
  }, instructorAccessToken);
  for (const entry of ['practice.html?module=3&problem=linked-node-count&preview=1', 'visualizer.html?activity=stack-lifo-basics&preview=1', 'visualizer.html?activity=tree-traversals&preview=1', 'visualizer.html?activity=bfs-shortest-path&preview=1', 'visualizer.html?activity=deque-sliding-window&preview=1', 'industry-workbench.html?scenario=industry-priority-range-recall&preview=1']) {
    await page.goto(`/${entry}`);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    const summary = important.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target.join(' ')) }));
    expect(summary, important.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  }
});
