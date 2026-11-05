import type { FeedEvent } from './types';

/**
 * Collects feed events and hands them over once per animation frame. The browser paints
 * at most ~60 times a second, so updating the store more often than that is wasted work.
 * Hidden tabs get no frames, so a timer keeps the buffer from growing without bound.
 */
export function createBatcher(
  flush: (events: FeedEvent[]) => void,
  schedule: (cb: () => void) => void = (cb) => {
    if (typeof document !== 'undefined' && document.hidden) setTimeout(cb, 250);
    else requestAnimationFrame(cb);
  },
) {
  let buffer: FeedEvent[] = [];
  let scheduled = false;
  let stopped = false;

  const run = () => {
    scheduled = false;
    if (stopped || !buffer.length) return;
    const events = buffer;
    buffer = [];
    flush(events);
  };

  return {
    push(events: FeedEvent[]) {
      if (stopped) return;
      buffer.push(...events);
      if (!scheduled) {
        scheduled = true;
        schedule(run);
      }
    },
    stop() {
      stopped = true;
      buffer = [];
    },
  };
}
