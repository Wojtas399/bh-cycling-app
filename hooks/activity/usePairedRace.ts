import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { raceQueryOptions } from '@/lib/intervalsQueries';

export function usePairedRace(eventId: number | null) {
  const { query, refetch } = useIntervalsRead({
    queryOptions: raceQueryOptions,
    args: [eventId],
  });

  return { race: query.data ?? undefined, refetch };
}
