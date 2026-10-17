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
} from '@/lib/intervalsApi';
import { intervalsKeys, removeIntervalsQueries } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
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
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockUseToday = useToday as jest.Mock;
const mockGetCalendarEvent = getCalendarEvent as jest.Mock;
const mockGetActivities = getActivities as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;

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
  overrides: Partial<IntervalsActivity> = {},
): IntervalsActivity {
  return {
    id: 'i1',
    name: 'Morning ride',
    type: 'Ride',
    start_date_local: `${TODAY}T09:00:00`,
    moving_time: 3600,
    distance: 30_000,
    ...overrides,
  };
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

    it('never pairs an Activity without paired_event_id, such as a Strava stub', async () => {
      mockConnected();
      mockGetCalendarEvent.mockResolvedValue(
        event({ start_date_local: '2026-10-16T08:00:00' }),
      );
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
      const earliest = activity({
        id: 'early',
        start_date_local: '2026-10-17T07:00:00',
        paired_event_id: EVENT_ID,
      });

      mockGetActivities.mockResolvedValue([
        activity({
          id: 'late',
          start_date_local: '2026-10-17T19:00:00',
          paired_event_id: EVENT_ID,
        }),
        earliest,
        activity({
          id: 'middle',
          start_date_local: '2026-10-17T12:00:00',
          paired_event_id: EVENT_ID,
        }),
      ]);

      const { result, client } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data?.mode).toBe('completed'),
      );
      expect(
        client.getQueryData<{ activity: IntervalsActivity | null }>([
          'intervals',
          'athlete-1',
          'workout',
          EVENT_ID,
        ])?.activity,
      ).toEqual(earliest);
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

      const fields = (
        mockGetActivities.mock.calls[0][2].fields as string
      ).split(',');

      expect(fields).toEqual(
        expect.arrayContaining(['id', 'start_date_local', 'paired_event_id']),
      );
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

    it('colours the profile by Coggan zones when the athlete settings fail', async () => {
      mockConnected();
      mockGetAthleteSettings.mockRejectedValue(new IntervalsApiError(500));
      mockGetCalendarEvent.mockResolvedValue(
        event({
          workout_doc: {
            duration: 600,
            // 80% FTP sits in Coggan's zone 3 (75–90%).
            steps: [{ duration: 600, power: { units: '%ftp', value: 80 } }],
          },
        }),
      );

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.query.data?.blocks).toEqual([
        { widthFraction: 1, minPct: 80, maxPct: 80, zone: 3 },
      ]);
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
    async function metricsFor(activityOverrides: Partial<IntervalsActivity>) {
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
        average_heartrate: null as unknown as undefined,
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

      const fields = (
        mockGetActivities.mock.calls[0][2].fields as string
      ).split(',');

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
