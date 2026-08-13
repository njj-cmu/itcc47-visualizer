/*
 * Operation counting and growth measurement.
 *
 * The per-line counts use the course's primitive-operation model (see costExpr
 * in interpreter.js). The Big-O label is MEASURED, not proved: the program is
 * re-run at a range of input sizes and the resulting T(n) series is fitted
 * against candidate growth curves. That is deliberate — an algorithm whose loop
 * bound never depends on n will be reported as constant because it genuinely
 * does not grow, which is exactly what a broken or fixed-bound loop looks like.
 */

const MAX_STEPS = 200000;

/** Drive the generator to completion, with a hard cap so a runaway loop cannot hang the page. */
function collectSteps(ast, inputs, maxSteps = MAX_STEPS) {
  const gen = runProgram(ast, inputs);
  const steps = [];
  let truncated = false;
  let error = null;
  let result = null;
  try {
    let r = gen.next();
    while (!r.done) {
      steps.push(r.value);
      if (steps.length >= maxSteps) { truncated = true; break; }
      r = gen.next();
    }
    if (r.done) result = r.value;
  } catch (e) {
    error = e;
  }
  const events = typeof ITCC47Playback === 'undefined' ? steps : steps.map((step, index) => ITCC47Playback.timelineEvent({
    id: `pseudocode:${index}`,
    domain: 'pseudocode',
    type: step.kind || 'exec',
    message: step.description,
    frame: Object.freeze({
      vars: step.vars,
      globals: step.globals,
      outputValue: step.outputValue,
      loopLine: step.loopLine,
      loopIterations: step.loopIterations,
      iteration: step.iteration,
      callStack: step.callStack,
      activeFrameId: step.activeFrameId,
      functionName: step.functionName,
      callSite: step.callSite,
      callDepth: step.callDepth,
      arguments: step.arguments,
      returnedValue: step.returnedValue,
      returnTarget: step.returnTarget,
    }),
    metrics: { cost: step.cost || 0, controlCost: step.controlCost || 0 },
    source: { line: step.line, code: step.code },
    terminal: step.kind === 'return' || step.kind === 'stop',
  }));
  return {
    steps: events,
    events,
    outcome: error ? 'error' : (truncated ? 'truncated' : 'complete'),
    result,
    diagnostics: error ? [{ code: error.code || 'E_RUNTIME', line: error.line || null, column: error.column || null,
      message: error.message || String(error), hint: error.hint || '' }] : [],
    truncated,
    error,
  };
}

// ---------- per-line counting ----------

function summarizeCounts(steps, sourceLines, includeControl) {
  const rows = new Map();

  steps.forEach((s) => {
    const unit = s.metrics.cost + (includeControl ? s.metrics.controlCost : 0);
    const line = s.source.line;
    if (!rows.has(line)) {
      rows.set(line, { line, code: (sourceLines[line - 1] || s.source.code || '').trim(), each: unit, times: 0, total: 0 });
    }
    const row = rows.get(line);
    // A FOR line yields an entry step and per-iteration steps with different
    // control costs; report the dominant per-execution figure but keep the
    // total exact.
    row.times += 1;
    row.total += unit;
    row.each = row.times > 0 ? row.total / row.times : unit;
    rows.set(line, row);
  });

  const list = [...rows.values()].sort((a, b) => a.line - b.line);
  const total = list.reduce((sum, r) => sum + r.total, 0);
  return { rows: list, total };
}

// ---------- loop diagnostics ----------

function loopDiagnostics(ast, steps, sourceLines) {
  const notes = [];
  const loopLines = [];

  (function findLoops(stmts) {
    stmts.forEach((s) => {
      if (s.type === 'For' || s.type === 'ForEach' || s.type === 'While') {
        loopLines.push({ line: s.line, type: s.type, text: s.text });
      }
      if (s.block) findLoops(s.block);
      if (s.branches) s.branches.forEach((b) => findLoops(b.block));
      if (s.cases) {
        s.cases.forEach((c) => findLoops(c.block));
        if (s.defaultBlock) findLoops(s.defaultBlock);
      }
    });
  })(ast && ast.type === 'Program' ? ast.body : ast);

  loopLines.forEach((loop) => {
    if (loop.type === 'While') {
      // A WHILE yields one step per condition check: n checks means n-1 body runs.
      const checks = steps.filter((s) => s.frame.loopLine === loop.line).length;
      if (Math.max(0, checks - 1) === 0) {
        notes.push({
          line: loop.line,
          severity: 'warning',
          message: 'This loop never ran — its condition was false the first time it was checked.',
        });
      }
      return;
    }
    // FOR / FOR EACH report their true body-execution count on the closing step.
    const finish = steps.find((s) => s.frame.loopLine === loop.line && s.frame.loopIterations !== undefined);
    if (finish && finish.frame.loopIterations === 0) {
      notes.push({
        line: loop.line,
        severity: 'warning',
        message: 'This loop never ran — check its start and end values.',
      });
    }
  });

  return { notes, loopLines };
}

// ---------- growth measurement ----------

/** Indices of READ statements, so the UI can offer "which input is n?". */
function findReadTargets(ast) {
  const found = [];
  (function walk(stmts) {
    stmts.forEach((s) => {
      if (s.type === 'Read') found.push({ line: s.line, name: s.target.text });
      if (s.block) walk(s.block);
      if (s.branches) s.branches.forEach((b) => walk(b.block));
      if (s.cases) {
        s.cases.forEach((c) => walk(c.block));
        if (s.defaultBlock) walk(s.defaultBlock);
      }
    });
  })(ast && ast.type === 'Program' ? ast.body : ast);
  return found;
}

/**
 * Re-run the program with one input position replaced by each sweep value.
 * Later READs reuse the remaining original inputs, cycling if the program asks
 * for more than were supplied.
 */
function sweep(ast, baseInputs, inputIndex, sizes, includeControl, sourceLines) {
  const points = [];
  const filler = baseInputs.filter((_, i) => i !== inputIndex);

  for (const n of sizes) {
    const inputs = [];
    const needed = Math.max(baseInputs.length, n + 2 + filler.length);
    for (let i = 0; i < needed; i++) {
      if (i === inputIndex) inputs.push(n);
      else if (i < baseInputs.length) inputs.push(baseInputs[i]);
      else if (filler.length) inputs.push(filler[(i - baseInputs.length) % filler.length]);
      else inputs.push(1);
    }

    const { steps, truncated, error } = collectSteps(ast, inputs, 60000);
    if (error) return { points, error: error.message || String(error) };
    const total = includeControl && typeof ITCC47Counting !== 'undefined'
      ? ITCC47Counting.analyse({
        ast,
        steps,
        sourceLines: sourceLines || [],
        inputs,
        model: 'full',
        inputName: (findReadTargets(ast)[inputIndex] || {}).name,
      }).actualTotal
      : steps.reduce((s, st) => s + st.metrics.cost, 0);
    points.push({ n, total, truncated });
    if (truncated) break;
  }
  return { points, error: null };
}

const GROWTH_MODELS = [
  { label: 'O(1)', f: () => 1 },
  { label: 'O(log n)', f: (n) => Math.log2(Math.max(n, 2)) },
  { label: 'O(n)', f: (n) => n },
  { label: 'O(n log n)', f: (n) => n * Math.log2(Math.max(n, 2)) },
  { label: 'O(n²)', f: (n) => n * n },
  { label: 'O(n³)', f: (n) => n * n * n },
  { label: 'O(2ⁿ)', f: (n) => Math.pow(2, Math.min(n, 40)) },
];

function fitModel(points, f) {
  const xs = points.map((p) => f(p.n));
  const ys = points.map((p) => p.total);
  const k = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const denom = k * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const a = (k * sxy - sx * sy) / denom;
  const b = (sy - a * sx) / k;
  const meanY = sy / k;
  const ssTot = ys.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((acc, y, i) => acc + (y - (a * xs[i] + b)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { a, b, r2 };
}

function classifyGrowth(points) {
  if (points.length < 3) {
    return { label: '—', detail: 'Not enough measurements. Increase the range of n.', flat: false };
  }

  const totals = points.map((p) => p.total);
  const allSame = totals.every((t) => t === totals[0]);
  if (allSame) {
    return {
      label: 'O(1)',
      detail: `The operation count stayed at ${totals[0]} for every n tested — the work does not depend on this input.`,
      flat: true,
    };
  }

  const results = GROWTH_MODELS
    .map((m) => ({ ...m, fit: fitModel(points, m.f) }))
    .filter((m) => m.fit && Number.isFinite(m.fit.r2));

  // Prefer the simplest model that explains the data almost perfectly.
  const good = results.find((m) => m.fit.r2 >= 0.9995 && m.fit.a > 0);
  const best = good || results.reduce((a, b) => (b.fit.r2 > a.fit.r2 ? b : a));

  const growthFactor = totals[totals.length - 1] / Math.max(totals[0], 1);
  return {
    label: best.label,
    detail: `Best fit across n = ${points[0].n}–${points[points.length - 1].n} (R² = ${best.fit.r2.toFixed(4)}). Operations grew ${growthFactor.toFixed(1)}× over that range.`,
    flat: false,
    r2: best.fit.r2,
  };
}
