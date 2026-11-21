import { AppState, type AppStateStatus } from 'react-native';

import { useToday } from '../useToday';
import { act, renderHook } from '@testing-library/react-native';

describe('useToday', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('is today as a local date string', async () => {
    jest.setSystemTime(new Date(2026, 9, 5, 12));

    const { result } = await renderHook(() => useToday());

    expect(result.current).toBe('2026-10-05');
  });

  it('rolls over at midnight while mounted', async () => {
    jest.setSystemTime(new Date(2026, 9, 5, 23, 59, 30));

    const { result } = await renderHook(() => useToday());

    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });

    expect(result.current).toBe('2026-10-06');
  });

  it('rolls over at every midnight, not only the first', async () => {
    jest.setSystemTime(new Date(2026, 9, 5, 23, 59, 30));

    const { result } = await renderHook(() => useToday());

    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });
    await act(async () => {
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    });

    expect(result.current).toBe('2026-10-07');
  });

  it('updates when the app returns to the foreground after being suspended through midnight, with no timer fired', async () => {
    const appStateChanged = captureAppStateListener();

    jest.setSystemTime(new Date(2026, 9, 5, 22));

    const { result } = await renderHook(() => useToday());

    jest.setSystemTime(new Date(2026, 9, 6, 8));
    await act(async () => {
      appStateChanged('active');
    });

    expect(result.current).toBe('2026-10-06');
  });
});

function captureAppStateListener() {
  let listener: ((state: AppStateStatus) => void) | undefined;

  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, handler) => {
      listener = handler;

      return { remove: jest.fn() };
    });

  return (state: AppStateStatus) => listener?.(state);
}
