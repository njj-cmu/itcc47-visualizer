/* Thin catalog entries; source and traces arrive only with the sorting pack. */
for (const [id, programId, title, subtitle] of [
  ['stable-merge-sort', 'merge', 'Stable merge sort', 'Split into smaller lists, then merge two sorted runs with left-first ties.'],
  ['quick-sort', 'quick', 'Lomuto quicksort', 'Place the last-element pivot, then sort the left and right ranges in place.'],
]) {
  const activity = Object.freeze({ id, programId, title, subtitle, module: 5, topic: 'Divide and Conquer', family: 'Recursion',
    checkpointId: 'm5-divide-conquer', cloIds: Object.freeze([4, 5, 6]), reviewStatus: 'reviewed',
    contentVersion: '2026.10-m5-c-1', language: 'python', engine: 'verified-python-fixture', renderer: 'python-sorting',
    workspaceComposition: 'python-sorting', traceHandoff: false,
    input: Object.freeze({ kind: 'python-sorting-preset', defaults: Object.freeze({ mode: 'full', fixture: 'default', detailed: false }), editable: false }),
    sourceFor(options) { return ITCC47Sorting.fixture(programId, options).source.split('\n'); },
    fixtureFor(options) { return ITCC47Sorting.fixture(programId, options); },
    run(options) { return ITCC47Sorting.run(programId, options); },
  });
  if (!ITCC47Activities.register(activity)) throw new Error('Duplicate sorting activity: ' + id);
}
