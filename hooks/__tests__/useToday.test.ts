import { useToday } from '../useToday';
import { act, renderHook } from '@testing-library/react-native';

describe('useToday', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
});
