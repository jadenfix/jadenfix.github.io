// Faithful ports of jadenfix/simulation-theory, branch `sharpen`.
//   src/simtheory/real_data.py        (Delft CHSH summary, p-value, CHSH-disk point, KT Bayes factor, coarsening)
//   src/simtheory/quantum_phase_geometry.py   canonical_chsh_cartesian_tv (claim ST-T12)
// Claims mirrored: ST-T01, ST-T08, ST-T12, ST-M14, ST-T185, ST-M50, ST-F32, ST-F33, ST-F34.
// Pure functions only, so the node validation script can import this file directly.

export const LN2 = Math.log(2);
export const VILLE_ALPHA = 0.01;
export const VILLE_THRESHOLD = Math.log(1 / VILLE_ALPHA);
export const SQRT2 = Math.sqrt(2);
export const TSIRELSON = 2 * SQRT2;

// ---------------------------------------------------------------- evidence

/** KL(Bernoulli(p) || Bernoulli(q)) in nats. */
export function bernoulliKL(p: number, q: number): number {
  let total = 0;
  if (p > 0) total += p * Math.log(p / q);
  if (p < 1) total += (1 - p) * Math.log((1 - p) / (1 - q));
  return total;
}

/** A Bernoulli(p) bit seen through a binary symmetric channel with flip f: bias contracts by 1 - 2f (ST-M14, ST-M50). */
export function coarsened(p: number, flip: number): number {
  return flip + (1 - 2 * flip) * p;
}

/**
 * Running log Bayes factor of "IID Bernoulli(q), q ~ Beta(1/2,1/2)" (a simulated source with an unknown bias)
 * against fair bits, via the Krichevsky-Trofimov predictor (k + 1/2) / (t + 1). Port of kt_log_bayes_factor_path.
 */
export class KTEvidence {
  n = 0;
  ones = 0;
  logBF = 0;
  push(bit: number): number {
    const p1 = (this.ones + 0.5) / (this.n + 1);
    this.logBF += Math.log((bit ? p1 : 1 - p1) / 0.5);
    this.ones += bit;
    this.n += 1;
    return this.logBF;
  }
}

/** Exact lower bound n KL(q || 1/2) - (1/2) ln n - ln 2 on E_q[log BF_n] (ST-T185). */
export function ktLowerBound(n: number, q: number): number {
  if (n < 1) return 0;
  return n * bernoulliKL(q, 0.5) - 0.5 * Math.log(n) - LN2;
}

/** Smallest n at which the expected-evidence lower bound reaches ln(1/alpha); Infinity when q = 1/2. */
export function boundCrossing(q: number, threshold = VILLE_THRESHOLD, limit = 1e7): number {
  if (bernoulliKL(q, 0.5) <= 0) return Infinity;
  let lo = 1;
  let hi = 2;
  while (ktLowerBound(hi, q) < threshold) {
    hi *= 2;
    if (hi > limit) return Infinity;
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ktLowerBound(mid, q) >= threshold) hi = mid;
    else lo = mid;
  }
  return hi;
}

// ---------------------------------------------------------------- Bell / CHSH

export interface BellTrial {
  t: string; // timestamp of the heralding event
  a: 0 | 1;
  b: 0 | 1;
  x: 1 | -1;
  y: 1 | -1;
}

/** Delft setting labels (a,b) -> CHSH sign; S = E00 + E01 + E10 - E11. Index = 2a + b. */
export const CHSH_SIGN = [1, 1, 1, -1] as const;
/** Delft settings: Alice 0, pi/2; Bob -3pi/4, +3pi/4 (psi-minus heralding). */
export const DELFT_ALICE = [0, Math.PI / 2] as const;
export const DELFT_BOB = [(-3 * Math.PI) / 4, (3 * Math.PI) / 4] as const;
/** Predictability bias bound of the Delft random-number generators (Supplementary Information I). */
export const DELFT_TAU = 5.4e-6 * 2;

export const chshWin = (tr: BellTrial) => (tr.a * tr.b === 1 ? -1 : 1) * tr.x * tr.y === 1;

/** Per-trial CHSH-game win bound for local models with setting bias tau. */
export function localWinBound(tau = DELFT_TAU): number {
  return 0.75 + 3 * (tau + tau * tau);
}

const LOG_FACT: number[] = [0];
function logFactorial(n: number): number {
  for (let k = LOG_FACT.length; k <= n; k++) LOG_FACT[k] = LOG_FACT[k - 1] + Math.log(k);
  return LOG_FACT[n];
}

/** P(Binomial(n, p) >= k), summed in log space. Port of binomial_upper_tail. */
export function binomialUpperTail(k: number, n: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  const lp = Math.log(p);
  const lq = Math.log(1 - p);
  const terms: number[] = [];
  for (let j = k; j <= n; j++) terms.push(logFactorial(n) - logFactorial(j) - logFactorial(n - j) + j * lp + (n - j) * lq);
  const peak = Math.max(...terms);
  let sum = 0;
  for (const v of terms) sum += Math.exp(v - peak);
  return Math.min(1, Math.exp(peak) * sum);
}

/** Running CHSH tallies; mirrors chsh_summary / running_chsh. */
export class ChshTally {
  sums = [0, 0, 0, 0];
  counts = [0, 0, 0, 0];
  n = 0;
  wins = 0;
  push(tr: BellTrial) {
    const k = 2 * tr.a + tr.b;
    this.sums[k] += tr.x * tr.y;
    this.counts[k] += 1;
    this.n += 1;
    if (chshWin(tr)) this.wins += 1;
  }
  get ready(): boolean {
    return Math.min(...this.counts) >= 2;
  }
  correlations(): number[] {
    return this.sums.map((s, k) => (this.counts[k] ? s / this.counts[k] : 0));
  }
  /** per-setting binomial errors sqrt((1 - E^2) / n), as in the paper */
  errors(): number[] {
    return this.correlations().map((e, k) => (this.counts[k] ? Math.sqrt((1 - e * e) / this.counts[k]) : Infinity));
  }
  S(): number {
    const e = this.correlations();
    return e[0] + e[1] + e[2] - e[3];
  }
  sError(): number {
    return Math.sqrt(this.errors().reduce((acc, v) => acc + v * v, 0));
  }
}

/**
 * Equal-weight least-squares point q = (x, y) on the canonical CHSH disk (ST-F33).
 * The Delft schedule is the canonical one with every setting difference shifted by pi, so
 * E00, E01, E10, E11 = r(-pi/4), r(pi/4), r(pi/4), r(3pi/4) with r(theta) = x cos(theta) + y sin(theta).
 */
export function diskPoint(e: readonly number[]): [number, number] {
  const s = 1 / (2 * SQRT2);
  return [s * (e[0] + e[1] + e[2] - e[3]), s * (-e[0] + e[1] + e[2] + e[3])];
}

/** Covariance of the disk point from independent per-setting errors: [var_x, var_y, cov_xy]. */
export function diskCovariance(err: readonly number[]): [number, number, number] {
  const v = err.map((x) => x * x);
  const total = (v[0] + v[1] + v[2] + v[3]) / 8;
  const cov = (-v[0] + v[1] + v[2] - v[3]) / 8;
  return [total, total, cov];
}

/** canonical_chsh_cartesian_tv: TV(P_q, P_q') = ||q - q'||_inf / (2 sqrt 2) (ST-T12). */
export function canonicalTV(q: readonly [number, number], r: readonly [number, number]): number {
  return Math.max(Math.abs(q[0] - r[0]), Math.abs(q[1] - r[1])) / (2 * SQRT2);
}

/** Predictive TV per trial from q to the nearest point of the S = 2 chord x = 1/sqrt 2: equals |S - 2| / 8. */
export function chordTV(q: readonly [number, number]): number {
  return canonicalTV(q, [1 / SQRT2, q[1]]);
}

/**
 * A local hidden-variable model on the Delft settings: shared angle lambda, each side outputs the sign of its own
 * cosine. E(a,b) = -(1 - 2 |alpha_a - beta_b| / pi) (angle folded to [0, pi]), which gives S = 2 exactly in
 * expectation and win probability 3/4: it saturates the local bound and cannot pass it.
 */
export function lhvOutcome(a: 0 | 1, b: 0 | 1, lambda: number): [1 | -1, 1 | -1] {
  const x = Math.cos(DELFT_ALICE[a] - lambda) >= 0 ? 1 : -1;
  const y = Math.cos(DELFT_BOB[b] - lambda) >= 0 ? -1 : 1;
  return [x, y];
}

/** Exact expected correlation of the local model, for checks. */
export function lhvCorrelation(a: 0 | 1, b: 0 | 1): number {
  let d = Math.abs(DELFT_ALICE[a] - DELFT_BOB[b]) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return -(1 - (2 * d) / Math.PI);
}

// ---------------------------------------------------------------- bits

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
  return out;
}

/** Bits of each 512-bit localRandomValue, most significant first (port of beacon_bits). */
export function beaconBits(values: readonly string[]): Uint8Array {
  const bits = new Uint8Array(values.length * 512);
  let i = 0;
  for (const hex of values) {
    for (const byte of hexToBytes(hex)) for (let s = 7; s >= 0; s--) bits[i++] = (byte >> s) & 1;
  }
  return bits;
}
