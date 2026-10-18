import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Beacon } from './data';
import { MODES, advance, newRun, type Mode, type Run } from './evidence';
import { VILLE_THRESHOLD, bernoulliKL, boundCrossing, ktLowerBound } from './math';
import { Readouts, type Readout } from './Readouts';
import { BTN, C, sgn, type PanelApi } from './theme';

const RUN_SECONDS = 12;
const HOLD_MS = 2600;
import { useSize } from './useSize';

interface Props {
  beacon: Beacon;
  verified: [number, number] | null;
  playing: boolean;
  visible: boolean;
  reduce: boolean;
  api: RefObject<PanelApi | null>;
}

export default function EvidencePanel({ beacon, verified, playing, visible, reduce, api }: Props) {
  const [mode, setMode] = useState<Mode>('same');
  const offset = useRef(0);
  const [run, setRun] = useState<Run>(() => {
    const r = newRun('same', 0);
    if (reduce) advance(r, beacon, MODES.same.horizon);
    return r;
  });
  const [, setFrame] = useState(0);

  const fresh = useCallback(
    (m: Mode) => {
      offset.current = (offset.current + MODES[m].horizon) % beacon.bits.length;
      const r = newRun(m, offset.current);
      if (reduce) advance(r, beacon, MODES[m].horizon);
      return r;
    },
    [beacon, reduce],
  );

  useEffect(() => {
    api.current = {
      step: () => {
        advance(run, beacon, Math.max(1, Math.round(MODES[run.mode].horizon / 40)));
        setFrame((f) => f + 1);
      },
      reset: () => setRun(fresh(run.mode)),
    };
    return () => {
      api.current = null;
    };
  }, [api, run, beacon, fresh]);

  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let doneAt: number | null = null;
    let lastPaint = 0;
    const h = MODES[run.mode].horizon;
    const tick = (now: number) => {
      const dt = Math.min(1000, now - last);
      last = now;
      if (run.n < h) {
        carry += (h / (RUN_SECONDS * 1000)) * dt;
        const count = Math.floor(carry);
        carry -= count;
        if (count > 0) advance(run, beacon, count);
      } else {
        doneAt ??= now;
        if (now - doneAt > HOLD_MS) {
          setRun(fresh(run.mode));
          return;
        }
      }
      if (now - lastPaint > 33) {
        lastPaint = now;
        setFrame((f) => (f + 1) % 1e9);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, run, beacon, fresh]);

  const choose = (m: Mode) => {
    setMode(m);
    setRun(fresh(m));
  };

  const spec = MODES[mode];
  const kl = bernoulliKL(spec.q, 0.5);
  const cross = boundCrossing(spec.q);
  const n = run.n;
  const lastBase = n ? run.base[n - 1] : 0;
  const lastSim = n ? run.sim[n - 1] : 0;
  const firstPulse = beacon.pulseOf(run.offset);
  const lastPulse = beacon.pulseOf(run.offset + Math.max(0, n - 1));

  const readouts: Readout[] = [
    {
      k: 'bits observed',
      ks: 'bits',
      v: `${n.toLocaleString('en-US')}`,
      sub: `beacon pulses ${firstPulse.index} to ${lastPulse.index}`,
      color: C.bone,
    },
    { k: 'log bf · beacon', ks: 'beacon', v: sgn(lastBase), sub: 'real bits, base world', color: C.ice },
    { k: 'log bf · simulation', ks: 'sim', v: sgn(lastSim), sub: spec.sim, color: C.phos },
    {
      k: 'kl per bit',
      ks: 'kl/bit',
      v: kl === 0 ? '0' : kl.toFixed(4),
      sub:
        kl === 0
          ? 'p_sim = p_base: no drift'
          : run.crossed
            ? `crossed ln 100 at n = ${run.crossed} (bound ${cross})`
            : `bound reaches ln 100 at n = ${cross}`,
      color: C.bone,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-7 items-center gap-4 text-[12px]" role="group" aria-label="Which simulation is running">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => choose(m)}
            className={`${BTN} ${mode === m ? 'text-phos' : 'text-dim hover:text-bone'}`}
          >
            [ {MODES[m].label} ]
          </button>
        ))}
      </div>

      <div className="mt-2 flex h-[372px] flex-col border border-line bg-void">
        <div className="relative min-h-0 flex-1">
          <EvidenceChart run={run} />
        </div>
        <div className="h-[58px] border-t border-line px-3 py-2"><BitStrips run={run} /></div>
      </div>

      <Readouts items={readouts} />

      <p tabIndex={0} aria-label="What this panel computes" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.line} transparent` }} className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 text-[11px] leading-[1.75] text-faint focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos">
        Two sources stream bits to an observer who computes the Bayes factor of a restricted simulation hypothesis (IID bits with an unknown bias, Beta(1/2, 1/2)
        prior, the Krichevsky-Trofimov marginal) against fair bits. The ice trace runs on real bits: the localRandomValue of NIST Randomness Beacon 2.0 chain 2,
        pulses {beacon.firstPulse} to {beacon.firstPulse + beacon.pulses - 1} ({beacon.firstTime.slice(0, 16).replace('T', ' ')} to{' '}
        {beacon.lastTime.slice(11, 16)} utc), {verified ? `${verified[0]} of ${verified[1]} SHA-512 precommitments re-checked in this browser` : 'precommitments checked in the repo'}. The amber trace
        is the simulation. In [ same law ] it is your browser&apos;s CSPRNG with the same fair law, so P_sim = P_base and the exact Bayes factor between them is 1 on every
        data set (claim ST-T01); this composite test can only wander, drifting down like -(1/2) ln n, and by Ville&apos;s inequality it reaches ln 100 with
        probability at most 1%. In [ biased ] the simulator emits ones with probability 0.60; in [ coarsened ] the same simulator is seen through a channel that flips
        each bit with probability 0.2, which contracts the bias by 1 - 2(0.2) (ST-M14, ST-M83). Dashed: the exact bound E[log BF] &ge; n KL(q || 1/2) - (1/2) ln n - ln 2
        (ST-T271); a single run scatters around its mean. Math ported from simulation-theory src/simtheory/real_data.py and checked against the repo&apos;s numbers. A
        restricted simulator is caught; a faithful one is not, and fair-looking bits say nothing about whether the world is simulated.
      </p>
    </div>
  );
}

function EvidenceChart({ run }: { run: Run }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, h] = useSize(ref, [640, 300]);
  const spec = MODES[run.mode];
  const H = spec.horizon;
  const left = 36;
  const right = 10;
  const top = 12;
  const bottom = 20;
  const pw = Math.max(10, w - left - right);
  const ph = Math.max(10, h - top - bottom);

  const theoryEnd = ktLowerBound(H, spec.q);
  let lo = Math.min(-8, theoryEnd - 2);
  let hi = Math.max(8, theoryEnd * 1.25 + 2);
  for (let i = 0; i < run.n; i++) {
    lo = Math.min(lo, run.base[i] - 1, run.sim[i] - 1);
    hi = Math.max(hi, run.base[i] + 1, run.sim[i] + 1);
  }
  const X = (i: number) => left + (i / H) * pw;
  const Y = (v: number) => top + ((hi - v) / (hi - lo)) * ph;

  const path = (arr: Float64Array) => {
    if (run.n === 0) return '';
    const step = Math.max(1, Math.floor(H / pw / 1.5));
    let d = `M${X(0).toFixed(1)},${Y(0).toFixed(1)}`;
    for (let i = 0; i < run.n; i += step) d += `L${X(i + 1).toFixed(1)},${Y(arr[i]).toFixed(1)}`;
    d += `L${X(run.n).toFixed(1)},${Y(arr[run.n - 1]).toFixed(1)}`;
    return d;
  };

  const theory = useMemo(() => {
    let d = '';
    const pts = 160;
    for (let k = 1; k <= pts; k++) {
      const i = Math.max(1, Math.round((k / pts) * H));
      d += `${k === 1 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(ktLowerBound(i, spec.q)).toFixed(1)}`;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [H, spec.q, pw, ph, lo, hi]);

  const yTicks = niceTicks(lo, hi, 5);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * H));

  return (
    <div ref={ref} className="absolute inset-0">
      <svg width={w} height={h} role="img" aria-label={`Log Bayes factor against bits observed: beacon ${sgn(run.n ? run.base[run.n - 1] : 0)}, simulation ${sgn(run.n ? run.sim[run.n - 1] : 0)} after ${run.n} bits`}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={left} x2={left + pw} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? C.faint : C.line} strokeWidth={1} />
            <text x={left - 6} y={Y(t) + 3} textAnchor="end" fontSize={9} fill={C.faint} className="tabular-nums">
              {t}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={X(t)} y={h - 6} textAnchor={t === 0 ? 'start' : t === H ? 'end' : 'middle'} fontSize={9} fill={C.faint} className="tabular-nums">
            {t === 0 ? 'n = 0' : t.toLocaleString('en-US')}
          </text>
        ))}
        <line x1={left} x2={left + pw} y1={Y(VILLE_THRESHOLD)} y2={Y(VILLE_THRESHOLD)} stroke={C.green} strokeDasharray="2 4" strokeWidth={1} />
        <text x={left + pw - 2} y={Y(VILLE_THRESHOLD) - 4} textAnchor="end" fontSize={9} fill={C.green}>
          ln 100 · ville, α = 0.01
        </text>
        <path d={theory} fill="none" stroke={C.phos} strokeOpacity={0.55} strokeDasharray="5 4" strokeWidth={1} />
        <path d={path(run.base)} fill="none" stroke={C.ice} strokeWidth={1.25} strokeLinejoin="round" />
        <path d={path(run.sim)} fill="none" stroke={C.phos} strokeWidth={1.25} strokeLinejoin="round" />
        {run.crossed && <circle cx={X(run.crossed)} cy={Y(run.sim[run.crossed - 1])} r={3} fill="none" stroke={C.phos} />}
        <text x={left + 6} y={top + 10} fontSize={9} fill={C.dim} className="lowercase tracking-[0.12em]">
          log bayes factor, simulation : base (nats)
        </text>
        <g fontSize={9} className="lowercase">
          {(
            [
              ['nist beacon', C.ice, undefined, 1],
              ['simulation', C.phos, undefined, 1],
              ['bound', C.phos, '4 3', 0.7],
            ] as const
          ).map(([label, color, dash, op], k) => (
            <g key={label} transform={`translate(${left + 6 + k * 92},${top + 21})`}>
              <line x1={0} x2={14} y1={0} y2={0} stroke={color} strokeOpacity={op} strokeDasharray={dash} strokeWidth={1.5} />
              <text x={19} y={3} fill={color} fillOpacity={op}>
                {label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function BitStrips({ run }: { run: Run }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w] = useSize(ref, [600, 40]);
  const labelW = 74;
  const cell = 3;
  const count = Math.max(8, Math.floor((w - labelW) / cell));
  const start = Math.max(0, run.n - count);
  const rows: [string, Uint8Array, string][] = [
    ['beacon', run.baseBits, C.ice],
    ['simulation', run.simBits, C.phos],
  ];
  return (
    <div ref={ref} className="h-full w-full" aria-hidden="true">
      {rows.map(([label, bits, color]) => {
        let d = '';
        for (let i = start; i < run.n; i++) if (bits[i]) d += `M${(i - start) * cell},0h${cell - 1}v14h-${cell - 1}z`;
        return (
          <div key={label} className="flex h-[20px] items-center">
            <span className="w-[74px] shrink-0 text-[9px] lowercase tracking-[0.12em] text-faint">{label}</span>
            <svg width={count * cell} height={14} className="block">
              <rect x={0} y={6.5} width={Math.max(0, (run.n - start) * cell)} height={1} fill={C.line} />
              <path d={d} fill={color} fillOpacity={0.75} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function niceTicks(lo: number, hi: number, target: number): number[] {
  const span = hi - lo;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= target + 1) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}
