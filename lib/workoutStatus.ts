import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { type LocalDateString, toSortedDatedWorkoutEvents } from './localDate';
import { plannedDurationSeconds } from './plannedDuration';
import type { ZoneConfig } from './powerZones';
import { type WorkoutBlock, buildWorkoutProfile } from './workoutProfile';

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
  /** Local calendar date the workout is scheduled on, `YYYY-MM-DD`. */
  date: string;
  status: WorkoutStatus;
  durationSeconds?: number;
  /**
   * The workout's drawable Workout Profile, empty whenever there is no honest
   * shape to draw. Callers degrade to the title and duration alone.
   */
  blocks: WorkoutBlock[];
}

/** A workout as stored: everything but the status, which depends on today. */
export type StoredWorkout = Omit<CalendarWorkout, 'status'>;

/**
 * Workouts without a status, plus the IDs of the events an activity is paired
 * to — a plain array, so it stays JSON.
 */
export interface JoinedWorkouts {
  workouts: StoredWorkout[];
  completedEventIds: number[];
}

/**
 * Joins calendar events against activities on the `paired_event_id` link
 * intervals.icu sets when an activity fulfils a planned event. Primary-key
 * matching only — an activity lacking the pairing field is never matched by
 * date/type fallback, an accepted v1 gap.
 */
export function joinWorkouts(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  zoneConfig: ZoneConfig,
): JoinedWorkouts {
  const completedEventIds = [
    ...new Set(
      activities
        .map(activity => activity.paired_event_id)
        .filter((id): id is number => typeof id === 'number'),
    ),
  ];

  const workouts = toSortedDatedWorkoutEvents(events).map(
    ({ event, date }) => ({
      id: event.id,
      name: event.name,
      date,
      durationSeconds: plannedDurationSeconds(event),
      blocks: buildWorkoutProfile(event.workout_doc?.steps, zoneConfig),
    }),
  );

  return { workouts, completedEventIds };
}

/**
 * The Workout Status of a workout as of `today` (`YYYY-MM-DD`): completed if
 * an activity is paired to it, otherwise missed once its day is past.
 */
export function workoutStatus(
  workout: StoredWorkout,
  completedEventIds: ReadonlySet<number>,
  today: LocalDateString,
): WorkoutStatus {
  if (completedEventIds.has(workout.id)) return 'completed';

  return workout.date < today ? 'missed' : 'planned';
}
