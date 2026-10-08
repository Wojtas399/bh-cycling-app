import { revokeIntervalsToken } from '../intervals/revokeToken';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';

const MAX_AUTH_AGE_SECONDS = 5 * 60;

export async function deleteAccountHandler(
  request: CallableRequest<unknown>,
): Promise<{ success: true }> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  // The Admin SDK skips Firebase's own recent-login check, so this is the
  // only thing enforcing it.
  const authTime = request.auth.token.auth_time;

  if (
    typeof authTime !== 'number' ||
    Date.now() / 1000 - authTime > MAX_AUTH_AGE_SECONDS
  ) {
    throw new HttpsError(
      'failed-precondition',
      'Recent sign-in required. Re-authenticate and try again.',
    );
  }

  const { uid } = request.auth;

  await revokeIntervalsToken(uid);

  const db = getFirestore();

  await db.recursiveDelete(db.doc(`users/${uid}`));

  // Deleted last so that a retry after a partial failure still passes the
  // authentication check above.
  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') {
      throw error;
    }
  }

  return { success: true };
}
