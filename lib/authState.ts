import { auth } from '@/lib/firebase';

/** Where the user may be: `unknown` until Firebase first reports the user. */
export type AuthState = 'unknown' | 'signedOut' | 'unverified' | 'verified';

type Listener = () => void;

let state: AuthState = 'unknown';
const listeners = new Set<Listener>();
let stopListening: (() => void) | null = null;

/**
 * Follows the signed-in user's auth state. Every listener shares one
 * Firebase listener, which runs only while anything listens.
 */
export function subscribeToAuthState(listener: Listener): () => void {
  listeners.add(listener);

  // `onUserChanged`, not `onAuthStateChanged`: only the former fires after
  // `currentUser.reload()`, which is how verify-email learns that the email
  // was verified. It also fires on every sign-in and sign-out.
  stopListening ??= auth().onUserChanged(user => {
    if (!user) state = 'signedOut';
    else state = user.emailVerified ? 'verified' : 'unverified';

    listeners.forEach(notify => notify());
  });

  return () => {
    listeners.delete(listener);

    if (listeners.size > 0) return;

    // With nothing listening, the last state could go stale.
    stopListening?.();
    stopListening = null;
    state = 'unknown';
  };
}

export function getAuthState(): AuthState {
  return state;
}
