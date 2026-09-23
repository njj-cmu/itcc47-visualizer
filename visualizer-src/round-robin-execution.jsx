import React from 'react';
import { LayoutGroup, m } from 'motion/react';
import { PhaseIndicators, PhasePlayback } from './stack-execution.jsx';
import './round-robin-execution.css';

const displaySource = (line) => line.replaceAll('<-', '←');
const remainingLabel = (id, scheduler) => `${scheduler.remainingByProcess[id]} ms remaining`;

function ProcessCard({ id, scheduler, duration, location, moving = false }) {
  return <m.div layoutId={`round-robin-process-${id}`} transition={{ duration }} className={`rr-process-card ${moving ? 'is-moving' : ''}`} data-process-id={id} data-location={location} data-remaining={scheduler.remainingByProcess[id]}>
    <strong>{id}</strong><span>{remainingLabel(id, scheduler)}</span>
  </m.div>;
}

function PseudocodePanel({ source, event }) {
  return <section className="rr-panel rr-source" aria-label="Pseudocode"><header><h2>Pseudocode</h2><span aria-hidden="true">{'{ }'} Monospace</span></header><div>
    {source.map((line, index) => <div className={`source-line ${event.source.line === index + 1 ? 'is-current' : ''}`} aria-current={event.source.line === index + 1 ? 'step' : undefined} key={index}>
      <span>{index + 1}</span><code>{displaySource(line)}</code>
    </div>)}
  </div></section>;
}

function turnStatus(scheduler) {
  return scheduler.complete ? 'Scenario complete' : scheduler.turn ? `Turn ${scheduler.turn} of ${scheduler.turnCount}` : 'Ready to begin';
}

function ExecutionStatus({ source, event, execution, scheduler }) {
  return <section className="rr-panel rr-status" aria-label="Execution Status"><header><h2>Execution Status</h2></header><dl>
    <div><dt>Source</dt><dd><strong>Line {event.source.line} of {source.length}</strong><code>{displaySource(event.source.code)}</code></dd></div>
    <div><dt>Scheduler Turn</dt><dd><strong>{turnStatus(scheduler)}</strong><span>Current process: {scheduler.runtime.process || execution.processId || '—'}</span></dd></div>
    <div><dt>Operation</dt><dd><strong>Phase {execution.phaseIndex + 1} of {execution.phaseCount}</strong><span>{execution.phaseLabels[execution.phaseIndex]}</span></dd></div>
  </dl></section>;
}

function ConceptReminder({ quantum }) {
  return <section className="rr-panel rr-concepts" aria-label="Round-Robin concept reminder"><header><h2>Round-Robin concept reminder</h2></header><div className="rr-concept-quantum"><span>TIME QUANTUM</span><strong>{quantum} ms</strong></div><ol>
    <li>Take the process at FRONT.</li><li>Give it at most one quantum.</li><li>If unfinished, place it at BACK.</li><li>If finished, remove it from scheduling.</li>
  </ol></section>;
}

function OperationHeader({ execution, scheduler }) {
  const badge = execution.kind === 'return' ? 'RETURN' : scheduler.turn ? `TURN ${scheduler.turn}` : 'SETUP';
  return <section id="rr-operation" className="rr-panel rr-operation" aria-label="Current Operation"><div className="rr-operation-copy"><span>CURRENT OPERATION · <b>{badge}</b></span><h2>{execution.title}</h2><p>{execution.description}</p></div><PhaseIndicators execution={execution} showChecks/></section>;
}

function ReadyQueue({ scheduler, duration }) {
  const movingFromReady = scheduler.moving?.from === 'READY' ? scheduler.moving.id : null;
  const displayIds = movingFromReady ? [movingFromReady, ...scheduler.readyQueue] : scheduler.readyQueue;
  return <section id="rr-ready" className="rr-panel rr-ready" aria-label="Ready Queue"><header><h3>Ready Queue</h3><span>FIFO · FRONT → BACK</span></header>
    <div className="rr-ready-body" role={displayIds.length ? 'list' : 'group'} aria-label={displayIds.length ? 'Ready queue processes from front to back' : 'Empty ready queue'}>
      {displayIds.length ? displayIds.map((id, index) => <React.Fragment key={id}><div className={`rr-ready-item process-${id.toLowerCase()}`} role={movingFromReady === id ? 'presentation' : 'listitem'}><span className="rr-position-label">{index === 0 ? 'FRONT' : ''}</span><ProcessCard id={id} scheduler={scheduler} duration={duration} location={movingFromReady === id ? 'MOVING' : 'READY'} moving={movingFromReady === id}/><span className="rr-position-label">{index === displayIds.length - 1 ? 'BACK' : ''}</span></div>{index < displayIds.length - 1 ? <span className="rr-ready-arrow" aria-hidden="true">→</span> : null}</React.Fragment>) : <p>No processes waiting.</p>}
    </div><footer>Service order is always read from FRONT to BACK.</footer>
  </section>;
}

function CpuPanel({ scheduler, execution, duration }) {
  const movingFromCpu = scheduler.moving?.from === 'CPU' ? scheduler.moving.id : null;
  const id = scheduler.cpu || movingFromCpu;
  const isReceiving = execution.kind === 'dispatch' && execution.phaseIndex >= 2;
  const isRunning = execution.kind === 'run' && execution.phaseIndex >= 2;
  const isSliceComplete = execution.kind === 'update-remaining' || execution.kind === 'check-finished' || execution.kind === 'reenqueue';
  const justCompleted = execution.kind === 'check-finished' && execution.phaseIndex === 3 && scheduler.branchResult === false;
  const status = justCompleted ? 'COMPLETE' : isReceiving ? 'Receiving' : isRunning ? 'RUNNING' : isSliceComplete ? 'Slice complete' : id ? 'CPU' : 'CPU';
  return <section className="rr-panel rr-cpu" aria-label="CPU / Running"><header><h3>CPU / Running</h3><span>Quantum {scheduler.quantum} ms</span></header>
    <div className={`rr-cpu-body ${id ? 'has-process' : ''} ${isRunning ? 'is-running' : ''} ${justCompleted ? 'is-complete' : ''}`}>
      {id ? <><span className="rr-cpu-status">{status}</span><ProcessCard id={id} scheduler={scheduler} duration={duration} location={movingFromCpu ? 'MOVING' : 'CPU'} moving={!!movingFromCpu}/>
        <small>{isReceiving ? 'not running yet' : movingFromCpu ? 'moving to Ready BACK' : isRunning ? `CPU slice: ${scheduler.sliceDuration} ms` : isSliceComplete ? `${remainingLabel(id, scheduler)}` : 'Waiting to run'}</small>
        {isRunning ? <div className="rr-slice"><div className="rr-slice-fill"/><span>0 ms</span><span>{scheduler.sliceDuration} ms</span></div> : null}</>
        : <><span className="rr-cpu-status">{status}</span><strong>{justCompleted ? 'P2' : 'Idle'}</strong><small>{justCompleted ? '2 ms → 0 ms · CPU burst complete' : scheduler.complete ? 'No process running' : 'Waiting for dispatch'}</small></>}
    </div><footer>Dispatch selects a process. RUN consumes its CPU slice.</footer>
  </section>;
}

function CompletedPanel({ scheduler, duration }) {
  return <section className="rr-panel rr-completed" aria-label="Completed Processes"><header><h3>Completed</h3><span>finished processes</span></header>
    <div className="rr-completed-body" role={scheduler.completedProcesses.length ? 'list' : 'group'} aria-label={scheduler.completedProcesses.length ? 'Completed processes' : 'No completed processes'}>
      {scheduler.completedProcesses.length ? scheduler.completedProcesses.map((id) => <div role="listitem" key={id}><ProcessCard id={id} scheduler={scheduler} duration={duration} location="COMPLETED"/><small>CPU burst complete</small></div>) : <p>No completed processes</p>}
    </div><footer>Completed processes do not return to the ready queue.</footer>
  </section>;
}

function ContextPanel({ execution, scheduler, event }) {
  const { kind, phaseIndex, processId } = execution;
  const current = processId || scheduler.runtime.process;
  const value = current ? scheduler.remainingByProcess[current] : null;
  let title = 'Scheduler ready';
  let feature = `Time quantum = ${scheduler.quantum} ms`;
  let detail = event.message;
  if (kind === 'dispatch') { title = current === 'P2' ? 'Why P2 runs next' : 'Dispatch ≠ Run'; feature = `FRONT process = ${current}`; }
  if (kind === 'run') { title = 'CPU slice'; feature = `MIN(quantum, remaining) = MIN(${scheduler.quantum}, ${execution.before}) = ${scheduler.sliceDuration ?? Math.min(scheduler.quantum, execution.before)} ms`; detail = scheduler.sliceResult !== null ? `Predicted remaining: ${execution.before} → ${scheduler.sliceResult} ms. Committed remaining is still ${scheduler.runtime.remaining} ms until line 5.` : event.message; }
  if (kind === 'update-remaining') { title = 'Remaining-work update'; feature = `${execution.before} - ${scheduler.sliceDuration} = ${execution.after} ms`; detail = phaseIndex === 3 ? `${current} remaining is now committed as ${value} ms.` : `Computed result: ${execution.after} ms. Committed remaining: ${scheduler.runtime.remaining} ms.`; }
  if (kind === 'check-finished') { title = 'remaining > 0 ?'; feature = scheduler.branchResult === null ? `Read remaining = ${value} ms` : `${value} > 0 → ${scheduler.branchResult ? 'TRUE' : 'FALSE'}`; detail = scheduler.branchResult === null ? event.message : `${scheduler.branchResult ? 'RE-ENQUEUE AT BACK' : 'DO NOT RE-ENQUEUE'}. ${event.message}`; }
  if (kind === 'reenqueue') { title = 'Round-Robin fairness'; feature = 'Before: [P2]    After: [P2, P1]'; detail = 'P1 does not continue immediately. It moves behind P2. Next FRONT = P2.'; }
  if (kind === 'endif') { title = 'Next scheduler action'; feature = scheduler.turn === 1 ? 'FRONT process = P2' : 'P2 has completed'; }
  if (kind === 'return') { title = 'Scheduling result'; feature = 'Ready Queue = [P1 · 3 ms]'; detail = 'P2 is complete; P1 still has 3 ms remaining.'; }
  return <section id="rr-context" className={`rr-panel rr-context context-${kind}`} aria-label="Contextual teaching panel"><header><h3>{title}</h3></header><div><strong>{feature}</strong><p>{detail}</p>{kind === 'run' && scheduler.sliceDuration !== null ? <small>0 ms ───────── {scheduler.sliceDuration} ms</small> : null}</div></section>;
}

function RuntimeState({ scheduler }) {
  return <section className="rr-panel rr-runtime" aria-label="Runtime State"><header><h3>Runtime State</h3></header><dl>
    <div><dt>process</dt><dd>{scheduler.complete ? '—' : scheduler.runtime.process || '—'}</dd></div>
    <div><dt>remaining</dt><dd>{scheduler.complete || scheduler.runtime.remaining === null ? '—' : `${scheduler.runtime.remaining} ms`}</dd></div>
    <div><dt>quantum</dt><dd>{scheduler.quantum} ms</dd></div>
    <div><dt>scheduler</dt><dd>{turnStatus(scheduler)}</dd></div>
  </dl></section>;
}

function ReturnOutput({ scheduler, output }) {
  return <section id="rr-output" className={`rr-panel rr-output ${output.length ? 'has-output' : ''}`} aria-label="Program / Return Output"><header><h3>Program / Return Output</h3></header><div>
    {output.length ? <strong>[{output.join(', ')}]</strong> : <p>No return value yet</p>}
    {scheduler.returnValue && !output.length ? <small>Prepared: [{scheduler.returnValue.join(', ')}]</small> : null}
  </div></section>;
}

function UtilityRail({ Icon }) {
  return <nav className="rr-utility-rail" aria-label="Workspace shortcuts"><a href="#rr-operation" aria-label="Current operation"><Icon name="expandPanel" size={17}/></a><a href="#rr-ready" aria-label="Ready queue"><Icon name="list" size={17}/></a><a href="#rr-context" aria-label="Teaching context"><Icon name="inspect" size={17}/></a><a href="#rr-output" aria-label="Return output"><Icon name="more" size={17}/></a></nav>;
}

export function RoundRobinExecutionWorkspace({ source, event, state, controller, duration, Icon, motionPreference }) {
  if (!event?.frame.execution || !event.frame.scheduler) return null;
  const { execution, scheduler, output } = event.frame;
  const turnDisplay = scheduler.complete ? 'Done' : scheduler.turn ? `${scheduler.turn} / ${scheduler.turnCount}` : 'Ready';
  return <div className="rr-workbench" data-line={event.source.line} data-phase={execution.phaseIndex + 1} data-turn={scheduler.complete ? 'complete' : scheduler.turn} data-operation={execution.kind} data-ready={scheduler.readyQueue.join(',')} data-cpu={scheduler.cpu || 'idle'} data-moving={scheduler.moving?.id || ''} data-completed={scheduler.completedProcesses.join(',')} data-output={output.join(',')}>
    <section className="rr-scenario" aria-label="Scheduling algorithm scenario"><strong>Scheduling algorithm scenario</strong><span>Two processes share a 2 ms quantum. Watch each process move between <b>Ready Queue</b>, <b>CPU</b>, and <b>Completed</b> state.</span></section>
    <div className="rr-left"><PseudocodePanel source={source} event={event}/><ExecutionStatus source={source} event={event} execution={execution} scheduler={scheduler}/><ConceptReminder quantum={scheduler.quantum}/></div>
    <div className="rr-right"><OperationHeader execution={execution} scheduler={scheduler}/><LayoutGroup id="round-robin-scheduler"><div className="rr-primary-row"><ReadyQueue scheduler={scheduler} duration={duration}/><CpuPanel scheduler={scheduler} execution={execution} duration={duration}/><CompletedPanel scheduler={scheduler} duration={duration}/></div></LayoutGroup><div className="rr-secondary-row"><ContextPanel execution={execution} scheduler={scheduler} event={event}/><RuntimeState scheduler={scheduler}/><ReturnOutput scheduler={scheduler} output={output}/></div>
      <PhasePlayback state={state} controller={controller} event={event} execution={execution} source={source} Icon={Icon} motionPreference={motionPreference} iteration={{ index: scheduler.turn - 1, count: scheduler.turnCount, processed: scheduler.complete ? scheduler.turnCount : scheduler.turn }} iterationLabel="Turn" iterationDisplay={turnDisplay}/>
    </div><UtilityRail Icon={Icon}/>
  </div>;
}
