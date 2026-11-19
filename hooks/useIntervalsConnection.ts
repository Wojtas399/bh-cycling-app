import { useState, useSyncExternalStore } from 'react';

import { subscribeToNothing } from '@/lib/externalStore';
import { auth, firestore } from '@/lib/firebase';
import { intervalsIntegrationDocPath } from '@/lib/firestorePaths';

export interface IntervalsConnectionState {
  isConnected: boolean;
  athleteName: string | null;
  athleteId: string | null;
  accessToken: string | null;
  /** The scopes granted at the last consent, as Intervals.icu returned them. */
  scope: string | null;
  loading: boolean;
}

const NOT_CONNECTED: IntervalsConnectionState = {
  isConnected: false,
  athleteName: null,
  athleteId: null,
  accessToken: null,
  scope: null,
  loading: false,
};

const LOADING: IntervalsConnectionState = { ...NOT_CONNECTED, loading: true };

interface ConnectionStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => IntervalsConnectionState;
}

/** Follows one user's integration document; signed out, there is none. */
function createConnectionStore(uid: string | undefined): ConnectionStore {
  if (!uid) {
    return { subscribe: subscribeToNothing, getSnapshot: () => NOT_CONNECTED };
  }

  let state = LOADING;

  return {
    getSnapshot: () => state,
    subscribe: onChange =>
      firestore()
        .doc(intervalsIntegrationDocPath(uid))
        .onSnapshot(snapshot => {
          const data = snapshot?.data() as
            | {
                accessToken?: string;
                athleteId?: string;
                athleteName?: string;
                scope?: string;
              }
            | undefined;

          state = data?.accessToken
            ? {
                isConnected: true,
                athleteName: data.athleteName ?? null,
                athleteId: data.athleteId ?? null,
                accessToken: data.accessToken,
                scope: data.scope ?? null,
                loading: false,
              }
            : NOT_CONNECTED;
          onChange();
        }),
  };
}

/**
 * The signed-in user's Intervals.icu connection, followed live. It is loading
 * until the first snapshot, and not connected without loading when signed
 * out. The user is the one signed in when the hook mounts.
 */
export function useIntervalsConnection(): IntervalsConnectionState {
  const [store] = useState(() =>
    createConnectionStore(auth().currentUser?.uid),
  );

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
