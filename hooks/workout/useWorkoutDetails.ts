import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { useStableSelect } from '@/hooks/useStableSelect';
import { useToday } from '@/hooks/useToday';
import {
  selectWorkoutDetailsAsOf,
  workoutDetailsQueryOptions,
} from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

export function useWorkoutDetails(eventId: number) {
  const { availability, credentials } = useIntervalsAvailability();
  const today = useToday();
  const select = useStableSelect(selectWorkoutDetailsAsOf, today);
  const options = workoutDetailsQueryOptions(credentials, eventId, select);

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch };
}
