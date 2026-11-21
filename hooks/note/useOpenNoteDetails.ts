import { useCallback } from 'react';

import { useRouter } from 'expo-router';

export function useOpenNoteDetails(): (eventId: number) => void {
  const router = useRouter();

  return useCallback(
    (eventId: number) =>
      router.push({
        pathname: '/note/[id]',
        params: { id: String(eventId) },
      }),
    [router],
  );
}
