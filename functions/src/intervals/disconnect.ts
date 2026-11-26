import {
  healthDataConsentDocPath,
  intervalsIntegrationDocPath,
} from '../firestorePaths';
import { revokeIntervalsToken } from './revokeToken';
import { getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';

export async function disconnectIntervalsHandler(
  request: CallableRequest<unknown>,
): Promise<{ success: true }> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const { uid } = request.auth;

  await revokeIntervalsToken(uid);

  const db = getFirestore();

  await db
    .batch()
    .delete(db.doc(intervalsIntegrationDocPath(uid)))
    .delete(db.doc(healthDataConsentDocPath(uid)))
    .commit();

  return { success: true };
}
