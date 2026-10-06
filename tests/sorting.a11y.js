const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { api, preview, open, choose, seek, surface, snapshot, capture } = require('./sorting-helpers');
for (const program of ['merge', 'quick']) {
  test('M5C accessibility, keyboard, motion and reflow: ' + program, async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await preview(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page, program);
    await expect(page.locator('[data-activity-workbench]')).toHaveClass(/motion-reduced/);
    for (const mode of ['full', 'helper']) {
      const fixture = mode === 'full' ? 'default' : program === 'merge' ? 'root-pair' : 'root-partition';
      await choose(page, mode, fixture);
      await page.getByRole('button', { name: 'Step', exact: true }).focus(); await page.keyboard.press('Enter');
      await expect(page.locator('.sorting-workspace')).not.toHaveAttribute('data-event-kind', 'INITIAL');
      const data = api.fixture(program, { mode, fixture });
      await seek(page, data, e => e.kind === (program === 'merge' ? 'APPEND_VALUE' : 'SWAP_COMMIT'), false);
      const prior = await snapshot(page);
      for (const view of ['Python source', 'Array view']) {
        await surface(page, view);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
      }
      expect(await snapshot(page)).toEqual(prior);
      await capture(page, testInfo, program + '-' + mode + '-reduced');
      await page.locator('.sorting-details > summary').click(); await page.locator('.sorting-predictions > summary').click();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
      await page.locator('.sorting-details > summary').click(); await page.locator('.sorting-predictions > summary').click();
      const tab = page.getByRole('tab', { name: 'Array view', exact: true });
      if (await tab.isVisible()) {
        await tab.focus(); await page.keyboard.press('End');
        await expect(page.getByRole('tab', { name: 'Python source', exact: true })).toBeFocused();
        await capture(page, testInfo, program + '-' + mode + '-mobile-source');
        await page.keyboard.press('Home'); await expect(tab).toBeFocused();
      }
      const controls = page.getByRole('region', { name: 'Playback controls' });
      const mobile = page.locator('.mobile-playback-details');
      if (await mobile.isVisible() && await mobile.getAttribute('open') === null) await mobile.locator('summary').click();
      const desktopSettings = controls.locator('.playback-settings');
      if (await desktopSettings.isVisible() && await desktopSettings.getAttribute('open') === null) await desktopSettings.locator('summary').click();
      await controls.locator('.motion-control select:visible').selectOption('off');
      await page.getByRole('button', { name: 'Previous', exact: true }).click();
      await page.getByRole('button', { name: 'Step', exact: true }).click();
      expect(await snapshot(page)).toEqual(prior);
      await expect(page.locator('[data-activity-workbench]')).toHaveClass(/motion-off/);
      await capture(page, testInfo, program + '-' + mode + '-motion-off');
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(page.locator('.sorting-workspace')).toHaveAttribute('data-event-kind', 'INITIAL');
      if (await mobile.isVisible() && await mobile.getAttribute('open') === null) await mobile.locator('summary').click();
      await controls.locator('.motion-control select:visible').selectOption('device');
    }
    // 683 CSS px is the layout viewport of a 1366 px desktop at 200% zoom.
    await page.setViewportSize({ width: 683, height: 384 });
    await surface(page, 'Array view');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeVisible();
    await capture(page, testInfo, program + '-200-percent-reflow');
  });
}
