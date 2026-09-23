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
with call-frame and class lookup path, accumulated output, and optional semantic
concept annotations. Timeline events may use the existing `segment` field to
label an Attempt/Repair contrast. Identities such as `student:1` are stable
teaching labels, never fake memory addresses.

The object-model renderer derives motion only from those stable identities.
Classes expand as keyed members enter or leave, objects and references use
scoped layout identities, and fields crossfade values while retaining visible
`new`, `updated`, or `removed` text. Lookup paths reveal in declared order and
also mark the participating class cards. The stage and full-view dialog use
separate motion scopes, so opening the dialog cannot connect unrelated DOM
nodes. Field-change labels compare the current frame with the preceding
timeline frame instead of relying on component mount timing, so fast
scrub-then-step interactions remain deterministic. These transitions never
mutate a frame or add playback events; seeking
remains immediate, while Step and Play use the shared speed and reduced-motion
preferences. Initial activity loads still introduce their first class; direct
timeline seeking is the one navigation path that deliberately skips motion.

ITCC45 activities also declare backward-compatible teaching metadata:
`context`, `exampleOrder`, `learningGoal`, and `misconceptionIds`. The topics
page groups activities by `topicId`; these fields affect discovery and labels,
not playback or renderer selection. The six original activity IDs remain the
stable primary or compatibility entries for their topics.

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
Structural events may also carry an immutable `transition` with a semantic kind,
stable entity moves, enter/exit identities, and a wait flag. Existing event
fields and ordering remain authoritative for older consumers.

Array frames retain their compatibility `array`, `items`, and highlight fields
and may add a renderer-oriented `presentation`: immutable logical entities are
separate from slot IDs, with explicit holes and an optional held entity. Linked
frames use heap node IDs, pointer names, and deterministic edge IDs. Renderers
can therefore animate identity without inferring it from duplicate values or
from local call frames.

`ITCC47Playback.createController(options)` owns deterministic playback state:
`idle`, `paused`, `playing`, or `complete`, plus the current index, total event
count, and speed. Its public operations are `load`, `play`, `pause`, `toggle`,
`step`, `seek`, `finishSegment`, `setSpeed`, and `dispose`.
Snapshots also expose transition state, token, direction, and navigation source.
`completeTransition(token)` is idempotent; `seek` and `load` cancel active
transitions, while structural Step/Play waits for the renderer boundary.

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

The visualizer React bundle uses Motion through a static `LazyMotion`/`domMax`
boundary and still publishes one `visualizer-app.js` plus one stylesheet for
offline and `file://` use. Full motion follows playback speed; reduced motion
uses instant relocation with brief emphasis; Off is immediate. The saved
On/Reduced/Off override is optional, so the default continues to follow the
operating-system preference.

## Module 4 linear ADTs

`linear-adt-activities.js` owns the ten reviewed Module 4 scenarios: four
stacks, three queues, and three deques. Each event carries stable entity IDs,
one or more ordered lanes, optional held values and input tokens, current
operation metadata, output, metrics, and display-ready teaching annotations.
Annotations may target only an entity currently present in a lane or a held
entity in that same frame; the builder rejects stale targets while constructing
the deterministic timeline.

The React `linear-adt` renderer is shared across all three structures. A stack
renders its single legal end vertically, queues label front and back around a
FIFO lane, and deques use the same two end markers without implying arbitrary
middle access. Multiple lanes support examples such as undo/redo without
introducing activity-specific renderer branches. The curriculum catalog, direct
route resolver, canonical visualization catalog, and source panel all consume the same registered
activity metadata.

Stack foundations (`stack-lifo-basics`) uses the `stack-execution` workspace.
Its seven source operations expand into nineteen immutable phase snapshots via
`operationSteps` in `linear-adt-activities.js`. Each frame includes an `execution`
record with operation identity, zero-based phase index, labels, working value,
pending metadata, and variable destination. Source progression and phase
progression are distinct: the shared playback controller advances one snapshot
at a time, so Previous and seek restore both structure and runtime values.
PUSH commits at phase three; POP removes at phase two and assigns at phase three;
PEEK never mutates the stack. Only RETURN populates program output. The focused
components in `visualizer-src/stack-execution.jsx` render this model without
introducing a second playback controller. Other linear ADT lessons retain the
shared renderer and may adopt phase definitions independently.

Postfix evaluation (`stack-postfix-evaluator`) uses the `postfix-execution`
workspace. `postfixProgram` generates operation definitions from tokens, then
`operationSteps` expands them into 71 immutable phase snapshots for the shipped
`5 2 + 3 ×` expression. Event `source` identifies the real pseudocode line;
`frame.iteration` identifies the token cursor and processed prefix; `frame.execution`
identifies the operation and its phase. These are independent: line 4 repeats
for numbers, and line 8 hosts separate APPLY and PUSH operations per operator.
Both operators pop right first and left second. Runtime entries transition from
unassigned through receiving to assigned; only the return-to-output phase emits
program output. Stable entity IDs move between staging, pending slots, stack,
variables and output using Motion shared layouts. The workspace reuses the
phase stepper, playback controls and controller from stack foundations; Previous,
seek and restart restore complete snapshots without replaying side effects.
The generator also supports subtraction and division for future curated examples,
but the public route intentionally retains its original fixed teaching scenario.

Nested-delimiter parsing (`stack-delimiter-audit`) uses the
`delimiter-execution` workspace. `delimiterProgram` generates immutable parser
snapshots from delimiter characters rather than storing pre-computed finished
stack states. Each snapshot independently records its pseudocode line,
source-character cursor and semantic character states, and the current
operation-specific phase. Opening delimiters read, classify, move, and commit;
closing delimiters inspect and compare without mutation before a separate
four-phase POP can remove a confirmed match. A final line-12 operation evaluates
the empty-stack condition before publishing VALID or the unclosed-opener error.
Mismatch, empty-stack closer, and final unmatched-opener failures remain distinct
and are available as curated source cases on the same activity route. The
workspace reuses the shared phase playback controller and Motion layout identity,
so Previous, seek, restart, and scenario changes restore deterministic snapshots.

Undo/redo history (`stack-editor-undo`) uses the `undo-redo-execution`
workspace on the existing activity route. `undoRedoProgram` expands the fixed
nine-line scenario into 30 immutable snapshots. Lines 3–9 each own four named
operation phases, while `frame.undoRedo` records the active UNDO/REDO context,
the two history stacks, command-register state, one explicit transfer route,
live document state, pending document mutation, and separate return value.
Stable `cmd-b` identity moves through Undo, an in-transit lane, command, Redo,
and back again; no snapshot contains the command in multiple logical locations.
POP and PUSH mutate history only. The document commits from `AB` to `A` solely
during `APPLY inverse(command)`, and from `A` to `AB` solely during
`APPLY command`. The workspace reuses the shared phase indicators, playback
controller, speed/motion settings, and snapshot-based Previous/seek behavior.

Queue foundations (`queue-fifo-basics`) uses the `queue-execution` workspace on
the existing activity route. `queueFoundationsProgram` expands the nine-line
scenario into 35 immutable operation snapshots with operation-specific phase
counts. `frame.queue.slots` is the physical source of truth: three stable slot
records retain indices 0–2 while `front`, `back`, and `size` describe the active
circular buffer. Logical FIFO order is derived for every frame by reading
`slots[(front + offset) % capacity]`; it is never stored as the only queue model.
ENQUEUE and DEQUEUE use pending transition metadata before an atomic commit,
FRONT copies into `next` without changing slots or metadata, and runtime values
remain separate from RETURN output. The final snapshot therefore proves both
physical `[D, B, C]` with `front = 1`, `back = 0` and logical `[B, C, D]`.
The workspace reuses the shared phase indicators, playback controller,
speed/motion settings, Motion layout identity, and reversible snapshot history.

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
