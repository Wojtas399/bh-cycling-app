import { formatLongDate } from './activityStart';
import type { RaceItem } from './calendarItems';
import { formatMetric } from './formatWorkoutMetric';
import { formatLocalTime } from './localDateTime';
import type { NoteDateLabels } from './noteDates';
import type { Race } from './races';

/** The words a Race tile's screen-reader label is built from. */
export interface RaceTileLabelParts {
  /** The Race Priority as spoken, e.g. "Wyścig A". */
  priority: string;
  /** The sport's label, e.g. "Bieg". */
  sport: string;
}

/**
 * A Race tile's screen-reader label: "Wyścig A: {name}, {sport}, {when}",
 * where `{when}` is the start time, left out for an all-day Race.
 */
export function raceTileLabel(
  { race }: RaceItem,
  { priority, sport }: RaceTileLabelParts,
): string {
  const details = [sport, ...startTime(race)];

  return `${priority}: ${race.name}, ${details.join(', ')}`;
}

/**
 * A Race tile's muted line: the start time, planned duration and distance,
 * each when set ("14:00 · 2h · 50,0 km"), else the sport.
 */
export function raceTileMeta(race: Race, sport: string): string {
  const parts = [
    ...startTime(race),
    ...(race.durationSeconds === undefined
      ? []
      : [formatMetric('duration', race.durationSeconds)]),
    ...(race.distanceMeters === undefined
      ? []
      : [formatMetric('distance', race.distanceMeters)]),
  ];

  return parts.length > 0 ? parts.join(' · ') : sport;
}

/**
 * When a Race is, as its Detail Sheet shows it: the date, then the start time
 * when set ("pt., 13 lis 2026 · 9:05").
 */
export function formatRaceDate(race: Race, labels: NoteDateLabels): string {
  return [formatLongDate(race.date, labels), ...startTime(race)].join(' · ');
}

/** The start time as `H:mm`, like every other time in the app; none if unset. */
function startTime({ date, startTime }: Race): string[] {
  return startTime === undefined
    ? []
    : [formatLocalTime(`${date}T${startTime}`)];
}
