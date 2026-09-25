import { clearCalendarCache } from '@/lib/calendarWorkouts';
import { auth, firestore } from '@/lib/firebase';
import { intervalsIntegrationDocPath } from '@/lib/firestorePaths';
import type { IntervalsAuthError } from '@/lib/intervalsApi';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';

export async function handleIntervalsAuthError(
  _error: IntervalsAuthError,
): Promise<void> {
  const uid = auth().currentUser?.uid;

  if (uid) {
    await firestore().doc(intervalsIntegrationDocPath(uid)).delete();
  }

  clearCalendarCache();
  setNeedsReconnect(true);
}
