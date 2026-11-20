import { EVENT_CATEGORY, type IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';
import { type LocalDateString, daysBetween } from './localDate';
import type { LocalTimeString } from './localDateTime';

export type RacePriority = 'A' | 'B' | 'C';

export interface Race {
  id: number;
  name: string;
  priority: RacePriority;
  date: LocalDateString;
  startTime?: LocalTimeString;
  sport: string;
  durationSeconds?: number;
  distanceMeters?: number;
  description?: string;
}

const CATCH_ALL_SPORT = 'Other';

const ALL_DAY_START_TIME = '00:00';

const PRIORITY_BY_CATEGORY: Record<string, RacePriority> = {
  [EVENT_CATEGORY.raceA]: 'A',
  [EVENT_CATEGORY.raceB]: 'B',
  [EVENT_CATEGORY.raceC]: 'C',
};

export function toRace(event: IntervalsCalendarEvent): Race | undefined {
  const priority = PRIORITY_BY_CATEGORY[event.category];

  if (priority === undefined) return undefined;

  const [date, time = ''] = event.start_date_local.split('T');
  const startTime = time.slice(0, 5);
  const isAllDay = startTime === '' || startTime === ALL_DAY_START_TIME;
  const description = event.description?.trim() ? event.description : null;

  return {
    id: event.id,
    name: event.name,
    priority,
    date,
    ...(!isAllDay && { startTime }),
    sport: event.type || CATCH_ALL_SPORT,
    ...(isPositive(event.moving_time) && {
      durationSeconds: event.moving_time,
    }),
    ...(isPositive(event.distance) && { distanceMeters: event.distance }),
    ...(description && { description }),
  };
}

export function toRaces(events: IntervalsCalendarEvent[]): Race[] {
  return events.flatMap(event => toRace(event) ?? []);
}

export function compareRaces(a: Race, b: Race): number {
  return (
    a.priority.localeCompare(b.priority) ||
    (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
    a.name.localeCompare(b.name, 'pl')
  );
}

export const NEXT_RACE_WINDOW_DAYS = 30;

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

export function compareRacesByDate(a: Race, b: Race): number {
  return a.date.localeCompare(b.date) || compareRaces(a, b);
}

function isPositive(value: number | undefined): value is number {
  return isFiniteNumber(value) && value > 0;
}
