module.exports = function testRecursion({ ok, section, load, root }) {
  const fs = require('fs');
  const path = require('path');
  section('M5 Python recursion foundations and applications');
  const engine = load(['sha256.js', 'playback.js', 'interpreter.js', 'complexity.js', 'algorithms.js',
    'activity-catalog.js', 'activity-packs/recursion-traces.js', 'visualizer-src/recursion-contract.js', 'visualizer-src/recursion-questions.js', 'visualizer-src/recursion-presentation.js', 'recursion-activities.js'], { setTimeout, clearTimeout });
  const Recursion = engine.get('ITCC47Recursion');
  const Activities = engine.get('ITCC47Activities');
  const Playback = engine.get('BSITPlayback');
  const data = engine.get('ITCC47RecursionTraces');
  const presentation = engine.get('ITCC47RecursionPresentation');
  const identities = new Set();
  for (const item of Object.values(data.fixtures)) {
    const original = JSON.stringify(item);
    const run = Recursion.adapt(item);
    const questions = Recursion.predictions(item);
    identities.add(run.result.identity);
    ok(item.fixtureId + ': questions target real events including bounded faults', questions.length >= 3 && questions.every(q =>
      item.events.some(e => e.eventId === q.at) && q.options.includes(q.answer)));
    ok(item.fixtureId + ': completed execution and exercise correctness are independent',
      (run.outcome === 'complete') === (item.outcome === 'completed') && run.result.correctness === item.correctness);
    ok(item.fixtureId + ': object table and inputs are immutable and shared by snapshots',
      Object.isFrozen(run.events[0].frame.objects) && Object.isFrozen(run.events[0].frame.inputs) &&
      run.events.every(e => e.frame.objects === run.events[0].frame.objects));
    for (const object of Object.values(run.events[0].frame.objects)) {
      ok(item.fixtureId + ': nested input bindings frozen', Object.isFrozen(object) && Object.isFrozen(object.items || object.fields)
        && Object.values(object.items || object.fields).every(Object.isFrozen));
    }
    for (const event of item.events) {
      const frame = event.frame;
      const running = frame.stack.filter(id => frame.framesById[id].status === 'RUNNING');
      ok(item.fixtureId + ': at most one running function', running.length <= 1 && (!running.length || running[0] === frame.activeCallId));
      const view = presentation.derive(event);
      if (event.eventKind === 'RETURN_COMPLETE' && frame.stack.length) {
        const caller = frame.framesById[frame.stack[0]];
        ok(item.fixtureId + ': handoff source belongs to its caller', view.mode === 'return-handoff' && view.line === caller.suspendedCallSite && view.origin.callId === frame.returnTransfer.childCallId && view.origin.line === event.source.line);
      }
      for (const id of frame.stack.filter(id => frame.framesById[id].status === 'WAITING')) {
        const pinned = presentation.derive(event, id);
        ok(item.fixtureId + ': inspected waiting source belongs to that call', pinned.line === frame.framesById[id].suspendedCallSite);
      }
    }
    const final = item.events.at(-1);
    if (item.outcome === 'completed') {
      ok(item.fixtureId + ': empty stack defaults to driver completion', presentation.derive(final).mode === 'driver-complete' && presentation.derive(final).inspectedId === null);
      const historical = presentation.derive(final, 'call-1');
      ok(item.fixtureId + ': history uses completed invocation return location', historical.mode === 'completed-history' && historical.line === final.frame.framesById['call-1'].returnLine);
    } else {
      ok(item.fixtureId + ': real fault ends in stopped presentation', presentation.derive(final).mode === 'stopped');
    }
    ok(item.fixtureId + ': view derivation does not mutate source or state', JSON.stringify(item) === original);
  }
  ok('Every fixture and repair mode has a distinct stable workspace identity', identities.size === Object.keys(data.fixtures).length);
  for (const field of ['schemaVersion', 'objects', 'traceRevision']) {
    const bad = JSON.parse(JSON.stringify(data.fixtures['folder-course']));
    if (field === 'objects') bad.objects['object-1'].fields.name.value = 'drift';
    else bad[field] = field === 'schemaVersion' ? 999 : '0'.repeat(64);
    let rejected = false;
    try { Recursion.adapt(bad); } catch { rejected = true; }
    ok('M5B rejects incompatible ' + field, rejected);
  }
  for (const options of [{ fixture: 'missing' }, { fixture: 'list-empty', variant: 'wrong_base' }, { fixture: 'list-main', variant: 'invented' }]) {
    const bad = Recursion.run('list_total', options);
    ok('M5B undeclared fixture/variant fails closed', bad.outcome === 'error' && bad.events.length === 0);
  }
  for (const id of ['recursion-list-total', 'recursion-folder-total']) {
    const activity = Activities.get(id);
    ok(id + ': explicit reviewed Python contract', activity.language === 'python' && activity.reviewStatus === 'reviewed' && activity.traceHandoff === false);
  }
  for (const outcome of ['runtime-error', 'pedagogical-limit', 'unknown']) {
    const event = JSON.parse(JSON.stringify(data.fixtures['sum_to:n3'].events[2]));
    event.frame.activeCallId = null; event.frame.outcome = outcome;
    event.frame.framesById['call-1'].status = outcome === 'unknown' ? 'UNRECOGNIZED' : 'ABORTED';
    const view = presentation.derive(event);
    ok('Stopped and unknown states never imply receiving a result: ' + outcome, view.mode === 'stopped' && view.returnOrigin === null);
  }
  const ids = ['recursion-call-stack', 'recursion-return-values'];
  ok('M5 catalog IDs are unique and preserve both legacy placeholders', new Set(Activities.list().map(a => a.id)).size === Activities.list().length &&
    Activities.get('recursive-range-search').engine === 'curated-concept' && Activities.get('stable-merge-sort').engine === 'curated-concept');
  for (const id of ids) {
    const activity = Activities.get(id);
    ok(id + ': explicit Python contract, version and reviewed parent', activity.language === 'python' && activity.traceHandoff === false &&
      activity.checkpointId === 'm5-recursion' && activity.reviewStatus === 'reviewed' && activity.contentVersion === '2026.10-m5-b-2');
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
  ok('M5 release opens the reviewed lessons, search and matching practice in sequence', cp.reviewStatus === 'reviewed' &&
    cp.sequence.join(',') === 'activity:recursion-call-stack,activity:recursion-return-values,activity:recursion-list-total,activity:recursion-folder-total,activity:recursive-range-search,problem:recursive-sum,problem:recursive-binary-range');
  ok('M5 release stops at recursion', fs.readFileSync(path.join(root, 'release-profile.js'), 'utf8').includes("currentCheckpointId: 'm5-recursion'") && curriculum.checkpoints.find(c => c.id === 'm5-divide-conquer').reviewStatus === 'draft');
  ok('M5 saved pseudocode draft contract is not migrated', fs.readFileSync(path.join(root, 'future-problems.js'), 'utf8').includes("'recursive-sum','Recursive range sum'"));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'activity-packs/recursion-foundations-manifest.json'), 'utf8'));
  const bytes = manifest.files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
  ok('M5-OFF-01 optional manifest reports the exact installed size', manifest.bytes === bytes && manifest.files.length === 4);
  ok('M5-OFF-01 fixture data stays outside core precache', !require('../build-sw').expectedAssets().some(file => file.includes('recursion-traces')));
};
