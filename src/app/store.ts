import { combineReducers, configureStore } from '@reduxjs/toolkit';
import book from '@/features/book/bookSlice';
import candles from '@/features/candles/candlesSlice';
import connection from '@/features/connection/connectionSlice';
import { fillListener } from '@/features/orders/fillListener';
import orders from '@/features/orders/ordersSlice';
import ticker from '@/features/ticker/tickerSlice';
import trades from '@/features/trades/tradesSlice';

const rootReducer = combineReducers({ book, ticker, trades, candles, connection, orders });

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) =>
      getDefault({
        // The feed can deliver hundreds of events per batch; the dev-only checks would
        // dominate the profile without catching anything our reducers can do wrong.
        immutableCheck: { warnAfter: 128 },
        serializableCheck: { warnAfter: 128 },
      }).prepend(fillListener.middleware),
  });
}

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
