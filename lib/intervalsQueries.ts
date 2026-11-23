import {
  type ActivityDetails,
  type StoredActivityDetails,
  toStoredActivityDetails,
} from './activityDetails';
import {
  type CalendarRange,
  type CalendarReads,
  type StoredCalendarItems,
  TILE_ACTIVITY_FIELDS,
  readCalendarRange,
  toStoredCalendarItems,
  withItemStatuses,
} from './calendarItems';
import { type CalendarData, type StoredMonth } from './calendarMonth';
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
  type YearMonth,
  addDays,
  endOfMonth,
  fromLocalDateString,
  fromYearMonth,
  toLocalDateString,
} from './localDate';
import { type Note, noteWindow, notesOverlapping, toNotes } from './notes';
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
import {
  type StoredUpcoming,
  type UpcomingItem,
  getUpcomingItems,
  upcomingRange,
} from './upcomingWorkouts';
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

export type UpcomingSelect = (stored: StoredUpcoming) => UpcomingItem[];

export function selectUpcomingAsOf(today: LocalDateString): UpcomingSelect {
  return stored => getUpcomingItems(stored, today);
}

export function upcomingQueryOptions(
  credentials: IntervalsCredentials | null,
  today: LocalDateString,
  select: UpcomingSelect,
) {
  return queryOptions({
    queryKey: intervalsKeys.upcoming(credentials?.athleteId, today),
    queryFn: credentials
      ? ({ signal, client }): Promise<StoredUpcoming> =>
          readStoredCalendarRange(
            credentials,
            upcomingRange(today),
            signal,
            client,
          )
      : skipToken,
    select,
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
      ? async ({ signal, client }): Promise<StoredMonth> => {
          const first = fromYearMonth(yearMonth);
          const range = {
            oldest: toLocalDateString(first),
            newest: toLocalDateString(endOfMonth(first)),
          };
          const stored = await readStoredCalendarRange(
            credentials,
            range,
            signal,
            client,
          );

          return {
            ...stored,
            notes: notesOverlapping(stored.notes, range.oldest, range.newest),
          };
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
  eventId: number,
  today: LocalDateString,
): WorkoutDetailsSelect {
  return stored => {
    const details = buildWorkoutDetails(stored, eventId, today);

    if (!details) {
      throw new IntervalsApiError(404, 'The event is not a Workout.');
    }

    return details;
  };
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
          const reads = intervalsCalendarReads(credentials, signal);
          const [paired, rideSettings] = await Promise.all([
            readCalendarRange(
              {
                ...reads,
                events: async (range, options) =>
                  appendIfUnlisted(
                    await reads.events(range, options),
                    eventRead,
                  ),
              },
              { oldest: day, newest: day },
              {
                activityFields: WORKOUT_DETAILS_ACTIVITY_FIELDS,
                eventOptions: {
                  category: EVENT_CATEGORY.workout,
                  resolve: true,
                },
              },
            ),
            rideSettingsPromise,
          ]);

          return { paired, rideSettings };
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

function intervalsCalendarReads(
  { accessToken, athleteId }: IntervalsCredentials,
  signal: AbortSignal,
): CalendarReads {
  return {
    events: (range, options) =>
      getCalendarEvents(
        accessToken,
        athleteId,
        { ...range, ...options },
        { signal },
      ),
    activities: (range, fields) =>
      getActivities(accessToken, athleteId, { ...range, fields }, { signal }),
  };
}

async function readStoredCalendarRange(
  credentials: IntervalsCredentials,
  range: CalendarRange,
  signal: AbortSignal,
  client: QueryClient,
): Promise<StoredCalendarItems & { notes: Note[] }> {
  const [paired, zoneConfig, notes] = await Promise.all([
    readCalendarRange(intervalsCalendarReads(credentials, signal), range, {
      activityFields: TILE_ACTIVITY_FIELDS,
    }),
    fetchZoneConfigOrCoggan(client, credentials),
    fetchNotes(credentials, range, signal),
  ]);

  return { ...toStoredCalendarItems(paired, range, zoneConfig), notes };
}

async function fetchNotes(
  { accessToken, athleteId }: IntervalsCredentials,
  range: CalendarRange,
  signal: AbortSignal,
): Promise<Note[]> {
  return toNotes(
    await getCalendarEvents(
      accessToken,
      athleteId,
      { ...noteWindow(range), category: EVENT_CATEGORY.note },
      { signal },
    ),
  );
}

function appendIfUnlisted(
  listed: IntervalsCalendarEvent[],
  singleRead: IntervalsCalendarEvent,
): IntervalsCalendarEvent[] {
  return listed.some(({ id }) => id === singleRead.id)
    ? listed
    : [...listed, singleRead];
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
