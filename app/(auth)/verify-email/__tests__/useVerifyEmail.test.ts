import { useVerifyEmail } from '../useVerifyEmail';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act } from '@testing-library/react-native';

const mockUser = {
  email: 'rider@example.com',
  emailVerified: false,
  reload: jest.fn(),
  sendEmailVerification: jest.fn(),
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ currentUser: mockUser, signOut: jest.fn() }),
}));

/**
 * Renders the hook with the cooldown that starts on mount already run down,
 * so a resend goes through.
 */
async function setupAfterCooldown() {
  jest.useFakeTimers();
  const hook = await renderHookWithClient(() => useVerifyEmail());

  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });
  jest.useRealTimers();

  return hook;
}

type Hook = Awaited<ReturnType<typeof setupAfterCooldown>>;

// React Query hands the settled state to the hook on a later tick.
async function settle() {
  await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

async function checkVerified(hook: Hook) {
  await act(async () => {
    await hook.result.current.handleVerified();
  });
  await settle();
}

async function resend(hook: Hook) {
  await act(async () => {
    await hook.result.current.handleResend();
  });
  await settle();
}

describe('useVerifyEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.emailVerified = false;
    mockUser.reload.mockResolvedValue(undefined);
    mockUser.sendEmailVerification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows notVerified when the user is still unverified', async () => {
    const hook = await setupAfterCooldown();

    await checkVerified(hook);

    expect(hook.result.current.error).toBe('verifyEmail.errors.notVerified');
  });

  it('clears the check error when a resend starts', async () => {
    const hook = await setupAfterCooldown();

    await checkVerified(hook);

    expect(hook.result.current.error).toBe('verifyEmail.errors.notVerified');

    await resend(hook);

    expect(hook.result.current.error).toBe('');
  });

  it('clears the resend error when a check starts', async () => {
    mockUser.sendEmailVerification.mockRejectedValue({
      code: 'auth/network-request-failed',
    });
    const hook = await setupAfterCooldown();

    await resend(hook);

    expect(hook.result.current.error).toBe('verifyEmail.errors.networkFailed');

    mockUser.emailVerified = true;
    await checkVerified(hook);

    expect(hook.result.current.error).toBe('');
  });
});
