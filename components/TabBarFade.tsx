import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/constants/theme';
import { useTabBarFade } from '@/hooks/useTabBarFade';

/**
 * Fades a tab screen's content to the page colour before it reaches the tab
 * bar, so bright content never tints the glass bar. Every tab screen renders
 * it over its content; the bar stays on top.
 */
export default function TabBarFade() {
  const { colors } = useAppTheme();
  const { height } = useTabBarFade();

  return (
    <View
      pointerEvents="none"
      style={[
        styles.fade,
        {
          height,
          experimental_backgroundImage: `linear-gradient(180deg, transparent 0%, ${colors.bgPrimary} 65%)`,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
