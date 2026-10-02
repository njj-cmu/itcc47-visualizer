module.exports = function testRecursion({ ok, section, load, root }) {
  const fs = require('fs');
  const path = require('path');
  section('M5-A Python recursion foundations');
  const engine = load(['sha256.js', 'playback.js', 'interpreter.js', 'complexity.js', 'algorithms.js',
    'activity-catalog.js', 'activity-packs/recursion-traces.js', 'visualizer-src/recursion-contract.js', 'recursion-activities.js'], { setTimeout, clearTimeout });
  const Recursion = engine.get('ITCC47Recursion');
  const Activities = engine.get('ITCC47Activities');
  const Playback = engine.get('BSITPlayback');
  const data = engine.get('ITCC47RecursionTraces');
  const ids = ['recursion-call-stack', 'recursion-return-values'];
  ok('M5 catalog IDs are unique and preserve both legacy placeholders', new Set(Activities.list().map(a => a.id)).size === Activities.list().length &&
    Activities.get('recursive-range-search').engine === 'curated-concept' && Activities.get('stable-merge-sort').engine === 'curated-concept');
  for (const id of ids) {
    const activity = Activities.get(id);
    ok(id + ': explicit Python contract, version and preview-only parent', activity.language === 'python' && activity.traceHandoff === false &&
      activity.checkpointId === 'm5-recursion' && activity.reviewStatus === 'draft' && activity.contentVersion === '2026.10-m5-a-1');
    for (const n of Recursion.PRESETS) {
      const fixture = activity.fixtureFor({ n });
      const run = activity.run({ n });
      const questions = activity.predictionsFor({ n });
      const events = run.events;
      ok(id + n + ': prediction targets refer to actual semantic events', questions.length === 3 &&
        questions.every(question => events.some(event => event.id === question.at) && question.options.includes(question.answer)) &&
        (activity.programId !== 'sum_to' || events.find(event => event.id === questions[2].at).type === 'assign_result'));
      ok(id + n + ': source includes exact verified driver and matches trace source', activity.sourceFor({ n }).join('\n') === fixture.source &&
        fixture.source.includes(activity.programId + '(' + n + ')') && events.every(e => e.frame.sourceRevision === fixture.sourceRevision));
      ok(id + n + ': semantic events remain deeply immutable', Object.isFrozen(events[1].frame.framesById['call-1'].locals.n) &&
        new Set(events.map(e => e.id)).size === events.length);
      ok(id + n + ': complete trace, actual variable event count, driver excluded from depth', run.outcome === 'complete' &&
        events.length > n + 1 && events.at(-1).terminal && events.at(-1).frame.metrics.maxDepth === n + 1);
      const controller = Playback.createController();
      controller.load(events);
      for (const target of [events.length - 1, 3, 0, events.findIndex(e => e.type === 'return_ready')]) {
        controller.seek(target);
        ok(id + n + ': seek restores the whole immutable event at ' + target, controller.getState().currentEvent === events[target]);
      }
      controller.step(-1);
      ok(id + n + ': previous restores source and snapshots together', controller.getState().currentEvent === events[controller.getState().index]);
      controller.seek(0);
      ok(id + n + ': restart has empty stack and no stdout', controller.getState().currentEvent.frame.stdout === '' &&
        controller.getState().currentEvent.frame.stack.length === 0);
      controller.dispose();
    }
  }
  for (const n of [-1, 2, 99, '3', true]) {
    const run = Recursion.run('sum_to', { n });
    ok('M5-ERR-01 unsupported fixture fails closed: ' + n, run.outcome === 'error' && run.events.length === 0 && run.diagnostics.length > 0);
  }
  const tags = [{ kind: 'UNBOUND' }, { kind: 'PENDING' }, { kind: 'NONE' }, { kind: 'INTEGER', value: 0 }];
  ok('M5-VAL-01 all four value states have distinct labels', new Set(tags.map(Recursion.formatValue)).size === 4);
  for (const field of ['source', 'events']) {
    const bad = JSON.parse(JSON.stringify(data.fixtures['sum_to:n3']));
    if (field === 'source') bad.source += '# drift\n';
    else bad.events[0].frame.stdout = 'fabricated';
    let rejected = false;
    try { Recursion.adapt(bad); } catch { rejected = true; }
    ok('M5-SRC-02 rejects ' + field + ' revision drift', rejected);
  }
  const failed = JSON.parse(JSON.stringify(data.fixtures['sum_to:n3']));
  failed.outcome = 'pedagogical-limit';
  ok('M5-ERR-01 aborted outcome cannot become successful or terminal', Recursion.adapt(failed).outcome === 'error' &&
    !Recursion.adapt(failed).events.at(-1).terminal);
  const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'curriculum.public.json'), 'utf8'));
  const cp = curriculum.checkpoints.find(c => c.id === 'm5-recursion');
  ok('M5-LOCK-01 foundations precede the preserved duplicate-range draft', cp.reviewStatus === 'draft' &&
    cp.sequence.join(',') === 'activity:recursion-call-stack,activity:recursion-return-values,activity:recursive-range-search');
  ok('M5-LOCK-01 public release still ends at Module 4', fs.readFileSync(path.join(root, 'release-profile.js'), 'utf8').includes("currentCheckpointId: 'm4-queue-deque'"));
  ok('M5 saved pseudocode draft contract is not migrated', fs.readFileSync(path.join(root, 'future-problems.js'), 'utf8').includes("'recursive-sum','Recursive range sum'"));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'activity-packs/recursion-foundations-manifest.json'), 'utf8'));
  const bytes = manifest.files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
  ok('M5-OFF-01 optional manifest reports the exact installed size', manifest.bytes === bytes && manifest.files.length === 4);
  ok('M5-OFF-01 fixture data stays outside core precache', !require('../build-sw').expectedAssets().some(file => file.includes('recursion-traces')));
};
