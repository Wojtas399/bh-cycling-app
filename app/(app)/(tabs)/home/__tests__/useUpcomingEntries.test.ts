import { useUpcomingEntries } from '../useUpcomingEntries';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import {
  IntervalsAuthError,
  type IntervalsCalendarEvent,
  type IntervalsWorkoutDoc,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => {
  const actual = jest.requireActual('@/lib/intervalsApi');

  return {
    ...actual,
    getCalendarEvents: jest.fn(),
    getAthleteSettings: jest.fn(),
  };
});

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
const mockGetAthleteSettings = getAthleteSettings as jest.Mock;
const mockHandleIntervalsAuthError = handleIntervalsAuthError as jest.Mock;

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

/** A workout scheduled for today, whichever day the suite happens to run on. */
function todayEvent(
  overrides: Partial<IntervalsCalendarEvent> = {},
): IntervalsCalendarEvent {
  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return {
    id: 1,
    category: 'WORKOUT',
    name: 'Intervals',
    start_date_local: `${todayLocal}T08:00:00`,
    ...overrides,
  };
}

const ZONE_2_HOUR: IntervalsWorkoutDoc = {
  duration: 3600,
  steps: [{ duration: 3600, power: { units: 'power_zone', value: 2 } }],
};

describe('useUpcomingEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteSettings.mockResolvedValue({});
  });

  it('is hidden and makes no API call when not connected', async () => {
    mockConnection();

    const { result } = await renderHook(() => useUpcomingEntries());

    expect(result.current.status).toBe('hidden');
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
    expect(mockGetAthleteSettings).not.toHaveBeenCalled();
  });

  it('is loading while the connection state itself is resolving', async () => {
    mockConnection({ loading: true });

    const { result } = await renderHook(() => useUpcomingEntries());

    expect(result.current.status).toBe('loading');
  });

  it('is loading while the fetch is in flight', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useUpcomingEntries());

    expect(result.current.status).toBe('loading');
  });

  it('delegates to the shared auth-error handler on a 401 and hides the section', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockRejectedValue(new IntervalsAuthError());

    const { result } = await renderHook(() => useUpcomingEntries());

    await waitFor(() => expect(result.current.status).toBe('hidden'));

    expect(mockHandleIntervalsAuthError).toHaveBeenCalledTimes(1);
  });

  it('hides the section on any other fetch error without calling the auth-error handler', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockRejectedValue(new Error('network down'));

    const { result } = await renderHook(() => useUpcomingEntries());

    await waitFor(() => expect(result.current.status).toBe('hidden'));

    expect(mockHandleIntervalsAuthError).not.toHaveBeenCalled();
  });

  it('is empty when connected but no events match', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockResolvedValue([
      {
        id: 1,
        category: 'RACE',
        name: 'Race',
        start_date_local: '2026-07-25T08:00:00',
      },
    ]);

    const { result } = await renderHook(() => useUpcomingEntries());

    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('is ready with the mapped entries when connected with matching events', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockResolvedValue([todayEvent()]);

    const { result } = await renderHook(() => useUpcomingEntries());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.status === 'ready' && result.current.entries).toEqual(
      [
        {
          kind: 'workout',
          id: 1,
          name: 'Intervals',
          dayLabel: 'today',
          blocks: [],
        },
      ],
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      expect.objectContaining({
        oldest: expect.any(String),
        newest: expect.any(String),
      }),
    );
  });

  it('is ready with a note entry when connected with a matching NOTE event', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockResolvedValue([
      todayEvent({
        id: 2,
        category: 'NOTE',
        name: 'Bike check',
        description: 'Adjust saddle height.',
      }),
    ]);

    const { result } = await renderHook(() => useUpcomingEntries());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.status === 'ready' && result.current.entries).toEqual(
      [
        {
          kind: 'note',
          id: 2,
          title: 'Bike check',
          text: 'Adjust saddle height.',
          dayLabel: 'today',
        },
      ],
    );
  });

  it('builds the profile blocks against the athlete own zone boundaries', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetAthleteSettings.mockResolvedValue({
      powerZones: [60, 80, 95, 110, 130, 160, 220],
    });
    mockGetCalendarEvents.mockResolvedValue([
      todayEvent({ workout_doc: ZONE_2_HOUR }),
    ]);

    const { result } = await renderHook(() => useUpcomingEntries());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    // This athlete's Z2 is 60–80% FTP, not the Coggan 55–75%.
    const entries =
      result.current.status === 'ready' ? result.current.entries : [];

    expect(entries[0].kind === 'workout' && entries[0].blocks).toEqual([
      { widthFraction: 1, minPct: 60, maxPct: 80, zone: 2 },
    ]);
    expect(mockGetAthleteSettings).toHaveBeenCalledWith('token-1');
  });

  it('falls back to the Coggan zones and still lists entries when the settings fetch fails', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetAthleteSettings.mockRejectedValue(new Error('settings unavailable'));
    mockGetCalendarEvents.mockResolvedValue([
      todayEvent({ workout_doc: ZONE_2_HOUR }),
    ]);

    const { result } = await renderHook(() => useUpcomingEntries());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    const entries =
      result.current.status === 'ready' ? result.current.entries : [];

    expect(entries[0].kind === 'workout' && entries[0].blocks).toEqual([
      { widthFraction: 1, minPct: 55, maxPct: 75, zone: 2 },
    ]);
    expect(mockHandleIntervalsAuthError).not.toHaveBeenCalled();
  });
});
