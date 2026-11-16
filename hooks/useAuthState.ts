import { useSyncExternalStore } from 'react';

import { auth } from '@/lib/firebase';

/** Where the user may be: `unknown` until Firebase first reports the user. */
export type AuthState = 'unknown' | 'signedOut' | 'unverified' | 'verified';

type Listener = () => void;

let state: AuthState = 'unknown';
const listeners = new Set<Listener>();
let stopListening: (() => void) | null = null;

function subscribe(listener: Listener): () => void {
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

function getSnapshot(): AuthState {
  return state;
}

/**
 * The signed-in user's auth state, shared by every caller through one
 * Firebase listener. The route guards decide from it where the user may be.
 */
export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
