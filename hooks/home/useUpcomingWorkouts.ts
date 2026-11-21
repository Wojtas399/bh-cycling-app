import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { useToday } from '@/hooks/useToday';
import { upcomingQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

export function useUpcomingWorkouts() {
  const { availability, credentials } = useIntervalsAvailability();
  const today = useToday();
  const options = upcomingQueryOptions(credentials, today);

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch };
}
