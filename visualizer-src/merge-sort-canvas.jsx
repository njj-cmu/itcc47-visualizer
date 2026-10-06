import React from 'react';
import { listFor, mergeModel } from './sorting-presentation.js';
import { ValueRun } from './sorting-values.jsx';

export function MergeSortCanvas({ frame }) {
  const model = mergeModel(frame);
  const original = frame.originalIds.map(id => listFor(frame, { kind: 'REFERENCE', objectId: id }));
  const consumed = model.result?.items.map(item => item.id) || [];
  const nextSlot = model.kind === 'merge' && model.result && !['RETURN_READY', 'RETURN_COMPLETE'].includes(frame.eventKind);
  return <div className="merge-sort-canvas" data-board-kind={model.kind}>
    {model.kind === 'merge' ? <>
      <div className="sort-merge-inputs">
        <ValueRun run={model.left} label="Left sorted run" pointer={model.i} pointerName="i" consumed={consumed}/>
        <ValueRun run={model.right} label="Right sorted run" pointer={model.j} pointerName="j" consumed={consumed}/>
      </div>
      <div className="sort-merge-arrow" aria-hidden="true">↓ &nbsp; copy the chosen head &nbsp; ↓</div>
      <ValueRun run={model.result} label="Merged result" nextSlot={Boolean(nextSlot)}/>
      <p className="sort-board-note">{model.result ? `Next output index = len(result) = ${model.result.items.length}. ` : 'The helper will allocate result first. '}
        Inputs stay intact. Dimmed values have already been copied; they were not popped.</p>
    </> : model.kind === 'returned' ? <>
      <ValueRun run={model.returned} label="Returned sorted run"/>
      <p className="sort-board-note">This is the actual return value of this call. The caller receives this reference; the original input below is unchanged.</p>
    </> : model.kind === 'split' ? <>
      <ValueRun run={model.values} label="Current sublist"/>
      {model.mid !== null ? <div className="sort-split-preview">
        <div><h3>Left subproblem · indices 0…{model.mid - 1}</h3><p>{model.left ? 'Returned sorted run' : 'Slice input; left result not bound yet'}</p>
          <ValueRun run={model.left || { id: model.values.id + '-left-preview', items: model.values.items.slice(0, model.mid) }} label={model.left ? 'left result' : 'Left input preview'}/></div>
        <div><h3>Right subproblem · indices {model.mid}…{model.values.items.length - 1}</h3><p>{model.right ? 'Returned sorted run' : model.left ? 'Right result not bound yet' : 'Not started'}</p>
          <ValueRun run={model.right || { id: model.values.id + '-right-preview', items: model.values.items.slice(model.mid) }} label={model.right ? 'right result' : 'Right input preview'}/></div>
      </div> : <p className="sort-board-note">{model.values.items.length <= 1 ? 'Empty and singleton lists are already sorted. The base case returns this same input reference.' : 'Find the midpoint before creating child slices.'}</p>}
      <p className="sort-board-note">Splitting creates subproblems. Both child results must return before their parent can merge.</p>
    </> : <>
      {model.result || model.returned ? <ValueRun run={model.result || model.returned} label={model.result ? 'Returned sorted result' : 'Returned list · driver assignment pending'}/>
        : <div className="sort-start-note"><h2>{original.length === 2 ? 'Combine two sorted runs' : 'Build a sorted result, one merge at a time'}</h2><p>{original.length === 2 ? 'The driver calls merge directly; it does not call merge_sort.' : 'Sort the left half, sort the right half, then combine their returned runs.'}</p></div>}
    </>}
    <div className="sort-original-strip">{original.map((run, index) => <ValueRun key={run.id} run={run} label={original.length === 1 ? 'Original input · unchanged' : (index ? 'Original right input · unchanged' : 'Original left input · unchanged')}/>)}</div>
  </div>;
}
