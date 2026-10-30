import type { AppTheme } from '@/constants/theme';

/**
 * The day tile both Calendar views draw: each day on its own lighter surface,
 * a thin gap away from the next, so the days read as separate.
 */

/** Between neighbouring tiles, and between the month grid's rows. */
export const TILE_GAP = 2;

export const TILE_RADIUS: keyof AppTheme['borderRadii'] = 'sm';

export const TILE_SURFACE: keyof AppTheme['colors'] = 'bgTertiary';

/** A neighbouring month's day in the grid, its number in `textTertiary`. */
export const TILE_SURFACE_OUTSIDE_MONTH: keyof AppTheme['colors'] =
  'bgSecondary';
