import React, { useLayoutEffect, useRef, useState } from 'react';
import { LayoutGroup, m } from 'motion/react';
import { PhasePlayback } from './stack-execution.jsx';
import './delimiter-execution.css';

const PAIRS = Object.freeze({ '(': ')', '[': ']', '{': '}' });
const OPENERS = new Set(Object.keys(PAIRS));
const EXPECTED_OPENERS = Object.freeze(Object.fromEntries(Object.entries(PAIRS).map(([open, close]) => [close, open])));
const sourceText = (line) => line.replaceAll('<-', '←');

function PseudocodePanel({ source, event }) {
  return <section className="delimiter-panel delimiter-source" aria-label="Pseudocode">
    <header><h2>Pseudocode</h2></header>
    <div>{source.map((line, index) => <div className={`source-line ${event.source.line === index + 1 ? 'is-current' : ''}`} aria-current={event.source.line === index + 1 ? 'step' : undefined} key={index}>
      <span>{index + 1}</span><code>{sourceText(line)}</code>
    </div>)}</div>
  </section>;
}

function characterProgress(iteration) {
  if (iteration.index < 0) return iteration.processed === iteration.count
    ? `Characters processed: ${iteration.processed} of ${iteration.count}`
    : `Character 0 of ${iteration.count}`;
  return `Character ${iteration.index + 1} of ${iteration.count}`;
}

function ExecutionStatusPanel({ event, source, Icon }) {
  const { execution, iteration } = event.frame;
  const rows = [
    ['code', 'Source (pseudocode)', `Line ${event.source.line} of ${source.length}`, sourceText(event.source.code)],
    ['restart', 'Iteration (source character)', characterProgress(iteration), iteration.value == null ? (iteration.processed === iteration.count ? 'Source scan complete' : 'Waiting for first character') : `Current token: ${iteration.value}`],
    ['settings', 'Operation (micro-step)', `Phase ${execution.phaseIndex + 1} of ${execution.phaseCount}`, execution.phaseLabels[execution.phaseIndex]],
  ];
  return <section className="delimiter-panel delimiter-status" aria-label="Execution Status"><header><h2>Execution Status</h2></header>
    <dl>{rows.map(([icon, label, progress, detail]) => <div key={label}><dt><Icon name={icon} size={19}/><span>{label}</span></dt><dd><strong>{progress}</strong><span>{detail}</span></dd></div>)}</dl>
  </section>;
}

function DelimiterReference() {
  return <section className="delimiter-panel delimiter-reference" aria-label="Delimiter Reference"><header><h2>Delimiter Reference</h2></header>
    <div><article className="pair-parentheses"><strong>( &nbsp; )</strong><span>parentheses</span></article><article className="pair-brackets"><strong>[ &nbsp; ]</strong><span>brackets</span></article><article className="pair-braces"><strong>{'{  }'}</strong><span>braces</span></article></div>
  </section>;
}

function SourceCharacterStream({ frame, presets, preset, onPresetChange }) {
  const { sourceCharacters: characters, iteration } = frame;
  return <section className="delimiter-panel delimiter-stream" aria-label="Source Input"><header><div><h2>Source Input</h2><code>{characters.map((item) => item.value).join('')}</code></div>
    <label><span>Example</span><select aria-label="Delimiter example" value={preset} onChange={(event) => onPresetChange(event.target.value)}>{presets.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label></header>
    <div className="delimiter-stream-body"><ol style={{ '--delimiter-character-count': Math.max(characters.length, 1) }}>{characters.map((character) => {
      const current = character.state === 'current';
      const complete = character.state === 'processed' || character.state === 'resolved';
      const failed = character.state === 'failed';
      return <li className={`is-${character.state}`} aria-current={current ? 'step' : undefined} aria-label={`${character.value}, ${character.state}`} key={character.index}>
        <strong>{character.value}</strong>{complete ? <span aria-hidden="true">✓</span> : failed ? <span aria-hidden="true">×</span> : null}<small>{character.index + 1}</small>
      </li>;
    })}</ol><div className="delimiter-character-progress"><strong>{characterProgress(iteration)}</strong><progress aria-label="Processed source characters" value={iteration.processed} max={iteration.count || 1}/><span>{iteration.index < 0 ? (iteration.processed === iteration.count ? 'Source scan complete' : 'Ready to scan') : 'Processing...'}</span></div></div>
  </section>;
}

function CurrentTokenPanel({ frame }) {
  const { iteration, execution, matching } = frame;
  const token = iteration.value;
  const isOpener = OPENERS.has(token);
  const scanComplete = execution.kind === 'final-check';
  const type = iteration.type || (token == null ? (scanComplete ? 'Complete' : 'Waiting') : 'Not classified yet');
  const expected = isOpener ? PAIRS[token] : EXPECTED_OPENERS[token];
  let meaning = 'Waiting for a source character';
  let action = 'Initialize the parser';
  if (token == null) {
    meaning = scanComplete ? 'The source scan has finished' : 'Waiting for the first source character';
    action = scanComplete ? 'Validate the final stack' : 'Initialize the parser';
  } else if (isOpener) { meaning = 'Starts a new group'; action = 'PUSH onto stack'; }
  else { meaning = matching?.top ? `Ends a group opened by ${matching.top}` : 'Ends a group'; action = 'Check top, match, then POP'; }
  const tone = token == null ? (scanComplete ? 'complete' : 'waiting') : isOpener ? 'opener' : matching?.match ? 'matched' : 'closer';
  return <section className={`delimiter-panel delimiter-current-token tone-${tone}`} aria-label="Current Token"><header><h2>Current Token</h2></header>
    <div><strong className="delimiter-token-value">{token ?? '—'}</strong><dl>
      <div><dt>Type</dt><dd><span>{type}</span></dd></div>
      <div><dt>Meaning</dt><dd>{meaning}</dd></div>
      <div><dt>Action</dt><dd>{action}</dd></div>
      {token != null ? <div><dt>{isOpener ? 'Expected closer' : 'Expected opener'}</dt><dd><code>{expected}</code></dd></div> : null}
      {execution.kind === 'check-closer' && matching?.top ? <div><dt>Stack top</dt><dd><code>{matching.top}</code></dd></div> : null}
    </dl></div>
  </section>;
}

function CompareIcon({ failure }) {
  return <svg viewBox="0 0 48 28" aria-hidden="true"><path d="M5 10h32m0 0-7-6m7 6-7 6M43 18H11m0 0 7-6m-7 6 7 6"/>{failure ? <path className="compare-x" d="m20 9 8 10m0-10-8 10"/> : null}</svg>;
}

function MatchingInformation({ matching }) {
  if (matching.kind === 'empty-stack') {
    const evaluated = matching.state === 'empty-stack';
    return <section className={`delimiter-panel delimiter-matching ${evaluated ? 'is-failure' : ''}`} aria-label="Matching Information"><header><h2>Matching Information</h2></header>
      <div className="delimiter-empty-comparison"><strong>No opener is available</strong><p>The unmatched-openers stack is empty, so closer <code>{matching.received}</code> cannot be matched.</p>{evaluated ? <span>EMPTY-STACK CLOSER</span> : <span>Inspecting stack…</span>}</div>
    </section>;
  }
  const evaluated = matching.match != null;
  const success = matching.match === true;
  const failure = matching.match === false;
  return <section className={`delimiter-panel delimiter-matching ${success ? 'is-success' : ''} ${failure ? 'is-failure' : ''}`} aria-label="Matching Information"><header><h2>Matching Information</h2></header>
    <div className="delimiter-compare-row"><article><span>Stack top (opener)</span><strong>{matching.top}</strong><small>Expects closer: <code>{matching.expected}</code></small></article><div className="delimiter-compare-icon"><CompareIcon failure={failure}/><span>{evaluated ? (success ? 'Match' : 'Mismatch') : 'Compare'}</span></div><article><span>Current token (closer)</span><strong>{matching.received}</strong><small>{success ? 'Matches ✓' : failure ? `Received: ${matching.received}` : 'Waiting for result'}</small></article></div>
    <p className="delimiter-match-result"><strong>{evaluated ? (success ? '✓ Match found' : '× Mismatch') : 'Comparison pending'}</strong><span>{evaluated ? (success ? `Top ${matching.top} matches current token ${matching.received}` : `Expected ${matching.expected}, received ${matching.received}`) : 'The stack stays unchanged until the pair is evaluated.'}</span></p>
  </section>;
}

function OpenerInformation({ frame }) {
  const token = frame.iteration.value;
  if (!OPENERS.has(token)) return <section className="delimiter-panel delimiter-context" aria-label="Parser context"><header><h2>Parser Context</h2></header><p>Prepare the parser and begin the source scan.</p></section>;
  return <section className="delimiter-panel delimiter-context" aria-label="Opener Information"><header><h2>Opener Information</h2></header>
    <div><code>{token}</code><span aria-hidden="true">expects</span><code>{PAIRS[token]}</code></div><p>Keep this opener on the stack until its matching closer is encountered.</p>
  </section>;
}

function FinalValidationPanel({ frame }) {
  const evaluated = frame.execution.emptyEvaluation;
  const result = evaluated == null ? 'PENDING' : evaluated ? 'TRUE' : 'FALSE';
  return <section className={`delimiter-panel delimiter-final-check ${evaluated === true ? 'is-success' : evaluated === false ? 'is-failure' : ''}`} aria-label="Final Stack Validation"><header><h2>Final Stack Validation</h2></header>
    <dl><div><dt>Characters processed</dt><dd>{frame.iteration.processed} / {frame.iteration.count}</dd></div><div><dt>Unmatched openers</dt><dd>{frame.parser.unmatched}</dd></div><div><dt><code>stack is empty</code></dt><dd>{result}</dd></div></dl>
    <p>{evaluated == null ? 'The parser must inspect the final stack before returning a result.' : evaluated ? 'Every opener was resolved by its matching closer.' : 'One or more opening delimiters were never closed.'}</p>
  </section>;
}

function OperationContextPanel({ frame }) {
  if (frame.execution.kind === 'final-check') return <FinalValidationPanel frame={frame}/>;
  if (frame.matching) return <MatchingInformation matching={frame.matching}/>;
  return <OpenerInformation frame={frame}/>;
}

function ValueBlock({ item, duration, copy = false }) {
  // Switching from a comparison copy to the real outgoing value must create a
  // fresh projection node so Motion can connect it to the former stack slot.
  return <m.div key={`${item.id}-${copy ? 'copy' : 'entity'}`} className="delimiter-value" layoutId={copy ? undefined : item.id} transition={{ duration }} data-value-id={item.id}><strong>{item.value}</strong></m.div>;
}

function UnmatchedOpenersStack({ frame, duration }) {
  const items = frame.lanes[0].items;
  const { execution, matching } = frame;
  const slots = Math.max(4, items.length + (execution.pendingPush ? 1 : 0));
  return <section className="delimiter-panel delimiter-stack" aria-label="Unmatched Openers Stack"><header><h2>Unmatched Openers Stack</h2><span>{items.length} item{items.length === 1 ? '' : 's'}</span></header>
    <div className="delimiter-stack-frame"><div className="delimiter-stack-slots" role={items.length ? 'list' : 'group'} aria-label={items.length ? 'Unmatched openers, bottom to top' : 'Empty unmatched-openers stack'} style={{ '--delimiter-slots': slots }}>
      {Array.from({ length: slots }, (_, index) => {
        const item = items[index];
        const top = item && index === items.length - 1;
        const comparing = top && matching?.top === item.value && frame.execution.kind === 'check-closer';
        const matched = comparing && matching.match === true;
        const failed = comparing && matching.match === false;
        const pending = execution.pendingPush && index === items.length;
        return <div className={`delimiter-slot ${top ? 'is-top' : ''} ${comparing ? 'is-comparing' : ''} ${matched ? 'is-matched' : ''} ${failed ? 'is-failed' : ''} ${pending ? 'is-pending' : ''}`} data-slot-index={index} key={index} style={{ gridRow: slots - index }}>
          {top || (!items.length && index === 0) ? <span className="delimiter-top">TOP{!items.length ? ' · none' : ''}</span> : null}
          {item ? <div role="listitem" aria-label={`${item.value}${top ? ', top' : ''}`}><ValueBlock item={item} duration={duration}/><small>expects {PAIRS[item.value]}</small></div> : pending ? <div className="delimiter-pending" aria-label={`Pending push ${execution.item.value}`}><ValueBlock item={execution.item} duration={duration}/><small>pending push</small></div> : null}
        </div>;
      })}
    </div><strong className="delimiter-base">STACK BASE</strong><span className="delimiter-stack-count">{items.length ? `TOP = ${items.at(-1).value}` : 'empty'} · Size {items.length}</span></div>
  </section>;
}

function AuxiliaryValuePanel({ frame, duration }) {
  const auxiliary = frame.auxiliary;
  let title = 'Temporary Value';
  if (auxiliary?.kind === 'incoming') title = 'Incoming Value';
  if (auxiliary?.kind === 'outgoing') title = 'Outgoing Value';
  if (auxiliary?.kind === 'failure') title = 'Failure Context';
  if (auxiliary?.kind === 'validation') title = 'Validation Context';
  const copy = auxiliary?.kind === 'outgoing' && frame.execution.phaseIndex === 0;
  return <section className={`delimiter-panel delimiter-auxiliary kind-${auxiliary?.kind || 'empty'}`} aria-label={title}><header><h2>{title}</h2></header>
    <div className="delimiter-aux-body" data-transfer-origin>{auxiliary?.item ? <ValueBlock item={auxiliary.item} duration={duration} copy={copy}/> : <span className="delimiter-aux-empty">—</span>}<div><strong>{auxiliary?.status || 'No temporary value is currently held.'}</strong>{auxiliary?.kind === 'outgoing' ? <small>The matched opener leaves the stack only during POP.</small> : null}</div></div>
  </section>;
}

function StepExplanationPanel({ execution, message }) {
  return <section className="delimiter-panel delimiter-steps" aria-label="Step Explanation"><header><h2>Step Explanation</h2></header>
    <ol>{execution.phaseLabels.map((label, index) => {
      const state = index < execution.phaseIndex ? 'complete' : index === execution.phaseIndex ? 'current' : 'future';
      return <li className={`is-${state}`} aria-current={state === 'current' ? 'step' : undefined} key={label}><span aria-hidden="true">{state === 'complete' ? '✓' : index + 1}</span><strong>{label}</strong></li>;
    })}</ol><p>{message}</p>
  </section>;
}

function ParserStatusPanel({ parser, Icon }) {
  return <section className={`delimiter-panel delimiter-parser-status status-${parser.status.toLowerCase()}`} aria-label="Parser Status"><header><h2>Parser Status</h2></header>
    <div><span className="delimiter-status-icon"><Icon name={parser.status === 'VALID' ? 'check' : parser.status === 'INVALID' ? 'close' : 'settings'} size={21}/></span><div><span>Status</span><strong>{parser.status}</strong><p>{parser.message}</p>{parser.reason ? <small>{parser.reason}</small> : null}</div></div>
  </section>;
}

function TransferConnector({ execution }) {
  const svgRef = useRef(null);
  const [geometry, setGeometry] = useState(null);
  useLayoutEffect(() => {
    const workspace = svgRef.current?.parentElement;
    if (!workspace) return undefined;
    const measure = () => {
      const bounds = workspace.getBoundingClientRect();
      const origin = workspace.querySelector('[data-transfer-origin]')?.getBoundingClientRect();
      const slotIndex = execution.kind === 'push-opener' ? execution.beforeSize : execution.beforeSize - 1;
      const slot = workspace.querySelector(`[data-slot-index="${slotIndex}"]`)?.getBoundingClientRect();
      if (!origin || !slot) return setGeometry(null);
      const auxiliary = { x: origin.left - bounds.left + origin.width / 2, y: origin.top - bounds.top + origin.height / 2 };
      const stack = { x: slot.left - bounds.left + slot.width / 2, y: slot.top - bounds.top + slot.height / 2 };
      const [from, to] = execution.transfer === 'push' ? [auxiliary, stack] : [stack, auxiliary];
      setGeometry({ width: bounds.width, height: bounds.height, path: `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 34} ${to.x} ${to.y}` });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [execution.beforeSize, execution.kind, execution.transfer]);
  return <svg ref={svgRef} className={`delimiter-transfer is-${execution.transfer}`} viewBox={geometry ? `0 0 ${geometry.width} ${geometry.height}` : undefined} role="img" aria-label={execution.transfer === 'push' ? 'Opener moves toward the stack' : 'Matched opener leaves the stack'}>
    <defs><marker id="delimiter-transfer-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
    {geometry ? <path d={geometry.path} markerEnd="url(#delimiter-transfer-arrow)"/> : null}
  </svg>;
}

export function DelimiterExecutionWorkspace({ activity, inputs, setInputs, source, event, state, controller, duration, Icon, motionPreference }) {
  if (!event?.frame.execution || !event.frame.sourceCharacters) return null;
  const { frame } = event;
  const { execution, iteration } = frame;
  const preset = inputs.preset || activity.input.defaultPreset;
  const changePreset = (next) => { controller.pause(); setInputs((current) => ({ ...current, preset: next })); };
  return <div className={`delimiter-workbench operation-${execution.kind} parser-${frame.parser.status.toLowerCase()}`} data-line={event.source.line} data-character={iteration.index < 0 ? 0 : iteration.index + 1} data-phase={execution.phaseIndex + 1} data-operation={execution.kind} data-parser-status={frame.parser.status}>
    <div className="delimiter-left"><PseudocodePanel source={source} event={event}/><ExecutionStatusPanel event={event} source={source} Icon={Icon}/><DelimiterReference/></div>
    <div className="delimiter-right"><SourceCharacterStream frame={frame} presets={activity.input.presets} preset={preset} onPresetChange={changePreset}/>
      <LayoutGroup id={`delimiter-${preset}`}><div className="delimiter-main-grid">
        <div className="delimiter-context-column"><CurrentTokenPanel frame={frame}/><OperationContextPanel frame={frame}/><AuxiliaryValuePanel frame={frame} duration={duration}/></div>
        <div className="delimiter-structure-column"><UnmatchedOpenersStack frame={frame} duration={duration}/><StepExplanationPanel execution={execution} message={event.message}/><ParserStatusPanel parser={frame.parser} Icon={Icon}/></div>
        {execution.transfer ? <TransferConnector execution={execution}/> : null}
      </div></LayoutGroup>
      <PhasePlayback state={state} controller={controller} event={event} execution={execution} source={source} Icon={Icon} motionPreference={motionPreference} iteration={iteration} iterationLabel="Character"/>
    </div>
  </div>;
}
