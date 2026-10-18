import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CELL_STYLE, TASK_SHORT, VIEWS, VIEW_NAMES, cellState, humanCheck, type BenchData, type Run, type ViewKey } from './bench/data';
import { useOnScreen, useReducedMotion } from './bench/hooks';
import { Count, Swatch, WilsonBar } from './bench/parts';

// the cohort's shape: 7 harness configs x 4 tasks x 3 seeds (drawn before the data arrives, so nothing jumps)
const ROWS = 7;
const TASKS = 4;
const SEEDS = 3;
const COLS = TASKS * SEEDS;
const HARNESS_FALLBACK = ['mini', 'mini-verify', 'rusty-baseline', 'rusty-verify', 'rusty-careful', 'rusty-combined', 'rusty-shell'];
const TASK_FALLBACK = ['ship-checkout-v2', 'stop-double-charges', 'merge-duplicate-contacts', 'stop-report-connection-leak'];

const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[7.25rem_minmax(0,26rem)_7.5rem] sm:gap-x-5';

function cleanReason(r: string) {
  return humanCheck(r).replace(/\s+/g, ' ');
}

export default function BenchMatrix() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { visible, seen } = useOnScreen(rootRef);
  const reduce = useReducedMotion();
  const [data, setData] = useState<BenchData | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<ViewKey>('final');
  const [auto, setAuto] = useState(true);
  const [hot, setHot] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}data/fsbench.json`)
      .then((r) => (r.ok ? (r.json() as Promise<BenchData>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // once on screen, step final state -> whole episode -> safe success, slowly; stop the moment the visitor takes over
  useEffect(() => {
    if (!auto || !visible || !seen || !data || reduce || view === 'safe') return;
    const id = window.setTimeout(() => setView((v) => (v === 'final' ? 'episode' : 'safe')), view === 'final' ? 3600 : 3800);
    return () => window.clearTimeout(id);
  }, [auto, visible, seen, data, reduce, view]);

  const grid = useMemo(() => {
    const g: (Run | undefined)[] = new Array(ROWS * COLS);
    data?.runs.forEach((run) => {
      g[run.h * COLS + run.t * SEEDS + run.s] = run;
    });
    return g;
  }, [data]);

  const stats = useMemo(() => {
    const eligible = grid.filter((r) => r && r.st !== 'invalid').length;
    const out: Record<ViewKey, { pass: number; looked: number }> = { final: { pass: 0, looked: 0 }, episode: { pass: 0, looked: 0 }, safe: { pass: 0, looked: 0 } };
    for (const k of ['final', 'episode', 'safe'] as ViewKey[]) {
      for (const r of grid) {
        const s = cellState(r, k);
        if (s === 'pass') out[k].pass += 1;
        if (s === 'looked') out[k].looked += 1;
      }
    }
    return { eligible, invalid: grid.filter((r) => r?.st === 'invalid').length, ...out };
  }, [grid]);

  const harnesses = data?.harnesses.map((h) => h.id) ?? HARNESS_FALLBACK;
  const tasks = data?.tasks ?? TASK_FALLBACK;
  const vdef = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const selected = hot ?? pinned;
  const run = selected == null ? undefined : grid[selected];

  const choose = (k: ViewKey) => {
    setAuto(false);
    setView(k);
  };

  const onCellKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const r = Math.floor(idx / COLS);
    const c = idx % COLS;
    let next = idx;
    if (e.key === 'ArrowRight') next = r * COLS + Math.min(COLS - 1, c + 1);
    else if (e.key === 'ArrowLeft') next = r * COLS + Math.max(0, c - 1);
    else if (e.key === 'ArrowDown') next = Math.min(ROWS - 1, r + 1) * COLS + c;
    else if (e.key === 'ArrowUp') next = Math.max(0, r - 1) * COLS + c;
    else if (e.key === 'Home') next = r * COLS;
    else if (e.key === 'End') next = r * COLS + COLS - 1;
    else if (e.key === 'Escape') {
      setPinned(null);
      return;
    } else return;
    e.preventDefault();
    setFocusIdx(next);
    setPinned(next);
    cellRefs.current[next]?.focus();
  };

  const headline = (k: ViewKey) =>
    k === 'final' ? (
      <>graded runs pass the usual final-state check.</>
    ) : k === 'episode' ? (
      <>
        pass the whole-episode check. <span className="text-[#ec5c52]">{data ? stats.episode.looked : '..'}</span> runs that passed the final state
        caused an incident on the way.
      </>
    ) : (
      <>
        are a SafeSuccess. <span className="text-[#ec5c52]">{data ? stats.safe.looked : '..'}</span> runs that passed the final-state check are not.
      </>
    );

  return (
    <div ref={rootRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: 'opacity 900ms ease' }}>
      {/* view switcher */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10.5px] sm:gap-x-4 sm:text-[12px]" role="group" aria-label="grading view">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            aria-pressed={v.key === view}
            onClick={() => choose(v.key)}
            className={`whitespace-nowrap py-1 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos ${
              v.key === view ? 'text-phos' : 'text-dim hover:text-bone'
            }`}
          >
            [ {v.label} ]
          </button>
        ))}
      </div>

      {/* headline count; all three sentences share one grid cell so the block is always as tall as the longest */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex shrink-0 items-baseline gap-2" aria-hidden>
          <span className="display w-[2ch] text-right text-[52px] leading-none tabular-nums text-bone sm:text-[60px]">
            {data ? <Count value={stats[view].pass} reduce={reduce} /> : <span className="text-faint">..</span>}
          </span>
          <span className="display text-[24px] leading-none text-faint">/ {data ? stats.eligible : 83}</span>
        </div>
        <div className="grid pt-1 text-[12.5px] leading-[1.8] text-dim" aria-live="polite">
          {VIEWS.map((v) => (
            <p key={v.key} className={`col-start-1 row-start-1 ${v.key === view ? '' : 'invisible'}`} aria-hidden={v.key !== view}>
              <span className="sr-only">
                {data ? stats[v.key].pass : ''} of {data ? stats.eligible : ''}{' '}
              </span>
              {failed ? 'the run data did not load.' : headline(v.key)}
              <span className="mt-1 block text-[11px] text-faint">{v.def}</span>
            </p>
          ))}
        </div>
      </div>

      {/* matrix */}
      <div className="mt-8" onMouseLeave={() => setHot(null)}>
        <div className={`${ROW_GRID} pb-2`} aria-hidden>
          <div className="hidden sm:block" />
          <div className="col-span-2 grid grid-cols-4 gap-2 sm:col-span-1 sm:gap-3">
            {tasks.map((t) => (
              <div key={t} className="min-w-0">
                <div className="h-[2.6em] text-[10px] leading-[1.3] text-dim sm:h-auto sm:truncate sm:text-[11px]">
                  <span className="hidden sm:inline">{TASK_SHORT[t]?.[0] ?? t}</span>
                  <span className="sm:hidden">{TASK_SHORT[t]?.[1] ?? t}</span>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-[3px] text-center text-[9px] text-faint">
                  {[0, 1, 2].map((s) => (
                    <span key={s}>s{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden self-end text-[10px] leading-[1.3] text-faint sm:block">pass · 95% wilson</div>
        </div>

        <div role="group" aria-label="every graded run: rows are harness configs, columns are task and seed" className="space-y-2.5 sm:space-y-2">
          {harnesses.map((h, r) => {
            const tally = data?.tally[h]?.[vdef.tally];
            return (
              <div key={h} className={ROW_GRID}>
                <div className="order-1 min-w-0 truncate text-[11.5px] text-bone/90" title={data?.harnesses[r]?.note}>
                  {h}
                </div>
                <div className="order-3 col-span-2 grid grid-cols-4 gap-2 sm:order-2 sm:col-span-1 sm:gap-3">
                  {Array.from({ length: TASKS }, (_, t) => (
                    <div key={t} className="grid grid-cols-3 gap-[3px]">
                      {Array.from({ length: SEEDS }, (_, s) => {
                        const c = t * SEEDS + s;
                        const idx = r * COLS + c;
                        const cell = grid[idx];
                        const st = data ? cellState(cell, view) : 'empty';
                        const isSel = selected === idx;
                        const delay = reduce ? 0 : (r + c) * 32;
                        const label = cell
                          ? `${h}, ${cell ? tasks[cell.t] : ''}, seed ${s}: ${
                              cell.st === 'invalid'
                                ? 'invalid evidence, excluded'
                                : `${vdef.label} ${st === 'pass' ? 'pass' : 'fail'}${st === 'looked' ? ' although the final state passed' : ''}`
                            }`
                          : `${h}, seed ${s}`;
                        return (
                          <button
                            key={s}
                            ref={(el) => {
                              cellRefs.current[idx] = el;
                            }}
                            type="button"
                            tabIndex={idx === focusIdx ? 0 : -1}
                            aria-label={label}
                            aria-pressed={pinned === idx}
                            disabled={!data}
                            onMouseEnter={() => setHot(idx)}
                            onFocus={() => {
                              setFocusIdx(idx);
                              setPinned(idx);
                            }}
                            onClick={() => {
                              setFocusIdx(idx);
                              setPinned(idx);
                            }}
                            onKeyDown={(e) => onCellKey(e, idx)}
                            className="aspect-square w-full border outline-none"
                            style={{
                              ...CELL_STYLE[st],
                              opacity: seen ? 1 : 0,
                              outline: isSel ? '1px solid #dcd6c8' : undefined,
                              outlineOffset: 2,
                              transitionProperty: 'background-color, border-color, box-shadow, opacity',
                              transitionDuration: '650ms, 650ms, 650ms, 500ms',
                              transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
                              transitionDelay: `${delay}ms`,
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div
                  className="order-2 flex items-center justify-end gap-3 text-[11px] tabular-nums text-dim sm:order-3 sm:justify-start"
                  aria-label={tally ? `${tally[0]} of ${tally[1]} pass, 95% Wilson interval ${tally[2]} to ${tally[3]}` : undefined}
                >
                  <span className="w-[3.2em] text-right">{tally ? `${tally[0]}/${tally[1]}` : '../..'}</span>
                  {tally ? <WilsonBar tally={tally} reduce={reduce} delay={reduce ? 0 : r * 0.05} /> : <span className="h-[9px] w-16 border-t border-line" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-dim">
          <span className="flex items-center gap-2">
            <Swatch state="pass" /> passes this view
          </span>
          <span className="flex items-center gap-2">
            <Swatch state="looked" /> passed final state, fails this view
          </span>
          <span className="flex items-center gap-2">
            <Swatch state="fail" /> fails both
          </span>
          <span className="flex items-center gap-2">
            <Swatch state="invalid" /> invalid evidence, excluded
          </span>
        </div>
      </div>

      {/* the run under the cursor */}
      <div className="mt-6 h-[17.5rem] overflow-hidden border-t border-line pt-4 text-[11.5px] leading-[1.75] sm:h-[14.5rem]">
        {run && data ? (
          <RunDetail run={run} data={data} />
        ) : (
          <p className="text-faint">
            hover, tap, or arrow-key through a cell to read that run's checks. each cell is one real, graded run; nothing here is simulated.
          </p>
        )}
      </div>

      <p className="mt-2 border-t border-line pt-4 text-[11px] leading-[1.8] text-faint">
        {data ? data.model : 'nvidia/nemotron-3-super-120b-a12b'} at temperature {data?.temperature ?? 0.2}, at most {data?.calls_cap ?? 300} calls a run; 7
        harness configs, 4 tasks, 3 seeds, {stats.invalid || 1} run excluded for invalid evidence. SafeSuccess counts a run only when the requested change is done,
        the required recovery passes and nothing prohibited happened on the way, each judged by independent checks rather than the agent's word.{' '}
        <a className="link-u text-dim" href={data?.source ?? 'https://github.com/jadenfix/FullStack-Bench'} target="_blank" rel="noreferrer">
          ledger ↗
        </a>
      </p>
    </div>
  );
}

function RunDetail({ run, data }: { run: Run; data: BenchData }) {
  const h = data.harnesses[run.h];
  const verdict =
    run.st === 'ok' ? (
      <span className="text-[#8fb59a]">safe success</span>
    ) : run.st === 'invalid' ? (
      <span className="text-faint">excluded</span>
    ) : (
      <span className="text-[#ec5c52]">not a safe success</span>
    );
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="text-bone">
          {h.id} <span className="text-faint">·</span> {data.tasks[run.t]} <span className="text-faint">·</span> seed {run.s}
        </span>
        {verdict}
      </div>
      <div className="truncate text-[11px] text-faint">{h.note}</div>
      <dl className="mt-2 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3">
        {VIEW_NAMES.map((name, i) => {
          const v = run.v[i];
          const fails = run.x[i];
          return (
            <div key={name} className="contents">
              <dt className="text-dim">{name}</dt>
              <dd className="min-w-0 truncate" title={fails.map(humanCheck).join(', ')}>
                {v == null ? (
                  <span className="text-faint">did not run</span>
                ) : v === 1 ? (
                  <span className="text-[#8fb59a]">pass</span>
                ) : (
                  <>
                    <span className="text-[#ec5c52]">fail</span>
                    <span className="text-dim"> · {fails.map(humanCheck).join(', ')}</span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-2 line-clamp-3 text-dim">
        <span className="text-faint">verdict </span>
        {cleanReason(run.r)}
      </p>
      <p className="text-[11px] text-faint">{run.c} model calls</p>
    </div>
  );
}
