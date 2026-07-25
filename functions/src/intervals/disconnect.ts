import { intervalsIntegrationDocPath } from '../firestorePaths';
import { getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';

export async function disconnectIntervalsHandler(
  request: CallableRequest<unknown>,
): Promise<{ success: true }> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  await getFirestore()
    .doc(intervalsIntegrationDocPath(request.auth.uid))
    .delete();

  return { success: true };
}
