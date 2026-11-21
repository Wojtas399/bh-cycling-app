import { useState } from 'react';
import { type LayoutChangeEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface GlassHeaderLayout {
  onLayout: (event: LayoutChangeEvent) => void;
  height: number;
  scrollInsetTop: number;
  scrollViewProps: {
    contentInsetAdjustmentBehavior: 'automatic' | 'never';
    scrollIndicatorInsets: { top: number };
  };
}

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
