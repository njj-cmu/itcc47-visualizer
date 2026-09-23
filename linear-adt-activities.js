/* Module 4 activities: shared, deterministic timelines for stacks, queues, and deques. */
const ITCC47LinearADTActivities = (() => {
  const CONTENT_VERSION = '2026.08-m4-practice';
  const CLO_IDS = Object.freeze([2, 3, 4, 5, 6]);

  function entity(id, value, detail = '') { return Object.freeze({ id, value, detail }); }

  function freezeInput(input) {
    return input ? Object.freeze({
      label: input.label,
      tokens: Object.freeze([...(input.tokens || [])]),
      active: Number.isInteger(input.active) ? input.active : -1,
    }) : null;
  }

  // Each operation owns a source line; each phase owns a complete, reversible
  // snapshot. Playback traverses the flattened phases without owning ADT logic.
  function operationSteps(operations) {
    return operations.flatMap((operation) => operation.phases.map((phase, phaseIndex) => ({
      ...phase,
      line: operation.line,
      execution: {
        operationId: operation.id || `line-${operation.line}`, kind: operation.kind,
        title: operation.title,
        description: operation.description,
        phaseIndex, phaseCount: operation.phases.length,
        phaseLabels: operation.phases.map((item) => item.title),
        ...phase.execution,
      },
      boundary: phaseIndex === operation.phases.length - 1,
    })));
  }

  // Generate operations from tokens, not pre-computed screen contents. Source,
  // iteration and phase remain separate even when line 8 executes twice.
  function postfixProgram(tokens = ['5', '2', '+', '3', '×']) {
    tokens = tokens.map(String);
    const operators = { '+': (a, b) => a + b, '−': (a, b) => a - b, '-': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };
    const entities = [], operations = [], stack = [], infix = new Map();
    let runtime = {}, tokenIndex = -1, processed = 0, count = 0, comparisons = 0;
    let classified = false;
    const snapshot = (execution = {}, output = []) => ({
      lanes: [{ id: 'main', label: 'Operand Stack', kind: 'stack', order: stack.map(item => item.id) }],
      input: { label: 'Postfix tokens', tokens, active: tokenIndex },
      iteration: { index: tokenIndex, count: tokens.length, processed, value: tokens[tokenIndex] ?? null,
        type: classified ? (Object.hasOwn(operators, tokens[tokenIndex]) ? 'Operator' : 'Number') : null },
      runtime: Object.fromEntries(Object.entries(runtime).map(([key, value]) => [key, { ...value }])),
      held: Object.entries(runtime).filter(([, item]) => item.status === 'assigned').map(([label, item]) => ({ id: `runtime-${label}`, label, value: item.value })),
      variables: { token: tokens[tokenIndex] ?? 'none', ...Object.fromEntries(Object.entries(runtime).filter(([, item]) => item.status === 'assigned').map(([label, item]) => [label, item.value])), size: stack.length },
      operations: count, comparisons, execution, output,
    });
    const operation = (line, kind, title, labels, describe, phase) => {
      operations.push({ id: `token-${tokenIndex}-${kind}-${operations.length}`, line, kind, title, description: title,
        phases: labels.map((label, index) => ({ title: label, message: describe[index],
          operation: { label: kind === 'pop' ? `POP ${line === 6 ? 'right' : 'left'}` : title, end: 'top' },
          ...phase(index),
        })) });
    };
    const flow = (line, kind, title, message) => operation(line, kind, title, [title], [message], () => snapshot());
    const push = (item, isResult) => {
      const beforeSize = stack.length;
      operation(isResult ? 8 : 4, 'push', isResult ? `Push result ${item.value} onto the stack` : `PUSH ${item.value} onto the stack`,
        [isResult ? 'Read result' : 'Read token', 'Move to stack', 'Commit push', 'Update state'],
        [isResult ? `The computed result ${item.value} is ready to push.` : `${item.value} is a number. Stage it from the token stream.`,
          `Move ${item.value} toward the pending top slot. It is not committed yet.`,
          `Commit ${item.value} as the new top item.`, `PUSH complete. Confirm the stack size and mark token ${tokenIndex + 1} as processed.`],
        index => {
          if (index === 2) { stack.push(item); count++; }
          if (index === 3) processed = tokenIndex + 1;
          return snapshot({ item, beforeSize, pendingPush: index === 1, staged: index === 0,
            transfer: index === 1 ? 'push' : null, pendingMetadata: index === 2, complete: index === 3, origin: isResult ? 'computed result' : 'from token stream' });
        });
    };
    const pop = (destination) => {
      const item = stack.at(-1), beforeSize = stack.length;
      operation(destination === 'right' ? 6 : 7, 'pop', `Pop the ${destination} operand ${destination === 'right' ? 'first' : 'second'}`,
        ['Identify top', 'Remove value', 'Assign variable', 'Update stack'],
        [`The top value ${item.value} is the ${destination} operand. ${destination === 'right' ? 'First pop = right.' : 'Second pop = left.'}`,
          `Remove ${item.value} from the stack. ${destination} is receiving it.`,
          `Assign ${item.value} to ${destination}. This is a runtime value, not output.`,
          `${destination} = ${item.value}. ${stack.length > 1 ? 'The next item becomes the top.' : 'The operand stack is now empty.'}`],
        index => {
          if (index === 1) { stack.pop(); count++; runtime[destination] = { ...item, status: 'receiving' }; }
          if (index === 2) runtime[destination] = { ...item, status: 'assigned' };
          return snapshot({ item, destination, beforeSize, transfer: index === 1 ? 'pop' : null, complete: index === 3 });
        });
      return item;
    };
    flow(1, 'initialize', 'Initialize the operand stack', 'Start with an empty stack, no runtime values, and no output.');
    tokens.forEach((token, index) => {
      tokenIndex = index; classified = false; runtime = {};
      flow(2, 'iterate', `Read token ${index + 1} of ${tokens.length}`, `The loop cursor moves to ${token}. The stack is unchanged.`);
      classified = true; comparisons++;
      const isOperator = Object.hasOwn(operators, token);
      operation(3, 'classify', `Is ${token} a number?`, ['Classify token'],
        [isOperator ? `${token} is an operator: take ELSE, then POP right → POP left → APPLY → PUSH.` : `${token} is a number: take the PUSH branch.`],
        () => ({ ...snapshot(), type: 'comparison', comparison: { text: 'token is a number', outcome: !isOperator } }));
      if (!isOperator) {
        if (!token.trim() || !Number.isFinite(Number(token))) throw new Error(`Invalid postfix token: ${token}`);
        const item = entity(`token-${index}`, token);
        infix.set(item.id, token);
        entities.push(item); push(item, false);
      } else {
        if (stack.length < 2) throw new Error(`Postfix ${token}: two operands are required`);
        runtime = { right: { status: 'unassigned' }, left: { status: 'unassigned' } };
        flow(5, 'branch', 'Resolve the operator', 'First pop = right operand. Second pop = left operand. Keep this order for subtraction and division too.');
        const right = pop('right'), left = pop('left');
        const value = operators[token](Number(left.value), Number(right.value));
        if (!Number.isFinite(value)) throw new Error('Postfix result must be finite');
        const expression = `${left.value} ${token} ${right.value}`;
        const item = entity(`result-${index}`, String(value), expression);
        infix.set(item.id, `(${infix.get(left.id)} ${token} ${infix.get(right.id)})`);
        entities.push(item);
        operation(8, 'apply', `Apply ${token} to left and right`, ['Load operands', 'Apply operator', 'Produce result', 'Stage result'],
          [`Load left = ${left.value} and right = ${right.value}, in that order.`, `Apply ${expression}. Neither operand is on the stack now.`,
            `${expression} = ${value}. This is an intermediate runtime result, not program output.`, `Stage ${value} before pushing it back onto the operand stack.`],
          phase => {
            runtime.result = phase < 2 ? { status: 'unassigned' } : { ...item, status: 'assigned' };
            return snapshot({ item, expression, staged: phase === 3, complete: phase === 3 });
          });
        push(item, true);
      }
      flow(9, 'branch', 'Finish this token’s branch', `Token ${index + 1} is processed. Its value or computed result is on the stack.`);
      flow(10, 'iterate', index < tokens.length - 1 ? 'Continue the token loop' : 'Token loop complete', index < tokens.length - 1 ? 'Advance to the next token.' : 'All tokens are processed. Return the single remaining value.');
    });
    if (stack.length !== 1) throw new Error('Postfix evaluation must leave exactly one result');
    tokenIndex = -1; classified = false;
    const answer = stack[0];
    operation(11, 'return', 'Return final result', ['Identify final value', 'Pop result', 'Move to output', 'Complete evaluation'],
      [`${answer.value} is the only value left on the stack.`, `Pop ${answer.value}. The stack is now empty.`,
        `RETURN sends ${answer.value} to Program Output.`, `Evaluation complete: ${answer.value}.`],
      phase => {
        if (phase === 1) { stack.pop(); count++; }
        return { ...snapshot({ item: answer, beforeSize: 1, staged: phase === 1, transfer: phase === 1 ? 'return-pop' : phase === 2 ? 'output' : null, complete: phase === 3 }, phase >= 2 ? [answer.value] : []), type: 'return' };
      });
    const calculation = infix.get(answer.id);
    return {
      entities, steps: operationSteps(operations), result: { value: Number(answer.value) },
      scenario: { calculation: `${calculation.startsWith('(') ? calculation.slice(1, -1) : calculation} = ${answer.value}` },
      source: ['stack <- empty', `FOR each token IN [${tokens.join(', ')}] DO`, '  IF token is a number THEN',
        '    PUSH stack, token', '  ELSE', '    right <- POP stack', '    left <- POP stack',
        '    PUSH stack, APPLY(token, left, right)', '  ENDIF', 'ENDFOR', 'RETURN POP stack'],
    };
  }

  const DELIMITER_PAIRS = Object.freeze({ '(': ')', '[': ']', '{': '}' });
  const DELIMITER_OPENERS = new Set(Object.keys(DELIMITER_PAIRS));
  const DELIMITER_CLOSERS = new Set(Object.values(DELIMITER_PAIRS));
  const DELIMITER_SOURCE = Object.freeze([
    'stack <- empty',
    'FOR each token IN source DO',
    '  IF token is an opener THEN',
    '    PUSH stack, token',
    '  ELSE',
    '    IF stack is empty OR top does not match token THEN',
    '      RETURN INVALID',
    '    ENDIF',
    '    POP stack',
    '  ENDIF',
    'ENDFOR',
    'RETURN stack is empty',
  ]);

  // Generate a parser trace from source characters. Source line, character
  // iteration, and operation phase are independent in every snapshot.
  function delimiterProgram(tokens = ['(', '[', '{', '}', ']', ')']) {
    tokens = tokens.map(String);
    if (tokens.some((token) => token.length !== 1 || (!DELIMITER_OPENERS.has(token) && !DELIMITER_CLOSERS.has(token)))) {
      throw new Error('Delimiter source accepts only single-character (), [], and {} tokens');
    }

    const entities = tokens.flatMap((token, index) => DELIMITER_OPENERS.has(token)
      ? [entity(`opener-${index}`, token, `expects ${DELIMITER_PAIRS[token]}`)] : []);
    const entityAt = new Map(entities.map((item) => [Number(item.id.split('-')[1]), item]));
    const operations = [], stack = [], states = tokens.map(() => 'pending'), pairIndexes = tokens.map(() => null);
    let tokenIndex = -1, processed = 0, operationCount = 0, comparisons = 0, currentType = null;
    let parser = { status: 'RUNNING', message: 'Processing source characters...', reason: null, emptyEvaluation: null };

    const characters = () => Object.freeze(tokens.map((value, index) => Object.freeze({
      index, value,
      state: states[index] === 'pending' && index === tokenIndex ? 'current' : states[index],
      pairIndex: pairIndexes[index],
    })));
    const snapshot = (execution = {}, { matching = null, auxiliary = null, output = [] } = {}) => ({
      lanes: [{ id: 'main', label: 'Unmatched Openers Stack', kind: 'stack', order: stack.map((entry) => entry.item.id) }],
      input: { label: 'Source characters', tokens, active: tokenIndex },
      iteration: {
        index: tokenIndex, count: tokens.length, processed, value: tokens[tokenIndex] ?? null,
        type: currentType,
      },
      sourceCharacters: characters(),
      parser: Object.freeze({ ...parser, processed, unmatched: stack.length }),
      matching: matching ? Object.freeze({ ...matching }) : null,
      auxiliary: auxiliary ? Object.freeze({ ...auxiliary }) : null,
      variables: { token: tokens[tokenIndex] ?? 'none', size: stack.length, top: stack.at(-1)?.item.value ?? 'none' },
      operations: operationCount,
      comparisons,
      execution,
      output,
    });
    const addOperation = (line, kind, title, labels, messages, makePhase) => {
      operations.push({
        id: `delimiter-${tokenIndex}-${kind}-${operations.length}`,
        line, kind, title, description: title,
        phases: labels.map((label, phaseIndex) => ({
          title: label,
          message: messages[phaseIndex],
          operation: { label: title, end: 'top' },
          ...makePhase(phaseIndex),
        })),
      });
    };

    addOperation(1, 'initialize', 'Initialize the unmatched-openers stack', ['Initialize stack'],
      ['Start with an empty stack and a running parser.'], () => snapshot({ complete: true }));

    for (let index = 0; index < tokens.length; index++) {
      tokenIndex = index;
      currentType = null;
      const token = tokens[index];
      if (DELIMITER_OPENERS.has(token)) {
        const item = entityAt.get(index), expected = DELIMITER_PAIRS[token], beforeSize = stack.length;
        addOperation(4, 'push-opener', `PUSH ${token} onto the stack`,
          ['Read current token', 'Classify as opener', 'Move to stack', 'Commit push'],
          [`Read ${token} at character ${index + 1}. The stack is unchanged.`,
            `${token} is an opener. It starts a group and expects ${expected}.`,
            `Move ${token} toward the pending top slot without changing the stack yet.`,
            `Commit ${token} as the new TOP. It now waits for ${expected}.`],
          (phase) => {
            currentType = phase === 0 ? null : 'Opener';
            if (phase === 3) {
              stack.push({ item, index, expected });
              states[index] = 'processed';
              processed = index + 1;
              operationCount++;
            }
            return snapshot({
              item, expected, beforeSize,
              staged: phase === 1,
              pendingPush: phase === 2,
              transfer: phase === 2 ? 'push' : null,
              complete: phase === 3,
            }, {
              auxiliary: phase === 1
                ? { kind: 'incoming', item, status: `Expects closer ${expected}` }
                : phase === 2 ? { kind: 'incoming', item: null, status: 'Moving to stack' } : null,
            });
          });
        continue;
      }

      currentType = 'Closer';
      const top = stack.at(-1) || null;
      const expected = top?.expected || null;
      const matches = !!top && expected === token;
      const failureKind = top ? 'mismatch' : 'empty-stack';
      const reason = top
        ? 'Current closer does not match the most recent unmatched opener.'
        : 'No unmatched opener exists for the current closer.';
      addOperation(6, 'check-closer', `Check closer ${token} against the stack TOP`,
        ['Read closer', 'Inspect stack top', top ? 'Compare pair' : 'Check for an opener', 'Decide'],
        [`Read closer ${token}. Do not pop anything yet.`,
          top ? `Inspect TOP ${top.item.value}, which expects ${expected}.` : 'The unmatched-openers stack has no TOP item.',
          top ? `Compare ${top.item.value} with ${token}.` : `No opener is available to match ${token}.`,
          matches ? `Confirmed: ${top.item.value} matches ${token}. POP is now allowed as a separate operation.` : reason],
        (phase) => {
          currentType = 'Closer';
          if (phase === 2) {
            comparisons++;
            if (!matches) states[index] = 'failed';
          }
          const matchingState = phase < 1 ? 'pending' : phase < 2 ? 'inspecting'
            : matches ? 'match' : failureKind;
          return snapshot({
            item: top?.item || null,
            expected,
            received: token,
            match: phase >= 2 ? matches : null,
            failureKind: phase >= 2 && !matches ? failureKind : null,
            complete: phase === 3,
          }, {
            matching: {
              kind: top ? 'pair' : 'empty-stack', state: matchingState,
              top: top?.item.value || null, expected, received: token,
              match: phase >= 2 ? matches : null,
            },
          });
        });

      if (!matches) {
        parser = { status: 'INVALID', message: 'Delimiter audit stopped.', reason, emptyEvaluation: null, failureKind };
        addOperation(7, 'return-invalid', 'RETURN INVALID', ['Return invalid'],
          [`Stop immediately. ${reason}`], () => snapshot({
            received: token, expected, failureKind, complete: true,
          }, {
            matching: { kind: top ? 'pair' : 'empty-stack', state: failureKind, top: top?.item.value || null, expected, received: token, match: false },
            auxiliary: { kind: 'failure', item: null, status: reason },
            output: ['INVALID'],
          }));
        return {
          entities, steps: operationSteps(operations),
          result: { valid: false, reason, failureKind },
          scenario: { source: tokens.join(''), label: 'Invalid delimiter source' },
          source: DELIMITER_SOURCE,
        };
      }

      const matched = top;
      addOperation(9, 'pop-matched', `POP matched opener ${matched.item.value}`,
        ['Match confirmed', 'Remove opener', 'Resolve pair', 'Update stack state'],
        [`The comparison succeeded. Select ${matched.item.value}, but keep it on the stack until removal begins.`,
          `Remove ${matched.item.value} from the stack. The outgoing value is temporary teaching state.`,
          `Resolve source pair ${matched.item.value} ↔ ${token}.`,
          `POP complete. ${stack.length > 1 ? `${stack.at(-2).item.value} becomes TOP.` : 'The stack is now empty.'}`],
        (phase) => {
          currentType = 'Closer';
          if (phase === 1) {
            stack.pop();
            operationCount++;
          }
          if (phase === 2) {
            states[matched.index] = 'resolved';
            states[index] = 'resolved';
            pairIndexes[matched.index] = index;
            pairIndexes[index] = matched.index;
          }
          if (phase === 3) processed = index + 1;
          return snapshot({
            item: matched.item, expected, received: token,
            beforeSize: phase === 0 ? stack.length : stack.length + 1,
            transfer: phase === 1 ? 'pop' : null,
            complete: phase === 3,
          }, {
            matching: { kind: 'pair', state: 'match', top: matched.item.value, expected, received: token, match: true },
            auxiliary: phase === 0
              ? { kind: 'outgoing', item: matched.item, status: 'Matched; ready to pop' }
              : phase < 3 ? { kind: 'outgoing', item: matched.item, status: 'Popped (matched)' } : null,
          });
        });
    }

    tokenIndex = -1;
    currentType = null;
    const isEmpty = stack.length === 0;
    const finalReason = isEmpty ? null : 'One or more opening delimiters were never closed.';
    addOperation(12, 'final-check', 'RETURN stack is empty',
      ['Finish source scan', 'Inspect stack', 'Evaluate empty', 'Return result'],
      ['Every source character has been processed.',
        `Inspect the unmatched-openers stack: ${stack.length} item${stack.length === 1 ? '' : 's'} remain${stack.length === 1 ? 's' : ''}.`,
        `stack is empty evaluates to ${isEmpty ? 'TRUE' : 'FALSE'}.`,
        isEmpty ? 'Return VALID only now, after final empty-stack validation.' : `Return INVALID. ${finalReason}`],
      (phase) => {
        if (phase === 2) comparisons++;
        if (phase === 3) parser = {
          status: isEmpty ? 'VALID' : 'INVALID',
          message: isEmpty ? 'All delimiter pairs are balanced.' : 'Delimiter audit finished with unmatched openers.',
          reason: finalReason,
          emptyEvaluation: isEmpty,
          failureKind: isEmpty ? null : 'unclosed-opener',
        };
        return snapshot({ emptyEvaluation: phase >= 2 ? isEmpty : null, complete: phase === 3 }, {
          auxiliary: phase >= 1 ? { kind: 'validation', item: null, status: `${stack.length} unmatched opener${stack.length === 1 ? '' : 's'}` } : null,
          output: phase === 3 ? [isEmpty ? 'VALID' : 'INVALID'] : [],
        });
      });

    return {
      entities, steps: operationSteps(operations),
      result: { valid: isEmpty, reason: finalReason, failureKind: isEmpty ? null : 'unclosed-opener' },
      scenario: { source: tokens.join(''), label: isEmpty ? 'Balanced delimiter source' : 'Unclosed opener source' },
      source: DELIMITER_SOURCE,
    };
  }

  const UNDO_REDO_SOURCE = Object.freeze([
    'undo <- [Type A, Type B]',
    'redo <- empty',
    'command <- POP undo',
    'APPLY inverse(command)',
    'PUSH redo, command',
    'command <- POP redo',
    'APPLY command',
    'PUSH undo, command',
    'RETURN document',
  ]);

  const QUEUE_FOUNDATIONS_SOURCE = Object.freeze([
    'queue <- empty with capacity 3',
    'IF queue is empty THEN DEQUEUE is UNDERFLOW',
    'ENQUEUE queue, "A"',
    'ENQUEUE queue, "B"',
    'ENQUEUE queue, "C"',
    'next <- FRONT queue',
    'served <- DEQUEUE queue',
    'ENQUEUE queue, "D" AT (back + 1) MOD 3',
    'RETURN queue',
  ]);

  // Model one UNDO followed by one REDO as immutable operation snapshots.
  // The command owns exactly one location in each snapshot: a history stack,
  // the transfer lane, or the command register. Document mutation is separate.
  function undoRedoProgram() {
    const commandA = entity('cmd-a', 'Type A', 'insert "A"');
    const commandB = entity('cmd-b', 'Type B', 'insert "B"');
    const entities = [commandA, commandB];
    const operations = [];
    const undo = [commandA, commandB];
    const redo = [];
    let command = null;
    let transit = null;
    let documentValue = 'AB';
    let context = 'SETUP';
    let commandState = 'EMPTY';
    let transition = null;
    let documentChange = null;
    let returnValue = null;
    let operationCount = 0;

    const frozenCommand = (item) => item ? Object.freeze({ id: item.id, value: item.value, detail: item.detail }) : null;
    const snapshot = (execution = {}, output = []) => ({
      lanes: [
        { id: 'undo', label: 'Undo Stack (History)', kind: 'stack', order: undo.map((item) => item.id) },
        { id: 'redo', label: 'Redo Stack (History)', kind: 'stack', order: redo.map((item) => item.id) },
      ],
      undoRedo: Object.freeze({
        context,
        command: frozenCommand(command),
        transit: frozenCommand(transit),
        commandState,
        commandLocation: transit ? 'IN_TRANSIT' : command ? 'COMMAND' : undo.some((item) => item.id === commandB.id) ? 'UNDO' : redo.some((item) => item.id === commandB.id) ? 'REDO' : 'NONE',
        transition: transition ? Object.freeze({ ...transition }) : null,
        document: Object.freeze({
          value: documentValue,
          length: documentValue.length,
          change: documentChange ? Object.freeze({ ...documentChange }) : null,
        }),
        returnValue,
        scenario: Object.freeze({ undoComplete: context === 'REDO' || context === 'RETURN' || context === 'COMPLETE', redoComplete: context === 'RETURN' || context === 'COMPLETE' }),
      }),
      variables: {
        document: documentValue,
        command: command?.value || transit?.value || 'empty',
        undoSize: undo.length,
        redoSize: redo.length,
      },
      output,
      operations: operationCount,
      comparisons: 0,
      execution,
    });
    const addOperation = (line, kind, title, description, labels, messages, makePhase) => {
      operations.push({
        id: `undo-redo-${line}-${kind}`,
        line, kind, title, description,
        phases: labels.map((label, phaseIndex) => ({
          title: label,
          message: messages[phaseIndex],
          operation: { label: UNDO_REDO_SOURCE[line - 1], end: 'top' },
          ...makePhase(phaseIndex),
        })),
      });
    };
    const clearTransientState = () => {
      transition = null;
      documentChange = null;
      transit = null;
    };

    addOperation(1, 'initialize-undo', 'Load the Undo history', 'Start with Type A followed by Type B in the Undo stack.',
      ['Load initial history'], ['The document already contains AB, and Type B is the most recent command.'],
      () => snapshot({ complete: true }));
    addOperation(2, 'initialize-redo', 'Initialize the Redo history', 'Begin with no commands available to redo.',
      ['Initialize Redo'], ['Redo starts empty because no command has been undone yet.'],
      () => snapshot({ complete: true }));

    const popToCommand = ({ line, source, kind, mode }) => {
      const sourceStack = source === 'undo' ? undo : redo;
      const item = sourceStack.at(-1);
      const sourceName = source === 'undo' ? 'Undo' : 'Redo';
      const route = source === 'undo' ? 'UNDO_TO_COMMAND' : 'REDO_TO_COMMAND';
      addOperation(line, kind, `Pop the most recent command from ${sourceName}`, `Remove the top command from ${sourceName} and place it into the command register.`,
        [`Identify ${sourceName} TOP`, 'Remove command', 'Place in command register', `Update ${sourceName} stack`],
        [`${item.value} is the TOP of ${sourceName}. The document stays ${documentValue}.`,
          `Remove ${item.value} from ${sourceName}. It is now in transit; the document is unchanged.`,
          `Place ${item.value} in command. It is held temporarily between POP and PUSH.`,
          `${sourceName} now contains ${sourceStack.length > 1 ? sourceStack.slice(0, -1).map((entry) => entry.value).join(', ') : 'no commands'}. The document is still ${documentValue}.`],
        (phase) => {
          context = mode;
          clearTransientState();
          commandState = phase === 0 ? 'EMPTY' : phase === 1 ? (source === 'undo' ? 'RECEIVING' : 'RECEIVING FROM REDO') : 'HELD';
          if (phase === 1) {
            sourceStack.pop();
            transit = item;
            transition = { kind: route, source, destination: 'command', value: item.value };
          }
          if (phase === 2) command = item;
          if (phase === 3) operationCount++;
          return snapshot({ item, transfer: phase === 1 ? route : null, source, destination: 'command', complete: phase === 3 });
        });
    };

    const applyDocument = ({ line, kind, mode, before, after, mutation, labels, messages, title, description }) => {
      addOperation(line, kind, title, description, labels, messages, (phase) => {
        context = mode;
        clearTransientState();
        commandState = kind === 'apply-inverse' ? 'APPLYING INVERSE' : 'REAPPLYING';
        documentChange = {
          kind: mutation,
          before,
          after,
          character: 'B',
          status: phase === 0 ? 'INSPECTING' : phase === 1 ? 'RESOLVED' : phase === 2 ? 'APPLYING' : 'COMMITTED',
        };
        if (phase === 3) {
          documentValue = after;
          operationCount++;
        }
        return snapshot({ item: commandB, documentMutation: mutation, pendingDocument: phase === 2, complete: phase === 3 });
      });
    };

    const pushFromCommand = ({ line, destination, kind, mode }) => {
      const destinationStack = destination === 'redo' ? redo : undo;
      const destinationName = destination === 'redo' ? 'Redo' : 'Undo';
      const route = destination === 'redo' ? 'COMMAND_TO_REDO' : 'COMMAND_TO_UNDO';
      addOperation(line, kind, `Store Type B in ${destinationName}`, `Move the held command from command into the ${destinationName} stack.`,
        ['Prepare command', `Move to ${destinationName}`, 'Commit push', 'Update history state'],
        [`Prepare Type B for ${destinationName}. The document stays ${documentValue}.`,
          `Move Type B from command toward ${destinationName}. No document content changes during PUSH.`,
          `Commit Type B as the TOP of ${destinationName}.`,
          `${destinationName} now owns Type B, and the command register is empty.`],
        (phase) => {
          context = mode;
          clearTransientState();
          commandState = phase === 0 ? (destination === 'redo' ? 'READY FOR REDO' : 'READY FOR UNDO') : 'EMPTY';
          if (phase === 1) {
            command = null;
            transit = commandB;
            transition = { kind: route, source: 'command', destination, value: commandB.value };
          }
          if (phase === 2) destinationStack.push(commandB);
          if (phase === 3) operationCount++;
          return snapshot({ item: commandB, transfer: phase === 1 ? route : null, source: 'command', destination, complete: phase === 3 });
        });
    };

    popToCommand({ line: 3, source: 'undo', kind: 'pop-undo', mode: 'UNDO' });
    applyDocument({
      line: 4, kind: 'apply-inverse', mode: 'UNDO', before: 'AB', after: 'A', mutation: 'REMOVE_CHARACTER',
      title: 'Reverse Type B', description: 'Apply inverse(Type B) to remove B from the document.',
      labels: ['Inspect command', 'Determine inverse', 'Apply inverse', 'Commit document state'],
      messages: ['Inspect the held Type B command. The document is still AB.', 'Resolve inverse(Type B) as remove B.', 'Apply the inverse: preview AB → A while command remains held.', 'Commit the document as A. Type B remains in command for the next PUSH.'],
    });
    pushFromCommand({ line: 5, destination: 'redo', kind: 'push-redo', mode: 'UNDO' });
    popToCommand({ line: 6, source: 'redo', kind: 'pop-redo', mode: 'REDO' });
    applyDocument({
      line: 7, kind: 'apply-command', mode: 'REDO', before: 'A', after: 'AB', mutation: 'INSERT_CHARACTER',
      title: 'Reapply Type B', description: 'Apply Type B again to restore B in the document.',
      labels: ['Inspect command', 'Apply edit', 'Update document', 'Commit document state'],
      messages: ['Inspect the held Type B command. The document is still A.', 'Resolve Type B as insert B.', 'Apply the command: preview A → AB while command remains held.', 'Commit the document as AB. Type B remains in command for the next PUSH.'],
    });
    pushFromCommand({ line: 8, destination: 'undo', kind: 'push-undo', mode: 'REDO' });

    addOperation(9, 'return-document', 'Return document', 'Return AB as program output without confusing it with live document state.',
      ['Inspect document', 'Prepare return value', 'Return document', 'Complete scenario'],
      ['Inspect the live document: AB.', 'Prepare AB as the return value. Program output is still empty.', 'RETURN sends AB to Program / Return Output.', 'Scenario complete: document AB, Undo [Type A, Type B], Redo empty, command empty.'],
      (phase) => {
        context = phase === 3 ? 'COMPLETE' : 'RETURN';
        clearTransientState();
        commandState = 'EMPTY';
        returnValue = phase >= 1 ? 'AB' : null;
        if (phase === 3) operationCount++;
        return { ...snapshot({ returnPrepared: phase >= 1, complete: phase === 3 }, phase >= 2 ? ['AB'] : []), type: 'return' };
      });

    return {
      entities,
      steps: operationSteps(operations),
      result: { document: 'AB', undo: ['Type A', 'Type B'], redo: [], command: null },
      scenario: { label: 'Perform one UNDO, then one REDO', initialDocument: 'AB' },
      source: UNDO_REDO_SOURCE,
    };
  }

  // Keep physical slots as the source of truth. Logical FIFO order is derived
  // from front, size, and capacity for every immutable playback snapshot.
  function queueFoundationsProgram() {
    const capacity = 3;
    const values = Object.freeze({
      A: entity('ticket-a', 'A', 'first arrival'),
      B: entity('ticket-b', 'B'),
      C: entity('ticket-c', 'C'),
      D: entity('ticket-d', 'D', 'wraparound arrival'),
    });
    const entities = Object.freeze(Object.values(values));
    const operations = [];
    const slots = [null, null, null];
    let front = null;
    let back = null;
    let size = 0;
    let next = null;
    let served = null;
    let transition = null;
    let pending = null;
    let underflow = null;
    let returnValue = null;
    let context = 'INITIALIZE';
    let operationCount = 0;
    let comparisons = 0;

    const logicalItems = () => Array.from({ length: size }, (_, offset) => slots[(front + offset) % capacity]);
    const freezeItem = (item) => item ? Object.freeze({ id: item.id, value: item.value, detail: item.detail }) : null;
    const freezePending = () => pending ? Object.freeze({ ...pending, item: freezeItem(pending.item) }) : null;
    const snapshot = (execution = {}, output = []) => {
      const logical = logicalItems();
      const runtime = Object.freeze({
        next,
        served,
        receiving: pending?.runtimeDestination || null,
        receivingValue: pending?.runtimeDestination ? pending.item?.value || null : null,
      });
      return {
        lanes: [{ id: 'main', label: 'Logical FIFO queue', kind: 'queue', order: logical.filter(Boolean).map((item) => item.id) }],
        queue: Object.freeze({
          capacity,
          slots: Object.freeze(slots.map((item, index) => Object.freeze({ index, item: freezeItem(item) }))),
          front,
          back,
          size,
          logicalOrder: Object.freeze(logical.filter(Boolean).map((item) => item.value)),
          runtime,
          transition: transition ? Object.freeze({ ...transition, item: freezeItem(transition.item) }) : null,
          pending: freezePending(),
          underflow: underflow ? Object.freeze({ ...underflow }) : null,
          returnValue: returnValue ? Object.freeze([...returnValue]) : null,
          context,
        }),
        variables: {
          capacity,
          size,
          frontIndex: front ?? 'none',
          backIndex: back ?? 'none',
          ...(next ? { next } : {}),
          ...(served ? { served } : {}),
        },
        operations: operationCount,
        comparisons,
        execution,
        output,
      };
    };
    const clearTransient = () => {
      transition = null;
      pending = null;
      underflow = null;
    };
    const addOperation = (line, kind, title, description, labels, messages, makePhase) => {
      operations.push({
        id: `queue-foundations-${line}-${kind}`,
        line,
        kind,
        title,
        description,
        phases: labels.map((label, phaseIndex) => ({
          title: label,
          message: messages[phaseIndex],
          operation: { label: QUEUE_FOUNDATIONS_SOURCE[line - 1], end: kind === 'dequeue' || kind === 'front' ? 'front' : 'back' },
          ...makePhase(phaseIndex),
        })),
      });
    };

    addOperation(1, 'initialize', 'Initialize a capacity-3 queue', 'Create three fixed physical slots and an empty logical queue.',
      ['Read capacity', 'Create empty storage', 'Initialize size', 'Set front/back empty state'],
      ['Read the requested capacity: 3 slots.', 'Create physical slots 0, 1, and 2 without placing a value.', 'Initialize size to 0.', 'Set front and back to none because the queue is empty.'],
      (phase) => {
        context = 'INITIALIZE';
        clearTransient();
        return snapshot({ complete: phase === 3 });
      });

    addOperation(2, 'underflow-guard', 'Check the empty queue', 'Demonstrate the underflow rule without performing a dequeue.',
      ['Check size', 'Determine empty', 'Explain underflow condition', 'Continue without mutation'],
      ['Read size = 0.', 'The queue is empty because size equals 0.', 'DEQUEUE would cause UNDERFLOW, so no value may be removed.', 'Continue the scenario with all three slots empty.'],
      (phase) => {
        context = 'GUARD';
        clearTransient();
        underflow = { checked: phase >= 1, empty: true, wouldUnderflow: phase >= 2, continued: phase === 3 };
        if (phase === 3) comparisons = 1;
        return snapshot({ complete: phase === 3 });
      });

    const enqueue = ({ line, value, wrap = false }) => {
      const item = values[value];
      const beforeBack = back;
      const destinationIndex = size === 0 ? 0 : (back + 1) % capacity;
      const beforeSize = size;
      const afterFront = size === 0 ? 0 : front;
      const kind = wrap ? 'wrap-enqueue' : 'enqueue';
      const title = wrap ? 'Wraparound enqueue' : `ENQUEUE queue, "${value}"`;
      const description = wrap ? 'Compute the wrapped back index and place D in physical slot 0.' : `Insert ${value} at the back of the queue.`;
      const indexMessage = size === 0
        ? 'The first insertion uses physical slot 0 and sets both pointers there.'
        : `Compute (${beforeBack} + 1) MOD ${capacity} = ${destinationIndex}.`;
      addOperation(line, kind, title, description,
        wrap ? ['Read current back', 'Compute wrapped index', `Insert ${value} into physical slot`, 'Update back and size'] : ['Read / prepare value', 'Find insertion index', `Insert ${value} into physical slot`, 'Update pointers and size'],
        [
          wrap ? `Read the current back index: ${beforeBack}. D waits outside the queue.` : `Prepare ${value} outside the queue before insertion.`,
          indexMessage,
          `${value} moves toward fixed physical slot ${destinationIndex}. The committed circular buffer is unchanged during transit.`,
          size === 0 ? `${value} is committed in slot 0. front = 0, back = 0, size = 1.` : `${value} is committed in slot ${destinationIndex}. back = ${destinationIndex}, size = ${beforeSize + 1}.`,
        ],
        (phase) => {
          context = wrap ? 'WRAPAROUND' : 'ENQUEUE';
          clearTransient();
          if (phase <= 1) pending = {
            kind: 'INCOMING', item, destinationIndex, fromBack: beforeBack, front: afterFront, back: destinationIndex, size: beforeSize + 1,
            formula: size === 0 ? 'first item → index 0' : `(${beforeBack} + 1) MOD ${capacity} = ${destinationIndex}`,
          };
          if (phase === 2) {
            pending = {
              kind: 'INSERTING', item, destinationIndex, fromBack: beforeBack, front: afterFront, back: destinationIndex, size: beforeSize + 1,
              formula: size === 0 ? 'first item → index 0' : `(${beforeBack} + 1) MOD ${capacity} = ${destinationIndex}`,
            };
            transition = { kind: wrap ? 'WRAP_ENQUEUE' : 'ENQUEUE_MOVE', item, source: 'incoming', destination: `slot-${destinationIndex}`, destinationIndex, fromBack: beforeBack };
          }
          if (phase === 3) {
            slots[destinationIndex] = item;
            front = afterFront;
            back = destinationIndex;
            size = beforeSize + 1;
            operationCount++;
            if (wrap) comparisons++;
          }
          return snapshot({ item, destinationIndex, beforeSize, afterSize: beforeSize + 1, pendingInsert: phase === 2, complete: phase === 3 });
        });
    };

    enqueue({ line: 3, value: 'A' });
    enqueue({ line: 4, value: 'B' });
    enqueue({ line: 5, value: 'C' });

    addOperation(6, 'front', 'FRONT queue', 'Read the value at the front without removing it.',
      ['Read front element', 'Copy value to next', 'Confirm queue unchanged'],
      ['A is stored at front index 0.', 'Copy A into next while A remains in physical slot 0.', 'FRONT is complete: slots, pointers, and size are unchanged.'],
      (phase) => {
        context = 'FRONT';
        clearTransient();
        const item = slots[front];
        if (phase === 1) {
          next = item.value;
          pending = { kind: 'COPYING', item, sourceIndex: front, runtimeDestination: 'next' };
          transition = { kind: 'FRONT_COPY', item, source: `slot-${front}`, destination: 'next', sourceIndex: front, runtimeDestination: 'next' };
        }
        if (phase === 2) operationCount++;
        return snapshot({ item, sourceIndex: front, destination: 'next', receiving: phase === 1, complete: phase === 2 });
      });

    addOperation(7, 'dequeue', 'DEQUEUE queue', 'Remove the front element and assign it to served.',
      ['Identify front', 'Remove front value', 'Assign value to served', 'Advance front and update size'],
      ['A is the current front value at physical slot 0.', 'A leaves slot 0; served is receiving it. Pointer and size changes are still pending.', 'Assign A to served while the metadata update remains pending.', 'Clear slot 0, advance front to 1, keep back at 2, and update size to 2.'],
      (phase) => {
        context = 'DEQUEUE';
        clearTransient();
        const sourceIndex = front;
        const item = slots[sourceIndex];
        if (phase === 1) {
          pending = { kind: 'REMOVING', item, sourceIndex, runtimeDestination: 'served', front: 1, back, size: 2 };
          transition = { kind: 'DEQUEUE_MOVE', item, source: `slot-${sourceIndex}`, destination: 'served', sourceIndex, runtimeDestination: 'served' };
        }
        if (phase === 2) {
          served = item.value;
          pending = { kind: 'ASSIGNING', item, sourceIndex, front: 1, back, size: 2 };
        }
        if (phase === 3) {
          served = item.value;
          slots[sourceIndex] = null;
          front = (front + 1) % capacity;
          size--;
          operationCount++;
        }
        return snapshot({ item, sourceIndex, destination: 'served', beforeSize: 3, afterSize: 2, pendingRemoval: phase === 1 || phase === 2, complete: phase === 3 });
      });

    enqueue({ line: 8, value: 'D', wrap: true });

    addOperation(9, 'return-queue', 'RETURN queue', 'Return the queue in logical FIFO order.',
      ['Read logical FIFO order', 'Prepare return value', 'Return queue', 'Complete scenario'],
      ['Read from front index 1 for size 3: B, C, then wrapped slot 0 containing D.', 'Prepare [B, C, D] as the return value. Program output is still empty.', 'RETURN emits [B, C, D] in logical FIFO order.', 'Scenario complete: physical storage is [D, B, C], while logical FIFO order is [B, C, D].'],
      (phase) => {
        context = phase === 3 ? 'COMPLETE' : 'RETURN';
        clearTransient();
        returnValue = phase >= 1 ? logicalItems().map((item) => item.value) : null;
        if (phase === 3) operationCount++;
        return { ...snapshot({ returnPrepared: phase >= 1, complete: phase === 3 }, phase >= 2 ? [...returnValue] : []), type: 'return' };
      });

    return {
      entities,
      steps: operationSteps(operations),
      result: { slots: ['D', 'B', 'C'], front: 1, back: 0, size: 3, logicalOrder: ['B', 'C', 'D'], next: 'A', served: 'A', output: ['B', 'C', 'D'] },
      scenario: { label: 'Trace FIFO behavior in a circular array', capacity },
      source: QUEUE_FOUNDATIONS_SOURCE,
    };
  }

  const ROUND_ROBIN_SOURCE = Object.freeze([
    'ready <- [P1:5, P2:2]',
    'quantum <- 2',
    'process <- DEQUEUE ready',
    'RUN process FOR MIN(quantum, remaining)',
    'remaining <- remaining - quantum',
    'IF remaining > 0 THEN',
    '  ENQUEUE ready, process',
    'ENDIF',
    'RETURN ready',
  ]);

  function roundRobinProgram() {
    const processes = Object.freeze({
      P1: entity('process-p1', 'P1', '5 ms initial work'),
      P2: entity('process-p2', 'P2', '2 ms initial work'),
    });
    const operations = [];
    const ready = ['P1', 'P2'];
    const completed = [];
    const remaining = { P1: 5, P2: 2 };
    const quantum = 2;
    let cpu = null, moving = null, runtimeProcess = null, runtimeRemaining = null;
    let turn = 0, sliceDuration = null, sliceResult = null, branchResult = null;
    let transition = null, returnValue = null, output = [], complete = false;
    let operationCount = 0, comparisons = 0;

    const snapshot = (execution = {}) => {
      const locations = [...ready, ...(cpu ? [cpu] : []), ...(moving ? [moving.id] : []), ...completed];
      if (locations.length !== 2 || new Set(locations).size !== 2) throw new Error('Round-robin process must occupy exactly one scheduler location');
      const readyQueue = Object.freeze([...ready]);
      const completedProcesses = Object.freeze([...completed]);
      const remainingByProcess = Object.freeze({ ...remaining });
      const scheduler = Object.freeze({
        readyQueue, cpu, moving: moving ? Object.freeze({ ...moving }) : null,
        completedProcesses, remainingByProcess, quantum, turn, turnCount: 2,
        runtime: Object.freeze({ process: runtimeProcess, remaining: runtimeRemaining }),
        sliceDuration, sliceResult, branchResult,
        transition: transition ? Object.freeze({ ...transition }) : null,
        returnValue: returnValue ? Object.freeze([...returnValue]) : null,
        complete,
      });
      return {
        lanes: [{ id: 'main', label: 'Ready Queue', kind: 'queue', order: readyQueue.map((id) => processes[id].id) }],
        held: cpu ? [{ id: `runtime-${cpu}`, label: 'CPU', value: `${cpu} · ${remaining[cpu]} ms` }] : [],
        variables: { process: runtimeProcess || 'none', remaining: runtimeRemaining ?? 'none', quantum, turn: complete ? 'complete' : turn || 'ready' },
        scheduler, execution, output: [...output], operations: operationCount, comparisons,
      };
    };
    const addOperation = (line, kind, title, description, labels, messages, makePhase, turnLabel = turn) => {
      operations.push({ id: `round-robin-${kind}-${operations.length}`, line, kind, title, description,
        phases: labels.map((label, phase) => ({
          title: label, message: messages[phase], operation: { label: title, end: 'front' },
          segment: turnLabel ? `Turn ${turnLabel}` : 'Setup',
          ...makePhase(phase),
        })),
      });
    };

    addOperation(1, 'setup', 'Initialize the ready queue', 'Load P1 and P2 in FIFO order and establish the 2 ms time quantum.',
      ['Load processes', 'Establish FIFO order', 'Set quantum', 'Ready scheduler'],
      ['P1 begins with 5 ms; P2 begins with 2 ms.', 'P1 is FRONT and P2 is BACK.', 'The scenario grants at most 2 ms per turn.', 'The scheduler is ready; no CPU time has been consumed.'],
      (phase) => snapshot({ complete: phase === 3 }));
    addOperation(2, 'quantum', 'Set the time quantum', 'Confirm that each dispatched process receives at most 2 ms.',
      ['Confirm quantum'], ['quantum = 2 ms. The ready order remains P1, then P2.'],
      () => snapshot({ complete: true }));

    const dispatch = (id) => {
      const next = ready[0];
      if (next !== id) throw new Error(`Expected ${id} at READY FRONT, found ${next}`);
      addOperation(3, 'dispatch', `Dispatch ${id} to the CPU`, `Remove ${id} at FRONT from the ready queue and move it to the CPU. Do not run it yet.`,
        ['Identify FRONT', 'Remove process', 'Move process to CPU', 'Update ready queue'],
        [`${id} is at FRONT with ${remaining[id]} ms of work.`, `DEQUEUE ${id} from Ready; CPU time remains unchanged.`, `Move ${id} from Ready FRONT into the CPU receiving area.`, `${id} is in the CPU with ${remaining[id]} ms remaining; the new Ready FRONT is ${ready[1] || 'none'}.`],
        (phase) => {
          turn = id === 'P1' ? 1 : 2;
          transition = null;
          if (phase === 0) { branchResult = null; sliceDuration = null; sliceResult = null; }
          if (phase === 1) {
            ready.shift();
            moving = { id, from: 'READY', to: 'CPU' };
            transition = { kind: 'DISPATCH', id, from: 'READY', to: 'CPU', stage: 'removed' };
          }
          if (phase === 2) {
            moving = null;
            cpu = id;
            runtimeProcess = id;
            runtimeRemaining = remaining[id];
            transition = { kind: 'DISPATCH', id, from: 'READY', to: 'CPU', stage: 'receiving' };
          }
          if (phase === 3) operationCount++;
          return snapshot({ processId: id, complete: phase === 3 });
        }, id === 'P1' ? 1 : 2);
    };
    const run = (id) => {
      const before = remaining[id];
      addOperation(4, 'run', `Run ${id} for one time quantum`, `The CPU grants ${id} at most ${quantum} ms, then the scheduler reevaluates the process.`,
        ['Read remaining work', 'Compute slice duration', 'Execute slice', 'Finish CPU slice'],
        [`${id} has ${before} ms committed remaining.`, `MIN(${quantum}, ${before}) = ${Math.min(quantum, before)} ms.`, `${id} consumes ${Math.min(quantum, before)} ms of CPU time. The new remaining work is only a preview.`, `The slice is finished. Line 5 will commit the remaining-work assignment.`],
        (phase) => {
          transition = null;
          if (phase >= 1) sliceDuration = Math.min(quantum, before);
          if (phase >= 2) sliceResult = before - sliceDuration;
          if (phase === 3) operationCount++;
          return snapshot({ processId: id, before, complete: phase === 3 });
        });
    };
    const updateRemaining = (id) => {
      const before = remaining[id];
      const after = before - sliceDuration;
      addOperation(5, 'update-remaining', `Update ${id} remaining work`, 'Subtract the CPU slice and commit the new remaining value.',
        ['Read previous remaining', 'Subtract CPU slice', 'Compute new remaining', 'Commit remaining state'],
        [`Read committed remaining = ${before} ms.`, `${before} - ${sliceDuration} = ${after} ms.`, `The computed result is ${after} ms; the assignment is still pending.`, `Commit remaining = ${after} ms for ${id}.`],
        (phase) => {
          transition = null;
          if (phase === 3) {
            remaining[id] = after;
            runtimeRemaining = after;
            operationCount++;
          }
          return snapshot({ processId: id, before, after, complete: phase === 3 });
        });
    };
    const checkFinished = (id) => {
      const value = remaining[id];
      const unfinished = value > 0;
      addOperation(6, 'check-finished', unfinished ? `Check whether ${id} is finished` : `${id} completes its CPU burst`,
        unfinished ? `The CPU slice has ended. Decide whether ${id} returns to the ready queue.` : `${id} has no work left. It leaves scheduling as completed.`,
        ['Read remaining', 'Evaluate remaining > 0', 'Choose branch', unfinished ? 'Explain scheduler action' : 'Move to completed'],
        [`Read remaining = ${value} ms.`, `${value} > 0 is ${unfinished ? 'TRUE' : 'FALSE'}.`, unfinished ? 'Choose RE-ENQUEUE AT BACK. P1 stays in CPU until line 7.' : 'Choose DO NOT RE-ENQUEUE. P2 stays in CPU while this decision is shown.',
          unfinished ? 'P1 will move behind P2 on line 7; it does not continue running immediately.' : 'Move P2 from the CPU to Completed. It never returns to Ready.'],
        (phase) => {
          transition = null;
          if (phase >= 1) branchResult = unfinished;
          if (phase === 1) comparisons++;
          if (phase === 3 && !unfinished) {
            cpu = null;
            completed.push(id);
            transition = { kind: 'COMPLETE', id, from: 'CPU', to: 'COMPLETED', stage: 'arrived' };
          }
          return snapshot({ processId: id, branch: phase >= 1 ? unfinished : null, complete: phase === 3 });
        });
    };
    const reenqueue = (id) => {
      addOperation(7, 'reenqueue', `Re-enqueue unfinished ${id}`, `Move ${id} behind the waiting process so P2 receives the next CPU turn.`,
        ['Prepare unfinished process', 'Move toward BACK', 'Commit enqueue', 'Update ready order'],
        [`${id} has ${remaining[id]} ms remaining. P2 stays at FRONT.`, `Move ${id} from CPU toward Ready BACK; it is not committed yet.`, `Commit ${id} at Ready BACK, behind P2.`, `Ready order is P2, then P1. Next FRONT = P2.`],
        (phase) => {
          transition = null;
          if (phase === 1) {
            cpu = null;
            moving = { id, from: 'CPU', to: 'READY' };
            transition = { kind: 'REENQUEUE', id, from: 'CPU', to: 'READY', stage: 'moving' };
          }
          if (phase === 2) {
            moving = null;
            ready.push(id);
            transition = { kind: 'REENQUEUE', id, from: 'CPU', to: 'READY', stage: 'arrived' };
            operationCount++;
          }
          return snapshot({ processId: id, complete: phase === 3 });
        });
    };
    const endIf = (id) => addOperation(8, 'endif', `Finish ${id} decision`, 'Close this branch and continue to the next scheduler action.',
      ['End branch'], [`${id === 'P1' ? 'P2 is now the next Ready FRONT.' : 'P2 has completed; P1 remains ready with 3 ms.'}`],
      () => { transition = null; runtimeProcess = null; runtimeRemaining = null; return snapshot({ complete: true }); });

    dispatch('P1');
    run('P1');
    updateRemaining('P1');
    checkFinished('P1');
    reenqueue('P1');
    endIf('P1');
    dispatch('P2');
    run('P2');
    updateRemaining('P2');
    checkFinished('P2');
    endIf('P2');

    addOperation(9, 'return', 'Return the remaining ready queue', 'Unfinished P1 remains ready while finished P2 stays completed.',
      ['Read ready queue', 'Prepare return value', 'Return queue', 'Complete scenario'],
      ['Read Ready Queue: P1 has 3 ms remaining.', 'Prepare [P1 · 3 ms] as the logical return value.', 'RETURN ready produces [P1 · 3 ms].', 'P2 is complete; P1 still has 3 ms remaining.'],
      (phase) => {
        transition = null;
        if (phase >= 1) returnValue = ready.map((id) => `${id} · ${remaining[id]} ms`);
        if (phase === 2) output = [...returnValue];
        if (phase === 3) complete = true;
        return snapshot({ complete: phase === 3 });
      }, 0);

    return {
      entities: Object.values(processes), source: ROUND_ROBIN_SOURCE,
      steps: operationSteps(operations),
      result: { ready: ['P1:3'], completed: ['P2'] },
      scenario: { quantum, processCount: 2 },
    };
  }

  function stackFoundationsSteps() {
    const lane = (order) => [{ id: 'main', label: 'Stack', kind: 'stack', order }];
    const snapshot = (order, runtime = {}, operations = 0) => ({
      lanes: lane(order), variables: { ...runtime, size: order.length, top: order.at(-1)?.slice(-1).toUpperCase() || 'none' },
      held: Object.entries(runtime).map(([label, value]) => ({ id: `runtime-${label}`, label, value })),
      operations, comparisons: 1,
    });
    const push = (line, value, before) => ({
      line, kind: 'push', description: `Push ${value} onto the stack.`,
      phases: ['Prepare value', 'Move to stack', 'Commit', 'Update state'].map((title, index) => ({
        ...snapshot(index >= 2 ? [...before, `plate-${value.toLowerCase()}`] : before, {}, before.length + (index >= 2 ? 1 : 0)),
        title, operation: { label: `PUSH ${value}`, end: 'top' },
        message: [
          `Get the value "${value}" ready to be pushed onto the stack.`,
          `Move "${value}" from the staging area toward the top slot.`,
          `Place "${value}" on top of the stack. The push happens now.`,
          `"${value}" has been pushed onto the stack. Confirm the new top and size.`,
        ][index],
        execution: { value, beforeSize: before.length, afterSize: before.length + 1, nextTop: value,
          workingValue: index < 2 ? value : null, transfer: index === 1 || index === 2 ? 'to-stack' : null,
          pendingMetadata: index === 2, complete: index === 3 },
      })),
    });
    return operationSteps([
      { line: 1, kind: 'initialize', description: 'Create an empty stack.', phases: [{
        ...snapshot([], {}, 0), comparisons: 0, title: 'Initialize stack', message: 'The stack starts empty: size 0 and no top item.', operation: { label: 'initialize' },
      }] },
      { line: 2, kind: 'guard', description: 'Check the empty stack before reading its top.', phases: [{
        ...snapshot([], {}, 0), title: 'Guard the empty case', type: 'comparison',
        message: 'The stack is empty. POP would underflow, so no value is read or removed.',
        operation: { label: 'UNDERFLOW guard' }, comparison: { text: 'POP allowed when size = 0', outcome: false },
      }] },
      push(3, 'A', []), push(4, 'B', ['plate-a']),
      { line: 5, kind: 'peek', description: 'Observe the top item and copy its value into topValue.',
        phases: ['Identify top', 'Observe value', 'Assign variable', 'Confirm no structural change'].map((title, index) => ({
          ...snapshot(['plate-a', 'plate-b'], index >= 2 ? { topValue: 'B' } : {}, index >= 2 ? 3 : 2),
          comparisons: index === 3 ? 2 : 1,
          title, type: 'comparison', operation: { label: 'PEEK', end: 'top' },
          message: ['B is the top item. PEEK will read it without removing it.', 'Observe B while it stays in its stack slot.', 'Copy B into topValue. This is a runtime value, not program output.', 'The stack still contains A and B. Its size remains 2.'][index],
          execution: { value: 'B', destination: 'topValue', receiving: index === 1, complete: index === 3, beforeSize: 2, afterSize: 2, nextTop: 'B' },
        })),
      },
      { line: 6, kind: 'pop', description: 'Remove the top item and store it in popped.',
        phases: ['Identify top', 'Remove from stack', 'Assign variable', 'Update state'].map((title, index) => ({
          ...snapshot(index === 0 ? ['plate-a', 'plate-b'] : ['plate-a'], index >= 2 ? { topValue: 'B', popped: 'B' } : { topValue: 'B' }, index >= 1 ? 4 : 3),
          comparisons: 2,
          title, operation: { label: 'POP', end: 'top' },
          message: ['B was pushed last, so it is the item POP will remove.', 'Take B off the stack. A becomes the new top; popped is receiving B.', 'Assign the removed value B to popped.', 'POP is complete. A remains on the stack and the size is 1.'][index],
          execution: { value: 'B', destination: 'popped', receiving: index === 1,
            workingValue: index === 1 ? 'B' : null, transfer: index === 1 ? 'from-stack' : null,
            beforeSize: 2, afterSize: 1, nextTop: 'A', pendingMetadata: index === 1, complete: index === 3 },
        })),
      },
      { line: 7, kind: 'return', description: 'Return the value stored in popped.', phases: [{
        ...snapshot(['plate-a'], { topValue: 'B', popped: 'B' }, 4), title: 'Return popped', type: 'return',
        comparisons: 2,
        operation: { label: 'RETURN B' }, message: 'RETURN sends popped (B) to Program Output. A remains on the stack.', output: ['B'], execution: { complete: true },
      }] },
    ]);
  }

  function buildActivity(spec) {
    const source = Object.freeze([...spec.source]);
    const structure = spec.structure || spec.steps[0]?.lanes?.[0]?.kind;
    if (!['stack', 'queue', 'deque'].includes(structure)) {
      throw new Error(`${spec.id}: missing or invalid linear ADT structure`);
    }
    const entityById = new Map(spec.entities.map((item) => [item.id, item]));
    const events = spec.steps.map((step, index) => {
      const laneIds = new Set();
      const lanes = step.lanes.map((lane) => {
        const items = lane.order.map((id) => {
          const item = entityById.get(id);
          if (!item) throw new Error(`${spec.id}: unknown entity ${id} at step ${index + 1}`);
          if (laneIds.has(id)) throw new Error(`${spec.id}: duplicate live entity ${id} at step ${index + 1}`);
          laneIds.add(id);
          return item;
        });
        return Object.freeze({ id: lane.id, label: lane.label, kind: lane.kind || structure, items: Object.freeze(items) });
      });
      const held = Object.freeze((step.held || []).map((heldItem) => Object.freeze({ ...heldItem })));
      const heldIds = new Set(held.map((item) => item.id));
      const annotations = Object.freeze((step.focus || []).map((focus) => {
        const isHeld = focus.where === 'held';
        if (isHeld ? !heldIds.has(focus.id) : !laneIds.has(focus.id)) {
          throw new Error(`${spec.id}: stale teaching target ${focus.id} at step ${index + 1}`);
        }
        return Object.freeze({
          id: `focus:${focus.id}:${focus.label}`,
          label: focus.label,
          value: focus.value ?? entityById.get(focus.id)?.value ?? held.find((item) => item.id === focus.id)?.value,
          tone: focus.tone || 'primary',
          target: Object.freeze({ kind: isHeld ? 'held' : 'entity', id: focus.id }),
        });
      }));
      const primaryItems = lanes[0]?.items || [];
      const invariant = Object.freeze({
        size: primaryItems.length,
        empty: primaryItems.length === 0,
        top: structure === 'stack' ? primaryItems.at(-1)?.id || null : null,
        front: structure === 'stack' ? null : primaryItems[0]?.id || null,
        back: structure === 'stack' ? null : primaryItems.at(-1)?.id || null,
      });
      const teaching = Object.freeze({
        variant: spec.variant,
        title: step.title,
        annotations,
        comparison: step.comparison ? Object.freeze({ ...step.comparison }) : null,
        status: Object.freeze((step.status || []).map((item, statusIndex) => Object.freeze({ id: `status:${statusIndex}`, ...item }))),
      });
      const line = Math.max(1, Math.min(source.length, step.line));
      return ITCC47Playback.timelineEvent({
        id: `${spec.id}:${index}`,
        domain: 'linear-adt',
        type: step.type || (index === 0 ? 'initialize' : index === spec.steps.length - 1 ? 'return' : 'mutation'),
        message: step.message,
        frame: {
          kind: 'linear-adt', structure, lanes,
          array: primaryItems.map((item) => item.value),
          input: freezeInput(step.input || spec.input),
          held,
          output: Object.freeze([...(step.output || [])]),
          operation: step.operation ? Object.freeze({ ...step.operation }) : null,
          execution: step.execution || null,
          iteration: step.iteration || null,
          runtime: step.runtime || null,
          sourceCharacters: step.sourceCharacters || null,
          parser: step.parser || null,
          matching: step.matching || null,
          auxiliary: step.auxiliary || null,
          undoRedo: step.undoRedo || null,
          queue: step.queue || null,
          scheduler: step.scheduler || null,
          invariants: invariant,
          markers: Object.freeze({ teaching, variables: Object.freeze({ ...(step.variables || {}) }) }),
        },
        metrics: { operations: step.operations ?? index, comparisons: step.comparisons ?? 0 },
        source: { line, code: source[line - 1] },
        segment: step.segment ? Object.freeze({ id: step.segment, label: step.segment }) : null,
        boundary: !!step.boundary,
        terminal: index === spec.steps.length - 1,
      });
    });

    return Object.freeze({
      id: spec.id, contentVersion: spec.contentVersion || CONTENT_VERSION, module: 4, topic: spec.topic, family: spec.family,
      title: spec.title, subtitle: spec.subtitle, exampleKind: spec.exampleKind,
      engine: 'curated-linear-adt', renderer: 'linear-adt', teachingVariant: spec.variant,
      workspaceComposition: spec.workspaceComposition,
      scenario: spec.scenario ? Object.freeze({ ...spec.scenario }) : null,
      checkpointId: spec.checkpointId, cloIds: CLO_IDS, reviewStatus: 'reviewed',
      source, views: Object.freeze(['visualize', 'code', 'trace', 'variables', 'operations', 'output']),
      evidenceViews: Object.freeze(['trace', 'variables', 'operations', 'output']),
      input: Object.freeze({ kind: 'linear-adt', editable: false, min: 0, max: 0, defaultValues: Object.freeze([]) }),
      metrics: Object.freeze([
        Object.freeze({ key: 'operations', short: 'Ops', label: 'ADT operations' }),
        Object.freeze({ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }),
      ]),
      complexity: Object.freeze({ ...spec.complexity }),
      blurb: spec.blurb || spec.subtitle,
      sourceFor() { return source; },
      run() { return ITCC47Playback.runResult({ events, result: spec.result || null }); },
    });
  }

  const stackBasics = buildActivity({
    id: 'stack-lifo-basics', contentVersion: '2026.09-stack-phases', topic: 'Stacks', family: 'Stacks', exampleKind: 'Foundations', checkpointId: 'm4-stack',
    title: 'Push, peek, and pop', subtitle: 'Build the LIFO rule one operation at a time.', variant: 'stack-foundations', workspaceComposition: 'stack-execution',
    entities: [entity('plate-a', 'A', 'first pushed'), entity('plate-b', 'B', 'last pushed')],
    source: ['stack <- empty', 'IF stack is empty THEN POP is UNDERFLOW', 'PUSH stack, "A"', 'PUSH stack, "B"', 'topValue <- PEEK stack', 'popped <- POP stack', 'RETURN popped'],
    complexity: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)' },
    steps: stackFoundationsSteps(), result:{ popped:'B' },
  });

  const postfix = buildActivity({
    id: 'stack-postfix-evaluator', contentVersion: '2026.09-postfix-phases',
    topic: 'Stacks', family: 'Stacks', exampleKind: 'Math resolver', checkpointId: 'm4-stack',
    title: 'Evaluate a postfix expression', subtitle: 'Resolve 5 2 + 3 × by stacking operands and applying operators.',
    variant: 'stack-postfix', workspaceComposition: 'postfix-execution',
    complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)' },
    ...postfixProgram(),
  });

  const delimiterScenarios = Object.freeze([
    Object.freeze({ id: 'balanced', label: 'Balanced · ([{}])', tokens: Object.freeze(['(', '[', '{', '}', ']', ')']) }),
    Object.freeze({ id: 'mismatch', label: 'Mismatch · ([}])', tokens: Object.freeze(['(', '[', '}', ']', ')']) }),
    Object.freeze({ id: 'extra-closer', label: 'Extra closer · ())', tokens: Object.freeze(['(', ')', ')']) }),
    Object.freeze({ id: 'unclosed', label: 'Unclosed openers · ([{}', tokens: Object.freeze(['(', '[', '{', '}']) }),
  ]);
  const delimiterMetadata = Object.freeze({
    id: 'stack-delimiter-audit', contentVersion: '2026.09-delimiter-phases',
    topic: 'Stacks', family: 'Stacks', exampleKind: 'Parser application', checkpointId: 'm4-stack',
    title: 'Audit nested delimiters',
    subtitle: 'Match nested grouping delimiters by comparing every closer with the stack top.',
    variant: 'stack-audit', workspaceComposition: 'delimiter-execution',
    complexity: Object.freeze({ best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)' }),
  });
  const delimiterActivities = new Map(delimiterScenarios.map((scenario) => {
    const program = delimiterProgram(scenario.tokens);
    return [scenario.id, buildActivity({ ...delimiterMetadata, ...program })];
  }));
  const delimiterDefault = delimiterActivities.get('balanced');
  const delimiterAudit = Object.freeze({
    ...delimiterDefault,
    input: Object.freeze({
      ...delimiterDefault.input,
      defaultValues: delimiterScenarios[0].tokens,
      defaultPreset: 'balanced',
      presets: Object.freeze(delimiterScenarios.map(({ id, label }) => Object.freeze({ id, label }))),
    }),
    run(options = {}) {
      return (delimiterActivities.get(options.preset) || delimiterDefault).run();
    },
    sourceFor(options = {}) {
      return (delimiterActivities.get(options.preset) || delimiterDefault).source;
    },
  });

  const editorUndo = buildActivity({
    id:'stack-editor-undo',contentVersion:'2026.09-undo-redo-phases',topic:'Stacks',family:'Stacks',exampleKind:'Real world',checkpointId:'m4-stack',
    title:'Undo and redo an edit',subtitle:'Coordinate two stacks without losing the command being transferred.',variant:'two-stack-history',workspaceComposition:'undo-redo-execution',
    complexity:{best:'O(1)',avg:'O(1)',worst:'O(1)',space:'O(n)'},
    ...undoRedoProgram(),
  });

  const queueBasics = buildActivity({
    id:'queue-fifo-basics',contentVersion:'2026.09-queue-circular-phases',topic:'Queues',family:'Queues',exampleKind:'Foundations',checkpointId:'m4-queue-deque',
    title:'Enqueue, front, and dequeue',subtitle:'Explore FIFO behavior, front and back pointers, and circular array operations.',variant:'queue-foundations',workspaceComposition:'queue-execution',
    complexity:{best:'O(1)',avg:'O(1)',worst:'O(1)',space:'O(n)'},
    ...queueFoundationsProgram(),
  });

  const roundRobin = buildActivity({
    id:'queue-round-robin',contentVersion:'2026.09-round-robin-phases',topic:'Queues',family:'Queues',exampleKind:'Scheduling algorithm',checkpointId:'m4-queue-deque',
    title:'Round-robin CPU scheduling',subtitle:'Use a ready queue to give each process a fair CPU time slice.',variant:'queue-round-robin',workspaceComposition:'round-robin-execution',
    complexity:{best:'O(1) per slice',avg:'O(1) per slice',worst:'O(k) slices',space:'O(n)'},
    ...roundRobinProgram(),
  });

  const printerQueue = buildActivity({
    id:'queue-printer-jobs',topic:'Queues',family:'Queues',exampleKind:'Real world',checkpointId:'m4-queue-deque',
    title:'Office printer queue',subtitle:'Keep jobs fair even when later documents are shorter.',variant:'queue-printer',
    entities:[entity('job-report','Report · 8 pages'),entity('job-form','Form · 1 page'),entity('job-slides','Slides · 4 pages')],
    source:['jobs <- empty','ENQUEUE jobs, Report','ENQUEUE jobs, Form','ENQUEUE jobs, Slides','current <- DEQUEUE jobs','PRINT current','RETURN jobs'],
    complexity:{best:'O(1) queue operation',avg:'O(1) queue operation',worst:'O(p) printing',space:'O(n)'},
    steps:[
      {line:1,title:'Printer starts idle',message:'No job is waiting.',lanes:[{id:'main',label:'Print queue',kind:'queue',order:[]}],operation:{label:'idle'},status:[{label:'printer',value:'idle',tone:'muted'}],variables:{size:0},operations:0},
      {line:2,title:'Report arrives first',message:'The eight-page report owns the front position.',lanes:[{id:'main',label:'Print queue',kind:'queue',order:['job-report']}],focus:[{id:'job-report',label:'front'}],operation:{label:'ENQUEUE Report',end:'back'},variables:{front:'Report',size:1},operations:1},
      {line:3,title:'Form waits behind Report',message:'Its shorter length does not let it skip the queue.',lanes:[{id:'main',label:'Print queue',kind:'queue',order:['job-report','job-form']}],focus:[{id:'job-form',label:'new back'}],operation:{label:'ENQUEUE Form',end:'back'},variables:{front:'Report',back:'Form',size:2},operations:2},
      {line:4,title:'Slides join at the back',message:'Arrival order is Report, Form, Slides.',lanes:[{id:'main',label:'Print queue',kind:'queue',order:['job-report','job-form','job-slides']}],focus:[{id:'job-report',label:'front',tone:'minimum'},{id:'job-slides',label:'back',tone:'secondary'}],operation:{label:'ENQUEUE Slides',end:'back'},variables:{front:'Report',back:'Slides',size:3},operations:3},
      {line:5,title:'Take the front job',message:'DEQUEUE selects Report even though Form is shorter.',type:'comparison',lanes:[{id:'main',label:'Print queue',kind:'queue',order:['job-form','job-slides']}],held:[{id:'printing-report',label:'current job',value:'Report · 8 pages',tone:'primary'}],focus:[{id:'printing-report',label:'printer',where:'held'},{id:'job-form',label:'next',tone:'minimum'}],comparison:{text:'current = earliest arrival',outcome:true},operation:{label:'DEQUEUE Report',end:'front'},variables:{current:'Report',front:'Form',size:2},operations:4,comparisons:1,boundary:true},
      {line:6,title:'Print Report completely',message:'The printer finishes the active job before taking another.',lanes:[{id:'main',label:'Print queue',kind:'queue',order:['job-form','job-slides']}],held:[{id:'printed-report',label:'completed',value:'Report',tone:'success'}],focus:[{id:'printed-report',label:'printed',where:'held'}],operation:{label:'PRINT 8 pages'},output:['Printed Report'],variables:{current:'Report',front:'Form'},operations:5,comparisons:1},
      {line:7,title:'Form is now at the front',message:'Return the remaining jobs in their original relative order.',type:'return',lanes:[{id:'main',label:'Print queue',kind:'queue',order:['job-form','job-slides']}],focus:[{id:'job-form',label:'next job',tone:'minimum'}],operation:{label:'RETURN jobs'},output:['Printed Report'],variables:{front:'Form',back:'Slides',size:2},operations:5,comparisons:1},
    ],result:{printed:'Report',remaining:['Form','Slides']},
  });

  const dequeBasics = buildActivity({
    id:'deque-end-operations',topic:'Deques',family:'Deques',exampleKind:'Foundations',checkpointId:'m4-queue-deque',
    title:'Use both ends of a deque',subtitle:'Add and remove at the front or back without shifting the middle.',variant:'deque-foundations',
    entities:[entity('task-a','A'),entity('task-b','B'),entity('task-vip','VIP')],
    source:['deque <- empty','ADD_BACK deque, A','ADD_BACK deque, B','ADD_FRONT deque, VIP','last <- REMOVE_BACK deque','first <- REMOVE_FRONT deque','RETURN deque'],
    complexity:{best:'O(1)',avg:'O(1)',worst:'O(1)',space:'O(n)'},
    steps:[
      {line:1,title:'A deque has two legal ends',message:'Both front and back begin empty.',lanes:[{id:'main',label:'Double-ended queue',kind:'deque',order:[]}],operation:{label:'initialize'},status:[{label:'pronunciation',value:'“deck”',tone:'secondary'}],variables:{size:0},operations:0},
      {line:2,title:'Add A at the back',message:'ADD_BACK behaves like a normal queue enqueue.',lanes:[{id:'main',label:'Double-ended queue',kind:'deque',order:['task-a']}],focus:[{id:'task-a',label:'front = back'}],operation:{label:'ADD_BACK A',end:'back'},variables:{front:'A',back:'A',size:1},operations:1},
      {line:3,title:'Add B after A',message:'B becomes the back while A remains the front.',lanes:[{id:'main',label:'Double-ended queue',kind:'deque',order:['task-a','task-b']}],focus:[{id:'task-a',label:'front',tone:'minimum'},{id:'task-b',label:'back'}],operation:{label:'ADD_BACK B',end:'back'},variables:{front:'A',back:'B',size:2},operations:2},
      {line:4,title:'Add VIP at the front',message:'A deque allows front insertion, so VIP goes before A without shifting through an array model.',lanes:[{id:'main',label:'Double-ended queue',kind:'deque',order:['task-vip','task-a','task-b']}],focus:[{id:'task-vip',label:'new front',tone:'minimum'},{id:'task-b',label:'back',tone:'secondary'}],operation:{label:'ADD_FRONT VIP',end:'front'},variables:{front:'VIP',back:'B',size:3},operations:3},
      {line:5,title:'Remove from the back',message:'REMOVE_BACK returns B, the item at the opposite end from VIP.',lanes:[{id:'main',label:'Double-ended queue',kind:'deque',order:['task-vip','task-a']}],held:[{id:'removed-b',label:'last',value:'B',tone:'danger'}],focus:[{id:'removed-b',label:'removed back',where:'held'},{id:'task-a',label:'new back',tone:'secondary'}],operation:{label:'REMOVE_BACK',end:'back'},variables:{last:'B',front:'VIP',back:'A',size:2},operations:4},
      {line:6,title:'Remove from the front',message:'REMOVE_FRONT returns VIP; A remains as the only item.',lanes:[{id:'main',label:'Double-ended queue',kind:'deque',order:['task-a']}],held:[{id:'removed-vip',label:'first',value:'VIP',tone:'danger'}],focus:[{id:'removed-vip',label:'removed front',where:'held'},{id:'task-a',label:'remaining'}],operation:{label:'REMOVE_FRONT',end:'front'},output:['B','VIP'],variables:{last:'B',first:'VIP',size:1},operations:5},
      {line:7,title:'Four operations, no middle access',message:'A deque is not “a queue that can remove anywhere”; it exposes exactly two ends.',type:'return',lanes:[{id:'main',label:'Double-ended queue',kind:'deque',order:['task-a']}],focus:[{id:'task-a',label:'front = back'}],comparison:{text:'all end operations are O(1)',outcome:true},operation:{label:'RETURN [A]'},output:['B','VIP'],status:[{label:'allowed ends',value:'front + back',tone:'success'}],variables:{size:1},operations:5,comparisons:1},
    ],result:{remaining:['A']},
  });

  const slidingWindow = buildActivity({
    id:'deque-sliding-window',topic:'Deques',family:'Deques',exampleKind:'Algorithmic math',checkpointId:'m4-queue-deque',
    title:'Sliding-window maximum',subtitle:'Keep only candidates that can still become the maximum.',variant:'deque-monotonic',
    entities:[entity('v4','4 · i0'),entity('v2','2 · i1'),entity('v12','12 · i2'),entity('v3','3 · i3')],
    input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:0},
    source:['deque <- empty','FOR i <- 0 TO 3 DO','  WHILE deque not empty AND values[back] <= values[i] DO','    REMOVE_BACK deque','  ENDWHILE','  ADD_BACK deque, i','  IF front is outside window THEN','    REMOVE_FRONT deque','  ENDIF','  IF i >= 2 THEN WRITE values[front]','ENDFOR'],
    complexity:{best:'O(n)',avg:'O(n)',worst:'O(n)',space:'O(k)'},
    steps:[
      {line:1,title:'Store candidate indices, not every value',message:'The candidate deque starts empty.',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:[]}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:0},operation:{label:'initialize'},status:[{label:'invariant',value:'front is largest',tone:'secondary'}],variables:{i:0},operations:0},
      {line:6,title:'Add index 0 (value 4)',message:'4 is the first maximum candidate.',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v4']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:0},focus:[{id:'v4',label:'front = maximum',tone:'minimum'}],operation:{label:'ADD_BACK i0',end:'back'},variables:{i:0,front:4},operations:1},
      {line:3,title:'Compare back 4 with incoming 2',message:'4 is greater than 2, so 4 can still win a future window.',type:'comparison',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v4']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:1},focus:[{id:'v4',label:'back = 4'}],comparison:{text:'4 ≤ 2',outcome:false},operation:{label:'KEEP back'},variables:{i:1,back:4},operations:1,comparisons:1,boundary:true},
      {line:6,title:'Add 2 behind 4',message:'2 may become useful after 4 leaves a later window.',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v4','v2']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:1},focus:[{id:'v4',label:'maximum',tone:'minimum'},{id:'v2',label:'new back'}],operation:{label:'ADD_BACK i1',end:'back'},variables:{i:1,front:4,back:2},operations:2,comparisons:1},
      {line:3,title:'Incoming 12 dominates back 2',message:'2 can never be a maximum while newer 12 is present.',type:'comparison',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v4','v2']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:2},focus:[{id:'v2',label:'dominated back',tone:'danger'}],comparison:{text:'2 ≤ 12',outcome:true},operation:{label:'REMOVE_BACK 2',end:'back'},variables:{i:2,back:2},operations:2,comparisons:2,boundary:true},
      {line:4,title:'Remove dominated 2',message:'Discard index 1 from the back.',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v4']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:2},focus:[{id:'v4',label:'compare next'}],operation:{label:'REMOVE_BACK i1',end:'back'},variables:{i:2,back:4},operations:3,comparisons:2},
      {line:3,title:'Incoming 12 also dominates 4',message:'4 is older and smaller than 12, so it also cannot win again.',type:'comparison',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v4']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:2},focus:[{id:'v4',label:'dominated back',tone:'danger'}],comparison:{text:'4 ≤ 12',outcome:true},operation:{label:'REMOVE_BACK 4',end:'back'},variables:{i:2,back:4},operations:3,comparisons:3,boundary:true},
      {line:6,title:'Add 12 as the only candidate',message:'After removing smaller backs, index 2 becomes both front and back.',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v12']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:2},focus:[{id:'v12',label:'window maximum',tone:'minimum'}],operation:{label:'ADD_BACK i2',end:'back'},output:['12'],variables:{i:2,front:12},operations:6,comparisons:3},
      {line:3,title:'Incoming 3 does not dominate 12',message:'Keep 12 at the front and add 3 behind it.',type:'comparison',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v12']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:3},focus:[{id:'v12',label:'back = 12'}],comparison:{text:'12 ≤ 3',outcome:false},operation:{label:'KEEP back'},output:['12'],variables:{i:3,back:12},operations:6,comparisons:4,boundary:true},
      {line:6,title:'Add 3 as a future candidate',message:'The deque remains decreasing from front to back: 12, then 3.',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v12','v3']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:3},focus:[{id:'v12',label:'maximum',tone:'minimum'},{id:'v3',label:'new back'}],operation:{label:'ADD_BACK i3',end:'back'},output:['12','12'],variables:{i:3,front:12,back:3},operations:7,comparisons:4},
      {line:10,title:'Front yields each window maximum',message:'The windows [4,2,12] and [2,12,3] both have maximum 12.',type:'return',lanes:[{id:'main',label:'Maximum candidates',kind:'deque',order:['v12','v3']}],input:{label:'Values (window size 3)',tokens:['4','2','12','3'],active:-1},focus:[{id:'v12',label:'front / maximum',tone:'minimum'}],comparison:{text:'deque values decrease front → back',outcome:true},operation:{label:'OUTPUT maxima'},output:['12','12'],status:[{label:'result',value:'[12, 12]',tone:'success'}],variables:{windows:2},operations:7,comparisons:5},
    ],result:{maxima:[12,12]},
  });

  const serviceLane = buildActivity({
    id:'deque-service-lane',topic:'Deques',family:'Deques',exampleKind:'Real world',checkpointId:'m4-queue-deque',
    title:'Priority service lane',subtitle:'Combine routine arrivals, urgent front insertion, and cancellation at the back.',variant:'deque-service-lane',
    entities:[entity('sample-a','Request A'),entity('sample-b','Request B'),entity('urgent-u','URGENT U')],
    source:['lane <- empty','ADD_BACK lane, Request A','ADD_BACK lane, Request B','ADD_FRONT lane, Urgent U','served <- REMOVE_FRONT lane','cancelled <- REMOVE_BACK lane','RETURN lane'],
    complexity:{best:'O(1)',avg:'O(1)',worst:'O(1)',space:'O(n)'},
    steps:[
      {line:1,title:'The lane has a front and a back',message:'Routine arrivals join the back; service leaves from the front.',lanes:[{id:'main',label:'Priority service lane',kind:'deque',order:[]}],operation:{label:'initialize'},status:[{label:'policy',value:'routine → back',tone:'secondary'}],variables:{size:0},operations:0},
      {line:2,title:'Request A arrives normally',message:'A enters at the back and is currently first for service.',lanes:[{id:'main',label:'Priority service lane',kind:'deque',order:['sample-a']}],focus:[{id:'sample-a',label:'front = back'}],operation:{label:'ADD_BACK A',end:'back'},variables:{front:'A',back:'A',size:1},operations:1},
      {line:3,title:'Request B waits behind A',message:'Normal arrivals preserve first-come, first-served order.',lanes:[{id:'main',label:'Priority service lane',kind:'deque',order:['sample-a','sample-b']}],focus:[{id:'sample-a',label:'front',tone:'minimum'},{id:'sample-b',label:'back'}],operation:{label:'ADD_BACK B',end:'back'},variables:{front:'A',back:'B',size:2},operations:2},
      {line:4,title:'Urgent U enters at the front',message:'The explicit urgency rule uses ADD_FRONT; this is what makes a deque useful here.',lanes:[{id:'main',label:'Priority service lane',kind:'deque',order:['urgent-u','sample-a','sample-b']}],focus:[{id:'urgent-u',label:'priority front',tone:'minimum'},{id:'sample-b',label:'back',tone:'secondary'}],operation:{label:'ADD_FRONT U',end:'front'},status:[{label:'exception',value:'urgent → front',tone:'minimum'}],variables:{front:'U',back:'B',size:3},operations:3},
      {line:5,title:'Serve from the front',message:'Urgent U leaves first; A resumes its place at the front.',lanes:[{id:'main',label:'Priority service lane',kind:'deque',order:['sample-a','sample-b']}],held:[{id:'served-u',label:'served',value:'URGENT U',tone:'success'}],focus:[{id:'served-u',label:'served first',where:'held'},{id:'sample-a',label:'new front',tone:'minimum'}],operation:{label:'REMOVE_FRONT',end:'front'},output:['Served U'],variables:{served:'U',front:'A',back:'B',size:2},operations:4},
      {line:6,title:'Cancel the newest routine request',message:'Request B is still at the back, so REMOVE_BACK cancels it directly.',lanes:[{id:'main',label:'Priority service lane',kind:'deque',order:['sample-a']}],held:[{id:'cancelled-b',label:'cancelled',value:'Request B',tone:'danger'}],focus:[{id:'cancelled-b',label:'removed back',where:'held'},{id:'sample-a',label:'remaining'}],operation:{label:'REMOVE_BACK',end:'back'},output:['Served U','Cancelled B'],variables:{cancelled:'B',front:'A',size:1},operations:5},
      {line:7,title:'A remains without being reordered',message:'The deque handled one front exception and one back cancellation while preserving A.',type:'return',lanes:[{id:'main',label:'Priority service lane',kind:'deque',order:['sample-a']}],focus:[{id:'sample-a',label:'front = back',tone:'minimum'}],comparison:{text:'routine relative order preserved',outcome:true},operation:{label:'RETURN lane'},output:['Served U','Cancelled B'],status:[{label:'remaining',value:'Request A',tone:'success'}],variables:{front:'A',back:'A',size:1},operations:5,comparisons:1},
    ],result:{served:'U',cancelled:'B',remaining:['A']},
  });

  const activities = Object.freeze([
    stackBasics, postfix, delimiterAudit, editorUndo,
    queueBasics, roundRobin, printerQueue,
    dequeBasics, slidingWindow, serviceLane,
  ]);

  function register(catalog = ITCC47Activities) {
    return activities.map((activity) => catalog.register(activity));
  }

  return Object.freeze({ activities, register, postfixProgram, delimiterProgram, undoRedoProgram, queueFoundationsProgram, roundRobinProgram });
})();

if (typeof ITCC47Activities !== 'undefined') ITCC47LinearADTActivities.register(ITCC47Activities);
