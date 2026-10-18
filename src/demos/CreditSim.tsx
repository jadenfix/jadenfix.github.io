import { motion, useReducedMotion } from 'framer-motion';
import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { EDGES, Director, H, edgePath, geometry, motionKey, type DirectorUI, type Geom, type LogLine } from './credit/director';
import { PAPER_SEEDS, availableActions, type ScorerName } from './credit/engine';
import { CONDITIONS, GATES, PAPER, Protocol, type Condition, type Credit } from './credit/protocol';

const RED = '#ec5c52';
const PHOS = '#e8a96a';
const ICE = '#c4ccde';
const BONE = '#dcd6c8';

const SCORER_LABEL: Record<Condition, string> = {
  prompted: 'prompted',
  outcome_only: 'outcome-only',
  branch_aware: 'branch-aware',
  hindsight: 'hindsight',
  combined: 'combined',
};
const TOGGLES: ScorerName[] = ['outcome_only', 'branch_aware', 'hindsight', 'combined'];
const GATE_LABEL: Record<string, string> = { start: 'gate 1', gate_2: 'gate 2', gate_3: 'gate 3', gate_4: 'gate 4' };
const Q_MAX = 2.5;

export default function CreditSim() {
  const reduced = !!useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [scorer, setScorer] = useState<ScorerName>('outcome_only');
  const [p, setP] = useState(0.75);
  const [proto, setProto] = useState(() => new Protocol(0.75));
  const [seedIdx, setSeedIdx] = useState(0);
  const [run, setRun] = useState(0);
  const commit = useRef(0);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const onP = (v: number) => {
    setP(v);
    window.clearTimeout(commit.current);
    commit.current = window.setTimeout(() => {
      setProto((cur) => (cur.p === v ? cur : new Protocol(v)));
      setRun((r) => r + 1);
    }, 320);
  };
  useEffect(() => () => window.clearTimeout(commit.current), []);

  const again = () => {
    setSeedIdx((i) => (i + 1) % PAPER_SEEDS.length);
    setRun((r) => r + 1);
    setPaused(false);
  };

  const onToggleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = TOGGLES.indexOf(scorer);
    const n = TOGGLES[(i + (e.key === 'ArrowRight' ? 1 : TOGGLES.length - 1)) % TOGGLES.length];
    setScorer(n);
    (e.currentTarget.querySelector(`[data-s="${n}"]`) as HTMLButtonElement | null)?.focus();
  };

  return (
    <figure className="font-mono">
      <div ref={rootRef} className="border border-line bg-void text-[12px] text-bone">
        <Stage
          key={run}
          proto={proto}
          seedIdx={seedIdx}
          scorer={scorer}
          active={inView && !paused}
          paused={paused}
          reduced={reduced}
          w={w}
          p={p}
        />

        {/* controls */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line px-4 py-3">
          <div role="radiogroup" aria-label="scorer" className="flex flex-wrap gap-x-1 gap-y-1" onKeyDown={onToggleKey}>
            {TOGGLES.map((s) => {
              const on = s === scorer;
              return (
                <button
                  key={s}
                  data-s={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setScorer(s)}
                  className={`whitespace-nowrap px-1 py-0.5 text-[11.5px] transition-colors duration-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos ${
                    on ? 'text-phos' : 'text-dim hover:text-bone'
                  }`}
                >
                  <span className={on ? 'text-phos/70' : 'text-faint'}>[</span> {SCORER_LABEL[s]} <span className={on ? 'text-phos/70' : 'text-faint'}>]</span>
                </button>
              );
            })}
          </div>
          <label className="flex min-w-[200px] flex-1 items-center gap-3 text-[11.5px] text-dim sm:max-w-[300px]">
            <span className="whitespace-nowrap">p(unlock)</span>
            <input
              type="range"
              min={0.6}
              max={0.9}
              step={0.05}
              value={p}
              onChange={(e) => onP(Number(e.target.value))}
              aria-label="probability that an unlock attempt succeeds"
              className="h-4 w-full min-w-0 cursor-pointer appearance-none bg-transparent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-phos [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-[7px] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-phos [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-faint [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-faint [&::-webkit-slider-thumb]:-mt-[5.5px] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-[7px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-phos"
            />
            <span className="w-[30px] tabular-nums text-bone">{p.toFixed(2)}</span>
          </label>
          <div className="flex items-center gap-x-3 text-[11.5px]">
            <button
              type="button"
              onClick={again}
              className="whitespace-nowrap px-1 py-0.5 text-dim transition-colors duration-500 hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos"
            >
              <span className="text-faint">[</span> run again <span className="text-faint">]</span>
            </button>
            {!reduced && (
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                aria-pressed={paused}
                className="w-[78px] whitespace-nowrap px-1 py-0.5 text-left text-dim transition-colors duration-500 hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos"
              >
                <span className="text-faint">[</span> {paused ? 'play' : 'pause'} <span className="text-faint">]</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <figcaption className="label mt-3 leading-[1.8]">
        a toy, but the paper&rsquo;s own code: its stochastic benchmark, scorers and greedy table policy, ported from python and run in your
        browser. the diagram follows one seed through the gate chain; the numbers are means over the paper&rsquo;s 15 seeds and reproduce
        its table 1 at p = 0.75.
      </figcaption>
    </figure>
  );
}

/* ───────────────────────────── the live figure ───────────────────────────── */

type StageProps = {
  proto: Protocol;
  seedIdx: number;
  scorer: ScorerName;
  active: boolean;
  paused: boolean;
  reduced: boolean;
  w: number;
  p: number;
};

type EndTag = 'success' | 'exhausted' | 'failed' | null;

function Stage({ proto, seedIdx, scorer, active, paused, reduced, w, p }: StageProps) {
  const geom = useMemo(() => geometry(w), [w]);
  const geomRef = useRef<Geom>(geom);
  const scorerRef = useRef(scorer);
  const pointRef = useRef<SVGGElement>(null);
  const trailRefs = useRef<(SVGCircleElement | null)[]>([]);
  const dirRef = useRef<Director | null>(null);
  const flashId = useRef(0);

  const [k, setK] = useState(0);
  const [mode, setMode] = useState<'collect' | 'replay'>('collect');
  const [log, setLog] = useState<LogLine | null>(null);
  const [end, setEnd] = useState<EndTag>(null);
  const [flash, setFlash] = useState<{ at: string; id: number } | null>(null);
  const [flare, setFlare] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [replay, setReplay] = useState<{ i: number; n: number } | null>(null);

  useEffect(() => {
    geomRef.current = geom;
  }, [geom]);
  useEffect(() => {
    scorerRef.current = scorer;
    dirRef.current?.setScorer(scorer);
  }, [scorer]);

  const ui = useMemo<DirectorUI>(
    () => ({
      onStep: (line, key, orbit) => {
        setLog(line);
        setEnd(null);
        if (orbit) setFlash({ at: key.slice(2), id: ++flashId.current });
      },
      onStepEnd: (key, collecting) => {
        if (collecting) setCounts((c) => ({ ...c, [key]: (c[key] ?? 0) + 1 }));
      },
      onEpisodeEnd: (reached, exhausted) => {
        if (reached) setFlare((f) => f + 1);
        setEnd(reached ? 'success' : exhausted ? 'exhausted' : 'failed');
      },
      onReveal: (n) => setK(n),
      onReplay: (i, n) => {
        setMode('replay');
        setReplay({ i, n });
      },
      onIdle: () => {
        setMode('replay');
        setLog(null);
        setEnd(null);
      },
    }),
    [],
  );

  useEffect(() => {
    const d = new Director(proto, seedIdx, scorerRef.current, ui, () => geomRef.current, () => ({
      point: pointRef.current,
      trail: trailRefs.current,
    }));
    dirRef.current = d;
    if (reduced) {
      d.settle(() => {
        const c: Record<string, number> = {};
        for (const ep of proto.episodes[seedIdx]) {
          if (ep.task.family !== 'stoch_gate') continue;
          for (const s of ep.steps) c[motionKey(s)] = (c[motionKey(s)] ?? 0) + 1;
        }
        setCounts(c);
        setK(50);
        setMode('replay');
      });
    }
    return () => {
      d.destroy();
      dirRef.current = null;
    };
  }, [proto, seedIdx, reduced, ui]);

  useEffect(() => {
    dirRef.current?.setActive(active && !reduced);
  }, [active, reduced]);

  const credit = useMemo(() => proto.credit(seedIdx, k), [proto, seedIdx, k]);
  const snaps = useMemo(() => proto.snapshots.slice(0, k), [proto, k]);
  const pips = useMemo(() => proto.episodes[seedIdx].map((e) => ({ gate: e.task.family === 'stoch_gate', ok: e.success })), [proto, seedIdx]);
  const seed = PAPER_SEEDS[seedIdx];

  const status = reduced
    ? `settled · seed ${seed}`
    : paused
      ? 'paused'
      : mode === 'collect'
        ? `rollout ${String(k).padStart(2, '0')}/50 · seed ${seed}`
        : `replay ${replay ? replay.i + 1 : 1}/${replay?.n ?? 17} · seed ${seed}`;

  return (
    <>
      {/* header */}
      <div className="flex h-[38px] items-center justify-between gap-3 border-b border-line px-4">
        <span className="label truncate">
          {mode === 'collect' ? (
            <>
              <span className="text-phos">collecting</span>
              <span className="hidden sm:inline"> · behaviour policy: oracle, 50% random</span>
            </>
          ) : (
            <>
              <span className="text-phos">greedy policy</span> · {SCORER_LABEL[scorer]}
            </>
          )}
        </span>
        <span className="label whitespace-nowrap tabular-nums">{status}</span>
      </div>

      <Diagram geom={geom} counts={counts} flash={flash} flare={flare} p={p} pointRef={pointRef} trailRefs={trailRefs} />

      {/* terminal line */}
      <div className="flex h-[34px] items-center gap-3 border-t border-line px-4 text-[11.5px]" aria-live="off">
        {log ? (
          <>
            <span className="tabular-nums text-faint">t{String(log.turn).padStart(2, '0')}</span>
            <span className="whitespace-nowrap text-bone">
              <span className="text-faint">&gt;</span> {log.action}
            </span>
            <span className={`min-w-0 flex-1 truncate ${log.stuck ? 'text-[#ec5c52]/80' : 'text-dim'}`}>{log.obs}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-faint">
            {reduced
              ? 'reduced motion: showing the settled result after 50 rollouts'
              : mode === 'collect'
                ? 'waiting for the first rollout'
                : `replaying the policy ${SCORER_LABEL[scorer]} learned from these 50 rollouts`}
          </span>
        )}
        <span
          className={`w-[118px] shrink-0 text-right transition-opacity duration-700 ${end ? 'opacity-100' : 'opacity-0'} ${
            end === 'success' ? 'text-phos' : end === 'exhausted' ? 'text-[#ec5c52]' : 'text-dim'
          }`}
        >
          {end === 'success' ? 'reached the end' : end === 'exhausted' ? 'out of turns (15)' : end === 'failed' ? 'gave up' : ''}
        </span>
      </div>

      {/* ledger of the 50 collection rollouts */}
      <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
        <span className="label hidden shrink-0 sm:inline">rollouts</span>
        <div className="flex h-[7px] min-w-0 flex-1 gap-px sm:gap-[2px]" aria-hidden>
          {pips.map((pip, i) => {
            const shown = i < k;
            const c = pip.gate ? PHOS : '#8d887c';
            return (
              <span
                key={i}
                className="h-full min-w-0 flex-1 transition-[background-color,box-shadow,opacity] duration-700"
                style={{
                  background: shown && pip.ok ? c : 'transparent',
                  boxShadow: `inset 0 0 0 1px ${shown ? c : '#252421'}`,
                  opacity: shown ? (pip.gate ? 0.9 : 0.45) : 1,
                }}
              />
            );
          })}
        </div>
        <span className="label w-[38px] shrink-0 text-right tabular-nums">{k}/50</span>
      </div>

      <div className={`grid border-t border-line ${w >= 640 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <CreditPanel credit={credit} scorer={scorer} proto={proto} k={k} />
        <Results snaps={snaps} scorer={scorer} p={p} split={w >= 640} />
      </div>
    </>
  );
}

/* ───────────────────────────── diagram ───────────────────────────── */

function Diagram({
  geom,
  counts,
  flash,
  flare,
  p,
  pointRef,
  trailRefs,
}: {
  geom: Geom;
  counts: Record<string, number>;
  flash: { at: string; id: number } | null;
  flare: number;
  p: number;
  pointRef: RefObject<SVGGElement | null>;
  trailRefs: RefObject<(SVGCircleElement | null)[]>;
}) {
  const id = useId().replace(/:/g, '');
  const n = geom.nodes;
  const edgeMax = Math.max(1, ...EDGES.map((e) => counts[e.id] ?? 0));
  const orbitMax = Math.max(1, ...GATES.map((g) => counts[`o:${g}`] ?? 0));
  const glow = (c: number, max: number) => Math.sqrt(c / max);
  const clampX = (x: number, half: number) => Math.min(geom.w - half - 6, Math.max(half + 6, x));
  const labels: [string, string][] = [
    ['start', 'gate 1'],
    ['gate_2', 'gate 2'],
    ['gate_3', 'gate 3'],
    ['gate_4', 'gate 4'],
    ['success', 'open'],
  ];
  const corner = 7;

  return (
    <svg width={geom.w} height={H} viewBox={`0 0 ${geom.w} ${H}`} className="block h-auto max-w-full" role="img" aria-label="state diagram of the four-gate task, with the current rollout moving through it">
      <defs>
        <filter id={`${id}g`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* crop marks */}
      {[
        [10, 10, 1, 1],
        [geom.w - 10, 10, -1, 1],
        [10, H - 10, 1, -1],
        [geom.w - 10, H - 10, -1, -1],
      ].map(([x, y, sx, sy], i) => (
        <path key={i} d={`M${x},${y + sy * corner} L${x},${y} L${x + sx * corner},${y}`} fill="none" stroke="#34322e" strokeWidth={1} />
      ))}

      {/* edges: hairline base, then a layer that brightens with traffic */}
      {EDGES.map((e) => {
        const d = edgePath(geom, e);
        const c = counts[e.id] ?? 0;
        const tint = e.kind === 'pivot' ? PHOS : e.kind === 'reset' ? ICE : e.kind === 'retreat' ? BONE : RED;
        return (
          <g key={e.id}>
            <path d={d} fill="none" stroke="#34322e" strokeWidth={1} strokeDasharray={e.kind === 'retreat' ? '2 3' : undefined} />
            <path
              d={d}
              fill="none"
              stroke={tint}
              strokeWidth={1}
              strokeDasharray={e.kind === 'retreat' ? '2 3' : undefined}
              style={{ opacity: c ? 0.12 + 0.6 * glow(c, edgeMax) : 0, transition: 'opacity 900ms ease' }}
            />
          </g>
        );
      })}

      {/* p on each unlock edge */}
      {(['start', 'gate_2', 'gate_3', 'gate_4'] as const).map((g, i) => {
        const to = i < 3 ? GATES[i + 1] : 'success';
        return (
          <text key={g} x={(n[g].x + n[to].x) / 2} y={geom.y0 - 6} textAnchor="middle" fontSize={9.5} fill="#58554e" className="tabular-nums">
            p {p.toFixed(2)}
          </text>
        );
      })}

      {/* orbit rings: where stalls and failed unlocks go round in place */}
      {GATES.map((g) => {
        const c = counts[`o:${g}`] ?? 0;
        return (
          <g key={g}>
            <circle cx={n[g].x} cy={n[g].y} r={geom.ring} fill="none" stroke="#34322e" strokeWidth={1} strokeDasharray="1 2.5" />
            <circle
              cx={n[g].x}
              cy={n[g].y}
              r={geom.ring}
              fill="none"
              stroke={RED}
              strokeWidth={1}
              strokeDasharray="1 2.5"
              style={{ opacity: c ? 0.15 + 0.6 * glow(c, orbitMax) : 0, transition: 'opacity 900ms ease' }}
            />
          </g>
        );
      })}

      {/* states */}
      {GATES.map((g) => (
        <g key={g}>
          {[0, 90, 180, 270].map((a) => {
            const r = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                x1={n[g].x + Math.cos(r) * 4}
                y1={n[g].y + Math.sin(r) * 4}
                x2={n[g].x + Math.cos(r) * 6.5}
                y2={n[g].y + Math.sin(r) * 6.5}
                stroke="#58554e"
                strokeWidth={1}
              />
            );
          })}
          <circle cx={n[g].x} cy={n[g].y} r={2} fill={BONE} />
        </g>
      ))}
      <circle cx={n.success.x} cy={n.success.y} r={2.4} fill={PHOS} />
      <circle cx={n.success.x} cy={n.success.y} r={5.5} fill="none" stroke={PHOS} strokeOpacity={0.45} strokeWidth={1} />
      <circle cx={n.jammed.x} cy={n.jammed.y} r={1.8} fill="#8d887c" />
      <path
        d={`M${n.failure.x - 2.5},${n.failure.y - 2.5} L${n.failure.x + 2.5},${n.failure.y + 2.5} M${n.failure.x + 2.5},${n.failure.y - 2.5} L${n.failure.x - 2.5},${n.failure.y + 2.5}`}
        stroke="#8d887c"
        strokeWidth={1}
      />

      {/* labels */}
      {labels.map(([node, text]) => (
        <text key={node} x={clampX(n[node].x, 22)} y={geom.y0 - 24} textAnchor="middle" fontSize={10.5} fill="#8d887c">
          {text}
        </text>
      ))}
      <text x={n.jammed.x + 9} y={n.jammed.y + 16} fontSize={10} fill="#58554e">
        jammed
      </text>
      <text x={n.failure.x + 9} y={n.failure.y + 16} fontSize={10} fill="#58554e">
        failure
      </text>

      {/* success flare */}
      {flare > 0 && (
        <motion.circle
          key={flare}
          cx={n.success.x}
          cy={n.success.y}
          fill="none"
          stroke={PHOS}
          strokeWidth={1}
          initial={{ r: 4, opacity: 0.9 }}
          animate={{ r: 22, opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.2, 0.7, 0.2, 1] }}
        />
      )}

      {/* nothing happens */}
      {flash && n[flash.at] && (
        <g key={flash.id}>
          <motion.circle
            cx={n[flash.at].x}
            cy={n[flash.at].y}
            r={geom.ring}
            fill="none"
            stroke={RED}
            strokeWidth={1}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          <motion.text
            x={clampX(n[flash.at].x, 52)}
            y={geom.y0 - 42}
            textAnchor="middle"
            fontSize={10.5}
            fill={RED}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: [0, 0.95, 0.95, 0], y: [2, 0, 0, -2] }}
            transition={{ duration: 1.6, times: [0, 0.18, 0.6, 1], ease: 'easeInOut' }}
          >
            nothing happens.
          </motion.text>
        </g>
      )}

      {/* the rollout */}
      {Array.from({ length: 6 }, (_, i) => (
        <circle
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          r={1.8 - i * 0.18}
          fill={PHOS}
          opacity={0}
        />
      ))}
      <g ref={pointRef} style={{ opacity: 0, transition: 'opacity 500ms ease' }}>
        <circle r={8} fill={PHOS} opacity={0.35} filter={`url(#${id}g)`} />
        <circle r={2.7} fill="#f6dcb8" />
      </g>
    </svg>
  );
}

/* ───────────────────────────── credit ───────────────────────────── */

function greedyOf(q: Record<string, number>, actions: string[]) {
  if (!Object.keys(q).length) return { action: null as string | null, tie: false };
  let best = actions[0];
  let bv = q[best] ?? -Infinity;
  for (const a of actions.slice(1)) {
    const v = q[a] ?? -Infinity;
    if (v > bv) {
      best = a;
      bv = v;
    }
  }
  const tie = actions.filter((a) => (q[a] ?? -Infinity) === bv).length > 1;
  return { action: best, tie };
}

function CreditPanel({ credit, scorer, proto, k }: { credit: Credit; scorer: ScorerName; proto: Protocol; k: number }) {
  const rows = credit[scorer];
  const gate = proto.train[0];
  return (
    <div className="px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label truncate">credit · q(gate, action)</span>
        <span className="label whitespace-nowrap text-phos">{SCORER_LABEL[scorer]}</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {GATES.map((g, gi) => {
          const { q, n } = rows[gi];
          const { action, tie } = greedyOf(q, availableActions(gate, g));
          const short = action ? action.replace('_gate', '') : null;
          const bad = action !== null && action !== 'unlock_gate';
          return (
            <div key={g} className="grid grid-cols-[78px_minmax(0,1fr)] gap-x-2">
              <div className="whitespace-nowrap leading-[16px]">
                <div className="text-[11px] text-dim">{GATE_LABEL[g]}</div>
                <div className={`text-[11px] transition-colors duration-700 ${short ? (bad ? 'text-[#ec5c52]' : 'text-phos') : 'text-faint'}`}>
                  {short ? `→ ${short}` : k ? '→ random' : '·'}
                  {tie && <span className="text-faint"> (=)</span>}
                </div>
              </div>
              <div>
                <Bar name="unlock" v={q.unlock_gate} n={n.unlock_gate} color={PHOS} />
                <Bar name="rattle" v={q.rattle_gate} n={n.rattle_gate} color={RED} />
                {g === 'start' ? (
                  <Bar name="force" v={q.force_gate} n={n.force_gate} color="#8d887c" />
                ) : (
                  <Bar name="retreat" v={q.retreat} n={n.retreat} color="#8d887c" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10.5px] leading-[1.7] text-faint">
        mean score per visit. the learned policy takes the larger; <span className="text-dim">(=)</span> marks a tie, which the code breaks
        alphabetically, toward rattle.
      </p>
    </div>
  );
}

function Bar({ name, v, n, color }: { name: string; v: number | undefined; n: number | undefined; color: string }) {
  const has = v !== undefined;
  const pct = has ? Math.max(0, Math.min(1, v / Q_MAX)) * 100 : 0;
  return (
    <div className="grid h-[16px] grid-cols-[50px_minmax(0,1fr)_38px_30px] items-center gap-x-2 text-[11px]">
      <span className="text-dim">{name}</span>
      <span className="relative block h-[5px] bg-[#1a1918]">
        <span
          className="absolute inset-y-0 left-0 block transition-[width] duration-[1100ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ width: `${pct}%`, background: color, opacity: 0.8 }}
        />
        <span className="absolute -top-[2px] block h-[9px] w-px bg-faint" style={{ left: `${(1 / Q_MAX) * 100}%` }} aria-hidden />
      </span>
      <span className="text-right tabular-nums text-bone">{has ? v.toFixed(2) : '·'}</span>
      <span className="text-right tabular-nums text-faint">{n ? `×${n}` : ''}</span>
    </div>
  );
}

/* ───────────────────────────── results ───────────────────────────── */

function Results({
  snaps,
  scorer,
  p,
  split,
}: {
  snaps: { k: number; mean: Record<Condition, number> }[];
  scorer: ScorerName;
  p: number;
  split: boolean;
}) {
  const last = snaps[snaps.length - 1];
  const atPaper = Math.abs(p - 0.75) < 1e-9;
  return (
    <div className={`px-4 py-4 ${split ? 'border-l border-line' : 'border-t border-line'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">learned policy success</span>
        <span className="label">15 seeds</span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(48px,96px)_36px_36px] items-center gap-x-3 gap-y-[7px] text-[11px]">
        <span />
        <span className="label whitespace-nowrap text-[10px] text-faint">by rollout</span>
        <span className="label text-right text-[10px] text-faint">now</span>
        <span className="label text-right text-[10px] text-faint">paper</span>
        {CONDITIONS.map((c) => {
          const sel = c === scorer;
          const base = c === 'prompted';
          const col = sel ? PHOS : base ? ICE : '#8d887c';
          const v = last?.mean[c];
          return (
            <Fragment key={c}>
              <span className={`truncate transition-colors duration-700 ${sel ? 'text-phos' : base ? 'text-ice/80' : 'text-dim'}`}>
                {base ? (split ? 'prompted, untrained' : 'prompted') : SCORER_LABEL[c]}
              </span>
              <Spark values={snaps.map((s) => s.mean[c])} color={col} strong={sel || base} paper={atPaper ? PAPER[c] : null} />
              <span className={`text-right tabular-nums ${sel ? 'text-phos' : 'text-bone'}`}>{v === undefined ? '·' : v.toFixed(2)}</span>
              <span className="text-right tabular-nums text-faint">{PAPER[c].toFixed(2)}</span>
            </Fragment>
          );
        })}
      </div>
      <p className="mt-3 text-[10.5px] leading-[1.7] text-faint">
        greedy table policy fit on the first k rollouts, scored on 50 held-out rollouts per seed.
        {atPaper ? ' paper column: table 1, same setting.' : ' paper column is at p = 0.75.'}
      </p>
    </div>
  );
}

function Spark({ values, color, strong, paper }: { values: number[]; color: string; strong: boolean; paper: number | null }) {
  const Wd = 100;
  const Ht = 16;
  const y = (v: number) => Ht - 1 - v * (Ht - 2);
  const pts = values.map((v, i) => `${((i / 49) * Wd).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${Wd} ${Ht}`} preserveAspectRatio="none" className="block h-[16px] w-full overflow-visible" aria-hidden>
      <line x1={0} x2={Wd} y1={Ht - 0.5} y2={Ht - 0.5} stroke="#252421" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {paper !== null && (
        <line x1={0} x2={Wd} y1={y(paper)} y2={y(paper)} stroke="#58554e" strokeWidth={1} strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
      )}
      {values.length > 1 && (
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeOpacity={strong ? 0.95 : 0.55}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

