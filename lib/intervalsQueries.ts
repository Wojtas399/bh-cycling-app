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
  IntervalsApiError,
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
import type { ZoneConfig } from './powerZones';
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

export interface IntervalsCredentials {
  accessToken: string;
  athleteId: string;
}

export const intervalsKeys = {
  all: ['intervals'] as const,
  athlete: (athleteId: string | undefined) =>
    [...intervalsKeys.all, athleteId] as const,
  athleteSettings: (athleteId: string | undefined) =>
    [...intervalsKeys.athlete(athleteId), 'athleteSettings'] as const,
  upcoming: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'upcoming', today] as const,
  nextRace: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'nextRace', today] as const,
  wellness: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'wellness', today] as const,
  fitness: (athleteId: string | undefined, today: LocalDateString) =>
    [...intervalsKeys.athlete(athleteId), 'fitness', today] as const,
  calendar: (athleteId: string | undefined) =>
    [...intervalsKeys.athlete(athleteId), 'calendar'] as const,
  month: (athleteId: string | undefined, yearMonth: YearMonth) =>
    [...intervalsKeys.calendar(athleteId), 'month', yearMonth] as const,
  workout: (athleteId: string | undefined, eventId: number) =>
    [...intervalsKeys.athlete(athleteId), 'workout', eventId] as const,
  note: (athleteId: string | undefined, eventId: number) =>
    [...intervalsKeys.athlete(athleteId), 'note', eventId] as const,
  race: (athleteId: string | undefined, eventId: number | null) =>
    [...intervalsKeys.athlete(athleteId), 'race', eventId] as const,
  activity: (athleteId: string | undefined, activityId: string | null) =>
    [...intervalsKeys.athlete(athleteId), 'activity', activityId] as const,
  route: (athleteId: string | undefined, activityId: string | null) =>
    [...intervalsKeys.athlete(athleteId), 'route', activityId] as const,
};

export async function removeIntervalsQueries(
  client: QueryClient,
): Promise<void> {
  await client.cancelQueries({ queryKey: intervalsKeys.all });
  client.removeQueries({ queryKey: intervalsKeys.all });
}

const CHANGING_DATA_FRESHNESS = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: true,
} as const;

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
    ...CHANGING_DATA_FRESHNESS,
  });
}

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
    ...CHANGING_DATA_FRESHNESS,
  });
}

export interface TodayEntry {
  fitness: FitnessValues | null;
  wellness: WellnessRow[];
}

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
    ...CHANGING_DATA_FRESHNESS,
  });
}

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
    ...CHANGING_DATA_FRESHNESS,
  });
}

export type MonthSelect = (month: StoredMonth) => CalendarData;

export function selectMonthAsOf(today: LocalDateString): MonthSelect {
  return month => ({
    itemsByDate: withItemStatuses(month, today),
    notes: month.notes,
  });
}

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
    ...CHANGING_DATA_FRESHNESS,
  });
}

export type WorkoutDetailsSelect = (
  stored: StoredWorkoutDetails,
) => WorkoutDetails;

export function selectWorkoutDetailsAsOf(
  today: LocalDateString,
): WorkoutDetailsSelect {
  return stored => buildWorkoutDetails(stored, today);
}

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
          const rideSettingsPromise = fetchRideSettingsOrCoggan(
            client,
            credentials,
          );
          const eventRead = await getCalendarEvent(
            accessToken,
            athleteId,
            eventId,
            { signal },
          );
          const day = eventRead.start_date_local.slice(0, 10);
          const date = fromLocalDateString(day);
          const [dayWorkouts, activities, rideSettings] = await Promise.all([
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
            rideSettingsPromise,
          ]);
          const event = listedCopyOrSingleRead(dayWorkouts, eventId, eventRead);

          return { event, ...pairWorkout(event, activities), rideSettings };
        }
      : skipToken,
    select,
    ...CHANGING_DATA_FRESHNESS,
  });
}

export function noteDetailsQueryOptions(
  credentials: IntervalsCredentials | null,
  eventId: number,
) {
  return queryOptions({
    queryKey: intervalsKeys.note(credentials?.athleteId, eventId),
    queryFn: credentials
      ? async ({ signal }): Promise<Note> => {
          const [note] = toNotes([
            await getCalendarEvent(
              credentials.accessToken,
              credentials.athleteId,
              eventId,
              { signal },
            ),
          ]);

          if (!note)
            throw new IntervalsApiError(404, 'The event is not a Note.');

          return note;
        }
      : skipToken,
    ...CHANGING_DATA_FRESHNESS,
  });
}

export type ActivityDetailsSelect = (
  stored: StoredActivityDetails,
) => ActivityDetails;

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
    ...CHANGING_DATA_FRESHNESS,
  });
}

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
    ...CHANGING_DATA_FRESHNESS,
  });
}

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

interface CalendarRangeData {
  events: IntervalsCalendarEvent[];
  activities: IntervalsActivity[];
  notes: Note[];
  zoneConfig: ZoneConfig;
}

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
    fetchZoneConfigOrCoggan(client, credentials),
    getCalendarEvents(
      accessToken,
      athleteId,
      { ...noteWindow(first, last), category: EVENT_CATEGORY.note },
      { signal },
    ),
  ]);

  return { events, activities, notes: toNotes(noteEvents), zoneConfig };
}

function listedCopyOrSingleRead(
  dayWorkouts: IntervalsCalendarEvent[],
  eventId: number,
  singleRead: IntervalsCalendarEvent,
): IntervalsCalendarEvent {
  return dayWorkouts.find(({ id }) => id === eventId) ?? singleRead;
}

function fetchZoneConfigOrCoggan(
  client: QueryClient,
  credentials: IntervalsCredentials,
): Promise<ZoneConfig> {
  return fetchRideSettingsOrCoggan(client, credentials).then(
    ({ zoneConfig }) => zoneConfig,
  );
}

function fetchRideSettingsOrCoggan(
  client: QueryClient,
  credentials: IntervalsCredentials,
): Promise<RideSettings> {
  return client
    .fetchQuery(athleteSettingsQueryOptions(credentials))
    .catch(() => resolveRideSettings(null));
}
