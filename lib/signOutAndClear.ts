import { GoogleSignin, auth } from './firebase';
import { setHealthDataConsentWithdrawn } from './healthDataConsentWithdrawalStore';
import { ignoreFailure } from './ignoreFailure';
import { setNeedsReconnect } from './intervalsReconnectStore';
import { queryClient } from './queryClient';

export async function signOutAndClear(): Promise<void> {
  queryClient.clear();
  setNeedsReconnect(false);
  setHealthDataConsentWithdrawn(false);
  await ignoreFailure(() => GoogleSignin.signOut());
  await auth().signOut();
}
