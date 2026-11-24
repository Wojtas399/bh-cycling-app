import {
  connectIntervals,
  disconnectIntervals,
  intervalsConnectionLoading,
} from '@/test-utils/intervalsConnection';

import { useTodayCards } from '../useTodayCards';
import { useIntervalsRefresh } from '@/hooks/useIntervalsRefresh';
import { useToday } from '@/hooks/useToday';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import {
  IntervalsApiError,
  type IntervalsWellness,
  getWellness,
} from '@/lib/intervalsApi';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { settleQueries } from '@/test-utils/settle';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useToday', () => ({
  useToday: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getWellness: jest.fn(),
}));

const mockUseToday = jest.mocked(useToday);
const mockGetWellness = jest.mocked(getWellness);

const TODAY = '2026-11-02';

const SCOPE_FROM_BEFORE_WELLNESS_WAS_ASKED_FOR = 'ACTIVITY:READ,CALENDAR:READ';

const DAY_WITHOUT_DATA_ALL_NULL = {
  ctl: null,
  atl: null,
  readiness: null,
  sleepSecs: null,
  sleepScore: null,
  hrv: null,
  hrvSDNN: null,
  restingHR: null,
};

const FULLY_FILLED_ENTRY = {
  ...DAY_WITHOUT_DATA_ALL_NULL,
  id: '2026-11-02',
  ctl: 42.6,
  atl: 50.4,
  readiness: 63,
  sleepSecs: 28620,
  sleepScore: 84,
  hrv: 52,
  restingHR: 48,
};

const FULLY_FILLED_ENTRY_WELLNESS_ROWS = [
  { key: 'readiness', value: '63' },
  { key: 'sleep', value: '7h 57m' },
  { key: 'sleepScore', value: '84' },
  { key: 'hrv', value: '52 ms' },
  { key: 'restingHr', value: '48 bpm' },
];

const FULLY_FILLED_ENTRY_ON_BOTH_CARDS = {
  status: 'ready',
  fitness: { fitness: 43, fatigue: 50, form: -7 },
  wellness: FULLY_FILLED_ENTRY_WELLNESS_ROWS,
};

async function refreshScreenAndSettle(hook: {
  result: { current: { refreshScreen: () => Promise<void> } };
}) {
  await act(() => hook.result.current.refreshScreen());
  await settleQueries();
}

async function renderSettled() {
  const rendered = await renderHookWithClient(() => useTodayCards());

  await waitFor(() =>
    expect(rendered.result.current.state.status).not.toBe('loading'),
  );

  return rendered;
}

async function renderSettledOnScreen() {
  const rendered = await renderHookWithClient(() => ({
    state: useTodayCards().state,
    refreshScreen: useIntervalsRefresh().refresh,
  }));

  await waitFor(() =>
    expect(rendered.result.current.state.status).not.toBe('loading'),
  );

  return rendered;
}

describe('useTodayCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
    mockUseToday.mockReturnValue(TODAY);
  });

  it('hides both cards and asks for nothing when not connected', async () => {
    disconnectIntervals();

    const { result } = await renderHookWithClient(() => useTodayCards());

    expect(result.current.state).toEqual({ status: 'hidden' });
    expect(mockGetWellness).not.toHaveBeenCalled();
  });

  it('hides both cards and asks for nothing once the token is known to be bad', async () => {
    connectIntervals();
    setNeedsReconnect(true);

    const { result } = await renderHookWithClient(() => useTodayCards());

    expect(result.current.state).toEqual({ status: 'hidden' });
    expect(mockGetWellness).not.toHaveBeenCalled();
  });

  it('is loading and asks for nothing while the connection itself resolves', async () => {
    intervalsConnectionLoading();

    const { result } = await renderHookWithClient(() => useTodayCards());

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockGetWellness).not.toHaveBeenCalled();
  });

  it('is loading while the entry is on its way', async () => {
    connectIntervals();
    mockGetWellness.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHookWithClient(() => useTodayCards());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('asks to reconnect, and asks for nothing, when the stored scope lacks Wellness', async () => {
    connectIntervals({ scope: SCOPE_FROM_BEFORE_WELLNESS_WAS_ASKED_FOR });

    const { result } = await renderHookWithClient(() => useTodayCards());

    expect(result.current.state).toEqual({ status: 'needsScope' });
    expect(mockGetWellness).not.toHaveBeenCalled();
  });

  it('needs no reconnect with Wellness granted but athlete settings not', async () => {
    connectIntervals({ scope: 'ACTIVITY:READ,CALENDAR:READ,WELLNESS:READ' });
    mockGetWellness.mockResolvedValue(FULLY_FILLED_ENTRY);

    const { result } = await renderSettled();

    expect(result.current.state).toEqual(FULLY_FILLED_ENTRY_ON_BOTH_CARDS);
  });

  it('asks to reconnect when the request is refused for its scope, without retrying it or the global reconnect', async () => {
    connectIntervals();
    mockGetWellness.mockRejectedValue(new IntervalsApiError(403));

    const { result } = await renderSettled();

    expect(result.current.state).toEqual({ status: 'needsScope' });
    expect(mockGetWellness).toHaveBeenCalledTimes(1);
    expect(handleIntervalsAuthError).not.toHaveBeenCalled();
  });

  it('asks to reconnect over values already shown when Wellness access is taken away', async () => {
    connectIntervals();
    mockGetWellness.mockResolvedValue(FULLY_FILLED_ENTRY);

    const hook = await renderSettledOnScreen();

    mockGetWellness.mockRejectedValue(new IntervalsApiError(403));
    await refreshScreenAndSettle(hook);

    expect(hook.result.current.state).toEqual({ status: 'needsScope' });
  });

  it('fills in once a reconnect grants Wellness, without a restart', async () => {
    connectIntervals({ scope: SCOPE_FROM_BEFORE_WELLNESS_WAS_ASKED_FOR });
    mockGetWellness.mockResolvedValue(FULLY_FILLED_ENTRY);

    const { result, rerender } = await renderHookWithClient(() =>
      useTodayCards(),
    );

    expect(result.current.state).toEqual({ status: 'needsScope' });

    connectIntervals();
    await rerender({});

    await waitFor(() =>
      expect(result.current.state).toEqual(FULLY_FILLED_ENTRY_ON_BOTH_CARDS),
    );
  });

  it('hides both cards when the request fails for any other reason', async () => {
    connectIntervals();
    mockGetWellness.mockRejectedValue(new IntervalsApiError(500));

    const { result } = await renderSettled();

    expect(result.current.state).toEqual({ status: 'hidden' });
  });

  it("shows a full entry on both cards, Form from the rounded values, read and cached for today's date", async () => {
    connectIntervals();
    mockGetWellness.mockResolvedValue(FULLY_FILLED_ENTRY);

    const { result, client } = await renderSettled();

    expect(result.current.state).toEqual(FULLY_FILLED_ENTRY_ON_BOTH_CARDS);
    expect(mockGetWellness).toHaveBeenCalledTimes(1);
    expect(mockGetWellness).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      TODAY,
      expect.anything(),
    );
    expect(
      client.getQueryData(['intervals', 'athlete-1', 'wellness', TODAY]),
    ).toEqual({
      fitness: FULLY_FILLED_ENTRY_ON_BOTH_CARDS.fitness,
      wellness: FULLY_FILLED_ENTRY_WELLNESS_ROWS,
    });
  });

  it("keeps today's values on both cards when a screen refresh fails", async () => {
    connectIntervals();
    mockGetWellness.mockResolvedValue(FULLY_FILLED_ENTRY);

    const hook = await renderSettledOnScreen();

    mockGetWellness.mockRejectedValue(new IntervalsApiError(500));
    await refreshScreenAndSettle(hook);

    expect(mockGetWellness).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state).toEqual(FULLY_FILLED_ENTRY_ON_BOTH_CARDS);
  });

  it.each([
    ['Fitness', { ctl: null }],
    ['Fatigue', { atl: null }],
    ['Fitness and Fatigue', { ctl: undefined, atl: undefined }],
  ])(
    'shows no Fitness values without %s, and the Wellness rows as they are',
    async (_name, missing) => {
      connectIntervals();
      mockGetWellness.mockResolvedValue({ ...FULLY_FILLED_ENTRY, ...missing });

      const { result } = await renderSettled();

      expect(result.current.state).toEqual({
        status: 'ready',
        fitness: null,
        wellness: FULLY_FILLED_ENTRY_WELLNESS_ROWS,
      });
    },
  );

  it('shows a real 0 from intervals.icu as 0, not as no data', async () => {
    connectIntervals();
    mockGetWellness.mockResolvedValue({
      ...DAY_WITHOUT_DATA_ALL_NULL,
      ctl: 0,
      atl: 0,
    });

    const { result } = await renderSettled();

    expect(result.current.state).toEqual({
      status: 'ready',
      fitness: { fitness: 0, fatigue: 0, form: 0 },
      wellness: [],
    });
  });

  it('shows neither values nor rows on a day without data, when every metric is null', async () => {
    connectIntervals();
    mockGetWellness.mockResolvedValue(DAY_WITHOUT_DATA_ALL_NULL);

    const { result } = await renderSettled();

    expect(result.current.state).toEqual({
      status: 'ready',
      fitness: null,
      wellness: [],
    });
  });

  it.each([
    [
      'a Garmin morning without readiness, as four rows',
      { readiness: null },
      [
        { key: 'sleep', value: '7h 57m' },
        { key: 'sleepScore', value: '84' },
        { key: 'hrv', value: '52 ms' },
        { key: 'restingHr', value: '48 bpm' },
      ],
    ],
    [
      'a partly synced morning, as its single metric',
      { ...DAY_WITHOUT_DATA_ALL_NULL, restingHR: 48 },
      [{ key: 'restingHr', value: '48 bpm' }],
    ],
    [
      'an Apple Watch morning with sleep and SDNN only, under the SDNN label',
      { ...DAY_WITHOUT_DATA_ALL_NULL, sleepSecs: 25200, hrvSDNN: 44 },
      [
        { key: 'sleep', value: '7h' },
        { key: 'hrvSdnn', value: '44 ms' },
      ],
    ],
    [
      'both HRV statistics as rMSSD alone',
      { ...DAY_WITHOUT_DATA_ALL_NULL, hrv: 52, hrvSDNN: 44 },
      [{ key: 'hrv', value: '52 ms' }],
    ],
    [
      'a 0 as a value',
      { ...DAY_WITHOUT_DATA_ALL_NULL, readiness: 0, sleepScore: 0 },
      [
        { key: 'readiness', value: '0' },
        { key: 'sleepScore', value: '0' },
      ],
    ],
    [
      'fractional values rounded to whole numbers',
      {
        ...DAY_WITHOUT_DATA_ALL_NULL,
        readiness: 62.5,
        sleepSecs: 28649,
        sleepScore: 83.6,
        hrv: 51.7,
        restingHR: 47.6,
      },
      [
        { key: 'readiness', value: '63' },
        { key: 'sleep', value: '7h 57m' },
        { key: 'sleepScore', value: '84' },
        { key: 'hrv', value: '52 ms' },
        { key: 'restingHr', value: '48 bpm' },
      ],
    ],
  ])('shows %s on the Wellness card', async (_name, entry, rows) => {
    connectIntervals();
    mockGetWellness.mockResolvedValue({ ...FULLY_FILLED_ENTRY, ...entry });

    const { result } = await renderSettled();

    expect(result.current.state).toMatchObject({
      status: 'ready',
      wellness: rows,
    });
  });

  it('reads the new day at midnight, loading until it arrives', async () => {
    connectIntervals();
    mockGetWellness.mockResolvedValue(FULLY_FILLED_ENTRY);

    const { result, rerender } = await renderSettled();

    let resolveNextDay: (entry: IntervalsWellness) => void = () => {};

    mockGetWellness.mockReturnValue(
      new Promise(resolve => {
        resolveNextDay = resolve;
      }),
    );
    mockUseToday.mockReturnValue('2026-11-03');
    await rerender({});

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockGetWellness).toHaveBeenLastCalledWith(
      'token-1',
      'athlete-1',
      '2026-11-03',
      expect.anything(),
    );

    resolveNextDay({ ...DAY_WITHOUT_DATA_ALL_NULL, ctl: 41.2, atl: 44.7 });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'ready',
        fitness: { fitness: 41, fatigue: 45, form: -4 },
        wellness: [],
      }),
    );
  });

  it('reads the entry again on a screen refresh, one request feeding both cards', async () => {
    connectIntervals();
    mockGetWellness.mockResolvedValue(DAY_WITHOUT_DATA_ALL_NULL);

    const hook = await renderSettledOnScreen();

    expect(hook.result.current.state).toEqual({
      status: 'ready',
      fitness: null,
      wellness: [],
    });

    mockGetWellness.mockResolvedValue({
      ...DAY_WITHOUT_DATA_ALL_NULL,
      ctl: 48.5,
      atl: 43.1,
      restingHR: 48,
    });
    await refreshScreenAndSettle(hook);

    expect(mockGetWellness).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state).toEqual({
      status: 'ready',
      fitness: { fitness: 49, fatigue: 43, form: 6 },
      wellness: [{ key: 'restingHr', value: '48 bpm' }],
    });
  });

  it('asks for nothing on a screen refresh once a reconnect takes Wellness away', async () => {
    connectIntervals();
    mockGetWellness.mockResolvedValue(FULLY_FILLED_ENTRY);

    const hook = await renderSettledOnScreen();

    connectIntervals({ scope: SCOPE_FROM_BEFORE_WELLNESS_WAS_ASKED_FOR });
    await hook.rerender({});
    await refreshScreenAndSettle(hook);

    expect(hook.result.current.state).toEqual({ status: 'needsScope' });
    expect(mockGetWellness).toHaveBeenCalledTimes(1);
  });
});
