import { useRef } from 'react';
import type { PolicyName } from './twin';
import { WINDOW, type LadderRow, type Point } from './recorder';
import { useSize } from './useWidth';
import { BONE, FAINT, ICE, LINE, PHOS, RED } from './theme';

const OTHER: Record<PolicyName, PolicyName> = { td3: 'fixed', fixed: 'td3' };

/** mid, the agent's resting quotes as a band, and its fills, over the last WINDOW events */
export function PriceChart({ history, view }: { history: Point[]; view: PolicyName }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, height] = useSize(box);
  const padR = 44;
  const plotW = Math.max(10, w - padR);
  const lanes = history.map((p) => p[view]);
  let lo = Infinity;
  let hi = -Infinity;
  for (const l of lanes) {
    for (const v of [l.mid, l.bid, l.ask]) {
      if (v === null) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  if (!Number.isFinite(lo)) {
    lo = 99.95;
    hi = 100.05;
  }
  const c = (lo + hi) / 2;
  const half = Math.max(0.05, (hi - lo) / 2 + 0.012);
  lo = c - half;
  hi = c + half;
  const x = (i: number) => (i + WINDOW - lanes.length) * (plotW / (WINDOW - 1));
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (height - 16);
  const step = (key: 'bid' | 'ask') => {
    let d = '';
    lanes.forEach((l, i) => {
      const v = l[key];
      if (v === null) return;
      d += d ? ` H${x(i).toFixed(1)} V${y(v).toFixed(1)}` : `M${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    });
    if (d && lanes.length) d += ` H${x(lanes.length - 1) + plotW / (WINDOW - 1)}`;
    return d;
  };
  const band = (() => {
    if (!lanes.length) return '';
    const top = lanes.map((l, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(l.ask ?? l.mid).toFixed(1)}`).join(' ');
    const bot = lanes
      .map((l, i) => [i, l] as const)
      .reverse()
      .map(([i, l]) => `L${x(i).toFixed(1)} ${y(l.bid ?? l.mid).toFixed(1)}`)
      .join(' ');
    return `${top} ${bot} Z`;
  })();
  const mid = lanes.map((l, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(l.mid).toFixed(1)}`).join(' ');
  // price grid every 2 ticks, labelled every 4
  const grid: number[] = [];
  for (let t = Math.ceil(lo / 0.02); t * 0.02 <= hi; t++) grid.push(t * 0.02);
  const last = lanes[lanes.length - 1];
  return (
    <div ref={box} className="relative h-full w-full">
      <svg width={w} height={height} className="absolute left-0 top-0 block" aria-hidden>
        {grid.map((g) => (
          <g key={g.toFixed(2)}>
            <line x1={0} x2={plotW} y1={y(g)} y2={y(g)} stroke={LINE} strokeDasharray="1 3" />
            {Math.round(g * 100) % 4 === 0 && (
              <text x={w - 2} y={y(g) + 3} textAnchor="end" fontSize={9} fill={FAINT} className="tabular-nums">
                {g.toFixed(2)}
              </text>
            )}
          </g>
        ))}
        <path d={band} fill={PHOS} opacity={0.07} />
        <path d={mid} fill="none" stroke={BONE} strokeOpacity={0.45} strokeWidth={1} />
        <path d={step('bid')} fill="none" stroke={PHOS} strokeOpacity={0.8} strokeWidth={1} />
        <path d={step('ask')} fill="none" stroke={PHOS} strokeOpacity={0.8} strokeWidth={1} />
        {lanes.map((l, i) =>
          l.fills.map((f, j) =>
            f.side === 'buy' ? (
              <circle key={`${i}-${j}`} cx={x(i)} cy={y(f.price)} r={2.6} fill={PHOS} />
            ) : (
              <circle key={`${i}-${j}`} cx={x(i)} cy={y(f.price)} r={2.4} fill="#0b0b0a" stroke={PHOS} strokeWidth={1.2} />
            ),
          ),
        )}
        {last && (
          <>
            {last.ask !== null && (
              <text x={plotW - 4} y={y(last.ask) - 4} textAnchor="end" fontSize={9} fill={PHOS}>
                ask {last.ask.toFixed(2)}
              </text>
            )}
            {last.bid !== null && (
              <text x={plotW - 4} y={y(last.bid) + 11} textAnchor="end" fontSize={9} fill={PHOS}>
                bid {last.bid.toFixed(2)}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

/** one series per policy; the one on screen in amber, the other a faint ghost */
export function Trace({ history, view, field, label, fmt }: { history: Point[]; view: PolicyName; field: 'inv' | 'pnl'; label: string; fmt: (v: number) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, height] = useSize(box);
  const vals = history.flatMap((p) => [p.td3[field], p.fixed[field]]);
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  const minSpan = field === 'inv' ? 4 : 0.5;
  if (hi - lo < minSpan) {
    const c = (hi + lo) / 2;
    lo = Math.min(lo, c - minSpan / 2);
    hi = Math.max(hi, c + minSpan / 2);
  }
  const top = 18;
  const x = (i: number) => (i + WINDOW - history.length) * (w / (WINDOW - 1));
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * (height - top - 6);
  const path = (p: PolicyName) => history.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(h[p][field]).toFixed(1)}`).join(' ');
  const last = history[history.length - 1];
  const other = OTHER[view];
  return (
    <div ref={box} className="relative h-full w-full">
      <div className="pointer-events-none absolute left-0 top-0 flex w-full items-baseline justify-between text-[10px] lowercase tracking-[0.12em]">
        <span className="text-dim">{label}</span>
        {last && (
          <span className="tabular-nums tracking-normal">
            <span className="text-phos">{fmt(last[view][field])}</span>
            <span className="text-faint"> · {fmt(last[other][field])}</span>
          </span>
        )}
      </div>
      <svg width={w} height={height} className="absolute left-0 top-0 block" aria-hidden>
        <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={LINE} />
        <path d={path(other)} fill="none" stroke={BONE} strokeOpacity={0.28} strokeWidth={1} strokeDasharray="2 2" />
        <path d={path(view)} fill="none" stroke={PHOS} strokeWidth={1.25} />
      </svg>
    </div>
  );
}

/** price ladder: each level drawn as its FIFO queue, the agent's own orders in amber */
export function Ladder({ rows, hot, mid, spread, rowH }: { rows: LadderRow[]; hot: number[]; mid: number | null; spread: number | null; rowH: number }) {
  const MAX = 1500; // lots (150 LTC) that fill the half-width
  const half = rows.length / 2;
  const row = (r: LadderRow) => {
    const isHot = hot.includes(r.tick);
    const hasAgent = r.queue.some((q) => q.agent);
    const bar = (
      <div className={`flex h-[9px] gap-px ${r.side === 'buy' ? 'flex-row-reverse' : ''}`} style={{ width: `${Math.min(100, (r.total / MAX) * 100)}%` }}>
        {r.queue.map((q, i) => (
          <span
            key={i}
            className="h-full min-w-[2px]"
            style={{
              flexGrow: q.qty,
              flexBasis: 0,
              background: q.agent ? PHOS : r.side === 'buy' ? ICE : RED,
              opacity: q.agent ? 0.95 : 0.32,
            }}
          />
        ))}
      </div>
    );
    return (
      <div key={r.tick} className="grid grid-cols-[1fr_64px_1fr] items-center" style={{ height: rowH }}>
        <div className="flex justify-end pr-2">{r.side === 'buy' ? bar : null}</div>
        <div
          className={`text-center text-[10.5px] tabular-nums transition-colors duration-500 ${isHot ? 'bg-bone/10 text-bone' : hasAgent ? 'text-phos' : r.total ? 'text-dim' : 'text-faint/60'}`}
        >
          {r.price.toFixed(2)}
        </div>
        <div className="flex justify-start pl-2">{r.side === 'sell' ? bar : null}</div>
      </div>
    );
  };
  return (
    <div className="flex h-full flex-col justify-center" role="img" aria-label={`Order book around mid ${mid?.toFixed(3) ?? 'n/a'}`}>
      {rows.slice(0, half).map(row)}
      <div className="grid grid-cols-[1fr_64px_1fr] items-center border-y border-line text-[10px] text-faint" style={{ height: rowH + 4 }}>
        <span className="pr-2 text-right">bids</span>
        <span className="text-center tabular-nums">{spread !== null ? spread.toFixed(2) : '–'}</span>
        <span className="pl-2">asks</span>
      </div>
      {rows.slice(half).map(row)}
    </div>
  );
}
