type Listener = () => void;

const TICK_MS = 1000;

let now = Date.now();
const listeners = new Set<Listener>();
let ticker: ReturnType<typeof setInterval> | undefined;

function tick() {
  now = Date.now();
  listeners.forEach(listener => listener());
}

/** The time of the clock's latest tick, or of its start, in epoch ms. */
export function getClockNow(): number {
  return now;
}

/**
 * One clock shared by every countdown. It ticks once a second while anything
 * listens and stops when the last listener leaves.
 */
export function subscribeToClock(listener: Listener): () => void {
  listeners.add(listener);

  if (ticker === undefined) {
    now = Date.now();
    ticker = setInterval(tick, TICK_MS);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && ticker !== undefined) {
      clearInterval(ticker);
      ticker = undefined;
    }
  };
}
