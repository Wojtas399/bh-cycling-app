import { useSurfaceContrast } from '@/hooks/useSurfaceContrast';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import {
  type Surface,
  type SurfaceTreatment,
  resolveSurfaceTreatment,
} from '@/lib/surfaceTreatment';

/**
 * How a surface paints on this device with the athlete's accessibility
 * settings, kept up to date as they change. Only the surface primitives call
 * it.
 */
export function useSurfaceTreatment<S extends Surface>(
  surface: S,
): SurfaceTreatment<S> {
  return resolveSurfaceTreatment(surface, {
    liquidGlassAvailable,
    ...useSurfaceContrast(),
  });
}
