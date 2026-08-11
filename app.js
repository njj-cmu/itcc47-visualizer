/* UI wiring: sidebar selection, data entry, playback controls, chart + trace rendering. */

const state = {
  algoKey: 'bubble',
  baseArray: [],
  target: null,
  steps: [],
  stepIndex: 0,
  playing: false,
  playTimer: null,
};

const els = {
  sortingList: document.getElementById('sorting-list'),
  searchingList: document.getElementById('searching-list'),
  sizeSlider: document.getElementById('size-slider'),
  sizeValue: document.getElementById('size-value'),
  customInput: document.getElementById('custom-input'),
  applyCustom: document.getElementById('apply-custom'),
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
    btn.classList.toggle('active', btn.dataset.key === state.algoKey);
  });
}

function selectAlgorithm(key) {
  stopPlaying();
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
  state.stepIndex = 0;
  els.stepSlider.max = String(state.steps.length - 1);
  buildTraceTable();
  renderAll();
}

// ---------- chart ----------

function classifyIndex(i, highlight) {
  if (!highlight) return 'default';
  if (highlight.found === i) return 'found';
  if (highlight.swap && highlight.swap.includes(i)) return 'swap';
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
  const max = Math.max(...state.baseArray, 1);
  els.chart.innerHTML = '';
  step.array.forEach((value, i) => {
    const col = document.createElement('div');
    col.className = 'bar-col';

    const bar = document.createElement('div');
    const state_ = classifyIndex(i, step.highlight);
    bar.className = `bar bar-${state_}`;
    bar.style.height = `${(value / max) * 100}%`;

    const label = document.createElement('span');
    label.className = 'bar-value';
    label.textContent = value;
    bar.appendChild(label);

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
  const sorting = currentAlgo().category === 'sorting';
  els.traceHead.innerHTML = sorting
    ? '<tr><th>#</th><th>Description</th><th>Pass</th><th>Cmp</th><th>Swp</th></tr>'
    : '<tr><th>#</th><th>Description</th><th>Cmp</th></tr>';

  els.traceBody.innerHTML = '';
  state.steps.forEach((step, i) => {
    const tr = document.createElement('tr');
    tr.id = `trace-row-${i}`;
    tr.addEventListener('click', () => {
      stopPlaying();
      state.stepIndex = i;
      renderAll();
    });
    if (sorting) {
      tr.innerHTML = `<td>${i}</td><td>${step.description}</td><td>${step.stats.pass ?? '—'}</td><td>${step.stats.comparisons}</td><td>${step.stats.swaps}</td>`;
    } else {
      tr.innerHTML = `<td>${i}</td><td>${step.description}</td><td>${step.stats.comparisons}</td>`;
    }
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

  if (algo.category === 'sorting') {
    els.algoSubtitle.textContent = `Pass ${step.stats.pass ?? '—'} · Comparisons ${step.stats.comparisons} · Swaps ${step.stats.swaps}`;
  } else {
    els.algoSubtitle.textContent = `Target ${state.target} · Comparisons ${step.stats.comparisons}`;
  }

  renderChart(step);
  els.resultCaption.textContent = step.description;
  els.stepSlider.value = String(state.stepIndex);
  els.stepCounter.textContent = `${state.stepIndex} / ${state.steps.length - 1}`;
  updateTraceHighlight();

  const atEnd = state.stepIndex >= state.steps.length - 1;
  els.btnStep.disabled = atEnd;
  els.btnPlay.disabled = atEnd;
  els.btnFinish.disabled = atEnd;
  if (atEnd) stopPlaying();
}

// ---------- playback ----------

function stepForward() {
  if (state.stepIndex < state.steps.length - 1) {
    state.stepIndex++;
    renderAll();
  } else {
    stopPlaying();
  }
}

function finishSegment() {
  stopPlaying();
  let i = state.stepIndex;
  while (i < state.steps.length - 1 && !state.steps[i].passEnd && !state.steps[i].final) {
    i++;
  }
  state.stepIndex = i;
  renderAll();
}

function speedDelay() {
  const level = Number(els.speedSlider.value);
  return 1100 - level * 100;
}

function startPlaying() {
  if (state.stepIndex >= state.steps.length - 1) return;
  state.playing = true;
  els.btnPlay.textContent = 'Pause';
  state.playTimer = setInterval(() => {
    stepForward();
    if (state.stepIndex >= state.steps.length - 1) stopPlaying();
  }, speedDelay());
}

function stopPlaying() {
  state.playing = false;
  els.btnPlay.textContent = 'Play';
  if (state.playTimer) {
    clearInterval(state.playTimer);
    state.playTimer = null;
  }
}

function togglePlaying() {
  if (state.playing) stopPlaying();
  else startPlaying();
}

// ---------- events ----------

els.sizeSlider.addEventListener('input', () => {
  els.sizeValue.textContent = els.sizeSlider.value;
});
els.sizeSlider.addEventListener('change', () => {
  stopPlaying();
  state.target = null;
  setArray(randomArray(Number(els.sizeSlider.value)));
});

els.applyCustom.addEventListener('click', () => {
  const parsed = els.customInput.value
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n));
  if (parsed.length < 2) {
    alert('Enter at least 2 numeric values, separated by commas.');
    return;
  }
  const clamped = parsed.slice(0, 24);
  stopPlaying();
  els.sizeSlider.value = String(clamped.length);
  els.sizeValue.textContent = clamped.length;
  state.target = null;
  setArray(clamped);
});

els.targetInput.addEventListener('change', () => {
  const v = parseInt(els.targetInput.value, 10);
  if (!Number.isNaN(v)) {
    state.target = v;
    stopPlaying();
    recompute();
  }
});

els.randomTarget.addEventListener('click', () => {
  const pickExisting = Math.random() < 0.7;
  state.target = pickExisting
    ? state.baseArray[Math.floor(Math.random() * state.baseArray.length)]
    : Math.floor(Math.random() * 99) + 5;
  els.targetInput.value = state.target;
  stopPlaying();
  recompute();
});

els.btnShuffle.addEventListener('click', () => {
  stopPlaying();
  state.target = null;
  setArray(randomArray(Number(els.sizeSlider.value)));
});

els.btnPlay.addEventListener('click', togglePlaying);
els.btnStep.addEventListener('click', () => {
  stopPlaying();
  stepForward();
});
els.btnFinish.addEventListener('click', finishSegment);

els.stepSlider.addEventListener('input', () => {
  stopPlaying();
  state.stepIndex = Number(els.stepSlider.value);
  renderAll();
});

// ---------- init ----------

buildSidebar();
selectAlgorithm('bubble');
setArray(randomArray(Number(els.sizeSlider.value)));
