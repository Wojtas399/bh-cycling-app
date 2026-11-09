import {
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

/**
 * Whether native Liquid Glass can be drawn: iOS 26 only. Some iOS 26 betas
 * report Liquid Glass but lack the glass API, and `GlassView` crashes there.
 */
export const liquidGlassAvailable =
  isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
