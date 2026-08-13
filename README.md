# ITCC47 Algorithm Visualizer

Interactive tools for **ITCC47 – Data Structures and Algorithms** (BSIT, Central
Mindanao University). Built to be opened and used directly — no install, no
account, nothing to submit.

| Page | What it does |
|---|---|
| [`index.html`](index.html) | Student start page with the recommended practice path and links to every tool |
| [`visualizer.html`](visualizer.html) | Course-first React workspace with synchronized visualization, code, trace, variables, operations, and output |
| [`writer.html`](writer.html) | Write an algorithm in plain language; it is checked against the five characteristics from Topic 01 |
| [`tracer.html`](tracer.html) | Run course pseudocode step by step — variables and call frames, exact operation formulas, recursive functions, guided recurrences, and measured growth |
| [`problems.html`](problems.html) | Browse equal-height module cards and see which problem sets are available |
| [`practice.html`](practice.html) | Solve a selected module's pseudocode problems against visible examples and hidden cases |

The three pseudocode tools hand off to each other: the Writer exports a skeleton
into the Tracer, and a problem draft can be opened in the Tracer to see where it
goes wrong.

## Running it

Students can open `index.html` directly in a browser, including through
`file://`; the checked-in bundle works from a local folder, USB stick, or shared
drive without a network. Contributors run `npm install` and rebuild the React
visualizer bundle with `npm run build:visualizer` after changing
`visualizer-src/`.

## Setting up for laboratory work

The visualizer needs nothing installed. The *laboratory* exercises do — Python 3,
Git and an editor — so [`setup/`](setup/) contains a check that finds what is
missing, explains each fix, and proves the result by actually running a program.
Students double-click `Check My Computer.cmd` and read the report it opens.

See [`setup/README.md`](setup/README.md).

## For students

Everything here is practice. Passing every check is strong evidence your
algorithm is right, but it is not a proof, and nothing you do here is recorded
or submitted anywhere. Progress is saved only in your own browser.

The point of the hidden cases is the boundaries: the values right at the edge of
each rule, the invalid input, and the order the rules are applied in. If the
examples pass but a hidden case does not, that is where to look.

## Working on it

```bash
node tools/test.js              # dependency-free interpreter, engine, and content checks
npm run test:unit               # the same dependency-free unit command
npm run test:e2e                # laptop, phone, offline, and file-mode browser checks
npm run test:a11y               # Axe WCAG checks in laptop and phone viewports
npm run check                   # complete release check
npm run build:visualizer        # rebuild the static React visualizer bundle
node tools/build-problems.js    # regenerate problems.data.js (instructor only)
```

React, Vite, Playwright Chromium, and Axe are contributor dependencies only.
The site still ships as static HTML, CSS, and JavaScript with no server. The
shared engine contracts and the boundary between public practice and a future
authenticated grading portal are documented in [`docs/architecture.md`](docs/architecture.md).

`tools/test.js` needs nothing but Node. `tools/build-problems.js` additionally
needs `problems.hidden.json`, which is gitignored and not in this repository —
see [`tools/README.md`](tools/README.md).

### Branches

- **`main`** — what students use. Always deployable; every push publishes to
  GitHub Pages. Nothing lands here directly.
- **`pre-production`** — integration branch. Finished work waits here until it
  is ready to publish.
- **`feat/*`** — one branch per feature, cut from `pre-production` and merged
  back into it.

Publishing is the act of merging `pre-production` into `main`. The separation
exists because the semester does not pause: a partly-finished visualizer must
never appear on the URL students were given mid-term.

To preview `pre-production`, check it out and open `index.html`; generated
visualizer assets are committed so previewing does not require a build.

## Course context

Aligned to the ITCC47 syllabus and its eight-module sequence. The pages
currently cover Module 1 (algorithmic thinking, pseudocode, exact I/O,
complexity basics), Module 2 searching and sorting foundations, and introductory
array-list insertion and removal. Linked lists, stacks and queues, recursion,
trees, and graphs remain later visualizer adapters.

The pseudocode grammar, the primitive-operation cost model, and the worked
examples follow the lecture material rather than any general convention — `/` is
integer division, and a variable-indexed array access costs 4 operations, as in
the complexity chapter's worked tables.
