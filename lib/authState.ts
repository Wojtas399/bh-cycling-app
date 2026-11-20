import { createListeners } from '@/lib/externalStore';
import { auth } from '@/lib/firebase';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type AuthState = 'unknown' | 'signedOut' | 'unverified' | 'verified';

let state: AuthState = 'unknown';

function followUserThroughReloads(
  onUser: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  return auth().onUserChanged(onUser);
}

const listeners = createListeners(() => {
  const stopFollowing = followUserThroughReloads(user => {
    if (!user) state = 'signedOut';
    else state = user.emailVerified ? 'verified' : 'unverified';

    listeners.notify();
  });

  return () => {
    stopFollowing();
    state = 'unknown';
  };
});

export const subscribeToAuthState = listeners.subscribe;

export function getAuthState(): AuthState {
  return state;
}
