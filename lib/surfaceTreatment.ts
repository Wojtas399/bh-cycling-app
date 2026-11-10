import {
  FROST_PLAIN,
  FROST_PLAIN_STRONG_FILL,
  FROST_PROMINENT,
} from '@/constants/surfaces';
import theme from '@/constants/theme';

const { colors } = theme;

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
  /** Frost, or solid under Reduce Transparency, in the colours to paint. */
  | {
      paint: 'frost' | 'opaque';
      fill: string;
      hairline: string;
      topEdge: string;
    };

type ControlSurface = {
  kind: 'control';
  placement: SurfacePlacement;
  prominent: boolean;
};

export type Surface = { kind: 'sheen' } | { kind: 'backdrop' } | ControlSurface;

type Treatments = {
  sheen: SheenTreatment;
  backdrop: BackdropTreatment;
  control: ControlTreatment;
};

/** What a surface of that kind paints. */
export type SurfaceTreatment<S extends Surface> = Treatments[S['kind']];

/**
 * Decides how a surface primitive paints. Native glass draws and adapts its
 * own edge, so Reduce Transparency and Increase Contrast only change what we
 * paint ourselves: the Sheen gradient and the tint and Frost fallbacks.
 */
export function resolveSurfaceTreatment<S extends Surface>(
  surface: S,
  environment: SurfaceEnvironment,
): SurfaceTreatment<S>;
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

  if (reduceTransparency) {
    // A prominent control's near-black label can't be read on `bgTertiary`,
    // so it turns solid white, which stands out without a stronger edge.
    const fill = prominent ? colors.interactiveDefault : colors.bgTertiary;
    const hairline =
      increaseContrast && !prominent ? colors.hairlineStrong : colors.hairline;

    return { paint: 'opaque', fill, hairline, topEdge: hairline };
  }

  // A prominent control's edge is already brighter than `hairlineStrong`.
  if (prominent) return { paint: 'frost', ...FROST_PROMINENT };

  if (increaseContrast) {
    return {
      paint: 'frost',
      fill: FROST_PLAIN_STRONG_FILL,
      hairline: colors.hairlineStrong,
      topEdge: FROST_PLAIN.topEdge,
    };
  }

  return { paint: 'frost', ...FROST_PLAIN };
}
