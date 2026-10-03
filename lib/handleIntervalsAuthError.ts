import { clearCalendarCache } from '@/lib/calendarWorkouts';
import { auth, firestore } from '@/lib/firebase';
import { intervalsIntegrationDocPath } from '@/lib/firestorePaths';
import type { IntervalsAuthError } from '@/lib/intervalsApi';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';

export async function handleIntervalsAuthError(
  _error: IntervalsAuthError,
): Promise<void> {
  try {
    const uid = auth().currentUser?.uid;

    if (uid) {
      await firestore().doc(intervalsIntegrationDocPath(uid)).delete();
    }
  } finally {
    // Even if the integration doc couldn't be deleted (offline, rules), the
    // token is known-bad: drop its cached data and prompt for a reconnect.
    clearCalendarCache();
    setNeedsReconnect(true);
  }
}
