import { auth, firestore } from '@/lib/firebase';
import type { IntervalsAuthError } from '@/lib/intervalsApi';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';

export async function handleIntervalsAuthError(
  _error: IntervalsAuthError,
): Promise<void> {
  const uid = auth().currentUser?.uid;

  if (uid) {
    await firestore().doc(`users/${uid}/integrations/intervals`).delete();
  }

  setNeedsReconnect(true);
}
