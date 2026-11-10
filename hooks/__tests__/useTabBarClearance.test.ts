import { Platform } from 'react-native';

import { useTabBarClearance } from '../useTabBarClearance';
import { renderHook } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

describe('useTabBarClearance', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('clears the bottom inset plus the bar on iOS, where the screen runs under the bar', async () => {
    Platform.OS = 'ios';

    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(83);
  });

  it('needs no clearance on Android, where the screen ends above the bar', async () => {
    Platform.OS = 'android';

    const { result } = await renderHook(() => useTabBarClearance());

    expect(result.current).toBe(0);
  });
});
