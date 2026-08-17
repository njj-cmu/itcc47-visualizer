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
      id: spec.id, contentVersion: CONTENT_VERSION, module: 4, topic: spec.topic, family: spec.family,
      title: spec.title, subtitle: spec.subtitle, exampleKind: spec.exampleKind,
      engine: 'curated-linear-adt', renderer: 'linear-adt', teachingVariant: spec.variant,
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
    id: 'stack-lifo-basics', topic: 'Stacks', family: 'Stacks', exampleKind: 'Foundations', checkpointId: 'm4-stack',
    title: 'Push, peek, and pop', subtitle: 'Build the LIFO rule one operation at a time.', variant: 'stack-foundations',
    entities: [entity('plate-a', 'A', 'first pushed'), entity('plate-b', 'B', 'last pushed')],
    source: ['stack <- empty', 'IF stack is empty THEN POP is UNDERFLOW', 'PUSH stack, "A"', 'PUSH stack, "B"', 'topValue <- PEEK stack', 'popped <- POP stack', 'RETURN popped'],
    complexity: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)' },
    steps: [
      { line:1, title:'Start with no top item', message:'Initialize an empty stack.', lanes:[{id:'main',label:'Stack',kind:'stack',order:[]}], operation:{label:'initialize'}, status:[{label:'size',value:0,tone:'muted'}], variables:{size:0}, operations:0 },
      { line:2, title:'Guard the empty case', message:'POP is unavailable while size is 0; detecting underflow happens before reading a top item.', type:'comparison', lanes:[{id:'main',label:'Stack',kind:'stack',order:[]}], comparison:{text:'POP allowed when size = 0',outcome:false}, operation:{label:'UNDERFLOW guard'}, status:[{label:'top',value:'none',tone:'danger'}], variables:{size:0}, operations:0, comparisons:1, boundary:true },
      { line:3, title:'Push A onto the top', message:'PUSH adds A at the only legal insertion end: the top.', lanes:[{id:'main',label:'Stack',kind:'stack',order:['plate-a']}], focus:[{id:'plate-a',label:'new top'}], operation:{label:'PUSH A',end:'top'}, status:[{label:'size',value:1,tone:'success'}], variables:{top:'A',size:1}, operations:1, comparisons:1 },
      { line:4, title:'Push B above A', message:'B becomes the top; A stays underneath it.', lanes:[{id:'main',label:'Stack',kind:'stack',order:['plate-a','plate-b']}], focus:[{id:'plate-b',label:'top'}], operation:{label:'PUSH B',end:'top'}, status:[{label:'LIFO next',value:'B',tone:'minimum'}], variables:{top:'B',size:2}, operations:2, comparisons:1 },
      { line:5, title:'Peek without removing', message:'PEEK reads B while the stack remains unchanged.', type:'comparison', lanes:[{id:'main',label:'Stack',kind:'stack',order:['plate-a','plate-b']}], focus:[{id:'plate-b',label:'peeked top',tone:'minimum'}], comparison:{text:'size before = size after',outcome:true}, operation:{label:'PEEK',end:'top'}, held:[{id:'peek-b',label:'topValue',value:'B',tone:'minimum'}], variables:{topValue:'B',size:2}, operations:3, comparisons:2, boundary:true },
      { line:6, title:'Pop the most recent item', message:'POP removes B first because B was pushed last.', lanes:[{id:'main',label:'Stack',kind:'stack',order:['plate-a']}], focus:[{id:'pop-b',label:'popped',where:'held',value:'B',tone:'danger'}], operation:{label:'POP',end:'top'}, held:[{id:'pop-b',label:'popped',value:'B',tone:'danger'}], status:[{label:'new top',value:'A',tone:'success'}], output:['B'], variables:{popped:'B',top:'A',size:1}, operations:4, comparisons:2 },
      { line:7, title:'Return the popped value', message:'The result is B; A remains on the stack.', type:'return', lanes:[{id:'main',label:'Stack',kind:'stack',order:['plate-a']}], focus:[{id:'plate-a',label:'remaining top',tone:'secondary'}], operation:{label:'RETURN B'}, output:['B'], status:[{label:'rule',value:'last in, first out',tone:'success'}], variables:{popped:'B',size:1}, operations:4, comparisons:2 },
    ], result:{ popped:'B' },
  });

  const postfix = buildActivity({
    id: 'stack-postfix-evaluator', topic: 'Stacks', family: 'Stacks', exampleKind: 'Math resolver', checkpointId: 'm4-stack',
    title: 'Evaluate a postfix expression', subtitle: 'Resolve 5 2 + 3 × by stacking operands and applying operators.', variant: 'stack-postfix',
    entities: [entity('n5','5'),entity('n2','2'),entity('sum7','7','5 + 2'),entity('n3','3'),entity('product21','21','7 × 3')],
    input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:0},
    source:['stack <- empty','FOR each token IN [5, 2, +, 3, ×] DO','  IF token is a number THEN','    PUSH stack, token','  ELSE','    right <- POP stack','    left <- POP stack','    PUSH stack, APPLY(token, left, right)','  ENDIF','ENDFOR','RETURN POP stack'],
    complexity:{best:'O(n)',avg:'O(n)',worst:'O(n)',space:'O(n)'},
    steps:[
      {line:1,title:'Prepare an operand stack',message:'The operand stack starts empty.',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:[]}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:0},operation:{label:'initialize'},variables:{size:0},operations:0},
      {line:4,title:'Number: push 5',message:'5 is an operand, so push it.',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:['n5']}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:0},focus:[{id:'n5',label:'operand'}],operation:{label:'PUSH 5',end:'top'},variables:{token:5,size:1},operations:1},
      {line:4,title:'Number: push 2',message:'2 is also an operand; it becomes the new top.',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:['n5','n2']}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:1},focus:[{id:'n2',label:'top / right'}],operation:{label:'PUSH 2',end:'top'},variables:{token:2,size:2},operations:2},
      {line:5,title:'Operator: resolve +',message:'+ needs two operands, so switch from pushing to popping.',type:'comparison',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:['n5','n2']}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:2},focus:[{id:'n2',label:'top'}],comparison:{text:'token is a number',outcome:false},operation:{label:'operator +'},variables:{token:'+',size:2},operations:2,comparisons:1,boundary:true},
      {line:6,title:'Pop the right operand first',message:'POP gives right = 2. Operand order matters for subtraction and division.',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:['n5']}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:2},focus:[{id:'right2',label:'right',where:'held',value:2}],held:[{id:'right2',label:'right operand',value:2,tone:'primary'}],operation:{label:'POP right',end:'top'},variables:{right:2,size:1},operations:3,comparisons:1},
      {line:7,title:'Pop the left operand second',message:'The next POP gives left = 5.',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:[]}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:2},focus:[{id:'left5',label:'left',where:'held',value:5},{id:'right2',label:'right',where:'held',value:2}],held:[{id:'left5',label:'left operand',value:5,tone:'secondary'},{id:'right2',label:'right operand',value:2,tone:'primary'}],operation:{label:'POP left',end:'top'},variables:{left:5,right:2,size:0},operations:4,comparisons:1},
      {line:8,title:'Compute and push 7',message:'Apply 5 + 2, then push the intermediate result 7.',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:['sum7']}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:2},focus:[{id:'sum7',label:'5 + 2',tone:'minimum'}],operation:{label:'PUSH result',end:'top'},variables:{result:7,size:1},operations:5,comparisons:1},
      {line:4,title:'Number: push 3',message:'Advance to 3 and push it above 7.',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:['sum7','n3']}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:3},focus:[{id:'n3',label:'top / right'}],operation:{label:'PUSH 3',end:'top'},variables:{token:3,size:2},operations:6,comparisons:1},
      {line:5,title:'Operator: resolve ×',message:'× again consumes the top two operands.',type:'comparison',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:['sum7','n3']}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:4},focus:[{id:'n3',label:'right'},{id:'sum7',label:'left',tone:'secondary'}],comparison:{text:'enough operands (size ≥ 2)',outcome:true},operation:{label:'APPLY ×'},variables:{left:7,right:3,size:2},operations:6,comparisons:2,boundary:true},
      {line:8,title:'Replace operands with 21',message:'POP 3 and 7, compute 7 × 3, and push 21.',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:['product21']}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:4},focus:[{id:'product21',label:'7 × 3',tone:'minimum'}],operation:{label:'PUSH result',end:'top'},variables:{result:21,size:1},operations:9,comparisons:2},
      {line:11,title:'One value is the answer',message:'After every token, exactly one value remains. POP and return 21.',type:'return',lanes:[{id:'main',label:'Operand stack',kind:'stack',order:[]}],input:{label:'Postfix tokens',tokens:['5','2','+','3','×'],active:-1},focus:[{id:'answer21',label:'answer',where:'held',value:21,tone:'minimum'}],held:[{id:'answer21',label:'answer',value:21,tone:'minimum'}],operation:{label:'RETURN 21'},comparison:{text:'final stack size = 1',outcome:true},output:['21'],variables:{answer:21,size:0},operations:10,comparisons:3},
    ], result:{ value:21 },
  });

  const delimiterAudit = buildActivity({
    id:'stack-delimiter-audit',topic:'Stacks',family:'Stacks',exampleKind:'Parser application',checkpointId:'m4-stack',
    title:'Audit nested delimiters',subtitle:'Match ([{}]) by comparing every closer with the stack top.',variant:'stack-audit',
    entities:[entity('open-paren','('),entity('open-bracket','['),entity('open-brace','{')],
    input:{label:'Source characters',tokens:['(', '[', '{', '}', ']', ')'],active:0},
    source:['stack <- empty','FOR each token IN source DO','  IF token is an opener THEN','    PUSH stack, token','  ELSE','    IF stack is empty OR top does not match token THEN','      RETURN INVALID','    ENDIF','    POP stack','  ENDIF','ENDFOR','RETURN stack is empty'],
    complexity:{best:'O(1)',avg:'O(n)',worst:'O(n)',space:'O(n)'},
    steps:[
      {line:1,title:'Begin with an empty parser stack',message:'No opening delimiter is waiting for a match.',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:[]}],operation:{label:'initialize'},variables:{size:0},operations:0},
      {line:4,title:'Push (',message:'An opener cannot be resolved yet, so save it.',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:['open-paren']}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:0},focus:[{id:'open-paren',label:'waiting opener'}],operation:{label:'PUSH (',end:'top'},variables:{token:'(',size:1},operations:1},
      {line:4,title:'Push [',message:'The nested [ must close before the earlier ( can close.',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:['open-paren','open-bracket']}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:1},focus:[{id:'open-bracket',label:'top'}],operation:{label:'PUSH [',end:'top'},variables:{token:'[',size:2},operations:2},
      {line:4,title:'Push {',message:'The innermost { becomes the next required match.',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:['open-paren','open-bracket','open-brace']}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:2},focus:[{id:'open-brace',label:'top'}],operation:{label:'PUSH {',end:'top'},variables:{token:'{',size:3},operations:3},
      {line:6,title:'Compare } with the top',message:'} matches the most recent unmatched opener {.',type:'comparison',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:['open-paren','open-bracket','open-brace']}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:3},focus:[{id:'open-brace',label:'top = {'}],comparison:{text:'MATCH({, })',outcome:true},operation:{label:'PEEK top'},variables:{token:'}',top:'{'},operations:4,comparisons:1,boundary:true},
      {line:9,title:'Pop the matched {',message:'Remove { because its closing } has been consumed.',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:['open-paren','open-bracket']}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:3},focus:[{id:'open-bracket',label:'new top'}],operation:{label:'POP {',end:'top'},variables:{size:2},operations:5,comparisons:1},
      {line:6,title:'Compare ] with the top',message:'] matches [ at the top; the older ( remains protected below.',type:'comparison',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:['open-paren','open-bracket']}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:4},focus:[{id:'open-bracket',label:'top = ['}],comparison:{text:'MATCH([, ])',outcome:true},operation:{label:'PEEK top'},variables:{token:']',top:'['},operations:6,comparisons:2,boundary:true},
      {line:9,title:'Pop the matched [',message:'Remove [ after consuming ].',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:['open-paren']}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:4},focus:[{id:'open-paren',label:'new top'}],operation:{label:'POP [',end:'top'},variables:{size:1},operations:7,comparisons:2},
      {line:6,title:'Compare ) with the top',message:') matches the oldest opener (, now exposed at the top.',type:'comparison',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:['open-paren']}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:5},focus:[{id:'open-paren',label:'top = ('}],comparison:{text:'MATCH((, ))',outcome:true},operation:{label:'PEEK top'},variables:{token:')',top:'('},operations:8,comparisons:3,boundary:true},
      {line:9,title:'Pop the matched (',message:'The final pair closes, leaving no unmatched opener.',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:[]}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:5},operation:{label:'POP (',end:'top'},variables:{size:0},operations:9,comparisons:3},
      {line:12,title:'Accept only an empty final stack',message:'Every closer matched in the correct nesting order, so the source is VALID.',type:'return',lanes:[{id:'main',label:'Unmatched openers',kind:'stack',order:[]}],input:{label:'Source characters',tokens:['(','[','{','}',']',')'],active:-1},comparison:{text:'stack is empty',outcome:true},operation:{label:'RETURN VALID'},status:[{label:'result',value:'VALID',tone:'success'}],output:['VALID'],variables:{size:0},operations:9,comparisons:4},
    ],result:{valid:true},
  });

  const editorUndo = buildActivity({
    id:'stack-editor-undo',topic:'Stacks',family:'Stacks',exampleKind:'Real world',checkpointId:'m4-stack',
    title:'Undo and redo an edit',subtitle:'Coordinate two stacks without losing the command being transferred.',variant:'two-stack-history',
    entities:[entity('cmd-a','Type A'),entity('cmd-b','Type B')],
    source:['undo <- [Type A, Type B]','redo <- empty','command <- POP undo','APPLY inverse(command)','PUSH redo, command','command <- POP redo','APPLY command','PUSH undo, command','RETURN document'],
    complexity:{best:'O(1)',avg:'O(1)',worst:'O(1)',space:'O(n)'},
    steps:[
      {line:1,title:'History ends with the latest command',message:'Type B is above Type A on the undo stack.',lanes:[{id:'undo',label:'Undo stack',kind:'stack',order:['cmd-a','cmd-b']},{id:'redo',label:'Redo stack',kind:'stack',order:[]}],focus:[{id:'cmd-b',label:'next undo'}],operation:{label:'document = AB'},status:[{label:'document',value:'AB',tone:'secondary'}],variables:{document:'AB'},operations:0},
      {line:3,title:'Pop the command to undo',message:'Remove Type B from undo, but hold its identity for the redo stack.',lanes:[{id:'undo',label:'Undo stack',kind:'stack',order:['cmd-a']},{id:'redo',label:'Redo stack',kind:'stack',order:[]}],held:[{id:'held-b',label:'command',value:'Type B',tone:'primary'}],focus:[{id:'held-b',label:'transferring',where:'held'}],operation:{label:'POP undo',end:'top'},variables:{command:'Type B',document:'AB'},operations:1},
      {line:4,title:'Apply the inverse command',message:'Undo Type B, changing the document from AB back to A.',lanes:[{id:'undo',label:'Undo stack',kind:'stack',order:['cmd-a']},{id:'redo',label:'Redo stack',kind:'stack',order:[]}],held:[{id:'held-b',label:'command',value:'Type B',tone:'primary'}],focus:[{id:'held-b',label:'inverse applied',where:'held'}],operation:{label:'DELETE B'},status:[{label:'document',value:'A',tone:'minimum'}],variables:{command:'Type B',document:'A'},operations:2},
      {line:5,title:'Save the command for redo',message:'Push the same Type B command onto redo; do not create a different command.',lanes:[{id:'undo',label:'Undo stack',kind:'stack',order:['cmd-a']},{id:'redo',label:'Redo stack',kind:'stack',order:['cmd-b']}],focus:[{id:'cmd-b',label:'redo top',tone:'minimum'}],operation:{label:'PUSH redo',end:'top'},status:[{label:'document',value:'A',tone:'secondary'}],variables:{document:'A'},operations:3},
      {line:6,title:'Redo pops from the other stack',message:'POP Type B from redo and hold it before applying it again.',lanes:[{id:'undo',label:'Undo stack',kind:'stack',order:['cmd-a']},{id:'redo',label:'Redo stack',kind:'stack',order:[]}],held:[{id:'held-b',label:'command',value:'Type B',tone:'primary'}],focus:[{id:'held-b',label:'redo command',where:'held'}],operation:{label:'POP redo',end:'top'},variables:{command:'Type B',document:'A'},operations:4},
      {line:7,title:'Reapply Type B',message:'The document returns to AB.',lanes:[{id:'undo',label:'Undo stack',kind:'stack',order:['cmd-a']},{id:'redo',label:'Redo stack',kind:'stack',order:[]}],held:[{id:'held-b',label:'command',value:'Type B',tone:'primary'}],focus:[{id:'held-b',label:'reapplied',where:'held'}],operation:{label:'TYPE B'},status:[{label:'document',value:'AB',tone:'success'}],variables:{document:'AB'},operations:5},
      {line:8,title:'Restore the undo history',message:'Push Type B back onto undo so another undo remains possible.',lanes:[{id:'undo',label:'Undo stack',kind:'stack',order:['cmd-a','cmd-b']},{id:'redo',label:'Redo stack',kind:'stack',order:[]}],focus:[{id:'cmd-b',label:'undo top'}],operation:{label:'PUSH undo',end:'top'},variables:{document:'AB'},operations:6},
      {line:9,title:'Both histories are consistent',message:'Return AB with Type B once again at the top of undo and redo empty.',type:'return',lanes:[{id:'undo',label:'Undo stack',kind:'stack',order:['cmd-a','cmd-b']},{id:'redo',label:'Redo stack',kind:'stack',order:[]}],focus:[{id:'cmd-b',label:'next undo'}],operation:{label:'RETURN AB'},comparison:{text:'command identity preserved',outcome:true},output:['AB'],variables:{document:'AB'},operations:6,comparisons:1},
    ],result:{document:'AB'},
  });

  const queueBasics = buildActivity({
    id:'queue-fifo-basics',topic:'Queues',family:'Queues',exampleKind:'Foundations',checkpointId:'m4-queue-deque',
    title:'Enqueue, front, and dequeue',subtitle:'See why the earliest arrival leaves first.',variant:'queue-foundations',
    entities:[entity('ticket-a','A','first arrival'),entity('ticket-b','B'),entity('ticket-c','C'),entity('ticket-d','D','wraparound arrival')],
    source:['queue <- empty with capacity 3','IF queue is empty THEN DEQUEUE is UNDERFLOW','ENQUEUE queue, "A"','ENQUEUE queue, "B"','ENQUEUE queue, "C"','next <- FRONT queue','served <- DEQUEUE queue','ENQUEUE queue, "D" AT (back + 1) MOD 3','RETURN queue'],
    complexity:{best:'O(1)',avg:'O(1)',worst:'O(1)',space:'O(n)'},
    steps:[
      {line:1,title:'Start with an empty queue',message:'Front and back do not point to an item yet.',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:[]}],operation:{label:'initialize'},variables:{size:0},operations:0},
      {line:2,title:'Guard the empty case',message:'DEQUEUE and FRONT require size > 0; otherwise the operation reports underflow.',type:'comparison',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:[]}],comparison:{text:'DEQUEUE allowed when size = 0',outcome:false},operation:{label:'UNDERFLOW guard',end:'front'},variables:{size:0,frontIndex:-1,backIndex:-1},operations:0,comparisons:1,boundary:true},
      {line:3,title:'A arrives at the back',message:'The first item is both front and back.',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:['ticket-a']}],focus:[{id:'ticket-a',label:'front = back'}],operation:{label:'ENQUEUE A',end:'back'},variables:{front:'A',back:'A',frontIndex:0,backIndex:0,size:1},operations:1,comparisons:1},
      {line:4,title:'B joins behind A',message:'ENQUEUE never cuts in front of an earlier arrival.',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:['ticket-a','ticket-b']}],focus:[{id:'ticket-b',label:'new back'}],operation:{label:'ENQUEUE B',end:'back'},variables:{front:'A',back:'B',frontIndex:0,backIndex:1,size:2},operations:2,comparisons:1},
      {line:5,title:'C becomes the back',message:'The service order is now A, then B, then C.',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:['ticket-a','ticket-b','ticket-c']}],focus:[{id:'ticket-a',label:'front',tone:'minimum'},{id:'ticket-c',label:'back',tone:'secondary'}],operation:{label:'ENQUEUE C',end:'back'},variables:{front:'A',back:'C',frontIndex:0,backIndex:2,size:3},operations:3,comparisons:1},
      {line:6,title:'Read the front without removal',message:'FRONT returns A and leaves all three items in place.',type:'comparison',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:['ticket-a','ticket-b','ticket-c']}],focus:[{id:'ticket-a',label:'next'}],held:[{id:'peek-a',label:'next',value:'A',tone:'minimum'}],comparison:{text:'size before = size after',outcome:true},operation:{label:'FRONT',end:'front'},variables:{next:'A',frontIndex:0,backIndex:2,size:3},operations:4,comparisons:2,boundary:true},
      {line:7,title:'Dequeue the earliest arrival',message:'A leaves from the front; B becomes the new front at physical index 1.',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:['ticket-b','ticket-c']}],focus:[{id:'served-a',label:'served',where:'held',value:'A',tone:'danger'},{id:'ticket-b',label:'new front',tone:'minimum'}],held:[{id:'served-a',label:'served',value:'A',tone:'danger'}],operation:{label:'DEQUEUE',end:'front'},output:['A'],variables:{served:'A',front:'B',back:'C',frontIndex:1,backIndex:2,size:2},operations:5,comparisons:2},
      {line:8,title:'Back wraps from index 2 to index 0',message:'D joins after C logically even though its circular-array slot wraps to 0.',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:['ticket-b','ticket-c','ticket-d']}],focus:[{id:'ticket-b',label:'front',tone:'minimum'},{id:'ticket-d',label:'back at slot 0',tone:'secondary'}],comparison:{text:'(2 + 1) MOD 3 = 0',outcome:true},operation:{label:'ENQUEUE D',end:'back'},output:['A'],status:[{label:'logical order',value:'B → C → D',tone:'success'}],variables:{front:'B',back:'D',frontIndex:1,backIndex:0,size:3},operations:6,comparisons:3,boundary:true},
      {line:9,title:'FIFO order survives wraparound',message:'Physical indices wrapped, but B is still the next logical front.',type:'return',lanes:[{id:'main',label:'FIFO queue',kind:'queue',order:['ticket-b','ticket-c','ticket-d']}],focus:[{id:'ticket-b',label:'next'}],operation:{label:'RETURN queue'},status:[{label:'rule',value:'first in, first out',tone:'success'}],output:['A'],variables:{front:'B',back:'D',frontIndex:1,backIndex:0,size:3},operations:6,comparisons:3},
    ],result:{served:'A',remaining:['B','C','D']},
  });

  const roundRobin = buildActivity({
    id:'queue-round-robin',topic:'Queues',family:'Queues',exampleKind:'Scheduling algorithm',checkpointId:'m4-queue-deque',
    title:'Round-robin CPU scheduling',subtitle:'Serve one time slice, then re-enqueue unfinished work.',variant:'queue-round-robin',
    entities:[entity('process-a','P1 · 5 ms'),entity('process-b','P2 · 2 ms'),entity('process-a2','P1 · 3 ms','remaining work')],
    source:['ready <- [P1:5, P2:2]','quantum <- 2','process <- DEQUEUE ready','RUN process FOR MIN(quantum, remaining)','remaining <- remaining - quantum','IF remaining > 0 THEN','  ENQUEUE ready, process','ENDIF','RETURN ready'],
    complexity:{best:'O(1) per slice',avg:'O(1) per slice',worst:'O(k) slices',space:'O(n)'},
    steps:[
      {line:1,title:'Ready queue preserves arrival order',message:'P1 is at the front; P2 waits behind it.',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-a','process-b']}],focus:[{id:'process-a',label:'front / next'}],operation:{label:'initialize'},status:[{label:'quantum',value:'2 ms',tone:'secondary'}],variables:{front:'P1',quantum:2},operations:0},
      {line:3,title:'Dispatch P1 from the front',message:'DEQUEUE P1 for one CPU time slice.',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-b']}],held:[{id:'running-p1',label:'running',value:'P1 · 5 ms',tone:'primary'}],focus:[{id:'running-p1',label:'CPU',where:'held'}],operation:{label:'DEQUEUE P1',end:'front'},variables:{process:'P1',remaining:5},operations:1},
      {line:4,title:'Run only one quantum',message:'P1 uses 2 ms; the scheduler must not let it monopolize the CPU.',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-b']}],held:[{id:'running-p1',label:'running',value:'P1 · 3 ms left',tone:'primary'}],focus:[{id:'running-p1',label:'after slice',where:'held'}],operation:{label:'RUN 2 ms'},status:[{label:'remaining',value:'3 ms',tone:'minimum'}],variables:{process:'P1',remaining:3},operations:2},
      {line:6,title:'Check whether P1 is finished',message:'P1 still has 3 ms, so it must return to the queue.',type:'comparison',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-b']}],held:[{id:'running-p1',label:'running',value:'P1 · 3 ms left',tone:'primary'}],focus:[{id:'running-p1',label:'unfinished',where:'held'}],comparison:{text:'remaining > 0',outcome:true},operation:{label:'CHECK remaining'},variables:{remaining:3},operations:2,comparisons:1,boundary:true},
      {line:7,title:'Re-enqueue unfinished P1',message:'P1 moves to the back, giving P2 its turn.',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-b','process-a2']}],focus:[{id:'process-b',label:'new front',tone:'minimum'},{id:'process-a2',label:'re-enqueued back'}],operation:{label:'ENQUEUE P1',end:'back'},variables:{front:'P2',back:'P1'},operations:3,comparisons:1},
      {line:3,title:'Dispatch P2 next',message:'P2 has waited at the front and now receives the CPU.',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-a2']}],held:[{id:'running-p2',label:'running',value:'P2 · 2 ms',tone:'primary'}],focus:[{id:'running-p2',label:'CPU',where:'held'}],operation:{label:'DEQUEUE P2',end:'front'},variables:{process:'P2',remaining:2},operations:4,comparisons:1},
      {line:4,title:'P2 finishes in one quantum',message:'P2 needs exactly 2 ms, so no work remains.',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-a2']}],held:[{id:'done-p2',label:'completed',value:'P2',tone:'success'}],focus:[{id:'done-p2',label:'complete',where:'held'}],operation:{label:'RUN 2 ms'},status:[{label:'remaining',value:'0 ms',tone:'success'}],output:['P2 completed'],variables:{process:'P2',remaining:0},operations:5,comparisons:1},
      {line:6,title:'Do not re-enqueue completed work',message:'remaining > 0 is false, so P2 leaves the system.',type:'comparison',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-a2']}],focus:[{id:'process-a2',label:'next process'}],comparison:{text:'remaining > 0',outcome:false},operation:{label:'SKIP enqueue'},output:['P2 completed'],variables:{remaining:0,front:'P1'},operations:5,comparisons:2,boundary:true},
      {line:9,title:'P1 is ready for its next turn',message:'Return the ready queue with P1 at the front and 3 ms remaining.',type:'return',lanes:[{id:'main',label:'Ready queue',kind:'queue',order:['process-a2']}],focus:[{id:'process-a2',label:'front / next',tone:'minimum'}],operation:{label:'RETURN ready'},output:['P2 completed'],variables:{front:'P1',remaining:3},operations:5,comparisons:2},
    ],result:{ready:['P1'],completed:['P2']},
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

  return Object.freeze({ activities, register });
})();

if (typeof ITCC47Activities !== 'undefined') ITCC47LinearADTActivities.register(ITCC47Activities);
