import React, { useLayoutEffect, useRef } from 'react';

export function ValueRun({ run, label, pointer = null, pointerName, consumed = [], roles = {}, fixed = {}, pointers = null, range = null, empty = 'Empty list', nextSlot = false }) {
  if (!run) return <section className="sort-run"><h3>{label}</h3><p className="sort-empty">Not bound yet</p></section>;
  return <section className="sort-run" data-container-id={run.id} aria-label={label}>
    <div className="sort-run-heading"><h3>{label}</h3>{pointerName ? <span>{pointerName} = {pointer === null ? 'not bound yet' : pointer}{pointer === run.items.length ? ' · exhausted' : ''}</span> : null}</div>
    <div className="sort-run-scroll" tabIndex="0" aria-label={label + ' values and indices'}>
      {range && range.low <= range.high ? <div className="sort-range-bracket" style={{ '--slots': run.items.length }} aria-label={`Active inclusive range ${range.low} through ${range.high}`}>
        <span style={{ gridColumn: `${range.low + 1} / span ${range.high - range.low + 1}` }}>{range.low}…{range.high}</span>
      </div> : null}
      {pointers ? <div className="sort-pointer-row" style={{ '--slots': Math.max(1, run.items.length) }}>{run.items.map((item, index) => <span key={index}>{pointers[index] || ''}</span>)}</div> : null}
      <div className="sort-track" style={{ '--slots': Math.max(1, run.items.length + (nextSlot ? 1 : 0)) }}>
        {run.items.map((item, index) => <div className={'sort-slot ' + (consumed.includes(item.id) ? 'is-consumed ' : '') + (pointer === index ? 'is-head ' : '') + (roles[index] || '')}
          key={run.id + ':' + item.id} data-item-id={item.id} data-index={index} aria-label={`${item.value}${item.label ? ', occurrence ' + item.label : ''}, index ${index}${consumed.includes(item.id) ? ', already read' : ''}${fixed[index] ? ', fixed pivot or singleton' : ''}`}>
          <div className="sort-value" data-motion-item={run.id + ':' + item.id}><strong>{item.value}</strong>{item.label ? <small>{item.label}</small> : null}{fixed[index] ? <span className="sort-fixed" aria-hidden="true">✓</span> : null}</div>
        </div>)}
        {nextSlot ? <div className="sort-next-slot" aria-label={'Next output index ' + run.items.length}>+</div> : null}
        {!run.items.length && !nextSlot ? <span className="sort-empty">{empty}</span> : null}
      </div>
      <div className="sort-indices" aria-hidden="true" style={{ '--slots': Math.max(1, run.items.length + (nextSlot ? 1 : 0)) }}>
        {run.items.map((item, index) => <span key={index}>{index}</span>)}{nextSlot ? <span>{run.items.length}</span> : null}
      </div>
    </div>
  </section>;
}

export function useValueMotion(ref, event, state, mode, duration, onComplete) {
  const previous = useRef(new Map());
  useLayoutEffect(() => {
    const elements = [...(ref.current?.querySelectorAll('[data-motion-item]') || [])].filter(node => !node.closest('.sort-original-strip'));
    const rectangles = new Map(elements.map(node => [node.dataset.motionItem, node.getBoundingClientRect()]));
    const animations = [];
    let live = true;
    if (mode === 'on' && duration > 0 && state.transitioning && state.direction > 0) {
      for (const move of event?.transition?.moves || []) {
        const node = elements.find(element => element.dataset.motionItem === move.entityId);
        const target = rectangles.get(move.entityId);
        let origin = previous.current.get(move.entityId);
        if (!origin && event.frame.operation?.sourceContainer) {
          origin = previous.current.get(event.frame.operation.sourceContainer + ':' + event.frame.operation.itemId);
        }
        if (!node || !target || !origin) { onComplete(move.entityId); continue; }
        let moving = node;
        let restore = () => {};
        if (event.frame.eventKind === 'APPEND_VALUE') {
          // A copied reference flies between separate scroll containers. Keep
          // the source intact and escape the result row's clipping boundary.
          moving = node.cloneNode(true);
          moving.removeAttribute('data-motion-item');
          moving.classList.add('sort-motion-ghost');
          moving.setAttribute('aria-hidden', 'true');
          const style = getComputedStyle(node), oldOpacity = node.style.opacity;
          Object.assign(moving.style, { position: 'fixed', left: target.x + 'px', top: target.y + 'px',
            width: target.width + 'px', height: target.height + 'px', margin: '0', zIndex: '1000', pointerEvents: 'none',
            color: style.color, background: style.backgroundColor, borderColor: style.borderColor });
          document.body.appendChild(moving);
          node.style.opacity = '0';
          restore = () => { node.style.opacity = oldOpacity; moving.remove(); };
        }
        const animation = moving.animate([
          { transform: `translate(${origin.x - target.x}px, ${origin.y - target.y}px)`, opacity: .75 },
          { transform: 'translate(0, 0)', opacity: 1 },
        ], { duration: duration * 1000, easing: 'cubic-bezier(.2,.7,.2,1)' });
        animations.push({ animation, restore });
        animation.finished.then(() => { restore(); if (live) onComplete(move.entityId); }, () => {});
      }
    }
    previous.current = rectangles;
    return () => { live = false; animations.forEach(({ animation, restore }) => { animation.cancel(); restore(); }); };
  }, [event, state.transitionToken, state.transitioning, state.direction, mode, duration, onComplete, ref]);
}
