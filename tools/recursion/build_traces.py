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

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = Path(__file__).parent / "examples"
GENERATOR_VERSION = "m5-ast-1"
SCHEMA_VERSION = 1
PRESETS = (0, 1, 3, 5)
PROGRAMS = ("countdown", "sum_to")
UNBOUND = {"kind": "UNBOUND"}
PENDING = {"kind": "PENDING"}


def value(item):
    if item is None:
        return {"kind": "NONE"}
    if type(item) is int:
        return {"kind": "INTEGER", "value": item}
    raise ValueError("Unsupported fixture value")


class TeachingLimit(Exception):
    pass


def validate(tree, name):
    """Reject anything outside these two numeric lesson forms before exec."""
    allowed = (ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.If,
               ast.Return, ast.Expr, ast.Assign, ast.Call, ast.Name, ast.Load,
               ast.Store, ast.Constant, ast.Compare, ast.Eq, ast.BinOp, ast.Add,
               ast.Sub)
    functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    if len(functions) != 1 or functions[0].name != name:
        raise ValueError("Exactly one declared lesson function is supported")
    fn = functions[0]
    if (len(fn.args.args) != 1 or fn.args.args[0].arg != "n"
            or fn.args.defaults or fn.args.kwonlyargs or fn.args.posonlyargs
            or fn.args.vararg or fn.args.kwarg or fn.decorator_list
            or fn.returns or fn.args.args[0].annotation):
        raise ValueError("Only a plain function(n) is supported")
    parents = {child: parent for parent in ast.walk(tree) for child in ast.iter_child_nodes(parent)}
    for node in ast.walk(tree):
        if not isinstance(node, allowed):
            raise ValueError("Unsupported Python construct: " + type(node).__name__)
        if isinstance(node, ast.FunctionDef) and node is not fn:
            raise ValueError("Nested function definitions are outside the fixture contract")
        if isinstance(node, ast.Name) and node.id not in {
                name, "n", "child_total", "total", "answer", "print", "__name__"}:
            raise ValueError("Unsupported name: " + node.id)
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in (name, "print") or node.keywords:
                raise ValueError("Only lesson calls and print are supported")
            if node.func.id == name and len(node.args) != 1:
                raise ValueError("Lesson calls take exactly one argument")
            parent = parents[node]
            if not ((isinstance(parent, ast.Expr) and parent.value is node)
                    or (node.func.id == name and isinstance(parent, ast.Assign) and parent.value is node)):
                raise ValueError("Calls must be standalone statements or expanded result assignments")
        if isinstance(node, ast.Assign) and (len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name)):
            raise ValueError("Only a single local assignment is supported")
        if isinstance(node, ast.Constant) and type(node.value) not in (int, str, type(None)):
            raise ValueError("Unsupported literal")
        if isinstance(node, ast.If):
            test = node.test
            if not (isinstance(test, ast.Compare) and len(test.ops) == 1 and isinstance(test.ops[0], ast.Eq)
                    and isinstance(test.left, ast.Name) and test.left.id in ("n", "__name__")
                    and len(test.comparators) == 1 and isinstance(test.comparators[0], ast.Constant)):
                raise ValueError("Only the base test and main guard are supported")
    return fn


def fixture_source(name, n):
    if name not in PROGRAMS or type(n) is not int or n not in PRESETS:
        raise ValueError("Supported fixtures use n = 0, 1, 3, 5")
    text = (EXAMPLES / (name + ".py")).read_text(encoding="utf-8").replace("\r\n", "\n")
    driver = name + "(3)"
    if text.count(driver) != 1:
        raise ValueError("Canonical driver must occur exactly once")
    return text.replace(driver, name + "(" + str(n) + ")")


class Recorder:
    def __init__(self, name, source, max_depth=8, max_events=500):
        self.name, self.source = name, source
        self.lines = source.splitlines()
        self.max_depth, self.max_events = max_depth, max_events
        self.events, self.stack, self.frames, self.history = [], [], {}, []
        self.calls, self.depth = 0, 0
        self.transfer, self.outcome = None, "running"
        self.driver = {"status": "READY", "locals": {"answer": copy.copy(UNBOUND)} if name == "sum_to" else {},
                       "result": copy.copy(UNBOUND), "waitingFor": None}
        self.output = io.StringIO()
        tree = ast.parse(source)
        self.fn = validate(tree, name)
        self.local_names = ["n"] + sorted({node.targets[0].id for node in ast.walk(self.fn)
                                         if isinstance(node, ast.Assign)})
        self.driver_line = next(node.lineno for node in ast.walk(tree)
                                if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                                and node.func.id == name and node.lineno > self.fn.end_lineno)
        self.pending_site = None
        self.event("INITIAL", self.driver_line, "Before the driver calls " + name + ".")

    def active(self):
        if self.stack and self.frames[self.stack[-1]]["status"] in ("RUNNING", "RETURNING"):
            return self.stack[-1]
        return None

    def event(self, kind, line, message, annotations=None, force=False):
        if len(self.events) >= self.max_events and not force:
            raise TeachingLimit("Teaching safety stop: event limit " + str(self.max_events))
        self.events.append(copy.deepcopy({
            "eventKind": kind, "source": {"line": line, "phase": kind.lower()} if line else None,
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
            frame["locals"] = {key: value(local[key]) if key in local else copy.copy(UNBOUND) for key in self.local_names}
        else:
            self.driver["locals"] = {key: value(local[key]) if key in local else copy.copy(UNBOUND)
                                     for key in self.driver["locals"]}

    def enter(self, line, local):
        self.calls += 1
        call_id = "call-" + str(self.calls)
        parent = self.stack[-1] if self.stack else None
        self.frames[call_id] = {"callId": call_id, "functionName": self.name, "parentCallId": parent,
                               "callSite": self.pending_site, "status": "RUNNING", "locals": {},
                               "waitingFor": None, "suspendedCallSite": None, "continuation": None,
                               "returnValue": copy.copy(UNBOUND), "pendingExpression": copy.copy(UNBOUND)}
        if parent:
            self.frames[parent]["waitingFor"] = call_id
        else:
            self.driver["waitingFor"] = call_id
        self.stack.append(call_id)
        self.depth = max(self.depth, len(self.stack))
        self.sync(local)
        self.transfer = None
        self.event("CALL", line, call_id + " enters " + self.name + "(" + str(local["n"]) + ").",
                   {"measure": local["n"], "callSite": self.pending_site})

    def call(self, line, destination, continuation, fn, n, local):
        self.sync(local)
        if len(self.stack) >= self.max_depth:
            raise TeachingLimit("Teaching safety stop: depth limit " + str(self.max_depth) + " (not Python's recursion limit)")
        if type(n) is not int:
            raise ValueError("Fixture arguments must be integers")
        parent = self.stack[-1] if self.stack else None
        if parent:
            caller = self.frames[parent]
            caller.update(status="WAITING", suspendedCallSite=line, continuation=continuation,
                          pendingExpression=copy.copy(PENDING))
        else:
            self.driver.update(status="WAITING", result=copy.copy(PENDING))
        self.pending_site = line
        returned = fn(n)  # Real Python invokes the instrumented function.
        child_id = self.stack.pop()
        child = self.frames[child_id]
        child["status"] = "COMPLETE"
        self.history.append(child_id)
        self.transfer = {"childCallId": child_id, "callerCallId": parent, "value": value(returned),
                         "destination": destination or "discarded expression result", "callSite": line, "stage": "popped"}
        self.event("RETURN_COMPLETE", child["returnLine"], child_id + " completes and leaves the live stack.")
        if parent:
            self.frames[parent].update(status="RUNNING", waitingFor=None,
                                       pendingExpression=copy.copy(UNBOUND))
        else:
            self.driver.update(status="RUNNING", waitingFor=None, result=value(returned))
        self.transfer["stage"] = "delivered"
        self.event("RETURN_TRANSFER", line, child_id + " returns " + repr(returned) + " to " + (parent or "driver") +
                   ("; " + destination + " is not assigned yet." if destination else "; control resumes after this call."))
        return returned

    def condition(self, line, result, local):
        self.sync(local)
        self.transfer = None
        self.event("BASE_CHECK", line, "Base case n == 0 is " + str(result) + ".",
                   {"baseCase": bool(result)})
        return result

    def ready(self, line, returned, local, implicit=False):
        self.sync(local)
        frame = self.frames[self.stack[-1]]
        frame.update(status="RETURNING", returnValue=value(returned), returnLine=line,
                     pendingExpression=copy.copy(UNBOUND))
        self.transfer = None
        self.event("RETURN_READY", line, frame["callId"] + " prepares " + repr(returned) +
                   (" at function end (implicit return)." if implicit else "; its frame is still live."))
        return returned

    def assigned(self, line, target, local, from_call):
        self.sync(local)
        if self.stack:
            self.frames[self.stack[-1]].update(pendingExpression=copy.copy(UNBOUND), suspendedCallSite=None, continuation=None)
        if self.transfer and from_call:
            self.transfer["stage"] = "assigned"
        else:
            self.transfer = None
        owner = self.stack[-1] if self.stack else "driver"
        self.event("ASSIGN_RESULT" if from_call else "LOCAL_UPDATE", line,
                   owner + " binds " + target + " = " + repr(local[target]) + ".")

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
        self.event("COMPLETE", None, "Driver complete. Playback reviewed; this is not a grade.")

    def failed(self, error):
        self.outcome = "pedagogical-limit" if isinstance(error, TeachingLimit) else "runtime-error"
        for call_id in self.stack:
            self.frames[call_id]["status"] = "ABORTED"
        self.driver["status"] = "ABORTED"
        self.transfer = None
        self.event("LIMIT_STOP" if isinstance(error, TeachingLimit) else "ERROR", None,
                   str(error) if isinstance(error, TeachingLimit) else type(error).__name__ + ": " + str(error), force=True)


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
        return hook("call", node.lineno, target, continuation, ast.Name(id=self.name, ctx=ast.Load()), node.args[0], local_call())

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
        return [node, ast.copy_location(ast.Expr(hook("assigned", node.lineno, target, local_call(), from_call)), node)]

    def visit_Expr(self, node):
        if self.is_recursive(node.value):
            node.value = self.recursive(node.value, None, "Next statement after line " + str(node.lineno))
        elif isinstance(node.value, ast.Call) and node.value.func.id == "print":
            node.value = hook("printed", node.lineno, local_call(), *node.value.args)
        return node


def generate(name, source, fixture_id, max_depth=8, max_events=500):
    recorder = Recorder(name, source, max_depth, max_events)
    tree = ast.fix_missing_locations(Instrument(name).visit(ast.parse(source)))
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
    return {"programId": name, "fixtureId": fixture_id, "sourceRevision": revision, "traceRevision": trace_revision,
            "source": source, "events": recorder.events, "outcome": recorder.outcome}


def build():
    fixtures = {}
    for name in PROGRAMS:
        for n in PRESETS:
            key = name + ":n" + str(n)
            fixtures[key] = generate(name, fixture_source(name, n), key)
            if fixtures[key]["outcome"] != "completed":
                raise ValueError("Canonical fixture failed: " + key)
    return {"schemaVersion": SCHEMA_VERSION, "generatorVersion": GENERATOR_VERSION,
            "pythonVersion": platform.python_version(), "stackOrder": "top-first; driver excluded", "fixtures": fixtures}


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
        print("PASS eight reproducible Python fixtures, source hashes and generated microsteps")
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
        print("Generated eight recursion fixtures (" + str(len(content)) + " bytes; Python " + platform.python_version() + ")")


if __name__ == "__main__":
    main()
