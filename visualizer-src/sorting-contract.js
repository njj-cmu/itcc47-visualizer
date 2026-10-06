/* A bounded fixture reader. It never evaluates Python or reruns an algorithm. */
const ITCC47Sorting = (() => {
  const validated = new WeakSet();
  const kinds = new Set(['INITIAL', 'ENTER_CALL', 'CALL_PENDING', 'SLICE_CREATED', 'BASE_CHECK', 'SPLIT_RANGE',
    'MERGE_BEGIN', 'POINTER_READY', 'COMPARE_HEADS', 'APPEND_PENDING', 'DRAIN_REMAINDER', 'APPEND_VALUE', 'ADVANCE_POINTER',
    'SELECT_PIVOT', 'BOUNDARY_READY', 'SCAN_ADVANCE', 'COMPARE_TO_PIVOT', 'BOUNDARY_ADVANCE_PENDING', 'SWAP_PENDING',
    'SWAP_COMMIT', 'SELF_SWAP', 'SCAN_COMPLETE', 'PIVOT_PENDING', 'PIVOT_PLACE', 'RETURN_READY', 'RETURN_COMPLETE',
    'ASSIGN_RESULT', 'DRIVER_PRINT', 'COMPLETE', 'LIMIT_STOP']);
  const operations = new Set(['INITIAL', 'SPLIT_RANGE', 'MERGE_BEGIN', 'COMPARE_HEADS', 'DRAIN_REMAINDER', 'APPEND_VALUE',
    'ADVANCE_POINTER', 'SELECT_PIVOT', 'BOUNDARY_READY', 'COMPARE_TO_PIVOT', 'BOUNDARY_ADVANCE_PENDING',
    'SWAP_COMMIT', 'SELF_SWAP', 'SCAN_COMPLETE', 'PIVOT_PLACE', 'DRIVER_PRINT', 'COMPLETE', 'LIMIT_STOP']);
  function requireThat(condition, message) { if (!condition) throw new Error('Sorting pack: ' + message); }
  function validate(item) {
    if (validated.has(item)) return item;
    requireThat(item?.schemaVersion === 1 && ['merge', 'quick'].includes(item.program) && ['full', 'helper'].includes(item.mode), 'incompatible fixture schema.');
    requireThat(Hash.hex(item.source) === item.sourceRevision, 'source revision mismatch.');
    requireThat(Hash.hex(JSON.stringify(item.events)) === item.traceRevision, 'trace revision mismatch.');
    requireThat(Hash.hex(JSON.stringify(item.heaps)) === item.heapRevision, 'heap revision mismatch.');
    requireThat(Hash.hex(JSON.stringify(item.items)) === item.itemsRevision, 'item revision mismatch.');
    requireThat(item.events.length > 0 && item.events.length <= 2501 && item.heaps.length > 0, 'invalid trace bounds.');
    for (const [id, value] of Object.entries(item.items)) requireThat(value.id === id && Number.isInteger(value.value) && Math.abs(value.value) <= 1000 && typeof value.label === 'string', 'invalid item.');
    for (const heap of item.heaps) for (const ids of Object.values(heap)) {
      requireThat(Array.isArray(ids) && ids.length <= 12 && new Set(ids).size === ids.length && ids.every(id => item.items[id]), 'invalid container provenance.');
    }
    const tag = (value, heap) => requireThat(value && (['NONE', 'UNBOUND'].includes(value.kind)
      || value.kind === 'INTEGER' && Number.isSafeInteger(value.value)
      || value.kind === 'BOOLEAN' && typeof value.value === 'boolean'
      || value.kind === 'REFERENCE' && Object.hasOwn(heap, value.objectId)), 'invalid local binding.');
    let version = -1;
    let previousMetrics = {};
    for (const [index, event] of item.events.entries()) {
      const frame = event.frame;
      requireThat(event.eventId === 'event-' + index && kinds.has(event.kind), 'unknown event.');
      requireThat(Number.isInteger(frame.heapVersion) && frame.heapVersion >= version && frame.heapVersion < item.heaps.length, 'invalid snapshot version.');
      version = frame.heapVersion;
      const heap = item.heaps[version];
      requireThat(Array.isArray(frame.stack) && frame.stack.length <= 32 && new Set(frame.stack.map(call => call.id)).size === frame.stack.length, 'invalid call stack.');
      for (const call of [...frame.stack, frame.focus, frame.driver]) {
        requireThat(call && (call.function === 'driver' || item.functions[call.function]), 'unknown source owner.');
        Object.values(call.locals).forEach(value => tag(value, heap));
        tag(call.returnValue, heap);
      }
      tag(frame.callResult, heap);
      if (frame.returnTransfer) tag(frame.returnTransfer.value, heap);
      if (event.source) {
        const source = event.source;
        requireThat(item.spans[source.line]?.text === source.text && source.callId === frame.focus.id
          && source.owner === frame.focus.function, 'source ownership mismatch.');
        if (source.owner !== 'driver') requireThat(source.line >= item.functions[source.owner].line && source.line <= item.functions[source.owner].endLine, 'source outside its owning function.');
      } else requireThat(event.kind === 'COMPLETE', 'missing source phase.');
      for (const [key, count] of Object.entries(event.metrics)) requireThat(Number.isInteger(count) && count >= (previousMetrics[key] || 0), 'invalid work counter.');
      requireThat(event.metrics.swapStatements === event.metrics.selfSwaps + event.metrics.exchanges, 'swap count definitions disagree.');
      previousMetrics = event.metrics;
      if (item.program === 'quick') {
        const oid = frame.originalIds[0];
        requireThat(Object.keys(heap).length === 1 && heap[oid].slice().sort().join() === item.heaps[0][oid].slice().sort().join(), 'mutable array lost an occurrence.');
        for (const [position, id] of Object.entries(frame.fixed)) requireThat(heap[oid][Number(position)] === id, 'a fixed pivot moved.');
      }
    }
    requireThat(item.events[0].kind === 'INITIAL', 'missing initial state.');
    requireThat(item.outcome === 'completed' ? item.events.at(-1).kind === 'COMPLETE' : item.outcome === 'pedagogical-limit' && item.events.at(-1).kind === 'LIMIT_STOP', 'invalid terminal outcome.');
    BSITPlayback.deepFreeze(item);
    validated.add(item);
    return item;
  }
  function catalog(program, mode) {
    requireThat(ITCC47SortingTraces.schemaVersion === 1, 'incompatible pack.');
    return ITCC47SortingTraces.catalog.filter(row => row.program === program && row.mode === mode);
  }
  function fixture(program, options = {}) {
    const mode = options.mode ?? 'full';
    const id = options.fixture ?? (mode === 'full' ? 'default' : program === 'merge' ? 'root-pair' : 'root-partition');
    const item = ITCC47SortingTraces.fixtures[`${program}:${mode}:${id}`];
    requireThat(item && catalog(program, mode).some(row => row.id === id), 'choose a supported fixture and mode.');
    return validate(item);
  }
  function meaningful(event) {
    return operations.has(event.kind) || event.kind === 'BASE_CHECK' && event.frame.operation?.base
      || event.kind === 'RETURN_READY' && (['merge', 'partition'].includes(event.frame.focus.function) || event.frame.focus.parent === 'driver')
      || event.kind === 'ASSIGN_RESULT' && event.frame.focus.function === 'driver';
  }
  function transition(event) {
    const op = event.frame.operation;
    if (event.kind === 'APPEND_VALUE') return { wait: true, moves: [{ entityId: op.container + ':' + op.itemId,
      from: op.sourceContainer + ':' + op.sourceIndex, to: op.container + ':' + op.targetIndex }] };
    if (['SWAP_COMMIT', 'PIVOT_PLACE'].includes(event.kind) && op.a !== op.b) return { wait: true,
      moves: op.items.map((id, i) => ({ entityId: op.container + ':' + id, from: String(i ? op.b : op.a), to: String(i ? op.a : op.b) })) };
    return null;
  }
  function adapt(item, detailed = false) {
    validate(item);
    const events = item.events.filter(event => detailed || meaningful(event)).map(event => {
      const objects = item.heaps[event.frame.heapVersion];
      const array = (objects[event.frame.originalIds[0]] || []).map(id => item.items[id].value);
      return BSITPlayback.timelineEvent({ id: item.identity + ':' + event.eventId, domain: 'python-sorting',
        type: event.kind === 'INITIAL' ? 'initialize' : event.kind.toLowerCase(), source: event.source,
        message: event.message, frame: { ...event.frame, objects, items: item.items, array, markers: {},
          identity: item.identity, rawIndex: Number(event.eventId.slice(6)), eventKind: event.kind, program: item.program, mode: item.mode },
        metrics: event.metrics, transition: transition(event), terminal: event.kind === 'COMPLETE' });
    });
    return BSITPlayback.runResult({ events, outcome: item.outcome === 'completed' ? 'complete' : 'error',
      result: { identity: item.identity, sourceRevision: item.sourceRevision }, truncated: item.outcome !== 'completed',
      diagnostics: item.outcome === 'completed' ? [] : [{ message: item.events.at(-1).message }],
      capabilities: { visualize: true, trace: true, variables: true, edit: false } });
  }
  function run(program, options = {}) {
    try { return adapt(fixture(program, options), Boolean(options.detailed)); }
    catch (error) { return BSITPlayback.runResult({ outcome: 'error', error: error.message, diagnostics: [{ message: error.message }] }); }
  }
  function format(tag, frame) {
    if (tag?.kind === 'REFERENCE') return '[' + (frame.objects[tag.objectId] || []).map(id => frame.items[id].value).join(', ') + ']';
    if (tag?.kind === 'NONE') return 'None';
    if (tag?.kind === 'UNBOUND') return 'not bound yet';
    return String(tag?.value ?? 'not bound yet');
  }
  return Object.freeze({ validate, fixture, catalog, adapt, run, meaningful, format });
})();
globalThis.ITCC47Sorting = ITCC47Sorting;
