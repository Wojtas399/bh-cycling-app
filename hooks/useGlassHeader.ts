import { useState } from 'react';
import { type LayoutChangeEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface GlassHeaderLayout {
  /** Pass to the `GlassHeader`, which reports its height through it. */
  onLayout: (event: LayoutChangeEvent) => void;
  /** The header's height: how far static content starts below the top. */
  height: number;
  /**
   * How far the content of a scroll view under the header starts down: its
   * top padding and its refresh control's offset.
   */
  scrollInsetTop: number;
  /** Spread on the scroll view under the header. */
  scrollViewProps: {
    contentInsetAdjustmentBehavior: 'automatic' | 'never';
    scrollIndicatorInsets: { top: number };
  };
}

/**
 * Lays a screen out under its sticky `GlassHeader`, which floats over the
 * top of the screen, status bar included, while content scrolls under it.
 *
 * On iOS a tab screen's scroll view adjusts its insets itself, for the
 * floating tab bar and the status bar, so its content only needs the rest of
 * the header. Pushed screens and Android adjust nothing.
 */
export function useGlassHeader(screen: 'tab' | 'pushed'): GlassHeaderLayout {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const systemInsets = screen === 'tab' && Platform.OS === 'ios';
  const scrollInsetTop = systemInsets
    ? Math.max(0, height - insets.top)
    : height;

  return {
    onLayout: event => setHeight(event.nativeEvent.layout.height),
    height,
    scrollInsetTop,
    scrollViewProps: {
      contentInsetAdjustmentBehavior: systemInsets ? 'automatic' : 'never',
      scrollIndicatorInsets: { top: scrollInsetTop },
    },
  };
}
