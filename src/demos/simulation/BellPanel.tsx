import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { advanceBell, ellipse, newBellRun, type BellRun, type Track } from './bell';
import type { Delft } from './data';
import { SQRT2, TSIRELSON, binomialUpperTail, chordTV, localWinBound } from './math';
import { Readouts } from './Readouts';
import { C, type PanelApi } from './theme';
import { useSize } from './useSize';

const TRIAL_MS = 110;
const HOLD_MS = 4200;

interface Props {
  delft: Delft;
  playing: boolean;
  visible: boolean;
  reduce: boolean;
  api: RefObject<PanelApi | null>;
}

export default function BellPanel({ delft, playing, visible, reduce, api }: Props) {
  const total = delft.trials.length;
  const pass = useRef(1);
  const [run, setRun] = useState<BellRun>(() => {
    const r = newBellRun(total, 1);
    if (reduce) advanceBell(r, delft.trials, total);
    return r;
  });
  const [, setFrame] = useState(0);

  const fresh = useCallback(() => {
    pass.current += 1;
    const r = newBellRun(total, pass.current);
    if (reduce) advanceBell(r, delft.trials, total);
    return r;
  }, [total, reduce, delft]);

  useEffect(() => {
    api.current = {
      step: () => {
        advanceBell(run, delft.trials, 1);
        setFrame((f) => f + 1);
      },
      reset: () => setRun(fresh()),
    };
    return () => {
      api.current = null;
    };
  }, [api, run, delft, fresh]);

  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let doneAt: number | null = null;
    const tick = (now: number) => {
      const dt = Math.min(1000, now - last);
      last = now;
      if (run.n < run.total) {
        carry += dt / TRIAL_MS;
        const count = Math.floor(carry);
        carry -= count;
        if (count > 0) {
          advanceBell(run, delft.trials, count);
          setFrame((f) => (f + 1) % 1e9);
        }
      } else {
        doneAt ??= now;
        if (now - doneAt > HOLD_MS) {
          setRun(fresh());
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, run, delft, fresh]);

  const n = run.n;
  const i = n - 1;
  const real = run.real;
  const lhv = run.lhv;
  const ready = n > 0 && !Number.isNaN(real.S[i]);
  const xi = localWinBound();
  const p = n ? binomialUpperTail(real.tally.wins, n, xi) : 1;
  const pm = (t: Track) => (n && !Number.isNaN(t.S[i]) ? `${t.S[i].toFixed(2)} ± ${t.err[i].toFixed(2)}` : '…');
  const short = (t: Track) => (n && !Number.isNaN(t.S[i]) ? t.S[i].toFixed(2) : '…');
  const pub = delft.published;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-7 items-center gap-4 text-[10px] lowercase tracking-[0.12em] text-faint" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <Swatch color={C.ice} /> delft 2015 trials
        </span>
        <span className="flex items-center gap-1.5">
          <Swatch color={C.phos} /> local model
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <Swatch color={C.red} dashed /> local bound
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <Swatch color={C.green} dashed /> tsirelson
        </span>
      </div>

      <div className="mt-2 grid h-[372px] grid-rows-[170px_minmax(0,1fr)] border border-line bg-void md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:grid-rows-1">
        <div className="relative border-b border-line md:border-b-0 md:border-r">
          <Disk run={run} />
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="relative min-h-0 flex-1">
            <SChart run={run} />
          </div>
          <TrialLog run={run} />
        </div>
      </div>

      <Readouts
        items={[
          { k: 'trials', v: `${n}/${total}`, sub: `valid, of ${delft.rawRows.toLocaleString('en-US')} heralded attempts`, color: C.bone },
          { k: 's · delft 2015', ks: 's · delft', v: pm(real), vs: short(real), sub: `published ${pub.S.toFixed(2)} ± ${pub.S_error.toFixed(2)}`, color: C.ice },
          { k: 's · local model', ks: 's · local', v: pm(lhv), vs: short(lhv), sub: `expected exactly 2 · run ${run.pass}`, color: C.phos },
          {
            k: 'p · local model',
            ks: 'p-value',
            v: n ? (p < 0.001 ? p.toExponential(1) : p.toFixed(3)) : '…',
            sub: `${real.tally.wins}/${n} wins vs ${xi.toFixed(4)}; published ${pub.p_value}`,
            color: C.bone,
          },
        ]}
      />

      <p tabIndex={0} aria-label="What this panel computes" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.line} transparent` }} className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 text-[11px] leading-[1.75] text-faint focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos">
        The ice trace replays, in recorded order, the {total} valid trials of the Delft 2015 loophole-free Bell test (Hensen et al., Nature 526, 682, 2015; data
        doi:10.4121/uuid:6e19e9b2-4a2d-40b5-8dd3-a660bf3c0a31, 4TU.ResearchData, used non-commercially with attribution), selected from the {delft.rawRows} released
        heralding attempts by the authors&apos; published filter. Each trial is a pair of random settings a, b and outcomes x, y. S = E00 + E01 + E10 - E11 with the
        paper&apos;s error bar; the p-value is P(Binomial(n, {xi.toFixed(5)}) &ge; wins), the chance a local model with the measured setting bias wins as often. The amber
        trace is a local hidden-variable simulation answering the very same settings: a shared random angle, each side reporting the sign of its own cosine. Its
        expected S is exactly 2 and it cannot do better, but a 245-trial run scatters by about ±0.2, which is why the test is the p-value and not S alone. Left: the
        canonical CHSH disk of visibility-phase quantum states (claim ST-T12), where x = S / 2√2; the red chord is S = 2, the green point is Tsirelson&apos;s 2√2,
        and ellipses are 1σ. Predictive distance from a point to the chord is (S - 2) / 8 per trial{ready && !Number.isNaN(real.px[i]) ? ` (now ${chordTV([real.px[i], real.py[i]]).toFixed(3)} for delft)` : ''}. Recomputed
        values match the paper: S = {pub.S.toFixed(2)} ± {pub.S_error.toFixed(2)}, p = {pub.p_value} (ST-F50, ST-F51, simulation-theory real_data.py). A Bell violation
        rules out local classical simulation of these correlations; it is not evidence for or against a simulated world.
      </p>
    </div>
  );
}

function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width={14} height={6} aria-hidden="true">
      <line x1={0} x2={14} y1={3} y2={3} stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? '3 2' : undefined} />
    </svg>
  );
}

function Disk({ run }: { run: BellRun }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, h] = useSize(ref, [340, 340]);
  const size = Math.min(w, h);
  const R = size / 2 - 22;
  const cx = w / 2;
  const cy = h / 2 + 2;
  const P = (x: number, y: number) => [cx + R * Math.max(-1.15, Math.min(1.15, x)), cy - R * Math.max(-1.15, Math.min(1.15, y))] as const;
  const c = 1 / SQRT2;
  const [ax, ay] = P(c, -c);
  const [bx, by] = P(c, c);
  const n = run.n;

  const trail = (t: Track) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(t.px[i])) continue;
      const [x, y] = P(t.px[i], t.py[i]);
      d += `${d ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  };
  const head = (t: Track, color: string) => {
    const i = n - 1;
    if (i < 0 || Number.isNaN(t.px[i])) return null;
    const [x, y] = P(t.px[i], t.py[i]);
    const e = ellipse(t);
    return (
      <g>
        {e && <ellipse cx={x} cy={y} rx={e.rx * R} ry={e.ry * R} transform={`rotate(-45 ${x} ${y})`} fill={color} fillOpacity={0.07} stroke={color} strokeOpacity={0.5} strokeDasharray="2 3" />}
        <circle cx={x} cy={y} r={3.2} fill={color} />
      </g>
    );
  };

  return (
    <div ref={ref} className="absolute inset-0">
      <svg width={w} height={h} role="img" aria-label="Canonical CHSH disk with the running Delft and local-model points">
        <path d={`M${ax},${ay} A${R},${R} 0 0 0 ${bx},${by} Z`} fill={C.green} fillOpacity={0.06} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.faint} strokeWidth={1} />
        <line x1={cx - R} x2={cx + R} y1={cy} y2={cy} stroke={C.line} />
        <line x1={cx} x2={cx} y1={cy - R} y2={cy + R} stroke={C.line} />
        <line x1={ax} x2={bx} y1={ay} y2={by} stroke={C.red} strokeDasharray="4 3" strokeOpacity={0.85} />
        <circle cx={cx + R} cy={cy} r={2.5} fill={C.green} />
        <text x={bx - 4} y={by - 6} textAnchor="end" fontSize={9} fill={C.red}>
          s = 2
        </text>
        <text x={cx + R + 5} y={cy - 6} fontSize={9} fill={C.green}>
          2√2
        </text>
        <text x={8} y={14} fontSize={9} fill={C.dim} className="lowercase tracking-[0.12em]">
          canonical chsh disk
        </text>
        <text x={8} y={h - 8} fontSize={9} fill={C.faint}>
          x = S / 2√2
        </text>
        <path d={trail(run.lhv)} fill="none" stroke={C.phos} strokeOpacity={0.28} strokeWidth={1} />
        <path d={trail(run.real)} fill="none" stroke={C.ice} strokeOpacity={0.28} strokeWidth={1} />
        {head(run.lhv, C.phos)}
        {head(run.real, C.ice)}
      </svg>
    </div>
  );
}

function SChart({ run }: { run: BellRun }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, h] = useSize(ref, [520, 260]);
  const left = 30;
  const right = 10;
  const top = 18;
  const bottom = 18;
  const pw = Math.max(10, w - left - right);
  const ph = Math.max(10, h - top - bottom);
  const lo = 0.8;
  const hi = 3.4;
  const T = run.total;
  const X = (i: number) => left + (i / T) * pw;
  const Y = (v: number) => top + ((hi - Math.max(lo - 0.3, Math.min(hi + 0.3, v))) / (hi - lo)) * ph;
  const n = run.n;

  const line = (t: Track) => {
    let d = '';
    for (let i = 0; i < n; i++) if (!Number.isNaN(t.S[i])) d += `${d ? 'L' : 'M'}${X(i + 1).toFixed(1)},${Y(t.S[i]).toFixed(1)}`;
    return d;
  };
  const band = (t: Track) => {
    const up: string[] = [];
    const down: string[] = [];
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(t.S[i])) continue;
      up.push(`${X(i + 1).toFixed(1)},${Y(t.S[i] + t.err[i]).toFixed(1)}`);
      down.push(`${X(i + 1).toFixed(1)},${Y(t.S[i] - t.err[i]).toFixed(1)}`);
    }
    return up.length ? `M${up.join('L')}L${down.reverse().join('L')}Z` : '';
  };

  return (
    <div ref={ref} className="absolute inset-0">
      <svg width={w} height={h} role="img" aria-label={`Running CHSH S over ${n} trials`}>
        <defs>
          <clipPath id="sim-bell-clip">
            <rect x={left} y={top} width={pw} height={ph} />
          </clipPath>
        </defs>
        {[1, 1.5, 2.5, 3].map((v) => (
          <g key={v}>
            <line x1={left} x2={left + pw} y1={Y(v)} y2={Y(v)} stroke={C.line} />
            <text x={left - 5} y={Y(v) + 3} textAnchor="end" fontSize={9} fill={C.faint}>
              {v}
            </text>
          </g>
        ))}
        <line x1={left} x2={left + pw} y1={Y(2)} y2={Y(2)} stroke={C.red} strokeDasharray="4 3" strokeOpacity={0.85} />
        <text x={left - 5} y={Y(2) + 3} textAnchor="end" fontSize={9} fill={C.red}>
          2
        </text>
        <text x={left + pw - 2} y={Y(2) + 12} textAnchor="end" fontSize={9} fill={C.red}>
          local bound
        </text>
        <line x1={left} x2={left + pw} y1={Y(TSIRELSON)} y2={Y(TSIRELSON)} stroke={C.green} strokeDasharray="4 3" strokeOpacity={0.85} />
        <text x={left + pw - 2} y={Y(TSIRELSON) - 5} textAnchor="end" fontSize={9} fill={C.green}>
          tsirelson 2√2
        </text>
        <g clipPath="url(#sim-bell-clip)">
          <path d={band(run.lhv)} fill={C.phos} fillOpacity={0.07} />
          <path d={band(run.real)} fill={C.ice} fillOpacity={0.09} />
          <path d={line(run.lhv)} fill="none" stroke={C.phos} strokeWidth={1.25} />
          <path d={line(run.real)} fill="none" stroke={C.ice} strokeWidth={1.4} />
        </g>
        <text x={left + 4} y={12} fontSize={9} fill={C.dim} className="lowercase tracking-[0.12em]">
          running chsh s, ±1σ
        </text>
        {[0, 100, 200, T].map((t) => (
          <text key={t} x={X(t)} y={h - 5} textAnchor={t === 0 ? 'start' : t === T ? 'end' : 'middle'} fontSize={9} fill={C.faint}>
            {t === 0 ? 'trial 0' : t}
          </text>
        ))}
      </svg>
    </div>
  );
}

function TrialLog({ run }: { run: BellRun }) {
  const rows: { k: number; text: string; lhv: string; win: boolean; lwin: boolean }[] = [];
  const fmt = (v: number) => (v > 0 ? '+1' : '-1');
  const real = run.real.last;
  const lhv = run.lhv.last;
  if (real && lhv) {
    const win = (real.a * real.b === 1 ? -1 : 1) * real.x * real.y === 1;
    const lwin = (lhv.a * lhv.b === 1 ? -1 : 1) * lhv.x * lhv.y === 1;
    rows.push({
      k: run.n,
      text: `#${run.n} ${real.t.slice(5, 16)} a=${real.a} b=${real.b} x=${fmt(real.x)} y=${fmt(real.y)}`,
      lhv: `x=${fmt(lhv.x)} y=${fmt(lhv.y)}`,
      win,
      lwin,
    });
  }
  return (
    <div className="h-[46px] border-t border-line px-3 py-1.5 text-[10.5px] leading-[1.6] tabular-nums" aria-live="off">
      {rows.length ? (
        rows.map((r) => (
          <div key={r.k}>
            <div className="truncate text-ice">
              {r.text} <span className={r.win ? 'text-[#8fb59a]' : 'text-faint'}>{r.win ? 'win' : 'loss'}</span>
            </div>
            <div className="truncate text-phos/90">
              local model, same settings: {r.lhv} <span className={r.lwin ? 'text-[#8fb59a]' : 'text-faint'}>{r.lwin ? 'win' : 'loss'}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="text-faint">waiting for the first trial…</div>
      )}
    </div>
  );
}
