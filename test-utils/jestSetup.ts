jest.mock('@/lib/errorReporting', () => ({
  reportError: jest.fn(),
  startErrorReporting: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));
