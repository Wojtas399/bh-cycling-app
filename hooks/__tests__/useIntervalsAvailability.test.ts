import { useIntervalsAvailability } from '../useIntervalsAvailability';
import { useIntervalsConnection } from '../useIntervalsConnection';
import { setNeedsReconnect } from '@/lib/intervalsReconnectStore';
import { act, renderHook } from '@testing-library/react-native';

jest.mock('../useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

const mockUseIntervalsConnection = useIntervalsConnection as jest.Mock;

const CONNECTED = {
  isConnected: true,
  athleteName: 'Athlete',
  athleteId: 'athlete-1',
  accessToken: 'token-1',
  loading: false,
};

describe('useIntervalsAvailability', () => {
  beforeEach(() => {
    setNeedsReconnect(false);
  });

  it('is loading while the connection snapshot loads', async () => {
    mockUseIntervalsConnection.mockReturnValue({
      ...CONNECTED,
      isConnected: false,
      athleteId: null,
      accessToken: null,
      loading: true,
    });

    const { result } = await renderHook(() => useIntervalsAvailability());

    expect(result.current).toEqual({
      availability: 'loading',
      accessToken: null,
      athleteId: null,
    });
  });

  it('is available with the token and athlete id when connected', async () => {
    mockUseIntervalsConnection.mockReturnValue(CONNECTED);

    const { result } = await renderHook(() => useIntervalsAvailability());

    expect(result.current).toEqual({
      availability: 'available',
      accessToken: 'token-1',
      athleteId: 'athlete-1',
    });
  });

  it.each([
    ['not connected', { isConnected: false, accessToken: null }],
    ['connected without a token', { accessToken: null }],
    ['connected without an athlete id', { athleteId: null }],
  ])('is unavailable when %s', async (_name, overrides) => {
    mockUseIntervalsConnection.mockReturnValue({ ...CONNECTED, ...overrides });

    const { result } = await renderHook(() => useIntervalsAvailability());

    expect(result.current).toEqual({
      availability: 'unavailable',
      accessToken: null,
      athleteId: null,
    });
  });

  it('turns unavailable, withholding the token, once a reconnect is needed', async () => {
    mockUseIntervalsConnection.mockReturnValue(CONNECTED);

    const { result } = await renderHook(() => useIntervalsAvailability());

    await act(() => {
      setNeedsReconnect(true);
    });

    expect(result.current).toEqual({
      availability: 'unavailable',
      accessToken: null,
      athleteId: null,
    });
  });
});
