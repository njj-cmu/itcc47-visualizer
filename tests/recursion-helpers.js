const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { expect } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'activity-packs/recursion-traces.js'), 'utf8'), context);
const fixtures = vm.runInContext('ITCC47RecursionTraces.fixtures', context);
const fixture = (program, selection = 3) => fixtures[typeof selection === 'number' ? program + ':n' + selection
  : selection.fixture + (selection.variant && selection.variant !== 'correct' ? ':' + selection.variant : '')];
async function preview(page) {
  const token = fs.readFileSync(path.join(root, '.instructor-preview-token'), 'utf8').trim();
  await page.addInitScript((capability) => {
    localStorage.setItem('itcc47.instructor-access:v1', JSON.stringify({ schemaVersion: 1, profileId: 'itcc47-2026-2027-s1', profileVersion: 6, token: capability }));
    localStorage.setItem('itcc47.release-preview:v1', JSON.stringify({ schemaVersion: 2, profileId: 'itcc47-2026-2027-s1', profileVersion: 6, currentCheckpointId: 'm5-recursion' }));
  }, token);
}
async function open(page, id) {
  await page.goto('/visualizer.html?activity=' + id + '&preview=1');
  await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
}
async function surface(page, name) {
  const tab = page.getByRole('tab', { name, exact: true });
  if (await tab.isVisible()) await tab.click();
}
async function slider(page) {
  const desktop = page.getByLabel('Timeline step', { exact: true });
  if (await desktop.isVisible()) return desktop;
  const settings = page.locator('.mobile-playback-details');
  if (await settings.isVisible() && await settings.getAttribute('open') === null) await settings.locator('summary').click();
  return page.getByLabel('Mobile timeline step', { exact: true });
}
async function seek(page, data, index) {
  await (await slider(page)).fill(String(index));
  await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', data.events[index].eventId);
}
async function screenshot(page, testInfo, label) {
  if (!process.env.M5_EVIDENCE_DIR) return;
  fs.mkdirSync(process.env.M5_EVIDENCE_DIR, { recursive: true });
  const mobile = page.locator('.mobile-playback-details');
  if (await mobile.isVisible() && await mobile.getAttribute('open') !== null) await mobile.locator('summary').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const capture = path.join(process.env.M5_EVIDENCE_DIR, label + '-' + testInfo.project.name);
  await page.screenshot({ path: capture + '.png', fullPage: true });
  fs.writeFileSync(capture + '.json', JSON.stringify({
    url: page.url(), title: await page.title(), viewport: page.viewportSize(),
    browser: page.context().browser().version(), base: '7359dc860f75ae477b1ab15870724d5215d0ba1c',
    eventId: await page.locator('.recursion-workspace').getAttribute('data-event-id'),
    eventKind: await page.locator('.recursion-workspace').getAttribute('data-event-kind'),
    fixtureId: await page.locator('.recursion-workspace').getAttribute('data-fixture-id'),
    sourceRevision: await page.locator('.recursion-workspace').getAttribute('data-source-revision'),
    variant: await page.locator('.recursion-workspace').getAttribute('data-variant'),
    provenance: await page.locator('.recursion-provenance').allTextContents(),
  }, null, 2));
}
module.exports = { root, fixture, preview, open, surface, slider, seek, screenshot };
