import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { feedBatch, statusChanged, symbolChanged } from '@/app/actions';
import { SYMBOLS, type ConnectionStatus } from '@/feed/types';

export type Source = 'live' | 'simulated';

interface ConnectionState {
  symbol: string;
  source: Source;
  status: ConnectionStatus;
  detail?: string;
  /** Why we fell back to simulated data, if we did. */
  notice?: string;
  messages: number;
  lastMessageAt: number | null;
}

const initialState: ConnectionState = {
  symbol: SYMBOLS[0],
  source: 'live',
  status: 'connecting',
  messages: 0,
  lastMessageAt: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    sourceChanged(state, action: PayloadAction<{ source: Source; notice?: string }>) {
      state.source = action.payload.source;
      state.notice = action.payload.notice;
      state.status = 'connecting';
      state.detail = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(symbolChanged, (state, action) => {
        state.symbol = action.payload;
      })
      .addCase(statusChanged, (state, action) => {
        state.status = action.payload.status;
        state.detail = action.payload.detail;
      })
      .addCase(feedBatch, (state, action) => {
        state.messages += action.payload.length;
        state.lastMessageAt = Date.now();
      });
  },
});

export const { sourceChanged } = connectionSlice.actions;
export default connectionSlice.reducer;
