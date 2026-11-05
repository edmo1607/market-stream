import { createSlice } from '@reduxjs/toolkit';
import { feedBatch, symbolChanged } from '@/app/actions';
import { SYMBOLS, type TickerEvent } from '@/feed/types';

export interface TickerState {
  data: Omit<TickerEvent, 'type' | 'symbol'> | null;
  /** Direction of the last price move, for the up/down colour. */
  direction: 'up' | 'down' | 'flat';
  symbol: string;
}

const initialState: TickerState = { data: null, direction: 'flat', symbol: SYMBOLS[0] };

const tickerSlice = createSlice({
  name: 'ticker',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(symbolChanged, (_, action) => ({ ...initialState, symbol: action.payload }))
      .addCase(feedBatch, (state, action) => {
        for (const event of action.payload) {
          if (event.type !== 'ticker' || event.symbol !== state.symbol) continue;
          const previous = state.data?.last;
          const { last, bid, ask, high, low, volume, change, changePct } = event;
          const data = { last, bid, ask, high, low, volume, change, changePct };
          if (previous != null && data.last !== previous) {
            state.direction = data.last > previous ? 'up' : 'down';
          }
          state.data = data;
        }
      });
  },
});

export default tickerSlice.reducer;
