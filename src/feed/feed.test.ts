import { backoffDelay } from './backoff';
import { createBatcher } from './batcher';
import { krakenSubscribe, parseKrakenMessage } from './krakenParser';
import { createSimulatedFeed } from './simulatedFeed';
import type { BookEvent, FeedEvent } from './types';

describe('Kraken v2 parser', () => {
  it('normalises book snapshots and updates', () => {
    const [snap] = parseKrakenMessage(
      JSON.stringify({
        channel: 'book',
        type: 'snapshot',
        data: [
          {
            symbol: 'BTC/USD',
            bids: [{ price: 100.5, qty: 2 }],
            asks: [{ price: 101, qty: 1.5 }],
            checksum: 1,
          },
        ],
      }),
    );
    expect(snap).toEqual({
      type: 'book',
      kind: 'snapshot',
      symbol: 'BTC/USD',
      bids: [[100.5, 2]],
      asks: [[101, 1.5]],
    });

    const [update] = parseKrakenMessage(
      JSON.stringify({
        channel: 'book',
        type: 'update',
        data: [{ symbol: 'BTC/USD', bids: [{ price: 100.5, qty: 0 }], asks: [] }],
      }),
    );
    expect(update).toMatchObject({ kind: 'update', bids: [[100.5, 0]] });
  });

  it('normalises trades and tickers', () => {
    const [trades] = parseKrakenMessage(
      JSON.stringify({
        channel: 'trade',
        type: 'update',
        data: [
          {
            symbol: 'ETH/USD',
            side: 'sell',
            price: 3500.1,
            qty: 0.4,
            trade_id: 9,
            timestamp: '2026-11-05T15:00:00.000Z',
          },
        ],
      }),
    );
    expect(trades).toEqual({
      type: 'trades',
      symbol: 'ETH/USD',
      trades: [
        {
          id: '9',
          side: 'sell',
          price: 3500.1,
          qty: 0.4,
          time: Date.parse('2026-11-05T15:00:00.000Z'),
        },
      ],
    });
    const [ticker] = parseKrakenMessage(
      JSON.stringify({
        channel: 'ticker',
        type: 'update',
        data: [
          {
            symbol: 'ETH/USD',
            last: 1,
            bid: 1,
            ask: 2,
            high: 3,
            low: 0.5,
            volume: 10,
            change: 0.1,
            change_pct: 1.2,
          },
        ],
      }),
    );
    expect(ticker).toMatchObject({ type: 'ticker', changePct: 1.2 });
  });

  it('ignores heartbeats, acks and malformed frames', () => {
    expect(parseKrakenMessage('{"channel":"heartbeat"}')).toEqual([]);
    expect(parseKrakenMessage('{"method":"subscribe","success":true}')).toEqual([]);
    expect(parseKrakenMessage('not json')).toEqual([]);
  });

  it('builds subscribe messages for book, ticker and trades', () => {
    expect(krakenSubscribe('BTC/USD', 25).map((m) => m.params.channel)).toEqual([
      'book',
      'ticker',
      'trade',
    ]);
  });
});

describe('backoff', () => {
  it('grows exponentially, stays within jitter bounds and caps at 30 s', () => {
    expect(backoffDelay(0, () => 0)).toBe(250);
    expect(backoffDelay(0, () => 1)).toBe(500);
    expect(backoffDelay(3, () => 1)).toBe(4000);
    expect(backoffDelay(20, () => 1)).toBe(30_000);
  });
});

describe('batcher', () => {
  it('delivers everything received before a frame in one flush', () => {
    const flushed: FeedEvent[][] = [];
    let frame: (() => void) | null = null;
    const batcher = createBatcher(
      (e) => flushed.push(e),
      (cb) => (frame = cb),
    );
    const tick = { type: 'trades', symbol: 'X', trades: [] } as FeedEvent;

    batcher.push([tick]);
    batcher.push([tick, tick]);
    expect(flushed).toHaveLength(0);
    frame!();
    expect(flushed).toEqual([[tick, tick, tick]]);

    batcher.stop();
    batcher.push([tick]);
    expect(flushed).toHaveLength(1);
  });
});

describe('simulated feed', () => {
  it('never produces a crossed book', () => {
    vi.useFakeTimers();
    const bids = new Map<number, number>();
    const asks = new Map<number, number>();
    const apply = (e: BookEvent) => {
      if (e.kind === 'snapshot') {
        bids.clear();
        asks.clear();
      }
      for (const [p, q] of e.bids) {
        if (q) bids.set(p, q);
        else bids.delete(p);
      }
      for (const [p, q] of e.asks) {
        if (q) asks.set(p, q);
        else asks.delete(p);
      }
    };
    const feed = createSimulatedFeed({
      onEvents: (events) => events.forEach((e) => e.type === 'book' && apply(e)),
      onStatus: () => {},
    });
    feed.subscribe('BTC/USD');
    for (let i = 0; i < 500; i++) {
      vi.advanceTimersByTime(50);
      expect(Math.max(...bids.keys())).toBeLessThan(Math.min(...asks.keys()));
    }
    feed.close();
    vi.useRealTimers();
  });
});
