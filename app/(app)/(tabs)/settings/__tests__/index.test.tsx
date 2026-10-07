import { SafeAreaProvider } from 'react-native-safe-area-context';

import SettingsScreen from '../index';
import theme from '@/constants/theme';
import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { ThemeProvider } from '@shopify/restyle';
import { fireEvent, render, screen } from '@testing-library/react-native';

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockHandleConnect = jest.fn();
const mockHandleDisconnect = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: (_ns?: string, options?: { keyPrefix?: string }) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const fullKey = options?.keyPrefix ? `${options.keyPrefix}.${key}` : key;

      return opts ? `${fullKey}:${JSON.stringify(opts)}` : fullKey;
    },
  }),
}));

const mockSignOut = jest.fn();
let mockCurrentUser: {
  email: string | null;
  providerData: { providerId: string }[];
} | null = null;

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ signOut: mockSignOut, currentUser: mockCurrentUser }),
}));

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/hooks/useIntervalsAuth', () => ({
  useIntervalsAuth: jest.fn(),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;
const mockUseIntervalsAuth = useIntervalsAuth as jest.Mock;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider theme={theme}>
        <SettingsScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function mockUser(...providerIds: string[]) {
  mockCurrentUser = {
    email: 'rider@example.com',
    providerData: providerIds.map(providerId => ({ providerId })),
  };
}

function mockConnection(
  overrides: Partial<ReturnType<typeof useIntervalsConnection>> = {},
) {
  mockUseIntervalsConnection.mockReturnValue({
    isConnected: false,
    athleteName: null,
    athleteId: null,
    accessToken: null,
    loading: false,
    ...overrides,
  });
}

function mockAuth(
  overrides: Partial<ReturnType<typeof useIntervalsAuth>> = {},
) {
  mockUseIntervalsAuth.mockReturnValue({
    handleConnect: mockHandleConnect,
    handleDisconnect: mockHandleDisconnect,
    connecting: false,
    disconnecting: false,
    error: '',
    ...overrides,
  });
}

describe('SettingsScreen — Konto section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection();
    mockAuth();
    mockUser('password');
  });

  it('shows the user email', async () => {
    await renderScreen();

    expect(screen.getByText('settings.account.email')).toBeTruthy();
    expect(screen.getByText('rider@example.com')).toBeTruthy();
  });

  it.each([
    [['password'], 'settings.account.signInMethods.email'],
    [['google.com'], 'settings.account.signInMethods.google'],
    [
      ['password', 'google.com'],
      'settings.account.signInMethods.emailAndGoogle',
    ],
  ])('labels the sign-in method for providers %j', async (providers, label) => {
    mockUser(...providers);

    await renderScreen();

    expect(screen.getByText(label)).toBeTruthy();
  });

  it('does not make the Konto rows pressable', async () => {
    await renderScreen();

    // Pressable SettingsRows expose accessibilityRole="button".
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('SettingsScreen — Intervals.icu row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection();
    mockAuth();
    mockUser('password');
  });

  it('shows a Connect button when not connected and triggers handleConnect', async () => {
    await renderScreen();

    expect(screen.getByText('intervals.connectButton')).toBeTruthy();

    fireEvent.press(screen.getByText('intervals.connectButton'));

    expect(mockHandleConnect).toHaveBeenCalledTimes(1);
  });

  it('shows the athlete name and a Disconnect button when connected', async () => {
    mockConnection({ isConnected: true, athleteName: 'Jane Rider' });

    await renderScreen();

    expect(
      screen.getByText('intervals.connectedAs:{"name":"Jane Rider"}'),
    ).toBeTruthy();
    expect(screen.getByText('intervals.disconnectButton')).toBeTruthy();

    fireEvent.press(screen.getByText('intervals.disconnectButton'));

    expect(mockHandleDisconnect).toHaveBeenCalledTimes(1);
  });

  it('shows a loading indicator while connecting', async () => {
    mockAuth({ connecting: true });

    await renderScreen();

    expect(screen.queryByText('intervals.connectButton')).toBeNull();
  });

  it('shows a loading indicator while disconnecting', async () => {
    mockConnection({ isConnected: true, athleteName: 'Jane Rider' });
    mockAuth({ disconnecting: true });

    await renderScreen();

    expect(screen.queryByText('intervals.disconnectButton')).toBeNull();
  });

  it('surfaces a translated error banner when the exchange fails', async () => {
    mockAuth({ error: 'intervals.errors.exchangeFailed' });

    await renderScreen();

    expect(screen.getByText('intervals.errors.exchangeFailed')).toBeTruthy();
  });

  it('keeps the existing Log out button working', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Log out'));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
