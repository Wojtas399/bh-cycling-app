import { useCooldown } from '../useCooldown';
import { act, renderHook } from '@testing-library/react-native';

describe('useCooldown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is idle until started', async () => {
    const { result } = await renderHook(() => useCooldown(60));

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(result.current.remaining).toBe(0);
  });

  it('counts down one second at a time once started', async () => {
    const { result } = await renderHook(() => useCooldown(60));

    await act(async () => {
      result.current.start();
    });
    expect(result.current.remaining).toBe(60);

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    expect(result.current.remaining).toBe(57);
  });

  it('stops at zero', async () => {
    const { result } = await renderHook(() => useCooldown(60));

    await act(async () => {
      result.current.start();
    });
    await act(async () => {
      jest.advanceTimersByTime(90_000);
    });

    expect(result.current.remaining).toBe(0);
  });

  it('can start running on mount', async () => {
    const { result } = await renderHook(() =>
      useCooldown(60, { startActive: true }),
    );

    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    expect(result.current.remaining).toBe(59);
  });

  it('restarts from the full length', async () => {
    const { result } = await renderHook(() => useCooldown(60));

    await act(async () => {
      result.current.start();
    });
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    await act(async () => {
      result.current.start();
    });

    expect(result.current.remaining).toBe(60);
  });
});
