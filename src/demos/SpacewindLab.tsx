import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import OrbitLab from './OrbitLab';
import { useOnScreen, useReducedMotion } from './orbit/hooks';
import MagnetosphereMode from './spacewind/MagnetosphereMode.tsx';
import SolarWindMode from './spacewind/SolarWindMode.tsx';
import { TOGGLE } from './spacewind/stage.ts';

type Mode = 'magnetosphere' | 'solar wind' | 'orbit';

const MODES: { id: Mode; module: string; caption: string }[] = [
  {
    id: 'magnetosphere',
    module: 'src/plasma.c · sw_relativistic_boris_push',
    caption:
      'Real-time port of the engine’s relativistic Boris pusher, one fixed step per particle at its strongest field; the aligned Earth dipole it moves through is the demo’s, since the engine has no planetary field.',
  },
  {
    id: 'solar wind',
    module: 'src/fields.c · src/spacecraft.c',
    caption:
      'The engine’s isothermal Parker solution and spiral field with its default parameters (streams and turbulence off), and its photon and electric-sail force laws flown by RK4 from 1 au.',
  },
  {
    id: 'orbit',
    module: 'src/metric.c · schwarzschild geodesics',
    caption: 'Timelike Schwarzschild geodesics, the engine’s geometry layer, in the orbit-equation form; the precession is exact general relativity, not the 1PN correction.',
  },
];

export default function SpacewindLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { visible, seen } = useOnScreen(wrapRef);
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>('magnetosphere');
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduce;
  const running = playing && visible;
  const m = MODES.find((x) => x.id === mode) ?? MODES[0];

  return (
    <div ref={wrapRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1.2s ease' }}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]" role="group" aria-label="simulation">
          {MODES.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={mode === x.id}
              onClick={() => setMode(x.id)}
              className={`${TOGGLE} ${mode === x.id ? 'text-phos' : 'text-dim hover:text-bone'}`}
            >
              [ {x.id} ]
            </button>
          ))}
        </div>
        <div className="text-[10px] tracking-[0.1em] text-faint">mirrors {m.module}</div>
      </div>

      <motion.div key={mode} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
        {mode === 'magnetosphere' && <MagnetosphereMode running={running} playing={playing} onPlay={setUserPlaying} />}
        {mode === 'solar wind' && <SolarWindMode running={running} playing={playing} onPlay={setUserPlaying} />}
        {mode === 'orbit' && <OrbitLab />}
      </motion.div>

      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-[1.8] text-faint">{m.caption}</p>
    </div>
  );
}
