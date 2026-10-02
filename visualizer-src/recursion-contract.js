/* Classic-script optional pack: verified fixtures, never a Python interpreter. */
const ITCC47Recursion = (() => {
  const PRESETS = Object.freeze([0, 1, 3, 5]);
  function fixture(programId, n = 3) {
    if (!['countdown', 'sum_to'].includes(programId) || !Number.isInteger(n) || !PRESETS.includes(n)) {
      throw new Error('Choose a supported Python fixture: n = 0, 1, 3, or 5.');
    }
    const item = ITCC47RecursionTraces.fixtures[programId + ':n' + n];
    if (!item || ITCC47RecursionTraces.schemaVersion !== 1 || Hash.hex(item.source) !== item.sourceRevision) {
      throw new Error('Python source and trace do not match. Rebuild the verified fixtures.');
    }
    return BSITPlayback.deepFreeze(item);
  }
  function adapt(item) {
    if (Hash.hex(item.source) !== item.sourceRevision) throw new Error('Python source revision mismatch.');
    if (Hash.hex(JSON.stringify(item.events)) !== item.traceRevision) throw new Error('Python trace revision mismatch.');
    const events = item.events.map((event) => BSITPlayback.timelineEvent({
      id: event.eventId, domain: 'python-recursion', type: event.eventKind.toLowerCase(),
      source: event.source, message: event.message, frame: {
        ...event.frame, programId: item.programId, fixtureId: item.fixtureId,
        sourceRevision: item.sourceRevision, eventKind: event.eventKind,
      },
      metrics: event.frame.metrics,
      boundary: ['CALL', 'RETURN_READY', 'ASSIGN_RESULT'].includes(event.eventKind),
      terminal: event.eventKind === 'COMPLETE' && item.outcome === 'completed',
    }));
    const success = item.outcome === 'completed' && events.at(-1)?.terminal === true;
    return BSITPlayback.runResult({
      events, outcome: success ? 'complete' : 'error',
      diagnostics: success ? [] : [{ message: events.at(-1)?.message || 'The trace did not complete.' }],
      result: { fixtureId: item.fixtureId, sourceRevision: item.sourceRevision, finalFrame: events.at(-1)?.frame },
      truncated: item.outcome === 'pedagogical-limit',
      capabilities: { visualize: true, trace: true, variables: true, edit: false },
    });
  }
  function run(programId, options = {}) {
    try { return adapt(fixture(programId, options.n ?? 3)); }
    catch (error) {
      return BSITPlayback.runResult({ outcome: 'error', diagnostics: [{ message: error.message }], error: error.message });
    }
  }
  function predictions(item) {
    const base = item.events.find((event) => event.eventKind === 'BASE_CHECK' && event.frame.annotations.baseCase);
    const active = base.frame.framesById[base.frame.activeCallId];
    const recipient = active.parentCallId || 'driver';
    const others = recipient === 'driver' ? ['Every waiting caller', 'No context resumes'] : ['driver', 'Every waiting caller'];
    const questions = [
      { id: 'recipient', at: base.eventId,
        question: 'When the base call returns, which context receives control' + (item.programId === 'sum_to' ? ' and the value 0?' : '?'),
        options: [recipient, ...others], answer: recipient,
        explanation: 'Only ' + recipient + ' called this invocation. A base case ends one call; it does not end all waiting calls.' },
      { id: 'locals', at: base.eventId,
        question: item.programId === 'sum_to' ? 'Before the base call returns, what is the state of waiting child_total bindings?' : 'What happens to n in a waiting caller?',
        options: item.programId === 'sum_to' ? ['UNBOUND until its own child returns', '0 in every caller', 'None in every caller'] : ['It keeps its own value', 'It decreases with every child', 'It disappears at the base case'],
        answer: item.programId === 'sum_to' ? 'UNBOUND until its own child returns' : 'It keeps its own value',
        explanation: item.programId === 'sum_to' ? 'The right-hand call must finish before assignment. With n = 0 there are no waiting function callers; the driver answer is still UNBOUND.' : 'A child binds its own parameter n. That does not reassign the parent’s n.' },
    ];
    if (item.programId === 'sum_to') {
      const assigned = item.events.find((event) => event.eventKind === 'ASSIGN_RESULT');
      const next = item.events[item.events.indexOf(assigned) + 1];
      const call = assigned.frame.framesById[assigned.frame.activeCallId];
      const answer = call ? formatValue(next.frame.framesById[call.callId].locals.total) : 'Print the driver answer';
      questions.push({ id: 'next-result', at: assigned.eventId,
        question: call ? 'The caller has received child_total. What value does its next total assignment produce?' : 'The driver has received answer = 0. What happens next?',
        options: call ? [answer, 'Return the child value unchanged', 'None'] : [answer, 'Create another recursive call', 'Print from every completed frame'],
        answer, explanation: call ? 'Use this caller’s own n and the child_total now bound in its frame. The next LOCAL_UPDATE records the actual Python addition.'
          : 'The driver alone executes print(answer); a return does not print by itself.' });
    } else {
      const resumed = item.events.find((event) => event.eventKind === 'RETURN_TRANSFER');
      const answer = resumed.frame.activeCallId ? 'Print leave using the resumed caller’s n' : 'Finish the driver without printing';
      questions.push({ id: 'next-statement', at: resumed.eventId, question: 'The base call has returned. What happens next?',
        options: [answer, 'Restart at the function definition', 'Change n in every waiting frame'], answer,
        explanation: 'Control continues after the suspended call site. For n = 0 the base invocation returns directly to the driver with no output.' });
    }
    return questions;
  }
  function formatValue(tag) {
    if (tag?.kind === 'INTEGER') return String(tag.value);
    if (tag?.kind === 'NONE') return 'None';
    if (tag?.kind === 'PENDING') return 'PENDING · call has not completed';
    return 'UNBOUND · not yet assigned';
  }
  return Object.freeze({ PRESETS, fixture, adapt, run, formatValue, predictions });
})();

globalThis.ITCC47Recursion = ITCC47Recursion;
