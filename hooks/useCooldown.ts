import { useEffect, useState } from 'react';

/**
 * Seconds left before an action such as resending an email is allowed again.
 * `start` resets the countdown to the full length.
 */
export function useCooldown(
  seconds: number,
  { startActive = false }: { startActive?: boolean } = {},
) {
  const [remaining, setRemaining] = useState(startActive ? seconds : 0);
  const active = remaining > 0;

  useEffect(() => {
    if (!active) return;

    const id = setInterval(
      () => setRemaining(prev => Math.max(prev - 1, 0)),
      1000,
    );

    return () => clearInterval(id);
  }, [active]);

  return { remaining, start: () => setRemaining(seconds) };
}
