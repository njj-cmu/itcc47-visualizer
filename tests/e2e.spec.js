const { test, expect } = require('@playwright/test');
const path = require('path');

const entries = ['index.html', 'itcc47.html', 'itcc45.html', 'itcc45-topics.html', 'itcc45-practice.html?topic=classes', 'visualizer.html', 'visualizer.html?course=itcc45&activity=itcc45-classes-blueprint', 'writer.html', 'tracer.html', 'problems.html', 'problem-list.html?module=1', 'practice.html?module=1'];

for (const entry of entries) {
  test(`${entry} has no horizontal overflow`, async ({ page }) => {
    await page.goto(`/${entry}`);
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('mobile navigation opens and moves focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/itcc47.html');
  const toggle = page.getByRole('button', { name: /menu/i });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeFocused();
});

test('start page gives students a clear route into practice', async ({ page }) => {
  await page.goto('/itcc47.html');
  await expect(page.getByRole('heading', { name: /Start with a problem/ })).toBeVisible();
  await page.getByRole('link', { name: /Start practicing/ }).click();
  await expect(page).toHaveURL(/problems\.html$/);
  await expect(page.getByRole('heading', { name: 'Explore the course' })).toBeVisible();
});

test('Explore the Tools performs a guided transition and moves focus', async ({ page }) => {
  await page.goto('/itcc47.html');
  await page.getByRole('link', { name: 'Explore the Tools' }).click();
  await expect(page).toHaveURL(/#tools$/);
  await expect(page.locator('#tools')).toHaveClass(/is-arriving/);
  await expect(page.getByRole('heading', { name: 'Open a tool' })).toBeFocused();
});

test('subject chooser routes to both course homes', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'Choose a subject and start exploring.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open ITCC45/ })).toHaveAttribute('href', 'itcc45.html');
  await expect(page.getByRole('link', { name: /Open ITCC47/ })).toHaveAttribute('href', 'itcc47.html');
  await page.getByRole('link', { name: /Open ITCC45/ }).click();
  await expect(page).toHaveURL(/itcc45\.html$/);
  await expect(page.getByRole('heading', { name: /See what Python objects are doing/ })).toBeVisible();
});

test('ITCC45 exposes six ordered topics with lab and practice routes', async ({ page }) => {
  await page.goto('/itcc45-topics.html');
  await expect(page.getByRole('heading', { name: 'Build object-oriented thinking step by step.' })).toBeVisible();
  await expect(page.locator('.oop-topic-path > li')).toHaveCount(6);
  await expect(page.locator('.oop-topic-path h2')).toHaveText(['Classes', 'Objects', 'Encapsulation', 'Inheritance', 'Class Abstraction', 'Polymorphism']);
  await page.getByRole('link', { name: 'Open lab' }).first().click();
  await expect(page).toHaveURL(/visualizer\.html\?course=itcc45&activity=itcc45-classes-blueprint$/);
});

test('Python Object Lab synchronizes source, object state, lookup, output, and editable inputs', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await expect(page.getByRole('heading', { name: /Classes: turn a blueprint/ })).toBeVisible();
  await expect(page.getByLabel('Python source')).toContainText('class Student');
  await page.getByLabel('Student name').fill('Lia');
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Visualize' }).click();
  await expect(page.locator('.object-instance-card')).toContainText('Lia');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Call path' }).click();
  await expect(page.locator('.evidence-drawer:visible')).toContainText('Student.describe');
  await page.getByRole('tab', { name: 'Output' }).click();
  await expect(page.locator('.evidence-drawer:visible pre')).toContainText('Lia studies BSIT');
  if (testInfo.project.name !== 'phone') {
    await page.getByRole('button', { name: 'Copy Python' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  }
});

test('ITCC45 practice gives rationale and persists only solved progress', async ({ page }) => {
  await page.goto('/itcc45-practice.html?topic=classes');
  await page.evaluate(() => localStorage.removeItem('itcc45.practice:v1'));
  await page.reload();
  await page.getByLabel('CMU').check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toContainText('That reasoning holds.');
  await expect(page.locator('#practice-progress-count')).toHaveText('1 / 18 complete');
  await page.reload();
  await expect(page.locator('#practice-progress-count')).toHaveText('1 / 18 complete');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc45.practice:v1')));
  expect(Object.keys(stored).sort()).toEqual(['contentVersion', 'solvedIds']);
});

test('mismatched ITCC45 activity falls back and normalizes the URL', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=bubble-sort');
  await expect(page.getByRole('heading', { name: /Classes: turn a blueprint/ })).toBeVisible();
  await expect(page).toHaveURL(/course=itcc45&activity=itcc45-classes-blueprint/);
});

test('sorting can step, play, pause, and scrub backward', async ({ page }) => {
  await page.goto('/visualizer.html');
  await page.getByLabel('Motion preference').selectOption('off');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.locator('#step-slider').fill('0');
  await expect(page.locator('#step-slider')).toHaveValue('0');
});

test('binary search explains its sorted copy before searching', async ({ page }) => {
  await page.goto('/visualizer.html?activity=binary-search');
  await expect(page.locator('#result-caption')).toContainText('Binary search requires sorted data');
});

test('custom signed data is rendered and oversized data is rejected inline', async ({ page }) => {
  await page.goto('/visualizer.html');
  const input = page.getByLabel('Custom values (comma-separated)');
  await input.fill('-8, -2, 0, 5');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.array-cell')).toHaveCount(4);
  await expect(page.locator('.array-cell').nth(0)).toContainText('-8');
  await expect(page.locator('.array-cell').nth(2)).toContainText('0');
  await input.fill(Array.from({ length: 19 }, (_, i) => i).join(','));
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('#data-error')).toContainText('at most 18 values');
});

test('array-list activity synchronizes source, structure, trace, and metrics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=array-list-insert');
  await page.getByLabel('Motion preference').selectOption('off');
  await expect(page.getByRole('heading', { name: 'Insert at an index' })).toBeVisible();
  await expect(page.locator('.source-line code').nth(0)).toContainText('index <- 2');
  await expect(page.locator('.source-line code').nth(1)).toContainText('value <- 24');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');
  await expect(page.locator('.source-line.is-current')).toContainText('values[i + 1] <- values[i]');
  await expect(page.locator('.array-cell.bar-move')).toHaveCount(1);
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Operations' }).click();
  const visibleEvidence = page.locator('.evidence-drawer:visible');
  await expect(visibleEvidence.locator('.metric-summary')).toContainText('Moves');
  await expect(visibleEvidence.locator('.metric-summary')).toContainText('1');
  await visibleEvidence.getByRole('button', { name: 'Primitive model' }).click();
  await expect(visibleEvidence.getByText('These algorithm metrics are never added to it.')).toBeVisible();
});

test('insertion shifts stage one held entity and one explicit hole without visual overwrite', async ({ page }) => {
  await page.goto('/visualizer.html?activity=insertion-sort');
  const slider = page.locator('#step-slider');
  await slider.fill('3');
  await expect(page.locator('.array-held-value')).toContainText('held17');
  await expect(page.locator('[data-entity-id="item:0"]')).toContainText('42');
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
  const geometry = await page.evaluate(() => {
    const indices = [...document.querySelectorAll('.array-index')].map((node) => node.getBoundingClientRect().bottom);
    const connector = document.querySelector('.array-connector').getBoundingClientRect();
    return { lowestIndex: Math.max(...indices), connectorTop: connector.top };
  });
  expect(geometry.connectorTop).toBeGreaterThan(geometry.lowestIndex + 8);
  for (let step = 0; step < 5; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-held-value')).toContainText('held8');
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
});

test('Motion swaps stable entities and gates rapid structural steps', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort');
  await page.getByLabel('Motion preference').selectOption('on');
  const slider = page.locator('#step-slider');
  await slider.fill('1');
  const before = await page.locator('[data-entity-id="item:0"]').boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeDisabled();
  await expect(slider).toHaveValue('2');
  const during = await page.locator('[data-entity-id="item:0"]').boundingBox();
  expect(during.x).toBeGreaterThan(before.x);
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeEnabled({ timeout: 1200 });
  await expect(slider).toHaveValue('2');
});

test('Motion duration follows speed while direct seeking stays immediate', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort');
  await page.getByLabel('Motion preference').selectOption('on');
  await page.getByLabel('Speed').selectOption('3');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.8');
  await page.getByLabel('Speed').selectOption('6');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.52');
  await page.getByLabel('Speed').selectOption('9');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.3');
  await page.locator('#step-slider').fill('2');
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeEnabled();
});

test('motion preferences persist, reduce, turn off, and reset to the device', async ({ page }) => {
  await page.goto('/visualizer.html');
  const control = page.getByLabel('Motion preference');
  await control.selectOption('reduced');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await page.reload();
  await expect(control).toHaveValue('reduced');
  await control.selectOption('off');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-off/);
  await control.selectOption('device');
  await expect(control).toHaveValue('device');
});

test('OS reduced motion becomes the default when no override is saved', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/visualizer.html');
  await expect(page.getByLabel('Motion preference')).toHaveValue('device');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await context.close();
});

test('linked-list head insertion synchronizes references, links, source, and metrics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=linked-list-insert-head');
  await expect(page.getByRole('heading', { name: 'Insert at the head' })).toBeVisible();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('.linked-node')).toHaveCount(3);
  await expect(page.locator('.linked-node').first()).toContainText('24');
  await expect(page.locator('.pointer-labels').first()).toContainText('head');
  await expect(page.locator('.linked-arrow')).toHaveCount(2);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Operations' }).click();
  await expect(page.locator('.evidence-drawer:visible .metric-summary')).toContainText('Pointer writes');
  await expect(page.locator('.evidence-drawer:visible .metric-summary')).toContainText('2');
});

test('curated linked-list pseudocode opens in the lab and retains trace, output, and diagnostics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=linked-list-traversal');
  await page.getByRole('link', { name: /Edit pseudocode/ }).click();
  await expect(page).toHaveURL(/tracer\.html\?activity=linked-list-traversal/);
  await expect(page.getByLabel('Pseudocode editor')).toHaveValue(/head <- NEW NODE\(18\)/);
  await expect(page.locator('#status-line')).toContainText('loaded from the Visualizer');
  await page.getByRole('button', { name: /run/i }).click();
  await expect(page.locator('#status-line')).toContainText('step(s) recorded');
  await expect(page.locator('#trace-body tr')).not.toHaveCount(0);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('#output-box')).toContainText('31');
});

test('pseudocode lab shows node references in scoped runtime state', async ({ page }, testInfo) => {
  await page.goto('/tracer.html');
  await page.getByLabel('Pseudocode editor').fill(`FUNCTION Echo(node)
 RETURN node
ENDFUNCTION
head <- NEW NODE(4)
CALL Echo(head) INTO alias
WRITE alias = head`);
  await page.getByRole('button', { name: /run/i }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('#vars-box')).toContainText('&node:1');
  await expect(page.locator('#output-box')).toContainText('true');
});

test('mobile visualizer tabs replace the central surface without resetting playback', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/visualizer.html');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');
  await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('.desktop-source')).toBeVisible();
  await expect(page.locator('.visual-canvas')).toBeHidden();
  await page.getByRole('tab', { name: 'Trace' }).click();
  await expect(page.locator('.mobile-evidence')).toBeVisible();
  await expect(page.locator('#step-slider')).toHaveValue('1');
});

test('tracer runs and its result tabs work from the keyboard', async ({ page }) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: /run/i }).click();
  await expect(page.locator('#status-line')).toContainText('step(s) recorded');
  const traceTab = page.getByRole('tab', { name: /trace/i });
  await traceTab.focus();
  await traceTab.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /operations/i })).toHaveAttribute('aria-selected', 'true');
});

test('tracer explains exact symbolic FOR-loop counts and explicit control costs', async ({ page }) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: sum of n values/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();

  await expect(page.locator('#ops-total-value')).toHaveText('30');
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n + 6');
  await expect(page.locator('#ops-growth')).toHaveText('O(n)');
  await expect(page.locator('.loop-explanation').first()).toContainText('= n iterations');

  const bodyRow = page.locator('.ops-row').filter({ hasText: 'total <- total + i' });
  await bodyRow.click();
  await expect(page.locator('.code-line.count-line')).toHaveAttribute('data-line', '4');
  await expect(page.locator('.code-line.count-loop-line')).toHaveCount(3);

  await page.getByText('Full Control', { exact: true }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 11n + 12');
  await expect(page.locator('.ops-row-kind')).toHaveCount(3);
  await expect(page.locator('.ops-row').filter({ hasText: 'condition' })).toContainText('n + 1');
});

test('recursive functions expose call frames and guided recurrence assumptions', async ({ page }, testInfo) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Recursive Factorial/ }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  await page.locator('#step-slider').fill('8');
  await expect(page.locator('#call-stack-box')).toContainText('Factorial');
  await expect(page.locator('#call-stack-box')).toContainText('depth 3');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Results' }).click();
  await page.getByRole('tab', { name: 'Recurrence' }).click();
  await page.getByRole('button', { name: 'Confirm size measure' }).click();
  await expect(page.locator('#recurrence-assumptions')).toContainText('non-recursive work');
  await page.locator('input[name="recurrence-combine"][value="constant"]').click();
  await expect(page.locator('#recurrence-formula')).toContainText('T(n)');
  await expect(page.locator('#recurrence-big-o')).toHaveText('O(n)');
});

test('symbolic operation counting is touch-readable without horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: nested loops/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n² + 6');
  await expect(page.locator('.loop-explanation').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('problem work tabs reach code and results on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/practice.html?module=1');
  await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('#code-box')).toBeVisible();
  await expect(page.locator('#problem-pane')).toBeHidden();
  await page.getByRole('button', { name: 'Run Checks' }).click();
  await expect(page.getByRole('tab', { name: 'Results' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#results-body')).toBeVisible();
});

test('module catalog opens an intermediate problem list before practice', async ({ page }, testInfo) => {
  await page.goto('/problems.html');
  await expect(page.getByRole('heading', { name: 'Explore the course' })).toBeVisible();
  await expect(page.locator('.module-card')).toHaveCount(8);
  await expect(page.getByText('Not implemented', { exact: true })).toHaveCount(12);
  const heights = await page.locator('.module-card').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));
  expect(new Set(heights.map((height) => Math.round(height))).size).toBe(1);
  await page.getByRole('link', { name: /Choose a problem/ }).first().click();
  await expect(page).toHaveURL(/problem-list\.html\?module=1$/);
  await expect(page.getByRole('heading', { name: 'Module 1: select a problem' })).toBeVisible();
  await page.locator('.problem-choice-action').first().click();
  await expect(page).toHaveURL(/practice\.html\?module=1&problem=/);
  await expect(page.locator('#p-module')).toHaveText('Module 1');
  await expect(page.locator('#progress-line')).toContainText('of 11 solved');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByRole('link', { name: 'Back to Problem List' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'All Problems' })).toHaveCount(0);
});

test('modules catalog separates problem sets and visualizations without duplicating the visualizer rail', async ({ page }) => {
  await page.goto('/problems.html?view=visualizations');
  await expect(page.getByRole('tab', { name: 'Visualizations' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.visualization-card')).toHaveCount(9);
  await page.getByRole('link', { name: /Bubble Sort/ }).click();
  await expect(page).toHaveURL(/visualizer\.html\?activity=bubble-sort$/);
  await expect(page.locator('.activity-rail')).toHaveCount(0);
  await expect(page.locator('.topbar-nav a[href="visualizer.html"]')).toHaveAttribute('aria-current', 'page');
});

test('difficulty tags use a distinct increasing-intensity palette', async ({ page }) => {
  await page.goto('/problem-list.html?module=1');
  await expect(page.locator('.diff-warmup').first()).toBeVisible();
  await expect(page.locator('.diff-core').first()).toBeVisible();
  await expect(page.locator('.diff-challenge').first()).toBeVisible();
  await expect(page.locator('.diff-medium').first()).toBeVisible();
  await expect(page.locator('.diff-mediumhard').first()).toBeVisible();
  await expect(page.locator('.diff-hard').first()).toBeVisible();
  const colors = await page.locator('.chip-diff').evaluateAll((chips) => chips.map((chip) => getComputedStyle(chip).backgroundColor));
  expect(new Set(colors).size).toBeGreaterThan(2);
});

test('touch indentation works in both structured and pseudocode editors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/writer.html');
  const secondStep = page.locator('.step-input').nth(1);
  await secondStep.focus();
  await page.getByRole('button', { name: 'Indent step' }).click();
  await expect(page.locator('.step-row').nth(1)).toHaveCSS('padding-left', '20px');

  await page.goto('/tracer.html');
  const editor = page.locator('#code-box');
  await editor.fill('IF ready THEN\nWRITE "yes"\nENDIF');
  await editor.evaluate((element) => { element.setSelectionRange(14, 25); });
  await page.getByRole('button', { name: 'Indent', exact: true }).click();
  await expect(editor).toHaveValue('IF ready THEN\n    WRITE "yes"\nENDIF');
});

test('all entry pages open from file URLs and permit an interaction', async ({ page }) => {
  test.skip(process.platform !== 'win32');
  for (const entry of entries) {
    const fileUrl = `file:///${path.resolve(__dirname, '..', entry).replace(/\\/g, '/')}`;
    await page.goto(fileUrl);
    await expect(page.locator('body')).toBeVisible();
  }
  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}`);
  await page.getByLabel('Motion preference').selectOption('off');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'tracer.html').replace(/\\/g, '/')}`);
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: sum of n values/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n + 6');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?course=itcc45&activity=itcc45-object-state`);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');
});

test('cached navigation remains available offline', async ({ page, context }, testInfo) => {
  await page.goto('/visualizer.html');
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.goto('/practice.html?module=1');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('#code-box')).toBeVisible();
});

test('service-worker updates remove only obsolete practice caches', async ({ page }) => {
  await page.goto('/missing-test-entry');
  await page.evaluate(async () => {
    await caches.open('another-app-cache');
    await caches.open('itcc47-practice-obsolete');
  });
  await page.goto('/index.html');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(async () => await caches.keys())).toContain('another-app-cache');
  expect(await page.evaluate(async () => (await caches.keys()).includes('itcc47-practice-obsolete'))).toBe(false);
});
