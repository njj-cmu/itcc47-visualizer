/* Versioned syllabus activity catalog shared by the static shell and React workspace. */
const ITCC47Activities = (() => {
  const SCHEMA_VERSION = 1;
  const CONTENT_VERSION = '2026.08';

  const algorithmSources = {
    bubble: ['FOR each pass', '  compare adjacent values', '  swap when left > right', 'ENDFOR'],
    selection: ['FOR each open position', '  find the smallest remaining value', '  swap it into the open position', 'ENDFOR'],
    insertion: ['FOR each value after index 0', '  shift larger values right', '  insert the value in its position', 'ENDFOR'],
    linear: ['FOR each value from the start', '  IF value = target THEN RETURN index', 'ENDFOR', 'RETURN not found'],
    binary: ['WHILE low <= high', '  mid <- (low + high) / 2', '  discard the impossible half', 'ENDWHILE'],
  };

  function algorithmActivity(id, key, title, family, subtitle) {
    return Object.freeze({
      id, contentVersion: CONTENT_VERSION, module: 2, topic: 'Arrays', family,
      title, subtitle, engine: 'curated-array', renderer: 'array',
      source: algorithmSources[key], views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
      input: Object.freeze({ kind: 'array', min: 4, max: 18, defaultValues: [42, 17, 8, 63, 29, 4, 51, 35, 12, 76], needsTarget: !!ALGORITHMS[key].needsTarget }),
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

  function arrayFrame(values, highlight = {}, markers = {}) {
    return {
      kind: 'array', array: [...values],
      items: values.map((value, index) => Object.freeze({ id: `slot:${index}`, value, index })),
      highlight, markers: Object.freeze({ ...markers }),
    };
  }

  function arrayListEvent(activityId, index, type, message, values, metrics, source, options = {}) {
    return ITCC47Playback.timelineEvent({
      id: `${activityId}:${index}`, domain: 'array-list', type, message,
      frame: arrayFrame(values, options.highlight, options.markers), metrics,
      source, boundary: !!options.boundary, terminal: !!options.terminal,
    });
  }

  const arrayListInsert = Object.freeze({
    id: 'array-list-insert', contentVersion: CONTENT_VERSION, module: 3, topic: 'Array Lists', family: 'Array Lists',
    title: 'Insert at an index', subtitle: 'Watch values shift before the new item is stored.',
    engine: 'pseudocode-adapter', renderer: 'array', views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
    source: ['index <- 2', 'value <- 24', 'FOR i <- size - 1 DOWNTO index DO', '  values[i + 1] <- values[i]', 'values[index] <- value'],
    input: Object.freeze({ kind: 'array-list', min: 3, max: 10, defaultValues: [18, 7, 31, 12], index: 2, value: 24 }),
    metrics: Object.freeze([{ key: 'moves', short: 'Mov', label: 'Moves' }, { key: 'writes', short: 'Wrt', label: 'Writes' }]),
    complexity: Object.freeze({ best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' }),
    blurb: 'An array list keeps values contiguous. Inserting away from the end first shifts every later value one slot to the right.',
    run(options = {}) {
      const values = [...(options.values || this.input.defaultValues)];
      const index = Math.max(0, Math.min(values.length, Number.isInteger(options.index) ? options.index : this.input.index));
      const value = Number.isFinite(options.value) ? options.value : this.input.value;
      const events = [];
      let moves = 0;
      events.push(arrayListEvent(this.id, events.length, 'state', `Insert ${value} at index ${index}.`, values, { moves, writes: 0 }, { line: 1, code: this.source[0] }, { markers: { index } }));
      values.push(null);
      for (let i = values.length - 2; i >= index; i--) {
        values[i + 1] = values[i];
        moves += 1;
        events.push(arrayListEvent(this.id, events.length, 'move', `Shift ${values[i]} from index ${i} to ${i + 1}.`, values, { moves, writes: moves }, { line: 4, code: this.source[3] }, { highlight: { move: [i, i + 1] }, markers: { index } }));
      }
      values[index] = value;
      events.push(arrayListEvent(this.id, events.length, 'insert', `Store ${value} at index ${index}.`, values, { moves, writes: moves + 1 }, { line: 5, code: this.source[4] }, { highlight: { found: index }, markers: { index }, terminal: true }));
      return ITCC47Playback.runResult({ events });
    },
  });

  const arrayListRemove = Object.freeze({
    id: 'array-list-remove', contentVersion: CONTENT_VERSION, module: 3, topic: 'Array Lists', family: 'Array Lists',
    title: 'Remove at an index', subtitle: 'See the gap close while logical size decreases.',
    engine: 'pseudocode-adapter', renderer: 'array', views: ['visualize', 'code', 'trace', 'variables', 'operations', 'output'],
    source: ['index <- 1', 'removed <- values[index]', 'FOR i <- index TO size - 2 DO', '  values[i] <- values[i + 1]', 'size <- size - 1'],
    input: Object.freeze({ kind: 'array-list', min: 3, max: 10, defaultValues: [18, 7, 31, 12], index: 1 }),
    metrics: Object.freeze([{ key: 'moves', short: 'Mov', label: 'Moves' }, { key: 'writes', short: 'Wrt', label: 'Writes' }]),
    complexity: Object.freeze({ best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' }),
    blurb: 'Removing from an array list leaves a gap. Every later value shifts left so the occupied region stays contiguous.',
    run(options = {}) {
      const values = [...(options.values || this.input.defaultValues)];
      const index = Math.max(0, Math.min(values.length - 1, Number.isInteger(options.index) ? options.index : this.input.index));
      const removed = values[index];
      const events = [];
      let moves = 0;
      events.push(arrayListEvent(this.id, events.length, 'remove', `Mark ${removed} at index ${index} for removal.`, values, { moves, writes: 0 }, { line: 2, code: this.source[1] }, { highlight: { compare: [index] }, markers: { index } }));
      for (let i = index; i < values.length - 1; i++) {
        values[i] = values[i + 1];
        moves += 1;
        events.push(arrayListEvent(this.id, events.length, 'move', `Shift ${values[i]} from index ${i + 1} to ${i}.`, values, { moves, writes: moves }, { line: 4, code: this.source[3] }, { highlight: { move: [i, i + 1] }, markers: { index } }));
      }
      values.pop();
      events.push(arrayListEvent(this.id, events.length, 'complete', `Removed ${removed}; logical size is now ${values.length}.`, values, { moves, writes: moves }, { line: 5, code: this.source[4] }, { highlight: { sorted: values.map((_, i) => i) }, terminal: true }));
      return ITCC47Playback.runResult({ events, result: { removed } });
    },
  });

  const activities = Object.freeze([
    algorithmActivity('bubble-sort', 'bubble', 'Bubble Sort', 'Sorting', 'Compare adjacent values one step at a time.'),
    algorithmActivity('selection-sort', 'selection', 'Selection Sort', 'Sorting', 'Find the next minimum and place it.'),
    algorithmActivity('insertion-sort', 'insertion', 'Insertion Sort', 'Sorting', 'Grow a sorted region from the left.'),
    algorithmActivity('linear-search', 'linear', 'Linear Search', 'Searching', 'Check values in order until the target appears.'),
    algorithmActivity('binary-search', 'binary', 'Binary Search', 'Searching', 'Repeatedly discard half of a sorted range.'),
    arrayListInsert,
    arrayListRemove,
  ]);
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
