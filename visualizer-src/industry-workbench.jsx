import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import './industry-workbench.css';

const isOpenState = (state) => state === 'available' || state === 'current';
const complexityLabel = (scenario) => scenario.complexity.worst;
const factValue = (value) => typeof value === 'number' ? value.toLocaleString() : String(value);
const humanizeKey = (key) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());

function PreviewIndicator() {
  const profile = ITCC47Curriculum.activeProfile(ITCC47CurriculumUI.previewOptions());
  return profile.preview ? <span className="industry-preview-indicator">Instructor preview</span> : null;
}

const DatasetPreview = memo(function DatasetPreview({ scenario }) {
  const dataset = ITCC47IndustryWorkbench.dataset;
  const records = scenario.previewIndices.slice(0, 4).map((index) => ({ index, record: dataset.recordAt(scenario.datasetView, index) }));
  return <div className="industry-scenario-preview" aria-label={`${scenario.datasetView} dataset preview`}>
    {records.map(({ index, record }) => <p key={`${scenario.id}:${index}`}><span>{index.toLocaleString()}</span><strong>{record.ticketId}</strong><em>{record.priority}</em><small>{record.status}</small></p>)}
  </div>;
});

function ScenarioHub({ Icon }) {
  const scenarios = useMemo(() => ITCC47IndustryWorkbench.listScenarios(), []);
  const options = ITCC47CurriculumUI.previewOptions();
  const releases = useMemo(() => new Map(scenarios.map((scenario) => [scenario.id, ITCC47Curriculum.stateForResource('activity', scenario.id, options)])), [scenarios, options.preview]);
  const anyOpen = scenarios.some((scenario) => isOpenState(releases.get(scenario.id)?.state));
  return <main className="industry-hub" aria-labelledby="industry-hub-title">
    <a className="industry-back-link" href={ITCC47CurriculumUI.href('problems.html?view=workbenches')}><Icon name="back" size={16}/>Workbench samples</a>
    <header className="industry-hub-heading"><div><h1 id="industry-hub-title">Industry Data Workbench</h1><p>Use one shared support dataset to see why different questions need different techniques.</p></div><PreviewIndicator/></header>
    <section className="industry-how" aria-label="How it works"><strong>How it works</strong><ol><li><span>1</span>Choose a scenario</li><li><Icon name="arrow" size={18}/></li><li><span>2</span>Inspect compressed records</li><li><Icon name="arrow" size={18}/></li><li><span>3</span>Follow the algorithm</li></ol></section>
    <section className="industry-dataset-band" aria-labelledby="industry-dataset-title">
      <Icon name="database" size={27}/><div><h2 id="industry-dataset-title">Shared dataset: Support Operations</h2><p>12,400 support tickets</p></div>
      <div><strong>ticket ID · priority · opened at · category · status · SLA</strong><p>Stable ticket IDs persist across arrival-order, priority-sorted, and manual-review views.</p></div>
    </section>
    <div className="industry-scenario-list" aria-label="Industry dataset scenarios">
      {scenarios.map((scenario) => {
        const release = releases.get(scenario.id);
        const open = isOpenState(release.state);
        return <article className={`industry-scenario-row release-item-${release.state}`} key={scenario.id}>
          {open ? <DatasetPreview scenario={scenario}/> : <div className="industry-scenario-locked-preview" aria-hidden="true"><Icon name="lock" size={22}/><span>Dataset remains closed until release</span></div>}
          <div className="industry-scenario-copy"><h2>{scenario.title}</h2><span>{ITCC47IndustryWorkbench.dataset.views[scenario.datasetView].label}</span><p>{scenario.question}</p></div>
          <div className="industry-scenario-algorithm"><strong>{scenario.algorithm}</strong><span><Icon name="clock" size={18}/>{complexityLabel(scenario)}</span></div>
          <a className={`industry-scenario-action${open ? ' is-primary' : ''}`} href={ITCC47CurriculumUI.href(`industry-workbench.html?scenario=${encodeURIComponent(scenario.id)}`)}>{open ? 'Open scenario' : 'View requirements'}<Icon name="arrow" size={17}/></a>
        </article>;
      })}
    </div>
    {!anyOpen ? <p className="industry-release-note"><Icon name="lock" size={16}/>Scenario metadata is visible now. Records and timelines open together at Industry data integration.</p> : null}
  </main>;
}

function summaryFor(scenario) {
  const common = [{ label: 'Dataset', value: scenario.id.includes('review-queue') ? '2,048 review tickets' : '12,400 tickets', icon: 'database' }];
  if (scenario.id.includes('sla-breach')) return [...common, { label: 'View', value: 'arrival order', icon: 'key' }, { label: 'Target', value: 'first SLA breach', icon: 'target' }, { label: 'Algorithm', value: 'Linear search', icon: 'algorithm' }];
  if (scenario.id.includes('priority-range')) return [...common, { label: 'Sorted view', value: 'priority, then arrival', icon: 'key' }, { label: 'Target', value: 'P2', icon: 'target' }, { label: 'Algorithm', value: 'Lower + upper bound', icon: 'algorithm' }];
  if (scenario.id.includes('stable-priority')) return [...common, { label: 'Sorted view', value: 'priority, then arrival', icon: 'key' }, { label: 'Incoming', value: 'TCK-NEW-P2', icon: 'target' }, { label: 'Algorithm', value: 'Stable insertion', icon: 'algorithm' }];
  return [...common, { label: 'View', value: 'manual review', icon: 'key' }, { label: 'Indexes', value: 'insert 640 · remove 1,520', icon: 'target' }, { label: 'Algorithm', value: 'Indexed mutation', icon: 'algorithm' }];
}

function headingFor(scenario, frame) {
  const current = frame?.phase?.steps?.find((step) => step.state === 'current')?.label;
  if (scenario.id.includes('priority-range') && frame?.phase?.index === 1) return 'Find the first P2 ticket';
  if (scenario.id.includes('priority-range') && frame?.phase?.index === 2) return 'Find the after-last P2 position';
  return current || scenario.title;
}

function inRanges(index, ranges = []) {
  return ranges.some(([start, end]) => index >= start && index <= end);
}

function gapState(token, frame) {
  const discarded = (frame.discardedRanges || []).some(([start, end]) => token.start >= start && token.end <= end);
  const active = frame.activeRange && token.end >= frame.activeRange[0] && token.start <= frame.activeRange[1];
  return discarded ? 'is-discarded' : active ? 'is-active-range' : '';
}

function RecordRail({ frame, inspectedIndex, pinnedIndex, setPreviewIndex, setPinnedIndex, onCloseInspector }) {
  const recordTokens = frame.tokens.filter((token) => token.kind === 'record');
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') { onCloseInspector(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll('[data-record-button]')];
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : Math.max(0, Math.min(buttons.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)));
    buttons[next]?.focus();
  }, [onCloseInspector]);
  return <>
    <div className="industry-record-rail" role="list" aria-label={`${frame.view.label} compressed record rail`} onKeyDown={handleKeyDown}>
      {frame.tokens.map((token) => {
        if (token.kind === 'gap') return <div role="listitem" className={`industry-gap ${gapState(token, frame)}`} key={token.id} title={`${token.start.toLocaleString()} through ${token.end.toLocaleString()}: ${token.reason}`}><span>•••</span><small>{token.count.toLocaleString()} records</small></div>;
        if (token.kind === 'hole') return <div role="listitem" className="industry-record is-hole" key={token.id}><span>{token.index.toLocaleString()}</span><strong>OPEN</strong><em>{token.label}</em></div>;
        const pointers = frame.pointers.filter((pointer) => pointer.index === token.index);
        const discarded = inRanges(token.index, frame.discardedRanges);
        const scanned = frame.scannedRange && token.index >= frame.scannedRange[0] && token.index <= frame.scannedRange[1];
        const selected = inspectedIndex === token.index;
        return <div role="listitem" className="industry-record-slot" key={token.id}><button type="button" data-record-button data-record-index={token.index}
          className={`industry-record role-${token.role}${discarded ? ' is-discarded' : ''}${scanned ? ' is-scanned' : ''}${selected ? ' is-selected' : ''}`}
          onMouseEnter={() => setPreviewIndex(token.index)} onMouseLeave={() => setPreviewIndex(null)}
          onFocus={() => setPreviewIndex(token.index)} onBlur={(event) => { if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget)) setPreviewIndex(null); }}
          onClick={() => setPinnedIndex((current) => current === token.index ? null : token.index)} aria-pressed={pinnedIndex === token.index} aria-label={`Index ${token.index}, ${token.record.ticketId}, ${frame.keyField} ${token.key}`}>
          {pointers.length ? <span className="industry-record-pointers">{pointers.map((pointer) => <small className={`tone-${pointer.tone}`} key={pointer.id}>{pointer.label}</small>)}</span> : null}
          <span>{token.index.toLocaleString()}</span><strong>{token.record.ticketId}</strong><em>{String(token.key)}</em><small>{token.record.openedAt.slice(5)}</small>
        </button></div>;
      })}
    </div>
    <div className="industry-rail-caption"><span>{recordTokens.length} representative records shown</span>{frame.activeRange ? <strong>active range: {frame.activeRange[0].toLocaleString()} … {frame.activeRange[1].toLocaleString()}</strong> : <strong>complete logical view: {frame.logicalLength.toLocaleString()} positions</strong>}</div>
  </>;
}

function RecordInspector({ record, onClose, Icon }) {
  if (!record) return null;
  const fields = [
    ['ticketID', record.ticketId], ['priority', record.priority], ['openedAt', record.openedAt], ['category', record.category],
    ['status', record.status], ['SLA', record.sla], ['customer tier', record.customerTier],
  ];
  return <section className="industry-record-inspector" aria-label={`Pinned record ${record.ticketId}`}>
    {fields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
    <button type="button" onClick={onClose} aria-label="Close record details"><Icon name="close" size={18}/></button>
  </section>;
}

function IndustryWorkbench({ scenario, Icon, usePlaybackHook, IntegratedPlaybackComponent, useMotionPreferenceHook, useTransitionBoundaryHook, motionDurationForSpeed }) {
  const controller = useMemo(() => BSITPlayback.createController({ speed: 6, delayForSpeed: (speed) => 1250 - speed * 110 }), []);
  const playback = usePlaybackHook(controller);
  const motionPreference = useMotionPreferenceHook();
  const result = useMemo(() => scenario.run(), [scenario]);
  const event = result.events[playback.index] || result.events[0];
  const frame = event?.frame;
  const onEntityComplete = useTransitionBoundaryHook({ state: playback, event, controller, mode: motionPreference.mode });
  const [previewIndex, setPreviewIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);

  useEffect(() => { controller.load(result.events); }, [controller, result]);
  useEffect(() => () => controller.dispose(), [controller]);
  const visibleRecordIndexes = useMemo(() => new Set((frame?.tokens || []).filter((token) => token.kind === 'record').map((token) => token.index)), [frame]);
  useEffect(() => {
    setPreviewIndex(null);
    setPinnedIndex((current) => current != null && visibleRecordIndexes.has(current) ? current : null);
  }, [event?.id, visibleRecordIndexes]);

  const inspectedIndex = pinnedIndex ?? previewIndex;
  const inspectedToken = frame?.tokens?.find((token) => token.kind === 'record' && token.index === inspectedIndex);
  const inspectedRecord = inspectedToken?.record || null;
  const summary = summaryFor(scenario);
  const metricEntries = scenario.metrics.map((metric) => ({ ...metric, value: event?.metrics?.[metric.key] ?? 0 }));
  const invariantEntries = Object.entries(frame?.invariants || {});
  const closeInspector = useCallback(() => { setPinnedIndex(null); setPreviewIndex(null); }, []);

  return <main className={`industry-workbench industry-motion-${motionPreference.mode}`} style={{ '--industry-transition-duration': `${motionDurationForSpeed(playback.speed)}s` }} aria-labelledby="industry-workbench-title">
    <a className="industry-back-link" href={ITCC47CurriculumUI.href('industry-workbench.html')}><Icon name="back" size={16}/>Industry Data Workbench</a>
    <header className="industry-workbench-heading"><div><h1 id="industry-workbench-title">{scenario.title}</h1><p>{scenario.id.includes('priority-range') ? 'Find the complete P2 priority band in 12,400 support tickets.' : scenario.subtitle}</p></div><PreviewIndicator/></header>
    <section className="industry-summary" aria-label="Scenario summary">{summary.map((item) => <div key={item.label}><Icon name={item.icon} size={23}/><span>{item.label}</span><strong>{item.value}</strong></div>)}</section>
    <section className="industry-teaching-panel" aria-labelledby="industry-teaching-title">
      <header className="industry-teaching-heading"><h2 id="industry-teaching-title">{headingFor(scenario, frame)}</h2><p aria-live="polite">{event?.message}</p></header>
      <ol className="industry-phase-rail" aria-label="Scenario phases">{frame.phase.steps.map((step, index) => <li className={`is-${step.state}`} key={step.id}><span>{step.state === 'complete' ? <Icon name="check" size={15}/> : index + 1}</span>{step.label}</li>)}</ol>
      {frame.held.length ? <div className="industry-held-row" aria-label="Held records">{frame.held.map((held) => <article key={held.ticketId}><span>{held.label}</span><strong>{held.ticketId}</strong><em>{held.priority}</em></article>)}</div> : null}
      <RecordRail frame={frame} inspectedIndex={inspectedIndex} pinnedIndex={pinnedIndex} setPreviewIndex={setPreviewIndex} setPinnedIndex={setPinnedIndex} onCloseInspector={closeInspector}/>
      <RecordInspector record={inspectedRecord} onClose={closeInspector} Icon={Icon}/>
      {frame.operationSpan ? <div className="industry-operation-span"><Icon name="compress" size={18}/><strong>{frame.operationSpan.count.toLocaleString()} repeated operations compressed</strong><span>indexes {frame.operationSpan.start.toLocaleString()}…{frame.operationSpan.end.toLocaleString()} · {frame.operationSpan.reason}</span></div> : null}
      {frame.transition ? <div className="industry-transition" onAnimationEnd={() => onEntityComplete(frame.transition.entityId)}><span>shift source <strong>{frame.transition.from.toLocaleString()}</strong></span><Icon name="arrow" size={18}/><span>destination <strong>{frame.transition.to.toLocaleString()}</strong></span></div> : null}
      {frame.comparison ? <div className={`industry-comparison outcome-${frame.comparison.outcome}`}><code>{frame.comparison.text}</code><Icon name="arrow" size={16}/><strong>{String(frame.comparison.outcome).toUpperCase()}</strong></div> : null}
      <div className="industry-facts">{frame.facts.map((fact) => <div className={`tone-${fact.tone || 'default'}`} key={fact.label}><span>{fact.label}</span><strong>{factValue(fact.value)}</strong></div>)}</div>
      <div className="industry-state-evidence">
        <section aria-label="Operation metrics"><span>Metrics</span>{metricEntries.map((metric) => <strong key={metric.key}>{metric.short} <em>{factValue(metric.value)}</em></strong>)}</section>
        <section aria-label="Current invariants"><span>Invariants</span>{invariantEntries.map(([key, value]) => <strong className={value === false ? 'is-open' : 'is-valid'} key={key}>{humanizeKey(key)} <em>{typeof value === 'boolean' ? (value ? 'holds' : 'open') : factValue(value)}</em></strong>)}</section>
      </div>
      <IntegratedPlaybackComponent state={playback} controller={controller} event={event} motionPreference={motionPreference}/>
    </section>
    <footer className="industry-complexity"><span>Time <strong>{scenario.complexity.worst}</strong></span><i aria-hidden="true">·</i><span>Extra space <strong>{scenario.complexity.space}</strong></span><i aria-hidden="true">·</i><span>Stable ticket IDs preserved</span></footer>
  </main>;
}

export function IndustryWorkbenchApp({ Icon, usePlaybackHook, IntegratedPlaybackComponent, useMotionPreferenceHook, useTransitionBoundaryHook, motionDurationForSpeed }) {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const scenarioId = params.get('scenario');
  if (!scenarioId) return <ScenarioHub Icon={Icon}/>;
  const scenario = ITCC47IndustryWorkbench.getScenario(scenarioId);
  const release = ITCC47Curriculum.stateForResource('activity', scenarioId, ITCC47CurriculumUI.previewOptions());
  if (!scenario || !isOpenState(release.state)) {
    const title = release.resource?.title || scenario?.title || 'Industry Data Workbench scenario';
    return <main className="visualizer-locked" dangerouslySetInnerHTML={{ __html: ITCC47CurriculumUI.lockedPanel(release, { title: `${title} is coming later` }) }}/>;
  }
  return <IndustryWorkbench scenario={scenario} Icon={Icon} usePlaybackHook={usePlaybackHook} IntegratedPlaybackComponent={IntegratedPlaybackComponent} useMotionPreferenceHook={useMotionPreferenceHook} useTransitionBoundaryHook={useTransitionBoundaryHook} motionDurationForSpeed={motionDurationForSpeed}/>;
}
