import type { LocalDateString } from './localDate';
import type { WorkoutBlock } from './workoutProfile';

/**
 * The tri-state of a planned workout, per the `Workout Status` glossary term
 * in CONTEXT.md: `completed` (a matching Activity exists), `planned` (in the
 * future, no matching Activity yet), or `missed` (in the past, no matching
 * Activity).
 */
export type WorkoutStatus = 'completed' | 'planned' | 'missed';

export interface CalendarWorkout {
  id: number;
  name: string;
  /**
   * Local calendar date the workout shows on, `YYYY-MM-DD`: its paired
   * Activity's day, else the day it is scheduled on.
   */
  date: string;
  status: WorkoutStatus;
  durationSeconds?: number;
  /**
   * The workout's drawable Workout Profile, empty whenever there is no honest
   * shape to draw. Callers degrade to the title and duration alone.
   */
  blocks: WorkoutBlock[];
  /**
   * Its earliest paired Activity is a Strava Activity (see CONTEXT.md), so
   * there is nothing to show of it but that. False when no paired Activity is
   * among those fetched.
   */
  completedWithStravaActivity: boolean;
}

/** A workout as stored: everything but the status, which depends on today. */
export type StoredWorkout = Omit<CalendarWorkout, 'status'>;

/**
 * The Workout Status of a workout as of `today` (`YYYY-MM-DD`): completed if
 * an activity is paired to it, otherwise missed once its day is past.
 */
export function workoutStatus(
  workout: Pick<StoredWorkout, 'id' | 'date'>,
  completedEventIds: ReadonlySet<number>,
  today: LocalDateString,
): WorkoutStatus {
  if (completedEventIds.has(workout.id)) return 'completed';

  return workout.date < today ? 'missed' : 'planned';
}
