import React, { useLayoutEffect, useRef, useState } from 'react';
import { LayoutGroup, m } from 'motion/react';
import './stack-execution.css';

const displaySource = (line) => line.replaceAll('<-', '←');

export function PhaseIndicators({ execution, compact = false, showChecks = false }) {
  return <ol className={compact ? 'stack-phase-dots' : 'stack-phase-stepper'} aria-label="Operation phases">
    {execution.phaseLabels.map((label, index) => <li key={label} aria-current={index === execution.phaseIndex ? 'step' : undefined}>
      <span aria-hidden="true">{compact ? '' : showChecks && index < execution.phaseIndex ? '✓' : index + 1}</span>{!compact ? <small>{label}</small> : <span className="sr-only">{label}</span>}
    </li>)}
  </ol>;
}

function PseudocodePanel({ source, event, execution }) {
  return <section className="stack-source-panel" aria-label="Pseudocode">
    <header><h2>Pseudocode</h2><span aria-hidden="true">{'{ }'} Monospace</span></header>
    <div className="stack-source-lines">{source.map((line, index) => <div className={`source-line ${event.source.line === index + 1 ? 'is-current' : ''}`} aria-current={event.source.line === index + 1 ? 'step' : undefined} key={index}>
      <span>{index + 1}</span><code>{displaySource(line)}</code>
    </div>)}</div>
    <div className="stack-execution-status" aria-live="polite">
      <h3>Execution Status</h3>
      <div className="stack-status-card"><div><span>Line {event.source.line} of {source.length}</span><strong>{displaySource(event.source.code)}</strong></div><div><span>Substep {execution.phaseIndex + 1} of {execution.phaseCount}</span><PhaseIndicators execution={execution} compact/></div></div>
      <aside className="stack-tip"><span className="stack-info-icon" aria-hidden="true">i</span><div><strong>A single line can have multiple steps.</strong><p>Use Step to move through the operation, or Play to run automatically.</p></div></aside>
    </div>
  </section>;
}

function ExecutionHeader({ event, execution }) {
  return <header className="stack-execution-header"><div><span>NOW EXECUTING</span><h2>{displaySource(event.source.code)}</h2><p>{execution.description}</p></div><PhaseIndicators execution={execution}/></header>;
}

function ValueBlock({ value, identity, duration, className = '', children }) {
  return <m.div layoutId={identity} transition={{ duration }} className={`stack-value ${className}`}><strong>"{value}"</strong>{children}</m.div>;
}

function StackStageArea({ event, execution, duration }) {
  const { kind, workingValue, complete, phaseIndex, phaseLabels } = execution;
  const heading = kind === 'pop' ? 'Removing Value (Top of Stack)' : kind === 'peek' ? 'Observe Top (No Removal)' : 'Incoming Value (Staging Area)';
  return <section className="stack-stage-area" aria-label={heading}>
    <h3>{heading}</h3>
    <div className="stack-working-area">
      {workingValue ? <ValueBlock value={workingValue} identity={`stack-value-${workingValue}`} duration={duration}><small>{kind === 'pop' ? 'removing from stack…' : phaseIndex === 0 ? 'incoming value' : 'ready to push'}</small></ValueBlock>
        : <div className="stack-stage-empty"><strong>{kind === 'peek' ? 'Read without removing' : kind === 'push' && execution.pendingMetadata ? `Committing "${execution.value}"` : '(empty)'}</strong><p>{kind === 'peek' ? `${execution.value} stays on the stack. Only its value is copied.` : kind === 'push' && execution.pendingMetadata ? 'The value is now in the stack. Confirm its top and size next.' : complete && kind === 'push' ? 'No incoming value. Value has been pushed to the stack.' : kind === 'pop' ? (complete ? `The removed value is stored in ${execution.destination}.` : 'The top item is selected for removal.') : 'No incoming value.'}</p></div>}
    </div>
    <div className={`stack-phase-description ${complete ? 'is-complete' : ''}`}><strong>{complete && ['push', 'pop', 'peek'].includes(kind) ? `${kind.toUpperCase()} complete` : `Step ${phaseIndex + 1}: ${phaseLabels[phaseIndex]}`}</strong><p>{event.message}</p></div>
  </section>;
}

function StackVisualization({ frame, execution, duration }) {
  const items = frame.lanes[0].items;
  const top = items.at(-1);
  return <section className="stack-visual" aria-label="Stack">
    <header><h3>Stack</h3><span>{items.length} item{items.length === 1 ? '' : 's'}</span></header>
    <div className="stack-tower-area">
      <div className="stack-tower" role={items.length ? 'list' : 'group'} aria-label={items.length ? 'Stack items, bottom to top' : 'Empty stack'}>
        {Array.from({ length: 4 }, (_, index) => {
          const item = items[index];
          const isTop = item?.id === top?.id && !!item;
          return <div data-slot-index={index} className={`stack-slot ${isTop ? 'is-top' : ''} ${execution.kind === 'pop' && execution.phaseIndex === 1 && index === items.length ? 'is-vacated' : ''}`} style={{ gridRow: 4 - index }} key={index}>
            {isTop || (!items.length && index === 0) ? <span className="stack-top-marker">TOP{!items.length ? ' · none' : ''}</span> : null}
            {item ? <div role="listitem" aria-label={`${item.value}${isTop ? ', top' : ''}`}><ValueBlock value={item.value} identity={`stack-value-${item.value}`} duration={duration} className={isTop ? 'is-active' : ''}/></div> : null}
          </div>;
        })}
      </div>
      <strong className="stack-base">STACK BASE</strong>
      {execution.kind === 'pop' && execution.phaseIndex === 1 ? <span className="stack-new-top">New top: {execution.nextTop}</span> : null}
    </div>
  </section>;
}

function StackInfoPanel({ frame, execution }) {
  const items = frame.lanes[0].items;
  const pending = execution.pendingMetadata;
  let tip = 'The top is the most recently pushed value (LIFO).';
  if (!items.length) tip = 'The stack is empty. Values will be pushed onto the top (LIFO).';
  if (execution.kind === 'guard') tip = 'UNDERFLOW: an empty stack has no top item to remove.';
  if (execution.kind === 'peek') tip = `PEEK copies the top value. No item is removed and size stays ${items.length}.`;
  if (pending) tip = execution.kind === 'pop' ? `Removing ${execution.value}. ${execution.nextTop} becomes the new top; size changes from ${execution.beforeSize} to ${execution.afterSize}.` : 'The value is committed. Confirm the new top and size in Update state.';
  return <aside className="stack-info-column"><section className="stack-info-panel" aria-label="Stack Info"><header><h3>Stack Info</h3></header><dl><div><dt>Top</dt><dd>{items.at(-1)?.value || 'none'}{pending ? ' (pending)' : ''}</dd></div><div><dt>Size</dt><dd>{pending ? `${execution.beforeSize} → ${execution.afterSize} (pending)` : items.length}</dd></div></dl></section><div className="stack-tip"><span className="stack-info-icon" aria-hidden="true">i</span><p>{tip}</p></div></aside>;
}

function RuntimeValuesPanel({ frame, execution, duration }) {
  return <section className="stack-runtime" aria-label="Runtime Values"><header><h3>Runtime Values</h3></header><div className="stack-runtime-content">
    {!frame.held.length && !execution.receiving ? <p>No runtime values yet.</p> : null}
    {frame.held.map((item) => <div className="stack-runtime-variable" key={item.id}><code>{item.label}</code><ValueBlock value={item.value} identity={item.label === 'popped' ? `stack-value-${item.value}` : `stack-copy-${item.value}`} duration={duration}/></div>)}
    {execution.receiving ? <div className="stack-runtime-variable is-receiving"><code>{execution.destination}</code><strong>receiving "{execution.value}"…</strong></div> : null}
  </div></section>;
}

function ProgramOutputPanel({ output }) {
  return <section className="stack-program-output" aria-label="Program Output"><header><h3>Program Output</h3></header><div>{output.length ? <p className="stack-return-value"><span>RETURN popped</span><strong>{output.join(' · ')}</strong></p> : <p>No output yet.</p>}</div></section>;
}

function TransferConnector({ execution }) {
  const svgRef = useRef(null);
  const [geometry, setGeometry] = useState(null);
  useLayoutEffect(() => {
    const workspace = svgRef.current.parentElement;
    const measure = () => {
      const bounds = workspace.getBoundingClientRect();
      const stage = workspace.querySelector('.stack-working-area').getBoundingClientRect();
      const slotIndex = execution.kind === 'push' ? execution.beforeSize : execution.beforeSize - 1;
      const slot = workspace.querySelector(`[data-slot-index="${slotIndex}"]`).getBoundingClientRect();
      const stageCard = workspace.querySelector('.stack-working-area > div');
      const staging = { x: stage.left - bounds.left + stage.width / 2 + stageCard.offsetWidth / 2 + 8, y: stage.top - bounds.top + stage.height / 2 };
      const stack = { x: slot.left - bounds.left - 5, y: slot.top - bounds.top + slot.height / 2 };
      const [from, to] = execution.kind === 'push' ? [staging, stack] : [stack, staging];
      setGeometry({ width: bounds.width, height: bounds.height, path: `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 65} ${to.x} ${to.y}` });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [execution.kind, execution.beforeSize]);
  return <svg ref={svgRef} className={`stack-transfer-path ${execution.transfer}`} viewBox={geometry ? `0 0 ${geometry.width} ${geometry.height}` : undefined} aria-label={execution.transfer === 'to-stack' ? 'Incoming value moves toward the stack' : 'Top value leaves the stack'} role="img">
    <defs><marker id="stack-transfer-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" className="arrowhead"/></marker></defs>
    {geometry ? <path d={geometry.path} markerEnd="url(#stack-transfer-arrow)"/> : null}
  </svg>;
}

export function PhasePlayback({ state, controller, event, execution, source, Icon, motionPreference, iteration, iterationLabel = 'Token', iterationDisplay, contextLabel, progressLabel, progressValue, progressMax, progressAriaLabel, showPhaseProgress = true }) {
  return <section className="stack-playback" aria-label="Playback controls">
    <div className="stack-progress"><span>{progressLabel || `Line ${event.source.line} / ${source.length}`}</span><progress aria-label={progressAriaLabel || 'Source line progress'} value={progressValue ?? event.source.line} max={progressMax ?? source.length}/></div>
    {iteration ? <div className="stack-progress"><span>{iterationDisplay ? `${iterationLabel} ${iterationDisplay}` : `${iterationLabel} ${iteration.index < 0 ? iteration.processed : iteration.index + 1} / ${iteration.count}`}</span><progress aria-label={`${iterationLabel} progress`} value={iteration.processed} max={iteration.count || 1}/></div> : null}
    {showPhaseProgress ? <div className="stack-progress"><span>Operation phase {execution.phaseIndex + 1} / {execution.phaseCount}</span><progress aria-label="Operation phase progress" value={execution.phaseIndex + 1} max={execution.phaseCount}/></div> : null}
    {contextLabel ? <div className="stack-progress stack-context-progress"><span>Context</span><strong>{contextLabel}</strong></div> : null}
    <div className="transport"><button type="button" aria-label="Previous" disabled={state.index === 0} onClick={() => controller.step(-1)}><Icon name="previous" size={18}/><span>Previous</span></button><button type="button" className="primary" aria-label={state.status === 'playing' ? 'Pause' : 'Play'} disabled={state.atEnd} onClick={controller.toggle}><Icon name={state.status === 'playing' ? 'pause' : 'play'} size={18}/><span>{state.status === 'playing' ? 'Pause' : 'Play'}</span></button><button type="button" id="btn-step" aria-label="Step" disabled={state.atEnd} onClick={() => controller.step(1)}><Icon name="next" size={18}/><span>Step</span></button></div>
    <details className="stack-playback-settings"><summary aria-label="Playback settings"><Icon name="settings" size={18}/><span>{state.speed === 3 ? '0.5' : state.speed === 9 ? '2' : '1'}×</span></summary><div>
      <label>Speed<select aria-label="Speed" value={state.speed} onChange={(e) => controller.setSpeed(e.target.value)}><option value="3">0.5×</option><option value="6">1×</option><option value="9">2×</option></select></label>
      <label>Motion<select aria-label="Motion preference" value={motionPreference.override || 'device'} onChange={(e) => motionPreference.update(e.target.value)}><option value="device">Use device setting</option><option value="on">On</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label>
      <label>Timeline step<input id="step-slider" aria-label="Timeline step" type="range" min="0" max={state.total - 1} value={state.index} onChange={(e) => controller.seek(Number(e.target.value))}/></label>
      <button type="button" onClick={() => controller.seek(0)}>Restart</button>
    </div></details>
    <span id="result-caption" className="sr-only">{event.message}</span>
  </section>;
}

export function StackExecutionWorkspace({ source, event, state, controller, duration, Icon, motionPreference }) {
  if (!event?.frame.execution) return null;
  const { frame } = event;
  const execution = frame.execution;
  return <div className={`stack-execution-workbench operation-${execution.kind}`} data-line={event.source.line} data-phase={execution.phaseIndex + 1}>
    <PseudocodePanel source={source} event={event} execution={execution}/>
    <div className="stack-execution-right"><section className="stack-execution-surface" aria-label="Stack operation workspace">
      <ExecutionHeader event={event} execution={execution}/>
      <LayoutGroup id="stack-foundations"><div className="stack-operation-workspace">
        <StackStageArea event={event} execution={execution} duration={duration}/>
        <StackVisualization frame={frame} execution={execution} duration={duration}/>
        <StackInfoPanel frame={frame} execution={execution}/>
        {execution.transfer ? <TransferConnector execution={execution}/> : null}
      </div><div className="stack-results"><RuntimeValuesPanel frame={frame} execution={execution} duration={duration}/><ProgramOutputPanel output={frame.output}/></div></LayoutGroup>
    </section><PhasePlayback state={state} controller={controller} event={event} execution={execution} source={source} Icon={Icon} motionPreference={motionPreference}/></div>
  </div>;
}
