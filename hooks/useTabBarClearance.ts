import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IOS_TAB_BAR_HEIGHT_ABOVE_INSET = 49;

export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();

  return Platform.OS === 'ios'
    ? insets.bottom + IOS_TAB_BAR_HEIGHT_ABOVE_INSET
    : 0;
}
