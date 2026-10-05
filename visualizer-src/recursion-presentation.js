/* Pure view derivation. Invocation state and playback remain owned by the trace. */
const ITCC47RecursionPresentation = (() => {
  function derive(event, selected = null) {
    const frame = event.frame;
    const explicit = Boolean(selected && frame.framesById[selected]);
    const inspectedId = explicit ? selected : frame.activeCallId || frame.stack[0] || null;
    const call = frame.framesById[inspectedId] || null;
    const kind = frame.eventKind || event.eventKind;
    const transfer = frame.returnTransfer;
    const originId = event.source?.ownerCallId || (kind === 'RETURN_COMPLETE' ? transfer?.childCallId : frame.activeCallId) || 'driver';
    const origin = event.source ? { callId: originId, line: event.source.line } : null;
    const common = { inspectedId, explicit, origin, executingId: frame.activeCallId, line: null, returnOrigin: null };
    const view = (mode, heading, label, line, status) => Object.freeze({ ...common, mode, heading, label, line, status });

    // A history selection is explicit. Empty-stack defaults never select history.
    if (call?.status === 'COMPLETE') return view('completed-history', 'Completed call · history',
      'Returned from line ', call.returnLine, 'Inspecting completed call · ' + inspectedId + ' · playback is unchanged');

    const stopped = ['runtime-error', 'pedagogical-limit'].includes(frame.outcome)
      || ['ERROR', 'LIMIT_STOP'].includes(kind)
      || (call && !['RUNNING', 'RETURNING', 'WAITING'].includes(call.status));
    if (stopped) return view('stopped', 'Stopped execution', 'Stopped snapshot at line ', call?.lastLine || null,
      (frame.outcome === 'pedagogical-limit' ? 'Teaching limit reached' : frame.outcome === 'runtime-error' ? 'Runtime error' : 'Unavailable execution state')
      + ' · no function is running and no return is being transferred');

    if (!call) {
      const complete = kind === 'COMPLETE' || frame.driver.status === 'COMPLETE';
      return view(complete ? 'driver-complete' : 'driver-execution', complete ? 'Driver complete' : 'Driver execution',
        transfer ? 'Driver call site at line ' : 'Driver instruction at line ', complete ? null : transfer?.callSite || event.source?.line || null,
        complete ? 'The function stack is empty. Execution has ended.' : 'The driver is separate from the function stack.');
    }

    const handoff = ['RETURN_COMPLETE', 'RETURN_TRANSFER'].includes(kind)
      && transfer && transfer.callerCallId === inspectedId
      && ['popped', 'delivered'].includes(transfer.stage)
      && frame.history.includes(transfer.childCallId);
    if (handoff) return Object.freeze({
      ...view('return-handoff', 'Executing now', 'Caller resumes its call site at line ', transfer.callSite,
        transfer.stage === 'popped' ? 'Return handoff · no function is executing' : 'Return delivered · caller assignment has not executed yet'),
      returnOrigin: { callId: transfer.childCallId, line: frame.framesById[transfer.childCallId].returnLine },
    });
    if (call.status === 'WAITING') return view('waiting-inspection', 'Executing now', 'Paused at line ', call.suspendedCallSite,
      'Inspecting waiting call · ' + inspectedId + ' · execution stays with ' + (frame.activeCallId || 'the handoff / driver'));
    if (call.status === 'RETURNING') return view('return-preparation', 'Executing now', 'Returning from line ', call.returnLine,
      'Top of stack · returning now · ' + inspectedId + ' · frame is still live');
    return view('live-execution', 'Executing now', 'Running line ', event.source?.line,
      'Top of stack · executing now · ' + inspectedId);
  }
  return Object.freeze({ derive });
})();
globalThis.ITCC47RecursionPresentation = ITCC47RecursionPresentation;
