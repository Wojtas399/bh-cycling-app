import { useIntervalsRead } from '@/hooks/useIntervalsRead';
import { useToday } from '@/hooks/useToday';
import { nextRaceQueryOptions } from '@/lib/intervalsQueries';
import {
  type Race,
  type RaceCountdown,
  nextRace,
  raceCountdown,
} from '@/lib/races';

export interface NextRace {
  race: Race;
  countdown: RaceCountdown;
}

export function useNextRace() {
  const today = useToday();
  const { query } = useIntervalsRead({
    queryOptions: nextRaceQueryOptions,
    args: [today],
  });
  const race = query.data && nextRace(query.data, today);
  const next: NextRace | undefined = race && {
    race,
    countdown: raceCountdown(race, today),
  };

  return { next };
}
