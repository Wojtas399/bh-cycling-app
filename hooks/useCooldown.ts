import { useCallback, useState, useSyncExternalStore } from 'react';

import { getClockNow, subscribeToClock } from '@/lib/secondClock';

const MS_PER_SECOND = 1000;

function subscribeToNothing() {
  return () => {};
}

/**
 * Seconds left before an action such as resending an email is allowed again.
 * `start` resets the countdown to the full length.
 *
 * Every cooldown reads one shared clock. A cooldown started between two of
 * its ticks first changes on the clock's next tick, so it can run up to
 * about a second longer than its full length.
 */
export function useCooldown(
  seconds: number,
  { startActive = false }: { startActive?: boolean } = {},
) {
  // When the cooldown ends, in epoch ms, or null before it is first started.
  const [endsAt, setEndsAt] = useState<number | null>(() =>
    startActive ? Date.now() + seconds * MS_PER_SECOND : null,
  );

  // Listens to the clock until the tick that reaches `endsAt`, so the clock
  // stops once no cooldown is counting down.
  const subscribeUntilEnd = useCallback(
    (onTick: () => void) => {
      if (endsAt === null) return subscribeToNothing();

      const unsubscribe = subscribeToClock(() => {
        onTick();

        if (getClockNow() >= endsAt) {
          unsubscribe();
        }
      });

      return unsubscribe;
    },
    [endsAt],
  );
  const now = useSyncExternalStore(subscribeUntilEnd, getClockNow);

  // The clock's last tick can be up to a second before `start`, so cap at
  // the full length.
  const remaining =
    endsAt === null
      ? 0
      : Math.min(
          seconds,
          Math.max(0, Math.ceil((endsAt - now) / MS_PER_SECOND)),
        );

  return {
    remaining,
    start: () => setEndsAt(Date.now() + seconds * MS_PER_SECOND),
  };
}
