import { useMemo, useRef, useState } from 'react';
import type { Beacon } from '../demos/simulation/data';
import { useSize } from '../demos/simulation/useSize';
import { useEntered } from '../scroll';
import { ktPath, lean } from './stats';

// The KT log Bayes factor for "biased source" over all 131,072 beacon bits,
// inside the pathwise sandwich it can never leave. A slider passes the same
// bits through a renderer that leans toward 1.

const PAD = { l: 44, r: 16, t: 16, b: 30 };
const THRESH = Math.log(100); // reject fair bits at alpha = 0.01
const FRONTIER = 0.0087; // fixed-n KT test, alpha 0.01, power 0.95

export default function BeaconEvidence({ beacon }: { beacon: Beacon }) {
  const [delta, setDelta] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const at = useEntered(ref);
  // drawn at the real width, so the labels stay legible on a phone
  const [cw] = useSize(ref, [760, 0]);
  const W = Math.max(300, cw);
  const narrow = W < 520;
  const H = narrow ? 240 : 300;

  const { path, ones } = useMemo(() => {
    const bits = lean(beacon.bits, delta);
    let k = 0;
    for (let i = 0; i < bits.length; i++) k += bits[i];
    return { path: ktPath(bits, 500), ones: k };
  }, [beacon, delta]);
  const last = path[path.length - 1];
  const N = beacon.bits.length;

  const lo = Math.min(-8, ...path.map((p) => p.lo));
  const hi = Math.max(8, ...path.map((p) => p.hi));
  const x = (n: number) => PAD.l + (n / N) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = path.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.lbf).toFixed(1)}`).join('');
  const band =
    path.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.hi).toFixed(1)}`).join('') +
    [...path].reverse().map((p) => `L${x(p.n).toFixed(1)},${y(p.lo).toFixed(1)}`).join('') +
    'Z';
  const ticks = niceTicks(lo, hi);
  const caught = last.lbf >= THRESH;

  return (
    <div ref={ref} className="font-mono">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Running log Bayes factor on the NIST beacon bits">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--c-line))" strokeWidth={t === 0 ? 1 : 0.6} />
            <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="rgb(var(--c-faint))">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(THRESH)} y2={y(THRESH)} stroke="rgb(var(--c-phos) / 0.5)" strokeDasharray="2 4" />
        <text x={PAD.l + 6} y={y(THRESH) - 5} fontSize="10" fill="rgb(var(--c-phos) / 0.8)">
          reject fair, α = 0.01
        </text>
        <path d={band} fill="rgb(var(--c-ice) / 0.16)" stroke="rgb(var(--c-ice) / 0.35)" strokeWidth={0.6} />
        <path
          d={line}
          fill="none"
          stroke="rgb(var(--c-phos))"
          strokeWidth={1.5}
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: at === null ? 1 : 0, transition: 'stroke-dashoffset 2.8s cubic-bezier(0.65,0,0.35,1)' }}
        />
        {[0, 32768, 65536, 98304, 131072].map((n) => (
          <text key={n} x={x(n)} y={H - 10} textAnchor={n === 0 ? 'start' : n === N ? 'end' : 'middle'} fontSize="10" fill="rgb(var(--c-faint))">
            {n ? `${n / 1024}k` : '0 bits'}
          </text>
        ))}
      </svg>

      <div className="mt-5 grid gap-x-8 gap-y-4 text-[12px] sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="flex items-baseline justify-between">
            <span className="text-faint">
              renderer lean δ <span className="text-dim">(q = ½ + δ)</span>
            </span>
            <span className="tabular-nums text-bone">{delta === 0 ? 'none, raw beacon' : delta.toFixed(4)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={0.02}
            step={0.0005}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="mt-2 w-full accent-[rgb(var(--c-phos))]"
            aria-label="Renderer bias"
          />
          <span className="relative mt-1 block h-3 text-[10px] text-faint">
            <span className="absolute -translate-x-1/2" style={{ left: `${(FRONTIER / 0.02) * 100}%` }}>
              ↑ 0.0087
            </span>
          </span>
        </label>
        <div className="grid grid-cols-3 gap-5 sm:text-right">
          <span className="text-faint">
            ones
            <span className="block tabular-nums text-bone">{(ones / N).toFixed(4)}</span>
          </span>
          <span className="text-faint">
            ln BF
            <span className={`block tabular-nums ${caught ? 'text-phos' : 'text-bone'}`}>{last.lbf.toFixed(2)}</span>
          </span>
          <span className="text-faint">
            verdict
            <span className={`block ${caught ? 'text-phos' : 'text-bone'}`}>{caught ? 'caught' : 'looks fair'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo;
  const step = span > 80 ? 20 : span > 40 ? 10 : 4;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(t);
  return out;
}
