import type * as VerificationEmailModule from '../verificationEmail';

let verificationEmail: typeof VerificationEmailModule;

function loadVerificationEmailNeverSentBefore() {
  jest.isolateModules(() => {
    verificationEmail = jest.requireActual<typeof VerificationEmailModule>(
      '../verificationEmail',
    );
  });
}

describe('verificationEmail', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 20, 9) });
    loadVerificationEmailNeverSentBefore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has no send time until an email is sent', () => {
    expect(verificationEmail.getVerificationEmailSentAt()).toBeNull();
  });

  it('records the send before the request goes out', async () => {
    const listener = jest.fn();
    let sentAtWhenRequested: number | null = null;

    verificationEmail.subscribeVerificationEmailSent(listener);
    await verificationEmail.sendVerificationEmail({
      sendEmailVerification: async () => {
        sentAtWhenRequested = verificationEmail.getVerificationEmailSentAt();
        expect(listener).toHaveBeenCalledTimes(1);
      },
    });

    expect(sentAtWhenRequested).toBe(new Date(2026, 10, 20, 9).getTime());
  });

  it('swallows a failed send, since Resend covers it', async () => {
    await expect(
      verificationEmail.sendVerificationEmail({
        sendEmailVerification: () => Promise.reject(new Error('offline')),
      }),
    ).resolves.toBeUndefined();
    expect(verificationEmail.getVerificationEmailSentAt()).toBe(
      new Date(2026, 10, 20, 9).getTime(),
    );
  });
});
