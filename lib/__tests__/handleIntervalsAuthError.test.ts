import { handleIntervalsAuthError } from '../handleIntervalsAuthError';
import {
  getNeedsReconnect,
  setNeedsReconnect,
} from '../intervalsReconnectStore';
import { createQueryClient } from '../queryClient';

const INTERVALS_KEY = ['intervals', 'athlete-1', 'upcoming', '2026-10-11'];

const mockDelete = jest.fn();
const mockDoc = jest.fn(() => ({ delete: mockDelete }));

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ currentUser: { uid: 'user-1' } }),
  firestore: () => ({ doc: mockDoc }),
}));

describe('handleIntervalsAuthError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
    mockDelete.mockResolvedValue(undefined);
  });

  it('marks needs-reconnect before anything else', async () => {
    let needsReconnectAtWipe: boolean | undefined;
    const client = createQueryClient();
    const removeQueries = client.removeQueries.bind(client);

    jest.spyOn(client, 'removeQueries').mockImplementation(filters => {
      needsReconnectAtWipe = getNeedsReconnect();
      removeQueries(filters);
    });

    await handleIntervalsAuthError(client);

    expect(needsReconnectAtWipe).toBe(true);
  });

  it('wipes the Intervals queries, then deletes the integration document', async () => {
    const client = createQueryClient();

    client.setQueryData(INTERVALS_KEY, []);
    client.setQueryData(['other'], 'kept');

    await handleIntervalsAuthError(client);

    expect(getNeedsReconnect()).toBe(true);
    expect(client.getQueryData(INTERVALS_KEY)).toBeUndefined();
    expect(client.getQueryData(['other'])).toBe('kept');
    expect(mockDoc).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(mockDelete).toHaveBeenCalled();
  });

  it('still flags the reconnect and wipes the Intervals queries when deleting the integration document fails', async () => {
    const client = createQueryClient();

    client.setQueryData(INTERVALS_KEY, []);
    mockDelete.mockRejectedValueOnce(new Error('offline'));

    await expect(handleIntervalsAuthError(client)).rejects.toThrow('offline');

    expect(getNeedsReconnect()).toBe(true);
    expect(client.getQueryData(INTERVALS_KEY)).toBeUndefined();
  });
});
