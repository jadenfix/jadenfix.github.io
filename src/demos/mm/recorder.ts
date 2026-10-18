// Runs the twin environments and keeps a short rolling history, handing React immutable frames.
// Inventory is reported in LTC and PnL in USDT (env units are 0.1-LTC lots and price x lots).
import type { Side, Trade } from './lob';
import type { ActorFile } from './actor';
import type { MarketEvent } from './env';
import { LOT, POLICIES, Twin, type PolicyName } from './twin';

export const WINDOW = 150;
const TICK = 0.01;
const LEVELS = 7;

export interface Lane {
  mid: number;
  bid: number | null; // the quotes resting while this step's event arrived
  ask: number | null;
  fills: { side: Side; price: number }[]; // agent fills, side from the agent's view
  inv: number; // LTC
  pnl: number; // USDT
}
export type Point = Record<PolicyName, Lane>;

export interface LadderRow {
  tick: number;
  price: number;
  side: Side;
  queue: { qty: number; agent: boolean }[]; // FIFO order, front first
  total: number;
}

export interface Print {
  key: number;
  price: number;
  qty: number; // LTC
  aggressor: Side;
  agent: 'bought' | 'sold' | null;
}

export interface Frame {
  step: number;
  history: Point[];
  ladder: LadderRow[];
  mid: number | null;
  spread: number | null;
  prints: Print[];
  hot: number[]; // ticks that traded on the latest event
  stats: Record<PolicyName, { inv: number; pnl: number; fills: number }>;
}

export class Recorder {
  twin: Twin;
  history: Point[] = [];
  prints: Record<PolicyName, Print[]> = { td3: [], fixed: [] };
  hot: Record<PolicyName, number[]> = { td3: [], fixed: [] };
  step = 0;
  private seen: Record<PolicyName, number> = { td3: 0, fixed: 0 };

  constructor(events: MarketEvent[], actor: ActorFile, quoteBps: number) {
    this.twin = new Twin(events, actor, quoteBps);
  }

  get done() {
    return this.twin.done;
  }

  advance(n = 1) {
    for (let i = 0; i < n && !this.twin.done; i++) {
      this.twin.step();
      this.step += 1;
      const pt = {} as Point;
      for (const p of POLICIES) {
        const info = this.twin.last[p];
        const env = this.twin.envs[p];
        pt[p] = {
          mid: info?.mid_price ?? env.sim.lob.midPrice() ?? 0,
          bid: info?.bid ?? null,
          ask: info?.ask ?? null,
          fills: (info?.fills ?? []).map((t) => ({ side: t.buyerId.startsWith('agent_') ? 'buy' : 'sell', price: t.price })),
          inv: env.inventory * LOT,
          pnl: (env.realizedPnl + env.unrealizedPnl) * LOT,
        };
        const fresh = this.freshTrades(p, env.sim.lob.trades);
        this.hot[p] = fresh.map((t) => Math.round(t.price / TICK));
        for (const tr of fresh) this.prints[p].unshift(toPrint(tr));
        if (this.prints[p].length > 8) this.prints[p].length = 8;
      }
      this.history.push(pt);
      if (this.history.length > WINDOW) this.history.shift();
    }
  }

  private freshTrades(p: PolicyName, trades: Trade[]): Trade[] {
    const out = trades.filter((t) => t.tradeId > this.seen[p]);
    if (trades.length) this.seen[p] = trades[trades.length - 1].tradeId;
    return out;
  }

  frame(view: PolicyName): Frame {
    const lob = this.twin.envs[view].sim.lob;
    const mid = lob.midPrice();
    const byTick = new Map<number, { side: Side; orders: { quantity: number; agentId: string | null }[]; total: number }>();
    lob.asks.forEach((l) => byTick.set(Math.round(l.price / TICK), { side: 'sell', orders: l.orders, total: l.totalQuantity }));
    lob.bids.forEach((l) => byTick.set(Math.round(l.price / TICK), { side: 'buy', orders: l.orders, total: l.totalQuantity }));
    const m = (mid ?? 0) / TICK;
    const firstAbove = Math.floor(m + 1e-6) + 1;
    const firstBelow = Math.ceil(m - 1e-6) - 1;
    const ticks: number[] = [];
    for (let j = LEVELS - 1; j >= 0; j--) ticks.push(firstAbove + j);
    for (let j = 0; j < LEVELS; j++) ticks.push(firstBelow - j);
    const ladder: LadderRow[] = ticks.map((tick, i) => {
      const lvl = byTick.get(tick);
      return {
        tick,
        price: tick * TICK,
        side: lvl ? lvl.side : i < LEVELS ? 'sell' : 'buy',
        queue: lvl ? mergeQueue(lvl.orders) : [],
        total: lvl ? lvl.total : 0,
      };
    });
    const stat = (p: PolicyName) => {
      const e = this.twin.envs[p];
      return { inv: e.inventory * LOT, pnl: (e.realizedPnl + e.unrealizedPnl) * LOT, fills: e.fillCount };
    };
    return {
      step: this.step,
      history: this.history.slice(),
      ladder,
      mid,
      spread: lob.spread(),
      prints: this.prints[view].slice(0, 5),
      hot: this.hot[view].slice(),
      stats: { td3: stat('td3'), fixed: stat('fixed') },
    };
  }
}

/** FIFO queue with consecutive external orders merged, so the agent's place in line stays legible */
function mergeQueue(orders: { quantity: number; agentId: string | null }[]) {
  const q: { qty: number; agent: boolean }[] = [];
  for (const o of orders) {
    const agent = !!o.agentId;
    const tail = q[q.length - 1];
    if (tail && !agent && !tail.agent) tail.qty += o.quantity;
    else q.push({ qty: o.quantity, agent });
  }
  return q;
}

function toPrint(t: Trade): Print {
  const agent = t.buyerId.startsWith('agent_') ? 'bought' : t.sellerId.startsWith('agent_') ? 'sold' : null;
  return { key: t.tradeId, price: t.price, qty: t.quantity * LOT, aggressor: t.aggressiveSide, agent };
}
