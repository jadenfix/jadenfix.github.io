import { useRef } from 'react';
import { useSize } from '../mm/useWidth';
import { FILL, type Part } from './trace';

const RECENT = 6; // the newest tokens read a little brighter

/** generated text so far: older tokens faint, the newest ones dim, like a cursor's wake */
export function Stream({ tok, n, recent = 'text-dim', old = 'text-faint' }: { tok: string[]; n: number; recent?: string; old?: string }) {
  const cut = Math.max(0, n - RECENT);
  return (
    <>
      <span className={old}>{tok.slice(0, cut).join('')}</span>
      <span className={recent}>{tok.slice(cut, n).join('')}</span>
    </>
  );
}

/** the attended context as one bar, scaled to max_seq_len */
export function ContextBar({ parts, peak, max }: { parts: Part[]; peak: number; max: number }) {
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((a, q) => a + q.len, 0));
  return (
    <div className="relative h-[10px] w-full bg-[#171715]" aria-hidden>
      {parts.map((p, i) => (
        <span
          key={i}
          className="absolute inset-y-0"
          style={{
            left: `${(starts[i] / max) * 100}%`,
            width: `${(p.len / max) * 100}%`,
            background: FILL[p.kind],
            opacity: p.kind === 'segment' || p.kind === 'cot' ? 0.7 : 0.95,
            boxShadow: i ? 'inset 1px 0 0 #0b0b0a' : undefined,
          }}
        />
      ))}
      <span className="absolute -bottom-[3px] -top-[3px] w-px bg-bone/70" style={{ left: `${Math.min(100, (peak / max) * 100)}%` }} />
      <span className="absolute -bottom-[3px] -top-[3px] right-0 w-px bg-[#ec5c52]/70" />
    </div>
  );
}

/** context length against tokens generated: vanilla ramps, InftyThink saws */
export function SawChart({
  cot,
  infty,
  n,
  maxSeq,
  peak,
}: {
  cot: [number, number][];
  infty: [number, number][];
  n: number;
  maxSeq: number;
  peak: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, h] = useSize(box, [600, 150]);
  const padL = 34;
  const padB = 16;
  const top = maxSeq * 1.08;
  const x = (v: number) => padL + (v / Math.max(1, n)) * (w - padL - 8);
  const y = (v: number) => 6 + (1 - v / top) * (h - padB - 6);
  const path = (pts: [number, number][]) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${x(a).toFixed(1)} ${y(b).toFixed(1)}`).join(' ');
  const c = cot[cot.length - 1];
  const f = infty[infty.length - 1];
  const ticks = [0, 256, 512, 768, 1024].filter((v) => v <= maxSeq);
  return (
    <div ref={box} className="relative h-full w-full">
      <svg width={w} height={h} className="absolute left-0 top-0" aria-hidden>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={w - 8} y1={y(v)} y2={y(v)} stroke={v === maxSeq ? '#ec5c52' : '#252421'} strokeOpacity={v === maxSeq ? 0.55 : 1} strokeDasharray={v === maxSeq ? '3 3' : '1 3'} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#58554e">
              {v}
            </text>
          </g>
        ))}
        <text x={w - 10} y={y(maxSeq) - 4} textAnchor="end" fontSize={9} fill="#ec5c52" fillOpacity={0.8}>
          max_seq_len
        </text>
        {peak > 0 && (
          <>
            <line x1={padL} x2={w - 8} y1={y(peak)} y2={y(peak)} stroke="#e8a96a" strokeOpacity={0.35} strokeDasharray="1 2" />
            <text x={w - 10} y={y(peak) - 4} textAnchor="end" fontSize={9} fill="#e8a96a" fillOpacity={0.7}>
              inftythink peak {peak}
            </text>
          </>
        )}
        <text x={padL} y={h - 3} fontSize={9} fill="#58554e">
          0
        </text>
        <text x={w - 8} y={h - 3} textAnchor="end" fontSize={9} fill="#58554e">
          {n} generated
        </text>
        <path d={path(cot)} fill="none" stroke="#dcd6c8" strokeOpacity={0.55} strokeWidth={1.2} />
        <path d={path(infty)} fill="none" stroke="#e8a96a" strokeWidth={1.4} />
        {c && <circle cx={x(c[0])} cy={y(c[1])} r={2.5} fill="#dcd6c8" />}
        {f && <circle cx={x(f[0])} cy={y(f[1])} r={2.5} fill="#e8a96a" />}
      </svg>
    </div>
  );
}
