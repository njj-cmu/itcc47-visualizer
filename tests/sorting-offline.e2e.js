const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { root, manifest, api, preview, open, choose, seek, surface } = require('./sorting-helpers');
const cacheKeys = page => page.evaluate(async () => (await (await caches.open('bsit-learning-lab-optional-packs-v1')).keys()).map(r => new URL(r.url).pathname).sort());
async function installButton(page) {
  const details = page.locator('.sorting-details');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  return page.getByRole('button', { name: 'Download for offline use', exact: true });
}

test('M5C explicit offline install preserves every pack, old revisions and saved work', async ({ page, context }, testInfo) => {
  test.setTimeout(90000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await preview(page); await open(page, 'merge');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const oldPacks = ['recursion-foundations-manifest.json', 'manifest.json', 'priority-service-lane-manifest.json'].map(name => JSON.parse(fs.readFileSync(path.join(root, 'activity-packs', name), 'utf8')));
  const savedDraft = JSON.stringify({ schemaVersion: 2, records: { 'merge-two-sorted': { contentVersion: 1, draft: 'READ left\nREAD right\nWRITE left', completed: false } }, recovery: {} });
  await page.evaluate(async ({ oldPacks, savedDraft }) => {
    localStorage.setItem('itcc47.practice-records:v2', savedDraft);
    const cache = await caches.open('bsit-learning-lab-optional-packs-v1');
    for (const pack of oldPacks) await cache.addAll(pack.files);
    await cache.put('activity-packs/sorting-old-revision/sorting-traces.js', new Response('old revision retained'));
    const unrelated = await caches.open('classroom-notes'); await unrelated.put('my-note', new Response('keep my note'));
  }, { oldPacks, savedDraft });
  const before = await cacheKeys(page);
  expect(before.some(key => manifest.files.some(file => key.endsWith(file)))).toBe(false);
  page.once('dialog', async dialog => { expect(dialog.message()).toContain(manifest.bytes.toLocaleString()); await dialog.dismiss(); });
  await (await installButton(page)).click();
  await expect(page.locator('.sorting-offline')).toContainText('Download canceled');
  expect(await cacheKeys(page)).toEqual(before);
  page.once('dialog', dialog => dialog.accept());
  await (await installButton(page)).click();
  await expect(page.locator('.sorting-offline')).toContainText('Saved for offline use');
  const installed = await cacheKeys(page);
  expect(installed).toEqual([...before, ...manifest.files.map(file => '/' + file)].sort());
  const bytes = await page.evaluate(async files => { const cache = await caches.open('bsit-learning-lab-optional-packs-v1'); let total = 0; for (const file of files) total += (await (await cache.match(file)).arrayBuffer()).byteLength; return total; }, manifest.files);
  expect(bytes).toBe(manifest.bytes);
  await context.setOffline(true);
  for (const program of ['merge', 'quick']) {
    await open(page, program);
    for (const mode of ['full', 'helper']) {
      const fixture = mode === 'full' ? 'default' : program === 'merge' ? 'root-pair' : 'root-partition';
      await choose(page, mode, fixture);
      await seek(page, api.fixture(program, { mode, fixture }), e => e.kind === 'COMPLETE', false);
      await surface(page, 'Python source');
      const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download Python', exact: true }).click();
      expect(fs.readFileSync(await (await download).path(), 'utf8')).toBe(api.fixture(program, { mode, fixture }).source);
      await page.getByRole('button', { name: 'Copy Python', exact: true }).click();
      expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(api.fixture(program, { mode, fixture }).source);
      await surface(page, 'Array view');
    }
  }
  for (const [id, selector] of [['recursion-list-total', '.recursion-workspace'], ['deque-sliding-window', '[data-testid="sliding-window-app"]'], ['deque-service-lane', '[data-testid="priority-service-lane-app"]']]) {
    await page.goto('/visualizer.html?activity=' + id + '&preview=1'); await expect(page.locator(selector)).toBeVisible();
  }
  expect(await page.evaluate(() => localStorage.getItem('itcc47.practice-records:v2'))).toBe(savedDraft);
  await page.goto('/practice.html?module=5&problem=merge-two-sorted&preview=1');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('itcc47.practice-records:v2')).records['merge-two-sorted'])).toEqual(JSON.parse(savedDraft).records['merge-two-sorted']);
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('itcc47.practice-records:v2')).records['merge-two-sorted'])).toEqual(JSON.parse(savedDraft).records['merge-two-sorted']);
  expect(await page.evaluate(async () => (await (await caches.open('classroom-notes')).match('my-note')).text())).toBe('keep my note');
  expect(await page.evaluate(async () => (await (await caches.open('bsit-learning-lab-optional-packs-v1')).match('activity-packs/sorting-old-revision/sorting-traces.js')).text())).toBe('old revision retained');
  await testInfo.attach('offline-pack-inventory', { body: JSON.stringify({ before, installed, sortingBytes: bytes, revision: manifest.revision }, null, 2), contentType: 'application/json' });
});

test('M5C canceled and failed atomic downloads do not replace a prior install', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' }); const page = await context.newPage();
  try {
    await preview(page);
    await page.goto('http://127.0.0.1:' + (process.env.ITCC47_TEST_PORT || 4173) + '/visualizer.html?activity=quick-sort&preview=1');
    await expect(page.locator('.sorting-workspace')).toBeVisible();
    await page.evaluate(async () => { const cache = await caches.open('bsit-learning-lab-optional-packs-v1'); await cache.put('activity-packs/sorting-old-revision/sorting-traces.js', new Response('prior complete pack')); });
    const before = await cacheKeys(page);
    await page.route('**/sorting-workspace.css', route => route.abort());
    page.once('dialog', dialog => dialog.accept()); await (await installButton(page)).click();
    await expect(page.locator('.sorting-offline')).toContainText('Could not save this pack');
    expect(await cacheKeys(page)).toEqual(before);
    await page.unroute('**/sorting-workspace.css');
    let releaseDownload;
    const hold = new Promise(resolve => { releaseDownload = resolve; });
    await page.route('**/sorting-traces.js', async route => { await hold; try { await route.continue(); } catch { /* aborted install */ } });
    page.once('dialog', dialog => dialog.accept()); await (await installButton(page)).click();
    await expect(page.getByRole('button', { name: 'Cancel download', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel download', exact: true }).click();
    releaseDownload();
    await expect(page.locator('.sorting-offline')).toContainText('Download canceled');
    expect(await cacheKeys(page)).toEqual(before);
  } finally { await context.close(); }
});
