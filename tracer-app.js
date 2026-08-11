/* UI wiring for the Pseudocode Tracer: preset loading, run/parse, playback, trace table. */

const tstate = {
  steps: [],
  stepIndex: 0,
  playing: false,
  playTimer: null,
  running: false,
  sourceLines: [],
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
  outputBox: document.getElementById('output-box'),
  traceBody: document.getElementById('trace-body'),
  tabTrace: document.getElementById('tab-trace'),
  tabOps: document.getElementById('tab-ops'),
  panelTrace: document.getElementById('panel-trace'),
  panelOps: document.getElementById('panel-ops'),
  opsEmpty: document.getElementById('ops-empty'),
  opsContent: document.getElementById('ops-content'),
  opsTotal: document.getElementById('ops-total-value'),
  opsBody: document.getElementById('ops-body'),
  optControl: document.getElementById('opt-control'),
  loopNotes: document.getElementById('loop-notes'),
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
};

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
  stopPlaying();
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
  tstate.stepIndex = 0;
  tstate.running = true;
  tstate.ast = ast;
  tstate.inputs = inputs;

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
  if (steps.length > 0) renderStep();
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

  const includeControl = tels.optControl.checked;
  const { rows, total } = summarizeCounts(tstate.steps, tstate.sourceLines, includeControl);

  tels.opsTotal.textContent = total.toLocaleString();
  tels.opsBody.innerHTML = rows
    .map((r) => `<tr><td>${r.line}</td><td><code>${escapeHtml(r.code)}</code></td><td>${r.each % 1 === 0 ? r.each : r.each.toFixed(1)}</td><td>${r.times}</td><td><strong>${r.total}</strong></td></tr>`)
    .join('');

  const { notes } = loopDiagnostics(tstate.ast, tstate.steps, tstate.sourceLines);
  tels.loopNotes.innerHTML = notes.length
    ? notes.map((n) => `<div class="loop-note"><strong>Line ${n.line}:</strong> ${escapeHtml(n.message)}</div>`).join('')
    : '';

  // populate the "which input is n?" selector once per run
  const reads = findReadTargets(tstate.ast);
  const prev = tels.sweepInput.value;
  tels.sweepInput.innerHTML = reads.length
    ? reads.map((r, i) => `<option value="${i}">input ${i + 1} — ${escapeHtml(r.name)} (line ${r.line})</option>`).join('')
    : '<option value="-1">this algorithm reads no input</option>';
  if (prev && Number(prev) < reads.length) tels.sweepInput.value = prev;
  tels.btnMeasure.disabled = reads.length === 0;
}

function renderGrowth() {
  const idx = Number(tels.sweepInput.value);
  if (Number.isNaN(idx) || idx < 0) return;

  const maxN = Number(tels.sweepMax.value);
  const sizes = [];
  for (let n = 1; n <= maxN; n++) sizes.push(n);

  const includeControl = tels.optControl.checked;
  const { points, error } = sweep(tstate.ast, tstate.inputs, idx, sizes, includeControl);

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
  stopPlaying();
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
  tels.outputBox.textContent = '(no output yet)';
  tels.statusLine.textContent = 'Write or load pseudocode, then Run.';
  tels.opsEmpty.classList.remove('hidden');
  tels.opsContent.classList.add('hidden');
  tels.growthResult.classList.add('hidden');
  clearError();
}

// ---------- trace table ----------

function buildTraceTable() {
  tels.traceBody.innerHTML = '';
  tstate.steps.forEach((step, i) => {
    const tr = document.createElement('tr');
    tr.id = `trace-row-${i}`;
    tr.className = `trace-row-${step.kind}`;
    tr.addEventListener('click', () => {
      stopPlaying();
      tstate.stepIndex = i;
      renderStep();
    });
    tr.innerHTML = `<td>${i}</td><td>${step.line}</td><td><code>${escapeHtml(step.code)}</code></td><td>${escapeHtml(step.description)}</td>`;
    tels.traceBody.appendChild(tr);
  });
}

// ---------- render ----------

function renderStep() {
  const step = tstate.steps[tstate.stepIndex];
  if (!step) return;

  document.querySelectorAll('.code-line.current-line').forEach((el) => el.classList.remove('current-line'));
  const lineEl = tels.codeView.querySelector(`[data-line="${step.line}"]`);
  if (lineEl) {
    lineEl.classList.add('current-line');
    const card = document.querySelector('.editor-card');
    const toolbar = document.querySelector('.editor-toolbar');
    keepInView(card, lineEl, toolbar ? toolbar.offsetHeight : 0);
  }

  const varNames = Object.keys(step.vars);
  tels.varsBox.innerHTML = varNames.length
    ? varNames.map((k) => `<div class="var-row"><span class="var-name">${escapeHtml(k)}</span><span class="var-value">${escapeHtml(step.vars[k])}</span></div>`).join('')
    : '<span class="muted">(no variables yet)</span>';

  const outputs = tstate.steps.slice(0, tstate.stepIndex + 1).filter((s) => s.kind === 'write').map((s) => s.outputValue);
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

  const atEnd = tstate.stepIndex >= tstate.steps.length - 1;
  tels.btnStep.disabled = atEnd;
  tels.btnPlay.disabled = atEnd;
  if (atEnd) stopPlaying();
}

// ---------- playback ----------

function stepForward() {
  if (tstate.stepIndex < tstate.steps.length - 1) {
    tstate.stepIndex++;
    renderStep();
  } else {
    stopPlaying();
  }
}

function speedDelay() {
  const level = Number(tels.speedSlider.value);
  return 1300 - level * 110;
}

function startPlaying() {
  if (tstate.stepIndex >= tstate.steps.length - 1) return;
  tstate.playing = true;
  tels.btnPlay.textContent = 'Pause';
  tstate.playTimer = setInterval(() => {
    stepForward();
    if (tstate.stepIndex >= tstate.steps.length - 1) stopPlaying();
  }, speedDelay());
}

function stopPlaying() {
  tstate.playing = false;
  tels.btnPlay.textContent = 'Play';
  if (tstate.playTimer) {
    clearInterval(tstate.playTimer);
    tstate.playTimer = null;
  }
}

function togglePlaying() {
  if (tstate.playing) stopPlaying();
  else startPlaying();
}

// ---------- events ----------

tels.btnRun.addEventListener('click', runCode);
tels.btnEdit.addEventListener('click', exitRunMode);
tels.btnPlay.addEventListener('click', togglePlaying);
tels.btnStep.addEventListener('click', () => {
  stopPlaying();
  stepForward();
});
tels.stepSlider.addEventListener('input', () => {
  stopPlaying();
  tstate.stepIndex = Number(tels.stepSlider.value);
  renderStep();
});

function selectTab(which) {
  const ops = which === 'ops';
  tels.tabOps.classList.toggle('active', ops);
  tels.tabTrace.classList.toggle('active', !ops);
  tels.panelOps.classList.toggle('hidden', !ops);
  tels.panelTrace.classList.toggle('hidden', ops);
}

tels.tabTrace.addEventListener('click', () => selectTab('trace'));
tels.tabOps.addEventListener('click', () => selectTab('ops'));

tels.optControl.addEventListener('change', () => {
  renderOperations();
  if (!tels.growthResult.classList.contains('hidden')) renderGrowth();
});

tels.sweepMax.addEventListener('input', () => {
  tels.sweepMaxValue.textContent = tels.sweepMax.value;
});

tels.btnMeasure.addEventListener('click', renderGrowth);

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

// A skeleton handed over from the Algorithm Writer takes priority over the default preset.
const handoff = (() => {
  try {
    const v = localStorage.getItem('itcc47.tracer.handoff');
    if (v) localStorage.removeItem('itcc47.tracer.handoff');
    return v;
  } catch (e) { return null; }
})();

if (handoff) {
  tels.codeBox.value = handoff;
  tels.inputsBox.value = '';
  tels.statusLine.textContent = 'Skeleton loaded from the Algorithm Writer — fill in the conditions, then Run.';
} else {
  tels.codeBox.value = PRESETS[0].code;
  tels.inputsBox.value = PRESETS[0].inputs;
  document.querySelector('#preset-list .algo-btn')?.classList.add('active');
}
