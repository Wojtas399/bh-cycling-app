import { useCallback } from 'react';

import { useRouter } from 'expo-router';

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
