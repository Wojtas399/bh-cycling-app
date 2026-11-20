import {
  GlassView,
  type GlassViewProps,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

export const liquidGlassAvailable =
  isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export function DarkGlassView(
  props: Omit<GlassViewProps, 'glassEffectStyle' | 'colorScheme'>,
) {
  return <GlassView glassEffectStyle="regular" colorScheme="dark" {...props} />;
}
