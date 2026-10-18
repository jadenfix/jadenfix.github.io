// The numbers behind the simulation page. Pure functions, so
// scripts/check_sim.mjs can run them against the papers' receipts.
//   KT sandwich         evidence-scaling-dichotomy X1 (pathwise, every n)
//   anytime Bell bets   bell-escape-route-anytime-frontiers, Theorem 1 and the realised ceiling
//   grid renderer       finite-precision-renderer-identifiability

export const LN2 = Math.log(2);
const HALF_LN_PI_2 = 0.5 * Math.log(Math.PI / 2);

/** KL(Bernoulli(p) || Bernoulli(q)) in nats. */
export function kl(p: number, q: number): number {
  let s = 0;
  if (p > 0) s += p * Math.log(p / q);
  if (p < 1) s += (1 - p) * Math.log((1 - p) / (1 - q));
  return s;
}

export type KtPoint = { n: number; lbf: number; lo: number; hi: number };

/**
 * The running KT log Bayes factor of "IID Bernoulli(q), q unknown" against fair
 * bits, with the pathwise sandwich it can never leave:
 *   n KL(qhat||1/2) - 1/2 ln n - ln 2  <=  ln BF_n  <  n KL(qhat||1/2) - 1/2 ln n - 1/2 ln(pi/2).
 * Returns about `points` evenly spaced samples (plus the last one).
 */
export function ktPath(bits: ArrayLike<number>, points = 600): KtPoint[] {
  const out: KtPoint[] = [];
  const every = Math.max(1, Math.floor(bits.length / points));
  let ones = 0;
  let lbf = 0;
  for (let t = 0; t < bits.length; t++) {
    const p1 = (ones + 0.5) / (t + 1);
    lbf += Math.log((bits[t] ? p1 : 1 - p1) / 0.5);
    ones += bits[t];
    const n = t + 1;
    if (n === 1 || n % every === 0 || n === bits.length) {
      const core = n * kl(ones / n, 0.5) - 0.5 * Math.log(n);
      out.push({ n, lbf, lo: core - LN2, hi: core - HALF_LN_PI_2 });
    }
  }
  return out;
}

/** A deterministic stream of uniforms (mulberry32), so a renderer's bias is replayable. */
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

/** The beacon seen through a renderer that leans toward 1: each bit is forced to 1 with probability 2*delta, so q = 1/2 + delta. */
export function lean(bits: Uint8Array, delta: number, seed = 7): Uint8Array {
  if (delta <= 0) return bits;
  const u = rng(seed);
  const out = new Uint8Array(bits.length);
  for (let i = 0; i < bits.length; i++) out[i] = u() < 2 * delta ? 1 : bits[i];
  return out;
}

// ------------------------------------------------------------------ Bell, anytime

/** Delft settings and outcomes -> did this trial win the CHSH game? */
export const win = (a: number, b: number, x: number, y: number) => (a * b === 1 ? -1 : 1) * x * y === 1;

/**
 * Uniform mixture over constant bets q in [f, 1] against the null "P(win | past) <= f":
 *   E_n = 1/(1-f) * int_f^1 (q/f)^k ((1-q)/(1-f))^m dq.
 * Computed in log space on a fine grid (the papers compute it exactly; this agrees to 4 digits).
 */
export function mixtureE(k: number, m: number, f: number, grid = 4000): number {
  let peak = -Infinity;
  const logs: number[] = [];
  for (let i = 0; i < grid; i++) {
    const q = f + ((i + 0.5) / grid) * (1 - f);
    const v = k * Math.log(q / f) + m * Math.log((1 - q) / (1 - f));
    logs.push(v);
    if (v > peak) peak = v;
  }
  let s = 0;
  for (const v of logs) s += Math.exp(v - peak);
  return Math.exp(peak) * (s / grid);
}

/** The most any constant-bet mixture over [f, 1] could have reached after k wins in n: exp(n d(phat || f)) if phat > f. */
export function ceilingE(k: number, n: number, f: number): number {
  if (n === 0) return 1;
  const ph = k / n;
  return ph <= f ? 1 : Math.exp(n * kl(ph, f));
}

export type BetPoint = { n: number; k: number; mix: number; ceil: number };

export function betPath(wins: boolean[], f = 0.75): BetPoint[] {
  const out: BetPoint[] = [{ n: 0, k: 0, mix: 1, ceil: 1 }];
  let k = 0;
  wins.forEach((w, i) => {
    if (w) k += 1;
    const n = i + 1;
    out.push({ n, k, mix: mixtureE(k, n - k, f), ceil: ceilingE(k, n, f) });
  });
  return out;
}

// ------------------------------------------------------------------ precision

/**
 * CHSH values a stationary renderer on a 1/D grid can reach while staying a
 * Werner law: |S| = 16 j / D for integers j, up to Tsirelson's 2 sqrt 2
 * (cosines +-1/sqrt 2, so P_v is on the grid exactly when v/sqrt 2 is in (4/D)Z).
 */
export function gridSValues(D: number): number[] {
  const out: number[] = [];
  for (let j = 1; (16 * j) / D <= 2 * Math.SQRT2 + 1e-12; j++) out.push((16 * j) / D);
  return out;
}
