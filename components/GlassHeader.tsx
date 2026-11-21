import type { ReactNode } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GlassBackdrop from '@/components/GlassBackdrop';

interface GlassHeaderProps {
  onLayout: (event: LayoutChangeEvent) => void;
  children: ReactNode;
}

export default function GlassHeader({ onLayout, children }: GlassHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.overlaysEarlierSiblings} onLayout={onLayout}>
      <GlassBackdrop />
      <View style={{ paddingTop: insets.top }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlaysEarlierSiblings: { position: 'absolute', top: 0, left: 0, right: 0 },
});
