const { test, expect } = require('@playwright/test');
const { api, preview, open, choose, seek, capture } = require('./sorting-helpers');
const lengthOf = (f, e, local) => f.heaps[e.frame.heapVersion][e.frame.focus.locals[local]?.objectId]?.length;
const valuesOf = (f, e, tag) => f.heaps[e.frame.heapVersion][tag?.objectId]?.map(id => f.items[id].value);
const is = kind => e => e.kind === kind;

for (const program of ['merge', 'quick']) {
  test('M5C semantic storyboard and truthful array cells: ' + program, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await preview(page); await open(page, program);
    // Every project checks its own viewport. The laptop also supplies the
    // handoff's large-desktop views without adding a global third project.
    const viewports = testInfo.project.name === 'laptop' ? [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }] : [{ width: 390, height: 844 }];
    const cases = program === 'merge' ? [
      ['MS01', 'full', 'default', is('INITIAL')],
      ['MS02', 'full', 'default', e => e.kind === 'SPLIT_RANGE' && e.frame.focus.parent === 'driver'],
      ['MS03', 'full', 'default', is('COMPARE_HEADS')],
      ['MS04', 'full', 'default', is('APPEND_VALUE')],
      ['MS05', 'full', 'default', is('DRAIN_REMAINDER')],
      ['MS06', 'full', 'default', (e, f) => e.kind === 'COMPARE_HEADS' && lengthOf(f, e, 'left') === 4],
      ['MS07', 'full', 'default', (e, f) => e.kind === 'DRAIN_REMAINDER' && lengthOf(f, e, 'result') === 7],
      ['MS08-return', 'full', 'default', e => e.kind === 'RETURN_COMPLETE' && e.frame.focus.parent === 'driver'],
      ['MS08-print', 'full', 'default', is('DRIVER_PRINT')],
      ['MS09-choice', 'full', 'ties', e => e.kind === 'COMPARE_HEADS' && e.frame.comparison.left === e.frame.comparison.right],
      ['MS09-final', 'full', 'ties', is('COMPLETE')],
      ['MS10-entry', 'helper', 'root-pair', is('MERGE_BEGIN')],
      ['MS10-final', 'helper', 'root-pair', is('COMPLETE')],
      ['MS11', 'helper', 'left-empty', is('DRAIN_REMAINDER')],
      ['MS12', 'full', 'empty', is('COMPLETE')],
    ] : [
      ['QS01', 'full', 'default', is('BOUNDARY_READY')],
      ['QS02', 'full', 'default', is('COMPARE_TO_PIVOT')],
      ['QS03', 'full', 'default', is('BOUNDARY_ADVANCE_PENDING')],
      ['QS04', 'full', 'default', is('SWAP_COMMIT')],
      ['QS05', 'full', 'default', is('SCAN_COMPLETE')],
      ['QS06', 'full', 'default', is('PIVOT_PLACE')],
      ['QS07', 'full', 'default', e => e.kind === 'SELECT_PIVOT' && e.frame.focus.locals.high.value === 3],
      ['QS08', 'full', 'default', e => e.kind === 'SELECT_PIVOT' && e.frame.focus.locals.low.value === 5],
      ['QS09', 'full', 'default', is('COMPLETE')],
      ['QS10', 'helper', 'root-partition', is('COMPLETE')],
      ['QS11', 'full', 'all-equal', is('SELF_SWAP')],
      ['QS12', 'full', 'ties', is('COMPLETE')],
      ['QS13-deep', 'full', 'sorted', e => e.frame.stack.length === 8],
      ['QS13-final', 'full', 'sorted', is('COMPLETE')],
      ['QS14', 'full', 'empty', is('COMPLETE')],
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const [label, mode, fixtureId, predicate] of cases) {
        if (viewport.width !== 1920 && !['MS06', 'QS06'].includes(label)) continue;
        const f = api.fixture(program, { mode, fixture: fixtureId });
        await choose(page, mode, fixtureId, true);
        const event = await seek(page, f, e => predicate(e, f));
        const frame = event.frame;
        await expect(page.locator('.sort-operation h2')).toHaveText(event.message);
        for (const run of await page.locator('.sort-run[data-container-id]').all()) {
          const id = await run.getAttribute('data-container-id');
          if (!frame.objects[id]) continue; // Explicitly labelled input previews.
          expect(await run.locator('.sort-value strong').allTextContents()).toEqual(frame.objects[id].map(item => String(frame.items[item].value)));
          expect(await run.locator('.sort-slot').evaluateAll(nodes => nodes.map(n => n.dataset.itemId))).toEqual([...frame.objects[id]]);
        }
        if (label === 'MS02') await expect(page.locator('.sort-split-preview')).toContainText('Not started');
        if (label === 'MS04') {
          expect(frame.focus.locals.j.value).toBe(0);
          await expect(page.getByRole('region', { name: 'Right sorted run', exact: true }).locator('.sort-slot')).toHaveCount(1);
          await expect(page.getByRole('region', { name: 'Merged result', exact: true }).locator('.sort-value strong')).toHaveText('3');
        }
        if (label === 'MS06') await expect(page.locator('.sort-comparison')).toContainText('1 ≤ 0False');
        if (label === 'MS09-final') expect(frame.objects[frame.callResult.objectId].map(id => frame.items[id].label)).toEqual(['C', 'A', 'B']);
        if (label === 'MS08-return') {
          expect(frame.stdout).toBe(''); await expect(page.locator('[data-sorting-stdout]')).toHaveText('No output yet.');
          await expect(page.getByRole('region', { name: 'Returned sorted run', exact: true }).locator('.sort-value strong')).toHaveText(['0','1','2','3','5','7','8','10']);
          await expect(page.locator('[data-sorting-result]')).toHaveText('[0, 1, 2, 3, 5, 7, 8, 10]');
        }
        if (label === 'QS01') await expect(page.locator('.sort-pointer-legend')).toContainText('i = -1 · empty prefix before low');
        if (label === 'QS02') await expect(page.locator('.quicksort-canvas .sort-slot[data-index="0"]')).toHaveClass(/region-greater/);
        if (label === 'QS03') { await expect(page.locator('.sort-pending-note')).toBeVisible(); expect(frame.array).toEqual([8,3,1,7,0,10,2,5]); }
        if (label === 'QS05') await expect(page.locator('.sort-pointer-legend')).toContainText('j = 6 · scan complete');
        if (label === 'QS06') { expect(frame.array).toEqual([3,1,0,2,5,10,7,8]); await expect(page.locator('.quicksort-canvas')).toContainText('Neither side is necessarily sorted'); }
        if (label === 'QS07') await expect(page.locator('.sort-range-bracket')).toHaveAttribute('aria-label', 'Active inclusive range 0 through 3');
        if (label === 'QS10') await expect(page.locator('.sort-completion')).toContainText('This is not a completed sort');
        if (label === 'QS11') { expect(event.metrics.selfSwaps).toBe(1); expect(event.metrics.exchanges).toBe(0); expect(event.transition).toBeNull(); }
        if (label === 'QS12') expect(frame.objects[frame.originalIds[0]].map(id => frame.items[id].label)).toEqual(['C', 'B', 'A']);
        if (label === 'QS13-final') { expect(event.metrics.keyComparisons).toBe(28); expect(event.metrics.peakFunctionDepth).toBe(8); }
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
        if (viewport.width >= 1366) {
          const board = await page.locator('.sorting-canvas-surface').boundingBox();
          const source = await page.locator('.sorting-source-surface').boundingBox();
          expect(board.width / (board.width + source.width)).toBeGreaterThan(.65);
        }
        if (label === 'QS13-final') await page.locator('.sorting-details > summary').click();
        await capture(page, testInfo, label);
      }
    }
  });
}
