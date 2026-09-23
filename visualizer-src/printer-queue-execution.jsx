import React from 'react';
import { LayoutGroup, m } from 'motion/react';
import { PhaseIndicators, PhasePlayback } from './stack-execution.jsx';
import './printer-queue-execution.css';

const PHASES = Object.freeze({
  initialize: ['Create empty queue', 'Set capacity', 'Confirm idle printer', 'Complete'],
  enqueue: ['Read job', 'Add to back', 'Update pointers', 'Complete'],
  dequeue: ['Read front', 'Remove front', 'Update pointers', 'Store current'],
  print: ['Load current', 'Print pages', 'Complete job', 'Record output'],
  return: ['Read remaining queue', 'Prepare return value', 'Return queue', 'Complete'],
});

const displaySource = (line) => line.replaceAll('<-', '←');

function jobName(item) {
  return String(item?.value || '').split('·')[0].trim();
}

function jobPages(item) {
  const match = String(item?.value || '').match(/·\s*(\d+)\s+pages?/i);
  return match ? Number(match[1]) : null;
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function operationFor(event) {
  const line = event.source.line;
  const kind = line === 1 ? 'initialize' : line <= 4 ? 'enqueue' : line === 5 ? 'dequeue' : line === 6 ? 'print' : 'return';
  const phaseIndex = ({ 1: 0, 2: 1, 3: 0, 4: 3, 5: 3, 6: 2, 7: 2 })[line] || 0;
  const title = ({
    1: 'Initialize print queue',
    2: 'ENQUEUE jobs, Report',
    3: 'ENQUEUE jobs, Form',
    4: 'ENQUEUE jobs, Slides',
    5: 'DEQUEUE Report',
    6: 'PRINT Report',
    7: 'Return remaining queue',
  })[line];
  const description = ({
    1: 'Create an empty queue to store print jobs.',
    2: 'Prepare Report · 8 pages to enter at the back of the queue.',
    3: 'Prepare Form · 1 page to enter behind Report.',
    4: 'Slides joins the back after Report and Form.',
    5: 'Remove the front job, Report, from the queue and store it in current.',
    6: 'Print all 8 pages of the current job before recording the output.',
    7: 'Return the remaining jobs in their original FIFO order.',
  })[line];
  return { kind, title, description, phaseIndex, phaseCount: 4, phaseLabels: PHASES[kind] };
}

function JobIcon() {
  return <svg className="printer-job-icon" viewBox="0 0 52 60" aria-hidden="true" focusable="false">
    <path d="M9 2h23l12 12v42H9z" fill="#f4f7fc" stroke="#c7d3e4" strokeWidth="2"/>
    <path d="M32 2v12h12" fill="#dce7f5" stroke="#c7d3e4" strokeWidth="2"/>
    <path d="M17 24h20M17 32h20M17 40h15" stroke="#1683ee" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
}

function JobCard({ item, duration, location = 'queue', compact = false, rank, layoutId: requestedLayoutId, sharedLayout = true }) {
  if (!item) return null;
  const name = jobName(item);
  const pages = jobPages(item);
  return <m.article layout layoutId={sharedLayout ? requestedLayoutId || `printer-job-${slug(name)}` : undefined} transition={{ layout: { duration, ease: [0.22, 0.75, 0.28, 1] } }} className={`printer-job-card ${compact ? 'is-compact' : ''}`} data-job-id={slug(name)} data-job-location={location}>
    {rank ? <span className="printer-job-rank">{rank}</span> : null}
    <JobIcon/>
    <strong>{name}</strong>
    {pages !== null ? <span>{pages} page{pages === 1 ? '' : 's'}</span> : null}
  </m.article>;
}

function PseudocodePanel({ source, event }) {
  return <section className="printer-panel printer-source" aria-label="Pseudocode">
    <header><h2>Pseudocode</h2></header>
    <div className="printer-source-lines">{source.map((line, index) => <div className={`source-line ${event.source.line === index + 1 ? 'is-current' : ''}`} aria-current={event.source.line === index + 1 ? 'step' : undefined} key={index}>
      <span>{index + 1}</span><code>{displaySource(line)}</code>
    </div>)}</div>
  </section>;
}

function ExecutionStatus({ event, source, execution, Icon, state }) {
  const progress = state.index + 1;
  return <section className="printer-panel printer-status" aria-label="Execution Status">
    <header><h2>Execution Status</h2></header>
    <dl>
      <div><dt><Icon name="code" size={16}/>Source</dt><dd><strong>Line {event.source.line} of {source.length}</strong><span>{displaySource(event.source.code)}</span></dd></div>
      <div><dt><Icon name="list" size={16}/>Operation Phase</dt><dd><strong>Phase {execution.phaseIndex + 1} of 4</strong><span>{execution.phaseLabels[execution.phaseIndex]}</span></dd></div>
      <div><dt><Icon name="restart" size={16}/>Execution Progress</dt><dd className="printer-status-progress"><progress aria-label="Execution progress" value={progress} max={state.total}/><span>{progress} / {state.total}</span></dd></div>
    </dl>
  </section>;
}

function QueueConcepts() {
  return <section className="printer-panel printer-concepts" aria-label="Queue Concepts">
    <header><h2><span aria-hidden="true">i</span>Queue Concepts</h2></header>
    <ul>
      <li><strong>FIFO:</strong> First In, First Out (earliest job is served first).</li>
      <li><strong>ENQUEUE:</strong> add a job to the back of the queue.</li>
      <li><strong>DEQUEUE:</strong> remove the front job from the queue.</li>
      <li>The printer processes one job at a time.</li>
      <li>A shorter job does not jump ahead of an earlier job.</li>
      <li>FIFO follows arrival order, not job size.</li>
    </ul>
  </section>;
}

function OperationHeader({ execution }) {
  return <section className="printer-panel printer-operation" aria-label="Current Operation">
    <div className="printer-operation-copy"><span>Current Operation</span><h2>{execution.title}</h2><p>{execution.description}</p></div>
    <PhaseIndicators execution={execution} showChecks/>
  </section>;
}

function TransferArrow({ active }) {
  return <svg className={`printer-transfer-arrow ${active ? 'is-active' : ''}`} viewBox="0 0 140 44" aria-hidden="true" focusable="false">
    <defs><marker id="printer-queue-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10Z"/></marker></defs>
    <path d="M4 22 C42 2 89 2 132 22" markerEnd="url(#printer-queue-arrowhead)"/>
  </svg>;
}

function IncomingJob({ item, duration, line, queue }) {
  const status = item ? 'Job to enqueue' : queue.length === 3 ? 'All jobs are queued' : line === 1 ? 'No incoming job' : line >= 5 ? 'No incoming job' : 'No job waiting to enter';
  return <section className="printer-panel printer-incoming" aria-label="Incoming Job">
    <header><h3>Incoming Job</h3></header>
    <div className={`printer-incoming-body ${item ? 'has-job' : 'is-empty'}`}>
      {item ? <JobCard item={item} duration={duration} location="incoming" layoutId={line === 4 ? `printer-arrival-${slug(jobName(item))}` : undefined}/> : <div className="printer-incoming-empty"><span className="printer-empty-document"><JobIcon/></span><strong>None</strong></div>}
      <TransferArrow active={!!item && line > 1 && line < 4}/>
      <p>{item ? line === 4 ? `Latest arrival: ${jobName(item)} is now at the BACK.` : status : status}</p>
    </div>
  </section>;
}

function QueueTray({ items, duration, line }) {
  const reverse = [...items].reverse();
  const offset = 3 - reverse.length;
  const slots = [...Array.from({ length: offset }, () => ({ item: null, logicalIndex: -1 })), ...reverse.map((item, index) => ({ item, logicalIndex: items.length - index - 1 }))];
  return <section className="printer-panel printer-queue" aria-label="Print Queue (FIFO)" data-queue-size={items.length} data-queue-order={items.map(jobName).join(',')}>
    <header><h3>Print Queue (FIFO)</h3><strong>Size: {items.length} / 3</strong></header>
    <div className="printer-queue-body">
      <div className="printer-queue-end-labels" aria-hidden="true"><strong className="is-back">BACK<small>jobs enter</small></strong><strong className="is-front">FRONT<small>printer takes next</small></strong></div>
      <div className="printer-queue-tray" role={items.length ? 'list' : 'group'} aria-label={items.length ? 'Print jobs arranged from back on the left to front on the right' : 'Empty print queue'}>
        {slots.map(({ item, logicalIndex }, index) => {
          const isFront = !!item && logicalIndex === 0;
          const isBack = !!item && logicalIndex === items.length - 1;
          return <div className={`printer-queue-slot ${item ? 'has-job' : 'is-empty'} ${isFront ? 'is-front' : ''} ${isBack ? 'is-back' : ''}`} data-slot-index={index} data-slot-job={item ? jobName(item) : 'empty'} key={index} role={items.length ? 'listitem' : undefined} aria-label={`Queue slot ${index + 1}: ${item ? `${jobName(item)}, ${jobPages(item)} pages${isFront ? ', FRONT' : ''}${isBack ? ', BACK' : ''}` : 'empty'}`}>
            {item ? <><div className="printer-slot-markers">{isBack ? <span className="is-back">BACK</span> : null}{isFront ? <span className="is-front">FRONT</span> : null}</div><JobCard key={jobName(item)} item={item} duration={duration} location="queue" compact sharedLayout={jobName(item) === 'Report'}/></> : <span className="printer-slot-empty">Empty</span>}
          </div>;
        })}
      </div>
      {line === 4 ? <p className="printer-fifo-note">The shorter Form stays behind Report. FIFO follows arrival order, not job size.</p> : null}
    </div>
  </section>;
}

function PrinterIllustration({ status, item }) {
  const name = jobName(item);
  const pages = jobPages(item);
  return <div className={`printer-illustration status-${status}`} role="img" aria-label={`Office printer, ${status === 'idle' ? 'idle' : status === 'ready' ? `ready with ${name} loaded` : `finished printing ${name}`}`}>
    <div className="printer-top-paper"><span/><span/><span/></div>
    <div className="printer-device">
      <div className="printer-device-top"><i/><i/></div>
      <div className="printer-device-control"><i/><b/></div>
      <div className="printer-device-slot"><i/></div>
      <div className="printer-device-lower"><i/></div>
      <span className="printer-device-light"/>
    </div>
    {status === 'printed' ? <div className="printer-output-sheet"><strong>{name}</strong><span>{pages} pages · printed</span></div> : null}
  </div>;
}

function PrinterPanel({ status, item }) {
  const title = status === 'ready' ? 'Ready' : status === 'printed' ? 'Print complete' : 'Idle';
  const message = status === 'ready' ? `Job loaded: ${jobName(item)} (${jobPages(item)} pages)` : status === 'printed' ? `${jobName(item)} printed · ${jobPages(item)} / ${jobPages(item)} pages` : 'No job is currently being printed.';
  return <section className="printer-panel printer-device-panel" aria-label="Printer">
    <header><h3>Printer</h3></header>
    <div className="printer-device-body"><PrinterIllustration status={status} item={item}/><div className={`printer-status-box is-${status}`}><span className="printer-status-light"/><strong>{title}</strong><p>{message}</p>{status === 'printed' ? <progress aria-label="Pages printed" value={pagesValue(item)} max={pagesValue(item)}/> : null}</div></div>
  </section>;
}

function pagesValue(item) { return Math.max(1, jobPages(item) || 1); }

function QueueDetails({ items }) {
  const front = items[0] ? jobName(items[0]) : 'None';
  const back = items.at(-1) ? jobName(items.at(-1)) : 'None';
  return <section className="printer-panel printer-details" aria-label="Queue Details" data-front-job={front} data-back-job={back}>
    <header><h3>Queue Details</h3></header>
    <dl><div><dt>Capacity</dt><dd>3</dd></div><div><dt>Front job</dt><dd>{front}</dd></div><div><dt>Back job</dt><dd>{back}</dd></div><div><dt>Size</dt><dd>{items.length}</dd></div></dl>
  </section>;
}

function CurrentJob({ current, completed, line, duration }) {
  const name = jobName(current || completed);
  const pages = jobPages(current || completed);
  const ready = !!current && line === 5;
  const justPrinted = !!completed && line === 6;
  const active = ready;
  return <section className="printer-panel printer-current" aria-label="Current Job / Running" data-current-job={active ? name : 'none'}>
    <header><h3>Current Job / Running</h3></header>
    <div className="printer-current-body">
      {active ? <><JobCard item={current} duration={duration} location="current"/><p><strong>Ready at the printer</strong><span>{name} · {pages} pages · removed from the queue</span></p></>
        : justPrinted ? <div className="printer-current-result"><strong>{name}</strong><span>Print complete · {pages} pages recorded in output.</span></div>
          : <div className="printer-current-empty"><strong>None</strong><span>No job is at the printer.</span></div>}
    </div>
  </section>;
}

function CompletedJobs({ item, duration }) {
  return <section className="printer-panel printer-completed" aria-label="Completed Jobs" data-completed-job={item ? jobName(item) : 'none'}>
    <header><h3>Completed Jobs</h3><span>{item ? '1 job' : '0 jobs'}</span></header>
    <div className="printer-completed-body">{item ? <JobCard item={item} duration={duration} location="completed" compact rank="#1"/> : <p>No completed jobs yet.</p>}</div>
  </section>;
}

function RuntimeValues({ current, items }) {
  const queueValue = items.length ? `[ ${items.map(jobName).join(', ')} ]` : '[ ]';
  return <section className="printer-panel printer-runtime" aria-label="Runtime Values">
    <header><h3>Runtime Values</h3></header>
    <dl><div><dt>current</dt><dd data-runtime-current={current ? jobName(current) : 'none'}>{current ? jobName(current) : '—'}</dd></div><div><dt>jobs</dt><dd data-runtime-jobs={items.map(jobName).join(',')}>{queueValue}</dd></div></dl>
  </section>;
}

function ProgramOutput({ output, items, isReturn }) {
  return <section className={`printer-panel printer-output ${output.length ? 'has-output' : ''}`} aria-label="Program / Return Output" data-return-queue={isReturn ? items.map(jobName).join(',') : 'none'}>
    <header><h3>Program / Return Output</h3></header>
    <div>{output.length ? <><p>{output[0]}.</p>{isReturn ? <strong>Return: [ {items.map(jobName).join(', ')} ]</strong> : null}</> : <p>No output yet.</p>}</div>
  </section>;
}

export function PrinterQueueExecutionWorkspace({ source, event, previousEvent, state, controller, duration, Icon, motionPreference }) {
  if (!event?.frame?.lanes?.[0]) return null;
  const frame = event.frame;
  const execution = operationFor(event);
  const items = frame.lanes[0].items;
  const held = frame.held[0] || null;
  const incoming = held?.label === 'incoming job' ? held : event.source.line === 4 ? items.at(-1) : null;
  const current = held?.label === 'current job' ? held : null;
  const completed = held?.label === 'completed'
    ? held
    : previousEvent?.frame?.held?.find((item) => item.label === 'completed') || null;
  const operationJob = current || completed;
  const printerStatus = event.source.line === 5 ? 'ready' : event.source.line === 6 ? 'printed' : 'idle';
  const stepLabel = `Step ${state.index + 1} of ${state.total} · ${execution.title}`;
  return <div className="printer-queue-workbench" data-line={event.source.line} data-phase={execution.phaseIndex + 1} data-operation={execution.kind} data-queue-order={items.map(jobName).join(',')} data-printer-status={printerStatus}>
    <div className="printer-queue-left"><PseudocodePanel source={source} event={event}/><ExecutionStatus event={event} source={source} execution={execution} Icon={Icon} state={state}/><QueueConcepts/></div>
    <div className="printer-queue-right">
      <OperationHeader execution={execution}/>
      <LayoutGroup id="office-printer-queue"><div className="printer-primary-row">
        <IncomingJob item={incoming} duration={duration} line={event.source.line} queue={items}/>
        <QueueTray items={items} duration={duration} line={event.source.line}/>
        <PrinterPanel status={printerStatus} item={operationJob}/>
      </div>
      <div className="printer-secondary-row"><QueueDetails items={items}/><CurrentJob current={current} completed={completed} line={event.source.line} duration={duration}/><CompletedJobs item={completed} duration={duration}/></div>
      <div className="printer-lower-row"><RuntimeValues current={frame.markers.variables.current ? (current || completed) : null} items={items}/><ProgramOutput output={frame.output} items={items} isReturn={event.source.line === 7}/></div></LayoutGroup>
      <PhasePlayback state={state} controller={controller} event={event} execution={execution} source={source} Icon={Icon} motionPreference={motionPreference} progressLabel={stepLabel} progressValue={state.index + 1} progressMax={state.total} progressAriaLabel="Activity step progress" showPhaseProgress={false}/>
    </div>
  </div>;
}
