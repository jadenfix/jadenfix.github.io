// The pieces of the checker the figure runs: a look-ahead test that recomputes
// a signal on data cut off at some date, and the noise bar, the Sharpe the
// best of N zero-skill trials would reach by luck alone.
//
// The price path is illustrative (a seeded random walk with one regime change),
// not market data. The noise bar is the real formula.

/** small seeded PRNG so every visit draws the same picture */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** standard normal draws (Box-Muller) */
export function normals(n: number, seed: number) {
  const r = rng(seed);
  const out: number[] = [];
  while (out.length < n) {
    const u = Math.max(1e-12, r());
    const v = r();
    const m = Math.sqrt(-2 * Math.log(u));
    out.push(m * Math.cos(2 * Math.PI * v), m * Math.sin(2 * Math.PI * v));
  }
  return out.slice(0, n);
}

// Acklam's rational approximation to the inverse normal CDF (relative error about 1e-9)
const A = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
const B = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
const C = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const D = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];

export function invNorm(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
  }
  if (p > 1 - lo) return -invNorm(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
}

export const GAMMA = 0.5772;

/**
 * Expected best annualised Sharpe of N zero-skill trials over `years` of daily data:
 *   sd · ((1 − γ) Φ⁻¹(1 − 1/N) + γ Φ⁻¹(1 − 1/(N e))),  sd = 1/√years.
 * The formula is for N ≥ 2; one zero-skill trial expects a Sharpe of 0.
 */
export function noiseBar(n: number, years: number) {
  if (n < 2) return 0;
  const sd = 1 / Math.sqrt(years);
  return sd * ((1 - GAMMA) * invNorm(1 - 1 / n) + GAMMA * invNorm(1 - 1 / (n * Math.E)));
}

/** an illustrative daily price path: up for a while, then down */
export function pricePath(n: number, seed: number) {
  const z = normals(n, seed);
  const out = [100];
  for (let t = 1; t < n; t++) out.push(out[t - 1] * Math.exp((t < n * 0.55 ? 0.006 : -0.006) + 0.02 * z[t]));
  return out;
}

const LOOK = 10;
const MIN = 20;

const momentum = (p: number[]) => p.map((v, t) => (t >= LOOK ? Math.log(v / p[t - LOOK]) : null));

/** honest: momentum z-scored with the mean and spread of the past only */
export function honestSignal(p: number[]): (number | null)[] {
  const m = momentum(p);
  let n = 0;
  let s = 0;
  let ss = 0;
  return m.map((v) => {
    if (v === null) return null;
    n++;
    s += v;
    ss += v * v;
    if (n < MIN) return null;
    const mu = s / n;
    const sd = Math.sqrt(Math.max(1e-12, ss / n - mu * mu));
    return (v - mu) / sd;
  });
}

/** the cheat: the same z-score, with the mean and spread of the whole sample */
export function cheatSignal(p: number[]): (number | null)[] {
  const m = momentum(p);
  const xs = m.filter((v): v is number => v !== null);
  const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length);
  return m.map((v, t) => (v === null || t < LOOK + MIN - 1 ? null : (v - mu) / sd));
}

/** the largest change in any past value when everything after `cut` is removed */
export function pastShift(sig: (p: number[]) => (number | null)[], full: (number | null)[], p: number[], cut: number) {
  const trunc = sig(p.slice(0, cut + 1));
  let worst = 0;
  trunc.forEach((v, t) => {
    const f = full[t];
    if (v !== null && f !== null) worst = Math.max(worst, Math.abs(v - f));
  });
  return { trunc, worst };
}
