import { useCallback } from 'react';

import { useRouter } from 'expo-router';

/** Pushes the Activity Details screen for an intervals.icu Activity id. */
export function useOpenActivityDetails(): (activityId: string) => void {
  const router = useRouter();

  return useCallback(
    (activityId: string) =>
      router.push({
        pathname: '/activity/[id]',
        params: { id: activityId },
      }),
    [router],
  );
}
