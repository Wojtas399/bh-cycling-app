import type { IntervalsCalendarEvent } from './intervalsApi';
import {
  addDays,
  toLocalDateString,
  toSortedDatedWorkoutEvents,
} from './localDate';
import type { ZoneConfig } from './powerZones';
import { type WorkoutBlock, buildWorkoutProfile } from './workoutProfile';

export { toLocalDateString } from './localDate';

export interface UpcomingWorkout {
  id: number;
  name: string;
  dayLabel: 'today' | 'tomorrow';
  durationSeconds?: number;
  /**
   * The workout's drawable Workout Profile, empty whenever there is no honest
   * shape to draw — an unstructured ride, or one targeted by anything other
   * than power. Callers degrade to the title and duration alone.
   */
  blocks: WorkoutBlock[];
}

export function getUpcomingWorkouts(
  events: IntervalsCalendarEvent[],
  now: Date,
  zoneConfig: ZoneConfig,
): UpcomingWorkout[] {
  const today = toLocalDateString(now);
  const tomorrow = toLocalDateString(addDays(now, 1));

  return toSortedDatedWorkoutEvents(events)
    .filter(({ date }) => date === today || date === tomorrow)
    .map(({ event, date }) => ({
      id: event.id,
      name: event.name,
      dayLabel: date === today ? ('today' as const) : ('tomorrow' as const),
      durationSeconds: event.workout_doc?.duration,
      blocks: buildWorkoutProfile(event.workout_doc?.steps, zoneConfig),
    }));
}
