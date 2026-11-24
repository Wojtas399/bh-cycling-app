import { useWorkoutDetails } from '../useWorkoutDetails';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { useToday } from '@/hooks/useToday';
import {
  type IntervalsActivity,
  IntervalsApiError,
  type IntervalsCalendarEvent,
  getActivities,
  getAthleteSettings,
  getCalendarEvent,
  getCalendarEvents,
  isNotFoundError,
} from '@/lib/intervalsApi';
import { intervalsKeys, removeIntervalsQueries } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { resolveRideSettings } from '@/lib/rideSettings';
import * as workoutDetails from '@/lib/workoutDetails';
import type { WorkoutStep } from '@/lib/workoutProfile';
import {
  type IntervalsJson,
  fromIntervalsJson,
} from '@/test-utils/intervalsJson';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/hooks/useToday', () => ({
  useToday: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getCalendarEvent: jest.fn(),
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = jest.mocked(useIntervalsConnection);
const mockUseToday = jest.mocked(useToday);
const mockGetCalendarEvent = jest.mocked(getCalendarEvent);
const mockGetCalendarEvents = jest.mocked(getCalendarEvents);
const mockGetActivities = jest.mocked(getActivities);
const mockGetAthleteSettings = jest.mocked(getAthleteSettings);

const EVENT_ID = 42;
const TODAY = '2026-10-17';

function mockConnection(
  overrides: Partial<ReturnType<typeof useIntervalsConnection>> = {},
) {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: false,
    athleteName: null,
    athleteId: null,
    accessToken: null,
    scope: null,
    loading: false,
    ...overrides,
  });
}

function mockConnected() {
  mockConnection({
    isConnected: true,
    accessToken: 'token-1',
    athleteId: 'athlete-1',
  });
}

function event(
  overrides: Partial<IntervalsCalendarEvent> = {},
): IntervalsCalendarEvent {
  return {
    id: EVENT_ID,
    category: 'WORKOUT',
    name: 'Sweet spot 3x10',
    start_date_local: `${TODAY}T08:00:00`,
    ...overrides,
  };
}

function activity(
  overrides: Partial<IntervalsJson<IntervalsActivity>> = {},
): IntervalsActivity {
  return fromIntervalsJson<IntervalsActivity>({
    id: 'i1',
    name: 'Morning ride',
    type: 'Ride',
    start_date_local: `${TODAY}T09:00:00`,
    moving_time: 3600,
    distance: 30_000,
    ...overrides,
  });
}

function renderDetails() {
  return renderHookWithClient(() => useWorkoutDetails(EVENT_ID));
}

describe('useWorkoutDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
    mockUseToday.mockReturnValue(TODAY);
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetActivities.mockResolvedValue([]);
    mockGetCalendarEvents.mockResolvedValue([]);
  });

  describe('availability gate', () => {
    it('is loading and fetches nothing while the connection resolves', async () => {
      mockConnection({ loading: true });

      const { result } = await renderDetails();

      expect(result.current.availability).toBe('loading');
      expect(result.current.query.isPending).toBe(true);
      expect(mockGetCalendarEvent).not.toHaveBeenCalled();
    });

    it('is unavailable and fetches nothing when not connected', async () => {
      mockConnection();

      const { result } = await renderDetails();

      expect(result.current.availability).toBe('unavailable');
      expect(mockGetCalendarEvent).not.toHaveBeenCalled();
      expect(mockGetActivities).not.toHaveBeenCalled();
      expect(mockGetAthleteSettings).not.toHaveBeenCalled();
    });

    it('is unavailable and fetches nothing while a reconnect is needed', async () => {
      mockConnected();
      setNeedsReconnect(true);

      const { result } = await renderDetails();

      expect(result.current.availability).toBe('unavailable');
      expect(mockGetCalendarEvent).not.toHaveBeenCalled();
    });
  });

  describe('Workout Status and mode', () => {
    it('is a planned Workout in planned mode when it is in the future and unpaired', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ start_date_local: '2026-10-18T08:00:00' }),
      );

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'planned',
          status: 'planned',
          title: 'Sweet spot 3x10',
          date: '2026-10-18',
        }),
      );
    });

    it('is a missed Workout in planned mode when its day has passed unpaired', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ start_date_local: '2026-10-16T08:00:00' }),
      );

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'planned',
          status: 'missed',
        }),
      );
    });

    it('turns planned into missed when today moves on, without a new request', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result, rerender } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data?.status).toBe('planned'),
      );

      mockUseToday.mockReturnValue('2026-10-18');
      await rerender({});

      await waitFor(() =>
        expect(result.current.query.data?.status).toBe('missed'),
      );
      expect(mockGetCalendarEvent).toHaveBeenCalledTimes(1);
      expect(mockGetActivities).toHaveBeenCalledTimes(1);
    });

    it('is completed when an Activity is paired to the Workout', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());
      mockGetActivities.mockResolvedValue([
        activity({ paired_event_id: EVENT_ID }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          status: 'completed',
        }),
      );
    });

    it('is completed by an Activity ridden on a different day', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ start_date_local: '2026-10-14T08:00:00' }),
      );
      mockGetActivities.mockResolvedValue([
        activity({
          start_date_local: '2026-10-15T18:00:00',
          paired_event_id: EVENT_ID,
        }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data?.status).toBe('completed'),
      );
    });

    it("opens a Workout ridden on a different day with that Activity's numbers", async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ start_date_local: '2026-10-14T08:00:00' }),
      );
      mockGetActivities.mockResolvedValue([
        activity({
          start_date_local: '2026-10-17T18:00:00',
          paired_event_id: EVENT_ID,
          icu_training_load: 55,
        }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          date: '2026-10-14',
          recordedActivityId: 'i1',
          activityMetrics: expect.arrayContaining([
            { metric: 'load', value: 55 },
          ]),
        }),
      );
    });

    it('is completed by a Strava Activity the event names, read from the events list since the single read lacks the paired Activity id', async () => {
      mockConnected();
      const planned = event({ start_date_local: '2026-10-16T00:00:00' });

      mockGetCalendarEvent.mockResolvedValue(planned);
      mockGetCalendarEvents.mockResolvedValue([
        event({ id: 7, start_date_local: '2026-10-16T00:00:00' }),
        { ...planned, paired_activity_id: '20664018356' },
      ]);
      mockGetActivities.mockResolvedValue([
        {
          id: '20664018356',
          start_date_local: '2026-10-16T15:05:00',
          moving_time: 0,
          distance: 0,
        },
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          status: 'completed',
          comparison: null,
          activityMetrics: null,
          route: null,
        }),
      );
    });

    it('is completed when the Activity the event names is outside the fetched range', async () => {
      mockConnected();
      const planned = event({ start_date_local: '2026-10-16T00:00:00' });

      mockGetCalendarEvent.mockResolvedValue(planned);
      mockGetCalendarEvents.mockResolvedValue([
        { ...planned, paired_activity_id: 'i999' },
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          status: 'completed',
          date: '2026-10-16',
          comparison: null,
          activityMetrics: null,
          route: null,
        }),
      );
    });

    it('keeps a native pairing recorded on both sides as before', async () => {
      mockConnected();
      const planned = event();

      mockGetCalendarEvent.mockResolvedValue(planned);
      mockGetCalendarEvents.mockResolvedValue([
        { ...planned, paired_activity_id: 'i1' },
      ]);
      mockGetActivities.mockResolvedValue([
        activity({
          paired_event_id: EVENT_ID,
          icu_training_load: 60,
          stream_types: ['latlng'],
        }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          status: 'completed',
          comparison: expect.objectContaining({ rows: expect.any(Array) }),
          activityMetrics: expect.arrayContaining([
            expect.objectContaining({ metric: 'load', value: 60 }),
          ]),
          route: expect.objectContaining({ activityId: 'i1' }),
        }),
      );
    });

    it('never pairs an Activity that neither names the event nor is named by it', async () => {
      mockConnected();
      const planned = event({ start_date_local: '2026-10-16T08:00:00' });

      mockGetCalendarEvent.mockResolvedValue(planned);
      mockGetCalendarEvents.mockResolvedValue([planned]);
      mockGetActivities.mockResolvedValue([
        activity({ start_date_local: '2026-10-16T09:00:00' }),
        activity({ id: 'i2', paired_event_id: 7 }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data?.status).toBe('missed'),
      );
    });

    it('keeps the earliest Activity when several are paired to the Workout', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());
      mockGetActivities.mockResolvedValue([
        activity({
          id: 'late',
          start_date_local: '2026-10-17T19:00:00',
          paired_event_id: EVENT_ID,
        }),
        activity({
          id: 'early',
          start_date_local: '2026-10-17T07:00:00',
          paired_event_id: EVENT_ID,
        }),
        activity({
          id: 'middle',
          start_date_local: '2026-10-17T12:00:00',
          paired_event_id: EVENT_ID,
        }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          recordedActivityId: 'early',
        }),
      );
    });
  });

  describe('requests', () => {
    it("lists activities a pairing window around the Workout's local date, with the pairing fields", async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ start_date_local: '2026-11-02T08:00:00' }),
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(mockGetCalendarEvent).toHaveBeenCalledWith(
        'token-1',
        'athlete-1',
        EVENT_ID,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(mockGetActivities).toHaveBeenCalledWith(
        'token-1',
        'athlete-1',
        expect.objectContaining({ oldest: '2026-10-26', newest: '2026-11-09' }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );

      const fields = mockGetActivities.mock.calls[0][2]?.fields;

      expect(fields).toEqual(
        expect.arrayContaining(['id', 'start_date_local', 'paired_event_id']),
      );
    });
  });

  describe('events list', () => {
    it("reads the Workouts listed a week past each side of the event's local day, step watts resolved", async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ start_date_local: '2026-11-02T08:00:00' }),
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(mockGetCalendarEvents).toHaveBeenCalledWith(
        'token-1',
        'athlete-1',
        {
          oldest: '2026-10-26',
          newest: '2026-11-09',
          category: 'WORKOUT',
          resolve: true,
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('falls back to the single read when the list lacks the event', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event({ name: 'Single read' }));
      mockGetCalendarEvents.mockResolvedValue([
        event({ id: 7, name: 'Another Workout' }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data?.title).toBe('Single read'),
      );
    });

    it('fails when the events list fails', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());
      mockGetCalendarEvents.mockRejectedValue(new IntervalsApiError(500));

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isError).toBe(true));
    });
  });

  describe('failures', () => {
    it('fails rather than falling back to planned mode when the activities fetch fails', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());
      mockGetActivities.mockRejectedValue(new IntervalsApiError(500));

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isError).toBe(true));
      expect(result.current.query.data).toBeUndefined();
    });

    it('surfaces an event that is not a Workout as not found', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ category: 'NOTE', name: 'Obóz' }),
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isError).toBe(true));
      expect(result.current.query.data).toBeUndefined();
      expect(isNotFoundError(result.current.query.error)).toBe(true);
    });

    it('surfaces a deleted Workout as an API error with status 404', async () => {
      mockConnected();
      mockGetCalendarEvent.mockRejectedValue(new IntervalsApiError(404));

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isError).toBe(true));
      expect(result.current.query.error).toBeInstanceOf(IntervalsApiError);
      expect(result.current.query.error).toMatchObject({ status: 404 });
      expect(mockGetCalendarEvent).toHaveBeenCalledTimes(1);
      expect(mockGetActivities).not.toHaveBeenCalled();
    });

    it('colours the profile by Coggan zones when the athlete settings fail, drawing its card in %FTP without waiting on them', async () => {
      mockConnected();
      mockGetAthleteSettings.mockRejectedValue(new IntervalsApiError(500));
      mockGetCalendarEvent.mockResolvedValue(
        event({
          workout_doc: {
            duration: 600,
            steps: [{ duration: 600, power: { units: '%ftp', value: 80 } }],
          },
        }),
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.query.data?.blocks).toEqual([
        { widthFraction: 1, minPct: 80, maxPct: 80, zone: 3 },
      ]);
      expect(result.current.query.data?.rideSettings).toEqual(
        resolveRideSettings(null),
      );
    });
  });

  describe('profile', () => {
    it('summarises the profile with its duration, step count and peak %FTP', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({
          workout_doc: {
            duration: 4500,
            steps: [
              { duration: 900, power: { units: '%ftp', start: 50, end: 75 } },
              { duration: 600, power: { units: '%ftp', value: 120 } },
              { duration: 300, power: { units: '%ftp', value: 55 } },
              { duration: 600, power: { units: '%ftp', value: 120 } },
              { duration: 2100, power: { units: '%ftp', value: 65 } },
            ],
          },
        }),
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.query.data?.blocks).toHaveLength(5);
      expect(result.current.query.data?.profileSummary).toEqual({
        durationSeconds: 4500,
        stepCount: 5,
        peakFtpPct: 120,
      });
    });

    it("carries the athlete's Ride settings it's coloured by, current FTP included, for its profile card", async () => {
      mockConnected();
      mockGetAthleteSettings.mockResolvedValue({
        ftp: 265,
        powerZones: [60, 80, 90, 105, 120, 150, 999],
      });
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.query.data?.rideSettings).toEqual(
        resolveRideSettings({
          ftp: 265,
          powerZones: [60, 80, 90, 105, 120, 150, 999],
        }),
      );
    });

    it('has no profile summary when there is no profile to draw', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ workout_doc: { duration: 3600, steps: [] } }),
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.query.data?.blocks).toEqual([]);
      expect(result.current.query.data?.profileSummary).toBeNull();
    });
  });

  describe('Strava Activity', () => {
    it('carries the id, local start time and Strava page of the Strava Activity the event names', async () => {
      mockConnected();
      const planned = event({ start_date_local: '2026-10-16T00:00:00' });

      mockGetCalendarEvent.mockResolvedValue(planned);
      mockGetCalendarEvents.mockResolvedValue([
        { ...planned, paired_activity_id: '20664018356' },
      ]);
      mockGetActivities.mockResolvedValue([
        {
          id: '20664018356',
          start_date_local: '2026-10-16T15:05:00',
          moving_time: 0,
          distance: 0,
        },
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          stravaActivity: {
            id: '20664018356',
            startTime: '15:05',
            url: 'https://www.strava.com/activities/20664018356',
          },
        }),
      );
    });

    it('is null for a Workout paired to a native Activity', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());
      mockGetActivities.mockResolvedValue([
        activity({ paired_event_id: EVENT_ID }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          stravaActivity: null,
        }),
      );
    });

    it('is null when the Activity the event names is outside the fetched range', async () => {
      mockConnected();
      const planned = event({ start_date_local: '2026-10-16T00:00:00' });

      mockGetCalendarEvent.mockResolvedValue(planned);
      mockGetCalendarEvents.mockResolvedValue([
        { ...planned, paired_activity_id: '20664018356' },
      ]);

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'completed',
          stravaActivity: null,
        }),
      );
    });

    it('is null in planned mode', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          mode: 'planned',
          stravaActivity: null,
        }),
      );
    });

    it('requests the name and type that tell a Strava Activity apart', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      const fields = mockGetActivities.mock.calls[0][2]?.fields;

      expect(fields).toEqual(expect.arrayContaining(['name', 'type']));
    });
  });

  describe('completed mode: comparison', () => {
    async function comparisonFor(
      eventOverrides: Partial<IntervalsCalendarEvent>,
      activityOverrides: Partial<IntervalsActivity>,
    ) {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event(eventOverrides));
      mockGetActivities.mockResolvedValue([
        activity({ paired_event_id: EVENT_ID, ...activityOverrides }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      return result.current.query.data?.comparison;
    }

    it('compares duration, load, intensity and work with signed differences', async () => {
      const comparison = await comparisonFor(
        {
          moving_time: 3600,
          icu_training_load: 80,
          icu_intensity: 85,
          joules: 900_000,
        },
        {
          moving_time: 3300,
          icu_training_load: 92,
          icu_intensity: 85,
          icu_joules: 950_000,
        },
      );

      expect(comparison?.rows).toEqual([
        { metric: 'duration', planned: 3600, actual: 3300, difference: -300 },
        { metric: 'load', planned: 80, actual: 92, difference: 12 },
        { metric: 'intensity', planned: 85, actual: 85, difference: 0 },
        { metric: 'work', planned: 900, actual: 950, difference: 50 },
      ]);
    });

    it('keeps only the metrics present on both sides', async () => {
      const comparison = await comparisonFor(
        { moving_time: 3600, icu_training_load: 80, joules: 900_000 },
        { moving_time: 3700, icu_intensity: 88, icu_joules: 950_000 },
      );

      expect(comparison?.rows.map(row => row.metric)).toEqual([
        'duration',
        'work',
      ]);
    });

    it("falls back to the workout doc's duration for the planned time", async () => {
      const comparison = await comparisonFor(
        { workout_doc: { duration: 4000 } },
        { moving_time: 4200 },
      );

      expect(comparison?.rows).toEqual([
        { metric: 'duration', planned: 4000, actual: 4200, difference: 200 },
      ]);
    });

    it('carries the compliance when it is a non-negative number', async () => {
      const comparison = await comparisonFor({}, { compliance: 0 });

      expect(comparison?.compliance).toBe(0);
    });

    it.each([
      ['missing', undefined],
      ['null', null],
      ['negative (ignored)', -1],
    ])('hides the compliance when it is %s', async (_, compliance) => {
      const comparison = await comparisonFor({}, { compliance });

      expect(comparison?.compliance).toBeNull();
    });

    it('is absent in planned mode', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event({ moving_time: 3600 }));

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.query.data?.comparison).toBeNull();
    });
  });

  describe('completed mode: activity metrics', () => {
    async function metricsFor(
      activityOverrides: Partial<IntervalsJson<IntervalsActivity>>,
    ) {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());
      mockGetActivities.mockResolvedValue([
        activity({ paired_event_id: EVENT_ID, ...activityOverrides }),
      ]);

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      return result.current.query.data?.activityMetrics;
    }

    it('lists every summary metric the Activity has, in display order', async () => {
      const metrics = await metricsFor({
        moving_time: 3500,
        distance: 32_000,
        icu_training_load: 75,
        icu_intensity: 82,
        icu_average_watts: 190,
        icu_weighted_avg_watts: 205,
        average_heartrate: 142,
        max_heartrate: 171,
        average_cadence: 88,
        total_elevation_gain: 340,
        calories: 820,
        average_speed: 9.1,
        elapsed_time: 3900,
        icu_variability_index: 1.08,
      });

      expect(metrics).toEqual([
        { metric: 'movingTime', value: 3500 },
        { metric: 'distance', value: 32_000 },
        { metric: 'load', value: 75 },
        { metric: 'intensity', value: 82 },
        { metric: 'averagePower', value: 190 },
        { metric: 'normalizedPower', value: 205 },
        { metric: 'averageHeartRate', value: 142 },
        { metric: 'maxHeartRate', value: 171 },
        { metric: 'cadence', value: 88 },
        { metric: 'elevationGain', value: 340 },
        { metric: 'calories', value: 820 },
        { metric: 'averageSpeed', value: 9.1 },
        { metric: 'elapsedTime', value: 3900 },
        { metric: 'variabilityIndex', value: 1.08 },
      ]);
    });

    it('drops the metrics the Activity lacks, such as heart rate without a strap', async () => {
      const metrics = await metricsFor({
        moving_time: 3500,
        distance: 32_000,
        icu_average_watts: 190,
        average_heartrate: null,
      });

      expect(metrics).toEqual([
        { metric: 'movingTime', value: 3500 },
        { metric: 'distance', value: 32_000 },
        { metric: 'averagePower', value: 190 },
      ]);
    });

    it('is absent in planned mode', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.query.data?.activityMetrics).toBeNull();
    });

    it('requests the summary metrics with the activities', async () => {
      await metricsFor({});

      const fields = mockGetActivities.mock.calls[0][2]?.fields;

      expect(fields).toEqual(
        expect.arrayContaining([
          'moving_time',
          'distance',
          'elapsed_time',
          'icu_training_load',
          'icu_intensity',
          'icu_average_watts',
          'icu_weighted_avg_watts',
          'icu_variability_index',
          'average_heartrate',
          'max_heartrate',
          'average_cadence',
          'total_elevation_gain',
          'calories',
          'icu_joules',
          'average_speed',
          'compliance',
        ]),
      );
    });
  });

  describe('plan metrics', () => {
    async function planMetricsFor(overrides: Partial<IntervalsCalendarEvent>) {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event(overrides));

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      return result.current.query.data?.planMetrics;
    }

    it('has every metric intervals.icu supplies, in its own units', async () => {
      const planMetrics = await planMetricsFor({
        moving_time: 4500,
        icu_training_load: 82,
        icu_intensity: 86.05,
        joules: 1_150_000,
        distance: 42_500,
        workout_doc: { duration: 4400, steps: [] },
      });

      expect(planMetrics).toEqual({
        durationSeconds: 4500,
        load: 82,
        intensityPct: 86.05,
        workKj: 1150,
        distanceMeters: 42_500,
      });
    });

    it('falls back to the workout doc duration when the event has no moving time', async () => {
      const planMetrics = await planMetricsFor({
        workout_doc: { duration: 3600, steps: [] },
      });

      expect(planMetrics?.durationSeconds).toBe(3600);
    });

    it('leaves out a zero planned distance, as on a time-based ride', async () => {
      const planMetrics = await planMetricsFor({
        moving_time: 3600,
        distance: 0,
      });

      expect(planMetrics).toStrictEqual({ durationSeconds: 3600 });
    });

    it('falls back to the workout doc distance when the event has none', async () => {
      const planMetrics = await planMetricsFor({
        workout_doc: { distance: 5000, steps: [] },
      });

      expect(planMetrics?.distanceMeters).toBe(5000);
    });

    it('leaves out every metric intervals.icu does not supply', async () => {
      const planMetrics = await planMetricsFor({});

      expect(planMetrics).toStrictEqual({});
    });
  });

  describe('route summary', () => {
    const OUTDOOR_STREAMS = ['time', 'watts', 'latlng'];

    async function routeFor(
      paired: Partial<IntervalsActivity> | null,
      overrides: Partial<IntervalsCalendarEvent> = {},
    ) {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event(overrides));
      mockGetActivities.mockResolvedValue(
        paired ? [activity({ paired_event_id: EVENT_ID, ...paired })] : [],
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      return result.current.query.data?.route;
    }

    it('carries the Activity id and distance for an outdoor GPS ride', async () => {
      expect(
        await routeFor({
          id: 'i77',
          distance: 42_300,
          stream_types: OUTDOOR_STREAMS,
        }),
      ).toEqual(
        expect.objectContaining({ activityId: 'i77', distanceMeters: 42_300 }),
      );
    });

    it('leaves out a distance that is not a finite number', async () => {
      expect(
        await routeFor({
          id: 'i77',
          distance: Number.NaN,
          stream_types: OUTDOOR_STREAMS,
        }),
      ).not.toHaveProperty('distanceMeters');
    });

    it('carries the start time and finishes start + elapsed time later', async () => {
      expect(
        await routeFor({
          stream_types: OUTDOOR_STREAMS,
          start_date_local: `${TODAY}T07:05:00`,
          elapsed_time: 5700,
        }),
      ).toEqual(
        expect.objectContaining({
          startLocal: `${TODAY}T07:05:00`,
          finishLocal: `${TODAY}T08:40:00`,
        }),
      );
    });

    it('finishes on the next day when the ride crosses midnight', async () => {
      expect(
        await routeFor({
          stream_types: OUTDOOR_STREAMS,
          start_date_local: `${TODAY}T23:30:00`,
          elapsed_time: 3600,
        }),
      ).toEqual(
        expect.objectContaining({ finishLocal: '2026-10-18T00:30:00' }),
      );
    });

    it('has no finish time without a finite elapsed time', async () => {
      const route = await routeFor({
        stream_types: OUTDOOR_STREAMS,
        start_date_local: `${TODAY}T07:05:00`,
        elapsed_time: undefined,
      });

      expect(route).toEqual(
        expect.objectContaining({ startLocal: `${TODAY}T07:05:00` }),
      );
      expect(route).not.toHaveProperty('finishLocal');
    });

    it('is null for a trainer ride', async () => {
      expect(
        await routeFor({ stream_types: OUTDOOR_STREAMS, trainer: true }),
      ).toBeNull();
    });

    it('is null for a VirtualRide', async () => {
      expect(
        await routeFor({ stream_types: OUTDOOR_STREAMS, type: 'VirtualRide' }),
      ).toBeNull();
    });

    it('is null when the Activity has no stream types', async () => {
      expect(await routeFor({ stream_types: undefined })).toBeNull();
    });

    it('is null in planned mode', async () => {
      expect(
        await routeFor(null, { start_date_local: '2026-10-18T08:00:00' }),
      ).toBeNull();
    });

    it('requests the stream types and trainer flag with the activities', async () => {
      await routeFor(null);

      const fields = mockGetActivities.mock.calls[0][2]?.fields;

      expect(fields).toEqual(
        expect.arrayContaining(['stream_types', 'trainer']),
      );
    });
  });

  describe('description', () => {
    async function descriptionFor(overrides: Partial<IntervalsCalendarEvent>) {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event(overrides));

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      return result.current.query.data;
    }

    it("is the workout doc's free text, trimmed, without the builder's step lines", async () => {
      const details = await descriptionFor({
        description: 'Stay seated.\n\nMain set 3x\n- 10m 90%',
        workout_doc: { description: '  Stay seated.\n', steps: [] },
      });

      expect(details?.description).toBe('Stay seated.');
    });

    it('is absent when the notes are blank', async () => {
      const details = await descriptionFor({
        workout_doc: { description: ' \n ', steps: [] },
      });

      expect(details).not.toHaveProperty('description');
    });

    it('is absent when there are no notes, even if the event has step lines', async () => {
      const details = await descriptionFor({
        description: '- 10m 90%',
        workout_doc: { steps: [] },
      });

      expect(details).not.toHaveProperty('description');
    });

    it('is there for a completed Workout too', async () => {
      mockGetActivities.mockResolvedValue([
        activity({ paired_event_id: EVENT_ID }),
      ]);

      const details = await descriptionFor({
        workout_doc: { description: 'Stay seated.', steps: [] },
      });

      expect(details).toMatchObject({
        mode: 'completed',
        description: 'Stay seated.',
      });
    });
  });

  describe('Kroki steps', () => {
    async function stepsOf(steps: WorkoutStep[] | undefined) {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ workout_doc: { duration: 3600, steps } }),
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      return result.current.query.data?.steps;
    }

    it('lists a %FTP step with its label, duration, zone and target, 80% FTP sitting in Coggan zone 3', async () => {
      const steps = await stepsOf([
        { text: 'Tempo', duration: 600, power: { units: '%ftp', value: 80 } },
      ]);

      expect(steps).toEqual([
        {
          key: '0',
          type: 'step',
          text: 'Tempo',
          durationSeconds: 600,
          zone: 3,
          ftpPct: { start: 80, end: 80 },
          ramp: false,
        },
      ]);
    });

    it("resolves a power-zone target to that zone's %FTP band, 55–75% for Coggan zone 2", async () => {
      const steps = await stepsOf([
        { duration: 1200, power: { units: 'power_zone', value: 2 } },
      ]);

      expect(steps?.[0]).toMatchObject({
        zone: 2,
        ftpPct: { start: 55, end: 75 },
      });
    });

    it("uses the athlete's own zones for a power-zone target", async () => {
      mockGetAthleteSettings.mockResolvedValue({
        powerZones: [50, 70, 85, 100, 115, 140, 999],
      });
      const steps = await stepsOf([
        { duration: 1200, power: { units: 'power_zone', value: 4 } },
      ]);

      expect(steps?.[0]).toMatchObject({
        zone: 4,
        ftpPct: { start: 85, end: 100 },
      });
    });

    it('reads a ramp as start–end, in the order it is ridden, coloured by the zone of its middle', async () => {
      const steps = await stepsOf([
        {
          duration: 600,
          ramp: true,
          power: { units: '%ftp', start: 75, end: 45 },
        },
      ]);

      expect(steps?.[0]).toMatchObject({
        zone: 2,
        ftpPct: { start: 75, end: 45 },
        ramp: true,
      });
    });

    it('reads a %FTP range as start–end, coloured by the zone of its middle', async () => {
      const steps = await stepsOf([
        { duration: 600, power: { units: '%ftp', start: 88, end: 94 } },
      ]);

      expect(steps?.[0]).toMatchObject({
        zone: 4,
        ftpPct: { start: 88, end: 94 },
        ramp: false,
      });
    });

    it('carries resolved watts and the cadence target when present', async () => {
      const steps = await stepsOf([
        {
          duration: 300,
          power: { units: '%ftp', value: 105 },
          _power: { value: 263 },
          cadence: { units: 'rpm', start: 90, end: 100 },
        },
        {
          duration: 300,
          power: { units: 'power_zone', value: 2 },
          _power: { start: 162, end: 217 },
          cadence: { units: 'rpm', value: 85 },
        },
      ]);

      expect(steps?.[0]).toMatchObject({
        watts: { start: 263, end: 263 },
        cadenceRpm: { start: 90, end: 100 },
      });
      expect(steps?.[1]).toMatchObject({
        watts: { start: 162, end: 217 },
        cadenceRpm: { start: 85, end: 85 },
      });
    });

    it('marks warm-up and cool-down steps so they can be labelled without a text', async () => {
      const steps = await stepsOf([
        { warmup: true, duration: 600 },
        { text: 'Easy spin', cooldown: true, duration: 300 },
      ]);

      expect(steps).toEqual([
        {
          key: '0',
          type: 'step',
          role: 'warmup',
          durationSeconds: 600,
          ramp: false,
        },
        {
          key: '1',
          type: 'step',
          role: 'cooldown',
          text: 'Easy spin',
          durationSeconds: 300,
          ramp: false,
        },
      ]);
    });

    it('keeps a repeat nested, with its reps, total duration and children in order', async () => {
      const steps = await stepsOf([
        { warmup: true, duration: 600 },
        {
          text: '6x',
          reps: 6,
          duration: 1800,
          steps: [
            { text: 'On', duration: 180, power: { units: '%ftp', value: 110 } },
            { text: 'Off', duration: 120, power: { units: '%ftp', value: 50 } },
          ],
        },
        { cooldown: true, duration: 300 },
      ]);

      expect(steps).toHaveLength(3);
      expect(steps?.[1]).toEqual({
        key: '1',
        type: 'repeat',
        reps: 6,
        durationSeconds: 1800,
        steps: [
          {
            key: '1.0',
            type: 'step',
            text: 'On',
            durationSeconds: 180,
            zone: 5,
            ftpPct: { start: 110, end: 110 },
            ramp: false,
          },
          {
            key: '1.1',
            type: 'step',
            text: 'Off',
            durationSeconds: 120,
            zone: 1,
            ftpPct: { start: 50, end: 50 },
            ramp: false,
          },
        ],
      });
    });

    it('keeps a repeat inside a repeat nested too', async () => {
      const steps = await stepsOf([
        {
          reps: 2,
          duration: 1200,
          steps: [
            {
              reps: 3,
              duration: 540,
              steps: [{ duration: 180, power: { units: '%ftp', value: 120 } }],
            },
            { duration: 60, power: { units: '%ftp', value: 50 } },
          ],
        },
      ]);

      expect(steps?.[0]).toMatchObject({
        type: 'repeat',
        reps: 2,
        steps: [
          {
            type: 'repeat',
            reps: 3,
            durationSeconds: 540,
            steps: [{ type: 'step', durationSeconds: 180 }],
          },
          { type: 'step', durationSeconds: 60 },
        ],
      });
    });

    it('keys every step by its position in the doc, unique across the tree', async () => {
      const steps = await stepsOf([
        { warmup: true, duration: 600 },
        {
          reps: 2,
          steps: [{ reps: 3, steps: [{ duration: 180 }] }, { duration: 60 }],
        },
      ]);

      expect(steps?.[0]).toMatchObject({ key: '0' });
      expect(steps?.[1]).toMatchObject({
        key: '1',
        steps: [{ key: '1.0', steps: [{ key: '1.0.0' }] }, { key: '1.1' }],
      });
    });

    it("totals a repeat's duration from its reps when the doc gives none", async () => {
      const steps = await stepsOf([
        {
          reps: 4,
          steps: [{ duration: 240 }, { duration: 60 }],
        },
      ]);

      expect(steps?.[0]).toMatchObject({
        type: 'repeat',
        reps: 4,
        durationSeconds: 1200,
      });
    });

    it('has no steps when the Workout has none', async () => {
      expect(await stepsOf([])).toEqual([]);
      expect(await stepsOf(undefined)).toEqual([]);
    });

    it('leaves out watts, cadence and the target when the step has none', async () => {
      const steps = await stepsOf([{ text: 'Free ride', duration: 900 }]);

      expect(steps).toEqual([
        {
          key: '0',
          type: 'step',
          text: 'Free ride',
          durationSeconds: 900,
          ramp: false,
        },
      ]);
    });
  });

  describe('cache', () => {
    const workoutKey = ['intervals', 'athlete-1', 'workout', EVENT_ID];

    it('is refetched when everything for the athlete is invalidated', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result, client } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      await act(() =>
        client.invalidateQueries({
          queryKey: intervalsKeys.athlete('athlete-1'),
        }),
      );

      expect(mockGetCalendarEvent).toHaveBeenCalledTimes(2);
    });

    it("is dropped with the rest of the ['intervals'] prefix", async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result, client } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(client.getQueryData(workoutKey)).toBeDefined();

      await act(() => removeIntervalsQueries(client));

      expect(client.getQueryData(workoutKey)).toBeUndefined();
    });

    it('does not build the view model again while today stays the same', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());
      const build = jest.spyOn(workoutDetails, 'buildWorkoutDetails');

      const { result, rerender } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      const builds = build.mock.calls.length;

      await rerender(undefined);

      expect(build).toHaveBeenCalledTimes(builds);
      build.mockRestore();
    });

    it('keeps the same refetch across renders', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result, rerender } = await renderDetails();
      const first = result.current.refetch;

      await rerender(undefined);

      expect(result.current.refetch).toBe(first);
    });

    it('refetches only this query on refetch', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(event());

      const { result, client } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      const otherKey = intervalsKeys.upcoming('athlete-1', TODAY);

      client.setQueryData(otherKey, []);
      const before = client.getQueryState(otherKey)?.dataUpdatedAt;

      await act(() => result.current.refetch());

      expect(mockGetCalendarEvent).toHaveBeenCalledTimes(2);
      expect(client.getQueryState(otherKey)?.dataUpdatedAt).toBe(before);
    });
  });
});
