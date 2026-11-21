import { intervalsIntegrationDocPath } from '../firestorePaths';
import { intervalsIntegrationSchema } from './types';
import { getFirestore } from 'firebase-admin/firestore';
import * as v from 'valibot';

const DISCONNECT_APP_URL = 'https://intervals.icu/api/v1/disconnect-app';

export async function revokeIntervalsToken(uid: string): Promise<void> {
  try {
    const snapshot = await getFirestore()
      .doc(intervalsIntegrationDocPath(uid))
      .get();

    if (!snapshot.exists) return;

    const parsed = v.safeParse(intervalsIntegrationSchema, snapshot.data());

    if (!parsed.success) {
      console.error(
        'Intervals.icu token revocation skipped: the integration document is malformed.',
      );

      return;
    }

    const { accessToken } = parsed.output;
    const response = await fetch(DISCONNECT_APP_URL, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 401) {
      console.error(
        `Intervals.icu token revocation failed with status ${response.status}.`,
      );
    }
  } catch (error) {
    console.error('Intervals.icu token revocation failed.', error);
  }
}
