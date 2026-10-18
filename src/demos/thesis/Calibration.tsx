import { useMemo, useRef, useState } from 'react';
import { C, clamp, linear, toggleClass, useJson, usePrefersReducedMotion, useReveal, useSize, useTween, useVisibility } from './kit';

type Point = { b: number; f: number; o: number; n: number };
type Cell = { pts: Point[]; hist: number[]; n: number; brier: number; base: number };
type CalData = {
  horizons: number[];
  models: { key: string; label: string }[];
  bins: number;
  minCount: number;
  data: Record<string, Record<string, Cell>>;
};

const URL = '/data/thesis/calibration.json';
const COLOR: Record<string, string> = { logit_all: C.phos, logit_dy: C.bone, ms: C.dim, persist: C.ice };
const SHORT: Record<string, string> = {
  logit_all: 'logit: all predictors',
  logit_dy: 'logit: dividend yield',
  ms: 'ms-ar(1)',
  persist: 'persistence',
};

/**
 * Fig. 5: reliability of the real-time forecasts. Each dot is one probability bin: forecast
 * on the x axis, how often a bear market followed on the y axis. Dots start on the diagonal
 * (perfect calibration) and slide to where the data put them; below, how often each
 * probability was issued.
 */
export default function Calibration() {
  const { data, failed } = useJson<CalData>(URL);
  const [h, setH] = useState(1);
  const [model, setModel] = useState('logit_all');

  const boxRef = useRef<HTMLDivElement>(null);
  const { visible } = useVisibility(boxRef, '0px 0px -10% 0px');
  const reduce = usePrefersReducedMotion();
  const reveal = useReveal(visible && !!data, 1900, reduce);
  const animate = visible && !reduce;

  const nb = data?.bins ?? 10;
  const cell = data?.data[String(h)]?.[model] ?? null;

  // Fixed slots per bin so switching model or horizon tweens dot by dot.
  const target = useMemo(() => {
    const f: number[] = [];
    const o: number[] = [];
    const r: number[] = [];
    const hist: number[] = [];
    const total = cell?.n ?? 1;
    for (let b = 0; b < nb; b++) {
      const p = cell?.pts.find((q) => q.b === b);
      const mid = (b + 0.5) / nb;
      f.push(p ? p.f : mid);
      o.push(p ? p.o : mid);
      r.push(p ? Math.sqrt(p.n) : 0);
      hist.push((cell?.hist[b] ?? 0) / total);
    }
    return [...f, ...o, ...r, ...hist];
  }, [cell, nb]);
  const v = useTween(target, 700, animate);
  const F = v.slice(0, nb);
  const O = v.slice(nb, 2 * nb);
  const R = v.slice(2 * nb, 3 * nb);
  const H = v.slice(3 * nb, 4 * nb);

  const slide = clamp((reveal - 0.15) / 0.7, 0, 1);
  const color = COLOR[model] ?? C.phos;

  return (
    <section aria-label="Calibration of the real-time bear-market forecasts" className="w-full min-w-0 text-bone">
      <div className="label">
        <span className="text-phos">calibration</span>
        <span className="mx-2 text-faint">·</span>real-time forecasts, 1960 to 2023
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Horizon" className="flex flex-wrap gap-2">
          {(data?.horizons ?? [1, 3, 6, 12]).map((hz) => (
            <button key={hz} type="button" disabled={!data} aria-pressed={h === hz} onClick={() => setH(hz)} className={toggleClass(h === hz)}>
              <span aria-hidden className="text-faint">[ </span>
              {hz} mo
              <span aria-hidden className="text-faint"> ]</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Model" className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <span className="label mr-1">model</span>
          {(data?.models ?? []).map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={model === m.key}
              onClick={() => setModel(m.key)}
              className={`px-[6px] py-[3px] text-[11px] lowercase transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos ${
                model === m.key ? 'text-phos' : 'text-dim hover:text-bone'
              }`}
            >
              {model === m.key ? `[${SHORT[m.key]}]` : SHORT[m.key]}
            </button>
          ))}
        </div>
      </div>

      <div ref={boxRef} className="mt-5 grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="min-w-0 md:col-span-7">
          <Reliability F={F} O={O} R={R} slide={slide} color={color} reveal={reveal} ready={!!data} failed={failed} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 md:col-span-5">
          <Histogram H={H} reveal={reveal} color={color} nb={nb} />
          <dl className="grid grid-cols-3 gap-3 border-t border-line pt-3 text-[11px] tabular-nums">
            <div>
              <dt className="label">brier</dt>
              <dd className="mt-1 text-bone">{cell ? cell.brier.toFixed(3) : '--'}</dd>
            </div>
            <div>
              <dt className="label">bear rate</dt>
              <dd className="mt-1 text-bone">{cell ? `${(100 * cell.base).toFixed(1)}%` : '--'}</dd>
            </div>
            <div>
              <dt className="label">forecasts</dt>
              <dd className="mt-1 text-bone">{cell ? cell.n : '--'}</dd>
            </div>
          </dl>
          <p className="text-[12px] leading-relaxed text-dim">
            Dots above the diagonal: bear markets came more often than forecast. Below it: the forecast was too confident.
            At one month the models rank months well but overshoot at the top. By twelve months the observed rate no longer
            rises with the forecast.
          </p>
        </div>
      </div>

      <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-faint">
        Forecasts are grouped into {nb} equal-width probability bins; bins with fewer than {data?.minCount ?? 5} forecasts are
        dropped. Dot area is proportional to the number of forecasts in the bin. Each forecast uses only data available at
        its origin month.
      </p>
    </section>
  );
}

function Reliability({
  F,
  O,
  R,
  slide,
  color,
  reveal,
  ready,
  failed,
}: {
  F: number[];
  O: number[];
  R: number[];
  slide: number;
  color: string;
  reveal: number;
  ready: boolean;
  failed: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const M = { l: 34, r: 10, t: 10, b: 30 };
  const side = Math.max(0, Math.min(w - M.l - M.r, h - M.t - M.b));
  const x = linear(0, 1, M.l, M.l + side);
  const y = linear(0, 1, M.t + side, M.t);
  const rmax = Math.max(1, ...R);
  const pts = F.map((f, i) => ({ f, o: f + (O[i] - f) * slide, r: R[i] }));
  const line = pts.filter((p) => p.r > 0.5);

  return (
    <div ref={ref} className="relative h-[300px] w-full sm:h-[340px]">
      {ready && side > 0 && (
        <svg width={w} height={h} className="absolute inset-0 block" role="img" aria-label="Observed bear frequency against forecast probability, by bin">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke={C.line} strokeWidth={0.6} strokeDasharray="2 4" />
              <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth={0.6} strokeDasharray="2 4" />
              <text x={x(t)} y={y(0) + 14} textAnchor="middle" fontSize={10} fill={C.faint}>
                {t}
              </text>
              <text x={x(0) - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={C.faint}>
                {t}
              </text>
            </g>
          ))}
          <rect x={x(0)} y={y(1)} width={side} height={side} fill="none" stroke={C.line} />
          <line x1={x(0)} y1={y(0)} x2={x(0) + side * clamp(reveal / 0.3, 0, 1)} y2={y(clamp(reveal / 0.3, 0, 1))} stroke={C.faint} strokeDasharray="3 3" />
          <text x={x(1) - 4} y={y(0) + 26} textAnchor="end" fontSize={10} fill={C.faint}>
            forecast probability
          </text>
          <text x={x(0) + 4} y={y(1) + 12} fontSize={10} fill={C.faint}>
            observed bear rate
          </text>
          <polyline
            points={line.map((p) => `${x(p.f)},${y(p.o)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={1}
            opacity={clamp((reveal - 0.7) / 0.3, 0, 1)}
          />
          {pts.map((p, i) => {
            const r = (3 + 6 * Math.sqrt(p.r / rmax)) * (p.r > 0.5 ? 1 : 0);
            return r > 0 ? (
              <g key={i}>
                <line x1={x(p.f)} x2={x(p.f)} y1={y(p.f)} y2={y(p.o)} stroke={color} strokeOpacity={0.25} />
                <circle cx={x(p.f)} cy={y(p.o)} r={r} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.2} opacity={clamp(reveal / 0.2, 0, 1)} />
              </g>
            ) : null;
          })}
        </svg>
      )}
      {!ready && <div className="absolute inset-0 flex items-center justify-center label">{failed ? 'data unavailable' : 'loading'}</div>}
    </div>
  );
}

function Histogram({ H, reveal, color, nb }: { H: number[]; reveal: number; color: string; nb: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const M = { l: 4, r: 4, t: 18, b: 18 };
  const max = Math.max(0.05, ...H);
  const bw = (w - M.l - M.r) / nb;
  const grow = clamp((reveal - 0.1) / 0.6, 0, 1);
  return (
    <div>
      <div className="label">share of forecasts by probability</div>
      <div ref={ref} className="relative mt-2 h-[120px] w-full">
        {w > 0 && (
          <svg width={w} height={h} className="absolute inset-0 block" role="img" aria-label="Histogram of forecast probabilities">
            <line x1={M.l} x2={w - M.r} y1={h - M.b} y2={h - M.b} stroke={C.line} />
            {H.map((s, i) => {
              const bh = ((h - M.t - M.b) * s * grow) / max;
              return (
                <g key={i}>
                  <rect x={M.l + i * bw + 1} y={h - M.b - bh} width={Math.max(0, bw - 2)} height={bh} fill={color} fillOpacity={0.55} />
                  {s >= 0.005 && (
                    <text x={M.l + (i + 0.5) * bw} y={h - M.b - bh - 4} textAnchor="middle" fontSize={9.5} fill={C.faint} opacity={grow}>
                      {Math.round(100 * s)}
                    </text>
                  )}
                </g>
              );
            })}
            {[0, 0.5, 1].map((t) => (
              <text key={t} x={M.l + t * (w - M.l - M.r)} y={h - 4} textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'} fontSize={10} fill={C.faint}>
                {t}
              </text>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
