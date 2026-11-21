import { StyleSheet } from 'react-native';

import Box from '@/components/Box';
import { useSurfaceTreatment } from '@/hooks/useSurfaceTreatment';
import { DarkGlassView } from '@/lib/liquidGlass';

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
