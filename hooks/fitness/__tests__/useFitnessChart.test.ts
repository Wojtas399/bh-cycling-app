import { useFitnessChart } from '../useFitnessChart';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { useToday } from '@/hooks/useToday';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import {
  IntervalsApiError,
  type IntervalsWellnessDay,
  getWellnessRange,
} from '@/lib/intervalsApi';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { settleQueries } from '@/test-utils/settle';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/hooks/useToday', () => ({
  useToday: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getWellnessRange: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = jest.mocked(useIntervalsConnection);
const mockUseToday = jest.mocked(useToday);
const mockGetWellnessRange = jest.mocked(getWellnessRange);

const TODAY = '2026-11-06';

const FULL_CONSENT_SCOPE =
  'ACTIVITY:READ,CALENDAR:READ,WELLNESS:READ,SETTINGS:READ';

const SCOPE_FROM_BEFORE_WELLNESS_WAS_ASKED_FOR = 'ACTIVITY:READ,CALENDAR:READ';

function mockConnection(
  overrides: Partial<ReturnType<typeof useIntervalsConnection>> = {},
) {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: false,
    athleteName: null,
    athleteId: null,
    accessToken: null,
    scope: null,
    loading: false,
    ...overrides,
  });
}

function mockConnected(scope: string = FULL_CONSENT_SCOPE) {
  mockConnection({
    isConnected: true,
    accessToken: 'token-1',
    athleteId: 'athlete-1',
    scope,
  });
}

const NEW_ATHLETE_THREE_WEEKS_TO_TODAY = [
  { id: '2026-10-17', ctl: 0, atl: 0, ctlLoad: 0 },
  { id: '2026-11-05', ctl: 9.6, atl: 31.2, ctlLoad: 64 },
  { id: '2026-11-06', ctl: 10.4, atl: 33.5, ctlLoad: null },
];

async function refetchAndSettle(hook: {
  result: { current: { refetch: () => Promise<void> } };
}) {
  await act(() => hook.result.current.refetch());
  await settleQueries();
}

async function renderSettled() {
  const rendered = await renderHookWithClient(() => useFitnessChart());

  await waitFor(() =>
    expect(rendered.result.current.state.status).not.toBe('loading'),
  );

  return rendered;
}

describe('useFitnessChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
    mockUseToday.mockReturnValue(TODAY);
  });

  it('asks to connect, and asks for nothing, when not connected', async () => {
    mockConnection();

    const { result } = await renderHookWithClient(() => useFitnessChart());

    expect(result.current.state).toEqual({ status: 'notConnected' });
    expect(mockGetWellnessRange).not.toHaveBeenCalled();
  });

  it('asks to connect, and asks for nothing, once the token is known to be bad', async () => {
    mockConnected();
    setNeedsReconnect(true);

    const { result } = await renderHookWithClient(() => useFitnessChart());

    expect(result.current.state).toEqual({ status: 'notConnected' });
    expect(mockGetWellnessRange).not.toHaveBeenCalled();
  });

  it('is loading and asks for nothing while the connection itself resolves', async () => {
    mockConnection({ loading: true });

    const { result } = await renderHookWithClient(() => useFitnessChart());

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockGetWellnessRange).not.toHaveBeenCalled();
  });

  it('is loading while the year is on its way', async () => {
    mockConnected();
    mockGetWellnessRange.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHookWithClient(() => useFitnessChart());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('asks to reconnect, and asks for nothing, when the stored scope lacks Wellness', async () => {
    mockConnected(SCOPE_FROM_BEFORE_WELLNESS_WAS_ASKED_FOR);

    const { result } = await renderHookWithClient(() => useFitnessChart());

    expect(result.current.state).toEqual({ status: 'needsScope' });
    expect(mockGetWellnessRange).not.toHaveBeenCalled();
  });

  it('asks to reconnect when the read is refused for its scope, without retrying it or the global reconnect', async () => {
    mockConnected();
    mockGetWellnessRange.mockRejectedValue(new IntervalsApiError(403));

    const { result } = await renderSettled();

    expect(result.current.state).toEqual({ status: 'needsScope' });
    expect(mockGetWellnessRange).toHaveBeenCalledTimes(1);
    expect(handleIntervalsAuthError).not.toHaveBeenCalled();
  });

  it('asks to reconnect over a chart already shown when Wellness access is taken away', async () => {
    mockConnected();
    mockGetWellnessRange.mockResolvedValue(NEW_ATHLETE_THREE_WEEKS_TO_TODAY);

    const hook = await renderSettled();

    mockGetWellnessRange.mockRejectedValue(new IntervalsApiError(403));
    await refetchAndSettle(hook);

    expect(hook.result.current.state).toEqual({ status: 'needsScope' });
  });

  it('fails with a retry when the read fails for any other reason', async () => {
    mockConnected();
    mockGetWellnessRange.mockRejectedValue(new IntervalsApiError(500));

    const { result } = await renderSettled();

    expect(result.current.state).toEqual({ status: 'error' });
  });

  it('keeps the chart when a refetch fails', async () => {
    mockConnected();
    mockGetWellnessRange.mockResolvedValue(NEW_ATHLETE_THREE_WEEKS_TO_TODAY);

    const hook = await renderSettled();
    const loaded = hook.result.current.state;

    mockGetWellnessRange.mockRejectedValue(new Error('Network request failed'));
    await refetchAndSettle(hook);

    expect(mockGetWellnessRange).toHaveBeenCalledTimes(2);
    expect(loaded.status).toBe('ready');
    expect(hook.result.current.state).toEqual(loaded);
  });

  it.each([
    ['no rows', []],
    [
      'rows without values',
      [
        { id: '2026-11-05', ctl: null, atl: null, ctlLoad: null },
        { id: TODAY, ctl: null, atl: null, ctlLoad: null },
      ],
    ],
  ])('is empty when the year has %s', async (_name, rows) => {
    mockConnected();
    mockGetWellnessRange.mockResolvedValue(rows);

    const { result } = await renderSettled();

    expect(result.current.state).toEqual({ status: 'empty' });
  });

  it('draws a year whose only values are long past, with today missing', async () => {
    mockConnected();
    mockGetWellnessRange.mockResolvedValue([
      { id: '2025-11-07', ctl: 12, atl: 9, ctlLoad: 30 },
    ]);

    const { result } = await renderSettled();

    expect(result.current.state).toMatchObject({ status: 'ready' });
  });

  it('reads the year ending today once, as a day for every date, cached for today', async () => {
    mockConnected();
    mockGetWellnessRange.mockResolvedValue(NEW_ATHLETE_THREE_WEEKS_TO_TODAY);

    const { result, client } = await renderSettled();
    const { state } = result.current;

    expect(state.status).toBe('ready');

    const days = state.status === 'ready' ? state.days : [];

    expect(days).toHaveLength(365);
    expect(days[0]).toEqual({
      date: '2025-11-07',
      fitness: null,
      fatigue: null,
      form: null,
      load: null,
    });
    expect(days[344]).toEqual({
      date: '2026-10-17',
      fitness: 0,
      fatigue: 0,
      form: 0,
      load: 0,
    });
    expect(days.slice(-2)).toEqual([
      { date: '2026-11-05', fitness: 10, fatigue: 31, form: -21, load: 64 },
      { date: TODAY, fitness: 10, fatigue: 34, form: -24, load: 0 },
    ]);
    expect(mockGetWellnessRange).toHaveBeenCalledTimes(1);
    expect(mockGetWellnessRange).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      {
        oldest: '2025-11-07',
        newest: TODAY,
        fields: ['id', 'ctl', 'atl', 'ctlLoad'],
      },
      expect.anything(),
    );
    expect(
      client.getQueryData(['intervals', 'athlete-1', 'fitness', TODAY]),
    ).toEqual(days);
  });

  it('fills in once a reconnect grants Wellness, without a restart', async () => {
    mockConnected(SCOPE_FROM_BEFORE_WELLNESS_WAS_ASKED_FOR);
    mockGetWellnessRange.mockResolvedValue(NEW_ATHLETE_THREE_WEEKS_TO_TODAY);

    const { result, rerender } = await renderHookWithClient(() =>
      useFitnessChart(),
    );

    expect(result.current.state).toEqual({ status: 'needsScope' });

    mockConnected(FULL_CONSENT_SCOPE);
    await rerender({});

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ status: 'ready' }),
    );
  });

  it('reads the year ending the new day at midnight, loading until it arrives', async () => {
    mockConnected();
    mockGetWellnessRange.mockResolvedValue(NEW_ATHLETE_THREE_WEEKS_TO_TODAY);

    const { result, rerender } = await renderSettled();

    let resolveNextYear: (rows: IntervalsWellnessDay[]) => void = () => {};

    mockGetWellnessRange.mockReturnValue(
      new Promise(resolve => {
        resolveNextYear = resolve;
      }),
    );
    mockUseToday.mockReturnValue('2026-11-07');
    await rerender({});

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockGetWellnessRange).toHaveBeenLastCalledWith(
      'token-1',
      'athlete-1',
      expect.objectContaining({ oldest: '2025-11-08', newest: '2026-11-07' }),
      expect.anything(),
    );

    resolveNextYear([{ id: '2026-11-07', ctl: 11.2, atl: 30.4, ctlLoad: 0 }]);

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ status: 'ready' }),
    );

    const { state } = result.current;
    const days = state.status === 'ready' ? state.days : [];

    expect(days).toHaveLength(365);
    expect(days[0].date).toBe('2025-11-08');
    expect(days[364]).toEqual({
      date: '2026-11-07',
      fitness: 11,
      fatigue: 30,
      form: -19,
      load: 0,
    });
  });

  it('refetch reads the year again', async () => {
    mockConnected();
    mockGetWellnessRange.mockResolvedValue([]);

    const hook = await renderSettled();

    expect(hook.result.current.state).toEqual({ status: 'empty' });

    mockGetWellnessRange.mockResolvedValue(NEW_ATHLETE_THREE_WEEKS_TO_TODAY);
    await refetchAndSettle(hook);

    expect(mockGetWellnessRange).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state).toMatchObject({ status: 'ready' });
  });

  it('refetch retries a failed read', async () => {
    mockConnected();
    mockGetWellnessRange.mockRejectedValue(new IntervalsApiError(500));

    const hook = await renderSettled();

    expect(hook.result.current.state).toEqual({ status: 'error' });

    mockGetWellnessRange.mockResolvedValue(NEW_ATHLETE_THREE_WEEKS_TO_TODAY);
    await refetchAndSettle(hook);

    expect(hook.result.current.state).toMatchObject({ status: 'ready' });
  });
});
