# BSIT Learning Lab

Interactive, local-first learning tools for BSIT programming courses at Central
Mindanao University. The site is static: students can open it directly, use it
offline, and practise without an account or a submission system.

## Subjects

### ITCC45 — Object-Oriented Programming

The Python Object Lab teaches six connected topics: Classes, Objects,
Encapsulation, Inheritance, Class Abstraction, and Polymorphism. Each topic has
one deterministic guided visualization and three structured practice tasks.
Examples are valid Python 3.9+ programs that students can copy and run locally;
the browser intentionally does not execute arbitrary Python.

| Page | Purpose |
|---|---|
| [`itcc45.html`](itcc45.html) | ITCC45 subject home |
| [`itcc45-topics.html`](itcc45-topics.html) | Ordered six-topic curriculum |
| [`visualizer.html?course=itcc45`](visualizer.html?course=itcc45) | Python Object Lab |
| [`itcc45-practice.html`](itcc45-practice.html) | Local structured practice |

### ITCC47 — Data Structures and Algorithms

The existing algorithm, pseudocode, complexity, recurrence, problem-set, array,
and linked-list tools remain available under their original URLs. The former
root learning page is now [`itcc47.html`](itcc47.html).

| Page | Purpose |
|---|---|
| [`visualizer.html`](visualizer.html) | Synchronized algorithm and data-structure workspace |
| [`writer.html`](writer.html) | Plain-language algorithm writer |
| [`tracer.html`](tracer.html) | Pseudocode execution, counting, and recurrence lab |
| [`problems.html`](problems.html) | ITCC47 module catalog |
| [`practice.html`](practice.html) | Pseudocode problem practice |

The root [`index.html`](index.html) is the **BSIT Learning Lab** subject chooser.

## Running it

Open `index.html` directly. Checked-in bundles and classic scripts keep every
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

`tools/build-problems.js` still requires the instructor-only,
gitignored `problems.hidden.json`; see [`tools/README.md`](tools/README.md).

## Setup check

[`setup/`](setup/) checks Python 3, Git, and an editor for both subjects. Its
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

This repository is public practice, not an academic record. It stores no
identity, grades, timestamps, authentication, or authoritative submissions.
The detailed engine, object-frame, offline, and hosted-portal boundaries are in
[`docs/architecture.md`](docs/architecture.md).
