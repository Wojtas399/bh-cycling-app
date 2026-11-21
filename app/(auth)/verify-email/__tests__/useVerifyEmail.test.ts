import { useVerifyEmail } from '../useVerifyEmail';
import { sendVerificationEmail } from '@/lib/verificationEmail';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { settleQueries } from '@/test-utils/settle';
import { act } from '@testing-library/react-native';

const mockSignOut = jest.fn();
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
  auth: () => ({ currentUser: mockUser, signOut: mockSignOut }),
}));

function ageEarlierTestsSendsPastTheCooldown() {
  jest.useFakeTimers();
  jest.advanceTimersByTime(60_000);
}

async function openWithNoRecentSend() {
  ageEarlierTestsSendsPastTheCooldown();
  const hook = await renderHookWithClient(() => useVerifyEmail());

  jest.useRealTimers();

  return hook;
}

type Hook = Awaited<ReturnType<typeof openWithNoRecentSend>>;

async function signUpOrSignInSendsTheEmail() {
  await act(async () => {
    await sendVerificationEmail(mockUser);
  });
}

async function checkVerified(hook: Hook) {
  await act(async () => {
    await hook.result.current.handleVerified();
  });
  await settleQueries();
}

async function resend(hook: Hook) {
  await act(async () => {
    await hook.result.current.handleResend();
  });
  await settleQueries();
}

describe('useVerifyEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.emailVerified = false;
    mockUser.reload.mockResolvedValue(undefined);
    mockUser.sendEmailVerification.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends no email on mount', async () => {
    await renderHookWithClient(() => useVerifyEmail());
    await settleQueries();

    expect(mockUser.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('has Resend ready when no email went out in the last minute', async () => {
    const hook = await openWithNoRecentSend();

    expect(hook.result.current.cooldown).toBe(0);

    await resend(hook);

    expect(mockUser.sendEmailVerification).toHaveBeenCalledTimes(1);
    expect(hook.result.current.cooldown).toBe(60);
  });

  it('opens with Resend on cooldown after sign-up or sign-in sent the email, so Resend sends nothing more', async () => {
    await signUpOrSignInSendsTheEmail();
    const hook = await renderHookWithClient(() => useVerifyEmail());

    expect(hook.result.current.cooldown).toBe(60);

    await resend(hook);

    expect(mockUser.sendEmailVerification).toHaveBeenCalledTimes(1);
  });

  it('starts the cooldown when the email goes out after the auth gate opened the screen', async () => {
    const hook = await openWithNoRecentSend();

    expect(hook.result.current.cooldown).toBe(0);

    await signUpOrSignInSendsTheEmail();

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

  it('signs out', async () => {
    const hook = await openWithNoRecentSend();

    await act(async () => {
      await hook.result.current.handleSignOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('resolves when signing out fails, since the user has nothing to act on', async () => {
    mockSignOut.mockRejectedValue(new Error('sign-out failed'));
    const hook = await openWithNoRecentSend();

    await expect(hook.result.current.handleSignOut()).resolves.toBeUndefined();
  });

  it('resolves when signing out throws before returning a promise, since the user has nothing to act on', async () => {
    mockSignOut.mockImplementation(() => {
      throw new Error('sign-out failed');
    });
    const hook = await openWithNoRecentSend();

    await expect(hook.result.current.handleSignOut()).resolves.toBeUndefined();
  });
});
