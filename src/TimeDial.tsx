import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { clockAt, minutesAt, partOfDay, positionAt } from "./palette";
import { setTime, useTime } from "./theme";

// The theme control: the sun's path from noon to midnight, drawn as an arc
// over a horizon. The thumb is the sun, its rays turning as it travels; drag it
// down past the horizon and it becomes the moon, and the page follows it into
// the night. Everything here has a fixed size, so moving it never nudges the
// header. A role="slider" with the usual keys.

const W = 120; // drawn width of the path, px
const H = 32;
const PAD = 10;
const AMP = 9; // how high the sun climbs above the horizon, px
const STEP = 10; // minutes per arrow press

const xAt = (p: number) => PAD + p * (W - 2 * PAD);
// altitude follows the hour angle: highest at noon, on the horizon at 18:00, lowest at midnight
const yAt = (p: number) => H / 2 - AMP * Math.cos(Math.PI * p);

const path = (from: number, to: number) => {
  let d = "";
  for (let i = 0; i <= 24; i++) {
    const p = from + ((to - from) * i) / 24;
    d += `${i ? "L" : "M"}${xAt(p).toFixed(2)} ${yAt(p).toFixed(2)}`;
  }
  return d;
};
const DAY = path(0, 0.5);
const NIGHT = path(0.5, 1);
const TICKS = [0, 0.25, 0.5, 0.75, 1];
const R = 4.5; // the sun's disc
const RAYS = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

export default function TimeDial() {
  const p = useTime();
  const track = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);

  const fromPointer = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    return (
      (e.clientX - r.left - (PAD * r.width) / W) /
      (r.width * (1 - (2 * PAD) / W))
    );
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
    if (e.key === "ArrowRight" || e.key === "ArrowUp")
      next = positionAt(m + big);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      next = positionAt(m - big);
    else if (e.key === "PageUp") [next, sweep] = [positionAt(m + 60), true];
    else if (e.key === "PageDown") [next, sweep] = [positionAt(m - 60), true];
    else if (e.key === "Home") [next, sweep] = [0, true];
    else if (e.key === "End") [next, sweep] = [1, true];
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

  const jump = (to: number) => setTime(to, { sweep: true });
  const END =
    "hidden h-7 w-6 items-center justify-center text-[13px] leading-none transition-colors sm:flex";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => jump(0)}
        className={`${END} ${p < 0.02 ? "text-phos" : "text-faint hover:text-phos"}`}
        aria-label="Noon: light"
        title="noon"
      >
        ☀
      </button>
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
        className="group relative -my-2 flex cursor-pointer select-none items-center gap-2 rounded-sm px-1 py-2 text-[11px] text-faint transition-colors hover:bg-panel/60"
        style={{ touchAction: "pan-y" }}
        title="time of day: drag the sun to change the colours"
      >
        <svg
          ref={track}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden
          className="block overflow-visible"
        >
          <defs>
            <radialGradient id="sun-glow">
              <stop
                offset="0%"
                style={{ stopColor: "rgb(var(--c-phos))", stopOpacity: 0.55 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "rgb(var(--c-phos))", stopOpacity: 0 }}
              />
            </radialGradient>
            <mask id="moon-bite" maskContentUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="40" maskUnits="userSpaceOnUse">
              <rect x={-20} y={-20} width={40} height={40} fill="white" />
              <circle cx={3.6} cy={-2} r={R + 0.3} fill="black" />
            </mask>
          </defs>
          {/* the horizon, with a tick at each stop of the day */}
          <line
            x1={0}
            x2={W}
            y1={H / 2}
            y2={H / 2}
            className="stroke-faint/50"
            strokeWidth={1}
          />
          {TICKS.map((t) => (
            <line
              key={t}
              x1={xAt(t)}
              x2={xAt(t)}
              y1={H / 2 - 1.5}
              y2={H / 2 + 1.5}
              className="stroke-faint/60"
              strokeWidth={1}
            />
          ))}
          {/* the sun's path: brighter above the horizon, fainter under it */}
          <path
            d={DAY}
            fill="none"
            className="stroke-dim"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <path
            d={NIGHT}
            fill="none"
            className="stroke-faint"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeDasharray="2 2.5"
          />
          {/* the part of the arc already travelled, lit */}
          <path
            d={path(0, Math.max(0.0001, p))}
            fill="none"
            className="stroke-phos/70"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <circle
            cx={sx}
            cy={sy}
            r={4 + 6 * glow + (active ? 2 : 0)}
            fill="url(#sun-glow)"
            opacity={0.35 + 0.65 * glow}
          />
          {up ? (
            // the sun: a disc and eight rays that lengthen with its altitude and turn as it moves
            <g transform={`translate(${sx.toFixed(2)} ${sy.toFixed(2)}) rotate(${(p * 540).toFixed(1)})`}>
              {RAYS.map((a) => (
                <line
                  key={a}
                  x1={Math.cos(a) * (R + 2)}
                  y1={Math.sin(a) * (R + 2)}
                  x2={Math.cos(a) * (R + 3.5 + 2.5 * glow + (active ? 1 : 0))}
                  y2={Math.sin(a) * (R + 3.5 + 2.5 * glow + (active ? 1 : 0))}
                  className="stroke-phos"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
              ))}
              <circle r={R + (active ? 0.8 : 0)} className="fill-phos" />
            </g>
          ) : (
            // the moon: the same disc with a bite out of it
            <g transform={`translate(${sx.toFixed(2)} ${sy.toFixed(2)}) rotate(-20)`}>
              <circle r={R + 1 + (active ? 0.8 : 0)} className="fill-phos" mask="url(#moon-bite)" />
            </g>
          )}
        </svg>
        <span className="flex w-[74px] shrink-0 flex-col leading-[1.15]">
          <span className="tabular-nums text-bone">{clock}</span>
          <span
            aria-hidden
            className="text-[10px] lowercase tracking-[0.1em] text-phos/90"
          >
            {name}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => jump(1)}
        className={`${END} ${p > 0.98 ? "text-phos" : "text-faint hover:text-phos"}`}
        aria-label="Midnight: dark"
        title="midnight"
      >
        ☾
      </button>
    </div>
  );
}
