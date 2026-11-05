import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { feedBatch, symbolChanged } from '@/app/actions';
import { BOOK_DEPTH, SYMBOLS, type BookEvent, type Level } from '@/feed/types';

/** Price levels keyed by price, so an update is O(1) instead of a search. */
export type LevelMap = Record<string, number>;

export interface BookState {
  symbol: string;
  bids: LevelMap;
  asks: LevelMap;
  /** Price bucket for display (0 = raw prices). */
  grouping: number;
  /** True once a snapshot arrived; updates before it are ignored. */
  ready: boolean;
}

const initialState: BookState = {
  symbol: SYMBOLS[0],
  bids: {},
  asks: {},
  grouping: 0,
  ready: false,
};

function apply(side: LevelMap, levels: Level[]) {
  for (const [price, qty] of levels) {
    if (qty === 0) delete side[price];
    else side[price] = qty;
  }
}

/** Keep only the best `depth` levels: highest bids, lowest asks. */
function trim(side: LevelMap, depth: number, best: 'high' | 'low') {
  const prices = Object.keys(side).map(Number);
  if (prices.length <= depth) return;
  prices.sort((a, b) => (best === 'high' ? b - a : a - b));
  for (const price of prices.slice(depth)) delete side[price];
}

export function applyBookEvent(state: BookState, event: BookEvent, depth = BOOK_DEPTH) {
  if (event.symbol !== state.symbol) return; // late message from the previous market
  if (event.kind === 'snapshot') {
    state.bids = {};
    state.asks = {};
    state.ready = true;
  } else if (!state.ready) {
    return; // an update without its snapshot can't be trusted
  }
  apply(state.bids, event.bids);
  apply(state.asks, event.asks);
  trim(state.bids, depth, 'high');
  trim(state.asks, depth, 'low');
}

const bookSlice = createSlice({
  name: 'book',
  initialState,
  reducers: {
    groupingChanged(state, action: PayloadAction<number>) {
      state.grouping = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(symbolChanged, (_, action) => ({
        ...initialState,
        grouping: 0,
        symbol: action.payload,
      }))
      .addCase(feedBatch, (state, action) => {
        for (const event of action.payload) if (event.type === 'book') applyBookEvent(state, event);
      });
  },
});

export const { groupingChanged } = bookSlice.actions;
export default bookSlice.reducer;
