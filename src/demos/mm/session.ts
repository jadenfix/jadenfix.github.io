// Loads the shipped v2 files and runs the agent and the best baseline in lockstep on one slice,
// keeping a short rolling history for the charts. PnL is USDT (cash + inventory at mid; the
// slice end liquidates at the touch), inventory is in quotes of ~1,000 USDT.
import {
  actorForward,
  agentQuotes,
  baselineQuotes,
  DECISION_BINS,
  Episode,
  observation,
  prepareAgent,
  UNIT,
  type AgentFile,
  type BaselineSpec,
  type Quotes,
  type Slice,
} from './replay';

export const WINDOW = 120; // decisions (seconds) on screen
export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'LTCUSDT'] as const;
export type Sym = (typeof SYMBOLS)[number];

type CI = [number, number];
export interface Side {
  pnl_mean: number;
  pnl_mean_ci: CI;
  sharpe: number;
  sharpe_ci: CI;
  fills_per_hour: number;
  mean_abs_inv_quotes: number;
  markout_5s_bps: number;
  max_dd_cumulative: number;
}
export interface InstrumentInfo {
  baseline: BaselineSpec & { label: string };
  files: { file: string; start_utc: string; week: string }[];
  test: { episodes: number; days: number; agent: Side; baseline: Side; diff_mean: number; diff_ci95: CI; p_sign_flip: number; seen_in_training: boolean };
}
export interface Index {
  source: string;
  slice_minutes: number;
  instruments: Record<Sym, InstrumentInfo>;
  pooled: { agent: Pick<Side, 'pnl_mean' | 'pnl_mean_ci' | 'sharpe' | 'sharpe_ci'>; best_baseline: Pick<Side, 'pnl_mean' | 'pnl_mean_ci' | 'sharpe' | 'sharpe_ci'>; vs: { diff_mean: number; diff_ci95: CI; p_sign_flip: number } };
}

const DATA = `${import.meta.env.BASE_URL}data/mm/`;
let core: Promise<{ index: Index; agent: AgentFile }> | null = null;
const slices = new Map<string, Promise<Slice>>();

export function loadCore() {
  core ??= Promise.all([
    fetch(`${DATA}v2-index.json`).then((r) => r.json() as Promise<Index>),
    fetch(`${DATA}v2-agent.json`).then((r) => r.json() as Promise<AgentFile>),
  ]).then(([index, agent]) => ({ index, agent: prepareAgent(agent) }));
  return core;
}

/** undo the export's delta encoding (bid, tpx: running sums; ask stored as ask - bid) */
export function decodeSlice(raw: Slice): Slice {
  const run = (v: number[]) => {
    const out = new Array<number>(v.length);
    let s = 0;
    for (let i = 0; i < v.length; i++) out[i] = s += v[i];
    return out;
  };
  const bid = run(raw.bid);
  return { ...raw, bid, ask: raw.ask.map((d, i) => bid[i] + d), tpx: run(raw.tpx) };
}

export function loadSlice(file: string) {
  if (!slices.has(file)) slices.set(file, fetch(DATA + file).then((r) => r.json() as Promise<Slice>).then(decodeSlice));
  return slices.get(file) as Promise<Slice>;
}

export interface Lane {
  bid: number | null; // price, the quote sent at this decision
  ask: number | null;
  inv: number; // quotes
  pnl: number; // USDT
  buys: number[]; // fill prices this second
  sells: number[];
}
export interface Point {
  t: number;
  mid: number;
  agent: Lane;
  base: Lane;
}

export class Session {
  slice: Slice;
  agentFile: AgentFile;
  spec: BaselineSpec;
  a: Episode;
  b: Episode;
  history: Point[] = [];
  step = 0;

  constructor(slice: Slice, agent: AgentFile, spec: BaselineSpec) {
    this.slice = slice;
    this.agentFile = agent;
    this.spec = spec;
    this.a = new Episode(slice);
    this.b = new Episode(slice);
  }

  get done() {
    return this.a.done;
  }

  get total() {
    return (this.slice.stop - this.slice.t0) / DECISION_BINS;
  }

  private lane(ep: Episode, q: Quotes, nFills: number): Lane {
    const tick = this.slice.tick;
    const fresh = ep.fills.slice(nFills);
    return {
      bid: q[0] === null ? null : q[0] * tick,
      ask: q[1] === null ? null : q[1] * tick,
      inv: ep.inv / ep.Q,
      pnl: ep.done ? ep.cash : ep.equity(),
      buys: fresh.filter((f) => f.side > 0).map((f) => f.px * tick),
      sells: fresh.filter((f) => f.side < 0).map((f) => f.px * tick),
    };
  }

  advance(n = 1) {
    for (let i = 0; i < n && !this.done; i++) {
      const mid = this.a.midPrice();
      const t = this.a.t;
      const qa = agentQuotes(this.agentFile, this.a, actorForward(this.agentFile, observation(this.agentFile, this.a)));
      const qb = baselineQuotes(this.spec, this.b);
      const na = this.a.fills.length;
      const nb = this.b.fills.length;
      this.a.step(qa[0], qa[1]);
      this.b.step(qb[0], qb[1]);
      this.history.push({ t, mid, agent: this.lane(this.a, qa, na), base: this.lane(this.b, qb, nb) });
      if (this.history.length > WINDOW) this.history.shift();
      this.step += 1;
    }
  }

  stats() {
    const s = (ep: Episode) => ({ inv: ep.inv / ep.Q, pnl: ep.done ? ep.cash : ep.equity(), fills: ep.fills.length });
    return { agent: s(this.a), base: s(this.b), quoteUsd: this.slice.quote_units * UNIT * this.a.midPrice() };
  }
}
