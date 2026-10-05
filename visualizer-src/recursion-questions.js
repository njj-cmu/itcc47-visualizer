/* Questions select observed semantic events; they never alter execution state. */
const ITCC47RecursionQuestions = (() => {
  const format = tag => ITCC47Recursion.formatValue(tag);
  function question(id, event, text, answer, alternatives, explanation) {
    return { id, at: event.eventId, question: text, answer, options: [...new Set([answer, ...alternatives])], explanation };
  }
  function repairTarget(item) {
    return item.events.find(event => {
      const call = event.frame.framesById[event.frame.activeCallId];
      if (item.variant === 'wrong_base') return event.eventKind === 'RETURN_READY';
      if (item.variant === 'missing_combine') return event.eventKind === 'RETURN_READY' && call?.locals.total.kind === 'INTEGER';
      if (item.variant === 'print_instead_of_return') return event.eventKind === 'PRINT' && Boolean(call);
      return event.eventKind === 'CALL' && Boolean(call?.parentCallId);
    });
  }
  function repairQuestions(item, spec) {
    const repair = spec.variants[item.variant];
    const target = repairTarget(item);
    if (!target) throw new Error('The repair target is missing from this verified trace.');
    const first = target.source.code.trim() + ' · ' + (target.frame.activeCallId || 'driver');
    const final = item.events.at(-1);
    const consequence = item.outcome === 'completed' ? 'Execution completes and prints ' + final.frame.stdout.trim() + ', violating the promised sum'
      : item.outcome === 'runtime-error' ? 'The caller receives None; its addition raises TypeError' : 'The same index repeats until the teaching guard stops the run';
    return [
      question('first-divergence', target, 'Which is the first transition that breaks the recursive design?', first,
        ['Only the final driver print is wrong', 'Every function entry is wrong'], repair.explanation),
      question('consequence', target, 'What follows from this mistake?', consequence,
        ['Printing automatically returns the same value', 'The caller already has the corrected result 14'], repair.explanation),
      question('repair', target, 'Which change repairs the violated rule?', repair.repair,
        ['Change only the displayed result', 'Skip the child and keep its old binding'], 'Repair the rule: ' + repair.rule + '. Select Correct example above to inspect the separately verified corrected trace.'),
    ];
  }
  function forFixture(item) {
    const spec = ITCC47Recursion.lesson(item.programId);
    if (item.variant && item.variant !== 'correct') return repairQuestions(item, spec);
    const events = item.events;
    const base = events.find(e => e.eventKind === 'BASE_CHECK' && e.frame.annotations.baseCase)
      || events.find(e => e.eventKind === 'RETURN_READY');
    const baseCall = base.frame.framesById[base.frame.activeCallId];
    const recipient = baseCall.parentCallId || 'driver';
    const questions = [question('recipient', base, 'Which context receives this invocation’s result?', recipient,
      recipient === 'driver' ? ['Every completed call', 'No context resumes'] : ['driver', 'Every waiting caller'],
      'Only the context that called this invocation receives its result. The caller’s assignment is a later event.')];
    if (spec.domain === 'list') {
      questions.push(question('measure', base, 'What shrinks when index increases?', 'len(values) - index',
        ['The shared input list is copied and shortened', 'Every caller’s index changes together'],
        'The remaining suffix gets shorter. All calls keep the same read-only list reference and their own index. At the terminal index there is no element to read.'));
      const assignment = events.find(e => e.eventKind === 'ASSIGN_RESULT');
      const owner = assignment.frame.framesById[assignment.frame.activeCallId];
      const next = events[events.indexOf(assignment) + 1];
      const answer = owner ? format(next.frame.framesById[owner.callId].locals.total) : 'Print the driver answer';
      questions.push(question('combine', assignment, owner ? 'After this caller binds child_total, what does its next total assignment produce?' : 'The empty suffix has returned. What happens next?',
        answer, ['The return itself prints the value', 'None'], owner ? 'Use this call’s own index and the child_total it has just received. The total binding remains unchanged until Python executes the addition.' : 'Only the driver executes print(answer).'));
    } else {
      const laterChild = events.find(e => e.eventKind === 'CALL' && e.frame.framesById[e.frame.activeCallId].parentCallId === 'call-1'
        && e.frame.framesById['call-1'].locals.child_total.kind === 'INTEGER');
      if (laterChild) {
        const parent = laterChild.frame.framesById['call-1'];
        questions.push(question('retained-binding', laterChild, 'While this later child runs, what is bound to call-1’s child_total?', format(parent.locals.child_total),
          ['UNBOUND · cleared at each call', 'The next child’s future return value'],
          'Python retains the previous binding while it evaluates the new call on the assignment’s right side. Pending assignment and current local value are separate.'));
        questions.push(question('accumulator', laterChild, 'Which frame owns total = ' + format(parent.locals.total) + '?', 'call-1',
          ['Every node shares one global total', laterChild.frame.activeCallId],
          'Each invocation owns its accumulator. A returned child result is assigned first; only the later addition changes this parent’s total.'));
      } else {
        const ready = events.find(e => e.eventKind === 'RETURN_READY');
        const call = ready.frame.framesById[ready.frame.activeCallId];
        questions.push(question('direct-locals', ready, 'What is the actual binding of total in this invocation?', format(call.locals.total),
          ['None', 'A future child result'], call.locals.total.kind === 'UNBOUND' ? 'A file returns its bytes before the total assignment. Returning 0 does not create a local total.' : 'An empty folder initializes total = 0 and skips its child loop.'));
      }
      const final = events.at(-1);
      questions.push(question('depth', final, 'How many function invocations occurred, and what was the maximum live depth?',
        final.frame.metrics.totalInvocations + ' calls; peak ' + final.frame.metrics.maxDepth,
        ['Every hierarchy node is simultaneously on the live stack', 'The driver is included in function depth'],
        'Siblings run sequentially. The hierarchy is the input; the live stack contains only the current call path.'));
    }
    return questions;
  }
  return Object.freeze({ forFixture, repairTarget });
})();
globalThis.ITCC47RecursionQuestions = ITCC47RecursionQuestions;
