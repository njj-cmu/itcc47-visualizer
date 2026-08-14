/*
 * Step generators for each algorithm.
 * Every algorithm produces an array of "steps". A step is a full snapshot:
 *   { array, highlight, description, stats, passEnd, final }
 * The UI never re-runs the algorithm while scrubbing/playing — it just
 * walks this pre-computed list, which keeps stepping backwards and the
 * trace table trivial to build.
 */

function makeStep(arr, highlight, description, stats, flags = {}) {
  return {
    array: [...arr],
    highlight,
    description,
    stats: { ...stats },
    source: flags.source || null,
    markers: flags.markers ? { ...flags.markers } : {},
    eventType: flags.type || null,
    passEnd: !!flags.passEnd,
    final: !!flags.final,
  };
}

function eventType(step) {
  if (step.eventType) return step.eventType;
  const h = step.highlight || {};
  if (step.final) return 'complete';
  if (h.preprocess) return 'preprocess';
  if (h.found !== undefined) return 'found';
  if (h.swap) return 'swap';
  if (h.move) return 'move';
  if (h.compare || h.mid !== undefined) return 'compare';
  if (h.range) return 'range';
  return 'state';
}

function finalizeTimeline(key, steps) {
  const entities = steps[0].array.map((value, index) => Object.freeze({ id: `item:${index}`, value }));
  let slots = entities.map((entity) => entity.id);
  let heldId = null;
  let previousHeld = null;

  return steps.map((step, index) => {
    const highlight = step.highlight || {};
    let transition = null;

    if (highlight.swap) {
      const [from, to] = highlight.swap;
      const fromId = slots[from]; const toId = slots[to];
      slots = [...slots];
      [slots[from], slots[to]] = [toId, fromId];
      transition = { kind: 'swap', moves: [
        { entityId: fromId, from: `slot:${from}`, to: `slot:${to}` },
        { entityId: toId, from: `slot:${to}`, to: `slot:${from}` },
      ], enter: [], exit: [], wait: true };
    } else if (highlight.held && !heldId) {
      const from = highlight.held.from;
      heldId = slots[from];
      slots = [...slots]; slots[from] = null;
      transition = { kind: 'shift', moves: [{ entityId: heldId, from: `slot:${from}`, to: 'held' }], enter: [], exit: [], wait: true };
    } else if (highlight.transition?.kind === 'shift') {
      const { from, to } = highlight.transition;
      const movingId = slots[from];
      slots = [...slots]; slots[to] = movingId; slots[from] = null;
      transition = { kind: 'shift', moves: [{ entityId: movingId, from: `slot:${from}`, to: `slot:${to}` }], enter: [], exit: [], wait: true };
    } else if (!highlight.held && heldId && previousHeld) {
      const to = previousHeld.hole;
      slots = [...slots]; slots[to] = heldId;
      transition = { kind: 'insert', moves: [{ entityId: heldId, from: 'held', to: `slot:${to}` }], enter: [], exit: [], wait: true };
      heldId = null;
    } else if (index > 0 && step.array.some((value, slotIndex) => {
      const entity = entities.find((candidate) => candidate.id === slots[slotIndex]);
      return entity && entity.value !== value;
    })) {
      const available = new Map();
      entities.forEach((entity) => available.set(entity.value, [...(available.get(entity.value) || []), entity.id]));
      slots = step.array.map((value) => available.get(value).shift());
    }

    if (!transition && (highlight.compare || highlight.mid !== undefined || highlight.found !== undefined || highlight.range)) {
      transition = { kind: 'emphasis', moves: [], enter: [], exit: [], wait: false };
    }

    const presentation = {
      entities,
      slots: [...slots],
      held: heldId ? { entityId: heldId, location: 'held', from: highlight.held?.from ?? previousHeld?.from } : null,
      holes: slots.flatMap((entityId, slotIndex) => entityId == null ? [`slot:${slotIndex}`] : []),
    };
    previousHeld = highlight.held || null;
    const teaching = teachingForStep(key, step);
    return ITCC47Playback.timelineEvent({
      id: `${key}:${index}`,
      domain: 'array',
      type: eventType(step),
      message: step.description,
      frame: {
        kind: 'array', array: step.array,
        items: step.array.map((value, itemIndex) => Object.freeze({ id: `slot:${itemIndex}`, value, index: itemIndex })),
        presentation, highlight, markers: Object.freeze({ ...(step.markers || {}), ...(teaching ? { teaching } : {}) }),
      },
      transition,
      metrics: step.stats,
      source: step.source,
      segment: step.stats.pass == null ? null : `pass:${step.stats.pass}`,
      boundary: step.passEnd,
      terminal: step.final,
    });
  });
}

function allIndices(n) {
  return Array.from({ length: n }, (_, i) => i);
}

function sourceAt(source, line) {
  return { line, code: source[line - 1] };
}

const TEACHING_VARIANTS = Object.freeze({
  bubble: 'adjacent-comparison',
  selection: 'minimum-selection',
  insertion: 'key-insertion',
  linear: 'sequential-scan',
  binary: 'bounded-search',
});

function slotTeachingAnnotation(id, label, value, index, tone) {
  return { id, label, value, tone, target: { kind: 'slot', index } };
}

function teachingForStep(key, step) {
  const values = step.array || [];
  const highlight = step.highlight || {};
  const variables = step.markers?.variables || {};
  const line = step.source?.line;
  const outcome = (condition) => condition ? 'true' : 'false';

  if (key === 'bubble') {
    const { j, swapped } = variables;
    if (!Number.isInteger(j) || j < 0 || j + 1 >= values.length) return null;
    const left = values[j]; const right = values[j + 1];
    return {
      variant: TEACHING_VARIANTS[key], title: 'Adjacent comparison',
      annotations: [
        slotTeachingAnnotation('left', 'values[j]', left, j, 'primary'),
        slotTeachingAnnotation('right', 'values[j + 1]', right, j + 1, 'secondary'),
      ],
      comparison: line === 5 ? { text: `${left} > ${right}`, outcome: outcome(left > right) } : null,
      status: typeof swapped === 'boolean' ? [{ label: 'swapped', value: swapped ? 'TRUE' : 'FALSE', tone: swapped ? 'success' : 'muted' }] : [],
    };
  }

  if (key === 'selection') {
    const { j, minIndex } = variables;
    if (!Number.isInteger(minIndex) || minIndex < 0 || minIndex >= values.length) return null;
    const annotations = [slotTeachingAnnotation('minimum', 'minIndex', minIndex, minIndex, 'minimum')];
    if (Number.isInteger(j) && j >= 0 && j < values.length && j !== minIndex) {
      annotations.push(slotTeachingAnnotation('candidate', 'values[j]', values[j], j, 'primary'));
    }
    return {
      variant: TEACHING_VARIANTS[key], title: 'Current selection', annotations,
      comparison: line === 5 && Number.isInteger(j)
        ? { text: `${values[j]} < values[minIndex]`, outcome: outcome(values[j] < values[minIndex]) } : null,
      status: [],
    };
  }

  if (key === 'insertion') {
    const { j, key: heldKey } = variables;
    if (!Number.isFinite(heldKey)) return null;
    const annotations = [{ id: 'key', label: 'key', value: heldKey, tone: 'minimum', target: { kind: 'held' } }];
    if (Number.isInteger(j) && j >= 0 && j < values.length) annotations.push(slotTeachingAnnotation('scan', 'values[j]', values[j], j, 'primary'));
    if (Number.isInteger(highlight.held?.hole)) annotations.push(slotTeachingAnnotation('hole', 'open slot', highlight.held.hole, highlight.held.hole, 'secondary'));
    const comparison = line === 5
      ? (j < 0 ? { text: 'j >= 0', outcome: 'false' } : { text: `${values[j]} > key`, outcome: outcome(values[j] > heldKey) })
      : null;
    return { variant: TEACHING_VARIANTS[key], title: 'Insertion state', annotations, comparison, status: [] };
  }

  if (key === 'linear') {
    const { i, target } = variables;
    if (!Number.isInteger(i) || i < 0 || i >= values.length) return null;
    return {
      variant: TEACHING_VARIANTS[key], title: 'Current scan',
      annotations: [slotTeachingAnnotation('current', 'values[i]', values[i], i, 'primary')],
      comparison: line === 4 ? { text: `${values[i]} = target`, outcome: outcome(values[i] === target) } : null,
      status: [{ label: 'target', value: target, tone: 'minimum' }],
    };
  }

  if (key === 'binary') {
    const { low, mid, high, target } = variables;
    const annotations = [];
    if (Number.isInteger(low) && low >= 0 && low < values.length) annotations.push(slotTeachingAnnotation('low', 'low', low, low, 'secondary'));
    if (Number.isInteger(mid) && mid >= 0 && mid < values.length) annotations.push(slotTeachingAnnotation('mid', 'mid', mid, mid, 'primary'));
    if (Number.isInteger(high) && high >= 0 && high < values.length) annotations.push(slotTeachingAnnotation('high', 'high', high, high, 'minimum'));
    if (!annotations.length) return null;
    let comparison = null;
    if (line === 7 && Number.isInteger(mid)) comparison = { text: `${values[mid]} = target`, outcome: outcome(values[mid] === target) };
    if (line === 9 && Number.isInteger(mid)) comparison = { text: `${values[mid]} < target`, outcome: outcome(values[mid] < target) };
    return {
      variant: TEACHING_VARIANTS[key], title: 'Search window', annotations, comparison,
      status: [{ label: 'target', value: target, tone: 'minimum' }],
    };
  }

  return null;
}

const algorithmSources = Object.freeze({
  bubble: () => [
    'n <- length(values)',
    'FOR end <- n - 1 DOWNTO 1 DO',
    '  swapped <- FALSE',
    '  FOR j <- 0 TO end - 1 DO',
    '    IF values[j] > values[j + 1] THEN',
    '      SWAP values[j], values[j + 1]',
    '      swapped <- TRUE',
    '    ENDIF',
    '  ENDFOR',
    '  IF swapped = FALSE THEN',
    '    BREAK',
    '  ENDIF',
    'ENDFOR',
    'RETURN values',
  ],
  selection: () => [
    'n <- length(values)',
    'FOR i <- 0 TO n - 2 DO',
    '  minIndex <- i',
    '  FOR j <- i + 1 TO n - 1 DO',
    '    IF values[j] < values[minIndex] THEN',
    '      minIndex <- j',
    '    ENDIF',
    '  ENDFOR',
    '  IF minIndex <> i THEN',
    '    SWAP values[i], values[minIndex]',
    '  ENDIF',
    'ENDFOR',
    'RETURN values',
  ],
  insertion: () => [
    'n <- length(values)',
    'FOR i <- 1 TO n - 1 DO',
    '  key <- values[i]',
    '  j <- i - 1',
    '  WHILE j >= 0 AND values[j] > key DO',
    '    values[j + 1] <- values[j]',
    '    j <- j - 1',
    '  ENDWHILE',
    '  values[j + 1] <- key',
    'ENDFOR',
    'RETURN values',
  ],
  linear: ({ target } = {}) => [
    `target <- ${target ?? 'input'}`,
    'n <- length(values)',
    'FOR i <- 0 TO n - 1 DO',
    '  IF values[i] = target THEN',
    '    RETURN i',
    '  ENDIF',
    'ENDFOR',
    'RETURN NOT_FOUND',
  ],
  binary: ({ target } = {}) => [
    `target <- ${target ?? 'input'}`,
    'values <- sorted copy of values',
    'low <- 0',
    'high <- length(values) - 1',
    'WHILE low <= high DO',
    '  mid <- floor((low + high) / 2)',
    '  IF values[mid] = target THEN',
    '    RETURN mid',
    '  ELSE IF values[mid] < target THEN',
    '    low <- mid + 1',
    '  ELSE',
    '    high <- mid - 1',
    '  ENDIF',
    'ENDWHILE',
    'RETURN NOT_FOUND',
  ],
});

const ALGORITHMS = {
  bubble: {
    name: 'Bubble Sort',
    sourceFor: algorithmSources.bubble,
    category: 'sorting',
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    metrics: [
      { key: 'pass', short: 'Pass', label: 'Pass' },
      { key: 'comparisons', short: 'Cmp', label: 'Comparisons' },
      { key: 'swaps', short: 'Swp', label: 'Swaps' },
    ],
    blurb: 'Repeatedly steps through the list, compares adjacent items, and swaps them if they are out of order. Each pass bubbles the next-largest value into place.',
    run(input) {
      const arr = [...input];
      const n = arr.length;
      const source = this.sourceFor();
      const steps = [];
      let comparisons = 0;
      let swaps = 0;
      let stoppedEarly = false;
      const sorted = new Set();

      steps.push(makeStep(arr, {}, `Set n to ${n}, the number of values.`, { pass: 0, comparisons, swaps }, { source: sourceAt(source, 1), type: 'assign', markers: { variables: { n } } }));

      for (let i = 0; i < n - 1; i++) {
        const pass = i + 1;
        const end = n - 1 - i;
        let swappedInPass = false;
        const boundary = { start: 0, end, active: true, label: `unsorted range: 0 … end = ${end}` };
        steps.push(makeStep(arr, { sorted: [...sorted] }, `Set end to ${end}. Since ${end} >= 1, start pass ${pass}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 2), type: 'loop', boundary: true, markers: { boundary, variables: { n, end } } }));
        steps.push(makeStep(arr, { sorted: [...sorted] }, 'Set swapped to FALSE for this pass.', { pass, comparisons, swaps }, { source: sourceAt(source, 3), type: 'assign', markers: { boundary, variables: { n, end, swapped: false } } }));
        for (let j = 0; j < end; j++) {
          steps.push(makeStep(arr, { active: [j], sorted: [...sorted] }, `Set j to ${j}. Since ${j} <= ${end - 1}, inspect this adjacent pair.`, { pass, comparisons, swaps }, { source: sourceAt(source, 4), type: 'loop', boundary: true, markers: { boundary, variables: { n, end, j, swapped: swappedInPass } } }));
          comparisons++;
          const a = arr[j];
          const b = arr[j + 1];
          steps.push(makeStep(arr, { compare: [j, j + 1], sorted: [...sorted] }, `${a} > ${b} is ${a > b ? 'TRUE' : 'FALSE'}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 5), type: 'condition', markers: { boundary, variables: { n, end, j, swapped: swappedInPass } } }));
          if (a > b) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            swaps++;
            swappedInPass = true;
            steps.push(makeStep(arr, { swap: [j, j + 1], sorted: [...sorted] }, `Swap ${a} and ${b}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 6), markers: { boundary, variables: { n, end, j, swapped: false } } }));
            steps.push(makeStep(arr, { active: [j, j + 1], sorted: [...sorted] }, 'Set swapped to TRUE because this pass changed the array.', { pass, comparisons, swaps }, { source: sourceAt(source, 7), type: 'assign', markers: { boundary, variables: { n, end, j, swapped: true } } }));
          }
        }
        steps.push(makeStep(arr, { sorted: [...sorted] }, `Increment j to ${end}. Since ${end} > ${end - 1}, exit the inner loop.`, { pass, comparisons, swaps }, { source: sourceAt(source, 4), type: 'loop-exit', boundary: true, markers: { boundary, variables: { n, end, j: end, swapped: swappedInPass } } }));
        sorted.add(n - 1 - i);
        steps.push(makeStep(arr, { sorted: [...sorted] }, `swapped = FALSE is ${!swappedInPass ? 'TRUE' : 'FALSE'}. ${arr[end]} is now fixed at index ${end}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 10), type: 'condition', passEnd: true, markers: { boundary: { ...boundary, active: false }, variables: { n, end, swapped: swappedInPass } } }));
        if (!swappedInPass) {
          steps.push(makeStep(arr, { sorted: [...sorted] }, 'Break: no swap occurred, so every value is already in order.', { pass, comparisons, swaps }, { source: sourceAt(source, 11), type: 'break', markers: { variables: { n, end, swapped: false } } }));
          stoppedEarly = true;
          break;
        }
      }
      if (!stoppedEarly) steps.push(makeStep(arr, { sorted: [...sorted] }, 'Decrement end to 0. Since 0 < 1, exit the outer loop.', { pass: n - 1, comparisons, swaps }, { source: sourceAt(source, 2), type: 'loop-exit', boundary: true, markers: { variables: { n, end: 0 } } }));
      for (let k = 0; k < n; k++) sorted.add(k);
      steps.push(makeStep(arr, { sorted: [...sorted] }, 'Return the fully sorted values.', { pass: null, comparisons, swaps }, { source: sourceAt(source, 14), type: 'return', final: true, markers: { variables: { n } } }));
      return finalizeTimeline('bubble', steps);
    },
  },

  selection: {
    name: 'Selection Sort',
    sourceFor: algorithmSources.selection,
    category: 'sorting',
    complexity: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    metrics: [
      { key: 'pass', short: 'Pass', label: 'Pass' },
      { key: 'comparisons', short: 'Cmp', label: 'Comparisons' },
      { key: 'swaps', short: 'Swp', label: 'Swaps' },
    ],
    blurb: 'Each pass scans the unsorted region for the minimum value, then swaps it into the next open position at the front.',
    run(input) {
      const arr = [...input];
      const n = arr.length;
      const source = this.sourceFor();
      const steps = [];
      let comparisons = 0;
      let swaps = 0;
      const sorted = new Set();

      steps.push(makeStep(arr, {}, `Set n to ${n}, the number of values.`, { pass: 0, comparisons, swaps }, { source: sourceAt(source, 1), type: 'assign', markers: { variables: { n } } }));

      for (let i = 0; i < n - 1; i++) {
        const pass = i + 1;
        let minIdx = i;
        const boundary = { start: i, end: n - 1, active: true, label: `search range: i = ${i} … ${n - 1}` };
        steps.push(makeStep(arr, { active: [i], sorted: [...sorted] }, `Set i to ${i}. Since ${i} <= ${n - 2}, start pass ${pass}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 2), type: 'loop', boundary: true, markers: { boundary, variables: { n, i } } }));
        steps.push(makeStep(arr, { active: [i], sorted: [...sorted] }, `Set minIndex to i (${i}); ${arr[i]} is the current minimum.`, { pass, comparisons, swaps }, { source: sourceAt(source, 3), type: 'assign', markers: { boundary, variables: { n, i, minIndex: minIdx } } }));
        for (let j = i + 1; j < n; j++) {
          steps.push(makeStep(arr, { active: [j], sorted: [...sorted] }, `Set j to ${j}. Since ${j} <= ${n - 1}, inspect this candidate.`, { pass, comparisons, swaps }, { source: sourceAt(source, 4), type: 'loop', boundary: true, markers: { boundary, variables: { n, i, j, minIndex: minIdx } } }));
          comparisons++;
          steps.push(makeStep(arr, { compare: [minIdx, j], sorted: [...sorted] }, `${arr[j]} < ${arr[minIdx]} is ${arr[j] < arr[minIdx] ? 'TRUE' : 'FALSE'}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 5), type: 'condition', markers: { boundary, variables: { n, i, j, minIndex: minIdx } } }));
          if (arr[j] < arr[minIdx]) {
            minIdx = j;
            steps.push(makeStep(arr, { active: [minIdx], sorted: [...sorted] }, `Set minIndex to ${minIdx}; the new minimum is ${arr[minIdx]}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 6), type: 'assign', markers: { boundary, variables: { n, i, j, minIndex: minIdx } } }));
          }
        }
        steps.push(makeStep(arr, { active: [minIdx], sorted: [...sorted] }, `Increment j to ${n}. Since ${n} > ${n - 1}, exit the inner loop.`, { pass, comparisons, swaps }, { source: sourceAt(source, 4), type: 'loop-exit', boundary: true, markers: { boundary, variables: { n, i, j: n, minIndex: minIdx } } }));
        steps.push(makeStep(arr, { compare: [i, minIdx], sorted: [...sorted] }, `minIndex (${minIdx}) <> i (${i}) is ${minIdx !== i ? 'TRUE' : 'FALSE'}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 9), type: 'condition', markers: { boundary, variables: { n, i, minIndex: minIdx } } }));
        if (minIdx !== i) {
          const selectedValue = arr[minIdx];
          [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
          swaps++;
          steps.push(makeStep(arr, { swap: [i, minIdx], sorted: [...sorted] }, `Swap ${selectedValue} into open position ${i}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 10), markers: { boundary, variables: { n, i, minIndex: minIdx } } }));
        }
        sorted.add(i);
        steps.push(makeStep(arr, { sorted: [...sorted] }, `Pass ${pass} complete: index ${i} is finalized as ${arr[i]}.`, { pass, comparisons, swaps }, { source: sourceAt(source, 12), type: 'loop-end', passEnd: true, markers: { boundary: { ...boundary, active: false }, variables: { n, i, minIndex: minIdx } } }));
      }
      steps.push(makeStep(arr, { sorted: [...sorted] }, `Increment i to ${n - 1}. Since ${n - 1} > ${n - 2}, exit the outer loop.`, { pass: n - 1, comparisons, swaps }, { source: sourceAt(source, 2), type: 'loop-exit', boundary: true, markers: { variables: { n, i: n - 1 } } }));
      for (let k = 0; k < n; k++) sorted.add(k);
      steps.push(makeStep(arr, { sorted: [...sorted] }, 'Return the fully sorted values.', { pass: null, comparisons, swaps }, { source: sourceAt(source, 13), type: 'return', final: true, markers: { variables: { n } } }));
      return finalizeTimeline('selection', steps);
    },
  },

  insertion: {
    name: 'Insertion Sort',
    sourceFor: algorithmSources.insertion,
    category: 'sorting',
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    metrics: [
      { key: 'pass', short: 'Pass', label: 'Pass' },
      { key: 'comparisons', short: 'Cmp', label: 'Comparisons' },
      { key: 'moves', short: 'Mov', label: 'Moves' },
    ],
    blurb: 'Builds a sorted region from the left. Each new item is picked up and shifted left into its correct place among the already-sorted items.',
    run(input) {
      const arr = [...input];
      const n = arr.length;
      const source = this.sourceFor();
      const steps = [];
      let comparisons = 0;
      let moves = 0;
      const sorted = new Set([0]);

      steps.push(makeStep(arr, { sorted: [0] }, `Set n to ${n}. Index 0 begins as the one-value sorted region.`, { pass: 0, comparisons, moves }, { source: sourceAt(source, 1), type: 'assign', markers: { variables: { n } } }));

      for (let i = 1; i < n; i++) {
        const pass = i;
        const key = arr[i];
        let j = i - 1;
        let hole = i;
        const boundary = { start: 0, end: i, active: true, label: `sorted insertion range: 0 … i = ${i}` };
        const held = () => ({ value: key, from: i, hole });
        steps.push(makeStep(arr, { active: [i], sorted: [...sorted] }, `Set i to ${i}. Since ${i} <= ${n - 1}, start pass ${pass}.`, { pass, comparisons, moves }, { source: sourceAt(source, 2), type: 'loop', boundary: true, markers: { boundary, variables: { n, i } } }));
        steps.push(makeStep(arr, { active: [i], held: held(), sorted: [...sorted] }, `Copy values[${i}] (${key}) into key and hold it outside the array.`, { pass, comparisons, moves }, { source: sourceAt(source, 3), type: 'assign', markers: { boundary, variables: { n, i, key } } }));
        steps.push(makeStep(arr, { active: [j], held: held(), sorted: [...sorted] }, `Set j to i - 1 (${j}).`, { pass, comparisons, moves }, { source: sourceAt(source, 4), type: 'assign', markers: { boundary, variables: { n, i, key, j } } }));
        while (true) {
          const indexInRange = j >= 0;
          const larger = indexInRange && arr[j] > key;
          if (indexInRange) comparisons++;
          const conditionHighlight = indexInRange ? { compare: [j, hole], held: held(), sorted: [...sorted] } : { active: [hole], held: held(), sorted: [...sorted] };
          const conditionMessage = !indexInRange
            ? `j >= 0 is FALSE because j = ${j}; exit the WHILE loop.`
            : `j >= 0 is TRUE and ${arr[j]} > ${key} is ${larger ? 'TRUE' : 'FALSE'}${larger ? '; continue shifting.' : '; exit the WHILE loop.'}`;
          steps.push(makeStep(arr, conditionHighlight, conditionMessage, { pass, comparisons, moves }, { source: sourceAt(source, 5), type: larger ? 'loop' : 'loop-exit', boundary: true, markers: { boundary, variables: { n, i, key, j } } }));
          if (!larger) break;
          const from = j;
          const to = hole;
          const movedValue = arr[from];
          const displacedValue = arr[to];
          arr[to] = movedValue;
          hole = from;
          moves++;
          steps.push(makeStep(arr, {
            move: [from, to],
            held: held(),
            transition: { kind: 'shift', from, to, value: movedValue, displacedValue },
            sorted: [...sorted],
          }, `Copy ${movedValue} from index ${from} to index ${to}.`, { pass, comparisons, moves }, { source: sourceAt(source, 6), markers: { boundary, variables: { n, i, key, j } } }));
          j--;
          steps.push(makeStep(arr, { active: [hole], held: held(), sorted: [...sorted] }, `Decrement j to ${j}.`, { pass, comparisons, moves }, { source: sourceAt(source, 7), type: 'assign', markers: { boundary, variables: { n, i, key, j } } }));
        }
        arr[j + 1] = key;
        for (let k = 0; k <= i; k++) sorted.add(k);
        steps.push(makeStep(arr, { found: j + 1, sorted: [...sorted] }, `Copy key (${key}) into the open slot at index ${j + 1}.`, { pass, comparisons, moves }, { source: sourceAt(source, 9), type: 'insert', markers: { boundary, variables: { n, i, key, j } } }));
        steps.push(makeStep(arr, { sorted: [...sorted] }, `Pass ${pass} complete. The sorted region now spans index 0 through ${i}.`, { pass, comparisons, moves }, { source: sourceAt(source, 10), type: 'loop-end', passEnd: true, markers: { boundary: { ...boundary, active: false }, variables: { n, i, key, j } } }));
      }
      steps.push(makeStep(arr, { sorted: allIndices(n) }, `Increment i to ${n}. Since ${n} > ${n - 1}, exit the outer loop.`, { pass: n - 1, comparisons, moves }, { source: sourceAt(source, 2), type: 'loop-exit', boundary: true, markers: { variables: { n, i: n } } }));
      steps.push(makeStep(arr, { sorted: allIndices(n) }, 'Return the fully sorted values.', { pass: null, comparisons, moves }, { source: sourceAt(source, 11), type: 'return', final: true, markers: { variables: { n } } }));
      return finalizeTimeline('insertion', steps);
    },
  },

  linear: {
    name: 'Linear Search',
    sourceFor: algorithmSources.linear,
    category: 'searching',
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    metrics: [{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }],
    blurb: 'Checks every item in order, from the start, until the target is found or the list runs out.',
    needsTarget: true,
    run(input, target) {
      const arr = [...input];
      const source = this.sourceFor({ target });
      const steps = [];
      let comparisons = 0;
      steps.push(makeStep(arr, {}, `Set target to ${target}.`, { comparisons }, { source: sourceAt(source, 1), type: 'assign', markers: { variables: { target } } }));
      steps.push(makeStep(arr, {}, `Set n to ${arr.length}, the number of values.`, { comparisons }, { source: sourceAt(source, 2), type: 'assign', markers: { variables: { target, n: arr.length } } }));
      for (let i = 0; i < arr.length; i++) {
        steps.push(makeStep(arr, { active: [i] }, `Set i to ${i}. Since ${i} <= ${arr.length - 1}, inspect values[${i}].`, { comparisons }, { source: sourceAt(source, 3), type: 'loop', markers: { variables: { target, n: arr.length, i } } }));
        comparisons++;
        const matches = arr[i] === target;
        steps.push(makeStep(arr, { compare: [i] }, `${arr[i]} = ${target} is ${matches ? 'TRUE' : 'FALSE'}.`, { comparisons }, { source: sourceAt(source, 4), type: 'condition', markers: { variables: { target, n: arr.length, i } } }));
        if (arr[i] === target) {
          steps.push(makeStep(arr, { found: i }, `Return index ${i}; the target has been found.`, { comparisons }, { source: sourceAt(source, 5), type: 'return', final: true, markers: { variables: { target, n: arr.length, i } } }));
          return finalizeTimeline('linear', steps);
        }
      }
      steps.push(makeStep(arr, {}, `Increment i to ${arr.length}. Since ${arr.length} > ${arr.length - 1}, exit the loop.`, { comparisons }, { source: sourceAt(source, 3), type: 'loop-exit', markers: { variables: { target, n: arr.length, i: arr.length } } }));
      steps.push(makeStep(arr, {}, `Return NOT_FOUND; ${target} is not in the array.`, { comparisons }, { source: sourceAt(source, 8), type: 'return', final: true, markers: { variables: { target, n: arr.length, i: arr.length } } }));
      return finalizeTimeline('linear', steps);
    },
  },

  binary: {
    name: 'Binary Search',
    sourceFor: algorithmSources.binary,
    category: 'searching',
    complexity: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
    metrics: [{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }],
    blurb: 'Requires a sorted array. Repeatedly checks the middle of the remaining range and discards the half that cannot contain the target.',
    needsTarget: true,
    needsSorted: true,
    run(input, target) {
      const original = [...input];
      const arr = [...input].sort((a, b) => a - b);
      const source = this.sourceFor({ target });
      const steps = [];
      let comparisons = 0;
      let lo = 0;
      let hi = arr.length - 1;
      const alreadySorted = original.every((value, i) => i === 0 || original[i - 1] <= value);
      steps.push(makeStep(original, { preprocess: true }, `Set target to ${target}.`, { comparisons }, { source: sourceAt(source, 1), type: 'assign', markers: { variables: { target } } }));
      steps.push(makeStep(arr, { preprocess: true }, alreadySorted
        ? 'The input is already sorted, so the sorted copy has the same order and needs no sorting work.'
        : 'Create a sorted copy before searching. Sorting typically costs O(n log n), is separate from the Binary Search comparison count, and can make linear search cheaper for one search on unsorted data.', { comparisons }, { source: sourceAt(source, 2), type: 'preprocess', markers: { variables: { target } } }));
      steps.push(makeStep(arr, { range: [lo, hi] }, 'Set low to 0.', { comparisons }, { source: sourceAt(source, 3), type: 'assign', markers: { variables: { target, low: lo } } }));
      steps.push(makeStep(arr, { range: [lo, hi] }, `Set high to ${hi}.`, { comparisons }, { source: sourceAt(source, 4), type: 'assign', markers: { variables: { target, low: lo, high: hi } } }));
      while (lo <= hi) {
        const boundary = { start: lo, end: hi, active: true, label: `search range: low = ${lo} … high = ${hi}` };
        steps.push(makeStep(arr, { range: [lo, hi] }, `${lo} <= ${hi} is TRUE; continue inside the WHILE loop.`, { comparisons }, { source: sourceAt(source, 5), type: 'loop', boundary: true, markers: { boundary, variables: { target, low: lo, high: hi } } }));
        const mid = Math.floor((lo + hi) / 2);
        steps.push(makeStep(arr, { mid, range: [lo, hi] }, `Set mid to floor((${lo} + ${hi}) / 2) = ${mid}.`, { comparisons }, { source: sourceAt(source, 6), type: 'assign', markers: { boundary, variables: { target, low: lo, high: hi, mid } } }));
        comparisons++;
        const matches = arr[mid] === target;
        steps.push(makeStep(arr, { compare: [mid], mid, range: [lo, hi] }, `${arr[mid]} = ${target} is ${matches ? 'TRUE' : 'FALSE'}.`, { comparisons }, { source: sourceAt(source, 7), type: 'condition', markers: { boundary, variables: { target, low: lo, high: hi, mid } } }));
        if (matches) {
          steps.push(makeStep(arr, { found: mid, range: [lo, hi] }, `Return index ${mid}; the target has been found.`, { comparisons }, { source: sourceAt(source, 8), type: 'return', final: true, markers: { boundary, variables: { target, low: lo, high: hi, mid } } }));
          return finalizeTimeline('binary', steps);
        }
        const searchRight = arr[mid] < target;
        steps.push(makeStep(arr, { compare: [mid], mid, range: [lo, hi] }, `${arr[mid]} < ${target} is ${searchRight ? 'TRUE' : 'FALSE'}.`, { comparisons }, { source: sourceAt(source, 9), type: 'condition', markers: { boundary, variables: { target, low: lo, high: hi, mid } } }));
        if (searchRight) {
          lo = mid + 1;
          steps.push(makeStep(arr, { range: [lo, hi] }, `Set low to mid + 1 (${lo}); discard the left half.`, { comparisons }, { source: sourceAt(source, 10), type: 'assign', markers: { boundary: { start: lo, end: hi, active: lo <= hi, label: `search range: low = ${lo} … high = ${hi}` }, variables: { target, low: lo, high: hi, mid } } }));
        } else {
          hi = mid - 1;
          steps.push(makeStep(arr, { range: [lo, hi] }, `Set high to mid - 1 (${hi}); discard the right half.`, { comparisons }, { source: sourceAt(source, 12), type: 'assign', markers: { boundary: { start: lo, end: hi, active: lo <= hi, label: `search range: low = ${lo} … high = ${hi}` }, variables: { target, low: lo, high: hi, mid } } }));
        }
      }
      steps.push(makeStep(arr, {}, `${lo} <= ${hi} is FALSE; the search range is empty.`, { comparisons }, { source: sourceAt(source, 5), type: 'loop-exit', boundary: true, markers: { variables: { target, low: lo, high: hi } } }));
      steps.push(makeStep(arr, {}, `Return NOT_FOUND; ${target} is not in the sorted array.`, { comparisons }, { source: sourceAt(source, 15), type: 'return', final: true, markers: { variables: { target, low: lo, high: hi } } }));
      return finalizeTimeline('binary', steps);
    },
  },
};
