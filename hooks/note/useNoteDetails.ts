import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { noteDetailsQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

/**
 * One Note by its intervals.icu event id, for Note Details. The screen gates
 * on `availability` and branches on the raw `query`; `refetch` refetches this
 * query alone, for pull-to-refresh.
 */
export function useNoteDetails(eventId: number) {
  const { availability, credentials } = useIntervalsAvailability();
  const options = noteDetailsQueryOptions(credentials, eventId);
  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch };
}
