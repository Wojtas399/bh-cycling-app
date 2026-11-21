import { useRefetchQuery } from '../useRefetchQuery';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { settleQueries } from '@/test-utils/settle';
import { type QueryKey, useQuery } from '@tanstack/react-query';
import { act } from '@testing-library/react-native';

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn(),
}));

describe('useRefetchQuery', () => {
  it('refetches the query under exactly its key, and none under a longer one', async () => {
    const fetchExact = jest.fn().mockResolvedValue('exact');
    const fetchLonger = jest.fn().mockResolvedValue('longer');
    const { result } = await renderHookWithClient(() => {
      useQuery({ queryKey: ['note', 1], queryFn: fetchExact });
      useQuery({ queryKey: ['note', 1, 'extra'], queryFn: fetchLonger });

      return useRefetchQuery(['note', 1]);
    });

    await settleQueries();
    await act(() => result.current());
    await settleQueries();

    expect(fetchExact).toHaveBeenCalledTimes(2);
    expect(fetchLonger).toHaveBeenCalledTimes(1);
  });

  it('keeps the same function across renders while the key is equal', async () => {
    let queryKey: QueryKey = ['note', 1];
    const { result, rerender } = await renderHookWithClient(() =>
      useRefetchQuery(queryKey),
    );
    const first = result.current;

    queryKey = ['note', 1];
    await rerender(undefined);

    expect(result.current).toBe(first);
  });

  it('returns a new function once the key changes', async () => {
    let queryKey: QueryKey = ['note', 1];
    const { result, rerender } = await renderHookWithClient(() =>
      useRefetchQuery(queryKey),
    );
    const first = result.current;

    queryKey = ['note', 2];
    await rerender(undefined);

    expect(result.current).not.toBe(first);
  });
});
