import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clockAt, minutesAt, partOfDay, positionAt } from './palette';
import { setTime, useTime } from './theme';

// The theme control: the sun's path from noon to midnight, drawn as a dotted
// arc over a horizon. The sun is the thumb. Drag it down past the horizon and
// the page follows it into the night. Above the horizon it glows; below, it is
// a small ring, the sun you can't see. A role="slider" with the usual keys.

const W = 76; // drawn width of the path, px
const H = 22;
const PAD = 4;
const AMP = 7; // how high the sun climbs above the horizon, px
const STEP = 10; // minutes per arrow press

const xAt = (p: number) => PAD + p * (W - 2 * PAD);
// altitude follows the hour angle: highest at noon, on the horizon at 18:00, lowest at midnight
const yAt = (p: number) => H / 2 - AMP * Math.cos(Math.PI * p);

const path = (from: number, to: number) => {
  let d = '';
  for (let i = 0; i <= 24; i++) {
    const p = from + ((to - from) * i) / 24;
    d += `${i ? 'L' : 'M'}${xAt(p).toFixed(2)} ${yAt(p).toFixed(2)}`;
  }
  return d;
};
const DAY = path(0, 0.5);
const NIGHT = path(0.5, 1);
const TICKS = [0, 0.25, 0.5, 0.75, 1];

export default function TimeDial() {
  const p = useTime();
  const track = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);

  const fromPointer = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    return (e.clientX - r.left - (PAD * r.width) / W) / (r.width * (1 - (2 * PAD) / W));
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setActive(true);
    // a click glides the sun there; a drag then holds it under the finger
    setTime(fromPointer(e), { sweep: true });
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setTime(fromPointer(e));
  };
  const onUp = () => {
    dragging.current = false;
    setActive(false);
  };

  const onKey = (e: KeyboardEvent) => {
    const m = minutesAt(p);
    const big = e.shiftKey ? 60 : STEP;
    let next: number | null = null;
    let sweep = false;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = positionAt(m + big);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = positionAt(m - big);
    else if (e.key === 'PageUp') [next, sweep] = [positionAt(m + 60), true];
    else if (e.key === 'PageDown') [next, sweep] = [positionAt(m - 60), true];
    else if (e.key === 'Home') [next, sweep] = [0, true];
    else if (e.key === 'End') [next, sweep] = [1, true];
    if (next === null) return;
    e.preventDefault();
    setTime(next, { sweep });
  };

  const up = p < 0.5;
  const sx = xAt(p);
  const sy = yAt(p);
  // the glow is the sun's altitude: full at noon, gone at the horizon
  const glow = Math.max(0, Math.cos(Math.PI * p));
  const name = partOfDay(p);
  const clock = clockAt(p);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Time of day. Sets the page's colours, from noon, light, to midnight, dark"
      aria-valuemin={720}
      aria-valuemax={1440}
      aria-valuenow={Math.round(minutesAt(p))}
      aria-valuetext={`${clock}, ${name}`}
      aria-orientation="horizontal"
      data-cursor="hot"
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => !dragging.current && setActive(false)}
      className="group relative -my-2 flex select-none items-center gap-2 py-2 text-[11px] text-faint"
      style={{ touchAction: 'pan-y' }}
      title="time of day: drag the sun"
    >
      <svg ref={track} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="block overflow-visible">
        <defs>
          <radialGradient id="sun-glow">
            <stop offset="0%" style={{ stopColor: 'rgb(var(--c-phos))', stopOpacity: 0.55 }} />
            <stop offset="100%" style={{ stopColor: 'rgb(var(--c-phos))', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        {/* the horizon, with a tick at each stop of the day */}
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-line" strokeWidth={1} />
        {TICKS.map((t) => (
          <line key={t} x1={xAt(t)} x2={xAt(t)} y1={H / 2 - 1.5} y2={H / 2 + 1.5} className="stroke-faint/60" strokeWidth={1} />
        ))}
        {/* the sun's path: brighter above the horizon, fainter under it */}
        <path d={DAY} fill="none" className="stroke-dim/80" strokeWidth={1} strokeLinecap="round" strokeDasharray="0.01 3" />
        <path d={NIGHT} fill="none" className="stroke-faint/70" strokeWidth={1} strokeLinecap="round" strokeDasharray="0.01 3" />
        <circle cx={sx} cy={sy} r={4 + 6 * glow + (active ? 2 : 0)} fill="url(#sun-glow)" opacity={0.35 + 0.65 * glow} />
        {up ? (
          <circle cx={sx} cy={sy} r={active ? 3.2 : 2.6} className="fill-phos" />
        ) : (
          <>
            <circle cx={sx} cy={sy} r={active ? 3.6 : 3} className="fill-void stroke-phos" strokeWidth={1} />
            <circle cx={sx} cy={sy} r={1} className="fill-phos" />
          </>
        )}
      </svg>
      <span className="tabular-nums text-dim transition-colors group-hover:text-bone">{clock}</span>
      {/* the part of the day, while the dial is in hand */}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0 top-full whitespace-nowrap text-[10px] lowercase tracking-[0.14em] text-phos transition-opacity duration-short ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {name}
      </span>
    </div>
  );
}
