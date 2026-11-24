import {
  connectIntervals,
  disconnectIntervals,
  intervalsConnectionLoading,
} from '@/test-utils/intervalsConnection';

import { useActivityRoute } from '../useActivityRoute';
import { useAthleteSettings } from '../useAthleteSettings';
import { useIntervalsRefresh } from '../useIntervalsRefresh';
import { useUpcomingWorkouts } from '@/hooks/home/useUpcomingWorkouts';
import { useToday } from '@/hooks/useToday';
import { useProfileCard } from '@/hooks/workout/useProfileCard';
import { useWorkoutDetails } from '@/hooks/workout/useWorkoutDetails';
import {
  type IntervalsActivity,
  IntervalsApiError,
  type IntervalsCalendarEvent,
  getActivities,
  getActivity,
  getActivityMap,
  getAthleteSettings,
  getCalendarEvent,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { resolveRideSettings } from '@/lib/rideSettings';
import { NO_ZONE_TIMES } from '@/lib/timeInZone';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { settleQueries } from '@/test-utils/settle';
import type { QueryClient } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useToday', () => ({
  useToday: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getActivities: jest.fn(),
  getActivity: jest.fn(),
  getActivityMap: jest.fn(),
  getAthleteSettings: jest.fn(),
  getCalendarEvent: jest.fn(),
  getCalendarEvents: jest.fn(),
}));

const mockGetActivities = jest.mocked(getActivities);
const mockGetActivity = jest.mocked(getActivity);
const mockGetActivityMap = jest.mocked(getActivityMap);
const mockGetAthleteSettings = jest.mocked(getAthleteSettings);
const mockGetCalendarEvent = jest.mocked(getCalendarEvent);
const mockGetCalendarEvents = jest.mocked(getCalendarEvents);

const TODAY = '2026-11-24';
const EVENT_ID = 42;
const RECORDED_ACTIVITY_ID = 'i196064284';

const WORKOUT_EVENT: IntervalsCalendarEvent = {
  id: EVENT_ID,
  category: 'WORKOUT',
  name: 'Sweet spot 3x10',
  start_date_local: `${TODAY}T08:00:00`,
};

function recordedRide(endTimeSeconds: number): IntervalsActivity {
  return {
    id: RECORDED_ACTIVITY_ID,
    name: 'Popołudniowa jazda',
    type: 'Ride',
    start_date_local: `${TODAY}T16:42:00`,
    moving_time: endTimeSeconds,
    distance: 5000,
    icu_intervals: [
      { start_time: 0, end_time: endTimeSeconds, intensity: 60, zone: 2 },
    ],
  };
}

function renderWorkoutDetailsReads() {
  return renderHookWithClient(() => ({
    workout: useWorkoutDetails(EVENT_ID),
    profile: useProfileCard({
      blocks: [],
      profileSummary: null,
      zoneTimes: NO_ZONE_TIMES,
      rideSettings: resolveRideSettings({ ftp: 250 }),
      recordedActivityId: RECORDED_ACTIVITY_ID,
    }),
    screen: useIntervalsRefresh(),
  }));
}

function renderRouteWithRefresh() {
  return renderHookWithClient(() => ({
    route: useActivityRoute(RECORDED_ACTIVITY_ID),
    screen: useIntervalsRefresh(),
  }));
}

function renderSettingsWithRefresh() {
  return renderHookWithClient(() => ({
    settings: useAthleteSettings(),
    screen: useIntervalsRefresh(),
  }));
}

async function renderLoadedHome(client?: QueryClient) {
  const home = await renderHookWithClient(() => useUpcomingWorkouts(), {
    client,
  });

  await waitFor(() => expect(home.result.current.query.isSuccess).toBe(true));
  await settleQueries();

  return home;
}

function renderRefreshAlone(client?: QueryClient) {
  const refreshingSeen: boolean[] = [];
  const rendered = renderHookWithClient(
    () => {
      const screen = useIntervalsRefresh();

      refreshingSeen.push(screen.refreshing);

      return screen;
    },
    { client },
  );

  return { rendered, refreshingSeen };
}

beforeEach(() => {
  jest.clearAllMocks();
  setNeedsReconnect(false);
  connectIntervals();
  jest.mocked(useToday).mockReturnValue(TODAY);
  mockGetCalendarEvent.mockResolvedValue(WORKOUT_EVENT);
  mockGetCalendarEvents.mockResolvedValue([]);
  mockGetActivities.mockResolvedValue([]);
  mockGetAthleteSettings.mockResolvedValue({ ftp: 250 });
  mockGetActivity.mockResolvedValue(recordedRide(600));
  mockGetActivityMap.mockResolvedValue({
    latlngs: [
      [52.2, 21.0],
      [52.201, 21.002],
    ],
  });
});

describe('useIntervalsRefresh', () => {
  it("refetches the Workout and the recorded Activity the Profile card opens, so the Recorded strip shows the ride's latest analysis", async () => {
    const { result } = await renderWorkoutDetailsReads();

    await waitFor(() =>
      expect(result.current.profile?.durationSeconds).toBe(600),
    );
    await waitFor(() =>
      expect(result.current.workout.query.isSuccess).toBe(true),
    );

    mockGetActivity.mockResolvedValue(recordedRide(900));
    await act(() => result.current.screen.refresh());

    expect(mockGetCalendarEvent).toHaveBeenCalledTimes(2);
    expect(mockGetActivity).toHaveBeenCalledTimes(2);
    expect(result.current.profile?.durationSeconds).toBe(900);
  });

  it('leaves out a Route that has loaded, since a recorded GPS track does not change', async () => {
    const { result } = await renderRouteWithRefresh();

    await waitFor(() =>
      expect(result.current.route.query.isSuccess).toBe(true),
    );

    await act(() => result.current.screen.refresh());

    expect(mockGetActivityMap).toHaveBeenCalledTimes(1);
  });

  it('retries a Route that failed to load', async () => {
    mockGetActivityMap.mockRejectedValueOnce(new IntervalsApiError(500));

    const { result } = await renderRouteWithRefresh();

    await waitFor(() => expect(result.current.route.query.isError).toBe(true));

    await act(() => result.current.screen.refresh());

    expect(mockGetActivityMap).toHaveBeenCalledTimes(2);
    expect(result.current.route.query.isSuccess).toBe(true);
  });

  it('refetches mounted athlete settings, so an FTP changed on Intervals.icu shows', async () => {
    const { result } = await renderSettingsWithRefresh();

    await waitFor(() => expect(result.current.settings.data?.ftp).toBe(250));

    mockGetAthleteSettings.mockResolvedValue({ ftp: 270 });
    await act(() => result.current.screen.refresh());

    expect(mockGetAthleteSettings).toHaveBeenCalledTimes(2);
    expect(result.current.settings.data?.ftp).toBe(270);
  });

  it('keeps Home fresh in the cache when the athlete navigates back without a refresh', async () => {
    const home = await renderLoadedHome();

    await home.unmount();
    await renderLoadedHome(home.client);

    expect(mockGetActivities).toHaveBeenCalledTimes(1);
  });

  it('marks Home stale without refetching it while it is off screen, so it refetches when the athlete navigates back', async () => {
    const home = await renderLoadedHome();
    const { rendered } = renderRefreshAlone(home.client);
    const { result } = await rendered;

    await home.unmount();
    await act(() => result.current.refresh());
    await settleQueries();

    expect(mockGetActivities).toHaveBeenCalledTimes(1);

    await renderLoadedHome(home.client);

    await waitFor(() => expect(mockGetActivities).toHaveBeenCalledTimes(2));
  });

  it('is refreshing from the start of a refresh until its refetches settle', async () => {
    const { result } = await renderWorkoutDetailsReads();

    await waitFor(() =>
      expect(result.current.workout.query.isSuccess).toBe(true),
    );
    expect(result.current.screen.refreshing).toBe(false);

    let resolveEvent: (event: IntervalsCalendarEvent) => void = () => {};

    mockGetCalendarEvent.mockReturnValue(
      new Promise(resolve => {
        resolveEvent = resolve;
      }),
    );

    let refreshed: Promise<void> = Promise.resolve();

    await act(async () => {
      refreshed = result.current.screen.refresh();
    });

    expect(result.current.screen.refreshing).toBe(true);

    await act(async () => {
      resolveEvent(WORKOUT_EVENT);
      await refreshed;
    });

    expect(result.current.screen.refreshing).toBe(false);
  });

  it('is not refreshing during a refetch it did not start', async () => {
    const { result } = await renderWorkoutDetailsReads();

    await waitFor(() =>
      expect(result.current.workout.query.isSuccess).toBe(true),
    );
    expect(result.current.workout.query.isFetching).toBe(false);
    mockGetCalendarEvent.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      void result.current.workout.refetch();
    });

    await waitFor(() =>
      expect(result.current.workout.query.isFetching).toBe(true),
    );
    expect(result.current.screen.refreshing).toBe(false);
  });

  it.each([
    ['while the connection loads', intervalsConnectionLoading],
    ['when not connected', disconnectIntervals],
    [
      'while a reconnect is needed',
      () => {
        connectIntervals();
        setNeedsReconnect(true);
      },
    ],
  ])(
    'resolves at once without touching the cache and never shows refreshing %s',
    async (_, arrangeConnection) => {
      const home = await renderLoadedHome();

      await home.unmount();
      arrangeConnection();
      const { rendered, refreshingSeen } = renderRefreshAlone(home.client);
      const { result } = await rendered;

      let settled = false;
      const refreshed = result.current.refresh().then(() => {
        settled = true;
      });

      await Promise.resolve();
      expect(settled).toBe(true);
      await act(() => refreshed);
      await settleQueries();

      expect(refreshingSeen).not.toContain(true);

      await act(() => {
        setNeedsReconnect(false);
        connectIntervals();
      });
      await renderLoadedHome(home.client);

      expect(mockGetActivities).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps the identity of refresh across renders for the same athlete', async () => {
    const { result, rerender } = await renderWorkoutDetailsReads();
    const first = result.current.screen.refresh;

    await waitFor(() =>
      expect(result.current.workout.query.isSuccess).toBe(true),
    );
    await rerender({});

    expect(result.current.screen.refresh).toBe(first);
  });

  it('resolves, not rejects, when a refetch fails, and the read shows its own error', async () => {
    const { result } = await renderWorkoutDetailsReads();

    await waitFor(() =>
      expect(result.current.workout.query.isSuccess).toBe(true),
    );

    expect(result.current.workout.query.isError).toBe(false);
    mockGetCalendarEvent.mockRejectedValue(new IntervalsApiError(500));

    await act(() => result.current.screen.refresh());

    expect(mockGetCalendarEvent).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(result.current.workout.query.isError).toBe(true),
    );
    expect(result.current.screen.refreshing).toBe(false);
  });
});
