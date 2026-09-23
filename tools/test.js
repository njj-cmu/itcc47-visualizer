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
const recurrenceEngine = load(['interpreter.js', 'recurrence.js']);
const Recurrence = recurrenceEngine.get('ITCC47Recurrence');
const parseForRecurrence = recurrenceEngine.get('parsePseudocode');

function analyseCount(src, inputs, model = 'lecture', inputName = 'n', extra = {}) {
  const ast = parseForCounting(src);
  const sourceLines = src.split('\n');
  const run = collectForCounting(ast, inputs);
  return Counting.analyse({ ast, steps: run.steps, sourceLines, inputs, model, inputName, ...extra });
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
ok('DOWNTO loop decreases inclusively', eq(tryOutputs('t <- 0\nFOR i <- 4 DOWNTO 1 DO\n t <- t + i\nENDFOR\nWRITE t', []), [10]));
ok('TO STEP skips by a positive amount', eq(tryOutputs('t <- 0\nFOR i <- 1 TO 7 STEP 2 DO\n t <- t + i\nENDFOR\nWRITE t', []), [16]));
ok('DOWNTO STEP skips by a positive amount', eq(tryOutputs('t <- 0\nFOR i <- 8 DOWNTO 2 STEP 3 DO\n t <- t + i\nENDFOR\nWRITE t', []), [15]));
let invalidStep = null;
try { outputs('FOR i <- 1 TO 3 STEP 0 DO\n WRITE i\nENDFOR', []); } catch (e) { invalidStep = e; }
ok('zero STEP is rejected at runtime', invalidStep && invalidStep.code === 'E_INVALID_LOOP_STEP' && invalidStep.line === 1);
invalidStep = null;
try { outputs('FOR i <- 3 DOWNTO 1 STEP -1 DO\n WRITE i\nENDFOR', []); } catch (e) { invalidStep = e; }
ok('negative STEP is rejected; direction belongs to DOWNTO', invalidStep && invalidStep.code === 'E_INVALID_LOOP_STEP');
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

// ---------- recursive functions and call frames ----------

section('recursive functions and call frames');

const FACTORIAL = `FUNCTION Factorial(n)
 IF n <= 1 THEN
  RETURN 1
 ENDIF
 CALL Factorial(n - 1) INTO smaller
 RETURN n * smaller
ENDFUNCTION
CALL Factorial(5) INTO answer
WRITE answer`;
ok('parser returns a Program root with hoisted functions', (() => {
  const ast = parse(FACTORIAL);
  return ast.type === 'Program' && ast.functions.length === 1 && ast.body[0].type === 'Call';
})());
ok('forward recursive call returns a value', eq(tryOutputs(FACTORIAL, []), [120]));
ok('CALL without INTO may ignore a return value', eq(tryOutputs('FUNCTION F(x)\n RETURN x\nENDFUNCTION\nCALL F(7)\nWRITE 1', []), [1]));
ok('LENGTH accepts arrays', eq(tryOutputs('values <- [1, 2, 3]\nWRITE LENGTH(values)', []), [3]));
let lengthError = null;
try { outputs('WRITE LENGTH(9)', []); } catch (e) { lengthError = e; }
ok('LENGTH rejects scalars with a friendly diagnostic', lengthError && lengthError.code === 'E_LENGTH_TYPE');
ok('array parameters mutate the caller by reference', eq(tryOutputs(`FUNCTION Change(values)
 values[0] <- 9
ENDFUNCTION
a <- [1, 2]
CALL Change(a)
WRITE a[0]`, []), [9]));
ok('rebinding an array parameter remains local', eq(tryOutputs(`FUNCTION Rebind(values)
 values <- [9]
ENDFUNCTION
a <- [1, 2]
CALL Rebind(a)
WRITE a[0]`, []), [1]));
ok('scalar parameters are passed by value', eq(tryOutputs('FUNCTION Change(x)\n x <- 9\nENDFUNCTION\nx <- 1\nCALL Change(x)\nWRITE x', []), [1]));
ok('GLOBAL permits explicit caller-visible mutation', eq(tryOutputs('FUNCTION Inc()\n GLOBAL count\n count <- count + 1\nENDFUNCTION\ncount <- 4\nCALL Inc()\nWRITE count', []), [5]));
let localError = null;
try { outputs('FUNCTION F()\n WRITE x\n x <- 2\nENDFUNCTION\nx <- 1\nCALL F()', []); } catch (e) { localError = e; }
ok('static locality rejects reading a local before assignment', localError && localError.code === 'E_LOCAL_BEFORE_ASSIGNMENT');
let missingReturn = null;
try { outputs('FUNCTION F()\n WRITE 1\nENDFUNCTION\nCALL F() INTO x', []); } catch (e) { missingReturn = e; }
ok('INTO requires a returned value', missingReturn && missingReturn.code === 'E_MISSING_RETURN_VALUE');
ok('top-level RETURN is rejected', !parses('RETURN 1'));
ok('duplicate functions are rejected', !parses('FUNCTION F()\n RETURN 1\nENDFUNCTION\nFUNCTION F()\n RETURN 2\nENDFUNCTION'));
ok('undefined calls are rejected', !parses('CALL Missing()'));
ok('arity mismatches are rejected', !parses('FUNCTION F(x)\n RETURN x\nENDFUNCTION\nCALL F()'));
ok('nested function definitions are rejected', !parses('FUNCTION F()\n FUNCTION G()\n  RETURN 1\n ENDFUNCTION\n RETURN 1\nENDFUNCTION'));
let misplacedGlobal = null;
try { parse('FUNCTION F()\n WRITE count\n GLOBAL count\nENDFUNCTION'); } catch (e) { misplacedGlobal = e; }
ok('GLOBAL must precede first use', misplacedGlobal && misplacedGlobal.code === 'E_MISPLACED_GLOBAL');

const functionRun = collectForCounting(parseForCounting(FACTORIAL), []);
ok('call and return timeline events are emitted', functionRun.steps.some((step) => step.type === 'call') && functionRun.steps.some((step) => step.type === 'return'));
ok('timeline frames contain immutable-style call-stack snapshots', functionRun.steps.some((step) => step.frame.callStack.length >= 4 && step.frame.activeFrameId));
ok('INTO storage is exposed separately for Full Control', functionRun.steps.some((step) => step.type === 'call-store' && step.metrics.cost === 0 && step.metrics.controlCost > 0));
ok('Lecture charges one operation for CALL', functionRun.steps.filter((step) => step.type === 'call').every((step) => step.metrics.cost === 1));

// ---------- node references and heap frames ----------

section('node references and heap frames');

const NODE_CHAIN = `head <- NEW NODE(18)
head.next <- NEW NODE(7)
head.next.next <- NEW NODE(31)
current <- head
WHILE current <> NULL DO
 WRITE current.value
 current <- current.next
ENDWHILE`;
ok('NULL, NEW NODE, and chained fields parse and traverse', eq(tryOutputs(NODE_CHAIN, []), [18, 7, 31]));
ok('reference assignment preserves node identity', eq(tryOutputs('head <- NEW NODE(4)\nalias <- head\nWRITE alias = head', []), [true]));
ok('distinct node allocations have distinct identities', eq(tryOutputs('a <- NEW NODE(4)\nb <- NEW NODE(4)\nWRITE a = b', []), [false]));
ok('node references compose inside arrays', eq(tryOutputs('nodes <- [NEW NODE(9)]\nWRITE nodes[0].value', []), [9]));

const NESTED_NODE_CALL = `FUNCTION Pass(node)
 RETURN node
ENDFUNCTION
FUNCTION Wrap(node)
 CALL Pass(node) INTO result
 RETURN result
ENDFUNCTION
head <- NEW NODE(9)
CALL Wrap(head) INTO alias
WRITE alias = head`;
ok('node references survive parameters and nested calls', eq(tryOutputs(NESTED_NODE_CALL, []), [true]));

const RECURSIVE_NODE_CALL = `FUNCTION Last(node)
 IF node.next = NULL THEN
  RETURN node
 ENDIF
 CALL Last(node.next) INTO result
 RETURN result
ENDFUNCTION
head <- NEW NODE(4)
head.next <- NEW NODE(8)
head.next.next <- NEW NODE(15)
CALL Last(head) INTO tail
WRITE tail.value`;
ok('recursive call frames carry node references without owning heap identity', eq(tryOutputs(RECURSIVE_NODE_CALL, []), [15]));

function runtimeDiagnostic(source) {
  const run = collectForCounting(parseForCounting(source), []);
  return run.diagnostics[0] || null;
}
ok('NULL field access has a friendly diagnostic', runtimeDiagnostic('head <- NULL\nWRITE head.value')?.code === 'E_NULL_REFERENCE');
ok('invalid node fields have a friendly diagnostic', runtimeDiagnostic('head <- NEW NODE(1)\nWRITE head.left')?.code === 'E_INVALID_NODE_FIELD');
ok('doubly linked prev remains outside the singly linked interpreter', runtimeDiagnostic('head <- NEW NODE(1)\nWRITE head.prev')?.code === 'E_INVALID_NODE_FIELD');
ok('next rejects scalar links explicitly', runtimeDiagnostic('head <- NEW NODE(1)\nhead.next <- 7')?.code === 'E_INVALID_NODE_LINK');
const nodeTimeline = collectForCounting(parseForCounting(NODE_CHAIN), []);
ok('node timeline snapshots expose deterministic heap identities', nodeTimeline.events.at(-1).frame.heap.map((node) => node.id).join(',') === 'node:1,node:2,node:3');
ok('node references remain visible in call-stack frames', collectForCounting(parseForCounting(NESTED_NODE_CALL), []).events.some((event) => event.frame.callStack.some((frame) => Object.values(frame.locals || {}).some((value) => value === '&node:1'))));

// ---------- guided recurrence analysis ----------

section('guided recurrence analysis');
function recurrenceOf(source, name, measure, combineBound = 'constant', extra = {}) {
  return Recurrence.analyse({ program: parseForRecurrence(source), functionName: name, measure, combineBound, ...extra });
}
const factorialRecurrence = recurrenceOf(FACTORIAL, 'Factorial', 'n');
ok('linear recursion is recognized', factorialRecurrence.family === 'linear-recursion' && factorialRecurrence.bigO === 'O(n)');
const BINARY = `FUNCTION Search(values, target, low, high)
 IF low >= high THEN
  RETURN low
 ENDIF
 mid <- (low + high) / 2
 IF values[mid] < target THEN
  CALL Search(values, target, mid + 1, high) INTO result
 ELSE
  CALL Search(values, target, low, mid) INTO result
 ENDIF
 RETURN result
ENDFUNCTION`;
const binaryAst = parseForRecurrence(BINARY);
const binaryInitial = Recurrence.analyse({ program: binaryAst, functionName: 'Search', measure: 'high-low' });
ok('branch-shaped recursion requests a visible worst-case choice', binaryInitial.requiredAssumptions.some((item) => item.kind === 'worst-case-branch'));
const chosenBranch = binaryInitial.requiredAssumptions.find((item) => item.kind === 'worst-case-branch').candidates[0].value;
const binaryRecurrence = Recurrence.analyse({ program: binaryAst, functionName: 'Search', measure: 'high-low', combineBound: 'constant', branchSelection: chosenBranch });
ok('halving recursion derives logarithmic time and depth', binaryRecurrence.family === 'binary-halving' && binaryRecurrence.bigO === 'O(log n)' && binaryRecurrence.stackSpace === 'O(log n)');
const FIB = `FUNCTION Fib(n)
 IF n <= 1 THEN
  RETURN n
 ENDIF
 CALL Fib(n - 1) INTO a
 CALL Fib(n - 2) INTO b
 RETURN a + b
ENDFUNCTION`;
ok('Fibonacci-style recursion gets an exponential upper bound', recurrenceOf(FIB, 'Fib', 'n').family === 'fibonacci');
const SUBSETS = `FUNCTION Enumerate(n)
 IF n <= 0 THEN
  RETURN 1
 ENDIF
 CALL Enumerate(n - 1) INTO without
 CALL Enumerate(n - 1) INTO with_item
 RETURN without + with_item
ENDFUNCTION`;
ok('two T(n - 1) calls are recognized as subset enumeration', recurrenceOf(SUBSETS, 'Enumerate', 'n').family === 'binary-enumeration');
const MUTUAL = `FUNCTION A(n)
 IF n <= 0 THEN
  RETURN 0
 ENDIF
 CALL B(n - 1) INTO x
 RETURN x
ENDFUNCTION
FUNCTION B(n)
 IF n <= 0 THEN
  RETURN 0
 ENDIF
 CALL A(n - 1) INTO x
 RETURN x
ENDFUNCTION`;
ok('mutual recursion is diagnosed as unsupported for symbolic solving', recurrenceOf(MUTUAL, 'A', 'n').diagnostics.some((item) => item.code === 'W_MUTUAL_RECURRENCE'));

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
ok('dependent nested bound derives an exact triangular count', dependentLoop.expandedForm === 'n² + n + 2' && dependentLoop.growthClass === 'O(n²)');
ok('dependent-loop derivation exposes the summation identity', dependentLoop.derivation.some((step) => step.kind === 'summation') && dependentLoop.derivation.some((step) => step.kind === 'identity'));

const wrongInput = analyseCount(SUM_N, [4], 'lecture', 'missing');
ok('unknown input mapping is not treated as n', wrongInput.symbolicTotal === null && wrongInput.diagnostics.some((d) => d.code === 'W_SYMBOLIC_LOOP_BOUND'));

const FRACTIONAL_BOUND = 'READ n\nFOR i <- 1 TO n / 2 DO\n WRITE i\nENDFOR';
const fractional = analyseCount(FRACTIONAL_BOUND, [8]);
ok('flooring division retains a structural floor expression', fractional.symbolicTotal && fractional.symbolicTotal.includes('⌊') && fractional.growthClass === 'O(n)');

const PAIRS = 'READ n\nc <- 0\nFOR i <- 1 TO n - 1 DO\n FOR j <- i + 1 TO n DO\n  c <- c + 1\n ENDFOR\nENDFOR\nWRITE c';
const pairs = analyseCount(PAIRS, [5]);
ok('i + 1 TO n produces n(n - 1)/2 in factored form', pairs.factoredForm.includes('n(n − 1) / 2') && pairs.expandedForm === '2n² − 2n + 6');
ok('dependent-loop formula matches actual counts at several n', [1, 2, 5, 9].every((n) => {
  const result = analyseCount(PAIRS, [n]);
  return result.actualTotal === Counting.SymbolicExpr.evaluate(result.expression, { n });
}));

const REMAINING = 'READ n\nc <- 0\nFOR i <- 1 TO n DO\n FOR j <- 1 TO n - i DO\n  c <- c + 1\n ENDFOR\nENDFOR\nWRITE c';
ok('1 TO n - i produces the same triangular closed form', analyseCount(REMAINING, [5]).expandedForm === '2n² − 2n + 6');

const MULTI = 'READ n\nREAD m\nc <- 0\nFOR i <- 1 TO n DO\n FOR j <- 1 TO m DO\n  c <- c + 1\n ENDFOR\nENDFOR\nWRITE c';
const multi = analyseCount(MULTI, [3, 4], 'lecture', 'n', { symbols: [{ name: 'n', symbol: 'n' }, { name: 'm', symbol: 'm' }] });
ok('independent dimensions preserve a product term', multi.expandedForm === '4mn + 8' && multi.growthClass === 'O(mn)');
ok('multivariable exact expression matches the observed run', Counting.SymbolicExpr.evaluate(multi.expression, { n: 3, m: 4 }) === multi.actualTotal);

const INCOMPARABLE = 'READ n\nREAD m\nx <- 0\nFOR i <- 1 TO n DO\n FOR j <- 1 TO n DO\n  x <- x + 1\n ENDFOR\nENDFOR\nFOR i <- 1 TO n DO\n FOR j <- 1 TO m DO\n  x <- x + 1\n ENDFOR\nENDFOR\nWRITE x';
const incomparable = analyseCount(INCOMPARABLE, [3, 4], 'lecture', 'n', { symbols: [{ name: 'n', symbol: 'n' }, { name: 'm', symbol: 'm' }] });
ok('incomparable multivariable terms remain in the bound', incomparable.growthClass === 'O(mn + n²)');

const CUBIC = 'READ n\nc <- 0\nFOR i <- 1 TO n DO\n FOR j <- 1 TO i DO\n  FOR k <- 1 TO i DO\n   c <- c + 1\n  ENDFOR\n ENDFOR\nENDFOR\nWRITE c';
const cubic = analyseCount(CUBIC, [5]);
ok('quadratic summands produce an exact cubic result', cubic.expandedForm === '4/3n³ + 2n² + 2/3n + 6' && cubic.growthClass === 'O(n³)');

const stepped = analyseCount('READ n\nc <- 0\nFOR i <- n DOWNTO 1 STEP 2 DO\n c <- c + 1\nENDFOR\nWRITE c', [9]);
ok('symbolic non-unit STEP keeps max and floor', stepped.symbolicTotal.includes('max') && stepped.symbolicTotal.includes('⌊') && stepped.actualTotal === 26);

const symbolsSuggested = Counting.suggestSymbols(parseForCounting('READ n\nREAD label\nFOR i <- 1 TO n DO\n WRITE label\nENDFOR'));
ok('only READ values used in bounds are suggested as dimensions', symbolsSuggested.find((item) => item.name === 'n').suggested && !symbolsSuggested.find((item) => item.name === 'label').suggested);

const branchPending = analyseCount('READ n\nIF n > 0 THEN\n WRITE n\nELSE\n WRITE 0\nENDIF', [3]);
ok('ambiguous branches expose candidate paths', branchPending.requiredAssumptions.length === 1 && branchPending.symbolicTotal === null);
const branchChosen = analyseCount('READ n\nIF n > 0 THEN\n WRITE n\nELSE\n WRITE 0\nENDIF', [3], 'lecture', 'n', { branchSelections: { 2: 0 } });
ok('confirmed worst-case paths are recorded as session assumptions', branchChosen.assumptions.length === 1 && branchChosen.confidence === 'assumption-based');
const nodeCount = analyseCount('head <- NEW NODE(1)\nWRITE head.value', []);
ok('symbolic counting reports node expressions as explicitly unsupported', nodeCount.symbolicTotal === null && nodeCount.confidence === 'unsupported' && nodeCount.diagnostics.some((item) => item.code === 'W_SYMBOLIC_NODE_EXPRESSION'));

const rationalHalf = Counting.Rational.create(2, 4);
ok('rational values reduce exactly', rationalHalf.numerator === 1 && rationalHalf.denominator === 2);
const expressionTree = Counting.SymbolicExpr.multiply(Counting.SymbolicExpr.rational(3, 2), Counting.SymbolicExpr.power(Counting.SymbolicExpr.symbol('n'), 2));
ok('public symbolic expression trees format and evaluate exactly', Counting.SymbolicExpr.format(expressionTree) === '3/2 × n²' && Counting.SymbolicExpr.evaluate(expressionTree, { n: 4 }) === 24);

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
  frame: { kind: 'test', value: i, nested: { values: [i] } }, metrics: { visits: i }, boundary: i === 2, terminal: i === 3,
}));
ok('timeline events use the version 2 schema', timeline.every((event) => event.schemaVersion === 2));
ok('timeline frames are deeply immutable', Object.isFrozen(timeline[0].frame) && Object.isFrozen(timeline[0].frame.nested) && Object.isFrozen(timeline[0].frame.nested.values));
const transitionEvent = Playback.timelineEvent({ id: 'transition:1', domain: 'array', type: 'swap', frame: { kind: 'array' }, transition: { kind: 'swap', moves: [{ entityId: 'item:0', from: 'slot:0', to: 'slot:1' }], enter: [], exit: [], wait: true } });
ok('transition metadata is deeply immutable', Object.isFrozen(transitionEvent.transition) && Object.isFrozen(transitionEvent.transition.moves) && Object.isFrozen(transitionEvent.transition.moves[0]));
const seen = [];
const controller = Playback.createController({ onChange: (s) => seen.push(`${s.status}:${s.index}`) });
let subscriptionCalls = 0;
const unsubscribe = controller.subscribe(() => { subscriptionCalls += 1; });
controller.load(timeline);
ok('playback loads at the first event', controller.getState().index === 0 && controller.getState().status === 'paused');
ok('playback snapshots are stable between changes', controller.getSnapshot() === controller.getSnapshot());
controller.step();
ok('playback steps forward', controller.getState().index === 1);
unsubscribe();
const callsAfterUnsubscribe = subscriptionCalls;
controller.seek(0);
ok('playback subscriptions can be removed', subscriptionCalls === callsAfterUnsubscribe);
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

const gated = Playback.createController();
gated.load([timeline[0], transitionEvent, timeline[2]]);
gated.step();
const activeToken = gated.getState().transitionToken;
ok('structural steps expose a transition token and navigation direction', gated.getState().transitioning && activeToken && gated.getState().direction === 1 && gated.getState().navigationSource === 'step');
gated.step();
ok('rapid structural steps cannot skip an active transition', gated.getState().index === 1);
gated.completeTransition('stale-token');
ok('stale transition completion is idempotently ignored', gated.getState().transitioning);
gated.completeTransition(activeToken);
gated.completeTransition(activeToken);
ok('valid transition completion is idempotent', !gated.getState().transitioning && gated.getState().index === 1);
gated.step(-1); gated.seek(2);
ok('direct seeking cancels transitions and records seek navigation', !gated.getState().transitioning && gated.getState().navigationSource === 'seek');
const queuedPlay = Playback.createController();
queuedPlay.load([timeline[0], transitionEvent, timeline[2]]); queuedPlay.step(); queuedPlay.play();
const queuedToken = queuedPlay.getState().transitionToken;
ok('play can queue behind an active structural step', queuedPlay.getState().status === 'playing' && queuedPlay.getState().index === 1);
queuedPlay.completeTransition(queuedToken);
ok('queued play resumes only after transition completion', queuedPlay.getState().status === 'playing' && queuedPlay.getState().index === 1);

const compatibleResult = Playback.runResult({ events: timeline, result: { value: 3 } });
ok('run results expose events and compatibility steps together', compatibleResult.schemaVersion === 2 && compatibleResult.events === compatibleResult.steps);
ok('run result capabilities are detected from events', compatibleResult.capabilities.visualize && compatibleResult.capabilities.trace && compatibleResult.capabilities.operations);

const algorithmEngine = load(['playback.js', 'algorithms.js'], { setTimeout, clearTimeout });
const ALGORITHMS = algorithmEngine.get('ALGORITHMS');
const binaryEvents = ALGORITHMS.binary.run([4, -2, 9, 1], 9);
ok('binary search assigns its target before preprocessing', binaryEvents[0].type === 'assign' && binaryEvents[0].source.line === 1 && binaryEvents[0].frame.array.join(',') === '4,-2,9,1');
ok('binary precondition explains preprocessing cost', binaryEvents[1].message.includes('O(n log n)') && binaryEvents[1].message.includes('linear search cheaper'));
ok('binary search shows a separate sorted-copy frame', binaryEvents[1].type === 'preprocess' && binaryEvents[1].frame.array.join(',') === '-2,1,4,9');
ok('binary preprocessing does not mutate the original frame', binaryEvents[0].frame.array.join(',') === '4,-2,9,1');
const alreadySortedEvents = ALGORITHMS.binary.run([-3, -3, 0, 8], -3);
ok('binary search recognizes sorted input with duplicates', alreadySortedEvents[1].message.includes('already sorted') && alreadySortedEvents[1].frame.array.join(',') === '-3,-3,0,8');
ok('insertion sort declares moves instead of swaps', ALGORITHMS.insertion.metrics.some((m) => m.key === 'moves') && !ALGORITHMS.insertion.metrics.some((m) => m.key === 'swaps'));
ok('insertion move events use the declared move metric', ALGORITHMS.insertion.run([3, -1, 2]).some((event) => event.metrics.moves > 0 && event.frame.highlight.move));
const insertionShift = ALGORITHMS.insertion.run([3, -1, 2]).find((event) => event.type === 'move');
ok('insertion shift events preserve held and displaced values for presentation', insertionShift.frame.highlight.transition.value === 3 && insertionShift.frame.highlight.held.value === -1 && insertionShift.frame.highlight.transition.displacedValue === -1);
ok('array timeline compatibility items retain stable slot identities', ALGORITHMS.bubble.run([3, 1, 2]).every((event) => event.frame.items.every((item, index) => item.id === `slot:${index}`)));
const duplicateSwap = ALGORITHMS.bubble.run([2, 2, 1]).find((event) => event.type === 'swap');
ok('presentation identities remain deterministic with duplicate values', duplicateSwap.frame.presentation.entities.map((entity) => entity.id).join(',') === 'item:0,item:1,item:2' && new Set(duplicateSwap.frame.presentation.slots.filter(Boolean)).size === 3);
ok('swap metadata moves stable entities between slots', duplicateSwap.transition.kind === 'swap' && duplicateSwap.transition.moves.length === 2 && duplicateSwap.transition.wait);
const insertionEvents = ALGORITHMS.insertion.run([3, -1, 2]);
ok('insertion presentation keeps a single held entity and explicit hole', insertionEvents.some((event) => event.frame.presentation.held && event.frame.presentation.holes.length === 1) && insertionEvents.every((event) => new Set([...event.frame.presentation.slots.filter(Boolean), event.frame.presentation.held?.entityId].filter(Boolean)).size === 3));
const visualizerSource = fs.readFileSync(path.join(ROOT, 'visualizer-src', 'main.jsx'), 'utf8');
ok('visual input uses one 18-value limit', visualizerSource.includes('const MAX_VISUAL_VALUES = 18') && /parts\.length > MAX_VISUAL_VALUES/.test(visualizerSource));

const workspaceEngine = load(['interpreter.js', 'playback.js', 'complexity.js', 'algorithms.js', 'activity-catalog.js', 'linear-adt-activities.js', 'industry-workbench.js', 'visualizer-registry.js'], { setTimeout, clearTimeout });
const Activities = workspaceEngine.get('ITCC47Activities');
const Registry = workspaceEngine.get('ITCC47VisualizerRegistry');
const IndustryWorkbench = workspaceEngine.get('ITCC47IndustryWorkbench');
ok('activity catalog is versioned', Activities.SCHEMA_VERSION === 1 && /^\d{4}\.\d{2}(?:-[a-z0-9-]+)?$/.test(Activities.CONTENT_VERSION));
['bubble-sort', 'selection-sort', 'insertion-sort', 'linear-search', 'binary-search', 'array-list-insert', 'array-list-remove', 'linked-list-traversal', 'linked-list-insert-head']
  .forEach((id) => ok(`activity catalog contains ${id}`, Activities.list().some((activity) => activity.id === id)));
const industryScenarios = IndustryWorkbench.listScenarios();
ok('industry workbench registers four visualization-only activities', industryScenarios.length === 4 && industryScenarios.every((scenario) => scenario.experienceId === 'industry-data-workbench' && scenario.workspaceMode === 'industry-dataset' && scenario.source === null && scenario.views.join(',') === 'visualize'));
const supportDataset = IndustryWorkbench.dataset;
const arrivalIds = Array.from({ length: supportDataset.logicalLength }, (_, index) => supportDataset.recordAt('arrival', index).ticketId);
ok('support dataset generates 12,400 unique stable IDs from a fixed seed', Number.isInteger(supportDataset.seed) && arrivalIds.length === 12400 && new Set(arrivalIds).size === 12400 && arrivalIds[0] === 'TCK-000001' && arrivalIds.at(-1) === 'TCK-012400');
ok('dataset generation is deterministic across named views', [0, 27, 620, 3719, 3720, 12399].every((index) => supportDataset.recordAt('priority', index) === supportDataset.recordAt('priority', index)) && supportDataset.recordAt('arrival', 27).ticketId === 'TCK-000028');
const priorityBands = [['P1', 0, 619], ['P2', 620, 3719], ['P3', 3720, 8679], ['P4', 8680, 12399]];
ok('priority view has exact stable bands and preserves identity order inside each band', priorityBands.every(([priority, start, end]) => {
  let previousEntity = -1;
  for (let index = start; index <= end; index += 1) {
    const record = supportDataset.recordAt('priority', index);
    if (record.priority !== priority || record.entityIndex <= previousEntity) return false;
    previousEntity = record.entityIndex;
  }
  return true;
}));
ok('manual-review view contains 2,048 unique dataset members', new Set(Array.from({ length: supportDataset.views.review.length }, (_, index) => supportDataset.recordAt('review', index).ticketId)).size === 2048);

function validIndustryFrame(event) {
  const frame = event.frame;
  if (frame.kind !== 'industry-dataset' || frame.datasetId !== supportDataset.id || frame.logicalLength < 1) return false;
  let cursor = 0;
  for (const token of frame.tokens) {
    const start = token.kind === 'gap' ? token.start : token.index;
    const end = token.kind === 'gap' ? token.end : token.index;
    if (start !== cursor || end < start || end >= frame.logicalLength) return false;
    if (token.kind === 'gap' && (token.count !== end - start + 1 || !token.reason)) return false;
    if (token.kind === 'record' && (!token.entityId || token.record.ticketId !== token.entityId)) return false;
    cursor = end + 1;
  }
  if (cursor !== frame.logicalLength) return false;
  const validRange = (range) => Array.isArray(range) && range.length === 2 && range[0] >= 0 && range[0] <= range[1] && range[1] < frame.logicalLength;
  if (frame.activeRange && !validRange(frame.activeRange)) return false;
  if (frame.scannedRange && !validRange(frame.scannedRange)) return false;
  if (!frame.discardedRanges.every(validRange)) return false;
  if (!frame.pointers.every((pointer) => Number.isInteger(pointer.index) && pointer.index >= 0 && pointer.index < frame.logicalLength && frame.tokens.some((token) => token.kind !== 'gap' && token.index === pointer.index))) return false;
  if (frame.selectedRecord && !frame.tokens.some((token) => token.kind === 'record' && token.index === frame.selectedRecord.index && token.entityId === frame.selectedRecord.entityId)) return false;
  if (frame.transition && (![frame.transition.from, frame.transition.to].every((index) => Number.isInteger(index) && index >= 0 && index < frame.logicalLength) || !frame.transition.entityId)) return false;
  if (frame.transition && (!event.transition?.wait || event.transition.moves?.[0]?.entityId !== frame.transition.entityId)) return false;
  if (frame.operationSpan && (frame.operationSpan.count !== frame.operationSpan.end - frame.operationSpan.start + 1 || !frame.operationSpan.reason)) return false;
  return !frame.comparison || typeof frame.comparison.outcome === 'boolean';
}

const industryRuns = Object.fromEntries(industryScenarios.map((scenario) => [scenario.id, scenario.run()]));
industryScenarios.forEach((scenario) => {
  const result = industryRuns[scenario.id];
  ok(`${scenario.id} timeline is deterministic and terminal`, JSON.stringify(result) === JSON.stringify(scenario.run()) && result.events[0].type === 'initialize' && result.events.at(-1).terminal);
  ok(`${scenario.id} frames fully explain every logical span`, result.events.every(validIndustryFrame));
  ok(`${scenario.id} exposes initialization, active work, phase exit, and return`, result.events.some((event) => ['comparison', 'mutation', 'compressed-mutation'].includes(event.type)) && result.events.some((event) => event.boundary) && result.events.at(-1).type === 'return');
});
ok('SLA scan returns the known first breach after every earlier comparison', industryRuns['industry-sla-breach-scan'].result.index === 27 && industryRuns['industry-sla-breach-scan'].result.ticketId === 'TCK-000028' && industryRuns['industry-sla-breach-scan'].events.filter((event) => event.type === 'comparison').length === 28);
ok('priority recall returns the exact half-open P2 bounds', JSON.stringify(industryRuns['industry-priority-range-recall'].result) === JSON.stringify({ lower: 620, upper: 3720, count: 3100 }));
ok('stable dispatch preserves P2 order and accounts for all 8,680 shifts', industryRuns['industry-stable-priority-dispatch'].result.index === 3720 && industryRuns['industry-stable-priority-dispatch'].result.moves === 8680 && industryRuns['industry-stable-priority-dispatch'].events.some((event) => event.frame.operationSpan?.count === 8678));
ok('review mutation exposes exact insertion and removal costs', industryRuns['industry-review-queue-mutation'].result.insertedIndex === 640 && industryRuns['industry-review-queue-mutation'].result.removedIndex === 1520 && industryRuns['industry-review-queue-mutation'].result.insertMoves === 1408 && industryRuns['industry-review-queue-mutation'].result.removalMoves === 528 && industryRuns['industry-review-queue-mutation'].result.totalMoves === 1936);
const insertResultA = Activities.get('array-list-insert').run({ values: [18, 7, 31, 12], index: 2, value: 24 });
const insertResultB = Activities.get('array-list-insert').run({ values: [18, 7, 31, 12], index: 2, value: 24 });
ok('array-list insertion timeline is deterministic', JSON.stringify(insertResultA) === JSON.stringify(insertResultB));
ok('array-list insertion executes every setup and loop line before storing', insertResultA.events.map((event) => event.type).join(',') === 'state,prepare,resize,loop,move,loop,move,loop-exit,insert' && insertResultA.events.at(-1).frame.array.join(',') === '18,7,24,31,12');
ok('array-list insertion move preserves its held value', insertResultA.events.find((event) => event.type === 'move').frame.highlight.held.value === 24);
ok('array-list insertion exposes the initialized loop boundary', insertResultA.events.find((event) => event.type === 'loop').frame.markers.boundary.start === 2 && insertResultA.events.find((event) => event.type === 'loop').frame.markers.i === 3);
ok('array-list insertion transitions shift then enter the stable new entity', insertResultA.events.filter((event) => event.transition).map((event) => event.transition.kind).join(',') === 'shift,shift,insert' && insertResultA.events.at(-1).transition.enter[0] === 'item:insert');
const removeResult = Activities.get('array-list-remove').run({ values: [18, 7, 31, 12], index: 1 });
ok('array-list removal executes setup and every loop condition before closing the gap', removeResult.events.map((event) => event.type).join(',') === 'state,remove,loop,move,loop,move,loop-exit,complete' && removeResult.events.at(-1).frame.array.join(',') === '18,31,12');
ok('array-list removal begins its mutation with the exiting entity still in its slot', removeResult.events.find((event) => event.type === 'remove').frame.presentation.slots[1] === removeResult.events.find((event) => event.type === 'remove').transition.exit[0]);
const algorithmCoverageInputs = {
  'bubble-sort': { values: [3, 1, 2] }, 'selection-sort': { values: [3, 1, 2] }, 'insertion-sort': { values: [3, 1, 2] },
  'linear-search': { values: [3, 1, 2], target: 9 }, 'binary-search': { values: [3, 1, 2], target: 9 },
};
Object.entries(algorithmCoverageInputs).forEach(([id, options]) => {
  const activity = Activities.get(id); const result = activity.run(options);
  ok(`${id} maps every timeline event to a real pseudocode line`, result.events.every((event) => event.source && event.source.code === activity.sourceFor(options)[event.source.line - 1]));
  ok(`${id} makes loop termination explicit`, result.events.some((event) => event.type === 'loop-exit'));
  ok(`${id} finishes with an explicit return`, result.events.at(-1).type === 'return' && result.events.at(-1).terminal);
});
ok('visualizer capabilities include all synchronized evidence', insertResultA.capabilities.visualize && insertResultA.capabilities.trace && insertResultA.capabilities.operations);
const linkedTraversalA = Activities.get('linked-list-traversal').run();
const linkedTraversalB = Activities.get('linked-list-traversal').run();
ok('linked-list traversal timeline is deterministic', JSON.stringify(linkedTraversalA) === JSON.stringify(linkedTraversalB));
ok('linked-list traversal follows every node to NULL', linkedTraversalA.outcome === 'complete' && linkedTraversalA.events.at(-1).frame.nodes.map((node) => node.value).join(',') === '18,7,31' && linkedTraversalA.events.at(-1).metrics.nodeVisits === 3);
const traversalActivity = Activities.get('linked-list-traversal');
ok('linked-list traversal exposes default, singleton, and empty presets', traversalActivity.input.presets.map((preset) => preset.id).join(',') === 'default,singleton,empty');
[
  ['default', 3, '18,7,31'],
  ['singleton', 1, '7'],
  ['empty', 0, ''],
].forEach(([preset, visits, values]) => {
  const result = traversalActivity.run({ preset });
  const source = traversalActivity.sourceFor({ preset });
  ok(`linked-list traversal ${preset} is deterministic and reaches NULL`, JSON.stringify(result) === JSON.stringify(traversalActivity.run({ preset })) && result.outcome === 'complete' && result.events.at(-1).metrics.nodeVisits === visits && result.events.at(-1).frame.nodes.map((node) => node.value).join(',') === values && result.events.at(-1).frame.pointers.current === null);
  ok(`linked-list traversal ${preset} keeps source lines synchronized`, result.events.every((event) => event.source?.code.trim() === source[event.source.line - 1].trim()));
  ok(`linked-list traversal ${preset} keeps stable node identities`, result.events.every((event) => event.frame.nodes.every((node) => /^node:\d+$/.test(node.id))));
});
const linkedInsert = Activities.get('linked-list-insert-head').run();
ok('head insertion preserves the old chain after the new node', linkedInsert.events.at(-1).frame.nodes.map((node) => node.value).join(',') === '24,18,7' && linkedInsert.events.at(-1).metrics.pointerWrites === 2);
ok('linked transitions preserve pointer and edge identities', linkedInsert.events.some((event) => event.transition?.moves?.some((move) => move.entityId === 'pointer:head')) && linkedInsert.events.some((event) => event.frame.links.every((link) => link.id === `edge:${link.from}->${link.to}`)));
ok('linked-list events use immutable V2 frames', Object.isFrozen(linkedInsert.events[0]) && Object.isFrozen(linkedInsert.events[0].frame) && linkedInsert.events.every((event, index) => event.id === `linked-list-insert-head:${index}`));
const recentComparisonActivity = Activities.get('array-linked-comparison');
function recentStageIsValid(frame) {
  const state = frame.linkedState;
  const byId = new Map(state.nodes.map((node) => [node.id, node]));
  if (state.nodes.some((node) => (node.prev && !byId.has(node.prev)) || (node.next && !byId.has(node.next)))) return false;
  if (!state.stable) return true;
  const reachable = [];
  const seen = new Set();
  let current = state.headId;
  while (current) {
    if (!byId.has(current) || seen.has(current)) return false;
    seen.add(current); reachable.push(current); current = byId.get(current).next;
  }
  if (reachable.join(',') !== state.reachableIds.join(',')) return false;
  const detached = state.nodes.map((node) => node.id).filter((id) => !seen.has(id));
  if (detached.join(',') !== state.detachedIds.join(',')) return false;
  return reachable.every((id, index) => {
    const node = byId.get(id);
    const expectedPrev = index ? reachable[index - 1] : null;
    const expectedNext = index < reachable.length - 1 ? reachable[index + 1] : null;
    return node.prev === expectedPrev && node.next === expectedNext;
  });
}
const recentInitialIds = ['doc:grades','doc:syllabus','doc:attendance','doc:module3','doc:notes'];
const recentPresetIds = ['grades','syllabus','attendance','module3','notes'];
ok('Recent Documents keeps its Module 3 placement, activity ID, and dedicated renderer', recentComparisonActivity.id === 'array-linked-comparison' && recentComparisonActivity.module === 3 && recentComparisonActivity.checkpointId === 'm3-linked-foundations' && recentComparisonActivity.renderer === 'sequence-comparison' && recentComparisonActivity.contentVersion !== traversalActivity.contentVersion);
ok('Recent Documents exposes five compact choices with Attendance and Python-list defaults', recentComparisonActivity.input.presets.map((preset) => preset.id).join(',') === recentPresetIds.join(',') && recentComparisonActivity.input.defaultPreset === 'attendance' && recentComparisonActivity.input.representation === 'array' && recentComparisonActivity.input.representations.map((item) => item.id).join(',') === 'array,linked' && recentComparisonActivity.input.presentation === 'contextual-toolbar' && recentComparisonActivity.input.representations[0].label === 'Python List (Dynamic Array)');
ok('Recent Documents uses Python source metadata and a persistent desktop split', recentComparisonActivity.language === 'python' && recentComparisonActivity.sourceKind === 'python' && recentComparisonActivity.workspaceComposition === 'recent-documents-split');
const recentRuns = new Map();
recentPresetIds.forEach((preset) => {
  const openedId = `doc:${preset}`;
  const expectedOrder = [openedId, ...recentInitialIds.filter((id) => id !== openedId)];
  ['array','linked'].forEach((representation) => {
    const inputs = { preset, representation };
    const run = recentComparisonActivity.run(inputs);
    const again = recentComparisonActivity.run(inputs);
    const source = recentComparisonActivity.sourceFor(inputs);
    const final = run.events.at(-1);
    recentRuns.set(`${preset}:${representation}`, run);
    ok(`Recent Documents ${preset}/${representation} is deterministic and terminal`, JSON.stringify(run) === JSON.stringify(again) && run.events[0].type === 'initialize' && final.terminal && final.type === 'return');
    ok(`Recent Documents ${preset}/${representation} source stays synchronized`, run.events.every((event) => event.source?.line >= 1 && event.source.line <= source.length && event.source.code === source[event.source.line - 1]) && new Set(run.events.map((event) => event.source.line)).size < run.events.length);
    ok(`Recent Documents ${preset}/${representation} preserves opened identity in every frame`, run.events.every((event) => event.frame.openedId === openedId && event.frame.requiredOrder.join(',') === expectedOrder.join(',') && event.frame.records.map((record) => record.id).join(',') === recentInitialIds.join(',') && new Set(event.frame.records.map((record) => record.id)).size === 5));
    ok(`Recent Documents ${preset}/${representation} reaches the exact final order`, run.result.openedId === openedId && run.result.finalOrder.join(',') === expectedOrder.join(','));
    if (representation === 'linked') {
      const finalState = final.frame.linkedState;
      const finalNodes = new Map(finalState.nodes.map((node) => [node.id, node]));
      ok(`Recent Documents ${preset}/linked remains reciprocal and cycle-free`, run.events.every((event) => recentStageIsValid(event.frame)) && finalState.reachableIds.join(',') === expectedOrder.join(',') && finalState.detachedIds.length === 0);
      ok(`Recent Documents ${preset}/linked has correct head and tail`, finalState.headId === expectedOrder[0] && finalState.tailId === expectedOrder.at(-1) && finalNodes.get(finalState.headId).prev === null && finalNodes.get(finalState.tailId).next === null);
    }
  });
  ok(`Recent Documents ${preset} array and linked modes agree`, recentRuns.get(`${preset}:array`).result.finalOrder.join(',') === recentRuns.get(`${preset}:linked`).result.finalOrder.join(','));
});
const recentArraySource = recentComparisonActivity.sourceFor({ preset: 'notes', representation: 'array' });
const recentLinkedSource = recentComparisonActivity.sourceFor({ preset: 'notes', representation: 'linked' });
ok('Recent Documents Python-list source uses normal list operations without teaching pseudocode', recentArraySource.includes('index = recent.index(opened)') && recentArraySource.includes('    document = recent.pop(index)') && recentArraySource.includes('    recent.insert(0, document)') && !recentArraySource.some((line) => /<-|←|ASK |COMPARE |RETURN /.test(line)));
ok('Recent Documents linked source is concise valid-looking Python without Node boilerplate', recentLinkedSource.includes('current = find_node(head, opened)') && recentLinkedSource.includes('    if current.next is None:') && recentLinkedSource.includes('        tail = current.prev') && recentLinkedSource.includes('    current.prev.next = current.next') && recentLinkedSource.includes('    head = current') && !recentLinkedSource.some((line) => /class Node|<-|←|NULL/.test(line)));
ok('Recent Documents source changes with the selected document and representation', recentComparisonActivity.sourceFor({ preset: 'grades', representation: 'array' }).includes('opened = "Grades.xlsx"') && recentArraySource.includes('opened = "Notes.txt"') && recentArraySource.join('\n') !== recentLinkedSource.join('\n'));
const recentArrayAttendance = recentRuns.get('attendance:array');
const recentLinkedAttendance = recentRuns.get('attendance:linked');
ok('Recent Documents Attendance retains six shown shifts and six pointer writes', recentArrayAttendance.result.arrayShifts === 6 && recentArrayAttendance.result.arrayPlacements === 1 && recentLinkedAttendance.result.pointerWrites === 6);
ok('Recent Documents Grades uses deliberate zero-work paths', ['array','linked'].every((representation) => { const run = recentRuns.get(`grades:${representation}`); return run.events.some((event) => event.type === 'no-op' && /already.*most recent|already first/i.test(`${event.frame.markers.teaching.title} ${event.message}`)) && run.result.arrayShifts === 0 && run.result.arrayPlacements === 0 && run.result.pointerWrites === 0; }));
const recentLinkedNotes = recentRuns.get('notes:linked');
ok('Recent Documents Notes uses the tail-safe rewrite path', recentLinkedNotes.result.pointerWrites === 6 && recentLinkedNotes.result.tailId === 'doc:module3' && recentLinkedNotes.events.some((event) => event.frame.linkedState.lastWrite?.field === 'tail') && recentLinkedNotes.events.every((event) => !/current\.next\.prev/.test(event.source.code)));
ok('Recent Documents caveat follows the selected filename and remains honest', recentPresetIds.every((preset) => recentRuns.get(`${preset}:linked`).events.every((event) => new RegExp(`finding ${event.frame.records.find((record) => record.id === `doc:${preset}`).label.replace('.', '\\.') } from head.*O\\(n\\)`, 'i').test(event.frame.explanation.caveat))) && !/complete operation.*O\(1\)/i.test(recentComparisonActivity.blurb));
ok('Recent Documents runs own scenario, selected representation, and comparison segments only', [...recentRuns.values()].every((run) => { const representationSegment = run.result.representation === 'array' ? 'array-list' : 'linked-list'; return [...new Set(run.events.map((event) => event.segment.id))].join(',') === `scenario,${representationSegment},comparison`; }));
ok('existing singly linked activities retain linked-list frames and renderer behavior', ['linked-list-traversal','linked-list-insert-head','linked-list-sorted-insert','linked-list-find-update','linked-list-delete'].every((id) => Activities.get(id).renderer === 'linked-list' && Activities.get(id).run().events.every((event) => event.frame.kind === 'linked-list')));
const semanticLineAudit = {
  'bubble-sort': { lines: [1, 2, 3, 4, 5, 6, 7, 10, 11, 14], cases: [{ values: [3, 1, 2] }] },
  'selection-sort': { lines: [1, 2, 3, 4, 5, 6, 9, 10, 12, 13], cases: [{ values: [3, 1, 2] }] },
  'insertion-sort': { lines: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11], cases: [{ values: [3, 1, 2] }] },
  'linear-search': { lines: [1, 2, 3, 4, 5, 8], cases: [{ values: [3, 1, 2], target: 2 }, { values: [3, 1, 2], target: 9 }] },
  'binary-search': { lines: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15], cases: [{ values: [1, 3, 7, 9], target: 7 }, { values: [1, 3, 7, 9], target: 8 }, { values: [1, 3, 7, 9], target: 0 }] },
  'array-list-insert': { lines: [1, 2, 3, 4, 5, 6], cases: [{ values: [18, 7, 31, 12], index: 2, value: 24 }] },
  'array-list-remove': { lines: [1, 2, 3, 4, 5], cases: [{ values: [18, 7, 31, 12], index: 1 }] },
  'linked-list-traversal': { lines: [1, 2, 3, 4, 5, 6, 7], cases: [{}] },
  'linked-list-insert-head': { lines: [1, 2, 3, 4, 5], cases: [{}] },
};
Object.entries(semanticLineAudit).forEach(([id, audit]) => {
  const covered = new Set(audit.cases.flatMap((options) => Activities.get(id).run(options).events.map((event) => event.source?.line).filter(Boolean)));
  const missing = audit.lines.filter((line) => !covered.has(line));
  ok(`${id} emits every semantically executable pseudocode line`, missing.length === 0, missing.length ? `missing lines ${missing.join(', ')}` : '');
});
const teachingAuditCases = {
  'bubble-sort': { values: [3, 1, 2] },
  'selection-sort': { values: [3, 1, 2] },
  'insertion-sort': { values: [3, 1, 2] },
  'linear-search': { values: [3, 1, 2], target: 2 },
  'binary-search': { values: [3, 1, 2], target: 2 },
  'array-list-insert': { values: [3, 1, 2], index: 1, value: 9 },
  'array-list-remove': { values: [3, 1, 2], index: 1 },
  'linked-list-traversal': {},
  'linked-list-insert-head': {},
};
Object.entries(teachingAuditCases).forEach(([id, options]) => {
  const activity = Activities.get(id);
  const events = activity.run(options).events;
  const teachingEvents = events.filter((event) => event.frame.markers?.teaching);
  ok(`${id} declares and emits its teaching variant`, !!activity.teachingVariant && teachingEvents.some((event) => event.frame.markers.teaching.variant === activity.teachingVariant));
  ok(`${id} teaching metadata never emits an empty or stale shell`, teachingEvents.every((event) => {
    const teaching = event.frame.markers.teaching;
    return teaching.annotations?.length || teaching.status?.length || teaching.comparison;
  }));
  ok(`${id} teaching targets resolve inside the current frame`, teachingEvents.every((event) => (event.frame.markers.teaching.annotations || []).every((annotation) => {
    if (annotation.target?.kind === 'slot') return Number.isInteger(annotation.target.index) && annotation.target.index >= 0 && annotation.target.index < event.frame.array.length;
    if (annotation.target?.kind === 'pointer') return Object.prototype.hasOwnProperty.call(event.frame.pointers || {}, annotation.target.id);
    return annotation.target?.kind === 'held';
  })));
  ok(`${id} value annotations agree with the rendered slot`, teachingEvents.every((event) => (event.frame.markers.teaching.annotations || []).every((annotation) => {
    if (annotation.target?.kind !== 'slot' || !String(annotation.label).startsWith('values[')) return true;
    return annotation.value === event.frame.array[annotation.target.index];
  })));
});
const selectionTeaching = Activities.get('selection-sort').run({ values: [42, 17, 8] }).events.map((event) => event.frame.markers?.teaching).filter(Boolean);
ok('selection teaching focuses on minIndex without a redundant minimum-value fact', selectionTeaching.some((teaching) => teaching.annotations.some((annotation) => annotation.label === 'minIndex')) && selectionTeaching.every((teaching) => ![...teaching.annotations, ...teaching.status].some((item) => item.label === 'minimum value')));
const bubbleTeaching = Activities.get('bubble-sort').run({ values: [3, 1, 2] }).events.map((event) => event.frame.markers?.teaching).filter(Boolean);
ok('bubble teaching names both adjacent operands', bubbleTeaching.some((teaching) => teaching.annotations.some((annotation) => annotation.label === 'values[j]') && teaching.annotations.some((annotation) => annotation.label === 'values[j + 1]')));
const goldenTimelines = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'golden-timelines.json'), 'utf8'));
const transitionGoldens = goldenTimelines.transitions;
Object.entries(goldenTimelines).filter(([id]) => id !== 'transitions').forEach(([id, golden]) => {
  const options = id === 'array-list-insert' ? { values: [3, 1, 2], index: 1, value: 9 }
    : id === 'array-list-remove' ? { values: [3, 1, 2], index: 1 }
      : { values: [3, 1, 2], target: 2 };
  const result = Activities.get(id).run(options);
  const signature = {
    types: result.events.map((event) => event.type),
    final: result.events.at(-1).frame.array,
    metrics: result.events.at(-1).metrics,
  };
  ok(`${id} matches its golden timeline`, JSON.stringify(signature) === JSON.stringify(golden));
});
Object.entries(transitionGoldens).forEach(([id, expected]) => {
  const options = id === 'array-list-insert' ? { values: [3, 1, 2], index: 1, value: 9 }
    : id === 'array-list-remove' ? { values: [3, 1, 2], index: 1 }
      : { values: [3, 1, 2], target: 2 };
  const actual = Activities.get(id).run(options).events.filter((event) => event.transition?.wait).map((event) => event.transition.kind);
  ok(`${id} matches its golden transitions`, JSON.stringify(actual) === JSON.stringify(expected));
});
const extensionActivity = { id: 'test-extension', input: {}, run() { return Playback.runResult(); } };
ok('activity catalog accepts later adapters', Activities.register(extensionActivity) && Activities.list().some((activity) => activity.id === extensionActivity.id));
Registry.registerRenderer('test', function TestRenderer() {});
Registry.registerEvidenceView('test-trace', function TestEvidence() {});
Registry.registerInputControls('test-input', function TestInput() {});
ok('visualizer registries report renderers, evidence metadata, and input controls', Registry.rendererDomains().includes('test') && Registry.evidenceIds().includes('test-trace') && Registry.getEvidenceDefinition('test-trace').label === 'test-trace' && Registry.inputKinds().includes('test-input'));
ok('algorithm metrics remain separate from primitive-operation analysis', !fs.readFileSync(path.join(ROOT, 'visualizer-src', 'main.jsx'), 'utf8').includes('primitiveTotal +'));

section('multi-course catalog and ITCC45 OOP');
const visualizerReactSource = fs.readFileSync(path.join(ROOT, 'visualizer-src', 'main.jsx'), 'utf8');
const visualizerWorkspaceStyles = fs.readFileSync(path.join(ROOT, 'visualizer-src', 'workspace.css'), 'utf8');
ok('ITCC45 object animation components stay top-level and memoized',
  ['AnimatedClassMember', 'AnimatedClassCard', 'AnimatedReference', 'AnimatedObjectField', 'AnimatedObjectCard', 'AnimatedActiveCall']
    .every((name) => visualizerReactSource.includes(`const ${name} = memo(`)));
ok('ITCC45 object motion uses stable class, object, reference, and field identities',
  [':class:${item.id}', ':object:${item.id}', ':reference:${name}', ':field:${objectId}:${name}']
    .every((token) => visualizerReactSource.includes(token)));
ok('ITCC45 object motion supports entry, value replacement, and deletion transitions',
  visualizerReactSource.includes('exit={{ opacity: 0, height: 0, x: -10 }}')
  && visualizerReactSource.includes('key={serialized}')
  && visualizerWorkspaceStyles.includes('.object-field-change'));
ok('ITCC45 object motion receives playback duration and motion preference',
  visualizerReactSource.includes('duration={objectVisualDuration} motionMode={motionPreference.mode}')
  && visualizerReactSource.includes("playback.navigationSource === 'seek' ? 0 : duration")
  && visualizerReactSource.includes('motionMode === \'on\''));
const workspaceLayoutEngine = load(['workspace-layout.js']);
const WorkspaceLayout = workspaceLayoutEngine.get('ITCC45WorkspaceLayout');
const ITCC47Layout = workspaceLayoutEngine.get('ITCC47WorkspaceLayout');
const savedLayout = new Map();
const layoutStorage = { getItem: (key) => savedLayout.get(key) ?? null, setItem: (key, value) => savedLayout.set(key, value) };
ok('ITCC45 workspace layout uses adaptive evidence defaults', WorkspaceLayout.defaults(1600).evidence === 'expanded' && WorkspaceLayout.defaults(1366).evidence === 'collapsed');
ok('ITCC45 workspace layout clamps the source ratio', WorkspaceLayout.clampSourceRatio(0.1) === 0.3 && WorkspaceLayout.clampSourceRatio(0.9) === 0.65 && WorkspaceLayout.clampSourceRatio('bad') === 0.4);
ok('ITCC45 workspace layout rejects outdated content', WorkspaceLayout.normalize({ version: 0, evidence: 'expanded', sourceRatio: 0.6 }, 1280).evidence === 'collapsed');
WorkspaceLayout.write(layoutStorage, { evidence: 'expanded', sourceRatio: 0.52 }, 1280);
ok('ITCC45 workspace layout persists only its versioned contract', JSON.stringify(WorkspaceLayout.read(layoutStorage, 1280)) === JSON.stringify({ version: 1, evidence: 'expanded', sourceRatio: 0.52 }));
savedLayout.set(WorkspaceLayout.STORAGE_KEY, '{broken');
ok('ITCC45 workspace layout safely ignores malformed storage', WorkspaceLayout.read(layoutStorage, 1600).evidence === 'expanded' && WorkspaceLayout.read(layoutStorage, 1600).sourceRatio === 0.4);
ok('ITCC47 evidence starts collapsed for first-time learners', ITCC47Layout.defaults().evidence === 'collapsed');
ITCC47Layout.write(layoutStorage, { evidence: 'expanded' });
ok('ITCC47 evidence choice persists under a separate versioned key', ITCC47Layout.STORAGE_KEY !== WorkspaceLayout.STORAGE_KEY && ITCC47Layout.read(layoutStorage).evidence === 'expanded');
savedLayout.set(ITCC47Layout.STORAGE_KEY, JSON.stringify({ version: 0, evidence: 'expanded' }));
ok('ITCC47 ignores outdated layout storage', ITCC47Layout.read(layoutStorage).evidence === 'collapsed');

section('computer architecture teaching machine');
const computerArchitectureEngine = load([
  'course-catalog.js', 'playback.js', 'computer-architecture-machine.js',
  'computer-architecture-activities.js', 'visualizer-registry.js',
  'computer-architecture-practice-data.js',
], { setTimeout, clearTimeout });
const ComputerArchitecture = computerArchitectureEngine.get('ComputerArchitectureMachine');
const ComputerArchitectureCatalog = computerArchitectureEngine.get('ComputerArchitectureActivities');
const ComputerArchitectureCourses = computerArchitectureEngine.get('BSITLearningLab');
const ComputerArchitecturePractice = computerArchitectureEngine.get('ComputerArchitecturePractice');
const ComputerArchitectureRegistry = computerArchitectureEngine.get('BSITVisualizerRegistry');
ok('teaching machine declares the required address and word widths',
  ComputerArchitecture.WIDTHS.PC === 8 && ComputerArchitecture.WIDTHS.MAR === 8
  && ComputerArchitecture.WIDTHS.addressBus === 8 && ComputerArchitecture.WIDTHS.MDR === 16
  && ComputerArchitecture.WIDTHS.IR === 16 && ComputerArchitecture.WIDTHS.dataBus === 16
  && ['R0', 'R1', 'R2', 'R3'].every((id) => ComputerArchitecture.WIDTHS[id] === 16));
ok('instruction decoding separates 4-bit opcode, 4-bit register, and 8-bit operand', (() => {
  const decoded = ComputerArchitecture.decodeInstruction(0x31A4);
  return decoded.opcode === 3 && decoded.register === 1 && decoded.operand === 0xA4
    && decoded.fields.opcode.bits === '0011' && decoded.fields.register.bits === '0001'
    && decoded.fields.operand.bits === '10100100' && decoded.mnemonic === 'LOAD R1, [0xA4]';
})());
ok('number formats preserve declared width and unsigned decimal values',
  ComputerArchitecture.formatValue(3, 8, 'hex') === '0x03'
  && ComputerArchitecture.formatValue(3, 8, 'bin') === '0b00000011'
  && ComputerArchitecture.formatValue(0xFF, 8, 'dec') === '255');
ok('CPU cue timing reserves a scaled 0.8 second source hold before movement',
  ComputerArchitecture.DURATION_WEIGHTS.focus === 0.87
  && ComputerArchitecture.DURATION_WEIGHTS.arm === 2.79
  && ComputerArchitecture.DURATION_WEIGHTS.travel === 3.27
  && ComputerArchitecture.DURATION_WEIGHTS.arrive === 0.77);
ok('CPU signal frames keep stable IDs while exposing readable labels and explanations',
  ComputerArchitecture.SIGNAL_DEFINITIONS.MARin.label === 'MAR-in'
  && ComputerArchitecture.SIGNAL_DEFINITIONS.PCout.label === 'PC-out'
  && ComputerArchitecture.SIGNAL_IDS.every((id) => ComputerArchitecture.SIGNAL_DEFINITIONS[id]?.description));
ok('three curated presets validate and decode to their declared mnemonics',
  ComputerArchitecture.PRESETS.length === 3 && ComputerArchitecture.PRESETS.every((preset) => ComputerArchitecture.validatePreset(preset) && ComputerArchitecture.decodeInstruction(preset.word).mnemonic === preset.mnemonic));
ComputerArchitecture.PRESETS.forEach((preset) => {
  const first = ComputerArchitecture.run(preset.id, { granularity: 'operation' });
  const second = ComputerArchitecture.run(preset.id, { granularity: 'operation' });
  const micro = ComputerArchitecture.run(preset.id, { granularity: 'micro' });
  const events = first.events;
  const ids = events.map((event) => event.id);
  const finalFrame = events.at(-1).frame;
  const sequenceFrames = events.flatMap((event) => event.transition?.phases?.map((item) => item.frame) || [event.frame]);
  const microFrames = micro.events.map((event) => event.frame);
  const transfers = sequenceFrames.map((frame) => frame.transfer).filter(Boolean);
  ok(`${preset.id}: emits five deterministic immutable fetch operations`, events.length === 5 && JSON.stringify(first) === JSON.stringify(second) && events.every((event) => Object.isFrozen(event) && Object.isFrozen(event.frame)));
  ok(`${preset.id}: operation identities are unique and stable`, new Set(ids).size === 5 && ids.every((id) => id.startsWith(`architecture-fetch-cycle:${preset.id}:operation:`)));
  ok(`${preset.id}: fetch operations stop after advancing PC`, events.map((event) => event.type).join(',') === 'locate-pc,copy-pc-mar,read-memory-mdr,transfer-mdr-ir,increment-pc');
  ok(`${preset.id}: first frame highlights only PC without changing state`, events[0].frame.activeComponents.join(',') === 'PC' && events[0].frame.transfer === null && events[0].frame.signals.every((signal) => !signal.active) && events[0].frame.memory.selectedAddress === null && events[0].frame.registers.MAR.value === 0);
  ok(`${preset.id}: operation sequences expose immutable phases and duration contracts`, events.slice(1).every((event) => event.transition.kind === 'cpu-operation' && event.transition.sequenceId && event.transition.durationUnits > 0 && event.transition.phases.every((item) => Object.isFrozen(item.frame))));
  ok(`${preset.id}: stable address and word tokens survive compound transfers`, transfers.filter((item) => item.kind === 'address').every((item) => item.id === `address-token:${preset.id}`) && transfers.filter((item) => item.id === `instruction-word:${preset.id}`).every((item) => item.kind === 'instruction'));
  ok(`${preset.id}: micro mode exposes the same graph as nineteen individual phases`, micro.events.length === 19 && micro.events.every((event) => event.frame.playbackGranularity === 'micro') && micro.events.map((event) => event.frame.operation.id).filter((id, index, items) => index === 0 || id !== items[index - 1]).join(',') === events.map((event) => event.frame.operation.id).join(','));
  ok(`${preset.id}: all nineteen phases expose immutable PowerPoint-style animation metadata`, microFrames.length === 19 && microFrames.every((frame) => ComputerArchitecture.ANIMATION_STAGES.includes(frame.animation.stage) && frame.animation.sourceId && Object.isFrozen(frame.animation) && Object.isFrozen(frame.animation.timing) && Object.isFrozen(frame.animation.controlCues)));
  ok(`${preset.id}: emitting phases hold and retain cues while non-emitting phases do not`, microFrames.every((frame) => {
    const timing = frame.animation.timing;
    if (frame.animation.stage === 'arm') return timing.spawnHoldUnits === 1.54 && timing.movementUnits === 1.25 && timing.retainAtEndpoint
      && frame.microStep.durationWeight === 2.79 + Math.max(0, frame.animation.controlCues.length - 1) * ComputerArchitecture.CONTROL_CUE_SEQUENCE_GAP_UNITS;
    if (frame.animation.stage === 'travel') return timing.spawnHoldUnits === 1.54 && timing.movementUnits === 1.73 && timing.retainAtEndpoint && frame.microStep.durationWeight === 3.27;
    return timing.spawnHoldUnits === 0 && timing.movementUnits === 0 && !timing.retainAtEndpoint;
  }));
  ok(`${preset.id}: animation metadata is identical in compound and micro playback`, JSON.stringify(sequenceFrames.map((frame) => frame.animation)) === JSON.stringify(microFrames.map((frame) => frame.animation)));
  ok(`${preset.id}: control cues have stable unique identities and declared directions`, (() => {
    const cues = microFrames.flatMap((frame) => frame.animation.controlCues);
    return new Set(cues.map((cue) => cue.id)).size === cues.length
      && cues.every((cue) => cue.id.startsWith('control-cue:') && cue.routeId.startsWith('control-') && cue.order > 0 && cue.label && cue.semanticRole && cue.activationOffsetUnits >= 0)
      && cues.filter((cue) => cue.signalId === 'MFC').every((cue) => cue.direction === 'to-cu')
      && cues.filter((cue) => cue.signalId === 'MFC').every((cue) => cue.originId === 'memory')
      && cues.filter((cue) => cue.signalId !== 'MFC').every((cue) => cue.direction === 'from-cu' && cue.originId === 'CONTROL');
  })());
  ok(`${preset.id}: every transfer declares its semantic role`, transfers.every((item) => ['address', 'instruction', 'operand', 'result'].includes(item.role)));
  ok(`${preset.id}: memory read is one operation with address, wait, MFC, transfer, and capture phases`, (() => {
    const phases = events[2].transition.phases;
    return phases.length === 7
      && phases.map((item) => item.frame.microStep.id.split(':').at(-1)).join(',') === 'focus-mar,assert-read,address-memory,select-memory-word,memory-ready,memory-mdr,capture-mdr'
      && phases[2].frame.transfer.to === 'memory'
      && phases[3].frame.memory.state === 'reading'
      && phases[4].frame.signals.some((signal) => signal.id === 'MFC' && signal.active)
      && phases[5].frame.transfer.from === 'memory' && phases[5].frame.transfer.to === 'MDR'
      && phases[6].frame.registers.MDR.value === preset.word;
  })());
  ok(`${preset.id}: final state retains address and fetched word without decoding`, finalFrame.registers.MAR.value === preset.pc && finalFrame.registers.MDR.value === preset.word && finalFrame.registers.IR.value === preset.word && finalFrame.registers.PC.value === ((preset.pc + 1) & 0xFF) && finalFrame.instruction.available && !finalFrame.instruction.decoded);
  ok(`${preset.id}: fetch never changes memory and leaves all signals inactive`, finalFrame.memory.unchanged && finalFrame.memory.snapshot[preset.pc] === preset.word && finalFrame.signals.every((signal) => !signal.active));
  ok(`${preset.id}: operation and micro timelines commit identical machine state`, ['PC', 'MAR', 'MDR', 'IR', 'R0', 'R1', 'R2', 'R3'].every((id) => finalFrame.registers[id].value === micro.result.finalFrame.registers[id].value) && JSON.stringify(finalFrame.memory.snapshot) === JSON.stringify(micro.result.finalFrame.memory.snapshot));
});
ok('ADDI preset demonstrates 8-bit PC wraparound', ComputerArchitecture.run('addi-r3-07').events.at(-1).frame.registers.PC.value === 0x00);
ComputerArchitecture.PRESETS.forEach((preset) => {
  const operationRun = ComputerArchitecture.runDecode(preset.id, { granularity: 'operation' });
  const repeatedRun = ComputerArchitecture.runDecode(preset.id, { granularity: 'operation' });
  const microRun = ComputerArchitecture.runDecode(preset.id, { granularity: 'micro' });
  const events = operationRun.events;
  const frames = microRun.events.map((event) => event.frame);
  const firstFrame = events[0].frame;
  const finalFrame = events.at(-1).frame;
  const expectedProfile = preset.id === 'store-r2-b0'
    ? ['source', 'address', 'Write R2 into Main Memory[0xB0].']
    : preset.id === 'addi-r3-07'
      ? ['read-write', 'immediate', 'Add immediate 0x07 to R3 and write the result back to R3.']
      : ['destination', 'address', 'Read Main Memory[0xA4] and write the word into R1.'];
  ok(`${preset.id}: decode emits six deterministic immutable operations and seventeen phases`, events.length === 6 && microRun.events.length === 17 && JSON.stringify(operationRun) === JSON.stringify(repeatedRun) && frames.every((frame) => Object.isFrozen(frame) && Object.isFrozen(frame.instruction)));
  ok(`${preset.id}: decode starts from completed fetch state with only IR focused and an empty board`, firstFrame.activeComponents.join(',') === 'IR' && firstFrame.instruction.decodeBoardStage === 'empty' && firstFrame.instruction.revealedFields.length === 0 && firstFrame.registers.PC.value === ((preset.pc + 1) & 0xFF) && firstFrame.registers.MAR.value === preset.pc && firstFrame.registers.MDR.value === preset.word && firstFrame.registers.IR.value === preset.word && firstFrame.signals.every((signal) => !signal.active));
  ok(`${preset.id}: decode operations follow locate, split, interpret, and assemble order`, events.map((event) => event.type).join(',') === 'locate-ir-word,split-instruction-fields,interpret-opcode,interpret-register,interpret-operand,assemble-instruction');
  ok(`${preset.id}: decode board progresses from empty word transfer to whole word, segmented groups, and labeled fields`, frames.slice(0, 5).map((frame) => frame.instruction.decodeBoardStage).join(',') === 'empty,empty,whole-word,segmented,labeled' && frames.slice(0, 4).every((frame) => frame.instruction.revealedFields.length === 0) && frames[4].instruction.revealedFields.join(',') === 'opcode,register,operand');
  ok(`${preset.id}: whole instruction token identity survives travel and settled arrival`, frames[1].transfer.id === `decode-word:${preset.id}` && frames[2].transfer.id === frames[1].transfer.id && Object.isFrozen(frames[1].transfer) && Object.isFrozen(frames[2].transfer));
  ok(`${preset.id}: decode reveals correct roles, operand kind, and next action`, finalFrame.instruction.decoded && finalFrame.instruction.decodeStage === 'complete' && finalFrame.instruction.revealedFields.join(',') === 'opcode,register,operand' && finalFrame.instruction.registerRole === expectedProfile[0] && finalFrame.instruction.operandKind === expectedProfile[1] && finalFrame.instruction.nextAction === expectedProfile[2]);
  ok(`${preset.id}: decode mutates neither registers nor Main Memory`, frames.every((frame) => ['PC', 'MAR', 'MDR', 'IR', 'R0', 'R1', 'R2', 'R3'].every((id) => frame.registers[id].value === firstFrame.registers[id].value) && JSON.stringify(frame.memory.snapshot) === JSON.stringify(firstFrame.memory.snapshot) && frame.memory.unchanged));
  ok(`${preset.id}: decode invents no control signals and preserves immutable animation identities`, frames.every((frame) => frame.signals.every((signal) => !signal.active) && frame.animation.controlCues.length === 0 && Object.isFrozen(frame.animation)) && new Set(frames.map((frame) => frame.microStep.id)).size === 17);
  ok(`${preset.id}: operation and micro decode timelines commit identical state`, ['PC', 'MAR', 'MDR', 'IR', 'R0', 'R1', 'R2', 'R3'].every((id) => finalFrame.registers[id].value === microRun.result.finalFrame.registers[id].value) && finalFrame.instruction.mnemonic === microRun.result.finalFrame.instruction.mnemonic);
});
ok('guided execution preset encodes 5 + 13 as ADDI R1, #0x0D', (() => {
  const preset = ComputerArchitecture.EXECUTION_PRESETS[0];
  const decoded = ComputerArchitecture.decodeInstruction(preset.word);
  return preset.id === 'addi-five-thirteen' && preset.registers[1] === 5
    && decoded.opcodeName === 'ADDI' && decoded.register === 1 && decoded.operand === 13
    && preset.equation.result === 18;
})());
const additionFirst = ComputerArchitecture.runExecution('addi-five-thirteen');
const additionSecond = ComputerArchitecture.runExecution('addi-five-thirteen');
const additionMicro = ComputerArchitecture.runExecution('addi-five-thirteen', { granularity: 'micro' });
const additionEvents = additionFirst.events;
const additionFinal = additionEvents.at(-1).frame;
const additionMicroFrames = additionMicro.events.map((event) => event.frame);
ok('5 + 13 emits ten deterministic immutable fetch-and-execute operations',
  additionEvents.length === 10 && JSON.stringify(additionFirst) === JSON.stringify(additionSecond)
  && additionEvents.every((event) => Object.isFrozen(event) && Object.isFrozen(event.frame)));
ok('5 + 13 retains six fetch operations then executes operands, ALU, and write-back',
  additionEvents.map((event) => event.type).join(',') === 'locate-pc,copy-pc-mar,read-memory-mdr,transfer-mdr-ir,increment-pc,decode-instruction,r1-alu-a,immediate-alu-b,add-alu,write-r1');
ok('5 + 13 operation identities and hierarchical metadata remain stable',
  additionEvents.every((event) => event.id.startsWith('architecture-add-immediate:addi-five-thirteen:operation:'))
  && additionEvents.every((event, index) => event.frame.operation.index === index + 1 && event.frame.operation.total === 10)
  && additionMicro.events.length === 37 && additionMicro.events.every((event) => event.frame.microStep.parentOperationId === event.frame.operation.id));
ok('5 + 13 exposes animation metadata on all thirty-seven phases',
  additionMicroFrames.length === 37
  && additionMicroFrames.every((frame) => ComputerArchitecture.ANIMATION_STAGES.includes(frame.animation.stage) && Object.isFrozen(frame.animation) && Object.isFrozen(frame.animation.timing))
  && additionMicroFrames.filter((frame) => frame.transfer).every((frame) => ['address', 'instruction', 'operand', 'result'].includes(frame.transfer.role)));
ok('5 + 13 routes both operands and the result through stable semantic paths', (() => {
  const routes = additionMicroFrames.filter((frame) => frame.transfer).map((frame) => `${frame.transfer.role}:${frame.animation.routeId}`);
  return routes.includes('operand:r1-alu') && routes.includes('operand:decoder-alu') && routes.includes('result:alu-r1');
})());
ok('5 + 13 exposes active components and stable operand/result transfers',
  additionEvents[6].transition.phases.some((item) => item.frame.transfer?.id === 'left-operand:addi-five-thirteen')
  && additionEvents[7].transition.phases.some((item) => item.frame.transfer?.id === 'right-operand:addi-five-thirteen')
  && additionEvents[9].transition.phases.some((item) => item.frame.transfer?.id === 'addition-result:addi-five-thirteen'));
ok('5 + 13 exposes immutable progressive ALU input, operation, result, and output stages', (() => {
  const stages = additionMicroFrames.map((frame) => frame.execution.alu.stage);
  return additionMicroFrames.every((frame) => Object.isFrozen(frame.execution) && Object.isFrozen(frame.execution.alu))
    && stages[22] === 'loading-a' && stages[25] === 'input-a' && additionMicroFrames[25].execution.alu.inputA === 5
    && stages[26] === 'loading-b' && stages[29] === 'inputs-ready' && additionMicroFrames[29].execution.alu.inputB === 13
    && stages[31] === 'operation' && additionMicroFrames[31].execution.alu.operation === 'ADD'
    && stages[32] === 'result' && additionMicroFrames[32].execution.alu.result === 18
    && stages[33] === 'output' && stages[36] === 'complete';
})());
ok('multi-signal phases teach source or completion before destination latching', (() => {
  const readCues = additionMicroFrames[9].animation.controlCues;
  const writeCues = additionMicroFrames[34].animation.controlCues;
  return ComputerArchitecture.CONTROL_CUE_SEQUENCE_GAP_UNITS === 0.58
    && readCues.map((cue) => cue.signalId).join(',') === 'MFC,MDRin'
    && readCues.map((cue) => cue.semanticRole).join(',') === 'memory-complete,destination-latch'
    && writeCues.map((cue) => cue.signalId).join(',') === 'ALUout,R1in'
    && writeCues.map((cue) => cue.semanticRole).join(',') === 'source-enable,destination-latch'
    && writeCues.map((cue) => cue.activationOffsetUnits).join(',') === '0,0.58'
    && additionMicroFrames[34].microStep.durationWeight === ComputerArchitecture.DURATION_WEIGHTS.arm + ComputerArchitecture.CONTROL_CUE_SEQUENCE_GAP_UNITS;
})());
ok('5 + 13 writes unsigned result 18 to R1 without changing memory',
  additionFinal.registers.R1.value === 18 && additionFinal.registers.PC.value === 0x21
  && additionFinal.registers.MAR.value === 0x20 && additionFinal.registers.IR.value === 0x610D
  && additionFinal.memory.unchanged && additionFinal.execution.complete
  && additionFinal.signals.every((signal) => !signal.active));
ok('computer architecture course and fetch activity expose their public contracts', (() => {
  const course = ComputerArchitectureCourses.getCourse('computer-architecture');
  const activity = ComputerArchitectureCatalog.get('architecture-fetch-cycle');
  return course.code === 'CA' && course.brandLabel === 'Computer Architecture' && course.home === 'computer-architecture.html'
    && activity.contentVersion === 1 && activity.engine === 'guided-teaching-cpu' && activity.renderer === 'cpu-datapath'
    && activity.input.kind === 'cpu-preset' && activity.workspaceKind === 'cpu-lab'
    && activity.evidenceViews.join(',') === 'micro-operations,cpu-registers,cpu-buses,cpu-instruction';
})());
ok('computer architecture catalog exposes the guided 5 + 13 activity', (() => {
  const activity = ComputerArchitectureCatalog.get('architecture-add-immediate');
  const finalFrame = activity.run().events.at(-1).frame;
  return ComputerArchitectureCatalog.list().length === 3 && activity.title === 'Add 5 + 13'
    && activity.input.defaultPreset === 'addi-five-thirteen'
    && activity.source.length === 10 && finalFrame.registers.R1.value === 18;
})());
ok('computer architecture catalog exposes Decode with focused renderer and immutable completion actions', (() => {
  const decode = ComputerArchitectureCatalog.get('architecture-decode-instruction');
  const fetch = ComputerArchitectureCatalog.get('architecture-fetch-cycle');
  return decode.renderer === 'cpu-instruction-decode' && decode.workspaceComposition === 'cpu-decode'
    && decode.defaultPlaybackGranularity === 'micro' && fetch.defaultPlaybackGranularity === undefined
    && decode.source.length === 6 && decode.evidenceViews.join(',') === 'micro-operations,cpu-decode-fields,cpu-machine-state,cpu-decode-meaning'
    && decode.completionActions[0].href.includes('architecture-add-immediate')
    && fetch.completionActions[0].href.includes('architecture-decode-instruction')
    && Object.isFrozen(decode.completionActions) && Object.isFrozen(fetch.completionActions);
})());
ComputerArchitectureRegistry.registerEvidenceView('metadata-test', function MetadataTest() {}, { label: 'Metadata test', icon: 'cpu' });
ok('evidence registration retains component compatibility and label/icon metadata',
  typeof ComputerArchitectureRegistry.getEvidenceView('metadata-test') === 'function'
  && ComputerArchitectureRegistry.getEvidenceDefinition('metadata-test').label === 'Metadata test'
  && ComputerArchitectureRegistry.getEvidenceDefinition('metadata-test').icon === 'cpu');
const normalizedPractice = ComputerArchitecturePractice.normalize({ contentVersion: 1, solvedIds: ['fetch-order', 'fetch-order', 'unknown', 12] });
ok('practice storage normalizes to contentVersion and valid unique solved IDs only',
  JSON.stringify(normalizedPractice) === JSON.stringify({ contentVersion: 1, solvedIds: ['fetch-order'] })
  && Object.keys(normalizedPractice).join(',') === 'contentVersion,solvedIds');
ok('practice storage rejects outdated and malformed state',
  ComputerArchitecturePractice.normalize({ contentVersion: 0, solvedIds: ['fetch-order'] }).solvedIds.length === 0
  && ComputerArchitecturePractice.normalize(null).contentVersion === 1);
ok('practice bank preserves three fetch IDs and adds four unsolved decode and execute checks',
  ComputerArchitecturePractice.QUESTIONS.length === 7
  && ComputerArchitecturePractice.QUESTIONS.slice(0, 3).map((question) => question.id).join(',') === 'fetch-order,mar-versus-mdr,predict-final-state'
  && ComputerArchitecturePractice.normalize({ contentVersion: 1, solvedIds: ['fetch-order'] }).solvedIds.join(',') === 'fetch-order');

section('computer networking teaching machine');
const computerNetworkingEngine = load([
  'course-catalog.js', 'playback.js', 'computer-networking-machine.js', 'computer-networking-foundations-machine.js',
  'computer-networking-activities.js', 'computer-networking-practice-data.js',
], { setTimeout, clearTimeout });
const ComputerNetworking = computerNetworkingEngine.get('ComputerNetworkingMachine');
const ComputerNetworkingFoundations = computerNetworkingEngine.get('ComputerNetworkingFoundationsMachine');
const ComputerNetworkingCatalog = computerNetworkingEngine.get('ComputerNetworkingActivities');
const ComputerNetworkingCourses = computerNetworkingEngine.get('BSITLearningLab');
const ComputerNetworkingPractice = computerNetworkingEngine.get('ComputerNetworkingPractice');
const networkingPreset = ComputerNetworking.PRESETS[0];
const networkingFirst = ComputerNetworking.run(networkingPreset.id);
const networkingSecond = ComputerNetworking.run(networkingPreset.id);
const networkingMicro = ComputerNetworking.run(networkingPreset.id, { granularity: 'micro' });
const networkingEvents = networkingFirst.events;
const networkingFrames = networkingEvents.map((event) => event.frame);
const networkingDetailedFrames = networkingMicro.events.map((event) => event.frame);
const networkingFinal = networkingFrames.at(-1);
const foundationsPreset = ComputerNetworkingFoundations.PRESETS[0];
const foundationsFirst = ComputerNetworkingFoundations.run(foundationsPreset.id);
const foundationsSecond = ComputerNetworkingFoundations.run(foundationsPreset.id);
const foundationsMicro = ComputerNetworkingFoundations.run(foundationsPreset.id, { granularity: 'micro' });

ok('networking course exposes Module 1 first and ARP as a Topic 6 preview', (() => {
  const course = ComputerNetworkingCourses.getCourse('computer-networking');
  const foundations = ComputerNetworkingCatalog.get('networking-read-classroom-network');
  const activity = ComputerNetworkingCatalog.get('networking-arp-neighbor-discovery');
  const registered = ComputerNetworkingCourses.getActivity('computer-networking', activity.id);
  const activityIds = [
    'networking-read-classroom-network',
    'networking-local-peer-sharing',
    'networking-classify-components',
    'networking-compare-media',
    'networking-read-network-topologies',
    'networking-arp-neighbor-discovery',
  ];
  return course.code === 'NET' && course.title === 'Introduction to Networking'
    && course.shortTitle === 'Network Lab' && course.home === 'computer-networking.html'
    && course.nav[1].href.includes('networking-read-classroom-network')
    && ComputerNetworkingCourses.listActivities('computer-networking').map((item) => item.id).join(',') === activityIds.join(',')
    && ComputerNetworkingCatalog.get('unknown') === foundations && registered === activity
    && foundations.module === 1 && foundations.topic === 'Networking Today' && foundations.renderer === 'network-foundations'
    && activity.module === 6 && activity.topic === 'Network Layer & Address Resolution'
    && activity.contentVersion === 4 && activity.engine === 'guided-network-model'
    && activity.renderer === 'network-topology' && activity.workspaceKind === 'network-lab'
    && activity.input.kind === 'network-preset' && !activity.input.editable
    && activity.evidenceViews.join(',') === 'packet-inspector,network-decisions,arp-table,mac-table';
})());
ok('Networking Today emits eight deterministic immutable Overview frames and 24 Detailed phases',
  foundationsFirst.events.length === 8 && foundationsMicro.events.length === 24
  && ComputerNetworkingFoundations.OPERATIONS.length === 8 && ComputerNetworkingFoundations.DETAILS.length === 24
  && JSON.stringify(foundationsFirst) === JSON.stringify(foundationsSecond)
  && [...foundationsFirst.events, ...foundationsMicro.events].every((event) => Object.isFrozen(event) && Object.isFrozen(event.frame) && Object.isFrozen(event.frame.topology.devices)));
ok('Networking Today keeps stable interface-owned links and equal final state in both granularities', (() => {
  const frames = [...foundationsFirst.events, ...foundationsMicro.events].map((event) => event.frame);
  const declaredInterfaces = new Set(ComputerNetworkingFoundations.ENTITY_IDS.interfaces);
  return frames.every((frame) => frame.topology.devices.map((item) => item.id).join(',') === ComputerNetworkingFoundations.ENTITY_IDS.devices.join(',')
    && frame.topology.links.map((item) => item.id).join(',') === ComputerNetworkingFoundations.ENTITY_IDS.links.join(',')
    && frame.topology.links.every((link) => declaredInterfaces.has(link.fromInterfaceId) && declaredInterfaces.has(link.toInterfaceId)))
    && JSON.stringify(foundationsFirst.result.finalState) === JSON.stringify(foundationsMicro.result.finalState);
})());
ok('Networking Today exposes five deterministic interface-owned network examples', (() => {
  const presetIds = ['client-server-services', 'local-peer-sharing', 'small-office-components', 'campus-media', 'branch-topology'];
  return ComputerNetworkingFoundations.PRESETS.map((preset) => preset.id).join(',') === presetIds.join(',')
    && ComputerNetworkingFoundations.PRESETS.every((preset) => {
      const operationRun = ComputerNetworkingFoundations.run(preset.id);
      const detailedRun = ComputerNetworkingFoundations.run(preset.id, { granularity: 'micro' });
      const ids = ComputerNetworkingFoundations.ENTITY_IDS_BY_PRESET[preset.id];
      const declaredInterfaces = new Set(ids.interfaces);
      return ComputerNetworkingFoundations.validatePreset(preset)
        && operationRun.events.length === 8 && detailedRun.events.length === 24
        && JSON.stringify(operationRun.result.finalState) === JSON.stringify(detailedRun.result.finalState)
        && preset.devices.map((device) => device.id).join(',') === ids.devices.join(',')
        && preset.links.map((link) => link.id).join(',') === ids.links.join(',')
        && preset.links.every((link) => declaredInterfaces.has(link.fromInterfaceId) && declaredInterfaces.has(link.toInterfaceId));
    });
})());
ok('client-to-services keeps five situations on one stable topology', (() => {
  const situations = ComputerNetworkingFoundations.listSituations('client-server-services');
  const ids = situations.map((item) => item.id);
  const topologySignatures = situations.map((item) => {
    const run = ComputerNetworkingFoundations.run('client-server-services', { granularity: 'micro', situationId: item.id });
    return `${run.result.finalFrame.topology.devices.map((device) => device.id).join(',')}|${run.result.finalFrame.topology.links.map((link) => link.id).join(',')}`;
  });
  return ids.join(',') === 'send-email,open-website,upload-file,delete-file,send-chat-message'
    && new Set(topologySignatures).size === 1
    && situations.every((item) => item.pathDeviceIds[0] === item.sourceDeviceId && item.pathDeviceIds.at(-1) === item.targetDeviceId)
    && situations.every((item) => ComputerNetworkingFoundations.run('client-server-services', { situationId: item.id }).events.length === 8
      && ComputerNetworkingFoundations.run('client-server-services', { granularity: 'micro', situationId: item.id }).events.length === 24);
})());
ok('foundation situations focus the endpoint, source gateway, transit network, destination edge, and server in sequence', (() => {
  const frames = ComputerNetworkingFoundations.run('client-server-services', { granularity: 'micro', situationId: 'open-website' }).events.map((event) => event.frame);
  return frames[0].focus.deviceIds.join(',') === 'client-laptop'
    && frames[4].focus.deviceIds.join(',') === 'web-server'
    && frames[10].focus.deviceIds.join(',') === 'home-router'
    && frames[12].focus.deviceIds.join(',') === 'internet-cloud'
    && frames[15].focus.deviceIds.join(',') === 'service-router'
    && frames[17].focus.deviceIds.join(',') === 'web-server'
    && frames[4].callouts['web-server'].includes('web service');
})());
ok('Module 1 examples teach distinct host roles, local peers, device classes, and media', (() => {
  const services = ComputerNetworkingFoundations.getPreset('client-server-services');
  const serviceRoleFrame = ComputerNetworkingFoundations.run(services.id, { granularity: 'micro' }).events[3].frame;
  const peers = ComputerNetworkingFoundations.getPreset('local-peer-sharing');
  const components = ComputerNetworkingFoundations.getPreset('small-office-components');
  const campus = ComputerNetworkingFoundations.getPreset('campus-media');
  return ['service-email', 'service-web', 'service-file'].every((tag) => services.devices.some((device) => device.tags.includes(tag)))
    && services.links.some((link) => link.tags.includes('long-distance') && link.media === 'fiber')
    && serviceRoleFrame.evidence.facts.join(' ').includes('Email server') && serviceRoleFrame.evidence.facts.join(' ').includes('Web server') && serviceRoleFrame.evidence.facts.join(' ').includes('File server')
    && peers.devices.filter((device) => device.tags.includes('peer')).every((device) => device.tags.includes('client') && device.tags.includes('server-role'))
    && !peers.devices.some((device) => device.tags.includes('router') || device.tags.includes('internet'))
    && peers.devices.flatMap((device) => device.interfaces).filter((item) => item.id.includes('laptop')).every((item) => item.label.includes('192.168.20.'))
    && components.devices.some((device) => device.kind === 'end-device' && device.tags.includes('server-role'))
    && ['copper', 'fiber', 'wireless'].every((medium) => campus.links.some((link) => link.media === medium))
    && campus.links.some((link) => link.media === 'fiber' && link.tags.includes('building-backbone'));
})());
ok('canonical ARP preset is valid, curated, and stays on one /24 LAN',
  ComputerNetworking.PRESETS.length === 1 && ComputerNetworking.validatePreset(networkingPreset)
  && networkingPreset.hostA.ip === '192.168.10.10' && networkingPreset.hostB.ip === '192.168.10.20'
  && networkingPreset.prefixLength === 24
  && ComputerNetworking.sameSubnet(networkingPreset.hostA.ip, networkingPreset.hostB.ip, 24)
  && !ComputerNetworking.sameSubnet(networkingPreset.hostA.ip, '192.168.11.20', 24));
ok('ARP model emits eight deterministic immutable Overview frames and 24 Detailed phases',
  networkingEvents.length === 8 && JSON.stringify(networkingFirst) === JSON.stringify(networkingSecond)
  && networkingMicro.events.length === 24 && ComputerNetworking.OPERATIONS.length === 8 && ComputerNetworking.DETAILS.length === 24
  && networkingEvents.every((event) => Object.isFrozen(event) && Object.isFrozen(event.frame)
    && Object.isFrozen(event.frame.topology.devices) && Object.isFrozen(event.frame.packets)
    && Object.isFrozen(event.frame.tables.arp) && Object.isFrozen(event.frame.tables.mac))
  && networkingMicro.events.every((event) => Object.isFrozen(event) && Object.isFrozen(event.frame)
    && event.frame.operation.total === 8 && event.frame.detail.globalTotal === 24));
ok('ARP decision order follows local choice, cache miss, request, flood, reply, forwarding, learning, and readiness',
  networkingEvents.map((event) => event.type).join(',')
    === 'evaluate-subnet,check-arp-cache,build-arp-request,switch-flood-request,host-b-build-reply,switch-forward-reply,host-a-learn-arp,ready-for-ipv4');
ok('all topology, packet, and table identities remain stable across both timelines', [...networkingFrames, ...networkingDetailedFrames].every((frame) =>
  frame.topology.devices.map((item) => item.id).join(',') === ComputerNetworking.ENTITY_IDS.devices.join(',')
  && frame.topology.devices.flatMap((item) => item.interfaces).map((item) => item.id).join(',') === ComputerNetworking.ENTITY_IDS.interfaces.join(',')
  && frame.topology.links.map((item) => item.id).join(',') === ComputerNetworking.ENTITY_IDS.links.join(',')
  && frame.packets.map((item) => item.id).join(',') === ComputerNetworking.ENTITY_IDS.packets.join(',')
  && frame.tables.arp.map((item) => item.id).join(',') === ComputerNetworking.ENTITY_IDS.arpEntries.join(',')
  && frame.tables.mac.map((item) => item.id).join(',') === ComputerNetworking.ENTITY_IDS.macEntries.join(',')));
ok('ARP Request uses Ethernet broadcast while its unknown target MAC remains zero', (() => {
  const request = networkingDetailedFrames[6].packets.find((packet) => packet.id === 'arp-request-1');
  return request.status === 'prepared'
    && request.ethernet.source === networkingPreset.hostA.mac
    && request.ethernet.destination === ComputerNetworking.BROADCAST_MAC
    && request.ethernet.etherType === ComputerNetworking.ETHER_TYPE_ARP
    && request.arp.operationCode === 1 && request.arp.hardwareType === 'Ethernet'
    && request.arp.protocolType === 'IPv4' && request.arp.hardwareSize === 6 && request.arp.protocolSize === 4
    && request.arp.targetMac === ComputerNetworking.UNKNOWN_MAC
    && request.arp.targetIp === networkingPreset.hostB.ip;
})());
ok('switch learns Host A from the request source and floods only the non-ingress port', (() => {
  const learnedFrame = networkingDetailedFrames[9];
  const floodFrame = networkingDetailedFrames[11];
  const learned = learnedFrame.tables.mac.find((entry) => entry.id === 'switch-1-mac-host-a');
  const unknown = learnedFrame.tables.mac.find((entry) => entry.id === 'switch-1-mac-host-b');
  const activeLinks = floodFrame.topology.links.filter((link) => link.active);
  return learned.state === 'confirmed' && learned.interfaceId === 'switch-1-p1'
    && learned.learnedFromPacketId === 'arp-request-1' && unknown.state === 'absent'
    && activeLinks.length === 1 && activeLinks[0].id === 'link-switch-host-b'
    && activeLinks[0].fromInterfaceId === 'switch-1-p2' && activeLinks[0].toInterfaceId === 'host-b-eth0'
    && activeLinks[0].direction === 'switch-1-p2-to-host-b-eth0';
})());
ok('ARP Reply is unicast only after Switch 1 has a learned Host A destination', (() => {
  const learnedFrame = networkingDetailedFrames[17];
  const forwardFrame = networkingDetailedFrames[19];
  const reply = forwardFrame.packets.find((packet) => packet.id === 'arp-reply-1');
  const hostAEntry = forwardFrame.tables.mac.find((entry) => entry.id === 'switch-1-mac-host-a');
  const hostBEntry = learnedFrame.tables.mac.find((entry) => entry.id === 'switch-1-mac-host-b');
  const activeLinks = forwardFrame.topology.links.filter((link) => link.active);
  return reply.status === 'in-transit' && reply.ethernet.destination === networkingPreset.hostA.mac
    && reply.arp.operationCode === 2 && hostAEntry.state === 'confirmed'
    && hostBEntry.state === 'confirmed' && hostBEntry.interfaceId === 'switch-1-p2'
    && hostBEntry.learnedFromPacketId === 'arp-reply-1'
    && activeLinks.length === 1 && activeLinks[0].id === 'link-host-a-switch'
    && activeLinks[0].fromInterfaceId === 'host-a-eth0' && activeLinks[0].toInterfaceId === 'switch-1-p1'
    && activeLinks[0].direction === 'switch-1-p1-to-host-a-eth0';
})());
ok('Host A learns no target mapping before the reply and ends with one confirmed stable row', (() => {
  const before = networkingDetailedFrames.slice(0, 22).map((frame) => frame.tables.arp.find((entry) => entry.id === 'host-a-arp-host-b'));
  const learned = networkingDetailedFrames[22].tables.arp.find((entry) => entry.id === 'host-a-arp-host-b');
  const final = networkingFinal.tables.arp.filter((entry) => entry.id === 'host-a-arp-host-b');
  return before.every((entry) => entry.state === 'absent')
    && learned.state === 'confirmed' && learned.changed && learned.learnedFromPacketId === 'arp-reply-1'
    && final.length === 1 && final[0].ip === '192.168.10.20' && final[0].mac === '02:00:00:00:10:14';
})());
ok('operation and micro playback finish with equal networking state without duplicate identities',
  JSON.stringify(networkingFinal.topology) === JSON.stringify(networkingMicro.result.finalFrame.topology)
  && JSON.stringify(networkingFinal.packets) === JSON.stringify(networkingMicro.result.finalFrame.packets)
  && JSON.stringify(networkingFinal.tables) === JSON.stringify(networkingMicro.result.finalFrame.tables)
  && networkingMicro.events.every((event) => event.frame.playbackGranularity === 'micro'));
ok('four packet traversals use the declared physical interface pairs and fixed teaching timing', (() => {
  const travels = networkingDetailedFrames.filter((frame) => frame.transport?.stage === 'travel').map((frame) => frame.transport);
  return travels.length === 4
    && travels.map((item) => `${item.packetId}:${item.fromInterfaceId}>${item.toInterfaceId}`).join(',')
      === 'arp-request-1:host-a-eth0>switch-1-p1,arp-request-1:switch-1-p2>host-b-eth0,arp-reply-1:host-b-eth0>switch-1-p2,arp-reply-1:switch-1-p1>host-a-eth0'
    && travels.every((item) => item.timing.sourceHoldMs === 800 && item.timing.travelMs === 900 && item.timing.retainAtDestination);
})());
ok('backward timeline inspection restores the earlier empty cache without mutating the final frame', (() => {
  const earlier = networkingDetailedFrames[4];
  const earlierHostA = earlier.tables.arp.find((entry) => entry.id === 'host-a-arp-host-b');
  const finalHostA = networkingFinal.tables.arp.find((entry) => entry.id === 'host-a-arp-host-b');
  return earlierHostA.state === 'absent' && finalHostA.state === 'confirmed'
    && [...networkingFrames, ...networkingDetailedFrames].every((frame) => frame.tables.arp.length === 2 && frame.tables.mac.length === 2);
})());
ok('networking activity delegates to the canonical deterministic model', (() => {
  const activity = ComputerNetworkingCatalog.get('networking-arp-neighbor-discovery');
  const run = activity.run();
  const foundationActivities = ComputerNetworkingCatalog.list().slice(0, 5);
  return ComputerNetworkingCatalog.list().length === 6
    && foundationActivities.every((item, index) => item.input.defaultPreset === ComputerNetworkingFoundations.PRESETS[index].id
      && item.input.activityByPreset[item.input.defaultPreset] === item.id
      && item.input.defaultSituation === ComputerNetworkingFoundations.listSituations(item.input.defaultPreset)[0].id
      && item.run().events.length === 8)
    && activity.input.defaultPreset === 'arp-same-lan'
    && activity.source.length === 8
    && run.result.finalFrame.phase.id === 'ready-for-ipv4';
})());
const normalizedNetworkingPractice = ComputerNetworkingPractice.normalize({ contentVersion: 1, solvedIds: ['classify-local-peer', 'classify-local-peer', 'unknown', 12] });
ok('networking practice is versioned, identity-free, and keeps only unique known checks',
  ComputerNetworkingPractice.QUESTIONS.length === 6
  && ComputerNetworkingPractice.QUESTIONS.slice(0, 3).every((question) => question.module === 1)
  && ComputerNetworkingPractice.QUESTIONS.slice(3).every((question) => question.module === 6)
  && JSON.stringify(normalizedNetworkingPractice) === JSON.stringify({ contentVersion: 1, solvedIds: ['classify-local-peer'] })
  && ComputerNetworkingPractice.normalize({ contentVersion: 0, solvedIds: ['classify-local-peer'] }).solvedIds.length === 0);
const ComputerNetworkingLayout = workspaceLayoutEngine.get('ComputerNetworkingWorkspaceLayout');
ComputerNetworkingLayout.write(layoutStorage, { evidence: 'collapsed' });
ok('networking evidence layout persists under its own versioned key',
  ComputerNetworkingLayout.STORAGE_KEY !== WorkspaceLayout.STORAGE_KEY
  && ComputerNetworkingLayout.STORAGE_KEY !== ITCC47Layout.STORAGE_KEY
  && ComputerNetworkingLayout.read(layoutStorage).evidence === 'collapsed');
const networkingRendererSource = fs.readFileSync(path.join(ROOT, 'visualizer-src', 'network-topology.jsx'), 'utf8');
ok('network renderer declares interface-owned jack bounds and link-owned cable endpoints',
  networkingRendererSource.includes('data-interface-id={id}')
  && networkingRendererSource.includes('data-jack-x={x}')
  && networkingRendererSource.includes('data-link-id={link.id}')
  && networkingRendererSource.includes('data-from-interface-id={link.fromInterfaceId}')
  && networkingRendererSource.includes('data-to-interface-id={link.toInterfaceId}')
  && networkingRendererSource.includes('data-jack-opening-x={opening.x}')
  && networkingRendererSource.includes('data-plug-interface-id={interfaceId}')
  && networkingRendererSource.includes('data-plug-tip-x={geometry.cx}'));
ok('packet movement reuses the active cable path and preserves the 0.8s hold plus 0.9s travel contract',
  networkingRendererSource.includes('<mpath href={`#${linkPathId}`}/>')
  && networkingRendererSource.includes('dur="0.9s" begin="0.8s"')
  && networkingRendererSource.includes('data-motion-path-id={linkPathId || \'\'}'));
ok('network renderer keeps independent fixed desktop and mobile geometry maps',
  networkingRendererSource.includes('const DESKTOP_GEOMETRY')
  && networkingRendererSource.includes('const MOBILE_GEOMETRY')
  && ['host-a-eth0', 'switch-1-p1', 'switch-1-p2', 'host-b-eth0'].every((id) => networkingRendererSource.match(new RegExp(`'${id}'`, 'g')).length >= 2));
const networkingFoundationsRendererSource = fs.readFileSync(path.join(ROOT, 'visualizer-src', 'network-foundations.jsx'), 'utf8');
ok('foundation renderer resolves five fixed layouts from named interfaces rather than device centers',
  ['client-server-services', 'local-peer-sharing', 'small-office-components', 'campus-media', 'branch-topology'].every((id) => networkingFoundationsRendererSource.includes(`'${id}'`))
  && networkingFoundationsRendererSource.includes('data-interface-id={item.id}')
  && networkingFoundationsRendererSource.includes('data-from-interface-id={item.fromInterfaceId}')
  && networkingFoundationsRendererSource.includes('data-to-interface-id={item.toInterfaceId}')
  && networkingFoundationsRendererSource.includes('data-path-definition={geometry.paths[item.id]}')
  && networkingFoundationsRendererSource.includes('activity.input.activityByPreset[presetId]'));
ok('current movement is rendered once above the full-width network canvas on desktop and phone',
  networkingRendererSource.includes('export function NetworkCurrentMovement')
  && !networkingRendererSource.includes('<NetworkCurrentMovement frame={frame} compact/>')
  && visualizerSource.includes('<><NetworkCurrentMovement frame={networkFrame}/><div ref={networkWorkbenchRef}'));
const networkingDiagramControlsSource = fs.readFileSync(path.join(ROOT, 'visualizer-src', 'network-diagram-controls.jsx'), 'utf8');
ok('Module 1 stays generic while the ARP preview preserves Generic, Interfaces, and its label toggle',
  networkingDiagramControlsSource.includes("onModeChange('generic')")
  && networkingDiagramControlsSource.includes("onModeChange('interfaces')")
  && networkingDiagramControlsSource.includes('onShowLabelsChange(event.target.checked)')
  && networkingFoundationsRendererSource.includes('data-display-mode="generic"')
  && networkingFoundationsRendererSource.includes('data-interface-labels="hidden"')
  && !networkingFoundationsRendererSource.includes('<NetworkDiagramControls'));
ok('device callouts use synchronized third-person teaching narration and preserve overlapping role classifications',
  networkingFoundationsRendererSource.includes('data-callout-device-id={device.id}')
  && networkingFoundationsRendererSource.includes('frame.callouts?.[device.id]')
  && networkingFoundationsRendererSource.includes('Client laptop wants to') === false
  && networkingFoundationsRendererSource.includes("return 'End device · Server role'")
  && networkingRendererSource.includes('frame.phase.explanation')
  && networkingRendererSource.includes('data-callout-device-id={deviceId}'));
const networkingCarouselSource = fs.readFileSync(path.join(ROOT, 'visualizer-src', 'network-operation-carousel.jsx'), 'utf8');
ok('network operation carousel exposes four readable steps while retaining the eight-operation contract',
  networkingCarouselSource.includes('const PAGE_SIZE = 4')
  && networkingCarouselSource.includes('timeline.slice(start, start + PAGE_SIZE)')
  && networkingCarouselSource.includes('data-operation-total={timeline.length}')
  && networkingCarouselSource.includes('Show next four steps'));
const networkingFloatingInspectorSource = fs.readFileSync(path.join(ROOT, 'visualizer-src', 'network-floating-inspector.jsx'), 'utf8');
ok('desktop packet inspector supports bounded drag, keyboard movement, resizing, evidence tabs, and window reset',
  networkingFloatingInspectorSource.includes("window.addEventListener('pointermove', movePanel)")
  && networkingFloatingInspectorSource.includes("'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'")
  && networkingFloatingInspectorSource.includes('setPosition(clampPosition')
  && networkingFloatingInspectorSource.includes('data-position-mode={position ? \'custom\' : \'default\'}')
  && networkingFloatingInspectorSource.includes('data-min-width={MINIMUM_WIDTH}')
  && networkingFloatingInspectorSource.includes('event.shiftKey')
  && networkingFloatingInspectorSource.includes("tab === 'arp' ? <ArpTableView")
  && networkingFloatingInspectorSource.includes('Reset window'));

const oopEngine = load(['course-catalog.js', 'playback.js', 'itcc45-activities.js', 'itcc45-practice-data.js'], { setTimeout, clearTimeout });
const Courses = oopEngine.get('BSITLearningLab');
const OOPActivities = oopEngine.get('ITCC45Activities');
const OOPPractice = oopEngine.get('BSITOOPPractice');
ok('course catalog is versioned and contains ITCC45 and ITCC47', Courses.SCHEMA_VERSION === 1 && ['itcc45', 'itcc47'].every((id) => Courses.listCourses().some((course) => course.id === id)));
ok('course IDs and activity IDs are unique', new Set(Courses.listCourses().map((course) => course.id)).size === Courses.listCourses().length && new Set(OOPActivities.list().map((activity) => activity.id)).size === OOPActivities.list().length);
const oopTopicIds = ['classes', 'objects', 'encapsulation', 'inheritance', 'abstraction', 'polymorphism'];
ok('ITCC45 activity catalog has three ordered examples for each topic', oopTopicIds.every((topicId) => OOPActivities.forTopic(topicId).length === 3 && OOPActivities.forTopic(topicId).every((activity, index) => activity.exampleOrder === index + 1)));
ok('ITCC45 activities declare discovery and misconception metadata', OOPActivities.list().every((activity) => ['classroom', 'textbook', 'real-world'].includes(activity.context) && activity.learningGoal && activity.misconceptionIds.length));
ok('every ITCC45 topic spans an introduction and a transfer context', oopTopicIds.every((topicId) => {
  const contexts = new Set(OOPActivities.forTopic(topicId).map((activity) => activity.context));
  return contexts.has('classroom') && contexts.has('real-world');
}));
OOPActivities.list().forEach((activity) => {
  const a = activity.run(activity.input.defaults);
  const b = activity.run(activity.input.defaults);
  const printLines = activity.source
    .map((line, index) => line.trim().startsWith('print(') ? index + 1 : null)
    .filter(Boolean);
  const coveredLines = new Set(a.events.map((item) => item.source?.line));
  ok(`${activity.id}: timeline is deterministic`, JSON.stringify(a) === JSON.stringify(b));
  ok(`${activity.id}: output matches its declared example`, JSON.stringify(a.events.at(-1).frame.output) === JSON.stringify(activity.expectedOutput));
  ok(`${activity.id}: every displayed print statement has a timeline step`, printLines.every((line) => coveredLines.has(line)));
  ok(`${activity.id}: output remains accumulated throughout playback`, a.events.every((item, index) => {
    if (!index) return true;
    const previous = a.events[index - 1].frame.output;
    return previous.every((line, outputIndex) => item.frame.output[outputIndex] === line);
  }));
  ok(`${activity.id}: output grows only on the source line that prints it`, a.events.every((item, index) => {
    const previousLength = index ? a.events[index - 1].frame.output.length : 0;
    return item.frame.output.length === previousLength || item.source?.code.trim().startsWith('print(');
  }));
  const boundaryScenarios = ['minimum', 'middle', 'maximum'].map((boundary) => Object.fromEntries(activity.input.controls.map((control) => {
    if (control.type !== 'number') return [control.key, boundary === 'minimum' ? 'A "quoted" value' : boundary === 'middle' ? 'Learner' : 'Transfer case'];
    if (boundary === 'minimum') return [control.key, control.min];
    if (boundary === 'maximum') return [control.key, control.max];
    return [control.key, (Number(control.min) + Number(control.max)) / 2];
  })));
  ok(`${activity.id}: boundary scenarios keep source, frames, and output synchronized`, boundaryScenarios.every((options) => {
    const source = activity.sourceFor(options);
    const first = activity.run(options);
    const second = activity.run(options);
    return JSON.stringify(first) === JSON.stringify(second)
      && first.events.every((item) => item.source?.code === source[item.source.line - 1])
      && first.events.every((item, index) => !index || first.events[index - 1].frame.output.every((line, outputIndex) => item.frame.output[outputIndex] === line));
  }));
  a.events.forEach((item) => {
    const classIds = new Set(item.frame.classes.map((model) => model.id));
    const objectIds = new Set(item.frame.objects.map((model) => model.id));
    ok(`${activity.id}: frame identities are unique`, classIds.size === item.frame.classes.length && objectIds.size === item.frame.objects.length);
    ok(`${activity.id}: object classes and references are valid`, item.frame.objects.every((model) => classIds.has(model.classId)) && Object.values(item.frame.references).every((id) => objectIds.has(id)));
    ok(`${activity.id}: active receiver is a displayed object when one is declared`, !item.frame.active?.receiverId || objectIds.has(item.frame.active.receiverId));
    ok(`${activity.id}: lookup path references known classes`, !item.frame.active || item.frame.active.lookupPath.every((id) => classIds.has(id)));
  });
});
const classReading = OOPActivities.get('itcc45-classes-blueprint').run();
const classSchoolOutput = classReading.events.find((item) => item.source?.line === 12);
ok('classes blueprint reads and renders Student.school on line 12', classSchoolOutput?.frame.output.join('|') === 'CMU' && classSchoolOutput.frame.annotations.some((item) => item.value === 'Student.school'));
ok('classes blueprint reveals instance fields only as their assignment lines execute',
  JSON.stringify(classReading.events.find((item) => item.source?.line === 5).frame.objects[0].fields) === JSON.stringify({ name: 'Ana' })
  && JSON.stringify(classReading.events.find((item) => item.source?.line === 6).frame.objects[0].fields) === JSON.stringify({ name: 'Ana', program: 'BSIT' }));
const rejectedScore = OOPActivities.get('itcc45-encapsulation-property').run({ startingScore: 88, proposedScore: 120 });
ok('encapsulation rejects invalid scores without changing state', rejectedScore.events.some((item) => item.type === 'reject') && rejectedScore.events.at(-1).frame.objects[0].fields._score === 88);
ok('abstraction demonstrates incomplete subclass rejection', OOPActivities.get('itcc45-abstraction-contract').run().events.some((item) => item.type === 'reject'));
ok('polymorphism dispatches through both concrete classes', OOPActivities.get('itcc45-polymorphic-dispatch').run().events.filter((item) => item.type === 'dispatch').map((item) => item.frame.active.method).join(',') === 'EmailNotification.send,SmsNotification.send');
ok('class shadowing preserves the class fallback', OOPActivities.get('itcc45-classes-instance-shadowing').run().events.at(-1).frame.output.join('|') === 'OOP101: Lab 5|WEB101: Lab 2|Lab 2');
const sharedMutable = OOPActivities.get('itcc45-classes-shared-mutable').run();
ok('shared mutable class state is contrasted with independent repaired state',
  sharedMutable.events.some((item) => item.type === 'mutate-shared' && item.segment?.id === 'attempt')
  && sharedMutable.events.some((item) => item.segment?.id === 'repair')
  && sharedMutable.events.at(-1).frame.objects.find((item) => item.id === 'fixed:second').fields.items.length === 0);
ok('recursive setter failure is caught before its backing-field repair', OOPActivities.get('itcc45-encapsulation-recursive-setter').run().events.some((item) => item.type === 'reject') && OOPActivities.get('itcc45-encapsulation-recursive-setter').run().events.at(-1).frame.objects[0].fields._celsius === 24);
ok('name-mangling is visualized as convention rather than security', OOPActivities.get('itcc45-encapsulation-python-privacy').run().events.some((item) => item.frame.annotations.some((note) => note.value === '_StudentPortal__token')) && OOPActivities.get('itcc45-encapsulation-python-privacy').run().events.at(-1).frame.notice.includes('security'));
ok('missing super exposes absent base state before repair', OOPActivities.get('itcc45-inheritance-missing-super').run().events.at(-1).frame.objects[0].fields.name === 'Ana' && OOPActivities.get('itcc45-inheritance-missing-super').run().events.some((item) => item.type === 'reject'));
ok('abstraction begins with hidden details before ABC syntax', !OOPActivities.get('itcc45-abstraction-hidden-details').source.join('\n').includes('ABC') && OOPActivities.get('itcc45-abstraction-shape-contract').source.join('\n').includes('abstractmethod'));
ok('type-switch contrast ends with runtime dispatch through both delivery classes', OOPActivities.get('itcc45-polymorphism-type-switch').run().events.filter((item) => item.type === 'dispatch').map((item) => item.frame.active.method).join(',') === 'StandardDelivery.fee,ExpressDelivery.fee');
const oopAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'itcc45-example-audit.json'), 'utf8'));
const retainedAudit = oopAudit.candidates.filter((candidate) => candidate.retained);
ok('ITCC45 audit evaluates 24 candidates and retains 18', oopAudit.candidates.length === 24 && retainedAudit.length === 18);
ok('every retained audit candidate clears the release rubric', retainedAudit.every((candidate) => candidate.total >= 10 && candidate.scores.length === 6 && candidate.scores.every((score) => score > 0)));
ok('every shipped activity maps to one retained audit decision', new Set(retainedAudit.map((candidate) => candidate.activityId)).size === 18 && OOPActivities.list().every((activity) => retainedAudit.some((candidate) => candidate.activityId === activity.id)));
ok('practice has exactly three challenges for each topic', OOPPractice.topics.every((topic) => OOPPractice.forTopic(topic.id).length === 3) && OOPPractice.challenges.length === 18);
ok('challenge IDs are unique and answer indexes are valid', new Set(OOPPractice.challenges.map((item) => item.id)).size === 18 && OOPPractice.challenges.every((item) => Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.choices.length));

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
const rawPrecacheBytes = wanted.filter((asset) => asset !== './').reduce((total, asset) => {
  const assetPath = path.join(ROOT, asset.replace(/^\.\//, ''));
  return total + (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile() ? fs.statSync(assetPath).size : 0);
}, 0);
ok('raw offline precache remains within the deterministic 2 MiB budget', rawPrecacheBytes <= 2 * 1024 * 1024,
  rawPrecacheBytes > 2 * 1024 * 1024
    ? `raw precache is ${rawPrecacheBytes} bytes; introduce an optional subject pack with its exact size and an explicit “Download for offline use” confirmation`
    : '');
const rootHtml = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html'))
  .map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
const referencedScripts = new Set([...rootHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/g)]
  .map((match) => match[1].split(/[?#]/)[0]));
const orphanScripts = fs.readdirSync(ROOT).filter((file) => file.endsWith('.js'))
  .filter((file) => !['sw.js', 'playwright.config.js', 'vite.visualizer.config.js'].includes(file))
  .filter((file) => !referencedScripts.has(file));
ok('every shipped root script has an entry-page owner', orphanScripts.length === 0,
  orphanScripts.length ? `orphan scripts: ${orphanScripts.join(', ')}` : '');
ok('retired visualizer and student-bundle implementations stay removed while the scoped companion is shipped',
  !fs.existsSync(path.join(ROOT, 'app.js'))
  && !fs.existsSync(path.join(ROOT, 'tools', 'build-student-bundles.js'))
  && fs.existsSync(path.join(ROOT, 'lesson-app.js'))
  && fs.existsSync(path.join(ROOT, 'checkpoint-companions.js')));
const sharedStyles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
ok('retired visualizer and materials selectors stay removed',
  !/\.(?:chart-zero|bar-col|bar-value|bar-index|materials-grid|material-card|material-downloads)\b/.test(sharedStyles));
ok('service worker uses the BSIT cache prefix', swSource.includes("const CACHE_PREFIX = 'bsit-learning-lab-'") && swSource.includes("const RETIRED_CACHE_PREFIX = 'itcc47-practice-'"));
ok('service worker precaches atomically', swSource.includes('cache.addAll(PRECACHE)'));
ok('service worker cleans up old caches', swSource.includes('caches.delete'));
ok('service worker preserves unrelated origin caches', swSource.includes('n.startsWith(CACHE_PREFIX) && n !== CACHE'));
ok('service worker ignores non-GET requests', /request\.method\s*!==\s*'GET'/.test(swSource));
ok('service worker ignores cross-origin requests', swSource.includes('url.origin !== self.location.origin'));

// Every page must register the worker, or that page is not available offline.
['index.html', 'visualizer.html', 'industry-workbench.html', 'writer.html', 'tracer.html', 'problems.html', 'problem-list.html', 'practice.html', 'lesson.html'].forEach((page) => {
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
const instructorTokenPath = path.join(ROOT, '.instructor-preview-token');
const instructorTokenIgnored = isIgnored('.instructor-preview-token');
const instructorToken = fs.existsSync(instructorTokenPath) ? fs.readFileSync(instructorTokenPath, 'utf8').trim() : '';
ok('private instructor token is gitignored', instructorTokenIgnored);
ok('private instructor token is absent from student HTML and offline cache', !instructorToken || (!rootHtml.includes(instructorToken) && !swSource.includes(instructorToken)));
['writer.html', 'industry-workbench.html', 'problems.html', 'practice.html', 'visualizer.html', 'tracer.html', 'itcc47.html', 'problem-list.html'].forEach((page) => {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const hashIndex = html.indexOf('sha256.js');
  const accessIndex = html.indexOf('instructor-access.js');
  const curriculumIndex = html.indexOf('curriculum.js');
  ok(`${page} loads the instructor verifier before curriculum resolution`, hashIndex >= 0 && hashIndex < accessIndex && accessIndex < curriculumIndex);
});

// ---------- curriculum governance ----------

section('curriculum governance');
const previewStorage = (() => { const values = new Map(); return { getItem:(key)=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:(key)=>values.delete(key) }; })();
const unitInstructorToken = 'unit-test-instructor-capability-with-sufficient-entropy';
const curriculumEngine = load(['course-catalog.js','curriculum.data.js','release-profile.js','sha256.js','curriculum.js'], {
  ITCC47_INSTRUCTOR_ACCESS:{ schemaVersion:1,profileId:'itcc47-2026-2027-s1',profileVersion:6,tokenHash:Hash.hex(unitInstructorToken) },
  localStorage:previewStorage,
  location:{ search:'' },
  URLSearchParams,
});
const Curriculum = curriculumEngine.get('ITCC47Curriculum');
const ReleaseProfile = curriculumEngine.get('ITCC47_RELEASE_PROFILE');
const InstructorAccess = curriculumEngine.get('ITCC47_INSTRUCTOR_ACCESS');
ok('Midterm profile ends at Module 4 queues and deques', ReleaseProfile.schemaVersion === 2 && ReleaseProfile.profileVersion === 6 && ReleaseProfile.currentCheckpointId === 'm4-queue-deque' && !('finalProjectId' in ReleaseProfile));
const visualProgressStorage = (() => { const values = new Map(); return { getItem:(key)=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:(key)=>values.delete(key) }; })();
const visualProgressEngine = load(['visualizer-progress.js'], { localStorage: visualProgressStorage });
const VisualProgress = visualProgressEngine.get('ITCC47VisualizerProgress');
VisualProgress.markVisited('bubble-sort', { storage: visualProgressStorage, now: '2026-08-18T02:03:04.000Z' });
ok('visualizer progress records a versioned local visit', VisualProgress.get('bubble-sort', visualProgressStorage)?.lastVisitedAt === '2026-08-18T02:03:04.000Z' && VisualProgress.formatDate('2026-08-18T02:03:04.000Z') === '18/08/2026');
VisualProgress.markReviewed('bubble-sort', { storage: visualProgressStorage, now: '2026-08-19T05:06:07.000Z' });
VisualProgress.markVisited('bubble-sort', { storage: visualProgressStorage, now: '2026-08-20T08:09:10.000Z' });
const reviewedProgress = VisualProgress.get('bubble-sort', visualProgressStorage);
ok('a later visit preserves the reviewed milestone', reviewedProgress.lastVisitedAt === '2026-08-20T08:09:10.000Z' && reviewedProgress.reviewedAt === '2026-08-19T05:06:07.000Z');
ok('visualizer progress summarizes only requested activities', JSON.stringify(VisualProgress.summary(['bubble-sort','selection-sort'], visualProgressStorage)) === JSON.stringify({ total:2,visited:1,reviewed:1 }));
const storedVisualProgress = JSON.parse(visualProgressStorage.getItem(VisualProgress.STORAGE_KEY));
ok('visualizer progress stores no grade or authoritative result', storedVisualProgress.schemaVersion === 1 && Object.keys(storedVisualProgress.activities['bubble-sort']).sort().join(',') === 'lastVisitedAt,reviewedAt' && !/grade|score|submission/i.test(JSON.stringify(storedVisualProgress)));
ok('catalog preserves all six authoritative CLO definitions', Curriculum.clos.length === 6 && Curriculum.clos.every((clo)=>clo.id && clo.statement));
ok('checkpoint order is unique and increasing', new Set(Curriculum.checkpoints.map((item)=>item.order)).size === Curriculum.checkpoints.length && Curriculum.checkpoints.every((item,index,list)=>!index || item.order > list[index-1].order));
ok('every checkpoint prerequisite points backward', Curriculum.checkpoints.every((item)=>item.prerequisiteIds.every((id)=>Curriculum.getCheckpoint(id)?.order < item.order)));
ok('every resource mapping resolves', Curriculum.listResources().every((resource)=>resource.alwaysAvailable || Curriculum.getCheckpoint(resource.checkpointId)));
ok('Modules 1-4 are reviewed while Modules 5-8 remain drafts', Curriculum.checkpoints.filter((item)=>item.order <= Curriculum.getCheckpoint('m4-queue-deque').order).every((item)=>item.reviewStatus === 'reviewed') && Curriculum.checkpoints.filter((item)=>item.order > Curriculum.getCheckpoint('m4-queue-deque').order).every((item)=>item.reviewStatus === 'draft'));
const midtermEndOrder = Curriculum.getCheckpoint('m4-queue-deque').order;
const midtermCheckpoints = Curriculum.checkpoints.filter((checkpoint)=>checkpoint.order <= midtermEndOrder);
const midtermCheckpointIds = new Set(midtermCheckpoints.map((checkpoint)=>checkpoint.id));
const midtermResources = Curriculum.listResources().filter((resource)=>midtermCheckpointIds.has(resource.checkpointId));
ok('every Module 1-4 checkpoint is public', midtermCheckpoints.every((checkpoint)=>['available','current'].includes(Curriculum.stateForCheckpoint(checkpoint.id).state)));
ok('every Module 1-4 resource is public', midtermResources.every((resource)=>['available','current'].includes(Curriculum.stateForResource(resource.kind,resource.id).state)));
ok('every Module 1-4 mapped resource appears in its checkpoint sequence', midtermCheckpoints.every((checkpoint)=> {
  const mapped = midtermResources.filter((resource)=>resource.checkpointId === checkpoint.id).map((resource)=>`${resource.kind}:${resource.id}`);
  return mapped.every((reference)=>checkpoint.sequence.includes(reference));
}));
ok('every Module 1-4 resource resolves to student-facing metadata and a canonical route', midtermResources.every((resource)=> {
  if (resource.kind === 'tool') return typeof resource.route === 'string' && fs.existsSync(path.join(ROOT,resource.route));
  if (resource.kind === 'activity') {
    const activity = Activities.list().find((item)=>item.id === resource.id);
    return Boolean(activity?.title && activity?.subtitle);
  }
  const problem = PROBLEMS.find((item)=>item.id === resource.id);
  return Boolean(problem?.title && problem?.statement && problem?.reviewStatus === 'reviewed');
}));
ok('public curriculum exposes tools, activities, and practice problems only', Curriculum.listResources().every((resource)=>['tool','activity','problem'].includes(resource.kind) && !('labRefs' in resource) && ['reviewed','draft'].includes(resource.reviewStatus)));
ok('checkpoint sequences and resources contain no retired lesson references', Curriculum.listResources().every((resource)=>resource.kind !== 'lesson') && Curriculum.checkpoints.every((checkpoint)=>(checkpoint.sequence || []).every((reference)=>!reference.startsWith('lesson:'))));
ok('current, available, and locked states share one resolver', Curriculum.stateForResource('problem','sum-two').state === 'available' && Curriculum.stateForResource('activity','industry-priority-range-recall').state === 'available' && Curriculum.stateForResource('activity','linked-list-insert-head').state === 'available' && Curriculum.stateForResource('activity','deque-service-lane').state === 'current' && Curriculum.stateForResource('activity','recursive-range-search').state === 'locked');
ok('missing mappings fail closed at runtime', Curriculum.stateForResource('activity','not-mapped').state === 'planned' && !Curriculum.isOpen('activity','not-mapped'));
ok('student preview requests cannot authorize themselves', Curriculum.writePreview('m8-dp',previewStorage) === null && Curriculum.activeProfile({preview:true,storage:previewStorage}).currentCheckpointId === 'm4-queue-deque');
previewStorage.setItem(Curriculum.PREVIEW_STORAGE_KEY, JSON.stringify({ schemaVersion:2,profileId:ReleaseProfile.profileId,profileVersion:ReleaseProfile.profileVersion,currentCheckpointId:'m8-dp' }));
ok('a stored release checkpoint without instructor access remains locked', Curriculum.activeProfile({preview:true,storage:previewStorage}).currentCheckpointId === 'm4-queue-deque');
previewStorage.setItem(Curriculum.INSTRUCTOR_ACCESS_STORAGE_KEY, JSON.stringify({ schemaVersion:InstructorAccess.schemaVersion,profileId:InstructorAccess.profileId,profileVersion:InstructorAccess.profileVersion,tokenHash:InstructorAccess.tokenHash }));
ok('the public verifier hash cannot be copied into storage to forge instructor access', !Curriculum.hasInstructorAccess(previewStorage));
Curriculum.grantInstructorAccess(unitInstructorToken, previewStorage);
Curriculum.writePreview('m8-dp',previewStorage);
ok('authorized preview is explicit and persisted under versioned keys', Curriculum.activeProfile({preview:true,storage:previewStorage}).currentCheckpointId === 'm8-dp' && previewStorage.getItem(Curriculum.PREVIEW_STORAGE_KEY) && previewStorage.getItem(Curriculum.INSTRUCTOR_ACCESS_STORAGE_KEY));
const finalCheckpointIds = new Set(Curriculum.checkpoints.filter((checkpoint)=>checkpoint.order > midtermEndOrder).map((checkpoint)=>checkpoint.id));
const finalResources = Curriculum.listResources().filter((resource)=>finalCheckpointIds.has(resource.checkpointId));
ok('ordinary students cannot open any Module 5-8 resource', finalResources.length > 0 && finalResources.every((resource)=>Curriculum.stateForResource(resource.kind,resource.id,{ storage:visualProgressStorage,search:'' }).state === 'locked'));
ok('instructor preview reaches every Module 5-8 resource', finalResources.length > 0 && finalResources.every((resource)=>['available','current'].includes(Curriculum.stateForResource(resource.kind,resource.id,{ preview:true,storage:previewStorage }).state)));
ok('normal visits ignore an authorized stored preview without the preview query', Curriculum.activeProfile({preview:false,storage:previewStorage,search:''}).currentCheckpointId === 'm4-queue-deque');
Curriculum.revokeInstructorAccess(previewStorage);
ok('exiting instructor mode removes both access and checkpoint state', !previewStorage.getItem(Curriculum.INSTRUCTOR_ACCESS_STORAGE_KEY) && !previewStorage.getItem(Curriculum.PREVIEW_STORAGE_KEY));
const activationToken = 'separate-activation-token-with-sufficient-entropy';
const activationStorage = (() => { const values = new Map(); return { getItem:(key)=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:(key)=>values.delete(key) }; })();
const activationHistory = { replaced:null,replaceState(_state,_title,url){this.replaced=url;} };
const activationEngine = load(['course-catalog.js','curriculum.data.js','release-profile.js','sha256.js','curriculum.js'], {
  ITCC47_INSTRUCTOR_ACCESS:{ schemaVersion:1,profileId:ReleaseProfile.profileId,profileVersion:ReleaseProfile.profileVersion,tokenHash:Hash.hex(activationToken) },
  localStorage:activationStorage,
  location:{ search:`?view=visualizations&instructorKey=${encodeURIComponent(activationToken)}`,pathname:'/problems.html',hash:'' },
  history:activationHistory,
  URLSearchParams,
});
const ActivatedCurriculum = activationEngine.get('ITCC47Curriculum');
ok('a valid instructor capability is consumed, persisted, and removed from the URL', ActivatedCurriculum.hasInstructorAccess(activationStorage) && activationHistory.replaced === 'problems.html?view=visualizations&preview=1' && !activationHistory.replaced.includes(activationToken));
ok('array-list mutation belongs to Module 2', Activities.get('array-list-insert').module === 2 && Activities.get('array-list-remove').module === 2);
ok('industry workbench follows array mutation and precedes Module 3', Curriculum.getCheckpoint('m2-industry-workbench').prerequisiteIds.join(',') === 'm2-array-mutation' && Curriculum.getCheckpoint('m3-linked-foundations').prerequisiteIds.join(',') === 'm2-industry-workbench');
ok('all industry scenarios release together at one reviewed checkpoint', industryScenarios.every((scenario) => Curriculum.getResource('activity', scenario.id)?.checkpointId === 'm2-industry-workbench') && Curriculum.getCheckpoint('m2-industry-workbench').reviewStatus === 'reviewed');
ok('student profile keeps every Module 2 industry scenario available', industryScenarios.every((scenario) => Curriculum.stateForResource('activity', scenario.id).state === 'available'));
ok('student profile opens every reviewed Module 3 resource', midtermResources.filter((resource)=>resource.checkpointId.startsWith('m3-')).every((resource)=>Curriculum.isOpen(resource.kind,resource.id)));
ok('linked foundations sequence includes both reviewed practice problems', Curriculum.getCheckpoint('m3-linked-foundations').sequence.slice(-2).join(',') === 'problem:linked-node-count,problem:linked-find-value');
ok('linked foundations enters through storage comparison before raw traversal', Curriculum.getCheckpoint('m3-linked-foundations').sequence.slice(0,2).join(',') === 'activity:array-linked-comparison,activity:linked-list-traversal');
ok('Module 3 framing emphasizes identity, reachability, and safe mutation invariants', /references and identity/i.test(Curriculum.getModule('m3').title) && /contiguous storage with explicit links/i.test(Curriculum.getCheckpoint('m3-linked-foundations').summary) && /losing a reference/i.test(Curriculum.getCheckpoint('m3-linked-foundations').goals.join(' ')) && /safe order/i.test(Curriculum.getCheckpoint('m3-linked-mutation').summary) && /mutation invariants/i.test(Curriculum.getCheckpoint('m3-linked-mutation').summary));
ok('every shipped activity exposes curriculum metadata', Activities.list().filter((activity)=>Curriculum.getResource('activity',activity.id)).every((activity)=>activity.checkpointId && activity.cloIds.length));
ok('every cataloged visualization has a concrete activity', Curriculum.listResources('activity').every((resource)=>Activities.list().some((activity)=>activity.id === resource.id)));
const extendedIds = ['binary-range-search','stable-insertion-dispatch','array-linked-comparison','linked-list-sorted-insert','linked-list-find-update','linked-list-delete','recursive-range-search','stable-merge-sort','tree-traversals','bst-insert-search','bst-height-shape','graph-representation','bfs-shortest-path','dfs-reachability','greedy-dp-coin-change','knapsack-dp'];
extendedIds.forEach((id) => {
  const activity = Activities.get(id); const result = activity.run();
  ok(`${id}: deterministic lifecycle and terminal return`, result.events[0].type === 'initialize' && result.events.at(-1).terminal && JSON.stringify(result) === JSON.stringify(activity.run()));
  ok(`${id}: teaching targets are valid and never stale`, result.events.every((event)=>(event.frame.markers.teaching?.annotations || []).every((annotation)=> {
    if (annotation.target.kind === 'slot') return annotation.target.index >= 0 && annotation.target.index < event.frame.array.length;
    if (annotation.target.kind === 'entity') return [...(event.frame.nodes || []), ...(event.frame.detachedNodes || []), ...(event.frame.lanes || []).flatMap((lane)=>lane.items || [])].some((item)=>item.id === annotation.target.id);
    if (annotation.target.kind === 'pointer') return Object.prototype.hasOwnProperty.call(event.frame.pointers || {},annotation.target.id);
    if (annotation.target.kind === 'record') return (event.frame.records || []).some((record)=>record.id === annotation.target.id);
    if (annotation.target.kind === 'array-slot') return Number.isInteger(annotation.target.index) && annotation.target.index >= 0 && annotation.target.index < (event.frame.arrayState?.slots?.length || 0);
    if (annotation.target.kind === 'linked-node') return (event.frame.linkedState?.nodes || []).some((node)=>node.id === annotation.target.id);
    if (annotation.target.kind === 'linked-reference') return annotation.target.nodeId === null
      ? annotation.target.field === 'head'
      : (event.frame.linkedState?.nodes || []).some((node)=>node.id === annotation.target.nodeId && ['prev','next'].includes(annotation.target.field));
    return annotation.target.kind === 'held';
  })));
});
const rangeSearch = Activities.get('binary-range-search').run({values:[2,4,4,4,4,9,11],target:4});
ok('binary range search compares real values and returns duplicate bounds', rangeSearch.result.lower === 1 && rangeSearch.result.upper === 5 && rangeSearch.events.some((event)=>event.type === 'comparison') && rangeSearch.events.some((event)=>event.type === 'loop-exit'));
ok('binary range boundaries remain valid half-open ranges', rangeSearch.events.every((event)=>{ const {low,high,mid}=event.frame.markers || {}; return (!Number.isInteger(low) || !Number.isInteger(high) || (low >= 0 && low <= high && high <= event.frame.array.length)) && (!Number.isInteger(mid) || (mid >= 0 && mid < event.frame.array.length)); }));
const stableRecords = Activities.get('stable-insertion-dispatch').run();
ok('stable record insertion preserves equal-priority identity order', stableRecords.result.identities.join(',') === 'B,D,A,C' && stableRecords.events.some((event)=>event.frame.presentation?.held) && stableRecords.events.at(-1).frame.markers.hole === undefined);
['middle','head','tail','singleton'].forEach((preset)=> {
  const result = Activities.get('linked-list-sorted-insert').run({preset});
  ok(`linked sorted insertion ${preset} keeps all invariants`, result.events.at(-1).frame.invariants.sorted && result.events.at(-1).frame.invariants.cycleFree && result.events.at(-1).frame.invariants.reachable && result.events.at(-1).frame.detachedNodes.length === 0);
});
['relocation','head','tail','singleton','missing'].forEach((preset)=> {
  const result = Activities.get('linked-list-find-update').run({preset});
  ok(`linked relocation ${preset} preserves identity and structure`, result.events.at(-1).frame.invariants.sorted && result.events.at(-1).frame.invariants.cycleFree && result.events.at(-1).frame.invariants.reachable && result.events.at(-1).frame.detachedNodes.length === 0);
});
['middle','head','tail','singleton','missing'].forEach((preset)=> {
  const result = Activities.get('linked-list-delete').run({preset});
  ok(`linked deletion ${preset} reports detachment accurately`, result.events.at(-1).frame.invariants.cycleFree && Number.isInteger(result.events.at(-1).frame.invariants.reachable) && result.events.at(-1).frame.detachedNodes.length === (preset === 'missing' ? 0 : 1));
});
const module4Activities = Activities.list().filter((activity) => activity.module === 4);
ok('Module 4 contains ten guided examples', module4Activities.length === 10);
ok('Module 4 balances stacks, queues, and deques', ['Stacks','Queues','Deques'].every((family) => module4Activities.filter((activity) => activity.family === family).length >= 3));
ok('Module 4 spans foundations, algorithmic reasoning, and real-world contexts', ['Foundations','Math resolver','Real world'].every((kind) => module4Activities.some((activity) => activity.exampleKind === kind)));
module4Activities.forEach((activity) => {
  const result = activity.run();
  ok(`${activity.id}: every event maps to a real source line`, result.events.every((event) => event.source?.code === activity.source[event.source.line - 1]));
  ok(`${activity.id}: linear-ADT frames and annotations stay valid`, result.events.every((event) => {
    if (event.frame.kind !== 'linear-adt') return false;
    const live = new Set(event.frame.lanes.flatMap((lane) => lane.items.map((item) => item.id)));
    const held = new Set(event.frame.held.map((item) => item.id));
    return event.frame.markers.teaching.annotations.every((annotation) => annotation.target.kind === 'held' ? held.has(annotation.target.id) : live.has(annotation.target.id));
  }));
  ok(`${activity.id}: timeline is deterministic and terminates`, JSON.stringify(result) === JSON.stringify(activity.run()) && result.events.at(-1).terminal);
  ok(`${activity.id}: front/back/top invariants agree with the rendered lane`, result.events.every((event)=> {
    const items = event.frame.lanes[0]?.items || [];
    const invariant = event.frame.invariants;
    return invariant.size === items.length && invariant.empty === (items.length === 0) && (event.frame.structure === 'stack' ? invariant.top === (items.at(-1)?.id || null) : invariant.front === (items[0]?.id || null) && invariant.back === (items.at(-1)?.id || null));
  }));
});
ok('stack basics visibly enforce LIFO', Activities.get('stack-lifo-basics').run().result.popped === 'B');
const stackPhases = Activities.get('stack-lifo-basics').run().events;
const stackLine = (line) => stackPhases.filter((event) => event.source.line === line);
ok('stack foundations expands seven lines into nineteen reversible phases', stackPhases.length === 19 && stackPhases.every((event) => Object.isFrozen(event.frame.execution)));
ok('stack source lines own ordered phase groups', [3, 4, 5, 6].every((line) => stackLine(line).length === 4 && stackLine(line).every((event, index) => event.frame.execution.phaseIndex === index && event.frame.execution.phaseCount === 4)));
[3, 4].forEach((line) => {
  const phases = stackLine(line);
  const before = line - 3;
  ok(`stack line ${line} stages before commit and updates metadata last`, phases[0].frame.execution.workingValue === (line === 3 ? 'A' : 'B') && phases[0].frame.array.length === before && phases[1].frame.array.length === before && phases[2].frame.array.length === before + 1 && phases[2].frame.execution.pendingMetadata && phases[3].frame.execution.complete && !phases[3].frame.execution.workingValue);
});
ok('PEEK retains both items in every phase and assigns only at phase three', stackLine(5).every((event) => event.frame.array.join(',') === 'A,B') && stackLine(5)[1].frame.markers.variables.topValue === undefined && stackLine(5)[2].frame.markers.variables.topValue === 'B');
ok('POP separates identification, removal, assignment, and confirmation', stackLine(6)[0].frame.array.join(',') === 'A,B' && stackLine(6)[1].frame.array.join(',') === 'A' && stackLine(6)[1].frame.execution.workingValue === 'B' && stackLine(6)[1].frame.markers.variables.popped === undefined && stackLine(6)[2].frame.markers.variables.popped === 'B' && stackLine(6)[3].frame.execution.complete);
ok('runtime values persist and output is emitted only by RETURN', stackPhases.filter((event) => event.source.line < 7).every((event) => event.frame.output.length === 0) && stackPhases.at(-1).frame.output.join(',') === 'B' && stackPhases.at(-1).frame.markers.variables.topValue === 'B' && stackPhases.at(-1).frame.markers.variables.popped === 'B');
const stackController = Playback.createController();
stackController.load(stackPhases, 2);
stackController.step(1);
ok('Step advances a phase before advancing source', stackController.getState().currentEvent.source.line === 3 && stackController.getState().currentEvent.frame.execution.phaseIndex === 1);
stackController.seek(15);
stackController.step(-1);
ok('Previous restores the pre-removal stack and runtime snapshot', stackController.getState().currentEvent.frame.array.join(',') === 'A,B' && stackController.getState().currentEvent.frame.markers.variables.popped === undefined);
stackController.dispose();
ok('stack basics guards underflow before any empty pop', Activities.get('stack-lifo-basics').run().events.some((event)=>event.frame.operation?.label === 'UNDERFLOW guard' && event.frame.markers.teaching.comparison?.outcome === false));
ok('postfix resolver returns 21', Activities.get('stack-postfix-evaluator').run().result.value === 21);
const postfixEvents = Activities.get('stack-postfix-evaluator').run().events;
const postfixPhases = (token, line, kind) => postfixEvents.filter(event => event.frame.iteration.index === token && event.source.line === line && (!kind || event.frame.execution.kind === kind));
ok('postfix exposes independent immutable source, token, and phase progression', postfixEvents.length === 71 && postfixEvents.every(event => Object.isFrozen(event.frame.iteration) && Object.isFrozen(event.frame.execution) && event.frame.execution.operationId) && new Set(postfixEvents.map(event => event.source.line)).size === 11);
const postfixExpectedPushes = [[0, '5', 0], [1, '2', 1], [3, '3', 1]];
postfixExpectedPushes.forEach(([token, value, before]) => {
  const phases = postfixPhases(token, 4);
  ok(`postfix token ${token + 1} stages, moves, commits, then marks processed`, phases.length === 4 && phases[0].frame.execution.staged && phases[0].frame.execution.item.value === value && phases[1].frame.execution.pendingPush && phases[1].frame.array.length === before && phases[2].frame.array.length === before + 1 && phases[2].frame.iteration.processed === token && phases[3].frame.iteration.processed === token + 1);
});
[[2, '2', '5', '7'], [4, '3', '7', '21']].forEach(([token, right, left, result]) => {
  for (const [line, destination, value, size] of [[6, 'right', right, 1], [7, 'left', left, 0]]) {
    const phases = postfixPhases(token, line);
    ok(`postfix token ${token + 1} ${destination} pop has distinct remove and assign phases`, phases.length === 4 && phases[0].frame.array.length === size + 1 && phases[0].frame.runtime[destination].status === 'unassigned' && phases[1].frame.array.length === size && phases[1].frame.runtime[destination].status === 'receiving' && phases[1].frame.markers.variables[destination] === undefined && phases[2].frame.runtime[destination].status === 'assigned' && phases[2].frame.runtime[destination].value === value);
  }
  const apply = postfixPhases(token, 8, 'apply'), push = postfixPhases(token, 8, 'push');
  ok(`postfix token ${token + 1} applies before a separate push on the same source line`, apply.length === 4 && push.length === 4 && apply[0].frame.execution.operationId !== push[0].frame.execution.operationId && apply.every(event => event.frame.array.length === 0) && apply[1].frame.runtime.result.status === 'unassigned' && apply[2].frame.runtime.result.value === result && apply[3].frame.execution.staged && push[1].frame.array.length === 0 && push[2].frame.array.join() === result);
  ok(`postfix token ${token + 1} preserves right-first operand order`, apply[0].frame.markers.variables.right === right && apply[0].frame.markers.variables.left === left && postfixEvents.indexOf(postfixPhases(token, 6)[0]) < postfixEvents.indexOf(postfixPhases(token, 7)[0]));
});
const postfixReturn = postfixEvents.filter(event => event.source.line === 11);
ok('postfix output is isolated until the return-to-output phase', postfixEvents.filter(event => event.source.line !== 11).every(event => event.frame.output.length === 0) && postfixReturn.length === 4 && postfixReturn[0].frame.array.join() === '21' && postfixReturn[1].frame.array.length === 0 && postfixReturn[1].frame.output.length === 0 && postfixReturn[2].frame.output.join() === '21' && postfixReturn[3].terminal);
const postfixController = Playback.createController();
postfixController.load(postfixEvents, 20);
postfixController.step(1);
postfixController.step(-1);
ok('postfix Previous restores the same token and pre-pop structure', postfixController.getState().currentEvent === postfixEvents[20] && postfixController.getState().currentEvent.frame.array.join() === '5,2');
postfixController.dispose();
const makePostfix = workspaceEngine.get('ITCC47LinearADTActivities').postfixProgram;
ok('postfix generator supports noncommutative examples without reversing operands', makePostfix(['9', '3', '-', '2', '÷']).result.value === 3);
ok('postfix scenario summary and source derive from the same token program', Activities.get('stack-postfix-evaluator').scenario.calculation === '(5 + 2) × 3 = 21' && makePostfix(['9', '3', '-']).source[1] === 'FOR each token IN [9, 3, -] DO' && makePostfix(['9', '3', '-']).scenario.calculation === '9 - 3 = 6');
ok('postfix duplicate numbers keep distinct entity identities', new Set(makePostfix(['2', '2', '+']).entities.map(item => item.id)).size === 3);
for (const invalid of [[], ['5', '+'], ['5', '2'], ['bad'], ['2', '0', '÷']]) {
  let rejected = false;
  try { makePostfix(invalid); } catch { rejected = true; }
  ok(`postfix generator rejects invalid expression ${JSON.stringify(invalid)}`, rejected);
}
ok('postfix resolver pops right before left', Activities.get('stack-postfix-evaluator').run().events.findIndex((event)=>event.frame.operation?.label === 'POP right') < Activities.get('stack-postfix-evaluator').run().events.findIndex((event)=>event.frame.operation?.label === 'POP left'));
const delimiterEvents = Activities.get('stack-delimiter-audit').run().events;
const delimiterPhases = (character, line, kind) => delimiterEvents.filter((event) => event.frame.iteration.index === character && event.source.line === line && (!kind || event.frame.execution.kind === kind));
ok('delimiter audit exposes independent immutable source, character, and phase progression', delimiterEvents.length === 41 && delimiterEvents.every((event) => Object.isFrozen(event.frame.iteration) && Object.isFrozen(event.frame.execution) && Object.isFrozen(event.frame.sourceCharacters) && event.frame.execution.operationId));
for (const [character, value, before] of [[0, '(', 0], [1, '[', 1], [2, '{', 2]]) {
  const phases = delimiterPhases(character, 4, 'push-opener');
  ok(`delimiter opener ${value} reads, classifies, moves, then commits`, phases.length === 4 && phases[0].frame.array.length === before && phases[1].frame.array.length === before && phases[1].frame.auxiliary.kind === 'incoming' && phases[2].frame.execution.pendingPush && phases[2].frame.array.length === before && phases[3].frame.array.length === before + 1 && phases[3].frame.iteration.processed === character + 1);
}
for (const [character, opener, closer, before, after] of [[3, '{', '}', 3, 2], [4, '[', ']', 2, 1], [5, '(', ')', 1, 0]]) {
  const check = delimiterPhases(character, 6, 'check-closer');
  const pop = delimiterPhases(character, 9, 'pop-matched');
  ok(`delimiter ${opener} ${closer} comparison completes before POP begins`, check.length === 4 && check.every((event) => event.frame.array.length === before) && check[1].frame.matching.match === null && check[2].frame.matching.match === true && pop.length === 4 && pop[0].frame.array.length === before && pop[1].frame.array.length === after && pop[1].frame.auxiliary.status === 'Popped (matched)');
  ok(`delimiter ${opener} ${closer} resolves both source characters before advancing`, pop[2].frame.sourceCharacters.filter((item) => item.state === 'resolved').length === (character - 2) * 2 && pop[3].frame.iteration.processed === character + 1);
}
const delimiterFinal = delimiterEvents.filter((event) => event.source.line === 12);
ok('delimiter reports VALID only after final empty-stack evaluation', delimiterEvents.slice(0, -1).every((event) => event.frame.parser.status === 'RUNNING' && event.frame.output.length === 0) && delimiterFinal.length === 4 && delimiterFinal[2].frame.execution.emptyEvaluation === true && delimiterFinal[2].frame.parser.status === 'RUNNING' && delimiterFinal[3].frame.parser.status === 'VALID' && delimiterFinal[3].frame.output.join() === 'VALID');
const makeDelimiter = workspaceEngine.get('ITCC47LinearADTActivities').delimiterProgram;
const mismatchDelimiter = makeDelimiter(['(', '[', '}', ']', ')']).steps;
const mismatchCheck = mismatchDelimiter.filter((step) => step.line === 6);
ok('delimiter mismatch returns invalid without popping the unmatched opener', mismatchCheck.at(-1).matching.state === 'mismatch' && mismatchCheck.every((step) => step.lanes[0].order.length === 2) && mismatchDelimiter.at(-1).line === 7 && mismatchDelimiter.at(-1).lanes[0].order.length === 2 && mismatchDelimiter.at(-1).parser.failureKind === 'mismatch');
const emptyCloserDelimiter = makeDelimiter([')']).steps;
ok('delimiter empty-stack closer is distinct from a top mismatch', emptyCloserDelimiter.some((step) => step.matching?.kind === 'empty-stack' && step.matching.state === 'empty-stack') && emptyCloserDelimiter.at(-1).parser.failureKind === 'empty-stack');
const unclosedDelimiter = makeDelimiter(['(', '[', '{', '}']).steps;
ok('delimiter unmatched openers fail only during final validation', unclosedDelimiter.slice(0, -1).every((step) => step.parser.status === 'RUNNING') && unclosedDelimiter.at(-1).line === 12 && unclosedDelimiter.at(-1).parser.status === 'INVALID' && unclosedDelimiter.at(-1).parser.emptyEvaluation === false && unclosedDelimiter.at(-1).lanes[0].order.length === 2);
for (const invalid of [['x'], ['()'], ['<'], ['']]) {
  let rejected = false;
  try { makeDelimiter(invalid); } catch { rejected = true; }
  ok(`delimiter generator rejects invalid source ${JSON.stringify(invalid)}`, rejected);
}
ok('delimiter audit accepts only after the stack empties', delimiterEvents.at(-1).frame.array.length === 0 && Activities.get('stack-delimiter-audit').run().result.valid);
const undoRedoActivity = Activities.get('stack-editor-undo');
const undoRedoEvents = undoRedoActivity.run().events;
const undoRedoPhases = (line) => undoRedoEvents.filter((event) => event.source.line === line);
const historyValues = (event, lane) => event.frame.lanes.find((item) => item.id === lane).items.map((item) => item.value);
ok('undo redo reuses immutable line and phase snapshots', undoRedoActivity.workspaceComposition === 'undo-redo-execution' && undoRedoEvents.length === 30 && undoRedoEvents.every((event) => Object.isFrozen(event.frame.execution) && Object.isFrozen(event.frame.undoRedo)));
ok('undo redo owns four phases for every command lifecycle operation', [3,4,5,6,7,8,9].every((line) => undoRedoPhases(line).length === 4 && undoRedoPhases(line).every((event, index) => event.frame.execution.phaseIndex === index && event.frame.execution.phaseCount === 4)));
const popUndo = undoRedoPhases(3);
ok('POP Undo removes Type B before placing it in command without touching the document', historyValues(popUndo[0], 'undo').join() === 'Type A,Type B' && popUndo[0].frame.undoRedo.command === null && popUndo[0].frame.undoRedo.document.value === 'AB' && historyValues(popUndo[1], 'undo').join() === 'Type A' && popUndo[1].frame.undoRedo.transit.value === 'Type B' && popUndo[1].frame.undoRedo.commandLocation === 'IN_TRANSIT' && popUndo[2].frame.undoRedo.command.value === 'Type B' && popUndo.every((event) => event.frame.undoRedo.document.value === 'AB'));
const applyInverse = undoRedoPhases(4);
ok('APPLY inverse is the only Undo operation that commits AB to A', applyInverse.slice(0, 3).every((event) => event.frame.undoRedo.document.value === 'AB' && event.frame.undoRedo.command.value === 'Type B') && applyInverse[2].frame.undoRedo.document.change.status === 'APPLYING' && applyInverse[3].frame.undoRedo.document.value === 'A' && applyInverse[3].frame.undoRedo.document.change.kind === 'REMOVE_CHARACTER');
const pushRedo = undoRedoPhases(5);
ok('PUSH Redo moves the same command identity and never changes document A', pushRedo[0].frame.undoRedo.command.id === 'cmd-b' && pushRedo[1].frame.undoRedo.transit.id === 'cmd-b' && pushRedo[1].frame.undoRedo.commandLocation === 'IN_TRANSIT' && historyValues(pushRedo[2], 'redo').join() === 'Type B' && pushRedo[3].frame.undoRedo.command === null && pushRedo.every((event) => event.frame.undoRedo.document.value === 'A'));
const popRedo = undoRedoPhases(6);
ok('POP Redo transfers Type B into command while document stays A', historyValues(popRedo[0], 'redo').join() === 'Type B' && popRedo[1].frame.undoRedo.transit.id === 'cmd-b' && historyValues(popRedo[1], 'redo').length === 0 && popRedo[2].frame.undoRedo.command.id === 'cmd-b' && popRedo.every((event) => event.frame.undoRedo.document.value === 'A'));
const applyCommand = undoRedoPhases(7);
ok('APPLY command commits A to AB while Type B remains held', applyCommand.slice(0, 3).every((event) => event.frame.undoRedo.document.value === 'A' && event.frame.undoRedo.command.id === 'cmd-b') && applyCommand[3].frame.undoRedo.document.value === 'AB' && applyCommand[3].frame.undoRedo.document.change.kind === 'INSERT_CHARACTER' && applyCommand[3].frame.undoRedo.command.id === 'cmd-b');
const pushUndo = undoRedoPhases(8);
ok('PUSH Undo restores final histories without mutating AB', pushUndo[1].frame.undoRedo.transit.id === 'cmd-b' && pushUndo[2].frame.undoRedo.command === null && historyValues(pushUndo[3], 'undo').join() === 'Type A,Type B' && historyValues(pushUndo[3], 'redo').length === 0 && pushUndo.every((event) => event.frame.undoRedo.document.value === 'AB'));
const returnDocument = undoRedoPhases(9);
ok('RETURN keeps live document separate from program output', returnDocument.every((event) => event.frame.undoRedo.document.value === 'AB') && returnDocument.slice(0, 2).every((event) => event.frame.output.length === 0) && returnDocument[1].frame.undoRedo.returnValue === 'AB' && returnDocument[2].frame.output.join() === 'AB' && returnDocument[3].terminal);
ok('Type B has exactly one modeled location in every undo redo snapshot', undoRedoEvents.every((event) => {
  const state = event.frame.undoRedo;
  const locations = [historyValues(event, 'undo').includes('Type B'), historyValues(event, 'redo').includes('Type B'), state.command?.id === 'cmd-b', state.transit?.id === 'cmd-b'];
  return locations.filter(Boolean).length === 1;
}));
ok('only APPLY lines mutate the document', undoRedoEvents.every((event, index) => index === 0 || event.frame.undoRedo.document.value === undoRedoEvents[index - 1].frame.undoRedo.document.value || [4,7].includes(event.source.line)));
const undoRedoController = Playback.createController();
undoRedoController.load(undoRedoEvents, 3);
undoRedoController.step(1);
undoRedoController.step(-1);
ok('undo redo Previous restores stack command document and transfer metadata', undoRedoController.getState().currentEvent === undoRedoEvents[3] && historyValues(undoRedoController.getState().currentEvent, 'undo').join() === 'Type A' && undoRedoController.getState().currentEvent.frame.undoRedo.transit.id === 'cmd-b' && undoRedoController.getState().currentEvent.frame.undoRedo.document.value === 'AB');
undoRedoController.dispose();
const queueActivity = Activities.get('queue-fifo-basics');
const queueEvents = queueActivity.run().events;
const queuePhases = (line) => queueEvents.filter((event) => event.source.line === line);
const queueSlotValues = (event) => event.frame.queue.slots.map((slot) => slot.item?.value || null);
ok('queue foundations expands nine lines into thirty-five immutable phase snapshots', queueActivity.workspaceComposition === 'queue-execution' && queueEvents.length === 35 && queueEvents.every((event) => Object.isFrozen(event.frame.execution) && Object.isFrozen(event.frame.queue) && Object.isFrozen(event.frame.queue.slots)));
ok('queue source lines own operation-specific phase counts', [1,2,3,4,5,7,8,9].every((line) => queuePhases(line).length === 4) && queuePhases(6).length === 3 && queueEvents.every((event) => event.frame.execution.phaseIndex < event.frame.execution.phaseCount));
ok('physical queue slots keep stable index identity in every snapshot', queueEvents.every((event) => event.frame.queue.slots.length === 3 && event.frame.queue.slots.every((slot, index) => slot.index === index)));
for (const [line, value, before, after, front, back, size] of [
  [3, 'A', ',,', 'A,,', 0, 0, 1],
  [4, 'B', 'A,,', 'A,B,', 0, 1, 2],
  [5, 'C', 'A,B,', 'A,B,C', 0, 2, 3],
]) {
  const phases = queuePhases(line);
  ok(`queue line ${line} stages ${value} outside fixed slots before atomic commit`, phases.slice(0, 3).every((event) => queueSlotValues(event).join() === before) && phases[0].frame.queue.pending.item.value === value && phases[2].frame.queue.pending.destinationIndex === line - 3 && phases[2].frame.queue.transition.kind === 'ENQUEUE_MOVE' && queueSlotValues(phases[3]).join() === after && phases[3].frame.queue.front === front && phases[3].frame.queue.back === back && phases[3].frame.queue.size === size);
}
const frontPhases = queuePhases(6);
ok('FRONT copies A into next without changing circular storage or metadata', frontPhases.every((event) => queueSlotValues(event).join() === 'A,B,C' && event.frame.queue.front === 0 && event.frame.queue.back === 2 && event.frame.queue.size === 3) && frontPhases[0].frame.queue.runtime.next === null && frontPhases[1].frame.queue.transition.kind === 'FRONT_COPY' && frontPhases[1].frame.queue.runtime.next === 'A' && frontPhases[2].frame.queue.runtime.next === 'A');
const dequeuePhases = queuePhases(7);
ok('DEQUEUE shows A in transit before clearing physical slot 0 at commit', dequeuePhases.slice(0, 3).every((event) => queueSlotValues(event).join() === 'A,B,C' && event.frame.queue.front === 0 && event.frame.queue.size === 3) && dequeuePhases[1].frame.queue.transition.kind === 'DEQUEUE_MOVE' && dequeuePhases[1].frame.queue.pending.runtimeDestination === 'served' && dequeuePhases[2].frame.queue.runtime.served === 'A' && queueSlotValues(dequeuePhases[3]).join() === ',B,C' && dequeuePhases[3].frame.queue.front === 1 && dequeuePhases[3].frame.queue.back === 2 && dequeuePhases[3].frame.queue.size === 2);
const wrapPhases = queuePhases(8);
ok('wraparound computes index 0 before committing D to physical slot 0', wrapPhases.slice(0, 3).every((event) => queueSlotValues(event).join() === ',B,C') && wrapPhases[1].frame.queue.pending.formula === '(2 + 1) MOD 3 = 0' && wrapPhases[2].frame.queue.transition.kind === 'WRAP_ENQUEUE' && wrapPhases[2].frame.queue.transition.destinationIndex === 0 && queueSlotValues(wrapPhases[3]).join() === 'D,B,C' && wrapPhases[3].frame.queue.front === 1 && wrapPhases[3].frame.queue.back === 0 && wrapPhases[3].frame.queue.size === 3);
ok('logical FIFO order is derived from circular storage rather than physical index order', queueEvents.every((event) => {
  const state = event.frame.queue;
  const derived = Array.from({ length: state.size }, (_, offset) => state.slots[(state.front + offset) % state.capacity].item.value);
  return derived.join() === state.logicalOrder.join();
}) && wrapPhases[3].frame.queue.logicalOrder.join() === 'B,C,D');
const returnQueue = queuePhases(9);
ok('runtime values remain separate from RETURN output', queueEvents.filter((event) => event.source.line < 9).every((event) => event.frame.output.length === 0) && returnQueue.every((event) => event.frame.queue.runtime.next === 'A' && event.frame.queue.runtime.served === 'A') && returnQueue[1].frame.queue.returnValue.join() === 'B,C,D' && returnQueue[1].frame.output.length === 0 && returnQueue[2].frame.output.join() === 'B,C,D' && returnQueue[3].terminal);
ok('only enqueue and dequeue commit phases mutate physical slots', queueEvents.every((event, index) => index === 0 || queueSlotValues(event).join() === queueSlotValues(queueEvents[index - 1]).join() || (event.frame.execution.complete && [3,4,5,7,8].includes(event.source.line))));
const queueController = Playback.createController();
queueController.load(queueEvents, 24);
queueController.step(1);
queueController.step(-1);
ok('queue Previous restores slots pointers runtime output phase and transition state', queueController.getState().currentEvent === queueEvents[24] && queueSlotValues(queueController.getState().currentEvent).join() === 'A,B,C' && queueController.getState().currentEvent.frame.queue.front === 0 && queueController.getState().currentEvent.frame.queue.runtime.served === null && queueController.getState().currentEvent.frame.queue.transition.kind === 'DEQUEUE_MOVE');
queueController.dispose();
ok('queue basics visibly enforce FIFO', queueActivity.run().result.served === 'A' && queueActivity.run().result.logicalOrder.join() === 'B,C,D');
ok('queue basics demonstrates circular wraparound', queueEvents.some((event)=>event.frame.queue.transition?.kind === 'WRAP_ENQUEUE'));
ok('deque foundation uses both removal ends', Activities.get('deque-end-operations').run().result.remaining.join(',') === 'A');
ok('monotonic deque returns both window maxima', Activities.get('deque-sliding-window').run().result.maxima.join(',') === '12,12');
const materialsPage = fs.readFileSync(path.join(ROOT,'student-materials.html'),'utf8');
ok('former materials route is a metadata-free practice redirect', /problems\.html/.test(materialsPage) && !/curriculum\.data|student-bundles|laborator|project/i.test(materialsPage));
ok('offline delivery excludes bundle metadata and downloads', !listed.some((asset)=>/student-bundles|student-materials\.js/.test(asset)) && !swSource.includes('student-bundles/'));
const buildCurriculum = require('./build-curriculum.js');
const rawCurriculum = JSON.parse(fs.readFileSync(path.join(ROOT,'curriculum.public.json'),'utf8'));
const validatedCurriculum = buildCurriculum.validate(rawCurriculum);
let draftReleaseRejected = false;
try { buildCurriculum.validateRelease(validatedCurriculum,{...ReleaseProfile,currentCheckpointId:'m5-recursion'}); } catch (error) { draftReleaseRejected = /draft checkpoint/.test(error.message); }
ok('release readiness rejects profiles that advance into draft work', draftReleaseRejected);
vm.runInContext(fs.readFileSync(path.join(ROOT,'future-problems.js'),'utf8'),curriculumEngine.ctx);
const FutureProblems = curriculumEngine.get('ITCC47FutureProblems');
ok('only Modules 5-8 remain in the future problem catalog', [5,6,7,8].every((module)=>FutureProblems.problems.filter((problem)=>problem.module === `Module ${module}`).length === 4) && FutureProblems.problems.every((problem)=>![2,3,4].includes(Number(problem.module.replace('Module ','')))));
ok('future problem metadata matches the curriculum resolver', FutureProblems.problems.every((problem)=>problem.checkpointId === Curriculum.getResource('problem',problem.id)?.checkpointId && problem.cloIds.length && problem.visibleTests.length >= 2));
const invalidFutureStarters = FutureProblems.problems.filter((problem)=>!parses(problem.starter)).map((problem)=>problem.id);
ok('every future problem starter parses', invalidFutureStarters.length === 0, invalidFutureStarters.join(', '));

const lessonPage = fs.readFileSync(path.join(ROOT,'lesson.html'),'utf8');
const companionEngine = load(['checkpoint-companions.js']);
const Companions = companionEngine.get('ITCC47CheckpointCompanions');
const linkedFoundationCompanion = Companions.get('m3-linked-foundations');
ok('lesson route loads the governed optional companion layer', /checkpoint-companions\.js/.test(lessonPage) && /lesson-app\.js/.test(lessonPage) && /curriculum\.data\.js/.test(lessonPage));
ok('only linked foundations opts into the restored companion layer', Companions.checkpointIds.join(',') === 'm3-linked-foundations' && Companions.validate().length === 0);
ok('linked foundations companion is deeply frozen and complete', Object.isFrozen(linkedFoundationCompanion) && Object.isFrozen(linkedFoundationCompanion.referenceProgression) && Object.isFrozen(linkedFoundationCompanion.referenceProgression.items) && linkedFoundationCompanion.vocabulary.length === 4 && linkedFoundationCompanion.invariants.length === 5 && linkedFoundationCompanion.misconceptions.length === 4);
ok('linked foundations companion teaches the reference progression and practical Python choice', linkedFoundationCompanion.thesis === 'DATA + REFERENCES = STRUCTURE' && linkedFoundationCompanion.referenceProgression.items.map((item)=>item.structure).join(',') === 'Array,Linked list,Tree,Graph' && linkedFoundationCompanion.codeComparison.lines.join(',') === 'recent.remove(document),recent.insert(0, document)');
const tracerSource = fs.readFileSync(path.join(ROOT,'tracer-app.js'),'utf8');
ok('conceptual Recent Documents source is excluded from the singly linked tracer handoff', recentComparisonActivity.traceHandoff === false && tracerSource.includes('activity.traceHandoff === false'));
ok('released practice counts are Module 1: 11, Module 2: 10, Module 3: 6, Module 4: 6', [1,2,3,4].map((module)=>PROBLEMS.filter((problem)=>problem.module === `Module ${module}`).length).join(',') === '11,10,6,6');
ok('released practice contracts are versioned and reviewed', PROBLEMS.filter((problem)=>['Module 1','Module 2','Module 3','Module 4'].includes(problem.module)).every((problem)=>problem.contentVersion && problem.reviewStatus === 'reviewed' && problem.visibleTests.length >= 2 && problem.hidden.length >= 2));
const practiceSource = fs.readFileSync(path.join(ROOT,'problems-app.js'),'utf8');
ok('practice records are content-version aware with recoverable drafts', practiceSource.includes("itcc47.practice-records:v2") && practiceSource.includes('contentVersion') && practiceSource.includes('recovery'));

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
