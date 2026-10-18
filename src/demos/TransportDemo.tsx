import { useEffect, useMemo, useRef, useState } from 'react';
import { drawMain, drawStrip, iterAt, PHASES, phaseAt, TL } from './transport/draw';
import { useCanvas, useOnScreen, useReducedMotion, useSettled } from './transport/hooks';
import { framesOf, loadData, planAt, solveScene, TOL, type Data, type Scene } from './transport/scene';
import { dot, sum } from './transport/sinkhorn';

/** epsilon stops, in squared latent units; 0.1 is the repo default, and 0.02, 0.1, 0.5, 2 carry OTT-JAX ground truth */
const EPS_STOPS = [0.02, 0.03, 0.05, 0.07, 0.1, 0.15, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2] as const;
const EPS0_IDX = 4;
/** time_alpha, the repo default */
const ALPHA0 = 0.2;
const ALPHA_MAX = 0.6;
/** the tau the repo's own unbalanced test uses */
const TAU_U = 0.8;

const sci = (v: number, d = 2) => {
  if (!isFinite(v)) return 'n/a';
  const [m, e] = v.toExponential(d).split('e');
  return `${m}e${Number(e)}`;
};

const RANGE =
  'block h-5 w-full cursor-pointer appearance-none bg-transparent focus:outline-none ' +
  '[&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-[#34322e] ' +
  '[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:h-[11px] [&::-webkit-slider-thumb]:w-[11px] [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-phos [&::-webkit-slider-thumb]:bg-void ' +
  '[&::-moz-range-track]:h-px [&::-moz-range-track]:bg-[#34322e] ' +
  '[&::-moz-range-thumb]:h-[9px] [&::-moz-range-thumb]:w-[9px] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-phos [&::-moz-range-thumb]:bg-void ' +
  'focus-visible:[&::-webkit-slider-thumb]:bg-phos focus-visible:[&::-moz-range-thumb]:bg-phos';

const TOGGLE =
  'whitespace-nowrap py-1 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

function notes(d: Data, s: Scene | null): string[] {
  const { traj } = d;
  const nAtt = traj.seg.split('').filter((c) => c === 'y').length;
  const order = traj.energy.map((_, i) => i).sort((a, b) => traj.energy[b] - traj.energy[a]);
  const top = order.slice(0, 3).map((i) => `"${traj.labels[i]}" (${traj.seg[i] === 'y' ? 'attempt' : 'prompt'})`);
  let eMax = 0;
  let eMin = Infinity;
  for (let i = 0; i < traj.T; i++) {
    let n = 0;
    for (let k = 0; k < traj.D; k++) n += traj.dR[i * traj.D + k] ** 2;
    eMax = Math.max(eMax, Math.sqrt(n));
    eMin = Math.min(eMin, Math.sqrt(n));
  }
  let rMean = 0;
  for (let i = 0; i < traj.T; i++) {
    let n = 0;
    for (let k = 0; k < traj.D; k++) n += traj.R[i * traj.D + k] ** 2;
    rMean += Math.sqrt(n) / traj.T;
  }
  const share = s ? Math.round(s.changedShare * 1000) / 10 : 0;
  const uniform = Math.round((traj.changed.length / traj.T) * 1000) / 10;
  return [
    `The failing attempt y0 = "${traj.task.y0}", run through the repo's nano-LM after it has gone through the repo's CTS training path. Each point is one byte of the prompt (dim) or of the attempt (labelled), projected by P_φ to ${traj.D} dimensions and shown on its first two principal components (${Math.round((traj.pca.var[0] + traj.pca.var[1]) * 100)}% of the variance). ${traj.T} steps, ${nAtt} of them the attempt.`,
    `The critique f is embedded and the energy critic E_ψ(r_t, e_f) scores every step; the red halo grows with the score. Rings mark the bytes the corrected revision changes. The trained critic's highest scores sit on ${top.join(', ')}, not on the changed bytes: after this run it does not yet localize the error.`,
    `One gradient step down the energy, R* = R − η ∇U with η = ${traj.eta} and α_t = 1/T, gives the pseudo-target. The edit is ${sci(eMin, 1)} to ${sci(eMax, 1)} per step against states of norm about ${rMean.toFixed(1)}, so the arrows are drawn magnified; unmagnified, R* sits on top of R.`,
    'Log-domain Sinkhorn on the time-augmented 32-dimensional states, from OTT’s zero start, finished by Newton steps on the dual. Because R* is so close to R, almost all of each step’s mass stays with its own copy (halos); raise ε to see it spread to neighbours in latent space. The matrix is the same plan, row by row.',
    `Arrows and bars are the gradient of the debiased divergence on each step, the same signal OTT-JAX differentiates. ${share}% of it lands on the changed bytes, against ${uniform}% for an outcome-only advantage spread evenly (dotted line). With this critic, the alignment term has nothing to concentrate.`,
  ];
}

export default function TransportDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stripBoxRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLCanvasElement>(null);
  const { visible, seen } = useOnScreen(wrapRef);
  const reduce = useReducedMotion();

  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    const ac = new AbortController();
    loadData(ac.signal)
      .then(setData)
      .catch((e: unknown) => {
        if (!ac.signal.aborted) {
          console.error('transport demo: could not load data', e);
          setLoadError(true);
        }
      });
    return () => ac.abort();
  }, []);

  const [epsIdx, setEpsIdx] = useState(EPS0_IDX);
  const [alpha, setAlpha] = useState(ALPHA0);
  const [tau, setTau] = useState(1);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduce;
  const running = playing && visible && data !== null;
  const eps = EPS_STOPS[epsIdx];

  // solve once the slider rests, so a drag never waits on Sinkhorn
  const sEps = useSettled(eps, 120);
  const sAlpha = useSettled(alpha, 120);
  const scene = useMemo(() => (data ? solveScene(data, { eps: sEps, alpha: sAlpha, tau }) : null), [data, sEps, sAlpha, tau]);
  const K = scene ? framesOf(scene) : 0;

  useEffect(() => {
    if (scene?.parity && !scene.parity.ok) console.error('transport demo: browser Sinkhorn disagrees with OTT-JAX', scene.parity);
  }, [scene]);

  // per-frame state lives in a ref; React only hears about phase and iterate changes
  const sim = useRef({ t: reduce ? TL.settled : 0, P: new Float64Array(0) });
  const [phase, setPhase] = useState(() => phaseAt(sim.current.t));
  const [k, setK] = useState(() => iterAt(sim.current.t, K));

  const frame = () => {
    if (!data || !scene) return null;
    const s = sim.current;
    if (s.P.length !== data.traj.T * data.traj.T) s.P = new Float64Array(data.traj.T * data.traj.T);
    planAt(scene, iterAt(s.t, K), s.P);
    return { t: s.t, data, scene, P: s.P };
  };
  const blank = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#0b0b0a';
    ctx.fillRect(0, 0, w, h);
  };
  const repaintMain = useCanvas(boxRef, canvasRef, (ctx, w, h) => {
    const f = frame();
    if (f) drawMain(ctx, w, h, f);
    else blank(ctx, w, h);
  });
  const repaintStrip = useCanvas(stripBoxRef, stripRef, (ctx, w, h) => {
    const f = frame();
    if (f) drawStrip(ctx, w, h, f);
    else blank(ctx, w, h);
  });
  const paint = useRef(() => {});
  useEffect(() => {
    paint.current = () => {
      repaintMain();
      repaintStrip();
    };
  });

  const sync = () => {
    const t = sim.current.t;
    setPhase(phaseAt(t));
    setK(iterAt(t, K));
  };
  const syncRef = useRef(sync);
  useEffect(() => {
    syncRef.current = sync;
  });

  // a new solve replays the transport; with no motion it lands on the settled state
  const firstScene = useRef(true);
  useEffect(() => {
    if (!scene) return;
    if (firstScene.current) {
      firstScene.current = false;
    } else {
      const s = sim.current;
      if (!running) s.t = TL.settled;
      else if (s.t >= TL.transport) s.t = TL.transport;
    }
    syncRef.current();
    paint.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    if (!running) {
      paint.current();
      return;
    }
    let raf = 0;
    let last = performance.now();
    let lastPhase = -1;
    let lastK = -1;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      s.t += dt;
      if (s.t >= TL.end) s.t = 0;
      const ph = phaseAt(s.t);
      const kk = iterAt(s.t, K);
      if (ph !== lastPhase || kk !== lastK) {
        lastPhase = ph;
        lastK = kk;
        syncRef.current();
      }
      paint.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, K]);

  const replay = () => {
    sim.current.t = 0;
    setUserPlaying(true);
    sync();
    paint.current();
  };
  const reset = () => {
    setEpsIdx(EPS0_IDX);
    setAlpha(ALPHA0);
    setTau(1);
  };

  // the readouts follow the iterate on screen while the plan settles
  const live = phase === 3;
  const kShown = live ? k : K;
  const liveStats = useMemo(() => {
    if (!scene) return null;
    const P = planAt(scene, kShown);
    return { cost: dot(P, scene.div.Cxy), mass: sum(P), iter: scene.div.xy.history[Math.min(kShown, K)]?.iter ?? 0 };
  }, [scene, kShown, K]);
  const balanced = tau >= 1;
  const T = data?.traj.T ?? 0;
  const share = scene ? Math.round(scene.changedShare * 1000) / 10 : 0;
  const uniform = data ? Math.round((data.traj.changed.length / T) * 1000) / 10 : 0;
  const par = scene?.parity ?? null;
  const xy = scene?.div.xy;
  const allConverged = scene ? scene.div.xy.converged && scene.div.xx.converged && scene.div.yy.converged : false;

  const readouts: [string, string, string, boolean][] = [
    [
      'sinkhorn sweeps',
      xy && liveStats ? (live ? String(liveStats.iter) : String(xy.iters)) : '...',
      !xy ? 'loading' : live ? 'plan settling' : `${xy.newtonSteps ? `+ ${xy.newtonSteps} newton, ` : ''}${allConverged ? `err < ${balanced ? '1e-12' : '1e-14'}` : 'not converged'}`,
      !live && allConverged,
    ],
    [
      'sinkhorn divergence',
      scene ? sci(scene.div.value) : '...',
      par ? `OTT-JAX ${sci(par.preset.loss)} · Δ ${sci(par.lossRel, 0)}` : scene ? 'no OTT preset at this ε, α' : '',
      par?.ok ?? false,
    ],
    ['mass moved', liveStats ? (live ? liveStats.mass : (scene?.mass ?? 0)).toFixed(3) : '...', balanced ? 'fixed by the marginals' : `τ = ${TAU_U} lets it drift`, false],
    ['changed-byte signal', scene ? `${share}%` : '...', `outcome-only: ${uniform}%`, phase === 4],
  ];

  const toggles: { label: string; on: boolean; act: () => void }[] = [
    { label: 'balanced', on: balanced, act: () => setTau(1) },
    { label: `unbalanced τ ${TAU_U}`, on: !balanced, act: () => setTau(TAU_U) },
  ];

  const noteList = data ? notes(data, scene) : [];
  const y0 = data?.traj.task.y0 ?? '';
  const nx = data ? data.traj.task.x.length + 2 : 0;
  const changedLocal = new Set((data?.traj.changed ?? []).map((i) => i - nx));
  const repo = data?.gt.repoDefault;

  return (
    <div ref={wrapRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1s ease' }}>
      <div ref={boxRef} className="relative aspect-square w-full overflow-hidden border border-line bg-void sm:aspect-[16/9]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={
            data
              ? `The repo's nano-LM trajectory for the failing attempt "${y0}" (${T} steps, projected to 2D) and its critique-edited target, joined by an entropic transport plan. Epsilon ${sEps}, time weight ${sAlpha.toFixed(2)}, ${balanced ? 'balanced' : 'unbalanced'}. ${share} percent of the alignment signal lands on the bytes the revision changes.`
              : 'Loading the transport demo data.'
          }
        />
        <div className="pointer-events-none absolute left-3 top-3 text-[10px] lowercase tracking-[0.14em]" aria-hidden>
          <span className="hidden sm:inline">
            {PHASES.map((p, i) => (
              <span key={p} className={`mr-3 ${i === phase ? 'text-phos' : 'text-faint'}`}>
                {String(i + 1).padStart(2, '0')} {p}
              </span>
            ))}
          </span>
          <span className="text-phos sm:hidden">
            {String(phase + 1).padStart(2, '0')} / 05 {PHASES[phase]}
          </span>
        </div>
        {phase === 2 && data ? (
          <div className="pointer-events-none absolute right-3 top-3 text-[10px] tracking-[0.1em] text-ice" aria-hidden>
            edit drawn magnified
          </div>
        ) : null}
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-[78%] text-[10px] leading-snug sm:text-[11px]" aria-hidden>
          {data ? (
            <>
              <div className="text-dim">
                y0{' '}
                {y0.split('').map((c, i) => (
                  <span key={i} className={changedLocal.has(i) && phase >= 1 ? 'text-[#ec5c52]' : 'text-bone'}>
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-0.5 text-[#ec5c52] transition-opacity duration-700" style={{ opacity: phase >= 1 ? 0.9 : 0 }}>
                f {data.traj.task.f}
              </div>
            </>
          ) : (
            <span className="text-faint">{loadError ? 'could not load the trajectory data' : 'loading trajectory'}</span>
          )}
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 hidden text-[10px] tracking-[0.1em] text-faint sm:block">nano-lm · pca 2d</div>
      </div>

      <div className="border-x border-b border-line px-3 pb-2 pt-3 sm:px-4">
        <div className="mb-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[10px] lowercase tracking-[0.1em] text-dim">
          <span>
            {phase >= 4 ? (
              <>
                pull on each step <span className="text-faint">· </span>
                <span className="text-ice">dotted: outcome-only</span>
              </>
            ) : (
              <span className="text-[#ec5c52]">critic energy on each step</span>
            )}
          </span>
          <span>plan p · rows: attempt</span>
        </div>
        <div ref={stripBoxRef} className="relative h-[112px] w-full sm:h-[136px]">
          <canvas
            ref={stripRef}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`Bars: the critic energy, then the alignment signal, on each of the ${T} steps; ${share} percent of the signal is on the changed bytes. Matrix: the transport plan, attempt steps by target steps.`}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 border-x border-b border-line sm:grid-cols-4">
        {readouts.map(([key, v, sub, hot], i) => (
          <div
            key={key}
            className={`min-w-0 px-3 py-3 sm:px-4 ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`}
          >
            <dt className="text-[10px] lowercase tracking-[0.14em] text-dim">{key}</dt>
            <dd className={`mt-1 font-serif text-[26px] leading-none tabular-nums ${hot ? 'text-phos' : 'text-bone'}`}>{v}</dd>
            <dd className="mt-1 truncate text-[10px] text-faint" title={sub}>
              {sub}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid text-[12px] leading-[1.8] text-dim">
        {noteList.map((n, i) => (
          <p key={i} className={`col-start-1 row-start-1 ${i === phase ? '' : 'invisible'}`} aria-hidden={i !== phase}>
            <span className="text-faint">{String(i + 1).padStart(2, '0')} </span>
            {n}
          </p>
        ))}
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <label className="block">
          <span className="flex items-baseline justify-between text-[11px] text-dim">
            <span>
              <span className="text-bone">ε</span> entropic blur
            </span>
            <span className="tabular-nums text-bone">{eps}</span>
          </span>
          <span className="mt-2 block">
            <input
              type="range"
              min={0}
              max={EPS_STOPS.length - 1}
              step={1}
              value={epsIdx}
              onChange={(ev) => setEpsIdx(Number(ev.target.value))}
              aria-valuetext={`epsilon ${eps}${epsIdx === EPS0_IDX ? ', the repo default' : ''}`}
              className={RANGE}
            />
          </span>
          <span className="mt-1 flex justify-between text-[10px] text-faint">
            <span>{EPS_STOPS[0]} sharp</span>
            <span>repo default 0.1</span>
            <span>{EPS_STOPS[EPS_STOPS.length - 1]} blurred</span>
          </span>
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between text-[11px] text-dim">
            <span>
              <span className="text-bone">α</span> time weight
            </span>
            <span className="tabular-nums text-bone">{alpha.toFixed(2)}</span>
          </span>
          <span className="mt-2 block">
            <input
              type="range"
              min={0}
              max={ALPHA_MAX}
              step={0.01}
              value={alpha}
              onChange={(ev) => setAlpha(Number(ev.target.value))}
              aria-valuetext={`time weight ${alpha.toFixed(2)}${alpha === ALPHA0 ? ', the repo default' : ''}`}
              className={RANGE}
            />
          </span>
          <span className="mt-1 flex justify-between text-[10px] text-faint">
            <span>0 space only</span>
            <span>repo default {ALPHA0}</span>
            <span>{ALPHA_MAX}</span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        {toggles.map((b) => (
          <button key={b.label} type="button" aria-pressed={b.on} onClick={b.act} className={`${TOGGLE} ${b.on ? 'text-phos' : 'text-dim hover:text-bone'}`}>
            [ {b.label} ]
          </button>
        ))}
        <button type="button" aria-pressed={!playing} onClick={() => setUserPlaying(!playing)} className={`${TOGGLE} text-dim hover:text-bone`}>
          [ {playing ? 'pause' : 'play'} ]
        </button>
        <button type="button" onClick={replay} className={`${TOGGLE} text-dim hover:text-bone`}>
          [ replay ]
        </button>
        <button type="button" onClick={reset} className={`${TOGGLE} ${epsIdx === EPS0_IDX && alpha === ALPHA0 && balanced ? 'text-faint' : 'text-dim hover:text-bone'}`}>
          [ reset ]
        </button>
      </div>

      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-[1.8] text-faint">
        Real artifacts from the repo, not model results. The latents come from its local path: <span className="text-dim">cts.train.main method=cts task=fixtures_math backend=local_nano</span>{' '}
        trained for two optimizer steps on the five training fixtures (the same scale as the repo&apos;s own demo receipt), then the trained nano-LM, projection P_φ,
        critique embedding and EnergyCritic are read out for fixture {data?.traj.task.id ?? 'gsm8k_tiny_0'} and R* comes from the repo&apos;s edit_trajectory. The
        nano-LM is tiny and almost untrained, so the critic does not yet point at the error; nothing here says CTS improves a trained policy, which is not
        established. The 2D view is PCA computed in Python; Sinkhorn runs on the full 32-dimensional time-augmented states in your browser and computes OTT&apos;s
        regularized cost, unbalanced marginal penalties included, and the exact gradient with R* held fixed. At ε ∈ {'{'}0.02, 0.1, 0.5, 2{'}'} and α ∈ {'{'}0, 0.2,
        0.6{'}'} it is checked against OTT-JAX {data?.traj.source.ott ?? ''} in float64: loss within {sci(TOL.lossRel, 0)} relative, per-step gradient norms within{' '}
        {sci(TOL.gradRel, 0)} of the largest, plan entries within {sci(TOL.planAbs, 0)}
        {par ? (par.ok ? '; this setting passes.' : '; this setting fails the check.') : '.'}
        {repo ? ` The repo's default float32 call with 50 iterations returns ${sci(repo.balanced.loss)} (balanced) here: the true divergence is below float32 resolution.` : ''}
      </p>
    </div>
  );
}
