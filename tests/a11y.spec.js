const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

for (const entry of ['index.html', 'itcc47.html', 'itcc45.html', 'itcc45-topics.html', 'itcc45-practice.html?topic=classes', 'visualizer.html', 'visualizer.html?course=itcc45&activity=itcc45-classes-blueprint', 'writer.html', 'tracer.html', 'problems.html', 'problem-list.html?module=1', 'practice.html?module=1']) {
  test(`${entry} has no serious or critical Axe violations`, async ({ page }) => {
    await page.goto(`/${entry}`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    const summary = important.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
    expect(summary, important.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  });
}

test('ITCC45 scenario and expanded-model dialogs have no serious or critical Axe violations', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  for (const buttonName of ['Edit scenario', 'Expand model']) {
    await page.getByRole('button', { name: buttonName }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const important = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    expect(important.map((violation) => violation.id), important.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
    await page.getByRole('button', { name: buttonName === 'Edit scenario' ? 'Close scenario dialog' : 'Close full model view' }).click();
  }
});
