/**
 * The scene: a real failing attempt from the repo's local CTS path, the repo's energy critic and latent
 * edit, and the CTS alignment term between them, solved in the browser and checked against OTT-JAX.
 *
 *   models/energy.py   U(R, f) = sum_t alpha_t E(r_t, e_f), alpha_t = 1/T; R* = R - eta grad_R U
 *   methods/b5_cts.py  align = alignment_loss(R_theta, stop_gradient(R*))
 *   losses/sinkhorn.py OTT sinkhorn_divergence on time-augmented points
 *
 * The data (public/data/transport/*.json) is exported by a script that runs the repo's own
 * `cts.train.main method=cts task=fixtures_math backend=local_nano` and then reads the trained nano-LM,
 * projection P_phi, critique embedding and EnergyCritic. Nothing in this file invents a number.
 */
import { divergence, sum, type Divergence } from './sinkhorn';

export type Trajectory = {
  source: { repo: string; commit: string; command: string; jax: string; ott: string };
  task: { id: string; x: string; y0: string; f: string; y1: string; errorTags: string[] };
  T: number;
  D: number;
  eta: number;
  /** the byte token at each step */
  labels: string[];
  /** per step: x prompt, y attempt, s special (BOS, SEP, EOS) */
  seg: string;
  /** steps of y0 that the corrected revision y1 changes (character diff) */
  changed: number[];
  /** projected states R = P_phi(h), flat [T, D] */
  R: number[];
  /** R* - R from edit_trajectory, flat [T, D] */
  dR: number[];
  /** E_psi(r_t, e_f) per step, after training and at initialization */
  energy: number[];
  energyInit: number[];
  U: { bad: number; ref: number; badInit: number; refInit: number };
  /** display projection: 2D = (r - mean) W, W is [D, 2] */
  pca: { mean: number[]; W: number[]; var: number[] };
};

export type GtPreset = {
  eps: number;
  alpha: number;
  tau: number;
  loss: number;
  gradNorm: number[];
  grad2d: number[][];
  mass: number;
  cost: number;
  ottIters: number[];
  converged: boolean[];
  plan?: { idx: number[]; val: number[] };
};

export type GroundTruth = {
  solver: string;
  eps0: number;
  alpha0: number;
  tauU: number;
  presets: GtPreset[];
  repoDefault: { balanced: { loss: number }; unbalanced: { loss: number } };
};

export type Data = {
  traj: Trajectory;
  gt: GroundTruth;
  /** R and R* as flat float arrays */
  R: Float64Array;
  Rs: Float64Array;
  /** 2D display coordinates */
  p2: [number, number][];
  /** the edit R* - R in display coordinates (tiny; drawn magnified) */
  e2: [number, number][];
  view: { x0: number; x1: number; y0: number; y1: number };
};

const BASE = `${import.meta.env.BASE_URL}data/transport/`;

export async function loadData(signal?: AbortSignal): Promise<Data> {
  const [traj, gt] = await Promise.all([
    fetch(`${BASE}trajectory.json`, { signal }).then((r) => r.json() as Promise<Trajectory>),
    fetch(`${BASE}ground-truth.json`, { signal }).then((r) => r.json() as Promise<GroundTruth>),
  ]);
  return prepare(traj, gt);
}

export function prepare(traj: Trajectory, gt: GroundTruth): Data {
  const { T, D } = traj;
  const R = Float64Array.from(traj.R);
  const Rs = Float64Array.from(traj.R, (v, k) => v + traj.dR[k]);
  const { mean, W } = traj.pca;
  const p2: [number, number][] = [];
  const e2: [number, number][] = [];
  for (let i = 0; i < T; i++) {
    let x = 0;
    let y = 0;
    let dx = 0;
    let dy = 0;
    for (let k = 0; k < D; k++) {
      const c = R[i * D + k] - mean[k];
      x += c * W[k * 2];
      y += c * W[k * 2 + 1];
      dx += traj.dR[i * D + k] * W[k * 2];
      dy += traj.dR[i * D + k] * W[k * 2 + 1];
    }
    p2.push([x, y]);
    e2.push([dx, dy]);
  }
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, y] of p2) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const px = 0.06 * (x1 - x0);
  const py = 0.06 * (y1 - y0);
  return { traj, gt, R, Rs, p2, e2, view: { x0: x0 - px, x1: x1 + px, y0: y0 - py, y1: y1 + py } };
}

export type Params = { eps: number; alpha: number; tau: number };

/** agreement with OTT-JAX, when the current setting is one of the exported presets */
export type Parity = {
  preset: GtPreset;
  /** |S - S_ott| / |S_ott| */
  lossRel: number;
  /** max_t | |grad_t| - |grad_t|_ott | / max_t |grad_t|_ott */
  gradRel: number;
  /** max_ij |P_ij - P_ott,ij|, or null when the plan was not exported for this preset */
  planAbs: number | null;
  ok: boolean;
};

/** the tolerances the demo asserts */
export const TOL = { lossRel: 1e-5, gradRel: 1e-6, planAbs: 1e-7 } as const;

export type Scene = {
  params: Params;
  div: Divergence;
  /** total mass of the cross plan */
  mass: number;
  /** per-step |dS/dr_t| (full dimension) and the descent direction -dS/dr_t in display coordinates */
  signal: number[];
  pull: [number, number][];
  /** share of the summed pull that lands on the steps the revision changes */
  changedShare: number;
  parity: Parity | null;
};

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

export function solveScene(data: Data, params: Params): Scene {
  const { traj, R, Rs } = data;
  const { T, D } = traj;
  const div = divergence(R, Rs, T, D, params.alpha, { eps: params.eps, tau: params.tau, record: true });
  const W = traj.pca.W;
  const signal: number[] = [];
  const pull: [number, number][] = [];
  for (let i = 0; i < T; i++) {
    let s = 0;
    let gx = 0;
    let gy = 0;
    for (let k = 0; k < D; k++) {
      const g = div.grad[i * D + k];
      s += g * g;
      gx += g * W[k * 2];
      gy += g * W[k * 2 + 1];
    }
    signal.push(Math.sqrt(s));
    pull.push([-gx, -gy]);
  }
  const total = signal.reduce((a, b) => a + b, 0) || 1;
  const changedShare = traj.changed.reduce((a, i) => a + signal[i], 0) / total;
  const preset = data.gt.presets.find((p) => close(p.eps, params.eps) && close(p.alpha, params.alpha) && close(p.tau, params.tau)) ?? null;
  return { params, div, mass: sum(div.P), signal, pull, changedShare, parity: preset ? checkParity(div, signal, preset, T) : null };
}

export function checkParity(div: Divergence, signal: number[], p: GtPreset, T: number): Parity {
  const lossRel = Math.abs(div.value - p.loss) / Math.abs(p.loss);
  let gmax = 0;
  let gerr = 0;
  for (let i = 0; i < T; i++) {
    gmax = Math.max(gmax, p.gradNorm[i]);
    gerr = Math.max(gerr, Math.abs(signal[i] - p.gradNorm[i]));
  }
  const gradRel = gerr / (gmax || 1);
  let planAbs: number | null = null;
  if (p.plan) {
    const ref = new Float64Array(T * T);
    p.plan.idx.forEach((ix, n) => (ref[ix] = p.plan!.val[n]));
    planAbs = 0;
    for (let k = 0; k < T * T; k++) planAbs = Math.max(planAbs, Math.abs(ref[k] - div.P[k]));
  }
  const ok = lossRel <= TOL.lossRel && gradRel <= TOL.gradRel && (planAbs === null || planAbs <= TOL.planAbs);
  return { preset: p, lossRel, gradRel, planAbs, ok };
}

/** the cross plan at a recorded Sinkhorn iterate, for replaying the solve */
export function planAt(s: Scene, k: number, out?: Float64Array): Float64Array {
  const { xy, Cxy } = s.div;
  const h = xy.history[Math.max(0, Math.min(k, xy.history.length - 1))];
  const n = xy.M;
  const P = out ?? new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) P[i * n + j] = Math.exp((h.f[i] + h.g[j] - Cxy[i * n + j]) / h.eps);
  return P;
}

/** number of recorded iterates (the replay runs over these) */
export const framesOf = (s: Scene) => s.div.xy.history.length - 1;
