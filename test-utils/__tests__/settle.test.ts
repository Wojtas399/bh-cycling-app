import { renderHookWithClient } from '../queryClient';
import { flushPromises, settleQueries } from '../settle';
import { useQuery } from '@tanstack/react-query';

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn(),
}));

describe('flushPromises', () => {
  it('resolves once promise callbacks and zero-delay timers already queued have run', async () => {
    const ran: string[] = [];

    void Promise.resolve().then(() => ran.push('promise callback'));
    setTimeout(() => ran.push('zero-delay timer'), 0);

    await flushPromises();

    expect(ran).toEqual(['promise callback', 'zero-delay timer']);
  });
});

describe('settleQueries', () => {
  it('hands a query that has settled to the hook that reads it, with no waitFor', async () => {
    const { result } = await renderHookWithClient(() =>
      useQuery({ queryKey: ['settle'], queryFn: async () => 'loaded' }),
    );

    await settleQueries();

    expect(result.current.data).toBe('loaded');
  });
});
