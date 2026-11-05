import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import type { LevelMap } from './bookSlice';

export interface BookRow {
  price: number;
  qty: number;
  /** Running total from the best price outwards (market depth). */
  total: number;
}

export interface BookView {
  bids: BookRow[];
  asks: BookRow[];
  spread: number | null;
  spreadPct: number | null;
  mid: number | null;
  /** Largest total on screen, to scale the depth bars. */
  maxTotal: number;
}

/**
 * Sorts, groups into price buckets and accumulates one side of the book.
 * Bids round down and asks round up, so a bucket never shows a better price than exists.
 */
export function buildSide(
  levels: LevelMap,
  side: 'bid' | 'ask',
  grouping: number,
  rows: number,
): BookRow[] {
  const buckets = new Map<number, number>();
  for (const [p, qty] of Object.entries(levels)) {
    const price = Number(p);
    const bucket =
      grouping > 0
        ? Number(
            ((side === 'bid' ? Math.floor : Math.ceil)(price / grouping) * grouping).toFixed(8),
          )
        : price;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + qty);
  }
  //sorts the bids from highest to lowest price and the asks from lowest to highest
  const sorted = [...buckets.entries()].sort((a, b) =>
    side === 'bid' ? b[0] - a[0] : a[0] - b[0],
  );
  let total = 0;
  //sum qty of total and bars lenght
  return sorted.slice(0, rows).map(([price, qty]) => ({ price, qty, total: (total += qty) }));
}

const selectBook = (state: RootState) => state.book;

/** Memoised: recomputed only when the book or the grouping changes, not on every render. */
export const makeSelectBookView = (rows = 12) =>
  createSelector([selectBook], (book): BookView => {
    const bids = buildSide(book.bids, 'bid', book.grouping, rows);
    const asks = buildSide(book.asks, 'ask', book.grouping, rows);
    const bestBid = bids[0]?.price;
    const bestAsk = asks[0]?.price;
    const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
    const mid = spread != null ? (bestAsk! + bestBid!) / 2 : null;
    return {
      bids,
      asks,
      spread,
      spreadPct: spread != null && mid ? (spread / mid) * 100 : null,
      mid,
      maxTotal: Math.max(bids.at(-1)?.total ?? 0, asks.at(-1)?.total ?? 0),
    };
  });

export const selectBestPrices = createSelector([selectBook], (book) => {
  const bids = Object.keys(book.bids).map(Number);
  const asks = Object.keys(book.asks).map(Number);
  return {
    bestBid: bids.length ? Math.max(...bids) : null,
    bestAsk: asks.length ? Math.min(...asks) : null,
  };
});
