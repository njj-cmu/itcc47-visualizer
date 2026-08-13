/* UI wiring for the Pseudocode Tracer: preset loading, run/parse, playback, trace table. */

const tstate = {
  steps: [],
  stepIndex: 0,
  running: false,
  sourceLines: [],
  operationsView: 'actual',
  symbolsConfirmed: false,
  symbolSelection: {},
  symbolSignature: '',
  branchSelections: {},
  recurrenceConfirmed: false,
  recurrenceFunction: '',
  recurrenceMeasure: '',
  recurrenceBranch: '',
  recurrenceCombine: '',
  selectedFrameId: null,
};

const tels = {
  presetList: document.getElementById('preset-list'),
  inputsBox: document.getElementById('inputs-box'),
  speedSlider: document.getElementById('speed-slider'),
  statusLine: document.getElementById('status-line'),
  codeBox: document.getElementById('code-box'),
  codeView: document.getElementById('code-view'),
  errorBox: document.getElementById('error-box'),
  btnRun: document.getElementById('btn-run'),
  btnEdit: document.getElementById('btn-edit'),
  btnPlay: document.getElementById('btn-play'),
  btnStep: document.getElementById('btn-step'),
  stepSlider: document.getElementById('step-slider'),
  stepCounter: document.getElementById('step-counter'),
  varsBox: document.getElementById('vars-box'),
  callStackBox: document.getElementById('call-stack-box'),
  outputBox: document.getElementById('output-box'),
  traceBody: document.getElementById('trace-body'),
  tabTrace: document.getElementById('tab-trace'),
  tabOps: document.getElementById('tab-ops'),
  tabRecurrence: document.getElementById('tab-recurrence'),
  panelTrace: document.getElementById('panel-trace'),
  panelOps: document.getElementById('panel-ops'),
  panelRecurrence: document.getElementById('panel-recurrence'),
  recurrenceEmpty: document.getElementById('recurrence-empty'),
  recurrenceContent: document.getElementById('recurrence-content'),
  recurrenceFunctionSelect: document.getElementById('recurrence-function'),
  recurrenceMeasureSelect: document.getElementById('recurrence-measure'),
  btnConfirmRecurrence: document.getElementById('btn-confirm-recurrence'),
  recurrenceConfirmStatus: document.getElementById('recurrence-confirm-status'),
  recurrenceAssumptions: document.getElementById('recurrence-assumptions'),
  recurrenceResult: document.getElementById('recurrence-result'),
  recurrenceFormula: document.getElementById('recurrence-formula'),
  recurrenceConfidence: document.getElementById('recurrence-confidence'),
  recurrenceActualCalls: document.getElementById('recurrence-actual-calls'),
  recurrenceActualDepth: document.getElementById('recurrence-actual-depth'),
  recurrenceBigO: document.getElementById('recurrence-big-o'),
  recurrenceTheta: document.getElementById('recurrence-theta'),
  recurrenceSpace: document.getElementById('recurrence-space'),
  recurrenceDerivation: document.getElementById('recurrence-derivation'),
  recurrenceDiagnostics: document.getElementById('recurrence-diagnostics'),
  opsEmpty: document.getElementById('ops-empty'),
  opsContent: document.getElementById('ops-content'),
  opsTotal: document.getElementById('ops-total-value'),
  opsTotalLabel: document.getElementById('ops-total-label'),
  opsViewActual: document.getElementById('ops-view-actual'),
  opsViewSymbolic: document.getElementById('ops-view-symbolic'),
  opsDominant: document.getElementById('ops-dominant'),
  opsGrowth: document.getElementById('ops-growth'),
  opsTight: document.getElementById('ops-tight'),
  opsConfidence: document.getElementById('ops-confidence'),
  opsSymbolicFacts: document.getElementById('ops-symbolic-facts'),
  opsDomains: document.getElementById('ops-domains'),
  opsDiagnostics: document.getElementById('ops-diagnostics'),
  opsRunsHeading: document.getElementById('ops-runs-heading'),
  opsBody: document.getElementById('ops-body'),
  countModels: [...document.querySelectorAll('input[name="count-model"]')],
  loopNotes: document.getElementById('loop-notes'),
  symbolPicker: document.getElementById('ops-symbol-picker'),
  symbolOptions: document.getElementById('ops-symbol-options'),
  symbolStatus: document.getElementById('ops-symbol-status'),
  btnConfirmSymbols: document.getElementById('btn-confirm-symbols'),
  assumptions: document.getElementById('ops-assumptions'),
  derivation: document.getElementById('ops-derivation'),
  algebra: document.getElementById('ops-algebra'),
  expanded: document.getElementById('ops-expanded'),
  sweepInput: document.getElementById('sweep-input'),
  sweepMax: document.getElementById('sweep-max'),
  sweepMaxValue: document.getElementById('sweep-max-value'),
  btnMeasure: document.getElementById('btn-measure'),
  growthResult: document.getElementById('growth-result'),
  growthLabel: document.getElementById('growth-label'),
  growthDetail: document.getElementById('growth-detail'),
  growthChart: document.getElementById('growth-chart'),
  growthBody: document.getElementById('growth-body'),
  btnExamples: document.getElementById('btn-examples'),
  btnGrammar: document.getElementById('btn-grammar'),
  dlgExamples: document.getElementById('dlg-examples'),
  dlgGrammar: document.getElementById('dlg-grammar'),
  mobileTabCode: document.getElementById('mobile-tab-code'),
  mobileTabResults: document.getElementById('mobile-tab-results'),
  stage: document.getElementById('tracer-stage'),
  results: document.getElementById('tracer-results'),
};

const tracerPlayback = ITCC47Playback.createController({
  speed: Number(tels.speedSlider.value),
  delayForSpeed: (level) => 1300 - level * 110,
  onChange(playbackState) {
    tstate.stepIndex = playbackState.index;
    tels.btnPlay.textContent = playbackState.status === 'playing' ? 'Pause' : 'Play';
    if (tstate.running && playbackState.currentEvent) renderStep();
  },
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Scroll `container` the minimum amount needed to reveal `el`.
 * scrollIntoView({block:'nearest'}) is unreliable when the container has a
 * sticky header — it treats the element as visible when it is actually behind
 * the header — so the offset is applied explicitly here. `stickyPx` is the
 * height of anything pinned to the top of the container.
 */
function keepInView(container, el, stickyPx = 0) {
  if (!container || !el) return;
  if (container.scrollHeight <= container.clientHeight) return; // not scrollable
  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const top = eRect.top - cRect.top + container.scrollTop;
  const bottom = top + eRect.height;
  const viewTop = container.scrollTop + stickyPx;
  const viewBottom = container.scrollTop + container.clientHeight;
  if (top < viewTop) container.scrollTop = Math.max(0, top - stickyPx - 8);
  else if (bottom > viewBottom) container.scrollTop = bottom - container.clientHeight + 8;
}

// ---------- presets ----------

function buildPresetList() {
  PRESETS.forEach((preset, i) => {
    const btn = document.createElement('button');
    btn.className = 'algo-btn';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      document.querySelectorAll('#preset-list .algo-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      tels.codeBox.value = preset.code;
      tels.inputsBox.value = preset.inputs;
      exitRunMode();
      tels.statusLine.textContent = `Loaded: ${preset.name}`;
      tels.dlgExamples.close();
    });
    tels.presetList.appendChild(btn);
  });
}

// ---------- run ----------

function showError(message) {
  tels.errorBox.textContent = message;
  tels.errorBox.classList.remove('hidden');
}

function clearError() {
  tels.errorBox.classList.add('hidden');
  tels.errorBox.textContent = '';
}

function buildCodeView(source) {
  tstate.sourceLines = source.split('\n');
  tels.codeView.innerHTML = tstate.sourceLines
    .map((line, i) => `<div class="code-line" data-line="${i + 1}"><span class="ln">${i + 1}</span><span class="lc">${escapeHtml(line) || '&nbsp;'}</span></div>`)
    .join('');
}

function runCode() {
  tracerPlayback.pause(false);
  clearError();
  const source = tels.codeBox.value;
  let ast;
  try {
    ast = parsePseudocode(source);
  } catch (e) {
    if (e instanceof TracerError) {
      showError(e.message);
      return;
    }
    showError(`Unexpected error: ${e.message}`);
    return;
  }

  const inputs = parseInputList(tels.inputsBox.value);
  const { steps, truncated, error } = collectSteps(ast, inputs);
  if (error) {
    if (error instanceof TracerError) showError(`Runtime error — ${error.message}`);
    else showError(`Unexpected runtime error: ${error.message}`);
  } else if (truncated) {
    showError(`Stopped after ${steps.length.toLocaleString()} steps — this algorithm may never terminate. Check your loop conditions.`);
  }

  if (steps.length === 0 && tels.errorBox.classList.contains('hidden')) {
    showError('The program produced no steps to trace.');
    return;
  }

  tstate.steps = steps;
  tstate.running = true;
  tstate.ast = ast;
  tstate.inputs = inputs;
  tstate.symbolsConfirmed = false;
  tstate.symbolSelection = {};
  tstate.symbolSignature = '';
  tstate.branchSelections = {};
  tstate.recurrenceConfirmed = false;
  tstate.recurrenceFunction = '';
  tstate.recurrenceMeasure = '';
  tstate.recurrenceBranch = '';
  tstate.recurrenceCombine = '';
  tstate.selectedFrameId = null;

  buildCodeView(source);
  tels.codeBox.classList.add('hidden');
  tels.codeView.classList.remove('hidden');
  tels.btnEdit.disabled = false;
  tels.stepSlider.disabled = steps.length === 0;
  tels.stepSlider.max = String(Math.max(steps.length - 1, 0));
  tels.btnPlay.disabled = steps.length === 0;
  tels.btnStep.disabled = steps.length === 0;
  tels.statusLine.textContent = `${steps.length} step(s) recorded.`;

  buildTraceTable();
  renderOperations();
  renderRecurrence();
  tracerPlayback.load(steps);
  selectMobileWorkspace('results');
}

// ---------- guided recurrence analysis ----------

function renderRecurrence() {
  const functions = tstate.ast && tstate.ast.type === 'Program' ? tstate.ast.functions : [];
  const recursive = functions.filter((fn) => {
    let found = false;
    const walk = (block) => (block || []).forEach((stmt) => {
      if (stmt.type === 'Call' && stmt.name === fn.name) found = true;
      if (stmt.block) walk(stmt.block);
      (stmt.branches || []).forEach((branch) => walk(branch.block));
      (stmt.cases || []).forEach((item) => walk(item.block));
      if (stmt.defaultBlock) walk(stmt.defaultBlock);
    });
    walk(fn.block);
    return found;
  });
  const available = tstate.running && recursive.length > 0;
  tels.recurrenceEmpty.classList.toggle('hidden', available);
  tels.recurrenceContent.classList.toggle('hidden', !available);
  if (!available) return;

  if (!recursive.some((fn) => fn.name === tstate.recurrenceFunction)) tstate.recurrenceFunction = recursive[0].name;
  const previousFunction = tels.recurrenceFunctionSelect.value;
  tels.recurrenceFunctionSelect.innerHTML = recursive.map((fn) => `<option value="${escapeHtml(fn.name)}">${escapeHtml(fn.name)}</option>`).join('');
  tels.recurrenceFunctionSelect.value = tstate.recurrenceFunction || previousFunction;
  const measures = ITCC47Recurrence.suggestMeasures(tstate.ast, tstate.recurrenceFunction);
  if (!measures.some((measure) => measure.id === tstate.recurrenceMeasure)) tstate.recurrenceMeasure = measures[0]?.id || '';
  tels.recurrenceMeasureSelect.innerHTML = measures.length
    ? measures.map((measure) => `<option value="${escapeHtml(measure.id)}">${escapeHtml(measure.label)} — ${escapeHtml(measure.reason)}</option>`).join('')
    : '<option value="">No size measure suggested</option>';
  tels.recurrenceMeasureSelect.value = tstate.recurrenceMeasure;
  tels.recurrenceConfirmStatus.textContent = tstate.recurrenceConfirmed ? `Confirmed: ${measures.find((item) => item.id === tstate.recurrenceMeasure)?.label || tstate.recurrenceMeasure}` : 'Not confirmed';
  tels.recurrenceConfirmStatus.classList.toggle('confirmed', tstate.recurrenceConfirmed);

  const actualCalls = tstate.steps.filter((step) => step.type === 'call' && step.frame.functionName === tstate.recurrenceFunction).length;
  const actualDepth = tstate.steps.reduce((max, step) => Math.max(max, step.frame.callDepth || 0), 0);
  tels.recurrenceActualCalls.textContent = String(actualCalls);
  tels.recurrenceActualDepth.textContent = String(actualDepth);
  if (!tstate.recurrenceConfirmed) {
    tels.recurrenceAssumptions.classList.add('hidden');
    tels.recurrenceResult.classList.add('hidden');
    tels.recurrenceDiagnostics.classList.add('hidden');
    return;
  }

  const analysis = ITCC47Recurrence.analyse({
    program: tstate.ast,
    functionName: tstate.recurrenceFunction,
    measure: tstate.recurrenceMeasure,
    branchSelection: tstate.recurrenceBranch || undefined,
    combineBound: tstate.recurrenceCombine || undefined,
  });
  const branchRequirement = analysis.requiredAssumptions.find((item) => item.kind === 'worst-case-branch');
  const combinePrompt = !branchRequirement && !tstate.recurrenceCombine;
  tels.recurrenceAssumptions.innerHTML = branchRequirement
    ? `<fieldset class="assumption-fieldset"><legend>Which recursive branch is the worst case?</legend>${branchRequirement.candidates.map((item) => `<label><input type="radio" name="recurrence-branch" value="${escapeHtml(item.value)}"><span>${escapeHtml(item.label)}</span></label>`).join('')}<p>This session-only choice resets when the code changes.</p></fieldset>`
    : `<fieldset class="assumption-fieldset"><legend>Bound the non-recursive work in one call</legend>
      <label><input type="radio" name="recurrence-combine" value="constant"${tstate.recurrenceCombine === 'constant' ? ' checked' : ''}><span>Constant, c</span></label>
      <label><input type="radio" name="recurrence-combine" value="linear"${tstate.recurrenceCombine === 'linear' ? ' checked' : ''}><span>Linear in the confirmed size, cn</span></label>
      <p>Choose only what the work outside recursive calls justifies.</p></fieldset>`;
  tels.recurrenceAssumptions.classList.toggle('hidden', !tels.recurrenceAssumptions.innerHTML);
  tels.recurrenceAssumptions.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => {
    if (input.name === 'recurrence-branch') tstate.recurrenceBranch = input.value;
    else tstate.recurrenceCombine = input.value;
    requestAnimationFrame(renderRecurrence);
  }));

  const solved = Boolean(analysis.recurrence) && !combinePrompt;
  tels.recurrenceResult.classList.toggle('hidden', !solved);
  if (solved) {
    tels.recurrenceFormula.textContent = analysis.recurrence;
    tels.recurrenceConfidence.textContent = 'Worst case, based on the confirmed size and combine-work assumptions.';
    tels.recurrenceBigO.textContent = analysis.bigO || '—';
    tels.recurrenceTheta.textContent = analysis.tightTheta || 'Not established';
    tels.recurrenceSpace.textContent = analysis.stackSpace || '—';
    tels.recurrenceDerivation.innerHTML = `<h3>How was this solved?</h3><ol>${analysis.derivation.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`;
  }
  tels.recurrenceDiagnostics.innerHTML = analysis.diagnostics.map((item) => `<div class="ops-diagnostic"><strong>${escapeHtml(item.code)}:</strong> ${escapeHtml(item.message)}</div>`).join('');
  tels.recurrenceDiagnostics.classList.toggle('hidden', analysis.diagnostics.length === 0 || branchRequirement || combinePrompt);
}

// ---------- operation counting ----------

function renderOperations() {
  if (!tstate.running || tstate.steps.length === 0) {
    tels.opsEmpty.classList.remove('hidden');
    tels.opsContent.classList.add('hidden');
    return;
  }
  tels.opsEmpty.classList.add('hidden');
  tels.opsContent.classList.remove('hidden');

  const reads = findReadTargets(tstate.ast);
  const suggestions = ITCC47Counting.suggestSymbols(tstate.ast);
  const signature = suggestions.map((item) => `${item.name}:${item.line}:${item.suggested}`).join('|');
  if (signature !== tstate.symbolSignature) {
    tstate.symbolSignature = signature;
    tstate.symbolSelection = Object.fromEntries(suggestions.map((item) => [item.name, item.suggested]));
    tstate.symbolsConfirmed = false;
  }
  tels.symbolOptions.innerHTML = suggestions.length
    ? suggestions.map((item) => `<label class="symbol-choice${item.suggested ? ' suggested' : ''}">
      <input type="checkbox" value="${escapeHtml(item.name)}"${tstate.symbolSelection[item.name] ? ' checked' : ''}>
      <span><code>${escapeHtml(item.name)}</code>${item.suggested ? '<small>used in a bound</small>' : ''}</span>
    </label>`).join('')
    : '<span class="muted">This program has no top-level READ values.</span>';
  tels.symbolOptions.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => {
    tstate.symbolSelection[input.value] = input.checked;
    tstate.symbolsConfirmed = false;
    tstate.branchSelections = {};
    renderOperations();
  }));
  const previousInput = tels.sweepInput.value;
  tels.sweepInput.innerHTML = reads.length
    ? reads.map((read, index) => `<option value="${index}">${escapeHtml(read.name)} — input ${index + 1}, line ${read.line}</option>`).join('')
    : '<option value="-1">this algorithm reads no input</option>';
  if (previousInput && Number(previousInput) < reads.length) tels.sweepInput.value = previousInput;
  tels.btnMeasure.disabled = reads.length === 0;

  const model = (tels.countModels.find((radio) => radio.checked) || {}).value || 'lecture';
  const selectedIndex = Number(tels.sweepInput.value);
  const selectedRead = reads[selectedIndex] || reads[0];
  const symbols = suggestions.filter((item) => tstate.symbolSelection[item.name])
    .map((item) => ({ name: item.name, symbol: item.name }));
  const analysis = ITCC47Counting.analyse({
    ast: tstate.ast,
    steps: tstate.steps,
    sourceLines: tstate.sourceLines,
    inputs: tstate.inputs,
    model,
    inputName: selectedRead ? selectedRead.name : 'n',
    symbols,
    symbolsConfirmed: tstate.symbolsConfirmed,
    branchSelections: tstate.branchSelections,
  });
  tstate.countAnalysis = analysis;

  const symbolic = tstate.operationsView === 'symbolic';
  tels.opsViewActual.classList.toggle('active', !symbolic);
  tels.opsViewSymbolic.classList.toggle('active', symbolic);
  tels.opsViewActual.setAttribute('aria-pressed', String(!symbolic));
  tels.opsViewSymbolic.setAttribute('aria-pressed', String(symbolic));
  tels.opsSymbolicFacts.classList.toggle('hidden', !symbolic);
  tels.symbolPicker.classList.toggle('hidden', !symbolic);
  tels.symbolStatus.textContent = tstate.symbolsConfirmed
    ? `Confirmed: ${symbols.map((item) => item.symbol).join(', ') || 'no dimensions'}`
    : 'Not confirmed';
  tels.symbolStatus.classList.toggle('confirmed', tstate.symbolsConfirmed);
  tels.opsRunsHeading.textContent = symbolic ? 'Executions' : 'Actual executions';
  tels.opsTotalLabel.textContent = symbolic ? 'Exact formula' : `Actual operations${selectedRead ? ` for ${selectedRead.name} = ${tstate.inputs[selectedIndex]}` : ''}`;
  tels.opsTotal.textContent = symbolic
    ? (!tstate.symbolsConfirmed ? 'Confirm dimensions to analyse'
      : (analysis.symbolicTotal ? `T(${analysis.symbols.map((item) => item.symbol).join(', ')}) = ${analysis.factoredForm}` : 'Formula unavailable'))
    : analysis.actualTotal.toLocaleString();
  tels.opsDominant.textContent = analysis.dominantTerm || '—';
  tels.opsGrowth.textContent = analysis.growthClass || '—';
  tels.opsTight.textContent = analysis.tightBound || '—';
  tels.opsConfidence.textContent = analysis.confidence === 'exact' ? 'High confidence'
    : analysis.confidence === 'assumption-based' ? 'Based on your worst-case assumption' : 'Cannot prove this control flow yet';
  tels.opsConfidence.classList.toggle('unsupported', analysis.confidence !== 'exact');
  const domainText = analysis.inferredDomains.map((domain) => domain.expression).join(', ');
  tels.opsDomains.textContent = domainText ? `Assumes integer ${domainText}` : '';
  tels.opsDomains.classList.toggle('hidden', !symbolic || !domainText);

  tels.assumptions.innerHTML = symbolic && tstate.symbolsConfirmed && analysis.requiredAssumptions.length
    ? analysis.requiredAssumptions.map((assumption) => `<fieldset class="assumption-fieldset">
      <legend>${escapeHtml(assumption.prompt)}</legend>
      ${assumption.candidates.map((candidate) => `<label><input type="radio" name="${escapeHtml(assumption.id)}" value="${candidate.value}"> <span>${escapeHtml(candidate.label)}</span></label>`).join('')}
      <p>Choose the path you are treating as worst case. This choice resets when code changes.</p>
    </fieldset>`).join('') : '';
  tels.assumptions.classList.toggle('hidden', !tels.assumptions.innerHTML);
  tels.assumptions.querySelectorAll('input[type="radio"]').forEach((radio) => radio.addEventListener('change', () => {
    const line = radio.name.split(':')[1];
    tstate.branchSelections[line] = Number(radio.value);
    renderOperations();
  }));

  const rows = symbolic && tstate.symbolsConfirmed ? analysis.rows : symbolic ? [] : analysis.actualRows;
  tels.opsBody.innerHTML = rows.length ? rows.map((row) => {
    const runs = symbolic ? (row.symbolicRuns === null ? '—' : row.symbolicRuns) : row.actualRuns;
    const contribution = symbolic ? (row.contribution === null ? '—' : row.contribution) : row.actualContribution;
    return `<tr class="ops-row${row.confidence === 'unsupported' ? ' ops-row-unsupported' : ''}" tabindex="0" data-source-line="${row.line}" data-loop-lines="${row.enclosingLoops.map((loop) => `${loop.line}:${loop.endLine}`).join(',')}">
      <td>${row.line}</td><td><code>${escapeHtml(row.statement)}</code>${row.kind === 'loop-control' ? '<span class="ops-row-kind">loop control</span>' : ''}</td>
      <td>${escapeHtml(runs)}</td><td>${row.unitCost}</td><td><strong>${escapeHtml(contribution)}</strong></td></tr>`;
  }).join('') : '<tr><td colspan="5" class="muted">No countable operations were recorded.</td></tr>';

  tels.opsDiagnostics.innerHTML = analysis.diagnostics.map((item) =>
    `<div class="ops-diagnostic"><strong>Line ${item.line}:</strong> ${escapeHtml(item.message)} <span>${escapeHtml(item.suggestion || '')}</span></div>`).join('');
  tels.opsDiagnostics.classList.toggle('hidden', analysis.diagnostics.length === 0 || !symbolic || !tstate.symbolsConfirmed);

  tels.derivation.innerHTML = symbolic && tstate.symbolsConfirmed && analysis.derivation.length
    ? `<h3>How was this derived?</h3><ol>${analysis.derivation.map((step) => `<li><span>${escapeHtml(step.title)}</span><code>${escapeHtml(step.expression)}</code></li>`).join('')}</ol>` : '';
  tels.algebra.classList.toggle('hidden', !symbolic || !tstate.symbolsConfirmed || !analysis.expandedForm || analysis.expandedForm === analysis.factoredForm);
  tels.expanded.textContent = analysis.expandedForm ? `Expanded: ${analysis.expandedForm}` : '';

  tels.loopNotes.innerHTML = symbolic && analysis.loops.length ? analysis.loops.map((loop, index) => `<details class="loop-explanation"${index === 0 ? ' open' : ''}>
    <summary>Why ${escapeHtml(loop.totalSymbolicIterations || 'an unknown number of')} executions? <span>Line ${loop.line}</span></summary>
    <p>${escapeHtml(loop.explanation)}</p>
    <dl><div><dt>Bounds</dt><dd><code>${escapeHtml(loop.boundExpression)}</code></dd></div><div><dt>Per entry</dt><dd>${escapeHtml(loop.symbolicIterations || 'unknown')}</dd></div><div><dt>Total</dt><dd>${escapeHtml(loop.totalSymbolicIterations || 'unknown')}</dd></div></dl>
    <button class="btn btn-small loop-highlight" type="button" data-loop-line="${loop.line}" data-loop-end="${loop.endLine}">Highlight lines ${loop.line}–${loop.endLine} in Code</button>
  </details>`).join('') : '';

  tels.opsBody.querySelectorAll('.ops-row').forEach((row) => {
    const select = () => highlightCountSource(Number(row.dataset.sourceLine), row.dataset.loopLines);
    row.addEventListener('click', select);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
    });
  });
  tels.loopNotes.querySelectorAll('.loop-highlight').forEach((button) => button.addEventListener('click', () =>
    highlightCountSource(Number(button.dataset.loopLine), `${button.dataset.loopLine}:${button.dataset.loopEnd}`)));
}

function highlightCountSource(line, loopData) {
  tels.codeView.querySelectorAll('.count-line, .count-loop-line').forEach((element) => element.classList.remove('count-line', 'count-loop-line'));
  String(loopData || '').split(',').filter(Boolean).forEach((range) => {
    const [start, end] = range.split(':').map(Number);
    for (let current = start; current <= end; current++) tels.codeView.querySelector(`[data-line="${current}"]`)?.classList.add('count-loop-line');
  });
  const selected = tels.codeView.querySelector(`[data-line="${line}"]`);
  if (selected) {
    selected.classList.add('count-line');
    const card = document.querySelector('.editor-card');
    const toolbar = document.querySelector('.editor-toolbar');
    keepInView(card, selected, toolbar ? toolbar.offsetHeight : 0);
  }
}

function renderGrowth() {
  const idx = Number(tels.sweepInput.value);
  if (Number.isNaN(idx) || idx < 0) return;

  const maxN = Number(tels.sweepMax.value);
  const sizes = [];
  for (let n = 1; n <= maxN; n++) sizes.push(n);

  const includeControl = (tels.countModels.find((radio) => radio.checked) || {}).value === 'full';
  const { points, error } = sweep(tstate.ast, tstate.inputs, idx, sizes, includeControl, tstate.sourceLines);

  if (error) {
    tels.growthResult.classList.remove('hidden');
    tels.growthLabel.textContent = '—';
    tels.growthDetail.textContent = `Could not measure: ${error}`;
    tels.growthChart.innerHTML = '';
    tels.growthBody.innerHTML = '';
    return;
  }

  const verdict = classifyGrowth(points);
  tels.growthResult.classList.remove('hidden');
  tels.growthLabel.textContent = verdict.label;
  tels.growthLabel.className = `growth-label${verdict.flat ? ' growth-flat' : ''}`;
  tels.growthDetail.textContent = verdict.detail;

  const max = Math.max(...points.map((p) => p.total), 1);
  tels.growthChart.innerHTML = points
    .map((p) => `<div class="growth-bar-col"><div class="growth-bar" style="height:${(p.total / max) * 100}%" title="n=${p.n}: ${p.total} operations"></div><span>${p.n}</span></div>`)
    .join('');

  tels.growthBody.innerHTML = points
    .map((p, i) => {
      const ratio = i === 0 ? '—' : (p.total / Math.max(points[i - 1].total, 1)).toFixed(2) + '×';
      return `<tr><td>${p.n}</td><td>${p.total.toLocaleString()}</td><td>${ratio}</td></tr>`;
    })
    .join('');
}

function exitRunMode() {
  tracerPlayback.load([]);
  tstate.running = false;
  tstate.steps = [];
  tstate.stepIndex = 0;
  tels.codeBox.classList.remove('hidden');
  tels.codeView.classList.add('hidden');
  tels.btnEdit.disabled = true;
  tels.stepSlider.disabled = true;
  tels.stepSlider.value = '0';
  tels.stepSlider.max = '0';
  tels.stepCounter.textContent = '0 / 0';
  tels.btnPlay.disabled = true;
  tels.btnStep.disabled = true;
  tels.btnPlay.textContent = 'Play';
  tels.traceBody.innerHTML = '';
  tels.varsBox.textContent = 'Run the pseudocode to see variable state.';
  tels.callStackBox.textContent = 'No function is active.';
  tels.outputBox.textContent = '(no output yet)';
  tels.statusLine.textContent = 'Write or load pseudocode, then Run.';
  tels.opsEmpty.classList.remove('hidden');
  tels.opsContent.classList.add('hidden');
  tels.growthResult.classList.add('hidden');
  clearError();
  selectMobileWorkspace('code');
}

function selectMobileWorkspace(which) {
  const results = which === 'results';
  tels.mobileTabCode.classList.toggle('active', !results);
  tels.mobileTabResults.classList.toggle('active', results);
  tels.mobileTabCode.setAttribute('aria-selected', String(!results));
  tels.mobileTabResults.setAttribute('aria-selected', String(results));
  tels.mobileTabCode.tabIndex = results ? -1 : 0;
  tels.mobileTabResults.tabIndex = results ? 0 : -1;
  tels.stage.classList.toggle('mobile-panel-hidden', results);
  tels.results.classList.toggle('mobile-panel-hidden', !results);
}

// ---------- trace table ----------

function buildTraceTable() {
  tels.traceBody.innerHTML = '';
  tstate.steps.forEach((step, i) => {
    const tr = document.createElement('tr');
    tr.id = `trace-row-${i}`;
    tr.className = `trace-row-${step.type}`;
    tr.addEventListener('click', () => {
      tracerPlayback.seek(i);
    });
    tr.innerHTML = `<td>${i}</td><td>${step.source.line}</td><td><code>${escapeHtml(step.source.code)}</code></td><td>${escapeHtml(step.message)}</td>`;
    tels.traceBody.appendChild(tr);
  });
}

// ---------- render ----------

function renderStep() {
  const step = tstate.steps[tstate.stepIndex];
  if (!step) return;

  document.querySelectorAll('.code-line.current-line').forEach((el) => el.classList.remove('current-line'));
  const lineEl = tels.codeView.querySelector(`[data-line="${step.source.line}"]`);
  if (lineEl) {
    lineEl.classList.add('current-line');
    const card = document.querySelector('.editor-card');
    const toolbar = document.querySelector('.editor-toolbar');
    keepInView(card, lineEl, toolbar ? toolbar.offsetHeight : 0);
  }

  const frames = step.frame.callStack || [];
  if (!frames.some((frame) => frame.id === tstate.selectedFrameId)) tstate.selectedFrameId = step.frame.activeFrameId;
  const selectedFrame = frames.find((frame) => frame.id === tstate.selectedFrameId);
  const visibleVars = selectedFrame ? selectedFrame.locals : step.frame.vars;
  const varNames = Object.keys(visibleVars || {});
  tels.varsBox.innerHTML = varNames.length
    ? `${selectedFrame ? `<p class="frame-scope-label">Locals in ${escapeHtml(selectedFrame.functionName)}</p>` : ''}${varNames.map((k) => `<div class="var-row"><span class="var-name">${escapeHtml(k)}</span><span class="var-value">${escapeHtml(visibleVars[k])}</span></div>`).join('')}${selectedFrame && Object.keys(step.frame.globals || {}).length ? `<details class="global-scope"><summary>Globals</summary>${Object.entries(step.frame.globals).map(([name, value]) => `<div class="var-row"><span class="var-name">${escapeHtml(name)}</span><span class="var-value">${escapeHtml(value)}</span></div>`).join('')}</details>` : ''}`
    : '<span class="muted">(no variables yet)</span>';

  tels.callStackBox.innerHTML = frames.length ? frames.slice().reverse().map((frame) => `<details class="call-frame${frame.id === tstate.selectedFrameId ? ' active' : ''}" data-frame-id="${escapeHtml(frame.id)}"${frame.id === step.frame.activeFrameId ? ' open' : ''}>
    <summary><span><strong>${escapeHtml(frame.functionName)}</strong><small>depth ${frame.depth}</small></span><code>line ${frame.callLine}</code></summary>
    <div class="call-frame-body"><p>${Object.entries(frame.arguments).map(([name, value]) => `${escapeHtml(name)} = ${escapeHtml(value)}`).join(', ') || 'No arguments'}</p><button class="btn btn-small select-frame" type="button">Show these locals</button></div>
  </details>`).join('') : '<span class="muted">No function is active.</span>';
  tels.callStackBox.querySelectorAll('.select-frame').forEach((button) => button.addEventListener('click', () => {
    tstate.selectedFrameId = button.closest('.call-frame').dataset.frameId;
    renderStep();
  }));

  const outputs = tstate.steps.slice(0, tstate.stepIndex + 1).filter((s) => s.type === 'write').map((s) => s.frame.outputValue);
  tels.outputBox.innerHTML = outputs.length
    ? outputs.map((v) => `<div class="var-row"><span class="var-value">${escapeHtml(fmtValue(v))}</span></div>`).join('')
    : '<span class="muted">(no output yet)</span>';

  tels.stepSlider.value = String(tstate.stepIndex);
  tels.stepCounter.textContent = `${tstate.stepIndex} / ${tstate.steps.length - 1}`;

  const prevRow = tels.traceBody.querySelector('.current-row');
  if (prevRow) prevRow.classList.remove('current-row');
  const row = document.getElementById(`trace-row-${tstate.stepIndex}`);
  if (row) {
    row.classList.add('current-row');
    const wrap = row.closest('.trace-table-wrap');
    const head = wrap ? wrap.querySelector('thead') : null;
    keepInView(wrap, row, head ? head.offsetHeight : 0);
  }

  const atEnd = tracerPlayback.getState().atEnd;
  tels.btnStep.disabled = atEnd;
  tels.btnPlay.disabled = atEnd;
}

// ---------- events ----------

tels.btnRun.addEventListener('click', runCode);
tels.btnEdit.addEventListener('click', exitRunMode);
tels.btnPlay.addEventListener('click', () => tracerPlayback.toggle());
tels.btnStep.addEventListener('click', () => {
  tracerPlayback.step(1);
});
tels.mobileTabCode.addEventListener('click', () => selectMobileWorkspace('code'));
tels.mobileTabResults.addEventListener('click', () => selectMobileWorkspace('results'));
[tels.mobileTabCode, tels.mobileTabResults].forEach((tab, index, tabs) => tab.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  let next = index;
  if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  tabs[next].click(); tabs[next].focus();
}));
tels.stepSlider.addEventListener('input', () => {
  tracerPlayback.seek(Number(tels.stepSlider.value));
});
tels.speedSlider.addEventListener('input', () => tracerPlayback.setSpeed(tels.speedSlider.value));

function selectTab(which) {
  const ops = which === 'ops';
  const recurrence = which === 'recurrence';
  tels.tabOps.classList.toggle('active', ops);
  tels.tabRecurrence.classList.toggle('active', recurrence);
  tels.tabTrace.classList.toggle('active', !ops && !recurrence);
  tels.tabOps.setAttribute('aria-selected', String(ops));
  tels.tabRecurrence.setAttribute('aria-selected', String(recurrence));
  tels.tabTrace.setAttribute('aria-selected', String(!ops && !recurrence));
  tels.tabOps.tabIndex = ops ? 0 : -1;
  tels.tabRecurrence.tabIndex = recurrence ? 0 : -1;
  tels.tabTrace.tabIndex = !ops && !recurrence ? 0 : -1;
  tels.panelOps.classList.toggle('hidden', !ops);
  tels.panelRecurrence.classList.toggle('hidden', !recurrence);
  tels.panelTrace.classList.toggle('hidden', ops || recurrence);
}

tels.tabTrace.addEventListener('click', () => selectTab('trace'));
tels.tabOps.addEventListener('click', () => selectTab('ops'));
tels.tabRecurrence.addEventListener('click', () => selectTab('recurrence'));
[tels.tabTrace, tels.tabOps, tels.tabRecurrence].forEach((tab, index, tabs) => {
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    tabs[next].click();
    tabs[next].focus();
  });
});

tels.opsViewActual.addEventListener('click', () => { tstate.operationsView = 'actual'; renderOperations(); });
tels.opsViewSymbolic.addEventListener('click', () => { tstate.operationsView = 'symbolic'; renderOperations(); });
tels.btnConfirmSymbols.addEventListener('click', () => {
  tstate.symbolsConfirmed = true;
  tstate.branchSelections = {};
  renderOperations();
});
tels.countModels.forEach((radio) => radio.addEventListener('change', () => {
  renderOperations();
  if (!tels.growthResult.classList.contains('hidden')) renderGrowth();
}));
tels.sweepInput.addEventListener('change', renderOperations);

tels.sweepMax.addEventListener('input', () => {
  tels.sweepMaxValue.textContent = tels.sweepMax.value;
});

tels.btnMeasure.addEventListener('click', renderGrowth);
tels.recurrenceFunctionSelect.addEventListener('change', () => {
  tstate.recurrenceFunction = tels.recurrenceFunctionSelect.value;
  tstate.recurrenceMeasure = '';
  tstate.recurrenceConfirmed = false;
  tstate.recurrenceBranch = '';
  tstate.recurrenceCombine = '';
  renderRecurrence();
});
tels.recurrenceMeasureSelect.addEventListener('change', () => {
  tstate.recurrenceMeasure = tels.recurrenceMeasureSelect.value;
  tstate.recurrenceConfirmed = false;
  tstate.recurrenceBranch = '';
  tstate.recurrenceCombine = '';
  renderRecurrence();
});
tels.btnConfirmRecurrence.addEventListener('click', () => {
  tstate.recurrenceFunction = tels.recurrenceFunctionSelect.value;
  tstate.recurrenceMeasure = tels.recurrenceMeasureSelect.value;
  tstate.recurrenceConfirmed = Boolean(tstate.recurrenceMeasure);
  tstate.recurrenceBranch = '';
  tstate.recurrenceCombine = '';
  renderRecurrence();
});

// ---------- dialogs ----------

tels.btnExamples.addEventListener('click', () => tels.dlgExamples.showModal());
tels.btnGrammar.addEventListener('click', () => tels.dlgGrammar.showModal());

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.close).close());
});

// clicking the backdrop closes the dialog
document.querySelectorAll('dialog.dlg').forEach((dlg) => {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
});

// ---------- init ----------

buildPresetList();

// A curated visualizer activity can open directly in the lab without copying code.
const activityHandoff = (() => {
  const activityId = new URLSearchParams(window.location.search).get('activity');
  if (!activityId || typeof ITCC47Activities === 'undefined') return null;
  const activity = ITCC47Activities.get(activityId);
  if (!activity || !Array.isArray(activity.source)) return null;
  return activity;
})();

// A skeleton handed over from the Algorithm Writer takes priority over the default preset.
const handoff = (() => {
  try {
    const v = localStorage.getItem('itcc47.tracer.handoff');
    if (v) localStorage.removeItem('itcc47.tracer.handoff');
    return v;
  } catch (e) { return null; }
})();

if (activityHandoff) {
  tels.codeBox.value = activityHandoff.source.join('\n');
  tels.inputsBox.value = '';
  tels.statusLine.textContent = `${activityHandoff.title} loaded from the Visualizer — edit it or Run to inspect its trace, operations, and output.`;
} else if (handoff) {
  tels.codeBox.value = handoff;
  tels.inputsBox.value = '';
  tels.statusLine.textContent = 'Skeleton loaded from the Algorithm Writer — fill in the conditions, then Run.';
} else {
  tels.codeBox.value = PRESETS[0].code;
  tels.inputsBox.value = PRESETS[0].inputs;
  document.querySelector('#preset-list .algo-btn')?.classList.add('active');
}
