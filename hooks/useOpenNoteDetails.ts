import { useCallback } from 'react';

import { useRouter } from 'expo-router';

/** Pushes the Note Details screen for an intervals.icu event id. */
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
