import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { buildActivityDetails } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';

export function useActivityDetails(activityId: string) {
  return useIntervalsRead({
    queryOptions: activityDetailsQueryOptions,
    args: [activityId],
    select: buildActivityDetails,
    selectArgs: [],
  });
}
