import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { useStableSelect } from '@/hooks/useStableSelect';
import { useToday } from '@/hooks/useToday';
import {
  selectUpcomingAsOf,
  upcomingQueryOptions,
} from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

export function useUpcomingWorkouts() {
  const { availability, credentials } = useIntervalsAvailability();
  const today = useToday();
  const select = useStableSelect(selectUpcomingAsOf, today);
  const options = upcomingQueryOptions(credentials, today, select);

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch };
}
