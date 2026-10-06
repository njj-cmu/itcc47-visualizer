import React from 'react';
import { quickModel } from './sorting-presentation.js';
import { ValueRun } from './sorting-values.jsx';

export function QuicksortCanvas({ frame, fixture }) {
  const model = quickModel(frame, fixture);
  const roles = {};
  const pointers = {};
  model.array.items.forEach((_, index) => {
    const region = model.regions.find(row => index >= row.start && index <= row.end);
    roles[index] = region ? 'region-' + region.tone : model.low !== null && (index < model.low || index > model.high) ? 'is-outside' : '';
    pointers[index] = [model.j === index && !model.partition?.scanComplete ? 'j' : '', model.i === index ? (model.partition?.pending ? 'i*' : 'i') : '',
      model.i !== null && model.i < model.low && index === model.low ? '← i' : '',
      model.partition && index === (model.partition.placed ?? model.high) ? 'pivot' : ''].filter(Boolean).join(' · ');
  });
  return <div className="quicksort-canvas">
    <div className="sort-range-heading"><h2>{model.completed ? model.helper ? 'Partition complete' : 'Sorted array' : 'One shared array'}</h2>
      <span>{model.low !== null ? `Current range [${model.low}, ${model.high}] · inclusive` : model.completed ? 'Driver context' : 'Waiting for the driver call'}</span></div>
    <ValueRun run={model.array} label="Array values" roles={roles} fixed={frame.fixed} pointers={pointers} range={model.low === null ? null : { low: model.low, high: model.high }}/>
    <div className="sort-pointer-legend">
      <span className={model.partition?.pending ? 'is-pending' : ''}>i = {model.i ?? 'not bound yet'}{model.i !== null && model.i < model.low ? ' · empty prefix before low' : model.partition?.pending ? ' · boundary target, swap pending' : ' · boundary'}</span>
      <span>j = {model.j ?? 'not bound yet'}{model.partition?.scanComplete ? ' · scan complete (indicator)' : ' · scan'}</span>
      <span>Pivot = {model.pivot ?? 'not selected'}{model.partition?.placed !== undefined ? ` · placed at ${model.partition.placed}` : model.pivot !== null ? ` · at high ${model.high}` : ''}</span>
    </div>
    {model.regions.length ? <div className="sort-regions" aria-label="Partition regions">{model.regions.map(region => <div key={region.tone} className={'sort-region region-' + region.tone}>
      <strong>{region.label}</strong><span>{region.start <= region.end ? `${region.start}…${region.end}` : 'Empty region'}</span>
    </div>)}</div> : null}
    {model.partition?.pending ? <p className="sort-pending-note">The Python local i has advanced. The colored regions retain the last committed boundary until the tuple swap completes.</p> : null}
    {model.partition?.placed !== undefined ? <p className="sort-board-note">Pivot placed for this range. Neither side is necessarily sorted. {model.helper ? 'This helper stops here.' : 'Full mode sorts the left range first, then the right. No merge follows.'}</p> : null}
    {!model.array.items.length ? <p className="sort-board-note">The empty range has no pivot and no array read.</p> : null}
    {model.completed && model.helper ? <p className="sort-completion">Partition complete; two sides remain. Returned pivot index: {frame.callResult.value}. This is not a completed sort.</p> : null}
    {model.completed && !model.helper ? <p className="sort-completion">quick_sort returned None. The driver prints the same list, now sorted in place.</p> : null}
    <p className="sort-board-note">{model.helper ? 'Positions outside the selected range stay untouched.' : 'Fixed pivots stay in place during later calls.'} Last-element pivot · Lomuto · ≤ comparison.</p>
  </div>;
}
