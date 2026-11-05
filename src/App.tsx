import { useState } from 'react';
import { Header } from '@/components/Header';
import { OrderBook } from '@/components/OrderBook';
import { OrderEntry } from '@/components/OrderEntry';
import { PriceChart } from '@/components/PriceChart';
import { StatsBar } from '@/components/StatsBar';
import { TickerBar } from '@/components/TickerBar';
import { TradesTape } from '@/components/TradesTape';
import { useMarketFeed } from '@/feed/useMarketFeed';
import type { FeedFactory } from '@/feed/types';

export function App({ feeds }: { feeds?: { live: FeedFactory; simulated: FeedFactory } }) {
  useMarketFeed(feeds);
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="app">
      <Header />
      <main className="layout">
        <TickerBar />
        <PriceChart />
        <OrderBook onPick={setPicked} />
        <div className="side">
          <OrderEntry pickedPrice={picked} />
          <TradesTape />
        </div>
      </main>
      <StatsBar />
    </div>
  );
}
