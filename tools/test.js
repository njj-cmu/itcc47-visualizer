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
ok('run results expose events and legacy steps together', compatibleResult.schemaVersion === 2 && compatibleResult.events === compatibleResult.steps);
ok('run result capabilities are detected from events', compatibleResult.capabilities.visualize && compatibleResult.capabilities.trace && compatibleResult.capabilities.operations);

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
const insertionShift = ALGORITHMS.insertion.run([3, -1, 2]).find((event) => event.type === 'move');
ok('insertion shift events preserve held and displaced values for presentation', insertionShift.frame.highlight.transition.value === 3 && insertionShift.frame.highlight.held.value === -1 && insertionShift.frame.highlight.transition.displacedValue === -1);
ok('legacy array timeline items retain stable slot identities', ALGORITHMS.bubble.run([3, 1, 2]).every((event) => event.frame.items.every((item, index) => item.id === `slot:${index}`)));
const duplicateSwap = ALGORITHMS.bubble.run([2, 2, 1]).find((event) => event.type === 'swap');
ok('presentation identities remain deterministic with duplicate values', duplicateSwap.frame.presentation.entities.map((entity) => entity.id).join(',') === 'item:0,item:1,item:2' && new Set(duplicateSwap.frame.presentation.slots.filter(Boolean)).size === 3);
ok('swap metadata moves stable entities between slots', duplicateSwap.transition.kind === 'swap' && duplicateSwap.transition.moves.length === 2 && duplicateSwap.transition.wait);
const insertionEvents = ALGORITHMS.insertion.run([3, -1, 2]);
ok('insertion presentation keeps a single held entity and explicit hole', insertionEvents.some((event) => event.frame.presentation.held && event.frame.presentation.holes.length === 1) && insertionEvents.every((event) => new Set([...event.frame.presentation.slots.filter(Boolean), event.frame.presentation.held?.entityId].filter(Boolean)).size === 3));
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
ok('visual input uses one 18-value limit', appSource.includes('const MAX_VISUAL_VALUES = 18') && /parsed\.length > MAX_VISUAL_VALUES/.test(appSource));

const workspaceEngine = load(['interpreter.js', 'playback.js', 'complexity.js', 'algorithms.js', 'activity-catalog.js', 'visualizer-registry.js'], { setTimeout, clearTimeout });
const Activities = workspaceEngine.get('ITCC47Activities');
const Registry = workspaceEngine.get('ITCC47VisualizerRegistry');
ok('activity catalog is versioned', Activities.SCHEMA_VERSION === 1 && /^\d{4}\.\d{2}$/.test(Activities.CONTENT_VERSION));
['bubble-sort', 'selection-sort', 'insertion-sort', 'linear-search', 'binary-search', 'array-list-insert', 'array-list-remove', 'linked-list-traversal', 'linked-list-insert-head']
  .forEach((id) => ok(`activity catalog contains ${id}`, Activities.list().some((activity) => activity.id === id)));
const insertResultA = Activities.get('array-list-insert').run({ values: [18, 7, 31, 12], index: 2, value: 24 });
const insertResultB = Activities.get('array-list-insert').run({ values: [18, 7, 31, 12], index: 2, value: 24 });
ok('array-list insertion timeline is deterministic', JSON.stringify(insertResultA) === JSON.stringify(insertResultB));
ok('array-list insertion shifts before storing', insertResultA.events.map((event) => event.type).join(',') === 'state,move,move,insert' && insertResultA.events.at(-1).frame.array.join(',') === '18,7,24,31,12');
ok('array-list insertion move preserves its held value', insertResultA.events.find((event) => event.type === 'move').frame.highlight.held.value === 24);
ok('array-list insertion transitions shift then enter the stable new entity', insertResultA.events.filter((event) => event.transition).map((event) => event.transition.kind).join(',') === 'shift,shift,insert' && insertResultA.events.at(-1).transition.enter[0] === 'item:insert');
const removeResult = Activities.get('array-list-remove').run({ values: [18, 7, 31, 12], index: 1 });
ok('array-list removal closes the gap', removeResult.events.map((event) => event.type).join(',') === 'remove,move,move,complete' && removeResult.events.at(-1).frame.array.join(',') === '18,31,12');
ok('array-list removal begins with the exiting entity still in its slot', removeResult.events[0].frame.presentation.slots[1] === removeResult.events[0].transition.exit[0]);
ok('visualizer capabilities include all synchronized evidence', insertResultA.capabilities.visualize && insertResultA.capabilities.trace && insertResultA.capabilities.operations);
const linkedTraversalA = Activities.get('linked-list-traversal').run();
const linkedTraversalB = Activities.get('linked-list-traversal').run();
ok('linked-list traversal timeline is deterministic', JSON.stringify(linkedTraversalA) === JSON.stringify(linkedTraversalB));
ok('linked-list traversal follows every node to NULL', linkedTraversalA.outcome === 'complete' && linkedTraversalA.events.at(-1).frame.nodes.map((node) => node.value).join(',') === '18,7,31' && linkedTraversalA.events.at(-1).metrics.nodeVisits === 3);
const linkedInsert = Activities.get('linked-list-insert-head').run();
ok('head insertion preserves the old chain after the new node', linkedInsert.events.at(-1).frame.nodes.map((node) => node.value).join(',') === '24,18,7' && linkedInsert.events.at(-1).metrics.pointerWrites === 2);
ok('linked transitions preserve pointer and edge identities', linkedInsert.events.some((event) => event.transition?.moves?.some((move) => move.entityId === 'pointer:head')) && linkedInsert.events.some((event) => event.frame.links.every((link) => link.id === `edge:${link.from}->${link.to}`)));
ok('linked-list events use immutable V2 frames', Object.isFrozen(linkedInsert.events[0]) && Object.isFrozen(linkedInsert.events[0].frame) && linkedInsert.events.every((event, index) => event.id === `linked-list-insert-head:${index}`));
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
ok('visualizer registries report renderers and evidence views', Registry.rendererDomains().includes('test') && Registry.evidenceIds().includes('test-trace'));
ok('algorithm metrics remain separate from primitive-operation analysis', !fs.readFileSync(path.join(ROOT, 'visualizer-src', 'main.jsx'), 'utf8').includes('primitiveTotal +'));

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
