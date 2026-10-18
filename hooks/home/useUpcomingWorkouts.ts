import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useToday } from '@/hooks/useToday';
import { upcomingQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

/**
 * Home's items for today and tomorrow: Workouts, and today's Unplanned
 * Activities. `today` follows the clock, so a session
 * that runs past midnight fetches the new day. The screen gates on
 * `availability` and branches on the raw `query`.
 */
export function useUpcomingWorkouts() {
  const { availability, credentials } = useIntervalsAvailability();
  const today = useToday();

  const query = useQuery(upcomingQueryOptions(credentials, today));

  return { availability, query };
}
