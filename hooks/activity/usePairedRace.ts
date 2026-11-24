import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { raceQueryOptions } from '@/lib/intervalsQueries';

export function usePairedRace(eventId: number | null) {
  const { query } = useIntervalsRead({
    queryOptions: raceQueryOptions,
    args: [eventId],
  });

  return { race: query.data ?? undefined };
}
