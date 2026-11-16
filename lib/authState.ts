import { createListeners } from '@/lib/externalStore';
import { auth } from '@/lib/firebase';

/** Where the user may be: `unknown` until Firebase first reports the user. */
export type AuthState = 'unknown' | 'signedOut' | 'unverified' | 'verified';

let state: AuthState = 'unknown';

const listeners = createListeners(() => {
  // `onUserChanged`, not `onAuthStateChanged`: only the former fires after
  // `currentUser.reload()`, which is how verify-email learns that the email
  // was verified. It also fires on every sign-in and sign-out.
  const stopListening = auth().onUserChanged(user => {
    if (!user) state = 'signedOut';
    else state = user.emailVerified ? 'verified' : 'unverified';

    listeners.notify();
  });

  return () => {
    stopListening();
    // With nothing listening, the last state could go stale.
    state = 'unknown';
  };
});

/**
 * Follows the signed-in user's auth state. Every listener shares one
 * Firebase listener, which runs only while anything listens.
 */
export const subscribeToAuthState = listeners.subscribe;

export function getAuthState(): AuthState {
  return state;
}
