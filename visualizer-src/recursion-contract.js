/* Classic-script optional pack: verified fixtures, never a Python interpreter. */
const ITCC47Recursion = (() => {
  const PRESETS = Object.freeze([0, 1, 3, 5]);
  const SCHEMA = 2;
  function lesson(programId) {
    const spec = ITCC47RecursionTraces.lessons?.[programId];
    if (!spec || ITCC47RecursionTraces.schemaVersion !== SCHEMA) throw new Error('Incompatible Python fixture schema. Rebuild the verified pack.');
    return spec;
  }
  function fixture(programId, selection = {}) {
    const spec = lesson(programId);
    const options = typeof selection === 'object' && selection !== null ? selection : { n: selection };
    let key;
    if (spec.domain === 'number') {
      const n = options.n ?? 3;
      if (!Number.isInteger(n) || !PRESETS.includes(n)) throw new Error('Choose a supported Python fixture: n = 0, 1, 3, or 5.');
      key = programId + ':n' + n;
    } else {
      const scenario = options.fixture ?? spec.defaultFixture;
      const variant = options.variant ?? 'correct';
      if (!spec.fixtures.some(row => row.id === scenario) || !spec.variants[variant] || (variant !== 'correct' && scenario !== 'list-main')) {
        throw new Error('Choose a declared Python fixture and repair mode.');
      }
      key = scenario + (variant === 'correct' ? '' : ':' + variant);
    }
    const item = ITCC47RecursionTraces.fixtures[key];
    if (!item || item.programId !== programId || item.schemaVersion !== SCHEMA || Hash.hex(item.source) !== item.sourceRevision) {
      throw new Error('Python source and trace do not match. Rebuild the verified fixtures.');
    }
    return BSITPlayback.deepFreeze(item);
  }
  function adapt(item) {
    if (item.schemaVersion !== SCHEMA) throw new Error('Incompatible Python fixture schema.');
    if (Hash.hex(item.source) !== item.sourceRevision) throw new Error('Python source revision mismatch.');
    if (Hash.hex(JSON.stringify(item.events)) !== item.traceRevision) throw new Error('Python trace revision mismatch.');
    if (Hash.hex(JSON.stringify(item.objects)) !== item.objectsRevision) throw new Error('Python input object revision mismatch.');
    function checkValue(tag) {
      if (!tag || !['UNBOUND', 'PENDING', 'NONE', 'INTEGER', 'BOOLEAN', 'STRING', 'REFERENCE'].includes(tag.kind)
        || (tag.kind === 'REFERENCE' && !Object.hasOwn(item.objects, tag.objectId))
        || (tag.kind === 'INTEGER' && !Number.isSafeInteger(tag.value))
        || (tag.kind === 'STRING' && typeof tag.value !== 'string')
        || (tag.kind === 'BOOLEAN' && typeof tag.value !== 'boolean')) throw new Error('Unsupported Python value or input reference.');
    }
    for (const object of Object.values(item.objects)) {
      if (!['list', 'node'].includes(object.type)) throw new Error('Unsupported Python input object.');
      Object.values(object.type === 'list' ? object.items : object.fields).forEach(checkValue);
    }
    const spec = lesson(item.programId);
    for (const event of item.events) {
      for (const call of Object.values(event.frame.framesById)) {
        Object.values(call.locals).forEach(checkValue);
        checkValue(call.returnValue); checkValue(call.pendingExpression);
      }
      Object.values(event.frame.driver.locals).forEach(checkValue);
      if (event.frame.returnTransfer) checkValue(event.frame.returnTransfer.value);
    }
    const events = item.events.map((event) => BSITPlayback.timelineEvent({
      id: event.eventId, domain: 'python-recursion', type: event.eventKind.toLowerCase(),
      source: event.source, message: event.message, frame: {
        ...event.frame, programId: item.programId, fixtureId: item.fixtureId,
        sourceRevision: item.sourceRevision, eventKind: event.eventKind,
        objects: item.objects, inputs: item.inputs, domain: spec.domain,
      },
      metrics: event.frame.metrics,
      boundary: ['CALL', 'RETURN_READY', 'ASSIGN_RESULT'].includes(event.eventKind),
      terminal: event.eventKind === 'COMPLETE' && item.outcome === 'completed',
    }));
    const success = item.outcome === 'completed' && events.at(-1)?.terminal === true;
    return BSITPlayback.runResult({
      events, outcome: success ? 'complete' : 'error',
      diagnostics: success ? [] : [{ message: events.at(-1)?.message || 'The trace did not complete.' }],
      result: { fixtureId: item.fixtureId, sourceRevision: item.sourceRevision, identity: identity(item),
        correctness: item.correctness, finalFrame: events.at(-1)?.frame },
      truncated: item.outcome === 'pedagogical-limit',
      capabilities: { visualize: true, trace: true, variables: true, edit: false },
    });
  }
  function run(programId, options = {}) {
    try { return adapt(fixture(programId, options)); }
    catch (error) {
      return BSITPlayback.runResult({ outcome: 'error', diagnostics: [{ message: error.message }], error: error.message });
    }
  }
  function predictions(item) {
    if (lesson(item.programId).domain !== 'number') return ITCC47RecursionQuestions.forFixture(item);
    const base = item.events.find((event) => event.eventKind === 'BASE_CHECK' && event.frame.annotations.baseCase);
    if (!base) return [];
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
  function identity(item) {
    return item.programId + ':' + item.fixtureId + ':' + (item.variant || 'correct') + ':v' + item.schemaVersion + ':' + item.sourceRevision + ':' + item.traceRevision;
  }
  function filename(item) {
    return item.programId + '-' + (item.programId === 'countdown' || item.programId === 'sum_to'
      ? item.fixtureId.split(':')[1] : item.fixtureId.replaceAll(':', '-')) + '.py';
  }
  function callLabel(call, objects = {}) {
    if (!call) return 'driver';
    const spec = Object.values(ITCC47RecursionTraces.lessons).find(row => row.functionName === call.functionName);
    const parameters = spec?.parameters || Object.keys(call.locals);
    return call.functionName + '(' + parameters.map(name => {
      const tag = call.locals[name];
      const label = objects[tag?.objectId]?.fields?.name?.value;
      return (label ? label + ' · ' : '') + formatValue(tag);
    }).join(', ') + ')';
  }
  function formatValue(tag) {
    if (tag?.kind === 'INTEGER') return String(tag.value);
    if (tag?.kind === 'NONE') return 'None';
    if (tag?.kind === 'PENDING') return 'PENDING · call has not completed';
    if (tag?.kind === 'UNBOUND') return 'UNBOUND · not yet assigned';
    if (tag?.kind === 'REFERENCE') return tag.objectId;
    if (tag?.kind === 'STRING') return JSON.stringify(tag.value);
    if (tag?.kind === 'BOOLEAN') return tag.value ? 'True' : 'False';
    return 'Unsupported value: ' + (tag?.kind || 'missing');
  }
  return Object.freeze({ PRESETS, lesson, fixture, adapt, run, formatValue, predictions, identity, filename, callLabel });
})();

globalThis.ITCC47Recursion = ITCC47Recursion;
