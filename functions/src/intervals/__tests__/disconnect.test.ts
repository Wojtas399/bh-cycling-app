import { disconnectIntervalsHandler } from '../disconnect';
import type { CallableRequest } from 'firebase-functions/v2/https';

const deleteMock = jest.fn().mockResolvedValue(undefined);
const docMock = jest.fn(() => ({ delete: deleteMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: docMock }),
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
  });

  it('deletes the calling user integration document', async () => {
    const result = await disconnectIntervalsHandler(buildRequest('user-1'));

    expect(docMock).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(deleteMock).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('rejects an unauthenticated call', async () => {
    await expect(
      disconnectIntervalsHandler(buildRequest('')),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(deleteMock).not.toHaveBeenCalled();
  });
});
