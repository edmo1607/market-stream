import { createListenerMiddleware, type TypedStartListening } from '@reduxjs/toolkit';
import { feedBatch } from '@/app/actions';
import type { AppDispatch, RootState } from '@/app/store';
import { selectBestPrices } from '@/features/book/selectors';
import { orderFilled, orderPlaced } from './ordersSlice';

/**
 * Side effects live here, not in reducers or components (the role Redux-Saga plays in
 * older codebases): market orders fill at the best opposite price; limit orders fill
 * when a trade on the tape crosses their price.
 */
export const fillListener = createListenerMiddleware();
const startListening = fillListener.startListening as TypedStartListening<RootState, AppDispatch>;

startListening({
  actionCreator: orderPlaced,
  effect: (action, api) => {
    const order = action.payload;
    if (order.type !== 'market') return;
    const { bestBid, bestAsk } = selectBestPrices(api.getState());
    const price = order.side === 'buy' ? bestAsk : bestBid;
    if (price != null) api.dispatch(orderFilled({ id: order.id, price }));
  },
});

startListening({
  actionCreator: feedBatch,
  effect: (action, api) => {
    const open = api
      .getState()
      .orders.items.filter((o) => o.status === 'open' && o.type === 'limit');
    if (!open.length) return;
    const filled = new Set<string>(); // state is immutable; track fills within this batch
    for (const event of action.payload) {
      if (event.type !== 'trades') continue;
      for (const trade of event.trades) {
        for (const order of open) {
          if (order.status !== 'open' || order.symbol !== event.symbol || order.price == null)
            continue;
          const crosses =
            order.side === 'buy' ? trade.price <= order.price : trade.price >= order.price;
          if (crosses) {
            api.dispatch(orderFilled({ id: order.id, price: order.price }));
            filled.add(order.id);
          }
        }
      }
    }
  },
});
