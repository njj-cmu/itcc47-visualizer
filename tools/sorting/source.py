"""The two approved programs and their bounded, explicit drivers. Python 3.9+."""
import ast
import hashlib
import json
from pathlib import Path

DIRECTORY = Path(__file__).resolve().parent
REGISTRY = json.loads((DIRECTORY / 'lesson_registry.json').read_text(encoding='utf-8'))
PROGRAMS = {'merge': 'merge_sort.py', 'quick': 'quicksort.py'}
CANONICAL_HASHES = {'merge': '955027a60b5b7a180651592ffb14cf50566099eeb37f6d110cb991bfe284185f',
                    'quick': 'e13ac2d52a1930d6ad66edea071bf345acc4aaf55f582f733e25c8652ba8ee28'}
UNBOUND = {'kind': 'UNBOUND'}


def validate_input(program, mode, inputs):
    if program not in PROGRAMS or mode not in ('full', 'helper') or type(inputs) is not dict:
        raise ValueError('Choose a declared sorting program and mode.')
    names = ('left', 'right') if program == 'merge' and mode == 'helper' else ('values',)
    for name in names:
        values = inputs.get(name)
        if (type(values) is not list or len(values) > 12
                or any(type(value) is not int or not -1000 <= value <= 1000 for value in values)):
            raise ValueError('Sorting requires at most twelve integer keys in [-1000, 1000]; bools and floats are unsupported.')
    if sum(len(inputs[name]) for name in names) > 12:
        raise ValueError('The combined input exceeds twelve values.')
    if program == 'merge' and mode == 'helper':
        if any(any(a > b for a, b in zip(inputs[name], inputs[name][1:])) for name in names):
            raise ValueError('Merge helper inputs must already be sorted.')
    if program == 'quick' and mode == 'helper':
        low, high = inputs.get('low'), inputs.get('high')
        if type(low) is not int or type(high) is not int or not 0 <= low <= high < len(inputs['values']):
            raise ValueError('Partition requires a nonempty inclusive range inside the input.')


def selections():
    for program in PROGRAMS:
        for item in REGISTRY['fullSortFixtures']:
            yield program, 'full', item
        key = 'mergeHelperFixtures' if program == 'merge' else 'partitionHelperFixtures'
        for item in REGISTRY[key]:
            yield program, 'helper', item


def select(program, mode, fixture):
    row = next((row for p, m, row in selections() if (p, m, row['id']) == (program, mode, fixture)), None)
    if row is None:
        raise ValueError('Unknown sorting fixture or mode.')
    return row


def canonical(program):
    if program not in PROGRAMS:
        raise ValueError('Unknown sorting program.')
    source = (DIRECTORY / 'examples' / PROGRAMS[program]).read_text(encoding='utf-8').replace('\r\n', '\n')
    if hashlib.sha256(source.encode('utf-8')).hexdigest() != CANONICAL_HASHES[program]:
        raise ValueError('The canonical algorithm changed; review its source contract first.')
    return source


def source_for(program, mode, inputs):
    validate_input(program, mode, inputs)
    prefix = canonical(program).split('if __name__ == "__main__":')[0]
    if program == 'merge' and mode == 'helper':
        driver = [f"left = {inputs['left']!r}", f"right = {inputs['right']!r}", 'answer = merge(left, right)', 'print(answer)']
    elif program == 'merge':
        driver = [f"values = {inputs['values']!r}", 'answer = merge_sort(values)', 'print(answer)']
    elif mode == 'helper':
        driver = [f"values = {inputs['values']!r}", f"pivot_index = partition(values, {inputs['low']}, {inputs['high']})",
                  'print(values)', 'print(pivot_index)']
    else:
        driver = [f"values = {inputs['values']!r}", 'quick_sort(values, 0, len(values) - 1)', 'print(values)']
    return prefix + 'if __name__ == "__main__":\n' + ''.join('    ' + line + '\n' for line in driver)


def validate_source(source, program, mode, inputs):
    # A known-program adapter, deliberately narrower than a language sandbox.
    # Exact functions and generated driver reject every unapproved language form.
    expected = source_for(program, mode, inputs)
    if source != expected:
        raise ValueError('Unsupported source: use the canonical functions and declared driver.')
    return ast.parse(source, feature_version=(3, 9))


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def json_text(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def source_map(tree, source):
    spans, functions = {}, {}
    for fn in [node for node in tree.body if isinstance(node, ast.FunctionDef)]:
        names = set(arg.arg for arg in fn.args.args)
        names.update(node.id for node in ast.walk(fn) if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store))
        functions[fn.name] = {'line': fn.lineno, 'endLine': fn.end_lineno, 'locals': sorted(names)}
        spans[str(fn.lineno)] = {'line': fn.lineno, 'endLine': fn.lineno, 'column': fn.col_offset,
                                'endColumn': len(source.splitlines()[fn.lineno - 1]), 'text': source.splitlines()[fn.lineno - 1].strip()}
    for node in ast.walk(tree):
        if isinstance(node, ast.stmt) and not isinstance(node, (ast.FunctionDef, ast.If, ast.While, ast.For)):
            spans[str(node.lineno)] = {'line': node.lineno, 'endLine': node.end_lineno,
                                      'column': node.col_offset, 'endColumn': node.end_col_offset,
                                      'text': ast.get_source_segment(source, node)}
        elif isinstance(node, (ast.If, ast.While, ast.For)):
            spans[str(node.lineno)] = {'line': node.lineno, 'endLine': node.lineno,
                                      'column': node.col_offset, 'endColumn': len(source.splitlines()[node.lineno - 1]),
                                      'text': source.splitlines()[node.lineno - 1].strip()}
    return spans, functions


class Instrument(ast.NodeTransformer):
    """Observe approved statements; Python still executes their expressions once."""
    def hook(self, method, *args):
        return ast.Call(func=ast.Attribute(value=ast.Name(id='_observer', ctx=ast.Load()), attr=method, ctx=ast.Load()),
                        args=list(args), keywords=[])

    def locals(self):
        return ast.Call(func=ast.Name(id='locals', ctx=ast.Load()), args=[], keywords=[])

    def observe(self, method, node):
        return ast.copy_location(ast.Expr(value=self.hook(method, ast.Constant(node.lineno), self.locals())), node)

    def visit_FunctionDef(self, node):
        self.generic_visit(node)
        entry = ast.Expr(value=self.hook('enter', ast.Constant(node.name), ast.Constant(node.lineno), self.locals()))
        # The sole implicit-return function is quick_sort; finish uses the last
        # executed source span, including the base check for an empty range.
        if node.name == 'quick_sort':
            node.body.append(ast.Expr(value=self.hook('finish', ast.Constant(None), ast.Constant(0), self.locals())))
        node.body.insert(0, ast.copy_location(entry, node))
        return node

    def visit_Assign(self, node):
        self.generic_visit(node)
        return [self.observe('before', node), node, self.observe('after', node)]

    def visit_AugAssign(self, node):
        return [self.observe('before', node), node, self.observe('after', node)]

    def visit_Expr(self, node):
        self.generic_visit(node)
        return [self.observe('before', node), node, self.observe('after', node)]

    def visit_Return(self, node):
        value = self.visit(node.value)
        return [self.observe('before', node), ast.copy_location(ast.Return(value=self.hook('finish', value, ast.Constant(node.lineno), self.locals())), node)]

    def visit_If(self, node):
        if isinstance(node.test, ast.Compare) and isinstance(node.test.left, ast.Name) and node.test.left.id == '__name__':
            return self.generic_visit(node)
        self.generic_visit(node)
        node.test = self.hook('test', node.test, ast.Constant(node.lineno), self.locals())
        return node

    def visit_Compare(self, node):
        # Operand hooks observe the values already read by the source expression.
        # The comparison itself is left intact and executed exactly once.
        if isinstance(node.left, ast.Subscript):
            node.left = self.hook('operand', node.left, ast.Constant('left'))
            node.comparators[0] = self.hook('operand', node.comparators[0], ast.Constant('right'))
        return node

    def visit_While(self, node):
        self.generic_visit(node)
        node.test = self.hook('loop_test', node.test, ast.Constant(node.lineno), self.locals())
        return node

    def visit_For(self, node):
        self.generic_visit(node)
        node.body.insert(0, self.observe('scan', node))
        return [self.observe('before', node), node, self.observe('scan_complete', node)]

    def visit_Subscript(self, node):
        if isinstance(node.slice, ast.Slice):
            start = node.slice.lower or ast.Constant(None)
            stop = node.slice.upper or ast.Constant(None)
            return ast.copy_location(self.hook('slice_created', node, node.value, start, stop, ast.Constant(node.lineno)), node)
        return node
