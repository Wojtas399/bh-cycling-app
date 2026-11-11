import {
  type ActivityDetails,
  type StoredActivityDetails,
  toStoredActivityDetails,
} from './activityDetails';
import {
  ACTIVITY_FIELDS,
  type CalendarData,
  type StoredMonth,
  type YearMonth,
  buildMonthItems,
  endOfMonth,
  fromYearMonth,
  pairingWindow,
  withItemStatuses,
} from './calendarWorkouts';
import {
  FITNESS_FIELDS,
  type FitnessDay,
  type FitnessValues,
  fitnessHistoryWindow,
  toFitnessDays,
  toFitnessValues,
} from './fitness';
import {
  EVENT_CATEGORY,
  type IntervalsActivity,
  type IntervalsCalendarEvent,
  getActivities,
  getActivity,
  getActivityMap,
  getAthleteSettings,
  getCalendarEvent,
  getCalendarEvents,
  getWellness,
  getWellnessRange,
  isNotFoundError,
} from './intervalsApi';
import {
  type LocalDateString,
  addDays,
  fromLocalDateString,
  toLocalDateString,
} from './localDate';
import { type Note, noteWindow, toNotes } from './notes';
import { pairWorkout } from './pairing';
import { type ZoneConfig, resolveZoneConfig } from './powerZones';
import {
  NEXT_RACE_WINDOW_DAYS,
  type Race,
  compareRacesByDate,
  toRace,
  toRaces,
} from './races';
import { type RideSettings, resolveRideSettings } from './rideSettings';
import { type Route, toRoute } from './route';
import { getUpcomingItems } from './upcomingWorkouts';
import { type WellnessRow, toWellnessRows } from './wellness';
import {
  type StoredWorkoutDetails,
  WORKOUT_DETAILS_ACTIVITY_FIELDS,
  type WorkoutDetails,
  buildWorkoutDetails,
} from './workoutDetails';
import {
  type QueryClient,
  queryOptions,
  skipToken,
} from '@tanstack/react-query';

/** What every Intervals.icu request needs: who to ask about, and the token. */
export interface IntervalsCredentials {
  accessToken: string;
  athleteId: string;
}

/**
 * Every Intervals.icu query key starts with `intervalsKeys.all`, so all of it
 * can be cancelled and removed by that prefix. The access token is never part
 * of a key — the `queryFn` closures capture it instead. The athlete id is
 * `undefined` only in the key of a query skipped for want of credentials.
 */
export const intervalsKeys = {
  all: ['intervals'] as const,
  /** Everything for one athlete, the prefix the refresh control invalidates. */
  athlete: (athleteId: string | undefined) =>
    [...intervalsKeys.all, athleteId] as const,
  athleteSettings: (athleteId: string | undefined) =>
    [...intervalsKeys.athlete(athleteId), 'athleteSettings'] as const,
  /** `today` is the date the upcoming workouts are counted from. */
  upcoming: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'upcoming', today] as const,
  /** `today` is the first day the next-race card looks for a Race on. */
  nextRace: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'nextRace', today] as const,
  /** `today` is the day whose Wellness Entry is read. */
  wellness: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'wellness', today] as const,
  /** `today` is the last day of the year of Fitness read. */
  fitness: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'fitness', today] as const,
  /** Every Calendar month. */
  calendar: (athleteId: string | undefined) =>
    [...intervalsKeys.athlete(athleteId), 'calendar'] as const,
  month: (athleteId: string | undefined, yearMonth: YearMonth) =>
    [...intervalsKeys.calendar(athleteId), 'month', yearMonth] as const,
  /** One Workout's details, by its intervals.icu event id. */
  workout: (athleteId: string | undefined, eventId: number) =>
    [...intervalsKeys.athlete(athleteId), 'workout', eventId] as const,
  /**
   * The Race behind an Activity's paired event, by its intervals.icu event id.
   * The id is `null` only in the key of a query skipped for want of one.
   */
  race: (athleteId: string | undefined, eventId: number | null) =>
    [...intervalsKeys.athlete(athleteId), 'race', eventId] as const,
  /**
   * One Activity's details, by its intervals.icu id. The id is `null` only in
   * the key of a query skipped for want of one.
   */
  activity: (athleteId: string | undefined, activityId: string | null) =>
    [...intervalsKeys.athlete(athleteId), 'activity', activityId] as const,
  /**
   * One Activity's Route, by its intervals.icu id. The id is `null` only in
   * the key of a query skipped for want of one.
   */
  route: (athleteId: string | undefined, activityId: string | null) =>
    [...intervalsKeys.athlete(athleteId), 'route', activityId] as const,
};

/**
 * Cancels every Intervals.icu query, aborting its request in flight, and then
 * drops them all, so a late response can never refill the cache.
 */
export async function removeIntervalsQueries(
  client: QueryClient,
): Promise<void> {
  await client.cancelQueries({ queryKey: intervalsKeys.all });
  client.removeQueries({ queryKey: intervalsKeys.all });
}

/**
 * How a month, the upcoming workouts and a Workout's or an Activity's details
 * stay fresh: stale after 5 minutes, then refetched when shown again or when
 * the app returns to the foreground.
 */
const WORKOUTS_FRESHNESS = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: true,
} as const;

/**
 * The athlete's power zones and current Ride FTP, resolved from their
 * Intervals.icu settings (see `resolveRideSettings`). They rarely change, so
 * only a refresh fetches them again. Skipped while there are no credentials.
 */
export function athleteSettingsQueryOptions(
  credentials: IntervalsCredentials | null,
) {
  return queryOptions({
    queryKey: intervalsKeys.athleteSettings(credentials?.athleteId),
    queryFn: credentials
      ? async ({ signal }): Promise<RideSettings> =>
          resolveRideSettings(
            await getAthleteSettings(credentials.accessToken, { signal }),
          )
      : skipToken,
    staleTime: Infinity,
  });
}

/**
 * Home's items for `today` and the day after (see `getUpcomingItems`). Events
 * and Activities are fetched a pairing window past each edge, since a paired
 * Workout shows on its Activity's day. Notes come from their own call, reaching
 * back `NOTE_LOOK_BACK_DAYS` for one that started earlier; if it fails, the
 * query fails. `today` is in the key, so the statuses are derived in the
 * fetch. Skipped while there are no credentials.
 */
export function upcomingQueryOptions(
  credentials: IntervalsCredentials | null,
  today: LocalDateString,
) {
  return queryOptions({
    queryKey: intervalsKeys.upcoming(credentials?.athleteId, today),
    queryFn: credentials
      ? async ({ signal, client }) => {
          const first = fromLocalDateString(today);
          const { events, activities, notes, zoneConfig } =
            await fetchCalendarRange(
              client,
              credentials,
              first,
              addDays(first, 1),
              signal,
            );

          return getUpcomingItems(events, activities, notes, today, zoneConfig);
        }
      : skipToken,
    ...WORKOUTS_FRESHNESS,
  });
}

/**
 * The Races from `today` to `NEXT_RACE_WINDOW_DAYS` days ahead, by date, for
 * the next-race card: one Race-only events read, never derived from the
 * upcoming query, whose window is far shorter. It fails on its own, so "Dziś
 * i jutro" never fails with it. `today` is in the key, so the window moves on
 * at midnight. Fresh as long as the upcoming workouts. Skipped while there
 * are no credentials.
 */
export function nextRaceQueryOptions(
  credentials: IntervalsCredentials | null,
  today: LocalDateString,
) {
  return queryOptions({
    queryKey: intervalsKeys.nextRace(credentials?.athleteId, today),
    queryFn: credentials
      ? async ({ signal }): Promise<Race[]> => {
          const events = await getCalendarEvents(
            credentials.accessToken,
            credentials.athleteId,
            {
              oldest: today,
              newest: toLocalDateString(
                addDays(fromLocalDateString(today), NEXT_RACE_WINDOW_DAYS),
              ),
              category: [
                EVENT_CATEGORY.raceA,
                EVENT_CATEGORY.raceB,
                EVENT_CATEGORY.raceC,
              ],
            },
            { signal },
          );

          return toRaces(events).sort(compareRacesByDate);
        }
      : skipToken,
    ...WORKOUTS_FRESHNESS,
  });
}

/** Today's Wellness Entry as Home's two top cards show it. */
export interface TodayEntry {
  /** `null` on a day without Fitness and Fatigue (see `toFitnessValues`). */
  fitness: FitnessValues | null;
  /** None on a day without data (see `toWellnessRows`). */
  wellness: WellnessRow[];
}

/**
 * Today's Wellness Entry, the one read behind both the Fitness and the
 * Wellness card. `today` is in the key, so the cards move to the new day at
 * midnight. Fresh as long as the upcoming workouts. Retries are the global
 * default (none), so a 403 is never retried. Skipped while there are no
 * credentials.
 */
export function todayQueryOptions(
  credentials: IntervalsCredentials | null,
  today: LocalDateString,
) {
  return queryOptions({
    queryKey: intervalsKeys.wellness(credentials?.athleteId, today),
    queryFn: credentials
      ? async ({ signal }): Promise<TodayEntry> => {
          const entry = await getWellness(
            credentials.accessToken,
            credentials.athleteId,
            today,
            { signal },
          );

          return {
            fitness: toFitnessValues(entry),
            wellness: toWellnessRows(entry),
          };
        }
      : skipToken,
    ...WORKOUTS_FRESHNESS,
  });
}

/**
 * The Fitness chart's year ending `today`, a day for every date (see
 * `toFitnessDays`), from one Wellness range read. Every range is a slice of
 * it, so switching ranges never fetches. It never asks past `today`, so no
 * projected value arrives. `today` is in the key, so the year moves on at
 * midnight. Separate from today's Wellness Entry, which Home reads. Fresh as
 * long as the upcoming workouts. Retries are the global default (none), so a
 * 403 is never retried. Skipped while there are no credentials.
 */
export function fitnessQueryOptions(
  credentials: IntervalsCredentials | null,
  today: LocalDateString,
) {
  return queryOptions({
    queryKey: intervalsKeys.fitness(credentials?.athleteId, today),
    queryFn: credentials
      ? async ({ signal }): Promise<FitnessDay[]> => {
          const rows = await getWellnessRange(
            credentials.accessToken,
            credentials.athleteId,
            { ...fitnessHistoryWindow(today), fields: FITNESS_FIELDS },
            { signal },
          );

          return toFitnessDays(rows, today);
        }
      : skipToken,
    ...WORKOUTS_FRESHNESS,
  });
}

/** Derives a stored month's Workout Statuses for display; Notes pass through. */
export type MonthSelect = (month: StoredMonth) => CalendarData;

/**
 * The month `select` deriving each Workout Status as of `today`. Callers keep
 * it referentially stable per `today`, so a month's selected result is only
 * recomputed when the data or the day changes.
 */
export function selectMonthAsOf(today: LocalDateString): MonthSelect {
  return month => ({
    itemsByDate: withItemStatuses(month, today),
    notes: month.notes,
  });
}

/**
 * One Calendar month's items by day — Workouts and Unplanned Activities —
 * every day of it present, and the Notes overlapping it. Events and
 * Activities are both fetched a pairing window past each edge (see
 * `PAIRING_WINDOW_DAYS`), since a paired Workout shows on its Activity's day.
 * Notes come from their own call, reaching back `NOTE_LOOK_BACK_DAYS` for one
 * that started earlier; if it fails, the month fails. The query stores the
 * Workouts without a status; `select` (see `selectMonthAsOf`) derives each
 * Workout Status, so a planned workout turns missed at midnight without a
 * fetch. Skipped while there are no credentials.
 */
export function monthQueryOptions(
  credentials: IntervalsCredentials | null,
  yearMonth: YearMonth,
  select: MonthSelect,
) {
  return queryOptions({
    queryKey: intervalsKeys.month(credentials?.athleteId, yearMonth),
    queryFn: credentials
      ? async ({ signal, client }) => {
          const first = fromYearMonth(yearMonth);
          const { events, activities, notes, zoneConfig } =
            await fetchCalendarRange(
              client,
              credentials,
              first,
              endOfMonth(first),
              signal,
            );

          return buildMonthItems(first, events, activities, notes, zoneConfig);
        }
      : skipToken,
    select,
    ...WORKOUTS_FRESHNESS,
  });
}

/** Derives a stored Workout's view model, Workout Status included. */
export type WorkoutDetailsSelect = (
  stored: StoredWorkoutDetails,
) => WorkoutDetails;

/**
 * The Workout Details `select` building the view model as of `today`. Callers
 * keep it referentially stable per `today`, like `selectMonthAsOf`.
 */
export function selectWorkoutDetailsAsOf(
  today: LocalDateString,
): WorkoutDetailsSelect {
  return stored => buildWorkoutDetails(stored, today);
}

/**
 * One Workout with how it is paired. The single event read lacks
 * `paired_activity_id` (#191) and can't resolve step watts, so it only dates
 * the Workout: the event itself is then taken from that day's Workouts list,
 * which has both, alongside the Activities a pairing window around the day.
 * Should the list lack the event, the single read stands in. The query stores no status; `select` (see
 * `selectWorkoutDetailsAsOf`) derives it, so a planned Workout turns missed at
 * midnight without a fetch. Never reads from or writes into the month or
 * upcoming caches. Skipped while there are no credentials.
 */
export function workoutDetailsQueryOptions(
  credentials: IntervalsCredentials | null,
  eventId: number,
  select: WorkoutDetailsSelect,
) {
  return queryOptions({
    queryKey: intervalsKeys.workout(credentials?.athleteId, eventId),
    queryFn: credentials
      ? async ({ signal, client }): Promise<StoredWorkoutDetails> => {
          const { accessToken, athleteId } = credentials;
          const zoneConfigPromise = fetchZoneConfig(client, credentials);
          const eventRead = await getCalendarEvent(
            accessToken,
            athleteId,
            eventId,
            { signal },
          );
          const day = eventRead.start_date_local.slice(0, 10);
          const date = fromLocalDateString(day);
          const [dayWorkouts, activities, zoneConfig] = await Promise.all([
            getCalendarEvents(
              accessToken,
              athleteId,
              {
                oldest: day,
                newest: day,
                category: EVENT_CATEGORY.workout,
                resolve: true,
              },
              { signal },
            ),
            getActivities(
              accessToken,
              athleteId,
              {
                ...pairingWindow(date, date),
                fields: WORKOUT_DETAILS_ACTIVITY_FIELDS,
              },
              { signal },
            ),
            zoneConfigPromise,
          ]);
          const event =
            dayWorkouts.find(({ id }) => id === eventId) ?? eventRead;

          return { event, ...pairWorkout(event, activities), zoneConfig };
        }
      : skipToken,
    select,
    ...WORKOUTS_FRESHNESS,
  });
}

/** Derives a stored Activity's view model. */
export type ActivityDetailsSelect = (
  stored: StoredActivityDetails,
) => ActivityDetails;

/**
 * One Activity, with its detected intervals, for Activity Details. The query
 * stores the body trimmed to what the screen needs (see
 * `toStoredActivityDetails`), never the whole of it; `select` builds the view
 * model. Activity Details and a completed Workout's profile card share it.
 * Never reads from or writes into the month, upcoming or Workout Details
 * caches. Fresh as long as a Workout's details. Skipped without credentials or
 * an Activity id.
 */
export function activityDetailsQueryOptions(
  credentials: IntervalsCredentials | null,
  activityId: string | null,
  select: ActivityDetailsSelect,
) {
  return queryOptions({
    queryKey: intervalsKeys.activity(credentials?.athleteId, activityId),
    queryFn:
      credentials && activityId !== null
        ? async ({ signal }): Promise<StoredActivityDetails> =>
            toStoredActivityDetails(
              await getActivity(
                credentials.accessToken,
                activityId,
                { intervals: true },
                { signal },
              ),
            )
        : skipToken,
    select,
    ...WORKOUTS_FRESHNESS,
  });
}

/**
 * The Race an Activity is paired to, for the Race header on Activity Details:
 * one read of the paired event, `null` when that event isn't a Race (a
 * Workout, say). Never reads from or writes into the month or upcoming
 * caches. Fresh as long as a Workout's details. Skipped without credentials
 * or an event id.
 */
export function raceQueryOptions(
  credentials: IntervalsCredentials | null,
  eventId: number | null,
) {
  return queryOptions({
    queryKey: intervalsKeys.race(credentials?.athleteId, eventId),
    queryFn:
      credentials && eventId !== null
        ? async ({ signal }): Promise<Race | null> =>
            toRace(
              await getCalendarEvent(
                credentials.accessToken,
                credentials.athleteId,
                eventId,
                { signal },
              ),
            ) ?? null
        : skipToken,
    ...WORKOUTS_FRESHNESS,
  });
}

/**
 * One Activity's Route, simplified for drawing. A 404 means intervals.icu has
 * no track for it, which resolves to `null` ("no Route"), not an error; so
 * does a track with fewer than 2 usable points. A recorded track never
 * changes, so a loaded Route stays fresh forever and is never refetched on
 * foreground. Retries, `gcTime` and 401 routing are the global defaults.
 * Skipped without credentials or an Activity id.
 */
export function routeQueryOptions(
  credentials: IntervalsCredentials | null,
  activityId: string | null,
) {
  return queryOptions({
    queryKey: intervalsKeys.route(credentials?.athleteId, activityId),
    queryFn:
      credentials && activityId !== null
        ? async ({ signal }): Promise<Route | null> => {
            try {
              return toRoute(
                await getActivityMap(credentials.accessToken, activityId, {
                  signal,
                }),
              );
            } catch (error) {
              if (isNotFoundError(error)) return null;

              throw error;
            }
          }
        : skipToken,
    staleTime: Infinity,
  });
}

/** Everything Home and the Calendar draw for a range of days. */
interface CalendarRangeData {
  events: IntervalsCalendarEvent[];
  activities: IntervalsActivity[];
  /** In `id` order. */
  notes: Note[];
  zoneConfig: ZoneConfig;
}

/**
 * Fetches what `first`..`last` shows, in parallel: events and Activities a
 * pairing window past each edge, the zone config (see `fetchZoneConfig`), and
 * the Notes from their own call reaching back `NOTE_LOOK_BACK_DAYS`. Any
 * request but the zone config failing fails the whole fetch.
 */
async function fetchCalendarRange(
  client: QueryClient,
  credentials: IntervalsCredentials,
  first: Date,
  last: Date,
  signal: AbortSignal,
): Promise<CalendarRangeData> {
  const { accessToken, athleteId } = credentials;
  const window = pairingWindow(first, last);
  const [events, activities, zoneConfig, noteEvents] = await Promise.all([
    getCalendarEvents(accessToken, athleteId, window, { signal }),
    getActivities(
      accessToken,
      athleteId,
      { ...window, fields: ACTIVITY_FIELDS },
      { signal },
    ),
    fetchZoneConfig(client, credentials),
    getCalendarEvents(
      accessToken,
      athleteId,
      { ...noteWindow(first, last), category: EVENT_CATEGORY.note },
      { signal },
    ),
  ]);

  return { events, activities, notes: toNotes(noteEvents), zoneConfig };
}

/**
 * Custom zone boundaries only sharpen the colours of a profile, and Coggan
 * stands in for them well enough. Losing them must never cost the athlete the
 * workouts themselves. A failed settings query isn't cached, so the next fetch
 * retries it.
 */
function fetchZoneConfig(
  client: QueryClient,
  credentials: IntervalsCredentials,
): Promise<ZoneConfig> {
  return client.fetchQuery(athleteSettingsQueryOptions(credentials)).then(
    ({ zoneConfig }) => zoneConfig,
    () => resolveZoneConfig(null),
  );
}
