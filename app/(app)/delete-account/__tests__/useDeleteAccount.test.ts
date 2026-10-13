import { useDeleteAccount } from '../useDeleteAccount';
import { consumeAccountDeleted } from '@/lib/accountDeletedStore';
import { signOutAndClear } from '@/lib/signOutAndClear';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

const callOrder: string[] = [];
const mockReauthenticate = jest.fn();
const mockGetIdToken = jest.fn();
const mockDeleteAccountCallable = jest.fn();
const mockHttpsCallable = jest.fn();
const mockHasPlayServices = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockGoogleSignOut = jest.fn();
let mockProviderIds: string[] = [];

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
  isErrorWithCode: (e: unknown) =>
    typeof e === 'object' && e !== null && 'code' in e,
}));

jest.mock('@/lib/signOutAndClear', () => ({
  signOutAndClear: jest.fn(async () => {
    callOrder.push('signOutAndClear');
  }),
}));

jest.mock('@/lib/firebase', () => {
  const auth = () => ({
    currentUser: {
      email: 'rider@example.com',
      get providerData() {
        return mockProviderIds.map(providerId => ({ providerId }));
      },
      reauthenticateWithCredential: (credential: unknown) =>
        mockReauthenticate(credential),
      getIdToken: (force: boolean) => mockGetIdToken(force),
    },
  });

  auth.EmailAuthProvider = {
    credential: (email: string, password: string) => ({
      kind: 'email',
      email,
      password,
    }),
  };
  auth.GoogleAuthProvider = {
    credential: (idToken: string) => ({ kind: 'google', idToken }),
  };

  return {
    auth,
    functions: () => ({ httpsCallable: mockHttpsCallable }),
    GoogleSignin: {
      hasPlayServices: () => mockHasPlayServices(),
      signIn: () => mockGoogleSignIn(),
      signOut: () => mockGoogleSignOut(),
    },
  };
});

async function setup(providerIds: string[]) {
  mockProviderIds = providerIds;

  return renderHookWithClient(() => useDeleteAccount());
}

type Hook = Awaited<ReturnType<typeof setup>>;

async function enterPassword(hook: Hook, value: string) {
  await act(async () => {
    hook.result.current.onPasswordChange(value);
  });
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.handleDelete();
  });
  // React Query hands the settled state to the hook on a later tick.
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

describe('useDeleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    consumeAccountDeleted();
    mockReauthenticate.mockImplementation(async () => {
      callOrder.push('reauth');
    });
    mockGetIdToken.mockImplementation(async () => {
      callOrder.push('getIdToken');
    });
    mockDeleteAccountCallable.mockImplementation(async () => {
      callOrder.push('deleteAccount');
    });
    mockHttpsCallable.mockReturnValue(mockDeleteAccountCallable);
    mockHasPlayServices.mockResolvedValue(true);
    mockGoogleSignIn.mockResolvedValue({
      data: { idToken: 'google-id-token' },
    });
    mockGoogleSignOut.mockResolvedValue(undefined);
  });

  it('asks for a password only when the account has the password provider', async () => {
    expect((await setup(['password'])).result.current.requiresPassword).toBe(
      true,
    );
    expect(
      (await setup(['password', 'google.com'])).result.current.requiresPassword,
    ).toBe(true);
    expect((await setup(['google.com'])).result.current.requiresPassword).toBe(
      false,
    );
  });

  describe('password accounts', () => {
    it('requires a password before doing anything', async () => {
      const hook = await setup(['password']);

      await submit(hook);

      expect(hook.result.current.passwordError).toBe(
        'deleteAccount.validation.passwordRequired',
      );
      expect(mockReauthenticate).not.toHaveBeenCalled();
    });

    it('re-authenticates, force-refreshes the token, deletes, then signs out', async () => {
      const hook = await setup(['password']);

      await enterPassword(hook, 'secret-password');
      await submit(hook);

      expect(mockReauthenticate).toHaveBeenCalledWith({
        kind: 'email',
        email: 'rider@example.com',
        password: 'secret-password',
      });
      expect(mockGetIdToken).toHaveBeenCalledWith(true);
      expect(mockHttpsCallable).toHaveBeenCalledWith('deleteAccount');
      expect(callOrder).toEqual([
        'reauth',
        'getIdToken',
        'deleteAccount',
        'signOutAndClear',
      ]);
      expect(signOutAndClear).toHaveBeenCalledTimes(1);
      expect(consumeAccountDeleted()).toBe(true);
    });

    it.each(['auth/wrong-password', 'auth/invalid-credential'])(
      'maps %s to an inline password error and stays signed in',
      async code => {
        mockReauthenticate.mockRejectedValue({ code });
        const hook = await setup(['password']);

        await enterPassword(hook, 'wrong');
        await submit(hook);

        expect(hook.result.current.passwordError).toBe(
          'deleteAccount.errors.passwordInvalid',
        );
        expect(mockDeleteAccountCallable).not.toHaveBeenCalled();
        expect(signOutAndClear).not.toHaveBeenCalled();
        expect(hook.result.current.loading).toBe(false);
      },
    );

    it('clears a mapped password error when the password changes', async () => {
      mockReauthenticate.mockRejectedValue({ code: 'auth/wrong-password' });
      const hook = await setup(['password']);

      await enterPassword(hook, 'wrong');
      await submit(hook);
      await enterPassword(hook, 'wrong-again');

      expect(hook.result.current.passwordError).toBe('');
    });

    it('clears the form error when the password changes', async () => {
      mockDeleteAccountCallable.mockRejectedValue({
        code: 'functions/unavailable',
      });
      const hook = await setup(['password']);

      await enterPassword(hook, 'secret-password');
      await submit(hook);

      expect(hook.result.current.error).toBe('deleteAccount.errors.generic');

      await enterPassword(hook, 'secret-password-2');

      expect(hook.result.current.error).toBe('');
    });

    it('clears the password error when the password changes', async () => {
      const hook = await setup(['password']);

      await submit(hook);
      await enterPassword(hook, 'x');

      expect(hook.result.current.passwordError).toBe('');
    });
  });

  describe('google-only accounts', () => {
    it('re-authenticates through Google sign-in', async () => {
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(mockReauthenticate).toHaveBeenCalledWith({
        kind: 'google',
        idToken: 'google-id-token',
      });
      expect(callOrder).toEqual([
        'reauth',
        'getIdToken',
        'deleteAccount',
        'signOutAndClear',
      ]);
    });

    it('shows nothing when Google sign-in resolves as cancelled', async () => {
      mockGoogleSignIn.mockResolvedValue({ type: 'cancelled', data: null });
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(hook.result.current.error).toBe('');
      expect(mockReauthenticate).not.toHaveBeenCalled();
      expect(mockDeleteAccountCallable).not.toHaveBeenCalled();
      expect(signOutAndClear).not.toHaveBeenCalled();
      expect(consumeAccountDeleted()).toBe(false);
      expect(hook.result.current.loading).toBe(false);
    });

    it('shows nothing when the user cancels Google sign-in', async () => {
      mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(hook.result.current.error).toBe('');
      expect(hook.result.current.passwordError).toBe('');
      expect(mockDeleteAccountCallable).not.toHaveBeenCalled();
      expect(signOutAndClear).not.toHaveBeenCalled();
      expect(hook.result.current.loading).toBe(false);
    });

    it('shows an inline error then signs out of Google on user-mismatch', async () => {
      mockReauthenticate.mockRejectedValue({ code: 'auth/user-mismatch' });
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(hook.result.current.error).toBe(
        'deleteAccount.errors.wrongGoogleAccount',
      );
      expect(mockGoogleSignOut).toHaveBeenCalledTimes(1);
      expect(mockDeleteAccountCallable).not.toHaveBeenCalled();
    });

    it('shows a generic error when Google returns no id token', async () => {
      mockGoogleSignIn.mockResolvedValue({ type: 'success', data: null });
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(hook.result.current.error).toBe('deleteAccount.errors.generic');
    });
  });

  describe('function failures', () => {
    it.each(['failed-precondition', 'functions/failed-precondition'])(
      'asks the user to re-authenticate again on %s',
      async code => {
        mockDeleteAccountCallable.mockRejectedValue({ code });
        const hook = await setup(['password']);

        await enterPassword(hook, 'secret-password');
        await submit(hook);

        expect(hook.result.current.error).toBe(
          'deleteAccount.errors.reauthRequired',
        );
        expect(signOutAndClear).not.toHaveBeenCalled();
        expect(consumeAccountDeleted()).toBe(false);
      },
    );

    it('shows a generic error on other failures and allows retry', async () => {
      mockDeleteAccountCallable.mockRejectedValueOnce({
        code: 'functions/unavailable',
      });
      const hook = await setup(['password']);

      await enterPassword(hook, 'secret-password');
      await submit(hook);

      expect(hook.result.current.error).toBe('deleteAccount.errors.generic');
      expect(hook.result.current.loading).toBe(false);
      expect(signOutAndClear).not.toHaveBeenCalled();

      await submit(hook);

      expect(hook.result.current.error).toBe('');
      expect(signOutAndClear).toHaveBeenCalledTimes(1);
    });
  });

  it('reports loading while the request runs', async () => {
    let release: () => void = () => {};

    mockDeleteAccountCallable.mockReturnValue(
      new Promise<void>(resolve => {
        release = resolve;
      }),
    );
    const hook = await setup(['password']);

    await enterPassword(hook, 'secret-password');

    let pending: Promise<void> = Promise.resolve();

    await act(async () => {
      pending = hook.result.current.handleDelete();
    });

    await waitFor(() => expect(hook.result.current.loading).toBe(true));

    await act(async () => {
      release();
      await pending;
    });

    await waitFor(() => expect(hook.result.current.loading).toBe(false));
  });
});
