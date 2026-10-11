import { clearCalendarCache } from '@/lib/calendarWorkouts';
import { auth, firestore } from '@/lib/firebase';
import { intervalsIntegrationDocPath } from '@/lib/firestorePaths';
import { removeIntervalsQueries } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import type { QueryClient } from '@tanstack/react-query';

/**
 * The token is known-bad: prompt for a reconnect and drop everything cached
 * with it. Runs once per failed query, so several 401s at once run it several
 * times — every step is safe to repeat.
 */
export async function handleIntervalsAuthError(
  client: QueryClient,
): Promise<void> {
  // First, so every Intervals query is disabled before the wipe below — a
  // remounting screen must not refetch with the bad token and 401 again.
  setNeedsReconnect(true);
  await removeIntervalsQueries(client);
  clearCalendarCache();

  // Best-effort: even if the integration doc can't be deleted (offline,
  // rules), the steps above have already run.
  const uid = auth().currentUser?.uid;

  if (uid) {
    await firestore().doc(intervalsIntegrationDocPath(uid)).delete();
  }
}
