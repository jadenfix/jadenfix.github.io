import { useEffect, useMemo, useRef, useState } from 'react';
import { reducedMotion } from '../../motion';
import { useEntered } from '../../scroll';
import { useSize } from '../simulation/useSize';
import { cheatSignal, honestSignal, noiseBar, normals, pastShift, pricePath, rng } from './math';

// The checker in three beats, on one timeline t:
//   0 to 6    a cut moves through six random dates; each signal is recomputed on
//             the data before the cut, and any past value that moves is look-ahead
//   6 to 13   the trial count N climbs 1, 2, 5, 10, 20, 50, 100, 200 and the
//             noise bar climbs with it, past a backtest that looked lucky at N = 1
//   14        the final pick, and only then does the holdout open

const DAYS = 180;
const YEARS = 3;
const CANDIDATE = 1.2;
const SCHED = [1, 2, 5, 10, 20, 50, 100, 200];
const CUT_END = 6;
const N_START = 6;
const N_END = N_START + SCHED.length - 1;
const END = N_END + 1;
const SPEED = 0.7; // beats a second

const smooth = (f: number) => f * f * (3 - 2 * f);

function nAt(t: number) {
  const u = Math.min(SCHED.length - 1, Math.max(0, t - N_START));
  const i = Math.min(SCHED.length - 2, Math.floor(u));
  const f = u - i;
  return Math.round(SCHED[i] * (SCHED[i + 1] / SCHED[i]) ** f);
}

function tForN(n: number) {
  for (let i = 0; i < SCHED.length - 1; i++) {
    if (n <= SCHED[i + 1]) return N_START + i + Math.log(n / SCHED[i]) / Math.log(SCHED[i + 1] / SCHED[i]);
  }
  return N_END;
}

function line(vals: (number | null)[], x: (t: number) => number, y: (v: number) => number) {
  let d = '';
  let pen = false;
  vals.forEach((v, t) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

export default function CheckerDemo() {
  const prices = useMemo(() => pricePath(DAYS, 7), []);
  const full = useMemo(() => ({ honest: honestSignal(prices), cheat: cheatSignal(prices) }), [prices]);
  const cuts = useMemo(() => {
    const r = rng(11);
    // six random dates, one in each sixth of the testable span
    const span = (DAYS - 60) / 6;
    return [36, ...Array.from({ length: 6 }, (_, i) => Math.round(50 + span * (i + 0.15 + 0.7 * r())))];
  }, []);
  const draws = useMemo(() => {
    const z = normals(SCHED[SCHED.length - 1], 3);
    const r = rng(5);
    return z.map((v) => ({ s: v / Math.sqrt(YEARS), j: r() }));
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  const at = useEntered(ref);
  const [cw] = useSize(ref, [680, 0]);
  const W = Math.max(280, cw);
  const narrow = W < 520;

  const [t, setT] = useState(() => (reducedMotion() ? END : 0));
  const [picked, setPicked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });

  // play once when it scrolls into view
  useEffect(() => {
    if (at === null || reducedMotion()) return;
    const id = window.setTimeout(() => setPlaying(true), at * 1000 + 500);
    return () => window.clearTimeout(id);
  }, [at]);

  useEffect(() => {
    if (!playing) return;
    // reduced motion: step a beat at a time, nothing glides
    if (reducedMotion()) {
      const id = window.setInterval(() => {
        const next = Math.min(END, Math.floor(tRef.current) + 1);
        setT(next);
        if (next >= END) setPlaying(false);
      }, 1200);
      return () => window.clearInterval(id);
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(END, tRef.current + ((now - last) / 1000) * SPEED);
      last = now;
      tRef.current = next;
      setT(next);
      if (next >= END) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = () => {
    if (!playing && t >= END) {
      tRef.current = 0;
      setT(0);
      setPicked(false);
    }
    setPlaying((p) => !p);
  };

  const step = () => {
    setPlaying(false);
    setT((v) => (v >= END ? 0 : Math.min(END, Math.floor(v + 1e-9) + 1)));
    if (t >= END) setPicked(false);
  };

  // ---- beat 1: the cut
  const ct = Math.min(CUT_END, t);
  const seg = Math.min(CUT_END - 1, Math.floor(ct));
  const pos = cuts[seg] + (cuts[seg + 1] - cuts[seg]) * smooth(ct - seg);
  const cut = Math.round(pos);
  const tested = cuts.slice(1).filter((_, i) => i + 1 <= t + 1e-9);
  const honest = pastShift(honestSignal, full.honest, prices, cut);
  const cheat = pastShift(cheatSignal, full.cheat, prices, cut);
  const cheatCaught = tested.some((c) => pastShift(cheatSignal, full.cheat, prices, c).worst > 1e-12);
  const honestPass = tested.length === CUT_END && tested.every((c) => pastShift(honestSignal, full.honest, prices, c).worst <= 1e-12);

  // ---- beat 2: the noise bar
  const N = t < N_START ? 1 : nAt(t);
  const bar = noiseBar(N, YEARS);
  const shown = draws.slice(0, N);
  const best = shown.reduce((m, d) => Math.max(m, d.s), -Infinity);
  const clears = CANDIDATE > bar;

  // ---- beat 3: the holdout
  const open = picked || t >= END;

  const stage = t < CUT_END ? 0 : t < N_END ? 1 : 2;

  // signal charts
  const SH = narrow ? 82 : 96;
  const PADX = { l: 8, r: 8 };
  const sx = (d: number) => PADX.l + (d / (DAYS - 1)) * (W - PADX.l - PADX.r);
  const sy = (v: number) => 10 + (1 - (Math.max(-3.2, Math.min(3.2, v)) + 3.2) / 6.4) * (SH - 20);

  // noise chart
  const NH = narrow ? 150 : 170;
  const LO = -1.8;
  const HI = 2.2;
  const nx = (s: number) => 12 + ((Math.max(LO, Math.min(HI, s)) - LO) / (HI - LO)) * (W - 24);
  const barLeft = nx(bar) > W * 0.62;
  const candLeft = nx(CANDIDATE) > W * 0.62;

  const signalPanel = (name: 'honest' | 'cheat', title: string, res: { trunc: (number | null)[]; worst: number }) => {
    const verdict =
      name === 'honest'
        ? honestPass
          ? { text: 'past unchanged at 6 of 6 cuts: pass', cls: 'text-phos' }
          : { text: `past unchanged so far (${tested.length} of 6 cuts)`, cls: 'text-dim' }
        : cheatCaught
          ? { text: 'reads the future: rejected', cls: 'text-ice' }
          : { text: 'not tested yet', cls: 'text-faint' };
    return (
      <div className="mt-4 first:mt-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[11.5px]">
          <span className="text-bone">{title}</span>
          <span className={verdict.cls}>{verdict.text}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${SH}`} className="mt-1.5 block h-auto w-full" role="img" aria-label={`${title}. Largest change in a past value when the future is removed: ${res.worst.toFixed(3)}`}>
          <rect x={sx(cut)} y={0} width={Math.max(0, sx(DAYS - 1) - sx(cut))} height={SH} fill="rgb(var(--c-line) / 0.35)" />
          <line x1={PADX.l} x2={W - PADX.r} y1={sy(0)} y2={sy(0)} stroke="rgb(var(--c-line))" strokeWidth={0.8} />
          {/* on all the data */}
          <path d={line(full[name], sx, sy)} fill="none" stroke="rgb(var(--c-faint))" strokeWidth={1} />
          {/* recomputed on the data before the cut */}
          <path d={line(res.trunc, sx, sy)} fill="none" stroke={name === 'honest' ? 'rgb(var(--c-phos))' : 'rgb(var(--c-ice))'} strokeWidth={1.5} />
          <line x1={sx(pos)} x2={sx(pos)} y1={0} y2={SH} stroke="rgb(var(--c-bone) / 0.8)" strokeWidth={1} />
          {cuts.slice(1).map((c, i) => (
            <line key={i} x1={sx(c)} x2={sx(c)} y1={SH - 5} y2={SH} stroke={tested.includes(c) ? 'rgb(var(--c-bone))' : 'rgb(var(--c-faint))'} strokeWidth={1} />
          ))}
          <text x={Math.min(sx(pos) + 6, W - PADX.r - 4)} y={12} fontSize="10" textAnchor={sx(pos) > W - 110 ? 'end' : 'start'} fill="rgb(var(--c-dim))">
            {sx(pos) > W - 110 ? 'cut' : 'future removed'}
          </text>
        </svg>
        <div className="mt-1 text-[11px] text-faint">
          largest change in the past <span className={`tabular-nums ${res.worst > 1e-12 ? 'text-ice' : 'text-bone'}`}>{res.worst.toFixed(3)}</span>
        </div>
      </div>
    );
  };

  const stages = ['look-ahead', 'noise bar', 'holdout'];

  return (
    <div ref={ref} className="font-mono">
      <ol className="flex flex-wrap gap-x-5 gap-y-1 text-[11px]" aria-label="Stages">
        {stages.map((s, i) => (
          <li key={s} className={i === stage ? 'text-phos' : 'text-faint'} aria-current={i === stage ? 'step' : undefined}>
            {i + 1} · {s}
          </li>
        ))}
      </ol>

      {/* 1. look-ahead */}
      <section className="mt-4 border-t border-line pt-4" aria-label="Look-ahead test">
        {signalPanel('honest', 'honest: z-score from the past only', honest)}
        {signalPanel('cheat', 'cheat: z-score from the whole sample', cheat)}
        <p className="mt-2 text-[11px] leading-[1.7] text-faint">grey: computed on all the data. bright: recomputed with everything after the cut deleted. illustrative prices, not market data.</p>
      </section>

      {/* 2. noise bar */}
      <section className="mt-5 border-t border-line pt-4" aria-label="Noise bar">
        <svg viewBox={`0 0 ${W} ${NH}`} className="block h-auto w-full" role="img" aria-label={`${N} zero-skill trials. Noise bar ${bar.toFixed(2)}. Backtest Sharpe ${CANDIDATE.toFixed(2)} ${clears ? 'clears' : 'is under'} the bar.`}>
          {[-1, 0, 1, 2].map((s) => (
            <g key={s}>
              <line x1={nx(s)} x2={nx(s)} y1={22} y2={NH - 22} stroke="rgb(var(--c-line))" strokeWidth={s === 0 ? 1 : 0.6} />
              <text x={nx(s)} y={NH - 8} textAnchor="middle" fontSize="10" fill="rgb(var(--c-faint))">
                {s < 0 ? `−${-s}` : s}
              </text>
            </g>
          ))}
          <text x={12} y={NH - 8} fontSize="10" fill="rgb(var(--c-faint))">
            {narrow ? 'sharpe' : 'annual sharpe'}
          </text>
          {shown.map((d, i) => (
            <circle key={i} cx={nx(d.s)} cy={30 + d.j * (NH - 62)} r={narrow ? 2 : 2.4} fill={d.s === best && N > 1 ? 'rgb(var(--c-bone))' : 'rgb(var(--c-dim) / 0.75)'} />
          ))}
          <line x1={nx(CANDIDATE)} x2={nx(CANDIDATE)} y1={22} y2={NH - 22} stroke="rgb(var(--c-ice))" strokeWidth={1.5} />
          <text x={nx(CANDIDATE) + (candLeft ? -6 : 6)} y={NH - 26} textAnchor={candLeft ? 'end' : 'start'} fontSize="10" fill="rgb(var(--c-ice))">
            backtest {CANDIDATE.toFixed(2)}
          </text>
          <line x1={nx(bar)} x2={nx(bar)} y1={14} y2={NH - 22} stroke="rgb(var(--c-phos))" strokeWidth={1.5} strokeDasharray="3 3" />
          <text x={nx(bar) + (barLeft ? -6 : 6)} y={14} textAnchor={barLeft ? 'end' : 'start'} fontSize="10" fill="rgb(var(--c-phos))">
            noise bar {bar.toFixed(2)}
          </text>
        </svg>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-[11.5px] sm:grid-cols-4">
          <span className="text-faint">
            trials N<span className="block tabular-nums text-bone">{N}</span>
          </span>
          <span className="text-faint">
            noise bar<span className="block tabular-nums text-phos">{bar.toFixed(2)}</span>
          </span>
          <span className="text-faint">
            best noise trial<span className="block tabular-nums text-bone">{N > 1 ? best.toFixed(2) : shown[0].s.toFixed(2)}</span>
          </span>
          <span className="text-faint">
            backtest<span className={`block ${clears ? 'text-ice' : 'text-dim'}`}>{clears ? 'clears the bar' : 'under the bar'}</span>
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-[1.7] text-faint">
          each dot is a strategy with zero skill, scored over {YEARS} years of daily data. the bar is the Sharpe the best of N of them should reach by luck.
        </p>
      </section>

      {/* 3. holdout */}
      <section className="mt-5 border-t border-line pt-4" aria-label="Holdout">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[11.5px]">
          <span className="text-bone">holdout · mid-2024 to 2026</span>
          <span className={open ? 'text-phos' : 'text-faint'}>{open ? 'opened after the final pick' : 'locked'}</span>
        </div>
        <div className="relative mt-2 overflow-hidden border border-line">
          <div className="px-4 py-4 text-[12px] leading-[1.75] text-dim">
            Scored once, after the agent declares its pick. The researcher is still running, so there is no number here yet.
          </div>
          <div
            aria-hidden={open}
            className={`absolute inset-0 flex items-center justify-center gap-4 bg-void transition-transform duration-700 ${open ? 'translate-x-full' : 'translate-x-0'}`}
            style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--c-line) / 0.6) 0 1px, transparent 1px 8px)' }}
          >
            <button
              type="button"
              tabIndex={open ? -1 : 0}
              onClick={() => setPicked(true)}
              className="min-h-[40px] bg-void px-3 text-[12px] text-bone transition-colors hover:text-phos"
              aria-label="Make the final pick and open the holdout"
            >
              [ final pick ]
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-[1.7] text-faint">before the pick, every result also faces a 1-day delay, doubled costs and known crypto factors. at most 3 ideas get frozen.</p>
      </section>

      {/* controls */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[12px]">
        <button
          type="button"
          onClick={toggle}
          className="min-h-[40px] text-bone transition-colors hover:text-phos"
          aria-label={playing ? 'Pause' : t >= END ? 'Replay' : 'Play'}
        >
          [ {playing ? 'pause' : t >= END ? 'replay' : 'play'} ]
        </button>
        <button type="button" onClick={step} className="min-h-[40px] text-bone transition-colors hover:text-phos" aria-label="Step to the next beat">
          [ step ]
        </button>
        <label className="flex min-h-[40px] flex-1 items-center gap-3 text-faint">
          N
          <input
            type="range"
            min={1}
            max={SCHED[SCHED.length - 1]}
            value={N}
            onChange={(e) => {
              setPlaying(false);
              setT(tForN(Number(e.target.value)));
            }}
            className="w-full min-w-[120px] max-w-[260px] accent-[rgb(var(--c-phos))]"
            aria-label="Number of trials N"
          />
          <span className="w-[3ch] tabular-nums text-bone">{N}</span>
        </label>
      </div>
    </div>
  );
}
