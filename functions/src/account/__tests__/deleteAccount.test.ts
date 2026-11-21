import { revokeIntervalsToken } from '../../intervals/revokeToken';
import { deleteAccountHandler } from '../deleteAccount';
import type { CallableRequest } from 'firebase-functions/v2/https';

const callOrder: string[] = [];
const userRef = { path: 'users/user-1' };
const docMock = jest.fn((_path: string) => userRef);
const recursiveDeleteMock = jest.fn(async (_ref: unknown) => {
  callOrder.push('recursiveDelete');
});
const deleteUserMock = jest.fn(async (_uid: string) => {
  callOrder.push('deleteUser');
});

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: docMock, recursiveDelete: recursiveDeleteMock }),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ deleteUser: deleteUserMock }),
}));

jest.mock('../../intervals/revokeToken', () => ({
  revokeIntervalsToken: jest.fn(async () => {
    callOrder.push('revoke');
  }),
}));

const NOW_MS = 1_700_000_000_000;
const nowSeconds = NOW_MS / 1000;

function buildRequest(
  options: { uid?: string; authTimeSecondsAgo?: number | null } = {},
): CallableRequest<unknown> {
  const { uid = 'user-1', authTimeSecondsAgo = 10 } = options;

  if (!uid) return { data: undefined } as CallableRequest<unknown>;

  return {
    data: undefined,
    auth: {
      uid,
      token:
        authTimeSecondsAgo === null
          ? {}
          : { auth_time: nowSeconds - authTimeSecondsAgo },
    },
  } as unknown as CallableRequest<unknown>;
}

describe('deleteAccountHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects an unauthenticated call', async () => {
    await expect(
      deleteAccountHandler(buildRequest({ uid: '' })),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(callOrder).toEqual([]);
  });

  it('rejects a stale auth_time with failed-precondition and deletes nothing, since the Admin SDK skips the recent-login check', async () => {
    await expect(
      deleteAccountHandler(buildRequest({ authTimeSecondsAgo: 5 * 60 + 1 })),
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    expect(callOrder).toEqual([]);
  });

  it('rejects a token without auth_time', async () => {
    await expect(
      deleteAccountHandler(buildRequest({ authTimeSecondsAgo: null })),
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    expect(callOrder).toEqual([]);
  });

  it('accepts an auth_time exactly at the 5 minute limit', async () => {
    await expect(
      deleteAccountHandler(buildRequest({ authTimeSecondsAgo: 5 * 60 })),
    ).resolves.toEqual({ success: true });
  });

  it('revokes the integration, deletes users/{uid} recursively, then the Auth user last', async () => {
    const result = await deleteAccountHandler(buildRequest());

    expect(revokeIntervalsToken).toHaveBeenCalledWith('user-1');
    expect(docMock).toHaveBeenCalledWith('users/user-1');
    expect(recursiveDeleteMock).toHaveBeenCalledWith(userRef);
    expect(deleteUserMock).toHaveBeenCalledWith('user-1');
    expect(callOrder).toEqual(['revoke', 'recursiveDelete', 'deleteUser']);
    expect(result).toEqual({ success: true });
  });

  it('succeeds on retry when the Auth user is already deleted', async () => {
    deleteUserMock.mockRejectedValueOnce({ code: 'auth/user-not-found' });

    await expect(deleteAccountHandler(buildRequest())).resolves.toEqual({
      success: true,
    });
  });

  it('keeps the Auth user when the Firestore deletion fails, so a retry still passes the sign-in check', async () => {
    recursiveDeleteMock.mockRejectedValueOnce(new Error('firestore down'));

    await expect(deleteAccountHandler(buildRequest())).rejects.toThrow(
      'firestore down',
    );

    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('propagates other Auth deletion errors', async () => {
    deleteUserMock.mockRejectedValueOnce({ code: 'auth/internal-error' });

    await expect(deleteAccountHandler(buildRequest())).rejects.toMatchObject({
      code: 'auth/internal-error',
    });
  });
});
