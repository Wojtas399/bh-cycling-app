import { useActivityDetails } from '../useActivityDetails';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  type IntervalsActivity,
  IntervalsApiError,
  getActivity,
} from '@/lib/intervalsApi';
import { intervalsKeys, removeIntervalsQueries } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getActivity: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockGetActivity = getActivity as jest.Mock;

const ACTIVITY_ID = 'i196064284';

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

/** An Activity as `GET /activity/{id}?intervals=true` returns it. */
function activity(
  overrides: Partial<IntervalsActivity> = {},
): IntervalsActivity {
  return {
    id: ACTIVITY_ID,
    name: 'Popołudniowa jazda',
    type: 'Ride',
    start_date_local: '2026-10-23T16:42:00',
    moving_time: 5520,
    distance: 48_200,
    ...overrides,
  };
}

/** The fields set to `null`, as intervals.icu sends a value it doesn't have. */
function nulls(
  ...fields: (keyof IntervalsActivity)[]
): Partial<IntervalsActivity> {
  return Object.fromEntries(fields.map(field => [field, null]));
}

function renderDetails() {
  return renderHookWithClient(() => useActivityDetails(ACTIVITY_ID));
}

describe('useActivityDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
  });

  describe('availability gate', () => {
    it('is loading and fetches nothing while the connection resolves', async () => {
      mockConnection({ loading: true });

      const { result } = await renderDetails();

      expect(result.current.availability).toBe('loading');
      expect(result.current.query.isPending).toBe(true);
      expect(mockGetActivity).not.toHaveBeenCalled();
    });

    it('is unavailable and fetches nothing when not connected', async () => {
      mockConnection();

      const { result } = await renderDetails();

      expect(result.current.availability).toBe('unavailable');
      expect(mockGetActivity).not.toHaveBeenCalled();
    });

    it('is unavailable and fetches nothing while a reconnect is needed', async () => {
      mockConnected();
      setNeedsReconnect(true);

      const { result } = await renderDetails();

      expect(result.current.availability).toBe('unavailable');
      expect(mockGetActivity).not.toHaveBeenCalled();
    });
  });

  /** Renders the details of `body` and waits for the view model. */
  async function detailsOf(body: IntervalsActivity) {
    mockConnected();
    mockGetActivity.mockResolvedValue(body);

    const { result } = await renderDetails();

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    return result.current.query.data;
  }

  /** As `detailsOf`, for an Activity the screen can show. */
  async function shownDetailsOf(body: IntervalsActivity) {
    const details = await detailsOf(body);

    if (!details || details.isStravaActivity) {
      throw new Error('Expected an Activity the screen can show.');
    }

    return details;
  }

  describe('hero', () => {
    it('carries the trimmed name as the title, with the sport type and start date-time', async () => {
      expect(
        await detailsOf(
          activity({
            name: '  Popołudniowa jazda \n',
            type: 'GravelRide',
            start_date_local: '2026-10-23T16:42:00',
          }),
        ),
      ).toMatchObject({
        isStravaActivity: false,
        title: 'Popołudniowa jazda',
        type: 'GravelRide',
        startLocal: '2026-10-23T16:42:00',
      });
    });

    it.each([
      ['blank', ' \n '],
      ['empty', ''],
      ['missing', undefined],
      ['null', null as unknown as undefined],
    ])(
      'has no title when the name is %s, so the screen can fall back to the sport',
      async (_, name) => {
        expect(await detailsOf(activity({ name, type: 'Run' }))).toMatchObject({
          title: null,
          type: 'Run',
        });
      },
    );
  });

  describe('Activity Profile', () => {
    it('draws each interval as one flat block, as wide as its share of the elapsed time, in its zone', async () => {
      const details = await shownDetailsOf(
        activity({
          icu_intervals: [
            { start_time: 0, end_time: 600, intensity: 55, zone: 1 },
            { start_time: 600, end_time: 1800, intensity: 96.4, zone: 4 },
            { start_time: 1800, end_time: 2400, intensity: 121, zone: 6 },
          ],
        }),
      );

      expect(details.blocks).toEqual([
        { widthFraction: 0.25, minPct: 55, maxPct: 55, zone: 1 },
        { widthFraction: 0.5, minPct: 96.4, maxPct: 96.4, zone: 4 },
        { widthFraction: 0.25, minPct: 121, maxPct: 121, zone: 6 },
      ]);
    });

    it('sums up its elapsed span, segment count and rounded peak', async () => {
      const details = await shownDetailsOf(
        activity({
          icu_intervals: [
            { start_time: 0, end_time: 1200, intensity: 64.2, zone: 2 },
            { start_time: 1200, end_time: 1500, intensity: 178.6, zone: 7 },
            { start_time: 1500, end_time: 9300, intensity: 71, zone: 2 },
          ],
        }),
      );

      expect(details.profileSummary).toEqual({
        durationSeconds: 9300,
        segmentCount: 3,
        peakFtpPct: 179,
      });
    });

    it.each([
      ['no intervals', undefined],
      ['an empty interval list', []],
      [
        'one steady block',
        [{ start_time: 0, end_time: 5400, intensity: 72, zone: 2 }],
      ],
      [
        'no power',
        [
          { start_time: 0, end_time: 1800, intensity: null, zone: null },
          { start_time: 1800, end_time: 3600, intensity: null, zone: null },
        ],
      ],
      [
        'only one interval with power',
        [
          { start_time: 0, end_time: 1800, intensity: 88, zone: 3 },
          { start_time: 1800, end_time: 3600, intensity: null, zone: null },
        ],
      ],
    ])('is not drawn with %s', async (_, icu_intervals) => {
      const details = await shownDetailsOf(activity({ icu_intervals }));

      expect(details.blocks).toEqual([]);
      expect(details.profileSummary).toBeNull();
    });

    it('leaves an interval without power as an empty gap, over the whole elapsed span', async () => {
      const details = await shownDetailsOf(
        activity({
          icu_intervals: [
            { start_time: 0, end_time: 600, intensity: 60, zone: 2 },
            { start_time: 600, end_time: 1200, intensity: null, zone: null },
            { start_time: 1200, end_time: 2400, intensity: 105, zone: 5 },
          ],
        }),
      );

      expect(details.blocks).toEqual([
        { widthFraction: 0.25, minPct: 60, maxPct: 60, zone: 2 },
        { widthFraction: 0.25, minPct: 0, maxPct: 0, zone: 1 },
        { widthFraction: 0.5, minPct: 105, maxPct: 105, zone: 5 },
      ]);
      expect(details.profileSummary).toEqual({
        durationSeconds: 2400,
        segmentCount: 2,
        peakFtpPct: 105,
      });
    });
  });

  describe('metrics', () => {
    it('lists every summary metric the Activity has, in display order', async () => {
      const details = await shownDetailsOf(
        activity({
          moving_time: 5520,
          distance: 48_200,
          icu_training_load: 92,
          icu_intensity: 81,
          icu_average_watts: 198,
          icu_weighted_avg_watts: 221,
          average_heartrate: 146,
          max_heartrate: 178,
          average_cadence: 88,
          total_elevation_gain: 640,
          calories: 1094,
          average_speed: 8.7,
          elapsed_time: 6180,
          icu_variability_index: 1.12,
        }),
      );

      expect(details.metrics).toEqual([
        { metric: 'movingTime', value: 5520 },
        { metric: 'distance', value: 48_200 },
        { metric: 'load', value: 92 },
        { metric: 'intensity', value: 81 },
        { metric: 'averagePower', value: 198 },
        { metric: 'normalizedPower', value: 221 },
        { metric: 'averageHeartRate', value: 146 },
        { metric: 'maxHeartRate', value: 178 },
        { metric: 'cadence', value: 88 },
        { metric: 'elevationGain', value: 640 },
        { metric: 'calories', value: 1094 },
        { metric: 'averageSpeed', value: 8.7 },
        { metric: 'elapsedTime', value: 6180 },
        { metric: 'variabilityIndex', value: 1.12 },
      ]);
    });

    it('drops the metrics the Activity lacks, such as power on a ride without a meter', async () => {
      const details = await shownDetailsOf(
        activity({
          moving_time: 2400,
          distance: 7100,
          icu_average_watts: null as unknown as undefined,
          average_heartrate: 152,
          elapsed_time: 2460,
        }),
      );

      expect(details.metrics).toEqual([
        { metric: 'movingTime', value: 2400 },
        { metric: 'distance', value: 7100 },
        { metric: 'averageHeartRate', value: 152 },
        { metric: 'elapsedTime', value: 2460 },
      ]);
    });

    it('shows only the times for a strength session', async () => {
      // A WeightTraining Activity as intervals.icu returns it: every other
      // summary metric is null.
      const details = await shownDetailsOf(
        activity({
          name: 'Siłownia',
          type: 'WeightTraining',
          start_date_local: '2026-10-21T07:30:00',
          moving_time: 3480,
          elapsed_time: 3480,
          ...nulls(
            'distance',
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
            'average_speed',
          ),
        }),
      );

      expect(details.metrics).toEqual([
        { metric: 'movingTime', value: 3480 },
        { metric: 'elapsedTime', value: 3480 },
      ]);
    });
  });

  describe('Opis', () => {
    it("is the Activity's description, trimmed", async () => {
      const details = await shownDetailsOf(
        activity({ description: '\n Przysiad 4×6, martwy ciąg 3×5.  ' }),
      );

      expect(details.description).toBe('Przysiad 4×6, martwy ciąg 3×5.');
    });

    it.each([
      ['blank', ' \n '],
      ['null', null],
      ['missing', undefined],
    ])('is absent when the description is %s', async (_, description) => {
      const details = await shownDetailsOf(activity({ description }));

      expect(details).not.toHaveProperty('description');
    });
  });

  describe('Route', () => {
    const OUTDOOR_STREAMS = ['time', 'watts', 'latlng'];

    it('summarises an outdoor GPS ride: its id, distance, start and finish', async () => {
      const details = await shownDetailsOf(
        activity({
          type: 'Ride',
          trainer: false,
          stream_types: OUTDOOR_STREAMS,
          distance: 48_200,
          start_date_local: '2026-10-23T16:42:00',
          elapsed_time: 6180,
        }),
      );

      expect(details.route).toEqual({
        activityId: ACTIVITY_ID,
        distanceMeters: 48_200,
        startLocal: '2026-10-23T16:42:00',
        finishLocal: '2026-10-23T18:25:00',
      });
    });

    it.each([
      [
        'a trainer ride',
        { type: 'Ride', trainer: true, stream_types: OUTDOOR_STREAMS },
      ],
      [
        'a VirtualRide',
        { type: 'VirtualRide', trainer: false, stream_types: OUTDOOR_STREAMS },
      ],
      [
        'a ride with no latlng stream',
        { type: 'Ride', trainer: false, stream_types: ['time', 'watts'] },
      ],
    ])('is null for %s', async (_, overrides) => {
      const details = await shownDetailsOf(activity(overrides));

      expect(details.route).toBeNull();
    });
  });

  describe('states', () => {
    it('makes a Strava Activity unavailable rather than an empty Activity', async () => {
      // The body intervals.icu returns for a Strava Activity, as verified.
      const strava = {
        id: '20679555658',
        icu_athlete_id: 'athlete-1',
        start_date_local: '2026-10-14T18:00:00',
        source: 'STRAVA',
        _note: 'STRAVA activities are not available via the API',
      } as unknown as IntervalsActivity;

      expect(await detailsOf(strava)).toEqual({ isStravaActivity: true });
    });

    it('surfaces a missing Activity as an API error with status 404', async () => {
      mockConnected();
      mockGetActivity.mockRejectedValue(new IntervalsApiError(404));

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isError).toBe(true));
      expect(result.current.query.error).toBeInstanceOf(IntervalsApiError);
      expect(result.current.query.error).toMatchObject({ status: 404 });
      expect(result.current.query.data).toBeUndefined();
    });
  });

  describe('storage', () => {
    const activityKey = ['intervals', 'athlete-1', 'activity', ACTIVITY_ID];

    it('keeps only the agreed fields of the body, and of each interval', async () => {
      // A slice of the ~71 KB body: the fields Activity Details needs, plus
      // a sample of the ones it doesn't.
      const body = {
        id: ACTIVITY_ID,
        name: 'Popołudniowa jazda',
        type: 'Ride',
        start_date_local: '2026-10-23T16:42:00',
        description: 'Wiatr w twarz.',
        moving_time: 5520,
        distance: 48_200,
        icu_training_load: 92,
        icu_intensity: 81,
        icu_average_watts: 198,
        icu_weighted_avg_watts: 221,
        average_heartrate: 146,
        max_heartrate: 178,
        average_cadence: 88,
        total_elevation_gain: 640,
        calories: 1094,
        average_speed: 8.7,
        elapsed_time: 6180,
        icu_variability_index: 1.12,
        stream_types: ['time', 'watts', 'latlng'],
        trainer: false,
        icu_intervals: [
          {
            start_time: 0,
            end_time: 900,
            intensity: 62,
            zone: 2,
            type: 'RECOVERY',
            label: null,
            average_watts: 166,
            moving_time: 880,
          },
          {
            start_time: 900,
            end_time: 6180,
            intensity: 104,
            zone: 4,
            type: 'WORK',
            label: null,
            average_watts: 279,
            moving_time: 4640,
          },
        ],
        icu_athlete_id: 'athlete-1',
        icu_ftp: 268,
        icu_joules: 1_090_000,
        compliance: null,
        icu_zone_times: [{ id: 'Z1', secs: 900 }],
        interval_summary: ['1x 1h28m 279w'],
        icu_power_hr_z2: 1.4,
      } as unknown as IntervalsActivity;

      mockConnected();
      mockGetActivity.mockResolvedValue(body);

      const { result, client } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(client.getQueryData(activityKey)).toStrictEqual({
        isStravaActivity: false,
        activity: {
          id: ACTIVITY_ID,
          name: 'Popołudniowa jazda',
          type: 'Ride',
          start_date_local: '2026-10-23T16:42:00',
          description: 'Wiatr w twarz.',
          moving_time: 5520,
          distance: 48_200,
          icu_training_load: 92,
          icu_intensity: 81,
          icu_average_watts: 198,
          icu_weighted_avg_watts: 221,
          average_heartrate: 146,
          max_heartrate: 178,
          average_cadence: 88,
          total_elevation_gain: 640,
          calories: 1094,
          average_speed: 8.7,
          elapsed_time: 6180,
          icu_variability_index: 1.12,
          stream_types: ['time', 'watts', 'latlng'],
          trainer: false,
          icu_intervals: [
            { start_time: 0, end_time: 900, intensity: 62, zone: 2 },
            { start_time: 900, end_time: 6180, intensity: 104, zone: 4 },
          ],
        },
      });
    });

    it('keeps no field the body leaves out', async () => {
      mockConnected();
      mockGetActivity.mockResolvedValue({
        id: ACTIVITY_ID,
        type: 'WeightTraining',
        start_date_local: '2026-10-21T07:30:00',
        moving_time: 3480,
        icu_intervals: [],
      } as unknown as IntervalsActivity);

      const { result, client } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(client.getQueryData(activityKey)).toStrictEqual({
        isStravaActivity: false,
        activity: {
          id: ACTIVITY_ID,
          type: 'WeightTraining',
          start_date_local: '2026-10-21T07:30:00',
          moving_time: 3480,
          icu_intervals: [],
        },
      });
    });

    it('stores a Strava Activity as an explicit marker, with nothing of its body', async () => {
      mockConnected();
      mockGetActivity.mockResolvedValue({
        id: '20679555658',
        icu_athlete_id: 'athlete-1',
        start_date_local: '2026-10-14T18:00:00',
        source: 'STRAVA',
        _note: 'STRAVA activities are not available via the API',
      } as unknown as IntervalsActivity);

      const { result, client } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(client.getQueryData(activityKey)).toStrictEqual({
        isStravaActivity: true,
      });
    });
  });

  describe('cache', () => {
    const activityKey = ['intervals', 'athlete-1', 'activity', ACTIVITY_ID];

    it('is refetched when everything for the athlete is invalidated', async () => {
      mockConnected();
      mockGetActivity.mockResolvedValue(activity());

      const { result, client } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      await act(() =>
        client.invalidateQueries({
          queryKey: intervalsKeys.athlete('athlete-1'),
        }),
      );

      expect(mockGetActivity).toHaveBeenCalledTimes(2);
    });

    it("is dropped with the rest of the ['intervals'] prefix", async () => {
      mockConnected();
      mockGetActivity.mockResolvedValue(activity());

      const { result, client } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(client.getQueryData(activityKey)).toBeDefined();

      await act(() => removeIntervalsQueries(client));

      expect(client.getQueryData(activityKey)).toBeUndefined();
    });

    it('refetches only this query on refetch', async () => {
      mockConnected();
      mockGetActivity.mockResolvedValue(activity());

      const { result, client } = await renderDetails();

      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          title: 'Popołudniowa jazda',
        }),
      );
      const otherKey = intervalsKeys.workout('athlete-1', 42);

      client.setQueryData(otherKey, { stale: true });
      const before = client.getQueryState(otherKey)?.dataUpdatedAt;

      mockGetActivity.mockResolvedValue(activity({ name: 'Nowa nazwa' }));
      await act(() => result.current.refetch());

      expect(mockGetActivity).toHaveBeenCalledTimes(2);
      await waitFor(() =>
        expect(result.current.query.data).toMatchObject({
          title: 'Nowa nazwa',
        }),
      );
      expect(client.getQueryState(otherKey)?.dataUpdatedAt).toBe(before);
    });
  });

  describe('request', () => {
    it('reads the Activity by id with its intervals', async () => {
      mockConnected();
      mockGetActivity.mockResolvedValue(activity());

      const { result } = await renderDetails();

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(mockGetActivity).toHaveBeenCalledTimes(1);
      expect(mockGetActivity).toHaveBeenCalledWith(
        'token-1',
        ACTIVITY_ID,
        { intervals: true },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
