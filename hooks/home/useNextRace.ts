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

/** What the next-race card shows. */
export interface NextRace {
  race: Race;
  countdown: RaceCountdown;
}

/**
 * The Race the next-race card counts down to (see `nextRace`), and how far
 * off it is. `today` follows the clock, so the card rolls over at midnight.
 * `next` is undefined while loading, on error and with no Race in the window:
 * the card has no placeholder and no error state. `refetch` refetches this
 * query alone, for pull-to-refresh.
 */
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
