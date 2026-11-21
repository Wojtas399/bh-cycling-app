import { useNextRace } from '../useNextRace';
import { useUpcomingWorkouts } from '../useUpcomingWorkouts';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { useToday } from '@/hooks/useToday';
import {
  type IntervalsCalendarEvent,
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '@/lib/intervalsApi';
import { intervalsKeys } from '@/lib/intervalsQueries';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/hooks/useToday', () => ({
  useToday: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getCalendarEvents: jest.fn(),
  getActivities: jest.fn(),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = jest.mocked(useIntervalsConnection);
const mockUseToday = jest.mocked(useToday);
const mockGetCalendarEvents = jest.mocked(getCalendarEvents);
const mockGetActivities = jest.mocked(getActivities);
const mockGetAthleteSettings = jest.mocked(getAthleteSettings);

const TODAY = '2026-11-08';

function mockConnected() {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: true,
    athleteName: null,
    athleteId: 'athlete-1',
    accessToken: 'token-1',
    scope: null,
    loading: false,
  });
}

// Shaped like the live Race bodies in #280.
function raceEvent(
  overrides: Partial<IntervalsCalendarEvent>,
): IntervalsCalendarEvent {
  return {
    id: 1,
    category: 'RACE_B',
    name: 'Gravel Race',
    start_date_local: '2026-11-13T00:00:00',
    type: 'Ride',
    color: '#ff2a0e',
    ...overrides,
  };
}

describe('useNextRace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToday.mockReturnValue(TODAY);
    mockConnected();
  });

  it('reads the Races of the next 30 days in one call and counts down to the nearest', async () => {
    mockGetCalendarEvents.mockResolvedValue([
      raceEvent({
        id: 7,
        category: 'RACE_A',
        name: 'Mistrzostwa Polski',
        start_date_local: '2026-11-20T00:00:00',
      }),
    ]);

    const { result } = await renderHookWithClient(() => useNextRace());

    await waitFor(() =>
      expect(result.current.next).toEqual({
        race: {
          id: 7,
          name: 'Mistrzostwa Polski',
          priority: 'A',
          date: '2026-11-20',
          sport: 'Ride',
        },
        countdown: 12,
      }),
    );
    expect(mockGetCalendarEvents).toHaveBeenCalledTimes(1);
    expect(mockGetCalendarEvents).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: '2026-11-08',
        newest: '2026-12-08',
        category: ['RACE_A', 'RACE_B', 'RACE_C'],
      },
      expect.anything(),
    );
  });

  it('gives nothing when no Race falls in the window', async () => {
    mockGetCalendarEvents.mockResolvedValue([]);

    const { result, client } = await renderHookWithClient(() => useNextRace());

    await waitFor(() =>
      expect(
        client.getQueryState(intervalsKeys.nextRace('athlete-1', TODAY))
          ?.status,
      ).toBe('success'),
    );
    expect(result.current.next).toBeUndefined();
  });

  it('fails on its own, leaving "Dziś i jutro" to load', async () => {
    mockGetActivities.mockResolvedValue([]);
    mockGetAthleteSettings.mockResolvedValue({});
    mockGetCalendarEvents.mockImplementation(
      async (_token, _athlete, params) => {
        if (Array.isArray(params?.category)) throw new Error('races down');

        return [raceEvent({ start_date_local: `${TODAY}T00:00:00` })];
      },
    );

    const { result, client } = await renderHookWithClient(() => ({
      nextRace: useNextRace(),
      upcoming: useUpcomingWorkouts(),
    }));

    await waitFor(() =>
      expect(result.current.upcoming.query.data).toMatchObject([
        { kind: 'race', race: { id: 1 } },
      ]),
    );
    await waitFor(() =>
      expect(
        client.getQueryState(intervalsKeys.nextRace('athlete-1', TODAY))
          ?.status,
      ).toBe('error'),
    );
    expect(result.current.nextRace.next).toBeUndefined();
  });
});
