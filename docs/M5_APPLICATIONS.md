# M5-B: design, repair and apply Python recursion

Continuation of staging `7359dc860f75ae477b1ab15870724d5215d0ba1c`.
The approved promotion opens the reviewed `m5-recursion` checkpoint in
pre-production: four Python lessons, the existing recursive-search activity,
and the two recursion practice problems. The subsequent version 7 promotion also
opens both sorting activities and both divide-and-conquer practice problems.
Modules 6-8 remain draft. Publishing main remains a separate release action.

## Learning sequence

1. `recursion-call-stack`: countdown and control return.
2. `recursion-return-values`: numeric return and caller assignment.
3. `recursion-list-total`: five design decisions, six input presets, four repair modes.
4. `recursion-folder-total`: a bounded synthetic hierarchy and sequential child totals.
5. The existing `recursive-range-search` concept activity is preserved.
6. `recursive-sum` and `recursive-binary-range` retain their pseudocode,
   content versions and saved-work contracts.

The list lesson teaches a one-call promise, direct base answer, decreasing
remaining length, delegation and combination. The index grows while
`len(values) - index` shrinks. All frames reference one read-only input list;
no executed source allocates suffix slices. At index equal to the length, the
base result is returned before indexing.

| List fixture | Result | Invocations / peak depth | Return order |
|---|---:|---|---|
| list-main | 14 | 5 / 5 | 0, 1, 8, 10, 14 |
| list-empty | 0 | 1 / 1 | 0 |
| list-single | 7 | 2 / 2 | 0, 7 |
| list-zero | 0 | 2 / 2 | 0, 0 |
| list-mixed | 8 | 5 / 5 | 0, 5, 5, 3, 8 |
| list-suffix | 8 | 3 / 3 | 0, 1, 8 |

Repair modes apply to the default list. `wrong_base` legally completes with
15. `missing_combine` computes a local total but returns the child result,
legally completing with 0. Both are labelled incorrect results.
`print_instead_of_return` prints 1, implicitly returns None, and raises a real
TypeError in its caller; the driver answer stays UNBOUND. `no_progress` repeats
index 0 until the external teaching guard stops at eight live calls. That is
not a Python RecursionError. The exported source carries an explicit warning.
Questions ask for the first divergence, its consequence and a repair. Reveals
and choices are lesson-local reasoning aids, never grading or mastery.

The folder lesson uses only supplied synthetic data. Course has nine nodes,
totals 500 bytes, and reaches four live frames. Returns are
120, 80, 40, 60, 100, 200, 200, 200, 500. Other presets cover an empty folder,
a zero-byte file, and duplicate filenames on distinct node identities.
The hierarchy shows all inputs; the separate live stack contains one current
call path. Siblings execute sequentially. Files return before total, child or
child_total are bound. Empty folders bind total to 0 and skip the child loop.

## Python and fixture contract

Canonical sources live in `tools/recursion/examples/`. The declarative
`lesson_registry.json` owns signatures, bounds, fixture choices, variants,
expected results and teaching text. The generator changes only input literals
and starting indices for alternate presets. Copy, download, display and actual
execution use that exact LF source, including the driver.

The adapter extends the existing narrow AST instrumentation for multiple simple
parameters, a declared default index, bounded list/dict literals, read-only
indexing, len(values), and the child loop. Unsupported names, calls, slices,
mutation, nested call expressions and undeclared fixtures fail closed. This is
a trusted build-time adapter, not a sandbox or browser Python interpreter.

Lists contain at most six integers in [-1000, 1000]. The index is in [0, length].
Synthetic trees contain at most 16 distinct nodes, height at most six, at most
six children per folder, names of 1–40 characters, and file sizes in [0, 10000].
Cycles and shared subtrees are rejected before execution. No filesystem is read.
Existing teaching bounds remain eight live calls and 500 events; subprocesses
have a 60-second timeout and the raw witness restores its prior trace callback.

Schema 2 / generator m5-ast-2 supplies 22 fixtures. Source, semantic events and
the input object table each have SHA-256 revisions. Runtime identities are
recorded as deterministic traversal ordinals, never raw addresses or filenames.
All replay snapshots share a deeply frozen input table; each frame owns its
local bindings. Fixture identity includes program, fixture, variant, schema and
source/trace revisions, so switching a mode resets inspection and predictions.

CALL, BASE_CHECK, RETURN_READY, RETURN_COMPLETE, RETURN_TRANSFER, ASSIGN_RESULT,
LOCAL_UPDATE, PRINT and COMPLETE retain their separate meanings. LOOP_ITERATION
records the actual loop binding; LOOP_END records loop completion. The pending
assignment is separate from the current binding. While the second root child
runs, child_total and total both remain 120. Its delivered result does not bind
early: ASSIGN_RESULT changes child_total to 80, then LOCAL_UPDATE changes total
to 200. ERROR and LIMIT_STOP retain aborted snapshots and never become success.

`test_applications.py` independently executes every unmodified source under
raw sys.settrace. It compares actual call/parent relations, source sites,
returns, pre/post-statement locals, object identity, nonmutation and stdout.
It does not use the generator recorder or serializer to observe Python.

## Presentation and interaction

`recursion-presentation.js` is a pure view derivation over the existing immutable
events. It distinguishes live execution, return preparation, handoff, waiting
inspection, driver execution/completion, explicit completed history and stopped
execution. During handoff the source panel retains the child's origin while
the executing panel names the receiving caller's suspended assignment line.
Default completion shows the driver; history requires an explicit selection.
Aborted or unknown status cannot masquerade as receiving a result.

The newer stack-first layout is retained, with Source, Stack and Executing
mobile tabs. One shared controller owns every viewport and motion preference.
Input hierarchy inspection, waiting/history inspection and prediction choices
do not advance playback. Follow-current controls restore keyboard focus.
Driver answer and printed stdout remain separate from function locals.

## Integration and verification

The three existing optional-pack loaders share one bounded loading helper;
recursion traces still load before their workspace. Asset URLs, release checks,
pack IDs and cache policy are preserved. The recursion manifest's title includes
applications, and its byte count is generated from the published files.
Core raw bytes remain below the unchanged 2,097,152-byte cap; the completion
report records baseline and final measurements. No minified file is hand-edited.

The optional pack needs an explicit byte-count confirmation for installation.
Cancel leaves the shared optional cache unchanged. Installed Module 4 packs
coexist with it. Ordinary visits support both new lessons and every preset
offline; local file delivery uses the same bundled sources and fixtures.
No instructor capability is needed for the released recursion checkpoint.
Later drafts still reject public and forged-preview visits before rendering.
An earlier release profile still locks recursion before optional pack requests.
Saved pseudocode data and other course releases are not migrated.

Tests are wired into existing release gates:

- `tools/test.js` invokes `tools/recursion/test-contract.js`.
- `npm run test:python` discovers foundations and application witnesses.
- `tests/e2e.spec.js` imports foundations, presentation and application tests.
- `tests/a11y.spec.js` imports both recursion accessibility suites.
- `npm run check` rebuilds assets and runs all unit, Python, E2E and axe checks.

Focused browser command: `playwright test tests/e2e.spec.js tests/a11y.spec.js
--grep M5`. Use a free ITCC47_TEST_PORT, external M5_EVIDENCE_DIR, and
`M5_REFERENCE_DESKTOP=1 --project laptop` for 1920x1080 captures in addition to
1366x768 and 390x844. Evidence includes URL, viewport, browser version, base SHA,
fixture revision and event ID. Tokens are never capture metadata.

Runtime verification uses Python 3.12.4, with Python 3.9 syntax compatibility
checked by its parser. Actual Python 3.9 execution, Firefox, Safari and an
upgrade from a previously installed recursion pack are not claimed here.
The optional-cache upgrade architecture is unchanged.
