import { usePairedRace } from '../usePairedRace';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import {
  type IntervalsCalendarEvent,
  getCalendarEvent,
} from '@/lib/intervalsApi';
import { intervalsKeys } from '@/lib/intervalsQueries';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getCalendarEvent: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockGetCalendarEvent = getCalendarEvent as jest.Mock;

const EVENT_ID = 4242;

function mockConnected() {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: true,
    athleteName: null,
    athleteId: 'athlete-1',
    accessToken: 'token-1',
    loading: false,
  });
}

function livePairedEventBody(
  overrides: Partial<IntervalsCalendarEvent> = {},
): IntervalsCalendarEvent {
  return {
    id: EVENT_ID,
    category: 'RACE_A',
    name: 'Mazovia MTB Maraton',
    start_date_local: '2026-10-23T10:00:00',
    end_date_local: '2026-10-23T14:00:00',
    type: 'MountainBikeRide',
    color: '#ff2a0e',
    description: 'Start z sektora B.',
    moving_time: 14_400,
    distance: 62_000,
    ...overrides,
  };
}

function renderPairedRace(eventId: number | null) {
  return renderHookWithClient(() => usePairedRace(eventId));
}

describe('usePairedRace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnected();
  });

  it('is the Race behind the paired event, read once by its id', async () => {
    mockGetCalendarEvent.mockResolvedValue(livePairedEventBody());

    const { result } = await renderPairedRace(EVENT_ID);

    await waitFor(() =>
      expect(result.current.race).toEqual({
        id: EVENT_ID,
        name: 'Mazovia MTB Maraton',
        priority: 'A',
        date: '2026-10-23',
        startTime: '10:00',
        sport: 'MountainBikeRide',
        durationSeconds: 14_400,
        distanceMeters: 62_000,
        description: 'Start z sektora B.',
      }),
    );
    expect(mockGetCalendarEvent).toHaveBeenCalledTimes(1);
    expect(mockGetCalendarEvent).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      EVENT_ID,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reads nothing and has no Race for an Activity that is not paired', async () => {
    const { result } = await renderPairedRace(null);

    expect(result.current.race).toBeUndefined();
    expect(mockGetCalendarEvent).not.toHaveBeenCalled();
  });

  it('has no Race when the paired event is a Workout', async () => {
    mockGetCalendarEvent.mockResolvedValue(
      livePairedEventBody({ category: 'WORKOUT', name: 'Sweet spot 3×15' }),
    );

    const { result, client } = await renderPairedRace(EVENT_ID);

    await waitFor(() =>
      expect(
        client.getQueryState(intervalsKeys.race('athlete-1', EVENT_ID))?.status,
      ).toBe('success'),
    );
    expect(result.current.race).toBeUndefined();
  });

  it('reads the Race again on refetch', async () => {
    mockGetCalendarEvent.mockResolvedValue(livePairedEventBody());

    const { result } = await renderPairedRace(EVENT_ID);

    await waitFor(() =>
      expect(result.current.race?.name).toBe('Mazovia MTB Maraton'),
    );

    mockGetCalendarEvent.mockResolvedValue(
      livePairedEventBody({ name: 'Mazovia MTB Maraton Kraków' }),
    );
    await act(() => result.current.refetch());

    expect(mockGetCalendarEvent).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(result.current.race?.name).toBe('Mazovia MTB Maraton Kraków'),
    );
  });

  it('is refetched when everything for the athlete is invalidated', async () => {
    mockGetCalendarEvent.mockResolvedValue(livePairedEventBody());

    const { result, client } = await renderPairedRace(EVENT_ID);

    await waitFor(() => expect(result.current.race).toBeDefined());
    await act(() =>
      client.invalidateQueries({
        queryKey: intervalsKeys.athlete('athlete-1'),
      }),
    );

    expect(mockGetCalendarEvent).toHaveBeenCalledTimes(2);
  });
});
