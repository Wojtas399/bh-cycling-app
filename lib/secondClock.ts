import { createListeners } from '@/lib/externalStore';

const TICK_MS = 1000;

let now = Date.now();

const listeners = createListeners(() => {
  now = Date.now();

  const ticker = setInterval(() => {
    now = Date.now();
    listeners.notify();
  }, TICK_MS);

  return () => clearInterval(ticker);
});

/** The time of the clock's latest tick, or of its start, in epoch ms. */
export function getClockNow(): number {
  return now;
}

/**
 * One clock shared by every countdown. It ticks once a second while anything
 * listens and stops when the last listener leaves.
 */
export const subscribeToClock = listeners.subscribe;
