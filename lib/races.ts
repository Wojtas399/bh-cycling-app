import { EVENT_CATEGORY, type IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import { type LocalDateString, daysBetween } from './localDate';

/** How much a Race matters to the season, per the glossary in CONTEXT.md. */
export type RacePriority = 'A' | 'B' | 'C';

/**
 * A Race from the athlete's Intervals.icu calendar, per the `Race` glossary
 * term in CONTEXT.md. A Race is always one day. Each optional field is left
 * out when Intervals.icu has no value for it. Its colour and load are never
 * read: Races use a fixed red, and the load is always `null`.
 */
export interface Race {
  id: number;
  name: string;
  priority: RacePriority;
  date: LocalDateString;
  /** Local `HH:mm`; left out for an all-day Race. */
  startTime?: string;
  /** intervals.icu's sport type, e.g. `Ride`, `Run`. */
  sport: string;
  /** Planned duration, s. */
  durationSeconds?: number;
  /** Planned distance, m. */
  distanceMeters?: number;
  /** Markdown, as on a Note; left out when empty or whitespace-only. */
  description?: string;
}

const PRIORITY_BY_CATEGORY: Record<string, RacePriority> = {
  [EVENT_CATEGORY.raceA]: 'A',
  [EVENT_CATEGORY.raceB]: 'B',
  [EVENT_CATEGORY.raceC]: 'C',
};

/**
 * The event as a Race, its priority read from the category alone; nothing
 * when it isn't one. An all-day Race starts at midnight, so a midnight start
 * is no start time.
 */
export function toRace(event: IntervalsCalendarEvent): Race | undefined {
  const priority = PRIORITY_BY_CATEGORY[event.category];

  if (priority === undefined) return undefined;

  const [date, time = ''] = event.start_date_local.split('T');
  const startTime = time.slice(0, 5);
  const description = event.description?.trim() ? event.description : null;

  return {
    id: event.id,
    name: event.name,
    priority,
    date,
    ...(startTime && startTime !== '00:00' && { startTime }),
    // intervals.icu always sets it; `Other` is its own catch-all sport.
    sport: event.type || 'Other',
    ...(isPositive(event.moving_time) && {
      durationSeconds: event.moving_time,
    }),
    ...(isPositive(event.distance) && { distanceMeters: event.distance }),
    ...(description && { description }),
  };
}

/** The Race events among `events`, as Races, in the order given. */
export function toRaces(events: IntervalsCalendarEvent[]): Race[] {
  return events.flatMap(event => toRace(event) ?? []);
}

/**
 * The Race order every surface lists a day's Races in: A, then B, then C;
 * then the earliest start time, an all-day Race counting as midnight; then
 * the name.
 */
export function compareRaces(a: Race, b: Race): number {
  return (
    a.priority.localeCompare(b.priority) ||
    (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
    a.name.localeCompare(b.name, 'pl')
  );
}

/** How many days past today the next-race card looks for a Race. */
export const NEXT_RACE_WINDOW_DAYS = 30;

/**
 * The Race the next-race card counts down to: the one on the nearest day from
 * `today` to `NEXT_RACE_WINDOW_DAYS` days ahead, whatever its priority, ties
 * on that day broken by the Race order (see `compareRaces`). Nothing when no
 * Race falls in that window.
 */
export function nextRace(
  races: Race[],
  today: LocalDateString,
): Race | undefined {
  return races
    .filter(race => {
      const days = daysBetween(today, race.date);

      return days >= 0 && days <= NEXT_RACE_WINDOW_DAYS;
    })
    .reduce<Race | undefined>(
      (next, race) =>
        next === undefined || compareRacesByDate(race, next) < 0 ? race : next,
      undefined,
    );
}

/**
 * How far off a Race is, in whole local calendar days, so it changes at
 * midnight rather than at the start time: `today`, `tomorrow`, else the number
 * of days.
 */
export type RaceCountdown = 'today' | 'tomorrow' | number;

export function raceCountdown(
  race: Race,
  today: LocalDateString,
): RaceCountdown {
  const days = daysBetween(today, race.date);

  if (days === 0) return 'today';

  if (days === 1) return 'tomorrow';

  return days;
}

/** Races by date, a day's Races in the Race order. */
export function compareRacesByDate(a: Race, b: Race): number {
  return a.date.localeCompare(b.date) || compareRaces(a, b);
}

function isPositive(value: number | undefined): value is number {
  return isFiniteNumber(value) && value > 0;
}
