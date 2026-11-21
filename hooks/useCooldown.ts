import { useCallback, useState, useSyncExternalStore } from 'react';

import { subscribeToNothing } from '@/lib/externalStore';
import { getClockNow, subscribeToClock } from '@/lib/secondClock';

const MS_PER_SECOND = 1000;

function wholeSecondsLeftWithinFullLength(
  endsAtEpochMs: number,
  nowEpochMs: number,
  fullLengthSeconds: number,
): number {
  return Math.min(
    fullLengthSeconds,
    Math.max(0, Math.ceil((endsAtEpochMs - nowEpochMs) / MS_PER_SECOND)),
  );
}

export function useCooldown(
  seconds: number,
  { startActive = false }: { startActive?: boolean } = {},
) {
  const [endsAtEpochMs, setEndsAtEpochMs] = useState<number | null>(() =>
    startActive ? Date.now() + seconds * MS_PER_SECOND : null,
  );

  const subscribeToClockUntilEnd = useCallback(
    (onTick: () => void) => {
      if (endsAtEpochMs === null) return subscribeToNothing();

      const unsubscribe = subscribeToClock(() => {
        onTick();

        if (getClockNow() >= endsAtEpochMs) {
          unsubscribe();
        }
      });

      return unsubscribe;
    },
    [endsAtEpochMs],
  );
  const nowEpochMs = useSyncExternalStore(
    subscribeToClockUntilEnd,
    getClockNow,
  );

  return {
    remaining:
      endsAtEpochMs === null
        ? 0
        : wholeSecondsLeftWithinFullLength(endsAtEpochMs, nowEpochMs, seconds),
    start: () => setEndsAtEpochMs(Date.now() + seconds * MS_PER_SECOND),
  };
}
