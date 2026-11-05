import { createAction } from '@reduxjs/toolkit';
import type { ConnectionStatus, FeedEvent } from '@/feed/types';

/**
 * Everything the feed delivered since the last animation frame, in ONE action.
 * Hundreds of messages a second become at most ~60 renders a second.
 */
export const feedBatch = createAction<FeedEvent[]>('feed/batch');

export const statusChanged = createAction<{ status: ConnectionStatus; detail?: string }>(
  'feed/status',
);

/** Switching market clears everything that belonged to the previous one. */
export const symbolChanged = createAction<string>('market/symbolChanged');
