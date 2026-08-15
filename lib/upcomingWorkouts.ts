import type { IntervalsCalendarEvent } from './intervalsApi';
import type { ZoneConfig } from './powerZones';
import { type WorkoutBlock, buildWorkoutProfile } from './workoutProfile';

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

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

export function getUpcomingWorkouts(
  events: IntervalsCalendarEvent[],
  now: Date,
  zoneConfig: ZoneConfig,
): UpcomingWorkout[] {
  const today = toLocalDateString(now);
  const tomorrow = toLocalDateString(addDays(now, 1));

  return events
    .filter(event => event.category === 'WORKOUT')
    .map(event => ({ event, date: event.start_date_local.slice(0, 10) }))
    .filter(({ date }) => date === today || date === tomorrow)
    .sort((a, b) =>
      a.event.start_date_local.localeCompare(b.event.start_date_local),
    )
    .map(({ event, date }) => ({
      id: event.id,
      name: event.name,
      dayLabel: date === today ? ('today' as const) : ('tomorrow' as const),
      durationSeconds: event.workout_doc?.duration,
      blocks: buildWorkoutProfile(event.workout_doc?.steps, zoneConfig),
    }));
}
