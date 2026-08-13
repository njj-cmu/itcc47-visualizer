# BSIT Learning Lab architecture

## Multi-course shell

`BSITLearningLab` is the versioned registry for course metadata and activity
catalogs. A course declares a stable ID, code, title, home route, accent, and
navigation. Activities add `courseId`, `topicId`, language, source, renderer,
evidence views, inputs, and a deterministic `run()` contract. Direct ITCC47
routes remain stable while `index.html` is the neutral subject chooser.

`BSITPlayback` and `BSITVisualizerRegistry` are the course-neutral names for
the shared timeline and renderer contracts. `ITCC47Playback`,
`ITCC47VisualizerRegistry`, and `ITCC47Activities` remain compatibility APIs so
the existing pseudocode and algorithm tools do not require a flag-day rename.

## Guided Python object model

ITCC45 is a deterministic simulator, not a general Python interpreter. Its
displayed programs are executed in CI on the supported Python 3.9 floor, while
the browser consumes curated event timelines. This keeps `file://` and offline
operation small and predictable without shipping Pyodide.

The `object-model` render frame contains class definitions and bases, object
identities and field state, name-to-object references, an optional active call
with call-frame and class lookup path, and accumulated output. Identities such
as `student:1` are stable teaching labels, never fake memory addresses.

Structured ITCC45 practice stores only `{ contentVersion, solvedIds }` under the
versioned `itcc45.practice:v1` key. It is optional local feedback and cannot be
treated as a grade or submission.

## Trust boundary: two separate shells

This repository is the **public/local practice shell**. It runs entirely in the
browser, works from `file://`, stores optional progress in that browser, and
uses only visible or shipped practice cases. Its results are feedback, not an
academic record.

A future **hosted academic portal** is a separate system. It may import a
semester roster and wrap a practice result with an authenticated student ID,
section and semester, attempt ID, server timestamps, server-only cases, grades,
revocation state, and audit metadata. Those fields must be created and verified
by the server. Local progress, client-side hashes, and client-generated results
must never be accepted as authoritative evidence.

## Framework-neutral learning engine

The browser engines are classic scripts exposed through small IIFE namespaces,
so the current pages and a future React shell can consume the same contracts.
They have no DOM, storage, network, authentication, or framework dependency.

`ITCC47Playback.timelineEvent(spec)` creates an immutable event with stable
identity, domain, semantic type, student-facing message, immutable render frame,
named metrics, and optional source, segment, boundary, and terminal information.

`ITCC47Playback.createController(options)` owns deterministic playback state:
`idle`, `paused`, `playing`, or `complete`, plus the current index, total event
count, and speed. Its public operations are `load`, `play`, `pause`, `toggle`,
`step`, `seek`, `finishSegment`, `setSpeed`, and `dispose`.

Timelines are precomputed and cached. This keeps backward scrubbing instant and
makes classroom behavior reproducible. Streaming should be considered only if
future structures produce timelines large enough to demonstrate a measured
problem.

## Interpreter and evaluation boundary

`parsePseudocode` produces friendly `TracerError` diagnostics with a stable
code, line, column, message, and suggested correction. `collectSteps` returns
`{ events, outcome, diagnostics }` alongside compatibility fields used by the
current pages.

`ITCC47Evaluation.createResult` returns a deterministic, frozen practice result
containing schema and engine versions, activity and content versions, case
summaries, diagnostics, outputs, and pass status. It intentionally contains no
identity, timestamps, grades, signatures, or synchronization state.

Content keeps stable activity/problem IDs and an explicit `contentVersion`.
Changing the meaning of an activity or its test contract requires incrementing
that version.

## Symbolic operation counting

`symbolic-counting.js` is another framework-neutral engine. Its versioned v2
contract exposes exact `Rational` values and immutable `SymbolicExpr` nodes for
rationals, symbols, addition, multiplication, powers, sums, floors, ceilings,
maximums, and unknown expressions. `CountAnalysis` includes primary factored
and secondary expanded forms, selected dimensions, domains, assumptions,
worst-case choices, tight bounds, derivation steps, and compatibility aliases
(`symbolicTotal` and `growthClass`).

Release A proves straight-line statements, multivariable independent loops,
dependent affine bounds, and closed forms whose loop-variable summands have
degree at most two. It preserves exact fractions. Non-unit `STEP` and flooring
bounds retain a structural max/floor expression when polynomial simplification
would be unsound. Unsupported nonlinear bounds, data-dependent loops, and
loop-altering `BREAK` produce diagnostics rather than invented formulas.

Branches expose candidate paths and require a session-only worst-case choice.
Symbol dimensions are also confirmed explicitly and reset with code changes;
neither choice is stored as authoritative evidence.

The Lecture model charges no operations to a `FOR` header. Full Control adds
separate setup, condition-check, and increment rows; it never averages unequal
control events into a misleading unit cost. The measured-growth sweep remains
separate evidence and is not combined with the symbolic proof.

## Incremental React migration

React should first replace one page shell while importing these unchanged
engines. Algorithm generation, parsing, evaluation, and playback remain outside
components. Once the contract works for that feature, other shells can migrate
without rewriting course behavior. Authentication belongs only in the hosted
portal, not in the static practice build.

## Functions, calls, and recurrences

The parser root is `Program { functions, body }`. Top-level function definitions
are hoisted, while `CALL` remains a statement so user-defined functions cannot
be hidden inside expressions. The runtime keeps explicit logical call frames
with stable IDs, arguments, locals, call sites, depths, and return destinations.
Timeline frames receive immutable call-stack snapshots and an active-frame ID,
allowing the current vanilla shell and a future React shell to render the same
trace without consulting interpreter internals.

Function scope follows the course's Python-oriented model: scalar arguments are
values, arrays retain their reference, assigned names are statically local, and
global mutation must be declared before first use. `STOP` terminates the whole
program; `RETURN` exits only the active frame. Runtime depth is capped at 128,
and exceeding it reports a probable missing or ineffective base case.

`recurrence.js` exposes the versioned, framework-neutral `ITCC47Recurrence`
contract. Analysis is deliberately guided: a student confirms the problem-size
measure, chooses a visible worst-case recursive branch when necessary, and
bounds unproved combine work. It reports the recurrence before the solution,
then Big-O, tight Theta only when justified, recursion depth, and call-stack
space. Actual calls from the current run remain separate evidence. Mutual
recursion can execute but is explicitly unsupported by the symbolic solver.
General graph symbols and assumptions remain reserved for later modules; no
graph-specific representation is inferred here.

## Singly linked node references

The runtime value model includes `NULL` and opaque references created by
`NEW NODE(value)`. A node has exactly `value` and `next` fields in this release;
field access, field assignment, aliasing, and identity comparison work in
globals, arrays, parameters, nested calls, and recursive calls. Invalid fields,
scalar links, and dereferencing `NULL` produce explicit diagnostics.

Heap ownership is deliberately separate from lexical call frames. The heap
assigns deterministic identities such as `node:1`, while each timeline frame
captures both the visible references in the active scopes and an immutable heap
snapshot. This allows recursive functions to share node identity without
moving heap objects into local environments.

The activity catalog adapts those pseudocode frames into the shared
`linked-list` renderer contract (`nodes`, `links`, named pointers, detached
nodes, and highlighted edges). The Pseudocode Lab consumes the same curated
source through an activity query parameter. Symbolic counting reports node
allocation or field operations as unsupported and leaves the richer algebra
engine intact; linked-list teaching metrics remain separate evidence.
