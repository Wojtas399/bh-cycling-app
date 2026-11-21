import { useSyncExternalStore } from 'react';

import {
  type AuthState,
  getAuthState,
  subscribeToAuthState,
} from '@/lib/authState';

export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribeToAuthState, getAuthState, getAuthState);
}
