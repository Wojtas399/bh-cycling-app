import { useCallback } from 'react';

import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { intervalsKeys, noteDetailsQueryOptions } from '@/lib/intervalsQueries';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * One Note by its intervals.icu event id, for Note Details. The screen gates
 * on `availability` and branches on the raw `query`; `refetch` refetches this
 * query alone, for pull-to-refresh.
 */
export function useNoteDetails(eventId: number) {
  const { availability, credentials } = useIntervalsAvailability();
  const queryClient = useQueryClient();
  const query = useQuery(noteDetailsQueryOptions(credentials, eventId));
  const athleteId = credentials?.athleteId;

  // Goes through the client rather than `query.refetch`: reading a property
  // off the tracked query result here would narrow which changes re-render.
  const refetch = useCallback(
    () =>
      queryClient.refetchQueries({
        queryKey: intervalsKeys.note(athleteId, eventId),
        exact: true,
      }),
    [athleteId, eventId, queryClient],
  );

  return { availability, query, refetch };
}
