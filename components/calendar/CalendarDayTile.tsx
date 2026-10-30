import type { ComponentProps } from 'react';

import Box from '@/components/Box';

/** Between neighbouring tiles, and between the month grid's rows. */
export const TILE_GAP = 2;

export type CalendarDayTileProps = Omit<
  ComponentProps<typeof Box>,
  'backgroundColor' | 'bg' | 'borderRadius'
> & {
  /** A neighbouring month's day in the month grid: a dimmer tile. */
  outsideMonth?: boolean;
};

/**
 * The day tile both Calendar views draw: each day on its own lighter surface,
 * a thin gap away from the next, so the days read as separate. Lays out its
 * content as a `Box` does.
 */
export default function CalendarDayTile({
  outsideMonth = false,
  ...box
}: CalendarDayTileProps) {
  return (
    <Box
      borderRadius="sm"
      backgroundColor={outsideMonth ? 'bgSecondary' : 'bgTertiary'}
      {...box}
    />
  );
}
