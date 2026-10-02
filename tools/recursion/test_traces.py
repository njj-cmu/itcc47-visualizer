"""Independent CPython observations plus lesson invariants, including failure paths."""
import ast
import contextlib
import hashlib
import io
import sys
import unittest

from build_traces import PRESETS, PROGRAMS, fixture_source, generate, validate, value


def witness(name, source):
    """Unmodified bytecode and sys.settrace, independent of the educational adapter."""
    filename = name + "-witness.py"
    calls, returns, lines = [], [], []
    identities = {}

    def observe(frame, event, arg):
        if frame.f_code.co_filename != filename:
            return observe
        if frame.f_code.co_name == name:
            if event == "call":
                call_id = "call-" + str(len(calls) + 1)
                identities[id(frame)] = call_id
                calls.append((call_id, identities.get(id(frame.f_back)), frame.f_locals["n"]))
            elif event == "return":
                returns.append((identities[id(frame)], frame.f_locals["n"], arg))
            elif event == "line":
                lines.append((identities[id(frame)], frame.f_lineno, dict(frame.f_locals)))
        return observe

    stdout, namespace = io.StringIO(), {"__name__": "__main__"}
    try:
        sys.settrace(observe)
        with contextlib.redirect_stdout(stdout):
            exec(compile(source, filename, "exec"), namespace)
    finally:
        sys.settrace(None)
    return calls, returns, lines, stdout.getvalue(), namespace.get("answer")


class Foundations(unittest.TestCase):
    def test_source_call_return_and_uninstrumented_equivalence_all_presets(self):
        for name in PROGRAMS:
            for n in PRESETS:
                with self.subTest(program=name, n=n):
                    source = fixture_source(name, n)
                    ast.parse(source, feature_version=(3, 9))
                    item = generate(name, source, name + ":n" + str(n))
                    events = item["events"]
                    raw_calls, raw_returns, raw_lines, stdout, answer = witness(name, source)
                    entries = [e for e in events if e["eventKind"] == "CALL"]
                    completions = [e for e in events if e["eventKind"] == "RETURN_COMPLETE"]
                    self.assertEqual(item["outcome"], "completed")
                    self.assertEqual(item["sourceRevision"], hashlib.sha256(source.encode()).hexdigest())
                    self.assertEqual([e["frame"]["framesById"][e["frame"]["activeCallId"]]["locals"]["n"]["value"] for e in entries], list(range(n, -1, -1)))
                    observed_calls = [(e["frame"]["activeCallId"], e["frame"]["framesById"][e["frame"]["activeCallId"]]["parentCallId"],
                                       e["frame"]["framesById"][e["frame"]["activeCallId"]]["locals"]["n"]["value"]) for e in entries]
                    self.assertEqual(observed_calls, raw_calls)
                    self.assertEqual([e["frame"]["returnTransfer"]["value"] for e in completions],
                                     [value(result) for _, _, result in raw_returns])
                    self.assertEqual([e["frame"]["framesById"][e["frame"]["returnTransfer"]["childCallId"]]["locals"]["n"]["value"] for e in completions], list(range(n + 1)))
                    final = events[-1]["frame"]
                    self.assertEqual(final["metrics"], {"totalInvocations": n + 1, "currentDepth": 0, "maxDepth": n + 1})
                    self.assertEqual(final["stack"], [])
                    self.assertEqual(final["stdout"], stdout)
                    expected = (str(n * (n + 1) // 2) + "\n") if name == "sum_to" else "".join(
                        ["enter " + str(i) + "\n" for i in range(n, 0, -1)] +
                        ["leave " + str(i) + "\n" for i in range(1, n + 1)])
                    self.assertEqual(stdout, expected)
                    if name == "sum_to":
                        self.assertEqual(final["driver"]["locals"]["answer"], value(answer))
                    else:
                        self.assertTrue(all(e["frame"]["returnTransfer"]["value"] == value(None) for e in completions))
                    # Every completed local assignment is observed on a subsequent raw Python line.
                    for e in events:
                        if e["eventKind"] in ("ASSIGN_RESULT", "LOCAL_UPDATE") and e["frame"]["activeCallId"]:
                            cid = e["frame"]["activeCallId"]
                            bound = {k: v["value"] for k, v in e["frame"]["framesById"][cid]["locals"].items() if v["kind"] == "INTEGER"}
                            self.assertTrue(any(raw_id == cid and all(local.get(k) == v for k, v in bound.items())
                                                for raw_id, _, local in raw_lines), (cid, bound))

    def test_suspension_handoff_and_binding_phases(self):
        for name in PROGRAMS:
            for n in PRESETS:
                events = generate(name, fixture_source(name, n), "test")["events"]
                original_n = {}
                for index, e in enumerate(events):
                    f = e["frame"]
                    running = [cid for cid in f["stack"] if f["framesById"][cid]["status"] == "RUNNING"]
                    self.assertLessEqual(len(running), 1)
                    self.assertEqual(f["metrics"]["currentDepth"], len(f["stack"]))
                    self.assertFalse(set(f["stack"]) & set(f["history"]))
                    for pos, cid in enumerate(f["stack"]):
                        frame = f["framesById"][cid]
                        original_n.setdefault(cid, frame["locals"]["n"])
                        self.assertEqual(original_n[cid], frame["locals"]["n"])
                        self.assertEqual(frame["parentCallId"], f["stack"][pos + 1] if pos + 1 < len(f["stack"]) else None)
                        if frame["status"] == "WAITING" and name == "sum_to":
                            self.assertEqual(frame["locals"]["child_total"]["kind"], "UNBOUND")
                            self.assertEqual(frame["locals"]["total"]["kind"], "UNBOUND")
                            self.assertEqual(frame["pendingExpression"]["kind"], "PENDING")
                    if e["eventKind"] == "RETURN_READY":
                        child = f["activeCallId"]
                        self.assertIn(child, f["stack"])
                        self.assertEqual(events[index + 1]["eventKind"], "RETURN_COMPLETE")
                        self.assertNotIn(child, events[index + 1]["frame"]["stack"])
                        transfer = events[index + 2]
                        self.assertEqual(transfer["eventKind"], "RETURN_TRANSFER")
                        payload = transfer["frame"]["returnTransfer"]
                        self.assertEqual(payload["callerCallId"], f["framesById"][child]["parentCallId"])
                        self.assertEqual(payload["callSite"], f["framesById"][child]["callSite"])
                        self.assertEqual(payload["value"], f["framesById"][child]["returnValue"])
                        if name == "sum_to":
                            owner = transfer["frame"]["framesById"][payload["callerCallId"]] if payload["callerCallId"] else transfer["frame"]["driver"]
                            self.assertEqual(owner["locals"][payload["destination"]]["kind"], "UNBOUND")
                            assigned = events[index + 3]
                            self.assertEqual(assigned["eventKind"], "ASSIGN_RESULT")
                            owner = assigned["frame"]["framesById"][payload["callerCallId"]] if payload["callerCallId"] else assigned["frame"]["driver"]
                            self.assertEqual(owner["locals"][payload["destination"]], payload["value"])
                        if payload["callerCallId"]:
                            caller = transfer["frame"]["framesById"][payload["callerCallId"]]
                            self.assertEqual(caller["pendingExpression"]["kind"], "UNBOUND")
                            self.assertEqual(caller["status"], "RUNNING")
                    if name == "sum_to" and f["stack"]:
                        self.assertEqual(f["driver"]["locals"]["answer"]["kind"], "UNBOUND")
                        self.assertEqual(f["stdout"], "")
                    if index and e["eventKind"] != "PRINT":
                        self.assertEqual(f["stdout"], events[index - 1]["frame"]["stdout"])
                    if e["source"]:
                        self.assertEqual(e["source"]["code"], fixture_source(name, n).splitlines()[e["source"]["line"] - 1])

    def test_default_numeric_chain(self):
        events = generate("sum_to", fixture_source("sum_to", 3), "default")["events"]
        self.assertEqual([e["frame"]["returnTransfer"]["value"]["value"] for e in events if e["eventKind"] == "RETURN_COMPLETE"], [0, 1, 3, 6])
        self.assertEqual([e["frame"]["framesById"][e["frame"]["activeCallId"]]["locals"]["total"]["value"] for e in events if e["eventKind"] == "LOCAL_UPDATE"], [1, 3, 6])

    def test_fail_closed_source_and_input(self):
        for n in (-1, 2, 100, True, "3"):
            with self.assertRaises(ValueError):
                fixture_source("countdown", n)
        for suffix in ("\nimport os", "\nopen('file')", "\nwhile True: pass"):
            with self.assertRaises(ValueError):
                generate("sum_to", fixture_source("sum_to", 3) + suffix, "unsupported")
        compact = fixture_source("sum_to", 3).replace("child_total = sum_to(n - 1)", "child_total = 1 + sum_to(n - 1)")
        with self.assertRaises(ValueError):
            generate("sum_to", compact, "unsupported-compact")

    def test_real_runtime_error_is_not_success(self):
        broken = fixture_source("sum_to", 3).replace("return total", "print(total)")
        item = generate("sum_to", broken, "missing-return")
        self.assertEqual(item["outcome"], "runtime-error")
        self.assertEqual(item["events"][-1]["eventKind"], "ERROR")
        self.assertIn("TypeError", item["events"][-1]["message"])
        self.assertFalse(any(e["eventKind"] == "COMPLETE" for e in item["events"]))
        self.assertEqual(item["events"][-1]["frame"]["driver"]["locals"]["answer"]["kind"], "UNBOUND")

    def test_teaching_depth_and_event_limits_are_not_python_recursion_errors(self):
        broken = fixture_source("sum_to", 3).replace("sum_to(n - 1)", "sum_to(n)")
        item = generate("sum_to", broken, "no-progress")
        self.assertEqual(item["outcome"], "pedagogical-limit")
        self.assertEqual(item["events"][-1]["frame"]["metrics"]["maxDepth"], 8)
        self.assertIn("not Python's recursion limit", item["events"][-1]["message"])
        short = generate("countdown", fixture_source("countdown", 5), "event-limit", max_events=6)
        self.assertEqual(short["events"][-1]["eventKind"], "LIMIT_STOP")
        self.assertNotEqual(short["outcome"], "completed")


if __name__ == "__main__":
    unittest.main()
