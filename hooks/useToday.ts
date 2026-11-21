import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { type LocalDateString, toLocalDateString } from '@/lib/localDate';

function readToday(): LocalDateString {
  return toLocalDateString(new Date());
}

function msUntilNextMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  return nextMidnight.getTime() - now.getTime();
}

function subscribeToToday(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const armMidnightTimer = () => {
    timer = setTimeout(() => {
      onChange();
      armMidnightTimer();
    }, msUntilNextMidnight());
  };

  armMidnightTimer();

  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') {
      onChange();
    }
  });

  return () => {
    clearTimeout(timer);
    subscription.remove();
  };
}

export function useToday(): LocalDateString {
  return useSyncExternalStore(subscribeToToday, readToday);
}
