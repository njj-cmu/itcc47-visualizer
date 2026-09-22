import React from 'react';
import { LayoutGroup, m } from 'motion/react';
import { PhaseIndicators, PhasePlayback } from './stack-execution.jsx';
import './undo-redo-execution.css';

const sourceText = (line) => line.replaceAll('<-', '←');

function PseudocodePanel({ source, event }) {
  return <section className="undo-redo-panel undo-redo-source" aria-label="Pseudocode">
    <header><h2>Pseudocode</h2></header>
    <div>{source.map((line, index) => <div className={`source-line ${event.source.line === index + 1 ? 'is-current' : ''}`} aria-current={event.source.line === index + 1 ? 'step' : undefined} key={index}>
      <span>{index + 1}</span><code>{sourceText(line)}</code>
    </div>)}</div>
  </section>;
}

function ExecutionStatusPanel({ event, source, Icon }) {
  const { execution, undoRedo } = event.frame;
  const context = undoRedo.context === 'COMPLETE' ? 'COMPLETE' : undoRedo.context;
  const contextDetail = context === 'UNDO' ? 'Undo the most recent edit'
    : context === 'REDO' ? 'Reapply the most recently undone edit'
      : context === 'RETURN' || context === 'COMPLETE' ? 'Return the completed document'
        : 'Prepare both history stacks';
  const rows = [
    ['code', 'Source (pseudocode)', `Line ${event.source.line} of ${source.length}`, sourceText(event.source.code)],
    ['restart', 'Operation (micro-step)', `Phase ${execution.phaseIndex + 1} of ${execution.phaseCount}`, execution.phaseLabels[execution.phaseIndex]],
    ['list', 'Context', context, contextDetail],
  ];
  return <section className="undo-redo-panel undo-redo-status" aria-label="Execution Status"><header><h2>Execution Status</h2></header>
    <dl>{rows.map(([icon, label, progress, detail]) => <div key={label}><dt><Icon name={icon} size={18}/><span>{label}</span></dt><dd><strong>{progress}</strong><span>{detail}</span></dd></div>)}</dl>
  </section>;
}

function ScenarioReference() {
  return <section className="undo-redo-panel undo-redo-reference" aria-label="Scenario and command types"><header><h2>Scenario</h2><span>1 UNDO → 1 REDO</span></header>
    <p>Start with document <code>AB</code>, Undo <code>[Type A, Type B]</code>, and an empty Redo stack.</p>
    <div className="undo-redo-command-legend"><article><strong>Type X</strong><span>Insert character X</span></article><article><strong>inverse(Type X)</strong><span>Delete character X</span></article></div>
  </section>;
}

function OperationHeader({ event }) {
  const { execution, undoRedo } = event.frame;
  return <section className={`undo-redo-panel undo-redo-operation context-${undoRedo.context.toLowerCase()}`} aria-label="Current Operation">
    <div className="undo-redo-operation-copy"><span>Current Operation</span><h2>{execution.title}</h2><p>{execution.description}</p></div>
    <div className="undo-redo-operation-code"><span>Source operation</span><code>{sourceText(event.source.code)}</code></div>
    <PhaseIndicators execution={execution}/>
  </section>;
}

function CommandCard({ item, duration, className = '' }) {
  return <m.div className={`undo-redo-command ${className}`} layoutId={`undo-redo-${item.id}`} transition={{ duration }} data-command-id={item.id}>
    <strong>{item.value}</strong><span>{item.detail}</span>
  </m.div>;
}

function HistoryStack({ lane, side, duration, active }) {
  const items = lane.items;
  const top = items.at(-1);
  return <section className={`undo-redo-panel history-stack history-${side} ${active ? 'is-active' : ''}`} aria-label={`${side === 'undo' ? 'Undo' : 'Redo'} Stack`}>
    <header><div><h2>{side === 'undo' ? 'Undo Stack' : 'Redo Stack'} <span>(History)</span></h2><p>{side === 'undo' ? 'Commands that can be undone' : 'Commands that can be redone'}</p></div><strong>{items.length} item{items.length === 1 ? '' : 's'}</strong></header>
    <div className="history-stack-body"><div className="history-stack-items" role={items.length ? 'list' : 'group'} aria-label={items.length ? `${side} commands, top to bottom` : `Empty ${side} stack`}>
      {items.length ? [...items].reverse().map((item) => <div role="listitem" className={item.id === top?.id ? 'is-top' : ''} key={item.id}>{item.id === top?.id ? <span className="history-top">TOP</span> : null}<CommandCard item={item} duration={duration}/></div>)
        : <div className="history-empty">empty</div>}
    </div><strong className="history-base">STACK BASE</strong><small>Bottom → Top: {items.length ? items.map((item) => item.value).join(', ') : '[ empty ]'}</small></div>
  </section>;
}

function TransferArrow({ reverse }) {
  return <svg className={reverse ? 'is-reverse' : ''} viewBox="0 0 74 28" aria-hidden="true"><path d="M4 14h58m0 0-10-9m10 9-10 9"/></svg>;
}

function TransferLane({ side, undoRedo, duration }) {
  const route = undoRedo.transition?.kind || '';
  const active = side === 'left' ? route === 'UNDO_TO_COMMAND' || route === 'COMMAND_TO_UNDO' : route === 'COMMAND_TO_REDO' || route === 'REDO_TO_COMMAND';
  const redoDirection = undoRedo.context === 'REDO';
  const reverse = redoDirection;
  const label = side === 'left'
    ? redoDirection ? 'PUSH Undo' : 'POP Undo'
    : redoDirection ? 'POP Redo' : 'PUSH Redo';
  const transitHere = active ? undoRedo.transit : null;
  return <div className={`history-transfer history-transfer-${side} ${active ? 'is-active' : ''}`} aria-label={`${label}${active ? ', active transfer' : ', inactive path'}`}>
    <span>{label}</span><TransferArrow reverse={reverse}/>
    {transitHere ? <CommandCard item={transitHere} duration={duration} className="is-transit"/> : null}
  </div>;
}

function CommandRegister({ undoRedo, duration }) {
  const command = undoRedo.command;
  const stateLabel = undoRedo.commandState.replaceAll(' ', ' · ');
  return <section className={`undo-redo-panel command-register state-${undoRedo.commandState.toLowerCase().replaceAll(' ', '-')}`} aria-label="Command Register">
    <header><div><h2>Command Register</h2><p>In transit between history stacks</p></div><span>{stateLabel}</span></header>
    <div className="command-register-body">{command ? <CommandCard item={command} duration={duration}/>
      : <div className="command-register-empty"><strong>EMPTY</strong><p>{undoRedo.transit ? 'Type B is moving between logical locations.' : 'No command is currently being held.'}</p></div>}</div>
  </section>;
}

function HistoryWorkspace({ frame, duration }) {
  const { undoRedo } = frame;
  const undoActive = undoRedo.context === 'UNDO';
  const redoActive = undoRedo.context === 'REDO';
  return <LayoutGroup id="undo-redo-command-lifecycle"><section className={`undo-redo-history context-${undoRedo.context.toLowerCase()}`} aria-label="Undo command register and Redo workspace">
    <HistoryStack lane={frame.lanes[0]} side="undo" duration={duration} active={undoActive}/>
    <TransferLane side="left" undoRedo={undoRedo} duration={duration}/>
    <CommandRegister undoRedo={undoRedo} duration={duration}/>
    <TransferLane side="right" undoRedo={undoRedo} duration={duration}/>
    <HistoryStack lane={frame.lanes[1]} side="redo" duration={duration} active={redoActive}/>
  </section></LayoutGroup>;
}

function DocumentState({ frame }) {
  const { document, returnValue } = frame.undoRedo;
  const change = document.change;
  const committed = change?.status === 'COMMITTED';
  return <section className={`undo-redo-panel document-state ${change ? `mutation-${change.kind.toLowerCase()} status-${change.status.toLowerCase()}` : ''}`} aria-label="Document State">
    <header><div><h2>Document State</h2><p>Current content of the document</p></div><span>Length: {document.length}</span></header>
    <div className="document-state-body"><div className="document-editor"><span>Current document</span><output aria-label="Current document content">{document.value}</output></div>
      <div className="document-mutation">{change ? <><span>{change.status === 'COMMITTED' ? 'Committed change' : 'Document mutation'}</span><div><code>{change.before}</code><strong>{change.kind === 'REMOVE_CHARACTER' ? 'remove “B”' : 'insert “B”'}</strong><code className={committed ? 'is-committed' : ''}>{change.after}</code></div><small>{change.status === 'APPLYING' ? 'Previewing the change; commit occurs in the next phase.' : committed ? 'The document state is now committed.' : 'Only APPLY may modify the document.'}</small></>
        : <><span>No document mutation</span><p>POP and PUSH move command history only. The document remains <code>{document.value}</code>.</p></>}</div>
      <div className="document-return"><span>Program / Return output</span><strong>{frame.output.length ? frame.output.join('') : 'empty'}</strong>{returnValue && !frame.output.length ? <small>Prepared: {returnValue}</small> : <small>Separate from live document state</small>}</div>
    </div>
  </section>;
}

function ExplanationPanel({ event }) {
  const { execution, undoRedo } = event.frame;
  const complete = execution.complete;
  return <section className={`undo-redo-panel undo-redo-explanation ${complete ? 'is-complete' : ''}`} aria-label="Explanation"><div><span aria-hidden="true">i</span><h2>Explanation</h2></div><p>{event.message}</p><strong>{undoRedo.commandLocation === 'IN_TRANSIT' ? 'Type B has one logical location: in transit.' : `Type B location: ${undoRedo.commandLocation.toLowerCase().replace('_', ' ')}.`}</strong></section>;
}

export function UndoRedoExecutionWorkspace({ source, event, state, controller, duration, Icon, motionPreference }) {
  if (!event?.frame.execution || !event.frame.undoRedo) return null;
  const { frame } = event;
  const { execution, undoRedo } = frame;
  return <div className={`undo-redo-workbench operation-${execution.kind} context-${undoRedo.context.toLowerCase()}`} data-line={event.source.line} data-phase={execution.phaseIndex + 1} data-operation={execution.kind} data-context={undoRedo.context} data-command-location={undoRedo.commandLocation}>
    <div className="undo-redo-left"><PseudocodePanel source={source} event={event}/><ExecutionStatusPanel event={event} source={source} Icon={Icon}/><ScenarioReference/></div>
    <div className="undo-redo-right"><OperationHeader event={event}/><HistoryWorkspace frame={frame} duration={duration}/><DocumentState frame={frame}/><ExplanationPanel event={event}/>
      <PhasePlayback state={state} controller={controller} event={event} execution={execution} source={source} Icon={Icon} motionPreference={motionPreference} contextLabel={undoRedo.context}/>
    </div>
  </div>;
}
