import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { toLocalDateString } from './localDate';
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

/**
 * Joins calendar events against activities on the `paired_event_id` link
 * intervals.icu sets when an activity fulfils a planned event, and derives
 * each event's Workout Status. Primary-key matching only — an activity
 * lacking the pairing field is never matched by date/type fallback, an
 * accepted v1 gap.
 */
export function deriveWorkoutStatuses(
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  now: Date,
  zoneConfig: ZoneConfig,
): CalendarWorkout[] {
  const completedEventIds = new Set(
    activities
      .map(activity => activity.paired_event_id)
      .filter((id): id is number => typeof id === 'number'),
  );
  const today = toLocalDateString(now);

  return events
    .filter(event => event.category === 'WORKOUT')
    .map(event => ({ event, date: event.start_date_local.slice(0, 10) }))
    .sort((a, b) =>
      a.event.start_date_local.localeCompare(b.event.start_date_local),
    )
    .map(({ event, date }) => ({
      id: event.id,
      name: event.name,
      date,
      status: completedEventIds.has(event.id)
        ? ('completed' as const)
        : date < today
          ? ('missed' as const)
          : ('planned' as const),
      durationSeconds: event.workout_doc?.duration,
      blocks: buildWorkoutProfile(event.workout_doc?.steps, zoneConfig),
    }));
}
