import { handleIntervalsAuthError } from '../handleIntervalsAuthError';
import { IntervalsAuthError } from '../intervalsApi';
import { removeIntervalsQueries } from '../intervalsQueries';
import { createQueryClient } from '../queryClient';

jest.mock('../handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

const mockHandleIntervalsAuthError = handleIntervalsAuthError as jest.Mock;

describe('createQueryClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes an IntervalsAuthError to the auth-error handler once, without retrying', async () => {
    const client = createQueryClient();
    const queryFn = jest.fn().mockRejectedValue(new IntervalsAuthError());

    await expect(
      client.fetchQuery({ queryKey: ['intervals', 'athlete-1', 'x'], queryFn }),
    ).rejects.toBeInstanceOf(IntervalsAuthError);

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(mockHandleIntervalsAuthError).toHaveBeenCalledTimes(1);
    expect(mockHandleIntervalsAuthError).toHaveBeenCalledWith(client);
  });

  it('leaves any other error alone', async () => {
    const client = createQueryClient();

    await expect(
      client.fetchQuery({
        queryKey: ['intervals', 'athlete-1', 'x'],
        queryFn: () => Promise.reject(new Error('network down')),
      }),
    ).rejects.toThrow('network down');

    expect(mockHandleIntervalsAuthError).not.toHaveBeenCalled();
  });
});

describe('removeIntervalsQueries', () => {
  it('aborts a pending Intervals request and drops it so a late response never refills the cache', async () => {
    const client = createQueryClient();
    let resolveLate: (value: string) => void = () => {};
    let requestSignal: AbortSignal | undefined;
    const intervalsKey = ['intervals', 'athlete-1', 'upcoming', '2026-10-11'];
    const otherKey = ['other'];

    client.setQueryData(otherKey, 'kept');

    const pending = client
      .fetchQuery({
        queryKey: intervalsKey,
        queryFn: ({ signal }) => {
          requestSignal = signal;

          return new Promise<string>(resolve => {
            resolveLate = resolve;
          });
        },
      })
      .catch(() => {});

    await removeIntervalsQueries(client);

    expect(requestSignal?.aborted).toBe(true);

    resolveLate('late');
    await pending;

    expect(client.getQueryData(intervalsKey)).toBeUndefined();
    expect(client.getQueryData(otherKey)).toBe('kept');
  });
});
