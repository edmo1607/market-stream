import { backoffDelay } from './backoff';
import { krakenSubscribe, parseKrakenMessage } from './krakenParser';
import { BOOK_DEPTH, type Feed, type FeedHandlers } from './types';

const URL = 'wss://ws.kraken.com/v2';
/** Kraken sends a heartbeat every second; silence this long means the socket is dead. */
const STALE_AFTER_MS = 10_000;

/**
 * Live feed from Kraken's public WebSocket. Reconnects with backoff, detects silent
 * (half-open) sockets with a watchdog, and re-subscribes after every reconnect. A fresh
 * book snapshot then replaces local state, so a gap can never leave the book wrong.
 */
export function createKrakenFeed({ onEvents, onStatus }: FeedHandlers, url = URL): Feed {
  let ws: WebSocket | null = null;
  let symbol: string | null = null;
  let attempt = 0;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let lastMessage = 0;

  const send = (messages: object[]) => {
    if (ws?.readyState === WebSocket.OPEN) messages.forEach((m) => ws!.send(JSON.stringify(m)));
  };

  function connect() {
    onStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
      attempt = 0;
      lastMessage = Date.now();
      onStatus('open');
      if (symbol) send(krakenSubscribe(symbol, BOOK_DEPTH));
    };

    ws.onmessage = (event) => {
      lastMessage = Date.now();
      const events = parseKrakenMessage(String(event.data));
      if (events.length) onEvents(events);
    };

    ws.onclose = () => {
      ws = null;
      if (closed) return;
      const delay = backoffDelay(attempt++);
      onStatus('reconnecting', `retrying in ${(delay / 1000).toFixed(1)} s`);
      retryTimer = setTimeout(connect, delay);
    };

    ws.onerror = () => ws?.close();
  }

  const watchdog = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN && Date.now() - lastMessage > STALE_AFTER_MS) ws.close();
  }, 2_000);

  connect();

  return {
    subscribe(next) {
      if (symbol === next) return;
      if (symbol) send(krakenSubscribe(symbol, BOOK_DEPTH, 'unsubscribe'));
      symbol = next;
      send(krakenSubscribe(next, BOOK_DEPTH));
    },
    close() {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(watchdog);
      ws?.close();
      onStatus('closed');
    },
  };
}
