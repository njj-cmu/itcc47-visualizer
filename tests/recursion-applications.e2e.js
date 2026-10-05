const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { root, fixture, preview, open, surface, seek, screenshot } = require('./recursion-helpers');
const registry = require('../tools/recursion/lesson_registry.json');
const lessons = [['recursion-list-total', 'list_total'], ['recursion-folder-total', 'folder_total']];
const dataFor = (program, id, variant = 'correct') => fixture(program, { fixture: id, variant });
const display = tag => tag.kind === 'UNBOUND' ? 'UNBOUND · not yet assigned' : tag.kind === 'NONE' ? 'None'
  : tag.kind === 'REFERENCE' ? tag.objectId : tag.kind === 'PENDING' ? 'PENDING · call has not completed' : String(tag.value);
const at = (data, predicate) => {
  const index = data.events.findIndex(predicate);
  expect(index, 'Required semantic state exists').toBeGreaterThanOrEqual(0);
  return index;
};
async function capture(page, info, data, label, predicate, view = 'Stack') {
  await seek(page, data, at(data, predicate));
  await surface(page, view);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await screenshot(page, info, label);
}
async function select(page, program, id, variant = 'correct') {
  if (program === 'list_total') await page.getByLabel('Lesson mode', { exact: true }).selectOption('correct');
  await page.getByLabel('Python fixture', { exact: true }).selectOption(id);
  if (variant !== 'correct') await page.getByLabel('Lesson mode', { exact: true }).selectOption(variant);
  const data = dataFor(program, id, variant);
  await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', data.events[0].eventId);
  return data;
}
function consoleHealth(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  return errors;
}

test.describe('M5-B applications', () => {
  test.beforeEach(async ({ page }, info) => {
    await preview(page);
    if (process.env.M5_REFERENCE_DESKTOP && info.project.name === 'laptop') await page.setViewportSize({ width: 1920, height: 1080 });
  });

  for (const [id, program] of lessons) {
    test('exact runnable source, export and all preset outcomes: ' + id, async ({ page, context }) => {
      test.setTimeout(90000);
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const errors = consoleHealth(page);
      await open(page, id);
      await expect(page).toHaveTitle('ITCC47 Visualizer Workspace');
      await page.evaluate(() => {
        const write = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = text => { window.copiedPythonSource = text; return write(text); };
      });
      const selections = registry[program].fixtures.map(row => [row.id, 'correct']);
      if (program === 'list_total') selections.push(...Object.keys(registry[program].variants).filter(v => v !== 'correct').map(v => ['list-main', v]));
      for (const [key, variant] of selections) {
        const data = await select(page, program, key, variant);
        await expect(page.locator('[data-activity-workbench]')).toHaveCount(1);
        await expect(page.getByRole('region', { name: 'Playback controls' })).toHaveCount(1);
        await surface(page, 'Source');
        expect((await page.locator('.recursion-code code').allTextContents()).join('\n') + '\n').toBe(data.source);
        await page.getByRole('button', { name: 'Copy Python', exact: true }).click();
        await expect(page.getByText('Python copied.', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => window.copiedPythonSource)).toBe(data.source);
        expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(data.source);
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Download Python', exact: true }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe(program + '-' + data.fixtureId.replaceAll(':', '-') + '.py');
        expect(fs.readFileSync(await download.path(), 'utf8')).toBe(data.source);
        await seek(page, data, data.events.length - 1);
        const final = data.events.at(-1).frame;
        expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(final.stdout);
        await expect(page.locator('[data-driver-answer]')).toHaveText(display(final.driver.locals.answer));
        await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-outcome', data.outcome);
        await expect(page.locator('.recursion-evidence')).toContainText('Function invocations: ' + final.metrics.totalInvocations);
        await expect(page.locator('.recursion-evidence')).toContainText('Maximum simultaneously live functions: ' + final.metrics.maxDepth);
        if (variant === 'correct') {
          const returns = [];
          for (let i = 0; i < data.events.length; i++) {
            if (data.events[i].eventKind !== 'RETURN_COMPLETE') continue;
            await seek(page, data, i);
            await expect(page.locator('[data-transfer-stage]')).toContainText(display(data.events[i].frame.returnTransfer.value));
            returns.push(data.events[i].frame.returnTransfer.value.value);
          }
          expect(returns).toEqual(data.expected.returns);
        }
        if (key === 'list-empty') {
          await surface(page, 'Stack');
          await expect(page.locator('[data-list-index]')).toHaveCount(0);
          await expect(page.locator('.recursion-terminal-index')).toBeVisible();
        }
        expect(await page.evaluate(() => localStorage.getItem('itcc47.visualizer-progress:v1'))).toBeNull();
      }
      expect(errors).toEqual([]);
    });

    test('every default semantic step restores own locals, identities and source: ' + id, async ({ page }) => {
      test.setTimeout(90000);
      const errors = consoleHealth(page);
      await open(page, id);
      const data = dataFor(program, registry[program].defaultFixture);
      for (let i = 0; i < data.events.length; i++) {
        await seek(page, data, i);
        const event = data.events[i];
        expect(await page.locator('[data-call-id]').evaluateAll(nodes => nodes.map(n => [n.dataset.callId, n.dataset.callStatus])))
          .toEqual(event.frame.stack.map(cid => [cid, event.frame.framesById[cid].status]));
        const labels = await page.locator('[data-call-id] button').evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')));
        for (const [position, cid] of event.frame.stack.entries()) {
          for (const [name, tag] of Object.entries(event.frame.framesById[cid].locals)) expect(labels[position]).toContain(name + ' = ' + display(tag));
        }
        expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(event.frame.stdout);
        await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-active-call', event.frame.activeCallId || '');
        await expect(page.locator('.source-line.is-current')).toHaveCount(event.source ? 1 : 0);
        if (event.source) expect(await page.locator('.source-line.is-current > span').textContent()).toBe(String(event.source.line));
      }
      await page.getByRole('button', { name: 'Previous', exact: true }).click();
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', data.events.at(-2).eventId);
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
      await expect(page.locator('[data-recursion-stdout]')).toBeEmpty();
      expect(errors).toEqual([]);
    });
  }

  test('list visual states preserve shared input, terminal index and waiting inspection', async ({ page }, info) => {
    const errors = consoleHealth(page);
    await open(page, 'recursion-list-total');
    const data = dataFor('list_total', 'list-main');
    await screenshot(page, info, 'm5b-list-before-call');
    await page.locator('.recursion-warmup > summary').click();
    await expect(page.locator('.recursion-design > li')).toHaveCount(5);
    await expect(page.locator('.recursion-design')).toContainText('The index increases');
    await screenshot(page, info, 'm5b-list-five-decisions');
    await page.locator('.recursion-warmup > summary').click();
    await capture(page, info, data, 'm5b-list-first-child', e => e.eventKind === 'CALL' && e.frame.stack.length === 2);
    await page.getByRole('button', { name: /Inspect call-1,/ }).click();
    const current = await page.locator('.recursion-workspace').getAttribute('data-event-id');
    await expect(page.locator('[data-selected-index]')).toHaveAttribute('data-selected-index', '0');
    await surface(page, 'Executing');
    await expect(page.locator('[data-binding="index"]')).toHaveText('0');
    await expect(page.locator('.recursion-inspection-status')).toContainText('Inspecting waiting call');
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', current);
    await screenshot(page, info, 'm5b-list-waiting-inspection');
    await page.getByRole('button', { name: 'Back to current execution', exact: true }).click();
    await capture(page, info, data, 'm5b-list-terminal-base', e => e.eventKind === 'BASE_CHECK' && e.frame.annotations.baseCase);
    await expect(page.locator('[data-call-id]')).toHaveCount(5);
    await expect(page.locator('[data-selected-index]')).toHaveAttribute('data-selected-index', '4');
    await expect(page.locator('[data-list-index="4"]')).toHaveCount(0);
    await expect(page.locator('.recursion-terminal-index')).toBeVisible();
    await capture(page, info, data, 'm5b-list-return-ready', e => e.eventKind === 'RETURN_READY', 'Executing');
    await capture(page, info, data, 'm5b-list-first-delivery', e => e.eventKind === 'RETURN_TRANSFER', 'Executing');
    await expect(page.locator('[data-binding="child_total"]')).toHaveAttribute('data-value-kind', 'UNBOUND');
    await capture(page, info, data, 'm5b-list-assignment-before-addition', e => e.eventKind === 'ASSIGN_RESULT', 'Executing');
    await expect(page.locator('[data-binding="child_total"]')).toHaveText('0');
    await expect(page.locator('[data-binding="total"]')).toHaveAttribute('data-value-kind', 'UNBOUND');
    await capture(page, info, data, 'm5b-list-later-combination', e => e.eventKind === 'LOCAL_UPDATE' && e.frame.framesById[e.frame.activeCallId]?.locals.total.value === 8, 'Executing');
    await capture(page, info, data, 'm5b-list-final', e => e.eventKind === 'COMPLETE', 'Executing');
    await expect(page.locator('[data-driver-answer]')).toHaveText('14');
    const suffix = await select(page, 'list_total', 'list-suffix');
    await capture(page, info, suffix, 'm5b-list-suffix', e => e.eventKind === 'CALL');
    await expect(page.locator('[data-selected-index]')).toHaveAttribute('data-selected-index', '2');
    await expect(page.locator('[data-list-index].is-suffix')).toHaveCount(2);
    expect(errors).toEqual([]);
  });

  test('repair visual states, prediction resets and saved-work boundaries', async ({ page }, info) => {
    const errors = consoleHealth(page);
    const saved = '{"schemaVersion":2,"draft":"READ n\nWRITE n","privateNote":"preserve M5B"}';
    await page.addInitScript(value => localStorage.setItem('itcc47.practice-records:v2', value), saved);
    await open(page, 'recursion-list-total');
    const identities = new Set();
    for (const variant of ['wrong_base', 'missing_combine', 'print_instead_of_return', 'no_progress']) {
      const data = await select(page, 'list_total', 'list-main', variant);
      identities.add(await page.locator('.recursion-workspace').getAttribute('data-source-revision'));
      await expect(page.getByLabel('Python fixture', { exact: true })).toBeDisabled();
      await expect(page.locator('.recursion-readiness')).not.toHaveAttribute('open', '');
      await page.locator('.recursion-readiness > summary').click();
      await expect(page.locator('.recursion-readiness input:checked')).toHaveCount(0);
      await expect(page.locator('.recursion-readiness [role="status"]')).toHaveCount(0);
      const questions = await page.evaluate(() => ITCC47Recursion.predictions(ITCC47Recursion.fixture('list_total', {
        fixture: 'list-main', variant: document.querySelector('[aria-label="Lesson mode"]').value,
      })));
      await page.getByRole('button', { name: 'Pause at this question’s state', exact: true }).first().click();
      const event = await page.locator('.recursion-workspace').getAttribute('data-event-id');
      expect(event).toBe(questions[0].at);
      await page.locator('.recursion-readiness fieldset').first().getByRole('radio', { name: questions[0].answer, exact: true }).check();
      await page.getByRole('button', { name: 'Check prediction', exact: true }).first().click();
      await expect(page.locator('.recursion-readiness [role="status"]')).toContainText('That matches the trace');
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', event);
      await page.locator('.recursion-readiness > summary').click();
      await surface(page, 'Executing');
      if (variant === 'missing_combine') {
        await expect(page.locator('[data-binding="total"]')).toHaveText('1');
        await expect(page.locator('.recursion-now-line code')).toHaveText('return child_total');
      }
      if (variant === 'no_progress') {
        await expect(page.locator('[data-binding="index"]')).toHaveText('0');
        await expect(page.locator('.recursion-repair')).toContainText('external depth/time limit');
      }
      await screenshot(page, info, 'm5b-repair-' + variant + '-divergence');
      await seek(page, data, data.events.length - 1);
      await expect(page.locator('[data-exercise-outcome]')).toContainText(data.outcome === 'completed' ? 'incorrect result' : 'Execution stopped');
      expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(registry.list_total.variants[variant].stdout);
      if (data.outcome !== 'completed') {
        await expect(page.locator('.recursion-inspector')).toHaveAttribute('data-context-mode', 'stopped');
        await expect(page.locator('[data-driver-answer]')).toHaveAttribute('data-value-kind', 'UNBOUND');
        await expect(page.locator('.recursion-inspection-status')).not.toContainText('Receiving');
        await expect(page.locator('[role="alert"]')).toContainText(variant === 'no_progress' ? 'Teaching' : 'TypeError');
      }
      await screenshot(page, info, 'm5b-repair-' + variant + '-final');
      await surface(page, 'Stack');
      const first = page.locator('[data-call-id] button').first();
      if (await first.count()) await first.click();
    }
    expect(identities.size).toBe(4);
    const corrected = await select(page, 'list_total', 'list-main');
    await expect(page.locator('.recursion-repair')).toHaveCount(0);
    await expect(page.locator('.recursion-inspector')).toHaveAttribute('data-context-mode', 'driver-execution');
    await seek(page, corrected, corrected.events.length - 1);
    await surface(page, 'Executing');
    await expect(page.locator('[data-driver-answer]')).toHaveText('14');
    await screenshot(page, info, 'm5b-repair-corrected');
    expect(await page.evaluate(() => localStorage.getItem('itcc47.practice-records:v2'))).toBe(saved);
    expect(await page.evaluate(() => localStorage.getItem('itcc47.visualizer-progress:v1'))).toBeNull();
    expect(errors).toEqual([]);
  });

  test('folder visual states distinguish hierarchy, sequential path and retained loop bindings', async ({ page }, info) => {
    const errors = consoleHealth(page);
    await open(page, 'recursion-folder-total');
    const data = dataFor('folder_total', 'folder-course');
    await screenshot(page, info, 'm5b-folder-before-call');
    await expect(page.locator('[data-node-id]')).toHaveCount(9);
    await expect(page.locator('[data-call-id]')).toHaveCount(0);
    await capture(page, info, data, 'm5b-folder-root-before-child', e => e.eventKind === 'LOCAL_UPDATE' && e.frame.activeCallId === 'call-1');
    await capture(page, info, data, 'm5b-folder-notes-delivered', e => e.eventKind === 'RETURN_TRANSFER' && e.frame.returnTransfer.childCallId === 'call-2', 'Executing');
    await expect(page.locator('[data-binding="total"]')).toHaveText('0');
    await expect(page.locator('[data-binding="child_total"]')).toHaveAttribute('data-value-kind', 'UNBOUND');
    const second = at(data, e => e.eventKind === 'CALL' && e.frame.activeCallId === 'call-3');
    await seek(page, data, second);
    await surface(page, 'Stack');
    await expect(page.locator('[data-call-id]')).toHaveCount(2);
    await expect(page.locator('[data-node-state="completed call"]')).toHaveCount(1);
    await page.getByRole('button', { name: /Inspect call-1,/ }).click();
    await surface(page, 'Executing');
    await expect(page.locator('[data-binding="child_total"]')).toHaveText('120');
    await expect(page.locator('[data-binding="total"]')).toHaveText('120');
    await expect(page.locator('[data-pending-target]')).toContainText('current binding remains 120');
    await screenshot(page, info, 'm5b-folder-second-child-retains-120');
    await page.getByRole('button', { name: 'Back to current execution', exact: true }).click();
    await capture(page, info, data, 'm5b-folder-second-assignment', e => e.eventKind === 'ASSIGN_RESULT' && e.frame.returnTransfer?.childCallId === 'call-3', 'Executing');
    await expect(page.locator('[data-binding="child_total"]')).toHaveText('80');
    await expect(page.locator('[data-binding="total"]')).toHaveText('120');
    await capture(page, info, data, 'm5b-folder-second-addition', e => e.eventKind === 'LOCAL_UPDATE' && e.frame.activeCallId === 'call-1' && e.frame.framesById['call-1'].locals.total.value === 200, 'Executing');
    await expect(page.locator('[data-binding="total"]')).toHaveText('200');
    for (const [label, cid, count] of [['examples-left', 'call-5', 3], ['examples-right', 'call-6', 3], ['deep-path', 'call-9', 4]]) {
      await capture(page, info, data, 'm5b-folder-' + label, e => e.eventKind === 'CALL' && e.frame.activeCallId === cid);
      await expect(page.locator('[data-call-id]')).toHaveCount(count);
      const before = await page.locator('.recursion-workspace').getAttribute('data-event-id');
      const rootButton = page.getByRole('button', { name: /Inspect input node Course,/ });
      await rootButton.focus(); await page.keyboard.press('Enter');
      await expect(page.locator('[data-input-inspection]')).toContainText('Course');
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', before);
      await page.getByRole('button', { name: 'Follow current input node', exact: true }).click();
    }
    await surface(page, 'Executing');
    for (const name of ['total', 'child', 'child_total']) await expect(page.locator('[data-binding="' + name + '"]')).toHaveAttribute('data-value-kind', 'UNBOUND');
    await screenshot(page, info, 'm5b-folder-file-unbound-locals');
    await capture(page, info, data, 'm5b-folder-final-500', e => e.eventKind === 'COMPLETE');
    await expect(page.locator('[data-driver-answer]')).toHaveText('500');
    for (const key of ['folder-empty', 'folder-zero', 'folder-duplicates']) {
      const sample = await select(page, 'folder_total', key);
      await capture(page, info, sample, 'm5b-' + key, e => e.eventKind === 'RETURN_READY');
      if (key === 'folder-duplicates') {
        const labels = await page.getByRole('button', { name: /Inspect input node notes.txt,/ }).evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')));
        expect(labels.length).toBe(2); expect(new Set(labels).size).toBe(2);
      }
    }
    expect(errors).toEqual([]);
  });

  test('offline install requires consent, coexists with Module 4 and replays every new fixture', async ({ page, context }) => {
    test.setTimeout(90000);
    await open(page, 'recursion-list-total');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const manifests = fs.readdirSync(path.join(root, 'activity-packs')).filter(f => f.endsWith('manifest.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(root, 'activity-packs', f))));
    const manifest = manifests.find(m => m.files.some(f => f.includes('recursion-traces')));
    for (const other of manifests.filter(m => m !== manifest)) await page.evaluate(async m => {
      const cache = await caches.open(m.cacheName);
      await cache.addAll(m.files.map(file => new URL(file, location.href).href));
    }, other);
    const installedBefore = await page.evaluate(async name => (await (await caches.open(name)).keys()).map(r => new URL(r.url).pathname).sort(), manifest.cacheName);
    await page.locator('.recursion-evidence > summary').click();
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Download for offline use', exact: true }).click();
    await expect(page.locator('.recursion-evidence [role="status"]')).toHaveText('Download canceled.');
    // All optional packs deliberately share a cache; cancellation must preserve
    // its entries without installing any recursion assets.
    const installedAfter = await page.evaluate(async name => (await (await caches.open(name)).keys()).map(r => new URL(r.url).pathname).sort(), manifest.cacheName);
    expect(installedAfter).toEqual(installedBefore);
    expect(installedAfter.filter(file => file.includes('/recursion-'))).toEqual([]);
    let accepted = false;
    page.once('dialog', async dialog => { expect(dialog.message()).toContain(manifest.bytes.toLocaleString()); accepted = true; await dialog.accept(); });
    await page.getByRole('button', { name: 'Download for offline use', exact: true }).click();
    await expect(page.locator('.recursion-evidence [role="status"]')).toContainText('Saved for offline use');
    expect(accepted).toBe(true);
    for (const m of manifests) expect(await page.evaluate(name => caches.has(name), m.cacheName)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
    for (const [id, program] of lessons) {
      if (program === 'folder_total') await page.locator('.recursion-next a[href*="recursion-folder-total"]').click();
      for (const row of registry[program].fixtures) {
        const data = await select(page, program, row.id);
        await seek(page, data, data.events.length - 1);
        expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(data.expected.result + '\n');
      }
    }
    await page.goto('/visualizer.html?activity=deque-sliding-window');
    await expect(page.getByTestId('sliding-window-app')).toBeVisible();
    await page.goto('/visualizer.html?activity=deque-service-lane');
    await expect(page.getByTestId('priority-service-lane-app')).toBeVisible();
    await context.setOffline(false);
  });

  test('both new lessons replay through file delivery without a network', async ({ page, context }) => {
    await context.setOffline(true);
    for (const [id, program] of lessons) {
      await page.goto(pathToFileURL(path.join(root, 'visualizer.html')).href + '?activity=' + id + '&preview=1');
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
      const data = dataFor(program, registry[program].defaultFixture);
      await seek(page, data, data.events.length - 1);
      expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(data.expected.result + '\n');
    }
  });

  test('stale application input objects fail visibly before a run', async ({ page }) => {
    const data = dataFor('folder_total', 'folder-course');
    const text = fs.readFileSync(path.join(root, 'activity-packs/recursion-traces.js'), 'utf8');
    const changed = text.replace('"objectsRevision":"' + data.objectsRevision + '"', '"objectsRevision":"' + '0'.repeat(64) + '"');
    expect(changed).not.toBe(text);
    await page.route('**/activity-packs/recursion-traces.js', route => route.fulfill({ contentType: 'text/javascript', body: changed }));
    await page.goto('/visualizer.html?activity=recursion-folder-total&preview=1');
    await expect(page.getByRole('alert')).toContainText('Python input object revision mismatch');
    await expect(page.locator('.recursion-workspace')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('itcc47.visualizer-progress:v1'))).toBeNull();
  });
});
