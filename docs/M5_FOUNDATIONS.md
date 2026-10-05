# M5-A: Python recursion foundations

This local review milestone adds `recursion-call-stack` and
`recursion-return-values` beneath the existing draft `m5-recursion`
checkpoint. The public release still ends at `m4-queue-deque`.
The duplicate-range search, merge-sort placeholders, and legacy pseudocode
problems retain their IDs and meaning. M5-B extends these foundations in
[M5_APPLICATIONS.md](M5_APPLICATIONS.md); M5-C and M5-D remain later scope.

## Source and execution

The canonical sources in `tools/recursion/examples/` are the first two
programs from the supplied Module 5 blueprint, including their main guards
and drivers. Only the driver's argument changes for n = 0, 1, 3, 5.
The exact LF-normalized source is displayed, passed to Copy Python, downloaded,
hashed, and executed during verification. Windows may represent the same
clipboard text with CRLF; the browser tests check both the exact write argument
and the normalized native clipboard read.

`tools/recursion/build_traces.py` executes real Python after a deliberately
narrow AST instrumentation pass. It does not evaluate Python expressions in
JavaScript. Unsupported syntax and call placements fail closed. These two
foundation programs use integer arguments; the M5-B extension adds bounded
read-only list/node references. No arbitrary-source editor or browser Python
runtime is provided.

Each generated fixture records its source hash, trace hash, and fixture ID.
The pack records Python's generating version, generator version `m5-ast-2`,
and recursion schema version 2, regenerated coherently for all four lessons.
The runtime adapter uses the existing
`BSITPlayback.timelineEvent` schema and controller.

## Where each teaching phase comes from

| Phase | Observation |
| --- | --- |
| CALL | Entry into the actual function; a fresh ordinal call ID and bound n |
| BASE_CHECK | The actual Boolean returned by Python's evaluated base test |
| RETURN_READY | The actual return expression, before the function returns |
| RETURN_COMPLETE | The wrapped Python call has returned; its frame is removed |
| RETURN_TRANSFER | The specific waiting call site receives the value; assignment has not happened |
| ASSIGN_RESULT | Locals observed after Python completes the result assignment |
| LOCAL_UPDATE | Locals observed after Python executes the addition |
| PRINT | A real print has written to captured stdout |
| COMPLETE | Driver finished, with no live function frames |

Raw `sys.settrace` callbacks are an independent test witness, not the source of
all teaching microphases. Tests execute the unmodified source, compare call
entry/parent relationships and return order/values, and match observed locals
and stdout against the enriched trace. Source and trace drift fail validation.
The contract rejects tampered source or snapshot payloads at runtime.

Live stack order is top first. The driver is separate and excluded from depth.
Completed frames remain inspectable history. During removal/handoff there may
be no RUNNING function; there can never be two. Inspecting a waiting or completed
call does not move the current instruction. UNBOUND, PENDING, None and integer
zero have separate tags and labels.

The default teaching limits are eight live functions and 500 events. Tests
exercise nonshrinking recursion and a real TypeError after a missing return.
These stopped traces are errors, never successful playback or mastery. A depth
stop is explicitly a teaching limit, not Python's recursion limit.

## Supported evidence

| Program | n | Events | Maximum function depth | stdout |
| --- | --- | --- | --- | --- |
| countdown | 0 | 7 | 1 | empty |
| countdown | 1 | 14 | 2 | enter 1, leave 1 |
| countdown | 3 | 28 | 4 | enter 3/2/1, leave 1/2/3 |
| countdown | 5 | 42 | 6 | enter 5/4/3/2/1, leave 1/2/3/4/5 |
| sum_to | 0 | 9 | 1 | 0 and newline |
| sum_to | 1 | 16 | 2 | 1 and newline |
| sum_to | 3 | 30 | 4 | 6 and newline |
| sum_to | 5 | 44 | 6 | 15 and newline |

Event totals describe the current generated revision; they are not fixed UI
targets or algorithmic cost measures. Countdown returns None from every call.
The default sum return chain is 0, 1, 3, 6. Child values reach only their caller,
and the driver's answer binds only after the root return.

## Owners and delivery

- Domain: the Python generator and tests; `visualizer-src/recursion-contract.js`
  adapts immutable snapshots and derives prediction targets.
- Presentation: `visualizer-src/recursion-workspace.jsx` and its scoped CSS.
  Source/Stack/Executing tabs share one state and the existing playback controls.
  Predictions and list-total/repair transfer checks remain outside execution.
- Catalog: `visualizer-src/recursion-catalog.js` compiles to
  `recursion-activities.js`; curriculum resources remain draft.
- Integration: `visualizer-src/main.jsx` gates and loads the optional pack;
  its only progress change requires a successful run before marking reviewed.
- Publishing: existing Vite/publish scripts generate the catalog, renderer,
  stylesheet, fixtures and exact-size optional-pack manifest.
- Verification: the existing unit suite imports the contract checks; existing
  E2E and accessibility suites import the M5 tests. Both Python suites share
  discovery through `tools/python-runtime.js`, including `BSIT_PYTHON`.

The recursion pack stays outside the unchanged 2 MiB core-cache budget. The
M5-A baseline used 2,097,138 of 2,097,152 raw core bytes. M5-B deduplicates the
three optional workspace loaders at this boundary; current measurements are
recorded in M5_APPLICATIONS.md. The lessons and fixtures remain optional.

In an
authorized HTTP preview, open **Details and completed-call history**, select
**Download for offline use**, and confirm its displayed byte count. The existing
optional-pack cache then serves all four lessons and every preset offline.
Direct `file://` opening uses the bundled local assets without a server.
Module 5 public and forged-preview routes remain locked before loading the pack.

## Validation commands

- `npm run build`: regenerate all deployment artifacts, including Python traces.
- `npm run build:visualizer`: also regenerates recursion fixtures before publishing.
- `npm run test:unit`: domain, playback, catalog, release and offline-size checks.
- `npm run test:python`: existing Python examples plus recursion reproducibility,
  independent raw witnesses, intermediate invariants, and bounded error checks.
- `npx playwright test tests/e2e.spec.js tests/a11y.spec.js --grep M5`: focused
  source, interaction, keyboard, reduced-motion, screenshot, lock and offline checks.
- `npm run check`: the complete repository gate, including all existing Module 4 tests.

Use an available `ITCC47_TEST_PORT`. Set `M5_EVIDENCE_DIR` to an external
directory to capture named meaningful states at both configured viewports.
Set `M5_REFERENCE_DESKTOP=1` with `--project laptop` for 1920x1080 evidence.
Tests reuse the existing private instructor token and do not publish it.
Browser coverage uses the repository's Edge/Chromium configuration; Firefox and
Safari are not claimed.
