import React, { useRef, useState } from 'react';
import './recursion-workspace.css';

const format = (value) => ITCC47Recursion.formatValue(value);
const callLabel = (frame) => frame ? frame.functionName + '(' + format(frame.locals.n) + ')' : 'driver';

export function RecursionInputs({ inputs, setInputs, controller }) {
  return <div className="data-controls recursion-fixtures">
    <label>Python fixture <select aria-label="Python fixture" value={inputs.n} onChange={(e) => {
      controller.pause(); setInputs({ n: Number(e.target.value) });
    }}>{ITCC47Recursion.PRESETS.map((n) => <option value={n} key={n}>n = {n}</option>)}</select></label>
    <span>Guided Python execution · supported presets · run your own code in local Python.</span>
  </div>;
}

function PythonSource({ source, event, filename }) {
  const [copyStatus, setCopyStatus] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(source); setCopyStatus('Python copied.'); }
    catch {
      const area = document.createElement('textarea');
      area.value = source; area.setAttribute('aria-label', 'Copy Python source');
      area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select();
      const copied = document.execCommand('copy'); area.remove();
      setCopyStatus(copied ? 'Python copied.' : 'Select the source to copy it.');
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/x-python;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    URL.revokeObjectURL(url);
  }
  const lines = source.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return <section className="recursion-panel recursion-source source-panel" aria-label="Python source">
    <header><h2>Python source</h2><span>{filename}</span></header>
    <div className="recursion-source-actions"><button type="button" onClick={copy}>Copy Python</button><button type="button" onClick={download}>Download Python</button><span role="status">{copyStatus}</span></div>
    <div className="recursion-code" tabIndex="0" aria-label="Scrollable Python source">
      {lines.map((line, i) => <div className={'source-line' + (event.source?.line === i + 1 ? ' is-current' : '')}
        aria-current={event.source?.line === i + 1 ? 'step' : undefined} key={i}><span aria-hidden="true">{i + 1}</span><code>{line}</code></div>)}
    </div>
    <p className="recursion-source-note">{event.source ? 'Line ' + event.source.line + ' · ' + event.source.phase.replaceAll('_', ' ') : event.terminal ? 'Execution complete; no current source instruction.' : 'No current source instruction.'}</p>
  </section>;
}

export function RecursionStack({ frame, inspectedId, onInspect }) {
  return <section className="recursion-panel recursion-stack" aria-label="Live function stack">
    <header><h2>Live call stack</h2><span>TOP first · driver separate</span></header>
    {frame.stack.length ? <ol aria-label="Live calls, newest first">{frame.stack.map((id, index) => {
      const call = frame.framesById[id];
      return <li key={id} data-call-id={id} data-call-status={call.status}>
        <button type="button" className={'recursion-frame status-' + call.status.toLowerCase()} aria-pressed={inspectedId === id}
          onClick={() => onInspect(id)} aria-label={'Inspect ' + id + ', ' + callLabel(call) + ', ' + call.status.toLowerCase()}>
          <span className="recursion-frame-title"><strong>{callLabel(call)}</strong><small>{index === 0 ? 'TOP · ' : ''}{id}</small></span>
          <span className="recursion-frame-status">{call.status === 'RUNNING' ? 'ACTIVE' : call.status}</span>
          <span>{call.status === 'WAITING' ? 'Waiting for ' + call.waitingFor + ' at line ' + call.suspendedCallSite : call.status === 'RETURNING' ? 'Return prepared: ' + format(call.returnValue) : 'Own parameter n = ' + format(call.locals.n)}</span>
          {call.status === 'WAITING' ? <small>{call.continuation}</small> : null}
        </button>
      </li>;
    })}</ol> : <p className="recursion-empty">{frame.metrics.totalInvocations ? 'All calls have returned. The function stack is empty.' : 'No function call yet. The driver will create the first frame.'}</p>}
    <footer><span>Live functions <strong>{frame.metrics.currentDepth}</strong></span><span>Maximum depth <strong>{frame.metrics.maxDepth}</strong></span></footer>
  </section>;
}

function FrameDetails({ frame, inspectedId, follow }) {
  const call = frame.framesById[inspectedId];
  return <section className="recursion-panel recursion-inspector" aria-label="Selected frame details">
    <header><h2>Frame details</h2><button type="button" onClick={follow}>Follow active call</button></header>
    {call ? <><p className="recursion-inspection-status">Inspecting {call.status.toLowerCase()} call · {inspectedId}{inspectedId !== frame.activeCallId ? ' · execution stays with ' + (frame.activeCallId || 'the handoff / driver') : ''}</p>
      <h3>{callLabel(call)}</h3><dl className="recursion-locals">{Object.entries(call.locals).map(([name, tag]) => <div key={name}><dt>{name}</dt><dd data-binding={name} data-value-kind={tag.kind}>{format(tag)}</dd></div>)}</dl>
      <dl className="recursion-detail-facts"><div><dt>Caller</dt><dd>{call.parentCallId || 'driver'} · source line {call.callSite}</dd></div>
        <div><dt>Return value</dt><dd>{format(call.returnValue)}</dd></div>
        {call.pendingExpression.kind === 'PENDING' ? <div><dt>Call expression</dt><dd>{format(call.pendingExpression)}</dd></div> : null}
        {call.continuation ? <div><dt>Continuation</dt><dd>{call.continuation}</dd></div> : null}</dl>
      {call.locals.child_total?.kind === 'UNBOUND' && call.status === 'WAITING' ? <p>Next calculation after the child returns: <code>n + child_total</code>. This is a teaching annotation, not a bound value.</p> : null}
    </> : <p>Step into a call, or inspect a completed call in history.</p>}
  </section>;
}

export function RecursionHistory({ frame, onInspect }) {
  return <div className="recursion-history"><p>Completed calls are history, not live frames.</p>
    {frame.history.length ? <ol>{frame.history.map((id) => <li key={id}><button type="button" onClick={() => onInspect?.(id)}>{id} · {callLabel(frame.framesById[id])} → {format(frame.framesById[id].returnValue)}</button></li>)}</ol> : <p>No call has completed.</p>}
  </div>;
}

function Readiness({ activity, inputs, events, controller }) {
  const questions = activity.predictionsFor(inputs);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState({});
  return <details className="recursion-readiness recursion-panel" id="recursion-readiness"><summary>Trace predictions and transfer</summary>
    <p>Explain the next transition. Your answers do not change execution and are not grades.</p>
    {questions.map((q) => <fieldset key={q.id}><legend>{q.question}</legend>
      <button type="button" onClick={() => controller.seek(events.findIndex((e) => e.id === q.at))}>Pause at this question’s state</button>
      {q.options.map((option) => <label key={option}><input type="radio" name={q.id} value={option} checked={answers[q.id] === option}
        onChange={() => { setAnswers({ ...answers, [q.id]: option }); setChecked({ ...checked, [q.id]: false }); }}/>{option}</label>)}
      <button type="button" disabled={!answers[q.id]} onClick={() => setChecked({ ...checked, [q.id]: true })}>Check prediction</button>
      {checked[q.id] ? <p role="status">{answers[q.id] === q.answer ? 'That matches the trace. ' : 'Recheck the waiting caller. '}{q.explanation}</p> : null}
    </fieldset>)}
    <details><summary>Transfer: total a list by index</summary><p>For <code>list_total(values, i)</code>, state its promise, base result, shrinking measure, delegated call, and combination. Use the same read-only list; each frame keeps its own index.</p>
      <details><summary>Compare your explanation</summary><p>The call returns the sum from i onward. Return 0 at the end. The remaining length decreases when i advances. Delegate to i + 1, then add values[i] to that child result. Run your Python locally; this workspace does not check arbitrary programs.</p></details>
    </details>
    <details><summary>Repair: print is not return</summary><p>If <code>return total</code> is replaced with <code>print(total)</code>, what does the caller receive?</p>
      <details><summary>Compare your explanation</summary><p>The function prints text, then implicitly returns None. A waiting caller that adds n to that None gets a real TypeError. Printing does not transfer a numeric answer.</p></details>
    </details>
  </details>;
}

export function RecursionWorkspace({ activity, inputs, result, event, controller, playback, StackRenderer = RecursionStack }) {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('stack');
  const tabsRef = useRef(null);
  const [packStatus, setPackStatus] = useState('');
  async function saveOffline() {
    if (location.protocol === 'file:') { setPackStatus('This local folder already contains the Python fixtures and source.'); return; }
    try {
      const response = await fetch(new URL('activity-packs/recursion-foundations-manifest.json', location.href));
      if (!response.ok) throw new Error('Pack manifest unavailable');
      const manifest = await response.json();
      if (!window.confirm('Download ' + manifest.title + ' for offline use? ' + manifest.bytes.toLocaleString() + ' bytes (' + (manifest.bytes / 1024).toFixed(1) + ' KiB).')) {
        setPackStatus('Download canceled.'); return;
      }
      const cache = await caches.open(manifest.cacheName);
      await cache.addAll(manifest.files.map((file) => new URL(file, location.href).href));
      setPackStatus('Saved for offline use · ' + manifest.bytes.toLocaleString() + ' bytes');
    } catch { setPackStatus('Could not save this pack. Reconnect and try again.'); }
  }
  const frame = event?.frame;
  if (!frame) return <section className="recursion-panel" role="alert">{result.error || 'The verified Python trace is unavailable.'}</section>;
  const inspectedId = selected && frame.framesById[selected] ? selected : frame.activeCallId || frame.stack[0] || frame.history.at(-1);
  const fixture = activity.fixtureFor(inputs);
  const sumLesson = activity.programId === 'sum_to';
  const tabs = ['source', 'stack', 'details'];
  function tabKeys(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const index = tabs.indexOf(tab);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (index + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
    setTab(tabs[next]); tabsRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  }
  return <div className="recursion-workspace" data-event-id={event.id} data-event-kind={frame.eventKind} data-active-call={frame.activeCallId || ''} data-outcome={frame.outcome}>
    {result.outcome !== 'complete' ? <p role="alert">This trace stopped without successful completion. {result.diagnostics[0]?.message}</p> : null}
    <details className="recursion-warmup recursion-panel"><summary>Before recursion: who calls whom?</summary><p>Imagine <code>main</code> calls <code>double(3)</code>, which calls <code>add(3, 3)</code>. The argument 3 binds a parameter; each call keeps its own locals. double waits for add to return 6, then resumes after that call. A returned value reaches its caller; print writes stdout.</p><p>The Module 4 bridge is LIFO: the latest active function call returns first. These are execution frames, not a list that your code manually pushes and pops.</p></details>
    <nav className="recursion-tabs" aria-label="Recursion workspace view" role="tablist" ref={tabsRef} onKeyDown={tabKeys}>
      {tabs.map((id) => <button id={'recursion-tab-' + id} type="button" role="tab" aria-selected={tab === id} aria-controls={'recursion-surface-' + id}
        tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} key={id}>{id[0].toUpperCase() + id.slice(1)}</button>)}
    </nav>
    <div className="recursion-grid">
      <div id="recursion-surface-source" className={'recursion-surface ' + (tab === 'source' ? 'is-visible' : '')}><PythonSource source={fixture.source} event={event} filename={activity.programId + '-n' + inputs.n + '.py'}/></div>
      <div id="recursion-surface-stack" className={'recursion-surface ' + (tab === 'stack' ? 'is-visible' : '')}><StackRenderer frame={frame} inspectedId={inspectedId} onInspect={setSelected}/></div>
      <div id="recursion-surface-details" className={'recursion-surface ' + (tab === 'details' ? 'is-visible' : '')}><FrameDetails frame={frame} inspectedId={inspectedId} follow={() => setSelected(null)}/></div>
    </div>
    {sumLesson ? <section className="recursion-panel recursion-transfer" aria-label="Return transfer"><h2>Return transfer</h2>
      {frame.returnTransfer ? <p data-transfer-stage={frame.returnTransfer.stage}><strong>{frame.returnTransfer.childCallId}</strong> → <strong>{frame.returnTransfer.callerCallId || 'driver'}</strong> · {format(frame.returnTransfer.value)} · {frame.returnTransfer.stage} · line {frame.returnTransfer.callSite} · {frame.returnTransfer.destination}</p>
        : <p>{frame.eventKind === 'RETURN_READY' ? 'The return is prepared. The child frame stays visible until return completion.' : 'Each result goes to exactly one waiting caller.'}</p>}
    </section> : null}
    <div className="recursion-results">
      <section className="recursion-panel recursion-driver" aria-label="Driver context"><h2>Driver · {frame.driver.status.toLowerCase()}</h2>
        <p>Separate from function depth{frame.driver.waitingFor ? ' · waiting for ' + frame.driver.waitingFor : ''}</p>
        <dl><div><dt>Call result</dt><dd data-driver-result>{format(frame.driver.result)}</dd></div>
          {sumLesson ? <div><dt>answer</dt><dd data-driver-answer data-value-kind={frame.driver.locals.answer.kind}>{format(frame.driver.locals.answer)}</dd></div> : null}</dl>
      </section>
      <section className="recursion-panel recursion-output" aria-label="Program stdout"><h2>stdout · printed text</h2><pre data-recursion-stdout>{frame.stdout}</pre>{!frame.stdout ? <p>{frame.outcome === 'completed' ? 'This program completed without printing.' : 'No output yet.'}</p> : null}</section>
    </div>
    {playback}
    <details className="recursion-panel recursion-evidence"><summary>Details and completed-call history</summary>
      <p>Function invocations: {frame.metrics.totalInvocations}. Maximum simultaneously live functions: {frame.metrics.maxDepth}. The driver is excluded. UI steps are not algorithmic work counts.</p>
      <RecursionHistory frame={frame} onInspect={setSelected}/>
      <p className="recursion-provenance">Verified Python {ITCC47RecursionTraces.pythonVersion} · {ITCC47RecursionTraces.generatorVersion} · fixture {fixture.fixtureId} · schema {ITCC47RecursionTraces.schemaVersion}</p>
      <p className="recursion-provenance">Source SHA-256: <code>{fixture.sourceRevision}</code></p>
      <button type="button" onClick={saveOffline}>Download for offline use</button><p role="status">{packStatus}</p>
    </details>
    {result.outcome === 'complete' ? <Readiness activity={activity} inputs={inputs} events={result.events} controller={controller}/> : null}
    <nav className="recursion-next" aria-label="Foundation lesson sequence"><a href={ITCC47CurriculumUI.href('visualizer.html?activity=' + (sumLesson ? 'recursion-call-stack' : 'recursion-return-values'))}>{sumLesson ? 'Revisit M5.1: call-stack control' : 'Next · M5.2: returned values'}</a><span>Later Module 5 applications remain draft.</span></nav>
  </div>;
}
