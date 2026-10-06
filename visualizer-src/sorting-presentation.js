/* Pure projections of the selected immutable event. No sorting work happens here. */
export function listFor(frame, tag) {
  if (tag?.kind !== 'REFERENCE') return null;
  return { id: tag.objectId, items: frame.objects[tag.objectId].map(id => frame.items[id]) };
}
export function numberFor(tag) { return tag?.kind === 'INTEGER' ? tag.value : null; }
export function mergeModel(frame) {
  const local = frame.focus.locals;
  if (frame.focus.function === 'merge_sort' && ['returning', 'completed'].includes(frame.focus.status)) {
    return { kind: 'returned', returned: listFor(frame, frame.focus.returnValue) };
  }
  if (frame.focus.function === 'merge') return { kind: 'merge', left: listFor(frame, local.left), right: listFor(frame, local.right),
    result: listFor(frame, local.result), i: numberFor(local.i), j: numberFor(local.j) };
  if (frame.focus.function === 'merge_sort') return { kind: 'split', values: listFor(frame, local.values), mid: numberFor(local.mid),
    left: listFor(frame, local.left), right: listFor(frame, local.right) };
  return { kind: 'driver', result: listFor(frame, frame.driver.locals.answer), returned: listFor(frame, frame.callResult) };
}
export function quickModel(frame, fixture) {
  const local = frame.focus.locals;
  const array = listFor(frame, { kind: 'REFERENCE', objectId: frame.originalIds[0] });
  const low = numberFor(local.low), high = numberFor(local.high);
  const partition = frame.partition;
  const i = numberFor(local.i), j = numberFor(local.j);
  const regions = [];
  if (partition && low !== null && high !== null && i !== null) {
    if (Number.isInteger(partition.placed)) {
      regions.push({ start: low, end: partition.placed - 1, label: '≤ pivot', tone: 'less' },
        { start: partition.placed, end: partition.placed, label: 'Pivot placed', tone: 'pivot' },
        { start: partition.placed + 1, end: high, label: '> pivot', tone: 'greater' });
    } else {
      const next = partition.nextUnexamined ?? low;
      regions.push({ start: low, end: partition.committedI, label: '≤ pivot', tone: 'less' },
        { start: partition.committedI + 1, end: next - 1, label: '> pivot · examined', tone: 'greater' },
        { start: next, end: high - 1, label: 'Unexamined', tone: 'unexamined' },
        { start: high, end: high, label: 'Pivot · excluded from scan', tone: 'pivot' });
    }
  }
  return { array, low, high, i, j, regions, partition, pivot: numberFor(local.pivot),
    helper: fixture.mode === 'helper', completed: frame.outcome === 'completed' };
}
export function questionsFor(fixture) {
  const events = fixture.events;
  const at = predicate => events.find(predicate)?.eventId;
  const merge = fixture.program === 'merge';
  const questions = merge ? [
    { id: 'head', at: at(e => e.kind === 'COMPARE_HEADS' && !e.frame.comparison.result),
      question: 'Which head is appended after this false comparison?', answer: 'The right head',
      options: ['The left head', 'The right head'], explanation: 'The actual expression left[i] <= right[j] is false, so the right head is the smaller remaining key.' },
    { id: 'drain', at: at(e => e.kind === 'DRAIN_REMAINDER'), question: 'Does draining need another key comparison?',
      answer: 'No', options: ['No', 'Yes'], explanation: 'One run is exhausted. Copy the remaining values without reading a nonexistent head.' },
    { id: 'returned', at: at(e => e.kind === 'RETURN_READY' && (e.frame.focus.function === 'merge' || e.frame.focus.parent === 'driver')), question: 'Has this returned run rewritten the original input?',
      answer: 'No', options: ['No', 'Yes'], explanation: 'Slicing and append copy references into separate containers. A locally sorted run is still combined by its parent.' },
    { id: 'tie', at: at(e => e.kind === 'COMPARE_HEADS' && e.frame.comparison.left === e.frame.comparison.right),
      question: 'Both heads have equal keys. Which occurrence comes first?', answer: 'The left occurrence', options: ['The left occurrence', 'The right occurrence'],
      explanation: 'The source uses <=. Taking the left occurrence preserves the input order of equal keys; identity badges never participate in comparison.' },
    { id: 'local', at: at(e => e.kind === 'RETURN_READY' && e.frame.focus.function === 'merge' && e.frame.stack.length > 2),
      question: 'Are the items in this returned run already at their final global positions?', answer: 'No', options: ['No', 'Yes'],
      explanation: 'The run is locally sorted. A parent merge can interleave its items with the sibling run, so they are not fixed in the final array yet.' },
  ] : [
    { id: 'rejected', at: at(e => e.kind === 'COMPARE_TO_PIVOT' && !e.frame.comparison.result),
      question: 'Does this rejected comparison cause a swap?', answer: 'No', options: ['No', 'Yes'],
      explanation: 'The value is greater than the pivot. The scan continues without advancing i or executing the swap statement.' },
    { id: 'partitioned', at: at(e => e.kind === 'PIVOT_PLACE'), question: 'Does placing this pivot prove that both sides are sorted?',
      answer: 'No', options: ['No', 'Yes'], explanation: 'Only this pivot is placed for its range. In full mode, the left range runs first, then the right; there is no merge.' },
    { id: 'self', at: at(e => e.kind === 'SELF_SWAP' || e.kind === 'PIVOT_PLACE' && e.frame.operation.a === e.frame.operation.b),
      question: 'Does a self-swap count as a distinct-position exchange?', answer: 'No', options: ['No', 'Yes'],
      explanation: 'The tuple assignment executes, but both indices are the same. Swaps here counts only exchanges between different positions.' },
    { id: 'ranges', at: fixture.mode === 'full' ? at(e => e.kind === 'PIVOT_PLACE') : null,
      question: 'Which recursive ranges follow the placed pivot?', answer: 'Left, then right; both exclude the pivot',
      options: ['Left, then right; both exclude the pivot', 'Sort the whole range again'],
      explanation: 'The source calls [low, pivot_index - 1] first, then [pivot_index + 1, high]. For the default root pivot at 4, these are [0, 3] and [5, 7].' },
    { id: 'skew', at: ['sorted', 'reverse', 'all-equal-eight'].includes(fixture.fixtureId) ? at(e => e.kind === 'PIVOT_PLACE') : null,
      question: 'Does this version change its pivot policy to rescue an unbalanced partition?', answer: 'No', options: ['No', 'Yes'],
      explanation: 'The last-element rule stays fixed. These eight-key inputs repeatedly leave a range of size n - 1, producing 28 key comparisons and peak function depth 8.' },
    { id: 'none', at: at(e => e.kind === 'RETURN_READY' && e.frame.focus.function === 'quick_sort' && e.frame.focus.parent === 'driver'),
      question: 'What does quick_sort return to its caller?', answer: 'None; the shared list changed',
      options: ['None; the shared list changed', 'A separate sorted list'],
      explanation: 'There is no explicit return value in quick_sort. Python returns None; the driver then prints the list that was sorted in place.' },
  ];
  return questions.filter(q => q.at);
}
