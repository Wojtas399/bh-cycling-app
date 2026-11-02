import { useWellness } from '../useWellness';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { useToday } from '@/hooks/useToday';
import { handleIntervalsAuthError } from '@/lib/handleIntervalsAuthError';
import { IntervalsApiError, getWellness } from '@/lib/intervalsApi';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/hooks/useToday', () => ({
  useToday: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getWellness: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockUseToday = useToday as jest.Mock;
const mockGetWellness = getWellness as jest.Mock;

const TODAY = '2026-11-02';

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

/** What intervals.icu returns on a day without data: every metric `null`. */
const NO_DATA = {
  readiness: null,
  sleepSecs: null,
  sleepScore: null,
  hrv: null,
  hrvSDNN: null,
  restingHR: null,
};

/** A WHOOP morning: every metric the card shows is filled. */
const FULL_ENTRY = {
  ...NO_DATA,
  id: '2026-11-02',
  readiness: 63,
  sleepSecs: 28620,
  sleepScore: 84,
  hrv: 52,
  restingHR: 48,
};

/** Refetches, then lets React Query hand the settled state to the hook. */
async function refetch(hook: {
  result: { current: { refetch: () => Promise<void> } };
}) {
  await act(() => hook.result.current.refetch());
  // React Query hands the settled state to the hook on a later tick.
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

/** `FULL_ENTRY` on the card. */
const FULL_ROWS = {
  status: 'ready',
  rows: [
    { key: 'readiness', value: '63' },
    { key: 'sleep', value: '7h 57m' },
    { key: 'sleepScore', value: '84' },
    { key: 'hrv', value: '52 ms' },
    { key: 'restingHr', value: '48 bpm' },
  ],
};

async function renderReady() {
  const rendered = await renderHookWithClient(() => useWellness());

  await waitFor(() =>
    expect(rendered.result.current.state.status).not.toBe('loading'),
  );

  return rendered;
}

describe('useWellness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToday.mockReturnValue(TODAY);
  });

  it('is hidden and asks for nothing when not connected', async () => {
    mockConnection();

    const { result } = await renderHookWithClient(() => useWellness());

    expect(result.current.state).toEqual({ status: 'hidden' });
    expect(mockGetWellness).not.toHaveBeenCalled();
  });

  it('is loading and asks for nothing while the connection itself resolves', async () => {
    mockConnection({ loading: true });

    const { result } = await renderHookWithClient(() => useWellness());

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(mockGetWellness).not.toHaveBeenCalled();
  });

  it('is loading while the entry is on its way', async () => {
    mockConnected();
    mockGetWellness.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHookWithClient(() => useWellness());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it("shows a full entry as five rows in a fixed order, read and cached for today's date", async () => {
    mockConnected();
    mockGetWellness.mockResolvedValue(FULL_ENTRY);

    const { result, client } = await renderReady();

    expect(result.current.state).toEqual(FULL_ROWS);
    expect(mockGetWellness).toHaveBeenCalledWith(
      'token-1',
      'athlete-1',
      TODAY,
      expect.anything(),
    );
    expect(
      client.getQueryData(['intervals', 'athlete-1', 'wellness', TODAY]),
    ).toEqual(FULL_ROWS.rows);
  });

  it('is empty on a day without data, when every metric is null', async () => {
    mockConnected();
    mockGetWellness.mockResolvedValue({ ...NO_DATA, id: '2026-11-02' });

    const { result } = await renderReady();

    expect(result.current.state).toEqual({ status: 'empty' });
  });

  it('is empty when only the always-filled fields have values', async () => {
    mockConnected();
    mockGetWellness.mockResolvedValue({
      ...NO_DATA,
      id: '2026-11-02',
      ctl: 42.3,
      atl: 51.8,
      updated: '2026-11-02T06:12:00.000+00:00',
    });

    const { result } = await renderReady();

    expect(result.current.state).toEqual({ status: 'empty' });
  });

  it('is hidden when the request fails with a missing-scope 403, without retrying it or asking the athlete to reconnect', async () => {
    mockConnected();
    mockGetWellness.mockRejectedValue(new IntervalsApiError(403));

    const { result } = await renderReady();

    expect(result.current.state).toEqual({ status: 'hidden' });
    expect(mockGetWellness).toHaveBeenCalledTimes(1);
    expect(handleIntervalsAuthError).not.toHaveBeenCalled();
  });

  it('is hidden when the request fails for any other reason', async () => {
    mockConnected();
    mockGetWellness.mockRejectedValue(new IntervalsApiError(500));

    const { result } = await renderReady();

    expect(result.current.state).toEqual({ status: 'hidden' });
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
      { ...NO_DATA, restingHR: 48 },
      [{ key: 'restingHr', value: '48 bpm' }],
    ],
    [
      'an Apple Watch morning with sleep and SDNN only, under the SDNN label',
      { ...NO_DATA, sleepSecs: 25200, hrvSDNN: 44 },
      [
        { key: 'sleep', value: '7h' },
        { key: 'hrvSdnn', value: '44 ms' },
      ],
    ],
    [
      'both HRV statistics as rMSSD alone',
      { ...NO_DATA, hrv: 52, hrvSDNN: 44 },
      [{ key: 'hrv', value: '52 ms' }],
    ],
    [
      'a 0 as a value',
      { ...NO_DATA, readiness: 0, sleepScore: 0 },
      [
        { key: 'readiness', value: '0' },
        { key: 'sleepScore', value: '0' },
      ],
    ],
    [
      'fractional values rounded to whole numbers',
      {
        ...NO_DATA,
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
  ])('shows %s', async (_name, entry, rows) => {
    mockConnected();
    mockGetWellness.mockResolvedValue({ ...FULL_ENTRY, ...entry });

    const { result } = await renderReady();

    expect(result.current.state).toEqual({ status: 'ready', rows });
  });

  it('reads the new day at midnight, loading until it arrives', async () => {
    mockConnected();
    mockGetWellness.mockResolvedValue(FULL_ENTRY);

    const { result, rerender } = await renderReady();

    let resolveNextDay: (entry: typeof NO_DATA) => void = () => {};

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

    resolveNextDay(NO_DATA);

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'empty' }),
    );
  });

  it('refetch reads the entry again, resolving once it arrives', async () => {
    mockConnected();
    mockGetWellness.mockResolvedValue(NO_DATA);

    const hook = await renderReady();

    expect(hook.result.current.state).toEqual({ status: 'empty' });

    mockGetWellness.mockResolvedValue({ ...NO_DATA, restingHR: 48 });
    await refetch(hook);

    expect(mockGetWellness).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state).toEqual({
      status: 'ready',
      rows: [{ key: 'restingHr', value: '48 bpm' }],
    });
  });

  it("keeps showing today's rows when a refetch fails", async () => {
    mockConnected();
    mockGetWellness.mockResolvedValue(FULL_ENTRY);

    const hook = await renderReady();

    mockGetWellness.mockRejectedValue(new IntervalsApiError(500));
    await refetch(hook);

    expect(mockGetWellness).toHaveBeenCalledTimes(2);
    expect(hook.result.current.state).toEqual(FULL_ROWS);
  });
});
