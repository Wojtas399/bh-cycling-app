import { Alert } from 'react-native';

import { useSignIn } from '../useSignIn';
import { markAccountDeleted } from '@/lib/accountDeletedStore';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockSignInWithEmail = jest.fn();
const mockSignInWithCredential = jest.fn();
const mockGoogleSignIn = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
  isErrorWithCode: (e: unknown) =>
    typeof e === 'object' && e !== null && 'code' in e,
}));

jest.mock('@/lib/firebase', () => {
  const auth = Object.assign(
    jest.fn(() => ({
      signInWithEmailAndPassword: mockSignInWithEmail,
      signInWithCredential: mockSignInWithCredential,
    })),
    { GoogleAuthProvider: { credential: jest.fn(() => 'credential') } },
  );

  return {
    auth,
    GoogleSignin: {
      hasPlayServices: jest.fn(async () => true),
      signIn: (...args: unknown[]) => mockGoogleSignIn(...args),
    },
  };
});

const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

async function setup() {
  return renderHookWithClient(() => useSignIn());
}

type Hook = Awaited<ReturnType<typeof setup>>;

// React Query hands the settled state to the hook on a later tick.
async function settle() {
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

async function signInWithEmail(hook: Hook) {
  await act(async () => hook.result.current.onEmailChange('rider@example.com'));
  await act(async () => hook.result.current.onPasswordChange('password-1'));
  await act(async () => {
    await hook.result.current.handleSignIn();
  });
  await settle();
}

async function signInWithGoogle(hook: Hook) {
  await act(async () => {
    await hook.result.current.handleGoogleSignIn();
  });
  await settle();
}

describe('useSignIn — account deleted notice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the "account deleted" alert once after a deletion', async () => {
    markAccountDeleted();

    await setup();

    expect(mockAlert).toHaveBeenCalledWith('signIn.accountDeleted');

    await setup();

    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it('shows no alert on a normal visit', async () => {
    await setup();

    expect(mockAlert).not.toHaveBeenCalled();
  });
});

describe('useSignIn — submits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a Google cancel with no error and no navigation', async () => {
    mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
    const hook = await setup();

    await signInWithGoogle(hook);

    expect(hook.result.current.error).toBe('');
    expect(hook.result.current.googleLoading).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('clears the error when typing', async () => {
    mockSignInWithEmail.mockRejectedValue({ code: 'auth/invalid-credential' });
    const hook = await setup();

    await signInWithEmail(hook);

    expect(hook.result.current.error).toBe('signIn.errors.invalidCredential');

    await act(async () => hook.result.current.onPasswordChange('password-2'));

    expect(hook.result.current.error).toBe('');
  });

  it('shows only the Google outcome after a failed email sign-in', async () => {
    mockSignInWithEmail.mockRejectedValue({ code: 'auth/invalid-credential' });
    mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
    const hook = await setup();

    await signInWithEmail(hook);

    expect(hook.result.current.error).toBe('signIn.errors.invalidCredential');

    await signInWithGoogle(hook);

    expect(hook.result.current.error).toBe('');
  });
});
