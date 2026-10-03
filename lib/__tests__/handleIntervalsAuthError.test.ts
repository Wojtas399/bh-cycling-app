import { handleIntervalsAuthError } from '../handleIntervalsAuthError';
import { IntervalsAuthError } from '../intervalsApi';
import {
  getNeedsReconnect,
  setNeedsReconnect,
} from '../intervalsReconnectStore';

const mockDelete = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn(() => ({ delete: mockDelete }));

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ currentUser: { uid: 'user-1' } }),
  firestore: () => ({ doc: mockDoc }),
}));

describe('handleIntervalsAuthError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNeedsReconnect(false);
  });

  it('deletes the integration document and marks needs-reconnect', async () => {
    await handleIntervalsAuthError(new IntervalsAuthError());

    expect(mockDoc).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(mockDelete).toHaveBeenCalled();
    expect(getNeedsReconnect()).toBe(true);
  });

  it('still marks needs-reconnect when deleting the integration document fails', async () => {
    mockDelete.mockRejectedValueOnce(new Error('offline'));

    await expect(
      handleIntervalsAuthError(new IntervalsAuthError()),
    ).rejects.toThrow('offline');

    expect(getNeedsReconnect()).toBe(true);
  });
});
