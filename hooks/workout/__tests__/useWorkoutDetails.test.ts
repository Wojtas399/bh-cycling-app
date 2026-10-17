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
import type { WorkoutStep } from '@/lib/workoutProfile';
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

    it('lists a %FTP step with its label, duration, zone and target', async () => {
      const steps = await stepsOf([
        // 80% FTP sits in Coggan's zone 3 (75–90%).
        { text: 'Tempo', duration: 600, power: { units: '%ftp', value: 80 } },
      ]);

      expect(steps).toEqual([
        {
          type: 'step',
          text: 'Tempo',
          durationSeconds: 600,
          zone: 3,
          ftpPct: { start: 80, end: 80 },
          ramp: false,
        },
      ]);
    });

    it("resolves a power-zone target to that zone's %FTP band", async () => {
      const steps = await stepsOf([
        { duration: 1200, power: { units: 'power_zone', value: 2 } },
      ]);

      // Coggan's zone 2 runs from 55% to 75% FTP.
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

    it('reads a ramp as start–end, in the order it is ridden', async () => {
      const steps = await stepsOf([
        {
          duration: 600,
          ramp: true,
          power: { units: '%ftp', start: 75, end: 45 },
        },
      ]);

      // Coloured by its middle, 60% FTP: Coggan's zone 2.
      expect(steps?.[0]).toMatchObject({
        zone: 2,
        ftpPct: { start: 75, end: 45 },
        ramp: true,
      });
    });

    it('reads a %FTP range as start–end', async () => {
      const steps = await stepsOf([
        { duration: 600, power: { units: '%ftp', start: 88, end: 94 } },
      ]);

      // Coloured by its middle, 91% FTP: Coggan's zone 4 (90–105%).
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
        { type: 'step', role: 'warmup', durationSeconds: 600, ramp: false },
        {
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
        type: 'repeat',
        reps: 6,
        durationSeconds: 1800,
        steps: [
          {
            type: 'step',
            text: 'On',
            durationSeconds: 180,
            zone: 5,
            ftpPct: { start: 110, end: 110 },
            ramp: false,
          },
          {
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
