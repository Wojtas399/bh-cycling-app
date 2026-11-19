import { createListeners } from '@/lib/externalStore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

let sentAt: number | null = null;
const listeners = createListeners();

/**
 * When sign-up or sign-in last sent the verification email, or null. It is
 * kept in memory only, so a cold start forgets it.
 */
export function getVerificationEmailSentAt(): number | null {
  return sentAt;
}

export const subscribeVerificationEmailSent = listeners.subscribe;

/**
 * Sends the verification email. Sign-up and sign-in call it; verify-email
 * never sends on its own, so reopening the app with an unverified session
 * sends nothing. The send is recorded before the request, so verify-email
 * puts Resend on cooldown even when it opens mid-request. A failed send is
 * swallowed: the user can tap Resend once the cooldown runs out.
 */
export async function sendVerificationEmail(
  user: Pick<FirebaseAuthTypes.User, 'sendEmailVerification'>,
): Promise<void> {
  sentAt = Date.now();
  listeners.notify();

  try {
    await user.sendEmailVerification();
  } catch {
    // Resend on verify-email covers a failed send.
  }
}
