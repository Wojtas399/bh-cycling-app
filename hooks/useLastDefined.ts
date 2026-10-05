import { useState } from 'react';

/**
 * `value` while it is defined, then the last defined value once it goes
 * `null`/`undefined` — for content that must stay drawn while it animates out.
 */
export function useLastDefined<T>(value: T | null | undefined): T | null {
  const [last, setLast] = useState<T | null>(null);

  if (value != null && value !== last) {
    setLast(value);
  }

  return value ?? last;
}
