import { useUpcomingWorkouts } from '../useUpcomingWorkouts';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import { IntervalsAuthError, getCalendarEvents } from '@/lib/intervalsApi';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => {
  const actual = jest.requireActual('@/lib/intervalsApi');

  return {
    ...actual,
    getCalendarEvents: jest.fn(),
  };
});

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockGetCalendarEvents = getCalendarEvents as jest.Mock;
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

describe('useUpcomingWorkouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is hidden and makes no API call when not connected', async () => {
    mockConnection();

    const { result } = await renderHook(() => useUpcomingWorkouts());

    expect(result.current.status).toBe('hidden');
    expect(mockGetCalendarEvents).not.toHaveBeenCalled();
  });

  it('is loading while the connection state itself is resolving', async () => {
    mockConnection({ loading: true });

    const { result } = await renderHook(() => useUpcomingWorkouts());

    expect(result.current.status).toBe('loading');
  });

  it('is loading while the fetch is in flight', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useUpcomingWorkouts());

    expect(result.current.status).toBe('loading');
  });

  it('delegates to the shared auth-error handler on a 401 and hides the section', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    mockGetCalendarEvents.mockRejectedValue(new IntervalsAuthError());

    const { result } = await renderHook(() => useUpcomingWorkouts());

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

    const { result } = await renderHook(() => useUpcomingWorkouts());

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

    const { result } = await renderHook(() => useUpcomingWorkouts());

    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('is ready with the mapped workouts when connected with matching events', async () => {
    mockConnection({
      isConnected: true,
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    mockGetCalendarEvents.mockResolvedValue([
      {
        id: 1,
        category: 'WORKOUT',
        name: 'Intervals',
        start_date_local: `${todayLocal}T08:00:00`,
      },
    ]);

    const { result } = await renderHook(() => useUpcomingWorkouts());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(
      result.current.status === 'ready' && result.current.workouts,
    ).toEqual([{ id: 1, name: 'Intervals', dayLabel: 'today' }]);
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      expect.objectContaining({
        oldest: expect.any(String),
        newest: expect.any(String),
      }),
    );
  });
});
