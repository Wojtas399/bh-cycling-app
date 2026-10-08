import { Alert } from 'react-native';

import { useSignIn } from '../useSignIn';
import { markAccountDeleted } from '@/lib/accountDeletedStore';
import { renderHook } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
  isErrorWithCode: () => false,
}));

jest.mock('@/lib/firebase', () => ({
  auth: jest.fn(),
  GoogleSignin: {},
}));

const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('useSignIn — account deleted notice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the "account deleted" alert once after a deletion', async () => {
    markAccountDeleted();

    await renderHook(() => useSignIn());

    expect(mockAlert).toHaveBeenCalledWith('signIn.accountDeleted');

    await renderHook(() => useSignIn());

    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it('shows no alert on a normal visit', async () => {
    await renderHook(() => useSignIn());

    expect(mockAlert).not.toHaveBeenCalled();
  });
});
