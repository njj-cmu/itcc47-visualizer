const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { expect } = require('@playwright/test');
const { preview: recursionPreview, slider, surface } = require('./recursion-helpers');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'activity-packs/sorting-manifest.json'), 'utf8'));
const context = vm.createContext({ console, TextEncoder });
for (const file of ['sha256.js', 'playback.js', manifest.files[0], 'visualizer-src/sorting-contract.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const api = context.ITCC47Sorting;
const fixtures = vm.runInContext('ITCC47SortingTraces.fixtures', context);
const ids = { merge: 'stable-merge-sort', quick: 'quick-sort' };
async function preview(page) {
  await recursionPreview(page);
  await page.addInitScript(() => localStorage.setItem('itcc47.release-preview:v1', JSON.stringify({ schemaVersion: 2, profileId: 'itcc47-2026-2027-s1', profileVersion: 7, currentCheckpointId: 'm5-divide-conquer' })));
}
async function open(page, program) {
  await page.goto('/visualizer.html?activity=' + ids[program] + '&preview=1');
  await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
}
async function choose(page, mode, fixture, detailed = false) {
  await page.getByLabel('Sorting mode', { exact: true }).selectOption(mode);
  await page.getByLabel('Sorting fixture', { exact: true }).selectOption(fixture);
  await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
  const details = page.locator('.sorting-details');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await page.getByLabel('Include call and assignment steps').setChecked(detailed);
  await details.locator('summary').click();
}
async function seek(page, data, predicate, detailed = true) {
  const result = api.adapt(data, detailed);
  const index = result.events.findIndex(e => predicate(data.events[e.frame.rawIndex]));
  expect(index, 'Semantic event must be present in selected playback granularity').toBeGreaterThanOrEqual(0);
  await (await slider(page)).fill(String(index));
  await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-id', result.events[index].id);
  return result.events[index];
}
async function snapshot(page) {
  return page.locator('.sorting-workspace').evaluate(node => ({
    event: node.dataset.eventId, source: node.querySelector('.source-line.is-current')?.textContent,
    board: node.querySelector('.sorting-canvas-surface').innerText,
    cells: [...node.querySelectorAll('.sort-slot')].map(n => [n.dataset.itemId, n.dataset.index, n.textContent, n.className]),
  }));
}
async function capture(page, testInfo, label) {
  if (!process.env.M5C_EVIDENCE_DIR) return;
  fs.mkdirSync(process.env.M5C_EVIDENCE_DIR, { recursive: true });
  const mobile = page.locator('.mobile-playback-details');
  if (await mobile.isVisible() && await mobile.getAttribute('open') !== null) await mobile.locator('summary').click();
  await page.evaluate(() => scrollTo(0, 0));
  const output = path.join(process.env.M5C_EVIDENCE_DIR, label + '-' + page.viewportSize().width);
  await page.screenshot({ path: output + '.png', fullPage: true, animations: 'disabled' });
  const state = await page.locator('.sorting-workspace').evaluate(node => ({ ...node.dataset }));
  const fixture = fixtures[state.traceIdentity];
  fs.writeFileSync(output + '.json', JSON.stringify({ route: page.url(), viewport: page.viewportSize(),
    browser: page.context().browser().version(), project: testInfo.project.name, packRevision: manifest.revision,
    release: await page.evaluate(() => ({ checkpoint: ITCC47_RELEASE_PROFILE.currentCheckpointId, version: ITCC47_RELEASE_PROFILE.profileVersion, instructorAccess: ITCC47Curriculum.hasInstructorAccess() })),
    base: 'acf5836ffa0adf15dd3b2ae829e9da54a8b8b9e8',
    state, traceRevision: fixture.traceRevision, metrics: fixture.events[Number(state.rawIndex)].metrics,
    motion: await page.locator('[data-activity-workbench]').getAttribute('class'),
    snapshot: await snapshot(page),
  }, null, 2));
}
module.exports = { root, manifest, fixtures, api, ids, preview, open, choose, seek, snapshot, capture, slider, surface };
