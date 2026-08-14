/* Reviewed, display-ready teaching bridges for the eleven released Module 2–4 checkpoints. */
const ITCC47CheckpointCompanions = (() => {
  const entries = {
    'm2-arrays': {
      mentalModel: 'An array gives every value a numbered slot. Traversal turns those slots into a repeatable left-to-right process: inspect one valid index, update an accumulator or decision, then advance.',
      vocabulary: [['index','A zero-based slot number.'],['length','The number of logical values.'],['traversal','Visiting every required position exactly as the algorithm specifies.']],
      workedTrace: [['Start','values = [6, 2, 9], total = 0','No slot has been processed.'],['i = 0','total = 6','Read values[0].'],['i = 1','total = 8','Accumulate values[1].'],['i = 2','total = 17','The final valid index is length - 1.']],
      invariants: ['Before each iteration, total contains exactly values[0..i-1].','Every access satisfies 0 ≤ i < length.','A full traversal is O(n) time and O(1) extra space.'],
      misconceptions: ['The last valid index is length - 1, not length.','A list of related values still needs an explicit rule for which positions are processed.'],
      selfChecks: [['Why does a loop stop before i = length?','Because values[length] is outside the array.'],['What must total mean before the first iteration?','It summarizes the empty processed prefix, so its additive identity is 0.']],
    },
    'm2-linear-search': {
      mentalModel: 'Linear search grows a scanned prefix. At each step values[i] is the only undecided candidate; a match returns immediately, while a failed comparison moves that slot into the scanned region.',
      vocabulary: [['target','The value being sought.'],['scanned prefix','Positions already proven not to be the first match.'],['sentinel result','A value such as -1 that means not found.']],
      workedTrace: [['i = 0','[4] vs target 7 → false','Index 0 becomes scanned.'],['i = 1','[1] vs 7 → false','The remaining region shrinks.'],['i = 2','[7] vs 7 → true','Return 2 immediately.']],
      invariants: ['No position before i contains an earlier match.','i always names the next unscanned position.','Best case O(1); worst case O(n); extra space O(1).'],
      misconceptions: ['Not found is a result, not a crash.','Sorting is not required for linear search.'],
      selfChecks: [['When can the algorithm safely return -1?','Only after every valid position has failed the equality check.'],['What changes after a failed comparison?','The scanned boundary advances by one.']],
    },
    'm2-binary-search': {
      mentalModel: 'Binary search owns an active sorted range. low and high describe every position that can still contain the answer; mid supplies one comparison that justifies discarding a whole half.',
      vocabulary: [['low / high','The active range boundaries.'],['mid','The current probe index.'],['lower / upper bound','The first position ≥ target and the first position > target.']],
      workedTrace: [['[0, 7)','mid = 3, value 4','4 is not below target 4, so lower-bound high becomes 3.'],['[0, 3)','mid = 1, value 4','Keep index 1 as a candidate.'],['[0, 1)','mid = 0, value 2','2 is below 4, so low becomes 1.'],['[1, 1)','lower = 1','The half-open range is empty and the loop exits.']],
      invariants: ['The data is sorted before the search begins.','Every possible boundary remains inside [low, high).','Each comparison halves the range: O(log n) time and O(1) iterative space.'],
      misconceptions: ['Finding one equal value does not find the full duplicate range.','high may equal length when it is an exclusive boundary.'],
      selfChecks: [['Why does lower bound continue after equality?','An earlier equal value may still exist to the left.'],['What does lower = upper mean?','The target occupies an empty range and is absent.']],
    },
    'm2-bubble-sort': {
      mentalModel: 'Bubble Sort compares one adjacent pair, values[j] and values[j + 1]. A swap repairs that local inversion; one complete pass places the largest remaining value at the unsorted boundary.',
      vocabulary: [['adjacent pair','Two neighboring positions j and j + 1.'],['inversion','A left value larger than its right neighbor.'],['swapped','A pass flag that records whether any exchange occurred.']],
      workedTrace: [['j = 0','[5, 2, 4] → [2, 5, 4]','5 > 2, so swap.'],['j = 1','[2, 5, 4] → [2, 4, 5]','5 > 4, so swap.'],['pass end','unsorted boundary moves left','5 is fixed at the end.'],['next pass','2 ≤ 4, no swap','An all-false pass permits early exit.']],
      invariants: ['After each pass, the suffix beyond the boundary is sorted and final.','The active comparison always uses valid adjacent indices.','Average/worst O(n²), best O(n) with early exit, O(1) space.'],
      misconceptions: ['One swap does not finish a pass.','The boundary shrinks only after the pass has examined its adjacent pairs.'],
      selfChecks: [['Why track swapped?','A pass with no swaps proves the remaining prefix is already sorted.'],['Which value becomes final after a pass?','The largest value still inside that pass’s unsorted region.']],
    },
    'm2-selection-sort': {
      mentalModel: 'Selection Sort separates searching from placement. minIndex remembers the best candidate while j scans the unsorted region; only after that search ends does one placement swap occur.',
      vocabulary: [['minIndex','Index of the smallest value seen in the active search.'],['j','The candidate currently being compared.'],['sorted prefix','Positions already assigned their final minimum.']],
      workedTrace: [['i = 0','minIndex = 0 (7)','Start the search at the boundary.'],['j = 1','3 < 7 → minIndex = 1','A new minimum candidate is selected.'],['j = 2','5 < 3 → false','Keep minIndex = 1.'],['loop exit','swap indices 0 and 1','Placement happens after the full search.']],
      invariants: ['Before placement, minIndex names the smallest value in values[i..j].','The prefix values[0..i-1] is final.','Selection Sort makes Θ(n²) comparisons and uses O(1) extra space.'],
      misconceptions: ['Do not swap every time a smaller candidate appears.','minIndex is an index; the visualized cell supplies its value.'],
      selfChecks: [['Why can placement wait until the inner loop exits?','minIndex is not final until every candidate in the region has been checked.'],['Does an already sorted input remove comparisons?','No. Standard Selection Sort still scans each remaining region.']],
    },
    'm2-insertion-sort': {
      mentalModel: 'Insertion Sort lifts one complete key record out of the array, leaving a hole. Larger records shift right until the hole reaches the key’s stable insertion position.',
      vocabulary: [['key','The held value or record being inserted.'],['hole','The open destination created by lifting the key.'],['stable','Equal-key records keep their original relative order.']],
      workedTrace: [['i = 1','hold P1·B; hole = 1','The record identity leaves the array temporarily.'],['j = 0','P2 > P1 → true','Shift P2·A right.'],['j = -1','loop condition false','The hole is now at index 0.'],['insert','[P1·B, P2·A]','Place the held record without splitting identity from priority.']],
      invariants: ['Before iteration i, records[0..i-1] is sorted and stable.','Only strictly larger priorities shift; equals do not cross.','Best O(n), average/worst O(n²), O(1) extra space.'],
      misconceptions: ['The key is outside the array while shifts occur.','Using ≥ instead of > can destroy stability.'],
      selfChecks: [['Why shift records instead of swapping the key repeatedly?','Shifting preserves one explicit hole and makes the insertion point visible.'],['What proves equal priorities remain stable?','The WHILE condition is strict greater-than.']],
    },
    'm2-array-mutation': {
      mentalModel: 'Indexed insertion creates a hole and shifts a suffix right; removal holds the removed value and shifts a suffix left. Logical size changes only after storage has been made consistent.',
      vocabulary: [['logical size','How many positions currently belong to the list.'],['shift source / destination','The occupied slot being copied and the neighboring hole.'],['target index','The position whose meaning the operation must establish or remove.']],
      workedTrace: [['insert index 2','[18, 7, 31, 12, _]','Reserve one extra slot.'],['i = 3','move 12: 3 → 4','The hole moves left.'],['i = 2','move 31: 2 → 3','Index 2 becomes open.'],['store','[18, 7, 24, 31, 12]','Move the held value into the target.']],
      invariants: ['Occupied logical slots remain contiguous after the operation.','A right shift runs from the tail toward the target; a left shift runs forward.','End operations can be O(1); interior mutations are O(n), with O(1) extra space.'],
      misconceptions: ['Forward shifting during insertion overwrites values before they move.','The removed value is still meaningful even after its old slot is filled.'],
      selfChecks: [['Why does insertion shift backward?','Each source must be read before its destination can overwrite it.'],['When is no shifting needed?','Insertion at the logical end or removal of the last logical item.']],
    },
    'm3-linked-foundations': {
      mentalModel: 'A linked list is a reachable chain of node identities. current moves by reading current.next; visual proximity never substitutes for an explicit stored reference.',
      vocabulary: [['head','The reference that makes the first node reachable.'],['current','The traversal reference for the node being inspected.'],['next','A stored reference to another node or NULL.']],
      workedTrace: [['start','current = head = node:A','No node has been visited.'],['visit A','WRITE A.value','A joins the visited region.'],['advance','current = node:B','Follow A.next exactly.'],['after tail','current = NULL','The loop exits without dereferencing NULL.']],
      invariants: ['Visited nodes are exactly the prefix before current.','Following next from head never revisits a node in a cycle-free list.','Traversal is O(n); direct array indexing is O(1), but linked positional access is O(n).'],
      misconceptions: ['Node identity is not the same as its payload value.','Cards drawn beside each other are linked only when an edge says so.'],
      selfChecks: [['What makes a detached node unreachable?','No reference reachable from head points to it.'],['Why check current <> NULL before current.value?','NULL has no payload field to read.']],
    },
    'm3-linked-mutation': {
      mentalModel: 'Linked mutation is an ordered set of pointer writes. Preserve every needed successor before replacing an edge, then check reachability, sorted order, and cycle freedom after each stage.',
      vocabulary: [['previous','The node immediately before current in the active traversal.'],['newNode','A newly allocated identity not yet reachable from head.'],['detached node','An allocated identity outside the chain reachable from head.']],
      workedTrace: [['find gap','previous = node:B, current = node:C','Both sides of the insertion point are preserved.'],['allocate','newNode = node:D','The new identity is detached.'],['write 1','newNode.next = current','The suffix becomes reachable from newNode.'],['write 2','previous.next = newNode','The new node joins the head-reachable chain.']],
      invariants: ['Every live node that should remain in the list is reachable from head.','No next chain revisits an earlier identity.','Sorted mutations preserve nondecreasing payload order; search plus mutation is O(n), local writes are O(1).'],
      misconceptions: ['Clearing target.next before bypassing target can lose the suffix.','Updating a sorted key may require relocating the same node identity.'],
      selfChecks: [['Which sorted-insert pointer write happens first?','newNode.next receives current before previous.next changes.'],['How is singleton deletion recognized?','current is head, previous is NULL, and head becomes current.next (NULL).']],
    },
    'm4-stack': {
      mentalModel: 'A stack exposes one end: top. PUSH adds there, PEEK reads there, and POP removes there. This last-in-first-out constraint is exactly what nested syntax and postfix evaluation need.',
      vocabulary: [['top','The only directly accessible stack item.'],['underflow','Trying to read or remove when the stack is empty.'],['operand order','For an operator, pop right first and left second.']],
      workedTrace: [['token 5','push 5','Stack: [5].'],['token 2','push 2','Stack: [5, 2].'],['token -','right = 2; left = 5','Order comes from two distinct pops.'],['apply','push 5 - 2 = 3','One result replaces two operands.']],
      invariants: ['size 0 means top is unavailable and POP/PEEK must report underflow.','A delimiter closer must match the most recent unmatched opener.','Each stack operation is O(1); whole token scans are O(n) with O(n) worst-case stack space.'],
      misconceptions: ['Equal opener/closer counts do not prove correct nesting.','For subtraction and division, reversing left and right changes the result.'],
      selfChecks: [['Why does ([)] fail despite equal counts?','The ) does not match [ at the top.'],['What must remain after a valid postfix scan?','Exactly one result value.']],
    },
    'm4-queue-deque': {
      mentalModel: 'A queue serves the front and admits at the back; a deque deliberately exposes both ends. Logical order is independent of physical circular-array indices, so wraparound never changes FIFO behavior.',
      vocabulary: [['front / back','The removal/next-service end and the newest-arrival end.'],['re-enqueue','Put unfinished work back after everyone already waiting.'],['deque (deck)','A double-ended queue with four O(1) end operations.']],
      workedTrace: [['queue full','front index 0, back index 2','Logical order A, B, C.'],['dequeue','remove A; front index 1','B is now first.'],['enqueue D','back = (2 + 1) mod 3 = 0','The physical index wraps.'],['result','logical order B, C, D','FIFO order did not wrap or reverse.']],
      invariants: ['When size is 0, front and back do not identify an item.','Round-robin work is re-enqueued only when remaining > 0.','Queue/deque end operations are O(1); stored items use O(n) space.'],
      misconceptions: ['A deque does not permit arbitrary middle removal.','A shorter later job does not move ahead in a FIFO queue.'],
      selfChecks: [['Why can back index be numerically less than front index?','Circular storage wraps while logical order continues.'],['When does round-robin skip re-enqueueing?','When the process has no remaining work.']],
    },
  };

  function freezeCompanion(companion) {
    return Object.freeze({ ...companion,
      vocabulary: Object.freeze(companion.vocabulary.map((row) => Object.freeze([...row]))),
      workedTrace: Object.freeze(companion.workedTrace.map((row) => Object.freeze([...row]))),
      invariants: Object.freeze([...companion.invariants]), misconceptions: Object.freeze([...companion.misconceptions]),
      selfChecks: Object.freeze(companion.selfChecks.map((row) => Object.freeze([...row]))),
    });
  }
  const byId = new Map(Object.entries(entries).map(([id, companion]) => [id, freezeCompanion(companion)]));
  function get(checkpointId) { return byId.get(checkpointId) || null; }
  function validate() {
    const failures = [];
    for (const [id, companion] of byId) {
      if (!companion.mentalModel || companion.vocabulary.length < 3 || companion.workedTrace.length < 3) failures.push(`${id}: incomplete teaching bridge`);
      if (companion.invariants.length < 3 || companion.misconceptions.length < 2 || companion.selfChecks.length !== 2) failures.push(`${id}: incomplete reflection content`);
    }
    return Object.freeze(failures);
  }
  return Object.freeze({ checkpointIds: Object.freeze([...byId.keys()]), get, validate });
})();
