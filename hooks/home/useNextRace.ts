import { useIntervalsAvailability } from '@/hooks/useIntervalsAvailability';
import { useRefetchQuery } from '@/hooks/useRefetchQuery';
import { useToday } from '@/hooks/useToday';
import { nextRaceQueryOptions } from '@/lib/intervalsQueries';
import {
  type Race,
  type RaceCountdown,
  nextRace,
  raceCountdown,
} from '@/lib/races';
import { useQuery } from '@tanstack/react-query';

export interface NextRace {
  race: Race;
  countdown: RaceCountdown;
}

export function useNextRace() {
  const { credentials } = useIntervalsAvailability();
  const today = useToday();
  const options = nextRaceQueryOptions(credentials, today);

  const { data } = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);
  const race = data && nextRace(data, today);
  const next: NextRace | undefined = race && {
    race,
    countdown: raceCountdown(race, today),
  };

  return { next, refetch };
}
