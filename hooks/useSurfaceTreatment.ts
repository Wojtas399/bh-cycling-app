import { useSurfaceContrast } from '@/hooks/useSurfaceContrast';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import {
  type Surface,
  type SurfaceTreatment,
  resolveSurfaceTreatment,
} from '@/lib/surfaceTreatment';

export function useSurfaceTreatment<S extends Surface>(
  surface: S,
): SurfaceTreatment<S> {
  return resolveSurfaceTreatment(surface, {
    liquidGlassAvailable,
    ...useSurfaceContrast(),
  });
}
