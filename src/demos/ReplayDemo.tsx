import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useOnScreen, useReducedMotion } from './orbit/hooks';
import { defaultPatch, loadReplayData, type Fork, type ReplayData, type Span } from './replay/data';
import { KIND_SHORT, ROW_H, STATUS_COLOR } from './replay/labels';
import { Tree, type RowState } from './replay/Tree';

type Phase = 'idle' | 'plan' | 'replay' | 'diff';
type Step = Fork['steps'][number];

const BTN = 'whitespace-nowrap py-1 text-left transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';
const ROWS_FALLBACK = 15;
const STEP_MS = 760;
const fmtDur = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** `tests/test_login.py::test_login_timeout ... FAILED` -> `test_login_timeout  FAILED`, to fit half a panel */
function shortLine(l: string) {
  const m = /^tests\/\w+\.py::(\S+) \.\.\. (\S+)$/.exec(l);
  if (m) return `${m[1]}  ${m[2]}`;
  const r = /^result: \w+\. (\d+) passed; (\d+) failed$/.exec(l);
  return r ? `result: ${r[1]} passed, ${r[2]} failed` : l;
}

const lastLine = (t: string | null | undefined) => (t ?? '').trim().split('\n').pop() ?? '';

type DiffRow = { kind: 'same'; text: string } | { kind: 'fold'; n: number } | { kind: 'change'; a: string | null; b: string | null };

function diffRows(a: string[], b: string[]): DiffRow[] {
  const raw: DiffRow[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? null;
    const y = b[i] ?? null;
    if (x === y) raw.push({ kind: 'same', text: x ?? '' });
    else raw.push({ kind: 'change', a: x, b: y });
  }
  // fold runs of three or more unchanged lines
  const out: DiffRow[] = [];
  for (let i = 0; i < raw.length; ) {
    let j = i;
    while (j < raw.length && raw[j].kind === 'same') j++;
    if (j - i >= 3) {
      out.push({ kind: 'fold', n: j - i });
      i = j;
    } else if (j > i) {
      out.push(...raw.slice(i, j));
      i = j;
    } else out.push(raw[i++]);
  }
  return out;
}

function Label({ children }: { children: ReactNode }) {
  return <div className="truncate text-[10px] lowercase tracking-[0.14em] text-dim">{children}</div>;
}

/** what ReplayKit did with one dirty span, in a line */
function stepNote(step: Step, src: Span): string {
  if (step.status === 'Blocked') return (step.error ?? 'blocked').replace(/^replay blocked: /, '');
  if (step.out.some((o) => o.type === 'patch_manifest')) return 'patch accepted as the span output';
  const same = step.out_fp === src.out_fp;
  const stdout = step.out.find((o) => o.type === 'shell_stdout') ?? step.out[0];
  return `re-ran: ${lastLine(stdout?.text)}${same ? ' · identical to recording' : ' · output changed'}`;
}

export default function ReplayDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { visible, seen } = useOnScreen(wrapRef);
  const reduce = useReducedMotion();
  const [data, setData] = useState<ReplayData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadReplayData().then(
      (d) => live && setData(d),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <div ref={wrapRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1s ease' }}>
      {data ? (
        <Demo data={data} visible={visible} reduce={reduce} />
      ) : (
        <div className="flex items-center justify-center border border-line bg-void text-[11px] text-faint" style={{ height: 32 + ROWS_FALLBACK * ROW_H }}>
          {failed ? 'could not load the recorded run' : 'loading the recorded run'}
        </div>
      )}
      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-[1.8] text-faint">
        A real run, recorded and replayed by ReplayKit{data ? ` (commit ${data.meta.replaykit_commit})` : ''}. A small scripted agent fixed a throwaway git repo
        while ReplayKit&apos;s collector recorded each step, and every arc is an artifact a step actually read. The four forks were planned and executed offline
        by ReplayKit&apos;s CLI: shell and file steps re-ran for real, and the plans, outputs, blocked reasons and diffs are ReplayKit&apos;s own, replayed here in
        the browser. The llm step is a deterministic local stand-in, so no model was called.
      </p>
    </div>
  );
}

function Demo({ data, visible, reduce }: { data: ReplayData; visible: boolean; reduce: boolean }) {
  const { run, spans, edges, forks, plans } = data;
  const byId = useMemo(() => new Map(spans.map((s) => [s.id, s])), [spans]);
  const panelH = 32 + spans.length * ROW_H;

  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [tour, setTour] = useState<boolean | null>(null);
  const [tourIdx, setTourIdx] = useState(0);
  const touring = (tour ?? !reduce) && visible;

  const span = selected ? byId.get(selected)! : null;
  const fork = forks.find((f) => f.fork === selected) ?? null;
  const patch = fork?.patch ?? (span ? defaultPatch(span.kind) : 'env_var_override');
  const plan = selected ? plans[selected].plans[patch] ?? null : null;
  const steps: Step[] = fork?.steps ?? [];

  // one timer drives the replay, and (until the visitor takes over) a slow tour through the forks
  useEffect(() => {
    if (!visible) return;
    let ms: number;
    let fn: () => void;
    if (phase === 'replay') {
      if (progress < steps.length) {
        ms = reduce ? 0 : STEP_MS;
        fn = () => setProgress((p) => p + 1);
      } else {
        ms = reduce ? 0 : 700;
        fn = () => setPhase('diff');
      }
    } else if (touring) {
      if (phase === 'idle') {
        ms = 1600;
        fn = () => {
          setSelected(forks[tourIdx].fork);
          setPhase('plan');
        };
      } else if (phase === 'plan') {
        ms = 3000;
        fn = () => {
          setProgress(0);
          setPhase('replay');
        };
      } else {
        ms = 7000;
        fn = () => {
          setSelected(null);
          setPhase('idle');
          setTourIdx((i) => (i + 1) % forks.length);
        };
      }
    } else return;
    const id = window.setTimeout(fn, ms);
    return () => window.clearTimeout(id);
  }, [visible, phase, progress, steps.length, touring, tourIdx, reduce, forks]);

  const takeOver = () => setTour(false);
  const select = (id: string) => {
    takeOver();
    setSelected(id);
    setPhase('plan');
    setProgress(0);
  };
  const startFork = () => {
    takeOver();
    setProgress(0);
    setPhase('replay');
  };
  const reset = () => {
    takeOver();
    setSelected(null);
    setPhase('idle');
    setProgress(0);
  };

  // ReplayKit's own diff says which spans changed
  const changedIds = new Set(fork?.diff.spans.map((d) => d.span_id_source) ?? []);

  const rows: Record<string, RowState> = {};
  const dirtyMap = new Map((plan?.dirty ?? []).map((d) => [d.id, d]));
  const stepIdx = new Map(steps.map((s, i) => [s.id, i]));
  for (const s of spans) {
    const d = dirtyMap.get(s.id);
    if (phase === 'idle' || !plan) rows[s.id] = { kind: 'recorded', status: s.status };
    else if (!d) rows[s.id] = { kind: 'cached', status: fork && phase === 'diff' ? fork.statuses[s.id] : s.status };
    else if (phase === 'plan' || !fork) rows[s.id] = { kind: 'dirty', status: s.status, reasons: d.reasons, blocked: plan.blocked.includes(s.id) };
    else {
      const i = stepIdx.get(s.id) ?? 0;
      if (phase === 'diff' || i < progress) rows[s.id] = { kind: 'replayed', status: fork.statuses[s.id], changed: changedIds.has(s.id) };
      else if (i === progress) rows[s.id] = { kind: 'running' };
      else rows[s.id] = { kind: 'queued', status: s.status };
    }
  }
  const hot = new Set<string>();
  if (plan && phase !== 'idle') for (const d of plan.dirty) for (const t of d.by) hot.add(`${d.id}>${t}`);

  let panel: ReactNode;
  if (phase === 'idle' || !span || !plan) {
    panel = (
      <div className="flex h-full flex-col">
        <Label>recorded run · {run.run_id}</Label>
        <h4 className="display mt-2 text-[26px] leading-tight">{run.title}</h4>
        <p className="mt-1 text-[11px] text-faint">
          <span style={{ color: STATUS_COLOR[run.status] }}>{run.status.toLowerCase()}</span> · {fmtDur(run.duration_ms)} · {spans.length} spans · {run.adapter}
        </p>
        <p className="mt-4 text-[12px] leading-[1.75] text-dim">
          A scripted agent reproduced a hanging-login bug, patched session.py and re-ran the tests: one still fails. Pick a step and fork it. ReplayKit follows
          the recorded data edges out of the patched span, re-runs that dirty set and reuses everything else.
        </p>
        <div className="mt-auto">
          <Label>real forks</Label>
          <div className="mt-2 grid gap-1 text-[12px]">
            {forks.map((f) => (
              <button key={f.id} type="button" onClick={() => select(f.fork)} className={`${BTN} truncate text-dim hover:text-phos`}>
                [ fork step {byId.get(f.fork)!.seq} ] <span className="text-faint">{f.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (phase === 'plan') {
    const valid = plans[span.id].valid;
    const rec = span.out[0]?.text;
    panel = (
      <div className="flex h-full flex-col">
        <Label>
          step {span.seq} · {KIND_SHORT[span.kind]} · {span.policy}
        </Label>
        <h4 className="display mt-2 truncate text-[26px] leading-tight">{span.name}</h4>
        <p className="mt-1 truncate text-[11px] text-faint">
          {span.executor ?? 'no executor'} · recorded <span style={{ color: STATUS_COLOR[span.status] }}>{span.status.toLowerCase()}</span>
        </p>
        {fork ? (
          <div className="mt-4 border border-line">
            <div className="flex justify-between gap-3 border-b border-line px-3 py-1.5 text-[10px] text-faint">
              <span className="whitespace-nowrap">patch_manifest · {fork.patch}</span>
              <span className="hidden truncate sm:inline">{fork.field}</span>
            </div>
            <div className="space-y-1 px-3 py-2 text-[11px] leading-[1.6]">
              <div className="line-clamp-2 text-faint">
                <span className="text-[#ec5c52]/80">- </span>
                {fork.before}
              </div>
              <div className="line-clamp-2 text-bone">
                <span className="text-phos">+ </span>
                {fork.after}
              </div>
            </div>
          </div>
        ) : (
          <>
            {rec ? (
              <div className="mt-4 border border-line px-3 py-2 text-[10.5px] leading-[1.6] text-faint">
                <div className="mb-1 text-[10px] text-dim">recorded {span.out[0].type}</div>
                <pre className="line-clamp-3 whitespace-pre-wrap break-all font-mono">{rec}</pre>
              </div>
            ) : null}
            <p className="mt-3 text-[11px] leading-[1.7] text-dim">
              Valid here: {valid.join(', ')}. Rows lit up are ReplayKit&apos;s real plan for a fork with {patch}; the four real forks are under [ back ].
            </p>
          </>
        )}
        <dl className="mt-4 grid grid-cols-3 border-y border-line text-[11px]">
          {(
            [
              ['dirty', plan.dirty.length, 'text-phos'],
              ['reused', plan.reused, 'text-bone'],
              ['blocked', plan.blocked.length, plan.blocked.length ? 'text-ice' : 'text-bone'],
            ] as const
          ).map(([k, v, c], i) => (
            <div key={k} className={`py-2 ${i ? 'border-l border-line pl-3' : ''}`}>
              <dt className="text-[10px] lowercase tracking-[0.14em] text-dim">{k}</dt>
              <dd className={`font-serif text-[22px] leading-none ${c}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 line-clamp-3 text-[10.5px] leading-[1.7] text-faint">
          {plan.dirty.map((d, i) => (
            <span key={d.id}>
              {i ? ' · ' : ''}
              {byId.get(d.id)!.name} <span className="text-dim">{d.reasons[0]}</span>
            </span>
          ))}
        </p>
        {span.kind === 'LlmCall' && (
          <p className="mt-2 text-[10.5px] leading-[1.6] text-faint">plan_fork counts llm calls as executable; the model executor decides at run time.</p>
        )}
        <div className="mt-auto flex gap-4 pt-2 text-[12px]">
          {fork && (
            <button type="button" onClick={startFork} className={`${BTN} text-phos hover:text-bone`}>
              [ fork step {span.seq} ]
            </button>
          )}
          <button type="button" onClick={reset} className={`${BTN} text-dim hover:text-bone`}>
            [ back ]
          </button>
        </div>
      </div>
    );
  } else if (phase === 'replay' && fork) {
    panel = (
      <div className="flex h-full flex-col">
        <Label>
          branch {fork.branch.run_id} · forked at step {span.seq}
        </Label>
        <h4 className="display mt-2 text-[26px] leading-tight">
          Replaying {Math.min(progress + 1, steps.length)} of {steps.length}
        </h4>
        <p className="mt-1 text-[11px] text-faint">{plan.reused} spans reused from the recording, not re-run</p>
        <ol className="mt-4 space-y-1.5 text-[11px]">
          {steps.map((s, i) => {
            const sp = byId.get(s.id)!;
            const done = i < progress;
            const now = i === progress;
            return (
              <li key={s.id} className={`grid grid-cols-[76px_1fr] gap-2 transition-opacity duration-300 ${done || now ? 'opacity-100' : 'opacity-35'}`}>
                <span className={now ? 'animate-breathe text-phos' : ''} style={done ? { color: STATUS_COLOR[s.status] } : undefined}>
                  {done ? s.status.toLowerCase() : now ? 'running' : 'queued'}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-bone/90">{sp.name}</span>
                  <span className="block truncate text-[10px] text-faint">{done ? stepNote(s, sp) : ' '}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  } else if (fork) {
    const d = fork.diff;
    // the clearest real evidence: a re-run whose output changed, else the patched output itself
    const rerun = steps.find((s) => s.status !== 'Blocked' && !s.out.some((o) => o.type === 'patch_manifest') && s.out_fp !== byId.get(s.id)!.out_fp);
    const same = steps.filter((s) => s.status !== 'Blocked' && !s.out.some((o) => o.type === 'patch_manifest') && s.out_fp === byId.get(s.id)!.out_fp);
    const patched = steps.find((s) => s.out.some((o) => o.type === 'patch_manifest'));
    let compare: { label: string; a: string[]; b: string[] } | null = null;
    if (rerun) {
      const src = byId.get(rerun.id)!;
      const t = (xs: typeof src.out) => (xs.find((o) => o.type === 'shell_stdout') ?? xs[0])?.text ?? '';
      compare = { label: `${src.name} · stdout`, a: t(src.out).split('\n').map(shortLine), b: t(rerun.out).split('\n').map(shortLine) };
    } else if (patched) {
      const src = byId.get(patched.id)!;
      compare = { label: `${src.name} · output`, a: (src.out[0]?.text ?? '').split('\n'), b: (patched.out[0]?.text ?? '').split('\n') };
    }
    const rowsDiff = compare ? diffRows(compare.a, compare.b) : null;
    const blockedSteps = steps.filter((s) => s.status === 'Blocked');
    panel = (
      <div className="flex h-full flex-col">
        <Label>
          replaykit diff · source → branch {fork.branch.run_id}
        </Label>
        <h4 className="display mt-2 text-[26px] leading-tight">
          <span style={{ color: STATUS_COLOR[d.source_status] }}>{d.source_status.toLowerCase()}</span>
          <span className="text-faint"> → </span>
          <span style={{ color: STATUS_COLOR[d.target_status] }}>{d.target_status.toLowerCase()}</span>
        </h4>
        <p className="mt-1 truncate text-[11px] text-faint">
          {d.changed_spans} {d.changed_spans === 1 ? 'span' : 'spans'} · {d.changed_artifacts} {d.changed_artifacts === 1 ? 'artifact' : 'artifacts'} changed · first divergent: {d.first_divergent ? byId.get(d.first_divergent)?.name : 'none'}
        </p>
        {rowsDiff && compare ? (
          <>
            <div className="mt-4 overflow-hidden border border-line text-[10.5px] leading-[1.65]">
              <div className="grid grid-cols-2 border-b border-line text-[10px] text-faint">
                <span className="truncate px-2 py-1">recorded · {compare.label}</span>
                <span className="truncate border-l border-line px-2 py-1">{rerun ? 're-run' : 'patched'}</span>
              </div>
              {rowsDiff.map((r, i) =>
                r.kind === 'fold' ? (
                  <div key={i} className="px-2 text-faint">
                    ⋯ {r.n} unchanged
                  </div>
                ) : r.kind === 'same' ? (
                  <div key={i} className="grid grid-cols-2 text-faint">
                    <span className="truncate px-2">{r.text || ' '}</span>
                    <span className="truncate border-l border-line px-2">{r.text || ' '}</span>
                  </div>
                ) : (
                  <div key={i} className="grid grid-cols-2">
                    <span className="truncate bg-[#ec5c52]/[0.07] px-2 text-[#ec5c52]/90">{r.a ?? ' '}</span>
                    <span className="truncate border-l border-line bg-[#8fb59a]/[0.08] px-2 text-[#8fb59a]">{r.b ?? ' '}</span>
                  </div>
                ),
              )}
            </div>
            <ul className="mt-3 space-y-1 text-[10.5px] leading-[1.6] text-faint">
              {rerun && (
                <li>
                  Shell steps re-run their recorded command in the repo as the original run left it, so the fix it wrote is already on disk.
                </li>
              )}
              {same.map((s) => (
                <li key={s.id} className="truncate">
                  <span className="text-dim">{byId.get(s.id)!.name}</span> (step {byId.get(s.id)!.seq}) re-ran: identical fingerprint, not a change
                </li>
              ))}
              {!rerun && !same.length && <li>Nothing read this output, so nothing else re-ran.</li>}
            </ul>
          </>
        ) : (
          <div className="mt-4 min-h-0 text-[11px] leading-[1.7] text-dim">
            <p>Blocked replay is a real outcome. ReplayKit stops and says why:</p>
            <ul className="mt-2 space-y-0.5 text-[10.5px] text-faint">
              {blockedSteps.slice(0, 6).map((s) => (
                <li key={s.id} className="line-clamp-2">
                  <span className="text-ice">{byId.get(s.id)!.name}</span> {stepNote(s, byId.get(s.id)!)}
                </li>
              ))}
              {blockedSteps.length > 6 && <li>and {blockedSteps.length - 6} more downstream</li>}
            </ul>
          </div>
        )}
        <div className="mt-auto flex gap-4 pt-2 text-[12px]">
          <button type="button" onClick={reset} className={`${BTN} text-dim hover:text-bone`}>
            [ reset ]
          </button>
          <button type="button" onClick={() => select(span.id)} className={`${BTN} text-dim hover:text-bone`}>
            [ back to plan ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] border border-line bg-void md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="border-b border-line md:border-b-0 md:border-r" style={{ height: panelH }}>
          <div className="flex h-8 items-center justify-between border-b border-line px-3 text-[10px] lowercase tracking-[0.14em] text-faint">
            <span className="truncate">span tree · {run.run_id}</span>
            <span className="hidden whitespace-nowrap sm:inline">
              <span className="text-phos">⌒</span> data_depends_on
            </span>
          </div>
          <Tree spans={spans} edges={edges} duration={run.duration_ms} rows={rows} selected={selected} hot={hot} onSelect={select} />
        </div>
        <div className="h-[372px] overflow-y-auto p-4 md:h-auto md:overflow-hidden" aria-live="polite">
          {panel}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px]">
        <button type="button" aria-pressed={!touring} onClick={() => setTour(!(tour ?? !reduce))} className={`${BTN} text-dim hover:text-bone`}>
          [ {(tour ?? !reduce) ? 'pause tour' : 'resume tour'} ]
        </button>
        <span className="text-[10px] text-faint">arcs: data edges recorded from what each step read</span>
      </div>
    </>
  );
}

