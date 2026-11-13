import { useEffect, useState } from 'react';

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

export function useIntervalsConnection(): IntervalsConnectionState {
  // Signed out, there is no document to wait for.
  const [state, setState] = useState<IntervalsConnectionState>(() =>
    auth().currentUser ? { ...NOT_CONNECTED, loading: true } : NOT_CONNECTED,
  );

  useEffect(() => {
    const uid = auth().currentUser?.uid;

    if (!uid) return;

    const unsubscribe = firestore()
      .doc(intervalsIntegrationDocPath(uid))
      .onSnapshot(snapshot => {
        if (!snapshot) {
          setState(NOT_CONNECTED);

          return;
        }

        const data = snapshot.data() as
          | {
              accessToken?: string;
              athleteId?: string;
              athleteName?: string;
              scope?: string;
            }
          | undefined;

        if (data?.accessToken) {
          setState({
            isConnected: true,
            athleteName: data.athleteName ?? null,
            athleteId: data.athleteId ?? null,
            accessToken: data.accessToken,
            scope: data.scope ?? null,
            loading: false,
          });
        } else {
          setState(NOT_CONNECTED);
        }
      });

    return unsubscribe;
  }, []);

  return state;
}
