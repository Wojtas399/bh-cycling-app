import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';

import { useChangePassword } from '../useChangePassword';
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

const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

async function setup() {
  return renderHookWithClient(() => useChangePassword());
}

type Hook = Awaited<ReturnType<typeof setup>>;

async function fill(
  hook: Hook,
  values: { current?: string; next?: string; confirm?: string },
) {
  await act(async () => {
    if (values.current !== undefined) {
      hook.result.current.onCurrentPasswordChange(values.current);
    }

    if (values.next !== undefined) {
      hook.result.current.onNewPasswordChange(values.next);
    }

    if (values.confirm !== undefined) {
      hook.result.current.onConfirmPasswordChange(values.confirm);
    }
  });
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.handleSubmit();
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

  describe('validation', () => {
    it('requires all three fields', async () => {
      const hook = await setup();

      await submit(hook);

      expect(hook.result.current.currentPasswordError).toBe(
        'changePassword.validation.currentPasswordRequired',
      );
      expect(hook.result.current.newPasswordError).toBe(
        'changePassword.validation.newPasswordRequired',
      );
      expect(hook.result.current.confirmPasswordError).toBe(
        'changePassword.validation.confirmPasswordRequired',
      );
      expect(mockReauthenticate).not.toHaveBeenCalled();
    });

    it('rejects a new password shorter than the minimum length', async () => {
      const hook = await setup();

      await fill(hook, {
        current: 'old-password',
        next: '1234567',
        confirm: '1234567',
      });
      await submit(hook);

      expect(hook.result.current.newPasswordError).toContain(
        'changePassword.validation.newPasswordTooShort',
      );
      expect(mockReauthenticate).not.toHaveBeenCalled();
    });

    it('rejects a new password equal to the current one', async () => {
      const hook = await setup();

      await fill(hook, {
        current: 'same-password',
        next: 'same-password',
        confirm: 'same-password',
      });
      await submit(hook);

      expect(hook.result.current.newPasswordError).toBe(
        'changePassword.validation.newPasswordSameAsCurrent',
      );
      expect(mockReauthenticate).not.toHaveBeenCalled();
    });

    it('rejects a confirmation that does not match', async () => {
      const hook = await setup();

      await fill(hook, {
        current: 'old-password',
        next: 'new-password-1',
        confirm: 'new-password-2',
      });
      await submit(hook);

      expect(hook.result.current.confirmPasswordError).toBe(
        'changePassword.validation.passwordsMismatch',
      );
      expect(mockReauthenticate).not.toHaveBeenCalled();
    });

    it('clears a field error when that field changes', async () => {
      const hook = await setup();

      await submit(hook);
      await fill(hook, { current: 'x' });

      expect(hook.result.current.currentPasswordError).toBe('');
      expect(hook.result.current.newPasswordError).not.toBe('');
    });
  });

  describe('submit', () => {
    it('reauthenticates with the current password, updates it, and confirms', async () => {
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
      expect(mockAlert).toHaveBeenCalledWith(
        'changePassword.success.title',
        undefined,
        expect.any(Array),
      );
      expect(hook.result.current.loading).toBe(false);
    });

    it('goes back after the success alert is acknowledged', async () => {
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(mockBack).not.toHaveBeenCalled();

      pressAlertButton(0, 'default');

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it.each(['auth/wrong-password', 'auth/invalid-credential'])(
      'maps %s to the current password field',
      async code => {
        mockReauthenticate.mockRejectedValue({ code });
        const hook = await setup();

        await fillValid(hook);
        await submit(hook);

        expect(hook.result.current.currentPasswordError).toBe(
          'changePassword.errors.currentPasswordInvalid',
        );
        expect(hook.result.current.error).toBe('');
        expect(mockUpdatePassword).not.toHaveBeenCalled();
      },
    );

    it('maps auth/weak-password to the new password field', async () => {
      mockUpdatePassword.mockRejectedValue({ code: 'auth/weak-password' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.newPasswordError).toBe(
        'changePassword.errors.weakPassword',
      );
      expect(hook.result.current.error).toBe('');
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

      expect(hook.result.current.error).toBe(message);
      expect(hook.result.current.currentPasswordError).toBe('');
      expect(mockAlert).not.toHaveBeenCalled();
      expect(hook.result.current.loading).toBe(false);
    });

    it('clears the form-level error when any field changes', async () => {
      mockReauthenticate.mockRejectedValue({ code: 'auth/unknown' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);
      await fill(hook, { next: 'another-password' });

      expect(hook.result.current.error).toBe('');
    });

    it('clears a mapped field error when any field changes', async () => {
      mockUpdatePassword.mockRejectedValue({ code: 'auth/weak-password' });
      const hook = await setup();

      await fillValid(hook);
      await submit(hook);
      await fill(hook, { confirm: 'new-password-1' });

      expect(hook.result.current.newPasswordError).toBe('');
    });
  });

  describe('forgot current password', () => {
    it('asks for confirmation with the account email before sending', async () => {
      const hook = await setup();

      await act(async () => hook.result.current.handleForgotPassword());

      expect(mockAlert).toHaveBeenCalledWith(
        'changePassword.reset.confirmTitle:{"email":"rider@example.com"}',
        undefined,
        expect.any(Array),
      );
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('sends the reset email on confirm and shows a success alert', async () => {
      const hook = await setup();

      await act(async () => hook.result.current.handleForgotPassword());
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
    });

    it('shows a form-level error when sending fails', async () => {
      mockSendPasswordResetEmail.mockRejectedValue({
        code: 'auth/network-request-failed',
      });
      const hook = await setup();

      await act(async () => hook.result.current.handleForgotPassword());
      await act(async () => {
        await pressAlertButton(0, 'default');
      });

      await waitFor(() =>
        expect(hook.result.current.error).toBe(
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

      await act(async () => hook.result.current.handleForgotPassword());
      await act(async () => {
        await pressAlertButton(0, 'default');
      });
      await waitFor(() =>
        expect(hook.result.current.error).toBe(
          'changePassword.errors.networkFailed',
        ),
      );

      await fillValid(hook);
      await submit(hook);

      expect(hook.result.current.error).toBe(
        'changePassword.errors.tooManyRequests',
      );
    });
  });
});
