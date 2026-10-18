#!/usr/bin/env python3
"""Record the scripted agent with ReplayKit, fork it four ways, export the site JSON.

usage: python3 export_replay.py REPLAYKIT_CHECKOUT OUT_JSON COMMIT
Everything comes from ReplayKit itself: collector (record), CLI (plan/fork),
`replaykit serve` (read back spans, artifacts, diffs, workspace diffs).
"""
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request

RK, OUT, COMMIT = sys.argv[1], sys.argv[2], sys.argv[3]
BIN = os.path.join(RK, "target/debug")
AGENT = os.path.join(RK, "examples/scripted-agent")
WORK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site-export")
shutil.rmtree(WORK, ignore_errors=True)
os.makedirs(WORK)
WS, DATA, SANDBOXES = os.path.join(WORK, "ws"), os.path.join(WORK, "data"), os.path.join(WORK, "sandboxes")
FIXER = "python3 " + os.path.join(AGENT, "fixer.py")

PATCHES = ["prompt_edit", "model_config_edit", "tool_output_override", "env_var_override",
           "command_override", "file_content_override", "retrieval_context_override",
           "snapshot_override"]


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def wait(port):
    for _ in range(200):
        try:
            socket.create_connection(("127.0.0.1", port), 0.2).close()
            return
        except OSError:
            time.sleep(0.05)
    raise SystemExit("port %d never opened" % port)


procs = []


def cli(*args, model=None):
    cmd = [os.path.join(BIN, "replaykit"), "--storage", "sqlite", "--data-root", DATA,
           "--sandbox-root", SANDBOXES, "--json"]
    if model:
        cmd += ["--model-mode", "command", "--model-command", FIXER]
    p = subprocess.run(cmd + list(args), capture_output=True, text=True)
    if p.returncode:
        return None, p.stderr.strip()
    return json.loads(p.stdout), None


def get(path):
    with urllib.request.urlopen("http://127.0.0.1:%d/api/v1%s" % (API, path)) as r:
        return json.loads(r.read())


def unwrap(v):
    if isinstance(v, dict) and len(v) == 1:
        (k, x), = v.items()
        if k == "Text":
            return x
        if k == "Int":
            return x
        if k == "Object":
            return {kk: unwrap(vv) for kk, vv in x.items()}
    return v


def clip(t, n=1600):
    if t is None:
        return None
    t = t.rstrip("\n")
    return t if len(t) <= n else t[: n - 1] + "…"


TYPE = {"FileBlob": "file_blob", "ToolOutput": "tool_output", "ShellStdout": "shell_stdout",
        "ShellStderr": "shell_stderr", "ModelResponse": "model_response", "FileDiff": "file_diff",
        "PatchManifest": "patch_manifest", "StateSnapshot": "state_snapshot"}
POLICY = {"record_only", "pure_reusable", "rerunnable_supported", "cacheable_if_fingerprint_matches"}


def outputs(run, span):
    res = []
    for aid in span["output_artifact_ids"]:
        c = get("/runs/%s/artifacts/%s/content" % (run, aid))
        meta = [a for a in get("/runs/%s/spans/%s/artifacts" % (run, span["span_id"])) if a["artifact_id"] == aid]
        atype = TYPE.get(meta[0]["artifact_type"], meta[0]["artifact_type"]) if meta else "unknown"
        res.append({"id": aid, "type": atype, "text": clip(c.get("content"))})
    return res


def span_ids(run):
    out = []

    def walk(nodes):
        for n in nodes:
            out.append(n["span"]["span_id"] if "span" in n else n["span_id"])
            walk(n.get("children", []))
    tree = get("/runs/%s/tree" % run)
    walk(tree.get("nodes") or tree.get("roots") or tree.get("tree") or [])
    return out


def plan_view(p):
    return {
        "dirty": [{"id": d["span_id"], "reasons": d["reasons"], "by": d["triggered_by"]} for d in p["dirty_spans"]],
        "blocked": [{"id": b["span_id"], "reason": b["reason"]} for b in p["blocked"]],
        "reused": len(p["reusable_span_ids"]),
        "rollup": p["rollup_span_ids"],
        "warnings": p["warnings"],
    }


try:
    # ---- record ------------------------------------------------------------
    subprocess.run(["python3", os.path.join(AGENT, "agent.py"), "make-repo", WS], check=True)
    cport = free_port()
    procs.append(subprocess.Popen([os.path.join(BIN, "replaykit-collector")],
                                  env=dict(os.environ, REPLAYKIT_DATA_ROOT=DATA, REPLAYKIT_PORT=str(cport)),
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    wait(cport)
    run_id = subprocess.run(["python3", os.path.join(AGENT, "agent.py"), "run", "--collector",
                             "http://127.0.0.1:%d" % cport, "--workspace", WS],
                            check=True, capture_output=True, text=True).stdout.strip()
    procs[0].terminate()
    procs[0].wait()
    procs.clear()

    # ---- fork ---------------------------------------------------------------
    hand_fix = ('import os\n\n# Seconds to wait for a pooled connection (default 2).\n'
                'DEFAULT_TIMEOUT = float(os.environ.get("AUTH_POOL_TIMEOUT", "2"))\n\n\n'
                'def init_session(pool, timeout=None):\n    if timeout is None:\n        timeout = DEFAULT_TIMEOUT\n'
                '    conn = pool.acquire(timeout=timeout)\n    return {"conn": conn}\n')
    template = ("You are fixing a bug in a Python repository.\n\nISSUE.md:\n{{read_issue}}\n"
                "auth/session.py:\n{{read_session}}\nReturn the full corrected file.")
    edited = template.replace("Return the full corrected file.",
                              "Return the full corrected file. Default the timeout to 2 seconds when none is configured.")
    presets = [
        dict(id="prompt", fork="gen_fix", patch="prompt_edit", title="edit the fix prompt",
             field="prompt of Generate fix", before="Return the full corrected file.",
             after="… Default the timeout to 2 seconds when none is configured.",
             replacement=edited, model=True,
             note="fixer.py, the same deterministic stand-in the agent called, re-ran on the edited prompt; its new fix flowed into the write through the {{gen_fix}} binding."),
        dict(id="shell", fork="test_validate", patch="env_var_override", title="set an env var on the test run",
             field="env of run tests (validate)", before="(AUTH_POOL_TIMEOUT unset)", after="AUTH_POOL_TIMEOUT=0.05",
             replacement="AUTH_POOL_TIMEOUT=0.05", model=False,
             note="Same code, one env var: the recorded fix only fails because no pool timeout is configured."),
        dict(id="file", fork="write_fix", patch="file_content_override", title="hand-write the fix",
             field="content written to auth/session.py", before='DEFAULT_TIMEOUT = float(os.environ.get("AUTH_POOL_TIMEOUT", "0")) or None',
             after='DEFAULT_TIMEOUT = float(os.environ.get("AUTH_POOL_TIMEOUT", "2"))', replacement=hand_fix, model=False,
             note="The hand-written file was written into the sandbox, and the tests and git diff re-ran against it."),
        dict(id="tool", fork="select_tests", patch="tool_output_override", title="override the test selection",
             field="output of select_tests", before="tests/test_login.py  tests/test_session.py",
             after="tests/test_session.py", replacement="tests/test_session.py\n", model=False,
             note="Green, but only because the login tests were never selected: both test commands picked up the narrowed list through {{select_tests|words}}."),
    ]
    branches = {}
    for pr in presets:
        plan, err = cli("replay", "plan", run_id, "--span", pr["fork"], "--patch-type", pr["patch"],
                        "--replacement", pr["replacement"], model=pr["model"])
        assert plan, err
        default_plan = None
        if pr["model"]:
            default_plan, err = cli("replay", "plan", run_id, "--span", pr["fork"], "--patch-type", pr["patch"],
                                    "--replacement", pr["replacement"])
            assert default_plan, err
        view, err = cli("replay", "fork", run_id, "--span", pr["fork"], "--patch-type", pr["patch"],
                        "--replacement", pr["replacement"], model=pr["model"])
        assert view, err
        branches[pr["id"]] = (view, plan, default_plan)

    # ---- read back ----------------------------------------------------------
    API = free_port()
    procs.append(subprocess.Popen([os.path.join(BIN, "replaykit"), "--storage", "sqlite", "--data-root", DATA,
                                   "serve", "--port", str(API)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    wait(API)

    run = get("/runs/%s" % run_id)
    ids = span_ids(run_id)
    src = {i: get("/runs/%s/spans/%s" % (run_id, i)) for i in ids}
    t_start = min(s["started_at"] for s in src.values())
    t_end = max(s["ended_at"] or s["started_at"] for s in src.values())
    snapshots = 0
    spans = []
    for i in ids:
        s = src[i]
        a = {k: unwrap(v) for k, v in s["attributes"].items()}
        attrs = {k: a[k] for k in ("command", "cwd", "path", "model", "provider") if k in a}
        if "input_bindings" in a:
            attrs["bind"] = "; ".join("%s ← %s" % (k, v.replace("\n", "⏎")) for k, v in a["input_bindings"].items())
        if "prompt" in a:
            attrs["prompt"] = a["prompt"].strip().splitlines()[-1]
        arts = get("/runs/%s/spans/%s/artifacts" % (run_id, i))
        snapshots += sum(1 for x in arts if x["artifact_type"] == "StateSnapshot")
        spans.append({
            "id": i, "parent": s["parent_span_id"], "seq": s["sequence_no"], "kind": s["kind"],
            "name": s["name"], "status": s["status"], "t0": s["started_at"] - t_start,
            "t1": (s["ended_at"] or s["started_at"]) - t_start, "policy": s["replay_policy"],
            "executor": s["executor_kind"], "error": clip(s["error_summary"], 300), "attrs": attrs,
            "out": outputs(run_id, s), "out_fp": (s["output_fingerprint"] or "")[:12],
        })
    edges = [{"from": e["from_span_id"], "to": e["to_span_id"], "kind": "DataDependsOn"}
             for e in get("/runs/%s/edges" % run_id) if e["kind"] == "DataDependsOn"]

    # Real plans for every span x patch type (default model mode: blocked).
    first_snapshot = None
    plans = {}
    for i in ids:
        entry = {"valid": [], "invalid": {}, "plans": {}}
        for p in PATCHES:
            repl = {"env_var_override": "REPLAY=1", "command_override": "true",
                    "model_config_edit": "temperature=0", "snapshot_override": WS}.get(p, "x")
            plan, err = cli("replay", "plan", run_id, "--span", i, "--patch-type", p, "--replacement", repl)
            if plan:
                entry["valid"].append(p)
                entry["plans"][p] = plan_view(plan)
            else:
                entry["invalid"][p] = err
        plans[i] = entry

    forks = []
    for pr in presets:
        view, plan, default_plan = branches[pr["id"]]
        b = view["target_run_id"]
        brun = get("/runs/%s" % b)
        dirty = [d["span_id"] for d in plan["dirty_spans"]]
        steps = []
        for i in ids:
            if i not in dirty or src[i]["kind"] in ("Run", "PlannerStep"):
                continue
            t = get("/runs/%s/spans/%s" % (b, i))
            a = {k: unwrap(v) for k, v in t["attributes"].items()}
            ran = {}
            if "command" in a and src[i]["kind"] in ("ShellCommand", "ToolCall"):
                ran["command"] = a["command"]
            if "env" in a and isinstance(a["env"], dict):
                ran["env"] = " ".join("%s=%s" % kv for kv in a["env"].items())
            if "prompt" in a:
                ran["prompt"] = a["prompt"].strip().splitlines()[-1]
            steps.append({"id": i, "status": t["status"], "error": clip(t["error_summary"], 300),
                          "out": outputs(b, t), "out_fp": (t["output_fingerprint"] or "")[:12],
                          "reused": a.get("replay", "").startswith("reused"), "ran": ran,
                          "patched": i == pr["fork"] and pr["patch"] in ("tool_output_override", "retrieval_context_override")})
        statuses = {i: get("/runs/%s/spans/%s" % (b, i))["status"] for i in ids}
        diff = get("/runs/%s/diff/%s" % (run_id, b))
        wsdiff, _ = cli("runs", "workspace-diff", run_id, b)
        forks.append({
            "id": pr["id"], "fork": pr["fork"], "patch": pr["patch"], "title": pr["title"],
            "field": pr["field"], "before": pr["before"], "after": pr["after"], "note": pr["note"],
            "model_mode": "command" if pr["model"] else "blocked",
            "branch": {"run_id": b, "status": brun["status"], "job": view["replay_job"]["status"],
                       "executed": unwrap(view["replay_job"]["progress"].get("executed")),
                       "reused": unwrap(view["replay_job"]["progress"].get("reused_unchanged"))},
            "plan": plan_view(plan),
            "default_plan": plan_view(default_plan) if default_plan else None,
            "steps": steps, "statuses": statuses,
            "rollup": [{"id": r, "from": src[r]["status"], "to": statuses[r]} for r in plan["rollup_span_ids"]],
            "diff": {
                "source_status": diff["source_status"], "target_status": diff["target_status"],
                "changed_spans": diff["changed_span_count"], "changed_artifacts": diff["changed_artifact_count"],
                "first_divergent": diff["first_divergent_span_id"],
                "spans": [{"span_id_source": d["span_id_source"], "name": d["name"],
                           "status_change": d.get("status_change"), "output_changed": d["output_changed"],
                           "dirty_reason": d.get("dirty_reason")} for d in diff["span_diffs"]],
            },
            "workspace": [{"path": w["path"], "change": w["change"], "before": clip(w["before"], 900),
                           "after": clip(w["after"], 900)} for w in (wsdiff or [])],
        })

    out = {
        "meta": {
            "replaykit_commit": COMMIT,
            "recorded_with": "examples/scripted-agent/agent.py -> replaykit-collector (POST /v1/runs with workspace_root, /spans, /artifacts, /edges)",
            "forked_with": "replaykit replay plan / replay fork (sqlite store, CompositeExecutorRegistry, hermetic sandbox; prompt fork: --model-mode command --model-command 'python3 fixer.py')",
            "read_with": "replaykit serve (GET /api/v1/...) and replaykit runs workspace-diff",
            "paths": "relative to the throwaway workspace repo",
        },
        "run": {"run_id": run_id, "title": run["title"], "status": run["status"],
                "duration_ms": t_end - t_start, "adapter": run["adapter_name"], "snapshots": snapshots},
        "spans": spans, "edges": edges, "plans": plans, "forks": forks,
    }
    with open(OUT, "w") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print("wrote", OUT, os.path.getsize(OUT), "bytes;", "forks:",
          [(f["id"], f["branch"]["status"], f["branch"]["executed"], f["branch"]["reused"]) for f in forks])
finally:
    for p in procs:
        p.terminate()
        p.wait()
