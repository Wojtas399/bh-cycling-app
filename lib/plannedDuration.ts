import type { IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

/**
 * A Workout's planned duration in seconds, or `undefined` when it has none.
 * intervals.icu sends `0` rather than leaving the field out for a Workout it
 * can't time — an open-ended ramp test, a free ride — so zero counts as
 * absent, never as a `0m` Workout.
 */
export function plannedDurationSeconds({
  moving_time,
  workout_doc,
}: IntervalsCalendarEvent): number | undefined {
  return [moving_time, workout_doc?.duration].find(
    (seconds): seconds is number => isFiniteNumber(seconds) && seconds > 0,
  );
}
