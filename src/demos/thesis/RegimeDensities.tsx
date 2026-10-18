import { useEffect, useMemo, useRef, useState } from 'react';
import { C, clamp, linear, signed, useJson, usePrefersReducedMotion, useReveal, useSize, useVisibility } from './kit';

type RegimeModel = {
  model: string;
  sample: string;
  nobs: number;
  bull: { mean: number; sd: number };
  bear: { mean: number; sd: number };
  ar: number;
  stay: [number, number];
  dur: [number, number];
  bearShare: number;
  hist: { lo: number; width: number; counts: number[]; n: number };
  aucFiltered: number;
};

const URL = '/data/thesis/regimes.json';
const X0 = -16;
const X1 = 12;

const normal = (x: number, m: number, s: number) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

/**
 * Fig. 2: the two regimes of the main MS-AR(1) model. Left, each regime's return distribution
 * (normal, regime mean and innovation volatility) rising out of the histogram of all monthly
 * real returns; right, the fitted transition matrix as a two-state diagram, with a token that
 * walks the chain while the figure is on screen.
 */
export default function RegimeDensities() {
  const { data, failed } = useJson<RegimeModel>(URL);
  const boxRef = useRef<HTMLDivElement>(null);
  const { visible } = useVisibility(boxRef, '0px 0px -10% 0px');
  const reduce = usePrefersReducedMotion();
  const p = useReveal(visible && !!data, 2400, reduce);

  return (
    <section aria-label="Bull and bear regimes of the MS-AR(1) model" className="w-full min-w-0 text-bone">
      <div className="label">
        <span className="text-phos">two-regime ms-ar(1)</span>
        <span className="mx-2 text-faint">·</span>monthly real returns, {data ? data.sample.replace('-', ' to ') : '1960 to 2023'}
      </div>
      <div ref={boxRef} className="mt-5 grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="min-w-0 md:col-span-7">
          <Densities data={data} p={p} failed={failed} />
        </div>
        <div className="min-w-0 md:col-span-5">
          <StateDiagram data={data} p={p} running={visible && !reduce && p >= 1} />
        </div>
      </div>
      <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-faint">
        Curves: each regime&apos;s normal distribution at its estimated mean and innovation volatility. Bars: every monthly real
        return{data ? `, ${data.hist.n} months` : ''}. The diagram is the estimated transition matrix; expected duration is
        1 / (1 &minus; stay probability). The moving token simulates the chain, one step per month.
      </p>
    </section>
  );
}

// ------------------------------------------------------------------ densities

function Densities({ data, p, failed }: { data: RegimeModel | null; p: number; failed: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const M = { l: 34, r: 8, t: 16, b: 30 };

  const geo = useMemo(() => {
    if (!data || w <= 0) return null;
    const { hist, bull, bear } = data;
    const dens = hist.counts.map((c) => c / (hist.n * hist.width));
    const ymax = Math.max(normal(bull.mean, bull.mean, bull.sd), normal(bear.mean, bear.mean, bear.sd), ...dens) * 1.12;
    const x = linear(X0, X1, M.l, w - M.r);
    const y = linear(0, ymax, h - M.b, M.t);
    const curve = (m: number, s: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 160; i++) {
        const v = X0 + ((X1 - X0) * i) / 160;
        pts.push([v, normal(v, m, s)]);
      }
      return pts;
    };
    return { dens, ymax, x, y, bullPts: curve(bull.mean, bull.sd), bearPts: curve(bear.mean, bear.sd) };
  }, [data, w, h, M.l, M.r, M.t, M.b]);

  const eBars = clamp(p / 0.35, 0, 1);
  const eCurve = clamp((p - 0.2) / 0.6, 0, 1);
  const eText = clamp((p - 0.65) / 0.35, 0, 1);

  const path = (pts: [number, number][], k: number, close: boolean) => {
    if (!geo) return '';
    const base = geo.y(0);
    let d = '';
    pts.forEach(([v, f], i) => {
      d += `${i ? 'L' : 'M'}${geo.x(v).toFixed(1)},${(base + (geo.y(f) - base) * k).toFixed(1)}`;
    });
    if (close) d += `L${geo.x(X1).toFixed(1)},${base}L${geo.x(X0).toFixed(1)},${base}Z`;
    return d;
  };

  return (
    <div ref={ref} className="relative h-[250px] w-full sm:h-[290px]">
      {geo && data && (
        <svg width={w} height={h} className="absolute inset-0 block" role="img" aria-label={`Bull regime: mean ${data.bull.mean}% a month, volatility ${data.bull.sd}%. Bear regime: mean ${data.bear.mean}%, volatility ${data.bear.sd}%.`}>
          {/* axis */}
          {[-15, -10, -5, 0, 5, 10].map((t) => (
            <g key={t}>
              <line x1={geo.x(t)} x2={geo.x(t)} y1={M.t} y2={h - M.b} stroke={C.line} strokeWidth={t === 0 ? 1 : 0.6} strokeDasharray={t === 0 ? undefined : '2 4'} />
              <text x={geo.x(t)} y={h - M.b + 14} textAnchor="middle" fontSize={10} fill={C.faint}>
                {signed(t, 0)}
              </text>
            </g>
          ))}
          <line x1={M.l} x2={w - M.r} y1={h - M.b} y2={h - M.b} stroke={C.line} />
          <text x={w - M.r} y={h - 3} textAnchor="end" fontSize={10} fill={C.faint}>
            monthly real return, %
          </text>
          <text x={M.l - 6} y={M.t + 4} textAnchor="end" fontSize={10} fill={C.faint}>
            dens
          </text>

          {/* histogram of all months */}
          {geo.dens.map((d, i) => {
            const v0 = data.hist.lo + i * data.hist.width;
            const x0 = geo.x(v0) + 0.5;
            const x1 = geo.x(v0 + data.hist.width) - 0.5;
            const top = geo.y(d * eBars);
            return <rect key={i} x={x0} y={top} width={Math.max(0, x1 - x0)} height={Math.max(0, geo.y(0) - top)} fill={C.line} />;
          })}

          {/* regime densities */}
          <path d={path(geo.bullPts, eCurve, true)} fill={C.ice} fillOpacity={0.08} />
          <path d={path(geo.bearPts, eCurve, true)} fill={C.phos} fillOpacity={0.1} />
          <path d={path(geo.bullPts, eCurve, false)} fill="none" stroke={C.ice} strokeWidth={1.4} />
          <path d={path(geo.bearPts, eCurve, false)} fill="none" stroke={C.phos} strokeWidth={1.4} />

          {/* means and labels */}
          <g opacity={eText}>
            {(['bull', 'bear'] as const).map((k) => {
              const r = data[k];
              const peak = normal(r.mean, r.mean, r.sd);
              const xm = geo.x(r.mean);
              const col = k === 'bull' ? C.ice : C.phos;
              const left = k === 'bear';
              const tx = left ? geo.x(r.mean - r.sd * 0.55) : geo.x(r.mean + r.sd * 0.45);
              const ty = geo.y(peak) + (left ? -18 : 2);
              return (
                <g key={k}>
                  <line x1={xm} x2={xm} y1={geo.y(0)} y2={geo.y(peak)} stroke={col} strokeWidth={0.8} strokeDasharray="2 3" />
                  <text x={tx} y={ty} textAnchor={left ? 'end' : 'start'} fontSize={10.5} fill={col}>
                    {k}
                  </text>
                  <text x={tx} y={ty + 13} textAnchor={left ? 'end' : 'start'} fontSize={10} fill={C.dim}>
                    μ {signed(r.mean, 2)} σ {r.sd.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {!data && <div className="absolute inset-0 flex items-center justify-center label">{failed ? 'data unavailable' : 'loading'}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ state diagram

const VB = { w: 300, h: 190 };
const NODE = { r: 29, y: 104, x: [96, 204] as const };
const LOOP = { r: 16, off: NODE.r + 14 };
const TAPE = 56;
const STEP_MS = 560;
const MOVE_MS = 380;

type Move = { from: 0 | 1; to: 0 | 1; t: number };

function loopPoint(s: 0 | 1, t: number): [number, number] {
  // Self-loop on the outer side of each node, leaving above and returning below.
  const cx = s === 0 ? NODE.x[0] - LOOP.off : NODE.x[1] + LOOP.off;
  const a = s === 0 ? -0.3 * Math.PI - t * 1.4 * Math.PI : -0.7 * Math.PI + t * 1.4 * Math.PI;
  return [cx + LOOP.r * Math.cos(a), NODE.y + LOOP.r * Math.sin(a)];
}

function arcPoint(from: 0 | 1, t: number): [number, number] {
  // Quadratic arc between the nodes: bull to bear above, bear to bull below.
  const up = from === 0 ? -1 : 1;
  const x0 = from === 0 ? NODE.x[0] + NODE.r * 0.7 : NODE.x[1] - NODE.r * 0.7;
  const x2 = from === 0 ? NODE.x[1] - NODE.r * 0.7 : NODE.x[0] + NODE.r * 0.7;
  const y0 = NODE.y + up * NODE.r * 0.7;
  const cx = (NODE.x[0] + NODE.x[1]) / 2;
  const cy = NODE.y + up * 62;
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x2, u * u * y0 + 2 * u * t * cy + t * t * y0];
}

function sampled(f: (t: number) => [number, number], n = 40): string {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const [x, y] = f(i / n);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

function StateDiagram({ data, p, running }: { data: RegimeModel | null; p: number; running: boolean }) {
  const [move, setMove] = useState<Move>({ from: 0, to: 0, t: 1 });
  const [tape, setTape] = useState<number[]>([]);

  useEffect(() => {
    if (!running || !data) return;
    let raf = 0;
    let state: 0 | 1 = 0;
    let stepStart = performance.now();
    let next: 0 | 1 = 0;
    const pick = (s: 0 | 1): 0 | 1 => (Math.random() < data.stay[s] ? s : ((1 - s) as 0 | 1));
    next = pick(state);
    const tick = (now: number) => {
      const el = now - stepStart;
      if (el >= STEP_MS) {
        state = next;
        setTape((t) => [...t.slice(-(TAPE - 1)), state]);
        next = pick(state);
        stepStart = now;
      }
      const t = clamp((now - stepStart) / MOVE_MS, 0, 1);
      setMove({ from: state, to: next, t });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, data]);

  const eNodes = clamp(p / 0.4, 0, 1);
  const eArcs = clamp((p - 0.3) / 0.5, 0, 1);
  const eText = clamp((p - 0.6) / 0.4, 0, 1);

  const loops = [sampled((t) => loopPoint(0, t)), sampled((t) => loopPoint(1, t))];
  const arcs = [sampled((t) => arcPoint(0, t)), sampled((t) => arcPoint(1, t))];
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
  const tok = move.from === move.to ? loopPoint(move.from, ease(move.t)) : arcPoint(move.from, ease(move.t));
  const tokColor = (move.t < 0.5 ? move.from : move.to) === 0 ? C.ice : C.phos;
  const shown = running || tape.length > 0;
  const bearShare = tape.length ? tape.reduce((a, b) => a + b, 0) / tape.length : 0;

  const stay = data?.stay ?? [0, 0];
  const dur = data?.dur ?? [0, 0];
  const cols = [C.ice, C.phos];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="mx-auto block h-auto w-full max-w-[380px]" role="img" aria-label={data ? `Transition probabilities: bull stays bull with probability ${stay[0]}, bear stays bear with probability ${stay[1]}. Expected durations ${dur[0]} and ${dur[1]} months.` : 'Regime transition diagram'}>
        <defs>
          {[0, 1].map((s) => (
            <marker key={s} id={`rd-arrow-${s}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0.8 L7,4 L0,7.2" fill="none" stroke={cols[s]} strokeWidth={1.1} />
            </marker>
          ))}
        </defs>

        {/* edges */}
        <g opacity={eArcs}>
          {[0, 1].map((s) => (
            <g key={s}>
              <path d={loops[s]} fill="none" stroke={cols[s]} strokeWidth={1} strokeOpacity={0.75} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - eArcs} markerEnd={`url(#rd-arrow-${s})`} />
              <path d={arcs[s]} fill="none" stroke={cols[1 - s]} strokeWidth={1} strokeOpacity={0.75} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - eArcs} markerEnd={`url(#rd-arrow-${1 - s})`} />
            </g>
          ))}
        </g>

        {/* nodes */}
        {[0, 1].map((s) => (
          <g key={s} opacity={eNodes} transform={`translate(${NODE.x[s]} ${NODE.y}) scale(${0.85 + 0.15 * eNodes})`}>
            <circle r={NODE.r} fill={C.void} stroke={cols[s]} strokeWidth={1.2} />
            <text y={4} textAnchor="middle" fontSize={12} fill={cols[s]}>
              {s === 0 ? 'bull' : 'bear'}
            </text>
          </g>
        ))}

        {/* probabilities and durations */}
        <g opacity={eText} fontSize={10.5}>
          <text x={NODE.x[0] - LOOP.off} y={NODE.y - LOOP.r - 8} textAnchor="middle" fill={C.bone}>
            {stay[0].toFixed(3)}
          </text>
          <text x={NODE.x[1] + LOOP.off} y={NODE.y - LOOP.r - 8} textAnchor="middle" fill={C.bone}>
            {stay[1].toFixed(3)}
          </text>
          <text x={(NODE.x[0] + NODE.x[1]) / 2} y={NODE.y - 47} textAnchor="middle" fill={C.dim}>
            {(1 - stay[0]).toFixed(3)}
          </text>
          <text x={(NODE.x[0] + NODE.x[1]) / 2} y={NODE.y + 57} textAnchor="middle" fill={C.dim}>
            {(1 - stay[1]).toFixed(3)}
          </text>
          <text x={NODE.x[0]} y={NODE.y + NODE.r + 40} textAnchor="middle" fill={C.dim}>
            ~{dur[0].toFixed(1)} months
          </text>
          <text x={NODE.x[1]} y={NODE.y + NODE.r + 40} textAnchor="middle" fill={C.dim}>
            ~{dur[1].toFixed(1)} months
          </text>
        </g>

        {/* token */}
        {running && <circle cx={tok[0]} cy={tok[1]} r={3.2} fill={tokColor} />}
      </svg>

      {/* simulated tape: fixed height, so it never shifts the layout */}
      <div className="mx-auto mt-3 max-w-[380px]" aria-hidden={!shown}>
        <div className="flex h-[10px] gap-px overflow-hidden border border-line p-px">
          {Array.from({ length: TAPE }, (_, i) => {
            const v = tape[tape.length - TAPE + i];
            return <span key={i} className="h-full flex-1" style={{ background: v === undefined ? 'transparent' : cols[v], opacity: v === 1 ? 0.9 : 0.45 }} />;
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10.5px] tabular-nums text-faint">
          <span>simulated months, newest right</span>
          <span>
            bear share {tape.length ? `${Math.round(100 * bearShare)}%` : '--'}
            {data ? ` · model ${Math.round(100 * data.bearShare)}%` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
