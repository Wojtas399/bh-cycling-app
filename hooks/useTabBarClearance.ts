import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** The iOS tab bar's height above the bottom inset. */
const IOS_TAB_BAR_HEIGHT = 49;

/**
 * How far static (non-scrolling) content on a tab screen must end above the
 * screen's bottom edge to stay clear of the tab bar. On iOS a native tab screen
 * runs under the floating bar; on Android it already ends above the bar.
 * Scroll views don't need this: native tabs inset them automatically.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();

  return Platform.OS === 'ios' ? insets.bottom + IOS_TAB_BAR_HEIGHT : 0;
}
