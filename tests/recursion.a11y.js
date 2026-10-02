const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { fixture, preview, open, seek, surface } = require('./recursion-helpers');

for (const [id, program] of [['recursion-call-stack', 'countdown'], ['recursion-return-values', 'sum_to']]) {
  test('M5 accessibility, keyboard and reduced motion: ' + id, async ({ page }) => {
    await preview(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, id);
    await expect(page.locator('[data-activity-workbench]')).toHaveClass(/motion-reduced/);
    const step = page.getByRole('button', { name: 'Step', exact: true });
    await step.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'CALL');
    const data = fixture(program);
    const base = data.events.findIndex(e => e.eventKind === 'BASE_CHECK' && e.frame.annotations.baseCase);
    await seek(page, data, base);
    await surface(page, 'Stack');
    await page.getByRole('button', { name: /Inspect call-1,/ }).focus();
    await page.keyboard.press('Enter');
    const current = await page.locator('.recursion-workspace').getAttribute('data-event-id');
    await surface(page, 'Details');
    await expect(page.locator('.recursion-inspection-status')).toContainText('waiting call');
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', current);
    for (const view of ['Stack', 'Source', 'Details']) {
      await surface(page, view);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    }
    await page.locator('.recursion-readiness > summary').click();
    await page.locator('.recursion-evidence > summary').click();
    const expanded = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(expanded.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)).toEqual([]);
    const tab = page.getByRole('tab', { name: 'Details', exact: true });
    if (await tab.isVisible()) {
      await tab.focus(); await page.keyboard.press('Home');
      await expect(page.getByRole('tab', { name: 'Source', exact: true })).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'Stack', exact: true })).toHaveAttribute('aria-selected', 'true');
    }
    await expect(page.getByRole('region', { name: 'Playback controls' })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  });
}
