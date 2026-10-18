import { useRef, useState } from 'react';
import { useSize } from '../demos/simulation/useSize';
import { gridSValues } from './stats';

// A renderer that stores its outcome probabilities as fractions with
// denominator D can only produce certain CHSH values while still looking like
// ordinary noisy physics. Pick the precision; the ticks are the values it can
// reach. The band is what Delft measured.

const H = 150;
const PAD = { l: 20, r: 20 };
const S_MAX = 3;
const TSIRELSON = 2 * Math.SQRT2;
const DELFT = { s: 2.42, e: 0.2 };
const BITS = [2, 3, 4, 5, 6, 7];

export default function PrecisionLine() {
  const [bits, setBits] = useState(5);
  const ref = useRef<HTMLDivElement>(null);
  const [cw] = useSize(ref, [760, 0]);
  const W = Math.max(300, cw);
  const narrow = W < 520;
  const D = 2 ** bits;
  const vals = gridSValues(D);
  const inside = vals.filter((s) => Math.abs(s - DELFT.s) <= DELFT.e);
  const x = (s: number) => PAD.l + (s / S_MAX) * (W - PAD.l - PAD.r);
  const base = 92;

  return (
    <div ref={ref} className="font-mono">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]" role="radiogroup" aria-label="Renderer precision">
        <span className="text-faint">precision</span>
        {BITS.map((b) => (
          <button key={b} type="button" role="radio" aria-checked={b === bits} onClick={() => setBits(b)} className={`transition-colors ${b === bits ? 'text-phos' : 'text-dim hover:text-bone'}`}>
            [ {b} bit{b > 1 ? 's' : ''} ]
          </button>
        ))}
        <span className="ml-auto text-faint">
          D = <span className="tabular-nums text-bone">{D}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`CHSH values reachable at ${bits} bits of precision`}>
        {/* classical region and the quantum gap */}
        <rect x={x(0)} y={base - 2} width={x(2) - x(0)} height={4} fill="rgb(var(--c-line))" />
        <rect x={x(2)} y={base - 2} width={x(TSIRELSON) - x(2)} height={4} fill="rgb(var(--c-ice) / 0.25)" />
        <rect x={x(DELFT.s - DELFT.e)} y={base - 34} width={x(DELFT.s + DELFT.e) - x(DELFT.s - DELFT.e)} height={52} fill="rgb(var(--c-phos) / 0.09)" stroke="rgb(var(--c-phos) / 0.35)" strokeWidth={0.6} />
        <text x={x(DELFT.s)} y={base - 40} textAnchor="middle" fontSize="10" fill="rgb(var(--c-phos) / 0.9)">
          {narrow ? 'Delft' : 'Delft 2015: S = 2.42 ± 0.20'}
        </text>
        {[
          [2, narrow ? 'local 2' : 'classical limit 2'],
          [TSIRELSON, narrow ? '2√2' : 'quantum limit 2√2'],
        ].map(([s, label]) => (
          <g key={label as string}>
            <line x1={x(s as number)} x2={x(s as number)} y1={base - 10} y2={base + 26} stroke="rgb(var(--c-dim))" strokeWidth={0.8} />
            <text x={x(s as number)} y={base + 40} textAnchor="middle" fontSize="10" fill="rgb(var(--c-dim))">
              {label}
            </text>
          </g>
        ))}
        <text x={x(0)} y={base + 40} fontSize="10" fill="rgb(var(--c-faint))">
          S = 0
        </text>
        {vals.map((s) => {
          const hit = Math.abs(s - DELFT.s) <= DELFT.e;
          return (
            <g key={`${D}-${s}`} style={{ animation: 'tick-in 0.5s var(--ease-out) both', animationDelay: `${s * 0.12}s` }}>
              <line x1={x(s)} x2={x(s)} y1={base - 16} y2={base + 16} stroke={hit ? 'rgb(var(--c-phos))' : 'rgb(var(--c-bone) / 0.6)'} strokeWidth={hit ? 2 : 1} />
              {hit && <circle cx={x(s)} cy={base - 22} r={3} fill="rgb(var(--c-phos))" />}
            </g>
          );
        })}
      </svg>
      <p className="mt-3 min-h-[3.6em] text-[12px] leading-[1.8] text-dim">
        {inside.length ? (
          <>
            At {bits} bits the renderer can sit at S = <span className="text-phos">{inside.map(fmt).join(', ')}</span>, inside Delft’s interval. Measured on CHSH settings it is
            indistinguishable from real physics with unknown visibility, for any number of trials.
          </>
        ) : (
          <>
            At {bits} bit{bits > 1 ? 's' : ''}, none of the values it can reach lands in Delft’s interval, so this renderer would already look wrong.
          </>
        )}
      </p>
    </div>
  );
}

// 2.5, 2.25, 2.375: exact, since every value is a multiple of 1/8 here
const fmt = (s: number) => String(Number(s.toFixed(4)));
