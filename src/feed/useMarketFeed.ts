import { useEffect, useRef } from 'react';
import { feedBatch, statusChanged } from '@/app/actions';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { sourceChanged } from '@/features/connection/connectionSlice';
import { createBatcher } from './batcher';
import { createKrakenFeed } from './krakenFeed';
import { createSimulatedFeed } from './simulatedFeed';
import type { Feed, FeedFactory } from './types';

const FAILED_ATTEMPTS_BEFORE_FALLBACK = 3;

/**
 * Owns the feed's lifecycle: one connection per source, resubscribe on symbol change,
 * batch events per frame, and fall back to simulated data if the live feed keeps failing.
 */
const DEFAULT_FEEDS = { live: createKrakenFeed, simulated: createSimulatedFeed };

export function useMarketFeed(
  // Must be stable between renders, or the connection is torn down every render.
  factories: { live: FeedFactory; simulated: FeedFactory } = DEFAULT_FEEDS,
) {
  const dispatch = useAppDispatch();
  const source = useAppSelector((s) => s.connection.source);
  const symbol = useAppSelector((s) => s.connection.symbol);
  const feedRef = useRef<Feed | null>(null);
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  useEffect(() => {
    const batcher = createBatcher((events) => dispatch(feedBatch(events)));
    let failures = 0;
    const feed = factories[source]({
      onEvents: (events) => batcher.push(events),
      onStatus: (status, detail) => {
        dispatch(statusChanged({ status, detail }));
        if (status === 'open') failures = 0;
        if (
          status === 'reconnecting' &&
          source === 'live' &&
          ++failures >= FAILED_ATTEMPTS_BEFORE_FALLBACK
        ) {
          dispatch(
            sourceChanged({
              source: 'simulated',
              notice:
                'The live exchange feed is unreachable from this network, so simulated data is shown.',
            }),
          );
        }
      },
    });
    feedRef.current = feed;
    feed.subscribe(symbolRef.current);
    return () => {
      batcher.stop();
      feed.close();
      feedRef.current = null;
    };
  }, [source, dispatch, factories]);

  useEffect(() => {
    feedRef.current?.subscribe(symbol);
  }, [symbol]);
}
