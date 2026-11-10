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

export type ControlTreatment =
  /** System glass, tinted near-white when prominent; the system adapts it. */
  | { paint: 'native'; prominent: boolean }
  /** On plain Frost, `hairlineStrong` also raises the fill from 8% to 14%. */
  | { paint: 'frost'; prominent: boolean; hairlineStrong: boolean }
  /**
   * Solid, for Reduce Transparency. A prominent control's near-black label
   * can't be read on `bgTertiary`, so it turns solid `interactiveDefault`.
   */
  | {
      paint: 'opaque';
      fill: 'bgTertiary' | 'interactiveDefault';
      hairlineStrong: boolean;
    };

type ControlSurface = {
  kind: 'control';
  placement: SurfacePlacement;
  prominent: boolean;
};

type Surface = { kind: 'sheen' } | { kind: 'backdrop' } | ControlSurface;

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
  surface: ControlSurface,
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

  if (surface.kind === 'backdrop') {
    if (liquidGlassAvailable) return { paint: 'native', hairlineStrong: false };

    return {
      paint: reduceTransparency ? 'opaque' : 'tint',
      hairlineStrong: increaseContrast,
    };
  }

  const { placement, prominent } = surface;

  if (liquidGlassAvailable && placement === 'chrome') {
    return { paint: 'native', prominent };
  }

  // A prominent control's edge is already brighter than `hairlineStrong`.
  const hairlineStrong = increaseContrast && !prominent;

  if (reduceTransparency) {
    return {
      paint: 'opaque',
      fill: prominent ? 'interactiveDefault' : 'bgTertiary',
      hairlineStrong,
    };
  }

  return { paint: 'frost', prominent, hairlineStrong };
}
