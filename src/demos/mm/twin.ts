// Two copies of the environment replaying the identical recorded event stream, one per policy.
import { act, fixedQuotes, type ActorFile } from './actor';
import { MarketMakingEnv, type MarketEvent, type StepInfo } from './env';

export type PolicyName = 'td3' | 'fixed';
export const POLICIES = ['td3', 'fixed'] as const;
export const LOT = 0.1; // LTC per lot: the replay's integer quantity unit

/** Shipped held-out slice, compact rows: add [dt, 0|1, ticks, qty] · market [dt, 2|3, qty] · cancel [dt, 4, id] */
export interface SliceFile {
  source: string;
  quote_bps: number;
  eval: Record<string, unknown>;
  slices: { start_utc: string; rows: number[][] }[];
}

/** Decode one slice into replay-CSV events, with the converter's order ids (shared add/market counter). */
export function decodeSlice(rows: number[][]): MarketEvent[] {
  let ms = 0;
  let n = 0;
  return rows.map((r) => {
    ms += r[0];
    const timestamp = ms / 1000;
    const code = r[1];
    if (code <= 1) {
      n += 1;
      return { timestamp, event: 'add', orderId: String(n), side: code === 0 ? 'buy' : 'sell', price: r[2] * 0.01, quantity: r[3] };
    }
    if (code <= 3) {
      n += 1;
      return { timestamp, event: 'market', orderId: 'm' + n, side: code === 2 ? 'buy' : 'sell', price: 0, quantity: r[2] };
    }
    return { timestamp, event: 'cancel', orderId: String(r[2]), side: '', price: 0, quantity: 0 };
  });
}

export class Twin {
  envs: Record<PolicyName, MarketMakingEnv>;
  last: Record<PolicyName, StepInfo | null> = { td3: null, fixed: null };
  done = false;

  private actor: ActorFile;
  private quoteBps: number;

  constructor(events: MarketEvent[], actor: ActorFile, quoteBps: number) {
    this.actor = actor;
    this.quoteBps = quoteBps;
    this.envs = { td3: new MarketMakingEnv(events), fixed: new MarketMakingEnv(events) };
  }

  action(p: PolicyName): [number, number] {
    return p === 'fixed' ? fixedQuotes(this.quoteBps) : act(this.actor, this.envs.td3.observation());
  }

  step() {
    if (this.done) return;
    for (const p of POLICIES) this.last[p] = this.envs[p].step(this.action(p));
    this.done = this.envs.td3.done || this.envs.fixed.done;
  }
}
