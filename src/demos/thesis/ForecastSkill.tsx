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
  pPersist: (number | null)[];
};
type ModelSet = { key: string; label: string; models: string[] };
type Variant = { key: string; label: string; bss: Record<string, number[]> };
type HorizonTest = { h: number; spa: number; rc: number; mcsPersist: number; persistIn: boolean; nIn: number; nModels: number };
type SkillData = {
  horizons: number[];
  period: string;
  block: number;
  reps: number;
  lags: number;
  sets: ModelSet[];
  models: Model[];
  variants: Variant[];
  inference: {
    byHorizon: HorizonTest[];
    joint: { n: number; spa: number; rc: number };
    nTests: number;
    nSigConventional: number;
    nSigLong: number;
  };
  nChallengers: number;
};
type View = 'core' | 'modern' | 'robustness';

const URL = '/data/thesis/skill.json';
const STYLE: Record<string, { color: string; dash?: string; width: number }> = {
  persist: { color: C.ice, dash: '4 3', width: 1.4 },
  ms: { color: C.dim, width: 1.2 },
  logit_dy: { color: C.bone, width: 1.3 },
  logit_all: { color: C.phos, width: 1.6 },
  tvtp: { color: C.dim, width: 1.2 },
  enet_rich: { color: C.bone, width: 1.3 },
  gbt_rich: { color: C.red, width: 1.4 },
  dma_all: { color: C.phos, width: 1.6 },
};
const SHORT: Record<string, string> = {
  persist: 'persistence',
  ms: 'ms-ar(1)',
  logit_dy: 'logit: dividend yield',
  logit_all: 'logit: 6 predictors',
  tvtp: 'tvtp ms-ar(1)',
  enet_rich: 'elastic net, rich set',
  gbt_rich: 'gradient boosting, rich set',
  dma_all: 'dma: all models',
};
const VIEWS: { key: View; label: string }[] = [
  { key: 'core', label: 'core · 90% intervals' },
  { key: 'modern', label: 'new methods' },
  { key: 'robustness', label: 'robustness' },
];
const M = { l: 38, r: 14, t: 14, b: 28 };

const fmtP = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3));

/**
 * Fig. 4: out-of-sample Brier skill against the unconditional bear frequency (the zero line),
 * by horizon, with 90% block-bootstrap intervals. Two model sets (the core models and the
 * newer methods: time-varying transitions, elastic net, gradient boosting, dynamic model
 * averaging) and a robustness view that re-draws the core models under each alternative
 * design. Below, the formal tests against persistence.
 */
export default function ForecastSkill() {
  const { data, failed } = useJson<SkillData>(URL);
  const [view, setView] = useState<View>('core');
  const [variant, setVariant] = useState<string>('real15');
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const { visible } = useVisibility(boxRef, '0px 0px -10% 0px');
  const size = useSize(boxRef);
  const reduce = usePrefersReducedMotion();
  const reveal = useReveal(visible && !!data && size.w > 0, 1800, reduce);
  const animate = visible && !reduce;

  const others = data ? data.variants.filter((v) => v.key !== 'main') : [];
  const active = view === 'robustness' ? variant : 'main';
  const current = data?.variants.find((v) => v.key === active) ?? null;
  const nh = data?.horizons.length ?? 4;
  const all = useMemo(() => data?.models ?? [], [data]);
  const shownKeys = useMemo(() => {
    if (!data) return [];
    const set = data.sets.find((s) => s.key === (view === 'modern' ? 'modern' : 'core'));
    return set ? set.models : [];
  }, [data, view]);
  const shown = all.filter((m) => shownKeys.includes(m.key));

  // Each view (and each robustness variant) gets its own y range so small differences stay readable.
  const domain = useMemo<[number, number]>(() => {
    if (!data) return [-15, 30];
    const vals: number[] = [0];
    for (const m of all) {
      if (!shownKeys.includes(m.key)) continue;
      if (view === 'robustness') vals.push(...m.bss, ...(current?.bss[m.key] ?? []));
      else vals.push(...m.lo, ...m.hi);
    }
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * 0.06;
    return [lo - pad, hi + pad];
  }, [data, all, shownKeys, view, current]);

  // One flat vector tweened on every switch: values, visibility and x offset per model, then the y range.
  const target = useMemo(() => {
    const nm = all.length;
    const v: number[] = [];
    for (const m of all) for (let i = 0; i < nh; i++) v.push(current?.bss[m.key]?.[i] ?? m.bss[i]);
    for (const m of all) v.push(shownKeys.includes(m.key) ? 1 : 0);
    for (const m of all) {
      const j = shownKeys.indexOf(m.key);
      v.push(j < 0 ? 0 : (j - (shownKeys.length - 1) / 2) * 5);
    }
    v.push(domain[0], domain[1]);
    return nm ? v : [0, 0];
  }, [all, current, shownKeys, domain, nh]);
  const tw = useTween(target, 750, animate);
  const nm = all.length;
  const at = (mi: number, hi: number) => tw[mi * nh + hi] ?? 0;
  const alpha = (mi: number) => tw[nm * nh + mi] ?? 0;
  const offs = (mi: number) => tw[nm * nh + nm + mi] ?? 0;
  const dlo = tw[nm * nh + 2 * nm] ?? domain[0];
  const dhi = tw[nm * nh + 2 * nm + 1] ?? domain[1];

  const { w, h } = size;
  const x = (i: number) => (w <= 0 ? 0 : M.l + 22 + ((w - M.l - M.r - 44) * i) / Math.max(1, nh - 1));
  const y = linear(dlo, dhi, h - M.b, M.t);
  const ticks = niceTicks(dlo, dhi, h > 300 ? 6 : 5);

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    for (let i = 1; i < nh; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  };

  const hi = hover ?? 0;
  const robust = view === 'robustness';

  return (
    <section aria-label="Out-of-sample forecast skill by horizon" className="w-full min-w-0 text-bone">
      <div className="label">
        <span className="text-phos">out of sample</span>
        <span className="mx-2 text-faint">·</span>brier skill vs unconditional frequency{data ? `, targets ${data.period.slice(0, 4)} to ${data.period.slice(8, 12)}` : ''}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div role="group" aria-label="View" className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button key={v.key} type="button" aria-pressed={view === v.key} disabled={!data} onClick={() => setView(v.key)} className={toggleClass(view === v.key)}>
              <span aria-hidden className="text-faint">[ </span>
              {v.label}
              <span aria-hidden className="text-faint"> ]</span>
            </button>
          ))}
        </div>
        {/* variant chips appear only in the robustness view */}
        {robust && (
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
      <div className="mt-3 flex min-h-[62px] flex-wrap content-start sm:min-h-[38px] gap-x-5 gap-y-2 text-[11px]">
        {shown.map((m) => (
          <button
            key={m.key}
            type="button"
            onPointerEnter={(e) => e.pointerType === 'mouse' && setFocus(m.key)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setFocus(null)}
            onFocus={() => setFocus(m.key)}
            onBlur={() => setFocus(null)}
            className={`inline-flex items-center gap-2 transition-opacity ${focus && focus !== m.key ? 'opacity-40' : 'opacity-100'}`}
          >
            <svg width="18" height="6" aria-hidden>
              <line x1="0" x2="18" y1="3" y2="3" stroke={STYLE[m.key].color} strokeWidth={2} strokeDasharray={STYLE[m.key].dash} />
            </svg>
            <span className="text-dim">{SHORT[m.key]}</span>
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
          <svg width={w} height={h} className="absolute inset-0 block touch-pan-y" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)} role="img" aria-label="Brier skill by forecast horizon for each model">
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
            {robust &&
              all.map((m, mi) =>
                shownKeys.includes(m.key) ? (
                  <polyline key={`g-${m.key}`} points={m.bss.map((v, i) => `${x(i) + offs(mi)},${y(v)}`).join(' ')} fill="none" stroke={STYLE[m.key].color} strokeOpacity={0.18} strokeWidth={1} />
                ) : null,
              )}

            {/* bootstrap intervals, outside the robustness view */}
            {all.map((m, mi) => (
              <g key={`ci-${m.key}`} opacity={robust ? 0 : clamp((reveal - 0.5) / 0.5, 0, 1) * alpha(mi) * (focus && focus !== m.key ? 0.25 : 1)} style={{ transition: 'opacity 300ms' }}>
                {m.lo.map((lo, i) => (
                  <line key={i} x1={x(i) + offs(mi)} x2={x(i) + offs(mi)} y1={y(lo)} y2={y(m.hi[i])} stroke={STYLE[m.key].color} strokeOpacity={0.55} strokeWidth={1} />
                ))}
              </g>
            ))}

            {/* lines */}
            {all.map((m, mi) => {
              const a = alpha(mi);
              if (a < 0.01) return null;
              const pts = data.horizons.map((_, i) => `${x(i) + offs(mi)},${y(at(mi, i))}`).join(' ');
              const st = STYLE[m.key];
              const dim = focus && focus !== m.key;
              const k = clamp(reveal * 1.15 - shownKeys.indexOf(m.key) * 0.05, 0, 1);
              return (
                <g key={m.key} opacity={(dim ? 0.25 : 1) * a} style={{ transition: 'opacity 200ms' }}>
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
      <div className="mt-4 grid min-h-[118px] grid-cols-1 content-start gap-x-8 gap-y-1 border-t border-line pt-3 text-[11px] sm:min-h-[80px] sm:grid-cols-2" aria-live="polite">
        <div className="label sm:col-span-2">
          {data ? `${data.horizons[hi]}-month horizon · ${current?.label ?? 'main'}${hover == null ? ' · hover a horizon' : ''}` : ' '}
        </div>
        {data &&
          shown.map((m) => {
            const v = current?.bss[m.key]?.[hi] ?? m.bss[hi];
            const pp = m.pPersist[hi];
            return (
              <div key={m.key} className="flex items-baseline justify-between gap-3 tabular-nums">
                <span className="text-dim sm:truncate">{SHORT[m.key]}</span>
                <span className="shrink-0">
                  <span style={{ color: STYLE[m.key].color }}>{signed(v)}%</span>
                  {!robust && (
                    <span className="text-faint">
                      {' '}
                      [{signed(m.lo[hi])}, {signed(m.hi[hi])}]{pp != null ? ` · p ${fmtP(pp)}` : ''}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
      </div>

      {data && <Inference data={data} />}

      <p className="mt-6 border-t border-line pt-4 text-[11px] leading-relaxed text-faint">
        Skill is the percentage cut in Brier score relative to the unconditional bear frequency, so the zero line is that
        baseline. Every forecast is made in real time: the logits are refit every month, the regime and machine-learning
        models every January. The rich set adds five more predictors and the real-time bear state; dma is dynamic model
        averaging.
        {data
          ? ` Whiskers are 90% moving-block bootstrap intervals (${data.block}-month blocks, ${data.reps.toLocaleString('en-US')} draws). The p after each interval is a one-sided Diebold-Mariano test against persistence with ${data.lags} lags. With the textbook window ${data.inference.nSigConventional} of the ${data.inference.nTests} model and horizon comparisons look significant at 5%; with ${data.lags} lags, ${data.inference.nSigLong === 1 ? 'one does' : `${data.inference.nSigLong} do`}.`
          : ''}{' '}
        Robustness variants re-date bear markets at 15% or 25%, date on nominal prices, refit on rolling 30-year windows, or
        score subperiods; the thesis re-runs the core models under each.
      </p>
    </section>
  );
}

/** SPA / Reality Check p-values and model confidence set membership of persistence, by horizon. */
function Inference({ data }: { data: SkillData }) {
  const inf = data.inference;
  const always = inf.byHorizon.every((t) => t.persistIn);
  const minP = Math.min(...inf.byHorizon.map((t) => t.spa), inf.joint.spa);
  return (
    <div className="mt-5 border-t border-line pt-3">
      <div className="label">formal tests · does any of the {data.nChallengers} models beat persistence?</div>
      <table className="mt-3 w-full max-w-[520px] text-left text-[11px] tabular-nums">
        <thead>
          <tr className="whitespace-nowrap text-[10px] lowercase tracking-[0.08em] text-faint">
            <th scope="col" className="pb-1 font-normal">horizon</th>
            <th scope="col" className="pb-1 text-right font-normal">spa p</th>
            <th scope="col" className="pb-1 text-right font-normal">
              <abbr title="White's Reality Check" className="no-underline sm:hidden">rc p</abbr>
              <span className="hidden sm:inline">reality check p</span>
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              <span className="hidden sm:inline">persistence </span>in mcs
            </th>
          </tr>
        </thead>
        <tbody>
          {inf.byHorizon.map((t) => (
            <tr key={t.h}>
              <th scope="row" className="py-[2px] font-normal text-dim">{t.h} mo</th>
              <td className="py-[2px] text-right text-bone">{fmtP(t.spa)}</td>
              <td className="py-[2px] text-right text-dim">{fmtP(t.rc)}</td>
              <td className="py-[2px] text-right text-ice/80">{t.persistIn ? `yes · p ${fmtP(t.mcsPersist)}` : `no · p ${fmtP(t.mcsPersist)}`}</td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="pt-[3px] font-normal text-dim">all, {inf.joint.n} pairs</th>
            <td className="pt-[3px] text-right text-bone">{fmtP(inf.joint.spa)}</td>
            <td className="pt-[3px] text-right text-dim">{fmtP(inf.joint.rc)}</td>
            <td className="pt-[3px] text-right text-faint">·</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 max-w-[620px] text-[12px] leading-relaxed text-dim">
        Hansen&apos;s SPA test and White&apos;s Reality Check ask whether the best of all the models beats persistence once
        you account for having tried so many. The smallest p is {fmtP(minP)}, so neither test can say any model does
        {always ? ', and persistence is never dropped from the 90% model confidence set' : ''}.
      </p>
    </div>
  );
}
