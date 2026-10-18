import { useEffect, useMemo, useRef, useState } from 'react';
import { advanceParcels, DAYS_PER_S, drawWind, makeParcels, type Parcels } from './drawWind.ts';
import { AU, criticalRadius, DAY, integrateCraft, parkerSpeed, sailForces, SOLAR_RADIUS, soundSpeed, SpeedTable, VEHICLE, windAt, windModel, type SailMode } from './parker.ts';
import Readouts from './Readouts.tsx';
import { compositeGlow, fmt, RANGE, STAGE, TOGGLE, useLoop, useStageCanvases } from './stage.ts';

const T0 = 0.8;
const YEARS = 3;
const MU_SUN = 1.32712440018e20;
const MODES: { id: SailMode; label: string }[] = [
  { id: 'off', label: 'no sail' },
  { id: 'photon', label: 'photon sail' },
  { id: 'esail', label: '+ electric sail' },
];

export default function SolarWindMode({ running, playing, onPlay }: { running: boolean; playing: boolean; onPlay: (v: boolean) => void }) {
  const [tMK, setTMK] = useState(T0);
  const [sail, setSail] = useState<SailMode>('esail');
  const model = useMemo(() => windModel(tMK * 1e6), [tMK]);
  const table = useMemo(() => new SpeedTable(model), [model]);
  const track = useMemo(() => integrateCraft(model, sail, YEARS), [model, sail]);
  const at1 = useMemo(() => windAt(model, AU), [model]);
  const vRef = useMemo(() => parkerSpeed(model, AU), [model]);
  const [rNow, setRNow] = useState({ key: '', r: 1, day: 0 });
  const key = `${tMK}-${sail}`;

  const sim = useRef({ tWind: 0, tCraft: 0, lastUi: 0 });
  const parcels = useRef<Parcels | null>(null);

  const craftAt = (k: number) => {
    const n = track.x.length;
    const i = Math.min(n - 1, k);
    const i0 = Math.max(0, i - 1);
    const pos: [number, number] = [track.x[i], track.y[i]];
    const vel: [number, number] = i === 0 ? [0, 1] : [(track.x[i] - track.x[i0]) / track.step, (track.y[i] - track.y[i0]) / track.step];
    return { pos, f: sailForces(model, sail, pos, vel, vRef) };
  };

  const paint = () => {
    const main = mainRef.current;
    const glow = glowRef.current;
    const lay = layer.current;
    const { w, h, dpr } = size.current;
    if (!main || !glow || !lay || !w) return;
    if (!parcels.current) parcels.current = makeParcels(table, w < 500 ? 900 : 1500);
    const ctx = main.getContext('2d');
    const lctx = lay.getContext('2d');
    if (!ctx || !lctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = Math.min(track.x.length - 1, Math.floor(sim.current.tCraft / track.step));
    const { pos, f } = craftAt(k);
    const r = Math.hypot(pos[0], pos[1]) / AU;
    drawWind(ctx, lctx, w, h, model, table, parcels.current, sim.current.tWind, {
      track,
      k,
      normal: f.normal,
      force: [f.radiation[0] + f.esail[0], f.radiation[1] + f.esail[1]],
      on: sail !== 'off',
      label: `craft ${r.toFixed(3)} au`,
    });
    compositeGlow(main, glow, lay);
  };
  const { boxRef, mainRef, glowRef, size, layer } = useStageCanvases(() => paint());

  // a new temperature resamples the steady wind
  useEffect(() => {
    if (size.current.w) parcels.current = makeParcels(table, size.current.w < 500 ? 900 : 1500);
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
  // a new sail restarts the craft from 1 au; when still, show it a year and a half out so the track reads
  useEffect(() => {
    sim.current.tCraft = running ? 0 : 1.5 * 365.25 * DAY;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  useLoop(running, (dt, now) => {
    const s = sim.current;
    const dtSim = dt * DAYS_PER_S * DAY;
    s.tWind += dtSim;
    s.tCraft += dtSim;
    if (s.tCraft >= YEARS * 365.25 * DAY) s.tCraft = 0;
    if (parcels.current) advanceParcels(parcels.current, table, dtSim);
    paint();
    if (now - s.lastUi > 300) {
      s.lastUi = now;
      const k = Math.min(track.x.length - 1, Math.floor(s.tCraft / track.step));
      setRNow({ key, r: Math.hypot(track.x[k], track.y[k]) / AU, day: s.tCraft / DAY });
    }
  });

  const f0 = sailForces(model, sail, [AU, 0], [0, Math.sqrt(MU_SUN / AU)], vRef);
  const acc = Math.hypot(f0.radiation[0] + f0.esail[0], f0.radiation[1] + f0.esail[1]) / VEHICLE.mass;
  const photonAcc = Math.hypot(f0.radiation[0], f0.radiation[1]) / VEHICLE.mass;
  const gSun = MU_SUN / (AU * AU);
  const last = track.x.length - 1;
  const rEnd = Math.hypot(track.x[last], track.y[last]) / AU;
  const live = rNow.key === key ? rNow : null;
  const rc = criticalRadius(model);
  const rLive = live ? live.r.toFixed(3) : '1.000';

  const readouts = [
    { k: 'wind at 1 au', v: `${fmt(at1.speed / 1e3)} km/s`, sub: `isothermal parker, ${tMK.toFixed(2)} MK`, hot: true },
    { k: 'sonic point', v: (
        <>
          {fmt(rc / SOLAR_RADIUS)} R<sub className="font-mono text-[11px] text-dim">sun</sub>
        </>
      ), sub: `${fmt(rc / AU, 2)} au · sound speed ${fmt(soundSpeed(model) / 1e3)} km/s` },
    { k: 'spiral angle', v: `${at1.spiralDeg.toFixed(1)}°`, sub: `|B| ${fmt(at1.b * 1e9)} nT · n ${fmt(at1.density / 1e6)} cm⁻³` },
    {
      k: 'sail thrust',
      v: sail === 'off' ? '0' : `${fmt(acc * 1e3)} mm/s²`,
      sub: sail === 'off' ? `keplerian · r ${rLive} au` : `${fmt((acc / gSun) * 100, 2)}% of gravity · r ${rLive} au`,
    },
  ];

  const note =
    sail === 'off' ? (
      <>
        Every parcel of wind flies straight out from the Sun, yet the field it carries stays anchored to a rotating surface, so each line winds into a spiral{' '}
        {at1.spiralDeg.toFixed(0)}° from radial at 1 au. Brighter parcels are the ones threaded on a drawn line right now.
      </>
    ) : sail === 'photon' ? (
      <>
        The engine&apos;s default craft: 12 kg and a 100 m² sail of 88% reflectivity held 25° off the Sun line. Light pressure gives {fmt(photonAcc * 1e3)} mm/s², about{' '}
        {fmt((photonAcc / gSun) * 100, 2)}% of solar gravity, and the tilt turns part of it prograde: in {YEARS} years the orbit grows to {rEnd.toFixed(2)} au.
      </>
    ) : (
      <>
        Add a 20 km tether at 20 kV. Its sheath is {fmt(f0.esailRadius)} m wide, {fmt(f0.esailRadius / at1.debye, 2)} Debye lengths, so the wind pushes{' '}
        {fmt((acc - photonAcc) / Math.max(photonAcc, 1e-12), 2)}× harder than the light; the orbit reaches {rEnd.toFixed(2)} au in {YEARS} years. Its drag and lift coefficients
        are the engine&apos;s unvalidated inputs, not measurements.
      </>
    );

  return (
    <div>
      <div
        ref={boxRef}
        className={STAGE}
        role="img"
        aria-label={`Top-down view of the Parker solar wind at ${tMK.toFixed(2)} million kelvin: parcels stream radially outward at ${fmt(at1.speed / 1e3)} km/s at 1 au while the magnetic field they carry winds into a spiral ${at1.spiralDeg.toFixed(0)} degrees from radial. A sail craft starting at 1 au ${sail === 'off' ? 'stays on a circular orbit' : `spirals out to ${rEnd.toFixed(2)} au over ${YEARS} years`}.`}
      >
        <canvas ref={mainRef} className="absolute inset-0 h-full w-full" />
        <canvas ref={glowRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-90 mix-blend-screen" style={{ filter: 'blur(6px)' }} />
        <div className="pointer-events-none absolute left-3 top-3 text-[10px] lowercase tracking-[0.14em] text-faint">ecliptic · north up · {DAYS_PER_S} days / s</div>
        <div className="pointer-events-none absolute bottom-3 right-3 text-right text-[10px] tracking-[0.1em] text-faint">
          t = {live ? Math.floor(live.day) : 0} d · rk4, 6 h steps
        </div>
      </div>

      <Readouts items={readouts} />

      <div className="mt-4 text-[12px] leading-[1.8] text-dim" aria-live="polite">
        <p>{note}</p>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <label className="block">
          <span className="flex items-baseline justify-between text-[11px] text-dim">
            <span>coronal temperature</span>
            <span className="tabular-nums text-bone">{tMK.toFixed(2)} MK</span>
          </span>
          <span className="mt-2 block">
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={tMK}
              onChange={(e) => setTMK(Number(e.target.value))}
              aria-valuetext={`${tMK.toFixed(2)} million kelvin`}
              className={RANGE}
            />
          </span>
          <span className="mt-1 flex justify-between text-[10px] text-faint">
            <span>0.5</span>
            <span>hotter: faster, straighter</span>
            <span>2.0</span>
          </span>
        </label>
        <div className="flex flex-wrap content-start items-baseline gap-x-4 gap-y-1 text-[12px] sm:pt-5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={sail === m.id}
              onClick={() => setSail(m.id)}
              className={`${TOGGLE} ${sail === m.id ? 'text-phos' : 'text-dim hover:text-bone'}`}
            >
              [ {m.label} ]
            </button>
          ))}
          <span className="w-2" aria-hidden />
          <button type="button" aria-pressed={!playing} onClick={() => onPlay(!playing)} className={`${TOGGLE} text-dim hover:text-bone`}>
            [ {playing ? 'pause' : 'play'} ]
          </button>
        </div>
      </div>
    </div>
  );
}
