import {
  getNeedsReconnect,
  setNeedsReconnect,
} from '../intervalsReconnectStore';
import { queryClient } from '../queryClient';
import { signOutAndClear } from '../signOutAndClear';

const callOrder: string[] = [];
const mockAuthSignOut = jest.fn(async () => {
  callOrder.push('auth.signOut');
});
const mockGoogleSignOut = jest.fn(async () => {
  callOrder.push('google.signOut');
});

jest.mock('../firebase', () => ({
  auth: () => ({ signOut: mockAuthSignOut }),
  GoogleSignin: { signOut: () => mockGoogleSignOut() },
}));

const queryClientClear = jest.spyOn(queryClient, 'clear');

describe('signOutAndClear', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    setNeedsReconnect(false);
    queryClientClear.mockImplementation(() => {
      callOrder.push('queryClient.clear');
    });
  });

  it('clears the query client, signs out of Google, then signs out of Firebase', async () => {
    await signOutAndClear();

    expect(queryClientClear).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual([
      'queryClient.clear',
      'google.signOut',
      'auth.signOut',
    ]);
  });

  it('resets the reconnect store', async () => {
    setNeedsReconnect(true);

    await signOutAndClear();

    expect(getNeedsReconnect()).toBe(false);
  });

  it('still signs out of Firebase when Google sign-out fails', async () => {
    mockGoogleSignOut.mockRejectedValueOnce(new Error('no google session'));

    await signOutAndClear();

    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
  });

  it('still signs out of Firebase when Google sign-out throws before returning a promise', async () => {
    mockGoogleSignOut.mockImplementationOnce(() => {
      throw new Error('no google session');
    });

    await signOutAndClear();

    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
  });
});
