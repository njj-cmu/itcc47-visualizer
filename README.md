# BSIT Learning Lab

Interactive, local-first learning tools for BSIT programming courses at Central
Mindanao University. The site is static: students can open it directly, use it
offline, and practise without an account or a submission system.

## Subjects

### ITCC45 — Object-Oriented Programming

The Python Object Lab teaches six connected topics: Classes, Objects,
Encapsulation, Inheritance, Class Abstraction, and Polymorphism. Each topic has
three complementary guided examples and three structured practice tasks. The
18 retained examples were pruned from a 24-case teaching audit so introductory,
transfer, and misconception-focused views do not repeat the same lesson.
Examples are valid Python 3.9+ programs that students can copy and run locally;
the browser intentionally does not execute arbitrary Python.

| Page | Purpose |
|---|---|
| [`itcc45.html`](itcc45.html) | ITCC45 subject home |
| [`itcc45-topics.html`](itcc45-topics.html) | Six topics with three guided examples each |
| [`visualizer.html?course=itcc45`](visualizer.html?course=itcc45) | Python Object Lab |
| [`itcc45-practice.html`](itcc45-practice.html) | Local structured practice |

### ITCC47 — Data Structures and Algorithms

The existing algorithm, pseudocode, complexity, recurrence, problem-set, array,
and linked-list tools remain available under their original URLs. The former
root learning page is now [`itcc47.html`](itcc47.html).

| Page | Purpose |
|---|---|
| [`problems.html?view=visualizations`](problems.html?view=visualizations) | Canonical algorithm and data-structure visualization catalog |
| [`problems.html?view=workbenches`](problems.html?view=workbenches) | Industry-scale workbench samples |
| [`visualizer.html?activity=bubble-sort`](visualizer.html?activity=bubble-sort) | Synchronized workspace for a selected activity |
| [`writer.html`](writer.html) | Plain-language algorithm writer |
| [`tracer.html`](tracer.html) | Pseudocode execution, counting, and recurrence lab |
| [`problems.html`](problems.html) | Practice-first ITCC47 module catalog and visualization index |
| [`practice.html`](practice.html) | Pseudocode problem practice |

### Computer Architecture

The CPU Lab uses a deterministic 16-bit teaching machine with an 8-bit address
space. Three Module 1 activities now form one learning sequence: fetch a word
through `PC → MAR → Main Memory → MDR → IR`, decode its `4 / 4 / 8` fields,
then run the guided `5 + 13` ADDI example through the ALU. Three curated
presets, HEX/BIN/DEC views, textual evidence, and seven local practice checks
work without an account or network.

| Page | Purpose |
|---|---|
| [`computer-architecture.html`](computer-architecture.html) | Subject home and learning path |
| [`computer-architecture-modules.html`](computer-architecture-modules.html) | Current and planned module roadmap |
| [`visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle`](visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle) | Fetch-cycle CPU Lab |
| [`visualizer.html?course=computer-architecture&activity=architecture-decode-instruction`](visualizer.html?course=computer-architecture&activity=architecture-decode-instruction) | Focused instruction-decoding lab |
| [`visualizer.html?course=computer-architecture&activity=architecture-add-immediate`](visualizer.html?course=computer-architecture&activity=architecture-add-immediate) | Guided `5 + 13` fetch-and-execute CPU Lab |
| [`computer-architecture-practice.html`](computer-architecture-practice.html) | Seven local Fetch, Decode, and Execute checks |

The root [`index.html`](index.html) is the **BSIT Learning Lab** subject chooser.

## Running it

Open `index.html` directly. Checked-in application assets and classic scripts keep every
student route working through `file://`; no install or server is required.
Opening the hosted version once also caches the complete shell for later offline
use. Optional progress stays only in that browser.

Contributors install the locked dependencies and use:

```bash
npm run build:visualizer        # rebuild committed React workspace assets
npm run test:unit               # dependency-free engines and content contracts
npm run test:python             # execute every displayed ITCC45 Python example
npm run test:e2e                # laptop, phone, file-mode, and offline flows
npm run test:a11y               # Axe WCAG checks
npm run check                   # complete release check
node tools/build-sw.js          # regenerate the offline precache list
```

### Private instructor preview

Student pages never show preview controls, and adding `?preview=1` does not unlock
future resources. On the instructor computer, run `npm run setup:instructor-preview`
once. Open the gitignored `.instructor-preview-token`, then visit
`problems.html?instructorKey=YOUR_TOKEN`. The app removes the token from the URL,
stores a browser-local capability, and opens the private preview controls. Use
**Exit instructor mode** before handing that browser profile to someone else.

This is a local capability boundary for the static/offline app, not account-based
authentication. Anyone with source-editing or browser-devtools control can alter a
client-only application; server-trusted identity would require a hosted login.

`tools/build-problems.js` still requires the instructor-only,
gitignored `problems.hidden.json`; see [`tools/README.md`](tools/README.md).

## Setup check

[`setup/`](setup/) checks Python 3, Git, and an editor for the programming subjects. Its
optional laboratory-package verification remains specifically for the
ITCC47 laboratory package.

## Branches

- `main` — published student version; every push deploys GitHub Pages.
- `pre-production` — release integration branch.
- `feat/*` — feature branches cut from `pre-production` and merged back into it.

Publishing is the deliberate merge from `pre-production` to `main`. Generated
visualizer assets are committed so previewing a branch never requires a build.

## Architecture and trust boundary

The versioned `BSITLearningLab` registry owns course metadata and activity
catalogs. `BSITPlayback` and `BSITVisualizerRegistry` are course-neutral shared
contracts; the original `ITCC47*` globals remain compatibility APIs.

Computer Architecture adds a framework-neutral `ComputerArchitectureMachine`
and uses registered `cpu-datapath` and `cpu-instruction-decode` rendering,
evidence-view metadata, and `cpu-preset` input controls. Shared hierarchical
graphs produce five fetch operations, six decode operations, or ten guided-
addition operations, with 19, 16, or 37 optional micro phases respectively.
Compound timing, presentation coordinates, and React state remain separate
from committed machine state.

CPU cues pause at their source, pulse the emitting value or signal, travel over
collision-free SVG routes, and remain latched with the active path until the
next micro phase. The same settled evidence is available with reduced or
disabled motion.

This repository is public practice, not an academic record. It stores no
identity, grades, timestamps, authentication, or authoritative submissions.
The detailed engine, object-frame, offline, and hosted-portal boundaries are in
[`docs/architecture.md`](docs/architecture.md).
