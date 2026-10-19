import { useEffect, useMemo, useRef, useState } from 'react';
import type { Delft } from '../demos/simulation/data';
import { reducedMotion } from '../motion';
import { useSize } from '../demos/simulation/useSize';
import { useEntered } from '../scroll';
import { betPath, win } from './stats';

// Delft 2015, one trial at a time. Each trial either wins the CHSH game or
// doesn't; a local (classical) world wins at most 3/4 of the time. The amber
// line is a preregistered bettor against that 3/4; the pale line is the most
// any constant-bet mixture could have made, in hindsight. The bar is 20.

const PAD = { l: 44, r: 16, t: 16, b: 30 };
const LMIN = Math.log(0.16);
const LMAX = Math.log(40);

export default function BellAnytime({ delft }: { delft: Delft }) {
  const wins = useMemo(() => delft.trials.map((t) => win(t.a, t.b, t.x, t.y)), [delft]);
  const path = useMemo(() => betPath(wins, 0.75), [wins]);
  const N = wins.length;
  const ref = useRef<HTMLDivElement>(null);
  const at = useEntered(ref);
  // drawn at the real width, so the labels stay legible on a phone
  const [cw] = useSize(ref, [760, 0]);
  const W = Math.max(300, cw);
  const narrow = W < 520;
  const H = narrow ? 240 : 300;

  const [n, setN] = useState(() => (reducedMotion() ? N : 0));
  const [playing, setPlaying] = useState(false);

  // play once when it scrolls into view
  useEffect(() => {
    if (at === null || reducedMotion()) return;
    const id = window.setTimeout(() => setPlaying(true), at * 1000 + 400);
    return () => window.clearTimeout(id);
  }, [at]);
  const nRef = useRef(n);
  useEffect(() => {
    nRef.current = n;
  });
  useEffect(() => {
    if (!playing) return;
    let k = nRef.current >= N ? 0 : nRef.current;
    const id = window.setInterval(() => {
      k += 1;
      setN(Math.min(N, k));
      if (k >= N) {
        window.clearInterval(id);
        setPlaying(false);
      }
    }, 34);
    return () => window.clearInterval(id);
  }, [playing, N]);

  const x = (k: number) => PAD.l + (k / N) * (W - PAD.l - PAD.r);
  const y = (e: number) => PAD.t + (1 - (Math.log(Math.max(0.16, e)) - LMIN) / (LMAX - LMIN)) * (H - PAD.t - PAD.b);
  const shown = path.slice(0, n + 1);
  const mix = shown.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.mix).toFixed(1)}`).join('');
  const ceil = shown.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.ceil).toFixed(1)}`).join('');
  const cur = path[n];
  const peak = shown.reduce((m, p) => (p.ceil > m.ceil ? p : m), path[0]);

  return (
    <div ref={ref} className="font-mono">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Anytime-valid e-processes on the Delft 2015 Bell trials">
        {[0.2, 0.5, 1, 2, 5, 10, 20].map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 20 ? 'rgb(var(--c-phos) / 0.55)' : 'rgb(var(--c-line))'} strokeWidth={t === 1 ? 1 : 0.6} strokeDasharray={t === 20 ? '2 4' : undefined} />
            <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={t === 20 ? 'rgb(var(--c-phos) / 0.85)' : 'rgb(var(--c-faint))'}>
              {t}
            </text>
          </g>
        ))}
        <text x={PAD.l + 6} y={y(20) - 6} fontSize="10" fill="rgb(var(--c-phos) / 0.85)">
          the bar: 1/α = 20
        </text>
        {/* the fixed-n p-value, for scale only */}
        <g opacity={n >= N ? 1 : 0} style={{ transition: 'opacity 0.8s' }}>
          <text x={x(N)} y={y(25.5) + 4} textAnchor="middle" fontSize="12" fill="rgb(var(--c-dim))">
            ×
          </text>
          {/* on a phone the note sits above the mark, clear of the bar's label */}
          <text x={x(N) - (narrow ? 0 : 10)} y={narrow ? y(25.5) - 10 : y(25.5) + 4} textAnchor="end" fontSize="10" fill="rgb(var(--c-dim))">
            {narrow ? '1/p = 25.5 at a fixed n' : '1/p = 25.5, if n were fixed in advance'}
          </text>
        </g>
        <path d={ceil} fill="none" stroke="rgb(var(--c-ice) / 0.7)" strokeWidth={1} strokeDasharray="3 3" />
        <path d={mix} fill="none" stroke="rgb(var(--c-phos))" strokeWidth={1.5} />
        {peak.n > 0 && (
          <g>
            <circle cx={x(peak.n)} cy={y(peak.ceil)} r={2.5} fill="rgb(var(--c-ice))" />
            <text
              x={x(peak.n) + (x(peak.n) < W / 2 ? 6 : -6)}
              y={y(peak.ceil) - 8}
              textAnchor={x(peak.n) < W / 2 ? 'start' : 'end'}
              fontSize="10"
              fill="rgb(var(--c-ice))"
            >
              best possible so far {peak.ceil.toFixed(2)}
            </text>
          </g>
        )}
        {[0, 50, 100, 150, 200, 245].map((k) => (
          <text key={k} x={x(k)} y={H - 10} textAnchor={k === 0 ? 'start' : k === N ? 'end' : 'middle'} fontSize="10" fill="rgb(var(--c-faint))">
            {k ? k : narrow ? '0' : '0 trials'}
          </text>
        ))}
      </svg>

      {/* the trials themselves, as they arrive */}
      <div aria-hidden className="mt-3 flex flex-wrap gap-[3px] pl-[5.8%] pr-[2.1%]">
        {wins.map((w, i) => (
          <span
            key={i}
            className="h-[6px] w-[6px] rounded-full transition-opacity duration-300"
            style={{ background: w ? 'rgb(var(--c-phos))' : 'rgb(var(--c-faint))', opacity: i < n ? (w ? 0.9 : 0.6) : 0.08 }}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 text-[12px]">
        <div className="flex items-baseline gap-5">
          <button type="button" onClick={() => setPlaying((p) => !p)} className="text-bone transition-colors hover:text-phos">
            [ {playing ? 'pause' : n >= N ? 'replay' : 'play'} ]
          </button>
          <input type="range" min={0} max={N} value={n} onChange={(e) => (setPlaying(false), setN(Number(e.target.value)))} className="w-[160px] accent-[rgb(var(--c-phos))] sm:w-[220px]" aria-label="Trial" />
        </div>
        <div className="grid grid-cols-4 gap-5 sm:text-right">
          <span className="text-faint">
            trial<span className="block tabular-nums text-bone">{cur.n}</span>
          </span>
          <span className="text-faint">
            wins<span className="block tabular-nums text-bone">{cur.n ? `${((cur.k / cur.n) * 100).toFixed(1)}%` : '…'}</span>
          </span>
          <span className="text-faint">
            bettor<span className="block tabular-nums text-phos">{cur.mix.toFixed(2)}</span>
          </span>
          <span className="text-faint">
            ceiling<span className="block tabular-nums text-ice">{cur.ceil.toFixed(2)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
