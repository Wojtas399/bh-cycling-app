import { useState, useSyncExternalStore } from 'react';

import type { HealthDataConsentRecord } from './healthDataConsent';
import { subscribeToNothing } from '@/lib/externalStore';
import { auth, firestore } from '@/lib/firebase';
import { healthDataConsentDocPath } from '@/lib/firestorePaths';
import * as v from 'valibot';

export interface HealthDataConsentRecordState {
  loading: boolean;
  record: HealthDataConsentRecord | null;
}

const NO_RECORD: HealthDataConsentRecordState = {
  loading: false,
  record: null,
};

const LOADING: HealthDataConsentRecordState = { loading: true, record: null };

const consentRecordSchema = v.object({ consentVersion: v.number() });

interface ConsentRecordStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => HealthDataConsentRecordState;
}

function createConsentRecordStore(uid: string | undefined): ConsentRecordStore {
  if (!uid) {
    return { subscribe: subscribeToNothing, getSnapshot: () => NO_RECORD };
  }

  let state = LOADING;

  return {
    getSnapshot: () => state,
    subscribe: onChange =>
      firestore()
        .doc(healthDataConsentDocPath(uid))
        .onSnapshot(snapshot => {
          const parsed = v.safeParse(consentRecordSchema, snapshot?.data());

          state = parsed.success
            ? {
                loading: false,
                record: { consentVersion: parsed.output.consentVersion },
              }
            : NO_RECORD;
          onChange();
        }),
  };
}

export function useHealthDataConsentRecord(): HealthDataConsentRecordState {
  const [store] = useState(() =>
    createConsentRecordStore(auth().currentUser?.uid),
  );

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
