import { useCallback } from 'react';

import { useRouter } from 'expo-router';

/** Pushes the Workout Details screen for an intervals.icu event id. */
export function useOpenWorkoutDetails(): (eventId: number) => void {
  const router = useRouter();

  return useCallback(
    (eventId: number) =>
      router.push({
        pathname: '/workout/[id]',
        params: { id: String(eventId) },
      }),
    [router],
  );
}
