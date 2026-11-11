import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { athleteSettingsQueryOptions } from '@/lib/intervalsQueries';
import { useQuery } from '@tanstack/react-query';

/**
 * The athlete's Ride settings: their power zones and current Ride FTP (see
 * `athleteSettingsQueryOptions`). Home, the Calendar and Workout Details
 * fetch them already, so they're almost always cached.
 */
export function useAthleteSettings() {
  const { credentials } = useIntervalsAvailability();

  return useQuery(athleteSettingsQueryOptions(credentials));
}
