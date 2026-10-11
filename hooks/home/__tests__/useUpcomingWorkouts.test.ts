import { useUpcomingWorkouts } from '../useUpcomingWorkouts';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  type IntervalsCalendarEvent,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { toLocalDateString } from '@/lib/localDate';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getCalendarEvents: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;

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

/** A workout scheduled for today, whichever day the suite happens to run on. */
function todayEvent(): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Intervals',
    start_date_local: `${toLocalDateString(new Date())}T08:00:00`,
  };
}

describe('useUpcomingWorkouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({});
  });

  it('is unavailable and makes no API call when not connected', async () => {
    mockConnection();

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    expect(result.current.availability).toBe('unavailable');
    expect(result.current.query.isPending).toBe(true);
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
    expect(mockGetAthleteSettings).not.toHaveBeenCalled();
  });

  it('is loading and makes no API call while the connection itself resolves', async () => {
    mockConnection({ loading: true });

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    expect(result.current.availability).toBe('loading');
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it('is pending while the fetch is in flight', async () => {
    mockConnected();
    mockGetCalendarEvents.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    expect(result.current.availability).toBe('available');
    expect(result.current.query.isPending).toBe(true);
  });

  it("caches today's workouts under the athlete and today's date", async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([todayEvent()]);

    const { result, client } = await renderHookWithClient(() =>
      useUpcomingWorkouts(),
    );

    await waitFor(() =>
      expect(result.current.query.data).toEqual([
        { id: 1, name: 'Intervals', dayLabel: 'today', blocks: [] },
      ]),
    );
    expect(
      client.getQueryData([
        'intervals',
        'athlete-1',
        'upcoming',
        toLocalDateString(new Date()),
      ]),
    ).toBe(result.current.query.data);
  });

  it('is empty when connected but no events match', async () => {
    mockConnected();
    mockGetCalendarEvents.mockResolvedValue([
      {
        id: 1,
        category: 'RACE',
        name: 'Race',
        start_date_local: '2026-07-25T08:00:00',
      },
    ]);

    const { result } = await renderHookWithClient(() => useUpcomingWorkouts());

    await waitFor(() => expect(result.current.query.data).toEqual([]));
  });
});
