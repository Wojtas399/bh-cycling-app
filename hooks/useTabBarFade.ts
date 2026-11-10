import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** How far the fade reaches above the bottom inset. */
const RISE = 110;

export interface TabBarFade {
  /**
   * The fade's height from the screen's bottom edge, which is also how far
   * static content (the month grid) ends above it.
   */
  height: number;
  /** Bottom padding that lets a scroll view's content rise out of the fade. */
  scrollInsetBottom: number;
}

/**
 * The black fade above the tab bar. On iOS a tab screen runs under the
 * floating bar, so the fade covers the bottom inset too. On Android the
 * screen ends above the bar, and the bottom inset lies below it.
 *
 * A scroll view already clears the bar: iOS insets it automatically (the bar
 * is at least the bottom inset tall) and Android ends the screen above it. So
 * its content only needs the rise on top.
 */
export function useTabBarFade(): TabBarFade {
  const insets = useSafeAreaInsets();
  const underBar = Platform.OS === 'ios' ? insets.bottom : 0;

  return { height: underBar + RISE, scrollInsetBottom: RISE };
}
