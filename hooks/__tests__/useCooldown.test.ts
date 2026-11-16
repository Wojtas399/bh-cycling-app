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

  it('counts down again when restarted after it finished', async () => {
    const { result } = await renderHook(() => useCooldown(60));

    await act(async () => {
      result.current.start();
    });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.remaining).toBe(0);

    await act(async () => {
      result.current.start();
    });
    expect(result.current.remaining).toBe(60);

    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(result.current.remaining).toBe(59);
  });

  it('does not re-render while idle', async () => {
    let renders = 0;

    await renderHook(() => {
      renders += 1;

      return useCooldown(60);
    });
    const rendersWhenMounted = renders;

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(renders).toBe(rendersWhenMounted);
  });

  it('stops re-rendering once it reaches zero', async () => {
    let renders = 0;
    const { result } = await renderHook(() => {
      renders += 1;

      return useCooldown(60);
    });

    await act(async () => {
      result.current.start();
    });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    const rendersAtZero = renders;

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(result.current.remaining).toBe(0);
    expect(renders).toBe(rendersAtZero);
  });

  it('starts from the full length while another cooldown is counting down', async () => {
    const { result } = await renderHook(() => ({
      first: useCooldown(60),
      second: useCooldown(60),
    }));

    await act(async () => {
      result.current.first.start();
    });
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await act(async () => {
      result.current.second.start();
    });

    expect(result.current.second.remaining).toBe(60);
  });
});
