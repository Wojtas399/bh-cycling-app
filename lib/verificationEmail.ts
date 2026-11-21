import { createListeners } from '@/lib/externalStore';
import { ignoreFailure } from '@/lib/ignoreFailure';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

let sentAt: number | null = null;
const listeners = createListeners();

export function getVerificationEmailSentAt(): number | null {
  return sentAt;
}

export const subscribeVerificationEmailSent = listeners.subscribe;

export async function sendVerificationEmail(
  user: Pick<FirebaseAuthTypes.User, 'sendEmailVerification'>,
): Promise<void> {
  sentAt = Date.now();
  listeners.notify();
  await ignoreFailure(() => user.sendEmailVerification());
}
