import { useVerifyEmail } from '../useVerifyEmail';
import { sendVerificationEmail } from '@/lib/verificationEmail';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { act } from '@testing-library/react-native';

const mockUser = {
  uid: 'rider',
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
 * Opens verify-email when no email went out in the last minute, as on a cold
 * start, so a resend goes through. A send an earlier test made is a minute
 * old by then.
 */
async function openWithNoRecentSend() {
  jest.useFakeTimers();
  jest.advanceTimersByTime(60_000);
  const hook = await renderHookWithClient(() => useVerifyEmail());

  jest.useRealTimers();

  return hook;
}

type Hook = Awaited<ReturnType<typeof openWithNoRecentSend>>;

// What sign-up and sign-in do after the account signs in.
async function handlerSends() {
  await act(async () => {
    await sendVerificationEmail(mockUser);
  });
}

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

  it('sends no email on mount', async () => {
    await renderHookWithClient(() => useVerifyEmail());
    await settle();

    expect(mockUser.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('has Resend ready when no email went out in the last minute', async () => {
    const hook = await openWithNoRecentSend();

    expect(hook.result.current.cooldown).toBe(0);

    await resend(hook);

    expect(mockUser.sendEmailVerification).toHaveBeenCalledTimes(1);
    expect(hook.result.current.cooldown).toBe(60);
  });

  it('opens with Resend on cooldown after sign-up or sign-in sent the email', async () => {
    await handlerSends();
    const hook = await renderHookWithClient(() => useVerifyEmail());

    expect(hook.result.current.cooldown).toBe(60);

    await resend(hook);

    // One email: the handler's. Resend did nothing.
    expect(mockUser.sendEmailVerification).toHaveBeenCalledTimes(1);
  });

  it('starts the cooldown when the email goes out after the screen opened', async () => {
    const hook = await openWithNoRecentSend();

    expect(hook.result.current.cooldown).toBe(0);

    await handlerSends();

    expect(hook.result.current.cooldown).toBe(60);
  });

  it('shows notVerified when the user is still unverified', async () => {
    const hook = await openWithNoRecentSend();

    await checkVerified(hook);

    expect(hook.result.current.error).toBe('verifyEmail.errors.notVerified');
  });

  it('clears the check error when a resend starts', async () => {
    const hook = await openWithNoRecentSend();

    await checkVerified(hook);

    expect(hook.result.current.error).toBe('verifyEmail.errors.notVerified');

    await resend(hook);

    expect(hook.result.current.error).toBe('');
  });

  it('clears the resend error when a check starts', async () => {
    mockUser.sendEmailVerification.mockRejectedValue({
      code: 'auth/network-request-failed',
    });
    const hook = await openWithNoRecentSend();

    await resend(hook);

    expect(hook.result.current.error).toBe('verifyEmail.errors.networkFailed');

    mockUser.emailVerified = true;
    await checkVerified(hook);

    expect(hook.result.current.error).toBe('');
  });
});
