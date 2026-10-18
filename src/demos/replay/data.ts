// Shape of public/data/replay/replaykit-demo.json. Everything in it was produced by ReplayKit itself
// (github.com/jadenfix/ReplayKit, examples/scripted-agent), offline:
//   - the run: the scripted agent fixed a throwaway git repo while posting each step to
//     replaykit-collector, which snapshotted the workspace at every span boundary; data edges are
//     the artifacts each step actually read, and input bindings say which inputs came from them
//   - plans: `replaykit replay plan` for every span and patch type, in the default model mode
//     (llm calls blocked), with ReplayKit's blocked reasons
//   - forks: `replaykit replay fork` for the four presets, executed by CompositeExecutorRegistry in
//     sandboxes restored from the recorded snapshots (the prompt fork plugs the agent's own
//     deterministic fixer.py in as the model provider with --model-mode command)
//   - outputs, span statuses, diffs and workspace diffs: read back through `replaykit serve` and
//     `replaykit runs workspace-diff`
// Paths are relative to the throwaway repo.

export type SpanKind = 'Run' | 'PlannerStep' | 'LlmCall' | 'ToolCall' | 'ShellCommand' | 'FileRead' | 'FileWrite';
export type SpanStatus = 'Completed' | 'Failed' | 'Blocked' | 'Running';
export type PatchType =
  | 'prompt_edit'
  | 'model_config_edit'
  | 'tool_output_override'
  | 'env_var_override'
  | 'command_override'
  | 'file_content_override'
  | 'retrieval_context_override'
  | 'snapshot_override';
export type DirtyReason = 'patched_input' | 'upstream_output_changed' | 'dependency_unknown';

export interface Output {
  id: string;
  type: string; // artifact_type_label, e.g. shell_stdout
  text: string | null; // artifact content, clipped
}

export interface Span {
  id: string;
  parent: string | null;
  seq: number;
  kind: SpanKind;
  name: string;
  status: SpanStatus;
  t0: number; // ms from run start
  t1: number;
  policy: string;
  executor: string | null;
  error: string | null;
  attrs: Partial<Record<'command' | 'cwd' | 'path' | 'model' | 'provider' | 'bind' | 'prompt', string>>; // prompt: its last line
  out: Output[];
  out_fp: string; // first 12 hex of output_fingerprint
}

export interface Edge {
  from: string; // DataDependsOn: `from` read `to`'s output
  to: string;
  kind: 'DataDependsOn';
}

export interface Plan {
  dirty: { id: string; reasons: DirtyReason[]; by: string[] }[];
  blocked: { id: string; reason: string }[]; // reasons come from the executors that would run the fork
  reused: number;
  rollup: string[]; // containers whose status is re-derived from replayed children
  warnings: string[];
}

export interface Fork {
  id: string;
  fork: string;
  patch: PatchType;
  title: string;
  field: string;
  before: string;
  after: string;
  note: string; // what this fork shows, in a sentence (ours, not ReplayKit's)
  model_mode: 'blocked' | 'command';
  branch: { run_id: string; status: SpanStatus; job: string; executed: number; reused: number };
  plan: Plan; // the plan for this exact fork and model mode
  default_plan: Plan | null; // the same patch in the default model mode (prompt fork only)
  steps: {
    id: string;
    status: SpanStatus;
    error: string | null;
    out: Output[];
    out_fp: string;
    reused: boolean; // dirty, but its upstream replayed to the recorded output, so not re-run
    patched: boolean; // the patch itself became the output
    ran: Partial<Record<'command' | 'env' | 'prompt', string>>; // effective inputs it ran with
  }[];
  statuses: Record<string, SpanStatus>;
  rollup: { id: string; from: SpanStatus; to: SpanStatus }[];
  workspace: { path: string; change: 'added' | 'modified' | 'removed'; before: string | null; after: string | null }[];
  diff: {
    source_status: SpanStatus;
    target_status: SpanStatus;
    changed_spans: number;
    changed_artifacts: number;
    first_divergent: string | null;
    spans: { span_id_source: string; name: string; status_change: string | null; output_changed: boolean; dirty_reason: string }[];
  };
}

export interface ReplayData {
  meta: { replaykit_commit: string };
  run: { run_id: string; title: string; status: SpanStatus; duration_ms: number; adapter: string; snapshots: number };
  spans: Span[];
  edges: Edge[];
  plans: Record<string, { valid: PatchType[]; invalid: Partial<Record<PatchType, string>>; plans: Partial<Record<PatchType, Plan>> }>;
  forks: Fork[];
}

let cache: Promise<ReplayData> | null = null;

export function loadReplayData(): Promise<ReplayData> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/replay/replaykit-demo.json`).then((r) => {
    if (!r.ok) throw new Error(`replaykit-demo.json ${r.status}`);
    return r.json() as Promise<ReplayData>;
  });
  return cache;
}

/** the patch a visitor most likely means for a span of this kind (always one the engine accepts) */
export function defaultPatch(kind: SpanKind): PatchType {
  switch (kind) {
    case 'LlmCall':
      return 'prompt_edit';
    case 'ToolCall':
      return 'tool_output_override';
    case 'ShellCommand':
      return 'command_override';
    case 'FileRead':
    case 'FileWrite':
      return 'file_content_override';
    default:
      return 'env_var_override';
  }
}
