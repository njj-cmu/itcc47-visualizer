/*
 * Problem Sets: pick a problem, write pseudocode, have it executed against
 * visible and hidden test cases.
 *
 * A pass means every case produced exactly the expected output. That is strong
 * evidence, not proof, so the UI says "10/10 checks passed" rather than
 * "correct" — a student should never learn that passing tests means proven.
 */

const PROGRESS_KEY = 'itcc47.problems.v1';
const CODE_KEY = 'itcc47.problems.code.v1';
const PRACTICE_RECORDS_KEY = 'itcc47.practice-records:v2';
const HANDOFF_KEY = 'itcc47.tracer.handoff';
const STEP_CAP = 20000;
const mobileTabs = [...document.querySelectorAll('[data-mobile-panel]')];
const problemPane = document.getElementById('problem-pane');
const workPane = document.getElementById('work-pane');
const requestedModule = new URLSearchParams(window.location.search).get('module');
const requestedProblem = new URLSearchParams(window.location.search).get('problem');
const moduleProblems = requestedModule
  ? PROBLEMS.filter((problem) => problem.module === `Module ${requestedModule}`)
  : PROBLEMS;
const requestedProblemRecord = requestedProblem ? PROBLEMS.find((problem) => problem.id === requestedProblem) : moduleProblems[0];
const requestedRelease = requestedProblem
  ? ITCC47Curriculum.stateForResource('problem', requestedProblem, ITCC47CurriculumUI.previewOptions())
  : requestedProblemRecord ? ITCC47Curriculum.stateForResource('problem', requestedProblemRecord.id, ITCC47CurriculumUI.previewOptions())
  : null;
const requestedIsOpen = !requestedRelease || ['available', 'current'].includes(requestedRelease.state);

const pstate = {
  problem: null,
  solved: {},   // id -> true
  drafts: {},   // id -> code
  records: {},  // id -> { contentVersion, draft, completed }
  recovery: {}, // id -> earlier versioned drafts
  lastEvaluation: null,
};

const pels = {
  title: document.getElementById('p-title'),
  module: document.getElementById('p-module'),
  difficulty: document.getElementById('p-difficulty'),
  solvedChip: document.getElementById('p-solved'),
  statement: document.getElementById('p-statement'),
  rules: document.getElementById('p-rules'),
  io: document.getElementById('p-io'),
  examples: document.getElementById('p-examples'),
  codeBox: document.getElementById('code-box'),
  errorBox: document.getElementById('error-box'),
  btnProblems: document.getElementById('btn-problems'),
  btnGrammar: document.getElementById('btn-grammar'),
  btnCheck: document.getElementById('btn-check'),
  btnTrace: document.getElementById('btn-trace'),
  btnReset: document.getElementById('btn-reset'),
  progressLine: document.getElementById('progress-line'),
  resultsScore: document.getElementById('results-score'),
  resultsBody: document.getElementById('results-body'),
  dlgGrammar: document.getElementById('dlg-grammar'),
  recovery: document.getElementById('draft-recovery'),
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function selectMobilePanel(name, focus = false) {
  mobileTabs.forEach((tab) => {
    const selected = tab.dataset.mobilePanel === name;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });
  problemPane.classList.toggle('mobile-panel-hidden', name !== 'problem');
  workPane.classList.toggle('mobile-panel-hidden', name === 'problem');
  workPane.classList.toggle('mobile-code', name === 'code');
  workPane.classList.toggle('mobile-results', name === 'results');
}

// ---------- persistence ----------

function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRACTICE_RECORDS_KEY) || 'null');
    const previousSolved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') || {};
    const previousDrafts = JSON.parse(localStorage.getItem(CODE_KEY) || '{}') || {};
    pstate.records = stored?.schemaVersion === 2 ? { ...(stored.records || {}) } : {};
    pstate.recovery = stored?.schemaVersion === 2 ? { ...(stored.recovery || {}) } : {};
    PROBLEMS.forEach((problem) => {
      let record = pstate.records[problem.id];
      if (!record && (Object.prototype.hasOwnProperty.call(previousDrafts, problem.id) || previousSolved[problem.id])) {
        record = { contentVersion: 1, draft: previousDrafts[problem.id] ?? problem.starter, completed: Boolean(previousSolved[problem.id]) };
      }
      if (!record) record = { contentVersion: problem.contentVersion, draft: problem.starter, completed: false };
      if (Number(record.contentVersion) !== Number(problem.contentVersion)) {
        if (typeof record.draft === 'string' && record.draft.trim()) {
          pstate.recovery[problem.id] = [...(pstate.recovery[problem.id] || []), { contentVersion: record.contentVersion, draft: record.draft }];
        }
        record = { contentVersion: problem.contentVersion, draft: problem.starter, completed: false };
      }
      pstate.records[problem.id] = record;
    });
    pstate.solved = Object.fromEntries(Object.entries(pstate.records).filter(([,record]) => record.completed).map(([id]) => [id,true]));
    pstate.drafts = Object.fromEntries(Object.entries(pstate.records).map(([id,record]) => [id,record.draft]));
  } catch (e) {
    pstate.solved = {};
    pstate.drafts = {};
    pstate.records = {};
    pstate.recovery = {};
  }
  saveProgress();
}

function saveProgress() {
  try {
    PROBLEMS.forEach((problem) => {
      pstate.records[problem.id] = {
        contentVersion: problem.contentVersion,
        draft: pstate.drafts[problem.id] ?? problem.starter,
        completed: Boolean(pstate.solved[problem.id]),
      };
    });
    localStorage.setItem(PRACTICE_RECORDS_KEY, JSON.stringify({ schemaVersion: 2, records: pstate.records, recovery: pstate.recovery }));
  } catch (e) { /* storage may be unavailable */ }
}

// ---------- checking ----------

/** Values are compared as they would be displayed, so 40 and "40" match. */
function normalize(v) {
  return fmtValue(v).trim();
}

/** Canonical form fed to the hash. Must match canon() in tools/build-problems.js. */
function canon(values) {
  return values.map((v) => {
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }).join('\u0001');
}

function outputsOf(steps) {
  return steps.filter((s) => s.type === 'write').map((s) => s.frame.outputValue);
}

/** Execute the student's program against one case; returns outputs or a failure reason. */
function execCase(ast, inputs) {
  const { steps, truncated, error } = collectSteps(ast, [...inputs], STEP_CAP);
  if (error) {
    return { ok: false, reason: error instanceof TracerError ? error.message : String(error.message || error) };
  }
  if (truncated) {
    return { ok: false, reason: 'Stopped early — the algorithm may never finish. Check your loop conditions.' };
  }
  return { ok: true, outputs: outputsOf(steps) };
}

/** Visible example: expected values are on hand, so compare them directly. */
function runVisibleCase(ast, test) {
  const run = execCase(ast, test.inputs);
  if (!run.ok) return { pass: false, reason: run.reason, actual: null };

  const actual = run.outputs;
  if (actual.length !== test.expected.length) {
    return {
      pass: false,
      actual,
      reason: `Expected ${test.expected.length} output value${test.expected.length === 1 ? '' : 's'}, but got ${actual.length}.`,
    };
  }
  for (let i = 0; i < test.expected.length; i++) {
    if (normalize(actual[i]) !== normalize(test.expected[i])) {
      return { pass: false, actual, reason: null };
    }
  }
  return { pass: true, actual, reason: null };
}

/**
 * Hidden case: the shipped file holds only a digest of the expected output, so
 * we hash what the student produced and compare digests. Nothing here can be
 * run backwards to reveal the answer.
 */
function runHiddenCase(ast, hidden, salt, index) {
  let inputs;
  try {
    inputs = JSON.parse(Hash.deobfuscate(salt, index, hidden.i));
  } catch (e) {
    return { pass: false, reason: 'This test case could not be loaded.' };
  }

  const run = execCase(ast, inputs);
  if (!run.ok) return { pass: false, reason: run.reason };

  if (run.outputs.length !== hidden.n) {
    return {
      pass: false,
      reason: `Expected ${hidden.n} output value${hidden.n === 1 ? '' : 's'}, but got ${run.outputs.length}.`,
    };
  }

  const got = Hash.digest(salt, canon(run.outputs.map(normalize)), PROBLEM_ROUNDS);
  return { pass: got === hidden.h, reason: null };
}

function checkAnswer() {
  const problem = pstate.problem;
  if (!problem) return;

  pels.errorBox.classList.add('hidden');

  let ast;
  try {
    ast = parsePseudocode(pels.codeBox.value);
  } catch (e) {
    pstate.lastEvaluation = ITCC47Evaluation.createResult({
      activityId: problem.id,
      activityVersion: problem.contentVersion,
      status: 'error', passed: 0, total: 0, cases: [], outputs: [],
      diagnostics: [{ code: e.code || 'E_PARSE', line: e.line || null, column: e.column || null,
        message: e.message, hint: e.hint || '' }],
    });
    pels.errorBox.textContent = e instanceof TracerError ? e.message : `Unexpected error: ${e.message}`;
    pels.errorBox.classList.remove('hidden');
    pels.resultsScore.textContent = 'could not run';
    pels.resultsScore.className = 'results-score score-fail';
    pels.resultsBody.innerHTML = '<p class="muted">Your pseudocode could not be parsed, so nothing was tested yet. Fix the error above and check again.</p>';
    return;
  }

  const visible = problem.visibleTests.map((t) => ({ test: t, result: runVisibleCase(ast, t) }));
  const hidden = problem.hidden.map((h, i) => ({ result: runHiddenCase(ast, h, problem.salt, i) }));

  const passedVisible = visible.filter((r) => r.result.pass).length;
  const passedHidden = hidden.filter((r) => r.result.pass).length;
  const total = visible.length + hidden.length;
  const passed = passedVisible + passedHidden;
  const allPass = passed === total;

  pstate.lastEvaluation = ITCC47Evaluation.createResult({
    activityId: problem.id,
    activityVersion: problem.contentVersion,
    status: allPass ? 'passed' : 'failed',
    passed,
    total,
    cases: [
      ...visible.map((row, i) => ({ id: `visible:${i}`, visible: true, passed: row.result.pass,
        diagnostic: row.result.reason || null })),
      ...hidden.map((row, i) => ({ id: `hidden:${i}`, visible: false, passed: row.result.pass,
        diagnostic: row.result.reason || null })),
    ],
    diagnostics: [],
    outputs: visible.map((row) => row.result.actual || []),
  });

  if (allPass) {
    pstate.solved[problem.id] = true;
    saveProgress();
  }

  renderResults(visible, hidden, passed, total, allPass, passedVisible === visible.length);
  renderProgress();
  renderProblemMeta();
}

function renderResults(visible, hidden, passed, total, allPass, allVisiblePass) {
  pels.resultsScore.textContent = `${passed}/${total} checks passed`;
  pels.resultsScore.className = `results-score ${allPass ? 'score-pass' : 'score-fail'}`;

  const parts = [];

  if (allPass) {
    parts.push(`<div class="verdict verdict-pass">
      <strong>All ${total} checks passed.</strong>
      <span>Your algorithm handled every case, including the hidden ones. Passing every test is strong evidence, though not a proof of correctness.</span>
    </div>`);
  } else if (allVisiblePass) {
    parts.push(`<div class="verdict verdict-near">
      <strong>The examples pass, but some hidden cases do not.</strong>
      <span>Something works for the shown inputs but not in general. Look at the boundary values in the rules, invalid input, and the order you apply the rules in.</span>
    </div>`);
  } else {
    parts.push(`<div class="verdict verdict-fail">
      <strong>${total - passed} of ${total} checks did not pass.</strong>
      <span>Start with the failing example below — it shows what your algorithm displayed and what was expected.</span>
    </div>`);
  }

  parts.push('<h3 class="results-section">Examples</h3>');
  visible.forEach((row, i) => {
    const { test, result } = row;
    const inputs = test.inputs.map((v) => fmtValue(v)).join(', ');
    const expected = test.expected.map((v) => fmtValue(v)).join(', ');
    const actual = result.actual ? result.actual.map((v) => fmtValue(v)).join(', ') : '—';
    parts.push(`
      <div class="case ${result.pass ? 'case-pass' : 'case-fail'}">
        <div class="case-head">
          <span class="case-mark">${result.pass ? '✓' : '✕'}</span>
          <span class="case-name">Example ${i + 1}</span>
          ${test.note ? `<span class="case-note">${esc(test.note)}</span>` : ''}
        </div>
        <div class="case-row"><span>Input</span><code>${esc(inputs)}</code></div>
        <div class="case-row"><span>Expected</span><code>${esc(expected)}</code></div>
        ${result.pass ? '' : `<div class="case-row case-actual"><span>You showed</span><code>${esc(actual)}</code></div>`}
        ${result.reason ? `<p class="case-reason">${esc(result.reason)}</p>` : ''}
      </div>`);
  });

  parts.push('<h3 class="results-section">Hidden checks</h3>');
  parts.push('<p class="muted results-note">These use different inputs, including edge cases. Their values are not shown.</p>');
  parts.push('<div class="hidden-grid">');
  hidden.forEach((row, i) => {
    parts.push(`<span class="hidden-pill ${row.result.pass ? 'pill-pass' : 'pill-fail'}" title="${row.result.pass ? 'passed' : 'failed'}">${row.result.pass ? '✓' : '✕'} ${i + 1}</span>`);
  });
  parts.push('</div>');

  const runtimeIssue = [...visible, ...hidden].find((r) => !r.result.pass && r.result.reason);
  if (runtimeIssue && !visible.some((v) => !v.result.pass && v.result.reason)) {
    parts.push(`<p class="case-reason standalone">A hidden case reported: ${esc(runtimeIssue.result.reason)}</p>`);
  }

  pels.resultsBody.innerHTML = parts.join('');
  pels.resultsBody.classList.remove('muted');
}

// ---------- rendering ----------

function renderProblemMeta() {
  const p = pstate.problem;
  if (!p) return;
  pels.solvedChip.classList.toggle('hidden', !pstate.solved[p.id]);
}

function renderProgress() {
  const solved = moduleProblems.filter((p) => pstate.solved[p.id]).length;
  pels.progressLine.textContent = `${solved} of ${moduleProblems.length} solved`;
}

function selectProblem(problem) {
  pstate.problem = problem;

  pels.title.textContent = problem.title;
  pels.module.textContent = problem.module;
  pels.difficulty.textContent = problem.difficulty;
  pels.difficulty.className = `chip chip-diff diff-${problem.difficulty.toLowerCase().replace(/[^a-z]/g, '')}`;
  pels.statement.textContent = problem.statement;
  pels.btnProblems.href = `problem-list.html?module=${problem.module.replace(/\D+/g, '')}`;

  pels.rules.innerHTML = problem.rules
    .map(([when, then]) => `<tr><th>${esc(when)}</th><td>${esc(then)}</td></tr>`)
    .join('');

  pels.io.textContent = problem.ioNote;

  pels.examples.innerHTML = problem.visibleTests
    .map((t, i) => `
      <div class="example">
        <div class="example-head">Example ${i + 1}${t.note ? ` <span class="example-note">— ${esc(t.note)}</span>` : ''}</div>
        <div class="example-row"><span>Input</span><code>${esc(t.inputs.map((v) => fmtValue(v)).join(', '))}</code></div>
        <div class="example-row"><span>Output</span><code>${esc(t.expected.map((v) => fmtValue(v)).join(', '))}</code></div>
      </div>`)
    .join('');

  const recovered = pstate.recovery[problem.id] || [];
  pels.recovery.classList.toggle('hidden', recovered.length === 0);
  pels.recovery.innerHTML = recovered.length ? `<details><summary>Recover an earlier draft (${recovered.length})</summary><p>This problem contract changed. The new starter is loaded and only this problem’s earlier completion was cleared.</p>${recovered.map((item,index) => `<section><header>Content version ${esc(item.contentVersion)}</header><pre>${esc(item.draft)}</pre><button type="button" data-restore-draft="${index}">Restore this draft for editing</button></section>`).join('')}</details>` : '';

  pels.codeBox.value = pstate.drafts[problem.id] !== undefined ? pstate.drafts[problem.id] : problem.starter;
  pels.codeBox.disabled = false;
  pels.btnCheck.disabled = false;
  pels.btnTrace.disabled = false;
  pels.btnReset.disabled = false;
  pels.errorBox.classList.add('hidden');

  pels.resultsScore.textContent = 'not checked yet';
  pels.resultsScore.className = 'results-score';
  pels.resultsBody.className = 'results-body muted';
  pels.resultsBody.innerHTML = 'Write your answer, then press <strong>Run Checks</strong>. Your pseudocode is run against every test case, including some you cannot see.';

  renderProblemMeta();
  renderProgress();
  selectMobilePanel('problem');
}

// ---------- events ----------

pels.codeBox.addEventListener('input', () => {
  if (!pstate.problem) return;
  pstate.drafts[pstate.problem.id] = pels.codeBox.value;
  saveProgress();
});

pels.btnCheck.addEventListener('click', () => {
  checkAnswer();
  if (window.matchMedia('(max-width: 700px)').matches) selectMobilePanel('results', true);
});

mobileTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectMobilePanel(tab.dataset.mobilePanel));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + mobileTabs.length) % mobileTabs.length;
    if (event.key === 'ArrowRight') next = (index + 1) % mobileTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = mobileTabs.length - 1;
    selectMobilePanel(mobileTabs[next].dataset.mobilePanel, true);
  });
});

pels.btnReset.addEventListener('click', () => {
  if (!pstate.problem) return;
  if (!confirm('Replace your code with the starting code for this problem?')) return;
  pels.codeBox.value = pstate.problem.starter;
  pstate.drafts[pstate.problem.id] = pels.codeBox.value;
  saveProgress();
});

pels.btnTrace.addEventListener('click', () => {
  try {
    localStorage.setItem(HANDOFF_KEY, pels.codeBox.value);
    window.location.href = 'tracer.html';
  } catch (e) { /* ignore */ }
});

pels.btnGrammar.addEventListener('click', () => pels.dlgGrammar.showModal());
pels.recovery.addEventListener('click', (event) => {
  const button = event.target.closest('[data-restore-draft]');
  if (!button || !pstate.problem) return;
  const recovered = pstate.recovery[pstate.problem.id]?.[Number(button.dataset.restoreDraft)];
  if (!recovered) return;
  pels.codeBox.value = recovered.draft;
  pstate.drafts[pstate.problem.id] = recovered.draft;
  pstate.solved[pstate.problem.id] = false;
  saveProgress(); renderProblemMeta(); renderProgress();
});

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.close).close());
});

document.querySelectorAll('dialog.dlg').forEach((dlg) => {
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
});

// ---------- init ----------

loadProgress();
if (!requestedIsOpen) {
  document.querySelector('.layout').innerHTML = ITCC47CurriculumUI.lockedPanel(requestedRelease, { title: `${requestedProblemRecord?.title || requestedRelease.resource?.title || 'This problem'} is not released yet` });
  document.title = 'Locked resource · ITCC47';
} else if (moduleProblems.length) {
  selectProblem(moduleProblems.find((problem) => problem.id === requestedProblem) || moduleProblems[0]);
} else {
  window.location.replace('problems.html');
}
