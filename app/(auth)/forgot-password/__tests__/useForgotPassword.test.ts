import { useForgotPassword } from '../useForgotPassword';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act } from '@testing-library/react-native';

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

async function setup() {
  return renderHookWithClient(() => useForgotPassword());
}

type Hook = Awaited<ReturnType<typeof setup>>;

// React Query hands the settled state to the hook on a later tick.
async function settle() {
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

async function send(hook: Hook) {
  await act(async () => hook.result.current.onEmailChange('rider@example.com'));
  await act(async () => {
    await hook.result.current.handleSend();
  });
  await settle();
}

describe('useForgotPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the error when typing', async () => {
    mockSendPasswordResetEmail.mockRejectedValue({
      code: 'auth/user-not-found',
    });
    const hook = await setup();

    await send(hook);

    expect(hook.result.current.error).toBe(
      'forgotPassword.errors.userNotFound',
    );

    await act(async () =>
      hook.result.current.onEmailChange('other@example.com'),
    );

    expect(hook.result.current.error).toBe('');
  });

  it('starts the cooldown after a successful send', async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    const hook = await setup();

    await send(hook);

    expect(hook.result.current.success).toBe(true);
    expect(hook.result.current.cooldown).toBe(60);
    expect(hook.result.current.loading).toBe(false);
  });

  it('ignores a resend during the cooldown', async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    const hook = await setup();

    await send(hook);
    await act(async () => {
      await hook.result.current.handleResend();
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('ignores a resend while a send is pending', async () => {
    mockSendPasswordResetEmail.mockReturnValue(new Promise(() => {}));
    const hook = await setup();

    await act(async () =>
      hook.result.current.onEmailChange('rider@example.com'),
    );
    await act(async () => {
      void hook.result.current.handleSend();
    });
    await settle();

    expect(hook.result.current.loading).toBe(true);

    await act(async () => {
      await hook.result.current.handleResend();
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });
});
