import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { raceQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

export function usePairedRace(eventId: number | null) {
  const { credentials } = useIntervalsAvailability();
  const options = raceQueryOptions(credentials, eventId);

  const { data } = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { race: data ?? undefined, refetch };
}
