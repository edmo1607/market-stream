/**
 * Kraken WebSocket v2 messages → normalised FeedEvents. Pure, so it is unit-tested
 * against real message shapes without a network.
 * Docs: https://docs.kraken.com/api/docs/websocket-v2/book
 */
import type { FeedEvent, Level, Trade } from './types';

interface RawLevel {
  price: number;
  qty: number;
}

const toLevels = (levels: RawLevel[] | undefined): Level[] =>
  (levels ?? []).map((l) => [Number(l.price), Number(l.qty)] as const);

export function parseKrakenMessage(raw: string): FeedEvent[] {
  let msg: { channel?: string; type?: string; data?: unknown[] };
  try {
    msg = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(msg.data)) return [];

  switch (msg.channel) {
    case 'book':
      return (msg.data as { symbol: string; bids?: RawLevel[]; asks?: RawLevel[] }[]).map((d) => ({
        type: 'book',
        kind: msg.type === 'snapshot' ? 'snapshot' : 'update',
        symbol: d.symbol,
        bids: toLevels(d.bids),
        asks: toLevels(d.asks),
      }));

    case 'ticker':
      return (
        msg.data as {
          symbol: string;
          last: number;
          bid: number;
          ask: number;
          high: number;
          low: number;
          volume: number;
          change: number;
          change_pct: number;
        }[]
      ).map((d) => ({
        type: 'ticker',
        symbol: d.symbol,
        last: d.last,
        bid: d.bid,
        ask: d.ask,
        high: d.high,
        low: d.low,
        volume: d.volume,
        change: d.change,
        changePct: d.change_pct,
      }));

    case 'trade': {
      const rows = msg.data as {
        symbol: string;
        side: 'buy' | 'sell';
        price: number;
        qty: number;
        trade_id: number;
        timestamp: string;
      }[];
      if (!rows.length) return [];
      const trades: Trade[] = rows.map((t) => ({
        id: String(t.trade_id),
        side: t.side,
        price: t.price,
        qty: t.qty,
        time: Date.parse(t.timestamp),
      }));
      return [{ type: 'trades', symbol: rows[0]!.symbol, trades }];
    }

    default:
      return []; // heartbeat, status, subscribe acks
  }
}

export const krakenSubscribe = (
  symbol: string,
  depth: number,
  method: 'subscribe' | 'unsubscribe' = 'subscribe',
) => [
  { method, params: { channel: 'book', symbol: [symbol], depth } },
  { method, params: { channel: 'ticker', symbol: [symbol] } },
  { method, params: { channel: 'trade', symbol: [symbol], snapshot: true } },
];
