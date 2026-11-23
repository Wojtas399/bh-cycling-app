import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import { upcomingQueryOptions } from '@/lib/intervalsQueries';
import { getUpcomingItems } from '@/lib/upcomingWorkouts';

export function useUpcomingWorkouts() {
  const today = useToday();

  return useIntervalsRead({
    queryOptions: upcomingQueryOptions,
    args: [today],
    select: getUpcomingItems,
    selectArgs: [today],
  });
}
