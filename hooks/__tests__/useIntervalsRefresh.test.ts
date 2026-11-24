import { connectIntervals } from '@/test-utils/intervalsConnection';

import { useIntervalsRefresh } from '../useIntervalsRefresh';
import { useToday } from '@/hooks/useToday';
import { useProfileCard } from '@/hooks/workout/useProfileCard';
import { useWorkoutDetails } from '@/hooks/workout/useWorkoutDetails';
import {
  type IntervalsActivity,
  type IntervalsCalendarEvent,
  getActivities,
  getActivity,
  getAthleteSettings,
  getCalendarEvent,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { NO_WORKOUT_PROFILE } from '@/lib/profileCard';
import { resolveRideSettings } from '@/lib/rideSettings';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useToday', () => ({
  useToday: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getActivities: jest.fn(),
  getActivity: jest.fn(),
  getAthleteSettings: jest.fn(),
  getCalendarEvent: jest.fn(),
  getCalendarEvents: jest.fn(),
}));

const mockGetActivities = jest.mocked(getActivities);
const mockGetActivity = jest.mocked(getActivity);
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
      ...NO_WORKOUT_PROFILE,
      rideSettings: resolveRideSettings({ ftp: 250 }),
      recordedActivityId: RECORDED_ACTIVITY_ID,
    }),
    screen: useIntervalsRefresh(),
  }));
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
});

describe('useIntervalsRefresh', () => {
  it("refetches the Workout and the recorded Activity the Profile card opens, so the Recorded strip shows the ride's latest analysis", async () => {
    const { result } = await renderWorkoutDetailsReads();

    await waitFor(() =>
      expect(result.current.profile?.card.durationSeconds).toBe(600),
    );
    await waitFor(() =>
      expect(result.current.workout.query.isSuccess).toBe(true),
    );

    mockGetActivity.mockResolvedValue(recordedRide(900));
    await act(() => result.current.screen.refresh());

    expect(mockGetCalendarEvent).toHaveBeenCalledTimes(2);
    expect(mockGetActivity).toHaveBeenCalledTimes(2);
    expect(result.current.profile?.card.durationSeconds).toBe(900);
  });
});
