import { useAthleteSettings } from '../useAthleteSettings';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';
import { getAthleteSettings } from '@/lib/intervalsApi';
import { resolveRideSettings } from '@/lib/rideSettings';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: jest.fn(),
}));

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getAthleteSettings: jest.fn(),
}));

jest.mock('@/lib/handleIntervalsAuthError', () => ({
  handleIntervalsAuthError: jest.fn().mockResolvedValue(undefined),
}));

describe('useAthleteSettings', () => {
  it("reads the athlete's zones and current Ride FTP", async () => {
    (useIntervalsConnection as jest.Mock).mockReturnValue({
      isConnected: true,
      athleteName: null,
      athleteId: 'athlete-1',
      accessToken: 'token-1',
      loading: false,
    });
    (getAthleteSettings as jest.Mock).mockResolvedValue({ ftp: 265 });

    const { result } = await renderHookWithClient(() => useAthleteSettings());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(resolveRideSettings({ ftp: 265 }));
  });
});
