import type { DirtyReason, SpanKind, SpanStatus } from './data';

export const ROW_H = 24;

/** span_kind_short from crates/cli */
export const KIND_SHORT: Record<SpanKind, string> = {
  Run: 'run',
  PlannerStep: 'plan',
  LlmCall: 'llm',
  ToolCall: 'tool',
  ShellCommand: 'shell',
  FileRead: 'fread',
  FileWrite: 'fwrite',
};

export const STATUS_COLOR: Record<SpanStatus, string> = {
  Completed: '#8fb59a',
  Failed: '#ec5c52',
  Blocked: '#c4ccde',
  Running: '#e8a96a',
};

export const REASON_SHORT: Record<DirtyReason, string> = {
  patched_input: 'patched',
  upstream_output_changed: 'upstream',
  dependency_unknown: 'dep unknown',
};
