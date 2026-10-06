"""Independent native-Python witnesses and phase-specific mutation assertions."""
import ast
import contextlib
import copy
import hashlib
import io
import itertools
import json
import random
import sys
import unittest

from build_traces import build, generate
from source import CANONICAL_HASHES, canonical, selections, select, source_for, validate_input, validate_source


def witness(source):
    """Unmodified code, a separate raw line observer, no production recorder helpers."""
    filename = 'independent-sorting-witness.py'
    stack, ids, calls, returns, lines, retained = [], {}, [], [], [], []

    def local(frame):
        return copy.deepcopy({name: value for name, value in frame.f_locals.items()
                              if not name.startswith('__') and not callable(value)})

    def trace(frame, event, value):
        if frame.f_code.co_filename != filename:
            return trace
        if frame.f_code.co_name != '<module>':
            if event == 'call':
                cid = 'call-' + str(len(calls) + 1)
                ids[id(frame)] = cid
                retained.append(frame)
                calls.append({'id': cid, 'function': frame.f_code.co_name, 'parent': stack[-1] if stack else 'driver',
                              'callSite': frame.f_back.f_lineno, 'locals': local(frame),
                              'lists': {key: id(item) for key, item in frame.f_locals.items() if type(item) is list}})
                stack.append(cid)
            elif event == 'line':
                lines.append({'id': ids[id(frame)], 'line': frame.f_lineno, 'locals': local(frame)})
            elif event == 'return':
                returns.append({'id': ids[id(frame)], 'line': frame.f_lineno, 'locals': local(frame), 'value': copy.deepcopy(value)})
                lines.append({'id': ids[id(frame)], 'line': frame.f_lineno, 'locals': local(frame), 'return': True})
                stack.pop()
        elif event == 'line':
            lines.append({'id': 'driver', 'line': frame.f_lineno, 'locals': local(frame)})
        return trace

    namespace, output = {'__name__': '__main__'}, io.StringIO()
    previous = sys.gettrace()
    try:
        sys.settrace(trace)
        with contextlib.redirect_stdout(output):
            exec(compile(source, filename, 'exec'), namespace)
    finally:
        sys.settrace(previous)
    return {'calls': calls, 'returns': returns, 'lines': lines, 'stdout': output.getvalue(), 'namespace': namespace}


def native(data, event, tag):
    if tag['kind'] == 'REFERENCE':
        return values(data, event, tag['objectId'])
    if tag['kind'] == 'NONE':
        return None
    return tag.get('value')


def values(data, event, oid):
    return [data['items'][item]['value'] for item in data['heaps'][event['frame']['heapVersion']][oid]]


def bindings(data, event, call=None):
    call = call or event['frame']['focus']
    return {key: native(data, event, tag) for key, tag in call['locals'].items() if tag['kind'] != 'UNBOUND'}


class LabelledInt(int):
    def __new__(cls, key, label):
        value = int.__new__(cls, key)
        value.label = label
        return value


class SortingTraces(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = build()

    def test_all_declared_modes_sources_calls_and_returns_against_unmodified_python(self):
        for program, mode, row in selections():
            data = self.pack['fixtures'][program + ':' + mode + ':' + row['id']]
            raw = witness(data['source'])
            with self.subTest(identity=data['identity']):
                self.assertEqual(data['sourceRevision'], hashlib.sha256(data['source'].encode()).hexdigest())
                self.assertEqual(data['events'][-1]['frame']['stdout'], raw['stdout'])
                entries = [event for event in data['events'] if event['kind'] == 'ENTER_CALL']
                self.assertEqual(len(entries), len(raw['calls']))
                for event, observed in zip(entries, raw['calls']):
                    call = event['frame']['focus']
                    self.assertEqual({key: call[key] for key in ('id', 'function', 'parent', 'callSite')},
                                     {key: observed[key] for key in ('id', 'function', 'parent', 'callSite')})
                    self.assertEqual(bindings(data, event), observed['locals'])
                ready = [event for event in data['events'] if event['kind'] == 'RETURN_READY']
                self.assertEqual(len(ready), len(raw['returns']))
                for event, observed in zip(ready, raw['returns']):
                    self.assertEqual(event['frame']['focus']['id'], observed['id'])
                    self.assertEqual(event['source']['line'], observed['line'])
                    self.assertEqual(bindings(data, event), observed['locals'])
                    self.assertEqual(native(data, event, event['frame']['focus']['returnValue']), observed['value'])
                if mode == 'helper':
                    self.assertTrue(all(call['function'] == ('merge' if program == 'merge' else 'partition') for call in raw['calls']))
                    self.assertEqual(data['events'][-1]['metrics']['sortCalls'], 0)

    def test_intermediate_writes_match_independent_next_line_not_pre_assignment(self):
        kinds = {'APPEND_VALUE', 'ADVANCE_POINTER', 'BOUNDARY_ADVANCE_PENDING', 'SWAP_COMMIT', 'SELF_SWAP', 'PIVOT_PLACE', 'ASSIGN_RESULT'}
        for data in self.pack['fixtures'].values():
            raw = witness(data['source'])
            by_call, occurrence = {}, {}
            for row in raw['lines']:
                by_call.setdefault(row['id'], []).append(row)
            for event in data['events']:
                if event['kind'] not in kinds:
                    continue
                cid, line = event['source']['callId'], event['source']['line']
                candidates = by_call[cid]
                matching = [index for index, row in enumerate(candidates) if row['line'] == line and not row.get('return')]
                key = (cid, line)
                offset = occurrence.get(key, 0)
                occurrence[key] = offset + 1
                after = candidates[matching[offset] + 1]
                actual = bindings(data, event)
                # Driver globals include only named program bindings, never function objects.
                self.assertEqual(actual, after['locals'], (data['identity'], event['eventId'], line))

    def test_source_grammar_and_exact_variants_fail_closed(self):
        for program in ('merge', 'quick'):
            text = canonical(program)
            self.assertEqual(hashlib.sha256(text.encode()).hexdigest(), CANONICAL_HASHES[program])
            ast.parse(text, feature_version=(3, 9))
            for bad in (text.replace('<=', '<'), text + '\nprint("extra")\n', text.replace('return', 'yield', 1)):
                with self.assertRaises(ValueError):
                    validate_source(bad, program, 'full', select(program, 'full', 'default'))
        self.assertNotIn('sorted(', canonical('merge') + canonical('quick'))
        self.assertNotIn('.sort(', canonical('merge') + canonical('quick'))

    def test_invalid_inputs_and_fixture_identity_fail_before_execution(self):
        for bad in ([True], [1.0], list(range(13)), [1001], [-1001], '1,2'):
            with self.assertRaises(ValueError):
                validate_input('quick', 'full', {'values': bad})
        for data in ({'left': [2, 1], 'right': []}, {'left': list(range(7)), 'right': list(range(7))}):
            with self.assertRaises(ValueError):
                validate_input('merge', 'helper', data)
        for low, high, array in [(0, -1, []), (-1, 0, [1]), (0, 1, [1]), (True, 0, [1])]:
            with self.assertRaises(ValueError):
                validate_input('quick', 'helper', {'values': array, 'low': low, 'high': high})
        from source import select as choose
        for selection in [('wrong', 'full', 'default'), ('quick', 'other', 'default'), ('merge', 'full', 'missing')]:
            with self.assertRaises(ValueError):
                choose(*selection)

    def test_golden_metrics_and_all_declared_results(self):
        for program, mode, row in selections():
            data = self.pack['fixtures'][program + ':' + mode + ':' + row['id']]
            end = data['events'][-1]
            if mode == 'full':
                expected = row['metrics']['merge_sort' if program == 'merge' else 'quicksort']
                self.assertEqual(end['metrics'], expected)
                self.assertEqual(json.loads(end['frame']['stdout']), row['expectedSorted'])
            elif program == 'merge':
                self.assertEqual(json.loads(end['frame']['stdout']), row['expected'])
            else:
                array, index = end['frame']['stdout'].splitlines()
                self.assertEqual(json.loads(array), row['expectedArray'])
                self.assertEqual(int(index), row['expectedPivotIndex'])

    def test_heap_snapshots_are_independent_and_mutations_are_permutations(self):
        for data in self.pack['fixtures'].values():
            before = json.dumps(data['heaps'][0], sort_keys=True)
            if data['program'] == 'quick':
                oid = data['events'][0]['frame']['originalIds'][0]
                original = data['heaps'][0][oid]
                for event in data['events']:
                    heap = data['heaps'][event['frame']['heapVersion']]
                    self.assertEqual(sorted(heap[oid]), sorted(original))
                    self.assertEqual(list(heap), [oid])
                    for position, item in event['frame']['fixed'].items():
                        self.assertEqual(heap[oid][int(position)], item)
                if data['fixtureId'] == 'default':
                    self.assertNotEqual(data['heaps'][0][oid], data['heaps'][-1][oid])
            else:
                for oid in data['events'][0]['frame']['originalIds']:
                    self.assertTrue(all(heap[oid] == data['heaps'][0][oid] for heap in data['heaps']))
            self.assertEqual(json.dumps(data['heaps'][0], sort_keys=True), before)

    def test_merge_aliases_allocations_unbound_parent_and_left_first_landmarks(self):
        data = self.pack['fixtures']['merge:full:default']
        runs = []
        for event in data['events']:
            call = event['frame']['focus']
            if event['kind'] == 'RETURN_READY' and call['function'] == 'merge':
                local = bindings(data, event)
                runs.append(local['result'])
                self.assertNotEqual(call['locals']['result']['objectId'], call['locals']['left']['objectId'])
                self.assertNotEqual(call['locals']['left']['objectId'], call['locals']['right']['objectId'])
            if event['kind'] == 'SLICE_CREATED':
                self.assertEqual(call['locals'][call['pending']['target']]['kind'], 'UNBOUND')
            if event['kind'] == 'RETURN_READY' and call['function'] == 'merge_sort' and len(bindings(data, event)['values']) <= 1:
                self.assertEqual(call['returnValue'], call['locals']['values'])
        self.assertEqual(runs, [[3, 8], [1, 7], [1, 3, 7, 8], [0, 10], [2, 5], [0, 2, 5, 10], [0, 1, 2, 3, 5, 7, 8, 10]])
        self.assertTrue(all('k' not in e['frame']['focus']['locals'] for e in data['events']))

    def test_merge_append_precedes_pointer_and_drains_never_compare_exhausted_heads(self):
        for data in [row for row in self.pack['fixtures'].values() if row['program'] == 'merge']:
            for index, event in enumerate(data['events']):
                local = bindings(data, event)
                if event['kind'] == 'COMPARE_HEADS':
                    self.assertLess(local['i'], len(local['left']))
                    self.assertLess(local['j'], len(local['right']))
                    c = event['frame']['comparison']
                    self.assertEqual(c, {'left': local['left'][local['i']], 'right': local['right'][local['j']],
                                         'result': local['left'][local['i']] <= local['right'][local['j']]})
                if event['kind'] == 'APPEND_VALUE':
                    next_event = data['events'][index + 1]
                    self.assertEqual(next_event['kind'], 'ADVANCE_POINTER')
                    pointer = 'i' if event['frame']['operation']['source'] == 'left' else 'j'
                    self.assertEqual(bindings(data, next_event)[pointer], local[pointer] + 1)
                    self.assertEqual(bindings(data, next_event)['result'], local['result'])
                if event['kind'] == 'DRAIN_REMAINDER':
                    self.assertIsNone(event['frame']['comparison'])
                    self.assertIsNone(data['events'][index + 1]['frame']['comparison'])
                    self.assertEqual(data['events'][index + 1]['metrics']['keyComparisons'], event['metrics']['keyComparisons'])

    def test_partition_regions_pending_boundary_and_python_j_exhaustion(self):
        for data in [row for row in self.pack['fixtures'].values() if row['program'] == 'quick']:
            for index, event in enumerate(data['events']):
                local = bindings(data, event)
                if event['kind'] == 'COMPARE_TO_PIVOT':
                    a, low, high, i, j, pivot = [local[key] for key in ('values', 'low', 'high', 'i', 'j', 'pivot')]
                    self.assertLess(j, high)
                    self.assertTrue(all(x <= pivot for x in a[low:i + 1]))
                    self.assertTrue(all(x > pivot for x in a[i + 1:j]))
                    self.assertEqual(a[high], pivot)
                    if not event['frame']['comparison']['result']:
                        self.assertEqual(event['frame']['partition']['nextUnexamined'], j + 1)
                        self.assertTrue(all(x > pivot for x in a[i + 1:j + 1]))
                if event['kind'] == 'BOUNDARY_ADVANCE_PENDING':
                    self.assertTrue(event['frame']['partition']['pending'])
                    self.assertEqual(event['frame']['partition']['committedI'], local['i'] - 1)
                    self.assertEqual(values(data, event, event['frame']['originalIds'][0]),
                                     values(data, data['events'][index - 1], event['frame']['originalIds'][0]))
                if event['kind'] == 'SCAN_COMPLETE' and local['high'] > local['low']:
                    self.assertEqual(local['j'], local['high'] - 1)
                if event['kind'] == 'SELF_SWAP':
                    self.assertEqual(event['frame']['operation']['a'], event['frame']['operation']['b'])
                    self.assertEqual(event['metrics']['exchanges'], data['events'][index - 1]['metrics']['exchanges'])

    def test_partition_landmarks_exclude_pivots_and_keep_partial_range(self):
        data = self.pack['fixtures']['quick:full:default']
        returns = [(bindings(data, e)['low'], bindings(data, e)['high'], native(data, e, e['frame']['focus']['returnValue']), bindings(data, e)['values'])
                   for e in data['events'] if e['kind'] == 'RETURN_READY' and e['frame']['focus']['function'] == 'partition']
        self.assertEqual(returns, [(0, 7, 4, [3, 1, 0, 2, 5, 10, 7, 8]), (0, 3, 2, [1, 0, 2, 3, 5, 10, 7, 8]),
                                   (0, 1, 0, [0, 1, 2, 3, 5, 10, 7, 8]), (5, 7, 6, [0, 1, 2, 3, 5, 7, 8, 10])])
        for event in data['events']:
            if event['kind'] == 'ENTER_CALL' and event['frame']['focus']['function'] == 'quick_sort':
                local = bindings(data, event)
                self.assertFalse(any(local['low'] <= int(p) <= local['high'] for p in event['frame']['fixed']))
        partial = self.pack['fixtures']['quick:helper:partial']
        oid = partial['events'][0]['frame']['originalIds'][0]
        self.assertTrue(all((values(partial, e, oid)[0], values(partial, e, oid)[-1]) == (99, -99) for e in partial['events']))

    def test_identity_oracle_proves_stability_and_instability_with_key_only_comparisons(self):
        for program, name, labels in [('merge', 'merge_sort', ['C', 'A', 'B']), ('quick', 'quick_sort', ['C', 'B', 'A'])]:
            namespace = {'__name__': 'oracle'}
            exec(compile(canonical(program), 'canonical.py', 'exec'), namespace)
            array = [LabelledInt(2, 'A'), LabelledInt(2, 'B'), LabelledInt(1, 'C')]
            output = namespace[name](array) if program == 'merge' else namespace[name](array, 0, 2)
            self.assertEqual([value.label for value in output if hasattr(value, 'label')] if program == 'merge' else [value.label for value in array], labels)
            data = self.pack['fixtures'][program + ':full:ties']
            end = data['events'][-1]
            tag = end['frame']['callResult'] if program == 'merge' else end['frame']['driver']['locals']['values']
            ids = data['heaps'][end['frame']['heapVersion']][tag['objectId']]
            self.assertEqual([data['items'][item]['label'] for item in ids], labels)

    def test_all_1093_small_inputs_and_deterministic_maximum_cases(self):
        count = 0
        for length in range(7):
            for array in itertools.product((-1, 0, 1), repeat=length):
                for program in ('merge', 'quick'):
                    data = generate(program, 'full', {'id': 'oracle', 'values': list(array)})
                    self.assertEqual(json.loads(data['events'][-1]['frame']['stdout']), sorted(array))
                count += 1
        self.assertEqual(count, 1093)
        randomizer = random.Random(47)
        for array in (list(range(12)), list(range(11, -1, -1)), [4] * 12, [randomizer.randint(-1000, 1000) for _ in range(12)]):
            for program in ('merge', 'quick'):
                data = generate(program, 'full', {'id': 'maximum', 'values': array})
                self.assertEqual(data['outcome'], 'completed')
                self.assertEqual(json.loads(data['events'][-1]['frame']['stdout']), sorted(array))

    def test_limits_are_stopped_not_success_or_python_recursion_error(self):
        for caps in ({'max_events': 8}, {'max_depth': 2}):
            data = generate('quick', 'full', select('quick', 'full', 'default'), **caps)
            self.assertEqual(data['outcome'], 'pedagogical-limit')
            self.assertEqual(data['events'][-1]['kind'], 'LIMIT_STOP')
            self.assertFalse(any(e['kind'] == 'COMPLETE' for e in data['events']))

    def test_return_handoff_and_stdout_are_separate_and_source_spans_are_owned(self):
        for data in self.pack['fixtures'].values():
            for event in data['events']:
                if event['source']:
                    s = event['source']
                    self.assertEqual(s['text'], data['spans'][str(s['line'])]['text'])
                    self.assertEqual(s['callId'], event['frame']['focus']['id'])
                if event['kind'] == 'RETURN_COMPLETE':
                    transfer = event['frame']['returnTransfer']
                    self.assertEqual(transfer['from'], event['source']['callId'])
                    self.assertEqual(transfer['returnOrigin']['line'], event['source']['line'])
                    self.assertNotIn(transfer['from'], [row['id'] for row in event['frame']['stack']])
                    self.assertEqual(event['frame']['stdout'], '')
                if event['kind'] == 'COMPLETE':
                    self.assertIsNone(event['source'])
                    self.assertEqual(event['frame']['stack'], [])
                    self.assertTrue(event['frame']['stdout'])


if __name__ == '__main__':
    unittest.main()
