import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { buildActivityDetails } from '@/lib/activityDetails';
import { activityDetailsQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

export function useActivityDetails(activityId: string) {
  const { availability, credentials } = useIntervalsAvailability();
  const options = activityDetailsQueryOptions(
    credentials,
    activityId,
    buildActivityDetails,
  );

  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch };
}
