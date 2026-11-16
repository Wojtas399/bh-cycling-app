import { useSignIn } from '../useSignIn';
import { useBoundFields } from '@/test-utils/form';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

const mockSignInWithEmail = jest.fn();
const mockSignInWithCredential = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockUser = {
  uid: 'rider',
  email: 'rider@example.com',
  emailVerified: true,
  sendEmailVerification: jest.fn(),
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

const FIELDS = ['email', 'password'] as const;

async function setup() {
  return renderHookWithClient(() => {
    const hook = useSignIn();

    return { ...hook, fields: useBoundFields(hook.form, FIELDS) };
  });
}

type Hook = Awaited<ReturnType<typeof setup>>;

// React Query hands the settled state to the hook on a later tick.
async function settle() {
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

async function fill(hook: Hook, values: { email?: string; password?: string }) {
  await act(async () => {
    const { fields } = hook.result.current;

    if (values.email !== undefined) fields.email.onChangeText(values.email);

    if (values.password !== undefined) {
      fields.password.onChangeText(values.password);
    }
  });
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.submit();
  });
  await settle();
}

async function fillValid(hook: Hook) {
  await fill(hook, { email: 'rider@example.com', password: 'password-1' });
}

async function signInWithGoogle(hook: Hook) {
  await act(async () => {
    await hook.result.current.signInWithGoogle();
  });
  await settle();
}

function errorOf(hook: Hook, name: (typeof FIELDS)[number]) {
  return hook.result.current.fields[name].error;
}

describe('useSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.emailVerified = true;
    mockUser.sendEmailVerification.mockResolvedValue(undefined);
    mockSignInWithEmail.mockResolvedValue({ user: mockUser });
  });

  // Per-field rules live in signInSchema.test.ts; these cover timing.
  describe('validation', () => {
    it('shows no errors before the first submit', async () => {
      const hook = await setup();

      await fill(hook, { email: 'not-an-email' });

      expect(errorOf(hook, 'email')).toBe('');
      expect(errorOf(hook, 'password')).toBe('');
    });

    it('shows schema errors on submit and does not call Firebase', async () => {
      const hook = await setup();

      await submit(hook);

      expect(errorOf(hook, 'email')).toBe('validation.emailRequired');
      expect(errorOf(hook, 'password')).toBe('validation.passwordRequired');
      expect(mockSignInWithEmail).not.toHaveBeenCalled();
    });

    it('re-validates a field as it changes after a submit', async () => {
      const hook = await setup();

      await submit(hook);
      await fill(hook, { email: 'rider@example' });

      expect(errorOf(hook, 'email')).toBe('validation.emailInvalid');

      await fill(hook, { email: 'rider@example.com' });

      expect(errorOf(hook, 'email')).toBe('');
      expect(errorOf(hook, 'password')).toBe('validation.passwordRequired');
    });

    it('focuses the first invalid field on submit', async () => {
      const hook = await setup();
      const focus = { email: jest.fn(), password: jest.fn() };

      await act(async () => {
        const { fields } = hook.result.current;

        fields.email.ref({ focus: focus.email });
        fields.password.ref({ focus: focus.password });
      });
      await fill(hook, { email: 'rider@example.com' });
      await submit(hook);

      expect(focus.password).toHaveBeenCalled();
      expect(focus.email).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('signs in with the trimmed email and the untrimmed password', async () => {
      const hook = await setup();

      await fill(hook, { email: '  rider@example.com ', password: ' pass ' });
      await submit(hook);

      expect(mockSignInWithEmail).toHaveBeenCalledWith(
        'rider@example.com',
        ' pass ',
      );
      expect(hook.result.current.busy).toBe(false);
    });

    it('sends the verification email when the email is unverified', async () => {
      mockUser.emailVerified = false;
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(mockUser.sendEmailVerification).toHaveBeenCalledTimes(1);
    });

    it('sends no verification email when the email is verified', async () => {
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(mockUser.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('disables every field while the sign-in is pending', async () => {
      let finish!: () => void;

      mockSignInWithEmail.mockReturnValueOnce(
        new Promise(resolve => {
          finish = () => resolve({ user: mockUser });
        }),
      );
      const hook = await setup();

      await fillValid(hook);
      await act(async () => {
        void hook.result.current.submit();
      });
      await waitFor(() => expect(hook.result.current.busy).toBe(true));

      expect(hook.result.current.emailPending).toBe(true);
      expect(
        FIELDS.map(name => hook.result.current.fields[name].editable),
      ).toEqual([false, false]);

      await act(async () => finish());
      await waitFor(() => expect(hook.result.current.busy).toBe(false));
    });

    it.each([
      ['auth/invalid-credential', 'signIn.errors.invalidCredential'],
      ['auth/wrong-password', 'signIn.errors.invalidCredential'],
      ['auth/user-not-found', 'signIn.errors.invalidCredential'],
      ['auth/invalid-email', 'signIn.errors.invalidEmail'],
      ['auth/too-many-requests', 'signIn.errors.tooManyRequests'],
      ['auth/network-request-failed', 'signIn.errors.networkFailed'],
      ['auth/something-else', 'signIn.errors.generic'],
    ])('maps %s to a form error', async (code, message) => {
      mockSignInWithEmail.mockRejectedValue({ code });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.formError).toBe(message);
      expect(errorOf(hook, 'email')).toBe('');
      expect(errorOf(hook, 'password')).toBe('');
      expect(hook.result.current.busy).toBe(false);
    });

    it('clears the form error when any field changes', async () => {
      mockSignInWithEmail.mockRejectedValue({
        code: 'auth/invalid-credential',
      });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'signIn.errors.invalidCredential',
      );

      await fill(hook, { password: 'password-2' });

      expect(hook.result.current.formError).toBe('');
    });
  });

  describe('Google sign-in', () => {
    it('runs with empty fields and shows no validation errors', async () => {
      mockGoogleSignIn.mockResolvedValue({
        type: 'success',
        data: { idToken: 'token' },
      });
      mockSignInWithCredential.mockResolvedValue(undefined);
      const hook = await setup();

      await signInWithGoogle(hook);

      expect(mockGoogleSignIn).toHaveBeenCalled();
      expect(errorOf(hook, 'email')).toBe('');
      expect(errorOf(hook, 'password')).toBe('');
    });

    it('runs with an invalid email', async () => {
      mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
      const hook = await setup();

      await fill(hook, { email: 'not-an-email' });
      await signInWithGoogle(hook);

      expect(mockGoogleSignIn).toHaveBeenCalled();
      expect(errorOf(hook, 'email')).toBe('');
    });

    it('resolves a cancel with no error', async () => {
      mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
      const hook = await setup();

      await signInWithGoogle(hook);

      expect(hook.result.current.formError).toBe('');
      expect(hook.result.current.busy).toBe(false);
    });

    it('shows a form error when it fails', async () => {
      mockGoogleSignIn.mockRejectedValue(new Error('boom'));
      const hook = await setup();

      await signInWithGoogle(hook);

      expect(hook.result.current.formError).toBe('signIn.errors.googleFailed');
    });

    it('counts as busy while pending', async () => {
      let finish!: () => void;

      mockGoogleSignIn.mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          finish = () => reject({ code: 'SIGN_IN_CANCELLED' });
        }),
      );
      const hook = await setup();

      await act(async () => {
        void hook.result.current.signInWithGoogle();
      });
      await waitFor(() => expect(hook.result.current.busy).toBe(true));

      expect(hook.result.current.googlePending).toBe(true);
      expect(hook.result.current.fields.email.editable).toBe(false);

      await act(async () => finish());
      await waitFor(() => expect(hook.result.current.busy).toBe(false));
    });

    it('clears its error when any field changes', async () => {
      mockGoogleSignIn.mockRejectedValue(new Error('boom'));
      const hook = await setup();

      await signInWithGoogle(hook);
      await fill(hook, { email: 'r' });

      expect(hook.result.current.formError).toBe('');
    });

    it('shows only the Google outcome after a failed email sign-in', async () => {
      mockSignInWithEmail.mockRejectedValue({
        code: 'auth/invalid-credential',
      });
      mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'signIn.errors.invalidCredential',
      );

      await signInWithGoogle(hook);

      expect(hook.result.current.formError).toBe('');
    });
  });
});
