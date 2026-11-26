import { callableRequest } from '../../../test-utils/callableRequest';
import { disconnectIntervalsHandler } from '../disconnect';
import { revokeIntervalsToken } from '../revokeToken';

const callOrder: string[] = [];
const mockStoredDocs = new Set<string>();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: (path: string) => ({ path }),
    batch: () => {
      const deletes: string[] = [];
      const batch = {
        delete: ({ path }: { path: string }) => {
          deletes.push(path);

          return batch;
        },
        commit: async () => {
          callOrder.push('delete');
          deletes.forEach(path => mockStoredDocs.delete(path));
        },
      };

      return batch;
    },
  }),
}));

jest.mock('../revokeToken', () => ({
  revokeIntervalsToken: jest.fn(async () => {
    callOrder.push('revoke');
  }),
}));

const INTEGRATION_PATH = 'users/user-1/integrations/intervals';
const CONSENT_PATH = 'users/user-1/consents/healthData';

describe('disconnectIntervalsHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    mockStoredDocs.clear();
    mockStoredDocs.add(INTEGRATION_PATH);
    mockStoredDocs.add(CONSENT_PATH);
  });

  it('deletes the calling user integration document', async () => {
    const result = await disconnectIntervalsHandler(
      callableRequest(undefined, { uid: 'user-1' }),
    );

    expect(mockStoredDocs.has(INTEGRATION_PATH)).toBe(false);
    expect(result).toEqual({ success: true });
  });

  it('deletes the Health Data Consent record too, so reconnecting asks for the consent again', async () => {
    await disconnectIntervalsHandler(
      callableRequest(undefined, { uid: 'user-1' }),
    );

    expect(mockStoredDocs.has(CONSENT_PATH)).toBe(false);
  });

  it('revokes the Intervals.icu token before deleting the documents', async () => {
    await disconnectIntervalsHandler(
      callableRequest(undefined, { uid: 'user-1' }),
    );

    expect(revokeIntervalsToken).toHaveBeenCalledWith('user-1');
    expect(callOrder).toEqual(['revoke', 'delete']);
  });

  it('rejects an unauthenticated call', async () => {
    await expect(
      disconnectIntervalsHandler(callableRequest(undefined)),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(revokeIntervalsToken).not.toHaveBeenCalled();
    expect(mockStoredDocs).toEqual(new Set([INTEGRATION_PATH, CONSENT_PATH]));
  });
});
