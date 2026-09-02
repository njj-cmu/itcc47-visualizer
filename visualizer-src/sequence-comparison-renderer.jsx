import React, { memo, useMemo } from 'react';
import { LayoutGroup, m } from 'motion/react';

const REPRESENTATION_LABELS = Object.freeze({
  scenario: 'Scenario', array: 'Indexed list', linked: 'Doubly linked list', comparison: 'Honest comparison',
});

function referenceLabel(id, recordsById) {
  if (!id) return 'NULL';
  return (recordsById.get(id)?.label || id).replace(/\.[^.]+$/, '');
}

const SequenceRecordCard = memo(function SequenceRecordCard({ record, location, active, opened, moving, duration, onEntityComplete }) {
  return <m.article
    layout
    layoutId={`array:${record.id}`}
    data-record-id={record.id}
    data-record-location={location.kind === 'held' ? 'held' : `slot:${location.index}`}
    className={`sequence-record-card ${active ? 'is-active' : ''} ${opened ? 'is-opened' : ''} ${location.kind === 'held' ? 'is-held' : ''}`}
    style={{ gridColumn: location.kind === 'held' ? 1 : location.index + 2, gridRow: 2 }}
    transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] } }}
    onLayoutAnimationComplete={moving ? () => onEntityComplete(record.id) : undefined}
    title={record.label}
    aria-label={`${record.label}, stable identity ${record.id}${opened ? ', opened document' : ''}${location.kind === 'held' ? ', held outside the indexed slots' : `, index ${location.index}`}`}
  >
    <span>{opened ? 'opened' : 'document'}</span>
    <strong>{record.label}</strong>
    <small>{record.id}</small>
  </m.article>;
});

const SequenceLinkedNode = memo(function SequenceLinkedNode({ node, state, recordsById, active, detached, moving, duration, onEntityComplete }) {
  const lastWrite = state.lastWrite;
  const headWrite = lastWrite?.field === 'head' && state.headId === node.id;
  const fieldClass = (field) => lastWrite?.nodeId === node.id && lastWrite.field === field ? `is-written change-${lastWrite.change}` : '';
  return <m.article
    layout
    layoutId={`linked:${node.id}`}
    data-linked-node-id={node.id}
    className={`sequence-linked-node ${active || headWrite ? 'is-active' : ''} ${detached ? 'is-detached' : ''}`}
    transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] } }}
    onLayoutAnimationComplete={moving ? () => onEntityComplete(node.id) : undefined}
    aria-label={`${node.label}, stable identity ${node.id}, previous ${referenceLabel(node.prev, recordsById)}, next ${referenceLabel(node.next, recordsById)}${detached ? ', detached from the head-reachable chain' : ''}`}
  >
    <header>
      <span>{state.headId === node.id ? 'HEAD' : state.tailId === node.id ? 'TAIL' : detached ? 'DETACHED' : 'NODE'}</span>
      <strong title={node.label}>{node.label}</strong>
      <small>{node.id}</small>
    </header>
    <div className={`sequence-node-field ${fieldClass('prev')}`}><span>prev</span><code>{referenceLabel(node.prev, recordsById)}</code></div>
    <div className={`sequence-node-field ${fieldClass('next')}`}><span>next</span><code>{referenceLabel(node.next, recordsById)}</code></div>
  </m.article>;
});

export const SequenceComparisonRenderer = memo(function SequenceComparisonRenderer({ frame, event, duration = 0, motionMode = 'off', onEntityComplete = () => {} }) {
  const records = frame?.records || [];
  const recordsById = useMemo(() => new Map(records.map((record) => [record.id, record])), [records]);
  const arrayState = frame?.arrayState || { slots: [], activeIndices: [] };
  const linkedState = frame?.linkedState || { nodes: [], reachableIds: [], detachedIds: [], activeNodeIds: [] };
  const linkedById = useMemo(() => new Map(linkedState.nodes.map((node) => [node.id, node])), [linkedState.nodes]);
  const slotByRecord = new Map(arrayState.slots.flatMap((id, index) => id ? [[id, index]] : []));
  const movingIds = new Set(event?.transition?.moves?.map((move) => move.entityId) || []);
  const activeArrayIds = new Set(arrayState.activeIndices?.map((index) => arrayState.slots[index]).filter(Boolean));
  const activeLinkedIds = new Set(linkedState.activeNodeIds || []);
  const finalArrayOrder = arrayState.slots.filter(Boolean).map((id) => recordsById.get(id)?.label || id).join(', ');
  const linkedItems = [];
  (linkedState.reachableIds || []).forEach((id, index, ids) => {
    linkedItems.push({ kind: 'node', id, detached: false });
    if (index < ids.length - 1) linkedItems.push({ kind: 'edge', id: `edge:${id}->${ids[index + 1]}` });
  });
  if (linkedState.detachedIds?.length) {
    linkedItems.push({ kind: 'break', id: 'detached-break' });
    linkedState.detachedIds.forEach((id) => linkedItems.push({ kind: 'node', id, detached: true }));
  }
  const activeAssignment = linkedState.lastWrite?.code || (arrayState.lastMove
    ? `${arrayState.lastMove.label}: [${arrayState.lastMove.from}] → [${arrayState.lastMove.to}]`
    : null);
  const activeChangeLabel = linkedState.lastWrite?.change === 'removed' ? 'Removed reference'
    : linkedState.lastWrite?.change === 'added' ? 'Added reference'
      : linkedState.lastWrite?.change === 'head' ? 'Head reference'
        : linkedState.lastWrite?.change === 'tail' ? 'Tail reference' : linkedState.lastWrite ? 'Rewritten reference' : 'Active assignment';
  const openedLabel = recordsById.get(frame?.openedId)?.label || frame?.openedId || 'Unknown document';
  const selectedRepresentation = frame?.representation || 'array';
  const linkedOrder = (linkedState.reachableIds || []).map((id) => recordsById.get(id)?.label || id).join(', ');

  return <div className="sequence-comparison" data-active-representation={frame?.activeRepresentation || selectedRepresentation} data-selected-representation={selectedRepresentation} data-motion-mode={motionMode}>
    <header className="sequence-scenario">
      <div><span>Recent Documents scenario</span><h2>{REPRESENTATION_LABELS[selectedRepresentation] || 'Representation comparison'}</h2></div>
      <p><strong>Opened:</strong> {openedLabel}</p>
      <p className="sequence-question">{frame?.explanation?.question}</p>
    </header>

    <div className="sequence-representation">
      {selectedRepresentation === 'array' ? <section className="sequence-panel sequence-array-panel is-active" aria-labelledby="sequence-array-title">
        <header><div><span>POSITION</span><h3 id="sequence-array-title">Indexed dynamic list</h3></div><p><strong>{arrayState.shifts || 0}</strong> shifts <span aria-hidden="true">·</span> <strong>{arrayState.placements || 0}</strong> {arrayState.placements === 1 ? 'placement' : 'placements'}</p></header>
        <div className="sequence-array-scroll" role="region" aria-label="Indexed Recent Documents slots" tabIndex="0">
          <LayoutGroup id="recent-array">
            <div className="sequence-array-track" data-array-order={finalArrayOrder}>
              <span className="sequence-slot-heading">held</span>
              {arrayState.slots.map((_, index) => <span className="sequence-slot-heading" style={{ gridColumn: index + 2 }} key={`heading:${index}`}>index {index}</span>)}
              <div className="sequence-slot-placeholder is-held-slot" style={{ gridColumn: 1, gridRow: 2 }}><span>{arrayState.heldId ? 'held record' : 'empty'}</span></div>
              {arrayState.slots.map((id, index) => <div className={`sequence-slot-placeholder ${id ? '' : 'is-hole'} ${arrayState.activeIndices?.includes(index) ? 'is-active' : ''}`} style={{ gridColumn: index + 2, gridRow: 2 }} key={`slot:${index}`}><span>{id ? 'slot' : 'HOLE'}</span></div>)}
              {records.map((record) => {
                const location = arrayState.heldId === record.id ? { kind: 'held' } : slotByRecord.has(record.id) ? { kind: 'slot', index: slotByRecord.get(record.id) } : null;
                return location ? <SequenceRecordCard record={record} location={location} active={activeArrayIds.has(record.id)} opened={record.id === frame.openedId} moving={movingIds.has(record.id)} duration={duration} onEntityComplete={onEntityComplete} key={record.id}/> : null;
              })}
            </div>
          </LayoutGroup>
        </div>
        <footer><span>Logical size: {arrayState.logicalSize}</span>{arrayState.lastMove ? <code aria-label={`Active array shift ${activeAssignment}`}>{activeAssignment}</code> : <span>References or records occupy numbered slots.</span>}</footer>
      </section> : null}

      {selectedRepresentation === 'linked' ? <section className="sequence-panel sequence-linked-panel is-active" aria-labelledby="sequence-linked-title">
        <header><div><span>RELATIONSHIPS</span><h3 id="sequence-linked-title">Doubly linked order</h3></div><p><strong>{event?.metrics?.pointerWrites || 0}</strong> pointer writes</p></header>
        <div className="sequence-linked-scroll" role="region" aria-label="Doubly linked Recent Documents nodes" tabIndex="0">
          <LayoutGroup id="recent-linked">
            <div className="sequence-linked-track" data-linked-order={linkedOrder} data-head-id={linkedState.headId || ''} data-tail-id={linkedState.tailId || ''}>
              {linkedItems.map((item) => {
                if (item.kind === 'edge') return <span className="sequence-link-symbol" aria-hidden="true" key={item.id}>⇄</span>;
                if (item.kind === 'break') return <span className="sequence-detached-break" key={item.id}><b>held outside chain</b><small>not reachable from head</small></span>;
                const node = linkedById.get(item.id);
                return node ? <SequenceLinkedNode node={node} state={linkedState} recordsById={recordsById} active={activeLinkedIds.has(node.id)} detached={item.detached} moving={movingIds.has(node.id)} duration={duration} onEntityComplete={onEntityComplete} key={`node:${node.id}`}/> : null;
              })}
              <span className="sequence-null-marker">NULL</span>
            </div>
          </LayoutGroup>
        </div>
        <footer>
          <span className={linkedState.stable ? 'is-stable' : 'is-transient'}>{linkedState.stable ? 'Stable stage' : 'Temporary relink in progress'}</span>
          {linkedState.lastWrite ? <code className={`change-${linkedState.lastWrite.change}`} aria-label={`${activeChangeLabel}: ${activeAssignment}`}><b>{activeChangeLabel}</b>{activeAssignment}</code> : <span>Each node stores explicit prev and next references.</span>}
        </footer>
      </section> : null}
    </div>

    {frame?.comparisonRows?.length ? <section className="sequence-complexity" aria-labelledby="sequence-complexity-title">
      <header><span>Do not declare a simplistic winner</span><h3 id="sequence-complexity-title">Operation and lookup costs</h3></header>
      <div>{frame.comparisonRows.map((row) => <article key={row.structure}><strong>{row.structure}</strong><p>{row.lookup}</p><p>{row.mutation}</p></article>)}</div>
    </section> : null}

    <footer className="sequence-takeaway">
      <p className="sequence-caveat"><strong>Lookup caveat</strong>{frame?.explanation?.caveat?.replace(/^Lookup caveat:\s*/i, '')}</p>
      <p>{frame?.explanation?.practical}</p>
      {frame?.explanation?.takeaway ? <strong>{frame.explanation.takeaway}</strong> : null}
    </footer>
  </div>;
});

export default SequenceComparisonRenderer;
