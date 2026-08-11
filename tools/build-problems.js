/*
 * Builds the distributable problem file from a public half and a private half.
 *
 *   node tools/build-problems.js
 *
 * Reads  : problems.public.json   (committed — statements, rules, visible examples)
 *          problems.hidden.json   (LOCAL ONLY, gitignored — hidden cases + answers)
 * Writes : problems.data.js       (committed — the file the page loads)
 *
 * What changes in the output:
 *   - Expected outputs are replaced by a salted, iterated SHA-256 digest. These
 *     are one-way: there is no key in the page and nothing to decrypt, so the
 *     answers genuinely cannot be recovered from the shipped file.
 *   - Hidden test inputs are XOR-obfuscated. This is NOT encryption — the
 *     inputs must be recoverable at runtime to execute the student's code, so
 *     the keying material is necessarily present. It stops casual reading only.
 *   - Visible examples stay in plaintext; the UI displays them anyway.
 *
 * Before emitting anything, every problem's reference solution is executed
 * against every visible and hidden case. A mismatch fails the build rather than
 * shipping a test nobody can pass — which is what a change to the interpreter
 * would otherwise quietly cause.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ROUNDS = 4000;

const sha256hex = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const sha256bytes = (s) => crypto.createHash('sha256').update(s, 'utf8').digest();

/** Must stay identical to Hash.digest() in sha256.js. */
function digest(salt, payload, rounds) {
  let h = sha256hex(`${salt}|${payload}`);
  for (let i = 0; i < rounds; i++) h = sha256hex(h);
  return h;
}

/** Must stay identical to Hash.deobfuscate() in sha256.js. */
function obfuscate(salt, index, text) {
  const plain = Buffer.from(text, 'utf8');
  const out = Buffer.alloc(plain.length);
  for (let i = 0; i < plain.length; i++) {
    const block = sha256bytes(`${salt}#${index}#${Math.floor(i / 32)}`);
    out[i] = plain[i] ^ block[i % 32];
  }
  return out.toString('base64');
}

/*
 * How the checker normalizes a run's outputs before hashing.
 *
 * MUST stay byte-identical to canon() in problems-app.js — the page hashes what
 * the student printed and compares it against what this produced, so any
 * difference fails every multi-output problem while single-output ones keep
 * passing, which is a maddening way to find out.
 *
 * The \u0001 (SOH) separator is load-bearing, not decoration: joining with nothing
 * would make ['1','23'] and ['12','3'] hash identically, so a wrong answer
 * could pass. It is written as an escape here because a raw control byte is
 * invisible in an editor and reads exactly like an empty string.
 */
const CANON_SEPARATOR = '\u0001';

function canon(values) {
  return values.map((v) => {
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }).join(CANON_SEPARATOR);
}

// ---------- reference verification ----------

/** Load the page's own interpreter so the build checks answers the same way the page will. */
function loadInterpreter() {
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'interpreter.js'), 'utf8'), ctx);
  return {
    parse: vm.runInContext('parsePseudocode', ctx),
    runProgram: vm.runInContext('runProgram', ctx),
  };
}

function runReference(engine, ast, inputs, cap = 200000) {
  const gen = engine.runProgram(ast, [...inputs]);
  const out = [];
  let steps = 0;
  let r = gen.next();
  while (!r.done) {
    if (r.value.kind === 'write') out.push(r.value.outputValue);
    if (++steps > cap) throw new Error('reference solution did not terminate');
    r = gen.next();
  }
  return out;
}

const sameOutputs = (a, b) =>
  a.length === b.length && a.every((v, i) => canon([v]) === canon([b[i]]));

/** Every documented case must be reproduced by the reference, or the build stops. */
function verify(engine, problem, hiddenEntry) {
  const problems = [];
  let ast;
  try {
    ast = engine.parse(hiddenEntry.reference);
  } catch (e) {
    return [`${problem.id}: reference solution does not parse — ${e.message}`];
  }

  const check = (label, inputs, expected) => {
    let actual;
    try {
      actual = runReference(engine, ast, inputs);
    } catch (e) {
      problems.push(`${problem.id} ${label}: reference solution failed — ${e.message}`);
      return;
    }
    if (!sameOutputs(actual, expected)) {
      problems.push(
        `${problem.id} ${label}: inputs ${JSON.stringify(inputs)} — ` +
        `file says ${JSON.stringify(expected)}, reference produced ${JSON.stringify(actual)}`);
    }
  };

  problem.visibleTests.forEach((t, i) => check(`visible[${i}]`, t.inputs, t.expected));
  hiddenEntry.tests.forEach((t, i) => check(`hidden[${i}]`, t.inputs, t.expected));
  return problems;
}

// ---------- build ----------

function readJson(file, hint) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.error(`Missing ${file} — ${hint}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function build() {
  const problems = readJson('problems.public.json', 'this file is committed; restore it from git.');
  const hidden = readJson('problems.hidden.json',
    'this file is deliberately gitignored. Restore it from your own backup — it is not in the repo.');

  const engine = loadInterpreter();
  const failures = [];

  const out = problems.map((p) => {
    const entry = hidden[p.id];
    if (!entry) {
      failures.push(`${p.id}: no entry in problems.hidden.json`);
      return null;
    }
    failures.push(...verify(engine, p, entry));

    // A stable per-problem salt keeps identical answers in different problems
    // from producing identical hashes.
    const salt = sha256hex(`itcc47:${p.id}`).slice(0, 32);

    return {
      id: p.id,
      title: p.title,
      module: p.module,
      difficulty: p.difficulty,
      statement: p.statement,
      rules: p.rules,
      ioNote: p.ioNote,
      starter: p.starter,
      salt,
      visibleTests: p.visibleTests.map((t) => ({
        inputs: t.inputs,
        expected: t.expected,
        note: t.note,
      })),
      hidden: entry.tests.map((t, i) => ({
        i: obfuscate(salt, i, JSON.stringify(t.inputs)),
        n: t.expected.length,
        h: digest(salt, canon(t.expected), ROUNDS),
      })),
    };
  });

  if (failures.length) {
    console.error('Build stopped — the reference solutions do not agree with the test data:\n');
    failures.forEach((f) => console.error('  ' + f));
    console.error('\nNothing was written. Fix the reference solution or the expected values.');
    process.exit(1);
  }

  const banner = `/*
 * GENERATED FILE — do not edit by hand.
 * Built from problems.public.json + problems.hidden.json by tools/build-problems.js
 *
 * Expected answers for hidden cases are stored only as salted, iterated
 * SHA-256 digests (${ROUNDS} rounds). They are one-way: there is no key here
 * and nothing to decrypt. Hidden inputs are obfuscated, not encrypted.
 */`;

  const body = `${banner}\nconst PROBLEM_ROUNDS = ${ROUNDS};\nconst PROBLEMS = ${JSON.stringify(out, null, 2)};\n`;
  fs.writeFileSync(path.join(ROOT, 'problems.data.js'), body, 'utf8');

  const totalHidden = out.reduce((a, p) => a + p.hidden.length, 0);
  const totalVisible = out.reduce((a, p) => a + p.visibleTests.length, 0);
  console.log('Built problems.data.js');
  console.log(`  ${out.length} problems`);
  console.log(`  ${totalVisible} visible examples (plaintext, shown in the UI)`);
  console.log(`  ${totalHidden} hidden cases (answers hashed, ${ROUNDS} rounds)`);
  console.log(`  ${totalVisible + totalHidden} cases verified against the reference solutions`);
  console.log('\nCommit: problems.public.json, problems.data.js');
  console.log('Never commit: problems.hidden.json  <-- gitignored, keep your own backup');
}

build();
