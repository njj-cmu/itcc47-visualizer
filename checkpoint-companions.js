/* Reviewed, display-ready teaching bridges for checkpoints that need a lecture companion. */
const ITCC47CheckpointCompanions = (() => {
  const entries = {
    'm3-linked-foundations': {
      mentalModel: 'Until now, we mostly organized data according to where it sits. From this point onward, we begin organizing data according to what it is connected to. A Recent Documents list makes that change concrete: the same document identity can occupy an indexed position or participate in an explicit neighbor relationship.',
      thesis: 'DATA + REFERENCES = STRUCTURE',
      vocabulary: [
        ['position / index', 'A numbered slot used to locate an item in an indexed list.'],
        ['node identity', 'The stable identity of one record, separate from its filename and visual position.'],
        ['prev / next', 'Stored references that name the neighboring nodes in a doubly linked order.'],
        ['head-reachable order', 'The logical sequence obtained by starting at head and repeatedly following next.'],
      ],
      codeComparison: {
        language: 'python',
        lines: ['recent.remove(document)', 'recent.insert(0, document)'],
        note: 'For only five recent files, this simple Python-list implementation is probably the sensible choice. The visualization opens the abstraction so you can see the shifts that the list performs.',
      },
      workedTrace: [
        ['Start', '[Grades, Syllabus, Attendance, Module3, Notes]', 'Attendance.xlsx is the existing record that was opened.'],
        ['Indexed removal', 'hold Attendance; shift Module3 and Notes left', 'The hole closes without duplicating the document identity.'],
        ['Indexed front insert', 'shift Notes, Module3, Syllabus, Grades right', 'Six total shifts open index 0, then one placement stores Attendance.'],
        ['Linked detach', 'Syllabus.next = Module3; Module3.prev = Syllabus', 'Attendance becomes detached while the remaining head-reachable chain stays reciprocal.'],
        ['Linked attach', 'Attendance ⇄ Grades; head = Attendance', 'Six pointer writes produce the same final logical order.'],
      ],
      invariants: [
        'The five stable document identities appear exactly once in the final logical order.',
        'Every reachable next relation agrees with the target node’s prev relation.',
        'head.prev = NULL and tail.next = NULL.',
        'Grades, Syllabus, Module3, and Notes retain their relative order.',
        'Lookup cost is separate from local mutation cost: finding Attendance from head is O(n) without another index.',
      ],
      misconceptions: [
        'A linked list is not automatically faster; for five recent files, a Python list is likely simpler.',
        'Moving a record card means moving a reference or record between slots, not copying the actual file on disk.',
        'A folder hierarchy is a tree, not an “advanced linked list.”',
        'Visual adjacency does not create a link; only a stored reference does.',
      ],
      selfChecks: [
        ['Why is the complete linked operation still O(n) when only six pointer writes are shown?', 'Because those local writes assume the Attendance node is already known. Finding it by filename from head still requires traversal without a separate lookup map.'],
        ['What proves the detached Attendance node has not disappeared?', 'Its stable identity and fields still exist; it is merely outside the chain reachable by following next from head.'],
      ],
      referenceProgression: {
        intro: 'These are related mental models, not a claim that each structure is literally implemented from the previous one. A folder structure belongs to the tree model because it expresses parent and child relationships.',
        items: [
          { structure: 'Array', question: 'Where is the data?', reference: 'Position / index' },
          { structure: 'Linked list', question: 'What comes before or after this?', reference: 'Neighbor references' },
          { structure: 'Tree', question: 'What belongs underneath this?', reference: 'Parent / child references' },
          { structure: 'Graph', question: 'What is this connected to?', reference: 'Arbitrary relationships' },
        ],
      },
    },
  };

  function freezeRows(rows) { return Object.freeze(rows.map((row) => Object.freeze([...row]))); }
  function freezeCompanion(companion) {
    const progression = companion.referenceProgression ? Object.freeze({
      ...companion.referenceProgression,
      items: Object.freeze(companion.referenceProgression.items.map((item) => Object.freeze({ ...item }))),
    }) : null;
    const codeComparison = companion.codeComparison ? Object.freeze({
      ...companion.codeComparison, lines: Object.freeze([...companion.codeComparison.lines]),
    }) : null;
    return Object.freeze({
      ...companion,
      vocabulary: freezeRows(companion.vocabulary),
      workedTrace: freezeRows(companion.workedTrace),
      invariants: Object.freeze([...companion.invariants]),
      misconceptions: Object.freeze([...companion.misconceptions]),
      selfChecks: freezeRows(companion.selfChecks),
      referenceProgression: progression,
      codeComparison,
    });
  }

  const byId = new Map(Object.entries(entries).map(([id, companion]) => [id, freezeCompanion(companion)]));
  function get(checkpointId) { return byId.get(checkpointId) || null; }
  function validate() {
    const failures = [];
    for (const [id, companion] of byId) {
      if (!companion.mentalModel || !companion.thesis || companion.vocabulary.length < 4 || companion.workedTrace.length < 4) failures.push(`${id}: incomplete teaching bridge`);
      if (companion.invariants.length < 5 || companion.misconceptions.length < 4 || companion.selfChecks.length !== 2) failures.push(`${id}: incomplete reflection content`);
      if (companion.referenceProgression) {
        const structures = companion.referenceProgression.items.map((item) => item.structure);
        if (!companion.referenceProgression.intro || structures.join(',') !== 'Array,Linked list,Tree,Graph'
          || companion.referenceProgression.items.some((item) => !item.question || !item.reference)) failures.push(`${id}: invalid reference progression`);
      }
      if (companion.codeComparison && (!companion.codeComparison.language || companion.codeComparison.lines.length < 2 || !companion.codeComparison.note)) failures.push(`${id}: invalid code comparison`);
    }
    return Object.freeze(failures);
  }

  return Object.freeze({ checkpointIds: Object.freeze([...byId.keys()]), get, validate });
})();
