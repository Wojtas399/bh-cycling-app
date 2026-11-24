import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { noteDetailsQueryOptions } from '@/lib/intervalsQueries';

export function useNoteDetails(eventId: number) {
  return useIntervalsRead({
    queryOptions: noteDetailsQueryOptions,
    args: [eventId],
  });
}
