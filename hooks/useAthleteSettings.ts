import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { athleteSettingsQueryOptions } from '@/lib/intervalsQueries';

export function useAthleteSettings() {
  return useIntervalsRead({
    queryOptions: athleteSettingsQueryOptions,
    args: [],
  }).query;
}
