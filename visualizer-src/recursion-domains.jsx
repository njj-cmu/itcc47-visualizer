import React, { useRef, useState } from 'react';

function ListInput({ fixture, frame, inspectedId }) {
  const reference = fixture.inputs.values.objectId;
  const values = fixture.objects[reference].items;
  const call = frame.framesById[inspectedId];
  const index = call?.locals.index.value ?? fixture.inputs.index.value;
  return <section className="recursion-panel recursion-domain" aria-label="Shared read-only input list" data-input-reference={reference} data-selected-index={index}>
    <header><h2>Shared input list</h2><span>{reference} · read-only</span></header>
    <p>{call ? 'This call’s index' : 'Starting index'} <strong>{index}</strong> · remaining length <strong>{values.length - index}</strong></p>
    <ol className="recursion-list-input" aria-label="Input values by index">{values.map((tag, position) => <li key={position} data-list-index={position}
      className={(position < index ? 'is-before' : 'is-suffix') + (position === index ? ' is-index' : '')}>
      <small>index {position}</small><strong>{ITCC47Recursion.formatValue(tag)}</strong>
    </li>)}</ol>
    {index === values.length ? <p className="recursion-terminal-index">End of list / empty suffix · no element is accessed.</p> : null}
    <p className="recursion-domain-note">The highlight marks a suffix; it does not allocate a list. Each invocation owns its index and references this same input.</p>
  </section>;
}

function FolderInput({ fixture, frame }) {
  const [selected, setSelected] = useState(null);
  const hierarchyRef = useRef(null);
  const objects = fixture.objects;
  const root = fixture.inputs.node.objectId;
  const activeNode = frame.framesById[frame.activeCallId]?.locals.node.objectId;
  const path = new Set(frame.stack.map(id => frame.framesById[id].locals.node.objectId));
  const completed = new Set(frame.history.map(id => frame.framesById[id].locals.node.objectId));
  const inspected = selected || activeNode || root;
  function node(id) {
    const fields = objects[id].fields;
    const children = fields.children ? objects[fields.children.objectId].items : [];
    const state = id === activeNode ? 'active call' : path.has(id) ? 'current call path' : completed.has(id) ? 'completed call' : 'not called';
    return <li key={id} data-node-id={id} data-node-state={state}>
      <button type="button" aria-pressed={inspected === id} aria-label={'Inspect input node ' + fields.name.value + ', ' + id}
        onClick={() => setSelected(id)} className={id === activeNode ? 'is-active' : path.has(id) ? 'is-path' : ''}>
        <span>{fields.name.value}</span><small>{id} · {fields.kind.value === 'file' ? fields.bytes.value + ' B' : 'folder'} · {state}</small>
      </button>
      {children.length ? <ul>{children.map(child => node(child.objectId))}</ul> : null}
    </li>;
  }
  const details = objects[inspected].fields;
  return <section ref={hierarchyRef} className="recursion-panel recursion-domain" aria-label="Synthetic input hierarchy" data-input-reference={root}>
    <header><h2>Synthetic input hierarchy</h2><span>Read-only input</span></header>
    <p>The hierarchy contains all input nodes. The live stack contains one current call path; siblings run sequentially.</p>
    <div className="recursion-tree-scroll" role="region" aria-label="Scrollable synthetic hierarchy" tabIndex="0"><ul className="recursion-tree">{node(root)}</ul></div>
    <p data-input-inspection>Input inspection: {details.name.value} · {inspected}. {details.kind.value === 'file'
      ? 'File bytes: ' + details.bytes.value + '.' : 'Children: ' + objects[details.children.objectId].items.length + '.'} Inspection does not move execution.</p>
    {selected ? <button type="button" onClick={() => {
      setSelected(null);
      hierarchyRef.current?.querySelector('[data-node-id="' + (activeNode || root) + '"] > button')?.focus();
    }}>Follow current input node</button> : null}
  </section>;
}

export function RecursionDomain(props) {
  return props.frame.domain === 'list' ? <ListInput {...props}/> : props.frame.domain === 'folder' ? <FolderInput {...props}/> : null;
}
