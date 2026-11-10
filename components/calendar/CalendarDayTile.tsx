import type { ComponentProps } from 'react';

import Box from '@/components/Box';

/** Between neighbouring tiles, and between the month grid's rows. */
export const TILE_GAP = 2;

/** A neighbouring month's tile fill, over the page. Its day number stays put. */
const OUTSIDE_MONTH_FILL_OPACITY = 0.5;

export type CalendarDayTileProps = Omit<
  ComponentProps<typeof Box>,
  'backgroundColor' | 'bg' | 'borderRadius'
> & {
  /** A neighbouring month's day in the month grid: a dimmer tile. */
  outsideMonth?: boolean;
};

/**
 * The day tile both Calendar views draw: each day on its own flat, lighter
 * surface, a thin gap away from the next, so the days read as separate. Flat,
 * never Sheen, so the Sheen item tiles in the week agenda never sit
 * Sheen-inside-Sheen. Lays out its content as a `Box` does.
 */
export default function CalendarDayTile({
  outsideMonth = false,
  children,
  ...box
}: CalendarDayTileProps) {
  return (
    <Box
      borderRadius="sm"
      backgroundColor={outsideMonth ? undefined : 'bgTertiary'}
      {...box}
    >
      {/* Only the fill fades: dimming the whole tile would fade the day
          number too. */}
      {outsideMonth && (
        <Box
          position="absolute"
          top={0}
          right={0}
          bottom={0}
          left={0}
          borderRadius="sm"
          backgroundColor="bgTertiary"
          opacity={OUTSIDE_MONTH_FILL_OPACITY}
        />
      )}
      {children}
    </Box>
  );
}
