/**
 * Log-domain entropic Sinkhorn divergence, a TypeScript port of the CTS alignment loss as the repo
 * computes it through OTT-JAX (github.com/jadenfix/CreditAssignment-LongHorizon, cts/losses/sinkhorn.py):
 *
 *   _time_augment       R: [T, D] -> [(1 - a) R, a t/(T-1)]                      -> timeAugment
 *   _pairwise_sqdist    squared Euclidean cost (PointCloud's default)            -> sqdist
 *   sinkhorn_divergence reg(x, y) - 0.5 (reg(x, x) + reg(y, y)), uniform weights -> divergence
 *
 * Potentials follow OTT: P_ij = exp((f_i + g_j - C_ij) / eps). The balanced update is
 * g_j = eps log b_j - eps LSE_i((f_i - C_ij) / eps); the unbalanced one (tau_a = tau_b = tau) multiplies it
 * by tau, which is a KL marginal penalty of weight rho = eps tau / (1 - tau). reg(.) is OTT's dual
 * objective (`compute_kl_reg_cost`), including the marginal penalty terms when tau < 1. The self terms use
 * the symmetric averaged update OTT uses for them.
 *
 * Convergence. Like OTT, a solve starts from zero potentials at the target eps. On the real CTS latents the
 * cross plan is nearly a permutation, and balanced Sinkhorn then crawls along near-flat "shift one block"
 * directions of the dual (OTT itself stops at its iteration cap there). After at most `sweeps` sweeps a
 * balanced cross problem is finished by damped Newton steps on the dual, which reach a 1e-12 marginal error
 * in a few steps. Eps-scaling (`scaling`) and warm starts (`init`) are available; measured on these latents
 * they were slower and left more error for Newton, so they are off by default.
 * Everything is float64 and stays in the log domain.
 */

/** `_time_augment` on a flat [T, D] array: [(1 - a) r_t, a t / (T - 1)] */
export function timeAugment(R: ArrayLike<number>, T: number, D: number, alpha: number): Float64Array {
  const out = new Float64Array(T * (D + 1));
  for (let t = 0; t < T; t++) {
    for (let k = 0; k < D; k++) out[t * (D + 1) + k] = (1 - alpha) * R[t * D + k];
    out[t * (D + 1) + D] = alpha * (T > 1 ? t / (T - 1) : 0);
  }
  return out;
}

/** `_pairwise_sqdist`: C[i * N + j] = |a_i - b_j|^2 for flat point sets of dimension d */
export function sqdist(a: Float64Array, M: number, b: Float64Array, N: number, d: number): Float64Array {
  const C = new Float64Array(M * N);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      let s = 0;
      for (let k = 0; k < d; k++) {
        const v = a[i * d + k] - b[j * d + k];
        s += v * v;
      }
      C[i * N + j] = s;
    }
  }
  return C;
}

export type Potentials = { f: Float64Array; g: Float64Array };

export type SolveOpts = {
  eps: number;
  /** 1 is balanced; tau < 1 relaxes both marginals (OTT tau_a = tau_b = tau) */
  tau?: number;
  /** stop when OTT's error (below) drops under tol */
  tol?: number;
  maxIter?: number;
  /** potentials from a nearby solve; skips eps-scaling */
  init?: Potentials | null;
  /** keep the potentials (and the eps they belong to) every few iterations, for replaying the solve */
  record?: boolean;
  /** solve x against itself with the symmetric averaged update (OTT's choice for the debiasing terms) */
  symmetric?: boolean;
  /** anneal eps from the cost scale when there is no warm start (default true) */
  scaling?: boolean;
  /** Sinkhorn sweeps at the target eps before a balanced cross problem hands over to Newton */
  sweeps?: number;
  /** finish a stalled balanced cross problem with Newton steps on the dual (default true) */
  newton?: boolean;
};

export type Snapshot = { f: Float64Array; g: Float64Array; eps: number; iter: number };

export type SolveResult = Potentials & {
  M: number;
  N: number;
  eps: number;
  tau: number;
  /** total Sinkhorn sweeps over all eps stages */
  iters: number;
  /** Newton steps after the sweeps (balanced cross problem only) */
  newtonSteps: number;
  /** number of eps values visited (1 with a warm start) */
  stages: number;
  converged: boolean;
  /** OTT's solution error at the end: L1 marginal error (balanced) or L1 distance to the unbalanced optimality condition */
  err: number;
  history: Snapshot[];
};

/** rho = eps tau / (1 - tau), OTT's `uf.rho` */
export const rhoOf = (eps: number, tau: number) => (eps * tau) / (1 - tau);

const LOG_EPS_FACTOR = Math.log(0.5);

function lseRow(g: Float64Array, C: Float64Array, i: number, N: number, eps: number): number {
  let m = -Infinity;
  const base = i * N;
  for (let j = 0; j < N; j++) {
    const v = (g[j] - C[base + j]) / eps;
    if (v > m) m = v;
  }
  let s = 0;
  for (let j = 0; j < N; j++) s += Math.exp((g[j] - C[base + j]) / eps - m);
  return eps * (m + Math.log(s));
}

function lseCol(f: Float64Array, C: Float64Array, j: number, M: number, N: number, eps: number): number {
  let m = -Infinity;
  for (let i = 0; i < M; i++) {
    const v = (f[i] - C[i * N + j]) / eps;
    if (v > m) m = v;
  }
  let s = 0;
  for (let i = 0; i < M; i++) s += Math.exp((f[i] - C[i * N + j]) / eps - m);
  return eps * (m + Math.log(s));
}

/** OTT's `solution_error` for the current potentials at this eps */
function solutionError(f: Float64Array, g: Float64Array, C: Float64Array, M: number, N: number, eps: number, tau: number): number {
  const a = 1 / M;
  const b = 1 / N;
  const row = new Float64Array(M);
  const col = new Float64Array(N);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      const p = Math.exp((f[i] + g[j] - C[i * N + j]) / eps);
      row[i] += p;
      col[j] += p;
    }
  }
  let err = 0;
  if (tau >= 1) {
    for (let j = 0; j < N; j++) err += Math.abs(col[j] - b);
    return err;
  }
  const rho = rhoOf(eps, tau);
  for (let i = 0; i < M; i++) err += Math.abs(row[i] - a * Math.exp(-f[i] / rho));
  for (let j = 0; j < N; j++) err += Math.abs(col[j] - b * Math.exp(-g[j] / rho));
  return err;
}

/**
 * Newton steps on the balanced dual, from potentials Sinkhorn has already brought close. When the plan is
 * nearly a permutation the problem almost splits into independent blocks; the dual is then nearly flat
 * along "shift one block" directions and plain Sinkhorn crawls along them, while Newton settles them in a
 * few steps. The system is the (M + N - 1)-square Hessian with g_{N-1} held fixed (the potentials are only
 * defined up to f + c, g - c). Returns the number of steps taken.
 */
function newtonPolish(C: Float64Array, M: number, N: number, f: Float64Array, g: Float64Array, eps: number, tol: number, maxSteps: number, lm = 1e-9): { steps: number; err: number } {
  const a = 1 / M;
  const b = 1 / N;
  const n = M + N - 1;
  const H = new Float64Array(n * n);
  const rhs = new Float64Array(n);
  const P = new Float64Array(M * N);
  const row = new Float64Array(M);
  const col = new Float64Array(N);
  const residual = (ff: Float64Array, gg: Float64Array) => {
    row.fill(0);
    col.fill(0);
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        const p = Math.exp((ff[i] + gg[j] - C[i * N + j]) / eps);
        P[i * N + j] = p;
        row[i] += p;
        col[j] += p;
      }
    }
    let e = 0;
    for (let i = 0; i < M; i++) e += Math.abs(row[i] - a);
    for (let j = 0; j < N; j++) e += Math.abs(col[j] - b);
    return e;
  };
  let err = residual(f, g);
  let steps = 0;
  const tf = new Float64Array(M);
  const tg = new Float64Array(N);
  while (err >= tol && steps < maxSteps) {
    H.fill(0);
    for (let i = 0; i < M; i++) {
      H[i * n + i] = row[i] / eps;
      for (let j = 0; j < N - 1; j++) {
        H[i * n + M + j] = P[i * N + j] / eps;
        H[(M + j) * n + i] = P[i * N + j] / eps;
      }
      rhs[i] = a - row[i];
    }
    for (let j = 0; j < N - 1; j++) {
      H[(M + j) * n + M + j] = col[j] / eps;
      rhs[M + j] = b - col[j];
    }
    // a small Levenberg shift: steps or tokens whose plan row barely touches the rest leave the Hessian
    // nearly singular along "shift that block" directions, which the dual value hardly depends on
    let dmax = 0;
    for (let r = 0; r < n; r++) dmax = Math.max(dmax, H[r * n + r]);
    for (let r = 0; r < n; r++) H[r * n + r] += lm * dmax;
    // two rounds of iterative refinement against the shifted system
    const H0 = H.slice();
    const d = solveDense(H, rhs, n);
    if (!d) break;
    for (let it = 0; it < 2; it++) {
      const res = new Float64Array(n);
      for (let r = 0; r < n; r++) {
        let acc = rhs[r];
        for (let k = 0; k < n; k++) acc -= H0[r * n + k] * d[k];
        res[r] = acc;
      }
      const corr = solveDense(H0.slice(), res, n);
      if (!corr) break;
      for (let r = 0; r < n; r++) d[r] += corr[r];
    }
    // backtrack if a full step overshoots
    let step = 1;
    let next = Infinity;
    for (let k = 0; k < 12; k++) {
      for (let i = 0; i < M; i++) tf[i] = f[i] + step * d[i];
      for (let j = 0; j < N - 1; j++) tg[j] = g[j] + step * d[M + j];
      tg[N - 1] = g[N - 1];
      next = residual(tf, tg);
      if (next < err) break;
      step *= 0.5;
    }
    steps++;
    if (!(next < err)) {
      residual(f, g);
      break;
    }
    f.set(tf);
    g.set(tg);
    err = next;
  }
  // report OTT's balanced error (the column marginal) like solutionError does
  let colErr = 0;
  for (let j = 0; j < N; j++) colErr += Math.abs(col[j] - b);
  return { steps, err: colErr };
}

/** Gaussian elimination with partial pivoting; H is overwritten. */
function solveDense(H: Float64Array, rhs: Float64Array, n: number): Float64Array | null {
  const x = rhs.slice();
  for (let c = 0; c < n; c++) {
    let p = c;
    let best = Math.abs(H[c * n + c]);
    for (let r = c + 1; r < n; r++) {
      const v = Math.abs(H[r * n + c]);
      if (v > best) {
        best = v;
        p = r;
      }
    }
    if (best === 0 || !isFinite(best)) return null;
    if (p !== c) {
      for (let k = 0; k < n; k++) {
        const tmp = H[c * n + k];
        H[c * n + k] = H[p * n + k];
        H[p * n + k] = tmp;
      }
      const tmp = x[c];
      x[c] = x[p];
      x[p] = tmp;
    }
    const piv = H[c * n + c];
    for (let r = c + 1; r < n; r++) {
      const m = H[r * n + c] / piv;
      if (m === 0) continue;
      for (let k = c; k < n; k++) H[r * n + k] -= m * H[c * n + k];
      x[r] -= m * x[c];
    }
  }
  for (let r = n - 1; r >= 0; r--) {
    let s = x[r];
    for (let k = r + 1; k < n; k++) s -= H[r * n + k] * x[k];
    x[r] = s / H[r * n + r];
  }
  return x;
}

/**
 * Sinkhorn between uniform weights on the cost C. Without `init` (and with `scaling`), eps is annealed by
 * halves from the largest cost down to the target, a few sweeps per stage. At the target, Sinkhorn runs to
 * `tol`; a balanced cross problem that has not got there after `sweeps` sweeps is finished by Newton.
 */
export function solve(C: Float64Array, M: number, N: number, opts: SolveOpts): SolveResult {
  const { eps, tau = 1, maxIter = 20000, init = null, record = false, symmetric = false, scaling = false, sweeps = 300, newton = true } = opts;
  // the unbalanced reg cost is not stationary in the potentials, so it needs the tighter stop
  const tol = opts.tol ?? (tau < 1 ? 1e-14 : 1e-12);
  const logA = Math.log(1 / M);
  const logB = Math.log(1 / N);
  const f = init ? init.f.slice() : new Float64Array(M);
  const g = init ? init.g.slice() : new Float64Array(N);
  const history: Snapshot[] = [];

  // the eps schedule: halving from the cost scale, the last stage is the target
  const schedule: number[] = [];
  if (!init && scaling) {
    let cmax = 0;
    for (let k = 0; k < C.length; k++) if (C[k] > cmax) cmax = C[k];
    const n = Math.max(0, Math.ceil(Math.log(eps / Math.max(cmax, eps)) / LOG_EPS_FACTOR));
    for (let s = n; s >= 1; s--) schedule.push(eps * Math.pow(2, s));
  }
  schedule.push(eps);

  const t = tau >= 1 ? 1 : tau;
  const polish = newton && t === 1 && !symmetric;
  let iters = 0;
  let newtonSteps = 0;
  let err = Infinity;
  let converged = false;
  const nf = new Float64Array(M);
  const ng = new Float64Array(N);
  if (record) history.push({ f: f.slice(), g: g.slice(), eps: schedule[0], iter: 0 });

  for (let s = 0; s < schedule.length; s++) {
    const e = schedule[s];
    const last = s === schedule.length - 1;
    const stageTol = last ? tol : 1e-3;
    const stageMax = last ? (polish ? Math.min(sweeps, maxIter - iters) : maxIter - iters) : 50;
    for (let k = 0; k < stageMax; k++) {
      if (symmetric) {
        // Feydy's averaged update f <- (f + T(f)) / 2, the parallel + momentum 0.5 update OTT uses for x vs x
        for (let i = 0; i < M; i++) nf[i] = 0.5 * (f[i] + t * (e * logA - lseRow(f, C, i, N, e)));
        f.set(nf);
        g.set(nf);
      } else {
        // OTT order: g from f, then f from the new g
        for (let j = 0; j < N; j++) ng[j] = t * (e * logB - lseCol(f, C, j, M, N, e));
        g.set(ng);
        for (let i = 0; i < M; i++) nf[i] = t * (e * logA - lseRow(g, C, i, N, e));
        f.set(nf);
      }
      iters++;
      if (record && (iters < 40 || iters % 4 === 0)) history.push({ f: f.slice(), g: g.slice(), eps: e, iter: iters });
      if (k % 5 === 4 || k === stageMax - 1) {
        err = solutionError(f, g, C, M, N, e, t);
        if (err < stageTol) {
          if (last) converged = true;
          break;
        }
      }
    }
  }
  if (!converged && polish) {
    const r = newtonPolish(C, M, N, f, g, eps, tol, 30);
    newtonSteps = r.steps;
    err = r.err;
    converged = err < tol;
  }
  if (record) history.push({ f: f.slice(), g: g.slice(), eps, iter: iters + newtonSteps });
  return { f, g, M, N, eps, tau: t, iters, newtonSteps, stages: schedule.length, converged, err, history };
}

/** P_ij = exp((f_i + g_j - C_ij) / eps) */
export function planOf(C: Float64Array, M: number, N: number, f: Float64Array, g: Float64Array, eps: number, out?: Float64Array): Float64Array {
  const P = out ?? new Float64Array(M * N);
  for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) P[i * N + j] = Math.exp((f[i] + g[j] - C[i * N + j]) / eps);
  return P;
}

/** OTT's `compute_kl_reg_cost`: the dual objective, with the KL marginal penalty terms when tau < 1 */
export function regCost(C: Float64Array, r: SolveResult): number {
  const { M, N, f, g, eps, tau } = r;
  const a = 1 / M;
  const b = 1 / N;
  const fa = eps * Math.log(a);
  const gb = eps * Math.log(b);
  let divA = 0;
  let divB = 0;
  if (tau >= 1) {
    for (let i = 0; i < M; i++) divA += a * (f[i] - fa);
    for (let j = 0; j < N; j++) divB += b * (g[j] - gb);
  } else {
    const rho = rhoOf(eps, tau);
    for (let i = 0; i < M; i++) divA -= a * rho * (Math.exp(-(f[i] - fa) / rho) - 1);
    for (let j = 0; j < N; j++) divB -= b * rho * (Math.exp(-(g[j] - gb) / rho) - 1);
  }
  let total = 0;
  for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) total += Math.exp((f[i] + g[j] - C[i * N + j]) / eps);
  return divA + divB + eps * (1 - total);
}

export function sum(P: Float64Array): number {
  let s = 0;
  for (let k = 0; k < P.length; k++) s += P[k];
  return s;
}

export function dot(P: Float64Array, C: Float64Array): number {
  let s = 0;
  for (let k = 0; k < P.length; k++) s += P[k] * C[k];
  return s;
}

export type Divergence = {
  /** S = reg(x, y) - 0.5 reg(x, x) - 0.5 reg(y, y), OTT's `divergence` (the mass correction is 0 for uniform weights) */
  value: number;
  xy: SolveResult;
  xx: SolveResult;
  yy: SolveResult;
  Cxy: Float64Array;
  Cxx: Float64Array;
  /** cross plan */
  P: Float64Array;
  /** gradient of S with respect to each unaugmented state of x, flat [T, D] */
  grad: Float64Array;
};

export type DivOpts = { eps: number; tau: number; tol?: number; maxIter?: number; record?: boolean; scaling?: boolean; newton?: boolean; warm?: { xy: Potentials; xx: Potentials; yy: Potentials } | null };

/**
 * The repo's alignment term between x = R and y = R* (held fixed), both [T, D], with its gradient in x.
 * At the entropic optimum the envelope theorem gives dreg/dC = P, and with the time augmentation
 * dC_ij/dr_i = 2 (1 - alpha) (x~_i - y~_j); the self term sees x in both arguments.
 */
export function divergence(x: ArrayLike<number>, y: ArrayLike<number>, T: number, D: number, alpha: number, o: DivOpts): Divergence {
  const xa = timeAugment(x, T, D, alpha);
  const ya = timeAugment(y, T, D, alpha);
  const d = D + 1;
  const Cxy = sqdist(xa, T, ya, T, d);
  const Cxx = sqdist(xa, T, xa, T, d);
  const Cyy = sqdist(ya, T, ya, T, d);
  const base = { eps: o.eps, tau: o.tau, tol: o.tol, maxIter: o.maxIter, scaling: o.scaling, newton: o.newton };
  const xy = solve(Cxy, T, T, { ...base, record: o.record, init: o.warm?.xy });
  const xx = solve(Cxx, T, T, { ...base, symmetric: true, init: o.warm?.xx });
  const yy = solve(Cyy, T, T, { ...base, symmetric: true, init: o.warm?.yy });
  const value = regCost(Cxy, xy) - 0.5 * (regCost(Cxx, xx) + regCost(Cyy, yy));
  const P = planOf(Cxy, T, T, xy.f, xy.g, o.eps);
  const Pxx = planOf(Cxx, T, T, xx.f, xx.g, o.eps);
  const grad = new Float64Array(T * D);
  const s = 2 * (1 - alpha);
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < T; j++) {
      const p = P[i * T + j];
      const q = Pxx[i * T + j];
      for (let k = 0; k < D; k++) {
        grad[i * D + k] += s * (p * (xa[i * d + k] - ya[j * d + k]) - q * (xa[i * d + k] - xa[j * d + k]));
      }
    }
  }
  return { value, xy, xx, yy, Cxy, Cxx, P, grad };
}
