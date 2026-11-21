import { useCallback } from 'react';

import { useRouter } from 'expo-router';

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
