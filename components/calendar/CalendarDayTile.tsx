import type { ComponentProps } from 'react';

import Box from '@/components/Box';

export const TILE_GAP = 2;

const OUTSIDE_MONTH_FILL_OPACITY = 0.5;

export type CalendarDayTileProps = Omit<
  ComponentProps<typeof Box>,
  'backgroundColor' | 'bg' | 'borderRadius'
> & {
  outsideMonth?: boolean;
};

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
      {outsideMonth && <FadedFillBehindFullOpacityContent />}
      {children}
    </Box>
  );
}

function FadedFillBehindFullOpacityContent() {
  return (
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
  );
}
