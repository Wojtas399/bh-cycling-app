import {
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from './intervalsApi';
import { addDays, toLocalDateString } from './localDate';
import { type ZoneConfig, resolveZoneConfig } from './powerZones';
import { type CalendarWorkout, deriveWorkoutStatuses } from './workoutStatus';

/**
 * The activity fields the Calendar needs to join against events — a slim
 * projection, not the full activity payload Home's other flows use.
 */
const ACTIVITY_FIELDS = 'id,start_date_local,type,paired_event_id';

/**
 * Per-day workout cache, shared between the monthly and weekly views so
 * whichever fetches a date populates the same entry for the other. A date
 * mapped to `[]` means "fetched, no workouts" — distinct from "never
 * fetched", which is tracked separately in `fetchedDates` below so the two
 * are never conflated.
 */
const dayCache = new Map<string, CalendarWorkout[]>();

/** Dates already covered by a fetch this session, month or week alike. */
const fetchedDates = new Set<string>();

/**
 * The connected athlete's zone config, resolved once and shared between the
 * monthly and weekly hooks so switching views never re-issues the athlete
 * settings request — mirrors the per-day cache's session-lifetime, shared
 * nature.
 */
let cachedZoneConfig: ZoneConfig | null = null;

/**
 * Clears the per-day cache, all fetched-range bookkeeping, and the cached
 * zone config. Used by the refresh control, on Intervals.icu disconnect, and
 * by the shared auth-error handler on a 401 — every case where previously
 * cached data could belong to a different (or no longer authorized) account.
 */
export function clearCalendarCache(): void {
  dayCache.clear();
  fetchedDates.clear();
  cachedZoneConfig = null;
}

export function getCachedWorkoutsForDate(date: string): CalendarWorkout[] {
  return dayCache.get(date) ?? [];
}

export function startOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
}

export function endOfMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
}

const MONDAY_OFFSET = [6, 0, 1, 2, 3, 4, 5]; // days since Monday, indexed by Date#getDay()

export function startOfWeek(anchor: Date): Date {
  return addDays(anchor, -MONDAY_OFFSET[anchor.getDay()]);
}

export function endOfWeek(anchor: Date): Date {
  return addDays(startOfWeek(anchor), 6);
}

function eachDate(oldest: Date, newest: Date): string[] {
  const dates: string[] = [];

  for (let cursor = oldest; cursor <= newest; cursor = addDays(cursor, 1)) {
    dates.push(toLocalDateString(cursor));
  }

  return dates;
}

function isRangeFetched(oldest: Date, newest: Date): boolean {
  return eachDate(oldest, newest).every(date => fetchedDates.has(date));
}

export function isMonthFetched(anchor: Date): boolean {
  return isRangeFetched(startOfMonth(anchor), endOfMonth(anchor));
}

export function isWeekFetched(anchor: Date): boolean {
  return isRangeFetched(startOfWeek(anchor), endOfWeek(anchor));
}

/**
 * Builds the `date -> workouts` slice of the cache for the given range.
 * Callers use this after a fetch resolves to read back what they just
 * populated (or what a previous fetch already populated).
 */
export function getWorkoutsByDate(
  oldest: Date,
  newest: Date,
): Record<string, CalendarWorkout[]> {
  const result: Record<string, CalendarWorkout[]> = {};

  for (const date of eachDate(oldest, newest)) {
    result[date] = getCachedWorkoutsForDate(date);
  }

  return result;
}

/**
 * Custom zone boundaries only sharpen the colours of a workout's profile,
 * and Coggan stands in for them well enough — losing them must never cost
 * the athlete the calendar itself, so a settings fetch failure falls back
 * rather than propagating.
 */
async function resolveCachedZoneConfig(token: string): Promise<ZoneConfig> {
  if (!cachedZoneConfig) {
    const settings = await getAthleteSettings(token).catch(() => null);

    cachedZoneConfig = resolveZoneConfig(settings);
  }

  return cachedZoneConfig;
}

async function fetchRange(
  token: string,
  athleteId: string,
  oldest: Date,
  newest: Date,
  now: Date,
): Promise<void> {
  const params = {
    oldest: toLocalDateString(oldest),
    newest: toLocalDateString(newest),
  };

  const [events, activities, zoneConfig] = await Promise.all([
    getCalendarEvents(token, athleteId, params),
    getActivities(token, athleteId, { ...params, fields: ACTIVITY_FIELDS }),
    resolveCachedZoneConfig(token),
  ]);

  const workouts = deriveWorkoutStatuses(events, activities, now, zoneConfig);
  const dates = eachDate(oldest, newest);

  for (const date of dates) {
    dayCache.set(date, []);
  }

  for (const workout of workouts) {
    dayCache.get(workout.date)?.push(workout);
  }

  for (const date of dates) {
    fetchedDates.add(date);
  }
}

/**
 * Fetches and caches the visible calendar month, a no-op when every day in
 * it has already been fetched this session (by this view or the other one).
 */
export async function fetchMonth(
  token: string,
  athleteId: string,
  anchor: Date,
  now: Date,
): Promise<void> {
  if (isMonthFetched(anchor)) return;

  await fetchRange(
    token,
    athleteId,
    startOfMonth(anchor),
    endOfMonth(anchor),
    now,
  );
}

/**
 * Fetches and caches the visible week (Monday–Sunday), a no-op when every
 * day in it has already been fetched this session (by this view or the
 * other one).
 */
export async function fetchWeek(
  token: string,
  athleteId: string,
  anchor: Date,
  now: Date,
): Promise<void> {
  if (isWeekFetched(anchor)) return;

  await fetchRange(
    token,
    athleteId,
    startOfWeek(anchor),
    endOfWeek(anchor),
    now,
  );
}
