import React, { memo, useEffect, useRef, useState } from 'react';
import './priority-service-lane.css';

const NAVIGATION = Object.freeze([
  ['Sort', 'visualizer.html?activity=insertion-sort'],
  ['Visualize', 'problems.html?view=visualizations'],
  ['Algorithm Writeup', 'writer.html'],
  ['Pseudocode Trace', 'tracer.html?activity=deque-service-lane'],
  ['Modules', 'problem-list.html?module=4'],
  ['All Subjects', 'index.html'],
]);

const STATES = Object.freeze([
  { title: 'Initialize service lane', description: 'Create an empty deque for incoming service requests.', microSteps: ['Create lane', 'Set policy', 'Confirm both ends', 'Ready'], activeMicroStep: 0 },
  { title: 'ADD_BACK Request A', description: 'A routine request enters through BACK and becomes the first waiting request.', microSteps: ['Read request', 'Target BACK', 'Add request', 'Update ends'], activeMicroStep: 2 },
  { title: 'ADD_BACK Request B', description: 'Request B joins behind Request A at BACK; routine arrival order is preserved.', microSteps: ['Read request', 'Target BACK', 'Add request', 'Update ends'], activeMicroStep: 2 },
  { title: 'ADD_FRONT Urgent U', description: 'Apply the explicit urgent exception: insert Urgent U directly at FRONT.', microSteps: ['Read urgent', 'Apply exception', 'Add at FRONT', 'Update ends'], activeMicroStep: 2 },
  { title: 'REMOVE_FRONT / Serve next', description: 'Remove the FRONT request and store it in served. Request A becomes the next FRONT.', microSteps: ['Read FRONT', 'Remove request', 'Store served', 'Update FRONT'], activeMicroStep: 2 },
  { title: 'REMOVE_BACK / Cancel newest routine', description: 'Remove Request B directly from BACK and store it in cancelled.', microSteps: ['Read BACK', 'Remove request', 'Store cancelled', 'Update BACK'], activeMicroStep: 2 },
  { title: 'RETURN [Request A]', description: 'Return the remaining lane after the front exception and back cancellation.', microSteps: ['Read lane', 'Verify order', 'Return lane', 'Complete'], activeMicroStep: 3 },
]);

const POLICY = Object.freeze([
  ['Routine request → BACK', 'ADD_BACK preserves routine arrival order.'],
  ['Urgent exception → FRONT', 'ADD_FRONT explicitly places the exception first.'],
  ['Serve next → REMOVE_FRONT', 'FRONT reaches the service desk.'],
  ['Cancel newest routine → REMOVE_BACK', 'BACK leaves without touching earlier requests.'],
]);

function requestName(value) {
  if (value == null || value === '') return '—';
  const text = String(value).trim();
  if (/^urgent\s*u$/i.test(text) || /^u$/i.test(text)) return 'Urgent U';
  if (/^request\s+[ab]$/i.test(text)) return text.replace(/\brequest\b/i, 'Request');
  if (/^[ab]$/i.test(text)) return `Request ${text.toUpperCase()}`;
  if (/^served\s+/i.test(text)) return requestName(text.replace(/^served\s+/i, ''));
  if (/^cancelled\s+/i.test(text)) return requestName(text.replace(/^cancelled\s+/i, ''));
  return text;
}

function valueFromRuntime(frame, name) {
  const variables = frame.markers?.variables || frame.variables || {};
  return Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : undefined;
}

function laneItemsFrom(frame) {
  const lane = frame.lanes?.find((item) => item.kind === 'deque') || frame.lanes?.[0];
  return lane?.items || [];
}

function handledValues(frame) {
  const output = frame.output || [];
  const served = valueFromRuntime(frame, 'served')
    ?? frame.held?.find((item) => item.label === 'served')?.value
    ?? output.find((item) => /^served\s+/i.test(String(item)))?.replace(/^served\s+/i, '')
    ?? null;
  const cancelled = valueFromRuntime(frame, 'cancelled')
    ?? frame.held?.find((item) => item.label === 'cancelled')?.value
    ?? output.find((item) => /^cancelled\s+/i.test(String(item)))?.replace(/^cancelled\s+/i, '')
    ?? null;
  return { served: served == null ? null : requestName(served), cancelled: cancelled == null ? null : requestName(cancelled) };
}

function SourcePanel({ source, activeLine, panelRef }) {
  return <section className="psl-card psl-pseudocode" aria-labelledby="psl-pseudocode-heading" ref={panelRef} tabIndex={-1}>
    <header className="psl-card-heading"><h2 id="psl-pseudocode-heading">Pseudocode</h2><span>source synchronized</span></header>
    <ol aria-label="Seven-line synchronized pseudocode">
      {source.map((entry, index) => {
        const line = typeof entry === 'string' ? entry : entry.text || entry.code || entry.label || '';
        const number = typeof entry === 'object' && entry.line ? entry.line : index + 1;
        const active = number === activeLine;
        return <li className={`source-line ${active ? 'is-current' : ''}`} aria-current={active ? 'step' : undefined} key={`${number}:${line}`}>
          <span>{number}</span><code>{line}</code>
        </li>;
      })}
    </ol>
  </section>;
}

function StatusCard({ line, step, operation, laneItems, served, cancelled }) {
  const front = laneItems.length ? requestName(laneItems[0].value || laneItems[0].label || laneItems[0].id) : '—';
  const back = laneItems.length ? requestName(laneItems[laneItems.length - 1].value || laneItems[laneItems.length - 1].label || laneItems[laneItems.length - 1].id) : '—';
  const fields = [
    ['source line', `${line} / 7`],
    ['operation', operation],
    ['lane size', laneItems.length],
    ['FRONT request', front],
    ['BACK request', back],
  ];
  return <section className="psl-card psl-status" aria-labelledby="psl-status-heading" aria-live="polite">
    <header className="psl-card-heading"><h2 id="psl-status-heading">Execution Status</h2><span>{step} / 7</span></header>
    <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {served || cancelled ? <div className="psl-status-handled"><span>{served ? `served · ${served}` : ''}</span><span>{cancelled ? `cancelled · ${cancelled}` : ''}</span></div> : null}
  </section>;
}

function PolicyCard() {
  return <section className="psl-card psl-policy" aria-labelledby="psl-policy-heading">
    <header className="psl-card-heading"><h2 id="psl-policy-heading">Service Policy</h2></header>
    <div className="psl-policy-list">{POLICY.map(([title, description]) => <div key={title}><strong>{title}</strong><span>{description}</span></div>)}</div>
    <p className="psl-policy-warning">No automatic priority sorting. Operations determine placement.</p>
  </section>;
}

function OperationHero({ step, details }) {
  return <section className="psl-operation" aria-labelledby="psl-operation-title" aria-live="polite">
    <div className="psl-operation-copy">
      <span className="psl-eyebrow">Current Operation · Step {step} of 7</span>
      <h2 id="psl-operation-title">{details.title}</h2>
      <p>{details.description}</p>
    </div>
    <ol className="psl-microsteps" aria-label="Current operation micro-steps">
      {details.microSteps.map((microStep, index) => <li className={index === details.activeMicroStep ? 'is-active' : index < details.activeMicroStep ? 'is-done' : ''} key={microStep}>
        <span>{index + 1}</span><strong>{microStep}</strong>
      </li>)}
    </ol>
  </section>;
}

function RequestCard({ item, index, count }) {
  const name = requestName(item.value || item.label || item.id);
  const urgent = /urgent/i.test(name);
  const side = count === 1 ? 'both' : index === 0 ? 'front' : index === count - 1 ? 'back' : 'waiting';
  const sideLabel = side === 'both' ? 'FRONT + BACK' : side.toUpperCase();
  return <div className={`psl-request ${urgent ? 'is-urgent' : ''} ${side === 'both' ? 'is-both' : ''}`} data-item-id={item.id} aria-label={`${name}, ${sideLabel}`}>
    <span className="psl-end-badge">{sideLabel}</span>
    <strong>{name}</strong>
    <small>{urgent ? 'URGENT' : 'ROUTINE'}</small>
  </div>;
}

function LaneVisualization({ items, step, served, cancelled, laneRef }) {
  return <section className="psl-lane-visual" aria-labelledby="psl-lane-heading" ref={laneRef} tabIndex={-1}>
    <div className="psl-lane-title"><h2 id="psl-lane-heading">Service lane visualization <span>deque</span></h2><div className="psl-orientation">FRONT ← waiting requests → BACK</div></div>
    <div className="psl-lane-layout">
      <aside className="psl-service-side" aria-label="Service and FRONT side">
        <h3>SERVE / FRONT</h3>
        <div className="psl-service-desk"><strong>Service Desk</strong><span>{served ? 'Serving next request' : 'Ready for next request'}</span></div>
        {served ? <div className="psl-handled-tag is-served"><span>served =</span><strong>{served}</strong></div> : <div className="psl-handled-placeholder">No request served yet</div>}
        <small>REMOVE_FRONT exits here</small>
      </aside>
      <div className="psl-lane-center">
        <div className={`psl-urgent-path ${step === 4 ? 'is-active' : ''}`}>
          <div><strong>Urgent Entry</strong><span>Explicit ADD_FRONT exception path</span></div>
          {step === 4 ? <div className="psl-urgent-entry"><b>Urgent U</b><span aria-hidden="true">→</span><strong>FRONT</strong></div> : <div className="psl-path-empty"><span>Dedicated exception path</span><strong>→ FRONT</strong></div>}
        </div>
        <div className="psl-waiting-area">
          <div className="psl-end-markers"><span>FRONT</span><span>BACK</span></div>
          <div className="psl-lane-track" aria-label={`Waiting lane, FRONT to BACK, ${items.length} requests`}>
            {items.length ? <div className="psl-lane-items">{items.map((item, index) => <RequestCard item={item} index={index} count={items.length} key={item.id}/>)}</div> : <div className="psl-empty-lane">No requests in the lane yet.</div>}
          </div>
          <div className="psl-lane-actions"><strong>← service / REMOVE_FRONT</strong><strong>ADD_BACK / cancel →</strong></div>
        </div>
      </div>
      <aside className="psl-routine-side" aria-label="BACK and routine side">
        <h3>BACK / ROUTINE SIDE</h3>
        <div className="psl-routine-staging">Routine arrival staging</div>
        {cancelled ? <div className="psl-handled-tag is-cancelled"><span>cancelled =</span><strong>{cancelled}</strong></div> : <div className="psl-cancel-placeholder">Cancellation exit from BACK</div>}
        <small>Request B arrives and later exits through this same BACK side.</small>
      </aside>
    </div>
  </section>;
}

function DetailCards({ items, served, cancelled, runtime, isReturn }) {
  const front = items.length ? requestName(items[0].value || items[0].label || items[0].id) : '—';
  const back = items.length ? requestName(items[items.length - 1].value || items[items.length - 1].label || items[items.length - 1].id) : '—';
  const returnValue = isReturn ? `[${items.map((item) => requestName(item.value || item.label || item.id)).join(', ')}]` : '—';
  const runtimeRows = Object.entries(runtime).filter(([, value]) => value !== null && value !== undefined && value !== '');
  return <div className="psl-detail-grid">
    <section className="psl-card psl-detail-card" aria-labelledby="psl-lane-details-heading">
      <header className="psl-card-heading"><h2 id="psl-lane-details-heading">Lane Details</h2></header>
      <dl><div><dt>Size</dt><dd>{items.length}</dd></div><div><dt>FRONT</dt><dd>{front}</dd></div><div><dt>BACK</dt><dd>{back}</dd></div><div><dt>Routine policy</dt><dd>ADD_BACK</dd></div></dl>
    </section>
    <section className="psl-card psl-detail-card" aria-labelledby="psl-handled-heading">
      <header className="psl-card-heading"><h2 id="psl-handled-heading">Handled Requests</h2></header>
      <div className="psl-handled-list">
        <div className={served ? 'is-served' : ''}><span>served</span><strong>{served || '—'}</strong></div>
        <div className={cancelled ? 'is-cancelled' : ''}><span>cancelled</span><strong>{cancelled || '—'}</strong></div>
      </div>
    </section>
    <section className="psl-card psl-detail-card psl-runtime" aria-labelledby="psl-runtime-heading">
      <header className="psl-card-heading"><h2 id="psl-runtime-heading">Runtime Values</h2></header>
      <pre>{runtimeRows.length ? runtimeRows.map(([name, value]) => `${name} = ${Array.isArray(value) ? `[${value.join(', ')}]` : requestName(value)}`).join('\n') : 'lane = [ ]\nserved = —\ncancelled = —'}</pre>
    </section>
    <section className="psl-card psl-detail-card psl-program" aria-labelledby="psl-program-heading">
      <header className="psl-card-heading"><h2 id="psl-program-heading">Program / Return Output</h2></header>
      <div className="psl-program-rows">
        <div><span>Served</span><strong className="tone-served">{served || '—'}</strong></div>
        <div><span>Cancelled</span><strong className="tone-cancelled">{cancelled || '—'}</strong></div>
        <div><span>Return</span><strong className="tone-return">{returnValue}</strong></div>
      </div>
      <p data-activity-teaching>Teaching point: front service and back cancellation leave Request A in order.</p>
    </section>
  </div>;
}

function ToolRail({ onSource, onRestart, onPolicy }) {
  return <aside className="psl-tool-rail" aria-label="Visualization tools">
    <button type="button" aria-label="Focus pseudocode" title="Focus pseudocode" onClick={onSource}>▦</button>
    <button type="button" aria-label="Restart execution" title="Restart execution" onClick={onRestart}>↶</button>
    <button type="button" aria-label="Service lane help" title="Service lane help" onClick={onPolicy}>?</button>
  </aside>;
}

function Settings({ state, controller, motionPreference }) {
  const [status, setStatus] = useState('');
  return <details className="psl-settings">
    <summary>⚙ <span>Settings</span></summary>
    <div className="psl-settings-popover">
      <label>Speed<select value={state.speed} onChange={(event) => controller.setSpeed(event.target.value)}><option value="3">0.5×</option><option value="6">1×</option><option value="9">2×</option></select></label>
      <label>Motion<select aria-label="Motion preference" value={motionPreference.override || 'device'} onChange={(event) => motionPreference.update(event.target.value)}><option value="device">Use device setting</option><option value="on">On</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label>
      <button type="button" onClick={async () => {
        setStatus('Checking pack size…');
        try {
          const response = await fetch(new URL('activity-packs/priority-service-lane-manifest.json', location.href));
          if (!response.ok) throw new Error('Could not read the service lane pack manifest.');
          const manifest = await response.json();
          const kib = (manifest.bytes / 1024).toFixed(1);
          if (!window.confirm(`Download ${manifest.title} for offline use? The pack is ${manifest.bytes.toLocaleString()} bytes (${kib} KiB).`)) {
            setStatus('Download canceled.');
            return;
          }
          const cache = await caches.open(manifest.cacheName);
          await cache.addAll(manifest.files.map((file) => new URL(file, location.href).href));
          setStatus(`Saved for offline use · ${manifest.bytes.toLocaleString()} bytes`);
        } catch {
          setStatus('Could not save this pack. Reconnect and try again.');
        }
      }}>Download for offline use</button>
      {status ? <span role="status">{status}</span> : null}
    </div>
  </details>;
}

function Footer({ state, controller, motionPreference, items, served, cancelled }) {
  const step = state.index + 1;
  const progress = state.total > 1 ? (state.index / (state.total - 1)) * 100 : 0;
  const primaryLabel = state.status === 'playing' ? 'Pause' : step === 7 ? 'Complete' : 'Play';
  const handledSummary = served && cancelled ? `served ${served} · cancelled ${cancelled}` : served ? `served ${served}` : cancelled ? `cancelled ${cancelled}` : 'no handled values';
  return <footer className="psl-footer" role="region" aria-label="Playback controls">
    <div className="psl-progress"><strong aria-live="polite">Step {step} of 7</strong><div role="progressbar" aria-label="Execution progress" aria-valuemin="1" aria-valuemax="7" aria-valuenow={step}><span style={{ width: `${progress}%` }}/></div></div>
    <div className="psl-transport">
      <button type="button" aria-label="Previous" onClick={() => controller.step(-1)} disabled={state.index === 0 || state.transitioning}>‹ <span>Previous</span></button>
      <button type="button" aria-label="Restart" onClick={() => controller.seek(0)} disabled={state.index === 0}>↻ <span>Restart</span></button>
      <button type="button" className="is-primary" onClick={controller.toggle} disabled={state.atEnd || state.transitioning} aria-label={primaryLabel}>{step === 7 ? '✓' : state.status === 'playing' ? 'Ⅱ' : '▶'} <span>{primaryLabel}</span></button>
      <button type="button" aria-label="Step" onClick={() => controller.step(1)} disabled={state.atEnd || state.transitioning}><span>Step</span> ›</button>
      <Settings state={state} controller={controller} motionPreference={motionPreference}/>
    </div>
    <div className="psl-footer-summary"><span>lane size <strong>{items.length}</strong></span><span>{handledSummary}</span></div>
  </footer>;
}

export const PriorityServiceLaneWorkspace = memo(function PriorityServiceLaneWorkspace({ activity, event, state, controller, motionPreference, Icon }) {
  const sourceRef = useRef(null);
  const laneRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);
  const frame = event?.frame || {};
  const step = Math.max(1, Math.min(7, (state.index || 0) + 1));
  const line = event?.source?.line || step;
  const details = STATES[step - 1];
  const items = laneItemsFrom(frame);
  const handled = handledValues(frame);
  const runtime = frame.markers?.variables || frame.variables || {};
  const runtimeWithLane = { lane: items.map((item) => requestName(item.value || item.label || item.id)), ...runtime };
  const returnState = event?.type === 'return' || step === 7;

  useEffect(() => {
    document.body.classList.add('priority-lane-active');
    const previousTitle = document.title;
    document.title = `${activity.title} · ITCC47 Learning Lab`;
    return () => {
      document.body.classList.remove('priority-lane-active');
      document.title = previousTitle;
    };
  }, [activity.title]);

  const focusPanel = (ref) => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    ref.current?.focus?.({ preventScroll: true });
  };

  return <div className="psl-app" role="region" aria-label="Activity workbench" data-activity-workbench data-activity-id={activity.id} data-testid="priority-service-lane-app" data-state-index={step}>
    <header className="psl-header">
      <a className="psl-brand" href="itcc47.html"><span aria-hidden="true">47</span><strong>ITCC47 Learning Lab</strong></a>
      <nav aria-label="Primary navigation">{NAVIGATION.map(([label, href]) => <a href={href} className={label === 'Visualize' ? 'is-active' : ''} aria-current={label === 'Visualize' ? 'page' : undefined} key={label}>{label}</a>)}</nav>
    </header>
    <section className="psl-intro" aria-labelledby="psl-page-title">
      <div className="psl-breadcrumbs"><a href="itcc47.html">Home</a><span>/</span><a href="problems.html?view=visualizations">Visualize</a><span>/</span><a href="problem-list.html?module=4">Module 4 · Deques</a></div>
      <div className="psl-intro-main"><div><h1 id="psl-page-title">{activity.title}</h1><p>{activity.subtitle}</p></div><a className="psl-practice-link" href="problem-list.html?module=4"><Icon name="grid" size={14}/>Practice this module</a></div>
    </section>
    <main className="psl-content">
      <aside className="psl-sidebar" aria-label="Pseudocode and service policy">
        <SourcePanel source={activity.source} activeLine={line} panelRef={sourceRef}/>
        <StatusCard line={line} step={step} operation={details.title} laneItems={items} served={handled.served} cancelled={handled.cancelled}/>
        <PolicyCard/>
      </aside>
      <div className="psl-primary">
        <OperationHero step={step} details={details}/>
        <LaneVisualization items={items} step={step} served={handled.served} cancelled={handled.cancelled} laneRef={laneRef}/>
        <DetailCards items={items} served={handled.served} cancelled={handled.cancelled} runtime={runtimeWithLane} isReturn={returnState}/>
      </div>
    </main>
    <ToolRail onSource={() => focusPanel(sourceRef)} onRestart={() => controller.seek(0)} onPolicy={() => setShowHelp(true)}/>
    {showHelp ? <div className="psl-help-backdrop" role="presentation" onClick={() => setShowHelp(false)}><section className="psl-help" role="dialog" aria-modal="true" aria-labelledby="psl-help-title" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Close help" onClick={() => setShowHelp(false)}>×</button><h2 id="psl-help-title">How this service lane works</h2><p>Routine requests enter at BACK. This activity places Urgent U at FRONT with ADD_FRONT, serves from FRONT, and cancels the newest routine request with REMOVE_BACK.</p><strong>No automatic priority sorting. Operations determine placement.</strong></section></div> : null}
    <Footer state={state} controller={controller} motionPreference={motionPreference} items={items} served={handled.served} cancelled={handled.cancelled}/>
  </div>;
});
