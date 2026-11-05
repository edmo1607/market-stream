import {
  BOOK_DEPTH,
  type Feed,
  type FeedEvent,
  type FeedHandlers,
  type Level,
  type Trade,
} from './types';

const START: Record<string, number> = {
  'BTC/USD': 68_000,
  'ETH/USD': 3_500,
  'SOL/USD': 160,
  'LTC/USD': 90,
};

/**
 * Offline market simulator: a random-walk mid price with a realistic book and trades,
 * ~20 messages a second. The UI can't tell it from the live feed, which is the point —
 * demos and tests never depend on the network.
 */
export function createSimulatedFeed(
  { onEvents, onStatus }: FeedHandlers,
  { intervalMs = 50, random = Math.random } = {},
): Feed {
  let symbol: string | null = null;
  let mid = 0;
  let open = 0;
  let high = 0;
  let low = 0;
  let volume = 0;
  let tradeId = 0;
  let tick = 0.5;

  const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
  const size = () => round(random() * 2 + 0.01, 4);
  // The simulator keeps its own book, so the diffs it sends stay consistent (never crossed).
  let bids = new Map<number, number>();
  let asks = new Map<number, number>();

  function snapshot(): FeedEvent {
    bids = new Map();
    asks = new Map();
    for (let i = 1; i <= BOOK_DEPTH; i++) {
      bids.set(round(mid - i * tick), size());
      asks.set(round(mid + i * tick), size());
    }
    return { type: 'book', kind: 'snapshot', symbol: symbol!, bids: [...bids], asks: [...asks] };
  }

  function step(): FeedEvent[] {
    mid = Math.max(tick * 10, mid + (random() - 0.5) * tick * 4);
    high = Math.max(high, mid);
    low = Math.min(low, mid);
    const bestBid = round(Math.floor(mid / tick) * tick - tick);
    const bestAsk = round(bestBid + tick * 2);
    const changes = { bids: [] as Level[], asks: [] as Level[] };
    const set = (side: 'bids' | 'asks', price: number, qty: number) => {
      const book = side === 'bids' ? bids : asks;
      if (qty === 0) book.delete(price);
      else book.set(price, qty);
      changes[side].push([price, qty]);
    };

    // Levels the price moved through are consumed.
    for (const p of bids.keys()) if (p > bestBid) set('bids', p, 0);
    for (const p of asks.keys()) if (p < bestAsk) set('asks', p, 0);
    // Refresh the touch, then a few random levels deeper in the book.
    set('bids', bestBid, size());
    set('asks', bestAsk, size());
    for (let i = 0; i < 3; i++) {
      const offset = Math.ceil(random() * 12) * tick;
      set('bids', round(bestBid - offset), random() < 0.15 ? 0 : size());
      set('asks', round(bestAsk + offset), random() < 0.15 ? 0 : size());
    }
    const events: FeedEvent[] = [{ type: 'book', kind: 'update', symbol: symbol!, ...changes }];

    if (random() < 0.5) {
      const side = random() < 0.5 ? 'buy' : 'sell';
      const trade: Trade = {
        id: String(++tradeId),
        side,
        price: side === 'buy' ? bestAsk : bestBid,
        qty: round(random() * 0.8 + 0.001, 4),
        time: Date.now(),
      };
      volume += trade.qty;
      events.push({ type: 'trades', symbol: symbol!, trades: [trade] });
    }

    events.push({
      type: 'ticker',
      symbol: symbol!,
      last: round(mid),
      bid: bestBid,
      ask: bestAsk,
      high: round(high),
      low: round(low),
      volume: round(volume, 3),
      change: round(mid - open),
      changePct: round(((mid - open) / open) * 100),
    });
    return events;
  }

  onStatus('open');
  const timer = setInterval(() => {
    if (symbol) onEvents(step());
  }, intervalMs);

  return {
    subscribe(next) {
      symbol = next;
      mid = open = high = low = START[next] ?? 100;
      tick = mid > 10_000 ? 0.5 : mid > 1_000 ? 0.05 : 0.01;
      volume = 0;
      onEvents([snapshot()]);
    },
    close() {
      clearInterval(timer);
      onStatus('closed');
    },
  };
}
