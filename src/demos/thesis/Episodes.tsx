import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { C, clamp, lerp, linear, monthName, signed, toggleClass, useJson, usePrefersReducedMotion, useReveal, useSize, useTween, useVisibility, yearOf } from './kit';

type Episode = { peak: string; trough: string; confirmed: string; months: number; decline: number; path: number[] };
type EpisodeData = { start: string; end: string; rule: string; nSince1960: number; episodes: Episode[] };

const URL = '/data/thesis/episodes.json';
const STAGGER = 150;
const DIVE = 750;
const M = { l: 36, r: 10, t: 14, b: 26 };

type Geo = { y0: number; y1: number; maxLen: number; lo: number; hi: number } | null;

function scales(geo: Geo, w: number, h: number) {
  const zero = () => 0;
  if (!geo) return { xT: zero, xA: zero, y: zero };
  return {
    xT: linear(geo.y0, geo.y1, M.l, w - M.r),
    xA: linear(0, geo.maxLen, M.l, w - M.r),
    y: linear(geo.lo, geo.hi, h - M.b, M.t),
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const monthsBetween = (a: string, b: string) => {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
};

/**
 * Fig. 3: every dated bear market in the real S&P 500 since 1871, drawn as a dive from its
 * peak to its trough (and a year of what came after), in sequence. Toggle to stack them from
 * a common peak to compare depth and length directly.
 */
export default function Episodes() {
  const { data, failed } = useJson<EpisodeData>(URL);
  const [mode, setMode] = useState<'timeline' | 'aligned'>('timeline');
  const [sel, setSel] = useState<number | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const { visible } = useVisibility(boxRef, '0px 0px -10% 0px');
  const { w, h } = useSize(boxRef);
  const reduce = usePrefersReducedMotion();
  const n = data?.episodes.length ?? 25;
  const total = (n - 1) * STAGGER + DIVE;
  const reveal = useReveal(visible && !!data && w > 0, total, reduce);
  const [m] = useTween([mode === 'aligned' ? 1 : 0], 900, visible && !reduce);

  const geo = useMemo<Geo>(() => {
    if (!data) return null;
    const y0 = yearOf(data.start);
    const y1 = yearOf(data.end) + 1 / 12;
    const maxLen = Math.max(...data.episodes.map((e) => e.path.length - 1));
    const lo = Math.min(...data.episodes.flatMap((e) => e.path));
    const hi = Math.max(5, ...data.episodes.flatMap((e) => e.path));
    return { y0, y1, maxLen, lo: Math.floor(lo / 10) * 10 - 2, hi };
  }, [data]);

  const plotR = w - M.r;
  const { xT, xA, y } = scales(geo, w, h);

  // Screen coordinates of every point, morphing between the two layouts.
  const shapes = useMemo(() => {
    if (!data || !geo) return [];
    const s = scales(geo, w, h);
    return data.episodes.map((e) => {
      const t0 = yearOf(e.peak);
      return e.path.map((v, k) => [lerp(s.xT(t0 + k / 12), s.xA(k), m), s.y(v)] as [number, number]);
    });
  }, [data, geo, m, w, h]);

  const progress = (i: number) => clamp((reveal * total - i * STAGGER) / DIVE, 0, 1);

  const pick = (px: number, py: number) => {
    let best = -1;
    let bd = Infinity;
    shapes.forEach((pts, i) => {
      if (progress(i) <= 0) return;
      const e = data!.episodes[i];
      pts.forEach(([sx, sy], k) => {
        const d = (sx - px) ** 2 + 0.35 * (sy - py) ** 2 + (k > e.months ? 40 : 0);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
    });
    return bd < 50 ** 2 ? best : null;
  };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSel(pick(e.clientX - r.left, e.clientY - r.top));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!data) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      setSel((s) => (s == null ? (d > 0 ? 0 : n - 1) : (s + d + n) % n));
    } else if (e.key === 'Escape') setSel(null);
  };

  const yearTicks = geo ? (w < 520 ? [1880, 1920, 1960, 2000] : [1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020]) : [];
  const monthTicks = geo ? [0, 12, 24, 36, 48, 60, 72].filter((t) => t <= geo.maxLen) : [];
  const sEp = sel != null && data ? data.episodes[sel] : null;

  return (
    <section aria-label="Dated bear markets in the real S&P 500 since 1871" className="w-full min-w-0 text-bone">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="label">
          <span className="text-phos">{data ? `${data.episodes.length} bear markets` : 'bear markets'}</span>
          <span className="mx-2 text-faint">·</span>real s&amp;p 500, {data ? `${data.start.slice(0, 4)} to ${data.end.slice(0, 4)}` : '1871 to 2026'}
        </div>
        <div role="group" aria-label="Layout" className="flex flex-wrap gap-2">
          {(['timeline', 'aligned'] as const).map((k) => (
            <button key={k} type="button" disabled={!data} aria-pressed={mode === k} onClick={() => setMode(k)} className={toggleClass(mode === k)}>
              <span aria-hidden className="text-faint">[ </span>
              {k === 'timeline' ? 'timeline' : 'aligned at peak'}
              <span aria-hidden className="text-faint"> ]</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={boxRef} className="relative mt-5 h-[260px] w-full sm:h-[320px]">
        {data && geo && w > 0 && (
          <svg
            width={w}
            height={h}
            className="absolute inset-0 block touch-pan-y outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos"
            tabIndex={0}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setSel(null)}
            onKeyDown={onKey}
            role="img"
            aria-label="Drawdown of each bear market from its peak. Use the arrow keys to step through episodes."
          >
            {[0, -20, -40, -60].filter((t) => t >= geo.lo).map((t) => (
              <g key={t}>
                <line x1={M.l} x2={plotR} y1={y(t)} y2={y(t)} stroke={t === -20 ? C.faint : C.line} strokeWidth={t === 0 ? 1 : 0.6} strokeDasharray={t === 0 ? undefined : '2 4'} />
                <text x={M.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={C.faint}>
                  {signed(t, 0)}
                </text>
              </g>
            ))}
            <text x={plotR} y={y(-20) - 4} textAnchor="end" fontSize={10} fill={C.faint}>
              −{data.rule}% rule
            </text>
            <text x={M.l - 6} y={M.t - 2} textAnchor="end" fontSize={10} fill={C.faint}>
              %
            </text>

            {/* x axis: years morph into months since the peak */}
            <g opacity={1 - m}>
              {yearTicks.map((t) => (
                <text key={t} x={xT(t)} y={h - M.b + 16} textAnchor="middle" fontSize={10} fill={C.faint}>
                  {t}
                </text>
              ))}
            </g>
            <g opacity={m}>
              {monthTicks.map((t) => (
                <text key={t} x={xA(t)} y={h - M.b + 16} textAnchor="middle" fontSize={10} fill={C.faint}>
                  {t === 0 ? 'peak' : `+${t} mo`}
                </text>
              ))}
            </g>

            {shapes.map((pts, i) => {
              const e = data.episodes[i];
              const k = progress(i);
              if (k <= 0) return null;
              const shown = Math.max(1, Math.round(k * (pts.length - 1)));
              const dive = pts.slice(0, Math.min(shown, e.months) + 1);
              const after = shown > e.months ? pts.slice(e.months, shown + 1) : [];
              const on = sel === i;
              const dim = sel != null && !on;
              const base = y(0);
              const area = dive.length > 1 ? `M${dive[0][0]},${base}` + dive.map(([a, b]) => `L${a},${b}`).join('') + `L${dive[dive.length - 1][0]},${base}Z` : '';
              const trough = pts[e.months];
              return (
                <g key={e.peak} opacity={dim ? 0.28 : 1} style={{ transition: 'opacity 200ms' }}>
                  {area && <path d={area} fill={on ? C.phos : C.phos} fillOpacity={on ? 0.16 : 0.06 * (1 - m * 0.6)} />}
                  {after.length > 1 && <polyline points={after.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.dim} strokeOpacity={0.6} strokeWidth={1} />}
                  <polyline points={dive.map((p) => p.join(',')).join(' ')} fill="none" stroke={on ? C.phos : C.bone} strokeOpacity={on ? 1 : 0.75} strokeWidth={on ? 1.8 : 1.1} strokeLinejoin="round" />
                  {shown >= e.months && <circle cx={trough[0]} cy={trough[1]} r={on ? 3.4 : 2} fill={on ? C.phos : C.bone} />}
                  {on && (
                    <text x={clamp(trough[0], M.l + 30, plotR - 30)} y={trough[1] + 15} textAnchor="middle" fontSize={10.5} fill={C.phos}>
                      {signed(e.decline)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {!data && <div className="absolute inset-0 flex items-center justify-center label">{failed ? 'data unavailable' : 'loading'}</div>}
      </div>

      {/* readout: fixed height, so hover never reflows the page */}
      <div className="mt-4 min-h-[66px] border-t border-line pt-3 text-[11.5px] leading-relaxed" aria-live="polite">
        {sEp ? (
          <>
            <div className="text-bone">
              <span className="text-phos">{monthName(sEp.peak)}</span> peak <span className="text-faint">→</span>{' '}
              <span className="text-phos">{monthName(sEp.trough)}</span> trough
            </div>
            <div className="text-dim tabular-nums">
              depth {signed(sEp.decline)}% · {sEp.months} months peak to trough · confirmed {monthName(sEp.confirmed)}, {monthsBetween(sEp.peak, sEp.confirmed)} months after the peak
            </div>
          </>
        ) : data ? (
          <>
            <div className="text-bone">
              median depth {signed(median(data.episodes.map((e) => e.decline)))}% · median length {median(data.episodes.map((e) => e.months))} months
            </div>
            <div className="text-dim">
              Hover or tap a dive, or focus the chart and use the arrow keys. A bear market only becomes knowable once the fall
              reaches {data.rule}%, a median {median(data.episodes.map((e) => monthsBetween(e.peak, e.confirmed)))} months after the peak.
            </div>
          </>
        ) : (
          ' '
        )}
      </div>

      <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-faint">
        Real price relative to each peak, monthly averages. A bear market starts when the index falls {data?.rule ?? 20}% below a
        peak (dated from the month after the peak) and ends at the trough once the index has risen {data?.rule ?? 20}% from it.
        The thin tail after each trough shows the following year, or the climb back to the old peak if that came sooner.
        {data ? ` ${data.nSince1960} of the ${data.episodes.length} fall inside the 1960 to ${data.end.slice(0, 4)} window that the forecasts are scored on.` : ''}
      </p>
    </section>
  );
}
