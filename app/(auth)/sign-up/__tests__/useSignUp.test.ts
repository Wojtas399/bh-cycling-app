import { useSignUp } from '../useSignUp';
import { useBoundFields } from '@/test-utils/form';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

const mockCreateUser = jest.fn();
const mockSignInWithCredential = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockNewUser = {
  uid: 'new-rider',
  email: 'rider@example.com',
  emailVerified: false,
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

const FIELDS = ['email', 'password', 'confirmPassword'] as const;

async function setup() {
  return renderHookWithClient(() => {
    const hook = useSignUp();

    return { ...hook, fields: useBoundFields(hook.form, FIELDS) };
  });
}

type Hook = Awaited<ReturnType<typeof setup>>;

// React Query hands the settled state to the hook on a later tick.
async function settle() {
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

async function fill(
  hook: Hook,
  values: { email?: string; password?: string; confirm?: string },
) {
  await act(async () => {
    const { fields } = hook.result.current;

    if (values.email !== undefined) fields.email.onChangeText(values.email);

    if (values.password !== undefined) {
      fields.password.onChangeText(values.password);
    }

    if (values.confirm !== undefined) {
      fields.confirmPassword.onChangeText(values.confirm);
    }
  });
}

async function fillValid(hook: Hook) {
  await fill(hook, {
    email: 'rider@example.com',
    password: 'password-1',
    confirm: 'password-1',
  });
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.submit();
  });
  await settle();
}

async function signUpWithGoogle(hook: Hook) {
  await act(async () => {
    await hook.result.current.signUpWithGoogle();
  });
  await settle();
}

function errorOf(hook: Hook, name: (typeof FIELDS)[number]) {
  return hook.result.current.fields[name].error;
}

describe('useSignUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUser.mockResolvedValue({ user: mockNewUser });
    mockNewUser.sendEmailVerification.mockResolvedValue(undefined);
  });

  // Per-field rules live in signUpSchema.test.ts; these cover timing.
  describe('validation', () => {
    it('shows no errors before the first submit', async () => {
      const hook = await setup();

      await fill(hook, { email: 'not-an-email', password: 'short' });

      expect(errorOf(hook, 'email')).toBe('');
      expect(errorOf(hook, 'password')).toBe('');
    });

    it('shows schema errors on submit and does not call Firebase', async () => {
      const hook = await setup();

      await submit(hook);

      expect(errorOf(hook, 'email')).toBe('validation.emailRequired');
      expect(errorOf(hook, 'password')).toBe('validation.passwordRequired');
      expect(errorOf(hook, 'confirmPassword')).toBe(
        'signUp.validation.confirmPasswordRequired',
      );
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('re-validates a field as it changes after a submit', async () => {
      const hook = await setup();

      await submit(hook);
      await fill(hook, { email: 'rider@' });

      expect(errorOf(hook, 'email')).toBe('validation.emailInvalid');

      await fill(hook, { email: 'rider@example.com' });

      expect(errorOf(hook, 'email')).toBe('');
      expect(errorOf(hook, 'password')).not.toBe('');
    });

    it('re-validates the confirmation when the password changes after a submit', async () => {
      const hook = await setup();

      await fill(hook, {
        email: 'rider@example.com',
        password: 'password-1',
        confirm: 'password-2',
      });
      await submit(hook);

      expect(errorOf(hook, 'confirmPassword')).toBe(
        'validation.passwordsMismatch',
      );

      await fill(hook, { password: 'password-2' });

      expect(errorOf(hook, 'confirmPassword')).toBe('');

      await fill(hook, { password: 'password-3' });

      expect(errorOf(hook, 'confirmPassword')).toBe(
        'validation.passwordsMismatch',
      );
    });

    it('focuses the first invalid field on submit', async () => {
      const hook = await setup();
      const focus = {
        email: jest.fn(),
        password: jest.fn(),
        confirm: jest.fn(),
      };

      await act(async () => {
        const { fields } = hook.result.current;

        fields.email.ref({ focus: focus.email });
        fields.password.ref({ focus: focus.password });
        fields.confirmPassword.ref({ focus: focus.confirm });
      });
      await fill(hook, { email: 'rider@example.com' });
      await submit(hook);

      expect(focus.password).toHaveBeenCalled();
      expect(focus.email).not.toHaveBeenCalled();
      expect(focus.confirm).not.toHaveBeenCalled();
    });
  });

  describe('email sign-up', () => {
    it('submits the trimmed email and the untrimmed password', async () => {
      const hook = await setup();

      await fill(hook, {
        email: '  rider@example.com ',
        password: ' password-1 ',
        confirm: ' password-1 ',
      });
      await submit(hook);

      expect(mockCreateUser).toHaveBeenCalledWith(
        'rider@example.com',
        ' password-1 ',
      );
      expect(hook.result.current.busy).toBe(false);
    });

    it('sends the verification email once the account is created', async () => {
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(mockNewUser.sendEmailVerification).toHaveBeenCalledTimes(1);
    });

    it('still completes sign-up when the email fails to send', async () => {
      mockNewUser.sendEmailVerification.mockRejectedValue({
        code: 'auth/network-request-failed',
      });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(mockNewUser.sendEmailVerification).toHaveBeenCalledTimes(1);
      expect(hook.result.current.busy).toBe(false);
      expect(hook.result.current.formError).toBe('');
    });

    it('keeps the email field showing what the user typed', async () => {
      const hook = await setup();

      await fill(hook, { email: '  rider@example.com ' });

      expect(hook.result.current.fields.email.value).toBe(
        '  rider@example.com ',
      );
    });

    it('disables every field while sign-up is pending', async () => {
      let finish!: () => void;

      mockCreateUser.mockReturnValueOnce(
        new Promise(resolve => {
          finish = () => resolve({ user: mockNewUser });
        }),
      );
      const hook = await setup();

      await fillValid(hook);
      await act(async () => {
        void hook.result.current.submit();
      });
      await waitFor(() => expect(hook.result.current.busy).toBe(true));

      expect(
        FIELDS.map(name => hook.result.current.fields[name].editable),
      ).toEqual([false, false, false]);

      await act(async () => finish());
      await waitFor(() => expect(hook.result.current.busy).toBe(false));
    });

    it.each([
      ['auth/email-already-in-use', 'signUp.errors.emailAlreadyInUse'],
      ['auth/weak-password', 'signUp.errors.weakPassword'],
      ['auth/invalid-email', 'signUp.errors.invalidEmail'],
      ['auth/network-request-failed', 'signUp.errors.networkFailed'],
      ['auth/something-else', 'signUp.errors.generic'],
    ])('maps %s to the form error', async (code, key) => {
      mockCreateUser.mockRejectedValue({ code });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.formError).toBe(key);
      expect(FIELDS.map(name => errorOf(hook, name))).toEqual(['', '', '']);
      expect(hook.result.current.busy).toBe(false);
    });

    it('clears the form error when any field changes', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'signUp.errors.emailAlreadyInUse',
      );

      await fill(hook, { email: 'other@example.com' });

      expect(hook.result.current.formError).toBe('');
    });
  });

  describe('Google sign-up', () => {
    it('works with empty, invalid fields and does not validate them', async () => {
      mockGoogleSignIn.mockResolvedValue({
        type: 'success',
        data: { idToken: 'token' },
      });
      mockSignInWithCredential.mockResolvedValue(undefined);
      const hook = await setup();

      await fill(hook, { email: 'not-an-email' });
      await signUpWithGoogle(hook);

      expect(mockSignInWithCredential).toHaveBeenCalled();
      expect(errorOf(hook, 'email')).toBe('');
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('resolves a cancel with no error', async () => {
      mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
      const hook = await setup();

      await signUpWithGoogle(hook);

      expect(hook.result.current.formError).toBe('');
      expect(hook.result.current.busy).toBe(false);
    });

    it('shows a form error when it fails', async () => {
      mockGoogleSignIn.mockRejectedValue({ code: 'SOMETHING_ELSE' });
      const hook = await setup();

      await signUpWithGoogle(hook);

      expect(hook.result.current.formError).toBe('signUp.errors.googleFailed');
    });

    it('is busy while pending, disabling the fields', async () => {
      let finish!: () => void;

      mockGoogleSignIn.mockReturnValueOnce(
        new Promise(resolve => {
          finish = () => resolve({ type: 'cancelled' });
        }),
      );
      const hook = await setup();

      await act(async () => {
        void hook.result.current.signUpWithGoogle();
      });
      await waitFor(() => expect(hook.result.current.busy).toBe(true));

      expect(
        FIELDS.map(name => hook.result.current.fields[name].editable),
      ).toEqual([false, false, false]);

      await act(async () => finish());
      await waitFor(() => expect(hook.result.current.busy).toBe(false));
    });

    it('shows only the Google outcome after a failed email sign-up', async () => {
      mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
      mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'signUp.errors.emailAlreadyInUse',
      );

      await signUpWithGoogle(hook);

      expect(hook.result.current.formError).toBe('');
    });
  });
});
