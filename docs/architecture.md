# ITCC47 practice architecture

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
