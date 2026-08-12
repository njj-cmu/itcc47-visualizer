const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

for (const entry of ['index.html', 'writer.html', 'tracer.html', 'problems.html']) {
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
