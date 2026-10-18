import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { QE } from './boris.ts';
import { Belt, L_MAX, L_MID, L_MIN } from './belt.ts';
import { B0, dipoleTheory, RE, type Species } from './dipole.ts';
import { drawBelt, type Camera } from './drawBelt.ts';
import Readouts from './Readouts.tsx';
import { compositeGlow, fmt, fmtTime, RANGE, STAGE, TOGGLE, useLoop, useStageCanvases } from './stage.ts';

const ENERGIES = [1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 70, 100, 150, 200, 300];
const E0 = ENERGIES.indexOf(50);
const A0 = 38;
const N0 = 40;
const DEG = Math.PI / 180;

type Live = { key: string; bounce: number | null; drift: number | null; err: number; speed: number; lost: number };

export default function MagnetosphereMode({ running, playing, onPlay }: { running: boolean; playing: boolean; onPlay: (v: boolean) => void }) {
  const [species, setSpecies] = useState<Species>('p');
  const [ei, setEi] = useState(E0);
  const [alpha, setAlpha] = useState(A0);
  const [count, setCount] = useState(N0);
  const [gen, setGen] = useState(0);
  const mev = ENERGIES[ei];
  const key = `${species}-${mev}-${alpha}-${count}-${gen}`;
  const th = useMemo(() => dipoleTheory(species, mev, alpha * DEG, L_MID), [species, mev, alpha]);
  const [live, setLive] = useState<Live>({ key: '', bounce: null, drift: null, err: 0, speed: 0, lost: 0 });
  const shown = live.key === key ? live : null;

  const belt = useRef<Belt | null>(null);
  const cam = useRef<Camera>({ az: -0.5, el: 0.38 });
  const t = useRef({ wall: 0, lastUi: 0, drag: null as null | { x: number; y: number; id: number }, idle: 0 });

  const paint = () => {
    const main = mainRef.current;
    const glow = glowRef.current;
    const lay = layer.current;
    const b = belt.current;
    const { w, h, dpr } = size.current;
    if (!main || !glow || !lay || !b || !w) return;
    const ctx = main.getContext('2d');
    const lctx = lay.getContext('2d');
    if (!ctx || !lctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBelt(ctx, lctx, w, h, b, cam.current);
    compositeGlow(main, glow, lay);
  };
  const { boxRef, mainRef, glowRef, size, layer } = useStageCanvases(() => paint());

  const pushLive = (b: Belt, k: string) => {
    const m = b.measured();
    setLive({ key: k, bounce: m.bounce, drift: m.drift, err: b.maxEnergyErr, speed: b.rate * b.rateScale, lost: b.lost });
  };

  // a new setting injects a fresh cloud; when still, let it settle into a belt first
  useEffect(() => {
    const b = new Belt({ species, mev, alphaDeg: alpha, count });
    belt.current = b;
    const warm = playing ? 1.4 : 9;
    const start = performance.now();
    for (let s = 0; s < warm && performance.now() - start < 120; s += 1 / 30) b.advance(1 / 30);
    paint();
    const id = window.setTimeout(() => pushLive(b, key), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useLoop(running, (dt, now) => {
    const b = belt.current;
    if (!b) return;
    const tt = t.current;
    tt.wall += dt;
    if (!tt.drag) {
      tt.idle += dt;
      const ease = Math.min(1, tt.idle / 3);
      cam.current.az += dt * ((2 * Math.PI) / 150) * ease;
    }
    b.advance(dt);
    paint();
    if (now - tt.lastUi > 300) {
      tt.lastUi = now;
      pushLive(b, key);
    }
  });

  // turn the view by dragging sideways (vertical drags still scroll the page) or with the arrow keys
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    t.current.drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = t.current.drag;
    if (!d || d.id !== e.pointerId) return;
    cam.current.az -= (e.clientX - d.x) * 0.007;
    cam.current.el = Math.min(1.25, Math.max(-0.2, cam.current.el + (e.clientY - d.y) * 0.005));
    d.x = e.clientX;
    d.y = e.clientY;
    t.current.idle = 0;
    if (!running) paint();
  };
  const onUp = () => {
    t.current.drag = null;
    t.current.idle = 0;
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const c = cam.current;
    if (e.key === 'ArrowLeft') c.az += 0.12;
    else if (e.key === 'ArrowRight') c.az -= 0.12;
    else if (e.key === 'ArrowUp') c.el = Math.min(1.25, c.el + 0.08);
    else if (e.key === 'ArrowDown') c.el = Math.max(-0.2, c.el - 0.08);
    else return;
    e.preventDefault();
    t.current.idle = 0;
    if (!running) paint();
  };

  const lc = th.lossCone / DEG;
  const inside = alpha < lc;
  const rc = (L_MID * RE) / 3;
  // field-line curvature radius over the full-momentum gyroradius: below ~5 the moment is visibly not invariant
  const kappa = rc / (th.momentum / (QE * th.bEq));
  const west = th.driftRate < 0;
  const name = species === 'p' ? 'protons' : 'electrons';
  const lcFrac = (lc - 5) / (85 - 5);

  const readouts = [
    { k: 'gyroradius', v: `${fmt(th.gyroRadius / 1e3)} km`, sub: `gyro period ${fmtTime(th.gyroPeriod)}` },
    {
      k: 'bounce period',
      v: shown?.bounce ? fmtTime(shown.bounce) : '…',
      sub: inside ? 'mirror point below 100 km' : `theory ${fmtTime(th.bounce)} · mirror ±${th.mirrorLat / DEG < 10 ? (th.mirrorLat / DEG).toFixed(1) : (th.mirrorLat / DEG).toFixed(0)}°`,
    },
    {
      k: 'drift period',
      v: shown?.drift ? fmtTime(shown.drift) : '…',
      sub: `theory ${fmtTime(th.drift)} · ${west ? 'westward' : 'eastward'}`,
      hot: !inside,
    },
    { k: 'loss cone', v: `${lc.toFixed(1)}°`, sub: inside ? <span className="text-[#ec5c52]">pitch inside it: precipitating</span> : `at L = ${L_MID}; ${alpha}° is trapped` },
  ];

  const note = inside ? (
    <>
      <span className="text-[#ec5c52]">Inside the loss cone.</span> A {alpha}° pitch angle would mirror where B = B<sub>eq</sub>/sin²α, which on these shells lies below 100 km, so
      particles reach the atmosphere within half a bounce (red flashes) and are replaced at the injection site; at high energies some scatter out of the cone first.
    </>
  ) : kappa < 5 ? (
    <>
      At {mev} MeV the {species === 'p' ? 'proton' : 'electron'}&apos;s gyroradius is about 1/{kappa.toFixed(1)} of the field line&apos;s curvature radius, so the magnetic
      moment is only roughly conserved: pitch angles wander from bounce to bounce. This is the edge of stable trapping, and the integrator shows it rather than hiding it.
    </>
  ) : (
    <>
      Three motions, each roughly ten times slower than the last: {name} gyrate about the field, bounce between mirror points at ±{(th.mirrorLat / DEG).toFixed(1)}° where the field
      has risen to B<sub>eq</sub>/sin²α, and drift {west ? 'west' : 'east'} around the planet, spreading from one injected cloud into a belt.
    </>
  );

  return (
    <div>
      <div
        ref={boxRef}
        className={`${STAGE} cursor-grab touch-pan-y select-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-phos active:cursor-grabbing`}
        tabIndex={0}
        role="img"
        aria-label={`${count} ${name} of ${mev} MeV with a ${alpha} degree equatorial pitch angle, pushed by the Boris integrator through a dipole field: they gyrate, bounce between hemispheres and drift ${west ? 'west' : 'east'}. Drag or use the arrow keys to turn the view.`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <canvas ref={mainRef} className="absolute inset-0 h-full w-full" />
        <canvas ref={glowRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-90 mix-blend-screen" style={{ filter: 'blur(7px)' }} />
        <div className="pointer-events-none absolute left-3 top-3 text-[10px] lowercase tracking-[0.14em] text-faint">
          earth dipole · b0 {(B0 * 1e6).toFixed(1)} µt · l {L_MIN}–{L_MAX}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-3 hidden text-[10px] tracking-[0.1em] text-faint sm:block">drag to turn</div>
        <div className="pointer-events-none absolute bottom-3 right-3 text-right text-[10px] tracking-[0.1em] text-faint">
          <span className="hidden sm:inline">relativistic boris · </span>|Δe|/e {shown ? (shown.err < 1e-16 ? '<1e-16' : shown.err.toExponential(0)) : '…'} ·{' '}
          {shown ? `${fmt(shown.speed, 2)}×` : '…'} real time
        </div>
      </div>

      <Readouts items={readouts} />

      <div className="mt-4 grid text-[12px] leading-[1.8] text-dim" aria-live="polite">
        <p>{note}</p>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-3">
        <label className="block">
          <span className="flex items-baseline justify-between text-[11px] text-dim">
            <span>kinetic energy</span>
            <span className="tabular-nums text-bone">{mev} MeV</span>
          </span>
          <span className="mt-2 block">
            <input
              type="range"
              min={0}
              max={ENERGIES.length - 1}
              step={1}
              value={ei}
              onChange={(e) => setEi(Number(e.target.value))}
              aria-valuetext={`${mev} MeV`}
              className={RANGE}
            />
          </span>
          <span className="mt-1 flex justify-between text-[10px] text-faint">
            <span>1</span>
            <span>300 MeV</span>
          </span>
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between text-[11px] text-dim">
            <span>equatorial pitch angle</span>
            <span className="tabular-nums text-bone">{alpha}°</span>
          </span>
          <span className="relative mt-2 block">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-[3px] -translate-y-1/2 bg-[#ec5c52]/35"
              style={{ left: 5, width: `calc(${lcFrac} * (100% - 11px))` }}
            />
            <input
              type="range"
              min={5}
              max={85}
              step={1}
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              aria-valuetext={`${alpha} degrees${inside ? ', inside the loss cone' : ''}`}
              className={`relative ${RANGE}`}
            />
          </span>
          <span className="mt-1 flex justify-between text-[10px] text-faint">
            <span>5°</span>
            <span>red: loss cone</span>
            <span>85°</span>
          </span>
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between text-[11px] text-dim">
            <span>particles</span>
            <span className="tabular-nums text-bone">{count}</span>
          </span>
          <span className="mt-2 block">
            <input type="range" min={8} max={96} step={8} value={count} onChange={(e) => setCount(Number(e.target.value))} className={RANGE} />
          </span>
          <span className="mt-1 flex justify-between text-[10px] text-faint">
            <span>8</span>
            <span>96</span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        <button type="button" aria-pressed={species === 'p'} onClick={() => setSpecies('p')} className={`${TOGGLE} ${species === 'p' ? 'text-phos' : 'text-dim hover:text-bone'}`}>
          [ protons ]
        </button>
        <button type="button" aria-pressed={species === 'e'} onClick={() => setSpecies('e')} className={`${TOGGLE} ${species === 'e' ? 'text-ice' : 'text-dim hover:text-bone'}`}>
          [ electrons ]
        </button>
        <span className="w-2" aria-hidden />
        <button type="button" aria-pressed={!playing} onClick={() => onPlay(!playing)} className={`${TOGGLE} text-dim hover:text-bone`}>
          [ {playing ? 'pause' : 'play'} ]
        </button>
        <button type="button" onClick={() => setGen((g) => g + 1)} className={`${TOGGLE} text-dim hover:text-bone`}>
          [ re-inject ]
        </button>
      </div>
    </div>
  );
}
