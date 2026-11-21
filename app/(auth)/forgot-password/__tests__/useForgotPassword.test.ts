import { useForgotPassword } from '../useForgotPassword';
import { useBoundFields } from '@/test-utils/form';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { settleQueries } from '@/test-utils/settle';
import { act, waitFor } from '@testing-library/react-native';

const mockSendPasswordResetEmail = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ sendPasswordResetEmail: mockSendPasswordResetEmail }),
}));

const FIELDS = ['email'] as const;

async function setup() {
  return renderHookWithClient(() => {
    const hook = useForgotPassword();

    return { ...hook, fields: useBoundFields(hook.form, FIELDS) };
  });
}

type Hook = Awaited<ReturnType<typeof setup>>;

async function type(hook: Hook, email: string) {
  await act(async () => hook.result.current.fields.email.onChangeText(email));
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.submit();
  });
  await settleQueries();
}

async function resend(hook: Hook) {
  await act(async () => {
    await hook.result.current.resend();
  });
  await settleQueries();
}

function emailError(hook: Hook) {
  return hook.result.current.fields.email.error;
}

describe('useForgotPassword', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
  });

  describe('when schema errors show', () => {
    it('shows no error before the first submit', async () => {
      const hook = await setup();

      await type(hook, 'not-an-email');

      expect(emailError(hook)).toBe('');
    });

    it('shows the schema error on submit and does not call Firebase', async () => {
      const hook = await setup();

      await submit(hook);

      expect(emailError(hook)).toBe('validation.emailRequired');
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
      expect(hook.result.current.success).toBe(false);
    });

    it('re-validates the email as it changes after a submit', async () => {
      const hook = await setup();

      await submit(hook);
      await type(hook, 'rider');

      expect(emailError(hook)).toBe('validation.emailInvalid');

      await type(hook, 'rider@example.com');

      expect(emailError(hook)).toBe('');
    });

    it('focuses the email on an invalid submit', async () => {
      const hook = await setup();
      const focus = jest.fn();

      await act(async () => hook.result.current.fields.email.ref({ focus }));
      await submit(hook);

      expect(focus).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('sends the trimmed email and shows the success state', async () => {
      const hook = await setup();

      await type(hook, '  rider@example.com ');
      await submit(hook);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        'rider@example.com',
      );
      expect(hook.result.current.success).toBe(true);
      expect(hook.result.current.sentEmail).toBe('rider@example.com');
      expect(hook.result.current.busy).toBe(false);
    });

    it('starts the cooldown after a successful send', async () => {
      const hook = await setup();

      await type(hook, 'rider@example.com');
      await submit(hook);

      expect(hook.result.current.cooldown).toBe(60);
    });

    it('is busy and disables the field while the send is pending', async () => {
      let finish!: () => void;

      mockSendPasswordResetEmail.mockReturnValueOnce(
        new Promise<void>(resolve => {
          finish = resolve;
        }),
      );
      const hook = await setup();

      await type(hook, 'rider@example.com');
      await act(async () => {
        void hook.result.current.submit();
      });
      await waitFor(() => expect(hook.result.current.busy).toBe(true));

      expect(hook.result.current.fields.email.editable).toBe(false);

      await act(async () => finish());
      await waitFor(() => expect(hook.result.current.busy).toBe(false));
    });

    it.each([
      ['auth/invalid-email', 'forgotPassword.errors.invalidEmail'],
      ['auth/user-not-found', 'forgotPassword.errors.userNotFound'],
      ['auth/too-many-requests', 'forgotPassword.errors.tooManyRequests'],
      ['auth/network-request-failed', 'forgotPassword.errors.networkFailed'],
      ['auth/something-else', 'forgotPassword.errors.generic'],
    ])('maps %s to the form error', async (code, message) => {
      mockSendPasswordResetEmail.mockRejectedValue({ code });
      const hook = await setup();

      await type(hook, 'rider@example.com');
      await submit(hook);

      expect(hook.result.current.formError).toBe(message);
      expect(emailError(hook)).toBe('');
      expect(hook.result.current.success).toBe(false);
      expect(hook.result.current.busy).toBe(false);
    });

    it('clears the form error when the email changes', async () => {
      mockSendPasswordResetEmail.mockRejectedValue({
        code: 'auth/user-not-found',
      });
      const hook = await setup();

      await type(hook, 'rider@example.com');
      await submit(hook);
      await type(hook, 'other@example.com');

      expect(hook.result.current.formError).toBe('');
    });
  });

  describe('resend', () => {
    async function settleQueriesOnFakeTimers() {
      await act(async () => {
        jest.advanceTimersByTime(0);
      });
    }

    async function sendThenWaitOutCooldown(hook: Hook) {
      jest.useFakeTimers();
      await type(hook, ' rider@example.com ');
      await act(async () => {
        await hook.result.current.submit();
      });
      await settleQueriesOnFakeTimers();
      expect(hook.result.current.cooldown).toBe(60);
      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });
      expect(hook.result.current.cooldown).toBe(0);
      jest.useRealTimers();
    }

    it('ignores a resend during the cooldown', async () => {
      const hook = await setup();

      await type(hook, 'rider@example.com');
      await submit(hook);
      await resend(hook);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('ignores a resend before any successful send', async () => {
      const hook = await setup();

      await type(hook, 'rider@example.com');
      await resend(hook);

      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('resends the last submitted email, even if the field changed', async () => {
      const hook = await setup();

      await sendThenWaitOutCooldown(hook);
      await type(hook, 'other@example.com');
      await resend(hook);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(2);
      expect(mockSendPasswordResetEmail).toHaveBeenLastCalledWith(
        'rider@example.com',
      );
      expect(hook.result.current.sentEmail).toBe('rider@example.com');
      expect(hook.result.current.cooldown).toBe(60);
    });

    it('shows a failed resend as the form error', async () => {
      const hook = await setup();

      await sendThenWaitOutCooldown(hook);
      mockSendPasswordResetEmail.mockRejectedValueOnce({
        code: 'auth/too-many-requests',
      });
      await resend(hook);

      expect(hook.result.current.formError).toBe(
        'forgotPassword.errors.tooManyRequests',
      );
      expect(hook.result.current.success).toBe(true);
    });

    it('ignores a resend while a send is pending', async () => {
      mockSendPasswordResetEmail.mockReturnValue(new Promise(() => {}));
      const hook = await setup();

      await type(hook, 'rider@example.com');
      await act(async () => {
        void hook.result.current.submit();
      });
      await settleQueries();

      expect(hook.result.current.busy).toBe(true);

      await resend(hook);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });
  });
});
