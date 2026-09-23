import React from 'react';
import { LayoutGroup, m } from 'motion/react';
import { PhaseIndicators, PhasePlayback } from './stack-execution.jsx';
import './queue-execution.css';

const displaySource = (line) => line.replaceAll('<-', '←');
const displayIndex = (value) => value === null ? 'none' : value;

function QueueValue({ item, duration, copy = false, pending = false }) {
  if (!item) return null;
  return <m.div
    layoutId={`${copy ? 'queue-copy' : 'queue-ticket'}-${item.id}`}
    transition={{ duration }}
    className={`queue-value ${copy ? 'is-copy' : ''} ${pending ? 'is-pending' : ''}`}
    data-queue-value-id={item.id}
  ><strong>{item.value}</strong></m.div>;
}

function PseudocodePanel({ source, event }) {
  return <section className="queue-panel queue-source" aria-label="Pseudocode">
    <header><h2>Pseudocode</h2></header>
    <div>{source.map((line, index) => <div className={`source-line ${event.source.line === index + 1 ? 'is-current' : ''}`} aria-current={event.source.line === index + 1 ? 'step' : undefined} key={index}>
      <span>{index + 1}</span><code>{displaySource(line)}</code>
    </div>)}</div>
  </section>;
}

function ExecutionStatus({ event, source, Icon }) {
  const { execution, queue } = event.frame;
  return <section className="queue-panel queue-status" aria-label="Execution Status">
    <header><h2>Execution Status</h2></header>
    <dl>
      <div><dt><Icon name="code" size={16}/>Source</dt><dd><strong>Line {event.source.line} of {source.length}</strong><span>{displaySource(event.source.code)}</span></dd></div>
      <div><dt><Icon name="list" size={16}/>Operation</dt><dd><strong>Phase {execution.phaseIndex + 1} of {execution.phaseCount}</strong><span>{execution.phaseLabels[execution.phaseIndex]}</span></dd></div>
      <div><dt><Icon name="restart" size={16}/>Scenario</dt><dd><strong>Step {event.source.line} of {source.length}</strong><span>Current operation: {queue.context}</span></dd></div>
    </dl>
  </section>;
}

function QueueConcepts() {
  return <section className="queue-panel queue-concepts" aria-label="Queue Basics">
    <header><h2>Queue Basics</h2></header>
    <ul>
      <li><strong>FIFO</strong><span>First In, First Out</span></li>
      <li><strong>ENQUEUE</strong><span>insert at back</span></li>
      <li><strong>DEQUEUE</strong><span>remove from front</span></li>
      <li><strong>FRONT</strong><span>inspect without removing</span></li>
      <li><strong>Circular array</strong><span>indices wrap using modulo</span></li>
    </ul>
  </section>;
}

function OperationHeader({ event }) {
  const { execution, queue } = event.frame;
  return <section className="queue-panel queue-operation" aria-label="Current Operation">
    <div className="queue-operation-copy"><span>Current Operation</span><h2>{execution.title}</h2><p>{execution.description}</p></div>
    <div className={`queue-operation-kind kind-${execution.kind}`}><span>Operation</span><strong>{queue.context}</strong></div>
    <PhaseIndicators execution={execution}/>
  </section>;
}

function TransferArrow({ active, wrap }) {
  return <svg className={`queue-context-arrow ${active ? 'is-active' : ''} ${wrap ? 'is-wrap' : ''}`} viewBox="0 0 120 30" role="img" aria-label={wrap ? 'Value wraps from index 2 to index 0' : 'Value moves toward its destination slot'}>
    <defs><marker id="queue-context-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10Z"/></marker></defs>
    <path d={wrap ? 'M110 24 C88 1 31 1 10 24' : 'M5 15 H112'} markerEnd="url(#queue-context-arrowhead)"/>
  </svg>;
}

function ContextValue({ queue, execution, duration }) {
  const pending = queue.pending;
  const isEnqueue = execution.kind === 'enqueue' || execution.kind === 'wrap-enqueue';
  const isFront = execution.kind === 'front';
  const isDequeue = execution.kind === 'dequeue';
  const incomingVisible = isEnqueue && pending && pending.kind === 'INCOMING';
  const heading = isEnqueue ? 'Incoming Value' : isDequeue ? 'Outgoing Value' : isFront ? 'Observed Value' : execution.kind === 'underflow-guard' ? 'Underflow Check' : 'Current Value';
  const item = pending?.item || execution.item || null;
  return <section className={`queue-panel queue-context-value context-${execution.kind}`} aria-label={heading}>
    <header><h3>{heading}</h3></header>
    <div className="queue-context-body">
      {incomingVisible ? <QueueValue item={item} duration={duration}/> : null}
      {isDequeue && item ? <div className="queue-context-token is-outgoing"><strong>{item.value}</strong><span>{pending?.kind === 'REMOVING' ? 'leaving slot 0' : pending?.kind === 'ASSIGNING' ? 'assigned to served' : 'front value'}</span></div> : null}
      {isFront && item ? <div className="queue-context-token is-observed"><strong>{item.value}</strong><span>copied; not removed</span></div> : null}
      {execution.kind === 'underflow-guard' ? <div className={`queue-underflow ${queue.underflow?.wouldUnderflow ? 'is-confirmed' : ''}`}><span>queue is empty</span><strong>{queue.underflow?.checked ? 'TRUE' : 'checking…'}</strong><small>{queue.underflow?.wouldUnderflow ? 'DEQUEUE would cause UNDERFLOW' : 'No mutation is performed.'}</small></div> : null}
      {!isEnqueue && !isDequeue && !isFront && execution.kind !== 'underflow-guard' ? <div className="queue-context-empty">No incoming or outgoing value.</div> : null}
      {isEnqueue ? <><TransferArrow active={!!queue.transition} wrap={execution.kind === 'wrap-enqueue'}/><code>{pending?.formula || (execution.kind === 'wrap-enqueue' ? '(back + 1) MOD capacity' : 'destination pending')}</code></> : null}
      {isFront ? <small className="queue-observation-note">FRONT only observes the front element.</small> : null}
    </div>
  </section>;
}

function PointerMarkers({ queue, index }) {
  const markers = [];
  if (queue.front === index) markers.push(<span className="is-front" key="front">FRONT<small>(index {index})</small></span>);
  if (queue.back === index) markers.push(<span className="is-back" key="back">BACK<small>(index {index})</small></span>);
  return <div className="queue-pointer-markers">{markers}</div>;
}

function PhysicalQueue({ queue, execution, duration }) {
  const pendingInsert = queue.pending?.kind === 'INSERTING' ? queue.pending : null;
  const pendingRemoval = ['REMOVING', 'ASSIGNING'].includes(queue.pending?.kind) ? queue.pending : null;
  const showWrapCue = execution.kind === 'wrap-enqueue' && execution.phaseIndex >= 1;
  return <section className="queue-panel queue-physical" aria-label="Physical Circular Array">
    <header><h3>Queue <span>(Circular Array)</span></h3><strong>Capacity: {queue.capacity}</strong></header>
    <div className="queue-physical-body">
      {showWrapCue ? <div className="queue-wrap-cue"><TransferArrow active={!!queue.transition} wrap/><code>(2 + 1) MOD 3 = 0</code></div> : null}
      <div className="queue-slots" role="list" aria-label="Fixed physical queue slots">
        {queue.slots.map((slot) => {
          const receiving = pendingInsert?.destinationIndex === slot.index;
          const vacating = pendingRemoval?.sourceIndex === slot.index;
          const item = receiving ? pendingInsert.item : vacating ? null : slot.item;
          return <div className={`queue-slot-wrap ${receiving ? 'is-receiving' : ''} ${vacating ? 'is-vacating' : ''}`} data-slot-index={slot.index} data-slot-value={item?.value || 'empty'} data-committed-value={slot.item?.value || 'empty'} key={slot.index}>
            <span className="queue-slot-index">Index {slot.index}</span>
            <div className="queue-slot" role="listitem" aria-label={`Physical slot ${slot.index}: ${item?.value || 'empty'}`}>
              {item ? <QueueValue item={item} duration={duration} pending={receiving}/> : <span>empty</span>}
            </div>
            <PointerMarkers queue={queue} index={slot.index}/>
          </div>;
        })}
      </div>
    </div>
  </section>;
}

function QueueState({ queue }) {
  const pending = queue.pending && !['INCOMING', 'COPYING'].includes(queue.pending.kind) ? queue.pending : null;
  const value = (field) => {
    const current = queue[field];
    const future = pending?.[field];
    return future !== undefined && future !== current ? <><span>{displayIndex(current)}</span><b>→</b><strong>{displayIndex(future)}</strong><small>pending</small></> : <strong>{displayIndex(current)}</strong>;
  };
  return <section className="queue-panel queue-state" aria-label="Queue State">
    <header><h3>Queue State</h3></header>
    <dl><div><dt>front</dt><dd>{value('front')}</dd></div><div><dt>back</dt><dd>{value('back')}</dd></div><div><dt>size</dt><dd>{value('size')}</dd></div><div><dt>capacity</dt><dd><strong>{queue.capacity}</strong></dd></div></dl>
  </section>;
}

function LogicalOrder({ queue }) {
  return <section className="queue-panel queue-logical" aria-label="Logical Queue Order">
    <header><h3>Logical Queue Order <span>(front → back)</span></h3></header>
    <div role={queue.logicalOrder.length ? 'list' : 'group'} aria-label={queue.logicalOrder.length ? 'Queue values in logical FIFO order' : 'Empty logical queue'}>
      {queue.logicalOrder.length ? queue.logicalOrder.map((value, index) => <React.Fragment key={`${value}-${index}`}><span role="listitem" className={index === 0 ? 'is-front' : ''}>{value}</span>{index < queue.logicalOrder.length - 1 ? <svg viewBox="0 0 24 12" aria-hidden="true"><path d="M1 6h20m-5-4 5 4-5 4"/></svg> : null}</React.Fragment>) : <p>Queue is empty.</p>}
    </div>
    <small>{queue.logicalOrder.length ? `Next to be removed: ${queue.logicalOrder[0]}` : 'No front value yet.'}</small>
  </section>;
}

function RuntimeValues({ queue, execution, duration }) {
  const receiving = queue.runtime.receiving;
  const frontCopy = execution.kind === 'front' && execution.phaseIndex === 1;
  const servedItem = queue.runtime.served ? { id: 'ticket-a', value: queue.runtime.served } : receiving === 'served' ? queue.pending?.item : null;
  const nextItem = queue.runtime.next ? { id: 'ticket-a', value: queue.runtime.next } : null;
  return <section className="queue-panel queue-runtime" aria-label="Runtime Values">
    <header><h3>Runtime Values</h3></header>
    <div>
      <article><code>next</code>{nextItem ? <QueueValue item={nextItem} duration={duration} copy/> : <strong>—</strong>}<small>{frontCopy ? 'receiving a copy' : nextItem ? 'assigned' : 'not set yet'}</small></article>
      <article><code>served</code>{servedItem ? <QueueValue item={servedItem} duration={duration}/> : <strong>—</strong>}<small>{receiving === 'served' ? 'receiving A' : servedItem ? 'assigned' : 'not set yet'}</small></article>
    </div>
  </section>;
}

function ReturnOutput({ queue, output }) {
  return <section className={`queue-panel queue-output ${output.length ? 'has-output' : ''}`} aria-label="Program / Return Output">
    <header><h3>Program / Return Output</h3></header>
    <div>{output.length ? <><span>Return Value</span><strong>[{output.join(', ')}]</strong></> : <p>No output yet.</p>}{queue.returnValue && !output.length ? <small>Prepared: [{queue.returnValue.join(', ')}]</small> : null}</div>
  </section>;
}

function Explanation({ event }) {
  const { execution, queue } = event.frame;
  const finalContrast = queue.context === 'COMPLETE';
  return <section className={`queue-panel queue-explanation ${finalContrast ? 'is-complete' : ''}`} aria-label="Explanation">
    <div><span aria-hidden="true">i</span><h3>Explanation</h3></div><p>{event.message}</p>
    {finalContrast ? <strong>The physical array wrapped around, but FIFO order did not change.</strong> : execution.kind === 'front' ? <strong>Queue unchanged.</strong> : null}
  </section>;
}

export function QueueExecutionWorkspace({ source, event, state, controller, duration, Icon, motionPreference }) {
  if (!event?.frame.execution || !event.frame.queue) return null;
  const { frame } = event;
  const { execution, queue } = frame;
  return <div className={`queue-workbench operation-${execution.kind} context-${queue.context.toLowerCase()}`} data-line={event.source.line} data-phase={execution.phaseIndex + 1} data-operation={execution.kind} data-context={queue.context} data-front={displayIndex(queue.front)} data-back={displayIndex(queue.back)} data-size={queue.size} data-slots={queue.slots.map((slot) => slot.item?.value || '_').join(',')} data-logical-order={queue.logicalOrder.join(',')}>
    <div className="queue-left"><PseudocodePanel source={source} event={event}/><ExecutionStatus event={event} source={source} Icon={Icon}/><QueueConcepts/></div>
    <div className="queue-right"><OperationHeader event={event}/><LayoutGroup id="queue-foundations"><div className="queue-primary-row"><ContextValue queue={queue} execution={execution} duration={duration}/><PhysicalQueue queue={queue} execution={execution} duration={duration}/><QueueState queue={queue}/></div><div className="queue-secondary-row"><LogicalOrder queue={queue}/><RuntimeValues queue={queue} execution={execution} duration={duration}/><ReturnOutput queue={queue} output={frame.output}/></div></LayoutGroup><Explanation event={event}/>
      <PhasePlayback state={state} controller={controller} event={event} execution={execution} source={source} Icon={Icon} motionPreference={motionPreference} contextLabel={queue.context}/>
    </div>
  </div>;
}
