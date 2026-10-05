"""Build trusted, bounded Python fixtures; the browser only replays snapshots.

Instrumentation wraps calls, tests, returns and prints, and observes locals AFTER
assignments. Python evaluates every expression. This deliberately narrow AST
allowlist is a build-time adapter, not an interpreter or a student-code runner.
"""
import argparse
import ast
import contextlib
import copy
import hashlib
import io
import json
from pathlib import Path
import platform
import pprint

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = Path(__file__).parent / "examples"
GENERATOR_VERSION = "m5-ast-2"
SCHEMA_VERSION = 2
PRESETS = (0, 1, 3, 5)
PROGRAMS = ("countdown", "sum_to")
REGISTRY = json.loads((Path(__file__).parent / "lesson_registry.json").read_text(encoding="utf-8"))
UNBOUND = {"kind": "UNBOUND"}
PENDING = {"kind": "PENDING"}


def value(item, objects=None):
    if item is None:
        return {"kind": "NONE"}
    if type(item) is int:
        return {"kind": "INTEGER", "value": item}
    if type(item) is bool:
        return {"kind": "BOOLEAN", "value": item}
    if type(item) is str:
        return {"kind": "STRING", "value": item}
    if type(item) in (list, dict) and objects is not None:
        return objects.reference(item)
    raise ValueError("Unsupported fixture value")


class ObjectTable:
    """Runtime identity internally; deterministic traversal IDs in every export."""
    def __init__(self):
        self.identities, self.objects, self.retained = {}, {}, []

    def reference(self, item):
        identity = id(item)
        if identity not in self.identities:
            object_id = "object-" + str(len(self.identities) + 1)
            self.identities[identity] = object_id
            self.retained.append(item)  # Prevent identity reuse; never exported.
            self.objects[object_id] = {}
            self.objects[object_id] = ({"type": "list", "items": [value(v, self) for v in item]}
                                       if type(item) is list else
                                       {"type": "node", "fields": {k: value(v, self) for k, v in item.items()}})
        return {"kind": "REFERENCE", "objectId": self.identities[identity]}


def validate_input(program, arguments):
    """Validate concrete input before executing any source statements."""
    domain = REGISTRY[program]["domain"]
    if domain == "number":
        if len(arguments) != 1 or type(arguments[0]) is not int or arguments[0] not in PRESETS:
            raise ValueError("Supported fixtures use n = 0, 1, 3, 5")
    elif domain == "list":
        values, index = arguments
        if (type(values) is not list or len(values) > 6
                or any(type(n) is not int or abs(n) > 1000 for n in values)
                or type(index) is not int or not 0 <= index <= len(values)):
            raise ValueError("List input requires at most six small integers and 0 <= index <= len(values)")
    else:
        seen = set()
        def visit(node, depth):
            if type(node) is not dict or id(node) in seen:
                raise ValueError("Folder input must be an acyclic tree without shared nodes")
            seen.add(id(node))
            if len(seen) > 16 or depth > 6 or type(node.get("name")) is not str or not 1 <= len(node["name"]) <= 40:
                raise ValueError("Folder input exceeds the node, depth, or name bounds")
            if node.get("kind") == "file":
                if set(node) != {"kind", "name", "bytes"} or type(node["bytes"]) is not int or not 0 <= node["bytes"] <= 10000:
                    raise ValueError("Files require a bounded nonnegative integer byte count")
            elif node.get("kind") == "folder":
                if set(node) != {"kind", "name", "children"} or type(node["children"]) is not list or len(node["children"]) > 6:
                    raise ValueError("Folders require at most six children")
                for child in node["children"]:
                    visit(child, depth + 1)
            else:
                raise ValueError("Only synthetic file and folder nodes are supported")
        visit(arguments[0], 1)


class TeachingLimit(Exception):
    pass


def outside_statements(tree):
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            continue
        yield node
        if isinstance(node, ast.If):
            yield from outside_statements(node)


def validate(tree, program):
    """A bounded adapter for declared references; deliberately not a sandbox."""
    if program not in REGISTRY:
        raise ValueError("Unknown lesson program")
    spec = REGISTRY[program]
    name = spec["functionName"]
    allowed = (ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.If,
               ast.Return, ast.Expr, ast.Assign, ast.Call, ast.Name, ast.Load,
               ast.Store, ast.Constant, ast.Compare, ast.Eq, ast.BinOp, ast.Add,
               ast.Sub, ast.List, ast.Dict, ast.Subscript, ast.For, ast.UnaryOp, ast.USub)
    functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    if len(functions) != 1 or functions[0].name != name:
        raise ValueError("Exactly one declared lesson function is supported")
    fn = functions[0]
    defaults = {arg.arg: ast.literal_eval(default) for arg, default in zip(fn.args.args[-len(fn.args.defaults):], fn.args.defaults)}
    if ([arg.arg for arg in fn.args.args] != spec["parameters"] or defaults != spec["defaults"]
            or fn.args.kwonlyargs or fn.args.posonlyargs
            or fn.args.vararg or fn.args.kwarg or fn.decorator_list
            or fn.returns or any(arg.annotation for arg in fn.args.args)):
        raise ValueError("Function signature must match its declared lesson")
    parents = {child: parent for parent in ast.walk(tree) for child in ast.iter_child_nodes(parent)}
    function_nodes = set(ast.walk(fn))
    if len(parents) > 1000:
        raise ValueError("Source exceeds the bounded lesson size")
    for node in ast.walk(tree):
        if not isinstance(node, allowed):
            raise ValueError("Unsupported Python construct: " + type(node).__name__)
        if isinstance(node, ast.FunctionDef) and node is not fn:
            raise ValueError("Nested function definitions are outside the fixture contract")
        if isinstance(node, ast.Name) and node.id not in {
                name, *spec["parameters"], "child", "child_total", "total", "answer", "values", "SAMPLE_FOLDER", "len", "print", "__name__"}:
            raise ValueError("Unsupported name: " + node.id)
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in (name, "print", "len") or node.keywords:
                raise ValueError("Only declared lesson calls, print and len are supported")
            if node.func.id == name and not len(spec["parameters"]) - len(defaults) <= len(node.args) <= len(spec["parameters"]):
                raise ValueError("Lesson call argument count does not match the signature")
            parent = parents[node]
            if node.func.id == "len":
                if len(node.args) != 1 or not isinstance(node.args[0], ast.Name) or node.args[0].id != "values":
                    raise ValueError("Only len(values) is required by these lessons")
            elif not ((isinstance(parent, ast.Expr) and parent.value is node)
                    or (node.func.id == name and isinstance(parent, ast.Assign) and parent.value is node)):
                raise ValueError("Calls must be standalone statements or expanded result assignments")
        if isinstance(node, ast.Assign):
            permitted = {"child_total", "total"} if node in function_nodes else {"answer", "values", "SAMPLE_FOLDER"}
            if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name) or node.targets[0].id not in permitted:
                raise ValueError("Only declared local/driver assignments are supported; input mutation is forbidden")
        if isinstance(node, ast.Constant):
            if type(node.value) not in (int, str, type(None)) or (type(node.value) is int and abs(node.value) > 10000) or (type(node.value) is str and len(node.value) > 500):
                raise ValueError("Unsupported or unbounded literal")
        if isinstance(node, ast.If):
            expected = {"number": "n == 0", "list": "index == len(values)", "folder": 'node["kind"] == "file"'}[spec["domain"]] if node in function_nodes else '__name__ == "__main__"'
            if ast.dump(node.test) != ast.dump(ast.parse(expected, mode="eval").body) or node.orelse:
                raise ValueError("Only the base test and main guard are supported")
        if isinstance(node, ast.For):
            if spec["domain"] != "folder" or node not in function_nodes or node.orelse or not isinstance(node.target, ast.Name) or node.target.id != "child" or ast.dump(node.iter) != ast.dump(ast.parse('node["children"]', mode="eval").body):
                raise ValueError("Only the bounded loop over node children is supported")
        if isinstance(node, ast.Subscript):
            if not isinstance(node.value, ast.Name) or not (
                    (node.value.id == "values" and isinstance(node.slice, ast.Name) and node.slice.id == "index")
                    or (node.value.id == "node" and isinstance(node.slice, ast.Constant) and node.slice.value in ("kind", "bytes", "children"))):
                raise ValueError("Only declared read-only indexing is supported")
    globals_ = {node.targets[0].id: ast.literal_eval(node.value) for node in outside_statements(tree)
                if isinstance(node, ast.Assign) and node.targets[0].id in ("values", "SAMPLE_FOLDER")}
    drivers = [node for statement in outside_statements(tree) for node in ast.walk(statement)
               if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == name]
    # The main guard is also a yielded statement; deduplicate its descendants.
    drivers = list(dict.fromkeys(drivers))
    if len(drivers) != 1:
        raise ValueError("Exactly one expanded driver call is required")
    arguments = [globals_[arg.id] if isinstance(arg, ast.Name) else ast.literal_eval(arg) for arg in drivers[0].args]
    arguments.extend(defaults[param] for param in spec["parameters"][len(arguments):])
    validate_input(program, arguments)
    return fn


def fixture_source(name, n):
    if name not in PROGRAMS or type(n) is not int or n not in PRESETS:
        raise ValueError("Supported fixtures use n = 0, 1, 3, 5")
    text = (EXAMPLES / (name + ".py")).read_text(encoding="utf-8").replace("\r\n", "\n")
    driver = name + "(3)"
    if text.count(driver) != 1:
        raise ValueError("Canonical driver must occur exactly once")
    return text.replace(driver, name + "(" + str(n) + ")")


def replace_expression(source, node, replacement):
    lines = source.splitlines(keepends=True)
    start = sum(map(len, lines[:node.lineno - 1])) + node.col_offset
    end = sum(map(len, lines[:node.end_lineno - 1])) + node.end_col_offset
    return source[:start] + replacement + source[end:]


def application_source(program, scenario, variant="correct"):
    spec = REGISTRY[program]
    chosen = next((row for row in spec["fixtures"] if row["id"] == scenario), None)
    if not chosen or variant not in spec["variants"] or (variant != "correct" and scenario != "list-main"):
        raise ValueError("Choose a declared fixture and repair variant")
    source = (EXAMPLES / spec["variants"][variant].get("source", spec["source"])).read_text(encoding="utf-8").replace("\r\n", "\n")
    if spec["domain"] == "list":
        tree = ast.parse(source)
        values = next(node for node in ast.walk(tree) if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and node.targets[0].id == "values")
        source = replace_expression(source, values.value, repr(chosen["values"]))
        driver = next(node for node in ast.walk(ast.parse(source)) if isinstance(node, ast.Assign) and node.targets[0].id == "answer")
        source = replace_expression(source, driver.value.args[1], str(chosen["index"]))
    elif "node" in chosen:
        data = next(node for node in ast.parse(source).body if isinstance(node, ast.Assign) and node.targets[0].id == "SAMPLE_FOLDER")
        source = replace_expression(source, data.value, pprint.pformat(chosen["node"], sort_dicts=False, width=88))
    return source


class Recorder:
    def __init__(self, program, source, max_depth=8, max_events=500):
        self.spec = REGISTRY[program]
        self.name, self.source = self.spec["functionName"], source
        self.lines = source.splitlines()
        self.max_depth, self.max_events = max_depth, max_events
        self.events, self.stack, self.frames, self.history = [], [], {}, []
        self.calls, self.depth = 0, 0
        self.transfer, self.outcome = None, "running"
        self.objects = ObjectTable()
        self.output = io.StringIO()
        tree = ast.parse(source)
        self.fn = validate(tree, program)
        self.local_names = self.spec["parameters"] + sorted(
            {node.targets[0].id for node in ast.walk(self.fn) if isinstance(node, ast.Assign)}
            | {node.target.id for node in ast.walk(self.fn) if isinstance(node, ast.For)})
        self.driver = {"status": "READY", "locals": {node.targets[0].id: copy.copy(UNBOUND)
                       for node in outside_statements(tree) if isinstance(node, ast.Assign)},
                       "result": copy.copy(UNBOUND), "waitingFor": None}
        self.driver_line = next(node.lineno for node in ast.walk(tree)
                                if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                                and node.func.id == self.name and node.lineno > self.fn.end_lineno)
        self.pending_site = None
        self.event("INITIAL", self.driver_line, "Before the driver calls " + self.name + ".")

    def active(self):
        if self.stack and self.frames[self.stack[-1]]["status"] in ("RUNNING", "RETURNING"):
            return self.stack[-1]
        return None

    def event(self, kind, line, message, annotations=None, force=False, owner=None):
        if len(self.events) >= self.max_events and not force:
            raise TeachingLimit("Teaching safety stop: event limit " + str(self.max_events))
        origin = owner or self.active() or "driver"
        if line and origin in self.frames:
            self.frames[origin]["lastLine"] = line
        self.events.append(copy.deepcopy({
            "eventKind": kind, "source": {"line": line, "phase": kind.lower(), "ownerCallId": origin} if line else None,
            "message": message,
            "frame": {"kind": "recursion", "activeCallId": self.active(),
                      "stack": list(reversed(self.stack)), "framesById": self.frames,
                      "returnTransfer": self.transfer, "driver": self.driver,
                      "stdout": self.output.getvalue(), "history": self.history,
                      "metrics": {"totalInvocations": self.calls, "currentDepth": len(self.stack), "maxDepth": self.depth},
                      "outcome": self.outcome, "annotations": annotations or {}}}))

    def sync(self, local):
        if self.stack:
            frame = self.frames[self.stack[-1]]
            frame["locals"] = {key: value(local[key], self.objects) if key in local else copy.copy(UNBOUND) for key in self.local_names}
        else:
            self.driver["locals"] = {key: value(local[key], self.objects) if key in local else copy.copy(UNBOUND)
                                     for key in self.driver["locals"]}

    def before(self, line, local):
        self.sync(local)
        if self.stack:
            self.frames[self.stack[-1]]["lastLine"] = line

    def enter(self, line, local):
        self.calls += 1
        call_id = "call-" + str(self.calls)
        parent = self.stack[-1] if self.stack else None
        self.frames[call_id] = {"callId": call_id, "functionName": self.name, "parentCallId": parent,
                               "callSite": self.pending_site, "status": "RUNNING", "locals": {},
                               "waitingFor": None, "suspendedCallSite": None, "continuation": None,
                               "returnValue": copy.copy(UNBOUND), "pendingExpression": copy.copy(UNBOUND),
                               "pendingAssignment": None, "lastLine": line}
        if parent:
            self.frames[parent]["waitingFor"] = call_id
            if self.frames[parent]["pendingAssignment"]:
                self.frames[parent]["pendingAssignment"]["childCallId"] = call_id
        else:
            self.driver["waitingFor"] = call_id
        self.stack.append(call_id)
        self.depth = max(self.depth, len(self.stack))
        self.sync(local)
        self.transfer = None
        arguments = [str(local[p]) if type(local[p]) not in (dict, list) else self.objects.reference(local[p])["objectId"]
                     for p in self.spec["parameters"]]
        self.event("CALL", line, call_id + " enters " + self.name + "(" + ", ".join(arguments) + ").",
                   {"callSite": self.pending_site, **({"measure": local["n"]} if "n" in local else {})})

    def call(self, line, destination, continuation, fn, arguments, local):
        self.sync(local)
        if len(self.stack) >= self.max_depth:
            raise TeachingLimit("Teaching safety stop: depth limit " + str(self.max_depth) + " (not Python's recursion limit)")
        parent = self.stack[-1] if self.stack else None
        if parent:
            caller = self.frames[parent]
            caller.update(status="WAITING", suspendedCallSite=line, continuation=continuation,
                          pendingExpression=copy.copy(PENDING), lastLine=line,
                          pendingAssignment={"target": destination, "callSite": line, "childCallId": None,
                                             "continuation": continuation} if destination else None)
        else:
            self.driver.update(status="WAITING", result=copy.copy(PENDING))
        self.pending_site = line
        returned = fn(*arguments)  # Real Python binds parameters/defaults and evaluates the function.
        child_id = self.stack.pop()
        child = self.frames[child_id]
        child["status"] = "COMPLETE"
        self.history.append(child_id)
        self.transfer = {"childCallId": child_id, "callerCallId": parent, "value": value(returned, self.objects),
                         "destination": destination or "discarded expression result", "callSite": line, "stage": "popped"}
        self.event("RETURN_COMPLETE", child["returnLine"], child_id + " completes and leaves the live stack.", owner=child_id)
        if parent:
            self.frames[parent].update(status="RUNNING", waitingFor=None,
                                       pendingExpression=copy.copy(UNBOUND))
        else:
            self.driver.update(status="RUNNING", waitingFor=None, result=value(returned, self.objects))
        self.transfer["stage"] = "delivered"
        self.event("RETURN_TRANSFER", line, child_id + " returns " + repr(returned) + " to " + (parent or "driver") +
                   ("; " + destination + " is not assigned yet." if destination else "; control resumes after this call."))
        return returned

    def condition(self, line, result, local):
        self.sync(local)
        self.transfer = None
        self.event("BASE_CHECK", line, self.lines[line - 1].strip().removeprefix("if ").removesuffix(":") + " is " + str(result) + ".",
                   {"baseCase": bool(result)})
        return result

    def ready(self, line, returned, local, implicit=False):
        self.sync(local)
        frame = self.frames[self.stack[-1]]
        frame.update(status="RETURNING", returnValue=value(returned, self.objects), returnLine=line,
                     pendingExpression=copy.copy(UNBOUND))
        self.transfer = None
        self.event("RETURN_READY", line, frame["callId"] + " prepares " + repr(returned) +
                   (" at function end (implicit return)." if implicit else "; its frame is still live."), {"implicitReturn": implicit})
        return returned

    def assigned(self, line, target, local, from_call):
        self.sync(local)
        if self.stack:
            self.frames[self.stack[-1]].update(pendingExpression=copy.copy(UNBOUND), pendingAssignment=None, suspendedCallSite=None, continuation=None)
        if self.transfer and from_call:
            self.transfer["stage"] = "assigned"
        else:
            self.transfer = None
        owner = self.stack[-1] if self.stack else "driver"
        self.event("ASSIGN_RESULT" if from_call else "LOCAL_UPDATE", line,
                   owner + " binds " + target + " = " + (self.objects.reference(local[target])["objectId"] if type(local[target]) in (dict, list) else repr(local[target])) + ".",
                   {"assignedTarget": target})

    def loop(self, line, local, exhausted=False):
        self.sync(local)
        self.transfer = None
        self.event("LOOP_END" if exhausted else "LOOP_ITERATION", line,
                   "The child loop is exhausted." if exhausted else "Python binds the next child. Existing child_total and total bindings are retained.",
                   {"loopPhase": "exhausted" if exhausted else "iteration"})

    def printed(self, line, local, *args):
        self.sync(local)
        self.transfer = None
        if self.stack:
            self.frames[self.stack[-1]].update(pendingExpression=copy.copy(UNBOUND), suspendedCallSite=None, continuation=None)
        print(*args)  # stdout is the same redirected stream used by normal Python.
        self.event("PRINT", line, (" ".join(str(arg) for arg in args)) + " is written to stdout.")

    def finish(self):
        if self.stack:
            raise ValueError("A completed fixture must have an empty function stack")
        self.driver["status"] = "COMPLETE"
        self.outcome = "completed"
        self.transfer = None
        self.event("COMPLETE", None, "Driver complete. Execution has ended; compare the result with the program’s promise.")

    def failed(self, error):
        self.outcome = "pedagogical-limit" if isinstance(error, TeachingLimit) else "runtime-error"
        for call_id in self.stack:
            self.frames[call_id]["status"] = "ABORTED"
        self.driver["status"] = "ABORTED"
        self.transfer = None
        owner = self.stack[-1] if self.stack else "driver"
        self.event("LIMIT_STOP" if isinstance(error, TeachingLimit) else "ERROR", self.frames[owner]["lastLine"] if owner in self.frames else None,
                   str(error) if isinstance(error, TeachingLimit) else type(error).__name__ + ": " + str(error),
                   {"exceptionType": type(error).__name__}, force=True, owner=owner)


def hook(method, *args):
    return ast.Call(func=ast.Attribute(value=ast.Name(id="_trace", ctx=ast.Load()), attr=method, ctx=ast.Load()),
                    args=[arg if isinstance(arg, ast.AST) else ast.Constant(arg) for arg in args], keywords=[])


def local_call():
    return ast.Call(func=ast.Name(id="locals", ctx=ast.Load()), args=[], keywords=[])


class Instrument(ast.NodeTransformer):
    def __init__(self, name):
        self.name = name
        self.inside = False

    def recursive(self, node, target=None, continuation=None):
        return hook("call", node.lineno, target, continuation, ast.Name(id=self.name, ctx=ast.Load()), ast.List(elts=node.args, ctx=ast.Load()), local_call())

    def is_recursive(self, node):
        return isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == self.name

    def visit_FunctionDef(self, node):
        self.inside = True
        node = self.generic_visit(node)
        self.inside = False
        node.body.insert(0, ast.Expr(hook("enter", node.lineno, local_call())))
        node.body.append(ast.Return(hook("ready", node.end_lineno, None, local_call(), True)))
        return node

    def visit_If(self, node):
        node = self.generic_visit(node)
        if self.inside:
            node.test = hook("condition", node.lineno, node.test, local_call())
        return node

    def visit_Return(self, node):
        return ast.copy_location(ast.Return(hook("ready", node.lineno, node.value or ast.Constant(None), local_call())), node)

    def visit_Assign(self, node):
        target = node.targets[0].id
        from_call = self.is_recursive(node.value)
        if from_call:
            node.value = self.recursive(node.value, target, "Finish assignment to " + target)
        return [ast.copy_location(ast.Expr(hook("before", node.lineno, local_call())), node), node,
                ast.copy_location(ast.Expr(hook("assigned", node.lineno, target, local_call(), from_call)), node)]

    def visit_For(self, node):
        node = self.generic_visit(node)
        node.body.insert(0, ast.copy_location(ast.Expr(hook("loop", node.lineno, local_call())), node))
        return [node, ast.copy_location(ast.Expr(hook("loop", node.lineno, local_call(), True)), node)]

    def visit_Expr(self, node):
        if self.is_recursive(node.value):
            node.value = self.recursive(node.value, None, "Next statement after line " + str(node.lineno))
        elif isinstance(node.value, ast.Call) and node.value.func.id == "print":
            node.value = hook("printed", node.lineno, local_call(), *node.value.args)
        return node


def generate(name, source, fixture_id, max_depth=8, max_events=500):
    source = source.replace("\r\n", "\n")
    recorder = Recorder(name, source, max_depth, max_events)
    tree = ast.fix_missing_locations(Instrument(recorder.name).visit(ast.parse(source)))
    namespace = {"__name__": "__main__", "_trace": recorder}
    with contextlib.redirect_stdout(recorder.output):
        try:
            exec(compile(tree, name + ".py", "exec"), namespace)
            recorder.finish()
        except (TeachingLimit, TypeError, ValueError) as error:
            recorder.failed(error)
    revision = hashlib.sha256(source.encode("utf-8")).hexdigest()
    for index, event in enumerate(recorder.events):
        event["eventId"] = fixture_id + ":" + str(index) + ":" + event["eventKind"].lower()
        if event["source"]:
            event["source"].update(fileId=name + ".py", code=source.splitlines()[event["source"]["line"] - 1])
    trace_revision = hashlib.sha256(json.dumps(recorder.events, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()
    objects_revision = hashlib.sha256(json.dumps(recorder.objects.objects, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()
    first = next((event for event in recorder.events if event["eventKind"] == "CALL"), None)
    inputs = ({p: first["frame"]["framesById"]["call-1"]["locals"][p] for p in recorder.spec["parameters"]} if first else {})
    return {"programId": name, "functionName": recorder.name, "fixtureId": fixture_id, "schemaVersion": SCHEMA_VERSION,
            "sourceRevision": revision, "traceRevision": trace_revision, "objectsRevision": objects_revision,
            "source": source, "events": recorder.events, "outcome": recorder.outcome,
            "objects": recorder.objects.objects, "inputs": inputs}


def build():
    fixtures = {}
    for name in PROGRAMS:
        for n in PRESETS:
            key = name + ":n" + str(n)
            fixtures[key] = generate(name, fixture_source(name, n), key)
            if fixtures[key]["outcome"] != "completed":
                raise ValueError("Canonical fixture failed: " + key)
            fixtures[key].update(scenarioId=key, variant="correct", correctness="correct")
    for name in ("list_total", "folder_total"):
        spec = REGISTRY[name]
        for row in spec["fixtures"]:
            for variant, repair in spec["variants"].items():
                if variant != "correct" and row["id"] != "list-main":
                    continue
                key = row["id"] + (":" + variant if variant != "correct" else "")
                item = generate(name, application_source(name, row["id"], variant), key, **{
                    "max_depth": spec["limits"]["maxDepth"], "max_events": spec["limits"]["maxEvents"]})
                item.update(scenarioId=row["id"], variant=variant, correctness=repair.get("correctness", "correct"), expected=row["expected"])
                if item["outcome"] != repair.get("outcome", "completed"):
                    raise ValueError("Fixture outcome mismatch: " + key)
                fixtures[key] = item
    return {"schemaVersion": SCHEMA_VERSION, "generatorVersion": GENERATOR_VERSION,
            "pythonVersion": platform.python_version(), "stackOrder": "top-first; driver excluded", "lessons": REGISTRY, "fixtures": fixtures}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = build()
    content = "/* Generated by tools/recursion/build_traces.py. Do not edit. */\nconst ITCC47RecursionTraces = " + json.dumps(data, separators=(",", ":"), ensure_ascii=True) + ";\n"
    output = ROOT / ("activity-packs" if args.check else ".recursion-pack-build") / "recursion-traces.js"
    if args.check:
        if not output.exists() or output.read_text(encoding="utf-8") != content:
            raise SystemExit("Recursion source/trace drift: run npm run build:recursion")
        print("PASS " + str(len(data["fixtures"])) + " reproducible Python fixtures, source hashes and generated microsteps (Python " + platform.python_version() + ")")
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
        print("Generated " + str(len(data["fixtures"])) + " recursion fixtures (" + str(len(content)) + " bytes; Python " + platform.python_version() + ")")


if __name__ == "__main__":
    main()
