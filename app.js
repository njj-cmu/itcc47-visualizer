/* UI wiring: sidebar selection, data entry, playback controls, chart + trace rendering. */

const state = {
  algoKey: 'bubble',
  baseArray: [],
  target: null,
  steps: [],
  stepIndex: 0,
};

const MAX_VISUAL_VALUES = 18;

const els = {
  sortingList: document.getElementById('sorting-list'),
  searchingList: document.getElementById('searching-list'),
  sizeSlider: document.getElementById('size-slider'),
  sizeValue: document.getElementById('size-value'),
  customInput: document.getElementById('custom-input'),
  applyCustom: document.getElementById('apply-custom'),
  dataError: document.getElementById('data-error'),
  targetField: document.getElementById('target-field'),
  targetInput: document.getElementById('target-input'),
  randomTarget: document.getElementById('random-target'),
  speedSlider: document.getElementById('speed-slider'),
  algoTitle: document.getElementById('algo-title'),
  algoSubtitle: document.getElementById('algo-subtitle'),
  algoBlurb: document.getElementById('algo-blurb'),
  complexityBox: document.getElementById('complexity-box'),
  chart: document.getElementById('chart'),
  resultCaption: document.getElementById('result-caption'),
  stepSlider: document.getElementById('step-slider'),
  stepCounter: document.getElementById('step-counter'),
  btnShuffle: document.getElementById('btn-shuffle'),
  btnPlay: document.getElementById('btn-play'),
  btnStep: document.getElementById('btn-step'),
  btnFinish: document.getElementById('btn-finish'),
  traceHead: document.getElementById('trace-head'),
  traceBody: document.getElementById('trace-body'),
};

const playback = ITCC47Playback.createController({
  speed: Number(els.speedSlider.value),
  delayForSpeed: (level) => 1100 - level * 100,
  onChange(playbackState) {
    state.stepIndex = playbackState.index;
    els.btnPlay.textContent = playbackState.status === 'playing' ? 'Pause' : 'Play';
    if (playbackState.currentEvent) renderAll();
  },
});

// ---------- data helpers ----------

function randomArray(size, min = 5, max = 99) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

function setArray(arr) {
  state.baseArray = arr;
  if (currentAlgo().needsTarget && state.target === null) {
    state.target = arr[Math.floor(Math.random() * arr.length)];
    els.targetInput.value = state.target;
  }
  recompute();
}

function showDataError(message) {
  els.dataError.textContent = message;
  els.dataError.classList.toggle('hidden', !message);
}

function currentAlgo() {
  return ALGORITHMS[state.algoKey];
}

// ---------- sidebar ----------

function buildSidebar() {
  const cats = { sorting: els.sortingList, searching: els.searchingList };
  Object.entries(ALGORITHMS).forEach(([key, algo]) => {
    const btn = document.createElement('button');
    btn.className = 'algo-btn';
    btn.textContent = algo.name;
    btn.dataset.key = key;
    btn.addEventListener('click', () => selectAlgorithm(key));
    cats[algo.category].appendChild(btn);
  });
  updateSidebarActive();
}

function updateSidebarActive() {
  document.querySelectorAll('.algo-btn').forEach((btn) => {
    const selected = btn.dataset.key === state.algoKey;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
}

function selectAlgorithm(key) {
  playback.pause(false);
  state.algoKey = key;
  updateSidebarActive();
  const algo = currentAlgo();
  els.targetField.classList.toggle('hidden', !algo.needsTarget);
  els.btnFinish.textContent = algo.category === 'sorting' ? 'Finish pass' : 'Jump to result';
  if (algo.needsTarget && (state.target === null || !state.baseArray.includes(state.target))) {
    state.target = state.baseArray[Math.floor(Math.random() * state.baseArray.length)];
    els.targetInput.value = state.target;
  }
  recompute();
}

// ---------- run + recompute ----------

function recompute() {
  const algo = currentAlgo();
  state.steps = algo.run(state.baseArray, state.target);
  els.stepSlider.max = String(state.steps.length - 1);
  buildTraceTable();
  playback.load(state.steps);
}

// ---------- chart ----------

function classifyIndex(i, highlight) {
  if (!highlight) return 'default';
  if (highlight.found === i) return 'found';
  if (highlight.swap && highlight.swap.includes(i)) return 'swap';
  if (highlight.move && highlight.move.includes(i)) return 'move';
  if (highlight.compare && highlight.compare.includes(i)) return 'compare';
  if (highlight.mid === i) return 'mid';
  if (highlight.active && highlight.active.includes(i)) return 'active';
  if (highlight.range) {
    return i < highlight.range[0] || i > highlight.range[1] ? 'eliminated' : 'in-range';
  }
  if (highlight.sorted && highlight.sorted.includes(i)) return 'sorted';
  return 'default';
}

function renderChart(step) {
  const values = step.frame.array;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = Math.max(max - min, 1);
  const zeroPct = ((0 - min) / range) * 100;
  els.chart.innerHTML = '';
  const zero = document.createElement('div');
  zero.className = 'chart-zero';
  zero.style.bottom = `${zeroPct}%`;
  zero.setAttribute('aria-hidden', 'true');
  els.chart.appendChild(zero);

  values.forEach((value, i) => {
    const col = document.createElement('div');
    col.className = 'bar-col';

    const bar = document.createElement('div');
    const state_ = classifyIndex(i, step.frame.highlight);
    bar.className = `bar bar-${state_}`;
    bar.classList.add(value < 0 ? 'bar-negative' : 'bar-positive');
    const heightPct = (Math.abs(value) / range) * 100;
    bar.style.height = `${Math.max(heightPct, value === 0 ? 1 : 0)}%`;
    bar.style.bottom = `${value >= 0 ? zeroPct : zeroPct - heightPct}%`;

    const label = document.createElement('span');
    label.className = 'bar-value';
    label.textContent = value;
    bar.appendChild(label);
    bar.setAttribute('aria-label', `Index ${i}, value ${value}`);

    const idx = document.createElement('span');
    idx.className = 'bar-index';
    idx.textContent = i;

    col.appendChild(bar);
    col.appendChild(idx);
    els.chart.appendChild(col);
  });
}

// ---------- trace table ----------

function buildTraceTable() {
  const metrics = currentAlgo().metrics;
  els.traceHead.innerHTML = `<tr><th>#</th><th>Description</th>${metrics.map((m) => `<th title="${m.label}">${m.short}</th>`).join('')}</tr>`;

  els.traceBody.innerHTML = '';
  state.steps.forEach((step, i) => {
    const tr = document.createElement('tr');
    tr.id = `trace-row-${i}`;
    tr.addEventListener('click', () => {
      playback.seek(i);
    });
    tr.innerHTML = `<td>${i}</td><td>${step.message}</td>${metrics.map((m) => `<td>${step.metrics[m.key] ?? '—'}</td>`).join('')}`;
    els.traceBody.appendChild(tr);
  });
}

function updateTraceHighlight() {
  const prev = els.traceBody.querySelector('.current-row');
  if (prev) prev.classList.remove('current-row');
  const row = document.getElementById(`trace-row-${state.stepIndex}`);
  if (row) {
    row.classList.add('current-row');
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ---------- render ----------

function renderAll() {
  const algo = currentAlgo();
  const step = state.steps[state.stepIndex];

  els.algoTitle.textContent = algo.name;
  els.algoBlurb.textContent = algo.blurb;
  els.complexityBox.innerHTML = `
    <div class="complexity-item"><span>Best</span><strong>${algo.complexity.best}</strong></div>
    <div class="complexity-item"><span>Avg</span><strong>${algo.complexity.avg}</strong></div>
    <div class="complexity-item"><span>Worst</span><strong>${algo.complexity.worst}</strong></div>
    <div class="complexity-item"><span>Space</span><strong>${algo.complexity.space}</strong></div>
  `;

  const metricText = algo.metrics
    .filter((m) => m.key !== 'pass' || step.metrics[m.key] != null)
    .map((m) => `${m.label} ${step.metrics[m.key] ?? 0}`)
    .join(' · ');
  els.algoSubtitle.textContent = `${algo.needsTarget ? `Target ${state.target} · ` : ''}${metricText}`;

  renderChart(step);
  els.resultCaption.textContent = step.message;
  els.stepSlider.value = String(state.stepIndex);
  els.stepCounter.textContent = `${state.stepIndex} / ${state.steps.length - 1}`;
  updateTraceHighlight();

  const atEnd = playback.getState().atEnd;
  els.btnStep.disabled = atEnd;
  els.btnPlay.disabled = atEnd;
  els.btnFinish.disabled = atEnd;
}

// ---------- events ----------

els.sizeSlider.addEventListener('input', () => {
  els.sizeValue.textContent = els.sizeSlider.value;
});
els.sizeSlider.addEventListener('change', () => {
  playback.pause(false);
  state.target = null;
  setArray(randomArray(Number(els.sizeSlider.value)));
});

els.applyCustom.addEventListener('click', () => {
  const parts = els.customInput.value
    .split(/[,\s]+/)
    .filter(Boolean);
  if (parts.some((part) => !/^-?\d+$/.test(part))) {
    showDataError('Use whole numbers only, such as -4, 0, and 12.');
    return;
  }
  const parsed = parts.map(Number);
  if (parsed.length < 2) {
    showDataError('Enter at least 2 integer values, separated by commas or spaces.');
    return;
  }
  if (parsed.length > MAX_VISUAL_VALUES) {
    showDataError(`Use at most ${MAX_VISUAL_VALUES} values so every item remains readable.`);
    return;
  }
  showDataError('');
  playback.pause(false);
  els.sizeSlider.value = String(parsed.length);
  els.sizeValue.textContent = parsed.length;
  state.target = null;
  setArray(parsed);
});

els.targetInput.addEventListener('change', () => {
  const v = parseInt(els.targetInput.value, 10);
  if (!Number.isNaN(v)) {
    state.target = v;
    playback.pause(false);
    recompute();
  }
});

els.randomTarget.addEventListener('click', () => {
  const pickExisting = Math.random() < 0.7;
  state.target = pickExisting
    ? state.baseArray[Math.floor(Math.random() * state.baseArray.length)]
    : Math.floor(Math.random() * 99) + 5;
  els.targetInput.value = state.target;
  playback.pause(false);
  recompute();
});

els.btnShuffle.addEventListener('click', () => {
  playback.pause(false);
  state.target = null;
  setArray(randomArray(Number(els.sizeSlider.value)));
});

els.btnPlay.addEventListener('click', () => playback.toggle());
els.btnStep.addEventListener('click', () => {
  playback.step(1);
});
els.btnFinish.addEventListener('click', () => playback.finishSegment());

els.speedSlider.addEventListener('input', () => playback.setSpeed(els.speedSlider.value));

els.stepSlider.addEventListener('input', () => {
  playback.seek(Number(els.stepSlider.value));
});

// ---------- init ----------

buildSidebar();
selectAlgorithm('bubble');
setArray(randomArray(Number(els.sizeSlider.value)));
