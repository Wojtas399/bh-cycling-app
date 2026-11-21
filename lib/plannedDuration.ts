import type { IntervalsCalendarEvent } from './intervalsApi';
import { isFiniteNumber } from './isFiniteNumber';

export function plannedDurationSeconds({
  moving_time,
  workout_doc,
}: IntervalsCalendarEvent): number | undefined {
  return [moving_time, workout_doc?.duration]
    .filter(isFiniteNumber)
    .find(seconds => seconds > 0);
}
