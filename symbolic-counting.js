/*
 * Exact symbolic operation counting for the Pseudocode Tracer.
 *
 * This module deliberately has no DOM, storage, clock, network, or framework
 * dependencies. It analyses the interpreter AST and an optional completed
 * timeline, then returns a deterministic CountAnalysis object for either the
 * lecture model or the explicit full-control model.
 */

(function attachSymbolicCounting(global) {
  'use strict';

  const ENGINE_VERSION = '1.0.0';

  function poly(...coefficients) {
    const out = coefficients.slice();
    while (out.length > 1 && out[out.length - 1] === 0) out.pop();
    return out.length ? out : [0];
  }

  const constant = (value) => poly(Number(value));
  const variable = () => poly(0, 1);
  const degree = (value) => {
    for (let i = value.length - 1; i > 0; i--) if (value[i] !== 0) return i;
    return 0;
  };
  const add = (a, b) => {
    const size = Math.max(a.length, b.length);
    const out = Array(size).fill(0);
    for (let i = 0; i < size; i++) out[i] = (a[i] || 0) + (b[i] || 0);
    return poly(...out);
  };
  const scale = (a, amount) => poly(...a.map((value) => value * amount));
  const subtract = (a, b) => add(a, scale(b, -1));
  const multiply = (a, b) => {
    const out = Array(a.length + b.length - 1).fill(0);
    a.forEach((left, i) => b.forEach((right, j) => { out[i + j] += left * right; }));
    return poly(...out);
  };
  const evaluate = (value, n) => value.reduce((sum, coefficient, power) => sum + coefficient * (n ** power), 0);

  function powerText(power) {
    if (power === 1) return 'n';
    const superscripts = { 2: '²', 3: '³', 4: '⁴' };
    return `n${superscripts[power] || `^${power}`}`;
  }

  function formatPoly(value) {
    const parts = [];
    for (let power = value.length - 1; power >= 0; power--) {
      const coefficient = value[power] || 0;
      if (coefficient === 0) continue;
      const magnitude = Math.abs(coefficient);
      const term = power === 0
        ? String(magnitude)
        : `${magnitude === 1 ? '' : magnitude}${powerText(power)}`;
      if (parts.length === 0) parts.push(`${coefficient < 0 ? '-' : ''}${term}`);
      else parts.push(`${coefficient < 0 ? '−' : '+'} ${term}`);
    }
    return parts.join(' ') || '0';
  }

  function dominantTerm(value) {
    const power = degree(value);
    const coefficient = value[power] || 0;
    if (power === 0) return String(coefficient);
    return `${coefficient === 1 ? '' : coefficient === -1 ? '-' : coefficient}${powerText(power)}`;
  }

  function growthClass(value) {
    const power = degree(value);
    if (power === 0) return 'O(1)';
    return `O(${powerText(power)})`;
  }

  function expressionPoly(node, inputName, constants) {
    if (!node) return null;
    if (node.type === 'Number') return constant(node.value);
    if (node.type === 'Ident') {
      if (node.name === inputName) return variable();
      return constants.has(node.name) ? constant(constants.get(node.name)) : null;
    }
    if (node.type === 'Unary' && node.op === '-') {
      const child = expressionPoly(node.expr, inputName, constants);
      return child ? scale(child, -1) : null;
    }
    if (node.type !== 'Binary') return null;
    const left = expressionPoly(node.left, inputName, constants);
    const right = expressionPoly(node.right, inputName, constants);
    if (!left || !right) return null;
    if (node.op === '+') return add(left, right);
    if (node.op === '-') return subtract(left, right);
    if (node.op === '*') return multiply(left, right);
    return null;
  }

  function statementUnitCost(stmt) {
    if (stmt.type === 'Read') return 1 + costTarget(stmt.target);
    if (stmt.type === 'Write') return costExpr(stmt.expr) + 1;
    if (stmt.type === 'Assign') return costExpr(stmt.expr) + costTarget(stmt.target);
    if (stmt.type === 'Return') return stmt.expr ? costExpr(stmt.expr) : 0;
    return 0;
  }

  function findEndLine(sourceLines, loopLine, openPattern, closePattern) {
    let depth = 0;
    for (let index = loopLine - 1; index < sourceLines.length; index++) {
      const text = String(sourceLines[index] || '').replace(/#.*$/, '').trim().toUpperCase();
      if (openPattern.test(text)) depth++;
      if (closePattern.test(text)) {
        depth--;
        if (depth === 0) return index + 1;
      }
    }
    return loopLine;
  }

  function loopRuntime(steps, line) {
    const matching = (steps || []).filter((event) => event.frame && event.frame.loopLine === line);
    const finishes = matching.filter((event) => Number.isFinite(event.frame.loopIterations));
    return {
      invocations: finishes.length || matching.filter((event) => event.source && event.source.line === line && !event.frame.iteration).length,
      iterations: finishes.reduce((sum, event) => sum + event.frame.loopIterations, 0),
    };
  }

  function eventRows(steps, sourceLines) {
    const grouped = new Map();
    (steps || []).forEach((event) => {
      const unitCost = Number(event.metrics && event.metrics.cost) || 0;
      if (unitCost <= 0) return;
      const line = event.source.line;
      const key = `${line}:${unitCost}`;
      if (!grouped.has(key)) grouped.set(key, {
        id: `actual:${key}`,
        line,
        statement: String(sourceLines[line - 1] || event.source.code || '').trim(),
        kind: 'statement',
        unitCost,
        actualRuns: 0,
        actualContribution: 0,
        symbolicRuns: null,
        contribution: null,
        enclosingLoops: [],
        explanation: `This line executed ${unitCost === 1 ? 'one primitive operation' : `${unitCost} primitive operations`} each time.`,
        confidence: 'actual',
      });
      const row = grouped.get(key);
      row.actualRuns++;
      row.actualContribution += unitCost;
    });
    return [...grouped.values()].sort((a, b) => a.line - b.line || a.unitCost - b.unitCost);
  }

  function readTargets(ast) {
    const reads = [];
    (function walk(block) {
      block.forEach((stmt) => {
        if (stmt.type === 'Read' && stmt.target && stmt.target.index === null) reads.push({ name: stmt.target.name, line: stmt.line });
        if (stmt.block) walk(stmt.block);
        if (stmt.branches) stmt.branches.forEach((branch) => walk(branch.block));
        if (stmt.cases) stmt.cases.forEach((item) => walk(item.block));
        if (stmt.defaultBlock) walk(stmt.defaultBlock);
      });
    })(ast || []);
    return reads;
  }

  function analyse(options) {
    const ast = options.ast || [];
    const steps = options.steps || [];
    const sourceLines = options.sourceLines || [];
    const model = options.model === 'full' ? 'full' : 'lecture';
    const inputName = options.inputName || (readTargets(ast)[0] || {}).name || 'n';
    const inputSymbol = options.inputSymbol || 'n';
    const reads = readTargets(ast);
    const inputIndex = reads.findIndex((read) => read.name === inputName);
    const inputValue = inputIndex >= 0 && options.inputs ? Number(options.inputs[inputIndex]) : NaN;
    const rows = [];
    const loops = [];
    const diagnostics = [];
    const constants = new Map();
    let total = constant(0);
    let exact = true;

    function diagnostic(code, line, message, suggestion) {
      exact = false;
      diagnostics.push({ code, severity: 'warning', line, column: 1, message, suggestion });
    }

    function addRow(stmt, unitCost, runs, enclosingLoops, explanation, kind, suffix) {
      const contribution = runs ? scale(runs, unitCost) : null;
      const actual = eventRows(steps, sourceLines).filter((row) => row.line === stmt.line && row.unitCost === unitCost)
        .reduce((sum, row) => sum + row.actualRuns, 0);
      const row = {
        id: `${stmt.line}:${suffix || kind || stmt.type}`,
        line: stmt.line,
        statement: stmt.text || String(sourceLines[stmt.line - 1] || '').trim(),
        kind: kind || 'statement',
        unitCost,
        actualRuns: actual,
        actualContribution: actual * unitCost,
        symbolicRuns: runs ? formatPoly(runs) : null,
        contribution: contribution ? formatPoly(contribution) : null,
        enclosingLoops: enclosingLoops.map((loop) => ({ line: loop.line, endLine: loop.endLine })),
        explanation,
        confidence: runs ? 'exact' : 'unsupported',
        _runs: runs,
        _contribution: contribution,
      };
      rows.push(row);
      if (contribution) total = add(total, contribution);
      return row;
    }

    function addControlRow(stmt, label, unitCost, runs, actualRuns, enclosingLoops, explanation, suffix) {
      const contribution = scale(runs, unitCost);
      rows.push({
        id: `${stmt.line}:control:${suffix}`,
        line: stmt.line,
        statement: label,
        kind: 'loop-control',
        unitCost,
        actualRuns,
        actualContribution: actualRuns * unitCost,
        symbolicRuns: formatPoly(runs),
        contribution: formatPoly(contribution),
        enclosingLoops: enclosingLoops.map((loop) => ({ line: loop.line, endLine: loop.endLine })),
        explanation,
        confidence: 'exact',
        _runs: runs,
        _contribution: contribution,
      });
      total = add(total, contribution);
    }

    function walk(block, multiplier, enclosingLoops, localConstants, supported) {
      block.forEach((stmt) => {
        if (['Read', 'Write', 'Assign', 'Return'].includes(stmt.type)) {
          const unitCost = statementUnitCost(stmt);
          addRow(stmt, unitCost, supported ? multiplier : null, enclosingLoops,
            enclosingLoops.length
              ? `This line runs once per iteration of ${enclosingLoops.length === 1 ? 'its enclosing loop' : 'each enclosing loop'}.`
              : 'This straight-line statement runs once.', 'statement');
          if (stmt.type === 'Read' && stmt.target.index === null) {
            localConstants.delete(stmt.target.name);
          } else if (stmt.type === 'Assign' && stmt.target.index === null && degree(multiplier) === 0 && multiplier[0] === 1) {
            const value = expressionPoly(stmt.expr, inputName, localConstants);
            if (value && degree(value) === 0) localConstants.set(stmt.target.name, value[0]);
            else localConstants.delete(stmt.target.name);
          }
          if (stmt.type === 'Return') diagnostic('W_SYMBOLIC_EARLY_EXIT', stmt.line,
            'RETURN can stop later statements, so one formula cannot describe every path.',
            'Use Actual view for this run or analyse a single straight-line path separately.');
          return;
        }

        if (stmt.type === 'For') {
          const start = expressionPoly(stmt.start, inputName, localConstants);
          const end = expressionPoly(stmt.end, inputName, localConstants);
          let iterations = start && end ? add(subtract(end, start), constant(1)) : null;
          if (iterations && degree(iterations) === 0) iterations = constant(Math.max(0, iterations[0]));
          const affine = iterations && degree(iterations) <= 1 && iterations.every(Number.isFinite);
          const endLine = findEndLine(sourceLines, stmt.line, /^FOR\b/, /^ENDFOR\b/);
          const runtime = loopRuntime(steps, stmt.line);
          const loop = {
            line: stmt.line,
            endLine,
            kind: 'FOR',
            boundExpression: `${exprToText(stmt.start)} TO ${exprToText(stmt.end)}`,
            actualInvocations: runtime.invocations,
            actualIterations: runtime.iterations,
            symbolicIterations: affine ? formatPoly(iterations) : null,
            totalSymbolicIterations: affine ? formatPoly(multiply(multiplier, iterations)) : null,
            enclosingLoop: enclosingLoops.length ? enclosingLoops[enclosingLoops.length - 1].line : null,
            explanation: affine
              ? `The loop includes both endpoints: (${exprToText(stmt.end)} − ${exprToText(stmt.start)}) + 1 = ${formatPoly(iterations)} iteration${formatPoly(iterations) === '1' ? '' : 's'} per entry.`
              : 'The loop bound depends on a value this phase cannot safely express as an affine function of n.',
            confidence: affine ? 'exact' : 'unsupported',
          };
          loops.push(loop);

          if (!affine) {
            diagnostic('W_SYMBOLIC_LOOP_BOUND', stmt.line,
              `Cannot derive an exact iteration count for ${stmt.text}.`,
              'Use a constant bound, n, or a simple affine bound such as n − 1.');
            addRow(stmt, 0, null, enclosingLoops, loop.explanation, 'loop-header');
            walk(stmt.block, multiplier, enclosingLoops.concat(loop), new Map(localConstants), false);
            return;
          }

          const invocationRuns = multiplier;
          const bodyRuns = multiply(multiplier, iterations);
          if (model === 'lecture') {
            addRow(stmt, 0, invocationRuns, enclosingLoops,
              'Lecture mode charges no primitive operations to the FOR header. The body still inherits the exact iteration count.', 'loop-header');
          } else {
            const setupCost = costExpr(stmt.start) + costExpr(stmt.end) + 1;
            const conditionRuns = add(bodyRuns, invocationRuns);
            const incrementRuns = bodyRuns;
            addControlRow(stmt, `${stmt.text} — setup`, setupCost, invocationRuns, runtime.invocations, enclosingLoops,
              'Evaluate the start and end values, then initialize the loop variable.', 'setup');
            addControlRow(stmt, `${stmt.varName} ≤ end — condition`, 3, conditionRuns, runtime.iterations + runtime.invocations, enclosingLoops,
              'Read the loop variable, read the saved end value, and compare. The final failed check is included.', 'condition');
            addControlRow(stmt, `${stmt.varName} ← ${stmt.varName} + 1 — increment`, 4, incrementRuns, runtime.iterations, enclosingLoops,
              'Read the loop variable and 1, add them, then store the result.', 'increment');
          }

          const nestedConstants = new Map(localConstants);
          nestedConstants.delete(stmt.varName);
          walk(stmt.block, bodyRuns, enclosingLoops.concat(loop), nestedConstants, supported);

          if (Number.isFinite(inputValue)) {
            const expected = evaluate(bodyRuns, inputValue);
            if (Math.abs(expected - runtime.iterations) > 1e-9) diagnostic('W_SYMBOLIC_ACTUAL_MISMATCH', stmt.line,
              `The derived loop count (${expected}) does not match this run (${runtime.iterations}).`,
              'Check that n is mapped to the correct READ input and satisfies the loop bounds.');
          }
          return;
        }

        const unsupported = {
          If: ['W_SYMBOLIC_BRANCH', 'IF/ELSE chooses a path from runtime data.'],
          While: ['W_SYMBOLIC_WHILE', 'WHILE iteration counts depend on repeated runtime conditions.'],
          ForEach: ['W_SYMBOLIC_FOR_EACH', 'FOR EACH symbolic length analysis is not included in Phase 1.'],
          Case: ['W_SYMBOLIC_CASE', 'CASE chooses a path from runtime data.'],
          Break: ['W_SYMBOLIC_BREAK', 'BREAK changes a loop count from inside its body.'],
          Stop: ['W_SYMBOLIC_EARLY_EXIT', 'STOP prevents later statements from running.'],
        }[stmt.type];

        if (unsupported) {
          diagnostic(unsupported[0], stmt.line, unsupported[1], 'Use Actual view for this run; Phase 1 only proves straight-line code and supported FOR loops.');
          if (stmt.branches) stmt.branches.forEach((branch) => walk(branch.block, multiplier, enclosingLoops, new Map(localConstants), false));
          if (stmt.block) walk(stmt.block, multiplier, enclosingLoops, new Map(localConstants), false);
          if (stmt.cases) stmt.cases.forEach((item) => walk(item.block, multiplier, enclosingLoops, new Map(localConstants), false));
          if (stmt.defaultBlock) walk(stmt.defaultBlock, multiplier, enclosingLoops, new Map(localConstants), false);
        }
      });
    }

    walk(ast, constant(1), [], constants, true);

    const actualRows = eventRows(steps, sourceLines);
    if (model === 'full') {
      loops.filter((loop) => loop.kind === 'FOR' && loop.confidence === 'exact').forEach((loop) => {
        const stmtRows = rows.filter((row) => row.line === loop.line && row.kind === 'loop-control');
        stmtRows.forEach((row) => actualRows.push({ ...row, symbolicRuns: null, contribution: null, confidence: 'actual' }));
      });
      actualRows.sort((a, b) => a.line - b.line || String(a.id).localeCompare(String(b.id)));
    }
    const actualTotal = actualRows.reduce((sum, row) => sum + row.actualContribution, 0);
    const publicRows = rows.map(({ _runs, _contribution, ...row }) => row);
    const symbolicTotal = exact ? formatPoly(total) : null;

    return {
      engineVersion: ENGINE_VERSION,
      model,
      inputName,
      inputSymbol,
      actualInput: Number.isFinite(inputValue) ? inputValue : null,
      actualTotal,
      symbolicTotal,
      simplifiedTotal: symbolicTotal,
      dominantTerm: exact ? dominantTerm(total) : null,
      growthClass: exact ? growthClass(total) : null,
      confidence: exact ? 'exact' : 'unsupported',
      rows: publicRows,
      actualRows,
      loops,
      diagnostics,
    };
  }

  global.ITCC47Counting = Object.freeze({
    ENGINE_VERSION,
    analyse,
    analyze: analyse,
    expression: Object.freeze({
      constant,
      variable,
      add,
      subtract,
      multiply,
      evaluate,
      format: formatPoly,
      degree,
    }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
