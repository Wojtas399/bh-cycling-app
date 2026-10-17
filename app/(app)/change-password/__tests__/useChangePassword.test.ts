import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';

import { useChangePassword } from '../useChangePassword';
import { toast } from '@/lib/toast';
import { useBoundFields } from '@/test-utils/form';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReauthenticate = jest.fn();
const mockUpdatePassword = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockCredential = jest.fn((email: string, password: string) => ({
  email,
  password,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

jest.mock('@/lib/firebase', () => {
  const auth = () => ({
    currentUser: {
      email: 'rider@example.com',
      reauthenticateWithCredential: mockReauthenticate,
      updatePassword: mockUpdatePassword,
    },
    sendPasswordResetEmail: mockSendPasswordResetEmail,
  });

  auth.EmailAuthProvider = {
    credential: (email: string, password: string) =>
      mockCredential(email, password),
  };

  return { auth };
});

jest.mock('@/lib/toast', () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

const mockToast = jest.mocked(toast);

const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const;

async function setup() {
  return renderHookWithClient(() => {
    const hook = useChangePassword();

    return { ...hook, fields: useBoundFields(hook.form, FIELDS) };
  });
}

type Hook = Awaited<ReturnType<typeof setup>>;

async function fill(
  hook: Hook,
  values: { current?: string; next?: string; confirm?: string },
) {
  await act(async () => {
    const { fields } = hook.result.current;

    if (values.current !== undefined) {
      fields.currentPassword.onChangeText(values.current);
    }

    if (values.next !== undefined) {
      fields.newPassword.onChangeText(values.next);
    }

    if (values.confirm !== undefined) {
      fields.confirmPassword.onChangeText(values.confirm);
    }
  });
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.submit();
  });
  // React Query hands the settled state to the hook on a later tick.
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

async function fillValid(hook: Hook) {
  await fill(hook, {
    current: 'old-password',
    next: 'new-password-1',
    confirm: 'new-password-1',
  });
}

function errorOf(hook: Hook, name: (typeof FIELDS)[number]) {
  return hook.result.current.fields[name].error;
}

function pressAlertButton(callIndex: number, style: AlertButton['style']) {
  const buttons = mockAlert.mock.calls[callIndex][2] ?? [];

  return buttons.find(b => b.style === style)?.onPress?.();
}

describe('useChangePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReauthenticate.mockResolvedValue(undefined);
    mockUpdatePassword.mockResolvedValue(undefined);
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
  });

  // Per-field rules live in changePasswordSchema.test.ts; these cover timing.
  describe('validation', () => {
    it('shows no errors before the first submit', async () => {
      const hook = await setup();

      await fill(hook, { confirm: 'other' });
      await fill(hook, { next: 'short' });

      expect(errorOf(hook, 'newPassword')).toBe('');
      expect(errorOf(hook, 'confirmPassword')).toBe('');
    });

    it('shows schema errors on submit and does not call Firebase', async () => {
      const hook = await setup();

      await submit(hook);

      expect(errorOf(hook, 'currentPassword')).toBe(
        'changePassword.validation.currentPasswordRequired',
      );
      expect(errorOf(hook, 'newPassword')).toBe(
        'changePassword.validation.newPasswordRequired',
      );
      expect(errorOf(hook, 'confirmPassword')).toBe(
        'changePassword.validation.confirmPasswordRequired',
      );
      expect(mockReauthenticate).not.toHaveBeenCalled();
    });

    it('re-validates a field as it changes after a submit', async () => {
      const hook = await setup();

      await submit(hook);
      await fill(hook, { next: 'short' });

      expect(errorOf(hook, 'newPassword')).toBe('validation.passwordTooShort');

      await fill(hook, { next: 'long-enough' });

      expect(errorOf(hook, 'newPassword')).toBe('');
      expect(errorOf(hook, 'currentPassword')).not.toBe('');
    });

    it('clears a stale mismatch when the new password is fixed', async () => {
      const hook = await setup();

      await fill(hook, {
        current: 'old-password',
        next: 'new-password-1',
        confirm: 'new-password-2',
      });
      await submit(hook);

      expect(errorOf(hook, 'confirmPassword')).toBe(
        'validation.passwordsMismatch',
      );

      await fill(hook, { next: 'new-password-2' });

      expect(errorOf(hook, 'confirmPassword')).toBe('');
    });

    it('re-checks "same as current" when the current password changes', async () => {
      const hook = await setup();

      await fill(hook, {
        current: 'old-password',
        next: 'new-password-1',
        confirm: 'new-password-1',
      });
      await submit(hook);

      await fill(hook, { current: 'new-password-1' });

      expect(errorOf(hook, 'newPassword')).toBe(
        'changePassword.validation.newPasswordSameAsCurrent',
      );

      await fill(hook, { current: 'old-password' });

      expect(errorOf(hook, 'newPassword')).toBe('');
    });

    it('focuses the first invalid field on submit', async () => {
      const hook = await setup();
      const focus = { current: jest.fn(), next: jest.fn(), confirm: jest.fn() };

      await act(async () => {
        const { fields } = hook.result.current;

        fields.currentPassword.ref({ focus: focus.current });
        fields.newPassword.ref({ focus: focus.next });
        fields.confirmPassword.ref({ focus: focus.confirm });
      });
      await fill(hook, { current: 'old-password' });
      await submit(hook);

      expect(focus.next).toHaveBeenCalled();
      expect(focus.current).not.toHaveBeenCalled();
      expect(focus.confirm).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('reauthenticates with the current password and updates it', async () => {
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(mockCredential).toHaveBeenCalledWith(
        'rider@example.com',
        'old-password',
      );
      expect(mockReauthenticate).toHaveBeenCalledWith({
        email: 'rider@example.com',
        password: 'old-password',
      });
      expect(mockUpdatePassword).toHaveBeenCalledWith('new-password-1');
      expect(mockReauthenticate.mock.invocationCallOrder[0]).toBeLessThan(
        mockUpdatePassword.mock.invocationCallOrder[0],
      );
      expect(hook.result.current.busy).toBe(false);
    });

    it('disables every field while the change is pending', async () => {
      let finish!: () => void;

      mockUpdatePassword.mockReturnValueOnce(
        new Promise<void>(resolve => {
          finish = resolve;
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

    it('shows a success toast and goes back at once, with no alert', async () => {
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(mockToast.success).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith(
        'changePassword.success.title',
      );
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it.each(['auth/wrong-password', 'auth/invalid-credential'])(
      'maps %s to the current password field',
      async code => {
        mockReauthenticate.mockRejectedValue({ code });
        const hook = await setup();

        await fillValid(hook);
        await submit(hook);

        expect(errorOf(hook, 'currentPassword')).toBe(
          'changePassword.errors.currentPasswordInvalid',
        );
        expect(hook.result.current.formError).toBe('');
        expect(mockUpdatePassword).not.toHaveBeenCalled();
      },
    );

    it('maps auth/weak-password to the new password field', async () => {
      mockUpdatePassword.mockRejectedValue({ code: 'auth/weak-password' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(errorOf(hook, 'newPassword')).toBe(
        'changePassword.errors.weakPassword',
      );
      expect(hook.result.current.formError).toBe('');
    });

    it.each([
      ['auth/too-many-requests', 'changePassword.errors.tooManyRequests'],
      ['auth/network-request-failed', 'changePassword.errors.networkFailed'],
      ['auth/something-else', 'changePassword.errors.generic'],
    ])('maps %s to a form-level error', async (code, message) => {
      mockReauthenticate.mockRejectedValue({ code });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.formError).toBe(message);
      expect(errorOf(hook, 'currentPassword')).toBe('');
      expect(mockAlert).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(mockBack).not.toHaveBeenCalled();
      expect(hook.result.current.busy).toBe(false);
    });

    it('clears the form-level error when any field changes', async () => {
      mockReauthenticate.mockRejectedValue({ code: 'auth/unknown' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);
      await fill(hook, { next: 'another-password' });

      expect(hook.result.current.formError).toBe('');
    });

    it('clears a mapped field error when any field changes', async () => {
      mockUpdatePassword.mockRejectedValue({ code: 'auth/weak-password' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);
      await fill(hook, { confirm: 'new-password-1' });

      expect(errorOf(hook, 'newPassword')).toBe('');
    });
  });

  describe('forgot current password', () => {
    it('asks for confirmation with the account email before sending', async () => {
      const hook = await setup();

      await act(async () => hook.result.current.forgotPassword());

      expect(mockAlert).toHaveBeenCalledWith(
        'changePassword.reset.confirmTitle:{"email":"rider@example.com"}',
        undefined,
        expect.any(Array),
      );
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('sends the reset email on confirm and shows a success alert', async () => {
      const hook = await setup();

      await act(async () => hook.result.current.forgotPassword());
      await act(async () => {
        await pressAlertButton(0, 'default');
      });

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        'rider@example.com',
      );
      await waitFor(() =>
        expect(mockAlert).toHaveBeenLastCalledWith(
          'changePassword.reset.successTitle',
          'changePassword.reset.successBody:{"email":"rider@example.com"}',
        ),
      );
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('shows a form-level error when sending fails', async () => {
      mockSendPasswordResetEmail.mockRejectedValue({
        code: 'auth/network-request-failed',
      });
      const hook = await setup();

      await act(async () => hook.result.current.forgotPassword());
      await act(async () => {
        await pressAlertButton(0, 'default');
      });

      await waitFor(() =>
        expect(hook.result.current.formError).toBe(
          'changePassword.errors.networkFailed',
        ),
      );
    });

    it('shows only the change error when a submit follows a failed reset email', async () => {
      mockSendPasswordResetEmail.mockRejectedValue({
        code: 'auth/network-request-failed',
      });
      mockReauthenticate.mockRejectedValue({ code: 'auth/too-many-requests' });
      const hook = await setup();

      await act(async () => hook.result.current.forgotPassword());
      await act(async () => {
        await pressAlertButton(0, 'default');
      });
      await waitFor(() =>
        expect(hook.result.current.formError).toBe(
          'changePassword.errors.networkFailed',
        ),
      );

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.formError).toBe(
        'changePassword.errors.tooManyRequests',
      );
    });
  });
});
