import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { athleteSettingsQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

export function useAthleteSettings() {
  const { credentials } = useIntervalsAvailability();

  return useQuery(athleteSettingsQueryOptions(credentials));
}
