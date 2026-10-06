import React, { useEffect, useRef, useState } from 'react';
import { MergeSortCanvas } from './merge-sort-canvas.jsx';
import { QuicksortCanvas } from './quicksort-canvas.jsx';
import { questionsFor } from './sorting-presentation.js';
import { useValueMotion } from './sorting-values.jsx';
import './sorting-workspace.css';

export function SortingInputs({ activity, inputs, setInputs, controller }) {
  let choices;
  try { choices = ITCC47Sorting.catalog(activity.programId, inputs.mode); }
  catch { return null; } // The workspace renders the verified reader's error.
  const change = next => { controller.pause(); controller.seek(0); setInputs(next); };
  return <div className="data-controls sorting-inputs">
    <label>Mode <select aria-label="Sorting mode" value={inputs.mode} onChange={e => change({ ...inputs, mode: e.target.value,
      fixture: e.target.value === 'full' ? 'default' : activity.programId === 'merge' ? 'root-pair' : 'root-partition' })}>
      <option value="full">Full sort</option><option value="helper">{activity.programId === 'merge' ? 'Learn the merge' : 'Learn the partition'}</option>
    </select></label>
    <label>Input <select aria-label="Sorting fixture" value={inputs.fixture} onChange={e => change({ ...inputs, fixture: e.target.value })}>
      {choices.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
    </select></label>
    <span>Python · supported presets · predict, then Step</span>
  </div>;
}

function PythonSource({ fixture, event }) {
  const [status, setStatus] = useState('');
  const code = useRef(null);
  useEffect(() => {
    const active = code.current?.querySelector('.is-current');
    if (active && code.current) {
      const top = active.offsetTop;
      if (top < code.current.scrollTop || top + active.offsetHeight > code.current.scrollTop + code.current.clientHeight) {
        code.current.scrollTop = Math.max(0, top - code.current.clientHeight / 3);
      }
    }
  }, [event.id]);
  async function copy() {
    try { await navigator.clipboard.writeText(fixture.source); setStatus('Python copied.'); }
    catch {
      const area = document.createElement('textarea');
      area.value = fixture.source; area.setAttribute('aria-label', 'Copy Python source');
      area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select();
      const copied = document.execCommand('copy'); area.remove();
      setStatus(copied ? 'Python copied.' : 'Select the Python text to copy it.');
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([fixture.source], { type: 'text/x-python;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${fixture.program}-${fixture.mode}-${fixture.fixtureId}.py`; link.click();
    URL.revokeObjectURL(url);
  }
  return <section className="sort-panel sorting-source source-panel" aria-label="Python source">
    <header><h2>Python source</h2><span>{event.source?.owner || 'Driver complete'}</span></header>
    <div className="sorting-source-actions"><button type="button" onClick={copy}>Copy Python</button><button type="button" onClick={download}>Download Python</button></div>
    <span className="sort-copy-status" role="status">{status}</span>
    <div className="sorting-code" ref={code} tabIndex="0" aria-label="Scrollable Python source">
      {fixture.source.trimEnd().split('\n').map((line, index) => <div key={index} className={'source-line' + (event.source?.line === index + 1 ? ' is-current' : '')}
        aria-current={event.source?.line === index + 1 ? 'step' : undefined}><span aria-hidden="true">{index + 1}</span><code>{line}</code></div>)}
    </div>
    <p className="sort-source-phase">{event.source ? `Line ${event.source.line} · ${event.source.phase.replaceAll('-', ' ')}` : 'Complete · no current instruction'}</p>
  </section>;
}

function Predictions({ fixture, events, controller }) {
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const questions = questionsFor(fixture);
  return <details className="sort-panel sorting-predictions" id="sorting-predictions"><summary>What happens next? · optional predictions</summary>
    <p>Pause at a real operation, predict, then observe. Choices are not grades and do not change execution.</p>
    {questions.length ? questions.map(question => <fieldset key={question.id}><legend>{question.question}</legend>
      <button type="button" onClick={() => controller.seek(events.findIndex(event => event.id.endsWith(':' + question.at)))}>Go to this checkpoint</button>
      <div className="sort-answer-options">{question.options.map(option => <label key={option}><input type="radio" name={'sorting-question-' + question.id}
        checked={answers[question.id] === option} onChange={() => setAnswers(current => ({ ...current, [question.id]: option }))}/>{option}</label>)}</div>
      <button type="button" onClick={() => setRevealed(current => ({ ...current, [question.id]: true }))}>Reveal explanation</button>
      {revealed[question.id] ? <p role="status">{question.explanation}</p> : null}
    </fieldset>) : <p>This base fixture has no comparison to predict. Switch to a larger input to explore one.</p>}
  </details>;
}

function Details({ fixture, frame, event, inputs, setInputs, controller }) {
  const [selected, setSelected] = useState(null);
  const [packStatus, setPackStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const abort = useRef(null);
  useEffect(() => () => abort.current?.abort(), []);
  const history = frame.history.find(row => row.callId === selected);
  const historical = history ? fixture.events.find(row => row.eventId === history.eventId) : null;
  const inspectedFrame = historical ? { ...historical.frame, objects: fixture.heaps[historical.frame.heapVersion], items: fixture.items } : frame;
  const call = historical?.frame.focus || frame.focus;
  async function saveOffline() {
    if (location.protocol === 'file:') { setPackStatus('This local folder contains the sorting source and fixtures.'); return; }
    abort.current = new AbortController();
    const signal = abort.current.signal;
    setSaving(true); setPackStatus('Checking download size…');
    try {
      const prefix = 'activity-packs/' + BSIT_SORTING_PACK_PATH + '/';
      const response = await fetch(new URL(prefix + 'sorting-manifest.json', location.href), { signal });
      if (!response.ok) throw new Error('Manifest unavailable');
      const manifest = await response.json();
      if (manifest.schemaVersion !== 1 || 'sorting-' + manifest.revision !== BSIT_SORTING_PACK_PATH
        || manifest.id !== 'python-sorting' || manifest.cacheName !== 'bsit-learning-lab-optional-packs-v1'
        || !Number.isSafeInteger(manifest.bytes) || manifest.bytes <= 0 || manifest.files.length !== 4
        || !manifest.files.every(file => file.startsWith(prefix) && !file.includes('..'))) throw new Error('Incompatible pack manifest');
      if (!window.confirm(`Download ${manifest.title} for offline use? ${manifest.bytes.toLocaleString()} bytes (${(manifest.bytes / 1024 / 1024).toFixed(2)} MiB).`)) {
        setPackStatus('Download canceled. Existing installed packs are unchanged.'); return;
      }
      setPackStatus('Saving sorting for offline use…');
      const cache = await caches.open(manifest.cacheName);
      // Cache.addAll commits the batch atomically. Aborted/failed installs cannot
      // replace existing entries; content-revision paths also preserve old packs.
      await cache.addAll(manifest.files.map(file => new Request(new URL(file, location.href), { signal })));
      setPackStatus(`Saved for offline use · ${manifest.bytes.toLocaleString()} bytes`);
    } catch {
      setPackStatus(signal.aborted ? 'Download canceled. Existing installed packs are unchanged.' : 'Could not save this pack. Existing installed packs are unchanged; reconnect and retry.');
    } finally { setSaving(false); }
  }
  return <details className="sort-panel sorting-details"><summary>Details · calls, variables, costs and offline use</summary>
    <label className="sort-detail-toggle"><input type="checkbox" checked={Boolean(inputs.detailed)} onChange={e => { controller.pause(); setInputs({ ...inputs, detailed: e.target.checked }); }}/>
      Include call and assignment steps</label>
    <div className="sort-detail-grid">
      <section><h2>Call context</h2><p>{historical ? 'Inspecting a completed call. The active board and Python instruction stay at the selected playback event.' : 'Following the active operation.'}</p>
        {historical ? <button type="button" onClick={() => setSelected(null)}>Follow active operation</button> : null}
        <h3>{call.function} · {call.status}</h3>
        <dl className="sorting-locals">{Object.entries(call.locals).map(([name, tag]) => <div key={name}><dt>{name}</dt><dd data-local={name} data-kind={tag.kind}>{ITCC47Sorting.format(tag, inspectedFrame)}</dd></div>)}</dl>
        {call.pending ? <p>{call.pending.target} is pending at caller line {call.pending.line}; its current binding is unchanged until the call returns.</p> : null}
        {frame.returnTransfer ? <p data-return-transfer>Return from {frame.returnTransfer.returnOrigin.function} line {frame.returnTransfer.returnOrigin.line}; caller continues at line {frame.returnTransfer.callSite}.</p> : null}
      </section>
      <section><h2>Live calls</h2><ol>{frame.stack.map(row => <li key={row.id}>{row.function} · {row.status}{row.callSite ? ' · called at line ' + row.callSite : ''}</li>)}</ol>{!frame.stack.length ? <p>The driver is outside function depth.</p> : null}
        <h3>Completed-call history</h3><div className="sorting-history">{frame.history.map(row => <button type="button" key={row.callId} onClick={() => setSelected(row.callId)}>Inspect {row.callId}</button>)}</div>
      </section>
    </div>
    <section className="sorting-costs"><h2>Work counts and costs</h2><dl>{Object.entries(event.metrics).map(([name, value]) => <div key={name}><dt>{({ keyComparisons: 'Key comparisons', resultAppends: 'Result appends', swapStatements: 'Swap statements', selfSwaps: 'Self-swaps', exchanges: 'Swaps (distinct positions)', sortCalls: 'Sorting calls', helperCalls: 'Helper calls', peakFunctionDepth: 'Peak function depth', peakSortDepth: 'Peak sorting-call depth' })[name]}</dt><dd>{value}</dd></div>)}</dl>
      {fixture.program === 'merge' ? <p>Top-down Merge Sort takes O(n log n) time for nontrivial inputs, O(n) peak auxiliary algorithm storage and O(log n) sorting-call depth. Slices copy references: O(n log n) total copying across levels is not O(n log n) peak memory.</p>
        : <p>Lomuto partition uses O(1) extra storage. Balanced partitions give O(n log n) time and O(log n) stack; average O(n log n) assumes a distribution such as random permutations of distinct keys. This fixed last-element pivot has O(n²) worst time and O(n) worst stack. Sorted, reverse and equal eight-key inputs perform 7 + 6 + … + 1 = 28 comparisons and reach depth 8.</p>}
      <p>Swaps counts exchanges between distinct positions, even for different equal-key occurrences. Self-swaps execute a statement but add no exchange. Appends, swaps, calls and UI steps measure different work; they are not a timing benchmark. Observer snapshots are not algorithm memory.</p>
    </section>
    <section className="sorting-offline"><h2>Offline use</h2><button type="button" disabled={saving} onClick={saveOffline}>Download for offline use</button>
      {saving ? <button type="button" onClick={() => abort.current?.abort()}>Cancel download</button> : null}<p role="status">{packStatus}</p>
      <small>Opening this route loads its optional assets for this visit. Explicit installation saves this revision for offline use.</small>
    </section>
  </details>;
}

export function SortingWorkspace({ activity, inputs, setInputs, result, event, controller, state, playback, motionPreference, duration, onEntityComplete }) {
  const [tab, setTab] = useState('canvas');
  const tablist = useRef(null);
  const canvas = useRef(null);
  useValueMotion(canvas, event, state, motionPreference.mode, duration, onEntityComplete);
  if (!event) return <section className="sort-panel" role="alert">{result.error || 'The verified sorting trace is unavailable.'}</section>;
  const fixture = activity.fixtureFor(inputs);
  const frame = event.frame;
  const c = frame.comparison;
  const formatted = tag => ITCC47Sorting.format(tag, frame);
  function tabKeys(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 'canvas' : e.key === 'End' ? 'source' : tab === 'canvas' ? 'source' : 'canvas';
    setTab(next); tablist.current.querySelector('#sorting-tab-' + next)?.focus();
  }
  return <div className="sorting-workspace" data-event-id={event.id} data-event-kind={frame.eventKind} data-fixture-id={fixture.fixtureId}
    data-mode={fixture.mode} data-source-revision={fixture.sourceRevision} data-raw-index={frame.rawIndex} data-trace-identity={fixture.identity}>
    <div className="sorting-tabs" role="tablist" aria-label="Sorting workspace view" ref={tablist} onKeyDown={tabKeys}>
      {['canvas', 'source'].map(id => <button type="button" key={id} id={'sorting-tab-' + id} role="tab" aria-selected={tab === id}
        aria-controls={'sorting-surface-' + id} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>{id === 'canvas' ? 'Array view' : 'Python source'}</button>)}
    </div>
    {playback}
    <div className="sorting-grid">
      <section id="sorting-surface-canvas" className={'sort-panel sorting-canvas-surface ' + (tab === 'canvas' ? 'is-visible' : '')} aria-label="Sorting array board" ref={canvas}>
        <header className="sort-operation"><span>{fixture.mode === 'helper' ? activity.programId === 'merge' ? 'Learn the merge' : 'Learn the partition' : 'Full sort'}</span>
          <h2>{event.message}</h2>{c && ['COMPARE_HEADS', 'COMPARE_TO_PIVOT', 'APPEND_PENDING', 'APPEND_VALUE', 'BOUNDARY_ADVANCE_PENDING', 'SWAP_PENDING', 'SWAP_COMMIT', 'SELF_SWAP'].includes(frame.eventKind)
            ? <p className="sort-comparison"><code>{c.left} ≤ {c.right}</code><strong>{c.result ? 'True' : 'False'}</strong></p> : null}</header>
        <nav className="sorting-trail" aria-label="Active ancestor path">{frame.stack.filter(call => ['merge_sort', 'quick_sort'].includes(call.function)).map((call, index) => <span key={call.id}>{index ? '› ' : ''}{call.function === 'merge_sort' ? formatted(call.locals.values) : `[${call.locals.low.value}, ${call.locals.high.value}]`}</span>)}{!frame.stack.length ? <span>Driver</span> : null}</nav>
        {fixture.program === 'merge' ? <MergeSortCanvas frame={frame}/> : <QuicksortCanvas frame={frame} fixture={fixture}/>}
        <div className="sorting-summary"><span>Comparisons <strong data-count="comparisons">{event.metrics.keyComparisons}</strong></span>
          <span>{fixture.program === 'merge' ? 'Appends' : 'Swaps'} <strong data-count="writes">{fixture.program === 'merge' ? event.metrics.resultAppends : event.metrics.exchanges}</strong></span>
          <span>{fixture.program === 'merge' ? 'Across all helper results' : 'Distinct-position exchanges'}</span></div>
        <div className="sorting-output"><div><h3>Driver call result</h3><p data-sorting-result>{formatted(frame.callResult)}</p></div>
          <div><h3>stdout · printed text</h3>{frame.stdout ? <pre data-sorting-stdout>{frame.stdout}</pre> : <p data-sorting-stdout>No output yet.</p>}</div></div>
      </section>
      <div id="sorting-surface-source" className={'sorting-source-surface ' + (tab === 'source' ? 'is-visible' : '')}><PythonSource fixture={fixture} event={event}/></div>
    </div>
    <Details fixture={fixture} frame={frame} event={event} inputs={inputs} setInputs={setInputs} controller={controller}/>
    <Predictions fixture={fixture} events={result.events} controller={controller}/>
    <details className="sort-panel sorting-contrast"><summary>Merge Sort and Quicksort: when does the work happen?</summary>
      <p>Merge Sort splits, sorts left, sorts right, then merges the returned runs. It is stable with ≤ and returns a separate result. Quicksort partitions first, then sorts the ranges on either side of the placed pivot. It modifies one shared list, returns None and has no merge phase; this Lomuto variant is not stable.</p>
      <p>Trace four values by hand, then try the eight-value example. Run the downloaded Python locally to change the input. These textbook algorithms do not describe Python’s built-in sort.</p>
    </details>
    <nav className="sorting-next" aria-label="Sorting lesson sequence"><a href={ITCC47CurriculumUI.href('visualizer.html?activity=' + (fixture.program === 'merge' ? 'quick-sort' : 'stable-merge-sort'))}>{fixture.program === 'merge' ? 'Explore Lomuto quicksort →' : '← Explore stable merge sort'}</a><span>Module 5 · Divide and Conquer</span></nav>
  </div>;
}
