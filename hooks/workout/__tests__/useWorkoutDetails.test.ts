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
        workJoules: 1_150_000,
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
