import type { IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

export function plannedDurationSeconds({
  moving_time,
  workout_doc,
}: IntervalsCalendarEvent): number | undefined {
  return [moving_time, workout_doc?.duration].find(
    (seconds): seconds is number => isFiniteNumber(seconds) && seconds > 0,
  );
}
