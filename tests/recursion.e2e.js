const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { root, fixture, preview, open, surface, seek, screenshot } = require('./recursion-helpers');

test.describe('M5-A foundations', () => {
  test.beforeEach(async ({ page }) => preview(page));

  test('source shown, copied, downloaded and all presets agree with verified Python', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
    for (const [id, program] of [['recursion-call-stack', 'countdown'], ['recursion-return-values', 'sum_to']]) {
      await open(page, id);
      await page.evaluate(() => {
        const write = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = (text) => { window.copiedPythonSource = text; return write(text); };
      });
      await expect(page).toHaveTitle('ITCC47 Visualizer Workspace');
      await expect(page.locator('[data-activity-workbench]')).toHaveCount(1);
      await expect(page.getByRole('region', { name: 'Playback controls' })).toHaveCount(1);
      for (const n of [0, 1, 3, 5]) {
        const data = fixture(program, n);
        await page.getByLabel('Python fixture', { exact: true }).selectOption(String(n));
        await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', data.events[0].eventId);
        await surface(page, 'Source');
        const displayed = await page.locator('.recursion-code code').allTextContents();
        expect(displayed.join('\n') + '\n').toBe(data.source);
        await page.getByRole('button', { name: 'Copy Python', exact: true }).click();
        await expect(page.getByText('Python copied.', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => window.copiedPythonSource)).toBe(data.source);
        // Windows normalizes native clipboard text to CRLF; the API receives exact LF source.
        expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(data.source);
        const downloaded = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Download Python', exact: true }).click();
        const download = await downloaded;
        expect(download.suggestedFilename()).toBe(program + '-n' + n + '.py');
        expect(fs.readFileSync(await download.path(), 'utf8')).toBe(data.source);
        await seek(page, data, data.events.length - 1);
        await expect(page.locator('[data-recursion-stdout]')).toHaveText(data.events.at(-1).frame.stdout);
        expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(data.events.at(-1).frame.stdout);
        if (program === 'countdown' && n === 0) {
          await expect(page.locator('.recursion-output')).toContainText('This program completed without printing.');
        }
        await expect(page.locator('.source-line.is-current')).toHaveCount(0);
      }
    }
    expect(errors).toEqual([]);
  });

  test('every default microstep restores call relationships, output and current source', async ({ page }) => {
    for (const [id, program] of [['recursion-call-stack', 'countdown'], ['recursion-return-values', 'sum_to']]) {
      await open(page, id);
      const data = fixture(program);
      for (let i = 0; i < data.events.length; i++) {
        await seek(page, data, i);
        const event = data.events[i];
        expect(await page.locator('[data-call-id]').evaluateAll(nodes => nodes.map(n => [n.dataset.callId, n.dataset.callStatus])))
          .toEqual(event.frame.stack.map(call => [call, event.frame.framesById[call].status]));
        expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(event.frame.stdout);
        await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-active-call', event.frame.activeCallId || '');
        await expect(page.locator('.source-line.is-current')).toHaveCount(event.source ? 1 : 0);
        if (event.source) expect(await page.locator('.source-line.is-current > span').textContent()).toBe(String(event.source.line));
        if (event.frame.stack.length === 0 && event.frame.metrics.totalInvocations > 0) {
          await expect(page.locator('.recursion-empty')).toHaveText('All calls have returned. The function stack is empty.');
        }
      }
      const before = data.events.findIndex(e => e.eventKind === 'RETURN_READY');
      await seek(page, data, before + 1);
      await page.getByRole('button', { name: 'Previous', exact: true }).click();
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', data.events[before].eventId);
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
      await expect(page.locator('[data-recursion-stdout]')).toBeEmpty();
    }
  });

  test('meaningful states and waiting-frame inspection remain truthful', async ({ page }, testInfo) => {
    if (process.env.M5_REFERENCE_DESKTOP && testInfo.project.name === 'laptop') await page.setViewportSize({ width: 1920, height: 1080 });
    await open(page, 'recursion-call-stack');
    const calls = fixture('countdown');
    await screenshot(page, testInfo, '01-before-call');
    const child = calls.events.findIndex(e => e.eventKind === 'CALL' && e.frame.stack.length === 2);
    await seek(page, calls, child);
    await screenshot(page, testInfo, '02-first-child');
    await page.getByRole('button', { name: /Inspect call-1,/ }).click();
    await surface(page, 'Executing');
    await expect(page.locator('.recursion-inspection-status')).toContainText('Inspecting waiting call');
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-active-call', 'call-2');
    await expect(page.locator('[data-binding="n"]')).toHaveText('3');
    await screenshot(page, testInfo, '07-inspected-waiting');

    await open(page, 'recursion-return-values');
    const sum = fixture('sum_to');
    const base = sum.events.findIndex(e => e.eventKind === 'BASE_CHECK' && e.frame.annotations.baseCase);
    const ready = sum.events.findIndex(e => e.eventKind === 'RETURN_READY');
    const assigned = sum.events.findIndex(e => e.eventKind === 'ASSIGN_RESULT');
    await seek(page, sum, base);
    await expect(page.locator('[data-call-id]')).toHaveCount(4);
    await expect(page.locator('[data-driver-answer]')).toHaveAttribute('data-value-kind', 'UNBOUND');
    await screenshot(page, testInfo, '03-maximum-base');
    await seek(page, sum, ready);
    await expect(page.locator('[data-call-id="call-4"]')).toHaveAttribute('data-call-status', 'RETURNING');
    await screenshot(page, testInfo, '04-return-ready');
    await seek(page, sum, assigned);
    await surface(page, 'Executing');
    await expect(page.locator('[data-binding="child_total"]')).toHaveText('0');
    await expect(page.locator('[data-binding="total"]')).toHaveAttribute('data-value-kind', 'UNBOUND');
    await screenshot(page, testInfo, '05-parent-assigned');
    await seek(page, sum, sum.events.length - 1);
    await expect(page.locator('[data-driver-answer]')).toHaveText('6');
    expect(await page.locator('[data-recursion-stdout]').textContent()).toBe('6\n');
    await screenshot(page, testInfo, '06-driver-complete');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });

  test('play, pause, step and motion modes reach the same states without repeated output', async ({ page }) => {
    test.setTimeout(60000);
    await open(page, 'recursion-call-stack');
    await page.getByLabel('Python fixture', { exact: true }).selectOption('1');
    const data = fixture('countdown', 1);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const paused = await page.locator('.recursion-workspace').getAttribute('data-event-id');
    await page.waitForTimeout(350);
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', paused);
    for (const motion of ['off', 'reduced', 'on']) {
      const desktop = page.getByLabel('Playback settings', { exact: true });
      if (await desktop.isVisible()) {
        if (await page.locator('.playback-settings').getAttribute('open') === null) await desktop.click();
        await page.getByLabel('Motion preference', { exact: true }).selectOption(motion);
        await page.locator('.playback-settings .speed-control select').selectOption('9');
      } else {
        const details = page.locator('.mobile-playback-details');
        if (await details.getAttribute('open') === null) await details.locator('summary').click();
        await page.getByLabel('Mobile motion', { exact: true }).selectOption(motion);
        await page.locator('.mobile-playback-details .speed-control select').selectOption('9');
      }
      await seek(page, data, 0);
      await page.getByRole('button', { name: 'Step', exact: true }).click();
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', data.events[1].eventId);
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'COMPLETE', { timeout: 15000 });
      expect(await page.locator('[data-recursion-stdout]').textContent()).toBe('enter 1\nleave 1\n');
    }
  });

  test('prediction answers stay outside execution and saved pseudocode work survives', async ({ page }) => {
    const saved = '{"schemaVersion":2,"draft":"READ n\nWRITE n","privateNote":"keep"}';
    await page.addInitScript(value => localStorage.setItem('itcc47.practice-records:v2', value), saved);
    await open(page, 'recursion-return-values');
    await page.locator('.recursion-readiness > summary').click();
    await page.getByRole('button', { name: 'Pause at this question’s state', exact: true }).first().click();
    const event = await page.locator('.recursion-workspace').getAttribute('data-event-id');
    await page.getByRole('radio', { name: 'call-3', exact: true }).check();
    await page.getByRole('button', { name: 'Check prediction', exact: true }).first().click();
    await expect(page.locator('.recursion-readiness [role="status"]')).toContainText('That matches the trace');
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', event);
    expect(await page.evaluate(() => localStorage.getItem('itcc47.practice-records:v2'))).toBe(saved);
    expect(await page.evaluate(() => localStorage.getItem('itcc47.visualizer-progress:v1'))).toBeNull();
    await expect(page.locator('.activity-actions')).not.toContainText('Edit pseudocode');
  });

  test('optional pack installs by explicit size confirmation and both lessons work offline', async ({ page, context }) => {
    await open(page, 'recursion-return-values');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.locator('.recursion-evidence > summary').click();
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'activity-packs/recursion-foundations-manifest.json')));
    let confirmed = false;
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain(manifest.bytes.toLocaleString());
      confirmed = true; await dialog.accept();
    });
    await page.getByRole('button', { name: 'Download for offline use', exact: true }).click();
    await expect(page.locator('.recursion-evidence [role="status"]')).toContainText('Saved for offline use');
    expect(confirmed).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
    await page.getByLabel('Python fixture', { exact: true }).selectOption('5');
    await seek(page, fixture('sum_to', 5), fixture('sum_to', 5).events.length - 1);
    expect(await page.locator('[data-recursion-stdout]').textContent()).toBe('15\n');
    await page.locator('.recursion-next a[href*="recursion-call-stack"]').click();
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', fixture('countdown').events[0].eventId);
    await surface(page, 'Source');
    await expect(page.locator('.recursion-code')).toContainText('countdown(3)');
    await seek(page, fixture('countdown'), fixture('countdown').events.length - 1);
    expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(fixture('countdown').events.at(-1).frame.stdout);
    await context.setOffline(false);
  });

  test('local file delivery works without a server or network', async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto(pathToFileURL(path.join(root, 'visualizer.html')).href + '?activity=recursion-return-values&preview=1');
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
    await page.getByLabel('Python fixture', { exact: true }).selectOption('0');
    const data = fixture('sum_to', 0);
    await seek(page, data, data.events.length - 1);
    expect(await page.locator('[data-recursion-stdout]').textContent()).toBe('0\n');
  });

  test('mismatched source fails visibly and cannot mark progress', async ({ page }) => {
    const text = fs.readFileSync(path.join(root, 'activity-packs/recursion-traces.js'), 'utf8');
    const changed = text.replace('"sourceRevision":"' + fixture('sum_to').sourceRevision + '"', '"sourceRevision":"' + '0'.repeat(64) + '"');
    await page.route('**/activity-packs/recursion-traces.js', route => route.fulfill({ contentType: 'text/javascript', body: changed }));
    await page.goto('/visualizer.html?activity=recursion-return-values&preview=1');
    await expect(page.getByRole('alert')).toContainText('Python source and trace do not match');
    await expect(page.locator('.recursion-workspace')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('itcc47.visualizer-progress:v1'))).toBeNull();
  });
});

test('M5 routes still lock before pack loading under an earlier release profile', async ({ browser, baseURL }) => {
  const publicContext = await browser.newContext({ baseURL, serviceWorkers: 'block' });
  try {
    const page = await publicContext.newPage();
    await page.route('**/release-profile.js', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(/currentCheckpointId:\s*'[^']+'/, "currentCheckpointId: 'm4-queue-deque'") });
    });
    const packs = [];
    page.on('request', request => { if (request.url().includes('/activity-packs/recursion')) packs.push(request.url()); });
    for (const id of ['recursion-call-stack', 'recursion-return-values', 'recursion-list-total', 'recursion-folder-total']) {
      for (const suffix of ['', '&preview=1']) {
        await page.goto('/visualizer.html?activity=' + id + suffix);
        await expect(page.locator('.visualizer-locked')).toBeVisible();
        await expect(page.locator('[data-activity-workbench]')).toHaveCount(0);
      }
    }
    expect(packs).toEqual([]);
    expect(await page.evaluate(() => ITCC47_RELEASE_PROFILE.currentCheckpointId)).toBe('m4-queue-deque');
  } finally { await publicContext.close(); }
});

async function captureRelease(page, name, info) {
  if (!process.env.M5_RELEASE_EVIDENCE_DIR) return;
  fs.mkdirSync(process.env.M5_RELEASE_EVIDENCE_DIR, { recursive: true });
  const capture = path.join(process.env.M5_RELEASE_EVIDENCE_DIR, name + '-' + info.project.name);
  await page.screenshot({ path: capture + '.png', fullPage: true });
  fs.writeFileSync(capture + '.json', JSON.stringify({
    url: page.url(), title: await page.title(), browser: page.context().browser().version(),
    viewport: page.viewportSize(), release: await page.evaluate(() => ITCC47_RELEASE_PROFILE.currentCheckpointId),
    instructorAccess: await page.evaluate(() => ITCC47Curriculum.hasInstructorAccess()),
    eventId: await page.locator('.recursion-workspace').count() ? await page.locator('.recursion-workspace').getAttribute('data-event-id') : null,
  }, null, 2));
}

test('M5 released Python lessons open without preview and replay offline', async ({ browser, baseURL }, info) => {
  test.setTimeout(90000);
  const context = await browser.newContext({ baseURL, viewport: info.project.use.viewport });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const id of ['recursion-call-stack', 'recursion-return-values', 'recursion-list-total', 'recursion-folder-total']) {
      for (const suffix of ['', '&preview=1']) {
        await page.goto('/visualizer.html?activity=' + id + suffix);
        await expect(page).toHaveTitle('ITCC47 Visualizer Workspace');
        await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
        await expect(page.locator('.curriculum-lock, .draft-preview-indicator')).toHaveCount(0);
        await page.getByRole('button', { name: 'Step', exact: true }).click();
        await expect(page.locator('.recursion-workspace')).not.toHaveAttribute('data-event-kind', 'INITIAL');
      }
    }
    expect(await page.evaluate(() => ITCC47Curriculum.hasInstructorAccess())).toBe(false);
    await captureRelease(page, 'm5-release-folder', info);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await page.locator('.recursion-evidence > summary').click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Download for offline use', exact: true }).click();
    await expect(page.locator('.recursion-evidence [role="status"]')).toContainText('Saved for offline use');
    await context.setOffline(true);
    for (const [id, program, key, output] of [
      ['recursion-folder-total', 'folder_total', 'folder-course', '500\n'],
      ['recursion-list-total', 'list_total', 'list-main', '14\n'],
    ]) {
      await page.goto('/visualizer.html?activity=' + id);
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
      const data = fixture(program, { fixture: key });
      await seek(page, data, data.events.length - 1);
      await expect(page.locator('[data-recursion-stdout]')).toHaveText(output);
      await expect(page.locator('.curriculum-lock, .draft-preview-indicator')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('M5 released search and practice open while saved drafts and later locks survive', async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ baseURL, viewport: info.project.use.viewport });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/problems.html?bank=5');
    await expect(page.locator('[data-bank-module="5"] .module-problem-card')).toHaveCount(4);
    await expect(page.locator('.draft-preview-indicator')).toHaveCount(0);
    await captureRelease(page, 'm5-release-practice-bank', info);
    await page.evaluate(() => localStorage.setItem('itcc47.practice-records:v2', JSON.stringify({
      schemaVersion: 2, records: { 'recursive-sum': { contentVersion: 1, draft: 'READ n\nWRITE n', completed: false } }, recovery: {},
    })));
    await page.goto('/practice.html?module=5&problem=recursive-sum');
    if (info.project.name === 'phone') await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await expect(page.locator('#code-box')).toHaveValue('READ n\nWRITE n');
    for (const id of ['recursive-sum', 'recursive-binary-range', 'merge-two-sorted', 'merge-sort-count']) {
      await page.goto('/practice.html?module=5&problem=' + id);
      await expect(page.locator('.curriculum-lock, .draft-preview-indicator')).toHaveCount(0);
      if (info.project.name === 'phone') await page.getByRole('tab', { name: 'Code', exact: true }).click();
      await page.locator('#code-box').fill(await page.evaluate(key => PROBLEMS.find(problem => problem.id === key).starter, id));
      await page.locator('#btn-check').click();
      await expect(page.locator('.results-score')).toContainText('2/2');
    }
    await page.goto('/visualizer.html?activity=recursive-range-search');
    await expect(page.locator('.concept-domain')).toBeVisible();
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.locator('.curriculum-lock, .draft-preview-indicator')).toHaveCount(0);
    for (const route of ['visualizer.html?activity=tree-traversals', 'practice.html?module=6&problem=bst-insert-order', 'practice.html?module=7&problem=graph-degree', 'practice.html?module=8&problem=greedy-coin-count']) {
      await page.goto('/' + route + '&preview=1');
      await expect(page.locator('.curriculum-lock')).toBeVisible();
      await expect(page.locator('#code-box, .source-panel')).toHaveCount(0);
    }
    expect(await page.evaluate(() => ITCC47Curriculum.hasInstructorAccess())).toBe(false);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
