import { useSignUp } from '../useSignUp';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockCreateUser = jest.fn();
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
      createUserWithEmailAndPassword: mockCreateUser,
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

async function setup() {
  return renderHookWithClient(() => useSignUp());
}

type Hook = Awaited<ReturnType<typeof setup>>;

// React Query hands the settled state to the hook on a later tick.
async function settle() {
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

async function signUpWithEmail(hook: Hook) {
  await act(async () => hook.result.current.onEmailChange('rider@example.com'));
  await act(async () => hook.result.current.onPasswordChange('password-1'));
  await act(async () =>
    hook.result.current.onConfirmPasswordChange('password-1'),
  );
  await act(async () => {
    await hook.result.current.handleSignUp();
  });
  await settle();
}

async function signUpWithGoogle(hook: Hook) {
  await act(async () => {
    await hook.result.current.handleGoogleSignUp();
  });
  await settle();
}

describe('useSignUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a Google cancel with no error and no navigation', async () => {
    mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
    const hook = await setup();

    await signUpWithGoogle(hook);

    expect(hook.result.current.error).toBe('');
    expect(hook.result.current.googleLoading).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('clears the error when typing', async () => {
    mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
    const hook = await setup();

    await signUpWithEmail(hook);

    expect(hook.result.current.error).toBe('signUp.errors.emailAlreadyInUse');

    await act(async () =>
      hook.result.current.onEmailChange('other@example.com'),
    );

    expect(hook.result.current.error).toBe('');
  });

  it('shows only the Google outcome after a failed email sign-up', async () => {
    mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
    mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
    const hook = await setup();

    await signUpWithEmail(hook);

    expect(hook.result.current.error).toBe('signUp.errors.emailAlreadyInUse');

    await signUpWithGoogle(hook);

    expect(hook.result.current.error).toBe('');
  });
});
