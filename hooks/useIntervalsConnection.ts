import { useEffect, useState } from 'react';

import { auth, firestore } from '@/lib/firebase';
import { intervalsIntegrationDocPath } from '@/lib/firestorePaths';

export interface IntervalsConnectionState {
  isConnected: boolean;
  athleteName: string | null;
  athleteId: string | null;
  accessToken: string | null;
  loading: boolean;
}

const NOT_CONNECTED: IntervalsConnectionState = {
  isConnected: false,
  athleteName: null,
  athleteId: null,
  accessToken: null,
  loading: false,
};

export function useIntervalsConnection(): IntervalsConnectionState {
  const [state, setState] = useState<IntervalsConnectionState>({
    ...NOT_CONNECTED,
    loading: true,
  });

  useEffect(() => {
    const uid = auth().currentUser?.uid;

    if (!uid) {
      setState(NOT_CONNECTED);

      return;
    }

    const unsubscribe = firestore()
      .doc(intervalsIntegrationDocPath(uid))
      .onSnapshot(snapshot => {
        if (!snapshot) {
          setState(NOT_CONNECTED);

          return;
        }

        const data = snapshot.data() as
          | { accessToken?: string; athleteId?: string; athleteName?: string }
          | undefined;

        if (data?.accessToken) {
          setState({
            isConnected: true,
            athleteName: data.athleteName ?? null,
            athleteId: data.athleteId ?? null,
            accessToken: data.accessToken,
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
