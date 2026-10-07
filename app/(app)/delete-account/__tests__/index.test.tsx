import { SafeAreaProvider } from 'react-native-safe-area-context';

import DeleteAccountScreen from '../index';
import { useDeleteAccount } from '../useDeleteAccount';
import theme from '@/constants/theme';
import { ThemeProvider } from '@shopify/restyle';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockSetOptions = jest.fn();
const mockAddListener = jest.fn();
const mockRemoveListener = jest.fn();
const mockHandleDelete = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: (_ns?: string, options?: { keyPrefix?: string }) => ({
    t: (key: string) =>
      options?.keyPrefix ? `${options.keyPrefix}.${key}` : key,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({
    setOptions: mockSetOptions,
    addListener: mockAddListener,
  }),
}));

jest.mock('../useDeleteAccount', () => ({
  useDeleteAccount: jest.fn(),
}));

const mockUseDeleteAccount = useDeleteAccount as jest.Mock;

function mockHook(overrides: Record<string, unknown> = {}) {
  mockUseDeleteAccount.mockReturnValue({
    password: '',
    passwordError: '',
    error: '',
    loading: false,
    requiresPassword: true,
    onPasswordChange: jest.fn(),
    handleDelete: mockHandleDelete,
    ...overrides,
  });
}

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider theme={theme}>
        <DeleteAccountScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function lastBeforeRemoveListener() {
  const call = mockAddListener.mock.calls.at(-1);

  expect(call?.[0]).toBe('beforeRemove');

  return call?.[1] as (event: {
    data: { action: { type: string } };
    preventDefault: () => void;
  }) => void;
}

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue(mockRemoveListener);
    mockHook();
  });

  it('shows the password field for password accounts and starts deletion', async () => {
    await renderScreen();

    expect(screen.getByText('deleteAccount.password')).toBeTruthy();

    fireEvent.press(screen.getByText('deleteAccount.deleteButton'));

    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });

  it('shows the Google hint instead of a password field for Google-only accounts', async () => {
    mockHook({ requiresPassword: false });

    await renderScreen();

    expect(screen.queryByText('deleteAccount.password')).toBeNull();
    expect(screen.getByText('deleteAccount.googleHint')).toBeTruthy();
  });

  it('blocks back navigation while the request runs', async () => {
    mockHook({ loading: true });

    await renderScreen();

    expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: false });

    const preventDefault = jest.fn();

    lastBeforeRemoveListener()({
      data: { action: { type: 'GO_BACK' } },
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('still lets the auth gate replace the screen while loading', async () => {
    mockHook({ loading: true });

    await renderScreen();

    const preventDefault = jest.fn();

    lastBeforeRemoveListener()({
      data: { action: { type: 'REPLACE' } },
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('allows going back when idle', async () => {
    await renderScreen();

    const preventDefault = jest.fn();

    lastBeforeRemoveListener()({
      data: { action: { type: 'GO_BACK' } },
      preventDefault,
    });

    expect(mockSetOptions).toHaveBeenCalledWith({ gestureEnabled: true });
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
