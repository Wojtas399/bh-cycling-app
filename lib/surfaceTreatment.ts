import {
  FROST_PLAIN,
  FROST_PLAIN_INCREASE_CONTRAST_FILL,
  FROST_PROMINENT,
} from '@/constants/surfaces';
import theme from '@/constants/theme';

const { colors } = theme;

export interface SurfaceEnvironment {
  liquidGlassAvailable: boolean;
  reduceTransparency: boolean;
  increaseContrast: boolean;
}

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
  | { paint: 'native'; prominent: boolean }
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

export type SurfaceTreatment<S extends Surface> = Treatments[S['kind']];

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
    const fillUnderReadableLabel = prominent
      ? colors.interactiveDefault
      : colors.bgTertiary;
    const hairline =
      increaseContrast && !prominent ? colors.hairlineStrong : colors.hairline;

    return {
      paint: 'opaque',
      fill: fillUnderReadableLabel,
      hairline,
      topEdge: hairline,
    };
  }

  if (prominent) return { paint: 'frost', ...FROST_PROMINENT };

  if (increaseContrast) {
    return {
      paint: 'frost',
      fill: FROST_PLAIN_INCREASE_CONTRAST_FILL,
      hairline: colors.hairlineStrong,
      topEdge: FROST_PLAIN.topEdge,
    };
  }

  return { paint: 'frost', ...FROST_PLAIN };
}
