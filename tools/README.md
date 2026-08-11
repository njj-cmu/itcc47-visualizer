# Building the problem sets

## The two source files

Problem data is split by whether it is safe to publish. This repository is
public, so the split is load-bearing, not a convention.

| File | In git? | Holds |
|---|---|---|
| `problems.public.json` | Yes | Statements, rules, I/O notes, starters, visible examples |
| `problems.hidden.json` | **No — gitignored** | Hidden test inputs, expected answers, reference solutions |
| `problems.data.js` | Yes | Generated. The file the page actually loads |

Everything in `problems.public.json` is displayed in the UI anyway, so keeping
it in the repo costs nothing and keeps problems easy to edit and review.

`problems.hidden.json` exists only on your machine. **It cannot be recovered
from this repository — keep a backup somewhere outside it.**

## Editing problems

Edit either source file, then run:

```bash
node tools/build-problems.js
```

That regenerates `problems.data.js`. Commit `problems.public.json` and
`problems.data.js`; `problems.hidden.json` is ignored and will not appear in
`git status`.

## The build verifies before it writes

`problems.hidden.json` carries a reference solution per problem, in the course
pseudocode. Before emitting anything, the build runs each reference through
`interpreter.js` against every visible and hidden case and requires an exact
match. Any disagreement fails the build and writes nothing.

This is a guard against shipping a test that no correct answer can pass. A
change to the interpreter that alters evaluation — operator precedence, integer
division, string coercion — would otherwise silently invalidate the stored
hashes, and the failure would surface as students being marked wrong.

## What the build actually protects

**Expected answers for hidden cases are one-way hashes.** The build replaces
each expected output with a salted SHA-256 digest iterated 4000 times. There is
no key in the shipped page and nothing to decrypt, so the answers cannot be
recovered from `problems.data.js` — not by reading it, not by calling functions
in the console, not by setting breakpoints. The checker hashes what the
student's program printed and compares digests.

**Hidden test inputs are obfuscated, not encrypted.** The page has to recover
them in order to run the student's code against them, so the keying material is
necessarily present. A determined student can get the inputs back. That is a
deliberate, accepted limit: knowing an input like `[1, false, true]` without
knowing the expected answer still requires working the rules out, which is the
exercise.

**Visible examples stay in plaintext**, because the page displays them anyway.

## What this does not protect against

Anything running in the student's own browser is ultimately under their control.
The realistic remaining attacks:

- **Guessing against the hash.** A short answer like a fee has a small range of
  plausible values. The 4000 rounds make each guess cost real time, but a
  determined student could script it. It is slower than just solving the problem.
- **Reading the inputs** and reasoning out the answer by hand — which is the
  assignment.
- **Editing the page** to force a pass. Progress is stored in `localStorage` and
  can simply be edited.

So: this is solid for practice and self-checking, and it removes the trivial
"just open the file and read the answers" path. It is **not** exam security. If
results ever need to carry marks, the checking has to happen somewhere the
student cannot reach — a server, or the offline checker in the Laboratory
Package.

## History note

An earlier layout kept everything in one file, `problems.source.json`, which was
committed to a public repository along with a `problems.js` predecessor. Both
carried every hidden answer in plaintext, which defeated the hashing entirely.
The repository was rebuilt from a clean history and all hidden cases were
rotated to fresh inputs. The split above is what prevents a repeat: there is no
longer a file that contains both the answers and a reason to commit it.
