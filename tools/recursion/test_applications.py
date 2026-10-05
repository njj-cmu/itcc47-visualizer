"""Independent unmodified-Python witnesses for every shipped M5 fixture.

The observer does not call the generator's instrumentation, serializer or recorder.
Line callbacks are pre-statement observations; call callbacks also observe the
actual suspended parent's locals. Exception unwinding is never a successful return.
"""
import ast
import contextlib
import copy
import hashlib
import io
import json
import sys
import unittest

from build_traces import REGISTRY, EXAMPLES, TeachingLimit, application_source, build, generate, validate_input


class WitnessLimit(Exception):
    pass


def witness(program, source, max_depth=8):
    name = REGISTRY[program]["functionName"]
    filename = program + "-raw-witness.py"
    calls, returns, lines, stack, identities, exceptions = [], [], [], [], {}, set()
    object_ids, objects, keepalive = {}, {}, []
    input_refs, input_before = {}, {}

    def encode(item):
        if type(item) in (list, dict):
            key = id(item)
            if key not in object_ids:
                oid = "object-" + str(len(object_ids) + 1)
                object_ids[key] = oid
                keepalive.append(item)
                objects[oid] = None
                objects[oid] = {"type": "list", "items": [encode(v) for v in item]} if type(item) is list else {
                    "type": "node", "fields": {k: encode(v) for k, v in item.items()}}
            return {"ref": object_ids[key]}
        return item

    def local_values(frame):
        return {key: encode(item) for key, item in frame.f_locals.items()
                if not key.startswith("__") and not callable(item)}

    def observe(frame, event, arg):
        if frame.f_code.co_filename != filename:
            return observe
        if frame.f_code.co_name == name:
            if event == "call":
                if len(stack) >= max_depth:
                    raise WitnessLimit("external teaching-depth witness")
                cid = "call-" + str(len(calls) + 1)
                parent = stack[-1] if stack else None
                if parent is None:
                    input_refs.update({p: frame.f_locals[p] for p in REGISTRY[program]["parameters"]})
                    input_before.update(copy.deepcopy(input_refs))
                identities[id(frame)] = cid
                calls.append({"id": cid, "parent": parent, "site": frame.f_back.f_lineno,
                              "locals": local_values(frame), "parentLocals": local_values(frame.f_back),
                              "identities": {p: id(frame.f_locals[p]) for p in REGISTRY[program]["parameters"]
                                             if type(frame.f_locals[p]) in (list, dict)}})
                stack.append(cid)
            elif event == "line":
                lines.append({"id": identities[id(frame)], "line": frame.f_lineno, "locals": local_values(frame), "stack": list(stack)})
            elif event == "exception":
                exceptions.add(identities[id(frame)])
            elif event == "return":
                cid = identities[id(frame)]
                if cid not in exceptions:
                    returns.append({"id": cid, "result": encode(arg), "locals": local_values(frame)})
                if stack and stack[-1] == cid:
                    stack.pop()
        elif frame.f_code.co_name == "<module>" and event == "line":
            lines.append({"id": "driver", "line": frame.f_lineno, "locals": local_values(frame), "stack": []})
        return observe

    namespace, output, error = {"__name__": "__main__"}, io.StringIO(), None
    previous_trace = sys.gettrace()
    try:
        sys.settrace(observe)
        with contextlib.redirect_stdout(output):
            exec(compile(source, filename, "exec"), namespace)
    except Exception as exc:
        error = exc
    finally:
        sys.settrace(previous_trace)
    return {"calls": calls, "returns": returns, "lines": lines, "objects": objects,
            "stdout": output.getvalue(), "error": error, "namespace": namespace,
            "object_ids": object_ids, "retained": keepalive,
            "inputsBefore": input_before, "inputsAfter": copy.deepcopy(input_refs)}


def native(tag):
    if tag["kind"] == "REFERENCE":
        return {"ref": tag["objectId"]}
    if tag["kind"] == "NONE":
        return None
    return tag["value"]


def bound(locals_):
    return {name: native(tag) for name, tag in locals_.items() if tag["kind"] != "UNBOUND"}


class Applications(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = build()

    def test_every_source_executes_unmodified_with_independent_intermediate_witness(self):
        for key, item in self.pack["fixtures"].items():
            with self.subTest(fixture=key):
                ast.parse(item["source"], feature_version=(3, 9))
                raw = witness(item["programId"], item["source"])
                self.assertEqual(raw["inputsBefore"], raw["inputsAfter"])
                expected_error = {"completed": None, "runtime-error": TypeError, "pedagogical-limit": WitnessLimit}[item["outcome"]]
                self.assertEqual(type(raw["error"]) if raw["error"] else None, expected_error)
                entries = [e for e in item["events"] if e["eventKind"] == "CALL"]
                self.assertEqual(len(entries), len(raw["calls"]))
                for event, observed in zip(entries, raw["calls"]):
                    f = event["frame"]
                    call = f["framesById"][f["activeCallId"]]
                    self.assertEqual((call["callId"], call["parentCallId"], call["callSite"]),
                                     (observed["id"], observed["parent"], observed["site"]))
                    self.assertEqual(bound(call["locals"]), observed["locals"])
                    if observed["parent"]:
                        self.assertEqual(bound(f["framesById"][observed["parent"]]["locals"]), observed["parentLocals"])
                completed = [e["frame"]["returnTransfer"] for e in item["events"] if e["eventKind"] == "RETURN_COMPLETE"]
                self.assertEqual([(t["childCallId"], native(t["value"])) for t in completed],
                                 [(r["id"], r["result"]) for r in raw["returns"]])
                ready = [e for e in item["events"] if e["eventKind"] == "RETURN_READY"]
                for event, observed in zip(ready, raw["returns"]):
                    self.assertEqual(bound(event["frame"]["framesById"][observed["id"]]["locals"]), observed["locals"])
                for event in item["events"]:
                    f = event["frame"]
                    self.assertLessEqual(sum(f["framesById"][cid]["status"] in ("RUNNING", "RETURNING") for cid in f["stack"]), 1)
                    self.assertFalse(set(f["stack"]) & set(f["history"]))
                    if event["eventKind"] in ("ASSIGN_RESULT", "LOCAL_UPDATE", "LOOP_ITERATION"):
                        owner = f["activeCallId"] or "driver"
                        local = bound((f["framesById"][owner] if owner != "driver" else f["driver"])["locals"])
                        self.assertTrue(any(r["id"] == owner and r["locals"] == local for r in raw["lines"]), (key, event["eventId"], local))
                    if event["source"]:
                        self.assertEqual(event["source"]["code"], item["source"].splitlines()[event["source"]["line"] - 1])
                final = item["events"][-1]["frame"]
                self.assertEqual(final["stdout"], raw["stdout"])
                if "answer" in raw["namespace"]:
                    self.assertEqual(native(final["driver"]["locals"]["answer"]), raw["namespace"]["answer"])
                elif "answer" in final["driver"]["locals"]:
                    self.assertEqual(final["driver"]["locals"]["answer"]["kind"], "UNBOUND")
                objects = {oid: {"type": obj["type"], **({"items": [native(v) for v in obj["items"]]} if obj["type"] == "list" else
                           {"fields": {k: native(v) for k, v in obj["fields"].items()}})} for oid, obj in item["objects"].items()}
                self.assertEqual(objects, raw["objects"])

    def test_declared_list_and_folder_contracts(self):
        for program in ("list_total", "folder_total"):
            for spec in REGISTRY[program]["fixtures"]:
                item = self.pack["fixtures"][spec["id"]]
                final = item["events"][-1]["frame"]
                with self.subTest(fixture=spec["id"]):
                    self.assertEqual(native(final["driver"]["locals"]["answer"]), spec["expected"]["result"])
                    self.assertEqual(final["stdout"], str(spec["expected"]["result"]) + "\n")
                    self.assertEqual(final["metrics"]["totalInvocations"], spec["expected"]["calls"])
                    self.assertEqual(final["metrics"]["maxDepth"], spec["expected"]["maxDepth"])
                    self.assertEqual([native(e["frame"]["returnTransfer"]["value"]) for e in item["events"] if e["eventKind"] == "RETURN_COMPLETE"], spec["expected"]["returns"])

    def test_source_defaults_are_exact_reference_files_and_lists_are_not_sliced(self):
        for program, fixture_id in (("list_total", "list-main"), ("folder_total", "folder-course")):
            self.assertEqual(application_source(program, fixture_id), (EXAMPLES / REGISTRY[program]["source"]).read_text(encoding="utf-8"))
        for variant in REGISTRY["list_total"]["variants"]:
            source = application_source("list_total", "list-main", variant)
            source_file = REGISTRY["list_total"]["variants"][variant].get("source", "list_total.py")
            self.assertEqual(source, (EXAMPLES / source_file).read_text(encoding="utf-8"))
            self.assertFalse(any(isinstance(node, ast.Slice) for node in ast.walk(ast.parse(source))))

    def test_list_identity_own_indices_and_terminal_suffix(self):
        for key in ("list-main", "list-suffix", "list-mixed"):
            item = self.pack["fixtures"][key]
            raw = witness("list_total", item["source"])
            self.assertEqual(len({c["identities"]["values"] for c in raw["calls"]}), 1)
            indices = [c["locals"]["index"] for c in raw["calls"]]
            self.assertEqual(indices, list(range(indices[0], 5)))
            for e in item["events"]:
                for cid in e["frame"]["stack"]:
                    call = e["frame"]["framesById"][cid]
                    if call["status"] == "WAITING":
                        self.assertEqual(call["locals"]["child_total"]["kind"], "UNBOUND")
                        self.assertEqual(call["locals"]["total"]["kind"], "UNBOUND")
        source = application_source("list_total", "list-main").replace("answer = list_total(values, 0)", "answer = list_total(values, 4)")
        item = generate("list_total", source, "terminal-suffix")
        self.assertEqual(item["events"][-1]["frame"]["stdout"], "0\n")
        self.assertEqual(item["events"][-1]["frame"]["metrics"]["totalInvocations"], 1)
        default_source = application_source("list_total", "list-main").replace("list_total(values, 0)", "list_total(values)")
        self.assertEqual(generate("list_total", default_source, "default-index")["events"][-1]["frame"]["stdout"], "14\n")

    def test_folder_retained_binding_assignment_and_accumulation_are_distinct(self):
        item = self.pack["fixtures"]["folder-course"]
        root_children = [e for e in item["events"] if e["eventKind"] == "CALL" and e["frame"]["framesById"][e["frame"]["activeCallId"]]["parentCallId"] == "call-1"]
        roots = [e["frame"]["framesById"]["call-1"] for e in root_children]
        self.assertEqual([native(r["locals"]["total"]) for r in roots], [0, 120, 200, 300])
        self.assertEqual(roots[0]["locals"]["child_total"]["kind"], "UNBOUND")
        self.assertEqual([native(r["locals"]["child_total"]) for r in roots[1:]], [120, 80, 100])
        self.assertTrue(all(r["pendingAssignment"]["target"] == "child_total" for r in roots))
        second = next(i for i, e in enumerate(item["events"]) if e["eventKind"] == "RETURN_TRANSFER" and e["frame"]["returnTransfer"]["childCallId"] == "call-3")
        events = item["events"][second:second + 3]
        self.assertEqual([e["eventKind"] for e in events], ["RETURN_TRANSFER", "ASSIGN_RESULT", "LOCAL_UPDATE"])
        self.assertEqual([(native(e["frame"]["framesById"]["call-1"]["locals"]["child_total"]), native(e["frame"]["framesById"]["call-1"]["locals"]["total"])) for e in events], [(120, 120), (80, 120), (80, 200)])
        self.assertIsNotNone(events[0]["frame"]["framesById"]["call-1"]["pendingAssignment"])
        self.assertIsNone(events[1]["frame"]["framesById"]["call-1"]["pendingAssignment"])

    def test_folder_identity_source_order_file_locals_and_nonmutation(self):
        item = self.pack["fixtures"]["folder-course"]
        raw = witness("folder_total", item["source"])
        ids = [c["locals"]["node"]["ref"] for c in raw["calls"]]
        self.assertEqual([raw["objects"][oid]["fields"]["name"] for oid in ids], ["Course", "notes.txt", "index.txt", "Examples", "a.py", "b.py", "Data", "Raw", "input.txt"])
        self.assertEqual(len(set(c["identities"]["node"] for c in raw["calls"])), 9)
        parents = {c["id"]: c["parent"] for c in raw["calls"]}
        for line in raw["lines"]:
            for index, cid in enumerate(line["stack"]):
                self.assertEqual(parents[cid], line["stack"][index - 1] if index else None)
        for event in item["events"]:
            for call in event["frame"]["framesById"].values():
                node = item["objects"][call["locals"]["node"]["objectId"]]
                if node["fields"]["kind"]["value"] == "file":
                    self.assertTrue(all(call["locals"][name]["kind"] == "UNBOUND" for name in ("total", "child", "child_total")))
        for key in ("list-main", "folder-course", "folder-duplicates"):
            fixture = self.pack["fixtures"][key]
            before = json.dumps(fixture)
            again = generate(fixture["programId"], fixture["source"], fixture["fixtureId"])
            self.assertEqual(again["objects"], fixture["objects"])
            self.assertEqual(again["traceRevision"], fixture["traceRevision"])
            self.assertEqual(json.dumps(fixture), before)

    def test_four_repairs_first_divergence_and_real_failure_paths(self):
        for variant, spec in REGISTRY["list_total"]["variants"].items():
            if variant == "correct":
                continue
            item = self.pack["fixtures"]["list-main:" + variant]
            self.assertEqual(item["outcome"], spec["outcome"])
            self.assertEqual(item["events"][-1]["frame"]["stdout"], spec["stdout"])
        wrong = self.pack["fixtures"]["list-main:wrong_base"]
        first = next(e for e in wrong["events"] if e["eventKind"] == "RETURN_READY")
        self.assertEqual(native(first["frame"]["framesById"][first["frame"]["activeCallId"]]["returnValue"]), 1)
        missing = self.pack["fixtures"]["list-main:missing_combine"]
        first = [e for e in missing["events"] if e["eventKind"] == "RETURN_READY"][1]
        call = first["frame"]["framesById"][first["frame"]["activeCallId"]]
        self.assertEqual((native(call["locals"]["total"]), native(call["returnValue"])), (1, 0))
        printed = self.pack["fixtures"]["list-main:print_instead_of_return"]
        raw = witness("list_total", printed["source"])
        self.assertEqual([(r["id"], r["result"]) for r in raw["returns"]], [("call-5", 0), ("call-4", None)])
        self.assertIsInstance(raw["error"], TypeError)
        for variant in ("print_instead_of_return", "no_progress"):
            failed = self.pack["fixtures"]["list-main:" + variant]
            final = failed["events"][-1]["frame"]
            self.assertEqual(final["driver"]["locals"]["answer"]["kind"], "UNBOUND")
            self.assertIsNone(final["activeCallId"])
            self.assertIsNone(final["returnTransfer"])
            self.assertNotIn("COMPLETE", [e["eventKind"] for e in failed["events"]])
        limit = self.pack["fixtures"]["list-main:no_progress"]["events"][-1]
        self.assertEqual(limit["frame"]["metrics"]["maxDepth"], 8)
        self.assertTrue(all(native(c["locals"]["index"]) == 0 for c in limit["frame"]["framesById"].values()))
        self.assertEqual(limit["frame"]["annotations"]["exceptionType"], "TeachingLimit")

    def test_invalid_input_and_unsupported_syntax_fail_before_execution(self):
        for values, index in (([1], -1), ([1], 2), ([True], 0), ([1001], 0), ([1] * 7, 0), ([1], True)):
            with self.assertRaises(ValueError):
                validate_input("list_total", [values, index])
        cycle = {"kind": "folder", "name": "Cycle", "children": []}
        cycle["children"].append(cycle)
        child = {"kind": "file", "name": "same", "bytes": 1}
        for node in (cycle, {"kind": "folder", "name": "Shared", "children": [child, child]},
                     {"kind": "file", "name": "Bad", "bytes": -1}, {"kind": "folder", "name": "Bad", "children": "oops"}):
            with self.assertRaises(ValueError):
                validate_input("folder_total", [node])
        source = application_source("list_total", "list-main")
        for broken in (source + "\nimport os", source.replace("values[index]", "values[index:]"), source.replace("total = values[index] + child_total", "values[index] = 4"), source.replace("child_total = list_total(values, index + 1)", "child_total = 1 + list_total(values, index + 1)"), source.replace("values = [4, 2, 7, 1]", "values = [True]")):
            with self.assertRaises(ValueError):
                generate("list_total", broken, "invalid")

    def test_bounds_cleanup_and_semantic_reproducibility(self):
        source = application_source("list_total", "list-main", "no_progress")
        previous = sys.gettrace()
        raw = witness("list_total", source)
        self.assertIsInstance(raw["error"], WitnessLimit)
        self.assertEqual(sys.gettrace(), previous)
        limited = generate("list_total", source, "event-stop", max_events=4)
        self.assertEqual(limited["outcome"], "pedagogical-limit")
        self.assertEqual(len(limited["events"]), 5)
        second = build()
        self.assertEqual(second, self.pack)
        self.assertEqual(second["schemaVersion"], 2)
        self.assertTrue(second["pythonVersion"])
        for item in second["fixtures"].values():
            self.assertEqual(hashlib.sha256(item["source"].encode()).hexdigest(), item["sourceRevision"])
            self.assertEqual(hashlib.sha256(json.dumps(item["objects"], separators=(",", ":"), ensure_ascii=False).encode()).hexdigest(), item["objectsRevision"])


if __name__ == "__main__":
    unittest.main()
