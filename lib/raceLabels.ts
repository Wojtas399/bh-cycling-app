import type { RaceItem } from './calendarItems';
import { formatMetric } from './formatWorkoutMetric';
import { formatLocalTime } from './localDateTime';
import { type NoteDateLabels, formatLongDate } from './noteDates';
import type { Race } from './races';

/** The words a Race tile's screen-reader label is built from. */
export interface RaceTileLabelParts {
  /** The Race Priority as spoken, e.g. "Wyścig A". */
  priority: string;
  /** The sport's label, e.g. "Bieg". */
  sport: string;
  /** How a paired Race is marked done, e.g. "ukończony". */
  completed: string;
}

/**
 * A Race tile's screen-reader label. An unpaired Race reads "Wyścig A:
 * {name}, {sport}, {when}", where `{when}` is the start time, left out for an
 * all-day Race. A paired Race reads "Wyścig A: {name}, {sport}, ukończony,
 * {duration}, {distance}" with the Activity's recorded figures, each when
 * present.
 */
export function raceTileLabel(
  { race, activity }: RaceItem,
  { priority, sport, completed }: RaceTileLabelParts,
): string {
  const details = activity
    ? [sport, completed, ...figures(activity)]
    : [sport, ...startTime(race)];

  return `${priority}: ${race.name}, ${details.join(', ')}`;
}

/**
 * A Race tile's muted line: the start time, planned duration and distance,
 * each when set ("14:00 · 2h · 50,0 km"), else the sport.
 */
export function raceTileMeta(race: Race, sport: string): string {
  return metaLine([...startTime(race), ...figures(race)], sport);
}

/**
 * A Race tile's muted line for its item: a paired Race swaps its start time
 * and plan for the Activity's recorded duration and distance, each when set,
 * else the sport; an unpaired Race shows `raceTileMeta`.
 */
export function raceItemMeta(
  { race, activity }: RaceItem,
  sport: string,
): string {
  if (!activity) return raceTileMeta(race, sport);

  return metaLine(figures(activity), sport);
}

/**
 * When a Race is, as its Detail Sheet shows it: the date, then the start time
 * when set ("pt., 13 lis 2026 · 9:05").
 */
export function formatRaceDate(race: Race, labels: NoteDateLabels): string {
  return [formatLongDate(race.date, labels), ...startTime(race)].join(' · ');
}

/** The parts as a tile's muted line, or the sport when there are none. */
function metaLine(parts: string[], sport: string): string {
  return parts.length > 0 ? parts.join(' · ') : sport;
}

/** The duration and distance, each when set, formatted for display. */
function figures({
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

/** The start time as `H:mm`, like every other time in the app; none if unset. */
function startTime({ date, startTime }: Race): string[] {
  return startTime === undefined
    ? []
    : [formatLocalTime(`${date}T${startTime}`)];
}
