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

export function getClockNow(): number {
  return now;
}

export const subscribeToClock = listeners.subscribe;
