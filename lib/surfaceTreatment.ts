/** What the device can draw and the accessibility settings the athlete has on. */
export interface SurfaceEnvironment {
  /** iOS 26 Liquid Glass: `isLiquidGlassAvailable()` and `isGlassEffectAPIAvailable()`. */
  liquidGlassAvailable: boolean;
  reduceTransparency: boolean;
  /** Increase Contrast on iOS, high text contrast on Android. */
  increaseContrast: boolean;
}

/** Chrome stays put while content scrolls under it. Content scrolls. */
export type SurfacePlacement = 'chrome' | 'content';

export type SheenTreatment = {
  paint: 'gradient' | 'flat';
  hairlineStrong: boolean;
};

export type BackdropTreatment = {
  paint: 'native' | 'tint' | 'opaque';
  hairlineStrong: boolean;
};

export type ControlTreatment = {
  paint: 'native' | 'frost' | 'opaque';
  /** On Frost, also raises the fill from 8% to 14% white. */
  hairlineStrong: boolean;
};

type Surface =
  | { kind: 'sheen' }
  | { kind: 'backdrop' }
  | { kind: 'control'; placement: SurfacePlacement };

/**
 * Decides how a surface primitive paints. Native glass draws and adapts its
 * own edge, so Reduce Transparency and Increase Contrast only change what we
 * paint ourselves: the Sheen gradient and the tint and Frost fallbacks.
 */
export function resolveSurfaceTreatment(
  surface: { kind: 'sheen' },
  environment: SurfaceEnvironment,
): SheenTreatment;
export function resolveSurfaceTreatment(
  surface: { kind: 'backdrop' },
  environment: SurfaceEnvironment,
): BackdropTreatment;
export function resolveSurfaceTreatment(
  surface: { kind: 'control'; placement: SurfacePlacement },
  environment: SurfaceEnvironment,
): ControlTreatment;
export function resolveSurfaceTreatment(
  surface: Surface,
  {
    liquidGlassAvailable,
    reduceTransparency,
    increaseContrast,
  }: SurfaceEnvironment,
): SheenTreatment | BackdropTreatment | ControlTreatment {
  if (surface.kind === 'sheen') {
    return {
      paint: increaseContrast ? 'flat' : 'gradient',
      hairlineStrong: increaseContrast,
    };
  }

  const native =
    liquidGlassAvailable &&
    (surface.kind === 'backdrop' || surface.placement === 'chrome');

  if (native) {
    return { paint: 'native', hairlineStrong: false };
  }

  const fallback = surface.kind === 'backdrop' ? 'tint' : 'frost';

  return {
    paint: reduceTransparency ? 'opaque' : fallback,
    hairlineStrong: increaseContrast,
  };
}
