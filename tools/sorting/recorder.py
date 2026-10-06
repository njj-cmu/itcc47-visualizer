"""Time-specific sorting observations, separate from the read-only recursion schema."""
import ast
import copy
import io

from source import UNBOUND, json_text, source_map


class TeachingLimit(Exception):
    pass


class Recorder:
    def __init__(self, program, mode, fixture, source, tree, max_events=2500, max_depth=32, audit=False):
        self.program, self.mode, self.fixture = program, mode, fixture
        self.spans, self.functions = source_map(tree, source)
        self.nodes = {node.lineno: node for node in ast.walk(tree) if isinstance(node, ast.stmt) and not isinstance(node, ast.FunctionDef)}
        self.events, self.heaps, self.items, self.objects, self.object_ids = [], [], {}, {}, {}
        self.stack, self.history, self.observations = [], [], []
        self.driver = {'id': 'driver', 'function': 'driver', 'line': None, 'locals': {}, 'pending': None, 'returnValue': UNBOUND}
        guard = next(node for node in tree.body if isinstance(node, ast.If))
        self.driver_names = sorted({node.id for statement in guard.body for node in ast.walk(statement)
                                    if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store)})
        self.counts = dict.fromkeys(['keyComparisons', 'resultAppends', 'swapStatements', 'selfSwaps', 'exchanges',
                                   'sortCalls', 'helperCalls', 'peakFunctionDepth', 'peakSortDepth'], 0)
        self.output, self.fixed, self.original_ids = io.StringIO(), {}, []
        self.max_events, self.max_depth, self.audit = max_events, max_depth, audit
        self.heap_key, self.last_result, self.transfer = None, UNBOUND, None
        self.operands, self.started, self.call_serial = {}, False, 0

    @property
    def current(self):
        return self.stack[-1] if self.stack else self.driver

    def register(self, values, ids):
        key = id(values)
        if key in self.object_ids:
            return self.object_ids[key]
        oid = 'list-' + str(len(self.objects) + 1)
        self.object_ids[key] = oid
        self.objects[oid] = {'value': values, 'ids': list(ids)}  # Retain, never export Python addresses.
        return oid

    def object_id(self, values):
        if id(values) not in self.object_ids:
            if values:
                raise ValueError('An unobserved nonempty list cannot acquire guessed provenance.')
            self.register(values, [])
        return self.object_ids[id(values)]

    def ids(self, values):
        return self.objects[self.object_id(values)]['ids']

    def tag(self, value):
        if value is None:
            return {'kind': 'NONE'}
        if type(value) is bool:
            return {'kind': 'BOOLEAN', 'value': value}
        if type(value) is int:
            return {'kind': 'INTEGER', 'value': value}
        if type(value) is list:
            return {'kind': 'REFERENCE', 'objectId': self.object_id(value)}
        raise ValueError('Unsupported local value.')

    def bindings(self, call):
        names = self.functions[call['function']]['locals'] if call['function'] != 'driver' else self.driver_names
        return {name: self.tag(call['locals'][name]) if name in call['locals'] else UNBOUND for name in names}

    def call_snapshot(self, call):
        return {key: copy.deepcopy(call.get(key)) for key in ('id', 'function', 'parent', 'callSite', 'line', 'pending', 'returnValue')} | {
            'locals': self.bindings(call), 'status': call.get('status') or ('executing' if call is self.current else 'waiting')}

    def heap(self):
        result = {}
        for oid, obj in self.objects.items():
            if obj['value'] != [self.items[item]['value'] for item in obj['ids']]:
                raise ValueError('Observed Python mutation and occurrence provenance disagree.')
            result[oid] = list(obj['ids'])
        key = json_text(result)
        if key != self.heap_key:
            self.heaps.append(result)
            self.heap_key = key
        return len(self.heaps) - 1

    def sync(self, line, local):
        call = self.current
        call['line'] = line or call['line']
        names = self.functions[call['function']]['locals'] if call['function'] != 'driver' else ('values', 'left', 'right', 'answer', 'pivot_index')
        call['locals'] = {name: local[name] for name in names if name in local}
        return call

    def emit(self, kind, message, line=None, phase='after', focus=None, operation=None, force=False):
        if len(self.events) >= self.max_events and not force:
            raise TeachingLimit('The bounded sorting trace event limit was reached.')
        call = focus or self.current
        line = line or call['line']
        current = self.call_snapshot(call)
        source = None if kind == 'COMPLETE' else {**self.spans.get(str(line), {'line': line, 'endLine': line, 'column': 0}),
                                                'owner': call['function'], 'callId': call['id'], 'phase': phase}
        frame = {'heapVersion': self.heap(), 'focus': current, 'stack': [self.call_snapshot(row) for row in self.stack],
                 'driver': self.call_snapshot(self.driver), 'history': list(self.history),
                 'originalIds': list(self.original_ids), 'fixed': {key: self.fixed[key] for key in sorted(self.fixed, key=int)}, 'stdout': self.output.getvalue(),
                 'returnTransfer': copy.deepcopy(self.transfer), 'callResult': copy.deepcopy(self.last_result),
                 'comparison': copy.deepcopy(call.get('comparison')), 'operation': copy.deepcopy(operation),
                 'partition': copy.deepcopy(call.get('partition')), 'outcome': 'completed' if kind == 'COMPLETE' else 'running'}
        event = {'eventId': 'event-' + str(len(self.events)), 'kind': kind, 'source': source, 'message': message,
                 'frame': frame, 'metrics': dict(self.counts)}
        self.events.append(event)
        return event

    def observe(self, line, local, phase):
        if self.audit:
            names = self.functions[self.current['function']]['locals'] if self.stack else ('values', 'left', 'right', 'answer', 'pivot_index')
            self.observations.append({'callId': self.current['id'], 'line': line, 'phase': phase,
                                      'locals': copy.deepcopy({key: local[key] for key in names if key in local})})

    def enter(self, function, line, local):
        if len(self.stack) >= self.max_depth:
            raise TeachingLimit('The bounded sorting call-depth limit was reached (not Python RecursionError).')
        parent = self.current
        self.call_serial += 1
        call = {'id': 'call-' + str(self.call_serial), 'function': function, 'parent': parent['id'],
                'callSite': parent['line'], 'line': line, 'locals': dict(local), 'pending': None, 'returnValue': UNBOUND}
        self.stack.append(call)
        sort = function in ('merge_sort', 'quick_sort')
        self.counts['sortCalls' if sort else 'helperCalls'] += 1
        self.counts['peakFunctionDepth'] = max(self.counts['peakFunctionDepth'], len(self.stack))
        self.counts['peakSortDepth'] = max(self.counts['peakSortDepth'], sum(row['function'] in ('merge_sort', 'quick_sort') for row in self.stack))
        self.transfer = None
        self.emit('ENTER_CALL', ('Sort this smaller problem.' if sort else 'Merge two sorted runs.' if function == 'merge' else 'Partition this inclusive range.'), line, 'entry')

    def before(self, line, local):
        call = self.sync(line, local)
        self.observe(line, local, 'before')
        node = self.nodes[line]
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id in self.functions:
            call['pending'] = {'target': node.targets[0].id, 'line': line}
            self.emit('CALL_PENDING', 'Wait for the called function before assigning ' + node.targets[0].id + '.', line, 'before')
        elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id in self.functions:
            self.emit('CALL_PENDING', 'Run the next range; it excludes the fixed pivot.', line, 'before')
        elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute):
            source = node.value.args[0].value.id
            pointer = 'i' if source == 'left' else 'j'
            index = local[pointer]
            item = self.ids(local[source])[index]
            operation = {'container': self.object_id(local['result']), 'sourceContainer': self.object_id(local[source]),
                         'source': source, 'sourceIndex': index, 'targetIndex': len(local['result']), 'itemId': item}
            call['append'] = operation
            draining = local.get('i', 0) >= len(local['left']) or local.get('j', 0) >= len(local['right'])
            if draining:
                call['comparison'] = None  # Draining is not another comparison.
            self.emit('DRAIN_REMAINDER' if draining else 'APPEND_PENDING',
                      ('One run is exhausted. Copy the remaining ' if draining else 'Append the chosen ') + source + ' value ' + str(local[source][index]) + '.', line, 'before', operation=operation)
        elif isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Tuple):
            final = isinstance(node.targets[0].elts[0].slice, ast.BinOp)
            a, b = (local['i'] + 1, local['high']) if final else (local['i'], local['j'])
            call['swap'] = {'a': a, 'b': b, 'final': final, 'container': self.object_id(local['values']),
                            'items': [self.ids(local['values'])[a], self.ids(local['values'])[b]]}
            self.emit('PIVOT_PENDING' if final else 'SWAP_PENDING',
                      ('Place the pivot at index ' + str(a) + '.' if final else 'Exchange positions ' + str(a) + ' and ' + str(b) + '.'), line, 'before', operation=call['swap'])

    def after(self, line, local):
        call = self.sync(line, local)
        node = self.nodes[line]
        function = call['function']
        if function == 'driver' and isinstance(node, ast.Assign) and isinstance(node.value, ast.List):
            name = node.targets[0].id
            ids = []
            for index, value in enumerate(local[name]):
                item = name + '-' + str(index)
                labels = self.fixture.get('occurrenceLabels', [])
                label = labels[index] if name == 'values' and index < len(labels) else ('L' if name == 'left' else 'R') if self.fixture['id'] == 'equal-heads' else ''
                self.items[item] = {'id': item, 'value': value, 'label': label}
                ids.append(item)
            self.original_ids.append(self.register(local[name], ids))
            if name != 'left':
                self.started = True
                self.emit('INITIAL', 'The input is ready. Step to run the selected Python program.', line)
        elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute):
            operation = call['append']
            self.objects[operation['container']]['ids'].append(operation['itemId'])
            self.counts['resultAppends'] += 1
            self.emit('APPEND_VALUE', 'Appended ' + str(self.items[operation['itemId']]['value']) + ' at output index ' + str(operation['targetIndex']) + '; advance the source pointer next.', line, operation=operation)
        elif isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Tuple):
            operation = call['swap']
            ids = self.objects[operation['container']]['ids']
            a, b = operation['a'], operation['b']
            ids[a], ids[b] = ids[b], ids[a]
            self.counts['swapStatements'] += 1
            self.counts['selfSwaps' if a == b else 'exchanges'] += 1
            call['partition']['committedI'] = local['i']
            call['partition']['pending'] = False
            call['partition']['nextUnexamined'] = local.get('j', local['low'] - 1) + 1
            if operation['final']:
                self.fixed[str(a)] = ids[a]
                call['partition']['placed'] = a
                kind, message = 'PIVOT_PLACE', 'Pivot ' + str(local['pivot']) + ' is fixed at index ' + str(a) + '. The two sides are not necessarily sorted.' + (' Already in position: self-swap.' if a == b else '')
            elif a == b:
                kind, message = 'SELF_SWAP', 'Already in the correct region — the self-swap executes without exchanging positions.'
            else:
                kind, message = 'SWAP_COMMIT', 'Swapped positions ' + str(a) + ' and ' + str(b) + '; the boundary is now committed.'
            self.emit(kind, message, line, operation=operation)
        elif isinstance(node, ast.AugAssign):
            name = node.target.id
            if function == 'partition':
                call['partition']['pending'] = True
                self.emit('BOUNDARY_ADVANCE_PENDING', 'i is now ' + str(local['i']) + ': new boundary target, swap pending. The array has not changed.', line)
            else:
                self.emit('ADVANCE_POINTER', 'Advance ' + name + ' to ' + str(local[name]) + '; the appended source value stays in its input run.', line)
        elif isinstance(node, ast.Assign):
            target = node.targets[0].id
            if isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id in self.functions:
                call['pending'] = None
                self.emit('ASSIGN_RESULT', target + ' now receives the returned value; the assignment has completed.', line)
                self.transfer = None
            elif function == 'merge_sort' and target == 'mid':
                self.emit('SPLIT_RANGE', 'Split at ' + str(local['mid']) + '. Sort the left half first; the right half has not started.', line)
            elif function == 'merge' and target == 'result':
                self.register(local['result'], [])
                self.emit('MERGE_BEGIN', 'Create an empty result. Both input runs are sorted; neither is removed or mutated.', line)
            elif function == 'merge' and target in ('i', 'j'):
                self.emit('POINTER_READY', 'Start ' + target + ' at index 0.', line)
            elif function == 'partition' and target == 'pivot':
                call['partition'] = {'pivotId': self.ids(local['values'])[local['high']], 'committedI': local['low'] - 1, 'pending': False, 'scanComplete': False}
                self.emit('SELECT_PIVOT', 'Choose the last element ' + str(local['pivot']) + ' as pivot. Its slot is excluded from the scan.', line)
            elif function == 'partition' and target == 'i':
                self.emit('BOUNDARY_READY', 'i = ' + str(local['i']) + ' marks an empty prefix before low; it is not an array read.', line)
        elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name) and node.value.func.id == 'print':
            self.emit('DRIVER_PRINT', 'The driver prints now. Returning a value did not print it.', line)
        self.observe(line, local, 'after')

    def operand(self, value, side):
        self.operands[side] = value
        return value

    def test(self, result, line, local):
        call = self.sync(line, local)
        if isinstance(self.nodes[line].test.left, ast.Subscript):
            self.counts['keyComparisons'] += 1
            left, right = self.operands['left'], self.operands['right']
            call['comparison'] = {'left': left, 'right': right, 'result': result}
            if call['function'] == 'merge':
                side = 'left' if result else 'right'
                self.emit('COMPARE_HEADS', str(left) + ' <= ' + str(right) + ' is ' + str(result) + '. Choose ' + side + ('; equal keys choose left to preserve tie order.' if left == right else ', the next unread head.'), line, 'condition')
            else:
                if not result:
                    call['partition']['nextUnexamined'] = local['j'] + 1
                self.emit('COMPARE_TO_PIVOT', str(left) + ' <= pivot ' + str(right) + ' is ' + str(result) + ('. Advance the boundary before the swap.' if result else '. No swap; this value belongs in the greater-than region.'), line, 'condition')
        else:
            base = result if call['function'] == 'merge_sort' else not result
            self.emit('BASE_CHECK', 'Empty or singleton: this call needs no helper.' if base else 'This problem still needs sorting work.', line, 'condition', operation={'base': base})
            if base and call['function'] == 'quick_sort' and local['low'] == local['high']:
                self.fixed[str(local['low'])] = self.ids(local['values'])[local['low']]
        return result

    def loop_test(self, result, line, local):
        self.sync(line, local)
        return result

    def scan(self, line, local):
        call = self.sync(line, local)
        call['partition']['nextUnexamined'] = local['j']
        self.emit('SCAN_ADVANCE', 'j now scans index ' + str(local['j']) + '.', line, 'iteration')

    def scan_complete(self, line, local):
        call = self.sync(line, local)
        call['partition']['scanComplete'] = True
        call['partition']['nextUnexamined'] = local['high']
        self.emit('SCAN_COMPLETE', 'Scan complete. Python j remains ' + str(local.get('j', 'unbound')) + '; the pivot will move to i + 1.', line, 'loop-exit')

    def slice_created(self, values, original, start, stop, line):
        self.register(values, self.ids(original)[start:stop])
        self.emit('SLICE_CREATED', 'Create a separate slice for the child. The parent result binding is still pending.', line, 'arguments', operation={'sliceId': self.object_id(values)})
        return values

    def finish(self, value, line, local):
        call = self.sync(line, local)
        call['returnValue'] = self.tag(value)
        call['status'] = 'returning'
        self.emit('RETURN_READY', ('Return None; the caller observes the same mutated array.' if call['function'] == 'quick_sort'
                                  else 'Return the pivot index.' if call['function'] == 'partition' else 'Return this locally sorted list.'), line, 'return-ready')
        self.observe(call['line'], local, 'return')
        self.stack.pop()
        call['status'] = 'completed'
        self.last_result = call['returnValue'] if not self.stack else self.last_result
        self.transfer = {'from': call['id'], 'to': self.current['id'], 'callSite': call['callSite'],
                         'returnOrigin': {'function': call['function'], 'line': call['line']}, 'value': call['returnValue']}
        event = self.emit('RETURN_COMPLETE', 'This call has returned. Its caller resumes at line ' + str(call['callSite']) + '.', line, 'return-complete', focus=call)
        self.history.append({'callId': call['id'], 'eventId': event['eventId']})
        return value
