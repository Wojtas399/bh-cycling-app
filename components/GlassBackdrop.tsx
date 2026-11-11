import { StyleSheet } from 'react-native';

import Box from '@/components/Box';
import { useSurfaceTreatment } from '@/hooks/useSurfaceTreatment';
import { DarkGlassView } from '@/lib/liquidGlass';

/**
 * Glass behind floating chrome that content scrolls under, such as a sticky
 * header: an absolute-fill layer placed first inside the chrome. Native
 * Liquid Glass on iOS 26; elsewhere a translucent tint with a hairline along
 * the bottom edge, turned solid under Reduce Transparency.
 */
export default function GlassBackdrop() {
  const { paint, hairlineStrong } = useSurfaceTreatment({ kind: 'backdrop' });

  if (paint === 'native') {
    return <DarkGlassView style={StyleSheet.absoluteFill} />;
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
