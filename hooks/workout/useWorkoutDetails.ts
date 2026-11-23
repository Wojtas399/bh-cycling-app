import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import {
  selectWorkoutDetails,
  workoutDetailsQueryOptions,
} from '@/lib/intervalsQueries';

export function useWorkoutDetails(eventId: number) {
  const today = useToday();

  return useIntervalsRead({
    queryOptions: workoutDetailsQueryOptions,
    args: [eventId],
    select: selectWorkoutDetails,
    selectArgs: [eventId, today],
  });
}
