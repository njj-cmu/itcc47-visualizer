import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import './workspace.css';

const MAX_VISUAL_VALUES = 18;
const DEFAULT_SPEED = 6;

function Icon({ name, size = 20 }) {
  const paths = {
    back: <><path d="M19 12H5"/><path d="m10 7-5 5 5 5"/></>,
    code: <><path d="m8 9-3 3 3 3"/><path d="m16 9 3 3-3 3"/><path d="m14 5-4 14"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    pause: <><path d="M8 5v14M16 5v14"/></>,
    play: <path d="m8 5 11 7-11 7V5Z"/>,
    previous: <><path d="M6 5v14"/><path d="m18 6-9 6 9 6Z"/></>,
    next: <><path d="M18 5v14"/><path d="m6 6 9 6-9 6Z"/></>,
    shuffle: <><path d="M3 7h3c4 0 5 10 9 10h6"/><path d="m18 14 3 3-3 3"/><path d="M3 17h3c1.5 0 2.6-1.4 3.6-3"/><path d="M14.4 10c1-1.6 2.1-3 3.6-3h3"/><path d="m18 4 3 3-3 3"/></>,
  };
  return <svg className="vw-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function usePlayback(controller) {
  const subscribe = useCallback((listener) => controller.subscribe(listener), [controller]);
  const getSnapshot = useCallback(() => controller.getSnapshot(), [controller]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function classifyIndex(index, highlight = {}) {
  if (highlight.found === index) return 'found';
  if (highlight.swap?.includes(index)) return 'swap';
  if (highlight.move?.includes(index)) return 'move';
  if (highlight.compare?.includes(index)) return 'compare';
  if (highlight.mid === index) return 'mid';
  if (highlight.active?.includes(index)) return 'active';
  if (highlight.range && (index < highlight.range[0] || index > highlight.range[1])) return 'eliminated';
  if (highlight.sorted?.includes(index)) return 'sorted';
  return 'default';
}

const ArrayRenderer = memo(function ArrayRenderer({ frame, event }) {
  const values = frame?.array || [];
  const action = frame?.highlight?.swap || frame?.highlight?.move || null;
  const transition = frame?.highlight?.transition || null;
  const held = frame?.highlight?.held || null;
  const actionStart = action ? ((Math.min(...action) + 0.5) / values.length) * 100 : 0;
  const actionEnd = action ? ((Math.max(...action) + 0.5) / values.length) * 100 : 0;
  return <div className="array-canvas" aria-label="Array visualization">
    <div className="array-stage" style={{ '--array-count': values.length }}>
    <div className="array-cells" style={{ '--array-count': values.length }}>
      {values.map((value, index) => {
        const state = classifyIndex(index, frame.highlight);
        const marker = frame?.markers?.index === index;
        const isTransitionSource = transition?.from === index || held?.hole === index;
        const isTransitionDestination = transition?.to === index;
        const displayValue = isTransitionSource ? null : value;
        return <div className={`array-item ${marker ? 'has-marker' : ''}`} key={frame.items?.[index]?.id || index}>
          {marker ? <span className="array-marker">index</span> : null}
          <div className={`array-cell bar-${state} ${displayValue == null ? 'is-empty' : ''} ${isTransitionDestination ? 'is-receiving' : ''}`}
            aria-label={`Index ${index}, ${displayValue == null ? 'temporarily empty' : `value ${displayValue}`}, ${state}`}>
            <span className="array-value">{displayValue == null ? '—' : displayValue}</span>
          </div>
          <span className="array-index" aria-hidden="true">{index}</span>
        </div>;
      })}
    </div>
    {held ? <div className="array-held-value" style={{ '--held-column': held.from + 1 }} aria-label={`Held insertion value ${held.value}`}><span>held</span><strong>{held.value}</strong></div> : null}
    {transition ? <>
      <div className="array-moving-value" key={event?.id || `${transition.from}:${transition.to}`} style={{ '--move-from': transition.from, '--move-distance': transition.to - transition.from }} aria-hidden="true"><span>{transition.value}</span></div>
    </> : null}
    {action ? <div className={`array-connector ${frame?.highlight?.swap ? 'is-swap' : 'is-move'}`} aria-hidden="true">
      <svg viewBox="0 0 100 24" preserveAspectRatio="none"><path d={`M ${actionStart} 3 C ${actionStart} 22, ${actionEnd} 22, ${actionEnd} 3`} /><path d={`M ${actionEnd - 1.4} 5 L ${actionEnd} 2 L ${actionEnd + 1.4} 5`} /></svg>
      <span style={{ left: `${(actionStart + actionEnd) / 2}%` }}>{frame?.highlight?.swap ? 'swap' : 'move'}</span>
    </div> : null}
    </div>
    <div className="array-legend" aria-label="Visualization legend"><span><i className="legend-current"/>Active</span><span><i className="legend-sorted"/>Complete</span><span>Position is shown by index, not height.</span></div>
  </div>;
});

ITCC47VisualizerRegistry.registerRenderer('array', ArrayRenderer);

const LinkedListRenderer = memo(function LinkedListRenderer({ frame }) {
  const nodes = frame?.nodes || [];
  const pointersByNode = Object.entries(frame?.pointers || {}).reduce((grouped, [name, id]) => {
    const key = id || 'NULL';
    grouped[key] = [...(grouped[key] || []), name];
    return grouped;
  }, {});
  return <div className="linked-canvas" aria-label="Singly linked list visualization">
    <div className="linked-chain">
      {nodes.map((node, index) => <React.Fragment key={node.id}>
        <div className="linked-node-wrap">
          <div className="pointer-labels">{(pointersByNode[node.id] || []).map((name) => <span key={name}>{name}</span>)}</div>
          <div className="linked-node" aria-label={`${node.id}, value ${node.value}`}>
            <strong>{node.value}</strong><span className={frame.highlightedEdges?.some((edge) => edge.from === node.id) ? 'is-highlighted' : ''}>●</span>
          </div>
          <small>{node.id}</small>
        </div>
        {index < nodes.length - 1 && node.next === nodes[index + 1].id
          ? <div className={`linked-arrow ${frame.highlightedEdges?.some((edge) => edge.from === node.id && edge.to === nodes[index + 1].id) ? 'is-highlighted' : ''}`} aria-hidden="true">→</div>
          : index < nodes.length - 1 ? <div className="linked-chain-gap" aria-hidden="true"/> : null}
      </React.Fragment>)}
      <div className="linked-null"><span>NULL</span>{(pointersByNode.NULL || []).map((name) => <small key={name}>{name}</small>)}</div>
    </div>
  </div>;
});

ITCC47VisualizerRegistry.registerRenderer('linked-list', LinkedListRenderer);

const ObjectModelRenderer = memo(function ObjectModelRenderer({ frame }) {
  const classes = frame?.classes || [];
  const objects = frame?.objects || [];
  const references = Object.entries(frame?.references || {}).reduce((grouped, [name, objectId]) => {
    grouped[objectId] = [...(grouped[objectId] || []), name];
    return grouped;
  }, {});
  return <div className="object-canvas" aria-label="Python classes, objects, and references">
    <section className="object-class-region" aria-label="Class blueprints">
      <h2>Class blueprints</h2>
      <div className="object-class-grid">{classes.map((item) => <article className={`object-class-card status-${item.status || 'ready'}`} key={item.id} aria-label={`${item.name} class${item.bases.length ? `, inherits ${item.bases.join(', ')}` : ''}`}>
        <header><span>class</span><strong>{item.name}</strong>{item.status === 'abstract' ? <em>abstract</em> : null}</header>
        {item.bases.length ? <p className="object-bases">inherits {item.bases.map((id) => id.replace('class:', '')).join(', ')}</p> : null}
        {item.attributes.map((attribute) => <code key={attribute}>{attribute}</code>)}
        {item.methods.map((method) => <code key={method}>{method}</code>)}
        {item.abstractMethods.map((method) => <code className="is-abstract" key={method}>required: {method}</code>)}
      </article>)}</div>
    </section>
    <section className="object-instance-region" aria-label="Object instances">
      <h2>Instances and references</h2>
      {objects.length ? <div className="object-instance-grid">{objects.map((item) => {
        const active = frame?.active?.receiverId === item.id || item.status === 'active';
        return <article className={`object-instance-card status-${item.status || 'ready'} ${active ? 'is-current' : ''}`} key={item.id} aria-label={`${item.id}, ${item.classId.replace('class:', '')} object`}>
          <div className="object-reference-labels">{(references[item.id] || []).map((name) => <span key={name}>{name} →</span>)}</div>
          <header><span>{item.id}</span><strong>{item.label}</strong><small>{item.classId.replace('class:', '')}</small></header>
          <dl>{Object.entries(item.fields).map(([name, value]) => <div key={name}><dt>{name}</dt><dd><code>{JSON.stringify(value)}</code></dd></div>)}</dl>
        </article>;
      })}</div> : <p className="object-empty">No instance has been allocated yet. The class blueprint exists on its own.</p>}
    </section>
    {frame?.active ? <aside className="object-active-call" aria-label="Current method call"><span>Current call</span><strong>{frame.active.method}</strong><small>lookup: {frame.active.lookupPath.map((id) => id.replace('class:', '')).join(' → ')}</small></aside> : null}
    {frame?.notice ? <p className="object-notice">{frame.notice}</p> : null}
  </div>;
});

BSITVisualizerRegistry.registerRenderer('object-model', ObjectModelRenderer);

function SourcePanel({ activity, event, source }) {
  const [copyState, setCopyState] = useState('Copy Python');
  const activeLine = event?.source?.line || (event?.type === 'complete' ? source.length : Math.min(2, source.length));
  async function copySource() {
    const text = source.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.select();
      document.execCommand('copy'); textarea.remove();
    }
    setCopyState('Copied'); window.setTimeout(() => setCopyState('Copy Python'), 1400);
  }
  return <section className="source-panel" aria-label={activity.language === 'python' ? 'Python source' : 'Pseudocode'}>
    {activity.language === 'python' ? <header className="source-language"><strong>Python source</strong><button type="button" onClick={copySource}><Icon name="code" size={16}/>{copyState}</button></header> : null}
    {source.map((line, index) => <div className={`source-line ${activeLine === index + 1 ? 'is-current' : ''}`} key={`${activity.id}:${index}`}>
      <span>{index + 1}</span><code>{line}</code>
    </div>)}
  </section>;
}

function TraceView({ events, currentIndex, onSelect }) {
  const start = Math.max(0, Math.min(events.length - 80, currentIndex - 30));
  const visible = events.slice(start, start + 80);
  return <div className="trace-list" role="list" aria-label="Execution trace">
    {start > 0 ? <p className="window-note">{start} earlier steps hidden</p> : null}
    {visible.map((event, offset) => {
      const index = start + offset;
      return <button type="button" role="listitem" className={`trace-item ${index === currentIndex ? 'is-current' : ''}`} onClick={() => onSelect(index)} key={event.id}>
        <span className="trace-number">{index + 1}</span>
        <span><strong>{event.message}</strong><small>{event.source ? `Line ${event.source.line} · ${event.source.code}` : event.type}</small></span>
        <span className="trace-state" aria-hidden="true">{index < currentIndex ? '✓' : index === currentIndex ? '●' : '○'}</span>
      </button>;
    })}
  </div>;
}

function VariablesView({ frame, inputs }) {
  if (frame?.kind === 'linked-list') return <dl className="variable-list">
    {Object.entries(frame.pointers || {}).map(([name, id]) => <div key={name}><dt>{name}</dt><dd><code>{id ? `&${id}` : 'NULL'}</code></dd></div>)}
    <div><dt>Heap nodes</dt><dd>{frame.nodes?.length || 0}</dd></div>
  </dl>;
  return <dl className="variable-list">
    <div><dt>Values</dt><dd><code>[{(frame?.array || []).map((value) => value == null ? '—' : value).join(', ')}]</code></dd></div>
    {inputs.target != null ? <div><dt>target</dt><dd>{inputs.target}</dd></div> : null}
    {inputs.index != null ? <div><dt>index</dt><dd>{inputs.index}</dd></div> : null}
    {inputs.value != null ? <div><dt>value</dt><dd>{inputs.value}</dd></div> : null}
  </dl>;
}

function ObjectStateView({ frame }) {
  const objects = frame?.objects || [];
  return <div className="object-state-view">
    {objects.length ? objects.map((item) => <section key={item.id}><header><strong>{item.id}</strong><span>{item.classId.replace('class:', '')}</span></header><dl>{Object.entries(item.fields).map(([name, value]) => <div key={name}><dt>{name}</dt><dd><code>{JSON.stringify(value)}</code></dd></div>)}</dl></section>) : <p className="model-note">No object state exists at this step.</p>}
    {Object.keys(frame?.references || {}).length ? <section><header><strong>Name bindings</strong></header><dl>{Object.entries(frame.references).map(([name, id]) => <div key={name}><dt>{name}</dt><dd><code>{id}</code></dd></div>)}</dl></section> : null}
  </div>;
}

function CallPathView({ frame }) {
  const active = frame?.active;
  if (!active) return <p className="model-note">No method call is active at this step.</p>;
  return <div className="call-path-view"><span>Receiver</span><strong>{active.receiverId}</strong><span>Resolved method</span><strong>{active.method}</strong><span>Lookup path</span><ol>{active.lookupPath.map((id, index) => <li className={index === active.lookupPath.length - 1 ? 'resolved' : ''} key={id}>{id.replace('class:', '')}</li>)}</ol><span>Call frame</span><dl>{Object.entries(active.callFrame || {}).map(([name, value]) => <div key={name}><dt>{name}</dt><dd><code>{String(value)}</code></dd></div>)}</dl></div>;
}

function OperationsView({ activity, event }) {
  const [mode, setMode] = useState('metrics');
  const metricRows = (activity.metrics || []).map((metric) => ({ ...metric, value: event?.metrics?.[metric.key] ?? 0 }));
  return <div className="operations-view">
    <div className="mode-switch" role="group" aria-label="Operation model">
      <button type="button" className={mode === 'metrics' ? 'active' : ''} onClick={() => setMode('metrics')}>Algorithm metrics</button>
      <button type="button" className={mode === 'primitive' ? 'active' : ''} onClick={() => setMode('primitive')}>Primitive model</button>
    </div>
    {mode === 'metrics' ? <>
      <div className="metric-summary">{metricRows.map((metric) => <div key={metric.key}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
      <div className="metric-event"><span>Current event</span><strong>{event?.message || 'No event'}</strong></div>
    </> : <div className="model-note"><strong>Count pseudocode separately</strong><p>The course primitive-operation model is available in Pseudocode Lab. These algorithm metrics are never added to it.</p><a href="tracer.html">Open Pseudocode Lab</a></div>}
  </div>;
}

function OutputView({ event, result }) {
  const output = event?.frame?.output || [];
  return <div className="output-view"><span>Current explanation</span><strong>{event?.message || 'Choose an activity to begin.'}</strong>{output.length ? <pre aria-label="Program output">{output.join('\n')}</pre> : null}{result?.removed != null ? <p>Removed value: {result.removed}</p> : null}</div>;
}

ITCC47VisualizerRegistry.registerEvidenceView('trace', TraceView);
ITCC47VisualizerRegistry.registerEvidenceView('variables', VariablesView);
ITCC47VisualizerRegistry.registerEvidenceView('operations', OperationsView);
ITCC47VisualizerRegistry.registerEvidenceView('output', OutputView);

function EvidenceDrawer({ tab, setTab, activity, result, event, index, controller, inputs }) {
  const tabs = activity.evidenceViews || ['trace', 'variables', 'operations', 'output'];
  const labels = { trace: 'Trace', variables: 'Variables', operations: 'Operations', output: 'Output', steps: 'Steps', objects: 'Object state', calls: 'Call path' };
  return <aside className="evidence-drawer">
    <div className="evidence-tabs" role="tablist" aria-label="Learning evidence">
      {tabs.map((id) => <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>{labels[id] || id}</button>)}
    </div>
    <div className="evidence-content" role="tabpanel">
      {tab === 'trace' || tab === 'steps' ? <TraceView events={result.events} currentIndex={index} onSelect={controller.seek} /> : null}
      {tab === 'variables' ? <VariablesView frame={event?.frame} inputs={inputs} /> : null}
      {tab === 'objects' ? <ObjectStateView frame={event?.frame} /> : null}
      {tab === 'calls' ? <CallPathView frame={event?.frame} /> : null}
      {tab === 'operations' ? <OperationsView activity={activity} event={event} /> : null}
      {tab === 'output' ? <OutputView event={event} result={result.result} /> : null}
    </div>
  </aside>;
}

function ActivityRail({ activities, selectedId, onSelect }) {
  const families = [...new Set(activities.map((activity) => activity.family))];
  return <aside className="activity-rail">
    <a className="back-module" href="problems.html"><Icon name="back" size={18}/> Back to modules</a>
    {families.map((family) => <section key={family}>
      <h2>{family}</h2>
      {activities.filter((activity) => activity.family === family).map((activity) => <button type="button" className={selectedId === activity.id ? 'active' : ''} onClick={() => onSelect(activity.id)} key={activity.id}>
        <Icon name={family === 'Array Lists' ? 'list' : 'grid'} /><span>{activity.title}<small>Module {activity.module}</small></span>
      </button>)}
    </section>)}
    <section className="future-topics"><h2>Coming next</h2><p><Icon name="link"/> Linked Lists</p><p>Stacks</p><p>Queues</p></section>
  </aside>;
}

function MobileActivityPicker({ activities, selectedId, onSelect }) {
  return <nav className="mobile-activity-picker" aria-label="Choose an activity">
    {activities.map((activity) => <button type="button" className={selectedId === activity.id ? 'active' : ''} onClick={() => onSelect(activity.id)} key={activity.id}>{activity.title}</button>)}
  </nav>;
}

function ArrayDataControls({ activity, inputs, setInputs, onShuffle }) {
  const [draft, setDraft] = useState(inputs.values.join(', '));
  const [error, setError] = useState('');
  useEffect(() => setDraft(inputs.values.join(', ')), [activity.id, inputs.values]);
  function apply() {
    const parts = draft.split(/[,\s]+/).filter(Boolean);
    if (!parts.length || parts.some((part) => !/^-?\d+$/.test(part))) return setError('Use whole numbers separated by commas.');
    if (parts.length > MAX_VISUAL_VALUES) return setError(`Use at most ${MAX_VISUAL_VALUES} values so every item stays readable.`);
    if (parts.length < activity.input.min) return setError(`Use at least ${activity.input.min} values for this activity.`);
    setError(''); setInputs((current) => ({ ...current, values: parts.map(Number) }));
  }
  if (activity.input.editable === false) return <div className="data-controls curated-note"><strong>Curated pseudocode activity</strong><span>Open it in Pseudocode Lab to edit or experiment with compatible node programs.</span></div>;
  return <details className="data-controls" open>
    <summary>Data and inputs</summary>
    <div className="data-grid">
      <label>Custom values (comma-separated)<span><input value={draft} onChange={(e) => setDraft(e.target.value)} /><button type="button" onClick={apply}>Apply</button></span></label>
      {activity.input.needsTarget ? <label>Search target<input type="number" value={inputs.target ?? ''} onChange={(e) => setInputs((current) => ({ ...current, target: Number(e.target.value) }))}/></label> : null}
      {activity.input.kind === 'array-list' ? <><label>Index<input type="number" min="0" max={inputs.values.length} value={inputs.index} onChange={(e) => setInputs((current) => ({ ...current, index: Number(e.target.value) }))}/></label>{activity.id === 'array-list-insert' ? <label>New value<input type="number" value={inputs.value} onChange={(e) => setInputs((current) => ({ ...current, value: Number(e.target.value) }))}/></label> : null}</> : null}
      <button type="button" className="shuffle-action" onClick={onShuffle}><Icon name="shuffle" size={17}/> Shuffle</button>
    </div>
    <p id="data-error" className={`data-error ${error ? '' : 'hidden'}`} role="alert">{error}</p>
  </details>;
}

function OOPDataControls({ activity, inputs, setInputs }) {
  return <section className="oop-data-controls" aria-label="Scenario inputs">
    <div><strong>Scenario</strong><span>Edit the values; the guided timeline rebuilds immediately.</span></div>
    {activity.input.controls.map((control) => <label key={control.key}>{control.label}<input type={control.type} value={inputs[control.key] ?? ''}
      min={control.min} max={control.max} maxLength={control.maxLength}
      onChange={(event) => setInputs((current) => ({ ...current, [control.key]: control.type === 'number' ? Number(event.target.value) : event.target.value.slice(0, control.maxLength || 100) }))}/></label>)}
    <button type="button" onClick={() => setInputs({ ...activity.input.defaults })}><Icon name="previous" size={16}/> Reset</button>
  </section>;
}

function DataControls(props) {
  return props.activity.input.kind === 'object-model' ? <OOPDataControls {...props}/> : <ArrayDataControls {...props}/>;
}

function PlaybackDock({ state, controller, activity, event }) {
  const visibleMetrics = (activity.metrics || []).slice(0, 2);
  return <footer className="playback-dock">
    <div className="transport">
      <button type="button" aria-label="Previous" onClick={() => controller.step(-1)} disabled={state.index === 0}><Icon name="previous"/></button>
      <button type="button" className="primary" aria-label={state.status === 'playing' ? 'Pause' : 'Play'} onClick={controller.toggle} disabled={state.atEnd}><Icon name={state.status === 'playing' ? 'pause' : 'play'}/><span>{state.status === 'playing' ? 'Pause' : 'Play'}</span></button>
      <button id="btn-step" type="button" aria-label="Step" onClick={() => controller.step(1)} disabled={state.atEnd}><Icon name="next"/><span>Step</span></button>
    </div>
    <div className="timeline-control"><input id="step-slider" type="range" min="0" max={Math.max(state.total - 1, 0)} value={state.index} onChange={(e) => controller.seek(Number(e.target.value))} aria-label="Timeline step"/><strong>{state.total ? state.index + 1 : 0} / {state.total}</strong></div>
    <label className="speed-control">Speed<select value={state.speed} onChange={(e) => controller.setSpeed(e.target.value)}><option value="3">0.5×</option><option value="6">1×</option><option value="9">2×</option></select></label>
    <div className="dock-metrics">{visibleMetrics.map((metric) => <span key={metric.key}>{metric.label}<strong>{event?.metrics?.[metric.key] ?? 0}</strong></span>)}</div>
  </footer>;
}

function Header() {
  return <header className="workspace-header">
    <a className="workspace-brand" href="index.html"><span className="brand-mark">IT</span><strong>ITCC47 Learning Lab</strong></a>
    <nav aria-label="Primary"><a href="index.html">Start</a><a href="problems.html">Modules</a><a href="tracer.html">Pseudocode Lab</a><a href="practice.html?module=1">Problem Sets</a></nav>
    <button type="button" className="workspace-menu" aria-label="Menu"><Icon name="menu"/></button>
  </header>;
}

function App() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const requestedCourse = params.get('course') || 'itcc47';
  const courseId = BSITLearningLab.resolveCourse(requestedCourse);
  const requestedId = params.get('activity') || (courseId === 'itcc45' ? 'itcc45-classes-blueprint' : 'bubble-sort');
  const activity = useMemo(() => BSITLearningLab.getActivity(courseId, requestedId), [courseId, requestedId]);
  const initialInputs = useCallback((nextActivity) => {
    if (nextActivity.input.defaults) return { ...nextActivity.input.defaults };
    return {
      values: [...nextActivity.input.defaultValues],
      target: nextActivity.input.needsTarget ? nextActivity.input.defaultValues[Math.floor(nextActivity.input.defaultValues.length / 2)] : null,
      index: nextActivity.input.index ?? null, value: nextActivity.input.value ?? null,
    };
  }, []);
  const [inputs, setInputs] = useState(() => initialInputs(activity));
  const primaryEvidence = activity.evidenceViews?.[0] || 'trace';
  const [evidenceTab, setEvidenceTab] = useState(primaryEvidence);
  const [mobileTab, setMobileTab] = useState('visualize');
  const controller = useMemo(() => BSITPlayback.createController({ speed: DEFAULT_SPEED, delayForSpeed: (speed) => 1250 - speed * 110 }), []);
  const playback = usePlayback(controller);
  const result = useMemo(() => activity.run(inputs), [activity, inputs]);
  const source = useMemo(() => activity.sourceFor ? activity.sourceFor(inputs) : activity.source, [activity, inputs]);
  const event = result.events[playback.index] || result.events[0] || null;
  const [Renderer, setRenderer] = useState(() => activity.renderer === 'object-model' ? ObjectModelRenderer : ArrayRenderer);

  useEffect(() => { controller.load(result.events); }, [controller, result]);
  useEffect(() => () => controller.dispose(), [controller]);
  useEffect(() => {
    document.body.dataset.course = courseId;
    if (courseId === 'itcc45' || (params.get('activity') && params.get('activity') !== activity.id)) {
      const url = new URL(location.href); url.searchParams.set('course', courseId); url.searchParams.set('activity', activity.id); history.replaceState({}, '', url);
    }
  }, [activity.id, courseId, params]);
  useEffect(() => {
    let active = true;
    BSITVisualizerRegistry.resolveRenderer(activity.renderer).then((resolved) => { if (active && resolved) setRenderer(() => resolved); });
    return () => { active = false; };
  }, [activity.renderer]);

  function shuffle() {
    if (!Array.isArray(inputs.values)) return;
    const values = Array.from({ length: inputs.values.length }, () => Math.floor(Math.random() * 95) + 5);
    setInputs((current) => ({ ...current, values, target: activity.input.needsTarget ? values[Math.floor(values.length / 2)] : current.target }));
  }

  const mobileTabs = [['visualize', 'grid', 'Visualize'], ['code', 'code', 'Code'], ['trace', 'list', courseId === 'itcc45' ? 'Steps' : 'Trace'], ['more', 'more', 'More']];
  const backHref = courseId === 'itcc45' ? 'itcc45-topics.html' : 'problems.html?view=visualizations';
  const backLabel = courseId === 'itcc45' ? 'All topics' : 'All visualizations';
  return <div className={`visualizer-workspace course-${courseId}`}>
    <main className="workspace-main">
      <div className="activity-heading"><div><p><a href={backHref}><Icon name="back" size={14}/>{backLabel}</a><span>{courseId === 'itcc45' ? `Topic ${activity.module}` : `Module ${activity.module}`} / {activity.topic}</span></p><h1>{activity.title}</h1><span>{activity.subtitle}</span></div>{courseId === 'itcc45' ? <a className="edit-code" href={`itcc45-practice.html?topic=${activity.topicId}`}><Icon name="list" size={17}/> Practice this topic</a> : <a className="edit-code" href={`tracer.html?activity=${encodeURIComponent(activity.id)}`}><Icon name="code" size={17}/> Edit pseudocode</a>}</div>
      <DataControls activity={activity} inputs={inputs} setInputs={setInputs} onShuffle={shuffle}/>
      <div className="mobile-surface-tabs" role="tablist" aria-label="Workspace view">{mobileTabs.map(([id, icon, label]) => <button type="button" role="tab" aria-selected={mobileTab === id} className={mobileTab === id ? 'active' : ''} onClick={() => setMobileTab(id)} key={id}><Icon name={icon}/>{label}</button>)}</div>
      <div className={`desktop-source mobile-surface ${mobileTab === 'code' ? 'mobile-active' : ''}`}><SourcePanel activity={activity} event={event} source={source}/></div>
      <section className={`visual-canvas mobile-surface ${mobileTab === 'visualize' ? 'mobile-active' : ''}`} tabIndex="0" aria-label={`${activity.title} visualization canvas`}>
        <Renderer frame={event?.frame} event={event} activity={activity}/>
      </section>
      <p id="result-caption" className="current-step" aria-live="polite"><span>{playback.index + 1}</span>{event?.message || 'Preparing activity…'}</p>
      <div className={`mobile-evidence mobile-surface ${mobileTab === 'trace' || mobileTab === 'more' ? 'mobile-active' : ''}`}>
        <EvidenceDrawer tab={mobileTab === 'trace' ? primaryEvidence : evidenceTab} setTab={setEvidenceTab} activity={activity} result={result} event={event} index={playback.index} controller={controller} inputs={inputs}/>
      </div>
    </main>
    <div className="desktop-evidence"><EvidenceDrawer tab={evidenceTab} setTab={setEvidenceTab} activity={activity} result={result} event={event} index={playback.index} controller={controller} inputs={inputs}/></div>
    <PlaybackDock state={playback} controller={controller} activity={activity} event={event}/>
  </div>;
}

const root = document.getElementById('visualizer-root');
if (root) createRoot(root).render(<App/>);
