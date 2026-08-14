import React, { memo } from 'react';

/* Shared shell for later-course domains. The timeline supplies semantics; the renderer owns layout. */
export const ConceptDomainRenderer = memo(function ConceptDomainRenderer({ frame, event, activity }) {
  const values = frame?.array || [];
  const teaching = frame?.markers?.teaching;
  const activeIndex = teaching?.annotations?.find((item) => item.target?.kind === 'slot')?.target.index ?? -1;
  const domain = activity.family.toLowerCase().replace(/\W+/g, '-');
  return <div className={`concept-domain concept-domain-${domain} concept-${teaching?.variant || 'default'}`} aria-label={`${activity.title} conceptual state`}>
    {teaching ? <header><span>{teaching.title}</span>{teaching.comparison ? <strong className={`concept-outcome outcome-${teaching.comparison.outcome}`}>{teaching.comparison.text} · {String(teaching.comparison.outcome).toUpperCase()}</strong> : null}</header> : null}
    <div className="concept-stage" role="list" aria-label="Algorithm state" tabIndex="0">
      {values.map((value,index) => <React.Fragment key={`${activity.id}:${index}`}>
        <article role="listitem" className={index === activeIndex ? 'is-active' : index < activeIndex ? 'is-complete' : ''}>
          <small>{teaching?.annotations?.find((item)=>item.target?.index === index)?.label || `state ${index + 1}`}</small><strong>{String(value)}</strong>
        </article>{index < values.length - 1 ? <span className="concept-edge" aria-hidden="true">→</span> : null}
      </React.Fragment>)}
    </div>
    <footer><span>{event?.type || 'state'}</span><p>{event?.message}</p></footer>
  </div>;
});
