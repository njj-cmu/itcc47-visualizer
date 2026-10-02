const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { expect } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'activity-packs/recursion-traces.js'), 'utf8'), context);
const fixtures = vm.runInContext('ITCC47RecursionTraces.fixtures', context);
const fixture = (program, n = 3) => fixtures[program + ':n' + n];
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
  await page.screenshot({ path: path.join(process.env.M5_EVIDENCE_DIR, label + '-' + testInfo.project.name + '.png'), fullPage: true });
}
module.exports = { root, fixture, preview, open, surface, slider, seek, screenshot };
