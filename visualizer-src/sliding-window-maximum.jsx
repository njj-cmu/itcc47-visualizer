import React, { memo, useRef, useState } from 'react';
import './sliding-window-maximum.css';

const CONCEPTS = Object.freeze([
  ['Indices, not copies', 'Every card keeps its input index.'],
  ['FRONT = current max', 'Best surviving candidate stays left.'],
  ['Decreasing values', 'Values descend FRONT → BACK.'],
  ['Dominance rule', 'Remove smaller/equal BACK candidates.'],
  ['Expiry rule', 'Remove FRONT only after it leaves the window.'],
  ['O(n)', 'Each index enters and leaves at most once.'],
]);

const WINDOWS = Object.freeze([
  ['Window 1', '[4, 2, 12]', '12'],
  ['Window 2', '[2, 12, 3]', '12'],
]);

const NAVIGATION = Object.freeze([
  ['Sort', 'visualizer.html?activity=insertion-sort'],
  ['Visualize', 'problems.html?view=visualizations'],
  ['Algorithm Writeup', 'writer.html'],
  ['Pseudocode Trace', 'tracer.html'],
  ['Modules', 'problems.html'],
  ['All Subjects', 'index.html'],
]);

const STORYBOARD_COPY = Object.freeze([
  { operationTitle: 'Initialize candidate deque', operationDescription: 'Start with an empty deque. Store candidate indices, not every value.', phases: ['Create deque', 'Load values', 'Set k = 3', 'Ready'], statusTitle: 'READY', statusDescription: 'Candidate deque begins empty.', teachingPoint: 'Store candidate indices, not every value.', windowMessage: 'No full window yet. Expiry checks matter once a complete window exists.' },
  { operationTitle: 'Add index 0 to BACK', operationDescription: 'Index 0 enters the candidate deque; value 4 is the first possible maximum.', phases: ['Read index 0', 'Add to BACK', 'Update ends', 'Check window'], statusTitle: 'ADDED', statusDescription: '4 · i0 is both FRONT and BACK.', teachingPoint: 'The first candidate is both FRONT and BACK.', windowMessage: 'Window construction: 1 / 3 processed. No maximum emitted yet.' },
  { operationTitle: 'Compare BACK with incoming 2', operationDescription: 'Check whether the current BACK is dominated by the newer value.', phases: ['Read incoming 2', 'Read BACK 4', 'Compare values', 'Decide'], statusTitle: 'KEEP 4', statusDescription: '4 can still win a future window.', decisionTitle: 'KEEP 4', decisionDescription: '4 can still win a future window.', teachingPoint: '4 stays because 4 > 2.', windowMessage: 'Window construction: 2 / 3 positions are visible. Still no complete window.' },
  { operationTitle: 'Add index 1 to BACK', operationDescription: 'The smaller value remains useful behind 4, preserving a decreasing candidate deque.', phases: ['Read index 1', 'Add to BACK', 'Update ends', 'Check window'], statusTitle: 'ADDED', statusDescription: 'Invariant holds: 4 > 2.', teachingPoint: 'Candidate values decrease from FRONT → BACK.', windowMessage: 'Window construction: 2 / 3 positions are visible.' },
  { operationTitle: 'Compare BACK 2 with incoming 12', operationDescription: 'The newer 12 is larger, so the BACK candidate 2 is dominated.', phases: ['Incoming still 12', 'Read BACK 2', 'Compare 2 ≤ 12', 'Decide'], statusTitle: 'REMOVE BACK', statusDescription: '2 is smaller and older than 12.', decisionTitle: 'REMOVE BACK', decisionDescription: '2 is smaller and older than 12.', teachingPoint: '2 cannot become a maximum while newer 12 is present.', windowMessage: 'First full window is 0...2. Resolve dominance before emitting its maximum.' },
  { operationTitle: 'Remove dominated BACK candidate', operationDescription: 'Remove index 1, then repeat the WHILE comparison against the new BACK.', phases: ['Identify i1', 'Remove BACK', 'Update deque', 'Repeat compare'], statusTitle: 'REMOVED 2', statusDescription: 'Incoming 12 stays active for another comparison.', teachingPoint: 'The WHILE loop continues after each removal.', windowMessage: 'Full window indices 0...2. Incoming 12 is still being processed.' },
  { operationTitle: 'Repeat comparison: 4 vs 12', operationDescription: 'After removing 2, compare the new BACK again. The older 4 is also dominated.', phases: ['Incoming still 12', 'Read new BACK 4', 'Compare 4 ≤ 12', 'Decide'], statusTitle: 'REMOVE BACK', statusDescription: '4 is smaller and older than 12.', decisionTitle: 'REMOVE BACK', decisionDescription: '4 is smaller and older than 12.', teachingPoint: 'This is the same WHILE loop, not a new unrelated operation.', windowMessage: 'Full window indices 0...2. Dominance cleanup must finish first.' },
  { operationTitle: 'Add 12, then emit the first maximum', operationDescription: 'With smaller BACK candidates gone, index 2 becomes the sole candidate and FRONT maximum.', phases: ['Add i2 to BACK', 'Update FRONT/BACK', 'Read FRONT 12', 'Append maximum'], statusTitle: 'WINDOW MAX = 12', statusDescription: 'FRONT 12 is emitted for [4, 2, 12].', teachingPoint: 'FRONT always gives the maximum candidate.', windowMessage: 'Window indices 0...2. Front candidate 12 is inside the window ✓' },
  { operationTitle: 'Compare BACK 12 with incoming 3', operationDescription: 'The window slides right. Since 12 is larger, it remains the best candidate.', phases: ['Read incoming 3', 'Read BACK 12', 'Compare 12 ≤ 3', 'Decide'], statusTitle: 'KEEP 12', statusDescription: '12 is still the best candidate.', decisionTitle: 'KEEP 12', decisionDescription: '12 is still the best candidate.', teachingPoint: '12 stays because 12 > 3.', windowMessage: 'Current window indices 1...3. Front candidate i2 is inside the window ✓' },
  { operationTitle: 'Add 3 and emit the second maximum', operationDescription: 'Keep 3 behind 12. It may become useful later after 12 eventually expires.', phases: ['Add i3 to BACK', 'Update ends', 'Read FRONT 12', 'Append maximum'], statusTitle: 'WINDOW MAX = 12', statusDescription: 'Current output: [12, 12].', teachingPoint: '3 stays behind 12 because it may be useful later.', windowMessage: 'Current window indices 1...3. Front candidate i2 remains inside ✓' },
  { operationTitle: 'Final maxima complete', operationDescription: 'Both windows are resolved. The deque remains monotonic and FRONT produced each maximum.', phases: ['Read FRONT', 'Resolve value', 'Append maximum', 'Complete'], statusTitle: 'MAXIMA = [12, 12]', statusDescription: '[4, 2, 12] → 12 · [2, 12, 3] → 12', teachingPoint: 'Candidate values decrease FRONT → BACK; FRONT yields each window maximum.', windowMessage: 'Final window indices 1...3. Front candidate i2 is inside the window ✓' },
]);

function candidateParts(item) {
  if (!item) return null;
  const [value, index] = String(item.value).split(' · ');
  return { id: item.id, value, index };
}

const PseudocodePanel = memo(function PseudocodePanel({ source, activeLine, panelRef }) {
  return <section className="sw-card sw-pseudocode" aria-labelledby="sw-pseudocode-title" ref={panelRef} tabIndex={-1}>
    <header className="sw-card-heading"><h2 id="sw-pseudocode-title">Pseudocode</h2><span className="sw-source-synced"><i aria-hidden="true"/>source synchronized</span></header>
    <ol className="sw-source-list" aria-label="12-line synchronized pseudocode" tabIndex={0}>
      {source.map((code, index) => {
        const line = index + 1;
        return <li className={`source-line ${line === activeLine ? 'is-current' : ''}`} aria-current={line === activeLine ? 'step' : undefined} key={`${line}:${code}`}>
          <span>{line}</span><code>{code}</code>
        </li>;
      })}
    </ol>
  </section>;
});

const ExecutionStatus = memo(function ExecutionStatus({ line, currentIndex, currentValue, operation, size, step }) {
  const fields = [
    ['source line', `${line} / 12`],
    ['current i / value', `i${currentIndex} · ${currentValue}`],
    ['operation', operation],
    ['deque size', size],
    ['execution', `${step} / 11`],
  ];
  return <section className="sw-card sw-execution-status" aria-labelledby="sw-execution-title" aria-live="polite">
    <header className="sw-card-heading"><h2 id="sw-execution-title">Execution Status</h2><span className="sw-execution-chip">{step} / 11</span></header>
    <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
});

const ConceptsPanel = memo(function ConceptsPanel({ panelRef }) {
  return <section className="sw-card sw-concepts" aria-labelledby="sw-concepts-title" ref={panelRef} tabIndex={-1}>
    <header className="sw-card-heading"><h2 id="sw-concepts-title">Monotonic Deque Concepts</h2></header>
    <ul>{CONCEPTS.map(([title, text]) => <li key={title}><strong>{title}</strong><span>{text}</span></li>)}</ul>
  </section>;
});

const CurrentOperation = memo(function CurrentOperation({ presentation, step }) {
  return <section className="sw-card sw-current-operation" aria-labelledby="sw-operation-title" data-testid="current-operation">
    <div className="sw-operation-copy">
      <span className="sw-eyebrow">CURRENT OPERATION</span>
      <h2 id="sw-operation-title">{presentation.operationTitle}</h2>
      <p>{presentation.operationDescription}</p>
      <span className="sw-step-badge">STEP {step} OF 11</span>
    </div>
    <ol className="sw-phase-list" aria-label="Current operation phases">
      {presentation.phases.map((phase, index) => <li className={`${index < presentation.activePhase ? 'is-complete' : ''} ${index === presentation.activePhase ? 'is-active' : ''}`} aria-current={index === presentation.activePhase ? 'step' : undefined} key={`${index}:${phase}`}>
        <span>{index + 1}</span><strong>{phase}</strong>
      </li>)}
    </ol>
  </section>;
});

const InputWindow = memo(function InputWindow({ frame, currentIndex, currentValue, windowStart, windowEnd }) {
  const tokens = frame.input?.tokens || [];
  const laneItems = frame.lanes?.[0]?.items || [];
  const front = candidateParts(laneItems[0]);
  const back = candidateParts(laneItems.at(-1));
  return <section className="sw-card sw-input-window" aria-labelledby="sw-input-title" data-testid="input-window" data-window-range={`${windowStart}...${windowEnd}`}>
    <header className="sw-card-heading"><h2 id="sw-input-title">Input array + sliding window</h2><span className="sw-k-badge">k = 3</span></header>
    <div className="sw-input-layout">
      <div className="sw-array" role="list" aria-label="Input values">
        <div className="sw-window-outline" data-testid="window-outline" style={{ left: `calc(${windowStart * 25}% + ${windowStart}px - 6px)`, width: `calc(${(windowEnd - windowStart + 1) * 25}% + ${(windowEnd - windowStart + 1) + 8}px)` }} aria-hidden="true"/>
        {tokens.map((value, index) => <div className={`sw-array-cell ${index === currentIndex ? 'is-current' : ''}`} data-in-window={index >= windowStart && index <= windowEnd} role="listitem" aria-label={`index ${index}, value ${value}${index === currentIndex ? ', current' : ''}`} key={`${index}:${value}`}>
          <span>index {index}</span><strong>{value}</strong>{index === currentIndex ? <em>CURRENT</em> : null}
        </div>)}
      </div>
      <dl className="sw-input-facts">
        <div><dt>CURRENT INPUT</dt><dd>{`i${currentIndex} → ${currentValue}`}</dd></div>
        <div><dt>WINDOW RANGE</dt><dd>{`${windowStart}...${windowEnd}`}</dd></div>
        <div><dt>FRONT</dt><dd>{front ? `${front.value} · ${front.index}` : '—'}</dd></div>
        <div><dt>BACK</dt><dd>{back ? `${back.value} · ${back.index}` : '—'}</dd></div>
      </dl>
    </div>
  </section>;
});

const ComparisonPanel = memo(function ComparisonPanel({ event, presentation, currentValue }) {
  const comparison = event.frame.markers?.teaching?.comparison;
  if (presentation.decisionTitle && comparison?.text?.includes('≤')) {
    const [left, right] = comparison.text.split(' ≤ ');
    return <section className="sw-card sw-comparison" aria-labelledby="sw-comparison-title" data-testid="comparison" data-comparison={`${comparison.text} = ${String(comparison.outcome).toUpperCase()}`}>
      <header className="sw-card-heading"><h2 id="sw-comparison-title">Comparison / decision</h2></header>
      <div className="sw-comparison-labels"><span>BACK candidate</span><span>vs</span><span>incoming</span></div>
      <div className="sw-comparison-equation">
        <div className="sw-equation-value is-back"><strong>{left}</strong><small>BACK</small></div>
        <div className="sw-equation-result"><strong>{left} ≤ {right} ?</strong><span className={comparison.outcome ? 'is-true' : 'is-false'}>{String(comparison.outcome).toUpperCase()}</span></div>
        <div className="sw-equation-value is-incoming"><strong>{right}</strong><small>INCOMING</small></div>
      </div>
      <div className={`sw-decision-card ${comparison.outcome ? 'is-remove' : 'is-keep'}`}>
        <strong>{presentation.decisionTitle}</strong><span>{presentation.decisionDescription}</span>
      </div>
    </section>;
  }

  const finalOutput = presentation.operationLabel === 'Final output';
  return <section className="sw-card sw-comparison sw-status-panel" aria-labelledby="sw-comparison-title" data-testid="comparison">
    <header className="sw-card-heading"><h2 id="sw-comparison-title">Comparison / decision</h2></header>
    <div className={`sw-status-icon ${finalOutput ? 'is-output' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d={finalOutput ? 'm5 12 4 4L19 6' : presentation.statusTitle.startsWith('REMOVED') ? 'm7 7 10 10M17 7 7 17' : 'm5 12 4 4L19 6'}/></svg>
    </div>
    <strong className="sw-status-title">{presentation.statusTitle}</strong>
    <span className="sw-status-description">{presentation.statusDescription}</span>
    <span className="sw-incoming-chip">incoming {currentValue} · i{presentation.index}</span>
  </section>;
});

const CandidateDeque = memo(function CandidateDeque({ frame, presentation }) {
  const items = frame.lanes?.[0]?.items || [];
  const frontId = items[0]?.id;
  const backId = items.at(-1)?.id;
  const invariant = items.map((item) => candidateParts(item)?.value).join(' > ') || '—';
  const discarded = presentation.discarded;
  return <section className="sw-card sw-candidate-panel" aria-labelledby="sw-candidate-title" data-testid="candidate-deque" data-deque-items={items.map((item) => item.id).join(',')}>
    <header className="sw-card-heading">
      <h2 id="sw-candidate-title">Monotonic candidate deque</h2>
      <span className="sw-index-badge">stores indices</span>
      <span className="sw-invariant-badge">FRONT → BACK {invariant}</span>
    </header>
    <div className="sw-deque-stage">
      <span className="sw-endpoint-label is-front">FRONT</span><span className="sw-endpoint-label is-back">BACK</span>
      <div className="sw-deque-items" role="list" aria-label="Deque candidate indices">
        {items.length ? items.map((item, index) => {
          const parts = candidateParts(item);
          const isFront = item.id === frontId;
          const isBack = item.id === backId;
          const isBoth = isFront && isBack;
          const isRemoved = item.id === presentation.removeId;
          return <React.Fragment key={item.id}>
            {index > 0 ? <span className="sw-deque-arrow" aria-hidden="true">→</span> : null}
            <article role="listitem" className={`sw-candidate-card ${isFront ? 'is-front' : ''} ${isBack && !isBoth ? 'is-back' : ''} ${isBoth ? 'is-both' : ''} ${isRemoved ? 'is-remove' : ''}`} data-deque-item={item.id}>
              <span className="sw-candidate-badge">{isRemoved ? 'REMOVE BACK' : isBoth ? 'FRONT · BACK' : isFront ? 'FRONT' : isBack ? 'BACK' : ''}</span>
              <strong>{parts.value}</strong><small>index {parts.index.replace('i', '')}</small>
            </article>
          </React.Fragment>;
        }) : <p className="sw-deque-empty" role="listitem"><strong>Empty candidate deque</strong><small>indices will enter from BACK</small></p>}
      </div>
    </div>
    <div className="sw-discarded">
      <span>DISCARDED CANDIDATE</span>
      {discarded ? <div className="sw-discarded-item"><b aria-hidden="true">×</b><strong>{discarded.value}</strong><small>{discarded.reason}</small></div> : <p>No candidate staged for removal</p>}
    </div>
  </section>;
});

const SupportCards = memo(function SupportCards({ frame, presentation, windowStart, windowEnd }) {
  const output = frame.output || [];
  return <div className="sw-support-row">
    <section className="sw-card sw-window-explanation" aria-labelledby="sw-bounds-title">
      <h2 id="sw-bounds-title">Window bounds / expiry check</h2>
      <p>{presentation.windowMessage}</p>
      <div><strong>Why indices matter</strong><span>Expiry checks use candidate positions even though this dataset never triggers REMOVE_FRONT.</span></div>
      <span className="sr-only">Active range {windowStart} through {windowEnd}</span>
    </section>
    <section className="sw-card sw-output" aria-labelledby="sw-output-title" data-testid="output" data-output={output.join(',')}>
      <h2 id="sw-output-title">Output / window maximum</h2>
      <span className="sw-output-caption">maxima so far</span>
      <div className="sw-output-chips" aria-label={output.length ? `Maxima so far: ${output.join(', ')}` : 'No maxima emitted yet'}>
        {output.length ? output.map((value, index) => <strong key={`${index}:${value}`}>{value}</strong>) : <span className="sw-empty-output">[ ]</span>}
      </div>
      <strong className="sw-front-maximum">FRONT → window maximum</strong>
    </section>
    <section className="sw-card sw-teaching-point" aria-labelledby="sw-teaching-title" data-testid="teaching-point" data-activity-teaching>
      <h2 id="sw-teaching-title">Teaching point</h2>
      <p>{presentation.teachingPoint}</p>
      <ul>{WINDOWS.map(([label, values, maximum]) => <li key={label}><span>{label}</span><code>{values} → {maximum}</code></li>)}</ul>
    </section>
  </div>;
});

const ToolRail = memo(function ToolRail({ onPseudocode, onRestart, onConcepts }) {
  return <aside className="sw-tool-rail" aria-label="Visualization tools">
    <button type="button" aria-label="Focus pseudocode" title="Focus pseudocode" onClick={onPseudocode}><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/></svg></button>
    <button type="button" aria-label="Restart execution" title="Restart execution" onClick={onRestart}><svg viewBox="0 0 24 24"><path d="M3 11a9 9 0 1 1 2.6 6.4M3 4v7h7"/></svg></button>
    <button type="button" aria-label="Focus deque concepts" title="Focus deque concepts" onClick={onConcepts}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.3 1.5c-1.1 1.3-2 1.4-2 3M12 17h.01"/></svg></button>
  </aside>;
});

const FooterControls = memo(function FooterControls({ state, controller, motionPreference, frame, detailsRef, Icon }) {
  const [packStatus, setPackStatus] = useState('');
  const output = frame.output || [];
  const items = frame.lanes?.[0]?.items || [];
  const current = state.index + 1;
  return <footer className="sw-footer" role="region" aria-label="Playback controls">
    <div className="sw-progress">
      <strong aria-live="polite">Step {current} of {state.total || 11}</strong>
      <div role="progressbar" aria-label="Execution progress" aria-valuemin="1" aria-valuemax="11" aria-valuenow={current}><span style={{ width: `${(current / 11) * 100}%` }}/></div>
    </div>
    <div className="sw-transport">
      <button type="button" onClick={() => controller.step(-1)} disabled={state.index === 0 || state.transitioning}><Icon name="previous" size={14}/><span>Previous</span></button>
      <button type="button" onClick={() => controller.seek(0)} disabled={state.index === 0}><Icon name="restart" size={14}/><span>Restart</span></button>
      <button type="button" className="is-primary" onClick={controller.toggle} disabled={state.atEnd} aria-label={state.status === 'playing' ? 'Pause' : 'Play'}><Icon name={state.status === 'playing' ? 'pause' : 'play'} size={14}/><span>{state.status === 'playing' ? 'Pause' : 'Play'}</span></button>
      <button type="button" onClick={() => controller.step(1)} disabled={state.atEnd || state.transitioning}><span>Step</span><Icon name="next" size={14}/></button>
      <details className="sw-settings" ref={detailsRef}>
        <summary><Icon name="settings" size={14}/><span>Settings</span></summary>
        <div className="sw-settings-popover">
          <label>Speed<select value={state.speed} onChange={(event) => controller.setSpeed(event.target.value)}><option value="3">0.5×</option><option value="6">1×</option><option value="9">2×</option></select></label>
          <label>Motion<select aria-label="Motion preference" value={motionPreference.override || 'device'} onChange={(event) => motionPreference.update(event.target.value)}><option value="device">Use device setting</option><option value="on">On</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label>
          <button type="button" className="sw-offline-download" onClick={async () => {
            setPackStatus('Checking pack size…');
            try {
              const response = await fetch(new URL('activity-packs/manifest.json', location.href));
              if (!response.ok) throw new Error('Could not read the optional pack manifest.');
              const manifest = await response.json();
              const kib = (manifest.bytes / 1024).toFixed(1);
              if (!window.confirm(`Download ${manifest.title} for offline use? The pack is ${manifest.bytes.toLocaleString()} bytes (${kib} KiB).`)) {
                setPackStatus('Download canceled.');
                return;
              }
              const cache = await caches.open(manifest.cacheName);
              await cache.addAll(manifest.files.map((file) => new URL(file, location.href).href));
              setPackStatus(`Saved for offline use · ${manifest.bytes.toLocaleString()} bytes`);
            } catch {
              setPackStatus('Could not save this pack. Reconnect and try again.');
            }
          }}>Download for offline use</button>
          {packStatus ? <span className="sw-pack-status" role="status">{packStatus}</span> : null}
        </div>
      </details>
    </div>
    <div className="sw-footer-metrics"><span>deque size <strong>{items.length}</strong></span><span>output <strong>{output.length ? `[${output.join(', ')}]` : '[ ]'}</strong></span></div>
  </footer>;
});

export const SlidingWindowMaximumWorkspace = memo(function SlidingWindowMaximumWorkspace({ activity, event, state, controller, motionPreference, Icon }) {
  const sourceRef = useRef(null);
  const conceptsRef = useRef(null);
  const settingsRef = useRef(null);
  const frame = event?.frame || {};
  const step = state.index + 1;
  const presentation = { ...(frame.presentation || {}), ...STORYBOARD_COPY[state.index] };
  const currentIndex = Number.isInteger(presentation.index) ? presentation.index : (frame.input?.active >= 0 ? frame.input.active : 0);
  const currentValue = frame.input?.tokens?.[currentIndex] ?? '—';
  const windowStart = Math.max(0, currentIndex - 2);
  const windowEnd = currentIndex;
  const activeLine = event?.source?.line || 1;
  const focusPanel = (ref) => { ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); ref.current?.focus?.({ preventScroll: true }); };

  return <div className="sliding-window-app" role="region" aria-label="Activity workbench" data-activity-workbench data-activity-id={activity.id} data-testid="sliding-window-app" data-state-index={step}>
    <header className="sw-header">
      <a className="sw-brand" href="itcc47.html"><span aria-hidden="true">47</span><strong>ITCC47 Learning Lab</strong></a>
      <nav aria-label="Primary navigation">{NAVIGATION.map(([label, href]) => <a href={href} className={label === 'Visualize' ? 'is-active' : ''} aria-current={label === 'Visualize' ? 'page' : undefined} key={label}>{label}</a>)}</nav>
    </header>
    <section className="sw-intro" aria-labelledby="sw-page-title">
      <div className="sw-breadcrumbs"><a href="itcc47.html">Home</a><span>/</span><a href="problems.html?view=visualizations">Visualize</a><span>/</span><a href="problem-list.html?module=4">Module 4 - Deques</a></div>
      <div className="sw-intro-main"><div><h1 id="sw-page-title">{activity.title}</h1><p>{activity.subtitle}</p></div><a className="sw-practice-link" href="problem-list.html?module=4"><Icon name="grid" size={14}/>Practice this module</a></div>
    </section>
    <div className="sw-content">
      <aside className="sw-sidebar" aria-label="Pseudocode and algorithm reference">
        <PseudocodePanel source={activity.source} activeLine={activeLine} panelRef={sourceRef}/>
        <ExecutionStatus line={activeLine} currentIndex={currentIndex} currentValue={currentValue} operation={presentation.operationLabel || frame.operation?.label || '—'} size={frame.lanes?.[0]?.items?.length || 0} step={step}/>
        <ConceptsPanel panelRef={conceptsRef}/>
      </aside>
      <main className="sw-main" aria-label="Sliding-window maximum execution">
        <CurrentOperation presentation={presentation} step={step}/>
        <InputWindow frame={frame} currentIndex={currentIndex} currentValue={currentValue} windowStart={windowStart} windowEnd={windowEnd}/>
        <div className="sw-visual-row">
          <ComparisonPanel event={event} presentation={presentation} currentValue={currentValue}/>
          <CandidateDeque frame={frame} presentation={presentation}/>
        </div>
        <SupportCards frame={frame} presentation={presentation} windowStart={windowStart} windowEnd={windowEnd}/>
      </main>
      <ToolRail onPseudocode={() => focusPanel(sourceRef)} onRestart={() => controller.seek(0)} onConcepts={() => focusPanel(conceptsRef)}/>
    </div>
    <FooterControls state={state} controller={controller} motionPreference={motionPreference} frame={frame} detailsRef={settingsRef} Icon={Icon}/>
  </div>;
});
