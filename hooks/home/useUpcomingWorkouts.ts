import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { useToday } from '@/hooks/useToday';
import { upcomingQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

/**
 * Home's items for today and tomorrow: Workouts, and today's Unplanned
 * Activities. `today` follows the clock, so a session
 * that runs past midnight fetches the new day. The screen gates on
 * `availability` and branches on the raw `query`; `refetch` refetches this
 * query alone, for pull-to-refresh.
 */
export function useUpcomingWorkouts() {
  const { availability, credentials } = useIntervalsAvailability();
  const today = useToday();
  const options = upcomingQueryOptions(credentials, today);

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch };
}
