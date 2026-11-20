import { auth, firestore } from '@/lib/firebase';
import { intervalsIntegrationDocPath } from '@/lib/firestorePaths';
import { removeIntervalsQueries } from '@/lib/intervalsQueries';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import type { QueryClient } from '@tanstack/react-query';

export async function handleIntervalsAuthError(
  client: QueryClient,
): Promise<void> {
  await disableIntervalsQueriesThenRemoveThem(client);
  await deleteIntervalsIntegrationDoc();
}

async function disableIntervalsQueriesThenRemoveThem(
  client: QueryClient,
): Promise<void> {
  setNeedsReconnect(true);
  await removeIntervalsQueries(client);
}

async function deleteIntervalsIntegrationDoc(): Promise<void> {
  const uid = auth().currentUser?.uid;

  if (uid) {
    await firestore().doc(intervalsIntegrationDocPath(uid)).delete();
  }
}
