import type { RaceItem } from './calendarItems';
import { formatMetric } from './formatWorkoutMetric';
import { formatLocalTime } from './localDateTime';
import { type NoteDateLabels, formatLongDate } from './noteDates';
import type { Race } from './races';

export interface RaceTileLabelParts {
  priority: string;
  sport: string;
  completed: string;
}

export function raceTileLabel(
  { race, activity }: RaceItem,
  { priority, sport, completed }: RaceTileLabelParts,
): string {
  const details = activity
    ? [sport, completed, ...formattedDurationAndDistance(activity)]
    : [sport, ...formattedStartTime(race)];

  return `${priority}: ${race.name}, ${details.join(', ')}`;
}

export function raceTileMeta(race: Race, sport: string): string {
  return mutedLineOrSport(
    [...formattedStartTime(race), ...formattedDurationAndDistance(race)],
    sport,
  );
}

export function raceItemMeta(
  { race, activity }: RaceItem,
  sport: string,
): string {
  if (!activity) return raceTileMeta(race, sport);

  return mutedLineOrSport(formattedDurationAndDistance(activity), sport);
}

export function formatRaceDate(race: Race, labels: NoteDateLabels): string {
  return [formatLongDate(race.date, labels), ...formattedStartTime(race)].join(
    ' · ',
  );
}

function mutedLineOrSport(parts: string[], sport: string): string {
  return parts.length > 0 ? parts.join(' · ') : sport;
}

function formattedDurationAndDistance({
  durationSeconds,
  distanceMeters,
}: Pick<Race, 'durationSeconds' | 'distanceMeters'>): string[] {
  return [
    ...(durationSeconds === undefined
      ? []
      : [formatMetric('duration', durationSeconds)]),
    ...(distanceMeters === undefined
      ? []
      : [formatMetric('distance', distanceMeters)]),
  ];
}

function formattedStartTime({ date, startTime }: Race): string[] {
  return startTime === undefined
    ? []
    : [formatLocalTime(`${date}T${startTime}`)];
}
