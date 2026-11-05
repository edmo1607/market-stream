import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { Side } from '@/feed/types';

export type OrderType = 'limit' | 'market';

export interface Order {
  id: string;
  symbol: string;
  side: Side;
  type: OrderType;
  /** Limit price; null for market orders. */
  price: number | null;
  qty: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: number;
  fillPrice?: number;
  filledAt?: number;
}

export interface NewOrder {
  symbol: string;
  side: Side;
  type: OrderType;
  price: number | null;
  qty: number;
}

/** Paper trading: orders live in the browser and fill against the real market stream. */
const ordersSlice = createSlice({
  name: 'orders',
  initialState: { items: [] as Order[] },
  reducers: {
    orderPlaced: {
      reducer(state, action: PayloadAction<Order>) {
        state.items.unshift(action.payload);
      },
      prepare(order: NewOrder) {
        return {
          payload: { ...order, id: nanoid(8), status: 'open' as const, createdAt: Date.now() },
        };
      },
    },
    orderCancelled(state, action: PayloadAction<string>) {
      const order = state.items.find((o) => o.id === action.payload);
      if (order?.status === 'open') order.status = 'cancelled';
    },
    orderFilled(state, action: PayloadAction<{ id: string; price: number }>) {
      const order = state.items.find((o) => o.id === action.payload.id);
      if (order?.status !== 'open') return;
      order.status = 'filled';
      order.fillPrice = action.payload.price;
      order.filledAt = Date.now();
    },
  },
});

export const { orderPlaced, orderCancelled, orderFilled } = ordersSlice.actions;
export default ordersSlice.reducer;

export interface OrderErrors {
  price?: string;
  qty?: string;
}

/** Form validation, shared by the UI and its tests. */
export function validateOrder(type: OrderType, price: string, qty: string): OrderErrors {
  const errors: OrderErrors = {};
  const p = Number(price);
  const q = Number(qty);
  if (type === 'limit' && (!price.trim() || !Number.isFinite(p) || p <= 0)) {
    errors.price = 'Enter a price above 0.';
  }
  if (!qty.trim() || !Number.isFinite(q) || q <= 0) errors.qty = 'Enter an amount above 0.';
  else if (!/^\d*\.?\d{0,8}$/.test(qty.trim())) errors.qty = 'Up to 8 decimals.';
  return errors;
}
