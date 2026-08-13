/* Guided worst-case recurrence analysis for ITCC47 recursive pseudocode. */
(function attachRecurrence(global) {
  'use strict';

  const ENGINE_VERSION = '1.0.0';
  const CONTRACT_VERSION = '1.0.0';

  function programFunctions(program) { return program && program.type === 'Program' ? program.functions || [] : []; }
  function findFunction(program, name) { return programFunctions(program).find((fn) => fn.name === name) || null; }

  function walkStatements(block, visit, context) {
    (block || []).forEach((stmt) => {
      const next = { ...context, statement: stmt };
      visit(stmt, next);
      if (stmt.block) walkStatements(stmt.block, visit, stmt.type === 'For' ? { ...next, loops: [...(context.loops || []), stmt] } : next);
      if (stmt.branches) stmt.branches.forEach((branch, branchIndex) =>
        walkStatements(branch.block, visit, { ...next, branchLine: stmt.line, branchIndex }));
      if (stmt.cases) stmt.cases.forEach((item, branchIndex) =>
        walkStatements(item.block, visit, { ...next, branchLine: stmt.line, branchIndex }));
      if (stmt.defaultBlock) walkStatements(stmt.defaultBlock, visit, { ...next, branchLine: stmt.line, branchIndex: stmt.cases.length });
    });
  }

  function identifiers(node, out = new Set()) {
    if (!node) return out;
    if (node.type === 'Ident') out.add(node.name);
    ['left', 'right', 'expr', 'target', 'index', 'argument'].forEach((key) => identifiers(node[key], out));
    (node.items || []).forEach((item) => identifiers(item, out));
    return out;
  }

  function suggestMeasures(program, functionName) {
    const fn = findFunction(program, functionName);
    if (!fn) return [];
    const suggestions = [];
    const add = (id, label, expression, params, reason) => {
      if (!suggestions.some((item) => item.id === id)) suggestions.push({ id, label, expression, params, reason });
    };
    const pairs = [['high', 'low'], ['right', 'left']];
    pairs.forEach(([upper, lower]) => {
      if (fn.params.includes(upper) && fn.params.includes(lower)) {
        const plusOne = upper === 'right';
        add(`${upper}-${lower}${plusOne ? '+1' : ''}`, `${upper} − ${lower}${plusOne ? ' + 1' : ''}`,
          `${upper} − ${lower}${plusOne ? ' + 1' : ''}`, [upper, lower], 'The interval endpoints define the active problem size.');
      }
    });
    fn.params.forEach((param) => add(param, param, param, [param], `Parameter ${param} may represent the shrinking input size.`));
    return suggestions;
  }

  function recursiveCalls(program, fn) {
    const calls = [];
    walkStatements(fn.block, (stmt, context) => {
      if (stmt.type === 'Call') calls.push({ stmt, context, self: stmt.name === fn.name });
    }, { loops: [] });
    return calls;
  }

  function sameBranchAlternatives(calls) {
    const grouped = new Map();
    calls.forEach((call) => {
      if (call.context.branchLine === undefined) return;
      const key = call.context.branchLine;
      if (!grouped.has(key)) grouped.set(key, new Set());
      grouped.get(key).add(call.context.branchIndex);
    });
    return [...grouped].filter(([, branches]) => branches.size > 1).map(([line, branches]) => ({ line, branches: [...branches] }));
  }

  function text(node) { return typeof exprToText === 'function' ? exprToText(node) : '?'; }
  function normalize(value) { return String(value).replace(/\s+/g, '').toLowerCase(); }

  function transformFor(call, fn, measure) {
    const args = Object.fromEntries(fn.params.map((param, index) => [param, call.stmt.args[index]]));
    if (measure.params.length === 1) {
      const param = measure.params[0];
      const expression = normalize(text(args[param]));
      if (new RegExp(`^${param}(?:/|div)2$`, 'i').test(expression) || expression.includes(`${param}/2`)) return 'half';
      if (expression === `${param}-1`) return 'minus-one';
      if (expression === `${param}-2`) return 'minus-two';
      return expression === param.toLowerCase() ? 'same' : 'unknown';
    }
    const [upper, lower] = measure.params;
    const upperText = normalize(text(args[upper]));
    const lowerText = normalize(text(args[lower]));
    if ((upperText.includes('mid') && lowerText === lower) || (lowerText.includes('mid') && upperText === upper)) return 'half';
    return 'unknown';
  }

  function functionGraph(program) {
    const graph = new Map();
    programFunctions(program).forEach((fn) => {
      const targets = new Set();
      walkStatements(fn.block, (stmt) => { if (stmt.type === 'Call') targets.add(stmt.name); }, { loops: [] });
      graph.set(fn.name, targets);
    });
    return graph;
  }

  function hasMutualRecursion(program, start) {
    const graph = functionGraph(program);
    const path = [];
    function search(name) {
      if (path.includes(name)) return name === start && path.length > 1;
      path.push(name);
      const found = [...(graph.get(name) || [])].some(search);
      path.pop();
      return found;
    }
    return search(start);
  }

  function result(spec) {
    return Object.freeze({ contractVersion: CONTRACT_VERSION, engineVersion: ENGINE_VERSION,
      functionName: spec.functionName, measure: spec.measure, recurrence: spec.recurrence || null,
      family: spec.family || null, bigO: spec.bigO || null, tightTheta: spec.tightTheta || null,
      depth: spec.depth || null, stackSpace: spec.stackSpace || null,
      derivation: Object.freeze(spec.derivation || []), assumptions: Object.freeze(spec.assumptions || []),
      diagnostics: Object.freeze(spec.diagnostics || []), requiredAssumptions: Object.freeze(spec.requiredAssumptions || []),
      confidence: spec.confidence || 'unsupported', auxiliarySpaceNote: 'Non-stack auxiliary storage is not inferred.',
    });
  }

  function analyse(options) {
    const program = options.program;
    const fn = findFunction(program, options.functionName);
    if (!fn) return result({ functionName: options.functionName, diagnostics: [{ code: 'E_RECURRENCE_FUNCTION', message: 'Choose a defined function.' }] });
    const measures = suggestMeasures(program, fn.name);
    const measure = measures.find((item) => item.id === options.measure);
    if (!measure) return result({ functionName: fn.name, requiredAssumptions: [{ kind: 'size-measure', candidates: measures }],
      diagnostics: [{ code: 'W_RECURRENCE_MEASURE', message: 'Confirm the size measure before deriving a recurrence.' }] });
    if (hasMutualRecursion(program, fn.name)) return result({ functionName: fn.name, measure,
      diagnostics: [{ code: 'W_MUTUAL_RECURRENCE', message: 'Mutual recursion can execute, but symbolic recurrence solving is not supported in this release.' }] });

    const allCalls = recursiveCalls(program, fn);
    const selfCalls = allCalls.filter((call) => call.self);
    if (!selfCalls.length) return result({ functionName: fn.name, measure,
      diagnostics: [{ code: 'W_NOT_RECURSIVE', message: `${fn.name} does not call itself.` }] });
    const alternatives = sameBranchAlternatives(selfCalls);
    const branchAssumptions = [];
    if (alternatives.length && !options.branchSelection) {
      return result({ functionName: fn.name, measure, requiredAssumptions: alternatives.map((item) => ({
        kind: 'worst-case-branch', line: item.line, candidates: item.branches.map((branch) => ({ value: `${item.line}:${branch}`, label: `Branch ${branch + 1}` })),
      })), diagnostics: [{ code: 'W_RECURRENCE_BRANCH', message: 'Choose the visible worst-case recursive branch.' }] });
    }
    let effectiveCalls = selfCalls;
    if (alternatives.length && options.branchSelection) {
      const [line, branch] = String(options.branchSelection).split(':').map(Number);
      effectiveCalls = selfCalls.filter((call) => call.context.branchLine !== line || call.context.branchIndex === branch);
      branchAssumptions.push({ kind: 'worst-case-branch', value: options.branchSelection });
    }

    const transforms = effectiveCalls.map((call) => transformFor(call, fn, measure));
    const insideMeasureLoop = effectiveCalls.some((call) => (call.context.loops || []).some((loop) => {
      const used = new Set([...identifiers(loop.start), ...identifiers(loop.end)]);
      return measure.params.some((param) => used.has(param));
    }));
    const combine = options.combineBound || 'constant';
    const assumptions = [{ kind: 'size-measure', value: measure.expression }, ...branchAssumptions,
      { kind: 'combine-bound', value: combine, supplied: true }];
    const uneven = measure.params.length > 1;
    const half = uneven ? '⌈n / 2⌉' : 'n / 2';
    let family; let recurrence; let bigO; let theta; let depth; let derivation;

    if (insideMeasureLoop && transforms.includes('minus-one')) {
      family = 'factorial-branching'; recurrence = `T(n) = nT(n − 1) + ${combine === 'linear' ? 'cn' : 'c'}`;
      bigO = 'O(n!)'; theta = 'Θ(n!)'; depth = 'O(n)';
      derivation = ['Each level creates up to n shrinking subproblems.', 'The product n × (n − 1) × … × 1 gives factorial growth.'];
    } else if (transforms.length === 1 && transforms[0] === 'half') {
      family = 'binary-halving'; recurrence = `T(n) = T(${half}) + ${combine === 'linear' ? 'cn' : 'c'}`;
      if (combine === 'linear') { bigO = 'O(n)'; theta = 'Θ(n)'; }
      else { bigO = 'O(log n)'; theta = 'Θ(log n)'; }
      depth = 'O(log n)';
      derivation = [`n → ${half} → ⌈n / 4⌉ → … → 1`, combine === 'linear' ? 'The geometric combine-work series is linear.' : 'One constant-cost level repeats log₂ n times.'];
    } else if (transforms.length === 2 && transforms.every((item) => item === 'half')) {
      family = 'divide-and-conquer'; recurrence = `T(n) = 2T(${half}) + ${combine === 'linear' ? 'cn' : 'c'}`;
      if (combine === 'linear') { bigO = 'O(n log n)'; theta = 'Θ(n log n)'; }
      else { bigO = 'O(n)'; theta = 'Θ(n)'; }
      depth = 'O(log n)';
      derivation = ['The recursion tree doubles its nodes while each problem halves.', combine === 'linear' ? 'Every level contributes cn across log₂ n levels.' : 'The leaves dominate with n total calls.'];
    } else if (transforms.length === 1 && transforms[0] === 'minus-one') {
      family = 'linear-recursion'; recurrence = `T(n) = T(n − 1) + ${combine === 'linear' ? 'cn' : 'c'}`;
      if (combine === 'linear') { bigO = 'O(n²)'; theta = 'Θ(n²)'; }
      else { bigO = 'O(n)'; theta = 'Θ(n)'; }
      depth = 'O(n)';
      derivation = ['n → n − 1 → n − 2 → … → 1', 'There are n recursive levels.'];
    } else if (transforms.length === 2 && transforms.includes('minus-one') && transforms.includes('minus-two')) {
      family = 'fibonacci'; recurrence = 'T(n) = T(n − 1) + T(n − 2) + c';
      bigO = 'O(2ⁿ)'; theta = 'Θ(φⁿ)'; depth = 'O(n)';
      derivation = ['The call tree branches into the previous two sizes.', 'Its call count follows the Fibonacci sequence; 2ⁿ is the familiar worst-case upper bound.'];
    } else if (transforms.length === 2 && transforms.every((item) => item === 'minus-one')) {
      family = 'binary-enumeration'; recurrence = 'T(n) = 2T(n − 1) + c';
      bigO = 'O(2ⁿ)'; theta = 'Θ(2ⁿ)'; depth = 'O(n)';
      derivation = ['Every level doubles the number of calls.', 'After n levels the tree has 2ⁿ leaves.'];
    } else {
      return result({ functionName: fn.name, measure, assumptions,
        diagnostics: [{ code: 'W_RECURRENCE_TRANSFORM', message: 'The recursive size transformation is outside the supported guided families.' }] });
    }

    return result({ functionName: fn.name, measure, recurrence, family, bigO, tightTheta: theta, depth,
      stackSpace: depth, derivation, assumptions, confidence: 'assumption-based' });
  }

  global.ITCC47Recurrence = Object.freeze({ ENGINE_VERSION, CONTRACT_VERSION, suggestMeasures, analyse, analyze: analyse });
})(typeof window !== 'undefined' ? window : globalThis);
