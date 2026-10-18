// Port of DRL4MM simulator/market_env.py (historical-replay path) and simulator/historical.py.
// step(action): cancel existing quotes, place new quotes off the current mid, apply the next
// recorded event, then reconcile fills with average-entry-cost accounting, compute the reward
// and build the 52-feature observation the TD3 actor reads.
//
// Number semantics follow the Python run (NumPy 2): the action is float32, so quote prices are
// computed in float32 (np.float32 op Python float stays float32) before snapping to the tick,
// and the observation vector is cast to float32. f32() reproduces those roundings.

import { LOBSimulator, makeOrder, pyRound, type Trade } from './lob';

const f32 = Math.fround;

/** One row of the replay CSV: timestamp,event,order_id,side,price,quantity */
export interface MarketEvent {
  timestamp: number;
  event: 'add' | 'market' | 'cancel';
  orderId: string;
  side: 'buy' | 'sell' | '';
  price: number;
  quantity: number;
}

/**
 * MarketEvent.apply: external ids are namespaced so they cannot impersonate agent orders.
 * One exchange rule on top of the repo: a recorded cancel for an external order this book has
 * already filled (the agent's quotes changed who traded) is a too-late-to-cancel no-op.
 */
export function applyEvent(ev: MarketEvent, sim: LOBSimulator): Trade[] | null {
  const book = sim.lob;
  const identity = 'feed:' + ev.orderId;
  if (ev.event === 'cancel') {
    book.cancelOrder(identity);
    return [];
  }
  if (book.orders.has(identity)) throw new Error(`Duplicate active external order: ${ev.orderId}`);
  return book.addOrder(
    makeOrder({
      orderId: identity,
      side: ev.side === 'buy' ? 'buy' : 'sell',
      price: ev.price,
      quantity: ev.quantity,
      timestamp: ev.timestamp,
      orderType: ev.event === 'market' ? 'market' : 'limit',
    }),
  );
}

/** The training/eval configuration: repo defaults except quote size, fill bonus, inventory limit, reward scale, zero latency. */
export const ENV_CONFIG = {
  max_inventory: 100000, // far away: the training run removed the early-exit shortcut
  inventory_penalty: 0.001,
  tick_size: 0.01,
  min_spread: 0.01,
  quote_ttl: 10.0,
  fill_bonus: 0.0,
  spread_penalty: 0.0001,
  reward_scaling: 0.01, // pnl_weight used in training
  quote_size: 10,
  max_episode_steps: 100000,
  lob_depth: 10,
  feature_window: 100,
};

export interface StepInfo {
  inventory: number;
  cash: number;
  realized_pnl: number;
  unrealized_pnl: number;
  fill_count: number;
  mid_price: number | null;
  reward: number;
  bid: number | null;
  ask: number | null;
  fills: Trade[];
  done: boolean;
}

/** numpy's pairwise float64 sum for a contiguous array of up to 128 values (add.reduce). */
function npSum(a: number[]): number {
  const n = a.length;
  if (n < 8) {
    let res = 0;
    for (let i = 0; i < n; i++) res += a[i];
    return res;
  }
  const r = a.slice(0, 8);
  let i = 8;
  for (; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] += a[i + j];
  let res = r[0] + r[1] + (r[2] + r[3]) + (r[4] + r[5] + (r[6] + r[7]));
  for (; i < n; i++) res += a[i];
  return res;
}

function npStd(a: number[]): number {
  const mean = npSum(a) / a.length;
  return Math.sqrt(npSum(a.map((v) => (v - mean) * (v - mean))) / a.length);
}

export class MarketMakingEnv {
  sim = new LOBSimulator();
  cfg = ENV_CONFIG;
  currentTime = 0;
  inventory = 0;
  cash = 0;
  realizedPnl = 0;
  unrealizedPnl = 0;
  positionValue = 0;
  entryPrice = 0;
  processedTradeCount = 0;
  rewardedFills = 0;
  episodeSteps = 0;
  episodePnl = 0;
  fillCount = 0;
  lateCancels = 0;
  activeQuotes: { bid?: string; ask?: string } = {};
  lastQuotes: { bid: number | null; ask: number | null } = { bid: null, ask: null };
  priceHistory: number[] = [];
  volumeHistory: number[] = [];
  tradeHistory: number[] = [];
  lastFillTime: number | null = null;
  done = false;
  private events: MarketEvent[];
  cursor = 0;

  constructor(events: MarketEvent[]) {
    this.events = events;
    // _load_historical_data: prime only through the first two-sided book, leaving future rows unseen.
    while (!(this.sim.lob.bids.size && this.sim.lob.asks.size)) {
      if (this.cursor >= events.length) throw new Error('Replay never establishes an initial two-sided book');
      this.advance();
    }
    if (this.cursor >= events.length) throw new Error('Replay needs events after its initial two-sided book');
    this.processedTradeCount = this.sim.lob.tradeCount;
    this.sim.step(this.currentTime);
    this.processMarketUpdate();
  }

  get exhausted() {
    return this.cursor >= this.events.length;
  }

  private advance() {
    const ev = this.events[this.cursor];
    this.currentTime = ev.timestamp;
    this.sim.step(this.currentTime);
    if (ev.event === 'cancel' && !this.sim.lob.orders.has('feed:' + ev.orderId)) this.lateCancels += 1;
    else applyEvent(ev, this.sim);
    this.cursor += 1;
  }

  private push(arr: number[], v: number) {
    arr.push(v);
    if (arr.length > this.cfg.feature_window) arr.shift();
  }

  private processMarketUpdate() {
    const mid = this.sim.lob.midPrice();
    if (mid !== null) this.push(this.priceHistory, mid);
    const d = this.sim.lob.depth(this.cfg.lob_depth);
    let vol = 0;
    for (const l of [...d.bids, ...d.asks]) vol += l.quantity;
    this.push(this.volumeHistory, vol);
  }

  step(rawAction: [number, number]): StepInfo {
    if (this.done) throw new Error('Historical episode ended; call reset before stepping again');
    const action: [number, number] = [f32(rawAction[0]), f32(rawAction[1])];
    if (action.some((a) => !Number.isFinite(a) || a < f32(-0.1) || a > f32(0.1))) throw new Error("Action offsets exceed the environment's action space");
    // Quotes act on the current observation before the next external event.
    this.cancelExistingQuotes();
    this.placeQuotes(action);
    this.advance();
    this.episodeSteps += 1;
    this.sim.step(this.currentTime);
    this.processMarketUpdate();
    const fills = this.updateAgentState();
    const reward = this.calculateReward();
    this.done =
      this.episodeSteps >= this.cfg.max_episode_steps ||
      this.exhausted ||
      Math.abs(this.inventory) >= this.cfg.max_inventory ||
      this.realizedPnl + this.unrealizedPnl < -10000;
    return {
      inventory: this.inventory,
      cash: this.cash,
      realized_pnl: this.realizedPnl,
      unrealized_pnl: this.unrealizedPnl,
      fill_count: this.fillCount,
      mid_price: this.sim.lob.midPrice(),
      reward,
      bid: this.lastQuotes.bid,
      ask: this.lastQuotes.ask,
      fills,
      done: this.done,
    };
  }

  private cancelExistingQuotes() {
    for (const id of Object.values(this.activeQuotes)) if (id) this.sim.cancelAgentOrder(id);
    this.activeQuotes = {};
  }

  /** _place_quotes with float32 action arithmetic, then round(x / tick) * tick in float64. */
  private placeQuotes([bidOffset, askOffset]: [number, number]) {
    const mid = this.sim.lob.midPrice();
    this.lastQuotes = { bid: null, ask: null };
    if (mid === null) return;
    const mid32 = f32(mid);
    let bid = f32(mid32 + f32(bidOffset * mid32));
    let ask = f32(mid32 + f32(askOffset * mid32));
    const minSpread = f32(this.cfg.min_spread);
    const gap = f32(ask - bid);
    if (gap < minSpread) {
      const adj = f32(f32(minSpread - gap) / 2);
      bid = f32(bid - adj);
      ask = f32(ask + adj);
    }
    const tick = this.cfg.tick_size;
    const tick32 = f32(tick);
    const bidPx = pyRound(f32(bid / tick32)) * tick;
    const askPx = pyRound(f32(ask / tick32)) * tick;
    if (bidPx > 0) {
      this.activeQuotes.bid = this.sim.placeAgentOrder('buy', bidPx, this.cfg.quote_size, 'agent', this.cfg.quote_ttl);
      this.lastQuotes.bid = bidPx;
    }
    if (askPx > 0) {
      this.activeQuotes.ask = this.sim.placeAgentOrder('sell', askPx, this.cfg.quote_size, 'agent', this.cfg.quote_ttl);
      this.lastQuotes.ask = askPx;
    }
  }

  /** _update_agent_state: consume each newly executed trade once and mark the open position. */
  private updateAgentState(): Trade[] {
    const book = this.sim.lob;
    const pending = book.tradeCount - this.processedTradeCount;
    if (pending < 0 || pending > book.trades.length) throw new Error('Trade history gap: cannot reconcile agent accounting');
    const mine: Trade[] = [];
    for (const fill of book.trades.slice(book.trades.length - pending)) {
      const bought = fill.buyerId.startsWith('agent_');
      const sold = fill.sellerId.startsWith('agent_');
      if (bought === sold) continue; // third-party or self trades earn nothing
      const quantity = bought ? fill.quantity : -fill.quantity;
      const previous = this.inventory;
      if (previous === 0 || previous * quantity > 0) {
        this.entryPrice = (Math.abs(previous) * this.entryPrice + Math.abs(quantity) * fill.price) / (Math.abs(previous) + Math.abs(quantity));
      } else {
        const closed = Math.min(Math.abs(previous), Math.abs(quantity));
        this.realizedPnl += closed * (fill.price - this.entryPrice) * Math.sign(previous);
        if (Math.abs(quantity) > Math.abs(previous)) this.entryPrice = fill.price;
        else if (Math.abs(quantity) === Math.abs(previous)) this.entryPrice = 0;
      }
      this.inventory += quantity;
      this.cash -= quantity * fill.price;
      this.fillCount += 1;
      this.lastFillTime = fill.timestamp;
      this.push(this.tradeHistory, quantity);
      mine.push(fill);
    }
    this.processedTradeCount = book.tradeCount;
    const mid = book.midPrice();
    if (mid !== null) {
      this.positionValue = this.inventory * mid;
      this.unrealizedPnl = this.inventory * (mid - this.entryPrice);
    }
    return mine;
  }

  /** _calculate_reward: delta PnL - inventory penalty + fill bonus - spread penalty. */
  private calculateReward(): number {
    const pnl = this.realizedPnl + this.unrealizedPnl;
    const delta = pnl - this.episodePnl;
    this.episodePnl = pnl;
    const invPen = this.cfg.inventory_penalty * Math.abs(this.inventory);
    let bonus = 0;
    const fresh = this.fillCount - this.rewardedFills;
    if (fresh > 0) {
      bonus = this.cfg.fill_bonus * fresh;
      this.rewardedFills = this.fillCount;
    }
    const s = this.sim.lob.spread();
    const spreadPen = s === null ? 0 : this.cfg.spread_penalty * s;
    return (delta - invPen + bonus - spreadPen) * this.cfg.reward_scaling;
  }

  /** _get_observation: 10 bid and 10 ask (price, size) pairs, market, agent, time and flow features. */
  observation(): Float32Array {
    const lob = this.sim.lob;
    const depth = lob.depth(this.cfg.lob_depth);
    const f: number[] = [];
    for (const side of [depth.bids, depth.asks]) {
      for (let i = 0; i < this.cfg.lob_depth; i++) {
        const l = side[i];
        f.push(l ? l.price : 0, l ? l.quantity : 0);
      }
    }
    const mid = lob.midPrice() || 0;
    const spread = lob.spread() || 0;
    let vol = 0;
    if (this.priceHistory.length >= 2) {
      const logs = this.priceHistory.map(Math.log);
      vol = npStd(logs.slice(1).map((v, i) => v - logs[i]));
    }
    f.push(mid, spread, lob.imbalance(), vol);
    let quotes = 0;
    for (const id of Object.values(this.activeQuotes)) if (id && lob.orders.has(id)) quotes += 1;
    f.push(this.inventory, this.unrealizedPnl, this.positionValue, quotes);
    const tsf = this.lastFillTime === null ? 1 : Math.min((this.currentTime - this.lastFillTime) / 60, 1);
    f.push((this.currentTime % 23400) / 23400, tsf);
    const recent = this.tradeHistory.slice(-10);
    let buy = 0;
    let sell = 0;
    for (const t of recent) {
      if (t > 0) buy += t;
      else if (t < 0) sell += -t;
    }
    f.push(buy + sell === 0 ? 0 : (buy - sell) / (buy + sell));
    let flow = 0;
    if (this.volumeHistory.length >= 2) {
      const avg = npSum(this.volumeHistory) / this.volumeHistory.length;
      if (avg !== 0) flow = (this.volumeHistory[this.volumeHistory.length - 1] - avg) / avg;
    }
    f.push(flow);
    return Float32Array.from(f);
  }
}
