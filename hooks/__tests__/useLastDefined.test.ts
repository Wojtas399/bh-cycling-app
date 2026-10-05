import { useLastDefined } from '../useLastDefined';
import { renderHook } from '@testing-library/react-native';

describe('useLastDefined', () => {
  it('returns the value while it is defined', async () => {
    const { result } = await renderHook(() => useLastDefined('a'));

    expect(result.current).toBe('a');
  });

  it('keeps the last defined value once the value goes null', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string | null }) => useLastDefined(value),
      { initialProps: { value: 'a' as string | null } },
    );

    await rerender({ value: null });

    expect(result.current).toBe('a');

    await rerender({ value: 'b' });

    expect(result.current).toBe('b');
  });

  it('is null when it was never defined', async () => {
    const { result } = await renderHook(() => useLastDefined(null));

    expect(result.current).toBeNull();
  });
});
