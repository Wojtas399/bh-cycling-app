import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useToday } from '@/hooks/useToday';
import { upcomingQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

/**
 * Today's and tomorrow's workouts. `today` follows the clock, so a session
 * that runs past midnight fetches the new day. The screen gates on
 * `availability` and branches on the raw `query`.
 */
export function useUpcomingWorkouts() {
  const { availability, credentials } = useIntervalsAvailability();
  const today = useToday();

  const query = useQuery(upcomingQueryOptions(credentials, today));

  return { availability, query };
}
