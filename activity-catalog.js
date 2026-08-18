/* Versioned syllabus activity catalog shared by the static shell and React workspace. */
const ITCC47Activities = (() => {
  const SCHEMA_VERSION = 1;
  const CONTENT_VERSION = '2026.08-m4-practice';
  const ACTIVITY_CHECKPOINTS = Object.freeze({
    'linear-search': ['m2-linear-search', [1, 2, 4]], 'binary-search': ['m2-binary-search', [1, 2, 4, 5]],
    'bubble-sort': ['m2-bubble-sort', [1, 2, 4, 5]], 'selection-sort': ['m2-selection-sort', [1, 2, 4, 5]],
    'insertion-sort': ['m2-insertion-sort', [1, 2, 4, 5]], 'binary-range-search': ['m2-binary-search', [2, 4, 5]],
    'stable-insertion-dispatch': ['m2-insertion-sort', [2, 4, 5]], 'array-list-insert': ['m2-array-mutation', [1, 2, 4, 5]],
    'array-list-remove': ['m2-array-mutation', [1, 2, 4, 5]], 'linked-list-traversal': ['m3-linked-foundations', [1, 2, 4, 6]],
    'array-linked-comparison': ['m3-linked-foundations', [1, 2, 4, 6]], 'linked-list-insert-head': ['m3-linked-mutation', [1, 2, 4, 6]],
    'linked-list-sorted-insert': ['m3-linked-mutation', [1, 2, 4, 6]], 'linked-list-find-update': ['m3-linked-mutation', [1, 2, 4, 6]],
    'linked-list-delete': ['m3-linked-mutation', [1, 2, 4, 6]], 'stack-delimiter-audit': ['m4-stack', [2, 3, 4, 5, 6]],
    'deque-service-lane': ['m4-queue-deque', [2, 3, 4, 5, 6]], 'recursive-range-search': ['m5-recursion', [4, 5, 6]],
    'stable-merge-sort': ['m5-divide-conquer', [4, 5, 6]], 'tree-traversals': ['m6-trees', [1, 2, 4, 5, 6]],
    'bst-insert-search': ['m6-bst', [1, 2, 4, 5, 6]], 'bst-height-shape': ['m6-bst', [1, 2, 4, 5, 6]],
    'graph-representation': ['m7-graphs', [1, 2, 4, 5, 6]], 'bfs-shortest-path': ['m7-traversal', [1, 2, 4, 5, 6]],
    'dfs-reachability': ['m7-traversal', [1, 2, 4, 5, 6]], 'greedy-dp-coin-change': ['m8-greedy', [2, 3, 4, 5]],
    'knapsack-dp': ['m8-dp', [2, 3, 4, 5]],
  });

  function withCurriculum(activity) {
    const [checkpointId = null, cloIds = []] = ACTIVITY_CHECKPOINTS[activity.id] || [];
    const curriculumResource = typeof ITCC47Curriculum === 'undefined' ? null : ITCC47Curriculum.getResource('activity', activity.id);
    return Object.freeze({ ...activity, checkpointId, cloIds: Object.freeze([...cloIds]), reviewStatus: curriculumResource?.reviewStatus || 'draft' });
  }

  function algorithmActivity(id, key, title, family, subtitle) {
    const defaultValues = [42, 17, 8, 63, 29, 4, 51, 35, 12, 76];
    const defaultTarget = ALGORITHMS[key].needsTarget ? defaultValues[Math.floor(defaultValues.length / 2)] : null;
    return Object.freeze({
      id, contentVersion: CONTENT_VERSION, module: 2, topic: 'Arrays', family,
      title, subtitle, engine: 'curated-array', renderer: 'array', teachingVariant: TEACHING_VARIANTS[key],
      source: ALGORITHMS[key].sourceFor({ target: defaultTarget }), views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
      sourceFor(options = {}) { return ALGORITHMS[key].sourceFor({ target: options.target ?? defaultTarget }); },
      input: Object.freeze({ kind: 'array', min: 4, max: 18, defaultValues, needsTarget: !!ALGORITHMS[key].needsTarget }),
      metrics: ALGORITHMS[key].metrics,
      complexity: ALGORITHMS[key].complexity,
      blurb: ALGORITHMS[key].blurb,
      run(options = {}) {
        const values = Array.isArray(options.values) ? options.values : this.input.defaultValues;
        const target = options.target == null ? values[Math.floor(values.length / 2)] : options.target;
        return ITCC47Playback.runResult({ events: ALGORITHMS[key].run(values, target) });
      },
    });
  }

  function arrayFrame(values, highlight = {}, markers = {}, presentation = null) {
    return {
      kind: 'array', array: [...values],
      items: values.map((value, index) => Object.freeze({ id: `slot:${index}`, value, index })),
      presentation, highlight, markers: Object.freeze({ ...markers }),
    };
  }

  function arrayListTeaching(activityId, type, values, options = {}) {
    const markers = options.markers || {};
    const highlight = options.highlight || {};
    const annotations = [];
    const index = markers.index;
    const structural = highlight.transition;
    if (Number.isInteger(index) && index >= 0 && index < values.length) {
      annotations.push({ id: 'index', label: 'index', value: index, tone: 'minimum', target: { kind: 'slot', index } });
    }
    if (Number.isInteger(structural?.from) && structural.from >= 0 && structural.from < values.length) {
      annotations.push({ id: 'source', label: 'shift from', value: structural.from, tone: 'primary', target: { kind: 'slot', index: structural.from } });
    }
    if (Number.isInteger(structural?.to) && structural.to >= 0 && structural.to < values.length) {
      annotations.push({ id: 'destination', label: 'shift to', value: structural.to, tone: 'secondary', target: { kind: 'slot', index: structural.to } });
    }
    const heldEntity = options.presentation?.held
      ? options.presentation.entities?.find((entity) => entity.id === options.presentation.held.entityId) : null;
    const status = [];
    if (activityId === 'array-list-insert' && heldEntity) status.push({ label: 'value', value: heldEntity.value, tone: 'primary' });
    if (activityId === 'array-list-remove' && Number.isFinite(markers.variables?.removed)) status.push({ label: 'removed', value: markers.variables.removed, tone: 'danger' });
    if (!annotations.length && !status.length) return null;
    return {
      variant: activityId === 'array-list-insert' ? 'indexed-insertion' : 'indexed-removal',
      title: activityId === 'array-list-insert' ? 'Insertion shift' : 'Removal shift',
      annotations, comparison: null, status,
    };
  }

  function arrayListEvent(activityId, index, type, message, values, metrics, source, options = {}) {
    const teaching = arrayListTeaching(activityId, type, values, options);
    return ITCC47Playback.timelineEvent({
      id: `${activityId}:${index}`, domain: 'array-list', type, message,
      frame: arrayFrame(values, options.highlight, { ...(options.markers || {}), ...(teaching ? { teaching } : {}) }, options.presentation), metrics,
      transition: options.transition || null,
      source, boundary: !!options.boundary, terminal: !!options.terminal,
    });
  }

  const arrayListInsert = Object.freeze({
    id: 'array-list-insert', contentVersion: CONTENT_VERSION, module: 2, topic: 'Array Lists', family: 'Array Lists',
    title: 'Insert at an index', subtitle: 'Watch values shift before the new item is stored.',
    engine: 'pseudocode-adapter', renderer: 'array', teachingVariant: 'indexed-insertion', views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
    source: ['index <- 2', 'value <- 24', 'size <- size + 1', 'FOR i <- size - 2 DOWNTO index DO', '  values[i + 1] <- values[i]', 'values[index] <- value'],
    input: Object.freeze({ kind: 'array-list', min: 3, max: 10, defaultValues: [18, 7, 31, 12], index: 2, value: 24 }),
    metrics: Object.freeze([{ key: 'moves', short: 'Mov', label: 'Moves' }, { key: 'writes', short: 'Wrt', label: 'Writes' }]),
    complexity: Object.freeze({ best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' }),
    blurb: 'An array list keeps values contiguous. Inserting away from the end first shifts every later value one slot to the right.',
    sourceFor(options = {}) {
      const index = Number.isInteger(options.index) ? options.index : this.input.index;
      const value = Number.isFinite(options.value) ? options.value : this.input.value;
      return [`index <- ${index}`, `value <- ${value}`, 'size <- size + 1', 'FOR i <- size - 2 DOWNTO index DO', '  values[i + 1] <- values[i]', 'values[index] <- value'];
    },
    run(options = {}) {
      const values = [...(options.values || this.input.defaultValues)];
      const index = Math.max(0, Math.min(values.length, Number.isInteger(options.index) ? options.index : this.input.index));
      const value = Number.isFinite(options.value) ? options.value : this.input.value;
      const source = this.sourceFor({ index, value });
      const events = [];
      let moves = 0;
      const entities = values.map((itemValue, itemIndex) => ({ id: `item:${itemIndex}`, value: itemValue }));
      const inserted = { id: 'item:insert', value };
      const slots = entities.map((entity) => entity.id);
      let valuePrepared = false;
      const presentation = () => ({ entities: [...entities, inserted], slots: [...slots], held: valuePrepared ? { entityId: inserted.id, location: 'held', from: index } : null, holes: slots.flatMap((id, slotIndex) => id == null ? [`slot:${slotIndex}`] : []) });
      events.push(arrayListEvent(this.id, events.length, 'state', `Set the insertion index to ${index}.`, values, { moves, writes: 0 }, { line: 1, code: source[0] }, { markers: { index, target: index }, presentation: presentation() }));
      valuePrepared = true;
      events.push(arrayListEvent(this.id, events.length, 'prepare', `Place ${value} in the value-to-insert card.`, values, { moves, writes: 0 }, { line: 2, code: source[1] }, { markers: { index, target: index }, presentation: presentation() }));
      values.push(null);
      slots.push(null);
      events.push(arrayListEvent(this.id, events.length, 'resize', `Increase size to ${values.length}, reserving empty index ${values.length - 1}.`, values, { moves, writes: 0 }, { line: 3, code: source[2] }, { markers: { index, target: index }, presentation: presentation() }));
      for (let i = values.length - 2; i >= index; i--) {
        const initialization = i === values.length - 2;
        events.push(arrayListEvent(this.id, events.length, 'loop', `${initialization ? `Initialize i to ${i}` : `Decrement i to ${i}`}. Since ${i} >= ${index}, continue inside the loop.`, values, { moves, writes: moves }, { line: 4, code: source[3] }, { markers: { index, target: index, i, boundary: { start: index, end: i, active: true, label: `shift boundary: index ${index} … i = ${i}` } }, presentation: presentation(), boundary: true }));
        const displacedValue = values[i + 1];
        values[i + 1] = values[i];
        const movingId = slots[i]; slots[i + 1] = movingId; slots[i] = null;
        moves += 1;
        events.push(arrayListEvent(this.id, events.length, 'move', `Shift ${values[i]} from index ${i} to ${i + 1}.`, values, { moves, writes: moves }, { line: 5, code: source[4] }, { highlight: { move: [i, i + 1], held: { value, from: index, hole: i }, transition: { kind: 'shift', from: i, to: i + 1, value: values[i], displacedValue } }, markers: { index, target: index, i, boundary: { start: index, end: i, active: true, label: `shift boundary: index ${index} … i = ${i}` } }, presentation: presentation(), transition: { kind: 'shift', moves: [{ entityId: movingId, from: `slot:${i}`, to: `slot:${i + 1}` }], enter: [], exit: [], wait: true } }));
      }
      const exitI = index - 1;
      events.push(arrayListEvent(this.id, events.length, 'loop-exit', `Decrement i to ${exitI}. Since ${exitI} < ${index}, exit the loop.`, values, { moves, writes: moves }, { line: 4, code: source[3] }, { markers: { index, target: index, i: exitI, boundary: { start: index, end: index, active: false } }, presentation: presentation(), boundary: true }));
      values[index] = value;
      slots[index] = inserted.id;
      const finalPresentation = presentation(); finalPresentation.held = null;
      events.push(arrayListEvent(this.id, events.length, 'insert', `Move ${value} from its card into the empty slot at index ${index}.`, values, { moves, writes: moves + 1 }, { line: 6, code: source[5] }, { highlight: { found: index }, markers: { index, target: index }, presentation: finalPresentation, transition: { kind: 'insert', moves: [{ entityId: inserted.id, from: 'held', to: `slot:${index}` }], enter: [inserted.id], exit: [], wait: true }, terminal: true }));
      return ITCC47Playback.runResult({ events });
    },
  });

  const arrayListRemove = Object.freeze({
    id: 'array-list-remove', contentVersion: CONTENT_VERSION, module: 2, topic: 'Array Lists', family: 'Array Lists',
    title: 'Remove at an index', subtitle: 'See the gap close while logical size decreases.',
    engine: 'pseudocode-adapter', renderer: 'array', teachingVariant: 'indexed-removal', views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
    source: ['index <- 1', 'removed <- values[index]', 'FOR i <- index TO size - 2 DO', '  values[i] <- values[i + 1]', 'size <- size - 1'],
    input: Object.freeze({ kind: 'array-list', min: 3, max: 10, defaultValues: [18, 7, 31, 12], index: 1 }),
    metrics: Object.freeze([{ key: 'moves', short: 'Mov', label: 'Moves' }, { key: 'writes', short: 'Wrt', label: 'Writes' }]),
    complexity: Object.freeze({ best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' }),
    blurb: 'Removing from an array list leaves a gap. Every later value shifts left so the occupied region stays contiguous.',
    sourceFor(options = {}) {
      const index = Number.isInteger(options.index) ? options.index : this.input.index;
      return [`index <- ${index}`, 'removed <- values[index]', 'FOR i <- index TO size - 2 DO', '  values[i] <- values[i + 1]', 'size <- size - 1'];
    },
    run(options = {}) {
      const values = [...(options.values || this.input.defaultValues)];
      const index = Math.max(0, Math.min(values.length - 1, Number.isInteger(options.index) ? options.index : this.input.index));
      const removed = values[index];
      const source = this.sourceFor({ index });
      const events = [];
      let moves = 0;
      const entities = values.map((itemValue, itemIndex) => ({ id: `item:${itemIndex}`, value: itemValue }));
      const slots = entities.map((entity) => entity.id);
      const removedId = slots[index];
      let removedHeld = false;
      const presentation = () => ({ entities, slots: [...slots], held: removedHeld ? { entityId: removedId, location: 'removed', from: index } : null, holes: slots.flatMap((id, slotIndex) => id == null ? [`slot:${slotIndex}`] : []) });
      events.push(arrayListEvent(this.id, events.length, 'state', `Set the removal index to ${index}.`, values, { moves, writes: 0 }, { line: 1, code: source[0] }, { markers: { index, target: index }, presentation: presentation() }));
      events.push(arrayListEvent(this.id, events.length, 'remove', `Copy values[${index}] (${removed}) into removed, then lift it out of the array.`, values, { moves, writes: 0 }, { line: 2, code: source[1] }, { highlight: { compare: [index] }, markers: { index, target: index, variables: { removed } }, presentation: presentation(), transition: { kind: 'remove', moves: [{ entityId: removedId, from: `slot:${index}`, to: 'null' }], enter: [], exit: [removedId], wait: true } }));
      slots[index] = null;
      removedHeld = true;
      for (let i = index; i < values.length - 1; i++) {
        const boundary = { start: i, end: values.length - 2, active: true, label: `shift boundary: i = ${i} … ${values.length - 2}` };
        events.push(arrayListEvent(this.id, events.length, 'loop', `${i === index ? `Initialize i to index (${i})` : `Increment i to ${i}`}. Since ${i} <= ${values.length - 2}, continue inside the loop.`, values, { moves, writes: moves }, { line: 3, code: source[2] }, { markers: { index, target: index, i, boundary, variables: { removed } }, presentation: presentation(), boundary: true }));
        const displacedValue = values[i];
        values[i] = values[i + 1];
        const movingId = slots[i + 1]; slots[i] = movingId; slots[i + 1] = null;
        moves += 1;
        events.push(arrayListEvent(this.id, events.length, 'move', `Copy ${values[i]} from index ${i + 1} into the hole at index ${i}.`, values, { moves, writes: moves }, { line: 4, code: source[3] }, { highlight: { move: [i, i + 1], transition: { kind: 'shift', from: i + 1, to: i, value: values[i], displacedValue } }, markers: { index, target: index, i, boundary, variables: { removed } }, presentation: presentation(), transition: { kind: 'shift', moves: [{ entityId: movingId, from: `slot:${i + 1}`, to: `slot:${i}` }], enter: [], exit: moves === 1 ? [removedId] : [], wait: true } }));
      }
      const exitI = values.length - 1;
      events.push(arrayListEvent(this.id, events.length, 'loop-exit', `Increment i to ${exitI}. Since ${exitI} > ${values.length - 2}, exit the loop.`, values, { moves, writes: moves }, { line: 3, code: source[2] }, { markers: { index, target: index, i: exitI, boundary: { start: index, end: values.length - 2, active: false, label: 'loop complete' }, variables: { removed } }, presentation: presentation(), boundary: true }));
      values.pop();
      slots.pop();
      events.push(arrayListEvent(this.id, events.length, 'complete', `Decrease size to ${values.length}; ${removed} has been removed and no gap remains.`, values, { moves, writes: moves }, { line: 5, code: source[4] }, { highlight: { sorted: values.map((_, i) => i) }, markers: { variables: { removed, size: values.length } }, presentation: presentation(), terminal: true }));
      return ITCC47Playback.runResult({ events, result: { removed } });
    },
  });

  function rangeTeaching(values, phase, state, comparison = null) {
    const annotations = [];
    for (const [id, index, tone] of [['low', state.low, 'primary'], ['mid', state.mid, 'minimum'], ['high', state.high, 'secondary']]) {
      if (Number.isInteger(index) && index >= 0 && index < values.length) annotations.push({ id, label: id, value: index, tone, target: { kind: 'slot', index } });
    }
    return {
      variant: 'duplicate-range', title: phase, annotations, comparison,
      status: [
        { label: 'target', value: state.target, tone: 'primary' },
        ...(Number.isInteger(state.lower) ? [{ label: 'lower', value: state.lower, tone: 'success' }] : []),
        ...(Number.isInteger(state.upper) ? [{ label: 'upper', value: state.upper, tone: 'success' }] : []),
      ],
    };
  }

  const binaryRangeSearch = Object.freeze({
    id: 'binary-range-search', contentVersion: CONTENT_VERSION, module: 2, topic: 'Searching', family: 'Searching',
    title: 'Lower and upper bounds', subtitle: 'Find every duplicate by running two deliberate binary searches.',
    engine: 'curated-array', renderer: 'array', teachingVariant: 'duplicate-range', views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
    source: ['target <- 4', 'low <- 0', 'high <- LENGTH(values)', 'WHILE low < high DO', '  mid <- (low + high) DIV 2', '  IF values[mid] < target THEN', '    low <- mid + 1', '  ELSE', '    high <- mid', '  ENDIF', 'ENDWHILE', 'lower <- low', 'high <- LENGTH(values)', 'WHILE low < high DO', '  mid <- (low + high) DIV 2', '  IF values[mid] <= target THEN', '    low <- mid + 1', '  ELSE', '    high <- mid', '  ENDIF', 'ENDWHILE', 'upper <- low', 'RETURN lower, upper'],
    input: Object.freeze({ kind: 'array', editable: false, min: 7, max: 7, defaultValues: [2, 4, 4, 4, 4, 9, 12], presets: Object.freeze([{ id: 'duplicates', label: 'Duplicate target in the middle' }, { id: 'missing', label: 'Missing target' }]) }),
    metrics: Object.freeze([{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }, { key: 'boundMoves', short: 'Bnd', label: 'Boundary moves' }]),
    complexity: Object.freeze({ best: 'O(log n)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)' }),
    blurb: 'Lower bound finds the first position not less than the target; upper bound finds the first position greater than it.',
    sourceFor(options = {}) { const target = options.preset === 'missing' ? 5 : 4; return this.source.map((line, index) => index === 0 ? `target <- ${target}` : line); },
    run(options = {}) {
      const values = [...this.input.defaultValues]; const target = options.preset === 'missing' ? 5 : 4; const source = this.sourceFor(options);
      const events = []; let comparisons = 0; let boundMoves = 0; let lower = null; let upper = null;
      const push = (type, message, line, state, extra = {}) => {
        const highEnd = Math.min(values.length - 1, (state.high ?? values.length) - 1);
        const boundary = Number.isInteger(state.low) && highEnd >= state.low ? { start: state.low, end: highEnd, active: extra.boundary !== false, label: `${extra.phase || 'search'}: [${state.low}, ${state.high})` } : null;
        const teaching = rangeTeaching(values, extra.title || message, { target, lower, upper, ...state }, extra.comparison || null);
        events.push(ITCC47Playback.timelineEvent({ id: `${this.id}:${events.length}`, domain: 'searching', type, message, frame: arrayFrame(values, extra.highlight || {}, { teaching, variables: { target, lower, upper, ...state }, ...(boundary ? { boundary } : {}) }), metrics: { comparisons, boundMoves }, source: { line, code: source[line - 1] }, boundary: !!boundary, terminal: !!extra.terminal }));
      };
      push('initialize', `Search sorted values for the full range of ${target}.`, 1, { low: 0, high: values.length }, { title: 'Prepare two boundary searches', phase: 'lower bound' });
      let low = 0; let high = values.length;
      push('boundary', 'Lower bound starts with the entire half-open range.', 3, { low, high }, { title: 'Lower bound: first value ≥ target', phase: 'lower bound' });
      while (low < high) {
        const mid = Math.floor((low + high) / 2); push('calculate', `mid = (${low} + ${high}) DIV 2 = ${mid}.`, 5, { low, high, mid }, { title: 'Choose the middle slot', phase: 'lower bound' });
        const outcome = values[mid] < target; comparisons += 1;
        push('comparison', `${values[mid]} < ${target} is ${outcome ? 'true' : 'false'}.`, 6, { low, high, mid }, { title: 'Can the first match be to the right?', phase: 'lower bound', comparison: { text: `values[${mid}] < target`, outcome }, highlight: { compare: [mid] } });
        if (outcome) { low = mid + 1; boundMoves += 1; push('boundary-update', `Discard through index ${mid}; lower bound must be to the right.`, 7, { low, high }, { title: 'Move low right', phase: 'lower bound' }); }
        else { high = mid; boundMoves += 1; push('boundary-update', `Keep index ${mid} as a candidate and move high to ${mid}.`, 9, { low, high }, { title: 'Move high left', phase: 'lower bound' }); }
      }
      lower = low; push('loop-exit', `low equals high at ${low}; lower bound is fixed.`, 11, { low, high }, { title: 'Lower-bound loop exits', phase: 'lower bound', boundary: false });
      push('mutation', `Store lower = ${lower}, then reset high for the upper-bound search.`, 13, { low, high: values.length }, { title: 'Reset only the active range', phase: 'upper bound' });
      high = values.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2); push('calculate', `mid = (${low} + ${high}) DIV 2 = ${mid}.`, 15, { low, high, mid }, { title: 'Choose the middle slot', phase: 'upper bound' });
        const outcome = values[mid] <= target; comparisons += 1;
        push('comparison', `${values[mid]} <= ${target} is ${outcome ? 'true' : 'false'}.`, 16, { low, high, mid }, { title: 'Is this still target-or-smaller?', phase: 'upper bound', comparison: { text: `values[${mid}] <= target`, outcome }, highlight: { compare: [mid] } });
        if (outcome) { low = mid + 1; boundMoves += 1; push('boundary-update', `Index ${mid} cannot be the first greater value; move low to ${low}.`, 17, { low, high }, { title: 'Move low beyond the duplicate', phase: 'upper bound' }); }
        else { high = mid; boundMoves += 1; push('boundary-update', `Value ${values[mid]} is greater; keep index ${mid} as an upper-bound candidate.`, 19, { low, high }, { title: 'Move high left', phase: 'upper bound' }); }
      }
      upper = low; push('loop-exit', `low equals high at ${upper}; upper bound is fixed.`, 21, { low, high }, { title: 'Upper-bound loop exits', phase: 'upper bound', boundary: false });
      push('return', lower === upper ? `Return [${lower}, ${upper}); target ${target} is absent.` : `Return [${lower}, ${upper}); indices ${lower} through ${upper - 1} contain ${target}.`, 23, { low: lower, high: upper }, { title: lower === upper ? 'Empty duplicate range' : 'Complete duplicate range', phase: 'result', boundary: false, highlight: { found: lower === upper ? null : lower, sorted: lower === upper ? [] : Array.from({ length: upper - lower }, (_, index) => lower + index) }, terminal: true });
      return ITCC47Playback.runResult({ events, result: { lower, upper, found: lower < upper } });
    },
  });

  const stableRecordInsertion = Object.freeze({
    id: 'stable-insertion-dispatch', contentVersion: CONTENT_VERSION, module: 2, topic: 'Sorting', family: 'Sorting',
    title: 'Stable priority insertion', subtitle: 'Sort ticket records while equal priorities keep arrival order.',
    engine: 'curated-array', renderer: 'array', teachingVariant: 'stable-record-insertion', views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
    source: ['FOR i <- 1 TO LENGTH(records) - 1 DO', '  key <- records[i]', '  j <- i - 1', '  WHILE j >= 0 AND records[j].priority > key.priority DO', '    records[j + 1] <- records[j]', '    j <- j - 1', '  ENDWHILE', '  records[j + 1] <- key', 'ENDFOR', 'RETURN records'],
    input: Object.freeze({ kind: 'array', editable: false, min: 4, max: 4, defaultValues: ['P2 · A', 'P1 · B', 'P2 · C', 'P1 · D'], presets: Object.freeze([{ id: 'duplicates', label: 'Equal-priority arrivals' }, { id: 'already-sorted', label: 'Already sorted records' }]) }),
    metrics: Object.freeze([{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }, { key: 'moves', short: 'Mov', label: 'Record moves' }]),
    complexity: Object.freeze({ best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }),
    blurb: 'The strict greater-than comparison shifts only larger priorities. Equal-priority records never cross.', sourceFor() { return this.source; },
    run(options = {}) {
      const base = options.preset === 'already-sorted' ? [['B',1],['D',1],['A',2],['C',2]] : [['A',2],['B',1],['C',2],['D',1]];
      const records = base.map(([id, priority]) => ({ id: `ticket:${id}`, label: id, priority }));
      const entities = records.map((record) => ({ id: record.id, value: `P${record.priority} · ${record.label}` }));
      const slots = records.map((record) => record.id); const events = []; let comparisons = 0; let moves = 0; let held = null;
      const display = () => slots.map((entityId) => entityId ? entities.find((entity) => entity.id === entityId).value : null);
      const priorityOf = (entityId) => Number(entities.find((entity) => entity.id === entityId).value.match(/^P(\d+)/)[1]);
      const push = (type, message, line, state = {}, extra = {}) => {
        const boundary = Number.isInteger(state.i) ? { start: 0, end: Math.max(0, state.i - 1), active: !extra.terminal, label: `sorted insertion boundary: 0 … ${Math.max(0, state.i - 1)}` } : null;
        const annotations = [];
        if (Number.isInteger(state.j) && state.j >= 0 && state.j < slots.length) annotations.push({ id: 'j', label: 'j', value: state.j, tone: 'primary', target: { kind: 'slot', index: state.j } });
        if (Number.isInteger(state.hole) && state.hole >= 0 && state.hole < slots.length) annotations.push({ id: 'hole', label: 'open slot', value: state.hole, tone: 'danger', target: { kind: 'slot', index: state.hole } });
        const teaching = { variant: 'stable-record-insertion', title: extra.title || message, annotations, comparison: extra.comparison || null, status: held ? [{ label: 'key', value: entities.find((entity) => entity.id === held).value, tone: 'minimum' }, { label: 'identity', value: held.replace('ticket:',''), tone: 'secondary' }] : [] };
        const frame = arrayFrame(display(), extra.highlight || {}, { teaching, variables: { i: state.i, j: state.j, key: held, comparisons, moves }, ...(boundary ? { boundary } : {}) }, { entities, slots: [...slots], held: held ? { entityId: held, location: 'held', from: state.i } : null, holes: slots.flatMap((id,index)=>id ? [] : [`slot:${index}`]) });
        events.push(ITCC47Playback.timelineEvent({ id: `${this.id}:${events.length}`, domain: 'sorting', type, message, frame, transition: extra.transition || null, metrics: { comparisons, moves }, source: { line, code: this.source[line - 1] }, boundary: !!boundary, terminal: !!extra.terminal }));
      };
      push('initialize', 'Each record has a stable ticket identity separate from its priority.', 1, { i: 1 }, { title: 'Identity travels with the record' });
      for (let i = 1; i < slots.length; i++) {
        held = slots[i]; slots[i] = null; let j = i - 1;
        push('prepare', `Lift ${entities.find((entity)=>entity.id===held).value} out as key; index ${i} becomes the open slot.`, 2, { i, j, hole: i }, { title: 'Hold the complete record', transition: { kind: 'remove', moves: [{ entityId: held, from: `slot:${i}`, to: 'held' }], enter: [], exit: [], wait: true } });
        push('initialize', `Initialize j to ${j}, immediately left of the open slot.`, 3, { i, j, hole: j + 1 }, { title: 'Start at the sorted prefix edge' });
        while (j >= 0) {
          const leftPriority = priorityOf(slots[j]); const keyPriority = priorityOf(held); const outcome = leftPriority > keyPriority; comparisons += 1;
          push('comparison', `P${leftPriority} > P${keyPriority} is ${outcome ? 'true' : 'false'}.`, 4, { i, j, hole: j + 1 }, { title: outcome ? 'Larger priority shifts right' : leftPriority === keyPriority ? 'Equal priority does not cross' : 'Insertion gap found', comparison: { text: `records[${j}].priority > key.priority`, outcome }, highlight: { compare: [j] } });
          if (!outcome) break;
          const moving = slots[j]; slots[j + 1] = moving; slots[j] = null; moves += 1;
          push('mutation', `Move ${entities.find((entity)=>entity.id===moving).value} from ${j} to ${j + 1}; the hole moves left.`, 5, { i, j, hole: j }, { title: 'Shift the whole record', highlight: { move: [j, j + 1], transition: { kind: 'shift', from: j, to: j + 1, value: entities.find((entity)=>entity.id===moving).value } }, transition: { kind: 'shift', moves: [{ entityId: moving, from: `slot:${j}`, to: `slot:${j + 1}` }], enter: [], exit: [], wait: true } });
          j -= 1; push('update', `Decrement j to ${j}.`, 6, { i, j, hole: j + 1 }, { title: j < 0 ? 'Reached the head boundary' : 'Continue left' });
        }
        if (j < 0) push('loop-exit', 'j is -1, so the WHILE condition is false and the loop exits.', 4, { i, j, hole: 0 }, { title: 'Loop exits at the head' });
        const destination = j + 1; slots[destination] = held; const inserted = held; held = null; moves += 1;
        push('mutation', `Place ${entities.find((entity)=>entity.id===inserted).value} into index ${destination}.`, 8, { i, j }, { title: 'Fill the open slot', highlight: { found: destination }, transition: { kind: 'insert', moves: [{ entityId: inserted, from: 'held', to: `slot:${destination}` }], enter: [], exit: [], wait: true } });
      }
      push('return', `Return ${display().join(', ')}. A remains before C and B remains before D within equal priorities.`, 10, { i: slots.length }, { title: 'Stable order preserved', highlight: { sorted: slots.map((_,index)=>index) }, terminal: true });
      return ITCC47Playback.runResult({ events, result: { identities: slots.map((id)=>id.replace('ticket:','')) } });
    },
  });

  function linkedFrame(event, highlightedEdge = null) {
    const heap = event.frame.heap || [];
    const byNodeId = new Map(heap.map((node) => [node.id, node]));
    const ordered = [];
    const seen = new Set();
    let currentId = event.frame.pointers?.head || event.frame.pointers?.result || null;
    let cycleFree = true;
    while (currentId && byNodeId.has(currentId) && !seen.has(currentId)) {
      seen.add(currentId); ordered.push(byNodeId.get(currentId)); currentId = byNodeId.get(currentId).next;
    }
    if (currentId && seen.has(currentId)) cycleFree = false;
    heap.forEach((node) => { if (!seen.has(node.id)) ordered.push(node); });
    const nodes = ordered.map((node) => Object.freeze({
      id: node.id, value: node.value, next: node.next, allocatedAt: node.allocatedAt,
    }));
    const reachable = ordered.slice(0, seen.size);
    const sorted = reachable.every((node, index) => index === 0 || Number(reachable[index - 1].value) <= Number(node.value));
    return {
      kind: 'linked-list', nodes, links: nodes.filter((node) => node.next).map((node) => Object.freeze({ id: `edge:${node.id}->${node.next}`, from: node.id, to: node.next })),
      pointers: Object.freeze({ ...(event.frame.pointers || {}) }),
      detached: Object.freeze(heap.filter((node) => !seen.has(node.id)).map((node) => node.id)),
      detachedNodes: Object.freeze(heap.filter((node) => !seen.has(node.id)).map((node) => node.id)),
      highlightedEdges: Object.freeze(highlightedEdge ? [highlightedEdge] : []),
      invariants: Object.freeze({ reachable: seen.size, cycleFree, sorted }),
      vars: event.frame.vars, globals: event.frame.globals, outputValue: event.frame.outputValue,
      callStack: event.frame.callStack, activeFrameId: event.frame.activeFrameId,
    };
  }

  function linkedTeaching(spec, event, frame, visitedIds) {
    const pointers = frame.pointers || {};
    const code = event.source?.code || '';
    const annotations = Object.entries(pointers).flatMap(([name, nodeId]) => nodeId
      ? [{ id: name, label: name, value: `&${nodeId}`, tone: name === 'current' ? 'primary' : name === 'newNode' ? 'minimum' : 'secondary', target: { kind: 'pointer', id: name } }]
      : []);
    let comparison = null;
    if (/^(?:\s*)(?:WHILE|IF)\b/i.test(code)) {
      comparison = {
        text: code.trim().replace(/^(?:WHILE|IF)\s+/i, '').replace(/\s+(?:DO|THEN)$/i, ''),
        outcome: /false/i.test(event.message || '') ? false : true,
      };
    }
    const pointerWrite = /(?:\.next|^\s*head)\s*<-/i.test(code) && !/NEW NODE/i.test(code);
    const titleByVariant = {
      'pointer-traversal': 'Traversal pointer', 'head-insertion': 'Head pointer update',
      'linked-sorted-insert': 'Sorted insertion pointers', 'linked-find-update': 'Relocation pointers',
      'linked-delete': 'Deletion and detachment',
    };
    if (!annotations.length && !comparison && !pointerWrite) return null;
    return {
      variant: spec.teachingVariant,
      title: pointerWrite ? `Pointer write: ${code.trim()}` : titleByVariant[spec.teachingVariant] || spec.title,
      annotations, comparison, status: [],
      visited: [...visitedIds], invariants: frame.invariants,
    };
  }

  function linkedActivity(spec) {
    return Object.freeze({
      ...spec, contentVersion: CONTENT_VERSION, module: 3, topic: 'Linked Lists', family: 'Linked Lists',
      engine: 'pseudocode-runtime', renderer: 'linked-list', views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
      input: Object.freeze({ kind: 'linked-list', editable: false, defaultValues: spec.defaultValues, presets: Object.freeze((spec.presets || [{ id: 'default', label: 'Default case', source: spec.source }]).map(({ id, label }) => Object.freeze({ id, label }))) }),
      metrics: Object.freeze([{ key: 'nodeVisits', short: 'Visit', label: 'Node visits' }, { key: 'pointerWrites', short: 'Ptr', label: 'Pointer writes' }]),
      complexity: Object.freeze(spec.complexity),
      sourceFor(options = {}) {
        const preset = (spec.presets || []).find((item) => item.id === options.preset);
        return Object.freeze([...(preset?.source || spec.source)]);
      },
      run(options = {}) {
        const activeSource = this.sourceFor(options);
        const collected = collectSteps(parsePseudocode(activeSource.join('\n')), []);
        let nodeVisits = 0; let pointerWrites = 0;
        const visitedIds = new Set();
        let previousFrame = null;
        const events = collected.events.map((event, index) => {
          const code = event.source.code || '';
          if ((event.boundary || /WRITE\s+\w+\.value/i.test(code)) && event.frame.pointers?.current) {
            visitedIds.add(event.frame.pointers.current); nodeVisits = visitedIds.size;
          }
          if (/(?:\.next|^\s*head)\s*<-/i.test(code) && !/NEW NODE/i.test(code)) pointerWrites += 1;
          const edgeMatch = code.match(/^(\w+)\.next\s*<-\s*(\w+)/i);
          const pointers = event.frame.pointers || {};
          const edge = edgeMatch && pointers[edgeMatch[1]] && pointers[edgeMatch[2]]
            ? { from: pointers[edgeMatch[1]], to: pointers[edgeMatch[2]] } : null;
          const frame = linkedFrame(event, edge);
          const previousNodes = new Set((previousFrame?.nodes || []).map((node) => node.id));
          const nextNodes = new Set(frame.nodes.map((node) => node.id));
          const enteredNodes = frame.nodes.filter((node) => !previousNodes.has(node.id)).map((node) => node.id);
          const exitedNodes = (previousFrame?.nodes || []).filter((node) => !nextNodes.has(node.id)).map((node) => node.id);
          const pointerMoves = Object.keys({ ...(previousFrame?.pointers || {}), ...frame.pointers }).flatMap((name) => {
            const from = previousFrame?.pointers?.[name] || null;
            const to = frame.pointers[name] || null;
            return from === to ? [] : [{ entityId: `pointer:${name}`, from: from ? `node:${from}` : 'null', to: to ? `node:${to}` : 'null' }];
          });
          const previousEdges = new Set((previousFrame?.links || []).map((link) => link.id));
          const nextEdges = new Set(frame.links.map((link) => link.id));
          const enteredEdges = frame.links.filter((link) => !previousEdges.has(link.id)).map((link) => link.id);
          const exitedEdges = (previousFrame?.links || []).filter((link) => !nextEdges.has(link.id)).map((link) => link.id);
          frame.edgeTransitions = Object.freeze({ added: enteredEdges, removed: exitedEdges });
          frame.pointerWrite = /(?:\.next|^\s*head)\s*<-/i.test(code) && !/NEW NODE/i.test(code)
            ? Object.freeze({ code: code.trim(), stage: pointerWrites }) : null;
          frame.highlightedEdges = Object.freeze(frame.links.filter((link) => enteredEdges.includes(link.id)).map((link) => ({ from: link.from, to: link.to, tone: 'new' })));
          const teaching = linkedTeaching(spec, event, frame, visitedIds);
          frame.markers = teaching ? { teaching } : {};
          let transition = null;
          if (enteredNodes.length || exitedNodes.length) transition = { kind: enteredNodes.length ? 'insert' : 'remove', moves: [], enter: enteredNodes, exit: exitedNodes, wait: true };
          else if (pointerMoves.length) transition = { kind: 'pointer', moves: pointerMoves, enter: [], exit: [], wait: true };
          else if (enteredEdges.length || exitedEdges.length) transition = { kind: 'edge', moves: [], enter: enteredEdges, exit: exitedEdges, wait: true };
          else if (/WRITE\s+\w+\.value/i.test(code)) transition = { kind: 'emphasis', moves: [], enter: [], exit: [], wait: false };
          previousFrame = frame;
          const terminal = index === collected.events.length - 1;
          const isCondition = event.type === 'condition';
          const semanticType = terminal ? 'return'
            : index === 0 ? 'initialize'
              : isCondition && /^\s*WHILE\b/i.test(code) && /false/i.test(event.message || '') ? 'loop-exit'
                : isCondition ? 'comparison'
                  : /(?:\.next|\.value|^\s*head)\s*<-/i.test(code) || /NEW NODE/i.test(code) ? 'mutation'
                    : event.type;
          return ITCC47Playback.timelineEvent({
            id: `${spec.id}:${index}`, domain: 'linked-list', type: semanticType, message: terminal && /^CALL\s+/i.test(code) ? `Return the reachable chain; detached nodes remain visibly separate.` : event.message,
            frame, transition, metrics: { nodeVisits, pointerWrites }, source: event.source,
            boundary: event.boundary, terminal,
          });
        });
        return ITCC47Playback.runResult({ events, diagnostics: collected.diagnostics, outcome: collected.outcome, result: collected.result });
      },
    });
  }

  const traversalPresets = Object.freeze([
    {
      id: 'default', label: 'Three nodes',
      source: ['head <- NEW NODE(18)', 'head.next <- NEW NODE(7)', 'head.next.next <- NEW NODE(31)', 'current <- head', 'WHILE current <> NULL DO', '  WRITE current.value', '  current <- current.next', 'ENDWHILE'],
    },
    {
      id: 'singleton', label: 'Single node',
      source: ['head <- NEW NODE(7)', 'current <- head', 'WHILE current <> NULL DO', '  WRITE current.value', '  current <- current.next', 'ENDWHILE'],
    },
    {
      id: 'empty', label: 'Empty list',
      source: ['head <- NULL', 'current <- head', 'WHILE current <> NULL DO', '  WRITE current.value', '  current <- current.next', 'ENDWHILE'],
    },
  ]);

  const linkedTraversal = linkedActivity({
    id: 'linked-list-traversal', title: 'Traverse a singly linked list', subtitle: 'Follow next references until the current pointer reaches NULL.',
    teachingVariant: 'pointer-traversal',
    defaultValues: [18, 7, 31], complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    blurb: 'Traversal visits each reachable node once and stops at the NULL link.',
    presets: traversalPresets, source: traversalPresets[0].source,
  });

  const linkedInsertHead = linkedActivity({
    id: 'linked-list-insert-head', title: 'Insert at the head', subtitle: 'Allocate one node, connect it to the old head, then move head.',
    teachingVariant: 'head-insertion',
    defaultValues: [18, 7], complexity: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(1)' },
    blurb: 'Head insertion changes two references regardless of list length.',
    source: ['head <- NEW NODE(18)', 'head.next <- NEW NODE(7)', 'newNode <- NEW NODE(24)', 'newNode.next <- head', 'head <- newNode'],
  });

  function linkedChainSource(values) {
    if (!values.length) return ['head <- NULL'];
    const source = [`head <- NEW NODE(${values[0]})`, 'tail <- head'];
    values.slice(1).forEach((value) => source.push(`tail.next <- NEW NODE(${value})`, 'tail <- tail.next'));
    return source;
  }

  function linkedFunctionSource(name, body) {
    return [`FUNCTION ${name}()`, ...body.map((line) => `  ${line}`), 'ENDFUNCTION', `CALL ${name}() INTO result`];
  }

  function sortedInsertSource(values, insertValue) {
    return linkedFunctionSource('INSERT_SORTED', [...linkedChainSource(values), `insertValue <- ${insertValue}`, 'previous <- NULL', 'current <- head', 'WHILE current <> NULL AND current.value < insertValue DO', '  previous <- current', '  current <- current.next', 'ENDWHILE', 'newNode <- NEW NODE(insertValue)', 'newNode.next <- current', 'IF previous = NULL THEN', '  head <- newNode', 'ELSE', '  previous.next <- newNode', 'ENDIF', 'RETURN head']);
  }

  const sortedInsertPresets = Object.freeze([
    { id: 'middle', label: 'Insert in the middle', source: sortedInsertSource([10, 20, 40], 30) },
    { id: 'head', label: 'Insert before head', source: sortedInsertSource([10, 20], 5) },
    { id: 'tail', label: 'Insert after tail', source: sortedInsertSource([10, 20], 30) },
    { id: 'singleton', label: 'Insert into singleton', source: sortedInsertSource([20], 10) },
  ]);
  const linkedSortedInsert = linkedActivity({
    id: 'linked-list-sorted-insert', title: 'Sorted linked insertion', subtitle: 'Find the gap, allocate a stable node, then write links in a safe order.',
    teachingVariant: 'linked-sorted-insert', defaultValues: [10,20,40], presets: sortedInsertPresets, source: sortedInsertPresets[0].source,
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    blurb: 'newNode.next is written before the predecessor changes, so the existing suffix never becomes unreachable.',
  });

  function relocationSource(values, target, replacement) {
    return linkedFunctionSource('UPDATE_AND_RELOCATE', [...linkedChainSource(values), `targetValue <- ${target}`, `newValue <- ${replacement}`, 'previous <- NULL', 'current <- head', 'WHILE current <> NULL AND current.value <> targetValue DO', '  previous <- current', '  current <- current.next', 'ENDWHILE', 'IF current = NULL THEN', '  RETURN head', 'ENDIF', 'current.value <- newValue', 'IF previous = NULL THEN', '  head <- current.next', 'ELSE', '  previous.next <- current.next', 'ENDIF', 'current.next <- NULL', 'previous <- NULL', 'scan <- head', 'WHILE scan <> NULL AND scan.value < current.value DO', '  previous <- scan', '  scan <- scan.next', 'ENDWHILE', 'current.next <- scan', 'IF previous = NULL THEN', '  head <- current', 'ELSE', '  previous.next <- current', 'ENDIF', 'RETURN head']);
  }

  const relocationPresets = Object.freeze([
    { id: 'relocation', label: 'Update then relocate middle', source: relocationSource([10,20,30,40], 20, 35) },
    { id: 'head', label: 'Relocate old head', source: relocationSource([10,20,30], 10, 25) },
    { id: 'tail', label: 'Relocate old tail', source: relocationSource([10,20,30], 30, 5) },
    { id: 'singleton', label: 'Update singleton', source: relocationSource([10], 10, 12) },
    { id: 'missing', label: 'Missing target', source: relocationSource([10,20,30], 99, 25) },
  ]);
  const linkedFindUpdate = linkedActivity({
    id: 'linked-list-find-update', title: 'Find, update, and relocate', subtitle: 'Keep node identity while a changed key moves to its sorted position.',
    teachingVariant: 'linked-find-update', defaultValues: [10,20,30,40], presets: relocationPresets, source: relocationPresets[0].source,
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    blurb: 'Changing a sorted key may break order. Detach the same node identity, then reinsert it without allocating a replacement.',
  });

  function deleteSource(values, target) {
    return linkedFunctionSource('DELETE_FIRST', [...linkedChainSource(values), `targetValue <- ${target}`, 'previous <- NULL', 'current <- head', 'WHILE current <> NULL AND current.value <> targetValue DO', '  previous <- current', '  current <- current.next', 'ENDWHILE', 'IF current = NULL THEN', '  RETURN head', 'ENDIF', 'IF previous = NULL THEN', '  head <- current.next', 'ELSE', '  previous.next <- current.next', 'ENDIF', 'current.next <- NULL', 'RETURN head']);
  }
  const deletePresets = Object.freeze([
    { id: 'middle', label: 'Delete middle node', source: deleteSource([10,20,30], 20) },
    { id: 'head', label: 'Delete head', source: deleteSource([10,20,30], 10) },
    { id: 'tail', label: 'Delete tail', source: deleteSource([10,20,30], 30) },
    { id: 'singleton', label: 'Delete singleton', source: deleteSource([10], 10) },
    { id: 'missing', label: 'Missing target', source: deleteSource([10,20,30], 99) },
  ]);
  const linkedDelete = linkedActivity({
    id: 'linked-list-delete', title: 'Delete and detach a node', subtitle: 'Reconnect around the target, then clear its next link.',
    teachingVariant: 'linked-delete', defaultValues: [10,20,30], presets: deletePresets, source: deletePresets[0].source,
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    blurb: 'The predecessor bypasses the target before target.next is cleared. Missing targets return without a pointer write.',
  });

  const arrayLinkedComparison = Object.freeze({
    id: 'array-linked-comparison', contentVersion: CONTENT_VERSION, module: 3, topic: 'Linked Lists', family: 'Linked Lists',
    title: 'Array versus linked storage', subtitle: 'Contrast contiguous positions with stable node identities and explicit links.',
    engine: 'curated-linked', renderer: 'linked-list', teachingVariant: 'representation-comparison',
    source: ['values <- [10, 20, 30]', 'head <- NEW NODE(10)', 'head.next <- NEW NODE(20)', 'head.next.next <- NEW NODE(30)', 'COMPARE insertion at position 1', 'RETURN representation costs'],
    input: Object.freeze({ kind: 'linked-list', editable: false, defaultValues: [10,20,30] }),
    metrics: Object.freeze([{ key: 'slotMoves', short: 'Mov', label: 'Array slot moves' }, { key: 'pointerWrites', short: 'Ptr', label: 'Pointer writes' }]),
    complexity: Object.freeze({ best: 'Array access O(1)', avg: 'Traversal O(n)', worst: 'Insertion O(n)', space: 'O(n)' }),
    blurb: 'Array positions are implicit and contiguous. Linked order exists only through next references between stable node identities.', sourceFor() { return this.source; },
    run() {
      const nodes = [{id:'node:A',value:10,next:'node:B'},{id:'node:B',value:20,next:'node:C'},{id:'node:C',value:30,next:null}];
      const states = [
        { type:'initialize', line:1, title:'Array positions are contiguous', message:'Index 1 means the second physical slot; its neighbor is computed from position.', arrayActive:1, nodeActive:null, slotMoves:0, pointerWrites:0 },
        { type:'initialize', line:2, title:'Linked nodes keep identity', message:'node:A, node:B, and node:C remain themselves even when links change.', arrayActive:null, nodeActive:'node:A', slotMoves:0, pointerWrites:0 },
        { type:'pointer-write', line:4, title:'Order comes from next', message:'node:B is after node:A because node:A.next stores node:B—not because their cards are adjacent.', arrayActive:null, nodeActive:'node:B', slotMoves:0, pointerWrites:2 },
        { type:'comparison', line:5, title:'Middle insertion costs differ', message:'An array shifts later records; a linked list searches, then changes two links.', arrayActive:1, nodeActive:'node:B', slotMoves:2, pointerWrites:2 },
        { type:'return', line:6, title:'Choose by the operations you need', message:'Use contiguous indexing for direct access; use explicit links when stable identity and local reconnection matter.', arrayActive:null, nodeActive:null, slotMoves:2, pointerWrites:2, terminal:true },
      ];
      const events = states.map((state,index) => {
        const frame = { kind:'linked-list', nodes, links:nodes.filter((node)=>node.next).map((node)=>({id:`edge:${node.id}->${node.next}`,from:node.id,to:node.next})), pointers:state.nodeActive?{current:state.nodeActive}:{}, detached:[], detachedNodes:[], highlightedEdges:state.nodeActive&&nodes.find((node)=>node.id===state.nodeActive)?.next?[{from:state.nodeActive,to:nodes.find((node)=>node.id===state.nodeActive).next}]:[], invariants:{reachable:3,cycleFree:true,sorted:true}, arraySlots:[10,20,30], arrayActive:state.arrayActive, markers:{teaching:{variant:'representation-comparison',title:state.title,annotations:state.nodeActive?[{id:'current',label:'stable node identity',value:state.nodeActive,tone:'primary',target:{kind:'pointer',id:'current'}}]:[],comparison:index===3?{text:'insert at logical position 1',outcome:true}:null,status:[{label:'array',value:state.slotMoves?`${state.slotMoves} shifts`:'direct index',tone:'secondary'},{label:'linked',value:state.pointerWrites?`${state.pointerWrites} link writes`:'follow next',tone:'primary'}],visited:[],invariants:{reachable:3,cycleFree:true,sorted:true}}} };
        return ITCC47Playback.timelineEvent({ id:`${this.id}:${index}`,domain:'linked-list',type:state.type,message:state.message,frame,metrics:{slotMoves:state.slotMoves,pointerWrites:state.pointerWrites},source:{line:state.line,code:this.source[state.line-1]},terminal:!!state.terminal });
      });
      return ITCC47Playback.runResult({ events });
    },
  });

  function conceptActivity(spec) {
    const values = Object.freeze(spec.values || ['start', 'inspect', 'update', 'finish']);
    const source = Object.freeze(spec.source || ['INITIALIZE state', 'INSPECT active item', 'UPDATE structure', 'RETURN result']);
    return Object.freeze({
      id: spec.id, contentVersion: CONTENT_VERSION, module: spec.module, topic: spec.topic, family: spec.family,
      title: spec.title, subtitle: spec.subtitle, engine: 'curated-concept', renderer: 'concept', teachingVariant: spec.variant,
      source, views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
      input: Object.freeze({ kind: 'array', editable: false, min: values.length, max: values.length, defaultValues: values }),
      metrics: Object.freeze([{ key: 'steps', short: 'Step', label: 'Steps' }]),
      complexity: Object.freeze(spec.complexity || { best: 'varies', avg: 'varies', worst: 'varies', space: 'varies' }),
      blurb: spec.blurb || spec.subtitle, sourceFor() { return source; },
      run() {
        const events = source.map((code, index) => {
          const active = Math.min(index, values.length - 1);
          const annotation = { id: `active:${active}`, label: spec.labels?.[index] || 'active', value: values[active], tone: index === source.length - 1 ? 'minimum' : 'primary', target: { kind: 'slot', index: active } };
          const teaching = { variant: spec.variant, title: spec.steps?.[index] || spec.title, annotations: [annotation], comparison: index === 1 ? { text: spec.comparison || 'inspect current state', outcome: 'true' } : null, status: spec.status?.[index] ? [spec.status[index]] : [] };
          return ITCC47Playback.timelineEvent({ id: `${spec.id}:${index}`, domain: spec.family.toLowerCase().replace(/\W+/g, '-'), type: index === 0 ? 'initialize' : index === source.length - 1 ? 'return' : index === 2 ? 'mutation' : 'comparison', message: spec.steps?.[index] || code, frame: arrayFrame(values, { compare: [active], found: index === source.length - 1 ? active : null }, { teaching, phase: index }), metrics: { steps: index + 1 }, source: { line: index + 1, code }, boundary: index === 1, terminal: index === source.length - 1 });
        });
        return ITCC47Playback.runResult({ events });
      },
    });
  }

  const extendedActivities = [
    { id:'recursive-range-search',module:5,topic:'Recursion',family:'Recursion',title:'Recursive duplicate-range search',subtitle:'Trace shrinking bounds, calls, base cases, and returns.',variant:'recursive-bounds',values:['call 0','call 1','base','return'],comparison:'low > high',steps:['Push the initial bounds.','Recurse into one smaller half.','Stop at the base case.','Return the saved bound through each frame.'] },
    { id:'stable-merge-sort',module:5,topic:'Divide and Conquer',family:'Recursion',title:'Stable merge sort',subtitle:'Split ranges, merge buffers, and preserve ties.',variant:'merge-call-tree',values:['split','left','right','merge'],comparison:'left.key <= right.key',steps:['Split the active range.','Resolve the left call.','Resolve the right call.','Merge with left-first tie handling.'] },
    { id:'tree-traversals',module:6,topic:'Trees',family:'Trees',title:'Tree traversal orders',subtitle:'Compare preorder, inorder, postorder, and level order.',variant:'tree-traversal',values:['root','left','right','order'],steps:['Identify root and children.','Trace the left subtree.','Trace the right subtree.','Record the selected traversal order.'] },
    { id:'bst-insert-search',module:6,topic:'BST',family:'Trees',title:'BST insertion and search',subtitle:'Follow comparison paths while preserving ordering.',variant:'bst-path',values:['root','compare','child','result'],comparison:'target < node.key',steps:['Begin at the root.','Choose left or right.','Follow or create the child link.','Return the found or inserted node.'] },
    { id:'bst-height-shape',module:6,topic:'BST',family:'Trees',title:'Balanced versus skewed height',subtitle:'Connect tree shape to path length and cost.',variant:'tree-height',values:['balanced','height 2','skewed','height 4'],steps:['Inspect a balanced shape.','Measure its longest path.','Inspect a skewed shape.','Compare resulting search cost.'] },
    { id:'graph-representation',module:7,topic:'Graphs',family:'Graphs',title:'Adjacency list versus matrix',subtitle:'Choose a representation based on graph density and operations.',variant:'graph-representation',values:['vertex','neighbors','matrix row','choice'],steps:['Identify a vertex.','Read its adjacency list.','Read its matrix row.','Justify the representation choice.'] },
    { id:'bfs-shortest-path',module:7,topic:'BFS',family:'Graphs',title:'BFS shortest path',subtitle:'Track frontier, visited nodes, and predecessors.',variant:'bfs-frontier',values:['source','queue','visited','path'],steps:['Visit the source.','Expand the queue frontier.','Record each predecessor once.','Reconstruct the shortest unweighted path.'] },
    { id:'dfs-reachability',module:7,topic:'DFS',family:'Graphs',title:'DFS reachability and components',subtitle:'Follow one path deeply, then resume alternatives.',variant:'dfs-components',values:['source','path','backtrack','component'],steps:['Begin one component.','Follow an unvisited neighbor.','Backtrack when no edge remains.','Mark the completed component.'] },
    { id:'greedy-dp-coin-change',module:8,topic:'Greedy and DP',family:'Dynamic Programming',title:'Coin change: greedy versus DP',subtitle:'Expose a greedy counterexample and reconstruct the optimal choice.',variant:'coin-dp',values:['4+1+1','3+3','dp[6]','2 coins'],steps:['Run the greedy largest-coin choice.','Show the counterexample optimum.','Build the DP state for amount 6.','Reconstruct two 3-value coins.'] },
    { id:'knapsack-dp',module:8,topic:'Dynamic Programming',family:'Dynamic Programming',title:'0/1 knapsack table',subtitle:'Compare greedy choices, fill states, and reconstruct items.',variant:'knapsack-table',values:['item','capacity','best value','items'],steps:['Apply deterministic item tie rules.','Compare include and exclude states.','Store the best table value.','Reconstruct the chosen item identities.'] },
  ].map(conceptActivity);

  const activities = Object.freeze([
    algorithmActivity('bubble-sort', 'bubble', 'Bubble Sort', 'Sorting', 'Compare adjacent values one step at a time.'),
    algorithmActivity('selection-sort', 'selection', 'Selection Sort', 'Sorting', 'Find the next minimum and place it.'),
    algorithmActivity('insertion-sort', 'insertion', 'Insertion Sort', 'Sorting', 'Grow a sorted region from the left.'),
    algorithmActivity('linear-search', 'linear', 'Linear Search', 'Searching', 'Check values in order until the target appears.'),
    algorithmActivity('binary-search', 'binary', 'Binary Search', 'Searching', 'Repeatedly discard half of a sorted range.'),
    binaryRangeSearch,
    stableRecordInsertion,
    arrayListInsert,
    arrayListRemove,
    linkedTraversal,
    linkedInsertHead,
    arrayLinkedComparison,
    linkedSortedInsert,
    linkedFindUpdate,
    linkedDelete,
    ...extendedActivities,
  ].map(withCurriculum));
  const byId = new Map(activities.map((activity) => [activity.id, activity]));

  function get(id) { return byId.get(id) || byId.get('bubble-sort'); }
  function list() { return Object.freeze([...byId.values()]); }
  function register(activity) {
    if (!activity || !activity.id || byId.has(activity.id)) return false;
    byId.set(activity.id, Object.freeze(activity));
    return true;
  }

  return Object.freeze({ SCHEMA_VERSION, CONTENT_VERSION, get, list, register });
})();

if (typeof BSITLearningLab !== 'undefined') BSITLearningLab.registerActivities('itcc47', ITCC47Activities);
