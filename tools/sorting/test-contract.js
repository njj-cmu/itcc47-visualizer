const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function sortingContractTests({ ok, section, root }) {
  section('M5-C verified Python sorting snapshots');
  const pointer = path.join(root, 'activity-packs/sorting-manifest.json');
  const traces = fs.existsSync(pointer) ? JSON.parse(fs.readFileSync(pointer, 'utf8')).files[0] : '.sorting-pack-build/sorting-traces.js';
  const ctx = vm.createContext({ console, TextEncoder, setTimeout, clearTimeout });
  for (const file of ['sha256.js', 'playback.js', traces, 'visualizer-src/sorting-contract.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  const pack = vm.runInContext('ITCC47SortingTraces', ctx);
  const api = ctx.ITCC47Sorting;
  const playback = vm.runInContext('BSITPlayback', ctx);
  const hash = vm.runInContext('Hash', ctx);
  const manifest = JSON.parse(fs.readFileSync(pointer, 'utf8'));
  const crypto = require('crypto');
  const actualRevision = crypto.createHash('sha256').update(Buffer.concat(manifest.files.slice(0, 3).map(file => fs.readFileSync(path.join(root, file))))).digest('hex').slice(0, 16);
  ok('sorting asset paths bind the actual content revision, not a query string', manifest.revision === actualRevision && manifest.files.every(file => file.startsWith('activity-packs/sorting-' + actualRevision + '/') && !file.includes('?')));
  ok('offline confirmation reports exactly all installed bytes', manifest.bytes === manifest.files.reduce((total, file) => total + fs.statSync(path.join(root, file)).size, 0));
  ok('publisher retains all three existing optional packs', ['manifest.json', 'recursion-foundations-manifest.json', 'priority-service-lane-manifest.json'].every(name => JSON.parse(fs.readFileSync(path.join(root, 'activity-packs', name), 'utf8')).files.every(file => fs.existsSync(path.join(root, file)))));
  vm.runInContext(fs.readFileSync(path.join(root, 'visualizer-src/sorting-presentation.js'), 'utf8').replace(/^export /gm, ''), ctx);
  const questionsFor = vm.runInContext('questionsFor', ctx);
  const mergeModel = vm.runInContext('mergeModel', ctx);
  const copy = value => JSON.parse(JSON.stringify(value));
  ok('sorting pack declares exactly 32 mode-specific trusted fixtures', Object.keys(pack.fixtures).length === 32 && pack.catalog.length === 32);
  for (const item of Object.values(pack.fixtures)) {
    const result = api.adapt(item);
    const detailed = api.adapt(item, true);
    if (item.program === 'merge') {
      ok(`${item.identity}: returning sort calls show the actual returned list, never the unsorted input`, detailed.events.filter(e =>
        e.frame.focus.function === 'merge_sort' && ['returning', 'completed'].includes(e.frame.focus.status)).every(e => {
          const model = mergeModel(e.frame);
          return model.kind === 'returned' && model.returned.id === e.frame.focus.returnValue.objectId;
        }));
    }
    ok(`${item.identity}: optional predictions resolve in both playback granularities`, questionsFor(item).every(question => result.events.some(event => event.id.endsWith(':' + question.at)) && question.options.includes(question.answer)));
    ok(`${item.identity}: source and events validate`, result.outcome === 'complete' && detailed.events.length === item.events.length);
    ok(`${item.identity}: snapshot graph is deeply frozen`, Object.isFrozen(item.heaps[0]) && Object.isFrozen(item.events[0].frame) && Object.isFrozen(result.events[0].frame.objects));
    ok(`${item.identity}: one terminal and no browser evaluation`, result.events[0].type === 'initialize' && result.events.at(-1).terminal && result.events.filter(e => e.terminal).length === 1 && result.capabilities.edit === false);
    const controller = playback.createController();
    controller.load(detailed.events);
    const initial = JSON.stringify(controller.getSnapshot().currentEvent);
    const historic = Math.floor(detailed.events.length / 2);
    controller.seek(historic);
    const middle = JSON.stringify(controller.getSnapshot().currentEvent);
    controller.seek(detailed.events.length - 1);
    controller.seek(historic);
    ok(`${item.identity}: backward seek restores the entire historical event after completion`, JSON.stringify(controller.getSnapshot().currentEvent) === middle);
    controller.seek(0);
    ok(`${item.identity}: restart restores exact source, arrays, pointers, counts and stdout`, JSON.stringify(controller.getSnapshot().currentEvent) === initial);
    controller.dispose();
    ok(`${item.identity}: default steps retain all comparisons, writes, pointer advances and pending boundaries`,
      item.events.filter(e => ['COMPARE_HEADS', 'APPEND_VALUE', 'ADVANCE_POINTER', 'COMPARE_TO_PIVOT', 'BOUNDARY_ADVANCE_PENDING', 'SWAP_COMMIT', 'SELF_SWAP', 'PIVOT_PLACE'].includes(e.kind))
        .every(e => result.events.some(adapted => adapted.id.endsWith(':' + e.eventId))));
    for (const event of result.events) if (event.transition) {
      ok(`${item.identity}/${event.id}: movement names real container occurrences`, event.transition.moves.every(move => {
        const [container, id] = move.entityId.split(':');
        return event.frame.objects[container]?.includes(id);
      }));
    }
  }
  for (const program of ['merge', 'quick']) {
    const result = api.run(program);
    const firstComparison = result.events.findIndex(e => e.type.startsWith('compare_'));
    ok(`${program}: first comparison needs fewer than twelve meaningful steps`, firstComparison > 0 && firstComparison < 12);
    ok(`${program}: no unknown fixture is substituted silently`, api.run(program, { fixture: 'missing' }).outcome === 'error');
    const item = api.fixture(program);
    for (const [label, mutate] of [
      ['schema', changed => { changed.schemaVersion = 99; }],
      ['source', changed => { changed.source += '\n'; }],
      ['past array', changed => { changed.heaps[0][Object.keys(changed.heaps[0])[0]].reverse(); }],
      ['source owner', changed => { changed.events[1].source.callId = 'wrong'; changed.traceRevision = hash.hex(JSON.stringify(changed.events)); }],
      ['snapshot version', changed => { changed.events[1].frame.heapVersion = 99999; changed.traceRevision = hash.hex(JSON.stringify(changed.events)); }],
      ['successful terminal', changed => { changed.events.pop(); changed.traceRevision = hash.hex(JSON.stringify(changed.events)); }],
    ]) {
      const changed = copy(item);
      mutate(changed);
      let rejected = false;
      try { api.validate(changed); } catch { rejected = true; }
      ok(`${program}: rejects altered ${label}`, rejected);
    }
  }
};

if (require.main === module) {
  let checks = 0;
  module.exports({ root: path.resolve(__dirname, '../..'), section: console.log,
    ok(label, condition) { checks++; if (!condition) throw new Error(label); } });
  console.log(`${checks} sorting contract checks passed.`);
}
