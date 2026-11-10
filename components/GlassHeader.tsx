import type { ReactNode } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GlassBackdrop from '@/components/GlassBackdrop';

interface GlassHeaderProps {
  /** From `useGlassHeader`, which lays the content out under the header. */
  onLayout: (event: LayoutChangeEvent) => void;
  children: ReactNode;
}

/**
 * A sticky header on Glass that content scrolls under. It floats over the
 * top of the screen, status bar included, so render it after the content.
 */
export default function GlassHeader({ onLayout, children }: GlassHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.header} onLayout={onLayout}>
      <GlassBackdrop />
      <View style={{ paddingTop: insets.top }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
});
