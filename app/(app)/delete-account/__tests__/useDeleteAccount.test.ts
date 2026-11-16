import { useDeleteAccount } from '../useDeleteAccount';
import { signOutAndClear } from '@/lib/signOutAndClear';
import { toast } from '@/lib/toast';
import { useBoundFields } from '@/test-utils/form';
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
const mockDispatch = jest.fn();
const mockNavigation = { dispatch: mockDispatch };

type PreventRemoveCallback = (event: {
  data: { action: { type: string } };
}) => void;

let mockPreventRemove: {
  prevent: boolean;
  callback: PreventRemoveCallback;
} | null = null;

jest.mock('expo-router', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (prevent: boolean, callback: PreventRemoveCallback) => {
    mockPreventRemove = { prevent, callback };
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
  isErrorWithCode: (e: unknown) =>
    typeof e === 'object' && e !== null && 'code' in e,
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn((message: string) => {
      callOrder.push(`toast.success:${message}`);
    }),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

const mockToast = jest.mocked(toast);

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

const PASSWORD_FIELDS = ['password'] as const;

async function setup(providerIds: string[]) {
  mockProviderIds = providerIds;

  // Google-only accounts render no field.
  const fields = providerIds.includes('password') ? PASSWORD_FIELDS : [];

  return renderHookWithClient(() => {
    const hook = useDeleteAccount();

    return { ...hook, fields: useBoundFields(hook.form, fields) };
  });
}

type Hook = Awaited<ReturnType<typeof setup>>;

async function enterPassword(hook: Hook, value: string) {
  await act(async () => {
    hook.result.current.fields.password.onChangeText(value);
  });
}

function passwordError(hook: Hook) {
  return hook.result.current.fields.password.error;
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.submit();
  });
  // React Query hands the settled state to the hook on a later tick.
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

/**
 * Tries to remove the screen with a dispatched action, the way React
 * Navigation's `usePreventRemove` handles it: while prevented, the action is
 * stopped and handed to the callback, which lets it through by dispatching it
 * again. True when the screen would be removed.
 */
function removes(type: string): boolean {
  expect(mockPreventRemove).not.toBeNull();

  if (!mockPreventRemove?.prevent) return true;

  const action = { type };

  mockDispatch.mockClear();
  mockPreventRemove.callback({ data: { action } });

  return mockDispatch.mock.calls.some(([dispatched]) => dispatched === action);
}

/** Starts a deletion whose callable hangs; returns a function finishing it. */
async function startHangingDelete(hook: Hook) {
  let release: () => void = () => {};

  mockDeleteAccountCallable.mockReturnValue(
    new Promise<void>(resolve => {
      release = resolve;
    }),
  );

  let pending: Promise<void> = Promise.resolve();

  await act(async () => {
    pending = hook.result.current.submit();
  });

  await waitFor(() => expect(hook.result.current.busy).toBe(true));

  return async () => {
    await act(async () => {
      release();
      await pending;
    });
    await waitFor(() => expect(hook.result.current.busy).toBe(false));
  };
}

describe('useDeleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    mockPreventRemove = null;
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
    it('shows no error before the first submit', async () => {
      const hook = await setup(['password']);

      await enterPassword(hook, 'x');
      await enterPassword(hook, '');

      expect(passwordError(hook)).toBe('');
    });

    it('requires a password before doing anything', async () => {
      const hook = await setup(['password']);

      await submit(hook);

      expect(passwordError(hook)).toBe('validation.passwordRequired');
      expect(mockReauthenticate).not.toHaveBeenCalled();
    });

    it('re-checks the password as the user types after a submit', async () => {
      const hook = await setup(['password']);

      await submit(hook);
      await enterPassword(hook, 'x');

      expect(passwordError(hook)).toBe('');

      await enterPassword(hook, '');

      expect(passwordError(hook)).toBe('validation.passwordRequired');
    });

    it('re-authenticates with the password as typed, force-refreshes the token, deletes, then signs out', async () => {
      const hook = await setup(['password']);

      await enterPassword(hook, ' secret-password ');
      await submit(hook);

      expect(mockReauthenticate).toHaveBeenCalledWith({
        kind: 'email',
        email: 'rider@example.com',
        password: ' secret-password ',
      });
      expect(mockGetIdToken).toHaveBeenCalledWith(true);
      expect(mockHttpsCallable).toHaveBeenCalledWith('deleteAccount');
      expect(callOrder).toEqual([
        'reauth',
        'getIdToken',
        'deleteAccount',
        'toast.success:deleteAccount.deleted',
        'signOutAndClear',
      ]);
      expect(mockToast.success).toHaveBeenCalledTimes(1);
      expect(signOutAndClear).toHaveBeenCalledTimes(1);
    });

    it.each(['auth/wrong-password', 'auth/invalid-credential'])(
      'maps %s to an inline password error and stays signed in',
      async code => {
        mockReauthenticate.mockRejectedValue({ code });
        const hook = await setup(['password']);

        await enterPassword(hook, 'wrong');
        await submit(hook);

        expect(passwordError(hook)).toBe(
          'deleteAccount.errors.passwordInvalid',
        );
        expect(hook.result.current.formError).toBe('');
        expect(mockDeleteAccountCallable).not.toHaveBeenCalled();
        expect(signOutAndClear).not.toHaveBeenCalled();
        expect(mockToast.success).not.toHaveBeenCalled();
        expect(hook.result.current.busy).toBe(false);
      },
    );

    it('clears a mapped password error when the password changes', async () => {
      mockReauthenticate.mockRejectedValue({ code: 'auth/wrong-password' });
      const hook = await setup(['password']);

      await enterPassword(hook, 'wrong');
      await submit(hook);
      await enterPassword(hook, 'wrong-again');

      expect(passwordError(hook)).toBe('');
    });

    it('shows the validation error over a mapped password error', async () => {
      mockReauthenticate.mockRejectedValue({ code: 'auth/wrong-password' });
      const hook = await setup(['password']);

      await enterPassword(hook, 'wrong');
      await submit(hook);
      await enterPassword(hook, '');

      expect(passwordError(hook)).toBe('validation.passwordRequired');
    });

    it('clears the form error when the password changes', async () => {
      mockDeleteAccountCallable.mockRejectedValue({
        code: 'functions/unavailable',
      });
      const hook = await setup(['password']);

      await enterPassword(hook, 'secret-password');
      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'deleteAccount.errors.generic',
      );

      await enterPassword(hook, 'secret-password-2');

      expect(hook.result.current.formError).toBe('');
    });
  });

  describe('google-only accounts', () => {
    it('re-authenticates through Google sign-in on submit', async () => {
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
        'toast.success:deleteAccount.deleted',
        'signOutAndClear',
      ]);
    });

    it('shows nothing when Google sign-in resolves as cancelled', async () => {
      mockGoogleSignIn.mockResolvedValue({ type: 'cancelled', data: null });
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(hook.result.current.formError).toBe('');
      expect(mockReauthenticate).not.toHaveBeenCalled();
      expect(mockDeleteAccountCallable).not.toHaveBeenCalled();
      expect(signOutAndClear).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(hook.result.current.busy).toBe(false);
    });

    it('shows nothing when the user cancels Google sign-in', async () => {
      mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(hook.result.current.formError).toBe('');
      expect(mockDeleteAccountCallable).not.toHaveBeenCalled();
      expect(signOutAndClear).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(hook.result.current.busy).toBe(false);
    });

    it('shows a form error then signs out of Google on user-mismatch', async () => {
      mockReauthenticate.mockRejectedValue({ code: 'auth/user-mismatch' });
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'deleteAccount.errors.wrongGoogleAccount',
      );
      expect(mockGoogleSignOut).toHaveBeenCalledTimes(1);
      expect(mockDeleteAccountCallable).not.toHaveBeenCalled();
    });

    it('shows a generic error when Google returns no id token', async () => {
      mockGoogleSignIn.mockResolvedValue({ type: 'success', data: null });
      const hook = await setup(['google.com']);

      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'deleteAccount.errors.generic',
      );
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

        expect(hook.result.current.formError).toBe(
          'deleteAccount.errors.reauthRequired',
        );
        expect(signOutAndClear).not.toHaveBeenCalled();
        expect(mockToast.success).not.toHaveBeenCalled();
      },
    );

    it('shows a generic error on other failures and allows retry', async () => {
      mockDeleteAccountCallable.mockRejectedValueOnce({
        code: 'functions/unavailable',
      });
      const hook = await setup(['password']);

      await enterPassword(hook, 'secret-password');
      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'deleteAccount.errors.generic',
      );
      expect(hook.result.current.busy).toBe(false);
      expect(signOutAndClear).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();

      await submit(hook);

      expect(hook.result.current.formError).toBe('');
      expect(mockToast.success).toHaveBeenCalledTimes(1);
      expect(signOutAndClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('while the request runs', () => {
    it('reports busy and disables the field', async () => {
      const hook = await setup(['password']);

      await enterPassword(hook, 'secret-password');

      const finish = await startHangingDelete(hook);

      expect(hook.result.current.fields.password.editable).toBe(false);

      await finish();

      expect(hook.result.current.fields.password.editable).toBe(true);
    });

    it('ignores another submit', async () => {
      const hook = await setup(['google.com']);
      const finish = await startHangingDelete(hook);

      await act(async () => {
        await hook.result.current.submit();
      });

      expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);

      await finish();
    });

    it('blocks back navigation but lets any other removal through', async () => {
      const hook = await setup(['google.com']);
      const finish = await startHangingDelete(hook);

      expect(hook.result.current.busy).toBe(true);
      expect(removes('GO_BACK')).toBe(false);
      expect(removes('POP')).toBe(false);
      expect(removes('REPLACE')).toBe(true);
      expect(removes('RESET')).toBe(true);

      await finish();
    });
  });

  it('allows going back when idle', async () => {
    const hook = await setup(['password']);

    expect(hook.result.current.busy).toBe(false);
    expect(removes('GO_BACK')).toBe(true);
    expect(removes('POP')).toBe(true);
  });

  it('allows going back after a failed deletion', async () => {
    mockDeleteAccountCallable.mockRejectedValue({
      code: 'functions/unavailable',
    });
    const hook = await setup(['password']);

    await enterPassword(hook, 'secret-password');
    await submit(hook);

    expect(hook.result.current.formError).toBe('deleteAccount.errors.generic');
    expect(hook.result.current.busy).toBe(false);
    expect(removes('GO_BACK')).toBe(true);
    expect(removes('POP')).toBe(true);
  });
});
