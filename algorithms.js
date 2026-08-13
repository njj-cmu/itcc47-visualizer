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
    passEnd: !!flags.passEnd,
    final: !!flags.final,
  };
}

function eventType(step) {
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
    return ITCC47Playback.timelineEvent({
      id: `${key}:${index}`,
      domain: 'array',
      type: eventType(step),
      message: step.description,
      frame: {
        kind: 'array', array: step.array,
        items: step.array.map((value, itemIndex) => Object.freeze({ id: `slot:${itemIndex}`, value, index: itemIndex })),
        presentation, highlight, markers: Object.freeze({}),
      },
      transition,
      metrics: step.stats,
      segment: step.stats.pass == null ? null : `pass:${step.stats.pass}`,
      boundary: step.passEnd,
      terminal: step.final,
    });
  });
}

function allIndices(n) {
  return Array.from({ length: n }, (_, i) => i);
}

const ALGORITHMS = {
  bubble: {
    name: 'Bubble Sort',
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
      const steps = [];
      let comparisons = 0;
      let swaps = 0;
      const sorted = new Set();

      steps.push(makeStep(arr, {}, `Starting Bubble Sort on ${n} items.`, { pass: 0, comparisons, swaps }));

      for (let i = 0; i < n - 1; i++) {
        const pass = i + 1;
        let swappedInPass = false;
        for (let j = 0; j < n - 1 - i; j++) {
          comparisons++;
          const a = arr[j];
          const b = arr[j + 1];
          steps.push(makeStep(arr, { compare: [j, j + 1], sorted: [...sorted] }, `Compare ${a} and ${b}`, { pass, comparisons, swaps }));
          if (a > b) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            swaps++;
            swappedInPass = true;
            steps.push(makeStep(arr, { swap: [j, j + 1], sorted: [...sorted] }, `${a} > ${b} → swap`, { pass, comparisons, swaps }));
          }
        }
        sorted.add(n - 1 - i);
        steps.push(makeStep(arr, { sorted: [...sorted] }, `End of pass ${pass}: ${arr[n - 1 - i]} locked into place.`, { pass, comparisons, swaps }, { passEnd: true }));
        if (!swappedInPass) break;
      }
      for (let k = 0; k < n; k++) sorted.add(k);
      steps.push(makeStep(arr, { sorted: [...sorted] }, 'Array fully sorted.', { pass: null, comparisons, swaps }, { final: true }));
      return finalizeTimeline('bubble', steps);
    },
  },

  selection: {
    name: 'Selection Sort',
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
      const steps = [];
      let comparisons = 0;
      let swaps = 0;
      const sorted = new Set();

      steps.push(makeStep(arr, {}, `Starting Selection Sort on ${n} items.`, { pass: 0, comparisons, swaps }));

      for (let i = 0; i < n - 1; i++) {
        const pass = i + 1;
        let minIdx = i;
        steps.push(makeStep(arr, { active: [i], sorted: [...sorted] }, `Pass ${pass}: assume ${arr[i]} (index ${i}) is the minimum.`, { pass, comparisons, swaps }));
        for (let j = i + 1; j < n; j++) {
          comparisons++;
          steps.push(makeStep(arr, { compare: [minIdx, j], sorted: [...sorted] }, `Compare current min ${arr[minIdx]} with ${arr[j]}`, { pass, comparisons, swaps }));
          if (arr[j] < arr[minIdx]) {
            minIdx = j;
            steps.push(makeStep(arr, { active: [minIdx], sorted: [...sorted] }, `New minimum: ${arr[minIdx]} at index ${minIdx}`, { pass, comparisons, swaps }));
          }
        }
        if (minIdx !== i) {
          [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
          swaps++;
          steps.push(makeStep(arr, { swap: [i, minIdx], sorted: [...sorted] }, `Swap ${arr[i]} into position ${i}`, { pass, comparisons, swaps }));
        }
        sorted.add(i);
        steps.push(makeStep(arr, { sorted: [...sorted] }, `End of pass ${pass}: index ${i} finalized as ${arr[i]}.`, { pass, comparisons, swaps }, { passEnd: true }));
      }
      for (let k = 0; k < n; k++) sorted.add(k);
      steps.push(makeStep(arr, { sorted: [...sorted] }, 'Array fully sorted.', { pass: null, comparisons, swaps }, { final: true }));
      return finalizeTimeline('selection', steps);
    },
  },

  insertion: {
    name: 'Insertion Sort',
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
      const steps = [];
      let comparisons = 0;
      let moves = 0;
      const sorted = new Set([0]);

      steps.push(makeStep(arr, { sorted: [0] }, 'Starting Insertion Sort. First item is trivially sorted.', { pass: 0, comparisons, moves }));

      for (let i = 1; i < n; i++) {
        const pass = i;
        const key = arr[i];
        let j = i - 1;
        let hole = i;
        const held = () => ({ value: key, from: i, hole });
        steps.push(makeStep(arr, { active: [i], held: held(), sorted: [...sorted] }, `Pass ${pass}: pick up ${key} (index ${i}) to insert.`, { pass, comparisons, moves }));
        while (j >= 0) {
          comparisons++;
          steps.push(makeStep(arr, { compare: [j, hole], held: held(), sorted: [...sorted] }, `Compare ${key} with ${arr[j]}`, { pass, comparisons, moves }));
          if (arr[j] > key) {
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
            }, `${movedValue} > ${key} → shift right`, { pass, comparisons, moves }));
            j--;
          } else {
            break;
          }
        }
        arr[j + 1] = key;
        for (let k = 0; k <= i; k++) sorted.add(k);
        steps.push(makeStep(arr, { sorted: [...sorted] }, `Insert ${key} at index ${j + 1}. Sorted region size ${i + 1}.`, { pass, comparisons, moves }, { passEnd: true }));
      }
      steps.push(makeStep(arr, { sorted: allIndices(n) }, 'Array fully sorted.', { pass: null, comparisons, moves }, { final: true }));
      return finalizeTimeline('insertion', steps);
    },
  },

  linear: {
    name: 'Linear Search',
    category: 'searching',
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    metrics: [{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }],
    blurb: 'Checks every item in order, from the start, until the target is found or the list runs out.',
    needsTarget: true,
    run(input, target) {
      const arr = [...input];
      const steps = [];
      let comparisons = 0;
      steps.push(makeStep(arr, {}, `Searching for ${target}, starting at index 0.`, { comparisons }));
      for (let i = 0; i < arr.length; i++) {
        comparisons++;
        if (arr[i] === target) {
          steps.push(makeStep(arr, { found: i }, `arr[${i}] = ${arr[i]} matches ${target}. Found!`, { comparisons }, { final: true }));
          return finalizeTimeline('linear', steps);
        }
        steps.push(makeStep(arr, { active: [i] }, `arr[${i}] = ${arr[i]} ≠ ${target}. Keep searching.`, { comparisons }));
      }
      steps.push(makeStep(arr, {}, `Reached the end. ${target} was not found.`, { comparisons }, { final: true }));
      return finalizeTimeline('linear', steps);
    },
  },

  binary: {
    name: 'Binary Search',
    category: 'searching',
    complexity: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
    metrics: [{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }],
    blurb: 'Requires a sorted array. Repeatedly checks the middle of the remaining range and discards the half that cannot contain the target.',
    needsTarget: true,
    needsSorted: true,
    run(input, target) {
      const original = [...input];
      const arr = [...input].sort((a, b) => a - b);
      const steps = [];
      let comparisons = 0;
      let lo = 0;
      let hi = arr.length - 1;
      const alreadySorted = original.every((value, i) => i === 0 || original[i - 1] <= value);
      steps.push(makeStep(original, { preprocess: true }, alreadySorted
        ? 'Binary search requires sorted data. This array is already sorted, so no preprocessing was needed.'
        : 'Binary search requires sorted data. This visualizer creates a sorted copy before searching. Sorting has a separate cost, typically O(n log n), and is not included in the search comparison count. For one search on unsorted data, linear search may be cheaper.', { comparisons }));
      if (!alreadySorted) {
        steps.push(makeStep(arr, { preprocess: true, range: [lo, hi] },
          'Sorted copy ready. The Binary Search comparison count starts at zero.',
          { comparisons }));
      }
      steps.push(makeStep(arr, { range: [lo, hi] }, `Searching the sorted array for ${target}. Range: index ${lo}–${hi}.`, { comparisons }));
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        comparisons++;
        if (arr[mid] === target) {
          steps.push(makeStep(arr, { found: mid, range: [lo, hi] }, `arr[${mid}] = ${arr[mid]} matches ${target}. Found!`, { comparisons }, { final: true }));
          return finalizeTimeline('binary', steps);
        }
        if (arr[mid] < target) {
          steps.push(makeStep(arr, { mid, range: [lo, hi] }, `arr[${mid}] = ${arr[mid]} < ${target} → search right half.`, { comparisons }));
          lo = mid + 1;
        } else {
          steps.push(makeStep(arr, { mid, range: [lo, hi] }, `arr[${mid}] = ${arr[mid]} > ${target} → search left half.`, { comparisons }));
          hi = mid - 1;
        }
        if (lo <= hi) {
          steps.push(makeStep(arr, { range: [lo, hi] }, `New range: index ${lo}–${hi}.`, { comparisons }));
        }
      }
      steps.push(makeStep(arr, {}, `Search range is empty. ${target} was not found.`, { comparisons }, { final: true }));
      return finalizeTimeline('binary', steps);
    },
  },
};
