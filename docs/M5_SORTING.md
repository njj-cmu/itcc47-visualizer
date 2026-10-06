# M5-C Python sorting activities

`stable-merge-sort` and `quick-sort` are reviewed resources at `m5-divide-conquer`.
The pre-production release profile uses schema 2, profile version 7, and opens all
seven Module 5 visualizations and four practice problems without instructor preview.
Modules 6-8 remain locked. Recursive search and the existing pseudocode practice
retain their behavior; migrating those lessons remains separate curriculum work.

## Algorithms and supported inputs

The executable sources in `tools/sorting/examples/` are the handoff's exact programs.
Merge Sort slices at `len(values) // 2`, completes the left subtree before the right,
then calls `merge`. That helper uses `left[i] <= right[j]`, appends into a new result,
and drains remaining values. The base case may return its original input reference.

Quicksort uses inclusive low/high bounds, the last element as pivot, Lomuto `<=`,
`i = low - 1`, and `range(low, high)`. It commits Python tuple swaps, places the pivot,
sorts the left range before the right, mutates one shared list and returns `None`.
There is no randomized pivot, built-in sort, alternate partition, or merge phase.

Both routes default to full sort. “Learn the merge” calls the same `merge` directly;
“Learn the partition” calls the same `partition` directly. Mode-specific drivers,
displayed source and downloaded `.py` files agree byte for byte. Clipboard text agrees
after normalizing the Windows clipboard's CRLF line endings to LF.

The UI supplies 32 fixtures: 12 full-sort inputs per algorithm (default eight values,
four values, empty, singleton, pair, odd length, negative/duplicate keys, labelled ties,
four equal keys, eight equal keys, sorted eight, reverse eight); five merge helper
inputs (root pair, left empty, right empty, both empty, equal heads); and three
partition helper inputs (root partition, self-swaps, partial range). The generator
accepts at most 12 integers in [-1000, 1000], with sorted merge inputs and a valid
nonempty helper partition range. It rejects booleans, floats, arbitrary edited source,
unsupported modes and missing fixtures before compilation. This is a bounded fixture
player, not a browser Python interpreter or arbitrary-code service.

## Execution and historical state

`source.py` validates exact approved source, derives spans from its Python AST and
inserts observations around real operations. Python still evaluates expressions and
comparisons once. `recorder.py` records before/after assignments, actual arguments,
calls, returns, pending caller bindings, stdout and counts. An independent unmodified
Python `sys.settrace` oracle checks calls, returns and selected intermediate writes.

Sorting schema 1 uses immutable heap versions; existing recursion schema 2 is untouched.
Each event references the list contents at that moment. Container IDs model actual
Python identities. Occurrence IDs survive slices/appends/swaps and distinguish equal
keys without changing numeric comparison. No Python addresses are shipped. Tuple
swaps commit atomically; renderer ghosts are absent from heaps and cost counters.
Completed-call inspection resolves the recorded historical heap, without moving the
active array or instruction. Source includes explicit condition, before, after,
return-ready and return-complete phases; return origin and caller continuation differ.

`sorting-contract.js` validates revision hashes, schema, source ownership, references,
permutations and terminal outcomes, then freezes the graph. It adapts the selected
events to the existing `BSITPlayback` controller. Default Step focuses on array work;
optional detail exposes call and assignment steps. Previous, seek and Restart restore
the whole snapshot. Renderers project data only. Forward value animation acknowledges
the existing transition token; navigation and fixture changes cancel stale animations.

## Teaching semantics and costs

The array board dominates the desktop grid. Source is beside it; calls, variables,
history and cost definitions are collapsed below. Mobile tabs reuse one board, one
source pane and one controller. Local horizontal scrolling keeps array order linear.
The shared playback strip sits above the board and remains sticky while scrolling;
this placement keeps the merge output unobstructed, instead of the written handoff's
footer placement. There is still one existing controller and control strip.
Append is shown before pointer advancement, with consumed source cells retained.
Quicksort shows the pending boundary separately from committed classification and
keeps actual `j = high - 1` after scan completion. Self-swaps execute without invented
movement. Draining does not display a stale key comparison.

Default Merge Sort: 17 key comparisons, 24 appends, 15 sorting calls, 7 helper calls,
peak function depth 4. Default Quicksort: 13 comparisons, 11 distinct-position exchanges,
0 self-swaps, 9 sorting calls, 4 helper calls, peak function depth 4. Sorted, reverse and
eight-equal Quicksort inputs each use 28 comparisons and depth 8. Labels demonstrate
stable merge output C,A,B and unstable Lomuto output C,B,A for keys 2A,2B,1C.

Merge Sort uses O(n log n) time, O(n) peak auxiliary algorithm storage and O(log n)
sorting-call depth. Total slice copying across levels is O(n log n), not peak memory.
Lomuto partition uses O(1) auxiliary storage; Quicksort's recursive stack is additional.
Balanced partitions give O(n log n) work and O(log n) stack; average behavior requires
an input distribution assumption. The fixed pivot has O(n²) worst work and O(n) stack.
UI steps, appends and exchanges are different units, not elapsed-time comparisons.

## Build and delivery

`npm run build` generates canonical traces, builds all four optional packs and publishes
static files. Sorting assets live under `activity-packs/sorting-<content hash>/`.
The hash covers the trace, JS and CSS bytes. A thin catalog records that actual path;
query-only cache busting would be unsafe with the existing worker's `ignoreSearch`.
The root sorting manifest is a build/test index; browser installation uses the versioned
manifest. The core 2,097,152-byte limit is unchanged. Generated curriculum metadata
uses equivalent JavaScript literals to avoid unnecessary property-name quotes.

Opening a route loads its pack for the current visit. “Download for offline use” reports
the exact bytes and asks for confirmation; cancellation and failed downloads leave
existing entries intact through atomic Cache.addAll. Old revision paths, recursion,
sliding window, service lane and unrelated caches coexist. Classic scripts also support
`file://`; no fetch-only trace dependency is introduced. Saved pseudocode drafts and
their content versions are neither migrated nor rewritten by sorting.

## Verification entrypoints

The normal `npm run check` runs build, application checks, Python, E2E and accessibility.
`tools/test.js` imports the sorting contract tests. `npm run test:python` checks all 32
reproducible fixtures and 14 Python methods, including 1,093 exhaustive arrays for both
algorithms plus maximum-size cases. `tests/e2e.spec.js` imports the sorting interaction,
storyboard and offline suites; `tests/a11y.spec.js` imports sorting accessibility checks.
Set `M5C_EVIDENCE_DIR` to collect semantic screenshots and sidecar metadata. Tests cover
1920x1080, 1366x768, 390x844, reduced/off motion and a 683-CSS-pixel reflow viewport
equivalent to a 1366-pixel desktop at 200% zoom. No mockup pixel-parity claim is made.

Run setup with the existing ignored instructor token. Do not publish token material,
rotate the token hash or mistake local results for a new remote CI run. The verifier's
profile version follows the release profile; the private token is unchanged. Publishing
main remains a separate release action from this authorized pre-production integration.
