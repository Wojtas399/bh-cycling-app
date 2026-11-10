import {
  GlassView,
  type GlassViewProps,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

/**
 * Whether native Liquid Glass can be drawn: iOS 26 only. Some iOS 26 betas
 * report Liquid Glass but lack the glass API, and `GlassView` crashes there.
 */
export const liquidGlassAvailable =
  isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * The app's native glass: regular Liquid Glass in the dark scheme. Draw it
 * only where `liquidGlassAvailable`.
 */
export function DarkGlassView(
  props: Omit<GlassViewProps, 'glassEffectStyle' | 'colorScheme'>,
) {
  return <GlassView glassEffectStyle="regular" colorScheme="dark" {...props} />;
}
