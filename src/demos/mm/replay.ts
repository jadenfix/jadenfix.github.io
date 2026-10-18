// TypeScript port of DRL4MM v2 mmv2/sim.py (Episode) and the quoting policies in
// mmv2/policies.py + mmv2/rl.py, line for line, so a shipped slice replays exactly as in Python.
// Prices are integer ticks, quantities integer units of 0.001 base asset; the matching is exact
// integer arithmetic and the float operations (cash, features, actor) follow Python's order.

export const UNIT = 0.001;
export const DECISION_BINS = 10; // one decision per second on 100 ms bins
export const EPISODE_BINS = 36000; // clock-hour episodes
export const N_MARKET = 16;

/** One held-out slice: the first minutes of a test hour, as shipped in public/data/mm/v2-*.json */
export interface Slice {
  symbol: string;
  day: string;
  start_utc: string;
  tick: number;
  quote_units: number;
  max_inv_quotes: number;
  latency_bins: number;
  start_bin: number; // clock-hour start (the horizon features and AS see)
  t0: number; // first decision bin
  stop: number; // slice end (liquidation)
  // book state at the end of bins lo = t0 - 1 .. stop - 1
  bid: number[];
  ask: number[];
  bq: number[];
  aq: number[];
  ts: number[]; // trade offsets per bin, length n + 1
  tside: number[];
  tpx: number[];
  tq: number[];
  features: number[][]; // float32 market features per decision (row k <-> bin t0 + 10k)
}

export interface Fill {
  bin: number;
  side: 1 | -1;
  px: number;
  units: number;
}

export class Episode {
  s: Slice;
  L: number;
  Q: number;
  cap: number;
  tick: number;
  end: number;
  stop: number;
  t0: number;
  t: number;
  lo: number;
  inv = 0;
  cash = 0;
  bpx: number | null = null;
  apx: number | null = null;
  brem = 0;
  arem = 0;
  bqa = -1;
  aqa = -1;
  pending: [number | null, number | null] | null = null;
  fills: Fill[] = [];
  lastFillBin: number | null = null;
  done: boolean;
  liquidation: number | null = null;

  constructor(s: Slice) {
    this.s = s;
    this.L = s.latency_bins;
    this.Q = s.quote_units;
    this.cap = s.max_inv_quotes * this.Q;
    this.tick = s.tick;
    this.end = s.start_bin + EPISODE_BINS;
    this.stop = s.stop;
    this.t0 = this.t = s.t0;
    this.lo = s.t0 - 1;
    this.done = this.t >= this.stop;
  }

  book(): [number, number, number, number] {
    const i = this.t - 1 - this.lo;
    return [this.s.bid[i], this.s.bq[i], this.s.ask[i], this.s.aq[i]];
  }

  midPrice(): number {
    const [b, , a] = this.book();
    return (b + a) * 0.5 * this.tick;
  }

  equity(): number {
    return this.cash + this.inv * UNIT * this.midPrice();
  }

  private fill(side: 1 | -1, b: number, units: number) {
    const px = (side > 0 ? this.bpx : this.apx) as number;
    const notional = units * UNIT * px * this.tick;
    if (side > 0) {
      this.inv += units;
      this.cash -= notional;
      this.brem -= units;
      if (this.brem === 0) {
        this.bpx = null;
        this.bqa = -1;
      }
    } else {
      this.inv -= units;
      this.cash += notional;
      this.arem -= units;
      if (this.arem === 0) {
        this.apx = null;
        this.aqa = -1;
      }
    }
    this.cash -= notional * 0; // maker fee 0 in the primary setting
    this.fills.push({ bin: b, side, px, units });
    this.lastFillBin = b;
  }

  private activate(b: number) {
    const [bidT, askT] = this.pending as [number | null, number | null];
    this.pending = null;
    const i = b - 1 - this.lo;
    const B = this.s.bid[i];
    const BQ = this.s.bq[i];
    const A = this.s.ask[i];
    const AQ = this.s.aq[i];
    if (bidT !== null && bidT === this.bpx) {
      if (this.inv + this.brem > this.cap) [this.bpx, this.brem, this.bqa] = [null, 0, -1];
    } else if (bidT === null || bidT >= A || this.inv + this.Q > this.cap) {
      [this.bpx, this.brem, this.bqa] = [null, 0, -1];
    } else {
      this.bpx = bidT;
      this.brem = this.Q;
      this.bqa = bidT > B ? 0 : bidT === B ? BQ : -1;
    }
    if (askT !== null && askT === this.apx) {
      if (this.inv - this.arem < -this.cap) [this.apx, this.arem, this.aqa] = [null, 0, -1];
    } else if (askT === null || askT <= B || this.inv - this.Q < -this.cap) {
      [this.apx, this.arem, this.aqa] = [null, 0, -1];
    } else {
      this.apx = askT;
      this.arem = this.Q;
      this.aqa = askT < A ? 0 : askT === A ? AQ : -1;
    }
  }

  /** One decision interval; returns the equity change marked to mid. */
  step(bidTicks: number | null, askTicks: number | null): number {
    if (this.done) throw new Error('episode finished');
    const e0 = this.equity();
    this.pending = [bidTicks, askTicks];
    const t = this.t;
    const act = t + this.L;
    const stop = Math.min(t + DECISION_BINS, this.stop);
    const { ts, tside, tpx, tq } = this.s;
    for (let b = t; b < stop; b++) {
      if (b === act) this.activate(b);
      const i = b - this.lo;
      const j0 = ts[i];
      const j1 = ts[i + 1];
      if (j1 > j0 && (this.bpx !== null || this.apx !== null)) {
        let bvol = 0;
        let avol = 0;
        let bsweep = false;
        let asweep = false;
        const p = this.bpx;
        const q = this.apx;
        for (let j = j0; j < j1; j++) {
          if (tside[j] < 0) {
            if (p !== null) {
              if (tpx[j] < p) bsweep = true;
              else if (tpx[j] === p) bvol += tq[j];
            }
          } else if (q !== null) {
            if (tpx[j] > q) asweep = true;
            else if (tpx[j] === q) avol += tq[j];
          }
        }
        if (p !== null) {
          if (bsweep) this.fill(1, b, this.brem);
          else if (bvol > 0 && this.bqa >= 0) {
            if (bvol > this.bqa) {
              this.fill(1, b, Math.min(this.brem, bvol - this.bqa));
              if (this.bpx !== null) this.bqa = 0;
            } else this.bqa -= bvol;
          }
        }
        if (q !== null) {
          if (asweep) this.fill(-1, b, this.arem);
          else if (avol > 0 && this.aqa >= 0) {
            if (avol > this.aqa) {
              this.fill(-1, b, Math.min(this.arem, avol - this.aqa));
              if (this.apx !== null) this.aqa = 0;
            } else this.aqa -= avol;
          }
        }
      }
      const B = this.s.bid[i];
      const A = this.s.ask[i];
      const p = this.bpx;
      if (p !== null) {
        if (A <= p) this.fill(1, b, this.brem);
        else if (B === p) this.bqa = this.bqa < 0 ? this.s.bq[i] : Math.min(this.bqa, this.s.bq[i]);
        else if (B < p) this.bqa = 0;
      }
      const q = this.apx;
      if (q !== null) {
        if (B >= q) this.fill(-1, b, this.arem);
        else if (A === q) this.aqa = this.aqa < 0 ? this.s.aq[i] : Math.min(this.aqa, this.s.aq[i]);
        else if (A > q) this.aqa = 0;
      }
    }
    this.t = stop;
    this.pending = null;
    const de = this.equity() - e0;
    if (this.t >= this.stop) {
      this.done = true;
      this.liquidate();
    }
    return de;
  }

  private liquidate() {
    const [b, , a] = this.book();
    const before = this.equity();
    if (this.inv > 0) {
      const notional = this.inv * UNIT * b * this.tick;
      this.cash += notional - notional * 0;
    } else if (this.inv < 0) {
      const notional = -this.inv * UNIT * a * this.tick;
      this.cash -= notional + notional * 0;
    }
    this.liquidation = this.cash - before;
    this.inv = 0;
    this.bpx = this.apx = null;
  }

  agentFeatures(): number[] {
    const [B, BQ, A, AQ] = this.book();
    const dep = Math.max((BQ + AQ) * 0.5, 1.0);
    const secsSince = (this.t - (this.lastFillBin !== null ? this.lastFillBin : this.t0)) / DECISION_BINS;
    const out = [this.inv / this.Q, Math.log1p(Math.min(secsSince, 600.0)), (this.end - this.t) / EPISODE_BINS];
    const sides: [number | null, number, number, number][] = [
      [this.bpx, this.bqa, 1, B],
      [this.apx, this.aqa, -1, A],
    ];
    for (const [px, qa, sgn, ref] of sides) {
      if (px === null) out.push(0.0, 0.0, 5.0);
      else out.push(1.0, Math.max(-2.0, Math.min(10.0, (ref - px) * sgn)), qa < 0 ? 5.0 : Math.min(5.0, qa / dep));
    }
    return out;
  }
}

/** Integer quote prices around a center (ticks); post-only against the current touch. */
export function quotePrices(centerT: number, halfT: number, B: number, A: number): [number, number] {
  const bid = Math.floor(centerT - halfT - 1e-9);
  const ask = Math.ceil(centerT + halfT + 1e-9);
  return [Math.min(bid, A - 1), Math.max(ask, B + 1)];
}

// ---------------------------------------------------------------- policies

export type Quotes = [number | null, number | null];

export interface AgentFile {
  hidden: number[];
  normalizer: { mean: number[]; std: number[]; clip: number };
  mask: number[];
  action: 'quadratic' | 'residual';
  half_max: number;
  h0: number;
  skew_max: number;
  anchor: 'micro' | 'mid';
  ensemble: { in: number; out: number; w: ArrayLike<number>; b: ArrayLike<number> }[][]; // w row-major [out][in]
}

/** The JSON holds float32 values as shortest decimals; restore the exact float32 weights. */
export function prepareAgent(a: AgentFile): AgentFile {
  return { ...a, ensemble: a.ensemble.map((net) => net.map((L) => ({ ...L, w: Float32Array.from(L.w), b: Float32Array.from(L.b) }))) };
}

/** observation: float32 market row + agent state, z-scored, clipped, masked, cast to float32 */
export function observation(a: AgentFile, ep: Episode): Float32Array {
  const k = (ep.t - ep.t0) / DECISION_BINS;
  const x = ep.s.features[k].concat(ep.agentFeatures());
  const z = new Float32Array(x.length);
  const { mean, std, clip } = a.normalizer;
  for (let i = 0; i < x.length; i++) z[i] = Math.min(clip, Math.max(-clip, (x[i] - mean[i]) / std[i])) * a.mask[i];
  return z;
}

/** mean over the seed ensemble of tanh(MLP(z)); float32 weights, float64 accumulation */
export function actorForward(a: AgentFile, z: Float32Array): [number, number] {
  const sum = [0, 0];
  for (const net of a.ensemble) {
    let h: ArrayLike<number> = Float64Array.from(z, (v, i) => v * a.mask[i]);
    net.forEach((L, k) => {
      const last = k === net.length - 1;
      const out = new Float64Array(L.out);
      for (let o = 0; o < L.out; o++) {
        let s = 0;
        const row = o * L.in;
        for (let i = 0; i < L.in; i++) s += L.w[row + i] * h[i];
        s += L.b[o];
        out[o] = last ? Math.tanh(s) : Math.max(0, s);
      }
      h = out;
    });
    sum[0] += h[0];
    sum[1] += h[1];
  }
  return [sum[0] / a.ensemble.length, sum[1] / a.ensemble.length];
}

/** rl.py half_spread_bps + quotes_for: half-spread (bps) and skew around the microprice or mid */
export function agentQuotes(a: AgentFile, ep: Episode, u: [number, number]): Quotes {
  const [B, BQ, A, AQ] = ep.book();
  const mid = (B + A) * 0.5;
  const c = a.anchor === 'mid' ? mid : B + ((A - B) * BQ) / (BQ + AQ);
  const half = a.action === 'residual' ? (a.h0 * (1.0 + 0.75 * u[0])) / (1.0 - 0.75 * u[0]) : a.half_max * ((u[0] + 1.0) * 0.5) ** 2;
  const bps = 1e-4 * mid;
  return quotePrices(c + a.skew_max * u[1] * bps, half * bps, B, A);
}

export interface BaselineSpec {
  family: 'fixed_mid' | 'avellaneda_stoikov' | 'repo_fixed_midpoint';
  name: string;
  half_bps?: number;
  gamma?: number;
  sigma?: number;
  k?: number;
  horizon_s?: number | null;
  bps?: number;
}

export function baselineQuotes(spec: BaselineSpec, ep: Episode): Quotes {
  const [B, , A] = ep.book();
  const mid = (B + A) * 0.5;
  if (spec.family === 'fixed_mid') return quotePrices(mid, (spec.half_bps as number) * 1e-4 * mid, B, A);
  if (spec.family === 'repo_fixed_midpoint') {
    const d = (spec.bps as number) * 1e-4;
    let bid = mid - d * mid;
    let ask = mid + d * mid;
    if (ask - bid < 1.0) {
      const adj = (1.0 - (ask - bid)) / 2;
      bid -= adj;
      ask += adj;
    }
    return [Math.min(Math.floor(bid + 0.5), A - 1), Math.max(Math.floor(ask + 0.5), B + 1)];
  }
  const g = spec.gamma as number;
  const s2 = (spec.sigma as number) ** 2;
  const tau = spec.horizon_s == null ? (ep.end - ep.t) / DECISION_BINS : spec.horizon_s;
  const q = ep.inv / ep.Q;
  const r = -q * g * s2 * tau;
  const half = 0.5 * g * s2 * tau + Math.log1p(g / (spec.k as number)) / g;
  const bps = 1e-4 * mid;
  return quotePrices(mid + r * bps, half * bps, B, A);
}
