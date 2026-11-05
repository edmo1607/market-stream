import { createSlice } from '@reduxjs/toolkit';
import { feedBatch, symbolChanged } from '@/app/actions';
import { SYMBOLS } from '@/feed/types';

export interface Candle {
  /** Bucket start, epoch seconds (what the chart library expects). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const CANDLE_SECONDS = 15;
const CANDLES_KEPT = 240;

interface CandlesState {
  symbol: string;
  items: Candle[];
}

const initialState: CandlesState = { symbol: SYMBOLS[0], items: [] };

/** Builds OHLC candles from the trade stream, so the chart needs no extra request. */
const candlesSlice = createSlice({
  name: 'candles',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(symbolChanged, (_, action) => ({ symbol: action.payload, items: [] }))
      .addCase(feedBatch, (state, action) => {
        for (const event of action.payload) {
          if (event.type !== 'trades' || event.symbol !== state.symbol) continue;
          for (const trade of [...event.trades].sort((a, b) => a.time - b.time)) {
            const time = Math.floor(trade.time / 1000 / CANDLE_SECONDS) * CANDLE_SECONDS;
            const last = state.items.at(-1);
            if (last && last.time === time) {
              last.high = Math.max(last.high, trade.price);
              last.low = Math.min(last.low, trade.price);
              last.close = trade.price;
              last.volume += trade.qty;
            } else if (!last || time > last.time) {
              state.items.push({
                time,
                open: trade.price,
                high: trade.price,
                low: trade.price,
                close: trade.price,
                volume: trade.qty,
              });
              if (state.items.length > CANDLES_KEPT) state.items.shift();
            }
            // Older trades (snapshot backfill out of order) are ignored rather than rewriting history.
          }
        }
      });
  },
});

export default candlesSlice.reducer;
