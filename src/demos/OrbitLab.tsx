import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { drawFrame, extentFor } from './orbit/draw';
import { useOnScreen, useReducedMotion } from './orbit/hooks';
import { separatrix, solveOrbit } from './orbit/physics';

const P_MIN = 6.5;
const P_MAX = 30;
const E_MIN = 0;
const E_MAX = 0.8;
const P0 = 16.81;
const E0 = 0.6;
/** wall-clock seconds for one radial orbit (or for a whole plunge) */
const SECONDS_PER_ORBIT = 6.5;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const RANGE =
  'block h-5 w-full cursor-pointer appearance-none bg-transparent focus:outline-none ' +
  '[&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-[#34322e] ' +
  '[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:h-[11px] [&::-webkit-slider-thumb]:w-[11px] [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-phos [&::-webkit-slider-thumb]:bg-void ' +
  '[&::-moz-range-track]:h-px [&::-moz-range-track]:bg-[#34322e] ' +
  '[&::-moz-range-thumb]:h-[9px] [&::-moz-range-thumb]:w-[9px] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-phos [&::-moz-range-thumb]:bg-void ' +
  'focus-visible:[&::-webkit-slider-thumb]:bg-phos focus-visible:[&::-moz-range-thumb]:bg-phos';

const TOGGLE = 'whitespace-nowrap py-1 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

export default function OrbitLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { visible, seen } = useOnScreen(wrapRef);
  const reduce = useReducedMotion();

  const [p, setP] = useState(P0);
  const [e, setE] = useState(E0);
  const [newton, setNewton] = useState(false);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduce;
  const running = playing && visible;

  const orbit = useMemo(() => solveOrbit(p, e), [p, e]);
  const sep = separatrix(e);

  // simulation state that changes every frame lives in a ref, not in React state
  const sim = useRef({ t: 0, scale: 0, hold: 0, fade: 1, w: 0, h: 0 });

  const paint = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || !sim.current.w) return;
    const dpr = c.width / sim.current.w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(ctx, sim.current.w, sim.current.h, { o: orbit, t: sim.current.t, scale: sim.current.scale, newton, fade: sim.current.fade });
  };
  const paintRef = useRef(paint);
  useEffect(() => {
    paintRef.current = paint;
  });

  const targetScale = () => {
    const { w, h } = sim.current;
    return Math.max(0.2, (Math.min(w, h) / 2 - 14) / (extentFor(orbit, newton) * 1.02));
  };
  const targetRef = useRef(targetScale);
  useEffect(() => {
    targetRef.current = targetScale;
  });

  // size the canvas to its box at device resolution
  useEffect(() => {
    const box = boxRef.current;
    const c = canvasRef.current;
    if (!box || !c) return;
    const fit = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      sim.current.w = r.width;
      sim.current.h = r.height;
      sim.current.scale = targetRef.current();
      paintRef.current();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // a new orbit restarts at periapsis; when still, show it a few orbits in so the rosette is readable
  useEffect(() => {
    const s = sim.current;
    s.t = playing ? 0 : orbit.stable ? 4.3 * orbit.Tr : orbit.Tr;
    s.hold = 0;
    s.fade = 1;
    if (!playing || !s.scale) s.scale = targetRef.current();
    paintRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbit]);

  // repaint when the overlay changes while paused
  useEffect(() => {
    if (!running) {
      sim.current.scale = targetRef.current();
      paintRef.current();
    }
  }, [newton, running]);

  // the animation loop, only while on screen and playing
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      const o = orbit;
      const rate = o.Tr / SECONDS_PER_ORBIT;
      if (o.stable) {
        s.t += dt * rate;
        s.fade = 1;
      } else if (s.t < o.Tr) {
        s.t = Math.min(o.Tr, s.t + dt * rate);
      } else {
        // it has reached r = 2M in all but name; hold, fade, release again
        s.hold += dt;
        s.fade = clamp(1 - (s.hold - 1.4) / 1.2, 0, 1);
        if (s.hold > 2.8) {
          s.t = 0;
          s.hold = 0;
          s.fade = 1;
        }
      }
      const target = targetRef.current();
      s.scale += (target - s.scale) * (1 - Math.exp(-dt * 3.5));
      paintRef.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, orbit]);

  const nudge = (ev: KeyboardEvent<HTMLInputElement>, which: 'p' | 'e') => {
    const small = which === 'p' ? 0.1 : 0.01;
    const big = which === 'p' ? 1 : 0.1;
    let d = 0;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') d = ev.shiftKey ? big : small;
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') d = -(ev.shiftKey ? big : small);
    else if (ev.key === 'PageUp') d = big;
    else if (ev.key === 'PageDown') d = -big;
    else return;
    ev.preventDefault();
    if (which === 'p') setP((v) => Math.round(clamp(v + d, P_MIN, P_MAX) * 100) / 100);
    else setE((v) => Math.round(clamp(v + d, E_MIN, E_MAX) * 100) / 100);
  };

  const sepFrac = (sep - P_MIN) / (P_MAX - P_MIN);
  const whirl = !orbit.stable && !orbit.reachedHorizon;
  const readouts: [string, string, string][] = [
    ['periapsis advance', orbit.stable ? `${orbit.advanceDeg.toFixed(2)}°` : 'none', orbit.stable ? 'per orbit' : 'no orbit to precess'],
    ['r_p', `${orbit.rp.toFixed(2)} M`, orbit.stable ? 'closest approach' : 'released here'],
    ['r_a', `${orbit.ra.toFixed(2)} M`, orbit.stable ? 'farthest' : 'never reached'],
    ['radial period', orbit.stable ? `${Math.round(orbit.Tr)} M` : 'plunge', orbit.stable ? 'coordinate time' : 'falls in'],
  ];
  const notes = [
    {
      key: 'stable',
      on: orbit.stable,
      body: (
        <>
          Stable, since p &gt; 6 + 2e = {sep.toFixed(2)}. Newton&apos;s ellipse closes on itself; here each periapsis lands{' '}
          <span className="text-bone">{orbit.stable ? orbit.advanceDeg.toFixed(2) : '0.00'}°</span> further round, so the orbit traces a rosette. Time runs in
          the far observer&apos;s clock, which is why it whips through periapsis.
        </>
      ),
    },
    {
      key: 'plunge',
      on: !orbit.stable && !whirl,
      body: (
        <>
          <span className="text-[#ec5c52]">No stable orbit</span>: p &lt; 6 + 2e = {sep.toFixed(2)}. The potential barrier now sits outside r_p, so nothing
          turns the particle around and it spirals in. In the far observer&apos;s time it never quite crosses r = 2M; it slows and its light reddens away.
        </>
      ),
    },
    {
      key: 'whirl',
      on: whirl,
      body: (
        <>
          <span className="text-[#ec5c52]">On the separatrix</span>: p = 6 + 2e = {sep.toFixed(2)}. Released at r_p, the particle balances on the unstable
          circular orbit and whirls there; the slightest nudge inward and it falls through the horizon.
        </>
      ),
    },
  ];

  return (
    <div ref={wrapRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1s ease' }}>
      <div ref={boxRef} className="relative aspect-square w-full overflow-hidden border border-line bg-void sm:aspect-[16/10]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={
            orbit.stable
              ? `A test mass on a precessing orbit around a Schwarzschild black hole, p ${p.toFixed(2)}, e ${e.toFixed(2)}, advancing ${orbit.advanceDeg.toFixed(2)} degrees per orbit.`
              : `A test mass released at r ${orbit.rp.toFixed(2)} M spiralling into the black hole: no stable orbit exists for p ${p.toFixed(2)}, e ${e.toFixed(2)}.`
          }
        />
        <div className="pointer-events-none absolute left-3 top-3 text-[10px] lowercase tracking-[0.14em] text-faint">schwarzschild · g = c = m = 1</div>
        <div className="pointer-events-none absolute bottom-3 right-3 text-[10px] tracking-[0.1em] text-faint">rk4 · coordinate time</div>
      </div>

      <dl className="grid grid-cols-2 border-x border-b border-line sm:grid-cols-4">
        {readouts.map(([k, v, sub], i) => (
          <div key={k} className={`px-3 py-3 sm:px-4 ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`}>
            <dt className="text-[10px] lowercase tracking-[0.14em] text-dim">{k}</dt>
            <dd className={`mt-1 font-serif text-[26px] leading-none tabular-nums ${i === 0 && orbit.stable ? 'text-phos' : 'text-bone'}`}>{v}</dd>
            <dd className="mt-1 text-[10px] text-faint">{sub}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid text-[12px] leading-[1.8] text-dim" aria-live="polite">
        {notes.map((n) => (
          <p key={n.key} className={`col-start-1 row-start-1 ${n.on ? '' : 'invisible'}`} aria-hidden={!n.on}>
            {n.body}
          </p>
        ))}
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <label className="block">
          <span className="flex items-baseline justify-between text-[11px] text-dim">
            <span>
              <span className="text-bone">p</span> semi-latus rectum
            </span>
            <span className="tabular-nums text-bone">{p.toFixed(2)} M</span>
          </span>
          <span className="relative mt-2 block">
            {/* everything left of the separatrix plunges */}
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-[3px] -translate-y-1/2 bg-[#ec5c52]/35"
              style={{ left: 5, width: `calc(${sepFrac} * (100% - 11px))` }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-[9px] w-px -translate-y-1/2 bg-[#ec5c52]/70"
              style={{ left: `calc(5px + ${sepFrac} * (100% - 11px))` }}
            />
            <input
              type="range"
              min={P_MIN}
              max={P_MAX}
              step={0.01}
              value={p}
              onChange={(ev) => setP(Number(ev.target.value))}
              onKeyDown={(ev) => nudge(ev, 'p')}
              aria-valuetext={`${p.toFixed(2)} M${orbit.stable ? '' : ', below the separatrix, plunges'}`}
              className={`relative ${RANGE}`}
            />
          </span>
          <span className="mt-1 flex justify-between text-[10px] text-faint">
            <span>6.5</span>
            <span>red: p &lt; 6 + 2e, no stable orbit</span>
            <span>30</span>
          </span>
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between text-[11px] text-dim">
            <span>
              <span className="text-bone">e</span> eccentricity
            </span>
            <span className="tabular-nums text-bone">{e.toFixed(2)}</span>
          </span>
          <span className="mt-2 block">
            <input
              type="range"
              min={E_MIN}
              max={E_MAX}
              step={0.01}
              value={e}
              onChange={(ev) => setE(Number(ev.target.value))}
              onKeyDown={(ev) => nudge(ev, 'e')}
              className={RANGE}
            />
          </span>
          <span className="mt-1 flex justify-between text-[10px] text-faint">
            <span>0 circle</span>
            <span>0.8</span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        <button type="button" aria-pressed={newton} onClick={() => setNewton((v) => !v)} className={`${TOGGLE} ${newton ? 'text-ice' : 'text-dim hover:text-bone'}`}>
          [ newtonian ellipse ]
        </button>
        <button type="button" aria-pressed={!playing} onClick={() => setUserPlaying(!playing)} className={`${TOGGLE} text-dim hover:text-bone`}>
          [ {playing ? 'pause' : 'play'} ]
        </button>
        <button
          type="button"
          onClick={() => {
            setP(P0);
            setE(E0);
          }}
          className={`${TOGGLE} ${p === P0 && e === E0 ? 'text-phos' : 'text-dim hover:text-bone'}`}
        >
          [ reset ]
        </button>
      </div>

      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-[1.8] text-faint">
        u&apos;&apos; = 1/L² − u + 3u² with u = 1/r, integrated by RK4 from periapsis and played in coordinate time. Black disk: the shadow a distant
        observer sees, radius 3√3 M, edged by the photon ring; dashed: the horizon, 2M; dotted: the innermost stable orbit, 6M.
      </p>
    </div>
  );
}
