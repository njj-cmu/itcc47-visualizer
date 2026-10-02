/* M5-A remains instructor-preview content under the existing draft checkpoint. */
(() => {
  const specifications = [
    { id: 'recursion-call-stack', programId: 'countdown', title: 'Calls go down; control returns up' },
    { id: 'recursion-return-values', programId: 'sum_to', title: 'A returned answer completes its caller’s work' },
  ];
  const activities = specifications.map((spec) => Object.freeze({
    ...spec, subtitle: 'Guided Python execution', module: 5, topic: 'Python recursion foundations', family: 'Recursion',
    checkpointId: 'm5-recursion', cloIds: Object.freeze([4, 5, 6]), reviewStatus: 'draft',
    contentVersion: '2026.10-m5-a-1', engine: 'verified-python-fixture', renderer: 'python-recursion',
    workspaceComposition: 'python-recursion', language: 'python', traceHandoff: false,
    input: Object.freeze({ kind: 'python-recursion-preset', defaults: Object.freeze({ n: 3 }), editable: false }),
    sourceFor(options) { return this.fixtureFor(options).source.split('\n'); },
    fixtureFor(options = {}) { return ITCC47Recursion.fixture(spec.programId, options.n ?? 3); },
    predictionsFor(options = {}) { return ITCC47Recursion.predictions(this.fixtureFor(options)); },
    run(options = {}) { return ITCC47Recursion.run(spec.programId, options); },
  }));
  activities.forEach((activity) => {
    if (!ITCC47Activities.register(activity)) throw new Error('Duplicate recursion activity: ' + activity.id);
  });
})();
