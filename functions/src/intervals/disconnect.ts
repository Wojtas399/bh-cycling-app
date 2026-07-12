import { getFirestore } from 'firebase-admin/firestore';
import { type CallableRequest, HttpsError } from 'firebase-functions/v2/https';

export async function disconnectIntervalsHandler(
  request: CallableRequest<unknown>,
): Promise<{ success: true }> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  await getFirestore()
    .doc(`users/${request.auth.uid}/integrations/intervals`)
    .delete();

  return { success: true };
}
