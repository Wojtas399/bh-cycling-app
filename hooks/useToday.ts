import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { type LocalDateString, toLocalDateString } from '@/lib/localDate';

/**
 * Local `YYYY-MM-DD` of today, kept current across midnight — both while the
 * app is open (a timer to the next midnight) and after it was suspended
 * through one (re-read when it returns to the foreground).
 */
export function useToday(): LocalDateString {
  const [today, setToday] = useState(() => toLocalDateString(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toLocalDateString(new Date()));
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const timer = setTimeout(refresh, nextMidnight.getTime() - now.getTime());
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [today]);

  return today;
}
