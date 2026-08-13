const { test, expect } = require('@playwright/test');
const path = require('path');

const entries = ['index.html', 'visualizer.html', 'writer.html', 'tracer.html', 'problems.html', 'problem-list.html?module=1', 'practice.html?module=1'];

for (const entry of entries) {
  test(`${entry} has no horizontal overflow`, async ({ page }) => {
    await page.goto(`/${entry}`);
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('mobile navigation opens and moves focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/index.html');
  const toggle = page.getByRole('button', { name: /menu/i });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeFocused();
});

test('start page gives students a clear route into practice', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: /Start with a problem/ })).toBeVisible();
  await page.getByRole('link', { name: /Start practicing/ }).click();
  await expect(page).toHaveURL(/problems\.html$/);
  await expect(page.getByRole('heading', { name: 'Choose a module' })).toBeVisible();
});

test('Explore the Tools performs a guided transition and moves focus', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('link', { name: 'Explore the Tools' }).click();
  await expect(page).toHaveURL(/#tools$/);
  await expect(page.locator('#tools')).toHaveClass(/is-arriving/);
  await expect(page.getByRole('heading', { name: 'Open a tool' })).toBeFocused();
});

test('sorting can step, play, pause, and scrub backward', async ({ page }) => {
  await page.goto('/visualizer.html');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.locator('#step-slider').fill('0');
  await expect(page.locator('#step-slider')).toHaveValue('0');
});

test('binary search explains its sorted copy before searching', async ({ page }) => {
  await page.goto('/visualizer.html');
  await page.getByRole('button', { name: 'Binary Search' }).click();
  await expect(page.locator('#result-caption')).toContainText('Binary search requires sorted data');
});

test('custom signed data is rendered and oversized data is rejected inline', async ({ page }) => {
  await page.goto('/visualizer.html');
  const input = page.getByLabel('Custom values (comma-separated)');
  await input.fill('-8, -2, 0, 5');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.chart-zero')).toBeVisible();
  await expect(page.locator('.bar-negative')).toHaveCount(2);
  await input.fill(Array.from({ length: 19 }, (_, i) => i).join(','));
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('#data-error')).toContainText('at most 18 values');
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

test('module catalog opens an intermediate problem list before practice', async ({ page }, testInfo) => {
  await page.goto('/problems.html');
  await expect(page.getByRole('heading', { name: 'Choose a module' })).toBeVisible();
  await expect(page.locator('.module-card')).toHaveCount(8);
  await expect(page.getByText('Not implemented', { exact: true })).toHaveCount(12);
  const heights = await page.locator('.module-card').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));
  expect(new Set(heights.map((height) => Math.round(height))).size).toBe(1);
  await page.getByRole('link', { name: /Choose a problem/ }).first().click();
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
  await page.getByRole('button', { name: 'Indent step' }).click();
  await expect(page.locator('.step-row').nth(1)).toHaveCSS('padding-left', '20px');

  await page.goto('/tracer.html');
  const editor = page.locator('#code-box');
  await editor.fill('IF ready THEN\nWRITE "yes"\nENDIF');
  await editor.evaluate((element) => { element.setSelectionRange(14, 25); });
  await page.getByRole('button', { name: 'Indent', exact: true }).click();
  await expect(editor).toHaveValue('IF ready THEN\n    WRITE "yes"\nENDIF');
});

test('all entry pages open from file URLs and permit an interaction', async ({ page }) => {
  test.skip(process.platform !== 'win32');
  for (const entry of entries) {
    const fileUrl = `file:///${path.resolve(__dirname, '..', entry).replace(/\\/g, '/')}`;
    await page.goto(fileUrl);
    await expect(page.locator('body')).toBeVisible();
  }
  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}`);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'tracer.html').replace(/\\/g, '/')}`);
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: sum of n values/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n + 6');
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
