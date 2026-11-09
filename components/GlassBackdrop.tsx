import { StyleSheet } from 'react-native';

import Box from '@/components/Box';
import { useSurfaceContrast } from '@/hooks/useSurfaceContrast';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import { resolveSurfaceTreatment } from '@/lib/surfaceTreatment';
import { GlassView } from 'expo-glass-effect';

/**
 * Glass behind floating chrome that content scrolls under, such as a sticky
 * header: an absolute-fill layer placed first inside the chrome. Native
 * Liquid Glass on iOS 26; elsewhere a translucent tint with a hairline along
 * the bottom edge, turned solid under Reduce Transparency.
 */
export default function GlassBackdrop() {
  const { paint, hairlineStrong } = resolveSurfaceTreatment(
    { kind: 'backdrop' },
    { liquidGlassAvailable, ...useSurfaceContrast() },
  );

  if (paint === 'native') {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        style={StyleSheet.absoluteFill}
      />
    );
  }

  return (
    <Box
      backgroundColor={paint === 'opaque' ? 'bgTertiary' : 'glassTint'}
      borderBottomWidth={1}
      borderColor={hairlineStrong ? 'hairlineStrong' : 'hairline'}
      style={StyleSheet.absoluteFill}
    />
  );
}
