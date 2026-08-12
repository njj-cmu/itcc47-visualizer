/*
 * Smoke tests for the parts of the page that are pure logic.
 *
 *   node tools/test.js
 *
 * Runs without problems.hidden.json, so CI can run it on a fresh clone.
 * Deliberately dependency-free, matching the rest of the project.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

let failures = 0;
let checks = 0;

function ok(label, condition, detail) {
  checks++;
  if (condition) return;
  failures++;
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
}

function section(name) {
  console.log(`\n${name}`);
}

// ---------- environment ----------

function load(files, extras = {}) {
  const ctx = vm.createContext({
    console,
    TextEncoder,
    TextDecoder,
    atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    ...extras,
  });
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
  return {
    ctx,
    get: (name) => vm.runInContext(name, ctx),
  };
}

const engine = load(['sha256.js', 'interpreter.js', 'presets.js', 'writer-presets.js', 'writer-checks.js', 'problems.data.js']);
const parse = engine.get('parsePseudocode');
const runProgram = engine.get('runProgram');
const fmtValue = engine.get('fmtValue');

const countingEngine = load(['interpreter.js', 'playback.js', 'complexity.js', 'symbolic-counting.js']);
const Counting = countingEngine.get('ITCC47Counting');
const parseForCounting = countingEngine.get('parsePseudocode');
const collectForCounting = countingEngine.get('collectSteps');

function analyseCount(src, inputs, model = 'lecture', inputName = 'n') {
  const ast = parseForCounting(src);
  const sourceLines = src.split('\n');
  const run = collectForCounting(ast, inputs);
  return Counting.analyse({ ast, steps: run.steps, sourceLines, inputs, model, inputName });
}

function outputs(src, inputs) {
  const gen = runProgram(parse(src), [...inputs]);
  const out = [];
  let steps = 0;
  let r = gen.next();
  while (!r.done) {
    if (r.value.kind === 'write') out.push(r.value.outputValue);
    if (++steps > 200000) throw new Error('did not terminate');
    r = gen.next();
  }
  return out;
}

const parses = (src) => { try { parse(src); return true; } catch (e) { return false; } };

/** null on any parse/run failure, so one broken case reports as a FAIL instead of ending the run. */
const tryOutputs = (src, inputs) => { try { return outputs(src, inputs); } catch (e) { return null; } };

const eq = (a, b) => !!a && a.length === b.length && a.every((v, i) => String(v) === String(b[i]));

// ---------- parser: block nesting ----------
// Newlines are stripped from the token stream, so "ELSE IF x THEN" and an ELSE
// whose first statement is a nested IF are the same token sequence. They are
// separated by line number. These cases pin that down.

section('parser: block nesting');

ok('IF nested in THEN', parses('IF a THEN\n IF b THEN\n  x <- 1\n ENDIF\nENDIF'));
ok('IF nested in ELSE', parses('IF a THEN\n x <- 1\nELSE\n IF b THEN\n  x <- 2\n ENDIF\nENDIF'));
ok('IF/ELSE nested in ELSE', parses('IF a THEN\n x<-1\nELSE\n IF b THEN\n  x<-2\n ELSE\n  x<-3\n ENDIF\nENDIF'));
ok('IF nested in ELSE, two deep', parses('IF a THEN\n x<-1\nELSE\n IF b THEN\n  x<-2\n ELSE\n  IF c THEN\n   x<-3\n  ENDIF\n ENDIF\nENDIF'));
ok('ELSE IF chain', parses('IF a THEN\n x<-1\nELSE IF b THEN\n x<-2\nELSE IF c THEN\n x<-3\nELSE\n x<-4\nENDIF'));
ok('FOR nested in ELSE', parses('IF a THEN\n x<-1\nELSE\n FOR i <- 1 TO 3 DO\n  x<-2\n ENDFOR\nENDIF'));
ok('WHILE nested in ELSE', parses('IF a THEN\n x<-1\nELSE\n WHILE b DO\n  x<-2\n ENDWHILE\nENDIF'));
ok('unclosed IF is rejected', !parses('IF a THEN\n x <- 1'));
ok('stray ENDIF is rejected', !parses('x <- 1\nENDIF'));

// ELSE IF and a nested IF must not merely parse — they must mean different things.
const ELSE_IF = 'READ a\nREAD b\nIF a > 10 THEN\n WRITE 1\nELSE IF b > 10 THEN\n WRITE 2\nELSE\n WRITE 3\nENDIF';
const NESTED = 'READ a\nREAD b\nIF a > 10 THEN\n WRITE 1\nELSE\n IF b > 10 THEN\n  WRITE 2\n ENDIF\n WRITE 9\nENDIF';
ok('ELSE IF takes the second branch', eq(tryOutputs(ELSE_IF, [5, 20]), [2]));
ok('ELSE IF falls through to ELSE', eq(tryOutputs(ELSE_IF, [5, 5]), [3]));
ok('nested IF runs the statement after it', eq(tryOutputs(NESTED, [5, 20]), [2, 9]));
ok('nested IF skips its body but continues', eq(tryOutputs(NESTED, [5, 5]), [9]));

// ---------- interpreter: evaluation ----------

section('interpreter: evaluation');

ok('integer division truncates', eq(tryOutputs('WRITE 7 / 2', []), [3]));
ok('modulo', eq(tryOutputs('WRITE 7 % 2', []), [1]));
ok('string concatenation via +', eq(tryOutputs('WRITE "A" + "_B"', []), ['A_B']));
ok('number coerced when concatenated', eq(tryOutputs('WRITE "n=" + 5', []), ['n=5']));
ok('<> is inequality', eq(tryOutputs('IF 1 <> 2 THEN\n WRITE 1\nENDIF', []), [1]));
ok('AND short-circuits', eq(tryOutputs('IF FALSE AND TRUE THEN\n WRITE 1\nELSE\n WRITE 0\nENDIF', []), [0]));
ok('OR short-circuits', eq(tryOutputs('IF TRUE OR FALSE THEN\n WRITE 1\nENDIF', []), [1]));
ok('array literal and indexing', eq(tryOutputs('a <- [4, 9, 16]\nWRITE a[1]', []), [9]));
ok('FOR loop runs start..end inclusive', eq(tryOutputs('t <- 0\nFOR i <- 1 TO 4 DO\n t <- t + i\nENDFOR\nWRITE t', []), [10]));
ok('FOR loop with start > end never runs', eq(tryOutputs('t <- 0\nFOR i <- 5 TO 1 DO\n t <- t + 1\nENDFOR\nWRITE t', []), [0]));
ok('WHILE loop', eq(tryOutputs('n <- 8\nc <- 0\nWHILE n > 1 DO\n n <- n / 2\n c <- c + 1\nENDWHILE\nWRITE c', []), [3]));
ok('BREAK exits the loop', eq(tryOutputs('FOR i <- 1 TO 9 DO\n IF i > 2 THEN\n  BREAK\n ENDIF\n WRITE i\nENDFOR', []), [1, 2]));
ok('STOP ends the program', eq(tryOutputs('WRITE 1\nSTOP\nWRITE 2', []), [1]));
ok('CASE matches', eq(tryOutputs('x <- 2\nCASE x OF\n 1: WRITE "one"\n 2: WRITE "two"\n DEFAULT: WRITE "other"\nENDCASE', []), ['two']));
ok('CASE falls back to DEFAULT', eq(tryOutputs('x <- 9\nCASE x OF\n 1: WRITE "one"\n DEFAULT: WRITE "other"\nENDCASE', []), ['other']));
ok('# inside a string is not a comment', eq(tryOutputs('WRITE "#VALUE" # real comment', []), ['#VALUE']));
ok('unterminated string is rejected', !parses('WRITE "missing'));
ok('malformed number is rejected', !parses('WRITE 1.2.3'));
ok('two statements on one line are rejected', !parses('x <- 1 WRITE x'));
ok('BREAK outside a loop is rejected', !parses('BREAK'));
ok('invalid FOR variable is rejected', !parses('FOR 1 <- 1 TO 3 DO\n WRITE 1\nENDFOR'));

let diagnostic = null;
try { parse('WRITE "missing'); } catch (e) { diagnostic = e; }
ok('parse diagnostics include code, line, and column', diagnostic && diagnostic.code === 'E_UNTERMINATED_STRING' && diagnostic.line === 1 && diagnostic.column === 7);

let missingInput = null;
try { outputs('READ x\nWRITE x', []); } catch (e) { missingInput = e; }
ok('missing READ input is a friendly runtime error', missingInput && missingInput.code === 'E_INPUT_EXHAUSTED' && missingInput.line === 1);

let badRead = null;
try { outputs('a <- [1]\nWRITE a[1]', []); } catch (e) { badRead = e; }
ok('out-of-bounds list read is rejected', badRead && badRead.code === 'E_INDEX_OUT_OF_BOUNDS');
ok('one-based list construction remains supported', eq(tryOutputs('a <- []\na[1] <- 9\nWRITE a[1]', []), [9]));

let zeroDivision = null;
try { outputs('WRITE 4 / 0', []); } catch (e) { zeroDivision = e; }
ok('division by zero is rejected on the correct line', zeroDivision && zeroDivision.code === 'E_DIVIDE_BY_ZERO' && zeroDivision.line === 1);

// reading an unassigned variable should be an error, not silently undefined
let threw = false;
try { outputs('WRITE mystery', []); } catch (e) { threw = true; }
ok('unassigned variable is an error', threw);

// ---------- exact symbolic operation counting ----------

section('symbolic operation counting');

const SUM_N = 'READ n\ntotal <- 0\nFOR i <- 1 TO n DO\n total <- total + i\nENDFOR\nWRITE total';
const sumLecture = analyseCount(SUM_N, [4]);
ok('lecture model derives an exact linear formula', sumLecture.symbolicTotal === '4n + 6' && sumLecture.growthClass === 'O(n)');
ok('lecture symbolic total matches the observed run', Counting.expression.evaluate([6, 4], 4) === sumLecture.actualTotal);
ok('linear formula matches actual executions for several n', [1, 4, 9].every((n) => {
  const analysis = analyseCount(SUM_N, [n]);
  return Counting.expression.evaluate([6, 4], n) === analysis.actualTotal;
}));
ok('lecture FOR header is explicitly free', sumLecture.rows.some((row) => row.kind === 'loop-header' && row.unitCost === 0));
ok('loop body explains n executions', sumLecture.rows.some((row) => row.line === 4 && row.symbolicRuns === 'n' && row.contribution === '4n'));

const sumFull = analyseCount(SUM_N, [4], 'full');
ok('full-control model has setup, condition, and increment rows', ['setup', 'condition', 'increment'].every((part) => sumFull.rows.some((row) => row.id.endsWith(part))));
ok('full-control formula is exact', sumFull.symbolicTotal === '11n + 12' && sumFull.actualTotal === 56);

const AFFINE = 'READ n\nc <- 0\nFOR i <- 0 TO n - 1 DO\n c <- c + 1\nENDFOR\nWRITE c';
const affine = analyseCount(AFFINE, [7]);
ok('affine 0 TO n - 1 bound simplifies to n', affine.loops[0].symbolicIterations === 'n' && affine.symbolicTotal === '4n + 6');

const CONSTANT_LOOP = 'x <- 0\nFOR i <- 1 TO 4 DO\n x <- x + 1\nENDFOR\nWRITE x';
const fixed = analyseCount(CONSTANT_LOOP, []);
ok('constant-bound FOR loop produces a constant formula', fixed.symbolicTotal === '20' && fixed.growthClass === 'O(1)');

const EMPTY_LOOP = 'x <- 0\nFOR i <- 5 TO 1 DO\n x <- x + 1\nENDFOR\nWRITE x';
const emptyLoop = analyseCount(EMPTY_LOOP, []);
ok('constant empty FOR loop clamps to zero iterations', emptyLoop.symbolicTotal === '4' && emptyLoop.actualTotal === 4);

const NESTED_LOOPS = 'READ n\nc <- 0\nFOR i <- 1 TO n DO\n FOR j <- 1 TO n DO\n  c <- c + 1\n ENDFOR\nENDFOR\nWRITE c';
const nested = analyseCount(NESTED_LOOPS, [3]);
ok('independent nested FOR loops produce n squared', nested.symbolicTotal === '4n² + 6' && nested.growthClass === 'O(n²)');
ok('nested formula matches observed executions', nested.actualTotal === 42);

const conditional = analyseCount('READ n\nIF n > 0 THEN\n WRITE n\nENDIF', [3]);
ok('data-dependent branch refuses to invent a formula', conditional.symbolicTotal === null && conditional.diagnostics.some((d) => d.code === 'W_SYMBOLIC_BRANCH'));

const dependentLoop = analyseCount('READ n\nFOR i <- 1 TO n DO\n FOR j <- 1 TO i DO\n  WRITE j\n ENDFOR\nENDFOR', [3]);
ok('dependent nested bound is diagnosed as unsupported', dependentLoop.symbolicTotal === null && dependentLoop.diagnostics.some((d) => d.code === 'W_SYMBOLIC_LOOP_BOUND' && d.line === 3));

const wrongInput = analyseCount(SUM_N, [4], 'lecture', 'missing');
ok('unknown input mapping is not treated as n', wrongInput.symbolicTotal === null && wrongInput.diagnostics.some((d) => d.code === 'W_SYMBOLIC_LOOP_BOUND'));

const FRACTIONAL_BOUND = 'READ n\nFOR i <- 1 TO n / 2 DO\n WRITE i\nENDFOR';
const fractional = analyseCount(FRACTIONAL_BOUND, [8]);
ok('flooring division in a loop bound is not falsely treated as affine', fractional.symbolicTotal === null && fractional.diagnostics.some((d) => d.code === 'W_SYMBOLIC_LOOP_BOUND'));

// ---------- shared playback contract ----------

section('shared playback');

let scheduled = 0;
let cancelled = 0;
const playbackEngine = load(['playback.js'], {
  setTimeout: () => { scheduled++; return scheduled; },
  clearTimeout: () => { cancelled++; },
});
const Playback = playbackEngine.get('ITCC47Playback');
const timeline = [0, 1, 2, 3].map((i) => Playback.timelineEvent({
  id: `test:${i}`, domain: 'test', type: i === 3 ? 'complete' : 'state', message: String(i),
  frame: { value: i }, metrics: {}, boundary: i === 2, terminal: i === 3,
}));
const seen = [];
const controller = Playback.createController({ onChange: (s) => seen.push(`${s.status}:${s.index}`) });
controller.load(timeline);
ok('playback loads at the first event', controller.getState().index === 0 && controller.getState().status === 'paused');
controller.step();
ok('playback steps forward', controller.getState().index === 1);
controller.seek(0);
ok('playback seeks backward', controller.getState().index === 0);
controller.finishSegment();
ok('playback finishes at the next boundary', controller.getState().index === 2);
controller.setSpeed(9);
ok('playback speed updates', controller.getState().speed === 9);
controller.seek(0);
controller.play();
controller.pause();
ok('playback schedules and cancels one timer', scheduled === 1 && cancelled === 1);
controller.seek(3);
ok('terminal seek marks playback complete', controller.getState().status === 'complete');
controller.dispose();
ok('disposed playback has no events', controller.getState().total === 0);

const algorithmEngine = load(['playback.js', 'algorithms.js'], { setTimeout, clearTimeout });
const ALGORITHMS = algorithmEngine.get('ALGORITHMS');
const binaryEvents = ALGORITHMS.binary.run([4, -2, 9, 1], 9);
ok('binary search begins with its sorted-data precondition', binaryEvents[0].type === 'preprocess' && binaryEvents[0].frame.array.join(',') === '4,-2,9,1');
ok('binary precondition explains preprocessing cost', binaryEvents[0].message.includes('O(n log n)') && binaryEvents[0].message.includes('linear search may be cheaper'));
ok('binary search shows a separate sorted-copy frame', binaryEvents[1].type === 'preprocess' && binaryEvents[1].frame.array.join(',') === '-2,1,4,9');
ok('binary preprocessing does not mutate the original frame', binaryEvents[0].frame.array.join(',') === '4,-2,9,1');
const alreadySortedEvents = ALGORITHMS.binary.run([-3, -3, 0, 8], -3);
ok('binary search recognizes sorted input with duplicates', alreadySortedEvents[0].message.includes('already sorted') && alreadySortedEvents[0].frame.array.join(',') === '-3,-3,0,8');
ok('insertion sort declares moves instead of swaps', ALGORITHMS.insertion.metrics.some((m) => m.key === 'moves') && !ALGORITHMS.insertion.metrics.some((m) => m.key === 'swaps'));
ok('insertion move events use the declared move metric', ALGORITHMS.insertion.run([3, -1, 2]).some((event) => event.metrics.moves > 0 && event.frame.highlight.move));
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
ok('visual input uses one 18-value limit', appSource.includes('const MAX_VISUAL_VALUES = 18') && /parsed\.length > MAX_VISUAL_VALUES/.test(appSource));

// ---------- shipped content ----------

section('shipped content');

const PRESETS = engine.get('PRESETS');
PRESETS.forEach((p) => ok(`tracer preset parses: ${p.name}`, parses(p.code)));

const parseInputList = engine.get('parseInputList');
PRESETS.forEach((p) => {
  let ran = true;
  try { outputs(p.code, parseInputList(p.inputs)); } catch (e) { ran = false; }
  ok(`tracer preset runs: ${p.name}`, ran);
});

const WRITER_PRESETS = engine.get('WRITER_PRESETS');
const analyzeAlgorithm = engine.get('analyzeAlgorithm');
WRITER_PRESETS.forEach((p) => {
  let ran = true;
  try { analyzeAlgorithm(p.steps); } catch (e) { ran = false; }
  ok(`writer preset analyses: ${p.name}`, ran);
});

// ---------- generated problem data ----------

section('generated problem data');

const PROBLEMS = engine.get('PROBLEMS');
const ROUNDS = engine.get('PROBLEM_ROUNDS');
const Hash = engine.get('Hash');

ok('problems.data.js has problems', PROBLEMS.length > 0);
['CH01-PS01', 'CH01-PS02', 'CH01-PS03', 'CH01-PS04', 'CH01-PS05'].forEach((id) => {
  ok(`${id}: additional Chapter 1 problem is shipped`, PROBLEMS.some((problem) => problem.id === id));
});
ok('round count is set', ROUNDS > 0);

PROBLEMS.forEach((p) => {
  ok(`${p.id}: starter parses`, parses(p.starter));
  ok(`${p.id}: has visible examples`, p.visibleTests.length > 0);
  ok(`${p.id}: has hidden cases`, p.hidden.length > 0);
  ok(`${p.id}: salt present`, typeof p.salt === 'string' && p.salt.length === 32);

  // No plaintext answer may survive into the shipped file.
  p.hidden.forEach((h, i) => {
    ok(`${p.id}: hidden[${i}] stores no expected values`,
      h.expected === undefined && typeof h.h === 'string' && h.h.length === 64);
    let inputs = null;
    try { inputs = JSON.parse(Hash.deobfuscate(p.salt, i, h.i)); } catch (e) { /* left null */ }
    ok(`${p.id}: hidden[${i}] inputs decode`, Array.isArray(inputs));
    ok(`${p.id}: hidden[${i}] declares an output count`, Number.isInteger(h.n) && h.n >= 0);
  });
});

// ---------- the checker and the build must agree ----------
// The page hashes what a student printed and compares it against a digest made
// at build time. If the two canon() functions disagree by even one character,
// single-output problems keep passing while every multi-output problem becomes
// unsolvable — a failure that looks like a broken problem, not a broken tool.

section('canon: build and checker agree');

function extractCanon(file, pattern) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const match = src.match(pattern);
  if (!match) return null;
  try { return vm.runInNewContext(match[0] + ';canon', {}); } catch (e) { return null; }
}

const appCanon = extractCanon('problems-app.js', /function canon\(values\)[\s\S]*?\n\}/);
const buildCanon = extractCanon('tools/build-problems.js', /const CANON_SEPARATOR[\s\S]*?function canon\(values\)[\s\S]*?\n\}/);

ok('checker defines canon()', typeof appCanon === 'function');
ok('build defines canon()', typeof buildCanon === 'function');

if (appCanon && buildCanon) {
  [
    [['FOUND', 1]], [[1, 23]], [[12, 3]], [[3000, 235, 1]],
    [[true, false]], [['a']], [[]], [[0, 0, 0]], [['INVALID']],
  ].forEach(([values]) => {
    ok(`canon agrees on ${JSON.stringify(values)}`, appCanon(values) === buildCanon(values),
      appCanon(values) === buildCanon(values) ? '' :
        `checker ${JSON.stringify(appCanon(values))} vs build ${JSON.stringify(buildCanon(values))}`);
  });

  // Without a separator, these two different answers hash identically and a
  // wrong solution passes.
  ok('canon separates values so outputs cannot collide',
    appCanon([1, 23]) !== appCanon([12, 3]));
}

// ---------- offline support ----------

section('offline support');

const swSource = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const { expectedAssets, START, END } = require('./build-sw.js');

// A page added later but missing from the precache list is invisible until a
// student is offline, which is the worst possible time to find out.
// Read only between the generated markers — ordinary string literals elsewhere
// in the file look identical to a list entry.
const blockStart = swSource.indexOf(START);
const blockEnd = swSource.indexOf(END);
ok('precache markers are intact', blockStart !== -1 && blockEnd > blockStart);
const precacheBlock = blockStart === -1 ? '' : swSource.slice(blockStart, blockEnd);
const listed = [...precacheBlock.matchAll(/^\s*'([^']+)',$/gm)].map((m) => m[1]);
const wanted = expectedAssets();
const missing = wanted.filter((a) => !listed.includes(a));
const extra = listed.filter((a) => !wanted.includes(a));

ok('precache list covers every shipped asset', missing.length === 0,
  missing.length ? `missing: ${missing.join(', ')} — run: node tools/build-sw.js` : '');
ok('precache list has no stale entries', extra.length === 0,
  extra.length ? `no longer exist: ${extra.join(', ')} — run: node tools/build-sw.js` : '');
ok('precache includes the site root', listed.includes('./'));
ok('service worker uses the practice cache prefix', swSource.includes("const CACHE_PREFIX = 'itcc47-practice-'"));
ok('service worker precaches atomically', swSource.includes('cache.addAll(PRECACHE)'));
ok('service worker cleans up old caches', swSource.includes('caches.delete'));
ok('service worker preserves unrelated origin caches', swSource.includes('n.startsWith(CACHE_PREFIX) && n !== CACHE'));
ok('service worker ignores non-GET requests', /request\.method\s*!==\s*'GET'/.test(swSource));
ok('service worker ignores cross-origin requests', swSource.includes('url.origin !== self.location.origin'));

// Every page must register the worker, or that page is not available offline.
['index.html', 'visualizer.html', 'writer.html', 'tracer.html', 'problems.html', 'problem-list.html', 'practice.html'].forEach((page) => {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  ok(`${page} registers the offline worker`, html.includes('sw-register.js'));
});

const regSource = fs.readFileSync(path.join(ROOT, 'sw-register.js'), 'utf8');
ok('registration is skipped on file:// URLs', regSource.includes("location.protocol.indexOf('http')"));

const sourceLeak = ['problems.source.json', 'problems.hidden.json']
  .filter((f) => fs.existsSync(path.join(ROOT, f)) && !isIgnored(f));

function isIgnored(file) {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  return gi.split('\n').map((l) => l.trim()).includes(file);
}

ok('no answer file is publishable', sourceLeak.length === 0,
  sourceLeak.length ? `${sourceLeak.join(', ')} exists and is not gitignored` : '');

// Practice results must be deterministic and contain no identity or clock data.
const evaluationEngine = load(['evaluation.js']);
const Evaluation = evaluationEngine.get('ITCC47Evaluation');
const evaluationSpec = {
  activityId: 'practice:test', activityVersion: 2, status: 'passed',
  passed: 1, total: 1, cases: [{ id: 'visible:0', passed: true }], outputs: [[7]], diagnostics: [],
};
const evaluationA = Evaluation.createResult(evaluationSpec);
const evaluationB = Evaluation.createResult(evaluationSpec);
ok('evaluation results are deterministic', JSON.stringify(evaluationA) === JSON.stringify(evaluationB));
ok('evaluation results contain versions', evaluationA.schemaVersion === 1 && evaluationA.engineVersion && evaluationA.activityVersion === 2);
ok('evaluation results contain no identity or timestamps', !('studentId' in evaluationA) && !('timestamp' in evaluationA) && !('grade' in evaluationA));

// ---------- report ----------

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`${failures} failed`);
  process.exit(1);
}
