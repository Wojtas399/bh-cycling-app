import IntervalsReconnectBanner from '../IntervalsReconnectBanner';
import theme from '@/constants/theme';
import { useNeedsReconnect } from '@/hooks/useNeedsReconnect';
import { ThemeProvider } from '@shopify/restyle';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockHandleConnect = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: (_ns?: string, options?: { keyPrefix?: string }) => ({
    t: (key: string) =>
      options?.keyPrefix ? `${options.keyPrefix}.${key}` : key,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/useIntervalsAuth', () => ({
  useIntervalsAuth: () => ({ handleConnect: mockHandleConnect }),
}));

jest.mock('@/hooks/useNeedsReconnect', () => ({
  useNeedsReconnect: jest.fn(),
}));

const mockUseNeedsReconnect = useNeedsReconnect as jest.Mock;

function renderBanner() {
  return render(
    <ThemeProvider theme={theme}>
      <IntervalsReconnectBanner />
    </ThemeProvider>,
  );
}

describe('IntervalsReconnectBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when reconnect is not needed', async () => {
    mockUseNeedsReconnect.mockReturnValue(false);

    await renderBanner();

    expect(screen.queryByText('intervals.reconnectBanner.message')).toBeNull();
  });

  it('renders the banner and invokes handleConnect after navigating to Settings on tap', async () => {
    mockUseNeedsReconnect.mockReturnValue(true);

    await renderBanner();

    expect(screen.getByText('intervals.reconnectBanner.message')).toBeTruthy();

    fireEvent.press(screen.getByText('intervals.reconnectBanner.action'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/(tabs)/settings');
    expect(mockHandleConnect).toHaveBeenCalledTimes(1);
  });
});
