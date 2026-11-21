import { createTestQueryClient } from '../queryClient';

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn(),
}));

describe('createTestQueryClient', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('leaves no garbage-collection timer pending once a mutation settles, so Jest can exit', async () => {
    jest.useFakeTimers();
    const client = createTestQueryClient();

    await client
      .getMutationCache()
      .build(client, { mutationFn: async () => 'saved' })
      .execute(undefined);
    await jest.advanceTimersByTimeAsync(0);

    expect(jest.getTimerCount()).toBe(0);
  });
});
