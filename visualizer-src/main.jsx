import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, LayoutGroup, LazyMotion, MotionConfig, domMax, m, useIsPresent } from 'motion/react';
import './workspace.css';
import { ConceptDomainRenderer } from './domain-renderers.jsx';
import { LinearADTRenderer } from './linear-adt-renderer.jsx';

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
    collapse: <><path d="M9 5 2 12l7 7"/><path d="M22 5v14"/></>,
    code: <><path d="m8 9-3 3 3 3"/><path d="m16 9 3 3-3 3"/><path d="m14 5-4 14"/></>,
    close: <><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>,
    expand: <><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></>,
    expandPanel: <><path d="m15 5 7 7-7 7"/><path d="M2 5v14"/></>,
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
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21h-4v-.08A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3v-4h.08A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 10.4 3.08V3h4v.08A1.7 1.7 0 0 0 15.4 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.38.36.72.66 1 .3.28.68.42 1.08.4H21v4h-.08a1.7 1.7 0 0 0-1.52.6Z"/></>,
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

const TeachingStrip = memo(function TeachingStrip({ teaching, slotCount = 0, linked = false }) {
  if (!teaching) return null;
  const annotations = teaching.annotations || [];
  const status = teaching.status || [];
  const facts = [
    ...annotations.map((annotation) => ({ ...annotation, kind: 'annotation' })),
    ...status.map((item, index) => ({ ...item, id: `status:${index}`, kind: 'status' })),
  ];
  const connectors = linked ? [] : annotations.flatMap((annotation, index) => {
    const targetIndex = annotation.target?.kind === 'slot' ? annotation.target.index : null;
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= slotCount) return [];
    const startX = ((index + .5) / Math.max(facts.length + (teaching.comparison ? 1 : 0), 1)) * 100;
    const endX = ((targetIndex + .5) / Math.max(slotCount, 1)) * 100;
    return [{ ...annotation, startX, endX }];
  });
  return <section className={`teaching-strip teaching-${teaching.variant || 'default'} ${linked ? 'is-linked' : ''}`} aria-label={`${teaching.title} teaching context`}>
    <h2>{teaching.title}</h2>
    <div className="teaching-facts">
      {facts.map((fact) => <div className={`teaching-fact tone-${fact.tone || 'muted'}`} key={fact.id}><span>{fact.label}</span><strong>{String(fact.value)}</strong></div>)}
      {teaching.comparison ? <div className={`teaching-comparison outcome-${teaching.comparison.outcome}`}><span>{teaching.comparison.text}</span><strong>{String(teaching.comparison.outcome).toUpperCase()}</strong></div> : null}
    </div>
    {connectors.length ? <svg className="teaching-connectors" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      {connectors.map((connector) => <path className={`tone-${connector.tone || 'muted'}`} d={`M ${connector.startX} 0 C ${connector.startX} 16, ${connector.endX} 14, ${connector.endX} 30`} key={connector.id}/>)}
    </svg> : null}
  </section>;
});

const ARRAY_LEGEND_ITEMS = Object.freeze([
  { label: 'Active', tone: 'active' },
  { label: 'Complete', tone: 'complete' },
  { label: 'Loop / search scope', tone: 'boundary' },
  { label: 'Shift / swap path', tone: 'motion' },
]);

const LINKED_LIST_LEGEND_ITEMS = Object.freeze([
  { label: 'Head', tone: 'head' },
  { label: 'Current', tone: 'current' },
  { label: 'Visited', tone: 'visited' },
  { label: 'Pointer write', tone: 'pointer' },
]);

const VisualizationLegend = memo(function VisualizationLegend({ items, note }) {
  return <div className="visualization-utility-row">
    <details className="visualization-legend">
      <summary><span aria-hidden="true">?</span> Legend</summary>
      <div className="visualization-legend-panel" aria-label="Visualization legend">
        <div className="visualization-legend-items">
          {items.map((item) => <span className="visualization-legend-item" key={item.label}><i className={`legend-tone-${item.tone}`} aria-hidden="true"/>{item.label}</span>)}
        </div>
        <p>{note}</p>
      </div>
    </details>
  </div>;
});

const ArrayRenderer = memo(function ArrayRenderer({ frame, event, activity, motionMode, duration, onEntityComplete }) {
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
  const actionMin = action ? Math.min(...action) : 0;
  const actionMax = action ? Math.max(...action) : 0;
  const actionSpan = action ? actionMax - actionMin + 1 : 0;
  const actionMovesLeft = action ? action[1] < action[0] : false;
  const movingValue = structuralMove ? entities.get(structuralMove.entityId)?.value : null;
  const teaching = frame?.markers?.teaching || null;
  const teachingTargets = new Map((teaching?.annotations || []).flatMap((annotation) => annotation.target?.kind === 'slot'
    ? [[annotation.target.index, annotation.tone || 'primary']] : []));
  const indexMarkerLabel = activity?.id === 'array-list-remove' ? 'remove here' : activity?.id === 'array-list-insert' ? 'insert here' : 'index';
  const loopBoundary = frame?.markers?.boundary;
  const boundaryStartIndex = loopBoundary ? Math.max(0, Math.min(slots.length - 1, loopBoundary.start)) : 0;
  const boundaryEndIndex = loopBoundary ? Math.max(boundaryStartIndex, Math.min(slots.length - 1, loopBoundary.end)) : 0;
  const actionLabel = event?.transition?.kind === 'swap'
    ? `swap [${Math.min(...action)}] ↔ [${Math.max(...action)}]`
    : structuralMove ? `shift ${movingValue}: [${moveFrom}] → [${moveTo}]` : 'move';
  return <div className="array-canvas" aria-label="Array visualization">
    <VisualizationLegend items={ARRAY_LEGEND_ITEMS} note="Cells stay in index order; their height does not represent value."/>
    <LayoutGroup id="array-layout">
    <div className={`array-stage ${heldEntity ? 'has-insert-value' : ''} ${teaching ? 'has-teaching' : ''}`} style={{ '--array-count': slots.length }}>
    <TeachingStrip teaching={teaching} slotCount={slots.length}/>
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
        const teachingTone = teachingTargets.get(index);
        return <div className={`array-item ${marker ? 'has-marker' : ''} ${motionRole ? `is-${motionRole}` : ''} ${teachingTone ? `teaching-target tone-${teachingTone}` : ''}`} data-slot={`slot:${index}`} key={`slot:${index}`}>
          {marker ? <span className="array-marker"><span>{indexMarkerLabel}</span><i aria-hidden="true">↓</i></span> : null}
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
      {loopBoundary ? <div className={`array-loop-boundary ${loopBoundary.active ? 'is-active' : 'is-complete'} ${action ? 'is-shifting' : ''}`} style={{ gridColumn: `${boundaryStartIndex + 1} / ${boundaryEndIndex + 2}` }} aria-label={loopBoundary.active ? loopBoundary.label || `Loop boundary from index ${loopBoundary.start} through ${loopBoundary.end}` : 'Loop boundary complete'}>
        <span>{loopBoundary.active ? loopBoundary.label || `loop boundary: ${loopBoundary.start} … ${loopBoundary.end}` : loopBoundary.label || 'loop complete'}</span>
      </div> : null}
      {action ? <m.div className={`array-connector ${frame?.highlight?.swap ? 'is-swap' : 'is-move'} ${actionMovesLeft ? 'moves-left' : 'moves-right'} ${loopBoundary ? 'with-loop-boundary' : ''}`} style={{ gridColumn: `${actionMin + 1} / ${actionMax + 2}`, '--action-span': actionSpan }} aria-hidden="true"
        initial={motionMode === 'on' ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: Math.min(duration, .2) }}>
        <i className="array-connector-route"/><span>{actionLabel}</span>
      </m.div> : null}
    </div>
    <AnimatePresence initial={false}>{heldEntity ? <m.aside layout layoutId={heldEntity.id} data-entity-id={heldEntity.id} className={`array-held-value ${activity?.teachingVariant === 'indexed-removal' ? 'is-removed' : ''}`}
      initial={{ opacity: 0, scale: .86 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .86 }}
      transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] }, opacity: { duration: Math.min(duration, .18) } }} onLayoutAnimationComplete={() => onEntityComplete(heldEntity.id)} onAnimationComplete={() => onEntityComplete(heldEntity.id)} aria-label={`Held ${activity?.teachingVariant === 'indexed-removal' ? 'removed' : activity?.teachingVariant === 'stable-record-insertion' ? 'key record' : 'insertion'} value ${heldEntity.value}`}>
      <span>{activity?.teachingVariant === 'indexed-removal' ? 'removed value' : activity?.teachingVariant === 'stable-record-insertion' ? 'held key record' : 'value to insert'}</span><strong>{heldEntity.value}</strong></m.aside> : null}</AnimatePresence>
    </div>
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
  const teaching = frame?.markers?.teaching || null;
  const visited = new Set(teaching?.visited || []);
  return <div className="linked-canvas" aria-label="Singly linked list visualization">
    <VisualizationLegend items={LINKED_LIST_LEGEND_ITEMS} note="Pointer labels identify references; arrows show next links between node identities."/>
    <LayoutGroup id="linked-layout">
    <TeachingStrip teaching={teaching} linked/>
    {frame?.arraySlots ? <section className="representation-array" aria-label="Contiguous array representation"><span>array slots</span>{frame.arraySlots.map((value,index) => <div className={frame.arrayActive === index ? 'is-active' : ''} key={index}><small>{index}</small><strong>{value}</strong></div>)}</section> : null}
    <div className="linked-structure">
    <div className="linked-chain">
      {nodes.map((node, index) => <React.Fragment key={node.id}>
        <m.div layout layoutId={`node:${node.id}`} data-node-id={node.id} className={`linked-node-wrap ${pointersByNode[node.id]?.includes('head') ? 'has-head' : ''} ${pointersByNode[node.id]?.includes('current') ? 'is-current' : ''} ${visited.has(node.id) ? 'is-visited' : ''} ${frame.detached?.includes(node.id) ? 'is-detached' : ''}`} initial={event?.transition?.enter?.includes(node.id) ? { opacity: 0, scale: .72 } : false} animate={{ opacity: 1, scale: 1, y: pointersByNode[node.id]?.includes('current') ? -7 : 0 }} exit={{ opacity: 0, scale: .72 }} transition={{ layout: { duration }, opacity: { duration: Math.min(duration, .18) } }} onLayoutAnimationComplete={() => onEntityComplete(node.id)} onAnimationComplete={() => onEntityComplete(node.id)}>
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
    {frame?.invariants ? <div className="linked-invariants" aria-label="Linked-list invariants"><span className={frame.invariants.cycleFree ? 'passes' : 'fails'}>cycle-free</span><span className={frame.invariants.sorted ? 'passes' : 'fails'}>sorted</span><span>{frame.invariants.reachable} reachable</span>{frame.detached?.length ? <span className="detached-fact">{frame.detached.length} detached</span> : null}{frame.pointerWrite ? <code>{frame.pointerWrite.code}</code> : null}</div> : null}
    </div>
  </LayoutGroup></div>;
});

ITCC47VisualizerRegistry.registerRenderer('linked-list', LinkedListRenderer);
ITCC47VisualizerRegistry.registerRenderer('concept', ConceptDomainRenderer);
ITCC47VisualizerRegistry.registerRenderer('linear-adt', LinearADTRenderer);

const AnimatedClassMember = memo(function AnimatedClassMember({ kind, value, duration, motionMode }) {
  const label = kind === 'attribute' ? 'attr' : kind === 'abstract' ? 'required' : 'method';
  return <m.code layout className={`object-class-member member-${kind}`} aria-label={`${label} ${value}`}
    initial={motionMode === 'on' ? { opacity: 0, height: 0, y: -6 } : false}
    animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -4 }}
    transition={{ layout: { duration }, opacity: { duration: Math.min(duration, .22) }, height: { duration: Math.min(duration, .34) } }}>
    <small aria-hidden="true">{label}</small><span>{value}</span>
  </m.code>;
});

const AnimatedClassCard = memo(function AnimatedClassCard({ item, lookupIndex, duration, motionMode, scope }) {
  const members = [
    ...item.attributes.map((value) => ({ kind: 'attribute', value })),
    ...item.methods.map((value) => ({ kind: 'method', value })),
    ...item.abstractMethods.map((value) => ({ kind: 'abstract', value })),
  ];
  const lookupDelay = lookupIndex >= 0 && motionMode === 'on' ? lookupIndex * Math.min(duration * .22, .12) : 0;
  return <m.article layout layoutId={`${scope}:class:${item.id}`} data-class-id={item.id} data-lookup-order={lookupIndex >= 0 ? lookupIndex + 1 : undefined}
    className={`object-class-card status-${item.status || 'ready'} ${lookupIndex >= 0 ? 'is-lookup' : ''}`}
    aria-label={`${item.name} class${item.bases.length ? `, inherits ${item.bases.join(', ')}` : ''}${lookupIndex >= 0 ? `, lookup position ${lookupIndex + 1}` : ''}`}
    initial={motionMode === 'on' ? { opacity: 0, scale: .92, y: 10 } : false}
    animate={{ opacity: 1, scale: lookupIndex >= 0 && motionMode === 'on' ? [1, 1.018, 1] : 1, y: 0 }} exit={{ opacity: 0, scale: .94, y: -6 }}
    transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] }, opacity: { duration: Math.min(duration, .22) }, scale: { duration: Math.min(duration, .38), delay: lookupDelay } }}>
    <header><span>class</span><strong>{item.name}</strong>{item.status === 'abstract' ? <em>abstract</em> : null}</header>
    <AnimatePresence initial={false} mode="sync">
      {item.bases.length ? <m.p layout className="object-bases" key={`bases:${item.bases.join('|')}`} initial={motionMode === 'on' ? { opacity: 0, height: 0 } : false} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: Math.min(duration, .3) }}>inherits {item.bases.map((id) => id.replace('class:', '')).join(', ')}</m.p> : null}
      {members.map((member) => <AnimatedClassMember {...member} duration={duration} motionMode={motionMode} key={`${member.kind}:${member.value}`}/>) }
    </AnimatePresence>
  </m.article>;
});

const AnimatedReference = memo(function AnimatedReference({ name, scope, duration, motionMode }) {
  return <m.span layout layoutId={`${scope}:reference:${name}`} data-reference-name={name}
    initial={motionMode === 'on' ? { opacity: 0, scale: .86, x: -6 } : false} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: .88, x: 6 }}
    transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] }, opacity: { duration: Math.min(duration, .2) }, scale: { duration: Math.min(duration, .25) } }}>{name} →</m.span>;
});

const AnimatedObjectField = memo(function AnimatedObjectField({ objectId, name, value, change, duration, motionMode, scope, trackChanges }) {
  const serialized = JSON.stringify(value);
  const isPresent = useIsPresent();
  const semanticChange = !isPresent ? 'removed' : trackChanges ? change : null;
  return <m.div layout layoutId={`${scope}:field:${objectId}:${name}`} data-field-name={name} className={semanticChange ? `field-${semanticChange}` : ''} aria-label={`${name} field${semanticChange ? `, ${semanticChange}` : ''}`}
    initial={motionMode === 'on' ? { opacity: 0, height: 0, x: -8 } : false}
    animate={{ opacity: 1, height: 'auto', x: 0 }} exit={{ opacity: 0, height: 0, x: -10 }}
    transition={{ layout: { duration }, opacity: { duration: Math.min(duration, .2) }, height: { duration: Math.min(duration, .3) } }}>
    <dt>{name}</dt><dd><AnimatePresence initial={false} mode="popLayout"><m.code key={serialized} initial={motionMode === 'on' ? { opacity: 0, y: -5 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: Math.min(duration, .24) }}>{serialized}</m.code></AnimatePresence>{semanticChange ? <small className="object-field-change">{semanticChange}</small> : null}</dd>
  </m.div>;
});

const AnimatedObjectCard = memo(function AnimatedObjectCard({ item, previousFields, referenceNames, active, duration, motionMode, scope }) {
  return <m.article layout layoutId={`${scope}:object:${item.id}`} data-object-id={item.id}
    className={`object-instance-card status-${item.status || 'ready'} ${active ? 'is-current' : ''}`} aria-label={`${item.id}, ${item.classId.replace('class:', '')} object`}
    initial={motionMode === 'on' ? { opacity: 0, scale: .88, y: 12 } : false} animate={{ opacity: 1, scale: 1, y: active && motionMode === 'on' ? [0, -3, 0] : 0 }} exit={{ opacity: 0, scale: .9, y: -8 }}
    transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] }, opacity: { duration: Math.min(duration, .22) }, scale: { duration: Math.min(duration, .34) }, y: { duration: Math.min(duration, .34) } }}>
    <div className="object-reference-labels"><AnimatePresence initial={motionMode === 'on'} mode="sync">{referenceNames.map((name) => <AnimatedReference name={name} scope={scope} duration={duration} motionMode={motionMode} key={name}/>)}</AnimatePresence></div>
    <header><span>{item.id}</span><strong>{item.label}</strong><small>{item.classId.replace('class:', '')}</small></header>
    <dl><AnimatePresence initial={motionMode === 'on'} mode="sync">{Object.entries(item.fields).map(([name, value]) => {
      const existed = Object.prototype.hasOwnProperty.call(previousFields, name);
      const change = !existed ? 'new' : JSON.stringify(previousFields[name]) === JSON.stringify(value) ? null : 'updated';
      return <AnimatedObjectField objectId={item.id} name={name} value={value} change={change} duration={duration} motionMode={motionMode} scope={scope} trackChanges={scope === 'stage'} key={`${item.id}:${name}`}/>;
    })}</AnimatePresence></dl>
  </m.article>;
});

const AnimatedActiveCall = memo(function AnimatedActiveCall({ active, duration, motionMode }) {
  if (!active) return null;
  return <m.aside layout className="object-active-call" aria-label="Current method call" initial={motionMode === 'on' ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: Math.min(duration, .3) }}>
    <span>Current call</span><strong>{active.method}</strong>{active.receiverId ? <small>receiver: {active.receiverId}</small> : null}
    <ol className="object-lookup-path" aria-label={`Lookup path: ${active.lookupPath.map((id) => id.replace('class:', '')).join(', then ')}`}>
      {active.lookupPath.map((id, index) => <m.li key={id} initial={motionMode === 'on' ? { opacity: 0, x: -5 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: Math.min(duration, .22), delay: motionMode === 'on' ? index * Math.min(duration * .22, .12) : 0 }}><b aria-hidden="true">{index + 1}</b>{id.replace('class:', '')}</m.li>)}
    </ol>
  </m.aside>;
});

const ObjectModelRenderer = memo(function ObjectModelRenderer({ frame, previousFrame, event, duration = 0, motionMode = 'off', scope = 'main' }) {
  const classes = frame?.classes || [];
  const objects = frame?.objects || [];
  const previousObjects = Object.fromEntries((previousFrame?.objects || []).map((item) => [item.id, item]));
  const references = Object.entries(frame?.references || {}).reduce((grouped, [name, objectId]) => {
    grouped[objectId] = [...(grouped[objectId] || []), name];
    return grouped;
  }, {});
  const lookupPath = frame?.active?.lookupPath || [];
  return <LayoutGroup id={`object-model-${scope}`}><div className="object-canvas" aria-label="Python classes, objects, and references">
    <section className="object-class-region" aria-label="Class blueprints">
      <h2>Class blueprints</h2>
      <div className="object-class-grid"><AnimatePresence initial={motionMode === 'on'} mode="sync">{classes.map((item) => <AnimatedClassCard item={item} lookupIndex={lookupPath.indexOf(item.id)} duration={duration} motionMode={motionMode} scope={scope} key={item.id}/>)}</AnimatePresence></div>
    </section>
    <section className="object-instance-region" aria-label="Object instances">
      <h2>Instances and references</h2>
      <AnimatePresence initial={motionMode === 'on'} mode="wait">{objects.length ? <m.div layout className="object-instance-grid" key="objects"><AnimatePresence initial={motionMode === 'on'} mode="sync">{objects.map((item) => <AnimatedObjectCard item={item} previousFields={previousObjects[item.id]?.fields || {}} referenceNames={references[item.id] || []} active={frame?.active?.receiverId === item.id || item.status === 'active'} duration={duration} motionMode={motionMode} scope={scope} key={item.id}/>)}</AnimatePresence></m.div> : <m.p className="object-empty" key="empty" initial={motionMode === 'on' ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: Math.min(duration, .2) }}>No instance has been allocated yet. The class blueprint exists on its own.</m.p>}</AnimatePresence>
    </section>
    <AnimatePresence initial={false} mode="wait">{frame?.active ? <AnimatedActiveCall active={frame.active} duration={duration} motionMode={motionMode} key={`${frame.active.receiverId}:${frame.active.method}`}/> : null}</AnimatePresence>
    <AnimatePresence initial={false}>{frame?.annotations?.length ? <m.dl layout className="object-concept-annotations" aria-label="Concept evidence" initial={motionMode === 'on' ? { opacity: 0, y: 5 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: Math.min(duration, .24) }}>{frame.annotations.map((item, index) => <div key={`${item.label}:${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</m.dl> : null}</AnimatePresence>
    <AnimatePresence initial={false}>{frame?.notice ? <m.p layout className="object-notice" initial={motionMode === 'on' ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: Math.min(duration, .22) }}>{frame.notice}</m.p> : null}</AnimatePresence>
  </div></LayoutGroup>;
});

BSITVisualizerRegistry.registerRenderer('object-model', ObjectModelRenderer);

const ObjectOutputConsole = memo(function ObjectOutputConsole({ output = [], duration = 0, motionMode = 'off' }) {
  const [expanded, setExpanded] = useState(false);
  const latest = output.length ? output.at(-1) : 'No output yet — advance to a print() step.';
  const summary = expanded && output.length ? output.join(' · ') : latest;
  return <section className={`object-output-console ${expanded ? 'is-expanded' : 'is-compact'} ${output.length ? 'has-output' : 'is-waiting'}`} aria-label="Rendered program output">
    <header>
      <span aria-hidden="true">&gt;_</span><strong>Rendered output</strong>
      <code aria-live="polite"><AnimatePresence initial={false} mode="wait"><m.span key={summary} initial={motionMode === 'on' ? { opacity: 0, y: -4 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: Math.min(duration, .2) }}>{summary}</m.span></AnimatePresence></code>
      <small>{output.length ? `${output.length} line${output.length === 1 ? '' : 's'}` : 'waiting'}</small>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>{expanded ? 'Collapse output' : 'Expand output'}</button>
    </header>
    {expanded ? <pre>{output.length ? output.join('\n') : latest}</pre> : null}
  </section>;
});

function ObjectModelSurface({ activity, event, frame, previousFrame, focused, onFocus, duration, motionMode }) {
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <div className="object-model-surface">
    <div className="object-model-toolbar"><strong>Object model</strong><div>
      <button type="button" className="object-focus-button" aria-pressed={focused} onClick={onFocus}><Icon name="expand" size={15}/>{focused ? 'Exit model focus' : 'Focus model'}</button>
      <button type="button" className="object-expand-button" aria-label="Expand model" aria-haspopup="dialog" onClick={() => setOpen(true)}><Icon name="expand" size={15}/> Full view</button>
    </div></div>
    <ObjectModelRenderer frame={frame} previousFrame={previousFrame} event={event} duration={duration} motionMode={motionMode} scope="stage"/>
    <ObjectOutputConsole output={frame?.output} duration={duration} motionMode={motionMode}/>
    <dialog ref={dialogRef} className="object-model-dialog" aria-labelledby="object-model-dialog-title" onClose={() => setOpen(false)}>
      {open ? <><header><div><span>Full model view</span><h2 id="object-model-dialog-title">{activity.title}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close full model view"><Icon name="close"/></button></header>
      <div className="object-model-dialog-body"><ObjectModelRenderer frame={frame} event={event} duration={duration} motionMode={motionMode} scope="dialog"/><ObjectOutputConsole output={frame?.output} duration={duration} motionMode={motionMode}/></div></> : null}
    </dialog>
  </div>;
}

function SourcePanel({ activity, event, source, focused = false, onFocus = null }) {
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
  return <section className="source-panel" tabIndex="0" aria-label={activity.language === 'python' ? 'Python source' : 'Pseudocode'}>
    {activity.language === 'python' ? <header className="source-language"><strong>Python source</strong><div>{onFocus ? <button type="button" className="source-focus-button" aria-pressed={focused} onClick={onFocus}><Icon name="expand" size={15}/>{focused ? 'Exit source focus' : 'Focus source'}</button> : null}<button type="button" onClick={copySource}><Icon name="code" size={16}/>{copyState}</button></div></header> : null}
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
        <span>{event.segment?.label ? <em className={`learning-phase phase-${event.segment.id}`}>{event.segment.label}</em> : null}<strong>{event.message}</strong><small>{event.source ? `Line ${event.source.line} · ${event.source.code}` : event.type}</small></span>
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
    {Object.entries(frame?.markers?.variables || {}).filter(([name]) => inputs[name] == null).map(([name, value]) => <div key={name}><dt>{name}</dt><dd><code>{String(value).toUpperCase()}</code></dd></div>)}
    {Number.isInteger(frame?.markers?.i) && frame?.markers?.variables?.i == null ? <div><dt>i</dt><dd>{frame.markers.i}</dd></div> : null}
  </dl>;
}

function ObjectStateView({ frame }) {
  const objects = frame?.objects || [];
  return <div className="object-state-view">
    {objects.length ? objects.map((item) => <section key={item.id}><header><strong>{item.id}</strong><span>{item.classId.replace('class:', '')}</span></header><dl>{Object.entries(item.fields).map(([name, value]) => <div key={name}><dt>{name}</dt><dd><code>{JSON.stringify(value)}</code></dd></div>)}</dl></section>) : <p className="model-note">No object state exists at this step.</p>}
    {Object.keys(frame?.references || {}).length ? <section><header><strong>Name bindings</strong></header><dl>{Object.entries(frame.references).map(([name, id]) => <div key={name}><dt>{name}</dt><dd><code>{id}</code></dd></div>)}</dl></section> : null}
    {frame?.annotations?.length ? <section><header><strong>Concept evidence</strong></header><dl>{frame.annotations.map((item, index) => <div key={`${item.label}:${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section> : null}
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
  return <div className="output-view"><span>Current explanation</span><strong>{event?.message || 'Choose an activity to begin.'}</strong><pre className={output.length ? '' : 'is-waiting'} aria-label="Program output">{output.length ? output.join('\n') : 'No output yet — advance to a print() step.'}</pre>{result?.removed != null ? <p>Removed value: {result.removed}</p> : null}</div>;
}

ITCC47VisualizerRegistry.registerEvidenceView('trace', TraceView);
ITCC47VisualizerRegistry.registerEvidenceView('variables', VariablesView);
ITCC47VisualizerRegistry.registerEvidenceView('operations', OperationsView);
ITCC47VisualizerRegistry.registerEvidenceView('output', OutputView);

const EVIDENCE_LABELS = Object.freeze({ trace: 'Trace', variables: 'Variables', operations: 'Operations', output: 'Output', steps: 'Steps', objects: 'Object state', calls: 'Call path' });
const EVIDENCE_ICONS = Object.freeze({ trace: 'list', steps: 'list', variables: 'grid', objects: 'grid', operations: 'more', calls: 'link', output: 'code' });

function EvidenceDrawer({ tab, setTab, activity, result, event, index, controller, inputs, id, onCollapse = null, showCurrentLabel = true }) {
  const tabs = activity.evidenceViews || ['trace', 'variables', 'operations', 'output'];
  return <aside className="evidence-drawer" id={id}>
    {onCollapse ? <header className="evidence-heading"><div>{showCurrentLabel ? <><span>Learning evidence</span><strong>{EVIDENCE_LABELS[tab] || tab}</strong></> : <strong>Learning evidence</strong>}</div><button type="button" aria-label="Collapse learning evidence" aria-expanded="true" aria-controls={id} onClick={onCollapse}><Icon name="collapse" size={18}/></button></header> : null}
    <div className="evidence-tabs" role="tablist" aria-label="Learning evidence">
      {tabs.map((tabId) => <button type="button" role="tab" aria-selected={tab === tabId} className={tab === tabId ? 'active' : ''} onClick={() => setTab(tabId)} key={tabId}>{EVIDENCE_LABELS[tabId] || tabId}</button>)}
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

const CollapsibleEvidencePanel = memo(function CollapsibleEvidencePanel({ contentId, expanded, onExpandedChange, tab, setTab, activity, result, event, index, controller, inputs, showCurrentLabel = true }) {
  const tabs = activity.evidenceViews || (activity.renderer === 'object-model'
    ? ['steps', 'objects', 'calls', 'output'] : ['trace', 'variables', 'operations', 'output']);
  function selectFromRail(tabId) { setTab(tabId); onExpandedChange(true); }
  if (expanded) return <EvidenceDrawer id={contentId} onCollapse={() => onExpandedChange(false)} showCurrentLabel={showCurrentLabel} tab={tab} setTab={setTab} activity={activity} result={result} event={event} index={index} controller={controller} inputs={inputs}/>;
  return <aside className="evidence-rail" id={contentId} aria-label="Collapsed learning evidence">
    <button type="button" className="evidence-rail-toggle" aria-label="Expand learning evidence" aria-expanded="false" aria-controls={contentId} onClick={() => onExpandedChange(true)}><Icon name="expandPanel" size={18}/></button>
    <div role="tablist" aria-label="Learning evidence" aria-orientation="vertical">{tabs.map((tabId) => <button type="button" role="tab" title={EVIDENCE_LABELS[tabId] || tabId} aria-label={EVIDENCE_LABELS[tabId] || tabId} aria-selected={tab === tabId} className={tab === tabId ? 'active' : ''} onClick={() => selectFromRail(tabId)} key={tabId}><Icon name={EVIDENCE_ICONS[tabId] || 'more'} size={18}/><span>{EVIDENCE_LABELS[tabId] || tabId}</span></button>)}</div>
  </aside>;
});

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
  if (activity.input.editable === false) {
    const curatedDescription = activity.renderer === 'linear-adt'
      ? 'The operations stay fixed so top, front, back, and held values remain synchronized with each source line.'
      : activity.renderer === 'linked-list'
        ? 'Each preset keeps node identities, pointer writes, and source lines synchronized.'
        : activity.renderer === 'array'
          ? 'Each preset keeps comparisons, boundaries, held records, and mutations synchronized with each source line.'
          : 'The example stays fixed so every teaching annotation remains synchronized with its source line.';
    return <div className="data-controls curated-note"><strong>{activity.renderer === 'linear-adt' ? `${activity.exampleKind} scenario` : 'Curated pseudocode activity'}</strong><span>{curatedDescription}</span>{activity.input.presets?.length ? <label>Case preset<select aria-label="Case preset" value={inputs.preset || activity.input.presets[0].id} onChange={(event) => setInputs((current) => ({ ...current, preset: event.target.value }))}>{activity.input.presets.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}</select></label> : null}</div>;
  }
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
  function openDialog() { setDraft({ ...inputs }); dialogRef.current?.showModal(); }
  function closeDialog() { dialogRef.current?.close(); }
  function applyScenario(event) { event.preventDefault(); setInputs({ ...draft }); closeDialog(); }
  return <div className="oop-scenario-launcher" aria-label="Scenario controls">
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
  </div>;
}

function DataControls(props) {
  return props.activity.input.kind === 'object-model' ? <OOPDataControls {...props}/> : <ArrayDataControls {...props}/>;
}

function workspaceCompositionFor(activity) {
  if (activity.family === 'Stacks') return 'split-vertical';
  if (activity.family === 'Trees') return 'wide-hierarchy';
  if (activity.renderer === 'array' || activity.renderer === 'linked-list' || activity.renderer === 'linear-adt') return 'stacked-horizontal';
  return 'stacked';
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

function PlaybackSettings({ state, controller, motionPreference, mobile = false }) {
  return <div className={`playback-settings-fields ${mobile ? 'is-mobile' : ''}`}>
    <label className="speed-control">{mobile ? 'Mobile speed' : 'Speed'}<select value={state.speed} onChange={(e) => controller.setSpeed(e.target.value)}><option value="3">0.5×</option><option value="6">1×</option><option value="9">2×</option></select></label>
    <label className="motion-control">{mobile ? 'Mobile motion' : 'Motion'}<select aria-label={mobile ? 'Mobile motion' : 'Motion preference'} value={motionPreference.override || 'device'} onChange={(e) => motionPreference.update(e.target.value)}><option value="device">Use device setting</option><option value="on">On</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label>
  </div>;
}

function IntegratedPlayback({ state, controller, event, motionPreference }) {
  return <section className="integrated-playback" aria-label="Playback controls">
    <div id="result-caption" className="integrated-step" aria-live="polite"><strong>{state.total ? state.index + 1 : 0} / {state.total}</strong><span>{event?.message || 'Preparing activity…'}</span></div>
    <div className="transport">
      <button type="button" aria-label="Previous" onClick={() => controller.step(-1)} disabled={state.index === 0 || state.transitioning}><Icon name="previous"/></button>
      <button type="button" className="primary" aria-label={state.status === 'playing' ? 'Pause' : 'Play'} onClick={controller.toggle} disabled={state.atEnd}><Icon name={state.status === 'playing' ? 'pause' : 'play'}/><span>{state.status === 'playing' ? 'Pause' : 'Play'}</span></button>
      <button id="btn-step" type="button" aria-label="Step" onClick={() => controller.step(1)} disabled={state.atEnd || state.transitioning}><Icon name="next"/><span>Step</span></button>
    </div>
    <div className="timeline-control integrated-timeline"><input id="step-slider" type="range" min="0" max={Math.max(state.total - 1, 0)} value={state.index} onChange={(e) => controller.seek(Number(e.target.value))} aria-label="Timeline step"/></div>
    <details className="playback-settings"><summary aria-label="Playback settings"><Icon name="settings" size={18}/><span>Settings</span></summary><PlaybackSettings state={state} controller={controller} motionPreference={motionPreference}/></details>
    <details className="mobile-playback-details"><summary>Timeline and settings</summary><input type="range" min="0" max={Math.max(state.total - 1, 0)} value={state.index} onChange={(e) => controller.seek(Number(e.target.value))} aria-label="Mobile timeline step"/><PlaybackSettings state={state} controller={controller} motionPreference={motionPreference} mobile/></details>
  </section>;
}

function useWorkspaceLayout(enabled, engine, adaptive = false) {
  const [layout, setLayout] = useState(() => enabled
    ? engine.read(localStorage, adaptive ? window.innerWidth : undefined)
    : engine.defaults(adaptive ? window.innerWidth : undefined));
  const updateLayout = useCallback((patch) => {
    if (!enabled) return;
    setLayout((current) => engine.write(localStorage, { ...current, ...patch }, adaptive ? window.innerWidth : undefined));
  }, [adaptive, enabled, engine]);
  return [layout, updateLayout];
}

const ITCC45LabStage = memo(function ITCC45LabStage({ activity, event, previousEvent, index, source, mobileTab, layout, onRatioChange, duration, motionMode }) {
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [focus, setFocus] = useState('split');
  const [displayRatio, setDisplayRatio] = useState(layout.sourceRatio);

  const clampForStage = useCallback((candidate) => {
    const width = stageRef.current?.getBoundingClientRect().width || 1200;
    const minimum = Math.max(ITCC45WorkspaceLayout.MIN_SOURCE_RATIO, 300 / width);
    const maximum = Math.min(ITCC45WorkspaceLayout.MAX_SOURCE_RATIO, (width - 442) / width);
    return Math.min(Math.max(maximum, minimum), Math.max(minimum, Number(candidate)));
  }, []);

  const previewRatio = useCallback((candidate) => {
    const next = clampForStage(candidate);
    stageRef.current?.style.setProperty('--itcc45-source-ratio', `${next * 100}%`);
    dragRef.current = next;
    return next;
  }, [clampForStage]);

  useEffect(() => {
    const syncRatio = () => {
      const next = clampForStage(layout.sourceRatio);
      setDisplayRatio((current) => current === next ? current : next);
      stageRef.current?.style.setProperty('--itcc45-source-ratio', `${next * 100}%`);
    };
    syncRatio();
    if (!window.ResizeObserver || !stageRef.current) return undefined;
    const observer = new ResizeObserver(syncRatio);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [clampForStage, layout.sourceRatio]);
  useEffect(() => { setFocus('split'); }, [activity.id]);
  useEffect(() => {
    if (focus === 'split') return undefined;
    const exitFocus = (event) => { if (event.key === 'Escape') setFocus('split'); };
    document.addEventListener('keydown', exitFocus);
    return () => document.removeEventListener('keydown', exitFocus);
  }, [focus]);

  function updateFromPointer(event) {
    const bounds = stageRef.current.getBoundingClientRect();
    previewRatio((event.clientX - bounds.left) / bounds.width);
  }
  function beginResize(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  }
  function finishResize(event) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const next = dragRef.current ?? displayRatio;
    setDisplayRatio(next); onRatioChange(next); dragRef.current = null;
  }
  function resizeWithKeyboard(event) {
    let next = displayRatio;
    if (event.key === 'ArrowLeft') next -= 0.05;
    else if (event.key === 'ArrowRight') next += 0.05;
    else if (event.key === 'Home') next = ITCC45WorkspaceLayout.MIN_SOURCE_RATIO;
    else if (event.key === 'End') next = ITCC45WorkspaceLayout.MAX_SOURCE_RATIO;
    else return;
    event.preventDefault();
    next = previewRatio(next); setDisplayRatio(next); onRatioChange(next); dragRef.current = null;
  }
  function toggleFocus(target) { setFocus((current) => current === target ? 'split' : target); }

  return <div ref={stageRef} className={`itcc45-lab-stage focus-${focus}`} style={{ '--itcc45-source-ratio': `${displayRatio * 100}%` }}>
    <div id="itcc45-source-pane" className={`itcc45-source-pane desktop-source mobile-surface ${mobileTab === 'code' ? 'mobile-active' : ''}`}>
      <SourcePanel activity={activity} event={event} source={source} focused={focus === 'source'} onFocus={() => toggleFocus('source')}/>
    </div>
    <div className="itcc45-stage-separator" role="separator" aria-label="Resize code and model panels" aria-orientation="vertical" aria-valuemin="30" aria-valuemax="65" aria-valuenow={Math.round(displayRatio * 100)} tabIndex="0" onKeyDown={resizeWithKeyboard} onPointerDown={beginResize} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event); }} onPointerUp={finishResize} onPointerCancel={finishResize}><span aria-hidden="true"/></div>
    <div id="itcc45-model-pane" className="itcc45-model-pane">
      <section className={`visual-canvas mobile-surface ${mobileTab === 'visualize' ? 'mobile-active' : ''}`} tabIndex="0" aria-label={`${activity.title} visualization canvas`}>
        <ObjectModelSurface activity={activity} event={event} frame={event?.frame} previousFrame={previousEvent?.frame} focused={focus === 'model'} onFocus={() => toggleFocus('model')} duration={duration} motionMode={motionMode}/>
      </section>
      <p id="result-caption" className="current-step" aria-live="polite"><span>{index + 1}</span>{event?.segment?.label ? <em className={`learning-phase phase-${event.segment.id}`}>{event.segment.label}</em> : null}{event?.message || 'Preparing activity…'}</p>
    </div>
  </div>;
});

function VisualizerMenu() {
  const activities = useMemo(() => BSITLearningLab.listActivities('itcc47'), []);
  const families = useMemo(() => [...new Set(activities.map((activity) => activity.family))], [activities]);
  return <main className="visualizer-menu" aria-labelledby="visualizer-menu-title">
    <header className="visualizer-menu-heading">
      <div><a href="itcc47.html"><Icon name="back" size={15}/>Back to ITCC47</a><h1 id="visualizer-menu-title">Choose a visualization.</h1><p>Open a focused lesson, then step through the code and data together.</p></div>
      <span>{activities.length} interactive lessons</span>
    </header>
    <div className="visualizer-menu-families">
      {families.map((family) => <section className="visualizer-menu-family" key={family} aria-labelledby={`family-${family.replace(/\W+/g, '-').toLowerCase()}`}>
        <header><h2 id={`family-${family.replace(/\W+/g, '-').toLowerCase()}`}>{family}</h2><span>{activities.filter((activity) => activity.family === family).length}</span></header>
        <div className="visualizer-menu-list">
          {activities.filter((activity) => activity.family === family).map((activity) => {
            const release = ITCC47Curriculum.stateForResource('activity', activity.id, ITCC47CurriculumUI.previewOptions());
            return <a href={ITCC47CurriculumUI.href(`visualizer.html?activity=${encodeURIComponent(activity.id)}`)} className={`visualizer-menu-item release-item-${release.state}`} key={activity.id}>
              <span className="visualizer-menu-module">Module {activity.module} · {activity.exampleKind ? `${activity.exampleKind} · ` : ''}{release.state}</span><strong>{activity.title}</strong><span>{activity.subtitle}</span><Icon name="next" size={19}/>
            </a>;
          })}
        </div>
      </section>)}
    </div>
  </main>;
}

function LockedVisualizer({ release, requestedId }) {
  const title = release.resource?.title || BSITLearningLab.listActivities('itcc47').find((item) => item.id === requestedId)?.title || 'Visualization';
  return <main className="visualizer-locked" dangerouslySetInnerHTML={{ __html: ITCC47CurriculumUI.lockedPanel(release, { title: `${title} is not released yet` }) }}/>;
}

function VisualizerWorkspace({ params, courseId, requestedId }) {
  const isITCC45 = courseId === 'itcc45';
  const [itcc45WorkspaceLayout, updateITCC45WorkspaceLayout] = useWorkspaceLayout(isITCC45, ITCC45WorkspaceLayout, true);
  const [itcc47WorkspaceLayout, updateITCC47WorkspaceLayout] = useWorkspaceLayout(!isITCC45, ITCC47WorkspaceLayout);
  const workspaceLayout = isITCC45 ? itcc45WorkspaceLayout : itcc47WorkspaceLayout;
  const updateWorkspaceLayout = isITCC45 ? updateITCC45WorkspaceLayout : updateITCC47WorkspaceLayout;
  const activity = useMemo(() => BSITLearningLab.getActivity(courseId, requestedId), [courseId, requestedId]);
  const initialInputs = useCallback((nextActivity) => {
    if (nextActivity.input.defaults) return { ...nextActivity.input.defaults };
    return {
      values: [...nextActivity.input.defaultValues],
      target: nextActivity.input.needsTarget ? nextActivity.input.defaultValues[Math.floor(nextActivity.input.defaultValues.length / 2)] : null,
      index: nextActivity.input.index ?? null, value: nextActivity.input.value ?? null,
      preset: nextActivity.input.presets?.[0]?.id || null,
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
  const previousEvent = playback.index > 0 ? result.events[playback.index - 1] || null : null;
  const onEntityComplete = useTransitionBoundary({ state: playback, event, controller, mode: motionPreference.mode });
  const duration = motionPreference.mode === 'on' ? motionDuration(playback.speed) : (motionPreference.mode === 'reduced' ? 0.16 : 0);
  const visualDuration = playback.navigationSource === 'seek' || playback.navigationSource === 'load' ? 0 : duration;
  const objectVisualDuration = playback.navigationSource === 'seek' ? 0 : duration;
  const workspaceComposition = workspaceCompositionFor(activity);
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
  const backLabel = courseId === 'itcc45' ? 'All examples' : 'All visualizations';
  const topicActivities = useMemo(() => isITCC45 ? BSITLearningLab.listActivities(courseId).filter((item) => item.topicId === activity.topicId) : [], [activity.topicId, courseId, isITCC45]);
  const exampleIndex = isITCC45 ? Math.max(0, topicActivities.findIndex((item) => item.id === activity.id)) : 0;
  const previousExample = exampleIndex > 0 ? topicActivities[exampleIndex - 1] : null;
  const nextExample = exampleIndex < topicActivities.length - 1 ? topicActivities[exampleIndex + 1] : null;
  const exampleHref = (item) => item ? `visualizer.html?course=itcc45&activity=${encodeURIComponent(item.id)}` : null;
  const itcc47ActionHref = activity.renderer === 'linear-adt'
    ? ITCC47CurriculumUI.href(`lesson.html?checkpoint=${encodeURIComponent(activity.checkpointId)}`)
    : ITCC47CurriculumUI.href(`tracer.html?activity=${encodeURIComponent(activity.id)}`);
  const itcc47ActionLabel = activity.renderer === 'linear-adt' ? 'Lecture companion' : 'Edit pseudocode';
  return <LazyMotion features={domMax} strict><MotionConfig reducedMotion={motionPreference.mode === 'on' ? 'never' : 'always'} transition={{ duration }}><div className={`visualizer-workspace course-${courseId} evidence-${workspaceLayout.evidence} motion-${motionPreference.mode} navigation-${playback.navigationSource} composition-${workspaceComposition}`} data-motion-duration={duration} data-workspace-composition={workspaceComposition}>
    <main className="workspace-main">
      <div className="activity-heading"><div><p><a href={isITCC45 ? backHref : ITCC47CurriculumUI.href(backHref)}><Icon name="back" size={14}/>{backLabel}</a><span>{isITCC45 ? `Topic ${activity.module} / ${activity.topic} / Example ${exampleIndex + 1} of ${topicActivities.length}` : `Module ${activity.module} / ${activity.topic}${activity.exampleKind ? ` / ${activity.exampleKind}` : ''}`}</span></p><h1>{activity.title}</h1>{isITCC45 ? <span className="activity-learning-goal"><em>{activity.context}</em>{activity.learningGoal}</span> : <span>{activity.subtitle}</span>}</div><div className="activity-action-stack">{isITCC45 ? <nav className="activity-example-nav" aria-label="Examples in this topic">{previousExample ? <a href={exampleHref(previousExample)} aria-label={`Previous example: ${previousExample.title}`}><Icon name="back" size={14}/>Previous</a> : <span aria-disabled="true"><Icon name="back" size={14}/>Previous</span>}{nextExample ? <a href={exampleHref(nextExample)} aria-label={`Next example: ${nextExample.title}`}>Next<Icon name="next" size={14}/></a> : <span aria-disabled="true">Next<Icon name="next" size={14}/></span>}</nav> : null}<div className="activity-actions">{isITCC45 ? <OOPDataControls activity={activity} inputs={inputs} setInputs={setInputs}/> : null}<a className="edit-code" href={isITCC45 ? `itcc45-practice.html?topic=${activity.topicId}` : itcc47ActionHref}><Icon name={isITCC45 ? 'list' : activity.renderer === 'linear-adt' ? 'grid' : 'code'} size={17}/>{isITCC45 ? 'Practice this topic' : itcc47ActionLabel}</a></div></div></div>
      {!isITCC45 ? <DataControls activity={activity} inputs={inputs} setInputs={setInputs} onShuffle={shuffle}/> : null}
      <div className="mobile-surface-tabs" role="tablist" aria-label="Workspace view">{mobileTabs.map(([id, icon, label]) => <button type="button" role="tab" aria-selected={mobileTab === id} className={mobileTab === id ? 'active' : ''} onClick={() => setMobileTab(id)} key={id}><Icon name={icon}/>{label}</button>)}</div>
      {isITCC45 ? <ITCC45LabStage activity={activity} event={event} previousEvent={previousEvent} index={playback.index} source={source} mobileTab={mobileTab} layout={workspaceLayout} onRatioChange={(sourceRatio) => updateWorkspaceLayout({ sourceRatio })} duration={objectVisualDuration} motionMode={motionPreference.mode}/> : <div className="itcc47-workbench">
        <div className={`desktop-source mobile-surface ${mobileTab === 'code' ? 'mobile-active' : ''}`}><SourcePanel activity={activity} event={event} source={source}/></div>
        <div className="itcc47-visual-shell">
          <section className={`visual-canvas mobile-surface ${mobileTab === 'visualize' ? 'mobile-active' : ''}`} tabIndex="0" aria-label={`${activity.title} visualization canvas`}><Renderer frame={event?.frame} event={event} activity={activity} motionMode={motionPreference.mode} duration={visualDuration} onEntityComplete={onEntityComplete}/></section>
          <IntegratedPlayback state={playback} controller={controller} event={event} motionPreference={motionPreference}/>
        </div>
      </div>}
      <div className={`mobile-evidence mobile-surface ${mobileTab === 'trace' || mobileTab === 'more' ? 'mobile-active' : ''}`}>
        <EvidenceDrawer tab={mobileTab === 'trace' ? primaryEvidence : evidenceTab} setTab={setEvidenceTab} activity={activity} result={result} event={event} index={playback.index} controller={controller} inputs={inputs}/>
      </div>
    </main>
    <div className="desktop-evidence"><CollapsibleEvidencePanel contentId={isITCC45 ? 'itcc45-learning-evidence' : 'itcc47-learning-evidence'} expanded={workspaceLayout.evidence === 'expanded'} onExpandedChange={(expanded) => updateWorkspaceLayout({ evidence: expanded ? 'expanded' : 'collapsed' })} showCurrentLabel={isITCC45} tab={evidenceTab} setTab={setEvidenceTab} activity={activity} result={result} event={event} index={playback.index} controller={controller} inputs={inputs}/></div>
    {isITCC45 ? <PlaybackDock state={playback} controller={controller} activity={activity} event={event} motionPreference={motionPreference}/> : null}
  </div></MotionConfig></LazyMotion>;
}

function App() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const requestedCourse = params.get('course') || 'itcc47';
  const courseId = BSITLearningLab.resolveCourse(requestedCourse);
  const requestedActivity = params.get('activity');
  if (courseId === 'itcc47' && !requestedActivity) return <VisualizerMenu/>;
  if (courseId === 'itcc47' && requestedActivity) {
    const release = ITCC47Curriculum.stateForResource('activity', requestedActivity, ITCC47CurriculumUI.previewOptions());
    if (!['available', 'current'].includes(release.state)) return <LockedVisualizer release={release} requestedId={requestedActivity}/>;
  }
  return <VisualizerWorkspace params={params} courseId={courseId} requestedId={requestedActivity || 'itcc45-classes-blueprint'}/>;
}

const root = document.getElementById('visualizer-root');
if (root) createRoot(root).render(<App/>);
