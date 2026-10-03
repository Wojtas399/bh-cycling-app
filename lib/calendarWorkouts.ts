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
 * An activity can be paired to an event scheduled on a different day (ridden
 * a day late, or a Thursday session done early on Wednesday), so the
 * activities query reaches this many days past each edge of the range —
 * otherwise a workout planned on a range's first or last day would read as
 * `missed`/`planned` despite being completed just outside it. The fetch is a
 * slim field projection, so the extra days are cheap.
 */
const PAIRING_WINDOW_DAYS = 7;

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
 * The athlete the cache was populated for. A fetch for a different athlete —
 * another account signing in during the same app session — drops everything
 * first, so one athlete's workouts are never served to another.
 */
let cacheOwner: string | null = null;

/**
 * Bumped on every clear. A fetch captures it before its network calls and
 * discards its result if it changed meanwhile, so a request that was in
 * flight when the cache was cleared can't repopulate it with data from the
 * previous account or from before a refresh.
 */
let cacheGeneration = 0;

/** In-flight fetches by athlete + range, so concurrent callers share one. */
const inflight = new Map<string, Promise<void>>();

/**
 * Clears the per-day cache, all fetched-range bookkeeping, and the cached
 * zone config. Used on Intervals.icu disconnect and by the shared auth-error
 * handler on a 401 — every case where previously cached data could belong to
 * a different (or no longer authorized) account. Also invalidates fetches
 * already in flight.
 */
export function clearCalendarCache(): void {
  dayCache.clear();
  fetchedDates.clear();
  inflight.clear();
  cachedZoneConfig = null;
  cacheOwner = null;
  cacheGeneration++;
}

function claimCache(athleteId: string): void {
  if (cacheOwner !== null && cacheOwner !== athleteId) {
    clearCalendarCache();
  }

  cacheOwner = athleteId;
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

/**
 * Every local calendar date from `oldest` to `newest`, inclusive. Counts and
 * builds days from the calendar fields rather than stepping a timestamp, so a
 * DST shift or an anchor's time of day can never drop or duplicate a day.
 */
function eachDate(oldest: Date, newest: Date): string[] {
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

function isRangeFetched(
  athleteId: string,
  oldest: Date,
  newest: Date,
): boolean {
  return (
    cacheOwner === athleteId &&
    eachDate(oldest, newest).every(date => fetchedDates.has(date))
  );
}

export function isMonthFetched(anchor: Date, athleteId: string): boolean {
  return isRangeFetched(athleteId, startOfMonth(anchor), endOfMonth(anchor));
}

export function isWeekFetched(anchor: Date, athleteId: string): boolean {
  return isRangeFetched(athleteId, startOfWeek(anchor), endOfWeek(anchor));
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
 * rather than propagating. Only a successful lookup is cached: the fallback
 * is used for this fetch alone, so a transient failure is retried by the
 * next one instead of pinning default zones for the whole session.
 */
async function resolveCachedZoneConfig(
  token: string,
  generation: number,
): Promise<ZoneConfig> {
  if (cachedZoneConfig) return cachedZoneConfig;

  try {
    const zoneConfig = resolveZoneConfig(await getAthleteSettings(token));

    if (generation === cacheGeneration) {
      cachedZoneConfig = zoneConfig;
    }

    return zoneConfig;
  } catch {
    return resolveZoneConfig(null);
  }
}

export interface FetchOptions {
  /**
   * Replace the whole cache with this fetch's result instead of merging into
   * it — the refresh control. The old data stays in place until the new
   * fetch succeeds, so a failed refresh loses nothing.
   */
  force?: boolean;
}

async function fetchRange(
  token: string,
  athleteId: string,
  oldest: Date,
  newest: Date,
  now: Date,
  { force = false }: FetchOptions,
): Promise<void> {
  claimCache(athleteId);

  const generation = cacheGeneration;
  const params = {
    oldest: toLocalDateString(oldest),
    newest: toLocalDateString(newest),
  };
  const activityParams = {
    oldest: toLocalDateString(addDays(oldest, -PAIRING_WINDOW_DAYS)),
    newest: toLocalDateString(addDays(newest, PAIRING_WINDOW_DAYS)),
    fields: ACTIVITY_FIELDS,
  };

  const [events, activities, zoneConfig] = await Promise.all([
    getCalendarEvents(token, athleteId, params),
    getActivities(token, athleteId, activityParams),
    resolveCachedZoneConfig(token, generation),
  ]);

  if (generation !== cacheGeneration) return;

  if (force) {
    clearCalendarCache();
    claimCache(athleteId);
    cachedZoneConfig = zoneConfig;
  }

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
 * Runs `fetchRange` unless an identical fetch is already in flight, in which
 * case the caller shares it — a token refresh or rapid navigation re-running
 * an effect doesn't multiply the requests.
 */
function fetchRangeShared(
  token: string,
  athleteId: string,
  oldest: Date,
  newest: Date,
  now: Date,
  options: FetchOptions,
): Promise<void> {
  const key = [
    athleteId,
    toLocalDateString(oldest),
    toLocalDateString(newest),
    options.force ? 'force' : 'merge',
  ].join('|');
  const pending = inflight.get(key);

  if (pending) return pending;

  const request = fetchRange(token, athleteId, oldest, newest, now, options);
  const tracked = request.finally(() => {
    if (inflight.get(key) === tracked) inflight.delete(key);
  });

  inflight.set(key, tracked);

  return tracked;
}

/**
 * Fetches and caches the visible calendar month, a no-op when every day in
 * it has already been fetched this session (by this view or the other one)
 * unless `force` is set.
 */
export async function fetchMonth(
  token: string,
  athleteId: string,
  anchor: Date,
  now: Date,
  options: FetchOptions = {},
): Promise<void> {
  if (!options.force && isMonthFetched(anchor, athleteId)) return;

  await fetchRangeShared(
    token,
    athleteId,
    startOfMonth(anchor),
    endOfMonth(anchor),
    now,
    options,
  );
}

/**
 * Fetches and caches the visible week (Monday–Sunday), a no-op when every
 * day in it has already been fetched this session (by this view or the
 * other one) unless `force` is set.
 */
export async function fetchWeek(
  token: string,
  athleteId: string,
  anchor: Date,
  now: Date,
  options: FetchOptions = {},
): Promise<void> {
  if (!options.force && isWeekFetched(anchor, athleteId)) return;

  await fetchRangeShared(
    token,
    athleteId,
    startOfWeek(anchor),
    endOfWeek(anchor),
    now,
    options,
  );
}
