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
    close: <><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>,
    expand: <><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></>,
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

function slotIndex(location) {
  const match = String(location || '').match(/^slot:(\d+)$/);
  return match ? Number(match[1]) : null;
}

const ArrayRenderer = memo(function ArrayRenderer({ frame, event, motionMode, duration, onEntityComplete }) {
  const values = frame?.array || [];
  const fallbackEntities = (frame?.items || []).map((item, index) => ({ id: item.id, value: values[index] }));
  const presentation = frame?.presentation || { entities: fallbackEntities, slots: fallbackEntities.map((entity) => entity.id), held: null };
  const entities = new Map(presentation.entities.map((entity) => [entity.id, entity]));
  const slots = presentation.slots || [];
  const structuralMove = event?.transition?.moves?.find((move) => slotIndex(move.from) !== null && slotIndex(move.to) !== null) || null;
  const moveFrom = structuralMove ? slotIndex(structuralMove.from) : null;
  const moveTo = structuralMove ? slotIndex(structuralMove.to) : null;
  const action = structuralMove ? [moveFrom, moveTo] : frame?.highlight?.swap || frame?.highlight?.move || null;
  const heldEntity = presentation.held ? entities.get(presentation.held.entityId) : null;
  const actionStart = action ? ((action[0] + 0.5) / slots.length) * 100 : 0;
  const actionEnd = action ? ((action[1] + 0.5) / slots.length) * 100 : 0;
  const movingValue = structuralMove ? entities.get(structuralMove.entityId)?.value : null;
  const actionLabel = event?.transition?.kind === 'swap'
    ? `swap [${Math.min(...action)}] ↔ [${Math.max(...action)}]`
    : structuralMove ? `shift ${movingValue}: [${moveFrom}] → [${moveTo}]` : 'move';
  return <div className="array-canvas" aria-label="Array visualization"><LayoutGroup id="array-layout">
    <div className="array-stage" style={{ '--array-count': slots.length }}>
    <div className="array-cells" style={{ '--array-count': slots.length }}>
      {slots.map((entityId, index) => {
        const state = classifyIndex(index, frame.highlight);
        const marker = frame?.markers?.index === index;
        const entity = entities.get(entityId);
        const isMoving = event?.transition?.moves?.some((move) => move.entityId === entityId);
        const entersFromOutside = entity && event?.transition?.enter?.includes(entity.id)
          && !event?.transition?.moves?.some((move) => move.entityId === entity.id && move.from === 'held');
        const motionRole = structuralMove && index === moveFrom ? 'source' : structuralMove && index === moveTo ? 'destination' : null;
        const lifted = ['compare', 'mid', 'active', 'swap', 'move'].includes(state);
        return <div className={`array-item ${marker ? 'has-marker' : ''} ${motionRole ? `is-${motionRole}` : ''}`} data-slot={`slot:${index}`} key={`slot:${index}`}>
          {marker ? <span className="array-marker">index</span> : null}
          <div className={`array-cell-slot ${entity ? '' : 'is-empty'}`} aria-label={`Index ${index}, ${entity ? `value ${entity.value}` : 'temporarily empty'}, ${state}`}>
            <AnimatePresence initial={false}>{entity ? <m.div layout layoutId={entity.id} data-entity-id={entity.id} className={`array-cell bar-${state}`}
              data-motion-role={isMoving ? 'moving' : undefined}
              initial={entersFromOutside ? { opacity: 0, scale: .72, y: -12 } : false}
              animate={{ opacity: 1, scale: 1, y: lifted ? -10 : 0, zIndex: isMoving ? 4 : 1 }} exit={{ opacity: 0, scale: .72, y: 10 }}
              transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] }, opacity: { duration: Math.min(duration, .18) } }}
              onLayoutAnimationComplete={() => onEntityComplete(entity.id)}>
              <span className="array-value">{entity.value}</span>
            </m.div> : <span className="array-hole" aria-hidden="true">&mdash;</span>}</AnimatePresence>
          </div>
          <span className="array-index" aria-hidden="true">{index}</span>
        </div>;
      })}
    </div>
    <AnimatePresence initial={false}>{heldEntity ? <m.div layout layoutId={heldEntity.id} data-entity-id={heldEntity.id} className="array-held-value" style={{ '--held-column': (presentation.held.from ?? 0) + 1 }}
      transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] } }} onLayoutAnimationComplete={() => onEntityComplete(heldEntity.id)} onAnimationComplete={() => onEntityComplete(heldEntity.id)} aria-label={`Held insertion value ${heldEntity.value}`}>
      <strong>{heldEntity.value}</strong></m.div> : null}</AnimatePresence>
    {action ? <div className={`array-connector ${frame?.highlight?.swap ? 'is-swap' : 'is-move'} ${actionEnd < actionStart ? 'moves-left' : 'moves-right'}`} aria-hidden="true">
      <m.svg viewBox="0 0 100 24" preserveAspectRatio="none" initial={motionMode === 'on' ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: Math.min(duration, .2) }}><m.path d={`M ${actionStart} 3 C ${actionStart} 22, ${actionEnd} 22, ${actionEnd} 3`} initial={motionMode === 'on' ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration }}/><path d={`M ${actionEnd - 1.4} 5 L ${actionEnd} 2 L ${actionEnd + 1.4} 5`} /></m.svg>
      <span style={{ left: `${(actionStart + actionEnd) / 2}%` }}>{actionLabel}</span>
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
        <m.div layout layoutId={`node:${node.id}`} data-node-id={node.id} className={`linked-node-wrap ${pointersByNode[node.id]?.includes('head') ? 'has-head' : ''} ${pointersByNode[node.id]?.includes('current') ? 'is-current' : ''}`} initial={event?.transition?.enter?.includes(node.id) ? { opacity: 0, scale: .72 } : false} animate={{ opacity: 1, scale: 1, y: pointersByNode[node.id]?.includes('current') ? -7 : 0 }} exit={{ opacity: 0, scale: .72 }} transition={{ layout: { duration }, opacity: { duration: Math.min(duration, .18) } }} onLayoutAnimationComplete={() => onEntityComplete(node.id)} onAnimationComplete={() => onEntityComplete(node.id)}>
          <div className="pointer-labels">{(pointersByNode[node.id] || []).map((name) => <m.span layout layoutId={`pointer:${name}`} data-pointer-name={name} className={`pointer-${name.toLowerCase()}`} transition={{ layout: { duration } }} onLayoutAnimationComplete={() => onEntityComplete(`pointer:${name}`)} key={name}>{name}</m.span>)}</div>
          <div className="linked-node" aria-label={`${node.id}, value ${node.value}${pointersByNode[node.id]?.includes('current') ? ', current node' : ''}${pointersByNode[node.id]?.includes('head') ? ', head node' : ''}`}>
            <strong>{node.value}</strong><span className={frame.highlightedEdges?.some((edge) => edge.from === node.id) ? 'is-highlighted' : ''}>●</span>
          </div>
          <small>{node.id}</small>
        </m.div>
        {index < nodes.length - 1 && node.next === nodes[index + 1].id
          ? <m.div layout data-edge-id={`edge:${node.id}->${nodes[index + 1].id}`} initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration }} onAnimationComplete={() => onEntityComplete(`edge:${node.id}->${nodes[index + 1].id}`)} className={`linked-arrow ${frame.highlightedEdges?.some((edge) => edge.from === node.id && edge.to === nodes[index + 1].id) ? 'is-highlighted' : ''}`} aria-hidden="true">→</m.div>
          : index < nodes.length - 1 ? <div className="linked-chain-gap" aria-hidden="true"/> : null}
      </React.Fragment>)}
      <div className="linked-null"><span>NULL</span>{(pointersByNode.NULL || []).map((name) => <m.small layout layoutId={`pointer:${name}`} data-pointer-name={name} className={`pointer-${name.toLowerCase()}`} transition={{ layout: { duration } }} onLayoutAnimationComplete={() => onEntityComplete(`pointer:${name}`)} key={name}>{name}</m.small>)}</div>
    </div>
  </LayoutGroup></div>;
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

function ObjectModelSurface({ activity, frame }) {
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <>
    <button type="button" className="object-expand-button" aria-haspopup="dialog" onClick={() => setOpen(true)}><Icon name="expand" size={16}/> Expand model</button>
    <ObjectModelRenderer frame={frame}/>
    <dialog ref={dialogRef} className="object-model-dialog" aria-labelledby="object-model-dialog-title" onClose={() => setOpen(false)}>
      {open ? <><header><div><span>Full model view</span><h2 id="object-model-dialog-title">{activity.title}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close full model view"><Icon name="close"/></button></header>
      <div className="object-model-dialog-body"><ObjectModelRenderer frame={frame}/></div></> : null}
    </dialog>
  </>;
}

function SourcePanel({ activity, event, source }) {
  const [copyState, setCopyState] = useState('Copy Python');
  const activeLineRef = useRef(null);
  const activeLine = event?.source?.line || (event?.type === 'complete' ? source.length : Math.min(2, source.length));
  useEffect(() => { activeLineRef.current?.scrollIntoView({ block: 'nearest' }); }, [activeLine, activity.id]);
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
    {source.map((line, index) => <div ref={activeLine === index + 1 ? activeLineRef : null} className={`source-line ${activeLine === index + 1 ? 'is-current' : ''}`} key={`${activity.id}:${index}`}>
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
  const [controlsOpen, setControlsOpen] = useState(() => window.innerWidth > 1000 && window.innerHeight >= 800);
  useEffect(() => setDraft(inputs.values.join(', ')), [activity.id, inputs.values]);
  function apply() {
    const parts = draft.split(/[,\s]+/).filter(Boolean);
    if (!parts.length || parts.some((part) => !/^-?\d+$/.test(part))) return setError('Use whole numbers separated by commas.');
    if (parts.length > MAX_VISUAL_VALUES) return setError(`Use at most ${MAX_VISUAL_VALUES} values so every item stays readable.`);
    if (parts.length < activity.input.min) return setError(`Use at least ${activity.input.min} values for this activity.`);
    setError(''); setInputs((current) => ({ ...current, values: parts.map(Number) }));
  }
  if (activity.input.editable === false) return <div className="data-controls curated-note"><strong>Curated pseudocode activity</strong><span>Open it in Pseudocode Lab to edit or experiment with compatible node programs.</span></div>;
  return <details className="data-controls" open={controlsOpen} onToggle={(event) => setControlsOpen(event.currentTarget.open)}>
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
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState(() => ({ ...inputs }));
  const summary = activity.input.controls.map((control) => `${control.label}: ${inputs[control.key]}`).join(' · ');
  function openDialog() { setDraft({ ...inputs }); dialogRef.current?.showModal(); }
  function closeDialog() { dialogRef.current?.close(); }
  function applyScenario(event) { event.preventDefault(); setInputs({ ...draft }); closeDialog(); }
  return <section className="oop-scenario-launcher" aria-label="Scenario">
    <div><strong>Scenario</strong><span>{summary}</span></div>
    <button type="button" aria-haspopup="dialog" onClick={openDialog}><Icon name="grid" size={16}/> Edit scenario</button>
    <dialog ref={dialogRef} className="scenario-dialog" aria-labelledby="scenario-dialog-title">
      <form onSubmit={applyScenario}>
        <header><div><span>Activity inputs</span><h2 id="scenario-dialog-title">Edit scenario</h2></div><button type="button" onClick={closeDialog} aria-label="Close scenario dialog"><Icon name="close"/></button></header>
        <div className="scenario-dialog-fields">{activity.input.controls.map((control) => {
          const id = `scenario-${activity.id}-${control.key}`;
          return <label htmlFor={id} key={control.key}>{control.label}<input id={id} type={control.type} value={draft[control.key] ?? ''}
            min={control.min} max={control.max} maxLength={control.maxLength}
            onChange={(event) => setDraft((current) => ({ ...current, [control.key]: control.type === 'number' ? Number(event.target.value) : event.target.value.slice(0, control.maxLength || 100) }))}/></label>;
        })}</div>
        <p>Apply the values to rebuild the Python source and guided timeline.</p>
        <footer><button type="button" className="scenario-reset" onClick={() => setDraft({ ...activity.input.defaults })}>Reset defaults</button><button type="button" onClick={closeDialog}>Cancel</button><button type="submit" className="scenario-apply">Apply scenario</button></footer>
      </form>
    </dialog>
  </section>;
}

function DataControls(props) {
  return props.activity.input.kind === 'object-model' ? <OOPDataControls {...props}/> : <ArrayDataControls {...props}/>;
}

function PlaybackDock({ state, controller, activity, event, motionPreference }) {
  const visibleMetrics = (activity.metrics || []).slice(0, 2);
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
  const motionPreference = useMotionPreference();
  const result = useMemo(() => activity.run(inputs), [activity, inputs]);
  const source = useMemo(() => activity.sourceFor ? activity.sourceFor(inputs) : activity.source, [activity, inputs]);
  const event = result.events[playback.index] || result.events[0] || null;
  const onEntityComplete = useTransitionBoundary({ state: playback, event, controller, mode: motionPreference.mode });
  const duration = motionPreference.mode === 'on' ? motionDuration(playback.speed) : (motionPreference.mode === 'reduced' ? 0.16 : 0);
  const visualDuration = playback.navigationSource === 'seek' || playback.navigationSource === 'load' ? 0 : duration;
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
  return <LazyMotion features={domMax} strict><MotionConfig reducedMotion={motionPreference.mode === 'on' ? 'never' : 'always'} transition={{ duration }}><div className={`visualizer-workspace course-${courseId} motion-${motionPreference.mode} navigation-${playback.navigationSource}`} data-motion-duration={duration}>
    <main className="workspace-main">
      <div className="activity-heading"><div><p><a href={backHref}><Icon name="back" size={14}/>{backLabel}</a><span>{courseId === 'itcc45' ? `Topic ${activity.module}` : `Module ${activity.module}`} / {activity.topic}</span></p><h1>{activity.title}</h1><span>{activity.subtitle}</span></div>{courseId === 'itcc45' ? <a className="edit-code" href={`itcc45-practice.html?topic=${activity.topicId}`}><Icon name="list" size={17}/> Practice this topic</a> : <a className="edit-code" href={`tracer.html?activity=${encodeURIComponent(activity.id)}`}><Icon name="code" size={17}/> Edit pseudocode</a>}</div>
      <DataControls activity={activity} inputs={inputs} setInputs={setInputs} onShuffle={shuffle}/>
      <div className="mobile-surface-tabs" role="tablist" aria-label="Workspace view">{mobileTabs.map(([id, icon, label]) => <button type="button" role="tab" aria-selected={mobileTab === id} className={mobileTab === id ? 'active' : ''} onClick={() => setMobileTab(id)} key={id}><Icon name={icon}/>{label}</button>)}</div>
      <div className={`desktop-source mobile-surface ${mobileTab === 'code' ? 'mobile-active' : ''}`}><SourcePanel activity={activity} event={event} source={source}/></div>
      <section className={`visual-canvas mobile-surface ${mobileTab === 'visualize' ? 'mobile-active' : ''}`} tabIndex="0" aria-label={`${activity.title} visualization canvas`}>
        {activity.renderer === 'object-model' ? <ObjectModelSurface activity={activity} frame={event?.frame}/> : <Renderer frame={event?.frame} event={event} activity={activity} motionMode={motionPreference.mode} duration={visualDuration} onEntityComplete={onEntityComplete}/>}
      </section>
      <p id="result-caption" className="current-step" aria-live="polite"><span>{playback.index + 1}</span>{event?.message || 'Preparing activity…'}</p>
      <div className={`mobile-evidence mobile-surface ${mobileTab === 'trace' || mobileTab === 'more' ? 'mobile-active' : ''}`}>
        <EvidenceDrawer tab={mobileTab === 'trace' ? primaryEvidence : evidenceTab} setTab={setEvidenceTab} activity={activity} result={result} event={event} index={playback.index} controller={controller} inputs={inputs}/>
      </div>
    </main>
    <div className="desktop-evidence"><EvidenceDrawer tab={evidenceTab} setTab={setEvidenceTab} activity={activity} result={result} event={event} index={playback.index} controller={controller} inputs={inputs}/></div>
    <PlaybackDock state={playback} controller={controller} activity={activity} event={event} motionPreference={motionPreference}/>
  </div></MotionConfig></LazyMotion>;
}

const root = document.getElementById('visualizer-root');
if (root) createRoot(root).render(<App/>);
