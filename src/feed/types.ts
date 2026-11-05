/** Normalised market data. Every feed (live or simulated) produces these events. */

export type Side = 'buy' | 'sell';

/** [price, quantity]. A quantity of 0 removes the price level. */
export type Level = readonly [price: number, qty: number];

export interface BookEvent {
  type: 'book';
  kind: 'snapshot' | 'update';
  symbol: string;
  bids: Level[];
  asks: Level[];
}

export interface TickerEvent {
  type: 'ticker';
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePct: number;
}

export interface Trade {
  id: string;
  side: Side;
  price: number;
  qty: number;
  /** Epoch milliseconds. */
  time: number;
}

export interface TradesEvent {
  type: 'trades';
  symbol: string;
  trades: Trade[];
}

export type FeedEvent = BookEvent | TickerEvent | TradesEvent;

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface FeedHandlers {
  onEvents: (events: FeedEvent[]) => void;
  onStatus: (status: ConnectionStatus, detail?: string) => void;
}

/** A market data source. Swappable: live exchange, simulator, or a test double. */
export interface Feed {
  subscribe(symbol: string): void;
  close(): void;
}

export type FeedFactory = (handlers: FeedHandlers) => Feed;

export const SYMBOLS = ['BTC/USD', 'SOL/USD', 'LTC/USD'] as const;
export type MarketSymbol = (typeof SYMBOLS)[number];
export const BOOK_DEPTH = 25;
