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

function allIndices(n) {
  return Array.from({ length: n }, (_, i) => i);
}

const ALGORITHMS = {
  bubble: {
    name: 'Bubble Sort',
    category: 'sorting',
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
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
      return steps;
    },
  },

  selection: {
    name: 'Selection Sort',
    category: 'sorting',
    complexity: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
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
      return steps;
    },
  },

  insertion: {
    name: 'Insertion Sort',
    category: 'sorting',
    complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
    blurb: 'Builds a sorted region from the left. Each new item is picked up and shifted left into its correct place among the already-sorted items.',
    run(input) {
      const arr = [...input];
      const n = arr.length;
      const steps = [];
      let comparisons = 0;
      let moves = 0;
      const sorted = new Set([0]);

      steps.push(makeStep(arr, { sorted: [0] }, 'Starting Insertion Sort. First item is trivially sorted.', { pass: 0, comparisons, swaps: moves }));

      for (let i = 1; i < n; i++) {
        const pass = i;
        const key = arr[i];
        let j = i - 1;
        steps.push(makeStep(arr, { active: [i], sorted: [...sorted] }, `Pass ${pass}: pick up ${key} (index ${i}) to insert.`, { pass, comparisons, swaps: moves }));
        while (j >= 0) {
          comparisons++;
          steps.push(makeStep(arr, { compare: [j, j + 1], sorted: [...sorted] }, `Compare ${key} with ${arr[j]}`, { pass, comparisons, swaps: moves }));
          if (arr[j] > key) {
            arr[j + 1] = arr[j];
            moves++;
            steps.push(makeStep(arr, { swap: [j + 1], sorted: [...sorted] }, `${arr[j + 1]} > ${key} → shift right`, { pass, comparisons, swaps: moves }));
            j--;
          } else {
            break;
          }
        }
        arr[j + 1] = key;
        for (let k = 0; k <= i; k++) sorted.add(k);
        steps.push(makeStep(arr, { sorted: [...sorted] }, `Insert ${key} at index ${j + 1}. Sorted region size ${i + 1}.`, { pass, comparisons, swaps: moves }, { passEnd: true }));
      }
      steps.push(makeStep(arr, { sorted: allIndices(n) }, 'Array fully sorted.', { pass: null, comparisons, swaps: moves }, { final: true }));
      return steps;
    },
  },

  linear: {
    name: 'Linear Search',
    category: 'searching',
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
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
          return steps;
        }
        steps.push(makeStep(arr, { active: [i] }, `arr[${i}] = ${arr[i]} ≠ ${target}. Keep searching.`, { comparisons }));
      }
      steps.push(makeStep(arr, {}, `Reached the end. ${target} was not found.`, { comparisons }, { final: true }));
      return steps;
    },
  },

  binary: {
    name: 'Binary Search',
    category: 'searching',
    complexity: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
    blurb: 'Requires a sorted array. Repeatedly checks the middle of the remaining range and discards the half that cannot contain the target.',
    needsTarget: true,
    needsSorted: true,
    run(input, target) {
      const arr = [...input].sort((a, b) => a - b);
      const steps = [];
      let comparisons = 0;
      let lo = 0;
      let hi = arr.length - 1;
      steps.push(makeStep(arr, { range: [lo, hi] }, `Searching sorted array for ${target}. Range: index ${lo}–${hi}.`, { comparisons }));
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        comparisons++;
        if (arr[mid] === target) {
          steps.push(makeStep(arr, { found: mid, range: [lo, hi] }, `arr[${mid}] = ${arr[mid]} matches ${target}. Found!`, { comparisons }, { final: true }));
          return steps;
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
      return steps;
    },
  },
};
