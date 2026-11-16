import { useSyncExternalStore } from 'react';

import {
  type AuthState,
  getAuthState,
  subscribeToAuthState,
} from '@/lib/authState';

/**
 * The signed-in user's auth state. The route guards decide from it where the
 * user may be.
 */
export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribeToAuthState, getAuthState, getAuthState);
}
