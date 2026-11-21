import { intervalsIntegrationDocPath } from '../firestorePaths';
import type { IntervalsIntegration } from './types';
import { getFirestore } from 'firebase-admin/firestore';

const DISCONNECT_APP_URL = 'https://intervals.icu/api/v1/disconnect-app';

export async function revokeIntervalsToken(uid: string): Promise<void> {
  try {
    const snapshot = await getFirestore()
      .doc(intervalsIntegrationDocPath(uid))
      .get();

    if (!snapshot.exists) return;

    const { accessToken } = snapshot.data() as IntervalsIntegration;
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
