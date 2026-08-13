import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, LayoutGroup, LazyMotion, MotionConfig, domMax, m } from 'motion/react';
import './workspace.css';

const MAX_VISUAL_VALUES = 18;
const DEFAULT_SPEED = 6;
const MOTION_STORAGE_KEY = 'itcc47:visualizer-motion:v1';
const MOTION_DURATIONS = Object.freeze({ 3: 0.8, 6: 0.52, 9: 0.3 });

function motionDuration(speed) { return MOTION_DURATIONS[speed] || 0.52; }

function useMotionPreference() {
  const [override, setOverride] = useState(() => {
    try { return localStorage.getItem(MOTION_STORAGE_KEY); } catch { return null; }
  });
  const [deviceReduced, setDeviceReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateDevice = () => setDeviceReduced(media.matches);
    media.addEventListener?.('change', updateDevice);
    return () => media.removeEventListener?.('change', updateDevice);
  }, []);
  const mode = override || (deviceReduced ? 'reduced' : 'on');
  const update = useCallback((next) => {
    const value = next === 'device' ? null : next;
    try { if (value) localStorage.setItem(MOTION_STORAGE_KEY, value); else localStorage.removeItem(MOTION_STORAGE_KEY); } catch { /* session state still applies */ }
    setOverride(value);
  }, []);
  return { mode, override, update };
}

function useTransitionBoundary({ state, event, controller, mode }) {
  const completed = useRef(new Set());
  const expected = useMemo(() => new Set([
    ...(event?.transition?.moves || []).map((move) => move.entityId),
    ...(event?.transition?.enter || []), ...(event?.transition?.exit || []),
  ]), [event]);
  useEffect(() => {
    completed.current = new Set();
    if (!state.transitioning || !state.transitionToken) return undefined;
    if (mode !== 'on' || expected.size === 0) {
      controller.completeTransition(state.transitionToken);
      return undefined;
    }
    const timeout = setTimeout(() => controller.completeTransition(state.transitionToken), motionDuration(state.speed) * 1000 + 100);
    return () => clearTimeout(timeout);
  }, [controller, event?.id, expected, mode, state.speed, state.transitionToken, state.transitioning]);
  return useCallback((entityId) => {
    if (!state.transitioning || !state.transitionToken || !expected.has(entityId)) return;
    completed.current.add(entityId);
    if ([...expected].every((id) => completed.current.has(id))) controller.completeTransition(state.transitionToken);
  }, [controller, expected, state.transitionToken, state.transitioning]);
}

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

const ArrayRenderer = memo(function ArrayRenderer({ frame, event, motionMode, duration, onEntityComplete }) {
  const values = frame?.array || [];
  const fallbackEntities = (frame?.items || []).map((item, index) => ({ id: item.id, value: values[index] }));
  const presentation = frame?.presentation || { entities: fallbackEntities, slots: fallbackEntities.map((entity) => entity.id), held: null };
  const entities = new Map(presentation.entities.map((entity) => [entity.id, entity]));
  const slots = presentation.slots || [];
  const action = frame?.highlight?.swap || frame?.highlight?.move || null;
  const heldEntity = presentation.held ? entities.get(presentation.held.entityId) : null;
  const actionStart = action ? ((Math.min(...action) + 0.5) / slots.length) * 100 : 0;
  const actionEnd = action ? ((Math.max(...action) + 0.5) / slots.length) * 100 : 0;
  return <div className="array-canvas" aria-label="Array visualization"><LayoutGroup id="array-layout">
    <div className="array-stage" style={{ '--array-count': slots.length }}>
    <div className="array-cells" style={{ '--array-count': slots.length }}>
      {slots.map((entityId, index) => {
        const state = classifyIndex(index, frame.highlight);
        const marker = frame?.markers?.index === index;
        const entity = entities.get(entityId);
        return <div className={`array-item ${marker ? 'has-marker' : ''}`} data-slot={`slot:${index}`} key={`slot:${index}`}>
          {marker ? <span className="array-marker">index</span> : null}
          <div className={`array-cell-slot ${entity ? '' : 'is-empty'}`} aria-label={`Index ${index}, ${entity ? `value ${entity.value}` : 'temporarily empty'}, ${state}`}>
            <AnimatePresence initial={false}>{entity ? <m.div layout layoutId={entity.id} data-entity-id={entity.id} className={`array-cell bar-${state}`}
              initial={event?.transition?.enter?.includes(entity.id) ? { opacity: 0, scale: .72 } : false} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .72 }}
              transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] }, opacity: { duration: Math.min(duration, .18) } }}
              onLayoutAnimationComplete={() => onEntityComplete(entity.id)} onAnimationComplete={() => onEntityComplete(entity.id)}>
              <span className="array-value">{entity.value}</span>
            </m.div> : <span className="array-hole" aria-hidden="true">&mdash;</span>}</AnimatePresence>
          </div>
          <span className="array-index" aria-hidden="true">{index}</span>
        </div>;
      })}
    </div>
    <AnimatePresence initial={false}>{heldEntity ? <m.div layout layoutId={heldEntity.id} data-entity-id={heldEntity.id} className="array-held-value" style={{ '--held-column': (presentation.held.from ?? 0) + 1 }}
      transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] } }} onLayoutAnimationComplete={() => onEntityComplete(heldEntity.id)} onAnimationComplete={() => onEntityComplete(heldEntity.id)} aria-label={`Held insertion value ${heldEntity.value}`}>
      <span>held</span><strong>{heldEntity.value}</strong></m.div> : null}</AnimatePresence>
    {action ? <div className={`array-connector ${frame?.highlight?.swap ? 'is-swap' : 'is-move'}`} aria-hidden="true">
      <m.svg viewBox="0 0 100 24" preserveAspectRatio="none" initial={motionMode === 'on' ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: Math.min(duration, .2) }}><m.path d={`M ${actionStart} 3 C ${actionStart} 22, ${actionEnd} 22, ${actionEnd} 3`} initial={motionMode === 'on' ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration }}/><path d={`M ${actionEnd - 1.4} 5 L ${actionEnd} 2 L ${actionEnd + 1.4} 5`} /></m.svg>
      <span style={{ left: `${(actionStart + actionEnd) / 2}%` }}>{frame?.highlight?.swap ? 'swap' : 'move'}</span>
    </div> : null}
    </div>
    <div className="array-legend" aria-label="Visualization legend"><span><i className="legend-current"/>Active</span><span><i className="legend-sorted"/>Complete</span><span>Position is shown by index, not height.</span></div>
  </LayoutGroup></div>;
});

ITCC47VisualizerRegistry.registerRenderer('array', ArrayRenderer);

const LinkedListRenderer = memo(function LinkedListRenderer({ frame, event, duration, onEntityComplete }) {
  const nodes = frame?.nodes || [];
  const pointersByNode = Object.entries(frame?.pointers || {}).reduce((grouped, [name, id]) => {
    const key = id || 'NULL';
    grouped[key] = [...(grouped[key] || []), name];
    return grouped;
  }, {});
  return <div className="linked-canvas" aria-label="Singly linked list visualization"><LayoutGroup id="linked-layout">
    <div className="linked-chain">
      {nodes.map((node, index) => <React.Fragment key={node.id}>
        <m.div layout layoutId={`node:${node.id}`} data-node-id={node.id} className="linked-node-wrap" initial={event?.transition?.enter?.includes(node.id) ? { opacity: 0, scale: .72 } : false} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .72 }} transition={{ layout: { duration }, opacity: { duration: Math.min(duration, .18) } }} onLayoutAnimationComplete={() => onEntityComplete(node.id)} onAnimationComplete={() => onEntityComplete(node.id)}>
          <div className="pointer-labels">{(pointersByNode[node.id] || []).map((name) => <m.span layout layoutId={`pointer:${name}`} data-pointer-name={name} transition={{ layout: { duration } }} onLayoutAnimationComplete={() => onEntityComplete(`pointer:${name}`)} key={name}>{name}</m.span>)}</div>
          <div className="linked-node" aria-label={`${node.id}, value ${node.value}`}>
            <strong>{node.value}</strong><span className={frame.highlightedEdges?.some((edge) => edge.from === node.id) ? 'is-highlighted' : ''}>●</span>
          </div>
          <small>{node.id}</small>
        </m.div>
        {index < nodes.length - 1 && node.next === nodes[index + 1].id
          ? <m.div layout data-edge-id={`edge:${node.id}->${nodes[index + 1].id}`} initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration }} onAnimationComplete={() => onEntityComplete(`edge:${node.id}->${nodes[index + 1].id}`)} className={`linked-arrow ${frame.highlightedEdges?.some((edge) => edge.from === node.id && edge.to === nodes[index + 1].id) ? 'is-highlighted' : ''}`} aria-hidden="true">→</m.div>
          : index < nodes.length - 1 ? <div className="linked-chain-gap" aria-hidden="true"/> : null}
      </React.Fragment>)}
      <div className="linked-null"><span>NULL</span>{(pointersByNode.NULL || []).map((name) => <m.small layout layoutId={`pointer:${name}`} data-pointer-name={name} transition={{ layout: { duration } }} onLayoutAnimationComplete={() => onEntityComplete(`pointer:${name}`)} key={name}>{name}</m.small>)}</div>
    </div>
  </LayoutGroup></div>;
});

ITCC47VisualizerRegistry.registerRenderer('linked-list', LinkedListRenderer);

function SourcePanel({ activity, event }) {
  const activeLine = event?.source?.line || (event?.type === 'complete' ? activity.source.length : Math.min(2, activity.source.length));
  return <section className="source-panel" aria-label="Pseudocode">
    {activity.source.map((line, index) => <div className={`source-line ${activeLine === index + 1 ? 'is-current' : ''}`} key={`${activity.id}:${index}`}>
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

function OperationsView({ activity, event }) {
  const [mode, setMode] = useState('metrics');
  const metricRows = activity.metrics.map((metric) => ({ ...metric, value: event?.metrics?.[metric.key] ?? 0 }));
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
  return <div className="output-view"><span>Current explanation</span><strong>{event?.message || 'Choose an activity to begin.'}</strong>{result?.removed != null ? <p>Removed value: {result.removed}</p> : null}</div>;
}

ITCC47VisualizerRegistry.registerEvidenceView('trace', TraceView);
ITCC47VisualizerRegistry.registerEvidenceView('variables', VariablesView);
ITCC47VisualizerRegistry.registerEvidenceView('operations', OperationsView);
ITCC47VisualizerRegistry.registerEvidenceView('output', OutputView);

function EvidenceDrawer({ tab, setTab, activity, result, event, index, controller, inputs }) {
  const tabs = ['trace', 'variables', 'operations', 'output'];
  return <aside className="evidence-drawer">
    <div className="evidence-tabs" role="tablist" aria-label="Learning evidence">
      {tabs.map((id) => <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>{id[0].toUpperCase() + id.slice(1)}</button>)}
    </div>
    <div className="evidence-content" role="tabpanel">
      {tab === 'trace' ? <TraceView events={result.events} currentIndex={index} onSelect={controller.seek} /> : null}
      {tab === 'variables' ? <VariablesView frame={event?.frame} inputs={inputs} /> : null}
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

function DataControls({ activity, inputs, setInputs, onShuffle }) {
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

function PlaybackDock({ state, controller, activity, event, motionPreference }) {
  const visibleMetrics = activity.metrics.slice(0, 2);
  return <footer className="playback-dock">
    <div className="transport">
      <button type="button" aria-label="Previous" onClick={() => controller.step(-1)} disabled={state.index === 0 || state.transitioning}><Icon name="previous"/></button>
      <button type="button" className="primary" aria-label={state.status === 'playing' ? 'Pause' : 'Play'} onClick={controller.toggle} disabled={state.atEnd}><Icon name={state.status === 'playing' ? 'pause' : 'play'}/><span>{state.status === 'playing' ? 'Pause' : 'Play'}</span></button>
      <button id="btn-step" type="button" aria-label="Step" onClick={() => controller.step(1)} disabled={state.atEnd || state.transitioning}><Icon name="next"/><span>Step</span></button>
    </div>
    <div className="timeline-control"><input id="step-slider" type="range" min="0" max={Math.max(state.total - 1, 0)} value={state.index} onChange={(e) => controller.seek(Number(e.target.value))} aria-label="Timeline step"/><strong>{state.total ? state.index + 1 : 0} / {state.total}</strong></div>
    <label className="speed-control">Speed<select value={state.speed} onChange={(e) => controller.setSpeed(e.target.value)}><option value="3">0.5×</option><option value="6">1×</option><option value="9">2×</option></select></label>
    <label className="motion-control">Motion<select aria-label="Motion preference" value={motionPreference.override || 'device'} onChange={(e) => motionPreference.update(e.target.value)}><option value="device">Use device setting</option><option value="on">On</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label>
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
  const initialId = new URLSearchParams(location.search).get('activity') || 'bubble-sort';
  const activity = useMemo(() => ITCC47Activities.get(initialId), [initialId]);
  const initialInputs = useCallback((nextActivity) => ({
    values: [...nextActivity.input.defaultValues],
    target: nextActivity.input.needsTarget ? nextActivity.input.defaultValues[Math.floor(nextActivity.input.defaultValues.length / 2)] : null,
    index: nextActivity.input.index ?? null, value: nextActivity.input.value ?? null,
  }), []);
  const [inputs, setInputs] = useState(() => initialInputs(activity));
  const [evidenceTab, setEvidenceTab] = useState('trace');
  const [mobileTab, setMobileTab] = useState('visualize');
  const controller = useMemo(() => ITCC47Playback.createController({ speed: DEFAULT_SPEED, delayForSpeed: (speed) => 1250 - speed * 110 }), []);
  const playback = usePlayback(controller);
  const motionPreference = useMotionPreference();
  const result = useMemo(() => activity.run(inputs), [activity, inputs]);
  const event = result.events[playback.index] || result.events[0] || null;
  const onEntityComplete = useTransitionBoundary({ state: playback, event, controller, mode: motionPreference.mode });
  const duration = motionPreference.mode === 'on' ? motionDuration(playback.speed) : (motionPreference.mode === 'reduced' ? 0.16 : 0);
  const visualDuration = playback.navigationSource === 'seek' || playback.navigationSource === 'load' ? 0 : duration;
  const [Renderer, setRenderer] = useState(() => ArrayRenderer);

  useEffect(() => { controller.load(result.events); }, [controller, result]);
  useEffect(() => () => controller.dispose(), [controller]);
  useEffect(() => {
    let active = true;
    ITCC47VisualizerRegistry.resolveRenderer(activity.renderer).then((resolved) => { if (active && resolved) setRenderer(() => resolved); });
    return () => { active = false; };
  }, [activity.renderer]);

  function shuffle() {
    const values = Array.from({ length: inputs.values.length }, () => Math.floor(Math.random() * 95) + 5);
    setInputs((current) => ({ ...current, values, target: activity.input.needsTarget ? values[Math.floor(values.length / 2)] : current.target }));
  }

  const mobileTabs = [
    ['visualize', 'grid', 'Visualize'], ['code', 'code', 'Code'], ['trace', 'list', 'Trace'], ['more', 'more', 'More'],
  ];
  return <LazyMotion features={domMax} strict><MotionConfig reducedMotion={motionPreference.mode === 'on' ? 'never' : 'always'} transition={{ duration }}><div className={`visualizer-workspace motion-${motionPreference.mode} navigation-${playback.navigationSource}`} data-motion-duration={duration}>
    <main className="workspace-main">
      <div className="activity-heading"><div><p><a href="problems.html?view=visualizations"><Icon name="back" size={14}/> All visualizations</a><span>Module {activity.module} / {activity.topic}</span></p><h1>{activity.title}</h1><span>{activity.subtitle}</span></div><a className="edit-code" href={`tracer.html?activity=${encodeURIComponent(activity.id)}`}><Icon name="code" size={17}/> Edit pseudocode</a></div>
      <DataControls activity={activity} inputs={inputs} setInputs={setInputs} onShuffle={shuffle}/>
      <div className="mobile-surface-tabs" role="tablist" aria-label="Workspace view">{mobileTabs.map(([id, icon, label]) => <button type="button" role="tab" aria-selected={mobileTab === id} className={mobileTab === id ? 'active' : ''} onClick={() => setMobileTab(id)} key={id}><Icon name={icon}/>{label}</button>)}</div>
      <div className={`desktop-source mobile-surface ${mobileTab === 'code' ? 'mobile-active' : ''}`}><SourcePanel activity={activity} event={event}/></div>
      <section className={`visual-canvas mobile-surface ${mobileTab === 'visualize' ? 'mobile-active' : ''}`} tabIndex="0" aria-label={`${activity.title} visualization canvas`}>
        <Renderer frame={event?.frame} event={event} activity={activity} motionMode={motionPreference.mode} duration={visualDuration} onEntityComplete={onEntityComplete}/>
      </section>
      <p id="result-caption" className="current-step" aria-live="polite"><span>{playback.index + 1}</span>{event?.message || 'Preparing activity…'}</p>
      <div className={`mobile-evidence mobile-surface ${mobileTab === 'trace' || mobileTab === 'more' ? 'mobile-active' : ''}`}>
        <EvidenceDrawer tab={mobileTab === 'trace' ? 'trace' : evidenceTab} setTab={setEvidenceTab} activity={activity} result={result} event={event} index={playback.index} controller={controller} inputs={inputs}/>
      </div>
    </main>
    <div className="desktop-evidence"><EvidenceDrawer tab={evidenceTab} setTab={setEvidenceTab} activity={activity} result={result} event={event} index={playback.index} controller={controller} inputs={inputs}/></div>
    <PlaybackDock state={playback} controller={controller} activity={activity} event={event} motionPreference={motionPreference}/>
  </div></MotionConfig></LazyMotion>;
}

const root = document.getElementById('visualizer-root');
if (root) createRoot(root).render(<App/>);
