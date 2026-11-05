import { createSlice } from '@reduxjs/toolkit';
import { feedBatch, symbolChanged } from '@/app/actions';
import { SYMBOLS, type Trade } from '@/feed/types';

export const TRADES_KEPT = 50;

interface TradesState {
  symbol: string;
  /** Newest first, bounded so memory stays flat however long the page is open. */
  items: Trade[];
}

const initialState: TradesState = { symbol: SYMBOLS[0], items: [] };

const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(symbolChanged, (_, action) => ({ symbol: action.payload, items: [] }))
      .addCase(feedBatch, (state, action) => {
        const incoming: Trade[] = [];
        for (const event of action.payload) {
          if (event.type === 'trades' && event.symbol === state.symbol)
            incoming.push(...event.trades);
        }
        if (!incoming.length) return;
        incoming.sort((a, b) => b.time - a.time);
        state.items = [...incoming, ...state.items].slice(0, TRADES_KEPT);
      });
  },
});

export default tradesSlice.reducer;
