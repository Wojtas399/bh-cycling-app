import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { activityStreamQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

/**
 * An Activity's power stream by its intervals.icu id (see
 * `profileStreamIdOf`), for the profile card's Recorded strip. Skipped for a
 * `null` id. `data` is `null` when the Activity has no stream. The card holds
 * the ride back while `isLoading`, the first fetch, so it never redraws from
 * its intervals to its stream; a failed stream leaves it on its intervals.
 */
export function useActivityStream(activityId: string | null) {
  const { credentials } = useIntervalsAvailability();

  return useQuery(activityStreamQueryOptions(credentials, activityId));
}
