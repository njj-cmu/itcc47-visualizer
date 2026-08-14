import React, { memo } from 'react';
import { AnimatePresence, m } from 'motion/react';

function pointerLabels(lane, itemId) {
  const labels = [];
  const first = lane.items[0]?.id;
  const last = lane.items.at(-1)?.id;
  if (lane.kind === 'stack' && itemId === last) labels.push('top');
  if (lane.kind !== 'stack' && itemId === first) labels.push('front');
  if (lane.kind !== 'stack' && itemId === last) labels.push('back');
  return labels;
}

const TeachingPanel = memo(function TeachingPanel({ teaching }) {
  if (!teaching) return null;
  return <section className="linear-teaching" aria-label={`${teaching.title} teaching context`}>
    <div><span>Current idea</span><h2>{teaching.title}</h2></div>
    <div className="linear-teaching-facts">
      {(teaching.annotations || []).map((item) => <p className={`tone-${item.tone || 'primary'}`} key={item.id}><span>{item.label}</span><strong>{String(item.value)}</strong></p>)}
      {(teaching.status || []).map((item) => <p className={`tone-${item.tone || 'muted'}`} key={item.id}><span>{item.label}</span><strong>{String(item.value)}</strong></p>)}
      {teaching.comparison ? <p className={`linear-comparison outcome-${teaching.comparison.outcome}`}><span>{teaching.comparison.text}</span><strong>{teaching.comparison.outcome ? 'TRUE' : 'FALSE'}</strong></p> : null}
    </div>
  </section>;
});

const LinearLane = memo(function LinearLane({ lane, teaching, duration, onEntityComplete }) {
  const active = new Map((teaching?.annotations || []).filter((item) => item.target?.kind === 'entity').map((item) => [item.target.id, item.tone || 'primary']));
  const visibleItems = lane.kind === 'stack' ? [...lane.items].reverse() : lane.items;
  return <section className={`linear-lane lane-${lane.kind}`} aria-label={lane.label}>
    <header><span>{lane.kind}</span><strong>{lane.label}</strong><em>{lane.items.length} item{lane.items.length === 1 ? '' : 's'}</em></header>
    <div className="linear-lane-body">
      {lane.kind !== 'stack' ? <span className="linear-end-label end-front">front</span> : null}
      <div className="linear-items" role="list" aria-label={`${lane.label} items`} tabIndex="0">
        <AnimatePresence initial={false}>
          {visibleItems.map((item) => <m.article
            layout
            layoutId={`linear:${lane.id}:${item.id}`}
            role="listitem"
            className={`linear-item ${active.has(item.id) ? `is-active tone-${active.get(item.id)}` : ''}`}
            key={item.id}
            transition={{ duration }}
            onLayoutAnimationComplete={() => onEntityComplete?.(item.id)}
          >
            <div className="linear-pointer-row">{pointerLabels(lane, item.id).map((label) => <span key={label}>{label}</span>)}</div>
            <strong>{String(item.value)}</strong>
            {item.detail ? <small>{item.detail}</small> : null}
          </m.article>)}
        </AnimatePresence>
        {!visibleItems.length ? <p className="linear-empty" role="listitem">empty</p> : null}
      </div>
      {lane.kind !== 'stack' ? <span className="linear-end-label end-back">back</span> : <span className="linear-stack-base">stack base</span>}
    </div>
  </section>;
});

export const LinearADTRenderer = memo(function LinearADTRenderer({ frame, event, activity, duration = 0.25, onEntityComplete }) {
  const teaching = frame?.markers?.teaching;
  const heldTargets = new Map((teaching?.annotations || []).filter((item) => item.target?.kind === 'held').map((item) => [item.target.id, item.tone || 'primary']));
  const input = frame?.input;
  const held = frame?.held || [];
  const output = frame?.output || [];
  return <div className={`linear-adt linear-adt-${frame?.structure || 'queue'} linear-variant-${activity.teachingVariant}`} aria-label={`${activity.title} state`}>
    <TeachingPanel teaching={teaching}/>
    <div className="linear-scenario-row">
      {input ? <section className="linear-input" aria-label={input.label}>
        <span>{input.label}</span>
        <div role="list">{input.tokens.map((token, index) => <strong role="listitem" className={index === input.active ? 'is-active' : index < input.active || input.active === -1 ? 'is-consumed' : ''} key={`${token}:${index}`}>{String(token)}</strong>)}</div>
      </section> : <div/>}
      <div className={`linear-operation operation-${frame?.operation?.end || 'none'}`} aria-label="Current operation"><span>Operation</span><strong>{frame?.operation?.label || event?.type || 'state'}</strong></div>
    </div>
    <div className={`linear-lanes ${frame?.lanes?.length > 1 ? 'has-multiple' : ''}`}>
      {(frame?.lanes || []).map((lane) => <LinearLane lane={lane} teaching={teaching} duration={duration} onEntityComplete={onEntityComplete} key={lane.id}/>)}
    </div>
    <div className="linear-results-row">
      <section className="linear-held" aria-label="Held values">
        <span>Outside the structure</span>
        <div>{held.length ? held.map((item) => <m.p layout className={`tone-${heldTargets.get(item.id) || item.tone || 'primary'}`} key={item.id}><small>{item.label}</small><strong>{String(item.value)}</strong></m.p>) : <em>Nothing is currently held.</em>}</div>
      </section>
      <section className="linear-output" aria-label="Scenario output"><span>Output so far</span><strong>{output.length ? output.join(' · ') : '—'}</strong></section>
    </div>
  </div>;
});
