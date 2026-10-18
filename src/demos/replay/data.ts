// Shape of public/data/replay/replaykit-demo.json. Everything in it was produced by ReplayKit itself
// (github.com/jadenfix/ReplayKit), offline:
//   - the run: a small scripted agent fixed a throwaway git repo while posting each step to
//     replaykit-collector; data edges are the artifacts each step actually read
//   - plans: `replaykit replay plan` for every span and patch type (validate_patch_target + plan_fork)
//   - forks: `replaykit replay fork` for the four presets, executed by CompositeExecutorRegistry
//     (shell and file spans re-run for real; LLM calls block without a model executor)
//   - outputs, span statuses and diffs: read back through `replaykit serve`
// Paths are relative to the throwaway repo.

export type SpanKind = 'Run' | 'PlannerStep' | 'LlmCall' | 'ToolCall' | 'ShellCommand' | 'FileRead' | 'FileWrite';
export type SpanStatus = 'Completed' | 'Failed' | 'Blocked' | 'Running';
export type PatchType = 'prompt_edit' | 'model_config_edit' | 'tool_output_override' | 'env_var_override' | 'retrieval_context_override' | 'snapshot_override';
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
  attrs: Partial<Record<'command' | 'cwd' | 'path' | 'model' | 'provider' | 'argv', string>>;
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
  blocked: string[];
  reused: number;
}

export interface Fork {
  id: string;
  fork: string;
  patch: PatchType;
  title: string;
  field: string;
  before: string;
  after: string;
  branch: { run_id: string; status: SpanStatus; job: string };
  steps: { id: string; status: SpanStatus; error: string | null; out: Output[]; out_fp: string }[];
  statuses: Record<string, SpanStatus>;
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
  run: { run_id: string; title: string; status: SpanStatus; duration_ms: number; adapter: string };
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
  return kind === 'LlmCall' ? 'prompt_edit' : kind === 'ToolCall' ? 'tool_output_override' : 'env_var_override';
}
