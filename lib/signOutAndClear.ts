import { GoogleSignin, auth } from './firebase';
import { setNeedsReconnect } from './intervalsReconnectStore';
import { queryClient } from './queryClient';

/**
 * Signs the user out and drops everything cached in memory for them, so a
 * different user signing in during the same session never sees their data.
 */
export async function signOutAndClear(): Promise<void> {
  queryClient.clear();
  setNeedsReconnect(false);

  try {
    await GoogleSignin.signOut();
  } catch {
    // No Google session (email/password user) or it is already gone — the
    // Firebase sign-out below is what matters.
  }

  await auth().signOut();
}
