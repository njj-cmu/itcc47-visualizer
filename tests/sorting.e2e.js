const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { root, manifest, fixtures, api, ids, preview, open, choose, seek, snapshot, capture, slider, surface } = require('./sorting-helpers');

for (const program of ['merge', 'quick']) {
  test('M5C forward value motion and stale callback cancellation: ' + program, async ({ page }) => {
    await preview(page); await open(page, program);
    const data = api.fixture(program);
    await choose(page, 'full', 'default', true);
    const details = page.locator('.mobile-playback-details');
    const desktop = page.locator('.playback-settings');
    const settings = await details.isVisible() ? details : desktop;
    if (await settings.getAttribute('open') === null) await settings.locator('summary').click();
    await settings.locator('.motion-control select').selectOption('on');
    await settings.locator('.speed-control select').selectOption('3');
    await settings.locator('summary').click();
    const index = data.events.findIndex(e => e.kind === (program === 'merge' ? 'APPEND_VALUE' : 'SWAP_COMMIT'));
    await seek(page, data, e => e.eventId === data.events[index - 1].eventId);
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect.poll(() => page.locator('.sort-value').evaluateAll(nodes => nodes.flatMap(n => n.getAnimations()).filter(a => a.playState === 'running').length)).toBe(program === 'merge' ? 1 : 2);
    if (program === 'merge') {
      await expect(page.locator('body > .sort-motion-ghost')).toBeVisible();
      await expect(page.locator('.sort-motion-ghost')).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('.sorting-canvas-surface .sort-motion-ghost')).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
    await expect.poll(() => page.locator('.sort-value').evaluateAll(nodes => nodes.flatMap(n => n.getAnimations()).length)).toBe(0);
    await expect(page.locator('.sort-motion-ghost')).toHaveCount(0);
    await page.waitForTimeout(1100);
    await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
  });

  test('M5C all presets, exact source downloads and completed results: ' + program, async ({ page, context }) => {
    test.setTimeout(120000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await preview(page); await open(page, program);
    for (const data of Object.values(fixtures).filter(f => f.program === program)) {
      await choose(page, data.mode, data.fixtureId);
      await surface(page, 'Python source');
      const displayed = await page.locator('.sorting-code code').allTextContents();
      expect(displayed.join('\n') + '\n').toBe(data.source);
      const downloadEvent = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download Python', exact: true }).click();
      const download = await downloadEvent;
      expect(fs.readFileSync(await download.path(), 'utf8')).toBe(data.source);
      await page.getByRole('button', { name: 'Copy Python', exact: true }).click();
      // Windows clipboard text uses CRLF; the Python download remains exact LF bytes.
      expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(data.source);
      await surface(page, 'Array view');
      const terminal = await seek(page, data, e => e.kind === 'COMPLETE', false);
      await expect(page.locator('[data-sorting-stdout]')).toHaveText(data.events.at(-1).frame.stdout.trim());
      await expect(page.locator('[data-count="comparisons"]')).toHaveText(String(terminal.metrics.keyComparisons));
      await expect(page.locator('[data-count="writes"]')).toHaveText(String(program === 'merge' ? terminal.metrics.resultAppends : terminal.metrics.exchanges));
      if (program === 'quick') await expect(page.locator('[data-sorting-result]')).toHaveText(data.mode === 'full' ? 'None' : String(terminal.frame.callResult.value));
      const before = await snapshot(page);
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
      await seek(page, data, e => e.kind === 'COMPLETE', false);
      expect(await snapshot(page)).toEqual(before);
    }
    expect(errors).toEqual([]);
  });

  test('M5C historical state, predictions and shared playback: ' + program, async ({ page }, testInfo) => {
    await preview(page); await open(page, program);
    const data = api.fixture(program);
    await choose(page, 'full', 'default', true);
    const target = program === 'merge' ? e => e.kind === 'COMPARE_HEADS' && e.frame.focus.locals.left?.kind === 'REFERENCE' && data.heaps[e.frame.heapVersion][e.frame.focus.locals.left.objectId].length === 4
      : e => e.kind === 'PIVOT_PLACE';
    await seek(page, data, target);
    const prior = await snapshot(page);
    await capture(page, testInfo, program + '-restore-before');
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect.poll(() => snapshot(page)).toEqual(prior);
    await capture(page, testInfo, program + '-restore-after');
    await seek(page, data, e => e.kind === 'COMPLETE');
    await seek(page, data, target);
    expect(await snapshot(page)).toEqual(prior);
    await seek(page, data, e => e.kind === 'COMPLETE');
    const completed = await snapshot(page);
    await page.locator('.sorting-details > summary').click();
    await page.getByRole('button', { name: /Inspect call-/ }).first().click();
    await expect(page.locator('.sorting-details')).toContainText('Inspecting a completed call');
    expect(await snapshot(page)).toEqual(completed);
    await page.getByRole('button', { name: 'Follow active operation' }).click();
    await page.locator('.sorting-details > summary').click();
    await page.locator('.sorting-predictions > summary').click();
    await page.locator('.sorting-predictions input').first().check();
    await page.getByRole('button', { name: 'Reveal explanation' }).first().click();
    expect(await snapshot(page)).toEqual(completed);
    const predictionBefore = await page.locator('.sorting-workspace').getAttribute('data-event-id');
    await page.getByRole('button', { name: 'Go to this checkpoint' }).first().click();
    expect(await page.locator('.sorting-workspace').getAttribute('data-event-id')).not.toBe(predictionBefore);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await choose(page, 'helper', program === 'merge' ? 'left-empty' : 'partial');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
    await expect(page.getByRole('region', { name: 'Playback controls' })).toHaveCount(1);
    await expect(page.locator('.sorting-code')).toHaveCount(1);
    expect(await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(n => n.id); return ids.length === new Set(ids).size; })).toBe(true);
  });
}

test('M5C sorting routes remain locked under the earlier recursion checkpoint', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' }); const page = await context.newPage();
  await page.route('**/release-profile.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/currentCheckpointId:\s*'[^']+'/, "currentCheckpointId: 'm5-recursion'") });
  });
  try { for (const id of Object.values(ids)) for (const previewQuery of ['', '&preview=1']) {
    await page.goto('http://127.0.0.1:' + (process.env.ITCC47_TEST_PORT || 4173) + '/visualizer.html?activity=' + id + previewQuery);
    await expect(page.locator('.curriculum-lock')).toBeVisible();
    await expect(page.locator('.sorting-workspace')).toHaveCount(0);
    expect(await page.evaluate(() => ITCC47_RELEASE_PROFILE.currentCheckpointId)).toBe('m5-recursion');
  } } finally { await context.close(); }
});

test('M5C file delivery uses the same verified classic-script pack', async ({ page }) => {
  for (const program of ['merge', 'quick']) {
    await page.goto(pathToFileURL(path.join(root, 'visualizer.html')).href + '?activity=' + ids[program]);
    await expect(page.locator('.curriculum-lock, .draft-preview-indicator')).toHaveCount(0);
    expect(await page.evaluate(() => ITCC47Curriculum.hasInstructorAccess())).toBe(false);
    await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
    await seek(page, api.fixture(program), e => e.kind === 'COMPLETE', false);
    await expect(page.locator('[data-sorting-stdout]')).toContainText('[0, 1, 2, 3, 5, 7, 8, 10]');
    for (const mode of ['full', 'helper']) {
      const fixture = mode === 'full' ? 'default' : program === 'merge' ? 'root-pair' : 'root-partition';
      await choose(page, mode, fixture);
      await seek(page, api.fixture(program, { mode, fixture }), e => e.kind === 'COMPLETE', false);
      await surface(page, 'Python source');
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download Python', exact: true }).click();
      expect(fs.readFileSync(await (await download).path(), 'utf8')).toBe(api.fixture(program, { mode, fixture }).source);
      await surface(page, 'Array view');
    }
  }
});

test('M5C released sorting opens without preview and preserves saved work offline', async ({ browser, baseURL }, info) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ baseURL, viewport: info.project.use.viewport });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const savedDraft = JSON.stringify({ schemaVersion: 2, records: { 'merge-two-sorted': { contentVersion: 1, draft: 'READ left\nREAD right\nWRITE left', completed: false } }, recovery: {} });
    await page.goto('/problems.html?bank=5');
    await page.evaluate(saved => localStorage.setItem('itcc47.practice-records:v2', saved), savedDraft);
    for (const program of ['merge', 'quick']) {
      for (const suffix of ['', '&preview=1']) {
        await page.goto('/visualizer.html?activity=' + ids[program] + suffix);
        await expect(page).toHaveTitle('ITCC47 Visualizer Workspace');
        await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
        await expect(page.locator('.curriculum-lock, .draft-preview-indicator')).toHaveCount(0);
        await page.getByRole('button', { name: 'Step', exact: true }).click();
        await expect(page.locator('.sorting-workspace')).not.toHaveAttribute('data-event-kind', 'INITIAL');
        await page.getByRole('button', { name: 'Restart', exact: true }).click();
      }
      for (const mode of ['full', 'helper']) {
        const fixture = mode === 'full' ? 'default' : program === 'merge' ? 'root-pair' : 'root-partition';
        await choose(page, mode, fixture);
        await seek(page, api.fixture(program, { mode, fixture }), event => event.kind === 'COMPLETE', false);
        await expect(page.locator('[data-sorting-stdout]')).toContainText(program === 'quick' && mode === 'helper' ? '[3, 1, 0, 2, 5, 10, 7, 8]' : '[0, 1, 2, 3, 5, 7, 8, 10]');
        await capture(page, info, 'released-' + program + '-' + mode);
      }
    }
    expect(await page.evaluate(() => ({ checkpoint: ITCC47_RELEASE_PROFILE.currentCheckpointId, version: ITCC47_RELEASE_PROFILE.profileVersion, preview: ITCC47Curriculum.hasInstructorAccess() })))
      .toEqual({ checkpoint: 'm5-divide-conquer', version: 7, preview: false });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await page.locator('.sorting-details > summary').click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Download for offline use', exact: true }).click();
    await expect(page.locator('.sorting-offline')).toContainText('Saved for offline use');
    await context.setOffline(true);
    for (const program of ['merge', 'quick']) {
      await page.goto('/visualizer.html?activity=' + ids[program]);
      await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
      await seek(page, api.fixture(program), event => event.kind === 'COMPLETE', false);
      await expect(page.locator('[data-sorting-stdout]')).toContainText('[0, 1, 2, 3, 5, 7, 8, 10]');
      await expect(page.locator('.curriculum-lock, .draft-preview-indicator')).toHaveCount(0);
    }
    expect(await page.evaluate(() => localStorage.getItem('itcc47.practice-records:v2'))).toBe(savedDraft);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('M5C missing or incompatible sorting assets give a truthful error', async ({ browser }) => {
  for (const incompatible of [false, true]) {
    const context = await browser.newContext({ serviceWorkers: 'block' }); const page = await context.newPage();
    try {
      await preview(page);
      await page.route('**/sorting-traces.js', route => incompatible
        ? route.fulfill({ contentType: 'text/javascript', body: 'globalThis.ITCC47SortingTraces={schemaVersion:99,fixtures:{},catalog:[]};' }) : route.abort());
      await page.goto('http://127.0.0.1:' + (process.env.ITCC47_TEST_PORT || 4173) + '/visualizer.html?activity=quick-sort&preview=1');
      await expect(page.getByRole('alert').first()).toBeVisible();
      await expect(page.locator('[data-sorting-stdout]')).toHaveCount(0);
    } finally { await context.close(); }
  }
});
