// A line-for-line TypeScript port of DRL4MM simulator/lob_simulator.py:
// LimitOrderBook (FIFO price-time matching) and LOBSimulator (agent order plumbing).
// Python heaps are replaced by sorted price arrays; behaviour is otherwise the same,
// including Python's round-half-to-even when quotes are snapped to the tick.

export type Side = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';

export interface Order {
  orderId: string;
  side: Side;
  price: number;
  quantity: number;
  timestamp: number;
  orderType: OrderType;
  ttl: number | null;
  expiryTime: number | null;
  agentId: string | null;
}

export interface Trade {
  tradeId: number;
  price: number;
  quantity: number;
  timestamp: number;
  buyerId: string;
  sellerId: string;
  aggressiveSide: Side;
}

interface Level {
  price: number;
  totalQuantity: number;
  orderCount: number;
  orders: Order[]; // FIFO queue
}

export interface DepthLevel {
  price: number;
  quantity: number;
  orders: number;
  agentQty: number;
}

export function makeOrder(o: Omit<Order, 'expiryTime' | 'ttl' | 'agentId' | 'orderType'> & Partial<Pick<Order, 'ttl' | 'agentId' | 'orderType'>>): Order {
  const ttl = o.ttl ?? null;
  return {
    orderType: 'limit',
    agentId: null,
    ...o,
    ttl,
    expiryTime: ttl === null ? null : o.timestamp + ttl,
  };
}

/** Python's round(): half to even. */
export function pyRound(x: number): number {
  const r = Math.round(x);
  if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
  return r;
}

const TRADE_LOG = 1000; // deque(maxlen=1000)

export class LimitOrderBook {
  bids = new Map<number, Level>();
  asks = new Map<number, Level>();
  bidPrices: number[] = []; // descending
  askPrices: number[] = []; // ascending
  orders = new Map<string, Order>();
  orderToLevel = new Map<string, [Side, number]>();
  lastTradePrice: number | null = null;
  trades: Trade[] = [];
  totalVolume = 0;
  tradeCount = 0;
  private tradeSeq = 0;

  addOrder(order: Order): Trade[] {
    if (!order.orderId) throw new Error('order_id must be a nonempty string');
    if (this.orders.has(order.orderId)) throw new Error(`Duplicate active order ID: ${order.orderId}`);
    if (!Number.isInteger(order.quantity) || order.quantity <= 0) throw new Error('Order quantity must be a positive integer');
    if (order.orderType === 'limit' && (!Number.isFinite(order.price) || order.price <= 0)) throw new Error('Limit price must be finite and positive');
    return order.orderType === 'market' ? this.processMarketOrder(order) : this.processLimitOrder(order);
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    const [side, price] = this.orderToLevel.get(orderId)!;
    const book = side === 'buy' ? this.bids : this.asks;
    const level = book.get(price)!;
    level.orders.splice(level.orders.indexOf(order), 1);
    level.totalQuantity -= order.quantity;
    level.orderCount -= 1;
    if (level.orderCount === 0) {
      book.delete(price);
      const arr = side === 'buy' ? this.bidPrices : this.askPrices;
      arr.splice(arr.indexOf(price), 1);
    }
    this.orders.delete(orderId);
    this.orderToLevel.delete(orderId);
    return true;
  }

  private processMarketOrder(order: Order): Trade[] {
    const trades: Trade[] = [];
    let remaining = order.quantity;
    const buy = order.side === 'buy';
    const prices = buy ? this.askPrices : this.bidPrices;
    const book = buy ? this.asks : this.bids;
    while (remaining > 0 && prices.length) {
      const best = prices[0];
      const level = book.get(best)!;
      const [trade, consumed] = this.executeTradeAtLevel(order, level, best, remaining);
      if (trade) {
        trades.push(trade);
        remaining -= consumed;
      }
      if (level.orderCount === 0) {
        book.delete(best);
        prices.shift();
      }
    }
    // Unfilled market-order quantity is discarded.
    return trades;
  }

  private processLimitOrder(order: Order): Trade[] {
    const trades: Trade[] = [];
    let remaining = order.quantity;
    const buy = order.side === 'buy';
    const prices = buy ? this.askPrices : this.bidPrices;
    const book = buy ? this.asks : this.bids;
    while (remaining > 0 && prices.length) {
      const best = prices[0];
      const crosses = buy ? best <= order.price : best >= order.price;
      if (!crosses) break;
      const level = book.get(best)!;
      const [trade, consumed] = this.executeTradeAtLevel(order, level, best, remaining);
      if (trade) {
        trades.push(trade);
        remaining -= consumed;
      }
      if (level.orderCount === 0) {
        book.delete(best);
        prices.shift();
      }
    }
    if (remaining > 0) this.addOrderToBook({ ...order, quantity: remaining });
    return trades;
  }

  private executeTradeAtLevel(incoming: Order, level: Level, price: number, maxQty: number): [Trade | null, number] {
    if (level.orderCount === 0) return [null, 0];
    const resting = level.orders[0];
    const qty = Math.min(maxQty, resting.quantity);
    const buy = incoming.side === 'buy';
    const trade: Trade = {
      tradeId: ++this.tradeSeq,
      price,
      quantity: qty,
      timestamp: incoming.timestamp,
      buyerId: buy ? incoming.orderId : resting.orderId,
      sellerId: buy ? resting.orderId : incoming.orderId,
      aggressiveSide: incoming.side,
    };
    this.lastTradePrice = price;
    this.totalVolume += qty;
    this.tradeCount += 1;
    this.trades.push(trade);
    if (this.trades.length > TRADE_LOG) this.trades.shift();
    resting.quantity -= qty;
    level.totalQuantity -= qty;
    if (resting.quantity === 0) {
      level.orders.shift();
      level.orderCount -= 1;
      this.orders.delete(resting.orderId);
      this.orderToLevel.delete(resting.orderId);
    }
    return [trade, qty];
  }

  private addOrderToBook(order: Order) {
    const buy = order.side === 'buy';
    const book = buy ? this.bids : this.asks;
    let level = book.get(order.price);
    if (!level) {
      level = { price: order.price, totalQuantity: 0, orderCount: 0, orders: [] };
      book.set(order.price, level);
      const arr = buy ? this.bidPrices : this.askPrices;
      let i = 0;
      while (i < arr.length && (buy ? arr[i] > order.price : arr[i] < order.price)) i++;
      arr.splice(i, 0, order.price);
    }
    level.orders.push(order);
    level.totalQuantity += order.quantity;
    level.orderCount += 1;
    this.orders.set(order.orderId, order);
    this.orderToLevel.set(order.orderId, [order.side, order.price]);
  }

  bestBid(): number | null {
    return this.bidPrices.length ? this.bidPrices[0] : null;
  }
  bestAsk(): number | null {
    return this.askPrices.length ? this.askPrices[0] : null;
  }
  spread(): number | null {
    const b = this.bestBid();
    const a = this.bestAsk();
    return b === null || a === null ? null : a - b;
  }
  midPrice(): number | null {
    const b = this.bestBid();
    const a = this.bestAsk();
    if (b === null || a === null) return this.lastTradePrice;
    return (b + a) / 2;
  }

  depth(levels = 10): { bids: DepthLevel[]; asks: DepthLevel[] } {
    const row = (l: Level): DepthLevel => ({
      price: l.price,
      quantity: l.totalQuantity,
      orders: l.orderCount,
      agentQty: l.orders.reduce((s, o) => s + (o.agentId ? o.quantity : 0), 0),
    });
    return {
      bids: this.bidPrices.slice(0, levels).map((p) => row(this.bids.get(p)!)),
      asks: this.askPrices.slice(0, levels).map((p) => row(this.asks.get(p)!)),
    };
  }

  imbalance(): number {
    let b = 0;
    let a = 0;
    this.bids.forEach((l) => (b += l.totalQuantity));
    this.asks.forEach((l) => (a += l.totalQuantity));
    return b + a === 0 ? 0 : (b - a) / (b + a);
  }

  cleanupExpiredOrders(now: number): string[] {
    const expired: string[] = [];
    for (const [id, o] of [...this.orders]) {
      if (o.expiryTime !== null && now >= o.expiryTime && this.cancelOrder(id)) expired.push(id);
    }
    return expired;
  }
}

/** LOBSimulator with latency_mean = 0, as the replay CLI runs it. */
export class LOBSimulator {
  lob = new LimitOrderBook();
  currentTime = 0;
  orderIdCounter = 0;
  agentOrders = new Map<string, Order>();

  step(timestamp: number) {
    this.currentTime = timestamp;
    this.lob.cleanupExpiredOrders(timestamp);
  }

  placeAgentOrder(side: Side, price: number, quantity: number, agentId = 'agent', ttl: number | null = null): string {
    const orderId = `${agentId}_${this.orderIdCounter}`;
    this.orderIdCounter += 1;
    const order = makeOrder({ orderId, side, price, quantity, timestamp: this.currentTime, ttl, agentId });
    this.lob.addOrder(order);
    if (this.lob.orders.has(orderId)) this.agentOrders.set(orderId, order);
    return orderId;
  }

  cancelAgentOrder(orderId: string): boolean {
    const ok = this.lob.cancelOrder(orderId);
    if (ok) this.agentOrders.delete(orderId);
    return ok;
  }
}
