import type { IntervalsCalendarEvent } from './intervalsApi';
import type { ZoneConfig } from './powerZones';
import { type WorkoutBlock, buildWorkoutProfile } from './workoutProfile';

export type UpcomingEntry = UpcomingWorkoutEntry | UpcomingNoteEntry;

export interface UpcomingWorkoutEntry {
  kind: 'workout';
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

export interface UpcomingNoteEntry {
  kind: 'note';
  id: number;
  title: string;
  /** Raw Markdown from the source event's `description`, unrendered here. */
  text: string;
  dayLabel: 'today' | 'tomorrow';
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

// Notes carry no reliable intra-day timestamp (intervals.icu commonly
// defaults a NOTE event's time to midnight), so same-day ordering can't
// trust start_date_local alone: workouts always sort before notes on their
// shared day, matching the reference UI.
function categoryRank(category: string): number {
  return category === 'WORKOUT' ? 0 : 1;
}

export function getUpcomingEntries(
  events: IntervalsCalendarEvent[],
  now: Date,
  zoneConfig: ZoneConfig,
): UpcomingEntry[] {
  const today = toLocalDateString(now);
  const tomorrow = toLocalDateString(addDays(now, 1));

  return events
    .filter(event => event.category === 'WORKOUT' || event.category === 'NOTE')
    .map(event => ({ event, date: event.start_date_local.slice(0, 10) }))
    .filter(({ date }) => date === today || date === tomorrow)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);

      const rankDiff =
        categoryRank(a.event.category) - categoryRank(b.event.category);

      if (rankDiff !== 0) return rankDiff;

      return a.event.start_date_local.localeCompare(b.event.start_date_local);
    })
    .map(({ event, date }): UpcomingEntry => {
      const dayLabel =
        date === today ? ('today' as const) : ('tomorrow' as const);

      if (event.category === 'NOTE') {
        return {
          kind: 'note',
          id: event.id,
          title: event.name,
          text: event.description ?? '',
          dayLabel,
        };
      }

      return {
        kind: 'workout',
        id: event.id,
        name: event.name,
        dayLabel,
        durationSeconds: event.workout_doc?.duration,
        blocks: buildWorkoutProfile(event.workout_doc?.steps, zoneConfig),
      };
    });
}
