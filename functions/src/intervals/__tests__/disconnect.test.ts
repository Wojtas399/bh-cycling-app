import { callableRequest } from '../../../test-utils/callableRequest';
import { disconnectIntervalsHandler } from '../disconnect';
import { revokeIntervalsToken } from '../revokeToken';

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

describe('disconnectIntervalsHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
  });

  it('deletes the calling user integration document', async () => {
    const result = await disconnectIntervalsHandler(
      callableRequest(undefined, { uid: 'user-1' }),
    );

    expect(docMock).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(deleteMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('revokes the Intervals.icu token before deleting the document', async () => {
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
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
