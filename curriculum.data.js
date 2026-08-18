/* GENERATED FILE — edit curriculum.public.json, then run node tools/build-curriculum.js. */
const ITCC47_CURRICULUM_DATA = {
  "schemaVersion": 2,
  "contentVersion": "2026.08-practice-only",
  "courseId": "itcc47",
  "clos": [
    {
      "id": 1,
      "statement": "Explain the concept of data organization on applications and systems in general."
    },
    {
      "id": 2,
      "statement": "Analyze algorithms and quantify their efficiency for arbitrary inputs and outputs."
    },
    {
      "id": 3,
      "statement": "Write pseudocode and interpret it in a chosen programming language."
    },
    {
      "id": 4,
      "statement": "Implement data structures and algorithms that sufficiently solve programming problems."
    },
    {
      "id": 5,
      "statement": "Improve algorithm efficiency when creating program solutions."
    },
    {
      "id": 6,
      "statement": "Implement and modify a data structure according to the objects or items stored."
    }
  ],
  "modules": [
    {
      "id": "m1",
      "number": 1,
      "title": "Algorithmic Thinking",
      "cloIds": [
        1,
        2,
        3
      ]
    },
    {
      "id": "m2",
      "number": 2,
      "title": "Arrays, Lists, Searching, and Sorting",
      "cloIds": [
        1,
        2,
        3,
        4,
        5
      ]
    },
    {
      "id": "m3",
      "number": 3,
      "title": "Linked Lists",
      "cloIds": [
        1,
        2,
        3,
        4,
        6
      ]
    },
    {
      "id": "m4",
      "number": 4,
      "title": "Stacks, Queues, and Deques",
      "cloIds": [
        2,
        3,
        4,
        5,
        6
      ]
    },
    {
      "id": "m5",
      "number": 5,
      "title": "Recursion and Divide-and-Conquer",
      "cloIds": [
        4,
        5,
        6
      ]
    },
    {
      "id": "m6",
      "number": 6,
      "title": "Trees and Binary Search Trees",
      "cloIds": [
        1,
        2,
        4,
        5,
        6
      ]
    },
    {
      "id": "m7",
      "number": 7,
      "title": "Graphs, BFS, DFS, and Shortest Paths",
      "cloIds": [
        1,
        2,
        4,
        5,
        6
      ]
    },
    {
      "id": "m8",
      "number": 8,
      "title": "Greedy Algorithms and Dynamic Programming",
      "cloIds": [
        2,
        3,
        4,
        5
      ]
    }
  ],
  "checkpoints": [
    {
      "id": "orientation",
      "moduleId": "m1",
      "order": 0,
      "reviewStatus": "reviewed",
      "title": "Course orientation and exact checking",
      "summary": "Learn how the local checker treats input, output, and practice evidence.",
      "goals": [
        "Interpret private practice feedback",
        "Run an exact-output sample",
        "Know which tools work offline"
      ],
      "prerequisiteIds": [],
      "sequence": [
        "tool:writer",
        "tool:tracer"
      ]
    },
    {
      "id": "m1-ipo",
      "moduleId": "m1",
      "order": 10,
      "reviewStatus": "reviewed",
      "title": "Input, process, and output",
      "summary": "Turn a problem statement into precise inputs, ordered work, and exact results.",
      "goals": [
        "Identify inputs and required output",
        "Clarify vague rules and boundaries",
        "Order decisions before coding"
      ],
      "prerequisiteIds": [
        "orientation"
      ],
      "sequence": [
        "tool:writer",
        "problem:sum-two",
        "problem:delivery-fee"
      ]
    },
    {
      "id": "m1-pseudocode",
      "moduleId": "m1",
      "order": 20,
      "reviewStatus": "reviewed",
      "title": "Pseudocode and control flow",
      "summary": "Express decisions and repetition in a consistent, executable pseudocode language.",
      "goals": [
        "Use READ, WRITE, assignment, IF, CASE, FOR, and WHILE",
        "Keep branches complete",
        "Translate a plain-language algorithm"
      ],
      "prerequisiteIds": [
        "m1-ipo"
      ],
      "sequence": [
        "tool:writer",
        "tool:tracer",
        "problem:library-fine"
      ]
    },
    {
      "id": "m1-tracing",
      "moduleId": "m1",
      "order": 30,
      "reviewStatus": "reviewed",
      "title": "Manual tracing",
      "summary": "Follow state changes line by line before trusting the final program.",
      "goals": [
        "Build a trace table",
        "Locate the first incorrect state",
        "Explain why a loop stops"
      ],
      "prerequisiteIds": [
        "m1-pseudocode"
      ],
      "sequence": [
        "tool:tracer",
        "problem:parking-fee"
      ]
    },
    {
      "id": "m1-exact-io",
      "moduleId": "m1",
      "order": 40,
      "reviewStatus": "reviewed",
      "title": "Exact input and output",
      "summary": "Treat capitalization, spacing, ordering, and omitted prompts as part of correctness.",
      "goals": [
        "Match an output contract character for character",
        "Separate debug traces from final output",
        "Test boundary inputs"
      ],
      "prerequisiteIds": [
        "m1-tracing"
      ],
      "sequence": [
        "problem:package-class"
      ]
    },
    {
      "id": "m1-complexity",
      "moduleId": "m1",
      "order": 50,
      "reviewStatus": "reviewed",
      "title": "Complexity basics",
      "summary": "Connect input size and operation counts to common growth classes.",
      "goals": [
        "Identify O(1), O(log n), O(n), and O(n^2)",
        "Count loop work",
        "Separate best and worst cases"
      ],
      "prerequisiteIds": [
        "m1-exact-io"
      ],
      "sequence": [
        "tool:tracer",
        "problem:reward-points",
        "problem:CH01-PS05"
      ]
    },
    {
      "id": "m2-arrays",
      "moduleId": "m2",
      "order": 60,
      "reviewStatus": "reviewed",
      "title": "Arrays, lists, and traversal",
      "summary": "Store related values together and process them by position or by traversal.",
      "goals": [
        "Use a collection for related values",
        "Traverse every element",
        "Aggregate, filter, and detect duplicates"
      ],
      "prerequisiteIds": [
        "m1-complexity"
      ],
      "sequence": [
        "problem:array-total",
        "problem:largest-value",
        "problem:has-duplicate"
      ]
    },
    {
      "id": "m2-linear-search",
      "moduleId": "m2",
      "order": 70,
      "reviewStatus": "reviewed",
      "title": "Linear search",
      "summary": "Inspect values in order while separating scanned and remaining positions.",
      "goals": [
        "Trace values[i] against a target",
        "Handle not-found results",
        "Explain O(n) worst-case work"
      ],
      "prerequisiteIds": [
        "m2-arrays"
      ],
      "sequence": [
        "activity:linear-search",
        "problem:linear-position"
      ]
    },
    {
      "id": "m2-binary-search",
      "moduleId": "m2",
      "order": 80,
      "reviewStatus": "reviewed",
      "title": "Binary search and duplicate ranges",
      "summary": "Maintain low, mid, and high boundaries on sorted data and deliberately discard one half.",
      "goals": [
        "State the sorted-data precondition",
        "Trace low/mid/high",
        "Find lower and upper duplicate bounds"
      ],
      "prerequisiteIds": [
        "m2-linear-search"
      ],
      "sequence": [
        "activity:binary-search",
        "activity:binary-range-search",
        "problem:binary-checks"
      ]
    },
    {
      "id": "m2-bubble-sort",
      "moduleId": "m2",
      "order": 90,
      "reviewStatus": "reviewed",
      "title": "Bubble Sort",
      "summary": "Compare adjacent values, swap when needed, and shrink the unsorted boundary.",
      "goals": [
        "Identify values[j] and values[j + 1]",
        "Track swapped",
        "Explain early stopping"
      ],
      "prerequisiteIds": [
        "m2-arrays"
      ],
      "sequence": [
        "activity:bubble-sort"
      ]
    },
    {
      "id": "m2-selection-sort",
      "moduleId": "m2",
      "order": 100,
      "reviewStatus": "reviewed",
      "title": "Selection Sort",
      "summary": "Search the unsorted region for one minimum, then place it after the search completes.",
      "goals": [
        "Track minIndex and values[j]",
        "Separate candidate search from placement",
        "Explain the fixed comparison count"
      ],
      "prerequisiteIds": [
        "m2-bubble-sort"
      ],
      "sequence": [
        "activity:selection-sort"
      ]
    },
    {
      "id": "m2-insertion-sort",
      "moduleId": "m2",
      "order": 110,
      "reviewStatus": "reviewed",
      "title": "Insertion Sort and stability",
      "summary": "Hold a key outside the array, shift larger records, and insert into a growing sorted prefix.",
      "goals": [
        "Distinguish key, j, hole, and shifting value",
        "Preserve equal-key arrival order",
        "Explain best and worst cases"
      ],
      "prerequisiteIds": [
        "m2-selection-sort"
      ],
      "sequence": [
        "activity:insertion-sort",
        "activity:stable-insertion-dispatch"
      ]
    },
    {
      "id": "m2-array-mutation",
      "moduleId": "m2",
      "order": 120,
      "reviewStatus": "reviewed",
      "title": "Indexed array-list mutation",
      "summary": "Create or close a hole while preserving contiguous logical storage.",
      "goals": [
        "Trace shift source and destination",
        "Keep the held value separate",
        "Relate index to O(n) movement"
      ],
      "prerequisiteIds": [
        "m2-insertion-sort"
      ],
      "sequence": [
        "activity:array-list-insert",
        "activity:array-list-remove"
      ]
    },
    {
      "id": "m2-industry-workbench",
      "moduleId": "m2",
      "order": 125,
      "reviewStatus": "reviewed",
      "title": "Industry data integration",
      "summary": "Choose an algorithm for a realistic question, inspect compressed records, and connect every decision to its cost.",
      "goals": [
        "Reuse stable record identities across dataset views",
        "Explain compressed operations without hiding their cost",
        "Choose search, stable insertion, or indexed mutation from the question"
      ],
      "prerequisiteIds": [
        "m2-array-mutation"
      ],
      "sequence": [
        "activity:industry-sla-breach-scan",
        "activity:industry-priority-range-recall",
        "activity:industry-stable-priority-dispatch",
        "activity:industry-review-queue-mutation"
      ]
    },
    {
      "id": "m3-linked-foundations",
      "moduleId": "m3",
      "order": 130,
      "reviewStatus": "reviewed",
      "title": "Linked nodes and traversal",
      "summary": "Follow explicit references instead of assuming contiguous positions.",
      "goals": [
        "Identify node identity and next",
        "Trace head and current",
        "Compare array and linked storage"
      ],
      "prerequisiteIds": [
        "m2-industry-workbench"
      ],
      "sequence": [
        "activity:linked-list-traversal",
        "activity:array-linked-comparison",
        "problem:linked-node-count",
        "problem:linked-find-value"
      ]
    },
    {
      "id": "m3-linked-mutation",
      "moduleId": "m3",
      "order": 140,
      "reviewStatus": "reviewed",
      "title": "Linked-list mutation",
      "summary": "Allocate, reconnect, update, detach, and delete nodes without losing the reachable chain.",
      "goals": [
        "Perform pointer writes in a safe order",
        "Maintain sorted insertion",
        "Explain deletion invariants"
      ],
      "prerequisiteIds": [
        "m3-linked-foundations"
      ],
      "sequence": [
        "activity:linked-list-insert-head",
        "activity:linked-list-sorted-insert",
        "activity:linked-list-find-update",
        "activity:linked-list-delete"
      ]
    },
    {
      "id": "m4-stack",
      "moduleId": "m4",
      "order": 150,
      "reviewStatus": "reviewed",
      "title": "Stacks: LIFO operations and applications",
      "summary": "Use one last-in-first-out end for direct operations, expression evaluation, nested parsing, and reversible history.",
      "goals": [
        "Trace push, peek, and pop",
        "Evaluate postfix expressions with correct operand order",
        "Connect LIFO state to parsing and undo/redo"
      ],
      "prerequisiteIds": [
        "m3-linked-mutation"
      ],
      "sequence": [
        "activity:stack-lifo-basics",
        "activity:stack-postfix-evaluator",
        "activity:stack-delimiter-audit",
        "activity:stack-editor-undo"
      ]
    },
    {
      "id": "m4-queue-deque",
      "moduleId": "m4",
      "order": 160,
      "reviewStatus": "reviewed",
      "title": "Queues and deques: fair and two-ended access",
      "summary": "Preserve FIFO service with queues, then deliberately use both deque ends for candidate windows and priority rules.",
      "goals": [
        "Trace enqueue, front, and dequeue",
        "Re-enqueue unfinished scheduled work",
        "Distinguish deque front/back operations from arbitrary middle access",
        "Explain O(1) end-operation costs"
      ],
      "prerequisiteIds": [
        "m4-stack"
      ],
      "sequence": [
        "activity:queue-fifo-basics",
        "activity:queue-round-robin",
        "activity:queue-printer-jobs",
        "activity:deque-end-operations",
        "activity:deque-sliding-window",
        "activity:deque-service-lane"
      ]
    },
    {
      "id": "m5-recursion",
      "moduleId": "m5",
      "order": 170,
      "reviewStatus": "draft",
      "title": "Recursion and recursive search",
      "summary": "Track base cases, shrinking arguments, calls, and returns as explicit frames.",
      "goals": [
        "Identify a base case",
        "Trace recursive bounds",
        "Compare recursive and iterative space"
      ],
      "prerequisiteIds": [
        "m4-queue-deque"
      ],
      "sequence": [
        "activity:recursive-range-search"
      ]
    },
    {
      "id": "m5-divide-conquer",
      "moduleId": "m5",
      "order": 180,
      "reviewStatus": "draft",
      "title": "Divide-and-conquer and merge sort",
      "summary": "Split a range, solve smaller ranges, and merge stable results.",
      "goals": [
        "Trace a recursion tree",
        "Maintain stable merge order",
        "Connect work to O(n log n)"
      ],
      "prerequisiteIds": [
        "m5-recursion"
      ],
      "sequence": [
        "activity:stable-merge-sort"
      ]
    },
    {
      "id": "m6-trees",
      "moduleId": "m6",
      "order": 190,
      "reviewStatus": "draft",
      "title": "Trees and traversals",
      "summary": "Represent hierarchical relationships and visit nodes in deliberate orders.",
      "goals": [
        "Identify root, parent, child, and leaf",
        "Trace four traversals",
        "Use a queue for level order"
      ],
      "prerequisiteIds": [
        "m5-divide-conquer"
      ],
      "sequence": [
        "activity:tree-traversals"
      ]
    },
    {
      "id": "m6-bst",
      "moduleId": "m6",
      "order": 200,
      "reviewStatus": "draft",
      "title": "Binary search trees and height",
      "summary": "Follow ordering paths for insertion/search and relate shape to efficiency.",
      "goals": [
        "Trace insert and search paths",
        "Compute height",
        "Contrast balanced and skewed trees"
      ],
      "prerequisiteIds": [
        "m6-trees"
      ],
      "sequence": [
        "activity:bst-insert-search",
        "activity:bst-height-shape"
      ]
    },
    {
      "id": "m7-graphs",
      "moduleId": "m7",
      "order": 210,
      "reviewStatus": "draft",
      "title": "Graph representation",
      "summary": "Model vertices and edges with an adjacency list or matrix and justify the choice.",
      "goals": [
        "Distinguish directed and undirected edges",
        "Compare list and matrix storage",
        "Use deterministic neighbor order"
      ],
      "prerequisiteIds": [
        "m6-bst"
      ],
      "sequence": [
        "activity:graph-representation"
      ]
    },
    {
      "id": "m7-traversal",
      "moduleId": "m7",
      "order": 220,
      "reviewStatus": "draft",
      "title": "BFS, DFS, and shortest paths",
      "summary": "Track a frontier, visited set, predecessors, and disconnected components.",
      "goals": [
        "Trace BFS and DFS",
        "Reconstruct an unweighted shortest path",
        "Explain O(V + E)"
      ],
      "prerequisiteIds": [
        "m7-graphs"
      ],
      "sequence": [
        "activity:bfs-shortest-path",
        "activity:dfs-reachability"
      ]
    },
    {
      "id": "m8-greedy",
      "moduleId": "m8",
      "order": 230,
      "reviewStatus": "draft",
      "title": "Greedy choices and counterexamples",
      "summary": "Make a locally best choice, then test whether it is always safe.",
      "goals": [
        "Trace a greedy choice",
        "Construct a counterexample",
        "State when the strategy fails"
      ],
      "prerequisiteIds": [
        "m7-traversal"
      ],
      "sequence": [
        "activity:greedy-dp-coin-change"
      ]
    },
    {
      "id": "m8-dp",
      "moduleId": "m8",
      "order": 240,
      "reviewStatus": "draft",
      "title": "Dynamic programming and reconstruction",
      "summary": "Define reusable states, fill a table, and reconstruct the chosen solution.",
      "goals": [
        "Define a recurrence/state",
        "Fill a DP table",
        "Reconstruct decisions and compare with greedy"
      ],
      "prerequisiteIds": [
        "m8-greedy"
      ],
      "sequence": [
        "activity:knapsack-dp"
      ]
    }
  ],
  "resources": [
    {
      "kind": "tool",
      "id": "writer",
      "checkpointId": "orientation",
      "route": "writer.html",
      "alwaysAvailable": true,
      "reviewStatus": "reviewed"
    },
    {
      "kind": "tool",
      "id": "tracer",
      "checkpointId": "orientation",
      "route": "tracer.html",
      "alwaysAvailable": true,
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "linear-search",
      "checkpointId": "m2-linear-search",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "binary-search",
      "checkpointId": "m2-binary-search",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "binary-range-search",
      "checkpointId": "m2-binary-search",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "bubble-sort",
      "checkpointId": "m2-bubble-sort",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "selection-sort",
      "checkpointId": "m2-selection-sort",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "insertion-sort",
      "checkpointId": "m2-insertion-sort",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "stable-insertion-dispatch",
      "checkpointId": "m2-insertion-sort",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "array-list-insert",
      "checkpointId": "m2-array-mutation",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "array-list-remove",
      "checkpointId": "m2-array-mutation",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "industry-sla-breach-scan",
      "checkpointId": "m2-industry-workbench",
      "title": "SLA Breach Scan",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "industry-priority-range-recall",
      "checkpointId": "m2-industry-workbench",
      "title": "Priority Range Recall",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "industry-stable-priority-dispatch",
      "checkpointId": "m2-industry-workbench",
      "title": "Stable Priority Dispatch",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "industry-review-queue-mutation",
      "checkpointId": "m2-industry-workbench",
      "title": "Review Queue Mutation",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "linked-list-traversal",
      "checkpointId": "m3-linked-foundations",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "array-linked-comparison",
      "checkpointId": "m3-linked-foundations",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "linked-list-insert-head",
      "checkpointId": "m3-linked-mutation",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "linked-list-sorted-insert",
      "checkpointId": "m3-linked-mutation",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "linked-list-find-update",
      "checkpointId": "m3-linked-mutation",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "linked-list-delete",
      "checkpointId": "m3-linked-mutation",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "stack-lifo-basics",
      "checkpointId": "m4-stack",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "stack-postfix-evaluator",
      "checkpointId": "m4-stack",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "stack-delimiter-audit",
      "checkpointId": "m4-stack",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "stack-editor-undo",
      "checkpointId": "m4-stack",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "queue-fifo-basics",
      "checkpointId": "m4-queue-deque",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "queue-round-robin",
      "checkpointId": "m4-queue-deque",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "queue-printer-jobs",
      "checkpointId": "m4-queue-deque",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "deque-end-operations",
      "checkpointId": "m4-queue-deque",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "deque-sliding-window",
      "checkpointId": "m4-queue-deque",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "deque-service-lane",
      "checkpointId": "m4-queue-deque",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "activity",
      "id": "recursive-range-search",
      "checkpointId": "m5-recursion",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "stable-merge-sort",
      "checkpointId": "m5-divide-conquer",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "tree-traversals",
      "checkpointId": "m6-trees",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "bst-insert-search",
      "checkpointId": "m6-bst",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "bst-height-shape",
      "checkpointId": "m6-bst",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "graph-representation",
      "checkpointId": "m7-graphs",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "bfs-shortest-path",
      "checkpointId": "m7-traversal",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "dfs-reachability",
      "checkpointId": "m7-traversal",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "greedy-dp-coin-change",
      "checkpointId": "m8-greedy",
      "reviewStatus": "draft"
    },
    {
      "kind": "activity",
      "id": "knapsack-dp",
      "checkpointId": "m8-dp",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "sum-two",
      "checkpointId": "m1-ipo",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "delivery-fee",
      "checkpointId": "m1-ipo",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "library-fine",
      "checkpointId": "m1-pseudocode",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "parking-fee",
      "checkpointId": "m1-tracing",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "package-class",
      "checkpointId": "m1-exact-io",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "reward-points",
      "checkpointId": "m1-complexity",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "CH01-PS01",
      "checkpointId": "m1-pseudocode",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "CH01-PS02",
      "checkpointId": "m1-tracing",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "CH01-PS03",
      "checkpointId": "m1-tracing",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "CH01-PS04",
      "checkpointId": "m1-exact-io",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "CH01-PS05",
      "checkpointId": "m1-complexity",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "array-total",
      "checkpointId": "m2-arrays",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "largest-value",
      "checkpointId": "m2-arrays",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "above-average",
      "checkpointId": "m2-arrays",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "has-duplicate",
      "checkpointId": "m2-arrays",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "linear-position",
      "checkpointId": "m2-linear-search",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "binary-checks",
      "checkpointId": "m2-binary-search",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "bubble-pass",
      "checkpointId": "m2-bubble-sort",
      "title": "One Complete Bubble Pass",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "selection-minimum",
      "checkpointId": "m2-selection-sort",
      "title": "Select the Minimum Index",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "stable-ticket-insertion",
      "checkpointId": "m2-insertion-sort",
      "title": "Stable Ticket Insertion",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "indexed-array-mutation",
      "checkpointId": "m2-array-mutation",
      "title": "Indexed Array Mutation",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "linked-node-count",
      "checkpointId": "m3-linked-foundations",
      "title": "Count reachable linked nodes",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "linked-find-value",
      "checkpointId": "m3-linked-foundations",
      "title": "Lookup and update a node",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "linked-insert-head-problem",
      "checkpointId": "m3-linked-mutation",
      "title": "Position-aware linked insertion",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "linked-delete-first",
      "checkpointId": "m3-linked-mutation",
      "title": "Delete the first matching node",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "linked-relocate-sorted",
      "checkpointId": "m3-linked-mutation",
      "title": "Relocate an updated sorted node",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "linked-invariant-audit",
      "checkpointId": "m3-linked-mutation",
      "title": "Audit linked-list invariants",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "balanced-delimiters",
      "checkpointId": "m4-stack",
      "title": "Audit balanced delimiters",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "stack-reverse",
      "checkpointId": "m4-stack",
      "title": "Reverse values with a stack",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "queue-service",
      "checkpointId": "m4-queue-deque",
      "title": "Circular FIFO wraparound",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "deque-priority",
      "checkpointId": "m4-queue-deque",
      "title": "Execute deque end operations",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "postfix-operand-order",
      "checkpointId": "m4-stack",
      "title": "Preserve postfix operand order",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "round-robin-reenqueue",
      "checkpointId": "m4-queue-deque",
      "title": "Round-robin re-enqueueing",
      "reviewStatus": "reviewed"
    },
    {
      "kind": "problem",
      "id": "recursive-sum",
      "checkpointId": "m5-recursion",
      "title": "Recursive range sum",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "recursive-binary-range",
      "checkpointId": "m5-recursion",
      "title": "Recursive duplicate range",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "merge-two-sorted",
      "checkpointId": "m5-divide-conquer",
      "title": "Stable merge of two ranges",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "merge-sort-count",
      "checkpointId": "m5-divide-conquer",
      "title": "Count merge-sort work",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "bst-insert-order",
      "checkpointId": "m6-bst",
      "title": "Build a BST in order",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "tree-inorder",
      "checkpointId": "m6-trees",
      "title": "Produce an inorder traversal",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "tree-height",
      "checkpointId": "m6-bst",
      "title": "Measure tree height",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "bst-search-path",
      "checkpointId": "m6-bst",
      "title": "Report a BST search path",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "graph-degree",
      "checkpointId": "m7-graphs",
      "title": "Compute graph degrees",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "bfs-order",
      "checkpointId": "m7-traversal",
      "title": "Deterministic BFS order",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "shortest-unweighted",
      "checkpointId": "m7-traversal",
      "title": "Shortest unweighted path",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "dfs-components",
      "checkpointId": "m7-traversal",
      "title": "Count DFS components",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "greedy-coin-count",
      "checkpointId": "m8-greedy",
      "title": "Greedy coin count",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "greedy-counterexample",
      "checkpointId": "m8-greedy",
      "title": "Find a greedy counterexample",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "dp-min-coins",
      "checkpointId": "m8-dp",
      "title": "Minimum coins by DP",
      "reviewStatus": "draft"
    },
    {
      "kind": "problem",
      "id": "knapsack-best-value",
      "checkpointId": "m8-dp",
      "title": "0/1 knapsack best value",
      "reviewStatus": "draft"
    }
  ]
};
