import type { IntervalsActivity, IntervalsCalendarEvent } from './intervalsApi';
import { toLocalDateString } from './localDate';
import type { ZoneConfig } from './powerZones';
import { type CalendarWorkout, deriveWorkoutStatuses } from './workoutStatus';

/** Workouts keyed by local `YYYY-MM-DD`; a day with none maps to `[]`. */
export type WorkoutsByDate = Record<string, CalendarWorkout[]>;

/**
 * The activity fields the Calendar needs to join against events — a slim
 * projection, not the full activity payload Home's other flows use.
 */
export const ACTIVITY_FIELDS = 'id,start_date_local,type,paired_event_id';

/**
 * An activity can be paired to an event scheduled on a different day (ridden
 * a day late, or a Thursday session done early on Wednesday), so the
 * activities query reaches this many days past each edge of the range —
 * otherwise a workout planned on a range's first or last day would read as
 * `missed`/`planned` despite being completed just outside it. The fetch is a
 * slim field projection, so the extra days are cheap.
 */
export const PAIRING_WINDOW_DAYS = 7;

export function startOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
}

export function endOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
}

const MONDAY_OFFSET = [6, 0, 1, 2, 3, 4, 5]; // days since Monday, indexed by Date#getDay()

/** Local midnight of the week's Monday — the anchor's time of day is dropped. */
export function startOfWeek(anchor: Date): Date {
  return new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - MONDAY_OFFSET[anchor.getDay()],
  );
}

export function endOfWeek(anchor: Date): Date {
  const monday = startOfWeek(anchor);

  return new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
  );
}

/** A local calendar month, `YYYY-MM` — a Calendar month's cache key. */
export type YearMonth = string;

/** The local month the date falls in. */
export function toYearMonth(date: Date): YearMonth {
  return toLocalDateString(date).slice(0, 7);
}

/** Local midnight of the first day of the month. */
export function fromYearMonth(yearMonth: YearMonth): Date {
  const [year, month] = yearMonth.split('-').map(Number);

  return new Date(year, month - 1, 1);
}

/**
 * Every local calendar date from `oldest` to `newest`, inclusive. Counts and
 * builds days from the calendar fields rather than stepping a timestamp, so a
 * DST shift or an anchor's time of day can never drop or duplicate a day.
 */
export function eachDate(oldest: Date, newest: Date): string[] {
  const dayCount =
    Math.round(
      (Date.UTC(newest.getFullYear(), newest.getMonth(), newest.getDate()) -
        Date.UTC(oldest.getFullYear(), oldest.getMonth(), oldest.getDate())) /
        86_400_000,
    ) + 1;

  return Array.from({ length: Math.max(dayCount, 0) }, (_, index) =>
    toLocalDateString(
      new Date(
        oldest.getFullYear(),
        oldest.getMonth(),
        oldest.getDate() + index,
      ),
    ),
  );
}

/**
 * The month's workouts by day, every day of the month present. Each Workout
 * Status is derived against `now`, so it's fixed at the time of the fetch.
 */
export function buildMonthWorkouts(
  month: Date,
  events: IntervalsCalendarEvent[],
  activities: IntervalsActivity[],
  now: Date,
  zoneConfig: ZoneConfig,
): WorkoutsByDate {
  const workoutsByDate: WorkoutsByDate = {};

  for (const date of eachDate(startOfMonth(month), endOfMonth(month))) {
    workoutsByDate[date] = [];
  }

  for (const workout of deriveWorkoutStatuses(
    events,
    activities,
    now,
    zoneConfig,
  )) {
    workoutsByDate[workout.date]?.push(workout);
  }

  return workoutsByDate;
}
