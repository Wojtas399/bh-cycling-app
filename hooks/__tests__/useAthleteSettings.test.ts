import { connectIntervals } from '@/test-utils/intervalsConnection';

import { useAthleteSettings } from '../useAthleteSettings';
import { getAthleteSettings } from '@/lib/intervalsApi';
import { resolveRideSettings } from '@/lib/rideSettings';
import { renderHookWithClient } from '@/test-utils/queryClient';
import { waitFor } from '@testing-library/react-native';

jest.mock('@/lib/intervalsApi', () => ({
  ...jest.requireActual('@/lib/intervalsApi'),
  getAthleteSettings: jest.fn(),
}));

describe('useAthleteSettings', () => {
  it("reads the athlete's zones and current Ride FTP", async () => {
    connectIntervals();
    jest.mocked(getAthleteSettings).mockResolvedValue({ ftp: 265 });

    const { result } = await renderHookWithClient(() => useAthleteSettings());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(resolveRideSettings({ ftp: 265 }));
  });
});
