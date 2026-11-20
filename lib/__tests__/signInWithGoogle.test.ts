import { signInWithGoogle } from '../signInWithGoogle';

const mockGoogleSignIn = jest.fn();
const mockSignInWithCredential = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
  isErrorWithCode: (e: unknown) =>
    typeof e === 'object' && e !== null && 'code' in e,
}));

jest.mock('../firebase', () => {
  const auth = Object.assign(
    jest.fn(() => ({ signInWithCredential: mockSignInWithCredential })),
    { GoogleAuthProvider: { credential: jest.fn(() => 'credential') } },
  );

  return {
    auth,
    GoogleSignin: {
      hasPlayServices: jest.fn(async () => true),
      signIn: (...args: unknown[]) => mockGoogleSignIn(...args),
    },
  };
});

describe('signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves cancelled when the Google prompt returns a cancel', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled', data: null });

    await expect(signInWithGoogle()).resolves.toBe('cancelled');
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });

  it('resolves cancelled when the Google prompt throws a cancel', async () => {
    mockGoogleSignIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });

    await expect(signInWithGoogle()).resolves.toBe('cancelled');
  });

  it('rejects any failure other than a cancel', async () => {
    mockGoogleSignIn.mockRejectedValue({ code: 'NETWORK_ERROR' });

    await expect(signInWithGoogle()).rejects.toEqual({
      code: 'NETWORK_ERROR',
    });
  });

  it('rejects when Google returns no ID token', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'success', data: {} });

    await expect(signInWithGoogle()).rejects.toThrow('no_id_token');
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });
});
