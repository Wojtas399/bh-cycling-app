import SettingsScreen from '../index';
import theme from '@/constants/theme';
import { useIntervalsAuth } from '@/hooks/useIntervalsAuth';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { ThemeProvider } from '@shopify/restyle';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockHandleConnect = jest.fn();
const mockHandleDisconnect = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

jest.mock('@/lib/firebase', () => ({
  auth: () => ({ signOut: jest.fn() }),
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
    <ThemeProvider theme={theme}>
      <SettingsScreen />
    </ThemeProvider>,
  );
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

describe('SettingsScreen — Intervals.icu row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection();
    mockAuth();
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
});
