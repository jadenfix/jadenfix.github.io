import { useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  C,
  clamp,
  linear,
  niceTicks,
  signed,
  toggleClass,
  useJson,
  usePrefersReducedMotion,
  useReveal,
  useSize,
  useTween,
  useVisibility,
} from './kit';

type Model = {
  key: string;
  label: string;
  bss: number[];
  lo: number[];
  hi: number[];
  pUncond: number[];
  pPersist: (number | null)[];
};
type Variant = { key: string; label: string; bss: Record<string, number[]> };
type SkillData = {
  horizons: number[];
  period: string;
  block: number;
  models: Model[];
  variants: Variant[];
  nChallengers: number;
  nBeatPersist5: number;
};

const URL = '/data/thesis/skill.json';
const STYLE: Record<string, { color: string; dash?: string; width: number }> = {
  persist: { color: C.ice, dash: '4 3', width: 1.4 },
  ms: { color: C.dim, width: 1.2 },
  logit_dy: { color: C.bone, width: 1.3 },
  logit_all: { color: C.phos, width: 1.6 },
};
const SHORT: Record<string, string> = {
  persist: 'persistence',
  ms: 'ms-ar(1)',
  logit_dy: 'logit: dividend yield',
  logit_all: 'logit: all predictors',
};
const M = { l: 38, r: 14, t: 14, b: 28 };

/**
 * Fig. 4: out-of-sample Brier skill against the unconditional bear frequency (the zero line),
 * by horizon, for persistence and three models, with 90% block-bootstrap intervals. The
 * robustness toggle re-draws the same lines under each alternative design.
 */
export default function ForecastSkill() {
  const { data, failed } = useJson<SkillData>(URL);
  const [mode, setMode] = useState<'main' | 'robustness'>('main');
  const [variant, setVariant] = useState<string>('real15');
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const { visible } = useVisibility(boxRef, '0px 0px -10% 0px');
  const size = useSize(boxRef);
  const reduce = usePrefersReducedMotion();
  const reveal = useReveal(visible && !!data && size.w > 0, 1800, reduce);

  const others = data ? data.variants.filter((v) => v.key !== 'main') : [];
  const active = mode === 'main' ? 'main' : variant;
  const current = data?.variants.find((v) => v.key === active) ?? null;
  const keys = useMemo(() => (data ? data.models.map((m) => m.key) : []), [data]);
  const nh = data?.horizons.length ?? 4;

  // One flat vector per variant, tweened when the reader switches.
  const target = useMemo(() => {
    if (!data || !current) return new Array(16).fill(0);
    return keys.flatMap((k) => current.bss[k]);
  }, [data, current, keys]);
  const vals = useTween(target, 750, visible && !reduce);
  const at = (mi: number, hi: number) => vals[mi * nh + hi] ?? 0;

  const domain = useMemo<[number, number]>(() => {
    if (!data) return [-15, 25];
    const all = [
      ...data.models.flatMap((m) => [...m.lo, ...m.hi]),
      ...data.variants.flatMap((v) => Object.values(v.bss).flat()),
      0,
    ];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.06;
    return [lo - pad, hi + pad];
  }, [data]);

  const { w, h } = size;
  const x = (i: number) => (w <= 0 ? 0 : M.l + 18 + ((w - M.l - M.r - 36) * i) / Math.max(1, nh - 1));
  const y = linear(domain[0], domain[1], h - M.b, M.t);
  const ticks = niceTicks(domain[0], domain[1], h > 300 ? 6 : 5);

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    for (let i = 1; i < nh; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  };

  const hi = hover ?? 0;
  const offs = (mi: number) => (mi - (keys.length - 1) / 2) * 5;

  return (
    <section aria-label="Out-of-sample forecast skill by horizon" className="w-full min-w-0 text-bone">
      <div className="label">
        <span className="text-phos">out of sample</span>
        <span className="mx-2 text-faint">·</span>brier skill vs unconditional frequency{data ? `, targets ${data.period.slice(0, 4)} to ${data.period.slice(8, 12)}` : ''}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div role="group" aria-label="View" className="flex flex-wrap gap-2">
          {(['main', 'robustness'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} disabled={!data} onClick={() => setMode(m)} className={toggleClass(mode === m)}>
              <span aria-hidden className="text-faint">[ </span>
              {m === 'main' ? 'main · 90% intervals' : 'robustness'}
              <span aria-hidden className="text-faint"> ]</span>
            </button>
          ))}
        </div>
        {/* variant chips appear only in the robustness view */}
        {mode === 'robustness' && (
          <div role="group" aria-label="Robustness variant" className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <span className="label mr-1">variant</span>
            {others.map((v) => (
              <button
                key={v.key}
                type="button"
                aria-pressed={variant === v.key}
                onClick={() => setVariant(v.key)}
                className={`px-[6px] py-[3px] text-[11px] lowercase transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos ${
                  variant === v.key ? 'text-phos' : 'text-dim hover:text-bone'
                }`}
              >
                {variant === v.key ? `[${v.label}]` : v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* legend doubles as a focus control */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px]">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onPointerEnter={() => setFocus(k)}
            onPointerLeave={() => setFocus(null)}
            onFocus={() => setFocus(k)}
            onBlur={() => setFocus(null)}
            className={`inline-flex items-center gap-2 transition-opacity ${focus && focus !== k ? 'opacity-40' : 'opacity-100'}`}
          >
            <svg width="18" height="6" aria-hidden>
              <line x1="0" x2="18" y1="3" y2="3" stroke={STYLE[k].color} strokeWidth={2} strokeDasharray={STYLE[k].dash} />
            </svg>
            <span className="text-dim">{SHORT[k]}</span>
          </button>
        ))}
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" x2="18" y1="3" y2="3" stroke={C.faint} strokeWidth={1} />
          </svg>
          <span className="text-faint">unconditional = 0</span>
        </span>
      </div>

      <div ref={boxRef} className="relative mt-3 h-[280px] w-full sm:h-[330px]">
        {data && w > 0 && (
          <svg width={w} height={h} className="absolute inset-0 block touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Brier skill by forecast horizon for each model">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth={t === 0 ? 0 : 0.6} strokeDasharray="2 4" />
                <text x={M.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={C.faint}>
                  {signed(t, 0)}%
                </text>
              </g>
            ))}
            <line x1={M.l} x2={w - M.r} y1={y(0)} y2={y(0)} stroke={C.faint} strokeWidth={1} />
            {data.horizons.map((hz, i) => (
              <g key={hz}>
                <line x1={x(i)} x2={x(i)} y1={M.t} y2={h - M.b} stroke={hover === i ? C.faint : 'transparent'} strokeWidth={1} />
                <text x={x(i)} y={h - M.b + 16} textAnchor="middle" fontSize={10.5} fill={hover === i ? C.bone : C.dim}>
                  {hz} mo
                </text>
              </g>
            ))}

            {/* ghost lines: the main estimates while a variant is shown */}
            {mode === 'robustness' &&
              data.models.map((m, mi) => (
                <polyline key={`g-${m.key}`} points={m.bss.map((v, i) => `${x(i) + offs(mi)},${y(v)}`).join(' ')} fill="none" stroke={STYLE[m.key].color} strokeOpacity={0.18} strokeWidth={1} />
              ))}

            {/* bootstrap intervals, main view only */}
            {data.models.map((m, mi) => (
              <g key={`ci-${m.key}`} opacity={mode === 'main' ? clamp((reveal - 0.5) / 0.5, 0, 1) * (focus && focus !== m.key ? 0.25 : 1) : 0} style={{ transition: 'opacity 300ms' }}>
                {m.lo.map((lo, i) => (
                  <line key={i} x1={x(i) + offs(mi)} x2={x(i) + offs(mi)} y1={y(lo)} y2={y(m.hi[i])} stroke={STYLE[m.key].color} strokeOpacity={0.55} strokeWidth={1} />
                ))}
              </g>
            ))}

            {/* lines */}
            {data.models.map((m, mi) => {
              const pts = data.horizons.map((_, i) => `${x(i) + offs(mi)},${y(at(mi, i))}`).join(' ');
              const st = STYLE[m.key];
              const dim = focus && focus !== m.key;
              const k = clamp(reveal * 1.15 - mi * 0.05, 0, 1);
              return (
                <g key={m.key} opacity={dim ? 0.25 : 1} style={{ transition: 'opacity 200ms' }}>
                  <polyline points={pts} fill="none" stroke={st.color} strokeWidth={st.width} pathLength={1} strokeDasharray={st.dash ? undefined : '1 1'} strokeDashoffset={st.dash ? undefined : 1 - k} opacity={st.dash ? k : 1} strokeLinejoin="round" />
                  {data.horizons.map((_, i) => {
                    const on = k >= i / Math.max(1, nh - 1) - 0.001;
                    return <circle key={i} cx={x(i) + offs(mi)} cy={y(at(mi, i))} r={hover === i ? 3.6 : 2.6} fill={C.void} stroke={st.color} strokeWidth={1.3} opacity={on ? 1 : 0} />;
                  })}
                </g>
              );
            })}
          </svg>
        )}
        {!data && <div className="absolute inset-0 flex items-center justify-center label">{failed ? 'data unavailable' : 'loading'}</div>}
      </div>

      {/* readout: fixed rows, so hovering never reflows the page */}
      <div className="mt-4 grid min-h-[92px] grid-cols-1 gap-x-8 gap-y-1 border-t border-line pt-3 text-[11px] sm:grid-cols-2" aria-live="polite">
        <div className="label sm:col-span-2">
          {data ? `${data.horizons[hi]}-month horizon · ${current?.label ?? 'main'}${hover == null ? ' · hover a horizon' : ''}` : ' '}
        </div>
        {data &&
          data.models.map((m, mi) => {
            const v = current?.bss[m.key][hi] ?? at(mi, hi);
            const pp = m.pPersist[hi];
            return (
              <div key={m.key} className="flex items-baseline justify-between gap-3 tabular-nums">
                <span className="text-dim">{SHORT[m.key]}</span>
                <span>
                  <span style={{ color: STYLE[m.key].color }}>{signed(v)}%</span>
                  {mode === 'main' && (
                    <span className="text-faint">
                      {' '}
                      [{signed(m.lo[hi])}, {signed(m.hi[hi])}]{pp != null ? ` · p ${pp.toFixed(2)} vs pers.` : ''}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
      </div>

      <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-faint">
        Skill is the percentage cut in Brier score relative to the unconditional bear frequency, so the zero line is that
        baseline. Every forecast is made in real time with models refit each month.
        {data
          ? ` Whiskers are 90% moving-block bootstrap intervals (${data.block}-month blocks). ${
              data.nBeatPersist5 === 0 ? 'None' : `${data.nBeatPersist5}`
            } of the ${data.nChallengers} model and horizon pairs ${data.nBeatPersist5 === 1 ? 'beats' : data.nBeatPersist5 === 0 ? 'beats' : 'beat'} persistence at the 5% level in the main design.`
          : ''}{' '}
        Robustness variants re-date bear markets at 15% or 25%, date on nominal prices, refit on rolling 30-year windows, or
        score subperiods.
      </p>
    </section>
  );
}
