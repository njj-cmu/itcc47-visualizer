const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { fixture, preview, open, seek, surface } = require('./recursion-helpers');

for (const [id, program, key] of [['recursion-list-total', 'list_total', 'list-main'], ['recursion-folder-total', 'folder_total', 'folder-course']]) {
  test('M5-B accessible locals, keyboard inspection and motion: ' + id, async ({ page }, info) => {
    test.setTimeout(60000);
    await preview(page);
    if (process.env.M5_REFERENCE_DESKTOP && info.project.name === 'laptop') await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, id);
    await expect(page.locator('[data-activity-workbench]')).toHaveClass(/motion-reduced/);
    const data = fixture(program, { fixture: key });
    const child = data.events.findIndex(e => e.eventKind === 'CALL' && e.frame.stack.length === 2);
    await seek(page, data, child);
    await surface(page, 'Stack');
    const waiting = page.getByRole('button', { name: /Inspect call-1,/ });
    await expect(waiting).toHaveAccessibleName(/Own locals:/);
    await waiting.focus(); await page.keyboard.press('Enter');
    await surface(page, 'Executing');
    await expect(page.locator('.recursion-inspector')).toHaveAttribute('data-context-mode', 'waiting-inspection');
    const before = await page.locator('.recursion-workspace').getAttribute('data-event-id');
    const follow = page.getByRole('button', { name: 'Back to current execution', exact: true });
    await follow.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.recursion-inspector h2')).toBeFocused();
    await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', before);
    for (const view of ['Source', 'Stack', 'Executing']) {
      await surface(page, view);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(result.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    }
    const tab = page.getByRole('tab', { name: 'Executing', exact: true });
    if (await tab.isVisible()) {
      await tab.focus(); await page.keyboard.press('Home');
      await expect(page.getByRole('tab', { name: 'Source', exact: true })).toBeFocused();
      await expect(page.locator('.recursion-code')).toBeVisible();
      await expect(page.locator('.recursion-stack')).not.toBeVisible();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'Stack', exact: true })).toBeFocused();
      await page.keyboard.press('End');
      await expect(page.getByRole('tab', { name: 'Executing', exact: true })).toBeFocused();
    }
    if (program === 'folder_total') {
      await surface(page, 'Stack');
      const node = page.getByRole('button', { name: /Inspect input node Course,/ });
      await node.focus(); await page.keyboard.press('Enter');
      const followNode = page.getByRole('button', { name: 'Follow current input node', exact: true });
      await followNode.focus(); await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: /Inspect input node notes.txt,/ })).toBeFocused();
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-id', before);
    } else {
      await page.getByLabel('Lesson mode', { exact: true }).selectOption('print_instead_of_return');
      const fault = fixture(program, { fixture: key, variant: 'print_instead_of_return' });
      await seek(page, fault, fault.events.length - 1);
      await surface(page, 'Executing');
      await expect(page.getByRole('alert')).toContainText('TypeError');
    }
    for (const selector of ['.recursion-warmup', '.recursion-readiness', '.recursion-evidence']) await page.locator(selector + ' > summary').click();
    await page.getByRole('button', { name: 'Reveal explanation', exact: true }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.recursion-readiness [role="status"]')).toBeVisible();
    const expanded = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(expanded.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)).toEqual([]);
    if (program === 'list_total') await page.getByLabel('Lesson mode', { exact: true }).selectOption('correct');
    for (const motion of ['off', 'reduced']) {
      const settings = page.getByLabel('Playback settings', { exact: true });
      if (await settings.isVisible()) {
        if (await page.locator('.playback-settings').getAttribute('open') === null) await settings.click();
        await page.getByLabel('Motion preference', { exact: true }).selectOption(motion);
        await page.locator('.playback-settings .speed-control select').selectOption('9');
      } else {
        const details = page.locator('.mobile-playback-details');
        if (await details.getAttribute('open') === null) await details.locator('summary').click();
        await page.getByLabel('Mobile motion', { exact: true }).selectOption(motion);
        await page.locator('.mobile-playback-details .speed-control select').selectOption('9');
      }
      await seek(page, data, data.events.length - 4);
      await page.getByRole('button', { name: 'Play', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.recursion-workspace')).toHaveAttribute('data-event-kind', 'COMPLETE');
      expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(data.expected.result + '\n');
      await page.getByRole('button', { name: 'Previous', exact: true }).click();
      await page.getByRole('button', { name: 'Step', exact: true }).click();
      expect(await page.locator('[data-recursion-stdout]').textContent()).toBe(data.expected.result + '\n');
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(page.locator('[data-recursion-stdout]')).toBeEmpty();
    }
  });
}
