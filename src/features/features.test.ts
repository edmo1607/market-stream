import { feedBatch, symbolChanged } from '@/app/actions';
import { makeStore } from '@/app/store';
import type { FeedEvent } from '@/feed/types';
import { groupingChanged } from './book/bookSlice';
import { buildSide, makeSelectBookView } from './book/selectors';
import { orderPlaced, validateOrder } from './orders/ordersSlice';

const book = (
  kind: 'snapshot' | 'update',
  bids: [number, number][],
  asks: [number, number][],
  symbol = 'BTC/USD',
): FeedEvent => ({
  type: 'book',
  kind,
  symbol,
  bids,
  asks,
});

describe('order book reducer', () => {
  it('applies a snapshot, then updates, and removes zero-quantity levels', () => {
    const store = makeStore();
    store.dispatch(
      feedBatch([
        book(
          'snapshot',
          [
            [100, 1],
            [99, 2],
          ],
          [
            [101, 1],
            [102, 3],
          ],
        ),
      ]),
    );
    store.dispatch(
      feedBatch([
        book(
          'update',
          [
            [100, 0],
            [99.5, 4],
          ],
          [[101, 2]],
        ),
      ]),
    );
    expect(store.getState().book.bids).toEqual({ 99: 2, 99.5: 4 });
    expect(store.getState().book.asks).toEqual({ 101: 2, 102: 3 });
  });

  it('ignores updates before the snapshot and messages for another market', () => {
    const store = makeStore();
    store.dispatch(feedBatch([book('update', [[100, 1]], [])]));
    expect(store.getState().book.ready).toBe(false);
    store.dispatch(
      feedBatch([
        book('snapshot', [[100, 1]], [[101, 1]]),
        book('update', [[50, 1]], [], 'ETH/USD'),
      ]),
    );
    expect(store.getState().book.bids).toEqual({ 100: 1 });
  });

  it('keeps only the best 25 levels per side', () => {
    const store = makeStore();
    const bids = Array.from({ length: 40 }, (_, i) => [1000 - i, 1] as [number, number]);
    store.dispatch(feedBatch([book('snapshot', bids, [[1001, 1]])]));
    const prices = Object.keys(store.getState().book.bids).map(Number);
    expect(prices).toHaveLength(25);
    expect(Math.min(...prices)).toBe(976);
  });

  it('resets everything when the market changes', () => {
    const store = makeStore();
    store.dispatch(feedBatch([book('snapshot', [[100, 1]], [[101, 1]])]));
    store.dispatch(symbolChanged('ETH/USD'));
    expect(store.getState().book).toMatchObject({ symbol: 'ETH/USD', ready: false, bids: {} });
  });
});

describe('book view selector', () => {
  it('sorts, accumulates totals and computes the spread', () => {
    const store = makeStore();
    store.dispatch(
      feedBatch([
        book(
          'snapshot',
          [
            [99, 1],
            [100, 2],
          ],
          [
            [102, 1],
            [101, 3],
          ],
        ),
      ]),
    );
    const view = makeSelectBookView(10)(store.getState());
    expect(view.bids).toEqual([
      { price: 100, qty: 2, total: 2 },
      { price: 99, qty: 1, total: 3 },
    ]);
    expect(view.asks[0]).toEqual({ price: 101, qty: 3, total: 3 });
    expect(view.spread).toBe(1);
    expect(view.mid).toBe(100.5);
    expect(view.maxTotal).toBe(4);
  });

  it('groups bids down and asks up, so a bucket never looks better than the market', () => {
    expect(buildSide({ 100.4: 1, 100.9: 2, 99.2: 1 }, 'bid', 1, 5)).toEqual([
      { price: 100, qty: 3, total: 3 },
      { price: 99, qty: 1, total: 4 },
    ]);
    expect(buildSide({ 100.4: 1, 100.9: 2 }, 'ask', 1, 5)).toEqual([
      { price: 101, qty: 3, total: 3 },
    ]);
  });

  it('is memoised: same state, same object', () => {
    const store = makeStore();
    const select = makeSelectBookView();
    store.dispatch(feedBatch([book('snapshot', [[1, 1]], [[2, 1]])]));
    const first = select(store.getState());
    expect(select(store.getState())).toBe(first);
    store.dispatch(groupingChanged(1));
    expect(select(store.getState())).not.toBe(first);
  });
});

describe('paper orders', () => {
  it('fills a market order at the best opposite price', () => {
    const store = makeStore();
    store.dispatch(feedBatch([book('snapshot', [[100, 1]], [[101, 1]])]));
    store.dispatch(
      orderPlaced({ symbol: 'BTC/USD', side: 'buy', type: 'market', price: null, qty: 1 }),
    );
    expect(store.getState().orders.items[0]).toMatchObject({ status: 'filled', fillPrice: 101 });
  });

  it('fills a limit order when a trade crosses its price, once', () => {
    const store = makeStore();
    store.dispatch(
      orderPlaced({ symbol: 'BTC/USD', side: 'buy', type: 'limit', price: 99, qty: 1 }),
    );
    const trade = (price: number, id: string): FeedEvent => ({
      type: 'trades',
      symbol: 'BTC/USD',
      trades: [{ id, side: 'sell', price, qty: 1, time: Date.now() }],
    });
    store.dispatch(feedBatch([trade(99.5, 'a')]));
    expect(store.getState().orders.items[0]!.status).toBe('open');
    store.dispatch(feedBatch([trade(98.9, 'b'), trade(98, 'c')]));
    expect(store.getState().orders.items[0]).toMatchObject({ status: 'filled', fillPrice: 99 });
  });

  it('validates the order form', () => {
    expect(validateOrder('limit', '', '1')).toEqual({ price: 'Enter a price above 0.' });
    expect(validateOrder('market', '', '0')).toEqual({ qty: 'Enter an amount above 0.' });
    expect(validateOrder('market', '', '0.123456789')).toEqual({ qty: 'Up to 8 decimals.' });
    expect(validateOrder('limit', '100', '0.5')).toEqual({});
  });
});
