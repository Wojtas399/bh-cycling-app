import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { raceQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

/**
 * The Race an Activity is paired to, by its paired event id (see
 * `pairedEventIdOf`), for the Race header on Activity Details. Skipped for a
 * `null` id. `race` is undefined while it loads, when it fails and when the
 * event isn't a Race (a Workout, say): the header has no placeholder and no
 * error state. `refetch` refetches this query alone, for pull-to-refresh.
 */
export function usePairedRace(eventId: number | null) {
  const { credentials } = useIntervalsAvailability();
  const options = raceQueryOptions(credentials, eventId);

  const { data } = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { race: data ?? undefined, refetch };
}
