import { Platform } from 'react-native';

import { useTabBarFade } from '../useTabBarFade';
import { renderHook } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

describe('useTabBarFade', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('fades over the bottom inset plus 110pt on iOS, where the screen runs under the bar', async () => {
    Platform.OS = 'ios';

    const { result } = await renderHook(() => useTabBarFade());

    expect(result.current.height).toBe(144);
  });

  it('fades over 110pt on Android, where the screen ends above the bar and its inset', async () => {
    Platform.OS = 'android';

    const { result } = await renderHook(() => useTabBarFade());

    expect(result.current.height).toBe(110);
  });

  it.each(['ios', 'android'] as const)(
    'lets scroll content on %s end 110pt above what the scroll view already clears, so it rises out of the fade',
    async os => {
      Platform.OS = os;

      const { result } = await renderHook(() => useTabBarFade());

      expect(result.current.scrollInsetBottom).toBe(110);
    },
  );
});
