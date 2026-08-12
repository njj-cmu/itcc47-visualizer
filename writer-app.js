/* Outliner-style editor for plain-language algorithms, with live checks. */

const STORAGE_KEY = 'itcc47.writer.v1';
const HANDOFF_KEY = 'itcc47.tracer.handoff';
const MAX_LEVEL = 6;

const wstate = {
  name: '',
  steps: [{ text: '', level: 0 }],
  findings: [],
  activeIndex: 0,
};

const wels = {
  presetList: document.getElementById('preset-list'),
  nameInput: document.getElementById('algo-name'),
  nameDisplay: document.getElementById('algo-name-display'),
  stepsBox: document.getElementById('steps'),
  checksBox: document.getElementById('checks'),
  btnAdd: document.getElementById('btn-add'),
  btnClear: document.getElementById('btn-clear'),
  btnCopy: document.getElementById('btn-copy'),
  btnToTracer: document.getElementById('btn-to-tracer'),
  toast: document.getElementById('toast'),
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showToast(msg) {
  wels.toast.textContent = msg;
  wels.toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => wels.toast.classList.add('hidden'), 2600);
}

// ---------- persistence ----------

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: wstate.name, steps: wstate.steps }));
  } catch (e) { /* storage may be unavailable on file:// in some browsers */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.steps) || data.steps.length === 0) return false;
    wstate.name = data.name || '';
    wstate.steps = data.steps.map((s) => ({ text: String(s.text || ''), level: Math.max(0, Math.min(MAX_LEVEL, s.level | 0)) }));
    return true;
  } catch (e) { return false; }
}

// ---------- numbering ----------

function computeNumbers(steps) {
  const counters = [];
  return steps.map((s) => {
    const lvl = s.level;
    counters.length = lvl + 1;
    counters[lvl] = (counters[lvl] || 0) + 1;
    return counters.slice(0, lvl + 1).map((n) => n || 1).join('.');
  });
}

// ---------- block helpers (a step plus its sub-steps) ----------

function blockEnd(i) {
  const lvl = wstate.steps[i].level;
  let j = i + 1;
  while (j < wstate.steps.length && wstate.steps[j].level > lvl) j++;
  return j;
}

// ---------- rendering ----------

const TYPE_LABEL = {
  input: 'input', output: 'output', decision: 'decision',
  loop: 'loop', terminal: 'stop', action: 'action', empty: '',
};

function fullRender(focusIndex, caretAtEnd) {
  const numbers = computeNumbers(wstate.steps);
  wels.stepsBox.innerHTML = '';

  wstate.steps.forEach((step, i) => {
    const row = document.createElement('div');
    row.className = 'step-row';
    row.dataset.idx = String(i);
    row.style.marginLeft = `${step.level * 26}px`;

    const num = document.createElement('span');
    num.className = 'step-num';
    num.textContent = numbers[i];

    const ta = document.createElement('textarea');
    ta.className = 'step-input';
    ta.rows = 1;
    ta.spellcheck = false;
    ta.value = step.text;
    ta.placeholder = i === 0 ? 'Read the number of overdue days' : '';
    ta.setAttribute('aria-label', `Step ${numbers[i]}`);
    ta.addEventListener('input', onInput);
    ta.addEventListener('keydown', onKeyDown);
    ta.addEventListener('focus', () => { wstate.activeIndex = i; });

    const badge = document.createElement('span');
    badge.className = 'badge';

    const flag = document.createElement('span');
    flag.className = 'step-flag';

    row.appendChild(num);
    row.appendChild(ta);
    row.appendChild(badge);
    row.appendChild(flag);
    wels.stepsBox.appendChild(row);
    autoSize(ta);
  });

  softUpdate();

  if (focusIndex !== undefined && focusIndex !== null) {
    const ta = wels.stepsBox.querySelector(`.step-row[data-idx="${focusIndex}"] .step-input`);
    if (ta) {
      ta.focus();
      const pos = caretAtEnd ? ta.value.length : 0;
      ta.setSelectionRange(pos, pos);
      wstate.activeIndex = focusIndex;
    }
  }
}

/** Recompute types + checks and refresh badges/flags without rebuilding inputs. */
function softUpdate() {
  wstate.findings = analyzeAlgorithm(wstate.steps);

  const byStep = new Map();
  wstate.findings.forEach((f) => {
    if (!byStep.has(f.stepIndex)) byStep.set(f.stepIndex, []);
    byStep.get(f.stepIndex).push(f);
  });

  wstate.steps.forEach((step, i) => {
    const row = wels.stepsBox.querySelector(`.step-row[data-idx="${i}"]`);
    if (!row) return;
    const type = detectType(step.text);
    const badge = row.querySelector('.badge');
    badge.className = `badge badge-${type}`;
    badge.textContent = TYPE_LABEL[type] || '';

    const flag = row.querySelector('.step-flag');
    const fs = byStep.get(i) || [];
    if (fs.length === 0) {
      flag.textContent = '';
      flag.className = 'step-flag';
      flag.removeAttribute('tabindex');
      flag.removeAttribute('aria-label');
    } else {
      const worst = fs.some((f) => f.severity === 'error') ? 'error'
        : fs.some((f) => f.severity === 'warning') ? 'warning' : 'review';
      flag.textContent = worst === 'error' ? '!' : '?';
      flag.className = `step-flag flag-${worst}`;
      // reachable by keyboard; the rich tooltip is bound by delegation below
      flag.tabIndex = 0;
      flag.setAttribute('aria-label', fs.map((f) => `${f.characteristic}: ${f.message} ${f.hint || ''}`.trim()).join(' '));
    }
  });

  renderChecks();
  wels.nameDisplay.textContent = wstate.name.trim() || 'Untitled algorithm';
  save();
}

function renderChecks() {
  wels.checksBox.innerHTML = '';
  CHARACTERISTICS.forEach((c) => {
    const items = wstate.findings.filter((f) => f.characteristic === c.name);
    const card = document.createElement('div');
    card.className = 'check-card';

    let status, statusText;
    if (c.manual) {
      status = 'manual';
      statusText = 'check by tracing';
    } else if (items.some((f) => f.severity === 'error')) {
      status = 'error';
      statusText = `${items.length} to fix`;
    } else if (items.length > 0) {
      status = items.some((f) => f.severity === 'warning') ? 'warning' : 'review';
      statusText = `${items.length} to review`;
    } else {
      status = 'ok';
      statusText = 'looks fine';
    }

    const head = document.createElement('div');
    head.className = 'check-head';
    head.innerHTML = `<span class="dot dot-${status}"></span><strong>${c.name}</strong><span class="check-status">${statusText}</span>`;
    card.appendChild(head);

    const blurb = document.createElement('p');
    blurb.className = 'check-blurb';
    blurb.textContent = c.blurb;
    card.appendChild(blurb);

    if (c.manual) {
      const note = document.createElement('p');
      note.className = 'check-blurb check-manual';
      note.innerHTML = 'No tool can confirm this by reading the words. Convert the algorithm to pseudocode and <a href="tracer.html">trace it with sample input</a>.';
      card.appendChild(note);
    }

    const numbers = computeNumbers(wstate.steps);
    items.forEach((f) => {
      const item = document.createElement('button');
      item.className = `check-item check-${f.severity}`;
      item.innerHTML = `<span class="check-step">Step ${numbers[f.stepIndex] || '?'}</span> ${esc(f.message)}${f.hint ? `<span class="check-hint">${esc(f.hint)}</span>` : ''}`;
      item.addEventListener('click', () => focusStep(f.stepIndex));
      card.appendChild(item);
    });

    wels.checksBox.appendChild(card);
  });
}

const SEVERITY_LABEL = { error: 'Fix', warning: 'Check', review: 'Review' };

/** Rich tooltip body for a step's flag marker. */
function flagTooltipHtml(stepIndex) {
  const items = wstate.findings.filter((f) => f.stepIndex === stepIndex);
  if (items.length === 0) return null;
  const numbers = computeNumbers(wstate.steps);
  const head = `<div class="tip-head">Step ${numbers[stepIndex] || '?'}</div>`;
  const body = items.map((f) => `
    <div class="tip-item tip-${f.severity}">
      <div class="tip-item-head">
        <span class="tip-badge tip-badge-${f.severity}">${SEVERITY_LABEL[f.severity] || f.severity}</span>
        <span class="tip-char">${esc(f.characteristic)}</span>
      </div>
      <p class="tip-msg">${esc(f.message)}</p>
      ${f.hint ? `<p class="tip-hint">${esc(f.hint)}</p>` : ''}
    </div>`).join('');
  return head + body;
}

Tooltip.bind(wels.stepsBox, '.step-flag', (el) => {
  const row = el.closest('.step-row');
  if (!row) return null;
  return flagTooltipHtml(Number(row.dataset.idx));
});

function focusStep(i) {
  const row = wels.stepsBox.querySelector(`.step-row[data-idx="${i}"]`);
  if (!row) return;
  const ta = row.querySelector('.step-input');
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
  row.classList.add('flash');
  setTimeout(() => row.classList.remove('flash'), 900);
}

function autoSize(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight}px`;
}

// ---------- editing ----------

function onInput(e) {
  const idx = Number(e.target.closest('.step-row').dataset.idx);
  wstate.steps[idx].text = e.target.value;
  autoSize(e.target);
  softUpdate();
}

function onKeyDown(e) {
  const row = e.target.closest('.step-row');
  const idx = Number(row.dataset.idx);
  const ta = e.target;

  if (e.key === 'Enter') {
    e.preventDefault();
    const end = blockEnd(idx);
    wstate.steps.splice(end, 0, { text: '', level: wstate.steps[idx].level });
    fullRender(end, false);
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const delta = e.shiftKey ? -1 : 1;
    const end = blockEnd(idx);
    const cur = wstate.steps[idx].level;
    if (delta > 0) {
      const maxLevel = idx === 0 ? 0 : Math.min(wstate.steps[idx - 1].level + 1, MAX_LEVEL);
      if (cur >= maxLevel) return;
    } else if (cur === 0) {
      return;
    }
    for (let k = idx; k < end; k++) {
      wstate.steps[k].level = Math.max(0, Math.min(MAX_LEVEL, wstate.steps[k].level + delta));
    }
    fullRender(idx, true);
    return;
  }

  if (e.key === 'Backspace' && ta.value === '' && wstate.steps.length > 1) {
    e.preventDefault();
    wstate.steps.splice(idx, 1);
    fullRender(Math.max(0, idx - 1), true);
    return;
  }

  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    moveBlock(idx, e.key === 'ArrowUp' ? -1 : 1);
    return;
  }

  if (e.key === 'ArrowUp' && ta.selectionStart === 0 && idx > 0) {
    e.preventDefault();
    focusStep(idx - 1);
    return;
  }

  if (e.key === 'ArrowDown' && ta.selectionStart === ta.value.length && idx < wstate.steps.length - 1) {
    e.preventDefault();
    focusStep(idx + 1);
  }
}

function moveBlock(idx, dir) {
  const end = blockEnd(idx);
  const block = wstate.steps.slice(idx, end);

  if (dir === -1) {
    if (idx === 0) return;
    // find the start of the previous sibling-or-any block
    let prev = idx - 1;
    while (prev > 0 && wstate.steps[prev].level > wstate.steps[idx].level) prev--;
    wstate.steps.splice(idx, block.length);
    wstate.steps.splice(prev, 0, ...block);
    fullRender(prev, true);
  } else {
    if (end >= wstate.steps.length) return;
    const nextEnd = blockEnd(end);
    wstate.steps.splice(idx, block.length);
    const insertAt = nextEnd - block.length;
    wstate.steps.splice(insertAt, 0, ...block);
    fullRender(insertAt, true);
  }
}

// ---------- export ----------

function toPlainText() {
  const numbers = computeNumbers(wstate.steps);
  const title = wstate.name.trim() || 'Untitled algorithm';
  const body = wstate.steps
    .map((s, i) => `${'    '.repeat(s.level)}${numbers[i]}. ${s.text}`)
    .join('\n');
  return `${title}\n\n${body}\n`;
}

/** Structure-only pseudocode scaffold: correct block keywords, prose left intact. */
function toSkeleton() {
  const root = buildTree(wstate.steps);
  const out = [
    '# Skeleton generated from the Algorithm Writer.',
    '# The block structure is correct; replace the plain-language',
    '# conditions and actions with real expressions before running.',
    '',
  ];

  const pad = (n) => '    '.repeat(n);

  const splitCondition = (text) => {
    let t = text.trim().replace(/^(otherwise|else)\b[\s,:.]*/i, '');
    t = t.replace(/^(if|when|in case)\b[\s]*/i, '');
    const comma = t.indexOf(',');
    if (comma === -1) return { cond: t.replace(/[:.]\s*$/, ''), action: '' };
    return { cond: t.slice(0, comma).trim(), action: t.slice(comma + 1).trim() };
  };

  const emitAction = (text, indent) => {
    if (!text) return;
    if (/^(display|show|print|output|write|report)\b/i.test(text)) {
      out.push(`${pad(indent)}WRITE ${text.replace(/^(display|show|print|output|write|report)\b\s*/i, '')}`);
    } else if (/^(stop|halt|terminate|do not proceed)\b/i.test(text)) {
      out.push(`${pad(indent)}STOP`);
    } else {
      out.push(`${pad(indent)}# ${text}`);
    }
  };

  function emit(nodes, indent) {
    let i = 0;
    while (i < nodes.length) {
      const node = nodes[i];

      if (node.type === 'decision' && !isBranchContinuation(node.text)) {
        const group = [node];
        let j = i + 1;
        while (j < nodes.length && isBranchContinuation(nodes[j].text)) { group.push(nodes[j]); j++; }

        group.forEach((b, bi) => {
          const { cond, action } = splitCondition(b.text);
          if (bi === 0) out.push(`${pad(indent)}IF ${cond} THEN`);
          else if (isCatchAll(b.text)) out.push(`${pad(indent)}ELSE`);
          else out.push(`${pad(indent)}ELSE IF ${cond} THEN`);

          if (isCatchAll(b.text)) {
            const rest = b.text.trim().replace(/^(otherwise|else)\b[\s,:.]*/i, '');
            emitAction(rest, indent + 1);
          } else {
            emitAction(action, indent + 1);
          }
          emit(b.children, indent + 1);
        });

        out.push(`${pad(indent)}ENDIF`);
        i = j;
        continue;
      }

      if (node.type === 'loop') {
        const isWhile = /^\s*(while|repeat)\b/i.test(node.text);
        const rest = node.text.trim().replace(/^(for each|for every|for all|while|repeat|loop|do the following|keep)\b\s*/i, '').replace(/[:.]\s*$/, '');
        out.push(isWhile ? `${pad(indent)}WHILE ${rest} DO` : `${pad(indent)}FOR EACH ${rest} DO`);
        emit(node.children, indent + 1);
        out.push(isWhile ? `${pad(indent)}ENDWHILE` : `${pad(indent)}ENDFOR`);
        i++;
        continue;
      }

      if (node.type === 'input') {
        out.push(`${pad(indent)}READ ${node.text.trim().replace(/^(read|get|receive|ask|input|obtain|accept|prompt)\b\s*(for\s+)?/i, '')}`);
      } else if (node.type === 'output') {
        out.push(`${pad(indent)}WRITE ${node.text.trim().replace(/^(display|show|print|output|write|report)\b\s*/i, '')}`);
      } else if (node.type === 'terminal') {
        out.push(`${pad(indent)}STOP`);
      } else if (node.text.trim()) {
        out.push(`${pad(indent)}# ${node.text.trim()}`);
      }

      emit(node.children, indent + 1);
      i++;
    }
  }

  emit(root.children, 0);
  return out.join('\n');
}

// ---------- presets ----------

function buildPresetList() {
  WRITER_PRESETS.forEach((preset) => {
    const btn = document.createElement('button');
    btn.className = 'algo-btn';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      document.querySelectorAll('#preset-list .algo-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      wstate.name = preset.name;
      wstate.steps = preset.steps.map((s) => ({ ...s }));
      wels.nameInput.value = wstate.name;
      fullRender(0, true);
    });
    wels.presetList.appendChild(btn);
  });
}

// ---------- events ----------

wels.nameInput.addEventListener('input', () => {
  wstate.name = wels.nameInput.value;
  wels.nameDisplay.textContent = wstate.name.trim() || 'Untitled algorithm';
  save();
});

wels.btnAdd.addEventListener('click', () => {
  wstate.steps.push({ text: '', level: 0 });
  fullRender(wstate.steps.length - 1, true);
});

wels.btnClear.addEventListener('click', () => {
  if (!confirm('Clear all steps?')) return;
  wstate.steps = [{ text: '', level: 0 }];
  fullRender(0, true);
});

wels.btnCopy.addEventListener('click', async () => {
  const text = toPlainText();
  try {
    await navigator.clipboard.writeText(text);
    showToast('Algorithm copied to the clipboard.');
  } catch (e) {
    showToast('Copy failed — select the steps manually.');
  }
});

wels.btnToTracer.addEventListener('click', () => {
  const skeleton = toSkeleton();
  try {
    localStorage.setItem(HANDOFF_KEY, skeleton);
    window.location.href = 'tracer.html';
  } catch (e) {
    showToast('Could not hand off to the Tracer.');
  }
});

// ---------- init ----------

buildPresetList();
if (!load()) {
  wstate.name = WRITER_PRESETS[0].name;
  wstate.steps = WRITER_PRESETS[0].steps.map((s) => ({ ...s }));
  document.querySelector('#preset-list .algo-btn')?.classList.add('active');
}
wels.nameInput.value = wstate.name;
fullRender();
