import { GoogleSignin, auth } from './firebase';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

export async function signInWithGoogle(): Promise<'signedIn' | 'cancelled'> {
  try {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();

    if (result.type === 'cancelled') return 'cancelled';

    const idToken = result.data?.idToken;

    if (!idToken) throw new Error('no_id_token');

    const credential = auth.GoogleAuthProvider.credential(idToken);

    await auth().signInWithCredential(credential);

    return 'signedIn';
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      return 'cancelled';
    }

    throw e;
  }
}
