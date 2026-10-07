import { disconnectIntervalsHandler } from '../disconnect';
import { revokeIntervalsToken } from '../revokeToken';
import type { CallableRequest } from 'firebase-functions/v2/https';

const callOrder: string[] = [];
const deleteMock = jest.fn(async () => {
  callOrder.push('delete');
});
const docMock = jest.fn(() => ({ delete: deleteMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: docMock }),
}));

jest.mock('../revokeToken', () => ({
  revokeIntervalsToken: jest.fn(async () => {
    callOrder.push('revoke');
  }),
}));

function buildRequest(uid: string): CallableRequest<unknown> {
  return {
    data: undefined,
    auth: uid ? { uid, token: {} as never } : undefined,
  } as CallableRequest<unknown>;
}

describe('disconnectIntervalsHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
  });

  it('deletes the calling user integration document', async () => {
    const result = await disconnectIntervalsHandler(buildRequest('user-1'));

    expect(docMock).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(deleteMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('revokes the Intervals.icu token before deleting the document', async () => {
    await disconnectIntervalsHandler(buildRequest('user-1'));

    expect(revokeIntervalsToken).toHaveBeenCalledWith('user-1');
    expect(callOrder).toEqual(['revoke', 'delete']);
  });

  it('rejects an unauthenticated call', async () => {
    await expect(
      disconnectIntervalsHandler(buildRequest('')),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(revokeIntervalsToken).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
