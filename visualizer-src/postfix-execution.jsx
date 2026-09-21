import React, { useLayoutEffect, useRef, useState } from 'react';
import { LayoutGroup, m } from 'motion/react';
import { PhaseIndicators, PhasePlayback } from './stack-execution.jsx';
import './postfix-execution.css';

const sourceText = line => line.replaceAll('<-', '←');
const tokenProgress = iteration => iteration.index < 0
  ? (iteration.processed ? 'All tokens processed' : `Token 0 of ${iteration.count}`)
  : `Token ${iteration.index + 1} of ${iteration.count}`;

function PseudocodePanel({ source, event }) {
  return <section className="postfix-panel postfix-source" aria-label="Pseudocode">
    <header><h2>Pseudocode</h2></header>
    <div>{source.map((line, index) => <div className={`source-line ${event.source.line === index + 1 ? 'is-current' : ''}`} aria-current={event.source.line === index + 1 ? 'step' : undefined} key={index}>
      <span>{index + 1}</span><code>{sourceText(line)}</code>
    </div>)}</div>
  </section>;
}

function ExecutionStatusPanel({ event, source, Icon }) {
  const { execution, iteration } = event.frame;
  const rows = [
    ['code', 'Source (pseudocode)', `Line ${event.source.line} of ${source.length}`, sourceText(event.source.code)],
    ['restart', 'Loop (token iteration)', tokenProgress(iteration), iteration.value == null ? 'No current token' : `Current token: ${iteration.value}`],
    ['settings', 'Operation (micro-step)', `Phase ${execution.phaseIndex + 1} of ${execution.phaseCount}`, execution.phaseLabels[execution.phaseIndex]],
  ];
  return <section className="postfix-panel postfix-status" aria-label="Execution Status"><header><h2>Execution Status</h2></header>
    <dl>{rows.map(([icon, label, progress, detail]) => <div key={label}><dt><Icon name={icon} size={20}/>{label}</dt><dd><strong>{progress}</strong><span>{detail}</span></dd></div>)}</dl>
  </section>;
}

function ScenarioPanel({ tokens, scenario }) {
  return <section className="postfix-panel postfix-scenario" aria-label="Scenario"><h2>Scenario</h2>
    <p>Postfix expression: <span>{tokens.map((token, index) => <code key={index}>{token}</code>)}</span></p>
    <p>This example computes: <code>{scenario.calculation}</code></p>
  </section>;
}

function TokenStream({ tokens, iteration }) {
  return <section className="postfix-panel postfix-tokens" aria-label="Token Stream"><div><h2>Token Stream</h2>
    <ol>{tokens.map((token, index) => {
      const current = index === iteration.index;
      const processed = index < iteration.processed;
      return <li key={index} className={`${current ? 'is-current' : ''} ${processed ? 'is-processed' : ''}`} aria-current={current ? 'step' : undefined} aria-label={`${token}, ${processed ? 'processed' : current ? 'current' : 'upcoming'}`}>
        <strong>{token}</strong>{processed ? <span aria-hidden="true">✓</span> : null}
        {current ? <small>{processed ? 'processed' : 'current'}</small> : null}
      </li>;
    })}</ol></div><div className="postfix-token-progress"><span>{tokenProgress(iteration)}</span><progress aria-label="Processed tokens" value={iteration.processed} max={iteration.count}/></div>
  </section>;
}

function CurrentTokenPanel({ iteration }) {
  const decision = iteration.type === 'Number' ? 'Number → PUSH onto stack' : iteration.type === 'Operator' ? 'Operator → POP right → POP left → APPLY → PUSH' : 'Read and classify the next token';
  return <section className="postfix-panel postfix-current-token" aria-label="Current Token"><h2>Current Token</h2>
    <div><strong className="postfix-token-value">{iteration.value ?? '—'}</strong><dl><div><dt>Type:</dt><dd>{iteration.type || (iteration.index < 0 ? '—' : 'Not classified yet')}</dd></div><div><dt>Decision:</dt><dd>{iteration.index < 0 ? (iteration.processed ? 'All tokens processed' : 'Waiting for the token loop') : decision}</dd></div></dl></div>
  </section>;
}

function OperationHeader({ event }) {
  const { execution } = event.frame;
  return <section className="postfix-panel postfix-operation" aria-label="Now Executing"><h2>Now Executing</h2><h3>{execution.title}</h3>
    <p>{event.message}</p><PhaseIndicators execution={execution}/>
  </section>;
}

function ValueBlock({ item, duration, copy = false }) {
  // Seeking can replace the entity in a slot. Remount its projection node so
  // the next transfer measures this entity, not the former occupant.
  return <m.div key={item.id} className="postfix-value" layoutId={copy ? undefined : item.id} transition={{ duration }} data-value-id={item.id}><strong>{item.value}</strong></m.div>;
}

function StagingArea({ execution, duration }) {
  const { kind, staged, item, complete, origin, phaseIndex } = execution;
  let note = 'No incoming value.';
  if (kind === 'push') note = complete ? `${item.value} has been pushed onto the stack.` : staged ? `(${origin})` : 'Moving to stack…';
  if (kind === 'pop') note = complete ? `${execution.destination} = ${item.value}` : `Popping ${execution.destination} operand ${execution.destination === 'right' ? 'first' : 'second'}.`;
  if (kind === 'apply') note = `${execution.expression}${phaseIndex >= 2 ? ` = ${item.value}` : ''}`;
  if (kind === 'return') note = phaseIndex < 2 ? 'Return the final value from the stack.' : 'The result is now Program Output.';
  return <section className="postfix-staging" aria-label="Operation staging"><h3>{kind === 'apply' ? 'Operation / Result' : kind === 'pop' || kind === 'return' ? 'Operation in progress' : 'Incoming Value'}</h3>
    <div data-transfer-stage>{staged ? <ValueBlock item={item} duration={duration}/> : complete && kind === 'push' ? <span className="postfix-complete-mark" aria-hidden="true">✓</span> : null}<p>{note}</p></div>
  </section>;
}

function OperandStackPanel({ frame, duration }) {
  const items = frame.lanes[0].items, execution = frame.execution;
  const slots = Math.max(4, items.length + (execution.pendingPush ? 1 : 0));
  return <section className="postfix-stack" aria-label="Operand Stack"><header><h3>Operand Stack</h3><span>{items.length} item{items.length === 1 ? '' : 's'}</span></header>
    <div className="postfix-stack-frame"><div className="postfix-stack-slots" role={items.length ? 'list' : 'group'} aria-label="Stack items, bottom to top" style={{ '--postfix-slots': slots }}>
      {Array.from({ length: slots }, (_, index) => {
        const item = items[index], top = item && index === items.length - 1;
        return <div className={`postfix-slot ${top ? 'is-top' : ''} ${execution.pendingPush && index === items.length ? 'is-pending' : ''}`} data-slot-index={index} key={index} style={{ gridRow: slots - index }}>
          {top || (!items.length && index === 0) ? <span className="postfix-top">TOP{!items.length ? ' · none' : ''}</span> : null}
          {item ? <div role="listitem" aria-label={`${item.value}${top ? ', top' : ''}`}><ValueBlock item={item} duration={duration}/></div> : execution.pendingPush && index === items.length ? <div className="postfix-pending" aria-label={`Pending push ${execution.item.value}`}><ValueBlock item={execution.item} duration={duration}/><small>pending push</small></div> : null}
        </div>;
      })}
    </div><strong className="postfix-base">STACK BASE</strong><span className="postfix-stack-count">Size: {execution.pendingMetadata ? `${execution.beforeSize} → ${items.length} (updating)` : items.length}{!items.length ? ' · empty' : ''}</span></div>
  </section>;
}

function RuntimeValuesPanel({ runtime, duration }) {
  return <section className="postfix-panel postfix-runtime" aria-label="Runtime Values"><header><h3>Runtime Values</h3></header><div>
    {Object.keys(runtime).length ? <dl>{Object.entries(runtime).map(([name, item]) => <div key={name} className={`is-${item.status}`} data-runtime={name}>
      <dt><code>{name}</code><small>{name === 'right' ? 'first pop' : name === 'left' ? 'second pop' : 'computed value'}</small></dt>
      <dd>{item.status === 'unassigned' ? <span className="postfix-unassigned">—<small>unassigned</small></span> : <><ValueBlock item={item} duration={duration} copy={name === 'result'}/><small>{item.status === 'receiving' ? 'receiving…' : 'assigned'}</small></>}</dd>
    </div>)}</dl> : <p>No variables yet.<span>Variables such as right, left, or result will appear here during execution.</span></p>}
  </div></section>;
}

function ProgramOutputPanel({ frame, duration }) {
  return <section className="postfix-panel postfix-output" aria-label="Program Output"><header><h3>Program Output</h3></header><div data-transfer-output>
    {frame.output.length ? <><ValueBlock item={frame.execution.item} duration={duration}/><p>Returned result</p></> : <p>No output yet.</p>}
  </div></section>;
}

// Connector endpoints are measured from real layout anchors, including phone
// wrapping. No fixed pixel coordinates or independent animation state machine.
function TransferConnector({ execution }) {
  const ref = useRef(null), [path, setPath] = useState('');
  useLayoutEffect(() => {
    const workspace = ref.current.parentElement;
    const measure = () => {
      const bounds = workspace.getBoundingClientRect();
      const stage = workspace.querySelector('[data-transfer-stage]');
      const slot = workspace.querySelector(`[data-slot-index="${execution.kind === 'push' ? execution.beforeSize : execution.beforeSize - 1}"]`);
      const destination = workspace.querySelector(`[data-runtime="${execution.destination}"] dd`);
      const output = workspace.querySelector('[data-transfer-output]');
      const from = execution.transfer === 'push' || execution.transfer === 'output' ? stage : slot;
      const to = execution.transfer === 'push' ? slot : execution.transfer === 'pop' ? destination : execution.transfer === 'output' ? output : stage;
      if (!from || !to) return;
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const right = b.left >= a.left;
      const x1 = (right ? a.right : a.left) - bounds.left, x2 = (right ? b.left : b.right) - bounds.left;
      const y1 = a.top + a.height / 2 - bounds.top, y2 = b.top + b.height / 2 - bounds.top;
      setPath(`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 35} ${x2} ${y2}`);
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(workspace);
    return () => observer.disconnect();
  }, [execution.transfer, execution.beforeSize, execution.kind, execution.destination]);
  return <svg ref={ref} className="postfix-transfer" role="img" aria-label={execution.transfer === 'push' ? 'Value moves from staging to the pending top slot' : execution.transfer === 'pop' ? `Top value moves to ${execution.destination}` : 'Final value moves from stack to output'}><defs><marker id="postfix-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs><path d={path} markerEnd="url(#postfix-arrow)"/></svg>;
}

export function PostfixExecutionWorkspace({ source, scenario, event, state, controller, duration, Icon, motionPreference }) {
  if (!event?.frame.iteration) return null;
  const { frame } = event, { execution, iteration } = frame;
  return <div className={`postfix-workbench operation-${execution.kind}`} data-line={event.source.line} data-token={iteration.index + 1} data-phase={execution.phaseIndex + 1} data-operation={execution.operationId}>
    <div className="postfix-left"><PseudocodePanel source={source} event={event}/><ExecutionStatusPanel event={event} source={source} Icon={Icon}/><ScenarioPanel tokens={frame.input.tokens} scenario={scenario}/></div>
    <div className="postfix-right"><div className="postfix-surface"><TokenStream tokens={frame.input.tokens} iteration={iteration}/><div className="postfix-context"><CurrentTokenPanel iteration={iteration}/><OperationHeader event={event}/></div>
      <LayoutGroup id="postfix"><div className="postfix-operation-workspace"><div className="postfix-stage-stack"><StagingArea execution={execution} duration={duration}/><OperandStackPanel frame={frame} duration={duration}/></div>
        <div className="postfix-values"><RuntimeValuesPanel runtime={frame.runtime} duration={duration}/><ProgramOutputPanel frame={frame} duration={duration}/></div>
        {execution.transfer ? <TransferConnector execution={execution}/> : null}
      </div></LayoutGroup>
    </div><PhasePlayback state={state} controller={controller} event={event} execution={execution} source={source} Icon={Icon} motionPreference={motionPreference} iteration={iteration}/></div>
  </div>;
}
