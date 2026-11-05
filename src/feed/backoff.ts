/**
 * Exponential backoff with full jitter: 0.5 s, 1 s, 2 s … capped at 30 s, randomised so
 * thousands of clients don't reconnect in lockstep after an outage.
 */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(30_000, 500 * 2 ** attempt);
  return Math.round(ceiling / 2 + (random() * ceiling) / 2);
}
