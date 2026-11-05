# Market Stream

A real-time market data dashboard: live order book, trades tape and candlestick chart over WebSockets, plus a paper-trading order form.

**[Live demo](https://edmo1607.github.io/market-stream/)** · React 18 · TypeScript (strict) · Redux Toolkit · TradingView Lightweight Charts · Vitest

Built to explore the hard parts of high-frequency UIs: keeping a streamed order book **correct**, rendering hundreds of updates a second **without jank**, and staying **usable when the connection isn't**.

## What it does

- **Order book** — 12 levels a side with cumulative depth bars, spread, and price grouping. Click a price to load it into the order form.
- **Trades tape** — the latest fills, coloured by aggressor side.
- **Candles** — built client-side from the trade stream, drawn with Lightweight Charts.
- **Ticker** — last price with tick direction, 24 h change, high, low and volume.
- **Paper orders** — limit and market orders that fill against the live stream (no real funds).
- **Live or simulated** — public Kraken WebSocket feed, or an offline simulator. If the live feed is unreachable, the app falls back on its own and says so.

## Engineering decisions

| Problem                                                      | Approach                                                                                                                                            | Where                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Hundreds of messages a second would mean hundreds of renders | Events are buffered and dispatched **once per animation frame** as a single Redux action                                                            | `src/feed/batcher.ts`, `src/feed/useMarketFeed.ts` |
| Order book correctness                                       | Levels in a price-keyed map (O(1) updates); qty 0 deletes; updates before a snapshot or for another market are ignored; trimmed to subscribed depth | `src/features/book/bookSlice.ts`                   |
| Dropped or silent connections                                | Reconnect with **exponential backoff + jitter**, a **watchdog** for half-open sockets, re-subscribe and take a fresh snapshot after every reconnect | `src/feed/krakenFeed.ts`, `src/feed/backoff.ts`    |
| Exchange coupling                                            | Feeds are adapters behind one `Feed` interface and emit normalised events; the parser is pure and unit-tested                                       | `src/feed/types.ts`, `src/feed/krakenParser.ts`    |
| Derived data recomputed on every render                      | **Memoised selectors** (`createSelector`) for sorting, grouping, totals and spread                                                                  | `src/features/book/selectors.ts`                   |
| Rows re-rendering needlessly                                 | `React.memo` rows keyed by price; depth bars are a CSS variable, not extra DOM                                                                      | `src/components/OrderBook.tsx`                     |
| Side effects (order fills)                                   | RTK **listener middleware** — the modern alternative to Redux-Saga                                                                                  | `src/features/orders/fillListener.ts`              |
| Chart performance                                            | Imperative chart created once; only the newest candle is pushed (`series.update`)                                                                   | `src/components/PriceChart.tsx`                    |
| Unbounded memory in a long-lived tab                         | Trades and candles are capped; hidden tabs flush on a timer                                                                                         | `tradesSlice.ts`, `candlesSlice.ts`, `batcher.ts`  |
| Demos and tests depending on the network                     | Deterministic simulator with its own consistent book (never crossed)                                                                                | `src/feed/simulatedFeed.ts`                        |

Accessibility: real buttons and tables with captions, labelled inputs, `aria-invalid` errors, focus styles, colour plus text for buy/sell, reduced-motion support. Responsive from 1440 px down to 390 px.

## Architecture

```
src/
  feed/          Data sources: Kraken adapter, simulator, parser, backoff, frame batcher, lifecycle hook
  app/           Store, typed hooks, cross-slice actions (feedBatch, symbolChanged)
  features/
    book/        Order book reducer + memoised view selectors
    ticker/      Last price and 24 h stats
    trades/      Bounded trades tape
    candles/     OHLC aggregation from trades
    connection/  Status, source, message counters
    orders/      Paper orders, validation, fill listener
  components/    Header, TickerBar, OrderBook, TradesTape, PriceChart, OrderEntry, StatsBar
```

Data flow: `WebSocket → parser → normalised events → batcher (1/frame) → feedBatch action → slices → memoised selectors → memoised components`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit + integration tests
npm run build
```

CI runs lint, format check, type check, tests and build on every push, then deploys `main` to GitHub Pages.

## Next steps

- Verify Kraken's book checksum (CRC32) to detect drift and resubscribe automatically.
- Move parsing and book maintenance into a Web Worker for very high message rates.
- Virtualise the trades tape for deeper history.
- Persist paper orders and add P&L.

---

Market data from Kraken's public WebSocket API. Not financial advice; orders are simulated.
