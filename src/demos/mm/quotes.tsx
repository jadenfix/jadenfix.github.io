import { useRef } from 'react';
import { WINDOW, type Lane, type Point } from './session';
import { useSize } from './useWidth';
import { BONE, FAINT, ICE, LINE, PHOS } from './theme';

type Who = 'agent' | 'base';
const COLOR: Record<Who, string> = { agent: PHOS, base: ICE };

/** mid, both policies' resting quotes (agent amber, baseline blue-grey) and their fills */
export function QuoteChart({ history, decimals }: { history: Point[]; decimals: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, height] = useSize(box);
  const padR = 8;
  const plotW = Math.max(10, w - padR);
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of history) {
    for (const v of [p.mid, p.agent.bid, p.agent.ask, p.base.bid, p.base.ask]) {
      if (v === null) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  if (!Number.isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  const pad = Math.max((hi - lo) * 0.08, Math.abs(hi) * 2e-5);
  lo -= pad;
  hi += pad;
  const x = (i: number) => (i + WINDOW - history.length) * (plotW / (WINDOW - 1));
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (height - 12);
  const step = (who: Who, key: 'bid' | 'ask') => {
    let d = '';
    let open = false;
    history.forEach((p, i) => {
      const v = p[who][key];
      if (v === null) {
        open = false;
        return;
      }
      d += open ? ` H${x(i).toFixed(1)} V${y(v).toFixed(1)}` : ` M${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      open = true;
    });
    return d.trim();
  };
  const mid = history.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.mid).toFixed(1)}`).join(' ');
  const ticks = [lo + (hi - lo) * 0.2, (lo + hi) / 2, lo + (hi - lo) * 0.8];
  return (
    <div ref={box} className="relative h-full w-full">
      <svg width={w} height={height} className="absolute left-0 top-0 block" aria-hidden>
        {ticks.map((g) => (
          <g key={g}>
            <line x1={0} x2={plotW} y1={y(g)} y2={y(g)} stroke={LINE} strokeDasharray="1 3" />
            <text x={plotW - 2} y={y(g) - 3} textAnchor="end" fontSize={9} fill={FAINT} className="tabular-nums">
              {g.toFixed(decimals)}
            </text>
          </g>
        ))}
        <path d={mid} fill="none" stroke={BONE} strokeOpacity={0.5} strokeWidth={1} />
        {(['base', 'agent'] as const).map((who) => (
          <g key={who}>
            <path d={step(who, 'bid')} fill="none" stroke={COLOR[who]} strokeOpacity={who === 'agent' ? 0.9 : 0.6} strokeWidth={1} strokeDasharray={who === 'base' ? '3 2' : undefined} />
            <path d={step(who, 'ask')} fill="none" stroke={COLOR[who]} strokeOpacity={who === 'agent' ? 0.9 : 0.6} strokeWidth={1} strokeDasharray={who === 'base' ? '3 2' : undefined} />
            {history.map((p, i) => (
              <g key={i}>
                {p[who].buys.map((v, j) => (
                  <circle key={`b${j}`} cx={x(i)} cy={y(v)} r={3} fill={COLOR[who]} />
                ))}
                {p[who].sells.map((v, j) => (
                  <circle key={`s${j}`} cx={x(i)} cy={y(v)} r={2.6} fill="#0b0b0a" stroke={COLOR[who]} strokeWidth={1.3} />
                ))}
              </g>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** one field over the window for both policies */
export function Trace({ history, field, label, fmt }: { history: Point[]; field: keyof Pick<Lane, 'inv' | 'pnl'>; label: string; fmt: (v: number) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, height] = useSize(box);
  const vals = history.flatMap((p) => [p.agent[field], p.base[field]]);
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  const minSpan = field === 'inv' ? 2 : 0.2;
  if (hi - lo < minSpan) {
    const c = (hi + lo) / 2;
    lo = Math.min(lo, c - minSpan / 2);
    hi = Math.max(hi, c + minSpan / 2);
  }
  const top = 16;
  const x = (i: number) => (i + WINDOW - history.length) * (w / (WINDOW - 1));
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * (height - top - 4);
  const path = (who: Who) => history.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(h[who][field]).toFixed(1)}`).join(' ');
  const last = history[history.length - 1];
  return (
    <div ref={box} className="relative h-full w-full">
      <div className="pointer-events-none absolute left-0 top-0 flex w-full items-baseline justify-between text-[10px] lowercase tracking-[0.12em]">
        <span className="text-dim">{label}</span>
        {last && (
          <span className="tabular-nums tracking-normal">
            <span className="text-phos">{fmt(last.agent[field])}</span>
            <span className="text-ice"> · {fmt(last.base[field])}</span>
          </span>
        )}
      </div>
      <svg width={w} height={height} className="absolute left-0 top-0 block" aria-hidden>
        <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={LINE} />
        <path d={path('base')} fill="none" stroke={ICE} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="3 2" />
        <path d={path('agent')} fill="none" stroke={PHOS} strokeWidth={1.25} />
      </svg>
    </div>
  );
}
